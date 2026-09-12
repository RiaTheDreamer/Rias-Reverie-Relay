// @ts-nocheck -- local source/runtime contract gate for the main cleanup pass.
import { readFileSync, readdirSync } from 'node:fs'
import { r45SupplementalSurfaceDefinitions } from '../src/r45SurfaceCatalog'
import { shippedSurfaceDefinitions } from '../src/shippedSurfaceDefinitions'
import { buildNarrativeUtilityPrompt } from '../src/narrativeDlcRuntime'
import { narrativeUtilityNames } from '../src/narrativeRegexAssets'
import { bracketExampleFromXml } from '../src/bracketSurfaceAuthoring'

function assert(value: unknown, reason: string): asserts value { if (!value) throw new Error(reason) }

const definitions = [...shippedSurfaceDefinitions(1), ...r45SupplementalSurfaceDefinitions(1)]
assert(definitions.length === 46, `expected 46 active Surface definitions, received ${definitions.length}`)
for (const definition of definitions) {
  assert(definition.promptModule.includes('Author this Surface in bracket-native syntax, not XML.'), `${definition.baseSurfaceId}: active model prompt is not bracket-native`)
  assert(definition.promptModule.includes(`BRACKET ROOT: [${definition.canonicalOuterWrapper}]`), `${definition.baseSurfaceId}: active bracket root is missing`)
  assert(!/Output raw XML only/i.test(definition.promptModule), `${definition.baseSurfaceId}: active model prompt still requests raw XML`)
  assert(!/\[media\]/i.test(bracketExampleFromXml(definition.sampleXml)), `${definition.baseSurfaceId}: canonical example invented a generic media wrapper`)
}

const narrative = buildNarrativeUtilityPrompt(narrativeUtilityNames()).content
for (const visibleName of ['Plot Sparks', 'Backstage Secrets', 'Off-Stage', 'Parallel Scene', 'Scene Shift', 'Cast Introduction', 'Setting the Scene', 'Character Dossier', 'Location File', 'In Another Life', 'Archive Entry']) {
  assert(narrative.includes(visibleName), `${visibleName}: model-facing Narrative label is missing`)
}
const castSheet = definitions.find(definition => definition.baseSurfaceId === 'character-profile')
assert(castSheet?.promptModule.includes('SURFACE: CAST SHEET'), 'Cast Sheet accepted Surface name is missing from the active contract')
for (const filename of readdirSync('regex-packs/r45').filter(name => /^Reverie-Surfaces-R4\.5-(?:BRACKET|COLLAPSIBLE|INLINE).*\.json$/.test(name))) {
  const source = readFileSync(`regex-packs/r45/${filename}`, 'utf8')
  assert(!source.includes('Character Profile') && source.includes('Cast Sheet'), `${filename}: Character Profile Regex presentation was not renamed directly to Cast Sheet`)
  const pack = JSON.parse(source)
  assert(!pack.scripts.some((script: { disabled?: boolean; name?: string }) => !script.disabled && script.name?.includes('Disabled Compatibility')), `${filename}: an enabled compatibility rule claims to be disabled`)
}
for (const oldName of ['Character Profile', 'Chaos Hooks', 'Knowledge Veil', 'Beyond the Frame', 'Parallel Current', 'Scene Compass', 'Cast Arrival', 'World Texture', 'Character File', 'Place File', 'Unwalked Path', 'Unified Archive Generator']) {
  assert(!narrative.includes(oldName), `${oldName}: old Narrative label leaked into the injected prompt`)
}

const protocols = readFileSync('src/protocols.ts', 'utf8')
assert(!/Output raw XML only/i.test(protocols), 'protocol source still tells the model to output raw XML')
assert(protocols.includes('Direct lens gaze is allowed only when') && protocols.includes('Do not compose a centered glamour portrait') && protocols.includes('Use direct camera gaze only when the emotional beat is an authored'), 'anti-glamour prompt rules or deliberate direct-gaze exception regressed')

const manifest = JSON.parse(readFileSync('spindle.json', 'utf8'))
assert(!manifest.permissions.includes('context_handler') && !manifest.permissions.includes('macro_interceptor'), 'unused broad prompt permissions must not be added')

const backend = readFileSync('src/backend.ts', 'utf8')
assert(backend.includes('getDrawerTabs?.({ userId })') && backend.includes('openDrawerTab(lorebookTab.id'), 'Lorebook export does not open the discoverable host drawer')
assert(backend.includes('`${builtInDefault}${r45BracketSpecificGuidance(r45)}`') && !backend.includes("if (builtInDefault && /bracket-native syntax/i.test(builtInDefault)) return builtInDefault"), 'built-in bracket prompts must include their Surface-specific rules')

const plotSparks = readFileSync('regex-packs/narrative-final/Reverie-Plot-Sparks-BULLETPROOF-V7.json', 'utf8')
assert(!plotSparks.includes('--lumiverse-primary:#8b5cf6') && plotSparks.includes('--ch-accent:var(--lumiverse-primary,#8b5cf6)'), 'Plot Sparks must inherit the host theme without overwriting it')

console.log('main cleanup smoke passed: 46 bracket-native prompts, theater labels, gaze rules, Lorebook navigation, and minimal permissions verified.')
