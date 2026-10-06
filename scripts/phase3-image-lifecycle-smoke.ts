// @ts-nocheck -- Deterministic host-lifecycle harness; the repo intentionally omits Node ambient types.
import { readFileSync } from 'node:fs'
import { renderNativeSurfaceMarkup } from '../src/nativeSurfaces'
import { shippedSurfaceDefinitions } from '../src/shippedSurfaceDefinitions'
import { r45SupplementalSurfaceDefinitions } from '../src/r45SurfaceCatalog'
import { buildInstantIllustrationSource, createStreamingAssistantSnapshot } from '../src/instantIllustrationStream'

function assert(value: unknown, reason: string): asserts value { if (!value) throw new Error(reason) }

const backendEventNames: string[] = []
;(globalThis as any).spindle = {
  registerMessageContentProcessor() {}, registerMacro() {}, on(name: string) { backendEventNames.push(name) }, onFrontendMessage() {}, sendToFrontend() {},
  log: { info() {}, warn() {}, error() {} }, toast: { info() {}, success() {}, warning() {}, error() {} },
}
const backend = await import('../src/backend')
assert(!backendEventNames.includes('CHARACTER_MESSAGE_RENDERED'), 'opening an old chat must not dispatch Relay image or prose generation from a render event')
assert(backendEventNames.includes('MESSAGE_SENT') && backendEventNames.includes('GENERATION_ENDED'), 'fresh assistant message events must still be registered for automatic generation')
assert(!backend.hasFreshGenerationBoundary(['message-sent']), 'a replayed MESSAGE_SENT without a completed generation must not auto-dispatch historical request tags')
assert(backend.hasFreshGenerationBoundary(['message-sent', 'generation-ended']), 'a confirmed completed assistant generation must still authorize auto-dispatch')
assert(backend.withSwarmRegenerationSeed({ seed: 314159, steps: 24 }, 'swarmui', true).seed === -1, 'explicit Swarm regeneration must replace a fixed Native seed with -1')
assert(backend.withSwarmRegenerationSeed({ seed: 314159 }, 'swarmui', false).seed === 314159, 'ordinary generation must preserve the configured Swarm seed')
assert(backend.withSwarmRegenerationSeed({ seed: 314159 }, 'comfyui', true).seed === 314159, 'Swarm seed randomization must not affect other providers')
assert(backend.mergeDeferredRegisterOnly(undefined, true), 'a lone replay scan must remain register-only when deferred behind another scan')
assert(!backend.mergeDeferredRegisterOnly(true, false), 'a fresh/explicit authorized scan must not lose authorization when a replay scan is also deferred')
assert(backend.mergeDeferredRegisterOnly(true, true), 'duplicate replay scans must remain register-only after coalescing')
assert(!backend.mergeDeferredRegisterOnly(false, true), 'a later historical replay must not revoke an already authorized fresh scan')
assert(backend.mergeDeferredStreaming(undefined, true), 'a lone partial-stream scan must retain its streaming-only scope')
assert(backend.mergeDeferredStreaming(true, true), 'coalesced partial-stream scans must retain their streaming-only scope')
assert(!backend.mergeDeferredStreaming(true, false) && !backend.mergeDeferredStreaming(false, true), 'a completed scan must supersede streaming-only handling in either deferral order')

const streamedIllustrationTag = '<reverie-illustration request="generate" slot="instant-stream-smoke" aspect="4:3" cast="char"><visual_prompt>Mira slides the sugar bowl across the rainlit table.</visual_prompt></reverie-illustration>'
const streamedSource = buildInstantIllustrationSource(
  'Mira slides the sugar bowl across the rainlit table.\n\nMira slides the sugar bowl across the rainlit table.\n\nThe rain continues beyond the glass.',
  { fullMatch: streamedIllustrationTag, content: '<visual_prompt>Mira slides the sugar bowl across the rainlit table.</visual_prompt>' },
)
assert(streamedSource === `Mira slides the sugar bowl across the rainlit table.\n\n${streamedIllustrationTag}`, 'Instant must rebuild only the prose-before-tag plus the exact complete request from rendered stream text')
assert(buildInstantIllustrationSource('No matching request text here.', { fullMatch: streamedIllustrationTag, content: '<visual_prompt>Mira slides the sugar bowl across the rainlit table.</visual_prompt>' }) === null, 'Instant must fail closed when it cannot locate the request payload in the rendered message')
assert(buildInstantIllustrationSource('Mira slides the sugar bowl across the rainlit table. Preparing generation. The rain continues beyond the glass.', { fullMatch: streamedIllustrationTag, content: '<visual_prompt>Mira slides the sugar bowl across the rainlit table.</visual_prompt>' }, 'Mira slides the sugar bowl across the rainlit table.') === `Mira slides the sugar bowl across the rainlit table.\n\n${streamedIllustrationTag}`, 'Instant must anchor to the prose immediately before the rendered status-card island when request markup is hidden')
const streamSnapshot = createStreamingAssistantSnapshot('stream-message', 2)
assert(streamSnapshot.id === 'stream-message' && streamSnapshot.role === 'assistant' && streamSnapshot.swipe_id === 2 && streamSnapshot.is_user === false, 'early scan must validate a minimal assistant snapshot when the streaming message is not persisted yet')

const requestMarkup = (id: string) => `<image_request id="${id}" target="custom.artifact-media" slot="${id}"><scene_brief>${id}</scene_brief></image_request>`
const sourceContent = `Story before. ${requestMarkup('a')} Story middle. ${requestMarkup('b')} More story. ${requestMarkup('c')} Story after.`
let mountedProse = 'Story before. Story middle. More story. Story after.'
let persistedContent = sourceContent
let hostMutationCount = 0
const events: string[] = []
const visibleImages = new Set<string>()
const entries: any[] = []
const complete = (id: string) => {
  events.push(`generated-${id}`)
  visibleImages.add(id)
  entries.push({
    job: { chatId: 'phase3', messageId: 'message', swipeId: 0, requestId: id, target: 'custom.artifact-media', count: 1, slots: [id], alt: id, originalSceneBrief: id, originalNegativePrompt: '', originalRequestXml: requestMarkup(id), sourceContent },
    results: [{ slot: id, imageId: id, imageUrl: `/${id}.png` }],
  })
  assert(mountedProse === 'Story before. Story middle. More story. Story after.', `${id}: live hydration blanked or replaced mounted prose`)
}
complete('a')
assert(visibleImages.has('a') && !visibleImages.has('b') && !visibleImages.has('c'), 'A must hydrate before B/C complete')
complete('b')
assert(visibleImages.has('a') && visibleImages.has('b') && !visibleImages.has('c'), 'B must hydrate before C completes')
complete('c')
const transaction = backend.composeInitialPlacementBatchContent(persistedContent, entries)
assert(!transaction.error, transaction.error || 'three-image persistence composition failed')
persistedContent = transaction.content
hostMutationCount += 1
assert(hostMutationCount === 1, 'three successful siblings performed more than one canonical host mutation')
assert(persistedContent.includes('/a.png') && persistedContent.includes('/b.png') && persistedContent.includes('/c.png'), 'message-scoped persistence lost a successful sibling')

const definitions = [...shippedSurfaceDefinitions(1), ...r45SupplementalSurfaceDefinitions(1)]
const studio = {
  definitions: Object.fromEntries(definitions.map(definition => [definition.surfaceId, definition])),
  activePresetIds: Object.fromEntries(definitions.map(definition => [definition.baseSurfaceId, definition.surfaceId])),
  collectionPresets: {}, rendererMode: 'relay', defaultShellMode: 'plain', colorMode: 'realistic',
  utilityInjectionEnabled: true, utilityInjectionPosition: 'after-chat-history', utilityTemplate: '', validationErrors: {},
  lastInjectedModuleIds: [], lastInjectionAt: 0, lastInjectionSource: 'none', lastInjectionPosition: 'none', lastInjectionSummary: '', updatedAt: 1,
}
const request = '<image_request id="phase3" target="custom.artifact-media" slot="phase3" aspect="4:3"><scene_brief>Fixture</scene_brief></image_request>'
const render = (record: any) => renderNativeSurfaceMarkup(request, studio as any, { chatId: 'phase3', messageId: 'message', swipeId: 0, autoGenerate: true, generationPlaceholderEffect: 'glitter', records: [record] }).content
const pending = render({ key: 'phase3-key', requestId: 'phase3', slot: 'phase3', target: 'custom.artifact-media', messageId: 'message', swipeId: 0, status: 'placement-pending', requestAspect: '4:3', pendingPlacement: { imageId: 'asset', imageUrl: '/asset.png' } })
assert(pending.includes('data-rrn-live-status="placement-pending"') && pending.includes('data-rr-placeholder-effect="glitter"'), 'placement-pending must retain the selected placeholder effect')
const repair = render({ key: 'phase3-key', requestId: 'phase3', slot: 'phase3', target: 'custom.artifact-media', messageId: 'message', swipeId: 0, status: 'placement-repair-needed', requestAspect: '4:3', pendingPlacement: { imageId: 'asset', imageUrl: '/asset.png' } })
assert(repair.includes('/asset.png') && repair.includes('Repair / Reinsert') && !repair.includes('>Regenerate<'), 'placement repair must preserve the generated asset and expose placement-only recovery')
const completed = render({ key: 'phase3-key', requestId: 'phase3', slot: 'phase3', target: 'custom.artifact-media', messageId: 'message', swipeId: 0, status: 'completed', requestAspect: '4:3', imageId: 'asset', imageUrl: '/asset.png' })
assert(completed.includes('/asset.png') && !/Image completed|Ready|Regenerate|Reparse|Rescan|Repair \/ Reinsert/.test(completed), 'verified completion must collapse to final media only')

const frontend = readFileSync(new URL('../src/frontend.ts', import.meta.url), 'utf8')
const backendSource = readFileSync(new URL('../src/backend.ts', import.meta.url), 'utf8')
const nativeSource = readFileSync(new URL('../src/nativeSurfaces.ts', import.meta.url), 'utf8')
assert((frontend.match(/'Generation Placeholder Effect'/g) || []).length === 1 && frontend.indexOf("'Generation Placeholder Effect'") > frontend.indexOf('function renderProseSettings'), 'placeholder selector must exist once under Illustrator Settings')
assert(frontend.includes('function resolveLightboxAsset') && frontend.includes("source: 'pending-placement'") && frontend.includes('Export Diagnostic JSON'), 'lightbox diagnostics must resolve pending/repair assets independently of completed status')
assert(backendSource.includes('applyGeneration(state, record, pending') && backendSource.includes('record.placementFailure = undefined'), 'confirmed current placement must outrank stale repair state during reconciliation')
assert(backendSource.includes('mergeDeferredRegisterOnly(existingDeferred?.[6], registerOnly)') && backendSource.includes('sourceContent, deferredRegisterOnly, deferredStreaming]') && backendSource.includes('mergeDeferredStreaming(existingDeferred?.[7], streaming)'), 'deferred history scans must preserve their no-dispatch authorization and let a completed scan replace partial-stream scope')
assert(frontend.includes("type: 'scan_message', chatId, messageId, automatic: true") && backendSource.includes('payload.automatic === true'), 'render-time recovery scans must register historical slots without auto-dispatch')
assert(frontend.includes('buildInstantIllustrationSource(renderedText, payload, precedingAnchorText)') && frontend.includes('findInstantIllustrationAnchor(messageContent,') && frontend.includes('messagesApi.getRecent(16)') && !frontend.includes('messagesApi?.get !=='), 'Instant must anchor through shadow roots to its rendered status card and consume supported live-message APIs')
assert(backendSource.includes('if (!streaming) {') && backendSource.includes('reason: \'scan-and-generate\''), 'Instant scans must not block provider dispatch on completed-response Appearance Sidecar work')
assert(frontend.includes("phase: 'source-resolution'") && backendSource.includes("eventType: 'instant_stream_probe'"), 'Instant stream interception and paragraph-anchor resolution must be observable without logging prompt text')
assert(backendSource.includes('createStreamingAssistantSnapshot(messageId') && backendSource.includes("streaming && messageId && containsRelayRequestMarkup(sourceContent || '')"), 'Instant must accept a complete captured request before the assistant message is persisted, without writing partial host content')
assert(backendSource.includes("eventType: 'invalid_prose_illustration_schema'") && !backendSource.includes('invalidProseSchemaNotices'), 'Prose schema errors must remain diagnostic-only and lane-scoped')
assert(nativeSource.includes('.rrl-media-slot{box-shadow:0 2px 10px rgba(0,0,0,.12)') && !nativeSource.includes('.rrl-media-slot{box-shadow:0 16px 50px'), 'reservation shell must constrain downward shadow bleed')
assert(nativeSource.includes('`request-${input.requestId}`') && nativeSource.includes('data-reverie-stream-island'), 'request lifecycle must keep a stable stream-island identity')

console.log(`Phase 3 image lifecycle smoke passed: ${events.join(' -> ')} hydrated with prose continuously mounted; one canonical mutation retained all siblings; pending, repair, completion, Instant stream-source safety, diagnostics, schema isolation, and stable island contracts verified.`)
