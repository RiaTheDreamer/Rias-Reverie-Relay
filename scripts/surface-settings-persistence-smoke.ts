// @ts-nocheck -- production backend storage routes plus mounted frontend controls; no providers.
import assert from 'node:assert/strict'
import { JSDOM, VirtualConsole } from 'jsdom'

const storage = new Map<string, unknown>()
const replies: any[] = []
let backendReceiver: Function
let blockedWrite: { userId: string; entered: () => void; resume: Promise<void> } | null = null
const stateReads = new Map<string, number>()
globalThis.spindle = {
  on() {}, registerInterceptor() {}, registerMacro() {}, registerMessageContentProcessor() {},
  onFrontendMessage(handler) { backendReceiver = handler },
  sendToFrontend(payload, userId) { replies.push({ payload: structuredClone(payload), userId }) },
  permissions: { has: () => true }, log: { info() {}, warn() {}, error() {} },
  userStorage: {
    async getJson(path, options = {}) {
      if (path.startsWith('states/')) stateReads.set(`${options.userId}:${path}`, (stateReads.get(`${options.userId}:${path}`) || 0) + 1)
      return structuredClone(storage.get(`${options.userId}:${path}`) ?? options.fallback ?? {})
    },
    async setJson(path, value, options = {}) {
      if (path === 'config.json' && blockedWrite?.userId === options.userId) {
        const gate = blockedWrite; blockedWrite = null; gate.entered(); await gate.resume
      }
      storage.set(`${options.userId}:${path}`, structuredClone(value))
    },
    async mkdir() {},
  },
  chats: { async get(id) { return { id, character_id: `character-${id}` } } },
  chat: { async getMessages() { return [] } }, characters: { async get() { return null } },
  personas: { async getActive() { return null } },
  variables: { global: { async set() {} }, chat: { async set() {} } },
  connections: { async list() { return [] } },
  imageGen: { async listConnections() { return [] }, async getProviders() { return [] } },
  generate: { raw() { throw new Error('Model calls forbidden in settings regression') } },
}
const backend = await import('../src/backend')
const userId = 'surface-persistence-user'
const initial = await backend.setConfig({ enabled: true, phoneEnabled: false, enableRelayOrb: false,
  autoRescanOnChatOpen: false, surfacePreferencesInitialized: true, narrativeDlcEnabled: false,
  narrativeDlcUtilityNames: [], settingsRevision: 0 }, userId)

async function request(payload, predicate, owner = userId) {
  const start = replies.length
  backendReceiver(payload, owner)
  for (let tries = 0; tries < 200; tries++) {
    const result = replies.slice(start).find(reply => reply.userId === owner && predicate(reply.payload))
    if (result) return result.payload
    await Bun.sleep(2)
  }
  throw new Error(`Backend did not reply to ${payload.type}`)
}
const stateFor = chatId => request({ type: 'list_state', chatId }, reply => reply.type === 'state' && reply.chatId === (chatId ?? null))
let operation = 0
const save = patch => {
  const operationId = `surface-save-${++operation}`
  return request({ type: 'relay_settings_patch', chatId: 'first-character', operationId, expectedRevision: 0, patch },
    reply => reply.type === 'relay_settings_patch_result' && reply.operationId === operationId)
}
const selected = ['dating-profile', 'notes-app', 'amazon']
const appValues = Object.fromEntries(Object.values(initial.globalSurfaceStudio.definitions).map(def => [def.surfaceId, selected.includes(def.baseSurfaceId)]))
assert.equal((await save({ kind: 'surface-prompt-enabled', values: appValues })).status, 'success')
const saved = await save({ kind: 'narrative-enabled', enabledNames: ['Plot Sparks', 'Location File'] })
assert.equal(saved.status, 'success')
const selectedIds = studio => Object.values(studio.definitions).filter(def => def.promptEnabled).map(def => def.baseSurfaceId).sort()
for (const chatId of ['first-character', 'new-character', 'another-new-character', undefined]) {
  const state = await stateFor(chatId)
  assert.deepEqual(selectedIds(state.customSurfaces), [...selected].sort(), `${chatId}: saved Apps selection must be user-wide`)
  assert.deepEqual(state.config.narrativeDlcUtilityNames, ['Plot Sparks', 'Location File'], `${chatId}: saved Narratives must be user-wide`)
}
const persisted = storage.get(`${userId}:config.json`)
assert.deepEqual(selectedIds(persisted.globalSurfaceStudio), [...selected].sort(), 'actual durable config must retain switches')
assert.deepEqual(selectedIds((await stateFor('first-character')).customSurfaces), [...selected].sort(), 'returning to the original character cannot reset switches')
assert.equal((await backend.getConfig('other-user')).narrativeDlcEnabled, false, 'global means this user, not every user')

// Older/global-only saves may predate the migration marker. Opening a fresh
// character must not promote its empty, all-enabled defaults over that save.
const legacyUser = 'global-selection-before-migration-marker'
await backend.setConfig({ globalSurfaceStudio: saved.customSurfaces, surfacePreferencesInitialized: false }, legacyUser)
const legacyState = await request({ type: 'list_state', chatId: 'brand-new-character' }, reply => reply.type === 'state' && reply.chatId === 'brand-new-character', legacyUser)
assert.deepEqual(selectedIds(legacyState.customSurfaces), [...selected].sort(), 'fresh character migration must preserve an already-saved global selection')
assert.deepEqual(selectedIds(storage.get(`${legacyUser}:config.json`).globalSurfaceStudio), [...selected].sort(), 'new-character migration must not overwrite durable global choices')
const localLegacyUser = 'saved-chat-before-global-preferences'
await backend.setConfig({ surfacePreferencesInitialized: false }, localLegacyUser)
storage.set(`${localLegacyUser}:states/older-character.json`, { customSurfaces: saved.customSurfaces })
const localLegacyState = await request({ type: 'list_state', chatId: 'older-character' }, reply => reply.type === 'state' && reply.chatId === 'older-character', localLegacyUser)
assert.deepEqual(selectedIds(localLegacyState.customSurfaces), [...selected].sort(), 'real persisted legacy chat preferences must still migrate')

// Hold a real settings write open while an older chat begins migration. Its
// queued migration must recheck the saved marker after the write completes.
const raceUser = 'selection-save-versus-chat-load'
await backend.setConfig({ surfacePreferencesInitialized: false }, raceUser)
storage.set(`${raceUser}:states/older-character.json`, { customSurfaces: initial.globalSurfaceStudio })
let enteredWrite: Function, resumeWrite: Function
const entered = new Promise<void>(resolve => { enteredWrite = resolve })
const resume = new Promise<void>(resolve => { resumeWrite = resolve })
blockedWrite = { userId: raceUser, entered: () => enteredWrite(), resume }
const racingSave = request({ type: 'relay_settings_patch', operationId: 'save-during-chat-load', expectedRevision: 0,
  patch: { kind: 'surface-prompt-enabled', values: appValues } }, reply => reply.type === 'relay_settings_patch_result' && reply.operationId === 'save-during-chat-load', raceUser)
await entered
const racingOpen = request({ type: 'list_state', chatId: 'older-character' }, reply => reply.type === 'state' && reply.chatId === 'older-character', raceUser)
for (let tries = 0; tries < 100 && !stateReads.has(`${raceUser}:states/older-character.json`); tries++) await Bun.sleep(1)
assert(stateReads.has(`${raceUser}:states/older-character.json`), 'race fixture must reach the persisted chat read')
for (let tick = 0; tick < 40; tick++) await Promise.resolve()
resumeWrite()
assert.equal((await racingSave).status, 'success')
assert.deepEqual(selectedIds((await racingOpen).customSurfaces), [...selected].sort(), 'a queued legacy migration cannot undo a newer explicit save')
assert.deepEqual(selectedIds(storage.get(`${raceUser}:config.json`).globalSurfaceStudio), [...selected].sort(), 'racing migration must preserve the durable save')

const errors: Error[] = []
const virtualConsole = new VirtualConsole()
virtualConsole.on('jsdomError', error => errors.push(error))
const dom = new JSDOM('<body><div id="drawer"></div></body>', { url: 'http://localhost/', pretendToBeVisual: true, virtualConsole })
const win = dom.window
for (const name of ['window', 'document', 'HTMLElement', 'HTMLButtonElement', 'HTMLImageElement', 'HTMLInputElement', 'HTMLSelectElement', 'HTMLTextAreaElement', 'HTMLStyleElement', 'HTMLDetailsElement', 'Element', 'ShadowRoot', 'Node', 'MutationObserver', 'Event', 'CustomEvent', 'getComputedStyle']) globalThis[name] = name === 'window' ? win : name === 'document' ? win.document : win[name]
win.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {} })
let timer = 0
win.setTimeout = () => ++timer; win.clearTimeout = () => {}
win.setInterval = () => ++timer; win.clearInterval = () => {}
win.requestAnimationFrame = () => ++timer; win.cancelAnimationFrame = () => {}
globalThis.requestAnimationFrame = win.requestAnimationFrame; globalThis.cancelAnimationFrame = win.cancelAnimationFrame
globalThis.fetch = async () => ({ ok: false, status: 404, json: async () => ({}) })
const drawer = document.getElementById('drawer')
const sent = [], actions = new Map(), events = new Map()
let receive: Function
let activeChatId = 'first-character'
const ctx = {
  dom: { addStyle: () => () => {}, findMessageElement: () => null, cleanup() {} },
  ui: {
    registerDrawerTab: () => ({ root: drawer, setTitle() {}, setShortName() {}, setBadge() {}, activate() {}, onActivate: () => () => {}, destroy() {} }),
    registerInputBarAction: options => ({ setLabel() {}, setSubtitle() {}, setEnabled() {}, onClick: handler => { actions.set(options.id, handler); return () => {} }, destroy() {} }),
  },
  events: { on(name, handler) { const handlers = events.get(name) || new Set(); handlers.add(handler); events.set(name, handlers); return () => handlers.delete(handler) }, emit() {} },
  display: { invalidate() {} }, messages: { registerTagInterceptor: () => () => {}, getRecent: () => [] },
  getActiveChat: () => ({ chatId: activeChatId, characterId: `character-${activeChatId}` }),
  sendToBackend(payload) { sent.push(payload) }, onBackendMessage(handler) { receive = handler; return () => {} },
}
const { setup } = await import('../src/frontend')
let cleanup = setup(ctx)
const newState = await stateFor(activeChatId)
const goView = label => {
  const button = [...drawer.querySelectorAll('.dg-suite-secondary-tab')].find(el => el.textContent === label)
  assert(button, `Surface navigation missing: ${label}`); button.click()
}
let stage = 'first mount'
const assertSelection = (apps = selected, narratives = ['Plot Sparks', 'Location File']) => {
  goView('Apps & UIs')
  const appBadge = drawer.querySelector('.dg-surface-intro .dg-chip')?.textContent
  for (const row of drawer.querySelectorAll('[data-surface-library-id]')) {
    assert.equal(row.querySelector('input').checked, apps.includes(row.dataset.surfaceLibraryId), `${stage}: App ${row.dataset.surfaceLibraryId} did not retain its selection`)
  }
  goView('Narratives')
  const checked = [...drawer.querySelectorAll('.dg-narrative-utility-row')].filter(row => row.querySelector('input').checked).map(row => row.querySelector('.dg-toggle-title').textContent)
  assert.deepEqual(checked.sort(), [...narratives].sort(), `${stage}: Narrative selection changed across a new character/state echo`)
  assert.equal(drawer.querySelector('.dg-surface-intro .dg-chip')?.textContent, `${narratives.length} Enabled`, `${stage}: Narratives badge must count only its enabled switches`)
  assert.equal(appBadge, `${apps.length} Enabled`, `${stage}: Apps badge must not include Narratives`)
}
try {
  receive(newState)
  actions.get('open-private-relay-surfaces')()
  assertSelection()

  // Real CHAT_SWITCHED event, not a synthetic remount of the settings view.
  activeChatId = 'new-character'
  stage = 'new character'
  for (const handler of events.get('CHAT_SWITCHED') || []) handler({ chatId: activeChatId })
  receive(await stateFor(activeChatId))
  assertSelection()

  // A state query begun before Save can finish after the character changes.
  // Global settings revision, not unrelated chat revision or wall-clock time,
  // determines whether its selection is newer. Equal timestamps are valid.
  const staleConfig = structuredClone(initial)
  stage = 'late global state'
  receive({ ...await stateFor(activeChatId), chatId: null, config: staleConfig, customSurfaces: staleConfig.globalSurfaceStudio, revision: 999 })
  assertSelection()
  stage = 'late global state with equal studio timestamps'
  staleConfig.globalSurfaceStudio.updatedAt = newState.config.globalSurfaceStudio.updatedAt
  receive({ ...await stateFor(activeChatId), chatId: null, config: staleConfig, customSurfaces: staleConfig.globalSurfaceStudio, revision: 999 })
  assertSelection()
  stage = 'late chat state'
  receive({ ...await stateFor(activeChatId), config: staleConfig, customSurfaces: staleConfig.globalSurfaceStudio, revision: 1000 })
  assertSelection()
  stage = 'late acknowledgement'
  receive({ type: 'relay_settings_patch_result', operationId: 'older-client-save', status: 'success', settingsRevision: 0, config: staleConfig, customSurfaces: staleConfig.globalSurfaceStudio, warnings: [] })
  assertSelection()

  // Cold frontend mount must read persisted choices, not remembered UI state.
  cleanup(); drawer.replaceChildren(); actions.clear(); events.clear()
  stage = 'cold reload'
  cleanup = setup(ctx)
  receive(await stateFor(activeChatId))
  actions.get('open-private-relay-surfaces')()
  assertSelection()

  // Exercise actual mounted checkbox -> wire patch -> durable backend save.
  // Switch character before the save acknowledgement returns.
  goView('Apps & UIs')
  const amazon = drawer.querySelector('[data-surface-library-id="amazon"] input')
  amazon.checked = false; amazon.dispatchEvent(new Event('input', { bubbles: true }))
  const appPatch = sent.filter(payload => payload.type === 'relay_settings_patch').at(-1)
  assert.deepEqual(appPatch.patch, { kind: 'surface-prompt-enabled', values: { amazon: false } })
  activeChatId = 'character-opened-while-saving'
  for (const handler of events.get('CHAT_SWITCHED') || []) handler({ chatId: activeChatId })
  receive(await stateFor(activeChatId))
  const fewerApps = selected.filter(id => id !== 'amazon')
  stage = 'pending selection during character switch'
  assertSelection(fewerApps)
  const appAck = await request(appPatch, reply => reply.type === 'relay_settings_patch_result' && reply.operationId === appPatch.operationId)
  assert.equal(appAck.status, 'success'); receive(appAck)
  stage = 'acknowledged mounted App save'
  assertSelection(fewerApps)
  const location = [...drawer.querySelectorAll('.dg-narrative-utility-row')].find(row => row.querySelector('.dg-toggle-title').textContent === 'Location File').querySelector('input')
  location.checked = false; location.dispatchEvent(new Event('input', { bubbles: true }))
  const narrativePatch = sent.filter(payload => payload.type === 'relay_settings_patch').at(-1)
  assert.deepEqual(narrativePatch.patch, { kind: 'narrative-enabled', enabledNames: ['Plot Sparks'] })
  const narrativeAck = await request(narrativePatch, reply => reply.type === 'relay_settings_patch_result' && reply.operationId === narrativePatch.operationId)
  assert.equal(narrativeAck.status, 'success'); receive(narrativeAck)
  stage = 'acknowledged mounted Narrative save'
  assertSelection(fewerApps, ['Plot Sparks'])
  // A newer remote save must still be adopted; the stale guard cannot freeze
  // a client's settings at its own last acknowledged selection.
  const remoteAck = await save({ kind: 'surface-prompt-enabled', values: { amazon: true } })
  receive(remoteAck)
  stage = 'newer remote-client save'
  assertSelection(selected, ['Plot Sparks'])
  await save({ kind: 'surface-prompt-enabled', values: Object.fromEntries(Object.keys(appValues).map(id => [id, false])) })
  await save({ kind: 'narrative-enabled', enabledNames: [] })
  activeChatId = 'new-character-with-everything-off'
  for (const handler of events.get('CHAT_SWITCHED') || []) handler({ chatId: activeChatId })
  receive(await stateFor(activeChatId))
  stage = 'explicit all-off selection in a fresh character'
  assertSelection([], [])
  // Rejecting an old settings response is not an acknowledgement of unrelated
  // optimistic controls. Their pending values must survive the next status tick.
  const phoneTab = [...drawer.querySelectorAll('.dg-suite-primary-tab')].find(el => el.textContent === 'Phone')
  assert(phoneTab); phoneTab.click()
  const phoneEnabled = () => drawer.querySelector('input[aria-label="Enable Reverie Phone"]')
  assert(phoneEnabled()); phoneEnabled().checked = true
  phoneEnabled().dispatchEvent(new Event('input', { bubbles: true }))
  const phonePatch = sent.filter(payload => payload.type === 'set_config' && payload.patch.phoneEnabled === true).at(-1)
  assert(phonePatch, 'mounted Phone toggle must use the ordinary config save path')
  const currentState = await stateFor(activeChatId)
  receive({ ...currentState, chatId: null, config: staleConfig })
  receive(currentState)
  assert.equal(phoneEnabled().checked, true, 'ignoring a stale response must not falsely confirm and retire an unrelated pending setting')
  receive(await request(phonePatch, reply => reply.type === 'state' && reply.chatId === activeChatId && reply.config.phoneEnabled))
  assert.equal(phoneEnabled().checked, true, 'actual persisted acknowledgement must keep the ordinary setting')
  assert.deepEqual(errors, [], 'mounted event handlers must not throw')
  assert(!sent.some(payload => /generate|dispatch|reparse/.test(payload.type)), 'editing preferences must never start a model/provider')
} finally {
  cleanup(); dom.window.close()
}
console.log('Surface selection persistence passed: durable user-wide Apps/Narratives, fresh characters, return/reload, stale cross-chat/global state and acknowledgements, no providers.')
