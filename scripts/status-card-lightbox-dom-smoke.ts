// @ts-nocheck -- exercise mounted production handlers, no model/provider calls.
import assert from 'node:assert/strict'
import { JSDOM } from 'jsdom'
import { renderLifecycleWidgetMarkup } from '../src/nativeSurfaces'
const dom = new JSDOM('<body><div id="drawer"></div><article id="message"></article></body>', { url: 'http://localhost/', pretendToBeVisual: true })
const win = dom.window
for (const name of ['window','document','HTMLElement','HTMLButtonElement','HTMLImageElement','HTMLInputElement','HTMLSelectElement','HTMLTextAreaElement','HTMLStyleElement','Element','ShadowRoot','Node','MutationObserver','Event','CustomEvent','getComputedStyle']) globalThis[name] = name === 'window' ? win : name === 'document' ? win.document : win[name]
win.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {} })
win.setInterval = () => 0; win.clearInterval = () => {}
const frames = new Map(); let frame = 0
win.requestAnimationFrame = callback => { frames.set(++frame, callback); return frame }
win.cancelAnimationFrame = id => frames.delete(id)
globalThis.requestAnimationFrame = win.requestAnimationFrame; globalThis.cancelAnimationFrame = win.cancelAnimationFrame
globalThis.fetch = async () => ({ ok: false, status: 404 })
globalThis.spindle = { on() {}, onFrontendMessage() {}, registerInterceptor() {}, registerMacro() {}, registerMessageContentProcessor() {}, sendToFrontend() {}, log: { info() {}, warn() {}, error() {} } }
const sent = [], opened = []
const root = document.getElementById('message')
let receive, revision = 0
const ctx = {
  dom: { addStyle: () => () => {}, findMessageElement: id => id === 'message' ? root : null, cleanup() {} },
  ui: {
    registerDrawerTab: () => ({ root: document.getElementById('drawer'), setTitle() {}, setShortName() {}, setBadge() {}, activate() {}, onActivate: () => () => {}, destroy() {} }),
    registerInputBarAction: () => ({ setLabel() {}, setSubtitle() {}, setEnabled() {}, onClick: () => () => {}, destroy() {} }),
    showModal(options) { const root = document.createElement('div'); document.body.append(root); const modal = { root, title: options.title, dismiss() { root.remove() } }; opened.push(modal); return modal },
  },
  events: { on: () => () => {}, emit() {} }, display: { invalidate() {} },
  messages: { registerTagInterceptor: () => () => {}, getRecent: () => [{ id: 'message', swipe_id: 0, is_user: false }] },
  getActiveChat: () => ({ chatId: 'chat', characterId: 'character' }),
  sendToBackend(message) { sent.push(message) }, onBackendMessage(handler) { receive = handler; return () => {} },
}
const { setup } = await import('../src/frontend')
const cleanup = setup(ctx)
const base = { key: 'chat:message:0:request:photo', chatId: 'chat', messageId: 'message', swipeId: 0, requestId: 'request', slot: 'photo', target: 'custom.artifact-media', targetApp: 'custom',
  status: 'failed', originalSceneBrief: 'A folded letter on the desk.', originalRequestXml: '<image_request id="request" target="custom.artifact-media" slot="photo"><scene_brief>A folded letter on the desk.</scene_brief></image_request>', originalNegativePrompt: '', alt: 'Folded letter', requestAspect: '16:9', count: 1, createdAt: 1, updatedAt: 1, history: [] }
const live = () => opened.findLast(modal => modal.root.isConnected)
const action = text => [...live().root.querySelectorAll('button')].find(button => button.textContent === text)
async function flush() { for (let i = 0; i < 5; i++) { await Promise.resolve(); const batch = [...frames]; frames.clear(); for (const [, callback] of batch) callback(0) } }
async function mount(record, shadow = false) {
  root.replaceChildren()
  const host = shadow ? root.appendChild(document.createElement('div')).attachShadow({ mode: 'open' }) : root
  // The host normally unwraps HTML islands into shadow roots.
  const markup = renderLifecycleWidgetMarkup('image_request', base.originalRequestXml, { chatId: 'chat', messageId: 'message', swipeId: 0, records: [record] }).content
  const template = document.createElement('template'); template.innerHTML = markup
  const surface = document.createElement('details'); surface.open = true
  surface.innerHTML = '<summary>Plot Sparks</summary><div class="surface-body"></div>'
  surface.querySelector('.surface-body').appendChild(template.content.querySelector('.rrl-card') || template.content.querySelector('template')?.content.querySelector('.rrl-card'))
  host.appendChild(surface)
  receive({ type: 'state', chatId: 'chat', revision: ++revision, records: [structuredClone(record)], config: { enabled: true, phoneEnabled: false, enableRelayOrb: false, autoRescanOnChatOpen: false }, parserConnections: [], imageConnections: [], imageProviders: [], logs: [], candidateBatches: [], galleryLinks: [], versionTrees: [] })
  await flush()
  return host.querySelector('.rrl-card')
}
try {
  for (const status of ['recovered-pending','preparing','queued','parsing','provider-waiting','generating','failed','cancelled','placement-pending','placement-repair-needed']) {
    const pending = status.startsWith('placement-') ? { imageUrl: '/preserved.png', imageId: 'preserved', generatedAt: 2 } : undefined
    const record = { ...base, status, pendingPlacement: pending, error: status === 'failed' ? 'Malformed image prompt' : undefined }
    const card = await mount(record, status === 'failed')
    if (status === 'recovered-pending') assert.equal(card.querySelector('.rrl-status').textContent, 'Not generated', 'a recovered request must not claim its image is Ready')
    const before = sent.length
    card.querySelector('.rrl-media-slot').dispatchEvent(new win.MouseEvent('click', { bubbles: true, composed: true }))
    assert(live(), `${status} status card must open the normal slot lightbox`)
    assert(live().root.querySelector('.dg-slot-lightbox-controls'), 'all states retain normal controls')
    assert(action('Generation Details'), `${status} retains diagnostics`)
    if (pending) assert.equal(live().root.querySelector('img')?.getAttribute('src'), '/preserved.png', 'preserved assets open directly, with no regeneration')
    else assert(live().root.querySelector('.dg-slot-lightbox-status'), 'missing image shows a status stage above controls')
    assert.equal(sent.length, before, 'opening status controls must not dispatch generation, reparse or insert')
    if (status === 'failed') {
      action('Edit Prompt').click()
      assert.equal(live().title, 'Edit Image Prompt')
      assert.equal(live().root.querySelector('textarea')?.value, base.originalSceneBrief)
      live().dismiss()
    }
    live().dismiss()
    const trigger = card.querySelector('[data-dgir-slot-controls]')
    assert(trigger && trigger.tabIndex === 0, 'status stage must be keyboard accessible')
    trigger.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, composed: true }))
    assert(live(), 'Enter opens status controls')
    live().dismiss()
    const nested = card.querySelector('summary')
    if (nested) { nested.click(); assert(!live(), 'request disclosure does not open a lightbox') }
  }
  const pending = { ...base, status: 'placement-pending', pendingPlacement: { imageUrl: '/preserved.png', imageId: 'preserved', generatedAt: 2 } }
  const card = await mount(pending)
  const insert = card.querySelector('[data-rrn-action="repair-placement"]')
  assert(insert, 'restored pending placement retains Insert')
  insert.click(); await flush()
  assert(!live(), 'Insert must remain a distinct action and not open the lightbox')
  assert(sent.some(message => message.type === 'retry_placement' && message.key === pending.key), 'Insert targets the exact preserved asset slot')
  root.replaceChildren()
  const glassHost = root.appendChild(document.createElement('div')).attachShadow({ mode: 'open' })
  glassHost.innerHTML = '<details data-reverie-glass-button="1"><summary class="rr-surface-launcher-iconized rr-surface-launcher-sparkling" data-rr-glass-launcher="1" style="border-radius:999px!important;background:red!important;height:42px!important;--custom:blue"><span class="rr-surface-sparks"><i></i></span><span class="r43-particles"><i></i></span>View Instagram Profile</summary><p>Saved profile content</p></details>'
  receive({ type: 'state', chatId: 'chat', revision: ++revision, records: [], config: { enabled: true, phoneEnabled: false, enableRelayOrb: false, autoRescanOnChatOpen: false }, parserConnections: [], imageConnections: [], imageProviders: [], logs: [], candidateBatches: [], galleryLinks: [], versionTrees: [] })
  await flush()
  const savedLauncher = glassHost.querySelector('summary')
  assert.equal(savedLauncher.style.borderRadius, '13px', 'already-saved Instagram launcher must match the Narrative glass design at mount')
  assert.equal(savedLauncher.style.height, '40px')
  assert.equal(savedLauncher.style.getPropertyValue('--custom'), 'blue', 'unrelated inline properties survive')
  assert(glassHost.querySelector('style[data-reverie-core-glass-presentation-host]')?.textContent.includes('>.r43-particles{display:none!important}'), 'old shadow islands receive the current glass authority and suppress duplicate particles')
  savedLauncher.click(); assert(glassHost.querySelector('details').open, 'presentation repair preserves the original disclosure control')
  for (const [variant, mode, particles] of [['inline','inline',0],['plain-button','plain',0],['sparkle-button','sparkling',8],['glass','glass',8],['plain-glass','plain-glass',0]]) {
    glassHost.innerHTML = `<details class="pw-wardrobe" data-pw-variant="${variant}"><summary style="border-radius:999px!important;--unrelated:kept"><span class="rr-surface-svg-icon" data-rr-surface-icon="narrative:Persona Wardrobe"></span>Wardrobe</summary><p>Keep this body</p></details>`
    receive({ type: 'state', chatId: 'chat', revision: ++revision, records: [], config: { enabled: true, phoneEnabled: false, enableRelayOrb: false, autoRescanOnChatOpen: false }, parserConnections: [], imageConnections: [], imageProviders: [], logs: [], candidateBatches: [], galleryLinks: [], versionTrees: [] })
    await flush()
    const launcher = glassHost.querySelector('summary')
    assert.equal(launcher.dataset.rrLauncherMode, mode, `saved ${variant} must retain its own mode`)
    assert.equal(launcher.querySelectorAll('.rr-surface-sparks i').length, particles, `saved ${variant} sparkle field`)
    assert.equal(launcher.style.display, mode === 'inline' ? 'none' : 'flex')
    assert.equal(launcher.style.getPropertyValue('--unrelated'), 'kept')
    assert.equal(glassHost.querySelector('p').textContent, 'Keep this body')
    if (particles) {
      launcher.classList.remove('rr-surface-launcher-sparkling')
      launcher.querySelector('.rr-surface-sparks').remove()
      receive({ type: 'state', chatId: 'chat', revision: ++revision, records: [], config: { enabled: true, phoneEnabled: false, enableRelayOrb: false, autoRescanOnChatOpen: false }, parserConnections: [], imageConnections: [], imageProviders: [], logs: [], candidateBatches: [], galleryLinks: [], versionTrees: [] })
      await flush()
      assert(launcher.classList.contains('rr-surface-launcher-sparkling'), 'host reuse must not leave a cached launcher without its selected mode')
      assert.equal(launcher.querySelectorAll('.rr-surface-sparks i').length, 8, 'host reuse must restore exactly one particle field')
    }
  }
  glassHost.innerHTML = '<section class="rrn-editable-surface"><details><summary class="rr-surface-launcher-iconized" data-rr-launcher-mode="plain"><span class="rr-surface-svg-icon" data-rr-surface-icon="core:instagram-profile"></span>Profile</summary><p>Keep profile</p></details></section>'
  receive({ type: 'state', chatId: 'chat', revision: ++revision, records: [], config: { enabled: true, phoneEnabled: false, enableRelayOrb: false, autoRescanOnChatOpen: false, surfaceDefaultShellMode: 'sparkling' }, parserConnections: [], imageConnections: [], imageProviders: [], logs: [], candidateBatches: [], galleryLinks: [], versionTrees: [] })
  await flush()
  assert.equal(glassHost.querySelector('summary').dataset.rrLauncherMode, 'sparkling', 'current native Core shell preference must win over a reused launcher marker')
  assert.equal(glassHost.querySelectorAll('.rr-surface-sparks i').length, 8)
  assert.equal(glassHost.querySelector('p').textContent, 'Keep profile')
  const statusCard = await mount({ ...base, status: 'recovered-pending' })
  cleanup()
  statusCard.querySelector('.rrl-media-slot').click()
  assert(!live(), 'teardown removes the delegated status handler')
} finally { cleanup(); dom.window.close() }
console.log('PASS status-card lightbox: touch/click, keyboard, shadow DOM, ten lifecycle states, prompt/diagnostic access, preserved placement and no inspection spend.')
