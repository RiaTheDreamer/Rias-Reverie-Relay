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

export type StoryEventCandidate = {
  title: string
  summary: string
  eventType: StoryEventType
  importance: StoryImportance
  confidence: number
  anchor: string
  storyTimeLabel?: string
  location?: string
  participants: Array<{ name: string; role?: StoryParticipant['role'] }>
  proposedKnowledge?: Array<{ actorName: string; beliefState: StoryBeliefState; acquisitionMode: StoryAcquisitionMode; sourceActorName?: string; confidence: number }>
  echoes?: StoryProposedEcho[]
  likelyDuplicateEventId?: string
}

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

/** Keep backfill idempotency bounded without pruning user-confirmed canon. */
export function rememberProcessedStoryMessage(state: StoryConstellationState, key: string, fingerprint: number): void {
  delete state.processedMessageFingerprints[key]
  state.processedMessageFingerprints[key] = Number.isFinite(fingerprint) ? fingerprint : 0
  while (Object.keys(state.processedMessageFingerprints).length > MAX_PROCESSED_STORY_FINGERPRINTS) {
    const oldest = Object.keys(state.processedMessageFingerprints)[0]
    if (!oldest) break
    delete state.processedMessageFingerprints[oldest]
  }
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

const EVENT_TYPES = new Set<StoryEventType>(['social', 'relationship', 'public', 'conflict', 'discovery', 'milestone', 'location', 'media', 'injury', 'possession', 'promise', 'status-change', 'other'])
const IMPORTANCES = new Set<StoryImportance>(['background', 'notable', 'major', 'arc-defining'])
const BELIEFS = new Set<StoryBeliefState>(['knows', 'suspects', 'rumor', 'misinformed', 'unaware', 'unknown'])
const ACQUISITIONS = new Set<StoryAcquisitionMode>(['involved', 'witnessed', 'told', 'evidence', 'inferred', 'public-broadcast', 'manual'])
const ROLES = new Set<StoryParticipant['role']>(['subject', 'participant', 'witness', 'instigator', 'affected', 'source', 'recipient', 'other'])
const ECHO_KINDS = new Set<StoryEchoKind>(['phone-message', 'phone-notification', 'phone-call', 'phone-photo', 'kakao', 'instagram', 'twitter', 'news', 'discord', 'email', 'voice-memo', 'surface', 'scene-reference', 'manual', 'other'])

function boundedText(value: unknown, limit: number): string { return typeof value === 'string' ? value.trim().slice(0, limit) : '' }
function boundedConfidence(value: unknown): number { const n = Number(value); return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0 }
export function resolveStoryActorId(state: StoryConstellationState, actorId: string): string {
  let current = actorId
  const seen = new Set<string>()
  while (state.actors[current]?.mergedIntoActorId && !seen.has(current)) {
    seen.add(current)
    current = state.actors[current].mergedIntoActorId!
  }
  return current
}

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

function sameStorySource(left: StorySourceRef, right: StorySourceRef): boolean {
  return left.contentFingerprint === right.contentFingerprint && left.chatId === right.chatId && left.messageId === right.messageId && left.swipeId === right.swipeId
}

export function mergeStoryActors(state: StoryConstellationState, sourceActorId: string, targetActorId: string, now = Date.now()): boolean {
  const sourceId = resolveStoryActorId(state, sourceActorId)
  const targetId = resolveStoryActorId(state, targetActorId)
  const source = state.actors[sourceId]
  const target = state.actors[targetId]
  if (!source || !target || sourceId === targetId) return false
  target.aliases = [...new Set([...target.aliases, source.displayName, ...source.aliases].filter(alias => normalizeStoryName(alias) !== normalizeStoryName(target.displayName)))].slice(0, 40)
  for (const ref of source.sourceRefs) if (!target.sourceRefs.some(existing => sameStorySource(existing, ref))) target.sourceRefs.push({ ...ref })
  for (const event of Object.values(state.events)) event.participants = [...new Map(event.participants.map(participant => [participant.actorId === sourceId ? targetId : participant.actorId, { ...participant, actorId: participant.actorId === sourceId ? targetId : participant.actorId }])).values()]
  for (const proposal of Object.values(state.proposals)) {
    proposal.participants = [...new Map(proposal.participants.map(participant => [participant.actorId === sourceId ? targetId : participant.actorId, { ...participant, actorId: participant.actorId === sourceId ? targetId : participant.actorId }])).values()]
    for (const knowledge of proposal.proposedKnowledge) {
      if (knowledge.actorId === sourceId) knowledge.actorId = targetId
      if (knowledge.sourceActorId === sourceId) knowledge.sourceActorId = targetId
    }
  }
  for (const edge of Object.values(state.knowledgeEdges)) if (edge.sourceActorId === sourceId) edge.sourceActorId = targetId
  for (const history of Object.values(state.knowledgeEdges).flatMap(edge => edge.history)) if (history.sourceActorId === sourceId) history.sourceActorId = targetId
  for (const edge of Object.values(state.knowledgeEdges).filter(value => value.actorId === sourceId)) {
    const destinationId = `${edge.eventId}:${targetId}`
    const prior = state.knowledgeEdges[destinationId]
    if (!prior) {
      delete state.knowledgeEdges[edge.edgeId]
      edge.actorId = targetId
      edge.edgeId = destinationId
      state.knowledgeEdges[destinationId] = edge
      continue
    }
    const newestRef = [...edge.sourceRefs].sort((a, b) => b.createdAt - a.createdAt)[0]
    if (newestRef && (prior.beliefState !== edge.beliefState || prior.acquisitionMode !== edge.acquisitionMode)) {
      applyStoryKnowledge(state, { eventId: edge.eventId, actorId: targetId, beliefState: edge.beliefState, acquisitionMode: edge.acquisitionMode, sourceActorId: edge.sourceActorId, sourceRef: newestRef, origin: 'manual', now })
    }
    for (const ref of edge.sourceRefs) if (!prior.sourceRefs.some(existing => sameStorySource(existing, ref))) prior.sourceRefs.push({ ...ref })
    for (const transition of edge.history) if (!prior.history.some(existing => existing.changedAt === transition.changedAt && existing.sourceRef.contentFingerprint === transition.sourceRef.contentFingerprint)) prior.history.push(transition)
    prior.explicit ||= edge.explicit
    delete state.knowledgeEdges[edge.edgeId]
  }
  for (const conflict of Object.values(state.conflicts)) if (conflict.actorId === sourceId) conflict.actorId = targetId
  for (const entry of Object.values(state.phoneEntries)) if (entry.ownerActorId === sourceId) { entry.ownerActorId = targetId; entry.ownerName = target.displayName }
  source.mergedIntoActorId = targetId
  source.updatedAt = now
  target.updatedAt = now
  state.updatedAt = now
  return true
}

function isPredictionOnly(candidate: StoryEventCandidate): boolean {
  const text = `${candidate.title} ${candidate.summary} ${candidate.anchor}`.trim()
  if (/\b(if|unless|might|may|could|would|will probably|is going to|plans? to|hopes? to|expects? to|predicts?|forecast|imagines?|dreams? of)\b/i.test(text)) return true
  return /\b(will|would|might|could)\b/i.test(candidate.title) && !/\b(promised|vowed|announced|decided|agreed|committed)\b/i.test(text)
}

function hasConsequentialAnchor(anchor: string): boolean {
  // Completed notices often use noun-led wording rather than a finite verb.
  // Match the witnessed transfer receipt, not any mention of a transfer.
  for (const match of anchor.matchAll(/\b(?:permanent\s+)?transfer\s+of\s+(?:[\p{L}\p{N}'-]+\s+){1,5}(?:executed|completed|finalized)\b/giu)) {
    const clausePrefix = anchor.slice(0, match.index).split(/[.;!?\n]/).at(-1) || ''
    if (!/\b(?:not|never|no|will|would|could|might|pending|proposed|planned|hypothetical)\b/i.test(clausePrefix + match[0])) return true
  }
  return /\b(?:reveal(?:s|ed)?|disclos(?:e|es|ed)|confess(?:es|ed)?|admit(?:s|ted)?|announce(?:s|d)?|declar(?:e|es|ed)|promis(?:e|es|ed)|vow(?:s|ed)?|agre(?:e|es|ed)|commit(?:s|ted)?|threaten(?:s|ed)?|confront(?:s|ed)?|attack(?:s|ed)?|injur(?:e|es|ed|y)|rescu(?:e|es|ed)|sav(?:e|es|ed)|discover(?:s|ed)?|uncover(?:s|ed)?|finds? evidence|leaks?|expos(?:e|es|ed)|publish(?:es|ed)?|go(?:es|t) public|photograph(?:s|ed)?|captures? (?:\w+\s+){0,4}(?:photos?|images?|videos?|pictures?)|releases?|resign(?:s|ed)?|fired|breaks? up|separat(?:e|es|ed)|marri(?:es|ed)|steals?|hands? over|takes? possession|los(?:e|es|t) (?:the )?(?:job|position|title|custody)|becomes? (?:the|a)\b|status changes?|slams? .* into|throws? .* into|escorts? .* out|arrests?|files? (?:a )?(?:report|lawsuit|complaint))\b/i.test(anchor)
}

export function hasEchoManifestationAnchor(anchor: string): boolean {
  return /\b(?:post(?:s|ed)?|publish(?:es|ed)?|republish(?:es|ed)?|share(?:s|d)?|forward(?:s|ed)?|send(?:s|ing)?|sent|receiv(?:e|es|ed|ing)|messag(?:e|es|ed|ing)|text(?:s|ed)|email(?:s|ed)|call(?:s|ed)|notif(?:y|ies|ied)|alert(?:s|ed)|broadcast(?:s|ed)|circulat(?:e|es|ed)|appear(?:s|ed)|reappear(?:s|ed)|display(?:s|ed)|show(?:s|ed)|screenshot(?:s|ed)|captur(?:e|es|ed)|unfurl(?:s|ed)?|index(?:es|ed)|headline|upload(?:s|ed)|attach(?:es|ed)|report(?:s|ed))\b/i.test(anchor)
}

function candidateDedupeKey(type: StoryEventType, title: string, actors: string[]): string {
  return `${type}|${normalizeStoryName(title).replace(/[^\p{L}\p{N}]+/gu, ' ')}|${[...actors].sort().join(',')}`
}

export function proposeStoryEvents(
  original: StoryConstellationState,
  candidates: StoryEventCandidate[],
  source: StorySourceRef,
  options: { autoConfirmHighConfidence?: boolean; sourceText?: string } = {},
): { state: StoryConstellationState; proposalIds: string[]; rejected: number; reconciled: number; rejectionReasons: Record<string, number>; rejectionExamples: Array<{ reason: string; anchor: string }> } {
  const state = normalizeStoryConstellationState(original)
  const now = Date.now()
  const proposalIds: string[] = []
  let rejected = 0
  let reconciled = 0
  const rejectionReasons: Record<string, number> = {}
  const rejectionExamples: Array<{ reason: string; anchor: string }> = []
  let rejectedAnchor = ''
  const reject = (reason: string): void => {
    rejected += 1
    rejectionReasons[reason] = (rejectionReasons[reason] || 0) + 1
    if (rejectionExamples.length < 3) rejectionExamples.push({ reason, anchor: rejectedAnchor })
  }
  const existingDedupeKeys = new Set<string>()
  for (const event of Object.values(state.events)) existingDedupeKeys.add(candidateDedupeKey(event.eventType, event.title, event.participants.map(p => p.actorId)))
  for (const proposal of Object.values(state.proposals)) if (proposal.status === 'proposed') existingDedupeKeys.add(candidateDedupeKey(proposal.eventType, proposal.title, proposal.participants.map(p => p.actorId)))

  for (const raw of Array.isArray(candidates) ? candidates.slice(0, 8) : []) {
    const title = boundedText(raw?.title, 120)
    const summary = boundedText(raw?.summary, 520)
    const anchor = boundedText(raw?.anchor, 420)
    rejectedAnchor = anchor
    const type = EVENT_TYPES.has(raw?.eventType) ? raw.eventType : 'other'
    const importance = IMPORTANCES.has(raw?.importance) ? raw.importance : 'background'
    const confidence = boundedConfidence(raw?.confidence)
    const sourceText = normalizeStoryName(options.sourceText || source.excerpt)
    const namedDuplicate = raw.likelyDuplicateEventId && state.events[raw.likelyDuplicateEventId]?.canonState === 'confirmed' && state.events[raw.likelyDuplicateEventId]?.timelineId === state.activeTimelineId
      ? state.events[raw.likelyDuplicateEventId]
      : undefined
    const allowedSource = sourceText
    const proposedEchoes = (Array.isArray(raw.echoes) ? raw.echoes : []).slice(0, 8).flatMap(echo => {
      if (!ECHO_KINDS.has(echo?.kind)) return []
      const echoSummary = boundedText(echo.summary, 300)
      if (!echoSummary || !allowedSource.includes(normalizeStoryName(echoSummary))) return []
      return [{ kind: echo.kind, channel: boundedText(echo.channel, 60) || undefined, summary: echoSummary, confidence: boundedConfidence(echo.confidence) }]
    })
    const supportedEcho = Boolean(namedDuplicate && proposedEchoes.length && hasEchoManifestationAnchor(anchor))
    if (!title || !summary || !anchor) { reject('missing-fields'); continue }
    if (!sourceText.includes(normalizeStoryName(anchor))) { reject('anchor-not-in-source'); continue }
    if (confidence < 0.55) { reject('low-confidence'); continue }
    if (importance === 'background') { reject('background-importance'); continue }
    if (isPredictionOnly({ ...raw, title, summary, anchor, eventType: type, importance, confidence, participants: Array.isArray(raw?.participants) ? raw.participants : [] })) { reject('prediction-or-hypothetical'); continue }
    if (!hasConsequentialAnchor(anchor) && !supportedEcho) { reject('no-consequential-evidence'); continue }
    const participants: StoryParticipant[] = []
    for (const person of Array.isArray(raw.participants) ? raw.participants.slice(0, 8) : []) {
      const name = boundedText(person?.name, 80)
      if (!name || !allowedSource.includes(normalizeStoryName(name))) continue
      const actor = actorForName(state, name, now)
      if (!actor) continue
      addActorSource(actor, source, now)
      const roleCandidate = person.role
      const role: StoryParticipant['role'] = typeof roleCandidate === 'string' && ROLES.has(roleCandidate as StoryParticipant['role']) ? roleCandidate as StoryParticipant['role'] : 'participant'
      if (!participants.some(item => item.actorId === actor.actorId)) participants.push({ actorId: actor.actorId, role })
    }
    if (!participants.length && type === 'public') {
      const audience = actorForName(state, 'Public audience', now)
      if (audience) { addActorSource(audience, source, now); participants.push({ actorId: audience.actorId, role: 'witness' }) }
    }
    if (!participants.length) { reject('no-supported-participants'); continue }
    const dedupeKey = candidateDedupeKey(type, title, participants.map(p => p.actorId))
    const editedSourceEvent = Object.values(state.events).find(event => event.canonState === 'confirmed' && event.sourceRefs.some(ref => ref.chatId === source.chatId && ref.messageId === source.messageId && ref.swipeId === source.swipeId && ref.sourceState === 'edited'))
    const sameExistingStory = editedSourceEvent && candidateDedupeKey(editedSourceEvent.eventType, editedSourceEvent.title, editedSourceEvent.participants.map(p => p.actorId)) === dedupeKey
    const actorByName = new Map(Object.values(state.actors).map(actor => [normalizeStoryName(actor.displayName), actor.actorId]))
    const proposedKnowledge: StoryProposedKnowledge[] = []
    for (const item of Array.isArray(raw.proposedKnowledge) ? raw.proposedKnowledge.slice(0, 8) : []) {
      const actorId = actorByName.get(normalizeStoryName(boundedText(item.actorName, 80)))
      const sourceActorId = item.sourceActorName ? actorByName.get(normalizeStoryName(boundedText(item.sourceActorName, 80))) : undefined
      if (!actorId || !BELIEFS.has(item.beliefState) || !ACQUISITIONS.has(item.acquisitionMode)) continue
      if (!participants.some(participant => participant.actorId === actorId) && item.beliefState !== 'rumor') continue
      proposedKnowledge.push({ actorId, beliefState: item.beliefState, acquisitionMode: item.acquisitionMode, sourceActorId, confidence: boundedConfidence(item.confidence) })
    }
    if (sameExistingStory && editedSourceEvent) {
      if (!editedSourceEvent.sourceRefs.some(ref => ref.contentFingerprint === source.contentFingerprint && ref.messageId === source.messageId && ref.swipeId === source.swipeId)) editedSourceEvent.sourceRefs.push({ ...source, excerpt: anchor })
      editedSourceEvent.sourceState = 'active'
      editedSourceEvent.updatedAt = now
      if (editedSourceEvent.sourceWarning?.includes('source message changed')) editedSourceEvent.sourceWarning = undefined
      for (const echo of proposedEchoes) {
        const echoId = `echo-${storyFingerprint(`${editedSourceEvent.eventId}:${source.messageId}:${source.swipeId}:${echo.kind}:${echo.summary}`)}`
        if (!state.echoes[echoId]) state.echoes[echoId] = { echoId, eventId: editedSourceEvent.eventId, chatId: source.chatId, kind: echo.kind, channel: echo.channel, summary: echo.summary, sourceRef: { ...source, excerpt: anchor }, linkState: 'proposed', confidence: echo.confidence, createdAt: now, updatedAt: now }
        if (!editedSourceEvent.echoIds.includes(echoId)) editedSourceEvent.echoIds.push(echoId)
      }
      for (const item of proposedKnowledge) applyStoryKnowledge(state, { eventId: editedSourceEvent.eventId, actorId: item.actorId, beliefState: item.beliefState, acquisitionMode: item.acquisitionMode, sourceActorId: item.sourceActorId, sourceRef: { ...source, excerpt: anchor }, confidence: item.confidence, origin: 'sidecar', now })
      for (const entry of Object.values(state.phoneEntries)) if (entry.sourceRef.chatId === source.chatId && entry.sourceRef.messageId === source.messageId && entry.sourceRef.swipeId === source.swipeId) entry.eventId = editedSourceEvent.eventId
      reconciled += 1
      continue
    }
    const revisionTarget = editedSourceEvent
    const duplicateTarget = namedDuplicate || revisionTarget
    if (existingDedupeKeys.has(dedupeKey) && !duplicateTarget) { reject('duplicate-event'); continue }
    existingDedupeKeys.add(dedupeKey)
    const candidateKey = storyFingerprint(`${source.chatId}:${source.messageId}:${source.swipeId}:${source.contentFingerprint}:${dedupeKey}`)
    const proposalId = `proposal-${candidateKey}`
    if (state.proposals[proposalId]) { reject('already-proposed'); continue }
    const proposal: StoryEventProposal = {
      proposalId, candidateKey, chatId: source.chatId, title, summary, eventType: type, importance, confidence, anchor,
      storyTimeLabel: boundedText(raw.storyTimeLabel, 100), location: boundedText(raw.location, 120) || undefined,
      participants, proposedKnowledge, proposedEchoes, likelyDuplicateEventId: duplicateTarget?.eventId,
      proposalKind: revisionTarget ? 'revision' : namedDuplicate ? 'event-echo' : 'new-event',
      sourceRef: { ...source, excerpt: anchor }, status: 'proposed', createdAt: now, updatedAt: now,
    }
    state.proposals[proposalId] = proposal
    proposalIds.push(proposalId)
    if (options.autoConfirmHighConfidence && confidence >= 0.95 && !duplicateTarget) confirmStoryProposal(state, proposalId, now)
  }
  if (candidates.length) rememberProcessedStoryMessage(state, `${source.messageId}:${source.swipeId}`, Number.parseInt(source.contentFingerprint, 36))
  state.updatedAt = now
  return { state, proposalIds, rejected, reconciled, rejectionReasons, rejectionExamples }
}

export function confirmStoryProposal(state: StoryConstellationState, proposalId: string, now = Date.now()): StoryEventNode | null {
  const proposal = state.proposals[proposalId]
  if (!proposal || proposal.status !== 'proposed' || proposal.sourceRef.sourceState !== 'active') return null
  const eventId = `event-${storyFingerprint(proposal.candidateKey)}`
  const event: StoryEventNode = {
    eventId, chatId: proposal.chatId, timelineId: state.activeTimelineId || 'main', canonState: 'confirmed', sourceState: 'active', title: proposal.title,
    summary: proposal.summary, eventType: proposal.eventType, importance: proposal.importance, confidence: proposal.confidence,
    storyTimeLabel: proposal.storyTimeLabel, location: proposal.location, participants: proposal.participants,
    causeEventIds: [], consequenceEventIds: [], linkedAssetIds: [], echoIds: [], sourceRefs: [{ ...proposal.sourceRef }],
    createdAt: proposal.createdAt, updatedAt: now, confirmedAt: now,
  }
  state.events[eventId] = event
  proposal.status = 'accepted'; proposal.updatedAt = now
  for (const echo of proposal.proposedEchoes) {
    const echoId = `echo-${storyFingerprint(`${eventId}:${echo.kind}:${echo.summary}`)}`
    state.echoes[echoId] = { echoId, eventId, chatId: proposal.chatId, kind: echo.kind, channel: echo.channel, summary: echo.summary, sourceRef: { ...proposal.sourceRef }, linkState: 'proposed', confidence: echo.confidence, createdAt: now, updatedAt: now }
    event.echoIds.push(echoId)
  }
  for (const item of proposal.proposedKnowledge) applyStoryKnowledge(state, {
    eventId, actorId: item.actorId, beliefState: item.beliefState, acquisitionMode: item.acquisitionMode,
    sourceActorId: item.sourceActorId, sourceRef: proposal.sourceRef, confidence: item.confidence, origin: 'sidecar', now,
  })
  state.updatedAt = now
  return event
}

/** Explicitly attach a repeated source as an Event Echo to a confirmed event. */
export function confirmStoryEchoProposal(state: StoryConstellationState, proposalId: string, now = Date.now()): StoryEventNode | null {
  const proposal = state.proposals[proposalId]
  const event = proposal?.likelyDuplicateEventId ? state.events[proposal.likelyDuplicateEventId] : undefined
  if (!proposal || proposal.status !== 'proposed' || proposal.sourceRef.sourceState !== 'active' || !event || event.canonState !== 'confirmed' || event.timelineId !== state.activeTimelineId) return null
  if (!event.sourceRefs.some(ref => ref.contentFingerprint === proposal.sourceRef.contentFingerprint && ref.messageId === proposal.sourceRef.messageId && ref.swipeId === proposal.sourceRef.swipeId)) {
    event.sourceRefs.push({ ...proposal.sourceRef })
  }
  event.sourceState = 'active'
  event.updatedAt = now
  const confirmedEchoIds: string[] = []
  for (const echo of proposal.proposedEchoes) {
    const echoId = `echo-${storyFingerprint(`${event.eventId}:${proposal.sourceRef.messageId}:${proposal.sourceRef.swipeId}:${echo.kind}:${echo.summary}`)}`
    if (!state.echoes[echoId]) state.echoes[echoId] = {
      echoId, eventId: event.eventId, chatId: proposal.chatId, kind: echo.kind, channel: echo.channel,
      summary: echo.summary, sourceRef: { ...proposal.sourceRef }, linkState: 'confirmed', confidence: echo.confidence,
      createdAt: now, updatedAt: now,
    }
    if (!event.echoIds.includes(echoId)) event.echoIds.push(echoId)
    confirmedEchoIds.push(echoId)
  }
  if (!confirmedEchoIds.length) {
    const echoId = `echo-${storyFingerprint(`${event.eventId}:${proposal.sourceRef.messageId}:${proposal.sourceRef.swipeId}:scene-reference:${proposal.summary}`)}`
    if (!state.echoes[echoId]) state.echoes[echoId] = {
      echoId, eventId: event.eventId, chatId: proposal.chatId, kind: 'scene-reference', channel: 'Repeated story source',
      summary: proposal.summary, sourceRef: { ...proposal.sourceRef }, linkState: 'confirmed', confidence: proposal.confidence,
      createdAt: now, updatedAt: now,
    }
    if (!event.echoIds.includes(echoId)) event.echoIds.push(echoId)
    confirmedEchoIds.push(echoId)
  }
  for (const item of proposal.proposedKnowledge) applyStoryKnowledge(state, {
    eventId: event.eventId, actorId: item.actorId, beliefState: item.beliefState, acquisitionMode: item.acquisitionMode,
    sourceActorId: item.sourceActorId, sourceEchoId: confirmedEchoIds[0], sourceRef: proposal.sourceRef, confidence: item.confidence, origin: 'sidecar', now,
  })
  for (const entry of Object.values(state.phoneEntries)) {
    if (entry.sourceRef.chatId === proposal.sourceRef.chatId && entry.sourceRef.messageId === proposal.sourceRef.messageId && entry.sourceRef.swipeId === proposal.sourceRef.swipeId) entry.eventId = event.eventId
  }
  proposal.status = 'accepted'
  proposal.updatedAt = now
  state.updatedAt = now
  return event
}

export function applyStoryKnowledge(state: StoryConstellationState, input: {
  eventId: string; actorId: string; beliefState: StoryBeliefState; acquisitionMode: StoryAcquisitionMode;
  sourceActorId?: string; sourceEchoId?: string; sourceRef: StorySourceRef; confidence?: number; origin?: StoryKnowledgeTransition['origin']; now?: number
}): { edge: StoryKnowledgeEdge | null; conflict?: StoryKnowledgeConflict } {
  const event = state.events[input.eventId]
  if (!event || event.canonState !== 'confirmed' || !BELIEFS.has(input.beliefState) || !ACQUISITIONS.has(input.acquisitionMode)) return { edge: null }
  const now = input.now || Date.now()
  const edgeId = `${input.eventId}:${input.actorId}`
  const existing = state.knowledgeEdges[edgeId]
  if (input.origin !== 'manual' && existing?.beliefState === 'unaware' && ['knows', 'suspects', 'rumor'].includes(input.beliefState)) {
    const conflictId = `conflict-${storyFingerprint(`${edgeId}:${input.sourceRef.contentFingerprint}`)}`
    const conflict: StoryKnowledgeConflict = {
      conflictId, eventId: input.eventId, actorId: input.actorId, kind: 'explicit-unaware-contradiction', severity: 'hard',
      summary: `${state.actors[input.actorId]?.displayName || 'This character'} has an explicit unaware state but the new source implies ${input.beliefState}.`,
      sourceRef: { ...input.sourceRef }, status: 'open', createdAt: now, updatedAt: now,
    }
    state.conflicts[conflictId] = conflict
    return { edge: existing, conflict }
  }
  if (input.origin !== 'manual' && existing?.beliefState === 'unknown' && ['knows', 'suspects', 'rumor'].includes(input.beliefState)) {
    const conflictId = `conflict-${storyFingerprint(`${edgeId}:${input.sourceRef.contentFingerprint}`)}`
    const conflict: StoryKnowledgeConflict = {
      conflictId, eventId: input.eventId, actorId: input.actorId, kind: 'unexplained-knowledge-path', severity: 'soft',
      summary: `${state.actors[input.actorId]?.displayName || 'This character'} now references this event; the acquisition path is not recorded.`,
      sourceRef: { ...input.sourceRef }, status: 'open', createdAt: now, updatedAt: now,
    }
    state.conflicts[conflictId] = conflict
    return { edge: existing, conflict }
  }
  const next: StoryKnowledgeEdge = existing || {
    edgeId, eventId: input.eventId, actorId: input.actorId, beliefState: input.beliefState, acquisitionMode: input.acquisitionMode,
    sourceActorId: input.sourceActorId, explicit: input.origin === 'manual', sourceRefs: [], history: [], createdAt: now, updatedAt: now,
  }
  if (existing && existing.beliefState !== input.beliefState) next.history.push({
    from: existing.beliefState, to: input.beliefState, acquisitionMode: input.acquisitionMode, sourceRef: { ...input.sourceRef },
    sourceEchoId: input.sourceEchoId, sourceActorId: input.sourceActorId, confidence: Math.max(0, Math.min(1, Number(input.confidence) || 0)), changedAt: now, origin: input.origin || 'sidecar',
  })
  next.beliefState = input.beliefState; next.acquisitionMode = input.acquisitionMode; next.sourceActorId = input.sourceActorId; next.sourceEchoId = input.sourceEchoId
  next.explicit ||= input.origin === 'manual'
  if (!next.sourceRefs.some(ref => ref.contentFingerprint === input.sourceRef.contentFingerprint && ref.messageId === input.sourceRef.messageId && ref.swipeId === input.sourceRef.swipeId)) next.sourceRefs.push({ ...input.sourceRef })
  next.updatedAt = now
  state.knowledgeEdges[edgeId] = next
  return { edge: next }
}

/** Resolve a knowledge warning only after its chosen provenance is valid. */
export function resolveStoryKnowledgeConflict(
  state: StoryConstellationState,
  conflictId: string,
  resolution: NonNullable<StoryKnowledgeConflict['resolution']>,
  echoId?: string,
  now = Date.now(),
): boolean {
  const conflict = state.conflicts[conflictId]
  const event = conflict ? state.events[conflict.eventId] : undefined
  if (!conflict || conflict.status !== 'open' || !event || event.canonState !== 'confirmed') return false

  let sourceRef = { ...conflict.sourceRef }
  let sourceEchoId: string | undefined
  let acquisitionMode: StoryAcquisitionMode = 'manual'
  if (resolution === 'linked-existing-echo') {
    const echo = echoId ? state.echoes[echoId] : undefined
    if (!echo || echo.eventId !== event.eventId || echo.linkState !== 'confirmed' || echo.sourceRef.sourceState !== 'active') return false
    sourceRef = { ...echo.sourceRef }
    sourceEchoId = echo.echoId
    acquisitionMode = ['news', 'twitter', 'instagram'].includes(echo.kind) ? 'public-broadcast'
      : echo.kind === 'phone-photo' ? 'evidence'
        : ['phone-message', 'phone-notification', 'phone-call', 'kakao', 'discord', 'email'].includes(echo.kind) ? 'told' : 'manual'
  } else if (resolution === 'learned-offscreen') {
    const offscreenEchoId = `echo-${storyFingerprint(`${event.eventId}:offscreen:${conflict.conflictId}`)}`
    if (!state.echoes[offscreenEchoId]) state.echoes[offscreenEchoId] = {
      echoId: offscreenEchoId, eventId: event.eventId, chatId: conflict.sourceRef.chatId,
      kind: 'scene-reference', channel: 'Off-screen learning', summary: 'User-confirmed off-screen knowledge acquisition.',
      sourceRef: { ...conflict.sourceRef }, linkState: 'confirmed', confidence: 1, createdAt: now, updatedAt: now,
    }
    if (!event.echoIds.includes(offscreenEchoId)) event.echoIds.push(offscreenEchoId)
    sourceEchoId = offscreenEchoId
  } else if (resolution === 'manual') {
    sourceRef = createStorySourceRef({ chatId: conflict.sourceRef.chatId, messageId: `manual-conflict-${conflict.conflictId}`, swipeId: 0, role: 'system', content: `${event.eventId}:${conflict.actorId}:knows`, excerpt: 'Knowledge state explicitly resolved by the user.', sourceKind: 'manual', createdAt: now })
  }

  if (resolution === 'learned-offscreen' || resolution === 'linked-existing-echo' || resolution === 'manual') {
    applyStoryKnowledge(state, {
      eventId: event.eventId, actorId: conflict.actorId, beliefState: 'knows', acquisitionMode, sourceEchoId,
      sourceRef, origin: 'manual', now,
    })
  }
  conflict.status = 'resolved'
  conflict.resolution = resolution
  conflict.updatedAt = now
  state.updatedAt = now
  return true
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

export function storyReelItems(state: StoryConstellationState): Array<StoryEventNode & { pinned: boolean; hidden: boolean; caption: string; chapterLabel?: string }> {
  return activeStoryEvents(state).flatMap(event => {
    const override = state.reelOverrides[event.eventId]
    if (override?.hidden) return []
    return [{ ...event, pinned: override?.pinned === true, hidden: false, caption: override?.captionOverride || event.summary, chapterLabel: override?.chapterLabelOverride }]
  }).sort((a, b) => Number(b.pinned) - Number(a.pinned) || a.createdAt - b.createdAt)
}

export function updateStoryReelOverride(state: StoryConstellationState, eventId: string, patch: Partial<Omit<StoryReelOverride, 'eventId' | 'updatedAt'>>, now = Date.now()): boolean {
  if (!state.events[eventId] || state.events[eventId].canonState !== 'confirmed') return false
  const next: StoryReelOverride = { ...(state.reelOverrides[eventId] || {}), eventId, updatedAt: now }
  for (const [key, value] of Object.entries(patch)) if (value !== undefined) (next as any)[key] = value
  state.reelOverrides[eventId] = next
  state.updatedAt = now
  return true
}

export function visibleStoryPhoneEntries(state: StoryConstellationState): StoryPhoneEntry[] {
  const activeEventIds = new Set(activeStoryEvents(state).map(event => event.eventId))
  return Object.values(state.phoneEntries).filter(entry => entry.sourceRef.sourceState === 'active' && (!entry.eventId || activeEventIds.has(entry.eventId))).sort((a, b) => a.createdAt - b.createdAt)
}
