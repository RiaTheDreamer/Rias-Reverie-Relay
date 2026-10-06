// @ts-nocheck -- focused runtime smoke for the backend's bounded worker lanes.
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import {
  DEFAULT_RELAY_JOB_CONCURRENCY,
  MAX_RELAY_JOB_CONCURRENCY,
  normalizeRelayJobConcurrency,
} from '../src/contracts'

;(globalThis as any).spindle = {
  registerMessageContentProcessor() {}, registerInterceptor() { return () => {} }, registerMacro() {}, on() {}, onFrontendMessage() {}, sendToFrontend() {},
  permissions: { has() { return true }, onChanged() { return () => {} } },
  userStorage: { async getJson(_path: string, options: any = {}) { return structuredClone(options.fallback || {}) }, async setJson() {}, async mkdir() {} },
  chat: { async getMessages() { return [] } }, chats: { async get(chatId: string) { return { id: chatId } } },
  characters: { async get() { return null } }, personas: { async getActive() { return null } },
  world_books: { async getActivated() { return [] }, entries: { async get() { return null } } },
  imageGen: {}, variables: { global: { async set() {} }, chat: { async set() {} } },
  log: { info() {}, warn() {}, error() {} },
}

const backend = await import('../src/backend')
const frontendSource = await readFile(new URL('../src/frontend.ts', import.meta.url), 'utf8')
const backendSource = await readFile(new URL('../src/backend.ts', import.meta.url), 'utf8')

assert.equal(DEFAULT_RELAY_JOB_CONCURRENCY, 2)
assert.equal(normalizeRelayJobConcurrency('6'), 6, 'six must survive config normalization')
assert.equal(normalizeRelayJobConcurrency(0), 1, 'concurrency cannot be disabled through this field')
assert.equal(normalizeRelayJobConcurrency(99), MAX_RELAY_JOB_CONCURRENCY, 'extreme values must remain bounded')
assert.equal(normalizeRelayJobConcurrency(undefined), DEFAULT_RELAY_JOB_CONCURRENCY, 'missing config must retain the default')
assert.match(frontendSource, /numberInput\('Concurrent Relay Preprocessing Jobs',[^\n]+MAX_RELAY_JOB_CONCURRENCY/)
assert.match(backendSource, /queueConcurrencyLimit: normalizeRelayJobConcurrency\(raw\.queueConcurrencyLimit/)

let active = 0
let maximumActive = 0
let resolveSixActive!: () => void
let releaseWorkers!: () => void
const sixActive = new Promise<void>(resolve => { resolveSixActive = resolve })
const workerGate = new Promise<void>(resolve => { releaseWorkers = resolve })
const run = backend.runWithConcurrency(Array.from({ length: 12 }, (_, index) => index), normalizeRelayJobConcurrency(6), async () => {
  active += 1
  maximumActive = Math.max(maximumActive, active)
  if (active === 6) resolveSixActive()
  await workerGate
  active -= 1
})

let timeoutId: ReturnType<typeof setTimeout> | undefined
try {
  await Promise.race([
    sixActive,
    new Promise<never>((_resolve, reject) => { timeoutId = setTimeout(() => reject(new Error('six bounded workers did not start')), 3000) }),
  ])
} finally {
  if (timeoutId) clearTimeout(timeoutId)
}
assert.equal(active, 6, 'the bounded job pool must run six workers when configured for six')
releaseWorkers()
await run
assert.equal(maximumActive, 6, 'the bounded job pool must not exceed the configured limit')

const laneUserId = `relay-concurrency-smoke-${Date.now()}`
const releases = await Promise.all(Array.from({ length: 6 }, () => backend.acquirePromptPreparationWorker(laneUserId, 6)))
let seventhGranted = false
const seventh = backend.acquirePromptPreparationWorker(laneUserId, 6).then(release => {
  seventhGranted = true
  return release
})
await Promise.resolve()
assert.equal(seventhGranted, false, 'prompt preparation must queue work beyond the configured six workers')
releases[0]()
const releaseSeventh = await seventh
assert.equal(seventhGranted, true, 'a queued preparation worker must start when one of the six releases')
for (const release of releases.slice(1)) release()
releaseSeventh()

console.log('Relay concurrency smoke passed: config accepts 6, both worker pools honor the bound, and excess preparation work waits.')
