// @ts-nocheck -- real backend lifecycle, deterministic gated providers only.
import assert from 'node:assert/strict'
const mode = process.argv[2] || 'success'
const instant = mode.startsWith('instant-')
const streaming = mode.startsWith('stream')
const progressive = mode.startsWith('progressive') || streaming
const leadingRepair = mode === 'progressive-leading-repair'
const userId = 'analysis-user', chatId = 'analysis-chat'
const stored = new Map(), events = new Map(), outbound = []
let receive, appearanceCalls = 0, directorCalls = 0, repairCalls = 0, imageCalls = 0
let mounted
let releaseAppearance, releaseDirector
let releaseRepair
let holdStateWrites = false, holdCatalog = false, releaseStateWrites, releaseCatalog
let holdMessages = false, messageReads = 0, releaseMessages
let cancelledAtSelection = false
const messageGate = new Promise(resolve => { releaseMessages = resolve })
const stateWriteGate = new Promise(resolve => { releaseStateWrites = resolve })
const catalogGate = new Promise(resolve => { releaseCatalog = resolve })
let releaseFirstShot, releaseSecondShot, releaseStreamDone, streamBoundary = 0, rawDirectorCalls = 0
const firstShotGate = new Promise(resolve => { releaseFirstShot = resolve })
const secondShotGate = new Promise(resolve => { releaseSecondShot = resolve })
const streamDoneGate = new Promise(resolve => { releaseStreamDone = resolve })
const repairGate = new Promise(resolve => { releaseRepair = resolve })
const appearanceGate = new Promise(resolve => { releaseAppearance = resolve })
const directorGate = new Promise(resolve => { releaseDirector = resolve })
const beat = 'Mira stands beside the window holding a silver folder with both hands.'
const secondBeat = 'Mira sits alone on a wooden bench, with the closed silver folder flat on her own lap.'
const story = progressive || instant ? `${beat}\n\n${secondBeat}` : beat
const message = { id: 'fresh', role: 'assistant', is_user: false, content: story, swipes: [story], swipe_id: 0, extra: {} }
const shot = { rank: 1, title: 'Folder', reason: 'Visible action', anchor: { paragraphIndex: 0, insertionSide: 'after', anchorExcerpt: beat },
  aspectRatio: '4:3', expectedPeopleCount: 1, namedSubjects: ['Mira'], omittedSubjects: [],
  subjectDirectives: [{ name: 'Mira', role: 'character', appearanceOverrides: [], attireOverrides: [], temporaryTraits: [], expression: 'calm', pose: 'standing', action: 'holding the silver folder with both hands', gaze: 'at the window', contact: '' }],
  composition: { shotType: 'medium', cameraAngle: 'eye level', framing: 'waist up', blocking: 'Mira beside the window', foreground: '', background: 'window', location: 'room', timeOfDay: 'day', lighting: 'daylight', mood: 'quiet', importantProps: ['silver folder'], backgroundPeople: '' },
  promptCore: 'Eye-level medium view of Mira near a sunlit window, a silver document folder supported by both of her hands.', negativeCore: '', booruTags: [], referenceAssetIds: [], locationReferenceAssetIds: [] }
const secondShot = { ...structuredClone(shot), rank: 2, title: 'Bench',
  anchor: { paragraphIndex: 1, insertionSide: 'after', anchorExcerpt: secondBeat },
  subjectDirectives: [{ ...shot.subjectDirectives[0], pose: 'seated alone on the bench', action: 'resting both hands on the closed folder in her lap', contact: 'her own lap supports the folder' }],
  promptCore: 'Mira seated upright on a wooden bench, both hands resting on the closed silver folder across her lap.' }
const storage = { async getJson(path, { fallback } = {}) { return structuredClone(stored.get(path) ?? fallback) },
  async setJson(path, value) {
    if (holdStateWrites && path.startsWith('states/')) await stateWriteGate
    stored.set(path, structuredClone(value))
    if (mode === 'cancel-selection' && !cancelledAtSelection && path.startsWith('states/') && Object.keys(value.proseIllustrator?.plans || {}).length) {
      cancelledAtSelection = true
      receive({ type: 'queue_action', action: 'abort_all', chatId }, userId)
    }
  }, async mkdir() {} }
const connection = { id: 'image', provider: 'fixture', model: 'fixture', default_parameters: {} }
globalThis.spindle = {
  on(name, callback) { events.set(name, callback) }, onFrontendMessage(callback) { receive = callback },
  registerInterceptor() {}, registerMacro() {}, registerMessageContentProcessor() {}, unregisterTool() {},
  permissions: { has: () => true }, storage, userStorage: storage, sendToFrontend(value) { outbound.push(structuredClone(value)); mounted?.receive(structuredClone(value)) },
  log: { info() {}, warn() {}, error() {} },
  chats: { async get(id) { return { id, character_id: 'mira', metadata: {} } } },
  characters: { async get() { return { id: 'mira', name: 'Mira', description: 'Adult woman with black hair.' } } }, personas: { async getActive() { return null } },
  chat: { async getMessages() { if (holdMessages) { messageReads++; await messageGate } return [structuredClone(message)] }, async updateMessage(_chat, _id, patch) { Object.assign(message, structuredClone(patch)) } },
  connections: { async list() { return [] }, async get(id) { return { id, name: id, provider: 'fixture', model: 'fixture' } } },
  variables: { global: { async set() {} }, chat: { async set() {} } }, world_books: { async getActivated() { return [] } },
  images: { async get(id) { return { id, url: `/api/v1/images/${id}`, metadata: {} } }, async update() {} },
  imageGen: { async listConnections() { if (holdCatalog) await catalogGate; return [connection] }, async getConnection() { return connection }, async getProviders() { if (holdCatalog) await catalogGate; return [] },
    async generate() { imageCalls++; return { imageId: `fixture-${imageCalls}`, imageUrl: `/fixture-${imageCalls}.png` } } },
  generate: { ...(streaming ? { async *rawStream(request) {
    assert.equal(request.connection_id, 'director', 'only Director planning uses streaming')
    directorCalls++
    await directorGate
    yield { type: 'reasoning', token: JSON.stringify({ shouldIllustrate: true, illustrations: [secondShot] }) }
    const first = JSON.stringify(shot)
    yield { type: 'token', token: '{"shouldIllustrate":true,"reason":"Visible beat","illustrations":[' + first.slice(0, -1) }
    streamBoundary = 1
    await firstShotGate
    yield { type: 'token', token: '},' }
    streamBoundary = 2
    await secondShotGate
    if (mode === 'stream-error') throw new Error('Fixture stream disconnected')
    yield { type: 'token', token: JSON.stringify(secondShot) + ']}' }
    streamBoundary = 3
    await streamDoneGate
    if (mode === 'stream-no-done') return
    yield { type: 'done', content: mode === 'stream-invalid-final' ? '{"shouldIllustrate":false,"reason":"Declined","illustrations":[]}' : JSON.stringify({ shouldIllustrate: true, reason: 'Visible beat', illustrations: [shot, secondShot] }) }
  } } : {}), async raw(request) {
    if (request.connection_id === 'appearance') {
      appearanceCalls++; await appearanceGate
      return { content: JSON.stringify({ subjects: [{ name: 'Mira', role: 'character', canonical: { hair: { booruTags: ['black_hair'] } }, current: { attire: { booruTags: ['green_cardigan'] } } }] }) }
    }
    if (request.messages.some(row => row.content.includes('repairable'))) {
      repairCalls++
      if (progressive) await repairGate
      return { content: JSON.stringify(mode === 'progressive-decline' ? { repairable: false } : { repairable: true, illustration: progressive && !leadingRepair ? secondShot : shot }) }
    }
    rawDirectorCalls++; directorCalls++
    if (mode !== 'cancel-retry' || directorCalls === 1) await directorGate
    if (mode === 'failure') throw new Error('Fixture Director outage')
    if (mode === 'cancel' || mode === 'success' && directorCalls === 1) return { content: '' }
    return { content: JSON.stringify({ shouldIllustrate: true, reason: 'Visible beat', illustrations: progressive
      ? leadingRepair ? [{ ...shot, expectedPeopleCount: 2 }, secondShot] : [shot, { ...secondShot, expectedPeopleCount: 2 }] : [{ ...shot, expectedPeopleCount: mode === 'repair' ? 2 : 1 }] }) }
  } },
}
if (progressive) mounted = await (await import('./relay-planning-placeholder-dom-fixture')).mountPlanningChat(chatId, message.id, story)
let backend = await import('../src/backend')
await backend.setConfig({ enabled: true, autoGenerate: instant || ['progressive-auto', 'stream-auto', 'auto-appearance'].includes(mode), phoneEnabled: false, tutorialModeEnabled: false, storyConstellationsEnabled: false,
  surfaceUtilityInjectionEnabled: false, narrativeDlcEnabled: false, followNativeImageGen: false, generationSettingsSource: 'relay', imageConnectionId: 'image',
  followNativeParser: false, parserConnectionId: 'appearance', appearanceSidecarConnectionId: 'appearance',
  proseIllustratorSettings: { enabled: true, mode: 'relay-planned', plannerConnectionId: 'director', appearanceMemoryEnabled: true, instantIllustrationDispatch: instant && mode !== 'instant-off',
    frequencyMode: 'every-eligible', minimumMessageLength: 0, skipShortMessages: false, illustrationsPerRun: progressive ? 2 : 1,
    minimumImages: 1, maximumImages: progressive ? 2 : 1,
    perspectiveMode: 'scene-snapshot', promptFormat: 'natural-language', defaultAspectRatio: '4:3' } }, userId)
const state = () => stored.get(`states/${chatId}.json`)
const latest = () => outbound.findLast(row => row.type === 'state' && row.chatId === chatId)
const task = () => latest()?.backgroundQueue.items[`analysis:${chatId}:fresh:0`]
async function until(check, label) {
  for (let i = 0; i < 600; i++) { if (check()) return; await new Promise(resolve => setTimeout(resolve, 5)) }
  assert.fail(`${label}: ${JSON.stringify({ task: task(), appearanceCalls, directorCalls, repairCalls, imageCalls, notices: outbound.filter(row => row.type === 'error' || row.type === 'relay_notice').slice(-3) })}`)
}
const old = { chatId, source: 'analysis', stage: 'analyzing', label: 'Old', statusText: 'Analyzing', createdAt: 1, startedAt: 1, updatedAt: 1, current: 0, total: 1, etaSeconds: null }
stored.set(`states/${chatId}.json`, { backgroundQueue: { items: {
  legacy: { ...old, id: 'legacy' },
  foreign: { ...old, id: 'foreign', analysisWorkerId: 'dead-worker', analysisRuntimeId: 'previous-backend' },
  finished: { ...old, id: 'finished', stage: 'completed' },
  image: { ...old, id: 'image', source: 'relay-slot', stage: 'generating' },
} } })
await receive({ type: 'list_state', chatId }, userId)
await until(() => latest(), 'state reply')
for (const id of ['legacy', 'foreign']) {
  assert.equal(latest().backgroundQueue.items[id].stage, 'cancelled', 'orphan analysis must not revive on reload')
  assert.match(latest().backgroundQueue.items[id].statusText, /interrupt/i)
}
assert.equal(latest().backgroundQueue.items.finished.stage, 'completed')
assert.equal(latest().backgroundQueue.items.image.stage, 'generating', 'analysis cleanup must not rewrite image workers')
assert.equal(directorCalls + imageCalls + appearanceCalls, 0, 'recovery must never spend')
if (instant) {
  assert(events.has('STREAM_TOKEN_RECEIVED'), 'Relay Instant must subscribe to the real backend story-token event')
  message.content = ''; message.swipes = ['']
  const generationId = `story-${mode}`
  const lateTarget = mode === 'instant-late-target'
  if (lateTarget) {
    assert(events.has('GENERATION_IN_PROGRESS'), 'the host assigns the normal response ID after assembly')
    for (const excluded of [{ generationType: 'continue' }, { generationType: 'impersonate' }, { generationType: 'normal', isDryRun: true }]) {
      events.get('GENERATION_STARTED')({ generationId: 'excluded', chatId, ...excluded }, userId)
      events.get('GENERATION_IN_PROGRESS')({ generationId: 'excluded', chatId, targetMessageId: message.id }, userId)
      events.get('STREAM_TOKEN_RECEIVED')({ generationId: 'excluded', chatId, token: `${story}\n\n`, offset: 0 }, userId)
    }
    await new Promise(resolve => setTimeout(resolve, 20))
    assert.equal(appearanceCalls + directorCalls + imageCalls, 0, 'late target binding cannot enable excluded generation types')
    events.get('GENERATION_STARTED')({ generationId: 'pending-abort', chatId, generationType: 'normal' }, userId)
    await receive({ type: 'queue_action', action: 'abort_all', chatId }, userId)
    events.get('GENERATION_IN_PROGRESS')({ generationId: 'pending-abort', chatId, targetMessageId: message.id }, userId)
    events.get('STREAM_TOKEN_RECEIVED')({ generationId: 'pending-abort', chatId, token: `${story}\n\n`, offset: 0 }, userId)
    events.get('GENERATION_ENDED')({ generationId: 'pending-abort', chatId, messageId: message.id, content: story, generationType: 'normal' }, userId)
    await new Promise(resolve => setTimeout(resolve, 40))
    assert.equal(appearanceCalls + directorCalls + imageCalls, 0, 'late target binding must retain the original Abort epoch')
  }
  events.get('GENERATION_STARTED')({ generationId, chatId, ...(lateTarget ? {} : { targetMessageId: message.id }), targetSwipeId: 0, generationType: 'normal' }, userId)
  if (lateTarget) {
    assert(events.has('GENERATION_IN_PROGRESS'), 'normal host generations bind their saved target only at GENERATION_IN_PROGRESS')
    events.get('GENERATION_IN_PROGRESS')({ generationId, chatId, targetMessageId: message.id, targetSwipeId: 0 }, userId)
  }
  const token = (text, offset, type = 'content') => events.get('STREAM_TOKEN_RECEIVED')({ generationId, chatId, token: text, offset, type }, userId)
  token(`${story}\n\n`, 0, 'reasoning')
  await new Promise(resolve => setTimeout(resolve, 15))
  assert.equal(appearanceCalls + directorCalls, 0, 'reasoning cannot start illustration analysis')
  token(story.slice(0, 30), 0)
  await new Promise(resolve => setTimeout(resolve, 15))
  assert.equal(appearanceCalls + directorCalls, 0, 'an incomplete first paragraph cannot start analysis')
  token(`${story.slice(30)}\n\n`, 30)
  if (mode === 'instant-off') {
    await new Promise(resolve => setTimeout(resolve, 40))
    assert.equal(appearanceCalls + directorCalls + imageCalls, 0, 'Instant off waits for generation end')
    console.log('PASS Relay Instant off: real stream and reasoning events cannot start analysis or generation. Providers mocked.')
    process.exit(0)
  }
  await until(() => appearanceCalls === 1, 'Instant analysis begins before GENERATION_ENDED')
  assert(task() && task().stage === 'analyzing', 'the early analysis must own visible lifecycle state')
  assert.equal(message.content, '', 'partial story text must not be persisted by early analysis')
  if (mode === 'instant-cancel') {
    await receive({ type: 'queue_action', action: 'abort_all', chatId }, userId)
    releaseAppearance(); releaseDirector()
    message.content = story; message.swipes = [story]
    events.get('GENERATION_ENDED')({ generationId, chatId, messageId: message.id, content: story, generationType: 'normal' }, userId)
    await new Promise(resolve => setTimeout(resolve, 100))
    assert.equal(directorCalls + imageCalls, 0, 'an aborted stream cannot resume analysis or spend at generation end')
    console.log('PASS Relay Instant cancellation: no Director/image successor after Abort All, including late story completion. Providers mocked.')
    process.exit(0)
  }
  releaseAppearance()
  await until(() => directorCalls === 1, 'Director starts while story is still streaming')
  assert.equal(imageCalls, 0, 'Relay image dispatch waits for the saved source verification')
  if (lateTarget) {
    events.get('GENERATION_IN_PROGRESS')({ generationId: 'other-generation', chatId, targetMessageId: 'other-message', targetSwipeId: 0 }, userId)
    events.get('GENERATION_IN_PROGRESS')({ generationId, chatId, targetMessageId: message.id, targetSwipeId: 0 }, userId)
  }
  token(`${story}\n\n`, 0)
  assert.equal(directorCalls, 1, 'replayed stream tokens cannot launch another Director')
  const heldAtFinish = ['instant-held', 'instant-final-cancel'].includes(mode)
  if (!heldAtFinish) releaseDirector()
  if (!heldAtFinish) await until(() => task()?.stage === 'completed', 'early Director completes')
  const finalStory = mode === 'instant-stale' ? story.replace('wooden bench', 'stone bench') : `${story}\n\nThe room stays quiet.`
  message.content = finalStory; message.swipes = [finalStory]
  events.get('GENERATION_ENDED')({ generationId, chatId, messageId: message.id, content: finalStory, generationType: 'normal' }, userId)
  if (mode === 'instant-final-cancel') {
    await new Promise(resolve => setTimeout(resolve, 40))
    await receive({ type: 'queue_action', action: 'abort_all', chatId }, userId)
    releaseDirector()
    await new Promise(resolve => setTimeout(resolve, 120))
    assert.equal(directorCalls, 1, 'the final-source handoff cannot restart Director after Abort All')
    assert.equal(imageCalls, 0, 'the final-source handoff cannot dispatch after Abort All')
    console.log('PASS Relay Instant final-source cancellation: held early analysis cannot become fresh work when the saved-response handoff resumes. Providers mocked.')
    process.exit(0)
  }
  releaseDirector()
  await until(() => imageCalls === 1, 'verified final source dispatches exactly one image')
  await until(() => Object.values(state().slots).some(row => row.status === 'completed'), 'final image durably completes')
  assert.equal(directorCalls, mode === 'instant-stale' ? 2 : 1, 'unchanged prefix reuses early analysis; changed source must replan')
  await new Promise(resolve => setTimeout(resolve, 60))
  assert.equal(imageCalls, 1, 'early and final paths cannot duplicate an image')
  console.log(`PASS Relay ${mode}: Director starts during story streaming, ${mode === 'instant-stale' ? 'changed-prefix replan' : 'early result reused'}, exact saved-source dispatch, no duplicate image. Providers mocked.`)
  process.exit(0)
}
const beforeCatalogClock = Date.now
if (mode === 'cancel-resolving') {
  holdMessages = true
  receive({ type: 'prose_illustrator_action', action: 'relay_plan_once', chatId }, userId)
  await until(() => messageReads > 0, 'planning command waits for the saved message')
  receive({ type: 'queue_action', action: 'abort_all', chatId }, userId)
  await until(() => outbound.some(row => row.type === 'queue_abort_ack'), 'Abort All during message lookup')
  holdMessages = false; releaseMessages(); releaseAppearance(); releaseDirector()
  await new Promise(resolve => setTimeout(resolve, 120))
  assert.equal(appearanceCalls + directorCalls + imageCalls, 0, 'a command cancelled during lookup cannot become fresh work after the lookup returns')
  console.log('PASS Abort All during pending message lookup: zero successor model/image calls. Providers mocked.'); process.exit(0)
}
if (mode === 'slow-catalog') { holdCatalog = true; Date.now = () => beforeCatalogClock() + 600_000 }
if (['progressive-auto', 'stream-auto', 'auto-appearance'].includes(mode)) events.get('GENERATION_ENDED')({ chatId, messageId: message.id, generationId: 'progressive-auto', content: story, generationType: 'normal' }, userId)
else receive({ type: 'prose_illustrator_action', action: 'relay_plan_once', chatId }, userId)
if (mode === 'slow-catalog') {
  await until(() => appearanceCalls === 1 && task()?.analysisPhase === 'appearance', 'analysis starts without waiting for optional image catalogs')
  holdCatalog = false; releaseCatalog(); Date.now = beforeCatalogClock
}
if (['progressive-auto', 'stream-auto', 'auto-appearance'].includes(mode)) {
  await until(() => appearanceCalls === 1 && task()?.analysisPhase === 'appearance', 'automatic analysis publishes its Appearance phase immediately')
  assert.equal(directorCalls, 0, 'the Director still waits for current Appearance')
} else {
  await until(() => appearanceCalls === 1 && task()?.analysisPhase === 'appearance', 'appearance progress')
  assert(task().analysisWorkerId && task().analysisRuntimeId && task().phaseStartedAt)
  await receive({ type: 'list_state', chatId }, userId)
  assert.equal(task().stage, 'analyzing', 'a real in-flight worker must survive client reload')
}
if (mode === 'cancel-appearance') {
  await receive({ type: 'queue_action', action: 'abort_all', chatId }, userId)
  releaseAppearance()
  await until(() => state().logs.some(row => row.eventType === 'prose_opportunity_analysis_cancelled'), 'appearance abort settles')
  assert.equal(task().stage, 'cancelled'); assert.equal(directorCalls, 0); assert.equal(imageCalls, 0)
  console.log('PASS analysis cancellation during appearance: no late Director or image provider start. Providers mocked.'); process.exit(0)
}
releaseAppearance()
await until(() => directorCalls === 1 && task()?.analysisPhase === 'director', 'Director progress')
const realNow = Date.now
try {
  Date.now = () => realNow() + 3600000
  await receive({ type: 'list_state', chatId }, userId)
  assert.equal(task().stage, 'analyzing', 'an owned slow call must not be expired by wall time')
} finally { Date.now = realNow }
if (mode === 'restart') {
  backend = await import(`../src/backend.ts?analysis-restart=${Date.now()}`)
  await receive({ type: 'list_state', chatId }, userId)
  await until(() => task()?.stage === 'cancelled', 'backend restart settles lost worker')
  assert.match(task().statusText, /interrupt/i)
  assert.equal(directorCalls, 1); assert.equal(imageCalls, 0)
  console.log('PASS analysis backend restart: old task interrupted, no new provider starts. Providers mocked.'); process.exit(0)
}
if (mode === 'cancel-persistence') {
  holdStateWrites = true
  receive({ type: 'queue_action', action: 'abort_all', chatId }, userId)
  await until(() => outbound.some(row => row.type === 'queue_abort_ack'), 'Abort All acknowledges runtime cancellation before slow persistence')
  const acknowledgement = outbound.find(row => row.type === 'queue_abort_ack')
  assert(acknowledgement.abortedAt > 0 && acknowledgement.chatIds.includes(chatId), 'early acknowledgement must identify the durable cancellation boundary')
  assert.equal(imageCalls, 0)
  holdStateWrites = false; releaseStateWrites(); releaseDirector()
  await until(() => task()?.stage === 'cancelled', 'cancelled task is persisted')
  assert.equal(state().backgroundQueue.abortRequestedAt, acknowledgement.abortedAt)
  await new Promise(resolve => setTimeout(resolve, 40))
  assert.equal(imageCalls, 0, 'late Director return after immediate abort cannot dispatch an image')
  console.log('PASS immediate Abort All under slow state storage; zero late image starts. Providers mocked.'); process.exit(0)
}
if (mode === 'cancel-retry') {
  const cancelledWorker = task().analysisWorkerId
  await receive({ type: 'queue_action', action: 'abort_all', chatId }, userId)
  await until(() => task().stage === 'cancelled', 'Abort All acknowledgement')
  receive({ type: 'prose_illustrator_action', action: 'relay_plan_once', chatId }, userId)
  await until(() => directorCalls === 2 && imageCalls === 1, 'explicit retry must not wait for an aborted provider')
  assert.notEqual(task().analysisWorkerId, cancelledWorker)
  assert.equal(task().stage, 'completed')
  releaseDirector()
  await until(() => state().logs.some(row => row.eventType === 'prose_opportunity_analysis_cancelled'), 'old cancelled call settles')
  assert.equal(task().stage, 'completed', 'old cancellation must not overwrite the new task')
  assert.equal(directorCalls, 2); assert.equal(imageCalls, 1)
  console.log('PASS explicit retry after Abort All: new owned analysis completes while old provider is pending; late old response cannot overwrite it or dispatch. Providers mocked.'); process.exit(0)
}
if (mode === 'cancel') await receive({ type: 'queue_action', action: 'abort_all', chatId }, userId)
else {
  // Re-entry is not permission for a second batch while the model is pending.
  receive({ type: 'prose_illustrator_action', action: 'relay_plan_once', chatId }, userId)
  await new Promise(resolve => setTimeout(resolve, 40))
  assert.equal(directorCalls, 1, 'duplicate planning action must not start another Director')
  assert.equal(task().stage, 'analyzing', 'duplicate request must not fail the live task')
}
releaseDirector()
if (mode === 'cancel-selection') {
  await until(() => outbound.some(row => row.type === 'queue_abort_ack'), 'Abort All at accepted-plan handoff')
  await new Promise(resolve => setTimeout(resolve, 120))
  assert.equal(imageCalls, 0, 'selection completing after Abort All must not start a fresh generation operation')
  assert(!Object.values(state().slots).some(record => ['queued', 'preparing', 'parsing', 'provider-waiting', 'generating'].includes(record.status)), 'the cancelled handoff must not leave a new busy slot behind')
  console.log('PASS Abort All at accepted-plan handoff: zero successor image calls. Providers mocked.'); process.exit(0)
}
if (streaming) {
  const previews = () => task()?.planningPreviews || []
  await until(() => streamBoundary === 1, 'Director must stream before its full result returns')
  await mounted.flush()
  assert.equal(previews().length, 0, 'neither reasoning nor an incomplete shot may publish a card')
  releaseFirstShot()
  await until(() => streamBoundary === 2, 'first shot boundary')
  await mounted.flush()
  assert.equal(previews().length, 1, 'first complete shot must publish while the next shot is still streaming')
  assert.equal(mounted.previews().length, 1, 'first streamed card must mount in the production frontend')
  assert.equal(mounted.cards()[0].previousElementSibling?.textContent, beat)
  assert.equal(mounted.previews()[0].querySelectorAll('button').length, 0)
  assert.equal(imageCalls, 0, 'streamed cards cannot dispatch partial batches')
  assert.equal(Object.keys(state().slots).length, 0)
  await receive({ type: 'list_state', chatId }, userId)
  assert.equal(previews().length, 1, 'in-progress cards survive a client state reload')
  if (mode === 'stream-cancel') {
    await receive({ type: 'queue_action', action: 'abort_all', chatId }, userId)
    await until(() => outbound.some(row => row.type === 'queue_abort_ack'), 'stream Abort All acknowledgement')
    await mounted.flush(); assert.equal(mounted.previews().length, 0)
  }
  if (mode === 'stream-stale') { message.content = 'Mira leaves the room.'; message.swipes = [message.content] }
  releaseSecondShot()
  if (!['stream-cancel', 'stream-stale', 'stream-error'].includes(mode)) {
    await until(() => streamBoundary === 3, 'second shot boundary')
    await mounted.flush()
    assert.equal(previews().length, 2, 'both complete shots must publish before terminal Director completion')
    assert.equal(mounted.previews().length, 2)
    assert.equal(imageCalls, 0)
  }
  releaseStreamDone()
  if (['stream-cancel', 'stream-stale', 'stream-error', 'stream-invalid-final', 'stream-no-done'].includes(mode)) {
    if (mode === 'stream-cancel') await until(() => state().logs.some(row => row.eventType === 'prose_opportunity_analysis_cancelled'), 'cancelled stream settles')
    await until(() => ['failed','cancelled'].includes(task()?.stage), 'failed/cancelled stream terminal state')
    assert.equal(previews().length, 0)
    assert.equal(imageCalls, 0)
    assert.equal(Object.keys(state().slots).length, 0)
  } else {
    await until(() => imageCalls === 2 && state().stats.completedTotal === 2, 'final streamed batch dispatch')
    assert.equal(previews().length, 0)
  }
  await mounted.flush()
  assert.equal(mounted.previews().length, 0)
  assert.equal(mounted.cards().length, ['stream','stream-auto'].includes(mode) ? 2 : 0)
  assert.equal(rawDirectorCalls, 0, 'a stream must never fall back to another paid raw call')
  assert.equal(directorCalls, mode === 'stream-invalid-final' ? 2 : 1)
  mounted.cleanup()
  console.log(`PASS ${mode}: mounted cards before next shot/terminal completion, reload, exact anchors and no premature/successor image starts. Providers mocked.`)
  process.exit(0)
}
if (progressive) {
  await until(() => repairCalls === 1, 'sibling repair held')
  const previews = () => task()?.planningPreviews || []
  assert.equal(previews().length, 1, 'first validated illustration must be published before a sibling repair finishes')
  assert.equal(previews()[0].proseAnchor.paragraphIndex, leadingRepair ? 1 : 0)
  assert.equal(previews()[0].status, 'preparing')
  assert.equal(Object.keys(state().slots).length, 0, 'early cards are inert projections, not dispatchable queue jobs')
  assert.equal(imageCalls, 0, 'a partial batch must never dispatch an image')
  await mounted.flush()
  assert.equal(mounted.previews().length, 1, 'the first card must mount through the production frontend while repair is held')
  assert.equal(mounted.cards()[0].previousElementSibling?.textContent, leadingRepair ? secondBeat : beat, 'early card keeps the exact story anchor')
  assert.equal(mounted.previews()[0].querySelectorAll('button').length, 0, 'planning-only cards cannot dispatch slot actions')
  await receive({ type: 'list_state', chatId }, userId)
  assert.equal(previews().length, 1, 'active planning cards survive a client reload')
  if (mode === 'progressive-cancel') {
    await receive({ type: 'queue_action', action: 'abort_all', chatId }, userId)
    await until(() => outbound.some(row => row.type === 'queue_abort_ack'), 'Abort All acknowledgement before provider return')
    await mounted.flush()
    assert.equal(mounted.previews().length, 0, 'Abort All removes the card before the held provider returns')
  }
  if (mode === 'progressive-stale') { message.content = 'Mira leaves the room.'; message.swipes = [message.content] }
  releaseRepair()
  if (mode === 'progressive-cancel') {
    await until(() => state().logs.some(row => row.eventType === 'prose_opportunity_analysis_cancelled'), 'cancelled repair settles')
    assert.equal(task().stage, 'cancelled'); assert.equal(previews().length, 0)
    assert.equal(imageCalls, 0); assert.equal(directorCalls, 1)
  } else if (mode === 'progressive-stale') {
    await until(() => task()?.stage === 'failed', 'changed source invalidates early planning')
    assert.equal(previews().length, 0); assert.equal(imageCalls, 0)
    assert.equal(Object.keys(state().slots).length, 0)
  } else {
    const count = mode === 'progressive-decline' ? 1 : 2
    await until(() => imageCalls === count && state().stats.completedTotal === count, 'final batch completion')
    assert.equal(Object.keys(state().slots).length, count)
    assert.equal(previews().length, 0, 'real reservations replace the planning cards')
    assert.equal(directorCalls, mode === 'progressive-decline' ? 2 : 1)
  }
  await mounted.flush()
  assert.equal(mounted.previews().length, 0, 'abandoned and replaced planning cards leave no stale DOM')
  assert.equal(mounted.cards().length, ['progressive-cancel', 'progressive-stale'].includes(mode) ? 0 : mode === 'progressive-decline' ? 1 : 2, 'each final shot has exactly one mounted card; cancelled/stale shots have none')
  mounted.cleanup()
  console.log(`PASS ${mode}: incremental publication before sibling repair, inert cards, client reload, final reconciliation and cancellation. Providers mocked.`)
  process.exit(0)
}
await until(() => ['completed', 'failed', 'cancelled'].includes(task()?.stage), 'analysis terminal state')
assert.equal(task().stage, mode === 'cancel' ? 'cancelled' : mode === 'failure' ? 'failed' : 'completed')
if (!['cancel', 'failure'].includes(mode)) await until(() => imageCalls === 1, 'image dispatch')
else { await new Promise(resolve => setTimeout(resolve, 40)); assert.equal(imageCalls, 0) }
assert.equal(directorCalls, mode === 'success' ? 2 : 1)
assert.equal(repairCalls, mode === 'repair' ? 1 : 0)
if (mode === 'success') assert(outbound.some(row => row.type === 'state' && Object.values(row.backgroundQueue.items).some(item => item.analysisPhase === 'director-retry')))
if (mode === 'repair') assert(outbound.some(row => row.type === 'state' && Object.values(row.backgroundQueue.items).some(item => item.analysisPhase === 'repair')))
const timing = state().logs.filter(row => row.eventType === 'relay_analysis_phase_completed')
assert(timing.length >= 2 && timing.every(row => Number.isFinite(row.details.durationMs)), 'phase durations must be retained')
console.log(`PASS analysis ${mode}: orphan recovery, active-client reload, duplicate prevention, stages/timings, terminal outcome and spend boundary. Providers mocked.`)
