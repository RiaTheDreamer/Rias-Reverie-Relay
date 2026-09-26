// @ts-nocheck -- Bun smoke harness uses Node assert without Node type declarations.
import assert from 'node:assert/strict'
import { SHIPPED_SURFACE_SPECS, shippedSurfaceDefinitions } from '../src/shippedSurfaceDefinitions'
import { r45SupplementalSurfaceDefinitions } from '../src/r45SurfaceCatalog'
import { completeSurfaceSpecs } from '../src/surfaceXml'
import { renderNativeSurfaceMarkup } from '../src/nativeSurfaces'
import { NARRATIVE_UTILITY_PACK, narrativeRegexScripts, renderNarrativeRegex } from '../src/narrativeRegexAssets'
import { SURFACE_ICON_REGISTRY, decorateSurfaceLauncherMarkup } from '../src/surfaceIcons'

const definitions = [...shippedSurfaceDefinitions(1), ...r45SupplementalSurfaceDefinitions(1)]
const coreIds = new Set(definitions.map(definition => definition.baseSurfaceId))
const narrativeIds = new Set(NARRATIVE_UTILITY_PACK.loomItems.map(item => item.loomName))
assert.equal(coreIds.size, 46, 'Core Surface inventory drifted')
assert.equal(narrativeIds.size, 13, 'Narrative Utility inventory drifted')
assert.deepEqual(new Set(completeSurfaceSpecs(SHIPPED_SURFACE_SPECS).map(spec => spec.id)), coreIds)
assert.equal(Object.keys(SURFACE_ICON_REGISTRY).length, 59, 'icon registry must contain exactly 59 stable identifiers')
for (const id of coreIds) assert(SURFACE_ICON_REGISTRY[`core:${id}`], `Core icon missing: ${id}`)
for (const id of narrativeIds) assert(SURFACE_ICON_REGISTRY[`narrative:${id}`], `Narrative icon missing: ${id}`)
for (const [key, icon] of Object.entries(SURFACE_ICON_REGISTRY)) {
  assert(/<svg\b[^>]*\bviewBox="[^"]+"/.test(icon.svg), `${key}: SVG has no viewBox`)
  assert(!/<script|<foreignObject|\bon\w+\s*=|\bhref\s*=|url\(/i.test(icon.svg), `${key}: unsafe/external SVG content`)
  assert(!/https?:\/\//i.test(icon.svg), `${key}: runtime SVG URL escaped sanitization`)
  assert(icon.svg.includes('currentColor'), `${key}: SVG does not inherit launcher color`)
}
assert.equal(SURFACE_ICON_REGISTRY['core:relationship-map'].source, 'svgrepo')
assert(SURFACE_ICON_REGISTRY['core:relationship-map'].svg.includes('viewBox="0 0 272 272"'))

for (const mode of ['plain', 'sparkling', 'glass', 'plain-glass'] as const) {
  for (const definition of definitions) {
    const studio = { definitions: {}, activePresetIds: {}, rendererMode: 'relay', defaultShellMode: mode, colorMode: 'realistic' } as any
    const rendered = renderNativeSurfaceMarkup(definition.sampleXml, studio, { chatId: 'icons', messageId: `icons-${definition.baseSurfaceId}` }).content
    const marker = `data-rr-surface-icon="core:${definition.baseSurfaceId}"`
    assert.equal(rendered.split(marker).length - 1, 1, `${mode}/${definition.baseSurfaceId}: icon missing or duplicated`)
    const summary = /<summary\b[^>]*>[\s\S]*?<\/summary>/i.exec(rendered)?.[0] || ''
    assert(summary.includes('aria-hidden="true"') && /<svg\b[^>]*viewBox=/.test(summary), `${mode}/${definition.baseSurfaceId}: icon escaped visible launcher`)
    assert(summary.replace(/<[^>]*>/g, '').trim(), `${mode}/${definition.baseSurfaceId}: visible label was removed`)
    const coreLabel = summary.replace(/<svg[\s\S]*?<\/svg>/gi, '').replace(/<[^>]*>/g, '').trim()
    assert(!/^[\p{Extended_Pictographic}◫◎◐✦⑂▣☄]/u.test(coreLabel), `${mode}/${definition.baseSurfaceId}: legacy glyph still precedes SVG label`)
    assert(!/https?:\/\//i.test(summary), `${mode}/${definition.baseSurfaceId}: external icon URL rendered`)
    assert.equal(summary.includes('class="rr-surface-sparks"'), mode === 'sparkling' || mode === 'glass', `${mode}/${definition.baseSurfaceId}: shared ember field mismatch`)
    assert.equal(summary.includes('data-rr-plain-glass="1"'), mode === 'plain-glass', `${mode}/${definition.baseSurfaceId}: Plain Glass marker mismatch`)
    if (mode === 'plain-glass') assert(rendered.includes('.rr-surface-launcher-iconized[data-rr-plain-glass="1"] [class*="spark"]'), `${mode}/${definition.baseSurfaceId}: inherited glass particles were not suppressed`)
    assert(rendered.includes('</summary><style data-rr-surface-icon-style="1">'), `${mode}/${definition.baseSurfaceId}: icon CSS escaped the isolated Surface root`)
    assert(rendered.includes('data-rr-surface-icon^="core:"]{width:12px!important;height:12px!important;margin-right:6px!important}'), `${mode}/${definition.baseSurfaceId}: Core icon size/label gap drifted`)
  }
}

for (const [variant, animated] of [['plain-button', false], ['sparkle-button', true], ['glass', true], ['plain-glass', false]] as const) {
  const scripts = narrativeRegexScripts(variant)
  const covered = new Set<string>()
  for (const id of narrativeIds) {
    const marker = `data-rr-surface-icon="narrative:${id}"`
    const matches = scripts.filter(script => script.replace_string.includes(marker))
    assert(matches.length, `${variant}/${id}: icon missing`)
    covered.add(id)
    for (const script of matches) {
      assert.equal(script.replace_string.split(marker).length - 1, 1, `${variant}/${id}: icon duplicated in ${script.script_id}`)
      assert(script.replace_string.includes('aria-hidden="true"'), `${variant}/${id}: icon wrapper not aria-hidden`)
      const launcher = /<(?:summary|label)\b[^>]*>[\s\S]*?<\/(?:summary|label)>/i.exec(script.replace_string)?.[0] || ''
      assert(launcher.includes(marker), `${variant}/${id}: SVG escaped its launcher`)
      assert(!/<span class="(?:dg-unified-emoji|ch-launch-emoji)"/i.test(launcher), `${variant}/${id}: legacy emoji remains beside SVG`)
      assert(!/<span class="(?:rrcp-label|r65-label|ra66-label)">\s*<span>[^<]*<\/span>\s*<span>/i.test(launcher), `${variant}/${id}: legacy glyph remains beside SVG`)
      assert.equal(script.replace_string.includes('<span class="rr-surface-sparks"'), animated, `${variant}/${id}: shared ember mismatch`)
      if (variant === 'plain-glass') {
        assert(script.replace_string.includes('data-rr-plain-glass="1"'), `${variant}/${id}: launcher marker missing`)
        assert(script.replace_string.includes('data-reverie-narrative-glass-button="1"'), `${variant}/${id}: glass authority lost`)
      }
    }
  }
  assert.equal(covered.size, 13)
}

const glassSparks = narrativeRegexScripts('glass').find(script => script.script_id === 'ria_plot_sparks_og_sparkle_tabs_bulletproof_v7')!.replace_string
assert(/<\/summary><style data-rr-surface-icon-style="1">/.test(glassSparks), 'Plot Sparks must keep shared sparkle CSS inside its isolated Surface root')
assert(glassSparks.includes('animation:rrSurfaceEmber var(--dur) ease-in-out var(--delay) infinite!important'), 'legacy Glass animation overrides the shared ember field')
const glassPhone = narrativeRegexScripts('glass').find(script => script.script_id === 'rrpp_proto_shell_v31')!.replace_string
assert(/<\/label><style data-rr-surface-icon-style="1">/.test(glassPhone), 'Character Phone must keep shared sparkle CSS inside its isolated Surface root')
assert(glassPhone.includes(':is([data-reverie-glass-button],[data-reverie-narrative-glass-button]) .rr-surface-launcher-iconized.rr-surface-launcher-sparkling>.rr-surface-sparks[aria-hidden="true"]>i'), 'Glass authority overrides the shared ember animation')
const dramaticSource = '[dramatic_parallel][dramatic_head]LOCATION:Roof[/dramatic_head][dramatic_media][/dramatic_media][dramatic_body][paragraph]A door opened.[/paragraph][/dramatic_body][dramatic_foot]STATUS: OFFSCREEN[/dramatic_foot][/dramatic_parallel]'
for (const variant of ['plain-button', 'sparkle-button', 'glass', 'plain-glass'] as const) {
  const dramaticRendered = renderNarrativeRegex(dramaticSource, variant, 'dramatic-icon-smoke')
  assert(dramaticRendered.includes('data-rr-surface-icon="narrative:Dramatic Cutaway"'), `${variant}: Dramatic Cutaway SVG did not reach the rendered Surface`)
  assert(!dramaticRendered.includes('[dramatic_parallel]'), `${variant}: Dramatic Cutaway did not render`)
}

const inlineWhatIf = narrativeRegexScripts('inline').find(script => script.script_id === 'reverie_whatif_loom_images_fork_v1')!.replace_string
assert(inlineWhatIf.includes('data-rr-surface-icon="narrative:In Another Life"'), 'Inline What If header lost its icon')
assert(!inlineWhatIf.includes('class="rr-surface-launcher-iconized'), 'Inline added a fake launcher')
assert(inlineWhatIf.includes('.r65-card{line-height:1.45!important}'), 'What If title still inherits zero line-height from launcher stack')

const once = decorateSurfaceLauncherMarkup('<details><summary><span>Label</span></summary></details>', 'core', 'relationship-map', 'glass')
const twice = decorateSurfaceLauncherMarkup(once, 'core', 'relationship-map', 'glass')
assert.equal(twice, once, 'hydration duplicated an icon or sparkle field')
console.log('surface icon smoke passed: 46 Core + 13 Narrative, Button/Sparkling/Glass/Plain Glass and Inline semantics')
