// @ts-nocheck -- production prompt builders only; no provider calls.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import * as visualIntegrity from '../src/storyboardVisualIntegrity'
import { MULTI_SUBJECT_BLOCKING_GUIDANCE, RELAY_PLANNED_BLOCKING_GUIDANCE, STORY_ACTION_OWNERSHIP_GUIDANCE, STORY_MODEL_BOORU_BLOCKING_GUIDANCE, SINGLE_SCENE_NEGATIVE_TERMS } from '../src/storyboardVisualIntegrity'
import { BLOCKING_FIDELITY_GUIDANCE, BLOCKING_FIDELITY_DIRECTOR_GUIDANCE, BLOCKING_FIDELITY_BOORU_FORMAT_GUIDANCE, blockingFidelityAspectGuidance } from '../src/blockingFidelity'
import { normalizeBooruTagPrompt } from '../src/booruTags'

for (const aspect of ['1:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9']) {
  const [width, height] = aspect.split(':').map(Number)
  assert(blockingFidelityAspectGuidance(aspect).includes(width > height ? 'landscape canvas' : width < height ? 'portrait canvas' : 'square canvas'))
  assert(blockingFidelityAspectGuidance(aspect).includes(`aspectRatio to ${aspect}`))
}
assert.equal(blockingFidelityAspectGuidance('adaptive'), '', 'adaptive remains free to choose a source-supported aspect')
assert.equal(blockingFidelityAspectGuidance('bogus'), '', 'unsupported values are not interpolated into the contract')

globalThis.spindle = {
  on() {}, onFrontendMessage() {}, registerInterceptor() {}, registerMacro() {}, registerMessageContentProcessor() {},
  permissions: { has: () => true }, sendToFrontend() {}, log: { info() {}, warn() {}, error() {} },
  generate: { raw() { throw new Error('Prompt guidance tests must not spend on providers') } },
}
const backend = await import('../src/backend')
assert.equal(typeof visualIntegrity.storyModelFigureIntegrityNegatives, 'function', 'Story Model needs the same multi-person single-frame negative guard as Relay')
assert.deepEqual(visualIntegrity.storyModelFigureIntegrityNegatives(1), [], 'solo images do not get extra-person suppression')
assert.deepEqual(visualIntegrity.storyModelFigureIntegrityNegatives(0), [], 'unspecified/environment images do not get human-negative additions')
for (const count of [2, 3, 4]) {
  const guard = visualIntegrity.storyModelFigureIntegrityNegatives(count)
  for (const term of [...SINGLE_SCENE_NEGATIVE_TERMS, 'fused bodies', 'misattached limbs', 'swapped clothing between characters']) assert(guard.includes(term), `${count} visible actors retain the shared-scene anatomy guard`)
  assert(!guard.includes('people') && !guard.includes('hands'), 'the guard cannot suppress intended people or hands')
}
for (const countText of ['Two visible people', '2 visible people', 'Two people', '2 people', 'Three adults', '3 visible adults', 'Two adult people']) {
  assert(backend.modelPlacedSemanticViolations('Four visible people in a studio.', `${countText} in a studio.`, [], 'Four visible people in a studio.', 4).includes('cast membership'), `${countText}: explicit natural-language count must be recognized before multi-person guarding`)
}
assert.match(STORY_MODEL_BOORU_BLOCKING_GUIDANCE, /one continuous scene.*not separate panels/is)
assert.match(STORY_MODEL_BOORU_BLOCKING_GUIDANCE, /relation phrases use ordinary spaces/i)
assert.match(STORY_MODEL_BOORU_BLOCKING_GUIDANCE, /contact actor and target.*established visual referent/is, 'multi-person Booru contact must identify both bodies rather than leave two same-gender people behind a pronoun')
assert.match(STORY_MODEL_BOORU_BLOCKING_GUIDANCE, /bare pronouns.*his shoulder.*their hands/is, 'the authoring contract must explicitly disambiguate pronoun-only contact targets')
assert.match(MULTI_SUBJECT_BLOCKING_GUIDANCE, /reveal, reading or inspection[\s\S]*visible source-established contents[\s\S]*open\/closed state/i, 'the selected reveal must retain the attended object contents, not only its owner')
const savedProfileRecord = {
  target: 'prose.illustration', originalSceneBrief: 'Mira sits beside the window.',
  selectedPromptProfileId: 'cinematic-scene',
  promptProfile: { requestedProfileId: 'auto', selectedProfileId: 'cinematic-scene' },
}
assert.equal(backend.jobFromRecord(savedProfileRecord).promptProfileId, 'auto', 'regeneration preserves Auto intent instead of promoting its resolved diagnostic profile to an explicit override')
assert.equal(backend.jobFromRecord({ ...savedProfileRecord, temporaryPromptProfileId: 'selfie' }).promptProfileId, 'selfie', 'explicit temporary override remains authoritative')
assert.equal(backend.jobFromRecord({ ...savedProfileRecord, promptProfile: { requestedProfileId: 'cinematic-scene' } }).promptProfileId, 'cinematic-scene', 'explicit saved profile remains authoritative')
assert.equal(backend.jobFromRecord({ ...savedProfileRecord, promptProfile: undefined }).promptProfileId, 'cinematic-scene', 'legacy records retain their only known profile')
const authoredOwners = 'Foreground, Mira: A woman in a blue cardigan, seated with hands on her thighs.\n\nBehind, Nolan: A man in a green jacket, standing with one palm on her shoulder.\n\nA quiet sunlit room.'
const providerJob = { target: 'prose.illustration', originalSceneBrief: authoredOwners, cast: 'char+user' }
const finalizedOwners = backend.finalizeParsedPositivePrompt(authoredOwners.replace(/\s+/g, ' '), 'narrative-scene', providerJob, 'blocking-fidelity')
assert(finalizedOwners.includes('\n\nBehind, Nolan:'), 'final shaper restores the unchanged authored paragraph boundaries')
const providerPlan = { recipePositivePrompt: '', recipeNegativePrompt: '', effectiveBaseTags: 'soft light', userPositivePromptPrefix: 'watercolor', userNegativePromptPrefix: '' }
const providerOwners = backend.assemblePreparedProviderPrompts(providerPlan, { prompt: finalizedOwners, negativePrompt: '', promptMode: 'story_model_visual_prompt', preserveOwnerParagraphs: true })
assert(providerOwners.prompt.includes(authoredOwners), 'actual provider-bound merge retains the complete owner paragraphs')
assert(providerOwners.prompt.startsWith('watercolor, '), 'configured prefix remains outside the owner description')
assert(providerOwners.prompt.endsWith(', soft light'), 'configured suffix remains intact')
for (const framing of ['scene-snapshot', 'sequence', 'emotional-beat', 'solo-scene', 'persona-pov', 'storyboard', 'blocking-fidelity']) {
  assert(backend.finalizeParsedPositivePrompt(authoredOwners.replace(/\s+/g, ' '), 'narrative-scene', providerJob, framing).includes('\n\nBehind, Nolan:'), `${framing}: unchanged owner paragraphs survive final shaping`)
}
const matchingOwners = 'Mira: black hair, white shirt, seated with palms on her thighs.\n\nNolan: black hair, white shirt, standing with a blue folder in his right hand.'
const matchingProvider = backend.assemblePreparedProviderPrompts(providerPlan, { prompt: matchingOwners, negativePrompt: '', promptMode: 'story_model_visual_prompt', preserveOwnerParagraphs: true })
assert(matchingProvider.prompt.includes(matchingOwners), 'identical appearance/outfit fragments remain attached to both owners')
const defaults = backend.defaultProseIllustratorSettings()
const quartetJob = {
  target: 'prose.illustration', cast: 'none', caption: '', alt: '',
  originalSceneBrief: 'One continuous scene with exactly 4 visible people. A man sits with palms on thighs, a woman stands behind him, another man holds a cup and a fourth man sits apart. Shared wide view across the empty studio floor.',
  prosePromptComposition: { perspectiveMode: 'blocking-fidelity', peoplePolicy: 'required', expectedPeopleCount: 4, namedSubjects: ['A', 'B', 'C', 'D'] },
}
assert(!backend.hasExplicitNoHumanIntent(quartetJob), 'four explicitly visible people must not become a no-human scene because part of the studio is empty')
assert.equal(backend.classifyImageRequest(quartetJob), 'narrative-scene', 'Blocking Fidelity must use the existing narrative scene profile path')
assert.equal(backend.autoPromptProfileId(quartetJob, backend.classifyImageRequest(quartetJob)), 'cinematic-scene')
assert(backend.targetHumanPolicy(quartetJob).allowHumanPrompt, 'the target policy must not inject people/body/hand suppression into the four-person scene')
for (const count of [...Array.from({ length: 64 }, (_, i) => String(i + 1)), 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'twenty-four', 'thirty two', 'sixty-four']) {
  assert(!backend.hasExplicitNoHumanIntent({ ...quartetJob, prosePromptComposition: undefined, originalSceneBrief: `Exactly ${count} visible people posed across an otherwise empty studio.` }), `positive visible count ${count} must survive the empty-background heuristic`)
}
const structuredQuartetJob = { ...quartetJob, originalSceneBrief: "Foreground, Taehyun: The man is seated square on a wooden chair with both palms flat on his own thighs. Behind, Mira: The woman is standing directly behind his chair with a palm on each shoulder. Screen-right, Gabrielle: The man stands apart holding a red cup in his right hand. Screen-right, Seo Taejun: The man sits on a separate chair. Shared wide landscape view across the empty studio floor with four taped lanes." }
assert(!backend.hasExplicitNoHumanIntent(structuredQuartetJob), 'the real saved job declares its visible count in structured composition, not originalSceneBrief')
assert.equal(backend.classifyImageRequest(structuredQuartetJob), 'narrative-scene', 'required structured cast must survive the empty floor heuristic before prompt assembly adds its count')
assert(backend.targetHumanPolicy(structuredQuartetJob).allowHumanPrompt, 'structured positive cast must not receive people/body/hand suppression')
const trulyEmptyJob = { ...quartetJob, originalSceneBrief: 'An empty studio, no people visible.', prosePromptComposition: { peoplePolicy: 'forbidden', expectedPeopleCount: 0, namedSubjects: [], perspectiveMode: 'blocking-fidelity' } }
assert(backend.hasExplicitNoHumanIntent(trulyEmptyJob) && !backend.targetHumanPolicy(trulyEmptyJob).allowHumanPrompt, 'a genuinely person-free scene must retain its no-human policy')
const boundBlockingJob = { ...quartetJob, cast: 'char', originalSceneBrief: 'A seated man rests both palms on his thighs. A woman stands directly behind his chair.' }
assert.equal(backend.classifyImageRequest(boundBlockingJob), 'narrative-scene', 'the framing id itself must not fall back to a social/photo profile')
const blankFraming = { ...defaults, enabled: true, mode: 'inline-protocol', perspectiveMode: 'blocking-fidelity', promptFormat: 'danbooru-tags', promptRegistry: { 'story.framing.blocking-fidelity': '' } }
assert(!backend.resolveIllustratorStoryPrompt(blankFraming).includes(BLOCKING_FIDELITY_BOORU_FORMAT_GUIDANCE), 'an intentionally blank framing prompt stays blank')
const customFraming = { ...blankFraming, promptRegistry: { 'story.framing.blocking-fidelity': 'User framing text stays verbatim.' } }
assert(backend.resolveIllustratorStoryPrompt(customFraming).includes('User framing text stays verbatim.'))
assert.deepEqual(customFraming.promptRegistry, { 'story.framing.blocking-fidelity': 'User framing text stays verbatim.' }, 'runtime format guidance never rewrites the saved protocol registry')
const framings = ['scene-snapshot', 'sequence', 'emotional-beat', 'solo-scene', 'persona-pov', 'storyboard', 'blocking-fidelity']
const formats = ['natural-language', 'danbooru-tags']
for (const perspectiveMode of framings) for (const promptFormat of formats) {
  for (const mode of ['inline-protocol', 'model-placed']) {
    const settings = { ...defaults, enabled: true, mode, perspectiveMode, promptFormat }
    const prompt = backend.resolveIllustratorStoryPrompt(settings)
    assert(prompt.includes(MULTI_SUBJECT_BLOCKING_GUIDANCE), `${mode}/${perspectiveMode}/${promptFormat}: Story Model must receive the shared blocking contract`)
    assert(!prompt.includes('DIRECTOR BLOCKING CONTRACT'), 'Story Model XML authoring must not receive the Director JSON schema instructions')
    assert.equal(prompt.includes('STORY MODEL BOORU RELATION FIDELITY'), promptFormat === 'danbooru-tags', `${mode}/${perspectiveMode}: literal visual relations must survive Booru authoring in every framing`)
    if (promptFormat === 'danbooru-tags') {
      assert(!prompt.includes('omit only the unexpressible nuance'), `${mode}/${perspectiveMode}: stock vocabulary-only fallback cannot contradict literal relation fidelity`)
      assert(!prompt.includes('Do not write sentences, natural-language clauses'), `${mode}/${perspectiveMode}: stock clause ban cannot forbid compact literal visual relations`)
      assert(!prompt.includes('do not use natural-language descriptions'), `${mode}/${perspectiveMode}: scene-first format rule cannot ban supported relation phrases`)
    }
    if (perspectiveMode === 'blocking-fidelity') assert(prompt.includes(BLOCKING_FIDELITY_GUIDANCE), `${mode}/${promptFormat}: full experimental framing reaches the Story Model`)
    assert.equal(prompt.includes(BLOCKING_FIDELITY_BOORU_FORMAT_GUIDANCE), perspectiveMode === 'blocking-fidelity' && promptFormat === 'danbooru-tags', `${mode}/${perspectiveMode}/${promptFormat}: only Blocking Fidelity Booru authoring resolves the vocabulary fallback and prose-format conflict`)
  }
  const settings = { ...defaults, enabled: true, mode: 'relay-planned', perspectiveMode, promptFormat }
  const prompt = backend.resolveIllustratorStoryPrompt(settings)
  assert(prompt.includes(STORY_ACTION_OWNERSHIP_GUIDANCE), `${perspectiveMode}/${promptFormat}: Relay's story source must keep actor ownership legible`)
  assert(!prompt.includes(MULTI_SUBJECT_BLOCKING_GUIDANCE), 'Relay story prose must not receive image-layout planning instructions')
  assert(!prompt.includes(BLOCKING_FIDELITY_BOORU_FORMAT_GUIDANCE), 'Relay story prose must not be converted into provider tags')
  if (perspectiveMode === 'blocking-fidelity') assert(!prompt.includes(BLOCKING_FIDELITY_GUIDANCE), 'experimental image paragraphs belong to the Director, not Relay story prose')
  const context = {
    version: 'relay-planned-v2', chatId: 'blocking', messageId: 'blocking-source', swipeId: 0,
    maximumIllustrations: 2, maximumCharacters: 2, maximumPromptCharacters: 6000,
    perspectiveMode, promptFormat, defaultAspectRatio: '4:3', promptStyle: '', adultMode: false,
    subjects: [], paragraphs: [{ index: 0, text: 'One person sits on the bed. The other remains in the doorway.' }],
    referenceAssetIds: [], locationReferenceAssetIds: [], priorIllustrations: [], globalNegativeRequirements: [],
  }
  const director = backend.relayPlannedDirectorMessages(settings, context).map(row => row.content).join('\n\n')
  const repair = backend.relayPlannedRepairMessages(settings, context, { anchor: { paragraphIndex: 0 } }, []).map(row => row.content).join('\n\n')
  for (const message of [director, repair]) assert.equal(message.includes(BLOCKING_FIDELITY_BOORU_FORMAT_GUIDANCE), perspectiveMode === 'blocking-fidelity' && promptFormat === 'danbooru-tags', `${perspectiveMode}/${promptFormat}: Director and repair resolve only the selected output format`)
  assert(director.includes(MULTI_SUBJECT_BLOCKING_GUIDANCE), `${perspectiveMode}/${promptFormat}: actual Director messages must receive blocking guidance`)
  assert(repair.includes(MULTI_SUBJECT_BLOCKING_GUIDANCE), `${perspectiveMode}/${promptFormat}: bounded repair must retain the same blocking contract`)
  if (perspectiveMode === 'blocking-fidelity') {
    for (const message of [director, repair]) {
      assert(message.includes(BLOCKING_FIDELITY_GUIDANCE), 'experimental framing reaches Director and bounded repair, not just its mode id')
      assert(message.includes(BLOCKING_FIDELITY_DIRECTOR_GUIDANCE), 'Director schema fields align with the experimental owner paragraphs')
      assert(message.includes(blockingFidelityAspectGuidance('4:3')), 'Director and bounded repair receive the actual fixed canvas before drafting')
    }
  } else assert(!director.includes(BLOCKING_FIDELITY_GUIDANCE), 'existing framing modes remain unchanged')
  assert(director.includes(RELAY_PLANNED_BLOCKING_GUIDANCE) && repair.includes(RELAY_PLANNED_BLOCKING_GUIDANCE), 'both Director paths must align their structured owner fields')
}
assert.match(BLOCKING_FIDELITY_GUIDANCE, /landscape canvas is not two portrait crops/)
assert.match(BLOCKING_FIDELITY_GUIDANCE, /holding_cup.*holding a cup in his right hand, left hand empty at his side/, 'Booru authoring must preserve literal hand ownership rather than collapse it into a vague tag')
assert.match(BLOCKING_FIDELITY_GUIDANCE, /short literal visual phrase inside that owner's group/, 'compact visual relations remain inside the correct owner group')
assert.match(BLOCKING_FIDELITY_GUIDANCE, /every source-required hand surface and prop owner survived/, 'Booru conversion must reverse-check contacts and prop owners')
const ownedVisualRelations = "1boy, navy hoodie, sitting, palms flat on his own thighs, 1girl, green cardigan, standing behind, left palm on the seated person's left shoulder, right palm on the seated person's right shoulder, 1boy, burgundy sweater, standing screen-right, holding a red cup in his right hand, left hand empty at his side, rehearsal studio"
assert.equal(normalizeBooruTagPrompt(ownedVisualRelations), ownedVisualRelations, 'the actual tag shaper accepts the newly instructed literal visual relations without losing owner order')
const providerRelations = backend.assemblePreparedProviderPrompts({}, { prompt: ownedVisualRelations, negativePrompt: '', promptMode: 'story_model_visual_prompt' })
assert(providerRelations.prompt.includes(ownedVisualRelations), 'the provider-bound merge preserves the complete owner relation groups')
const referentBoundRelations = "1boy, navy hoodie, sitting, palms flat on his own thighs, 1girl, green cardigan, standing behind the seated man in the navy hoodie, the woman in the green cardigan rests her left palm on the seated navy-hoodie man's left shoulder, her right palm rests on the seated navy-hoodie man's right shoulder, 1boy, burgundy sweater, standing apart screen-right, red cup in his right hand, left arm empty at his side, rehearsal studio"
assert.equal(normalizeBooruTagPrompt(referentBoundRelations), referentBoundRelations, 'the tag shaper preserves literal actor/target referents and both anatomical contact sides')
assert(backend.assemblePreparedProviderPrompts({}, { prompt: referentBoundRelations, negativePrompt: '', promptMode: 'story_model_visual_prompt' }).prompt.includes(referentBoundRelations), 'provider assembly retains referent-bound relations in their original owner block without global trait deduplication')
assert.match(BLOCKING_FIDELITY_DIRECTOR_GUIDANCE, /verbatim exactly once.*leave contact empty/s)
assert.match(MULTI_SUBJECT_BLOCKING_GUIDANCE, /screen-left\/screen-right.*anatomical left\/right/i)
assert.match(RELAY_PLANNED_BLOCKING_GUIDANCE, /left-to-right.*namedSubjects.*subjectDirectives/i)
assert.match(RELAY_PLANNED_BLOCKING_GUIDANCE, /Natural Language field alignment.*verbatim.*pose.*action.*contact/is, 'Director must align provider prose with its owned structured fields rather than paraphrase the same gesture several times')
assert.match(RELAY_PLANNED_BLOCKING_GUIDANCE, /composition\.blocking.*only.*shared.*spatial/is, 'shared blocking must not become another retelling of each person action')
assert.match(MULTI_SUBJECT_BLOCKING_GUIDANCE, /reverse-check.*source/i)
assert.match(MULTI_SUBJECT_BLOCKING_GUIDANCE, /Do not invent.*contact/i)
assert.match(MULTI_SUBJECT_BLOCKING_GUIDANCE, /Do not add mirrors.*reflections.*background people/i, 'all framing modes must avoid unsupported reflective scenes and background cast')
assert.match(MULTI_SUBJECT_BLOCKING_GUIDANCE, /singular marker.*appearance.*outfit.*pose/i)
assert.match(MULTI_SUBJECT_BLOCKING_GUIDANCE, /singular owner markers.*count authority.*omit redundant aggregate count tags/is, 'all authoring paths must avoid contradictory global counts above complete owner blocks')
assert.match(MULTI_SUBJECT_BLOCKING_GUIDANCE, /never prepend a separate cast inventory.*one marker per visible subject.*not.*globally.*locally/is, 'the model must not duplicate singular count inventories ahead of its real owner blocks')
assert.match(MULTI_SUBJECT_BLOCKING_GUIDANCE, /name alone.*visual referent/i, 'all model-facing paths must bind prose actions to a visible owner, not only an untrained name')
const source = readFileSync(new URL('../src/backend.ts', import.meta.url), 'utf8')
assert.match(source, /const figureIntegrity = job\.target === 'prose\.illustration' && humanPolicy\.allowHumanPrompt[\s\S]{0,500}storyModelFigureIntegrityNegatives/, 'Story Model multi-person guard is scoped to prose illustrations, not Surface media')
assert.match(source, /router: \[profiled\.decision\.negativeAdditions, figureIntegrity,/, 'actual Story Model negative assembly includes its figure-integrity guard')
assert.match(source, /preserveOwnerParagraphs: !tagMode,[\s\S]{0,120}promptMode: 'story_model_visual_prompt'/, 'every Story Model natural-language scene bypasses global fragment deduplication')
assert.match(source, /const finalGuard = \[channelGuard, MULTI_SUBJECT_BLOCKING_GUIDANCE, storyboardSpatialGuard\]/, 'production Composer must receive blocking guidance in every framing, not only Storyboard')
assert(!backend.resolveIllustratorStoryPrompt({ ...defaults, enabled: false, mode: 'off' }).includes(MULTI_SUBJECT_BLOCKING_GUIDANCE))
console.log('Blocking prompt guidance passed: Story Model, Relay story ownership, Director, repair, Composer routing; seven framings and both formats, no provider spend.')
