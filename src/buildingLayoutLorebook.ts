import { buildingLayoutLoreRecord, type BuildingLayout } from './buildingLayout'
import { contentFingerprint } from './contracts'
import type { NarrativeLorebookChat } from './narrativeLorebook'

type Book = { id: string; name: string; metadata: Record<string, unknown> }
type Entry = { id: string; extensions: Record<string, unknown> }
type Api = {
  world_books: {
    list(options: { limit: number; offset: number; userId?: string }): Promise<{ data: Book[]; total: number }>
    create(input: { name: string; description: string; metadata: Record<string, unknown> }, userId?: string): Promise<Book>
    delete(id: string, userId?: string): Promise<boolean>
    entries: {
      list(bookId: string, options: { limit: number; offset: number; userId?: string }): Promise<{ data: Entry[]; total: number }>
      create(bookId: string, input: Record<string, unknown>, userId?: string): Promise<{ id: string }>
      delete(id: string, userId?: string): Promise<boolean>
    }
  }
  chats: {
    get(id: string, userId?: string): Promise<NarrativeLorebookChat | null>
    update(id: string, input: { metadata: Record<string, unknown> }, userId?: string): Promise<unknown>
  }
}
const locks = new Map<string, Promise<unknown>>()
async function pages<T>(read: (offset: number) => Promise<{ data: T[]; total: number }>): Promise<T[]> {
  const all: T[] = []
  for (;;) {
    const page = await read(all.length)
    all.push(...page.data)
    if (!page.data.length || all.length >= page.total) return all
  }
}

/** Manual, chat-scoped export. Serialize repeated clicks; never overwrite a
 * human-edited entry or borrow a parent chat's book after a fork. */
export async function exportBuildingRoomToLorebook(input: { api: Api; chat: NarrativeLorebookChat; layout: BuildingLayout; roomId: string; messageId: string; swipeId: number; userId?: string; relayVersion: string }) {
  const { api, chat, layout, roomId, userId } = input
  const lockKey = `${userId || ''}:${chat.id}`
  const run = async () => {
    const record = buildingLayoutLoreRecord(layout, roomId)
    const books = await pages(offset => api.world_books.list({ limit: 100, offset, userId }))
    let book = books.find(candidate => candidate.metadata?.reverie_relay_building_layout_id === layout.id && candidate.metadata?.reverie_relay_lorebook_chat_id === chat.id)
    let createdBook = false, createdEntryId = ''
    try {
      if (!book) {
        book = await api.world_books.create({
          name: layout.context.name,
          description: `Building Layout rooms exported from ${chat.name || 'this chat'}.`,
          metadata: { reverie_relay_building_layout_id: layout.id, reverie_relay_lorebook_chat_id: chat.id, reverie_relay_created_at: new Date().toISOString() },
        }, userId)
        createdBook = true
      }
      const entries = await pages(offset => api.world_books.entries.list(book!.id, { limit: 100, offset, userId }))
      const existing = entries.find(entry => entry.extensions?.reverie_relay_building_layout_id === layout.id && entry.extensions?.reverie_relay_room_id === roomId && entry.extensions?.reverie_relay_lorebook_chat_id === chat.id)
      let entryId = existing?.id || ''
      if (!existing) {
        const entry = await api.world_books.entries.create(book.id, {
          key: record.keys, content: record.content, comment: `Building Layout — ${record.title}`, position: 4, selective: false, constant: false, disabled: false,
          extensions: { reverie_relay_building_layout_id: layout.id, reverie_relay_room_id: roomId, reverie_relay_lorebook_chat_id: chat.id, reverie_relay_surface_kind: 'building-layout', reverie_relay_source_message_id: input.messageId, reverie_relay_source_swipe_id: input.swipeId, reverie_relay_source_fingerprint: contentFingerprint(record.content), reverie_relay_version: input.relayVersion, reverie_relay_exported_at: new Date().toISOString() },
        }, userId)
        entryId = createdEntryId = entry.id
      }
      // Refresh immediately before binding, preserving unrelated current books.
      const currentChat = await api.chats.get(chat.id, userId)
      if (!currentChat) throw new Error('The owning chat no longer exists.')
      const bindings = Array.isArray(currentChat.metadata.chat_world_book_ids) ? currentChat.metadata.chat_world_book_ids.filter((value): value is string => typeof value === 'string') : []
      if (!bindings.includes(book.id)) await api.chats.update(chat.id, { metadata: { ...currentChat.metadata, chat_world_book_ids: [...bindings, book.id] } }, userId)
      return { bookId: book.id, entryId, message: existing ? `${record.title} is already in ${book.name}; your saved entry was left unchanged.` : `Added ${record.title} to ${book.name}.` }
    } catch (error) {
      if (createdEntryId) await api.world_books.entries.delete(createdEntryId, userId).catch(() => false)
      if (createdBook && book) await api.world_books.delete(book.id, userId).catch(() => false)
      throw error
    }
  }
  const pending = (locks.get(lockKey) || Promise.resolve()).catch(() => undefined).then(run)
  locks.set(lockKey, pending)
  try { return await pending } finally { if (locks.get(lockKey) === pending) locks.delete(lockKey) }
}
