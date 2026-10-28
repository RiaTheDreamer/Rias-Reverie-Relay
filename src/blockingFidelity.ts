/** Experimental framing contract, shared by authoring, Director and Composer.
 * No model-specific token syntax or sampler changes: Anima also accepts prose.
 */
export const BLOCKING_FIDELITY_GUIDANCE = `BLOCKING FIDELITY — EXPERIMENTAL, ONE MOMENT / ONE OWNER BLOCK PER SUBJECT

Prioritize source-faithful body placement and attribute ownership over a dramatic crop. Select one concrete instant in the anchored paragraph. Resolve the exact visible cast, one viewing axis, screen/depth positions, body postures and established contacts before describing appearances. Do not depict successive actions at once. Current source actions override an earlier frame's posture; confirmed current clothing overrides baseline attire.

For Natural Language, write complete sentences with one consecutive paragraph per visible subject. Start each subject paragraph with a short screen/depth heading such as 'Screen-left, Name:' or 'Foreground, Name:', immediately followed by their own established visual identity, complete current attire, posture, action, expression and gaze. These headings describe positions within ONE scene, not separate panels. Finish that person's block before describing the next. Follow established screen-left to screen-right order when readable; for overlapping foreground/behind arrangements use depth roles instead of pretending they stand side by side. Say screen-left or screen-right, not 'left of the image' or 'right of the image'. Do not emit panels, numbered subjects, BREAK, region syntax or underscore-joined prose. Ordinary story names are not trained image identities: always include the owner's supported visual referent. Do not change hair, colors, garments or body traits to manufacture contrast.

Keep each active arm attached to its owner's shoulder and identify whose hand contacts which person's body part or object. State anatomical left/right only when the source does. Preserve free hands, separate props, posture differences and source-established gaps. For contact or overlap, retain separate heads, necks, shoulder lines and torsos in the same arrangement; make the contact point readable with a suitable view, not by separating a hug, inventing an extra arm or changing who sits and who stands. Show only anatomy the chosen view can reveal; a hidden limb is not another visible limb. Never promise all limbs visible through an occluding body.

After all owner blocks, add shared setting, important objects, light and view once. Choose framing that includes the source-required contact surfaces and props: a waist-up crop cannot establish feet on the floor or palms on thighs. Match the active aspect policy throughout the description: a landscape canvas is not two portrait crops placed side by side. Pull the single camera back to include the required height rather than request a conflicting portrait orientation or duplicate the people to fill the width. Keep the image description concrete and concise, not an explanation of these rules. Reverse-check every action and garment against its owner in the source; a seated man and standing woman must not become a standing man and seated woman. Omit unstated details rather than fill an ownership map with guesses.

In Booru Tag Mode use comma-separated visual tags and compact visual relation phrases, not narrative paragraphs or invented region tokens. Start each owner's consecutive group with their singular subject marker, followed immediately by only their own identity, current attire, posture/action and supported placement. Keep repeated markers when they belong to different people. A familiar tag must not erase a source-stated side, owner, target or free hand: 'holding_cup' alone cannot replace 'holding a cup in his right hand, left hand empty at his side'. When no familiar tag preserves the complete relationship, keep a short literal visual phrase inside that owner's group; do not drop the relationship or invent an underscore-joined sentence to make it look like a catalog tag. For contact, identify the target by its established visual referent, such as 'left palm on the seated person's left shoulder', instead of an ambiguous 'hands_on_shoulders'. Only use anatomical sides and details actually stated in the source. Put shared setting/view tags after all owner groups. Reverse-check that every source-required hand surface and prop owner survived the tag conversion. Flat tags provide weaker actor binding than Natural Language; do not claim regional control or guaranteed anatomy.`

export const BLOCKING_FIDELITY_DIRECTOR_GUIDANCE = `BLOCKING FIDELITY DIRECTOR FIELDS: Use the existing schema only. promptCore must be the complete one-instant visual description with consecutive owner paragraphs, not an extra summary of the same people. Use the literal heading 'Foreground, Name:', 'Behind, Name:', 'Screen-left, Name:' or 'Screen-right, Name:' followed by that owner's complete sentences. Match each owner paragraph to that subjectDirective's blocking, pose, action, contact and attire. Keep each directive field atomic: pose is the posture, contact is the owned hand and target, not another copy of the entire paragraph. Copy each pose/action/contact clause verbatim exactly once into its owner's paragraph, not a synonym-based retelling; when action already expresses the complete contact, leave contact empty. Keep namedSubjects and subjectDirectives in that same screen/depth order. composition.blocking describes only the shared arrangement, not a second retelling of each gesture. Frame from above the highest person's head to below the lowest source-required contact point with margin; if feet on the floor matter, a knees-up crop is not valid. Shared environment facts go after the owner paragraphs. Do not invent fields or replace the anchored event to make the pose easier. A targeted repair must still preserve every field outside its permitted scope.`

/** Resolve the stock tag protocol's vocabulary-only fallback without rewriting
 * saved protocols or converting other framing modes to hybrid prompting. */
export const BLOCKING_FIDELITY_BOORU_FORMAT_GUIDANCE = `BLOCKING FIDELITY ACTIVE FORMAT — BOORU: The image-only visual_prompt and provider tag arrays must remain comma-separated visual items, not Natural Language paragraphs or owner headings. Use familiar tags plus compact literal visual relation items in each owner's group. In this framing, preserve source-required sides, contact targets and free hands even when generic tag guidance would omit an unexpressible nuance. This is not permission to copy narrative prose, dialogue or instructions. Natural Language owner paragraphs describe the other output format and the Director's prose planning fields only. Keep the Director JSON schema and targeted-repair field scope unchanged.`

/** The image policy is enforced after planning too; tell the Director before it
 * drafts a portrait-only scene that the provider must put on a wide canvas. */
export function blockingFidelityAspectGuidance(aspect: string): string {
  if (!/^(?:1:1|2:3|3:2|3:4|4:3|4:5|5:4|9:16|16:9)$/.test(aspect)) return ''
  const [width, height] = aspect.split(':').map(Number)
  const orientation = width > height ? 'landscape' : width < height ? 'portrait' : 'square'
  return `BLOCKING FIDELITY CANVAS: The fixed output policy is ${aspect}, one ${orientation} canvas. Set every illustration's aspectRatio to ${aspect}; promptCore and composition.framing must describe that same ${orientation} frame. Fit the source-required people and contact points by changing camera distance, not by requesting another orientation, duplicating figures, splitting the canvas or changing the action. This does not authorize changing fields outside a targeted repair's permitted scope.`
}

/** Preserve deliberate owner paragraph boundaries, not arbitrary indentation. */
export function blockingFidelityProse(value: unknown): string {
  return typeof value === 'string' ? value.split(/\r?\n\s*\r?\n/).map(row => row.trim().replace(/\s+/g, ' ')).filter(Boolean).join('\n\n') : ''
}

/** Readable boundary for stored visual tags, not a rewrite of authored prose. */
export function blockingFidelityDetail(value: string): string {
  return value.replace(/_/g, ' ').replace(/\s+/g, ' ').trim()
}

/** Bounded duplicate detection inside ONE established owner paragraph. This is
 * deliberately not the scene validator: sides, owners, targets and negations
 * remain literal. Do not use token bags or fuzzy similarity to erase facts. */
export function blockingFidelityDetailPresent(paragraph: string, detail: string): boolean {
  const normalize = (value: string) => blockingFidelityDetail(value).toLocaleLowerCase()
    .replace(/[-–]/g, ' ')
    .replace(/\b(?:sits|sitting)\b/g, 'sit')
    .replace(/\b(?:stands|standing)\b/g, 'stand')
    .replace(/\b(?:rests|resting)\b/g, 'rest')
    .replace(/\b(?:gazes|gazing)\b/g, 'gaze')
    // Equivalent contact word order used by the Director, without dropping
    // the possessive, anatomical side, body part, preposition or target.
    .replace(/\b((?:his|her|their) (?:left |right )?(?:palm|hand)) rest on\b/g, 'rest $1 on')
  const required = normalize(detail)
  if (!required) return true
  const escaped = required.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const phrase = new RegExp(`(?:^|[^\\p{L}\\p{N}])${escaped}(?=$|[^\\p{L}\\p{N}])`, 'u')
  return normalize(paragraph).split(/[.;\n]+/).some(sentence => {
    const negative = (value: string) => /\b(?:not|never|without|no|cannot|can't|doesn't|isn't)\b/.test(value)
    return negative(sentence) === negative(required) && phrase.test(sentence)
  })
}

/** Restore whitespace only when the complete authored description survived
 * unchanged. Never reinsert words a parser/safety shaper removed or altered. */
export function restoreBlockingFidelityParagraphs(prompt: string, authored: string): string {
  const paragraphs = blockingFidelityProse(authored)
  if (!paragraphs.includes('\n\n')) return prompt
  const flat = paragraphs.replace(/\s+/g, ' ')
  const index = prompt.indexOf(flat)
  if (index < 0 || prompt.indexOf(flat, index + flat.length) >= 0) return prompt
  return prompt.slice(0, index) + paragraphs + prompt.slice(index + flat.length)
}
