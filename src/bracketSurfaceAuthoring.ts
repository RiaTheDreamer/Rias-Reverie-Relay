const ATTR_RE = /\s+([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g
const TOKEN_RE = /<!--[\s\S]*?-->|<\/?[A-Za-z][\w:-]*(?:\s+(?:[^<>"']|"[^"]*"|'[^']*')*)?\s*\/?>/g
const VOID_TAGS = new Set('img br hr input meta link'.split(' '))
const MEDIA_TAGS = new Set(['image_request', 'image_request_error', 'img'])
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
  if (MEDIA_TAGS.has(node.tag)) return serializeXml(node)
  const pad = '  '.repeat(depth)
  const lines = [`${pad}[${node.tag}]`]
  for (const [key, value] of Object.entries(node.attrs)) lines.push(`${pad}  [${key}]${bracketValue(value)}[/${key}]`)
  // Media remains XML, but it must stay directly inside the exact semantic
  // owner and at its authored position. A generic [media] wrapper is not part
  // of the R4.5 bracket grammar and used to leak visibly into 39 Surfaces.
  for (const child of node.children) {
    if (typeof child === 'string') {
      const text = child.trim()
      if (text) lines.push(`${pad}  ${bracketValue(text)}`)
    } else if (MEDIA_TAGS.has(child.tag)) {
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
Preserve repeated child order exactly. Chat/message rows are ordered lists, never one combined text block. Do not author HTML, CSS, launcher chrome, data attributes, or renderer internals. Existing <image_request> media payloads remain XML directly inside their exact owning bracket field. Never add a generic [media] wrapper unless that Surface explicitly names its owning field [media].

BRACKET ROOT: [${input.root}]

CANONICAL BRACKET EXAMPLE
${bracketExampleFromXml(input.sampleXml)}`
}
