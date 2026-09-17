// @ts-nocheck -- host-contract harness deliberately supplies a narrow Spindle mock.
import { strict as assert } from 'node:assert'
import { cancelMapKeysFromSnapshot, rememberBoundedMap } from '../src/c5bReliability'
import { buildNarrativeUtilityPrompt } from '../src/narrativeDlcRuntime'
import { SHIPPED_SURFACE_SPECS } from '../src/shippedSurfaceDefinitions'
import { completeSurfaceSpecs } from '../src/surfaceXml'

let interceptorPermission = false
let permissionChanged: ((detail: any) => void) | undefined
let interceptor: ((messages: any[], context: any) => Promise<any>) | undefined
let interceptorRegistrations = 0
let interceptorDisposals = 0
const frontendEvents: any[] = []
const storage = new Map<string, any>()
const imageApi: any = {}
let deferredConfigFallbacks = 0
let configWrites = 0
let blockStateWrites = false
let blockedStateWriteAttempts = 0

;(globalThis as any).spindle = {
  registerMessageContentProcessor() {},
  registerInterceptor(handler: any) {
    interceptorRegistrations += 1
    interceptor = handler
    let disposed = false
    return () => { if (!disposed) { disposed = true; interceptorDisposals += 1 } }
  },
  registerMacro() {},
  on() {},
  onFrontendMessage() {},
  sendToFrontend(payload: any) { frontendEvents.push(payload) },
  permissions: {
    has(permission: string) { return permission === 'interceptor' ? interceptorPermission : true },
    onChanged(handler: any) { permissionChanged = handler; return () => {} },
  },
  userStorage: {
    async getJson(path: string, options: any = {}) {
      if (path === 'config.json' && deferredConfigFallbacks > 0) {
        deferredConfigFallbacks -= 1
        return structuredClone(options.fallback || {})
      }
      return storage.has(path) ? structuredClone(storage.get(path)) : structuredClone(options.fallback || {})
    },
    async setJson(path: string, value: any) {
      if (path === 'config.json') configWrites += 1
      if (blockStateWrites && path.startsWith('states/')) {
        blockedStateWriteAttempts += 1
        return new Promise(() => {})
      }
      storage.set(path, structuredClone(value))
    },
    async mkdir() {},
  },
  chat: { async getMessages() { return [] } },
  chats: { async get() { return null } },
  characters: { async get() { return null } },
  personas: { async getActive() { return null } },
  world_books: { async getActivated() { return [] }, entries: { async get() { return null } } },
  imageGen: imageApi,
  variables: { global: { async set() {} }, chat: { async set() {} } },
  log: { info() {}, warn() {}, error() {} },
}

const backend = await import('../src/backend')

// A cold host may briefly return userStorage's fallback even though persisted
// config exists. Relay must retry the read and must never write defaults during
// that readiness window.
storage.set('config.json', { narrativeDlcEnabled: true, surfaceRendererMode: 'legacy-regex', autoGenerate: false })
deferredConfigFallbacks = 2
const coldConfig = await backend.getConfig('cold-user')
assert.equal(coldConfig.narrativeDlcEnabled, true)
assert.equal(coldConfig.surfaceRendererMode, 'legacy-regex')
assert.equal(coldConfig.autoGenerate, false)
assert.equal(configWrites, 0)
storage.set('config.json', {})

// Generation placeholder appearance is centralized persistent config. Every
// canonical value must survive a write and a fresh user-scope read; missing or
// corrupt legacy values migrate to Glitter.
for (const effect of ['spinner', 'glitter', 'none', 'dream-orb'] as const) {
  const saved = await backend.setConfig({ generationPlaceholderEffect: effect }, `placeholder-writer-${effect}`)
  assert.equal(saved.generationPlaceholderEffect, effect)
  const reloaded = await backend.getConfig(`placeholder-reload-${effect}`)
  assert.equal(reloaded.generationPlaceholderEffect, effect)
}
storage.set('config.json', { generationPlaceholderEffect: 'broken-effect' })
assert.equal((await backend.getConfig('placeholder-invalid')).generationPlaceholderEffect, 'glitter')
storage.set('config.json', {})
assert.equal((await backend.getConfig('placeholder-legacy')).generationPlaceholderEffect, 'glitter')
storage.set('config.json', {})

// Continue completions are assistant-message updates, not user impersonation.
// Relay must scan them and prefer the complete stored request inventory over a
// shorter generation-event fragment.
assert.equal(backend.shouldScanCompletedGeneration('continue'), true)
assert.equal(backend.shouldScanCompletedGeneration('normal'), true)
assert.equal(backend.shouldScanCompletedGeneration('impersonate'), false)
const request = (id: string) => `<image_request id="${id}" target="custom.artifact-media" slot="${id}" aspect="16:9" alt="${id}"><scene_brief>${id} prompt.</scene_brief></image_request>`
const storedCompletedResponse = `Opening prose.\n${Array.from({ length: 19 }, (_, index) => request(`scene-${index + 1}`)).join('\nMiddle prose.\n')}`
const capturedContinuationFragment = `Middle prose.\n${request('scene-19')}`
assert.equal(backend.selectCompletedRequestContent(storedCompletedResponse, capturedContinuationFragment), storedCompletedResponse)
assert.equal(backend.selectCompletedRequestContent('Opening prose.', capturedContinuationFragment), capturedContinuationFragment)

// Multiple completed requests compose against one authoritative message
// snapshot. A missing anchor isolates only that placement; deterministic
// siblings remain eligible for the transaction's single host update.
const batchSource = `Opening prose.\n${request('batch-one')}\nMiddle prose.\n${request('batch-two')}\nMore prose.\n${request('batch-three')}\nClosing prose.`
const batchEntry = (id: string, imageUrl: string) => ({
  job: {
    chatId: 'batch-chat', messageId: 'batch-message', swipeId: 0, requestId: id,
    target: 'custom.artifact-media', intent: 'scene', count: 1, slots: [id], alt: id,
    originalSceneBrief: `${id} prompt.`, originalNegativePrompt: '', originalRequestXml: request(id), sourceContent: batchSource,
  },
  results: [{ slot: id, imageId: id, imageUrl }],
})
const composedBatch = backend.composeInitialPlacementBatchContent(batchSource, [batchEntry('batch-two', '/batch-two.png'), batchEntry('batch-one', '/batch-one.png'), batchEntry('batch-three', '/batch-three.png')])
assert.equal(composedBatch.error, undefined)
assert(composedBatch.content.includes('Opening prose.') && composedBatch.content.includes('Middle prose.') && composedBatch.content.includes('Closing prose.'))
assert(composedBatch.content.includes('/batch-one.png') && composedBatch.content.includes('/batch-two.png') && composedBatch.content.includes('/batch-three.png'))
const missingAnchorBatch = backend.composeInitialPlacementBatchContent(batchSource.replace(request('batch-two'), ''), [batchEntry('batch-one', '/batch-one.png'), batchEntry('batch-two', '/batch-two.png'), batchEntry('batch-three', '/batch-three.png')])
assert.match(missingAnchorBatch.error || '', /No deterministic anchor/)
assert(missingAnchorBatch.content.includes('/batch-one.png') && missingAnchorBatch.content.includes('/batch-three.png'), 'one lost anchor poisoned its successful siblings')
assert(!missingAnchorBatch.content.includes('/batch-two.png'))
assert.deepEqual(missingAnchorBatch.failedEntries?.map((entry: any) => entry.job.requestId), ['batch-two'])

// Relay media persistence is content-only for the active swipe, explicitly
// targets the swipe array only for an inactive swipe, and never rebuilds chunks.
const swipeMessage = { id: 'message', role: 'assistant', content: 'active', swipe_id: 1, swipes: ['old', 'active'], metadata: { kept: true } }
const activePatch = backend.relayMediaPersistencePatch(swipeMessage, 1, 'active-with-images')
assert.equal(activePatch.content, 'active-with-images')
assert.equal(activePatch.skipChunkRebuild, true)
assert.equal('swipes' in activePatch, false, 'active swipe persistence rewrote the full swipe array')
const inactivePatch = backend.relayMediaPersistencePatch(swipeMessage, 0, 'inactive-with-images')
assert.equal(inactivePatch.content, undefined)
assert.equal(inactivePatch.skipChunkRebuild, true)
assert.deepEqual(inactivePatch.swipes, ['inactive-with-images', 'active'])

// Deferred registration: enabling before permission must recover without reload,
// remain idempotent, and recover again after revoke/re-grant.
assert.equal(interceptorRegistrations, 0)
interceptorPermission = true
permissionChanged!({ extensionId: 'reverie_relay', permission: 'interceptor', granted: true, allGranted: ['interceptor'] })
assert.equal(interceptorRegistrations, 1)
permissionChanged!({ extensionId: 'reverie_relay', permission: 'interceptor', granted: true, allGranted: ['interceptor'] })
assert.equal(interceptorRegistrations, 1)

const assembledText = (result: any) => (Array.isArray(result) ? result : result.messages).map((message: any) => String(message.content || '')).join('\n')
const expectedNarrativeUtility = buildNarrativeUtilityPrompt()
const expectedSurfaceIds = completeSurfaceSpecs(SHIPPED_SURFACE_SPECS).map(surface => surface.id).sort()
const assertUtilitiesInjected = (text: string, stage: string) => {
  const surfaceWrapper = text.match(/<reverie_surface_utility\b[^>]*\bmodules="([^"]*)"[\s\S]*?<\/reverie_surface_utility>/i)
  assert(surfaceWrapper, `${stage}: enabled Surface Utility wrapper was not injected`)
  assert.deepEqual(
    surfaceWrapper[1].split(',').filter(Boolean).sort(),
    expectedSurfaceIds,
    `${stage}: the injected Surface Utility inventory is incomplete`,
  )
  assert.equal(expectedSurfaceIds.length, 46, `${stage}: expected all 46 built-in Surface Utilities`)
  assert(text.includes(expectedNarrativeUtility.content), `${stage}: the complete enabled Narrative Utility payload was not injected`)
  assert.equal(expectedNarrativeUtility.utilityNames.length, 13, `${stage}: expected all 13 default Narrative Utilities`)
}
await backend.setConfig({ narrativeDlcEnabled: true, narrativeDlcUtilityNames: expectedNarrativeUtility.utilityNames }, 'u1')
const baseMessages = [{ role: 'user', content: 'Continue the scene.' }]
const modelPlaced = assembledText(await interceptor!(baseMessages, { chatId: 'dry-run', userId: 'u1', isDryRun: true }))
assert(modelPlaced.includes('[REVERIE RELAY — MODEL-PLACED ILLUSTRATION PROTOCOL]'))
assert(modelPlaced.includes('<visual_prompt>'))
assert(modelPlaced.includes('<mode>model-placed</mode>'))
assert(modelPlaced.includes('Exclude every media request required inside an invoked Surface or Narrative Utility from this count'), 'Illustrator count must not conflict with self-contained Narrative/Surface media requirements')
assertUtilitiesInjected(modelPlaced, 'initial permission grant')

await backend.setConfig({ proseIllustratorSettings: { ...backend.defaultProseIllustratorSettings(), mode: 'inline-protocol' } }, 'u1')
const inline = assembledText(await interceptor!(baseMessages, { chatId: 'inline-dry-run', userId: 'u1', isDryRun: true }))
assert(inline.includes('REVERIE RELAY — INLINE PROTOCOL'))
assert(inline.includes('<visual_prompt>'))
assert(inline.includes('<mode>inline-protocol</mode>'))
assert(inline.includes('Count only Scene Snapshot-style Inline &lt;reverie-illustration&gt; requests owned by the Illustrator protocol'))
assert.notEqual(inline, modelPlaced)
const inlineWorkflow = inline.slice(inline.indexOf('REVERIE RELAY — INLINE PROTOCOL'), inline.indexOf('<reverie_illustrator_runtime>'))
assert(!/<reverie-illustration[\s\S]*?<scene_brief>/i.test(inlineWorkflow))

const hydratedHistory = `Story prose remains.\n<!-- reverie-relay:image requestId="history-one" -->\n![reverie-relay](/api/v1/image-gen/results/history-one)\n<hook_media><img class="reverie-artifact-media" data-reverie-artifact-media="true" data-dgir-image-id="history-one" src="/api/v1/image-gen/results/history-one"></hook_media>`
const sanitizedInterception = assembledText(await interceptor!([
  { role: 'assistant', content: hydratedHistory },
  { role: 'user', content: 'Continue the scene.' },
], { chatId: 'history-firebreak-dry-run', userId: 'u1', isDryRun: true }))
assert(sanitizedInterception.includes('Story prose remains.'))
assert(!sanitizedInterception.includes('[historical Relay illustration omitted]') && !/data-dgir-|reverie-relay:image/i.test(sanitizedInterception), 'prompt interceptor must silently remove historical Relay media without exposing a readable sentinel')
assert(!/reverie-relay:image|!\[reverie-relay\]|\/api\/v1\/image-gen\/results\/history-one|data-dgir-|reverie-artifact-media/i.test(sanitizedInterception))
assert(!/<hook_media>\s*<\/hook_media>/i.test(sanitizedInterception))

const duplicatedCompiledPrompt = assembledText(await interceptor!([
  { role: 'system', content: inline },
  { role: 'system', content: inline },
  { role: 'user', content: 'Continue once.' },
], { chatId: 'duplicate-contract-dry-run', userId: 'u1', isDryRun: true }))
assert.equal((duplicatedCompiledPrompt.match(/<reverie_surface_utility\b/gi) || []).length, 1)
assert.equal((duplicatedCompiledPrompt.match(/\[reverie_narrative_utility\]/gi) || []).length, 1)
assert.equal((duplicatedCompiledPrompt.match(/INLINE PROTOCOL/gi) || []).length, 1)

// Lumiverse can repeat hydrated historical output in system context. Runtime
// ownership and result transport must be removed regardless of role, while the
// current authoring request contract remains model-visible.
const currentAuthoringContract = '<reverie-illustration request="generate" slot="current-example" aspect="4:3" cast="char" alt="Current example"><visual_prompt>Current scene.</visual_prompt></reverie-illustration>'
const hydratedRuntime = '<!-- reverie-relay:image chatId="old-chat" messageId="old-message" swipeId="0" requestId="old-request" slot="old-slot" -->\n![reverie-relay](/api/v1/image-gen/results/old-image)\n<img src="/api/v1/image-gen/results/old-image" data-dgir-key="old-chat:old-message:0:old-request:old-slot" data-dgir-request-id="old-request" data-dgir-image-id="old-image">'
const contaminatedSystem = assembledText(await interceptor!([
  { role: 'system', content: `Keep this authoring contract:\n${currentAuthoringContract}\nRemove this resolved history:\n${hydratedRuntime}` },
  { role: 'assistant', content: `Historical request:\n${currentAuthoringContract}\n${hydratedRuntime}` },
], { chatId: 'system-history-firebreak', userId: 'u1', isDryRun: true }))
assert(contaminatedSystem.includes(currentAuthoringContract), 'system-context sanitation must preserve the current authoring request contract')
assert.equal(contaminatedSystem.split(currentAuthoringContract).length - 1, 1, 'historical assistant requests must still be removed')
assert(!/reverie-relay:image|!\[reverie-relay\]|\/api\/v1\/(?:images|image-gen\/results)\/old-image|data-dgir-/i.test(contaminatedSystem), 'resolved Relay runtime artifacts must be removed from every model-facing role')

interceptorPermission = false
permissionChanged!({ extensionId: 'reverie_relay', permission: 'interceptor', granted: false, allGranted: [] })
assert.equal(interceptorDisposals, 1)
interceptorPermission = true
permissionChanged!({ extensionId: 'reverie_relay', permission: 'interceptor', granted: true, allGranted: ['interceptor'] })
assert.equal(interceptorRegistrations, 2)
const regranted = assembledText(await interceptor!(baseMessages, { chatId: 'regrant-dry-run', userId: 'u1', isDryRun: true }))
assertUtilitiesInjected(regranted, 'permission re-grant')
const regrantedSanitized = assembledText(await interceptor!([
  { role: 'assistant', content: hydratedHistory },
  { role: 'user', content: 'Continue after permission re-grant.' },
], { chatId: 'regrant-history-dry-run', userId: 'u1', isDryRun: true }))
assert(regrantedSanitized.includes('Story prose remains.'))
assert(!/reverie-relay:image|data-dgir-|\/api\/v1\/image-gen\/results\/history-one/i.test(regrantedSanitized))

const fullDryRunReport = backend.buildFullCompleteDryRunReport({
  chatId: 'dry-run', illustratorPrompt: '', runtimeDirective: '', adultFidelity: '', surfaceProtocol: '',
  surfaceUtility: { content: '<reverie_surface_utility/>', moduleIds: expectedSurfaceIds },
  narrativeUtility: expectedNarrativeUtility, narrativeInjectionEnabled: true,
  settings: backend.defaultProseIllustratorSettings(),
})
assert.deepEqual(fullDryRunReport.sections.narrativeUtilities, {
  injectionEnabled: true,
  enabledUtilityNames: expectedNarrativeUtility.utilityNames,
  enabledUtilities: expectedNarrativeUtility.content,
})

const plan = { provider: 'provider' }
const context = (generationId: string) => ({ generationId, source: 'relay-slot', slotKey: generationId, requestId: generationId })

// Provider result IDs are not proof of freshness. Relay must recognize both a
// previously claimed ID and an ImageTable row older than the current RPC.
assert.equal(backend.inspectProviderImageFreshness({ imageId: 'old', providerStartedAt: 1_700_000_050_000, assetCreatedAt: 1_700_000_040_000 }).stale, true)
assert.equal(backend.inspectProviderImageFreshness({ imageId: 'claimed', providerStartedAt: 1_700_000_050_000, assetCreatedAt: 1_700_000_050_000, existingRelayClaim: 'slot prior' }).stale, true)
assert.equal(backend.inspectProviderImageFreshness({ imageId: 'fresh', providerStartedAt: 1_700_000_050_000, assetCreatedAt: 1_700_000_049_000 }).stale, false)
assert.equal(backend.inspectProviderImageFreshness({ imageId: 'seconds', providerStartedAt: 1_700_000_010_000, assetCreatedAt: 1_700_000_009 }).stale, false)
assert.equal(backend.claimProviderImageResult('race-id', 'generation-one', 'u1'), '')
assert.match(backend.claimProviderImageResult('race-id', 'generation-two', 'u1'), /generation-one/)
assert.equal(backend.claimProviderImageResult('race-id', 'generation-one', 'u2'), '', 'runtime result claims must remain user-scoped')

// Standard payload is clone-safe and omits signal entirely.
let standardInputs: any[] = []
imageApi.getProviders = async () => [{ id: 'provider', name: 'Any Provider', capabilities: { parameters: {}, apiKeyRequired: false, modelListStyle: 'static', defaultUrl: '' } }]
imageApi.generateStream = async function* () { throw new Error('must not stream') }
imageApi.generate = async (input: any) => { standardInputs.push(input); structuredClone(input); return { imageId: 'standard', imageUrl: '/standard' } }
await backend.generateWithOptionalStream({ prompt: 'clone-safe', parameters: {} }, plan, 'u1', context('standard'))
assert.equal(standardInputs.length, 1)
assert.equal('signal' in standardInputs[0], false)

// Non-abort stream rejection falls back exactly once with the same clone-safe payload.
let streamCalls = 0
standardInputs = []
imageApi.getProviders = async () => [{ id: 'provider', capabilities: { websocketPreviewStreaming: { previews: true, status: true } } }]
imageApi.generateStream = async function* () { streamCalls += 1; throw new Error('preview transport unavailable') }
imageApi.generate = async (input: any) => { standardInputs.push(input); structuredClone(input); return { imageId: 'fallback', imageUrl: '/fallback' } }
const fallback = await backend.generateWithOptionalStream({ prompt: 'fallback' }, plan, 'u1', context('fallback'))
assert.equal(fallback.imageId, 'fallback')
assert.equal(streamCalls, 1)
assert.equal(standardInputs.length, 1)
assert.equal('signal' in standardInputs[0], false)

// A terminal stream result is final and must not double-generate.
streamCalls = 0
standardInputs = []
imageApi.generateStream = async function* () { streamCalls += 1; yield { type: 'done', result: { imageId: 'stream-final', imageUrl: '/stream-final' } } }
imageApi.generate = async (input: any) => { standardInputs.push(input); return { imageId: 'duplicate' } }
const streamed = await backend.generateWithOptionalStream({ prompt: 'stream' }, plan, 'u1', context('stream-final'))
assert.equal(streamed.imageId, 'stream-final')
assert.equal(streamCalls, 1)
assert.equal(standardInputs.length, 0)

// A stale terminal stream completion gets one request/response retry. The
// forced-standard path must not open a second stream.
streamCalls = 0
standardInputs = []
imageApi.generateStream = async function* () { streamCalls += 1; yield { type: 'done', result: { imageId: 'stale-stream', imageUrl: '/stale-stream' } } }
imageApi.generate = async (input: any) => { standardInputs.push(input); return { imageId: 'fresh-standard', imageUrl: '/fresh-standard' } }
const forcedStandard = await backend.generateWithOptionalStream({ prompt: 'freshness retry' }, plan, 'u1', context('freshness-retry'), true)
assert.equal(forcedStandard.imageId, 'fresh-standard')
assert.equal(streamCalls, 0)
assert.equal(standardInputs.length, 1)

// Intentional stream abort must reject locally and never enter fallback.
standardInputs = []
let streamAbortStarted = false
imageApi.generateStream = async function* (input: any) {
  streamAbortStarted = true
  await new Promise((_, reject) => input.signal.addEventListener('abort', () => reject(Object.assign(new Error('cancelled'), { name: 'AbortError' })), { once: true }))
}
imageApi.generate = async (input: any) => { standardInputs.push(input); return { imageId: 'wrong' } }
const aborted = backend.generateWithOptionalStream({ prompt: 'abort' }, plan, 'u1', context('abort-stream'))
while (!streamAbortStarted) await Promise.resolve()
backend.abortImageStream('abort-stream')
await assert.rejects(aborted, (error: any) => error?.name === 'AbortError')
assert.equal(standardInputs.length, 0)

// Standard host work cannot be cancelled over IPC, but Relay still rejects the
// result locally after Abort All/slot cancellation and never serialized signal.
let resolveStandard: ((value: any) => void) | undefined
let capturedStandard: any
imageApi.getProviders = async () => [{ id: 'provider', capabilities: {} }]
imageApi.generate = (input: any) => { capturedStandard = input; return new Promise(resolve => { resolveStandard = resolve }) }
const cancelledStandard = backend.generateWithOptionalStream({ prompt: 'cancel-standard' }, plan, 'u1', context('cancel-standard'))
while (!resolveStandard) await Promise.resolve()
backend.abortImageStream('cancel-standard')
resolveStandard!({ imageId: 'late-result', imageUrl: '/late-result' })
await assert.rejects(cancelledStandard, (error: any) => error?.name === 'AbortError')
assert.equal('signal' in capturedStandard, false)
structuredClone(capturedStandard)

// A provider promise or stream iterator that never settles must fail the slot,
// release the shared generation lane, and allow a later retry to start.
imageApi.getProviders = async () => [{ id: 'provider', capabilities: {} }]
imageApi.generate = async () => new Promise(() => {})
await assert.rejects(
  backend.generateWithOptionalStream({ prompt: 'hung-standard' }, plan, 'u1', context('hung-standard'), false, 20),
  (error: any) => error?.name === 'ImageGenerationTimeoutError' && /Retry the slot/.test(error.message),
)
imageApi.generate = async () => ({ imageId: 'after-standard-timeout', imageUrl: '/after-standard-timeout' })
const afterStandardTimeout = await backend.generateWithOptionalStream({ prompt: 'retry-standard' }, plan, 'u1', context('retry-standard'), false, 100)
assert.equal(afterStandardTimeout.imageId, 'after-standard-timeout', 'standard timeout did not release the generation lane')

imageApi.getProviders = async () => [{ id: 'provider', capabilities: { websocketPreviewStreaming: { previews: true, status: true } } }]
imageApi.generateStream = async function* () { await new Promise(() => {}); yield { type: 'done', result: { imageId: 'impossible' } } }
await assert.rejects(
  backend.generateWithOptionalStream({ prompt: 'hung-stream' }, plan, 'u1', context('hung-stream'), false, 20),
  (error: any) => error?.name === 'ImageGenerationTimeoutError',
)
imageApi.generate = async () => ({ imageId: 'after-stream-timeout', imageUrl: '/after-stream-timeout' })
const afterStreamTimeout = await backend.generateWithOptionalStream({ prompt: 'retry-stream' }, plan, 'u1', context('retry-stream'), true, 100)
assert.equal(afterStreamTimeout.imageId, 'after-stream-timeout', 'stream timeout did not release the generation lane')
assert(frontendEvents.some(event => event?.event === 'error' && event?.statusText === 'Generation timed out.'), 'timeout did not publish a terminal error event')

// Abort All cancellation walks a key snapshot even though each cancellation
// deletes/reinserts the same key in bounded-map insertion order.
const serials = new Map([['one', 1], ['two', 1]])
const cancelledKeys: string[] = []
const count = cancelMapKeysFromSnapshot(serials, key => {
  cancelledKeys.push(key)
  rememberBoundedMap(serials, key, (serials.get(key) || 0) + 1, 2)
  if (cancelledKeys.length > 4) throw new Error('runaway live Map iteration')
})
assert.equal(count, 2)
assert.deepEqual(cancelledKeys.sort(), ['one', 'two'])
assert.equal(serials.size, 2)
assert.equal(cancelMapKeysFromSnapshot(new Map(), () => { throw new Error('empty map callback') }), 0)

// Prompt mutation is deadline-critical. Persisting Relay diagnostics may be
// slow for large chat state files, but Lumiverse must receive the modified
// messages before those writes complete or it discards the whole interception.
blockStateWrites = true
const promptTimeout = Symbol('prompt-timeout')
const slowStorageResult = await Promise.race([
  interceptor!(baseMessages, { chatId: 'slow-storage-dry-run', userId: 'u1', isDryRun: true }),
  new Promise<typeof promptTimeout>(resolve => setTimeout(() => resolve(promptTimeout), 250)),
])
assert.notEqual(slowStorageResult, promptTimeout, 'prompt interception awaited diagnostic state persistence')
assertUtilitiesInjected(assembledText(slowStorageResult), 'slow diagnostic storage')
await new Promise(resolve => setTimeout(resolve, 10))
assert(blockedStateWriteAttempts >= 1, 'prompt diagnostics were not scheduled after returning the injection')

console.log('Runtime contract smoke passed: continued-response request recovery, complete Surface/Narrative Utility injection and Full Dry Run reporting, non-blocking prompt diagnostics, clone-safe standard ImageGen, stale-result freshness rejection, opt-in streaming, bounded provider timeout/fallback/abort, snapshot Abort All, and deferred interceptor recovery.')
