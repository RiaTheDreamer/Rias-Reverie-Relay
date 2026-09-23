// @ts-nocheck -- executable release regression harness; Bun provides node:fs.
import packageJson from '../package.json'
import { readFileSync } from 'node:fs'
import { buildNarrativeUtilityPrompt } from '../src/narrativeDlcRuntime'
import {
  NARRATIVE_UTILITY_FORMAT_CONTRACTS,
  NARRATIVE_REGEX_VARIANTS,
  containsNarrativeRegexMarkup,
  narrativeRegexScripts,
  narrativeSurfaceBracketTags,
  narrativeUtilityItems,
  missingNarrativeUtilityFormatMarkers,
  normalizeNarrativeClosingDelimiters,
  normalizeNarrativeMarkupForRendering,
  normalizeParallelSceneMarkup,
  renderNarrativeRegex,
} from '../src/narrativeRegexAssets'
import { renderNativeSurfaceMarkup } from '../src/nativeSurfaces'
import { narrativeVariantForSurfaceShellMode } from '../src/surfacePresentation'

function assert(value: unknown, reason: string): asserts value {
  if (!value) throw new Error(reason)
}

const utilityNames = narrativeUtilityItems().map(item => item.loomName)
assert(utilityNames.length === 13, `Narrative Utility inventory changed: ${utilityNames.length}`)
assert(new Set(utilityNames).size === utilityNames.length, 'Narrative Utility inventory contains duplicates')
assert(!utilityNames.some(name => /stella/i.test(name)), 'Stella entered the Narrative Utility inventory')
assert(utilityNames.join('|') === 'Character Phone|Dramatic Cutaway|Plot Sparks|Scene Shift|Parallel Scene|Cast Introduction|Backstage Secrets|Setting the Scene|Off-Stage|Character Dossier|Location File|In Another Life|Archive Entry', 'Narrative Utility inventory contains a retired name or incorrect order')

const protectedTags = new Set([
  'image_request', 'scene_brief', 'reverie-illustration', 'visual_prompt',
  'context_caption', 'negative', 'negative_prompt',
])
let structuralXml = 0
let imageRequests = 0
let illustrations = 0
for (const item of narrativeUtilityItems()) {
  assert(Object.prototype.hasOwnProperty.call(NARRATIVE_UTILITY_FORMAT_CONTRACTS, item.loomName), `${item.loomName}: no canonical Regex format contract is registered`)
  assert(missingNarrativeUtilityFormatMarkers(item.loomName, item.loomContent).length === 0, `${item.loomName}: shipped format does not expose every field consumed by its Regex renderer`)
  for (const match of item.loomContent.matchAll(/<\/?([A-Za-z][A-Za-z0-9_-]*)\b[^>]*>/g)) {
    if (!protectedTags.has(match[1].toLowerCase())) structuralXml += 1
  }
  imageRequests += (item.loomContent.match(/<image_request\b/g) || []).length
  illustrations += (item.loomContent.match(/<reverie-illustration\b/g) || []).length
  assert(!/\[\/?(?:image_request|scene_brief|reverie-illustration|visual_prompt)\b/i.test(item.loomContent), `${item.loomName}: protected Relay image control was converted to brackets`)
  if (item.loomName === 'Dramatic Cutaway') assert(!/\[\/?(?:p|div)\]/i.test(item.loomContent), 'Dramatic Cutaway retained generic structural bracket fields')
  if (item.loomName === 'Character Phone') assert(item.loomContent.includes('compact semantic icon glyph') && !/Inline SVG|\[cp_glyph\]SVG/i.test(item.loomContent), 'Character Phone still requires model-authored SVG')
}
assert(structuralXml === 0, `Narrative model-facing structural XML remains: ${structuralXml}`)
assert(imageRequests > 0 && illustrations > 0, 'canonical XML image-control families are not both represented')
const assembledPrompt = buildNarrativeUtilityPrompt().content
const assembledStructuralXml = [...assembledPrompt.matchAll(/<\/?([A-Za-z][A-Za-z0-9_-]*)\b[^>]*>/g)]
  .filter(match => !protectedTags.has(match[1].toLowerCase()))
assert(assembledStructuralXml.length === 0, `assembled Narrative prompt contains structural XML: ${assembledStructuralXml.length}`)

const image = (id: string, aspect = '16:9') => `<image_request id="${id}" target="custom.artifact-media" slot="${id}" aspect="${aspect}"><scene_brief>Grounded ${id} image.</scene_brief></image_request>`
const nativeStudio = {
  definitions: {}, activePresetIds: {}, collectionPresets: {}, rendererMode: 'relay', defaultShellMode: 'inline', colorMode: 'realistic',
  utilityInjectionEnabled: true, utilityInjectionPosition: 'system-prefix', utilityTemplate: '', validationErrors: {},
  lastInjectedModuleIds: [], lastInjectionAt: 0, lastInjectionSource: 'none', lastInjectionPosition: 'none', lastInjectionSummary: '', updatedAt: 0,
} as any
const fixtures: Record<string, { source: string; rendered: string }> = {
  'Scene Shift': {
    source: `[SCENE|Library|Night|Rain][scene_media]${image('scene')}[/scene_media][scene_detail]Rain ticks against the glass.[/scene_detail][scene_context][reason]The story moved indoors.[/reason][continuity]The red notebook remains open.[/continuity][/scene_context][/SCENE]`,
    rendered: 'rr-scene-compass',
  },
  'Parallel Scene': {
    source: `[PARALLEL|Campus|shifting][parallel_entry][text]Soobin waits.[/text][parallel_media]${image('parallel-1', '4:3')}[/parallel_media][/parallel_entry][parallel_entry][text]Hana reads a message.[/text][parallel_media]${image('parallel-2', '4:3')}[/parallel_media][/parallel_entry][parallel_entry][text]Jiyoon crosses the courtyard.[/text][parallel_media]${image('parallel-3', '4:3')}[/parallel_media][/parallel_entry][parallel_context][trajectory]Three threads continue.[/trajectory][intersection]Their timing creates pressure.[/intersection][/parallel_context][/PARALLEL]`,
    rendered: 'r65-thread',
  },
  'Cast Introduction': {
    source: `[NPC:MAJOR|Lisa][npc_media]${image('npc', '1:1')}[/npc_media]\nb: Lisa | dancer\na: lavender hair | glasses\np: observant\nh: established history\nr: trusted friend\n[/NPC]`,
    rendered: 'r65',
  },
  'Backstage Secrets': {
    source: `[SECRET|Lisa|She kept the letter.|Lisa][secret_media]${image('secret')}[/secret_media][context]The envelope is hidden.[/context][pressure]Discovery would change trust.[/pressure][/SECRET]`,
    rendered: 'r65',
  },
  'Setting the Scene': {
    source: `[WORLD|Campus|Night][world_media]${image('world')}[/world_media][world_detail]Wet stone reflects the lamps.[/world_detail][world_context][why_it_matters]The paths are exposed.[/why_it_matters][future_use]The gate closes at midnight.[/future_use][/world_context][/WORLD]`,
    rendered: 'r65',
  },
  'Off-Stage': {
    source: `[[else security office]]
[else_media]<image_request id="elsewhere-current" target="custom.artifact-media" slot="elsewhere-current" aspect="16:9"><scene_brief>Security office at night.</scene_brief></image_request>[/else_media]
[else_scene]A guard rewinds the recording.[/else_scene]
[else_context]
[visibility]Reader only[/visibility]
[clock]Same night[/clock]
[knowledge]The cast does not know.[/knowledge]
[collision]The recording may be noticed.[/collision]
[/else_context]
[[/else]]`,
    rendered: 'r65',
  },
  'Character Dossier': {
    source: `[[npc Lisa|main]][npc_media]${image('dossier', '1:1')}[/npc_media]»» identity\n» role | dancer\n»» appearance\n» current | lavender hair\n»» behavior\n» tells | watches exits\n»» connections\n» trusted by | Example B\n»» knowledge\n» knows | the route\n»» use\n» offers | access[[/npc]]`,
    rendered: 'r65',
  },
  'Location File': {
    source: `[[place Moon Pier]][place_media]${image('place')}[/place_media]»» place\n» type | pier\n» feel | quiet\n»» layout\n» inside | dock\n» routes | east gate\n» around it | harbor\n»» people\n» frequented by | students\n» faces | Example B\n» customs | leave before midnight\n»» history\n» known | old ferry point\n» buried | sealed room\n» pressure | redevelopment\n»» use\n» offers | shelter\n» risks | surveillance\n» discoverable | ask the keeper[[/place]]`,
    rendered: 'r65',
  },
  'In Another Life': {
    source: `[WHATIF|The Unsent Reply][whatif_media]${image('whatif')}[/whatif_media][whatif_scenario]She sends the message before leaving.[/whatif_scenario][whatif_branch][pivot]The message is sent.[/pivot][stakes]The truth reaches him early.[/stakes][canon_state]This remains hypothetical.[/canon_state][/whatif_branch][/WHATIF]`,
    rendered: 'r65',
  },
  'Archive Entry': {
    source: `[dossier_ui][category]SECRET[/category][archive_head][icon]◇[/icon][name]The Letter[/name][state]PARTIAL[/state][relation]Lisa ↔ Example B[/relation][role]Hidden correspondence[/role][/archive_head][archive_media]${image('archive')}[/archive_media][archive_stats][archive_stat][label]Exposure[/label][value]25[/value][/archive_stat][archive_stat][label]Certainty[/label][value]50[/value][/archive_stat][archive_stat][label]Consequence[/label][value]75[/value][/archive_stat][/archive_stats][archive_details][archive_row][label]The Hidden Truth[/label][value]The letter exists.[/value][/archive_row][/archive_details][archive_export][SECRET: The Letter]\nTHE HIDDEN TRUTH: The letter exists.[/archive_export][/dossier_ui]`,
    rendered: 'ra66',
  },
  'Dramatic Cutaway': {
    source: `[dramatic_parallel][dramatic_head]LOCATION:Roof • TIME:Night • PRESSURE:Secret[/dramatic_head][dramatic_media]<reverie-illustration request="generate" slot="dramatic-cutaway-test" aspect="16:9" cast="none"><visual_prompt>Rain crossing an empty rooftop.</visual_prompt></reverie-illustration>[/dramatic_media][dramatic_body][paragraph]A door opened.[/paragraph][paragraph]The evidence changed hands.[/paragraph][/dramatic_body][dramatic_foot]STATUS: OFFSCREEN • PRESSURE: LIVE • FIREWALL: ACTIVE[/dramatic_foot][/dramatic_parallel]`,
    rendered: 'dg-dramatic-cutaway',
  },
}

const vectors = ['detonation', 'heartknife', 'wrongness', 'crash-in', 'matchstrike', 'reputation-fire', 'wildcard-collision']
const plotSparks = `[Plot_Sparks][ID]batch-d[/ID][Lifecycle]Unused Plot Sparks dissolve after this response.[/Lifecycle]${vectors.map((vector, index) => `[Spark][Key]${String.fromCharCode(97 + index)}[/Key][Vector]${vector}[/Vector][Text]Branch ${index + 1}.[/Text][Media]<reverie-illustration request="generate" slot="plot-${index + 1}" aspect="16:9" cast="none"><visual_prompt>Grounded continuation ${index + 1}.</visual_prompt></reverie-illustration>[/Media][/Spark]`).join('')}[/Plot_Sparks]`
fixtures['Plot Sparks'] = { source: plotSparks, rendered: 'ch-og' }

const phoneApps = Array.from({ length: 8 }, (_, index) => `[cp_app][cp_slot]${index + 1}[/cp_slot][cp_name]App ${index + 1}[/cp_name][cp_icon]◇[/cp_icon][cp_tone]blue[/cp_tone][cp_badge]0[/cp_badge][cp_content][cp_row][cp_glyph]◇[/cp_glyph][cp_title]Row ${index + 1}[/cp_title][cp_meta]Meta[/cp_meta][cp_text]Text[/cp_text][/cp_row][/cp_content][/cp_app]`).join('')
const phone = `[character_phone][cp_presentation]sparkling[/cp_presentation][cp_owner]Lisa[/cp_owner][cp_subtitle]Private phone[/cp_subtitle][cp_time]09:47[/cp_time][cp_day]Monday[/cp_day][cp_battery]63[/cp_battery][cp_wallpaper]${image('phone-wallpaper')}[/cp_wallpaper][cp_apps]${phoneApps}[/cp_apps][/character_phone]`
fixtures['Character Phone'] = { source: phone, rendered: 'rrcp-wrap' }

assert(Object.keys(fixtures).length === utilityNames.length, `fixture inventory does not cover all Utilities: ${Object.keys(fixtures).length}/${utilityNames.length}`)
const narrativeContractTags = narrativeSurfaceBracketTags()
let narrativeClosingDelimiterMutationCases = 0
for (const tag of narrativeContractTags) {
  const canonical = `[WORLD|Test|Contract][${tag}]value[/${tag}][/WORLD]`
  for (const malformed of [`</${tag}]`, `[/${tag}>`]) {
    const mutated = canonical.replace(`[/${tag}]`, malformed)
    const repaired = normalizeNarrativeClosingDelimiters(mutated)
    assert(repaired === canonical, `Narrative contract tag ${tag} did not repair ${malformed}`)
    narrativeClosingDelimiterMutationCases += 1
  }
}
assert(narrativeClosingDelimiterMutationCases === narrativeContractTags.size * 2 && narrativeContractTags.size > 40, 'Narrative closer mutation matrix did not cover the registered contract')
for (const untouched of [
  'Ordinary prose [world_detail]example </world_detail] outside a Surface.',
  '<world_detail>XML-owned value</world_detail]',
  '[WORLD|Test|Contract][world_detail][future_use]crossed</world_detail][/future_use][/WORLD]',
  '[WORLD|Test|Contract][invented_field]unknown</invented_field][/WORLD]',
]) assert(normalizeNarrativeClosingDelimiters(untouched) === untouched, `unsafe closer repair changed fail-closed source: ${untouched}`)

let renderCases = 0
for (const [name, fixture] of Object.entries(fixtures)) {
  assert(containsNarrativeRegexMarkup(fixture.source), `${name}: canonical bracket root is not detected`)
  for (const variant of NARRATIVE_REGEX_VARIANTS) {
    const rendered = renderNarrativeRegex(fixture.source, variant, `batch-d-${name}-${variant}`)
    assert(rendered.includes(fixture.rendered), `${name}/${variant}: dedicated presentation did not render`)
    const expectedMode = variant === 'inline' ? 'inline' : variant === 'plain-button' ? 'button' : 'sparkling'
    const presentationRoot = variant === 'glass'
      ? /<(details|div)\b[^>]*data-reverie-glass-authority="narrative-glass"[^>]*>/i.exec(rendered)
      : new RegExp(`<(details|div) class="[^"]*\\brr-surface-presentation-${expectedMode}\\b[^"]*"([^>]*)>`, 'i').exec(rendered)
    assert(presentationRoot, `${name}/${variant}: global Surface presentation did not reach the Narrative root`)
    if (variant === 'inline') {
      if (presentationRoot[1].toLowerCase() === 'details') assert(/\bopen(?:\s|=|>)/i.test(presentationRoot[0]), `${name}/${variant}: inline details root is closed and would disappear`)
      assert(rendered.includes('.rr-surface-presentation-inline>summary{display:none!important}'), `${name}/${variant}: inline launcher is not suppressed`)
    } else if (variant !== 'glass') {
      if (presentationRoot[1].toLowerCase() === 'details') assert(!/\bopen(?:\s|=|>)/i.test(presentationRoot[0]), `${name}/${variant}: button root must start closed`)
      if (variant === 'plain-button') assert(rendered.includes('.rr-surface-presentation-button>summary .dg-unified-sparks'), `${name}/${variant}: plain Button did not suppress sparkling launcher decoration`)
    }
    assert(!rendered.includes('Relay Surface needs repair'), `${name}/${variant}: canonical fixture fell into generic repair UI`)
    const requestCount = (fixture.source.match(/<(?:image_request|reverie-illustration)\b/gi) || []).length
    const hydrated = renderNativeSurfaceMarkup(rendered, nativeStudio, { chatId: 'batch-d', messageId: `batch-d-${name}-${variant}`, swipeId: 0, records: [] }).content
    const cardCount = (hydrated.match(/data-reverie-lifecycle-card="true"/g) || []).length
    assert(requestCount > 0 && cardCount === requestCount, `${name}/${variant}: pending request/Status Card mismatch (${requestCount}/${cardCount})`)
    assert(!/<(?:image_request|reverie-illustration)\b/i.test(hydrated), `${name}/${variant}: raw pending image control survived lifecycle hydration`)
    renderCases += 1
  }
}

for (const variant of NARRATIVE_REGEX_VARIANTS) {
  for (const script of narrativeRegexScripts(variant)) assert(new RegExp(script.find_regex, script.flags), `${variant}/${script.script_id}: matcher does not compile`)
  const phoneRendered = renderNarrativeRegex(phone, variant, `batch-d-phone-${variant}`)
  assert(phoneRendered.includes(`rrcp-presentation-${variant === 'sparkle-button' ? 'sparkling' : variant === 'plain-button' ? 'plain' : variant}`), `${variant}: Character Phone visual variant changed`)
}

const plotRendered = renderNarrativeRegex(plotSparks, 'sparkle-button', 'batch-d-plot-ownership')
assert((plotRendered.match(/class="ch-media"/g) || []).length === 7, 'Plot Sparks did not preserve seven dedicated [Media] owners')
assert((plotRendered.match(/<reverie-illustration\b/g) || []).length === 7, 'Plot Sparks XML illustrations left their [Media] owners')

// Exact live regression: the model emitted one unambiguous illustration with
// the legacy scene_brief child and omitted only its illustration closer. Repair
// stays inside [Media], then the Narrative owner must consume the full shell.
const missingIllustrationCloser = plotSparks
  .replace('<visual_prompt>Grounded continuation 4.</visual_prompt></reverie-illustration>', '<scene_brief>Grounded continuation 4.</scene_brief>')
const repairedMissingCloser = normalizeNarrativeMarkupForRendering(missingIllustrationCloser)
assert(repairedMissingCloser.includes('<visual_prompt>Grounded continuation 4.</visual_prompt></reverie-illustration>'), 'unambiguous Plot Sparks Media did not repair its missing illustration closer')
const missingCloserRendered = renderNarrativeRegex(missingIllustrationCloser, 'inline', 'live-plot-sparks-missing-closer')
assert(missingCloserRendered.includes('class="ch-og') && !missingCloserRendered.includes('[Plot_Sparks]'), 'repaired Plot Sparks owner leaked its bracket shell')
assert((missingCloserRendered.match(/class="ch-media"/g) || []).length === 7, 'repaired Plot Sparks lost a Media owner')
const ambiguousMissingCloser = missingIllustrationCloser.replace('<reverie-illustration request="generate" slot="plot-4"', '<reverie-illustration request="generate" slot="extra"></reverie-illustration><reverie-illustration request="generate" slot="plot-4"')
assert(normalizeNarrativeMarkupForRendering(ambiguousMissingCloser) === ambiguousMissingCloser, 'ambiguous Plot Sparks Media was guessed instead of failing closed')

const backendSource = readFileSync(new URL('../src/backend.ts', import.meta.url), 'utf8')
const narrativeOwnerIndex = backendSource.indexOf('renderNarrativeRegex(renderedContent')
const nativeControlIndex = backendSource.indexOf('renderNativeSurfaceMarkup(renderedContent', narrativeOwnerIndex)
assert(narrativeOwnerIndex >= 0 && nativeControlIndex > narrativeOwnerIndex, 'Narrative owners must render before XML controls become rrl-card runtime HTML')

const currentElsewhere = fixtures['Off-Stage'].source
const currentElsewhereBadCloser = currentElsewhere.replace('[[/else]]', '[/else]')
const legacyElsewhere = `[[else security office]]
<else-media><image_request id="elsewhere-legacy" target="custom.artifact-media" slot="elsewhere-legacy" aspect="16:9"><scene_brief>Security office at night.</scene_brief></image_request></else-media>
<else-scene>A guard rewinds the recording.</else-scene>
<else-context>
<visibility>Reader only</visibility>
<clock>Same night</clock>
<knowledge>The cast does not know.</knowledge>
<collision>The recording may be noticed.</collision>
</else-context>
[[/else]]`
const legacyElsewhereBadCloser = legacyElsewhere.replace('[[/else]]', '[/else]')
assert(normalizeNarrativeMarkupForRendering(currentElsewhere) === currentElsewhere, 'canonical Off-Stage normalization must remain byte-for-byte unchanged')
for (const variant of NARRATIVE_REGEX_VARIANTS) {
  for (const [label, source, requestId] of [
    ['current canonical', currentElsewhere, 'elsewhere-current'],
    ['current one-bracket closer', currentElsewhereBadCloser, 'elsewhere-current'],
    ['historical hybrid', legacyElsewhere, 'elsewhere-legacy'],
    ['historical hybrid one-bracket closer', legacyElsewhereBadCloser, 'elsewhere-legacy'],
  ] as const) {
    const rendered = renderNarrativeRegex(source, variant, `elsewhere-${variant}-${label}`)
    assert(rendered.includes('class="r65') && rendered.includes('Off-Screen Scene'), `${variant}/${label}: Off-Stage did not use the current presentation`)
    assert(rendered.includes(`id="${requestId}"`) && rendered.includes('<scene_brief>Security office at night.</scene_brief>'), `${variant}/${label}: image-control XML changed during recovery`)
    assert(!rendered.includes('[[else security office]]') && !rendered.includes('Relay Surface needs repair'), `${variant}/${label}: recovered Off-Stage leaked or fell through to repair`)
  }
}

assert(narrativeVariantForSurfaceShellMode('inline') === 'inline', 'global Inline mode did not map to Narrative Inline')
assert(narrativeVariantForSurfaceShellMode('plain') === 'plain-button', 'global Button mode did not map to Narrative Button')
assert(narrativeVariantForSurfaceShellMode('sparkling') === 'sparkle-button', 'global Sparkling Button mode did not map to Narrative Sparkling Button')
assert(narrativeVariantForSurfaceShellMode('glass') === 'glass', 'global Glass mode did not map to Narrative Glass')

// Structurally faithful combined live response: inline XML, dossier, Parallel,
// Off-Stage, another inline control, and the malformed Plot Sparks owner retain
// response order through the real Narrative-then-native production sequence.
const combinedLiveResponse = [
  image('live-inline-before', '4:3'),
  fixtures['Character Dossier'].source,
  fixtures['Parallel Scene'].source,
  currentElsewhere,
  image('live-inline-after', '4:3'),
  missingIllustrationCloser,
].join('\n\n')
const combinedNarrative = renderNarrativeRegex(combinedLiveResponse, 'inline', 'live-combined-response')
const combinedRendered = renderNativeSurfaceMarkup(combinedNarrative, nativeStudio, { chatId: 'live-combined', messageId: 'live-combined-response', swipeId: 0, records: [] }).content
const combinedOrder = [
  combinedRendered.indexOf('live-inline-before'),
  combinedRendered.indexOf('Lisa'),
  combinedRendered.indexOf('Soobin waits.'),
  combinedRendered.indexOf('A guard rewinds the recording.'),
  combinedRendered.indexOf('live-inline-after'),
  combinedRendered.indexOf('Branch 1.'),
]
assert(combinedOrder.every(index => index >= 0) && combinedOrder.every((index, position) => position === 0 || index > combinedOrder[position - 1]), `combined live response order changed: ${combinedOrder.join(', ')}`)
assert(!/<(?:image_request|reverie-illustration)\b/i.test(combinedRendered), 'combined live response retained raw Relay image-control XML')
assert(!/\[(?:Plot_Sparks|Spark|Media|PARALLEL\||parallel_entry|parallel_media)|\[\[else\s/i.test(combinedRendered), 'combined live response retained raw Narrative scaffold')
assert(!/&lt;div\s+class=["']rrl-card/i.test(combinedRendered), 'runtime rrl-card HTML was escaped into visible chat text')
assert((combinedRendered.match(/class="rrl-card/g) || []).length >= 14, 'combined live response did not render its image controls as runtime cards')

const offStagePrompt = buildNarrativeUtilityPrompt(['Off-Stage']).content
for (const forbidden of ['<else-media>', '<else-scene>', '<else-context>', '<visibility>', '<clock>', '<knowledge>', '<collision>']) {
  assert(!offStagePrompt.includes(forbidden), `model-facing Off-Stage prompt leaked historical authoring: ${forbidden}`)
}
assert(offStagePrompt.includes('[else_media]') && offStagePrompt.includes('[[/else]]'), 'model-facing Off-Stage prompt lost its canonical bracket contract')

const canonicalWorld = `[WORLD|🌿 ENVIRONMENT|Basalt Sea Cave South of Jeju]
[world_media]<image_request id="world-canonical" target="custom.artifact-media" slot="world-canonical" aspect="16:9"><scene_brief>Basalt sea cave.</scene_brief></image_request>[/world_media]
[world_detail]The cave remains warm through winter currents.[/world_detail]
[world_context]
[why_it_matters]It provides a survivable air pocket.[/why_it_matters]
[future_use]The cave can conceal a traveler from patrols.[/future_use]
[/world_context]
[/WORLD]`
assert(normalizeNarrativeMarkupForRendering(canonicalWorld) === canonicalWorld, 'canonical World normalization must remain byte-for-byte unchanged')

const liveHybridWorldDetailCloser = canonicalWorld.replace('[/world_detail]', '</world_detail]')
const repairedLiveHybridWorld = normalizeNarrativeMarkupForRendering(liveHybridWorldDetailCloser)
assert(repairedLiveHybridWorld === canonicalWorld, 'live World hybrid world_detail closer was not restored through shared Surface repair')
for (const variant of NARRATIVE_REGEX_VARIANTS) {
  const rendered = renderNarrativeRegex(liveHybridWorldDetailCloser, variant, `world-hybrid-closer-${variant}`)
  assert(rendered.includes('Setting the Scene') && !rendered.includes('[WORLD|'), `${variant}: shared closer repair did not reach the World renderer`)
}

const missingRootWorld = canonicalWorld.replace('\n[/WORLD]', '')
// The live missing-root response continued directly into Plot Sparks. That
// next independently valid owner is the boundary that makes recovery safe.
const worldBoundarySibling = plotSparks
const missingRootBeforeSibling = `${missingRootWorld}\n${worldBoundarySibling}`
const recoveredMissingRoot = normalizeNarrativeMarkupForRendering(missingRootBeforeSibling)
assert(recoveredMissingRoot === `${missingRootWorld}\n[/WORLD]\n${worldBoundarySibling}`, 'complete World before a proven sibling boundary did not recover only its missing root closer')
for (const variant of NARRATIVE_REGEX_VARIANTS) {
  const rendered = renderNarrativeRegex(missingRootBeforeSibling, variant, `world-missing-root-${variant}`)
  assert(rendered.includes('Setting the Scene') && rendered.includes('class="ch-og'), `${variant}: missing-root World and its Plot Sparks sibling did not both render`)
  assert(!rendered.includes('[WORLD|') && !rendered.includes('Relay Surface needs repair'), `${variant}: missing-root World leaked raw markup or fell through to repair`)
}

const resolvedWorldMedia = `<!-- reverie-relay:image chatId="world-chat" messageId="world-message" swipeId="0" requestId="world-resolved" target="custom.artifact-media" slot="world-resolved" -->
<img src="/api/v1/image-gen/results/world-image" alt="Resolved World image" class="reverie-artifact-media" data-reverie-artifact-media="true" data-dgir-request-id="world-resolved" data-dgir-slot="world-resolved" loading="lazy" decoding="async">`
const resolvedMissingRootWorld = `${missingRootWorld.replace(/\[world_media\][\s\S]*?\[\/world_media\]/i, `[world_media]${resolvedWorldMedia}[/world_media]`)}\n${worldBoundarySibling}`
const recoveredResolvedWorld = normalizeNarrativeMarkupForRendering(resolvedMissingRootWorld)
assert(recoveredResolvedWorld.includes(`${resolvedWorldMedia}[/world_media]`) && recoveredResolvedWorld.includes('[/world_context]\n[/WORLD]'), 'missing-root recovery changed or rejected resolved Relay World media')
for (const variant of NARRATIVE_REGEX_VARIANTS) {
  const rendered = renderNarrativeRegex(resolvedMissingRootWorld, variant, `world-resolved-root-${variant}`)
  assert(rendered.includes('Setting the Scene') && rendered.includes('/api/v1/image-gen/results/world-image'), `${variant}: resolved-media World did not render after missing-root recovery`)
  assert(!rendered.includes('[WORLD|'), `${variant}: resolved-media World leaked its missing-root scaffold`)
}

assert(normalizeNarrativeMarkupForRendering(missingRootWorld) === missingRootWorld, 'complete inner World shell at end-of-input was closed before streaming completion became authoritative')
const ambiguousMissingRoot = missingRootBeforeSibling.replace('[future_use]The cave can conceal', '[future_use]First possibility.[/future_use]\n[future_use]The cave can conceal')
assert(normalizeNarrativeMarkupForRendering(ambiguousMissingRoot) === ambiguousMissingRoot, 'ambiguous missing-root World with repeated context fields was guessed at')
const multiplyOwnedMissingRoot = `${missingRootWorld}\n${missingRootBeforeSibling}`
assert(normalizeNarrativeMarkupForRendering(multiplyOwnedMissingRoot) === multiplyOwnedMissingRoot, 'multiply-owned missing-root World payload was partially consumed')

const malformedBasaltWorld = `[WORLD|🌿 ENVIRONMENT|Basalt Sea Cave South of Jeju]
[world_media]<image_request id="world-detail-basalt-sea-cave-01" target="custom.artifact-media" slot="world-detail-basalt-sea-cave-01" aspect="16:9" alt="Interior of half-submerged basalt sea cave with glowing lichen and salvaged human artifacts"><scene_brief>Secluded volcanic sea cave interior, dark basalt columns and damp stone shelves, glowing emerald bioluminescent moss on walls, black tide pool reflecting faint green light, shelves littered with salvaged rusted watch casings and maritime tags, no people visible.</scene_brief></image_request>[/world_media]
[world_detail]Formed by ancient volcanic activity, this thermal cave pocket stays warm despite freezing winter sea currents, providing an undetectable air chamber shielded by basalt rifts from siren sonar networks.[/world_detail]
[world_context]
[why_it_matters]It allows an altered human to stabilize both air-breathing lungs and gill tissue without immediately freezing or suffocating.[/future_use]
[future_use]Arin can use the cave's natural acoustic dead zones to conceal herself when border patrols sweep the outer reefs.[/future_use]
[/world_context]
[/WORLD]`
const recoveredBasaltWorld = normalizeNarrativeMarkupForRendering(malformedBasaltWorld)
const expectedBasaltWorld = malformedBasaltWorld.replace('suffocating.[/future_use]', 'suffocating.[/why_it_matters]')
assert(recoveredBasaltWorld === expectedBasaltWorld, 'the live Basalt Sea Cave fixture did not repair only its swapped closer')
const basaltImageControl = `<image_request id="world-detail-basalt-sea-cave-01" target="custom.artifact-media" slot="world-detail-basalt-sea-cave-01" aspect="16:9" alt="Interior of half-submerged basalt sea cave with glowing lichen and salvaged human artifacts"><scene_brief>Secluded volcanic sea cave interior, dark basalt columns and damp stone shelves, glowing emerald bioluminescent moss on walls, black tide pool reflecting faint green light, shelves littered with salvaged rusted watch casings and maritime tags, no people visible.</scene_brief></image_request>`
assert(recoveredBasaltWorld.includes(basaltImageControl), 'World recovery changed the canonical Relay image-control owner')
for (const variant of NARRATIVE_REGEX_VARIANTS) {
  const rendered = renderNarrativeRegex(malformedBasaltWorld, variant, `world-recovery-${variant}`)
  assert(rendered.includes('class="r65') && rendered.includes('Setting the Scene'), `${variant}: recovered World did not use the current presentation`)
  assert(rendered.includes('world-detail-basalt-sea-cave-01') && rendered.includes('<scene_brief>Secluded volcanic sea cave interior'), `${variant}: recovered World lost its image request`)
  assert(!rendered.includes('[WORLD|') && !rendered.includes('Relay Surface needs repair'), `${variant}: recovered World leaked or fell through to repair`)
}

const incompleteWorld = `[WORLD|🌿 ENVIRONMENT|Incomplete]
[world_media]${image('world-incomplete')}[/world_media]
[world_detail]Still forming.[/world_detail]
[world_context]
[why_it_matters]Still streaming...`
assert(normalizeNarrativeMarkupForRendering(incompleteWorld) === incompleteWorld, 'incomplete streaming World was repaired eagerly')
const ambiguousWorld = malformedBasaltWorld.replace('[future_use]Arin can use', '[future_use]First possibility.[/future_use]\n[future_use]Arin can use')
assert(normalizeNarrativeMarkupForRendering(ambiguousWorld) === ambiguousWorld, 'ambiguous World with multiple future-use fields was guessed at')

for (const variant of NARRATIVE_REGEX_VARIANTS) {
  const worldScript = narrativeRegexScripts(variant).find(script => script.script_id === 'reverie_world_detail_images_v1')
  assert(worldScript, `${variant}: canonical World presentation is missing`)
  const strictWorldMatcher = new RegExp(worldScript.find_regex, worldScript.flags.replace(/g/g, ''))
  assert(!strictWorldMatcher.test(malformedBasaltWorld), `${variant}: canonical World matcher was loosened to accept the malformed source`)
  assert(strictWorldMatcher.test(recoveredBasaltWorld), `${variant}: recovered World does not satisfy the canonical matcher`)
}

const worldPrompt = buildNarrativeUtilityPrompt(['Setting the Scene']).content
assert(worldPrompt.includes('SETTING THE SCENE STRUCTURAL LOCK'), 'Setting the Scene structural lock is missing')
assert(worldPrompt.includes('[why_it_matters]...[/why_it_matters]') && worldPrompt.includes('[future_use]...[/future_use]'), 'Setting the Scene lock lost the canonical paired fields')
assert(worldPrompt.includes('Never use [/future_use] to close [why_it_matters]'), 'Setting the Scene lock does not prohibit the observed swapped closer')
const overriddenWorldPrompt = buildNarrativeUtilityPrompt(['Setting the Scene'], { 'Setting the Scene': 'CUSTOM WORLD OVERRIDE' }).content
assert(overriddenWorldPrompt.includes('CUSTOM WORLD OVERRIDE') && overriddenWorldPrompt.includes('SETTING THE SCENE STRUCTURAL LOCK'), 'World structural lock was not appended after effective override content')

const validParallel = fixtures['Parallel Scene'].source
const resolvedParallelWithoutMediaClosers = validParallel.replace(/\[\/parallel_media\]/g, '')
const repairedResolvedParallel = normalizeParallelSceneMarkup(resolvedParallelWithoutMediaClosers)
assert((repairedResolvedParallel.match(/\[\/parallel_media\]/g) || []).length === 3, 'resolved Parallel Scene media closers were not deterministically restored')
assert(renderNarrativeRegex(resolvedParallelWithoutMediaClosers, 'inline', 'parallel-repair').includes('r65-parallel-context'), 'repaired Parallel Scene did not reach the approved renderer')
const placedParallelWithoutMediaClosers = resolvedParallelWithoutMediaClosers.replace(/<image_request\b[^>]*>[\s\S]*?<\/image_request>/g, '<!-- reverie-relay:image requestId="placed" slot="placed" --><img src="/api/v1/image-gen/results/placed" alt="Placed Parallel media">')
assert((normalizeParallelSceneMarkup(placedParallelWithoutMediaClosers).match(/\[\/parallel_media\]/g) || []).length === 3, 'placed Parallel Scene image markup did not receive the bounded closer repair')
assert(normalizeParallelSceneMarkup(validParallel) === validParallel, 'canonical Parallel Scene normalization must remain byte-for-byte unchanged')
const ambiguousParallel = resolvedParallelWithoutMediaClosers.replace('<image_request', '<not_media')
assert(normalizeParallelSceneMarkup(ambiguousParallel) === ambiguousParallel, 'ambiguous Parallel Scene media was guessed instead of failing closed')
const malformedParallel = validParallel.replace('[/parallel_entry]', '')
const isolated = renderNarrativeRegex(`${malformedParallel}\n${validParallel}\n${fixtures['Scene Shift'].source}`, 'inline', 'batch-d-isolation')
assert(isolated.includes('[PARALLEL|Campus|shifting]'), 'malformed owner was unexpectedly consumed')
assert((isolated.match(/class="r65-thread"/g) || []).length === 3, 'malformed Parallel poisoned its valid Parallel sibling')
assert(isolated.includes('rr-scene-compass'), 'malformed Parallel poisoned a valid different-owner sibling')

const malformedElsewhere = currentElsewhere.replace('[/collision]', '')
const elsewhereIsolated = renderNarrativeRegex(`${malformedElsewhere}\n${validParallel}\n${fixtures['Scene Shift'].source}\n${plotSparks}`, 'inline', 'elsewhere-sibling-isolation')
assert(elsewhereIsolated.includes('[[else security office]]'), 'unrecoverable Off-Stage was unexpectedly consumed')
assert((elsewhereIsolated.match(/class="r65-thread"/g) || []).length === 3, 'malformed Off-Stage poisoned valid Parallel')
assert(elsewhereIsolated.includes('rr-scene-compass'), 'malformed Off-Stage poisoned valid Scene Shift')
assert(elsewhereIsolated.includes('class="ch-og') && !elsewhereIsolated.includes('[Plot_Sparks]'), 'malformed Off-Stage poisoned valid Plot Sparks')

const worldIsolated = renderNarrativeRegex(`${ambiguousWorld}\n${validParallel}\n${fixtures['Scene Shift'].source}\n${plotSparks}`, 'inline', 'world-sibling-isolation')
assert(worldIsolated.includes('[WORLD|🌿 ENVIRONMENT|Basalt Sea Cave South of Jeju]'), 'unrecoverable World was unexpectedly consumed')
assert((worldIsolated.match(/class="r65-thread"/g) || []).length === 3, 'malformed World poisoned valid Parallel')
assert(worldIsolated.includes('rr-scene-compass'), 'malformed World poisoned valid Scene Shift')
assert(worldIsolated.includes('class="ch-og') && !worldIsolated.includes('[Plot_Sparks]'), 'malformed World poisoned valid Plot Sparks')

assert(normalizeNarrativeMarkupForRendering('[dramatic_parallel][dramatic_body][paragraph]One.[/paragraph][/dramatic_body][/dramatic_parallel]').includes('<p>One.</p>'), 'Dramatic paragraph brackets did not normalize inside their owner')
assert(packageJson.version === '0.2.8.7', `version changed: ${packageJson.version}`)

console.log(`Narrative Batch D bracket gate passed: ${utilityNames.length} Surfaces, ${renderCases} dedicated presentation renders, ${narrativeClosingDelimiterMutationCases} closer mutations, model-facing structural XML 0, protected XML controls canonical, Plot Sparks seven-owner regression passed, Character Phone four-variant regression passed, malformed-sibling isolation passed, Stella absent.`)
