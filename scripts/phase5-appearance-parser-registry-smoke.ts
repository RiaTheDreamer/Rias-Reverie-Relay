// @ts-nocheck -- deterministic offline Phase 5 integration gate.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import {
  APPEARANCE_SIDECAR_REQUEST_TEMPLATE,
  APPEARANCE_SIDECAR_SYSTEM_PROMPT,
  RELAY_PLANNED_DIRECTOR_REQUEST_TEMPLATE,
  RELAY_PLANNED_DIRECTOR_SYSTEM_PROMPT,
  RELAY_PLANNED_REPAIR_PARSER_REQUEST_TEMPLATE,
  RELAY_PLANNED_REPAIR_PARSER_SYSTEM_PROMPT,
} from '../src/promptRegistryAssets028'
import { PROMPT_REGISTRY_DEFINITIONS } from '../src/protocols'
import { RELAY_PLANNED_V2 } from '../src/relayPlannedV2'
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
// Frozen normalized digests retain exact prompt regression coverage without shipping duplicate fixture prose.
const authoredDigests: Record<string, string> = {
  'Appearance-Sidecar-System-Prompt.txt': 'fb5f37b39fe846b9c9c48278ed4856ecce2058020c4702861769c4225709ffec',
  'Appearance-Sidecar-Request-Template.txt': 'ad9a15f260448b7473c9bcac51b949e0dab3842aac4dff61fafa0ec455c64b7b',
  'Relay-Planned-Director-System-Prompt.txt': 'bc9cfca63d5abeeccf6871203c8cf53cf34956a21889a91c506dac817fa5e1ac',
  'Relay-Planned-Director-Request-Template.txt': '5b8e9f3655366399e86638c3f468f669a5b54a0d2fcd59ce5e5aa7ab4c55e972',
  'Relay-Planned-Repair-Parser-System-Prompt.txt': '7e1951f28d06b8820720addf069b232f4edc8596d7a573641aa00a05d5767111',
  'Relay-Planned-Repair-Parser-Request-Template.txt': 'dc2be4b0f3131840ac4d7e3d46451d6f22c2dc7e0dd6281cfab7fad893797247',
}
const authoredAssets = [
  ['Appearance-Sidecar-System-Prompt.txt', APPEARANCE_SIDECAR_SYSTEM_PROMPT],
  ['Appearance-Sidecar-Request-Template.txt', APPEARANCE_SIDECAR_REQUEST_TEMPLATE],
  ['Relay-Planned-Director-System-Prompt.txt', RELAY_PLANNED_DIRECTOR_SYSTEM_PROMPT],
  ['Relay-Planned-Director-Request-Template.txt', RELAY_PLANNED_DIRECTOR_REQUEST_TEMPLATE],
  ['Relay-Planned-Repair-Parser-System-Prompt.txt', RELAY_PLANNED_REPAIR_PARSER_SYSTEM_PROMPT],
  ['Relay-Planned-Repair-Parser-Request-Template.txt', RELAY_PLANNED_REPAIR_PARSER_REQUEST_TEMPLATE],
] as const
for (const [filename, compiled] of authoredAssets) assert.equal(createHash('sha256').update(compiled.replace(/\r\n/g, '\n')).digest('hex'), authoredDigests[filename], `${filename} was not installed verbatim`)

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
assert(!safe.parserUsed && safe.promptPipeline.parserDecision === 'Skipped — Story Model visual_prompt passed through; use Reparse for Parser rewriting', 'ordinary Model Planned dispatch did not preserve the authored visual_prompt')
assert.equal(parserCalls, 0, 'ordinary Model Planned dispatch invoked a configured Parser')
assert(/sitting by the window|holding a red letter|leather shoes/i.test(safe.prompt), 'direct Model Planned path lost authored scene details')
assert(!safe.promptPipeline.parserFallbackUsed, 'direct Model Planned path was misreported as a Parser fallback')
const callsBeforeReparse = parserCalls
const explicitReparse = await backend.parseSlotPrompt({ ...job, requestId: 'model-planned-explicit-reparse' }, 'illustration', [], 0, parserConfig, 'phase5', {}, false, true)
assert(explicitReparse.parserUsed && parserCalls > callsBeforeReparse, 'explicit Model Planned Reparse did not invoke the Parser Model')
parserOutput = JSON.stringify({ prompt: 'close portrait of Alpha', negativeAdditions: '' })
const callsBeforeOrdinaryDispatch = parserCalls
const rejected = await backend.parseSlotPrompt({ ...job, requestId: 'model-placed-drift' }, 'illustration', [], 0, parserConfig, 'phase5', {})
assert.equal(parserCalls, callsBeforeOrdinaryDispatch, 'ordinary Model Planned dispatch let a drifting Parser rewrite the authored prompt')
assert(!rejected.promptPipeline.parserFallbackUsed && /sitting by the window|holding a red letter|leather shoes/i.test(rejected.prompt), 'ordinary Model Planned dispatch did not retain its authored scene after a drifting Parser response')
const explicitDrift = await backend.parseSlotPrompt({ ...job, requestId: 'model-planned-explicit-drift' }, 'illustration', [], 0, parserConfig, 'phase5', {}, false, true)
assert(explicitDrift.promptPipeline.parserFallbackUsed && /Relay continued with the authoritative visual brief/i.test(explicitDrift.promptPipeline.warnings.map(item => item.message).join(' ')), 'invalid Model Planned reparse did not fall back to Relay scene shaping')
assert(/sitting|holding|leather shoes/i.test(explicitDrift.prompt), 'Relay fallback lost the authored Model Planned scene')
parserConfig = await backend.setConfig({ parserConnectionId: null }, 'phase5')
const disabled = await backend.parseSlotPrompt({ ...job, requestId: 'model-placed-disabled' }, 'illustration', [], 0, parserConfig, 'phase5', {})
assert(!disabled.parserUsed && disabled.promptPipeline.parserDecision === 'Skipped — Story Model visual_prompt passed through; use Reparse for Parser rewriting', 'disabled Parser did not retain the authored direct path')
const explicitNoParser = await backend.parseSlotPrompt({ ...job, requestId: 'model-planned-explicit-no-parser' }, 'illustration', [], 0, parserConfig, 'phase5', {}, false, true)
assert(!explicitNoParser.parserUsed && explicitNoParser.promptPipeline.parserFallbackUsed && explicitNoParser.promptPipeline.parserDecision.startsWith('Relay fallback — Parser connection unavailable'), 'Model Planned Reparse without a Parser connection did not continue through Relay scene shaping')
assert(/sitting|holding|leather shoes/i.test(explicitNoParser.prompt), 'no-Parser Relay fallback lost the authored Model Planned scene')
parserConfig = await backend.setConfig({ parserConnectionId: 'missing-parser' }, 'phase5')
const unavailable = await backend.parseSlotPrompt({ ...job, requestId: 'model-placed-unavailable' }, 'illustration', [], 0, parserConfig, 'phase5', {})
assert(!unavailable.parserUsed && unavailable.promptPipeline.parserDecision === 'Skipped — Story Model visual_prompt passed through; use Reparse for Parser rewriting', 'unavailable Parser did not retain the authoritative direct path')
await assert.rejects(
  backend.parseSlotPrompt({ ...job, requestId: 'model-planned-empty-authored-prompt', originalSceneBrief: '' }, 'illustration', [], 0, parserConfig, 'phase5', {}),
  /missing its authored <visual_prompt>/,
  'an empty Model Planned prompt must fail closed instead of asking Parser to invent it',
)

const distractingProfiles = [{ id: 'cinematic-scene', name: 'Test Cinema', promptAdditions: 'TEST PROFILE STYLE CUE', framingGuidance: 'TEST PROFILE CAMERA CUE' }]
for (const mode of ['inline-protocol', 'relay-planned']) {
  for (const defaultPromptProfileId of ['auto', 'cinematic-scene']) {
    const storyPrompt = backend.resolveIllustratorStoryPrompt(
      { ...backend.defaultProseIllustratorSettings(), mode, defaultPromptProfileId },
      [],
      undefined,
      distractingProfiles,
      'auto',
    )
    assert(!storyPrompt.includes('STORY-MODEL IMAGE PROMPT PROFILE') && !storyPrompt.includes('Automatic profile cues'), `${mode}/${defaultPromptProfileId}: Story Model received duplicated profile guidance`)
    assert(!storyPrompt.includes('TEST PROFILE STYLE CUE') && !storyPrompt.includes('TEST PROFILE CAMERA CUE'), `${mode}/${defaultPromptProfileId}: Story Model received profile content that Relay should apply downstream`)
    assert(storyPrompt.includes('Relay resolves and applies the selected profile after authorship'), `${mode}/${defaultPromptProfileId}: runtime did not clarify downstream profile ownership`)
  }
}

const relayPlannerCallsBeforeCompile = parserCalls
const relayPlannedPrepared = await backend.parseSlotPrompt({
  ...job,
  requestId: 'relay-planned-profile-once',
  promptSource: 'structured',
  promptProfileId: 'cinematic-scene',
  originalSceneBrief: 'Alpha offers a red letter beside the station window.',
  composedPositivePrompt: 'medium two-shot, Alpha offers a red letter beside the station window',
  composedNegativePrompt: '',
  prosePromptComposition: {
    namedSubjects: ['Alpha'], expectedPeopleCount: 1, peoplePolicy: 'required',
    continuityFactIdsUsed: [], referenceAssetIdsUsed: [], locationReferenceAssetIdsUsed: [],
    warnings: [], rawOutput: { plannerVersion: RELAY_PLANNED_V2 },
  },
}, 'illustration', [], 0, parserConfig, 'phase5', {})
assert.equal(relayPlannedPrepared.parserUsed, false, 'Relay-Planned 2.0 local compiler unexpectedly invoked a second Parser pass')
assert.equal(parserCalls, relayPlannerCallsBeforeCompile, 'Relay-Planned 2.0 local compiler unexpectedly spent a Parser model call')
assert.equal(relayPlannedPrepared.promptPipeline.promptProfile?.selectedProfileId, 'cinematic-scene', 'Relay-Planned profile was not resolved downstream')
assert.equal((relayPlannedPrepared.prompt.match(/cinematic narrative still/g) || []).length, 1, 'Relay-Planned selected profile was applied more or less than once')

const frontend = readFileSync(new URL('../src/frontend.ts', import.meta.url), 'utf8')
for (const label of ['User Override', 'Reset to Default', 'Preview Compiled Prompt', 'Supported variables:', 'estimatedInputTokens', 'pipeline?.parserDecision']) assert(frontend.includes(label), `Prompt Registry / Parser UI missing ${label}`)
console.log('Phase 5 appearance/parser/registry smoke passed: Appearance projection, one-pass Model Planned dispatch, explicit-only Parser rewriting, downstream single profile application, safe reparse fallback, and exact diagnostics.')
