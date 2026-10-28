// @ts-nocheck -- production saved-message event path, in-memory host only.
import assert from 'node:assert/strict'

const userId = 'frequency-user', chatId = 'frequency-chat', legacyChat = 'legacy-frequency-chat'
const stored = new Map(), events = new Map(), histories = new Map(), warnings = []
let providerCalls = 0, writes = 0
stored.set(`states/${legacyChat}.json`, { proseIllustrator: {
  autoCounters: { [legacyChat]: { eligibleMessages: 9, updatedAt: 1 } },
  frequencyDecisions: {
    [`${legacyChat}:legacy-message:0:original-source:original-settings`]: { eligibleOrdinal: 7, passes: true, everyN: 2, recordedAt: 1 },
    [`${legacyChat}:legacy-message:1:retry-source:retry-settings`]: { eligibleOrdinal: 9, passes: true, everyN: 2, recordedAt: 2 },
  },
} })
const storage = {
  async getJson(path, { fallback } = {}) { return structuredClone(stored.get(path) ?? fallback) },
  async setJson(path, value) { writes++; stored.set(path, structuredClone(value)) }, async mkdir() {},
}
const forbiddenProvider = () => { providerCalls++; throw Error('No model/image provider allowed') }
globalThis.spindle = {
  on(name, fn) { events.set(name, fn) }, onFrontendMessage() {}, registerInterceptor() {}, registerMacro() {}, registerMessageContentProcessor() {}, unregisterTool() {},
  permissions: { has: () => true }, sendToFrontend() {}, userStorage: storage, storage,
  log: { info() {}, warn(value) { warnings.push(value) }, error(value) { warnings.push(value) } },
  chats: { async get(id) { return { id, character_id: 'fixture-card', metadata: {} } } },
  characters: { async get() { return { id: 'fixture-card', name: 'Mira' } } }, personas: { async getActive() { return null } },
  chat: { async getMessages(id) { return structuredClone(histories.get(id) || []) } },
  connections: { async list() { return [] } }, imageGen: { async listConnections() { return [] }, generate: forbiddenProvider }, generate: { raw: forbiddenProvider },
  variables: { global: { async set() {} }, chat: { async set() {} } }, world_books: { async getActivated() { return [] }, entries: { async get() { return null } } },
}
const backend = await import('../src/backend')
let settings = { enabled: true, mode: 'relay-planned', plannerConnectionId: null, frequencyMode: 'every-n', everyNEligibleMessages: 2,
  minimumMessageLength: 0, appearanceMemoryEnabled: false, perspectiveMode: 'scene-snapshot', promptFormat: 'natural-language' }
const configure = async patch => {
  settings = { ...settings, ...patch }
  await backend.setConfig({ enabled: true, autoGenerate: true, phoneEnabled: false, appearanceSidecarEnabled: false, surfaceUtilityInjectionEnabled: false,
    narrativeDlcEnabled: false, storyConstellationsEnabled: false, proseIllustratorSettings: settings }, userId)
}
await configure({})
let serial = 0
const savedMessage = (id, content = 'Mira holds a silver folder beside the open window.') => ({ id, role: 'assistant', is_user: false, content, swipes: [content], swipe_id: 0, extra: {} })
async function complete(chat, message) {
  const history = histories.get(chat) || []
  if (!history.includes(message)) history.push(message)
  histories.set(chat, history)
  const before = stored.get(`states/${chat}.json`)?.logs?.filter(row => row.eventType === 'prose_saved_source_selected').length || 0
  events.get('GENERATION_ENDED')({ chatId: chat, messageId: message.id, generationId: `frequency-generation-${++serial}`, content: message.content }, userId)
  for (let tick = 0; tick < 300; tick++) {
    const state = stored.get(`states/${chat}.json`)
    if ((state?.logs?.filter(row => row.eventType === 'prose_saved_source_selected').length || 0) > before) {
      let unchanged = 0, lastWrites = writes
      while (unchanged < 10) {
        await new Promise(resolve => setTimeout(resolve, 10))
        unchanged = writes === lastWrites ? unchanged + 1 : 0
        lastWrites = writes
      }
      return stored.get(`states/${chat}.json`).proseIllustrator
    }
    await new Promise(resolve => setTimeout(resolve, 10))
  }
  assert.fail(`saved scan did not finish: ${warnings.join('\n')}`)
}
const ordinal = (state, chat) => state.autoCounters[chat].eligibleMessages
const decision = (state, chat, id) => state.frequencyDecisions[`${chat}:${id}`]
const first = savedMessage('first')
let state = await complete(chatId, first)
assert.equal(ordinal(state, chatId), 1)
// The same saved reply is retried with a real source edit, not just a replay.
first.content = first.swipes[0] = first.content.replace('silver', 'gold')
state = await complete(chatId, first)
assert.equal(ordinal(state, chatId), 1, 'a saved reply edit/retry must not advance cadence')
await configure({ promptFormat: 'danbooru-tags', imageAlignment: 'left' })
state = await complete(chatId, first)
assert.equal(ordinal(state, chatId), 1, 'changing image settings is not another saved story reply')
first.swipes.push('Mira rests the gold folder on the table.'); first.swipe_id = 1; first.content = first.swipes[1]
state = await complete(chatId, first)
assert.equal(ordinal(state, chatId), 1, 'a replacement swipe belongs to the same saved reply')
assert.equal(decision(state, chatId, 'first').eligibleOrdinal, 1)
const second = savedMessage('second')
state = await complete(chatId, second)
assert.equal(ordinal(state, chatId), 2); assert.equal(decision(state, chatId, 'second').passes, false)
await configure({ everyNEligibleMessages: 3 })
state = await complete(chatId, second)
assert.equal(ordinal(state, chatId), 2)
assert.equal(decision(state, chatId, 'second').everyN, 3, 'reevaluate the existing ordinal using the current interval')
assert.equal(decision(state, chatId, 'second').passes, false)
state = await complete(chatId, savedMessage('third'))
assert.equal(ordinal(state, chatId), 3); assert.equal(decision(state, chatId, 'third').passes, false)
state = await complete(chatId, savedMessage('fourth'))
assert.equal(ordinal(state, chatId), 4); assert.equal(decision(state, chatId, 'fourth').passes, true)
await configure({ frequencyMode: 'every-eligible' })
state = await complete(chatId, second)
assert.equal(ordinal(state, chatId), 4); assert.equal(decision(state, chatId, 'second').passes, true)
await configure({ frequencyMode: 'every-n', everyNEligibleMessages: 3 })
state = await complete(legacyChat, savedMessage('legacy-message'))
assert.equal(ordinal(state, legacyChat), 9, 'existing installations must not count a legacy saved reply again')
assert.equal(decision(state, legacyChat, 'legacy-message').eligibleOrdinal, 7, 'retain its first recorded saved-reply ordinal')
assert.equal(decision(state, legacyChat, 'legacy-message').passes, true)
state = await complete(legacyChat, savedMessage('new-after-upgrade'))
assert.equal(ordinal(state, legacyChat), 10, 'do not renumber historical counters during migration')
assert.equal(providerCalls, 0, 'cadence accounting must be tested without any provider spend')
console.log('PASS saved-reply frequency: edited/retried/replacement swipes and changed settings reuse one ordinal; current intervals reevaluate without advancing; legacy decisions retain first ordinal and historical counters; zero providers.')
