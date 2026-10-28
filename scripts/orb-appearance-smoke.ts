// @ts-nocheck -- real config normalization/storage with a minimal offline host.
import assert from 'node:assert/strict'
import { normalizeOrbSizePx } from '../src/orbAppearance'
const stored = new Map<string, unknown>()
;(globalThis as any).spindle = {
  on() {}, onFrontendMessage() {}, registerInterceptor() {}, registerMacro() {}, registerMessageContentProcessor() {},
  sendToFrontend() {}, permissions: { has: () => true }, log: { info() {}, warn() {}, error() {} },
  userStorage: {
    async getJson(path: string, options: any) { return structuredClone(stored.get(`${options.userId}:${path}`) ?? options.fallback) },
    async setJson(path: string, value: unknown, options: any) { stored.set(`${options.userId}:${path}`, structuredClone(value)) },
    async mkdir() {},
  },
  generate: { raw() { throw new Error('Appearance controls must not call a model') } },
  imageGen: { generate() { throw new Error('Appearance controls must not generate images') } },
}
const backend = await import('../src/backend')
for (const [name, expected] of [['small', 44], ['medium', 52], ['large', 62]] as const) {
  stored.set(`legacy-${name}:config.json`, { orbSize: name })
  assert.equal((await backend.getConfig(`legacy-${name}`)).orbSizePx, expected)
}
for (const value of [32, 53, 96]) {
  const config = await backend.setConfig({ orbSizePx: value, orbDesign: 'star' }, 'slider')
  assert.equal(config.orbSizePx, value)
  assert.equal(config.orbDesign, 'star')
  assert.equal((stored.get('slider:config.json') as any).orbSizePx, value)
}
assert.equal((await backend.getConfig('other-user')).orbSizePx, 52, 'Size must remain user-scoped')
assert.equal(normalizeOrbSizePx(9999), 96)
assert.equal(normalizeOrbSizePx(-100), 32)
assert.equal(normalizeOrbSizePx(Number.NaN, 'large'), 62)
assert.equal(normalizeOrbSizePx(Infinity), 52)
assert.equal(normalizeOrbSizePx('80', 'small'), 44)
console.log('Orb appearance: saved star/pixel size, legacy size migration, numeric bounds and user isolation passed. No providers.')
