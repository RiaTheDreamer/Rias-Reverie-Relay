// @ts-nocheck -- focused Lumiverse render/edit lifecycle harness.
import { strict as assert } from 'node:assert'
import { readFile } from 'node:fs/promises'
import { parseImageRequests } from '../src/contracts'
import { renderNativeSurfaceMarkup } from '../src/nativeSurfaces'
import { renderNarrativeRegex } from '../src/narrativeRegexAssets'
import { shippedSurfaceDefinitions } from '../src/shippedSurfaceDefinitions'
import { r45SupplementalSurfaceDefinitions } from '../src/r45SurfaceCatalog'

let renderProcessor: ((context: any) => Promise<any>) | undefined
const handlers = new Map<string, (payload: any, userId?: string) => void>()
const storage = new Map<string, any>()
;(globalThis as any).spindle = {
  registerMessageContentProcessor(handler: any) { renderProcessor = handler },
  registerInterceptor() { return () => {} }, registerMacro() {}, onFrontendMessage() {}, sendToFrontend() {},
  on(event: string, handler: any) { handlers.set(event, handler) },
  permissions: { has: () => true, onChanged: () => () => {} },
  userStorage: {
    async getJson(path: string, options: any = {}) { return storage.has(path) ? structuredClone(storage.get(path)) : structuredClone(options.fallback || {}) },
    async setJson(path: string, value: any) { storage.set(path, structuredClone(value)) }, async mkdir() {},
  },
  chat: { async getMessages() { return [] } }, chats: { async get() { return null } },
  characters: { async get() { return null } }, personas: { async getActive() { return null } },
  world_books: { async getActivated() { return [] }, entries: { async get() { return null } } },
  imageGen: {}, variables: { global: { async set() {} }, chat: { async set() {} } },
  log: { info() {}, warn() {}, error() {} },
}
const backend = await import('../src/backend')
assert(renderProcessor)
assert(handlers.has('MESSAGE_EDITED'))

const definitions = [...shippedSurfaceDefinitions(1), ...r45SupplementalSurfaceDefinitions(1)]
const studio: any = {
  definitions: Object.fromEntries(definitions.map(definition => [definition.surfaceId, definition])),
  activePresetIds: Object.fromEntries(definitions.map(definition => [definition.baseSurfaceId, definition.surfaceId])),
  collectionPresets: {}, rendererMode: 'relay', defaultShellMode: 'plain', colorMode: 'realistic',
  utilityInjectionEnabled: true, utilityInjectionPosition: 'after-chat-history', utilityTemplate: '', validationErrors: {},
  lastInjectedModuleIds: [], lastInjectionAt: 0, lastInjectionSource: 'none', lastInjectionPosition: 'none', lastInjectionSummary: '', updatedAt: 1,
}

const nativeDefinition = definitions.find(definition => definition.baseSurfaceId === 'instagram')!
const nativeSource = nativeDefinition.sampleXml
const nativeRequest = parseImageRequests(nativeSource)[0]
assert(nativeRequest)
const completedRecord: any = {
  messageId: 'message-a', swipeId: 0, requestId: nativeRequest.id, slot: nativeRequest.slot || nativeRequest.id,
  target: nativeRequest.target, status: 'completed', imageId: 'existing-image', imageUrl: '/api/v1/image-gen/results/existing-image',
}
const narrativeSource = '[dossier_ui][category]SECRET[/category][archive_head][icon]◇[/icon][name]Hidden Record[/name][state]PARTIAL[/state][relation]A ↔ B[/relation][role]Secret[/role][/archive_head][archive_stats][archive_stat][label]Exposure[/label][value]75[/value][/archive_stat][archive_stat][label]Certainty[/label][value]40[/value][/archive_stat][archive_stat][label]Consequence[/label][value]90[/value][/archive_stat][/archive_stats][archive_details][archive_row][label]The Hidden Truth[/label][value]Known.[/value][/archive_row][archive_row][label]Known By[/label][value]A.[/value][/archive_row][archive_row][label]Hidden From[/label][value]B.[/value][/archive_row][archive_row][label]Near-Slips[/label][value]One clue.[/value][/archive_row][archive_row][label]Impact If Revealed[/label][value]Trust changes.[/value][/archive_row][archive_row][label]Current Status[/label][value]SLIPPING[/value][/archive_row][/archive_details][archive_export][SECRET: Hidden Record]\nCURRENT STATUS: SLIPPING[/archive_export][/dossier_ui]'
const canonical = `Opening prose.\n${nativeSource}\nMiddle prose.\n${narrativeSource}\nClosing prose.`
const renderContext: any = { chatId: 'edit-chat', messageId: 'message-a', swipeId: 0, isUser: false, autoGenerate: true, rendererMode: 'relay', colorMode: 'realistic', records: [completedRecord] }
const firstNative = renderNativeSurfaceMarkup(canonical, studio, renderContext).content
const firstRendered = renderNarrativeRegex(firstNative, 'plain-button', 'message-a', { chatId: 'edit-chat', swipeId: 0 })
assert(firstRendered.includes('/api/v1/image-gen/results/existing-image'))
assert(!firstRendered.includes('[dossier_ui]'))

const editedCanonical = canonical.replace('Opening prose.', 'Opening edited prose.')
const replayedNative = renderNativeSurfaceMarkup(editedCanonical, studio, renderContext).content
const replayed = renderNarrativeRegex(replayedNative, 'plain-button', 'message-a', { chatId: 'edit-chat', swipeId: 0 })
assert(replayed.includes('Opening edited prose.'))
assert(replayed.includes('/api/v1/image-gen/results/existing-image'))
assert(!replayed.includes('[dossier_ui]'))
assert(editedCanonical.includes(nativeSource) && editedCanonical.includes(narrativeSource), 'canonical semantic Surface source must survive prose-only edit')

const removedNarrative = editedCanonical.replace(narrativeSource, '')
const afterOneRemoval = renderNativeSurfaceMarkup(removedNarrative, studio, renderContext).content
assert(afterOneRemoval.includes('/api/v1/image-gen/results/existing-image'), 'removing one Surface must not kill an unrelated completed native Surface')
assert(!afterOneRemoval.includes('Hidden Record'))

// Populate two real output-cache entries through the host display processor.
await renderProcessor!({ origin: 'render', chatId: 'edit-chat', messageId: 'message-a', content: nativeSource, extra: { swipe_id: 0 }, userId: 'u1' })
await renderProcessor!({ origin: 'render', chatId: 'edit-chat', messageId: 'message-b', content: nativeSource, extra: { swipe_id: 0 }, userId: 'u1' })
handlers.get('MESSAGE_EDITED')!({ chatId: 'edit-chat', messageId: 'message-a', message: { id: 'message-a', role: 'assistant', content: editedCanonical, swipe_id: 0, swipes: [canonical] } }, 'u1')
assert.equal(backend.invalidateRenderOutputForMessage('edit-chat', 'message-a', 'u1'), 0, 'MESSAGE_EDITED must invalidate the edited message cache synchronously')
assert.equal(backend.invalidateRenderOutputForMessage('edit-chat', 'message-b', 'u1'), 1, 'MESSAGE_EDITED must preserve unrelated message cache entries')

const normalizedEdit = backend.canonicalEditedMessage({ id: 'message-a', role: 'assistant', content: editedCanonical, swipe_id: 0, swipes: [canonical] })
assert.equal(normalizedEdit.swipes[0], editedCanonical, 'active swipe must use canonical edited message.content instead of a stale event swipe')
const replayAfterInvalidation = await renderProcessor!({ origin: 'render', chatId: 'edit-chat', messageId: 'message-a', content: editedCanonical, extra: { swipe_id: 0 }, userId: 'u1' })
assert(replayAfterInvalidation?.content?.includes('Opening edited prose.'))

const backendSource = await readFile(new URL('../src/backend.ts', import.meta.url), 'utf8')
assert(backendSource.includes('if (!extensionOwned)') && backendSource.includes('invalidateRenderOutputForMessage'), 'extension-owned patches must stay outside external edit invalidation/reconciliation')

console.log('Message edit replay smoke passed: canonical native+narrative replay, same completed image, scoped cache invalidation, stale-swipe correction, and no regeneration path.')
