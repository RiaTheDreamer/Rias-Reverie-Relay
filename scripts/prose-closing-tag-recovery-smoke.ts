// @ts-nocheck -- real discovery path with in-memory host APIs, no providers.
import assert from 'node:assert/strict'
import { normalizeProseIllustrationContracts, parseImageRequests } from '../src/contracts'

const request = (slot: string) => `<reverie-illustration request="generate" slot="${slot}" aspect="5:4" cast="char+user"><visual_prompt>1boy, navy_hoodie, sitting, 1girl, cream_cardigan, standing, behind_another, hands_on_shoulders</visual_prompt>`
const raw = `Taehyun sits upright. Arin rests both hands on his shoulders.\n\n${request('shoulders')}\n\nShe steps to his left. Each holds one cup.\n\n${request('cups')}`
const canonical = raw.replaceAll('</visual_prompt>', '</visual_prompt></reverie-illustration>')
const recover = (value: string) => normalizeProseIllustrationContracts(value, { completedResponse: true })
assert.equal(normalizeProseIllustrationContracts(raw).markup, raw, 'read-only/default normalization must never finish a streaming request')
assert.equal(recover(raw).markup, canonical, 'completed standalone requests with complete prompts need only their missing outer closers')
assert.equal(recover(raw).repairs.filter(row => row.code === 'REPAIRED_PROSE_ILLUSTRATION_CLOSING_TAG').length, 2)
assert.equal(recover(canonical).markup, canonical, 'recovery must be idempotent')
assert.equal(recover(canonical).repairs.length, 0)
assert.equal(parseImageRequests(canonical).length, 2)
const single = request('single')
assert.equal(recover(single).markup, `${single}</reverie-illustration>`, 'a completed request at EOF is an explicit boundary')
const validThenMissing = `${request('valid')}</reverie-illustration>\n\n${request('missing')}`
assert.equal(recover(validThenMissing).repairs.length, 1, 'a valid sibling stays unchanged while the missing final closer recovers')
for (const [name, value] of [
  ['partial prompt', request('partial').replace('</visual_prompt>', '')],
  ['empty prompt', request('empty').replace(/<visual_prompt>.*<\/visual_prompt>/, '<visual_prompt></visual_prompt>')],
  ['missing slot', request('bad').replace(' slot="bad"', '')],
  ['bad aspect', request('bad').replace('5:4', 'not-an-aspect')],
  ['duplicate attribute', request('bad').replace('cast="char+user"', 'cast="char+user" cast="char"')],
  ['unquoted attributes', request('bad').replace('cast="char+user"', 'cast=char+user')],
  ['nested visual markup', request('nested').replace('1boy,', '<b>1boy</b>,')],
  ['extra child', `${request('extra')}<negative_prompt>blur</negative_prompt>`],
  ['mismatched wrapper', `<unknown>${request('wrapped')}`],
  ['narrative owner', `<NPC>${request('npc')}</NPC>`],
  ['crossed Media boundary', `${request('media')}\n\n</Media>`],
  ['no narrative boundary', `${request('boundary')}Story continues on the same line.`],
  ['duplicate slot', `${request('duplicate')}\n\n${request('duplicate')}`],
  ['inline example', `Example: \`${request('inline')}\``],
  ['fenced example', `\`\`\`xml\n${request('fence')}\n\`\`\``],
  ['unclosed fence', `~~~xml\n${request('fence')}`],
  ['ambiguous existing closer', `${request('ambiguous')}\n\nStory text.\n</reverie-illustration>`],
] as const) assert.equal(recover(value).markup, value, `${name} must stay unchanged`)

const storage = new Map(), messages = new Map(), output = []
let handler, writes = 0, providerCalls = 0
const forbid = () => { providerCalls++; throw Error('Discovery must not spend') }
globalThis.spindle = {
  registerInterceptor() {}, registerMacro() {}, registerMessageContentProcessor() {}, on() {},
  onFrontendMessage(fn) { handler = fn }, sendToFrontend(value) { output.push(value) },
  permissions: { has: () => true }, log: { info() {}, warn() {}, error() {} },
  userStorage: { async mkdir() {}, async getJson(path, { fallback } = {}) { return structuredClone(storage.get(path) ?? fallback ?? {}) }, async setJson(path, value) { storage.set(path, structuredClone(value)) } },
  chat: { async getMessages(chatId) { return [structuredClone(messages.get(chatId))] }, async updateMessage(chatId, messageId, patch) {
    const message = messages.get(chatId); assert.equal(message.id, messageId); writes++
    Object.assign(message, structuredClone(patch))
    if (typeof patch.content === 'string') message.swipes[message.swipe_id] = patch.content
  } },
  chats: { async get() { return null } }, characters: { async get() { return null } }, personas: { async getActive() { return null } },
  world_books: { async getActivated() { return [] }, entries: { async get() { return null } } },
  connections: { async list() { return [] } }, imageGen: { async listConnections() { return [] }, async listProviders() { return [] }, generate: forbid }, generate: { raw: forbid },
  variables: { global: { async set() {} }, chat: { async set() {} } },
}
const backend = await import('../src/backend')
const userId = 'prose-close-user', chatId = 'prose-close-chat', messageId = 'prose-close-message'
await backend.setConfig({ enabled: true, autoGenerate: false, phoneEnabled: false, storyConstellationsEnabled: false, appearanceSidecarEnabled: false,
  followNativeParser: false, followNativeImageGen: false, proseIllustratorSettings: { enabled: true, mode: 'inline-protocol', instantIllustrationDispatch: true } }, userId)
messages.set(chatId, { id: messageId, role: 'assistant', is_user: false, content: raw, swipe_id: 1, swipes: ['Unrelated inactive swipe.', raw] })
async function scan(streaming: boolean, expectedCount: number) {
  const start = output.length
  handler({ type: 'scan_message', chatId, messageId, swipeId: 1, sourceContent: raw, automatic: !streaming, streaming }, userId)
  for (let tick = 0; tick < 600; tick++) {
    const rows = output.slice(start), error = rows.find(row => row.type === 'error')
    assert(!error, error?.message)
    const state = rows.findLast(row => row.type === 'state' && row.chatId === chatId && row.records?.length === expectedCount)
    if (state) return state
    await new Promise(resolve => setTimeout(resolve, 5))
  }
  throw Error(`Scan did not settle at ${expectedCount} records`)
}
await scan(true, 0)
assert.equal(writes, 0, 'instant scans must not close/persist an unfinished outer request')
const first = await scan(false, 2)
assert.equal(messages.get(chatId).content, canonical, 'canonical repair must persist before jobs snapshot exact source')
assert.equal(messages.get(chatId).swipes[0], 'Unrelated inactive swipe.')
assert.equal(writes, 1)
for (const request of parseImageRequests(canonical)) {
  const record = first.records.find(row => row.requestId === request.id)
  assert(record)
  assert.equal(record.originalRequestXml, request.fullMatch)
  assert.equal(record.originalSceneBrief, request.prompt)
  assert.equal(record.swipeId, 1)
  assert(backend.hasExactStateProjectionOwner(canonical, { requestId: record.requestId, target: record.target, slots: [record.slot] }))
}
await scan(false, 2)
assert.equal(writes, 1, 'replay must not rewrite canonical source or create duplicates')
assert.equal(providerCalls, 0)
console.log('PASS completed-only prose closer recovery: two real slots, exact prompt/owner/swipe persistence, replay idempotence, malformed/code/wrapper/stream guards, zero provider calls.')
