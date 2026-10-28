// @ts-nocheck -- real settings and prompt builders, no provider calls.
import assert from 'node:assert/strict'
const stored = new Map(), output = []; let receive
const storage = { async getJson(path, options = {}) { return structuredClone(stored.get(`${options.userId}:${path}`) ?? options.fallback) }, async setJson(path, value, options = {}) { stored.set(`${options.userId}:${path}`, structuredClone(value)) }, async mkdir() {} }
globalThis.spindle = { on() {}, onFrontendMessage(handler) { receive = handler }, registerInterceptor() {}, registerMacro() {}, registerMessageContentProcessor() {}, permissions: { has: () => true }, sendToFrontend(value) { output.push(value) }, log: { info() {}, warn() {}, error() {} }, storage, userStorage: storage, connections: { async list() { return [] } }, imageGen: { async listConnections() { return [] } }, chat: { async getMessages() { return [] } }, generate: { raw() { throw Error('No provider spend') } } }
const backend = await import('../src/backend')
const marker = 'NSFW_PLANNER_TEST_ONLY: preserve source-established clothing state.'
const base = { enabled: true, mode: 'inline-protocol', nsfwPlannerEnabled: true, nsfwPlannerText: marker }
const settings = backend.normalizeProseIllustratorSettings(base)
assert.equal(settings.nsfwPlannerEnabled, true, 'The new planner toggle must survive normalization')
assert.equal(settings.nsfwPlannerText, marker, 'Editable planner text survives normalization')
const defaults = backend.defaultProseIllustratorSettings()
assert.equal(defaults.nsfwPlannerEnabled, false, 'Existing users must opt in')
assert(defaults.nsfwPlannerText.length > 0)
const context = { version: 'relay-planned-v2', chatId: 'planner-test', messageId: 'source', swipeId: 0, maximumIllustrations: 2, maximumCharacters: 2, maximumPromptCharacters: 6000, perspectiveMode: 'scene-snapshot', promptFormat: 'natural-language', defaultAspectRatio: '4:3', promptStyle: '', adultMode: false, subjects: [], paragraphs: [{ index: 0, text: 'Two adults sit in a quiet room.' }], referenceAssetIds: [], locationReferenceAssetIds: [], priorIllustrations: [], globalNegativeRequirements: [] }
for (const enabled of [false, true]) {
  for (const mode of ['inline-protocol', 'model-placed', 'relay-planned', 'off']) {
    const s = backend.normalizeProseIllustratorSettings({ ...base, mode, nsfwPlannerEnabled: enabled })
    const story = backend.resolveIllustratorStoryPrompt(s)
    assert.equal(story.includes(marker), enabled && mode !== 'off' && mode !== 'relay-planned', `${mode}: only the Story Model illustration planner gets the macro, not Relay story prose`)
    const relay = backend.relayPlannedDirectorMessages(s, context).map(row => row.content).join('\n')
    const repair = backend.relayPlannedRepairMessages(s, context, { anchor: { paragraphIndex: 0 } }, []).map(row => row.content).join('\n')
    for (const prompt of [relay, repair]) assert.equal(prompt.split(marker).length - 1, enabled && mode !== 'off' ? 1 : 0, 'Director and bounded repair get one enabled planner instruction')
    const provider = backend.assemblePreparedProviderPrompts({ userPositivePromptPrefix: s.customPromptPrefix, userNegativePromptPrefix: s.customNegativePrefix }, { prompt: 'Two adults seated in a room.', negativePrompt: '', promptMode: 'story_model_visual_prompt' })
    assert(!JSON.stringify(provider).includes(marker), 'The toggle must never append planner instructions to provider prompts')
  }
}
assert.equal(backend.normalizeProseIllustratorSettings({ ...base, nsfwPlannerText: '' }).nsfwPlannerText, '', 'An intentionally empty macro cannot silently restore the default')
await backend.setConfig({ proseIllustratorSettings: base }, 'owner')
receive({ type: 'prose_illustrator_action', chatId: 'new-chat', action: 'set_settings', settings: { customPromptPrefix: 'painterly' } }, 'owner')
for (let tick = 0; tick < 200 && (await backend.getConfig('owner')).proseIllustratorSettings.customPromptPrefix !== 'painterly'; tick++) await Bun.sleep(5)
const persisted = (await backend.getConfig('owner')).proseIllustratorSettings
assert.equal(persisted.nsfwPlannerText, marker, 'Unrelated partial saves retain editable text')
assert.equal(persisted.nsfwPlannerEnabled, true)
assert.equal(persisted.customPromptPrefix, 'painterly', 'The actual UI partial-save handler finished')
assert.equal((await backend.getConfig('other')).proseIllustratorSettings.nsfwPlannerEnabled, false, 'The macro is user scoped')
assert([...stored.values()].some(value => value.proseIllustratorSettings?.nsfwPlannerText === marker), 'Settings reach durable storage')
console.log('NSFW planner instructions passed: opt-in, editable persistence, disabled/off guards, Story Model vs Relay ownership, Director repair and no provider-prefix injection')
