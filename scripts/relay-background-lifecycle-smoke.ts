// @ts-nocheck -- production event -> Director -> image -> durable placement, no browser.
import assert from 'node:assert/strict'

const userId = 'background-user', chatId = 'background-chat'
const stored = new Map(), events = new Map(), outbound = [], errors = []
let receiveFrontend, directorCalls = 0, imageCalls = 0
let releaseDirector, releaseImage
let directorGate = Promise.resolve(), imageGate = Promise.resolve()
const useNative = process.argv.includes('--native')
const delayedSave = process.argv.includes('--delayed-save')
const reviewFirst = process.argv.includes('--review')
const emptyFirst = process.argv.includes('--empty-first')
const manual = process.argv.includes('--manual')
const reserveFirst = process.argv.includes('--reserve-first')
const withCover = process.argv.includes('--cover')
const callOffset = emptyFirst ? 1 : 0
let hideHistory = false
let forceEmpty = false
const beat = 'Mira stands beside the window holding a silver folder with both hands.'
const secondBeat = 'Mira sits alone on a wooden bench, with the closed silver folder flat on her own lap.'
const story = reserveFirst || withCover ? `${beat}\n\n${secondBeat}` : beat
const history = []
const connection = { id: 'image-fixture', name: 'Image fixture', provider: 'fixture', model: 'fixture', default_parameters: {} }
const storage = {
  async getJson(path, { fallback } = {}) { return structuredClone(stored.get(path) ?? fallback) },
  async setJson(path, value) { stored.set(path, structuredClone(value)) }, async mkdir() {},
}
globalThis.spindle = {
  on(name, callback) { events.set(name, callback) }, onFrontendMessage(callback) { receiveFrontend = callback },
  registerInterceptor() {}, registerMacro() {}, registerMessageContentProcessor() {}, unregisterTool() {},
  permissions: { has: () => true }, sendToFrontend(value) { outbound.push(value) }, storage, userStorage: storage,
  log: { info() {}, warn(value) { errors.push(value) }, error(value) { errors.push(value) } },
  chats: { async get(id) { return { id, character_id: 'mira-card', metadata: {} } } },
  characters: { async get() { return { id: 'mira-card', name: 'Mira' } } }, personas: { async getActive() { return null } },
  chat: { async getMessages() { return hideHistory ? [] : structuredClone(history) }, async updateMessage(chat, id, patch) {
    assert.equal(chat, chatId)
    const message = history.find(row => row.id === id)
    Object.assign(message, structuredClone(patch))
    if (patch.content !== undefined) message.swipes[message.swipe_id] = patch.content
    events.get('MESSAGE_EDITED')({ chatId, messageId: id, message: structuredClone(message) }, userId)
  } },
  connections: { async list() { return [{ id: 'director', name: 'Director', provider: 'fixture', model: 'fixture' }] }, async get() { return { id: 'director', name: 'Director', provider: 'fixture', model: 'fixture' } } },
  images: { async get(id) { return { id, url: `/api/v1/images/${id}`, metadata: {} } }, async update() {} },
  imageGen: {
    async listConnections() { return [connection] }, async getConnection() { return connection }, async getProviders() { return [] },
    async generate(request) { imageCalls++; await imageGate; return { imageId: `image-${imageCalls}`, imageUrl: `/background-${imageCalls}.png` } },
  },
  generate: { async raw(request) {
    directorCalls++; await directorGate
    if (forceEmpty || emptyFirst && directorCalls === 1) return { content: '', finish_reason: 'stop' }
    const firstShot = { rank: 1, title: 'Folder by window', reason: 'Saved beat.',
      anchor: { paragraphIndex: 0, insertionSide: 'after', anchorExcerpt: beat }, aspectRatio: '4:3', expectedPeopleCount: 1,
      namedSubjects: ['Mira'], omittedSubjects: [], subjectDirectives: [{ name: 'Mira', role: 'character', appearanceOverrides: [], attireOverrides: [], temporaryTraits: [], expression: 'calm', pose: 'standing beside the window', action: 'holding the silver folder with both hands', gaze: 'toward the window', contact: 'her hands hold the folder' }],
      composition: { shotType: 'medium shot', cameraAngle: 'eye level', framing: 'waist up', blocking: 'Mira beside the window', foreground: 'folder', background: 'window', location: 'room', timeOfDay: 'day', lighting: 'daylight', mood: 'quiet', importantProps: ['silver folder'], backgroundPeople: '' },
      promptCore: 'Eye-level medium view of Mira beside a sunlit room window, a silver document folder supported by both of her hands.', negativeCore: '', booruTags: [], referenceAssetIds: [], locationReferenceAssetIds: [] }
    const secondShot = { ...structuredClone(firstShot), rank: 2, title: 'Folder on the bench',
      anchor: { paragraphIndex: 1, insertionSide: 'after', anchorExcerpt: secondBeat },
      promptCore: 'Eye-level medium view of Mira seated upright on a wooden bench in the sunlit room, the closed silver document folder supported across her lap under both hands.',
      subjectDirectives: [{ ...firstShot.subjectDirectives[0], pose: 'seated alone on a wooden bench', action: 'resting both hands on the silver folder in her lap', contact: 'her own lap supports the folder' }] }
    const context = {openingFrame:withCover,maximumIllustrations:2}
    return JSON.stringify({ shouldIllustrate: true, reason: 'Saved beats.', illustrations: withCover
      ? [...(context.openingFrame ? [{...structuredClone(firstShot),placement:'opening',title:'The Silver Folder',anchor:{...firstShot.anchor,insertionSide:'opening'}}] : []), firstShot, ...(context.maximumIllustrations > 1 ? [secondShot] : [])]
      : reserveFirst ? [firstShot, secondShot] : [firstShot] })
  } }, variables: { global: { async set() {} }, chat: { async set() {} } }, world_books: { async getActivated() { return [] }, entries: { async get() { return null } } },
}
const backend = await import('../src/backend')
await backend.setConfig({ enabled: true, autoGenerate: !manual, phoneEnabled: false, appearanceSidecarEnabled: false, surfaceUtilityInjectionEnabled: false,
  narrativeDlcEnabled: false, storyConstellationsEnabled: false, generationSettingsSource: useNative ? 'native' : 'relay', followNativeImageGen: useNative, imageConnectionId: connection.id,
  nativeImageSettingsSnapshot: useNative ? { connectionId: connection.id, model: 'fixture', parameters: { steps: 12 } } : {}, nativeSettingsCapturedAt: Date.now() - 48 * 60 * 60_000,
  proseIllustratorSettings: { enabled: true, mode: 'relay-planned', plannerConnectionId: 'director', plannerModel: 'fixture', relayInsertionMode: reviewFirst ? 'review' : 'auto',
    frequencyMode: 'every-eligible', openingFrame: withCover, illustrationsPerRun: reserveFirst || withCover ? 2 : 1, minimumImages: reserveFirst || withCover ? 2 : 1, maximumImages: reserveFirst || withCover ? 2 : 1,
    maximumIllustrationsPerMessage: reserveFirst ? 2 : 3, minimumMessageLength: 0, appearanceMemoryEnabled: false,
    perspectiveMode: 'scene-snapshot', promptFormat: 'natural-language', defaultAspectRatio: '4:3' } }, userId)
const state = () => stored.get(`states/${chatId}.json`)
async function until(check, label) {
  for (let tick = 0; tick < 400; tick++) { if (check()) return; await new Promise(resolve => setTimeout(resolve, 10)) }
  assert.fail(`${label}: ${JSON.stringify({ errors, logs: state()?.logs?.slice(-5).map(row => ({ event: row.eventType, message: row.message })), slots: Object.values(state()?.slots || {}).map(row => ({ status: row.status, error: row.error })) })}`)
}
function complete(id) {
  const message = { id, role: 'assistant', is_user: false, content: story, swipes: [story], swipe_id: 0, extra: {} }
  if (delayedSave) setTimeout(() => history.push(message), 70)
  else history.push(message)
  if (manual) receiveFrontend({ type: 'prose_illustrator_action', chatId, action: 'relay_plan_once' }, userId)
  else events.get('GENERATION_ENDED')({ chatId, messageId: id, generationId: `generation-${id}`, content: story, generationType: 'normal' }, userId)
  return message
}
function session(connected) { return receiveFrontend({ type: 'frontend_session', chatId, sessionId: 'phone-fixture', connected, nativeSettingsAvailable: true, platformClass: 'mobile' }, userId) }
const finished = count => reviewFirst
  ? Object.values(state()?.slots || {}).filter(row => row.status === 'placement-pending' && row.previewPending).length === count
  : state()?.stats?.completedTotal === count
if (process.argv.includes('--state-probe')) {
  receiveFrontend({ type: 'list_state', chatId }, userId)
  await until(() => outbound.some(row => row.type === 'state' && row.chatId === chatId), 'initial durable state')
  const current = outbound.findLast(row => row.type === 'state' && row.chatId === chatId)
  const before = outbound.filter(row => row.type === 'state').length
  receiveFrontend({ type: 'list_state', chatId, knownRevision: current.revision }, userId)
  await until(() => outbound.some(row => row.type === 'state_unchanged' && row.chatId === chatId && row.revision === current.revision), 'unchanged probe acknowledgement')
  assert.equal(outbound.filter(row => row.type === 'state').length, before, 'unchanged probes must not rebuild/serialize a full drawer state')
  receiveFrontend({ type: 'list_state', chatId, knownRevision: current.revision - 1 }, userId)
  await until(() => outbound.filter(row => row.type === 'state').length === before + 1, 'stale revision receives full recovery state')
  assert.equal(directorCalls, 0)
  assert.equal(imageCalls, 0, 'state recovery cannot dispatch providers')
  console.log('PASS conditional visible-state recovery: unchanged acknowledgement, stale revision full state, zero provider calls. Offline backend.')
  process.exit(0)
}
if (reserveFirst) {
  imageGate = new Promise(resolve => { releaseImage = resolve })
  complete('reserve-before-image')
  await until(() => imageCalls === 1, 'first image held in provider')
  const slots = Object.values(state().slots)
  assert.equal(slots.length, 2, 'both selected slots must be durable and broadcast before the first image finishes')
  assert.deepEqual(slots.map(row => row.proseAnchor.paragraphIndex).sort(), [0, 1], 'each placeholder retains its exact selected story anchor')
  assert(outbound.some(row => row.type === 'state' && row.records?.length === 2), 'all reservations must be sent to the visible chat before provider completion')
  assert.equal(directorCalls, 1, 'reserving slots must reuse the accepted Director analysis')
  releaseImage()
  await until(() => finished(2), 'both reserved slots finish through the existing provider lane')
  assert.equal(imageCalls, 2)
  imageGate = new Promise(resolve => { releaseImage = resolve })
  complete('abort-reserved-batch')
  await until(() => imageCalls === 3, 'first image of abort fixture starts')
  assert.equal(Object.values(state().slots).filter(row => row.messageId === 'abort-reserved-batch').length, 2)
  await receiveFrontend({ type: 'queue_action', chatId, action: 'abort_all' }, userId)
  releaseImage()
  await until(() => state().logs.some(row => row.eventType === 'prose_opportunity_analysis_cancelled' && row.messageId === 'abort-reserved-batch'), 'reserved batch cancellation settles')
  await new Promise(resolve => setTimeout(resolve, 80))
  assert.equal(imageCalls, 3, 'Abort All must forbid the reserved successor provider start')
  assert(Object.values(state().slots).filter(row => row.messageId === 'abort-reserved-batch').every(row => row.status === 'cancelled'), 'abort must retire unstarted placeholders as well as the active one')
  console.log(`PASS reserve-first Relay ${reviewFirst ? 'preview' : 'auto'}: both anchored status slots before image completion, two outputs, hard cap of two and zero post-abort successor starts. Providers mocked.`)
  process.exit(0)
}
if (withCover) {
  complete('cover-and-inline')
  await until(() => finished(3), 'background completion produces one cover and both requested inline images')
  const slots = Object.values(state().slots)
  assert.equal(slots.filter(row => row.proseAnchor.insertionSide === 'opening').length, 1)
  assert.equal(slots.filter(row => row.proseAnchor.insertionSide !== 'opening').length, 2)
  const config = await backend.getConfig(userId)
  const context = backend.relayPlannedContextForResponse({chatId,messageId:'cover-and-inline',swipeId:0,content:story,state:state(),settings:config.proseIllustratorSettings,config})
  assert.equal(context.openingFrame,false,'re-planning must not ask for a second cover on the same reply/swipe')
  for (const message of history) events.get('MESSAGE_SENT')({chatId,message},userId)
  await new Promise(resolve=>setTimeout(resolve,150))
  assert.equal(imageCalls,3,'background replays do not regenerate the cover or inline images')
  console.log('PASS background cover + two inline images, exact independent count, no duplicate cover on replan and no replay spend. No frontend connected; providers mocked.')
  process.exit(0)
}
complete('no-client')
await until(() => finished(1), 'no frontend ever connected must still complete')
await session(true)
directorGate = new Promise(resolve => { releaseDirector = resolve })
complete('lock-during-director')
await until(() => directorCalls === 2 + callOffset, 'Director starts')
await session(false)
releaseDirector()
await until(() => finished(2), 'disconnect during Director must still complete')
await session(true)
imageGate = new Promise(resolve => { releaseImage = resolve })
complete('lock-during-image')
await until(() => imageCalls === 3, 'image starts')
// A suspended PWA may never send a disconnect. Leave the session connected
// but silent: zero frontend acknowledgements must be needed for persistence.
releaseImage()
await until(() => finished(3), 'silent frontend during image must still complete')
if (process.argv.includes('--history')) {
  await until(() => Object.values(state().slots).every(row => row.status === 'completed'), 'completion settles')
  const key = Object.keys(state().slots)[0]
  const archivedRecord = () => {
    const row = state().completedArchive[key]
    return stored.get(backend.completedDiagnosticPath(chatId, row.diagnosticArchiveId))?.record
  }
  const versions = () => [archivedRecord().imageUrl, ...archivedRecord().history.map(row => row.imageUrl)]
  const original = state().slots[key].imageUrl
  const completedTimes = new Map()
  for (let attempt = 1; attempt <= 3; attempt++) {
    completedTimes.set(archivedRecord().imageUrl, archivedRecord().completedAt)
    const submissionId = `history-regenerate-${attempt}`
    receiveFrontend({ type: 'regenerate_slot', key, submissionId }, userId)
    await until(() => outbound.some(row => row.type === 'slot_action_feedback' && row.submissionId === submissionId && ['failed', 'rejected', 'completed'].includes(row.status)), 'regeneration finishes')
    const feedback = outbound.findLast(row => row.submissionId === submissionId)
    assert.equal(feedback.status, 'completed', feedback.message)
    assert.equal(archivedRecord().history.length, attempt, 'every prior generation survives archive hydration and compaction')
    assert.equal(new Set(versions()).size, attempt + 1, 'history contains distinct prior images, not copies of the current image')
    for (const prior of archivedRecord().history) assert.equal(prior.generatedAt, completedTimes.get(prior.imageUrl),
      'prior image date must remain its own completion, not the next regeneration update')
    assert.equal(state().slots[key].history.length, 0, 'hot payload stays compact')
    assert.equal(state().slots[key].historyCount, attempt)
    assert(versions().includes(original), 'the original image remains available')
    const revision = outbound.filter(row => row.type === 'state').length
    receiveFrontend({ type: 'list_state', chatId }, userId)
    await until(() => outbound.filter(row => row.type === 'state').length > revision, 'reload state')
    assert.equal(state().slots[key].historyCount, attempt, 'reload retains version count')
  }
  const beforeRestore = versions()
  receiveFrontend({ type: 'restore_history', chatId, key, historyIndex: 2 }, userId)
  await until(() => state().slots[key]?.imageUrl === original || outbound.some(row => row.type === 'error' && row.source === 'restore_history'), 'restore finishes')
  assert.equal(state().slots[key].imageUrl, original, JSON.stringify(outbound.filter(row => row.type === 'error')))
  await until(() => archivedRecord()?.imageUrl === original, 'restored history archived')
  assert.deepEqual(new Set(versions()), new Set(beforeRestore), 'restore swaps versions without deleting or generating images')
  assert.equal(imageCalls, 6, 'restore and reload must not call image providers')
  console.log('PASS slot history backend: three real regeneration actions, archive compaction/reload, distinct versions, original retained and no-spend restoration. Providers mocked.')
  process.exit(0)
}
if (manual) {
  assert.equal((await backend.getConfig(userId)).autoGenerate, false, 'a manual click must not enable automatic generation')
  const message = { id: 'automatic-still-disabled', role: 'assistant', is_user: false, content: beat, swipes: [beat], swipe_id: 0, extra: {} }
  history.push(message)
  events.get('GENERATION_ENDED')({ chatId, messageId: message.id, generationId: 'automatic-still-disabled', content: beat, generationType: 'normal' }, userId)
  await new Promise(resolve => setTimeout(resolve, 250))
  assert.equal(directorCalls, 3 + callOffset, 'later automatic events must still obey Auto Generate off')
  assert.equal(imageCalls, 3, 'manual permission must not leak to future automatic image jobs')
}
for (const message of history) events.get('MESSAGE_SENT')({ chatId, message }, userId)
await new Promise(resolve => setTimeout(resolve, 250))
// A replay that also needs the authoritative retry remains register-only.
hideHistory = true
events.get('MESSAGE_SENT')({ chatId, message: history[0] }, userId)
setTimeout(() => { hideHistory = false }, 120)
await new Promise(resolve => setTimeout(resolve, 750))
assert.equal(directorCalls, 3 + callOffset, 'reopening/retrying a historical message does not repeat planning')
assert.equal(imageCalls, 3, 'reopening does not regenerate')
assert.equal(outbound.some(row => row.type === 'native_snapshot_requested'), false, 'Relay settings path must never wait for the browser')
// The model may return empty just as Abort All completes. The new bounded
// recovery must still check the operation epoch before a successor provider.
directorGate = new Promise(resolve => { releaseDirector = resolve })
forceEmpty = true
complete('abort-during-empty-director')
await until(() => directorCalls === 4 + callOffset, 'final Director starts')
await receiveFrontend({ type: 'queue_action', chatId, action: 'abort_all' }, userId)
releaseDirector()
await until(() => state()?.logs?.some(row => row.eventType === 'prose_opportunity_analysis_cancelled' && row.messageId === 'abort-during-empty-director'), 'empty response after Abort All must remain cancelled')
assert.equal(directorCalls, 4 + callOffset, 'Abort All forbids a successor Director provider start')
assert.equal(imageCalls, 3, 'Abort All forbids successor image provider work')
console.log(`PASS background Relay lifecycle (${manual ? 'manual action with automatic generation disabled' : 'automatic event'}, ${useNative ? 'native cached' : 'Relay'} settings, ${reviewFirst ? 'review' : 'auto'}, ${delayedSave ? 'delayed' : 'immediate'} saved message, ${emptyFirst ? 'empty-first recovery' : 'nonempty replies'}): no client, lock during Director/image, durable completion and replay without duplicate spend. Providers mocked.`)
