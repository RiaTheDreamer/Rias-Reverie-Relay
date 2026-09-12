// @ts-nocheck -- local, mocked Appearance Memory canonicalization regression gate.
import {
  addAppearanceFact,
  appearanceMemoryView,
  formatSelectedAppearanceFacts,
  emptyContinuityVault,
  normalizeContinuityVault,
  isValidCanonicalCharacterName,
  registerCanonicalCharacter,
  saveManualAppearanceMemory,
  selectContinuityForSubjects,
} from '../src/vault'
import { ingestAppearanceSidecarObservations, normalizeAppearanceSidecarOutput } from '../src/appearanceSidecar'

const assert = (value: unknown, message: string): asserts value => { if (!value) throw new Error(message) }
const values = (text: string) => text.split(',').map(item => item.trim()).filter(Boolean)
const has = (text: string, tag: string) => values(text).includes(tag)
const lacksProse = (text: string) => {
  assert(!/\b(?:sharp|jet-black|raven-black|manhwa lashes|beneath|outer corner|looked bronze|practice jersey)\b/i.test(text), `prose leaked into canonical tags: ${text}`)
}
const sidecar = (observations: any[]) => normalizeAppearanceSidecarOutput(JSON.stringify({ observations }))

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
// wardrobe. Explicit clears persist, and newer current-turn Sidecar evidence
// advances it without deleting the saved wardrobe library.
const outfitVault = emptyContinuityVault('appearance-outfit-lifecycle')
const outfitSubject = registerCanonicalCharacter(outfitVault, { name: 'Outfit Alpha', sourceType: 'manual', userConfirmed: true })
addAppearanceFact(outfitVault, { layer: 'wardrobe', characterId: outfitSubject.canonicalCharacterId, category: 'saved-outfit', value: 'formal black shirt', sourceType: 'manual', userConfirmed: true })
saveManualAppearanceMemory(outfitVault, { characterId: outfitSubject.canonicalCharacterId, stableAppearance: '', currentOutfit: 'grey hoodie, jeans' })
assert(appearanceMemoryView(outfitVault, outfitSubject.canonicalCharacterId).currentOutfit === 'gray_hoodie, jeans', 'manual Current Outfit must save independently from saved wardrobe')
saveManualAppearanceMemory(outfitVault, { characterId: outfitSubject.canonicalCharacterId, stableAppearance: '', currentOutfit: '' })
assert(appearanceMemoryView(outfitVault, outfitSubject.canonicalCharacterId).currentOutfit === '', 'manually clearing Current Outfit must persist as empty')
assert(Object.values(outfitVault.wardrobe).some(fact => fact.category === 'saved-outfit' && fact.status === 'active'), 'clearing Current Outfit must preserve saved wardrobe')
saveManualAppearanceMemory(outfitVault, { characterId: outfitSubject.canonicalCharacterId, stableAppearance: '', currentOutfit: 'training uniform' })
ingestAppearanceSidecarObservations(outfitVault, sidecar([{
  subject: { name: 'Outfit Alpha', aliases: [], role: 'character', trustworthy: true }, confidence: .98,
  facts: [{ layer: 'wardrobe', category: 'current-outfit', value: 'white sleep shirt, black shorts', provenance: 'current-assistant-message' }],
}]), { chatId: outfitVault.chatId, messageId: 'outfit-change-1', swipeId: 0, activeCharacter: { id: outfitSubject.canonicalCharacterId, name: 'Outfit Alpha', aliases: [] }, activePersona: null })
assert(appearanceMemoryView(outfitVault, outfitSubject.canonicalCharacterId).currentOutfit === 'white_sleep_shirt, black_shorts', 'current-turn Sidecar evidence must independently replace the previous Current Outfit')
assert(Object.values(outfitVault.wardrobe).some(fact => fact.category === 'saved-outfit' && fact.status === 'active'), 'Sidecar Current Outfit updates must not delete saved wardrobe')

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
assert(has(manualView.stableAppearance, 'hazel_eyes') && has(manualView.stableAppearance, 'medium_brown_hair') && manualView.currentOutfit === 'practice_jersey', 'manual Appearance editor must share canonical tag persistence')
assert(migrated.characterSheets.subject.negativeIdentityTags === 'blue_eyes, red_hair', 'negative identity tags should serialize as canonical tags')

// Manual comma-separated traits are atomic author intent, not one compound
// fallback slug. This is the exact class reported by the Appearance editor.
saveManualAppearanceMemory(migrated, { characterId: 'subject', stableAppearance: 'messy lavender hair, glasses', currentOutfit: '', negativeIdentityTags: '' })
const atomicManual = appearanceMemoryView(migrated, 'subject')
for (const tag of ['messy_hair', 'lavender_hair', 'glasses']) assert(has(atomicManual.stableAppearance, tag), `manual atomic trait missing ${tag}: ${atomicManual.stableAppearance}`)
assert(!has(atomicManual.stableAppearance, 'messy_lavender_hair_glasses'), `manual list collapsed into a compound tag: ${atomicManual.stableAppearance}`)
const atomicFirstSave = atomicManual.stableAppearance
saveManualAppearanceMemory(migrated, { characterId: 'subject', stableAppearance: 'messy lavender hair, glasses', currentOutfit: '', negativeIdentityTags: '' })
assert(appearanceMemoryView(migrated, 'subject').stableAppearance === atomicFirstSave, 'repeated manual atomic save must be idempotent')

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
const backendMessages = [{ id: 'm1', role: 'assistant', content: 'Prime Beta waits in the room.', swipes: [], metadata: {} }]
;(globalThis as any).spindle = {
  registerMessageContentProcessor() {}, registerInterceptor() {}, registerMacro() {}, on() {}, onFrontendMessage() {}, sendToFrontend() {},
  permissions: { has: () => true },
  userStorage: {
    async getJson(path: string, { fallback }: any) {
      if (backendState.has(path)) return structuredClone(backendState.get(path))
      if (path === 'config.json') return { ...fallback, enabled: true, parserConnectionId: 'offline', parserModel: 'offline', includeCharacterInfo: false, includePersonaInfo: true, proseIllustratorSettings: { ...fallback.proseIllustratorSettings, appearanceMemoryEnabled: true, continuityStrength: 'strong' } }
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
    if (system.includes('Appearance Sidecar')) return { content: JSON.stringify({ observations: [{ subject: { name: 'Prime Beta', aliases: [], role: 'persona', trustworthy: true }, confidence: .98, facts: [{ layer: 'wardrobe', category: 'current-outfit', value: 'red dress', provenance: 'current-assistant-message' }] }] }) }
    return { content: JSON.stringify({ prompt: 'Prime Beta with black hair, winged eyeliner, and long eyelashes.', negativeAdditions: '' }) }
  } },
  imageGen: new Proxy({}, { get() { throw new Error('Image generation is forbidden in this smoke') } }),
  log: { info() {}, warn() {}, error() {} },
  variables: { global: { async set() {} }, chat: { async set() {} } },
}
const backend = await import('../src/backend')
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
await backend.runAppearanceSidecar({ chatId: 'prompt-once', messageId: 'ordinary-turn', swipeId: 0, content: 'Prime Beta changes into a red dress.', userId: 'offline', reason: 'generation-ended' })
const independentOutfitState = backendState.get('states/prompt-once.json') as any
assert(appearanceMemoryView(independentOutfitState.continuityVault, persona.canonicalCharacterId).currentOutfit === 'red_dress', 'Appearance Sidecar must update Current Outfit on an ordinary completed turn without an image request')
const prepared = await backend.parseSlotPrompt({ requestId: 'prompt-once-request', chatId: 'prompt-once', messageId: 'm1', swipeId: 0, target: 'custom.artifact-media', slots: ['portrait'], count: 1, originalSceneBrief: 'Prime Beta portrait.', originalRequestXml: '', alt: 'Portrait', caption: '', aspect: '3:4', cast: 'user', promptSource: 'structured', originalNegativePrompt: '', promptProfileId: 'social-candid' }, 'portrait', backendMessages as any, 0, config, 'offline', {})
const parserPrompt = JSON.stringify(backendRequests.at(-1)?.messages || [])
assert(prepared.promptPipeline.identityResolution?.fallbacks.some((row: string) => row.includes('Appearance Sidecar state used')), 'unresolved persona binding should use Sidecar fallback')
assert(!parserPrompt.includes('Relay Appearance Memory'), 'Sidecar fallback subject must not also receive duplicate Relay Appearance Memory block')
for (const tag of ['black_hair', 'winged_eyeliner', 'long_eyelashes']) {
  assert((parserPrompt.match(new RegExp(tag, 'g')) || []).length === 1, `provider-bound parser prompt should contain ${tag} once through clean Sidecar fallback: ${parserPrompt}`)
}

console.log('Appearance canonicalization smoke passed.')
