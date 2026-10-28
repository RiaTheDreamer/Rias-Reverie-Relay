// @ts-nocheck -- historical request isolation at the actual planner input seam.
import assert from 'node:assert/strict'
import { phoneRpContext } from '../src/phoneRpContext'
import { phoneAppReplyPrompt } from '../src/phoneAppInteractions'

const historyText = 'Liam wears a blue coat by the archive window.'
const artifacts = [
  '<image_request id="old" target="custom.artifact-media" slot="old"><scene_brief>obsolete-request-trait</scene_brief></image_request>',
  '[reverie_illustration slot="old"][visual_prompt]obsolete-request-trait[/visual_prompt][/reverie_illustration]',
  '<scene_image>obsolete-request-trait</scene_image>',
  '![reverie-relay](/api/v1/image-gen/results/obsolete-request-trait)',
  '<img data-dgir-key="old" src="/api/v1/images/obsolete-request-trait">',
  '<image_request id="old"><scene_brief>obsolete-request-trait</scene_brief>',
  '<reverie-illustration slot="old"><visual_prompt>obsolete-request-trait</visual_prompt>',
]
const stored = new Map()
const parserRequests = []
const storage = { async getJson(path, { fallback } = {}) { return structuredClone(stored.get(path) ?? fallback) }, async setJson(path, value) { stored.set(path, structuredClone(value)) }, async mkdir() {} }
globalThis.spindle = {
  on() {}, onFrontendMessage() {}, registerInterceptor() {}, registerMacro() {}, registerMessageContentProcessor() {}, sendToFrontend() {},
  permissions: { has: () => true }, storage, userStorage: storage, log: { info() {}, warn() {}, error() {} },
  chats: { async get(id) { return { id, metadata: {} } } }, characters: { async get() { return null } }, personas: { async getActive() { return null } },
  chat: { async getMessages() { return [{ id: 'old', role: 'assistant', content: `${historyText}\n${artifacts.join('\n')}`, swipe_id: 0 }, { id: 'new', role: 'assistant', content: 'Liam opens the archive door.', swipe_id: 0 }] } },
  world_books: { async getActivated() { return [] }, entries: { async get() { return null } } }, variables: { global: { async set() {} }, chat: { async set() {} } },
  connections: { async get(id) { return { id, provider: 'fixture', model: 'fixture' } }, async list() { return [] } },
  generate: { async raw(request) { parserRequests.push(structuredClone(request)); return { content: JSON.stringify({ prompt: 'Empty sunlit archive interior with a silver folder on the wooden table.', negative_prompt: '' }) } } }, imageGen: { async generate() { assert.fail('history projection must not regenerate images') } },
}
const backend = await import('../src/backend')
for (const artifact of artifacts) {
  const result = backend.sanitizeRecentVisualContext(`${historyText}\n${artifact}`, 2000)
  assert.match(result, /Liam wears a blue coat/, 'real story context must survive')
  assert.doesNotMatch(result, /obsolete-request-trait|image_request|reverie[_-]illustration|data-dgir|\/api\/v1\//, 'historical media text must not become visual evidence')
  for (const [workflow, clean] of [['Phone', phoneRpContext([{ role: 'assistant', content: `${historyText}\n${artifact}` }])]]) {
    assert.match(clean, /Liam wears a blue coat/, `${workflow} lost actual narrative`)
    assert.doesNotMatch(clean, /obsolete-request-trait/, `${workflow} still receives historical media instructions`)
  }
  const appReply = phoneAppReplyPrompt({ id: 'liam', name: 'Liam', kind: 'character' }, `${historyText}\n${artifact}`, [], [], historyText)
  assert.doesNotMatch(JSON.stringify(appReply), /obsolete-request-trait/, 'Phone app replies must exclude image instructions embedded in the selected source record')
}
assert.match(backend.sanitizeRecentVisualContext(`${historyText}\n<image_request id="old"><scene_brief>OOC obsolete-request-trait</scene_brief></image_request>`), /Liam wears a blue coat/, 'an old request must not cause real narrative to be filtered as OOC')
assert.match(backend.sanitizeRecentVisualContext(`<reverie-illustration slot="old"/>\n${historyText}`), /Liam wears a blue coat/, 'a self-closing request must not eat following narrative')
const settings = { ...backend.defaultProseIllustratorSettings(), enabled: true, contextMessageCount: 4, appearanceMemoryEnabled: false }
const messages = await backend.buildProsePlannerMessages('context-chat', 'new', 0, 'Liam opens the archive door.', ['Liam opens the archive door.'], settings, 'context-user')
assert.match(JSON.stringify(messages), /Liam wears a blue coat/, 'actual planner payload lost its narrative history')
assert.doesNotMatch(JSON.stringify(messages), /obsolete-request-trait/, 'actual planner payload leaked old request or resolved-image text')
assert.equal(parserRequests.length, 0, 'building context must not start a model')
const config = await backend.setConfig({ parserConnectionId: 'context-parser', followNativeParser: false, includeLorebook: false }, 'context-user')
const requestXml = '<image_request id="current" target="kakao.image" slot="photo"><scene_brief>Empty sunlit archive interior.</scene_brief></image_request>'
const sourceContent = `<kakao_chat title="Archive"><messages><scene_image>obsolete-request-trait</scene_image>${requestXml}</messages></kakao_chat>`
const job = { chatId: 'context-chat', messageId: 'new', swipeId: 0, requestId: 'current', target: 'kakao.image', slots: ['photo'], originalRequestXml: requestXml, originalSceneBrief: 'Empty sunlit archive interior.', originalNegativePrompt: '', sourceContent, count: 1, aspect: '4:3', alt: 'Archive', caption: '' }
await backend.parseSlotPrompt(job, 'photo', [], 0, config, 'context-user', {})
assert(parserRequests.length > 0, 'actual Surface parser seam must be exercised')
assert.doesNotMatch(JSON.stringify(parserRequests), /obsolete-request-trait/, 'Surface artifact context leaked a previous image description')
assert.match(JSON.stringify(parserRequests), /Empty sunlit archive interior/, 'the current image request must retain its own scene instructions')
assert.equal(job.sourceContent, sourceContent, 'context isolation must not rewrite saved source')
console.log('PASS historical media context: XML, brackets, scene-image, resolved Markdown/HTML, OOC isolation, planner/Phone and actual Surface parser payload. Saved messages untouched; providers mocked.')
process.exit(0)
