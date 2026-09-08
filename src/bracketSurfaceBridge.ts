import type { SurfaceNormalizationResult, SurfaceNormalizationSpec } from './c5bReliability'
import { BracketNode, bracketNodeText, normalizeBracketName, parseBracketDocument } from './bracketParser'
import { completeSurfaceSpecs, parseSurfaceXml, surfaceRootAliases, surfaceXmlAttributes, xmlChildren, type SurfaceXmlNode } from './surfaceXml'

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

const escapeRe = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const attrCache = new Map<string, Map<string, Set<string>>>()

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
    const block = parseBracketRootBlock(input, open.index!, surfaceRootAliases(spec))
    const parsed = parseBracketDocument(block.source)
    const root = parsed.roots.find(row => surfaceRootAliases(spec).map(normalizeBracketName).includes(row.name))
    const rootDiagnostics = [...block.diagnostics, ...parsed.diagnostics.filter(row => !/Malformed child/.test(row))]
    const canonical = root && !rootDiagnostics.length
      ? bracketRootToCanonicalMarkup(root, attrFieldsByTag)
      : { markup: block.source, warnings: [], objectCount: 0 }
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
  return { markup: output, changed: output !== input, diagnostics }
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
