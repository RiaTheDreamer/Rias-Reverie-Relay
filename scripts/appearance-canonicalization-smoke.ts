// @ts-nocheck -- local, mocked Appearance Memory canonicalization regression gate.
import {
  addAppearanceFact,
  addAppearanceFacts,
  appearanceMemoryView,
  formatSelectedAppearanceFacts,
  emptyContinuityVault,
  normalizeContinuityVault,
  isValidCanonicalCharacterName,
  registerCanonicalCharacter,
  replaceAppearanceMemoryFieldFromSidecar,
  saveManualAppearanceMemory,
  selectContinuityForSubjects,
} from '../src/vault'
import { ingestAppearanceSidecarObservations, normalizeAppearanceFieldRefreshOutput, normalizeAppearanceSidecarOutput } from '../src/appearanceSidecar'

const assert = (value: unknown, message: string): asserts value => { if (!value) throw new Error(message) }
const values = (text: string) => text.split(',').map(item => item.trim()).filter(Boolean)
const has = (text: string, tag: string) => values(text).includes(tag)
const lacksProse = (text: string) => {
  assert(!/\b(?:sharp|jet-black|raven-black|manhwa lashes|beneath|outer corner|looked bronze|practice jersey)\b/i.test(text), `prose leaked into canonical tags: ${text}`)
}
const sidecar = (observations: any[]) => normalizeAppearanceSidecarOutput(JSON.stringify({ observations }))
assert(normalizeAppearanceFieldRefreshOutput(JSON.stringify({ fieldResult: { subject: 'Vela', field: 'negative-identity-tags', status: 'known', tags: ['blonde hair'] } }), 'negative-identity-tags').tags[0] === 'blonde hair', 'manual field refresh schema must accept a valid scoped result')

// Manual editor fields are authoritative replacements across sheet switching.
const switchVault = emptyContinuityVault('appearance-switch-sheets')
const switchA = registerCanonicalCharacter(switchVault, { name: 'Switch A', sourceType: 'manual', userConfirmed: true })
const switchB = registerCanonicalCharacter(switchVault, { name: 'Switch B', sourceType: 'manual', userConfirmed: true })
ingestAppearanceSidecarObservations(switchVault, sidecar([{
  subject: { name: 'Switch A', aliases: [], role: 'npc', trustworthy: true }, confidence: .95,
  facts: [
    { layer: 'visual-identity', category: 'eye-color', value: 'brown eyes', provenance: 'chat-history' },
    { layer: 'visual-identity', category: 'hair-length', value: 'long hair', provenance: 'chat-history' },
    { layer: 'visual-identity', category: 'body-build', value: 'slim build', provenance: 'chat-history' },
    { layer: 'wardrobe', category: 'current-outfit', value: 'old coat', provenance: 'current-assistant-message' },
  ],
}]), { chatId: switchVault.chatId, messageId: 'old-sidecar', swipeId: 0, activeCharacter: null, activePersona: null })
saveManualAppearanceMemory(switchVault, {
  characterId: switchA.canonicalCharacterId,
  stableAppearance: 'black hair, green eyes, athletic build',
  currentOutfit: 'new jacket',
  negativeIdentityTags: 'brown eyes, slim build',
  referenceAssetIds: ['kept-reference'],
})
void switchVault.characterSheets[switchB.canonicalCharacterId]
const switchedBack = switchVault.characterSheets[switchA.canonicalCharacterId]
assert(switchedBack.booruTags === 'black_hair, green_eyes, athletic_build', `switching sheets resurrected stale stable facts: ${switchedBack.booruTags}`)
assert(!/(brown_eyes|long_hair|slim_build)/.test(switchedBack.booruTags), 'old Sidecar stable facts remained active after manual replacement')
assert(switchedBack.currentOutfitTags === 'new_jacket', 'manual Current Outfit did not survive sheet switch')
assert(switchedBack.negativeIdentityTags === 'brown_eyes, slim_build', 'negative identity tags did not survive sheet switch')
assert(JSON.stringify(switchedBack.referenceAssetIds) === JSON.stringify(['kept-reference']), 'removed reference IDs were unioned back into the editor')

// Host persona names/aliases and Sidecar observations share the existing sheet.
const personaVault = emptyContinuityVault('persona-alias-migration')
const namedPersona = registerCanonicalCharacter(personaVault, { name: 'Vela', aliases: ['Vela North'], sourceType: 'manual', userConfirmed: true })
saveManualAppearanceMemory(personaVault, { characterId: namedPersona.canonicalCharacterId, stableAppearance: 'black_hair', currentOutfit: 'blue_shirt', negativeIdentityTags: 'red_eyes', referenceAssetIds: ['saved-reference'] })
for (let index = 0; index < 3; index++) ingestAppearanceSidecarObservations(personaVault, sidecar([{
  subject: { name: 'Vela', aliases: ['Vela North'], role: 'persona', trustworthy: true }, confidence: 0.95,
  facts: [{ layer: 'visual-identity', category: 'eye-color', value: 'brown_eyes', provenance: 'persona-card' }],
}]), { chatId: personaVault.chatId, messageId: `persona-${index}`, swipeId: 0, activeCharacter: null, activePersona: { id: 'host-persona-vela', name: 'Vela North', aliases: ['Vela'] } })
assert(Object.keys(personaVault.characters).length === 1, 'persona name and named Sidecar identity must share one canonical character')
assert(personaVault.characters[namedPersona.canonicalCharacterId].lumiversePersonaId === 'host-persona-vela', 'existing named memory must retain the stable host persona binding')
const renamed = registerCanonicalCharacter(personaVault, { name: 'Vela Renamed', lumiversePersonaId: 'host-persona-vela', sourceType: 'persona-card' })
assert(renamed.canonicalCharacterId === namedPersona.canonicalCharacterId, 'a host persona rename must not create another memory')
assert(personaVault.characterSheets[namedPersona.canonicalCharacterId].referenceAssetIds.includes('saved-reference') && personaVault.characterSheets[namedPersona.canonicalCharacterId].negativeIdentityTags === 'red_eyes', 'persona reconciliation must preserve manual references/negatives')
const pollutedPersonaVault = structuredClone(personaVault)
pollutedPersonaVault.characters.ghost = { ...namedPersona, canonicalCharacterId: 'ghost', canonicalCharacterName: 'active persona', aliases: [], sourceType: 'native-visual-preset' }
pollutedPersonaVault.visualIdentity['ghost-fact'] = { ...Object.values(personaVault.visualIdentity)[0], canonicalCharacterId: 'ghost', factId: 'ghost-fact', value: 'green_eyes' }
const cleanedPersonaVault = normalizeContinuityVault(pollutedPersonaVault)
assert(!cleanedPersonaVault.characters.ghost && Object.keys(cleanedPersonaVault.characters).length === 1, 'existing placeholder card must leave the active Vault')
assert(cleanedPersonaVault.history.some(row => row.action === 'unresolved-role-archived' && row.details?.facts?.some(fact => fact.value === 'green_eyes')), 'unbound legacy facts must be archived instead of guessed onto the current persona')
assert(!Object.values(cleanedPersonaVault.visualIdentity).some(fact => fact.value === 'green_eyes'), 'unbound role facts must not contaminate the current persona')
assert(normalizeContinuityVault(cleanedPersonaVault).history.filter(row => row.action === 'unresolved-role-archived').length === 1, 'placeholder migration must be idempotent')
for (const label of ['active persona', 'active character', 'current user']) assert(!isValidCanonicalCharacterName(label), 'role placeholders must never become new identities')
const otherPersona = registerCanonicalCharacter(personaVault, { name: 'Vela', canonicalCharacterId: 'different-host-persona', lumiversePersonaId: 'different-host-persona', sourceType: 'persona-card' })
assert(otherPersona.canonicalCharacterId !== namedPersona.canonicalCharacterId, 'different explicit host persona IDs must not merge because display names match')

// A/B/C/D. Stable appearance is a canonical set: repeated, synonymous, and
// compound prose observations collapse to atomic tags.
const stableVault = emptyContinuityVault('appearance-canonical-stable')
stableVault.strength = 'strong'
const stableSubject = registerCanonicalCharacter(stableVault, { name: 'Alpha Entity', sourceType: 'manual', userConfirmed: true })
addAppearanceFact(stableVault, { layer: 'visual-identity', characterId: stableSubject.canonicalCharacterId, category: 'hair-color', value: 'black_hair', sourceType: 'manual', userConfirmed: true })
addAppearanceFact(stableVault, { layer: 'visual-identity', characterId: stableSubject.canonicalCharacterId, category: 'other', value: 'winged_eyeliner', sourceType: 'manual', userConfirmed: true })
for (let index = 0; index < 10; index += 1) {
  addAppearanceFact(stableVault, { layer: 'visual-identity', characterId: stableSubject.canonicalCharacterId, category: 'other', value: 'sharp, jet-black winged eyeliner and manhwa lashes', sourceType: 'manual', userConfirmed: true })
}
for (const value of ['raven-black hair', 'jet-black hair', 'black hair']) {
  addAppearanceFact(stableVault, { layer: 'visual-identity', characterId: stableSubject.canonicalCharacterId, category: 'hair-color', value, sourceType: 'manual', userConfirmed: true })
}
addAppearanceFact(stableVault, { layer: 'visual-identity', characterId: stableSubject.canonicalCharacterId, category: 'mole', value: 'tiny beauty mark beneath the outer corner of the right eye', sourceType: 'manual', userConfirmed: true })
let stableView = appearanceMemoryView(stableVault, stableSubject.canonicalCharacterId)
for (const tag of ['black_hair', 'winged_eyeliner', 'long_eyelashes', 'beauty_mark_under_eye']) assert(has(stableView.stableAppearance, tag), `missing canonical stable tag: ${tag}`)
assert(values(stableView.stableAppearance).filter(tag => tag === 'black_hair').length === 1, 'semantic black hair duplicates must collapse')
assert(values(stableView.stableAppearance).filter(tag => tag === 'winged_eyeliner').length === 1, 'repeated eyeliner updates must remain idempotent')
lacksProse(stableView.stableAppearance)

// E/F. Named NPCs receive stable appearance only when evidence exists; outfit
// facts alone must not hallucinate identity.
const npcVault = emptyContinuityVault('appearance-canonical-npc')
npcVault.strength = 'strong'
let result = ingestAppearanceSidecarObservations(npcVault, sidecar([{
    subject: { name: 'Stable Alpha', aliases: [], role: 'npc', trustworthy: true }, confidence: .95,
  facts: [
    { layer: 'visual-identity', category: 'hair-color', value: 'black hair', provenance: 'chat-history' },
    { layer: 'visual-identity', category: 'eye-color', value: 'brown eyes', provenance: 'chat-history' },
    { layer: 'visual-identity', category: 'body-build', value: 'athletic build', provenance: 'chat-history' },
    { layer: 'wardrobe', category: 'current-outfit', value: 'practice jersey', provenance: 'current-assistant-message' },
  ],
}]), { chatId: 'appearance-canonical-npc', messageId: 'npc-1', swipeId: 0, activeCharacter: null, activePersona: null })
assert(result.acceptedFacts === 4, 'NPC with stable evidence should persist stable and outfit facts')
const npcStable = Object.values(npcVault.characters).find(row => row.canonicalCharacterName === 'Stable Alpha')!
let npcStableView = appearanceMemoryView(npcVault, npcStable.canonicalCharacterId)
for (const tag of ['black_hair', 'brown_eyes', 'athletic_build']) assert(has(npcStableView.stableAppearance, tag), `NPC stable evidence missing: ${tag}`)
assert(npcStableView.currentOutfit === 'practice_jersey', 'NPC outfit should canonicalize separately')

result = ingestAppearanceSidecarObservations(npcVault, sidecar([{
  subject: { name: 'Outfit Beta', aliases: [], role: 'npc', trustworthy: true }, confidence: .95,
  facts: [{ layer: 'wardrobe', category: 'current-outfit', value: 'practice jersey', provenance: 'current-assistant-message' }],
}]), { chatId: 'appearance-canonical-npc', messageId: 'npc-2', swipeId: 0, activeCharacter: null, activePersona: null })
assert(result.acceptedFacts === 1, 'NPC outfit-only evidence should still save outfit')
const npcOutfit = Object.values(npcVault.characters).find(row => row.canonicalCharacterName === 'Outfit Beta')!
const npcOutfitView = appearanceMemoryView(npcVault, npcOutfit.canonicalCharacterId)
assert(npcOutfitView.stableAppearance === '' && npcOutfitView.currentOutfit === 'practice_jersey', 'outfit-only NPC must not receive hallucinated stable appearance')

// G/H. Current outfit can change as a tag set; transient lighting language does
// not overwrite durable identity.
ingestAppearanceSidecarObservations(npcVault, sidecar([{
  subject: { name: 'Stable Alpha', aliases: [], role: 'npc', trustworthy: true }, confidence: .95,
  facts: [{ layer: 'wardrobe', category: 'current-outfit', value: 'black hoodie, jeans', provenance: 'current-assistant-message' }],
}]), { chatId: 'appearance-canonical-npc', messageId: 'npc-3', swipeId: 0, activeCharacter: null, activePersona: null })
npcStableView = appearanceMemoryView(npcVault, npcStable.canonicalCharacterId)
assert(npcStableView.currentOutfit === 'black_hoodie, jeans', 'new outfit should replace prior outfit with a canonical tag set')
try {
  addAppearanceFact(npcVault, { layer: 'visual-identity', characterId: npcStable.canonicalCharacterId, category: 'hair-color', value: 'hair looked bronze under the sunset lights', sourceType: 'manual', userConfirmed: true })
} catch {}
npcStableView = appearanceMemoryView(npcVault, npcStable.canonicalCharacterId)
assert(has(npcStableView.stableAppearance, 'black_hair') && !has(npcStableView.stableAppearance, 'bronze_hair'), 'lighting descriptions must not overwrite stable hair identity')

// Current Outfit is transient state, not a fallback rendering of saved
// wardrobe. Explicit clears persist, and automatic Sidecar evidence cannot
// override an explicit user-owned base field.
const outfitVault = emptyContinuityVault('appearance-outfit-lifecycle')
const outfitSubject = registerCanonicalCharacter(outfitVault, { name: 'Outfit Alpha', sourceType: 'manual', userConfirmed: true })
addAppearanceFact(outfitVault, { layer: 'wardrobe', characterId: outfitSubject.canonicalCharacterId, category: 'saved-outfit', value: 'formal black shirt', sourceType: 'manual', userConfirmed: true })
saveManualAppearanceMemory(outfitVault, { characterId: outfitSubject.canonicalCharacterId, stableAppearance: '', currentOutfit: 'grey hoodie, jeans' })
assert(appearanceMemoryView(outfitVault, outfitSubject.canonicalCharacterId).currentOutfit === 'grey_hoodie, jeans', 'manual Current Outfit must save independently from saved wardrobe')
saveManualAppearanceMemory(outfitVault, { characterId: outfitSubject.canonicalCharacterId, stableAppearance: '', currentOutfit: '' })
assert(appearanceMemoryView(outfitVault, outfitSubject.canonicalCharacterId).currentOutfit === '', 'manually clearing Current Outfit must persist as empty')
assert(Object.values(outfitVault.wardrobe).some(fact => fact.category === 'saved-outfit' && fact.status === 'active'), 'clearing Current Outfit must preserve saved wardrobe')
saveManualAppearanceMemory(outfitVault, { characterId: outfitSubject.canonicalCharacterId, stableAppearance: '', currentOutfit: 'training uniform' })
ingestAppearanceSidecarObservations(outfitVault, sidecar([{
  subject: { name: 'Outfit Alpha', aliases: [], role: 'character', trustworthy: true }, confidence: .98,
  facts: [{ layer: 'wardrobe', category: 'current-outfit', value: 'white sleep shirt, black shorts', provenance: 'current-assistant-message' }],
}]), { chatId: outfitVault.chatId, messageId: 'outfit-change-1', swipeId: 0, activeCharacter: { id: outfitSubject.canonicalCharacterId, name: 'Outfit Alpha', aliases: [] }, activePersona: null })
assert(appearanceMemoryView(outfitVault, outfitSubject.canonicalCharacterId).currentOutfit === 'training_uniform', 'automatic Sidecar evidence must not replace explicit manual Current Outfit authority')
assert(Object.values(outfitVault.wardrobe).some(fact => fact.category === 'saved-outfit' && fact.status === 'active'), 'Sidecar Current Outfit updates must not delete saved wardrobe')
const knownOutfitBeforeUnknownRefresh = appearanceMemoryView(outfitVault, outfitSubject.canonicalCharacterId).currentOutfit
replaceAppearanceMemoryFieldFromSidecar(outfitVault, { characterId: outfitSubject.canonicalCharacterId, field: 'current-outfit', status: 'unknown', tags: [] })
assert(appearanceMemoryView(outfitVault, outfitSubject.canonicalCharacterId).currentOutfit === knownOutfitBeforeUnknownRefresh, 'an unknown manual Sidecar result must preserve the existing field instead of erasing it')

// I. Character, persona, and named NPC paths use the same storage semantics.
const parityVault = emptyContinuityVault('appearance-canonical-parity')
const activeCharacter = { id: 'active-character', name: 'Prime Alpha', aliases: [] }
const activePersona = { id: 'active-persona', name: 'Prime Beta', aliases: [] }
ingestAppearanceSidecarObservations(parityVault, sidecar([
  { subject: { name: 'Prime Alpha', aliases: [], role: 'character', trustworthy: true }, confidence: .95, facts: [{ layer: 'visual-identity', category: 'hair-color', value: 'raven-black hair', provenance: 'chat-history' }] },
  { subject: { name: 'Prime Beta', aliases: [], role: 'persona', trustworthy: true }, confidence: .95, facts: [{ layer: 'visual-identity', category: 'hair-color', value: 'raven-black hair', provenance: 'chat-history' }] },
  { subject: { name: 'Parity Gamma', aliases: [], role: 'npc', trustworthy: true }, confidence: .95, facts: [{ layer: 'visual-identity', category: 'hair-color', value: 'raven-black hair', provenance: 'chat-history' }] },
]), { chatId: 'appearance-canonical-parity', messageId: 'parity-1', swipeId: 0, activeCharacter, activePersona })
for (const name of ['Prime Alpha', 'Prime Beta', 'Parity Gamma']) {
  const character = Object.values(parityVault.characters).find(row => row.canonicalCharacterName === name)!
  assert(appearanceMemoryView(parityVault, character.canonicalCharacterId).stableAppearance === 'black_hair', `${name} did not canonicalize through the shared writer`)
}

// Migration/lazy cleanup: existing duplicate/prose records are rewritten as
// canonical tag facts when the vault is normalized.
const migrated = normalizeContinuityVault({
  chatId: 'appearance-migration',
  characters: {
    subject: { canonicalCharacterId: 'subject', canonicalCharacterName: 'Migrated Alpha', aliases: [], sourceType: 'manual', userConfirmed: true, createdAt: 1, updatedAt: 1 },
  },
  visualIdentity: {
    one: { factId: 'one', layer: 'visual-identity', canonicalCharacterId: 'subject', category: 'other', value: 'sharp, jet-black winged eyeliner and manhwa lashes', sourceType: 'manual', confidence: 1, status: 'active', createdAt: 1, updatedAt: 1, pinned: true, userConfirmed: true, referenceAssetIds: [] },
    two: { factId: 'two', layer: 'visual-identity', canonicalCharacterId: 'subject', category: 'other', value: 'sharp, jet-black winged eyeliner and manhwa lashes', sourceType: 'manual', confidence: 1, status: 'active', createdAt: 2, updatedAt: 2, pinned: true, userConfirmed: true, referenceAssetIds: [] },
  },
}, 'appearance-migration')
const migratedView = appearanceMemoryView(migrated, 'subject')
assert(migratedView.stableAppearance === 'winged_eyeliner, long_eyelashes', `migration did not canonicalize duplicate prose: ${migratedView.stableAppearance}`)

saveManualAppearanceMemory(migrated, { characterId: 'subject', stableAppearance: 'hazel eyes, soft medium brown with warm golden undertones hair', currentOutfit: 'practice jersey', negativeIdentityTags: 'blue eyes, red hair' })
const manualView = appearanceMemoryView(migrated, 'subject')
assert(manualView.stableAppearance === 'hazel_eyes, soft_medium_brown_with_warm_golden_undertones_hair' && manualView.currentOutfit === 'practice_jersey', 'manual Appearance editor must normalize without rewriting user-authored tag atoms')
assert(migrated.characterSheets.subject.negativeIdentityTags === 'blue_eyes, red_hair', 'negative identity tags should serialize as canonical tags')

// Manual comma-separated traits are atomic author intent. Known vocabulary,
// custom vocabulary, and compound tags must survive Save without being
// decomposed into a shorter regenerated sheet.
saveManualAppearanceMemory(migrated, { characterId: 'subject', stableAppearance: 'messy lavender hair, glasses', currentOutfit: '', negativeIdentityTags: '' })
const atomicManual = appearanceMemoryView(migrated, 'subject')
assert(atomicManual.stableAppearance === 'messy_lavender_hair, glasses', `manual tag atoms were rewritten: ${atomicManual.stableAppearance}`)
const atomicFirstSave = atomicManual.stableAppearance
saveManualAppearanceMemory(migrated, { characterId: 'subject', stableAppearance: 'messy lavender hair, glasses', currentOutfit: '', negativeIdentityTags: '' })
assert(appearanceMemoryView(migrated, 'subject').stableAppearance === atomicFirstSave, 'repeated manual atomic save must be idempotent')

const losslessEditorTags = [
  'slender_46kg_build',
  'knee_length_hair',
  'sharp_winged_black_eyeliner_and_wispy_lashes',
  'blurred_gradient_lips',
  'long_eyelashes',
  '165_cm_tall',
  'custom_iridescent_freckle_constellation',
  'heterochromia_left_gold_right_teal',
]
saveManualAppearanceMemory(migrated, { characterId: 'subject', stableAppearance: losslessEditorTags.join(', '), currentOutfit: 'asymmetric_silk_wrap, custom_moon_clasp', negativeIdentityTags: '' })
const losslessEditorView = appearanceMemoryView(migrated, 'subject')
assert(losslessEditorView.stableAppearance === losslessEditorTags.join(', '), `Save shortened or regenerated the user-authored sheet: ${losslessEditorView.stableAppearance}`)
assert(losslessEditorView.currentOutfit === 'asymmetric_silk_wrap, custom_moon_clasp', `Save shortened or regenerated the user-authored outfit: ${losslessEditorView.currentOutfit}`)
const beforeInvalidSave = structuredClone(losslessEditorView)
try {
  saveManualAppearanceMemory(migrated, { characterId: 'subject', stableAppearance: `valid_tag, ${'x'.repeat(65)}`, currentOutfit: '', negativeIdentityTags: '' })
  assert(false, 'overlong editor atom must fail closed')
} catch {}
assert(appearanceMemoryView(migrated, 'subject').stableAppearance === beforeInvalidSave.stableAppearance, 'failed editor preflight destroyed the last known-good sheet')

// Sidecar reconciliation is character-agnostic and domain-based. Different
// spellings, word orders, unit spacing, and broad/specific variants collapse
// without collapsing independent domains such as height and shoulders.
const semanticSidecarVault = emptyContinuityVault('appearance-sidecar-semantic-families')
const semanticSubject = { id: 'semantic-subject', name: 'Semantic Gamma', aliases: [] }
ingestAppearanceSidecarObservations(semanticSidecarVault, sidecar([{
  subject: { name: semanticSubject.name, aliases: [], role: 'character', trustworthy: true }, confidence: .98,
  facts: [
    { layer: 'visual-identity', category: 'eye-color', value: 'dark_eyes', provenance: 'character-card' },
    { layer: 'visual-identity', category: 'other', value: 'sharp_dark_eyes', provenance: 'chat-history' },
    { layer: 'visual-identity', category: 'other', value: 'dark_sharp_eyes', provenance: 'chat-history' },
    { layer: 'visual-identity', category: 'other', value: 'dark eyes tall build', provenance: 'chat-history' },
    { layer: 'visual-identity', category: 'hair-color', value: 'soft_light_brown hair', provenance: 'character-card' },
    { layer: 'visual-identity', category: 'hair-color', value: 'brown_hair', provenance: 'chat-history' },
    { layer: 'visual-identity', category: 'body-build', value: 'petite_build', provenance: 'character-card' },
    { layer: 'visual-identity', category: 'body-build', value: 'slender_46kg_build', provenance: 'chat-history' },
    { layer: 'visual-identity', category: 'body-build', value: 'slender_46_kg_frame build', provenance: 'chat-history' },
    { layer: 'visual-identity', category: 'height', value: 'tall', provenance: 'character-card' },
    { layer: 'visual-identity', category: 'height', value: '189_cm tall', provenance: 'chat-history' },
    { layer: 'visual-identity', category: 'body-build', value: 'broad_shoulders build', provenance: 'character-card' },
  ],
}, {
  subject: { name: semanticSubject.name, aliases: [], role: 'character', trustworthy: true }, confidence: .98,
  facts: [
    { layer: 'visual-identity', category: 'hair-length', value: 'knee_length_hair', provenance: 'character-card' },
    { layer: 'visual-identity', category: 'hair-length', value: 'knee length hair', provenance: 'chat-history' },
    { layer: 'visual-identity', category: 'other', value: 'blurred_gradient_lips', provenance: 'character-card' },
    { layer: 'visual-identity', category: 'other', value: 'soft_gradient_lips', provenance: 'chat-history' },
    { layer: 'visual-identity', category: 'other', value: 'sharp_winged_black_eyeliner_and_wispy_lashes', provenance: 'character-card' },
    { layer: 'visual-identity', category: 'other', value: 'winged_eyeliner', provenance: 'chat-history' },
    { layer: 'visual-identity', category: 'other', value: 'wispy_lashes', provenance: 'character-card' },
    { layer: 'visual-identity', category: 'other', value: 'long_eyelashes', provenance: 'chat-history' },
    { layer: 'visual-identity', category: 'other', value: 'angular_delicate_nose', provenance: 'character-card' },
    { layer: 'visual-identity', category: 'other', value: 'delicate_angular_nose', provenance: 'chat-history' },
  ],
}]), { chatId: semanticSidecarVault.chatId, messageId: 'semantic-families', swipeId: 0, activeCharacter: semanticSubject, activePersona: null })
const semanticTags = values(appearanceMemoryView(semanticSidecarVault, semanticSubject.id).stableAppearance)
for (const family of [
  ['dark_eyes', 'sharp_dark_eyes', 'dark_sharp_eyes'],
  ['brown_hair'],
  ['petite_build', 'slender_46kg_build', 'slender_46_kg_frame_build'],
  ['tall', '189_cm_tall'],
  ['knee_length_hair'],
  ['blurred_gradient_lips', 'soft_gradient_lips'],
  ['winged_eyeliner', 'sharp_winged_black_eyeliner'],
  ['wispy_lashes', 'long_eyelashes'],
  ['angular_delicate_nose', 'delicate_angular_nose'],
]) assert(semanticTags.filter(tag => family.includes(tag)).length === 1, `Sidecar semantic family was not consolidated: ${family.join(' / ')} in ${semanticTags.join(', ')}`)
assert(semanticTags.includes('broad_shoulders'), `independent shoulder structure was incorrectly merged into body build: ${semanticTags.join(', ')}`)

// Root-cause A/B/G. Same canonical stable value must not remain active merely
// because older records used different conflict-domain names.
const pollutedDomainVault = normalizeContinuityVault({
  chatId: 'appearance-domain-pollution',
  characters: {
    alpha: { canonicalCharacterId: 'alpha', canonicalCharacterName: 'Domain Alpha', aliases: [], sourceType: 'manual', userConfirmed: true, createdAt: 1, updatedAt: 1 },
  },
  visualIdentity: Object.fromEntries(['eyeliner', 'makeup:eyeliner', 'eyeline-style', 'eye-makeup', 'makeup-style'].map((domain, index) => [`dup-${index}`, {
    factId: `dup-${index}`,
    layer: 'visual-identity',
    canonicalCharacterId: 'alpha',
    category: 'other',
    value: 'winged_eyeliner',
    conflictDomain: domain,
    sourceType: 'appearance-sidecar',
    confidence: .8 + index / 100,
    status: 'active',
    createdAt: index + 1,
    updatedAt: index + 1,
    pinned: false,
    userConfirmed: false,
    referenceAssetIds: [],
  }])),
}, 'appearance-domain-pollution')
const pollutedFacts = Object.values(pollutedDomainVault.visualIdentity)
assert(pollutedFacts.filter(fact => fact.value === 'winged_eyeliner' && fact.status === 'active').length === 1, 'same stable semantic value with different domains must resolve to one active fact')
assert(values(appearanceMemoryView(pollutedDomainVault, 'alpha').stableAppearance).filter(tag => tag === 'winged_eyeliner').length === 1, 'polluted display must show winged_eyeliner once')
for (let index = 0; index < 20; index += 1) {
  addAppearanceFact(pollutedDomainVault, { layer: 'visual-identity', characterId: 'alpha', category: 'other', value: 'sharp winged eyeliner', conflictDomain: index % 2 ? 'eye-makeup' : 'makeup-style', sourceType: 'appearance-sidecar', semanticAuthority: 'appearance-sidecar', confidence: .9 })
}
assert(Object.values(pollutedDomainVault.visualIdentity).filter(fact => fact.value === 'winged_eyeliner' && fact.status === 'active').length === 1, 'same trait across many messages must remain one active stable fact')

// Root-cause C/D. Transient appearance state supersedes by current visual
// domain, while action/staging history is not persistent Appearance Memory.
const currentVault = emptyContinuityVault('appearance-current-state')
const currentSubject = registerCanonicalCharacter(currentVault, { name: 'Current Alpha', sourceType: 'manual', userConfirmed: true })
for (const [index, value] of ['wet_hair', 'hair_drying', 'dry_hair'].entries()) {
  addAppearanceFact(currentVault, { layer: 'current-appearance', characterId: currentSubject.canonicalCharacterId, category: 'temporary-hair', value, sourceType: 'appearance-sidecar', semanticAuthority: 'appearance-sidecar', active: true, expiryPolicy: 'superseded' }, 100 + index)
}
const currentState = appearanceMemoryView(currentVault, currentSubject.canonicalCharacterId).currentState
assert(currentState === 'dry_hair', `current hair state should resolve to dry_hair only, got: ${currentState}`)
for (const action of ['standing_by_the_door_holding_folder', 'sitting_on_floor_with_tea', 'running_off_stage']) {
  try {
    addAppearanceFact(currentVault, { layer: 'current-appearance', characterId: currentSubject.canonicalCharacterId, category: 'temporary-expression', value: action, sourceType: 'appearance-sidecar', semanticAuthority: 'appearance-sidecar', active: true, expiryPolicy: 'superseded' })
  } catch {}
}
assert(!/standing|sitting|running|folder|tea|stage/.test(appearanceMemoryView(currentVault, currentSubject.canonicalCharacterId).currentState), 'scene action history must not persist as Appearance Memory')

const replacementVault = emptyContinuityVault('appearance-sidecar-replacement')
const replacementSubject = registerCanonicalCharacter(replacementVault, { name: 'Replacement Alpha', sourceType: 'manual', userConfirmed: true })
addAppearanceFact(replacementVault, { layer: 'visual-identity', characterId: replacementSubject.canonicalCharacterId, category: 'hair-length', value: 'extremely long knee length hair', sourceType: 'appearance-sidecar', semanticAuthority: 'appearance-sidecar', confidence: .9 }, 500)
addAppearanceFact(replacementVault, { layer: 'visual-identity', characterId: replacementSubject.canonicalCharacterId, category: 'hair-length', value: 'short hair', sourceType: 'appearance-sidecar', semanticAuthority: 'appearance-sidecar', confidence: .9 }, 501)
const replacementFacts = Object.values(replacementVault.visualIdentity).filter(fact => fact.canonicalCharacterId === replacementSubject.canonicalCharacterId)
assert(replacementFacts.some(fact => fact.value === 'short_hair' && fact.status === 'active'), 'new equal-authority Sidecar value must replace an older more-specific value in the same semantic domain')
assert(replacementFacts.some(fact => fact.value !== 'short_hair' && fact.status === 'superseded'), 'the replaced Sidecar value must remain historical rather than active')

// Selection/serialization must expose the resolved present state once.
addAppearanceFact(currentVault, { layer: 'visual-identity', characterId: currentSubject.canonicalCharacterId, category: 'hair-color', value: 'black hair', sourceType: 'manual', userConfirmed: true })
addAppearanceFact(currentVault, { layer: 'visual-identity', characterId: currentSubject.canonicalCharacterId, category: 'hair-length', value: 'knee-length black hair', sourceType: 'manual', userConfirmed: true })
addAppearanceFact(currentVault, { layer: 'visual-identity', characterId: currentSubject.canonicalCharacterId, category: 'other', value: 'manhwa lashes', sourceType: 'manual', userConfirmed: true })
const selected = selectContinuityForSubjects(currentVault, { subjectNames: ['Current Alpha'], chatId: currentVault.chatId, sceneBrief: 'Current Alpha waits for a portrait.', strength: 'strong' })
const serialized = formatSelectedAppearanceFacts(selected.included)
for (const tag of ['black_hair', 'knee_length_hair', 'long_eyelashes', 'dry_hair']) {
  assert((serialized.match(new RegExp(tag, 'g')) || []).length === 1, `serialized continuity duplicated or dropped ${tag}: ${serialized}`)
}
assert(!/wet_hair|hair_drying|standing|sitting|running/.test(serialized), `serialized continuity leaked stale/action state: ${serialized}`)

// Backend prompt assembly: unresolved native persona fallback may use Sidecar,
// but the same Appearance Memory must not be appended a second time.
const backendState = new Map()
const backendRequests: any[] = []
const backendEvents: any[] = []
let backendFrontendHandler: ((payload: any, userId?: string) => void) | undefined
let fieldRefreshMode: 'known' | 'unknown' | 'error' = 'known'
const backendMessages = [{ id: 'm1', role: 'assistant', content: 'Prime Beta waits in the room.', swipes: [], metadata: {} }]
;(globalThis as any).spindle = {
  registerMessageContentProcessor() {}, registerInterceptor() {}, registerMacro() {}, on() {}, onFrontendMessage(handler: any) { backendFrontendHandler = handler }, sendToFrontend(payload: any) { backendEvents.push(payload) },
  permissions: { has: () => true },
  userStorage: {
    async getJson(path: string, { fallback }: any) {
      if (backendState.has(path)) return structuredClone(backendState.get(path))
      if (path === 'config.json') return { enabled: true, parserConnectionId: 'offline', parserModel: 'offline', includeCharacterInfo: false, includePersonaInfo: true, proseIllustratorSettings: { appearanceMemoryEnabled: true, continuityStrength: 'strong' } }
      return structuredClone(fallback)
    },
    async setJson(path: string, value: any) { backendState.set(path, structuredClone(value)) },
    async mkdir() {},
  },
  chats: { async get() { return { character_id: '' } } },
  characters: { async get() { return null } },
  personas: { async getActive() { return { id: 'persona-beta', name: 'Prime Beta', description: '' } } },
  chat: { async getMessages() { return structuredClone(backendMessages) } },
  world_books: { async getActivated() { return [] }, entries: { async get() { return null } } },
  connections: { async get() { return { id: 'offline', name: 'Offline', provider: 'offline', model: 'offline' } }, async list() { return [{ id: 'offline', name: 'Offline', provider: 'offline', model: 'offline' }] } },
  generate: { async raw(request: any) {
    backendRequests.push(structuredClone(request))
    const system = String(request?.messages?.[0]?.content || '')
    const user = String(request?.messages?.[1]?.content || '')
    if (system.includes('Appearance Sidecar') && user.includes('"requestedField":"stable-appearance"')) {
      if (fieldRefreshMode === 'error') throw new Error('mock Sidecar failure')
      if (fieldRefreshMode === 'unknown') return { content: JSON.stringify({ fieldResult: { subject: 'Prime Beta', field: 'stable-appearance', status: 'unknown', tags: [] } }) }
      return { content: JSON.stringify({ fieldResult: { subject: 'Prime Beta', field: 'stable-appearance', status: 'known', tags: ['messy lavender hair', 'glasses', 'closed_eyes', 'direct_gaze', 'smiling', 'standing', 'close-up'] } }) }
    }
    if (system.includes('Appearance Sidecar') && user.includes('"requestedField":"current-outfit"')) return { content: JSON.stringify({ fieldResult: { subject: 'Prime Beta', field: 'current-outfit', status: 'known', tags: ['green jacket', 'black jeans'] } }) }
    if (system.includes('Appearance Sidecar') && user.includes('"requestedField":"negative-identity-tags"')) return { content: JSON.stringify({ fieldResult: { subject: 'Prime Beta', field: 'negative-identity-tags', status: 'known', tags: ['blonde hair', 'blue eyes'] } }) }
    if (system.includes('Appearance Sidecar')) return { content: JSON.stringify({ observations: [{ subject: { name: 'Prime Beta', aliases: [], role: 'persona', trustworthy: true }, confidence: .98, facts: [{ layer: 'wardrobe', category: 'current-outfit', value: 'red dress', provenance: 'current-assistant-message' }] }] }) }
    return { content: JSON.stringify({ prompt: 'Prime Beta with black hair, winged eyeliner, and long eyelashes.', negativeAdditions: '' }) }
  } },
  imageGen: { async listConnections() { return [] }, async getProviders() { return [] }, async generate() { throw new Error('Image generation is forbidden in this smoke') } },
  images: { async list() { return [] } },
  log: { info() {}, warn() {}, error() {} },
  variables: { global: { async set() {} }, chat: { async set() {} } },
}
const backend = await import('../src/backend')
const frontendSource = await Bun.file(new URL('../src/frontend.ts', import.meta.url)).text()
assert(/appearanceActionStatuses\.set\(saveStatusKey,[\s\S]{0,700}ctx\.sendToBackend\(\{[\s\S]{0,200}action: 'save_character_sheet'/.test(frontendSource), 'Appearance save must paint pending state before synchronous backend dispatch')
const backendVault = emptyContinuityVault('prompt-once')
const persona = registerCanonicalCharacter(backendVault, { name: 'Prime Beta', canonicalCharacterId: 'persona-beta', sourceType: 'native-visual-preset', userConfirmed: true })
for (const domain of ['eyeliner', 'makeup:eyeliner', 'eye-makeup']) {
  addAppearanceFact(backendVault, { layer: 'visual-identity', characterId: persona.canonicalCharacterId, category: 'other', value: 'winged_eyeliner', conflictDomain: domain, sourceType: 'appearance-sidecar', semanticAuthority: 'appearance-sidecar' })
}
addAppearanceFact(backendVault, { layer: 'visual-identity', characterId: persona.canonicalCharacterId, category: 'hair-color', value: 'black hair', sourceType: 'appearance-sidecar', semanticAuthority: 'appearance-sidecar' })
addAppearanceFact(backendVault, { layer: 'visual-identity', characterId: persona.canonicalCharacterId, category: 'other', value: 'manhwa lashes', sourceType: 'appearance-sidecar', semanticAuthority: 'appearance-sidecar' })
saveManualAppearanceMemory(backendVault, { characterId: persona.canonicalCharacterId, stableAppearance: appearanceMemoryView(backendVault, persona.canonicalCharacterId).stableAppearance, currentOutfit: 'blue hoodie' })
backendState.set('states/prompt-once.json', { chatId: 'prompt-once', continuityVault: backendVault, slots: {}, logs: [] })
const config = await backend.getConfig('offline')
backendFrontendHandler!({ type: 'continuity_action', chatId: 'prompt-once', action: 'save_character_sheet', characterId: persona.canonicalCharacterId, booruTags: 'black hair, winged eyeliner, long eyelashes', currentOutfitTags: 'blue hoodie', negativeIdentityTags: 'blonde hair', referenceAssetIds: ['saved-reference'] }, 'offline')
for (let attempt = 0; attempt < 100 && !backendEvents.some(event => event.type === 'appearance_memory_action_status' && event.operation === 'save' && event.status === 'success'); attempt += 1) await new Promise(resolve => setTimeout(resolve, 1))
assert(backendEvents.some(event => event.type === 'appearance_memory_action_status' && event.operation === 'save' && event.status === 'started'), 'save lifecycle must emit started')
assert(backendEvents.some(event => event.type === 'appearance_memory_action_status' && event.operation === 'save' && event.status === 'success'), `save lifecycle must acknowledge canonical persistence: ${JSON.stringify(backendEvents.slice(-8))}`)
await backend.runAppearanceSidecar({ chatId: 'prompt-once', messageId: 'ordinary-turn', swipeId: 0, content: 'Prime Beta changes into a red dress.', userId: 'offline', reason: 'generation-ended' })
const independentOutfitState = backendState.get('states/prompt-once.json') as any
assert(appearanceMemoryView(independentOutfitState.continuityVault, persona.canonicalCharacterId).currentOutfit === 'blue_hoodie', 'automatic Appearance Sidecar must not clobber manual Current Outfit authority')
await backend.runAppearanceSidecar({ chatId: 'prompt-once', messageId: 'manual-stable', swipeId: 0, content: '', userId: 'offline', mode: 'reconcile', reason: 'manual-stable-appearance-refresh', focusCharacter: { id: persona.canonicalCharacterId, name: 'Prime Beta' }, refreshField: 'stable-appearance' })
let refreshedState = backendState.get('states/prompt-once.json') as any
assert(['messy_hair', 'lavender_hair', 'glasses'].every(tag => has(appearanceMemoryView(refreshedState.continuityVault, persona.canonicalCharacterId).stableAppearance, tag)), 'Stable Appearance rerun must replace only the selected field')
assert(!/(?:closed_eyes|direct_gaze|smiling|standing|close_up)/.test(appearanceMemoryView(refreshedState.continuityVault, persona.canonicalCharacterId).stableAppearance), 'Stable Appearance rerun must discard eye state, gaze, expression, pose, and camera tags')
assert(appearanceMemoryView(refreshedState.continuityVault, persona.canonicalCharacterId).currentOutfit === 'blue_hoodie', 'Stable Appearance rerun must preserve Current Outfit')
await backend.runAppearanceSidecar({ chatId: 'prompt-once', messageId: 'manual-outfit', swipeId: 0, content: '', userId: 'offline', mode: 'reconcile', reason: 'manual-current-outfit-refresh', focusCharacter: { id: persona.canonicalCharacterId, name: 'Prime Beta' }, refreshField: 'current-outfit' })
refreshedState = backendState.get('states/prompt-once.json') as any
assert(['green_jacket', 'jeans'].every(tag => has(appearanceMemoryView(refreshedState.continuityVault, persona.canonicalCharacterId).currentOutfit, tag)), 'Current Outfit rerun must replace only the selected field')
assert(['messy_hair', 'lavender_hair', 'glasses'].every(tag => has(appearanceMemoryView(refreshedState.continuityVault, persona.canonicalCharacterId).stableAppearance, tag)), 'Current Outfit rerun must preserve Stable Appearance')
await backend.runAppearanceSidecar({ chatId: 'prompt-once', messageId: 'manual-negative', swipeId: 0, content: '', userId: 'offline', mode: 'reconcile', reason: 'manual-negative-identity-tags-refresh', focusCharacter: { id: persona.canonicalCharacterId, name: 'Prime Beta' }, refreshField: 'negative-identity-tags' })
refreshedState = backendState.get('states/prompt-once.json') as any
assert(refreshedState.continuityVault.characterSheets[persona.canonicalCharacterId].negativeIdentityTags === 'blonde_hair, blue_eyes', 'Negative Identity Tags rerun must save its dedicated Sidecar result')
assert(['messy_hair', 'lavender_hair', 'glasses'].every(tag => has(appearanceMemoryView(refreshedState.continuityVault, persona.canonicalCharacterId).stableAppearance, tag)) && ['green_jacket', 'jeans'].every(tag => has(appearanceMemoryView(refreshedState.continuityVault, persona.canonicalCharacterId).currentOutfit, tag)), 'Negative Identity Tags rerun must preserve Stable Appearance and Current Outfit')
const prepared = await backend.parseSlotPrompt({ requestId: 'prompt-once-request', chatId: 'prompt-once', messageId: 'm1', swipeId: 0, target: 'custom.artifact-media', slots: ['portrait'], count: 1, originalSceneBrief: 'Prime Beta portrait.', originalRequestXml: '', alt: 'Portrait', caption: '', aspect: '3:4', cast: 'user', promptSource: 'structured', originalNegativePrompt: '', promptProfileId: 'social-candid' }, 'portrait', backendMessages as any, 0, config, 'offline', {})
const parserPrompt = JSON.stringify(backendRequests.at(-1)?.messages || [])
assert(prepared.promptPipeline.identityResolution?.fallbacks.some((row: string) => row.includes('Appearance Sidecar state used')), 'unresolved persona binding should use Sidecar fallback')
assert(!parserPrompt.includes('Relay Appearance Memory'), 'Sidecar fallback subject must not also receive duplicate Relay Appearance Memory block')
for (const tag of ['glasses', 'lavender_hair', 'messy_hair']) {
  assert((parserPrompt.match(new RegExp(tag, 'g')) || []).length === 1, `provider-bound parser prompt should contain ${tag} once through clean Sidecar fallback: ${parserPrompt}`)
}
const namedPersonaWithoutCast = await backend.parseSlotPrompt({
  requestId: 'named-persona-no-cast', chatId: 'prompt-once', messageId: 'm1', swipeId: 0,
  target: 'prose.illustration', slots: ['illustration'], count: 1,
  originalSceneBrief: 'Prime Beta waits beneath the window.', originalRequestXml: '', alt: 'Prime Beta by the window', caption: '', aspect: '3:4',
  promptSource: 'visual_prompt', originalNegativePrompt: '',
  prosePromptComposition: { perspectiveMode: 'scene-snapshot', peoplePolicy: 'required', expectedPeopleCount: 1, namedSubjects: ['Prime Beta'] },
} as any, 'illustration', backendMessages as any, 0, config, 'offline', {})
assert(namedPersonaWithoutCast.promptPipeline.effectiveIncludePersona === true, 'a named active Persona must receive Persona Vault appearance without requiring cast="user" shorthand')
assert(namedPersonaWithoutCast.promptPipeline.personaContext?.includes('glasses'), `named active Persona lost its Vault appearance in prompt assembly: ${namedPersonaWithoutCast.promptPipeline.personaContext}`)

const policySettings = (mode: 'model-placed' | 'relay-planned', override: 'global' | 'off' | 'low' | 'medium' | 'strong') => ({
  ...(config.proseIllustratorSettings as any), mode, enabled: true, appearanceMemoryEnabled: true,
  appearanceMemoryOverride: override, continuityStrength: override === 'global' ? 'medium' : override,
})
for (const [globalStrength, override, expected] of [
  ['off', 'global', 'off'], ['strong', 'global', 'strong'], ['strong', 'off', 'off'],
  ['strong', 'low', 'low'], ['strong', 'medium', 'medium'], ['off', 'strong', 'strong'],
] as const) {
  for (const mode of ['model-placed', 'relay-planned'] as const) {
    assert(backend.effectiveIllustratorAppearanceStrength(policySettings(mode, override), globalStrength) === expected, `${mode}/${globalStrength}/${override}: effective Appearance policy drifted`)
  }
}
const relayPolicyState = { continuityVault: refreshedState.continuityVault } as any
assert(backend.relayPlannedSubjectStates(relayPolicyState, 'prompt-once', 'Prime Beta waits for a portrait.', policySettings('relay-planned', 'off')).length === 0, 'Relay-Planned Director input leaked Vault facts through explicit Off')
const relayStrengthCounts = (['low', 'medium', 'strong'] as const).map(strength => backend.relayPlannedSubjectStates(relayPolicyState, 'prompt-once', 'Prime Beta waits for a portrait.', policySettings('relay-planned', strength))[0]?.activeFactIds.length || 0)
assert(relayStrengthCounts[0] > 0 && relayStrengthCounts[0] <= relayStrengthCounts[1] && relayStrengthCounts[1] <= relayStrengthCounts[2], `Relay-Planned Director strength selection is not monotonic: ${relayStrengthCounts.join('/')}`)

const prosePolicyJob = (chatId: string, requestId: string) => ({
  requestId, chatId, messageId: 'm1', swipeId: 0, target: 'prose.illustration', slots: ['illustration'], count: 1,
  originalSceneBrief: 'Prime Beta waits for a portrait.', originalRequestXml: '', alt: 'Prime Beta portrait', caption: '', aspect: '3:4', cast: 'user', promptSource: 'visual_prompt', originalNegativePrompt: '',
  prosePromptComposition: { perspectiveMode: 'scene-snapshot', peoplePolicy: 'required', expectedPeopleCount: 1, namedSubjects: ['Prime Beta'] },
} as any)
for (const mode of ['model-placed', 'relay-planned'] as const) {
  for (const [globalStrength, override, expected, cap] of [
    ['off', 'global', 'off', 0], ['strong', 'off', 'off', 0], ['strong', 'low', 'low', 3],
    ['strong', 'medium', 'medium', 5], ['off', 'strong', 'strong', 6],
  ] as const) {
    const chatId = `policy-${mode}-${globalStrength}-${override}`
    const policyVault = structuredClone(refreshedState.continuityVault)
    policyVault.chatId = chatId
    policyVault.strength = globalStrength
    for (const fact of [...Object.values(policyVault.visualIdentity), ...Object.values(policyVault.wardrobe), ...Object.values(policyVault.currentAppearance)] as any[]) fact.chatId = chatId
    await backend.setConfig({ enabled: true, vaultStrength: globalStrength, proseIllustratorSettings: policySettings(mode, override) }, 'offline')
    backendState.set(`states/${chatId}.json`, { chatId, continuityVault: policyVault, proseIllustrator: { settings: { [chatId]: policySettings(mode, override) } }, slots: {}, logs: [] })
    const result = await backend.parseSlotPrompt(prosePolicyJob(chatId, `${chatId}-request`), 'illustration', backendMessages as any, 0, config, 'offline', {})
    const projectedCount = result.promptPipeline.projectedContinuityFactCount || 0
    assert(result.promptPipeline.continuityStrength === expected, `${mode}/${globalStrength}/${override}: final generation used ${result.promptPipeline.continuityStrength}, expected ${expected}`)
    assert(expected === 'off' ? projectedCount === 0 && result.promptPipeline.includedContinuityFacts.length === 0 : projectedCount > 0 && projectedCount <= cap, `${mode}/${globalStrength}/${override}: final generation projected ${projectedCount} Vault facts`)
  }
}

const sleepingVault = emptyContinuityVault('sleeping-prompt')
sleepingVault.strength = 'strong'
const sleepingPersona = registerCanonicalCharacter(sleepingVault, { name: 'Prime Beta', canonicalCharacterId: 'persona-beta', sourceType: 'native-visual-preset', userConfirmed: true })
for (const [category, value] of [
  ['eye-color', 'brown_eyes'], ['other', 'long_eyelashes'], ['hair-color', 'black_hair'], ['hair-length', 'long_hair'],
  ['body-build', 'slim_build'], ['height', 'tall'], ['mole', 'beauty_mark_under_eye'],
] as const) addAppearanceFact(sleepingVault, { layer: 'visual-identity', characterId: sleepingPersona.canonicalCharacterId, category, value, sourceType: 'manual', userConfirmed: true })
addAppearanceFacts(sleepingVault, { layer: 'wardrobe', characterId: sleepingPersona.canonicalCharacterId, category: 'current-outfit', value: 'hoodie, jeans, sneakers', sourceType: 'manual', userConfirmed: true, currentWardrobe: true, semanticAuthority: 'explicit-user' })
backendState.set('states/sleeping-prompt.json', { chatId: 'sleeping-prompt', continuityVault: sleepingVault, slots: {}, logs: [] })
const sleepingPrepared = await backend.parseSlotPrompt({
  requestId: 'sleeping-projection', chatId: 'sleeping-prompt', messageId: 'm1', swipeId: 0,
  target: 'prose.illustration', slots: ['illustration'], count: 1,
  originalSceneBrief: 'Prime Beta is asleep on the sofa, hair across the pillow, eyes closed.',
  originalRequestXml: '', alt: 'Sleeping on the sofa', caption: '', aspect: '4:3', cast: 'user', promptSource: 'visual_prompt', originalNegativePrompt: '',
  prosePromptComposition: { perspectiveMode: 'scene-snapshot', peoplePolicy: 'required', expectedPeopleCount: 1, namedSubjects: ['Prime Beta'] } as any,
}, 'illustration', backendMessages as any, 0, config, 'offline', {})
assert(!/(?:brown_eyes|long_eyelashes|\btall\b|sneakers)/.test(sleepingPrepared.prompt), `sleeping positive prompt must not re-append hidden or contradictory Vault facts: ${sleepingPrepared.prompt}`)
assert(/black_hair/.test(sleepingPrepared.prompt), 'sleeping positive prompt may retain visible projected hair continuity')
assert(/open_eyes/.test(sleepingPrepared.negativePrompt) && /direct_gaze/.test(sleepingPrepared.negativePrompt), 'sleeping negative prompt must guard closed-eye state')
assert((sleepingPrepared.promptPipeline.rawContinuityFactCount || 0) > (sleepingPrepared.promptPipeline.projectedContinuityFactCount || 0), 'prompt diagnostics must distinguish broad Vault selection from projected generation facts')
assert((sleepingPrepared.promptPipeline.projectedContinuityFactCount || 0) <= 6, 'strong generation projection must cap continuity at six facts per visible subject')

const lifecycleStart = backendEvents.length
backendFrontendHandler!({ type: 'continuity_action', chatId: 'prompt-once', action: 'rerun_appearance_field', characterId: persona.canonicalCharacterId, appearanceField: 'stable-appearance' }, 'offline')
for (let attempt = 0; attempt < 200 && !backendEvents.slice(lifecycleStart).some(event => event.type === 'appearance_memory_action_status' && event.operation === 'rerun-field' && event.status === 'success'); attempt += 1) await new Promise(resolve => setTimeout(resolve, 1))
const lifecycleEvents = backendEvents.slice(lifecycleStart).filter(event => event.type === 'appearance_memory_action_status' && event.operation === 'rerun-field')
assert(lifecycleEvents.some(event => event.status === 'started') && lifecycleEvents.some(event => event.status === 'success'), 'explicit field rerun lifecycle must emit started then success')
const stableBeforeUnknown = appearanceMemoryView((backendState.get('states/prompt-once.json') as any).continuityVault, persona.canonicalCharacterId).stableAppearance
fieldRefreshMode = 'unknown'
const unknownStart = backendEvents.length
backendFrontendHandler!({ type: 'continuity_action', chatId: 'prompt-once', action: 'rerun_appearance_field', characterId: persona.canonicalCharacterId, appearanceField: 'stable-appearance' }, 'offline')
for (let attempt = 0; attempt < 200 && !backendEvents.slice(unknownStart).some(event => event.type === 'appearance_memory_action_status' && event.status === 'unknown'); attempt += 1) await new Promise(resolve => setTimeout(resolve, 1))
assert(backendEvents.slice(unknownStart).some(event => event.type === 'appearance_memory_action_status' && event.status === 'unknown' && /existing value kept/i.test(event.message)), 'unknown rerun must emit warning lifecycle without false success')
assert(appearanceMemoryView((backendState.get('states/prompt-once.json') as any).continuityVault, persona.canonicalCharacterId).stableAppearance === stableBeforeUnknown, 'unknown rerun must preserve the existing field')
fieldRefreshMode = 'error'
const errorStart = backendEvents.length
backendFrontendHandler!({ type: 'continuity_action', chatId: 'prompt-once', action: 'rerun_appearance_field', characterId: persona.canonicalCharacterId, appearanceField: 'stable-appearance' }, 'offline')
for (let attempt = 0; attempt < 200 && !backendEvents.slice(errorStart).some(event => event.type === 'appearance_memory_action_status' && event.status === 'error'); attempt += 1) await new Promise(resolve => setTimeout(resolve, 1))
assert(backendEvents.slice(errorStart).some(event => event.type === 'appearance_memory_action_status' && event.status === 'error'), 'failed rerun must emit error lifecycle and release the field UI')

console.log('Appearance canonicalization smoke passed.')
