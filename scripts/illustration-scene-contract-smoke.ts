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
console.log('Illustration scene contract smoke passed: anchored action checks, explicit idle-tool shaping, ambiguous fail-closed output, ownership and conservative unknown/negated/dialogue cases.')
