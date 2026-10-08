/** Shared source-side checks, not an NLP oracle or an image-quality verdict.
 * Unknown verbs/owners stay unknown. Never manufacture a tool, actor or outfit.
 */
export type SceneContractActor = { name: string; identity: string[]; current: string[]; action: string; contact: string }
export type IllustrationSceneContract = {
  version: 'scene-contract-1'
  sourceParagraph: string
  anchorExcerpt: string
  actors: SceneContractActor[]
  centralAction: string
  centralActor: string
  idleTools: string[]
}
export type SceneContractIssue = { code: string; message: string; repair: 'local' | 'ambiguous' }

const normalize = (value: string) => value.replace(/_/g, ' ').toLocaleLowerCase().replace(/\s+/g, ' ').trim()
const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const ACTIONS = [
  { id: 'fold', source: /\b(?:fold(?:s|ed|ing)?|creas(?:e|es|ed|ing))\b/g, tags: ['folding', 'folding_paper', 'folding_clothes', 'creasing'], natural: /\b(?:fold(?:s|ed|ing)?|creas(?:e|es|ed|ing))\b/ },
  { id: 'write', source: /\b(?:writ(?:e|es|ing)|wrote|written)\b/g, tags: ['writing'], natural: /\b(?:writ(?:e|es|ing)|wrote|written)\b/ },
  // Storyboard prompts often preserve the same drawing action as "sketch".
  // Treating that ordinary paraphrase as a missing action caused valid later
  // illustrations in a response to be blocked by the strict scene gate.
  { id: 'draw', source: /\b(?:draw(?:s|ing)?|drew|drawn|sketch(?:es|ed|ing)?)\b/g, tags: ['drawing', 'sketching'], natural: /\b(?:draw(?:s|ing)?|drew|drawn|sketch(?:es|ed|ing)?)\b/ },
  { id: 'lift', source: /\b(?:lift(?:s|ed|ing)?|rais(?:e|es|ed|ing))\b/g, tags: ['lifting', 'raising'], natural: /\b(?:lift(?:s|ed|ing)?|rais(?:e|es|ed|ing))\b/ },
] as const
const TOOLS = ['pencil', 'pen', 'marker', 'brush', 'hammer', 'screwdriver', 'saw']
type FoldPose = 'arms' | 'hands'
const FOLD_POSE_EQUIVALENTS = {
  arms: /\b(?:cross(?:es|ed|ing)?\s+(?:(?:his|her|their|the|both|my|your)\s+)?arms|arms\s+(?:(?:are|were|is|was)\s+)?crossed)\b/g,
  hands: /\b(?:clasp(?:s|ed|ing)?\s+(?:(?:his|her|their|the|both|my|your)\s+)?hands|hands\s+(?:(?:are|were|is|was)\s+)?clasped)\b/g,
}
const FOLD_POSE_TAGS = { arms: ['crossed_arms', 'arm_cross'], hands: ['clasped_hands', 'hands_clasped'] }

// A lifted hand can be depicted as the resulting held-up pose. Do not treat
// generic holding (a bag, cup, another actor's hands) as equivalent to lifting.
function anchoredLiftBodyPart(source: string): 'hands' | 'arms' | undefined {
  const prose=normalize(source.replace(/"[^"\n]*"|“[^”\n]*”/g,''))
  const direct=/\b(?:lift(?:s|ed|ing)?|rais(?:e|es|ed|ing))\s+(?:(?:his|her|their|the|both|my|your|right|left|own|two)\s+){0,4}(hands?|palms?|arms?)\b/.exec(prose)
  if(direct)return direct[1].startsWith('arm')?'arms':'hands'
  if(/\bhands?\b[^.!?]{0,180}\blift(?:s|ed|ing)?\s+them\b/.test(prose))return 'hands'
}
function assertedLiftPosePhrases(value: string, part: 'hands' | 'arms' | undefined): string[] {
  if(!part)return []
  const prose=normalize(value.replace(/"[^"\n]*"|“[^”\n]*”/g,''))
  const noun=part==='hands'?'(?:hands?|palms?)':'arms?'
  const pattern=new RegExp(`\\b${noun}\\s+(?:(?:are|is|were|was|both|open)\\s+){0,3}(?:held|cradled|supported|resting)\\s+(?:(?:up|together|gently)\\s+)?(?:in front of|before|between|against|at)\\s+(?:(?:his|her|their|the|my|your|both)\\s+)?(?:him|her|them|me|you|chests?|collarbones?|shoulders?|face|body)\\b`,'g')
  return [...prose.matchAll(pattern)].filter(match=>!unassertedPrefix(prose,match.index!)).map(match=>match[0])
}
function unassertedPrefix(prose: string, index: number): boolean {
  const prefix=prose.slice(Math.max(0,index-65),index)
  return /\b(?:not|never|without|no|will|would|could|should|might|may|can|must|to)(?:\s+[\w'-]+){0,3}\s*$/.test(prefix)
}
function competingLiftInstant(source: string): boolean {
  const prose=normalize(source.replace(/"[^"\n]*"|“[^”\n]*”/g,''))
  // These actions select another visible instant in the same paragraph. They
  // are ambiguity evidence only, not new action families enforced by this gate.
  return [...prose.matchAll(/\b(?:carr(?:ies|ied|ying)|kiss(?:es|ed|ing)?|press(?:es|ed|ing)?)\b/g)]
    .some(match=>!unassertedPrefix(prose,match.index!)&&!/\b(?:a|an|the|his|her|their)\s*$/.test(prose.slice(Math.max(0,match.index!-30),match.index)))
}

function anchoredFoldPose(source: string): FoldPose | undefined {
  const prose = normalize(source.replace(/"[^"\n]*"|“[^”\n]*”/g, ''))
  const match = /\bfold(?:s|ed|ing)?\s+(?:(?:his|her|their|the|both|my|your)\s+)?(arms|hands)\b/.exec(prose)
  return match?.[1] as FoldPose | undefined
}

function assertedFoldPosePhrases(value: string, pose: FoldPose | undefined): string[] {
  if (!pose) return []
  const prose = normalize(value.replace(/"[^"\n]*"|“[^”\n]*”/g, ''))
  return [...prose.matchAll(new RegExp(FOLD_POSE_EQUIVALENTS[pose]))].filter(match => {
    const prefix = prose.slice(Math.max(0, match.index! - 65), match.index)
    return !/\b(?:not|never|without|no|will|would|could|should|might|may|can|must|to)(?:\s+[\w'-]+){0,3}\s*$/.test(prefix)
  }).map(match => match[0])
}

/** A scene-action-only tag repair must retain all valid non-action tags. This
 * allowlist is a patch boundary, not a claim to validate a Booru vocabulary.
 */
export function sceneActionTagRepairPreservesFacts(original: string[] = [], repaired: string[] = []): boolean {
  const editable = new Set<string>([...ACTIONS.flatMap(action => [...action.tags]), 'holding_pen', 'holding_pencil', 'holding_marker'])
  const fixed = (tags: string[]) => [...new Set(tags.map(tag => tag.trim().toLocaleLowerCase()).filter(tag => !editable.has(tag)))].sort()
  return JSON.stringify(fixed(original)) === JSON.stringify(fixed(repaired))
}

function assertedActions(value: string): string[] {
  // Dialogue, explicit negation and hypothetical actions are not evidence.
  const prose = normalize(value.replace(/"[^"\n]*"|“[^”\n]*”/g, ''))
  const actions = new Set<string>()
  for (const family of ACTIONS) for (const match of prose.matchAll(new RegExp(family.source))) {
    const prefix = prose.slice(Math.max(0, match.index! - 65), match.index)
    if (/\b(?:not|never|without|no|will|would|could|should|might|may|can|must|to)(?:\s+[\w'-]+){0,3}\s*$/.test(prefix)) continue
    // "the folded paper" / "a drawing" are objects, not asserted actions.
    if (/\b(?:a|an|the|this|that|its|his|her|their|our|my|your)\s*$/.test(prefix)) continue
    if (family.id === 'draw' && match[0].toLocaleLowerCase() === 'sketches'
      && (/\b(?:some|several|few|many|multiple|various|numerous|one|two|three|four|five|six)(?:\s+[\w'-]+){0,2}\s*$/.test(prefix)
        || /\b(?:set|group|series|stack|pile)\s+of\s*$/.test(prefix)
        || /^\s+of\b/.test(prose.slice(match.index! + match[0].length)))) continue
    // "a wooden folding chair" is still furniture, not a folding action.
    if (family.id === 'fold' && match[0] === 'folding'
      && /^\s+(?:chair|table|screen|knife|fan|bed|door|ladder)s?\b/.test(prose.slice(match.index! + match[0].length))) continue
    // "holding a neatly folded letter" describes an already-folded object.
    if (family.id === 'fold' && /^(?:folded|creased)$/.test(match[0])
      && /\b(?:holding|holds|held|carrying|carries|carried|with)\s+(?:(?:a|an|the|his|her|their)\s+)?(?:[\w'-]+\s+){0,3}$/.test(prefix)) continue
    // Drawing an edge toward oneself is movement, not making a drawing.
    if (family.id === 'draw' && /\b(?:upward|towards?|closer|nearer|back|aside|breath)\b/.test(prose.slice(match.index! + match[0].length, match.index! + match[0].length + 65))) continue
    // "along the crease" names geometry, not the act of creasing.
    if (/^(?:crease|fold)(?:s)?$/.test(match[0]) && /\b(?:the|a|its|along|of|at)(?:\s+[\w'-]+){0,2}\s*$/.test(prefix)) continue
    // "soft folds around her waist" describes fabric, not someone folding it.
    // Require a noun modifier too: "folds in the corners" can be a real verb.
    if (family.id === 'fold' && /^(?:fold|crease)s?$/.test(match[0])
      && /\b(?:in|into|with|soft|deep|sharp|loose|gentle|natural|silken|fabric|cloth|silk|[\w]+['’]s)\s*$/.test(prefix)
      && /^\s+(?:of|in|around|at|along|on|under|beneath|between|across|down|over)\b/.test(prose.slice(match.index! + match[0].length))) continue
    actions.add(family.id)
  }
  return [...actions]
}

function explicitlyIdleTools(source: string): string[] {
  const prose = normalize(source.replace(/"[^"\n]*"|“[^”\n]*”/g, ''))
  return TOOLS.filter(tool => {
    const noun = `\\b${escape(tool)}\\b`
    const idle = new RegExp(`${noun}[^.;!?]{0,65}\\b(?:resting|rests|lying|lies|unused|untouched|set aside|laid aside)\\b|\\b(?:laid|placed|put|set)\\b[^.;!?]{0,45}${noun}[^.;!?]{0,30}\\b(?:down|aside)\\b|\\b(?:laid|placed|put|set)\\b[^.;!?]{0,45}${noun}[^.;!?]{0,35}\\b(?:into|in)\\b[^.;!?]{0,35}\\b(?:groove|grooved table edge|holder|pencil case)\\b`).test(prose)
    if (!idle) return false
    // Another actor or another instant may genuinely use this tool. In that
    // case its role is ambiguous; do not remove it from a whole scene.
    const used = new RegExp(`\\b(?:using|uses|used|holding|holds|held|grips|gripping|with)\\s+(?:(?:a|an|the|his|her|their|one|black|red|blue|silver)\\s+){0,3}${noun}`).test(prose)
    return !used
  })
}

export function buildIllustrationSceneContract(input: {
  sourceParagraph: string; anchorExcerpt?: string; actors?: SceneContractActor[]
}): IllustrationSceneContract {
  const sourceParagraph = input.sourceParagraph.trim()
  const excerpt = input.anchorExcerpt?.trim() || ''
  const anchorExcerpt = excerpt && normalize(sourceParagraph).includes(normalize(excerpt)) ? excerpt : ''
  const candidates = assertedActions(anchorExcerpt || sourceParagraph)
  const actionSource = normalize((anchorExcerpt || sourceParagraph).replace(/"[^"\n]*"|“[^”\n]*”/g, ''))
  // A paragraph can explicitly move to a later instant even when its next verb
  // is outside our small action vocabulary. Do not lock that paragraph to the
  // earlier recognized action; a precise validated excerpt may still select it.
  const sequentialInstant = [...actionSource.matchAll(/\b(?:then|afterwards?|subsequently)\s+(?:(?:he|she|they)\s+)?(?:steps?|stepped|offers?|offered|turns?|turned|walks?|walked|gives?|gave|releases?|released|sits?|sat|stands?|stood|takes?|took|kisses?|kissed|presses?|pressed|reaches?|reached)\b|\b(?:before|after)\s+(?:walking|stepping|offering|turning|giving|releasing|sitting|standing|taking|kissing|pressing|reaching)\b/g)]
    .some(match => assertedActions(actionSource.slice(0, match.index!)).length > 0 && !unassertedPrefix(actionSource, match.index!))
  // Several actions may be sequential or simultaneous. A word matcher cannot
  // decide which instant the author meant, so leave the action unproven.
  const centralAction = candidates.length === 1 && !sequentialInstant && !(candidates[0]==='lift'&&competingLiftInstant(anchorExcerpt||sourceParagraph)) ? candidates[0] : ''
  const actors = input.actors || []
  const family = ACTIONS.find(row => row.id === centralAction)
  // Only a directly named, asserted actor/action is machine-provable. Do not
  // assign pronouns, passive targets, joint subjects or proximity-based owners.
  const ownerSource = normalize((anchorExcerpt || sourceParagraph).replace(/"[^"\n]*"|“[^”\n]*”/g, ''))
  const namedOwners = family ? actors.filter(actor => {
    const pattern = new RegExp(`(?<![\\p{L}\\p{N}])${escape(normalize(actor.name))}\\s+(?:(?:is|was)\\s+)?${family.source.source}`, 'gu')
    return [...ownerSource.matchAll(pattern)].some(match => !/(?:\band|&|,)\s*$/.test(ownerSource.slice(Math.max(0, match.index! - 25), match.index)))
  }) : []
  const centralActor = namedOwners.length === 1 ? namedOwners[0].name : ''
  return { version: 'scene-contract-1', sourceParagraph, anchorExcerpt, actors, centralAction, centralActor, idleTools: explicitlyIdleTools(sourceParagraph) }
}

export function enforceIllustrationSceneContract(
  prompt: string, format: 'natural-language' | 'danbooru-tags', contract: IllustrationSceneContract,
): { prompt: string; issues: SceneContractIssue[] } {
  const issues: SceneContractIssue[] = []
  const family = ACTIONS.find(row => row.id === contract.centralAction)
  const foldPose = family?.id === 'fold' ? anchoredFoldPose(contract.anchorExcerpt || contract.sourceParagraph) : undefined
  const liftPose = family?.id === 'lift' ? anchoredLiftBodyPart(contract.anchorExcerpt || contract.sourceParagraph) : undefined
  if (format === 'danbooru-tags') {
    const original = prompt.split(',').map(tag => tag.trim()).filter(Boolean)
    const tools = new Set(contract.idleTools)
    const tags = original.filter(tag => !tools.has(normalize(tag)))
    const removed = original.filter(tag => !tags.includes(tag))
    if (removed.length) issues.push({ code: 'scene-idle-tool-omitted', message: `Omitted bare tag(s) ${removed.join(', ')}: the anchor explicitly puts these tools aside. Their inactive role cannot be expressed by a bare object tag.`, repair: 'local' })
    // An action-bearing tag is not replaceable by generic standing/looking.
    // Do not synthesize a tag for a nuanced action or silently rewrite one.
    const actionTags: readonly string[] = foldPose ? [...family!.tags, ...FOLD_POSE_TAGS[foldPose]] : liftPose ? [...family!.tags,...(liftPose==='hands'?['raised_hands','hands_up']:['raised_arms','arms_up'])] : family?.tags || []
    if (family && !tags.some(tag => actionTags.includes(tag.toLocaleLowerCase()))) issues.push({ code: 'scene-action-missing', message: `The anchored ${family.id} action is missing from the provider tags. Repair the action tags only; keep the same actors, outfits, anchor and instant.`, repair: 'ambiguous' })
    if (contract.centralAction === 'fold' && contract.idleTools.some(tool => /^(?:pen|pencil|marker)$/.test(tool))
      && tags.some(tag => /^(?:writing|drawing|holding_pen|holding_pencil|holding_marker)$/.test(tag))) {
      issues.push({ code: 'scene-idle-tool-used', message: 'The tags depict use of a writing tool which the paper-folding anchor explicitly puts aside. Remove the conflicting activity, not the anchored fold.', repair: 'ambiguous' })
    }
    return { prompt: tags.join(', '), issues }
  }
  if (!family) return { prompt, issues }
  const depictedActions = assertedActions(prompt)
  const equivalentPosePhrases = [...assertedFoldPosePhrases(prompt, foldPose),...assertedLiftPosePhrases(prompt,liftPose)]
  if (!depictedActions.includes(family.id) && !equivalentPosePhrases.length) issues.push({ code: 'scene-action-missing', message: `The anchored ${family.id} action is absent from the visual description. Preserve its actor, contact and target rather than replacing it with appearance or mood.`, repair: 'ambiguous' })
  else if (contract.centralActor) {
    const verbs = [...normalize(prompt).matchAll(new RegExp(family.source))].map(match => match[0]).concat(equivalentPosePhrases)
    const actorNames = contract.actors.map(actor => actor.name)
    const explicitOwners = actorNames.filter(name => verbs.some(verb => ownedSceneRequirementPresent(prompt, name, verb, actorNames)))
    // A pronoun or unnamed action is not proof of a transfer. Only flag a
    // provable mismatch; otherwise leave ownership unresolved for review.
    if (explicitOwners.length && !explicitOwners.includes(contract.centralActor)) {
      issues.push({ code: 'scene-action-owner', message: `The anchor explicitly assigns the ${family.id} action to ${contract.centralActor}, but that actor's clause does not preserve it. Keep the same action owner; do not transfer it to another actor.`, repair: 'ambiguous' })
    }
  }
  if (contract.centralAction === 'fold' && contract.idleTools.some(tool => /^(?:pen|pencil|marker)$/.test(tool))
    && depictedActions.some(action => action === 'write' || action === 'draw')) issues.push({ code: 'scene-idle-tool-used', message: 'The visual description substitutes writing/drawing for the anchor’s fold despite its explicitly idle writing tool.', repair: 'ambiguous' })
  return { prompt, issues }
}

/** A name somewhere in promptCore is not evidence that its owned requirement
 * survived. Check within that actor's clause, stopping at another actor.
 */
export function ownedSceneRequirementPresent(prompt: string, owner: string, requirement: string, actorNames: string[]): boolean {
  if (!requirement.trim()) return true
  const value = normalize(prompt)
  const ownerPattern = new RegExp(`(?<![\\p{L}\\p{N}])${escape(normalize(owner))}(?![\\p{L}\\p{N}])`, 'gu')
  const others = actorNames.filter(name => normalize(name) !== normalize(owner))
  for (const match of value.matchAll(ownerPattern)) {
    let end = value.indexOf('.', match.index!)
    if (end < 0) end = value.length
    for (const other of others) {
      const next = new RegExp(`(?<![\\p{L}\\p{N}])${escape(normalize(other))}(?![\\p{L}\\p{N}])`, 'u').exec(value.slice(match.index! + match[0].length, end))
      if (next) end = Math.min(end, match.index! + match[0].length + next.index)
    }
    if (value.slice(match.index!, end).includes(normalize(requirement))) return true
  }
  return false
}
