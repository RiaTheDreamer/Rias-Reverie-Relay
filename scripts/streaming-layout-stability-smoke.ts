// @ts-nocheck -- Deterministic structural coverage for streaming layout-shift prevention.
import { readFileSync } from 'node:fs'
import { renderNativeSurfaceMarkup } from '../src/nativeSurfaces'
import { r45SupplementalSurfaceDefinitions } from '../src/r45SurfaceCatalog'
import { shippedSurfaceDefinitions } from '../src/shippedSurfaceDefinitions'
import type { CustomSurfaceStudioState } from '../src/contracts'

function assert(value: unknown, reason: string): asserts value { if (!value) throw new Error(reason) }

const definitions = [...shippedSurfaceDefinitions(1), ...r45SupplementalSurfaceDefinitions(1)]
const studio: CustomSurfaceStudioState = {
  definitions: Object.fromEntries(definitions.map(definition => [definition.surfaceId, definition])),
  activePresetIds: Object.fromEntries(definitions.map(definition => [definition.baseSurfaceId, definition.surfaceId])),
  collectionPresets: {}, rendererMode: 'relay', defaultShellMode: 'plain', colorMode: 'realistic',
  utilityInjectionEnabled: true, utilityInjectionPosition: 'after-chat-history', utilityTemplate: '',
  validationErrors: {}, lastInjectedModuleIds: [], lastInjectionAt: 0, lastInjectionSource: 'none',
  lastInjectionPosition: 'none', lastInjectionSummary: '', updatedAt: 1,
}

const request = (id: string, aspect: string) => `<image_request id="${id}" target="custom.artifact-media" slot="${id}" aspect="${aspect}" alt="Stable media"><scene_brief>Offline fixture.</scene_brief></image_request>`

function rendered(markup: string, records = []) {
  return renderNativeSurfaceMarkup(markup, studio, { chatId: 'layout', messageId: 'layout-message', autoGenerate: true, records }).content
}

function cardFor(content: string, requestId: string): string {
  const marker = `data-rrn-native-request="${requestId}"`
  const index = content.indexOf(marker)
  assert(index >= 0, `${requestId}: lifecycle card missing`)
  return content.slice(Math.max(0, content.lastIndexOf('<div class="rrl-card', index)), content.indexOf('</div><textarea', index) > 0 ? content.indexOf('</div><textarea', index) : content.length)
}

function assertStableSlot(content: string, requestId: string, ratio: string, state: string): void {
  const card = cardFor(content, requestId)
  assert(card.includes('class="rrl-media-slot"'), `${requestId}/${state}: missing stable media slot`)
  assert(card.includes(`data-aspect="${ratio}"`), `${requestId}/${state}: missing request aspect`)
  assert(card.includes(`--reverie-media-aspect:${ratio.replace(':', ' / ')}`), `${requestId}/${state}: missing reserved CSS ratio`)
  assert(card.includes(`data-rrn-live-status="${state}"`), `${requestId}/${state}: wrong card state`)
}

const pending = rendered(`Intro prose.${request('one', '1:1')}Still streaming.`)
assertStableSlot(pending, 'one', '1:1', 'preparing')

const queued = rendered(request('one', '1:1'), [{ requestId: 'one', slot: 'one', target: 'custom.artifact-media', status: 'queued', messageId: 'layout-message', requestAspect: '1:1' }])
assertStableSlot(queued, 'one', '1:1', 'queued')

const generating = rendered(request('wide', '16:9'), [{ requestId: 'wide', slot: 'wide', target: 'custom.artifact-media', status: 'generating', messageId: 'layout-message', requestAspect: '16:9' }])
assertStableSlot(generating, 'wide', '16:9', 'generating')

const failed = rendered(request('portrait', '3:4'), [{ requestId: 'portrait', slot: 'portrait', target: 'custom.artifact-media', status: 'failed', messageId: 'layout-message', requestAspect: '3:4', error: 'Mock failure' }])
assertStableSlot(failed, 'portrait', '3:4', 'failed')

const completed = rendered(request('portrait', '3:4'), [{ requestId: 'portrait', slot: 'portrait', target: 'custom.artifact-media', status: 'completed', messageId: 'layout-message', requestAspect: '3:4', imageUrl: '/mock/portrait.jpg', imageId: 'portrait-img' }])
assert(completed.includes('/mock/portrait.jpg') && completed.includes('class="rrl-resolved"'), 'completed image must replace the reservation')
assert(!completed.includes('data-rrn-native-request="portrait"') && !/Image completed|Regenerate|Reparse|Rescan/.test(completed), 'completed image must unmount lifecycle/status/action UI')

const retrySuccess = rendered(request('retry', '4:5'), [{ requestId: 'retry', slot: 'retry', target: 'custom.artifact-media', status: 'placement-repair-needed', messageId: 'layout-message', requestAspect: '4:5', pendingPlacement: { imageUrl: '/mock/retry.jpg' }, imageId: 'retry-img' }])
assertStableSlot(retrySuccess, 'retry', '4:5', 'placement-repair-needed')

const mixed = rendered(`${request('square', '1:1')}\nMiddle prose\n${request('wide', '16:9')}\n${request('tall', '9:16')}`, [
  { requestId: 'square', slot: 'square', target: 'custom.artifact-media', status: 'completed', messageId: 'layout-message', requestAspect: '1:1', imageUrl: '/mock/square.jpg' },
  { requestId: 'wide', slot: 'wide', target: 'custom.artifact-media', status: 'generating', messageId: 'layout-message', requestAspect: '16:9' },
  { requestId: 'tall', slot: 'tall', target: 'custom.artifact-media', status: 'queued', messageId: 'layout-message', requestAspect: '9:16' },
])
assert(mixed.includes('/mock/square.jpg') && !mixed.includes('data-rrn-native-request="square"'), 'completed mixed slot must render only its final image')
for (const [id, ratio, state] of [['wide', '16:9', 'generating'], ['tall', '9:16', 'queued']] as const) assertStableSlot(mixed, id, ratio, state)

const terminalSource = `Opening prose remains visible.\n${request('terminal', '4:3')}\nClosing prose remains visible.`
const terminalPending = rendered(terminalSource, [{ requestId: 'terminal', slot: 'terminal', target: 'custom.artifact-media', status: 'generating', messageId: 'layout-message', requestAspect: '4:3' }])
const terminalCompleted = rendered(terminalSource, [{ requestId: 'terminal', slot: 'terminal', target: 'custom.artifact-media', status: 'completed', messageId: 'layout-message', requestAspect: '4:3', imageUrl: '/mock/terminal.jpg' }])
for (const [state, content] of [['pending', terminalPending], ['completed', terminalCompleted]] as const) {
  assert(content.includes('Opening prose remains visible.') && content.includes('Closing prose remains visible.'), `${state}: terminal lifecycle transition removed surrounding prose`)
}
assertStableSlot(terminalPending, 'terminal', '4:3', 'generating')
assert(terminalCompleted.includes('/mock/terminal.jpg') && !terminalCompleted.includes('data-rrn-native-request="terminal"'), 'terminal completion must replace its reservation without status UI')

const syntheticProseMarker = '<scene_image pending="true" requestId="synthetic-prose" planId="synthetic-prose" anchor="paragraph">Generating scene illustration...</scene_image>'
const syntheticProseRecord = {
  key: 'layout:layout-message:0:synthetic-prose:illustration', requestId: 'synthetic-prose', slot: 'illustration', target: 'prose.illustration',
  status: 'generating', messageId: 'layout-message', swipeId: 0, requestAspect: '4:3', proseImageAlignment: 'right', proseImageSize: 'small',
}
const syntheticProsePending = rendered(syntheticProseMarker, [syntheticProseRecord])
assert(syntheticProsePending.includes('data-dgir-prose-projection="layout:layout-message:0:synthetic-prose:illustration"'), 'synthetic prose lifecycle must own a stable render-only projection')
assert(!syntheticProsePending.includes('data-dgir-prose-size=') && !syntheticProsePending.includes('--dgir-prose-image-width:'), 'synthetic prose projection must not freeze saved generation-time Image Size over the current live setting')
const syntheticProseCompleted = rendered(syntheticProseMarker, [{ ...syntheticProseRecord, status: 'completed', imageUrl: '/mock/synthetic-prose.jpg', imageId: 'synthetic-prose-image' }])
assert(syntheticProseCompleted.includes('/mock/synthetic-prose.jpg') && !syntheticProseCompleted.includes('--dgir-prose-image-width:'), 'completed synthetic prose image must inherit the current live Image Size')
const syntheticProseFull = rendered(syntheticProseMarker, [{ ...syntheticProseRecord, proseImageAlignment: 'center', proseImageSize: 'full' }])
assert(!syntheticProseFull.includes('data-dgir-prose-size="full"') && !syntheticProseFull.includes('--dgir-prose-image-width:100%'), 'stored full-width metadata must not override a later live Image Size change')

const phone = definitions.find(definition => definition.baseSurfaceId === 'smartphone')!
const phoneRendered = rendered(phone.sampleXml)
assert((phoneRendered.includes('data-reverie-r45-lifecycle-media="smartphone"') || phoneRendered.includes('data-rrn-native-request="phone-message-1"')) && phoneRendered.includes('class="rrl-media-slot"') && phoneRendered.includes('--reverie-media-aspect:4 / 3'), 'Smartphone pending media must reserve its 4:3 message-image slot inside the Surface')

const surfaceRequest = (id: string, aspect = '16:9') => `<image_request id="${id}" target="custom.artifact-media" slot="${id}" aspect="${aspect}"><scene_brief>Stable first-render fixture for ${id}.</scene_brief></image_request>`
const plotVectors = ['detonation', 'heartknife', 'wrongness', 'crash-in', 'matchstrike', 'reputation-fire', 'wildcard-collision']
const combinedFirstRender = `Ordinary prose before every Surface.
<reverie-illustration request="generate" slot="combined-prose" aspect="4:3" cast="none"><visual_prompt>Stable prose illustration.</visual_prompt></reverie-illustration>
[PARALLEL|Campus|shifting]
${['one', 'two', 'three'].map((key, index) => `[parallel_entry][text]Parallel thread ${index + 1}.[/text][parallel_media]${surfaceRequest(`combined-parallel-${key}`, '4:3')}[/parallel_media][/parallel_entry]`).join('')}
[parallel_context][trajectory]Three threads continue.[/trajectory][intersection]Their timing creates pressure.[/intersection][/parallel_context][/PARALLEL]
[SECRET|Lisa|She kept the letter.|Lisa][secret_media]${surfaceRequest('combined-secret')}[/secret_media][context]The envelope is hidden.[/context][pressure]Discovery changes trust.[/pressure][/SECRET]
[WORLD|Campus|Night][world_media]${surfaceRequest('combined-world')}[/world_media][world_detail]Wet stone reflects the lamps.[/world_detail][world_context][why_it_matters]The paths are exposed.[/why_it_matters][future_use]The gate closes at midnight.[/future_use][/world_context][/WORLD]
[[else security office]][else_media]${surfaceRequest('combined-off-stage')}[/else_media][else_scene]A guard rewinds the recording.[/else_scene][else_context][visibility]Reader only[/visibility][clock]Same night[/clock][knowledge]The cast does not know.[/knowledge][collision]The recording may be noticed.[/collision][/else_context][[/else]]
[SCENE|Library|Night|Rain][scene_media]${surfaceRequest('combined-scene-card')}[/scene_media][scene_detail]Rain ticks against the glass.[/scene_detail][scene_context][reason]The story moved indoors.[/reason][continuity]The red notebook remains open.[/continuity][/scene_context][/SCENE]
[Plot_Sparks][ID]combined-first-render[/ID][Lifecycle]Unused Plot Sparks dissolve after this response.[/Lifecycle]${plotVectors.map((vector, index) => `[Spark][Key]${String.fromCharCode(97 + index)}[/Key][Vector]${vector}[/Vector][Text]Plot branch ${index + 1}.[/Text][Media]<reverie-illustration request="generate" slot="combined-plot-${index + 1}" aspect="16:9" cast="none"><visual_prompt>Grounded continuation ${index + 1}.</visual_prompt></reverie-illustration>[/Media][/Spark]`).join('')}[/Plot_Sparks]
Ordinary prose after every Surface.`
const combinedRendered = rendered(combinedFirstRender)
const combinedIds = [
  'combined-prose',
  'combined-parallel-one', 'combined-parallel-two', 'combined-parallel-three',
  'combined-secret', 'combined-world', 'combined-off-stage', 'combined-scene-card',
  ...plotVectors.map((_, index) => `combined-plot-${index + 1}`),
]
assert(combinedIds.length === 15, 'combined first-render fixture inventory changed')
assert((combinedRendered.match(/<div class="rrl-card"[^>]*data-rrn-live-status="preparing"/g) || []).length === combinedIds.length, 'combined first render did not create one preparing Status Card per unresolved request')
assert((combinedRendered.match(/class="rrl-main"/g) || []).length === combinedIds.length, 'combined first render lost shared Status Card chrome inside one or more Surface families')
assert((combinedRendered.match(/class="rrl-media-skeleton rrl-generation-placeholder"/g) || []).length === combinedIds.length, 'combined first render did not reserve every unresolved Surface media footprint')
const firstCombinedCard = combinedRendered.indexOf('data-reverie-lifecycle-card="true"')
assert(firstCombinedCard > 0, 'combined first render lost its first lifecycle card')
assert(!combinedRendered.includes('data-reverie-lifecycle-style="release"'), 'combined first render must leave lifecycle CSS to the extension-owned mounted style path')
for (const id of combinedIds) assertStableSlot(combinedRendered, id, id.startsWith('combined-parallel') || id === 'combined-prose' ? '4:3' : '16:9', 'preparing')
assert(combinedRendered.includes('Ordinary prose before every Surface.') && combinedRendered.includes('Ordinary prose after every Surface.'), 'combined first render lost prose surrounding the Surface reservations')
assert(!/<(?:image_request|reverie-illustration)\b/i.test(combinedRendered), 'combined first render leaked raw image-control markup')

const completedMixedSource = `Opening prose.
<image_request id="mixed-prose" target="prose.illustration" slot="illustration" aspect="4:3" alt="Completed prose illustration"><scene_brief>Completed prose illustration.</scene_brief></image_request>
[SCENE|Library|Night|Rain][scene_media]${surfaceRequest('mixed-surface')}[/scene_media][scene_detail]Rain ticks against the glass.[/scene_detail][scene_context][reason]The story moved indoors.[/reason][continuity]The red notebook remains open.[/continuity][/scene_context][/SCENE]
Closing prose.`
const completedMixed = rendered(completedMixedSource, [
  { requestId: 'mixed-prose', slot: 'illustration', target: 'prose.illustration', status: 'completed', messageId: 'layout-message', requestAspect: '4:3', imageUrl: '/mock/mixed-prose.jpg', imageId: 'mixed-prose-image' },
  { requestId: 'mixed-surface', slot: 'mixed-surface', target: 'custom.artifact-media', status: 'completed', messageId: 'layout-message', requestAspect: '16:9', imageUrl: '/mock/mixed-surface.jpg', imageId: 'mixed-surface-image' },
])
assert(completedMixed.includes('/mock/mixed-prose.jpg') && completedMixed.includes('data-dgir-request-id="mixed-prose"'), 'adjacent bracket Surface stole the completed Prose Illustration insertion owner')
assert(completedMixed.includes('/mock/mixed-surface.jpg') && completedMixed.includes('data-dgir-request-id="mixed-surface"'), 'completed bracket Surface media did not insert through its own owner')
assert(completedMixed.includes('Opening prose.') && completedMixed.includes('Closing prose.'), 'mixed completed insertion damaged surrounding prose')
assert(completedMixed.includes('data-rrn-native-request="mixed-prose"'), 'completed prose illustration abandoned its stable lifecycle slot')
assert(!completedMixed.includes('data-rrn-native-request="mixed-surface"'), 'completed Surface media retained a pending Status Card')

const nativeSource = readFileSync(new URL('../src/nativeSurfaces.ts', import.meta.url), 'utf8')
assert(nativeSource.includes('hydrateParityRequests(block.markup, block.spec.id, renderContext)') && !nativeSource.includes("hydrateParityRequests(bracketNormalized.markup, 'message', renderContext)"), 'bracket hydration must not consume adjacent prose illustration anchors')
assert(nativeSource.includes('data-reverie-stable-media-slot="2"') && nativeSource.includes('overflow-anchor:none'), 'stable media CSS must ship with Relay media output')
assert(!/html\s*,\s*body[\s\S]{0,80}overflow-anchor\s*:\s*none/i.test(nativeSource), 'scroll anchoring must not be globally disabled')
assert(nativeSource.includes('.rrl-card{display:block;min-height:0;padding:0;border:0') && nativeSource.includes('rrl-generation-placeholder'), 'reserved media geometry must render through the shared placeholder shell')
assert(nativeSource.includes('@keyframes rr-regex-floating-particle') && nativeSource.includes('translate3d(var(--dx),var(--dy),0)'), 'reserved media glitter must use the approved Regex particle motion')
assert(!nativeSource.includes('animation:rrlSkeleton 2.2s') && !nativeSource.includes('transform:translateX(-42%)') && !nativeSource.includes('@keyframes rrlSparkleFall'), 'reserved media effect must not restore an older glint or shimmer')
assert(nativeSource.includes('.rrl-card:hover .rrl-actions') && nativeSource.includes('[data-rrn-live-status="failed"] .rrl-actions'), 'media controls must reveal on interaction and terminal failure')

const frontendSource = readFileSync(new URL('../src/frontend.ts', import.meta.url), 'utf8')
assert(frontendSource.includes('mediaSlot.dataset.rrnMediaState') && frontendSource.includes('slotImage.hidden = false'), 'frontend must mutate the existing stable media slot when image state changes')
assert(frontendSource.includes('record.pendingPlacement?.imageUrl || record.imageUrl') && frontendSource.includes('revealFinalImageWhenReady(card, slotImage, visualImageUrl'), 'placement-pending final pixels must hydrate and reveal in the existing slot before durable state projection')
assert(frontendSource.includes("current.status === 'placement-pending' || current.status === 'completed'") && frontendSource.includes("type: 'placement_visual_settled'"), 'the exact completed asset must retain frontend bind/hydration acknowledgement after durable projection commits')
assert(frontendSource.includes('requestedProjectionInvalidations') && frontendSource.includes('ctx.display?.invalidate([record.messageId])'), 'a missing mounted media owner must request one message-scoped repaint instead of waiting for page refresh')
assert(!frontendSource.includes('location.reload(') && !frontendSource.includes('window.location.reload('), 'first image visibility must not depend on page reload')
assert(frontendSource.includes('revealedFinalImageByRecord') && frontendSource.includes('rememberBoundedMap(revealedFinalImageByRecord'), 'a later host render must not replay Reveal for an image already revealed from pending state')
assert(frontendSource.includes("ctx.events.on('CHARACTER_MESSAGE_RENDERED'") && frontendSource.includes('bindInlineImages(messageId)'), 'final host render must reconcile only the rendered message')
assert(frontendSource.includes('hadMountedContent && root.childNodes.length === 0') && frontendSource.includes('Render reconciliation could not hydrate every expected media slot'), 'message-scoped render reconciliation must verify prose/root continuity and expected Relay media')
assert(frontendSource.includes('bindTimer = window.requestAnimationFrame') && !frontendSource.includes('setTimeout(() => { bindTimer = 0; bindInlineImages() }, 80)'), 'newly mounted prose media must reconcile before the next paint instead of flashing stale lifecycle UI')
assert(frontendSource.includes('tab.root.replaceChildren(root)') && !frontendSource.includes('tab.root.replaceChildren()\n    const root'), 'drawer panel replacement must be atomic instead of exposing an empty intermediate tree')
assert(frontendSource.includes("'[data-rr-kakao-color]'") && frontendSource.includes('applyKakaoColorBinding(row)'), 'frontend must restore sanitized Kakao color properties after host sanitization')
assert(frontendSource.includes('isProse && lifecycleImages.length') && frontendSource.includes('for (const image of authoredImages) image.remove()') && frontendSource.includes('stripHealthyCompletedLifecycleUi(card)'), 'frontend must preserve the completed prose slot, remove exact duplicates, and strip lifecycle chrome')
assert(frontendSource.includes('invalidateDisplayIfContractChanged') && (frontendSource.match(/ctx\.display\?\.invalidate\(\['\*'\]\)/g) || []).length === 1, 'slot-state updates must not wholesale-invalidate and remount every Surface')
assert(frontendSource.includes('ensureMountedLifecycleStyle(root)') && frontendSource.includes('reverieLifecycleStyleHost'), 'mounted Status Cards must receive extension-owned lifecycle CSS without transporting styles in message content')
assert(frontendSource.includes('ensureSyntheticProseProjection(record, root)') && frontendSource.includes('root.appendChild(projection)'), 'synthetic prose reservations must mount in-place without a host-message edit')
assert(frontendSource.includes("slotImage.loading = 'eager'") && frontendSource.includes("slotImage.setAttribute('fetchpriority', 'high')"), 'generated images must begin loading immediately instead of waiting on lazy-load heuristics')
assert(!frontendSource.includes('applyStoredProseImagePresentation') && frontendSource.includes('image.dataset.dgirProseSize = size'), 'Image Size must remain live without freezing saved per-record presentation')
assert(frontendSource.includes('[data-component="BubbleMessage"] > div[class*="bubble"] > div[class*="content"]:has(:is(img[alt="reverie-relay"], img[data-dgir-app="prose"]))') && frontendSource.includes('width: min(var(--dgir-prose-image-width, 66%), var(--dgir-bubble-image-inner-width)) !important;'), 'Full Width must restore the pre-Glass Relay-image owner chain instead of filling a constrained descendant')
assert(frontendSource.includes('[data-component="MessageContent"] p:has(:is(img[alt="reverie-relay"], img[data-dgir-app="prose"]))') && !frontendSource.includes('[data-component="MessageContent"] { width:'), 'Image Size may widen only Relay-image owners, never arbitrary MessageContent')
assert(nativeSource.includes('.dgir-prose-lifecycle-projection>.rrl-island{flex:0 1 var(--dgir-prose-image-width,66%)') && !nativeSource.includes('data-dgir-prose-size='), 'Status Cards must inherit the same live Image Size variables as completed prose images')
assert(nativeSource.includes('.rrn-media img{width:100%;height:100%;object-fit:var(--rrn-fit,contain)}'), 'prose width restoration must not alter Surface media sizing')
assert(frontendSource.includes('.dg-relay-orb-image-design[aria-busy="true"] .dg-relay-orb-icon') && frontendSource.includes('animation: dg-relay-orb-icon-spin'), 'image-design Orb must spin throughout every busy Relay phase')
assert(frontendSource.includes('records.some(record => isGenerationActiveStatus(record.status))') && !frontendSource.includes("candidateBatches.some(batch => batch.chatId === activeChatId && batch.status === 'processing') || records.some(record => isProcessing(record))"), 'placement-pending records must not animate the Orb as active Relay work')
assert(frontendSource.includes("item.source === 'analysis'") && frontendSource.includes("!['completed', 'failed', 'cancelled'].includes(item.stage)"), 'Sidecar Orb activity must come from the live Relay queue rather than stale historical logs')
assert(frontendSource.includes("message.type === 'queue_abort_ack'") && frontendSource.includes("status: 'discarded' as const"), 'Abort acknowledgement must terminalize optimistic Orb state immediately')

const backendSource = readFileSync(new URL('../src/backend.ts', import.meta.url), 'utf8')
assert(backendSource.includes('activeStreamingSurfaceChats.add(chatId)') && backendSource.includes('activeStreamingSurfaceChats.has(chatId)'), 'Surface discovery must wait until assistant streaming finishes')
const applySuccessSource = backendSource.slice(backendSource.indexOf('async function applyJobSuccess'), backendSource.indexOf('async function markGeneratedPlacementPending'))
assert(backendSource.includes('pendingPlacementBatches') && backendSource.includes('stageGeneratedPlacement(job, results') && backendSource.includes('commitInitialPlacementBatch(batch'), 'successful siblings must enter one message-scoped state-projection transaction')
assert(!applySuccessSource.includes('patchSwipeContent(') && !applySuccessSource.includes('spindle.chat.updateMessage('), 'an individual successful image must not persist or remount its host message')
const initialCommitSource = backendSource.slice(backendSource.indexOf('async function commitInitialPlacementBatch'), backendSource.indexOf('export function placementBatchKey'))
assert(!initialCommitSource.includes('patchSwipeContent(') && !initialCommitSource.includes('spindle.chat.updateMessage('), 'terminal initial placement must not emit MESSAGE_EDITED or remount the visible host message')
assert(initialCommitSource.includes('message_batch_projection_completed') && backendSource.includes('records: renderSnapshotRecords(state)'), 'completed media must finalize and reload from Relay state projection')
assert(backendSource.includes("record.triggerType === 'initial'") && backendSource.includes('!stateDrivenFailure'), 'one failed initial sibling must stay state-driven instead of forcing an extra host remount')
assert(backendSource.includes('hasPendingInitialPlacementSibling') && backendSource.includes("return `${relayQueueScope(userId)}:${job.chatId}:${job.messageId}:${job.swipeId}`"), 'initial siblings must wait behind one message/swipe projection transaction')
assert(frontendSource.includes('surfaceInteractionState') && frontendSource.includes("document.addEventListener('toggle', onSurfaceDisclosureToggle, true)") && frontendSource.includes("document.addEventListener('change', onSurfaceControlChange, true)"), 'unavoidable durable remounts must preserve open Surface disclosures and selected tabs')
assert(nativeSource.includes('`request-${input.requestId}`') && nativeSource.includes('data-reverie-stream-island'), 'one request identity must keep one stable stream island across lifecycle updates')
const renderProcessor = backendSource.slice(backendSource.indexOf("if (typeof registerMessageContentProcessor === 'function')"), backendSource.indexOf('const registerInterceptor'))
assert(renderProcessor.includes('hotFallbackRenderSnapshot(context.userId)') && !renderProcessor.includes('await Promise.all([\n          getState'), 'render-origin processing must never wait on state/config storage reads')
assert(renderProcessor.includes('recordFingerprint') && renderProcessor.includes('contentFingerprint(source)'), 'render cache identity must include both immutable message source and durable slot state')
assert(backendSource.includes('renderConfigurationFingerprint(current) !== renderConfigurationFingerprint(next)'), 'unrelated settings writes must not invalidate every rendered message')
const proseGenerationSource = backendSource.slice(backendSource.indexOf('async function generateProseIllustrationPlan'), backendSource.indexOf('async function removeProseIllustration'))
assert(!proseGenerationSource.includes('await patchSwipeContent(chatId, message, plan.swipeId, placement.content)'), 'Relay-Planned start must not rewrite and remount the host prose')
assert(!renderProcessor.includes('syntheticProseRecords') && !renderProcessor.includes('insertProseMarker(renderedContent, record.proseAnchor, record.originalRequestXml)'), 'synthetic prose lifecycle ticks must never rewrite the host render body or remount the prose')
assert(backendSource.includes("job.target === 'prose.illustration' && job.synthetic && job.proseAnchor"), 'synthetic placement verification must resolve its stored prose anchor when no persisted marker exists')
assert(!nativeSource.includes('.dgir-prose-lifecycle-projection[data-dgir-prose-size='), 'synthetic Status Cards must not retain a record-frozen size selector')

console.log('streaming layout stability smoke passed: stable reserved slots, state geometry, multi-image/aspect coverage, and frontend in-place binding verified.')
