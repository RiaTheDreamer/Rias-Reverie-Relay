// @ts-nocheck -- mounted browser fixture with the crypto API available on LAN HTTP.
import assert from 'node:assert/strict'
import { JSDOM } from 'jsdom'
import { mountPhoneWidget } from '../src/phoneWidget'
import { emptyPhoneDevice } from '../src/phoneDevice'

const originalCrypto = globalThis.crypto
let randomFills = 0
Object.defineProperty(globalThis, 'crypto', { configurable: true, value: {
  getRandomValues(array) { randomFills++; return originalCrypto.getRandomValues(array) },
} })
const dom = new JSDOM('<!doctype html><body></body>', { url: 'http://mobile-host/', pretendToBeVisual: true })
globalThis.window = dom.window; globalThis.document = dom.window.document
const sent = [], widgets = [], handlers = [], timers = new Map()
let disconnected = false, nextTimer = 0, requireShell = false
window.setTimeout = callback => { const id = ++nextTimer; timers.set(id, callback); return id }
window.clearTimeout = id => timers.delete(id)
const host = {
  getActiveChat: () => ({ chatId: 'http-phone-chat' }),
  sendToBackend(message) {
    if (requireShell) assert(widgets.at(-1).root.shadowRoot.querySelector('[aria-label="Close phone"]'), 'The shell precedes the request')
    if (disconnected) throw new Error('Test bridge disconnected')
    sent.push(message)
  },
  onBackendMessage: handler => { handlers.push(handler); return () => {} }, events: { on: () => () => {} },
  ui: { createFloatWidget(options) {
    const root = document.createElement('div'); document.body.append(root)
    const handle = { root, options, setVisible() {}, destroy() { root.remove() } }
    widgets.push(handle); return handle
  } },
}
let phone
try {
  phone = mountPhoneWidget(host, { enabled: false })
  assert.equal(sent.length, 0, 'Disabled phone does not load')
  const settings = document.createElement('div'); document.body.append(settings)
  assert.doesNotThrow(() => phone.mountSettings(settings), 'The Phone tab must mount without crypto.randomUUID, including while disabled')
  assert(settings.shadowRoot.querySelector('.settings'), 'The dashboard settings actually rendered')
  assert.doesNotThrow(() => phone.setEnabled(true), 'Enabling on HTTP must not interrupt frontend config hydration')
  requireShell = true
  assert.doesNotThrow(() => phone.open(), 'Opening on HTTP must not leave a blank fullscreen blocker')
  assert(widgets.at(-1).root.shadowRoot.querySelector('[aria-label="Close phone"]'))
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
  assert(sent.every(message => uuid.test(message.operationId)), 'Fallback preserves RFC 4122 v4 IDs')
  assert.equal(new Set(sent.map(message => message.operationId)).size, sent.length)
  assert.equal(randomFills, sent.length, 'Every HTTP operation uses cryptographic randomness, never Math.random')
  widgets.at(-1).root.shadowRoot.querySelector('[aria-label="Close phone"]').click()
  requireShell = false
  disconnected = true
  assert.doesNotThrow(() => phone.mountSettings(settings), 'A disconnected bridge cannot block the dashboard tab')
  assert(settings.shadowRoot.textContent.includes('Test bridge disconnected'))
  requireShell = true
  assert.doesNotThrow(() => phone.open(), 'A disconnected bridge cannot hide the close button')
  assert(widgets.at(-1).root.shadowRoot.textContent.includes('Test bridge disconnected'))
  assert.equal(timers.size, 0, 'Failed load dispatch cannot leave hidden retry timers')
  widgets.at(-1).root.shadowRoot.querySelector('[aria-label="Close phone"]').click()
  requireShell = false; disconnected = false
  phone.open()
  disconnected = true
  assert.equal(timers.size, 1)
  const [id, retry] = timers.entries().next().value; timers.delete(id)
  assert.doesNotThrow(retry, 'Asynchronous retry failures are also contained')
  assert.equal(timers.size, 0)
  assert(widgets.at(-1).root.shadowRoot.querySelector('[aria-label="Close phone"]'))
  disconnected = false
  handlers[0]({type:'phone_state', chatId:'http-phone-chat', operationId:sent.at(-1).operationId, state:emptyPhoneDevice(), identities:[], connections:[], saved:[]})
  assert(!widgets.at(-1).root.shadowRoot.textContent.includes('Test bridge disconnected'), 'A successful projection clears the load failure, not just its timer')
  assert(!settings.shadowRoot.textContent.includes('Test bridge disconnected'), 'Recovered settings do not retain a stale load error')
  assert(sent.every(message => message.action === 'load'), 'No provider generation or mutation was dispatched')
  console.log('phone HTTP context smoke passed: disabled settings, enable, open, secure UUID fallback, synchronous/async bridge failure and close')
} finally {
  phone?.destroy(); dom.window.close()
  Object.defineProperty(globalThis, 'crypto', { configurable: true, value: originalCrypto })
}
