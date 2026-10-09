// @ts-nocheck -- host-contract harness deliberately supplies a narrow Spindle mock.
import { strict as assert } from 'node:assert'
import { cancelMapKeysFromSnapshot, rememberBoundedMap } from '../src/c5bReliability'
import { buildNarrativeUtilityPrompt } from '../src/narrativeDlcRuntime'
import { SHIPPED_SURFACE_SPECS } from '../src/shippedSurfaceDefinitions'
import { completeSurfaceSpecs } from '../src/surfaceXml'
import { PLOT_SPARK_VECTOR_BY_KEY } from '../src/contracts'
import { recentPlotSparksReference } from '../src/plotSparksUtility'

let interceptorPermission = false
let permissionChanged: ((detail: any) => void) | undefined
let interceptor: ((messages: any[], context: any) => Promise<any>) | undefined
let interceptorRegistrations = 0
let interceptorDisposals = 0
const frontendEvents: any[] = []
let frontendMessageHandler: ((payload: any, userId?: string) => void) | undefined
let chatMessageReads = 0
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
  onFrontendMessage(handler: (payload: any, userId?: string) => void) { frontendMessageHandler = handler },
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
  chat: { async getMessages() { chatMessageReads += 1; return [] } },
  chats: { async get(chatId: string) { return { id: chatId } } },
  characters: { async get() { return null } },
  personas: { async getActive() { return null } },
  world_books: { async getActivated() { return [] }, entries: { async get() { return null } } },
  imageGen: imageApi,
  variables: { global: { async set() {} }, chat: { async set() {} } },
  log: { info() {}, warn() {}, error() {} },
}

const backend = await import('../src/backend')

const novelPlan = {
  provider: 'novelai', model: 'nai-diffusion-5-full', connection: null,
  finalParameters: { resolution: '1216x832', guidance: 6, negativePrompt: 'bad anatomy' },
  slotOverrides: { aspectRatio: '2:3' }, nativeActiveParameters: {}, settingsSource: 'current-native',
} as any
const novelPrepared = { prompt: 'one person in a studio', negativePrompt: 'watermark' } as any
const novelParameters = backend.buildImageParameters(novelPlan, novelPrepared)
assert.deepEqual(backend.buildSlotOverrides({ aspect: '2:3' }, 'novelai', 'native'), {}, 'default NovelAI policy keeps saved resolution')
assert.deepEqual(backend.buildSlotOverrides({ aspect: '2:3' }, 'novelai', 'request'), { aspectRatio: '2:3' }, 'NovelAI can follow the request aspect')
assert.deepEqual(backend.buildSlotOverrides({ aspect: '2:3' }, 'novelai', '1:1'), { aspectRatio: '1:1' }, 'NovelAI can use a fixed aspect')
assert.deepEqual(backend.buildSlotOverrides({ aspect: '16:9' }, 'swarmui', 'native'), { aspectRatio: '16:9', width: 1280, height: 720 }, 'existing providers retain request aspect behavior')
assert.equal(novelParameters.resolution, '1024x1536', 'NovelAI receives a supported resolution for the requested aspect')
assert.equal(novelParameters.negativePrompt, 'watermark, bad anatomy', 'NovelAI receives Relay and saved negative tags')
assert.equal(novelPlan.finalParameters.resolution, '1216x832', 'provider defaults remain immutable')
assert.equal(backend.buildImageParameters({ ...novelPlan, slotOverrides: {} }, novelPrepared).resolution, '1216x832', 'no request aspect preserves native resolution')
assert.equal(backend.buildImageParameters({ ...novelPlan, slotOverrides: { aspectRatio: '2:3', resolution: '1024x1024' }, finalParameters: { ...novelPlan.finalParameters, resolution: '1024x1024' } }, novelPrepared).resolution, '1024x1024', 'explicit recipe resolution outranks the request aspect')
assert.equal(backend.buildImageParameters({ ...novelPlan, slotOverrides: { aspectRatio: '2:3', width: 1536, height: 1024 } }, novelPrepared).resolution, '1536x1024', 'explicit recipe dimensions outrank the request aspect')
assert.equal(backend.requiresWorkflow({ provider: 'novelai', connectionName: 'Comfy-themed preset' } as any), false, 'a NovelAI connection name cannot impose a ComfyUI workflow')
assert.equal(backend.requiresWorkflow({ provider: 'comfyui' } as any), true, 'ComfyUI still requires a workflow')
assert.equal(backend.requiresWorkflow({ provider: 'comfyui-custom' } as any), true, 'other Comfy provider IDs retain workflow behavior')
assert.equal(backend.requiresWorkflow({ provider: 'custom', connection: { metadata: { comfyui: { requires_workflow: true } } } } as any), true, 'custom-provider workflow metadata retains its existing contract')
assert.equal(backend.buildImageParameters({ ...novelPlan, provider: 'swarmui', finalParameters: { seed: 42 } }, novelPrepared, true).seed, -1, 'Swarm regeneration seed behavior must survive provider adaptation')

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

// Automatic chat-open rescans must be rejected at the backend boundary after
// the persisted preference is disabled, even if a stale frontend already sent
// an automatic request. The completion reply also releases the UI busy state.
const autoRescanOffUser = 'auto-rescan-disabled-user'
await backend.setConfig({ autoRescanOnChatOpen: false }, autoRescanOffUser)
assert.equal((await backend.getConfig(autoRescanOffUser)).autoRescanOnChatOpen, false)
const chatMessageReadsBeforeDisabledRescan = chatMessageReads
const disabledRescanRepliesBefore = frontendEvents.filter(event => event?.type === 'rescan_result' && event?.automatic === true).length
assert(frontendMessageHandler, 'backend must register its frontend message handler')
frontendMessageHandler({ type: 'rescan_chat', chatId: 'auto-rescan-disabled-chat', automatic: true }, autoRescanOffUser)
await new Promise(resolve => setTimeout(resolve, 0))
assert.equal(chatMessageReads, chatMessageReadsBeforeDisabledRescan, 'disabled automatic chat-open rescan must not read or scan chat history')
assert.equal(frontendEvents.filter(event => event?.type === 'rescan_result' && event?.automatic === true).length, disabledRescanRepliesBefore + 1, 'suppressed automatic rescan must send a quiet completion reply')
frontendMessageHandler({ type: 'scan_message', chatId: 'auto-rescan-disabled-chat', messageId: 'replayed-message', automatic: true }, autoRescanOffUser)
await new Promise(resolve => setTimeout(resolve, 0))
assert.equal(chatMessageReads, chatMessageReadsBeforeDisabledRescan, 'disabled automatic rendered-message replay scan must also be suppressed')

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
assert.equal(backend.isChatOpenReplayScan(['message-sent']), true, 'a replayed historical MESSAGE_SENT is a chat-open rescan')
assert.equal(backend.isChatOpenReplayScan(['message-sent', 'authoritative-message-retry']), true, 'retries must retain chat-open replay ownership')
assert.equal(backend.isChatOpenReplayScan(['message-sent', 'generation-ended']), false, 'fresh generation processing must remain enabled when auto-rescan is off')
assert.equal(backend.isChatOpenReplayScan(['message-edited']), false, 'message edits must remain independent from chat-open rescans')
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
const protectedRelayControlTags = new Set([
  'image_request', 'scene_brief', 'reverie-illustration', 'visual_prompt',
  'context_caption', 'negative', 'negative_prompt',
])
const structuralXmlTags = (value: string) => [...value.matchAll(/<\/?([A-Za-z][A-Za-z0-9_-]*)\b[^>]*>/g)]
  .filter(match => !protectedRelayControlTags.has(match[1].toLowerCase()))
const bracketImageControlTags = (value: string) => value.match(/\[\/?(?:image_request|scene_brief|reverie-illustration|visual_prompt)\b/gi) || []
// Widget mode retires only new inline Phone authoring; saved phone XML still renders.
const expectedNarrativeUtility = buildNarrativeUtilityPrompt(buildNarrativeUtilityPrompt().utilityNames.filter(name => name !== 'Character Phone'))
const worldUtilityWithOverride = buildNarrativeUtilityPrompt(['Setting the Scene'], { 'Setting the Scene': 'CUSTOM WORLD CONTRACT' }).content
assert(worldUtilityWithOverride.includes('CUSTOM WORLD CONTRACT'))
assert(worldUtilityWithOverride.includes('SETTING THE SCENE STRUCTURAL LOCK'))
assert(worldUtilityWithOverride.includes("<why_it_matters>...</why_it_matters>"))
assert(worldUtilityWithOverride.includes("<future_use>...</future_use>"))
assert(worldUtilityWithOverride.includes("Never use </future_use> to close <why_it_matters>"))
assert(!/\[\/?(?:image_request|scene_brief)\b/i.test(worldUtilityWithOverride), 'World prompt lock converted canonical Relay XML image controls to brackets')
const expectedSurfaceIds = completeSurfaceSpecs(SHIPPED_SURFACE_SPECS).map(surface => surface.id)
  .filter(id => id !== 'relationship-map' && id !== 'character-profile').sort()
const assertUtilitiesInjected = (text: string, stage: string) => {
  const surfaceWrapper = text.match(/<reverie_surface_utility\b[^>]*\bmodules="([^"]*)"[\s\S]*?<\/reverie_surface_utility>/i)
  assert(surfaceWrapper, `${stage}: enabled Surface Utility wrapper was not injected`)
  assert.deepEqual(
    surfaceWrapper[1].split(',').filter(Boolean).sort(),
    expectedSurfaceIds,
    `${stage}: the injected Surface Utility inventory is incomplete`,
  )
  assert.equal(expectedSurfaceIds.length, 45, `${stage}: expected 45 Core authoring modules after the Narrative move`)
  assert(text.includes(expectedNarrativeUtility.content), `${stage}: the complete enabled Narrative Utility payload was not injected`)
  assert.equal(expectedNarrativeUtility.utilityNames.length, 15, `${stage}: expected 15 inline Utilities with Character Phone hosted in the widget`)
}
await backend.setConfig({ narrativeDlcEnabled: true, narrativeDlcUtilityNames: expectedNarrativeUtility.utilityNames }, 'u1')
const baseMessages = [{ role: 'user', content: 'Continue the scene.' }]
const modelPlanned = assembledText(await interceptor!(baseMessages, { chatId: 'dry-run', userId: 'u1', isDryRun: true }))
assert(!/\bChaos Hooks\b/i.test(modelPlanned), 'final Story Model prompt must not mention the retired Chaos Hooks label')
assert(modelPlanned.includes('REVERIE RELAY — MODEL PLANNED ILLUSTRATIONS'))
assert(modelPlanned.includes("<visual_prompt>"))
assert(modelPlanned.includes('Each request is a standalone image prompt'), 'Model Planned must make every image request self-contained')
assert(modelPlanned.includes('Repeat these facts independently for every request'), 'Model Planned must repeat supported appearance and current outfit in later requests')
assert(modelPlanned.includes('Keep established left/right anatomy consistent throughout'), 'Model Planned must reject contradictory anatomical sides within an image prompt')
assert(modelPlanned.includes("Before closing each <visual_prompt>, check that every described hand or eye action"), 'Model Planned must verify hand and eye side ownership before closing each request')
assert(modelPlanned.includes('<mode>inline-protocol</mode>'))
assert(modelPlanned.includes('Exclude every media request required inside an invoked Surface or Narrative Utility from this count'), 'Illustrator count must not conflict with self-contained Narrative/Surface media requirements')
assertUtilitiesInjected(modelPlanned, 'initial permission grant')
const assembledCore = modelPlanned.match(/<reverie_surface_utility\b[^>]*>([\s\S]*?)<\/reverie_surface_utility>/i)?.[1] || ''
const assembledNarrative = modelPlanned.match(/<reverie_narrative_utility>([\s\S]*?)<\/reverie_narrative_utility>/i)?.[1] || ''
assert(assembledCore && assembledNarrative, 'final Story Model prompt did not expose both family authoring blocks for boundary audit')
assert(structuralXmlTags(assembledCore).length > 0, 'final Story Model Core authoring lacks structural XML')
assert(structuralXmlTags(assembledNarrative).length > 0, 'final Story Model Narrative authoring lacks structural XML')
assert(assembledCore.includes('<image_request ') && assembledCore.includes('<scene_brief>'), 'final Story Model Core authoring lost canonical XML image controls')
assert(assembledNarrative.includes('<image_request ') && assembledNarrative.includes('<reverie-illustration '), 'final Story Model Narrative authoring lost a canonical XML image-control family')
assert.equal(bracketImageControlTags(modelPlanned).length, 0, 'final Story Model prompt must not teach bracket image controls')
assert.equal((assembledNarrative.match(/<\/?(?:else-media|else-scene|else-context)>/gi) || []).length, 0, 'final Story Model prompt teaches historical hyphenated Off-Stage XML structure')

await backend.setConfig({ proseIllustratorSettings: { ...backend.defaultProseIllustratorSettings(), mode: 'model-placed' } }, 'u1')
const inline = assembledText(await interceptor!(baseMessages, { chatId: 'inline-dry-run', userId: 'u1', isDryRun: true }))
assert(inline.includes('REVERIE RELAY — MODEL PLANNED ILLUSTRATIONS'))
assert(inline.includes("<visual_prompt>"))
assert(inline.includes('<mode>inline-protocol</mode>'))
assert(inline.includes('Count only Inline &lt;reverie-illustration&gt; requests owned by the Illustrator protocol'))
assert(!inline.includes('Scene Snapshot-style Inline'), 'framing-neutral Illustrator count instruction must not claim Scene Snapshot when another framing mode is selected')
const inlineWorkflow = inline.slice(inline.indexOf('REVERIE RELAY — MODEL PLANNED ILLUSTRATIONS'), inline.indexOf('<reverie_illustrator_runtime>'))
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

// The recent-ideas reminder must survive the real interceptor, not just its
// pure helper. Automatic and explicitly placed Utility paths each include it
// once, and historical image requests never enter the reminder.
const previousSparks = `[Plot_Sparks][ID]prior-board[/ID][Lifecycle]Unused.[/Lifecycle]${Object.entries(PLOT_SPARK_VECTOR_BY_KEY).map(([key, vector]) => `[Spark][Key]${key}[/Key][Vector]${vector}[/Vector][Text]Previous playable choice ${key}.[/Text][Media]<reverie-illustration request="generate" slot="past-${key}"><visual_prompt>PRIVATE-OLD-IMAGE-${key}</visual_prompt></reverie-illustration>[/Media][/Spark]`).join('')}[/Plot_Sparks]`
const sparkHistory = [{ role: 'assistant', content: previousSparks }, ...baseMessages]
const expectedRecentIdeas = recentPlotSparksReference(sparkHistory)
assert(expectedRecentIdeas)
for (const [placement, messages] of [
  ['automatic', sparkHistory],
  ['macro', [{ role: 'system', content: '{{reverie_narrative}}' }, ...sparkHistory]],
] as const) {
  const assembled = assembledText(await interceptor!(messages, { chatId: `sparks-${placement}-dry-run`, userId: 'u1', isDryRun: true }))
  assert.equal(assembled.split(expectedRecentIdeas).length - 1, 1, `${placement}: recent ideas were missing or duplicated`)
  assert(!assembled.includes('PRIVATE-OLD-IMAGE-'), `${placement}: old image controls leaked into the compiled prompt`)
  assert(assembled.includes('Previous playable choice j.'), `${placement}: tenth prior idea was dropped`)
}

const duplicatedCompiledPrompt = assembledText(await interceptor!([
  { role: 'system', content: inline },
  { role: 'system', content: inline },
  { role: 'user', content: 'Continue once.' },
], { chatId: 'duplicate-contract-dry-run', userId: 'u1', isDryRun: true }))
assert.equal((duplicatedCompiledPrompt.match(/<reverie_surface_utility\b/gi) || []).length, 1)
assert.equal((duplicatedCompiledPrompt.match(/<reverie_narrative_utility>/gi) || []).length, 1)
assert.equal((duplicatedCompiledPrompt.match(/MODEL PLANNED ILLUSTRATIONS/gi) || []).length, 1)

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

// Once a streaming provider has been invoked, Relay must never spend a second
// provider request merely because the stream contract failed.
let streamCalls = 0
standardInputs = []
imageApi.getProviders = async () => [{ id: 'provider', capabilities: { websocketPreviewStreaming: { previews: true, status: true } } }]
imageApi.generateStream = async function* () { streamCalls += 1; throw new Error('preview transport unavailable') }
imageApi.generate = async (input: any) => { standardInputs.push(input); structuredClone(input); return { imageId: 'fallback', imageUrl: '/fallback' } }
await assert.rejects(backend.generateWithOptionalStream({ prompt: 'fallback' }, plan, 'u1', context('fallback')), /preview transport unavailable/)
assert.equal(streamCalls, 1)
assert.equal(standardInputs.length, 0)
assert.equal((backend.inspectProviderAttemptDiagnostics('fallback') as any).providerFallbackUsed, false)

// A terminal stream result is final and must not double-generate.
streamCalls = 0
standardInputs = []
imageApi.generateStream = async function* () { streamCalls += 1; yield { type: 'done', result: { imageId: 'stream-final', imageUrl: '/stream-final' } } }
imageApi.generate = async (input: any) => { standardInputs.push(input); return { imageId: 'duplicate' } }
const streamed = await backend.generateWithOptionalStream({ prompt: 'stream' }, plan, 'u1', context('stream-final'))
assert.equal(streamed.imageId, 'stream-final')
assert.equal(streamCalls, 1)
assert.equal(standardInputs.length, 0)

// An explicitly selected standard path must not open a stream.
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

// Waiting behind a serialized provider is a distinct bounded state. A queued
// operation may report provider-waiting, but not generating, until it owns the
// lane and is about to invoke the provider.
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
imageApi.getProviders = async () => [{ id: 'provider', capabilities: {} }]
let resolveLaneA: ((value: any) => void) | undefined
let laneBCalls = 0
imageApi.generate = (input: any) => input.prompt === 'lane-a'
  ? new Promise(resolve => { resolveLaneA = resolve })
  : Promise.resolve().then(() => { laneBCalls += 1; return { imageId: 'lane-b', imageUrl: '/lane-b' } })
const laneA = backend.generateWithOptionalStream({ prompt: 'lane-a' }, plan, 'u1', { ...context('lane-a'), chatId: 'chat-a' }, false, 500)
while (!resolveLaneA) await Promise.resolve()
const laneBTransitions: string[] = []
const laneB = backend.generateWithOptionalStream({ prompt: 'lane-b' }, plan, 'u1', {
  ...context('lane-b'), chatId: 'chat-b', laneWaitTimeoutMs: 200,
  onProviderWaiting: () => laneBTransitions.push('provider-waiting'),
  onProviderStarted: () => laneBTransitions.push('generating'),
}, false, 500)
await delay(10)
assert.deepEqual(laneBTransitions, ['provider-waiting'])
assert.equal(laneBCalls, 0)
assert.equal((backend.inspectImageGenerationLaneDiagnostics('u1') as any).waiterCount, 1)
resolveLaneA!({ imageId: 'lane-a', imageUrl: '/lane-a' })
await laneA
assert.equal((await laneB).imageId, 'lane-b')
assert.deepEqual(laneBTransitions, ['provider-waiting', 'generating'])

// Provider-lane waiting has its own timeout and removes the waiter without
// disturbing the active provider operation.
let resolveWaitOwner: ((value: any) => void) | undefined
imageApi.generate = (input: any) => input.prompt === 'wait-owner'
  ? new Promise(resolve => { resolveWaitOwner = resolve })
  : Promise.resolve({ imageId: 'should-not-start', imageUrl: '/should-not-start' })
const waitOwner = backend.generateWithOptionalStream({ prompt: 'wait-owner' }, plan, 'u1', { ...context('wait-owner'), chatId: 'chat-owner' }, false, 500)
while (!resolveWaitOwner) await Promise.resolve()
await assert.rejects(
  backend.generateWithOptionalStream({ prompt: 'wait-timeout' }, plan, 'u1', { ...context('wait-timeout'), chatId: 'chat-waiter', laneWaitTimeoutMs: 20 }, false, 500),
  (error: any) => error?.name === 'ImageGenerationLaneWaitTimeoutError' && /waiting for the image worker/i.test(error.message),
)
assert.equal((backend.inspectImageGenerationLaneDiagnostics('u1') as any).waiterCount, 0)
resolveWaitOwner!({ imageId: 'wait-owner', imageUrl: '/wait-owner' })
await waitOwner

// A local timeout owns the Relay lifecycle boundary, but a host promise which
// ignores abort quarantines the serialized lane until that transport settles.
let resolveHungStandard: ((value: any) => void) | undefined
let postTimeoutCalls = 0
imageApi.generate = (input: any) => input.prompt === 'hung-standard'
  ? new Promise(resolve => { resolveHungStandard = resolve })
  : Promise.resolve().then(() => { postTimeoutCalls += 1; return { imageId: 'after-standard-timeout', imageUrl: '/after-standard-timeout' } })
await assert.rejects(
  backend.generateWithOptionalStream({ prompt: 'hung-standard' }, plan, 'u1', { ...context('hung-standard'), chatId: 'chat-hung' }, false, 20),
  (error: any) => error?.name === 'ImageGenerationTimeoutError' && /Retry the slot/.test(error.message),
)
const afterStandardTimeoutPromise = backend.generateWithOptionalStream({ prompt: 'retry-standard' }, plan, 'u1', { ...context('retry-standard'), chatId: 'chat-retry' }, false, 500)
await delay(10)
assert.equal(postTimeoutCalls, 0, 'a new provider call overlapped the old draining standard transport')
assert.equal((backend.inspectImageGenerationLaneDiagnostics('u1') as any).draining, true)
resolveHungStandard!({ imageId: 'late-standard-result', imageUrl: '/late-standard-result' })
const afterStandardTimeout = await afterStandardTimeoutPromise
assert.equal(afterStandardTimeout.imageId, 'after-standard-timeout')
assert.equal(postTimeoutCalls, 1)
await Promise.resolve()
assert(!frontendEvents.some(event => event?.generationId === 'hung-standard' && event?.event === 'done'), 'late timed-out standard result resurrected completion')

// A chat-only cancellation does not cancel Chat B's waiter, but it also cannot
// start B until Chat A's host transport has actually settled.
let resolveChatA: ((value: any) => void) | undefined
let chatBCalls = 0
imageApi.generate = (input: any) => input.prompt === 'chat-a-active'
  ? new Promise(resolve => { resolveChatA = resolve })
  : Promise.resolve().then(() => { chatBCalls += 1; return { imageId: 'chat-b-result', imageUrl: '/chat-b-result' } })
const chatAActive = backend.generateWithOptionalStream({ prompt: 'chat-a-active' }, plan, 'u1', { ...context('chat-a-active'), chatId: 'chat-a' }, false, 500)
while (!resolveChatA) await Promise.resolve()
const chatBWaiting = backend.generateWithOptionalStream({ prompt: 'chat-b-waiting' }, plan, 'u1', { ...context('chat-b-waiting'), chatId: 'chat-b', laneWaitTimeoutMs: 500 }, false, 500)
await delay(10)
assert.equal(backend.abortImageStreamsForChat('chat-a', 'u1'), 1)
await assert.rejects(chatAActive, (error: any) => error?.name === 'AbortError')
await delay(10)
assert.equal(chatBCalls, 0, 'chat-only cancellation overlapped a draining host transport')
resolveChatA!({ imageId: 'cancelled-chat-a-late', imageUrl: '/cancelled-chat-a-late' })
assert.equal((await chatBWaiting).imageId, 'chat-b-result')
assert.equal(chatBCalls, 1)
await Promise.resolve()

imageApi.getProviders = async () => [{ id: 'provider', capabilities: { websocketPreviewStreaming: { previews: true, status: true } } }]
let releaseHungStream!: () => void
imageApi.generateStream = async function* () { await new Promise<void>(resolve => { releaseHungStream = resolve }); yield { type: 'done', result: { imageId: 'impossible' } } }
await assert.rejects(
  backend.generateWithOptionalStream({ prompt: 'hung-stream' }, plan, 'u1', { ...context('hung-stream'), drainTimeoutMs: 10 }, false, 20),
  (error: any) => error?.name === 'ImageGenerationTimeoutError',
)
await delay(20)
assert.equal((backend.inspectProviderAttemptDiagnostics('hung-stream') as any).providerOperationOrphaned, true)
imageApi.generate = async () => ({ imageId: 'after-stream-timeout', imageUrl: '/after-stream-timeout' })
const afterStreamPromise = backend.generateWithOptionalStream({ prompt: 'retry-stream' }, plan, 'u1', context('retry-stream'), true, 100)
await delay(10)
const afterStreamTimeout = await afterStreamPromise
assert.equal(afterStreamTimeout.imageId, 'after-stream-timeout', 'stream timeout did not release the generation lane')
releaseHungStream()
await Promise.resolve()
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

console.log('Runtime contract smoke passed: final assembled Story Model prompt has XML Core, Narrative and image-control authoring; saved bracket ingress, continued-response recovery, complete Utility injection, Dry Run reporting, clone-safe ImageGen, stale-result rejection, one-spend semantics, abort quarantine, and deferred interceptor recovery remain covered.')
