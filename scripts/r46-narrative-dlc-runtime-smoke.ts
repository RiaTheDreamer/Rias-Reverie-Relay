// @ts-nocheck -- local/mocked Narrative DLC host-integration regression gate.
import fs from 'node:fs'
import path from 'node:path'
import {
  NARRATIVE_DLC_FOLDER,
  NARRATIVE_DLC_NAMESPACE,
  buildNarrativeUtilityPrompt,
  inspectNarrativeRegex,
  narrativeRegexCreateInput,
  reconcileNarrativeRegex,
  removeNarrativeRegex,
} from '../src/narrativeDlcRuntime'
import { NARRATIVE_UTILITY_DISPLAY_NAMES, applyNarrativeDisplayNames, containsNarrativeRegexMarkup, narrativeRegexPack, narrativeRegexScripts, narrativeUtilityItems, narrativeUtilityNames, normalizeNarrativeMarkupForRendering, renderNarrativeRegex, shouldRelayRenderNarrativeMarkup } from '../src/narrativeRegexAssets'
import { renderNativeSurfaceMarkup } from '../src/nativeSurfaces'
import { parseImageRequests, renderResolvedMarkup } from '../src/contracts'

function assert(value: unknown, reason: string): asserts value { if (!value) throw new Error(reason) }

class MockRegexApi {
  rows: any[] = []
  creates = 0
  updates = 0
  deletes = 0
  failAtMutation = 0
  mutations = 0

  async list(options: any = {}) {
    const offset = options.offset || 0
    const limit = options.limit || 50
    return { data: this.rows.slice(offset, offset + limit).map(row => structuredClone(row)), total: this.rows.length }
  }
  mutationCheck() {
    this.mutations += 1
    if (this.failAtMutation && this.mutations === this.failAtMutation) throw new Error('mock host mutation failure')
  }
  async create(input: any) {
    this.mutationCheck(); this.creates += 1
    const row = this.dto(input, `host-${this.rows.length + 1}`)
    this.rows.push(row)
    return structuredClone(row)
  }
  async update(id: string, input: any) {
    this.mutationCheck(); this.updates += 1
    const index = this.rows.findIndex(row => row.id === id)
    if (index < 0) throw new Error('missing mock script')
    this.rows[index] = this.dto({ ...this.rows[index], ...input }, id)
    return structuredClone(this.rows[index])
  }
  async delete(id: string) {
    this.mutationCheck(); this.deletes += 1
    const index = this.rows.findIndex(row => row.id === id)
    if (index < 0) return false
    this.rows.splice(index, 1)
    return true
  }
  dto(input: any, id: string) {
    const metadata = structuredClone(input.metadata || {})
    if (input.folder && input.folder_version) metadata._lumiverse_spindle_extension = { identifier: 'reverie_relay', version: input.folder_version }
    return {
      id, can_mutate: input.can_mutate !== false, name: input.name, script_id: input.script_id || '',
      find_regex: input.find_regex, replace_string: input.replace_string || '', flags: input.flags || '',
      placement: input.placement || ['ai_output'], scope: input.scope || 'global', scope_id: input.scope_id ?? null,
      target: Array.isArray(input.target) ? input.target : [input.target || 'display'], min_depth: input.min_depth ?? null, max_depth: input.max_depth ?? null,
      trim_strings: input.trim_strings || [], run_on_edit: input.run_on_edit === true,
      substitute_macros: input.substitute_macros || 'none', disabled: input.disabled === true,
      sort_order: Number(input.sort_order) || 0, description: input.description || '', folder: input.folder || '',
      folder_version: input.folder_version || null, metadata, actions: structuredClone(input.actions || []), created_at: 1, updated_at: Date.now(),
    }
  }
}

const api = new MockRegexApi()
const activeScriptCount = narrativeRegexScripts('sparkle-button').length
assert(activeScriptCount === 56, `active Narrative install must contain 53 approved base scripts, the Phone repair normalizer, Plot Sparks, and Dramatic Cutaway, saw ${activeScriptCount}`)
const first = await reconcileNarrativeRegex(api as any, 'sparkle-button')
assert(first.status === 'healthy' && first.healthy === activeScriptCount && api.creates === activeScriptCount, 'first install must create and validate only active owned scripts')
assert(api.rows.every(row => row.disabled !== true && !/DISABLED|tombstone/i.test(row.name)), 'disabled legacy duplicates and tombstones must not be installed')
assert(api.rows.every(row => row.can_mutate && row.folder === NARRATIVE_DLC_FOLDER && row.metadata.reverie_namespace === NARRATIVE_DLC_NAMESPACE), 'installed scripts must be Relay-owned and namespaced')
assert(api.rows.every(row => row.metadata.reverie_narrative_variant === 'sparkle-button'), 'installed scripts must record selected variant')
assert(api.rows.some(row => row.actions.length > 0), 'installer must preserve approved Narrative interaction actions')
assert(api.rows.some(row => row.script_id === 'ria_dramatic_cutaway_lumiverse_native_bulletproof_v8'), 'approved Dramatic Cutaway renderer must be installed')
assert(api.rows.some(row => row.script_id === 'ria_plot_sparks_og_sparkle_tabs_bulletproof_v7' && row.name.includes('Plot Sparks') && row.replace_string.includes('Plot Sparks') && !row.replace_string.includes('Chaos Hooks')), 'approved Plot Sparks renderer must be installed with its accepted Regex name and launcher label')
const phoneRepair = api.rows.find(row => row.script_id === 'rrcp_repair_missing_optional_wallpaper_v462')
const phoneShell = api.rows.find(row => row.script_id === 'rrpp_proto_shell_v31')
assert(phoneRepair && phoneShell && phoneRepair.sort_order < phoneShell.sort_order, 'missing-wallpaper repair must install before the Character Phone shell renderer')

const retiredRegexLabels = ['Character File', 'Cast Arrival', 'Unified Archive', 'Place File', 'Knowledge Veil', 'Beyond the Frame', 'Parallel Current', 'Scene Compass', 'World Texture', 'Unwalked Path']
const acceptedRegexLabels = ['Character Dossier', 'Cast Introduction', 'Archive Entry', 'Location File', 'Backstage Secrets', 'Off-Stage', 'Parallel Scene', 'Scene Shift', 'Setting the Scene', 'In Another Life']
for (const variant of ['sparkle-button', 'plain-button', 'inline'] as const) {
  const sourcePresentation = JSON.stringify(narrativeRegexPack(variant).scripts.filter(script => script.disabled !== true).map(script => ({ name: script.name, replace_string: script.replace_string })))
  for (const label of retiredRegexLabels) assert(!sourcePresentation.includes(label), `${variant}: retired label ${label} remains embedded in the active Regex source`)
  for (const label of acceptedRegexLabels) assert(sourcePresentation.includes(label), `${variant}: accepted label ${label} is missing from the active Regex source`)
  assert(sourcePresentation.includes('Introducing...') && sourcePresentation.includes('Welcome to the Stage...'), `${variant}: accepted special launcher labels are missing from the active Regex source`)
}
assert(api.rows.some(row => row.name.includes('Parallel Scene')) && !api.rows.some(row => row.name.includes('Parallel Current')), 'installed host Regex scripts must use the current public Narrative labels')
const installedNarrativeCopy = api.rows.map(row => `${row.name}\n${row.replace_string}`).join('\n')
for (const [oldName, currentName] of Object.entries(NARRATIVE_UTILITY_DISPLAY_NAMES)) {
  assert(!installedNarrativeCopy.includes(oldName), `installed Narrative copy retained old name: ${oldName}`)
  if (narrativeRegexPack('sparkle-button').scripts.some(script => `${script.name}\n${script.replace_string}`.includes(oldName))) {
    assert(installedNarrativeCopy.includes(currentName), `installed Narrative copy omitted current name: ${currentName}`)
  }
}

const disabledSourceScript = narrativeRegexPack('sparkle-button').scripts.find(script => script.disabled === true)
assert(Boolean(disabledSourceScript), 'source compatibility pack must retain disabled history for provenance testing')
api.rows.push(api.dto({ ...narrativeRegexCreateInput(disabledSourceScript!, 'sparkle-button'), can_mutate: true }, 'stale-disabled-owned'))
const pruned = await reconcileNarrativeRegex(api as any, 'sparkle-button')
assert(pruned.status === 'healthy' && !api.rows.some(row => row.script_id === disabledSourceScript!.script_id), 'reconcile must remove previously installed disabled legacy scripts')

const mutationsAfterInstall = api.mutations
const second = await reconcileNarrativeRegex(api as any, 'sparkle-button')
assert(second.status === 'healthy' && api.mutations === mutationsAfterInstall, 'repeated install must be idempotent')

const switched = await reconcileNarrativeRegex(api as any, 'plain-button')
assert(switched.status === 'healthy' && switched.variant === 'plain-button', 'variant switch must reconcile to a healthy install')
assert(api.rows.every(row => row.metadata.reverie_narrative_variant === 'plain-button'), 'variant switch must update every owned script without parallel installs')
assert(api.rows.length === activeScriptCount, 'variant switch must remain mutually exclusive and active-only')

api.rows[0].replace_string = 'user drift'
const drift = await inspectNarrativeRegex(api as any, 'plain-button')
assert(drift.status === 'drifted' && drift.drifted === 1, 'health inspection must detect changed owned scripts')
const repaired = await reconcileNarrativeRegex(api as any, 'plain-button')
assert(repaired.status === 'healthy', 'repair must restore source-of-truth content')

const collisionApi = new MockRegexApi()
collisionApi.rows.push(collisionApi.dto({ ...narrativeRegexPack('inline').scripts[0], target: 'display', can_mutate: false, folder: 'Somebody Else' }, 'foreign-1'))
let collisionRefused = false
try { await reconcileNarrativeRegex(collisionApi as any, 'inline') } catch (error) { collisionRefused = /outside Relay ownership/i.test(String(error)) && /manually imported or foreign/i.test(String(error)) }
assert(collisionRefused && collisionApi.mutations === 0, 'installer must refuse foreign script-ID collisions without mutating them')

const rollbackApi = new MockRegexApi()
rollbackApi.failAtMutation = 8
let rollbackFailed = false
try { await reconcileNarrativeRegex(rollbackApi as any, 'inline') } catch { rollbackFailed = true }
assert(rollbackFailed && rollbackApi.rows.length === 0, 'partial first install must roll back every script it created')

const removed = await removeNarrativeRegex(api as any, 'plain-button')
assert(removed.status === 'removed' && api.rows.length === 0, 'remove must delete exactly the Relay-owned Narrative install')

const utility = buildNarrativeUtilityPrompt()
assert(utility.utilityNames.length === 13, 'all 13 Narrative Utilities must be selected by default')
assert(utility.utilityNames.join('|') === narrativeUtilityNames().join('|'), 'Utility injection order must match the source bundle')
for (const item of narrativeUtilityItems()) {
  assert(utility.content.includes(applyNarrativeDisplayNames(item.loomContent)), `${item.loomName}: final prompt injection must preserve the complete source Utility instructions under its public label`)
}
for (const oldName of Object.keys(NARRATIVE_UTILITY_DISPLAY_NAMES)) {
  assert(!narrativeUtilityItems().some(item => item.loomContent.includes(oldName)), `runtime Utility content retained retired model-facing name: ${oldName}`)
  assert(!utility.content.includes(oldName), `combined Narrative prompt retained retired model-facing name: ${oldName}`)
}
assert(utility.content.includes('<reverie_narrative_utility') && utility.content.includes('contract="narrative"'), 'Narrative Utility wrapper must use the Narrative contract name')
const subset = buildNarrativeUtilityPrompt(['Scene Compass', 'Character Phone'])
assert(subset.utilityNames.join('|') === 'Character Phone|Scene Compass', 'selected Utility prompt must preserve source order and contain only enabled contracts')
assert(subset.content.includes(applyNarrativeDisplayNames(narrativeUtilityItems()[0].loomContent)) && subset.content.includes(applyNarrativeDisplayNames(narrativeUtilityItems()[3].loomContent)), 'selected Utility prompt omitted enabled complete contracts')
assert(!subset.content.includes(narrativeUtilityItems()[1].loomContent), 'selected Utility prompt leaked a disabled contract')

const dramaticFixture = '<dramatic_parallel><div class="dp-head">LOCATION:Roof • TIME:Night • PRESSURE:Secret</div><div class="dp-media"><reverie-illustration request="generate" slot="dramatic-cutaway-test" aspect="16:9" cast="none"><visual_prompt>Rain crossing an empty rooftop.</visual_prompt></reverie-illustration></div><div class="dp-body"><p>A door opened.</p><p>The evidence changed hands.</p></div><div class="dp-foot">STATUS: OFFSCREEN • PRESSURE: LIVE • FIREWALL: ACTIVE</div></dramatic_parallel>'
assert(containsNarrativeRegexMarkup(dramaticFixture), 'Relay Narrative detection must include Dramatic Cutaway XML')
const dramaticRendered = renderNarrativeRegex(dramaticFixture, 'sparkle-button', 'dramatic-runtime')
assert(dramaticRendered.includes('dg-dramatic-cutaway') && !dramaticRendered.includes('<dramatic_parallel>'), 'approved Dramatic Cutaway renderer must execute in the shared Narrative adapter')
assert(dramaticRendered.includes('data-reverie-narrative-media-compat="1"'), 'Dramatic Cutaway must install the shared resolved-media compatibility sizing')
assert(dramaticRendered.includes('data-reverie-narrative-block-spacing="1"') && dramaticRendered.includes('margin-bottom:clamp(24px,4.5vw,34px)!important'), 'Narrative launcher roots must retain a readable gutter from surrounding prose')
for (const owner of ['dg-dramatic-media', 'r65-media', 'rv6-media', 'ru-media', 'ru-portrait', 'ru-secret-media', 'ru-thread-media', 'rrcp-media', 'rrcp-photo-media', 'rrcp-wallpaper']) {
  assert(dramaticRendered.includes(owner), `${owner}: shared Narrative media compatibility coverage is missing`)
}
const dramaticRequest = parseImageRequests(dramaticFixture)[0]
assert(dramaticRequest?.target === 'custom.artifact-media' && dramaticRequest.promptSource === 'structured', 'Dramatic Cutaway media must use the shared parsed artifact lane')
const resolvedDramaticMedia = renderResolvedMarkup({
  chatId: 'chat-dramatic', messageId: 'message-dramatic', swipeId: 0,
  requestId: dramaticRequest.id, target: dramaticRequest.target, slots: [dramaticRequest.slot],
  count: 1, alt: 'Cutaway image', originalSceneBrief: dramaticRequest.prompt,
}, [{ slot: dramaticRequest.slot, imageId: 'cutaway-image', imageUrl: '/api/v1/image-gen/results/cutaway-image' }])
assert(resolvedDramaticMedia.includes('class="reverie-artifact-media"') && !resolvedDramaticMedia.includes('![reverie-relay]'), 'completed Narrative media must remain a direct image inside its Regex owner instead of switching to prose Markdown')
const completedDramatic = renderNarrativeRegex(dramaticFixture.replace(dramaticRequest.fullMatch, resolvedDramaticMedia), 'sparkle-button', 'dramatic-runtime')
assert(completedDramatic.includes('dg-dramatic-cutaway') && completedDramatic.includes('/api/v1/image-gen/results/cutaway-image'), 'completed Narrative media must survive a full rerender inside the original Surface')

const plotVectors = ['detonation', 'heartknife', 'wrongness', 'crash-in', 'matchstrike', 'reputation-fire', 'wildcard-collision']
const plotSparksFixture = `<chaos_payload id="nightmare_sat_02x" lifecycle="Unused plot sparks dissolve after this response.">${plotVectors.map((vector, index) => `<chaos_hook key="${String.fromCharCode(97 + index)}" vector="${vector}"><hook_text>Independent plot spark ${index + 1}.</hook_text><hook_media>image-${index + 1}</hook_media></chaos_hook>`).join('')}</chaos_payload>`
assert(containsNarrativeRegexMarkup(plotSparksFixture), 'Relay Narrative detection must include Plot Sparks semantic markup')
const plotSparksRendered = renderNarrativeRegex(plotSparksFixture, 'sparkle-button', 'plot-sparks-runtime')
assert(plotSparksRendered.includes('ch-og') && plotSparksRendered.includes('Plot Sparks') && !plotSparksRendered.includes('Chaos Hooks') && !plotSparksRendered.includes('<chaos_payload'), 'approved Plot Sparks renderer must consume tolerant payload IDs and expose only its accepted launcher label')

const phoneApps = Array.from({ length: 8 }, (_, index) => `[cp_app][cp_slot]${index + 1}[/cp_slot][cp_name]App ${index + 1}[/cp_name][cp_icon]◇[/cp_icon][cp_tone]blue[/cp_tone][cp_badge]0[/cp_badge][cp_content][cp_row][cp_glyph]◇[/cp_glyph][cp_title]Row ${index + 1}[/cp_title][cp_meta]Meta[/cp_meta][cp_text]Text[/cp_text][/cp_row][/cp_content][/cp_app]`).join('')
const missingWallpaperPhone = `[character_phone][cp_presentation]sparkling[/cp_presentation][cp_owner]Han Minjae[/cp_owner][cp_subtitle]Private phone[/cp_subtitle][cp_time]09:47[/cp_time][cp_day]Monday[/cp_day][cp_battery]63[/cp_battery][cp_apps]${phoneApps}[/cp_apps][/character_phone]`
const normalizedPhone = normalizeNarrativeMarkupForRendering(missingWallpaperPhone)
assert(normalizedPhone.includes('[cp_battery]63[/cp_battery][cp_wallpaper][/cp_wallpaper][cp_apps]'), 'missing optional Phone wallpaper wrapper must be inserted at its canonical position')
assert((normalizeNarrativeMarkupForRendering(normalizedPhone).match(/\[cp_wallpaper\]/g) || []).length === 1, 'Phone wallpaper repair must be idempotent')
for (const variant of ['sparkle-button', 'plain-button'] as const) {
  const renderedPhone = renderNarrativeRegex(missingWallpaperPhone, variant, `phone-${variant}`)
  assert(!renderedPhone.includes('[character_phone]') && !renderedPhone.includes('[/character_phone]'), `${variant}: repaired Character Phone shell did not render`)
  assert(renderedPhone.includes(`<div class="rrcp-wrap rrcp-presentation-${variant === 'sparkle-button' ? 'sparkling' : 'plain'}">`) && renderedPhone.includes('class="rrcp-launch-toggle"'), `${variant}: supplied Character Phone presentation structure changed`)
}
const inlinePhone = renderNarrativeRegex(missingWallpaperPhone, 'inline', 'phone-inline')
assert(inlinePhone.includes('<div class="rrcp-wrap rrcp-presentation-inline"><div class="rrcp-shell">') && !inlinePhone.includes('class="rrcp-launch-toggle"'), 'Inline Character Phone must remain directly open without a launcher')
assert(inlinePhone.includes('.rrcp-wallpaper>.reverie-artifact-media') && inlinePhone.includes('height:100%!important') && inlinePhone.includes('object-fit:cover!important'), 'Character Phone wallpaper media must cover the complete fixed phone screen')
assert(!/\.rrcp-photo-media[^}]+object-fit:cover/i.test(inlinePhone), 'Phone wallpaper sizing must not force ordinary app photos to crop')
const hybridPhone = missingWallpaperPhone
  .replace(/\[cp_icon\]◇\[\/cp_icon\]/g, '[cp_icon]<svg viewBox="0 0 24 24"><path d="M2 2h20v20H2z"/></svg></cp_icon>')
  .replace(/\[cp_glyph\]◇\[\/cp_glyph\]/g, '[cp_glyph]<svg viewBox="0 0 24 24"><path d="M12 2v20"/></svg></cp_glyph>')
const normalizedHybridPhone = normalizeNarrativeMarkupForRendering(hybridPhone)
assert(!/<\/cp_(?:icon|glyph)>/i.test(normalizedHybridPhone) && normalizedHybridPhone.includes('[/cp_icon]') && normalizedHybridPhone.includes('[/cp_glyph]'), 'Character Phone must normalize mixed XML closers back to canonical bracket grammar')
const renderedHybridPhone = renderNarrativeRegex(hybridPhone, 'inline', 'phone-hybrid-svg-closers')
assert((renderedHybridPhone.match(/class="rrcp-entry /g) || []).length === 8, 'mixed SVG field closers must not prevent any Character Phone app from rendering')
assert(!/\[\/?cp_(?:app|slot|name|icon|tone|badge|content|row|glyph)\b/i.test(renderedHybridPhone), 'mixed SVG field closers must not leak raw Character Phone scaffolding')

const canonicalArchive = '<dossier_ui category="SECRET"><archive-head><icon>🤫</icon><name>Canonical Secret</name><state>PARTIAL</state><relation>A ↔ B</relation><role>Hidden act</role></archive-head><archive-stats><archive-stat><label>Exposure</label><value>75</value></archive-stat><archive-stat><label>Certainty</label><value>40</value></archive-stat><archive-stat><label>Consequence</label><value>90</value></archive-stat></archive-stats><archive-details><archive-row label="The Hidden Truth">Truth.</archive-row><archive-row label="Known By">A.</archive-row><archive-row label="Hidden From">B.</archive-row><archive-row label="Near-Slips">One clue.</archive-row><archive-row label="Impact If Revealed">Trust changes.</archive-row><archive-row label="Current Status">SLIPPING</archive-row></archive-details><archive-export>[SECRET: Canonical Secret]\nCURRENT STATUS: SLIPPING</archive-export></dossier_ui>'
assert(normalizeNarrativeMarkupForRendering(canonicalArchive) === canonicalArchive, 'canonical Archive Entry payloads must remain byte-for-byte unchanged')

const flatArchive = `<dossier_ui category="SECRET">
🤫
The Textbook Lie
SLIPPING
Minjae ↔ Arin
Exposed Act of Service
Exposure75
Certainty40
Consequence90
Minjae did not own a textbook. He gave Arin the absolute last copy in the campus store and lied about it.
Minjae Han.
Song Arin and the Psychology Cohort.
Arin noticing the empty shelf; Arin seeing him carrying the reserve copy.
The destruction of Minjae's plausible deniability regarding his feelings for her.
SLIPPING
[SECRET: The Textbook Lie]
THE HIDDEN TRUTH: Minjae gave Arin the final copy and lied about it.
CURRENT STATUS: SLIPPING
</dossier_ui>`
const normalizedFlatArchive = normalizeNarrativeMarkupForRendering(flatArchive)
assert(normalizedFlatArchive.includes('<archive-head>') && normalizedFlatArchive.includes('<state>PARTIAL</state>') && normalizedFlatArchive.includes('<archive-row label="The Hidden Truth">'), 'flat SECRET Archive drift must normalize into the canonical structured contract')
const renderedFlatArchive = renderNarrativeRegex(flatArchive, 'sparkle-button', 'flat-archive')
assert(renderedFlatArchive.includes('class="ra66"') && renderedFlatArchive.includes('The Textbook Lie') && renderedFlatArchive.includes('The Hidden Truth') && !renderedFlatArchive.includes('<dossier_ui'), 'normalized flat Archive Entry must render through the approved Dossier presentation')

const failedParallelFixture = `[PARALLEL|Campus and beyond|complication]
- First independent thread <parallel-media><!-- reverie-relay:image-error requestId="parallel-1" slot="thread_1" --><image_request_error id="parallel-1" target="custom.artifact-media" slot="thread_1" retryable="true">Image generation failed. Open Reverie Relay to retry.</image_request_error></parallel-media>
- Second independent thread <parallel-media><!-- reverie-relay:image-error requestId="parallel-2" slot="thread_2" --><image_request_error id="parallel-2" target="custom.artifact-media" slot="thread_2" retryable="true">Image generation failed. Open Reverie Relay to retry.</image_request_error></parallel-media>
- Third independent thread <parallel-media><!-- reverie-relay:image-error requestId="parallel-3" slot="thread_3" --><image_request_error id="parallel-3" target="custom.artifact-media" slot="thread_3" retryable="true">Image generation failed. Open Reverie Relay to retry.</image_request_error></parallel-media>
[/PARALLEL]`
assert(!shouldRelayRenderNarrativeMarkup(failedParallelFixture.replace(/<!--\s*(?:reverie-relay|dreamglass):image-error\b[\s\S]*?-->\s*<image_request_error\b[\s\S]*?<\/image_request_error>/gi, ''), 'legacy-regex'), 'healthy Regex Rendered Narrative markup must remain host-owned')
assert(shouldRelayRenderNarrativeMarkup(failedParallelFixture, 'legacy-regex'), 'failed Narrative media must enable the bounded Relay containment fallback in Regex Rendered mode')
const failedParallelNative = renderNativeSurfaceMarkup(failedParallelFixture, { definitions: {}, activePresetIds: {}, collectionPresets: {}, rendererMode: 'legacy-regex', defaultShellMode: 'sparkling', colorMode: 'realistic' } as any, { chatId: 'failed-parallel', messageId: 'failed-parallel', swipeId: 0 }).content
const failedParallelRendered = renderNarrativeRegex(failedParallelNative, 'sparkle-button', 'failed-parallel', { chatId: 'failed-parallel', swipeId: 0 })
assert(!failedParallelRendered.includes('[PARALLEL|') && !failedParallelRendered.includes('[/PARALLEL]'), 'failed media must not expose raw Parallel syntax after the Relay containment fallback')
assert((failedParallelRendered.match(/data-rrn-native-request="parallel-/g) || []).length === 3, 'failed Parallel media must retain three independently retryable lifecycle owners')

const parallelCanonical = `[PARALLEL|Campus and beyond|shifting]
- Soobin: one <parallel-media><image_request id="parallel-one" target="custom.artifact-media" slot="parallel-one" aspect="4:3"><scene_brief>Soobin waits outside the gym.</scene_brief></image_request></parallel-media>
- Hana: two <parallel-media><image_request id="parallel-two" target="custom.artifact-media" slot="parallel-two" aspect="4:3"><scene_brief>Hana reads a new message.</scene_brief></image_request></parallel-media>
- Jiyoon: three <parallel-media><image_request id="parallel-three" target="custom.artifact-media" slot="parallel-three" aspect="4:3"><scene_brief>Jiyoon crosses the courtyard.</scene_brief></image_request></parallel-media>
<parallel-context><trajectory>Three existing threads continue moving.</trajectory><intersection>The shared campus timing creates pressure.</intersection></parallel-context>
[/PARALLEL]`
const parallelCanonicalRendered = renderNarrativeRegex(parallelCanonical, 'sparkle-button', 'parallel-canonical')
assert(!parallelCanonicalRendered.includes('[PARALLEL|') && parallelCanonicalRendered.includes('Three existing threads continue moving.') && parallelCanonicalRendered.includes('The shared campus timing creates pressure.'), 'canonical Parallel context was not rendered')

const parallelMissingContext = parallelCanonical.replace(/\s*<parallel-context>[\s\S]*?<\/parallel-context>/, '')
const parallelMissingContextRendered = renderNarrativeRegex(parallelMissingContext, 'sparkle-button', 'parallel-old')
assert(!parallelMissingContextRendered.includes('[PARALLEL|') && parallelMissingContextRendered.includes('Soobin: one') && parallelMissingContextRendered.includes('Jiyoon: three'), 'old-format Parallel without context must retain all text entries')

const parallelEmptyMedia = parallelMissingContext.replace(/<parallel-media>[\s\S]*?<\/parallel-media>/g, '<parallel-media>  \n  </parallel-media>')
assert(!normalizeNarrativeMarkupForRendering(parallelEmptyMedia).includes('<parallel-media>  '), 'empty Parallel media whitespace was not normalized')
const parallelEmptyRendered = renderNarrativeRegex(parallelEmptyMedia, 'sparkle-button', 'parallel-empty')
assert(!parallelEmptyRendered.includes('[PARALLEL|') && (parallelEmptyRendered.match(/<article class="r65-thread">/g) || []).length === 3, 'empty Parallel media must degrade to three textual thread cards')

const lorebookFixtures = [
  { kind: 'cast-introduction', source: '[NPC:MAJOR|Lisa]\n<npc-media>portrait</npc-media>\nb: dancer\na: messy lavender hair, glasses\np: observant\n[/NPC]' },
  { kind: 'character-dossier', source: '[[npc Lisa|main]]<npc-media>portrait</npc-media>Identity and history.[[/npc]]' },
  { kind: 'location-file', source: '[[place Moon Pier]]<place-media>location</place-media>A quiet pier under moonlight.[[/place]]' },
]
for (const fixture of lorebookFixtures) {
  const rendered = renderNarrativeRegex(fixture.source, 'sparkle-button', 'lorebook-message', { chatId: 'chat-1', swipeId: 2 })
  assert(rendered.includes('Send to Lorebook'), `${fixture.kind}: eligible Narrative renderer must expose the Lorebook export action`)
  assert(rendered.includes(`data-rrn-lorebook-kind="${fixture.kind}"`) && rendered.includes('data-rrn-chat-id="chat-1"') && rendered.includes('data-rrn-swipe-id="2"'), `${fixture.kind}: Lorebook action must retain exact chat/message/swipe ownership`)
}
const duplicateDossiers = renderNarrativeRegex(`${lorebookFixtures[1].source}\n${lorebookFixtures[1].source.replace(/Lisa/g, 'Example B')}`, 'plain-button', 'two-dossiers', { chatId: 'chat-2', swipeId: 0 })
assert(duplicateDossiers.includes('data-rrn-lorebook-index="0"') && duplicateDossiers.includes('data-rrn-lorebook-index="1"'), 'multiple eligible Surfaces in one response must retain distinct export occurrences')

const root = path.resolve(new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'))
const backend = fs.readFileSync(path.join(root, 'src/backend.ts'), 'utf8')
const narrativeLorebook = fs.readFileSync(path.join(root, 'src/narrativeLorebook.ts'), 'utf8')
assert(backend.includes('const automaticNarrative = routerConfig.narrativeDlcEnabled') && backend.includes('buildResolvedNarrativeUtilityPrompt(routerConfig)'), 'Story Model interceptor must resolve Narrative Utilities through the runtime source path')
assert(backend.includes('await reconcileInstalledNarrativeOnStartup(userId)') && backend.includes("const inspected = await inspectNarrativeRegex(spindle.regex_scripts, variant, userId)") && backend.includes("await reconcileNarrativeRegex(spindle.regex_scripts, variant, userId)"), 'already-enabled Narrative installs must reconcile their owned Regex source once after an extension update')
assert(backend.includes("name: 'reverie_narrative'") && backend.includes('NARRATIVE_MACRO_MARKER'), 'placed Narrative macro path must be registered and expanded')
assert(backend.includes('renderNarrativeRegex(renderedContent, snapshot.narrativeVariant') && backend.includes('shouldRelayRenderNarrativeMarkup(source, renderContext.rendererMode)'), 'Relay/Hybrid must execute the isolated Narrative renderer and failed legacy Regex markup must use the bounded containment fallback')
assert(backend.includes("type: 'export_narrative_lorebook'") && narrativeLorebook.includes('reverie_relay_lorebook_chat_id') && narrativeLorebook.includes('chat_world_book_ids'), 'Lorebook export must create a chat-owned archive and preserve existing chat bindings')
assert(narrativeLorebook.includes('reverie_relay_source_message_id') && narrativeLorebook.includes('reverie_relay_source_swipe_id'), 'Lorebook entries must retain source message/swipe provenance')
assert(narrativeLorebook.includes('reverie_relay_surface_occurrence') && narrativeLorebook.includes('reverie_relay_source_fingerprint') && narrativeLorebook.includes('reverie_relay_version'), 'Lorebook entries must retain exact Surface provenance and Relay schema metadata')
assert(backend.includes('getDrawerTabs?.({ userId })') && backend.includes('ui.openDrawerTab(lorebookTab.id'), 'successful Lorebook export must discover and open the supported host Lorebook drawer')
assert(!fs.readFileSync(path.join(root, 'src/nativeSurfaces.ts'), 'utf8').includes('renderNarrativeRegex'), 'Narrative rendering must remain isolated from the 46 built-in Surface registry')
const frontend = fs.readFileSync(path.join(root, 'src/frontend.ts'), 'utf8')
for (const name of narrativeUtilityNames()) assert(frontend.includes(`'${name}'`), `${name}: Surface Library must expose an individual Narrative Utility toggle`)
assert(frontend.includes('View Exact Injected Prompt') && frontend.includes("type: 'surface_prompt_preview'"), 'Surface Library must expose combined exact prompt visibility')
const surfaceLibraryStart = frontend.indexOf('function renderSurfaceLibrary()')
const settingsStart = frontend.indexOf('function renderSettings()')
assert(surfaceLibraryStart > -1 && settingsStart > surfaceLibraryStart, 'Surface Library and Settings render boundaries must remain discoverable')
const librarySource = frontend.slice(surfaceLibraryStart, settingsStart)
assert(librarySource.includes("panelSection('Narrative Utilities', renderNarrativeUtilityCategory(config))"), 'Narrative Utilities must render inside the Surface Library')
assert(librarySource.indexOf('for (const category of categoryOrder)') < librarySource.indexOf("panelSection('Narrative Utilities'"), 'Narrative Utilities must appear after all original Surface categories')
assert(librarySource.indexOf('View Exact Injected Prompt') < librarySource.indexOf('for (const category of categoryOrder)'), 'combined prompt preview must remain above every Surface category')
assert(!frontend.includes('Inject FINAL Narrative Utilities') && !frontend.includes('complete FINAL Utility contract'), 'user-facing Surface controls must call them Narrative Utilities')
assert(!frontend.slice(settingsStart).includes("panelSection('Narrative Utilities'"), 'Narrative Utility controls must not remain in Settings')

console.log(`R4.6 Narrative runtime smoke passed: ${activeScriptCount} active-only owned scripts including Phone repair, Plot Sparks, and Dramatic Cutaway, accepted Regex display names, preserved Phone presentation, no disabled legacy installs, Relay/Hybrid rendering, combined prompt preview wiring, and 13 complete Narrative Utility injections.`)
