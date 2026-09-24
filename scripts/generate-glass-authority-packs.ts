// @ts-nocheck — deterministic maintainer generator executed by Bun.
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

type RegexScript = {
  script_id: string
  name?: string
  find_regex: string
  replace_string: string
  flags: string
  sort_order: number
  metadata?: Record<string, unknown>
  folder?: string
  disabled?: boolean
  [key: string]: unknown
}

type RegexPack = {
  version: string | number
  type: string
  scripts: RegexScript[]
  name?: string
  notes?: string
  metadata?: Record<string, unknown>
  surface_pack_mode?: string
  [key: string]: unknown
}

const root = resolve(import.meta.dir, '..')

const source = {
  realistic: 'regex-packs/r45/Reverie-Surfaces-R4.5-COLLAPSIBLE-SPARKLING-REALISTIC.json',
  primary: 'regex-packs/r45/Reverie-Surfaces-R4.5-COLLAPSIBLE-SPARKLING-PRIMARY.json',
  bracket: 'regex-packs/r45/Reverie-Surfaces-R4.5-BRACKET-SPARKLE-BUTTON-REALISTIC.json',
  narrative: 'regex-packs/narrative-final/Reverie-Narrative-Surfaces-FINAL-Sparkle-Button.json',
  plot: 'regex-packs/narrative-final/Reverie-Plot-Sparks-BULLETPROOF-V7.json',
  dramatic: 'regex-packs/narrative-final/Reverie-Dramatic-Cutaway-BULLETPROOF-V8.json',
} as const

const colorSource = {
  inline: 'regex-packs/r45/Reverie-Surfaces-R4.5-INLINE-REALISTIC.json',
  plain: 'regex-packs/r45/Reverie-Surfaces-R4.5-COLLAPSIBLE-PLAIN-REALISTIC.json',
  sparkling: 'regex-packs/r45/Reverie-Surfaces-R4.5-COLLAPSIBLE-SPARKLING-REALISTIC.json',
  glass: 'regex-packs/r45/Reverie-Surfaces-R4.5-COLLAPSIBLE-SPARKLING-REALISTIC.json',
} as const

const destination = {
  realistic: 'regex-packs/r45/Reverie-Surfaces-R4.5-GLASS-REALISTIC.json',
  primary: 'regex-packs/r45/Reverie-Surfaces-R4.5-GLASS-PRIMARY.json',
  bracket: 'regex-packs/r45/Reverie-Surfaces-R4.5-BRACKET-GLASS-REALISTIC.json',
  inlineGlass: 'regex-packs/r45/Reverie-Surfaces-R4.5-INLINE-GLASS.json',
  plainGlass: 'regex-packs/r45/Reverie-Surfaces-R4.5-COLLAPSIBLE-PLAIN-GLASS.json',
  sparklingGlass: 'regex-packs/r45/Reverie-Surfaces-R4.5-COLLAPSIBLE-SPARKLING-GLASS.json',
  glassGlass: 'regex-packs/r45/Reverie-Surfaces-R4.5-GLASS-BUTTON-GLASS.json',
  narrative: 'regex-packs/narrative-final/Reverie-Narrative-Surfaces-FINAL-Glass.json',
  narrativeGlassButton: 'regex-packs/narrative-final/Reverie-Narrative-Surfaces-FINAL-Glass-Button.json',
} as const

const readPack = (path: string): RegexPack => JSON.parse(readFileSync(resolve(root, path), 'utf8')) as RegexPack

function softenAlpha(value: string): string {
  return value
    .replace(/rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)/gi, (_all, r, g, b, alpha) => `rgba(${r},${g},${b},${Math.min(Number(alpha), .16).toFixed(3).replace(/0+$/, '').replace(/\.$/, '')})`)
    .replace(/#([0-9a-f]{8})(?![0-9a-f])/gi, (_all, value) => `#${value.slice(0, 6)}${Math.min(Number.parseInt(value.slice(6), 16), 38).toString(16).padStart(2, '0')}`)
}

function glassBackground(value: string): string {
  const important = /\s*!important\s*$/i.test(value) ? '!important' : ''
  const clean = value.replace(/\s*!important\s*$/i, '').trim()
  if (!clean || /^(?:none|transparent|inherit|initial|unset)$/i.test(clean) || /url\(/i.test(clean)) return `${softenAlpha(clean)}${important}`
  if (/(?:linear|radial|conic)-gradient\(/i.test(clean)) {
    return `${softenAlpha(clean)
      .replace(/#[0-9a-f]{6}(?![0-9a-f])/gi, color => `${color}1f`)
      .replace(/#[0-9a-f]{3}(?![0-9a-f])/gi, color => `${color}${color.slice(1)}1f`)}${important}`
  }
  return `color-mix(in srgb, ${clean} 8%, transparent)${important}`
}

const GLASS_FOUNDATION = `
@keyframes rrAuthorityGlassSpark{0%{opacity:0;transform:translate3d(0,7px,0) scale(.55)}18%{opacity:.7}55%{opacity:.92}100%{opacity:0;transform:translate3d(var(--rr-glass-dx,5px),-25px,0) scale(1.12)}}
[data-reverie-glass-authority]{--rr-glass-primary:var(--lumiverse-primary,#ff70bd);--rr-glass-text:var(--lumiverse-text,#f6f1f7);--rr-glass-deep:var(--lumiverse-bg-deep-080,rgba(9,8,18,.88));position:relative;isolation:isolate;border-color:transparent!important;background:transparent!important;box-shadow:none!important}
[data-reverie-glass-authority]>summary{border-color:color-mix(in srgb,var(--rr-glass-primary) 10%,transparent)!important;background:color-mix(in srgb,var(--rr-glass-deep) 5%,transparent)!important;-webkit-backdrop-filter:blur(9px) saturate(1.05);backdrop-filter:blur(9px) saturate(1.05);box-shadow:0 0 0 1px rgba(255,255,255,.008) inset,0 8px 24px rgba(0,0,0,.035),0 0 17px color-mix(in srgb,var(--rr-glass-primary) 4%,transparent)!important}
[data-reverie-glass-authority]>summary [class*="spark"]>*,[data-reverie-glass-authority]>summary [class*="particle"]>*{animation-duration:9s!important;animation-timing-function:ease-in-out!important;animation-iteration-count:infinite!important}
[data-reverie-glass-authority]>summary [class*="spark"]>*:nth-child(2),[data-reverie-glass-authority]>summary [class*="particle"]>*:nth-child(2){animation-delay:-3s!important}[data-reverie-glass-authority]>summary [class*="spark"]>*:nth-child(3),[data-reverie-glass-authority]>summary [class*="particle"]>*:nth-child(3){animation-delay:-6s!important}
[data-reverie-glass-authority].r65>.r65-launch .r65-sparks i{width:1px!important;height:1px!important;box-shadow:0 0 2px #fff,0 0 4px color-mix(in srgb,var(--rr-glass-primary) 24%,transparent)!important}
[data-reverie-glass-authority].ch-og .ch-shell,[data-reverie-glass-authority].ch-og .ch-stage,[data-reverie-glass-authority].ch-og .ch-panel{border-color:color-mix(in srgb,var(--rr-glass-primary) 10%,transparent)!important;background:color-mix(in srgb,var(--rr-glass-deep) 5%,transparent)!important;box-shadow:0 0 0 1px rgba(255,255,255,.008) inset!important;-webkit-backdrop-filter:blur(9px) saturate(1.05);backdrop-filter:blur(9px) saturate(1.05)}
[data-reverie-glass-authority].rrcp-wrap{--text:var(--lumiverse-text,#f5f7fb);--text-soft:color-mix(in srgb,var(--lumiverse-text,#f5f7fb) 86%,transparent);--muted:color-mix(in srgb,var(--lumiverse-text,#f5f7fb) 68%,transparent);--rrcp-glass-readable-text:color-mix(in srgb,var(--lumiverse-text,#f5f7fb) 94%,#fff 6%)}
[data-reverie-glass-authority].rrcp-wrap .rrcp-page,[data-reverie-glass-authority].rrcp-wrap .rrcp-page-body,[data-reverie-glass-authority].rrcp-wrap .rrcp-msg-bubble,[data-reverie-glass-authority].rrcp-wrap .rrcp-row,[data-reverie-glass-authority].rrcp-wrap .rrcp-note,[data-reverie-glass-authority].rrcp-wrap .rrcp-draft{color:var(--text)!important}
[data-reverie-glass-authority].rrcp-wrap .rrcp-msg-bubble{background:color-mix(in srgb,var(--rr-glass-deep) 84%,var(--lumiverse-bg-deep,#090812) 16%)!important;color:var(--rrcp-glass-readable-text)!important;border-color:color-mix(in srgb,var(--rrcp-glass-readable-text) 16%,transparent)!important;text-shadow:none!important}
[data-reverie-glass-authority].rrcp-wrap .rrcp-msg-self .rrcp-msg-bubble{background:color-mix(in srgb,#2563eb 74%,var(--rr-glass-deep) 26%)!important;color:var(--rrcp-glass-readable-text)!important;border-color:color-mix(in srgb,#8ab4ff 46%,transparent)!important}
[data-reverie-glass-authority].rrcp-wrap .rrcp-msg-other .rrcp-msg-bubble{background:color-mix(in srgb,var(--rr-glass-deep) 90%,var(--lumiverse-bg-elevated,#181522) 10%)!important;color:var(--rrcp-glass-readable-text)!important}
[data-reverie-glass-authority].rrcp-wrap .rrcp-msg-bubble :where(p,span,b,strong,em,a,small,time){color:inherit!important;opacity:1!important}
[data-reverie-glass-authority].rrcp-wrap .rrcp-msg-who,[data-reverie-glass-authority].rrcp-wrap .rrcp-msg time{color:var(--text-soft)!important;text-shadow:none!important}
@media(prefers-reduced-motion:reduce){[data-reverie-glass-authority] [class*="spark"]>*,[data-reverie-glass-authority] [class*="particle"]>*{animation:none!important;opacity:.26!important}}
`.trim()

// The generic R4.5 Smartphone has its own message renderer. It is not the
// Narrative Character Phone, so its readable Glass bubble contract belongs in
// the R4.5 Glass source instead of piggybacking on .rrcp selectors.
const GLASS_R45_SMARTPHONE_CONTRAST_STYLE = `<style data-reverie-glass-smartphone-contrast="1">
[data-reverie-glass-authority] .rpx-msg-recv .rpx-bubble{background:color-mix(in srgb,var(--rr-glass-deep) 90%,var(--lumiverse-bg-elevated,#181522) 10%)!important;color:color-mix(in srgb,var(--lumiverse-text,#f5f7fb) 94%,#fff 6%)!important;border-color:color-mix(in srgb,var(--lumiverse-text,#f5f7fb) 16%,transparent)!important;text-shadow:none!important}
[data-reverie-glass-authority] .rpx-msg-sent .rpx-bubble{background:color-mix(in srgb,#2563eb 74%,var(--rr-glass-deep) 26%)!important;color:color-mix(in srgb,var(--lumiverse-text,#f5f7fb) 94%,#fff 6%)!important;border-color:color-mix(in srgb,#8ab4ff 46%,transparent)!important;text-shadow:none!important}
[data-reverie-glass-authority] .rpx-bubble :where(p,span,b,strong,em,a,small,time){color:inherit!important;opacity:1!important;text-shadow:none!important}
[data-reverie-glass-authority] .rpx-msg-meta{color:color-mix(in srgb,var(--lumiverse-text,#f5f7fb) 72%,transparent)!important;text-shadow:none!important}
</style>`

const GLASS_BUTTON_STYLE = `<style data-reverie-glass-button-source="1">
[data-reverie-glass-button]{background:transparent!important;border-color:transparent!important;box-shadow:none!important}
[data-reverie-glass-button][data-reverie-glass-button]>summary{position:relative!important;z-index:2!important;isolation:isolate!important;display:flex!important;width:max-content!important;max-width:min(calc(100% - 24px),360px)!important;height:40px!important;min-height:40px!important;margin:14px auto 0!important;padding:0 20px!important;overflow:hidden!important;align-items:center!important;justify-content:center!important;cursor:pointer!important;pointer-events:auto!important;list-style:none!important;border:1px solid color-mix(in srgb,var(--lumiverse-primary,#ff70bd) 28%,var(--lumiverse-border,transparent) 72%)!important;border-radius:13px!important;background:color-mix(in srgb,var(--lumiverse-bg-deep,#0b0710) 5%,transparent)!important;color:var(--lumiverse-primary-text,var(--lumiverse-text,#f6f1f7))!important;font:800 10px/1 var(--lumiverse-font-mono,"Courier New",monospace)!important;letter-spacing:.18em!important;text-transform:uppercase!important;box-shadow:0 0 0 1px rgba(255,255,255,.008) inset,0 0 14px color-mix(in srgb,var(--lumiverse-primary,#ff70bd) 8%,transparent)!important;-webkit-backdrop-filter:blur(9px) saturate(1.05);backdrop-filter:blur(9px) saturate(1.05)}
[data-reverie-glass-button][data-reverie-glass-button]>summary::-webkit-details-marker{display:none!important}
[data-reverie-glass-button]>summary [class*="spark"]>*,[data-reverie-glass-button]>summary [class*="particle"]>*{width:1px!important;height:1px!important;box-shadow:0 0 2px #fff,0 0 4px color-mix(in srgb,var(--lumiverse-primary,#ff70bd) 24%,transparent)!important}
@media(prefers-reduced-motion:reduce){[data-reverie-glass-button]>summary [class*="spark"]>*,[data-reverie-glass-button]>summary [class*="particle"]>*{animation:none!important;opacity:.26!important}}
</style>`

const NARRATIVE_GLASS_BUTTON_STYLE = `<style data-reverie-narrative-glass-button-source="1">
[data-reverie-narrative-glass-button][data-reverie-narrative-glass-button]>summary,[data-reverie-narrative-glass-button][data-reverie-narrative-glass-button].rrcp-wrap .rrcp-launch-toggle{position:relative!important;z-index:2!important;isolation:isolate!important;display:flex!important;align-items:center!important;justify-content:center!important;width:max-content!important;max-width:min(calc(100% - 24px),360px)!important;height:40px!important;min-height:40px!important;margin:14px auto 0!important;padding:0 20px!important;overflow:hidden!important;cursor:pointer!important;pointer-events:auto!important;list-style:none!important;border:1px solid color-mix(in srgb,var(--lumiverse-primary,#ff70bd) 28%,var(--lumiverse-border,transparent) 72%)!important;border-radius:13px!important;background:color-mix(in srgb,var(--lumiverse-bg-deep,#0b0710) 5%,transparent)!important;color:var(--lumiverse-primary-text,var(--lumiverse-text,#f6f1f7))!important;font:800 10px/1 var(--lumiverse-font-mono,"Courier New",monospace)!important;letter-spacing:.18em!important;text-transform:uppercase!important;text-align:center!important;box-shadow:0 0 0 1px rgba(255,255,255,.008) inset,0 0 14px color-mix(in srgb,var(--lumiverse-primary,#ff70bd) 8%,transparent)!important;-webkit-backdrop-filter:blur(9px) saturate(1.05);backdrop-filter:blur(9px) saturate(1.05)}
[data-reverie-narrative-glass-button][data-reverie-narrative-glass-button]>summary::-webkit-details-marker{display:none!important}
[data-reverie-narrative-glass-button]>summary [class*="spark"]>*,[data-reverie-narrative-glass-button]>summary [class*="particle"]>*,[data-reverie-narrative-glass-button].rrcp-wrap .rrcp-launch-toggle [class*="spark"]>*,[data-reverie-narrative-glass-button].rrcp-wrap .rrcp-launch-toggle [class*="particle"]>*{width:1px!important;height:1px!important;box-shadow:0 0 2px #fff,0 0 4px color-mix(in srgb,var(--lumiverse-primary,#ff70bd) 24%,transparent)!important}
@media(prefers-reduced-motion:reduce){[data-reverie-narrative-glass-button]>summary [class*="spark"]>*,[data-reverie-narrative-glass-button]>summary [class*="particle"]>*,[data-reverie-narrative-glass-button].rrcp-wrap .rrcp-launch-toggle [class*="spark"]>*,[data-reverie-narrative-glass-button].rrcp-wrap .rrcp-launch-toggle [class*="particle"]>*{animation:none!important;opacity:.26!important}}
</style>`

const NARRATIVE_GLASS_SPARK_CLASS = 'rr-narrative-glass-sparks'
const NARRATIVE_GLASS_SPARK_NODES = '<i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i>'
const NARRATIVE_GLASS_SPARK_STYLE = `
.${NARRATIVE_GLASS_SPARK_CLASS}{position:absolute!important;inset:0!important;z-index:1!important;display:block!important;overflow:hidden!important;pointer-events:none!important}
.${NARRATIVE_GLASS_SPARK_CLASS} i{--x:50%;--y:50%;--dx:0px;--dy:-28px;--dur:8s;--delay:0s;position:absolute!important;left:var(--x)!important;top:var(--y)!important;display:block!important;width:1px!important;height:1px!important;border-radius:999px!important;background:radial-gradient(circle,color-mix(in srgb,var(--lumiverse-primary-text,#fff) 92%,var(--lumiverse-text,#fff) 8%) 0 28%,color-mix(in srgb,var(--lumiverse-primary-text,#fff) 68%,var(--lumiverse-primary,#d45b9f) 32%) 38%,color-mix(in srgb,var(--lumiverse-primary,#d45b9f) 24%,transparent) 65%,transparent 72%)!important;box-shadow:0 0 2px #fff,0 0 4px color-mix(in srgb,var(--lumiverse-primary,#ff70bd) 24%,transparent)!important;opacity:0;animation:rrNarrativeGlassSpark var(--dur) ease-in-out var(--delay) infinite!important}
.${NARRATIVE_GLASS_SPARK_CLASS} i:nth-child(1){--x:7%;--y:76%;--dx:8px;--dy:-34px;--dur:8.2s;--delay:-1.2s}.${NARRATIVE_GLASS_SPARK_CLASS} i:nth-child(2){--x:18%;--y:23%;--dx:-5px;--dy:-26px;--dur:9.6s;--delay:-5s}
.${NARRATIVE_GLASS_SPARK_CLASS} i:nth-child(3){--x:31%;--y:83%;--dx:4px;--dy:-42px;--dur:10.8s;--delay:-3.8s}.${NARRATIVE_GLASS_SPARK_CLASS} i:nth-child(4){--x:48%;--y:17%;--dx:7px;--dy:-28px;--dur:7.9s;--delay:-6.1s}
.${NARRATIVE_GLASS_SPARK_CLASS} i:nth-child(5){--x:64%;--y:79%;--dx:-6px;--dy:-37px;--dur:9.2s;--delay:-2.6s}.${NARRATIVE_GLASS_SPARK_CLASS} i:nth-child(6){--x:80%;--y:29%;--dx:5px;--dy:-31px;--dur:11.2s;--delay:-7.4s}
.${NARRATIVE_GLASS_SPARK_CLASS} i:nth-child(7){--x:92%;--y:70%;--dx:-8px;--dy:-30px;--dur:8.8s;--delay:-4.7s}.${NARRATIVE_GLASS_SPARK_CLASS} i:nth-child(8){--x:72%;--y:11%;--dx:4px;--dy:-21px;--dur:10.4s;--delay:-1.8s}
.${NARRATIVE_GLASS_SPARK_CLASS} i:nth-child(n+9){animation:none!important;transform:none!important;background:#fff!important;opacity:.55}
.${NARRATIVE_GLASS_SPARK_CLASS} i:nth-child(9){left:12%!important;top:68%!important}.${NARRATIVE_GLASS_SPARK_CLASS} i:nth-child(10){left:31%!important;top:24%!important}.${NARRATIVE_GLASS_SPARK_CLASS} i:nth-child(11){left:52%!important;top:75%!important}.${NARRATIVE_GLASS_SPARK_CLASS} i:nth-child(12){left:72%!important;top:20%!important}.${NARRATIVE_GLASS_SPARK_CLASS} i:nth-child(13){left:89%!important;top:62%!important}
@keyframes rrNarrativeGlassSpark{0%{opacity:0;transform:translate3d(0,10px,0) scale(.45)}18%{opacity:.72}55%{opacity:.96}100%{opacity:0;transform:translate3d(var(--dx),var(--dy),0) scale(1.18)}}
@media(prefers-reduced-motion:reduce){.${NARRATIVE_GLASS_SPARK_CLASS} i{animation:none!important;opacity:.26!important}}
`.trim()

function glassifyCss(css: string, includeFoundation: boolean, extraCss = ''): string {
  const transformed = css
    .replace(/(^|[;{])(\s*)(background(?:-color)?)(\s*:\s*)([^;}]+)/gi, (_all, prefix, whitespace, property, separator, value) => `${prefix}${whitespace}${property}${separator}${glassBackground(value)}`)
    .replace(/box-shadow\s*:\s*([^;}]+)/gi, (_all, value) => `box-shadow:${softenAlpha(value)}`)
  const glassCss = includeFoundation ? `${GLASS_FOUNDATION}\n${transformed}` : transformed
  return extraCss ? `${glassCss}\n${extraCss}` : glassCss
}

function normalizeNarrativeGlassSparkfield(replacement: string): string {
  return replacement.replace(
    /(<(?:span|div)\b[^>]*class=")([^"]*\b(?:r65-sparks|ra66-sparks|rrcp-sparks|dg-unified-sparks)\b[^"]*)("[^>]*>)([\s\S]*?)(<\/(?:span|div)>)/i,
    (_full, opening: string, classes: string, close: string, _body: string, ending: string) => {
      const nextClasses = classes.includes(NARRATIVE_GLASS_SPARK_CLASS)
        ? classes
        : `${classes} ${NARRATIVE_GLASS_SPARK_CLASS}`
      return `${opening}${nextClasses}${close}${NARRATIVE_GLASS_SPARK_NODES}${ending}`
    },
  )
}

function markFirstGlassRoot(replacement: string, authority: string): string {
  let marked = false
  return replacement.replace(/<(details|section|article|main|div|figure|aside|header|nav|button|label|span|li)\b([^>]*)>/gi, (opening, tag: string, attributes: string) => {
    if (marked || /data-reverie-glass-authority=/i.test(attributes)) return opening
    marked = true
    return `<${tag} data-reverie-glass-authority="${authority}"${attributes}>`
  })
}

function glassifyReplacement(replacement: string, authority: string): string {
  let output = String(replacement || '')
    .replace(/Collapsible Sparkling/gi, 'Glass')
    .replace(/Sparkling Button/gi, 'Glass')
    .replace(/Sparkle Button/gi, 'Glass')
    .replace(/Character Profile/g, 'Cast Sheet')
  let styled = false
  output = output.replace(/<style\b([^>]*)>([\s\S]*?)<\/style>/gi, (_all, attributes: string, css: string) => {
    const includeFoundation = !styled
    const extraCss = includeFoundation && authority === 'narrative-glass' ? NARRATIVE_GLASS_SPARK_STYLE : ''
    styled = true
    const nextAttributes = /data-reverie-glass-source=/i.test(attributes)
      ? attributes
      : `${attributes} data-reverie-glass-source="${authority}"`
    return `<style${nextAttributes}>${glassifyCss(css, includeFoundation, extraCss)}</style>`
  })
  if (authority === 'narrative-glass') output = normalizeNarrativeGlassSparkfield(output)
  // Append after the authored Smartphone CSS. The broad Glass conversion is
  // deliberately translucent; messages are the exception because text must
  // remain legible over arbitrary user wallpaper and Glass backgrounds.
  if (/\brpx-(?:device|msg|bubble)\b/i.test(output)) output += GLASS_R45_SMARTPHONE_CONTRAST_STYLE
  output = output.replace(/[ \t]+$/gm, '')
  return styled ? markFirstGlassRoot(output, authority) : output
}

function glassButtonReplacement(replacement: string, authority: string): string {
  const output = String(replacement || '')
    .replace(/Collapsible Sparkling|Sparkling Button|Sparkle Button/gi, 'Glass Button')
    .replace(/Character Profile/g, 'Cast Sheet')
  const launcherRoot = /<details\b([^>]*class="[^"]*(?:(?:rr22|rr23)(?:-spark)?-collapse|r43-launch)[^"]*"[^>]*)>/i
  if (!launcherRoot.test(output)) return output
  const withRoot = output.replace(launcherRoot, (opening, attributes: string) => {
    const authorityAttribute = /data-reverie-glass-authority=/i.test(attributes) ? '' : ` data-reverie-glass-authority="${authority}"`
    return `<details data-reverie-glass-button="1"${authorityAttribute}${attributes}>`
  })
  // This must come after the authored replacement. Several historical
  // launchers use later, !important compact-shell rules; prefixing the Glass
  // style made the mode claim succeed while its visuals and hit target lost.
  return `${withRoot}${GLASS_BUTTON_STYLE}`
}

function narrativeGlassButtonReplacement(replacement: string): string {
  let marked = false
  const output = String(replacement || '')
    .replace(/Collapsible Sparkling|Sparkling Button|Sparkle Button/gi, 'Glass Button')
    .replace(/<(details|div)\b([^>]*\bclass="[^"]*\b(?:r65|ra66|rrcp-wrap|ch-og|dg-dramatic-cutaway)\b[^"]*"[^>]*)>/i, (opening, tag: string, attributes: string) => {
      if (marked || /data-reverie-narrative-glass-button=/i.test(attributes)) return opening
      marked = true
      return `<${tag} data-reverie-narrative-glass-button="1"${attributes}>`
    })
  // See glassButtonReplacement: this is deliberately a trailing cascade
  // layer, not a prefix, so legacy compact launchers cannot repaint it.
  return marked ? `${output}${NARRATIVE_GLASS_BUTTON_STYLE}` : output
}

function glassButtonScript(script: RegexScript, authority: string): RegexScript {
  return {
    ...script,
    name: String(script.name || script.script_id)
      .replace(/Collapsible Sparkling|Sparkling Button|Sparkle Button/gi, 'Glass Button')
      .replace(/Character Profile/g, 'Cast Sheet'),
    replace_string: glassButtonReplacement(script.replace_string, authority),
    folder: script.folder?.replace(/Collapsible Sparkling|Sparkling Button|Sparkle Button/gi, 'Glass Button').replace(/Character Profile/g, 'Cast Sheet'),
    metadata: { ...(script.metadata || {}), presentation: 'glass-button', glass_button_authority: authority, standalone_replacement: true },
  }
}

function glassifyScript(script: RegexScript, authority: string): RegexScript {
  let findRegex = script.find_regex
  let replacement = script.replace_string
  if (script.script_id === 'rrcp_final_presentation_pin') {
    findRegex = findRegex.replace(/sparkling\|plain\|inline/g, 'sparkling|plain|inline|glass')
    replacement = replacement.replace(/\[cp_presentation\][\s\S]*?\[\/cp_presentation\]/i, '[cp_presentation]glass[/cp_presentation]')
  }
  if (/^rrpp_proto_shell_/i.test(script.script_id)) {
    findRegex = findRegex.replace(/sparkling\|plain\|inline/g, 'sparkling|plain|inline|glass')
    if (script.script_id === 'rrpp_proto_shell_v31') findRegex = findRegex.replace(/sparkling\|plain/g, 'sparkling|plain|glass')
    replacement = replacement
      .replace(/\.rrcp-presentation-sparkling>(\.rrcp-shell),\.rrcp-presentation-plain>\1/g, '.rrcp-presentation-sparkling>$1,.rrcp-presentation-plain>$1,.rrcp-presentation-glass>$1')
      .replace(/\.rrcp-presentation-plain>(\.rrcp-shell)/g, '.rrcp-presentation-plain>$1,.rrcp-presentation-glass>$1')
  }
  return {
    ...script,
    name: String(script.name || script.script_id)
      .replace(/Collapsible Sparkling/gi, 'Glass')
      .replace(/Sparkling Button/gi, 'Glass')
      .replace(/Sparkle Button/gi, 'Glass')
      .replace(/Character Profile/g, 'Cast Sheet'),
    find_regex: findRegex,
    replace_string: glassifyReplacement(replacement, authority),
    folder: script.folder?.replace(/Collapsible Sparkling|Sparkling Button|Sparkle Button/gi, 'Glass'),
    metadata: {
      ...(script.metadata || {}),
      presentation: 'glass',
      glass_authority: authority,
      standalone_replacement: true,
    },
  }
}

function narrativeGlassButtonScript(script: RegexScript): RegexScript {
  let findRegex = script.find_regex
  let replacement = script.replace_string
  if (script.script_id === 'rrcp_final_presentation_pin') {
    findRegex = findRegex.replace(/sparkling\|plain\|inline/g, 'sparkling|plain|inline|glass')
    replacement = replacement.replace(/\[cp_presentation\][\s\S]*?\[\/cp_presentation\]/i, '[cp_presentation]glass[/cp_presentation]')
  }
  if (/^rrpp_proto_shell_/i.test(script.script_id)) {
    findRegex = findRegex.replace(/sparkling\|plain\|inline/g, 'sparkling|plain|inline|glass')
    if (script.script_id === 'rrpp_proto_shell_v31') findRegex = findRegex.replace(/sparkling\|plain/g, 'sparkling|plain|glass')
    replacement = replacement
      .replace(/\.rrcp-presentation-sparkling>(\.rrcp-shell),\.rrcp-presentation-plain>\1/g, '.rrcp-presentation-sparkling>$1,.rrcp-presentation-plain>$1,.rrcp-presentation-glass>$1')
      .replace(/\.rrcp-presentation-plain>(\.rrcp-shell)/g, '.rrcp-presentation-plain>$1,.rrcp-presentation-glass>$1')
  }
  return {
    ...script,
    name: String(script.name || script.script_id).replace(/Collapsible Sparkling|Sparkling Button|Sparkle Button/gi, 'Glass Button'),
    find_regex: findRegex,
    replace_string: narrativeGlassButtonReplacement(replacement),
    folder: script.folder?.replace(/Collapsible Sparkling|Sparkling Button|Sparkle Button/gi, 'Glass Button'),
    metadata: { ...(script.metadata || {}), presentation: 'glass-button', color_mode: 'realistic', standalone_replacement: true },
  }
}

function makeGlassButtonPack(kind: 'realistic' | 'primary' | 'bracket'): RegexPack {
  const pack = readPack(source[kind])
  if (pack.scripts.length !== 138) throw new Error(`${source[kind]} must contain 138 scripts`)
  const authority = kind === 'bracket' ? 'r45-bracket-glass' : `r45-${kind}-glass`
  return {
    ...pack,
    name: `Reverie Surfaces R4.5 — ${kind === 'primary' ? 'Primary' : 'Realistic'} — Glass Button${kind === 'bracket' ? ' — Bracket Native' : ''}`,
    notes: 'Reverie Surfaces R4.5 standalone Glass Button authority. Complete replacements with body color preserved.',
    surface_pack_mode: 'glass',
    scripts: pack.scripts.map(script => glassButtonScript(script, authority)),
  }
}

function makeGlassColorPack(presentation: keyof typeof colorSource): RegexPack {
  const pack = readPack(colorSource[presentation])
  if (pack.scripts.length !== 138) throw new Error(`${colorSource[presentation]} must contain 138 scripts`)
  const authority = `r45-${presentation}-glass-mode`
  return {
    ...pack,
    name: `Reverie Surfaces R4.5 — ${presentation === 'glass' ? 'Glass Button' : presentation} — Glass Mode`,
    notes: 'Reverie Surfaces R4.5 standalone Glass color authority. Complete replacements with presentation preserved.',
    surface_pack_mode: `${presentation}-glass`,
    scripts: pack.scripts.map(script => {
      const glass = glassifyScript(script, authority)
      const replacement = presentation === 'glass' ? glassButtonReplacement(glass.replace_string, authority) : glass.replace_string
      return { ...glass, replace_string: replacement, metadata: { ...(glass.metadata || {}), presentation, color_mode: 'glass' } }
    }),
  }
}

function makeNarrativePack(): RegexPack {
  const pack = readPack(source.narrative)
  const plot = readPack(source.plot)
  const dramatic = readPack(source.dramatic)
  if (pack.scripts.length !== 93 || plot.scripts.length !== 1 || dramatic.scripts.length !== 1) {
    throw new Error('Narrative Glass source inventory changed')
  }
  const scripts = [...pack.scripts, ...plot.scripts, ...dramatic.scripts]
    .map(script => glassifyScript(script, 'narrative-glass'))
  if (new Set(scripts.map(script => script.script_id)).size !== scripts.length) throw new Error('Narrative Glass script IDs must be unique')
  return {
    ...pack,
    exported_at: Math.max(Number(pack.exported_at || 0), 1788778830),
    metadata: {
      ...(pack.metadata || {}),
      final_bundle: true,
      archive_variant: 'glass',
      character_phone_variant: 'glass',
      standalone_glass_authority: true,
      includes_plot_sparks: true,
      includes_dramatic_cutaway: true,
    },
    scripts,
  }
}

function makeNarrativeGlassButtonPack(): RegexPack {
  const pack = readPack(source.narrative)
  const plot = readPack(source.plot)
  const dramatic = readPack(source.dramatic)
  if (pack.scripts.length !== 93 || plot.scripts.length !== 1 || dramatic.scripts.length !== 1) {
    throw new Error('Narrative Glass Button source inventory changed')
  }
  const scripts = [...pack.scripts, ...plot.scripts, ...dramatic.scripts]
    .map(narrativeGlassButtonScript)
  if (new Set(scripts.map(script => script.script_id)).size !== scripts.length) throw new Error('Narrative Glass Button script IDs must be unique')
  return {
    ...pack,
    name: 'Reverie Narrative Surfaces — Glass Button — Normal Body',
    notes: 'Standalone Narrative Glass Button authority. It changes only the outer shell and preserves the normal body source.',
    metadata: {
      ...(pack.metadata || {}),
      final_bundle: true,
      archive_variant: 'glass-button',
      character_phone_variant: 'glass',
      standalone_glass_button_authority: true,
      includes_plot_sparks: true,
      includes_dramatic_cutaway: true,
    },
    scripts,
  }
}

const outputs: Array<[string, RegexPack]> = [
  [destination.realistic, makeGlassButtonPack('realistic')],
  [destination.primary, makeGlassButtonPack('primary')],
  [destination.bracket, makeGlassButtonPack('bracket')],
  [destination.inlineGlass, makeGlassColorPack('inline')],
  [destination.plainGlass, makeGlassColorPack('plain')],
  [destination.sparklingGlass, makeGlassColorPack('sparkling')],
  [destination.glassGlass, makeGlassColorPack('glass')],
  [destination.narrative, makeNarrativePack()],
  [destination.narrativeGlassButton, makeNarrativeGlassButtonPack()],
]

for (const [path, pack] of outputs) {
  writeFileSync(resolve(root, path), `${JSON.stringify(pack, null, 2)}\n`)
  console.log(`${path}: ${pack.scripts.length} scripts`)
}
