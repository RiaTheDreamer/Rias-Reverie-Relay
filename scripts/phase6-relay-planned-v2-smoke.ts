// @ts-nocheck -- deterministic offline Phase 6 contract gate.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  RELAY_PLANNED_V2,
  compileRelayPlannedPrompt,
  validateRelayPlannedDirectorResult,
  type RelayPlannedContext,
  type RelayPlannedIllustration,
} from '../src/relayPlannedV2'

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

const compiled = compileRelayPlannedPrompt(shot({ promptCore: 'green_eyes, red umbrella, green eyes' }), context, { qualitySuffix: 'refined detail', globalNegative: 'bad anatomy, extra limbs' })
assert.ok(compiled.positivePrompt.indexOf('long amethyst hair') < compiled.positivePrompt.indexOf('black coat'), 'Canonical identity precedes current appearance')
assert.equal((compiled.positivePrompt.match(/green eyes/gi) || []).length, 1, 'Exact underscore/space duplicates collapse')
assert.equal((compiled.negativePrompt.match(/bad anatomy/gi) || []).length, 1, 'Global negative fragments collapse')
assert.ok(compiled.positivePrompt.includes('medium two-shot'))
assert.ok(compiled.positivePrompt.includes('character reference ref-ria'))

const soloContext = { ...context, perspectiveMode: 'solo-scene', maximumCharacters: 1 }
const solo = validateRelayPlannedDirectorResult(envelope([shot()]), soloContext).illustrations[0]
assert.ok(solo.issues.some(issue => issue.code === 'solo-scene-cast'))

const backend = readFileSync(new URL('../src/backend.ts', import.meta.url), 'utf8')
assert.match(backend, /void ensureAppearanceReadyForTurn\([\s\S]*?appearance-nonblocking/, 'Appearance refresh is nonblocking')
assert.match(backend, /analyzeRelayPlannedResponse\([\s\S]*?relayPlannedDirectorMessages/, 'Production uses the shared Director pipeline')
assert.match(backend, /payload\.kind === 'relay-planned'[\s\S]*?analyzeRelayPlannedResponse/, 'Dry Run uses the production analyzer')
assert.match(backend, /plan\.plannerVersion !== RELAY_PLANNED_V2/, 'Relay-Planned 2.0 cannot fall back to the legacy Composer')
assert.match(backend, /parserRequested: false,[\s\S]*?Relay-Planned 2\.0 local compiler/, 'Local compiler output is not reported as a Parser call')
assert.match(backend, /imageGenerationCalls: 0 as const/, 'Dry Run declares zero image calls')

console.log('Phase 6 Relay-Planned 2.0 smoke passed: bounded Director output, local validation/compiler, ambiguity-only repair routing, and simulation-only Dry Run contracts are present.')
