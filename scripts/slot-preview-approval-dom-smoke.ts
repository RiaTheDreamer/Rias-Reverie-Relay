// @ts-nocheck -- mounted production preview controls; no network/providers.
import assert from 'node:assert/strict'
import { JSDOM } from 'jsdom'
const dom = new JSDOM('<body><div id="drawer"></div></body>', { url: 'http://localhost/', pretendToBeVisual: true })
const win = dom.window
for (const name of ['window','document','HTMLElement','HTMLButtonElement','HTMLImageElement','HTMLInputElement','HTMLSelectElement','HTMLTextAreaElement','HTMLStyleElement','Element','ShadowRoot','Node','MutationObserver','Event','CustomEvent','getComputedStyle']) globalThis[name] = name === 'window' ? win : name === 'document' ? win.document : win[name]
win.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} })
win.setInterval = () => 0; win.clearInterval = () => {}
const frames = new Map(); let frame = 0
win.requestAnimationFrame = callback => { frames.set(++frame, callback); return frame }
win.cancelAnimationFrame = id => frames.delete(id)
globalThis.requestAnimationFrame = win.requestAnimationFrame; globalThis.cancelAnimationFrame = win.cancelAnimationFrame
globalThis.fetch = async () => { throw Error('No network allowed') }
globalThis.spindle = { on() {}, onFrontendMessage() {}, registerInterceptor() {}, registerMacro() {}, registerMessageContentProcessor() {}, sendToFrontend() {}, log: { info() {}, warn() {}, error() {} } }
const drawer = document.getElementById('drawer'), sent = [], opened = []
let receive
const ctx = {
  dom: { addStyle: () => () => {}, findMessageElement: () => null, cleanup() {} },
  ui: {
    registerDrawerTab: () => ({ root: drawer, setTitle() {}, setShortName() {}, setBadge() {}, activate() {}, onActivate: () => () => {}, destroy() {} }),
    registerInputBarAction: () => ({ setLabel() {}, setSubtitle() {}, setEnabled() {}, onClick: () => () => {}, destroy() {} }),
    showModal(options) { const root = document.createElement('div'); document.body.append(root); const modal = { root, title: options.title, dismiss() { root.remove() } }; opened.push(modal); return modal },
  },
  events: { on: () => () => {}, emit() {} }, display: { invalidate() {} },
  messages: { registerTagInterceptor: () => () => {}, getRecent: () => [] },
  getActiveChat: () => ({ chatId: 'chat', characterId: 'character' }),
  sendToBackend(message) { sent.push(message) }, onBackendMessage(handler) { receive = handler; return () => {} },
}
const { setup } = await import('../src/frontend')
const cleanup = setup(ctx)
const flush = async () => { for (let i = 0; i < 5; i++) { await Promise.resolve(); const batch = [...frames]; frames.clear(); for (const [, callback] of batch) callback(0) } }
const pending = key => ({ key, chatId: 'chat', messageId: 'message', swipeId: 0, requestId: key, slot: key, target: 'prose.illustration', status: 'placement-pending', previewPending: true,
  pendingPlacement: { slot: key, imageId: key, imageUrl: `/images/${key}.png`, imageWidth: 100, imageHeight: 80 },
  originalSceneBrief: '', originalRequestXml: '', originalNegativePrompt: '', alt: key, count: 1, createdAt: 1, updatedAt: 2, history: [] })
const state = { type: 'state', chatId: 'chat', revision: 1, records: [pending('first'), pending('second')], config: { enabled: true, phoneEnabled: false, enableRelayOrb: false, autoRescanOnChatOpen: false },
  parserConnections: [], imageConnections: [], imageProviders: [], logs: [], candidateBatches: [], galleryLinks: [], versionTrees: [] }
const liveModal = () => opened.findLast(modal => modal.root.isConnected)
const action = (modal, text) => [...modal.root.querySelectorAll('button')].find(button => button.textContent === text)
receive(structuredClone(state)); await flush()
assert.equal(liveModal().root.querySelector('img').alt, 'first')
action(liveModal(), 'Insert').click()
let submission = sent.filter(row => row.type === 'retry_placement').at(-1)
assert.equal(submission.key, 'first')
receive({ ...submission, type: 'slot_action_feedback', action: 'repair-placement', status: 'rejected', message: 'Temporary host refusal' })
assert(liveModal().root.textContent.includes('Temporary host refusal'), 'rejected approval must stay visible and retryable')
action(liveModal(), 'Insert').click()
submission = sent.filter(row => row.type === 'retry_placement').at(-1)
receive({ ...submission, type: 'slot_action_feedback', action: 'repair-placement', status: 'accepted' }); await flush()
assert(!liveModal(), 'accepted approval closes its preview')
// A state broadcast still carries the pending asset before placement settles.
receive({ ...structuredClone(state), revision: ++state.revision }); await flush()
assert.equal(liveModal().root.querySelector('img').alt, 'second', 'accepted first preview must not reopen over the next approval')
assert.equal(opened.filter(modal => modal.root.querySelector('img')?.alt === 'first').length, 1)
state.records[0] = { ...state.records[0], status: 'completed', previewPending: false, pendingPlacement: undefined, imageUrl: '/images/first.png', updatedAt: 3 }
receive({ ...structuredClone(state), revision: ++state.revision }); await flush()
assert.equal(liveModal().root.querySelector('img').alt, 'second')
action(liveModal(), 'Insert').click()
submission = sent.filter(row => row.type === 'retry_placement').at(-1)
assert.equal(submission.key, 'second')
receive({ ...submission, type: 'slot_action_feedback', action: 'repair-placement', status: 'accepted' }); await flush()
receive({ ...structuredClone(state), revision: ++state.revision }); await flush()
assert(!liveModal(), 'second accepted asset also stays suppressed during its pending echo')
assert(!sent.some(row => /generate_slot|reparse_slot|scan_and_generate/.test(row.type)), 'approvals must not start new generation')
cleanup(); dom.window.close()
console.log('PASS mounted Review First approval: rejection retry, exact selected keys, pending-state echoes, no stale modal reopening, no regeneration commands.')
