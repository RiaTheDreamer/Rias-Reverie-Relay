import type { AppearanceFactCategory, AppearanceVaultLayer, CanonicalVisualCharacter, ContinuityVaultState } from './contracts'
import { CONTEXT_LIMITS, selectExcerpts, selectHistoryContext, selectLorebookContext, visualSourceSnapshot, type ContextTier } from './contextBudget'
import {
  addAppearanceFacts,
  dedupeResolvedAppearanceFacts,
  isCategoryAllowedForLayer,
  isValidCanonicalCharacterName,
  registerCanonicalCharacter,
  syncAllCharacterSheetPresentation,
} from './vault'

export type AppearanceSidecarFact = {
  layer: AppearanceVaultLayer
  category: AppearanceFactCategory
  value: string
  /** Opaque semantic replacement key selected by the Sidecar, never inferred by Relay. */
  conflictDomain?: string
  provenance: string
}

export type AppearanceSidecarObservation = {
  subject: { name: string; aliases: string[]; role: 'character' | 'persona' | 'npc'; trustworthy: boolean }
  confidence: number
  facts: AppearanceSidecarFact[]
}

export type AppearanceSidecarIdentity = {
  id: string
  name: string
  aliases: string[]
}

const LAYERS = new Set<AppearanceVaultLayer>(['visual-identity', 'wardrobe', 'current-appearance'])
const CATEGORIES = new Set<AppearanceFactCategory>([
  'hair-color', 'hair-length', 'hair-texture', 'hairstyle', 'eye-color', 'face-shape', 'body-build', 'height', 'scar', 'tattoo', 'birthmark', 'mole', 'prosthetic', 'permanent-mark',
  'base-attire', 'saved-outfit', 'current-outfit', 'signature-accessory', 'uniform', 'work-attire', 'temporary-expression', 'temporary-injury', 'temporary-hair', 'temporary-makeup', 'temporary-clothing-state', 'temporary-accessory', 'other',
])
const PROVENANCE = new Set(['chat-history', 'current-assistant-message', 'character-card', 'persona-card', 'lorebook', 'native-character-preset', 'native-persona-preset', 'prior-appearance-state'])

const clean = (value: unknown): string => typeof value === 'string' ? value.trim() : ''
const asRecord = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
const stringList = (value: unknown): string[] => Array.isArray(value) ? value.map(clean).filter(Boolean) : []
const clamp = (value: unknown): number => Number.isFinite(Number(value)) ? Math.max(0, Math.min(1, Number(value))) : 0
const isConflictDomain = (value: string): boolean => /^[a-z][a-z0-9-]{0,47}(?::[a-z][a-z0-9-]{0,47})?$/.test(value) && value.length <= 96

/** Structural validation only. The Appearance Sidecar owns semantic meaning. */
export function normalizeAppearanceSidecarOutput(raw: string): AppearanceSidecarObservation[] {
  const source = clean(raw).replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '')
  const start = source.indexOf('{')
  const end = source.lastIndexOf('}')
  if (start < 0 || end <= start) throw new Error('Appearance Sidecar returned no JSON object.')
  let parsed: Record<string, unknown>
  try { parsed = asRecord(JSON.parse(source.slice(start, end + 1))) } catch { throw new Error('Appearance Sidecar returned invalid JSON.') }
  const rows = Array.isArray(parsed.observations) ? parsed.observations : []
  const observations: AppearanceSidecarObservation[] = []
  for (const rawObservation of rows.slice(0, 24)) {
    const observation = asRecord(rawObservation)
    const subject = asRecord(observation.subject)
    const name = clean(subject.name)
    const role = clean(subject.role)
    if (!name || !isValidCanonicalCharacterName(name) || !['character', 'persona', 'npc'].includes(role)) continue
    const facts: AppearanceSidecarFact[] = []
    for (const rawFact of (Array.isArray(observation.facts) ? observation.facts : []).slice(0, 16)) {
      const fact = asRecord(rawFact)
      const layer = clean(fact.layer) as AppearanceVaultLayer
      const category = clean(fact.category) as AppearanceFactCategory
      const value = clean(fact.value)
      const conflictDomain = clean(fact.conflictDomain)
      const provenance = clean(fact.provenance)
      if (!value || value.length > 320 || !LAYERS.has(layer) || !CATEGORIES.has(category) || !isCategoryAllowedForLayer(layer, category) || !PROVENANCE.has(provenance) || (conflictDomain && !isConflictDomain(conflictDomain))) continue
      facts.push({ layer, category, value, conflictDomain: conflictDomain || undefined, provenance })
    }
    if (!facts.length) continue
    observations.push({
      subject: { name, aliases: stringList(subject.aliases).filter(isValidCanonicalCharacterName).slice(0, 12), role: role as AppearanceSidecarObservation['subject']['role'], trustworthy: subject.trustworthy === true },
      confidence: clamp(observation.confidence),
      facts,
    })
  }
  return observations
}

/**
 * Normalizes arbitrary host data without trimming fields or taking a first-N
 * subset. Circular host references are labelled rather than silently dropped.
 */
export function preserveCompleteSidecarContext(value: unknown): unknown {
  const seen = new WeakSet<object>()
  const walk = (input: unknown): unknown => {
    if (input === null || typeof input === 'string' || typeof input === 'number' || typeof input === 'boolean') return input
    if (typeof input === 'bigint') return input.toString()
    if (typeof input !== 'object') return undefined
    if (seen.has(input)) return '[Circular host reference]'
    seen.add(input)
    if (Array.isArray(input)) return input.map(walk)
    const output: Record<string, unknown> = {}
    for (const [key, nested] of Object.entries(input as Record<string, unknown>)) {
      const next = walk(nested)
      if (next !== undefined) output[key] = next
    }
    return output
  }
  return walk(value)
}

export function buildAppearanceSidecarPayload(input: {
  currentAssistantMessage: string
  fullHistory: unknown
  activeCharacter: unknown
  activePersona: unknown
  lorebook: unknown
  nativeImageGenBindings: unknown
  appearanceMemory: ContinuityVaultState
  focusCharacter?: { id: string; name: string } | null
  tier?: ContextTier
  expansionReason?: string
}): Record<string, unknown> {
  const tier = input.tier || 'routine'
  if (tier !== 'routine' && !input.expansionReason) throw new Error('Expanded Appearance context requires an explicit reason.')
  const query = [input.currentAssistantMessage, input.focusCharacter?.name, asRecord(input.activeCharacter).name, asRecord(input.activePersona).name].filter(Boolean).join('\n')
  const active = (value: unknown, role: string) => {
    const source = asRecord(value)
    const snapshot = visualSourceSnapshot(`${role}:${source.id || source.name}`, value, query, tier, tier === 'diagnostic')
    return { id: source.id, name: source.name, aliases: source.aliases, visualSource: snapshot.text, sourceFingerprint: snapshot.fingerprint, cacheHit: snapshot.cacheHit }
  }
  const character = input.activeCharacter ? active(input.activeCharacter, 'character') : null
  const persona = input.activePersona ? active(input.activePersona, 'persona') : null
  const lorebook = selectLorebookContext(input.lorebook, query, tier)
  const history = selectHistoryContext(input.fullHistory, input.currentAssistantMessage, tier)
  const relevantCharacters = Object.values(input.appearanceMemory.characters).filter(character => [character.canonicalCharacterName, character.canonicalCharacterId, ...character.aliases].some(name => name && query.toLowerCase().includes(name.toLowerCase())))
  const ids = new Set(relevantCharacters.map(character => character.canonicalCharacterId))
  const memory: unknown[] = []; let memoryChars = 0
  for (const fact of dedupeResolvedAppearanceFacts([...Object.values(input.appearanceMemory.visualIdentity), ...Object.values(input.appearanceMemory.wardrobe), ...Object.values(input.appearanceMemory.currentAppearance)]).filter(fact => ids.has(fact.canonicalCharacterId) && fact.status === 'active').sort((a, b) => Number(b.userConfirmed) - Number(a.userConfirmed) || b.updatedAt - a.updatedAt)) {
    const selected = { subject: fact.canonicalCharacterName, layer: fact.layer, category: fact.category, value: fact.value, userConfirmed: fact.userConfirmed, updatedAt: fact.updatedAt }
    const size = JSON.stringify(selected).length
    if (memoryChars + size > CONTEXT_LIMITS[tier].memory) continue
    memory.push(selected); memoryChars += size
  }
  const contextMetrics = { tier, expansionReason: input.expansionReason || '', historyMessages: history.length, lorebookEntries: lorebook.entries, lorebookSegments: lorebook.segments, characterChars: character?.visualSource.length || 0, personaChars: persona?.visualSource.length || 0, appearanceMemoryChars: memoryChars, cacheHits: lorebook.cacheHits + Number(Boolean(character?.cacheHit)) + Number(Boolean(persona?.cacheHit)), cacheMisses: lorebook.cacheMisses + Number(Boolean(character && !character.cacheHit)) + Number(Boolean(persona && !persona.cacheHit)) }
  return {
    currentAssistantMessage: input.currentAssistantMessage.length <= CONTEXT_LIMITS[tier].scene ? input.currentAssistantMessage : selectExcerpts(input.currentAssistantMessage, query, CONTEXT_LIMITS[tier].scene),
    recentContext: history,
    activeCharacter: character,
    activePersona: persona,
    lorebook: lorebook.text,
    nativeImageGenBindings: (Array.isArray(input.nativeImageGenBindings) ? input.nativeImageGenBindings : []).map(value => {
      const binding = asRecord(value)
      return { kind: binding.kind, subjectId: binding.subjectId, subjectName: binding.subjectName, presetId: binding.presetId, generationAnchorAvailable: Boolean(binding.generationAnchorAvailable || binding.prompt) }
    }),
    appearanceMemory: { subjects: relevantCharacters.map(subject => ({ name: subject.canonicalCharacterName, aliases: subject.aliases })), facts: memory },
    focusCharacter: preserveCompleteSidecarContext(input.focusCharacter || null),
    contextMetrics,
  }
}

/** The persistence path used by the live Sidecar runner and mocked regressions. */
export function ingestAppearanceSidecarObservations(
  vault: ContinuityVaultState,
  observations: AppearanceSidecarObservation[],
  input: { chatId: string; messageId: string; swipeId: number; activeCharacter: AppearanceSidecarIdentity | null; activePersona: AppearanceSidecarIdentity | null },
): { changed: boolean; acceptedFacts: number; acceptedCharacters: number } {
  const before = JSON.stringify([vault.characters, vault.visualIdentity, vault.wardrobe, vault.currentAppearance])
  let acceptedFacts = 0
  let acceptedCharacters = 0
  // Active host identities exist independently of Sidecar discoveries.
  for (const [role, identity] of [['character', input.activeCharacter], ['persona', input.activePersona]] as const) {
    if (!identity || !isValidCanonicalCharacterName(identity.name)) continue
    registerCanonicalCharacter(vault, { name: identity.name, canonicalCharacterId: identity.id || undefined, lumiverseCharacterId: role === 'character' ? identity.id : undefined, lumiversePersonaId: role === 'persona' ? identity.id : undefined, aliases: identity.aliases, sourceType: role === 'persona' ? 'persona-card' : 'character-card', userConfirmed: true })
  }
  for (const observation of observations) {
    let canonical: CanonicalVisualCharacter | null = null
    try {
      if (observation.subject.role === 'character' && input.activeCharacter) {
        canonical = registerCanonicalCharacter(vault, { name: input.activeCharacter.name, canonicalCharacterId: input.activeCharacter.id, lumiverseCharacterId: input.activeCharacter.id, aliases: [...input.activeCharacter.aliases, ...observation.subject.aliases], sourceType: 'character-card', userConfirmed: true })
      } else if (observation.subject.role === 'persona' && input.activePersona) {
        canonical = registerCanonicalCharacter(vault, { name: input.activePersona.name, canonicalCharacterId: input.activePersona.id || undefined, lumiversePersonaId: input.activePersona.id, aliases: [...input.activePersona.aliases, observation.subject.name, ...observation.subject.aliases], sourceType: 'persona-card', userConfirmed: true })
      } else if (observation.subject.role === 'npc' && observation.subject.trustworthy && observation.confidence >= 0.78) {
        canonical = registerCanonicalCharacter(vault, { name: observation.subject.name, aliases: observation.subject.aliases, sourceType: 'appearance-sidecar', sidecarVerified: true })
      }
    } catch {
      canonical = null
    }
    if (!canonical) continue
    acceptedCharacters += 1
    for (const fact of observation.facts) {
      // Native prompts are generation anchors, never a source to chop into facts.
      if (fact.provenance === 'native-character-preset' || fact.provenance === 'native-persona-preset') continue
      try {
        const savedFacts = addAppearanceFacts(vault, {
          layer: fact.layer, characterId: canonical.canonicalCharacterId, category: fact.category, value: fact.value,
          conflictDomain: fact.conflictDomain,
          sourceType: 'appearance-sidecar', semanticAuthority: 'appearance-sidecar', confidence: observation.confidence,
          sourceReference: { sourceType: 'appearance-sidecar', sourceReference: `sidecar:${fact.provenance}`, chatId: input.chatId, messageId: input.messageId, swipeId: input.swipeId },
          chatId: input.chatId, sourceMessageId: input.messageId, sourceSwipeId: input.swipeId,
          currentWardrobe: fact.layer === 'wardrobe' && fact.category === 'current-outfit',
          replaceUserConfirmedCurrentWardrobe: fact.layer === 'wardrobe' && fact.category === 'current-outfit' && fact.provenance === 'current-assistant-message',
        })
        acceptedFacts += savedFacts.length
      } catch {
        // Invalid structure never replaces existing memory. Semantic prose is
        // not reclassified here; Sidecar-owned layer/category is authoritative.
      }
    }
  }
  syncAllCharacterSheetPresentation(vault)
  return { changed: before !== JSON.stringify([vault.characters, vault.visualIdentity, vault.wardrobe, vault.currentAppearance]), acceptedFacts, acceptedCharacters }
}
