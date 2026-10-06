import { xmlAuthoringInstructions } from './xmlSurfaceFormat'

const ATTR_RE = /\s+([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g
const TOKEN_RE = /<!--[\s\S]*?-->|<\/?[A-Za-z][\w:-]*(?:\s+(?:[^<>"']|"[^"]*"|'[^']*')*)?\s*\/?>/g
const VOID_TAGS = new Set('img br hr input meta link'.split(' '))
// Image controls now share child-field bracket authoring with their Surface.
// Runtime images/errors remain renderer-owned, never model-authored controls.
const XML_PASSTHROUGH_TAGS = new Set(['image_request_error', 'img'])
const tagOf = (token: string): string => /^<\/?([\w:-]+)/.exec(token)?.[1]?.toLowerCase() || ''
const attrsOf = (token: string): Record<string, string> => Object.fromEntries([...String(token || '').matchAll(ATTR_RE)].map(match => [match[1], match[2] ?? match[3] ?? '']))

type XmlNode = { tag: string; attrs: Record<string, string>; children: Array<XmlNode | string>; void: boolean }

function parseLooseXml(source: string): XmlNode | null {
  const stack: XmlNode[] = []
  let root: XmlNode | null = null
  let at = 0
  for (const token of String(source || '').matchAll(TOKEN_RE)) {
    if (stack.length && token.index! > at) stack.at(-1)!.children.push(String(source || '').slice(at, token.index))
    at = token.index! + token[0].length
    if (token[0].startsWith('<!--')) { stack.at(-1)?.children.push(token[0]); continue }
    const tag = tagOf(token[0])
    if (token[0].startsWith('</')) {
      if (stack.at(-1)?.tag !== tag) return null
      stack.pop()
      continue
    }
    const node: XmlNode = { tag, attrs: attrsOf(token[0]), children: [], void: /\/\s*>$/.test(token[0]) || VOID_TAGS.has(tag) }
    if (stack.length) stack.at(-1)!.children.push(node)
    else if (root) return null
    else root = node
    if (!node.void) stack.push(node)
  }
  return stack.length ? null : root
}

function serializeXml(node: XmlNode): string {
  const attrs = Object.entries(node.attrs).map(([key, value]) => ` ${key}="${String(value).replace(/"/g, '&quot;')}"`).join('')
  return `<${node.tag}${attrs}${node.void ? (VOID_TAGS.has(node.tag) ? '>' : '/>') : `>${node.children.map(child => typeof child === 'string' ? child : serializeXml(child)).join('')}</${node.tag}>`}`
}

function bracketValue(value: string): string {
  return String(value || '').replace(/\[/g, '(').replace(/\]/g, ')')
}

function bracketExample(node: XmlNode, depth = 0): string {
  if (XML_PASSTHROUGH_TAGS.has(node.tag)) return serializeXml(node)
  const pad = '  '.repeat(depth)
  const lines = [`${pad}[${node.tag}]`]
  for (const [key, value] of Object.entries(node.attrs)) lines.push(`${pad}  [${key}]${bracketValue(value)}[/${key}]`)
  // Media stays directly inside its exact semantic owner and at its authored
  // position. A generic [media] wrapper is not part of the R4.5 bracket grammar
  // unless the Surface contract explicitly owns that field.
  for (const child of node.children) {
    if (typeof child === 'string') {
      const text = child.trim()
      if (text) lines.push(`${pad}  ${bracketValue(text)}`)
    } else if (XML_PASSTHROUGH_TAGS.has(child.tag)) {
      lines.push(`${pad}  ${serializeXml(child)}`)
    } else {
      lines.push(bracketExample(child, depth + 1))
    }
  }
  lines.push(`${pad}[/${node.tag}]`)
  return lines.join('\n')
}

export function bracketExampleFromXml(sampleXml: string): string {
  const root = parseLooseXml(sampleXml)
  return root ? bracketExample(root) : String(sampleXml || '')
}

function compactXmlControlSchema(node: XmlNode): string {
  const attrs = Object.keys(node.attrs).map(key => ` ${key}="…"`).join('')
  const children = node.children.map(child => {
    if (typeof child === 'string') return child.trim() ? '…' : ''
    return compactXmlControlSchema(child)
  }).join('')
  return `<${node.tag}${attrs}>${children}</${node.tag}>`
}

function compactBracketSchema(node: XmlNode, depth = 0): string {
  const pad = ' '.repeat(depth)
  // A request's fields stay explicit; repeating Surface-depth indentation for
  // every scalar across the full registry needlessly inflates the injection.
  if (node.tag === 'image_request' || node.tag === 'reverie-illustration') {
    const tag = node.tag.replace(/-/g, '_')
    const fields = Object.keys(node.attrs).map(key => `[${key}]…[/${key}]`).join('')
    const body = node.children.map(child => typeof child === 'string' ? (child.trim() ? '…' : '') : compactBracketSchema(child).replace(/\n\s*/g, '')).join('')
    return `${pad}[${tag}]${fields}${body}[/${tag}]`
  }

  const lines = [`${pad}[${node.tag}]`]

  for (const key of Object.keys(node.attrs)) {
    lines.push(`${pad}  [${key}]…[/${key}]`)
  }

  for (const child of node.children) {
    if (typeof child === 'string') {
      if (child.trim()) lines.push(`${pad}  …`)
      continue
    }

    lines.push(compactBracketSchema(child, depth + 1))
  }

  lines.push(`${pad}[/${node.tag}]`)
  return lines.join('\n')
}

export function compactBracketSchemaFromXml(sampleXml: string): string {
  const root = parseLooseXml(sampleXml)
  return root ? compactBracketSchema(root) : String(sampleXml || '')
}

export function compactXmlSchemaFromXml(sampleXml: string): string {
  const root = parseLooseXml(sampleXml)
  return root ? compactXmlControlSchema(root) : String(sampleXml || '')
}

export function compactSurfacePromptModule(input: {
  label: string
  root: string
  sampleXml: string
  target?: string
  aspects?: readonly string[]
  requiredMediaCount?: number
  maximumMediaCount?: number
  specificRules?: string
  triggerOverride?: string
}): string {
  const required = input.requiredMediaCount ?? 0
  const maximum = input.maximumMediaCount == null ? 'contract-defined' : String(input.maximumMediaCount)
  const media = required === 0 && input.maximumMediaCount === 0
    ? 'none'
    : `${required === 0 ? `optional, max=${maximum}` : `minimum=${required}, max=${maximum}`}${input.target ? `; target=${input.target}` : ''}${input.aspects?.length ? `; aspects=${input.aspects.join(',')}` : ''}. Use the exact owner position shown in SCHEMA; RULES override this summary when the Surface has multiple media roles.`
  const sections = [
    `SURFACE: ${input.label.toUpperCase()}\nFORMAT: compact-v1\nROOT: <${input.root}>`,
    input.triggerOverride?.trim() ? `TRIGGER OVERRIDE\n${input.triggerOverride.trim()}` : '',
    `SCHEMA\n${compactXmlSchemaFromXml(input.sampleXml)}`,
    `MEDIA\n${media}`,
    input.specificRules?.trim() ? `RULES\n${input.specificRules.trim()}` : '',
  ]
  return xmlAuthoringInstructions(sections.filter(Boolean).join('\n\n'))
}

export function xmlSurfacePromptModule(input: {
  label: string; root: string; sampleXml: string; target?: string; aspect?: string
}): string {
  return `SURFACE: ${input.label.toUpperCase()}
Author one complete XML Surface using the exact schema below. Preserve attribute names, child order and repeated rows. Describe semantic content only; never author HTML, CSS, launcher chrome, data attributes or renderer internals. XML tags delimit fields; square brackets inside text are literal text, not tags. Escape & and < in values as &amp; and &lt;.
${input.target ? `Media target: ${input.target}.` : ''} ${input.aspect ? `Media aspect: ${input.aspect}.` : ''}
Every image request remains literal XML directly inside its documented media owner, never beside the Surface or in an invented generic media wrapper.

XML ROOT: <${input.root}>
CANONICAL XML EXAMPLE
${input.sampleXml}`
}

export function bracketSurfacePromptModule(input: {
  label: string
  root: string
  sampleXml: string
  target?: string
  aspect?: string
}): string {
  const target = input.target ? ` Media requests keep target="${input.target}" unless the Surface contract already uses a more specific target.` : ''
  const aspect = input.aspect ? ` Use the documented media aspect ${input.aspect} for new requests unless the bracket example shows a more specific owner.` : ''
  return `SURFACE: ${input.label.toUpperCase()}
Author this Surface in bracket-native syntax, not XML. Describe semantic content only: names, titles, messages, timestamps, sections, captions, and approved media requests.${target}${aspect}
No attributes in opening bracket tags. All semantic fields are child bracket nodes: [field]value[/field]. Repeated rows, messages, posts, comments, gallery items, and sections must be repeated child blocks, never attributes on an opening bracket.
Preserve repeated child order exactly. Chat/message rows are ordered lists, never one combined text block. Do not author HTML, CSS, launcher chrome, data attributes, or renderer internals. Reverie image requests use [image_request] with child fields, including [scene_brief], directly inside their exact owning field. Never add a generic [media] wrapper unless that Surface explicitly names its owning field [media].

BRACKET ROOT: [${input.root}]

CANONICAL BRACKET EXAMPLE
${bracketExampleFromXml(input.sampleXml)}`
}
