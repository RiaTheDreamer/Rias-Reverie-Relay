// @ts-nocheck -- production compiler and final parser shaping, no provider spend.
import assert from 'node:assert/strict'
import { compileRelayPlannedPrompt, validateRelayPlannedDirectorResult, RELAY_PLANNED_V2 } from '../src/relayPlannedV2'
import { booruSubjectOwnershipChanged, normalizeBooruTagPrompt } from '../src/booruTags'

const character = { name: 'Mira', role: 'character', appearanceOverrides: [], attireOverrides: [], temporaryTraits: [], expression: 'calm', pose: 'Mira standing frame-left', action: 'Mira holding a cup', contact: '', gaze: 'toward the window', booruTags: ['1girl', 'short_hair', 'black_hair', 'blue_eyes', 'black_jacket', 'standing', 'holding', 'cup'] }
const persona = { ...character, name: 'Yuna', role: 'persona', pose: 'Yuna seated frame-right', action: 'Yuna reading a book', booruTags: ['1girl', 'long_hair', 'blonde_hair', 'blue_eyes', 'white_dress', 'sitting', 'reading', 'book'] }
const context = { version: RELAY_PLANNED_V2, chatId: 'groups', messageId: 'groups-message', swipeId: 0, maximumIllustrations: 2, maximumCharacters: 3, maximumPromptCharacters: 6000, perspectiveMode: 'scene-snapshot', promptFormat: 'danbooru-tags', defaultAspectRatio: '4:3', promptStyle: '', adultMode: false, paragraphs: [{ index: 0, text: 'Mira holds a cup at the left of the room. Yuna sits at the right reading a book.' }], subjects: [{ name: 'Mira', role: 'character', identity: ['short black hair', 'blue eyes'], current: ['black jacket'], pinned: [], superseded: [] }, { name: 'Yuna', role: 'persona', identity: ['long blonde hair', 'blue eyes'], current: ['white dress'], pinned: [], superseded: [] }], referenceAssetIds: [], locationReferenceAssetIds: [], priorIllustrations: [], globalNegativeRequirements: [] }
const shot = { rank: 1, title: 'Separate subjects', reason: 'Grounded still', anchor: { paragraphIndex: 0, insertionSide: 'after', anchorExcerpt: 'Mira holds a cup' }, aspectRatio: '4:3', expectedPeopleCount: 2, namedSubjects: ['Mira', 'Yuna'], omittedSubjects: [], subjectDirectives: [character, persona], composition: { shotType: 'wide shot', cameraAngle: 'eye level', framing: 'full body', blocking: 'Mira left, Yuna right, a clear gap between them', foreground: '', background: 'curtains', location: 'room', timeOfDay: 'night', lighting: 'warm lamp', mood: 'quiet', importantProps: ['cup', 'book'], backgroundPeople: '' }, promptCore: context.paragraphs[0].text, booruTags: ['indoors', 'night', 'window'], negativeCore: '', referenceAssetIds: [], locationReferenceAssetIds: [] }

for (const framing of ['scene-snapshot', 'sequence', 'emotional-beat', 'solo-scene', 'persona-pov', 'storyboard']) {
  const single = framing === 'solo-scene' || framing === 'persona-pov'
  const actual = single ? { ...shot, expectedPeopleCount: 1, namedSubjects: ['Mira'], subjectDirectives: [character], composition: { ...shot.composition, blocking: 'Mira frame-left' } } : shot
  const compiled = compileRelayPlannedPrompt(actual, { ...context, perspectiveMode: framing }, { tagMode: true }).positivePrompt
  assert.match(compiled, /^1girl, short_hair, black_hair, blue_eyes, black_jacket/, `${framing}: identity and outfit must directly follow the owning subject marker`)
  assert.match(compiled, /Mira standing frame-left/, `${framing}: spatial pose must stay inside its subject block`)
  if (!single) {
    assert.match(compiled, /Mira standing frame-left[\s\S]*1girl, long_hair, blonde_hair, blue_eyes, white_dress[\s\S]*Yuna seated frame-right/)
    assert.equal(compiled.split(',').filter(tag => tag.trim() === '1girl').length, 2, 'equal subject markers must survive cross-subject deduplication')
    assert.equal(compiled.split(',').filter(tag => tag.trim() === 'blue_eyes').length, 2, 'shared traits must remain repeated within each owner block')
  }
  assert.equal(normalizeBooruTagPrompt(compiled), compiled, 'final provider normalization must preserve scoped markers, traits and positions')
}
const envelope = row => JSON.stringify({ shouldIllustrate: true, reason: 'Grounded', illustrations: [row] })
assert(!validateRelayPlannedDirectorResult(envelope(shot), context).illustrations[0].requiresRepair)
const anonymous = { ...shot, subjectDirectives: shot.subjectDirectives.map(({ booruTags, ...row }) => row), booruTags: ['1girl', '1girl', 'short_hair', 'blonde_hair', 'black_jacket', 'white_dress', 'indoors'] }
assert(validateRelayPlannedDirectorResult(envelope(anonymous), context).illustrations[0].issues.some(issue => issue.code === 'booru-subject-ownership'), 'a multi-subject anonymous appearance pile must request bounded repair')
assert.throws(() => compileRelayPlannedPrompt(anonymous, context, { tagMode: true }), /subject.*Booru|Booru.*subject/i)
const singleSceneryOnly = { ...shot, expectedPeopleCount: 1, namedSubjects: ['Mira'], subjectDirectives: [{ ...character, booruTags: [] }] }
assert(validateRelayPlannedDirectorResult(envelope(singleSceneryOnly), context).illustrations[0].issues.some(issue => issue.code === 'booru-subject-ownership'), 'a visible single subject cannot silently compile to scenery-only tags')
assert.throws(() => compileRelayPlannedPrompt(singleSceneryOnly, context, { tagMode: true }), /scenery-only tags require repair/)
const legacySingle = { ...singleSceneryOnly, booruTags: ['1girl', 'short_hair', 'black_hair', 'black_jacket', 'standing', 'frame_left', 'indoors'] }
assert.match(compileRelayPlannedPrompt(legacySingle, context, { tagMode: true }).positivePrompt, /1girl, short_hair, black_hair, black_jacket, standing, frame_left/)
const stalePosition = { ...singleSceneryOnly, subjectDirectives: [{ ...character, gaze: 'at Yuna', blocking: 'Mira beside Yuna' }] }
const stalePositionPrompt = compileRelayPlannedPrompt(stalePosition, context, { tagMode: true }).positivePrompt
assert(!stalePositionPrompt.includes('Yuna'), 'owner-scoped positioning cannot reintroduce a known subject omitted from the frame')
assert(stalePositionPrompt.includes('Mira standing frame-left'), 'dropping a stale relation must retain valid owned positioning')
const animal = { ...persona, name: 'Dog', role: 'animal', pose: 'Dog beside Mira at frame-left', action: '', booruTags: ['1animal', 'dog', 'brown_fur', 'sitting'] }
const animalShot = { ...shot, expectedPeopleCount: 1, namedSubjects: ['Mira', 'Dog'], subjectDirectives: [character, animal] }
const animalContext = { ...context, subjects: [context.subjects[0], { name: 'Dog', role: 'animal', identity: ['brown fur'], current: [], pinned: [], superseded: [] }] }
assert.match(compileRelayPlannedPrompt(animalShot, animalContext, { tagMode: true }).positivePrompt, /1animal, dog, brown_fur, sitting[\s\S]*Dog beside Mira/)
assert(normalizeBooruTagPrompt('1girl, blue_eyes, blue_eyes, 1girl, blue_eyes, long_hair').includes('1girl, blue_eyes, 1girl, blue_eyes, long_hair'), 'deduplicate within, not across, subject groups')
assert.throws(() => normalizeBooruTagPrompt('1girl, 1girl, 1girl'), /at least three/, 'repeated owner markers cannot masquerade as three useful visual concepts')
const original = '1girl, short_hair, black_jacket, standing, 1girl, long_hair, white_dress, sitting, indoors'
assert(!booruSubjectOwnershipChanged(original, original.replace('standing','holding')))
assert(booruSubjectOwnershipChanged(original,'1girl, long_hair, white_dress, standing, 1girl, short_hair, black_jacket, sitting, indoors'))
assert(booruSubjectOwnershipChanged(original,'2girls, short_hair, long_hair, black_jacket, white_dress, indoors'))
console.log('Relay Booru subject groups passed: all six framings, per-owner appearance/outfit/position, repeated gender/traits, animals, legacy ambiguity and final normalization.')
