/** Extract only closed illustration objects from the Director's root JSON array.
 * This is a UI preview, never a substitute for validating the terminal response.
 * Strings (including escaped braces/quotes) cannot create object boundaries. */
export function closedRelayDirectorBatch(text: string): string | null {
  const start = text.indexOf('{')
  if (start < 0) return null
  const stack: string[] = []
  let quoted = false, escaped = false, fieldStart = start + 1
  let illustrations = false, lastObjectEnd = -1
  for (let i = start; i < text.length; i++) {
    const char = text[i]
    if (quoted) {
      if (escaped) escaped = false
      else if (char === '\\') escaped = true
      else if (char === '"') quoted = false
      continue
    }
    if (char === '"') { quoted = true; continue }
    if (char === '{' || char === '[') {
      if (char === '[' && stack.length === 1 && /^\s*"illustrations"\s*:\s*$/.test(text.slice(fieldStart, i))) illustrations = true
      stack.push(char)
    } else if (char === '}' || char === ']') {
      if (stack.pop() !== (char === '}' ? '{' : '[')) return null
      if (illustrations && char === '}' && stack.length === 2) lastObjectEnd = i + 1
      if (illustrations && char === ']' && stack.length === 1) break
      if (!stack.length) break
    } else if (char === ',' && stack.length === 1) fieldStart = i + 1
  }
  if (lastObjectEnd < 0) return null
  const partial = text.slice(start, lastObjectEnd) + ']}'
  try {
    const parsed = JSON.parse(partial)
    return parsed.shouldIllustrate === true && Array.isArray(parsed.illustrations) ? partial : null
  } catch { return null }
}
