// @ts-nocheck -- deterministic bracket Surface lifecycle and replay regression.
import assert from 'node:assert/strict'
import { parseImageRequests } from '../src/contracts'
import { renderNativeSurfaceMarkup } from '../src/nativeSurfaces'
import { containsNarrativeRegexMarkup, renderNarrativeRegex } from '../src/narrativeRegexAssets'
import { shippedSurfaceDefinitions } from '../src/shippedSurfaceDefinitions'
import { r45SupplementalSurfaceDefinitions } from '../src/r45SurfaceCatalog'

;(globalThis as any).spindle = {
  registerMessageContentProcessor() {}, registerInterceptor() { return () => {} }, registerMacro() {}, on() {}, onFrontendMessage() {}, sendToFrontend() {},
  permissions: { has() { return true }, onChanged() { return () => {} } },
  userStorage: { async getJson(_path: string, options: any = {}) { return structuredClone(options.fallback || {}) }, async setJson() {}, async mkdir() {} },
  chat: { async getMessages() { return [] } }, chats: { async get(chatId: string) { return { id: chatId } } },
  characters: { async get() { return null } }, personas: { async getActive() { return null } },
  world_books: { async getActivated() { return [] }, entries: { async get() { return null } } },
  imageGen: {}, variables: { global: { async set() {} }, chat: { async set() {} } },
  log: { info() {}, warn() {}, error() {} },
}

const backend = await import('../src/backend')
const definitions = [...shippedSurfaceDefinitions(1), ...r45SupplementalSurfaceDefinitions(1)]
const studio: any = {
  definitions: Object.fromEntries(definitions.map(definition => [definition.surfaceId, definition])),
  activePresetIds: Object.fromEntries(definitions.map(definition => [definition.baseSurfaceId, definition.surfaceId])),
  collectionPresets: {}, rendererMode: 'relay', defaultShellMode: 'inline', colorMode: 'realistic',
  utilityInjectionEnabled: true, utilityInjectionPosition: 'after-chat-history', utilityTemplate: '', validationErrors: {},
  lastInjectedModuleIds: [], lastInjectionAt: 0, lastInjectionSource: 'none', lastInjectionPosition: 'none', lastInjectionSummary: '', updatedAt: 1,
}

const imageRequest = (id: string, scene: string, aspect = '16:9') => `<image_request id="${id}" target="custom.artifact-media" slot="${id}" aspect="${aspect}"><scene_brief>${scene}</scene_brief></image_request>`
const elsewhereRequest = imageRequest('elsewhere-security', 'Security office at night, a guard rewinding footage.')
const elsewhere = `Opening prose survives.
[[else security office]]
[else_media]${elsewhereRequest}[/else_media]
[else_scene]A guard rewinds the recording.[/else_scene]
[else_context]
[visibility]Reader only[/visibility]
[clock]Same night[/clock]
[knowledge]The cast does not know.[/knowledge]
[collision]The recording may be noticed.[/collision]
[/else_context]
[[/else]]
Closing prose survives.`

const parallelIds = ['parallel-one', 'parallel-two', 'parallel-three']
const parallel = `Before the threads.
[PARALLEL|Campus and beyond|shifting]
[parallel_entry][text]Soobin waits outside the gym.[/text][parallel_media]${imageRequest(parallelIds[0], 'Soobin waits outside the gym.', '4:3')}[/parallel_media][/parallel_entry]
[parallel_entry][text]Hana reads a new message.[/text][parallel_media]${imageRequest(parallelIds[1], 'Hana reads a new message.', '4:3')}[/parallel_media][/parallel_entry]
[parallel_entry][text]Jiyoon crosses the courtyard.[/text][parallel_media]${imageRequest(parallelIds[2], 'Jiyoon crosses the courtyard.', '4:3')}[/parallel_media][/parallel_entry]
[parallel_context][trajectory]Three existing threads continue moving.[/trajectory][intersection]The shared campus timing creates pressure.[/intersection][/parallel_context]
[/PARALLEL]
After the threads.`

const record = (messageId: string, id: string, status: string, imageUrl?: string) => ({
  key: `surface-chat:${messageId}:0:${id}:${id}`, chatId: 'surface-chat', messageId, swipeId: 0, requestId: id,
  slot: id, target: 'custom.artifact-media', targetApp: 'custom', status, originalSceneBrief: `${id} scene`,
  originalNegativePrompt: '', originalRequestXml: '', alt: id, count: 1, createdAt: 1, updatedAt: 2,
  ...(imageUrl ? { imageId: `${id}-image`, imageUrl, completedAt: 2 } : {}), history: [],
})

function render(source: string, messageId: string, records: any[]): string {
  const hydrated = renderNativeSurfaceMarkup(source, studio, {
    chatId: 'surface-chat', messageId, swipeId: 0, isUser: false, autoGenerate: true,
    generationPlaceholderEffect: 'glitter', rendererMode: 'relay', colorMode: 'realistic', records,
  })
  return renderNarrativeRegex(hydrated.content, 'inline', messageId, { chatId: 'surface-chat', swipeId: 0 })
}

for (const [label, source, ids] of [
  ['Elsewhere', elsewhere, ['elsewhere-security']],
  ['Parallel', parallel, parallelIds],
] as const) {
  assert(containsNarrativeRegexMarkup(source), `${label}: bracket shell was not recognized`)
  const requests = parseImageRequests(source)
  assert.deepEqual(requests.map(request => request.id), ids, `${label}: image request discovery was not exact or ordered`)
  for (const request of requests) {
    assert(request.fullMatch.includes('<scene_brief>') && request.fullMatch.includes('</image_request>'), `${label}/${request.id}: nested XML image control changed`)
    assert.equal((source.match(new RegExp(`id="${request.id}"`, 'g')) || []).length, 1, `${label}/${request.id}: request was authored more than once`)
  }
  assert(!/<\/?(?:else-media|else-scene|else-context|parallel-entry|parallel-media)\b/i.test(source), `${label}: structural XML shell returned`)

  const generating = render(source, `${label}-generating`, ids.map(id => record(`${label}-generating`, id, 'generating')))
  assert(!generating.includes(label === 'Elsewhere' ? '[[else security office]]' : '[PARALLEL|'), `${label}: raw bracket shell survived rendering`)
  assert.equal((generating.match(/<div class="rrl-card"[^>]*data-rrn-live-status="generating"/g) || []).length, ids.length, `${label}: generating status did not remain request-scoped`)
  assert.equal((generating.match(/class="rrl-media-skeleton rrl-generation-placeholder"/g) || []).length, ids.length, `${label}: placeholder count did not match request count`)
  for (const id of ids) assert.equal((generating.match(new RegExp(`data-rrn-native-request="${id}"`, 'g')) || []).length, 1, `${label}/${id}: lifecycle owner was duplicated or lost`)
}

const job = (messageId: string, id: string, source: string) => ({
  chatId: 'surface-chat', messageId, swipeId: 0, requestId: id, target: 'custom.artifact-media', intent: 'scene', count: 1,
  slots: [id], alt: id, originalSceneBrief: `${id} scene`, originalNegativePrompt: '',
  originalRequestXml: parseImageRequests(source).find(request => request.id === id)!.fullMatch,
})
const result = (id: string) => ({ slot: id, imageId: `${id}-image`, imageUrl: `/generated/${id}.png` })

const elsewherePlaced = backend.composeInitialPlacementBatchContent(elsewhere, [{ job: job('elsewhere-complete', 'elsewhere-security', elsewhere), results: [result('elsewhere-security')] }])
assert.equal(elsewherePlaced.error, undefined)
assert(elsewherePlaced.content.includes('/generated/elsewhere-security.png'), 'Elsewhere: final image did not replace its request')
for (const text of ['Opening prose survives.', 'A guard rewinds the recording.', 'The recording may be noticed.', 'Closing prose survives.']) assert(elsewherePlaced.content.includes(text), `Elsewhere: surrounding content was destroyed: ${text}`)
const elsewhereCompleted = render(elsewherePlaced.content, 'elsewhere-complete', [record('elsewhere-complete', 'elsewhere-security', 'completed', '/generated/elsewhere-security.png')])
assert(elsewhereCompleted.includes('/generated/elsewhere-security.png'))
assert.equal((elsewhereCompleted.match(/\/generated\/elsewhere-security\.png/g) || []).length, 1)

let parallelPlaced = parallel
for (const id of parallelIds) {
  const placed = backend.composeInitialPlacementBatchContent(parallelPlaced, [{ job: job('parallel-complete', id, parallelPlaced), results: [result(id)] }])
  assert.equal(placed.error, undefined, `Parallel/${id}: placement failed`)
  parallelPlaced = placed.content
  for (const completedId of parallelIds.slice(0, parallelIds.indexOf(id) + 1)) assert(parallelPlaced.includes(`/generated/${completedId}.png`), `Parallel/${id}: sibling completion was destroyed`)
  for (const pendingId of parallelIds.slice(parallelIds.indexOf(id) + 1)) assert.equal(parseImageRequests(parallelPlaced).filter(request => request.id === pendingId).length, 1, `Parallel/${id}: pending sibling ownership changed`)
}
for (const text of ['Before the threads.', 'Soobin waits outside the gym.', 'Hana reads a new message.', 'Jiyoon crosses the courtyard.', 'After the threads.']) assert(parallelPlaced.includes(text), `Parallel: surrounding content was destroyed: ${text}`)
const parallelCompleted = render(parallelPlaced, 'parallel-complete', parallelIds.map(id => record('parallel-complete', id, 'completed', `/generated/${id}.png`)))
const renderedEntries = [...parallelCompleted.matchAll(/<article class="r65-thread">([\s\S]*?)<\/article>/g)].map(match => match[1])
assert.equal(renderedEntries.length, 3, 'Parallel: three independent rendered entries were not preserved')
for (const [index, id] of parallelIds.entries()) {
  assert.equal((parallelCompleted.match(new RegExp(`/generated/${id}\\.png`, 'g')) || []).length, 1, `Parallel/${id}: final image duplicated or disappeared`)
  assert(renderedEntries[index].includes(['Soobin waits', 'Hana reads', 'Jiyoon crosses'][index]), `Parallel/${id}: entry text moved owners`)
  assert(renderedEntries[index].includes(`/generated/${id}.png`), `Parallel/${id}: image left its owning entry`)
}

// External prose edit/replay starts from canonical source and must be pure:
// no duplicate lifecycle cards, no destroyed Surface, and no XML fallback.
for (const [label, source, id, records] of [
  ['Elsewhere', elsewhere.replace('Opening prose survives.', 'Opening prose edited.'), 'elsewhere-security', [record('elsewhere-replay', 'elsewhere-security', 'generating')]],
  ['Parallel', parallel.replace('Before the threads.', 'Before the edited threads.'), 'parallel-one', parallelIds.map(value => record('parallel-replay', value, 'generating'))],
] as const) {
  const first = render(source, `${label.toLowerCase()}-replay`, records)
  const second = render(source, `${label.toLowerCase()}-replay`, records)
  assert.equal(second, first, `${label}: replay was not deterministic`)
  assert.equal((second.match(new RegExp(`data-rrn-native-request="${id}"`, 'g')) || []).length, 1, `${label}: replay duplicated the first request`)
  assert(!/<\/?(?:else-media|parallel-entry|parallel-media)\b/i.test(second), `${label}: replay required structural XML fallback`)
}

console.log('Elsewhere/Parallel lifecycle smoke passed: bracket recognition, exact discovery, owned placeholders, independent placement, final replacement, and deterministic edit/replay are enforced.')
