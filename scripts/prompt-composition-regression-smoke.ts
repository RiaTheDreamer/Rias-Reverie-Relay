// @ts-nocheck -- focused ownership/projection regressions from the 0.2.8.6 live diagnostics.
import { strict as assert } from 'node:assert'
import { readFileSync } from 'node:fs'

const storage = new Map<string, any>()
;(globalThis as any).spindle = {
  registerMessageContentProcessor() {}, registerInterceptor() { return () => {} }, registerMacro() {}, on() {}, onFrontendMessage() {}, sendToFrontend() {},
  permissions: { has() { return true }, onChanged() { return () => {} } },
  userStorage: {
    async getJson(path: string, options: any = {}) { return storage.has(path) ? structuredClone(storage.get(path)) : structuredClone(options.fallback || {}) },
    async setJson(path: string, value: any) { storage.set(path, structuredClone(value)) }, async mkdir() {},
  },
  chat: { async getMessages() { return [] } }, chats: { async get(chatId: string) { return { id: chatId } } },
  characters: { async get() { return null } }, personas: { async getActive() { return null } },
  world_books: { async getActivated() { return [] }, entries: { async get() { return null } } },
  imageGen: {}, variables: { global: { async set() {} }, chat: { async set() {} } },
  log: { info() {}, warn() {}, error() {} },
}

const backend = await import('../src/backend')
const { sanitizeC5AIdentityPrompt } = await import('../src/c5aIdentity')
const { mergeAppearancePromptFacts } = await import('../src/vault')
const { compactCompletedRecord, stripCompletedRecord } = await import('../src/completedState')

// Native generation prompt profiles are observable diagnostics, never Relay
// parser instructions. Switching MAIN/Kitty/Prolix must not change router text.
const relayContract = 'Preserve the authored scene, camera, cast, action, and environment. Return strict JSON.'
const profiles = [
  'MAIN: {{char}} with maximal portrait polish and active-character macros',
  'Kitty: cute close portrait, soft paws, profile-specific quality tags',
  'Prolix: verbose cinematic generation profile with provider tags',
]
const ownership = profiles.map(profile => backend.isolateRelayParserInstructions(profile, relayContract))
for (let index = 0; index < ownership.length; index += 1) {
  assert.equal(ownership[index].rawTemplate, '')
  assert.equal(ownership[index].resolvedTemplate, '')
  assert.equal(ownership[index].relayParserInstructions, relayContract)
  assert.equal(ownership[index].nativeParserTemplateInherited, false)
  assert(ownership[index].activeNativeGenerationPromptTemplate.includes(profiles[index].split(':')[0]))
}
assert.equal(new Set(ownership.map(row => row.relayParserInstructions)).size, 1)

// Follow Native Parser follows only runtime connection/model/parameters. Stored
// preset registry metadata and active generation-profile text do not own Relay.
assert.deepEqual(backend.followedNativeParserConfig({
  promptParserConnectionId: 'runtime-parser', promptParserModel: 'runtime-model', promptParserParameters: { temperature: 0.2 },
  activePromptPresetId: 'MAIN', customPrompt: profiles[0],
  promptPresets: [{ id: 'MAIN', parserConnectionId: 'wrong-preset-parser', parserModel: 'wrong-preset-model' }],
}), {
  parserConnectionId: 'runtime-parser', parserModel: 'runtime-model', parserParameters: { temperature: 0.2 },
})
const backendSource = readFileSync(new URL('../src/backend.ts', import.meta.url), 'utf8')
assert(!backendSource.includes('Mirrored native ImageGen prompt mode:'), 'native generation mode must not enter Relay parser behavior payload')
assert(!backendSource.includes('Mirrored native ImageGen prompt preset id:'), 'native generation preset id must remain diagnostic-only')

// Semantic equivalents and descriptive aliases are legal. These are the two
// exact post-9f7e337 live rewrites which were falsely rejected.
const alarmSource = '2people, wide shot volcanic greenhouse terrace, male subject standing tall beside dark brass acoustic pipe, female subject seated on wooden bench, clutching slate-blue robe tightly, looking up in alert apprehension'
const alarmRewrite = 'A wide cinematic shot inside a volcanic greenhouse terrace. A tall man stands left beside the acoustic pipe. To the right, a young woman sits on a wooden bench, clutching a slate-blue wrap tightly, looking up with alert apprehension.'
assert.deepEqual(backend.modelPlacedSemanticViolations(alarmSource, alarmRewrite, ['Taejun', 'Arin'], alarmSource, 2), [])
const laughSource = '2people, medium close-up, volcanic conservatory terrace, female subject laughing, slender hands holding robe collar, male subject seated opposite leaning forward on one hand'
const laughRewrite = 'A cinematic medium close-up in a volcanic conservatory terrace. A young woman laughs, her slender hands clutching the robe collar. Opposite her, a topless young man leans forward on one hand.'
assert.deepEqual(backend.modelPlacedSemanticViolations(laughSource, laughRewrite, ['Taejun', 'Arin'], laughSource, 2, 'continuity for Taejun: topless'), [])

// Synonym acceptance is semantic rather than fixture-specific. Framing,
// posture, action, exposure, and location aliases retain their owners.
const synonymSource = '2people, broad establishing view of a glasshouse veranda, female subject perched on a bench carrying a folded robe, male subject beside her with a bare torso'
const synonymRewrite = 'An establishing composition on a greenhouse terrace: a woman is seated on a bench holding the folded robe while a bare-chested man stands beside her.'
assert.deepEqual(backend.modelPlacedSemanticViolations(synonymSource, synonymRewrite, [], synonymSource, 2), [])
assert.deepEqual(backend.modelPlacedSemanticViolations('Wide view inside a cavern.', 'Wide composition inside a grotto.', [], undefined, 0), [])

// Current scene state outranks stale context. A historical topless fact cannot
// authorize the Parser to undress a subject whose current shirt is explicit.
assert(backend.modelPlacedSemanticViolations(
  'Medium shot of a man wearing a buttoned shirt at the greenhouse door.',
  'Medium shot of a topless man at the greenhouse entrance.',
  [], undefined, 1, 'Earlier continuity: the man was topless.',
).includes('new nudity'))

assert.deepEqual(backend.modelPlacedSemanticViolations(
  'A two-person underwater scene: a man and woman sit on rock while their hands meet.',
  'Wide underwater composition of two people seated on rock, Arin named for clarity, their fingers brushing.',
  ['Arin'],
  'A two-person underwater scene: a man and woman sit on rock while their hands meet.',
  2,
), [])
assert.deepEqual(backend.modelPlacedSemanticViolations(
  'A woman cradles an injured wrist in a close-up.',
  'Close-up of Arin holding her injured wrist.',
  ['Arin'],
  'A woman cradles an injured wrist in a close-up.',
  1,
), [])
assert(backend.modelPlacedSemanticViolations('Two people stand apart.', 'Two people touch hands.', [], undefined, 2).includes('new touching'))
assert(backend.modelPlacedSemanticViolations('Two people stand apart.', 'Two people touch hands.', [], undefined, 2, 'Earlier they kissed and held hands.').includes('new touching'))
assert(backend.modelPlacedSemanticViolations('Two people stand together.', 'Three people stand together.', [], undefined, 2).includes('cast membership'))
assert(backend.modelPlacedSemanticViolations('Wide shot of Arin standing by a window.', 'Close-up of Arin standing by a window.', ['Arin']).includes('wide shot'))
assert(backend.modelPlacedSemanticViolations('Two people: a woman holds the lantern while a man watches.', 'Two people: a woman watches while a man grips the lantern.', [], undefined, 2).includes('holding owner'))
assert(backend.modelPlacedSemanticViolations('Two people on a greenhouse terrace, she looks at him.', 'Two people on a greenhouse terrace, she looks into the camera.', [], undefined, 2).includes('gaze target'))
assert(backend.modelPlacedSemanticViolations('Wide shot of two people on a greenhouse terrace.', 'Wide shot of two people on a beach.', [], undefined, 2).includes('environment/location'))
assert(backend.modelPlacedSemanticViolations('Two people on a dry terrace; the man has human legs.', 'Two people on a dry terrace; the man has a merman tail and no human legs.', [], undefined, 2).includes('current form'))

// Identity projection keeps durable face/body anchors, but mutable form,
// wardrobe, accessories, exposure, action, environment, and style are scene-owned.
const projected = sanitizeC5AIdentityPrompt([
  'Taejun', 'dark_hair', 'amber_eyes', 'sharp jawline', 'athletic build', 'long merman tail', 'crown ornament', 'golden arm cuffs', 'topless', 'ivory robe',
  'powerful tail curve', 'flowing hair', 'bubbles', 'glowing particles', 'warm volcanic rock',
  'highly detailed water', 'beautiful detailed eyes', 'intricate scales', 'ethereal glow', 'high detail',
].join(', '))
for (const durable of ['Taejun', 'dark_hair', 'amber_eyes', 'sharp jawline', 'athletic build']) {
  assert(projected.prompt.includes(durable), `durable identity fragment was removed: ${durable}`)
}
for (const contaminant of ['long merman tail', 'crown ornament', 'golden arm cuffs', 'topless', 'ivory robe', 'powerful tail curve', 'flowing hair', 'bubbles', 'glowing particles', 'warm volcanic rock', 'highly detailed water', 'beautiful detailed eyes', 'intricate scales', 'ethereal glow', 'high detail']) {
  assert(!projected.prompt.includes(contaminant), `scene/style fragment survived identity projection: ${contaminant}`)
  assert(projected.removed.includes(contaminant))
}

// Parser-success and authoritative-fallback shaping share scene-first ordering,
// count/blocking/form invariants, and the same minimal identity projection.
const transformingSubjects = [
  { id: 'taejun', name: 'Taejun', kind: 'character', prompt: 'handsome Korean man, dark wavy hair, warm brown eyes, merman, long merman tail, no human legs, ivory sea-silk robe, gold arm cuffs' },
  { id: 'arin', name: 'Arin', kind: 'persona', prompt: 'young woman, long blonde hair, pale skin, slate-blue robe, human legs' },
]
const dryScene = '2people, wide shot greenhouse terrace, male subject standing with human legs in dark trousers beside a brass pipe, female subject seated on a bench holding her robe'
const dryRewrite = 'Wide cinematic shot on a greenhouse terrace: a dark-haired man stands on human legs in dark trousers beside a brass pipe; a blonde woman sits on a bench clutching her robe.'
for (const route of [dryScene, dryRewrite]) {
  const shaped = backend.enforceVisualSubjectIdentity(route, transformingSubjects, true)
  assert(shaped.indexOf('greenhouse terrace') < shaped.indexOf('subject Taejun:'), 'scene must lead identity anchors')
  assert(!/merman tail|no human legs|sea-silk robe|gold arm cuffs/i.test(shaped), `stale mutable form/attire survived: ${shaped}`)
  assert.match(shaped, /dark wavy hair|warm brown eyes/)
  assert.deepEqual(backend.modelPlacedSemanticViolations(dryScene, shaped, ['Taejun', 'Arin'], dryScene, 2), [])
}
const merScene = '2people, wide underwater scene, male subject swimming with a long merman tail and no human legs, female subject beside him'
const merShaped = backend.enforceVisualSubjectIdentity(merScene, transformingSubjects, true)
assert.match(merShaped, /long merman tail/)
assert.match(merShaped, /no human legs/)

// Equivalent prose/custom scene requests select the same narrative profile;
// target framing adds no portrait bias.
for (const target of ['prose.illustration', 'custom.artifact-media']) {
  const job = { target, originalSceneBrief: dryScene, caption: '', alt: '', cast: 'char+user' }
  const classification = backend.classifyImageRequest(job)
  assert.equal(backend.autoPromptProfileId(job, classification), 'cinematic-scene')
  assert(!/portrait|beauty|glamour/i.test(backend.targetFramingInstruction(target, classification)))
}

const fact = (id: string, name: string, layer: string, category: string, value: string) => ({
  factId: `${id}-${value}`, layer, canonicalCharacterId: id, canonicalCharacterName: name, aliases: [], category, value,
  sourceType: 'appearance-sidecar', sourceReference: { type: 'message', messageId: 'live-regression' }, confidence: 1,
  status: 'active', createdAt: 1, updatedAt: 1, pinned: false, userConfirmed: false, referenceAssetIds: [], active: true,
})
const facts = [
  fact('taejun', 'Taejun', 'visual-identity', 'hair-color', 'dark_hair'),
  fact('taejun', 'Taejun', 'visual-identity', 'permanent-trait', 'scarred_chest'),
  fact('arin', 'Arin', 'visual-identity', 'hair-color', 'blonde_hair'),
  fact('arin', 'Arin', 'wardrobe', 'clothing', 'white_dress'),
]

// Continuity fragments remain owner-scoped even when both names already occur
// in the prompt. The last subject block can no longer steal Taejun's facts.
const twoSubjectPrompt = mergeAppearancePromptFacts(
  'wide underwater scene; subject Taejun: long merman tail; subject Arin: blue eyes',
  facts,
  'Taejun and Arin face each other underwater.',
)
assert(twoSubjectPrompt.includes('continuity for Taejun: dark_hair, scarred_chest'))
assert(twoSubjectPrompt.includes('continuity for Arin: blonde_hair, white_dress'))
assert(!/subject Arin:[^;]*,\s*dark_hair/i.test(twoSubjectPrompt))

// Mixed native + Sidecar identity assembly retains the same ownership rule in
// both parser-success and fallback-shaped inputs.
for (const routeBase of [
  'parser scene; subject Taejun: long merman tail; subject Arin: blue eyes',
  'authoritative fallback scene; subject Taejun: long merman tail; subject Arin: blue eyes',
]) {
  const prompt = mergeAppearancePromptFacts(routeBase, facts, 'Taejun and Arin face each other underwater.')
  assert.equal((prompt.match(/continuity for Taejun:/g) || []).length, 1)
  assert.equal((prompt.match(/continuity for Arin:/g) || []).length, 1)
}

// Authored form/attire overrides stale Sidecar state; duplicate facts are not
// re-appended. Explicit current mer-form remains legal in the inverse scene.
const mutableFacts = [
  fact('taejun', 'Taejun', 'current-appearance', 'body-form', 'long_merman_tail'),
  fact('taejun', 'Taejun', 'current-appearance', 'body-form', 'no_human_legs'),
  fact('taejun', 'Taejun', 'wardrobe', 'clothing', 'ivory_robe'),
  fact('taejun', 'Taejun', 'visual-identity', 'hair-color', 'dark_hair'),
]
const dryContinuity = mergeAppearancePromptFacts(`${dryScene}, dark hair`, mutableFacts, dryScene)
assert(!/long_merman_tail|no_human_legs|ivory_robe/.test(dryContinuity))
assert.equal((dryContinuity.match(/dark_hair/g) || []).length, 0)
const merContinuity = mergeAppearancePromptFacts(merScene, mutableFacts, merScene)
assert(!merContinuity.includes('continuity for Taejun: long_merman_tail'), 'scene-explicit tail must not be duplicated')

// Completed-state compaction must retain the provider/model/mode fields used by
// the status-card renderer.
const completed = {
  key: 'chat:message:0:req:slot', chatId: 'chat', messageId: 'message', swipeId: 0, requestId: 'req', slot: 'slot', target: 'prose.illustration', targetApp: 'prose', status: 'completed',
  originalSceneBrief: dryScene, originalNegativePrompt: '', originalRequestXml: '<image_request/>', alt: 'Scene', count: 1, createdAt: 1, updatedAt: 2, completedAt: 2,
  imageId: 'image', imageUrl: '/image.png', imageProvider: 'swarmui', imageModel: 'Anima/model.safetensors', highResMode: false, history: [],
}
assert.deepEqual(Object.fromEntries(Object.entries(compactCompletedRecord(completed)).filter(([key]) => ['imageProvider', 'imageModel', 'highResMode'].includes(key))), {
  imageProvider: 'swarmui', imageModel: 'Anima/model.safetensors', highResMode: false,
})
const stripped = stripCompletedRecord(completed)
assert.equal(stripped.imageProvider, 'swarmui')
assert.equal(stripped.imageModel, 'Anima/model.safetensors')
assert.equal(stripped.highResMode, false)

console.log('Prompt composition regression smoke passed: semantic invariants, profile isolation, scene-led mutable-form handling, target parity, owner-scoped continuity, and completed metadata are enforced.')
