// @ts-nocheck -- Bun executes this integration smoke; the repo intentionally omits Node ambient types.
import { readFileSync } from 'node:fs'

const storage = new Map<string, unknown>()
;(globalThis as any).spindle = {
  registerMessageContentProcessor() {}, registerMacro() {}, on() {}, onFrontendMessage() {}, sendToFrontend() {},
  log: { info() {}, warn() {}, error() {} }, toast: { info() {}, success() {}, warning() {}, error() {} },
  userStorage: {
    async getJson(path: string, options: any = {}) { return storage.has(path) ? structuredClone(storage.get(path)) : {} },
    async setJson(path: string, value: unknown) { storage.set(path, structuredClone(value)) },
    async mkdir() {},
  },
}
const backend = await import('../src/backend')
const { parseImageRequests } = await import('../src/contracts')
const { xmlAuthoringInstructions: bracketImageControlInstructions } = await import('../src/xmlSurfaceFormat')

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

const userId = `phase2-${Date.now()}`
const initial = await backend.setConfig({
  settingsRevision: 0,
  narrativeDlcEnabled: false,
  narrativeDlcUtilityNames: [],
  narrativeUtilityOverrides: {},
}, userId)

const surfaces = Object.values(initial.globalSurfaceStudio.definitions)
  .filter(definition => definition.baseSurfaceId !== 'prose-illustration')
  .slice(0, 5)
assert(surfaces.length === 5, 'expected five canonical Surface definitions')

let draft = initial
for (const definition of surfaces) {
  draft = backend.applyRelaySettingsPatchToConfig(draft, {
    kind: 'surface-prompt-enabled',
    values: { [definition.surfaceId]: false },
  }, draft.settingsRevision, Date.now())
}
for (const definition of surfaces) {
  assert(draft.globalSurfaceStudio.definitions[definition.surfaceId].promptEnabled === false, 'rapid individual Surface changes must merge instead of reviving stale siblings')
}

const category = surfaces[0].promptCategory
const categoryValues = Object.fromEntries(Object.values(draft.globalSurfaceStudio.definitions)
  .filter(definition => definition.promptCategory === category)
  .map(definition => [definition.surfaceId, false]))
draft = backend.applyRelaySettingsPatchToConfig(draft, { kind: 'surface-prompt-enabled', categoryId: category, values: categoryValues })
assert(Object.keys(categoryValues).every(id => draft.globalSurfaceStudio.definitions[id].promptEnabled === false), 'category All must apply one atomic map')

draft = backend.applyRelaySettingsPatchToConfig(draft, { kind: 'narrative-enabled', enabledNames: ['Setting the Scene'] })
assert(draft.narrativeDlcEnabled && draft.narrativeDlcUtilityNames.length === 1, 'Narrative Utility enable state must share the revisioned mutation path')
assert(draft.narrativeUtilityImageEnabled['Setting the Scene'] !== false, 'existing users must keep images enabled by default')
draft = backend.applyRelaySettingsPatchToConfig(draft, { kind: 'narrative-image-enabled', utilityName: 'Setting the Scene', enabled: false })
assert(draft.narrativeUtilityImageEnabled['Setting the Scene'] === false, 'per-Utility image mode did not persist in the revisioned settings path')
assert(!/<image_request\b/i.test(backend.buildResolvedNarrativeUtilityPrompt(draft).content), 'Images Off still injected a world image request')
draft = backend.applyRelaySettingsPatchToConfig(draft, { kind: 'narrative-image-enabled', utilityName: 'Setting the Scene', enabled: true })
assert(!Object.hasOwn(draft.narrativeUtilityImageEnabled, 'Setting the Scene'), 'Images On should restore the default without retaining an obsolete flag')
const ownerDelimiters: Record<string, [string, string]> = {
  'Character Phone': ['[character_phone]', '[/character_phone]'],
  'Dramatic Cutaway': ['[dramatic_parallel]', '[/dramatic_parallel]'],
  'Plot Sparks': ['[Plot_Sparks]', '[/Plot_Sparks]'],
  'Scene Shift': ['[SCENE|Library|Night|Rain]', '[/SCENE]'],
  'Parallel Scene': ['[PARALLEL|Campus|Live]', '[/PARALLEL]'],
  'Cast Introduction': ['[NPC:MAJOR|Test]', '[/NPC]'],
  'Backstage Secrets': ['[SECRET|Test|Hidden|Test]', '[/SECRET]'],
  'Setting the Scene': ['[WORLD|Place|Library]', '[/WORLD]'],
  'Off-Stage': ['[[else security office]]', '[[/else]]'],
  'Character Dossier': ['[[npc Test|main]]', '[[/npc]]'],
  'Location File': ['[[place Library]]', '[[/place]]'],
  'In Another Life': ['[WHATIF|Alternate]', '[/WHATIF]'],
  'Archive Entry': ['[dossier_ui]', '[/dossier_ui]'],
}
for (const [name, [open, close]] of Object.entries(ownerDelimiters)) {
  const source = `${open}<image_request id="owned" target="custom.artifact-media" slot="owned"><scene_brief>Owned.</scene_brief></image_request>${close}<image_request id="outside" target="custom.artifact-media" slot="outside"><scene_brief>Outside.</scene_brief></image_request>`
  const requests = parseImageRequests(source)
  assert(requests.length === 2, `${name}: suppression fixture did not parse both requests`)
  const filtered = backend.suppressTextOnlyNarrativeRequests(source, requests, { [name]: false })
  assert(filtered.length === 1 && filtered[0].id === 'outside', `${name}: Images Off did not suppress only its own future request`)
  assert(backend.suppressTextOnlyNarrativeRequests(source, requests, {}) === requests, `${name}: Images On unexpectedly changed automatic requests`)
}

const exactOverride = 'CUSTOM WORLD CONTRACT\n[WORLD|Category|Location][world_media]<image_request id="world-custom" target="custom.artifact-media" slot="world-custom" aspect="16:9"><scene_brief>Custom world detail.</scene_brief></image_request>[/world_media][world_detail]Detail.[/world_detail][world_context][why_it_matters]Reason.[/why_it_matters][future_use]Use.[/future_use][/world_context][/WORLD]'
draft = backend.applyRelaySettingsPatchToConfig(draft, { kind: 'narrative-override', utilityName: 'Setting the Scene', content: exactOverride })
assert(draft.narrativeUtilityOverrides['Setting the Scene'].content === exactOverride, 'Narrative Utility override must be stored verbatim')
const resolved = backend.buildResolvedNarrativeUtilityPrompt(draft)
assert(resolved.content.includes(bracketImageControlInstructions(exactOverride)), 'automatic Narrative resolver must project the saved override into current grammar without overwriting storage')
assert((resolved.content.match(/CUSTOM WORLD CONTRACT/g) || []).length === 1, 'resolved Narrative bundle must contain one override copy')
assert(resolved.content.includes('SETTING THE SCENE STRUCTURAL LOCK'), 'World structural lock must survive a saved override')

draft = backend.applyRelaySettingsPatchToConfig(draft, { kind: 'narrative-override', utilityName: 'Setting the Scene', content: null })
assert(!draft.narrativeUtilityOverrides['Setting the Scene'], 'Reset to Default must clear, not copy, the override')

const revisionBeforeSurfacePreferences = draft.settingsRevision
draft = backend.applyRelaySettingsPatchToConfig(draft, {
  kind: 'surface-preferences', rendererMode: 'legacy-regex', defaultShellMode: 'sparkling', colorMode: 'primary', utilityInjectionEnabled: false,
})
assert(draft.settingsRevision === revisionBeforeSurfacePreferences + 1, 'Surface preferences must advance the shared settings revision')
assert(draft.surfaceRendererMode === 'legacy-regex' && draft.globalSurfaceStudio.rendererMode === 'legacy-regex', 'Surface renderer preference must persist to canonical config and studio state')
assert(draft.surfaceDefaultShellMode === 'sparkling' && draft.globalSurfaceStudio.defaultShellMode === 'sparkling', 'Surface presentation preference must persist to canonical config and studio state')
assert(draft.narrativeDlcVariant === 'sparkle-button', 'every shipped Surface must derive presentation from the same global preference')
draft = backend.applyRelaySettingsPatchToConfig(draft, { kind: 'surface-preferences', defaultShellMode: 'glass' }, draft.settingsRevision, 303)
assert(draft.surfaceDefaultShellMode === 'glass' && draft.globalSurfaceStudio.defaultShellMode === 'glass', 'Glass presentation preference must persist to canonical config and studio state')
assert(draft.narrativeDlcVariant === 'glass', 'all shipped Surfaces must derive standalone Glass from the same global preference')
assert(draft.surfaceColorMode === 'primary' && draft.globalSurfaceStudio.colorMode === 'primary', 'Surface color preference must persist to canonical config and studio state')
draft = backend.applyRelaySettingsPatchToConfig(draft, { kind: 'surface-preferences', defaultShellMode: 'plain-glass' }, draft.settingsRevision, 304)
assert(draft.surfaceDefaultShellMode === 'plain-glass' && draft.globalSurfaceStudio.defaultShellMode === 'plain-glass', 'Plain Glass must persist to canonical config and studio state')
assert(draft.narrativeDlcVariant === 'plain-glass', 'Core and Narrative surfaces must share the Plain Glass selection')
assert(draft.surfaceColorMode === 'primary', 'Plain Glass must not force Glass body colors')
draft = backend.applyRelaySettingsPatchToConfig(draft, { kind: 'surface-preferences', colorMode: 'glass' }, draft.settingsRevision, 304)
assert(draft.surfaceColorMode === 'glass' && draft.globalSurfaceStudio.colorMode === 'glass', 'Glass Mode color preference must persist independently from Glass Button presentation')
assert(draft.surfaceDefaultShellMode === 'plain-glass' && draft.narrativeDlcVariant === 'plain-glass', 'changing Glass Mode must not change the selected Plain Glass launcher presentation')
assert(draft.surfaceUtilityInjectionEnabled === false && draft.globalSurfaceStudio.utilityInjectionEnabled === false, 'Surface injection preference must persist to canonical config and studio state')

const revisionBeforePhoneApps = draft.settingsRevision
draft = backend.applyRelaySettingsPatchToConfig(draft, { kind: 'character-phone-apps', defaultApps: ['messages', 'calendar', 'messages', 'invalid-app' as any] })
assert(draft.settingsRevision === revisionBeforePhoneApps + 1, 'Character Phone apps must advance the shared settings revision')
assert(JSON.stringify(draft.characterPhoneDefaultApps) === JSON.stringify(['messages', 'calendar']), 'Character Phone apps must persist through the revisioned canonical patch')

const frontend = readFileSync(new URL('../src/frontend.ts', import.meta.url), 'utf8')
const backendSource = readFileSync(new URL('../src/backend.ts', import.meta.url), 'utf8')
assert(frontend.includes('settingsPatchQueue') && frontend.includes('relay_settings_patch_result'), 'frontend must own an ordered optimistic settings draft and explicit acknowledgement')
assert(frontend.includes("kind: 'surface-preferences'") && !frontend.includes('renderCharacterPhoneAppSettings'), 'active Surface preferences stay revisioned; retired phone controls stay removed')
assert(frontend.includes('.indeterminate = categorySomeEnabled && !categoryEnabled'), 'Surface category must expose derived indeterminate state')
assert(frontend.includes('Narrative Utilities') && frontend.includes('Reset to Default') && frontend.includes('effectiveContent'), 'Injection tab must expose editable Narrative Utility records')
assert(frontend.includes('Save timed out — verify/retry') && frontend.includes('appearanceSaveWatchdogs'), 'Appearance save must have a finite acknowledgement watchdog')
assert(backendSource.includes("continuityVault: { ...state.continuityVault, history: [] }"), 'normal drawer state must not carry Appearance forensic history')
assert(backendSource.includes('persisted Appearance Memory could not be verified') && backendSource.includes('canonicalValues'), 'Appearance save must verify persisted canonical state before success')
assert((backendSource.match(/buildResolvedNarrativeUtilityPrompt\(/g) || []).length >= 4, 'automatic, macro, preview, and dry-run paths must share the canonical Narrative resolver')

console.log(`Phase 2 settings/vault/injection smoke passed: ${surfaces.length} rapid Surface mutations retained, category ${category} applied atomically, Narrative override stored verbatim, image grammar projected for injection and reset cleanly.`)
