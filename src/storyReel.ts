import { activeStoryEvents, type StoryConstellationState, type StoryEventNode } from './storyState'

export type StoryReelCard = {
  eventId: string
  title: string
  caption: string
  chapterLabel?: string
  storyTimeLabel: string
  location?: string
  participantNames: string[]
  heroAssetId?: string
  echoIds: string[]
  pinned: boolean
  sourceWarning?: string
  sourceOrder: number
}

/** Reel cards are a projection over confirmed events; only presentation choices are persisted. */
export function projectStoryReel(state: StoryConstellationState, sourceOrder: Record<string, number> = {}): StoryReelCard[] {
  return activeStoryEvents(state).flatMap((event: StoryEventNode) => {
    const override = state.reelOverrides[event.eventId]
    if (override?.hidden) return []
    return [{
      eventId: event.eventId,
      title: event.title,
      caption: override?.captionOverride || event.summary,
      chapterLabel: override?.chapterLabelOverride,
      storyTimeLabel: event.storyTimeLabel,
      location: event.location,
      participantNames: event.participants.map(participant => state.actors[participant.actorId]?.displayName || 'Unresolved character'),
      heroAssetId: override?.preferredHeroAssetId || event.linkedAssetIds[0],
      echoIds: [...event.echoIds],
      pinned: override?.pinned === true,
      sourceWarning: event.sourceWarning,
      sourceOrder: sourceOrder[event.eventId] ?? event.createdAt,
    }]
  }).sort((a, b) => Number(b.pinned) - Number(a.pinned) || a.sourceOrder - b.sourceOrder)
}
