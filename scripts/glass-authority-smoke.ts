import {
  NARRATIVE_REGEX_VARIANTS,
  NARRATIVE_UTILITY_FORMAT_CONTRACTS,
  narrativeRegexPack,
  narrativeRegexScripts,
} from '../src/narrativeRegexAssets'
import {
  R45_ACTIVE_ROOTS,
  r45BracketSurfaceAuthorityPack,
  r45LegacyXmlSurfaceAuthorityPack,
  r45SurfaceAuthorityPack,
} from '../src/r45SurfaceAuthority'
import { narrativeVariantForSurfaceShellMode, surfaceShellModeForNarrativeVariant } from '../src/surfacePresentation'

function assert(value: unknown, reason: string): asserts value {
  if (!value) throw new Error(reason)
}

const GLASS_SOURCE = 'data-reverie-glass-source='
const GLASS_ROOT = 'data-reverie-glass-authority='
const GLASS_VISUAL = /<style\b/i

assert(R45_ACTIVE_ROOTS.length === 46, 'the 138-script authority path must retain 46 shipped Surfaces')
assert(Object.keys(NARRATIVE_UTILITY_FORMAT_CONTRACTS).length === 13, 'the standalone authority path must retain 13 shipped Surfaces')
assert(R45_ACTIVE_ROOTS.length + Object.keys(NARRATIVE_UTILITY_FORMAT_CONTRACTS).length === 59, 'Glass coverage must total all 59 shipped Surfaces')
assert(NARRATIVE_REGEX_VARIANTS.includes('glass'), 'Glass must be first-class in the presentation variant inventory')
assert(narrativeVariantForSurfaceShellMode('glass') === 'glass' && surfaceShellModeForNarrativeVariant('glass') === 'glass', 'the one global Glass preference must map both directions')

const sparkleR45 = {
  realistic: r45LegacyXmlSurfaceAuthorityPack('sparkling', 'realistic'),
  primary: r45LegacyXmlSurfaceAuthorityPack('sparkling', 'primary'),
}

for (const color of ['realistic', 'primary'] as const) {
  const legacy = r45LegacyXmlSurfaceAuthorityPack('glass', color)
  const current = r45SurfaceAuthorityPack('glass', color)
  assert(legacy.scripts.length === 138 && current.scripts.length === 138, `Glass/${color}: both complete authorities must contain 138 scripts`)
  assert(current.scripts.every(script => script.disabled !== true), `Glass/${color}: authority contains a disabled script`)
  const visual = legacy.scripts.filter(script => GLASS_VISUAL.test(script.replace_string))
  assert(visual.length === 98, `Glass/${color}: expected 98 independently inspectable visual replacement bodies, found ${visual.length}`)
  assert(visual.filter(script => script.replace_string.includes(GLASS_ROOT)).length > 70, `Glass/${color}: complete Surface roots are not marked as Glass authority`)
  for (const script of visual) {
    assert(script.replace_string.includes(GLASS_SOURCE), `Glass/${color}/${script.script_id}: replacement is not self-contained Glass source`)
    assert(script.replace_string.includes('prefers-reduced-motion:reduce'), `Glass/${color}/${script.script_id}: reduced-motion contract missing`)
    const sourceIndex = legacy.scripts.indexOf(script)
    assert(script.replace_string !== sparkleR45[color].scripts[sourceIndex]?.replace_string, `Glass/${color}/${script.script_id}: silently reused the Sparkling body`)
  }
}

const bracketGlass = r45BracketSurfaceAuthorityPack('glass', 'realistic')
assert(bracketGlass.scripts.length === 138, 'Glass bracket-native authority must contain 138 scripts')
assert(bracketGlass.scripts.filter(script => GLASS_VISUAL.test(script.replace_string)).length === 98, 'Glass bracket-native authority must retain all visual bodies')
assert(bracketGlass.scripts.filter(script => GLASS_VISUAL.test(script.replace_string)).every(script => script.replace_string.includes('r45-bracket-glass')), 'Glass bracket-native replacements must identify their dedicated authority')

const narrativeGlass = narrativeRegexPack('glass')
const activeNarrativeGlass = narrativeRegexScripts('glass')
const narrativeSparkle = narrativeRegexPack('sparkle-button')
assert(narrativeGlass.scripts.length === 95, 'standalone Glass presentation source must contain its 93 base scripts plus Plot Sparks and Dramatic Cutaway')
assert(activeNarrativeGlass.length === 56, 'standalone Glass presentation must install the complete 56-script active authority')
assert(narrativeGlass.metadata?.standalone_glass_authority === true, 'standalone Glass authority metadata missing')
for (const id of ['ria_plot_sparks_og_sparkle_tabs_bulletproof_v7', 'ria_dramatic_cutaway_lumiverse_native_bulletproof_v8']) {
  assert(narrativeGlass.scripts.some(script => script.script_id === id), `standalone Glass source omitted ${id}`)
}
const narrativeVisual = narrativeGlass.scripts.filter(script => script.disabled !== true && GLASS_VISUAL.test(script.replace_string))
assert(narrativeVisual.length > 10, 'standalone Glass source has no complete visual body inventory')
for (const script of narrativeVisual) {
  assert(script.replace_string.includes(GLASS_SOURCE), `standalone Glass/${script.script_id}: replacement is not self-contained Glass source`)
  const sparkling = narrativeSparkle.scripts.find(candidate => candidate.script_id === script.script_id)
  if (sparkling) assert(script.replace_string !== sparkling.replace_string, `standalone Glass/${script.script_id}: silently reused the Sparkling body`)
}
assert(!activeNarrativeGlass.some(script => script.replace_string.includes('data-reverie-surface-presentation-contract="global"')), 'Glass must not use the runtime launcher adapter')
const phonePin = narrativeGlass.scripts.find(script => script.script_id === 'rrcp_final_presentation_pin')
const phoneShell = narrativeGlass.scripts.find(script => script.script_id === 'rrpp_proto_shell_v31')
assert(phonePin?.replace_string.includes('[cp_presentation]glass[/cp_presentation]'), 'Character Phone Glass presentation pin missing')
assert(phoneShell?.find_regex.includes('sparkling|plain|glass') && phoneShell.replace_string.includes('rrcp-presentation-glass'), 'Character Phone Glass matcher/shell authority missing')

console.log(`Glass authority smoke passed: ${R45_ACTIVE_ROOTS.length} + ${Object.keys(NARRATIVE_UTILITY_FORMAT_CONTRACTS).length} = 59 Surfaces, R4.5 138/138/138, standalone active ${activeNarrativeGlass.length}, no Sparkling runtime fallback.`)
