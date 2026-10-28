// @ts-nocheck -- actual authoring/injection/render routes with a narrow offline host.
import assert from 'node:assert/strict'
import { PLOT_SPARK_VECTOR_BY_KEY } from '../src/contracts'
import { plotSparksUtilityPrompt } from '../src/plotSparksUtility'
import { buildNarrativeUtilityPrompt } from '../src/narrativeDlcRuntime'
import { NARRATIVE_REGEX_VARIANTS, renderNarrativeRegex } from '../src/narrativeRegexAssets'

const voiceHeader = 'PLOT SPARKS NARRATIVE VOICE'
function assertVoice(prompt: string) {
  assert(prompt.includes(voiceHeader), 'Plot Sparks needs an explicit narrative-voice contract, not just playable choices')
  assert.match(prompt, /same narrative person.*tense/i)
  for (const phrase of ['first-person', 'third-person', 'second-person', 'player-directed commands', 'character dialogue', 'one or two narrative sentences', '45 words']) assert(prompt.includes(phrase), phrase)
  assert(!prompt.includes('one playable sentence of at most 30 words'), 'the old one-sentence cap conflicts with action plus dialogue')
  assert.equal(prompt.split(voiceHeader).length - 1, 1, 'the voice contract should appear once')
}
// This fails against the shipped 0.5.1.11 authoring prompt.
for (const images of [false, true]) assertVoice(plotSparksUtilityPrompt(images))

const pairs = Object.entries(PLOT_SPARK_VECTOR_BY_KEY)
const board = (text: string, images = false) => `<Plot_Sparks><ID>voice-fixture</ID><Lifecycle>Unused Plot Sparks dissolve after this response.</Lifecycle>${pairs.map(([key, vector]) => `<Spark><Key>${key}</Key><Vector>${vector}</Vector><Text>${text}</Text><Media>${images ? `<reverie-illustration request="generate" slot="voice-${key}" aspect="16:9" cast="none"><visual_prompt>Current opening instant.</visual_prompt></reverie-illustration>` : ''}</Media></Spark>`).join('')}</Plot_Sparks>`
const savedOverride = `USER-AUTHORED SPARK CONTRACT\n${board('Original saved example.', true)}`
for (const images of [false, true]) for (const override of [undefined, savedOverride]) {
  const result = buildNarrativeUtilityPrompt(['Plot Sparks'], { 'Plot Sparks': override }, { 'Plot Sparks': images })
  assertVoice(result.content)
  const example = result.content.match(/<Plot_Sparks>[\s\S]*?<\/Plot_Sparks>/)![0]
  assert.equal((example.match(/<Spark><Key>/g) || []).length, 10)
  assert.equal((example.match(/<reverie-illustration\b/g) || []).length, images ? 10 : 0)
  if (images && override) assert(result.content.includes('USER-AUTHORED SPARK CONTRACT'), 'saved custom authoring must survive the added voice invariant')
}

const storage = new Map<string, unknown>()
let interceptor: Function
globalThis.spindle = {
  on() {}, onFrontendMessage() {}, registerMacro() {}, registerMessageContentProcessor() {}, sendToFrontend() {},
  registerInterceptor(handler) { interceptor = handler; return () => {} },
  permissions: { has: () => true }, log: { info() {}, warn() {}, error() {} },
  userStorage: {
    async getJson(path, options = {}) { return structuredClone(storage.get(path) ?? options.fallback ?? {}) },
    async setJson(path, value) { storage.set(path, structuredClone(value)) }, async mkdir() {},
  },
  chats: { async get(id) { return { id } } }, chat: { async getMessages() { return [] } },
  characters: { async get() { return null } }, personas: { async getActive() { return null } },
  variables: { global: { async set() {} }, chat: { async set() {} } },
  world_books: { async getActivated() { return [] }, entries: { async get() { return null } } },
  imageGen: new Proxy({}, { get() { throw new Error('No image providers in authoring regression') } }),
  generate: { raw() { throw new Error('No model calls in authoring regression') } },
}
const backend = await import('../src/backend')
assert(interceptor, 'production Story Model interceptor must register')
const userId = 'spark-voice-user'
const initial = await backend.getConfig(userId)
const studio = structuredClone(initial.globalSurfaceStudio)
for (const definition of Object.values(studio.definitions)) definition.promptEnabled = false
const voices = [
  ['first-person', 'I keep my grip loose, waiting for an answer.', 'I loosen my grip. My voice steadies.'],
  ['third-person', 'She keeps her grip loose, waiting for an answer.', 'She loosens her grip. Her voice steadies.'],
  ['second-person', 'You keep your grip loose, waiting for an answer.', 'You loosen your grip. Your voice steadies.'],
]
let cases = 0
for (const mode of ['relay-planned', 'inline-protocol']) for (const images of [false, true]) for (const override of [undefined, savedOverride]) {
  const config = await backend.setConfig({
    phoneEnabled: false, autoRescanOnChatOpen: false, globalSurfaceStudio: studio,
    surfacePreferencesInitialized: true, surfaceUtilityInjectionEnabled: false,
    narrativeDlcEnabled: true, narrativeDlcUtilityNames: ['Plot Sparks'],
    narrativeUtilityImageEnabled: images ? {} : { 'Plot Sparks': false },
    narrativeUtilityOverrides: override ? { 'Plot Sparks': { content: override, revision: 7, updatedAt: 1 } } : {},
    proseIllustratorSettings: { ...initial.proseIllustratorSettings, enabled: true, mode },
  }, userId)
  for (const [person, story, opening] of voices) {
    const chatId = `voice-${mode}-${images}-${Boolean(override)}-${person}`
    const result = await interceptor([
      { role: 'system', content: `Continue the established ${person} story without changing narrative tense.` },
      { role: 'assistant', content: `${story}\n${board('Quietly admit you kept your place, watching the other speaker hesitate.')}` },
      { role: 'user', content: 'Continue the story.' },
    ], { chatId, userId, isDryRun: true })
    const messages = Array.isArray(result) ? result : result.messages
    const injected = messages.filter(message => message.role === 'system').map(message => message.content).join('\n')
    assertVoice(injected)
    assert(injected.includes('not instructions or established events'), 'recent unchosen suggestions must remain non-canon')
    assert(injected.includes('Do not imitate prior command-style phrasing'), 'old imperative history must not teach the same voice again')
    assert(messages.some(message => String(message.content).includes(story)), 'the voice rule must not rewrite the actual story')
    for (const variant of NARRATIVE_REGEX_VARIANTS) {
      const rendered = renderNarrativeRegex(board(opening), variant, chatId)
      assert(rendered.includes(opening), 'rendering preserves authored narrative prose verbatim')
      assert(!rendered.includes('Format error'))
    }
    cases++
  }
  assert.equal((await backend.getConfig(userId)).narrativeUtilityOverrides['Plot Sparks']?.content, override, 'saved user overrides must not be rewritten')
}
console.log(`Plot Sparks narrative voice passed: ${cases} final-interceptor workflow/image/override/POV cases, unchanged authored prose/rendering, old-command history boundary and no provider calls. Live model adherence is a separate check.`)
