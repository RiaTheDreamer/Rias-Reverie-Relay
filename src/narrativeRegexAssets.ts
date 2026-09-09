import inlinePack from '../regex-packs/narrative-final/Reverie-Narrative-Surfaces-FINAL-Inline.json'
import plainPack from '../regex-packs/narrative-final/Reverie-Narrative-Surfaces-FINAL-Plain-Button.json'
import sparklePack from '../regex-packs/narrative-final/Reverie-Narrative-Surfaces-FINAL-Sparkle-Button.json'
import utilityPack from '../regex-packs/narrative-final/Reverie-Narrative-Utilities-v6.1-FINAL-with-Character-Phone.json'
import dramaticCutawayPack from '../regex-packs/narrative-final/Reverie-Dramatic-Cutaway-BULLETPROOF-V8.json'
import { sceneCompassPresentation } from './sceneCompassPresentation'

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
const NARRATIVE_MEDIA_OWNER_CLASS = /(?:dg-dramatic-media|r65-media|rv6-media|ru-media|ru-portrait|ru-secret-media|ru-thread-media|rrcp-media|rrcp-photo-media|rrcp-wallpaper)/

/** Relay resolves Narrative-owned jobs to direct artifact media nodes. Keep
 * those nodes inside the approved layouts without redesigning their CSS. */
export const NARRATIVE_MEDIA_COMPATIBILITY_STYLE = `<style data-reverie-narrative-media-compat="1">
.dg-dramatic-media{min-width:0;max-width:100%;overflow:hidden;text-align:center}
.dg-dramatic-media>img,.dg-dramatic-media>.reverie-artifact-media{display:block!important;width:100%!important;max-width:100%!important;height:auto!important;margin-inline:auto!important;object-fit:contain!important;object-position:center!important}
.r65-media>.reverie-artifact-media,.rv6-media>.reverie-artifact-media,.ru-media>.reverie-artifact-media,.ru-portrait>.reverie-artifact-media,.ru-secret-media>.reverie-artifact-media,.ru-thread-media>.reverie-artifact-media,.rrcp-media>.reverie-artifact-media,.rrcp-photo-media>.reverie-artifact-media,.rrcp-wallpaper>.reverie-artifact-media{display:block!important;width:100%!important;max-width:100%!important;height:auto!important;margin-inline:auto!important;object-fit:contain!important;object-position:center!important}
</style>`

const safeMessageId = (value: string): string => String(value || 'narrative').replace(/[^A-Za-z0-9_-]+/g, '-') || 'narrative'
const NARRATIVE_MARKUP = /\[(?:SCENE(?:\||\])|PARALLEL\||NPC:|SECRET\||WORLD\||WHATIF\||character_phone|private_phone|pp_|cp_)|\[\[(?:else|npc|place)\s|<(?:dossier_ui|dramatic_parallel)\b/i

export const NARRATIVE_UTILITY_PACK = utilityPack as NarrativeUtilityPack
export const NARRATIVE_REGEX_VARIANTS: NarrativeRegexVariant[] = ['sparkle-button', 'plain-button', 'inline']

/** Public theater labels. Loom names and script IDs remain stable migration
 * keys; only user/model-facing copy crosses this boundary. */
export const NARRATIVE_UTILITY_DISPLAY_NAMES: Readonly<Record<string, string>> = {
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
  return (NARRATIVE_UTILITY_PACK.loomItems || []).map(item => ({ ...item }))
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
  const scripts = [
    ...narrativeRegexPack(variant).scripts.filter(script => script.disabled !== true),
    ...DRAMATIC_CUTAWAY_PACK.scripts.filter(script => script.disabled !== true),
  ]
  const ids = scripts.map(script => script.script_id)
  if (new Set(ids).size !== ids.length) throw new Error(`Duplicate active Narrative Regex script IDs in ${variant}`)
  return scripts
    .map(script => {
      const replacement = sceneCompassPresentation(script.script_id, script.replace_string)
      return {
        ...script,
        replace_string: NARRATIVE_MEDIA_OWNER_CLASS.test(replacement)
          ? `${NARRATIVE_MEDIA_COMPATIBILITY_STYLE}${replacement}`
          : replacement,
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
  let output = String(markup || '')
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
