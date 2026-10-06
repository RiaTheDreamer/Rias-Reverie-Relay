// @ts-nocheck -- production prompt preparation with bounded host mocks.
import assert from 'node:assert/strict'
import { emptyContinuityVault, registerCanonicalCharacter, addAppearanceFact, normalizeContinuityVault, projectContinuityForGeneration } from '../src/vault'
import { declaredBooruPeopleCount, normalizeBooruTagPrompt } from '../src/booruTags'
import { RELAY_PLANNED_V2 } from '../src/relayPlannedV2'
const storage = new Map()
let activeCharacter = { id: 'mira-id', name: 'Mira', description: 'red hair, lean build' }
globalThis.spindle = {
  on() {}, onFrontendMessage() {}, registerInterceptor() {}, registerMacro() {}, registerMessageContentProcessor() {}, sendToFrontend() {},
  permissions: { has: () => true }, log: { info() {}, warn() {}, error() {} },
  userStorage: { async mkdir() {}, async getJson(path, { fallback } = {}) { return structuredClone(storage.get(path) ?? fallback ?? {}) }, async setJson(path, value) { storage.set(path, structuredClone(value)) } },
  chats: { async get() { return { character_id: 'mira-id' } } }, chat: { async getMessages() { return [] } },
  characters: { async get() { return activeCharacter } },
  personas: { async getActive() { return { id: 'cerys-id', name: 'Cerys the Dreamer', description: '' } } },
  variables: { global: { async set() {} }, chat: { async set() {} } },
}
const backend = await import('../src/backend')
const longSceneParagraph = `${'The archive room remains quiet. '.repeat(28)}Yejin laid the pencil aside and folded the sheet.`
assert(backend.sanitizeRecentVisualContext(longSceneParagraph).length <= 703, 'history context remains bounded by default, plus its existing ellipsis')
assert.doesNotMatch(backend.sanitizeRecentVisualContext(longSceneParagraph), /folded the sheet/, 'bounded history and full local source have deliberately different scopes')
assert.match(backend.sanitizeRecentVisualContext(longSceneParagraph, longSceneParagraph.length), /folded the sheet\.$/, 'authoritative local scene context must retain the paragraph tail')
const taggedWardrobe = [
  { canonicalCharacterName: 'Yejin', aliases: ['Han Yejin'], layer: 'wardrobe', valueKind: 'booru-tag', value: 'blazer, collared_shirt' },
  { canonicalCharacterName: 'Arin', aliases: [], layer: 'wardrobe', valueKind: 'booru-tag', value: 'ivory_cardigan' },
  { canonicalCharacterName: 'Yejin', aliases: [], layer: 'current-appearance', valueKind: 'visual-phrase', value: 'holding a penlight' },
]
const singleTags = '1girl, solo, folding, paper, bob_cut'
assert.match(backend.mergeSingleSubjectBooruAppearance(singleTags, taggedWardrobe, ['Han Yejin'], 1), /blazer, collared_shirt/, 'single declared actor must retain her projected tagged wardrobe')
assert.doesNotMatch(backend.mergeSingleSubjectBooruAppearance(singleTags, taggedWardrobe, ['Han Yejin'], 1), /cardigan|penlight|holding_a/, 'other actors and prose facts must not leak into tag prompts')
assert.equal(backend.mergeSingleSubjectBooruAppearance(singleTags, taggedWardrobe, [], 1), singleTags, 'unknown owner cannot acquire a wardrobe')
assert.equal(backend.mergeSingleSubjectBooruAppearance('2girls, paper, indoors', taggedWardrobe, ['Yejin', 'Arin'], 2), '2girls, paper, indoors', 'multi-person outfits must not become anonymous global tags')
assert.equal(backend.mergeSingleSubjectBooruAppearance('2girls, paper, indoors', taggedWardrobe, ['Yejin'], 1), '2girls, paper, indoors', 'conflicting provider cardinality cannot flatten appearance')
const partialIdentity = backend.completeFallbackVisualIdentity('Test Subject, 21, He/Him. His black hair and lean build are visible. Wearing a black jacket. He holds a flashlight.', [{ layer: 'visual-identity', category: 'eye-color', value: 'amber eyes' }, { layer: 'current-appearance', category: 'other', value: 'striped sleeve marked by grease' }])
assert.match(partialIdentity, /he\/him.*amber eyes.*black hair.*lean build/, 'partial memory must preserve missing card identity anchors and explicit pronouns')
assert.doesNotMatch(partialIdentity, /jacket|grease|flashlight|holds/, 'outfit, temporary state and action must not masquerade as stable identity')
const manualIdentity = backend.completeFallbackVisualIdentity('black hair, blue eyes, lean build', [{ layer: 'visual-identity', category: 'hair-color', value: 'red hair' }])
assert.match(manualIdentity, /red hair.*blue eyes.*lean build/)
assert.doesNotMatch(manualIdentity, /black hair/, 'selected memory must override its own card appearance domain')
const config = await backend.setConfig({ parserConnectionId: null, includeLorebook: false, proseIllustratorSettings: { ...backend.defaultProseIllustratorSettings(), enabled: true, mode: 'inline-protocol', perspectiveMode: 'storyboard' } }, 'cast-test')
const base = { chatId: 'cast-chat', messageId: 'cast-message', swipeId: 0, requestId: 'cast-request', target: 'prose.illustration', slots: ['illustration'], count: 1, aspect: '4:3', cast: 'char+user', promptSource: 'visual_prompt', originalRequestXml: '', originalNegativePrompt: '', caption: '', alt: '' }
for (const format of ['natural-language', 'danbooru-tags']) {
  const viewConfig = await backend.setConfig({ proseIllustratorSettings: { ...backend.defaultProseIllustratorSettings(), enabled: true, mode: 'inline-protocol', perspectiveMode: 'storyboard', promptFormat: format } }, `view-${format}`)
  for (const planner of ['model', 'relay']) {
    const scene = 'Yejin folds paper while holding a camera.'
    const imagePrompt = format === 'danbooru-tags' ? '1girl, solo, Camera angle: from_above, folding, paper, camera' : 'Camera: low-angle medium shot. Exactly one visible person: Yejin folds paper while holding a camera.'
    const viewJob = { ...base, cast: 'none', requestId: `view-${format}-${planner}`, originalSceneBrief: imagePrompt, authoritativeSourceParagraph: scene, ...(planner === 'relay' ? { promptSource: 'structured', composedPositivePrompt: imagePrompt, prosePromptComposition: { namedSubjects: ['Yejin'], expectedPeopleCount: 1, peoplePolicy: 'required', perspectiveMode: 'storyboard', rawOutput: { plannerVersion: RELAY_PLANNED_V2 } } } : {}) }
    const viewPrepared = await backend.parseSlotPrompt(viewJob, 'illustration', [], 0, viewConfig, `view-${format}`, {})
    assert.doesNotMatch(viewPrepared.prompt, /Camera(?: angle)?:/i, `${planner}/${format}: framing label must not reach provider preparation`)
    assert.match(viewPrepared.prompt, /\bcamera\b/, `${planner}/${format}: a real camera must not be removed`)
    assert.match(viewPrepared.prompt, format === 'danbooru-tags' ? /from_above/ : /View: low-angle/, `${planner}/${format}: requested viewpoint must survive`)
    assert.equal(viewPrepared.parserUsed, false, 'local view wording must not add a second model pass')
    const finalProvider = backend.assemblePreparedProviderPrompts({ effectiveBaseTags: '', userPositivePromptPrefix: '', userNegativePromptPrefix: '' }, viewPrepared)
    assert.equal(finalProvider.prompt, viewPrepared.prompt, 'final provider assembly must preserve the corrected scene wording')
  }
}
assert.equal(backend.normalizeProseIllustratorSettings({ promptRegistry: { 'story.framing.storyboard': 'Custom view instructions kept by the user.' } }).promptRegistry['story.framing.storyboard'], 'Custom view instructions kept by the user.', 'view guidance must not overwrite saved user overrides')
const npcScene = 'Exactly two visible people: Han Yejin and Song Arin; the server remains outside the frame. Wide view inside a café. Yejin holds the stuck door open with one hand. Arin lifts her handbag clear of the walkway.'
const prepared = await backend.parseSlotPrompt({ ...base, originalSceneBrief: npcScene }, 'illustration', [], 0, config, 'cast-test', {})
assert.doesNotMatch(prepared.prompt, /Mira|Cerys|Identity unresolved|red hair|red_hair/, 'explicit complete NPC cast must not acquire unrelated bound identities')
assert.equal(prepared.promptPipeline.characterContext, '')
assert.equal(prepared.promptPipeline.personaContext, '')
assert.match(prepared.prompt, /Yejin holds the stuck door/)
assert.match(prepared.prompt, /Arin lifts her handbag/)
const bound = await backend.parseSlotPrompt({ ...base, requestId: 'bound', originalSceneBrief: 'Exactly two visible people: Mira and Cerys the Dreamer; medium shot inside a café. Mira passes a cup to Cerys the Dreamer.' }, 'illustration', [], 0, config, 'cast-test', {})
assert(bound.promptPipeline.characterContext, 'matching active identities must retain appearance context')
assert.doesNotMatch(bound.prompt, /Identity unresolved|preserve the active Persona/, 'unresolved identity diagnostics must never be visual provider text')
const unspecified = await backend.parseSlotPrompt({ ...base, requestId: 'unnamed', originalSceneBrief: 'Two people stand inside a café.' }, 'illustration', [], 0, config, 'cast-test', {})
assert(unspecified.promptPipeline.characterContext, 'without an explicit complete cast list, existing cast binding semantics must remain intact')
const incomplete = await backend.parseSlotPrompt({ ...base, requestId: 'incomplete', originalSceneBrief: 'Exactly two visible people: Han Yejin; wide café view. Mira holds a cup.' }, 'illustration', [], 0, config, 'cast-test', {})
assert(incomplete.promptPipeline.characterContext, 'incomplete names must not silently override an explicit binding')
const incidental = await backend.parseSlotPrompt({ ...base, requestId: 'incidental', originalSceneBrief: 'Mira reads a letter about Han Yejin and Song Arin inside a café.' }, 'illustration', [], 0, config, 'cast-test', {})
assert(incidental.promptPipeline.characterContext, 'incidental referenced names are not a complete visible cast')
const single = await backend.parseSlotPrompt({ ...base, requestId: 'single', originalSceneBrief: 'Exactly one visible person: Han Yejin; she holds a café door open.' }, 'illustration', [], 0, config, 'cast-test', {})
assert.doesNotMatch(single.prompt, /Mira|Cerys|Identity unresolved|2people/, 'a complete single NPC cast must not acquire bindings or their two-person token')
const relay = await backend.parseSlotPrompt({ ...base, cast: undefined, requestId: 'relay', promptSource: 'structured', originalSceneBrief: npcScene, composedPositivePrompt: npcScene, prosePromptComposition: { namedSubjects: ['Han Yejin', 'Song Arin'], expectedPeopleCount: 2, peoplePolicy: 'required', perspectiveMode: 'storyboard' } }, 'illustration', [], 0, config, 'cast-test', {})
assert.doesNotMatch(relay.prompt, /Mira|Cerys|Identity unresolved|red hair|red_hair/, 'composed Relay Planned path must share the ownership gate')
const peopleAndDocument = { ...base, cast: undefined, requestId: 'document-storyboard', promptSource: 'structured', originalSceneBrief: 'Yejin folds a paper document while Arin holds its blue document folder beside the office table.', composedPositivePrompt: 'Yejin folds the document at the table. Arin holds the blue document folder.', authoritativeSourceParagraph: 'Yejin folds the document. Arin holds the folder.', prosePromptComposition: { namedSubjects: ['Yejin', 'Arin'], expectedPeopleCount: 2, peoplePolicy: 'required', perspectiveMode: 'storyboard' } }
assert.equal(backend.classifyImageRequest(peopleAndDocument), 'narrative-scene', 'Storyboard people doing a task must not become a flat-content document request')
const documentScenePrepared = await backend.parseSlotPrompt(peopleAndDocument, 'illustration', [], 0, config, 'cast-test', {})
assert.doesNotMatch(documentScenePrepared.prompt, /document fills most|page-centered|top-down or near-top-down/, 'document heuristics cannot overwrite the authored Storyboard camera')
assert.equal(documentScenePrepared.promptPipeline.requestClassification, 'narrative-scene')
assert.equal(backend.classifyImageRequest({ ...peopleAndDocument, originalSceneBrief: 'Object only: a flat document scan, no people visible.', composedPositivePrompt: 'A document scan.', prosePromptComposition: { ...peopleAndDocument.prosePromptComposition, namedSubjects: [], expectedPeopleCount: 0, peoplePolicy: 'forbidden' } }), 'document', 'real object-only document scans must retain their direct-content route')
assert.equal(declaredBooruPeopleCount('2girls, 1man, 1girl, short_hair, 1girl'), 3)
assert.equal(declaredBooruPeopleCount('2people, 1girl, 1boy, 1girl'), 2)
assert.equal(declaredBooruPeopleCount('1girl, solo, a stray sentence mentions 4 people'), 1)
activeCharacter = { id: 'mira-id', name: 'Mira Relay Testing', description: 'red hair, lean build', extensions: { alternate_character_name: 'Mira' } }
const alternateBrief = 'Exactly two visible people: Mira and Cerys the Dreamer; Mira lifts a wooden crate while Cerys the Dreamer steadies its opposite corner.'
for (const structured of [false, true]) {
  const aliasPrepared = await backend.parseSlotPrompt({ ...base, chatId: `alternate-name-${structured}`, requestId: `alternate-${structured}`, originalSceneBrief: alternateBrief, ...(structured ? { cast: undefined, promptSource: 'structured', composedPositivePrompt: alternateBrief, prosePromptComposition: { namedSubjects: ['Mira', 'Cerys the Dreamer'], expectedPeopleCount: 2, peoplePolicy: 'required', perspectiveMode: 'storyboard', rawOutput: { plannerVersion: RELAY_PLANNED_V2 } } } : {}) }, 'illustration', [], 0, config, 'cast-test', {})
  if (!structured) assert(aliasPrepared.promptPipeline.characterContext, 'explicit host alternate name must retain its card identity')
  assert.match(aliasPrepared.prompt, /Mira:.*red hair/, 'identity must be attributed to the scene name rather than the library title')
  assert.match(aliasPrepared.prompt, /2people/, 'both named active actors must survive structured cast selection even without the legacy cast attribute')
  assert.doesNotMatch(aliasPrepared.prompt, /Mira Relay Testing:/, 'library titles must not introduce another apparent scene actor')
}
activeCharacter = { id: 'mira-id', name: 'Mira Relay Testing', description: 'red hair, lean build' }
const unconfiguredAlias = await backend.parseSlotPrompt({ ...base, chatId: 'unconfigured-name', originalSceneBrief: alternateBrief }, 'illustration', [], 0, config, 'cast-test', {})
assert.equal(unconfiguredAlias.promptPipeline.characterContext, '', 'short names must not be guessed from the library title')
activeCharacter = { id: 'mira-id', name: 'Mira', description: 'red hair, lean build' }
const shortPreset = await backend.parseSlotPrompt({ ...base, requestId: 'short-preset-collision', originalSceneBrief: 'Two people visible. Mira holds open the equipment case while Cerys lifts its orange cable.' }, 'illustration', [], 0, config, 'cast-test', { promptPresets: [{ id: 'unbound-short-name', kind: 'persona', name: 'Cerys', prompt: 'pink eyes, horns' }] })
assert.deepEqual(shortPreset.promptPipeline.visualSubjectPrompts.map(subject => subject.name), ['Mira', 'Cerys the Dreamer'], 'two-person cast must not acquire an unverified short-name preset as a third actor')
assert.doesNotMatch(shortPreset.prompt, /3people/, 'native discovery cannot exceed the declared scene capacity')
assert.match(normalizeBooruTagPrompt('1girl, short_hair, holding, paper, a stray prose fragment'), /1girl, short_hair, holding, paper/)
await assert.rejects(backend.parseSlotPrompt({ ...base, requestId: 'natural-over-limit', originalSceneBrief: 'Exactly three visible people: Mira, Cerys the Dreamer and Han Yejin; they examine the folder.' }, 'illustration', [], 0, config, 'cast-test', {}), /Maximum Characters in Image is 2.*3 visible people/)
const tagConfig = await backend.setConfig({ ...config, proseIllustratorSettings: { ...config.proseIllustratorSettings, promptFormat: 'danbooru-tags', maximumCharacters: 2 } }, 'cast-test')
await assert.rejects(backend.parseSlotPrompt({ ...base, chatId: 'fresh-tag-limit-chat', requestId: 'tag-over-limit', originalSceneBrief: 'medium_shot, 2girls, 1man, 1girl, short_hair, paper' }, 'illustration', [], 0, tagConfig, 'cast-test', {}), /Maximum Characters in Image is 2.*3 visible people/)
const foldingSource = 'Yejin laid the pencil down beside the ruler. She folded the paper in half.'
const foldedTags = await backend.parseSlotPrompt({ ...base, chatId: 'tag-fold-contract', requestId: 'fold-contract', cast: 'none', originalSceneBrief: '1girl, solo, folding, paper, pencil, ruler', authoritativeSourceParagraph: foldingSource }, 'illustration', [], 0, tagConfig, 'cast-test', {})
assert.doesNotMatch(foldedTags.prompt, /(?:^|, )pencil(?:,|$)/, 'Model Planned final shaping must remove the explicitly idle tool tag')
assert.equal(foldedTags.parserUsed, false, 'deterministic Model Planned shaping remains one-pass')
assert(foldedTags.promptPipeline.warnings.some(warning => warning.code === 'scene-idle-tool-omitted'), 'local scene correction must be visible in generation diagnostics')
await assert.rejects(backend.parseSlotPrompt({ ...base, chatId: 'tag-wrong-contract', requestId: 'wrong-contract', originalSceneBrief: '1girl, writing, paper, holding_pencil', authoritativeSourceParagraph: foldingSource }, 'illustration', [], 0, tagConfig, 'cast-test', {}), /Storyboard scene contract.*No image was dispatched/)
await assert.rejects(backend.parseSlotPrompt({ ...base, chatId: 'natural-wrong-contract', requestId: 'wrong-contract', originalSceneBrief: 'Exactly one visible person: Han Yejin. Yejin writes on the paper.', authoritativeSourceParagraph: foldingSource }, 'illustration', [], 0, config, 'cast-test', {}), /Storyboard scene contract.*No image was dispatched/)
const relayFold = await backend.parseSlotPrompt({ ...base, cast: undefined, promptSource: 'structured', chatId: 'relay-fold-contract', originalSceneBrief: 'Yejin folds the paper.', composedPositivePrompt: '1girl, solo, folding, paper, pencil', authoritativeSourceParagraph: foldingSource, prosePromptComposition: { namedSubjects: ['Yejin'], expectedPeopleCount: 1, perspectiveMode: 'storyboard', rawOutput: { plannerVersion: RELAY_PLANNED_V2, illustration: { anchor: { anchorExcerpt: 'She folded the paper in half.' } } } } }, 'illustration', [], 0, tagConfig, 'cast-test', {})
assert.doesNotMatch(relayFold.prompt, /(?:^|, )pencil(?:,|$)/, 'Relay Planned final shaping must share the same idle-tool check')
for (const format of ['natural-language', 'danbooru-tags']) {
  const poseUserId = `fold-pose-user-${format}`
  const poseConfig = await backend.setConfig({ ...config, proseIllustratorSettings: { ...config.proseIllustratorSettings, promptFormat: format } }, poseUserId)
  const posePrompt = format === 'natural-language' ? 'Exactly one visible person: Han Yejin. Yejin stands with her arms crossed.' : '1girl, solo, crossed_arms, standing'
  const posePrepared = await backend.parseSlotPrompt({ ...base, cast: 'none', chatId: `fold-pose-${format}`, originalSceneBrief: posePrompt, authoritativeSourceParagraph: 'Yejin folded her arms across her chest.' }, 'illustration', [], 0, poseConfig, poseUserId, {})
  assert.match(posePrepared.prompt, format === 'natural-language' ? /arms crossed/ : /crossed_arms/)
  assert.equal(posePrepared.parserUsed, false, 'equivalent pose acceptance must remain a deterministic one-pass check')
}
const laterMoment = 'Yejin folded the paper. She holds the sealed envelope against her chest.'
const laterConfig = await backend.setConfig({ ...config, proseIllustratorSettings: { ...config.proseIllustratorSettings, promptFormat: 'natural-language' } }, 'selected-instant-user')
const laterPrepared = await backend.parseSlotPrompt({ ...base, cast: 'none', chatId: 'selected-later-instant', originalSceneBrief: 'Exactly one visible person: Han Yejin. Yejin holds a sealed envelope against her chest.', authoritativeSourceParagraph: laterMoment, proseAnchor: { selectedExcerpt: 'She holds the sealed envelope against her chest.' } }, 'illustration', [], 0, laterConfig, 'selected-instant-user', {})
assert.match(laterPrepared.prompt, /holds a sealed envelope/, 'the selected current instant must not be forced to repeat an earlier fold')
await assert.rejects(backend.parseSlotPrompt({ ...base, cast: 'none', chatId: 'fabricated-later-instant', originalSceneBrief: 'Exactly one visible person: Han Yejin. Yejin holds a sealed envelope against her chest.', authoritativeSourceParagraph: 'Yejin folded the paper.', proseAnchor: { selectedExcerpt: 'She holds the sealed envelope against her chest.' } }, 'illustration', [], 0, laterConfig, 'selected-instant-user', {}), /Storyboard scene contract.*No image was dispatched/, 'a fabricated excerpt must not bypass the actual source action')

const vault = emptyContinuityVault('prop-chat')
const separate = emptyContinuityVault('separate-host-alias')
const unbound = registerCanonicalCharacter(separate, { name: 'Mira', sourceType: 'manual', userConfirmed: true })
const host = registerCanonicalCharacter(separate, { name: 'Mira Relay Testing', canonicalCharacterId: 'verified-host-id', lumiverseCharacterId: 'verified-host-id', sourceType: 'character-card' })
registerCanonicalCharacter(separate, { name: 'Mira', canonicalCharacterId: host.canonicalCharacterId, lumiverseCharacterId: 'verified-host-id', aliases: ['Mira Relay Testing'], sourceType: 'character-card', preserveSeparateNamedRecords: true })
assert.equal(Object.keys(separate.characters).length, 2, 'host alias refresh must preserve distinct historical name-only records')
assert(separate.characters[unbound.canonicalCharacterId], 'independent record must not be deleted by alias registration')
addAppearanceFact(separate, { characterId: host.canonicalCharacterId, layer: 'visual-identity', category: 'hair', value: 'red hair', sourceType: 'manual' })
const hostProjection = projectContinuityForGeneration(separate, { chatId: separate.chatId, subjectNames: [host.canonicalCharacterId], sceneBrief: 'Mira carries a crate.', strength: 'strong' })
assert(hostProjection.included.some(fact => fact.canonicalCharacterId === host.canonicalCharacterId), 'verified stable ID must resolve the host appearance despite duplicate story names')
const subject = registerCanonicalCharacter(vault, { name: 'Yejin', sourceType: 'manual', userConfirmed: true })
const current = addAppearanceFact(vault, { characterId: subject.canonicalCharacterId, layer: 'current-appearance', category: 'other', value: 'eyes emitting a blue glow', sourceType: 'appearance-sidecar', semanticAuthority: 'appearance-sidecar' })
// Previously persisted malformed Sidecar facts must also be filtered on load.
vault.currentAppearance['legacy-prop'] = { ...current, factId: 'legacy-prop', value: 'penlight emitting a narrow', category: 'other' }
const normalized = normalizeContinuityVault(vault, vault.chatId)
const projection = projectContinuityForGeneration(normalized, { chatId: vault.chatId, subjectNames: ['Yejin'], sceneBrief: 'Yejin holds a café door open with one hand.', strength: 'strong' })
assert(!projection.included.some(fact => /penlight/.test(fact.value)), 'stale prop activity must not become persistent Appearance')
assert(projection.included.some(fact => /eyes emitting a blue glow/.test(fact.value)), 'actual visual body traits must remain eligible')
assert.throws(() => addAppearanceFact(normalized, { characterId: subject.canonicalCharacterId, layer: 'current-appearance', category: 'other', value: 'lantern casting a beam', sourceType: 'appearance-sidecar', semanticAuthority: 'appearance-sidecar' }), /could not be normalized/, 'new object activity must not enter Appearance state')
const arin = registerCanonicalCharacter(normalized, { name: 'Arin', sourceType: 'manual', userConfirmed: true })
const other = registerCanonicalCharacter(normalized, { name: 'Clerk', sourceType: 'manual', userConfirmed: true })
for (const character of [arin, other]) addAppearanceFact(normalized, { characterId: character.canonicalCharacterId, layer: 'current-appearance', category: 'other', value: 'cardigan cuffs pulled over her hands', sourceType: 'appearance-sidecar', semanticAuthority: 'appearance-sidecar' })
const coverage = projectContinuityForGeneration(normalized, { chatId: vault.chatId, subjectNames: ['Arin', 'Clerk'], sceneBrief: 'Arin leans toward the folder; she wears an ivory cardigan. Her left hand supports its underside while her right sleeve covers her right hand. Clerk watches from the counter.', strength: 'strong' })
assert(!coverage.included.some(fact => fact.canonicalCharacterId === arin.canonicalCharacterId && /cuffs pulled/.test(fact.value)), 'explicit named and pronoun-owned sleeve coverage must suppress that subject\'s stale coverage')
assert(coverage.included.some(fact => fact.canonicalCharacterId === other.canonicalCharacterId && /cuffs pulled/.test(fact.value)), 'another subject\'s coverage must remain untouched')
const ambiguousCoverage = projectContinuityForGeneration(normalized, { chatId: vault.chatId, subjectNames: ['Arin', 'Clerk'], sceneBrief: 'Arin and Clerk wait together. Her sleeve covers her right hand.', strength: 'strong' })
assert.equal(ambiguousCoverage.included.filter(fact => /cuffs pulled/.test(fact.value)).length, 2, 'ambiguous pronouns must not manufacture an owner')
console.log('Illustration cast contamination smoke passed: complete named scene cast gates unrelated bindings across both preparation paths; matching/unnamed cast contracts retained; diagnostics excluded; legacy/new prop activity excluded while body traits retained.')
