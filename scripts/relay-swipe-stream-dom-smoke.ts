// @ts-nocheck -- mounted production frontend with real DOM projections.
import assert from 'node:assert/strict'
import { JSDOM } from 'jsdom'
const dom = new JSDOM('<body><div id="message"><p>Mira stands beside the sink.</p></div><div id="drawer"></div></body>', { url: 'http://localhost/', pretendToBeVisual: true })
const win = dom.window
for (const name of ['window','document','HTMLElement','HTMLButtonElement','HTMLImageElement','HTMLInputElement','HTMLSelectElement','HTMLTextAreaElement','HTMLStyleElement','Element','ShadowRoot','Node','MutationObserver','Event','CustomEvent','getComputedStyle']) globalThis[name] = name === 'window' ? win : name === 'document' ? win.document : win[name]
win.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} })
win.setInterval = () => 0; win.clearInterval = () => {}
const frames = new Map<number, Function>(); let frame = 0
win.requestAnimationFrame = callback => { frames.set(++frame, callback); return frame }
win.cancelAnimationFrame = id => frames.delete(id)
globalThis.requestAnimationFrame = win.requestAnimationFrame; globalThis.cancelAnimationFrame = win.cancelAnimationFrame
globalThis.fetch = async () => ({ ok: false, status: 404, json: async () => ({}) })
globalThis.spindle = { on() {}, onFrontendMessage() {}, registerInterceptor() {}, registerMacro() {}, registerMessageContentProcessor() {}, sendToFrontend() {}, log: { info() {}, warn() {}, error() {} }, toast: { info() {}, success() {}, warning() {}, error() {} } }
const root = document.getElementById('message')
const drawer = document.getElementById('drawer')
const handlers = new Map<string, Function[]>()
const fire = (name: string, payload: any) => handlers.get(name)?.forEach(handler => handler(payload))
let backend: Function
const ctx = {
  dom: { addStyle: () => () => {}, findMessageElement: () => root, cleanup() {} },
  ui: { registerDrawerTab: () => ({ root: drawer, setTitle() {}, setShortName() {}, setBadge() {}, activate() {}, onActivate: () => () => {}, destroy() {} }), registerInputBarAction: () => ({ setLabel() {}, setSubtitle() {}, setEnabled() {}, onClick: () => () => {}, destroy() {} }) },
  events: { on(name, handler) { handlers.set(name, [...(handlers.get(name) || []), handler]); return () => {} }, emit() {} }, display: { invalidate() {} },
  messages: { registerTagInterceptor: () => () => {}, getRecent: () => [{ id: 'message', swipe_id: 0, is_user: false }] },
  getActiveChat: () => ({ chatId: 'chat', characterId: 'mira' }), sendToBackend() {}, onBackendMessage(handler) { backend = handler; return () => {} },
}
const { setup } = await import('../src/frontend')
const cleanup = setup(ctx)
const flush = async () => { for (let i = 0; i < 5; i++) { await Promise.resolve(); const batch = [...frames]; frames.clear(); for (const [, callback] of batch) callback(0) } }
const record = (swipeId: number) => ({ key: `chat:message:${swipeId}:request-${swipeId}:illustration`, chatId: 'chat', messageId: 'message', swipeId,
  requestId: `request-${swipeId}`, slot: 'illustration', target: 'prose.illustration', targetApp: 'prose', status: 'completed', imageUrl: `/swipe-${swipeId}.png`, imageId: `image-${swipeId}`,
  originalSceneBrief: 'Mira stands beside the sink.', originalRequestXml: '', originalNegativePrompt: '',
  proseSynthetic: true, proseAnchor: { paragraphIndex: 0, insertionSide: 'after', selectedExcerpt: 'Mira stands beside the sink.' }, alt: 'Mira', count: 1, createdAt: 1, updatedAt: 1, history: [] })
const state = { type: 'state', chatId: 'chat', revision: 1, records: [record(0)], config: { enabled: true, phoneEnabled: false, enableRelayOrb: false, autoRescanOnChatOpen: false,
  proseIllustratorSettings: { enabled: true, mode: 'relay-planned' } }, parserConnections: [], imageConnections: [], imageProviders: [], logs: [], candidateBatches: [], galleryLinks: [], versionTrees: [] }
const update = async (records = state.records) => { backend({ ...state, revision: ++state.revision, records }); await flush() }
const projection = () => root.querySelector('.dgir-prose-lifecycle-projection')
await update()
assert(projection(), 'saved swipe must mount its original illustration before generation')
fire('GENERATION_STARTED', { chatId: 'chat', generationId: 'new-swipe', generationType: 'regenerate', targetMessageId: 'message', targetSwipeId: 1 })
assert(!projection(), 'old projection survived the new-swipe start')
// A state broadcast or render acknowledgement arrives before the first token.
await update(); fire('CHARACTER_MESSAGE_RENDERED', { chatId: 'chat', messageId: 'message' }); await flush()
assert(!projection(), 'old swipe was reinserted into streaming DOM')
fire('MESSAGE_SWIPED', { chatId: 'chat', messageId: 'message', swipeId: 1 }); await flush()
await update([record(0), record(1)])
assert(!projection(), 'synthetic projections must wait for completed streaming, even with matching records')
fire('GENERATION_ENDED', { chatId: 'chat', generationId: 'new-swipe', messageId: 'message' })
await update([record(0), record(1)])
assert(projection()?.querySelector('img')?.src.endsWith('/swipe-1.png'), 'completed new swipe did not recover its own image')
assert(!root.querySelector('img[src="/swipe-0.png"]'), 'prior swipe image returned after completion')

// A late terminal event for generation A cannot release generation B's guard.
fire('GENERATION_STARTED', { chatId: 'chat', generationId: 'A', generationType: 'regenerate', targetMessageId: 'message', targetSwipeId: 2 })
fire('GENERATION_STARTED', { chatId: 'chat', generationId: 'B', generationType: 'regenerate', targetMessageId: 'message', targetSwipeId: 3 })
fire('GENERATION_ENDED', { chatId: 'chat', generationId: 'A', messageId: 'message' })
await update([record(3)])
assert(!projection(), 'late previous generation released the current streaming guard')
fire('GENERATION_STOPPED', { chatId: 'chat', generationId: 'B' })
await update([record(3)])
assert(projection(), 'Stop without a message ID left the current swipe permanently hidden')
const kept = projection()
fire('GENERATION_STARTED', { chatId: 'chat', generationId: 'continue', generationType: 'continue', targetMessageId: 'message', targetSwipeId: 3 })
assert.equal(projection(), kept, 'Continue must preserve already-mounted illustrations from its own swipe')
fire('GENERATION_STOPPED', { chatId: 'chat', generationId: 'continue' })
cleanup(); dom.window.close()
console.log('Relay swipe-stream DOM passed: prior image removal, render/state races, matching-swipe deferral, completion, late generations, Stop and Continue preservation.')
