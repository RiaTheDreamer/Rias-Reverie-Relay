// @ts-nocheck -- real backend action and persistence; all providers mocked.
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'

const scenarios = ['quiet', 'declined', 'emotional', 'missing-planner', 'no-persona', 'disabled', 'empty', 'utility-only', 'excluded', 'provider', 'cancel', 'limit', 'latest-swipe']
const scenario = process.argv[2]
if (!scenario) {
  for (const row of scenarios) {
    const child = spawnSync(process.execPath, [import.meta.filename, row], { encoding: 'utf8' })
    assert.equal(child.status, 0, `${row}:\n${child.stdout}\n${child.stderr}`)
  }
  console.log(`PASS Plan Latest: ${scenarios.length} isolated backend cases, manual quiet-scene selection, Emotional Beat decline, honest blockers, active swipe, cap and zero duplicate dispatch. Providers mocked.`)
  process.exit(0)
}
assert(scenarios.includes(scenario))
const chatId = 'latest-chat', userId = 'latest-user'
const stored = new Map(), events = new Map(), outbound = [], requests = [], updates = []
let receive, imageCalls = 0
const beat = 'Mira stands beside the window holding a silver folder with both hands.'
const history = [{ id: 'latest-story', role: 'assistant', is_user: false, content: scenario === 'empty' ? '' : scenario === 'excluded' ? `OOC: ${beat}` : beat, swipe_id: 0, extra: {} }]
const target = history[0]
if (scenario === 'utility-only') target.content = '<image_request id="old-image"><scene_brief>An old generated image prompt.</scene_brief></image_request>'
target.swipes = [target.content]
if (scenario === 'latest-swipe') {
  target.content = beat
  target.swipes = ['An obsolete first swipe.', beat]
  target.swipe_id = 1
  history.push({ id: 'latest-user', role: 'user', is_user: true, content: 'Thanks.' },
    { id: 'relay-owned', role: 'assistant', is_user: false, content: 'Extension output.', metadata: { extension: 'reverie_relay' } })
}
const connection = { id: 'image-fixture', name: 'Fixture', provider: 'fixture', model: 'fixture', default_parameters: {} }
const storage = {
  async getJson(path, { fallback } = {}) { return structuredClone(stored.get(path) ?? fallback) },
  async setJson(path, value) { stored.set(path, structuredClone(value)) }, async mkdir() {},
}
const shot = { rank: 1, title: 'Folder by window', reason: 'A grounded quiet still.',
  anchor: { paragraphIndex: 0, insertionSide: 'after', anchorExcerpt: beat }, aspectRatio: '4:3', expectedPeopleCount: 1,
  namedSubjects: ['Mira'], omittedSubjects: [], subjectDirectives: [{ name: 'Mira', role: 'character', appearanceOverrides: [], attireOverrides: [], temporaryTraits: [], expression: 'calm', pose: 'standing beside the window', action: 'holding the silver folder with both hands', gaze: 'toward the window', contact: 'her hands hold the folder' }],
  composition: { shotType: 'medium shot', cameraAngle: 'eye level', framing: 'waist up', blocking: 'Mira beside the window', foreground: 'folder', background: 'window', location: 'room', timeOfDay: 'day', lighting: 'daylight', mood: 'quiet', importantProps: ['silver folder'], backgroundPeople: '' },
  promptCore: 'Eye-level medium view of Mira beside a sunlit room window, a silver document folder supported by both of her hands.', negativeCore: '', referenceAssetIds: [], locationReferenceAssetIds: [] }
globalThis.spindle = {
  on(name, fn) { events.set(name, fn) }, onFrontendMessage(fn) { receive = fn },
  registerInterceptor() {}, registerMacro() {}, registerMessageContentProcessor() {}, unregisterTool() {},
  permissions: { has: () => true }, sendToFrontend(value) { outbound.push(value) }, storage, userStorage: storage,
  log: { info() {}, warn() {}, error() {} },
  chats: { async get(id) { return { id, character_id: 'mira-card', metadata: {} } } },
  characters: { async get() { return { id: 'mira-card', name: 'Mira' } } }, personas: { async getActive() { return null } },
  chat: { async getMessages() { return structuredClone(history) }, async updateMessage(chat, id, patch) {
    assert.equal(chat, chatId); updates.push(id)
    const message = history.find(row => row.id === id)
    Object.assign(message, structuredClone(patch))
    if (patch.content !== undefined) message.swipes[message.swipe_id] = patch.content
    events.get('MESSAGE_EDITED')({ chatId, messageId: id, message: structuredClone(message) }, userId)
  } },
  connections: { async list() { return [{ id: 'director', model: 'fixture' }] }, async get() { return { id: 'director', model: 'fixture' } } },
  images: { async get(id) { return { id, url: `/api/v1/images/${id}`, metadata: {} } }, async update() {} },
  imageGen: { async listConnections() { return [connection] }, async getConnection() { return connection }, async getProviders() { return [] },
    async generate() { imageCalls++; return { imageId: `image-${imageCalls}`, imageUrl: `/fixture-${imageCalls}.png` } } },
  generate: { async raw(request) {
    requests.push(structuredClone(request))
    if (scenario === 'provider') throw new Error('Fixture Director connection timed out.')
    if (scenario === 'cancel') { const error = new Error('Fixture cancelled.'); error.name = 'OperationCancelledError'; throw error }
    if (scenario === 'declined' || scenario === 'emotional' || scenario === 'quiet' && requests.length === 1) return JSON.stringify({ shouldIllustrate: false, reason: 'No strong visual beat.', illustrations: [] })
    return JSON.stringify({ shouldIllustrate: true, reason: 'A grounded quiet still.', illustrations: [shot] })
  } }, variables: { global: { async set() {} }, chat: { async set() {} } }, world_books: { async getActivated() { return [] }, entries: { async get() { return null } } },
}
const backend = await import('../src/backend')
await backend.setConfig({ enabled: true, autoGenerate: false, phoneEnabled: false, appearanceSidecarEnabled: false, surfaceUtilityInjectionEnabled: false,
  narrativeDlcEnabled: false, storyConstellationsEnabled: false, generationSettingsSource: 'relay', followNativeImageGen: false, imageConnectionId: connection.id,
  proseIllustratorSettings: { enabled: true, mode: scenario === 'disabled' ? 'off' : 'relay-planned', plannerConnectionId: scenario === 'missing-planner' ? '' : 'director', plannerModel: 'fixture', relayInsertionMode: 'auto',
    frequencyMode: scenario === 'emotional' ? 'every-eligible' : 'key-moments', illustrationsPerRun: 1, maximumIllustrationsPerMessage: 1,
    skipShortMessages: true, minimumMessageLength: 500, skipOoc: true, appearanceMemoryEnabled: false,
    perspectiveMode: scenario === 'emotional' ? 'emotional-beat' : scenario === 'no-persona' ? 'persona-pov' : 'scene-snapshot', promptFormat: 'natural-language', defaultAspectRatio: '4:3' } }, userId)
const state = () => stored.get(`states/${chatId}.json`)
const notices = () => outbound.filter(row => row.type === 'relay_notice' || row.type === 'error')
const plan = () => receive({ type: 'prose_illustrator_action', chatId, action: 'relay_plan_once' }, userId)
async function until(check) {
  for (let tick = 0; tick < 500; tick++) { if (check()) return; await new Promise(resolve => setTimeout(resolve, 10)) }
  assert.fail(JSON.stringify({ scenario, notices: notices(), calls: requests.length, logs: state()?.logs?.slice(-4) }))
}
plan()
await until(() => notices().length > 0)
const expectedError = { declined: /manual request.*no usable source-grounded shot/i, 'missing-planner': /configure.*Relay-Planned connection/i,
  'no-persona': /Persona POV needs a chat-bound or active Persona/, disabled: /Illustrator is off/i, empty: /no story text/i, 'utility-only': /no story text/i,
  excluded: /OOC.*excluded/i, provider: /Fixture Director connection timed out/, cancel: /stopped the active operation/ }
if (expectedError[scenario]) {
  assert.match(notices().at(-1).message, expectedError[scenario])
  assert.equal(imageCalls, 0)
  assert.equal(requests.length, scenario === 'declined' ? 2 : ['provider', 'cancel'].includes(scenario) ? 1 : 0)
  if (['declined', 'provider'].includes(scenario)) assert(Object.values(state().proseIllustrator.opportunities).some(row => row.status === 'failed-analysis'), 'keep the actual planning failure available in Diagnostics')
} else if (scenario === 'emotional') {
  assert.match(notices().at(-1).message, /Emotional Beat.*no.*emotional moment/i)
  assert.equal(requests.length, 1)
  assert.equal(imageCalls, 0)
} else {
  await until(() => state()?.stats?.completedTotal === 1)
  assert.equal(imageCalls, 1, 'one manual click creates exactly one image')
  assert.equal(requests.length, scenario === 'quiet' ? 2 : 1)
  assert(Object.values(state().slots).every(row => row.messageId === 'latest-story'), 'latest skips user and extension-owned messages')
  assert.match(requests[0].messages.find(row => row.role === 'system').content, /MANUAL ILLUSTRATION REQUEST/)
  const source = requests[0].messages.find(row => row.role === 'user').content
  assert(source.includes(beat), 'plan from the active swipe, never an obsolete swipe or extension output')
  assert.doesNotMatch(source, /An obsolete (?:first|second) swipe|Extension output/)
  assert.equal(Object.values(state().proseIllustrator.plans)[0].swipeId, scenario === 'latest-swipe' ? 1 : 0)
  assert.equal((await backend.getConfig(userId)).autoGenerate, false)
  const savedSettings = (await backend.getConfig(userId)).proseIllustratorSettings
  assert.equal(savedSettings.frequencyMode, 'key-moments')
  assert.equal(savedSettings.skipShortMessages, true, 'manual selection cannot rewrite automatic eligibility preferences')
  if (scenario === 'limit') {
    const before = notices().length
    plan()
    await until(() => notices().length > before)
    assert.match(notices().at(-1).message, /message.*limit of 1/i)
    assert.equal(requests.length, 1, 'full capacity blocks before Director spend')
    assert.equal(imageCalls, 1)
  }
}
assert(!notices().some(row => /found no strong visual beat/.test(row.message)), 'an unrelated blocker cannot be disguised as a visual-beat decline')
console.log(`PASS Plan Latest ${scenario}. Providers mocked.`)
process.exit(0)
