// @ts-nocheck -- deterministic offline Phase 6 contract gate.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  RELAY_PLANNED_V2,
  compileRelayPlannedPrompt,
  previousSequenceShotContext,
  validateRelayPlannedDirectorResult,
  type RelayPlannedContext,
  type RelayPlannedIllustration,
} from '../src/relayPlannedV2'
import { RELAY_PLANNED_DIRECTOR_SYSTEM_PROMPT } from '../src/promptRegistryAssets028'
import { PROMPT_REGISTRY_DEFINITIONS, REVERIE_ILLUSTRATION_PROTOCOL, REVERIE_INLINE_PROTOCOL, REVERIE_RELAY_PLANNED_PROTOCOL } from '../src/protocols'

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

const compiled = compileRelayPlannedPrompt(shot({ promptCore: 'green_eyes, red umbrella, green eyes' }), context, { qualitySuffix: 'refined detail', globalNegative: 'bad anatomy, extra limbs' })
assert.ok(compiled.positivePrompt.indexOf('long amethyst hair') < compiled.positivePrompt.indexOf('black coat'), 'Canonical identity precedes current appearance')
assert.equal((compiled.positivePrompt.match(/green eyes/gi) || []).length, 1, 'Exact underscore/space duplicates collapse')
assert.equal((compiled.negativePrompt.match(/bad anatomy/gi) || []).length, 1, 'Global negative fragments collapse')
assert.ok(compiled.positivePrompt.includes('medium two-shot'))
assert.ok(compiled.positivePrompt.includes('character reference ref-ria'))

const snapshotCompiled = compileRelayPlannedPrompt(shot(), { ...context, perspectiveMode: 'scene-snapshot' })
assert.match(snapshotCompiled.positivePrompt, /Ria: .*black coat.*reaching for the umbrella/, 'Scene Snapshot must keep Ria\'s outfit and action bound to Ria')
assert.match(snapshotCompiled.positivePrompt, /Cody: .*red scarf.*offering the umbrella.*right hand holds the umbrella handle/, 'Scene Snapshot must keep Cody\'s outfit, action, and prop ownership bound to Cody')
assert.ok(snapshotCompiled.positivePrompt.indexOf('Ria:') < snapshotCompiled.positivePrompt.indexOf('cinematic illustration'), 'Scene Snapshot must put owner-scoped blocking before style tags')

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

const backend = readFileSync(new URL('../src/backend.ts', import.meta.url), 'utf8')
for (const protocol of [REVERIE_ILLUSTRATION_PROTOCOL, REVERIE_INLINE_PROTOCOL]) {
  assert.match(protocol, /immediately after the prose paragraph it depicts/, 'Illustration tag must be emitted directly after its source paragraph')
  assert.match(protocol, /paragraph directly above the opening tag is the only story beat/, 'Each tag must map to the paragraph directly above it')
  assert.match(protocol, /Write enough specific, unambiguous visual detail/, 'Image prompt must describe the source event faithfully, not approximately')
  assert.match(protocol, /A spooning beat must say who is behind whom/, 'Complex physical blocking must be explicitly authored')
}
assert.equal(PROMPT_REGISTRY_DEFINITIONS.find(definition => definition.id === 'story.model-placed')?.version, 4, 'legacy Model-Placed contract version')
assert.equal(PROMPT_REGISTRY_DEFINITIONS.find(definition => definition.id === 'story.inline-protocol')?.version, 8, 'Model Planned contract version')
assert.equal(PROMPT_REGISTRY_DEFINITIONS.find(definition => definition.id === 'story.relay-planned')?.version, 5, 'Relay-Planned continuity contract version')
assert.match(backend, /'story\.model-placed': \['4125:05d30e81'\]/, 'Legacy stock Model-Placed prompt migrates to the paragraph-locked default')
assert.match(backend, /'story\.inline-protocol': \['751:58ec8abc', '9481:878d0951', '12351:8f280e39', '12370:7d37ba18', '13138:8404697d', '15872:e257a1a3'\]/, 'Legacy stock Inline prompts migrate to the compact Model Planned default')
assert.match(backend, /'story\.relay-planned': \['800:b83ca877', '1867:08747a40'\]/, 'Legacy stock Relay-Planned prompts migrate to the continuity-focused default')
assert.match(backend, /void ensureAppearanceReadyForTurn\([\s\S]*?appearance-nonblocking/, 'Appearance refresh is nonblocking')
assert.match(backend, /analyzeRelayPlannedResponse\([\s\S]*?relayPlannedDirectorMessages/, 'Production uses the shared Director pipeline')
assert.match(backend, /payload\.kind === 'relay-planned'[\s\S]*?analyzeRelayPlannedResponse/, 'Dry Run uses the production analyzer')
assert.match(backend, /plan\.plannerVersion !== RELAY_PLANNED_V2/, 'Relay-Planned 2.0 cannot fall back to the legacy Composer')
assert.match(backend, /parserRequested: !locallyCompiledRelayPlan,[\s\S]*?parserDecision: locallyCompiledRelayPlan[\s\S]*?Relay-Planned 2\.0 local compiler/, 'Local compiler output is not reported as a Parser call')
assert.match(backend, /imageGenerationCalls: 0 as const/, 'Dry Run declares zero image calls')
assert.match(backend, /source: 'model-placed-recovery-once',[\s\S]{0,180}suppressAutoDispatch: true/, 'Relay-Planned once must suppress discovery-time auto-dispatch')
assert.match(backend, /handleAutoOpportunityDispatch\(chatId, accepted, userId, \{ forceHandsOff: true \}\)/, 'Relay-Planned once must perform one explicit hands-off dispatch')
assert.match(backend, /isHandsOffProseMode\(settings\) && !input\.suppressAutoDispatch/, 'ordinary Relay-Planned discovery must retain automatic dispatch without duplicating the once path')

console.log('Phase 6 Relay-Planned 2.0 smoke passed: bounded Director output, local validation/compiler, ambiguity-only repair routing, and simulation-only Dry Run contracts are present.')
