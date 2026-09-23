export type HybridClosingDelimiterRepair = {
  markup: string
  warnings: string[]
}

export type HybridClosingDelimiterOptions = {
  knownTags: Iterable<string>
  ownerTags?: Iterable<string>
  scope?: string
}

const normalizeTag = (value: string): string => String(value || '').trim().toLowerCase().replace(/-/g, '_')

/**
 * Repair bracket fields whose closing token contains one XML delimiter:
 * `[field]... </field]` or `[field]... [/field>`.
 *
 * This is deliberately lexical and contract-scoped. A token is changed only
 * when its normalized name belongs to the supplied registry, its matching
 * bracket opener is the current stack top, and (when ownerTags are supplied)
 * that opener is inside an active registered Surface owner. Unknown markup,
 * XML-owned elements, crossed nesting, and prose outside a Surface fail closed.
 */
export function normalizeRegisteredHybridClosingDelimiters(
  source: string,
  options: HybridClosingDelimiterOptions,
): HybridClosingDelimiterRepair {
  const known = new Set([...options.knownTags].map(normalizeTag).filter(Boolean))
  const owners = new Set([...(options.ownerTags || [])].map(normalizeTag).filter(Boolean))
  const stack: string[] = []
  const warnings: string[] = []
  const input = String(source || '')
  // Hybrid closers must be recognized before the permissive bracket token;
  // otherwise `[/field>` can consume through the next `]` as fake trailer.
  const token = /<\/\s*([A-Za-z][\w-]*)\s*\]|\[\/\s*([A-Za-z][\w-]*)\s*>|\[(\/?)\s*([A-Za-z][\w-]*)([^\]]*)\]/g
  let output = ''
  let cursor = 0

  for (const match of input.matchAll(token)) {
    const index = match.index || 0
    output += input.slice(cursor, index)
    cursor = index + match[0].length

    const bracketName = normalizeTag(match[4] || '')
    const malformedName = normalizeTag(match[1] || match[2] || '')
    if (!malformedName) {
      if (!known.has(bracketName)) {
        output += match[0]
        continue
      }
      if (match[3] === '/') {
        const openIndex = stack.lastIndexOf(bracketName)
        if (openIndex >= 0) stack.splice(openIndex)
      } else {
        stack.push(bracketName)
      }
      output += match[0]
      continue
    }

    const ownerActive = !owners.size || stack.some(name => owners.has(name))
    if (!known.has(malformedName) || !ownerActive || stack.at(-1) !== malformedName) {
      output += match[0]
      continue
    }

    const canonical = `[/${malformedName}]`
    output += canonical
    stack.pop()
    warnings.push(`${options.scope || 'surface'}: normalized hybrid closing delimiter ${match[0]} -> ${canonical}`)
  }

  output += input.slice(cursor)
  return { markup: output, warnings }
}
