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
  messages: { registerTagInterceptor: () => () => {}, getRecent: () => [] },
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
  assert.equal(drawerRoot.querySelector('.dg-title')?.textContent, "Ria's Reverie Relay", 'mounted dashboard heading must use the requested display name')
  const watchdog = [...intervals.values()].find(item => item.delay === 20_000)!
  assert(watchdog, 'production lifecycle watchdog missing')
  const queries = () => sent.filter(item => item.type === 'list_state')
  const beforeIdle = queries().length
  now += 30_000
  watchdog.callback()
  assert.equal(queries().length, beforeIdle, 'idle chats must not poll')
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
  assert(!sent.some(item => ['scan_message', 'queue_action', 'regenerate', 'reparse', 'retry_placement'].includes(item.type)), 'watchdog must not spend/restart/repair provider jobs')
  const css = styles.join('\n')
  assert.match(css, /\.dg-router-panel\.dg-menu \{[^}]*background: #211820 !important/)
  assert.match(css, /\.dg-router-panel\.dg-menu button:focus-visible/)
  assert.match(css, /@media \(pointer: coarse\).*min-height: 44px/)
  cleanup()
  assert(![...intervals.values()].some(item => item.delay === 20_000), 'watchdog must retire with frontend')
  assert.deepEqual(domErrors, [], 'DOM event handler exceptions must fail the regression')
} finally {
  Date.now = originalNow
  dom.window.close()
}
console.log('Staging feedback regressions passed: production portrait parser/profile, actual screen preservation, slow-provider status, bounded read-only refresh, global-state isolation, stale queued rejection, mounted ShadowDOM completion and compact context menu.')
