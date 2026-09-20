// @ts-nocheck -- focused ownership/projection regressions from the 0.2.8.6 live diagnostics.
import { strict as assert } from 'node:assert'

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

// Semantic equivalents and a parser-added readable subject name are legal.
// New contact or a changed explicit cast count remain fail-closed.
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
assert(backend.modelPlacedSemanticViolations('Two people stand together.', 'Three people stand together.', [], undefined, 2).includes('cast membership'))
assert(backend.modelPlacedSemanticViolations('Wide shot of Arin standing by a window.', 'Close-up of Arin standing by a window.', ['Arin']).includes('wide shot'))

// Identity projection retains durable morphology/wardrobe and strips pose,
// environment, rendering, atmosphere, and quality material seen in Taejun's
// contaminated live identity projection.
const projected = sanitizeC5AIdentityPrompt([
  'Taejun', 'dark_hair', 'amber_eyes', 'long merman tail', 'crown', 'golden armlets', 'topless_male',
  'powerful tail curve', 'flowing hair', 'bubbles', 'glowing particles', 'warm volcanic rock',
  'highly detailed water', 'beautiful detailed eyes', 'intricate scales', 'ethereal glow', 'high detail',
].join(', '))
for (const durable of ['Taejun', 'dark_hair', 'amber_eyes', 'long merman tail', 'crown', 'golden armlets', 'topless_male']) {
  assert(projected.prompt.includes(durable), `durable identity fragment was removed: ${durable}`)
}
for (const contaminant of ['powerful tail curve', 'flowing hair', 'bubbles', 'glowing particles', 'warm volcanic rock', 'highly detailed water', 'beautiful detailed eyes', 'intricate scales', 'ethereal glow', 'high detail']) {
  assert(!projected.prompt.includes(contaminant), `scene/style fragment survived identity projection: ${contaminant}`)
  assert(projected.removed.includes(contaminant))
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

console.log('Prompt composition regression smoke passed: Native profile isolation, semantic-equivalent parser acceptance, durable identity projection, and owner-scoped multi-subject continuity are enforced.')
