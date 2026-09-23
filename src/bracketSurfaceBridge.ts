import type { SurfaceNormalizationResult, SurfaceNormalizationSpec } from './c5bReliability'
import { BracketNode, bracketNodeText, normalizeBracketName, parseBracketDocument } from './bracketParser'
import { completeSurfaceSpecs, parseSurfaceXml, surfaceRootAliases, surfaceXmlAttributes, xmlChildren, type SurfaceXmlNode } from './surfaceXml'
import { normalizeRegisteredHybridClosingDelimiters } from './surfaceStructuralRepair'

export type BracketDialect = 'canonical-child-fields' | 'legacy-attribute-drift' | 'malformed'

export type BracketSurfaceBlock = {
  spec: SurfaceNormalizationSpec
  original: string
  markup: string
  diagnostics: string[]
  warnings: string[]
  canonicalObjectCount: number
  sourceFormat: 'bracket'
  bracketDialect: BracketDialect
  legacyXmlBridgeUsed: false
}

export type BracketSurfaceAuditRow = {
  surfaceId: string
  root: string
  rootAttributeFree: boolean
  nestedAttributeFree: boolean
  utilityCanonical: boolean
  parserCanonical: boolean
  regexInline: boolean
  regexPlain: boolean
  regexSparkle: boolean
  relayRendered: boolean
  hybridRendered: boolean
  legacyXmlCompatible: boolean
}

/** Explicitly recognized non-canonical app roots seen in Story Model output.
 * They are never presentation contracts. Deterministic shapes may receive
 * Local Repair; everything else is surfaced as a repairable format failure. */
export const KNOWN_APP_SURFACE_DRIFT_ROOTS = ['tweet:feed', 'tweet_feed', 'igfeed', 'igstory', 'igpost'] as const

const escapeRe = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const attrCache = new Map<string, Map<string, Set<string>>>()

const SMARTPHONE_HEADER_FIELDS = ['sender', 'initial', 'time', 'day', 'battery'] as const

function knownTagsForSurface(spec: SurfaceNormalizationSpec): Set<string> {
  const tags = new Set(surfaceRootAliases(spec).map(normalizeBracketName))
  for (const field of spec.rootAttributes || []) tags.add(normalizeBracketName(field))
  for (const field of spec.normalization?.allowedChildren || []) tags.add(normalizeBracketName(field))
  const root = parseSurfaceXml(spec.sampleXml || `<${spec.wrapper}></${spec.wrapper}>`)
  const visit = (node: SurfaceXmlNode) => {
    tags.add(normalizeBracketName(node.tag))
    for (const field of Object.keys(surfaceXmlAttributes(node.attrs))) tags.add(normalizeBracketName(field))
    for (const child of xmlChildren(node)) visit(child)
  }
  if (root) visit(root)
  return tags
}

/** Repair only delimiter contamination for semantic tags owned by this exact
 * approved Surface. Ordinary prose and unknown bracket-like text are untouched. */
export function normalizeKnownHybridClosingDelimiters(source: string, spec: SurfaceNormalizationSpec): { markup: string; warnings: string[] } {
  const known = knownTagsForSurface(spec)
  return normalizeRegisteredHybridClosingDelimiters(source, {
    knownTags: known,
    ownerTags: surfaceRootAliases(spec),
    scope: spec.id,
  })
}

/**
 * Recover the narrow hybrid form produced when a model starts a Smartphone in
 * bracket syntax but writes its scalar header fields like unclosed XML text.
 * Only non-empty, same-line values before [messages] are repaired. Balanced
 * canonical fields, multiline fields, and all message bodies are left alone.
 */
export function normalizeSmartphoneBracketDrift(source: string): { markup: string; warnings: string[] } {
  const input = String(source || '')
  if (!/^\s*\[smart_phone(?:\s+[^\]]*)?\]/i.test(input)) return { markup: input, warnings: [] }
  const messagesAt = input.search(/\[messages(?:\s+[^\]]*)?\]/i)
  const headerEnd = messagesAt >= 0 ? messagesAt : input.length
  let header = input.slice(0, headerEnd)
  const warnings: string[] = []
  for (const field of SMARTPHONE_HEADER_FIELDS) {
    const line = new RegExp(`(^[\\t ]*\\[${field}\\])([^\\r\\n]+)$`, 'gim')
    header = header.replace(line, (matched, opening: string, rawValue: string) => {
      if (new RegExp(`\\[\\/${field}\\]`, 'i').test(rawValue)) return matched
      const value = rawValue.trim().replace(/\]$/, '').trim()
      if (!value || /\[[\/]?[A-Za-z][\w-]*(?:\s+[^\]]*)?\]/.test(value)) return matched
      warnings.push(`smartphone: closed recoverable [${field}] scalar drift.`)
      return `${opening}${value}[/${field}]`
    })
  }
  return { markup: header + input.slice(headerEnd), warnings }
}

function collectAttrFields(specs: SurfaceNormalizationSpec[]): Map<string, Set<string>> {
  const complete = completeSurfaceSpecs(specs)
  const key = complete.map(spec => `${spec.id}:${spec.sampleXml}`).join('\n')
  const cached = attrCache.get(key)
  if (cached) return cached
  const byTag = new Map<string, Set<string>>()
  const visit = (node: SurfaceXmlNode) => {
    const fields = byTag.get(node.tag) || new Set<string>()
    for (const attr of Object.keys(surfaceXmlAttributes(node.attrs))) fields.add(normalizeBracketName(attr))
    byTag.set(node.tag, fields)
    for (const child of xmlChildren(node)) visit(child)
  }
  for (const spec of complete) {
    const root = parseSurfaceXml(spec.sampleXml || `<${spec.wrapper}></${spec.wrapper}>`)
    if (root) visit(root)
  }
  attrCache.set(key, byTag)
  while (attrCache.size > 8) attrCache.delete(attrCache.keys().next().value!)
  return byTag
}

function normalizeSide(parent: string, value: string): string {
  const side = String(value || '').trim().toLowerCase()
  if (parent === 's_img') {
    if (['out', 'right', 'sent', 'self'].includes(side)) return 'sent'
    if (['in', 'left', 'recv', 'received'].includes(side)) return 'recv'
  }
  if (['out', 'sent', 'self'].includes(side)) return 'right'
  if (['in', 'recv', 'received'].includes(side)) return 'left'
  return value
}

function childText(children: Array<BracketNode | string>, names: string[]): string {
  const wanted = new Set(names.map(normalizeBracketName))
  for (const child of children) {
    if (typeof child === 'string') continue
    if (wanted.has(child.name)) return bracketNodeText(child).trim()
  }
  return ''
}

function childField(name: string, value: string): BracketNode {
  return { name: normalizeBracketName(name), dialect: 'canonical-child-fields', children: [value] }
}

function compactInitials(value: string): string {
  const words = String(value || '').trim().split(/\s+/).filter(Boolean)
  const initials = words.slice(0, 2).map(word => word[0] || '').join('').toUpperCase()
  return initials || '•'
}

function withoutChildFields(children: Array<BracketNode | string>, names: string[]): Array<BracketNode | string> {
  const unwanted = new Set(names.map(normalizeBracketName))
  return children.filter(child => typeof child === 'string' || !unwanted.has(child.name))
}

function normalizeKnownBracketNode(node: BracketNode, parentName: string): BracketNode {
  if (node.name === 'k_part' && parentName === 'messages') {
    const sender = childText(node.children, ['sender', 'k_part', 'k_name', 'name', 'user', 'author']) || 'Unknown'
    const time = childText(node.children, ['time', 'k_time']) || ''
    const side = normalizeSide('k_msg', childText(node.children, ['side']) || 'left')
    const body = withoutChildFields(node.children, ['sender', 'k_part', 'k_name', 'name', 'user', 'author', 'time', 'k_time', 'side', 'avatar', 'color', 'read'])
    return {
      name: 'k_msg',
      dialect: node.dialect,
      children: [
        childField('sender', sender),
        childField('avatar', childText(node.children, ['avatar']) || compactInitials(sender)),
        childField('color', childText(node.children, ['color']) || '#f2c44b'),
        childField('time', time),
        childField('side', side),
        childField('read', childText(node.children, ['read']) || ''),
        ...body,
      ],
    }
  }
  if (node.name === 'k_msg') {
    const sender = childText(node.children, ['sender', 'k_part', 'k_name', 'name', 'user', 'author']) || 'Unknown'
    const time = childText(node.children, ['time', 'k_time']) || ''
    const side = normalizeSide('k_msg', childText(node.children, ['side']) || 'left')
    const body = withoutChildFields(node.children, ['sender', 'k_part', 'k_name', 'name', 'user', 'author', 'time', 'k_time', 'side', 'avatar', 'color', 'read'])
    return {
      ...node,
      children: [
        childField('sender', sender),
        childField('avatar', childText(node.children, ['avatar']) || compactInitials(sender)),
        childField('color', childText(node.children, ['color']) || '#f2c44b'),
        childField('time', time),
        childField('side', side),
        childField('read', childText(node.children, ['read']) || ''),
        ...body,
      ],
    }
  }
  if (node.name === 'k_part') {
    const name = childText(node.children, ['name', 'k_name', 'sender', 'user', 'author']) || bracketNodeText(node).trim() || 'Participant'
    const body = withoutChildFields(node.children, ['name', 'k_name', 'sender', 'user', 'author', 'avatar', 'color'])
    return {
      ...node,
      children: [
        childField('name', name),
        childField('avatar', childText(node.children, ['avatar']) || compactInitials(name)),
        childField('color', childText(node.children, ['color']) || '#f2c44b'),
        ...body,
      ],
    }
  }
  if (node.name === 'k_system') {
    return {
      ...node,
      children: [
        childField('type', childText(node.children, ['type']) || 'system'),
        ...withoutChildFields(node.children, ['type']),
      ],
    }
  }
  return node
}

function knownBracketAttrFields(name: string, parentName: string): Set<string> {
  const fields = new Set<string>()
  const add = (values: string[]) => values.forEach(value => fields.add(normalizeBracketName(value)))
  if (name === 'k_msg' || (name === 'k_part' && parentName === 'messages')) {
    add(['sender', 'k_part', 'k_name', 'name', 'user', 'author', 'time', 'k_time', 'side', 'avatar', 'color', 'read'])
  } else if (name === 'k_part') {
    add(['name', 'k_name', 'sender', 'user', 'author', 'avatar', 'color'])
  } else if (name === 'k_system') {
    add(['type', 'time', 'k_time'])
  } else if (name === 's_recv' || name === 's_sent') {
    add(['time', 'sender'])
  }
  return fields
}

function canonicalizeNode(node: BracketNode, attrFieldsByTag: Map<string, Set<string>>, warnings: string[], parentName = ''): BracketNode {
  let name = normalizeBracketName(node.name)
  if (name === 'k_part' && parentName === 'messages') name = 'k_part'
  const attrFields = new Set([...(attrFieldsByTag.get(name) || new Set<string>()), ...knownBracketAttrFields(name, parentName)])
  const children: Array<BracketNode | string> = []
  for (const [rawKey, rawValue] of Object.entries(node.attrs || {})) {
    const key = normalizeBracketName(rawKey)
    if (!attrFields.has(key)) {
      warnings.push(`${name}: ignored unknown bracket attribute drift "${key}".`)
      continue
    }
    children.push({ name: key, dialect: 'legacy-attribute-drift', children: [key === 'side' ? normalizeSide(name, rawValue) : rawValue] })
  }
  for (const child of node.children) {
    if (typeof child === 'string') {
      if (child) children.push(child)
      continue
    }
    children.push(canonicalizeNode(child, attrFieldsByTag, warnings, name))
  }
  return normalizeKnownBracketNode({ name, dialect: node.dialect || (node.attrs && Object.keys(node.attrs).length ? 'legacy-attribute-drift' : 'canonical-child-fields'), children }, parentName)
}

function serializeBracketNode(node: BracketNode): string {
  const inner = node.children.map(child => typeof child === 'string' ? child : serializeBracketNode(child)).join('')
  return `[${node.name}]${inner}[/${node.name}]`
}

function directBracketChild(node: BracketNode | undefined, name: string): BracketNode | undefined {
  const wanted = normalizeBracketName(name)
  return node?.children.find((child): child is BracketNode => typeof child !== 'string' && child.name === wanted)
}

function directBracketChildren(node: BracketNode | undefined, name: string): BracketNode[] {
  const wanted = normalizeBracketName(name)
  return node?.children.filter((child): child is BracketNode => typeof child !== 'string' && child.name === wanted) || []
}

function safeBracketText(value: string): string {
  return String(value || '').replace(/\[/g, '(').replace(/\]/g, ')').trim()
}

function bracketField(name: string, value: string): string {
  return `[${name}]${safeBracketText(value)}[/${name}]`
}

function optionalBracketField(name: string, value: string): string {
  const safe = safeBracketText(value)
  return safe ? bracketField(name, safe) : ''
}

function safeInstagramText(value: string): string {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\[/g, '(')
    .replace(/\]/g, ')')
    .trim()
}

function instagramField(node: BracketNode | undefined, name: string): string {
  return safeInstagramText(bracketNodeText(directBracketChild(node, name) || { name, children: [] }))
}

function instagramMedia(node: BracketNode): string {
  const url = instagramField(node, 'media_url')
  const alt = instagramField(node, 'media_alt')
  if (!url || /^none$/i.test(url)) return alt
  if (!/^(?:https?:\/\/|\/api\/v1\/image-gen\/results\/)[^\s"'<>]+$/i.test(url)) return alt || url
  return `<img src="${url}" alt="${alt}">`
}

/** Convert the exact bracket-only Instagram family observed in live output to
 * the registered Profile and Stories contracts. This is intentionally bounded:
 * one complete feed, exactly three complete stories, and at least one complete
 * post are required. Incomplete or ambiguous families remain fail-closed. */
function repairInstagramFamily(source: string): string {
  const parsed = parseBracketDocument(source)
  if (parsed.diagnostics.length) return source
  const feeds = parsed.roots.filter(node => node.name === 'igfeed')
  const stories = parsed.roots.filter(node => node.name === 'igstory')
  const posts = parsed.roots.filter(node => node.name === 'igpost')
  if (feeds.length !== 1 || stories.length !== 3 || posts.length < 1 || feeds.length + stories.length + posts.length !== parsed.roots.length) return source

  const feed = feeds[0]
  const name = instagramField(feed, 'profile')
  const handle = instagramField(feed, 'handle')
  const bio = instagramField(feed, 'bio')
  const stats = instagramField(feed, 'stats')
  const statsMatch = /^(.+?)\s+posts\s*(?:·|Â·|\|)\s*(.+?)\s+followers\s*(?:·|Â·|\|)\s*(.+?)\s+following$/i.exec(stats)
  if (!name || !handle || !bio || !statsMatch) return source

  const profilePosts: string[] = []
  for (const [index, post] of posts.entries()) {
    const owner = instagramField(post, 'handle') || instagramField(post, 'author')
    const time = instagramField(post, 'time')
    const likes = instagramField(post, 'likes')
    const caption = instagramField(post, 'caption')
    const comments = instagramField(post, 'comments')
    if (!owner || !time || !likes || !caption || !comments) return source
    profilePosts.push(`[igp_post][id]recovered-${index + 1}[/id][owner]${owner}[/owner][likes]${likes}[/likes][time]${time}[/time][igp_post_avatar][/igp_post_avatar][igp_media]${instagramMedia(post)}[/igp_media][igp_caption]${caption}[/igp_caption][igp_comments]${comments}[/igp_comments][/igp_post]`)
  }

  const storyRows: string[] = []
  for (const story of stories) {
    const owner = instagramField(story, 'handle')
    const storyName = instagramField(story, 'author')
    const time = instagramField(story, 'time')
    const caption = instagramField(story, 'caption')
    if (!owner || !storyName || !time || !caption) return source
    storyRows.push(`[story][owner]${owner}[/owner][name]${storyName}[/name][time]${time}[/time][avatar][/avatar][story_media]${instagramMedia(story)}[/story_media][story_caption]${caption}[/story_caption][/story]`)
  }

  return `[instagram_profile][handle]${handle}[/handle][name]${name}[/name][verified][/verified][bio]${bio}[/bio][followers]${statsMatch[2]}[/followers][following]${statsMatch[3]}[/following][posts]${statsMatch[1]}[/posts][igp_avatar][/igp_avatar][igp_posts]${profilePosts.join('')}[/igp_posts][igp_tagged][/igp_tagged][/instagram_profile]\n[instagram_stories]${storyRows.join('')}[/instagram_stories]`
}

function unwrapRetiredInstagramPayloads(source: string, warnings: string[]): string {
  return String(source || '').replace(/<payload\b[^>]*>([\s\S]*?)<\/payload\s*>/gi, (full, body: string) => {
    if (!/\[(?:instagram_profile|instagram_stories|ig_app)\]/i.test(body)) return full
    const remainder = body
      .replace(/\[instagram_profile\][\s\S]*?\[\/instagram_profile\]/gi, '')
      .replace(/\[instagram_stories\][\s\S]*?\[\/instagram_stories\]/gi, '')
      .replace(/\[ig_app\][\s\S]*?\[\/ig_app\]/gi, '')
      .trim()
    if (remainder) return full
    warnings.push('instagram: removed retired payload wrapper around repaired bracket Surfaces.')
    return body.trim()
  })
}

/** Recover the exact generic Twitter feed dialect observed in live output.
 * The mapping preserves safe authored text, profile identity, timestamps,
 * engagement metrics, and replies. It never invents or moves media. */
function repairTweetFeedBlock(source: string): string {
  const parseable = source
    .replace(/^\s*\[tweet:feed\]/i, '[tweet_feed]')
    .replace(/\[\/tweet:feed\]\s*$/i, '[/tweet_feed]')
  const parsed = parseBracketDocument(parseable)
  const root = parsed.roots.find(node => node.name === 'tweet_feed')
  if (!root || parsed.diagnostics.length) return source
  const profile = directBracketChild(root, 'profile')
  const profileName = safeBracketText(bracketNodeText(directBracketChild(profile, 'display_name') || { name: 'display_name', children: [] }))
  const profileHandle = safeBracketText(bracketNodeText(directBracketChild(profile, 'handle') || { name: 'handle', children: [] }))
  if (!profileName || !profileHandle) return source
  const verified = /verified/i.test(bracketNodeText(directBracketChild(profile, 'badge') || { name: 'badge', children: [] })) ? 'true' : ''
  const replies = directBracketChildren(root, 'reply')
  const tweets = directBracketChildren(root, 'tweet')
  if (!tweets.length) return source
  const tweetIds = new Set(tweets.map(tweet => safeBracketText(bracketNodeText(directBracketChild(tweet, 'id') || { name: 'id', children: [] }))))
  if (replies.some(reply => {
    const to = safeBracketText(bracketNodeText(directBracketChild(reply, 'to') || { name: 'to', children: [] }))
    return !to || !tweetIds.has(to)
  })) return source
  const posts: string[] = []
  for (const tweet of tweets) {
    const id = safeBracketText(bracketNodeText(directBracketChild(tweet, 'id') || { name: 'id', children: [] }))
    const time = safeBracketText(bracketNodeText(directBracketChild(tweet, 'time') || { name: 'time', children: [] }))
    const content = safeBracketText(bracketNodeText(directBracketChild(tweet, 'content') || { name: 'content', children: [] }))
    if (!id || !time || !content) return source
    const metrics = directBracketChild(tweet, 'metrics')
    const matchingReplies = replies.filter(reply => safeBracketText(bracketNodeText(directBracketChild(reply, 'to') || { name: 'to', children: [] })) === id)
    const comments: string[] = []
    for (const reply of matchingReplies) {
      const handle = safeBracketText(bracketNodeText(directBracketChild(reply, 'handle') || { name: 'handle', children: [] }))
      const replyTime = safeBracketText(bracketNodeText(directBracketChild(reply, 'time') || { name: 'time', children: [] }))
      const replyContent = safeBracketText(bracketNodeText(directBracketChild(reply, 'content') || { name: 'content', children: [] }))
      if (!handle || !replyTime || !replyContent) return source
      comments.push(`[tw_comment]${bracketField('author', handle)}${bracketField('handle', handle)}${bracketField('time', replyTime)}${replyContent}[/tw_comment]`)
    }
    const repliesCount = safeBracketText(bracketNodeText(directBracketChild(metrics, 'replies') || { name: 'replies', children: [] })) || (matchingReplies.length ? String(matchingReplies.length) : '')
    const reposts = safeBracketText(bracketNodeText(directBracketChild(metrics, 'retweets') || { name: 'retweets', children: [] }))
    const likes = safeBracketText(bracketNodeText(directBracketChild(metrics, 'likes') || { name: 'likes', children: [] }))
    posts.push(`[tw_post]${bracketField('author', profileName)}${bracketField('handle', profileHandle)}${bracketField('time', time)}${optionalBracketField('verified', verified)}${optionalBracketField('replies', repliesCount)}${optionalBracketField('reposts', reposts)}${optionalBracketField('likes', likes)}${content}[tw_comments]${comments.join('')}[/tw_comments][/tw_post]`)
  }
  return `[twitter_app][for_you]${posts.join('')}[/for_you][following][/following][thread][/thread][trends][/trends][/twitter_app]`
}

export function normalizeKnownAppSurfaceDialects(input: string): { markup: string; warnings: string[] } {
  const warnings: string[] = []
  let markup = String(input || '').replace(/\[tweet:feed\][\s\S]*?\[\/tweet:feed\]/gi, block => {
    const repaired = repairTweetFeedBlock(block)
    if (repaired !== block) warnings.push('twitter: repaired deterministic [TWEET:FEED] dialect to [twitter_app].')
    return repaired
  })
  markup = markup.replace(/(?:(?:\[igfeed\][\s\S]*?\[\/igfeed\]|\[igstory\][\s\S]*?\[\/igstory\]|\[igpost\][\s\S]*?\[\/igpost\])\s*)+/gi, block => {
    const repaired = repairInstagramFamily(block)
    if (repaired !== block) warnings.push('instagram: repaired deterministic feed, stories, and post family to registered bracket Surfaces.')
    return repaired
  })
  markup = unwrapRetiredInstagramPayloads(markup, warnings)
  return { markup, warnings }
}

function bracketDialectFor(root: BracketNode, diagnostics: string[]): BracketDialect {
  if (diagnostics.some(row => !/Malformed child/.test(row))) return 'malformed'
  const stack = [root]
  while (stack.length) {
    const node = stack.pop()!
    if (node.dialect === 'legacy-attribute-drift' || (node.attrs && Object.keys(node.attrs).length)) return 'legacy-attribute-drift'
    for (const child of node.children) if (typeof child !== 'string') stack.push(child)
  }
  return 'canonical-child-fields'
}

function bracketRootToCanonicalMarkup(root: BracketNode, attrFieldsByTag: Map<string, Set<string>>): { markup: string; warnings: string[]; objectCount: number } {
  const warnings: string[] = []
  const canonical = canonicalizeNode(root, attrFieldsByTag, warnings)
  return {
    markup: serializeBracketNode(canonical),
    warnings,
    objectCount: canonical.children.filter(child => typeof child !== 'string').length,
  }
}

function parseBracketRootBlock(input: string, start: number, aliases: string[]): { end: number; source: string; diagnostics: string[] } {
  const open = /^\[([A-Za-z][\w-]*)(?:\s+[^\]]*)?\]/.exec(input.slice(start))
  const root = normalizeBracketName(open?.[1] || '')
  const aliasSet = new Set(aliases.map(normalizeBracketName))
  let depth = 0
  const token = /\[(\/?)([A-Za-z][\w-]*)([^\]]*)\]/g
  for (const match of input.matchAll(token)) {
    if ((match.index || 0) < start) continue
    const name = normalizeBracketName(match[2] || '')
    if (!aliasSet.has(name) && name !== root) continue
    if (match[1] === '/') depth -= 1
    else depth += 1
    if (depth === 0) {
      const end = (match.index || 0) + match[0].length
      return { end, source: input.slice(start, end), diagnostics: [] }
    }
  }
  return { end: input.length, source: input.slice(start), diagnostics: [`${root}: bracket root was not safely closed.`] }
}

export function bracketOpeningAttributeMatches(source: string): RegExpMatchArray[] {
  return [...String(source || '').matchAll(/\[[A-Za-z][\w-]*\s+[^\]]*=\s*(?:"[^"]*"|'[^']*'|[^\s\]]+)/g)]
}

export function normalizeBracketSurfaceDocument(
  input: string,
  supplied: SurfaceNormalizationSpec[],
  render?: (block: BracketSurfaceBlock) => string,
): SurfaceNormalizationResult {
  const originalInput = input
  const appDialect = normalizeKnownAppSurfaceDialects(input)
  input = appDialect.markup
  const specs = completeSurfaceSpecs(supplied)
  const aliases = specs.flatMap(spec => surfaceRootAliases(spec).map(alias => ({ alias: normalizeBracketName(alias), spec })))
  const startPattern = new RegExp(`\\[(${aliases.map(row => escapeRe(row.alias)).join('|')})(?:\\s+[^\\]]*)?\\]`, 'gi')
  const attrFieldsByTag = collectAttrFields(specs)
  let output = ''
  let cursor = 0
  const diagnostics: string[] = []
  for (const open of input.matchAll(startPattern)) {
    if (open.index! < cursor) continue
    const spec = aliases.find(row => row.alias.toLowerCase() === normalizeBracketName(open[1]).toLowerCase())?.spec
    if (!spec) continue
    const remainder = input.slice(open.index!)
    const extentPreflight = normalizeKnownHybridClosingDelimiters(remainder, spec)
    const extent = parseBracketRootBlock(extentPreflight.markup, 0, surfaceRootAliases(spec))
    const block = { end: open.index! + extent.end, source: input.slice(open.index!, open.index! + extent.end), diagnostics: extent.diagnostics }
    const delimiterNormalized = normalizeKnownHybridClosingDelimiters(block.source, spec)
    const preNormalized = spec.id === 'smartphone'
      ? normalizeSmartphoneBracketDrift(delimiterNormalized.markup)
      : { markup: delimiterNormalized.markup, warnings: [] as string[] }
    preNormalized.warnings.unshift(...delimiterNormalized.warnings)
    const parsed = parseBracketDocument(preNormalized.markup)
    const root = parsed.roots.find(row => surfaceRootAliases(spec).map(normalizeBracketName).includes(row.name))
    const rootDiagnostics = [...block.diagnostics, ...parsed.diagnostics.filter(row => !/Malformed child/.test(row))]
    const canonical = root && !rootDiagnostics.length
      ? bracketRootToCanonicalMarkup(root, attrFieldsByTag)
      : { markup: block.source, warnings: [], objectCount: 0 }
    canonical.warnings.unshift(...preNormalized.warnings)
    if (spec.id === 'twitter') canonical.warnings.unshift(...appDialect.warnings)
    const resultDiagnostics = root && !rootDiagnostics.length ? [] : [`${spec.id}: ${rootDiagnostics.join('; ') || 'Bracket root could not be parsed.'}`]
    diagnostics.push(...resultDiagnostics)
    const rendered = render ? render({
      spec,
      original: block.source,
      markup: canonical.markup,
      diagnostics: resultDiagnostics,
      warnings: canonical.warnings,
      canonicalObjectCount: canonical.objectCount,
      sourceFormat: 'bracket',
      bracketDialect: root ? bracketDialectFor(root, rootDiagnostics) : 'malformed',
      legacyXmlBridgeUsed: false,
    }) : canonical.markup
    output += input.slice(cursor, open.index!) + rendered
    cursor = block.end
  }
  output += input.slice(cursor)
  return { markup: output, changed: output !== originalInput, diagnostics }
}

export function bracketSurfaceSemanticSignature(source: string, supplied: SurfaceNormalizationSpec[]): Array<{ surfaceId: string; root: string; childNames: string[]; text: string }> {
  const rows: Array<{ surfaceId: string; root: string; childNames: string[]; text: string }> = []
  normalizeBracketSurfaceDocument(source, supplied, block => {
    const parsed = parseBracketDocument(block.markup)
    const root = parsed.roots[0]
    rows.push({
      surfaceId: block.spec.id,
      root: root?.name || block.spec.wrapper,
      childNames: root ? root.children.filter((child): child is BracketNode => typeof child !== 'string').map(child => child.name) : [],
      text: root ? bracketNodeText(root).replace(/\s+/g, ' ').trim() : '',
    })
    return ''
  })
  return rows
}
