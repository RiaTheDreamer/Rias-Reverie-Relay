import type { CustomSurfaceDefinition } from './contracts'

// Presentation-only groups. Persisted promptCategory, enabled state, contract
// IDs and renderer ownership deliberately do not change with this navigation.
export const APP_SURFACE_GROUPS = [
  { id: 'social', label: 'Social', ids: ['discord-dm', 'discord-server', 'forum-thread', 'instagram', 'instagram-profile', 'instagram-stories', 'tiktok-post', 'dating-profile', 'livestream', 'twitter', 'twitter-profile'] },
  { id: 'messaging', label: 'Messaging & Communication', ids: ['email-thread', 'imessage-chat', 'inline-chat', 'instagram-dm', 'kakao', 'smartphone', 'voice-memo', 'workspace-chat', 'x-dm'] },
  { id: 'media', label: 'Media', ids: ['album-cover', 'music-player', 'magazine-cover', 'youtube-thumbnail', 'google-images', 'phone-gallery', 'location-share'] },
  { id: 'shopping', label: 'Shopping', ids: ['amazon', 'market-listing', 'property-listing'] },
  { id: 'evidence', label: 'Evidence', ids: ['case-file', 'cctv-evidence', 'court-transcript', 'evidence-photo', 'medical-record'] },
  { id: 'keepsakes', label: 'Photography & Keepsakes', ids: ['photo-booth-strip', 'polaroid', 'letter-dispatch', 'diary-app', 'notes-app'] },
  { id: 'misc', label: 'Misc', ids: ['newspaper', 'naver-article', 'public-bulletin', 'codex-entry', 'mission-board'] },
] as const

export const NARRATIVE_OWNED_SURFACE_IDS = new Set(['relationship-map', 'character-profile', 'building-layout'])

export function appSurfaceGroups(definitions: CustomSurfaceDefinition[]): Array<{ id: string; label: string; definitions: CustomSurfaceDefinition[] }> {
  const available = definitions.filter(definition => definition.baseSurfaceId !== 'prose-illustration' && !NARRATIVE_OWNED_SURFACE_IDS.has(definition.baseSurfaceId))
  const assigned = new Set<string>()
  const groups = APP_SURFACE_GROUPS.map(group => {
    const rows = group.ids.flatMap(id => available.filter(definition => definition.baseSurfaceId === id))
    rows.forEach(definition => assigned.add(definition.surfaceId))
    return { id: group.id as string, label: group.label as string, definitions: rows }
  })
  const custom = available.filter(definition => !assigned.has(definition.surfaceId))
  if (custom.length) groups.push({ id: 'custom', label: 'Custom Surfaces', definitions: custom })
  return groups.filter(group => group.definitions.length > 0)
}

export function surfaceLibraryName(definition: Pick<CustomSurfaceDefinition, 'baseSurfaceId' | 'displayName'>): string {
  // Migrate only the shipped former label. Never replace a user's custom name.
  return definition.baseSurfaceId === 'codex-entry' && definition.displayName === 'Reference Article'
    ? 'Wikipedia' : definition.displayName
}
