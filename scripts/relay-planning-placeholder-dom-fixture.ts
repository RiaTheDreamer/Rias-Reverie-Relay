// @ts-nocheck -- mounted production frontend fed real backend broadcasts.
import { JSDOM } from 'jsdom'

export async function mountPlanningChat(chatId, messageId, story) {
  const dom = new JSDOM('<body><main></main><aside></aside></body>', { url: 'http://localhost/', pretendToBeVisual: true })
  const win = dom.window
  for (const name of ['window','document','HTMLElement','HTMLButtonElement','HTMLImageElement','HTMLInputElement','HTMLSelectElement','HTMLTextAreaElement','HTMLStyleElement','Element','ShadowRoot','Node','MutationObserver','Event','CustomEvent','getComputedStyle']) globalThis[name] = name === 'window' ? win : name === 'document' ? win.document : win[name]
  win.innerWidth = 390
  win.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {} })
  win.setInterval = () => 0; win.clearInterval = () => {}
  const frames = new Map(); let frame = 0
  win.requestAnimationFrame = callback => { frames.set(++frame, callback); return frame }
  win.cancelAnimationFrame = id => frames.delete(id)
  globalThis.requestAnimationFrame = win.requestAnimationFrame; globalThis.cancelAnimationFrame = win.cancelAnimationFrame
  globalThis.fetch = async () => ({ ok: false, status: 404 })
  const root = document.querySelector('main')
  root.dataset.component = 'MessageContent'
  for (const text of story.split('\n\n')) { const p = document.createElement('p'); p.textContent = text; root.append(p) }
  let receive
  const { setup } = await import('../src/frontend')
  const cleanup = setup({
    dom: { addStyle: () => () => {}, findMessageElement: id => id === messageId ? root : null, cleanup() {} },
    ui: {
      registerDrawerTab: () => ({ root: document.querySelector('aside'), setTitle() {}, setShortName() {}, setBadge() {}, activate() {}, onActivate: () => () => {}, destroy() {} }),
      registerInputBarAction: () => ({ setLabel() {}, setSubtitle() {}, setEnabled() {}, onClick: () => () => {}, destroy() {} }),
      showModal() { throw new Error('Planning cards must not open an actionable slot dialog') },
    },
    events: { on: () => () => {}, emit() {} }, display: { invalidate() {} },
    messages: { registerTagInterceptor: () => () => {}, getRecent: () => [{ id: messageId, swipe_id: 0, is_user: false }] },
    getActiveChat: () => ({ chatId, characterId: 'mira' }),
    sendToBackend() {}, onBackendMessage(handler) { receive = handler; return () => {} },
  })
  return {
    receive: value => receive(value), root,
    cards: () => [...root.querySelectorAll('[data-dgir-prose-projection]')],
    previews: () => [...root.querySelectorAll('[data-dgir-planning-preview]')],
    async flush() { for (let i = 0; i < 8; i++) { await Promise.resolve(); const batch = [...frames]; frames.clear(); for (const [, callback] of batch) callback(0) } },
    cleanup() { cleanup(); dom.window.close() },
  }
}
