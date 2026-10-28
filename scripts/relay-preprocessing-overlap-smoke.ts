// @ts-nocheck -- production discovery/dispatch with deliberately held model and image providers.
import assert from 'node:assert/strict'

const mode = process.argv[2] || 'surfaces'
const matrixLimit = /^limit-[1248]$/.test(mode) ? Number(mode.slice(6)) : 0
const surfaceCount = matrixLimit ? matrixLimit + 2 : 5
const mixed = mode === 'mixed' || mode === 'pending'
const cancel = mode === 'cancel'
const directorFailure = mode === 'director-failure', directorDecline = mode === 'director-decline'
const noIllustration = directorFailure || directorDecline
const userId = 'overlap-user', chatId = 'overlap-chat'
const stored = new Map(), events = new Map(), outbound = [], warnings = []
let receive, releaseAppearance, releaseDirector, releaseImages
let appearanceCalls = 0, directorCalls = 0, imageCalls = 0, activeParsers = 0, maxParsers = 0, activeImages = 0, maxImages = 0
const parserReleases = []
const starts = []
const appearanceGate = new Promise(resolve => { releaseAppearance = resolve })
const directorGate = new Promise(resolve => { releaseDirector = resolve })
const imageGate = new Promise(resolve => { releaseImages = resolve })
const beat = 'Mira stands beside the window holding a silver folder with both hands.'
const surface = `<kakao_chat title="Archive" date="Friday" time="12:00" unread="0"><participants><k_part name="Mira" avatar="M"/></participants><messages>${Array.from({ length: surfaceCount }, (_, index) => `<image_request id="surface-${index}" target="kakao.image" slot="photo-${index}" aspect="4:3" alt="Empty archive"><scene_brief>Empty sunlit archive room with a silver folder on a wooden table, no people.</scene_brief></image_request>`).join('')}</messages></kakao_chat>`
const illustrations = mixed ? ['first', 'second'].map(name => `<reverie-illustration request="generate" slot="ordered-${name}" aspect="4:3" cast="char" alt="${name}"><visual_prompt>Eye-level medium view of Mira near a room window, a silver document folder supported by both of her hands. ${name === 'first' ? 'Warm morning light.' : 'Cool afternoon light.'}</visual_prompt></reverie-illustration>`).join('\n') : ''
const content = [beat, illustrations, surface].filter(Boolean).join('\n\n')
const message = { id: 'fresh', role: 'assistant', is_user: false, content, swipes: [content], swipe_id: 0, extra: {} }
const connection = { id: 'image', provider: 'fixture', model: 'fixture', default_parameters: {} }
const storage = {
  async getJson(path, { fallback } = {}) { return structuredClone(stored.get(path) ?? fallback) },
  async setJson(path, value) { stored.set(path, structuredClone(value)) }, async mkdir() {},
}
const shot = {
  rank: 1, title: 'Folder by window', reason: 'Visible saved beat.',
  anchor: { paragraphIndex: 0, insertionSide: 'after', anchorExcerpt: beat }, aspectRatio: '4:3', expectedPeopleCount: 1,
  namedSubjects: ['Mira'], omittedSubjects: [], subjectDirectives: [{ name: 'Mira', role: 'character', appearanceOverrides: [], attireOverrides: [], temporaryTraits: [], expression: 'calm', pose: 'standing beside the window', action: 'holding the silver folder with both hands', gaze: 'toward the window', contact: 'her hands hold the folder' }],
  composition: { shotType: 'medium shot', cameraAngle: 'eye level', framing: 'waist up', blocking: 'Mira beside the window', foreground: 'folder', background: 'window', location: 'room', timeOfDay: 'day', lighting: 'daylight', mood: 'quiet', importantProps: ['silver folder'], backgroundPeople: '' },
  promptCore: 'Eye-level medium view of Mira beside a sunlit room window, a silver document folder supported by both of her hands.', negativeCore: '', booruTags: [], referenceAssetIds: [], locationReferenceAssetIds: [],
}
globalThis.spindle = {
  on(name, callback) { events.set(name, callback) }, onFrontendMessage(callback) { receive = callback },
  registerInterceptor() {}, registerMacro() {}, registerMessageContentProcessor() {}, unregisterTool() {},
  permissions: { has: () => true }, sendToFrontend(value) { outbound.push(structuredClone(value)) }, storage, userStorage: storage,
  log: { info() {}, warn(value) { warnings.push(value) }, error(value) { warnings.push(value) } },
  chats: { async get(id) { return { id, character_id: 'mira', metadata: {} } } },
  characters: { async get() { return { id: 'mira', name: 'Mira', description: 'Adult woman with black hair.' } } }, personas: { async getActive() { return null } },
  chat: { async getMessages() { return [structuredClone(message)] }, async updateMessage(_chat, _id, patch) { Object.assign(message, structuredClone(patch)); if (patch.content !== undefined) message.swipes[0] = patch.content } },
  connections: { async list() { return [] }, async get(id) { return { id, name: id, provider: 'fixture', model: 'fixture' } } },
  variables: { global: { async set() {} }, chat: { async set() {} } }, world_books: { async getActivated() { return [] }, entries: { async get() { return null } } },
  images: { async get(id) { return { id, url: `/api/v1/images/${id}`, metadata: {} } }, async update() {} },
  imageGen: { async listConnections() { return [connection] }, async getConnection() { return connection }, async getProviders() { return [] },
    async generate(request) {
      const id = ++imageCalls; activeImages++; maxImages = Math.max(maxImages, activeImages)
      starts.push(request.relay_request_id)
      await imageGate; activeImages--
      return { imageId: `image-${id}`, imageUrl: `/overlap-${id}.png` }
    } },
  generate: { async raw(request) {
    if (request.connection_id === 'appearance') {
      appearanceCalls++; await appearanceGate
      return { content: JSON.stringify({ subjects: [{ name: 'Mira', role: 'character', canonical: { hair: { booruTags: ['black_hair'] } }, current: { attire: { booruTags: ['green_cardigan'] } } }] }) }
    }
    if (request.connection_id === 'director') {
      directorCalls++; await directorGate
      if (directorFailure) throw new Error('Offline Director outage')
      if (directorDecline) return { content: JSON.stringify({ shouldIllustrate: false, reason: 'No emotional beat in this response.', illustrations: [] }) }
      return { content: JSON.stringify({ shouldIllustrate: true, reason: 'Saved beat.', illustrations: [shot] }) }
    }
    activeParsers++; maxParsers = Math.max(maxParsers, activeParsers)
    await new Promise(resolve => parserReleases.push(resolve)); activeParsers--
    return { content: JSON.stringify({ prompt: 'Sunlit archive interior, wooden shelving, empty tables, closed silver document folder on the central table, warm daylight.', negativeAdditions: '' }) }
  } },
}
let backend = await import('../src/backend')
await backend.setConfig({ enabled: true, autoGenerate: true, phoneEnabled: false, storyConstellationsEnabled: false,
  surfaceUtilityInjectionEnabled: false, narrativeDlcEnabled: false, followNativeImageGen: false, generationSettingsSource: 'relay', imageConnectionId: 'image',
  followNativeParser: false, parserConnectionId: 'parser', appearanceSidecarConnectionId: 'appearance', parserRetries: 0, queueConcurrencyLimit: matrixLimit || 2,
  proseIllustratorSettings: { enabled: true, mode: mixed ? 'inline-protocol' : 'relay-planned', plannerConnectionId: 'director', appearanceMemoryEnabled: true,
    frequencyMode: 'every-eligible', minimumMessageLength: 0, skipShortMessages: false, minimumImages: 1, maximumImages: 1,
    perspectiveMode: directorDecline ? 'emotional-beat' : 'scene-snapshot', promptFormat: 'natural-language', defaultAspectRatio: '4:3' } }, userId)
const state = () => stored.get(`states/${chatId}.json`)
async function until(check, label) {
  for (let tick = 0; tick < 400; tick++) { if (check()) return; await new Promise(resolve => setTimeout(resolve, 5)) }
  assert.fail(`${label}: ${JSON.stringify({ appearanceCalls, directorCalls, imageCalls, parserCalls: parserReleases.length, activeParsers, warnings: warnings.slice(-2), slots: Object.values(state()?.slots || {}).map(row => ({ requestId: row.requestId, status: row.status, error: row.error })) })}`)
}
if (mode === 'pending') {
  // Discover without spending, then exercise the explicit pending batch too.
  receive({ type: 'scan_message', chatId, messageId: message.id, automatic: true }, userId)
  await until(() => appearanceCalls === 1, 'discovery Appearance')
  releaseAppearance()
  await until(() => Object.values(state()?.slots || {}).length === 7, 'all pending records')
  // Model a persisted, deliberately paused backlog loaded by a fresh worker.
  for (const record of Object.values(state().slots)) record.status = 'paused-backlog'
  for (const lease of Object.values(state().dispatchLeases)) lease.status = 'paused-backlog'
  backend = await import(`../src/backend.ts?paused-batch=${Date.now()}`)
  receive({ type: 'queue_action', chatId, action: 'generate_all_pending' }, userId)
} else {
  events.get('GENERATION_ENDED')({ chatId, messageId: message.id, generationId: 'fresh-generation', content, generationType: 'normal' }, userId)
  await until(() => appearanceCalls === 1, 'Appearance starts')
  assert.equal(directorCalls, 0, 'Director must not read stale Appearance')
  assert.equal(parserReleases.length, 0, 'Surface parsers must not read stale Appearance')
  releaseAppearance()
}
if (matrixLimit) {
  await until(() => parserReleases.length === matrixLimit, `${matrixLimit} actual parsers start`)
  await until(() => directorCalls === 1, 'Director overlaps held parsers independently')
  await new Promise(resolve => setTimeout(resolve, 30))
  assert.equal(parserReleases.length, matrixLimit, 'excess real jobs must wait before starting parser calls')
  assert.equal(state().logs.filter(row => row.eventType === 'parser_started' && row.requestId?.startsWith('surface-')).length,
    matrixLimit, 'diagnostics must not report queued jobs as active prompt preparation')
  assert.equal(imageCalls, 0, 'held Director retains illustration priority')
  releaseDirector()
  for (let index = 0; index < surfaceCount; index++) {
    await until(() => parserReleases.length > index, `real parser ${index + 1} starts`)
    parserReleases[index]()
  }
  await until(() => Object.values(state()?.slots || {}).filter(row => row.target !== 'prose.illustration' && row.preparationCompletedAt).length === surfaceCount, 'all prompt preparations finish while GPU is held')
  await until(() => imageCalls === 1, 'one image starts while every parser has completed')
  assert.equal(maxParsers, matrixLimit, 'configured value must change actual production parser overlap')
  assert.equal(maxImages, 1, 'preprocessing setting cannot parallelize provider images')
  releaseImages()
  await until(() => state().stats.completedTotal === surfaceCount + 1, 'every admitted slot completes exactly once')
  assert.equal(imageCalls, surfaceCount + 1)
  assert.equal(new Set(starts).size, surfaceCount + 1)
  assert.equal(appearanceCalls, 1)
  console.log(`PASS real preprocessing limit ${matrixLimit}: ${surfaceCount} Surface parsers, peak ${maxParsers}, independent Director, shared Appearance, exact ${imageCalls} images, peak ImageGen ${maxImages}. Providers mocked.`)
  process.exit(0)
}
await until(() => parserReleases.length === 2, 'two bounded Surface parsers')
if (!mixed) {
  await until(() => directorCalls === 1, 'Director overlaps held Surface parsers')
  assert.equal(activeParsers, 2, 'Director must start before the Surface parsers finish')
}
if (mode === 'appearance') {
  assert.notEqual(backend.normalizeRelaySurfaceContracts(content), content, 'fixture must exercise safe contract normalization')
  assert.equal(appearanceCalls, 1, 'safe Surface normalization must not repeat the same turn Appearance call before the Director')
  console.log('PASS one canonical Appearance refresh shared by completed generation, Surface discovery and Director. Providers mocked.')
  process.exit(0)
}
assert.equal(maxParsers, 2)
await new Promise(resolve => setTimeout(resolve, 30))
assert.equal(parserReleases.length, 2, 'a third parser must wait for a preparation lease')
parserReleases[0]()
// The old outer batch incorrectly holds a preprocessing worker through the GPU
// wait; this next independent parser must start without completing that image.
await until(() => parserReleases.length === 3, 'third Surface parse must start while the first image is still running')
if (mode === 'cancel-preparing') {
  await receive({ type: 'queue_action', chatId, action: 'abort_all' }, userId)
  for (const release of parserReleases) release()
  releaseDirector(); releaseImages()
  await until(() => Object.values(state().slots).every(row => row.status === 'cancelled'), 'cancel during preparation settles every slot')
  await new Promise(resolve => setTimeout(resolve, 70))
  assert.equal(imageCalls, 0, 'Abort All during held planning must forbid all image starts')
  assert.equal(parserReleases.length, 3, 'Cancelled preparation waiters must never start their models')
  assert.equal(maxParsers, 2)
  console.log('PASS preprocessing priority cancellation: held Director and queued preparations settle without any successor model/image start. Providers mocked.')
  process.exit(0)
}
if (!mixed) {
  assert.equal(imageCalls, 0, 'Prepared Surface images must not overtake the same response’s held Relay illustration planning')
  releaseDirector()
  // Surface preparations already admitted to the bounded lane must settle so
  // the newly planned illustration can prepare too. None may spend on images.
  for (let index = 1; index < 5; index++) {
    await until(() => parserReleases.length > index, `parser ${index + 1} starts`)
    parserReleases[index]()
  }
}
await until(() => imageCalls === 1, 'first illustration provider is deliberately held')
if (!mixed && !noIllustration) assert(!starts[0].startsWith('surface-'), 'The same response’s Relay illustration must generate before Surface media')
if (noIllustration) assert.equal(starts[0], 'surface-0', 'A declined/failed Director releases the reservation and cannot strand Surface images')
if (cancel) {
  await receive({ type: 'queue_action', chatId, action: 'abort_all' }, userId)
  for (const release of parserReleases) release()
  releaseDirector(); releaseImages()
  await until(() => Object.values(state().slots).every(row => row.status === 'cancelled'), 'all waiting and active jobs cancelled')
  await new Promise(resolve => setTimeout(resolve, 70))
  assert.equal(parserReleases.length, 5, 'cancellation cannot launch any duplicate or successor preparation')
  assert.equal(imageCalls, 1, 'Abort All must forbid every successor image start')
  assert.equal(directorCalls, 1)
} else {
  for (let index = 1; index < 5; index++) {
    await until(() => parserReleases.length > index, `parser ${index + 1} starts`)
    parserReleases[index]()
  }
  await until(() => Object.values(state().slots).filter(row => row.target !== 'prose.illustration' && row.preparationCompletedAt).length === 5, 'all Surface prompts ready while the image remains held')
  assert.equal(imageCalls, 1, 'preprocessing overlap must not parallelize GPU calls')
  if (!mixed && !noIllustration) {
    releaseDirector()
    await until(() => Object.values(state().slots).some(row => row.target === 'prose.illustration' && row.preparationCompletedAt), 'Director result independently reaches the provider queue')
  }
  releaseImages()
  const expectedImages = mixed ? 7 : noIllustration ? 5 : 6
  await until(() => state().stats.completedTotal === expectedImages, 'every image durably completes')
  assert.equal(imageCalls, expectedImages, 'exactly one image per accepted request')
  assert.equal(parserReleases.length, 5, 'no duplicate Surface parses')
  assert.equal(new Set(starts).size, expectedImages, 'no duplicate provider dispatches')
  if (mixed) assert.deepEqual(starts.slice(0, 2), ['ordered-first', 'ordered-second'], 'Illustrations take priority over Surface images even when Surface preprocessing finishes while the first illustration is generating')
}
assert.equal(maxImages, 1, 'all image work must retain the shared serialized provider lane')
assert.equal(maxParsers, 2, 'model preprocessing must respect the configured global bound')
assert.equal(appearanceCalls, 1, 'both workflows must share the exact-turn Appearance refresh')
console.log(`PASS preprocessing overlap (${mode}): bounded Surface parsing ahead of held GPU, ${mixed ? 'authored illustration order' : 'independent Director after shared Appearance'}, ${cancel ? 'zero successor starts after Abort All' : 'exact durable outputs'}, serialized ImageGen. Providers mocked.`)
process.exit(0)
