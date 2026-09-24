// @ts-nocheck -- local/mocked Narrative DLC host-integration regression gate.
import fs from 'node:fs'
import path from 'node:path'
import {
  NARRATIVE_DLC_FOLDER,
  NARRATIVE_DLC_NAMESPACE,
  NARRATIVE_DLC_VERSION,
  buildNarrativeUtilityPrompt,
  inspectNarrativeRegex,
  narrativeRegexCreateInput,
  reconcileNarrativeRegex,
  removeNarrativeRegex,
} from '../src/narrativeDlcRuntime'
import { LEGACY_NARRATIVE_UTILITY_NAME_MIGRATIONS, NARRATIVE_UTILITY_FORMAT_CONTRACTS, applyNarrativeDisplayNames, containsNarrativeRegexMarkup, missingNarrativeUtilityFormatMarkers, narrativeRegexPack, narrativeRegexScripts, narrativeUtilityItems, narrativeUtilityNames, normalizeNarrativeMarkupForRendering, renderNarrativeRegex, shouldRelayRenderNarrativeMarkup } from '../src/narrativeRegexAssets'
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
for (const migrationId of ['rrcp_migrate_photo_v461', 'rrcp_migrate_app_v461', 'rrcp_migrate_shell_present_v461', 'rrcp_migrate_shell_default_v461']) {
  assert(api.rows.some(row => row.script_id === migrationId), `Character Phone legacy migration script missing: ${migrationId}`)
}

const retiredRegexLabels = ['Character File', 'Cast Arrival', 'Unified Archive', 'Place File', 'Knowledge Veil', 'Beyond the Frame', 'Parallel Current', 'Scene Compass', 'World Texture', 'Unwalked Path']
const acceptedRegexLabels = ['Character Dossier', 'Cast Introduction', 'Archive Entry', 'Location File', 'Backstage Secrets', 'Off-Stage', 'Parallel Scene', 'Scene Shift', 'Setting the Scene', 'In Another Life']
for (const variant of ['sparkle-button', 'plain-button', 'inline', 'glass'] as const) {
  const sourcePresentation = JSON.stringify(narrativeRegexPack(variant).scripts.filter(script => script.disabled !== true).map(script => ({ name: script.name, replace_string: script.replace_string })))
  for (const label of retiredRegexLabels) assert(!sourcePresentation.includes(label), `${variant}: retired label ${label} remains embedded in the active Regex source`)
  for (const label of acceptedRegexLabels) assert(sourcePresentation.includes(label), `${variant}: accepted label ${label} is missing from the active Regex source`)
  assert(sourcePresentation.includes('Introducing...') && sourcePresentation.includes('Welcome to the Stage...'), `${variant}: accepted special launcher labels are missing from the active Regex source`)
}
assert(api.rows.some(row => row.name.includes('Parallel Scene')) && !api.rows.some(row => row.name.includes('Parallel Current')), 'installed host Regex scripts must use the current public Narrative labels')
const installedNarrativeCopy = api.rows.map(row => `${row.name}\n${row.replace_string}`).join('\n')
for (const [oldName, currentName] of Object.entries(LEGACY_NARRATIVE_UTILITY_NAME_MIGRATIONS)) {
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

const glassColor = await reconcileNarrativeRegex(api as any, 'plain-button', undefined, 'glass')
const installedGlassPlotSparks = api.rows.find(row => row.script_id === 'ria_plot_sparks_og_sparkle_tabs_bulletproof_v7')
assert(glassColor.status === 'healthy' && installedGlassPlotSparks?.replace_string.includes('data-reverie-glass-authority="narrative-glass"'), 'installed Plot Sparks Regex must receive the Glass Color Mode makeover, not only Relay direct rendering')
assert(api.rows.every(row => row.metadata.reverie_narrative_color_mode === 'glass'), 'installed Narrative scripts must record and reconcile the selected Color Mode')
await reconcileNarrativeRegex(api as any, 'plain-button')

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
assert(NARRATIVE_DLC_VERSION === '6.3-final', 'Character Phone gallery contract must ship as Narrative Utility pack 6.3-final')
assert(utility.utilityNames.length === 13, 'all 13 Narrative Utilities must be selected by default')
assert(utility.utilityNames.join('|') === 'Character Phone|Dramatic Cutaway|Plot Sparks|Scene Shift|Parallel Scene|Cast Introduction|Backstage Secrets|Setting the Scene|Off-Stage|Character Dossier|Location File|In Another Life|Archive Entry', 'active Narrative Utility roster must contain only current names')
assert(utility.utilityNames.join('|') === narrativeUtilityNames().join('|'), 'Utility injection order must match the source bundle')
for (const item of narrativeUtilityItems()) {
  assert(utility.content.includes(applyNarrativeDisplayNames(item.loomContent)), `${item.loomName}: final prompt injection must preserve the complete source Utility instructions under its public label`)
  assert(Object.prototype.hasOwnProperty.call(NARRATIVE_UTILITY_FORMAT_CONTRACTS, item.loomName), `${item.loomName}: canonical format contract is missing`)
  assert(missingNarrativeUtilityFormatMarkers(item.loomName, item.loomContent).length === 0, `${item.loomName}: shipped Utility format does not match its Regex contract`)
}
for (const oldName of Object.keys(LEGACY_NARRATIVE_UTILITY_NAME_MIGRATIONS)) {
  assert(!narrativeUtilityNames().includes(oldName), `retired Utility name remains in the active roster: ${oldName}`)
  assert(!narrativeUtilityItems().some(item => item.loomContent.includes(oldName)), `runtime Utility content retained retired model-facing name: ${oldName}`)
  assert(!utility.content.includes(oldName), `combined Narrative prompt retained retired model-facing name: ${oldName}`)
}
assert(utility.content.includes('[reverie_narrative_utility]') && utility.content.includes('[contract]narrative[/contract]'), 'Narrative Utility wrapper must use bracket-native Narrative contract fields')
const archiveUtility = buildNarrativeUtilityPrompt(['Archive Entry'])
for (const contract of ['[archive_media]', 'aspect="1:1"', 'aspect="4:3"', 'aspect="16:9"', 'VISUAL SUBJECT ONLY', 'Legacy Archive payloads may omit [archive_media]']) {
  assert(archiveUtility.content.includes(contract), `Archive media Utility contract missing: ${contract}`)
}
assert(archiveUtility.content.includes('[/archive_head]\n[archive_media]') && archiveUtility.content.includes('[/archive_media]\n[archive_stats]'), 'new Archive Utility output must place media between head and stats')
assert(!archiveUtility.content.includes('Archive cards are intentionally image-free'), 'retired image-free Archive rule leaked into the runtime Utility prompt')
const plotSparksUtility = buildNarrativeUtilityPrompt(['Plot Sparks'])
assert(plotSparksUtility.utilityNames.join('|') === 'Plot Sparks', 'Plot Sparks must be the active selection and roster key')
for (const contract of [
  'seven possible NEXT BRANCHES growing directly from the current scene',
  'Every Plot Spark MUST preserve the current scene as its launch point',
  'This can happen next because',
  'current location unless the next action naturally exits it',
  'current time',
  'current knowledge boundaries',
  'current emotional state',
  'current object state',
  'Place [Plot_Sparks] after the main narrative content for the response.',
]) {
  assert(plotSparksUtility.content.includes(contract), `model-facing Plot Sparks continuation contract missing: ${contract}`)
}
for (const removed of [
  'At least FIVE of seven',
  'at least 6 distinct causal domains',
  'No more than TWO',
  'new causal source',
  'approach from another layer of reality',
]) {
  assert(!plotSparksUtility.content.includes(removed), `retired anti-continuation Plot Sparks rule leaked into runtime prompt: ${removed}`)
}
for (const token of ['[Plot_Sparks]', '[Spark]', '[Text]', '[Media]', '<reverie-illustration', 'detonation', 'heartknife', 'wrongness', 'crash-in', 'matchstrike', 'reputation-fire', 'wildcard-collision']) {
  assert(plotSparksUtility.content.includes(token), `Plot Sparks bracket renderer/image contract changed: ${token}`)
}
for (const exactCount of ['Exactly seven [Spark] blocks exist', 'Each Spark contains exactly one non-empty [Media]', 'Exactly seven <reverie-illustration> blocks exist']) {
  assert(plotSparksUtility.content.includes(exactCount), `Plot Sparks must retain its seven-image structural requirement: ${exactCount}`)
}
for (const forbidden of ['hook ledger', 'chaos payload', 'chaos_payload', 'chaos hook', 'chaos_hook', 'hook_text', 'hook_media', '<payload>', 'two-ledger']) {
  assert(!plotSparksUtility.content.toLocaleLowerCase().includes(forbidden), `active Plot Sparks Utility leaked legacy/cross-system terminology: ${forbidden}`)
}
const subset = buildNarrativeUtilityPrompt(['Scene Shift', 'Character Phone'])
assert(subset.utilityNames.join('|') === 'Character Phone|Scene Shift', 'selected Utility prompt must preserve source order and contain only enabled contracts')
assert(subset.content.includes(applyNarrativeDisplayNames(narrativeUtilityItems()[0].loomContent)) && subset.content.includes(applyNarrativeDisplayNames(narrativeUtilityItems()[3].loomContent)), 'selected Utility prompt omitted enabled complete contracts')
assert(!subset.content.includes(narrativeUtilityItems()[1].loomContent), 'selected Utility prompt leaked a disabled contract')

const dramaticFixture = '[dramatic_parallel][dramatic_head]LOCATION:Roof • TIME:Night • PRESSURE:Secret[/dramatic_head][dramatic_media]<reverie-illustration request="generate" slot="dramatic-cutaway-test" aspect="16:9" cast="none"><visual_prompt>Rain crossing an empty rooftop.</visual_prompt></reverie-illustration>[/dramatic_media][dramatic_body][paragraph]A door opened.[/paragraph][paragraph]The evidence changed hands.[/paragraph][/dramatic_body][dramatic_foot]STATUS: OFFSCREEN • PRESSURE: LIVE • FIREWALL: ACTIVE[/dramatic_foot][/dramatic_parallel]'
assert(containsNarrativeRegexMarkup(dramaticFixture), 'Relay Narrative detection must include bracket-native Dramatic Cutaway')
const dramaticRendered = renderNarrativeRegex(dramaticFixture, 'sparkle-button', 'dramatic-runtime')
assert(dramaticRendered.includes('dg-dramatic-cutaway') && !dramaticRendered.includes('[dramatic_parallel]'), 'approved Dramatic Cutaway renderer must execute in the shared Narrative adapter')
assert(dramaticRendered.includes('data-reverie-narrative-media-compat="1"'), 'Dramatic Cutaway must install the shared resolved-media compatibility sizing')
assert(dramaticRendered.includes('data-reverie-narrative-block-spacing="1"') && dramaticRendered.includes('{margin:6px auto!important}'), 'Narrative launcher roots must preserve one compact, uniform gutter between adjacent Surface cards')
for (const owner of ['dg-dramatic-media', 'r65-media', 'rv6-media', 'ru-media', 'ru-portrait', 'ru-secret-media', 'ru-thread-media', 'ra66-archive-media', 'rrcp-media', 'rrcp-photo-media', 'rrcp-wallpaper']) {
  assert(dramaticRendered.includes(owner), `${owner}: shared Narrative media compatibility coverage is missing`)
  assert(dramaticRendered.includes(`.${owner}>.rrl-island`), `${owner}: unresolved Relay lifecycle islands are not forced visible at full owner width`)
}
assert(dramaticRendered.includes('.r65-thread>.r65-media:not(:has(image_request,image_request_error,img,.reverie-artifact-media,.rrl-island,.rrl-media-slot,[data-reverie-lifecycle-card]))'), 'Parallel media still hides its unresolved lifecycle reservation')
assert(dramaticRendered.includes('>.rrl-island{display:block!important;width:100%!important;max-width:100%!important;min-width:0!important;margin:0!important}'), 'Narrative lifecycle reservations lost stable full-width sizing')
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
const plotSparksFixture = `[Plot_Sparks][ID]nightmare_sat_02x[/ID][Lifecycle]Unused Plot Sparks dissolve after this response.[/Lifecycle]${plotVectors.map((vector, index) => `[Spark][Key]${String.fromCharCode(97 + index)}[/Key][Vector]${vector}[/Vector][Text]Independent plot spark ${index + 1}.[/Text][Media]image-${index + 1}[/Media][/Spark]`).join('')}[/Plot_Sparks]`
assert(containsNarrativeRegexMarkup(plotSparksFixture), 'Relay Narrative detection must include Plot Sparks semantic markup')
const plotSparksRendered = renderNarrativeRegex(plotSparksFixture, 'sparkle-button', 'plot-sparks-runtime')
assert(plotSparksRendered.includes('ch-og') && plotSparksRendered.includes('Plot Sparks') && !plotSparksRendered.includes('Chaos Hooks') && !plotSparksRendered.includes('[Plot_Sparks]'), 'approved Plot Sparks renderer must consume bracket payload IDs and expose only its accepted launcher label')

const phoneMessageFixture = `[cp_msg][cp_side]other[/cp_side][cp_name]Mom[/cp_name][cp_time]03:56[/cp_time][cp_text]Please call when you get home. The long wrapped message needs to remain readable.[/cp_text][/cp_msg][cp_msg][cp_side]self[/cp_side][cp_name]Han[/cp_name][cp_time]03:57[/cp_time][cp_text]I will. I saved the reference beside this note.<image_request id="phone-message-media" target="custom.artifact-media" slot="phone-message-media" aspect="4:3"><scene_brief>Phone message attachment.</scene_brief></image_request>Still readable after the media.[/cp_text][/cp_msg]`
const phoneApps = Array.from({ length: 8 }, (_, index) => `[cp_app][cp_slot]${index + 1}[/cp_slot][cp_name]App ${index + 1}[/cp_name][cp_icon]◇[/cp_icon][cp_tone]blue[/cp_tone][cp_badge]0[/cp_badge][cp_content]${index === 0 ? phoneMessageFixture : '[cp_row][cp_glyph]◇[/cp_glyph][cp_title]Row ' + (index + 1) + '[/cp_title][cp_meta]Meta[/cp_meta][cp_text]Text[/cp_text][/cp_row]'}[/cp_content][/cp_app]`).join('')
const missingWallpaperPhone = `[character_phone][cp_presentation]sparkling[/cp_presentation][cp_owner]Han Minjae[/cp_owner][cp_subtitle]Private phone[/cp_subtitle][cp_time]09:47[/cp_time][cp_day]Monday[/cp_day][cp_battery]63[/cp_battery][cp_apps]${phoneApps}[/cp_apps][/character_phone]`
const normalizedPhone = normalizeNarrativeMarkupForRendering(missingWallpaperPhone)
assert(normalizedPhone.includes('[cp_battery]63[/cp_battery][cp_wallpaper][/cp_wallpaper][cp_apps]'), 'missing optional Phone wallpaper wrapper must be inserted at its canonical position')
assert((normalizeNarrativeMarkupForRendering(normalizedPhone).match(/\[cp_wallpaper\]/g) || []).length === 1, 'Phone wallpaper repair must be idempotent')
for (const variant of ['sparkle-button', 'plain-button'] as const) {
  const renderedPhone = renderNarrativeRegex(missingWallpaperPhone, variant, `phone-${variant}`)
  assert(!renderedPhone.includes('[character_phone]') && !renderedPhone.includes('[/character_phone]'), `${variant}: repaired Character Phone shell did not render`)
  assert(new RegExp(`<div class="rrcp-wrap rrcp-presentation-${variant === 'sparkle-button' ? 'sparkling' : 'plain'} rr-surface-presentation-${variant === 'sparkle-button' ? 'sparkling' : 'button'}">`).test(renderedPhone) && renderedPhone.includes('class="rrcp-launch-toggle"'), `${variant}: supplied Character Phone presentation structure changed`)
}
const normalGlassButtonPhone = renderNarrativeRegex(missingWallpaperPhone, 'glass', 'phone-glass-button-runtime', {}, 'realistic')
assert(normalGlassButtonPhone.includes('rrcp-presentation-glass') && normalGlassButtonPhone.includes('data-reverie-narrative-glass-button="1"') && !normalGlassButtonPhone.includes('data-reverie-glass-authority="narrative-glass"'), 'Glass Button must preserve the normal Character Phone body when Color Mode is realistic')
const glassPhone = renderNarrativeRegex(missingWallpaperPhone, 'glass', 'phone-glass-runtime', {}, 'glass')
assert(glassPhone.includes('rrcp-presentation-glass') && glassPhone.includes('data-reverie-glass-authority="narrative-glass"'), 'glass: supplied Character Phone did not use its standalone Glass shell')
assert(glassPhone.includes('rrcp-msg-self') && glassPhone.includes('rrcp-msg-other') && glassPhone.includes('Mom') && glassPhone.includes('03:56') && glassPhone.includes('03:57'), 'Glass Character Phone fixture must render both message sides, sender labels, and timestamps')
assert(glassPhone.includes('long wrapped message needs to remain readable') && glassPhone.includes('phone-message-media') && glassPhone.includes('Still readable after the media.'), 'Glass Character Phone fixture must retain wrapped text and media-adjacent text')
assert(glassPhone.includes('--rrcp-glass-readable-text') && glassPhone.includes('.rrcp-msg-bubble :where(p,span,b,strong,em,a,small,time){color:inherit!important;opacity:1!important}'), 'Glass Character Phone must preserve the readable nested-text contract after Regex rendering')
const inlinePhone = renderNarrativeRegex(missingWallpaperPhone, 'inline', 'phone-inline')
assert(inlinePhone.includes('<div class="rrcp-wrap rrcp-presentation-inline rr-surface-presentation-inline"><div class="rrcp-shell">') && !inlinePhone.includes('class="rrcp-launch-toggle"'), 'Inline Character Phone must remain directly open without a launcher')
assert(inlinePhone.includes('.rrcp-wallpaper>.reverie-artifact-media') && inlinePhone.includes('height:100%!important') && inlinePhone.includes('object-fit:cover!important'), 'Character Phone wallpaper media must cover the complete fixed phone screen')
assert(!/\.rrcp-photo-media[^}]+object-fit:cover/i.test(inlinePhone), 'Phone wallpaper sizing must not force ordinary app photos to crop')
const galleryPhotos = ['Workbench candid', 'Saved relationship moment', 'Practical reference'].map((title, index) => `[cp_photo][cp_title]${title}[/cp_title][cp_meta]Today · Workshop[/cp_meta][cp_media]<image_request id="phone-gallery-${index + 1}" target="custom.artifact-media" slot="phone-gallery-${index + 1}" aspect="4:3"><scene_brief>${title}, grounded in current continuity.</scene_brief></image_request>[/cp_media][/cp_photo]`).join('')
const galleryApps = `[cp_app][cp_slot]1[/cp_slot][cp_name]Photos[/cp_name][cp_icon]◇[/cp_icon][cp_tone]photos[/cp_tone][cp_badge]0[/cp_badge][cp_content]${galleryPhotos}[/cp_content][/cp_app]${Array.from({ length: 7 }, (_, index) => `[cp_app][cp_slot]${index + 2}[/cp_slot][cp_name]App ${index + 2}[/cp_name][cp_icon]◇[/cp_icon][cp_tone]blue[/cp_tone][cp_badge]0[/cp_badge][cp_content][cp_row][cp_glyph]◇[/cp_glyph][cp_title]Row ${index + 2}[/cp_title][cp_meta]Meta[/cp_meta][cp_text]Text[/cp_text][/cp_row][/cp_content][/cp_app]`).join('')}`
const galleryPhone = `[character_phone][cp_presentation]sparkling[/cp_presentation][cp_owner]Han Minjae[/cp_owner][cp_subtitle]Recent camera roll[/cp_subtitle][cp_time]09:47[/cp_time][cp_day]Monday[/cp_day][cp_battery]63[/cp_battery][cp_wallpaper][/cp_wallpaper][cp_apps]${galleryApps}[/cp_apps][/character_phone]`
for (const variant of ['sparkle-button', 'plain-button', 'inline', 'glass'] as const) {
  const renderedGallery = renderNarrativeRegex(galleryPhone, variant, `phone-gallery-${variant}`)
  assert((renderedGallery.match(/class="rrcp-photo"/g) || []).length === 3, `${variant}: Character Phone must preserve and render all three cp_photo entries`)
  assert((renderedGallery.match(/class="rrcp-photo-media"/g) || []).length === 3, `${variant}: every rendered gallery entry must retain its media container`)
  const captions = ['Workbench candid', 'Saved relationship moment', 'Practical reference'].map(caption => renderedGallery.indexOf(caption))
  assert(captions.every(index => index >= 0) && captions[0] < captions[1] && captions[1] < captions[2], `${variant}: Character Phone gallery order changed`)
}
const legacyApps = Array.from({ length: 8 }, (_, index) => `[phone_app][slot]${index + 1}[/slot][name]Legacy ${index + 1}[/name][icon]◇[/icon][tone]blue[/tone][badge]0[/badge][content][pp_row][glyph]◇[/glyph][title]Legacy row ${index + 1}[/title][meta]Meta[/meta][pp_text]Text[/pp_text][/pp_row][/content][/phone_app]`).join('')
const legacyPhone = `[private_phone][presentation]inline[/presentation][owner]Legacy Owner[/owner][subtitle]Migrated phone[/subtitle][time]09:47[/time][day]Monday[/day][battery]63[/battery][wallpaper][/wallpaper][apps]${legacyApps}[/apps][/private_phone]`
const renderedLegacyPhone = renderNarrativeRegex(legacyPhone, 'inline', 'phone-legacy-migration')
assert((renderedLegacyPhone.match(/class="rrcp-entry /g) || []).length === 8 && !/\[\/?(?:private_phone|phone_app|pp_row)\b/i.test(renderedLegacyPhone), 'legacy private_phone, phone_app, generic field, and pp_* migration must still render all eight apps')
const hybridPhone = missingWallpaperPhone
  .replace(/\[cp_icon\]◇\[\/cp_icon\]/g, '[cp_icon]<svg viewBox="0 0 24 24"><path d="M2 2h20v20H2z"/></svg></cp_icon>')
  .replace(/\[cp_glyph\]◇\[\/cp_glyph\]/g, '[cp_glyph]<svg viewBox="0 0 24 24"><path d="M12 2v20"/></svg></cp_glyph>')
const normalizedHybridPhone = normalizeNarrativeMarkupForRendering(hybridPhone)
assert(!/<\/cp_(?:icon|glyph)>/i.test(normalizedHybridPhone) && normalizedHybridPhone.includes('[/cp_icon]') && normalizedHybridPhone.includes('[/cp_glyph]'), 'Character Phone must normalize mixed XML closers back to canonical bracket grammar')
const renderedHybridPhone = renderNarrativeRegex(hybridPhone, 'inline', 'phone-hybrid-svg-closers')
assert((renderedHybridPhone.match(/class="rrcp-entry /g) || []).length === 8, 'mixed SVG field closers must not prevent any Character Phone app from rendering')
assert(!/\[\/?cp_(?:app|slot|name|icon|tone|badge|content|row|glyph)\b/i.test(renderedHybridPhone), 'mixed SVG field closers must not leak raw Character Phone scaffolding')
const xmlRootHybridPhone = hybridPhone
  .replace(/^\[character_phone\]/, '<character_phone>')
  .replace(/\[\/character_phone\]$/, '</character_phone>')
const normalizedXmlRootPhone = normalizeNarrativeMarkupForRendering(xmlRootHybridPhone)
assert(normalizedXmlRootPhone.startsWith('[character_phone]') && normalizedXmlRootPhone.endsWith('[/character_phone]'), 'complete XML Character Phone roots must normalize to the canonical bracket root')
assert(!/<\/?character_phone\b|<\/cp_(?:icon|glyph)>/i.test(normalizedXmlRootPhone), 'XML-root Character Phone normalization must consume the observed hybrid root and field closers')
const renderedXmlRootPhone = renderNarrativeRegex(xmlRootHybridPhone, 'inline', 'phone-xml-root-hybrid')
assert((renderedXmlRootPhone.match(/class="rrcp-entry /g) || []).length === 8 && !/<\/?character_phone\b|\[\/?cp_/i.test(renderedXmlRootPhone), 'captured XML-root Character Phone drift must render all eight apps without raw scaffold')
assert(normalizeNarrativeMarkupForRendering('<character_phone>[cp_owner]streaming') === '<character_phone>[cp_owner]streaming', 'incomplete streaming phone roots must remain untouched')
const mixedResolvedPlot = `[Plot_Sparks][ID]captured-terrace[/ID][Lifecycle]Unused Plot Sparks dissolve after this response.[/Lifecycle]${plotVectors.map((vector, index) => {
  const key = String.fromCharCode(97 + index)
  const media = index < 2
    ? `<img src="/api/v1/image-gen/results/spark-${key}" class="reverie-artifact-media" data-reverie-artifact-media="true">`
    : `<reverie-illustration request="generate" slot="plot-spark-${key}" aspect="16:9" cast="none" alt="Spark ${key}"><visual_prompt>Grounded continuation ${key}.</visual_prompt></reverie-illustration>`
  return `[Spark][Key]${key}[/Key][Vector]${vector}[/Vector][Text]Captured continuation ${key}.[/Text][Media]${media}[/Media][/Spark]`
}).join('')}[/Plot_Sparks]`
const capturedCombined = `${xmlRootHybridPhone}\n${dramaticFixture.replace(dramaticRequest.fullMatch, resolvedDramaticMedia)}\n${mixedResolvedPlot}`
const capturedCombinedRendered = renderNarrativeRegex(capturedCombined, 'inline', 'captured-combined-regression')
assert(!/<\/?(?:character_phone|dramatic_parallel)\b|\[\/?(?:cp_|Plot_Sparks|Spark|Media)/i.test(capturedCombinedRendered), 'captured Phone, Dramatic Cutaway, and Plot Sparks response must not leak semantic roots or phone scaffold')
assert(capturedCombinedRendered.includes('rrcp-wrap') && capturedCombinedRendered.includes('dg-dramatic-cutaway') && capturedCombinedRendered.includes('ch-og'), 'captured mixed response must render Phone, Dramatic Cutaway, and Plot Sparks together')
assert(capturedCombinedRendered.includes('/api/v1/image-gen/results/spark-a') && capturedCombinedRendered.includes('<reverie-illustration request="generate" slot="plot-spark-g"'), 'Plot Sparks must retain both already-resolved and still-pending media inside its rendered lanes')

const canonicalArchive = '[dossier_ui][category]SECRET[/category][archive_head][icon]🤫[/icon][name]Canonical Secret[/name][state]PARTIAL[/state][relation]A ↔ B[/relation][role]Hidden act[/role][/archive_head][archive_stats][archive_stat][label]Exposure[/label][value]75[/value][/archive_stat][archive_stat][label]Certainty[/label][value]40[/value][/archive_stat][archive_stat][label]Consequence[/label][value]90[/value][/archive_stat][/archive_stats][archive_details][archive_row][label]The Hidden Truth[/label][value]Truth.[/value][/archive_row][archive_row][label]Known By[/label][value]A.[/value][/archive_row][archive_row][label]Hidden From[/label][value]B.[/value][/archive_row][archive_row][label]Near-Slips[/label][value]One clue.[/value][/archive_row][archive_row][label]Impact If Revealed[/label][value]Trust changes.[/value][/archive_row][archive_row][label]Current Status[/label][value]SLIPPING[/value][/archive_row][/archive_details][archive_export][SECRET: Canonical Secret]\nCURRENT STATUS: SLIPPING[/archive_export][/dossier_ui]'
assert(normalizeNarrativeMarkupForRendering(canonicalArchive) === canonicalArchive, 'canonical Archive Entry payloads must remain byte-for-byte unchanged')

for (const variant of ['sparkle-button', 'plain-button', 'inline', 'glass'] as const) {
  const renderedLegacyArchive = renderNarrativeRegex(canonicalArchive, variant, `archive-legacy-${variant}`)
  assert(renderedLegacyArchive.includes('class="ra66-archive-media" data-archive-media></div>') && renderedLegacyArchive.includes('.ra66-archive-media:empty{display:none}'), `${variant}: legacy text-only Archive must render without a media gap`)
  assert(renderedLegacyArchive.includes('data-archive-category="SECRET"') && renderedLegacyArchive.includes('class="ra66-export" readonly'), `${variant}: legacy Archive category/export behavior changed`)
  assert(!renderedLegacyArchive.includes('[dossier_ui]'), `${variant}: bracket-native Archive without media did not render`)
}

const archiveCategories = ['CHARACTER', 'LOCATION', 'ITEM', 'FACTION', 'EVENT', 'RELATIONSHIP', 'SECRET'] as const
const archiveAspect = { CHARACTER: '1:1', LOCATION: '16:9', ITEM: '4:3', FACTION: '16:9', EVENT: '16:9', RELATIONSHIP: '16:9', SECRET: '16:9' } as const
const archiveFixture = (category: typeof archiveCategories[number]) => `[dossier_ui][category]${category}[/category][archive_head][icon]◇[/icon][name]${category} Record[/name][state]UNLOCKED[/state][relation]Established relation[/relation][role]Established role[/role][/archive_head][archive_media]<image_request id="archive-${category.toLowerCase()}-test" target="custom.artifact-media" slot="archive-${category.toLowerCase()}-test" aspect="${archiveAspect[category]}" alt="${category} archive visual"><scene_brief>One established ${category.toLowerCase()} visual subject. No UI or readable text.</scene_brief></image_request>[/archive_media][archive_stats][archive_stat][label]First[/label][value]25[/value][/archive_stat][archive_stat][label]Second[/label][value]50[/value][/archive_stat][archive_stat][label]Third[/label][value]75[/value][/archive_stat][/archive_stats][archive_details][archive_row][label]Identity[/label][value]Established detail.[/value][/archive_row][/archive_details][archive_export][${category}: Record]\nIdentity: Established detail.[/archive_export][/dossier_ui]`
for (const variant of ['sparkle-button', 'plain-button', 'inline', 'glass'] as const) {
  for (const category of archiveCategories) {
    const renderedArchive = renderNarrativeRegex(archiveFixture(category), variant, `archive-${variant}-${category.toLowerCase()}`)
    assert(renderedArchive.includes(`data-archive-category="${category}"`), `${variant}/${category}: canonical category signal did not survive Archive rendering`)
    assert(renderedArchive.includes('class="ra66-archive-media" data-archive-media>') && renderedArchive.includes(`id="archive-${category.toLowerCase()}-test"`), `${variant}/${category}: shared Archive media seam did not preserve the image request`)
    assert(renderedArchive.includes(`[data-archive-category="${category}"] .ra66-archive-media`), `${variant}/${category}: category-specific Archive media selector is unavailable`)
    assert(renderedArchive.includes('data-reverie-narrative-media-compat="1"') && !renderedArchive.includes('[dossier_ui]'), `${variant}/${category}: Archive media did not activate the shared hydration compatibility path`)
  }
  const representativeArchive = renderNarrativeRegex(archiveFixture('CHARACTER') + archiveFixture('LOCATION') + archiveFixture('ITEM'), variant, `archive-representative-${variant}`)
  assert((representativeArchive.match(/class="ra66-archive-media"/g) || []).length === 3, `${variant}: representative Character, Location, and Item media did not all render`)
  assert(representativeArchive.includes('grid-template-columns:minmax(160px,200px)') && representativeArchive.includes('[data-archive-category="ITEM"] .ra66-archive-media img{object-fit:contain}'), `${variant}: Character portrait split or Item contain selector is unavailable`)
  assert(representativeArchive.includes('@media(max-width:600px)') && representativeArchive.includes('[data-archive-category="CHARACTER"] .ra66-upper:has(.ra66-archive-media:not(:empty)){display:block}'), `${variant}: narrow-screen Character stacking rule is unavailable`)
}
const resolvedArchiveRequest = parseImageRequests(archiveFixture('ITEM'))[0]
assert(resolvedArchiveRequest?.target === 'custom.artifact-media' && resolvedArchiveRequest.aspect === '4:3', 'Archive Item fixture must use the parsed shared artifact-media lane')
const resolvedArchiveMedia = renderResolvedMarkup({
  chatId: 'chat-archive', messageId: 'message-archive', swipeId: 0,
  requestId: resolvedArchiveRequest.id, target: resolvedArchiveRequest.target, slots: [resolvedArchiveRequest.slot],
  count: 1, alt: 'Archive item image', originalSceneBrief: resolvedArchiveRequest.prompt,
}, [{ slot: resolvedArchiveRequest.slot, imageId: 'archive-item-image', imageUrl: '/api/v1/image-gen/results/archive-item-image' }])
const hydratedArchive = renderNarrativeRegex(archiveFixture('ITEM').replace(resolvedArchiveRequest.fullMatch, resolvedArchiveMedia), 'inline', 'archive-item-hydrated')
assert(hydratedArchive.includes('class="reverie-artifact-media"') && hydratedArchive.includes('/api/v1/image-gen/results/archive-item-image'), 'hydrated Archive image must survive inside the rendered media owner')
assert(hydratedArchive.includes('.ra66-archive-media{min-width:0!important;max-width:100%!important;overflow:hidden!important}') && hydratedArchive.includes('object-fit:contain!important'), 'hydrated Archive media compatibility must prevent overflow and preserve the Item contain path')

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
assert(normalizedFlatArchive.includes('[archive_head]') && normalizedFlatArchive.includes('[state]PARTIAL[/state]') && normalizedFlatArchive.includes('[archive_row][label]The Hidden Truth[/label]'), 'flat SECRET Archive drift must normalize into the canonical bracket contract')
assert(!normalizedFlatArchive.includes('[archive_media]'), 'flat legacy Archive normalization must not fabricate archive media')
const renderedFlatArchive = renderNarrativeRegex(flatArchive, 'sparkle-button', 'flat-archive')
assert(renderedFlatArchive.includes('class="ra66 ') && renderedFlatArchive.includes('The Textbook Lie') && renderedFlatArchive.includes('The Hidden Truth') && !renderedFlatArchive.includes('[dossier_ui]'), 'normalized flat Archive Entry must render through the approved Dossier presentation')

const failedParallelFixture = `[PARALLEL|Campus and beyond|complication]
[parallel_entry][text]First independent thread[/text][parallel_media]<!-- reverie-relay:image-error requestId="parallel-1" slot="thread_1" --><image_request_error id="parallel-1" target="custom.artifact-media" slot="thread_1" retryable="true">Image generation failed. Open Reverie Relay to retry.</image_request_error>[/parallel_media][/parallel_entry]
[parallel_entry][text]Second independent thread[/text][parallel_media]<!-- reverie-relay:image-error requestId="parallel-2" slot="thread_2" --><image_request_error id="parallel-2" target="custom.artifact-media" slot="thread_2" retryable="true">Image generation failed. Open Reverie Relay to retry.</image_request_error>[/parallel_media][/parallel_entry]
[parallel_entry][text]Third independent thread[/text][parallel_media]<!-- reverie-relay:image-error requestId="parallel-3" slot="thread_3" --><image_request_error id="parallel-3" target="custom.artifact-media" slot="thread_3" retryable="true">Image generation failed. Open Reverie Relay to retry.</image_request_error>[/parallel_media][/parallel_entry]
[parallel_context][trajectory]Three failed image jobs remain independently retryable.[/trajectory][intersection]Their shared timing still creates pressure.[/intersection][/parallel_context]
[/PARALLEL]`
assert(shouldRelayRenderNarrativeMarkup(failedParallelFixture.replace(/<!--\s*(?:reverie-relay|dreamglass):image-error\b[\s\S]*?-->\s*<image_request_error\b[\s\S]*?<\/image_request_error>/gi, ''), 'legacy-regex'), 'Regex Rendered Narrative markup must use Relay bundled rendering without waiting for host Regex hydration')
assert(shouldRelayRenderNarrativeMarkup(failedParallelFixture, 'legacy-regex'), 'failed Narrative media must remain Relay-owned in Regex Rendered mode')
const failedParallelNative = renderNativeSurfaceMarkup(failedParallelFixture, { definitions: {}, activePresetIds: {}, collectionPresets: {}, rendererMode: 'legacy-regex', defaultShellMode: 'sparkling', colorMode: 'realistic' } as any, { chatId: 'failed-parallel', messageId: 'failed-parallel', swipeId: 0 }).content
const failedParallelRendered = renderNarrativeRegex(failedParallelNative, 'sparkle-button', 'failed-parallel', { chatId: 'failed-parallel', swipeId: 0 })
assert(!failedParallelRendered.includes('[PARALLEL|') && !failedParallelRendered.includes('[/PARALLEL]'), 'failed media must not expose raw Parallel syntax after the Relay containment fallback')
assert((failedParallelRendered.match(/data-rrn-native-request="parallel-/g) || []).length === 3, 'failed Parallel media must retain three independently retryable lifecycle owners')

const parallelCanonical = `[PARALLEL|Campus and beyond|shifting]
[parallel_entry][text]Soobin: one[/text][parallel_media]<image_request id="parallel-one" target="custom.artifact-media" slot="parallel-one" aspect="4:3"><scene_brief>Soobin waits outside the gym.</scene_brief></image_request>[/parallel_media][/parallel_entry]
[parallel_entry][text]Hana: two[/text][parallel_media]<image_request id="parallel-two" target="custom.artifact-media" slot="parallel-two" aspect="4:3"><scene_brief>Hana reads a new message.</scene_brief></image_request>[/parallel_media][/parallel_entry]
[parallel_entry][text]Jiyoon: three[/text][parallel_media]<image_request id="parallel-three" target="custom.artifact-media" slot="parallel-three" aspect="4:3"><scene_brief>Jiyoon crosses the courtyard.</scene_brief></image_request>[/parallel_media][/parallel_entry]
[parallel_context][trajectory]Three existing threads continue moving.[/trajectory][intersection]The shared campus timing creates pressure.[/intersection][/parallel_context]
[/PARALLEL]`
const parallelCanonicalRendered = renderNarrativeRegex(parallelCanonical, 'sparkle-button', 'parallel-canonical')
assert(!parallelCanonicalRendered.includes('[PARALLEL|') && parallelCanonicalRendered.includes('Three existing threads continue moving.') && parallelCanonicalRendered.includes('The shared campus timing creates pressure.'), 'canonical Parallel context was not rendered')

const parallelEmptyMedia = parallelCanonical.replace(/\[parallel_media\][\s\S]*?\[\/parallel_media\]/g, '[parallel_media]  \n  [/parallel_media]')
assert(!normalizeNarrativeMarkupForRendering(parallelEmptyMedia).includes('[parallel_media]  '), 'empty Parallel media whitespace was not normalized')
const parallelEmptyRendered = renderNarrativeRegex(parallelEmptyMedia, 'sparkle-button', 'parallel-empty')
assert(!parallelEmptyRendered.includes('[PARALLEL|') && (parallelEmptyRendered.match(/<article class="r65-thread">/g) || []).length === 3, 'empty Parallel media must degrade to three textual thread cards')

const lorebookFixtures = [
  { kind: 'cast-introduction', source: '[NPC:MAJOR|Lisa]\n[npc_media]portrait[/npc_media]\nb: dancer\na: messy lavender hair, glasses\np: observant\n[/NPC]' },
  { kind: 'character-dossier', source: '[[npc Lisa|main]][npc_media]portrait[/npc_media]Identity and history.[[/npc]]' },
  { kind: 'location-file', source: '[[place Moon Pier]][place_media]location[/place_media]A quiet pier under moonlight.[[/place]]' },
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
assert(backend.includes('await reconcileInstalledNarrativeOnStartup(userId)') && backend.includes('current.surfaceColorMode') && backend.includes('savedConfig.surfaceColorMode') && backend.includes('saved.surfaceColorMode'), 'already-enabled Narrative installs and both settings paths must reconcile the installed Regex pack against Color Mode')
assert(backend.includes("name: 'reverie_narrative'") && backend.includes('NARRATIVE_MACRO_MARKER'), 'placed Narrative macro path must be registered and expanded')
assert(backend.includes('renderNarrativeRegex(renderedContent, snapshot.narrativeVariant') && backend.includes('shouldRelayRenderNarrativeMarkup(source, renderContext.rendererMode)'), 'all renderer modes must execute the isolated bundled Narrative renderer without depending on host Regex hydration')
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
