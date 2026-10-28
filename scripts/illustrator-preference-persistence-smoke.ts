// @ts-nocheck -- mounted production controls -> real backend save -> cold reload.
import assert from 'node:assert/strict'
import { JSDOM } from 'jsdom'
const mode = process.argv[2] || 'instant'
const userId = 'illustrator-preference-user'
const stored = new Map(), outbound = [], sent = [], events = new Map()
let backendReceiver, frontendReceiver, activeChatId = 'first-chat'
let providerCalls = 0
const storage = {
  async getJson(path, options = {}) { return structuredClone(stored.get(`${options.userId}:${path}`) ?? options.fallback) },
  async setJson(path, value, options = {}) { stored.set(`${options.userId}:${path}`, structuredClone(value)) }, async mkdir() {},
}
globalThis.spindle = {
  on() {}, registerInterceptor() {}, registerMacro() {}, registerMessageContentProcessor() {},
  onFrontendMessage(handler) { backendReceiver = handler }, sendToFrontend(value) { outbound.push(structuredClone(value)) },
  userStorage: storage, permissions: { has: () => true }, log: { info() {}, warn() {}, error() {} },
  chats: { async get(id) { return { id, character_id: 'mira' } } }, chat: { async getMessages() { return [] } },
  characters: { async get() { return null } }, personas: { async getActive() { return null } },
  variables: { global: { async set() {} }, chat: { async set() {} } },
  connections: { async list() { return [] } }, imageGen: { async listConnections() { return [] }, async getProviders() { return [] },
    generate() { providerCalls++; throw new Error('Preference edits cannot start an image') } },
  generate: { raw() { providerCalls++; throw new Error('Preference edits cannot start a model') } },
}
let backend = await import('../src/backend')
await backend.setConfig({ enabled: true, phoneEnabled: false, tutorialModeEnabled: false, enableRelayOrb: false,
  autoRescanOnChatOpen: false, narrativeDlcEnabled: false, surfaceUtilityInjectionEnabled: false,
  queueConcurrencyLimit: 2, proseIllustratorSettings: { enabled: true, mode: 'inline-protocol', instantIllustrationDispatch: false } }, userId)
async function request(payload) {
  const start = outbound.length
  backendReceiver(payload, userId)
  for (let i = 0; i < 600; i++) {
    const state = outbound.slice(start).find(row => row.type === 'state' && row.chatId === payload.chatId)
    if (state) return state
    await Bun.sleep(2)
  }
  assert.fail(`No state after ${payload.type}`)
}
const dom = new JSDOM('<body><main></main></body>', { url: 'http://localhost/', pretendToBeVisual: true })
const win = dom.window
for (const name of ['window','document','HTMLElement','HTMLButtonElement','HTMLImageElement','HTMLInputElement','HTMLSelectElement','HTMLTextAreaElement','HTMLStyleElement','Element','ShadowRoot','Node','MutationObserver','Event','CustomEvent','getComputedStyle']) globalThis[name] = name === 'window' ? win : name === 'document' ? win.document : win[name]
win.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {} })
win.setInterval = () => 0; win.clearInterval = () => {}
const frames = new Map(); let frame = 0
win.requestAnimationFrame = callback => { frames.set(++frame, callback); return frame }
win.cancelAnimationFrame = id => frames.delete(id)
globalThis.requestAnimationFrame = win.requestAnimationFrame; globalThis.cancelAnimationFrame = win.cancelAnimationFrame
globalThis.fetch = async () => ({ ok: false, status: 404 })
const root = document.querySelector('main')
const ctx = {
  dom: { addStyle: () => () => {}, findMessageElement: () => null, cleanup() {} },
  ui: { registerDrawerTab: () => ({ root, setTitle() {}, setShortName() {}, setBadge() {}, activate() {}, onActivate: () => () => {}, destroy() {} }),
    registerInputBarAction: () => ({ setLabel() {}, setSubtitle() {}, setEnabled() {}, onClick: () => () => {}, destroy() {} }) },
  events: { on(name, handler) { const handlers = events.get(name) || new Set(); handlers.add(handler); events.set(name, handlers); return () => handlers.delete(handler) }, emit() {} },
  display: { invalidate() {} }, messages: { registerTagInterceptor: () => () => {}, getRecent: () => [] },
  getActiveChat: () => ({ chatId: activeChatId, characterId: 'mira' }),
  sendToBackend(value) { sent.push(structuredClone(value)) }, onBackendMessage(handler) { frontendReceiver = handler; return () => {} },
}
const { setup } = await import('../src/frontend')
let cleanup = setup(ctx)
async function flush() { for (let i = 0; i < 6; i++) { await Promise.resolve(); const batch = [...frames]; frames.clear(); for (const [, cb] of batch) cb(0) } }
async function receive(value) { frontendReceiver(value); await flush() }
const button = label => [...root.querySelectorAll('button.dg-illustrator-mode-card')].find(el => el.querySelector('strong')?.textContent.trim() === label)
  || [...root.querySelectorAll('button')].find(el => el.textContent.trim() === label)
const instant = () => [...root.querySelectorAll('.dg-toggle')].find(el => el.querySelector('.dg-toggle-title')?.textContent === 'Instant')?.querySelector('input')
const concurrency = () => [...root.querySelectorAll('.dg-field')].find(el => el.textContent.startsWith('Concurrent Relay Preprocessing Jobs'))?.querySelector('input')
const currentState = () => request({ type: 'list_state', chatId: activeChatId })
async function saveLast() {
  const payload = sent.findLast(row => row.type === 'set_config')
  assert(payload, 'mounted control must emit a durable settings write')
  const ack = await request(payload); await receive(ack); return ack
}
try {
  await receive(await currentState())
  if (mode === 'workflow') {
    button('Illustrations').click(); await flush()
    const before = await currentState()
    button('Relay').click(); await flush()
    const relayAck = await saveLast()
    assert(relayAck.config.settingsRevision > before.config.settingsRevision, 'Illustration writes must advance the revision used to reject delayed settings snapshots')
    button('Story Model').click(); await flush()
    const storyAck = await saveLast()
    assert(storyAck.config.settingsRevision > relayAck.config.settingsRevision)
    await receive(relayAck)
    assert.equal(button('Story Model').getAttribute('aria-pressed'), 'true', 'delayed Relay acknowledgement must not revert a confirmed Story Model selection')
    // Other controls must send only their edited fields. An old full-form
    // payload can otherwise restore an earlier workflow after a newer save.
    assert.deepEqual(Object.keys(sent.findLast(row => row.type === 'set_config').patch.proseIllustratorSettings).sort(), ['autoGenerateRequiresApproval','enabled','immediateDispatchOnOpportunitySelection','mode','paused','placementPolicy'].sort())
    const partialAck = await request({ type: 'set_config', chatId: activeChatId, patch: { proseIllustratorSettings: { showCaptions: false } } })
    assert.equal(partialAck.config.proseIllustratorSettings.mode, 'inline-protocol', 'partial settings edits must merge into the latest workflow')
    await receive(partialAck)
    activeChatId = 'second-chat'
    for (const handler of events.get('CHAT_SWITCHED') || []) handler({ chatId: activeChatId })
    await receive(await currentState())
    button('Relay').click(); await flush(); await saveLast()
    await receive(storyAck)
    assert.equal(button('Relay').getAttribute('aria-pressed'), 'true', 'delayed prior-chat snapshot must not undo Relay selection')
    assert.equal((await backend.getConfig(userId)).proseIllustratorSettings.mode, 'relay-planned')
    console.log('PASS workflow persistence: revision ordering, both modes, partial edits and delayed prior-chat snapshots.')
    process.exit(0)
  } else if (mode === 'instant') {
    button('Illustrations').click(); await flush()
    assert(instant(), 'Story Model Instant control must mount')
    instant().checked = true; instant().dispatchEvent(new Event('input', { bubbles: true })); await flush()
    await saveLast()
    button('Relay').click(); await flush()
    const ack = await saveLast()
    assert.equal(ack.config.proseIllustratorSettings.mode, 'relay-planned')
    assert(instant()?.checked, 'Relay must expose its saved Instant analysis switch rather than hide the preference')
    assert.match(instant().closest('.dg-toggle').textContent, /Surface image requests.*streams.*analysis/s)
    assert.equal(ack.config.proseIllustratorSettings.instantIllustrationDispatch, true, 'Relay mode save must preserve the Instant preference')
    assert.equal(stored.get(`${userId}:config.json`).proseIllustratorSettings.instantIllustrationDispatch, true)
    backendReceiver({ type: 'scan_message', chatId: activeChatId, messageId: 'streaming', swipeId: 0, automatic: false, streaming: true,
      sourceContent: '<reverie-illustration request="generate" slot="stream"><visual_prompt>Adult at a window.</visual_prompt></reverie-illustration>' }, userId)
    await Bun.sleep(25)
    assert.equal(providerCalls, 0, 'saved Instant=true must not activate Story Model streaming dispatch in Relay mode')
    assert.equal(Object.keys(stored.get(`${userId}:states/${activeChatId}.json`)?.slots || {}).length, 0, 'Relay streaming request must not create a real slot')
  } else {
    button('Settings').click(); await flush()
    assert(concurrency(), 'concurrency control must mount')
    concurrency().focus(); concurrency().value = '6'
    const start = sent.length
    concurrency().dispatchEvent(new Event('input', { bubbles: true })); await flush()
    assert(sent.slice(start).some(row => row.type === 'set_config' && row.patch.queueConcurrencyLimit === 6), 'valid concurrency input must save before chat switch/reload, without requiring blur')
    await saveLast()
    const saves = sent.filter(row => row.type === 'set_config' && row.patch.queueConcurrencyLimit === 6).length
    concurrency().dispatchEvent(new Event('change', { bubbles: true })); concurrency().blur(); await flush()
    assert.equal(sent.filter(row => row.type === 'set_config' && row.patch.queueConcurrencyLimit === 6).length, saves, 'input and blur cannot send duplicate saves')
    const beforeDrafts = sent.filter(row => row.type === 'set_config').length
    for (const draft of ['', '0', '9', '3.5']) {
      concurrency().value = draft; concurrency().dispatchEvent(new Event('input', { bubbles: true })); await flush()
    }
    assert.equal(sent.filter(row => row.type === 'set_config').length, beforeDrafts, 'incomplete, fractional and out-of-bound drafts stay local')
    concurrency().value = '9'; concurrency().dispatchEvent(new Event('change', { bubbles: true })); await flush(); await saveLast()
    assert.equal(concurrency().value, '8', 'committing an out-of-bound draft uses the existing safe limit')
    concurrency().value = '6'; concurrency().dispatchEvent(new Event('input', { bubbles: true })); await flush(); await saveLast()
  }
  activeChatId = 'new-chat'
  for (const handler of events.get('CHAT_SWITCHED') || []) handler({ chatId: activeChatId })
  await receive(await currentState())
  const persisted = await backend.getConfig(userId)
  assert.equal(mode === 'instant' ? persisted.proseIllustratorSettings.instantIllustrationDispatch : persisted.queueConcurrencyLimit, mode === 'instant' ? true : 6)
  // Cold backend/frontend instances must read durable storage, not optimistic UI or cache.
  cleanup(); root.replaceChildren(); events.clear()
  backend = await import(`../src/backend.ts?preference-cold=${mode}`)
  cleanup = setup(ctx); await receive(await currentState())
  if (mode === 'instant') {
    button('Illustrations').click(); await flush(); button('Story Model').click(); await flush(); await saveLast()
    assert.equal(instant().checked, true, 'returning to Story Model after reload must retain Instant')
    instant().checked = false; instant().dispatchEvent(new Event('input', { bubbles: true })); await flush(); await saveLast()
    assert.equal((await backend.getConfig(userId)).proseIllustratorSettings.instantIllustrationDispatch, false, 'turning Instant off must persist too')
  } else {
    button('Settings').click(); await flush()
    assert.equal(concurrency().value, '6', 'new chat/cold reload must mount the saved user-wide concurrency')
    assert.equal(stored.get(`${userId}:config.json`).queueConcurrencyLimit, 6)
  }
  assert(!sent.some(row => /generate|dispatch|reparse/.test(row.type)), 'preference changes must not dispatch providers')
  assert.equal(providerCalls, 0)
  console.log(`PASS ${mode} persistence: real mounted control, durable backend save, mode/chat switch, cold reload and no provider calls.`)
} finally { cleanup(); dom.window.close() }
