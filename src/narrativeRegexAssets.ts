import inlinePack from '../regex-packs/narrative-final/Reverie-Narrative-Surfaces-FINAL-Inline.json'
import plainPack from '../regex-packs/narrative-final/Reverie-Narrative-Surfaces-FINAL-Plain-Button.json'
import sparklePack from '../regex-packs/narrative-final/Reverie-Narrative-Surfaces-FINAL-Sparkle-Button.json'
import utilityPack from '../regex-packs/narrative-final/Reverie-Narrative-Utilities-v6.3-FINAL-with-Character-Phone.json'
import dramaticCutawayPack from '../regex-packs/narrative-final/Reverie-Dramatic-Cutaway-BULLETPROOF-V8.json'
import plotSparksPack from '../regex-packs/narrative-final/Reverie-Plot-Sparks-BULLETPROOF-V7.json'
import { sceneCompassPresentation } from './sceneCompassPresentation'
import { PLOT_SPARKS_V2_UTILITY } from './plotSparksV2'

export type NarrativeRegexVariant = 'sparkle-button' | 'plain-button' | 'inline'

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

const PACKS: Record<NarrativeRegexVariant, NarrativeRegexPack> = {
  'sparkle-button': sparklePack as unknown as NarrativeRegexPack,
  'plain-button': plainPack as unknown as NarrativeRegexPack,
  inline: inlinePack as unknown as NarrativeRegexPack,
}

const EXPECTED_PIN: Record<NarrativeRegexVariant, string> = {
  'sparkle-button': '[cp_presentation]sparkling[/cp_presentation]',
  'plain-button': '[cp_presentation]plain[/cp_presentation]',
  inline: '[cp_presentation]inline[/cp_presentation]',
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
.r65-thread>.r65-media:not(:has(image_request,image_request_error,img,.reverie-artifact-media)){display:none!important}
.r65-parallel-context:not(:has(.r65-opt:not(:empty))){display:none!important}
</style>`

/** The approved surfaces intentionally own their internal presentation. This
 * adapter only supplies a reliable prose gutter around complete Surface roots. */
export const NARRATIVE_BLOCK_SPACING_STYLE = `<style data-reverie-narrative-block-spacing="1">
.r65,.ra66,.rrcp-wrap,.ch-og.dg-compact-launch-host,.dg-dramatic-cutaway.dg-compact-launch-host{margin-top:clamp(22px,4vw,30px)!important;margin-bottom:clamp(24px,4.5vw,34px)!important;margin-inline:auto!important}
@media(max-width:560px){.r65,.ra66,.rrcp-wrap,.ch-og.dg-compact-launch-host,.dg-dramatic-cutaway.dg-compact-launch-host{margin-top:24px!important;margin-bottom:30px!important}}
</style>`

const safeMessageId = (value: string): string => String(value || 'narrative').replace(/[^A-Za-z0-9_-]+/g, '-') || 'narrative'
const NARRATIVE_MARKUP = /\[(?:Plot_Sparks\]|SCENE(?:\||\])|PARALLEL\||NPC:|SECRET\||WORLD\||WHATIF\||character_phone|private_phone|dossier_ui|dramatic_parallel|pp_|cp_)|\[\[(?:else|npc|place)\s|<(?:dossier_ui|dramatic_parallel|chaos_payload)\b/i

export const NARRATIVE_UTILITY_PACK = utilityPack as NarrativeUtilityPack
export const NARRATIVE_REGEX_VARIANTS: NarrativeRegexVariant[] = ['sparkle-button', 'plain-button', 'inline']

/** Public theater labels. Loom names and script IDs remain stable migration
 * keys; only user/model-facing copy crosses this boundary. */
export const NARRATIVE_UTILITY_DISPLAY_NAMES: Readonly<Record<string, string>> = {
  'Character Profile': 'Cast Sheet',
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
  return NARRATIVE_UTILITY_DISPLAY_NAMES[internalName] || internalName
}

export function applyNarrativeDisplayNames(value: string, rendered = false): string {
  let output = String(value || '')
  if (rendered) {
    output = output
      .replace(/<span>Character File<\/span>/g, '<span>Introducing...</span>')
      .replace(/<span>Cast Arrival<\/span>/g, '<span>Welcome to the Stage...</span>')
      .replace(/<span>Unified Archive Generator<\/span>/g, '<span>Archive Entry</span>')
      .replace(/<span>Parallel Current<\/span>/g, '<span>Parallel Scene</span>')
      .replace(/<span>(?:Unwalked Path|What If\?)<\/span>/g, '<span>In Another Life</span>')
  }
  for (const [internalName, displayName] of Object.entries(NARRATIVE_UTILITY_DISPLAY_NAMES)) {
    output = output.replace(new RegExp(internalName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), displayName)
  }
  return output
}

export function narrativeUtilityNames(): string[] {
  return (NARRATIVE_UTILITY_PACK.loomItems || []).map(item => item.loomName).filter(Boolean)
}

export function narrativeUtilityItems(): NarrativeUtilityItem[] {
  return (NARRATIVE_UTILITY_PACK.loomItems || []).map(item => {
    let source = item.loomName === 'Parallel Current'
      ? PARALLEL_SCENE_UTILITY
      : item.loomName === 'Chaos Hooks'
        ? PLOT_SPARKS_V2_UTILITY
        : item.loomContent
    if (item.loomName === 'Cast Arrival') source = `TRIGGER POLICY — CAST INTRODUCTION
Emit when a named non-user character appears on-page for the first time and this response establishes at least two of: role/occupation; physical appearance; relationship to existing cast; characteristic behavior/voice; immediate narrative function.
Do not wait for proof that the character will become major. Do not repeat if history already contains their Cast Introduction.

${source}`
    if (item.loomName === 'Unified Archive Generator') source = `TRIGGER POLICY — ARCHIVE ENTRY
Archive only durable canon milestones that pass BOTH gates.
Gate A — durable canon: an irreversible or long-lived world-state change, formal relationship-state change with durable consequences, major knowledge-changing secret revelation, major faction/institutional event, transfer or destruction of a uniquely important object, or explicit user request.
Gate B — future-reference value: the information is genuinely worth retrieving many turns later.
Do not archive ordinary domestic beats, outfit changes, normal flirting, incremental closeness, visits, ordinary scene transitions, or a name alone. A specialized Surface wins unless the moment independently passes both gates.

${source}`
    return { ...item, loomContent: applyNarrativeDisplayNames(source) }
  })
}

const PARALLEL_SCENE_UTILITY = `### Parallel Scene — Three Live Threads

Use this Surface to show three active off-stage threads grounded in the current story.

CANONICAL OUTPUT
[PARALLEL|Scope|Status]
[parallel_entry]
[text]Entry 1 text[/text]
[parallel_media]<image_request id="parallel-1-[unique-id]" target="custom.artifact-media" slot="parallel-1-[unique-id]" aspect="4:3" alt="Accessible description"><scene_brief>One present-tense cinematic still of this exact off-stage thread. Preserve continuity. No readable text.</scene_brief></image_request>[/parallel_media]
[/parallel_entry]
[parallel_entry]
[text]Entry 2 text[/text]
[parallel_media]<image_request id="parallel-2-[unique-id]" target="custom.artifact-media" slot="parallel-2-[unique-id]" aspect="4:3" alt="Accessible description"><scene_brief>One present-tense cinematic still of this exact off-stage thread. Preserve continuity. No readable text.</scene_brief></image_request>[/parallel_media]
[/parallel_entry]
[parallel_entry]
[text]Entry 3 text[/text]
[parallel_media]<image_request id="parallel-3-[unique-id]" target="custom.artifact-media" slot="parallel-3-[unique-id]" aspect="4:3" alt="Accessible description"><scene_brief>One present-tense cinematic still of this exact off-stage thread. Preserve continuity. No readable text.</scene_brief></image_request>[/parallel_media]
[/parallel_entry]
[parallel_context]
[trajectory]How these three established threads are currently moving, without inventing a resolved future.[/trajectory]
[intersection]Where their existing pressures may touch, stated as present context rather than a guaranteed payoff.[/intersection]
[/parallel_context]
[/PARALLEL]

RULES
- Emit exactly three ordered [parallel_entry] blocks, each with one non-empty [text] and one non-empty [parallel_media].
- Always include exactly one [parallel_context] with one non-empty [trajectory] and one non-empty [intersection].
- Never emit an empty [parallel_media]. Supply one complete request with a non-empty scene_brief for every entry.
- Keep every request attached to its matching entry. IDs and slots are unique, lowercase, slug-safe, and match each other.
- Do not nest another Utility inside Parallel Scene. Do not manufacture a resolved future event merely to populate the Surface.

{{trim}}`

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

function markupAttribute(source: string, name: string): string {
  return new RegExp(`\\b${name}\\s*=\\s*(["'])([\\s\\S]*?)\\1`, 'i').exec(source)?.[2]?.trim() || ''
}

/** Historical Chaos payloads remain readable, but are converted locally into
 * the active semantic representation. This compatibility grammar is never
 * included in model-facing Utility text. */
export function normalizeLegacyPlotSparksMarkup(markup: string): string {
  return String(markup || '').replace(/<chaos_payload\b([^>]*)>((?:(?!<chaos_payload\b)[\s\S])*?)<\/chaos_payload\s*>/gi, (full, attrs: string, body: string) => {
    const hooks = [...body.matchAll(/<chaos_hook\b([^>]*)>([\s\S]*?)<\/chaos_hook\s*>/gi)]
    if (hooks.length !== 7) return full
    const id = markupAttribute(attrs, 'id')
    const lifecycle = markupAttribute(attrs, 'lifecycle') || 'Unused Plot Sparks dissolve after this response.'
    if (!id) return full
    const sparks = hooks.map(match => {
      const key = markupAttribute(match[1] || '', 'key')
      const vector = markupAttribute(match[1] || '', 'vector')
      const text = match[2]?.match(/<hook_text\b[^>]*>([\s\S]*?)<\/hook_text\s*>/i)?.[1]?.trim() || ''
      const media = match[2]?.match(/<hook_media\b[^>]*>([\s\S]*?)<\/hook_media\s*>/i)?.[1]?.trim() || ''
      if (!key || !vector || !text || !media) return ''
      return `[Spark]\n[Key]${key}[/Key]\n[Vector]${vector}[/Vector]\n[Text]${text}[/Text]\n[Media]${media}[/Media]\n[/Spark]`
    })
    if (sparks.some(spark => !spark)) return full
    return `[Plot_Sparks]\n[ID]${id}[/ID]\n[Lifecycle]${lifecycle}[/Lifecycle]\n\n${sparks.join('\n\n')}\n\n[/Plot_Sparks]`
  })
}

/** Repair only the unambiguous known-owner blend inside Plot Sparks Media. */
export function normalizePlotSparksMediaMarkup(markup: string): string {
  return String(markup || '').replace(/\[Media\]((?:(?!\[Media\])[\s\S])*?)\[\/Media\]/gi, (full, media: string) => {
    if ((media.match(/<reverie-illustration\b/gi) || []).length !== 1) return full
    if (/<image_request\b/i.test(media)) return full
    const sceneBriefs = media.match(/<scene_brief\b[^>]*>[\s\S]*?<\/scene_brief\s*>/gi) || []
    const wrongClosers = media.match(/<\/image_request\s*>/gi) || []
    if (sceneBriefs.length !== 1 || wrongClosers.length !== 1 || /<\/reverie-illustration\s*>/i.test(media)) return full
    const repaired = media
      .replace(/<scene_brief\b[^>]*>/i, '<visual_prompt>')
      .replace(/<\/scene_brief\s*>/i, '</visual_prompt>')
      .replace(/<\/image_request\s*>/i, '</reverie-illustration>')
    return `[Media]${repaired}[/Media]`
  })
}

function normalizeDramaticParagraphMarkup(markup: string): string {
  return String(markup || '').replace(/\[dramatic_parallel\]((?:(?!\[dramatic_parallel\])[\s\S])*?)\[\/dramatic_parallel\]/gi, (full, body: string) => {
    if (!/\[dramatic_body\]/i.test(body)) return full
    return `[dramatic_parallel]${body.replace(/\[paragraph\]([\s\S]*?)\[\/paragraph\]/gi, '<p>$1</p>')}[/dramatic_parallel]`
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
const WORLD_BODY_SHELL = /^\s*\[world_media\]([\s\S]{1,24000}?)\[\/world_media\]\s*\[world_detail\]([\s\S]{1,12000}?)\[\/world_detail\]\s*\[world_context\]([\s\S]{1,16000}?)\[\/world_context\]\s*$/i
const NESTED_NARRATIVE_OWNER = /\[(?:Plot_Sparks\]|SCENE(?:\||\])|PARALLEL\||NPC:|SECRET\||WORLD\||WHATIF\||character_phone|private_phone|dossier_ui|dramatic_parallel)|\[\[(?:else|npc|place)\s|<(?:dossier_ui|dramatic_parallel|chaos_payload)\b/i

/** Repair one observed Setting the Scene contract violation inside a complete,
 * otherwise canonical World owner. The first future-use closer is only changed
 * when the following, separately opened future-use field is complete, leaving
 * canonical and ambiguous payloads byte-identical. */
export function normalizeWorldMarkup(markup: string): string {
  return String(markup || '').replace(WORLD_OWNER_RANGE, (full, opening: string, body: string, closing: string) => {
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
  return normalizeWorldMarkup(normalizeElsewhereMarkup(normalizeDramaticParagraphMarkup(normalizeFlatArchiveDossiers(normalizePlotSparksMediaMarkup(normalizeLegacyPlotSparksMarkup(String(markup || '')))))))
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

export function narrativeRegexPack(variant: NarrativeRegexVariant): NarrativeRegexPack {
  const pack = PACKS[variant]
  if (!pack || pack.type !== 'lumiverse_regex_scripts' || pack.scripts.length !== 93) {
    throw new Error(`Invalid Narrative Regex variant: ${variant}`)
  }
  const ids = pack.scripts.map(script => script.script_id)
  if (new Set(ids).size !== ids.length) throw new Error(`Duplicate Narrative Regex script IDs in ${variant}`)
  const pin = pack.scripts.find(script => script.script_id === 'rrcp_final_presentation_pin')
  if (!pin?.replace_string?.includes(EXPECTED_PIN[variant])) throw new Error(`Narrative Character Phone presentation pin mismatch: ${variant}`)
  if (/<scenecard\b|\[scenecard\]/i.test(JSON.stringify(pack))) throw new Error(`Stella Scene Card contract present in ${variant}`)
  return pack
}

export function narrativeRegexScripts(variant: NarrativeRegexVariant): NarrativeRegexScript[] {
  if (DRAMATIC_CUTAWAY_PACK.type !== 'lumiverse_regex_scripts' || DRAMATIC_CUTAWAY_PACK.scripts.length !== 1) {
    throw new Error('Invalid approved Dramatic Cutaway Regex asset')
  }
  if (PLOT_SPARKS_PACK.type !== 'lumiverse_regex_scripts' || PLOT_SPARKS_PACK.scripts.length !== 1) {
    throw new Error('Invalid approved Plot Sparks Regex asset')
  }
  const scripts = [
    CHARACTER_PHONE_OPTIONAL_WALLPAPER_NORMALIZER,
    ...narrativeRegexPack(variant).scripts.filter(script => script.disabled !== true),
    ...PLOT_SPARKS_PACK.scripts.filter(script => script.disabled !== true),
    ...DRAMATIC_CUTAWAY_PACK.scripts.filter(script => script.disabled !== true),
  ]
  const ids = scripts.map(script => script.script_id)
  if (new Set(ids).size !== ids.length) throw new Error(`Duplicate active Narrative Regex script IDs in ${variant}`)
  return scripts
    .map(script => {
      const isParallel = script.script_id === 'reverie_parallel_tracker_images_v1'
      const replacement = sceneCompassPresentation(script.script_id, isParallel ? parallelSceneReplacement(script.replace_string) : script.replace_string)
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

export function renderNarrativeRegex(markup: string, variant: NarrativeRegexVariant, messageId = 'narrative', context: NarrativeRenderContext = {}): string {
  let output = normalizeNarrativeMarkupForRendering(markup)
  const macro = safeMessageId(messageId)
  for (const script of narrativeRegexScripts(variant).filter(script => {
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
