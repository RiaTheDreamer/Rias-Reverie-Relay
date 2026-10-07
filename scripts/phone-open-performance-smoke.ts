// @ts-nocheck -- deterministic production-service regression in Bun's test runtime.
import assert from 'node:assert/strict'
import { createPhoneService } from '../src/phoneService'
import { emptyPhoneDevice } from '../src/phoneDevice'
import { phoneCoreRecords } from '../src/phoneCoreApps'
import { mountPhoneWidget } from '../src/phoneWidget'
import { JSDOM } from 'jsdom'

const identities = [{ id: 'character:qa', name: 'Character', kind: 'character' as const }]
const counts = { read: 0, identities: 0, projection: 0, generate: 0 }
const responses: Record<string, unknown>[] = []
let release!: () => void
const blocked = new Promise<void>(resolve => { release = resolve })
let hold = false
const service = createPhoneService({
  read: async () => { counts.read++; if (hold) await blocked; return emptyPhoneDevice() },
  identities: async () => { counts.identities++; return identities },
  projection: async () => { counts.projection++; return { saved: [], connections: [] } },
  mutate: async () => { throw new Error('A clean load must not mutate storage') },
  generate: async () => { counts.generate++; throw new Error('Opening must not dispatch a provider') },
  send: message => { responses.push(message) },
})
const command = (operationId: string) => ({ type: 'reverie_phone_command' as const, action: 'load' as const, chatId: 'qa-chat', operationId })
await service.handle(command('load-baseline-001'), 'qa-user')
console.log('Single open dependency calls:', JSON.stringify(counts))
const narrative = 'The performers walk through the quiet rehearsal hall. '.repeat(200)
const start = performance.now()
for (let i = 0; i < 400; i++) assert.equal(phoneCoreRecords(narrative, `story-${i}`, 0).length, 0)
console.log(`400 prose-only history records: ${(performance.now() - start).toFixed(1)} ms`)
assert.deepEqual(counts, { read: 1, identities: 1, projection: 1, generate: 0 }, 'One open must read/reconcile and resolve identities once, not repeat history work')

hold = true
const first = service.handle(command('load-retry-00001'), 'qa-user')
const second = service.handle(command('load-retry-00002'), 'qa-user')
await Promise.resolve(); await Promise.resolve()
release()
await Promise.all([first, second])
assert.deepEqual(counts, { read: 2, identities: 2, projection: 2, generate: 0 }, 'Overlapping retries must share one load, not multiply history scans')
assert.equal(responses.filter(row => row.operationId === 'load-retry-00001').length, 1)
assert.equal(responses.filter(row => row.operationId === 'load-retry-00002').length, 1, 'Every retry keeps its own acknowledgement for frontend recovery')
await service.handle(command('load-next-000001'), 'qa-user')
assert.equal(counts.read, 3, 'Completed loads are not cached: edits and swipes remain fresh')
await Promise.all([service.handle(command('load-other-00001'), 'other-user'), service.handle(command('load-other-00002'), 'qa-user')])
assert.equal(counts.read, 5, 'Users cannot share a phone load snapshot')
await service.handle(command('invalid name'), 'qa-user')
assert.equal(responses.at(-1)?.type, 'phone_error', 'Coalescing does not bypass operation validation')
await Promise.all([service.handle(command('load-chat-a-0001'), 'qa-user'), service.handle({ ...command('load-chat-b-0001'), chatId: 'other-chat' }, 'qa-user')])
assert.equal(counts.read, 7, 'Separate chats cannot share a phone load snapshot')
let failedReads = 0, failRead = true
const errors = []
const recoveringService = createPhoneService({
  read: async () => { failedReads++; if (failRead) throw new Error('History unavailable'); return emptyPhoneDevice() },
  identities: async () => identities, projection: async () => ({}),
  mutate: async () => { throw new Error('No automatic mutation') },
  generate: async () => { throw new Error('No automatic generation') }, send: message => errors.push(message),
})
await Promise.all([recoveringService.handle(command('load-failed-0001'), 'qa-user'), recoveringService.handle(command('load-failed-0002'), 'qa-user')])
assert.equal(failedReads, 1)
assert.deepEqual(errors.map(message => [message.type, message.operationId]), [['phone_error', 'load-failed-0001'], ['phone_error', 'load-failed-0002']], 'Each overlapping caller receives its own failed-load acknowledgement')
failRead = false
await recoveringService.handle(command('load-recovery-001'), 'qa-user')
assert.equal(failedReads, 2, 'Failed load promises are discarded so an explicit retry can recover')
assert.equal(errors.at(-1).type, 'phone_state')
console.log('phone open performance smoke passed: bounded reads, isolated single-flight, fresh subsequent loads, no provider dispatch')

// Exercise the actual mounted handset. Account-history badge rendering must be
// linear, not a nested parent search for every notification on every render.
const dom = new JSDOM('<!doctype html><body><button id="story">Story page</button></body>', { url: 'http://localhost/', pretendToBeVisual: true })
globalThis.window = dom.window; globalThis.document = dom.window.document
const widgets = [], handlers = [], sent = []
const ctx = {
  getActiveChat: () => ({ chatId: 'qa-chat' }), sendToBackend: message => sent.push(message),
  onBackendMessage: handler => { handlers.push(handler); return () => handlers.splice(handlers.indexOf(handler), 1) },
  events: { on: () => () => {} },
  ui: { createFloatWidget: options => {
    const root = document.createElement('div'); document.body.append(root)
    const widget = { root, options, setVisible() {}, destroy() { root.remove() } }; widgets.push(widget); return widget
  } },
}
const widget = mountPhoneWidget(ctx)
widget.open()
assert(widgets.at(-1).root.shadowRoot.textContent.includes('Loading this chat'), 'An unresponsive backend still gives an immediate closeable phone shell')
widgets.at(-1).root.shadowRoot.querySelector('[aria-label="Close phone"]').click()
assert(!widgets.at(-1).root.isConnected, 'Closing a still-loading phone releases the overlay without waiting for the backend')
let idReads = 0
const entries = []
for (let i = 0; i < 1000; i++) {
  const id = `parent-${i}`
  entries.push({ get id() { idReads++; return id }, recordId: 'qa-record', from: 'character:qa', body: 'Post', createdAt: 1 })
  entries.push({ get id() { idReads++; return `reply-${i}` }, replyTo: id, recordId: 'qa-record', from: 'npc:qa', body: 'Reply', createdAt: i % 2 ? 20 : 5 })
}
const packet = { type: 'phone_state', chatId: 'qa-chat', operationId: sent.at(-1).operationId, identities, state: { ...emptyPhoneDevice(), appInteractions: entries, readAt: { 'app:character:qa:qa-record': 10 } }, appRecords: [{ id: 'qa-record', appId: 'x', title: 'Post' }], connections: [], saved: [] }
handlers[0](packet)
assert(idReads < entries.length * 10, `Closed launcher badge must use linear parent lookup; read ${idReads} ids for ${entries.length} entries`)
idReads = 0
const openedAt = performance.now()
widget.open()
console.log(`Mounted phone open with 2,000 app interactions: ${(performance.now() - openedAt).toFixed(1)} ms; ${idReads} parent-id reads`)
assert(idReads < entries.length * 10, 'Opening with a populated inbox must not rescan every parent per reply')
assert.equal(widgets[0].root.shadowRoot.querySelector('.launcher').getAttribute('aria-label'), 'Open Reverie Phone · 500 unread notifications', 'The faster unread lookup preserves exact read-receipt semantics')
widgets.at(-1).root.shadowRoot.querySelector('[aria-label="Close phone"]').click()
assert(!widgets.at(-1).root.isConnected)
assert(sent.every(message => message.action === 'load'), 'Opening and closing must not send messages or generation commands')
widget.destroy(); dom.window.close()
console.log('Mounted phone responsiveness smoke passed: loading can be closed, linear unread rendering, unchanged read receipts')
