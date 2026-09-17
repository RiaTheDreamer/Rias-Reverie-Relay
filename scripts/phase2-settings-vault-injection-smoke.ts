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

draft = backend.applyRelaySettingsPatchToConfig(draft, { kind: 'narrative-enabled', enabledNames: ['Chaos Hooks'] })
assert(draft.narrativeDlcEnabled && draft.narrativeDlcUtilityNames.length === 1, 'Narrative Utility enable state must share the revisioned mutation path')

const exactOverride = 'CUSTOM PLOT CONTRACT\n[Plot_Sparks][Spark][Media]keep [literal] syntax[/Media][/Spark][/Plot_Sparks]'
draft = backend.applyRelaySettingsPatchToConfig(draft, { kind: 'narrative-override', utilityName: 'Chaos Hooks', content: exactOverride })
assert(draft.narrativeUtilityOverrides['Chaos Hooks'].content === exactOverride, 'Narrative Utility override must be stored verbatim')
const resolved = backend.buildResolvedNarrativeUtilityPrompt(draft)
assert(resolved.content.includes(exactOverride), 'automatic Narrative resolver must use the saved override')
assert((resolved.content.match(/CUSTOM PLOT CONTRACT/g) || []).length === 1, 'resolved Narrative bundle must contain one override copy')

draft = backend.applyRelaySettingsPatchToConfig(draft, { kind: 'narrative-override', utilityName: 'Chaos Hooks', content: null })
assert(!draft.narrativeUtilityOverrides['Chaos Hooks'], 'Reset to Default must clear, not copy, the override')

const revisionBeforeSurfacePreferences = draft.settingsRevision
draft = backend.applyRelaySettingsPatchToConfig(draft, {
  kind: 'surface-preferences', rendererMode: 'hybrid', defaultShellMode: 'sparkling', colorMode: 'primary', utilityInjectionEnabled: false,
})
assert(draft.settingsRevision === revisionBeforeSurfacePreferences + 1, 'Surface preferences must advance the shared settings revision')
assert(draft.surfaceRendererMode === 'hybrid' && draft.globalSurfaceStudio.rendererMode === 'hybrid', 'Surface renderer preference must persist to canonical config and studio state')
assert(draft.surfaceDefaultShellMode === 'sparkling' && draft.globalSurfaceStudio.defaultShellMode === 'sparkling', 'Surface presentation preference must persist to canonical config and studio state')
assert(draft.surfaceColorMode === 'primary' && draft.globalSurfaceStudio.colorMode === 'primary', 'Surface color preference must persist to canonical config and studio state')
assert(draft.surfaceUtilityInjectionEnabled === false && draft.globalSurfaceStudio.utilityInjectionEnabled === false, 'Surface injection preference must persist to canonical config and studio state')

const revisionBeforePhoneApps = draft.settingsRevision
draft = backend.applyRelaySettingsPatchToConfig(draft, { kind: 'character-phone-apps', defaultApps: ['messages', 'calendar', 'messages', 'invalid-app' as any] })
assert(draft.settingsRevision === revisionBeforePhoneApps + 1, 'Character Phone apps must advance the shared settings revision')
assert(JSON.stringify(draft.characterPhoneDefaultApps) === JSON.stringify(['messages', 'calendar']), 'Character Phone apps must persist through the revisioned canonical patch')

const frontend = readFileSync(new URL('../src/frontend.ts', import.meta.url), 'utf8')
const backendSource = readFileSync(new URL('../src/backend.ts', import.meta.url), 'utf8')
assert(frontend.includes('settingsPatchQueue') && frontend.includes('relay_settings_patch_result'), 'frontend must own an ordered optimistic settings draft and explicit acknowledgement')
assert(frontend.includes("kind: 'surface-preferences'") && frontend.includes("kind: 'character-phone-apps'"), 'Surface preferences and Character Phone apps must use the revisioned settings queue')
assert(frontend.includes('.indeterminate = categorySomeEnabled && !categoryEnabled'), 'Surface category must expose derived indeterminate state')
assert(frontend.includes('Narrative Utilities') && frontend.includes('Reset to Default') && frontend.includes('effectiveContent'), 'Injection tab must expose editable Narrative Utility records')
assert(frontend.includes('Save timed out — verify/retry') && frontend.includes('appearanceSaveWatchdogs'), 'Appearance save must have a finite acknowledgement watchdog')
assert(backendSource.includes("continuityVault: { ...state.continuityVault, history: [] }"), 'normal drawer state must not carry Appearance forensic history')
assert(backendSource.includes('persisted Appearance Memory could not be verified') && backendSource.includes('canonicalValues'), 'Appearance save must verify persisted canonical state before success')
assert((backendSource.match(/buildResolvedNarrativeUtilityPrompt\(/g) || []).length >= 4, 'automatic, macro, preview, and dry-run paths must share the canonical Narrative resolver')

console.log(`Phase 2 settings/vault/injection smoke passed: ${surfaces.length} rapid Surface mutations retained, category ${category} applied atomically, Narrative override resolved verbatim and reset cleanly.`)
