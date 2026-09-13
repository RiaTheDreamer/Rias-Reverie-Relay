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
    async getJson(path: string, options: any = {}) { return storage.has(path) ? structuredClone(storage.get(path)) : structuredClone(options.fallback || {}) },
    async setJson(path: string, value: any) { storage.set(path, structuredClone(value)) },
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
assertUtilitiesInjected(modelPlaced, 'initial permission grant')

await backend.setConfig({ proseIllustratorSettings: { ...backend.defaultProseIllustratorSettings(), mode: 'inline-protocol' } }, 'u1')
const inline = assembledText(await interceptor!(baseMessages, { chatId: 'inline-dry-run', userId: 'u1', isDryRun: true }))
assert(inline.includes('REVERIE RELAY — INLINE PROTOCOL'))
assert(inline.includes('<visual_prompt>'))
assert(inline.includes('<mode>inline-protocol</mode>'))
assert.notEqual(inline, modelPlaced)
const inlineWorkflow = inline.slice(inline.indexOf('REVERIE RELAY — INLINE PROTOCOL'), inline.indexOf('<reverie_illustrator_runtime>'))
assert(!/<reverie-illustration[\s\S]*?<scene_brief>/i.test(inlineWorkflow))

interceptorPermission = false
permissionChanged!({ extensionId: 'reverie_relay', permission: 'interceptor', granted: false, allGranted: [] })
assert.equal(interceptorDisposals, 1)
interceptorPermission = true
permissionChanged!({ extensionId: 'reverie_relay', permission: 'interceptor', granted: true, allGranted: ['interceptor'] })
assert.equal(interceptorRegistrations, 2)
const regranted = assembledText(await interceptor!(baseMessages, { chatId: 'regrant-dry-run', userId: 'u1', isDryRun: true }))
assertUtilitiesInjected(regranted, 'permission re-grant')

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

console.log('Runtime contract smoke passed: complete Surface/Narrative Utility injection and Full Dry Run reporting, clone-safe standard ImageGen, opt-in streaming, bounded fallback/abort, snapshot Abort All, and deferred interceptor recovery.')
