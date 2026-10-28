import { PLOT_SPARK_VECTOR_BY_KEY, inspectStoryModelOutputContracts } from './contracts'
import { bracketNodeText, parseBracketDocument, type BracketNode } from './bracketParser'
import { bracketImageControls, projectBracketImageControlsToXml } from './imageControlMarkup'
import { parseSurfaceXml } from './surfaceXml'
import { xmlNarrativeAsLegacy, xmlSurfaceExamples } from './xmlSurfaceFormat'

export const PLOT_SPARKS_SURFACE_ID = 'plot-sparks'
export const PLOT_SPARKS_ROOT = 'Plot_Sparks'
/** Old saved boards remain valid; newly authored boards use the ten-key contract. */
export function isRenderablePlotSparkCount(count: number): boolean {
  return count === 7 || count === Object.keys(PLOT_SPARK_VECTOR_BY_KEY).length
}
export const PLOT_SPARKS_REPAIR_EXAMPLE = `[Plot_Sparks][ID]spark-board[/ID][Lifecycle]Unused Plot Sparks dissolve after this response.[/Lifecycle]${Object.entries(PLOT_SPARK_VECTOR_BY_KEY).map(([key, vector]) => `[Spark][Key]${key}[/Key][Vector]${vector}[/Vector][Text]Possible branch ${key.toUpperCase()}.[/Text][Media][/Media][/Spark]`).join('')}[/Plot_Sparks]`
export const PLOT_SPARKS_XML_REPAIR_EXAMPLE = xmlSurfaceExamples(PLOT_SPARKS_REPAIR_EXAMPLE)

type PlotSparksXmlFrame = { tag: string; childIndex: number; sparkCount: number }
const PLOT_SPARKS_XML_CHILDREN: Readonly<Record<string, readonly string[]>> = {
  plot_sparks: ['id', 'lifecycle', 'spark'],
  spark: ['key', 'vector', 'text', 'media'],
  media: ['reverie-illustration'],
  'reverie-illustration': ['visual_prompt'],
}
const PLOT_SPARKS_XML_CANONICAL_TAG: Readonly<Record<string, string>> = {
  plot_sparks: 'Plot_Sparks', id: 'ID', lifecycle: 'Lifecycle', spark: 'Spark',
  key: 'Key', vector: 'Vector', text: 'Text', media: 'Media',
  'reverie-illustration': 'reverie-illustration', visual_prompt: 'visual_prompt',
}

function plotSparksXmlCanAccept(parent: PlotSparksXmlFrame, child: string): boolean {
  if (parent.tag === 'plot_sparks') {
    if (child === 'id') return parent.childIndex === -1
    if (child === 'lifecycle') return parent.childIndex === 0
    if (child === 'spark') return parent.childIndex >= 1
  }
  const children = PLOT_SPARKS_XML_CHILDREN[parent.tag] || []
  const index = children.indexOf(child)
  return index >= 0 && index === parent.childIndex + 1
}

function plotSparksXmlCanClose(frame: PlotSparksXmlFrame): boolean {
  if (frame.tag === 'plot_sparks') return frame.childIndex === 2 && frame.sparkCount >= 7
  if (frame.tag === 'spark') return frame.childIndex >= 2
  if (frame.tag === 'media') return frame.childIndex === -1 || frame.childIndex === 0
  if (frame.tag === 'reverie-illustration') return frame.childIndex === 0
  return ['id', 'lifecycle', 'key', 'vector', 'text', 'visual_prompt'].includes(frame.tag)
}

function plotSparksXmlMediaIsCurrent(media: string): boolean {
  const openings = [...media.matchAll(/<reverie-illustration\b([^>]*)>/gi)]
  if (openings.length !== 1 || (media.match(/<\/reverie-illustration\s*>/gi) || []).length !== 1) return false
  if (!/\brequest\s*=\s*(["'])generate\1/i.test(openings[0][1])) return false
  const illustration = /<reverie-illustration\b[^>]*>([\s\S]*?)<\/reverie-illustration\s*>/i.exec(media)?.[1]
  if (!illustration || (illustration.match(/<visual_prompt>/gi) || []).length !== 1 || (illustration.match(/<\/visual_prompt>/gi) || []).length !== 1) return false
  return Boolean(/<visual_prompt>([\s\S]*?)<\/visual_prompt>/i.exec(illustration)?.[1].trim())
}

/**
 * Model-authored XML occasionally omits a field/container closer in an otherwise
 * canonical Plot Sparks board. Insert a closer only at an unambiguous schema
 * boundary, then accept it only if the complete ten-key/vector/media contract
 * validates. No opener, attribute, text, image request, or existing tag changes.
 */
export function normalizePlotSparksXmlClosingTags(markup: string): string {
  const input = String(markup || '')
  return input.replace(/<Plot_Sparks\b[^>]*>[\s\S]*?<\/Plot_Sparks\s*>/gi, original => {
    if (parseSurfaceXml(original)) return original
    const tokens = /<!--[\s\S]*?-->|<\/?[A-Za-z][\w:-]*(?:\s+(?:[^<>"']|"[^"]*"|'[^']*')*)?\s*\/?>/g
    const stack: PlotSparksXmlFrame[] = []
    let output = ''
    let cursor = 0
    let changed = false
    let unsafe = false

    for (const match of original.matchAll(tokens)) {
      const index = match.index || 0
      const token = match[0]
      output += original.slice(cursor, index)
      cursor = index + token.length
      if (token.startsWith('<!--')) {
        output += token
        continue
      }
      const name = /^<\/?([A-Za-z][\w:-]*)/.exec(token)?.[1]?.toLocaleLowerCase()
      if (!name) { unsafe = true; break }

      if (token.startsWith('</')) {
        const matchingIndex = stack.map(frame => frame.tag).lastIndexOf(name)
        if (matchingIndex < 0) { unsafe = true; break }
        while (stack.length - 1 > matchingIndex) {
          const frame = stack.at(-1)!
          if (!plotSparksXmlCanClose(frame)) { unsafe = true; break }
          output += `</${PLOT_SPARKS_XML_CANONICAL_TAG[frame.tag]}>`
          stack.pop()
          changed = true
        }
        if (unsafe) break
        const frame = stack.at(-1)!
        if (!frame || frame.tag !== name || !plotSparksXmlCanClose(frame)) { unsafe = true; break }
        output += token
        stack.pop()
        continue
      }

      if (/\/\s*>$/.test(token)) { unsafe = true; break }
      if (!PLOT_SPARKS_XML_CANONICAL_TAG[name]) { unsafe = true; break }
      if (!stack.length) {
        if (name !== 'plot_sparks') { unsafe = true; break }
        stack.push({ tag: name, childIndex: -1, sparkCount: 0 })
        output += token
        continue
      }

      let parent = stack.at(-1)!
      while (!plotSparksXmlCanAccept(parent, name)) {
        if (stack.length <= 1) { unsafe = true; break }
        const frame = stack.at(-1)!
        if (!plotSparksXmlCanClose(frame)) { unsafe = true; break }
        output += `</${PLOT_SPARKS_XML_CANONICAL_TAG[frame.tag]}>`
        stack.pop()
        changed = true
        parent = stack.at(-1)!
      }
      if (unsafe) break
      const children = PLOT_SPARKS_XML_CHILDREN[parent.tag] || []
      const childIndex = parent.tag === 'plot_sparks' ? (name === 'spark' ? 2 : children.indexOf(name)) : children.indexOf(name)
      parent.childIndex = childIndex
      if (parent.tag === 'plot_sparks' && name === 'spark') parent.sparkCount += 1
      output += token
      stack.push({ tag: name, childIndex: -1, sparkCount: 0 })
    }

    if (unsafe || stack.length || !changed) return original
    output += original.slice(cursor)
    if (!parseSurfaceXml(output) || plotSparksContractDiagnostic(output)) return original
    const imageEnabled = /<reverie-illustration\b/i.test(output)
    const sparkCount = [...output.matchAll(/<Spark\b/gi)].length
    if (sparkCount === Object.keys(PLOT_SPARK_VECTOR_BY_KEY).length) {
      if (!inspectStoryModelOutputContracts(output, { expectPlotSparks: true, plotSparksImagesEnabled: imageEnabled }).plotSparks.valid) return original
    } else {
      // Preserve the renderer's documented seven-Spark compatibility for saved
      // boards; the new-output inspector intentionally requires ten.
      const mediaBlocks = [...output.matchAll(/<Media\b[^>]*>([\s\S]*?)<\/Media\s*>/gi)]
      if (imageEnabled && (mediaBlocks.length !== sparkCount || !mediaBlocks.every(match => plotSparksXmlMediaIsCurrent(match[1])))) return original
      if (!imageEnabled && mediaBlocks.some(match => match[1].trim())) return original
    }
    return output
  })
}

/** Observed live typo: Lifecycle's closer was another opener. Repair only that
 * exact header boundary, and only when the entire resulting board validates.
 * No branch text, ordering, identity, media or unfinished stream is rewritten.
 */
export function normalizePlotSparksLifecycleCloser(markup: string): string {
  return String(markup || '').replace(/\[Plot_Sparks\]((?:(?!\[Plot_Sparks\])[\s\S])*?)\[\/Plot_Sparks\]/gi, full => {
    if ((full.match(/\[Lifecycle\]/gi) || []).length !== 2 || /\[\/Lifecycle\]/i.test(full)) return full
    const header = /^(\[Plot_Sparks\]\s*\[ID\][^\[\]]+\[\/ID\]\s*\[Lifecycle\][^\[\]]+)\[Lifecycle\](?=\s*\[Spark\])/i
    if (!header.test(full)) return full
    const candidate = full.replace(header, (_match, prefix: string) => `${prefix}[/Lifecycle]`)
    return plotSparksContractDiagnostic(candidate) === undefined ? candidate : full
  })
}

/** Explain a failed owner without guessing, rewriting branches, or requiring images. */
export function plotSparksContractDiagnostic(markup: string): string | undefined {
  if (/^\s*</.test(markup)) {
    const root = parseSurfaceXml(markup)
    if (!root || root.tag.toLowerCase() !== 'plot_sparks') return 'The Plot Sparks XML board is not well formed; check its opening, closing and nested field tags.'
    // In XML every square bracket in a value is literal, even [Media]. Shield
    // it only in the validator projection; source and rendered text stay exact.
    const values = markup.replace(/(<Text>)([\s\S]*?)(<\/Text>)/gi, (_full, open: string, value: string, close: string) => `${open}${value.replace(/\[/g, '&#91;').replace(/\]/g, '&#93;')}${close}`)
    const reason = plotSparksContractDiagnostic(xmlNarrativeAsLegacy(values))
    return reason?.replace(/\[(\/?)([A-Za-z][\w-]*)\]/g, '<$1$2>')
  }
  if (!/^\s*\[Plot_Sparks\][\s\S]*\[\/Plot_Sparks\]\s*$/i.test(markup)) return 'The Plot Sparks board needs its opening and closing [Plot_Sparks] tags.'
  const controls = bracketImageControls(markup)
  const invalidControl = controls.find(control => !control.complete || control.diagnostics.length)
  if (invalidControl) return `A Spark image request is malformed: ${invalidControl.diagnostics[0] || 'its closing tag is missing.'}`
  // Text and image descriptions are values, not another bracket document.
  // Shield literal brackets only in the diagnostic projection; rendering,
  // source storage, image prompts and repair invariants keep every byte.
  // Reserved board delimiters remain structural so missing/duplicate fields
  // cannot be concealed inside a purported Text value.
  const escapedBrackets = (text: string) => text.replace(/\[/g, '&#91;').replace(/\]/g, '&#93;')
  const diagnosticMarkup = projectBracketImageControlsToXml(markup)
    .replace(/(\[Text\])([\s\S]*?)(\[\/Text\])/gi, (full, open: string, text: string, close: string) =>
      /\[\/?(?:Plot_Sparks|Spark|Key|Vector|Text|Media|ID|Lifecycle)\b/i.test(text) ? full : `${open}${escapedBrackets(text)}${close}`)
    .replace(/(<(visual_prompt|scene_brief|context_caption|negative)\b[^>]*>)([\s\S]*?)(<\/\2\s*>)/gi,
      (_full, open: string, _name: string, text: string, close: string) => `${open}${escapedBrackets(text)}${close}`)
  const parsed = parseBracketDocument(diagnosticMarkup)
  if (parsed.diagnostics.length) return parsed.diagnostics.slice(0, 3).join(' ')
  const root = parsed.roots[0]
  if (parsed.roots.length !== 1 || root?.name !== 'plot_sparks') return 'Expected one Plot Sparks board, not multiple or nested owners.'
  const nodes = root.children.filter((child): child is BracketNode => typeof child !== 'string')
  if (root.children.some(child => typeof child === 'string' && child.trim())) return 'Text outside the board fields could not be safely assigned to a Spark.'
  for (const name of ['id', 'lifecycle']) {
    const fields = nodes.filter(node => node.name === name)
    if (fields.length !== 1 || !bracketNodeText(fields[0])) return `The board needs exactly one non-empty [${name === 'id' ? 'ID' : 'Lifecycle'}] field.`
  }
  const sparks = nodes.filter(node => node.name === 'spark')
  if (!isRenderablePlotSparkCount(sparks.length)) return `Expected ten Sparks (A–J), or a saved seven-Spark board (A–G); found ${sparks.length}.`
  const range = sparks.length === 7 ? 'A–G' : 'A–J'
  if (nodes.map(node => node.name).join(',') !== ['id', 'lifecycle', ...sparks.map(() => 'spark')].join(',')) return `The board must contain ID, Lifecycle, then Sparks ${range} in that order.`
  const expected = Object.entries(PLOT_SPARK_VECTOR_BY_KEY).slice(0, sparks.length)
  for (const [index, spark] of sparks.entries()) {
    const fields = spark.children.filter((child): child is BracketNode => typeof child !== 'string')
    const [key, vector] = expected[index]
    if (spark.children.some(child => typeof child === 'string' && child.trim())
      || !['key,vector,text', 'key,vector,text,media'].includes(fields.map(field => field.name).join(','))) {
      return `Spark ${key.toUpperCase()} needs one Key, Vector and Text field, followed by optional Media; a field is missing, duplicated or out of order.`
    }
    if (bracketNodeText(fields[0]).toLowerCase() !== key) return `Spark ${index + 1} must use Key ${key.toUpperCase()}; keys must be unique and ordered ${range}.`
    if (bracketNodeText(fields[1]).toLowerCase() !== vector) return `Spark ${key.toUpperCase()} must use Vector "${vector}".`
    if (!bracketNodeText(fields[2])) return `Spark ${key.toUpperCase()} has an empty Text field.`
  }
  return undefined
}
