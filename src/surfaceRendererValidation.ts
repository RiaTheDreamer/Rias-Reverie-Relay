import type { SurfaceRendererScriptOverride } from './contracts'
import type { R45RegexScript } from './r45SurfaceAuthority'

function validRegexFlags(flags: string): boolean {
  return /^[dgimsuvy]*$/.test(flags)
    && new Set(flags).size === flags.length
    && !(flags.includes('u') && flags.includes('v'))
}

export function createValidatedRendererOverride(
  base: R45RegexScript,
  candidate: Partial<SurfaceRendererScriptOverride>,
): SurfaceRendererScriptOverride {
  const name = String(candidate.name ?? base.name).trim()
  const findRegex = typeof candidate.findRegex === 'string' ? candidate.findRegex : base.find_regex
  const replaceString = typeof candidate.replaceString === 'string' ? candidate.replaceString : base.replace_string
  const flags = typeof candidate.flags === 'string' ? candidate.flags : base.flags
  const order = Number(candidate.order ?? base.sort_order)
  if (!name || name.length > 180) throw new Error('Script name must be between 1 and 180 characters.')
  const regexError = validateRendererRegex(findRegex, flags)
  if (regexError) throw new Error(regexError)
  if (replaceString.length > 250_000) throw new Error('Replacement text exceeds the 250 KB safety limit.')
  if (/<script\b|javascript\s*:|\son[a-z]+\s*=/i.test(replaceString)) throw new Error('Replacement text cannot introduce executable script or event-handler markup.')
  if (!Number.isFinite(order) || order < 0 || order > 10_000) throw new Error('Script order must be a number from 0 to 10,000 (decimals allowed).')
  return { name, findRegex, replaceString, flags, order }
}

export function validateRendererRegex(findRegex: string, flags: string): string | null {
  if (!findRegex || findRegex.length > 8_000) return 'Find expression must be non-empty and no longer than 8,000 characters.'
  if (!validRegexFlags(flags)) return 'Regex flags are invalid or duplicated.'
  try {
    new RegExp(findRegex, flags)
    return null
  } catch (error) {
    return `Find expression is not a valid regex: ${error instanceof Error ? error.message : String(error)}`
  }
}
