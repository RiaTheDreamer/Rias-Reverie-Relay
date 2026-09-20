// @ts-nocheck -- deterministic transport/lifecycle harness with a narrow Spindle mock.
import { strict as assert } from 'node:assert'
import { readFile } from 'node:fs/promises'

const frontendEvents: any[] = []
const logs: Array<{ level: string; message: string }> = []
const storage = new Map<string, any>()
const imageApi: any = {}
const chatLookups = new Map<string, any>()
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
  chat: { async getMessages() { return [] } }, chats: { async get(chatId: string) { return chatLookups.has(chatId) ? chatLookups.get(chatId) : { id: chatId } } },
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
  providerAbandonedByUser: false, laneResetCount: 0, lastLaneResetAt: undefined,
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

// 5-8 follow-up. Manual recovery is unavailable for a healthy/active/queued
// lane, becomes available only after the Swarm drain threshold, rejects every
// waiter, and invalidates the abandoned lease before a manual retry starts.
assert.equal((backend.imageWorkerRecoveryState('healthy-worker-user') as any).resetAvailable, false)
let resolveResetA!: (value: any) => void
let resolveManualB!: (value: any) => void
let queuedBCalls = 0
let queuedCCalls = 0
let manualBCalls = 0
imageApi.generate = (input: any) => {
  if (input.prompt === 'reset swarm A') return new Promise(resolve => { resolveResetA = resolve })
  if (input.prompt === 'queued B') { queuedBCalls += 1; return Promise.resolve({ imageId: 'should-not-run-b' }) }
  if (input.prompt === 'queued C') { queuedCCalls += 1; return Promise.resolve({ imageId: 'should-not-run-c' }) }
  if (input.prompt === 'manual B') return new Promise(resolve => { manualBCalls += 1; resolveManualB = resolve })
  throw new Error(`Unexpected reset test prompt: ${input.prompt}`)
}
const resetA = backend.generateWithOptionalStream({ prompt: 'reset swarm A' }, swarmPlan, 'manual-reset-user', context('reset-a', 'reset-chat-a'), false, 20)
while (!resolveResetA) await Promise.resolve()
assert.equal((backend.imageWorkerRecoveryState('manual-reset-user') as any).resetAvailable, false, 'reset appeared during normal generation')
await assert.rejects(resetA, (error: any) => error?.name === 'ImageGenerationTimeoutError')
const queuedB = backend.generateWithOptionalStream({ prompt: 'queued B' }, swarmPlan, 'manual-reset-user', context('queued-b', 'reset-chat-b', { laneWaitTimeoutMs: 500 }), false, 500)
const queuedC = backend.generateWithOptionalStream({ prompt: 'queued C' }, swarmPlan, 'manual-reset-user', context('queued-c', 'reset-chat-c', { laneWaitTimeoutMs: 500 }), false, 500)
await delay(5)
assert.equal((backend.imageWorkerRecoveryState('manual-reset-user') as any).resetAvailable, false, 'queued work exposed reset before the stuck threshold')
const resetLane = backend.inspectImageGenerationLaneDiagnostics('manual-reset-user') as any
const stuckNow = resetLane.drainStartedAt + backend.SWARM_IMAGE_WORKER_STUCK_THRESHOLD_MS + 1
assert.equal((backend.imageWorkerRecoveryState('manual-reset-user', stuckNow) as any).resetAvailable, true)
const resetResult = backend.resetStuckImageWorker('manual-reset-user', stuckNow) as any
await assert.rejects(queuedB, (error: any) => error?.name === 'ImageGenerationWorkerResetError')
await assert.rejects(queuedC, (error: any) => error?.name === 'ImageGenerationWorkerResetError')
assert.equal(queuedBCalls, 0)
assert.equal(queuedCCalls, 0)
assert.equal(resetResult.rejectedWaiters, 2)
assert.equal(resetResult.remoteCancellationClaimed, false)
assert.equal((backend.imageWorkerRecoveryState('manual-reset-user') as any).draining, false)
const abandoned = backend.inspectProviderAttemptDiagnostics('reset-a') as any
assert.equal(abandoned.providerAbandonedByUser, true)
assert.equal(abandoned.providerAbandonReason, 'explicit-worker-reset')
assert.equal(abandoned.laneResetCount, 1)

const manualB = backend.generateWithOptionalStream({ prompt: 'manual B' }, swarmPlan, 'manual-reset-user', context('manual-b', 'reset-chat-b'), false, 500)
while (!resolveManualB) await Promise.resolve()
assert.equal(manualBCalls, 1)
resolveResetA({ imageId: 'abandoned-a', imageUrl: '/abandoned-a' })
await delay(0)
assert.equal((backend.inspectImageGenerationLaneDiagnostics('manual-reset-user') as any).activeGenerationId, 'manual-b', 'late A changed B lane ownership')
assert.equal((backend.inspectProviderAttemptDiagnostics('manual-b') as any).providerDispatchCount, 1)
assert.equal(frontendEvents.some(event => event?.generationId === 'reset-a' && event?.event === 'done'), false)
resolveManualB({ imageId: 'manual-b-result', imageUrl: '/manual-b-result' })
assert.equal((await manualB).imageId, 'manual-b-result')
assert.equal(logs.some(entry => /cancelled successfully/i.test(entry.message)), false)

// 9. Provider routing remains capability-based: Swarm standard-only, ordinary
// request/response providers use generate(), and a non-Swarm provider with the
// documented preview/status capability retains generateStream().
let requestResponseCalls = 0
let supportedStreamCalls = 0
let forbiddenStandardFallbackCalls = 0
imageApi.getProviders = async () => [
  { id: 'openai', capabilities: {} },
  { id: 'nanogpt', capabilities: {} },
  { id: 'request-response-provider', capabilities: {} },
  { id: 'preview-provider', capabilities: { websocketPreviewStreaming: { previews: true, status: true } } },
]
imageApi.generate = async () => { requestResponseCalls += 1; return { imageId: 'request-response-result', imageUrl: '/request-response-result' } }
imageApi.generateStream = async function* (input: any) {
  if (input.provider === 'never') forbiddenStandardFallbackCalls += 1
  supportedStreamCalls += 1
  yield { type: 'done', result: { imageId: 'stream-provider-result', imageUrl: '/stream-provider-result' } }
}
assert.equal((await backend.generateWithOptionalStream({ prompt: 'openai request response' }, { provider: 'openai' }, 'routing-user', context('openai-standard'))).imageId, 'request-response-result')
assert.equal(requestResponseCalls, 1)
assert.equal((backend.inspectProviderAttemptDiagnostics('openai-standard') as any).providerTransport, 'standard')
assert.equal((await backend.generateWithOptionalStream({ prompt: 'nanogpt request response' }, { provider: 'nanogpt' }, 'routing-user', context('nanogpt-standard'))).imageId, 'request-response-result')
assert.equal((backend.inspectProviderAttemptDiagnostics('nanogpt-standard') as any).providerTransport, 'standard')
assert.equal((await backend.generateWithOptionalStream({ prompt: 'other request response' }, { provider: 'request-response-provider' }, 'routing-user', context('other-standard'))).imageId, 'request-response-result')
assert.equal((backend.inspectProviderAttemptDiagnostics('other-standard') as any).providerTransport, 'standard')
assert.equal(requestResponseCalls, 3)
assert.equal((await backend.generateWithOptionalStream({ prompt: 'supported provider stream' }, { provider: 'preview-provider' }, 'routing-user', context('supported-stream'))).imageId, 'stream-provider-result')
assert.equal(supportedStreamCalls, 1)
assert.equal(requestResponseCalls, 3, 'stream-capable provider fell back to a second standard provider spend')
assert.equal(forbiddenStandardFallbackCalls, 0)
assert.equal((backend.inspectProviderAttemptDiagnostics('supported-stream') as any).providerTransport, 'stream')

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

// 1-4 follow-up. A later authoritative host lookup can clear quarantine for a
// new explicit operation without resurrecting any of the old cancelled work;
// an actually deleted chat still stops before provider spend, and Chat B is
// untouched throughout Chat A recovery.
backend.stageStaleChatCleanupRegressionFixture('recover-chat-a', 'revalidation-user')
backend.stageStaleChatCleanupRegressionFixture('recover-chat-b', 'revalidation-user')
const recoveryBWorkBefore = backend.inspectChatRuntimeWork('recover-chat-b', 'revalidation-user')
backend.cleanupStaleChatWork('recover-chat-a', 'revalidation-user', 'Chat not found during navigation')
const cancelledAWork = backend.inspectChatRuntimeWork('recover-chat-a', 'revalidation-user')
for (const key of ['scheduledScans', 'deferredWork', 'nativeSettingsWaiters', 'dispatchQueueItems', 'providerWaiters', 'placementBatches']) assert.equal(cancelledAWork[key], 0)
chatLookups.set('recover-chat-a', { id: 'recover-chat-a' })
let recoveredDispatches = 0
imageApi.getProviders = async () => []
imageApi.generate = async () => { recoveredDispatches += 1; return { imageId: 'recovered-chat-result', imageUrl: '/recovered-chat-result' } }
assert.equal((await backend.generateWithOptionalStream({ prompt: 'new explicit operation' }, swarmPlan, 'revalidation-user', context('revalidated-generation', 'recover-chat-a'))).imageId, 'recovered-chat-result')
assert.equal(recoveredDispatches, 1)
assert.equal((backend.inspectProviderAttemptDiagnostics('revalidated-generation') as any).providerDispatchCount, 1)
assert.equal((backend.inspectChatDestinationDiagnostic('recover-chat-a', 'revalidation-user') as any).quarantined, false)
assert.equal((backend.inspectChatDestinationDiagnostic('recover-chat-a', 'revalidation-user') as any).validationResult, 'exists')
const recoveredAWork = backend.inspectChatRuntimeWork('recover-chat-a', 'revalidation-user')
for (const key of ['scheduledScans', 'deferredWork', 'nativeSettingsWaiters', 'dispatchQueueItems', 'providerWaiters', 'placementBatches']) assert.equal(recoveredAWork[key], 0, `${key} was resurrected by chat recovery`)
assert.deepEqual(backend.inspectChatRuntimeWork('recover-chat-b', 'revalidation-user'), recoveryBWorkBefore, 'Chat A recovery touched Chat B')

backend.cleanupStaleChatWork('deleted-chat-followup', 'revalidation-user', 'Chat not found')
chatLookups.set('deleted-chat-followup', null)
const beforeDeletedAttempt = recoveredDispatches
await assert.rejects(
  backend.generateWithOptionalStream({ prompt: 'must not spend' }, swarmPlan, 'revalidation-user', context('deleted-chat-attempt', 'deleted-chat-followup')),
  /destination chat deleted-chat-followup is no longer available/i,
)
assert.equal(recoveredDispatches, beforeDeletedAttempt)
assert.equal((backend.inspectProviderAttemptDiagnostics('deleted-chat-attempt') as any).providerDispatchCount, 0)
assert.equal((backend.inspectChatDestinationDiagnostic('deleted-chat-followup', 'revalidation-user') as any).quarantined, true)
assert.equal((backend.inspectChatDestinationDiagnostic('deleted-chat-followup', 'revalidation-user') as any).validationResult, 'missing')
chatLookups.delete('deleted-chat-followup')
backend.cleanupStaleChatWork('recover-chat-b', 'revalidation-user', 'fixture cleanup')

for (let index = 0; index < 300; index += 1) backend.markChatDestinationAvailable(`bounded-chat-${index}`, 'bounded-user')
assert(backend.inspectChatDestinationCacheSize() <= 256, 'chat destination diagnostics grew beyond the bounded cache limit')
const frontendSource = await readFile(new URL('../src/frontend.ts', import.meta.url), 'utf8')
assert(frontendSource.includes("imageWorkerRecovery.resetAvailable === true") && frontendSource.includes("imageWorkerRecovery.draining === true"), 'reset action is not gated by stuck lane state')
assert(frontendSource.includes("['swarmui', 'swarm-ui'].includes"), 'reset action is not restricted to SwarmUI')
assert(frontendSource.includes('Reset Stuck Image Worker') && frontendSource.includes('previous host generation was cancelled'), 'manual reset confirmation/cancellation warning is missing')

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

console.log('Swarm generation regression smoke passed: authoritative chat recovery, bounded quarantine semantics, explicit stuck-worker reset, lease-isolated late results, provider routing compatibility, one-spend safety, and chat-isolated cleanup are enforced.')
