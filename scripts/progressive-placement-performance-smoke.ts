// @ts-nocheck -- Deterministic Bun harness; all host/provider work is mocked.
import assert from 'node:assert/strict'

const storage = new Map<string, unknown>()
const imageApi: any = {}
;(globalThis as any).spindle = {
  on() {}, onFrontendMessage() {}, registerInterceptor() {}, registerMacro() {}, registerMessageContentProcessor() {}, sendToFrontend() {},
  permissions: { has: () => true }, log: { info() {}, warn() {}, error() {} },
  userStorage: {
    async getJson(path: string, { fallback }: any = {}) { return structuredClone(storage.get(path) ?? fallback) },
    async setJson(path: string, value: unknown) { storage.set(path, structuredClone(value)) },
    async mkdir() {},
  },
  chats: { async get(chatId: string) { return { id: chatId } } }, chat: { async getMessages() { return [] } },
  characters: { async get() { return null } }, personas: { async getActive() { return null } },
  world_books: { async getActivated() { return [] }, entries: { async get() { return null } } },
  variables: { global: { async set() {} }, chat: { async set() {} } },
  imageGen: imageApi,
}
const backend = await import('../src/backend')

const request = (id: string) => `<image_request id="${id}" target="custom.artifact-media" slot="${id}" aspect="16:9" alt="${id}"><scene_brief>${id} scene.</scene_brief></image_request>`
const job = (id: string) => ({
  chatId: 'progressive-chat', messageId: 'progressive-message', swipeId: 0, requestId: id,
  target: 'custom.artifact-media', intent: 'scene', count: 1, slots: [id], alt: id,
  originalSceneBrief: `${id} scene.`, originalNegativePrompt: '', originalRequestXml: request(id),
})
const result = (id: string) => ({ slot: id, imageId: id, imageUrl: `/${id}.png` })
const ids = ['scene-a', 'scene-b', 'scene-c']
let latestContent = `Opening prose.\n${request(ids[0])}\nMiddle prose.\n${request(ids[1])}\nMore prose.\n${request(ids[2])}\nClosing prose.`

// Progressive reveal stays request-local, while durable Relay state finalizes
// as one message/swipe projection batch after every initial sibling is terminal.
assert.equal(backend.placementBatchKey(job('scene-a'), 'u'), backend.placementBatchKey(job('scene-b'), 'u'), 'initial sibling requests must share one message/swipe persistence batch')
assert.equal(backend.initialPlacementBatchCommitGate({ entries: [] } as any, { hasGenerationSibling: true, hasVisibleFrontend: false }), 'generation-pending')
assert.equal(backend.initialPlacementBatchCommitGate({ entries: [] } as any, { hasGenerationSibling: false, hasVisibleFrontend: false }), 'ready')
const siblingBatch = { chatId: 'progressive-chat', messageId: 'progressive-message', swipeId: 0, sourceFingerprint: 'source', entries: [{ job: job('scene-a'), results: [result('scene-a')] }] } as any
assert.equal(backend.hasPendingInitialPlacementSibling({ slots: {
  a: { ...job('scene-a'), status: 'placement-pending', triggerType: 'initial' },
  b: { ...job('scene-b'), status: 'generating', triggerType: 'initial' },
} } as any, siblingBatch), true, 'a still-generating initial sibling must hold the one durable message transaction')
assert.equal(backend.hasPendingInitialPlacementSibling({ slots: {
  a: { ...job('scene-a'), status: 'placement-pending', triggerType: 'initial' },
  b: { ...job('scene-b'), status: 'failed', triggerType: 'initial' },
} } as any, siblingBatch), false, 'a terminal failed sibling must release successful initial placements')

const archivedProjection = backend.renderSnapshotRecords({
  slots: {},
  completedArchive: {
    archived: {
      key: 'progressive-chat:progressive-message:0:archived:archived', chatId: 'progressive-chat', messageId: 'progressive-message', swipeId: 0,
      requestId: 'archived', slot: 'archived', target: 'custom.artifact-media', imageId: 'archived-image', imageUrl: '/archived.png', completedAt: 100,
    },
  },
} as any)
assert.equal(archivedProjection.length, 1)
assert.equal(archivedProjection[0].status, 'completed')
assert.equal(archivedProjection[0].imageUrl, '/archived.png', 'compacted completion archive could not hydrate an authored request after reload')
const liveProjection = backend.renderSnapshotRecords({
  slots: { [archivedProjection[0].key]: { ...archivedProjection[0], imageUrl: '/live.png', updatedAt: 200 } },
  completedArchive: { archived: { ...archivedProjection[0], imageUrl: '/stale.png', completedAt: 100 } },
} as any)
assert.equal(liveProjection.length, 1)
assert.equal(liveProjection[0].imageUrl, '/live.png', 'an archived completion overrode the live slot version')

const deferred = () => {
  let resolve!: (value?: unknown) => void
  let reject!: (error: Error) => void
  const promise = new Promise((ok, fail) => { resolve = ok; reject = fail })
  return { promise, resolve, reject }
}
const provider = Object.fromEntries(ids.map(id => [id, deferred()])) as Record<string, ReturnType<typeof deferred>>
const placements: string[] = []
const place = async (id: string) => backend.withPlacementMutationLock(job(id), async () => {
  const sourceReadInsideLock = latestContent
  await Promise.resolve()
  const composed = backend.composeInitialPlacementBatchContent(sourceReadInsideLock, [{ job: job(id), results: [result(id)] }])
  assert.equal(composed.error, undefined)
  latestContent = composed.content
  placements.push(id)
})
const operations = ids.map(id => provider[id].promise.then(() => place(id)).catch(async () => {
  await backend.withPlacementMutationLock(job(id), async () => {
    latestContent = latestContent.replace(request(id), `<image_request_error data-request-id="${id}">${id} failed</image_request_error>`)
  })
}))

provider['scene-a'].resolve()
await operations[0]
assert.deepEqual(placements, ['scene-a'])
assert(latestContent.includes('/scene-a.png') && latestContent.includes(request('scene-b')) && latestContent.includes(request('scene-c')))

provider['scene-b'].reject(new Error('provider failed'))
await operations[1]
assert(latestContent.includes('/scene-a.png') && latestContent.includes('scene-b failed'), 'sibling failure erased prior success or its own failure status')

provider['scene-c'].resolve()
await operations[2]
assert.deepEqual(placements, ['scene-a', 'scene-c'])
assert(latestContent.includes('/scene-a.png') && latestContent.includes('/scene-c.png') && latestContent.includes('scene-b failed'))
assert.equal((latestContent.match(/\/scene-a\.png/g) || []).length, 1)
assert.equal((latestContent.match(/\/scene-c\.png/g) || []).length, 1)
for (const prose of ['Opening prose.', 'Middle prose.', 'More prose.', 'Closing prose.']) assert(latestContent.includes(prose))

// Six jobs share two bounded preparation workers while the real provider lane
// remains serialized. A owns Swarm, B is provider-waiting, and C may prepare.
const prepIds = ['a', 'b', 'c', 'd', 'e', 'f']
const prepGates = Object.fromEntries(prepIds.map(id => [id, deferred()])) as Record<string, ReturnType<typeof deferred>>
const providerGates = new Map<string, ReturnType<typeof deferred>>()
const events: string[] = []
let activePreparations = 0
let maxPreparations = 0
let activeProviders = 0
let maxSwarmConcurrentProviderCalls = 0
imageApi.getProviders = async () => [{ id: 'swarmui', name: 'SwarmUI', capabilities: { websocketPreviewStreaming: { previews: true, status: true } } }]
imageApi.generateStream = async function* (input: any) {
  activeProviders += 1
  maxSwarmConcurrentProviderCalls = Math.max(maxSwarmConcurrentProviderCalls, activeProviders)
  events.push(`${input.prompt}:provider-start`)
  const gate = deferred()
  providerGates.set(input.prompt, gate)
  await gate.promise
  activeProviders -= 1
  yield { type: 'done', result: { imageId: input.prompt, imageUrl: `/${input.prompt}.png` } }
}
const pipelines = prepIds.map(async id => {
  const release = await backend.acquirePromptPreparationWorker('pipeline-user', 2)
  activePreparations += 1
  maxPreparations = Math.max(maxPreparations, activePreparations)
  events.push(`${id}:preparation-start`)
  await prepGates[id].promise
  activePreparations -= 1
  release()
  events.push(`${id}:provider-waiting`)
  await backend.generateWithOptionalStream({ prompt: id, parameters: {} }, { provider: 'swarmui' }, 'pipeline-user', {
    generationId: `pipeline-${id}`, source: 'relay-slot', slotKey: `pipeline-${id}`, requestId: id, chatId: 'pipeline-chat', laneWaitTimeoutMs: 5_000,
  }, false, 5_000)
})
const until = async (predicate: () => boolean) => { for (let i = 0; i < 10_000 && !predicate(); i += 1) await Promise.resolve(); assert(predicate(), 'deterministic pipeline condition was not reached') }
await until(() => events.includes('a:preparation-start') && events.includes('b:preparation-start'))
prepGates.a.resolve()
await until(() => events.includes('a:provider-start'))
prepGates.b.resolve()
await until(() => events.includes('b:provider-waiting') && events.includes('c:preparation-start'))
assert(!events.includes('b:provider-start'), 'B bypassed serialized Swarm ownership')
for (const id of ['c', 'd', 'e', 'f']) {
  prepGates[id].resolve()
  if (id !== 'f') await until(() => events.includes(`${prepIds[prepIds.indexOf(id) + 1]}:preparation-start`))
}
for (const id of prepIds) {
  await until(() => providerGates.has(id))
  providerGates.get(id)!.resolve()
}
await Promise.all(pipelines)
assert.equal(maxPreparations, 2)
assert.equal(maxSwarmConcurrentProviderCalls, 1)
// Provider execution is measured independently from placement and cannot be
// inflated by an unrelated sibling that finishes much later.
const timing = backend.generationTimingForRecord({
  queuedAt: 1_000, preparationStartedAt: 2_000, preparationCompletedAt: 4_000,
  providerWaitStartedAt: 4_000, providerStartedAt: 5_000, providerCompletedAt: 13_000,
  placementStartedAt: 13_100, placementCompletedAt: 13_250, completedAt: 13_250,
}, 61_000)
assert.deepEqual(Object.fromEntries(['dispatchQueueWaitMs', 'preparationMs', 'providerWaitMs', 'providerExecutionMs', 'placementWaitMs', 'placementMutationMs', 'totalMs'].map(key => [key, timing[key]])), {
  dispatchQueueWaitMs: 1_000, preparationMs: 2_000, providerWaitMs: 1_000, providerExecutionMs: 8_000,
  placementWaitMs: 100, placementMutationMs: 150, totalMs: 12_250,
})

// Gallery linkage and Reveal telemetry are no longer completion gates. This
// exercises the exact boundary sequence used by the completed export while the
// visual animation is deliberately still running after canonical placement.
const postGallery = backend.generationTimingForRecord({
  queuedAt: 1_000,
  parsingStartedAt: 2_000,
  parsingCompletedAt: 4_000,
  preparationStartedAt: 2_000,
  preparationCompletedAt: 4_000,
  providerWaitStartedAt: 4_000,
  providerRequestSentAt: 5_000,
  providerResultReceivedAt: 13_000,
  imagePersistedAt: 13_020,
  galleryLinkedAt: 13_030,
  placementLockAcquiredAt: 13_035,
  messageRereadAt: 13_036,
  markerReplacementStartedAt: 13_037,
  markerReplacementCommittedAt: 13_045,
  placementStartedAt: 13_035,
  placementCompletedAt: 13_050,
  completedAt: 13_050,
  visualSettlementStartedAt: 13_040,
  visualSettlementCompletedAt: 43_000,
}, 43_000)
assert.equal(postGallery.completedAt - postGallery.galleryLinkedAt, 20, 'gallery-linked image remained in settlement limbo')
assert.equal(postGallery.placementLockWaitMs, 5)
assert.equal(postGallery.markerReplacementMs, 8)
assert.equal(postGallery.totalMs, 12_050, 'post-completion Reveal time leaked into slot total')
assert(postGallery.visualSettlementCompletedAt > postGallery.completedAt, 'fixture did not prove non-blocking visual settlement')

console.log(`Progressive placement/performance smoke passed: A projected before B/C, sibling failure preserved, real markers pass latest-content ownership composition without host writes, gallery-to-complete ${postGallery.completedAt - postGallery.galleryLinkedAt}ms while Reveal settles later, preparations max ${maxPreparations}, Swarm max provider concurrency ${maxSwarmConcurrentProviderCalls}.`)
