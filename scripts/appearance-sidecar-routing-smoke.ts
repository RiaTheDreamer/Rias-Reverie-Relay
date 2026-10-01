// @ts-nocheck -- offline routing regression; no provider calls are permitted.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

;(globalThis as any).spindle = {
  on() {}, onFrontendMessage() {}, registerInterceptor() {}, registerMacro() {}, registerMessageContentProcessor() {}, sendToFrontend() {},
  permissions: { has: () => true }, log: { info() {}, warn() {}, error() {} },
  userStorage: { async getJson(_path: string, { fallback }: any) { return structuredClone(fallback) }, async setJson() {}, async mkdir() {} },
  chats: { async get() { return null } }, characters: { async get() { return null } }, personas: { async get() { return null }, async getActive() { return null } },
  chat: { async getMessages() { return [] } }, connections: { async get() { throw new Error('Provider access forbidden in routing smoke') } },
  generate: { async raw() { throw new Error('Provider access forbidden in routing smoke') } }, imageGen: new Proxy({}, { get() { throw new Error('Image access forbidden in routing smoke') } }),
}

const backend = await import('../src/backend')
const { DEFAULT_PROMPT_REGISTRY, PROMPT_REGISTRY_DEFINITIONS } = await import('../src/protocols')
const { normalizeAppearanceSidecarOutput } = await import('../src/appearanceSidecar')
const frontend = readFileSync('src/frontend.ts', 'utf8')
const backendSource = readFileSync('src/backend.ts', 'utf8')
const { SETTING_HELP } = await import('../src/uxCopy')

const baseConfig = {
  parserConnectionId: 'parser-connection', parserModel: 'parser-model', parserParameters: { temperature: 0.2 },
  appearanceSidecarConnectionId: null, appearanceSidecarModel: '', appearanceSidecarParameters: {},
}
const globalSettings = {
  useGlobalAppearanceSidecar: true, appearanceSidecarConnectionId: null, appearanceSidecarModel: '', appearanceSidecarParameters: {},
}

assert.deepEqual(backend.resolveAppearanceSidecarRouting(baseConfig, globalSettings), {
  sidecarConnectionId: 'parser-connection', sidecarModel: 'parser-model', sidecarParameters: { temperature: 0.2 },
}, 'blank global Sidecar routing must inherit the Relay Parser')

const explicitGlobal = backend.resolveAppearanceSidecarRouting({
  ...baseConfig, appearanceSidecarConnectionId: 'A', appearanceSidecarModel: 'B', appearanceSidecarParameters: { temperature: 0.6 },
}, globalSettings)
assert.equal(explicitGlobal.sidecarConnectionId, 'A', 'Connection A did not reach backend routing')
assert.equal(explicitGlobal.sidecarModel, 'B', 'Model B did not reach backend routing')
assert.deepEqual(explicitGlobal.sidecarParameters, { temperature: 0.6 })

const explicitConnectionDefault = backend.resolveAppearanceSidecarRouting({
  ...baseConfig, appearanceSidecarConnectionId: 'A', appearanceSidecarModel: '',
}, globalSettings)
assert.equal(explicitConnectionDefault.sidecarConnectionId, 'A')
assert.equal(explicitConnectionDefault.sidecarModel, '', 'blank explicit model must defer to Connection A, not inherit another connection’s parser model')

const illustratorOverride = backend.resolveAppearanceSidecarRouting(baseConfig, {
  useGlobalAppearanceSidecar: false, appearanceSidecarConnectionId: 'A', appearanceSidecarModel: 'B', appearanceSidecarParameters: { top_p: 0.8 },
})
assert.equal(illustratorOverride.sidecarConnectionId, 'A')
assert.equal(illustratorOverride.sidecarModel, 'B')
assert.deepEqual(illustratorOverride.sidecarParameters, { top_p: 0.8 })

assert(/appearanceSidecarModelField\(\s*'Global Appearance Sidecar Model'/.test(frontend), 'global Sidecar model selector is missing')
assert(/appearanceSidecarModelField\(\s*'Appearance Sidecar Model'/.test(frontend), 'Illustrator Sidecar model selector is missing')
assert(frontend.includes("value => patchConfig({ appearanceSidecarModel: value })"), 'global model choice must send appearanceSidecarModel')
assert(frontend.includes("value => patchProseSettings({ appearanceSidecarModel: value })"), 'Illustrator model choice must send appearanceSidecarModel')
for (const label of ['Appearance Sidecar Source', 'Global Appearance Sidecar Connection', 'Global Appearance Sidecar Model', 'Global Appearance Sidecar Parameters', 'Appearance Sidecar Connection', 'Appearance Sidecar Model']) {
  assert(SETTING_HELP[label]?.length > 70, `${label} needs dedicated tooltip copy`)
}

const requestTemplate = DEFAULT_PROMPT_REGISTRY['appearance.sidecar.request']
const systemTemplate = DEFAULT_PROMPT_REGISTRY['appearance.sidecar.system']
assert(requestTemplate.includes('first completed response in a new chat') && requestTemplate.includes('subject.trustworthy=true'), 'Sidecar request must discover named people from the new-chat baseline')
assert(requestTemplate.includes('"trustworthy": false'), 'NPC trust must be an explicit conservative part of the response schema')
assert(systemTemplate.includes('do not require it to recur first'), 'named NPC discovery must not demand a second appearance before first-time memory capture')
assert.equal(PROMPT_REGISTRY_DEFINITIONS.find(row => row.id === 'appearance.sidecar.request')?.version, 2, 'Appearance Sidecar request contract version was not advanced')
const trustedNpc = normalizeAppearanceSidecarOutput(JSON.stringify({ subjects: [{
  name: 'Nina Park', role: 'npc', trustworthy: true,
  canonical: { hair: { booruTags: [], visualPhrases: ['short silver hair'] } }, current: {},
}] }))
assert.equal(trustedNpc[0]?.subject.role, 'npc')
assert.equal(trustedNpc[0]?.subject.trustworthy, true, 'explicitly trusted named NPC must survive legacy subjects-schema normalization')
const untrustedNpc = normalizeAppearanceSidecarOutput(JSON.stringify({ subjects: [{
  name: 'Mira Vale', role: 'npc', trustworthy: false,
  canonical: { hair: { booruTags: [], visualPhrases: ['pink hair'] } }, current: {},
}] }))
assert.equal(untrustedNpc[0]?.subject.trustworthy, false, 'NPC trust must not be inferred from a name or visual phrase alone')

const generationEnded = backendSource.slice(backendSource.indexOf('async function handleGenerationEnded'), backendSource.indexOf('async function recordLifecycleEvent'))
assert(generationEnded.includes("reason: 'generation-ended'") && generationEnded.includes('ensureAppearanceReadyForTurn'), 'Appearance Sidecar must run on each completed assistant response, including the first response in a new chat')
assert(backendSource.includes("state.continuityVault.appearanceSidecar.processedTurnKeys[turnKey]"), 'per-turn Sidecar idempotency must prevent lifecycle event fan-out from duplicating calls')

console.log('Appearance Sidecar connection/model routing smoke ok')
