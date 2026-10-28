// Legacy state and phone projection compatibility only. Public does not author Story events, knowledge or reels.
export type StoryCanonState = 'proposed' | 'confirmed' | 'superseded' | 'non-canon'
export type StorySourceState = 'active' | 'inactive-swipe' | 'edited' | 'deleted'
export type StoryBeliefState = 'knows' | 'suspects' | 'rumor' | 'misinformed' | 'unaware' | 'unknown'
export type StoryAcquisitionMode = 'involved' | 'witnessed' | 'told' | 'evidence' | 'inferred' | 'public-broadcast' | 'manual'
export type StoryEchoKind = 'phone-message' | 'phone-notification' | 'phone-call' | 'phone-photo' | 'kakao' | 'instagram' | 'twitter' | 'news' | 'discord' | 'email' | 'voice-memo' | 'surface' | 'scene-reference' | 'manual' | 'other'
export type StoryEventType = 'social' | 'relationship' | 'public' | 'conflict' | 'discovery' | 'milestone' | 'location' | 'media' | 'injury' | 'possession' | 'promise' | 'status-change' | 'other'
export type StoryImportance = 'background' | 'notable' | 'major' | 'arc-defining'

export type StorySourceRef = {
  chatId: string
  messageId: string
  swipeId: number
  role: 'user' | 'assistant' | 'system' | 'unknown'
  contentFingerprint: string
  excerpt: string
  sourceKind: 'chat-prose' | 'surface' | 'narrative-utility' | 'phone' | 'manual' | 'backfill'
  createdAt: number
  sourceState: StorySourceState
}

export type StoryActor = {
  actorId: string
  kind: 'character' | 'persona' | 'npc' | 'audience' | 'temporary'
  displayName: string
  aliases: string[]
  canonicalCharacterId?: string
  lumiverseCharacterId?: string
  lumiversePersonaId?: string
  sourceRefs: StorySourceRef[]
  mergedIntoActorId?: string
  createdAt: number
  updatedAt: number
}

export type StoryParticipant = { actorId: string; role: 'subject' | 'participant' | 'witness' | 'instigator' | 'affected' | 'source' | 'recipient' | 'other' }
export type StoryProposedKnowledge = {
  actorId: string
  beliefState: StoryBeliefState
  acquisitionMode: StoryAcquisitionMode
  sourceActorId?: string
  confidence: number
}

export type StoryProposedEcho = {
  kind: StoryEchoKind
  channel?: string
  summary: string
  confidence: number
}

export type StoryEventProposal = {
  proposalId: string
  candidateKey: string
  chatId: string
  title: string
  summary: string
  eventType: StoryEventType
  importance: StoryImportance
  confidence: number
  anchor: string
  storyTimeLabel: string
  location?: string
  participants: StoryParticipant[]
  proposedKnowledge: StoryProposedKnowledge[]
  proposedEchoes: StoryProposedEcho[]
  likelyDuplicateEventId?: string
  proposalKind: 'new-event' | 'event-echo' | 'revision'
  sourceRef: StorySourceRef
  status: 'proposed' | 'accepted' | 'rejected' | 'stale'
  createdAt: number
  updatedAt: number
}

export type StoryEventNode = {
  eventId: string
  chatId: string
  timelineId: string
  canonState: StoryCanonState
  sourceState: StorySourceState
  title: string
  summary: string
  eventType: StoryEventType
  importance: StoryImportance
  confidence: number
  storyTimeLabel: string
  location?: string
  participants: StoryParticipant[]
  causeEventIds: string[]
  consequenceEventIds: string[]
  linkedAssetIds: string[]
  echoIds: string[]
  sourceRefs: StorySourceRef[]
  sourceWarning?: string
  supersedesEventId?: string
  supersededByEventId?: string
  createdAt: number
  updatedAt: number
  confirmedAt?: number
}

export type StoryEventEcho = {
  echoId: string
  eventId?: string
  chatId: string
  kind: StoryEchoKind
  channel?: string
  summary: string
  assetId?: string
  sourceRef: StorySourceRef
  linkState: 'proposed' | 'confirmed' | 'rejected'
  confidence: number
  createdAt: number
  updatedAt: number
}

export type StoryKnowledgeTransition = {
  from: StoryBeliefState
  to: StoryBeliefState
  acquisitionMode: StoryAcquisitionMode
  sourceRef: StorySourceRef
  sourceEchoId?: string
  sourceActorId?: string
  confidence: number
  changedAt: number
  origin: 'sidecar' | 'deterministic' | 'manual'
}

export type StoryKnowledgeEdge = {
  edgeId: string
  eventId: string
  actorId: string
  beliefState: StoryBeliefState
  acquisitionMode: StoryAcquisitionMode
  sourceEchoId?: string
  sourceActorId?: string
  explicit: boolean
  sourceRefs: StorySourceRef[]
  history: StoryKnowledgeTransition[]
  createdAt: number
  updatedAt: number
}

export type StoryKnowledgeConflict = {
  conflictId: string
  eventId: string
  actorId: string
  kind: 'explicit-unaware-contradiction' | 'unexplained-knowledge-path'
  severity: 'soft' | 'hard'
  summary: string
  sourceRef: StorySourceRef
  status: 'open' | 'resolved' | 'dismissed'
  resolution?: 'learned-offscreen' | 'linked-existing-echo' | 'kept-existing-state' | 'model-mistake' | 'manual'
  createdAt: number
  updatedAt: number
}

export type StoryPhoneEntry = {
  entryId: string
  ownerActorId: string
  ownerName: string
  app: string
  kind: 'message' | 'photo' | 'call' | 'notification' | 'row' | 'stat' | 'note'
  title: string
  body: string
  senderName?: string
  storyTimeLabel?: string
  assetId?: string
  imageId?: string
  requestId?: string
  eventId?: string
  sourceRef: StorySourceRef
  createdAt: number
  updatedAt: number
}

export type StoryReelOverride = {
  eventId: string
  pinned?: boolean
  hidden?: boolean
  captionOverride?: string
  chapterLabelOverride?: string
  preferredHeroAssetId?: string
  updatedAt: number
}

export type StoryConstellationState = {
  schemaVersion: number
  activeTimelineId: string
  actors: Record<string, StoryActor>
  events: Record<string, StoryEventNode>
  proposals: Record<string, StoryEventProposal>
  echoes: Record<string, StoryEventEcho>
  knowledgeEdges: Record<string, StoryKnowledgeEdge>
  conflicts: Record<string, StoryKnowledgeConflict>
  phoneEntries: Record<string, StoryPhoneEntry>
  reelOverrides: Record<string, StoryReelOverride>
  processedMessageFingerprints: Record<string, number>
  updatedAt: number
}

const MAX_PROCESSED_STORY_FINGERPRINTS = 5000

export const emptyStoryConstellationState = (): StoryConstellationState => ({
  schemaVersion: 1,
  activeTimelineId: 'main',
  actors: {}, events: {}, proposals: {}, echoes: {}, knowledgeEdges: {}, conflicts: {},
  phoneEntries: {}, reelOverrides: {}, processedMessageFingerprints: {}, updatedAt: 0,
})

function record(value: unknown): Record<string, any> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, any> : {}
}

export function normalizeStoryConstellationState(value: unknown): StoryConstellationState {
  const raw = record(value)
  const empty = emptyStoryConstellationState()
  return {
    ...empty,
    schemaVersion: 1,
    activeTimelineId: typeof raw.activeTimelineId === 'string' && raw.activeTimelineId.trim() ? raw.activeTimelineId.trim() : 'main',
    actors: Object.fromEntries(Object.entries(record(raw.actors)).flatMap(([actorId, value]) => {
      const actor = record(value)
      const displayName = boundedText(actor.displayName, 80)
      if (!displayName) return []
      return [[actorId, {
        actorId, kind: ['character', 'persona', 'npc', 'audience', 'temporary'].includes(actor.kind) ? actor.kind : 'temporary',
        displayName, aliases: Array.isArray(actor.aliases) ? actor.aliases.filter((alias: unknown) => typeof alias === 'string').map((alias: string) => alias.slice(0, 80)).slice(0, 40) : [],
        canonicalCharacterId: typeof actor.canonicalCharacterId === 'string' ? actor.canonicalCharacterId.slice(0, 120) : undefined,
        lumiverseCharacterId: typeof actor.lumiverseCharacterId === 'string' ? actor.lumiverseCharacterId.slice(0, 120) : undefined,
        lumiversePersonaId: typeof actor.lumiversePersonaId === 'string' ? actor.lumiversePersonaId.slice(0, 120) : undefined,
        sourceRefs: Array.isArray(actor.sourceRefs) ? actor.sourceRefs : [],
        mergedIntoActorId: typeof actor.mergedIntoActorId === 'string' ? actor.mergedIntoActorId.slice(0, 120) : undefined,
        createdAt: Number(actor.createdAt) || 0, updatedAt: Number(actor.updatedAt) || 0,
      }]]
    })), events: record(raw.events), proposals: record(raw.proposals), echoes: record(raw.echoes),
    knowledgeEdges: record(raw.knowledgeEdges), conflicts: record(raw.conflicts), phoneEntries: record(raw.phoneEntries),
    reelOverrides: record(raw.reelOverrides), processedMessageFingerprints: Object.fromEntries(Object.entries(record(raw.processedMessageFingerprints)).slice(-MAX_PROCESSED_STORY_FINGERPRINTS)),
    updatedAt: Number.isFinite(Number(raw.updatedAt)) ? Math.max(0, Number(raw.updatedAt)) : 0,
  }
}

export function storyFingerprint(value: string): string {
  let hash = 2166136261
  for (let i = 0; i < value.length; i += 1) hash = Math.imul(hash ^ value.charCodeAt(i), 16777619)
  return (hash >>> 0).toString(36)
}

export function normalizeStoryName(value: string): string {
  return value.normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase()
}

export function storyActorId(name: string): string {
  const slug = normalizeStoryName(name).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'unknown'
  return `actor-${slug}-${storyFingerprint(normalizeStoryName(name))}`
}

export function createStorySourceRef(input: {
  chatId: string; messageId: string; swipeId: number; role?: string; content: string; excerpt?: string;
  sourceKind?: StorySourceRef['sourceKind']; createdAt?: number; sourceState?: StorySourceState
}): StorySourceRef {
  return {
    chatId: input.chatId, messageId: input.messageId, swipeId: Math.max(0, Math.floor(input.swipeId)),
    role: input.role === 'assistant' || input.role === 'user' || input.role === 'system' ? input.role : 'unknown',
    contentFingerprint: storyFingerprint(input.content),
    excerpt: String(input.excerpt || input.content).trim().slice(0, 420),
    sourceKind: input.sourceKind || 'chat-prose', createdAt: input.createdAt || Date.now(), sourceState: input.sourceState || 'active',
  }
}

function boundedText(value: unknown, limit: number): string { return typeof value === 'string' ? value.trim().slice(0, limit) : '' }

function addActorSource(actor: StoryActor, source: StorySourceRef, now: number): void {
  if (!actor.sourceRefs.some(ref => ref.contentFingerprint === source.contentFingerprint && ref.messageId === source.messageId && ref.swipeId === source.swipeId)) actor.sourceRefs.push({ ...source })
  actor.updatedAt = now
}

function actorForName(state: StoryConstellationState, name: string, now: number): StoryActor | null {
  const displayName = boundedText(name, 80)
  if (!displayName || displayName.length < 2) return null
  const normalized = normalizeStoryName(displayName)
  const aliasMatch = Object.values(state.actors).find(actor => !actor.mergedIntoActorId && (normalizeStoryName(actor.displayName) === normalized || actor.aliases.some(alias => normalizeStoryName(alias) === normalized)))
  if (aliasMatch) return aliasMatch
  const actorId = storyActorId(displayName)
  const found = state.actors[actorId]
  if (found) return found
  return state.actors[actorId] = { actorId, kind: 'temporary', displayName, aliases: [], sourceRefs: [], createdAt: now, updatedAt: now }
}

export function ensureStoryActor(state: StoryConstellationState, name: string, source?: StorySourceRef, now = Date.now()): StoryActor | null {
  const actor = actorForName(state, name, now)
  if (actor && source) addActorSource(actor, source, now)
  return actor
}

function syncStoryEventSourceState(event: StoryEventNode): void {
  if (event.sourceRefs.some(ref => ref.sourceState === 'active')) event.sourceState = 'active'
  else if (event.sourceRefs.some(ref => ref.sourceState === 'edited')) event.sourceState = 'edited'
  else if (event.sourceRefs.length && event.sourceRefs.every(ref => ref.sourceState === 'deleted')) event.sourceState = 'deleted'
  else event.sourceState = 'inactive-swipe'
}

export function markStorySwipe(state: StoryConstellationState, chatId: string, messageId: string, activeSwipeId: number): void {
  const statusFor = (ref: StorySourceRef) => ref.chatId === chatId && ref.messageId === messageId && ref.sourceState !== 'deleted' && ref.sourceState !== 'edited'
    ? (ref.swipeId === activeSwipeId ? 'active' : 'inactive-swipe') as StorySourceState
    : ref.sourceState
  for (const proposal of Object.values(state.proposals)) proposal.sourceRef.sourceState = statusFor(proposal.sourceRef)
  for (const event of Object.values(state.events)) {
    event.sourceRefs.forEach(ref => { ref.sourceState = statusFor(ref) })
    syncStoryEventSourceState(event)
  }
  for (const echo of Object.values(state.echoes)) echo.sourceRef.sourceState = statusFor(echo.sourceRef)
  for (const entry of Object.values(state.phoneEntries)) entry.sourceRef.sourceState = statusFor(entry.sourceRef)
  state.updatedAt = Date.now()
}

export function markStorySourceDeleted(state: StoryConstellationState, chatId: string, messageId: string): void {
  for (const proposal of Object.values(state.proposals)) if (proposal.sourceRef.chatId === chatId && proposal.sourceRef.messageId === messageId) {
    proposal.sourceRef.sourceState = 'deleted'
    if (proposal.status === 'proposed') proposal.status = 'stale'
  }
  for (const event of Object.values(state.events)) if (event.sourceRefs.some(ref => ref.chatId === chatId && ref.messageId === messageId)) {
    event.sourceRefs.forEach(ref => { if (ref.chatId === chatId && ref.messageId === messageId) ref.sourceState = 'deleted' })
    syncStoryEventSourceState(event)
    event.sourceWarning = 'The source message was deleted. Canon is preserved for review.'
  }
  for (const echo of Object.values(state.echoes)) if (echo.sourceRef.chatId === chatId && echo.sourceRef.messageId === messageId) echo.sourceRef.sourceState = 'deleted'
  for (const entry of Object.values(state.phoneEntries)) if (entry.sourceRef.chatId === chatId && entry.sourceRef.messageId === messageId) entry.sourceRef.sourceState = 'deleted'
  state.updatedAt = Date.now()
}

export function markStorySwipeDeleted(state: StoryConstellationState, chatId: string, messageId: string, swipeId: number): void {
  const mark = (ref: StorySourceRef) => {
    if (ref.chatId === chatId && ref.messageId === messageId && ref.swipeId === swipeId) ref.sourceState = 'deleted'
  }
  for (const proposal of Object.values(state.proposals)) {
    mark(proposal.sourceRef)
    if (proposal.sourceRef.sourceState === 'deleted' && proposal.status === 'proposed') proposal.status = 'stale'
  }
  for (const event of Object.values(state.events)) {
    const affected = event.sourceRefs.some(ref => ref.chatId === chatId && ref.messageId === messageId && ref.swipeId === swipeId)
    event.sourceRefs.forEach(mark)
    if (affected) {
      syncStoryEventSourceState(event)
      event.sourceWarning = 'A source swipe was deleted. Canon is preserved for review.'
    }
  }
  for (const echo of Object.values(state.echoes)) mark(echo.sourceRef)
  for (const entry of Object.values(state.phoneEntries)) mark(entry.sourceRef)
  state.updatedAt = Date.now()
}

export function markStorySourceEdited(state: StoryConstellationState, chatId: string, messageId: string, swipeId: number, newContent: string): void {
  const fingerprint = storyFingerprint(newContent)
  const editWarning = 'The source message changed after this event was confirmed. The confirmed event was preserved; review a new proposal.'
  for (const proposal of Object.values(state.proposals)) if (proposal.sourceRef.chatId === chatId && proposal.sourceRef.messageId === messageId && proposal.sourceRef.swipeId === swipeId) {
    if (proposal.sourceRef.contentFingerprint !== fingerprint && proposal.status === 'proposed') proposal.status = 'stale'
    proposal.sourceRef.sourceState = proposal.sourceRef.contentFingerprint === fingerprint ? 'active' : 'edited'
    proposal.updatedAt = Date.now()
  }
  for (const event of Object.values(state.events)) {
    let changed = false
    let affected = false
    for (const ref of event.sourceRefs) if (ref.chatId === chatId && ref.messageId === messageId && ref.swipeId === swipeId) {
      affected = true
      if (ref.contentFingerprint !== fingerprint) {
        ref.sourceState = 'edited'
        changed = true
      } else ref.sourceState = 'active'
    }
    if (changed) event.sourceWarning = editWarning
    else if (affected && event.sourceWarning === editWarning && event.sourceRefs.every(ref => ref.sourceState === 'active')) delete event.sourceWarning
    syncStoryEventSourceState(event)
  }
  for (const echo of Object.values(state.echoes)) if (echo.sourceRef.chatId === chatId && echo.sourceRef.messageId === messageId && echo.sourceRef.swipeId === swipeId) echo.sourceRef.sourceState = echo.sourceRef.contentFingerprint === fingerprint ? 'active' : 'edited'
  for (const entry of Object.values(state.phoneEntries)) if (entry.sourceRef.chatId === chatId && entry.sourceRef.messageId === messageId && entry.sourceRef.swipeId === swipeId) entry.sourceRef.sourceState = entry.sourceRef.contentFingerprint === fingerprint ? 'active' : 'edited'
  state.updatedAt = Date.now()
}

export function activeStoryEvents(state: StoryConstellationState): StoryEventNode[] {
  return Object.values(state.events).filter(event => event.canonState === 'confirmed' && event.timelineId === state.activeTimelineId && (event.sourceState === 'active' || event.sourceState === 'deleted' || event.sourceState === 'edited'))
}

export function visibleStoryPhoneEntries(state: StoryConstellationState): StoryPhoneEntry[] {
  const activeEventIds = new Set(activeStoryEvents(state).map(event => event.eventId))
  return Object.values(state.phoneEntries).filter(entry => entry.sourceRef.sourceState === 'active' && (!entry.eventId || activeEventIds.has(entry.eventId))).sort((a, b) => a.createdAt - b.createdAt)
}
