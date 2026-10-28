// @ts-nocheck -- mounted production History UI with deterministic archive replies.
import assert from 'node:assert/strict'
import { JSDOM } from 'jsdom'
import { stripCompletedRecord } from '../src/completedState'
const dom = new JSDOM('<body><div id="drawer"></div></body>', { url: 'http://localhost/', pretendToBeVisual: true })
const win = dom.window
for (const name of ['window','document','HTMLElement','HTMLButtonElement','HTMLImageElement','HTMLInputElement','HTMLSelectElement','HTMLTextAreaElement','HTMLStyleElement','Element','ShadowRoot','Node','MutationObserver','Event','CustomEvent','getComputedStyle']) globalThis[name] = name === 'window' ? win : name === 'document' ? win.document : win[name]
win.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} })
win.setInterval = () => 0; win.clearInterval = () => {}
const frames = new Map(); let frame = 0
win.requestAnimationFrame = callback => { frames.set(++frame, callback); return frame }
win.cancelAnimationFrame = id => frames.delete(id)
globalThis.requestAnimationFrame = win.requestAnimationFrame; globalThis.cancelAnimationFrame = win.cancelAnimationFrame
globalThis.fetch = async () => ({ ok: false, status: 404 })
globalThis.spindle = { on() {}, onFrontendMessage() {}, registerInterceptor() {}, registerMacro() {}, registerMessageContentProcessor() {}, sendToFrontend() {}, log: { info() {}, warn() {}, error() {} } }
const sent = [], opened = []
let receive
const ctx = {
  dom: { addStyle: () => () => {}, findMessageElement: () => null, cleanup() {} },
  ui: {
    registerDrawerTab: () => ({ root: document.getElementById('drawer'), setTitle() {}, setShortName() {}, setBadge() {}, activate() {}, onActivate: () => () => {}, destroy() {} }),
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
const full = { key: 'chat:message:0:request:illustration', chatId: 'chat', messageId: 'message', swipeId: 0, requestId: 'request', slot: 'illustration', target: 'prose.illustration', targetApp: 'prose', status: 'completed',
  originalSceneBrief: 'A person at the window.', originalRequestXml: '', originalNegativePrompt: '', alt: 'Window', count: 1, createdAt: 1, updatedAt: 4, completedAt: 4,
  imageUrl: '/current.png', imageProvider: 'fixture', imageModel: 'current-model', resolvedPositivePrompt: 'Current prompt',
  history: [3,2,1].map(id => ({ imageUrl: `/old-${id}.png`, imageId: `old-${id}`, imageProvider: 'fixture', imageModel: `model-${id}`, generatedAt: id, resolvedPositivePrompt: `Old prompt ${id}` })) }
const compact = stripCompletedRecord(full)
const live = () => opened.findLast(modal => modal.root.isConnected)
const action = text => [...live().root.querySelectorAll('button')].find(button => button.textContent === text)
async function flush() { for (let i = 0; i < 5; i++) { await Promise.resolve(); const batch = [...frames]; frames.clear(); for (const [, callback] of batch) callback(0) } }
let revision = 0
async function state(record = compact) {
  receive({ type: 'state', chatId: 'chat', revision: ++revision, records: [structuredClone(record)], config: { enabled: true, phoneEnabled: false, enableRelayOrb: false, autoRescanOnChatOpen: false }, parserConnections: [], imageConnections: [], imageProviders: [], logs: [], candidateBatches: [], galleryLinks: [], versionTrees: [] })
  await flush()
}
function reply(record = full) {
  const request = sent.findLast(row => row.type === 'completed_diagnostic')
  assert(request, 'History must request its archive instead of opening the stripped record')
  receive({ type: 'completed_diagnostic', ...request, record: record && structuredClone(record), message: 'Archive response' })
}
try {
  await state()
  // The Slots tab is not necessarily the initial dashboard tab.
  const slots = [...document.querySelectorAll('button')].find(button => button.textContent?.trim() === 'Slots')
  if (slots) { slots.click(); await flush() }
  const historyButton = () => document.querySelector('.dg-slot-history-action')
  assert(historyButton(), 'slot actions must be mounted')
  assert.equal(historyButton().textContent, 'History (4)', 'count includes compact archived versions')
  historyButton().click()
  assert.match(live().root.textContent, /Loading previous/)
  reply()
  assert.deepEqual([...live().root.querySelectorAll('.dg-slot-history-version img')].map(image => image.getAttribute('src')), ['/current.png','/old-3.png','/old-2.png','/old-1.png'])
  const oldCard = live().root.querySelectorAll('.dg-slot-history-version')[2]
  assert.match(oldCard.textContent, /model-2/)
  oldCard.querySelectorAll('button')[0].click()
  assert.equal(live().root.querySelector('.dg-lightbox-image')?.getAttribute('src') || live().root.querySelector('img')?.getAttribute('src'), '/old-2.png', 'View opens selected old image')
  live().dismiss()
  await state({ ...compact, originalSceneBrief: 'Partial prompt metadata must not bypass history loading.' })
  historyButton().click(); reply()
  live().root.querySelectorAll('.dg-slot-history-version')[3].querySelectorAll('button')[2].click()
  assert.deepEqual(sent.findLast(row => row.type === 'restore_history'), { type: 'restore_history', chatId: 'chat', key: full.key, historyIndex: 2 })
  await state()
  historyButton().click(); reply(null)
  assert.match(live().root.textContent, /could not be loaded/)
  assert.equal(live().root.querySelectorAll('.dg-slot-history-version').length, 1)
  action('Retry loading history').click(); reply()
  assert.equal(live().root.querySelectorAll('.dg-slot-history-version').length, 4)
  live().dismiss()
  historyButton().click(); live().dismiss(); reply()
  assert(!live(), 'late archive replies must not reopen a dismissed modal')
  assert(!sent.some(row => ['regenerate_slot','generate_slot'].includes(row.type)), 'History inspection must never regenerate an image')
} finally { cleanup(); dom.window.close() }
console.log('PASS mounted History: compact count, archive loading despite prompt metadata, four distinct versions, exact old image/restore selection, missing archive retry and dismissed-modal guard.')
