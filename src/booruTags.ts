import { visualDescriptionEvidence } from './illustrationSceneContract'

/** Prefer Booru spelling, but tolerate image-only natural language and custom
 * compounds. Format mistakes must not discard a scene or fail an illustration.
 * Never manufacture tags by replacing the spaces in a sentence with underscores.
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
      else result.at(-1)?.push(tag.toLocaleLowerCase().replace(/\s+/g, '_'))
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

function isNonVisualControlFragment(value: string): boolean {
  return /[<>{}\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)
    || /^(?:(?:please\s+)?(?:ignore|disregard|override)\b|(?:system|developer|assistant|user)\s*:|(?:return|output)\s+(?:only\s+)?(?:json|xml|html)\b|(?:prompt|instruction)s?\s*:)/i.test(value)
}

const BOORU_HUMAN_COUNT_TAG = /^(\d{1,2})(girls?|women|woman|boys?|men|man|others?|people|persons?)$/i
const booruCountFamily = (kind: string): 'female' | 'male' | 'other' | 'total' =>
  /^(?:girl|woman|women)/i.test(kind) ? 'female' : /^(?:boy|man|men)/i.test(kind) ? 'male' : /^other/i.test(kind) ? 'other' : 'total'

function completeBooruHumanOwners(tags: string[]) {
  const firstOwner = tags.findIndex(isBooruSubjectMarker)
  if (firstOwner < 0) return undefined
  const owners = { female: 0, male: 0, other: 0, total: 0 }
  let hasContent = false
  for (const tag of tags.slice(firstOwner)) {
    if (isBooruSubjectMarker(tag)) {
      if (owners.total && !hasContent) return undefined
      if (/animal/i.test(tag)) return undefined
      owners[booruCountFamily(tag.slice(1))]++
      owners.total++
      hasContent = false
    } else {
      if (BOORU_HUMAN_COUNT_TAG.test(tag)) return undefined
      if (!isNonVisualControlFragment(tag)) hasContent = true
    }
  }
  return owners.total >= 2 && hasContent ? owners : undefined
}

/** Remove only a redundant gender aggregate contradicted by a complete set of
 * explicit human owner blocks of the same total size. Partial/flat/animal casts
 * and counts inside owner blocks remain ambiguous and must stay untouched.
 * Never invent a marker, infer gender or rewrite an owner's visual content. */
function withoutContradictoryOwnerCount(tags: string[]): string[] {
  const firstOwner = tags.findIndex(isBooruSubjectMarker)
  if (firstOwner <= 0) return tags
  const owners = completeBooruHumanOwners(tags)
  if (!owners) return tags
  const aggregate = { female: 0, male: 0, other: 0, total: 0 }
  for (const tag of tags.slice(0, firstOwner)) {
    const match = BOORU_HUMAN_COUNT_TAG.exec(tag)
    if (match) {
      const key = booruCountFamily(match[2])
      aggregate[key] = Math.max(aggregate[key], Number(match[1]))
    }
  }
  if (Math.max(aggregate.total, aggregate.female + aggregate.male + aggregate.other) !== owners.total) return tags
  return tags.filter((tag, index) => {
    if (index >= firstOwner) return true
    const match = BOORU_HUMAN_COUNT_TAG.exec(tag)
    if (!match) return true
    const key = booruCountFamily(match[2])
    return key === 'total' || Number(match[1]) === owners[key]
  })
}

/** Read only explicit count tags. Repeated per-subject 1girl/1boy tags must not
 * double-count a global count; mixed gender counts do add up. Unknown counts
 * stay unknown rather than inferring people from incidental prose or names.
 */
export function declaredBooruPeopleCount(value: string): number {
  let female = 0, male = 0, other = 0, total = 0
  const tags = withoutContradictoryOwnerCount(value.split(',').map(tag => tag.trim().toLocaleLowerCase()).filter(Boolean))
  for (const tag of tags) {
    const match = /^(\d{1,2})(girls?|women|woman|boys?|men|man|others?|people|persons?)$/.exec(tag)
    if (!match) continue
    const count = Number(match[1])
    if (/^(?:girl|woman|women)/.test(match[2])) female = Math.max(female, count)
    else if (/^(?:boy|man|men)/.test(match[2])) male = Math.max(male, count)
    else if (/^other/.test(match[2])) other = Math.max(other, count)
    else total = Math.max(total, count)
  }
  return Math.max(total, female + male + other, completeBooruHumanOwners(tags)?.total || 0)
}

export function normalizeBooruTagPrompt(value: unknown): string {
  const input = typeof value === 'string' ? visualDescriptionEvidence(value).trim() : ''
  if (!input) throw new Error('Booru Tag Mode needs a non-empty list of visual tags.')
  const tags = withoutContradictoryOwnerCount(input.split(',').map(tag => tag.trim().replace(/\s+/g, ' ')).filter(Boolean))
  const seen = new Set<string>()
  const output: string[] = []
  for (const tag of tags) {
    if (isBooruSubjectMarker(tag)) seen.clear()
    if (isNonVisualControlFragment(tag)) continue
    // Do not police a vocabulary we do not have. Long compounds, possessives,
    // punctuation and visual sentences are provider content, not schema errors.
    const normalized = (/\s/.test(tag) ? tag : tag.toLocaleLowerCase()).replace(/’/g, "'")
    // Canonicalize only verified, high-confidence tag corrections. A syntactically
    // valid custom side qualifier may stay, but it cannot replace the known
    // visual concept it qualifies.
    const concepts = /^(?:cybernetic|mechanical)_(?:left|right)_eye$/.test(normalized)
      ? ['single_mechanical_eye', normalized]
      : /^amber_(?:left|right)_eye$/.test(normalized)
        ? ['yellow_eyes', normalized]
        : [KNOWN_DANBOORU_CORRECTIONS[normalized] || normalized]
    for (const concept of concepts) {
      const key = concept.toLocaleLowerCase().replace(/\s+/g, '_')
      if (!seen.has(key)) { seen.add(key); output.push(concept) }
    }
  }
  if (!output.length) {
    throw new Error('This image prompt has no usable visual content after removing markup or non-visual control instructions. Reparse the request to rebuild its image description.')
  }
  return output.join(', ')
}
