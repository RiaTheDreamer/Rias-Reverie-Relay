import inlineRealistic from '../regex-packs/r45/Reverie-Surfaces-R4.5-INLINE-REALISTIC.json'
import plainRealistic from '../regex-packs/r45/Reverie-Surfaces-R4.5-COLLAPSIBLE-PLAIN-REALISTIC.json'
import sparklingRealistic from '../regex-packs/r45/Reverie-Surfaces-R4.5-COLLAPSIBLE-SPARKLING-REALISTIC.json'
import inlinePrimary from '../regex-packs/r45/Reverie-Surfaces-R4.5-INLINE-PRIMARY.json'
import plainPrimary from '../regex-packs/r45/Reverie-Surfaces-R4.5-COLLAPSIBLE-PLAIN-PRIMARY.json'
import sparklingPrimary from '../regex-packs/r45/Reverie-Surfaces-R4.5-COLLAPSIBLE-SPARKLING-PRIMARY.json'
import bracketInlineRealistic from '../regex-packs/r45/Reverie-Surfaces-R4.5-BRACKET-INLINE-REALISTIC.json'
import bracketPlainRealistic from '../regex-packs/r45/Reverie-Surfaces-R4.5-BRACKET-PLAIN-BUTTON-REALISTIC.json'
import bracketSparklingRealistic from '../regex-packs/r45/Reverie-Surfaces-R4.5-BRACKET-SPARKLE-BUTTON-REALISTIC.json'

export type R45PresentationMode = 'inline' | 'plain' | 'sparkling'
export type R45ColorMode = 'realistic' | 'primary'

export type R45RegexScript = {
  script_id: string
  name: string
  find_regex: string
  replace_string: string
  flags: string
  sort_order: number
  disabled?: boolean
}

type R45Pack = {
  version: string
  type: string
  name?: string
  relay_product_version?: string
  scripts: R45RegexScript[]
}

const PACKS: Record<`${R45PresentationMode}:${R45ColorMode}`, R45Pack> = {
  'inline:realistic': inlineRealistic as R45Pack,
  'plain:realistic': plainRealistic as R45Pack,
  'sparkling:realistic': sparklingRealistic as R45Pack,
  'inline:primary': inlinePrimary as R45Pack,
  'plain:primary': plainPrimary as R45Pack,
  'sparkling:primary': sparklingPrimary as R45Pack,
}
const BRACKET_PACKS: Record<R45PresentationMode, R45Pack> = {
  inline: bracketInlineRealistic as R45Pack,
  plain: bracketPlainRealistic as R45Pack,
  sparkling: bracketSparklingRealistic as unknown as R45Pack,
}

const safeMessageId = (value: string): string => String(value || 'surface').replace(/[^A-Za-z0-9_-]+/g, '-') || 'surface'
const sortedScripts = new Map<string, R45RegexScript[]>()
const sortedBracketScripts = new Map<string, R45RegexScript[]>()

export function r45SurfaceAuthorityPack(presentation: R45PresentationMode, color: R45ColorMode): R45Pack {
  const key = `${presentation}:${color}` as const
  const pack = PACKS[key]
  if (!pack || pack.type !== 'lumiverse_regex_scripts' || pack.relay_product_version !== '0.2.1' || pack.scripts.length !== 138) {
    throw new Error(`Invalid R4.5 Surface authority selection: ${key}`)
  }
  return pack
}

export function r45SurfaceAuthorityScripts(presentation: R45PresentationMode, color: R45ColorMode): R45RegexScript[] {
  const key = `${presentation}:${color}`
  const cached = sortedScripts.get(key)
  if (cached) return cached
  const scripts = [...r45SurfaceAuthorityPack(presentation, color).scripts]
    .filter(script => script.disabled !== true)
    .sort((left, right) => Number(left.sort_order) - Number(right.sort_order))
  sortedScripts.set(key, scripts)
  return scripts
}

export function r45BracketSurfaceAuthorityPack(presentation: R45PresentationMode): R45Pack {
  const pack = BRACKET_PACKS[presentation]
  if (!pack || pack.type !== 'lumiverse_regex_scripts' || pack.scripts.length !== 138) {
    throw new Error(`Invalid R4.5 bracket Surface authority selection: ${presentation}`)
  }
  return pack
}

export function r45BracketSurfaceAuthorityScripts(presentation: R45PresentationMode): R45RegexScript[] {
  const cached = sortedBracketScripts.get(presentation)
  if (cached) return cached
  const scripts = [...r45BracketSurfaceAuthorityPack(presentation).scripts]
    .filter(script => script.disabled !== true)
    .sort((left, right) => Number(left.sort_order) - Number(right.sort_order))
  sortedBracketScripts.set(presentation, scripts)
  return scripts
}

export function renderR45BracketSurfaceAuthority(
  markup: string,
  presentation: R45PresentationMode,
  messageId: string,
): string {
  let output = String(markup || '')
  const macro = safeMessageId(messageId)
  for (const script of r45BracketSurfaceAuthorityScripts(presentation)) {
    try {
      const flags = script.flags.includes('g') ? script.flags : `${script.flags}g`
      const replacement = script.replace_string.replace(/\{\{lastMessageId\}\}/g, macro)
      output = output.replace(new RegExp(script.find_regex, flags), replacement)
    } catch {
      return `<aside class="rrn-contract-recovery" role="status" data-reverie-surface-contract="failed" data-reverie-r45-script="${script.script_id}">Relay Surface needs repair. Reparse or rescan in Relay.</aside>`
    }
  }
  return output
}

export function renderR45SurfaceAuthority(
  markup: string,
  presentation: R45PresentationMode,
  color: R45ColorMode,
  messageId: string,
): string {
  // R4.5 made Discord counts optional for authored XML while its final visual
  // pack captures both fields. Add empty captures only for legacy records;
  // supplied values remain untouched and no arbitrary count is invented.
  let output = String(markup || '').replace(/<discord_server\b([^>]*)>/gi, (opening, attrs: string) => {
    const members = /\bmembers\s*=/.test(attrs) ? '' : ' members=""'
    const online = /\bonline\s*=/.test(attrs) ? '' : ' online=""'
    return `<discord_server${attrs}${members}${online}>`
  })
  // The supplied R4.5 Smartphone rules transform completed <s_img><img>
  // attachments, while Relay lifecycle cards are HTML islands. Normalize only
  // that active lifecycle shape into the existing R4.5 image-message seam so
  // the status card stays at the authored message position without a legacy
  // renderer or a raw XML tag escaping into the visual Surface.
  output = output.replace(/<s_img\b([^>]*)>([\s\S]*?data-rrn-native-request[\s\S]*?)<\/s_img>/gi, (_full, attrs: string, body: string) => {
    const side = /\bside\s*=\s*["'](sent|recv)["']/i.exec(attrs)?.[1]?.toLowerCase() || 'recv'
    return `<div class="rpx-image-msg rpx-image-msg-${side}" data-reverie-r45-lifecycle-media="smartphone">${body}</div>`
  })
  // Kakao's final image rule consumes completed <k_img><img> records. Pending
  // Relay lifecycle cards are already HTML, so bridge only that unresolved
  // shape into the approved Kakao image figure classes before the root shell
  // captures the message stream.
  output = output.replace(/<k_img\b([^>]*)>([\s\S]*?data-rrn-native-request[\s\S]*?)<\/k_img>/gi, (_full, attrs: string, body: string) => {
    const caption = /\bcaption\s*=\s*["']([^"']*)["']/i.exec(attrs)?.[1] || ''
    const figcaption = caption ? `<figcaption>${caption}</figcaption>` : ''
    return `<figure class="html-safe-wrap kk-image" data-reverie-r45-lifecycle-media="kakao">${body}${figcaption}</figure>`
  })
  // A completed record may be hydrated into an authored pending <k_img>
  // carrying side/time rather than the final caption attribute. Canonicalize
  // that one completed shape so the exact R4.5 Kakao image rule consumes it.
  output = output.replace(/<k_img\b([^>]*)>\s*(<img\b[^>]*>)\s*<\/k_img>/gi, (_full, attrs: string, image: string) => {
    if (/\bcaption\s*=/.test(attrs)) return `<k_img${attrs}>${image}</k_img>`
    return `<k_img caption="">${image}</k_img>`
  })
  const macro = safeMessageId(messageId)
  for (const script of r45SurfaceAuthorityScripts(presentation, color)) {
    try {
      const flags = script.flags.includes('g') ? script.flags : `${script.flags}g`
      const replacement = script.replace_string.replace(/\{\{lastMessageId\}\}/g, macro)
      output = output.replace(new RegExp(script.find_regex, flags), replacement)
    } catch (error) {
      // An authority failure is intentionally visible to the R4.5 diagnostic
      // path. Callers must not fall through to a legacy renderer.
      return `<aside class="rrn-contract-recovery" role="status" data-reverie-surface-contract="failed" data-reverie-r45-script="${script.script_id}">Relay Surface needs repair. Reparse or rescan in Relay.</aside>`
    }
  }
  return output
}

export const R45_ACTIVE_ROOTS = [
  'tinder', 'album_cover', 'newspaper', 'inline_chat', 'instagram_dm', 'x_dm', 'discord_dm',
  'google_image_search', 'phone_gallery', 'case_file', 'public_bulletin', 'forum_thread',
  'character_profile', 'magazine_cover', 'tiktok_post', 'ig_app', 'kakao_chat',
  'twitter_app', 'smart_phone', 'yt_thumbnail', 'relationship_map', 'evidence_photo',
  'photo_booth_strip', 'polaroid_frame', 'workspace_chat', 'email_thread', 'imessage_chat',
  'livestream', 'music_player', 'location_share', 'voice_memo', 'notes_app', 'market_listing',
  'property_listing', 'naver_news', 'letter_dispatch', 'medical_record', 'court_transcript',
  'codex_entry', 'diary_app', 'mission_board', 'cctv_evidence', 'discord_server',
  'instagram_profile', 'twitter_profile', 'instagram_stories',
] as const

export function containsR45RenderedSurface(markup: string): boolean {
  return /(?:rr22-|rr23-|rr41-|r43(?:ig|tw|story)|rrdc|srv54-|igls-|twlr-|rpx-|case-file-dossier|cp-card|data-reverie-surface)/i.test(String(markup || ''))
}
