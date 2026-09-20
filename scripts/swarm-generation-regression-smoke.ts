// @ts-nocheck -- deterministic Swarm transport/lane harness with a narrow Spindle mock.
import { strict as assert } from 'node:assert'

const frontendEvents: any[] = []
const logs: Array<{ level: string; message: string }> = []
const storage = new Map<string, any>()
const imageApi: any = {}
;(globalThis as any).spindle = {
  registerMessageContentProcessor() {}, registerInterceptor() { return () => {} }, registerMacro() {}, on() {}, onFrontendMessage() {},
  sendToFrontend(payload: any) { frontendEvents.push(payload) },
  permissions: { has() { return true }, onChanged() { return () => {} } },
  userStorage: {
    async getJson(path: string, options: any = {}) { return storage.has(path) ? structuredClone(storage.get(path)) : structuredClone(options.fallback || {}) },
    async setJson(path: string, value: any) { storage.set(path, structuredClone(value)) }, async mkdir() {},
  },
  chat: { async getMessages() { return [] } }, chats: { async get(chatId: string) { return { id: chatId } } },
  characters: { async get() { return null } }, personas: { async getActive() { return null } },
  world_books: { async getActivated() { return [] }, entries: { async get() { return null } } },
  imageGen: imageApi, variables: { global: { async set() {} }, chat: { async set() {} } },
  log: {
    info(message: string) { logs.push({ level: 'info', message }) }, warn(message: string) { logs.push({ level: 'warn', message }) },
    error(message: string) { logs.push({ level: 'error', message }) },
  },
}

const backend = await import('../src/backend')
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
const swarmPlan = { provider: 'swarmui' }
const context = (generationId: string, extra: Record<string, unknown> = {}) => ({
  chatId: `chat-${generationId}`, messageId: `message-${generationId}`, generationId,
  source: 'relay-slot', slotKey: generationId, requestId: generationId, ...extra,
})
const advertiseSwarmStream = () => {
  imageApi.getProviders = async () => [{ id: 'swarmui', capabilities: { websocketPreviewStreaming: { previews: true, status: true } } }]
}
const assertExactlyOnce = (generationId: string, terminalState: string) => {
  const diagnostic: any = backend.inspectProviderAttemptDiagnostics(generationId)
  assert.equal(diagnostic.providerDispatchCount, 1, `${generationId} spent more than once`)
  assert.equal(diagnostic.terminalState, terminalState)
  assert.equal(diagnostic.terminalResolutionCount, 1, `${generationId} resolved terminal state more than once`)
  assert.equal(diagnostic.cleanupCount, 1, `${generationId} cleaned up more than once`)
  assert(diagnostic.providerLaneAcquiredAt > 0)
  assert(diagnostic.providerLaneReleasedAt >= diagnostic.providerLaneAcquiredAt)
  return diagnostic
}

// Fail closed before provider spend when the host cannot offer the only
// ImageGen transport carrying AbortSignal.
let standardCalls = 0
imageApi.getProviders = async () => [{ id: 'swarmui', capabilities: {} }]
imageApi.generate = async () => { standardCalls += 1; return { imageId: 'must-not-run' } }
delete imageApi.generateStream
await assert.rejects(
  backend.generateWithOptionalStream({ prompt: 'uninterruptible swarm' }, swarmPlan, 'swarm-preflight', context('swarm-preflight')),
  /requires the abortable ImageGen stream transport/i,
)
assert.equal(standardCalls, 0)
const preflight: any = backend.inspectProviderAttemptDiagnostics('swarm-preflight')
assert.equal(preflight.providerDispatchCount, 0)
assert.equal(preflight.terminalState, 'preflight-error')
assert.equal(preflight.terminalResolutionCount, 1)
assert.equal(preflight.cleanupCount, 1)

// Four simultaneous requests serialize at provider concurrency one, while
// correlation IDs survive into the actual provider request.
advertiseSwarmStream()
let active = 0
let maxActive = 0
const correlated: any[] = []
imageApi.generateStream = async function* (input: any) {
  active += 1
  maxActive = Math.max(maxActive, active)
  correlated.push(input)
  try {
    yield { type: 'status', status: 'accepted', requestId: `swarm-${input.relay_generation_id}` }
    await delay(5)
    yield { type: 'done', result: { imageId: `image-${input.relay_generation_id}`, imageUrl: `/image-${input.relay_generation_id}` } }
  } finally { active -= 1 }
}
const simultaneous = ['lane-a', 'lane-b', 'lane-c', 'lane-d'].map(id => backend.generateWithOptionalStream({
  prompt: id, relay_origin: 'reverie-relay', relay_generation_id: id, relay_request_id: `request-${id}`, relay_recipe_id: `recipe-${id}`,
}, swarmPlan, 'swarm-serialized', context(id), false, 500))
const simultaneousResults = await Promise.all(simultaneous)
assert.equal(maxActive, 1, `Swarm provider concurrency reached ${maxActive}`)
assert.deepEqual(simultaneousResults.map(result => result.imageId), ['image-lane-a', 'image-lane-b', 'image-lane-c', 'image-lane-d'])
assert.deepEqual(correlated.map(input => [input.relay_origin, input.relay_generation_id, input.relay_request_id, input.relay_recipe_id]), [
  ['reverie-relay', 'lane-a', 'request-lane-a', 'recipe-lane-a'], ['reverie-relay', 'lane-b', 'request-lane-b', 'recipe-lane-b'],
  ['reverie-relay', 'lane-c', 'request-lane-c', 'recipe-lane-c'], ['reverie-relay', 'lane-d', 'request-lane-d', 'recipe-lane-d'],
])
for (const id of ['lane-a', 'lane-b', 'lane-c', 'lane-d']) {
  const diagnostic = assertExactlyOnce(id, 'success')
  assert.equal(diagnostic.providerTransport, 'stream')
  assert(diagnostic.abortRequestedAt === 0 && diagnostic.abortPropagatedAt === 0)
  assert(diagnostic.swarmRequestAcceptedAt >= diagnostic.swarmHttpRequestStartedAt)
  assert.equal(diagnostic.swarmRequestId, `swarm-${id}`)
}

// Timeout aborts at the provider boundary and cannot wedge the lane. The next
// request represents parser-fallback work using the exact same transport path.
let timeoutAbortObserved = 0
imageApi.generateStream = async function* (input: any) {
  if (input.prompt === 'hang until timeout') {
    yield { type: 'status', status: 'accepted', requestId: 'swarm-timeout-request' }
    await new Promise<void>((_resolve, reject) => {
      const onAbort = () => { timeoutAbortObserved += 1; reject(Object.assign(new Error('provider aborted'), { name: 'AbortError' })) }
      if (input.signal.aborted) onAbort()
      else input.signal.addEventListener('abort', onAbort, { once: true })
    })
  }
  yield { type: 'done', result: { imageId: `image-${input.prompt}`, imageUrl: `/image-${input.prompt}` } }
}
const timedOut = backend.generateWithOptionalStream({ prompt: 'hang until timeout' }, swarmPlan, 'swarm-timeout', context('timeout-a'), false, 20)
const afterTimeout = backend.generateWithOptionalStream({ prompt: 'parser fallback successor' }, swarmPlan, 'swarm-timeout', context('timeout-b'), false, 500)
await assert.rejects(timedOut, /did not finish|timed out/i)
assert.equal((await afterTimeout).imageId, 'image-parser fallback successor')
assert.equal(timeoutAbortObserved, 1)
const timeoutDiagnostic = assertExactlyOnce('timeout-a', 'timeout')
assert(timeoutDiagnostic.abortRequestedAt > 0 && timeoutDiagnostic.abortPropagatedAt >= timeoutDiagnostic.abortRequestedAt)
assertExactlyOnce('timeout-b', 'success')
assert.equal(backend.inspectImageGenerationLaneDiagnostics('swarm-timeout'), null)

// Explicit user cancellation uses the same abort propagation and cleanup path.
let userAbortObserved = 0
const userController = new AbortController()
imageApi.generateStream = async function* (input: any) {
  if (input.prompt === 'cancel me') {
    yield { type: 'status', status: 'accepted' }
    await new Promise<void>((_resolve, reject) => {
      const onAbort = () => { userAbortObserved += 1; reject(Object.assign(new Error('user abort'), { name: 'AbortError' })) }
      input.signal.addEventListener('abort', onAbort, { once: true })
    })
  }
  yield { type: 'done', result: { imageId: 'after-cancel', imageUrl: '/after-cancel' } }
}
const cancelled = backend.generateWithOptionalStream({ prompt: 'cancel me' }, swarmPlan, 'swarm-cancel', context('cancel-a', { attemptSignal: userController.signal }), false, 500)
const afterCancel = backend.generateWithOptionalStream({ prompt: 'next request' }, swarmPlan, 'swarm-cancel', context('cancel-b'), false, 500)
await delay(5)
userController.abort('user cancelled')
await assert.rejects(cancelled, /cancel/i)
assert.equal((await afterCancel).imageId, 'after-cancel')
assert.equal(userAbortObserved, 1)
const cancelDiagnostic = assertExactlyOnce('cancel-a', 'cancelled')
assert(cancelDiagnostic.abortRequestedAt > 0 && cancelDiagnostic.abortPropagatedAt >= cancelDiagnostic.abortRequestedAt)
assertExactlyOnce('cancel-b', 'success')

// A misbehaving stream returning late cannot emit a stale success or steal the
// next request's lease.
let releaseLate!: () => void
imageApi.generateStream = async function* (input: any) {
  if (input.prompt === 'late result') {
    yield { type: 'status', status: 'accepted' }
    await new Promise<void>(resolve => { releaseLate = resolve })
    yield { type: 'done', result: { imageId: 'stale-late-result', imageUrl: '/stale-late-result' } }
    return
  }
  yield { type: 'done', result: { imageId: 'fresh-result', imageUrl: '/fresh-result' } }
}
const lateController = new AbortController()
const late = backend.generateWithOptionalStream({ prompt: 'late result' }, swarmPlan, 'swarm-late', context('late-a', { attemptSignal: lateController.signal }), false, 500)
while (!releaseLate) await Promise.resolve()
lateController.abort('navigate away')
await assert.rejects(late, /cancel/i)
const fresh = backend.generateWithOptionalStream({ prompt: 'fresh request' }, swarmPlan, 'swarm-late', context('late-b'), false, 500)
releaseLate()
assert.equal((await fresh).imageId, 'fresh-result')
assert.equal(frontendEvents.some(event => event?.generationId === 'late-a' && event?.event === 'done'), false)
assertExactlyOnce('late-a', 'cancelled')
assertExactlyOnce('late-b', 'success')

assert.equal(logs.some(entry => entry.message.includes('image_stream_fallback')), false)
console.log('Swarm generation regression smoke passed: abortable transport, exact correlation, concurrency one, timeout/cancel lane release, and stale-result rejection are enforced.')
