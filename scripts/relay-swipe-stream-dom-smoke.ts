// @ts-nocheck -- mounted production frontend with real DOM projections.
import assert from 'node:assert/strict'
import { JSDOM } from 'jsdom'
const dom = new JSDOM('<body><div id="message"><p>Mira stands beside the sink.</p></div><div id="drawer"></div></body>', { url: 'http://localhost/', pretendToBeVisual: true })
const win = dom.window
for (const name of ['window','document','HTMLElement','HTMLButtonElement','HTMLImageElement','HTMLInputElement','HTMLSelectElement','HTMLTextAreaElement','HTMLStyleElement','Element','ShadowRoot','Node','MutationObserver','Event','CustomEvent','getComputedStyle']) globalThis[name] = name === 'window' ? win : name === 'document' ? win.document : win[name]
win.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} })
win.setInterval = () => 0; win.clearInterval = () => {}
const timeouts = new Map<number, { callback: Function; delay: number }>(); let timeout = 0
win.setTimeout = (callback, delay) => { timeouts.set(++timeout, { callback, delay }); return timeout }
win.clearTimeout = id => timeouts.delete(id)
const frames = new Map<number, Function>(); let frame = 0
win.requestAnimationFrame = callback => { frames.set(++frame, callback); return frame }
win.cancelAnimationFrame = id => frames.delete(id)
globalThis.requestAnimationFrame = win.requestAnimationFrame; globalThis.cancelAnimationFrame = win.cancelAnimationFrame
globalThis.fetch = async () => ({ ok: false, status: 404, json: async () => ({}) })
globalThis.spindle = { on() {}, onFrontendMessage() {}, registerInterceptor() {}, registerMacro() {}, registerMessageContentProcessor() {}, sendToFrontend() {}, log: { info() {}, warn() {}, error() {} }, toast: { info() {}, success() {}, warning() {}, error() {} } }
const root = document.getElementById('message')
const drawer = document.getElementById('drawer')
const handlers = new Map<string, Function[]>()
const sent = []
let recentSwipe = 1
let activeChat = 'chat', recentAvailable = true, recentMessageId = 'message', messageReads = 0
const pendingReads: Array<(message: any) => void> = []
const pendingReadFailures: Array<(error: Error) => void> = []
const fire = (name: string, payload: any) => handlers.get(name)?.forEach(handler => handler(payload))
let backend: Function
const ctx = {
  dom: { addStyle: () => () => {}, findMessageElement: () => root, cleanup() {} },
  ui: { registerDrawerTab: () => ({ root: drawer, setTitle() {}, setShortName() {}, setBadge() {}, activate() {}, onActivate: () => () => {}, destroy() {} }), registerInputBarAction: () => ({ setLabel() {}, setSubtitle() {}, setEnabled() {}, onClick: () => () => {}, destroy() {} }) },
  events: { on(name, handler) { handlers.set(name, [...(handlers.get(name) || []), handler]); return () => {} }, emit() {} }, display: { invalidate() {} },
  messages: { registerTagInterceptor: () => () => {}, getRecent: () => recentAvailable ? [{ id: recentMessageId, swipe_id: recentSwipe, is_user: false }] : [],
    get: () => { messageReads++; return new Promise((resolve, reject) => { pendingReads.push(resolve); pendingReadFailures.push(reject) }) } },
  getActiveChat: () => ({ chatId: activeChat, characterId: 'mira' }), sendToBackend(message) { sent.push(message) }, onBackendMessage(handler) { backend = handler; return () => {} },
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
// A cold fork/reload has no MESSAGE_SWIPED event. Both completed swipe records
// are valid historical media, but only the host's active swipe can be mounted.
await update([record(0), record(1)])
assert(root.querySelector('img[src="/swipe-1.png"]'), 'cold fork must hydrate its host-selected nonzero swipe')
assert(!root.querySelector('img[src="/swipe-0.png"]'), 'cold fork leaked the inactive swipe into the active reply')
root.innerHTML = '<p>Mira stands beside the sink.</p>'
recentSwipe = 0
fire('MESSAGE_SWIPED', { chatId: 'chat', messageId: 'message', swipeId: 0 })
backend({ ...state, records: [], renderCatalogFingerprint: 'catalog-1' }); await flush()
assert(sent.some(message => message.type === 'list_render_records'), 'fresh browser must request historical display metadata')
backend({ type: 'render_records', chatId: 'other', fingerprint: 'catalog-1', cursor: 0, records: [record(0)], nextCursor: null }); await flush()
assert(!projection(), 'another chat archive must not mount here')
backend({ type: 'render_records', chatId: 'chat', fingerprint: 'catalog-1', cursor: 0, records: [record(0)], nextCursor: null }); await flush()
assert(projection()?.querySelector('img')?.src.endsWith('/swipe-0.png'), 'cold archive-only synthetic image must mount without generation')
const archiveRequests = sent.filter(message => message.type === 'list_render_records').length
backend({ ...state, revision: ++state.revision, records: [], renderCatalogFingerprint: 'catalog-1' }); await flush()
assert.equal(sent.filter(message => message.type === 'list_render_records').length, archiveRequests, 'unchanged status ticks cannot refetch the archive')
assert(!sent.some(message => /generate|reparse/.test(message.type)), 'display recovery must not dispatch providers')
backend({ type: 'queue_abort_ack', abortedQueued: 0, abortedActive: 0, remoteCancelRequested: 0, alreadyStopped: 0 }); await flush()
assert(projection()?.querySelector('img')?.src.endsWith('/swipe-0.png'), 'Abort All cannot discard completed historical display records')
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
// Older mounted replies may be outside the bounded recent host snapshot.
// Resolve just that saved message once; do not render every historical swipe
// while waiting, and do not let a late read override a fresh generation event.
recentAvailable = false
activeChat = 'cold-history'
fire('CHAT_SWITCHED', { chatId: activeChat })
root.innerHTML = '<p>Mira stands beside the sink.</p>'
const historicalRecord = swipe => ({ ...record(swipe), chatId: activeChat, messageId: 'older', key: `${activeChat}:older:${swipe}:request-${swipe}:illustration` })
backend({ ...state, chatId: activeChat, revision: 1, records: [historicalRecord(0), historicalRecord(1)] }); await flush()
assert(!projection(), 'unknown cold swipe must not project guessed historical images')
assert.equal(messageReads, 1, 'read only the unknown mounted message, once across all its records')
pendingReads.shift()({ id: 'older', chat_id: activeChat, swipe_id: 1 }); await flush()
assert(root.querySelector('img[src="/swipe-1.png"]'))
assert(!root.querySelector('img[src="/swipe-0.png"]'))
backend({ ...state, chatId: activeChat, revision: 2, records: [historicalRecord(0), historicalRecord(1)] }); await flush()
assert.equal(messageReads, 1, 'ordinary state echoes must not repeat the host read')
activeChat = 'late-history'
fire('CHAT_SWITCHED', { chatId: activeChat })
root.innerHTML = '<p>Mira stands beside the sink.</p>'
backend({ ...state, chatId: activeChat, revision: 1, records: [historicalRecord(1), historicalRecord(2)] }); await flush()
assert.equal(messageReads, 2)
fire('GENERATION_STARTED', { chatId: activeChat, generationId: 'newer-than-read', generationType: 'regenerate', targetMessageId: 'older', targetSwipeId: 2 })
pendingReads.shift()({ id: 'older', chat_id: activeChat, swipe_id: 1 }); await flush()
assert(!projection(), 'historical read cannot release the streaming guard')
fire('GENERATION_STOPPED', { chatId: activeChat, generationId: 'newer-than-read' })
backend({ ...state, chatId: activeChat, revision: 2, records: [historicalRecord(1), historicalRecord(2)] }); await flush()
assert(root.querySelector('img[src="/swipe-2.png"]'))
assert(!root.querySelector('img[src="/swipe-1.png"]'), 'late historical read overwrote newer swipe authority')

// Foreground mobile timing: Relay can receive a completed slot before the host
// message read is available. A null/error must not poison this session forever.
activeChat = 'foreground-miss'
fire('CHAT_SWITCHED', { chatId: activeChat })
root.innerHTML = '<p>Mira stands beside the sink.</p>'
const beforeMiss = messageReads
backend({ ...state, chatId: activeChat, revision: 1, records: [historicalRecord(1)] }); await flush()
assert.equal(messageReads, beforeMiss + 1)
pendingReads.shift()(null); await flush()
assert(!projection(), 'unresolved ownership must stay fail-closed')
const retryOwnershipRead = async () => {
  const entry = [...timeouts].find(([, timer]) => [250, 1000, 4000].includes(timer.delay))
  assert(entry, 'transient ownership miss needs a bounded automatic read retry')
  timeouts.delete(entry[0]); entry[1].callback(); await flush()
}
backend({ ...state, chatId: activeChat, revision: 2, records: [historicalRecord(1)] }); await flush()
assert.equal(messageReads, beforeMiss + 1, 'state echoes must not bypass the pending retry backoff')
await retryOwnershipRead()
assert.equal(messageReads, beforeMiss + 2, 'a temporarily missing host message must retry without another state tick or reload')
backend({ ...state, chatId: activeChat, revision: 3, records: [historicalRecord(1)] }); await flush()
assert.equal(messageReads, beforeMiss + 2, 'concurrent echoes must share one in-flight ownership lookup')
pendingReads.shift()({ id: 'older', chat_id: activeChat, swipe_id: 1 }); await flush()
assert(projection()?.querySelector('img')?.src.endsWith('/swipe-1.png'), 'saved Relay image must appear after host ownership becomes available, without a reload')

activeChat = 'foreground-error'
fire('CHAT_SWITCHED', { chatId: activeChat })
root.innerHTML = '<p>Mira stands beside the sink.</p>'
backend({ ...state, chatId: activeChat, revision: 1, records: [historicalRecord(1)] }); await flush()
pendingReads.shift(); pendingReadFailures.pop()(new Error('temporary host read failure')); await flush()
const beforeRenderRetry = messageReads
fire('CHARACTER_MESSAGE_RENDERED', { chatId: activeChat, messageId: 'older' }); await flush()
await retryOwnershipRead()
assert.equal(messageReads, beforeRenderRetry + 1, 'a transient rejected host lookup must not block a later render acknowledgement')
pendingReads.shift()({ id: 'older', chat_id: activeChat, swipe_id: 1 }); await flush()
assert(projection()?.querySelector('img')?.src.endsWith('/swipe-1.png'))

// The host's in-memory recent snapshot also grows after a new response; it is
// not a one-time chat-open snapshot. A pending old read must not overwrite it.
activeChat = 'foreground-new-message'
recentAvailable = true; recentMessageId = 'previous'; recentSwipe = 0
fire('CHAT_SWITCHED', { chatId: activeChat })
root.innerHTML = '<p>Mira stands beside the sink.</p>'
backend({ ...state, chatId: activeChat, revision: 1, records: [historicalRecord(1)] }); await flush()
recentMessageId = 'older'; recentSwipe = 1
backend({ ...state, chatId: activeChat, revision: 2, records: [historicalRecord(1)] }); await flush()
assert(projection()?.querySelector('img')?.src.endsWith('/swipe-1.png'), 'a newly available recent message must hydrate without a cold restart')
pendingReads.shift()({ id: 'older', chat_id: activeChat, swipe_id: 0 }); await flush()
assert(!root.querySelector('img[src="/swipe-0.png"]'), 'late read must not replace newer host snapshot ownership')

// Completion can beat the frontend terminal generation event. Releasing the
// streaming guard itself must bind the already-saved image, no state tick needed.
fire('GENERATION_STARTED', { chatId: activeChat, generationId: 'terminal-race', generationType: 'regenerate', targetMessageId: 'older', targetSwipeId: 1 })
backend({ ...state, chatId: activeChat, revision: 3, records: [historicalRecord(1)] }); await flush()
assert(!projection())
fire('GENERATION_ENDED', { chatId: activeChat, generationId: 'terminal-race', messageId: 'older' }); await flush()
assert(projection()?.querySelector('img')?.src.endsWith('/swipe-1.png'), 'terminal generation event must reveal a completion received while the stream guard was active')

activeChat = 'bounded-ownership-retries'; recentAvailable = false
fire('CHAT_SWITCHED', { chatId: activeChat })
root.innerHTML = '<p>Mira stands beside the sink.</p>'
const beforeBounded = messageReads
backend({ ...state, chatId: activeChat, revision: 1, records: [historicalRecord(1)] }); await flush()
for (let attempt = 0; attempt < 4; attempt++) {
  pendingReads.shift()(null); await flush()
  if (attempt < 3) await retryOwnershipRead()
}
assert.equal(messageReads, beforeBounded + 4, 'automatic ownership recovery must be bounded to three retries')
assert(![...timeouts.values()].some(timer => [250, 1000, 4000].includes(timer.delay)), 'failed reads must not poll forever')
assert(!projection(), 'exhausted reads must not guess the saved slot swipe')
backend({ ...state, chatId: activeChat, revision: 2, records: [historicalRecord(1)] }); await flush()
pendingReads.shift()({ id: 'older', chat_id: activeChat, swipe_id: 1 }); await flush()
assert(projection()?.querySelector('img')?.src.endsWith('/swipe-1.png'), 'a later authoritative state/render can recover after bounded retry exhaustion')

activeChat = 'retry-switch'; fire('CHAT_SWITCHED', { chatId: activeChat })
root.innerHTML = '<p>Mira stands beside the sink.</p>'
backend({ ...state, chatId: activeChat, revision: 1, records: [historicalRecord(1)] }); await flush()
pendingReads.shift()(null); await flush()
const staleRetry = [...timeouts.values()].find(timer => timer.delay === 250)!
assert(staleRetry)
activeChat = 'after-retry-switch'; fire('CHAT_SWITCHED', { chatId: activeChat })
const beforeStaleRetry = messageReads
staleRetry.callback(); await flush()
assert.equal(messageReads, beforeStaleRetry, 'old-chat retry callbacks cannot read in the new chat')
backend({ ...state, chatId: activeChat, revision: 1, records: [historicalRecord(1)] }); await flush()
pendingReads.shift()(null); await flush()
const retiredRetry = [...timeouts.values()].find(timer => timer.delay === 250)!
assert(retiredRetry)
assert(!sent.some(message => ['scan_message', 'rescan_chat', 'prose_illustrator_action', 'regenerate_slot', 'reparse_slot', 'queue_action'].includes(message.type)), 'display restoration cannot generate replacement images or rescan/replan')
cleanup()
const afterCleanupReads = messageReads
retiredRetry.callback(); await flush()
assert.equal(messageReads, afterCleanupReads, 'retired frontend cannot run delayed ownership lookups')
dom.window.close()
console.log('Relay swipe-stream DOM passed: cold fork/swipe ownership, transient null/rejected reads, three bounded automatic metadata retries, late recent snapshots, terminal-event render race, retry disposal/chat isolation, stale-read protection, streaming/Stop/Continue preservation and zero generation/scan commands.')
