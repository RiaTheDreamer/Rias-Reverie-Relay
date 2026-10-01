/** Restricts user-authored preset CSS to flat rules scoped to one exact preset. */
export function validateDeclarativeSurfaceCss(value: string, surfaceId: string): string[] {
  const css = String(value || '').trim()
  if (!css) return []
  const errors: string[] = []
  if (!/^[a-z0-9][a-z0-9._-]{1,62}$/i.test(surfaceId)) errors.push('Invalid Surface ID for CSS scoping.')
  if (css.length > 100_000) errors.push('Advanced CSS is too large (100 KB maximum).')
  if (/<\/style|<script|javascript\s*:|@import|expression\s*\(|url\s*\(|-moz-binding|\bbehavior\s*:/i.test(css)) {
    errors.push('Advanced CSS cannot contain scripts, imports, executable URLs, or browser behaviors.')
  }
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, '')
  const expected = `.rrn-surface[data-rrn-preset="${surfaceId}"]`
  const rule = /([^{}]+)\{([^{}]*)\}/g
  let cursor = 0
  let foundRule = false
  for (const match of clean.matchAll(rule)) {
    const index = match.index || 0
    if (clean.slice(cursor, index).trim()) errors.push('Advanced CSS must use flat, namespaced style rules only.')
    cursor = index + match[0].length
    foundRule = true
    const selectors = match[1].split(',').map(selector => selector.trim()).filter(Boolean)
    if (!selectors.length || selectors.some(selector => !selector.startsWith(expected))) errors.push(`Every selector must begin with ${expected}.`)
    if (!match[2].trim()) errors.push('Advanced CSS rules cannot be empty.')
  }
  if (clean.slice(cursor).trim() || !foundRule) errors.push('Advanced CSS must contain complete selector/declaration rules.')
  return [...new Set(errors)]
}
