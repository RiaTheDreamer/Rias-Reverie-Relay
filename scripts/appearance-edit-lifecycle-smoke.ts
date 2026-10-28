// @ts-nocheck -- production Save action vs an already-running Appearance call.
import assert from 'node:assert/strict'
const userId = 'appearance-edit-user', chatId = 'appearance-edit-chat'
const stored = new Map(), outbound = [], requests = []
let receive, release, calls = 0
const gate = new Promise(resolve => { release = resolve })
const narrative = 'Liam and Jaehyun stand by the archive window wearing blue coats.'
const obsoleteRequest = '<reverie-illustration request="generate" slot="old"><visual_prompt>obsolete-request-only-facial-scars</visual_prompt></reverie-illustration>'
const message = { id: 'turn-1', role: 'assistant', is_user: false, content: `${narrative}\n${obsoleteRequest}`, swipe_id: 0 }
const storage = { async getJson(path, { fallback } = {}) { return structuredClone(stored.get(path) ?? fallback) }, async setJson(path, value) { stored.set(path, structuredClone(value)) }, async mkdir() {} }
globalThis.spindle = {
  on() {}, onFrontendMessage(callback) { receive = callback }, registerInterceptor() {}, registerMacro() {}, registerMessageContentProcessor() {},
  permissions: { has: () => true }, storage, userStorage: storage, sendToFrontend(value) { outbound.push(structuredClone(value)) }, log: { info() {}, warn() {}, error() {} },
  chats: { async get(id) { return { id, character_id: 'mira', metadata: {} } } }, characters: { async get() { return { id: 'mira', name: 'Mira', description: 'Adult archivist.' } } }, personas: { async getActive() { return null } },
  chat: { async getMessages() { return [{ id: 'past', role: 'assistant', content: `Liam wore a green coat.\n${obsoleteRequest}` }, structuredClone(message)] } },
  connections: { async list() { return [] }, async get(id) { return { id, name: id, provider: 'fixture', model: 'fixture' } } },
  world_books: { async getActivated() { return [] }, entries: { async get() { return null } } }, variables: { global: { async set() {} }, chat: { async set() {} } },
  imageGen: { async generate() { assert.fail('editing Appearance must not generate images') } },
  generate: { async raw(request) {
    calls++; requests.push(structuredClone(request)); if (calls === 2) await gate
    return { content: JSON.stringify({ observations: ['Liam', 'Jaehyun'].map(name => ({ subject: { name, aliases: [], role: 'npc', trustworthy: true }, confidence: .99,
      facts: [{ layer: 'visual-identity', category: 'scar', value: 'scar_on_face', provenance: 'chat-history' }, { layer: 'visual-identity', category: 'eye-color', value: 'green_eyes', provenance: 'current-assistant-message' }] })) }) }
  } },
}
const backend = await import('../src/backend')
await backend.setConfig({ enabled: true, autoGenerate: false, phoneEnabled: false, storyConstellationsEnabled: false, parserConnectionId: 'appearance', appearanceSidecarConnectionId: 'appearance', followNativeParser: false,
  proseIllustratorSettings: { enabled: true, appearanceMemoryEnabled: true, appearanceMemoryOverride: 'strong' } }, userId)
const state = () => stored.get(`states/${chatId}.json`)
async function until(check, label) { for (let tick = 0; tick < 400; tick++) { if (check()) return; await new Promise(resolve => setTimeout(resolve, 5)) } assert.fail(label) }
const scan = () => backend.runAppearanceSidecar({ chatId, messageId: message.id, swipeId: 0, content: message.content, userId })
await scan()
const subjects = Object.values(state().continuityVault.characters).filter(row => ['Liam', 'Jaehyun'].includes(row.canonicalCharacterName))
assert.equal(subjects.length, 2)
async function save(characterId, tags, label) {
  const sheet = state().continuityVault.characterSheets[characterId]
  receive({ type: 'continuity_action', chatId, action: 'save_character_sheet', characterId, operationId: label, expectedRevision: sheet.updatedAt, booruTags: tags, currentOutfitTags: '', negativeIdentityTags: '', referenceAssetIds: [] }, userId)
  await until(() => outbound.some(row => row.type === 'appearance_memory_action_status' && row.operationId === label && ['success', 'error'].includes(row.status)), 'save acknowledgement')
  const result = outbound.findLast(row => row.operationId === label)
  assert.equal(result.status, 'success', result.message)
}
for (const subject of subjects) await save(subject.canonicalCharacterId, 'green_eyes, scar_on_face', `confirm-${subject.canonicalCharacterId}`)
message.id = 'turn-2'
const lateScan = scan()
await until(() => calls === 2, 'held automatic Appearance request')
for (const subject of subjects) await save(subject.canonicalCharacterId, 'green_eyes', `remove-${subject.canonicalCharacterId}`)
release(); await lateScan
for (const subject of subjects) assert.doesNotMatch(state().continuityVault.characterSheets[subject.canonicalCharacterId].booruTags, /scar/, 'late Sidecar response overrode the acknowledged edit')
message.id = 'turn-3'; await scan()
assert.equal(calls, 3)
for (const subject of subjects) assert.doesNotMatch(state().continuityVault.characterSheets[subject.canonicalCharacterId].booruTags, /scar/)
assert(requests.every(request => !JSON.stringify(request.messages).includes('obsolete-request-only-facial-scars')), 'actual outgoing Appearance request leaked raw illustration text')
assert(!JSON.stringify(requests[2].messages).includes('scar_on_face'), 'removed manual facts were presented as positive user-confirmed memory')
assert(JSON.stringify(requests[2].messages).includes(narrative), 'actual story prose was removed with the image request')
console.log('PASS production Appearance edits: two acknowledged saves beat a held stale response and the next turn; actual outgoing requests exclude image-request text and inactive manual facts. Providers mocked.')
process.exit(0)
