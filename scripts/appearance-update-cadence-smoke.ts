// @ts-nocheck -- real backend/storage with an offline Appearance provider.
import assert from 'node:assert/strict'
import { normalizeContinuityVault } from '../src/vault'
import { appearanceUpdateIsDue } from '../src/appearanceUpdateSchedule'

assert.equal(normalizeContinuityVault({ appearanceSidecar: { lastRunAt: 123, lastMessageId: 'legacy' } }).appearanceSidecar.lastFullRefreshMessageId, 'legacy', 'Previously initialized chats must not need setup again')
assert.equal(normalizeContinuityVault({ appearanceSidecar: { lastRunAt: 123, lastMessageId: 'field-only', lastFullRefreshMessageId: '' } }).appearanceSidecar.lastFullRefreshMessageId, '', 'A new partial scan must not be migrated as full setup')
assert.equal(appearanceUpdateIsDue(3, 'deleted', 'new', ['one', 'new']), true, 'Deleted history anchors must rebase once instead of stalling forever')
assert.equal(appearanceUpdateIsDue(0, 'deleted', 'new', ['new']), false, 'Never stays disabled even when history was trimmed')
assert.equal(appearanceUpdateIsDue(3, 'base', 'two', ['base', 'one', 'one', 'two']), false, 'Duplicate history rows must not inflate the count')

const stored = new Map(), calls = [], events = new Map()
const histories = new Map()
let fail = false
const storage = {
  async getJson(path, { fallback, userId } = {}) { return structuredClone(stored.get(`${userId}:${path}`) ?? fallback) },
  async setJson(path, value, { userId } = {}) { stored.set(`${userId}:${path}`, structuredClone(value)) }, async mkdir() {},
}
globalThis.spindle = {
  on(name, callback) { events.set(name, callback) }, onFrontendMessage() {}, registerInterceptor() {}, registerMacro() {}, registerMessageContentProcessor() {},
  sendToFrontend() {}, permissions: { has: () => true }, log: { info() {}, warn() {}, error() {} }, storage, userStorage: storage,
  chats: { async get() { return { character_id: 'mira' } } },
  characters: { async get() { return { id: 'mira', name: 'Mira', description: 'Adult woman with black hair.' } } },
  personas: { async getActive() { return null } }, chat: { async getMessages(chatId) { return structuredClone(histories.get(chatId) || []) } },
  connections: { async get(id) { return { id, model: 'offline', provider: 'fixture' } }, async list() { return [] } },
  world_books: { async getActivated() { return [] }, entries: { async get() { return null } } },
  variables: { global: { async set() {} }, chat: { async set() {} } },
  generate: { async raw(request) {
    calls.push(request)
    if (fail) throw new Error('Offline Appearance outage')
    return { content: JSON.stringify({ subjects: [{ name: 'Mira', role: 'character', canonical: { hair: { booruTags: ['black_hair'] } }, current: { attire: { booruTags: ['green_cardigan'] } } }] }) }
  } },
}
let backend = await import('../src/backend')
const userId = 'cadence-user'
await backend.setConfig({ enabled: true, appearanceSidecarConnectionId: 'appearance', parserRetries: 0, vaultStrength: 'strong',
  appearanceUpdateIntervalMessages: 0, proseIllustratorSettings: { ...backend.defaultProseIllustratorSettings(), appearanceMemoryEnabled: true },
}, userId)
const add = (chatId, id, role = 'assistant') => {
  const message = { id, role, is_user: role === 'user', content: `Mira stands beside the window. Scene ${id}.`, swipe_id: 0 }
  histories.set(chatId, [...(histories.get(chatId) || []), message]); return message
}
const run = (chatId, message, extra = {}) => backend.runAppearanceSidecar({ chatId, messageId: message.id, swipeId: 0, content: message.content, userId, ...extra })
const first = add('never', 'first')
assert.equal(await run('never', first), true, 'Never must still perform initial setup')
assert.equal(calls.length, 1)
const second = add('never', 'second')
assert.equal(await run('never', second), false, 'Never must skip automatic updates after successful setup')
assert.equal(calls.length, 1, 'Skipped updates must make no model call')
assert.equal(await run('never', second, { mode: 'reconcile', reason: 'orb-appearance-rescan' }), true, 'Manual rescan must bypass Never')
assert.equal(calls.length, 2)

await backend.setConfig({ appearanceUpdateIntervalMessages: 3 }, userId)
const baseline = add('interval', 'baseline')
await run('interval', baseline)
for (const id of ['one', 'two']) {
  add('interval', `user-${id}`, 'user')
  for (const role of ['system', 'tool']) {
    const other = add('interval', `${role}-${id}`, role)
    other.is_user = false // Host rows can share this legacy flag with assistant replies.
  }
  const message = add('interval', id)
  assert.equal(await run('interval', message), false)
  assert.equal(await run('interval', message), false, 'Repeated discovery must not advance the cadence')
}
assert.equal(calls.length, 3)
// Re-import the backend to exercise persisted config, vault normalization and a
// fresh runtime cache, rather than proving only in-memory counting.
backend = await import('../src/backend?cadence-reload')
assert.equal((await backend.getConfig(userId)).appearanceUpdateIntervalMessages, 3)
const third = add('interval', 'three')
assert.equal(await run('interval', third), true, 'The third story response must refresh across reloads')
assert.equal(calls.length, 4)
assert.equal(await run('interval', third), false, 'A completed turn must remain idempotent')
const fourth = add('interval', 'four')
await run('interval', fourth, { mode: 'reconcile', reason: 'manual' })
assert.equal(await run('interval', add('interval', 'five')), false, 'A full manual scan restarts the interval')
assert.equal(calls.length, 5)

await backend.setConfig({ appearanceUpdateIntervalMessages: 0 }, userId)
fail = true
const failedSetup = add('outage', 'initial')
await assert.rejects(run('outage', failedSetup), /Offline Appearance outage/)
fail = false
assert.equal(await run('outage', failedSetup), true, 'A failed setup must not satisfy the mandatory first scan')
assert.equal(await run('outage', add('outage', 'after-setup')), false)
assert.equal(calls.length, 7)
await backend.setConfig({ appearanceUpdateIntervalMessages: 1 }, userId)
const edited = { ...second, content: 'Mira now wears a blue sweater.', swipe_id: 1 }
assert.equal(await run('never', edited, { swipeId: 1 }), true, 'Every response preserves the existing swipe/edit refresh behavior')
assert.equal(calls.length, 8)
assert.equal((await backend.getConfig('other-user')).appearanceUpdateIntervalMessages, 1, 'Frequency is user-scoped')
await backend.setConfig({ appearanceUpdateIntervalMessages: -4 }, userId)
assert.equal((await backend.getConfig(userId)).appearanceUpdateIntervalMessages, 0)
await backend.setConfig({ appearanceUpdateIntervalMessages: 4.8 }, userId)
assert.equal((await backend.getConfig(userId)).appearanceUpdateIntervalMessages, 4)
await backend.setConfig({ appearanceUpdateIntervalMessages: Number.NaN }, userId)
assert.equal((await backend.getConfig(userId)).appearanceUpdateIntervalMessages, 1)
await backend.setConfig({ appearanceUpdateIntervalMessages: 0 }, userId)
const enriched = add('enrichment-first', 'enrich')
await run('enrichment-first', enriched, { mode: 'enrichment', focusCharacter: { id: 'mira', name: 'Mira' } })
assert.equal(await run('enrichment-first', add('enrichment-first', 'full-setup')), true, 'A focused enrichment must not replace mandatory full setup')
assert.equal(await run('enrichment-first', add('enrichment-first', 'after-full')), false)
assert.equal(calls.length, 10)
console.log('Appearance update cadence passed: mandatory setup, Never, every third story response, replay dedupe, manual reset, persisted reload, outage retry, swipe default and user scope. Offline providers only.')
process.exit(0)
