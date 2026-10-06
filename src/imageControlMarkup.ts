/** Author-facing bracket controls; runtime XML remains a compatibility adapter.
 * Field values are opaque, so literal prompt brackets/weights are not parsed as
 * Surface children. Only the owning field's closing delimiter is reserved. */
export type BracketImageControl = {
  root: 'reverie_illustration' | 'image_request'
  fields: Record<string, string>
  fullMatch: string
  index: number
  complete: boolean
  diagnostics: string[]
}

const ROOT_OPEN = /\[(reverie[_-]illustration|image_request)([^\]]*)\]/gi
const FIELDS = new Set(['request', 'id', 'request_id', 'slot', 'target', 'aspect', 'cast', 'alt', 'count', 'intent', 'time', 'visual_prompt', 'scene_brief', 'prompt', 'context_caption', 'negative', 'negative_prompt'])
const escapeText = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
export const decodeImageControlValue = (value: string) => value.replace(/&lt;/gi, '<').replace(/&gt;/gi, '>').replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'").replace(/&amp;/gi, '&')

export function bracketImageControls(source: string): BracketImageControl[] {
  const output: BracketImageControl[] = []
  const openings = new RegExp(ROOT_OPEN.source, ROOT_OPEN.flags)
  for (let match = openings.exec(source); match; match = openings.exec(source)) {
    const root = match[1].toLowerCase().replace(/-/g, '_') as BracketImageControl['root']
    const close = new RegExp(`\\[/${match[1]}\\]`, 'i').exec(source.slice(openings.lastIndex))
    const end = close ? openings.lastIndex + close.index + close[0].length : source.length
    const fullMatch = source.slice(match.index, end)
    const body = source.slice(openings.lastIndex, close ? openings.lastIndex + close.index : end)
    const diagnostics: string[] = []
    if (match[2].trim()) diagnostics.push('Opening tags cannot contain attributes; use child fields.')
    if (!close) diagnostics.push(`Unclosed [${root}].`)
    const fields: Record<string, string> = Object.create(null)
    let cursor = 0
    while (cursor < body.length) {
      const tail = body.slice(cursor)
      if (!tail.trim()) break
      const field = /^\s*\[([A-Za-z][\w-]*)\]([\s\S]*?)\[\/\1\]/i.exec(tail)
      if (!field) { diagnostics.push('Expected a complete child field [field]value[/field].'); break }
      const name = field[1].toLowerCase().replace(/-/g, '_')
      if (!FIELDS.has(name)) diagnostics.push(`Unknown image-control field [${name}].`)
      if (Object.hasOwn(fields, name)) diagnostics.push(`Duplicate image-control field [${name}].`)
      if (/\[\/?(?:reverie[_-]illustration|image_request)\b/i.test(field[2])) diagnostics.push('Nested image controls are not allowed.')
      fields[name] = decodeImageControlValue(field[2].trim())
      cursor += field[0].length
    }
    if (root === 'reverie_illustration') {
      if (fields.request !== 'generate') diagnostics.push('[request] must equal generate.')
      if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(fields.slot || '')) diagnostics.push('[slot] must be a short stable identifier.')
      if (!['1:1', '4:3', '3:4', '16:9', '9:16', '3:2', '2:3', '5:4', '4:5'].includes(fields.aspect || '')) diagnostics.push('[aspect] must be a supported ratio.')
      if (!['char', 'user', 'char+user', 'none'].includes(fields.cast || '')) diagnostics.push('[cast] must be char, user, char+user, or none.')
      if (!fields.visual_prompt?.trim()) diagnostics.push('Exactly one non-empty [visual_prompt] is required.')
      if (fields.scene_brief || fields.prompt) diagnostics.push('Illustrations require [visual_prompt], not a scene brief or prompt alias.')
    }
    output.push({ root, fields, fullMatch, index: match.index, complete: Boolean(close), diagnostics })
    openings.lastIndex = end
  }
  return output
}

export function imageControlAsXml(control: BracketImageControl): string {
  const tag = control.root === 'reverie_illustration' ? 'reverie-illustration' : control.root
  const bodyFields = new Set(['visual_prompt', 'scene_brief', 'prompt', 'context_caption', 'negative', 'negative_prompt'])
  const attrs = Object.entries(control.fields).filter(([key]) => !bodyFields.has(key))
    .map(([key, value]) => ` ${key}="${escapeText(value).replace(/"/g, '&quot;')}"`).join('')
  const body = Object.entries(control.fields).filter(([key]) => bodyFields.has(key))
    .map(([key, value]) => {
      const name = key === 'negative_prompt' ? 'negative' : key === 'visual_prompt' && control.root === 'image_request' ? 'scene_brief' : key
      return `<${name}>${escapeText(value)}</${name}>`
    }).join('')
  return `<${tag}${attrs}>${body}</${tag}>`
}

/** In-memory presentation adapter only. Do not persist this projection over
 * authored bracket messages, or use its shifted offsets for source placement. */
export function projectBracketImageControlsToXml(source: string, invalid?: (control: BracketImageControl) => string): string {
  let output = source
  for (const control of bracketImageControls(source).reverse()) {
    const replacement = control.complete && !control.diagnostics.length
      ? imageControlAsXml(control) : invalid ? invalid(control) : control.fullMatch
    output = output.slice(0, control.index) + replacement + output.slice(control.index + control.fullMatch.length)
  }
  return output
}

/** Restore editor/repair payloads only, never rendered image markup. */
export function restoreBracketImageControlSource(source: string, controls: readonly BracketImageControl[]): string {
  let output = source
  for (const control of controls) {
    if (!control.complete || control.diagnostics.length) continue
    output = output.split(imageControlAsXml(control)).join(control.fullMatch)
  }
  return output
}

/** Convert model-facing examples and prose references, never saved messages. */
export function bracketImageControlInstructions(source: string): string {
  return source
    .replace(/<(image_request|reverie-illustration)\b([^>]*?)(?:\/>|>([\s\S]*?)<\/\1>)/gi, (_full, tag: string, attrs: string, body = '') => {
      const root = tag === 'reverie-illustration' ? 'reverie_illustration' : tag
      const fields = [...attrs.matchAll(/([\w_-]+)\s*=\s*"([^"]*)"/g)].map(match => `[${match[1]}]${match[2]}[/${match[1]}]`).join('')
      return `[${root}]${fields}${body.replace(/<(\/?)(visual_prompt|scene_brief|context_caption|negative|prompt)\s*>/gi, '[$1$2]')}[/${root}]`
    })
    .replace(/<(image_request|reverie-illustration)\b([^>]*?)>/gi, (_full, tag: string, attrs: string) => {
      const fields = [...attrs.matchAll(/([\w_-]+)\s*=\s*"([^"]*)"/g)].map(match => `[${match[1]}]${match[2]}[/${match[1]}]`).join('')
      return `[${tag.replace(/-/g, '_')}]${fields}`
    })
    .replace(/<(\/?)(reverie-illustration|image_request|visual_prompt|scene_brief)\s*>/gi, (_full, slash: string, tag: string) => `[${slash}${tag.replace(/-/g, '_')}]`)
    .replace(/<(reverie-illustration|image_request)\b/g, (_full, tag: string) => `[${tag.replace(/-/g, '_')}]`)
    .replace(/request="generate"/g, '[request]generate[/request]')
    .replace(/cast="(char\+user|char|user|none)"/g, '[cast]$1[/cast]')
    .replace(/cast attribute/g, '[cast] field')
    .replace(/XML wrapper and alt attribute/g, 'bracket wrapper and [alt] field')
    .replace(/XML transport blocks/g, 'bracket request blocks')
    .replace(/XML element/g, 'bracket request')
    .replace(/XML image_request/g, 'bracket image_request')
    .replace(/Never substitute square-bracket markup, a note, or a status placeholder\./g, 'Use child-field brackets, not legacy XML, a note, or a status placeholder.')
    .replace(/The outer request is literal XML:[^\r\n]*/g, 'The outer request is [reverie_illustration] ... [/reverie_illustration]. Use closed child fields for request, slot, aspect, cast, alt, and visual_prompt. Its first character is [. Do not use angle-bracket tags or attributes. Close each field and the outer request before continuing the story.')
    .replace(/This request uses raw XML, not Relay square-bracket syntax\./g, 'This request uses child-field brackets, not legacy XML.')
    .replace(/Keep only the nested image_request block in XML\./g, 'Keep image requests bracket-native too.')
    .replace(/The nested \[image_request\](?: tags)? (?:is|are) the only XML exception\./g, 'Image requests also use child-field brackets.')
    .replace(/The Relay XML/g, 'The Reverie request')
    .replace(/\bXML\/slot\/placement/g, 'control/slot/placement')
}
