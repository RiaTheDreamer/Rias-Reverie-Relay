// @ts-nocheck -- deterministic success-to-success Swarm subscription cleanup across chats.
import assert from 'node:assert/strict'

const storage = new Map<string, unknown>()
const imageApi: any = {}
;(globalThis as any).spindle = {
  registerMessageContentProcessor() {}, registerInterceptor() { return () => {} }, registerMacro() {}, on() {}, onFrontendMessage() {},
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
imageApi.generateStream = async function* (input: any) {
  activeSubscriptions += 1
  maximumSubscriptions = Math.max(maximumSubscriptions, activeSubscriptions)
  providerStarts.push(input.relay_generation_id)
  try {
    yield { type: 'status', status: 'accepted', requestId: `swarm-${input.relay_generation_id}` }
    yield { type: 'done', result: { imageId: `image-${input.relay_generation_id}`, imageUrl: `/image-${input.relay_generation_id}.png` } }
    // A host stream may remain open after its terminal payload. Relay must call
    // AsyncIterator.return() instead of carrying this subscription into the
    // next same-chat or cross-chat provider invocation.
    await new Promise<void>(() => undefined)
  } finally {
    activeSubscriptions -= 1
    providerTeardowns.push(input.relay_generation_id)
  }
}

const userId = 'cross-chat-sequential-user'
const sequence = [
  ...Array.from({ length: 5 }, (_, index) => ({ chatId: 'chat-a', id: `a-${index + 1}` })),
  ...Array.from({ length: 5 }, (_, index) => ({ chatId: 'chat-b', id: `b-${index + 1}` })),
  ...Array.from({ length: 2 }, (_, index) => ({ chatId: 'chat-a', id: `a-return-${index + 1}` })),
]

const startedAt = Date.now()
for (const item of sequence) {
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
  assert.equal(diagnostic.activeProviderSubscriptionsAfterTeardown, 0)
  assert(diagnostic.invocationFinalizationCompletedAt >= diagnostic.providerSubscriptionTeardownCompletedAt)
  assert(diagnostic.providerLaneReleasedAt >= diagnostic.invocationFinalizationCompletedAt)
  assert.equal(diagnostic.providerLaneReleaseCount, 1)
}

assert.equal(maximumSubscriptions, 1, 'successive chat generations overlapped provider subscriptions')
assert.deepEqual(providerStarts, sequence.map(item => item.id))
assert.deepEqual(providerTeardowns, sequence.map(item => item.id))
assert.equal(backend.inspectImageGenerationLaneDiagnostics(userId), null)
assert(Date.now() - startedAt < 2_000, 'sequential success accumulated pathological wrapper delay')

console.log('cross-chat generation lifecycle smoke passed: 12 sequential successes across A -> B -> A explicitly tore down every terminal Swarm subscription before lane handoff.')
