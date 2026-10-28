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
const pronounSubjects = backend.relayPlannedSubjectStates({ continuityVault: emptyContinuityVault('unverified-each') }, 'unverified-each',
  'Beside the table, they stood one pace apart. Each held one ceramic cup in their own right hand.', backend.defaultProseIllustratorSettings())
assert.equal(pronounSubjects.find(subject => subject.name === 'Each')?.verifiedIdentity, false, 'capitalized Each from the live cup paragraph must remain explicitly unverified')
const aliasVault = emptyContinuityVault('aliases')
const nativeOwner = registerCanonicalCharacter(aliasVault, { canonicalCharacterId: 'native-owner', name: 'Han Yejin', lumiverseCharacterId: 'native-owner', sourceType: 'character-card' })
const nativeIdentity = { id: nativeOwner.canonicalCharacterId, name: nativeOwner.canonicalCharacterName, aliases: [] }
assert(backend.sceneVerifiedIdentityAliases(nativeIdentity, aliasVault, 'Yejin sits on the chair.').aliases.includes('Yejin'), 'a native card must retain appearance when the source uses its unambiguous short name')
assert(!backend.sceneVerifiedIdentityAliases(nativeIdentity, aliasVault, 'Someone sits on the chair.').aliases.includes('Yejin'), 'an absent short name cannot be invented')
aliasVault.characters['independent-owner'] = { ...nativeOwner, canonicalCharacterId: 'independent-owner', canonicalCharacterName: 'Yejin', lumiverseCharacterId: undefined, aliases: [], sourceType: 'manual' }
assert(!backend.sceneVerifiedIdentityAliases(nativeIdentity, aliasVault, 'Yejin sits on the chair.').aliases.includes('Yejin'), 'an independent character with the same short name must prevent identity borrowing')
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
for (const maximumCharacters of [1, 2, 8]) {
  const runtime = backend.buildIllustratorRuntimeDirective({ ...config.proseIllustratorSettings, maximumCharacters }, [])
  assert.match(runtime, new RegExp(`Model Planned cast guidance: aim for at most ${maximumCharacters} visible characters`))
  assert.match(runtime, /preserve every necessary participant/, 'the actual Model Planned runtime must explain that cast guidance cannot remove actors')
}
assert.doesNotMatch(backend.buildIllustratorRuntimeDirective({ ...config.proseIllustratorSettings, mode: 'relay-planned' }, []), /Model Planned cast guidance/, 'Relay-Planned retains its separate bounded shot-selection contract')
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
for (const format of ['natural-language', 'danbooru-tags']) {
  const user = `mixed-scene-${format}`
  const settings = await backend.setConfig({ ...config, proseIllustratorSettings: { ...config.proseIllustratorSettings, promptFormat: format } }, user)
  for (const planner of ['model', 'relay']) {
    const imagePrompt = format === 'natural-language' ? '"Yejin sketches the floor plan at the table."' : '1girl, solo, Yejin sketches the floor plan, table, pencil'
    const job = { ...base, cast: 'none', chatId: `${user}-${planner}`, originalSceneBrief: imagePrompt, authoritativeSourceParagraph: 'Yejin draws the floor plan at the table.', ...(planner === 'relay' ? { promptSource: 'structured', composedPositivePrompt: imagePrompt, prosePromptComposition: { namedSubjects: ['Yejin'], expectedPeopleCount: 1, perspectiveMode: 'storyboard', rawOutput: { plannerVersion: RELAY_PLANNED_V2 } } } : {}) }
    const prepared = await backend.parseSlotPrompt(job, 'illustration', [], 0, settings, user, {})
    assert.match(prepared.prompt, /Yejin sketches the floor plan/, `${planner}/${format}: the checked action must survive final normalization`)
    const sent = backend.assemblePreparedProviderPrompts({ effectiveBaseTags: '', userPositivePromptPrefix: '', userNegativePromptPrefix: '' }, prepared)
    assert.match(sent.prompt, /Yejin sketches the floor plan/, `${planner}/${format}: final provider assembly must not silently erase action evidence`)
    assert.equal(prepared.parserUsed, false, 'equivalent visual evidence needs no extra model pass')
  }
}
assert.equal(normalizeBooruTagPrompt('Yejin sketches paper, folding paper, lifting a cup'), 'Yejin sketches paper, folding paper, lifting a cup', 'image-only visual fragments remain usable without being rewritten into tags')
assert.doesNotMatch(normalizeBooruTagPrompt('1girl, solo, pencil, return JSON, <draw>'), /JSON|<draw>/, 'non-visual control/markup snippets remain excluded')
const quotedBound = await backend.parseSlotPrompt({ ...base, chatId: 'quoted-bound-scene', originalSceneBrief: '"Mira folds the paper while Cerys the Dreamer watches."', authoritativeSourceParagraph: 'Mira folds the paper while Cerys the Dreamer watches.' }, 'illustration', [], 0, config, 'cast-test', {})
assert.match(quotedBound.prompt, /Mira folds the paper/, 'identity supplementation must not make the quoted visual action disappear from the scene check')
for (const format of ['natural-language', 'danbooru-tags']) {
  const user = `reported-lift-${format}`
  const settings = await backend.setConfig({ ...config, proseIllustratorSettings: { ...config.proseIllustratorSettings, promptFormat: format } }, user)
  for (const planner of ['model', 'relay']) {
    const source = 'His hand lifts, crossing the three feet of sterile air between them.'
    const imagePrompt = format === 'natural-language' ? "Exactly one visible person: Mira. Mira's left hand reaches across the small gap between them." : '1girl, solo, her hand reaches across the small gap, indoors'
    const job = { ...base, cast: 'none', chatId: `${user}-${planner}`, originalSceneBrief: imagePrompt, authoritativeSourceParagraph: source, ...(planner === 'relay' ? { promptSource: 'structured', composedPositivePrompt: imagePrompt, prosePromptComposition: { namedSubjects: ['Mira'], expectedPeopleCount: 1, perspectiveMode: 'storyboard', rawOutput: { plannerVersion: RELAY_PLANNED_V2 } } } : {}) }
    const prepared = await backend.parseSlotPrompt(job, 'illustration', [], 0, settings, user, {})
    assert.match(prepared.prompt, /hand reaches across/, `${planner}/${format}: actual horizontal movement survives final shaping`)
    assert.equal(prepared.parserUsed, false)
  }
}
const roleSource = 'The old man lifts his thermos in a small salute.'
const rolePrepared = await backend.parseSlotPrompt({ ...base, cast: 'none', chatId: 'reported-incidental-role', originalSceneBrief: 'Exactly one visible person: Mira. Mira stands mid-step, body locked rigid, holding a script binder at chest height.', authoritativeSourceParagraph: roleSource, proseAnchor: { selectedExcerpt: roleSource } }, 'illustration', [], 0, config, 'cast-test', {})
assert.match(rolePrepared.prompt, /body locked rigid/)
assert.doesNotMatch(rolePrepared.prompt, /thermos|old man|salute/, 'an incidental actor/action must not be invented to satisfy proximity')
assert(rolePrepared.promptPipeline.warnings.some(warning => warning.code === 'scene-action-scope-unproven'), 'uncertain proximity must remain visible, not become a claimed semantic pass')
const npcScene = 'Exactly two visible people: Han Yejin and Song Arin; the server remains outside the frame. Wide view inside a café. Yejin holds the stuck door open with one hand. Arin lifts her handbag clear of the walkway.'
const prepared = await backend.parseSlotPrompt({ ...base, originalSceneBrief: npcScene }, 'illustration', [], 0, config, 'cast-test', {})
assert.doesNotMatch(prepared.prompt, /Mira|Cerys|Identity unresolved|red hair|red_hair/, 'explicit complete NPC cast must not acquire unrelated bound identities')
assert.equal(prepared.promptPipeline.characterContext, '')
assert.equal(prepared.promptPipeline.personaContext, '')
assert.match(prepared.prompt, /Yejin holds the stuck door/)
assert.match(prepared.prompt, /Arin lifts her handbag/)
for (const count of ['two visible adults', 'two visible people']) {
  const headedScene = `Exactly ${count} in one continuous studio scene. Screen-left, Han Yejin: a woman in a yellow raincoat sits on a bench, both palms beside her hips. Screen-right, Kim Taehyun: a man in a navy hoodie stands holding a red cup in his right hand.`
  const headed = await backend.parseSlotPrompt({ ...base, requestId: `headed-${count}`, originalSceneBrief: headedScene }, 'illustration', [], 0, config, 'cast-test', {})
  assert.doesNotMatch(headed.prompt, /Mira|Cerys|red hair|red_hair/, 'complete counted owner headings must not acquire an unrelated active card despite cast=char')
  assert.equal(headed.promptPipeline.characterContext, '')
  assert.match(headed.prompt, /Han Yejin:.*both palms beside her hips/)
  assert.match(headed.prompt, /Kim Taehyun:.*red cup in his right hand/)
  assert.equal(headed.parserUsed, false, 'counted owner binding remains a local check')
}
const partialHeadings = await backend.parseSlotPrompt({ ...base, requestId: 'partial-headings', originalSceneBrief: 'Exactly two visible adults in a studio. Screen-left, Han Yejin: a woman seated on a bench. Mira stands beside her.' }, 'illustration', [], 0, config, 'cast-test', {})
assert(partialHeadings.promptPipeline.characterContext, 'partial owner headings cannot override the existing explicit cast binding')
const colonHeadings = await backend.parseSlotPrompt({ ...base, requestId: 'colon-headings', originalSceneBrief: 'Exactly two adults visible. Screen-left: Han Yejin, a woman sitting on the bench with her hands beside her hips. Screen-right: Kim Taehyun, a man standing with an open folder in both hands.' }, 'illustration', [], 0, config, 'cast-test', {})
assert.equal(colonHeadings.promptPipeline.characterContext, '', 'the live colon-first owner heading spelling must also exclude the unrelated active character')
assert.doesNotMatch(colonHeadings.prompt, /Mira|Cerys|red hair|red_hair/)
const boundHeadings = await backend.parseSlotPrompt({ ...base, requestId: 'bound-headings', originalSceneBrief: 'Exactly two visible adults in a studio. Screen-left, Mira: a woman holding a cup. Screen-right, Cerys the Dreamer: a woman watching Mira.' }, 'illustration', [], 0, config, 'cast-test', {})
assert(boundHeadings.promptPipeline.characterContext, 'complete owner headings that include the bound character must retain her identity')
const clothedOwnerBlocks = 'Center, Kim Taehyun: a man in a navy hoodie seated on a chair.\n\nDirectly behind the chair, Han Yejin: a woman in a yellow raincoat standing with her palms on the seated man\'s shoulders.\n\nScreen-right, Gabrielle: a man in a burgundy sweater standing apart with a red cup.'
for (const [countText, ownerBlocks] of [
  ['Exactly three visible adults.', clothedOwnerBlocks],
  ['Exactly three fully clothed adults visible.', clothedOwnerBlocks.replace('Directly behind the chair,', 'Behind,')],
  ['Exactly three fully clothed adults visible.', clothedOwnerBlocks],
]) {
  const completeClothed = await backend.parseSlotPrompt({ ...base, requestId: `clothed-complete-${countText}-${ownerBlocks.length}`, originalSceneBrief: `${countText}\n\n${ownerBlocks}` }, 'illustration', [], 0, config, 'cast-test', {})
  assert.equal(completeClothed.promptPipeline.characterContext, '', 'the live clothed-count/depth-heading spellings must exclude the unrelated active card')
  assert.equal(completeClothed.promptPipeline.personaContext, '')
  assert.doesNotMatch(completeClothed.prompt, /subject Mira|red hair|lean_build/, 'a complete three-NPC scene cannot acquire the active speaker\'s traits')
  assert.match(completeClothed.prompt, /Kim Taehyun:[\s\S]*Han Yejin:[\s\S]*Gabrielle:/, 'all authored owner blocks remain intact')
  assert.equal(completeClothed.parserUsed, false, 'explicit owner recognition must not introduce a sidecar call')
}
for (const incompleteClothed of [
  `Exactly four fully clothed adults visible.\n\n${clothedOwnerBlocks}`,
  `Exactly three fully clothed adults visible.\n\n${clothedOwnerBlocks.replace('Gabrielle:', 'Han Yejin:')}`,
  clothedOwnerBlocks,
]) {
  const incompleteClothedPrepared = await backend.parseSlotPrompt({ ...base, requestId: `clothed-incomplete-${incompleteClothed.length}`, originalSceneBrief: incompleteClothed }, 'illustration', [], 0, config, 'cast-test', {})
  assert(incompleteClothedPrepared.promptPipeline.characterContext, 'mismatched, duplicate or uncounted extended headings cannot override the explicit cast binding')
}
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
const authoredThreePeople = await backend.parseSlotPrompt({ ...base, requestId: 'natural-over-limit', originalSceneBrief: 'Exactly three visible people: Mira, Cerys the Dreamer and Han Yejin; they examine the folder.' }, 'illustration', [], 0, config, 'cast-test', {})
assert.match(authoredThreePeople.prompt, /Mira.*Cerys the Dreamer.*Han Yejin/, 'Model Planned must preserve all three authored actors rather than delete one to meet planning guidance')
assert.equal(authoredThreePeople.parserUsed, false, 'an over-guidance authored cast must not add a parser call')
assert(authoredThreePeople.promptPipeline.warnings.some(warning => warning.code === 'model-placed-cast-exceeds-guidance'), 'authored cast guidance mismatch must remain visible in diagnostics without blocking generation')
const tagConfig = await backend.setConfig({ ...config, proseIllustratorSettings: { ...config.proseIllustratorSettings, promptFormat: 'danbooru-tags', maximumCharacters: 2 } }, 'cast-test')
const mixedOwnerTags = "wide_shot, 1boy, navy_hoodie, sitting, palms_on_own_thighs, 1girl, green_cardigan, standing_behind_chair, left_palm_on_seated_person's_left_shoulder"
const correctedMixedOwners = await backend.parseSlotPrompt({ ...base, cast: 'none', chatId: 'mixed-owner-count', requestId: 'mixed-owner-count', originalSceneBrief: `2boys, ${mixedOwnerTags}` }, 'illustration', [], 0, tagConfig, 'cast-test', {})
assert.doesNotMatch(correctedMixedOwners.prompt, /(?:^|, )2boys(?:,|$)/, 'actual Story Model prompt shaping must remove the contradictory aggregate count')
assert.match(correctedMixedOwners.prompt, /1boy, navy_hoodie, sitting, palms_on_own_thighs, 1girl, green_cardigan, standing_behind_chair/)
assert.equal(correctedMixedOwners.parserUsed, false, 'count correction must not add a model call')
assert(!correctedMixedOwners.promptPipeline.warnings.some(warning => warning.code === 'model-placed-cast-exceeds-guidance'), 'two complete owners must not receive a false three-person warning')
const authoredThreePeopleTags = await backend.parseSlotPrompt({ ...base, chatId: 'fresh-tag-limit-chat', requestId: 'tag-over-limit', originalSceneBrief: 'medium_shot, 2girls, 1boy, standing, examining, folder' }, 'illustration', [], 0, tagConfig, 'cast-test', {})
assert.match(authoredThreePeopleTags.prompt, /2girls/)
assert.match(authoredThreePeopleTags.prompt, /1boy/)
assert(authoredThreePeopleTags.promptPipeline.warnings.some(warning => warning.code === 'model-placed-cast-exceeds-guidance'), 'Booru declared three-person cast must be accepted with a diagnostic warning, not silently clamped')
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
vault.currentAppearance['legacy-garment-prop'] = { ...current, factId: 'legacy-garment-prop', value: 'grey wool coat flattened against the table', category: 'other' }
const normalized = normalizeContinuityVault(vault, vault.chatId)
const projection = projectContinuityForGeneration(normalized, { chatId: vault.chatId, subjectNames: ['Yejin'], sceneBrief: 'Yejin holds a café door open with one hand.', strength: 'strong' })
assert(!projection.included.some(fact => /penlight/.test(fact.value)), 'stale prop activity must not become persistent Appearance')
assert(!projection.included.some(fact => /coat flattened/.test(fact.value)), 'a discarded garment must not return as its former wearer\'s current Appearance')
assert(projection.included.some(fact => /eyes emitting a blue glow/.test(fact.value)), 'actual visual body traits must remain eligible')
assert.throws(() => addAppearanceFact(normalized, { characterId: subject.canonicalCharacterId, layer: 'current-appearance', category: 'other', value: 'lantern casting a beam', sourceType: 'appearance-sidecar', semanticAuthority: 'appearance-sidecar' }), /could not be normalized/, 'new object activity must not enter Appearance state')
assert.throws(() => addAppearanceFact(normalized, { characterId: subject.canonicalCharacterId, layer: 'current-appearance', category: 'other', value: 'wet shirt folded on the chair', sourceType: 'appearance-sidecar', semanticAuthority: 'appearance-sidecar' }), /could not be normalized/, 'even wet discarded clothing is a scene prop, not a worn temporary state')
for (const value of ['coat draped over her shoulders', 'shirt flattened against her chest']) {
  assert(addAppearanceFact(normalized, { characterId: subject.canonicalCharacterId, layer: 'current-appearance', category: 'temporary-clothing-state', value, sourceType: 'appearance-sidecar', semanticAuthority: 'appearance-sidecar' }), 'on-body clothing must remain eligible')
}
const arin = registerCanonicalCharacter(normalized, { name: 'Arin', sourceType: 'manual', userConfirmed: true })
const other = registerCanonicalCharacter(normalized, { name: 'Clerk', sourceType: 'manual', userConfirmed: true })
for (const character of [arin, other]) addAppearanceFact(normalized, { characterId: character.canonicalCharacterId, layer: 'current-appearance', category: 'other', value: 'cardigan cuffs pulled over her hands', sourceType: 'appearance-sidecar', semanticAuthority: 'appearance-sidecar' })
const coverage = projectContinuityForGeneration(normalized, { chatId: vault.chatId, subjectNames: ['Arin', 'Clerk'], sceneBrief: 'Arin leans toward the folder; she wears an ivory cardigan. Her left hand supports its underside while her right sleeve covers her right hand. Clerk watches from the counter.', strength: 'strong' })
assert(!coverage.included.some(fact => fact.canonicalCharacterId === arin.canonicalCharacterId && /cuffs pulled/.test(fact.value)), 'explicit named and pronoun-owned sleeve coverage must suppress that subject\'s stale coverage')
assert(coverage.included.some(fact => fact.canonicalCharacterId === other.canonicalCharacterId && /cuffs pulled/.test(fact.value)), 'another subject\'s coverage must remain untouched')
const ambiguousCoverage = projectContinuityForGeneration(normalized, { chatId: vault.chatId, subjectNames: ['Arin', 'Clerk'], sceneBrief: 'Arin and Clerk wait together. Her sleeve covers her right hand.', strength: 'strong' })
assert.equal(ambiguousCoverage.included.filter(fact => /cuffs pulled/.test(fact.value)).length, 2, 'ambiguous pronouns must not manufacture an owner')
console.log('Illustration cast contamination smoke passed: complete named scene cast gates unrelated bindings across both preparation paths; matching/unnamed cast contracts retained; diagnostics excluded; legacy/new prop activity excluded while body traits retained.')
