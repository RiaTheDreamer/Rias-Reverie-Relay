import { SHIPPED_SURFACE_SPECS } from './shippedSurfaceDefinitions'
import { normalizeBracketSurfaceDocument } from './bracketSurfaceBridge'
import { normalizeSurfaceDocument } from './surfaceXml'
import {
  containsR45RenderedSurface,
  renderR45BracketSurfaceAuthority,
  r45SurfaceAuthorityScripts,
  renderR45SurfaceAuthority,
  type R45ColorMode,
  type R45PresentationMode,
} from './r45SurfaceAuthority'

export type RegexSurfaceParityMode = R45PresentationMode | 'collapsible'
export type RegexSurfaceColorMode = R45ColorMode
export type RegexSurfaceParityScript = { name: string; find: string; replace: string; flags: string; order: number; scriptId: string }

export function regexSurfaceParityScripts(
  mode: RegexSurfaceParityMode = 'plain',
  color: RegexSurfaceColorMode = 'realistic',
): RegexSurfaceParityScript[] {
  const presentation = mode === 'collapsible' ? 'plain' : mode
  return r45SurfaceAuthorityScripts(presentation, color).map(script => ({
    scriptId: script.script_id,
    name: script.name,
    find: script.find_regex,
    replace: script.replace_string,
    flags: script.flags,
    order: Number(script.sort_order),
  }))
}

export function renderRegexSurfaceParity(
  markup: string,
  mode: RegexSurfaceParityMode,
  messageId: string,
  color: RegexSurfaceColorMode = 'realistic',
): string {
  let output = String(markup || '')
  let sawBracketSurface = false
  const bracket = normalizeBracketSurfaceDocument(output, SHIPPED_SURFACE_SPECS, block => {
    sawBracketSurface = true
    return block.diagnostics.length
      ? '<aside class="rrn-contract-recovery" role="status">Relay Surface needs repair. Reparse or rescan in Relay.</aside>'
      : block.markup
  })
  if (sawBracketSurface) return renderR45BracketSurfaceAuthority(bracket.markup, mode === 'collapsible' ? 'plain' : mode, messageId)
  if (!/(?:rrl-card|rrl-resolved|data-rrn-native-request)/.test(output)) {
    output = normalizeSurfaceDocument(output, SHIPPED_SURFACE_SPECS, block => block.diagnostics.length
      ? '<aside class="rrn-contract-recovery" role="status">Relay Surface needs repair. Reparse or rescan in Relay.</aside>'
      : block.markup).markup
  }
  return renderR45SurfaceAuthority(output, mode === 'collapsible' ? 'plain' : mode, color, messageId)
}

export function containsRenderedRegexSurface(markup: string): boolean {
  return containsR45RenderedSurface(markup) || /(?:rrn-contract-recovery|rrl-card|rrl-resolved)/i.test(String(markup || ''))
}
