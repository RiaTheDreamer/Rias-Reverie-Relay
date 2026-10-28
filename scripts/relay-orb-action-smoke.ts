// @ts-nocheck -- mounted production orb controls; no real host or providers.
import assert from 'node:assert/strict'
import { JSDOM, VirtualConsole } from 'jsdom'

const errors: Error[] = []
const virtualConsole = new VirtualConsole()
virtualConsole.on('jsdomError', error => errors.push(error))
const dom = new JSDOM('<body><div id="drawer"></div></body>', { url: 'http://localhost/', pretendToBeVisual: true, virtualConsole })
const win = dom.window
for (const name of ['window', 'document', 'HTMLElement', 'HTMLButtonElement', 'HTMLImageElement', 'HTMLInputElement', 'HTMLSelectElement', 'HTMLTextAreaElement', 'HTMLStyleElement', 'Element', 'ShadowRoot', 'Node', 'MutationObserver', 'Event', 'CustomEvent', 'getComputedStyle']) globalThis[name] = name === 'window' ? win : name === 'document' ? win.document : win[name]
win.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} })
let timerId = 0
const timers = new Map()
win.setTimeout = (callback, delay) => { timers.set(++timerId, { callback, delay }); return timerId }
win.clearTimeout = id => timers.delete(id)
win.setInterval = () => 0; win.clearInterval = () => {}
win.requestAnimationFrame = () => 0; win.cancelAnimationFrame = () => {}
globalThis.requestAnimationFrame = win.requestAnimationFrame; globalThis.cancelAnimationFrame = win.cancelAnimationFrame
globalThis.fetch = async () => ({ ok: false, status: 404, json: async () => ({}) })
globalThis.spindle = { on() {}, onFrontendMessage() {}, registerInterceptor() {}, registerMacro() {}, registerMessageContentProcessor() {}, sendToFrontend() {}, permissions: { has: () => true }, log: { info() {}, warn() {}, error() {} } }
const { normalizeProseIllustratorSettings } = await import('../src/backend')
const { setup } = await import('../src/frontend')
const requests = [], events = new Map(), styles: string[] = []
let receive: Function
let chatId = 'orb-chat'
const ctx = {
  dom: { addStyle: css => { styles.push(css); return () => {} }, findMessageElement: () => null, cleanup() {} },
  ui: {
    registerDrawerTab: () => ({ root: document.getElementById('drawer'), setTitle() {}, setShortName() {}, setBadge() {}, activate() {}, onActivate: () => () => {}, destroy() {} }),
    registerInputBarAction: () => ({ setLabel() {}, setSubtitle() {}, setEnabled() {}, onClick: () => () => {}, destroy() {} }),
  },
  events: { on(name, handler) { events.set(name, handler); return () => events.delete(name) }, emit() {} }, display: { invalidate() {} },
  messages: { registerTagInterceptor: () => () => {}, getRecent: () => [] },
  getActiveChat: () => ({ chatId, characterId: 'character' }),
  sendToBackend: request => requests.push(request), onBackendMessage(handler) { receive = handler; return () => {} },
}
const cleanup = setup(ctx)
let revision = 0
function state(settings = {}, extra = {}, configOverrides = {}) {
  receive({ type: 'queue_abort_ack' })
  receive({ type: 'state', chatId, revision: ++revision, records: [], parserConnections: [], imageConnections: [], imageProviders: [], logs: [], candidateBatches: [], galleryLinks: [], versionTrees: [], backgroundQueue: { items: {} },
    config: { enabled: true, phoneEnabled: false, enableRelayOrb: true, autoRescanOnChatOpen: false, proseIllustratorSettings: normalizeProseIllustratorSettings({ mode: 'relay-planned', plannerConnectionId: 'director', ...settings }), ...configOverrides }, ...extra })
  requests.length = 0
}
const orb = () => document.querySelector<HTMLButtonElement>('.dg-relay-orb')!
const expectedAction = () => ({ type: 'prose_illustrator_action', chatId, action: 'relay_plan_once', requestId: requests.findLast(row => row.type === 'prose_illustrator_action')?.requestId })
function pointer(type, x = 20, y = 20) {
  orb().dispatchEvent(Object.assign(new win.MouseEvent(type, { bubbles: true, cancelable: true, button: 0, clientX: x, clientY: y }), { pointerId: 1, pointerType: 'touch' }))
}
try {
  for (const modelPlacedCountMode of ['fixed', 'range']) {
    state({ modelPlacedCountMode })
    orb().click()
    assert.deepEqual(requests, [expectedAction()], 'Relay Planned orb must request count-aware analysis AND generation, not slot recovery')
    assert.equal(orb().getAttribute('aria-busy'), 'true', 'the click must animate immediately, before any backend reply')
    assert(document.querySelector('.dg-sidecar-global-notice')?.textContent.includes('Planning requested'), 'pending requests need immediate honest feedback')
    assert(![...document.querySelectorAll<HTMLButtonElement>('.dg-head-actions button')].find(node => node.textContent === 'Abort All')?.disabled, 'a pending planning request must be cancellable')
    orb().click()
    assert.equal(requests.length, 1, 'repeat clicks while awaiting acknowledgement must not queue duplicate plans')
    receive({ type: 'prose_action_feedback', chatId, requestId: 'older-request', status: 'completed' })
    assert.equal(orb().getAttribute('aria-busy'), 'true', 'late feedback from another request cannot clear the current click')
    receive({ type: 'prose_action_feedback', chatId, requestId: requests[0].requestId, status: 'failed', message: 'Fixture failure' })
    assert.equal(orb().getAttribute('aria-busy'), 'false', 'matching terminal feedback must clear pending UI')
  }
  state({}, {}, { orbDesign: 'star', orbSizePx: 73 })
  assert(orb().querySelector('svg path'), 'The supplied Star must mount as an actual SVG')
  assert.equal(orb().style.getPropertyValue('--dg-relay-orb-size'), '73px')
  assert.equal(orb().querySelector('.dg-relay-orb-badge'), null, 'Remove the obsolete counter circle entirely')
  assert(!styles.join('\n').includes('.dg-relay-orb-design-star .dg-relay-orb-mark { animation:'), 'Star must stay still while idle')
  const orbOverrides = [...styles.join('\n').matchAll(/\.dg-relay-orb,\s*\.dg-relay-orb-design-glass\s*\{([^}]+)\}/g)].map(match => match[1]).find(css => css.includes('background-color')) || ''
  assert.match(orbOverrides, /background-color:\s*transparent\s*!important/, 'Later glass-theme overrides must preserve the icon-only transparent hit area')
  ;[...document.querySelectorAll('button')].find(node => node.textContent === 'Settings')!.click()
  const sizeSlider = document.querySelector<HTMLInputElement>('input[type="range"][aria-label="Orb Size"]')!
  assert(sizeSlider, 'Orb size must be controlled by a slider')
  assert.equal(sizeSlider.value, '73')
  requests.length = 0
  sizeSlider.value = '87'; sizeSlider.dispatchEvent(new Event('input', { bubbles: true }))
  assert.equal(orb().style.getPropertyValue('--dg-relay-orb-size'), '87px', 'Dragging must preview without losing focus')
  assert.equal(requests.filter(row => row.type === 'set_config').length, 0, 'Do not emit a settings write for every drag pixel')
  sizeSlider.dispatchEvent(new Event('change', { bubbles: true }))
  assert.equal(requests.at(-1).patch.orbSizePx, 87, 'Commit the slider on release/keyboard change')
  const design = [...document.querySelectorAll('select')].find(el => [...el.options].some(option => option.value === 'star'))!
  assert(design, 'Rotating Star must be a selectable design')
  state({}, { backgroundQueue: { items: { analysis: { id: 'analysis', chatId, source: 'analysis', stage: 'analyzing', updatedAt: 1, startedAt: 1 } } } })
  assert.equal(orb().getAttribute('aria-busy'), 'true')
  for (const [analysisPhase, statusText] of [['appearance', 'Updating appearances'], ['director', 'Planning illustrations'], ['director-retry', 'Retrying empty Director response'], ['repair', 'Repairing illustration plan']]) {
    state({}, { backgroundQueue: { items: { analysis: { id: 'analysis', chatId, requestId: 'message-123456', source: 'analysis', stage: 'analyzing', statusText, analysisPhase, updatedAt: Date.now(), startedAt: Date.now() - 120000, phaseStartedAt: Date.now() - 3000 } } } })
    const banner = document.querySelector('.dg-sidecar-global-notice')!
    assert.equal(banner.parentElement?.className, 'dg-toast-stack', 'Analysis and error notifications must share one location/stack')
    assert(!banner.textContent.includes('message-123456'), 'Keep message IDs out of the visible compact notice')
    assert(banner.title.includes('message-123456'), 'Keep exact message identity available in its tooltip')
    assert(banner.textContent.includes(statusText), 'mounted status must name the actual analysis stage')
    assert.match(banner.textContent, /120s total/)
    assert.match(banner.textContent, /3s (?:in stage|this stage)/)
    const abort = [...document.querySelectorAll<HTMLButtonElement>('.dg-head-actions button')].find(node => node.textContent === 'Abort All')!
    assert(abort && !abort.disabled, 'analysis-only work must remain cancellable from the drawer header')
  }
  state({}, { backgroundQueue: { items: { analysis: { id: 'analysis', chatId, requestId: 'message-123456', source: 'analysis', stage: 'analyzing', statusText: 'Still planning', updatedAt: Date.now(), startedAt: 1 } } } })
  const analysisDismiss = document.querySelector<HTMLButtonElement>('.dg-sidecar-global-notice .dg-toast-dismiss')
  assert(analysisDismiss, 'Analysis popup must have an accessible dismiss button')
  analysisDismiss.click()
  assert.equal(document.querySelector('.dg-sidecar-global-notice'), null)
  assert.deepEqual(requests, [], 'Dismissing analysis must not cancel work or contact the backend')
  state({}, { backgroundQueue: { items: { analysis: { id: 'analysis', chatId, requestId: 'message-123456', source: 'analysis', stage: 'analyzing', statusText: 'Repairing plan', updatedAt: Date.now(), startedAt: 1 } } } })
  assert.equal(document.querySelector('.dg-sidecar-global-notice'), null, 'Status updates must not resurrect a dismissed analysis popup')
  assert.equal(orb().getAttribute('aria-busy'), 'true', 'Dismissal must leave analysis running')
  state({}, { backgroundQueue: { items: { next: { id: 'next', chatId, requestId: 'message-123456', source: 'analysis', stage: 'analyzing', updatedAt: Date.now(), startedAt: 2 } } } })
  assert(document.querySelector('.dg-sidecar-global-notice'), 'A new analysis job must still notify, including a retry of the same message')
  orb().click()
  assert.deepEqual(requests, [], 'clicks during active analysis must not start another planning batch')
  state({}, { backgroundQueue: { items: { analysis: { id: 'analysis', chatId, source: 'analysis', stage: 'analyzing', updatedAt: 1, startedAt: 1 } } } }, { enableRelayOrb: false })
  assert.equal(orb(), null, 'Orb may be disabled independently of analysis')
  const headerAbort = [...document.querySelectorAll<HTMLButtonElement>('.dg-head-actions button')].find(node => node.textContent === 'Abort All')!
  assert(!headerAbort.disabled, 'analysis-only cancellation must not depend on the floating Orb')
  headerAbort.click()
  assert.deepEqual(requests, [{ type: 'queue_action', chatId, action: 'abort_all' }])
  assert([...document.querySelectorAll<HTMLButtonElement>('.dg-head-actions button')].find(node => node.textContent === 'Stopping…')?.disabled, 'Abort All must acknowledge the click before the backend replies')
  receive({ type: 'queue_abort_ack', abortedAt: 100, chatIds: [chatId] })
  assert(!document.body.textContent?.includes('Stopping Relay work…'), 'the acknowledged stop must not leave a stale stopping subtitle')
  const delayedAnalysis = { id: 'delayed', chatId, source: 'analysis', stage: 'analyzing', startedAt: 1, updatedAt: 2 }
  const delayedState = { type: 'state', chatId, revision: ++revision, records: [], config: { enabled: true, phoneEnabled: false, enableRelayOrb: true, autoRescanOnChatOpen: false, proseIllustratorSettings: normalizeProseIllustratorSettings({ mode: 'relay-planned', plannerConnectionId: 'director' }) }, logs: [], backgroundQueue: { items: { delayed: delayedAnalysis }, abortRequestedAt: 0 } }
  receive(delayedState)
  assert.equal(orb().getAttribute('aria-busy'), 'false', 'a pre-abort snapshot arriving after acknowledgement must not resurrect cancelled analysis')
  receive({ ...delayedState, revision: ++revision, backgroundQueue: { items: {}, abortRequestedAt: 100 } })
  receive({ ...delayedState, revision: ++revision, backgroundQueue: { items: { fresh: { ...delayedAnalysis, id: 'fresh', startedAt: 101 } }, abortRequestedAt: 100 } })
  assert.equal(orb().getAttribute('aria-busy'), 'true', 'new work after the persisted abort boundary must remain visible')
  state({}, { records: [{ key: 'active', chatId, messageId: 'message', swipeId: 0, requestId: 'active', slot: 'active', target: 'prose.illustration', targetApp: 'prose', status: 'generating', originalSceneBrief: 'Current scene.', originalRequestXml: '', history: [], attempts: [], createdAt: 1, updatedAt: 1 }] })
  orb().click()
  assert.deepEqual(requests, [], 'clicks during active generation must not start another planning batch')
  state({ plannerConnectionId: null })
  assert.equal(document.querySelector('.dg-sidecar-global-notice'), null, 'Analysis notice must settle when active work ends')
  orb().click()
  assert.deepEqual(requests, [], 'an unconfigured planner must not silently fall back to slot scanning')
  assert.match(document.querySelector('.dg-toast-stack')!.textContent!, /Relay Planned connection/i)
  // The existing long-press/right-click menus still offer explicit slot scans.
  state()
  orb().dispatchEvent(new win.MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 20, clientY: 20 }))
  assert(document.querySelector('.dg-menu')!.textContent!.includes('Scan Relay Slots'))
  const appearance = [...document.querySelectorAll<HTMLButtonElement>('.dg-menu button')].find(node => node.textContent === 'Rescan for Appearance')
  assert(appearance, 'The orb must offer a dedicated Appearance-only rescan')
  appearance.click()
  assert.deepEqual(requests, [{ type: 'continuity_action', chatId, action: 'rescan_appearance' }], 'Appearance rescan must not generate images or scan slots')
  requests.length = 0
  orb().dispatchEvent(new win.MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 20, clientY: 20 }))
  const open = [...document.querySelectorAll('.dg-menu button')].find(node => node.textContent === 'Open Surface Registry')!
  open.click()
  requests.length = 0
  pointer('pointerdown')
  const hold = [...timers.values()].find(timer => timer.delay === 520)
  assert(hold); hold.callback()
  pointer('pointerup'); orb().click()
  assert.deepEqual(requests, [], 'long press opens the menu without also generating')
  document.querySelector('.dg-menu button')!.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
  pointer('pointerdown'); pointer('pointermove', 70, 20); pointer('pointerup', 70, 20)
  requests.length = 0
  orb().click()
  assert.deepEqual(requests, [], 'dragging the orb must not generate')
  // Model the actual host's CSS zoom: styles/offsetWidth are unscaled, rects and pointer coordinates are screen pixels.
  let zoom = 1, hitSize = 52
  Object.defineProperty(orb(), 'offsetWidth', { configurable: true, get: () => hitSize })
  Object.defineProperty(orb(), 'offsetHeight', { configurable: true, get: () => hitSize })
  orb().getBoundingClientRect = () => {
    const left = (Number.parseFloat(orb().style.left) || 0) * zoom, top = (Number.parseFloat(orb().style.top) || 0) * zoom
    return { left, top, x: left, y: top, width: hitSize * zoom, height: hitSize * zoom, right: left + hitSize * zoom, bottom: top + hitSize * zoom }
  }
  for (const scale of [.75, 1, 1.25]) for (const size of [32, 52, 96]) for (const compact of [false, true]) {
    zoom = scale; hitSize = Math.max(44, size)
    win.matchMedia = () => ({ matches: compact, addEventListener() {}, removeEventListener() {} })
    const viewport = { width: compact ? 390 : 1024, height: compact ? 600 : 768, offsetLeft: compact ? 20 : 0, offsetTop: compact ? 30 : 0 }
    Object.defineProperty(win, 'visualViewport', { configurable: true, value: viewport })
    const key = compact ? 'orbPositionMobile' : 'orbPositionDesktop'
    state({}, {}, { orbSizePx: size, [key]: { x: .5, y: .5 } })
    pointer('pointerdown'); pointer('pointermove', 4000, 4000); pointer('pointerup', 4000, 4000)
    let rect = orb().getBoundingClientRect()
    assert(Math.abs(rect.right - (viewport.width + viewport.offsetLeft)) < 1, `${scale}/${size}/${compact}: drag must reach the right edge`)
    assert(Math.abs(rect.bottom - (viewport.height + viewport.offsetTop)) < 1, `${scale}/${size}/${compact}: drag must reach the bottom edge`)
    const saved = requests.findLast(row => row.type === 'set_config')?.patch[key]
    assert(saved?.x > .998 && saved?.y > .998, 'Persist normalized screen position at the edge')
    state({}, {}, { orbSizePx: size, [key]: saved })
    rect = orb().getBoundingClientRect()
    assert(Math.abs(rect.right - (viewport.width + viewport.offsetLeft)) < 1, 'State refresh must retain the dragged edge position')
    pointer('pointerdown'); pointer('pointermove', -4000, -4000); pointer('pointerup', -4000, -4000)
    rect = orb().getBoundingClientRect()
    assert(Math.abs(rect.left - viewport.offsetLeft) < 1 && Math.abs(rect.top - viewport.offsetTop) < 1, 'Top/left edges must also remain reachable')
  }
  win.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} })
  Object.defineProperty(win, 'visualViewport', { configurable: true, value: undefined })
  orb().click() // consume the native post-drag click; it must not start work
  assert(!requests.some(row => row.type === 'prose_illustrator_action'))
  // Switches must use the new active chat, never a captured previous chat ID.
  chatId = 'another-character'
  events.get('CHAT_SWITCHED')!({ chatId })
  state()
  orb().click()
  assert.deepEqual(requests, [expectedAction()])
  for (const mode of ['inline-protocol', 'off']) {
    state({ mode })
    orb().click()
    assert.deepEqual(requests, [{ type: 'rescan_chat', chatId, includeInactiveSwipes: false }], `${mode}: preserve existing scan-only behavior`)
    receive({ type: 'queue_abort_ack' })
  }
  assert.deepEqual(errors, [], 'mounted orb handlers must not throw')
} finally {
  cleanup()
  assert.equal(document.querySelector('.dg-toast-stack'), null, 'Extension disposal must remove analysis/toast overlays')
  dom.window.close()
}
console.log('Relay orb actions passed: Relay Planned count-aware analysis/generation, busy and missing-connection guards, menus/drag, chat switches and unchanged other modes. No provider calls.')
