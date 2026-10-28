// @ts-nocheck -- deterministic production count/selection contract tests.
import assert from 'node:assert/strict'
import * as relay from '../src/relayPlannedV2'

const context = {
  version: relay.RELAY_PLANNED_V2, chatId: 'count-chat', messageId: 'count-message', swipeId: 0,
  minimumIllustrations: 2, maximumIllustrations: 2, countMode: 'fixed', frequencyMode: 'every-eligible',
  maximumCharacters: 1, maximumPromptCharacters: 6000, perspectiveMode: 'scene-snapshot',
  defaultAspectRatio: '4:3', promptStyle: '', adultMode: false,
  paragraphs: [{ index: 0, text: 'Mira stands beside the table. She raises a cup. She folds a coat.' }],
  subjects: [{ name: 'Mira', role: 'character', identity: [], current: [], pinned: [], superseded: [] }],
  referenceAssetIds: [], locationReferenceAssetIds: [], priorIllustrations: [], globalNegativeRequirements: [],
}
const shots = ['Mira stands beside the table.', 'She raises a cup.', 'She folds a coat.'].map((excerpt, index) => ({
  rank: index + 1, title: `Shot ${index + 1}`, reason: 'A source-grounded moment.',
  anchor: { paragraphIndex: 0, insertionSide: 'after', anchorExcerpt: excerpt },
  aspectRatio: '4:3', expectedPeopleCount: 1, namedSubjects: ['Mira'], omittedSubjects: [],
  subjectDirectives: [{ name: 'Mira', role: 'character', appearanceOverrides: [], attireOverrides: [], temporaryTraits: [], expression: 'calm', pose: 'standing', action: excerpt, gaze: 'toward the table', contact: '' }],
  composition: { shotType: 'medium shot', cameraAngle: 'eye level', framing: 'waist up', blocking: 'Mira left of the table', foreground: '', background: 'white wall', location: 'rehearsal room', timeOfDay: 'evening', lighting: 'warm lamp', mood: 'calm', importantProps: [], backgroundPeople: '' },
  promptCore: excerpt, negativeCore: '', referenceAssetIds: [], locationReferenceAssetIds: [],
}))
const envelope = (rows, shouldIllustrate = true) => JSON.stringify({ shouldIllustrate, reason: 'Distinct moments.', illustrations: rows })
const messages = [{ role: 'system', content: 'Original source and schema.' }]
let calls = 0
const recovered = await relay.runRelayPlannedDirectorWithFrequency(messages, context, async request => {
  calls++
  if (calls === 1) return envelope(shots.slice(0, 1))
  assert.equal(request[0].content, messages[0].content)
  assert.match(request.at(-1).content, /count-contract failure/)
  return envelope(shots.slice(0, 2))
})
assert.equal(calls, 2, 'a one-shot response must not satisfy a fixed two-shot contract')
assert.equal(recovered.validated.illustrations.filter(row => !row.rejected).length, 2)

for (const count of [1, 2, 32]) {
  assert.deepEqual(relay.relayPlannedIllustrationCountBounds({ modelPlacedCountMode: 'fixed', illustrationsPerRun: count, minimumImages: 1, maximumImages: 32 }, 32), { countMode: 'fixed', minimumIllustrations: count, maximumIllustrations: count })
}
assert.deepEqual(relay.relayPlannedIllustrationCountBounds({ modelPlacedCountMode: 'range', illustrationsPerRun: 1, minimumImages: 2, maximumImages: 4 }, 32), { countMode: 'range', minimumIllustrations: 2, maximumIllustrations: 4 })
assert.deepEqual(relay.relayPlannedIllustrationCountBounds({ modelPlacedCountMode: 'fixed', illustrationsPerRun: 4 }, 1), { countMode: 'fixed', minimumIllustrations: 1, maximumIllustrations: 1 }, 'remaining saved-message capacity caps the batch')
assert.equal(relay.relayPlannedIllustrationCountBounds({ modelPlacedCountMode: 'range', minimumImages: 2, maximumImages: 4 }, 0).maximumIllustrations, 0)
assert.match(relay.relayPlannedCountDirective(context), /exactly 2/)
assert.match(relay.relayPlannedCountDirective({ ...context, countMode: 'range', maximumIllustrations: 4 }), /2 through 4/)

calls = 0
const inRange = await relay.runRelayPlannedDirectorWithFrequency(messages, { ...context, countMode: 'range', maximumIllustrations: 3 }, async () => { calls++; return envelope(shots) })
assert.equal(calls, 1, 'a count within the inclusive range does not spend a retry')
assert.equal(inRange.validated.illustrations.length, 3)
calls = 0
const short = await relay.runRelayPlannedDirectorWithFrequency(messages, context, async () => { calls++; return envelope(shots.slice(0, 1)) })
assert.equal(calls, 2)
assert.equal(short.validated.illustrations.length, 1, 'keep a safe validated shot after a bounded count shortfall, never fabricate duplicates')
assert(short.validated.warnings.some(warning => /count shortfall/i.test(warning)), 'persistent underproduction must be visible, not reported as the requested count')
calls = 0
const declined = await relay.runRelayPlannedDirectorWithFrequency(messages, { ...context, frequencyMode: 'key-moments' }, async () => { calls++; return envelope([], false) })
assert.equal(calls, 1, 'key-moment frequency may decline; exact count only applies when selected')
assert.equal(declined.validated.shouldIllustrate, false)

// A manual Plan Latest click selects this response, independently of automatic
// frequency. Only Emotional Beat may decline for lacking a suitable moment.
for (const perspectiveMode of ['scene-snapshot', 'sequence', 'emotional-beat', 'solo-scene', 'persona-pov', 'storyboard', 'blocking-fidelity']) {
  for (const frequencyMode of ['key-moments', 'every-eligible', 'every-n']) {
    const manualContext = { ...context, manualRequest: true, perspectiveMode, frequencyMode, minimumIllustrations: 1, maximumIllustrations: 1, characterOnlySubjects: ['Mira'], cameraHolderNames: ['Alex'] }
    const emotional = perspectiveMode === 'emotional-beat'
    assert.equal(relay.relayPlannedFrequencyRequiresIllustration(manualContext), !emotional, `${perspectiveMode}/${frequencyMode}: manual selection must override the automatic frequency policy`)
    assert.match(relay.relayPlannedFrequencyDirective(manualContext), emotional ? /emotional moment/i : /manual.*quiet/i)
    assert.doesNotMatch(relay.relayPlannedCountDirective(manualContext), /key-moment policy may decline/)
    let manualCalls = 0
    const manualResult = await relay.runRelayPlannedDirectorWithFrequency(messages, manualContext, async request => {
      manualCalls++
      if (manualCalls === 1 || emotional) return envelope([], false)
      assert.match(request.at(-1).content, /manual.*quiet/i)
      return envelope(shots.slice(0, 1))
    })
    assert.equal(manualCalls, emotional ? 1 : 2)
    assert.equal(manualResult.validated.shouldIllustrate, !emotional)
    assert.equal(manualResult.validated.illustrations.filter(row => !row.rejected).length, emotional ? 0 : 1)
  }
}
calls = 0
await assert.rejects(relay.runRelayPlannedDirectorWithFrequency(messages, { ...context, manualRequest: true, frequencyMode: 'key-moments' }, async () => {
  calls++; return envelope([], false)
}), /manual request.*no usable source-grounded shot/i)
assert.equal(calls, 2, 'manual selection shares the existing single retry; it cannot cause an unbounded planning loop')
calls = 0
let preparations = 0
const afterRepair = await relay.runRelayPlannedDirectorWithFrequency(messages, context, async () => { calls++; return envelope(shots.slice(0, 2)) }, async validated => {
  preparations++
  return { ...validated, illustrations: preparations === 1 ? validated.illustrations.slice(0, 1) : validated.illustrations }
})
assert.equal(calls, 2, 'count is checked after structural repair, not only before failed shots are discarded')
assert.equal(afterRepair.validated.illustrations.length, 2)
calls = 0
let optionalPreparations = 0
const optionalAfterRepair = await relay.runRelayPlannedDirectorWithFrequency(messages, { ...context, frequencyMode: 'key-moments' }, async () => { calls++; return envelope(shots.slice(0, 2)) }, async validated => {
  optionalPreparations++
  return optionalPreparations === 1 ? { ...validated, shouldIllustrate: false, illustrations: [] } : validated
})
assert.equal(calls, 2, 'a selected key moment cannot silently decline after repair discarded its shots')
assert.equal(optionalAfterRepair.validated.illustrations.length, 2)
calls = 0
await assert.rejects(relay.runRelayPlannedDirectorWithFrequency(messages, { ...context, frequencyMode: 'key-moments' }, async () => { calls++; return envelope([], true) }), /count shortfall, not a key-moment decline/)
assert.equal(calls, 2)
calls = 0
const preserveBest = await relay.runRelayPlannedDirectorWithFrequency(messages, { ...context, minimumIllustrations: 3, maximumIllustrations: 3 }, async () => { calls++; return envelope(shots.slice(0, calls === 1 ? 2 : 1)) })
assert.equal(preserveBest.validated.illustrations.length, 2, 'a worse retry must not erase previously validated shots')
assert(preserveBest.validated.warnings.some(warning => /count shortfall/.test(warning)))
calls = 0
await assert.rejects(relay.runRelayPlannedDirectorWithFrequency(messages, context, async () => { calls++; throw new Error('Operation cancelled by user.') }), /cancelled/)
assert.equal(calls, 1, 'abort/provider errors cannot launch successor retries')
calls = 0
await assert.rejects(relay.runRelayPlannedDirectorWithFrequency(messages, context, async () => { calls++; return envelope(shots.slice(0, 2)) }, async () => { throw new Error('Operation cancelled by user.') }), /cancelled/)
assert.equal(calls, 1, 'abort during structural repair cannot start a count retry')

for (const typedError of [false, true]) {
  calls = 0
  const fromEmpty = await relay.runRelayPlannedDirectorWithFrequency(messages, context, async request => {
    calls++
    if (calls === 1) {
      if (typedError) throw new relay.EmptyDirectorResponseError()
      return '   '
    }
    assert.match(request.at(-1).content, /empty-response failure/)
    return envelope(shots.slice(0, 2))
  })
  assert.equal(calls, 2, 'an empty Director reply shares the existing retry budget')
  assert.equal(fromEmpty.validated.illustrations.length, 2)
  assert(fromEmpty.validated.warnings.some(warning => /initially returned no text/.test(warning)))
}
calls = 0
await assert.rejects(relay.runRelayPlannedDirectorWithFrequency(messages, context, async () => { calls++; return '' }), /no text.*final attempt/)
assert.equal(calls, 2, 'two empty replies must fail visibly without a retry loop')
calls = 0
const emptyThenShort = await relay.runRelayPlannedDirectorWithFrequency(messages, context, async () => { calls++; return calls === 1 ? '' : envelope(shots.slice(0, 1)) })
assert.equal(calls, 2, 'empty-then-short must not gain a third count-contract attempt')
assert.equal(emptyThenShort.validated.illustrations.length, 1)
assert(emptyThenShort.validated.warnings.some(warning => /count shortfall/.test(warning)))
calls = 0
const shortThenEmpty = await relay.runRelayPlannedDirectorWithFrequency(messages, context, async () => { calls++; return calls === 1 ? envelope(shots.slice(0, 1)) : '' })
assert.equal(calls, 2)
assert.equal(shortThenEmpty.validated.illustrations.length, 1, 'an empty retry must not erase a validated shot')
calls = 0
await assert.rejects(relay.runRelayPlannedDirectorWithFrequency(messages, context, async () => {
  calls++
  if (calls === 1) throw new relay.EmptyDirectorResponseError()
  throw new Error('Operation cancelled by user.')
}), /cancelled/)
assert.equal(calls, 2, 'cancellation at the retry boundary must propagate unchanged')
calls = 0
await assert.rejects(relay.runRelayPlannedDirectorWithFrequency(messages, context, async () => { calls++; throw new Error('Network unavailable') }), /Network unavailable/)
assert.equal(calls, 1, 'transport/provider failures must not be mistaken for an empty reply')

const opportunities = shots.map((shot, index) => ({ opportunityId: `op-${index}`, plannerVersion: relay.RELAY_PLANNED_V2, messageId: context.messageId, swipeId: 0, paragraphIndex: 0, insertionSide: 'after', selectedExcerpt: shot.anchor.anchorExcerpt, sceneSummary: shot.promptCore, status: 'proposed', confidence: 1 - index / 10 }))
assert.equal(relay.selectRelayPlannedDispatchOpportunities(opportunities, 3).length, 3, 'distinct validated shots sharing one paragraph must all remain dispatchable')
assert.equal(relay.selectRelayPlannedDispatchOpportunities([...opportunities, opportunities[0]], 4).length, 3, 'the same opportunity cannot dispatch twice')
assert.equal(relay.selectRelayPlannedDispatchOpportunities(opportunities, 2).length, 2)

let providerCalls = 0
const forbidProvider = () => { providerCalls++; throw new Error('Offline count test cannot spend on a provider') }
globalThis.spindle = { on() {}, onFrontendMessage() {}, registerInterceptor() {}, registerMacro() {}, registerMessageContentProcessor() {}, sendToFrontend() {}, permissions: { has: () => true }, log: { info() {}, warn() {}, error() {} }, generate: { raw: forbidProvider }, imageGen: { generate: forbidProvider } }
const backend = await import('../src/backend')
const state = backend.migrateRelayStateSnapshot({})
for (const perspectiveMode of ['scene-snapshot', 'sequence', 'emotional-beat', 'solo-scene', 'persona-pov', 'storyboard']) {
  for (const promptFormat of ['natural-language', 'danbooru-tags']) {
    for (const modelPlacedCountMode of ['fixed', 'range']) {
      const settings = backend.normalizeProseIllustratorSettings({ mode: 'relay-planned', perspectiveMode, promptFormat, modelPlacedCountMode, illustrationsPerRun: 2, minimumImages: 2, maximumImages: 4, maximumIllustrationsPerMessage: 12 })
      const liveContext = backend.relayPlannedContextForResponse({ chatId: context.chatId, messageId: context.messageId, swipeId: 0, content: context.paragraphs[0].text, state, settings, config: {} })
      const manualContext = backend.relayPlannedContextForResponse({ chatId: context.chatId, messageId: context.messageId, swipeId: 0, content: context.paragraphs[0].text, state, settings, config: {}, manualRequest: true })
      assert.equal(manualContext.manualRequest, true, 'the production context must carry ephemeral manual intent through Director validation and repair')
      assert.notEqual(liveContext.manualRequest, true, 'automatic analysis must remain governed by saved frequency')
      assert.equal(liveContext.minimumIllustrations, 2)
      assert.equal(liveContext.maximumIllustrations, modelPlacedCountMode === 'fixed' ? 2 : 4, `${perspectiveMode}/${promptFormat}: the production planner must receive the actual selected count`)
      // Exercise real validation -> post-repair count -> dispatch for every
      // framing/format/count, not merely settings or context normalization.
      const modeContext = { ...context, ...liveContext, subjects: context.subjects, paragraphs: context.paragraphs, characterOnlySubjects: ['Mira'] }
      const modeShots = shots.map((row, index) => ({ ...row, booruTags: ['indoors', 'table', 'warm_lighting'], subjectDirectives: row.subjectDirectives.map(subject => ({ ...subject, booruTags: ['1girl', 'short_hair', index === 1 ? 'raising' : index === 2 ? 'folding' : 'standing', index === 2 ? 'coat' : 'cup'] })) }))
      let modeCalls = 0, modePreparations = 0
      const modeResult = await relay.runRelayPlannedDirectorWithFrequency(messages, modeContext, async () => { modeCalls++; return envelope(modeShots.slice(0, 2)) }, async validated => {
        modePreparations++
        assert(validated.illustrations.every(row => !row.rejected && !row.requiresRepair), `${perspectiveMode}/${promptFormat}: fixture must pass the actual scene/cast/format validator`)
        return { ...validated, illustrations: modePreparations === 1 ? validated.illustrations.slice(0, 1) : validated.illustrations }
      })
      assert.equal(modeCalls, 2, `${perspectiveMode}/${promptFormat}/${modelPlacedCountMode}: post-repair loss must trigger bounded count recovery`)
      assert.equal(modeResult.validated.illustrations.length, 2)
      assert.equal(relay.selectRelayPlannedDispatchOpportunities(modeResult.validated.illustrations.map((row, index) => ({ ...opportunities[index], sceneSummary: relay.compileRelayPlannedPrompt(row.illustration, modeContext, { tagMode: promptFormat === 'danbooru-tags' }).positivePrompt })), modeContext.maximumIllustrations).length, 2)
    }
  }
}
const fixedSettings = backend.normalizeProseIllustratorSettings({ mode: 'relay-planned', illustrationsPerRun: 2, maximumImages: 4 })
const inactiveFixed = backend.normalizeProseIllustratorSettings({ mode: 'relay-planned', modelPlacedCountMode: 'range', illustrationsPerRun: 10, minimumImages: 2, maximumImages: 3 })
assert.equal(inactiveFixed.maximumImages, 3, 'switching to range must not retain the inactive fixed count as its maximum')
assert.equal(inactiveFixed.minimumImages, 2)
assert.deepEqual(backend.normalizeProseIllustratorSettings(inactiveFixed), inactiveFixed, 'selected range survives repeated normalization/reload')
const fingerprint = backend.proseOpportunitySettingsFingerprint(fixedSettings)
for (const patch of [{ illustrationsPerRun: 3 }, { modelPlacedCountMode: 'range' }, { minimumImages: 2 }, { maximumImages: 5 }, { promptFormat: 'danbooru-tags' }]) {
  assert.notEqual(backend.proseOpportunitySettingsFingerprint({ ...fixedSettings, ...patch }), fingerprint, 'count/format changes cannot reuse stale processed-message discovery')
}
const framingFingerprints = ['scene-snapshot', 'sequence', 'emotional-beat', 'solo-scene', 'persona-pov', 'storyboard']
  .map(perspectiveMode => backend.proseOpportunitySettingsFingerprint({ ...fixedSettings, perspectiveMode }))
assert.equal(new Set(framingFingerprints).size, 6, 'each selected framing must have its own discovery fingerprint; unchanged saved text cannot reuse another framing\'s processed decision')
assert.equal(backend.proseOpportunitySettingsFingerprint({ ...fixedSettings }), fingerprint, 'unchanged settings retain discovery idempotence')
assert.equal(providerCalls, 0)
console.log('Relay-Planned count passed: fixed/range/boundaries, bounded underproduction retry, post-repair accounting, visible shortfall, cancellation, same-paragraph dispatch and no duplicate starts.')
