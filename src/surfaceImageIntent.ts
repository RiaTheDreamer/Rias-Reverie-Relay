/** A Surface's destination is not a visible subject. Keep physical UI/screens
 * requested as the subject; remove only explicit image-placement clauses. */
export function imageContentWithoutSurfaceDestination(value: string): string {
  return value
    .replace(/\b(?:for|to (?:use|be used) (?:in|on)|(?:to be )?displayed (?:in|on))\s+(?:(?:a|an|the|this)\s+)?(?:UI|interface|NPC|character[- ]profile|profile)\s+(?:card|panel|slot|tile|widget)\b/gi, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/ +([,.;:])/g, '$1')
    .trim()
}

/** Narrow guard for a Parser replacing a portrait with the hosting UI asset.
 * Ordinary visible devices, portrait framing, and UI exclusions are not leaks. */
export function portraitReplacedBySurfaceUi(value: string): boolean {
  return value.split(/[.;\n]/).some(clause => {
    if (/^\s*(?:no|without|avoid|exclude)\b/i.test(clause)) return false
    return /\b(?:UI|interface)\s+card\s+asset\b|\bfull[- ]frame\s+(?:graphic\s+)?screen\s+layout\b|\bedge[- ]to[- ]edge\s+interface\s+content\b|\bscreen\s+content\s+only\b/i.test(clause)
  })
}
