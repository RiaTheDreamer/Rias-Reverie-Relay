import inlinePack from '../regex-packs/narrative-final/Reverie-Narrative-Surfaces-FINAL-Inline.json'
import plainPack from '../regex-packs/narrative-final/Reverie-Narrative-Surfaces-FINAL-Plain-Button.json'
import sparklePack from '../regex-packs/narrative-final/Reverie-Narrative-Surfaces-FINAL-Sparkle-Button.json'
import glassPack from '../regex-packs/narrative-final/Reverie-Narrative-Surfaces-FINAL-Glass.json'
import glassButtonPack from '../regex-packs/narrative-final/Reverie-Narrative-Surfaces-FINAL-Glass-Button.json'
import utilityPack from '../regex-packs/narrative-final/Reverie-Narrative-Utilities-v6.3-FINAL-with-Character-Phone.json'
import dramaticCutawayPack from '../regex-packs/narrative-final/Reverie-Dramatic-Cutaway-BULLETPROOF-V8.json'
import plotSparksPack from '../regex-packs/narrative-final/Reverie-Plot-Sparks-BULLETPROOF-V7.json'
import { sceneCompassPresentation } from './sceneCompassPresentation'
import { normalizeRegisteredHybridClosingDelimiters } from './surfaceStructuralRepair'
import { applyNarrativeSurfacePresentation, type NarrativeSurfacePresentationVariant } from './surfacePresentation'
import { PLOT_SPARK_VECTOR_BY_KEY, type PlotSparkKey, type SurfaceColorMode } from './contracts'

export type NarrativeRegexVariant = NarrativeSurfacePresentationVariant
type NarrativeRegexSourceVariant = NarrativeRegexVariant | 'glass-button'

export type NarrativeRegexScript = {
  script_id: string
  name?: string
  find_regex: string
  replace_string: string
  flags: string
  placement?: Array<'user_input' | 'ai_output' | 'world_info' | 'reasoning'>
  scope?: 'global' | 'character' | 'chat'
  scope_id?: string | null
  target?: Array<'prompt' | 'response' | 'display'> | 'prompt' | 'response' | 'display'
  min_depth?: number | null
  max_depth?: number | null
  trim_strings?: string[]
  run_on_edit?: boolean
  substitute_macros?: 'none' | 'find' | 'raw' | 'escaped' | 'after'
  sort_order: number
  disabled?: boolean
  description?: string
  folder?: string
  metadata?: Record<string, unknown>
  actions?: Array<Record<string, unknown>>
}

export type NarrativeRegexPack = {
  version?: string | number
  type: string
  scripts: NarrativeRegexScript[]
  metadata?: Record<string, unknown>
}

export type NarrativeUtilityItem = { loomName: string; loomContent: string; [key: string]: unknown }
export type NarrativeUtilityPack = {
  packName?: string
  version?: string
  loomItems: NarrativeUtilityItem[]
  extras?: Record<string, unknown>
}

const PACKS: Record<NarrativeRegexSourceVariant, NarrativeRegexPack> = {
  'sparkle-button': sparklePack as unknown as NarrativeRegexPack,
  'plain-button': plainPack as unknown as NarrativeRegexPack,
  inline: inlinePack as unknown as NarrativeRegexPack,
  glass: glassPack as unknown as NarrativeRegexPack,
  'glass-button': glassButtonPack as unknown as NarrativeRegexPack,
}

const EXPECTED_PIN: Record<NarrativeRegexVariant, string> = {
  'sparkle-button': '[cp_presentation]sparkling[/cp_presentation]',
  'plain-button': '[cp_presentation]plain[/cp_presentation]',
  inline: '[cp_presentation]inline[/cp_presentation]',
  glass: '[cp_presentation]glass[/cp_presentation]',
}

const DRAMATIC_CUTAWAY_PACK = dramaticCutawayPack as unknown as NarrativeRegexPack
const PLOT_SPARKS_PACK = plotSparksPack as unknown as NarrativeRegexPack
const NARRATIVE_MEDIA_OWNER_CLASS = /(?:dg-dramatic-media|r65-media|rv6-media|ru-media|ru-portrait|ru-secret-media|ru-thread-media|ra66-archive-media|rrcp-media|rrcp-photo-media|rrcp-wallpaper)/
const NARRATIVE_PRIMARY_SURFACE_CLASS = /<(?:details|div) class="(?:r65\b|ra66\b|rrcp-wrap\b|ch-og\b|[^\"]*\bdg-dramatic-cutaway\b)/
const CHARACTER_PHONE_OPTIONAL_WALLPAPER_NORMALIZER: NarrativeRegexScript = {
  script_id: 'rrcp_repair_missing_optional_wallpaper_v462',
  name: '↳ Character Phone — Repair Missing Optional Wallpaper Wrapper v4.6.2',
  find_regex: '(\\[cp_battery\\]\\s*[0-9]{1,3}\\s*\\[/cp_battery\\])\\s*(?=\\[cp_apps\\])',
  replace_string: '$1[cp_wallpaper][/cp_wallpaper]',
  flags: 'gi',
  placement: ['ai_output'],
  scope: 'global',
  scope_id: null,
  target: ['display'],
  min_depth: null,
  max_depth: null,
  trim_strings: [],
  run_on_edit: false,
  substitute_macros: 'none',
  sort_order: 499,
  disabled: false,
  description: 'Repairs a commonly omitted empty cp_wallpaper wrapper before the approved Character Phone shell renderer runs.',
  folder: '📱 Character Phone — FINAL',
  metadata: { release: 'FINAL', surface: 'Character Phone', repair: 'missing-optional-wallpaper' },
  actions: [],
}

/** Relay resolves Narrative-owned jobs to direct artifact media nodes. Keep
 * those nodes inside the approved layouts without redesigning their CSS. */
export const NARRATIVE_MEDIA_COMPATIBILITY_STYLE = `<style data-reverie-narrative-media-compat="1">
.dg-dramatic-media{min-width:0;max-width:100%;overflow:hidden;text-align:center}
.dg-dramatic-media>img,.dg-dramatic-media>.reverie-artifact-media{display:block!important;width:100%!important;max-width:100%!important;height:auto!important;margin-inline:auto!important;object-fit:contain!important;object-position:center!important}
.r65-media>.reverie-artifact-media,.rv6-media>.reverie-artifact-media,.ru-media>.reverie-artifact-media,.ru-portrait>.reverie-artifact-media,.ru-secret-media>.reverie-artifact-media,.ru-thread-media>.reverie-artifact-media,.rrcp-media>.reverie-artifact-media,.rrcp-photo-media>.reverie-artifact-media{display:block!important;width:100%!important;max-width:100%!important;height:auto!important;margin-inline:auto!important;object-fit:contain!important;object-position:center!important}
.ra66-archive-media{min-width:0!important;max-width:100%!important;overflow:hidden!important}
.ra66-archive-media>.reverie-artifact-media,.ra66-archive-media .reverie-artifact-media,.ra66-archive-media img{display:block!important;width:100%!important;max-width:100%!important;height:100%!important;max-height:100%!important;margin-inline:auto!important;object-position:center!important}
.ra66-card[data-archive-category="ITEM"] .ra66-archive-media>.reverie-artifact-media,.ra66-card[data-archive-category="ITEM"] .ra66-archive-media .reverie-artifact-media,.ra66-card[data-archive-category="ITEM"] .ra66-archive-media img{object-fit:contain!important}
.ra66-card:not([data-archive-category="ITEM"]) .ra66-archive-media>.reverie-artifact-media,.ra66-card:not([data-archive-category="ITEM"]) .ra66-archive-media .reverie-artifact-media,.ra66-card:not([data-archive-category="ITEM"]) .ra66-archive-media img{object-fit:cover!important}
.rrcp-wallpaper>.reverie-artifact-media,.rrcp-wallpaper .reverie-artifact-media,.rrcp-wallpaper img{position:absolute!important;inset:0!important;display:block!important;width:100%!important;height:100%!important;max-width:none!important;max-height:none!important;margin:0!important;object-fit:cover!important;object-position:center!important}
.r65-thread>.r65-media:not(:has(image_request,image_request_error,img,.reverie-artifact-media,.rrl-island,.rrl-media-slot,[data-reverie-lifecycle-card])){display:none!important}
.dg-dramatic-media>.rrl-island,.r65-media>.rrl-island,.rv6-media>.rrl-island,.ru-media>.rrl-island,.ru-portrait>.rrl-island,.ru-secret-media>.rrl-island,.ru-thread-media>.rrl-island,.ra66-archive-media>.rrl-island,.rrcp-media>.rrl-island,.rrcp-photo-media>.rrl-island,.rrcp-wallpaper>.rrl-island{display:block!important;width:100%!important;max-width:100%!important;min-width:0!important;margin:0!important}
.r65-parallel-context:not(:has(.r65-opt:not(:empty))){display:none!important}
</style>`

/** The approved surfaces intentionally own their internal presentation. This
 * adapter only supplies a reliable prose gutter around complete Surface roots. */
export const NARRATIVE_BLOCK_SPACING_STYLE = `<style data-reverie-narrative-block-spacing="1">
.r65,.ra66,.rrcp-wrap,.ch-og.dg-compact-launch-host,.dg-dramatic-cutaway.dg-compact-launch-host{margin-top:clamp(12px,2.5vw,16px)!important;margin-bottom:clamp(14px,3vw,18px)!important;margin-inline:auto!important}
@media(max-width:560px){.r65,.ra66,.rrcp-wrap,.ch-og.dg-compact-launch-host,.dg-dramatic-cutaway.dg-compact-launch-host{margin-top:14px!important;margin-bottom:18px!important}}
</style>`

const safeMessageId = (value: string): string => String(value || 'narrative').replace(/[^A-Za-z0-9_-]+/g, '-') || 'narrative'
const NARRATIVE_MARKUP = /\[(?:Plot_Sparks\]|SCENE(?:\||\])|PARALLEL\||NPC:|SECRET\||WORLD\||WHATIF\||character_phone|private_phone|dossier_ui|dramatic_parallel|pp_|cp_)|\[\[(?:else|npc|place)\s|<(?:dossier_ui|dramatic_parallel)\b/i

export const NARRATIVE_UTILITY_PACK = utilityPack as NarrativeUtilityPack
export const NARRATIVE_REGEX_VARIANTS: NarrativeRegexVariant[] = ['sparkle-button', 'plain-button', 'inline', 'glass']

/** Canonical model-authored bracket fields consumed by the paired Regexes.
 * XML is intentionally limited to the image-control tags nested inside media. */
export const NARRATIVE_UTILITY_FORMAT_CONTRACTS: Readonly<Record<string, readonly string[]>> = {
  'Character Phone': ['[character_phone]', '[cp_presentation]', '[cp_apps]', '[/character_phone]'],
  'Dramatic Cutaway': ['[dramatic_parallel]', '[dramatic_head]', '[dramatic_media]', '[dramatic_body]', '[dramatic_foot]', '[/dramatic_parallel]'],
  'Plot Sparks': ['[Plot_Sparks]', '[Spark]', '[Key]', '[Vector]', '[Text]', '[Media]', '[/Plot_Sparks]'],
  'Scene Shift': ['[SCENE|', '[scene_media]', '[scene_detail]', '[scene_context]', '[/SCENE]'],
  'Parallel Scene': ['[PARALLEL|', '[parallel_entry]', '[parallel_media]', '[parallel_context]', '[/PARALLEL]'],
  'Cast Introduction': ['[NPC:', '[npc_media]', '[/NPC]'],
  'Backstage Secrets': ['[SECRET|', '[secret_media]', '[context]', '[pressure]', '[/SECRET]'],
  'Setting the Scene': ['[WORLD|', '[world_media]', '[world_detail]', '[world_context]', '[/WORLD]'],
  'Off-Stage': ['[[else ', '[else_media]', '[else_scene]', '[else_context]', '[[/else]]'],
  'Character Dossier': ['[[npc ', '[npc_media]', '[[/npc]]'],
  'Location File': ['[[place ', '[place_media]', '[[/place]]'],
  'In Another Life': ['[WHATIF|', '[whatif_media]', '[whatif_scenario]', '[whatif_branch]', '[/WHATIF]'],
  'Archive Entry': ['[dossier_ui]', '[category]', '[archive_head]', '[archive_media]', '[archive_stats]', '[archive_details]', '[archive_export]', '[/dossier_ui]'],
}

export const NARRATIVE_SURFACE_ROOT_TAGS = [
  'character_phone', 'private_phone', 'dramatic_parallel', 'plot_sparks',
  'scene', 'parallel', 'npc', 'secret', 'world', 'else', 'place',
  'whatif', 'dossier_ui',
] as const

let narrativeSurfaceBracketTagCache: Set<string> | null = null

/** Build the lexical tag registry from the shipped Utility contracts rather
 * than maintaining a second hand-written list of every child field. A name is
 * admitted only when the model-facing contract contains both an opener and a
 * closer for it. Root tags are added explicitly because parameterized owners
 * such as [WORLD|...] do not use the ordinary opening-token shape. */
export function narrativeSurfaceBracketTags(): Set<string> {
  if (narrativeSurfaceBracketTagCache) return new Set(narrativeSurfaceBracketTagCache)
  const opened = new Set<string>()
  const closed = new Set<string>()
  const contract = (NARRATIVE_UTILITY_PACK.loomItems || []).map(item => String(item.loomContent || '')).join('\n')
  for (const match of contract.matchAll(/\[(\/?)\s*([A-Za-z][\w-]*)(?:[^\]]*)\]/g)) {
    const name = String(match[2] || '').toLowerCase().replace(/-/g, '_')
    if (match[1] === '/') closed.add(name)
    else opened.add(name)
  }
  const registered = new Set([...opened].filter(name => closed.has(name)))
  for (const root of NARRATIVE_SURFACE_ROOT_TAGS) registered.add(root)
  narrativeSurfaceBracketTagCache = registered
  return new Set(registered)
}

export function normalizeNarrativeClosingDelimiters(markup: string): string {
  return normalizeRegisteredHybridClosingDelimiters(markup, {
    knownTags: narrativeSurfaceBracketTags(),
    ownerTags: NARRATIVE_SURFACE_ROOT_TAGS,
    scope: 'narrative',
  }).markup
}

export function missingNarrativeUtilityFormatMarkers(name: string, content: string): string[] {
  const source = String(content || '').toLocaleLowerCase()
  return (NARRATIVE_UTILITY_FORMAT_CONTRACTS[name] || []).filter(marker => !source.includes(marker.toLocaleLowerCase()))
}

/** One-way persisted-settings migration only. These names are not part of the
 * active roster and never enter the model-facing Utility prompt. */
export const LEGACY_NARRATIVE_UTILITY_NAME_MIGRATIONS: Readonly<Record<string, string>> = {
  'Chaos Hooks': 'Plot Sparks',
  'Knowledge Veil': 'Backstage Secrets',
  'Beyond the Frame': 'Off-Stage',
  'Parallel Current': 'Parallel Scene',
  'Scene Compass': 'Scene Shift',
  'Cast Arrival': 'Cast Introduction',
  'World Texture': 'Setting the Scene',
  'Character File': 'Character Dossier',
  'Place File': 'Location File',
  'Unwalked Path': 'In Another Life',
  'Unified Archive Generator': 'Archive Entry',
}

export function narrativeUtilityDisplayName(internalName: string): string {
  return LEGACY_NARRATIVE_UTILITY_NAME_MIGRATIONS[internalName] || internalName
}

export function applyNarrativeDisplayNames(value: string, _rendered = false): string {
  let output = String(value || '')
  for (const [internalName, displayName] of Object.entries(LEGACY_NARRATIVE_UTILITY_NAME_MIGRATIONS)) {
    output = output.replace(new RegExp(internalName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), displayName)
  }
  return output
}

export function narrativeUtilityNames(): string[] {
  return (NARRATIVE_UTILITY_PACK.loomItems || []).map(item => item.loomName).filter(Boolean)
}

export function narrativeUtilityItems(): NarrativeUtilityItem[] {
  return (NARRATIVE_UTILITY_PACK.loomItems || []).map(item => ({ ...item }))
}

const PARALLEL_SCENE_FIND = '\\[PARALLEL\\|(?<scope>[^\\|\\]\\r\\n]{1,500})\\|(?<relevance>[^\\]\\r\\n]{1,200})\\]\\s*\\[parallel_entry\\]\\s*\\[text\\](?<thread1>[\\s\\S]{1,3000}?)\\[/text\\]\\s*\\[parallel_media\\](?<media1>[\\s\\S]{0,18000}?)\\[/parallel_media\\]\\s*\\[/parallel_entry\\]\\s*\\[parallel_entry\\]\\s*\\[text\\](?<thread2>[\\s\\S]{1,3000}?)\\[/text\\]\\s*\\[parallel_media\\](?<media2>[\\s\\S]{0,18000}?)\\[/parallel_media\\]\\s*\\[/parallel_entry\\]\\s*\\[parallel_entry\\]\\s*\\[text\\](?<thread3>[\\s\\S]{1,3000}?)\\[/text\\]\\s*\\[parallel_media\\](?<media3>[\\s\\S]{0,18000}?)\\[/parallel_media\\]\\s*\\[/parallel_entry\\]\\s*\\[parallel_context\\]\\s*\\[trajectory\\](?<trajectory>[\\s\\S]{1,6000}?)\\[/trajectory\\]\\s*\\[intersection\\](?<intersection>[\\s\\S]{1,6000}?)\\[/intersection\\]\\s*\\[/parallel_context\\]\\s*\\[/PARALLEL\\]'

function parallelSceneReplacement(replacement: string): string {
  const context = '<div class="r65-section r65-parallel-context"><p class="r65-section-title">Context</p><div class="r65-opt" data-label="Trajectory">$<trajectory></div><div class="r65-opt r65-gap" data-label="Intersection">$<intersection></div></div>'
  return replacement.replace('</section></details>', `${context}</section></details>`)
}

const FLAT_ARCHIVE_DETAIL_LABELS: Readonly<Record<string, readonly string[]>> = {
  CHARACTER: ['Identity', 'Appearance', 'Personality', 'Behavioral Triggers', 'Speech', 'Background', 'Hidden Depths', 'Social Mask'],
  LOCATION: ['Identity', 'Description', 'Atmosphere', 'Significance', 'Behavioral Result', 'Connections'],
  ITEM: ['Type', 'Description', 'Significance', 'Current Status', 'Behavioral Triggers', 'Rules'],
  FACTION: ['Members', 'Dynamic', 'Relationship to Main Cast', 'Key Interactions', 'Hidden Lore'],
  EVENT: ['What Happened', 'Key Dialogue', 'Consequences', 'Emotional Impact'],
  RELATIONSHIP: ['Characters Involved', 'Nature of Bond', 'Key Dialogue', 'Current Status', 'Trajectory'],
  SECRET: ['The Hidden Truth', 'Known By', 'Hidden From', 'Near-Slips', 'Impact If Revealed', 'Current Status'],
}

function archiveText(value: string): string {
  return String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function archivePresentationState(value: string): 'UNLOCKED' | 'PARTIAL' | 'LOCKED' {
  const state = String(value || '').trim().toUpperCase()
  if (state === 'UNLOCKED' || state === 'PARTIAL' || state === 'LOCKED') return state
  if (state === 'DISCOVERED') return 'UNLOCKED'
  if (state === 'SECURE') return 'LOCKED'
  return 'PARTIAL'
}

function parseFlatArchiveStat(lines: string[], offset: number): { label: string; value: string; consumed: number } | null {
  const joined = /^(.+?)(?:\s*[:|]\s*|\s+)?(\d{1,3})%?$/.exec(lines[offset] || '')
  if (joined) return { label: joined[1].trim(), value: String(Math.min(100, Number(joined[2]))), consumed: 1 }
  if (/^\d{1,3}%?$/.test(lines[offset + 1] || '')) {
    return { label: lines[offset].trim(), value: String(Math.min(100, Number(lines[offset + 1].replace('%', '')))), consumed: 2 }
  }
  return null
}

/** Repair the bounded flat Archive Entry drift seen in beta output. Canonical
 * payloads are returned byte-for-byte; ambiguous flat blocks remain untouched. */
function normalizeFlatArchiveDossiers(markup: string): string {
  return markup.replace(/<dossier_ui\s+category="(CHARACTER|LOCATION|ITEM|FACTION|EVENT|RELATIONSHIP|SECRET)">((?:(?!<dossier_ui\b)[\s\S])*?)<\/dossier_ui>/gi, (full, rawCategory: string, body: string) => {
    if (/<archive-head\b/i.test(body)) return full
    const category = rawCategory.toUpperCase()
    const labels = FLAT_ARCHIVE_DETAIL_LABELS[category]
    if (!labels) return full
    const exportMarker = new RegExp(`\\[(?:${category === 'CHARACTER' ? 'NPC' : category}):[^\\]]+\\]`, 'i').exec(body)
    if (!exportMarker || exportMarker.index < 0) return full

    const headerLines = body.slice(0, exportMarker.index).split(/\r?\n/).map(line => line.trim()).filter(Boolean)
    const exportText = body.slice(exportMarker.index).trim()
    if (headerLines.length < 5 + 3 + labels.length || !exportText) return full

    const [icon, name, rawState, relation, role] = headerLines.slice(0, 5)
    const stats: Array<{ label: string; value: string }> = []
    let cursor = 5
    while (stats.length < 3 && cursor < headerLines.length) {
      const stat = parseFlatArchiveStat(headerLines, cursor)
      if (!stat) return full
      stats.push({ label: stat.label, value: stat.value })
      cursor += stat.consumed
    }
    const details = headerLines.slice(cursor)
    if (stats.length !== 3 || details.length !== labels.length) return full

    const statsMarkup = stats.map(stat => `[archive_stat][label]${archiveText(stat.label)}[/label][value]${stat.value}[/value][/archive_stat]`).join('')
    const detailsMarkup = labels.map((label, index) => `[archive_row][label]${archiveText(label)}[/label][value]${archiveText(details[index])}[/value][/archive_row]`).join('')
    return `[dossier_ui][category]${category}[/category][archive_head][icon]${archiveText(icon)}[/icon][name]${archiveText(name)}[/name][state]${archivePresentationState(rawState)}[/state][relation]${archiveText(relation)}[/relation][role]${archiveText(role)}[/role][/archive_head][archive_stats]${statsMarkup}[/archive_stats][archive_details]${detailsMarkup}[/archive_details][archive_export]${archiveText(exportText)}[/archive_export][/dossier_ui]`
  })
}

const PLOT_SPARKS_OWNER_RANGE = /(\[Plot_Sparks\])([\s\S]*?)(\[\/Plot_Sparks\])/gi

/** Repair only the two observed bracket/angle delimiter typos inside an
 * otherwise complete canonical seven-Spark owner. This is deliberately not a
 * general permissive bracket repair: every key/vector/text/media field and
 * every complete illustration must validate before either byte is changed. */
export function normalizePlotSparksFieldDelimiters(markup: string): string {
  return String(markup || '').replace(PLOT_SPARKS_OWNER_RANGE, (full, opening: string, body: string, closing: string) => {
    const sparkPattern = /\[Spark\]([\s\S]*?)\[\/Spark\]/gi
    const sparks = [...body.matchAll(sparkPattern)]
    if (sparks.length !== 7 || (body.match(/\[Spark\]/gi) || []).length !== 7 || (body.match(/\[\/Spark\]/gi) || []).length !== 7) return full

    const keys = new Set<PlotSparkKey>()
    let changed = false
    const repairedSparks: string[] = []
    for (const match of sparks) {
      let spark = match[0]
      const badTextOpen = spark.match(/\[Text>/gi) || []
      if (badTextOpen.length) {
        if (badTextOpen.length !== 1 || /\[Text\]/i.test(spark) || (spark.match(/\[\/Text\]/gi) || []).length !== 1) return full
        spark = spark.replace(/\[Text>/i, '[Text]')
        changed = true
      }
      const badVectorClose = spark.match(/\[\/Vector>/gi) || []
      if (badVectorClose.length) {
        if (badVectorClose.length !== 1 || /\[\/Vector\]/i.test(spark) || (spark.match(/\[Vector\]/gi) || []).length !== 1) return full
        spark = spark.replace(/\[\/Vector>/i, '[/Vector]')
        changed = true
      }
      if (/\[(?:\/)?(?:Key|Vector|Text|Media)>/i.test(spark)) return full

      const fields: Record<'Key' | 'Vector' | 'Text' | 'Media', string> = { Key: '', Vector: '', Text: '', Media: '' }
      for (const field of Object.keys(fields) as Array<keyof typeof fields>) {
        if ((spark.match(new RegExp(`\\[${field}\\]`, 'gi')) || []).length !== 1) return full
        if ((spark.match(new RegExp(`\\[\\/${field}\\]`, 'gi')) || []).length !== 1) return full
        fields[field] = new RegExp(`\\[${field}\\]([\\s\\S]*?)\\[\\/${field}\\]`, 'i').exec(spark)?.[1].trim() || ''
        if (!fields[field]) return full
      }
      const key = fields.Key.toLocaleLowerCase() as PlotSparkKey
      if (!(key in PLOT_SPARK_VECTOR_BY_KEY) || keys.has(key) || fields.Vector.toLocaleLowerCase() !== PLOT_SPARK_VECTOR_BY_KEY[key]) return full
      keys.add(key)
      if ((fields.Media.match(/<reverie-illustration\b/gi) || []).length !== 1
        || (fields.Media.match(/<\/reverie-illustration\s*>/gi) || []).length !== 1
        || !/<visual_prompt>[^<][\s\S]*?<\/visual_prompt>/i.test(fields.Media)) return full
      repairedSparks.push(spark)
    }
    if (!changed || keys.size !== 7) return full

    let index = 0
    const repairedBody = body.replace(sparkPattern, () => repairedSparks[index++])
    return `${opening}${repairedBody}${closing}`
  })
}

/** Repair only the unambiguous known-owner blend inside Plot Sparks Media. */
export function normalizePlotSparksMediaMarkup(markup: string): string {
  return String(markup || '').replace(/\[Media\]((?:(?!\[Media\])[\s\S])*?)\[\/Media\]/gi, (full, media: string) => {
    if ((media.match(/<reverie-illustration\b/gi) || []).length !== 1) return full
    if (/<image_request\b/i.test(media)) return full
    const sceneBriefs = media.match(/<scene_brief\b[^>]*>[\s\S]*?<\/scene_brief\s*>/gi) || []
    const wrongClosers = media.match(/<\/image_request\s*>/gi) || []
    if (sceneBriefs.length !== 1 || wrongClosers.length > 1 || /<\/reverie-illustration\s*>/i.test(media)) return full
    let repaired = media
      .replace(/<scene_brief\b[^>]*>/i, '<visual_prompt>')
      .replace(/<\/scene_brief\s*>/i, '</visual_prompt>')
    repaired = wrongClosers.length === 1
      ? repaired.replace(/<\/image_request\s*>/i, '</reverie-illustration>')
      : `${repaired.trimEnd()}</reverie-illustration>`
    return `[Media]${repaired}[/Media]`
  })
}

function normalizeDramaticParagraphMarkup(markup: string): string {
  return String(markup || '').replace(/\[dramatic_parallel\]((?:(?!\[dramatic_parallel\])[\s\S])*?)\[\/dramatic_parallel\]/gi, (full, body: string) => {
    if (!/\[dramatic_body\]/i.test(body)) return full
    return `[dramatic_parallel]${body.replace(/\[paragraph\]([\s\S]*?)\[\/paragraph\]/gi, '<p>$1</p>')}[/dramatic_parallel]`
  })
}

const PARALLEL_OWNER_RANGE = /(\[PARALLEL\|[^\]\r\n]{1,500}\|[^\]\r\n]{1,500}\])((?:(?!\[PARALLEL\|)[\s\S])*?)(\[\/PARALLEL\])/gi

/** Repair the exact resolved-media closer omission observed in live Parallel
 * Scene output. The repair is allowed only inside one complete owner with
 * exactly three entries, one media opener per entry, and recognizable Relay
 * media. Canonical and ambiguous payloads remain byte-identical. */
export function normalizeParallelSceneMarkup(markup: string): string {
  return String(markup || '').replace(PARALLEL_OWNER_RANGE, (full, opening: string, body: string, closing: string) => {
    const entries = body.match(/\[parallel_entry\][\s\S]*?\[\/parallel_entry\]/gi) || []
    if (entries.length !== 3 || !/\[parallel_context\][\s\S]*?\[\/parallel_context\]/i.test(body)) return full
    let changed = false
    const repairedEntries: string[] = []
    for (const entry of entries) {
      const opens = entry.match(/\[parallel_media\]/gi) || []
      const closes = entry.match(/\[\/parallel_media\]/gi) || []
      if (opens.length !== 1 || closes.length > 1) return full
      if (closes.length === 1) {
        repairedEntries.push(entry)
        continue
      }
      const missingCloser = /\[parallel_media\]([\s\S]*?)(\[\/parallel_entry\])$/i.exec(entry)
      if (!missingCloser || !missingCloser[1].trim() || !/(?:<image_request\b|<reverie-illustration\b|<img\b|<!--\s*reverie-relay:image\b)/i.test(missingCloser[1])) return full
      repairedEntries.push(entry.replace(/\[\/parallel_entry\]$/i, '[/parallel_media][/parallel_entry]'))
      changed = true
    }
    if (!changed) return full
    let offset = 0
    const repairedBody = body.replace(/\[parallel_entry\][\s\S]*?\[\/parallel_entry\]/gi, () => repairedEntries[offset++])
    return `${opening}${repairedBody}${closing}`
  })
}

const ELSEWHERE_OWNER_RANGE = /(\[\[else\s+[^\]\r\n]{1,500}\]\])((?:(?!\[\[else\s+)[\s\S])*?)(\[\[\/else\]\]|\[\/else\])/gi
const CURRENT_ELSEWHERE_BODY = /^\s*\[else_media\][\s\S]{0,24000}?\[\/else_media\]\s*\[else_scene\][\s\S]{1,30000}?\[\/else_scene\]\s*\[else_context\]\s*\[visibility\][\s\S]{1,500}?\[\/visibility\]\s*\[clock\][\s\S]{1,2500}?\[\/clock\]\s*\[knowledge\][\s\S]{1,5000}?\[\/knowledge\]\s*\[collision\][\s\S]{1,5000}?\[\/collision\]\s*\[\/else_context\]\s*$/i
const LEGACY_ELSEWHERE_BODY = /^\s*<else-media>([\s\S]{0,24000}?)<\/else-media>\s*<else-scene>([\s\S]{1,30000}?)<\/else-scene>\s*<else-context>\s*<visibility>([\s\S]{1,500}?)<\/visibility>\s*<clock>([\s\S]{1,2500}?)<\/clock>\s*<knowledge>([\s\S]{1,5000}?)<\/knowledge>\s*<collision>([\s\S]{1,5000}?)<\/collision>\s*<\/else-context>\s*$/i

/** Keep the current Off-Stage renderer authoritative while accepting two
 * exact historical drifts inside its known owner. Canonical payloads remain
 * byte-identical; arbitrary bracket or XML markup is never rewritten. */
function normalizeElsewhereMarkup(markup: string): string {
  return String(markup || '').replace(ELSEWHERE_OWNER_RANGE, (full, opening: string, body: string, closer: string) => {
    if (CURRENT_ELSEWHERE_BODY.test(body)) {
      return closer === '[/else]' ? `${opening}${body}[[/else]]` : full
    }
    const legacy = LEGACY_ELSEWHERE_BODY.exec(body)
    if (!legacy) return full
    return `${opening}\n[else_media]${legacy[1]}[/else_media]\n[else_scene]${legacy[2]}[/else_scene]\n[else_context]\n[visibility]${legacy[3]}[/visibility]\n[clock]${legacy[4]}[/clock]\n[knowledge]${legacy[5]}[/knowledge]\n[collision]${legacy[6]}[/collision]\n[/else_context]\n[[/else]]`
  })
}

const WORLD_OWNER_RANGE = /(\[WORLD\|[^\]\r\n]{1,500}\|[^\]\r\n]{1,500}\])((?:(?!\[WORLD\|)[\s\S])*?)(\[\/WORLD\])/gi
const WORLD_MISSING_ROOT_RANGE = /(\[WORLD\|[^\]\r\n]{1,500}\|[^\]\r\n]{1,500}\])((?:(?!\[WORLD\|)[\s\S])*?\[\/world_context\])(?=\s*(?:\[Plot_Sparks\]|\[SCENE(?:\||\])|\[PARALLEL\||\[NPC:|\[SECRET\||\[WHATIF\||\[(?:character_phone|private_phone|dossier_ui|dramatic_parallel)\]|\[\[(?:else|npc|place)\s|<(?:dossier_ui|dramatic_parallel)\b))/gi
const WORLD_BODY_SHELL = /^\s*\[world_media\]([\s\S]{1,24000}?)\[\/world_media\]\s*\[world_detail\]([\s\S]{1,12000}?)\[\/world_detail\]\s*\[world_context\]([\s\S]{1,16000}?)\[\/world_context\]\s*$/i
const WORLD_CONTEXT_SHELL = /^\s*\[why_it_matters\]([\s\S]{1,4000}?)\[\/why_it_matters\]\s*\[future_use\]([\s\S]{1,4000}?)\[\/future_use\]\s*$/i
const WORLD_MEDIA_CONTROL = /(?:<image_request\b|<reverie-illustration\b|<img\b|<!--\s*reverie-relay:image\b)/i
const NESTED_NARRATIVE_OWNER = /\[(?:Plot_Sparks\]|SCENE(?:\||\])|PARALLEL\||NPC:|SECRET\||WORLD\||WHATIF\||character_phone|private_phone|dossier_ui|dramatic_parallel)|\[\[(?:else|npc|place)\s|<(?:dossier_ui|dramatic_parallel)\b/i

/** Recover a World whose model omitted only the root closer. A following,
 * independently recognized Narrative owner is the completion boundary: an
 * otherwise complete World at end-of-input may still be an unfinished stream
 * and remains untouched. Exactly one unmatched World root is required so a
 * nested or multiply-owned payload cannot be guessed into shape. */
function normalizeMissingWorldRoot(markup: string): string {
  const source = String(markup || '')
  const openerCount = (source.match(/\[WORLD\|/gi) || []).length
  const closerCount = (source.match(/\[\/WORLD\]/gi) || []).length
  if (openerCount !== closerCount + 1) return source

  const candidates = [...source.matchAll(new RegExp(WORLD_MISSING_ROOT_RANGE.source, WORLD_MISSING_ROOT_RANGE.flags))]
  if (candidates.length !== 1) return source
  const candidate = candidates[0]
  const full = candidate[0]
  const body = candidate[2]
  for (const field of ['world_media', 'world_detail', 'world_context', 'why_it_matters', 'future_use']) {
    if ((body.match(new RegExp(`\\[${field}\\]`, 'gi')) || []).length !== 1) return source
    if ((body.match(new RegExp(`\\[\\/${field}\\]`, 'gi')) || []).length !== 1) return source
  }
  const shell = WORLD_BODY_SHELL.exec(body)
  if (!shell || NESTED_NARRATIVE_OWNER.test(body) || !WORLD_MEDIA_CONTROL.test(shell[1])) return source
  const context = WORLD_CONTEXT_SHELL.exec(shell[3])
  if (!context || !context[1].trim() || !context[2].trim()) return source

  const start = candidate.index ?? -1
  if (start < 0) return source
  return `${source.slice(0, start)}${full}\n[/WORLD]${source.slice(start + full.length)}`
}

/** Repair one observed Setting the Scene contract violation inside a complete,
 * otherwise canonical World owner. The first future-use closer is only changed
 * when the following, separately opened future-use field is complete, leaving
 * canonical and ambiguous payloads byte-identical. */
export function normalizeWorldMarkup(markup: string): string {
  return normalizeMissingWorldRoot(String(markup || '')).replace(WORLD_OWNER_RANGE, (full, opening: string, body: string, closing: string) => {
    const shell = WORLD_BODY_SHELL.exec(body)
    if (!shell || NESTED_NARRATIVE_OWNER.test(body)) return full
    const context = shell[3]
    if ((context.match(/\[why_it_matters\]/gi) || []).length !== 1) return full
    if ((context.match(/\[\/why_it_matters\]/gi) || []).length !== 0) return full
    if ((context.match(/\[future_use\]/gi) || []).length !== 1) return full
    if ((context.match(/\[\/future_use\]/gi) || []).length !== 2) return full
    const malformed = /^\s*\[why_it_matters\]([\s\S]+?)\[\/future_use\]\s*\[future_use\]([\s\S]+?)\[\/future_use\]\s*$/i.exec(context)
    if (!malformed || !malformed[1].trim() || !malformed[2].trim()) return full
    const repairedContext = context.replace(/\[\/future_use\]/i, '[/why_it_matters]')
    const repairedBody = body.slice(0, shell.index) + shell[0].replace(context, repairedContext) + body.slice(shell.index + shell[0].length)
    return `${opening}${repairedBody}${closing}`
  })
}

export function normalizeNarrativeMarkupForRendering(markup: string): string {
  const structurallyNormalized = normalizeNarrativeClosingDelimiters(normalizePlotSparksFieldDelimiters(String(markup || '')))
  return normalizeWorldMarkup(normalizeElsewhereMarkup(normalizeParallelSceneMarkup(normalizeDramaticParagraphMarkup(normalizeFlatArchiveDossiers(normalizePlotSparksMediaMarkup(structurallyNormalized))))))
    .replace(/<(character_phone|private_phone)\b[^>]*>((?:(?!<(?:character_phone|private_phone)\b)[\s\S])*?)<\/\1\s*>/gi, (_full, root: string, body: string) => {
      // A second observed phone drift uses an XML root around otherwise
      // canonical bracket fields. Convert only a complete, known phone root;
      // arbitrary XML and incomplete streaming fragments remain untouched.
      const repairedBody = body.replace(/<\/(cp_[A-Za-z][A-Za-z0-9_]*)>/gi, '[/$1]')
      return `[${root}]${repairedBody}[/${root}]`
    })
    .replace(/(\[(character_phone|private_phone)\b[^\]]*\])((?:(?!\[(?:character_phone|private_phone)\b)[\s\S])*?)\[\/\2\]/gi, (_full, opening: string, root: string, body: string) => {
      // Story models occasionally open Character Phone fields with bracket
      // grammar and close only the SVG-bearing fields as XML. The app-module
      // renderer then misses the entire app and leaks its raw cp_* scaffold.
      // Keep this repair bounded to a complete phone root and leave canonical
      // bracket payloads byte-for-byte unchanged.
      const repairedBody = body.replace(/<\/(cp_[A-Za-z][A-Za-z0-9_]*)>/gi, '[/$1]')
      return `${opening}${repairedBody}[/${root}]`
    })
    .replace(/(\[cp_battery\]\s*[0-9]{1,3}\s*\[\/cp_battery\])\s*(?=\[cp_apps\])/gi, '$1[cp_wallpaper][/cp_wallpaper]')
    .replace(/\[parallel_media\]\s*\[\/parallel_media\]/gi, '[parallel_media][/parallel_media]')
}

function narrativeRegexSourcePack(variant: NarrativeRegexSourceVariant): NarrativeRegexPack {
  const pack = PACKS[variant]
  const expectedCount = variant === 'glass' || variant === 'glass-button' ? 95 : 93
  if (!pack || pack.type !== 'lumiverse_regex_scripts' || pack.scripts.length !== expectedCount) {
    throw new Error(`Invalid Narrative Regex variant: ${variant}`)
  }
  const ids = pack.scripts.map(script => script.script_id)
  if (new Set(ids).size !== ids.length) throw new Error(`Duplicate Narrative Regex script IDs in ${variant}`)
  const pin = pack.scripts.find(script => script.script_id === 'rrcp_final_presentation_pin')
  const expectedPin = variant === 'glass-button' ? EXPECTED_PIN.glass : EXPECTED_PIN[variant]
  if (!pin?.replace_string?.includes(expectedPin)) throw new Error(`Narrative Character Phone presentation pin mismatch: ${variant}`)
  if (/<scenecard\b|\[scenecard\]/i.test(JSON.stringify(pack))) throw new Error(`Stella Scene Card contract present in ${variant}`)
  return pack
}

export function narrativeRegexPack(variant: NarrativeRegexVariant): NarrativeRegexPack {
  return narrativeRegexSourcePack(variant)
}

export function narrativeRegexScripts(variant: NarrativeRegexVariant, colorMode: SurfaceColorMode = 'realistic'): NarrativeRegexScript[] {
  if (DRAMATIC_CUTAWAY_PACK.type !== 'lumiverse_regex_scripts' || DRAMATIC_CUTAWAY_PACK.scripts.length !== 1) {
    throw new Error('Invalid approved Dramatic Cutaway Regex asset')
  }
  if (PLOT_SPARKS_PACK.type !== 'lumiverse_regex_scripts' || PLOT_SPARKS_PACK.scripts.length !== 1) {
    throw new Error('Invalid approved Plot Sparks Regex asset')
  }
  // Presentation and body color are independent settings. Glass Mode selects
  // the complete Glass visual source, then the requested presentation adapter
  // keeps Inline/Button/Sparkling/Glass Button ownership on the outer shell.
  // The Glass Button is an outer shell, not a body-color choice. Its normal
  // body authority is a dedicated generated pack; Glass Mode remains the only
  // selector that chooses the complete Glass visual body source.
  const sourceVariant: NarrativeRegexSourceVariant = colorMode === 'glass'
    ? 'glass'
    : variant === 'glass'
      ? 'glass-button'
      : variant
  const bundledPresentationScripts = narrativeRegexSourcePack(sourceVariant).scripts.filter(script => script.disabled !== true)
  const scripts = [
    CHARACTER_PHONE_OPTIONAL_WALLPAPER_NORMALIZER,
    ...bundledPresentationScripts,
    ...(['glass', 'glass-button'].includes(sourceVariant) ? [] : PLOT_SPARKS_PACK.scripts.filter(script => script.disabled !== true)),
    ...(['glass', 'glass-button'].includes(sourceVariant) ? [] : DRAMATIC_CUTAWAY_PACK.scripts.filter(script => script.disabled !== true)),
  ]
  const ids = scripts.map(script => script.script_id)
  if (new Set(ids).size !== ids.length) throw new Error(`Duplicate active Narrative Regex script IDs in ${variant}`)
  return scripts
    .map(script => {
      const isParallel = script.script_id === 'reverie_parallel_tracker_images_v1'
      const replacement = applyNarrativeSurfacePresentation(
        sceneCompassPresentation(script.script_id, isParallel ? parallelSceneReplacement(script.replace_string) : script.replace_string),
        variant,
      )
      const spacedReplacement = NARRATIVE_PRIMARY_SURFACE_CLASS.test(replacement)
        ? `${NARRATIVE_BLOCK_SPACING_STYLE}${replacement}`
        : replacement
      return {
        ...script,
        name: applyNarrativeDisplayNames(String(script.name || script.script_id)),
        find_regex: isParallel ? PARALLEL_SCENE_FIND : script.find_regex,
        replace_string: NARRATIVE_MEDIA_OWNER_CLASS.test(spacedReplacement)
          ? `${NARRATIVE_MEDIA_COMPATIBILITY_STYLE}${spacedReplacement}`
          : spacedReplacement,
      }
    })
    .sort((left, right) => Number(left.sort_order) - Number(right.sort_order))
}

export function narrativeActiveRegexScriptCount(variant: NarrativeRegexVariant): number {
  return narrativeRegexScripts(variant).length
}

export function containsNarrativeRegexMarkup(markup: string): boolean {
  return NARRATIVE_MARKUP.test(String(markup || ''))
}

/** Narrative Utilities ship with Relay and must not depend on Lumiverse's
 * separately hydrated Regex registry. Relay consumes their semantic markup in
 * every display mode; once transformed, host Regex scripts have no source root
 * left to match, so this remains single-owner rather than a double render. */
export function shouldRelayRenderNarrativeMarkup(_markup: string, _rendererMode: string): boolean {
  return true
}

export type NarrativeLorebookKind = 'cast-introduction' | 'character-dossier' | 'location-file'

export type NarrativeRenderContext = {
  chatId?: string
  swipeId?: number
}

function narrativeLorebookKind(scriptId: string): NarrativeLorebookKind | null {
  if (scriptId === 'reverie_npc_intro_images_v1') return 'cast-introduction'
  if (scriptId === 'relay_shenanigans_dossier_images_sparkle_v1') return 'character-dossier'
  if (scriptId === 'relay_shenanigans_location_images_sparkle_v1') return 'location-file'
  return null
}

function safeDataAttribute(value: string): string {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function withLorebookExportAction(
  rendered: string,
  kind: NarrativeLorebookKind,
  context: NarrativeRenderContext,
  messageId: string,
  occurrence: number,
): string {
  const swipe = Number.isFinite(Number(context.swipeId)) ? String(Math.max(0, Number(context.swipeId))) : ''
  const action = `<div class="r65-section"><button type="button" class="r65-fork" data-rrn-action="export-lorebook" data-rrn-lorebook-kind="${kind}" data-rrn-lorebook-index="${occurrence}" data-rrn-chat-id="${safeDataAttribute(context.chatId || '')}" data-rrn-message-id="${safeDataAttribute(messageId)}" data-rrn-swipe-id="${swipe}">Send to Lorebook</button></div>`
  return rendered.replace(/<\/section>\s*<\/details>\s*$/i, `${action}</section></details>`)
}

export function renderNarrativeRegex(markup: string, variant: NarrativeRegexVariant, messageId = 'narrative', context: NarrativeRenderContext = {}, colorMode: SurfaceColorMode = 'realistic'): string {
  let output = normalizeNarrativeMarkupForRendering(markup)
  const macro = safeMessageId(messageId)
  for (const script of narrativeRegexScripts(variant, colorMode).filter(script => {
    const targets = Array.isArray(script.target) ? script.target : [script.target || 'display']
    return targets.includes('display')
  })) {
    const flags = script.flags?.includes('g') ? script.flags : `${script.flags || ''}g`
    const replacement = script.replace_string.replace(/\{\{lastMessageId\}\}/g, macro)
    const lorebookKind = narrativeLorebookKind(script.script_id)
    if (!lorebookKind) {
      output = output.replace(new RegExp(script.find_regex, flags), replacement)
      continue
    }
    let occurrence = 0
    const localFlags = flags.replace(/g/g, '')
    output = output.replace(new RegExp(script.find_regex, flags), (matched: string) => {
      const rendered = matched.replace(new RegExp(script.find_regex, localFlags), replacement)
      return withLorebookExportAction(rendered, lorebookKind, context, messageId, occurrence++)
    })
  }
  return applyNarrativeDisplayNames(output, true)
}

export function narrativeRegexVariantMatrix(): Array<{ variant: NarrativeRegexVariant; scriptCount: number; duplicateIds: number; pinnedPresentation: string }> {
  return NARRATIVE_REGEX_VARIANTS.map(variant => {
    const pack = narrativeRegexPack(variant)
    const ids = pack.scripts.map(script => script.script_id)
    const pin = pack.scripts.find(script => script.script_id === 'rrcp_final_presentation_pin')?.replace_string || ''
    return {
      variant,
      scriptCount: pack.scripts.length,
      duplicateIds: ids.length - new Set(ids).size,
      pinnedPresentation: /\[cp_presentation\]([^\[]+)\[\/cp_presentation\]/i.exec(pin)?.[1] || '',
    }
  })
}
