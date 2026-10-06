// @ts-nocheck -- mounted DOM and production frontend interceptor harness.
// Uses the pinned release-test jsdom dependency.
import assert from 'node:assert/strict'
import { buildInstantIllustrationSource, findInstantIllustrationAnchor } from '../src/instantIllustrationStream'

// Runtime-only host dependency; do not inject jsdom's Node ambient timer types
// into the browser extension's TypeScript compilation.
const domRuntime = 'jsdom'
const { JSDOM } = await import(domRuntime)

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/', pretendToBeVisual: true })
const win = dom.window
for (const name of ['window', 'document', 'HTMLElement', 'HTMLButtonElement', 'HTMLImageElement', 'HTMLInputElement', 'HTMLSelectElement', 'HTMLTextAreaElement', 'HTMLStyleElement', 'Element', 'ShadowRoot', 'Node', 'MutationObserver', 'Event', 'CustomEvent', 'getComputedStyle']) globalThis[name] = name === 'window' ? win : name === 'document' ? win.document : win[name]
win.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} })
globalThis.requestAnimationFrame = callback => win.requestAnimationFrame(callback)
globalThis.cancelAnimationFrame = id => win.cancelAnimationFrame(id)
globalThis.fetch = async () => ({ ok: false, status: 404, json: async () => ({}) })
globalThis.spindle = { on() {}, onFrontendMessage() {}, registerInterceptor() {}, registerMacro() {}, registerMessageContentProcessor() {}, sendToFrontend() {}, log: { info() {}, warn() {}, error() {} }, toast: { info() {}, success() {}, warning() {}, error() {} } }

const root = document.createElement('div')
root.setAttribute('data-component', 'MessageContent')
document.body.append(root)
const paragraph = document.createElement('p')
paragraph.textContent = 'Mira catches the sliding form before it reaches the coffee.'
root.append(paragraph)
const mount = (requestId: string, into = root) => {
  const host = document.createElement('div')
  host.setAttribute('data-lumiverse-html-island', '')
  into.append(host)
  host.attachShadow({ mode: 'open' }).innerHTML = `<style>.rrl-island{display:block}</style><div class="rrl-island"><div data-rrn-native-request="${requestId}"></div></div>`
  return host
}
const first = mount('first')
assert.deepEqual(findInstantIllustrationAnchor(root, 'first'), { cardFound: true, text: paragraph.textContent })
assert.deepEqual(findInstantIllustrationAnchor(root, 'missing'), { cardFound: false, text: null })
const second = mount('second')
assert.equal(findInstantIllustrationAnchor(root, 'second').text, null, 'must not skip another request and borrow its paragraph')
second.remove()
first.remove()

// The actual frontend scheduling path must survive rendering after interception.
const timers = new Map<number, { callback: () => void; delay: number }>()
let timerId = 0
win.setTimeout = (callback, delay = 0) => { const id = ++timerId; timers.set(id, { callback, delay }); return id }
win.clearTimeout = id => timers.delete(id)
win.setInterval = () => 0
win.clearInterval = () => {}
const interceptors = new Map<string, (payload: any) => void>()
const eventHandlers = new Map<string, (payload: any) => void>()
const sent: any[] = []
let backendHandler: (payload: any) => void
const drawerRoot = document.createElement('div')
document.body.append(drawerRoot)
const ctx: any = {
  dom: { addStyle: () => () => {}, findMessageElement: () => ({ querySelector: () => root }), cleanup() {} },
  ui: {
    registerDrawerTab: () => ({ root: drawerRoot, setTitle() {}, setShortName() {}, setBadge() {}, activate() {}, onActivate: () => () => {}, destroy() {} }),
    registerInputBarAction: () => ({ setLabel() {}, setSubtitle() {}, setEnabled() {}, onClick: () => () => {}, destroy() {} }),
    showModal: () => { const modalRoot = document.createElement('div'); document.body.append(modalRoot); return { root: modalRoot, dismiss: () => modalRoot.remove() } },
  },
  events: { on: (name, handler) => { eventHandlers.set(name, handler); return () => eventHandlers.delete(name) }, emit() {} }, display: { invalidate() {} },
  messages: { registerTagInterceptor: ({ tagName }, callback) => { interceptors.set(tagName, callback); return () => interceptors.delete(tagName) }, getRecent: () => [{ id: 'instant-message', swipe_id: 0, is_user: false }] },
  getActiveChat: () => ({ chatId: 'instant-chat', characterId: 'mira' }),
  sendToBackend: payload => sent.push(payload), onBackendMessage: handler => { backendHandler = handler; return () => {} },
}
const { setup } = await import('../src/frontend')
const cleanup = setup(ctx)
const state = { type: 'state', chatId: 'instant-chat', records: [], revision: 1, config: { enabled: true, enableRelayOrb: false, autoRescanOnChatOpen: false, proseIllustratorSettings: { enabled: true, mode: 'inline-protocol', instantIllustrationDispatch: true } }, parserConnections: [], imageConnections: [], imageProviders: [], logs: [], candidateBatches: [], galleryLinks: [], versionTrees: [] }
backendHandler(state)
const interceptor = interceptors.get('reverie-illustration')!
assert(interceptor, 'production streaming interceptor must register')
const payload = (slot: string) => ({ chatId: 'instant-chat', messageId: 'instant-message', isStreaming: true, tagName: 'reverie-illustration', attrs: { request: 'generate', slot }, content: '<visual_prompt>Mira catches the form.</visual_prompt>', fullMatch: `<reverie-illustration request="generate" slot="${slot}"><visual_prompt>Mira catches the form.</visual_prompt></reverie-illustration>` })
const tick = async (delay: number) => {
  for (const [id, timer] of [...timers]) if (timer.delay === delay) { timers.delete(id); timer.callback() }
  await Promise.resolve()
}
const scans = () => sent.filter(item => item.type === 'scan_message' && item.streaming)
interceptor(payload('first'))
await tick(10)
assert.equal(scans().length, 0, 'missing DOM must not invent an anchor')
assert([...timers.values()].some(timer => timer.delay === 100), 'render race must schedule a bounded retry')
mount('first')
await tick(100)
assert.equal(scans().length, 1, 'late shadow-island mount must dispatch while response is still streaming')
assert.equal(scans()[0].sourceContent, buildInstantIllustrationSource('', payload('first'), paragraph.textContent))
interceptor(payload('first'))
await tick(10)
assert.equal(scans().length, 1, 'repeated streaming interception must not duplicate the scan')
const p2 = paragraph.cloneNode(true)
p2.textContent = 'Yejin steadies the cup while Mira holds the form.'
root.append(p2)
mount('second')
const p3 = paragraph.cloneNode(true)
p3.textContent = 'Mira places the dry form on the counter.'
root.append(p3)
mount('third')
interceptor(payload('second'))
interceptor(payload('third'))
await tick(10)
assert.equal(scans().length, 3, 'each request in the same streamed response must keep its own timer')
assert.match(scans()[1].sourceContent, /^Yejin steadies/)
assert.match(scans()[2].sourceContent, /^Mira places/)
interceptor(payload('cancelled'))
await tick(10)
backendHandler({ type: 'queue_abort_ack' })
root.append(paragraph.cloneNode(true))
mount('cancelled')
await tick(100)
assert.equal(scans().length, 3, 'Abort All must cancel pending stream retries')
backendHandler({ ...state, revision: 2, config: { ...state.config, proseIllustratorSettings: { ...state.config.proseIllustratorSettings, instantIllustrationDispatch: false } } })
interceptor(payload('instant-off'))
await tick(10)
assert.equal(scans().length, 3, 'Instant off must not scan incomplete responses')

// The host's tag interceptor is XML-only. Bracket Instant dispatch must use
// the real production token-event subscriptions and exact source offsets.
backendHandler({ ...state, revision: 3 })
const bracket = slot => `[reverie_illustration][request]generate[/request][slot]${slot}[/slot][aspect]4:3[/aspect][cast]none[/cast][visual_prompt]Mira catches the form.[/visual_prompt][/reverie_illustration]`
const source = `Mira catches the blue form with both hands.\n\n${bracket('bracket-first')}`
const begin = generationId => eventHandlers.get('GENERATION_STARTED')!({ generationId, chatId: 'instant-chat', targetMessageId: 'instant-message', targetSwipeId: 2 })
const token = (generationId, text, offset, type = 'content') => eventHandlers.get('STREAM_TOKEN_RECEIVED')!({ generationId, chatId: 'instant-chat', token: text, offset, type })
begin('bracket-generation')
token('bracket-generation', source.slice(0, -1), 0)
await tick(10)
assert.equal(scans().length, 3, 'partial bracket roots cannot spend')
token('bracket-generation', ']', source.length - 1)
await tick(10)
assert.equal(scans().length, 4, 'complete bracket root dispatches before generation ends')
assert.equal(scans().at(-1).sourceContent, source, 'bracket Instant retains exact authored anchor and request')
assert.equal(scans().at(-1).swipeId, 2, 'bracket Instant keeps host-supplied swipe ownership')
token('bracket-generation', source, 0)
await tick(10)
assert.equal(scans().length, 4, 'replayed token events cannot double-dispatch')
begin('bracket-cancelled')
token('bracket-cancelled', source.slice(0, -1), 0)
backendHandler({ type: 'queue_abort_ack' })
token('bracket-cancelled', ']', source.length - 1)
await tick(10)
assert.equal(scans().length, 4, 'Abort All revokes late bracket stream completions')
begin('bracket-reasoning')
token('bracket-reasoning', source, 0, 'reasoning')
await tick(10)
assert.equal(scans().length, 4, 'reasoning controls cannot generate images')
token('bracket-reasoning', source.replace('bracket-first', 'bracket-fresh'), 0)
await tick(10)
assert.equal(scans().length, 5, 'fresh generation after abort can dispatch')
backendHandler({ ...state, revision: 4, config: { ...state.config, proseIllustratorSettings: { ...state.config.proseIllustratorSettings, instantIllustrationDispatch: false } } })
begin('bracket-off')
token('bracket-off', source, 0)
await tick(10)
assert.equal(scans().length, 5, 'Instant off disables token-event dispatch too')

// A completed streamed Surface can still lack render-time swipe metadata.
// Preview must ask the backend to resolve the host's active swipe, not disable
// repair or guess swipe zero. The backend then locks its exact source.
backendHandler({ ...state, revision: 5, parserConnections: [
  { id: 'gem-offline', name: 'Smol Gem', provider: 'google', model: 'gemini-fixture' },
  { id: 'gpt-working', name: 'Smol GPT', provider: 'openai', model: 'gpt-fixture' },
], config: { ...state.config, parserConnectionId: 'gem-offline' } })
const surface = document.createElement('section')
surface.dataset.rrnEditableSurface = 'kakao'
surface.dataset.rrnChatId = 'instant-chat'
surface.dataset.rrnMessageId = 'instant-message'
surface.dataset.rrnSurfaceId = 'kakao'
surface.dataset.rrnRootTag = 'kakao_chat'
surface.dataset.rrnSwipeId = ''
surface.dataset.rrnSurfaceSource = '[kakao_chat][title]Field Team[/kakao_chat]'
surface.dataset.rrnSurfaceOriginal = surface.dataset.rrnSurfaceSource
const repair = document.createElement('button')
repair.dataset.rrnAction = 'repair-surface'
surface.append(repair)
document.body.append(surface)
repair.click()
const preview = [...document.querySelectorAll('button')].find(el => el.textContent === 'Preview Assisted Repair')!
assert(preview && !preview.disabled, 'Assisted action must open an idle editor so the user can select a working connection first')
assert.equal(sent.filter(item => item.type === 'native_surface_repair_preview').length, 0, 'Opening Assisted Repair must make no model call')
const repairConnection = preview.closest('.dg-modal-body')!.querySelector('select[aria-label="Assisted Repair Connection"]')!
assert(repairConnection, 'The actual repair editor must expose its own connection selector')
repairConnection.value = 'gpt-working'
repairConnection.dispatchEvent(new Event('change', { bubbles: true }))
assert(sent.some(item => item.type === 'set_config' && item.patch?.surfaceRepairConnectionId === 'gpt-working'), 'Repair choice must persist independently of the Surface Parser')
preview.click()
const repairRequest = sent.find(item => item.type === 'native_surface_repair_preview')
assert(repairRequest, 'the production repair editor must dispatch a preview')
assert.equal(repairRequest.repairConnectionId, 'gpt-working', 'Preview must carry the selected working connection before any settings acknowledgement')
assert(preview.disabled && repairConnection.disabled, 'Pending preview must lock its source and provider choice')
preview.click()
assert.equal(repairRequest.swipeId, undefined, 'missing swipe metadata must not be guessed as swipe zero')
backendHandler({ type: 'native_surface_repair_result', requestId: repairRequest.requestId, chatId: 'instant-chat', messageId: 'instant-message', status: 'failed', error: 'Offline fixture complete.' })
await Promise.resolve()
assert.equal(sent.filter(item => item.type === 'native_surface_repair_preview').length, 1, 'Assisted action starts one preview; extra clicks cannot duplicate it while pending')
assert.equal(document.querySelector('[role="status"]')?.textContent, 'Offline fixture complete.')
const modalBody = preview.closest('.dg-modal-body')!
const markup = modalBody.querySelector('textarea')!
const save = [...modalBody.querySelectorAll('button')].find(el => el.textContent === 'Save Surface')!
markup.value = '[kakao_chat][title]Field Team[/title][/kakao_chat]'
save.click()
const manual = sent.find(item => item.type === 'native_surface_action' && item.action === 'edit')
assert(manual?.operationId, 'manual edit must request a backend acknowledgement')
assert(modalBody.isConnected, 'Save must not dismiss the editor before persistence succeeds')
assert(save.disabled && markup.disabled, 'pending save must not allow duplicate writes or draft changes')
save.click()
assert.equal(sent.filter(item => item.type === 'native_surface_action').length, 1)
backendHandler({ type: 'native_surface_repair_result', requestId: manual.operationId, chatId: 'instant-chat', messageId: 'instant-message', status: 'failed', error: 'Host storage rejected this fixture.' })
await Promise.resolve()
assert(modalBody.isConnected && !save.disabled && !markup.disabled)
assert.match(modalBody.querySelector('[role="status"]')!.textContent, /Host storage rejected/)
assert.equal(markup.value, manual.replacementMarkup, 'failed save must preserve the draft')
save.click()
const retry = sent.filter(item => item.type === 'native_surface_action').at(-1)
backendHandler({ type: 'native_surface_repair_result', requestId: retry.operationId, chatId: 'instant-chat', messageId: 'instant-message', status: 'applied' })
await Promise.resolve()
assert(!modalBody.isConnected, 'acknowledged save closes the editor')
// Exercise the actual shadow-island click path, not only light-DOM buttons.
const shadowFixture = document.createElement('div')
document.body.append(shadowFixture)
const shadow = shadowFixture.attachShadow({ mode: 'open' })
const shadowSurface = surface.cloneNode(true)
shadowSurface.dataset.rrnSwipeId = '1'
shadowSurface.querySelector('button')!.dataset.rrnAction = 'edit-surface'
shadow.append(shadowSurface)
const beforeInspect = sent.length
shadowSurface.querySelector('button')!.click()
assert.equal(sent.length, beforeInspect, 'Inspect / Fix in an HTML island must open without model spend')
const inspectBody = [...document.querySelectorAll('.dg-modal-body')].at(-1)!
assert.equal(inspectBody.querySelector('textarea')!.value, surface.dataset.rrnSurfaceSource)
assert(!inspectBody.textContent.includes('Full Complete Dry Run'), 'unrelated pipeline controls must not obscure Surface repair')
const inspectPreview = [...inspectBody.querySelectorAll('button')].find(el => el.textContent === 'Preview Assisted Repair')!
inspectPreview.click()
const freshPreview = sent.at(-1)
assert.equal(freshPreview.swipeId, 1)
backendHandler({ type: 'native_surface_repair_result', requestId: freshPreview.requestId, chatId: 'instant-chat', messageId: 'instant-message', status: 'preview-ready', repairId: 'fixture-approved', proposedMarkup: '[kakao_chat][title]Field Team[/title][/kakao_chat]' })
await Promise.resolve()
const apply = [...inspectBody.querySelectorAll('button')].find(el => el.textContent === 'Apply Preview')!
assert(!apply.disabled)
assert.equal(sent.filter(item => item.type === 'native_surface_repair_apply').length, 0, 'preview must never auto-apply')
apply.click()
const applyRequest = sent.at(-1)
assert.equal(applyRequest.repairId, 'fixture-approved')
backendHandler({ type: 'native_surface_repair_result', requestId: applyRequest.requestId, chatId: 'instant-chat', messageId: 'instant-message', status: 'applied' })
await Promise.resolve()
assert(!inspectBody.isConnected)
cleanup()
dom.window.close()
console.log('Instant mounted DOM smoke passed: XML shadow-root anchors and bracket token events, delayed mounting, exact swipe ownership, duplicate suppression, reasoning exclusion, Abort All, and Instant-off timing exercised through the production frontend.')
