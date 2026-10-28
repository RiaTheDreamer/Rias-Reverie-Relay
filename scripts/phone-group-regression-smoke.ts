// @ts-nocheck -- production backend and mounted phone, with an isolated host.
import assert from 'node:assert/strict'
import { JSDOM } from 'jsdom'
import { mountPhoneWidget } from '../src/phoneWidget'
import { phoneStoryProtocol, parsePhoneActivities, phoneStoryScope, resolvePhoneParticipant } from '../src/phoneStoryBridge'
import { phoneToolProtocol, createPhoneToolBridge, PHONE_TEXT_TOOL, appendPhoneToolEvents } from '../src/phoneTools'
let receive, history = []; const stored = new Map(), output = [], lookups = []
const storage = { async getJson(path, options = {}) { return structuredClone(stored.get(`${options.userId}:${path}`) ?? options.fallback) }, async setJson(path, value, options = {}) { stored.set(`${options.userId}:${path}`, structuredClone(value)) }, async mkdir() {} }
globalThis.spindle = {
  registerInterceptor() {}, registerMessageContentProcessor() {}, registerMacro() {}, on() {}, registerTool() { throw Error('XML only') }, unregisterTool() {}, onFrontendMessage(fn) { receive = fn }, sendToFrontend(value, userId) { output.push({ ...value, userId }) }, permissions: { has: () => true, onChanged: () => () => {} }, log: { info() {}, warn() {}, error() {} }, userStorage: storage, storage,
  chats: { async get(id, userId) { assert.equal(userId, 'group-user'); return { id, character_id: 'first', metadata: { active_persona_id: 'reader', ...(id === 'group' ? { group: true, character_ids: ['first', 'second', 'missing', 'third', 'second'] } : {}) } } } },
  characters: { async get(id, userId) { assert.equal(userId, 'group-user'); lookups.push(id); return id === 'missing' ? null : { id, name: `Member ${id}`, description: `Description ${id}`, avatar_url: `/avatars/${id}` } } }, personas: { async get() { return { id: 'reader', name: 'Reader' } }, async getActive() { return null } }, chat: { async getMessages() { return [] } }, connections: { async list() { return [] } }, imageGen: { async listConnections() { return [] } }, generate: { async raw() { throw Error('No provider spend') } }, variables: { global: { async set() {} }, chat: { async set() {} } }, world_books: { async getActivated() { return [] }, entries: { async get() { return null } } },
}
const backend = await import('../src/backend')
await backend.setConfig({ autoGenerate: false, surfaceUtilityInjectionEnabled: false }, 'group-user')
async function load(chatId) {
  const operationId = crypto.randomUUID(); receive({ type: 'reverie_phone_command', action: 'load', chatId, operationId }, 'group-user')
  for (let tick = 0; tick < 200 && !output.some(row => row.operationId === operationId); tick++) await Bun.sleep(5)
  const result = output.find(row => row.operationId === operationId); assert(result && !result.error, JSON.stringify(result)); return result
}
const group = await load('group')
assert.deepEqual(group.identities.map(person => person.id), ['character:first', 'character:second', 'character:third', 'persona:reader'], 'Every confirmed group member and Persona must own a selectable phone; missing/deleted cards are skipped and IDs deduplicated')
assert.equal(group.identities[1].avatarUrl, '/avatars/second')
const scope = phoneStoryScope(group.identities)
const xml = `<reverie-phone from="character:second" to="character:third" scope="${scope}">Meet by the door.</reverie-phone>`
assert.equal(parsePhoneActivities(xml).length, 1, 'Explicit group character IDs must survive XML delivery')
assert.equal(resolvePhoneParticipant(parsePhoneActivities(xml)[0].to, group.identities)?.name, 'Member third')
assert(phoneStoryProtocol(group.identities).includes('character:second'), 'The story model sees exact group participant IDs')
assert(phoneToolProtocol({ identities: group.identities, scope, token: 'test' }).includes('character:third'), 'Native tools also receive unique group IDs')
let toolMarkup = ''
const toolBridge = createPhoneToolBridge({ allowed: async () => true, commit: async (session, terminal) => { toolMarkup = appendPhoneToolEvents(terminal.content, session) } })
const toolContext = { userId: 'group-user', chatId: 'group', generationId: 'group-native-text' }
toolBridge.start(toolContext, toolContext.userId)
const toolSession = toolBridge.open(toolContext, group.identities)
assert(toolSession)
assert.equal(JSON.parse(await toolBridge.invoke({ toolName: PHONE_TEXT_TOOL, args: { session: toolSession.token, event_id: 'member-text', from: 'character:second', to: 'character:third', body: 'Bring the green notebook.' } }, toolContext.userId)).status, 'staged')
assert.equal(toolSession.events[0]?.from, 'character:second', 'The staged native event must retain the exact group sender')
assert.equal(toolSession.events[0]?.to, 'character:third', 'The staged native event must retain the exact group recipient')
await toolBridge.finish({ ...toolContext, messageId: 'group-native-message', content: 'A quiet story beat.' }, toolContext.userId)
assert.equal(parsePhoneActivities(toolMarkup)[0]?.from, 'character:second', 'Native tool delivery must preserve the exact group sender instead of collapsing to the first character')
assert.equal(parsePhoneActivities(toolMarkup)[0]?.to, 'character:third', 'Native tool delivery must preserve the exact group recipient')
history = [{ id: 'group-text', role: 'assistant', content: xml, swipe_id: 0 }]
spindle.chat.getMessages = async chatId => chatId === 'group' ? history : []
const delivered = await load('group')
assert.equal(delivered.state.messages.length, 1, 'Saved group XML delivers a real phone message')
assert.equal(delivered.state.messages[0].from, 'character:second')
assert.equal(delivered.state.messages[0].to, 'character:third')
const single = await load('single')
assert.deepEqual(single.identities.map(person => person.id), ['character:first', 'persona:reader'], 'A separate single chat cannot inherit group phones')
const dom = new JSDOM('<body></body>', { url: 'http://localhost/', pretendToBeVisual: true }); globalThis.window = dom.window; globalThis.document = dom.window.document
const widgets = [], handlers = [], sent = []
const phone = mountPhoneWidget({ getActiveChat: () => ({ chatId: 'group' }), sendToBackend: message => sent.push(message), onBackendMessage: handler => { handlers.push(handler); return () => {} }, events: { on: () => () => {} }, ui: { createFloatWidget(options) { const root = document.createElement('div'); document.body.append(root); const widget = { root, options, setVisible() {}, destroy() { root.remove() } }; widgets.push(widget); return widget } } })
phone.open(); handlers[0]({ ...group, operationId: sent.at(-1).operationId })
const shadow = widgets.at(-1).root.shadowRoot
const selector = shadow.querySelector('select[aria-label="Phone owner"]') || [...shadow.querySelectorAll('select')].find(select => select.options.length === 4)
assert(selector, 'The mounted owner dropdown must show all four phone owners')
assert.deepEqual([...selector.options].map(option => option.value), group.identities.map(person => person.id))
selector.value = 'character:third'; selector.dispatchEvent(new window.Event('change', { bubbles: true }))
assert(widgets.at(-1).root.shadowRoot.textContent.includes('Member third'))
assert([...widgets.at(-1).root.shadowRoot.querySelectorAll('.app-label')].some(label => label.textContent === 'Instagram'), 'Instagram belongs on the first home page, rather than being buried after 23 core apps')
assert(sent.every(message => message.action === 'load'), 'Listing/switching phones cannot generate or send anything')
phone.destroy(); dom.window.close()
console.log('Group phones regression passed: backend membership, routing protocols, mounted owner selector, Instagram home placement and single-chat isolation')
