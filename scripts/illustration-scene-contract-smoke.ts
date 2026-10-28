// @ts-nocheck -- offline Node assertion harness, consistent with the existing smoke scripts.
import assert from 'node:assert/strict'
import { buildIllustrationSceneContract, enforceIllustrationSceneContract, ownedSceneRequirementPresent } from '../src/illustrationSceneContract'
import { normalizeIllustrationViewWording } from '../src/illustrationViewWording'
import { DEFAULT_ILLUSTRATOR_FRAMING_PROMPTS, STORYBOARD_DIRECTOR_GUIDANCE, STORYBOARD_PARSER_GUIDANCE, STORYBOARD_BOORU_PARSER_GUIDANCE } from '../src/protocols'

assert.match(STORYBOARD_DIRECTOR_GUIDANCE, /negativeCore field empty/, 'Storyboard authoring leaves the required negative field empty without removing configured provider negatives')

for (const [input, expected] of [
  ['Camera: low-angle medium shot. Ria folds paper.', 'View: low-angle medium shot. Ria folds paper.'],
  ['Ria folds paper; Camera angle: eye level.', 'Ria folds paper; View: eye level.'],
  ['Camera perspective is overhead. Ria folds paper.', 'view is overhead. Ria folds paper.'],
  ['Low-angle camera view, Ria folds paper.', 'Low-angle view, Ria folds paper.'],
  ['Eye-level camera. Ria folds paper.', 'Eye-level view. Ria folds paper.'],
  ['Camera: black DSLR. Ria holds the camera.', 'Camera: black DSLR. Ria holds the camera.'],
  ['Ria holds a camera; a CCTV camera is on the wall.', 'Ria holds a camera; a CCTV camera is on the wall.'],
  ['A low-angle camera, mounted on a tripod, records Ria.', 'A low-angle camera, mounted on a tripod, records Ria.'],
  ['Camera: eye-level view. Ria holds a camera.', 'View: eye-level view. Ria holds a camera.'],
]) {
  const fixed = normalizeIllustrationViewWording(input, 'storyboard')
  assert.equal(fixed, expected)
  assert.equal(normalizeIllustrationViewWording(fixed, 'storyboard'), fixed, 'view shaping must be idempotent')
  assert.equal(normalizeIllustrationViewWording(input, 'persona-pov'), input, 'other modes are untouched')
}
assert.equal(normalizeIllustrationViewWording('1girl, Camera angle: from_above, camera, paper', 'storyboard', 'danbooru-tags'), '1girl,from_above, camera, paper', 'already-canonical viewpoint tags survive; a camera object tag remains')
assert.equal(normalizeIllustrationViewWording('Light from an off-camera floor lamp; an actual camera rests on the table.', 'storyboard'), 'Light from an out-of-frame floor lamp; an actual camera rests on the table.', 'crop-relative wording changes, actual equipment remains')
for (const guidance of [DEFAULT_ILLUSTRATOR_FRAMING_PROMPTS.storyboard, STORYBOARD_DIRECTOR_GUIDANCE, STORYBOARD_PARSER_GUIDANCE, STORYBOARD_BOORU_PARSER_GUIDANCE]) assert.match(guidance, /Use "View:" rather than "Camera:"/, 'all Storyboard authoring paths need view wording')
for (const guidance of [DEFAULT_ILLUSTRATOR_FRAMING_PROMPTS.storyboard, STORYBOARD_DIRECTOR_GUIDANCE, STORYBOARD_PARSER_GUIDANCE, STORYBOARD_BOORU_PARSER_GUIDANCE]) {
  assert.match(guidance, /facial expression and gaze target/, 'expressions belong to the individual subject')
  assert.match(guidance, /Current explicit clothing changes override baseline clothing/, 'current wardrobe wins over the preset fallback')
  assert.match(guidance, /physically reflected view/, 'reflections obey the anchored moment and angle')
  assert.match(guidance, /do not add numeric prompt weights/, 'the Storyboard author must not invent weights')
  assert.match(guidance, /Do not invent quality tags/, 'provider/model controls remain configured, not guessed')
  assert(!guidance.includes('{{character_prompt}}') && !guidance.includes('{{persona_prompt}}'), 'do not inject unowned foreign macros')
  assert(guidance.length < 6500, 'the shared prompt must remain smaller than the retired instruction wall')
}

const source = 'Yejin laid the drafting pencil down beside the ruler. She folded the paper beneath both hands. She ran the side of her right hand along the fold, creasing the sheet.'
const actor = { name: 'Yejin', identity: ['black bob'], current: ['grey blazer'], action: 'creasing the sheet', contact: 'right hand along the fold' }
const contract = buildIllustrationSceneContract({ sourceParagraph: source, anchorExcerpt: 'She ran the side of her right hand along the fold, creasing the sheet.', actors: [actor] })
assert.equal(contract.centralAction, 'fold')
assert.deepEqual(contract.idleTools, ['pencil'])
assert.deepEqual(contract.actors, [actor])
const locallyFixed = enforceIllustrationSceneContract('1girl, solo, folding, paper, pencil, ruler, blazer', 'danbooru-tags', contract)
assert.equal(locallyFixed.prompt, '1girl, solo, folding, paper, ruler, blazer')
assert.deepEqual(locallyFixed.issues.map(issue => issue.repair), ['local'])
assert.equal(enforceIllustrationSceneContract(locallyFixed.prompt, 'danbooru-tags', contract).issues.length, 0, 'local shaping must be idempotent')
const wrongTags = enforceIllustrationSceneContract('1girl, writing, paper, holding_pencil, blazer', 'danbooru-tags', contract)
assert.deepEqual(wrongTags.issues.map(issue => issue.code), ['scene-action-missing', 'scene-idle-tool-used'])
assert.equal(wrongTags.prompt, '1girl, writing, paper, holding_pencil, blazer', 'ambiguous action must not be silently reauthored')
assert(enforceIllustrationSceneContract('1girl, folding paper, she writes on the sheet, paper', 'danbooru-tags', contract).issues.some(issue => issue.code === 'scene-idle-tool-used'), 'mixed snippets must retain the idle-tool conflict check')
assert.equal(enforceIllustrationSceneContract('Yejin creases the paper with the side of her right hand. She is not writing.', 'natural-language', contract).issues.length, 0)
assert(enforceIllustrationSceneContract('Yejin writes on the paper, not folding it.', 'natural-language', contract).issues.some(issue => issue.code === 'scene-action-missing'))
assert(enforceIllustrationSceneContract('Yejin folding the paper while writing on it.', 'natural-language', contract).issues.some(issue => issue.code === 'scene-idle-tool-used'))

const drawContract = buildIllustrationSceneContract({
  sourceParagraph: 'Yejin draws the floor plan beside the studio entrance.',
  anchorExcerpt: 'Yejin draws the floor plan beside the studio entrance.',
  actors: [{ name: 'Yejin', identity: [], current: [], action: 'draws the floor plan', contact: 'pencil against paper' }],
})
assert.equal(drawContract.centralAction, 'draw')
assert.equal(enforceIllustrationSceneContract('Yejin sketches the floor plan beside the studio entrance.', 'natural-language', drawContract).issues.length, 0, 'a clear sketching paraphrase preserves the anchored draw action')
assert.equal(enforceIllustrationSceneContract('Yejin is sketching the floor plan beside the studio entrance.', 'natural-language', drawContract).issues.length, 0, 'progressive sketching preserves the anchored draw action')
for (const [opening, closing] of [['"', '"'], ['“', '”']]) {
  const quoted = `${opening}Yejin sketches the floor plan beside the studio entrance.${closing}`
  const checked = enforceIllustrationSceneContract(quoted, 'natural-language', drawContract)
  assert.equal(checked.issues.length, 0, 'a quoted visual description is not story dialogue and must retain its action evidence')
  assert.equal(checked.prompt, quoted, 'checking quote wrappers must not rewrite authored prompt text')
  assert(enforceIllustrationSceneContract(`${opening}Yejin waits beside the studio entrance.${closing}`, 'natural-language', drawContract).issues.some(issue => issue.code === 'scene-action-missing'), 'quote wrappers must not excuse an actually missing action')
}
assert(enforceIllustrationSceneContract('Yejin says "I sketch the floor plan" while she waits.', 'natural-language', drawContract).issues.some(issue => issue.code === 'scene-action-missing'), 'embedded speech remains unproven visual action')
for (const mixed of ['1girl, solo, Yejin sketches the floor plan, pencil', '1girl, solo, sketching the floor plan, pencil', '1girl, solo, sketching_floor_plan, pencil']) {
  assert.equal(enforceIllustrationSceneContract(mixed, 'danbooru-tags', drawContract).issues.length, 0, 'an action-bearing mixed Booru item must not fail merely because it is not an exact bare tag')
}
assert(enforceIllustrationSceneContract('1girl, solo, not sketching the floor plan, pencil', 'danbooru-tags', drawContract).issues.some(issue => issue.code === 'scene-action-missing'), 'negated mixed snippets are not action evidence')
assert(enforceIllustrationSceneContract('1girl, solo, a drawing of a floor plan, pencil', 'danbooru-tags', drawContract).issues.some(issue => issue.code === 'scene-action-missing'), 'a depicted drawing object does not prove someone drawing')
assert.equal(enforceIllustrationSceneContract('1girl, solo, sketching, floor_plan, pencil', 'danbooru-tags', drawContract).issues.length, 0, 'the Booru action vocabulary also accepts sketching')
assert.equal(enforceIllustrationSceneContract('Yejin waits beside the studio entrance.', 'natural-language', drawContract).issues[0]?.code, 'scene-action-missing', 'appearance or location alone still cannot pass the action gate')

// Reported lift failures: the anchored result pose is not a missing action.
const liftHands=buildIllustrationSceneContract({sourceParagraph:'Ria lifted her hands, staring down into her own palms.',actors:[{...actor,name:'Ria'},{...actor,name:'Cody'}]})
assert.equal(liftHands.centralAction,'lift')
assert.equal(enforceIllustrationSceneContract('Ria studies her open, scarred palms held in front of her. Cody watches.', 'natural-language',liftHands).issues.length,0)
assert.equal(enforceIllustrationSceneContract('1girl, raised_hands, looking_at_hands', 'danbooru-tags',liftHands).issues.length,0)
assert(enforceIllustrationSceneContract('Ria sits with her hands on her knees.', 'natural-language',liftHands).issues.some(issue=>issue.code==='scene-action-missing'))
assert(enforceIllustrationSceneContract('Ria waits. Cody has his palms held in front of him.', 'natural-language',liftHands).issues.some(issue=>issue.code==='scene-action-owner'))
assert(enforceIllustrationSceneContract('Ria does not keep her palms held in front of her.', 'natural-language',liftHands).issues.some(issue=>issue.code==='scene-action-missing'))
const claspLift=buildIllustrationSceneContract({sourceParagraph:'Ria took both of his hands into hers, lifting them between their chests.'})
assert.equal(enforceIllustrationSceneContract('Ria holds both of his hands. His palms are cradled against her chest.', 'natural-language',claspLift).issues.length,0)
const liftedCup=buildIllustrationSceneContract({sourceParagraph:'Ria lifted the cup off the table.'})
assert(enforceIllustrationSceneContract('Ria has her hands held in front of her.', 'natural-language',liftedCup).issues.some(issue=>issue.code==='scene-action-missing'),'hand poses cannot satisfy a lifted object')
const reachingHand = buildIllustrationSceneContract({sourceParagraph:'His hand lifts, crossing the three feet of sterile air between them.'})
assert.equal(enforceIllustrationSceneContract("Joo Won's left hand reaches across the small gap between them, fingers slightly curled, moving toward Arin's arm.", 'natural-language', reachingHand).issues.length, 0, 'the reported horizontal hand lift is accurately depicted by reaching across the gap')
assert(enforceIllustrationSceneContract('Joo Won stands with his hand resting at his side.', 'natural-language', reachingHand).issues.some(issue => issue.code === 'scene-action-missing'))
assert(enforceIllustrationSceneContract('His hand does not reach across the gap.', 'natural-language', reachingHand).issues.some(issue => issue.code === 'scene-action-missing'))
assert.equal(enforceIllustrationSceneContract('1boy, 1girl, reaching_out, indoors', 'danbooru-tags', reachingHand).issues.length, 0)
assert.equal(enforceIllustrationSceneContract('1boy, 1girl, his hand reaches across the gap, indoors', 'danbooru-tags', reachingHand).issues.length, 0)
assert(enforceIllustrationSceneContract('Ria reaches across the gap with her hand.', 'natural-language', liftedCup).issues.some(issue => issue.code === 'scene-action-missing'), 'reaching cannot satisfy an object lift')
for (const [sourceParagraph, prompt] of [
  ['The old man lifts his thermos in a small salute, the gesture of someone who knows precisely what he has done and is entirely unbothered by it.', 'Single subject: Lee Joo Won. He stands mid-step, body locked rigid, holding a script binder at chest height.'],
  ["He walks toward the partition wall with water running off his fringe, past his grandfather's chair without slowing—though Arin sees the old man's hand lift in a small wave, and sees Joo Won see it, and sees his stride not change.", 'Joo Won walks toward the partition wall in falling rain. Behind him, Arin stands under the black umbrella.'],
]) {
  const roleContract = buildIllustrationSceneContract({sourceParagraph})
  const checked = enforceIllustrationSceneContract(prompt, 'natural-language', roleContract)
  assert.deepEqual(checked.issues.map(issue => issue.repair), ['review'], 'an incidental role cannot be forced into a cropped shot by proximity alone')
  assert.equal(checked.prompt, prompt, 'unproven scope must not synthesize an actor/action or relocate the anchor')
  assert.equal(roleContract.sourceParagraph, sourceParagraph)
}
const grandfatherLift = buildIllustrationSceneContract({sourceParagraph:'The old man lifts his thermos in a small salute.'})
const incidentalIdle = buildIllustrationSceneContract({sourceParagraph:'The old man lifts his thermos. The pencil rests unused on the table.'})
const scopedTags = enforceIllustrationSceneContract('1boy, black_hair, standing, pencil', 'danbooru-tags', incidentalIdle)
assert(scopedTags.issues.some(issue => issue.repair === 'review'))
assert(scopedTags.issues.some(issue => issue.code === 'scene-idle-tool-omitted'), 'unproven action scope must not bypass the independent idle-tool filter')
assert(!scopedTags.prompt.split(',').map(tag => tag.trim()).includes('pencil'))
assert(enforceIllustrationSceneContract('The old man sits with his thermos on his knee.', 'natural-language', grandfatherLift).issues.some(issue => issue.code === 'scene-action-missing'), 'the same depicted role still must preserve its own lift')
assert(enforceIllustrationSceneContract('The woman waits beside the paper.', 'natural-language', buildIllustrationSceneContract({sourceParagraph:'The woman folds the paper.'})).issues.some(issue => issue.code === 'scene-action-missing'), 'generic unnamed actors cannot bypass an actual missing action')
assert(enforceIllustrationSceneContract('A crate rests on the floor.', 'natural-language', buildIllustrationSceneContract({sourceParagraph:'The crate lifts from the floor.'})).issues.some(issue => issue.code === 'scene-action-missing'), 'object subjects cannot masquerade as incidental actors')
for(const paragraph of [
 'Ria lifted Cody against her chest, stood from the sofa, and carried him through the doorway.',
 'Ria lifted his right hand off his knee and pressed her lips to the scar.',
 'Ria lifted his right hand and kissed his palm.',
])assert.equal(buildIllustrationSceneContract({sourceParagraph:paragraph}).centralAction,'','a broad multi-action paragraph cannot force the earlier lift instant')
assert.equal(buildIllustrationSceneContract({sourceParagraph:'Ria lifted her hands. She did not kiss them.'}).centralAction,'lift','negated activities cannot erase a proven anchor')
assert.equal(buildIllustrationSceneContract({sourceParagraph:'Ria lifted her hands. "I carried the bag," Cody said.'}).centralAction,'lift','dialogue cannot manufacture a competing instant')

for (const prose of [
  'The folded paper rests beside a drawing.',
  'She would fold the paper later.',
  'She does not fold the paper.',
  'She waits without folding anything.',
  'She says "I am folding the paper."',
  'She points at the crease in the paper.',
  'The new crease stays flat beneath her palms.',
  'The central fold lies beneath the cover.',
  'Her raised collar catches the light.',
  'Her coat hangs in soft folds around her waist.',
  'Deep folds in the curtains catch the light.',
  'Sharp creases on his jacket remain visible.',
  'Sharp creases across his trousers catch the light.',
  'Deep folds down her skirt catch the light.',
  'Gabrielle carries a wooden folding chair toward the wall stack.',
  'Yejin holds a neatly folded letter against her chest.',
  'She examines the paper.',
  'She drew the paper margin upward to meet the header.',
  'Two sketches of the studio entrance lie beside the pencils.',
]) assert.equal(buildIllustrationSceneContract({ sourceParagraph: prose }).centralAction, '', `unasserted/unknown action must stay unknown: ${prose}`)
assert.equal(buildIllustrationSceneContract({ sourceParagraph: 'Yejin writes on the form, then folds the paper.' }).centralAction, '', 'multiple action instants must not acquire a guessed central action')
for(const sourceParagraph of ['She folds her arms, then steps forward and offers him her hand.','He folds the letter before walking over to give it to her.','She first folds her hands, then turns away.'])assert.equal(buildIllustrationSceneContract({sourceParagraph}).centralAction,'','explicit successive instants cannot lock the entire paragraph to the first recognized action')
assert.equal(buildIllustrationSceneContract({sourceParagraph:'She folds the letter before walking over to give it to her.',anchorExcerpt:'She folds the letter'}).centralAction,'fold','a validated excerpt may select the fold instant within a sequential paragraph')
assert.equal(buildIllustrationSceneContract({ sourceParagraph: 'Yejin folds in the corners of the sheet.' }).centralAction, 'fold', 'a real fold-in verb must remain actionable')
assert.equal(buildIllustrationSceneContract({ sourceParagraph: 'Yejin is folding the chair.' }).centralAction, 'fold', 'actually folding furniture must still count')
const mismatchedExcerpt = buildIllustrationSceneContract({ sourceParagraph: 'Yejin folds paper.', anchorExcerpt: 'Yejin writes on paper.' })
assert.equal(mismatchedExcerpt.anchorExcerpt, '')
assert.equal(mismatchedExcerpt.centralAction, 'fold', 'a fabricated excerpt cannot change source evidence')
assert.deepEqual(buildIllustrationSceneContract({ sourceParagraph: 'A pencil lies unused. Yejin folds paper while Arin holds the pencil.' }).idleTools, [], 'ambiguous shared-tool ownership cannot cause global deletion')
assert.deepEqual(buildIllustrationSceneContract({ sourceParagraph: 'Yejin folds paper beside a pencil.' }).idleTools, [], 'nearby is not explicitly idle')
const unknown = buildIllustrationSceneContract({ sourceParagraph: 'Yejin examines the paper.' })
assert.deepEqual(enforceIllustrationSceneContract('1girl, paper, pencil', 'danbooru-tags', unknown), { prompt: '1girl, paper, pencil', issues: [] })
const parkedPencil = buildIllustrationSceneContract({ sourceParagraph: 'Yejin set the hexagonal drafting pencil into the grooved table edge. She smoothed the paper with both palms.' })
assert.equal(parkedPencil.centralAction, '', 'unknown smoothing action is not guessed')
assert.deepEqual(parkedPencil.idleTools, ['pencil'], 'an explicitly parked tool does not require a recognized action verb')
assert.equal(enforceIllustrationSceneContract('1girl, folding_paper, paper, pencil, blazer', 'danbooru-tags', parkedPencil).prompt, '1girl, folding_paper, paper, blazer')
assert.deepEqual(buildIllustrationSceneContract({ sourceParagraph: 'Yejin set the pencil in motion across the paper.' }).idleTools, [], 'in motion is not a tool holder')
assert.deepEqual(buildIllustrationSceneContract({ sourceParagraph: 'Yejin put the pencil into her hand.' }).idleTools, [], 'a hand is not a tool holder')
const twoActors = [{ ...actor, name: 'Ria' }, { ...actor, name: 'Cody' }]
for (const [bodyPart, natural, tags] of [
  ['arms', 'Ria stands with her arms crossed. Cody watches.', '2people, crossed_arms, standing'],
  ['hands', 'Ria sits with her hands clasped in her lap. Cody watches.', '2people, clasped_hands, sitting'],
]) {
  const poseContract = buildIllustrationSceneContract({ sourceParagraph: `Ria folded her ${bodyPart}. Cody watches.`, actors: twoActors })
  assert.equal(enforceIllustrationSceneContract(natural, 'natural-language', poseContract).issues.length, 0, 'equivalent body poses must not require the literal fold verb')
  assert.equal(enforceIllustrationSceneContract(tags, 'danbooru-tags', poseContract).issues.length, 0)
  assert(enforceIllustrationSceneContract(`Ria watches. ${natural.replace(/Ria/g, 'Cody')}`, 'natural-language', poseContract).issues.some(issue => issue.code === 'scene-action-owner'), 'equivalent poses must preserve their actor')
  assert(enforceIllustrationSceneContract(`Ria is not ${bodyPart === 'arms' ? 'crossing her arms' : 'clasping her hands'}.`, 'natural-language', poseContract).issues.some(issue => issue.code === 'scene-action-missing'), 'negated equivalent poses are not evidence')
  assert(enforceIllustrationSceneContract(tags, 'danbooru-tags', contract).issues.some(issue => issue.code === 'scene-action-missing'), 'body-pose tags cannot satisfy a paper-folding anchor')
}
const ownedFold = buildIllustrationSceneContract({ sourceParagraph: 'Ria folds the paper. Cody watches.', actors: twoActors })
assert.equal(ownedFold.centralActor, 'Ria')
// Live Model Planned failure: concrete current hand/tool use can express an
// action with an instrumental infinitive, not only a finite/progressive verb.
const liveFoldSource = 'Turning her focus down, Arin folded the single grey towel in half on the table with both hands. Taehyun stood motionless on her right, watching her across the open space with his hands resting at his sides.'
const liveFoldVisual = 'Two adults, medium shot, eye-level view. On the left, Arin, wearing a soft cream knit cardigan and pleated skirt; she leans slightly forward over the low dark wooden table, using both hands flat against a single grey cotton towel to fold it cleanly in half, looking downward at her work. On the right across a clear half-metre gap, Taehyun stands still, watching her quietly with both hands resting down at his sides.'
const liveFoldContract = buildIllustrationSceneContract({ sourceParagraph: liveFoldSource })
assert.equal(liveFoldContract.centralAction, 'fold')
assert.deepEqual(enforceIllustrationSceneContract(liveFoldVisual, 'natural-language', liveFoldContract), { prompt: liveFoldVisual, issues: [] }, 'the actual authored using-both-hands-to-fold visual must pass without rewriting or inventing an action')
for (const visual of [
  'Ria uses both hands to fold the paper.',
  'Ria is using her right hand to crease the sheet.',
  'Ria, using both hands flat against the paper to fold it in half, looks down.',
]) assert.equal(enforceIllustrationSceneContract(visual, 'natural-language', ownedFold).issues.length, 0, `asserted instrumental action must survive: ${visual}`)
for (const visual of [
  'Ria plans to use both hands to fold the paper.',
  'Ria would be using both hands to fold the paper.',
  'Ria is not using both hands to fold the paper.',
  'Ria waits without using both hands to fold the paper.',
  'Ria uses both hands not to fold the paper.',
  'Ria prepares to fold the paper.',
  'Ria is using both hands to try to fold the paper.',
  'Ria holds the paper, ready to fold it.',
  'Ria says "I am using both hands to fold the paper."',
]) assert(enforceIllustrationSceneContract(visual, 'natural-language', ownedFold).issues.some(issue => issue.code === 'scene-action-missing'), `planned, negated or quoted instrumental action must stay unproven: ${visual}`)
assert(enforceIllustrationSceneContract('Ria watches. Cody uses both hands to fold the paper.', 'natural-language', ownedFold).issues.some(issue => issue.code === 'scene-action-owner'), 'instrumental action must not excuse an explicit owner swap')
assert.equal(enforceIllustrationSceneContract('1girl, Ria uses both hands to fold the paper, paper', 'danbooru-tags', ownedFold).issues.length, 0, 'mixed Booru action evidence uses the same assertion check')
assert.equal(enforceIllustrationSceneContract('Yejin uses her pencil to sketch the floor plan.', 'natural-language', drawContract).issues.length, 0, 'current tool use also preserves a drawing action')
assert.equal(enforceIllustrationSceneContract('Ria uses her right hand to lift the cup.', 'natural-language', liftedCup).issues.length, 0, 'current hand use also preserves an object lift')
assert(enforceIllustrationSceneContract('Ria plans to use her right hand to lift the cup.', 'natural-language', liftedCup).issues.some(issue => issue.code === 'scene-action-missing'), 'a planned lift still is not an asserted lift')
assert(enforceIllustrationSceneContract('2people, Ria watches, Cody folds the paper', 'danbooru-tags', ownedFold).issues.some(issue => issue.code === 'scene-action-owner'), 'explicitly wrong ownership in mixed tag prose cannot be accepted')
assert(enforceIllustrationSceneContract('Ria watches. Cody folds the paper.', 'natural-language', ownedFold).issues.some(issue => issue.code === 'scene-action-owner'))
assert.equal(enforceIllustrationSceneContract('Ria: black coat, folding the paper. Cody watches.', 'natural-language', ownedFold).issues.length, 0)
assert.equal(enforceIllustrationSceneContract('Ria stands at the table. She folds the paper.', 'natural-language', ownedFold).issues.length, 0, 'unresolved pronouns are not proof of swapped action ownership')
assert.equal(buildIllustrationSceneContract({ sourceParagraph: '"Ria folds paper," he said. Cody folds the paper.', actors: twoActors }).centralActor, 'Cody', 'dialogue cannot manufacture an action owner')
assert.equal(buildIllustrationSceneContract({ sourceParagraph: 'Ria and Cody fold the paper.', actors: twoActors }).centralActor, '', 'joint action must not be assigned to the nearest actor')
assert.equal(buildIllustrationSceneContract({ sourceParagraph: 'Ria waits; she folds the paper.', actors: twoActors }).centralActor, '', 'a pronoun must not acquire a guessed owner')

assert.equal(ownedSceneRequirementPresent('Ria smiles. Cody reaching for the umbrella.', 'Ria', 'reaching for the umbrella', ['Ria', 'Cody']), false, 'another actor performing the action must not satisfy Ria’s clause')
assert.equal(ownedSceneRequirementPresent('Ria reaching for the umbrella while Cody holds the handle.', 'Ria', 'reaching for the umbrella', ['Ria', 'Cody']), true)
assert.equal(ownedSceneRequirementPresent('Ria and Cody wait.', 'Ria', 'reaching for the umbrella', ['Ria', 'Cody']), false)
assert.equal(ownedSceneRequirementPresent('Maria reaches for it.', 'Ria', 'reaches for it', ['Ria']), false, 'actor matching must be whole-name')
const shoulderContact = "resting her left palm on Yuna's left shoulder and her right palm on Yuna's right shoulder"
assert.equal(ownedSceneRequirementPresent(`Mira is standing behind the chair, ${shoulderContact}. Yuna sits upright.`, 'Mira', shoulderContact, ['Mira', 'Yuna']), true, 'a possessive contact target must not split the acting owner clause and cause duplicate contact fallback')
assert.equal(ownedSceneRequirementPresent("Mira rests her palm on Yuna's shoulder while Yuna lifts the cup.", 'Mira', 'lifts the cup', ['Mira', 'Yuna']), false, 'a later real actor switch must still stop the owner clause')
assert.equal(ownedSceneRequirementPresent("Mira rests her palm against Yuna’s shoulder, lifting the cup with her free hand.", 'Yuna', 'lifting the cup', ['Mira', 'Yuna']), false, 'a possessive contact-target mention cannot become an action owner')
assert.equal(ownedSceneRequirementPresent("Yuna’s right hand lifts the cup.", 'Yuna', 'lifts the cup', ['Mira', 'Yuna']), true, 'an owned body part acting as subject remains valid')
assert.equal(ownedSceneRequirementPresent("Mira stands behind the chair with her head above Yuna's head, resting her palms on Yuna's shoulders.", 'Mira', "resting her palms on Yuna's shoulders", ['Mira', 'Yuna']), true, 'a named spatial target before an exact action must not truncate its acting owner')
assert.equal(ownedSceneRequirementPresent('Mira stands one pace apart from Yuna, holding one cup in her right hand.', 'Mira', 'holding one cup in her right hand', ['Mira', 'Yuna']), true, 'a bounded apart-from target must not cause the exact owned cup action to be repeated')
assert.equal(ownedSceneRequirementPresent('Mira stands one pace apart from Yuna, holding one cup in her right hand.', 'Yuna', 'holding one cup in her right hand', ['Mira', 'Yuna']), false, 'a spatial target does not own the following action')
assert.equal(ownedSceneRequirementPresent("Mira stands with her head above Yuna's head while Yuna lifts the cup.", 'Mira', 'lifts the cup', ['Mira', 'Yuna']), false, 'a real actor switch after a spatial target must remain a boundary')
assert.equal(ownedSceneRequirementPresent('Mira looks toward Yuna who lifts the cup.', 'Mira', 'lifts the cup', ['Mira', 'Yuna']), false, 'an unbounded relative actor clause must not be claimed by the looker')
assert.equal(ownedSceneRequirementPresent('Mira stands behind Yuna, who lifts the cup.', 'Mira', 'lifts the cup', ['Mira', 'Yuna']), false, 'punctuation before a relative actor clause must not donate its action')
console.log('Illustration scene contract smoke passed: anchored action checks, explicit idle-tool shaping, ambiguous fail-closed output, ownership and conservative unknown/negated/dialogue cases.')
