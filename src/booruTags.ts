import { visualDescriptionEvidence } from './illustrationSceneContract'

/** Normalize Danbooru-style visual tags without laundering prose into tags.
 * Mixed output retains short descriptions rather than silently losing scene
 * facts. These fragments stay verbatim, not invented underscore tags. Three useful tags
 * to pass; a sentence alone still requires the model to choose real concepts.
 */
const KNOWN_DANBOORU_CORRECTIONS: Record<string, string> = {
  amber_eyes: 'yellow_eyes',
  cybernetic_eye: 'single_mechanical_eye',
  mechanical_eye: 'single_mechanical_eye',
  wolfcut: 'wolf_cut',
}

/** A singular marker opens a subject-owned block. Equal markers and traits in
 * another block are intentional, not global duplicates. Never infer gender. */
export function isBooruSubjectMarker(value: string): boolean {
  return /^1(?:girl|boy|woman|man|other|animal)$/i.test(value.trim())
}

/** A Parser may improve action tags, but cannot merge/reorder owner blocks or
 * move established appearance/outfit tags to a different subject. */
export function booruSubjectOwnershipChanged(original: string, candidate: string): boolean {
  const blocks = (prompt: string) => {
    const result: string[][] = []
    for (const tag of normalizeBooruTagPrompt(prompt).split(',').map(tag => tag.trim())) {
      if (isBooruSubjectMarker(tag)) result.push([tag])
      else result.at(-1)?.push(tag)
    }
    return result
  }
  const source = blocks(original)
  if (source.length < 2) return false
  const rewritten = blocks(candidate)
  if (source.length !== rewritten.length) return true
  const appearance = /(?:^|_)(?:hair|eyes?|skin|fur|ears?|tail|horns?|breasts?|jacket|coat|cardigan|blazer|shirt|blouse|dress|skirt|pants|trousers|shorts|suit|uniform|vest|tie|scarf|gloves?|shoes?|boots?|sneakers|socks?|stockings|hat|cap|glasses|earrings?|necklace|collar|sleeves?)(?:_|$)/
  return source.some((block, index) => block[0] !== rewritten[index][0]
    || block.some(tag => appearance.test(tag) && !rewritten[index].includes(tag)))
}

function isBoundedDescriptionFragment(value: string): boolean {
  return value.length <= 240 && /\s/.test(value)
    && !/[<>\[\]{}\r\n]/.test(value)
    && !/\b(?:must|should|include|describe|generate|prompt|instruction|depict|render|please)\b/i.test(value)
    && !/^\s*(?:draw|write|fold|lift|raise)\b/i.test(value)
}

/** Read only explicit count tags. Repeated per-subject 1girl/1boy tags must not
 * double-count a global count; mixed gender counts do add up. Unknown counts
 * stay unknown rather than inferring people from incidental prose or names.
 */
export function declaredBooruPeopleCount(value: string): number {
  let female = 0, male = 0, other = 0, total = 0
  for (const tag of value.split(',').map(tag => tag.trim().toLocaleLowerCase())) {
    const match = /^(\d{1,2})(girls?|women|woman|boys?|men|man|others?|people|persons?)$/.exec(tag)
    if (!match) continue
    const count = Number(match[1])
    if (/^(?:girl|woman|women)/.test(match[2])) female = Math.max(female, count)
    else if (/^(?:boy|man|men)/.test(match[2])) male = Math.max(male, count)
    else if (/^other/.test(match[2])) other = Math.max(other, count)
    else total = Math.max(total, count)
  }
  return Math.max(total, female + male + other)
}

export function normalizeBooruTagPrompt(value: unknown): string {
  const input = typeof value === 'string' ? visualDescriptionEvidence(value).trim() : ''
  if (!input) throw new Error('Booru Tag Mode needs a non-empty list of visual tags.')
  const tags = input.split(',').map(tag => tag.trim()).filter(Boolean)
  const seen = new Set<string>()
  const validConcepts = new Set<string>()
  const output: string[] = []
  for (const tag of tags) {
    if (isBooruSubjectMarker(tag)) seen.clear()
    if (!/^[a-z0-9][a-z0-9_()+\-]*$/i.test(tag) || /__|_$/.test(tag)) {
      // Spaces do not make clothing, positions, expressions or setting invalid
      // provider content. Preserve bounded descriptions, including action verbs
      // outside the scene gate's small vocabulary. They do not count as tags.
      if (isBoundedDescriptionFragment(tag) && !seen.has(tag.toLocaleLowerCase())) {
        seen.add(tag.toLocaleLowerCase()); output.push(tag)
      }
      continue
    }
    const words = tag.toLocaleLowerCase().split(/[_()+\-]+/).filter(Boolean)
    if (tag.length > 64 || words.length > 4 || words.some(word => /^(?:a|an|the|is|are|was|were|because|while|then|there|which|whose|should|would|could|must|include|describe|image|prompt|scene|illustration)$/.test(word))) {
      continue
    }
    const normalized = tag.toLocaleLowerCase()
    // Canonicalize only verified, high-confidence tag corrections. A syntactically
    // valid custom side qualifier may stay, but it cannot replace the known
    // visual concept it qualifies.
    const concepts = /^(?:cybernetic|mechanical)_(?:left|right)_eye$/.test(normalized)
      ? ['single_mechanical_eye', normalized]
      : /^amber_(?:left|right)_eye$/.test(normalized)
        ? ['yellow_eyes', normalized]
        : [KNOWN_DANBOORU_CORRECTIONS[normalized] || normalized]
    for (const concept of concepts) {
      if (!seen.has(concept)) { seen.add(concept); output.push(concept); validConcepts.add(concept) }
    }
  }
  if (validConcepts.size < 3) {
    throw new Error('Booru Tag Mode needs at least three separate valid visual tags; prose-shaped or invalid fragments were ignored.')
  }
  return output.join(', ')
}
