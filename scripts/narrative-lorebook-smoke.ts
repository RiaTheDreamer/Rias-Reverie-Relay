// @ts-nocheck -- local/mocked Lumiverse World Book regression harness.
import { strict as assert } from 'node:assert'
import { exportNarrativeLorebookRecord, extractNarrativeLorebookRecord } from '../src/narrativeLorebook'

type Book = { id: string; name: string; metadata: Record<string, unknown> }

class MockLorebookHost {
  books: Book[] = [{ id: 'existing-user-book', name: 'User Lore', metadata: {} }]
  entries: Array<{ id: string; bookId: string; input: Record<string, unknown> }> = []
  chats = new Map<string, { id: string; name: string; metadata: Record<string, unknown> }>()
  failEntry = false
  failChatUpdate = false
  deletedBooks: string[] = []
  deletedEntries: string[] = []

  api = {
    world_books: {
      list: async ({ limit = 100, offset = 0 } = {}) => ({ data: this.books.slice(offset, offset + limit), total: this.books.length }),
      create: async (input: any) => {
        const book = { id: `relay-book-${this.books.length}`, name: input.name, metadata: structuredClone(input.metadata || {}) }
        this.books.push(book)
        return book
      },
      delete: async (id: string) => {
        this.deletedBooks.push(id)
        this.books = this.books.filter(book => book.id !== id)
        this.entries = this.entries.filter(entry => entry.bookId !== id)
        return true
      },
      entries: {
        create: async (bookId: string, input: Record<string, unknown>) => {
          if (this.failEntry) throw new Error('mock entry failure')
          const entry = { id: `entry-${this.entries.length + 1}`, bookId, input: structuredClone(input) }
          this.entries.push(entry)
          return { id: entry.id }
        },
        delete: async (id: string) => {
          this.deletedEntries.push(id)
          this.entries = this.entries.filter(entry => entry.id !== id)
          return true
        },
      },
    },
    chats: {
      update: async (chatId: string, input: { metadata?: Record<string, unknown> }) => {
        if (this.failChatUpdate) throw new Error('mock binding failure')
        const chat = this.chats.get(chatId)
        if (!chat) throw new Error('missing mock chat')
        chat.metadata = structuredClone(input.metadata || {})
        return chat
      },
    },
  }
}

const dossier = extractNarrativeLorebookRecord('[[npc Example A|main]]<npc-media>portrait</npc-media>Reliable dossier body.[[/npc]]', 'character-dossier')
const location = extractNarrativeLorebookRecord('[[place Moon Pier]]<place-media>photo</place-media>A quiet pier under moonlight.[[/place]]', 'location-file')
const introduction = extractNarrativeLorebookRecord('[NPC:MAJOR|Example B]\n<npc-media>portrait</npc-media>\nb: dancer\na: lavender hair and glasses\np: observant\n[/NPC]', 'cast-introduction')
assert(dossier?.title === 'Example A' && dossier.content.includes('Reliable dossier body.'))
assert(location?.title === 'Moon Pier' && location.content.includes('quiet pier'))
assert(introduction?.title === 'Example B' && introduction.content.includes('Appearance: lavender hair and glasses'))

const host = new MockLorebookHost()
const chat = { id: 'chat-a', name: 'Opening Night', metadata: { chat_world_book_ids: ['existing-user-book'], custom: 'preserved' } }
host.chats.set(chat.id, chat)
const first = await exportNarrativeLorebookRecord({ api: host.api, chat, record: dossier!, kind: 'character-dossier', messageId: 'message-1', swipeId: 2 })
assert.equal(host.books.length, 2, 'first export creates one Relay archive')
assert.deepEqual(chat.metadata.chat_world_book_ids, ['existing-user-book', first.bookId], 'existing chat-bound books are preserved')
assert.equal(chat.metadata.custom, 'preserved', 'unrelated chat metadata is preserved')
assert.equal(host.entries[0].input.comment, 'Character Dossier - Example A')
assert.deepEqual((host.entries[0].input.extensions as any).reverie_relay_source_swipe_id, 2)

await exportNarrativeLorebookRecord({ api: host.api, chat, record: location!, kind: 'location-file', messageId: 'message-2', swipeId: 0 })
assert.equal(host.books.length, 2, 'repeated exports reuse the exact chat-owned Relay archive')
assert.equal(host.entries.length, 2, 'exports are non-destructive entry creates')

const fork = { id: 'chat-fork', name: 'Opening Night Fork', metadata: { chat_world_book_ids: [...chat.metadata.chat_world_book_ids] } }
host.chats.set(fork.id, fork)
const forkResult = await exportNarrativeLorebookRecord({ api: host.api, chat: fork, record: introduction!, kind: 'cast-introduction', messageId: 'message-3', swipeId: 1 })
assert.notEqual(forkResult.bookId, first.bookId, 'forked chat must create its own Relay archive')
assert.equal(host.books.find(book => book.id === forkResult.bookId)?.metadata.reverie_relay_lorebook_chat_id, fork.id)

const failingHost = new MockLorebookHost()
const failingChat = { id: 'chat-fail', name: 'Failure', metadata: { chat_world_book_ids: ['existing-user-book'] } }
failingHost.chats.set(failingChat.id, failingChat)
failingHost.failEntry = true
await assert.rejects(() => exportNarrativeLorebookRecord({ api: failingHost.api, chat: failingChat, record: dossier!, kind: 'character-dossier', messageId: 'message-fail', swipeId: 0 }), /mock entry failure/)
assert.equal(failingHost.books.length, 1, 'failed first entry rolls back the newly created empty Relay archive')
assert.deepEqual(failingChat.metadata.chat_world_book_ids, ['existing-user-book'], 'failed export leaves chat bindings untouched')

const bindingHost = new MockLorebookHost()
const bindingChat = { id: 'chat-bind-fail', name: 'Binding Failure', metadata: { chat_world_book_ids: ['existing-user-book'] } }
bindingHost.chats.set(bindingChat.id, bindingChat)
bindingHost.failChatUpdate = true
await assert.rejects(() => exportNarrativeLorebookRecord({ api: bindingHost.api, chat: bindingChat, record: location!, kind: 'location-file', messageId: 'message-bind', swipeId: 0 }), /mock binding failure/)
assert.equal(bindingHost.entries.length, 0, 'binding failure rolls back the entry')
assert.equal(bindingHost.books.length, 1, 'binding failure rolls back a newly created Relay archive')

console.log('Narrative Lorebook smoke passed: extraction, create/bind, reuse, fork isolation, provenance, and fail-closed rollback.')
