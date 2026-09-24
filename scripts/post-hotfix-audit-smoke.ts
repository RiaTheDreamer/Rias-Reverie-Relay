// @ts-nocheck -- deterministic source/state contracts for the post-hotfix audit.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

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

const backendModule = await import('../src/backend')
const backend = readFileSync(new URL('../src/backend.ts', import.meta.url), 'utf8')
const frontend = readFileSync(new URL('../src/frontend.ts', import.meta.url), 'utf8')
const contracts = readFileSync(new URL('../src/contracts.ts', import.meta.url), 'utf8')
const narrative = readFileSync(new URL('../src/narrativeRegexAssets.ts', import.meta.url), 'utf8')

const abortSlice = backend.slice(backend.indexOf('export function freezeAndCancelUserRuntime'), backend.indexOf('function stateCueAuthorizedByCurrentScene'))
const freeze = abortSlice.indexOf('lane.handoffFrozen = true')
const rejectWaiters = abortSlice.indexOf('const waiters = lane.waiters.splice(0)')
const clearDeferred = abortSlice.indexOf('for (const registry of [deferredRegenerateRequests, deferredReparseRequests])')
const abortProvider = abortSlice.indexOf('abortImageStreamsForUser(userId)')
assert(freeze >= 0 && rejectWaiters > freeze && clearDeferred > rejectWaiters && abortProvider > clearDeferred, 'Global Abort All ordering is not freeze -> reject waiters -> clear deferred work -> abort provider')
assert.match(abortSlice, /runtime\.epoch \+= 1/)
assert.match(abortSlice, /broker\.waiters\.clear\(\)/)
const scanSlice = backend.slice(backend.indexOf('async function scanAndGenerate('), backend.indexOf('function clearIdleCancellationKeys'))
assert.match(scanSlice, /const automaticBatchAbortEpoch = currentUserAbortEpoch\(userId\)/)
assert.match(scanSlice, /userAbortEpoch: automaticBatchAbortEpoch/)
assert.match(scanSlice, /\(\) => automaticBatchAbortEpoch === currentUserAbortEpoch\(userId\)/)
assert.match(backend.slice(backend.indexOf('async function dispatchRelayJob'), backend.indexOf('function cancelRelayDispatchScope')), /userAbortEpoch !== currentUserAbortEpoch\(userId\)/)
assert.match(frontend, /action: 'abort_all'/)
assert.doesNotMatch(frontend.slice(frontend.indexOf('function abortActiveGeneration'), frontend.indexOf('function openDryRunReport')), /cancel_selected/)

let continueBatch = true
const batchStarts: number[] = []
await backendModule.runWithConcurrency([1, 2, 3, 4], 1, async (item: number) => {
  batchStarts.push(item)
  if (item === 1) continueBatch = false
}, () => continueBatch)
assert.deepEqual(batchStarts, [1], 'Abort-invalidated work already waiting inside a bounded batch was allowed to start')

for (const origin of [
  'new-response-auto', 'explicit-single-retry', 'explicit-generate-selected-pending', 'explicit-generate-all-pending',
  'explicit-regenerate', 'explicit-reparse', 'deferred-regenerate', 'deferred-reparse', 'automatic-recovery',
  'candidate-generation', 'illustrator-generation',
]) assert(backend.includes(`'${origin}'`), `missing provider-start origin: ${origin}`)
for (const field of ['previousSlotStatus', 'cancellationEpoch', 'authorizedSlotKey', 'followedAbort', 'elapsedSinceAbortAllMs']) assert(backend.includes(field), `missing provider-start diagnostic field: ${field}`)
assert.match(backend, /lane\.drainWatchdog = setTimeout/)
assert.match(backend, /providerOperationOrphaned = true/)
assert.match(backend, /automatic-drain-deadline/)

const retrySlice = backend.slice(backend.indexOf('async function handleRetryGalleryLink'), backend.indexOf('function numberParameter'))
assert.match(retrySlice, /retryMode = 'gallery-only'/)
assert.match(retrySlice, /generationSucceeded: true/)
assert.match(retrySlice, /retryBehavior: 'gallery-only-no-regeneration'/)
assert.doesNotMatch(retrySlice, /generateImage|runJob|regenerateSlot|reparseSlot|dispatchRelayJob/, 'Gallery-only retry can reach provider generation')
assert.match(frontend, /galleryLinks\.filter\(link => link\.status === 'pending'\)/)
assert.match(frontend, /Retry Gallery Link/)
assert.match(frontend, /will not regenerate it/)
assert.match(contracts, /retryMode\?: 'gallery-only'/)
assert.match(contracts, /galleryLinkRetryMode\?: 'gallery-only'/)
assert.match(frontend, /type: 'claim_gallery_link'/)
assert.match(frontend, /operationLeaseId/)
assert.match(backend, /add_to_gallery: false/)

const galleryLink: any = {
  id: 'gallery-lease', chatId: 'gallery-chat', characterId: 'character', imageId: 'image', imageUrl: '/image', caption: '',
  source: 'relay-slot', slotKey: 'slot', status: 'pending', attempts: 0, createdAt: 1, updatedAt: 1,
}
const firstClaim = backendModule.claimGalleryLinkOperation(galleryLink, 'frontend-a', 100, 50)
assert.equal(firstClaim.granted, true)
assert.equal(backendModule.claimGalleryLinkOperation(galleryLink, 'frontend-b', 110, 50).granted, false, 'a second frontend claimed the same Gallery fallback')
assert.equal(backendModule.settleGalleryLinkOperation(galleryLink, { sessionId: 'frontend-b', operationLeaseId: firstClaim.operationLeaseId, ok: true, galleryItemId: 'wrong' }, 120), 'stale')
assert.equal(backendModule.settleGalleryLinkOperation(galleryLink, { sessionId: 'frontend-a', operationLeaseId: firstClaim.operationLeaseId, ok: true, galleryItemId: 'gallery-item' }, 130), 'applied')
assert.equal(galleryLink.status, 'linked')
assert.equal(galleryLink.attempts, 1)
assert.equal(backendModule.settleGalleryLinkOperation(galleryLink, { sessionId: 'frontend-a', operationLeaseId: firstClaim.operationLeaseId, ok: true, galleryItemId: 'gallery-item' }, 140), 'duplicate')
assert.equal(galleryLink.attempts, 1, 'duplicate Gallery completion produced another logical attempt')

const failedGalleryLink: any = { ...galleryLink, id: 'gallery-failure', status: 'pending', attempts: 0, galleryItemId: undefined, operationLeaseId: undefined, operationLeaseSessionId: undefined, operationLeaseExpiresAt: undefined }
const failedClaim = backendModule.claimGalleryLinkOperation(failedGalleryLink, 'frontend-a', 200, 50)
assert.equal(backendModule.settleGalleryLinkOperation(failedGalleryLink, { sessionId: 'frontend-a', operationLeaseId: failedClaim.operationLeaseId, ok: false, error: 'Gallery unavailable' }, 210), 'applied')
const completedSlot: any = { status: 'completed', imageId: 'image', imageUrl: '/image' }
backendModule.applyGalleryLinkResultToSlot(completedSlot, failedGalleryLink, 210)
assert.equal(completedSlot.status, 'completed')
assert.equal(completedSlot.imageId, 'image')
assert.equal(completedSlot.galleryLinkStatus, 'failed')
assert.match(completedSlot.galleryLinkError, /Gallery unavailable/)

const driftedAuthoredProse = 'Before. <reverie-illustration request="generate" slot="canonical-prose-slot" aspect="4:3" cast="none"><visual_prompt>Current authored semantic request.</visual_prompt></reverie-illustration> After.'
const driftedJob: any = {
  chatId: 'chat', messageId: 'message', swipeId: 0, requestId: 'canonical-prose-slot', target: 'prose.illustration', count: 1,
  slots: ['canonical-prose-slot'], alt: 'scene', originalSceneBrief: 'Old request body.', originalNegativePrompt: '',
  originalRequestXml: '<reverie-illustration request="generate" slot="canonical-prose-slot"><visual_prompt>Old request body.</visual_prompt></reverie-illustration>',
}
const driftedResult: any = { slot: 'canonical-prose-slot', imageId: 'image-current', imageUrl: '/image-current', attemptNumber: 2 }
const reconciled = backendModule.composeInitialPlacementBatchContent(driftedAuthoredProse, [{ job: driftedJob, results: [driftedResult], replaceExisting: true }])
assert.equal(reconciled.failedEntries, undefined)
assert.match(reconciled.content, /Before\./)
assert.match(reconciled.content, /After\./)
assert.equal((reconciled.content.match(/reverie-relay:image/g) || []).length, 1, 'canonical request/slot reconciliation did not project exactly once')
const trulyMissing = backendModule.composeInitialPlacementBatchContent('Before. The authored request was intentionally removed. After.', [{ job: driftedJob, results: [driftedResult], replaceExisting: true }])
assert.equal(trulyMissing.failedEntries?.length, 1, 'true missing source did not remain fail-closed')

const migrated: any = backendModule.migrateRelayStateSnapshot({
  galleryLinks: {
    'gallery-durable': {
      id: 'gallery-durable', chatId: 'gallery-chat', characterId: 'character', imageId: 'image-existing', imageUrl: '/image-existing',
      caption: 'Existing image', source: 'relay-slot', slotKey: 'gallery-chat:message:0:request:slot', status: 'failed', attempts: 1,
      createdAt: 10, updatedAt: 20, lastAttemptAt: 19, retryMode: 'gallery-only', lastOperationSource: 'explicit-gallery-retry', error: 'REST unavailable',
    },
  },
})
assert.equal(migrated.galleryLinks['gallery-durable'].status, 'failed')
assert.equal(migrated.galleryLinks['gallery-durable'].imageId, 'image-existing')
assert.equal(migrated.galleryLinks['gallery-durable'].retryMode, 'gallery-only')
assert.equal(migrated.galleryLinks['gallery-durable'].lastOperationSource, 'explicit-gallery-retry')
assert.equal(migrated.galleryLinks['gallery-durable'].error, 'REST unavailable')

assert.match(narrative, /\.r65-thread>\.r65-media:not\(:has\(image_request,image_request_error,img,\.reverie-artifact-media,\.rrl-island,\.rrl-media-slot,\[data-reverie-lifecycle-card\]\)\)/)
for (const owner of ['dg-dramatic-media', 'r65-media', 'rv6-media', 'ru-media', 'ru-portrait', 'ru-secret-media', 'ru-thread-media', 'ra66-archive-media', 'rrcp-media', 'rrcp-photo-media', 'rrcp-wallpaper']) {
  assert(narrative.includes(`.${owner}>.rrl-island`), `${owner}: lifecycle reservation visibility selector missing`)
}

assert.equal(JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version, '0.2.8.7.10', 'audit follow-up version is not the authorized release')
console.log('Post-hotfix audit smoke passed: global abort ordering, complete provider origins, gallery-only durable retry, and reservation visibility are enforced.')
