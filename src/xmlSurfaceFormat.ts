import { projectBracketImageControlsToXml } from './imageControlMarkup'

/** Canonical authoring is XML. These projections are for examples and display
 * only; never persist them over old messages or use their offsets for edits. */
const HEADERS: Record<string, string[]> = {
  SCENE: ['location', 'time', 'atmosphere'], PARALLEL: ['scope', 'relevance'],
  SECRET: ['owner', 'secret', 'knows'], WORLD: ['category', 'context'], WHATIF: ['title'],
}
const attr = (value: string) => value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const header = (tag: string, fields: string[], values: string[], selfClosing = false) =>
  `<${tag}${fields.map((field, i) => ` ${field}="${attr(values[i] || '')}"`).join('')}${selfClosing ? '/>' : '>'}`

export function xmlSurfaceExamples(source: string): string {
  let text = projectBracketImageControlsToXml(String(source || ''))
  const opaque: string[] = []
  // Prompt values and literal bracketed prose are not Surface structure.
  text = text.replace(/(<(?:visual_prompt|scene_brief|context_caption|negative)\b[^>]*>)[\s\S]*?<\/(?:visual_prompt|scene_brief|context_caption|negative)>/gi,
    full => `\u0000xml-value-${opaque.push(full) - 1}\u0000`)
  text = text.replace(/<Text>[\s\S]*?<\/Text>/g, full => `\u0000xml-value-${opaque.push(full) - 1}\u0000`)
  text = text.replace(/<[A-Za-z][\w-]*\b(?:\s+[^<>]*)?>/g,
    full => `\u0000xml-value-${opaque.push(full) - 1}\u0000`)
  text = text.replace(/(\[Text\])([\s\S]*?)(\[\/Text\])/g, (_full, open: string, value: string, close: string) =>
    `${open}\u0000xml-value-${opaque.push(value) - 1}\u0000${close}`)
  text = text.replace(/\[(SCENE|PARALLEL|SECRET|WORLD|WHATIF)\|([^\]\r\n]*)\]/g, (_full, tag: string, body: string) => {
    const values = body.split('|')
    return header(tag, tag === 'SECRET' && values.length === 2 ? ['label', 'kind'] : HEADERS[tag], values)
  })
    .replace(/\[NPC:(MAJOR|SUPPORT|MINOR)\|([^\]\r\n]*)\]/g, (_full, tier: string, name: string) => header('NPC', ['tier', 'name'], [tier, name]))
    .replace(/\[NPC:UP\|([^|\]\r\n]*)\|([^\]\r\n]*)\]/g, (_full, name: string, tier: string) => header('NPC', ['action', 'name', 'tier'], ['UP', name, tier]))
    .replace(/\[NPC:REF\|([^|\]\r\n]*)\|([^|\]\r\n]*)\|([^\]\r\n]*)\]/g, (_full, name: string, cue: string, mood: string) => header('NPC_REF', ['name', 'cue', 'mood'], [name, cue, mood], true))
    .replace(/\[NPC:REL\|([^|\]\r\n]*)\|([^\]\r\n]*)\]/g, (_full, name: string, change: string) => header('NPC_REL', ['name', 'change'], [name, change], true))
    .replace(/\[\[else\s+([^\]\r\n]*)\]\]/g, (_full, thread: string) => header('else', ['thread'], [thread]))
    .replace(/\[\[npc\s+([^|\]\r\n]*)\|([^|\]\r\n]*)(?:\|([^\]\r\n]*))?\]\]/g, (_full, visible: string, tier: string, revision?: string) => header('npc', ['visible', 'tier', ...(revision ? ['revision'] : [])], [visible, tier, ...(revision ? [revision] : [])]))
    .replace(/\[\[place\s+([^|\]\r\n]*)(?:\|([^\]\r\n]*))?\]\]/g, (_full, visible: string, revision?: string) => header('place', ['visible', ...(revision ? ['revision'] : [])], [visible, ...(revision ? [revision] : [])]))
    .replace(/\[\[\/(else|npc|place)\]\]/g, '</$1>')
    .replace(/\[\/(SCENE|PARALLEL|SECRET|WORLD|WHATIF)\]/gi, (_full, tag: string) => `</${tag.toUpperCase()}>`)
    .replace(/\[(\/?)([A-Za-z][\w-]*)\]/g, '<$1$2>')
  return text.replace(/\u0000xml-value-(\d+)\u0000/g, (_full, index: string) => opaque[Number(index)])
}

/** Convert a shipped structural matcher while keeping every capture and its
 * order. Character classes and regex escapes are not markup delimiters. */
export function xmlSurfaceRegex(source: string): string {
  let output = source
  const prefixes = ['SCENE', 'PARALLEL', 'SECRET', 'WORLD', 'WHATIF', 'NPC:', '[else', '[npc', '[place']
  for (const prefix of prefixes) {
    const startToken = prefix.startsWith('[') ? `\\[\\[${prefix.slice(1)}` : `\\[${prefix}`
    let from = 0
    for (;;) {
      const start = output.indexOf(startToken, from)
      if (start < 0) break
      let inClass = false, end = -1
      for (let i = start + startToken.length; i < output.length; i++) {
        if (output[i] === '\\') {
          if (output[i + 1] === ']' && !inClass) { end = i + 2; break }
          i++; continue
        }
        if (output[i] === '[') inClass = true
        if (output[i] === ']') inClass = false
      }
      if (end < 0) break
      if (prefix.startsWith('[') && output.slice(end, end + 2) === '\\]') end += 2
      const original = output.slice(start, end)
      // Prefix probes in CSS injectors are not complete headers.
      if (/\\\[/.test(original.slice(startToken.length))) { from = start + startToken.length; continue }
      let raw = original.slice(startToken.length, prefix.startsWith('[') ? -4 : -2)
      if (!raw || (!prefix.startsWith('[') && prefix !== 'NPC:' && !raw.startsWith('\\|'))) { from = end; continue }
      let tag = prefix, fields = HEADERS[prefix], fixed = '', selfClosing = false
      if (prefix === 'NPC:') {
        if (raw.startsWith('UP\\|')) { tag = 'NPC'; fields = ['name', 'tier']; fixed = ' action="UP"'; raw = raw.slice(4) }
        else if (raw.startsWith('REF\\|')) { tag = 'NPC_REF'; fields = ['name', 'cue', 'mood']; selfClosing = true; raw = raw.slice(5) }
        else if (raw.startsWith('REL\\|')) { tag = 'NPC_REL'; fields = ['name', 'change']; selfClosing = true; raw = raw.slice(5) }
        else { tag = 'NPC'; fields = ['tier', 'name'] }
      } else if (prefix.startsWith('[')) {
        tag = prefix.slice(1); raw = raw.replace(/^\\s\+/, '')
        fields = tag === 'else' ? ['thread'] : tag === 'npc' ? ['visible', 'tier', 'revision'] : ['visible', 'revision']
      } else raw = raw.replace(/^\\\|/, '')
      // Parameter separators outside character classes only.
      const parts: string[] = []; let part = '', cls = false
      for (let i = 0; i < raw.length; i++) {
        if (raw[i] === '\\') {
          if (raw[i + 1] === '|' && !cls) { parts.push(part); part = ''; i++; continue }
          part += raw[i] + (raw[++i] || ''); continue
        }
        if (raw[i] === '[') cls = true
        if (raw[i] === ']') cls = false
        part += raw[i]
      }
      parts.push(part)
      if (tag === 'SECRET' && parts.length === 2) fields = ['label', 'kind']
      const clean = (value: string) => value.replace(/\[\^\\\|\\\]\\r\\n\]|\[\^\\\]\\r\\n\]/g, '[^"\\r\\n]')
      let replacement: string
      if (tag === 'npc' || tag === 'place') {
        // Their last attribute is optional; retain the original capture group.
        const revision = /\(\?:\\\|(\(\?<revision>[\s\S]*\))\)\?$/.exec(raw)
        const base = revision ? raw.slice(0, revision.index) : raw
        const values = clean(base).split('\\|')
        replacement = `<${tag}${values.map((v, i) => ` ${fields[i]}="${clean(v)}"`).join('')}${revision ? `(?: revision="${clean(revision[1])}")?` : ''}>`
      } else replacement = `<${tag}${fixed}${parts.map((v, i) => ` ${fields[i]}="${clean(v)}"`).join('')}${selfClosing ? '/>' : '>'}`
      output = output.slice(0, start) + replacement + output.slice(end)
      from = start + replacement.length
    }
  }
  return output
    .replace(/\\\[\\\[(?:\\\/|\/)(else|npc|place)\\\]\\\]/g, '</$1>')
    .replace(/\\\[(\\?\/)?((?:\(\?:)?[A-Za-z][\w-]*(?:\|[A-Za-z][\w-]*)*\)?)(\\\])/g, (_full, slash: string, tag: string) => `<${slash ? '/' : ''}${tag}>`)
    .replace(/\\\[(SCENE|PARALLEL|SECRET|WORLD|WHATIF)\\\|/g, '<$1\\s')
    .replace(/\\\[NPC:/g, '<NPC\\s')
    .replace(/\\\[\\\[(else|npc|place)\\s/g, '<$1\\s')
}

/** Read-only compatibility projection for consumers of pre-XML Narrative
 * semantics. It is never stored and never used to authorize an edit. */
export function xmlNarrativeAsLegacy(source: string): string {
  return String(source || '').replace(/<([A-Za-z][\w-]*)\b([^>]*)>([\s\S]*?)<\/\1>/g, (full, tag: string, attrs: string, body: string) => {
    const values = Object.fromEntries([...attrs.matchAll(/([\w-]+)="([^"]*)"/g)].map(m => [m[1], m[2]]))
    if (['image_request', 'image_request_error', 'reverie-illustration', 'div', 'span', 'figure', 'figcaption', 'aside', 'section', 'details', 'style', 'button', 'label', 'table', 'p', 'a', 'b', 'small'].includes(tag)) return full
    const nested = xmlNarrativeAsLegacy(body)
    if (HEADERS[tag]) return `[${tag}|${HEADERS[tag].map(key => values[key] || '').join('|')}]${nested}[/${tag}]`
    if (tag === 'else') return `[[else ${values.thread || ''}]]${nested}[[/else]]`
    if (tag === 'npc' || tag === 'place') return `[[${tag} ${values.visible || ''}${tag === 'npc' ? `|${values.tier || ''}` : ''}${values.revision ? `|${values.revision}` : ''}]]${nested}[[/${tag}]]`
    if (tag === 'NPC') return `[NPC:${values.action === 'UP' ? `UP|${values.name}|${values.tier}` : `${values.tier}|${values.name}`}]${nested}[/NPC]`
    return `[${tag}]${nested}[/${tag}]`
  })
}

export function xmlAuthoringInstructions(source: string): string {
  return xmlSurfaceExamples(source)
    .replace(/bracket-native(?: syntax| format| payload| board)?/gi, 'XML')
    .replace(/bracket child fields|child-field brackets|bracket fields/gi, 'XML child elements')
    .replace(/(?:BRACKET|SURFACE) ROOT:/g, 'XML ROOT:')
    .replace(/CANONICAL BRACKET EXAMPLE/g, 'CANONICAL XML EXAMPLE')
    .replace(/opening bracket tags never carry attributes/gi, 'opening XML tags use the attributes shown in the schema')
    .replace(/Opening bracket tags never carry attributes; metadata is written as child[^.]*\./gi, 'Keep attributes and child elements exactly as shown in the XML schema.')
    .replace(/No attributes in opening bracket tags\./gi, 'Keep the XML attributes shown in the schema.')
    .replace(/(?:not|rather than) XML/gi, 'not bracket markup')
    .replace(/XML is (?:legacy|compatibility-only)[^.]*\./gi, 'XML is the canonical authoring format.')
    .replace(/Legacy XML Surface shells are [^.]*\./gi, 'XML is the canonical authoring format; old bracket messages remain readable.')
    .replace(/Legacy XML compatibility shape \(parser input only; current model authoring is XML\)/gi, 'Canonical XML shape')
    .replace(/Keep every bracket balanced|Keep all bracket fields balanced/gi, 'Keep every XML tag balanced')
    .replace(/bracket region|bracket media child|cp_ bracket grammar/gi, 'XML element')
    .replace(/not Surface XML/gi, 'XML control elements')
    .replace(/Brackets delimit named fields only\./g, 'Angle-bracket XML tags delimit named fields; square brackets in text are literal values.')
    .replace(/Write only the bracket payload/gi, 'Write only the XML payload')
    .replace(/bracket Surface|bracket payload|bracket renderer contract/gi, 'XML Surface')
}
