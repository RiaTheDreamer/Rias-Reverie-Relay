// @ts-nocheck -- deterministic source/runtime prompt-compaction regression gate.
import type { CustomSurfaceStudioState } from '../src/contracts'
import { bracketSurfacePromptModule, compactBracketSchemaFromXml } from '../src/bracketSurfaceAuthoring'
import { measureModelMessages } from '../src/contextBudget'
import { REVERIE_SURFACE_PROTOCOL, REVERIE_SURFACE_UTILITY_TEMPLATE } from '../src/protocols'
import { r45SupplementalSurfaceDefinitions } from '../src/r45SurfaceCatalog'
import { R45_ACTIVE_SURFACE_IDS, r45UtilitySpecificGuidance } from '../src/r45UtilityContracts'
import { shippedSurfaceDefinitions, surfaceTriggerGuidance } from '../src/shippedSurfaceDefinitions'

;(globalThis as any).spindle = {
  on() {}, onFrontendMessage() {}, registerInterceptor() {}, registerMacro() {}, registerMessageContentProcessor() {}, sendToFrontend() {},
  permissions: { has: () => true }, log: { info() {}, warn() {}, error() {} },
  userStorage: { async getJson(_path: string, { fallback }: any = {}) { return structuredClone(fallback ?? {}) }, async setJson() {}, async mkdir() {} },
}
const { buildEnabledSurfaceUtility } = await import('../src/backend')

function assert(value: unknown, reason: string): asserts value { if (!value) throw new Error(reason) }

const separator = '\n\n---\n\n'
const definitions = [...shippedSurfaceDefinitions(1), ...r45SupplementalSurfaceDefinitions(1)]
const byId = new Map(definitions.map(definition => [definition.baseSurfaceId, definition]))

assert(definitions.length === 46, `expected 46 built-in definitions, received ${definitions.length}`)
assert(byId.size === 46, `expected 46 unique baseSurfaceId values, received ${byId.size}`)
assert(R45_ACTIVE_SURFACE_IDS.every(id => byId.has(id)), 'active R4.5 inventory is not fully represented')
assert(definitions.every(definition => definition.builtIn && definition.promptEnabled === true), 'every built-in Surface must remain prompt-enabled by default')

const legacyModules = definitions.map(definition => [
  surfaceTriggerGuidance(definition.baseSurfaceId, definition.displayName),
  bracketSurfacePromptModule({
    label: definition.displayName,
    root: definition.canonicalOuterWrapper,
    sampleXml: definition.sampleXml,
    target: definition.targetId,
    aspect: definition.supportedAspectRatios[0],
  }),
  `R4.5 SURFACE-SPECIFIC RULES\n${r45UtilitySpecificGuidance(definition.baseSurfaceId)}`,
].filter(Boolean).join('\n\n'))
const legacyPrompt = legacyModules.join(separator)
const compactModules = definitions.map(definition => definition.promptModule)
const rootRegistry = definitions.map(definition => `[${definition.canonicalOuterWrapper}]`).join(' ')
const compactUtility = REVERIE_SURFACE_UTILITY_TEMPLATE
  .replace('{{reverie_enabled_surface_modules}}', compactModules.join(separator))
  .replace('{{reverie_enabled_surface_roots}}', rootRegistry)
const compactPrompt = `${REVERIE_SURFACE_PROTOCOL}\n\n${compactUtility}`
const legacyMeasurement = measureModelMessages('surface-prompt-legacy-equivalent', [{ role: 'system', content: legacyPrompt }])
const compactMeasurement = measureModelMessages('surface-prompt-compact', [{ role: 'system', content: compactPrompt }])

assert(compactMeasurement.chars <= legacyMeasurement.chars * 0.5, `compact Surface prompt must be <= 50% of legacy-equivalent chars (${compactMeasurement.chars}/${legacyMeasurement.chars})`)
assert(compactMeasurement.estimatedInputTokens <= 15_000, `compact Surface prompt exceeds 15,000 estimated tokens: ${compactMeasurement.estimatedInputTokens}`)
assert(compactModules.every(module => module.includes('FORMAT: compact-v1')), 'every built-in module must use compact-v1')
assert(compactModules.every(module => !module.includes('CANONICAL BRACKET EXAMPLE')), 'compact built-ins must not embed canonical full examples')
assert(compactUtility.includes('STRICT ENABLED ROOT REGISTRY'), 'strict enabled-root registry is missing')
assert(compactUtility.includes('APP SURFACE SHAPE FIREBREAK'), 'app Surface shape firebreak is missing')
for (const forbidden of ['[igfeed]', '[igstory]', '[igpost]', '[tw_profile]', '[reddit_thread]', '[reddit_comment]', '[discord_message]']) assert(compactUtility.includes(forbidden), `app Surface firebreak is missing ${forbidden}`)
for (const definition of definitions) assert(compactUtility.includes(`[${definition.canonicalOuterWrapper}]`), `${definition.baseSurfaceId}: enabled-root registry entry is missing`)

for (const fixture of ['North Pier', 'Field Team', 'Character A', 'Weekend Survivors', 'Midnight Signal', 'Archive A']) {
  assert(!compactPrompt.includes(fixture), `fixture content leaked into compact prompt: ${fixture}`)
}
for (const repeatedLesson of ['No attributes in opening bracket tags', 'Author this Surface in bracket-native syntax, not XML']) {
  assert(!compactPrompt.includes(repeatedLesson), `old per-module generic lesson leaked into compact prompt: ${repeatedLesson}`)
}

for (const definition of definitions) {
  const module = definition.promptModule
  assert(module.includes(`ROOT: [${definition.canonicalOuterWrapper}]`), `${definition.baseSurfaceId}: canonical ROOT is missing`)
  const schema = module.match(/\nSCHEMA\n([\s\S]*?)\n\nMEDIA\n/)?.[1] || ''
  assert(schema.startsWith(`[${definition.canonicalOuterWrapper}]`), `${definition.baseSurfaceId}: compact SCHEMA root is wrong`)
  assert(schema === compactBracketSchemaFromXml(definition.sampleXml), `${definition.baseSurfaceId}: SCHEMA drifted from its canonical structure or media owner positions`)
  const requiredMedia = Number((definition.validationRules.find(rule => /^required-media:\d+$/i.test(rule)) || '').split(':')[1] || 0)
  if (requiredMedia > 0) assert(/<image_request\b/.test(schema) && /<scene_brief>…<\/scene_brief>/.test(schema), `${definition.baseSurfaceId}: canonical Relay XML media control is missing from SCHEMA`)
}

for (const id of ['court-transcript', 'mission-board']) {
  const module = byId.get(id)?.promptModule || ''
  assert(module.includes('\nMEDIA\nnone'), `${id}: explicit text-only MEDIA summary is missing`)
  assert(!module.includes('<image_request') && !module.includes('IMAGE REQUEST CONTRACT'), `${id}: text-only prompt received synthetic media guidance`)
}

const moduleFor = (id: string) => byId.get(id)?.promptModule || ''
const preserves = (id: string, fragments: string[]) => {
  const module = moduleFor(id)
  for (const fragment of fragments) assert(module.includes(fragment), `${id}: missing critical contract fragment: ${fragment}`)
}

preserves('smartphone', ['TRIGGER POLICY — SMARTPHONE', '[messages]', '[s_recv]', '[s_sent]', '[s_img]', 'smartphone.message-image', 'Images are allowed only inside a message row'])
preserves('relationship-map', ['TRIGGER POLICY — RELATIONSHIP MAP', 'focal + meaningful connection A + meaningful connection B', 'relationship connections, and insight fields'])
preserves('instagram', ['ROOT: [ig_app]', 'instagram.single', 'instagram.carousel', 'count 2–4', 'Never use instagram.slide or resolved media markup'])
preserves('twitter', ['[for_you]', '[following]', '[thread]', '[trends]', 'nested comments', 'Never author resolved media markup'])
preserves('kakao', ['[participants]', '[messages]', '[k_part]', '[k_msg]', '[k_reply]', '[k_react]', '[k_file]', '[k_system]', '[k_typing]', '[k_img]', 'target="kakao.image"', 'aspect="4:3"'])
preserves('album-cover', ['A real album/release title is required', '[title]', '[artist]', '[release]', '[artwork]'])
preserves('character-profile', ['mandatory [portrait] region', 'never use [media]', 'XML image_request', 'target="custom.artifact-media"', 'aspect="3:4"', 'viewpoint-safe established information'])
preserves('location-share', ['[lc_map]', 'XML image_request', 'target="custom.artifact-media"', 'aspect="4:3"', 'no people, portrait photography, generated labels, or UI'])
preserves('discord-server', ['stable reusable 1:1 XML image_request id/slot', '[server_avatar_msg]', '[server_media]'])
preserves('photo-booth-strip', ['exact four [booth_frame] children', 'one coherent booth session'])
preserves('cctv-evidence', ['exactly three [cv_feed] records', 'fixed surveillance view'])
preserves('instagram-stories', ['exactly three [story] records', '9:16 [story_media] request'])

const customDefinition = {
  ...definitions[0],
  surfaceId: 'custom-budget-smoke',
  baseSurfaceId: 'custom-budget-smoke',
  presetName: 'Custom Budget Smoke',
  displayName: 'Custom Budget Smoke',
  canonicalOuterWrapper: 'custom_budget_smoke',
  targetId: 'custom.artifact-media',
  supportedAspectRatios: ['4:3'],
  validationRules: ['balanced-wrapper', 'required-media:1', 'maximum-media:1'],
  sampleXml: '<custom_budget_smoke><photo></photo><caption>Example.</caption></custom_budget_smoke>',
  builtIn: false,
  promptEnabled: true,
  promptModule: 'CUSTOM AUTHORED SURFACE\nROOT: [custom_budget_smoke]',
  updatedAt: 9,
}
const customStudio: CustomSurfaceStudioState = {
  definitions: { [customDefinition.surfaceId]: customDefinition },
  activePresetIds: { [customDefinition.baseSurfaceId]: customDefinition.surfaceId },
  collectionPresets: {},
  rendererMode: 'relay',
  defaultShellMode: 'plain',
  colorMode: 'realistic',
  utilityInjectionEnabled: true,
  utilityInjectionPosition: 'after-chat-history',
  utilityTemplate: REVERIE_SURFACE_UTILITY_TEMPLATE,
  validationErrors: {},
  lastInjectedModuleIds: [],
  lastInjectionAt: 0,
  lastInjectionSource: 'none',
  lastInjectionPosition: 'none',
  lastInjectionSummary: '',
  updatedAt: 9,
}
const customPrompt = buildEnabledSurfaceUtility(customStudio).content
assert(customPrompt.includes('CUSTOM AUTHORED SURFACE'), 'custom authored module was replaced by the built-in compact path')
assert(customPrompt.includes('IMAGE REQUEST CONTRACT') && customPrompt.includes('<image_request'), 'required-media custom module lost compatibility image guidance')
assert(!customPrompt.includes('FORMAT: compact-v1'), 'custom authored module was incorrectly forced through compact-v1')
assert(customPrompt.includes('STRICT ENABLED ROOT REGISTRY') && customPrompt.includes('[custom_budget_smoke]'), 'custom authored Surface root is missing from the strict registry')

const legacyCustomStudio = { ...customStudio, utilityTemplate: '{{reverie_enabled_surface_modules}}' }
const legacyCustomPrompt = buildEnabledSurfaceUtility(legacyCustomStudio).content
assert(legacyCustomPrompt.includes('STRICT ENABLED ROOT REGISTRY') && legacyCustomPrompt.includes('[custom_budget_smoke]'), 'persisted legacy utility template bypassed the strict root boundary')

const reduction = (1 - compactMeasurement.chars / legacyMeasurement.chars) * 100
console.log(JSON.stringify({
  surfaceInventory: definitions.length,
  promptEnabled: definitions.filter(definition => definition.promptEnabled).length,
  legacyChars: legacyMeasurement.chars,
  legacyEstimatedTokens: legacyMeasurement.estimatedInputTokens,
  compactChars: compactMeasurement.chars,
  compactEstimatedTokens: compactMeasurement.estimatedInputTokens,
  reductionPercent: Number(reduction.toFixed(2)),
}, null, 2))
console.log('surface prompt budget smoke passed')
