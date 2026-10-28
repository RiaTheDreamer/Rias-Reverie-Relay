// @ts-nocheck -- real streaming discovery/dispatch; deterministic providers.
import assert from 'node:assert/strict'
const mode = process.argv[2] || 'on'
const earlyResult = mode.startsWith('early-')
const relaySurface = mode === 'relay-surface'
const userId = 'instant-provider-user', chatId = 'instant-provider-chat', messageId = 'streaming-story'
const stored = new Map(), events = new Map(), output = []
let receive, writes = 0, imageCalls = 0, activeImages = 0, maxImages = 0, releaseImages
let message = null
const imagesGate = new Promise(resolve => { releaseImages = resolve })
const connection = { id: 'image', provider: 'fixture', model: 'fixture', default_parameters: {} }
const storage = { async mkdir() {}, async getJson(path, { fallback } = {}) { return structuredClone(stored.get(path) ?? fallback) }, async setJson(path, value) { stored.set(path, structuredClone(value)) } }
globalThis.spindle = {
  on(name, callback) { events.set(name, callback) }, onFrontendMessage(callback) { receive = callback },
  registerInterceptor() {}, registerMacro() {}, registerMessageContentProcessor() {}, unregisterTool() {},
  permissions: { has: () => true }, storage, userStorage: storage, sendToFrontend(value) { output.push(structuredClone(value)) },
  log: { info() {}, warn() {}, error() {} },
  chats: { async get() { return { id: chatId, metadata: {} } } }, characters: { async get() { return null } }, personas: { async getActive() { return null } },
  chat: { async getMessages() { return message ? [structuredClone(message)] : [] }, async updateMessage(_chat, _id, patch) {
    assert(message, 'streaming generation cannot create or rewrite a missing saved message')
    writes++; Object.assign(message, structuredClone(patch))
    if (patch.content !== undefined) message.swipes[0] = patch.content
  } },
  connections: { async list() { return [] }, async get(id) { return { id, name: id, provider: 'fixture', model: 'fixture' } } },
  variables: { global: { async set() {} }, chat: { async set() {} } }, world_books: { async getActivated() { return [] }, entries: { async get() { return null } } },
  images: { async get(id) { return { id, url: `/api/v1/images/${id}`, metadata: {} } }, async update() {} },
  imageGen: { async listConnections() { return [connection] }, async getConnection() { return connection }, async getProviders() { return [] }, async generate() {
    const id = ++imageCalls; maxImages = Math.max(maxImages, ++activeImages)
    await imagesGate; activeImages--
    return { imageId: `instant-${id}`, imageUrl: `/instant-${id}.png` }
  } },
  generate: { async raw() { return { content: JSON.stringify({ prompt: 'Empty sunlit room, blue mug left of a closed yellow notebook on a wooden table, window above an unoccupied bench, no people.', negativeAdditions: '' }) } } },
}
const backend = await import('../src/backend')
assert.equal(backend.defaultProseIllustratorSettings().instantIllustrationDispatch, true, 'Instant must default on for a new install')
assert.equal(backend.normalizeProseIllustratorSettings({}).instantIllustrationDispatch, true, 'unset legacy preference inherits the on default')
assert.equal(backend.normalizeProseIllustratorSettings({ instantIllustrationDispatch: false }).instantIllustrationDispatch, false, 'explicit off remains off')
await backend.setConfig({ enabled: true, autoGenerate: mode !== 'auto-off', phoneEnabled: false, storyConstellationsEnabled: false,
  surfaceUtilityInjectionEnabled: false, narrativeDlcEnabled: false, followNativeImageGen: false, generationSettingsSource: 'relay', imageConnectionId: 'image',
  followNativeParser: false, parserConnectionId: 'parser', parserRetries: 0, queueConcurrencyLimit: 4,
  proseIllustratorSettings: { enabled: true, mode: relaySurface ? 'relay-planned' : 'inline-protocol', instantIllustrationDispatch: mode !== 'off', appearanceMemoryEnabled: false,
    defaultAspectRatio: '4:3', promptFormat: 'natural-language' } }, userId)
const state = () => stored.get(`states/${chatId}.json`)
async function until(check, label) {
  for (let tick = 0; tick < 600; tick++) { if (check()) return; await new Promise(resolve => setTimeout(resolve, 5)) }
  assert.fail(`${label}: ${JSON.stringify({ imageCalls, writes, slots: Object.values(state()?.slots || {}).map(row => ({ status: row.status, error: row.error })), errors: output.filter(row => row.type === 'error').slice(-2) })}`)
}
const request = slot => relaySurface
  ? `<image_request id="${slot}" target="custom.artifact-media" slot="${slot}" aspect="4:3" alt="Empty room"><scene_brief>Empty sunlit room, blue mug left of a closed yellow notebook on a wooden table, no people.</scene_brief></image_request>`
  : `<reverie-illustration request="generate" slot="${slot}" aspect="4:3" cast="none" alt="Empty room"><visual_prompt>Empty sunlit room, blue mug left of a closed yellow notebook on a wooden table, window above an unoccupied bench, no people.</visual_prompt></reverie-illustration>`
const first = `The blue mug stands left of a closed yellow notebook on the empty table.\n\n${request('first')}`
const scan = sourceContent => receive({ type: 'scan_message', chatId, messageId, swipeId: 0, sourceContent, automatic: false, streaming: true }, userId)
scan(first.slice(0, -1))
await new Promise(resolve => setTimeout(resolve, 30))
assert.equal(imageCalls, 0, 'unfinished requests cannot generate during streaming')
scan(first)
if (mode !== 'on' && !earlyResult && !relaySurface) {
  await new Promise(resolve => setTimeout(resolve, 70))
  assert.equal(imageCalls, 0, 'Instant off and Auto Generate off must forbid early image spend')
  assert.equal(writes, 0)
  console.log(`PASS Story Model Instant ${mode}: no early provider call or partial saved-message mutation. Providers mocked.`)
  process.exit(0)
}
await until(() => imageCalls === 1, 'first complete authored request must reach ImageGen before any GENERATION_ENDED')
assert.equal(message, null)
assert.equal(writes, 0, 'early generation must not persist a partial story')
const full = `${first}\n\nThe bench remains empty under the open window.\n\n${request('second')}`
if (earlyResult) {
  if (mode === 'early-empty-row') message = { id: messageId, role: 'assistant', is_user: false, content: '', swipes: [''], swipe_id: 0, extra: {} }
  releaseImages()
  await until(() => Object.values(state()?.slots || {}).some(row => row.pendingPlacement?.imageId === 'instant-1' || row.imageId === 'instant-1'), 'fast image result survives before the story has a saved message')
  if (mode !== 'early-empty-row') assert.equal(message, null)
  assert.equal(writes, 0, 'a fast result must never create a partial saved story')
}
scan(full)
await until(() => Object.values(state()?.slots || {}).length === 2, 'a second complete streamed request gets its own slot')
if (mode === 'on' || relaySurface) assert.equal(imageCalls, 1, 'the GPU lane stays serialized while additional requests prepare')
else {
  await until(() => imageCalls === 2 && Object.values(state()?.slots || {}).every(row => row.pendingPlacement?.imageId || row.imageId), 'both fast results persist while the story continues streaming')
  await new Promise(resolve => setTimeout(resolve, 30))
  assert(Object.values(state().slots).every(row => row.status === 'placement-pending'), 'unfinished host bodies keep images pending without a false placement-repair error')
  assert.equal(writes, 0)
}
if (mode === 'early-abort') await receive({ type: 'queue_action', action: 'abort_all', chatId }, userId)
const saved = mode === 'early-source-changed' ? full.replace(request('first'), 'The first image request was removed before saving.') : full
message = { id: messageId, role: 'assistant', is_user: false, content: saved, swipes: [saved], swipe_id: 0, extra: {} }
events.get('GENERATION_ENDED')({ chatId, messageId, generationId: 'saved-final', generationType: 'normal', content: saved }, userId)
releaseImages()
if (mode === 'early-abort') {
  await new Promise(resolve => setTimeout(resolve, 150))
  assert(Object.values(state().slots).every(row => row.status === 'cancelled' && row.pendingPlacement?.imageId), 'Abort All preserves pixels and prevents automatic final placement')
  assert.equal(imageCalls, 2, 'late story completion cannot start a successor after Abort All')
  assert.equal(writes, 0)
  console.log('PASS Story Model Instant early-abort: both fast assets preserved, Abort All prevents automatic final placement and successor provider starts. Providers mocked.')
  process.exit(0)
}
if (mode === 'early-source-changed') {
  await until(() => Object.values(state()?.slots || {}).some(row => row.status === 'placement-repair-needed') && Object.values(state()?.slots || {}).some(row => row.status === 'completed'), 'only the still-authored request receives its exact asset')
  const firstSlot = Object.values(state().slots).find(row => row.slot === 'first')
  assert.equal(firstSlot.pendingPlacement.imageId, 'instant-1')
  assert.equal(imageCalls, 2)
  assert.equal(writes, 0)
  console.log('PASS Story Model Instant early-source-changed: removed owner is held for repair with its original pixels, unchanged owner completes, zero partial writes or replacement spend. Providers mocked.')
  process.exit(0)
}
await until(() => Object.values(state()?.slots || {}).filter(row => row.status === 'completed').length === 2, 'both images complete and attach to the saved response')
await new Promise(resolve => setTimeout(resolve, 90))
assert.equal(imageCalls, 2, 'completed-response discovery cannot regenerate the streamed requests')
assert.equal(maxImages, 1)
assert.equal(new Set(Object.values(state().slots).map(row => row.imageId)).size, 2)
console.log(`PASS Story Model Instant ${mode}: actual ImageGen begins before story completion, partial requests wait, two streamed slots complete exactly once, final save has no duplicate spend, provider lane remains serialized. ${earlyResult ? 'Both images returned before the story saved, with zero partial-message writes and automatic final placement. ' : ''}Providers mocked.`)
process.exit(0)
