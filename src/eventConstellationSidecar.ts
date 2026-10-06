import { type StoryEventCandidate, type StoryEchoKind, type StoryEventType, type StoryImportance, type StoryBeliefState, type StoryAcquisitionMode } from './storyState'
import { bracketImageControls } from './imageControlMarkup'

export type EventSidecarResult = { events: StoryEventCandidate[]; rawCandidates: number; rejectedCandidates: number }
export type KnownConfirmedStoryEvent = {
  id: string
  title: string
  summary: string
  eventType: StoryEventType
  importance: StoryImportance
  participants: Array<{ name: string }>
}

const EVENT_TYPES = new Set<StoryEventType>(['social', 'relationship', 'public', 'conflict', 'discovery', 'milestone', 'location', 'media', 'injury', 'possession', 'promise', 'status-change', 'other'])
const IMPORTANCE = new Set<StoryImportance>(['background', 'notable', 'major', 'arc-defining'])
const BELIEFS = new Set<StoryBeliefState>(['knows', 'suspects', 'rumor', 'misinformed', 'unaware', 'unknown'])
const ACQUISITION = new Set<StoryAcquisitionMode>(['involved', 'witnessed', 'told', 'evidence', 'inferred', 'public-broadcast', 'manual'])
const ECHO_KINDS = new Set<StoryEchoKind>(['phone-message', 'phone-notification', 'phone-call', 'phone-photo', 'kakao', 'instagram', 'twitter', 'news', 'discord', 'email', 'voice-memo', 'surface', 'scene-reference', 'manual', 'other'])
const ROLES = new Set(['subject', 'participant', 'witness', 'instigator', 'affected', 'source', 'recipient', 'other'])

function asRecord(value: unknown): Record<string, any> { return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, any> : {} }
function clean(value: unknown, max: number): string { return typeof value === 'string' ? value.trim().slice(0, max) : '' }
function confidence(value: unknown): number { const number = Number(value); return Number.isFinite(number) ? Math.max(0, Math.min(1, number)) : 0 }

function parseJsonObject(raw: string): Record<string, any> {
  const text = String(raw || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start < 0 || end < start) throw new Error('Event Sidecar returned no JSON object.')
  try {
    const parsed = JSON.parse(text.slice(start, end + 1))
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error()
    return parsed as Record<string, any>
  } catch {
    throw new Error('Event Sidecar returned invalid JSON.')
  }
}

export function normalizeEventSidecarOutput(raw: string): EventSidecarResult {
  const parsed = parseJsonObject(raw)
  if (!Array.isArray(parsed.events)) throw new Error('Event Sidecar result must contain an events array.')
  const events: StoryEventCandidate[] = []
  let rejectedCandidates = Math.max(0, parsed.events.length - 8)
  for (const candidate of parsed.events.slice(0, 8)) {
    const row = asRecord(candidate)
    const title = clean(row.title, 120)
    const summary = clean(row.summary, 520)
    const anchor = clean(row.anchor, 420)
    const type = EVENT_TYPES.has(row.eventType) ? row.eventType : 'other'
    const importance = IMPORTANCE.has(row.importance) ? row.importance : 'background'
    const participants = (Array.isArray(row.participants) ? row.participants : []).slice(0, 8).flatMap((participant: unknown) => {
      const person = asRecord(participant)
      const name = clean(person.name, 80)
      if (!name) return []
      return [{ name, role: ROLES.has(person.role) ? person.role : 'participant' as const }]
    })
    const proposedKnowledge = (Array.isArray(row.knowledge) ? row.knowledge : []).slice(0, 8).flatMap((item: unknown) => {
      const value = asRecord(item)
      const actorName = clean(value.actor, 80)
      if (!actorName || !BELIEFS.has(value.beliefState) || !ACQUISITION.has(value.acquisitionMode)) return []
      return [{ actorName, beliefState: value.beliefState as StoryBeliefState, acquisitionMode: value.acquisitionMode as StoryAcquisitionMode, sourceActorName: clean(value.sourceActor, 80) || undefined, confidence: confidence(value.confidence) }]
    })
    const echoes = (Array.isArray(row.echoes) ? row.echoes : []).slice(0, 8).flatMap((item: unknown) => {
      const value = asRecord(item)
      if (!ECHO_KINDS.has(value.kind)) return []
      const echoSummary = clean(value.summary, 300)
      if (!echoSummary) return []
      return [{ kind: value.kind as StoryEchoKind, channel: clean(value.channel, 60) || undefined, summary: echoSummary, confidence: confidence(value.confidence) }]
    })
    if (!title || !summary || !anchor) { rejectedCandidates += 1; continue }
    events.push({
      title, summary, anchor, eventType: type, importance, confidence: confidence(row.confidence),
      storyTimeLabel: clean(row.storyTimeLabel, 100), location: clean(row.location, 120) || undefined,
      participants, proposedKnowledge, echoes, likelyDuplicateEventId: clean(row.likelyDuplicateEventId, 100) || undefined,
    })
  }
  return { events, rawCandidates: parsed.events.length, rejectedCandidates }
}

/** Remove presentation/runtime artifacts before Sidecar analysis. The underlying message is not modified. */
export function prepareStoryAnalysisText(input: string): string {
  let text = String(input || '')
  // Both accepted authoring formats are presentation, never canon evidence.
  // Remove the opaque payload, not just its delimiters. An unfinished request
  // owns the remaining tail too; speculative image facts must stay excluded.
  for (const control of bracketImageControls(text).reverse()) {
    text = text.slice(0, control.index) + ' ' + text.slice(control.index + control.fullMatch.length)
  }
  text = text
    .replace(/\[Plot_Sparks\][\s\S]*?\[\/Plot_Sparks\]/gi, ' ')
    .replace(/\[WHATIF\|[\s\S]*?\[\/WHATIF\]/gi, ' ')
    .replace(/\[OOC\][\s\S]*?\[\/OOC\]/gi, ' ')
    .replace(/\[(?:relay[-_ ]diagnostic|reverie[-_ ]relay[-_ ]diagnostic)[^\]]*\][\s\S]*?(?=\n\s*\n|$)/gi, ' ')
  // Plain OOC setup is control text even when it uses a space rather than a
  // colon, and even when it describes completed facts for a future retelling.
  // Remove only its leading paragraph; separately authored canon prose after
  // a blank line must remain available as evidence.
  text = text.replace(/^\s*(?:\(?ooc\)?|out of character)(?=\s|[:\]\-])[^\n]*(?:\n(?![ \t]*\n)[^\n]*)*(?=\n[ \t]*\n|$)/i, ' ')
  // Runtime illustration/image markup is not story evidence. Strip complete
  // blocks first; then remove residual HTML/SVG while retaining its text.
  text = text.replace(/<(?:reverie-illustration|image_request|image_request_error|rrl-card|svg|script|style)\b[^>]*>[\s\S]*?<\/(?:reverie-illustration|image_request|image_request_error|rrl-card|svg|script|style)\s*>/gi, ' ')
  text = text.replace(/<[^>]{1,1000}>/g, ' ')
  text = text.replace(/&(?:nbsp|quot|apos|lt|gt|amp);/gi, entity => ({ '&nbsp;': ' ', '&quot;': '"', '&apos;': "'", '&lt;': '<', '&gt;': '>', '&amp;': '&' }[entity.toLowerCase()] || ' '))
  text = text.replace(/\[(?:\/)?(?:reverie[_-][\w-]+|rrl[_-][\w-]+)[^\]]*\]/gi, ' ')
  return text.replace(/[\t\r ]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim().slice(0, 12_000)
}

export function shouldAnalyzeStoryText(input: string): boolean {
  const text = prepareStoryAnalysisText(input)
  if (text.length < 12) return false
  return true
}

/**
 * Conservatively recover an obvious repeated-event manifestation when the
 * configured Sidecar returns no Echo candidate. This remains proposal-only:
 * it requires a confirmed target, multiple named actors when available, an
 * event-specific term, explicit repetition language, and an actual media or
 * communication action in the current source.
 */
export function inferGroundedEventEchoCandidates(input: string, knownEvents: KnownConfirmedStoryEvent[]): StoryEventCandidate[] {
  const source = prepareStoryAnalysisText(input)
  if (!source || !Array.isArray(knownEvents) || !knownEvents.length) return []
  const words = (value: string): string[] => (value.toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu) || [])
    .map(word => word.length > 4 && word.endsWith('s') ? word.slice(0, -1) : word)
  const sourceWords = new Set(words(source))
  const stopWords = new Set(['about', 'after', 'again', 'also', 'been', 'being', 'from', 'have', 'into', 'just', 'more', 'other', 'same', 'that', 'their', 'them', 'there', 'these', 'they', 'this', 'those', 'through', 'under', 'were', 'when', 'where', 'which', 'while', 'with', 'would', 'your', 'event', 'story', 'publicly', 'published'])
  const repeatedPattern = /\b(?:same|identical|earlier|previous(?:ly)?|already|again|re-?shared|re-?posted|still)\b/i
  const mediaPattern = /\b(?:photo(?:graph)?s?|pictures?|images?|video(?:s)?|article|headline|post|report|screenshot|link|recording)\b/i
  const actionPattern = /\b(?:forward(?:s|ed|ing)?|send(?:s|ing)?|sent|share(?:s|d|ing)?|message(?:s|d|ing)?|notif(?:y|ies|ied|ication)|alert(?:s|ed)?|broadcast(?:s|ed)?|circulat(?:e|es|ed|ing)|publish(?:es|ed|ing)?|post(?:s|ed|ing)?|appear(?:s|ed|ing)?|display(?:s|ed|ing)?|show(?:s|ed|ing)?|unfurl(?:s|ed|ing)?|index(?:es|ed|ing)?|upload(?:s|ed|ing)?|attach(?:es|ed|ing)?|report(?:s|ed|ing)?)\b/i
  const result: StoryEventCandidate[] = []

  for (const event of knownEvents.slice(-12)) {
    if (!event.id || !event.title || !event.summary || !Array.isArray(event.participants)) continue
    const mentionedParticipants = event.participants
      .map(participant => String(participant?.name || '').trim())
      .filter((name, index, all) => name && all.indexOf(name) === index && new RegExp(`(^|[^\\p{L}\\p{N}])${name.split(/\s+/).map(piece => piece.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('\\s+')}(?=$|[^\\p{L}\\p{N}])`, 'iu').test(source))
    const requiredNames = Math.min(2, event.participants.length)
    if (mentionedParticipants.length < requiredNames) continue

    const eventTerms = [...new Set(words(`${event.title} ${event.summary}`))]
      .filter(word => word.length >= 4 && !stopWords.has(word) && !words(event.participants.map(participant => participant.name).join(' ')).includes(word))
    const matchingTerms = eventTerms.filter(word => sourceWords.has(word))
    if (!matchingTerms.length) continue

    const sentences = source.split(/(?<=[.!?])\s+/).map(sentence => sentence.trim()).filter(Boolean)
    const evidence = sentences.map(sentence => ({
      sentence,
      repeated: repeatedPattern.exec(sentence),
      media: mediaPattern.exec(sentence),
      action: actionPattern.exec(sentence),
      eventTerm: matchingTerms.find(term => new Set(words(sentence)).has(term)),
      actorCount: mentionedParticipants.filter(name => new RegExp(`(^|[^\\p{L}\\p{N}])${name.split(/\s+/).map(piece => piece.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('\\s+')}(?=$|[^\\p{L}\\p{N}])`, 'iu').test(sentence)).length,
    })).filter(row => row.repeated && row.media && row.action && row.eventTerm && row.actorCount >= requiredNames)
      .sort((left, right) => right.sentence.length - left.sentence.length)
    const match = evidence[0]
    if (!match) continue

    const actionIndex = match.action!.index || 0
    const mediaIndex = match.media!.index || 0
    const repeatedIndex = match.repeated!.index || 0
    const eventIndex = match.sentence.toLocaleLowerCase().indexOf(match.eventTerm!)
    const start = Math.max(0, Math.min(actionIndex, mediaIndex, repeatedIndex, eventIndex) - 32)
    const end = Math.min(match.sentence.length, Math.max(actionIndex + match.action![0].length, mediaIndex + match.media![0].length, repeatedIndex + match.repeated![0].length, eventIndex + match.eventTerm!.length) + 72)
    const anchor = match.sentence.slice(start, end).slice(0, 420).trim()
    if (!anchor || !actionPattern.test(anchor)) continue

    const channel = /\bkakao\b/i.test(match.sentence) ? 'Kakao'
      : /\b(?:instagram|insta)\b/i.test(match.sentence) ? 'Instagram'
        : /\btwitter\b|\bx\s+post\b/i.test(match.sentence) ? 'X/Twitter'
          : /\b(?:discord)\b/i.test(match.sentence) ? 'Discord'
            : /\b(?:email|e-mail)\b/i.test(match.sentence) ? 'Email'
              : /\b(?:news|article|headline|press|report)\b/i.test(match.sentence) ? 'News'
                : /\b(?:phone|text|message|sms|notification|alert)\b/i.test(match.sentence) ? 'Phone message' : 'Story source'
    const kind: StoryEchoKind = channel === 'Kakao' ? 'kakao'
      : channel === 'Instagram' ? 'instagram'
        : channel === 'X/Twitter' ? 'twitter'
          : channel === 'Discord' ? 'discord'
            : channel === 'Email' ? 'email'
              : channel === 'News' ? 'news'
                : channel === 'Phone message' ? 'phone-message' : 'scene-reference'
    const echoSummary = match.sentence.slice(0, 300).trim()
    const titlePrefix = `${channel} Echo: `
    result.push({
      title: `${titlePrefix}${event.title}`.slice(0, 120),
      summary: `${channel} source repeats a known manifestation of “${event.title}”: ${echoSummary}`.slice(0, 520),
      eventType: event.eventType,
      importance: event.importance === 'background' ? 'notable' : event.importance,
      confidence: 0.72,
      anchor,
      storyTimeLabel: '',
      participants: mentionedParticipants.map(name => ({ name, role: 'participant' })),
      proposedKnowledge: [],
      echoes: [{ kind, channel: channel === 'Story source' ? undefined : channel, summary: echoSummary, confidence: 0.72 }],
      likelyDuplicateEventId: event.id,
    })
  }
  // More than one matching confirmed Event makes the reference ambiguous;
  // let the model or a human resolve it instead of guessing.
  return result.length === 1 ? result : []
}

/** Keep model-authored candidates, and add one narrow grounded Echo only when
 * the model did not already identify a valid confirmed-event Echo. */
export function completeEventSidecarCandidates(
  normalized: EventSidecarResult,
  input: string,
  knownEvents: KnownConfirmedStoryEvent[],
  validatedModelEcho: boolean,
): { events: StoryEventCandidate[]; fallbackEchoes: number } {
  // The backend supplies this only after running model candidates through
  // proposeStoryEvents. Shape is not success: the Sidecar can return an Echo
  // that the proposal validator later rejects (for example, background).
  const fallback = validatedModelEcho ? [] : inferGroundedEventEchoCandidates(input, knownEvents)
  return { events: [...normalized.events, ...fallback], fallbackEchoes: fallback.length }
}
