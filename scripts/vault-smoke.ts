import {
  acceptSuggestion,
  addAppearanceFact,
  addAppearanceSuggestion,
  applyMigrationPreview,
  buildMigrationPreview,
  classifyAppearanceValue,
  emptyContinuityVault,
  expireCurrentAppearance,
  extractAppearanceTraitPhrases,
  isValidCanonicalCharacterName,
  mergeAppearanceFacts,
  normalizeContinuityVault,
  registerCanonicalCharacter,
  resolveCanonicalCharacter,
  selectContinuityForSubjects,
  selectCharacterScopedAppearanceRows,
  suggestionFromGeneratedPrompt,
} from '../src/vault'

const now = 1_800_000_000_000
const vault = emptyContinuityVault('chat-a')
vault.strength = 'strong'

// 1-2. Invalid entity resolution.
assert(!isValidCanonicalCharacterName('She'), 'pronouns must not become characters')
assert(!isValidCanonicalCharacterName('Cinematic'), 'style words must not become characters')

// 3. Canonical aliases.
const subjectA = registerCanonicalCharacter(vault, { name: 'Alpha', aliases: ['Alpha', 'Alpha Alias'], sourceType: 'manual', userConfirmed: true }, now)
assert(resolveCanonicalCharacter(vault, 'Alpha')?.canonicalCharacterId === subjectA.canonicalCharacterId, 'Alpha alias should resolve to Alpha')
assert(resolveCanonicalCharacter(vault, 'Alpha Alias')?.canonicalCharacterId === subjectA.canonicalCharacterId, 'alternate alias should resolve to Alpha')
const account_a = registerCanonicalCharacter(vault, { name: 'Beta', aliases: ['Beta'], sourceType: 'character-card', userConfirmed: true }, now)

const scopedRows = selectCharacterScopedAppearanceRows([
  { message: { id: 'user-1' }, role: 'user', text: "I change right in front of him. I'm only in my bra and panties." },
  { message: { id: 'assistant-1' }, role: 'assistant', text: 'Beta stood in a white bra and panties. Gamma watched her, still dressed in a black school jacket.' },
  { message: { id: 'assistant-2' }, role: 'assistant', text: "Gamma's black hair fell over his brown eyes. Beta crossed the room in a pale cardigan." },
], ['Gamma', 'Gamma'], 10, ['Gamma', 'Gamma', 'Beta'], [])
assert(scopedRows.length === 2, 'selected-character extraction should use only assistant rows that explicitly name the target')
const scopedText = scopedRows.map(row => row.text).join('\n')
assert(!/bra and panties/i.test(scopedText), 'selected-character scan must exclude the user persona and another character clothing')
assert(/black school jacket/i.test(scopedText) && /black hair fell over his brown eyes/i.test(scopedText), 'selected-character scan should keep only Gamma-specific appearance clauses')
assert(!/pale cardigan/i.test(scopedText), 'selected-character extraction must not absorb nearby Beta appearance details')
const firstPersonRows = selectCharacterScopedAppearanceRows([
  { message: { id: 'assistant-first-person' }, role: 'assistant', text: 'I pushed my dark hair away from my face. The scar beneath my left eyebrow caught the light.' },
], ['Character A', '캐릭터A'], 8, ['Character A', 'Character B'], ['Character A'])
assert(firstPersonRows.length === 1 && /dark hair|scar beneath my left eyebrow/i.test(firstPersonRows[0].text), 'active-character first-person physical description must remain eligible without a literal display name')
const inactiveFirstPersonRows = selectCharacterScopedAppearanceRows([
  { message: { id: 'assistant-first-person-other' }, role: 'assistant', text: 'I pushed my dark hair away from my face.' },
], ['Character B'], 8, ['Character A', 'Character B'], ['Character A'])
assert(inactiveFirstPersonRows.length === 0, 'first-person physical description must not leak onto a non-active selected Vault target')

// 4-5. Classification and destination separation.
assert(classifyAppearanceValue('flushed tear-streaked face').layer === 'current-appearance', 'tear streaks should classify as Current Appearance')
assert(classifyAppearanceValue('brown eyes').layer === 'visual-identity', 'eye color should classify as Visual Identity')
const extractedTraits = extractAppearanceTraitPhrases(`Beta crossed the room and stared at the window. Her knee-length black hair spilled down her back, and her brown eyes were red-rimmed. She was wearing a pale blue cardigan while Gamma closed the door.`)
assert(extractedTraits.some(item => /knee-length black hair/i.test(item.value)), 'Appearance extraction should retain concise hair traits')
assert(extractedTraits.some(item => /brown eyes/i.test(item.value)), 'Appearance extraction should retain concise eye traits')
assert(extractedTraits.some(item => /wearing a pale blue cardigan/i.test(item.value)), 'Appearance extraction should retain concise wardrobe traits')
assert(extractedTraits.every(item => !/crossed the room|closed the door/i.test(item.value)), 'Appearance extraction must not store narrative prose as appearance facts')
const eye = addAppearanceFact(vault, { layer: 'visual-identity', characterId: subjectA.canonicalCharacterId, category: 'eye-color', value: 'brown eyes', sourceType: 'manual', userConfirmed: true, pinned: true }, now + 1)
const tears = addAppearanceFact(vault, { layer: 'current-appearance', characterId: subjectA.canonicalCharacterId, category: 'temporary-expression', value: 'flushed tear-streaked face', sourceType: 'manual', userConfirmed: true, chatId: 'chat-a', active: true, expiryPolicy: 'superseded' }, now + 2)
assert(vault.visualIdentity[eye.factId] && !vault.visualIdentity[tears.factId], 'temporary state must not enter Visual Identity')

// 6. Sidecar wardrobe/current-scene state is generation input and the current scene wins conflicts.
const baseUniform = addAppearanceFact(vault, { layer: 'wardrobe', characterId: subjectA.canonicalCharacterId, category: 'base-attire', value: 'Institution A dance uniform', sourceType: 'manual', userConfirmed: true, defaultWardrobe: true }, now + 3)
const hoodie = addAppearanceFact(vault, { layer: 'wardrobe', characterId: subjectA.canonicalCharacterId, category: 'current-outfit', value: 'wearing a grey hoodie', sourceType: 'manual', userConfirmed: true, currentWardrobe: true }, now + 4)
vault.characterSheets[subjectA.canonicalCharacterId] = {
  canonicalCharacterId: subjectA.canonicalCharacterId, canonicalCharacterName: subjectA.canonicalCharacterName, aliases: subjectA.aliases,
  booruTags: 'brown eyes, long black hair', currentOutfitTags: 'wet white shirt', negativeIdentityTags: 'blue eyes', referenceAssetIds: [], alternateLooks: [],
  sourceSentence: 'Stable identity fixture.', createdAt: now, updatedAt: now + 4,
}
let selection = selectContinuityForSubjects(vault, { subjectNames: ['Alpha'], chatId: 'chat-a', sceneBrief: 'Alpha walks downtown without restating clothing.', strength: 'strong' }, now + 5)
assert(selection.included.some(fact => fact.factId === hoodie.factId), 'current Sidecar wardrobe must carry into new generation continuity')
assert(!selection.included.some(fact => fact.factId === baseUniform.factId || /wet white shirt/i.test(fact.value)), 'the latest Sidecar wardrobe must supersede older base and sheet wardrobe state')
assert(selection.included.some(fact => fact.value === 'flushed_tear_streaked_face'), 'unchanged Sidecar current state must carry forward instead of being silently discarded')

// 7. Temporary state supersession and expiry.
const recovered = addAppearanceFact(vault, { layer: 'current-appearance', characterId: subjectA.canonicalCharacterId, category: 'temporary-expression', value: 'calm recovered expression', sourceType: 'manual', userConfirmed: true, chatId: 'chat-a', active: true, expiryPolicy: 'superseded' }, now + 6)
assert(vault.currentAppearance[tears.factId].status === 'superseded', 'new contradictory temporary state should supersede the old state')
const timed = addAppearanceFact(vault, { layer: 'current-appearance', characterId: subjectA.canonicalCharacterId, category: 'temporary-injury', value: 'temporary bruising', sourceType: 'manual', userConfirmed: true, chatId: 'chat-a', active: true, expiryPolicy: 'timestamp', expiresAt: now + 8 }, now + 7)
expireCurrentAppearance(vault, now + 9)
assert(vault.currentAppearance[timed.factId].status === 'inactive', 'expired temporary state should become inactive')
assert(vault.currentAppearance[recovered.factId].status === 'active', 'unexpired current state should remain active')

// 8-9. Generated prompts can only suggest/quarantine.
const generated = suggestionFromGeneratedPrompt(vault, { subjectName: 'Alpha', value: 'short black hair', chatId: 'chat-a', requestId: 'r1' }, now + 10)
assert(generated && 'suggestionId' in generated, 'resolved generated trait should enter Suggestions')
assert(!Object.values(vault.visualIdentity).some(fact => fact.value === 'short_black_hair' || fact.value === 'short black hair'), 'generated prompt must not directly create permanent identity')
const unresolved = suggestionFromGeneratedPrompt(vault, { subjectName: 'She', value: 'wet red-rimmed eyes', chatId: 'chat-a', requestId: 'r2' }, now + 11)
assert(unresolved && 'quarantineId' in unresolved, 'unresolved inferred trait should enter Quarantine')

// Explicit acceptance can promote a suggestion.
const accepted = acceptSuggestion(vault, (generated as any).suggestionId, 'current-appearance', 'temporary short hairstyle', now + 12)
assert(accepted.layer === 'current-appearance' && accepted.userConfirmed, 'accepted suggestion should enter selected layer as user-confirmed')

const stableHair = addAppearanceFact(vault, { layer: 'visual-identity', characterId: subjectA.canonicalCharacterId, category: 'hair-length', value: 'shoulder-length black hair', sourceType: 'character-card', userConfirmed: true }, now + 12.1)
const temporaryHair = addAppearanceFact(vault, { layer: 'current-appearance', characterId: subjectA.canonicalCharacterId, category: 'temporary-hair', value: 'temporarily cropped short hair', sourceType: 'manual', userConfirmed: true, chatId: 'chat-a', active: true, expiryPolicy: 'manual' }, now + 12.2)
const hairSelection = selectContinuityForSubjects(vault, { subjectNames: ['Alpha'], chatId: 'chat-a', sceneBrief: 'Alpha is shown with her current short haircut.', strength: 'strong' }, now + 12.3)
assert(!hairSelection.included.some(fact => fact.factId === temporaryHair.factId), 'legacy Current Appearance hair must not enter new generation continuity')
assert(!hairSelection.included.some(fact => fact.factId === stableHair.factId), 'the authoritative current scene should suppress a conflicting stable hair fallback without importing legacy temporary state')

const stableHairColor = addAppearanceFact(vault, { layer: 'visual-identity', characterId: subjectA.canonicalCharacterId, category: 'hair-color', value: 'natural black hair', sourceType: 'character-card', userConfirmed: true }, now + 12.4)
const temporaryHairColor = addAppearanceFact(vault, { layer: 'current-appearance', characterId: subjectA.canonicalCharacterId, category: 'temporary-hair', value: 'temporarily dyed blonde hair', sourceType: 'manual', userConfirmed: true, chatId: 'chat-a', active: true, expiryPolicy: 'manual' }, now + 12.5)
const colorSelection = selectContinuityForSubjects(vault, { subjectNames: ['Alpha'], chatId: 'chat-a', sceneBrief: 'Alpha is shown after dyeing her hair blonde.', strength: 'strong' }, now + 12.6)
assert(!colorSelection.included.some(fact => fact.factId === temporaryHairColor.factId), 'legacy temporary hair color must not enter new generation continuity')
assert(!colorSelection.included.some(fact => fact.factId === stableHairColor.factId), 'the authoritative current scene should override stable natural color without importing legacy temporary state')

// 10-11. Exact subject scoping at every strength.
addAppearanceFact(vault, { layer: 'visual-identity', characterId: account_a.canonicalCharacterId, category: 'hair-length', value: 'knee-length black hair', sourceType: 'character-card', userConfirmed: true, pinned: true }, now + 13)
const subjectAStrong = selectContinuityForSubjects(vault, { subjectNames: ['Alpha'], chatId: 'chat-a', sceneBrief: 'Alpha stands alone.', strength: 'strong' }, now + 14)
assert(subjectAStrong.included.every(fact => fact.canonicalCharacterId === subjectA.canonicalCharacterId), 'Alpha prompt must never include Beta facts')
const subjectALow = selectContinuityForSubjects(vault, { subjectNames: ['Alpha'], chatId: 'chat-a', sceneBrief: 'Alpha stands alone.', strength: 'low' }, now + 15)
assert(subjectAStrong.included.length >= subjectALow.included.length, 'strong mode may include more relevant facts')
assert(subjectAStrong.included.every(fact => fact.canonicalCharacterId === subjectA.canonicalCharacterId), 'strong mode must not broaden subject matching')

// 12-13. Migration preview classifies contaminated records and remains non-mutating.
const legacyFacts = {
  one: { entityName: 'Realistic', entityType: 'character-appearance', value: 'skin textures', pinned: false },
  two: { entityName: 'Alpha', entityType: 'character-appearance', value: 'flushed tear-streaked face', pinned: false },
  three: { entityName: 'His', entityType: 'character-appearance', value: 'eyes are red-rimmed and wet', pinned: true },
  four: { entityName: 'Alpha', entityType: 'character-appearance', value: 'brown eyes', pinned: true },
}
const beforeIdentity = Object.keys(vault.visualIdentity).length
const preview = buildMigrationPreview(legacyFacts, vault, 15, now + 16)
assert(preview.items.find(item => item.legacyFactId === 'one')?.disposition === 'remove', 'style contamination should be marked remove')
assert(preview.items.find(item => item.legacyFactId === 'two')?.disposition === 'move-current-appearance', 'temporary Alpha fact should move to Current Appearance')
assert(preview.items.find(item => item.legacyFactId === 'three')?.disposition === 'quarantine', 'pronoun entity should be quarantined')
assert(Object.keys(vault.visualIdentity).length === beforeIdentity, 'cleanup preview must not mutate active data')
vault.migrationPreview = preview
applyMigrationPreview(vault, preview.items.filter(item => item.legacyFactId === 'two').map(item => item.migrationItemId), now + 17)
assert(Object.values(vault.currentAppearance).some(fact => fact.value === 'flushed_tear_streaked_face'), 'confirmed migration should move temporary fact into Current Appearance')

// 14. Legacy state normalizes without rendering active sequence state.
const normalized = normalizeContinuityVault({ chatId: 'legacy', facts: legacyFacts }, 'legacy', 15)
assert(normalized.migrationPreview?.items.length === 4, 'legacy flat facts should load as a non-mutating cleanup preview')


// Additional regression: duplicate facts merge without losing confirmation, pins, or source assets.
const duplicateOne = addAppearanceFact(vault, {
  layer: 'visual-identity',
  characterId: subjectA.canonicalCharacterId,
  category: 'mole',
  value: 'small mole beneath her left eye',
  sourceType: 'character-card',
  userConfirmed: true,
  pinned: false,
  referenceAssetIds: ['asset-a'],
}, now + 18)
const duplicateTwo = addAppearanceFact(vault, {
  layer: 'visual-identity',
  characterId: subjectA.canonicalCharacterId,
  category: 'mole',
  value: 'a small mole beneath the left eye',
  sourceType: 'manual',
  userConfirmed: true,
  pinned: true,
  referenceAssetIds: ['asset-b'],
}, now + 19)
assert(duplicateOne.factId === duplicateTwo.factId, 'semantic duplicate marks should canonicalize to one fact before manual merge is needed')
assert(duplicateTwo.userConfirmed && duplicateTwo.pinned, 'canonical duplicate merge should preserve confirmation and pin state')
assert(duplicateTwo.referenceAssetIds.includes('asset-a') && duplicateTwo.referenceAssetIds.includes('asset-b'), 'canonical duplicate merge should preserve all reference assets')

// Additional regression: swipe index zero is real provenance and must survive normalization.
const swipeZeroVault = normalizeContinuityVault({
  chatId: 'chat-zero',
  characters: {
    subjectA: { canonicalCharacterId: 'subjectA', canonicalCharacterName: 'Alpha', aliases: ['Alpha'], sourceType: 'character-card', userConfirmed: true, createdAt: now, updatedAt: now },
  },
  currentAppearance: {
    wet: {
      factId: 'wet',
      layer: 'current-appearance',
      canonicalCharacterId: 'subjectA',
      canonicalCharacterName: 'Alpha',
      aliases: ['Alpha'],
      category: 'temporary-hair',
      value: 'rain-soaked hair',
      sourceType: 'scene-context',
      sourceReference: { sourceType: 'scene-context', chatId: 'chat-zero', messageId: 'm0', swipeId: 0 },
      sourceSwipeId: 0,
      confidence: 1,
      status: 'active',
      createdAt: now,
      updatedAt: now,
      pinned: false,
      userConfirmed: true,
      referenceAssetIds: [],
      chatId: 'chat-zero',
      active: true,
      expiryPolicy: 'scene',
    },
  },
}, 'chat-zero', 16)
assert(Object.values(swipeZeroVault.currentAppearance).some(fact => fact.sourceReference.swipeId === 0), 'source-reference swipe index zero should survive normalization')
assert(Object.values(swipeZeroVault.currentAppearance).some(fact => fact.sourceSwipeId === 0), 'current-state swipe index zero should survive normalization')

// 15-16 are source-level integration checks handled by the normal/lifecycle smoke suites.
console.log('vault smoke ok')

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}
