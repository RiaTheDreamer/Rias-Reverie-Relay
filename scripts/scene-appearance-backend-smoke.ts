// @ts-nocheck -- actual backend/render/provider boundaries with offline host mocks.
import assert from 'node:assert/strict'
import { sceneAppearanceForHistory } from '../src/sceneAppearance'
import { compileRelayPlannedPrompt, validateRelayPlannedDirectorResult } from '../src/relayPlannedV2'

const storage = new Map(), events = new Map(), calls = [], errors = []
let render, history = [], outputOutfit = 'red_coat, black_trousers'
globalThis.spindle = {
  on(name, fn) { events.set(name, fn) }, onFrontendMessage() {}, registerInterceptor() {}, registerMacro() {},
  registerMessageContentProcessor(fn) { render = fn }, sendToFrontend() {}, permissions: { has: () => true }, log: { info() {}, warn() {}, error(value) { errors.push(value) } },
  userStorage: { async mkdir() {}, async getJson(path, { fallback } = {}) { return structuredClone(storage.get(path) ?? fallback ?? {}) }, async setJson(path, value) { storage.set(path, structuredClone(value)) } },
  chats: { async get() { return { character_id: 'ada' } } }, chat: { async getMessages() { return structuredClone(history) } },
  characters: { async get() { return { id: 'ada', name: 'Ada', description: 'Adult woman with brown hair and brown eyes.' } } },
  personas: { async getActive() { return null } },
  connections: { async get(id) { return { id, model: 'offline', provider: 'fixture' } }, async list() { return [] } },
  variables: { global: { async set() {} }, chat: { async set() {} } },
  generate: { async raw(request) {
    calls.push(request)
    assert.equal(request.connection_id, 'appearance', 'scene deltas must never start a second analysis call')
    return { content: JSON.stringify({ subjects: [{ name: 'Ada', role: 'character', canonical: { hair: { booruTags: ['brown_hair'] }, eyes: { booruTags: ['brown_eyes'] } }, current: { attire: { booruTags: outputOutfit.split(', ') } } }] }) }
  } },
}
let backend = await import('../src/backend')
const user = 'scene-user', chatId = 'scene-chat'
let config = await backend.setConfig({ enabled: true, autoGenerate: false, appearanceUpdateIntervalMessages: 0, appearanceSidecarConnectionId: 'appearance', parserConnectionId: null,
  parserRetries: 0, includeLorebook: false, vaultStrength: 'strong', storyConstellationsEnabled: false, phoneEnabled: false,
  proseIllustratorSettings: { ...backend.defaultProseIllustratorSettings(), enabled: false, appearanceMemoryEnabled: true, appearanceMemoryOverride: 'strong', mode: 'model-placed' },
}, user)
const vault = () => [...storage.values()].find(value => value.continuityVault?.characters?.ada)?.continuityVault
const until = async test => { for (let count = 0; count < 500; count++) { if (test()) return; await new Promise(resolve => setTimeout(resolve, 5)) } throw Error(`Timed out: ${errors.join('\n')}`) }
const add = (id, content, swipe_id = 0) => { const message = { id, role: 'assistant', is_user: false, content, swipe_id }; history.push(message); return message }
const ended = message => events.get('GENERATION_ENDED')({ chatId, messageId: message.id, content: message.content }, user)
const first = add('setup', 'Ada waits beside the closed closet in a red coat and black trousers.')
ended(first)
await until(() => vault()?.appearanceSidecar.lastFullRefreshMessageId === 'setup' && vault()?.sceneAppearance?.[0]?.baseline.length)
assert.equal(calls.length, 1, 'Never still performs mandatory setup')
const originalSheet = structuredClone(vault().characterSheets)
const paragraphs = ['Ada waits beside the closet in her red coat and black trousers.', 'Ada changes into blue pajamas, leaving the coat and trousers inside the closet.', 'Ada sits on the bench by the window.']
const changes = [{ subject: 'Ada', paragraphIndex: 1, evidence: 'Ada changes into blue pajamas', wardrobe: ['blue_pajamas'] }]
const metadata = `<reverie-scene-state>${JSON.stringify({ changes })}</reverie-scene-state>`
const second = add('changed', `${paragraphs.join('\n\n')}\n\n${metadata}`)
ended(second)
await until(() => vault()?.sceneAppearance?.find(turn => turn.messageId === second.id)?.changes.length)
assert.equal(calls.length, 1, 'an explicit outfit change must use the existing story call, without overriding Never')
assert.deepEqual(vault().characterSheets, originalSheet, 'scene wardrobe must not rewrite the Appearance sheet')
assert(Object.values(vault().wardrobe).some(fact => fact.value === 'red_coat'), 'canonical facts remain intact')

const base = { chatId, messageId: second.id, swipeId: 0, requestId: 'image', target: 'prose.illustration', count: 1, slots: ['illustration'], cast: 'char', prosePromptComposition: { namedSubjects: ['Ada'], expectedPeopleCount: 1 }, promptSource: 'visual_prompt', originalRequestXml: '', originalNegativePrompt: '', alt: 'Ada in the room' }
for (const format of ['natural-language', 'danbooru-tags']) {
  config = await backend.setConfig({ proseIllustratorSettings: { ...config.proseIllustratorSettings, promptFormat: format } }, user)
  for (const paragraphIndex of [0, 2]) {
    const outfit = paragraphIndex === 0 ? 'red coat, black trousers' : 'blue pajamas'
    const originalSceneBrief = format === 'danbooru-tags' ? `1girl, brown_hair, ${outfit}, standing, indoors` : `Ada, one adult woman with brown hair, wearing ${outfit}, alone in the room.`
    const prepared = await backend.parseSlotPrompt({ ...base, originalSceneBrief, authoritativeSourceParagraph: paragraphs[paragraphIndex], proseAnchor: { paragraphIndex, selectedExcerpt: paragraphs[paragraphIndex] } }, 'illustration', history, 1, config, user, {})
    const facts = prepared.includedContinuityFacts || prepared.promptPipeline?.includedContinuityFacts || []
    const prompt = prepared.prompt
    assert.match(prompt, paragraphIndex === 0 ? /red[ _]coat/i : /blue[ _]pajamas/i, `${format}: ${prompt}`)
    assert.doesNotMatch(prompt, paragraphIndex === 0 ? /blue[ _]pajamas/i : /red[ _]coat|black[ _]trousers/i, `${format}: wrong-time wardrobe: ${prompt}`)
  }
}
assert.equal(calls.length, 1, 'ordinary Story Model preparation must not invoke any extra model')
const hidden = await render({ origin: 'render', chatId, messageId: second.id, content: second.content, userId: user, extra: { role: 'assistant' } })
assert.equal(hidden.content.trim(), paragraphs.join('\n\n'))
assert.equal(history[1].content, second.content, 'render projection must preserve the saved message and its metadata')
assert.doesNotMatch(backend.proseAnalysisText(second.content), /reverie-scene-state|sceneAppearance|blue_pajamas/)

backend = await import('../src/backend?scene-appearance-reload')
config = await backend.getConfig(user)
const third = add('carried', 'Ada folds a towel on the bench by the window.')
ended(third)
await until(() => vault()?.sceneAppearance?.find(turn => turn.messageId === third.id))
const carried = await backend.parseSlotPrompt({ ...base, messageId: third.id, requestId: 'carried', originalSceneBrief: '1girl, brown_hair, folding_towel, indoors', authoritativeSourceParagraph: third.content, proseAnchor: { paragraphIndex: 0, selectedExcerpt: third.content } }, 'illustration', history, 2, config, user, {})
assert.match(carried.prompt, /blue[ _]pajamas/i, 'the next response must carry the scene wardrobe across a backend reload')
assert.doesNotMatch(carried.prompt, /red[ _]coat|black[ _]trousers/i)
assert.equal(calls.length, 1)

const subjects = [{ name: 'Ada', aliases: [], wardrobe: ['red_coat', 'black_trousers'], appearance: [], replaces: [] }]
const context = { version: 'relay-planned-2', chatId, messageId: second.id, swipeId: 0, maximumIllustrations: 2, maximumCharacters: 2, maximumPromptCharacters: 6000, perspectiveMode: 'scene-led', defaultAspectRatio: '4:3', promptStyle: '', adultMode: false,
  paragraphs: paragraphs.map((text, index) => ({ index, text })), subjects: [{ name: 'Ada', identity: ['brown_hair'], current: ['red_coat', 'black_trousers'], wardrobe: ['red_coat', 'black_trousers'], pinned: [], superseded: [] }], sceneAppearanceBaseline: subjects,
  referenceAssetIds: [], locationReferenceAssetIds: [], priorIllustrations: [], globalNegativeRequirements: [] }
const illustration = index => ({ rank: index + 1, title: `Scene ${index}`, reason: 'source moment', anchor: { paragraphIndex: index, insertionSide: 'after', anchorExcerpt: paragraphs[index] }, aspectRatio: '4:3', expectedPeopleCount: 1, namedSubjects: ['Ada'], omittedSubjects: [],
  subjectDirectives: [{ name: 'Ada', role: 'character', appearanceOverrides: [], attireOverrides: [], temporaryTraits: [], expression: '', pose: 'standing', action: '', gaze: '', contact: '', booruTags: ['1girl', 'brown_hair'] }],
  composition: { shotType: 'medium shot', cameraAngle: 'eye level', framing: 'waist up', blocking: 'Ada centered', foreground: '', background: 'closet', location: 'room', timeOfDay: 'day', lighting: 'daylight', mood: 'quiet', importantProps: [], backgroundPeople: '' }, promptCore: 'Ada alone in the room', booruTags: ['indoors'], negativeCore: '', referenceAssetIds: [], locationReferenceAssetIds: [] })
const checked = validateRelayPlannedDirectorResult(JSON.stringify({ shouldIllustrate: true, reason: 'outfit transition', sceneAppearance: changes, illustrations: [illustration(0), illustration(2)] }), context)
assert.equal(context.sceneAppearanceChanges.length, 1)
for (const tagMode of [false, true]) for (const index of [0, 2]) {
  const compiled = compileRelayPlannedPrompt(illustration(index), context, { tagMode })
  const prompt = compiled.positivePrompt || compiled.prompt
  assert.match(prompt, index === 0 ? /red[ _]coat/i : /blue[ _]pajamas/i)
  assert.doesNotMatch(prompt, index === 0 ? /blue[ _]pajamas/i : /red[ _]coat|black[ _]trousers/i)
}
assert.equal(calls.length, 1)
const manual = await backend.runAppearanceSidecar({ chatId, messageId: third.id, swipeId: 0, content: third.content, userId: user, mode: 'reconcile' })
assert.equal(manual, true)
assert.equal(calls.length, 2, 'explicit full rescan still bypasses Never')
console.log('Scene Appearance backend: real completed-turn ingestion, mandatory setup/Never, Story Model NL/Booru before/after prompts, reload carry, Relay NL/Booru compilation, hidden render, saved-content preservation and manual rescan passed. Offline providers only.')
process.exit(0)
