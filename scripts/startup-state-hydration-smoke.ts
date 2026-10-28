// @ts-nocheck -- real backend + mounted frontend; gates model host startup waits.
import assert from 'node:assert/strict'
import { JSDOM } from 'jsdom'

const mode = process.argv[2] || 'catalogs'
const userId = 'startup-user', chatId = 'startup-chat'
const stored = new Map(), outbound = [], sent = [], errors = [], bootstrapWrites = [], bootstrapSavedSlots = []
let backendReceiver, frontendReceiver, providerCalls = 0, writes = 0, historyCalls = 0, macroCalls = 0, catalogCalls = 0
let blocked = true, release
const gate = new Promise(resolve => { release = resolve })
const wait = async kind => { if (blocked && mode === kind) await gate }
const storage = {
  async getJson(path, options = {}) { await wait(mode === 'storage' ? 'storage' : 'unused'); return structuredClone(stored.get(`${options.userId}:${path}`) ?? options.fallback) },
  async setJson(path, value, options = {}) { writes++; stored.set(`${options.userId}:${path}`, structuredClone(value)) }, async mkdir() {},
}
globalThis.spindle = {
  on() {}, registerInterceptor() {}, registerMacro() {}, registerMessageContentProcessor() {},
  onFrontendMessage(handler) { backendReceiver = handler }, sendToFrontend(value) {
    outbound.push(structuredClone(value))
    if (value.bootstrap) { bootstrapWrites.push(writes); bootstrapSavedSlots.push(structuredClone(stored.get(`${userId}:states/${chatId}.json`)?.slots)) }
  },
  userStorage: storage, permissions: { has: () => true }, log: { info() {}, warn() {}, error(value) { errors.push(value) } },
  chats: { async get(id) { return { id, character_id: 'mira', metadata: {} } } },
  chat: { async getMessages() { historyCalls++; await wait('history'); return [] } },
  characters: { async get() { return null } }, personas: { async getActive() { return null } },
  variables: { global: { async set() { macroCalls++; await wait('macro') } }, chat: { async set() { macroCalls++; await wait('macro') } } },
  connections: { async list() { catalogCalls++; await wait('catalogs'); return [{ id: 'saved-parser', name: 'Saved parser' }] } },
  imageGen: { async listConnections() { await wait('image-catalog'); return [{ id: 'saved-image', name: 'Saved image' }] },
    async getProviders() { await wait('providers'); return [{ id: 'fixture', name: 'Fixture' }] },
    generate() { providerCalls++; throw new Error('Startup cannot generate images') } },
  generate: { raw() { providerCalls++; throw new Error('Startup cannot generate text') } },
}
const backend = await import('../src/backend')
// Seed authoritative saved preferences without making a first state request.
blocked = false
await backend.setConfig({ enabled: true, phoneEnabled: false, tutorialModeEnabled: false, enableRelayOrb: true,
  autoRescanOnChatOpen: true, narrativeDlcEnabled: false, surfaceUtilityInjectionEnabled: false,
  surfacePreferencesInitialized: true, queueConcurrencyLimit: 7, imageConnectionId: 'saved-image',
  generationSettingsSource: 'relay', followNativeImageGen: false,
  proseIllustratorSettings: { enabled: true, mode: 'relay-planned', instantIllustrationDispatch: true } }, userId)
blocked = true; writes = 0
const savedSlot = { key: `${chatId}:original:0:saved:illustration`, chatId, messageId: 'original', swipeId: 0,
  requestId: 'saved', slot: 'illustration', target: 'prose.illustration', targetApp: 'prose', status: 'completed',
  imageId: 'saved-image-id', imageUrl: '/images/saved.png', originalSceneBrief: 'An adult holds a folder.',
  originalRequestXml: '', originalNegativePrompt: '', resolvedPositivePrompt: 'Saved prompt.',
  proseSynthetic: true, proseAnchor: { messageId: 'original', swipeId: 0, paragraphIndex: 0, insertionSide: 'after', selectedExcerpt: 'An adult holds a folder.' },
  alt: 'Folder', count: 1, createdAt: 10, updatedAt: 20, completedAt: 20, history: [], promptPipeline: {} }
stored.set(`${userId}:states/${chatId}.json`, { slots: { [savedSlot.key]: savedSlot }, revision: 4 })
async function until(predicate, label) {
  for (let i = 0; i < 150; i++) { if (predicate()) return; await Bun.sleep(2) }
  assert.fail(label)
}
const projection = () => outbound.find(row => row.type === 'state' && row.bootstrap === true)
try {
  if (mode !== 'retry' && mode !== 'home') {
    for (let i = 0; i < 4; i++) backendReceiver({ type: 'list_state', chatId, bootstrap: true }, userId)
    if (mode === 'storage') {
      await Bun.sleep(30)
      assert.equal(outbound.filter(row => row.type === 'state').length, 0, 'do not paint defaults while authoritative storage is unavailable')
      assert.equal(writes, 0, 'a pending storage read must not overwrite saved settings')
      release(); blocked = false
    }
    await until(() => projection(), 'saved settings/slots must arrive before optional startup work completes')
    assert.equal(bootstrapWrites[0], 0, 'first hydration reads saved data without persisting maintenance/migration changes')
    assert.equal(projection().config.queueConcurrencyLimit, 7)
    assert.equal(projection().config.imageConnectionId, 'saved-image')
    assert.equal(projection().records[0]?.imageUrl, savedSlot.imageUrl, 'saved image slots hydrate without regeneration or history discovery')
    assert.equal(projection().records[0]?.resolvedPositivePrompt, undefined, 'early completed-slot projection omits heavy prompt/history payloads before durable compaction')
    assert.equal(bootstrapSavedSlots[0][savedSlot.key]?.resolvedPositivePrompt, savedSlot.resolvedPositivePrompt, 'read-only projection preserves saved prompt/history data')
    assert.equal(outbound.filter(row => row.bootstrap === true).length, 1, 'simultaneous initial requests share one storage read/reply')
    if (mode !== 'storage') {
      await Bun.sleep(20)
      assert.equal(outbound.filter(row => row.type === 'state' && !row.bootstrap).length, 0, 'fixture must really hold the full state reply')
      backendReceiver({ type: 'list_state', chatId, bootstrap: true }, userId)
      await until(() => outbound.filter(row => row.bootstrap === true).length === 2, 'a later retry receives saved state even if the first reply was lost')
    }
  }

  const dom = new JSDOM('<body><main></main></body>', { url: 'http://localhost/', pretendToBeVisual: true })
  const win = dom.window
  for (const name of ['window','document','HTMLElement','HTMLButtonElement','HTMLImageElement','HTMLInputElement','HTMLSelectElement','HTMLTextAreaElement','HTMLStyleElement','Element','ShadowRoot','Node','MutationObserver','Event','CustomEvent','getComputedStyle']) globalThis[name] = name === 'window' ? win : name === 'document' ? win.document : win[name]
  win.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {} })
  const intervals = new Map(); let intervalId = 0
  win.setInterval = (cb, ms) => { intervals.set(++intervalId, { cb, ms }); return intervalId }; win.clearInterval = id => intervals.delete(id)
  const frames = new Map(); let frame = 0
  win.requestAnimationFrame = cb => { frames.set(++frame, cb); return frame }; win.cancelAnimationFrame = id => frames.delete(id)
  globalThis.requestAnimationFrame = win.requestAnimationFrame; globalThis.cancelAnimationFrame = win.cancelAnimationFrame
  globalThis.fetch = async () => ({ ok: false, status: 404 })
  const root = document.querySelector('main')
  let active = mode === 'home' ? null : chatId
  const ctx = {
    dom: { addStyle: () => () => {}, findMessageElement: () => null, cleanup() {} },
    ui: { registerDrawerTab: () => ({ root, setTitle() {}, setShortName() {}, setBadge() {}, activate() {}, onActivate: () => () => {}, destroy() {} }),
      registerInputBarAction: () => ({ setLabel() {}, setSubtitle() {}, setEnabled() {}, onClick: () => () => {}, destroy() {} }) },
    events: { on: () => () => {}, emit() {} }, display: { invalidate() {} },
    messages: { registerTagInterceptor: () => () => {}, getRecent: () => [] },
    getActiveChat: () => ({ chatId: active, characterId: active ? 'mira' : null }),
    sendToBackend(value) { sent.push(structuredClone(value)) }, onBackendMessage(handler) { frontendReceiver = handler; return () => {} },
  }
  const { setup } = await import('../src/frontend')
  const cleanup = setup(ctx)
  async function flush() { for (let i = 0; i < 5; i++) { await Promise.resolve(); const batch = [...frames]; frames.clear(); for (const [, cb] of batch) cb(0) } }
  const initial = sent.find(row => row.type === 'list_state')
  assert.equal(initial?.bootstrap, true, 'the first read explicitly requests saved-state hydration')
  if (mode === 'retry' || mode === 'home') {
    const timer = [...intervals.values()].find(row => row.ms === 5000)
    assert(timer, 'a missing initial reply needs a tracked retry, including on the homepage')
    timer.cb(); await flush()
    const retries = sent.filter(row => row.type === 'list_state')
    assert(retries.length >= 2, 'a dropped first request must be retried without user navigation')
    assert(retries.every(row => row.bootstrap && !('knownRevision' in row)), 'startup retries are unconditional read-only hydration requests')
    backendReceiver(retries.at(-1), userId)
    await until(() => projection(), 'retried bootstrap must return saved settings')
  }
  const beforeHydration = sent.length
  frontendReceiver(projection()); await flush()
  if (active) assert(document.querySelector('.dg-relay-orb'), 'persisted enabled orb mounts without waiting for optional startup work')
  assert(!sent.slice(beforeHydration).some(row => ['set_config', 'sync_native_settings', 'rescan_chat', 'scan_message', 'gallery_link_claim'].includes(row.type)), 'hydration itself emits no write-capable startup actions')
  const settingsButton = [...root.querySelectorAll('button')].find(el => el.textContent.trim() === 'Settings')
  assert(settingsButton, 'settings navigation must mount')
  settingsButton.click(); await flush()
  assert(root.querySelector('.dg-settings'), 'saved settings controls mount before full startup work finishes')
  assert(!root.textContent.includes('Settings are loading'), 'hydration clears the actual loading view')
  const newActions = sent.slice(beforeHydration)
  assert(!newActions.some(row => ['sync_native_settings','rescan_chat','scan_message','gallery_link_claim'].includes(row.type)), 'partial hydration cannot trigger write-capable native sync, discovery or placement')
  const afterHydration = sent.filter(row => row.type === 'list_state').length
  for (const row of [...intervals.values()]) if (row.ms === 5000) row.cb()
  assert.equal(sent.filter(row => row.type === 'list_state').length, afterHydration, 'startup retry stops after authoritative hydration')
  release(); blocked = false
  await until(() => outbound.some(row => row.type === 'state' && !row.bootstrap), 'normal state completes after held startup work is released')
  assert.equal(outbound.filter(row => row.type === 'state' && !row.bootstrap).length, 1, 'duplicate bootstrap requests share one maintenance/full-state refresh')
  assert(historyCalls <= 1 && catalogCalls <= 1, 'initial retries cannot multiply history scans or catalog enumeration')
  frontendReceiver(outbound.findLast(row => row.type === 'state' && !row.bootstrap)); await flush()
  if (mode === 'home') {
    assert(root.querySelector('option[value="saved-image"]')?.textContent.includes('Saved image'), 'full reply hydrates the saved connection catalog')
    frontendReceiver(projection()); await flush()
    assert(root.querySelector('option[value="saved-image"]')?.textContent.includes('Saved image'), 'a delayed bootstrap cannot clear a newer full connection inventory')
  }
  assert.equal(providerCalls, 0)
  assert.equal(errors.length, 0, errors.join('\n'))
  cleanup()
  assert.equal(intervals.size, 0, 'disposing the frontend must release its startup/lifecycle timers')
  dom.window.close()
  console.log(`PASS startup ${mode}: saved-state hydration, mounted settings${active ? '/orb' : ''}, bounded duplicate work, read-only retry, normal completion, zero provider calls.`)
} finally { release(); blocked = false }
