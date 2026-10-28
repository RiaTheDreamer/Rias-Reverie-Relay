// @ts-nocheck -- edit -> automatic re-observation -> reload, without live models.
import assert from 'node:assert/strict'
import { addAppearanceFact, addAppearanceFacts, appearanceMemoryView, emptyContinuityVault, normalizeContinuityVault, registerCanonicalCharacter, saveManualAppearanceMemory } from '../src/vault'
import { buildAppearanceSidecarPayload, ingestAppearanceSidecarObservations } from '../src/appearanceSidecar'

const mode = process.argv[2] || 'removal'
let vault = emptyContinuityVault('removed-traits')
for (const id of ['liam', 'jaehyun', 'control']) registerCanonicalCharacter(vault, { canonicalCharacterId: id, name: id === 'liam' ? 'Liam' : id === 'jaehyun' ? 'Jaehyun' : 'Control Actor', sourceType: 'manual', userConfirmed: true })
// Use the structured observation contract so this regression tests persistence,
// not the model's ability to guess a schema or trait category.
const facts = id => ingestAppearanceSidecarObservations(vault, [{ subject: { name: vault.characters[id].canonicalCharacterName, aliases: [], role: 'npc', trustworthy: true }, confidence: .99,
  facts: [{ layer: 'visual-identity', category: 'scar', value: 'scar_on_face', provenance: 'chat-history' }, { layer: 'visual-identity', category: 'eye-color', value: 'green_eyes', provenance: 'current-assistant-message' }] }],
  { chatId: vault.chatId, messageId: 'new-observation', swipeId: 0, activeCharacter: null, activePersona: null })

if (mode === 'history') {
  const request = '<reverie-illustration request="generate" slot="old-scar"><visual_prompt>Liam with scar_on_face and obsolete-scar-request-only-trait.</visual_prompt></reverie-illustration>'
  const artifact = '<image_request id="old-photo" target="kakao.image" slot="photo"><scene_brief>Jaehyun with obsolete-artifact-request-only-trait.</scene_brief></image_request>'
  const result = buildAppearanceSidecarPayload({ currentAssistantMessage: `Liam wears a blue coat beside Jaehyun.\n${request}`,
    fullHistory: [{ id: 'past', role: 'assistant', content: `Jaehyun wears a green coat.\n${artifact}\n${request}` }],
    activeCharacter: null, activePersona: null, lorebook: [], nativeImageGenBindings: [], appearanceMemory: vault })
  assert.doesNotMatch(JSON.stringify(result), /obsolete-(?:scar|artifact)-request-only-trait|visual_prompt|image_request|reverie-illustration/, 'Appearance must not relearn traits from current or historical image requests')
  assert.match(result.currentAssistantMessage, /Liam wears a blue coat/, 'current narrative clothing must survive')
  assert.match(JSON.stringify(result.recentContext), /Jaehyun wears a green coat/, 'real historical story context must survive')
  console.log('PASS Appearance input firebreak: request-only traits removed before selection, actual narrative preserved. Local payload seam.')
  process.exit(0)
}

for (const id of ['liam', 'jaehyun', 'control']) facts(id)
for (const id of ['liam', 'jaehyun']) {
  assert.match(appearanceMemoryView(vault, id).stableAppearance, /scar_on_face/)
  saveManualAppearanceMemory(vault, { characterId: id, stableAppearance: 'green_eyes', currentOutfit: '' })
  assert.doesNotMatch(appearanceMemoryView(vault, id).stableAppearance, /scar/, 'Save must immediately remove the trait')
}
for (let turn = 0; turn < 3; turn++) {
  // Includes a late response which was already in flight before the edit.
  for (const id of ['liam', 'jaehyun', 'control']) facts(id)
  vault = normalizeContinuityVault(structuredClone(vault))
  for (const id of ['liam', 'jaehyun']) assert.doesNotMatch(appearanceMemoryView(vault, id).stableAppearance, /scar/, 'a removed facial scar must stay removed after the next response and reload')
  assert.match(appearanceMemoryView(vault, 'control').stableAppearance, /scar_on_face/, 'removing one owner trait must not erase it for another actor')
}
addAppearanceFacts(vault, { characterId: 'liam', layer: 'visual-identity', category: 'hair-color', value: 'black_hair', sourceType: 'appearance-sidecar', semanticAuthority: 'appearance-sidecar' })
assert.match(appearanceMemoryView(vault, 'liam').stableAppearance, /black_hair/, 'manual removal must not freeze unrelated stable appearance learning')
const excluded = addAppearanceFact(vault, { characterId: 'liam', layer: 'visual-identity', category: 'scar', value: 'scar_on_face', sourceType: 'character-card' })
assert.equal(excluded?.status, 'rejected', 'the single-fact API must return the retained rejection rather than undefined or reactivate it')
saveManualAppearanceMemory(vault, { characterId: 'liam', stableAppearance: 'green_eyes, scar_on_face', currentOutfit: '' })
vault = normalizeContinuityVault(structuredClone(vault))
assert.match(appearanceMemoryView(vault, 'liam').stableAppearance, /scar_on_face/, 'an explicit user re-add must remain possible')
assert.doesNotMatch(appearanceMemoryView(vault, 'jaehyun').stableAppearance, /scar/, 'restoring another actor must not clear this rejection')
console.log('PASS manual Appearance removal: two owners, repeated/late Sidecar observations, reload, unrelated learning and explicit restoration. Local canonical persistence.')
