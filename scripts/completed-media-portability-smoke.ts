// @ts-nocheck -- actual backend with a deterministic user-scoped storage host.
import assert from 'node:assert/strict'
import { compactCompletedRecord, stripCompletedRecord } from '../src/completedState'
import { forkCompletedMedia } from '../src/forkMedia'
const storage = new Map(), events = new Map(), chats = new Map(), messages = new Map()
let generationCalls = 0
globalThis.spindle = {
  on(name, handler) { events.set(name, handler) }, onFrontendMessage() {}, registerInterceptor() {}, registerMacro() {}, registerMessageContentProcessor() {}, sendToFrontend() {},
  log: { info() {}, warn() {}, error() {} }, permissions: { has: () => true },
  userStorage: { async getJson(path, { fallback } = {}) { return structuredClone(storage.get(path) ?? fallback) }, async setJson(path, value) { storage.set(path, structuredClone(value)) }, async mkdir() {} },
  chats: { async get(id) { return chats.get(id) } }, chat: { async getMessages(id) { return messages.get(id) || [] } },
  imageGen: { async generate() { generationCalls++; throw Error('Recovery must never generate') } },
}
const backend = await import('../src/backend')
const record = (id, messageId = 'original') => ({ key: `parent:${messageId}:0:${id}:illustration`, chatId: 'parent', messageId, swipeId: 0,
  requestId: id, slot: 'illustration', target: 'prose.illustration', targetApp: 'prose', status: 'completed', imageId: `image-${id}`, imageUrl: `/images/${id}.png`,
  originalSceneBrief: 'Two adults hold a box.', originalRequestXml: '', originalNegativePrompt: '', resolvedPositivePrompt: 'Final provider prompt.',
  proseSynthetic: true, proseAnchor: { messageId, swipeId: 0, paragraphIndex: 0, insertionSide: 'after', selectedExcerpt: 'Two adults hold a box.' },
  alt: 'Moving a box', count: 1, createdAt: 10, updatedAt: 20, completedAt: 20, history: [], promptPipeline: { finalProviderPrompt: 'Final provider prompt.' } })
const full = record('old')
const compact = compactCompletedRecord(full)
assert.deepEqual(compact.proseAnchor, full.proseAnchor)
assert.equal(compact.proseSynthetic, true)
assert.equal(compact.resolvedPositivePrompt, undefined, 'render catalog must not ship heavy prompts')
const cold = backend.renderSnapshotRecords({ slots: {}, completedArchive: { [full.key]: compact } })[0]
assert.equal(cold.proseAnchor.messageId, 'original')
assert.equal(cold.diagnosticArchiveId, compact.diagnosticArchiveId)
assert.equal(cold.imageUrl, full.imageUrl)
const parentMessages = [{ id: 'original', index_in_chat: 3, is_user: false, content: 'Two adults hold a box.', swipe_id: 0, swipes: ['Two adults hold a box.', 'Different swipe.'] }]
const branchMessages = [{ ...parentMessages[0], id: 'copy' }]
const inherited = forkCompletedMedia(parentMessages, branchMessages, [full], 'branch')[0]
assert.equal(inherited.key, 'branch:copy:0:old:illustration')
assert.equal(inherited.proseAnchor.messageId, 'copy')
assert.equal(inherited.imageId, full.imageId)
assert.equal(full.proseAnchor.messageId, 'original', 'source is immutable')
assert.equal(forkCompletedMedia(parentMessages, [{ ...branchMessages[0], content: 'Edited.', swipes: ['Edited.'] }], [full], 'branch').length, 0)
assert.equal(forkCompletedMedia(parentMessages, [{ ...branchMessages[0], swipes: ['Stale active copy.'] }], [full], 'branch').length, 1,
  'canonical active content owns equality even if its cached swipe copy is stale')
assert.equal(forkCompletedMedia(parentMessages, [{ ...branchMessages[0], content: 'Edited active story.', swipes: parentMessages[0].swipes }], [full], 'branch').length, 0,
  'a stale saved swipe cannot authorize parent media after the active branch content was edited')
assert.equal(forkCompletedMedia(parentMessages, [{ ...branchMessages[0], content: '' }], [full], 'branch').length, 0,
  'cleared active content cannot recover media from its stale swipe array')
assert.equal(forkCompletedMedia(parentMessages, branchMessages, [{ ...full, swipeId: 1 }], 'branch').length, 1,
  'unchanged inactive swipes still inherit their own completed media')
assert.equal(forkCompletedMedia(parentMessages, [{ ...branchMessages[0], index_in_chat: 4 }], [full], 'branch').length, 0)
assert.equal(forkCompletedMedia(parentMessages, branchMessages, [{ ...full, status: 'generating' }], 'branch').length, 0)

chats.set('parent', { id: 'parent', metadata: {} })
chats.set('branch', { id: 'branch', metadata: { branched_from: 'parent', branch_at_message: 'original' } })
messages.set('parent', parentMessages); messages.set('branch', branchMessages)
const archive = {}; for (let i = 0; i < 32; i++) {
  const row = record(`shot-${i}`)
  const old = compactCompletedRecord(row)
  delete old.renderMetadataVersion; delete old.proseAnchor; delete old.proseSynthetic
  archive[row.key] = old
  storage.set(backend.completedDiagnosticPath('parent', old.diagnosticArchiveId), { record: row })
}
storage.set('states/parent.json', { slots: {}, completedArchive: archive })
const ghost = { ...record('shot-0', 'copy'), key: 'branch:copy:0:shot-0:illustration', chatId: 'branch', status: 'recovered-pending', imageId: undefined, imageUrl: undefined }
storage.set('states/branch.json', { slots: { [ghost.key]: ghost }, completedArchive: {} })
await Promise.all([backend.inheritForkCompletedMedia('branch', 'user'), backend.inheritForkCompletedMedia('branch', 'user')])
const restored = storage.get('states/branch.json')
assert.equal(Object.keys(restored.completedArchive).length, 32)
assert.equal(Object.keys(restored.slots).length, 24, 'hot drawer remains bounded')
assert.equal(backend.renderSnapshotRecords(restored).length, 32, 'cold rendering retains evicted completions')
assert(backend.renderSnapshotRecords(restored).every(row => row.proseSynthetic && row.proseAnchor.messageId === 'copy'))
assert(backend.renderSnapshotRecords(restored).every(row => row.status === 'completed'))
const first = Object.values(restored.completedArchive)[0]
assert.equal(storage.get(backend.completedDiagnosticPath('branch', first.diagnosticArchiveId)).record.resolvedPositivePrompt, 'Final provider prompt.')
await backend.inheritForkCompletedMedia('branch', 'user')
assert.equal(Object.keys(storage.get('states/branch.json').completedArchive).length, 32, 'idempotent')
assert.equal(generationCalls, 0)
console.log('Completed media portability passed: 32 archived images, cold projection, old archive migration, exact fork/swipe remap, archived prompts, concurrency and zero provider calls.')
