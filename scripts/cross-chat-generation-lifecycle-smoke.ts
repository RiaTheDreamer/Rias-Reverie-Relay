// @ts-nocheck -- deterministic success-to-success Swarm subscription cleanup across chats.
import assert from 'node:assert/strict'

const storage = new Map<string, unknown>()
const imageApi: any = {}
let frontendMessageHandler: ((payload: unknown, userId?: string) => unknown) | null = null
;(globalThis as any).spindle = {
  registerMessageContentProcessor() {}, registerInterceptor() { return () => {} }, registerMacro() {}, on() {}, onFrontendMessage(handler: (payload: unknown, userId?: string) => unknown) { frontendMessageHandler = handler },
  sendToFrontend() {}, permissions: { has() { return true }, onChanged() { return () => {} } },
  userStorage: {
    async getJson(path: string, options: any = {}) { return structuredClone(storage.get(path) ?? options.fallback ?? {}) },
    async setJson(path: string, value: unknown) { storage.set(path, structuredClone(value)) }, async mkdir() {},
  },
  chat: { async getMessages() { return [] } }, chats: { async get(chatId: string) { return { id: chatId } } },
  characters: { async get() { return null } }, personas: { async getActive() { return null } },
  world_books: { async getActivated() { return [] }, entries: { async get() { return null } } },
  imageGen: imageApi, variables: { global: { async set() {} }, chat: { async set() {} } },
  log: { info() {}, warn() {}, error() {} },
}

const backend = await import('../src/backend')
imageApi.getProviders = async () => [{ id: 'swarmui', capabilities: { websocketPreviewStreaming: { previews: true, status: true } } }]

let activeSubscriptions = 0
let maximumSubscriptions = 0
const providerStarts: string[] = []
const providerTeardowns: string[] = []
let abruptAbortCount = 0
let naturalCloseCount = 0
imageApi.generateStream = function (input: any) {
  let step = 0
  let open = false
  const close = () => {
    if (!open) return
    open = false
    activeSubscriptions -= 1
    providerTeardowns.push(input.relay_generation_id)
  }
  return {
    [Symbol.asyncIterator]() {
      if (!open) {
        open = true
        activeSubscriptions += 1
        maximumSubscriptions = Math.max(maximumSubscriptions, activeSubscriptions)
        providerStarts.push(input.relay_generation_id)
      }
      return this
    },
    async next() {
      if (step++ === 0) return { done: false, value: { type: 'status', status: 'accepted', requestId: `swarm-${input.relay_generation_id}` } }
      if (step === 2) return { done: false, value: { type: 'done', result: { imageId: `image-${input.relay_generation_id}`, imageUrl: `/image-${input.relay_generation_id}.png` } } }
      naturalCloseCount += 1
      close()
      return { done: true, value: undefined }
    },
    async return() {
      abruptAbortCount += 1
      close()
      return { done: true, value: undefined }
    },
  }
}

const userId = 'cross-chat-sequential-user'
assert(frontendMessageHandler, 'backend did not register frontend session handling')
await frontendMessageHandler!({ type: 'frontend_session', chatId: 'chat-a', sessionId: 'desktop-a', connected: true, nativeSettingsAvailable: true, platformClass: 'desktop' }, userId)
const sequence = [
  ...Array.from({ length: 20 }, (_, index) => ({ chatId: 'chat-a', id: `same-a-${index + 1}` })),
  ...Array.from({ length: 7 }, (_, index) => ({ chatId: 'chat-a', id: `switch-a-${index + 1}` })),
  ...Array.from({ length: 7 }, (_, index) => ({ chatId: 'chat-b', id: `switch-b-${index + 1}` })),
  ...Array.from({ length: 6 }, (_, index) => ({ chatId: 'chat-a', id: `return-a-${index + 1}` })),
]

const startedAt = Date.now()
for (const [index, item] of sequence.entries()) {
  if (index === 10) await frontendMessageHandler!({ type: 'frontend_session', chatId: 'chat-a', sessionId: 'mobile-a', connected: true, nativeSettingsAvailable: true, platformClass: 'mobile' }, userId)
  if (index === 20) await frontendMessageHandler!({ type: 'frontend_session', chatId: 'chat-a', sessionId: 'mobile-a', connected: false, nativeSettingsAvailable: false, platformClass: 'mobile' }, userId)
  if (index === 27) await frontendMessageHandler!({ type: 'frontend_session', chatId: 'chat-b', sessionId: 'desktop-b', connected: true, nativeSettingsAvailable: true, platformClass: 'desktop' }, userId)
  if (index === 34) await frontendMessageHandler!({ type: 'frontend_session', chatId: 'chat-b', sessionId: 'desktop-b', connected: false, nativeSettingsAvailable: false, platformClass: 'desktop' }, userId)
  const result = await Promise.race([
    backend.generateWithOptionalStream({
      prompt: item.id,
      relay_origin: 'reverie-relay',
      relay_generation_id: item.id,
      relay_request_id: item.id,
    }, { provider: 'swarmui' }, userId, {
      chatId: item.chatId,
      messageId: `message-${item.id}`,
      generationId: item.id,
      source: 'relay-slot',
      slotKey: `${item.chatId}:${item.id}`,
      requestId: item.id,
    }),
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error(`pathological sequential stall at ${item.id}`)), 1_000)),
  ])
  assert.equal(result.imageId, `image-${item.id}`)
  assert.equal(activeSubscriptions, 0, `${item.id} left a host subscription active`)
  const diagnostic: any = backend.inspectProviderAttemptDiagnostics(item.id)
  assert.equal(diagnostic.chatId, item.chatId)
  assert(diagnostic.providerSubscriptionRegisteredAt > 0)
  assert(diagnostic.providerSubscriptionTeardownStartedAt >= diagnostic.providerSubscriptionRegisteredAt)
  assert(diagnostic.providerSubscriptionTeardownCompletedAt >= diagnostic.providerSubscriptionTeardownStartedAt)
  assert.equal(diagnostic.providerStreamCloseMode, 'natural-complete')
  assert.equal(diagnostic.activeProviderSubscriptionsAfterTeardown, 0)
  assert(diagnostic.invocationFinalizationCompletedAt >= diagnostic.providerSubscriptionTeardownCompletedAt)
  assert(diagnostic.providerLaneReleasedAt >= diagnostic.invocationFinalizationCompletedAt)
  assert.equal(diagnostic.providerLaneReleaseCount, 1)
}

assert.equal(maximumSubscriptions, 1, 'successive chat generations overlapped provider subscriptions')
assert.deepEqual(providerStarts, sequence.map(item => item.id))
assert.deepEqual(providerTeardowns, sequence.map(item => item.id))
assert.equal(naturalCloseCount, sequence.length, 'host stream did not naturally close after each terminal result')
assert.equal(abruptAbortCount, 0, 'successful terminal result invoked AsyncIterator.return() and simulated an abrupt WebSocket abort')
assert.equal(backend.inspectImageGenerationLaneDiagnostics(userId), null)
assert(Date.now() - startedAt < 3_000, 'sequential success accumulated pathological wrapper delay')

console.log('cross-chat generation lifecycle smoke passed: 20 same-chat plus 20 A -> B -> A successes naturally closed every host stream with zero abrupt-return aborts or provider overlap through frontend reconnect churn.')
