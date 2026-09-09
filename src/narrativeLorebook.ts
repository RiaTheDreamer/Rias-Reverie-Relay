import { narrativeRegexScripts, type NarrativeLorebookKind } from './narrativeRegexAssets'
import { contentFingerprint } from './contracts'

export type NarrativeLorebookRecord = {
  title: string
  keys: string[]
  content: string
}

export type NarrativeLorebookChat = {
  id: string
  name: string
  metadata: Record<string, unknown>
}

type NarrativeLorebookApi = {
  world_books: {
    list(options?: { limit?: number; offset?: number; userId?: string }): Promise<{ data: Array<{ id: string; name: string; metadata: Record<string, unknown> }>; total: number }>
    create(input: { name: string; description?: string; metadata?: Record<string, unknown> }, userId?: string): Promise<{ id: string; name: string; metadata: Record<string, unknown> }>
    delete(worldBookId: string, userId?: string): Promise<boolean>
    entries: {
      create(worldBookId: string, input: Record<string, unknown>, userId?: string): Promise<{ id: string }>
      delete(entryId: string, userId?: string): Promise<boolean>
    }
  }
  chats: {
    update(chatId: string, input: { metadata?: Record<string, unknown> }, userId?: string): Promise<unknown>
  }
}

const SCRIPT_IDS: Readonly<Record<NarrativeLorebookKind, string>> = {
  'cast-introduction': 'reverie_npc_intro_images_v1',
  'character-dossier': 'relay_shenanigans_dossier_images_sparkle_v1',
  'location-file': 'relay_shenanigans_location_images_sparkle_v1',
}

function cleanText(value: unknown): string {
  return String(value || '')
    .replace(/<(?:npc|place)-media\b[^>]*>[\s\S]*?<\/(?:npc|place)-media>/gi, '')
    .replace(/<image_request\b[\s\S]*?<\/image_request>/gi, '')
    .replace(/<!--\s*reverie-relay:[\s\S]*?-->/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\[(?:\/?[A-Za-z_][^\]]*)\]/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .trim()
}

export function extractNarrativeLorebookRecord(source: string, kind: NarrativeLorebookKind, occurrence = 0): NarrativeLorebookRecord | null {
  const script = narrativeRegexScripts('sparkle-button').find(candidate => candidate.script_id === SCRIPT_IDS[kind])
  if (!script) return null
  const flags = script.flags?.includes('g') ? script.flags : `${script.flags || ''}g`
  const matches = Array.from(String(source || '').matchAll(new RegExp(script.find_regex, flags)))
  const match = matches[Math.max(0, Number.isFinite(Number(occurrence)) ? Number(occurrence) : 0)]
  const groups = match?.groups || {}
  if (!match) return null
  if (kind === 'cast-introduction') {
    const title = cleanText(groups.name)
    const sections = [
      ['Tier', groups.tier], ['Identity', groups.identity], ['Appearance', groups.appearance],
      ['Personality', groups.personality], ['History and Motivation', groups.history], ['Relationships', groups.relationships],
    ].map(([label, value]) => [label, cleanText(value)] as const).filter(([, value]) => value)
    if (!title || !sections.length) return null
    return { title, keys: [title], content: `Cast Introduction: ${title}\n\n${sections.map(([label, value]) => `${label}: ${value}`).join('\n')}` }
  }
  const title = cleanText(groups.visible)
  const body = cleanText(groups.body)
  if (!title || !body) return null
  return { title, keys: [title], content: `${kind === 'character-dossier' ? 'Character Dossier' : 'Location File'}: ${title}\n\n${body}` }
}

async function listBooks(api: NarrativeLorebookApi, userId?: string) {
  const books: Array<{ id: string; name: string; metadata: Record<string, unknown> }> = []
  let offset = 0
  for (;;) {
    const page = await api.world_books.list({ limit: 100, offset, userId })
    books.push(...page.data)
    offset += page.data.length
    if (!page.data.length || offset >= page.total) return books
  }
}

export async function exportNarrativeLorebookRecord(input: {
  api: NarrativeLorebookApi
  chat: NarrativeLorebookChat
  record: NarrativeLorebookRecord
  kind: NarrativeLorebookKind
  messageId: string
  swipeId: number
  occurrence?: number
  relayVersion?: string
  schemaVersion?: number
  userId?: string
}): Promise<{ bookId: string; entryId: string; message: string }> {
  const { api, chat, record, kind, messageId, swipeId, userId } = input
  const occurrence = Math.max(0, Number.isFinite(Number(input.occurrence)) ? Number(input.occurrence) : 0)
  const books = await listBooks(api, userId)
  let book = books.find(candidate => candidate.metadata?.reverie_relay_export_book === true && candidate.metadata?.reverie_relay_lorebook_chat_id === chat.id)
  let createdBook = false
  let entryId = ''
  try {
    if (!book) {
      const createdAt = new Date().toISOString()
      book = await api.world_books.create({
        name: `Reverie Relay Stage Archive - ${chat.name || 'Chat'}`,
        description: 'Chat-bound Narrative Surface exports created by Reverie Relay.',
        metadata: { reverie_relay_lorebook_chat_id: chat.id, reverie_relay_created_at: createdAt, reverie_relay_export_book: true },
      }, userId)
      createdBook = true
    }

    const entry = await api.world_books.entries.create(book.id, {
      key: record.keys,
      content: record.content,
      comment: `${kind === 'character-dossier' ? 'Character Dossier' : kind === 'location-file' ? 'Location File' : 'Cast Introduction'} - ${record.title}`,
      position: 4,
      selective: false,
      constant: false,
      disabled: false,
      extensions: {
        reverie_relay_export_entry: true,
        reverie_relay_lorebook_chat_id: chat.id,
        reverie_relay_surface_kind: kind,
        reverie_relay_surface_occurrence: occurrence,
        reverie_relay_source_message_id: messageId,
        reverie_relay_source_swipe_id: swipeId,
        reverie_relay_source_fingerprint: contentFingerprint(`${kind}\n${record.title}\n${record.content}`),
        reverie_relay_exported_title: record.title,
        reverie_relay_exported_at: new Date().toISOString(),
        reverie_relay_version: input.relayVersion || 'unknown',
        reverie_relay_schema_version: Number.isFinite(Number(input.schemaVersion)) ? Number(input.schemaVersion) : 1,
      },
    }, userId)
    entryId = entry.id

    const existingBindings = Array.isArray(chat.metadata?.chat_world_book_ids)
      ? chat.metadata.chat_world_book_ids.filter((value): value is string => typeof value === 'string' && Boolean(value))
      : []
    if (!existingBindings.includes(book.id)) {
      await api.chats.update(chat.id, { metadata: { ...(chat.metadata || {}), chat_world_book_ids: [...existingBindings, book.id] } }, userId)
    }
    return { bookId: book.id, entryId, message: `Sent ${record.title} to ${book.name}.` }
  } catch (error) {
    if (entryId) await api.world_books.entries.delete(entryId, userId).catch(() => false)
    if (createdBook && book?.id) await api.world_books.delete(book.id, userId).catch(() => false)
    throw error
  }
}
