// @ts-nocheck -- deterministic transport/lifecycle harness with a narrow Spindle mock.
import { strict as assert } from 'node:assert'

const frontendEvents: any[] = []
const logs: Array<{ level: string; message: string }> = []
const storage = new Map<string, any>()
const imageApi: any = {}
let frontendThrowPredicate: ((payload: any) => boolean) | undefined

;(globalThis as any).spindle = {
  registerMessageContentProcessor() {}, registerInterceptor() { return () => {} }, registerMacro() {}, on() {}, onFrontendMessage() {},
  sendToFrontend(payload: any) {
    if (frontendThrowPredicate?.(payload)) throw new Error('Chat not found')
    frontendEvents.push(payload)
  },
  permissions: { has() { return true }, onChanged() { return () => {} } },
  userStorage: {
    async getJson(path: string, options: any = {}) { return storage.has(path) ? structuredClone(storage.get(path)) : structuredClone(options.fallback || {}) },
    async setJson(path: string, value: any) { storage.set(path, structuredClone(value)) },
    async mkdir() {},
  },
  chat: { async getMessages() { return [] } }, chats: { async get() { return null } },
  characters: { async get() { return null } }, personas: { async getActive() { return null } },
  world_books: { async getActivated() { return [] }, entries: { async get() { return null } } },
  imageGen: imageApi,
  variables: { global: { async set() {} }, chat: { async set() {} } },
  log: {
    info(message: string) { logs.push({ level: 'info', message }) },
    warn(message: string) { logs.push({ level: 'warn', message }) },
    error(message: string) { logs.push({ level: 'error', message }) },
  },
}

const backend = await import('../src/backend')
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
const swarmPlan = { provider: 'swarmui' }
const context = (generationId: string, chatId = `chat-${generationId}`, extra: Record<string, unknown> = {}) => ({
  chatId, messageId: `message-${generationId}`, generationId, source: 'relay-slot', slotKey: generationId, requestId: generationId, ...extra,
})

// 1. SwarmUI is standard-only even when the host happens to expose a private
// generateStream method and advertises preview capabilities.
let standardCalls = 0
let streamCalls = 0
imageApi.getProviders = async () => [{ id: 'swarmui', capabilities: { websocketPreviewStreaming: { previews: true, status: true } } }]
imageApi.generateStream = async function* () { streamCalls += 1; yield { type: 'done', result: { imageId: 'wrong-stream-result' } } }
imageApi.generate = async () => { standardCalls += 1; return { imageId: 'swarm-standard', imageUrl: '/swarm-standard' } }
assert.equal((await backend.generateWithOptionalStream({ prompt: 'swarm standard only' }, swarmPlan, 'swarm-policy-user', context('swarm-standard'))).imageId, 'swarm-standard')
assert.equal(standardCalls, 1)
assert.equal(streamCalls, 0)
assert.deepEqual(backend.inspectProviderAttemptDiagnostics('swarm-standard'), {
  generationId: 'swarm-standard', chatId: 'chat-swarm-standard', requestId: 'swarm-standard', provider: 'swarmui',
  providerDispatchCount: 1, providerSpendStartedAt: (backend.inspectProviderAttemptDiagnostics('swarm-standard') as any).providerSpendStartedAt,
  providerTransport: 'standard', providerStreamingUsed: false, providerFallbackUsed: false, providerDraining: false,
  destinationAvailable: true, createdAt: (backend.inspectProviderAttemptDiagnostics('swarm-standard') as any).createdAt,
  completedAt: (backend.inspectProviderAttemptDiagnostics('swarm-standard') as any).completedAt,
})

// 2/3/4/9. Provider spend starts exactly once. A Chat-not-found lifecycle
// reporting failure cannot block or duplicate that provider call, cannot become
// image_stream_fallback, and makes the successful result ineligible for placement.
standardCalls = 0
let resolveDestinationLost!: (value: any) => void
imageApi.generate = () => { standardCalls += 1; return new Promise(resolve => { resolveDestinationLost = resolve }) }
const destinationLost = backend.generateWithOptionalStream(
  { prompt: 'destination lost after provider start' }, swarmPlan, 'destination-user',
  context('destination-lost', 'deleted-chat', { onProviderStarted: async () => { throw new Error('Chat not found') } }),
)
while (!resolveDestinationLost) await Promise.resolve()
await delay(0)
assert.equal(standardCalls, 1)
resolveDestinationLost({ imageId: 'orphan-result', imageUrl: '/orphan-result' })
await assert.rejects(destinationLost, /destination chat deleted-chat is no longer available/i)
assert.equal(standardCalls, 1)
assert.equal((backend.inspectProviderAttemptDiagnostics('destination-lost') as any).destinationAvailable, false)
assert.equal(frontendEvents.some(event => event?.generationId === 'destination-lost' && event?.event === 'done'), false)
assert.equal(logs.some(entry => entry.message.includes('image_stream_fallback')), false)

// Explicit reproduction of the live image_stream_fallback: Chat not found
// incident: a post-spend stream/UI delivery error is lifecycle-only. It marks
// the destination stale and never starts standard generation #2.
standardCalls = 0
imageApi.generate = async () => { standardCalls += 1; return { imageId: 'reporting-orphan', imageUrl: '/reporting-orphan' } }
frontendThrowPredicate = payload => payload?.generationId === 'stream-report-chat-error' && payload?.event === 'done'
await assert.rejects(
  backend.generateWithOptionalStream({ prompt: 'post-spend reporting error' }, swarmPlan, 'reporting-user', context('stream-report-chat-error', 'reporting-chat')),
  /destination chat reporting-chat is no longer available/i,
)
frontendThrowPredicate = undefined
assert.equal(standardCalls, 1)
assert.equal((backend.inspectProviderAttemptDiagnostics('stream-report-chat-error') as any).providerDispatchCount, 1)
assert.equal((backend.inspectProviderAttemptDiagnostics('stream-report-chat-error') as any).providerFallbackUsed, false)
assert.equal(logs.some(entry => entry.message.includes('[ReverieRelay:image_stream_fallback]')), false)

// 5/6/7. Local timeout does not remotely cancel Swarm. The lane remains
// draining beyond the generic watchdog override, the late result is discarded,
// and B starts only after A's actual host promise settles.
let resolveA!: (value: any) => void
let resolveB!: (value: any) => void
let bCalls = 0
imageApi.generate = (input: any) => input.prompt === 'slow swarm A'
  ? new Promise(resolve => { resolveA = resolve })
  : new Promise(resolve => { bCalls += 1; resolveB = resolve })
await assert.rejects(
  backend.generateWithOptionalStream({ prompt: 'slow swarm A' }, swarmPlan, 'swarm-drain-user', context('swarm-timeout-a', 'chat-a', { drainTimeoutMs: 10 }), false, 20),
  (error: any) => error?.name === 'ImageGenerationTimeoutError',
)
assert.equal((backend.inspectImageGenerationLaneDiagnostics('swarm-drain-user') as any).draining, true)
assert.equal((backend.inspectProviderAttemptDiagnostics('swarm-timeout-a') as any).providerDispatchCount, 1)
const generationB = backend.generateWithOptionalStream({ prompt: 'swarm B' }, swarmPlan, 'swarm-drain-user', context('swarm-b', 'chat-b', { laneWaitTimeoutMs: 500 }), false, 200)
await delay(40)
assert.equal(bCalls, 0, 'generic drain watchdog released unresolved Swarm work')
assert.equal((backend.inspectImageGenerationLaneDiagnostics('swarm-drain-user') as any).draining, true)
resolveA({ imageId: 'late-a', imageUrl: '/late-a' })
while (!resolveB) await Promise.resolve()
assert.equal(bCalls, 1)
resolveB({ imageId: 'result-b', imageUrl: '/result-b' })
assert.equal((await generationB).imageId, 'result-b')
assert.equal(frontendEvents.some(event => event?.generationId === 'swarm-timeout-a' && event?.event === 'done'), false)

// 8. Authoritative stale-chat cleanup removes the real scheduled/deferred,
// Native Settings, dispatch, retry, placement, and provider-waiter registries
// for only that chat.
backend.stageStaleChatCleanupRegressionFixture('stale-chat', 'cleanup-user')
backend.stageStaleChatCleanupRegressionFixture('healthy-chat', 'cleanup-user')
const healthyBefore = backend.inspectChatRuntimeWork('healthy-chat', 'cleanup-user')
const cleanup = backend.cleanupStaleChatWork('stale-chat', 'cleanup-user', 'Chat not found')
const staleAfter = backend.inspectChatRuntimeWork('stale-chat', 'cleanup-user')
const healthyAfter = backend.inspectChatRuntimeWork('healthy-chat', 'cleanup-user')
assert.equal(staleAfter.stale, true)
for (const key of ['scheduledScans', 'deferredWork', 'nativeSettingsWaiters', 'dispatchQueueItems', 'providerWaiters', 'placementBatches']) assert.equal(staleAfter[key], 0, `${key} survived stale-chat cleanup`)
assert.deepEqual(healthyAfter, healthyBefore, 'stale-chat cleanup touched another chat')
assert(cleanup.scheduledScans >= 1 && cleanup.deferredWork >= 2 && cleanup.nativeSettingsWaiters >= 1 && cleanup.dispatchQueueItems >= 1 && cleanup.placementBatches >= 1)
backend.cleanupStaleChatWork('healthy-chat', 'cleanup-user', 'fixture cleanup')

let resolveOwner!: (value: any) => void
let healthyWaiterCalls = 0
imageApi.generate = (input: any) => input.prompt === 'provider owner'
  ? new Promise(resolve => { resolveOwner = resolve })
  : Promise.resolve().then(() => { healthyWaiterCalls += 1; return { imageId: 'healthy-waiter', imageUrl: '/healthy-waiter' } })
const owner = backend.generateWithOptionalStream({ prompt: 'provider owner' }, swarmPlan, 'provider-cleanup-user', context('provider-owner', 'owner-chat'), false, 500)
while (!resolveOwner) await Promise.resolve()
const staleWaiter = backend.generateWithOptionalStream({ prompt: 'stale waiter' }, swarmPlan, 'provider-cleanup-user', context('stale-waiter', 'provider-stale-chat', { laneWaitTimeoutMs: 500 }), false, 500)
const healthyWaiter = backend.generateWithOptionalStream({ prompt: 'healthy waiter' }, swarmPlan, 'provider-cleanup-user', context('healthy-waiter', 'provider-healthy-chat', { laneWaitTimeoutMs: 500 }), false, 500)
await delay(5)
backend.cleanupStaleChatWork('provider-stale-chat', 'provider-cleanup-user', 'Chat not found')
await assert.rejects(staleWaiter, /no longer available/i)
assert.equal((backend.inspectImageGenerationLaneDiagnostics('provider-cleanup-user') as any).waiterCount, 1)
resolveOwner({ imageId: 'owner', imageUrl: '/owner' })
await owner
assert.equal((await healthyWaiter).imageId, 'healthy-waiter')
assert.equal(healthyWaiterCalls, 1)

console.log('Swarm generation regression smoke passed: standard-only transport, one-spend invariant, non-fatal lifecycle reporting, destination-loss discard, indefinite Swarm drain ownership, late-result suppression, and chat-isolated stale-work cleanup are enforced.')
