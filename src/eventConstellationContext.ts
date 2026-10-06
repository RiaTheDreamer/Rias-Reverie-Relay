import { activeStoryEvents, visibleStoryPhoneEntries, type StoryConstellationState } from './storyState'

/** Build a compact, character-scoped knowledge reminder. Truth without a recorded knowledge path is intentionally omitted. */
export function buildEventKnowledgeContext(state: StoryConstellationState, maxCharacters = 1200): string {
  // Deleted/edited sources remain reviewable canon in the UI/Reel, but no longer
  // count as current prompt evidence until the source is reconciled.
  const activeEvents = new Map(activeStoryEvents(state).filter(event => event.sourceState === 'active').map(event => [event.eventId, event]))
  const rows = Object.values(state.knowledgeEdges)
    .filter(edge => activeEvents.has(edge.eventId) && ['knows', 'suspects', 'rumor', 'misinformed'].includes(edge.beliefState))
    .sort((a, b) => a.updatedAt - b.updatedAt)
    .slice(-12)
    .map(edge => {
      const event = activeEvents.get(edge.eventId)!
      const actor = state.actors[edge.actorId]?.displayName || 'Unresolved character'
      const certainty = edge.beliefState === 'knows' ? 'knows' : edge.beliefState === 'suspects' ? 'suspects' : edge.beliefState === 'rumor' ? 'has heard a rumor that' : 'believes incorrectly that'
      const route = edge.acquisitionMode === 'involved' ? 'as a participant' : edge.acquisitionMode === 'witnessed' ? 'as a witness' : edge.acquisitionMode === 'told' ? 'after being told' : edge.acquisitionMode === 'evidence' ? 'from evidence' : edge.acquisitionMode === 'public-broadcast' ? 'from a public report' : edge.acquisitionMode === 'inferred' ? 'by inference' : 'from a recorded source'
      return `- ${actor} ${certainty} ${event.summary} (${route}).`
    })
  if (!rows.length) return ''
  return `STORY KNOWLEDGE BOUNDARIES\nTreat these as character-specific, not universal knowledge. No listed fact means unknown, not unaware. Do not transfer facts between characters without an explicit story path.\n${rows.join('\n')}`.slice(0, Math.max(200, maxCharacters))
}

/** Phone history is opt-in through the Character Phone Narrative Utility and deliberately bounded. */
export function buildLivingPhoneContext(state: StoryConstellationState, maxCharacters = 1400): string {
  const rows = visibleStoryPhoneEntries(state).slice(-10)
  if (!rows.length) return ''
  const lines = rows.map(entry => `- ${entry.ownerName} · ${entry.app}${entry.storyTimeLabel ? ` · ${entry.storyTimeLabel}` : ''}: ${entry.title}${entry.body ? ` — ${entry.body}` : ''}`)
  return `CHARACTER PHONE MEMORY (story-authored records only; preserve the owner's point of view)\n${lines.join('\n')}`.slice(0, Math.max(200, maxCharacters))
}

export function buildOptionalStoryPromptContext(
  state: StoryConstellationState,
  options: { featureEnabled: boolean; injectEventKnowledge: boolean; characterPhoneRequested: boolean },
): { eventKnowledgeContext: string; phoneMemoryContext: string } {
  if (!options.featureEnabled) return { eventKnowledgeContext: '', phoneMemoryContext: '' }
  return {
    eventKnowledgeContext: options.injectEventKnowledge ? buildEventKnowledgeContext(state) : '',
    phoneMemoryContext: options.characterPhoneRequested ? buildLivingPhoneContext(state) : '',
  }
}
