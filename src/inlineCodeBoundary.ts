/** Inline Markdown examples are literal text, never Surface or generation owners.
 * Fenced payloads retain their existing compatibility behavior. */
export function inlineCodeRanges(source: string): Array<{ start: number; end: number }> {
  if (!source.includes('`')) return []
  const runs: Array<{ start: number; end: number; width: number; group: number }> = []
  let fenceWidth = 0
  let group = 0; let previousEnd = 0
  for (const match of source.matchAll(/`+/g)) {
    const start = match.index!
    const width = match[0].length
    const lineStart = source.lastIndexOf('\n', start - 1) + 1
    const lineEnd = source.indexOf('\n', start)
    const suffix = source.slice(start + width, lineEnd < 0 ? source.length : lineEnd)
    const fenceLine = width >= 3 && /^[ \t]{0,3}$/.test(source.slice(lineStart, start)) && !suffix.includes('`')
    if (fenceWidth) {
      if (fenceLine && width >= fenceWidth && /^[ \t]*(?:\r?\n|$)/.test(source.slice(start + width))) { fenceWidth = 0; group++ }
      continue
    }
    if (fenceLine) { fenceWidth = width; group++; continue }
    if (/\r?\n[ \t]*\r?\n/.test(source.slice(previousEnd, start))) group++
    let slashes = 0
    for (let index = start - 1; index >= 0 && source[index] === '\\'; index--) slashes++
    runs.push({ start, end: start + width, width: slashes % 2 ? -width : width, group })
    previousEnd = start + width
  }
  const ranges: Array<{ start: number; end: number }> = []
  for (let index = 0; index < runs.length; index++) {
    if (runs[index].width < 0) continue
    // Backslashes do not escape a closing delimiter inside a code span.
    const close = runs.findIndex((run, next) => next > index && run.group === runs[index].group && Math.abs(run.width) === runs[index].width)
    if (close < 0) continue
    ranges.push({ start: runs[index].start, end: runs[close].end })
    index = close
  }
  return ranges
}

export function maskInlineCodeSpans(source: string): string {
  let output = ''; let cursor = 0
  for (const range of inlineCodeRanges(source)) {
    output += source.slice(cursor, range.start) + source.slice(range.start, range.end).replace(/[^\r\n]/g, ' ')
    cursor = range.end
  }
  return output + source.slice(cursor)
}

export function protectInlineCodeSpans(source: string): { markup: string; restore: (output: string) => string } {
  let prefix = '<!--rrl-literal-code:'
  while (source.includes(prefix)) prefix = prefix.replace(':', '-:')
  const saved: Array<{ token: string; source: string }> = []
  let markup = ''; let cursor = 0
  for (const range of inlineCodeRanges(source)) {
    const token = `${prefix}${saved.length}-->`
    saved.push({ token, source: source.slice(range.start, range.end) })
    markup += source.slice(cursor, range.start) + token
    cursor = range.end
  }
  markup += source.slice(cursor)
  const inert = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/\[/g, '&#91;').replace(/\]/g, '&#93;')
  return { markup, restore: output => saved.reduce((text, item) => text
    // Editable source is carried through escaped attributes/textareas. Restore
    // that encoding too; never inject raw markup into the source attribute.
    .split(inert(item.token)).join(inert(item.source))
    .split(item.token).join(item.source), output) }
}
