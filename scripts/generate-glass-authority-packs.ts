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

const destination = {
  realistic: 'regex-packs/r45/Reverie-Surfaces-R4.5-GLASS-REALISTIC.json',
  primary: 'regex-packs/r45/Reverie-Surfaces-R4.5-GLASS-PRIMARY.json',
  bracket: 'regex-packs/r45/Reverie-Surfaces-R4.5-BRACKET-GLASS-REALISTIC.json',
  narrative: 'regex-packs/narrative-final/Reverie-Narrative-Surfaces-FINAL-Glass.json',
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
[data-reverie-glass-authority]{--rr-glass-primary:var(--lumiverse-primary,#ff70bd);--rr-glass-text:var(--lumiverse-text,#f6f1f7);--rr-glass-deep:var(--lumiverse-bg-deep-080,rgba(9,8,18,.88));position:relative;isolation:isolate;border-color:color-mix(in srgb,var(--rr-glass-primary) 10%,transparent)!important;background:linear-gradient(180deg,color-mix(in srgb,var(--rr-glass-deep) 8%,transparent),color-mix(in srgb,var(--rr-glass-deep) 3%,transparent))!important;-webkit-backdrop-filter:blur(9px) saturate(1.05);backdrop-filter:blur(9px) saturate(1.05);box-shadow:0 0 0 1px rgba(255,255,255,.008) inset,0 8px 24px rgba(0,0,0,.035),0 0 17px color-mix(in srgb,var(--rr-glass-primary) 4%,transparent)!important}
[data-reverie-glass-authority]>summary{border-color:color-mix(in srgb,var(--rr-glass-primary) 10%,transparent)!important;background:color-mix(in srgb,var(--rr-glass-deep) 5%,transparent)!important;-webkit-backdrop-filter:blur(9px) saturate(1.05);backdrop-filter:blur(9px) saturate(1.05);box-shadow:0 0 0 1px rgba(255,255,255,.008) inset,0 8px 24px rgba(0,0,0,.035),0 0 17px color-mix(in srgb,var(--rr-glass-primary) 4%,transparent)!important}
[data-reverie-glass-authority]>summary [class*="spark"]>*,[data-reverie-glass-authority]>summary [class*="particle"]>*{animation-duration:9s!important;animation-timing-function:ease-in-out!important;animation-iteration-count:infinite!important}
[data-reverie-glass-authority]>summary [class*="spark"]>*:nth-child(2),[data-reverie-glass-authority]>summary [class*="particle"]>*:nth-child(2){animation-delay:-3s!important}[data-reverie-glass-authority]>summary [class*="spark"]>*:nth-child(3),[data-reverie-glass-authority]>summary [class*="particle"]>*:nth-child(3){animation-delay:-6s!important}
@media(prefers-reduced-motion:reduce){[data-reverie-glass-authority] [class*="spark"]>*,[data-reverie-glass-authority] [class*="particle"]>*{animation:none!important;opacity:.26!important}}
`.trim()

function glassifyCss(css: string): string {
  const transformed = css
    .replace(/(^|[;{])(\s*)(background(?:-color)?)(\s*:\s*)([^;}]+)/gi, (_all, prefix, whitespace, property, separator, value) => `${prefix}${whitespace}${property}${separator}${glassBackground(value)}`)
    .replace(/box-shadow\s*:\s*([^;}]+)/gi, (_all, value) => `box-shadow:${softenAlpha(value)}`)
  return `${GLASS_FOUNDATION}\n${transformed}`
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
    styled = true
    const nextAttributes = /data-reverie-glass-source=/i.test(attributes)
      ? attributes
      : `${attributes} data-reverie-glass-source="${authority}"`
    return `<style${nextAttributes}>${glassifyCss(css)}</style>`
  })
  output = output.replace(/[ \t]+$/gm, '')
  return styled ? markFirstGlassRoot(output, authority) : output
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

function makeR45Pack(kind: 'realistic' | 'primary' | 'bracket'): RegexPack {
  const pack = readPack(source[kind])
  if (pack.scripts.length !== 138) throw new Error(`${source[kind]} must contain 138 scripts`)
  const authority = kind === 'bracket' ? 'r45-bracket-glass' : `r45-${kind}-glass`
  return {
    ...pack,
    name: `Reverie Surfaces R4.5 — ${kind === 'primary' ? 'Primary' : 'Realistic'} — Glass${kind === 'bracket' ? ' — Bracket Native' : ''}`,
    notes: 'Reverie Surfaces R4.5 standalone Glass authority. Complete replacements; use exactly one presentation pack.',
    surface_pack_mode: 'glass',
    scripts: pack.scripts.map(script => glassifyScript(script, authority)),
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

const outputs: Array<[string, RegexPack]> = [
  [destination.realistic, makeR45Pack('realistic')],
  [destination.primary, makeR45Pack('primary')],
  [destination.bracket, makeR45Pack('bracket')],
  [destination.narrative, makeNarrativePack()],
]

for (const [path, pack] of outputs) {
  writeFileSync(resolve(root, path), `${JSON.stringify(pack, null, 2)}\n`)
  console.log(`${path}: ${pack.scripts.length} scripts`)
}
