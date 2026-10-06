import { SHIPPED_SURFACE_SPECS } from './shippedSurfaceDefinitions'
import { normalizeBracketSurfaceDocument } from './bracketSurfaceBridge'
import { normalizeSurfaceDocument } from './surfaceXml'
import {
  containsR45RenderedSurface,
  renderR45BracketSurfaceAuthority,
  r45RendererScripts,
  type R45ScriptOverrides,
  type R45ScriptSource,
  renderR45SurfaceAuthority,
  type R45ColorMode,
  type R45PresentationMode,
} from './r45SurfaceAuthority'

export type RegexSurfaceParityMode = R45PresentationMode | 'collapsible'
export type RegexSurfaceColorMode = R45ColorMode
export type RegexSurfaceParityScript = { name: string; find: string; replace: string; flags: string; order: number; scriptId: string }

function removeEmptyEmailAttachmentChrome(rendered: string): string {
  // R4.5's Email Item template always prints a paperclip. Keep it only when
  // the item actually supplied a filename or visual attachment.
  return rendered.replace(/<div class="srv-email-attachment"><span class="srv-email-file">📎\s*<\/span>\s*<\/div>/g, '')
}

function expandTextOnlyCastSheet(rendered: string): string {
  return rendered.replace(/<article class="srv4-cp">([\s\S]*?)<\/article>/g, (whole, body: string) => {
    if (!/^<div class="portrait">\s*<\/div>/.test(body)) return whole
    const content = body
      .replace(/^<div class="portrait">\s*<\/div>/, '<div class="portrait" style="display:none!important"></div>')
      .replace('<div class="traitlabel">Established trait</div>', '<div class="traitlabel">Established details</div>')
    return `<article class="srv4-cp" style="grid-template-columns:minmax(0,1fr)!important">${content}</article>`
  })
}

function compactTextOnlyRelationshipMap(rendered: string): string {
  // R4.5 reserves a large portrait pane even when this Utility has Images Off.
  // Touch only nodes whose portrait is genuinely empty; generated portraits
  // and their image lifecycle keep the established map presentation.
  const compact = rendered.replace(
    /<label class="rrm-node ([^"]+)"([^>]*)><span class="rrm-photo">\s*<\/span>/g,
    (_whole, nodeClass: string, attributes: string) =>
      `<label class="rrm-node ${nodeClass} rrm-node-text-only"${attributes}><span class="rrm-photo" style="display:none!important"></span>`,
  )
  if (compact === rendered) return rendered
  return `${compact}<style data-rrn-relationship-text-only>
.rrm .rrm-node.rrm-node-text-only{width:112px!important;min-height:0!important}
.rrm .rrm-node.rrm-node-a.rrm-node-text-only{width:124px!important}
.rrm .rrm-node.rrm-node-text-only .rrm-node-name,
.rrm .rrm-node.rrm-node-text-only .rrm-node-role{overflow:visible!important;text-overflow:clip!important;white-space:normal!important;overflow-wrap:anywhere!important}
</style>`
}

function fitRelationshipMapToHostWidth(rendered: string): string {
  if (!rendered.includes('class="rrm"')) return rendered
  // The shipped map only responds to viewport width. In Lumiverse the chat
  // column can be narrower than the viewport, so key the split layout to the
  // actual Surface container instead.
  return `${rendered}<style data-rrn-relationship-container>
.rrm{container-type:inline-size}
@container (max-width:760px){
  .rrm-body{grid-template-columns:minmax(0,1fr)!important}
  .rrm-side{border-left:0!important;border-top:1px solid rgba(255,255,255,.08)!important}
  .rrm-map-wrap{min-width:0!important}
}
</style>`
}

function styleInstagramMessageBubbles(rendered: string): string {
  if (!rendered.includes('class="rr23 rr23-igdm"') || rendered.includes('data-rrn-instagram-bubbles')) return rendered
  // The shared message transformers emit srv-* classes, while Instagram's
  // protected shell styles rr23-igdm-msg. Bridge only this shell, borrowing
  // its existing palette (including Glass) rather than relying on another
  // Surface's stylesheet to leak into the same message/shadow scope.
  const palette = [...rendered.matchAll(/\.rr23-igdm-msg(\.right|\.left)?\{([^{}]*)\}/g)]
    .map(([, side, declarations]) => {
      const selector = side === '.right'
        ? '.rr23-igdm .srv-msg-right .srv-bubble'
        : side === '.left' ? '.rr23-igdm .srv-msg-left .srv-bubble' : '.rr23-igdm .srv-bubble'
      return `${selector}{${declarations}}`
    }).join('\n')
  return `${rendered}<style data-rrn-instagram-bubbles>
${palette}
.rr23-igdm .srv-msg{display:flex;align-items:flex-end;gap:6px;max-width:90%;min-width:0}
.rr23-igdm .srv-msg-left{align-self:flex-start}
.rr23-igdm .srv-msg-right{align-self:flex-end;flex-direction:row-reverse}
.rr23-igdm .srv-msg-stack{min-width:0}
.rr23-igdm .srv-bubble{max-width:100%}
.rr23-igdm .srv-msg-user{display:block;margin:0 3px 3px;font-size:8px;opacity:.7}
.rr23-igdm .srv-msg-right .srv-msg-user{text-align:right}
.rr23-igdm .srv-msg-user:empty{display:none}
.rr23-igdm .srv-avatar{width:25px;height:25px;flex:0 0 25px;border-radius:50%;display:grid;place-items:center;overflow:hidden;background:color-mix(in srgb,currentColor 18%,transparent);font-size:8px;font-weight:900}
.rr23-igdm .srv-avatar:empty{display:none!important}
.rr23-igdm .srv-avatar-generated img,.rr23-igdm .srv-avatar-generated .reverie-artifact-media{width:100%;height:100%;object-fit:cover;border-radius:50%}
.rr23-igdm .srv-media-bubble{min-width:0;overflow:hidden;border-radius:12px}
</style>`
}

function polishRenderedSurface(rendered: string): string {
  return styleInstagramMessageBubbles(fitRelationshipMapToHostWidth(compactTextOnlyRelationshipMap(expandTextOnlyCastSheet(removeEmptyEmailAttachmentChrome(rendered)))))
}

export function regexSurfaceParityScripts(
  mode: RegexSurfaceParityMode = 'plain',
  color: RegexSurfaceColorMode = 'realistic',
  source: R45ScriptSource = 'legacy-xml',
  overrides: R45ScriptOverrides = {},
): RegexSurfaceParityScript[] {
  const presentation = mode === 'collapsible' ? 'plain' : mode
  return r45RendererScripts(source, presentation, color, overrides).map(script => ({
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
  overrides: R45ScriptOverrides = {},
): string {
  let output = String(markup || '')
  let sawBracketSurface = false
  const presentation = mode === 'collapsible' ? 'plain' : mode
  const bracket = normalizeBracketSurfaceDocument(output, SHIPPED_SURFACE_SPECS, block => {
    sawBracketSurface = true
    return block.diagnostics.length
      ? '<aside class="rrn-contract-recovery" role="status">Relay Surface needs repair. Reparse or rescan in Relay.</aside>'
      // Compatibility normalization belongs to this exact R4.5 Surface. Do
      // not expose the rest of a mixed assistant message to generic legacy
      // fields such as [media], because Narrative Utilities own their ranges.
      : polishRenderedSurface(renderR45BracketSurfaceAuthority(block.markup, presentation, messageId, color, overrides))
  })
  if (sawBracketSurface) return bracket.markup
  if (!/(?:rrl-card|rrl-resolved|data-rrn-native-request)/.test(output)) {
    output = normalizeSurfaceDocument(output, SHIPPED_SURFACE_SPECS, block => block.diagnostics.length
      ? '<aside class="rrn-contract-recovery" role="status">Relay Surface needs repair. Reparse or rescan in Relay.</aside>'
      : block.markup).markup
  }
  return polishRenderedSurface(renderR45SurfaceAuthority(output, presentation, color, messageId, overrides))
}

export function containsRenderedRegexSurface(markup: string): boolean {
  return containsR45RenderedSurface(markup) || /(?:rrn-contract-recovery|rrl-card|rrl-resolved)/i.test(String(markup || ''))
}
