/** Normalize Danbooru-style visual tags without laundering prose into tags.
 * Mixed output may shed malformed prose fragments, but needs three useful tags
 * to pass; a sentence alone still requires the model to choose real concepts.
 */
const KNOWN_DANBOORU_CORRECTIONS: Record<string, string> = {
  amber_eyes: 'yellow_eyes',
  cybernetic_eye: 'single_mechanical_eye',
  mechanical_eye: 'single_mechanical_eye',
  wolfcut: 'wolf_cut',
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
  const input = typeof value === 'string' ? value.trim() : ''
  if (!input) throw new Error('Booru Tag Mode needs a non-empty list of visual tags.')
  const tags = input.split(',').map(tag => tag.trim()).filter(Boolean)
  const seen = new Set<string>()
  const output: string[] = []
  for (const tag of tags) {
    if (!/^[a-z0-9][a-z0-9_()+\-]*$/i.test(tag) || /__|_$/.test(tag)) {
      // Models occasionally append a prose clause to an otherwise valid tag
      // list. Ignore that fragment; the minimum usable-tag check below still
      // rejects prompts that are mostly prose or malformed content.
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
      if (!seen.has(concept)) { seen.add(concept); output.push(concept) }
    }
  }
  if (output.length < 3) {
    throw new Error('Booru Tag Mode needs at least three separate valid visual tags; prose-shaped or invalid fragments were ignored.')
  }
  return output.join(', ')
}
