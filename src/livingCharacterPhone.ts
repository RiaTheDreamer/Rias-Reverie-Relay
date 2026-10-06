import { ensureStoryActor, storyFingerprint, storyActorId, type StoryConstellationState, type StoryPhoneEntry, type StorySourceRef } from './storyState'
import type { VisualAssetReference } from './contracts'
import { bracketImageControls } from './imageControlMarkup'
import { xmlNarrativeAsLegacy } from './xmlSurfaceFormat'

function tagValue(block: string, tag: string): string {
  const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = block.match(new RegExp(`\\[${escaped}\\]([\\s\\S]*?)\\[\\/${escaped}\\]`, 'i'))
  return String(match?.[1] || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

function rawTagValue(block: string, tag: string): string {
  const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = block.match(new RegExp(`\\[${escaped}\\]([\\s\\S]*?)\\[\\/${escaped}\\]`, 'i'))
  return String(match?.[1] || '')
}

function blocks(value: string, tag: string): string[] {
  const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const expression = new RegExp(`\\[${escaped}\\]([\\s\\S]*?)\\[\\/${escaped}\\]`, 'gi')
  return [...value.matchAll(expression)].map(match => String(match[1] || ''))
}

function assetReference(value: string): { assetId?: string; imageId?: string; requestId?: string } {
  const asset = value.match(/\basset(?:_id|Id)\s*[:=]\s*["']?([a-z0-9_-]{4,100})/i)?.[1]
  const image = value.match(/\bimage(?:_id|Id)\s*[:=]\s*["']?([a-z0-9_-]{4,100})/i)?.[1]
  const bracket = bracketImageControls(value).find(control => control.root === 'image_request' && control.complete && !control.diagnostics.length)
  const request = bracket?.fields.id || bracket?.fields.request_id || value.match(/<image_request\b[^>]*\bid\s*=\s*["']([^"']{1,100})["']/i)?.[1]
  return { assetId: asset, imageId: image, requestId: request }
}

function addEntry(entries: StoryPhoneEntry[], input: Omit<StoryPhoneEntry, 'entryId' | 'createdAt' | 'updatedAt'>, now: number): void {
  const body = input.body.trim().slice(0, 1200)
  const title = input.title.trim().slice(0, 180)
  if (!title && !body) return
  // Row identity is anchored to its authored location/role, not its mutable
  // body. Editing a chat message then updates the existing text row in place.
  const key = [input.sourceRef.chatId, input.sourceRef.messageId, input.sourceRef.swipeId, input.ownerActorId, input.app, input.kind, title, input.senderName || ''].join('|')
  entries.push({ ...input, title, body, entryId: `phone-${storyFingerprint(key)}`, createdAt: now, updatedAt: now })
}

/**
 * Read only the existing model-authored Character Phone bracket contract.
 * This creates an append-only, text-only phone projection; media is referenced
 * by stable ids when present and raw image payloads are never copied.
 */
export function extractCharacterPhoneEntries(content: string, sourceRef: StorySourceRef, now = Date.now()): StoryPhoneEntry[] {
  const parsed: StoryPhoneEntry[] = []
  const canonOnly = xmlNarrativeAsLegacy(String(content || '')).replace(/\[WHATIF\|[\s\S]*?\[\/WHATIF\]/gi, ' ').replace(/\[Plot_Sparks\][\s\S]*?\[\/Plot_Sparks\]/gi, ' ')
  for (const phone of blocks(canonOnly, 'character_phone')) {
    const ownerName = tagValue(phone, 'cp_owner')
    if (!ownerName || ownerName.length > 80) continue
    const ownerActorId = storyActorId(ownerName)
    for (const appBlock of blocks(phone, 'cp_app')) {
      const app = tagValue(appBlock, 'cp_name') || 'Phone'
      const appContent = rawTagValue(appBlock, 'cp_content') || appBlock
      const messages = blocks(appContent, 'cp_msg')
      for (const message of messages) {
        const side = tagValue(message, 'cp_side')
        const senderName = side.toLowerCase() === 'self' ? ownerName : tagValue(message, 'cp_name')
        addEntry(parsed, {
          ownerActorId, ownerName, app, kind: 'message', title: senderName || app,
          body: tagValue(message, 'cp_text'), senderName: senderName || undefined,
          storyTimeLabel: tagValue(message, 'cp_time') || undefined, sourceRef: { ...sourceRef, sourceKind: 'phone' },
        }, now)
      }
      for (const photo of blocks(appContent, 'cp_photo')) {
        const media = rawTagValue(photo, 'cp_media')
        addEntry(parsed, {
          ownerActorId, ownerName, app, kind: 'photo', title: tagValue(photo, 'cp_title') || 'Photo',
          body: tagValue(photo, 'cp_meta'), storyTimeLabel: tagValue(photo, 'cp_meta') || undefined,
          ...assetReference(media), sourceRef: { ...sourceRef, sourceKind: 'phone' },
        }, now)
      }
      for (const row of blocks(appContent, 'cp_row')) addEntry(parsed, {
        ownerActorId, ownerName, app, kind: 'row', title: tagValue(row, 'cp_title') || tagValue(row, 'cp_glyph') || app,
        body: [tagValue(row, 'cp_meta'), tagValue(row, 'cp_text')].filter(Boolean).join(' · '),
        storyTimeLabel: tagValue(row, 'cp_meta') || undefined, sourceRef: { ...sourceRef, sourceKind: 'phone' },
      }, now)
      for (const stat of blocks(appContent, 'cp_stat')) addEntry(parsed, {
        ownerActorId, ownerName, app, kind: 'stat', title: tagValue(stat, 'cp_label'),
        body: [tagValue(stat, 'cp_value'), tagValue(stat, 'cp_note')].filter(Boolean).join(' · '),
        sourceRef: { ...sourceRef, sourceKind: 'phone' },
      }, now)
      for (const notification of blocks(appContent, 'cp_notification')) addEntry(parsed, {
        ownerActorId, ownerName, app, kind: 'notification', title: tagValue(notification, 'cp_title') || app,
        body: tagValue(notification, 'cp_text') || tagValue(notification, 'cp_body'),
        storyTimeLabel: tagValue(notification, 'cp_time') || undefined, sourceRef: { ...sourceRef, sourceKind: 'phone' },
      }, now)
      // Keep the app's explicitly authored one-line/note content even when it
      // does not use a richer cp_* component. Do not ingest app names alone.
      if (!messages.length && !blocks(appContent, 'cp_photo').length && !blocks(appContent, 'cp_row').length && !blocks(appContent, 'cp_stat').length && !blocks(appContent, 'cp_notification').length) {
        const text = tagValue(appBlock, 'cp_text') || appContent.replace(/\[[^\]]+\]/g, ' ').replace(/\s+/g, ' ').trim()
        if (text) addEntry(parsed, { ownerActorId, ownerName, app, kind: 'note', title: app, body: text, sourceRef: { ...sourceRef, sourceKind: 'phone' } }, now)
      }
    }
  }
  return parsed.slice(0, 120)
}

export function ingestCharacterPhoneSnapshot(state: StoryConstellationState, content: string, sourceRef: StorySourceRef, now = Date.now(), assets: readonly VisualAssetReference[] = []): number {
  const entries = extractCharacterPhoneEntries(content, sourceRef, now)
  for (const entry of entries) {
    const owner = ensureStoryActor(state, entry.ownerName, entry.sourceRef, now)
    if (owner) { entry.ownerActorId = owner.actorId; entry.ownerName = owner.displayName }
    const matchingAsset = entry.requestId ? assets.find(asset => asset.chatId === sourceRef.chatId && asset.messageId === sourceRef.messageId && asset.swipeId === sourceRef.swipeId && asset.requestId === entry.requestId) : undefined
    if (matchingAsset) { entry.assetId = matchingAsset.assetId; entry.imageId = matchingAsset.imageId }
    const current = state.phoneEntries[entry.entryId]
    if (!current) state.phoneEntries[entry.entryId] = entry
    else {
      current.sourceRef = { ...entry.sourceRef, sourceState: 'active' }
      current.body = entry.body
      current.title = entry.title
      current.updatedAt = now
    }
  }
  if (entries.length) state.updatedAt = now
  return entries.length
}
