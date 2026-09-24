import {
  NARRATIVE_REGEX_VARIANTS,
  NARRATIVE_BLOCK_SPACING_STYLE,
  NARRATIVE_UTILITY_FORMAT_CONTRACTS,
  narrativeRegexPack,
  narrativeRegexScripts,
  renderNarrativeRegex,
} from '../src/narrativeRegexAssets'
import {
  R45_ACTIVE_ROOTS,
  r45BracketSurfaceAuthorityPack,
  r45LegacyXmlSurfaceAuthorityPack,
  r45SurfaceAuthorityPack,
} from '../src/r45SurfaceAuthority'
import { narrativeGlassButtonPresentationCss, narrativeVariantForSurfaceShellMode, surfaceShellModeForNarrativeVariant } from '../src/surfacePresentation'

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
assert(NARRATIVE_BLOCK_SPACING_STYLE.includes('{margin:6px auto!important}'), 'Narrative compact launchers must preserve one compact, uniform gutter between adjacent Surface cards')
const mountedGlassRules = narrativeGlassButtonPresentationCss()
assert(!mountedGlassRules.includes('<style'), 'mounted Glass authority must be raw CSS, not a nested style tag')
for (const selector of ['.r65.r65>summary.r65-launch', '.ra66.ra66>summary.ra66-launch', '.rrcp-wrap.rrcp-wrap>.rrcp-launch', '.ch-og.ch-og>summary.dg-compact-launch', '.dg-dramatic-cutaway.dg-dramatic-cutaway>summary.dg-compact-launch']) {
  assert(mountedGlassRules.includes(selector), `mounted Glass authority omitted ${selector}`)
}
assert(mountedGlassRules.includes('.rrcp-wrap .rrcp-launch-toggle{position:absolute!important'), 'mounted Glass authority must hide only the Character Phone state input')
assert(mountedGlassRules.includes('.dg-dramatic-cutaway.dg-dramatic-cutaway>summary.dg-compact-launch::after{content:none!important'), 'mounted Glass authority must remove inherited Dramatic Cutaway sheen layers')
assert(mountedGlassRules.includes('.rr-narrative-glass-sparks i:nth-child(n+9){display:none!important}'), 'mounted Glass authority must hide historical static sparkle nodes')
assert(mountedGlassRules.includes('.ch-og.ch-og>summary.dg-compact-launch>.ch-launch-emoji') && mountedGlassRules.includes('.dg-dramatic-cutaway.dg-dramatic-cutaway>summary.dg-compact-launch>.dg-unified-emoji'), 'mounted Glass authority must remove the Plot Sparks and Dramatic Cutaway launcher emoji')
assert(mountedGlassRules.includes('.bf-particles-summary{display:none!important}') && mountedGlassRules.includes('width:2.05px!important;height:2.05px!important'), 'mounted Glass authority must replace duplicate Cutaway particles with the shared layered sparkle field')
assert(mountedGlassRules.includes('@keyframes rrNarrativeGlassSpark') && mountedGlassRules.includes('scale(.72)') && mountedGlassRules.includes('width:1.8px!important;height:1.8px!important') && mountedGlassRules.includes('margin:6px auto!important') && mountedGlassRules.includes('border:1px solid color-mix(in srgb,var(--lumiverse-primary,#ff70bd) 7%,transparent)'), 'mounted Glass authority must own compact launcher spacing, visible shared particle motion, and its quieter edge inside every shadow root')
const frontendSource = await (globalThis as any).Bun.file(new URL('../src/frontend.ts', import.meta.url)).text()
assert(frontendSource.includes('ensureMountedNarrativePresentationStyle(document)') && frontendSource.includes('narrativeGlassButtonPresentationCss()'), 'existing shadow-mounted Narrative cards must receive the current Glass authority at runtime')

for (const color of ['realistic', 'primary'] as const) {
  const legacy = r45LegacyXmlSurfaceAuthorityPack('glass', color)
  const current = r45SurfaceAuthorityPack('glass', color)
  assert(legacy.scripts.length === 138 && current.scripts.length === 138, `Glass Button/${color}: both complete authorities must contain 138 scripts`)
  assert(current.scripts.every(script => script.disabled !== true), `Glass Button/${color}: authority contains a disabled script`)
  const buttonBodies = legacy.scripts.filter(script => script.replace_string.includes('data-reverie-glass-button='))
  assert(buttonBodies.length >= 40, `Glass Button/${color}: complete launcher replacements are missing`)
  assert(buttonBodies.every(script => !script.replace_string.includes(GLASS_SOURCE)), `Glass Button/${color}: launcher choice must not force Glass body color`)
  assert(buttonBodies.every(script => script.replace_string.includes('prefers-reduced-motion:reduce')), `Glass Button/${color}: reduced-motion launcher contract missing`)
}

for (const presentation of ['inline', 'plain', 'sparkling', 'glass'] as const) {
  const legacy = r45LegacyXmlSurfaceAuthorityPack(presentation, 'glass')
  const current = r45SurfaceAuthorityPack(presentation, 'glass')
  assert(legacy.scripts.length === 138 && current.scripts.length === 138, `${presentation}/Glass Mode: both complete authorities must contain 138 scripts`)
  const visual = legacy.scripts.filter(script => GLASS_VISUAL.test(script.replace_string))
  assert(visual.length > 90, `${presentation}/Glass Mode: independently inspectable visual bodies are missing`)
  assert(visual.filter(script => script.replace_string.includes(GLASS_ROOT)).length > 70, `${presentation}/Glass Mode: complete Surface roots are not marked as Glass authority`)
  assert(visual.every(script => script.replace_string.includes(GLASS_SOURCE)), `${presentation}/Glass Mode: replacement is not self-contained Glass source`)
  if (presentation === 'glass') assert(visual.some(script => script.replace_string.includes('data-reverie-glass-button=')), 'Glass Button + Glass Mode must preserve both independent contracts')
}

const glassPhone = r45LegacyXmlSurfaceAuthorityPack('glass', 'glass').scripts.find(script => script.name?.includes('Full Real Phone Shell'))
assert(glassPhone, 'Glass Smartphone source is missing')
assert(glassPhone.replace_string.includes('data-reverie-glass-smartphone-contrast="1"'), 'Glass Smartphone must carry its dedicated readable bubble contract')
assert(glassPhone.replace_string.includes('.rpx-msg-recv .rpx-bubble') && glassPhone.replace_string.includes('.rpx-msg-sent .rpx-bubble'), 'Glass Smartphone must keep distinct readable received and sent bubbles')
assert(glassPhone.replace_string.lastIndexOf('data-reverie-glass-button-source="1"') > glassPhone.replace_string.indexOf('data-reverie-glass-button="1"'), 'Glass Button source must be appended after authored launcher CSS so the visual and hit-target contract wins')

const bracketGlass = r45BracketSurfaceAuthorityPack('glass', 'realistic')
assert(bracketGlass.scripts.length === 138, 'Glass bracket-native authority must contain 138 scripts')
assert(bracketGlass.scripts.filter(script => GLASS_VISUAL.test(script.replace_string)).length > 90, 'Glass Button bracket-native authority must retain all visual bodies')
const bracketGlassButtons = bracketGlass.scripts.filter(script => script.replace_string.includes('data-reverie-glass-button="1"'))
assert(bracketGlassButtons.length >= 40 && bracketGlassButtons.every(script => script.replace_string.includes('r45-bracket-glass')), 'Glass Button bracket-native launcher replacements must identify their dedicated authority')

const narrativeGlass = narrativeRegexPack('glass')
const activeNarrativeGlass = narrativeRegexScripts('glass', 'glass')
const activeNarrativeGlassButton = narrativeRegexScripts('glass', 'realistic')
const narrativeSparkle = narrativeRegexPack('sparkle-button')
assert(narrativeGlass.scripts.length === 95, 'standalone Glass presentation source must contain its 93 base scripts plus Plot Sparks and Dramatic Cutaway')
assert(activeNarrativeGlass.length === 56, 'standalone Glass presentation must install the complete 56-script active authority')
assert(activeNarrativeGlassButton.length === 56, 'standalone Glass Button must install the complete 56-script active authority')
assert(activeNarrativeGlassButton.some(script => script.replace_string.includes('data-reverie-narrative-glass-button-source="1"')), 'Glass Button with a normal body must use its dedicated generated shell authority')
assert(!activeNarrativeGlassButton.some(script => script.replace_string.includes('data-reverie-glass-authority="narrative-glass"')), 'Glass Button must not force the Glass body authority when Color Mode is normal')
assert(activeNarrativeGlass.some(script => script.replace_string.includes('data-reverie-narrative-glass-button-runtime="1"')), 'Glass Button + Glass Mode must adapt the complete Glass body with a trailing Glass Button shell')
for (const selector of ['.r65.r65>summary.r65-launch', '.ra66.ra66>summary.ra66-launch', '.rrcp-wrap.rrcp-wrap>.rrcp-launch', '.ch-og.ch-og>summary.dg-compact-launch', '.dg-dramatic-cutaway.dg-dramatic-cutaway>summary.dg-compact-launch']) {
  assert(activeNarrativeGlass.some(script => script.replace_string.includes(selector)), `Glass Button + Glass Mode must target the visible ${selector} launcher, not an internal control`)
}
assert(activeNarrativeGlass.some(script => script.replace_string.includes('.rrcp-wrap .rrcp-launch-toggle{position:absolute!important;inline-size:1px!important')), 'Character Phone Glass Button must preserve the hidden state control while styling its visible label launcher')
assert(activeNarrativeGlass.every(script => !script.replace_string.includes('nth-child(n+9){animation:none!important')), 'Glass Button must not reintroduce static white sparkle nodes')
for (const [root, selector] of [
  ['r65', '.r65.r65>summary.r65-launch'],
  ['ra66', '.ra66.ra66>summary.ra66-launch'],
  ['rrcp-wrap', '.rrcp-wrap.rrcp-wrap>.rrcp-launch'],
  ['ch-og', '.ch-og.ch-og>summary.dg-compact-launch'],
  ['dg-dramatic-cutaway', '.dg-dramatic-cutaway.dg-dramatic-cutaway>summary.dg-compact-launch'],
] as const) {
  const claimed = activeNarrativeGlass.filter(script => new RegExp(`class="[^"]*\\b${root}\\b`, 'i').test(script.replace_string) && script.replace_string.includes('data-reverie-narrative-glass-button="1"'))
  assert(claimed.length > 0, `Glass Button + Glass Mode lost the ${root} surface family`)
  assert(claimed.every(script => script.replace_string.includes(selector)), `Glass Button + Glass Mode left a ${root} launcher on legacy opaque styling`)
}
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
const narrativeGlassLaunchers = narrativeVisual.filter(script => /class="[^"]*(?:r65-launch|ra66-launch|rrcp-launch|dg-compact-launch)\b/i.test(script.replace_string))
assert(narrativeGlassLaunchers.length === 16, `standalone Glass launcher inventory changed: expected 16, found ${narrativeGlassLaunchers.length}`)
for (const script of narrativeGlassLaunchers) {
  const sparkfield = /<(?:span|div)\b[^>]*class="[^"]*\brr-narrative-glass-sparks\b[^"]*"[^>]*>([\s\S]*?)<\/(?:span|div)>/i.exec(script.replace_string)
  assert(sparkfield, `standalone Glass/${script.script_id}: Narrative launcher did not receive the shared App/UI sparkle field`)
  assert((sparkfield[1].match(/<i><\/i>/g) || []).length === 8, `standalone Glass/${script.script_id}: Narrative launcher must use only the eight shared moving micro-sparkles`)
  assert(script.replace_string.includes('width:1.8px!important;height:1.8px!important'), `standalone Glass/${script.script_id}: Narrative particles do not retain the deliberately visible micro-sparkle sizing`)
  assert(script.replace_string.includes('box-shadow:0 0 4px color-mix(in srgb,var(--lumiverse-primary,#ff70bd) 38%,transparent)'), `standalone Glass/${script.script_id}: Narrative particles do not retain the shared layered Glass glow`)
  assert(script.replace_string.includes('display:block!important'), `standalone Glass/${script.script_id}: mobile rules may still hide Narrative micro-sparkles`)
}
assert(!activeNarrativeGlass.some(script => script.replace_string.includes('data-reverie-surface-presentation-contract="global"')), 'Glass Button must not use the generic runtime launcher adapter')
const phonePin = narrativeGlass.scripts.find(script => script.script_id === 'rrcp_final_presentation_pin')
const phoneShell = narrativeGlass.scripts.find(script => script.script_id === 'rrpp_proto_shell_v31')
const plotSparks = narrativeGlass.scripts.find(script => script.script_id === 'ria_plot_sparks_og_sparkle_tabs_bulletproof_v7')
const parallelScene = narrativeGlass.scripts.find(script => script.script_id === 'reverie_parallel_tracker_images_v1')
assert(phonePin?.replace_string.includes('[cp_presentation]glass[/cp_presentation]'), 'Character Phone Glass presentation pin missing')
assert(phoneShell?.find_regex.includes('sparkling|plain|glass') && phoneShell.replace_string.includes('rrcp-presentation-glass'), 'Character Phone Glass matcher/shell authority missing')
assert(phoneShell?.replace_string.includes('.rrcp-page-body') && phoneShell.replace_string.includes('color:var(--text)!important'), 'Character Phone Glass contrast contract missing')
assert(phoneShell?.replace_string.includes('--rrcp-glass-readable-text') && phoneShell.replace_string.includes('.rrcp-msg-self .rrcp-msg-bubble') && phoneShell.replace_string.includes('.rrcp-msg-other .rrcp-msg-bubble'), 'Character Phone Glass must define distinct readable self and other bubble surfaces')
assert(phoneShell?.replace_string.includes('background:color-mix(in srgb,#2563eb 74%,var(--rr-glass-deep) 26%)!important') && phoneShell.replace_string.includes('background:color-mix(in srgb,var(--rr-glass-deep) 90%,var(--lumiverse-bg-elevated,#181522) 10%)!important'), 'Character Phone Glass bubble surfaces must be opaque enough for contrast instead of the generic 8% transparent conversion')
assert(phoneShell?.replace_string.includes('.rrcp-msg-bubble :where(p,span,b,strong,em,a,small,time){color:inherit!important;opacity:1!important}'), 'Character Phone Glass must protect nested bubble text from host or inherited color overrides')
assert(plotSparks?.replace_string.includes('.ch-og .ch-panel') && plotSparks.replace_string.includes('data-reverie-glass-authority="narrative-glass"'), 'Plot Sparks must carry complete Glass body authority')
assert(parallelScene?.replace_string.includes('width:1px!important;height:1px!important'), 'Parallel Scene Glass sparkles must stay restrained')
assert(narrativeVisual.every(script => !script.replace_string.includes('background:linear-gradient(180deg,color-mix(in srgb,var(--rr-glass-deep) 8%')), 'Glass roots must not paint a black bar behind compact buttons')

const plotVectors = ['detonation', 'heartknife', 'wrongness', 'crash-in', 'matchstrike', 'reputation-fire', 'wildcard-collision']
const plotFixture = `[Plot_Sparks][ID]glass-mode-routing[/ID][Lifecycle]Unused Plot Sparks dissolve after this response.[/Lifecycle]${plotVectors.map((vector, index) => `[Spark][Key]${String.fromCharCode(97 + index)}[/Key][Vector]${vector}[/Vector][Text]Glass branch ${index + 1}.[/Text][Media]media-${index + 1}[/Media][/Spark]`).join('')}[/Plot_Sparks]`
for (const [presentation, presentationClass] of [['inline', 'rr-surface-presentation-inline'], ['plain-button', 'rr-surface-presentation-button'], ['sparkle-button', 'rr-surface-presentation-sparkling']] as const) {
  const rendered = renderNarrativeRegex(plotFixture, presentation, `plot-glass-${presentation}`, {}, 'glass')
  assert(rendered.includes('data-reverie-glass-authority="narrative-glass"') && rendered.includes('[data-reverie-glass-authority].ch-og .ch-panel'), `Plot Sparks/${presentation}: Glass Mode did not select the complete Glass body`)
  assert(rendered.includes(presentationClass), `Plot Sparks/${presentation}: Glass Mode overwrote the independently selected presentation`)
  assert(!rendered.includes('[Plot_Sparks]'), `Plot Sparks/${presentation}: Glass Mode left the source block unrendered`)
}

console.log(`Glass authority smoke passed: ${R45_ACTIVE_ROOTS.length} + ${Object.keys(NARRATIVE_UTILITY_FORMAT_CONTRACTS).length} = 59 Surfaces, R4.5 138/138/138, standalone active ${activeNarrativeGlass.length}, no Sparkling runtime fallback.`)
