// @ts-nocheck -- Offline production-parser and mounted frontend regression.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { imageContentWithoutSurfaceDestination, portraitReplacedBySurfaceUi } from '../src/surfaceImageIntent'

const storage = new Map<string, unknown>()
const parserRequests: any[] = []
const portrait = 'Centered square portrait for a UI card. Yuna Vale, an adult executive, with a sharp black bob, amber eyes, a tailored black suit and gold earrings, amused expression under warm interior light.'
let parserReply = portrait
globalThis.spindle = {
  on() {}, onFrontendMessage() {}, registerInterceptor() {}, registerMacro() {}, registerMessageContentProcessor() {}, sendToFrontend() {},
  permissions: { has: () => true }, log: { info() {}, warn() {}, error() {} },
  userStorage: { async getJson(path, { fallback }) { return structuredClone(storage.get(path) ?? fallback) }, async setJson(path, value) { storage.set(path, structuredClone(value)) }, async mkdir() {} },
  chats: { async get() { return { character_id: 'fixture' } } }, characters: { async get() { return { id: 'fixture', name: 'Unrelated Host', description: 'red hair' } } },
  personas: { async getActive() { return null } }, chat: { async getMessages() { return [] } },
  connections: { async get() { return { id: 'mock', model: 'mock', provider: 'offline' } } },
  generate: { async raw(request) { parserRequests.push(request); return { content: JSON.stringify({ prompt: parserReply, negativeAdditions: parserReply === portrait ? '' : 'person, human' }) } } },
  imageGen: new Proxy({}, { get() { throw new Error('Provider calls forbidden in regression') } }),
}
const backend = await import('../src/backend')
const config = { ...await backend.getConfig('offline'), parserConnectionId: 'mock', parserRetries: 0, includeCharacterInfo: false, includePersonaInfo: false }
const job = { chatId: 'feedback-chat', messageId: 'feedback-message', swipeId: 0, requestId: 'npc-portrait', target: 'custom.artifact-media', count: 1, slots: ['portrait'], alt: 'Portrait of Yuna Vale', originalSceneBrief: portrait, originalNegativePrompt: '', originalRequestXml: '', sourceContent: '', promptSource: 'structured', cast: '' }
assert.equal(backend.classifyImageRequest(job), 'character portrait', 'Surface placement language must not erase a portrait')
assert.equal(backend.targetHumanPolicy(job).allowHumanPrompt, true)
assert.equal(backend.targetHumanPolicy(job).allowHumanContext, true)
const prepared = await backend.parseSlotPrompt(job, 'portrait', [], 0, config, 'offline', { includeCharacters: false, includePersona: false })
assert.equal(prepared.parserUsed, true)
assert.match(prepared.prompt, /Yuna Vale/)
assert.match(prepared.prompt, /black bob/)
assert.match(prepared.prompt, /tailored black suit/)
assert.doesNotMatch(prepared.prompt, /UI card|screen content only|interface content|card borders/i)
assert(!prepared.negativePrompt.split(',').some(term => /^(?:person|human|face|portrait|woman)$/i.test(term.trim())), 'blanket human exclusions must not suppress the NPC')
const requestText = JSON.stringify(parserRequests[0])
assert.doesNotMatch(requestText, /portrait for a UI card/i)
assert.doesNotMatch(requestText, /No human subject is permitted|screen content only/)
assert.match(requestText, /hosting this image is not its subject/)
assert.equal(job.originalSceneBrief, portrait, 'forensic source must remain unchanged')
parserReply = 'Centered square digital UI card asset for Yuna Vale. Clean full-frame graphic screen layout with geometric card borders.'
const repaired = await backend.parseSlotPrompt(job, 'portrait', [], 0, config, 'offline', { includeCharacters: false, includePersona: false })
assert.match(repaired.prompt, /Yuna Vale/)
assert.match(repaired.prompt, /black bob/)
assert.doesNotMatch(repaired.prompt, /UI card|screen content only|screen layout|card borders/i)
assert(!repaired.negativePrompt.split(',').some(term => /^(?:person|human|face|portrait|woman)$/i.test(term.trim())))
assert.equal(repaired.promptPipeline.parserFallbackUsed, true, 'a stale/contradictory Parser rewrite must fall back to the image-only portrait, not regenerate or send UI instructions')
assert.equal(parserRequests.length, 2, 'targeted correction must not add another creative model call')

for (const destination of ['for a UI card', 'for an NPC card', 'to be used in the profile panel', 'displayed in this interface slot']) {
  assert.equal(imageContentWithoutSurfaceDestination(`Portrait ${destination}. Black bob.`), 'Portrait. Black bob.')
}
for (const scene of ['A UI card on a tablet screen.', 'A woman holding an identity card.', 'A screenshot of a profile card.', 'Portrait of a woman beside a computer screen.']) {
  assert.equal(imageContentWithoutSurfaceDestination(scene), scene, 'actual depicted screens/objects must survive')
  assert.equal(portraitReplacedBySurfaceUi(scene), false)
}
assert.equal(portraitReplacedBySurfaceUi('A portrait with a warm expression. No UI card asset or edge-to-edge interface content.'), false)
for (const scene of ['A screenshot of a profile card.', 'Direct UI screen capture of a chat interface, no people visible.']) {
  const screenJob = { ...job, originalSceneBrief: scene, alt: 'UI screenshot' }
  assert.equal(backend.classifyImageRequest(screenJob), 'screenshot/article/ui')
  assert.equal(backend.targetHumanPolicy(screenJob).allowHumanPrompt, false)
}

const { JSDOM, VirtualConsole } = await import('jsdom')
const domErrors: Error[] = []
const virtualConsole = new VirtualConsole()
virtualConsole.on('jsdomError', error => domErrors.push(error))
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/', pretendToBeVisual: true, virtualConsole })
const win = dom.window
for (const name of ['window', 'document', 'HTMLElement', 'HTMLButtonElement', 'HTMLImageElement', 'HTMLInputElement', 'HTMLSelectElement', 'HTMLTextAreaElement', 'HTMLStyleElement', 'HTMLDetailsElement', 'Element', 'ShadowRoot', 'Node', 'MutationObserver', 'Event', 'CustomEvent', 'getComputedStyle']) globalThis[name] = name === 'window' ? win : name === 'document' ? win.document : win[name]
win.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {} })
const intervals = new Map<number, { callback: () => void; delay: number }>()
const timeouts = new Map<number, () => void>()
let timerId = 0
win.setTimeout = callback => { const id = ++timerId; timeouts.set(id, callback); return id }
win.clearTimeout = id => timeouts.delete(id)
win.setInterval = (callback, delay) => { const id = ++timerId; intervals.set(id, { callback, delay }); return id }
win.clearInterval = id => intervals.delete(id)
win.requestAnimationFrame = callback => win.setTimeout(callback)
win.cancelAnimationFrame = id => win.clearTimeout(id)
globalThis.requestAnimationFrame = callback => win.requestAnimationFrame(callback)
globalThis.cancelAnimationFrame = id => win.clearTimeout(id)
globalThis.fetch = async () => ({ ok: false, status: 404, json: async () => ({}) })
const sent: any[] = []
const messageRoots = new Map<string, HTMLElement>()
const drawerRoot = document.createElement('div')
document.body.append(drawerRoot)
let backendHandler
const styles: string[] = []
const ctx = {
  dom: { addStyle: css => { styles.push(css); return () => {} }, findMessageElement: id => messageRoots.get(id), cleanup() {} },
  ui: {
    registerDrawerTab: () => ({ root: drawerRoot, setTitle() {}, setShortName() {}, setBadge() {}, activate() {}, onActivate: () => () => {}, destroy() {} }),
    registerInputBarAction: () => ({ setLabel() {}, setSubtitle() {}, setEnabled() {}, onClick: () => () => {}, destroy() {} }),
    showModal: () => { const root = document.createElement('div'); document.body.append(root); return { root, dismiss: () => root.remove() } },
  },
  events: { on: () => () => {}, emit() {} }, display: { invalidate() {} },
  messages: { registerTagInterceptor: () => () => {}, getRecent: () => [...messageRoots.keys()].map(id => ({ id, swipe_id: 0, is_user: false })) },
  getActiveChat: () => ({ chatId: 'feedback-chat', characterId: 'fixture' }),
  sendToBackend: payload => sent.push(payload), onBackendMessage: handler => { backendHandler = handler; return () => {} },
}
const { setup } = await import('../src/frontend')
const cleanup = setup(ctx)
const state = { type: 'state', chatId: 'feedback-chat', records: [], revision: 1, config: { enabled: true, enableRelayOrb: false, autoRescanOnChatOpen: false, proseIllustratorSettings: {} }, parserConnections: [], imageConnections: [], imageProviders: [], logs: [], candidateBatches: [], galleryLinks: [], versionTrees: [] }
const deliver = payload => {
  backendHandler(payload)
  for (const [id, callback] of [...timeouts]) { timeouts.delete(id); callback() }
}
const originalNow = Date.now
let now = originalNow()
Date.now = () => now
try {
  deliver(state)
assert.equal(drawerRoot.querySelector('.dg-title')?.textContent, "Ria's Reverie Relay", 'mounted dashboard heading must use public branding')
  const watchdog = [...intervals.values()].find(item => item.delay === 20_000)!
  assert(watchdog, 'production lifecycle watchdog missing')
  const queries = () => sent.filter(item => item.type === 'list_state')
  const beforeIdle = queries().length
  now += 30_000
  watchdog.callback()
  assert.equal(queries().length, beforeIdle, 'idle chats must not poll')
  deliver({ ...state, revision: 2, backgroundQueue: { items: { analysis: { id: 'analysis', chatId: state.chatId, source: 'analysis', stage: 'analyzing', startedAt: now, updatedAt: now, statusText: 'Planning illustrations' } } } })
  now += 20_001
  watchdog.callback()
  assert.equal(queries().length, beforeIdle + 1, 'Relay analysis with no slots yet must recover missed state broadcasts too')
  let visibility = 'hidden'
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => visibility })
  const beforeHidden = queries().length
  now += 30_000
  watchdog.callback()
  win.dispatchEvent(new win.Event('focus'))
  assert.equal(queries().length, beforeHidden, 'a suspended/hidden page must not poll or refresh on focus')
  visibility = 'visible'
  document.dispatchEvent(new win.Event('visibilitychange'))
  assert.equal(queries().length, beforeHidden + 1, 'returning to the PWA must fetch saved state without reloading')
  win.dispatchEvent(new win.Event('focus'))
  win.dispatchEvent(new win.Event('pageshow'))
  win.dispatchEvent(new win.Event('online'))
  assert.equal(queries().length, beforeHidden + 1, 'coincident resume/focus/online events must be coalesced')
  assert(sent.some(item => item.type === 'frontend_session' && item.connected), 'resume must renew frontend placement ownership')
  deliver({ ...state, revision: 3 })
  now += 30_000
  watchdog.callback()
  assert.equal(queries().length, beforeHidden + 1, 'terminal analysis must stop polling')
  // The page may miss the analysis-start broadcast as well as completion.
  // Foreground recovery must not require an already-known pending slot/job.
  visibility = 'hidden'
  document.dispatchEvent(new win.Event('visibilitychange'))
  visibility = 'visible'
  document.dispatchEvent(new win.Event('visibilitychange'))
  assert.equal(queries().length, beforeHidden + 2, 'resume must catch work that began and finished while the client knew no active jobs')
  for (const [index, app] of ['core', 'narrative', 'custom'].entries()) {
    const root = document.createElement('div')
    const island = document.createElement('div')
    root.append(island)
    document.body.append(root)
    const shadow = island.attachShadow({ mode: 'open' })
    const requestId = `live-${app}`
    shadow.innerHTML = `<div class="rrl-island"><div class="rrl-card" data-rrn-native-request="${requestId}"><div class="rrl-media-slot"><div class="rrl-generation-placeholder"></div></div><span class="rrl-status"></span><strong class="rrl-title"></strong></div></div>`
    messageRoots.set(requestId, root)
    const key = `feedback-chat:${requestId}:0:${requestId}:${requestId}`
    const base = { key, chatId: 'feedback-chat', messageId: requestId, swipeId: 0, requestId, slot: requestId, target: 'custom.artifact-media', targetApp: app, history: [], originalSceneBrief: 'Fixture photograph', originalRequestXml: '<image_request/>', originalNegativePrompt: '', alt: 'Fixture photograph', createdAt: now - 600_000, updatedAt: now - 600_000 }
    const revision = 10 + index * 10
    deliver({ ...state, revision, records: [{ ...base, status: 'generating' }] })
    const card = shadow.querySelector('.rrl-card')!
    assert.equal(card.dataset.rrnLiveStatus, 'generating', 'slow provider must not become failed/stalled')
    assert.equal(card.querySelector('.rrl-status')!.textContent, 'Generating')
    assert(!card.classList.contains('rrl-error'))
    const before = queries().length
    now += 20_001
    watchdog.callback()
    assert.equal(queries().length, before + 1, 'missed broadcasts must trigger a read-only state query')
    watchdog.callback()
    assert.equal(queries().length, before + 1, 'repeated callbacks must be bounded')
    // Global settings broadcasts carry empty per-chat state. They must not
    // erase a live job or lower its revision, even at a higher global revision.
    deliver({ ...state, chatId: null, revision: 999, records: [] })
    now += 20_001
    watchdog.callback()
    assert.equal(queries().length, before + 2, 'global preferences erased active chat records')
    visibility = 'hidden'
    document.dispatchEvent(new win.Event('visibilitychange'))
    now += 30_000
    const beforeResume = queries().length
    visibility = 'visible'
    document.dispatchEvent(new win.Event('visibilitychange'))
    assert.equal(queries().length, beforeResume + 1, 'foreground catch-up must request the completion missed during suspension')
    // The mocked persisted-state reply is the only completion notification.
    deliver({ ...state, revision: revision + 1, records: [{ ...base, status: 'completed', imageId: `image-${app}`, imageUrl: `/completed-${app}.png`, updatedAt: now }] })
    const image = card.querySelector('img')!
    assert.equal(image?.getAttribute('src'), `/completed-${app}.png`, 'completion must hydrate the same ShadowDOM slot without reload')
    assert.equal(card.dataset.rrnLiveStatus, 'completed', 'global revision incorrectly blocked completion')
    deliver({ ...state, revision, records: [{ ...base, status: 'queued' }] })
    assert.equal(card.dataset.rrnLiveStatus, 'completed', 'older queued broadcast must not downgrade completion')
    deliver({ ...state, chatId: null, revision: 0, records: [] })
    image.dispatchEvent(new win.MouseEvent('contextmenu', { bubbles: true, composed: true, clientX: 280, clientY: 180 }))
    const menu = document.querySelector('.dg-router-panel.dg-menu')!
    assert(menu, 'global preferences must preserve image ownership and context menu')
    assert.equal(menu.querySelectorAll(':scope > button').length, 5, 'common actions must remain compact')
    assert(menu.querySelector('details.dg-menu-more'))
    const viewportWidth = win.innerWidth, viewportHeight = win.innerHeight
    win.innerWidth = 390; win.innerHeight = 844
    menu.getBoundingClientRect = () => ({ left: 280, top: 230, width: 288, height: 658 })
    menu.querySelector('details.dg-menu-more')!.dispatchEvent(new win.Event('toggle'))
    assert.equal(menu.style.left, '94px')
    assert.equal(menu.style.top, '178px', 'expanded groups must be clamped above the viewport bottom')
    win.innerWidth = viewportWidth; win.innerHeight = viewportHeight
    document.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    assert(!menu.isConnected)
    const afterComplete = queries().length
    now += 30_000
    watchdog.callback()
    assert.equal(queries().length, afterComplete, 'completed chats must stop polling')
  }
  // An unlocked PWA can miss both the first analysis broadcast and completion.
  // No known pending work, focus event, navigation or reload may be required.
  const relayState = { ...state, revision: 100, config: { ...state.config, proseIllustratorSettings: { enabled: true, mode: 'relay-planned' } } }
  deliver(relayState)
  const beforeUnknown = queries().length
  now += 20_001
  watchdog.callback()
  assert.equal(queries().length, beforeUnknown + 1, 'visible Relay must discover work even when its start broadcast was missed')
  assert.equal(queries().at(-1).knownRevision, 100, 'idle Relay probes must be conditional, not rebuild unchanged drawer state')
  watchdog.callback()
  assert.equal(queries().length, beforeUnknown + 1, 'visible catch-up probes must remain rate limited')
  const root = document.createElement('div')
  root.innerHTML = '<p>Mira stood beside the window.</p>'
  document.body.append(root)
  messageRoots.set('missed-relay', root)
  const recovered = { key: 'feedback-chat:missed-relay:0:relay-slot:illustration', chatId: state.chatId, messageId: 'missed-relay', swipeId: 0,
    requestId: 'relay-slot', slot: 'illustration', target: 'prose.illustration', targetApp: 'prose', proseSynthetic: true,
    proseAnchor: { paragraphIndex: 0, insertionSide: 'after', selectedExcerpt: 'Mira stood beside the window.' },
    originalRequestXml: '', originalSceneBrief: 'Mira stood beside the window.', originalNegativePrompt: '', history: [], count: 1, alt: 'Window fixture', createdAt: now, updatedAt: now }
  deliver({ ...relayState, revision: 101, records: [{ ...recovered, status: 'generating' }] })
  assert(root.querySelector('.dgir-prose-lifecycle-projection .rrl-card'), 'read-only catch-up must mount the missing synthetic status card into existing story DOM')
  deliver({ ...relayState, revision: 102, records: [{ ...recovered, status: 'completed', imageId: 'recovered-image', imageUrl: '/recovered-relay.png' }] })
  assert(root.querySelector('img[src="/recovered-relay.png"]'), 'the same visible reply must mount its completed image without reload')
  // A host render can also remove a projection after its final state arrived.
  // With no later state change, the conditional probe must still rebind locally.
  root.innerHTML = '<p>Mira stood beside the window.</p>'
  deliver({ type: 'state_unchanged', chatId: 'different-chat', revision: 102 })
  deliver({ type: 'state_unchanged', chatId: state.chatId, revision: 101 })
  assert(!root.querySelector('img'), 'wrong-chat or stale probe acknowledgements cannot mutate the active projection')
  now += 20_001
  watchdog.callback()
  for (const [id, callback] of [...timeouts]) { timeouts.delete(id); callback() }
  assert(root.querySelector('img[src="/recovered-relay.png"]'), 'visible watchdog must restore a lost completed mount even when no new backend state arrives')
  deliver({ ...relayState, revision: 103, config: { ...relayState.config, enabled: false } })
  const beforeDisabled = queries().length
  now += 20_001
  watchdog.callback()
  assert.equal(queries().length, beforeDisabled, 'disabled Relay must not keep probing idle chats')
  assert(!sent.some(item => ['scan_message', 'rescan_chat', 'prose_illustrator_action', 'queue_action', 'regenerate', 'reparse', 'retry_placement'].includes(item.type)), 'watchdog/resume must not spend/restart/repair provider jobs')
  const css = styles.join('\n')
  assert.match(css, /\.dg-router-panel\.dg-menu \{[^}]*background: #211820 !important/)
  assert.match(css, /:root\[data-dgir-theme="clean-panel"\] \.dg-router-panel\.dg-menu,[\s\S]*?background: #211820 !important; opacity: 1 !important/, 'the final themed rule must protect solid menu opacity from the later compositor/panel override')
  assert.match(css, /\.dg-router-panel\.dg-menu button:focus-visible/)
  assert.match(css, /@media \(pointer: coarse\).*min-height: 44px/)
  cleanup()
  assert(![...intervals.values()].some(item => item.delay === 20_000), 'watchdog must retire with frontend')
  const afterCleanup = sent.length
  now += 30_000
  document.dispatchEvent(new win.Event('visibilitychange'))
  win.dispatchEvent(new win.Event('focus'))
  win.dispatchEvent(new win.Event('pageshow'))
  win.dispatchEvent(new win.Event('online'))
  assert.equal(sent.length, afterCleanup, 'retired frontend must remove all foreground/reconnect listeners')
  assert.deepEqual(domErrors, [], 'DOM event handler exceptions must fail the regression')
} finally {
  Date.now = originalNow
  dom.window.close()
}
console.log('Staging feedback regressions passed: portrait parser/profile, screen preservation, slow-provider status, analysis-only recovery, bounded resume/reconnect, unlocked missed-start recovery, synthetic status/image mounting without navigation, lost completed-mount recovery, disabled/hidden/stale-chat guards, ShadowDOM completion, listener cleanup and compact context menu. No provider calls for state recovery.')
