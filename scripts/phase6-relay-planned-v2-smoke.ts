// @ts-nocheck -- deterministic offline Phase 6 contract gate.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  RELAY_PLANNED_V2,
  compileRelayPlannedPrompt,
  previousSequenceShotContext,
  sceneOnlyRepairPreservesPlan,
  relayPlannedAuthoritativeParagraph,
  validateRelayPlannedDirectorResult,
  relayPlannedFrequencyRequiresIllustration,
  relayPlannedFrequencyDirective,
  runRelayPlannedDirectorWithFrequency,
  type RelayPlannedContext,
  type RelayPlannedIllustration,
} from '../src/relayPlannedV2'
import { RELAY_PLANNED_DIRECTOR_REQUEST_TEMPLATE, RELAY_PLANNED_DIRECTOR_SYSTEM_PROMPT } from '../src/promptRegistryAssets028'
import { BOORU_TAG_MODE_PARSER_GUIDANCE, BOORU_TAG_MODE_VISUAL_PROMPT_GUIDANCE, PROMPT_REGISTRY_DEFINITIONS, RELAY_PLANNED_BOORU_TAG_MODE_GUIDANCE, REVERIE_ILLUSTRATION_PROTOCOL, REVERIE_INLINE_PROTOCOL, REVERIE_RELAY_PLANNED_PROTOCOL } from '../src/protocols'
import { normalizeBooruTagPrompt } from '../src/booruTags'
import { storyboardFigureIntegrityClause } from '../src/storyboardVisualIntegrity'

const context: RelayPlannedContext = {
  version: RELAY_PLANNED_V2,
  chatId: 'chat-1',
  messageId: 'message-1',
  swipeId: 0,
  maximumIllustrations: 3,
  maximumCharacters: 2,
  maximumPromptCharacters: 6000,
  perspectiveMode: 'scene-led',
  defaultAspectRatio: '4:3',
  promptStyle: 'cinematic illustration',
  adultMode: false,
  paragraphs: [
    { index: 0, text: 'Ria stepped into the rain and looked up at the neon station clock.' },
    { index: 1, text: 'Cody held out the red umbrella, trying not to look pleased with himself.' },
    { index: 2, text: 'They crossed the empty platform together as the last train arrived.' },
  ],
  subjects: [
    { name: 'Ria', role: 'character', identity: ['long amethyst hair', 'green eyes'], current: ['black coat'], pinned: ['green eyes'], superseded: ['barefoot'], activeFactIds: ['fact-ria-eyes'] },
    { name: 'Cody', role: 'character', identity: ['short dark hair'], current: ['red scarf'], pinned: [], superseded: [], activeFactIds: ['fact-cody-hair'] },
  ],
  referenceAssetIds: ['ref-ria'],
  locationReferenceAssetIds: ['ref-station'],
  priorIllustrations: [],
  globalNegativeRequirements: ['bad anatomy', 'duplicate person'],
}

const priorShot = {
  chatId: 'chat-1', messageId: 'earlier-message', planId: 'earlier-shot', status: 'generated', planningTimestamp: 10,
  title: 'Control room', namedSubjects: ['Gabrielle'], sceneBrief: 'Rainy control room', location: 'control room', importantProps: ['red fader'],
  promptComposition: { framing: 'console frame-left, booth door frame-right', sceneBrief: 'Rainy control room', location: 'control room', namedSubjects: ['Gabrielle'], importantProps: ['red fader'] },
} as any
assert.equal(previousSequenceShotContext([priorShot], 'chat-1', 'current-message', 'scene-snapshot'), null)
assert.equal(previousSequenceShotContext([priorShot], 'another-chat', 'current-message', 'sequence'), null)
assert.equal(previousSequenceShotContext([{ ...priorShot, status: 'ready' }], 'chat-1', 'current-message', 'sequence'), null)
assert.equal(previousSequenceShotContext([{ ...priorShot, messageId: 'current-message' }], 'chat-1', 'current-message', 'sequence'), null)
assert.equal(previousSequenceShotContext([priorShot], 'chat-1', 'current-message', 'sequence')?.framing, 'console frame-left, booth door frame-right')

assert.match(RELAY_PLANNED_DIRECTOR_SYSTEM_PROMPT, /When perspectiveMode is "emotional-beat", make the supported cause of the reaction visible/)
assert.match(RELAY_PLANNED_DIRECTOR_SYSTEM_PROMPT, /include that character in namedSubjects and expectedPeopleCount/)
assert.match(RELAY_PLANNED_DIRECTOR_SYSTEM_PROMPT, /Do not replace a present cause with an implied off-camera person or "the viewer"/)
assert.match(RELAY_PLANNED_DIRECTOR_SYSTEM_PROMPT, /Do not isolate the reacting character into a close-up or promotional portrait/)
assert.match(RELAY_PLANNED_DIRECTOR_SYSTEM_PROMPT, /"Intimate" means emotionally private unless the source explicitly establishes romance/)
assert.match(RELAY_PLANNED_DIRECTOR_SYSTEM_PROMPT, /a near-contact must not become completed contact/)

function shot(overrides: Partial<RelayPlannedIllustration> = {}): RelayPlannedIllustration {
  return {
    rank: 1,
    title: 'Umbrella offer',
    reason: 'A distinct emotional interaction.',
    anchor: { paragraphIndex: 1, insertionSide: 'after', anchorExcerpt: 'Cody held out the red umbrella' },
    aspectRatio: '4:3',
    expectedPeopleCount: 2,
    namedSubjects: ['Ria', 'Cody'],
    omittedSubjects: [],
    subjectDirectives: [
      { name: 'Ria', role: 'character', appearanceOverrides: [], attireOverrides: [], temporaryTraits: [], expression: 'surprised smile', pose: 'turning toward Cody', action: 'reaching for the umbrella', gaze: 'at Cody', contact: '' },
      { name: 'Cody', role: 'character', appearanceOverrides: [], attireOverrides: [], temporaryTraits: [], expression: 'restrained grin', pose: 'standing at frame right', action: 'offering the umbrella', gaze: 'at Ria', contact: 'right hand holds the umbrella handle' },
    ],
    composition: { shotType: 'medium two-shot', cameraAngle: 'eye level', framing: 'waist-up', blocking: 'Ria left, Cody right, umbrella centered', foreground: 'rain streaks', background: 'empty train platform', location: 'neon station platform', timeOfDay: 'night', lighting: 'pink and blue neon', mood: 'tentative warmth', importantProps: ['red umbrella'], backgroundPeople: '' },
    promptCore: 'two friends sharing an umbrella in rain',
    negativeCore: 'crowd',
    referenceAssetIds: ['ref-ria'],
    locationReferenceAssetIds: ['ref-station'],
    ...overrides,
  }
}

function envelope(illustrations: RelayPlannedIllustration[], shouldIllustrate = true): string {
  return JSON.stringify({ shouldIllustrate, reason: shouldIllustrate ? 'Strong beats exist.' : 'No useful beat.', illustrations })
}

const none = validateRelayPlannedDirectorResult(envelope([], false), context)
assert.equal(none.shouldIllustrate, false)
assert.equal(none.illustrations.length, 0)

for (const selectedAspect of ['1:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9']) {
  const forcedAspect = validateRelayPlannedDirectorResult(envelope([shot({ aspectRatio: '16:9' })]), { ...context, defaultAspectRatio: selectedAspect }).illustrations[0]
  assert.equal(forcedAspect.illustration.aspectRatio, selectedAspect, `Every explicit UI aspect must reach the validated plan: ${selectedAspect}`)
}

const requiredContext = { ...context, frequencyMode: 'every-eligible' as const }
assert.equal(relayPlannedFrequencyRequiresIllustration(requiredContext), true)
assert.equal(relayPlannedFrequencyRequiresIllustration({ ...requiredContext, maximumIllustrations: 0 }), false)
assert.equal(relayPlannedFrequencyRequiresIllustration({ ...requiredContext, paragraphs: [] }), false)
assert.match(relayPlannedFrequencyDirective(requiredContext), /not a reason to decline/)
let frequencyCalls = 0
const directorMessages = [{ role: 'system' as const, content: 'Original source and schema.' }]
const keyMomentDecline = await runRelayPlannedDirectorWithFrequency(directorMessages, { ...context, frequencyMode: 'key-moments' }, async () => { frequencyCalls++; return envelope([], false) })
assert.equal(keyMomentDecline.validated.shouldIllustrate, false)
assert.equal(frequencyCalls, 1, 'key-moment policy may legitimately decline without retry')
frequencyCalls = 0
const falseWithValidShot = await runRelayPlannedDirectorWithFrequency(directorMessages, requiredContext, async () => { frequencyCalls++; return envelope([shot()], false) })
assert.equal(falseWithValidShot.validated.shouldIllustrate, true, 'required policy must process a valid shot even if the boolean incorrectly says false')
assert.equal(frequencyCalls, 1, 'do not spend on another call when usable grounded shots already exist')
for (const mode of ['every-eligible', 'every-n'] as const) {
  frequencyCalls = 0
  const recovered = await runRelayPlannedDirectorWithFrequency(directorMessages, { ...requiredContext, frequencyMode: mode }, async messages => {
    frequencyCalls++
    if (frequencyCalls === 1) return JSON.stringify({ shouldIllustrate: false, reason: 'The story develops across three distinct visual beats.', illustrations: [] })
    assert.equal(messages[0].content, directorMessages[0].content, 'retry must preserve the original authoritative context')
    assert.match(messages.at(-1)!.content, /frequency-contract failure/)
    return envelope([shot()])
  })
  assert.equal(recovered.validated.shouldIllustrate, true)
  assert.equal(frequencyCalls, 2, `${mode}: exactly one bounded retry`)
}
frequencyCalls = 0
await assert.rejects(runRelayPlannedDirectorWithFrequency(directorMessages, requiredContext, async () => { frequencyCalls++; return envelope([], false) }), /failed after one bounded retry/)
assert.equal(frequencyCalls, 2, 'persistent decline must fail visibly, not loop or dispatch invented content')
frequencyCalls = 0
await assert.rejects(runRelayPlannedDirectorWithFrequency(directorMessages, requiredContext, async () => { frequencyCalls++; throw new Error('Operation cancelled by user.') }), /cancelled/)
assert.equal(frequencyCalls, 1, 'cancellation/provider failure must never trigger the decline retry')
const fatalRequired = validateRelayPlannedDirectorResult(envelope([shot({ subjectDirectives: shot().subjectDirectives.map(row => row.name === 'Ria' ? { ...row, appearanceOverrides: ['barefoot'] } : row) })]), requiredContext)
assert.equal(fatalRequired.illustrations[0].rejected, true, 'frequency must not bypass fatal scene/identity validation')

const fixedAspect = validateRelayPlannedDirectorResult(envelope([shot({ aspectRatio: '16:9' })]), context).illustrations[0]
assert.equal(fixedAspect.illustration.aspectRatio, '4:3', 'A fixed user aspect policy must override the Director suggestion')
assert.ok(fixedAspect.issues.some(issue => issue.code === 'aspect-policy-applied' && issue.repair === 'local'))
const adaptiveAspect = validateRelayPlannedDirectorResult(envelope([shot({ aspectRatio: '16:9' })]), { ...context, defaultAspectRatio: 'adaptive' }).illustrations[0]
assert.equal(adaptiveAspect.illustration.aspectRatio, '16:9', 'Adaptive aspect may follow the Director suggestion')

const many = validateRelayPlannedDirectorResult(envelope([
  shot(),
  shot({ rank: 2, title: 'Train arrival', anchor: { paragraphIndex: 2, insertionSide: 'after', anchorExcerpt: 'the last train arrived' }, composition: { ...shot().composition, shotType: 'wide establishing shot', framing: 'full platform', blocking: 'Ria and Cody small at frame left, train entering frame right' }, promptCore: 'last train arriving through rain' }),
  shot({ rank: 3, title: 'Clock detail', anchor: { paragraphIndex: 0, insertionSide: 'after', anchorExcerpt: 'neon station clock' }, expectedPeopleCount: 0, namedSubjects: [], subjectDirectives: [], composition: { ...shot().composition, shotType: 'object detail', framing: 'tight detail', blocking: 'station clock centered above rain', backgroundPeople: '' }, promptCore: 'rain running over a glowing station clock' }),
  shot({ rank: 4, title: 'Must be clipped' }),
]), context)
assert.equal(many.illustrations.length, 3, 'Director output is bounded before dispatch')

const badAnchor = validateRelayPlannedDirectorResult(envelope([shot({ anchor: { paragraphIndex: 99, insertionSide: 'after', anchorExcerpt: 'invented paragraph' } })]), context).illustrations[0]
assert.equal(badAnchor.requiresRepair, true)
assert.ok(badAnchor.issues.some(issue => issue.code === 'anchor-missing'))

const badCount = validateRelayPlannedDirectorResult(envelope([shot({ expectedPeopleCount: 1 })]), context).illustrations[0]
assert.ok(badCount.issues.some(issue => issue.code === 'people-count' && issue.repair === 'ambiguous'))

const tooMany = validateRelayPlannedDirectorResult(envelope([shot({ namedSubjects: ['Ria', 'Cody', 'Unknown Subject'] })]), context).illustrations[0]
assert.ok(tooMany.issues.some(issue => issue.code === 'character-limit'))
assert.ok(tooMany.issues.some(issue => issue.code === 'unknown-subject'))

const revived = shot()
revived.subjectDirectives[0].temporaryTraits = ['barefoot']
const revivedResult = validateRelayPlannedDirectorResult(envelope([revived]), context).illustrations[0]
assert.equal(revivedResult.rejected, true)
assert.ok(revivedResult.issues.some(issue => issue.code === 'superseded-appearance'))

const pinnedConflict = shot()
pinnedConflict.subjectDirectives[0].appearanceOverrides = ['blue eyes']
const pinnedResult = validateRelayPlannedDirectorResult(envelope([pinnedConflict]), context).illustrations[0]
assert.equal(pinnedResult.requiresRepair, true)
assert.ok(pinnedResult.issues.some(issue => issue.code === 'pinned-appearance-conflict'))

const unknownReference = shot({ referenceAssetIds: ['ref-ria', 'made-up-ref'] })
const referenceResult = validateRelayPlannedDirectorResult(envelope([unknownReference]), context).illustrations[0]
assert.deepEqual(referenceResult.illustration.referenceAssetIds, ['ref-ria'])
assert.equal(referenceResult.requiresRepair, false, 'Unknown references are a mechanical local repair')

const duplicates = validateRelayPlannedDirectorResult(envelope([shot(), shot({ rank: 2, title: 'Same shot again' })]), context)
assert.equal(duplicates.illustrations[1].rejected, true)
assert.ok(duplicates.illustrations[1].issues.some(issue => issue.code === 'near-duplicate'))

const distinctSameCast = validateRelayPlannedDirectorResult(envelope([
  shot(),
  shot({ rank: 2, title: 'Boarding the train', anchor: { paragraphIndex: 2, insertionSide: 'after', anchorExcerpt: 'They crossed the empty platform together' }, promptCore: 'Ria and Cody cross the platform and board the arriving train' }),
]), context)
assert.equal(distinctSameCast.illustrations[1].rejected, false, 'Same cast, location and shot size do not make distinct anchored actions duplicate')

const compiled = compileRelayPlannedPrompt(shot({ promptCore: 'green_eyes, red umbrella, green eyes' }), context, { qualitySuffix: 'refined detail', globalNegative: 'bad anatomy, extra limbs' })
assert.ok(compiled.positivePrompt.indexOf('long amethyst hair') < compiled.positivePrompt.indexOf('black coat'), 'Canonical identity precedes current appearance')
assert.equal((compiled.positivePrompt.match(/green eyes/gi) || []).length, 1, 'Exact underscore/space duplicates collapse')
assert.equal((compiled.negativePrompt.match(/bad anatomy/gi) || []).length, 1, 'Global negative fragments collapse')
assert.ok(compiled.positivePrompt.includes('medium two-shot'))
assert.ok(compiled.positivePrompt.includes('character reference ref-ria'))

const booruTags = ['1girl', '1boy', 'long_hair', 'purple_hair', 'green_eyes', 'black_coat', 'short_hair', 'red_scarf', 'holding', 'umbrella', 'rain', 'train_station', 'night']
const booruShot = shot({ booruTags: ['rain', 'train_station', 'night'], subjectDirectives: shot().subjectDirectives.map((row, index) => ({ ...row, booruTags: index === 0 ? ['1girl', 'long_hair', 'purple_hair', 'green_eyes', 'black_coat', 'reaching'] : ['1boy', 'short_hair', 'red_scarf', 'holding', 'umbrella'] })) })
const booruValidation = validateRelayPlannedDirectorResult(envelope([booruShot]), { ...context, promptFormat: 'danbooru-tags' }).illustrations[0]
assert(!booruValidation.requiresRepair, 'Director-authored tag concepts should pass Booru validation')
const booruCompiled = compileRelayPlannedPrompt(booruShot, context, { tagMode: true })
assert.match(booruCompiled.positivePrompt, /^1girl, long_hair, purple_hair, green_eyes, black_coat/)
assert.match(booruCompiled.positivePrompt, /Ria: turning toward Cody[\s\S]*1boy, short_hair, red_scarf/, 'spatial descriptions stay inside their owning tag blocks')
assert.doesNotMatch(booruCompiled.positivePrompt, /turning_toward_cody|offering_the_umbrella/, 'do not manufacture underscore-joined pseudo-tags')
assert(validateRelayPlannedDirectorResult(envelope([shot()]), { ...context, promptFormat: 'danbooru-tags' }).illustrations[0].requiresRepair, 'Missing Director tags should request repair')
assert(validateRelayPlannedDirectorResult(envelope([shot({ booruTags: ['1girl', 'solo', 'woman_is_holding_the_umbrella_in_the_rain'] })]), { ...context, promptFormat: 'danbooru-tags' }).illustrations[0].requiresRepair, 'Prose disguised as tags should request repair')
assert.throws(() => normalizeBooruTagPrompt('woman is holding an umbrella in the rain, black hair'), /prose-shaped|sentence/, 'Formatter must never convert prose into underscore strings')
assert.equal(
  normalizeBooruTagPrompt('1girl, short_hair, She reaches for the cracked keycard but stops before touching it, blue_eyes, cracked_keycard, desk_lamp, workshop'),
  '1girl, short_hair, She reaches for the cracked keycard but stops before touching it, blue_eyes, cracked_keycard, desk_lamp, workshop',
  'A bounded prose clause must survive alongside valid Danbooru tags',
)
assert.equal(normalizeBooruTagPrompt('1boy, wolfcut, amber_eyes, cybernetic_eye, mechanical_eye'), '1boy, wolf_cut, yellow_eyes, single_mechanical_eye', 'Known deprecated and alias tags should resolve to established concepts')
assert.equal(normalizeBooruTagPrompt('1boy, amber_left_eye, cybernetic_right_eye'), '1boy, yellow_eyes, amber_left_eye, single_mechanical_eye, cybernetic_right_eye', 'Side qualifiers must retain the established visual concept tags')

const mixedBooruShot = shot({ namedSubjects: ['Ria'], expectedPeopleCount: 1, subjectDirectives: [shot().subjectDirectives[0]], booruTags: ['1girl', 'solo', 'black_hair', 'She reaches toward the untouched key beside her hand.', 'reaching', 'key', 'workshop'] })
const mixedBooruValidation = validateRelayPlannedDirectorResult(envelope([mixedBooruShot]), { ...context, promptFormat: 'danbooru-tags' }).illustrations[0]
assert(!mixedBooruValidation.requiresRepair, 'Relay Planned should tolerate one stray natural-language fragment when the visual tag list is otherwise valid')
assert.equal(compileRelayPlannedPrompt(mixedBooruShot, context, { tagMode: true }).positivePrompt, '1girl, solo, black_hair, She reaches toward the untouched key beside her hand., reaching, key, workshop', 'Relay Planned compilation must preserve the bounded visual fragment')

const snapshotCompiled = compileRelayPlannedPrompt(shot(), { ...context, perspectiveMode: 'scene-snapshot' })
assert.match(snapshotCompiled.positivePrompt, /Ria: .*black coat.*reaching for the umbrella/, 'Scene Snapshot must keep Ria\'s outfit and action bound to Ria')
assert.match(snapshotCompiled.positivePrompt, /Cody: .*red scarf.*offering the umbrella.*right hand holds the umbrella handle/, 'Scene Snapshot must keep Cody\'s outfit, action, and prop ownership bound to Cody')
assert.ok(snapshotCompiled.positivePrompt.indexOf('Ria:') < snapshotCompiled.positivePrompt.indexOf('cinematic illustration'), 'Scene Snapshot must put owner-scoped blocking before style tags')
const storyboardCompiled = compileRelayPlannedPrompt(shot(), { ...context, perspectiveMode: 'storyboard' })
const outfitChangeContext = { ...context, subjects: context.subjects.map(subject => subject.name === 'Ria' ? { ...subject, wardrobe: ['black coat'], current: ['black coat', 'faint bruise on wrist'] } : subject) }
const outfitChangeShot = shot({ subjectDirectives: shot().subjectDirectives.map(row => row.name === 'Ria' ? { ...row, attireOverrides: ['green jacket'] } : row) })
for (const perspectiveMode of ['scene-snapshot', 'storyboard']) {
  const changedOutfit = compileRelayPlannedPrompt(outfitChangeShot, { ...outfitChangeContext, perspectiveMode })
  assert.match(changedOutfit.positivePrompt, /green jacket/)
  assert.doesNotMatch(changedOutfit.positivePrompt, /black coat/)
  assert.match(changedOutfit.positivePrompt, /faint bruise on wrist/)
  assert.match(changedOutfit.positivePrompt, /Cody: .*red scarf/)
}
const staleContactContext = { ...context, perspectiveMode: 'storyboard', subjects: context.subjects.map(subject => subject.name === 'Ria'
  ? { ...subject, current: ["faint red pressure mark on wrist, forehead touching Cody's", 'kneeling beside Cody', 'tweed cardigan'] } : subject) }
const staleContactPrompt = compileRelayPlannedPrompt(shot(), staleContactContext)
assert(!/forehead touching|kneeling beside/.test(staleContactPrompt.positivePrompt), 'saved Appearance pose must not override the selected umbrella action')
assert(staleContactPrompt.positivePrompt.includes('faint red pressure mark on wrist') && staleContactPrompt.positivePrompt.includes('tweed cardigan'), 'pose filtering must preserve adjacent injury and clothing fragments')
const currentContactShot = shot({ subjectDirectives: shot().subjectDirectives.map(row => row.name === 'Ria' ? { ...row, contact: "forehead touching Cody's" } : row) })
assert(compileRelayPlannedPrompt(currentContactShot, staleContactContext).positivePrompt.includes("forehead touching Cody's"), 'a current authored contact must remain valid outside Appearance memory')
const storyboardView = compileRelayPlannedPrompt(shot({ composition: { ...shot().composition, cameraAngle: 'Camera: low-angle view' }, promptCore: 'Ria reaching for the umbrella. Cody holds a camera.' }), { ...context, perspectiveMode: 'storyboard' })
assert.match(storyboardView.positivePrompt, /View: low-angle view/)
assert.match(storyboardView.positivePrompt, /Cody holds a camera/)
assert.doesNotMatch(storyboardView.positivePrompt, /Camera:/)
const storyboardViewTags = compileRelayPlannedPrompt({ ...booruShot, booruTags: ['Camera angle: from_above', 'camera', 'umbrella'] }, { ...context, perspectiveMode: 'storyboard' }, { tagMode: true })
assert.match(storyboardViewTags.positivePrompt, /from_above, camera, Ria left, Cody right, umbrella centered$/, 'Booru mode must preserve the Director-authored view and actor blocking; its owned umbrella tag stays in Cody\'s block')
assert(storyboardCompiled.positivePrompt.startsWith('medium two-shot, eye level, waist-up. two friends sharing an umbrella in rain'), 'Storyboard must lead with the readable camera and one anchored action')
assert.match(storyboardCompiled.positivePrompt, /Ria: .*black coat.*reaching for the umbrella/, 'Storyboard lost Ria\'s identity or owned action')
assert.match(storyboardCompiled.positivePrompt, /Cody: .*red scarf.*offering the umbrella.*right hand holds the umbrella handle/, 'Storyboard lost Cody\'s outfit or prop ownership')
assert.match(storyboardCompiled.positivePrompt, /Spatial blocking: Ria left, Cody right, umbrella centered/, 'Storyboard dropped the Director\'s relative actor/object placement')
assert.match(storyboardCompiled.positivePrompt, /Foreground depth: rain streaks/, 'Storyboard dropped the foreground depth cue')
assert.match(storyboardCompiled.positivePrompt, /exactly 2 visible people, including Ria and Cody.*distinct, readable silhouette/, 'Storyboard lost the multi-person anatomy/separation guard')
assert.equal(storyboardFigureIntegrityClause(1, ['Ria']), '', 'single-person framing must not be forced into a multi-actor guard')
assert(snapshotCompiled.positivePrompt.includes('tentative warmth') && snapshotCompiled.positivePrompt.includes('night'))
assert(!storyboardCompiled.positivePrompt.includes('tentative warmth') && !storyboardCompiled.positivePrompt.includes('night'), 'Storyboard should omit mood/time recitals while keeping actionable blocking')
assert(!storyboardCompiled.positivePrompt.includes('clear, unobstructed gap of air'), 'Storyboard must not add no-contact geometry to an anchored contact scene')
const noContactStoryboard = compileRelayPlannedPrompt(shot({
  expectedPeopleCount: 1,
  namedSubjects: ['Ria'],
  subjectDirectives: [{ ...shot().subjectDirectives[0], action: 'right index finger hovers just above the umbrella handle without contact' }],
  promptCore: 'Ria\'s right index finger hovers just above the umbrella handle without contact',
}), { ...context, perspectiveMode: 'storyboard' })
assert(noContactStoryboard.positivePrompt.includes('Keep the fingertip visibly separated from the object by a clear, unobstructed gap of air'), 'Storyboard no-contact prompt must make physical separation visible')
const interpersonalNoContactShot = compileRelayPlannedPrompt(shot({
  promptCore: 'Cody checks the wiring with a probe in his right hand while Ria holds a flashlight aimed into the junction box.',
  subjectDirectives: [
    { ...shot().subjectDirectives[0], action: 'gripping the flashlight in both hands', contact: 'kneeling beside Cody without touching him' },
    { ...shot().subjectDirectives[1], action: 'checking the box with an insulated probe in his right hand', contact: 'knees resting on the floor' },
  ],
}), { ...context, perspectiveMode: 'storyboard' })
assert(!interpersonalNoContactShot.positivePrompt.includes('Keep the hand visibly separated from the object'), 'Person-to-person no-contact must not undo either actor\'s prop grip')
assert(interpersonalNoContactShot.positivePrompt.includes('Ria: kneeling beside Cody without touching him'), 'Person-to-person separation must retain its actual owner and target')
assert(interpersonalNoContactShot.positivePrompt.includes('Ria holds a flashlight') && interpersonalNoContactShot.positivePrompt.includes('probe in his right hand'), 'The scoped separation must retain both tool interactions')
const tapeDiscStoryboard = compileRelayPlannedPrompt(shot({
  expectedPeopleCount: 1,
  namedSubjects: ['Yejin'],
  subjectDirectives: [{
    ...shot().subjectDirectives[0],
    name: 'Yejin',
    action: 'fixes yellow drafting tape beside the silver disc, then marks two alignment ticks on the tape with a black marker',
  }],
  promptCore: 'Yejin fixes one short strip of yellow drafting tape to the desk beside the flat silver disc, then marks two alignment ticks on the tape with a black marker. One tick aligns with the tiny open gap in the graphite circle on the disc hub; the other records the disc outer orientation.',
}), { ...context, perspectiveMode: 'storyboard' })
assert(tapeDiscStoryboard.positivePrompt.includes('the marker tip touches only the yellow drafting tape, not the silver disc'), 'Storyboard must bind marker contact to tape, not the referenced disc')
assert(tapeDiscStoryboard.positivePrompt.includes('Keep both hands and the marker outside the disc surface'), 'Storyboard must keep both hands and the marker off the disc')
assert(tapeDiscStoryboard.positivePrompt.includes('The existing graphite ring stays unchanged with its tiny open gap clearly visible'), 'Storyboard must preserve the existing open graphite gap')
assert(tapeDiscStoryboard.negativePrompt.includes('marker tip on disc') && tapeDiscStoryboard.negativePrompt.includes('hand holding disc'), 'Storyboard negative prompt must block the observed marker/hand-on-disc failure')
const noToolStoryContext = {
  ...context,
  perspectiveMode: 'storyboard' as const,
  paragraphs: [
    { index: 0, text: 'A gray graphite line emerges from the disc surface; there is no physical tool.' },
    { index: 1, text: 'Ria watches from across the room.' },
    { index: 2, text: 'The line stops one millimeter before closing.' },
  ],
}
const noToolStoryboard = compileRelayPlannedPrompt(shot({
  anchor: { paragraphIndex: 1, insertionSide: 'after', anchorExcerpt: 'Ria watches from across the room' },
  promptCore: 'Ria watches as a graphite point extends an arc on the disc',
}), noToolStoryContext)
assert(noToolStoryboard.positivePrompt.includes('The graphite line emerges directly from the disc surface'), 'Storyboard must preserve a supported self-forming effect without inventing a tool')
assert(noToolStoryboard.negativePrompt.includes('mechanical arm over the surface'), 'Storyboard must exclude an invented tool or mechanism from an explicitly tool-less effect')
assert(noToolStoryboard.positivePrompt.includes('Keep the stated narrow gap visibly open between both ends'), 'Storyboard must keep a millimeter-size gap legible without depicting closure')
const onePersonCameraShot = compileRelayPlannedPrompt(shot({
  expectedPeopleCount: 1,
  namedSubjects: ['Ria'],
  subjectDirectives: [shot().subjectDirectives[0]],
  composition: { ...shot().composition, shotType: 'foreground detail with a standing observer in deep background' },
  promptCore: 'Ria watches from the far side of the room',
}), { ...context, perspectiveMode: 'storyboard' })
assert(onePersonCameraShot.positivePrompt.includes('Ria standing in deep background'), 'Storyboard must resolve a generic single-person observer to the named subject')
assert(onePersonCameraShot.positivePrompt.includes('Exactly one visible person: Ria only.'), 'Storyboard must preserve the planned one-person cast count')
assert(!onePersonCameraShot.positivePrompt.includes('standing observer'), 'Storyboard left an ambiguous second-person camera role in the provider prompt')
assert(onePersonCameraShot.negativePrompt.includes('additional person'), 'Storyboard must exclude an unsupported additional person in a one-subject scene')
const namedStoryboard = compileRelayPlannedPrompt(shot({ promptCore: 'Ria reaching for the umbrella while Cody holds its handle between them' }), { ...context, perspectiveMode: 'storyboard' })
assert.equal((namedStoryboard.positivePrompt.match(/reaching for the umbrella/g) || []).length, 1, 'Storyboard repeated an action already bound to its named subject in promptCore')
assert(namedStoryboard.positivePrompt.includes('Ria: long amethyst hair') && namedStoryboard.positivePrompt.includes('Cody: short dark hair'), 'Compact Storyboard still needs each subject\'s identity and outfit')

const discActionContext = {
  ...context,
  perspectiveMode: 'storyboard' as const,
  paragraphs: [
    { index: 0, text: 'Yejin picks up the silver-coated optical disc by its outer polycarbonate rim.' },
    { index: 1, text: 'The gap was gone.' },
  ],
  subjects: [{ name: 'Yejin', role: 'character', identity: ['short silver hair', 'violet eyes'], current: ['dark editing blouse'], pinned: [], superseded: [] }],
}
const objectOnlyDisc = shot({
  title: 'The closed graphite ring',
  anchor: { paragraphIndex: 1, insertionSide: 'after', anchorExcerpt: 'The gap was gone.' },
  expectedPeopleCount: 0,
  namedSubjects: [],
  subjectDirectives: [],
  composition: { ...shot().composition, shotType: 'macro product shot', framing: 'tight close-up of the disc hub', blocking: 'the optical disc fills the frame; no person visible', importantProps: ['silver-coated optical disc'] },
  promptCore: 'Macro detail of the silver-coated optical disc and its now-complete graphite ring',
})
const missedPropAction = validateRelayPlannedDirectorResult(envelope([objectOnlyDisc]), discActionContext).illustrations[0]
assert(missedPropAction.requiresRepair, 'Storyboard must repair a prop-only aftermath shot when a nearby named character handles the same prop')
assert(missedPropAction.issues.some(issue => issue.code === 'storyboard-visible-prop-action'), 'Storyboard must report the missing visible actor/prop action contract')
assert.match(missedPropAction.issues.find(issue => issue.code === 'storyboard-visible-prop-action')?.message || '', /Yejin.*physically interacting.*central prop/)
const missedBooruPropAction = validateRelayPlannedDirectorResult(envelope([objectOnlyDisc]), { ...discActionContext, promptFormat: 'danbooru-tags' }).illustrations[0]
assert(missedBooruPropAction.issues.some(issue => issue.code === 'storyboard-visible-prop-action'), 'The same actor/prop fidelity guard must apply to Booru Tag Mode')
const actorWithDisc = shot({
  anchor: { paragraphIndex: 0, insertionSide: 'after', anchorExcerpt: 'Yejin picks up the silver-coated optical disc by its outer polycarbonate rim.' },
  expectedPeopleCount: 1,
  namedSubjects: ['Yejin'],
  subjectDirectives: [{ name: 'Yejin', role: 'character', appearanceOverrides: [], attireOverrides: [], temporaryTraits: [], expression: 'focused', pose: 'standing beside the editing desk', action: 'lifting the silver-coated optical disc by its outer rim', gaze: 'at the disc', contact: 'both hands hold the disc by its outer rim' }],
  composition: { ...shot().composition, shotType: 'medium close-up', framing: 'Yejin and the entire disc visible', blocking: 'Yejin lifts one disc with both hands beside the editing desk', importantProps: ['silver-coated optical disc'] },
  promptCore: 'Yejin lifts the silver-coated optical disc by its outer rim beside the editing desk',
})
const repairedPropAction = validateRelayPlannedDirectorResult(envelope([actorWithDisc]), discActionContext).illustrations[0]
assert(!repairedPropAction.requiresRepair && !repairedPropAction.issues.some(issue => issue.code === 'storyboard-visible-prop-action'), 'Storyboard must accept a repaired frame that shows the named actor performing the supported prop action')

// Live fixed-two Relay batch, 2026-10-13: both Director calls supplied two
// shots, but an unrelated nearby interaction with the shared table/teacup
// made the guard discard the correctly anchored binder shot.
const binderShot = shot({
  title: 'The binder lands',
  anchor: { paragraphIndex: 3, insertionSide: 'after', anchorExcerpt: 'laying the script binder down flat across the wood with a dull, heavy slap' },
  expectedPeopleCount: 1,
  namedSubjects: ['Taehyun'],
  subjectDirectives: [{ name: 'Taehyun', role: 'character', appearanceOverrides: [], attireOverrides: [], temporaryTraits: [], expression: 'tense jaw', pose: 'standing angled toward the oak table', action: 'laying the plain white script binder flat on the table', gaze: 'at the binder', contact: 'fingers linger on the binder spine' }],
  composition: { ...shot().composition, shotType: 'medium shot', framing: 'Taehyun, binder and teacups', blocking: 'Taehyun stands at the oak table', importantProps: ['plain white script binder', 'two ceramic teacups', 'two saucers', 'oak table'] },
  promptCore: 'Taehyun lays the plain white script binder flat on the oak table, fingers on its spine, with two ceramic teacups beside it.',
})
const binderContext = { ...discActionContext, paragraphs: [
  { index: 1, text: 'At the center oak table, Arin sits with her phone screen angled toward the morning light, her thumb flicking past the flashing timestamp of the emergency press notice that has already choked the agency\'s comment sections.' },
  { index: 3, text: 'With a slow, deliberate motion, he turns from the glass and walks the three paces to the table, laying the script binder down flat across the wood with a dull, heavy slap that makes the two ceramic teacups rattle against their saucers. His fingers linger on the spine for a fraction of a second before he pulls his hand back, shoving it deep into his pocket to hide the way the knuckles are scabbed and raw from the morning\'s compulsive picking.' },
  { index: 5, text: 'Arin locks her phone screen with a sharp click, sliding the device across the grain of the wood toward his empty teacup before standing up from her seat.' },
], subjects: [
  { name: 'Taehyun', role: 'character', identity: ['dark hair'], current: ['dark wool coat'], pinned: [], superseded: [] },
  { name: 'Arin', role: 'persona', identity: ['blonde hair'], current: ['grey wool coat'], pinned: [], superseded: [] },
] }
assert(!validateRelayPlannedDirectorResult(envelope([binderShot]), binderContext).illustrations[0].requiresRepair,
  'A named actor shot must not acquire a different actor from a nearby scene merely because they share furniture or a background prop')
assert(!validateRelayPlannedDirectorResult(envelope([{
  ...objectOnlyDisc,
  anchor: { paragraphIndex: 1, insertionSide: 'after', anchorExcerpt: 'emergency press notice' },
  composition: { ...objectOnlyDisc.composition, importantProps: ['oak table'] },
}]), { ...binderContext, paragraphs: [binderContext.paragraphs[0]] }).illustrations[0].issues
  .some(issue => issue.code === 'storyboard-visible-prop-action'),
  'A press notice is not evidence that its reader physically presses a prop')
const autonomousDiscContext = {
  ...discActionContext,
  paragraphs: [
    discActionContext.paragraphs[0],
    { index: 1, text: 'The graphite ring closes by itself on the silver-coated optical disc; no hand or tool is visible.' },
  ],
}
const autonomousOnlyDisc = { ...objectOnlyDisc, anchor: { ...objectOnlyDisc.anchor, anchorExcerpt: 'The graphite ring closes by itself' } }
const autonomousObjectBeat = validateRelayPlannedDirectorResult(envelope([autonomousOnlyDisc]), autonomousDiscContext).illustrations[0]
assert(!autonomousObjectBeat.requiresRepair && !autonomousObjectBeat.issues.some(issue => issue.code === 'storyboard-visible-prop-action'), 'Storyboard must preserve an explicitly autonomous object event even when a nearby earlier paragraph has handling')

const separatePropActorsContext = {
  ...discActionContext,
  subjects: [...discActionContext.subjects, { name: 'Arin', role: 'character', identity: ['blonde hair'], current: ['ivory cardigan'], pinned: [], superseded: [] }],
  paragraphs: [{ index: 0, text: 'Arin watches from the doorway. Yejin picks up the silver-coated optical disc by its outer rim.' }],
}
const oneActorDisc = { ...actorWithDisc, anchor: { ...actorWithDisc.anchor, anchorExcerpt: 'Yejin picks up the silver-coated optical disc by its outer rim.' } }
assert(!validateRelayPlannedDirectorResult(envelope([oneActorDisc]), separatePropActorsContext).illustrations[0].requiresRepair,
  'A bystander named in another sentence must not inherit Yejin\'s prop action')
assert(!validateRelayPlannedDirectorResult(envelope([oneActorDisc]), {
  ...separatePropActorsContext,
  paragraphs: [{ index: 0, text: 'Arin watches while Yejin picks up the silver-coated optical disc by its outer rim.' }],
}).illustrations[0].issues.some(issue => issue.code === 'storyboard-visible-prop-action'),
  'The actor after while owns the prop action, not the watching subject')
assert(validateRelayPlannedDirectorResult(envelope([objectOnlyDisc]), separatePropActorsContext).illustrations[0].issues
  .some(issue => issue.code === 'storyboard-visible-prop-action' && /Yejin/.test(issue.message) && !/Arin/.test(issue.message)),
  'A prop-only shot must still be rejected for the actual actor only')
assert(validateRelayPlannedDirectorResult(envelope([oneActorDisc]), {
  ...separatePropActorsContext,
  paragraphs: [{ index: 0, text: 'Yejin and Arin lift the silver-coated optical disc together.' }],
}).illustrations[0].issues.some(issue => issue.code === 'storyboard-visible-prop-action' && /Arin/.test(issue.message)),
  'A coordinated subject must retain both actual actors')
for (const ambiguousText of [
  'Yejin watches while she picks up the silver-coated optical disc.',
  'Yejin looks at Arin, holding the silver-coated optical disc.',
]) assert(!validateRelayPlannedDirectorResult(envelope([objectOnlyDisc]), {
  ...separatePropActorsContext,
  paragraphs: [{ index: 0, text: ambiguousText }, discActionContext.paragraphs[1]],
}).illustrations[0].issues.some(issue => issue.code === 'storyboard-visible-prop-action'),
  'The prop-actor guard must not guess an ambiguous pronoun or object-of-preposition owner')

// Live c80da76a, 2026-10-09: the Director depicted Taehyun eating correctly,
// but a capitalized pronoun candidate made the guard demand an actor named His.
const liveSpoonParagraph = 'He picks up the ceramic spoon again, his hand steadying against the handle as he takes a slow, deliberate bite of the warm rice porridge, his dark eyes never leaving her face. Outside the massive glass walls, the amber pinpricks of the media vans blink uselessly against the dark bulk of the northern hills, while inside, the silence remains unbroken—holding them both in the burning, irreversible center of a life he is finally choosing for himself.'
const spoonShot = shot({
  title: 'A First Quiet Bite',
  anchor: { paragraphIndex: 134, insertionSide: 'after', anchorExcerpt: 'He picks up the ceramic spoon again' },
  namedSubjects: ['Taehyun', 'Arin'],
  subjectDirectives: [
    { name: 'Taehyun', role: 'character', appearanceOverrides: [], attireOverrides: [], temporaryTraits: [], expression: 'tired but calmer', pose: 'seated beside Arin', action: 'Taehyun takes a slow bite of juk from a ceramic spoon', gaze: "at Arin's face", contact: '' },
    { name: 'Arin', role: 'character', appearanceOverrides: [], attireOverrides: [], temporaryTraits: [], expression: 'composed', pose: 'seated beside Taehyun', action: 'Arin remains beside him as he eats', gaze: 'toward Taehyun', contact: '' },
  ],
  composition: { ...shot().composition, blocking: 'Taehyun sits beside Arin, lifting a spoonful of juk toward his mouth', importantProps: ['One ceramic bowl of juk', 'One ceramic spoon held by Taehyun', 'Low oak coffee table', 'Heavy wool jacket draped over the sectional'] },
  promptCore: 'Taehyun seated on a cream sectional, taking a slow bite of juk from one ceramic spoon, his gaze fixed on Arin\'s face. Arin sits beside him. One ceramic bowl on the low oak table. View: eye-level medium two-shot.',
})
const spoonContext = { ...context, perspectiveMode: 'storyboard', paragraphs: [{ index: 134, text: liveSpoonParagraph }], subjects: [
  ...['Taehyun', 'Arin', 'His', 'Her', 'Their', 'It'].map(name => ({ name, role: 'character', identity: [], current: [], pinned: [], superseded: [] })),
] }
const spoonValidation = validateRelayPlannedDirectorResult(envelope([spoonShot]), spoonContext).illustrations[0]
assert(!spoonValidation.requiresRepair, `The captured correct spoon action must not require a fictional pronoun actor: ${JSON.stringify(spoonValidation.issues)}`)
assert(validateRelayPlannedDirectorResult(envelope([objectOnlyDisc]), {
  ...discActionContext, subjects: [...discActionContext.subjects, { name: 'His', role: 'character', identity: [], current: [], pinned: [], superseded: [] }],
}).illustrations[0].issues.some(issue => issue.code === 'storyboard-visible-prop-action' && /Yejin/.test(issue.message)),
  'Pronoun filtering must not disable the real missing actor/prop guard')

for (const required of [
  'The current paragraph owns the moment',
  'last confirmed current outfit',
  'Changes are incremental',
  'who owns each hand or prop',
  'the exact contact, if any',
  'reaching is not holding',
  'do not add image-making instructions',
]) assert(REVERIE_RELAY_PLANNED_PROTOCOL.includes(required), `Relay-Planned Story Model contract is missing ${required}`)

const sequenceCompiled = compileRelayPlannedPrompt(shot(), { ...context, perspectiveMode: 'sequence' })
assert.ok(sequenceCompiled.positivePrompt.startsWith('two friends sharing an umbrella in rain, Ria left, Cody right, umbrella centered'), 'Sequence leads with the current beat and screen blocking')
assert.match(sequenceCompiled.positivePrompt, /Ria: [^;]*reaching for the umbrella/, 'Ria keeps ownership of her action')
assert.match(sequenceCompiled.positivePrompt, /Cody: [^;]*offering the umbrella/, 'Cody keeps ownership of his action')
assert.ok(sequenceCompiled.positivePrompt.indexOf('Cody:') < sequenceCompiled.positivePrompt.indexOf('cinematic illustration'), 'Sequence cast/action precedes style tags')

const emotionalCompiled = compileRelayPlannedPrompt(shot(), { ...context, perspectiveMode: 'emotional-beat' })
assert.match(emotionalCompiled.positivePrompt, /Ria: .*surprised smile, turning toward Cody/)
assert.match(emotionalCompiled.positivePrompt, /Cody: .*restrained grin, standing at frame right/)
assert.ok(emotionalCompiled.positivePrompt.indexOf('Ria:') < emotionalCompiled.positivePrompt.indexOf('cinematic illustration'), 'Emotional Beat binds each reaction/action to its subject before provider style tags')

const soloContext = { ...context, perspectiveMode: 'solo-scene', maximumCharacters: 1 }
const solo = validateRelayPlannedDirectorResult(envelope([shot()]), soloContext).illustrations[0]
assert.ok(solo.issues.some(issue => issue.code === 'solo-scene-cast'))
const objectOnly = validateRelayPlannedDirectorResult(envelope([shot({ expectedPeopleCount: 0, namedSubjects: [], subjectDirectives: [] })]), soloContext).illustrations[0]
assert.ok(objectOnly.issues.some(issue => issue.code === 'solo-scene-cast'), 'Char only must reject an object-only crop')
const singleCharacter = validateRelayPlannedDirectorResult(envelope([shot({ expectedPeopleCount: 1, namedSubjects: ['Cody'], subjectDirectives: [shot().subjectDirectives[1]] })]), soloContext).illustrations[0]
assert.ok(!singleCharacter.issues.some(issue => issue.code === 'solo-scene-cast'), 'Char only accepts one actual visible character')
const wrongSelectedSolo = validateRelayPlannedDirectorResult(envelope([shot({ expectedPeopleCount: 1, namedSubjects: ['Ria'], subjectDirectives: [shot().subjectDirectives[0]] })]), { ...soloContext, characterOnlySubjects: ['Cody'] }).illustrations[0]
assert(wrongSelectedSolo.issues.some(issue => issue.code === 'solo-scene-subject'), 'One person is not enough: Character Only must reject the wrong selected identity')
assert(!validateRelayPlannedDirectorResult(envelope([shot({ expectedPeopleCount: 1, namedSubjects: ['Cody'], subjectDirectives: [shot().subjectDirectives[1]] })]), { ...soloContext, characterOnlySubjects: ['Cody'] }).illustrations[0].requiresRepair,
  'Character Only must accept the exact selected actor')
assert(!validateRelayPlannedDirectorResult(envelope([shot({ expectedPeopleCount: 1, namedSubjects: ['Ria'], subjectDirectives: [shot().subjectDirectives[0]] })]), { ...soloContext, characterOnlySubjects: ['Ria'] }).illustrations[0].requiresRepair,
  'An explicit Character Override must remain supported')
assert.match(BOORU_TAG_MODE_VISUAL_PROMPT_GUIDANCE, /include single_mechanical_eye/, 'Booru guidance must retain the established concept tag for unusual anatomy')
assert.match(BOORU_TAG_MODE_VISUAL_PROMPT_GUIDANCE, /separate, recognizable action and object tags/, 'Booru guidance must keep the scene action and critical prop independently visible in tags')
assert.match(BOORU_TAG_MODE_VISUAL_PROMPT_GUIDANCE, /Do not coin multiword relation tags/, 'Booru guidance must not approve underscore phrases as substitute tags')
assert.match(RELAY_PLANNED_BOORU_TAG_MODE_GUIDANCE, /single_mechanical_eye/, 'Director tag guidance must retain established anatomy concepts')
for (const guidance of [BOORU_TAG_MODE_VISUAL_PROMPT_GUIDANCE, BOORU_TAG_MODE_PARSER_GUIDANCE, RELAY_PLANNED_BOORU_TAG_MODE_GUIDANCE]) {
  assert.match(guidance, /(?:hand placement|hands actually rest)/, 'Both image planning modes must preserve visible hand placement for no-contact beats')
  assert.match(guidance, /(?:separate object|object's separate position)/, 'No-contact Booru prompts must place the untouched object apart from hands')
}

const backend = readFileSync(new URL('../src/backend.ts', import.meta.url), 'utf8')
for (const protocol of [REVERIE_ILLUSTRATION_PROTOCOL, REVERIE_INLINE_PROTOCOL]) {
  assert.match(protocol, /immediately after the prose paragraph it depicts/, 'Illustration tag must be emitted directly after its source paragraph')
  assert.match(protocol, /paragraph directly above the opening tag is the only story beat/, 'Each tag must map to the paragraph directly above it')
  assert.match(protocol, /Write enough specific, unambiguous visual detail/, 'Image prompt must describe the source event faithfully, not approximately')
  assert.match(protocol, /A spooning beat must say who is behind whom/, 'Complex physical blocking must be explicitly authored')
}
assert.equal(PROMPT_REGISTRY_DEFINITIONS.find(definition => definition.id === 'story.model-placed')?.version, 6, 'XML Model-Placed contract version')
assert.equal(PROMPT_REGISTRY_DEFINITIONS.find(definition => definition.id === 'story.inline-protocol')?.version, 10, 'XML Model Planned contract version')
assert.equal(PROMPT_REGISTRY_DEFINITIONS.find(definition => definition.id === 'story.relay-planned')?.version, 5, 'Relay-Planned continuity contract version')
assert.match(backend, /'story\.model-placed': \['4125:05d30e81', '8722:29aa7ccd'\]/, 'Legacy stock Model-Placed prompts migrate to the bracket paragraph-locked default')
assert.match(backend, /'story\.inline-protocol': \['751:58ec8abc', '9481:878d0951', '12351:8f280e39', '12370:7d37ba18', '13138:8404697d', '15872:e257a1a3', '10293:71eea49d'\]/, 'Legacy stock Inline prompts migrate to the bracket Model Planned default')
assert.match(backend, /'story\.relay-planned': \['800:b83ca877', '1867:08747a40'\]/, 'Legacy stock Relay-Planned prompts migrate to the continuity-focused default')
assert.match(backend, /if \(!input\.dryRun && input\.settings\.appearanceMemoryEnabled\) await ensureAppearanceReadyForTurn\([\s\S]*?state: await getState\(input\.chatId, input\.userId\)/, 'Completed-turn Appearance refresh must settle before the Director reads its snapshot; previews must not refresh')
assert.match(RELAY_PLANNED_DIRECTOR_REQUEST_TEMPLATE, /\{\{latestUserVisualContext\}\}/, 'Director request includes the latest user visual facts when continuity state is incomplete')
assert.match(RELAY_PLANNED_DIRECTOR_SYSTEM_PROMPT, /blank current-state array is not evidence that the outfit disappeared/i, 'Director must retain a confirmed outfit when Appearance state has a gap')
assert.match(backend, /latestUserMessage[\s\S]*?sanitizeRecentVisualContext\(getSwipeContent\(latestUserMessage/, 'Director uses the immediately preceding user message as bounded visual evidence')
assert.match(backend, /analyzeRelayPlannedResponse\([\s\S]*?relayPlannedDirectorMessages/, 'Production uses the shared Director pipeline')
assert(backend.includes('CHAR ONLY CAST CONTRACT: The only allowed visible character is') && backend.includes('that exact established character is actually visible'), 'Director must require the selected Character Only identity, not any one person')
assert(backend.includes('CHAR ONLY REPAIR: The only allowed visible character is') && backend.includes('An object-only shot cannot pass by merely changing expectedPeopleCount'), 'Repair must retain the selected actor and re-anchor a character-visible source paragraph or decline')
assert.match(backend, /payload\.kind === 'relay-planned'[\s\S]*?analyzeRelayPlannedResponse/, 'Dry Run uses the production analyzer')
assert.match(backend, /plan\.plannerVersion !== RELAY_PLANNED_V2/, 'Relay-Planned 2.0 cannot fall back to the legacy Composer')
assert.match(backend, /parserRequested: !locallyCompiledRelayPlan,[\s\S]*?parserDecision: locallyCompiledRelayPlan[\s\S]*?Relay-Planned 2\.0 local compiler/, 'Local compiler output is not reported as a Parser call')
assert.match(backend, /imageGenerationCalls: 0 as const/, 'Dry Run declares zero image calls')
assert.match(backend, /source: 'model-placed-recovery-once',[\s\S]{0,180}suppressAutoDispatch: true/, 'Relay-Planned once must suppress discovery-time auto-dispatch')
assert.match(backend, /handleAutoOpportunityDispatch\(chatId, accepted, userId, \{ forceHandsOff: true \}\)/, 'Relay-Planned once must perform one explicit hands-off dispatch')
assert.match(backend, /isHandsOffProseMode\(settings\) && !input\.suppressAutoDispatch/, 'ordinary Relay-Planned discovery must retain automatic dispatch without duplicating the once path')

const foldingContext = { ...context, perspectiveMode: 'storyboard', promptFormat: 'danbooru-tags', paragraphs: [{ index: 1, text: 'Ria laid the pencil down beside the ruler. She folded the paper in half.' }] }
const foldingShot = shot({
  anchor: { paragraphIndex: 1, insertionSide: 'after', anchorExcerpt: 'She folded the paper in half.' },
  expectedPeopleCount: 1, namedSubjects: ['Ria'],
  subjectDirectives: [{ ...shot().subjectDirectives[0], action: 'folding the paper in half', pose: 'leaning over the table', contact: 'both hands on the paper' }],
  promptCore: 'Ria folding the paper in half.', booruTags: ['1girl', 'folding', 'paper', 'pencil', 'ruler'],
})
const cleanedFold = validateRelayPlannedDirectorResult(envelope([foldingShot]), foldingContext).illustrations[0]
assert(cleanedFold.issues.some(issue => issue.code === 'scene-idle-tool-omitted' && issue.repair === 'local'))
assert(!cleanedFold.requiresRepair, 'explicit idle-tool omission should not spend a model call')
const foldCompiled = compileRelayPlannedPrompt(cleanedFold.illustration, foldingContext, { tagMode: true })
assert.equal(foldCompiled.positivePrompt, '1girl, folding, paper, ruler')
assert(!foldCompiled.positivePrompt.includes('Cody'), 'stale Director blocking must not reintroduce a known subject omitted from this frame')
assert.equal(foldCompiled.sceneContract?.sourceParagraph, foldingContext.paragraphs[0].text, 'the complete paragraph, not only its excerpt, must survive compilation')
const savedFoldComposition = { rawOutput: { plannerVersion: RELAY_PLANNED_V2, sceneContract: foldCompiled.sceneContract } }
assert.equal(relayPlannedAuthoritativeParagraph(savedFoldComposition, foldingShot.anchor.anchorExcerpt), foldingContext.paragraphs[0].text,
  'synthetic slot creation and record-based regeneration need the same unabridged paragraph')
assert.equal(relayPlannedAuthoritativeParagraph(savedFoldComposition, 'A different scene.'), '', 'an unrelated excerpt cannot hydrate this contract')
assert.equal(relayPlannedAuthoritativeParagraph({ rawOutput: { ...savedFoldComposition.rawOutput, plannerVersion: 'legacy' } }, foldingShot.anchor.anchorExcerpt), '', 'unversioned output is not an authoritative source')
assert.match(backend, /authoritativeSourceParagraph: relayPlannedAuthoritativeParagraph\(plan\.promptComposition, plan\.selectedExcerpt\)/, 'automatic dispatch must persist the source on its synthetic slot, not only construct a Dry Run job')
assert.match(backend, /function jobFromRecord[\s\S]{0,750}relayPlannedAuthoritativeParagraph\(record\.prosePromptComposition/, 'record-based regeneration must recover an older missing source field from the validated contract')
const unabridgedFoldContext = { ...foldingContext, paragraphs: [{ index: 1, text: 'She folded the paper in half.', sourceText: foldingContext.paragraphs[0].text }] }
assert.equal(compileRelayPlannedPrompt(cleanedFold.illustration, unabridgedFoldContext, { tagMode: true }).sceneContract?.sourceParagraph,
  foldingContext.paragraphs[0].text, 'bounded Director text must not truncate the local authoritative scene contract')
assert.deepEqual(foldCompiled.sceneContract?.actors[0].current, ['black coat'], 'owned confirmed wardrobe must survive in the shared contract')
const wrongFold = validateRelayPlannedDirectorResult(envelope([{ ...foldingShot, booruTags: ['1girl', 'writing', 'paper', 'holding_pencil'] }]), foldingContext).illustrations[0]
assert(wrongFold.requiresRepair && wrongFold.issues.some(issue => issue.code === 'scene-action-missing'))
assert.throws(() => compileRelayPlannedPrompt(wrongFold.illustration, foldingContext, { tagMode: true }), /Storyboard scene contract/, 'direct compiler consumers cannot bypass scene validation')
assert(sceneOnlyRepairPreservesPlan(foldingShot, { ...foldingShot, booruTags: [...foldingShot.booruTags!, 'creasing'] }))
assert(!sceneOnlyRepairPreservesPlan(foldingShot, { ...foldingShot, booruTags: [...foldingShot.booruTags!, 'red_dress'] }), 'targeted tag repair cannot silently add an outfit')
assert(!sceneOnlyRepairPreservesPlan(foldingShot, { ...foldingShot, booruTags: foldingShot.booruTags!.filter(tag => tag !== 'ruler') }), 'targeted tag repair cannot erase valid non-action facts')
assert(!sceneOnlyRepairPreservesPlan(foldingShot, { ...foldingShot, anchor: { ...foldingShot.anchor, paragraphIndex: 0 } }), 'targeted repair cannot change anchor')
assert(!sceneOnlyRepairPreservesPlan(foldingShot, { ...foldingShot, namedSubjects: ['Cody'] }), 'targeted repair cannot replace an actor')
assert(!sceneOnlyRepairPreservesPlan(foldingShot, { ...foldingShot, subjectDirectives: [{ ...foldingShot.subjectDirectives[0], attireOverrides: ['red coat'] }] }), 'targeted repair cannot rewrite an outfit')
const nameOnly = compileRelayPlannedPrompt(shot({ promptCore: 'Ria and Cody stand in the rain.' }), { ...context, perspectiveMode: 'storyboard' })
assert.match(nameOnly.positivePrompt, /Ria: [^.]*reaching for the umbrella/, 'a name alone cannot suppress its owned action')
assert.match(nameOnly.positivePrompt, /Cody: [^.]*offering the umbrella/, 'both actors need their own preserved action')
console.log('Phase 6 Relay-Planned 2.0 smoke passed: bounded Director output, local validation/compiler, shared scene guard, action-only repair preservation, and simulation-only Dry Run contracts are present.')
