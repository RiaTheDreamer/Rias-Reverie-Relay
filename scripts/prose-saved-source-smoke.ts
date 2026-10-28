// @ts-nocheck -- real backend event/discovery/selection, in-memory host only.
import assert from 'node:assert/strict'
import { contentFingerprint } from '../src/contracts'

const stored = new Map(), events = new Map(), output = [], warnings = []
let directorCalls = 0, imageCalls = 0, directorRequest = '', hostAtDirector = '', hostWrites = 0
let changeSourceDuringDirector = false
const userId = 'saved-source-user', chatId = 'saved-source-chat'
const stale = 'Mira stands beside the window holding a red folder.'
const savedBeat = 'Mira stands beside the window holding a silver folder.'
// Exact live race: the completed Surface scan inserts the missing attribute
// separator while the Director is running. Planning must use that same source.
const saved = `${savedBeat}\n\n<twitter_app><for_you><tw_post author="Herald" handle="@herald" time="1m" avatar=""verified="true" replies="3" reposts="2" likes="8" views="12" pinned="true">A quiet morning.</tw_post></for_you></twitter_app>`
const message = { id: 'saved-message', role: 'assistant', is_user: false, content: saved, swipes: [stale], swipe_id: 0, extra: {} }
const history = [message]
const storage = { async getJson(path, { fallback } = {}) { return structuredClone(stored.get(path) ?? fallback) }, async setJson(path, value) { stored.set(path, structuredClone(value)) }, async mkdir() {} }
const forbiddenImage = () => { imageCalls++; throw Error('No image provider allowed') }
globalThis.spindle = {
  on(name, fn) { events.set(name, fn) }, onFrontendMessage() {}, registerInterceptor() {}, registerMacro() {}, registerMessageContentProcessor() {}, unregisterTool() {},
  permissions: { has: () => true }, sendToFrontend(value) { output.push(value) },
  log: { info() {}, warn(value) { warnings.push(value) }, error(value) { warnings.push(value) } }, userStorage: storage, storage,
  chats: { async get(id) { return { id, character_id: 'mira-card', metadata: {} } } },
  characters: { async get() { return { id: 'mira-card', name: 'Mira' } } }, personas: { async getActive() { return null } },
  chat: { async getMessages() { return structuredClone(history) }, async updateMessage(chat, id, patch) {
    assert.equal(chat, chatId); assert.equal(id, message.id)
    hostWrites++; Object.assign(message, structuredClone(patch))
    if (patch.content !== undefined) message.swipes[message.swipe_id] = patch.content
    events.get('MESSAGE_EDITED')({ chatId, messageId: id, message: structuredClone(message) }, userId)
  } },
  connections: { async list() { return [{ id: 'director', name: 'Director fixture', provider: 'fixture', model: 'fixture' }] }, async get() { return { id: 'director', name: 'Director fixture', provider: 'fixture', model: 'fixture' } } },
  imageGen: { async listConnections() { return [] }, generate: forbiddenImage },
  generate: { async raw(request) {
    directorCalls++; directorRequest = JSON.stringify(request.messages); hostAtDirector = message.content
    await new Promise(resolve => setTimeout(resolve, 150))
    if (changeSourceDuringDirector) {
      const changed = history.at(-1)
      changed.content = changed.content.replace('silver folder', 'gold folder')
      changed.swipes[0] = changed.content
    }
    return JSON.stringify({ shouldIllustrate: true, reason: 'One saved beat.', illustrations: [{ rank: 1, title: 'Folder at window', reason: 'Saved beat.',
      anchor: { paragraphIndex: 0, insertionSide: 'after', anchorExcerpt: savedBeat }, aspectRatio: '4:3', expectedPeopleCount: 1,
      namedSubjects: ['Mira'], omittedSubjects: [], subjectDirectives: [{ name: 'Mira', role: 'character', appearanceOverrides: [], attireOverrides: [], temporaryTraits: [], expression: 'calm', pose: 'standing beside the window', action: 'holding the silver folder', gaze: 'toward the window', contact: 'her hands hold the folder' }],
      composition: { shotType: 'medium shot', cameraAngle: 'eye level', framing: 'waist up', blocking: 'Mira beside the window', foreground: 'folder', background: 'window', location: 'room', timeOfDay: 'day', lighting: 'daylight', mood: 'quiet', importantProps: ['silver folder'], backgroundPeople: '' },
      promptCore: savedBeat, negativeCore: '', booruTags: [], referenceAssetIds: [], locationReferenceAssetIds: [] }] })
  } }, variables: { global: { async set() {} }, chat: { async set() {} } }, world_books: { async getActivated() { return [] }, entries: { async get() { return null } } },
}
const backend = await import('../src/backend')
const canonicalSaved = backend.normalizeRelaySurfaceContracts(saved)
assert.notEqual(canonicalSaved, saved, 'fixture must exercise a real deterministic Surface normalization')
assert.equal(canonicalSaved, saved.replace('avatar=""verified=', 'avatar="" verified='))
await backend.setConfig({ enabled: true, autoGenerate: true, phoneEnabled: false, appearanceSidecarEnabled: false, surfaceUtilityInjectionEnabled: false,
  narrativeDlcEnabled: false, storyConstellationsEnabled: false, proseIllustratorSettings: { enabled: true, mode: 'relay-planned', plannerConnectionId: 'director',
    plannerModel: 'fixture', frequencyMode: 'every-eligible', illustrationsPerRun: 1, minimumImages: 1, maximumImages: 1, minimumMessageLength: 0,
    appearanceMemoryEnabled: false, perspectiveMode: 'scene-snapshot', promptFormat: 'natural-language', defaultAspectRatio: '4:3' } }, userId)
// Cache the stale event snapshot just as MESSAGE_SENT can do before final host
// processing, then complete with the same stale terminal text.
events.get('MESSAGE_SENT')({ chatId, message: { ...message, content: stale, swipes: [stale] } }, userId)
events.get('GENERATION_ENDED')({ chatId, messageId: message.id, generationId: 'saved-source-generation', content: stale }, userId)
let state
for (let tick = 0; tick < 500; tick++) {
  state = stored.get(`states/${chatId}.json`)
  if (state?.logs?.some(row => row.eventType === 'prose_opportunity_analysis_failed') || Object.keys(state?.proseIllustrator?.plans || {}).length) break
  await new Promise(resolve => setTimeout(resolve, 10))
}
assert.equal(directorCalls, 1, warnings.join('\n'))
assert(directorRequest.includes(savedBeat), 'Director must read the persisted swipe, not terminal text or the cached MESSAGE_SENT snapshot')
assert.equal(hostAtDirector, canonicalSaved, 'persist the same normalized saved source before the Director can start')
assert.equal(hostWrites, 1, 'safe normalization is persisted once, not independently by racing discovery paths')
const opportunities = Object.values(state.proseIllustrator.opportunities)
assert.equal(opportunities.filter(row => row.status === 'failed-analysis').length, 0, JSON.stringify(state.logs.slice(-3)))
assert.equal(opportunities.length, 1, 'reconciliation must retain the newly planned saved-source candidate')
assert.equal(opportunities[0].sourceContentFingerprint, contentFingerprint(canonicalSaved))
assert.equal(Object.keys(state.proseIllustrator.plans).length, 1, 'selection must also read the persisted swipe despite the stale event snapshot')
assert.equal(imageCalls, 0, 'the intentionally unavailable native image connection must not spend')
events.get('MESSAGE_SENT')({ chatId, message }, userId)
await new Promise(resolve => setTimeout(resolve, 250))
assert.equal(directorCalls, 1, 'historical MESSAGE_SENT replay is not fresh planning authority')
// A real source edit during analysis must still invalidate its candidates. Do
// not solve the normalization race by weakening exact-source ownership checks.
const changedMessage = { ...message, id: 'changed-message', content: `${canonicalSaved}\n\nThe lamp flickers.`, swipes: [`${canonicalSaved}\n\nThe lamp flickers.`] }
history.push(changedMessage); changeSourceDuringDirector = true
events.get('GENERATION_ENDED')({ chatId, messageId: changedMessage.id, generationId: 'changed-source-generation', content: changedMessage.content }, userId)
for (let tick = 0; tick < 500; tick++) {
  state = stored.get(`states/${chatId}.json`)
  if (state?.logs?.some(row => row.messageId === changedMessage.id && row.eventType === 'prose_opportunity_analysis_failed')) break
  await new Promise(resolve => setTimeout(resolve, 10))
}
assert.equal(directorCalls, 2)
assert(state.logs.some(row => row.messageId === changedMessage.id && row.eventType === 'prose_opportunity_analysis_failed'), 'changed source must not dispatch its old plan')
assert.equal(Object.values(state.proseIllustrator.plans).filter(row => row.messageId === changedMessage.id).length, 0)
assert.equal(imageCalls, 0)
history.length = 0
events.get('GENERATION_ENDED')({ chatId, messageId: 'deleted-message', generationId: 'deleted-generation', content: stale }, userId)
await new Promise(resolve => setTimeout(resolve, 1200))
assert.equal(directorCalls, 2, 'a raw terminal payload cannot resurrect a deleted saved message')
assert.equal(imageCalls, 0)
console.log('PASS saved-source planning: deterministic Surface repair precedes Director fingerprinting; stale events/swipes cannot replace canonical active content, reconciliation retains the candidate, selection creates its plan, replay/deleted sources stay inert, zero image providers.')
