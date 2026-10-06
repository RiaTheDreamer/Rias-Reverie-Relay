// @ts-nocheck -- Backend is initialized with an offline Lumiverse shim.
import assert from 'node:assert/strict'

const storage = new Map<string, any>()
;(globalThis as any).spindle = {
  on() {}, onFrontendMessage() {}, registerInterceptor() {}, registerMacro() {}, registerMessageContentProcessor() {}, sendToFrontend() {},
  permissions: { has: () => true }, log: { info() {}, warn() {}, error() {} },
  userStorage: {
    async getJson(path: string, options: any = {}) { return structuredClone(storage.get(path) ?? options.fallback ?? {}) },
    async setJson(path: string, value: any) { storage.set(path, structuredClone(value)) }, async mkdir() {},
  },
  chats: { async get() { return null } }, chat: { async getMessages() { return [] } },
  characters: { async get() { return null } }, personas: { async get() { return null }, async getActive() { return null } },
  connections: { async get() { return null } }, generate: { async raw() { throw new Error('Provider call forbidden in migration smoke') } },
  imageGen: new Proxy({}, { get() { throw new Error('Image provider call forbidden in migration smoke') } }),
}
const backend = await import('../src/backend')
const migrated = backend.migrateRelayStateSnapshot({ schemaVersion: 36, slots: {}, customSurfaces: {} })
assert.equal(migrated.storyConstellations.schemaVersion, 1)
assert.equal(Object.keys(migrated.storyConstellations.events).length, 0, 'old state hydrates with empty Story buckets')
assert.equal(migrated.schemaVersion, 37)
const config = await backend.getConfig('story-migration-user')
assert.equal(config.storyConstellationsEnabled, false, 'feature defaults off for existing installs')
assert.equal(config.autoConfirmStoryEvents, false, 'auto-confirm defaults off')
assert.equal(config.injectStoryEventContext, false, 'context injection defaults off')
assert.equal(config.analyzeEditedStoryMessages, true)

const normalized = await import('../src/storyState')
const tolerant = normalized.normalizeStoryConstellationState({ actors: { bad: null, legacy: { displayName: 'Legacy Actor', aliases: [] } }, phoneEntries: null })
assert.equal(tolerant.actors.bad, undefined)
assert.equal(tolerant.actors.legacy.kind, 'temporary')
assert.deepEqual(tolerant.phoneEntries, {})
console.log('PASS Story State migration: schema 36 -> 37, off-by-default settings, malformed legacy rows safely normalized')
