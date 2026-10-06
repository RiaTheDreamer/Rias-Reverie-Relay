import { SHIPPED_SURFACE_SPECS } from './shippedSurfaceDefinitions'
import {
  completeSurfaceSpecs,
  normalizeSurfaceBlock,
  parseSurfaceXml,
  surfaceXmlAttributes,
  surfaceRootAliases,
  type SurfaceXmlNode,
} from './surfaceXml'
import { normalizeBracketSurfaceDocument } from './bracketSurfaceBridge'
import { normalizeBracketName, parseBracketDocument } from './bracketParser'
import { bracketImageControls } from './imageControlMarkup'
import { PLOT_SPARKS_REPAIR_EXAMPLE, PLOT_SPARKS_XML_REPAIR_EXAMPLE, PLOT_SPARKS_ROOT, PLOT_SPARKS_SURFACE_ID, plotSparksContractDiagnostic } from './plotSparksContract'

export const MAX_ASSISTED_SURFACE_REPAIR_CHARS = 24_000

const surfaceSpecs = completeSurfaceSpecs(SHIPPED_SURFACE_SPECS)

export function assistedSurfaceRepairSpec(surfaceId: string) {
  if (surfaceId === PLOT_SPARKS_SURFACE_ID) return { id: surfaceId, wrapper: PLOT_SPARKS_ROOT, sampleXml: PLOT_SPARKS_XML_REPAIR_EXAMPLE, sampleBracket: PLOT_SPARKS_REPAIR_EXAMPLE }
  const spec = surfaceSpecs.find(row => row.id === surfaceId)
  return spec ? { ...spec, sampleBracket: undefined } : undefined
}

export type AssistedSurfaceRepairValidation = {
  ok: boolean
  markup?: string
  reason?: string
}

function structuralTokens(source: string, format: 'xml' | 'bracket' = 'xml'): string[] {
  const pattern = format === 'bracket'
    ? /\[(\/?)([A-Za-z][\w-]*)([^\]]*)\]/g
    : /<(?:!--[\s\S]*?-->|\/?[A-Za-z][\w:-]*(?:\s+(?:[^<>"']|"[^"]*"|'[^']*')*)?\s*\/?>)/g
  return [...source.matchAll(pattern)].map(match => match[0])
}

function closingTag(token: string): boolean {
  return /^<\/[A-Za-z]/.test(token) || /^\[\/[A-Za-z]/.test(token)
}

function invariantContentSignature(source: string, tokens = structuralTokens(source), isRepairableCloser = closingTag): string {
  let cursor = 0
  const parts: string[] = []
  for (const token of tokens) {
    const index = source.indexOf(token, cursor)
    if (index < 0) return ''
    parts.push(source.slice(cursor, index))
    // The assisted model is only permitted to change closing delimiters.
    if (!isRepairableCloser(token)) parts.push(token)
    cursor = index + token.length
  }
  parts.push(source.slice(cursor))
  // Compare preserved content, not token-count-dependent segment boundaries.
  // Inserting a missing closer changes the segmentation but not this content.
  return parts.join('')
}

function textContentSignature(source: string, tokens = structuralTokens(source)): string {
  let cursor = 0
  const parts: string[] = []
  for (const token of tokens) {
    const index = source.indexOf(token, cursor)
    if (index < 0) return ''
    parts.push(source.slice(cursor, index))
    cursor = index + token.length
  }
  parts.push(source.slice(cursor))
  return JSON.stringify(parts)
}

function imageRequestProjection(source: string): string[] | null {
  const controls = bracketImageControls(source)
  if (controls.some(control => !control.complete || control.diagnostics.length)) return null
  const matches = [...source.matchAll(/<image_request\b[^>]*>[\s\S]*?<\/image_request\s*>/gi)]
  const openingCount = (source.match(/<image_request\b/gi) || []).length
  if (matches.length !== openingCount) return null
  const project = (node: SurfaceXmlNode): unknown => ({
    tag: node.tag.toLocaleLowerCase(),
    attrs: Object.entries(surfaceXmlAttributes(node.attrs)).sort(([a], [b]) => a.localeCompare(b)),
    children: node.children.map(child => typeof child === 'string'
      ? { text: child.replace(/\s+/g, ' ').trim() }
      : project(child)),
  })
  const output: string[] = controls.map(control => JSON.stringify({ root: control.root, fields: Object.entries(control.fields).sort(([a], [b]) => a.localeCompare(b)) }))
  for (const match of matches) {
    const node = parseSurfaceXml(match[0])
    if (!node || node.tag.toLocaleLowerCase() !== 'image_request') return null
    output.push(JSON.stringify(project(node)))
  }
  return output
}

/**
 * Fail-closed approval gate for model-assisted repair of one shipped Surface.
 * The model may repair nesting/closing syntax only: open tags, attributes,
 * visible text, and image requests must remain identical. Canonical validation
 * then confirms the candidate is consumable by Relay's registered contract.
 */
export function validateAssistedSurfaceRepair(
  surfaceId: string,
  sourceMarkup: string,
  proposedMarkup: string,
): AssistedSurfaceRepairValidation {
  const source = String(sourceMarkup || '')
  const proposed = String(proposedMarkup || '')
  if (!surfaceId || !source.trim() || !proposed.trim()) return { ok: false, reason: 'Repair source or candidate is empty.' }
  if (source.length > MAX_ASSISTED_SURFACE_REPAIR_CHARS || proposed.length > MAX_ASSISTED_SURFACE_REPAIR_CHARS) {
    return { ok: false, reason: `This Surface exceeds the ${MAX_ASSISTED_SURFACE_REPAIR_CHARS.toLocaleString()}-character assisted-repair limit.` }
  }
  const spec = assistedSurfaceRepairSpec(surfaceId)
  if (!spec) return { ok: false, reason: 'Assisted repair is available only for a registered shipped Surface.' }

  const format: 'xml' | 'bracket' = /^\s*\[/.test(source) ? 'bracket' : 'xml'
  if (format === 'bracket' && !/^\s*\[/.test(proposed)) {
    return { ok: false, reason: 'The repaired Surface must keep its original bracket-native format.' }
  }

  const sourceTokens = structuralTokens(source, format)
  const proposedTokens = structuralTokens(proposed, format)
  if (format === 'xml') {
    const expectedOpen = new RegExp(`^\\s*<${spec.wrapper}\\b`, 'i')
    const expectedClose = new RegExp(`<\\/${spec.wrapper}\\s*>\\s*$`, 'i')
    if (!expectedOpen.test(source) || !expectedOpen.test(proposed)
      || !expectedClose.test(proposed) || !sourceTokens.length || !proposedTokens.length
      || !expectedOpen.test(sourceTokens[0]) || !expectedOpen.test(proposedTokens[0])
      || !expectedClose.test(proposedTokens.at(-1) || '')) {
      return { ok: false, reason: 'The repair must keep exactly the registered Surface root.' }
    }
    if (!parseSurfaceXml(proposed)) return { ok: false, reason: 'The proposed Surface is not well-formed XML.' }
  } else {
    const aliases = new Set((surfaceId === PLOT_SPARKS_SURFACE_ID ? [PLOT_SPARKS_ROOT] : surfaceRootAliases(spec)).map(value => value.toLocaleLowerCase().replace(/-/g, '_')))
    const sourceRoot = /^\s*\[([A-Za-z][\w-]*)(?:\s+[^\]]*)?\]/.exec(source)?.[1]?.toLocaleLowerCase().replace(/-/g, '_')
    const candidateRoot = /^\s*\[([A-Za-z][\w-]*)(?:\s+[^\]]*)?\]/.exec(proposed)?.[1]?.toLocaleLowerCase().replace(/-/g, '_')
    const expectedClose = sourceRoot ? new RegExp(`^\\[\\/${sourceRoot}\\]$`, 'i') : null
    if (!sourceRoot || !aliases.has(sourceRoot) || candidateRoot !== sourceRoot
      || !sourceTokens.length || !proposedTokens.length
      || !/^\[\/?[A-Za-z]/.test(sourceTokens[0]) || !/^\[\/?[A-Za-z]/.test(proposedTokens[0])
      || !expectedClose?.test(proposedTokens.at(-1) || '')) {
      return { ok: false, reason: 'The repair must keep exactly the registered bracket-native Surface root.' }
    }
  }

  const securityTokens = format === 'xml'
    ? proposedTokens
    : [...proposedTokens, ...structuralTokens(proposed, 'xml')]
  const unsafeOpenTag = securityTokens.some(token => !closingTag(token) && !token.startsWith('<!')
    && (/^(?:<|\[)script\b/i.test(token)
      || /\son(?:abort|auxclick|beforeinput|blur|change|click|contextmenu|copy|cut|dblclick|drag|drop|error|focus|input|keydown|keypress|keyup|load|mousedown|mouseenter|mouseleave|mousemove|mouseout|mouseover|mouseup|paste|reset|resize|scroll|select|submit|touchcancel|touchend|touchmove|touchstart|unload|wheel)\s*=/i.test(token)
      || /\b(?:href|src)\s*=\s*(["'])\s*javascript:/i.test(token)))
  if (unsafeOpenTag) return { ok: false, reason: 'Executable or event-handler markup is not eligible for assisted repair.' }

  // Sparks Text values may contain literal bracketed prose, including [/word].
  // Only registered board closers are editable; unknown literal closers and
  // every image-control byte must remain unchanged.
  const repairableCloser = surfaceId === PLOT_SPARKS_SURFACE_ID
    ? (token: string) => format === 'xml'
      ? /^<\/(?:Plot_Sparks|ID|Lifecycle|Spark|Key|Vector|Text|Media)>$/i.test(token)
      : /^\[\/(?:Plot_Sparks|ID|Lifecycle|Spark|Key|Vector|Text|Media)\]$/i.test(token)
    : closingTag
  if (invariantContentSignature(source, sourceTokens, repairableCloser) !== invariantContentSignature(proposed, proposedTokens, repairableCloser)) {
    return { ok: false, reason: 'The proposal changed opening tags, attributes, comments, or text; Relay only accepts structural closing-tag repair.' }
  }
  const sourceRequests = imageRequestProjection(source)
  const proposedRequests = imageRequestProjection(proposed)
  if (!sourceRequests || !proposedRequests || JSON.stringify(sourceRequests) !== JSON.stringify(proposedRequests)) {
    return { ok: false, reason: 'The proposal changed, moved, or malformed an image request. Existing requests must remain intact.' }
  }

  let contractCandidate = proposed
  if (surfaceId === PLOT_SPARKS_SURFACE_ID) {
    const reason = plotSparksContractDiagnostic(proposed)
    if (reason) return { ok: false, reason }
  } else if (format === 'bracket') {
    const blocks: Array<{ original: string; diagnostics: string[]; spec: { id: string } }> = []
    const bracketResult = normalizeBracketSurfaceDocument(proposed, [spec], block => {
      blocks.push({ original: block.original, diagnostics: block.diagnostics, spec: block.spec })
      return ''
    })
    const parsed = parseBracketDocument(proposed)
    const root = parsed.roots[0]
    const aliases = new Set(surfaceRootAliases(spec).map(normalizeBracketName))
    if (bracketResult.diagnostics.length || blocks.length !== 1 || blocks[0].diagnostics.length
      || blocks[0].spec.id !== surfaceId || blocks[0].original.trim() !== proposed.trim()
      || parsed.diagnostics.length || parsed.roots.length !== 1 || !root || !aliases.has(root.name)) {
      return { ok: false, reason: 'The proposed bracket-native Surface is not one safely closed registered block.' }
    }
  } else {
    const normalized = normalizeSurfaceBlock(contractCandidate, spec)
    if (normalized.diagnostics.length) return { ok: false, reason: normalized.diagnostics.join(' ') }
    const normalizedRoot = parseSurfaceXml(normalized.markup)
    if (!normalizedRoot || normalizedRoot.tag.toLocaleLowerCase() !== spec.wrapper.toLocaleLowerCase()) {
      return { ok: false, reason: 'Relay could not validate the candidate against the registered Surface contract.' }
    }
    if (textContentSignature(normalized.markup) !== textContentSignature(contractCandidate)
      || JSON.stringify(imageRequestProjection(normalized.markup)) !== JSON.stringify(sourceRequests)) {
      return { ok: false, reason: 'Contract normalization would change text or image requests, so the repair was rejected.' }
    }
  }
  return { ok: true, markup: proposed }
}
