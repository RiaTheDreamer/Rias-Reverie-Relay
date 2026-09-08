import type { SurfaceNormalizationResult, SurfaceNormalizationSpec } from './c5bReliability'
import { DEFAULT_SURFACE_PROMPT_MODULES } from './protocols'
import { r45SupplementalSurfaceDefinitions } from './r45SurfaceCatalog'
import { r45UtilityContract } from './r45UtilityContracts'

export type SurfaceXmlNode = { tag: string; attrs: string; children: Array<SurfaceXmlNode | string>; void: boolean }
const escapeRe = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const html = new Set('img br hr input span b strong i em u s a p div section figure figcaption details summary style button time small label'.split(' '))
const voidTags = new Set('img br hr input meta link'.split(' '))
const tokenPattern = /<!--[\s\S]*?-->|<\/?[A-Za-z][\w:-]*(?:\s+(?:[^<>"']|"[^"]*"|'[^']*')*)?\s*\/?>/g
const tagOf = (token: string) => /^<\/?([\w:-]+)/.exec(token)?.[1]?.toLowerCase() || ''
export function repairSurfaceLexicalMarkup(source: string): string {
  // Model output can occasionally concatenate two attributes without the
  // required separator: <tag a="1"b="2">. That is deterministic to repair
  // before strict parsing because the closing quote and following attr=value
  // boundary are both explicit. Keep this lexical and tag-local; structural
  // recovery remains the responsibility of the Surface normalizer.
  return String(source || '').replace(/<([A-Za-z][\w:-]*)(?:\s+(?:[^<>"']|"[^"]*"|'[^']*')*)?\s*\/?>/g, token =>
    token.startsWith('</') ? token : token.replace(/(["'])(?=[A-Za-z_:][\w:.-]*\s*=)/g, '$1 '))
}
export const xmlChildren = (node: SurfaceXmlNode): SurfaceXmlNode[] => node.children.filter((child): child is SurfaceXmlNode => typeof child !== 'string')
export const xmlText = (node: SurfaceXmlNode): string => node.children.map(child => typeof child === 'string' ? child : xmlText(child)).join('')
export function serializeSurfaceXml(node: SurfaceXmlNode): string {
  return `<${node.tag}${node.attrs}${node.void ? (voidTags.has(node.tag) ? '>' : '/>') : `>${node.children.map(child => typeof child === 'string' ? child : serializeSurfaceXml(child)).join('')}</${node.tag}>`}`
}
export function parseSurfaceXml(source: string): SurfaceXmlNode | null {
  source = repairSurfaceLexicalMarkup(source)
  const stack: SurfaceXmlNode[] = []; let root: SurfaceXmlNode | null = null; let at = 0
  for (const token of source.matchAll(tokenPattern)) {
    if (stack.length && token.index! > at) stack.at(-1)!.children.push(source.slice(at, token.index))
    at = token.index! + token[0].length
    if (token[0].startsWith('<!--')) { stack.at(-1)?.children.push(token[0]); continue }
    const tag = tagOf(token[0])
    if (token[0].startsWith('</')) { if (stack.at(-1)?.tag !== tag) return null; stack.pop(); continue }
    const node: SurfaceXmlNode = { tag, attrs: token[0].slice(tag.length + 1).replace(/\/?\s*>$/, ''), children: [], void: /\/\s*>$/.test(token[0]) || voidTags.has(tag) }
    if (stack.length) stack.at(-1)!.children.push(node); else if (root) return null; else root = node
    if (!node.void) stack.push(node)
  }
  return stack.length ? null : root
}
export function surfaceXmlAttributes(raw: string): Record<string, string> {
  return Object.fromEntries([...raw.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)].map(match => [match[1], match[2] ?? match[3]]))
}
export function plainSurfaceText(value: string): string {
  return value.replace(/&lt;/gi, '<').replace(/&gt;/gi, '>').replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'").replace(/<[^>]*>/g, ' ').replace(/&amp;/gi, '&').replace(/\s+/g, ' ').trim()
}
const extraRoots: Record<string, string> = { smartphone: 'smart_phone', instagram: 'ig_app', twitter: 'twitter_app', kakao: 'kakao_chat', 'album-cover': 'album_cover', 'magazine-cover': 'magazine_cover', 'photo-booth-strip': 'photo_booth_strip', polaroid: 'polaroid_frame', 'youtube-thumbnail': 'yt_thumbnail', 'character-profile': 'character_profile' }
export function completeSurfaceSpecs(specs: SurfaceNormalizationSpec[]): SurfaceNormalizationSpec[] {
  const extra = Object.entries(extraRoots).filter(([id]) => DEFAULT_SURFACE_PROMPT_MODULES[id] && !specs.some(spec => spec.id === id)).map(([id, wrapper]): SurfaceNormalizationSpec => {
    const prompt = DEFAULT_SURFACE_PROMPT_MODULES[id] || ''
    const opens = [...prompt.matchAll(new RegExp(`<${wrapper}(?=[\\s>])[^>]*>`, 'gi'))]
    const start = opens.at(-1)?.index ?? -1; const end = prompt.indexOf(`</${wrapper}>`, start)
    const sampleXml = start >= 0 && end >= 0 ? prompt.slice(start, end + wrapper.length + 3) : `<${wrapper}></${wrapper}>`
    return { id, wrapper, sampleXml, normalization: { rootAliases: wrapper === 'smart_phone' ? ['phone', 'smartphone'] : wrapper === 'ig_app' ? ['instagram_app'] : [], childAliases: wrapper === 'smart_phone' ? { received: 's_recv', sent: 's_sent', received_message: 's_recv', sent_message: 's_sent' } : {}, optionalMeta: Object.keys(surfaceXmlAttributes(sampleXml.match(/^<[^>]+>/)?.[0] || '')) } }
  })
  const supplemental = r45SupplementalSurfaceDefinitions(1).filter(definition => !specs.some(spec => spec.id === definition.baseSurfaceId) && !extra.some(spec => spec.id === definition.baseSurfaceId)).map((definition): SurfaceNormalizationSpec => ({
    id: definition.baseSurfaceId,
    wrapper: definition.canonicalOuterWrapper,
    sampleXml: definition.sampleXml,
    normalization: { optionalMeta: Object.keys(surfaceXmlAttributes(definition.sampleXml.match(/^<[^>]+>/)?.[0] || '')) },
  }))
  return [...specs, ...extra, ...supplemental]
}
export function surfaceRootAliases(spec: SurfaceNormalizationSpec): string[] {
  return [...new Set([spec.wrapper, spec.wrapper.replace(/_/g, '-'), spec.wrapper.replace(/_/g, ''), ...(spec.normalization?.rootAliases || [])])]
}
type Grammar = { children: Map<string, string[]>; aliases: Map<string, string>; known: Set<string>; attrFields: Map<string, Set<string>> }
const grammarCache = new Map<string, Grammar>()
function mergeAttrFields(attrFields: Map<string, Set<string>>, tag: string, fields: string[]): void {
  const set = attrFields.get(tag) || new Set<string>()
  for (const field of fields) {
    set.add(field)
    attrFields.set(field, attrFields.get(field) || new Set<string>())
  }
  attrFields.set(tag, set)
}
function grammarFor(spec: SurfaceNormalizationSpec): Grammar {
  const cacheKey = `${spec.id}:${spec.sampleXml || ''}:${JSON.stringify(spec.normalization || {})}`
  const cached = grammarCache.get(cacheKey)
  if (cached) return cached
  const children = new Map<string, string[]>(); const aliases = new Map<string, string>(); const known = new Set<string>([spec.wrapper, 'image_request', 'scene_brief', 'img']); const attrFields = new Map<string, Set<string>>()
  const sample = parseSurfaceXml(spec.sampleXml || '')
  const walk = (node: SurfaceXmlNode) => {
    known.add(node.tag)
    const fields = attrFields.get(node.tag) || new Set<string>()
    for (const key of Object.keys(surfaceXmlAttributes(node.attrs))) {
      fields.add(key)
      known.add(key)
    }
    attrFields.set(node.tag, fields)
    const row = children.get(node.tag) || []
    for (const child of xmlChildren(node)) { if (!row.includes(child.tag)) row.push(child.tag); walk(child) }
    children.set(node.tag, row)
  }
  if (sample) walk(sample)
  for (const definition of r45SupplementalSurfaceDefinitions(1)) {
    if (definition.baseSurfaceId !== spec.id && definition.canonicalOuterWrapper !== spec.wrapper) continue
    const supplementalSample = parseSurfaceXml(definition.sampleXml || '')
    if (supplementalSample) walk(supplementalSample)
  }
  for (const source of [DEFAULT_SURFACE_PROMPT_MODULES[spec.id] || '', r45UtilityContract(spec.id), spec.sampleXml || '']) {
    for (const token of source.matchAll(/<\/?([a-z][\w_]*)\b/g)) known.add(token[1])
  }
  children.set('image_request', ['scene_brief', 'prompt', 'negative_prompt', 'negative', 'context_caption'])
  if (spec.wrapper === 'twitter_app') {
    children.set('for_you', ['tw_post']); children.set('following', ['tw_post']); children.set('thread', ['tw_thread_main', 'tw_reply']); children.set('trends', ['tw_trend'])
    children.set('tw_post', [...(children.get('tw_post') || []), 'image_request', 'tw_media', 'tw_comments'])
    children.set('tw_media', ['image_request', 'image_request_error', 'tw_media', 'img'])
    children.set('tw_comments', ['tw_comment']); children.set('tw_comment', ['tw_comment_reply'])
  }
  if (spec.wrapper === 'ig_app') {
    children.set('image', ['image_request', 'image_request_error', 'img'])
    children.set('ig_media', ['image_request', 'image_request_error', 'ig_slide', 'img'])
    children.set('ig_slide', ['image_request', 'image_request_error', 'img'])
    children.set(spec.wrapper, ['image_request', 'image', 'ig_media', 'caption', 'ig_caption', 'comments', 'ig_comments', 'i_comment', 'ig_comment'])
    children.set('comments', ['i_comment', 'ig_comment'])
    children.set('i_comment', ['i_reply'])
    aliases.set('ig_caption', 'caption'); aliases.set('ig_comments', 'comments'); aliases.set('ig_comment', 'i_comment')
  }
  if (spec.wrapper === 'kakao_chat') {
    children.set('messages', [...new Set([...(children.get('messages') || []), 'k_msg', 'k_part', 'k_date', 'k_system', 'k_unread', 'k_typing', 'k_img', 'image_request', 'image_request_error'])])
    children.set('k_msg', [...(children.get('k_msg') || []), 'image_request', 'image_request_error', 'k_img'])
    children.set('k_img', [...new Set([...(children.get('k_img') || []), 'image_request', 'image_request_error', 'img'])])
    mergeAttrFields(attrFields, 'k_msg', ['sender', 'k_part', 'k_name', 'name', 'user', 'author', 'time', 'k_time', 'side', 'avatar', 'color', 'read'])
    mergeAttrFields(attrFields, 'k_part', ['name', 'k_name', 'sender', 'user', 'author', 'avatar', 'color'])
    mergeAttrFields(attrFields, 'k_system', ['type', 'time', 'k_time', 'k_part'])
  }
  for (const tag of known) for (const alias of [tag.replace(/_/g, '-'), tag.replace(/_/g, '')]) if (alias !== tag) aliases.set(alias, tag)
  for (const alias of surfaceRootAliases(spec)) aliases.set(alias, spec.wrapper)
  for (const [alias, tag] of Object.entries(spec.normalization?.childAliases || {})) aliases.set(alias, tag)
  if (spec.wrapper === 'character_profile') aliases.set('media', 'portrait')
  if (spec.wrapper === 'discord_server') {
    aliases.set('avatar_media', 'avatar')
    children.set('avatar', ['image_request', 'image_request_error', 'img'])
    children.set('server_avatar_msg', ['avatar', 'avatar_media', 'text', 'server_media'])
    children.set('server_channel', [...new Set([...(children.get('server_channel') || []), 'server_avatar_msg', 'server_msg', 'server_media'])])
  }
  if (spec.wrapper === 'smart_phone') {
    children.set('messages', [...new Set([...(children.get('messages') || []), 's_recv', 's_sent', 's_img', 's_date', 's_note', 'image_request'])])
    children.set('s_img', ['image_request', 'img'])
    mergeAttrFields(attrFields, 's_recv', ['time', 'sender'])
    mergeAttrFields(attrFields, 's_sent', ['time', 'sender'])
    mergeAttrFields(attrFields, 's_img', ['side', 'time'])
  }
  if (spec.wrapper === 'album_cover') { children.set(spec.wrapper, ['title', 'artist', 'release', 'artwork', 'media']); children.set('artwork', ['image_request']); children.set('media', ['image_request']); for (const tag of ['title', 'artist', 'release', 'artwork', 'media']) known.add(tag) }
  if (spec.wrapper === 'case_file') { children.set(spec.wrapper, ['cf_tab', 'cf_sheet', 'cf_evidence', 'cf_timeline', 'details', 'cf_notes']); known.add('cf_evidence'); known.add('cf_timeline'); known.add('cf_notes') }
  if (spec.wrapper === 'relationship_map') {
    const rootOrder = children.get(spec.wrapper) || []
    children.set(spec.wrapper, [...rootOrder.filter(tag => !['connections', 'insight'].includes(tag)), 'character_four', 'character_five', 'connections', 'insight'])
    for (const tag of ['character_four', 'character_five']) children.set(tag, children.get('character_three') || [])
    children.set('connections', ['one_two', 'one_three', 'one_four', 'one_five', 'three_four'])
  }
  if (spec.wrapper === 'property_listing') {
    children.set(spec.wrapper, [...new Set([...(children.get(spec.wrapper) || []), 'prop_description', 'prop_amenities', 'prop_history'])])
    children.set('prop_amenities', ['prop_amenity'])
    children.set('prop_history', ['prop_event'])
    aliases.set('prop_description', 'prop_desc')
  }
  if (spec.wrapper === 'instagram_profile') {
    aliases.set('igp_tag', 'igp_tagged_item')
    children.set('igp_post', [...new Set([...(children.get('igp_post') || []), 'igp_tagged_item'])])
  }
  if (spec.wrapper === 'tinder') {
    children.set(spec.wrapper, [...new Set(['user', ...(children.get(spec.wrapper) || [])])])
    children.set('user', ['name', 'avatar'])
    children.set('avatar', ['image_request', 'image_request_error', 'img'])
  }
  const mediaLike = [...known].filter(tag => /(?:^|_)(?:media|image|photo|avatar|cover|artwork|feed|frame|attachment|portrait)$/i.test(tag) || ['photo', 'image', 'artwork', 'portrait'].includes(tag))
  for (const tag of mediaLike) children.set(tag, [...new Set([...(children.get(tag) || []), 'image_request', 'image_request_error', 'img'])])
  for (const rows of children.values()) for (const tag of rows) known.add(tag)
  for (const fields of attrFields.values()) for (const field of fields) known.add(field)
  const grammar = { children, aliases, known, attrFields }
  grammarCache.set(cacheKey, grammar)
  while (grammarCache.size > 64) grammarCache.delete(grammarCache.keys().next().value!)
  return grammar
}
export function residualSurfaceTags(markup: string, spec: SurfaceNormalizationSpec): string[] {
  const styles = (markup.match(/<style\b[^>]*>[\s\S]*?<\/style>/gi) || []).join('\n')
  const visible = markup.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
  // Some approved designs deliberately style semantic custom elements. Those
  // are renderer-owned nodes, not an unconsumed generic field fallback.
  return [...grammarFor(spec).known].filter(tag => tag === spec.wrapper && !html.has(tag) && new RegExp(`<${escapeRe(tag)}(?=[\\s>])`, 'i').test(visible) && !new RegExp(`(?:[\\s>,}]|^)${escapeRe(tag)}(?=[\\s{[.:>,])`, 'i').test(styles))
}
function pathsTo(grammar: Grammar, parent: string, child: string, seen = new Set<string>()): string[][] {
  if (seen.has(parent) || seen.size > 6) return []
  const next = new Set([...seen, parent]); const allowed = grammar.children.get(parent) || []
  if (allowed.includes(child)) return [[child]]
  return allowed.filter(tag => !html.has(tag) && tag !== 'image_request').flatMap(tag => pathsTo(grammar, tag, child, next).map(path => [tag, ...path]))
}
function descendantsByTag(node: SurfaceXmlNode, tag: string): SurfaceXmlNode[] {
  return xmlChildren(node).flatMap(child => child.tag === tag ? [child, ...descendantsByTag(child, tag)] : descendantsByTag(child, tag))
}
function normalizeSmartphoneBlockForCanonicalParsing(input: string): string {
  // R4.5 Smartphone rendering is message-led. Model-authored notification
  // summaries are not a visual success requirement and may contain legacy
  // helper rows such as <notification/> that would otherwise poison the whole
  // Surface before the valid conversation can render. Drop that unsupported
  // top-level section before grammar validation; keep <messages> ownership
  // and message order intact.
  return normalizeSmartphoneMessageTagsForCanonicalParsing(String(input || '')
    .replace(/<notifications\b[^>]*>[\s\S]*?<\/notifications>/gi, '')
    .replace(/<notifications\b[^>]*\/>/gi, ''))
}
function normalizeSmartphoneMessageTagsForCanonicalParsing(input: string): string {
  // Story output sometimes opens one Smartphone text-message tag and closes
  // the sibling tag. The opening node is authoritative when the repair is
  // deterministic: <s_recv> must close as </s_recv>, and <s_sent> must close
  // as </s_sent>. This tolerant pass runs before canonical validation, so a
  // single malformed bubble does not send an otherwise valid phone to the
  // generic repair UI.
  const boundary = /<\/?s_(?:recv|sent)\b(?:\s+(?:[^<>"']|"[^"]*"|'[^']*')*)?\s*\/?>|<\/(?:messages|smart_phone)\s*>|<(?:s_img|image_request|image_request_error)\b(?:\s+(?:[^<>"']|"[^"]*"|'[^']*')*)?\s*\/?>/gi
  let output = ''
  let cursor = 0
  let openMessageTag = ''
  for (const match of input.matchAll(boundary)) {
    const token = match[0]
    const index = match.index || 0
    const tag = tagOf(token)
    const isMessageTag = tag === 's_recv' || tag === 's_sent'
    const isClosing = token.startsWith('</')
    const isVoid = /\/\s*>$/.test(token)
    output += input.slice(cursor, index)
    if (isMessageTag && !isClosing) {
      if (openMessageTag) output += `</${openMessageTag}>`
      output += token
      openMessageTag = isVoid ? '' : tag
    } else if (isMessageTag && isClosing) {
      if (openMessageTag) {
        output += `</${openMessageTag}>`
        openMessageTag = ''
      }
      // Orphan </s_recv>/</s_sent> tokens without a corresponding open text
      // message are discarded. They carry no attributes/content and keeping
      // them would only poison the parent Surface.
    } else {
      if (openMessageTag) {
        output += `</${openMessageTag}>`
        openMessageTag = ''
      }
      output += token
    }
    cursor = index + token.length
  }
  output += input.slice(cursor)
  if (openMessageTag) output += `</${openMessageTag}>`
  return output
}
const kakaoColors = ['#6b82a8', '#9c6b8f', '#7a9b73', '#b07a61', '#8a74b0', '#5f9da2', '#a86b7d', '#b29b55']
function surfaceAttrValue(value: string): string {
  return String(value || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
function replaceSurfaceAttr(attrs: string, key: string, value: string): string {
  const cleaned = String(attrs || '').replace(new RegExp(`\\s*${escapeRe(key)}\\s*=\\s*(?:"[^"]*"|'[^']*')`, 'gi'), '').trim()
  return `${cleaned ? ` ${cleaned}` : ''} ${key}="${surfaceAttrValue(value)}"`
}
function kakaoInitial(name: string): string {
  const cleaned = plainSurfaceText(name || '').trim()
  if (!cleaned) return 'K'
  const parts = cleaned.split(/\s+/).filter(Boolean)
  return (parts.length > 1 ? parts.map(part => part[0]).join('').slice(0, 2) : cleaned[0]).toUpperCase()
}
function kakaoColorFor(name: string): string {
  const key = plainSurfaceText(name || 'Kakao')
  let hash = 0
  for (const char of key) hash = ((hash * 31) + char.charCodeAt(0)) >>> 0
  return kakaoColors[hash % kakaoColors.length]
}
function kakaoKnown(value: string | undefined): string {
  const text = plainSurfaceText(value || '').trim()
  return !text || /^[-—–]+$/.test(text) ? '' : text
}
function normalizeKakaoSide(value: string | undefined): string {
  const side = String(value || '').trim().toLowerCase()
  if (['right', 'sent', 'send', 'sender', 'me', 'mine', 'out', 'outgoing'].includes(side)) return 'right'
  return 'left'
}
function sameKakaoIdentity(left: string, right: string): boolean {
  const normalize = (value: string) => plainSurfaceText(value || '').toLocaleLowerCase().replace(/[^a-z0-9가-힣]+/gi, '')
  return Boolean(normalize(left) && normalize(left) === normalize(right))
}
function normalizeKakaoImageRequest(node: SurfaceXmlNode): SurfaceXmlNode {
  if (node.tag !== 'image_request' && node.tag !== 'image_request_error') return node
  let attrs = node.attrs || ''
  attrs = replaceSurfaceAttr(attrs, 'target', 'kakao.image')
  attrs = replaceSurfaceAttr(attrs, 'aspect', '4:3')
  return { ...node, attrs }
}
function normalizeKakaoSurface(root: SurfaceXmlNode, original: string): void {
  const direct = xmlChildren(root)
  let participants = direct.find(child => child.tag === 'participants')
  let messages = direct.find(child => child.tag === 'messages')
  if (!participants) {
    participants = { tag: 'participants', attrs: '', children: [], void: false }
    root.children.unshift(participants)
  }
  if (!messages) {
    messages = { tag: 'messages', attrs: '', children: [], void: false }
    root.children.push(messages)
  }

  const participantNames: string[] = []
  const participantText = plainSurfaceText(serializeSurfaceXml(participants))
  participants.children = participants.children.map(child => {
    if (typeof child === 'string') return child
    if (child.tag !== 'k_part') return child
    const attrs = surfaceXmlAttributes(child.attrs)
    const name = kakaoKnown(attrs.name || attrs.sender || attrs.k_name || attrs.k_part || xmlText(child)) || 'Participant'
    participantNames.push(name)
    return {
      ...child,
      attrs: ` name="${surfaceAttrValue(name)}" avatar="${surfaceAttrValue(kakaoKnown(attrs.avatar) || kakaoInitial(name))}" color="${surfaceAttrValue(kakaoKnown(attrs.color) || kakaoColorFor(name))}"`,
    }
  })
  if (!participantNames.length && participantText) {
    const candidates = participantText.split(/[,;]|(?:\s+—\s+)|(?:\s+·\s+)/).map(part => kakaoKnown(part)).filter(Boolean)
    participantNames.push(...candidates.slice(0, 6))
  }

  const rootAttrs = surfaceXmlAttributes(root.attrs)
  const ownerName = kakaoKnown(rootAttrs.owner || rootAttrs.sender || rootAttrs.me || rootAttrs.user || rootAttrs.self || rootAttrs.local)
  const fallbackTitle = participantNames.length > 1
    ? `${participantNames.slice(0, 3).join(', ')}${participantNames.length > 3 ? ' +' : ''}`
    : participantNames[0] || 'KakaoTalk Group Chat'
  root.attrs = [
    `title="${surfaceAttrValue(kakaoKnown(rootAttrs.title) || fallbackTitle)}"`,
    `date="${surfaceAttrValue(kakaoKnown(rootAttrs.date) || 'Date unknown')}"`,
    `time="${surfaceAttrValue(kakaoKnown(rootAttrs.time) || 'Time unknown')}"`,
    `unread="${surfaceAttrValue(kakaoKnown(rootAttrs.unread) || '0')}"`,
  ].map(part => ` ${part}`).join('')

  const normalizeMessageChild = (child: SurfaceXmlNode | string): SurfaceXmlNode | string => {
    if (typeof child === 'string') return child.trim() ? { tag: 'k_system', attrs: ' type="notice"', children: [child], void: false } : child
    const attrs = surfaceXmlAttributes(child.attrs)
    if (child.tag === 'k_msg' || child.tag === 'k_part') {
      const senderIdentity = kakaoKnown(attrs.sender || attrs.k_part || attrs.name || attrs.k_name) || 'Participant'
      const sender = kakaoKnown(attrs.name || attrs.k_name || attrs.sender || attrs.k_part) || senderIdentity
      const side = attrs.side ? normalizeKakaoSide(attrs.side) : ownerName && (sameKakaoIdentity(sender, ownerName) || sameKakaoIdentity(senderIdentity, ownerName)) ? 'right' : 'left'
      const time = kakaoKnown(attrs.time || attrs.k_time)
      return {
        ...child,
        tag: 'k_msg',
        attrs: ` sender="${surfaceAttrValue(sender)}" avatar="${surfaceAttrValue(kakaoKnown(attrs.avatar) || kakaoInitial(sender))}" color="${surfaceAttrValue(kakaoKnown(attrs.color) || kakaoColorFor(sender))}" time="${surfaceAttrValue(time)}" side="${side}" read="${surfaceAttrValue(kakaoKnown(attrs.read))}"`,
        children: child.children.map(grandchild => typeof grandchild === 'string'
          ? grandchild
          : grandchild.tag === 'image_request'
            ? normalizeKakaoImageRequest(grandchild)
            : grandchild),
      }
    }
    if (child.tag === 'k_system') {
      const type = kakaoKnown(attrs.type || attrs.k_part) || 'notice'
      const time = kakaoKnown(attrs.time || attrs.k_time)
      const body = xmlText(child).trim()
      return { ...child, attrs: ` type="${surfaceAttrValue(type)}"`, children: [time && !body.includes(time) ? `${time} · ${body}` : body], void: false }
    }
    if (child.tag === 'k_img') {
      const side = normalizeKakaoSide(attrs.side)
      const time = kakaoKnown(attrs.time || attrs.k_time)
      return {
        ...child,
        attrs: ` side="${side}" time="${surfaceAttrValue(time)}"`,
        children: child.children.map(grandchild => typeof grandchild === 'string' ? grandchild : normalizeKakaoImageRequest(grandchild)),
      }
    }
    if (child.tag === 'image_request') {
      return { tag: 'k_img', attrs: ' side="left" time=""', children: [normalizeKakaoImageRequest(child)], void: false }
    }
    if (child.tag === 'k_typing') {
      const names = kakaoKnown(attrs.names || attrs.name || attrs.sender) || 'Someone'
      return { ...child, attrs: ` names="${surfaceAttrValue(names)}" avatar="${surfaceAttrValue(kakaoKnown(attrs.avatar) || kakaoInitial(names))}" color="${surfaceAttrValue(kakaoKnown(attrs.color) || kakaoColorFor(names))}"`, void: true }
    }
    return child
  }
  messages.children = messages.children.map(normalizeMessageChild)
  const order = ['participants', 'messages']
  const nodes = xmlChildren(root)
  nodes.sort((left, right) => {
    const li = order.indexOf(left.tag), ri = order.indexOf(right.tag)
    if (li < 0 || ri < 0) return li < 0 ? 1 : ri < 0 ? -1 : 0
    return li - ri
  })
  let index = 0
  root.children = root.children.map(child => typeof child === 'string' ? '' : nodes[index++])
  if (!original.includes('<messages')) messages.children = messages.children.length ? messages.children : [{ tag: 'k_system', attrs: ' type="notice"', children: ['No Kakao messages were available.'], void: false }]
}
function directChild(node: SurfaceXmlNode, tag: string): SurfaceXmlNode | undefined {
  return xmlChildren(node).find(child => child.tag === tag)
}
function childTextNode(tag: string, text: string, attrs = ''): SurfaceXmlNode {
  return { tag, attrs, children: [plainSurfaceText(text)], void: false }
}
function setAttrs(node: SurfaceXmlNode, values: Record<string, string>): void {
  node.attrs = Object.entries(values).map(([key, value]) => ` ${key}="${surfaceAttrValue(value)}"`).join('')
}
function normalizeInstagramSurface(root: SurfaceXmlNode): void {
  const attrs = surfaceXmlAttributes(root.attrs)
  setAttrs(root, {
    user: kakaoKnown(attrs.user || attrs.handle || attrs.name) || 'user',
    loc: kakaoKnown(attrs.loc || attrs.location || attrs.place) || '',
    likes: kakaoKnown(attrs.likes) || '0',
    verified: kakaoKnown(attrs.verified) || '',
  })
  let comments = directChild(root, 'comments')
  const liftedComments = xmlChildren(root).filter(child => child.tag === 'i_comment')
  if (!comments && liftedComments.length) {
    comments = { tag: 'comments', attrs: '', children: [], void: false }
    root.children.push(comments)
  }
  if (comments) {
    comments.children.push(...liftedComments)
    root.children = root.children.filter(child => typeof child === 'string' || child.tag !== 'i_comment')
  }
  if (!directChild(root, 'caption')) root.children.push(childTextNode('caption', ''))
  if (!directChild(root, 'comments')) root.children.push({ tag: 'comments', attrs: '', children: [], void: false })
}
function normalizeTwitterSurface(root: SurfaceXmlNode): void {
  const normalizePost = (node: SurfaceXmlNode) => {
    const attrs = surfaceXmlAttributes(node.attrs)
    node.attrs = [
      ` author="${surfaceAttrValue(kakaoKnown(attrs.author || attrs.user || attrs.name) || 'Author')}"`,
      ` handle="${surfaceAttrValue(kakaoKnown(attrs.handle) || '@handle')}"`,
      ` time="${surfaceAttrValue(kakaoKnown(attrs.time) || 'now')}"`,
      ` avatar="${surfaceAttrValue(kakaoKnown(attrs.avatar))}"`,
      ` verified="${surfaceAttrValue(kakaoKnown(attrs.verified))}"`,
      ` replies="${surfaceAttrValue(kakaoKnown(attrs.replies) || '0')}"`,
      ` reposts="${surfaceAttrValue(kakaoKnown(attrs.reposts) || '0')}"`,
      ` likes="${surfaceAttrValue(kakaoKnown(attrs.likes) || '0')}"`,
      ` views="${surfaceAttrValue(kakaoKnown(attrs.views) || '0')}"`,
      ` pinned="${surfaceAttrValue(kakaoKnown(attrs.pinned))}"`,
    ].join('')
  }
  const normalizeComment = (node: SurfaceXmlNode) => {
    const attrs = surfaceXmlAttributes(node.attrs)
    node.attrs = [
      ` author="${surfaceAttrValue(kakaoKnown(attrs.author || attrs.user || attrs.name) || 'Reader')}"`,
      ` handle="${surfaceAttrValue(kakaoKnown(attrs.handle) || '@reader')}"`,
      ` time="${surfaceAttrValue(kakaoKnown(attrs.time) || 'now')}"`,
      ` verified="${surfaceAttrValue(kakaoKnown(attrs.verified))}"`,
      ` likes="${surfaceAttrValue(kakaoKnown(attrs.likes) || '0')}"`,
    ].join('')
  }
  const walk = (node: SurfaceXmlNode) => {
    if (node.tag === 'tw_post') normalizePost(node)
    if (node.tag === 'tw_comment') normalizeComment(node)
    for (const child of xmlChildren(node)) walk(child)
  }
  walk(root)
}
function normalizeDiscordServerSurface(root: SurfaceXmlNode): void {
  const channels = xmlChildren(root).filter(child => child.tag === 'server_channel')
  for (const channel of channels) {
    const attrs = surfaceXmlAttributes(channel.attrs)
    if (channel.void) {
      channel.void = false
      channel.children = []
    }
    if (!attrs.slot) channel.attrs = replaceSurfaceAttr(channel.attrs, 'slot', String(channels.indexOf(channel) + 1))
    const updatedAttrs = surfaceXmlAttributes(channel.attrs)
    if (!updatedAttrs.name) channel.attrs = replaceSurfaceAttr(channel.attrs, 'name', `channel-${channels.indexOf(channel) + 1}`)
    if (!updatedAttrs.description) channel.attrs = replaceSurfaceAttr(channel.attrs, 'description', '')
    const normalized: Array<SurfaceXmlNode | string> = []
    for (const child of channel.children) {
      if (typeof child === 'string') { if (child.trim()) normalized.push(child); continue }
      if (child.tag !== 'server_avatar_msg') { normalized.push(child); continue }
      const carriedMedia = xmlChildren(child).filter(grandchild => grandchild.tag === 'server_media')
      child.children = child.children.filter(grandchild => typeof grandchild === 'string' || grandchild.tag !== 'server_media')
      const nonEmptyText = child.children.filter(grandchild => typeof grandchild === 'string' && grandchild.trim()).join(' ')
      child.children = child.children.filter(grandchild => typeof grandchild !== 'string' || !grandchild.trim())
      if (!directChild(child, 'avatar')) child.children.unshift({ tag: 'avatar', attrs: '', children: [], void: false })
      if (!directChild(child, 'text')) child.children.push(childTextNode('text', nonEmptyText))
      normalized.push(child, ...carriedMedia)
    }
    for (const child of normalized) if (typeof child !== 'string' && child.tag === 'server_msg') {
      const messageAttrs = surfaceXmlAttributes(child.attrs)
      child.attrs = [
        ` user="${surfaceAttrValue(kakaoKnown(messageAttrs.user) || 'Participant')}"`,
        ` avatar="${surfaceAttrValue(kakaoKnown(messageAttrs.avatar) || kakaoInitial(messageAttrs.user || 'Participant'))}"`,
        ` color="${surfaceAttrValue(kakaoKnown(messageAttrs.color) || kakaoColorFor(messageAttrs.user || 'Participant'))}"`,
        ` time="${surfaceAttrValue(kakaoKnown(messageAttrs.time) || '')}"`,
      ].join('')
    }
    channel.children = normalized
  }
  for (let index = channels.length + 1; index <= 4; index += 1) {
    root.children.push({
      tag: 'server_channel',
      attrs: ` slot="${index}" name="channel-${index}" description=""`,
      children: [],
      void: false,
    })
  }
}
function normalizePropertyListingSurface(root: SurfaceXmlNode): void {
  const attrs = surfaceXmlAttributes(root.attrs)
  setAttrs(root, {
    title: kakaoKnown(attrs.title) || 'Property listing',
    price: kakaoKnown(attrs.price) || 'Price unavailable',
    location: kakaoKnown(attrs.location || attrs.address) || 'Location unavailable',
    beds: kakaoKnown(attrs.beds || attrs.bedrooms || attrs.type) || '—',
    baths: kakaoKnown(attrs.baths || attrs.bathrooms) || '—',
    size: kakaoKnown(attrs.size || attrs.area) || '—',
  })
  for (const child of xmlChildren(root)) if (child.tag === 'prop_description') child.tag = 'prop_desc'
  for (const media of descendantsByTag(root, 'prop_media')) media.attrs = ''
  if (!directChild(root, 'prop_desc')) root.children.push(childTextNode('prop_desc', ''))
  const amenities = directChild(root, 'prop_amenities')
  if (amenities) {
    root.children = root.children.filter(child => child !== amenities)
    root.children.push({ tag: 'details', attrs: '', children: [childTextNode('summary', 'Amenities'), amenities], void: false })
  }
  const history = directChild(root, 'prop_history')
  if (history) {
    root.children = root.children.filter(child => child !== history)
    root.children.push({ tag: 'details', attrs: '', children: [childTextNode('summary', 'History'), history], void: false })
  }
}
function normalizeDatingProfileSurface(root: SurfaceXmlNode): void {
  const profiles = directChild(root, 'profiles')
  if (!directChild(root, 'user')) {
    root.children.unshift({
      tag: 'user',
      attrs: '',
      children: [childTextNode('name', 'You'), { tag: 'avatar', attrs: '', children: ['Y'], void: false }],
      void: false,
    })
  }
  let index = 1
  for (const profile of descendantsByTag(root, 'profile')) {
    const slot = String(index)
    profile.attrs = ` slot="${slot}" prev="${index === 1 ? '3' : String(index - 1)}" next="${index === 3 ? '1' : String(index + 1)}"`
    const ordered = ['name', 'age', 'subtitle', 'role', 'tags', 'bio', 'photo'].map(tag => directChild(profile, tag) || (
      tag === 'subtitle' ? childTextNode('subtitle', 'Nearby')
      : tag === 'role' ? childTextNode('role', 'Profile')
      : tag === 'tags' ? childTextNode('tags', '')
      : undefined
    )).filter(Boolean) as SurfaceXmlNode[]
    profile.children = ordered
    index += 1
  }
  if (!profiles) root.children.unshift({ tag: 'profiles', attrs: '', children: [], void: false })
}
function normalizeCaseFileSurface(root: SurfaceXmlNode): void {
  let sheet = directChild(root, 'cf_sheet')
  const evidence = directChild(root, 'cf_evidence')
  if (!sheet && evidence) {
    sheet = { tag: 'cf_sheet', attrs: '', children: [{ tag: 'cf_media', attrs: '', children: evidence.children, void: false }, { tag: 'cf_facts', attrs: '', children: [], void: false }], void: false }
    root.children = root.children.filter(child => child !== evidence)
    root.children.unshift(sheet)
  }
  if (sheet && !directChild(sheet, 'cf_media')) sheet.children.unshift({ tag: 'cf_media', attrs: '', children: [], void: false })
  if (sheet && !directChild(sheet, 'cf_facts')) sheet.children.push({ tag: 'cf_facts', attrs: '', children: [], void: false })
  const timeline = directChild(root, 'cf_timeline')
  if (timeline) for (const event of descendantsByTag(timeline, 'cf_event')) {
    const attrs = surfaceXmlAttributes(event.attrs)
    if (!attrs.title && attrs.event) event.attrs = replaceSurfaceAttr(event.attrs, 'title', attrs.event)
    if (!xmlText(event).trim()) event.children = [attrs.event || attrs.title || 'Timeline event']
  }
  if (!directChild(root, 'cf_notes')) root.children.push(childTextNode('cf_notes', 'No additional notes.'))
}
function normalizeCctvSurface(root: SurfaceXmlNode): void {
  let index = 1
  for (const feed of descendantsByTag(root, 'cv_feed')) {
    const attrs = surfaceXmlAttributes(feed.attrs)
    feed.attrs = [
      ` slot="${surfaceAttrValue(kakaoKnown(attrs.slot) || String(index))}"`,
      ` label="${surfaceAttrValue(kakaoKnown(attrs.label || attrs.camera || attrs.location || attrs.angle) || `Camera ${index}`)}"`,
      ` time="${surfaceAttrValue(kakaoKnown(attrs.time) || 'Time unknown')}"`,
    ].join('')
    index += 1
  }
  if (!directChild(root, 'cv_note')) root.children.push(childTextNode('cv_note', 'No additional camera notes.'))
}
function normalizeInstagramProfileSurface(root: SurfaceXmlNode): void {
  const attrs = surfaceXmlAttributes(root.attrs)
  const handle = kakaoKnown(attrs.handle) || kakaoKnown(attrs.user) || '@profile'
  setAttrs(root, {
    handle,
    name: kakaoKnown(attrs.name || attrs.user) || 'Profile',
    verified: kakaoKnown(attrs.verified) || '',
    bio: kakaoKnown(attrs.bio) || '',
    followers: kakaoKnown(attrs.followers) || '0',
    following: kakaoKnown(attrs.following) || '0',
    posts: kakaoKnown(attrs.posts) || '0',
  })
  const avatar = directChild(root, 'igp_avatar')
  const avatarChildren = avatar ? avatar.children : []
  let tagged = directChild(root, 'igp_tagged')
  for (const post of descendantsByTag(root, 'igp_post')) {
    const attrs = surfaceXmlAttributes(post.attrs)
    post.attrs = [
      ` id="${surfaceAttrValue(kakaoKnown(attrs.id || attrs.slot) || 'post')}"`,
      ` owner="${surfaceAttrValue(kakaoKnown(attrs.owner || handle) || '@profile')}"`,
      ` likes="${surfaceAttrValue(kakaoKnown(attrs.likes) || '0')}"`,
      ` time="${surfaceAttrValue(kakaoKnown(attrs.time) || 'now')}"`,
    ].join('')
    const mediaChildren = post.children.filter(child => typeof child !== 'string' && ['image_request', 'image_request_error', 'img'].includes(child.tag))
    post.children = post.children.filter(child => !(typeof child !== 'string' && ['image_request', 'image_request_error', 'img'].includes(child.tag)))
    const escapedTagged = post.children.filter(child => typeof child !== 'string' && child.tag === 'igp_tagged_item') as SurfaceXmlNode[]
    post.children = post.children.filter(child => !(typeof child !== 'string' && child.tag === 'igp_tagged_item'))
    const mediaBearingTagged = escapedTagged.filter(child => descendantsByTag(child, 'image_request').length || descendantsByTag(child, 'img').length || descendantsByTag(child, 'image_request_error').length)
    if (mediaBearingTagged.length) {
      if (!tagged) {
        tagged = { tag: 'igp_tagged', attrs: '', children: [], void: false }
        root.children.push(tagged)
      }
      tagged.children.push(...mediaBearingTagged)
    }
    if (!directChild(post, 'igp_post_avatar')) post.children.unshift({ tag: 'igp_post_avatar', attrs: '', children: avatarChildren, void: false })
    if (!directChild(post, 'igp_media')) post.children.push({ tag: 'igp_media', attrs: '', children: mediaChildren, void: false })
    if (!directChild(post, 'igp_caption')) post.children.push(childTextNode('igp_caption', ''))
    if (!directChild(post, 'igp_comments')) post.children.push({ tag: 'igp_comments', attrs: '', children: [], void: false })
  }
  for (const tag of descendantsByTag(root, 'igp_tag')) tag.tag = 'igp_tagged_item'
}
function normalizeInstagramStoriesSurface(root: SurfaceXmlNode): void {
  for (const story of descendantsByTag(root, 'story')) if (!directChild(story, 'avatar')) story.children.unshift({ tag: 'avatar', attrs: '', children: [], void: false })
}
function normalizeMusicPlayerSurface(root: SurfaceXmlNode): void {
  if (!directChild(root, 'mu_queue')) root.children.push(childTextNode('mu_queue', ''))
}
function normalizePhotoBoothSurface(root: SurfaceXmlNode): void {
  if (!directChild(root, 'caption')) root.children.push(childTextNode('caption', ''))
}
function normalizeMarketListingSurface(root: SurfaceXmlNode): void {
  const ordered = ['mk_media', 'mk_desc', 'mk_bids', 'mk_actions'].map(tag => directChild(root, tag) || (tag === 'mk_desc' ? childTextNode('mk_desc', '') : undefined)).filter(Boolean) as SurfaceXmlNode[]
  root.children = ordered
}
function normalizeMissionBoardSurface(root: SurfaceXmlNode): void {
  if (!directChild(root, 'mission_items')) root.children.unshift({ tag: 'mission_items', attrs: '', children: [], void: false })
  let slot = 1
  for (const item of descendantsByTag(root, 'mission_item')) {
    const attrs = surfaceXmlAttributes(item.attrs)
    if (!attrs.slot) item.attrs = replaceSurfaceAttr(item.attrs, 'slot', String(slot++))
  }
}
function normalizeEscapedRootMedia(root: SurfaceXmlNode, grammar: Grammar): void {
  const mediaTags = new Set(['image_request', 'image_request_error', 'img'])
  const directMedia = xmlChildren(root).filter(child => mediaTags.has(child.tag))
  if (!directMedia.length) return
  for (const media of directMedia) {
    const candidates = xmlChildren(root).filter(child =>
      !mediaTags.has(child.tag)
      && (grammar.children.get(child.tag) || []).includes(media.tag)
      && !xmlChildren(child).some(grandchild => mediaTags.has(grandchild.tag)))
    if (candidates.length !== 1) continue
    root.children = root.children.filter(child => child !== media)
    candidates[0].children.push(media)
  }
}
function neutralOptionalRootValue(key: string): string {
  if (/^(?:active|slot|index|page|selected)$/i.test(key)) return '1'
  if (/^(?:battery|percent|percentage|progress|unread|count|comments|attachments|messages|likes|views|replies|reposts|score|age)$/i.test(key)) return '0'
  return '—'
}
function removeSurfaceAttr(attrs: string, key: string): string {
  return String(attrs || '').replace(new RegExp(`\\s*${escapeRe(key)}\\s*=\\s*(?:"[^"]*"|'[^']*')`, 'gi'), '')
}
function placeholderSurfaceValue(value: string | undefined): boolean {
  const text = plainSurfaceText(String(value || '')).trim()
  return !text || /^[-—–]+$/.test(text)
}
function metadataFieldForChild(grammar: Grammar, parentTag: string, childTag: string): string {
  const fields = grammar.attrFields.get(parentTag)
  if (!fields?.size) return ''
  const candidates = [childTag, grammar.aliases.get(childTag) || ''].filter(Boolean)
  if (childTag === 'k_time') candidates.push('time')
  if (childTag === 'k_name') candidates.push('name')
  if (childTag === 'k_part' && parentTag === 'k_msg') candidates.push('sender')
  for (const candidate of candidates) if (fields.has(candidate)) return candidate
  return ''
}
function metadataFieldText(node: SurfaceXmlNode): string {
  return plainSurfaceText(xmlText(node)).trim()
}
function canConsumeMetadataField(node: SurfaceXmlNode): boolean {
  return xmlChildren(node).every(child => html.has(child.tag))
}
function insertCanonicalChildField(node: SurfaceXmlNode, grammar: Grammar, field: string, value: string): void {
  const child = childTextNode(field, value)
  const order = grammar.children.get(node.tag) || []
  const wanted = order.indexOf(field)
  if (wanted < 0) {
    node.children.unshift(child)
    return
  }
  const insertionIndex = node.children.findIndex(existing => {
    if (typeof existing === 'string') return false
    const index = order.indexOf(existing.tag)
    return index >= 0 && index > wanted
  })
  if (insertionIndex >= 0) node.children.splice(insertionIndex, 0, child)
  else node.children.push(child)
}
function normalizeAttributeChildFieldDrift(root: SurfaceXmlNode, grammar: Grammar): string[] {
  const notes: string[] = []
  const visit = (node: SurfaceXmlNode) => {
    const attrFields = grammar.attrFields.get(node.tag) || new Set<string>()
    let attrs = surfaceXmlAttributes(node.attrs)
    const keptChildren: Array<SurfaceXmlNode | string> = []
    for (const child of node.children) {
      if (typeof child === 'string') { keptChildren.push(child); continue }
      const field = metadataFieldForChild(grammar, node.tag, child.tag)
      if (field && canConsumeMetadataField(child)) {
        const childValue = metadataFieldText(child)
        const attrValue = attrs[field]
        if (placeholderSurfaceValue(attrValue) && !placeholderSurfaceValue(childValue)) {
          node.attrs = replaceSurfaceAttr(node.attrs, field, childValue)
          attrs = surfaceXmlAttributes(node.attrs)
          notes.push(`${node.tag}.${field}: child-field-to-attribute placeholder fallback`)
        } else if (!(field in attrs)) {
          if (!placeholderSurfaceValue(childValue)) {
            node.attrs = replaceSurfaceAttr(node.attrs, field, childValue)
            attrs = surfaceXmlAttributes(node.attrs)
            notes.push(`${node.tag}.${field}: child-field-to-attribute`)
          }
        } else if (!placeholderSurfaceValue(childValue) && plainSurfaceText(String(attrValue || '')) !== childValue) {
          notes.push(`${node.tag}.${field}: conflicting child metadata ignored in favor of canonical attribute`)
        } else {
          notes.push(`${node.tag}.${field}: duplicate child metadata removed`)
        }
        continue
      }
      keptChildren.push(child)
    }
    node.children = keptChildren
    attrs = surfaceXmlAttributes(node.attrs)
    const allowedChildren = grammar.children.get(node.tag) || []
    for (const [key, value] of Object.entries(attrs)) {
      const childName = grammar.aliases.get(key) || key
      if (attrFields.has(key) || !allowedChildren.includes(childName) || placeholderSurfaceValue(value)) continue
      if (xmlChildren(node).some(child => child.tag === childName)) continue
      node.attrs = removeSurfaceAttr(node.attrs, key)
      insertCanonicalChildField(node, grammar, childName, value)
      notes.push(`${node.tag}.${childName}: attribute-to-child-field`)
    }
    for (const child of xmlChildren(node)) visit(child)
  }
  visit(root)
  return notes
}
export function normalizeSurfaceBlock(input: string, spec: SurfaceNormalizationSpec): SurfaceNormalizationResult {
  input = repairSurfaceLexicalMarkup(input)
  if (spec.wrapper === 'smart_phone') input = normalizeSmartphoneBlockForCanonicalParsing(input)
  const grammar = grammarFor(spec); const stack: SurfaceXmlNode[] = []; let root: SurfaceXmlNode | null = null; let at = 0; let error = ''
  const ignoredStack: string[] = []
  const append = (node: SurfaceXmlNode) => { if (stack.length) stack.at(-1)!.children.push(node); else root = node; if (!node.void) stack.push(node) }
  for (const token of input.matchAll(tokenPattern)) {
    const between = input.slice(at, token.index)
    at = token.index! + token[0].length
    const sourceTag = tagOf(token[0]); const tag = grammar.aliases.get(sourceTag) || sourceTag
    const isClosing = token[0].startsWith('</')
    const isVoid = /\/\s*>$/.test(token[0]) || voidTags.has(tag)
    if (ignoredStack.length) {
      if (!token[0].startsWith('<!--')) {
        if (isClosing) {
          const ignoredIndex = ignoredStack.lastIndexOf(sourceTag)
          if (ignoredIndex >= 0) ignoredStack.splice(ignoredIndex)
        } else if (!isVoid) ignoredStack.push(sourceTag)
      }
      continue
    }
    if (stack.length) stack.at(-1)!.children.push(between)
    else if (between.trim()) error ||= 'Text occurs outside the Surface wrapper.'
    if (token[0].startsWith('<!--')) { stack.at(-1)?.children.push(token[0]); continue }
    const supportedTag = grammar.known.has(tag) || html.has(tag) || ['image_request_error', 'prompt', 'negative_prompt'].includes(tag)
    if (!supportedTag) {
      // Unsupported model-output wrappers/leaf nodes are repairable when they
      // are not the detected Surface root. Drop them before validation so one
      // harmless invented child cannot force the whole approved Surface into
      // the generic repair fallback.
      if (isClosing) continue
      if (!isVoid) ignoredStack.push(sourceTag)
      continue
    }
    let redirectedParent: SurfaceXmlNode | null = null
    if (isClosing) {
      const index = stack.map(node => node.tag).lastIndexOf(tag)
      if (index < 0) { error ||= `Unmatched closing tag </${sourceTag}>.`; continue }
      stack.splice(index); continue
    }
    if (root && !stack.length) { error ||= 'Multiple Surface roots overlap.'; continue }
    if (stack.length && !html.has(tag) && tag !== 'image_request_error') {
      if (spec.wrapper === 'smart_phone' && stack.at(-1)!.tag === 'smart_phone' && tag === 's_note') {
        if (!isVoid) ignoredStack.push(sourceTag)
        continue
      }
      const allowedHere = (parent: string) => (grammar.children.get(parent) || []).includes(tag)
        || Boolean(metadataFieldForChild(grammar, parent, tag))
        || (parent === spec.wrapper && (spec.normalization?.allowedChildren || []).includes(tag))
        || (tag === 'image_request' && parent === 'portrait')
      if (!allowedHere(stack.at(-1)!.tag)) {
        const ancestor = stack.map(node => node.tag).findLastIndex(allowedHere)
        if (ancestor >= 0) {
          if (xmlChildren(stack[ancestor]).some(child => child.tag === tag) && !['s_recv', 's_sent', 'image_request', 'tw_post'].includes(tag)) error ||= `<${tag}> cannot appear inside <${stack.at(-1)!.tag}>; its destination already exists.`
          stack.splice(ancestor + 1)
        }
        else {
          const imageRequestChild = ['scene_brief', 'prompt', 'negative_prompt', 'negative', 'context_caption'].includes(tag)
          const imageRequestDestinations = imageRequestChild ? descendantsByTag(stack.at(-1)!, 'image_request').filter(node => !xmlChildren(node).some(child => child.tag === tag)) : []
          if (imageRequestDestinations.length === 1) redirectedParent = imageRequestDestinations[0]
          else if (imageRequestDestinations.length > 1) error ||= `Ambiguous placement in multiple <image_request> regions.`
          const explicitInstagramProfilePostMedia = spec.wrapper === 'instagram_profile' && stack.at(-1)!.tag === 'igp_post' && ['image_request', 'image_request_error', 'img'].includes(tag)
          const explicitRoute = (spec.wrapper === 'twitter_app' && stack.at(-1)!.tag === 'twitter_app' && tag === 'tw_post')
            || (spec.wrapper === 'smart_phone' && stack.at(-1)!.tag === 'smart_phone' && ['s_recv', 's_sent', 's_img', 'image_request'].includes(tag))
            || explicitInstagramProfilePostMedia
          const directContainers = redirectedParent || explicitRoute ? [] : (grammar.children.get(stack.at(-1)!.tag) || []).filter(parent => (grammar.children.get(parent) || []).includes(tag))
          const existingContainerDestinations = directContainers.flatMap(parent => xmlChildren(stack.at(-1)!).filter(child => child.tag === parent && !xmlChildren(child).some(grandchild => grandchild.tag === tag)))
          if (!redirectedParent && existingContainerDestinations.length === 1) redirectedParent = existingContainerDestinations[0]
          else if (!redirectedParent && existingContainerDestinations.length > 1) error ||= `Ambiguous placement in multiple existing child regions.`
          const paths = redirectedParent ? []
            : spec.wrapper === 'twitter_app' && stack.at(-1)!.tag === 'twitter_app' && tag === 'tw_post' ? [['for_you', 'tw_post']]
            : spec.wrapper === 'smart_phone' && stack.at(-1)!.tag === 'smart_phone' && ['s_recv', 's_sent', 's_img', 'image_request'].includes(tag) ? [['messages', tag]]
            : explicitInstagramProfilePostMedia ? [['igp_media', tag]]
              : pathsTo(grammar, stack.at(-1)!.tag, tag)
          if (redirectedParent) {
            // The current tag is appended below into the exact destination.
          } else if (paths.length === 1) {
            for (const parent of paths[0].slice(0, -1)) {
              const existingParents = xmlChildren(stack.at(-1)!).filter(child => child.tag === parent)
              if (existingParents.length === 1 && paths[0].length === 2) { redirectedParent = existingParents[0]; break }
              if (existingParents.length > 1) { error ||= `Ambiguous placement in multiple <${parent}> regions.`; break }
              append({ tag: parent, attrs: '', children: [], void: false })
            }
          } else if (grammar.children.has(stack.at(-1)!.tag) && !['scene_brief', 'prompt', 'negative_prompt', 'cf_evidence', 'cf_timeline'].includes(stack.at(-1)!.tag)) error ||= `No unique destination for <${tag}>.`
        }
      }
    }
    let attrs = token[0].slice(sourceTag.length + 1).replace(/\/?\s*>$/, '')
    if (tag === spec.wrapper) for (const [alias, canonical] of Object.entries(spec.normalization?.attributeAliases || {})) {
      if (new RegExp(`\\s${escapeRe(alias)}\\s*=`).test(attrs) && new RegExp(`\\s${escapeRe(canonical)}\\s*=`).test(attrs)) error ||= `Duplicate attribute alias ${alias}.`
      else attrs = attrs.replace(new RegExp(`(\\s)${escapeRe(alias)}(\\s*=)`, 'g'), `$1${canonical}$2`)
    }
    attrs = attrs.replace(/\b(battery|percentage|percent|progress)\s*=\s*(["'])\s*(-?\d+(?:\.\d+)?)\s*%*\s*\2/gi, (_full, key, quote, value) => `${key}=${quote}${Math.max(0, Math.min(100, Number(value)))}${quote}`)
    if (tag === spec.wrapper) {
      const optional = spec.normalization?.optionalMeta || []
      const values = surfaceXmlAttributes(attrs)
      if (optional.some(key => !(key in values) || !String(values[key] || '').trim())) {
        const extras = attrs.replace(/\s+[\w:-]+\s*=\s*(?:"[^"]*"|'[^']*')/g, part => optional.includes(part.trim().split(/\s*=/)[0]) ? '' : part)
        attrs = optional.map(key => ` ${key}="${(String(values[key] || '').trim() || neutralOptionalRootValue(key)).replace(/"/g, '&quot;')}"`).join('') + extras
      }
      if (tag === 'case_file') attrs = attrs.replace(/([\w_]+)="([^"]*)"/g, (_full, key, value) => `${key}="${plainSurfaceText(value).replace(/"/g, '&quot;')}"`)
    }
    const node = { tag, attrs, children: [], void: isVoid }
    if (redirectedParent) {
      redirectedParent.children.push(node)
      if (!node.void) stack.push(node)
    } else append(node)
  }
  if (ignoredStack.length) error ||= 'Unsupported child wrapper was not safely closed.'
  const trailing = input.slice(at)
  if (stack.length && trailing) stack.at(-1)!.children.push(trailing)
  else if (trailing.trim()) error ||= 'Unclosed Surface contains trailing text with no safe boundary.'
  if (!root || (root as SurfaceXmlNode).tag !== spec.wrapper) error ||= 'Surface root could not be resolved.'
  if (error) return { markup: input, changed: false, diagnostics: [`${spec.id}: ${error}`] }
  const driftDiagnostics = normalizeAttributeChildFieldDrift(root!, grammar)
  const reorder = (node: SurfaceXmlNode) => {
    // Conversation order is authored semantics. Reorder only fixed section groups.
    const childNodes = xmlChildren(node)
    const slottedList = childNodes.length > 1 && childNodes.every(child => Number.isFinite(Number(surfaceXmlAttributes(child.attrs).slot)))
    const fixed = slottedList || /^(?:weverse_app|forum_thread|email_thread|imessage_chat|workspace_chat|ws_channels|livestream|tinder|public_bulletin|tiktok_post|kakao_chat|smart_phone|case_file|cf_sheet|character_profile|profile|relationship_map|character_(?:one|two|three|four|five)|connections|naver_news|twitter_app|ig_app|instagram_dm|x_dm|discord_dm|discord_server|inline_chat|google_image_search|phone_gallery|evidence_photo|newspaper|album_cover|magazine_cover|photo_booth_strip|polaroid_frame|music_player|location_share|voice_memo|notes_app|letter_dispatch|court_transcript|diary_app|mission_board|cctv_evidence|instagram_stories|email_item|avatar_msg|discord_avatar_msg|server_channel|server_avatar_msg|gis_result|gallery_item|yt_thumbnail|yt_comments|medical_record|property_listing|market_listing|codex_entry|instagram_profile|twitter_profile|story)$/.test(node.tag)
    const order = grammar.children.get(node.tag) || []
    if (fixed) {
      const nodes = childNodes
      nodes.sort((a, b) => {
        const ai = order.indexOf(a.tag), bi = order.indexOf(b.tag)
        if (ai < 0 || bi < 0) return 0
        if (ai !== bi) return ai - bi
        const as = Number(surfaceXmlAttributes(a.attrs).slot), bs = Number(surfaceXmlAttributes(b.attrs).slot)
        return Number.isFinite(as) && Number.isFinite(bs) ? as - bs : 0
      })
      let index = 0; node.children = node.children.map(child => typeof child === 'string' ? child : nodes[index++])
    }
    for (const child of xmlChildren(node)) reorder(child)
  }
  reorder(root!)
  if (spec.wrapper === 'smart_phone') {
    const messages = xmlChildren(root!).find(child => child.tag === 'messages')
    if (!messages) return { markup: input, changed: false, diagnostics: [`${spec.id}: Missing required <messages> region.`] }
    const canonicalRequest = (node: SurfaceXmlNode): SurfaceXmlNode => node.tag === 'image_request'
      ? { ...node, attrs: /\baspect\s*=/i.test(node.attrs) ? node.attrs.replace(/\baspect\s*=\s*(["'])[^"']*\1/i, ' aspect="4:3"') : `${node.attrs} aspect="4:3"` }
      : node
    if (messages) messages.children = messages.children.map(child => {
      if (typeof child === 'string') return child
      if (child.tag === 'image_request') return { tag: 's_img', attrs: ' side="recv"', children: [canonicalRequest(child)], void: false }
      if (child.tag === 's_img') return {
        ...child,
        attrs: /\bside\s*=/i.test(child.attrs) ? child.attrs : `${child.attrs} side="recv"`,
        children: child.children.map(grandchild => typeof grandchild === 'string' ? grandchild : canonicalRequest(grandchild)),
      }
      return child
    })
  }
  if (spec.wrapper === 'kakao_chat') normalizeKakaoSurface(root!, input)
  if (spec.wrapper === 'ig_app') normalizeInstagramSurface(root!)
  if (spec.wrapper === 'twitter_app') normalizeTwitterSurface(root!)
  if (spec.wrapper === 'discord_server') normalizeDiscordServerSurface(root!)
  if (spec.wrapper === 'tinder') normalizeDatingProfileSurface(root!)
  if (spec.wrapper === 'property_listing') normalizePropertyListingSurface(root!)
  if (spec.wrapper === 'case_file') normalizeCaseFileSurface(root!)
  if (spec.wrapper === 'cctv_evidence') normalizeCctvSurface(root!)
  if (spec.wrapper === 'instagram_profile') normalizeInstagramProfileSurface(root!)
  if (spec.wrapper === 'instagram_stories') normalizeInstagramStoriesSurface(root!)
  if (spec.wrapper === 'music_player') normalizeMusicPlayerSurface(root!)
  if (spec.wrapper === 'photo_booth_strip') normalizePhotoBoothSurface(root!)
  if (spec.wrapper === 'market_listing') normalizeMarketListingSurface(root!)
  if (spec.wrapper === 'mission_board') normalizeMissionBoardSurface(root!)
  normalizeEscapedRootMedia(root!, grammar)
  const markup = serializeSurfaceXml(root!)
  return { markup, changed: markup !== input, diagnostics: [], driftDiagnostics }
}
export type SurfaceDocumentBlock = { spec: SurfaceNormalizationSpec; original: string; markup: string; diagnostics: string[]; driftDiagnostics?: string[] }
export function normalizeSurfaceDocument(input: string, supplied: SurfaceNormalizationSpec[], render?: (block: SurfaceDocumentBlock) => string): SurfaceNormalizationResult {
  const specs = completeSurfaceSpecs(supplied); const aliases = specs.flatMap(spec => surfaceRootAliases(spec).map(alias => ({ alias, spec })))
  const startPattern = new RegExp(`<(${aliases.map(row => escapeRe(row.alias)).join('|')})(?=[\\s>])`, 'gi')
  let output = ''; let cursor = 0; const diagnostics: string[] = []; const driftDiagnostics: string[] = []
  for (const open of input.matchAll(startPattern)) {
    if (open.index! < cursor) continue
    const candidates = aliases.filter(row => row.alias.toLowerCase() === open[1].toLowerCase())
    if (candidates.length !== 1) continue
    const spec = candidates[0].spec
    const close = new RegExp(`</(?:${surfaceRootAliases(spec).map(escapeRe).join('|')})\\s*>`, 'gi'); close.lastIndex = open.index!
    const end = close.exec(input)
    let finish = end ? end.index + end[0].length : input.length
    if (!end) {
      const tail = input.slice(open.index!)
      const boundary = /\n\s*\n(?=[^<\s])/.exec(tail)
      if (boundary) finish = open.index! + boundary.index
      // A bare opening tag is an unfinished stream, not a completed repair job.
      if (/^<[^>]*>\s*$/.test(input.slice(open.index!, finish))) continue
    }
    const original = input.slice(open.index!, finish)
    const result = normalizeSurfaceBlock(original, spec); diagnostics.push(...result.diagnostics); driftDiagnostics.push(...(result.driftDiagnostics || []))
    output += input.slice(cursor, open.index!) + (render ? render({ spec, original, markup: result.markup, diagnostics: result.diagnostics, driftDiagnostics: result.driftDiagnostics }) : result.markup)
    cursor = finish
  }
  output += input.slice(cursor)
  return { markup: output, changed: output !== input, diagnostics, driftDiagnostics }
}
