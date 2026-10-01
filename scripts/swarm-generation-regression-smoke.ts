// @ts-nocheck -- deterministic Swarm transport/lane harness with a narrow Spindle mock.
import { strict as assert } from 'node:assert'

const frontendEvents: any[] = []
const logs: Array<{ level: string; message: string }> = []
const storage = new Map<string, any>()
const imageApi: any = {}
let frontendMessageHandler: ((payload: any, userId?: string) => Promise<void>) | null = null
;(globalThis as any).spindle = {
  registerMessageContentProcessor() {}, registerInterceptor() { return () => {} }, registerMacro() {}, on() {},
  onFrontendMessage(handler: (payload: any, userId?: string) => Promise<void>) { frontendMessageHandler = handler },
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
  assert.equal(diagnostic.providerLaneReleaseCount, 1, `${generationId} released the provider lane more than once`)
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
const fastPathStartedAt = Date.now()
const simultaneousResults = await Promise.all(simultaneous)
assert(Date.now() - fastPathStartedAt < 1_000, 'Relay transport wrapper added unbounded overhead to direct fast provider results')
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

// Production calls install no Relay wall-clock deadline. One active request
// and its serialized waiter remain pending until the provider settles, then
// complete in provider concurrency one.
assert.equal(backend.IMAGE_GENERATION_TIMEOUT_MS, undefined)
assert.equal(backend.IMAGE_GENERATION_LANE_WAIT_TIMEOUT_MS, undefined)
let releaseProduction!: () => void
let productionSecondSettled = false
let relayWallClockTimers = 0
const nativeSetTimeout = globalThis.setTimeout
globalThis.setTimeout = ((handler: TimerHandler, timeout?: number, ...args: any[]) => {
  if (Number(timeout) >= 300_000) relayWallClockTimers += 1
  return nativeSetTimeout(handler, timeout, ...args)
}) as typeof setTimeout
try {
  imageApi.generateStream = async function* (input: any) {
    if (input.prompt === 'production long request') {
      yield { type: 'status', status: 'accepted' }
      await new Promise<void>(resolve => { releaseProduction = resolve })
    }
    yield { type: 'done', result: { imageId: `image-${input.prompt}`, imageUrl: `/image-${input.prompt}` } }
  }
  const productionLong = backend.generateWithOptionalStream({ prompt: 'production long request' }, swarmPlan, 'swarm-production-timeoutless', context('production-long'))
  while (!releaseProduction) await Promise.resolve()
  const productionWaiter = backend.generateWithOptionalStream({ prompt: 'production lane waiter' }, swarmPlan, 'swarm-production-timeoutless', context('production-waiter'))
    .finally(() => { productionSecondSettled = true })
  await delay(15)
  assert.equal(productionSecondSettled, false, 'serialized production waiter settled before its provider turn')
  assert.equal(relayWallClockTimers, 0, 'production generation installed a Relay wall-clock timeout')
  releaseProduction()
  assert.equal((await productionLong).imageId, 'image-production long request')
  assert.equal((await productionWaiter).imageId, 'image-production lane waiter')
  assertExactlyOnce('production-long', 'success')
  assertExactlyOnce('production-waiter', 'success')
} finally {
  globalThis.setTimeout = nativeSetTimeout
}

// A Swarm request that is accepted but returns no terminal result remains
// timeoutless, while Relay records the distinct stall boundary in live
// diagnostics instead of mislabelling it as a cancel or transport failure.
advertiseSwarmStream()
let releaseAcceptedStall!: () => void
imageApi.generateStream = async function* (input: any) {
  yield { type: 'status', status: 'accepted', requestId: 'accepted-stall-provider-request' }
  await new Promise<void>(resolve => { releaseAcceptedStall = resolve })
  yield { type: 'done', result: { imageId: `image-${input.prompt}`, imageUrl: `/image-${input.prompt}` } }
}
const acceptedStall = backend.generateWithOptionalStream(
  { prompt: 'accepted then delayed terminal' },
  swarmPlan,
  'swarm-accepted-stall',
  context('accepted-stall', { chatId: 'accepted-stall-chat', acceptedStallThresholdMs: 10 }),
)
for (let attempt = 0; attempt < 50 && !logs.some(entry => entry.message.includes('[ReverieRelay:image_provider_accepted_stall]')); attempt += 1) await delay(2)
const liveAcceptedStall: any = backend.inspectProviderAttemptDiagnostics('accepted-stall')
assert(liveAcceptedStall.swarmAcceptedStallObservedAt > liveAcceptedStall.swarmRequestAcceptedAt)
assert(liveAcceptedStall.swarmAcceptedStallElapsedMs >= 10)
assert.equal(liveAcceptedStall.terminalState, undefined)
assert.equal(liveAcceptedStall.providerStreamCloseMode, undefined)
assert(logs.some(entry => entry.message.includes('[ReverieRelay:image_provider_accepted_stall]') && entry.message.includes('accepted-stall-provider-request')))
assert(frontendEvents.some(event => event?.generationId === 'accepted-stall' && event?.event === 'status' && /accepted.*terminal result/i.test(event?.statusText || '')))
releaseAcceptedStall()
assert.equal((await acceptedStall).imageId, 'image-accepted then delayed terminal')
const acceptedStallDiagnostic: any = assertExactlyOnce('accepted-stall', 'success')
assert.equal(acceptedStallDiagnostic.providerStreamCloseMode, 'natural-complete')

// A host can deliver a canonical result and then surface the Swarm close race
// while Relay consumes natural completion. Preserve the already-received
// result, but retain the transport reset as distinct evidence.
advertiseSwarmStream()
await frontendMessageHandler!({
  type: 'frontend_session', chatId: 'transport-reset-chat', sessionId: 'transport-session-a', connected: true,
  nativeSettingsAvailable: true, platformClass: 'desktop',
}, 'swarm-transport-reset')
imageApi.generateStream = async function* (input: any) {
  if (input.prompt === 'terminal then reset') {
    yield { type: 'status', status: 'accepted', requestId: 'transport-reset-provider-request', sessionId: 'local-a' }
    yield { type: 'done', sessionId: 'local-b', result: { imageId: 'preserved-after-reset', imageUrl: '/preserved-after-reset.png' } }
    throw new Error('WebSocket 10054: remote party closed without a close handshake')
  }
  yield { type: 'done', result: { imageId: 'successor-after-reset', imageUrl: '/successor-after-reset.png' } }
}
const preservedAfterReset = await backend.generateWithOptionalStream(
  { prompt: 'terminal then reset' }, swarmPlan, 'swarm-transport-reset',
  context('transport-reset', { chatId: 'transport-reset-chat' }),
)
assert.equal(preservedAfterReset.imageId, 'preserved-after-reset')
const transportResetDiagnostic: any = assertExactlyOnce('transport-reset', 'success')
assert.equal(transportResetDiagnostic.providerStreamCloseMode, 'transport-error')
assert.match(transportResetDiagnostic.postTerminalTransportError, /10054/)
assert(transportResetDiagnostic.transportErrorAt >= transportResetDiagnostic.providerPayloadReceivedAt)
assert.equal(transportResetDiagnostic.phase, 'success-after-transport-reset')
assert.equal(transportResetDiagnostic.swarmSessionId, 'local-a')
assert.equal(transportResetDiagnostic.swarmSessionChangedDuringAttempt, true)
assert.deepEqual(transportResetDiagnostic.connectedFrontendSessionIdsAtRequest, ['transport-session-a'])
assert.equal(transportResetDiagnostic.frontendSessionChangedDuringAttempt, false)
assert.equal(transportResetDiagnostic.activeProviderSubscriptionsAfterTeardown, 0)
assert.equal((await backend.generateWithOptionalStream(
  { prompt: 'successor' }, swarmPlan, 'swarm-transport-reset',
  context('transport-reset-successor', { chatId: 'transport-reset-chat' }),
)).imageId, 'successor-after-reset')
assertExactlyOnce('transport-reset-successor', 'success')
assert.equal(backend.inspectImageGenerationLaneDiagnostics('swarm-transport-reset'), null)

// Accepted-without-terminal remains timeoutless. Explicit cancellation must
// reveal the live phase/lane/subscription owner and release all three cleanly.
let acceptedHangAbortObserved = 0
const acceptedHangController = new AbortController()
imageApi.generateStream = async function* (input: any) {
  if (input.prompt === 'accepted and hanging') {
    yield { type: 'status', status: 'accepted', requestId: 'accepted-hang-provider-request' }
    await new Promise<void>((_resolve, reject) => {
      const onAbort = () => {
        acceptedHangAbortObserved += 1
        const error = new Error('accepted hang explicitly cancelled')
        error.name = 'AbortError'
        reject(error)
      }
      if (input.signal.aborted) onAbort()
      else input.signal.addEventListener('abort', onAbort, { once: true })
    })
  }
  yield { type: 'done', result: { imageId: 'successor-after-hang', imageUrl: '/successor-after-hang.png' } }
}
const acceptedHang = backend.generateWithOptionalStream(
  { prompt: 'accepted and hanging' }, swarmPlan, 'swarm-accepted-hang',
  context('accepted-hang', { chatId: 'accepted-hang-chat', attemptSignal: acceptedHangController.signal, acceptedStallThresholdMs: 5 }),
)
for (let attempt = 0; attempt < 50 && !(backend.inspectProviderAttemptDiagnostics('accepted-hang') as any)?.swarmAcceptedStallObservedAt; attempt += 1) await delay(2)
const acceptedHangLive: any = backend.inspectProviderAttemptDiagnostics('accepted-hang')
assert.equal(acceptedHangLive.swarmAcceptedStallPhase, 'swarm-accepted')
assert.equal(acceptedHangLive.swarmAcceptedStallLaneOwned, true)
assert.equal(acceptedHangLive.swarmAcceptedStallActiveSubscription, true)
assert(acceptedHangLive.swarmAcceptedStallActiveSubscriptionCount >= 1)
acceptedHangController.abort('explicit accepted-hang cancellation')
await assert.rejects(acceptedHang, /cancel/i)
assert.equal(acceptedHangAbortObserved, 1)
const acceptedHangDiagnostic: any = assertExactlyOnce('accepted-hang', 'cancelled')
assert.equal(acceptedHangDiagnostic.providerStreamCloseMode, 'explicit-cancel')
assert(acceptedHangDiagnostic.explicitCancelAt > 0)
assert.equal(acceptedHangDiagnostic.activeProviderSubscriptionsAfterTeardown, 0)
assert.equal((await backend.generateWithOptionalStream(
  { prompt: 'successor' }, swarmPlan, 'swarm-accepted-hang', context('accepted-hang-successor', { chatId: 'accepted-hang-chat' }),
)).imageId, 'successor-after-hang')
assertExactlyOnce('accepted-hang-successor', 'success')
assert.equal(backend.inspectImageGenerationLaneDiagnostics('swarm-accepted-hang'), null)

// Deterministic host-wrapper stress catches subscription/lane accumulation.
// It is deliberately not reported as real Swarm or Lumiverse live proof.
imageApi.generateStream = async function* (input: any) {
  yield { type: 'status', status: 'accepted', requestId: `stress-${input.relay_generation_id}` }
  yield { type: 'done', result: { imageId: `stress-${input.relay_generation_id}`, imageUrl: `/stress-${input.relay_generation_id}` } }
}
for (let index = 0; index < 24; index += 1) {
  const generationId = `long-run-${index}`
  const result = await backend.generateWithOptionalStream(
    { prompt: generationId, relay_generation_id: generationId },
    swarmPlan,
    'swarm-long-run',
    context(generationId, { chatId: 'long-run-chat' }),
  )
  assert.equal(result.imageId, `stress-${generationId}`)
  assert.equal(assertExactlyOnce(generationId, 'success').providerStreamCloseMode, 'natural-complete')
}
for (const [generationId, chatId] of [['aba-a1', 'chat-a'], ['aba-b', 'chat-b'], ['aba-a2', 'chat-a']]) {
  await backend.generateWithOptionalStream(
    { prompt: generationId, relay_generation_id: generationId },
    swarmPlan,
    'swarm-aba',
    context(generationId, { chatId }),
  )
  assert.equal(assertExactlyOnce(generationId, 'success').providerStreamCloseMode, 'natural-complete')
}
assert.equal(backend.inspectImageGenerationLaneDiagnostics('swarm-long-run'), null)
assert.equal(backend.inspectImageGenerationLaneDiagnostics('swarm-aba'), null)

// Global Abort All is user-scoped because the provider lane is user-scoped.
// It rejects cross-chat waiters and pre-abort deferred work before aborting the
// active transport, then keeps the lane quarantined until that transport ends.
advertiseSwarmStream()
let releaseGlobalAbortTransport!: () => void
const globalAbortProviderStarts: string[] = []
imageApi.generateStream = async function* (input: any) {
  globalAbortProviderStarts.push(input.prompt)
  if (input.prompt === 'global-active-a') {
    yield { type: 'status', status: 'accepted' }
    await new Promise<void>(resolve => { releaseGlobalAbortTransport = resolve })
  }
  yield { type: 'done', result: { imageId: `image-${input.prompt}`, imageUrl: `/image-${input.prompt}` } }
}
const globalUser = 'swarm-global-abort'
const globalA = backend.generateWithOptionalStream({ prompt: 'global-active-a' }, swarmPlan, globalUser, context('global-a', { chatId: 'global-chat-a' }), false, 500)
while (!releaseGlobalAbortTransport) await Promise.resolve()
const globalB = backend.generateWithOptionalStream({ prompt: 'global-waiting-b' }, swarmPlan, globalUser, context('global-b', { chatId: 'global-chat-b' }), false, 500)
const globalC = backend.generateWithOptionalStream({ prompt: 'global-waiting-c' }, swarmPlan, globalUser, context('global-c', { chatId: 'global-chat-c' }), false, 500)
await delay(10)
backend.stageGlobalAbortRegressionFixture('global-chat-a', 'global-chat-b', globalUser)
const globalAbort = backend.freezeAndCancelUserRuntime('global-chat-a', globalUser)
assert.equal(globalAbort.providerWaiters, 2)
assert.equal(globalAbort.deferredWork, 2)
// An automatic continuation captured before Abort All, or one observing the
// terminal cancelled record after it, has no authority to restart provider
// work. A genuinely new automatic request in the new epoch remains valid.
assert.equal(backend.automaticDispatchIsAuthorized(globalAbort.epoch - 1, globalUser, [{ status: 'queued' }]), false)
assert.equal(backend.automaticDispatchIsAuthorized(globalAbort.epoch, globalUser, [{ status: 'cancelled' }]), false)
assert.equal(backend.automaticDispatchIsAuthorized(globalAbort.epoch, globalUser, [{ status: 'queued' }]), true)
await Promise.all([
  assert.rejects(globalA, /abort|cancel/i),
  assert.rejects(globalB, /abort|cancel/i),
  assert.rejects(globalC, /abort|cancel/i),
])
assert.deepEqual(globalAbortProviderStarts, ['global-active-a'], 'Abort All promoted a cross-chat waiter into provider spend')
assert.equal((backend.inspectImageGenerationLaneDiagnostics(globalUser) as any).draining, true)
const explicitAfterAbort = backend.generateWithOptionalStream({ prompt: 'explicit-selected-after-abort' }, swarmPlan, globalUser, context('global-explicit', {
  chatId: 'global-chat-a', origin: 'explicit-single-retry', authorizedSlotKey: 'global-chat-a:selected-slot', cancellationEpoch: globalAbort.epoch,
  followedAbort: true, elapsedSinceAbortAllMs: 10,
}), false, 500)
await delay(10)
assert.deepEqual(globalAbortProviderStarts, ['global-active-a'], 'explicit retry overlapped the old draining transport')
releaseGlobalAbortTransport()
assert.equal((await explicitAfterAbort).imageId, 'image-explicit-selected-after-abort')
assert.deepEqual(globalAbortProviderStarts, ['global-active-a', 'explicit-selected-after-abort'], 'one selected retry did not produce exactly one authorized post-abort dispatch')
const explicitDiagnostic: any = assertExactlyOnce('global-explicit', 'success')
assert.equal(explicitDiagnostic.origin, 'explicit-single-retry')
assert.equal(explicitDiagnostic.authorizedSlotKey, 'global-chat-a:selected-slot')
assert.equal(explicitDiagnostic.followedAbort, true)
assert.equal(explicitDiagnostic.elapsedSinceAbortAllMs, 10)

// An explicit short deadline exists only for this deterministic harness. It
// exercises abort/cleanup behavior without restoring a production timeout.
let timeoutAbortObserved = 0
let timeoutSuccessorStarts = 0
let releaseTimedOutTransport!: () => void
imageApi.generateStream = async function* (input: any) {
  if (input.prompt === 'accept then never settle') {
    yield { type: 'status', status: 'accepted', requestId: 'swarm-timeout-request' }
    await new Promise<void>(resolve => {
      releaseTimedOutTransport = resolve
      const onAbort = () => { timeoutAbortObserved += 1 }
      if (input.signal.aborted) onAbort()
      else input.signal.addEventListener('abort', onAbort, { once: true })
    })
  } else {
    timeoutSuccessorStarts += 1
  }
  yield { type: 'done', result: { imageId: `image-${input.prompt}`, imageUrl: `/image-${input.prompt}` } }
}
const timeoutContext = context('timeout-a', { chatId: 'same-chat', slotKey: 'slot-timeout-a' })
const timedOut = backend.generateWithOptionalStream({ prompt: 'accept then never settle' }, swarmPlan, 'swarm-timeout', timeoutContext, false, 20)
await assert.rejects(timedOut, /did not finish|timed out/i)
assert.equal(timeoutAbortObserved, 1)
const timeoutBeforeSettlement: any = backend.inspectProviderAttemptDiagnostics('timeout-a')
assert.equal(timeoutBeforeSettlement.providerLaneReleaseCount, 0)
assert.equal((backend.inspectImageGenerationLaneDiagnostics('swarm-timeout') as any).draining, true)
const sameChatPromise = backend.generateWithOptionalStream({ prompt: 'same-chat successor' }, swarmPlan, 'swarm-timeout', context('timeout-same-chat', { chatId: 'same-chat' }), false, 500)
const freshChatPromise = backend.generateWithOptionalStream({ prompt: 'fresh-chat successor' }, swarmPlan, 'swarm-timeout', context('timeout-fresh-chat', { chatId: 'fresh-chat' }), false, 500)
await delay(10)
assert.equal(timeoutSuccessorStarts, 0, 'post-timeout provider work overlapped the old draining Swarm transport')
releaseTimedOutTransport()
assert(frontendEvents.some(event => event?.generationId === 'timeout-a' && event?.slotKey === 'slot-timeout-a' && event?.event === 'error' && /timed out/i.test(event?.statusText || '')), 'exact timed-out slot did not receive terminal timeout state')
assert.equal(frontendEvents.some(event => event?.generationId === 'timeout-a' && event?.event === 'done'), false, 'timed-out slot received stale success')
const sameChat = await sameChatPromise
const freshChat = await freshChatPromise
const timeoutDiagnostic = assertExactlyOnce('timeout-a', 'timeout')
assert(timeoutDiagnostic.abortRequestedAt > 0 && timeoutDiagnostic.abortPropagatedAt >= timeoutDiagnostic.abortRequestedAt)
assert.equal(sameChat.imageId, 'image-same-chat successor')
assert.equal(freshChat.imageId, 'image-fresh-chat successor')
assertExactlyOnce('timeout-same-chat', 'success')
assertExactlyOnce('timeout-fresh-chat', 'success')
assert.equal(backend.inspectImageGenerationLaneDiagnostics('swarm-timeout'), null)

// An aborted provider that never settles is detached automatically after the
// bounded drain deadline. Its orphaned promise remains telemetry-only and can
// no longer hold the serialized user lane forever.
let orphanSuccessorStarts = 0
const orphanController = new AbortController()
imageApi.generateStream = async function* (input: any) {
  if (input.prompt === 'orphan forever') {
    yield { type: 'status', status: 'accepted', requestId: 'orphan-provider-request' }
    await new Promise<void>(() => undefined)
  } else {
    orphanSuccessorStarts += 1
    yield { type: 'done', result: { imageId: 'after-orphan', imageUrl: '/after-orphan' } }
  }
}
const orphaned = backend.generateWithOptionalStream({ prompt: 'orphan forever' }, swarmPlan, 'swarm-orphan', context('orphan-a', {
  attemptSignal: orphanController.signal, drainTimeoutMs: 20, slotKey: 'same-orphan-slot',
}), false, 500)
await delay(5)
orphanController.abort('abandon host operation')
await assert.rejects(orphaned, /abort|abandon/i)
const afterOrphan = backend.generateWithOptionalStream({ prompt: 'successor after detach' }, swarmPlan, 'swarm-orphan', context('orphan-b', { slotKey: 'same-orphan-slot' }), false, 500)
await delay(10)
assert.equal(orphanSuccessorStarts, 0, 'successor started before the bounded drain deadline')
assert.equal((backend.inspectImageGenerationLaneDiagnostics('swarm-orphan') as any).draining, true)
assert.equal((await afterOrphan).imageId, 'after-orphan')
assert.equal(orphanSuccessorStarts, 1)
const orphanDiagnostic: any = assertExactlyOnce('orphan-a', 'cancelled')
assert.equal(orphanDiagnostic.providerOperationOrphaned, true)
assert.equal(orphanDiagnostic.providerDetachReason, 'automatic-drain-deadline')
assert(orphanDiagnostic.providerDetachedAt > orphanDiagnostic.abortRequestedAt)
assertExactlyOnce('orphan-b', 'success')
assert.equal(backend.inspectImageGenerationLaneDiagnostics('swarm-orphan'), null)

const projectedTimeoutRecord: any = {
  attempts: [{ attemptNumber: 1, triggerType: 'initial', startedAt: timeoutDiagnostic.createdAt, stage: 'image-generation' }],
}
backend.retainProviderAttemptDiagnostic(projectedTimeoutRecord, timeoutDiagnostic)
const projectedTimeoutTiming: any = backend.generationTimingForRecord(projectedTimeoutRecord, timeoutDiagnostic.completedAt)
assert(projectedTimeoutTiming.providerExecutionMs > 0, 'transport timeout retained a zero provider duration despite a real dispatch interval')

// A fresh provider failure finalizes a real attempt snapshot and can be
// retained on the slot before any success-only diagnostic path exists.
let finalizedFailureDiagnostic: any = null
imageApi.generateStream = async function* () {
  yield { type: 'status', status: 'accepted', requestId: 'fresh-failure-provider-request' }
  throw new Error('fresh provider failure evidence')
}
await assert.rejects(
  backend.generateWithOptionalStream({ prompt: 'fresh provider failure' }, swarmPlan, 'swarm-failure', context('failure-a', {
    onAttemptDiagnosticFinalized: (diagnostic: any) => { finalizedFailureDiagnostic = diagnostic },
  })),
  /fresh provider failure evidence/,
)
assert.equal(finalizedFailureDiagnostic.terminalState, 'error')
assert.equal(finalizedFailureDiagnostic.providerDispatchCount, 1)
assert.equal(finalizedFailureDiagnostic.providerLaneReleaseCount, 1)
assert.match(finalizedFailureDiagnostic.failure, /fresh provider failure evidence/)
const failedRecord: any = {
  key: 'durable-failure', target: 'custom.artifact-media', slot: 'durable-failure', requestId: 'durable-failure',
  originalRequestXml: '<image_request id="durable-failure"></image_request>', originalSceneBrief: 'Failed portrait.',
  attempts: [{ attemptNumber: 1, triggerType: 'auto', startedAt: Date.now(), outcome: 'failed' }],
}
backend.retainProviderAttemptDiagnostic(failedRecord, finalizedFailureDiagnostic)
const persistedFailure = JSON.parse(JSON.stringify(failedRecord))
assert.equal(persistedFailure.attempts[0].providerAttemptDiagnostic.terminalState, 'error')
assert.equal(persistedFailure.diagnostic.relayInferred.providerAttempt.providerDispatchCount, 1)
assert.match(persistedFailure.diagnostic.proven.failureReason, /fresh provider failure evidence/)

// Explicit user cancellation uses the same abort propagation and cleanup path.
let userAbortObserved = 0
let cancelSuccessorStarts = 0
let releaseCancelledTransport!: () => void
let finalizedCancelDiagnostic: any = null
const userController = new AbortController()
imageApi.generateStream = async function* (input: any) {
  if (input.prompt === 'cancel me') {
    yield { type: 'status', status: 'accepted' }
    await new Promise<void>(resolve => {
      releaseCancelledTransport = resolve
      const onAbort = () => { userAbortObserved += 1 }
      input.signal.addEventListener('abort', onAbort, { once: true })
    })
  } else {
    cancelSuccessorStarts += 1
  }
  yield { type: 'done', result: { imageId: 'after-cancel', imageUrl: '/after-cancel' } }
}
const cancelled = backend.generateWithOptionalStream({ prompt: 'cancel me' }, swarmPlan, 'swarm-cancel', context('cancel-a', {
  attemptSignal: userController.signal,
  onAttemptDiagnosticFinalized: (diagnostic: any) => { finalizedCancelDiagnostic = diagnostic },
}), false, 500)
const afterCancel = backend.generateWithOptionalStream({ prompt: 'next request' }, swarmPlan, 'swarm-cancel', context('cancel-b'), false, 500)
await delay(5)
userController.abort('user cancelled')
await assert.rejects(cancelled, /cancel/i)
await delay(10)
assert.equal(cancelSuccessorStarts, 0, 'post-cancel provider work overlapped the old draining Swarm transport')
assert.equal((backend.inspectImageGenerationLaneDiagnostics('swarm-cancel') as any).draining, true)
releaseCancelledTransport()
assert.equal((await afterCancel).imageId, 'after-cancel')
assert.equal(userAbortObserved, 1)
const cancelDiagnostic = assertExactlyOnce('cancel-a', 'cancelled')
assert(cancelDiagnostic.abortRequestedAt > 0 && cancelDiagnostic.abortPropagatedAt >= cancelDiagnostic.abortRequestedAt)
assert.equal(finalizedCancelDiagnostic.providerLaneReleaseCount, 1)
assert.equal(finalizedCancelDiagnostic.cleanupCount, 1)
assert.equal(finalizedCancelDiagnostic.terminalState, 'cancelled')
assert(finalizedCancelDiagnostic.providerLaneStateSnapshot && typeof finalizedCancelDiagnostic.providerLaneStateSnapshot.capturedAt === 'number')
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
const late = backend.generateWithOptionalStream({ prompt: 'late result' }, swarmPlan, 'swarm-late', context('late-a', { attemptSignal: lateController.signal, drainTimeoutMs: 20 }), false, 500)
while (!releaseLate) await Promise.resolve()
lateController.abort('navigate away')
await assert.rejects(late, /cancel/i)
const fresh = backend.generateWithOptionalStream({ prompt: 'fresh request' }, swarmPlan, 'swarm-late', context('late-b'), false, 500)
assert.equal((await fresh).imageId, 'fresh-result')
assert.equal((backend.inspectProviderAttemptDiagnostics('late-a') as any).providerOperationOrphaned, true)
releaseLate()
await delay(5)
assert.equal(frontendEvents.some(event => event?.generationId === 'late-a' && event?.event === 'done'), false)
assertExactlyOnce('late-a', 'cancelled')
assertExactlyOnce('late-b', 'success')

// Every persisted provider-start origin is exercised through the actual shared
// dispatch seam so diagnostics cannot silently collapse new paths to "auto".
advertiseSwarmStream()
imageApi.generateStream = async function* (input: any) {
  yield { type: 'done', result: { imageId: `origin-${input.prompt}`, imageUrl: `/origin-${input.prompt}` } }
}
const providerOrigins = [
  'new-response-auto', 'explicit-single-retry', 'explicit-generate-selected-pending', 'explicit-generate-all-pending',
  'explicit-regenerate', 'explicit-reparse', 'deferred-regenerate', 'deferred-reparse', 'automatic-recovery',
  'candidate-generation', 'illustrator-generation',
] as const
for (const origin of providerOrigins) {
  const generationId = `origin-${origin}`
  await backend.generateWithOptionalStream({ prompt: origin }, swarmPlan, 'swarm-origin-matrix', context(generationId, {
    origin, previousSlotStatus: 'paused-backlog', cancellationEpoch: 0,
    authorizedSlotKey: origin.startsWith('explicit-') ? `slot-${origin}` : undefined,
  }), false, 500)
  const diagnostic: any = assertExactlyOnce(generationId, 'success')
  assert.equal(diagnostic.origin, origin)
  assert.equal(diagnostic.previousSlotStatus, 'paused-backlog')
  assert.equal(diagnostic.cancellationEpoch, 0)
}

assert.equal(logs.some(entry => entry.message.includes('image_stream_fallback')), false)
console.log('Swarm generation regression smoke passed: timeoutless active work, bounded aborted-operation detach, exact correlation, concurrency-one ownership, durable phase diagnostics, and stale-result rejection are enforced.')
