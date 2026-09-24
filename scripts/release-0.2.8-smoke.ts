// @ts-nocheck -- deterministic offline release and legacy-state gate.
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync, readdirSync } from 'node:fs'
import { basename } from 'node:path'

const root = new URL('../', import.meta.url)
const read = (relative: string) => readFileSync(new URL(relative, root), 'utf8')
const json = (relative: string) => JSON.parse(read(relative))

const pkg = json('package.json')
const manifest = json('spindle.json')
assert.equal(pkg.version, '0.2.8.7.4')
assert.equal(manifest.version, '0.2.8.7.4')
assert.match(read('README.md'), /\*\*Version:\*\* `0\.2\.8`/)
assert.match(read('src/build.ts'), /EXTENSION_VERSION = '0\.2\.8\.7\.4'/)
assert.match(read('src/build.ts'), /BUILD_ID = '20260924-0\.2\.8\.7\.4'/)

const authorityRoot = new URL('regex-packs/r45/', root)
const authorityManifest = json('regex-packs/r45/AUTHORITY-MANIFEST.json')
assert.equal(authorityManifest.relayProductVersion, '0.2.8')
const packFiles = readdirSync(authorityRoot).filter(name => /^Reverie-Surfaces-R4\.5-.*\.json$/.test(name))
assert.equal(packFiles.length, 16)
for (const filename of [
  'Reverie-Surfaces-R4.5-INLINE-GLASS.json',
  'Reverie-Surfaces-R4.5-COLLAPSIBLE-PLAIN-GLASS.json',
  'Reverie-Surfaces-R4.5-COLLAPSIBLE-SPARKLING-GLASS.json',
  'Reverie-Surfaces-R4.5-GLASS-BUTTON-GLASS.json',
]) assert.ok(packFiles.includes(filename), `${filename} independent Glass Mode authority missing`)
for (const filename of packFiles) {
  const pack = json(`regex-packs/r45/${filename}`)
  if (Object.prototype.hasOwnProperty.call(pack, 'relay_product_version')) assert.equal(pack.relay_product_version, '0.2.8', `${filename} product version`)
  for (const script of pack.scripts || []) {
    if (Object.prototype.hasOwnProperty.call(script, 'relay_product_version')) assert.equal(script.relay_product_version, '0.2.8', `${filename}/${script.script_id} product version`)
  }
}
for (const entry of authorityManifest.packs) {
  const bytes = readFileSync(new URL(`regex-packs/r45/${entry.filename}`, root))
  assert.equal(createHash('sha256').update(bytes).digest('hex').toUpperCase(), entry.outputSha256, `${basename(entry.filename)} output hash`)
}

const storage = new Map<string, unknown>()
;(globalThis as any).spindle = {
  on() {}, onFrontendMessage() {}, registerInterceptor() {}, registerMacro() {}, registerMessageContentProcessor() {}, sendToFrontend() {},
  permissions: { has: () => true }, log: { info() {}, warn() {}, error() {} }, toast: { info() {}, success() {}, warning() {}, error() {} },
  userStorage: {
    async getJson(path: string, { fallback }: any = {}) { return structuredClone(storage.get(path) ?? fallback ?? {}) },
    async setJson(path: string, value: unknown) { storage.set(path, structuredClone(value)) },
    async mkdir() {},
  },
}
const backend = await import('../src/backend')
const legacyKey = 'legacy-chat:legacy-message:0:legacy-request:hero'
const legacy = {
  schemaVersion: 34,
  revision: 7,
  slots: {
    [legacyKey]: {
      key: legacyKey,
      chatId: 'legacy-chat', messageId: 'legacy-message', swipeId: 0, requestId: 'legacy-request',
      target: 'character.hero', imageIntent: 'portrait', targetApp: 'custom', slot: 'hero', status: 'completed',
      originalSceneBrief: 'Historical portrait.', originalNegativePrompt: '', originalRequestXml: '<image_request id="legacy-request" target="character.hero" slot="hero"><scene_brief>Historical portrait.</scene_brief></image_request>',
      alt: 'Historical portrait', caption: '', count: 1, createdAt: 1, discoveredAt: 1, registeredAt: 1, updatedAt: 2, completedAt: 2,
      imageId: 'legacy-image', imageUrl: '/api/v1/image-gen/results/legacy-image', attempts: [], history: [],
    },
  },
  proseIllustrator: {
    settings: {},
    opportunities: {
      'legacy-opportunity': {
        opportunityId: 'legacy-opportunity', chatId: 'legacy-chat', messageId: 'legacy-message', swipeId: 0,
        plannerVersion: 'prose-opportunity-v1', status: 'proposed', title: 'Historical opportunity',
      },
    },
    plans: {}, records: {}, processedMessageKeys: {}, autoCounters: {}, frequencyDecisions: {}, activeOpportunityIdByChat: {}, activePlanIdByChat: {},
  },
}
const migrated = backend.migrateRelayStateSnapshot(legacy) as any
assert.equal(migrated.schemaVersion, 36)
assert.equal(migrated.revision, 7)
assert.equal(migrated.slots[legacyKey].status, 'completed')
assert.equal(migrated.slots[legacyKey].imageId, 'legacy-image')
assert.equal(migrated.slots[legacyKey].imageUrl, '/api/v1/image-gen/results/legacy-image')
assert.ok(migrated.stats.completedTotal >= 1, 'lifetime Completed count survives migration')
assert.equal(migrated.proseIllustrator.opportunities['legacy-opportunity'].plannerVersion, 'prose-opportunity-v1')
assert.ok(migrated.logs.some((row: any) => row.eventType === 'state_migrated'), 'schema 34 migration is recorded')

console.log('0.2.8.7.4 release smoke passed: version metadata aligned, authority hashes verified, and a 0.2.7.5-era schema-34 completed image/state snapshot migrated without losing historical media.')
