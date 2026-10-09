// @ts-nocheck -- actual native renderer + mounted DOM + mocked Lumiverse APIs.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { JSDOM } from 'jsdom'
import { buildingLayoutBlocks, buildingLayoutLoreRecord, parseBuildingLayout, handleBuildingLayoutNavigation } from '../src/buildingLayout'
import { BUILDING_LAYOUT_CONTRACT, BUILDING_LAYOUT_SAMPLE } from '../src/buildingLayoutContract'
import { exportBuildingRoomToLorebook } from '../src/buildingLayoutLorebook'
import { renderNativeSurfaceMarkup } from '../src/nativeSurfaces'
import { r45SupplementalSurfaceDefinitions } from '../src/r45SurfaceCatalog'
import { shippedSurfaceDefinitions } from '../src/shippedSurfaceDefinitions'
import { validateAssistedSurfaceRepair } from '../src/assistedSurfaceRepair'
import { normalizeSurfaceBlock } from '../src/surfaceXml'

const legacy = readFileSync(new URL('./fixtures/building-layout-legacy.txt', import.meta.url), 'utf8')
const xml = legacy.replace(/\[(\/?)([a-z_]+)\]/g, '<$1$2>').replace(/<move_text>[\s\S]*?<\/move_text>/g, '')
const parsed = parseBuildingLayout(xml, 'authoring')
assert(parsed.layout, parsed.diagnostics.join('; '))
assert.equal(parsed.layout.floors.length, 2)
assert.equal(parsed.layout.floors.flatMap(floor => floor.rooms).length, 8)
assert(parseBuildingLayout(legacy).layout, 'original bracket fixture remains readable')
assert(!parseBuildingLayout(legacy, 'authoring').layout, 'new output must be XML')
assert(BUILDING_LAYOUT_CONTRACT.includes('ROOT: <building_layout>') && !BUILDING_LAYOUT_CONTRACT.includes('[building_layout]'))
assert(!BUILDING_LAYOUT_CONTRACT.includes('{{user}}'))
assert(parseBuildingLayout(BUILDING_LAYOUT_SAMPLE, 'authoring').layout)
assert(parseBuildingLayout(xml.replace('Elegant, quiet', '[literal] Elegant, quiet'), 'authoring').layout, 'XML values retain literal brackets')
const bad = [
  xml.replace('</room_name>', ''), xml.replace('slot="building-haneul-house-demo-library"', 'slot="building-haneul-house-demo-grand-foyer"'),
  xml.replace('<room_id>library</room_id>', '<room_id>grand-foyer</room_id>'),
  xml.replace('<plan_slot>northeast</plan_slot>', '<plan_slot>northwest</plan_slot>'),
  xml.replace('target="custom.artifact-media"', 'target="prose.illustration"'), xml.replace('aspect="4:3"', 'aspect="1:1"'),
  xml.replace(/<media>[\s\S]*?<\/media>/, '<media></media>'), xml.replace('<floor_name>', '<floor_name><room_id>bad</room_id>'),
  xml.replace('<title>Haneul House</title>', '<title>Haneul House</title><title>Duplicate</title>'),
]
for (const source of bad) assert(!parseBuildingLayout(source).layout, 'malformed or ambiguous owner must fail closed')
const firstFloor = xml.match(/<floor>[\s\S]*?<\/floor>/)[0]
const fourFloors = xml.replace(/<floor>[\s\S]*<\/floor>/, Array.from({ length: 4 }, (_, index) => firstFloor.replace(/(ground-floor|grand-foyer|sunken-lounge|formal-dining|garden-conservatory)/g, '$1-' + index)).join(''))
assert(parseBuildingLayout(fourFloors).layout, 'four floors / sixteen rooms supported')
assert(!parseBuildingLayout(fourFloors.replace('</building_layout>', firstFloor + '</building_layout>')).layout, 'five floors rejected')
const broken = xml.replace('</building_layout>', '') + BUILDING_LAYOUT_SAMPLE
assert.equal(buildingLayoutBlocks(broken, ['building_layout']).length, 2, 'malformed layout cannot swallow sibling')

const definitions = [...shippedSurfaceDefinitions(1), ...r45SupplementalSurfaceDefinitions(1)]
assert.equal(definitions.length, 47)
const studio = { definitions: Object.fromEntries(definitions.map(def => [def.surfaceId, def])), activePresetIds: {}, collectionPresets: {}, rendererMode: 'relay', defaultShellMode: 'plain', colorMode: 'realistic' }
const context = { chatId: 'layout-chat', messageId: 'layout-message', swipeId: 0, autoGenerate: false }
const mediaRequests = [...xml.matchAll(/<image_request\b[^>]*id="([^"]+)"/g)].map(match => match[1])
const visible = html => { const dom = new JSDOM(html); dom.window.document.querySelectorAll('style,textarea,template,script').forEach(node => node.remove()); return dom.window.document.body.textContent }
for (const mode of ['inline', 'plain', 'sparkling', 'glass', 'plain-glass']) {
  const rendered = renderNativeSurfaceMarkup(xml, { ...studio, defaultShellMode: mode }, context)
  assert.equal(rendered.renderedCount, 1)
  assert(rendered.renderedSurfaceIds.includes('building-layout'))
  const dom = new JSDOM(rendered.content)
  assert.equal(dom.window.document.querySelectorAll('.bl-media').length, 8)
  assert.equal(dom.window.document.querySelectorAll('.bl-media [data-reverie-lifecycle-card]').length, 8)
  assert(!visible(rendered.content).includes('Wide interior architectural photograph'), 'briefs never become visible prose')
  assert(!visible(rendered.content).includes('{{user}}'), 'legacy movement text never becomes a control')
  const floorButton = dom.window.document.querySelector('[data-bl-floor="1"]')
  assert(handleBuildingLayoutNavigation(floorButton))
  assert(dom.window.document.querySelector('[data-bl-floor-panel="0"]').hidden)
  assert(!dom.window.document.querySelector('[data-bl-floor-panel="1"]').hidden)
  const roomButton = dom.window.document.querySelector('[data-bl-floor-panel="1"] [data-bl-room="2"]')
  assert(handleBuildingLayoutNavigation(roomButton))
  assert(!dom.window.document.querySelector('[data-bl-floor-panel="1"] [data-bl-room-panel="2"]').hidden)
  const save = dom.window.document.querySelector('[data-bl-floor-panel="1"] [data-bl-room-panel="2"] [data-rrn-action="building-lorebook"]')
  assert.equal(save.textContent, 'Add to lorebook')
  assert.equal(save.dataset.blRoomId, 'music-room')
  assert.equal(save.dataset.rrnChatId, context.chatId)
  assert.equal(save.dataset.rrnMessageId, context.messageId)
  assert.equal(renderNativeSurfaceMarkup(rendered.content, studio, context).content, rendered.content, 'rendering is idempotent')
}
for (const status of ['queued', 'preparing', 'generating', 'failed', 'recovered-pending', 'completed']) {
  const records = [{ requestId: mediaRequests[0], messageId: context.messageId, swipeId: 0, slot: mediaRequests[0], target: 'custom.artifact-media', status, imageUrl: status === 'completed' ? 'https://example.test/foyer.png' : undefined }]
  const dom = new JSDOM(renderNativeSurfaceMarkup(xml, studio, { ...context, records }).content)
  assert.equal(dom.window.document.querySelectorAll('.bl-media').length, 8)
  assert.equal(dom.window.document.querySelectorAll('.bl-media img[data-dgir-request-id]').length, status === 'completed' ? 1 : 0)
  assert.equal(dom.window.document.querySelectorAll('.bl-media [data-reverie-lifecycle-card]').length, status === 'completed' ? 7 : 8)
  if (status === 'completed') assert.equal(dom.window.document.querySelector('.bl-room-detail [data-bl-room-id]')?.dataset.blRoomId, 'grand-foyer')
}
const sibling = definitions.find(def => def.baseSurfaceId === 'x-dm').sampleXml
const isolated = renderNativeSurfaceMarkup(xml.replace('</building_layout>', '') + sibling, studio, context)
assert(isolated.renderedSurfaceIds.includes('building-layout') && isolated.renderedSurfaceIds.includes('x-dm'), 'bad owner preserves neighboring Surface')
assert(/repair/i.test(visible(isolated.content)), 'malformed layout has a repair surface')
const repaired = validateAssistedSurfaceRepair('building-layout', xml.replace('</floor_name>', ''), xml)
assert(repaired.ok, repaired.reason)
assert(!validateAssistedSurfaceRepair('building-layout', xml, xml.replace('Grand Foyer', 'Changed Room')).ok)
assert(!normalizeSurfaceBlock(xml, { id: 'building-layout', wrapper: 'building_layout', sampleXml: BUILDING_LAYOUT_SAMPLE }).diagnostics.length)

const books = [], entries = [], chats = new Map([['layout-chat', { id: 'layout-chat', name: 'Test chat', metadata: { chat_world_book_ids: ['user-book'], preserve: 'yes' } }]])
let serial = 0, failBinding = false
const api = {
  world_books: {
    list: async ({ offset = 0 }) => ({ data: books.slice(offset), total: books.length }),
    create: async input => { const book = { id: `book-${++serial}`, ...structuredClone(input) }; books.push(book); return book },
    delete: async id => { books.splice(books.findIndex(book => book.id === id), 1); return true },
    entries: {
      list: async (bookId, { offset = 0 }) => ({ data: entries.filter(entry => entry.bookId === bookId).slice(offset), total: entries.filter(entry => entry.bookId === bookId).length }),
      create: async (bookId, input) => { const entry = { id: `entry-${++serial}`, bookId, ...structuredClone(input) }; entries.push(entry); return entry },
      delete: async id => { entries.splice(entries.findIndex(entry => entry.id === id), 1); return true },
    },
  },
  chats: {
    get: async id => structuredClone(chats.get(id)),
    update: async (id, input) => { if (failBinding) throw new Error('binding failed'); chats.set(id, { ...chats.get(id), ...structuredClone(input) }) },
  },
}
const exportInput = { api, chat: chats.get(context.chatId), layout: parsed.layout, roomId: 'grand-foyer', messageId: context.messageId, swipeId: 0, userId: 'test-user', relayVersion: '0.5.1' }
const concurrent = await Promise.all([exportBuildingRoomToLorebook(exportInput), exportBuildingRoomToLorebook(exportInput)])
assert.equal(concurrent[0].entryId, concurrent[1].entryId)
assert.equal(books.length, 1); assert.equal(entries.length, 1)
assert.deepEqual(chats.get(context.chatId).metadata.chat_world_book_ids, ['user-book', books[0].id])
assert.equal(chats.get(context.chatId).metadata.preserve, 'yes')
entries[0].content = 'Human edited this room.'
await exportBuildingRoomToLorebook(exportInput)
assert.equal(entries[0].content, 'Human edited this room.')
await exportBuildingRoomToLorebook({ ...exportInput, roomId: 'library' })
assert.equal(books.length, 1); assert.equal(entries.length, 2)
assert(!entries[1].content.includes('scene_brief') && !entries[1].content.includes('move_text') && !entries[1].content.includes('image_request'))
await assert.rejects(exportBuildingRoomToLorebook({ ...exportInput, roomId: 'foreign-room' }))
chats.set('fork-chat', { ...structuredClone(chats.get(context.chatId)), id: 'fork-chat' })
await exportBuildingRoomToLorebook({ ...exportInput, chat: chats.get('fork-chat') })
assert.equal(books.length, 2, 'fork creates its own building lorebook')
chats.set('failure-chat', { id: 'failure-chat', name: 'Failure', metadata: {} })
failBinding = true
await assert.rejects(exportBuildingRoomToLorebook({ ...exportInput, chat: chats.get('failure-chat') }))
assert.equal(books.length, 2); assert.equal(entries.length, 3, 'failed binding rolls back its new entry/book')
failBinding = false

// Exercise the production frontend-message route, not only the export helper.
let receive, permission = true
const responses = []
globalThis.spindle = { ...api, chat: { getMessages: async () => [{ id: context.messageId, content: xml, role: 'assistant', swipe_id: 0, swipes: [xml] }] },
  on() {}, onFrontendMessage(callback) { receive = callback }, registerInterceptor() {}, registerMacro() {}, registerMessageContentProcessor() {},
  sendToFrontend(message) { responses.push(message) }, permissions: { has: () => permission }, log: { info() {}, warn() {}, error() {} },
  ui: { getDrawerTabs: async () => [{ id: 'lorebooks', tabName: 'Lorebook' }], openDrawerTab: async () => {} },
  userStorage: { async getJson(_path, { fallback } = {}) { return structuredClone(fallback ?? {}) }, async setJson() {}, async mkdir() {} },
}
const { buildEnabledSurfaceUtility } = await import('../src/backend')
const prompt = buildEnabledSurfaceUtility({ ...studio, utilityInjectionEnabled: true }).content
assert(prompt.includes('ROOT: <building_layout>') && !prompt.includes('[building_layout]'), 'final injected prompt uses XML')
async function action(extra = {}) {
  const requestId = `test-${++serial}`
  receive({ type: 'export_building_lorebook', requestId, ...context, layoutId: parsed.layout.id, roomId: 'sunken-lounge', ...extra }, 'test-user')
  for (let tries = 0; tries < 100 && !responses.some(response => response.requestId === requestId); tries++) await Bun.sleep(5)
  return responses.find(response => response.requestId === requestId)
}
assert((await action()).ok, 'saved-message source resolves through real backend route')
const before = entries.length
assert(!(await action({ roomId: 'foreign-room' })).ok)
assert(!(await action({ swipeId: 99 })).ok)
permission = false
assert(!(await action()).ok)
assert.equal(entries.length, before, 'rejected actions have no mutations')
permission = true
// Mounted production frontend: capture through a real ShadowRoot, keep an
// existing Composer draft, and deliver the real backend result to its button.
const frontendDom = new JSDOM('<!doctype html><html><body><textarea name="chat-message">Keep this draft</textarea></body></html>', { url: 'http://localhost/', pretendToBeVisual: true })
const win = frontendDom.window
for (const name of ['window', 'document', 'HTMLElement', 'HTMLButtonElement', 'HTMLImageElement', 'HTMLInputElement', 'HTMLSelectElement', 'HTMLTextAreaElement', 'HTMLStyleElement', 'HTMLDetailsElement', 'Element', 'ShadowRoot', 'Node', 'MutationObserver', 'Event', 'CustomEvent', 'getComputedStyle']) globalThis[name] = name === 'window' ? win : name === 'document' ? win.document : win[name]
win.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {} })
let timer = 0
win.setTimeout = () => ++timer; win.clearTimeout = () => {}; win.setInterval = () => ++timer; win.clearInterval = () => {}
win.requestAnimationFrame = () => ++timer; win.cancelAnimationFrame = () => {}
globalThis.requestAnimationFrame = win.requestAnimationFrame; globalThis.cancelAnimationFrame = () => {}
globalThis.fetch = async () => ({ ok: false, status: 404, json: async () => ({}) })
const drawerRoot = document.createElement('div'); document.body.append(drawerRoot)
let frontendReceiver
const sent = []
const frontendCtx = {
  dom: { addStyle: () => () => {}, findMessageElement: () => undefined, cleanup() {} },
  ui: {
    registerDrawerTab: () => ({ root: drawerRoot, setTitle() {}, setShortName() {}, setBadge() {}, activate() {}, onActivate: () => () => {}, destroy() {} }),
    registerInputBarAction: () => ({ setLabel() {}, setSubtitle() {}, setEnabled() {}, onClick: () => () => {}, destroy() {} }),
    showModal: () => { const root = document.createElement('div'); document.body.append(root); return { root, dismiss: () => root.remove() } },
  },
  events: { on: () => () => {}, emit() {} }, display: { invalidate() {} },
  messages: { registerTagInterceptor: () => () => {}, getRecent: () => [] },
  getActiveChat: () => ({ chatId: context.chatId, characterId: 'fixture' }),
  sendToBackend: payload => sent.push(payload), onBackendMessage: handler => { frontendReceiver = handler; return () => {} },
}
const { setup } = await import('../src/frontend')
const cleanup = setup(frontendCtx)
const messageHost = document.createElement('div'); document.body.append(messageHost)
const shadow = messageHost.attachShadow({ mode: 'open' })
shadow.innerHTML = renderNativeSurfaceMarkup(xml, studio, context).content
shadow.querySelector('[data-bl-floor="1"]').click()
assert(!shadow.querySelector('[data-bl-floor-panel="1"]').hidden)
const saveButton = shadow.querySelector('[data-bl-floor-panel="1"] [data-rrn-action="building-lorebook"]')
saveButton.click()
const submission = sent.find(payload => payload.type === 'export_building_lorebook')
assert(submission && saveButton.disabled)
assert.equal(submission.roomId, 'library')
receive(submission, 'test-user')
for (let tries = 0; tries < 100 && !responses.some(response => response.requestId === submission.requestId); tries++) await Bun.sleep(5)
const savedResponse = responses.find(response => response.requestId === submission.requestId)
assert(savedResponse.ok)
frontendReceiver(savedResponse)
assert(!saveButton.disabled)
assert.equal(saveButton.textContent, 'Added to lorebook', 'result updates the actual ShadowDOM button')
assert.equal(document.querySelector('textarea[name="chat-message"]').value, 'Keep this draft')
assert(!sent.some(payload => /send_message|generate|fork/.test(payload.type)), 'navigation/export never sends story text or generates')
cleanup(); win.close()
console.log('Building Layout passed: XML prompt, strict schema/bounds, 8 owned media lifecycles, mounted floor/room navigation, shell modes, repair isolation, idempotent chat-bound lorebooks, fork/rollback and production backend actions. No providers invoked.')
