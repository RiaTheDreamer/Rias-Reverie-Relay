export type BracketNode = {
  name: string
  attrs?: Record<string, string>
  dialect?: 'canonical-child-fields' | 'legacy-attribute-drift'
  children: Array<BracketNode | string>
}

export type BracketParseResult = {
  roots: BracketNode[]
  diagnostics: string[]
}

const TOKEN_RE = /\[(\/?)([A-Za-z][\w-]*)([^\]]*)\]/g
const ATTR_RE = /([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s\]]+))/g

export function normalizeBracketName(value: string): string {
  return String(value || '').trim().toLowerCase().replace(/-/g, '_')
}

export function bracketNodeText(node: BracketNode): string {
  return node.children.map(child => typeof child === 'string' ? child : bracketNodeText(child)).join('').trim()
}

export function isSimpleBracketNode(node: BracketNode): boolean {
  return node.children.every(child => typeof child === 'string')
}

function parseBracketAttributes(trailer: string): Record<string, string> | null {
  const text = String(trailer || '').trim()
  if (!text) return {}
  const attrs: Record<string, string> = {}
  let cursor = 0
  for (const match of text.matchAll(ATTR_RE)) {
    const between = text.slice(cursor, match.index || 0)
    if (between.trim()) return null
    attrs[normalizeBracketName(match[1] || '')] = match[2] ?? match[3] ?? match[4] ?? ''
    cursor = (match.index || 0) + match[0].length
  }
  return text.slice(cursor).trim() ? null : attrs
}

export function parseBracketDocument(source: string): BracketParseResult {
  const diagnostics: string[] = []
  const documentNode: BracketNode = { name: '__document__', children: [] }
  const stack: BracketNode[] = [documentNode]
  const ignored: string[] = []
  let cursor = 0
  for (const match of String(source || '').matchAll(TOKEN_RE)) {
    const token = match[0]
    const index = match.index || 0
    const between = String(source || '').slice(cursor, index)
    cursor = index + token.length
    const closing = match[1] === '/'
    const rawName = match[2] || ''
    const name = normalizeBracketName(rawName)
    const trailer = String(match[3] || '').trim()

    if (ignored.length) {
      if (closing && normalizeBracketName(rawName) === ignored.at(-1)) ignored.pop()
      else if (!closing && trailer) ignored.push(name)
      continue
    }
    if (between) stack.at(-1)!.children.push(between)

    if (trailer) {
      const attrs = !closing ? parseBracketAttributes(trailer) : null
      if (attrs) {
        if (stack.at(-1)?.name === name) stack.pop()
        const node: BracketNode = { name, attrs, dialect: Object.keys(attrs).length ? 'legacy-attribute-drift' : 'canonical-child-fields', children: [] }
        stack.at(-1)!.children.push(node)
        stack.push(node)
        continue
      }
      if (stack.length === 1 && documentNode.children.every(child => typeof child === 'string' && !child.trim())) {
        diagnostics.push(`Malformed bracket root [${rawName}${match[3] || ''}].`)
      } else {
        diagnostics.push(`Malformed child [${rawName}${match[3] || ''}] was isolated.`)
        if (!closing) ignored.push(name)
      }
      continue
    }

    if (!closing && stack.at(-1)?.name === name) stack.pop()
    if (closing) {
      const openIndex = stack.map(node => node.name).lastIndexOf(name)
      if (openIndex <= 0) {
        diagnostics.push(`Unmatched closing bracket [/${rawName}].`)
        continue
      }
      stack.splice(openIndex)
      continue
    }

    const node: BracketNode = { name, children: [] }
    stack.at(-1)!.children.push(node)
    stack.push(node)
  }
  const trailing = String(source || '').slice(cursor)
  if (!ignored.length && trailing) stack.at(-1)!.children.push(trailing)
  if (ignored.length) diagnostics.push(`Malformed bracket child was isolated before [/${ignored.at(-1)}].`)
  if (stack.length > 1) diagnostics.push(`Unclosed bracket [${stack.at(-1)!.name}].`)
  return {
    roots: documentNode.children.filter((child): child is BracketNode => typeof child !== 'string'),
    diagnostics,
  }
}
