// @ts-nocheck -- deterministic offline Phase 5 integration gate.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  APPEARANCE_SIDECAR_REQUEST_TEMPLATE,
  APPEARANCE_SIDECAR_SYSTEM_PROMPT,
  RELAY_PLANNED_DIRECTOR_REQUEST_TEMPLATE,
  RELAY_PLANNED_DIRECTOR_SYSTEM_PROMPT,
  RELAY_PLANNED_REPAIR_PARSER_REQUEST_TEMPLATE,
  RELAY_PLANNED_REPAIR_PARSER_SYSTEM_PROMPT,
} from '../src/promptRegistryAssets028'
import { PROMPT_REGISTRY_DEFINITIONS } from '../src/protocols'
import { ingestAppearanceSidecarObservations, normalizeAppearanceSidecarOutput } from '../src/appearanceSidecar'
import { addAppearanceFact, allAppearanceFacts, appearanceMemoryView, emptyContinuityVault, mergeAppearancePromptFacts } from '../src/vault'

const storage = new Map<string, unknown>()
let parserOutput = ''
let parserCalls = 0
;(globalThis as any).spindle = {
  on() {}, onFrontendMessage() {}, registerInterceptor() {}, registerMacro() {}, registerMessageContentProcessor() {}, sendToFrontend() {},
  permissions: { has: () => true }, log: { info() {}, warn() {}, error() {} }, toast: { info() {}, success() {}, warning() {}, error() {} },
  userStorage: {
    async getJson(path: string, { fallback }: any = {}) { return structuredClone(storage.get(path) ?? fallback ?? {}) },
    async setJson(path: string, value: unknown) { storage.set(path, structuredClone(value)) },
    async mkdir() {},
  },
  chats: { async get() { return { character_id: 'alpha' } } },
  characters: { async get() { return { id: 'alpha', name: 'Alpha', description: 'black hair, brown eyes' } } },
  personas: { async getActive() { return null } }, chat: { async getMessages() { return [] } },
  connections: { async get(id: string) { if (id === 'missing-parser') throw new Error('Parser connection unavailable'); return { id, name: 'Offline Parser', provider: 'offline', model: 'offline-model' } } },
  generate: { async raw() { parserCalls += 1; return { content: parserOutput } } },
  imageGen: { async listConnections() { return [] }, async getProviders() { return [] }, async generate() { throw new Error('Image generation forbidden') } },
  images: { async list() { return [] } }, variables: { global: { async set() {} }, chat: { async set() {} } },
}

const backend = await import('../src/backend')
const assetRoot = new URL('../test-fixtures/prompt-registry-assets-0.2.8/', import.meta.url)
const authoredAssets = [
  ['Appearance-Sidecar-System-Prompt.txt', APPEARANCE_SIDECAR_SYSTEM_PROMPT],
  ['Appearance-Sidecar-Request-Template.txt', APPEARANCE_SIDECAR_REQUEST_TEMPLATE],
  ['Relay-Planned-Director-System-Prompt.txt', RELAY_PLANNED_DIRECTOR_SYSTEM_PROMPT],
  ['Relay-Planned-Director-Request-Template.txt', RELAY_PLANNED_DIRECTOR_REQUEST_TEMPLATE],
  ['Relay-Planned-Repair-Parser-System-Prompt.txt', RELAY_PLANNED_REPAIR_PARSER_SYSTEM_PROMPT],
  ['Relay-Planned-Repair-Parser-Request-Template.txt', RELAY_PLANNED_REPAIR_PARSER_REQUEST_TEMPLATE],
] as const
for (const [filename, compiled] of authoredAssets) assert.equal(compiled, readFileSync(new URL(filename, assetRoot), 'utf8'), `${filename} was not installed verbatim`)

const requiredIds = [
  'appearance.sidecar.system', 'appearance.sidecar.request',
  'relay-planned.director.system', 'relay-planned.director.request',
  'relay-planned.repair-parser.system', 'relay-planned.repair-parser.request',
]
for (const id of requiredIds) assert(PROMPT_REGISTRY_DEFINITIONS.some(definition => definition.id === id), `missing Prompt Registry entry ${id}`)
assert(!PROMPT_REGISTRY_DEFINITIONS.some(definition => definition.id === 'sidecar.appearance.system' || definition.id === 'sidecar.appearance.request'), 'retired Appearance prompts must not remain as editable duplicate workflows')

let config = await backend.getConfig('phase5')
const override = `${APPEARANCE_SIDECAR_REQUEST_TEMPLATE}\nCustom user instruction.`
config = backend.applyRelaySettingsPatchToConfig(config, { kind: 'prompt-registry-override', promptId: 'appearance.sidecar.request', content: override, version: 1 })
assert.equal(config.proseIllustratorSettings.promptRegistry['appearance.sidecar.request'], override, 'Prompt Registry override did not enter the atomic settings path')
config = backend.applyRelaySettingsPatchToConfig(config, { kind: 'prompt-registry-override', promptId: 'appearance.sidecar.request', content: null, version: 1 })
assert(!Object.prototype.hasOwnProperty.call(config.proseIllustratorSettings.promptRegistry, 'appearance.sidecar.request'), 'Reset to Default must delete the Prompt Registry override')
assert.throws(() => backend.applyRelaySettingsPatchToConfig(config, { kind: 'prompt-registry-override', promptId: 'appearance.sidecar.request', content: '{{inventedVariable}}', version: 1 }), /Unsupported template variable/, 'unknown template variables must be rejected')

const vault = emptyContinuityVault('phase5-appearance')
const observations = normalizeAppearanceSidecarOutput(JSON.stringify({ subjects: [{
  name: 'Dandelion', role: 'character',
  canonical: {
    species: { booruTags: ['golden_retriever', 'cream_fur', 'floppy_ears'], visualPhrases: ['large young dog'] },
    hair: { booruTags: [], visualPhrases: [] }, eyes: { booruTags: ['brown_eyes'], visualPhrases: [] }, skinFur: { booruTags: [], visualPhrases: [] },
    body: { booruTags: [], visualPhrases: [] }, permanentTraits: { booruTags: [], visualPhrases: [] },
  },
  current: {
    attire: { booruTags: ['red_collar', 'leather_shoes'], visualPhrases: [] }, hairstyle: { booruTags: [], visualPhrases: [] }, temporaryTraits: { booruTags: [], visualPhrases: [] },
    injuries: { booruTags: [], visualPhrases: ['medical compression tape wrapped around lower ribs', 'athletic compression tape around ribs'] }, intimateState: { booruTags: [], visualPhrases: [] },
  },
}] }))
const ingested = ingestAppearanceSidecarObservations(vault, observations, { chatId: vault.chatId, messageId: 'terminal-response', swipeId: 0, activeCharacter: { id: 'dandelion', name: 'Dandelion', aliases: [] }, activePersona: null })
assert(ingested.acceptedFacts >= 7, 'structured Sidecar domains were not ingested as compact facts')
const dandelion = appearanceMemoryView(vault, 'dandelion')
for (const value of ['golden_retriever', 'cream_fur', 'floppy_ears', 'brown_eyes']) assert(dandelion.stableAppearance.includes(value), `missing compact Dandelion value ${value}`)
assert(dandelion.stableAppearance.includes('large young dog') && !dandelion.stableAppearance.includes('large_young_dog'), `unknown visual phrase was converted into a fake underscore tag: ${dandelion.stableAppearance}`)
assert.equal(allAppearanceFacts(vault).filter(fact => fact.value === 'bandaged_ribs' && fact.status === 'active').length, 1, 'rib-wrap synonyms did not collapse to one active current fact')

addAppearanceFact(vault, { layer: 'current-appearance', characterId: 'dandelion', category: 'temporary-clothing-state', value: 'barefoot', sourceType: 'appearance-sidecar', semanticAuthority: 'appearance-sidecar' })
const providerPrompt = mergeAppearancePromptFacts('medium shot, Dandelion, golden_retriever, leather_shoes, walking on wet pavement', allAppearanceFacts(vault), 'Dandelion wears leather shoes while walking on wet pavement.')
assert.equal((providerPrompt.match(/golden_retriever/g) || []).length, 1, 'canonical identity was appended twice')
assert.equal((providerPrompt.match(/leather_shoes/g) || []).length, 1, 'current attire was appended twice')
assert(!/barefoot|Appearance Memory continuity|Appearance booru tags|Scene Appearance|Sidecar/i.test(providerPrompt), `provider prompt leaked stale or diagnostic Appearance text: ${providerPrompt}`)

addAppearanceFact(vault, { layer: 'visual-identity', characterId: 'dandelion', category: 'eye-color', value: 'blue_eyes', sourceType: 'manual', userConfirmed: true, pinned: true })
ingestAppearanceSidecarObservations(vault, normalizeAppearanceSidecarOutput(JSON.stringify({ observations: [{ subject: { name: 'Dandelion', aliases: [], role: 'character', trustworthy: true }, confidence: .99, facts: [{ layer: 'visual-identity', category: 'eye-color', value: 'brown_eyes', provenance: 'current-assistant-message' }] }] })), { chatId: vault.chatId, messageId: 'auto-eye', swipeId: 0, activeCharacter: { id: 'dandelion', name: 'Dandelion', aliases: [] }, activePersona: null })
assert(appearanceMemoryView(vault, 'dandelion').stableAppearance.includes('blue_eyes'), 'automatic Sidecar scan replaced a manually pinned domain')

const job: any = {
  requestId: 'model-placed-phase5', chatId: 'phase5-parser', messageId: 'm1', swipeId: 0, target: 'prose.illustration', slots: ['illustration'], count: 1,
  aspect: '4:3', cast: 'char', alt: 'Alpha with letter', caption: '', promptSource: 'visual_prompt', originalNegativePrompt: '', originalRequestXml: '',
  originalSceneBrief: 'Alpha is sitting by the window, holding a red letter, wearing leather shoes.',
  prosePromptComposition: { namedSubjects: ['Alpha'], expectedPeopleCount: 1, peoplePolicy: 'required', perspectiveMode: 'scene-snapshot' },
}
let parserConfig = await backend.setConfig({ parserConnectionId: 'mock-parser', parserRetries: 0, proseIllustratorSettings: backend.defaultProseIllustratorSettings() }, 'phase5')
parserOutput = JSON.stringify({ prompt: 'medium shot, Alpha sitting by the window, holding a red letter, leather shoes', negativeAdditions: '' })
const safe = await backend.parseSlotPrompt(job, 'illustration', [], 0, parserConfig, 'phase5', {})
assert(safe.parserUsed && safe.promptPipeline.parserDecision === 'Used — Model-Placed constrained normalization', 'configured Model-Placed Parser was not used or reported truthfully')
assert(parserCalls > 0, 'configured Parser was never invoked')
parserOutput = JSON.stringify({ prompt: 'close portrait of Alpha', negativeAdditions: '' })
const rejected = await backend.parseSlotPrompt({ ...job, requestId: 'model-placed-drift' }, 'illustration', [], 0, parserConfig, 'phase5', {})
assert(rejected.promptPipeline.parserFallbackUsed && rejected.promptPipeline.parserDecision?.startsWith('Rejected — Authoritative fallback'), 'drifting Parser output did not fall back safely')
assert(/sitting|holding|leather shoes/i.test(rejected.prompt), 'authoritative scene semantics were lost during Parser fallback')
parserConfig = await backend.setConfig({ parserConnectionId: null }, 'phase5')
const disabled = await backend.parseSlotPrompt({ ...job, requestId: 'model-placed-disabled' }, 'illustration', [], 0, parserConfig, 'phase5', {})
assert(!disabled.parserUsed && disabled.promptPipeline.parserDecision === 'Skipped — No Parser connection configured', 'disabled Parser skip reason is not precise')
parserConfig = await backend.setConfig({ parserConnectionId: 'missing-parser' }, 'phase5')
const unavailable = await backend.parseSlotPrompt({ ...job, requestId: 'model-placed-unavailable' }, 'illustration', [], 0, parserConfig, 'phase5', {})
assert(!unavailable.parserUsed && unavailable.promptPipeline.parserDecision === 'Skipped — Parser connection unavailable', 'unavailable Parser did not retain the authoritative direct path')

const frontend = readFileSync(new URL('../src/frontend.ts', import.meta.url), 'utf8')
for (const label of ['User Override', 'Reset to Default', 'Preview Compiled Prompt', 'Supported variables:', 'estimatedInputTokens', 'pipeline?.parserDecision']) assert(frontend.includes(label), `Prompt Registry / Parser UI missing ${label}`)
console.log('Phase 5 appearance/parser/registry smoke passed: six verbatim assets, atomic overrides, compact Appearance projection, constrained Model-Placed Parser use, safe fallback, and exact diagnostics.')
