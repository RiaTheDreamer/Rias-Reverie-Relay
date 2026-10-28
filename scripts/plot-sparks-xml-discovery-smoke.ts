// @ts-nocheck -- production scan/replay with in-memory Lumiverse APIs only.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { PLOT_SPARK_VECTOR_BY_KEY, parseImageRequests } from '../src/contracts'
import { PLOT_SPARKS_XML_REPAIR_EXAMPLE, normalizePlotSparksXmlClosingTags } from '../src/plotSparksContract'

let optionIndex = 0
const generatedBoard = PLOT_SPARKS_XML_REPAIR_EXAMPLE.replace(/<Media><\/Media>/g, () => {
  const key = Object.keys(PLOT_SPARK_VECTOR_BY_KEY)[optionIndex++]
  return `<Media><reverie-illustration request="generate" slot="discovery-${key}" aspect="16:9" cast="none" alt="Scene detail"><visual_prompt>A distinct established object on the table, in soft evening light.</visual_prompt></reverie-illustration></Media>`
})
// An optional private evidence path is read only and never copied into the repo.
const raw = process.argv[2] ? readFileSync(process.argv[2], 'utf8') : generatedBoard.replaceAll('</reverie-illustration>', '')
const canonical = normalizePlotSparksXmlClosingTags(raw)
const expectedRequests = parseImageRequests(canonical)
assert.equal(expectedRequests.length, 10, 'fixture must contain ten recoverable complete prompts')
const storage = new Map<string, unknown>()
const messages = new Map<string, any>()
const events: any[] = []
let handler: ((payload: any, userId?: string) => void) | undefined
let writes = 0, providerCalls = 0
const forbidProvider = () => { providerCalls++; throw new Error('Discovery must not call a model or image provider') }
globalThis.spindle = {
  registerInterceptor() {}, registerMacro() {}, registerMessageContentProcessor() {}, on() {},
  onFrontendMessage(fn) { handler = fn }, sendToFrontend(payload) { events.push(payload) },
  permissions: { has: () => true }, log: { info() {}, warn() {}, error() {} },
  userStorage: {
    async mkdir() {},
    async getJson(path, { fallback } = {}) { return structuredClone(storage.get(path) ?? fallback ?? {}) },
    async setJson(path, value) { storage.set(path, structuredClone(value)) },
  },
  chat: {
    async getMessages(chatId) { return messages.has(chatId) ? [structuredClone(messages.get(chatId))] : [] },
    async updateMessage(chatId, messageId, patch) {
      const message = messages.get(chatId)
      assert.equal(message.id, messageId)
      writes++
      Object.assign(message, structuredClone(patch))
      if (typeof patch.content === 'string') message.swipes[message.swipe_id] = patch.content
      if (patch.swipes) message.content = patch.swipes[message.swipe_id]
    },
  },
  chats: { async get() { return null } }, characters: { async get() { return null } }, personas: { async getActive() { return null } },
  world_books: { async getActivated() { return [] }, entries: { async get() { return null } } },
  connections: { async list() { return [] } },
  imageGen: { async listConnections() { return [] }, async listProviders() { return [] }, generate: forbidProvider },
  generate: { raw: forbidProvider },
  variables: { global: { async set() {} }, chat: { async set() {} } },
}
const backend = await import('../src/backend')
const userId = 'xml-discovery-user'
await backend.setConfig({ enabled: true, autoGenerate: false, autoRescanOnChatOpen: true, phoneEnabled: false, storyConstellationsEnabled: false, appearanceSidecarEnabled: false, followNativeParser: false, followNativeImageGen: false }, userId)
function addMessage(chatId: string) {
  messages.set(chatId, { id: 'xml-discovery-message', role: 'assistant', is_user: false, content: raw, swipe_id: 1, swipes: ['Unrelated inactive swipe.', raw] })
}
async function scan(chatId: string, expectedCount: number) {
  const start = events.length
  handler!({ type: 'scan_message', chatId, messageId: 'xml-discovery-message', swipeId: 1, automatic: true }, userId)
  const deadline = Date.now() + 3000
  while (Date.now() < deadline) {
    const output = events.slice(start)
    const failure = output.find(event => event.type === 'error')
    assert(!failure, failure?.message)
    const state = output.findLast(event => event.type === 'state' && event.chatId === chatId && event.records?.length === expectedCount
      && (expectedCount === 0 || event.logs?.some(log => log.eventType === 'manual_slot_registered')))
    if (state) return state
    await new Promise(resolve => setTimeout(resolve, 5))
  }
  throw new Error(`Scan did not register ${expectedCount} expected slots`)
}
addMessage('xml-discovery-on')
const first = await scan('xml-discovery-on', 10)
assert.equal(messages.get('xml-discovery-on').content, canonical, 'scan must persist only the validated closing-tag insertion')
assert.equal(messages.get('xml-discovery-on').swipes[0], 'Unrelated inactive swipe.', 'scan must not change another swipe')
assert.equal(writes, 1, 'initial recovery should use one host update')
assert.equal(new Set(first.records.map(record => record.key)).size, 10)
for (const request of expectedRequests) {
  const record = first.records.find(record => record.requestId === request.id)
  assert(record, `missing record for ${request.id}`)
  assert.equal(record.originalSceneBrief, request.prompt, 'registration must preserve the actual visual prompt')
  assert.equal(record.originalRequestXml, request.fullMatch, 'registration must snapshot the complete repaired image request')
  assert.equal(record.target, 'custom.artifact-media', 'recovered Spark cannot become an inline Storyboard request')
  assert.equal(record.swipeId, 1, 'registration must retain exact swipe ownership')
  assert(backend.hasExactStateProjectionOwner(messages.get('xml-discovery-on').content, { requestId: record.requestId, target: record.target, slots: [record.slot] }))
}
const replay = await scan('xml-discovery-on', 10)
assert.deepEqual(replay.records.map(record => record.key).sort(), first.records.map(record => record.key).sort(), 'replay cannot register duplicate slots')
assert.equal(writes, 1, 'idempotent replay cannot rewrite the message again')
await backend.setConfig({ narrativeUtilityImageEnabled: { 'Plot Sparks': false } }, userId)
addMessage('xml-discovery-off')
await scan('xml-discovery-off', 0)
assert.equal(providerCalls, 0, 'register-only discovery and Images Off must never spend on a model or provider')
console.log('Plot Sparks XML discovery passed: actual scan registration, exact source/swipe persistence, ten prompt/owner snapshots, idempotent replay, Images Off and zero provider calls.' + (process.argv[2] ? ' Supplied evidence payload exercised.' : ''))
