// @ts-nocheck -- host-contract harness deliberately supplies a narrow Spindle mock.
import { strict as assert } from 'node:assert'
import { buildNarrativeUtilityPrompt } from '../src/narrativeDlcRuntime'

let interceptor: ((messages: any[], context: any) => Promise<any>) | undefined
let frontendHandler: ((payload: any, userId?: string) => void) | undefined
const frontendEvents: any[] = []
const storage = new Map<string, any>()

;(globalThis as any).spindle = {
  registerMessageContentProcessor() {},
  registerInterceptor(handler: any) { interceptor = handler; return () => {} },
  registerMacro() {},
  on() {},
  onFrontendMessage(handler: any) { frontendHandler = handler },
  sendToFrontend(payload: any) { frontendEvents.push(payload) },
  permissions: { has() { return true }, onChanged() { return () => {} } },
  userStorage: {
    async getJson(path: string, options: any = {}) { return structuredClone(storage.get(path) ?? options.fallback ?? {}) },
    async setJson(path: string, value: any) { storage.set(path, structuredClone(value)) },
    async mkdir() {},
  },
  chat: { async getMessages() { return [] } },
  chats: { async get(chatId: string) { return { id: chatId } } },
  characters: { async get() { return null } },
  personas: { async getActive() { return null } },
  world_books: { async getActivated() { return [] }, entries: { async get() { return null } } },
  imageGen: {},
  variables: { global: { async set() {} }, chat: { async set() {} } },
  log: { info() {}, warn() {}, error() {} },
}

const backend = await import('../src/backend')
assert(interceptor, 'Story Model interceptor did not register')
assert(frontendHandler, 'Prompt Preview handler did not register')

const userId = 'narrative-authority-user'
const names = ['Scene Shift', 'Dramatic Cutaway', 'Parallel Scene']
const [A, B, C] = names
const ownedWrapper = /<reverie_narrative_utility>\s*<contract>narrative<\/contract>\s*<version>[^<]*<\/version>\s*<utilities>[\s\S]*?<\/utilities>[\s\S]*?<\/reverie_narrative_utility>/gi
const wrapperCount = (text: string) => (text.match(ownedWrapper) || []).length
const wrapper = (text: string) => text.match(ownedWrapper)?.[0] || ''
const textOf = (result: any) => (Array.isArray(result) ? result : result.messages).map((message: any) => String(message.content || '')).join('\n')
const messagesOf = (result: any) => Array.isArray(result) ? result : result.messages
const desired = (selected: string[], overrides: Record<string, string> = {}) => buildNarrativeUtilityPrompt(selected, overrides).content

async function configure(selected: string[], overrides: Record<string, string> = {}) {
  await backend.setConfig({
    narrativeDlcEnabled: selected.length > 0,
    narrativeDlcUtilityNames: selected,
    characterPhonePresentation: 'surface', // legacy config must migrate to the widget
    narrativeUtilityOverrides: Object.fromEntries(Object.entries(overrides).map(([name, content]) => [name, { content, revision: 1, updatedAt: 1 }])),
  }, userId)
}

async function intercept(messages: any[], chatId: string) {
  return interceptor!(messages, { chatId, userId, isDryRun: true })
}

async function preview(chatId: string) {
  frontendEvents.length = 0
  frontendHandler!({ type: 'surface_prompt_preview', requestId: chatId, chatId }, userId)
  for (let tick = 0; tick < 4 && frontendEvents.length === 0; tick += 1) await new Promise(resolve => setTimeout(resolve, 0))
  const event = frontendEvents.find(event => event.type === 'surface_prompt_preview' && event.requestId === chatId)
  assert(event, 'Prompt Preview did not reply')
  return event
}

function assertExactlyCurrent(text: string, expected: string, stage: string) {
  assert.equal(wrapperCount(text), expected ? 1 : 0, `${stage}: unexpected owned Narrative wrapper count`)
  if (expected) assert.equal(wrapper(text), expected, `${stage}: wrapper does not equal current resolved configuration`)
}

// A. An old macro-expanded A+B wrapper must refresh in place to current B.
const oldAB = desired([A, B])
await configure([B])
const placed = await intercept([
  { role: 'system', content: `before-macro\n${oldAB}\nafter-macro` },
  { role: 'user', content: 'Latest user turn.' },
], 'stale-placement')
const placedMessages = messagesOf(placed)
assert.equal(placedMessages[0].content.indexOf(desired([B])) > placedMessages[0].content.indexOf('before-macro'), true, 'A: refreshed wrapper moved before its placed location')
assert.equal(placedMessages[0].content.indexOf(desired([B])) < placedMessages[0].content.indexOf('after-macro'), true, 'A: refreshed wrapper moved after its placed location')
assertExactlyCurrent(textOf(placed), desired([B]), 'A')
assert(!wrapper(textOf(placed)).match(/<utilities>(.*?)<\/utilities>/)?.[1].split(', ').includes(A), 'A: disabled Utility survived in the enabled selection')
assert(!wrapper(textOf(placed)).includes('<SCENE location='), 'A: disabled Utility schema survived the replacement')

// B. Clearing all selections removes an old owned wrapper; nothing is injected.
await configure([])
const disabled = await intercept([{ role: 'system', content: oldAB }, { role: 'user', content: 'Continue.' }], 'disable-all')
assertExactlyCurrent(textOf(disabled), '', 'B')

// C. Previously expanded state never wins an ON -> OFF -> ON -> OFF -> ON cycle.
let previous = oldAB
for (const [index, selected] of [[B], [], [B], [], [B]].entries()) {
  await configure(selected as string[])
  const result = await intercept([{ role: 'system', content: previous }, { role: 'user', content: `Toggle ${index}` }], `toggle-${index}`)
  const text = textOf(result)
  const current = desired(selected as string[])
  assertExactlyCurrent(text, current, `C-${index}`)
  previous = current || 'Previously removed Relay state.'
}

// D. Independently disabling A and then B cannot disturb C.
await configure([A, B, C])
const oldABC = desired([A, B, C])
await configure([B, C])
const withoutA = textOf(await intercept([{ role: 'system', content: oldABC }], 'multiple-a'))
assertExactlyCurrent(withoutA, desired([B, C]), 'D-A')
await configure([C])
const withoutB = textOf(await intercept([{ role: 'system', content: wrapper(withoutA) }], 'multiple-b'))
assertExactlyCurrent(withoutB, desired([C]), 'D-B')

// E. An override update replaces the old authored content rather than retaining it.
const oldOverride = 'OLD CHARACTER PHONE AUTHORITY TOKEN'
const newOverride = 'NEW CHARACTER PHONE AUTHORITY TOKEN'
await configure([A], { [A]: oldOverride })
const staleOverride = desired([A], { [A]: oldOverride })
await configure([A], { [A]: newOverride })
const updatedOverride = textOf(await intercept([{ role: 'system', content: staleOverride }], 'override'))
assertExactlyCurrent(updatedOverride, desired([A], { [A]: newOverride }), 'E')
assert(!updatedOverride.includes(oldOverride) && updatedOverride.includes(newOverride), 'E: old override survived or new override was absent')

// F. A non-schema lookalike belongs to the user and must survive unchanged.
await configure([B])
const lookalike = '[reverie_narrative_utility] Narrative Plot Sparks Character Phone reverie Utility prose, not a Relay contract. [/reverie_narrative_utility]'
const withLookalike = textOf(await intercept([{ role: 'user', content: lookalike }], 'lookalike'))
assert(withLookalike.includes(lookalike), 'F: user-authored Narrative lookalike was stripped')
assertExactlyCurrent(withLookalike, desired([B]), 'F')

// G. The preview and interceptor derive the same selected Narrative set even with stale input.
const previewResult = await preview('preview-parity')
const previewNames = previewResult.narrativeUtilityNames
const parity = textOf(await intercept([{ role: 'system', content: oldABC }], 'preview-parity'))
assert.deepEqual(previewNames, [B], 'G: Prompt Preview did not resolve current names')
assertExactlyCurrent(parity, desired([B]), 'G')

// H. Both raw Narrative and all-utility macros retain their placement and do not double inject.
for (const [label, marker] of [['narrative', '<reverie_narrative_macro/>'], ['all', '<reverie_all_macro/>']]) {
  await configure([C])
  const result = await intercept([{ role: 'system', content: `before-${label}\n${marker}\nafter-${label}` }], `macro-${label}`)
  const message = messagesOf(result)[0].content
  assert(message.indexOf(desired([C])) > message.indexOf(`before-${label}`) && message.indexOf(desired([C])) < message.indexOf(`after-${label}`), `H-${label}: macro placement moved`)
  assertExactlyCurrent(textOf(result), desired([C]), `H-${label}`)
}

// I. With no macro or historical wrapper, automatic injection remains active; off injects nothing.
await configure([A])
assertExactlyCurrent(textOf(await intercept([{ role: 'user', content: 'Automatic path.' }], 'automatic-on')), desired([A]), 'I-on')
await configure([])
assertExactlyCurrent(textOf(await intercept([{ role: 'user', content: 'Automatic path.' }], 'automatic-off')), '', 'I-off')

// J. Multiple stale owned wrappers collapse to one current wrapper, then zero when disabled.
await configure([B])
const duplicated = `${oldAB}\nold-middle\n${oldABC}\nold-end\n${oldAB}`
assertExactlyCurrent(textOf(await intercept([{ role: 'system', content: duplicated }], 'duplicates-on')), desired([B]), 'J-on')
await configure([])
assertExactlyCurrent(textOf(await intercept([{ role: 'system', content: duplicated }], 'duplicates-off')), '', 'J-off')

// K. A retired Phone selection cannot return through a saved Surface config.
await configure(['Character Phone', B])
await backend.setConfig({ characterPhonePresentation: 'widget' }, userId)
const retiredWrapper = '<reverie_narrative_utility><contract>narrative</contract><version>old</version><utilities>Character Phone</utilities>RETIRED PHONE AUTHORITY</reverie_narrative_utility>'
const retiredResult = textOf(await intercept([{ role: 'system', content: retiredWrapper }], 'widget-retirement'))
assertExactlyCurrent(retiredResult, desired([B]), 'K-widget')
assert(!retiredResult.includes('RETIRED PHONE AUTHORITY'))

// L. Apps and Narratives have separate root registries. A fresh chat with
// Plot Sparks/Parallel enabled must not prohibit PARALLEL through the App list
// or leave the disabled Off-Stage contract as an interchangeable alternative.
const selectedNarratives = ['Plot Sparks', 'Parallel Scene']
await configure(selectedNarratives)
const config = await backend.getConfig(userId)
const studio = structuredClone(config.globalSurfaceStudio)
for (const definition of Object.values(studio.definitions)) definition.promptEnabled = definition.baseSurfaceId === 'instagram'
// Keep an actual earlier stock template: the correction must apply at prompt
// construction, without rewriting the user's stored template.
const savedTemplate = 'Custom preface stays.\n{{reverie_enabled_surface_modules}}\nSTRICT ENABLED ROOT REGISTRY\nOnly the exact roots below are valid.\n{{reverie_enabled_surface_roots}}'
studio.utilityTemplate = savedTemplate
studio.utilityInjectionEnabled = true
await backend.setConfig({ globalSurfaceStudio: studio, surfacePreferencesInitialized: true, surfaceUtilityInjectionEnabled: true,
  phoneEnabled: false, storyConstellationsEnabled: false, proseIllustratorSettings: { enabled: false, mode: 'off' } }, userId)
const oldOffStage = desired(['Off-Stage'])
for (const [label, source] of [
  ['fresh', 'Start a fresh scene.'],
  ['all-macro', '<reverie_all_macro/>'],
  ['narrative-macro', '<reverie_narrative_macro/>'],
  ['stale-off-stage', oldOffStage],
]) {
  const compiled = textOf(await intercept([{ role: 'system', content: source }], `selection-${label}`))
  const appContract = compiled.match(/<reverie_surface_utility\b[\s\S]*?<\/reverie_surface_utility>/)?.[0] || ''
  assert(appContract.includes('This root registry applies only to the App/UI modules in this wrapper.'), `${label}: App root restriction still excludes selected Narrative roots`)
  assert(!appContract.includes('\nOnly the exact roots below are valid.'), `${label}: unscoped legacy stock root ban survived`)
  const narrative = wrapper(compiled)
  assert(narrative.includes('Enabled Narrative roots: Plot Sparks=Plot_Sparks; Parallel Scene=PARALLEL.'), `${label}: exact current Narrative roots are not authoritative`)
  assert(narrative.includes('Disabled Narrative Utilities:') && narrative.includes('Off-Stage'), `${label}: disabled Narrative selection is not explicit`)
  assert(narrative.includes('Do not replace Parallel Scene with an Off-Stage'), `${label}: similar off-screen contracts remain interchangeable`)
  assert(!narrative.includes('<else thread=') && !narrative.includes('<else_scene>'), `${label}: disabled Off-Stage schema leaked`)
  assertExactlyCurrent(compiled, desired(selectedNarratives), `L-${label}`)
}
assert.equal((await backend.getConfig(userId)).globalSurfaceStudio.utilityTemplate, savedTemplate, 'prompt scoping must not rewrite the saved custom template')
for (const mode of ['model-placed', 'relay-planned']) for (const images of [true, false]) {
  await backend.setConfig({ narrativeUtilityImageEnabled: { 'Plot Sparks': images, 'Parallel Scene': images },
    proseIllustratorSettings: { enabled: true, mode, automaticProtocolInjection: true } }, userId)
  const result = textOf(await intercept([{ role: 'user', content: 'Continue the established threads.' }], `selection-images-${images}`))
  assert(wrapper(result).includes('Enabled Narrative roots: Plot Sparks=Plot_Sparks; Parallel Scene=PARALLEL.'), 'image switch changed Narrative selection authority')
  assert.equal(wrapper(result).includes('<image_request'), images, 'Narrative media switch lost its own authoring contract')
  const previewResult = await preview(`selection-preview-${images}`)
  assert.deepEqual(previewResult.narrativeUtilityNames, selectedNarratives)
  assert.equal(wrapper(previewResult.prompt), wrapper(result), 'Dry Run differs from actual interceptor selection')
}

// Real acknowledged settings action, followed by a previously unopened chat.
// The user's saved switches, not a test-only prompt-builder argument, must win.
const operationId = 'save-selected-parallel'
frontendHandler!({ type: 'relay_settings_patch', operationId, expectedRevision: 0,
  patch: { kind: 'narrative-enabled', enabledNames: selectedNarratives } }, userId)
let saveAck
for (let tick = 0; tick < 100 && !saveAck; tick++) {
  await Bun.sleep(2)
  saveAck = frontendEvents.find(event => event.type === 'relay_settings_patch_result' && event.operationId === operationId)
}
assert.equal(saveAck?.status, 'success', 'actual selection save must be acknowledged')
const savedMessages = [{ role: 'system', content: oldOffStage }, { role: 'user', content: 'Fresh character, current selection.' }]
const originalMessages = structuredClone(savedMessages)
const freshAfterSave = textOf(await intercept(savedMessages, 'brand-new-character-after-ack'))
assert(wrapper(freshAfterSave).includes('Enabled Narrative roots: Plot Sparks=Plot_Sparks; Parallel Scene=PARALLEL.'))
assert(!wrapper(freshAfterSave).includes('<else_scene>'))
assert.deepEqual(savedMessages, originalMessages, 'injection must not edit the saved source messages')
await configure(['Off-Stage'])
const switched = wrapper(textOf(await intercept([{ role: 'user', content: 'Continue.' }], 'selection-opposite')))
assert(switched.includes('Enabled Narrative roots: Off-Stage=else.') && !switched.includes('<PARALLEL scope='), 'opposite selection did not remain independent')

console.log('Narrative authority regression passed: stale wrappers, Phone retirement, scoped Apps, fresh Plot Sparks/Parallel selection and media/preview parity.')
