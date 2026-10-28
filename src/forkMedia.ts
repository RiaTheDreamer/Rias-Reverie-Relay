import { slotKey, type SlotRecord } from './contracts'

type ForkMessage = { id: string; index_in_chat?: number; role?: string; is_user?: boolean; content: string; swipe_id?: number; swipes?: string[] }
const swipeText = (message: ForkMessage, swipe: number): string | undefined =>
  swipe === (message.swipe_id || 0) ? message.content : message.swipes?.[swipe]

/** Host branches copy messages in order but assign new IDs. Rebind only an
 * exact saved swipe at the same index; similar prose/slot names are not proof. */
export function forkCompletedMedia(source: ForkMessage[], destination: ForkMessage[], records: SlotRecord[], chatId: string): SlotRecord[] {
  const byId = new Map(source.map((message, index) => [message.id, { message, index: message.index_in_chat ?? index }]))
  const byIndex = new Map(destination.map((message, index) => [message.index_in_chat ?? index, message]))
  return records.flatMap(record => {
    if (record.status !== 'completed' || !record.imageUrl) return []
    const original = byId.get(record.messageId)
    const copied = original && byIndex.get(original.index)
    if (!original || !copied || copied.is_user === true || copied.role === 'user') return []
    const text = swipeText(original.message, record.swipeId)
    if (!text || text !== swipeText(copied, record.swipeId)) return []
    const inherited = structuredClone(record)
    inherited.chatId = chatId
    inherited.messageId = copied.id
    inherited.key = slotKey(inherited)
    if (inherited.proseAnchor) inherited.proseAnchor.messageId = copied.id
    // The branch owns its own archive and version tree; pixels stay shared.
    inherited.diagnosticArchiveId = undefined
    inherited.recoverySource = undefined
    inherited.recoveredAt = undefined
    inherited.orphaned = false
    inherited.orphanReason = undefined
    return [inherited]
  })
}
