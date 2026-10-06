/** Saved phone markup is archival input, never a prerequisite for the widget.
 * Claim complete legacy owners before their image controls or display Regexes
 * run. Persisted messages and the read-only record extractor stay untouched. */
export function retiredPhoneSurfaceRanges(source: string): Array<{ start: number; end: number }> {
  const owners = /<(character_phone|private_phone)\b[^>]*>(?:(?!<(?:character_phone|private_phone)\b)[\s\S])*?<\/\1\s*>|\[(character_phone|private_phone)\](?:(?!\[(?:character_phone|private_phone)\])[\s\S])*?\[\/\2\]/gi
  return [...source.matchAll(owners)].map(match => ({ start: match.index!, end: match.index! + match[0].length }))
}

export function maskRetiredPhoneSurfaces(source: string): string {
  for (const range of retiredPhoneSurfaceRanges(source).reverse()) source = source.slice(0, range.start) + ' '.repeat(range.end - range.start) + source.slice(range.end)
  return source
}

export function retirePhoneSurfaceDisplay(source: string): { content: string; count: number } {
  const ranges = retiredPhoneSurfaceRanges(source)
  const launcher = '<button type="button" data-reverie-phone-library="true" style="display:block;margin:12px 0;padding:12px 18px;border:1px solid #75556d;border-radius:16px;background:#241b2b;color:#f6eef8;cursor:pointer;font:inherit">Open Reverie Phone ↗</button>'
  for (const range of ranges.reverse()) source = source.slice(0, range.start) + launcher + source.slice(range.end)
  return { content: source, count: ranges.length }
}

/** Internal compatibility scripts can still preview old data in tests/tools,
 * but no phone Surface renderer belongs in a new host Regex installation. */
export function isRetiredPhoneRegexScript(scriptId: string): boolean {
  return /^(?:rrpp_|rrcp_)/.test(scriptId)
}
