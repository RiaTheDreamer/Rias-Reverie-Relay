// @ts-nocheck -- Deterministic contract coverage for the generation reservation appearance.
import { readFileSync } from 'node:fs'
import { normalizeGenerationPlaceholderEffect } from '../src/contracts'
import { lifecycleRuntimeCss, renderCompletedProseLifecycleProjection, renderNativeSurfaceMarkup } from '../src/nativeSurfaces'
import { renderNarrativeRegex } from '../src/narrativeRegexAssets'
import { r45SupplementalSurfaceDefinitions } from '../src/r45SurfaceCatalog'
import { shippedSurfaceDefinitions } from '../src/shippedSurfaceDefinitions'

function assert(value: unknown, reason: string): asserts value { if (!value) throw new Error(reason) }

const definitions = [...shippedSurfaceDefinitions(1), ...r45SupplementalSurfaceDefinitions(1)]
const studio = {
  definitions: Object.fromEntries(definitions.map(definition => [definition.surfaceId, definition])),
  activePresetIds: Object.fromEntries(definitions.map(definition => [definition.baseSurfaceId, definition.surfaceId])),
  collectionPresets: {}, rendererMode: 'relay', defaultShellMode: 'plain', colorMode: 'realistic',
  utilityInjectionEnabled: true, utilityInjectionPosition: 'after-chat-history', utilityTemplate: '', validationErrors: {},
  lastInjectedModuleIds: [], lastInjectionAt: 0, lastInjectionSource: 'none', lastInjectionPosition: 'none', lastInjectionSummary: '', updatedAt: 1,
}
const requestId = 'placeholder-contract'
const request = `<image_request id="${requestId}" target="custom.artifact-media" slot="${requestId}" aspect="4:3" alt="Reserved media"><scene_brief>Fixture.</scene_brief></image_request>`
const baseRecord = { key: `chat:message:0:${requestId}:${requestId}`, requestId, slot: requestId, target: 'custom.artifact-media', status: 'generating', messageId: 'message', swipeId: 0, requestAspect: '4:3' }

const withoutStyles = (content: string) => content.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')

const runtimeMarkup = (effect: string, status = 'generating', imageUrl?: string) => {
  const content = renderNativeSurfaceMarkup(request, studio as any, {
    chatId: 'chat', messageId: 'message', swipeId: 0, autoGenerate: true,
    generationPlaceholderEffect: effect as any,
    records: [{ ...baseRecord, status, imageUrl, imageId: imageUrl ? 'image-id' : undefined }],
  }).content
  return withoutStyles(content)
}

assert(normalizeGenerationPlaceholderEffect(undefined) === 'glitter', 'missing config must migrate to glitter')
assert(normalizeGenerationPlaceholderEffect('corrupt') === 'glitter', 'invalid config must fall back to glitter')
for (const effect of ['spinner', 'glitter', 'none', 'dream-orb'] as const) {
  assert(normalizeGenerationPlaceholderEffect(effect) === effect, `${effect}: config value must survive normalization/save-load`)
  const markup = runtimeMarkup(effect)
  assert(markup.includes(`data-rr-placeholder-effect="${effect}"`), `${effect}: active reservation must use selected effect`)
  assert(markup.includes('--reverie-media-aspect:4 / 3'), `${effect}: canonical reservation aspect footprint changed`)
  assert(markup.includes(`data-rrn-native-request="${requestId}"`) && markup.includes(`data-rrn-record-key="${baseRecord.key}"`), `${effect}: appearance changed slot/request identity`)
  assert(markup.includes('<div class="rrl-main">') && markup.includes('<strong class="rrl-title">Generating image</strong>') && markup.includes('<span class="rrl-status">Generating</span>'), `${effect}: active placeholder lost its shared Status Card chrome`)
  assert(!markup.includes('<button'), `${effect}: active placeholder must not expose recovery actions`)
  const spinner = (markup.match(/class="rr-spinner"/g) || []).length
  const glitter = (markup.match(/class="rr-regex-particles"/g) || []).length
  const orb = (markup.match(/class="rr-orb"/g) || []).length
  if (effect === 'spinner') assert(spinner === 1 && glitter === 0 && orb === 0, 'spinner mode must render spinner only')
  if (effect === 'glitter') assert(glitter === 1 && spinner === 0 && orb === 0 && (markup.match(/<i><\/i>/g) || []).length === 24, 'glitter mode must render exactly 24 Regex particles')
  if (effect === 'dream-orb') assert(orb === 1 && spinner === 0 && glitter === 0, 'dream-orb mode must render orb only')
  if (effect === 'none') assert(spinner === 0 && glitter === 0 && orb === 0 && /rrl-generation-placeholder[^>]*><\/div>/.test(markup), 'none mode must render an empty effect shell')
}

const activeRecord = (messageId: string, id: string, target = 'custom.artifact-media') => ({
  key: `chat:${messageId}:0:${id}:${id}`, chatId: 'chat', messageId, swipeId: 0, requestId: id, slot: id,
  target, targetApp: target === 'prose.illustration' ? 'prose' : 'custom', status: 'generating', requestAspect: target === 'prose.illustration' ? '16:9' : '1:1', createdAt: 1, updatedAt: 2,
})

const relationship = definitions.find(definition => definition.baseSurfaceId === 'relationship-map')!
const relationshipIds = [...relationship.sampleXml.matchAll(/<image_request\b[^>]*\bid="([^"]+)"/g)].map(match => match[1])
const relationshipRendered = withoutStyles(renderNativeSurfaceMarkup(relationship.sampleXml, studio as any, {
  chatId: 'chat', messageId: 'relationship-mounted-source', swipeId: 0, autoGenerate: true,
  generationPlaceholderEffect: 'glitter', records: relationshipIds.map(id => activeRecord('relationship-mounted-source', id)),
}).content)
assert(relationshipIds.length >= 3, 'Relationship Map fixture must exercise at least three portrait owners')
assert((relationshipRendered.match(/class="rrl-media-skeleton rrl-generation-placeholder"/g) || []).length === relationshipIds.length, 'Relationship Map did not retain one visible placeholder per portrait owner')
for (const id of relationshipIds) assert((relationshipRendered.match(new RegExp(`data-rrn-native-request="${id}"`, 'g')) || []).length === 1, `Relationship Map/${id}: portrait placeholder ownership changed`)

const plotIds = ['a', 'b', 'c', 'd', 'e', 'f', 'g'].map(key => `plot-spark-${key}-placeholder`)
const plotSource = `[Plot_Sparks][ID]placeholder-visibility[/ID][Lifecycle]Unused Plot Sparks dissolve after this response.[/Lifecycle]${plotIds.map((id, index) => `[Spark][Key]${String.fromCharCode(97 + index)}[/Key][Vector]${['detonation','heartknife','wrongness','crash-in','matchstrike','reputation-fire','wildcard-collision'][index]}[/Vector][Text]Plot branch ${index + 1}.[/Text][Media]<reverie-illustration request="generate" slot="${id}" aspect="16:9" cast="none"><visual_prompt>Grounded plot continuation ${index + 1}.</visual_prompt></reverie-illustration>[/Media][/Spark]`).join('')}[/Plot_Sparks]`
const plotHydrated = renderNativeSurfaceMarkup(plotSource, studio as any, {
  chatId: 'chat', messageId: 'plot-placeholder-source', swipeId: 0, autoGenerate: true,
  generationPlaceholderEffect: 'glitter', records: plotIds.map(id => activeRecord('plot-placeholder-source', id, 'prose.illustration')),
}).content
const plotRendered = withoutStyles(renderNarrativeRegex(plotHydrated, 'inline', 'plot-placeholder-source', { chatId: 'chat', swipeId: 0 }))
assert((plotRendered.match(/class="rrl-media-skeleton rrl-generation-placeholder"/g) || []).length === 7, 'Plot Sparks did not retain seven visible generated-media placeholders')
for (const id of plotIds) assert((plotRendered.match(new RegExp(`data-rrn-native-request="${id}"`, 'g')) || []).length === 1, `Plot Sparks/${id}: placeholder ownership changed`)

const completed = runtimeMarkup('glitter', 'completed', '/images/completed.png')
assert(!completed.includes('data-rr-placeholder-effect=') && completed.includes('/images/completed.png'), 'completed generation must remove the active effect and keep the image')
assert(!/Image completed|>Ready<|Regenerate|Reparse|Rescan|rrl-state-icon|rrl-detail|data-rrn-native-request/.test(completed), 'completed image must not retain lifecycle copy, controls, status icon, details, or reservation card')
const completedProse = renderCompletedProseLifecycleProjection({
  key: 'chat:prose:0:prose-a:prose-a', requestId: 'prose-a', messageId: 'prose', swipeId: 0,
  target: 'prose.illustration', slot: 'prose-a', status: 'completed',
  imageUrl: '/images/prose-a.png', requestAspect: '4:3',
}, { chatId: 'chat', messageId: 'prose', swipeId: 0, generationPlaceholderEffect: 'dream-orb' })
assert(completedProse.includes('data-dgir-prose-projection="chat:prose:0:prose-a:prose-a"') && completedProse.includes('data-rrn-native-request="prose-a"') && completedProse.includes('/images/prose-a.png') && completedProse.includes('data-rr-placeholder-effect="dream-orb"'), 'completed prose must rebuild its stable owner and selected effect from the record alone, without original request XML')
const retry = runtimeMarkup('dream-orb', 'generating')
assert(retry.includes('data-rr-placeholder-effect="dream-orb"'), 'retry returning to active state must restore selected effect')

const placementPaths = [
  {
    label: 'Prose Illustration',
    requestId: 'relay-planned-reservation',
    source: 'Prose before.\n\n<scene_image pending="true" requestId="relay-planned-reservation" planId="relay-planned-reservation" alt="Scene">Generating scene illustration...</scene_image>\n\nProse after.',
  },
  {
    label: 'Inline',
    requestId: 'inline-reservation',
    source: 'Prose before.\n\n<image_request id="inline-reservation" target="prose.illustration" slot="illustration" aspect="4:3"><scene_brief>Inline fixture.</scene_brief></image_request>\n\nProse after.',
  },
  {
    label: 'Model-Placed',
    requestId: 'model-placed-reservation',
    source: 'Prose before.\n\n<reverie-illustration request="generate" slot="model-placed-reservation" aspect="4:3" cast="none"><visual_prompt>Model-placed fixture.</visual_prompt></reverie-illustration>\n\nProse after.',
  },
] as const

function renderPlacementPath(path: typeof placementPaths[number], status: string, imageUrl?: string, recordsOverride?: any[], effect: 'spinner' | 'glitter' | 'none' | 'dream-orb' = 'glitter'): string {
  const record = {
    key: `chat:message:0:${path.requestId}:illustration`, requestId: path.requestId, slot: 'illustration',
    target: 'prose.illustration', status, messageId: 'message', swipeId: 0, requestAspect: '4:3',
    imageUrl, imageId: imageUrl ? `${path.requestId}-image` : undefined, updatedAt: 20, attemptNumber: 2,
  }
  return withoutStyles(renderNativeSurfaceMarkup(path.source, studio as any, {
    chatId: 'chat', messageId: 'message', swipeId: 0, autoGenerate: true,
    generationPlaceholderEffect: effect, records: recordsOverride || [record],
  }).content)
}

for (const path of placementPaths) {
  const active = renderPlacementPath(path, 'generating')
  const reservation = active.indexOf('rrl-generation-placeholder')
  assert(reservation >= 0, `${path.label}: active generation must mount GenerationPlaceholder in the real reservation path`)
  assert(active.indexOf('rr-regex-particles', reservation) > reservation, `${path.label}: selected effect must render inside GenerationPlaceholder`)
  assert(active.indexOf('Prose before.') < reservation && active.indexOf('Prose after.') > reservation, `${path.label}: reservation must retain its exact prose position`)
  assert(!/Regenerate|Reparse|Rescan|Repair \/ Reinsert/.test(active), `${path.label}: active generation must not expose recovery controls`)

  const finished = renderPlacementPath(path, 'completed', `/images/${path.requestId}.png`)
  const finalImage = finished.indexOf(`/images/${path.requestId}.png`)
  assert(finalImage >= 0 && finished.includes('data-rr-placeholder-effect="glitter"') && finished.includes('data-rrn-native-request'), `${path.label}: completed render must retain its effect behind the decoded reveal inside the stable reservation`)
  assert(finished.indexOf('Prose before.') < finalImage && finished.indexOf('Prose after.') > finalImage, `${path.label}: normal prose following the image must remain normal prose`)
  assert(!/Image completed|>Ready<|Regenerate|Reparse|Rescan|Repair \/ Reinsert|rrl-state-icon|rrl-detail|rrl-main|rrl-actions/.test(finished), `${path.label}: healthy completion leaked prose-facing lifecycle chrome`)

  const failed = renderPlacementPath(path, 'failed')
  assert(/Regenerate/.test(failed) && /Reparse/.test(failed) && /Rescan/.test(failed), `${path.label}: genuine current failure must expose recovery controls`)
  const recovered = renderPlacementPath(path, 'completed', `/images/${path.requestId}-retry.png`)
  assert(!/Regenerate|Reparse|Rescan|Repair \/ Reinsert/.test(recovered), `${path.label}: successful retry must immediately remove failure-only controls`)

  const staleFailure = {
    key: `stale:${path.requestId}`, requestId: path.requestId, slot: 'illustration', target: 'prose.illustration',
    status: 'failed', messageId: 'message', swipeId: 0, updatedAt: 10, attemptNumber: 1,
  }
  const currentHealthy = {
    key: `current:${path.requestId}`, requestId: path.requestId, slot: 'illustration', target: 'prose.illustration',
    status: 'completed', messageId: 'message', swipeId: 0, requestAspect: '4:3', updatedAt: 30, attemptNumber: 2,
    imageUrl: `/images/${path.requestId}-healthy.png`, imageId: `${path.requestId}-healthy`,
  }
  const staleProof = renderPlacementPath(path, 'completed', currentHealthy.imageUrl, [staleFailure, currentHealthy])
  assert(staleProof.includes(currentHealthy.imageUrl) && !/Regenerate|Reparse|Rescan|Repair \/ Reinsert/.test(staleProof), `${path.label}: stale previous failure must not override the current healthy slot`)
}

for (const effect of ['spinner', 'glitter', 'none', 'dream-orb'] as const) {
  const finished = renderPlacementPath(placementPaths[1], 'completed', '/images/inline-reservation.png', undefined, effect)
  assert(finished.includes(`data-rr-placeholder-effect="${effect}"`), `${effect}: completed prose slot did not carry the selected effect into its decode handoff`)
}

const healthyReload = 'Prose before.\n\n![reverie-relay](/images/healthy-reload.png)\n\nProse after.'
const healthyReloadRendered = renderNativeSurfaceMarkup(healthyReload, studio as any, { chatId: 'chat', messageId: 'message', swipeId: 0, records: [] }).content
assert(healthyReloadRendered === healthyReload && !/Regenerate|Reparse|Rescan|Image completed|>Ready</.test(healthyReloadRendered), 'healthy reload must remain image plus normal prose with no recovery or completion UI')

const staleErrorRequestId = 'recovered-after-error'
const staleErrorSource = `<image_request_error id="${staleErrorRequestId}" target="prose.illustration" slot="illustration" retryable="true">Older attempt failed.</image_request_error>`
const recoveredAfterError = withoutStyles(renderNativeSurfaceMarkup(staleErrorSource, studio as any, {
  chatId: 'chat', messageId: 'message', swipeId: 0, autoGenerate: true, generationPlaceholderEffect: 'glitter',
  records: [{ key: `current:${staleErrorRequestId}`, requestId: staleErrorRequestId, slot: 'illustration', target: 'prose.illustration', status: 'completed', messageId: 'message', swipeId: 0, updatedAt: 40, attemptNumber: 2, imageUrl: '/images/recovered-after-error.png', imageId: 'recovered-after-error-image' }],
}).content)
assert(recoveredAfterError.includes('/images/recovered-after-error.png') && !/Regenerate|Reparse|Rescan|Older attempt failed/.test(recoveredAfterError), 'stale error markup must not resurrect failure UI after the current retry succeeds')

const nativeSource = readFileSync(new URL('../src/nativeSurfaces.ts', import.meta.url), 'utf8')
assert(lifecycleRuntimeCss().includes('.rrl-generation-placeholder') && !lifecycleRuntimeCss().includes('<style'), 'real host stylesheet must own lifecycle placeholder CSS without detached message style tags')
assert(nativeSource.includes('linear-gradient(135deg,rgba(255,255,255,.045),rgba(255,255,255,.015)),var(--rr-bg)') && nativeSource.includes('backdrop-filter:blur(20px)') && nativeSource.includes('0 16px 50px rgba(0,0,0,.32)'), 'shared approved Dreamglass shell is missing')
assert(nativeSource.includes('.rrl-generation-placeholder .rr-regex-particles i{') && nativeSource.includes('pointer-events:none'), 'decorative particles must be scoped and ignore pointer input')
assert((nativeSource.match(/\.rrl-generation-placeholder \.rr-regex-particles i:nth-child\(/g) || []).length === 24, 'approved glitter particle values must contain exactly 24 rows')
assert(nativeSource.includes('animation:rr-spin 1.15s linear infinite') && nativeSource.includes('@keyframes rr-spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}'), 'spinner must rotate continuously through visually identical loop endpoints')
const approvedGlitterKeyframes = '@keyframes rr-regex-floating-particle{0%{opacity:0;transform:translate3d(0,10px,0) scale(.45)}18%{opacity:.72}55%{opacity:.94}100%{opacity:0;transform:translate3d(var(--dx),var(--dy),0) scale(1.18)}}'
assert(nativeSource.includes(approvedGlitterKeyframes), 'approved glitter keyframes or invisible positional-reset endpoints changed')
const glitterTimings = [...nativeSource.matchAll(/\.rrl-generation-placeholder \.rr-regex-particles i:nth-child\(\d+\)\{[^}]*--d:([\d.]+s);--delay:(-[\d.]+s)\}/g)]
assert(glitterTimings.length === 24, 'glitter must preserve all 24 staggered timing rows')
assert(new Set(glitterTimings.map(match => match[1])).size === 24 && glitterTimings.every(match => match[2].startsWith('-')), 'glitter must preserve varied durations and negative delays without a synchronized reset')
assert(nativeSource.includes('@keyframes rr-orb-float{0%,100%{transform:translateY(1px)}50%{transform:translateY(-3px)}}'), 'Dream Orb float loop endpoints must remain identical')
assert(nativeSource.includes('@keyframes rr-orb-breathe{0%,100%{scale:.97}50%{scale:1.025}}'), 'Dream Orb breathe loop endpoints must remain identical')
assert(nativeSource.includes('@keyframes rr-glint{0%,70%,100%{opacity:.25;transform:scale(.8)}82%{opacity:1;transform:scale(1.35)}}'), 'Dream Orb glint loop endpoints must remain identical')
assert(nativeSource.includes('animation:rr-glint 3.9s ease-in-out infinite') && nativeSource.includes('animation:rr-glint 5.1s ease-in-out -2s infinite'), 'Dream Orb glints must retain asynchronous continuous timing')
const reducedMotionCss = '@media(prefers-reduced-motion:reduce){.rrl-media-slot .rrl-slot-image.rrl-final-reveal,.rrl-final-reveal:not(.rrl-slot-image),.rrl-generation-placeholder .rr-spinner,.rrl-generation-placeholder .rr-orb,.rrl-generation-placeholder .rr-orb:before,.rrl-generation-placeholder .rr-orb:after{animation:none!important}.rrl-generation-placeholder .rr-regex-particles{display:block}.rrl-generation-placeholder .rr-regex-particles i{animation:none!important;opacity:.72;transform:none}}'
assert(nativeSource.includes(reducedMotionCss), 'reduced motion must stop animation while retaining a visible static glitter representation')
assert(!lifecycleRuntimeCss().includes('.rrl-generation-placeholder .rr-regex-particles{display:none}'), 'reduced motion must never erase the selected glitter placeholder')
assert(!nativeSource.includes('\ni{') && !nativeSource.includes('}i{'), 'unscoped global i selector is forbidden')

const frontendSource = readFileSync(new URL('../src/frontend.ts', import.meta.url), 'utf8')
const backendSource = readFileSync(new URL('../src/backend.ts', import.meta.url), 'utf8')
const patchConfigSource = frontendSource.slice(frontendSource.indexOf('function patchConfig('), frontendSource.indexOf('async function copyText('))
const placeholderSyncSource = frontendSource.slice(frontendSource.indexOf('function syncGenerationPlaceholderEffect('), frontendSource.indexOf('function applyGlobalInterfaceSettings('))
assert(patchConfigSource.includes("type: 'set_config'") && !/scan_message|regenerate_slot|generate_image/.test(patchConfigSource), 'appearance setting must persist without dispatching image work')
assert(frontendSource.includes('syncGenerationPlaceholderEffect') && frontendSource.includes('Array.from({ length: 24 }'), 'visible active placeholders must update in place')
assert(frontendSource.includes('ctx.dom.addStyle(lifecycleRuntimeCss())'), 'lifecycle CSS must be registered through the extension-owned host stylesheet')
assert(frontendSource.includes('stripHealthyCompletedLifecycleUi(card)') && frontendSource.includes('isProse && lifecycleImages.length') && frontendSource.includes('for (const image of authoredImages) image.remove()'), 'completion transition must strip lifecycle chrome and retain one canonical prose slot')
assert(frontendSource.includes('if (!ctx.connections?.list) return') && frontendSource.includes('const profiles = await ctx.connections.list()') && frontendSource.includes('parserConnections = frontendParserConnections ?? message.parserConnections'), 'parser and appearance selectors must recover credential-redacted profiles from the authenticated frontend API when backend context lookup is empty')
const finalRevealSource = frontendSource.slice(frontendSource.indexOf('type MediaCardUpdate ='), frontendSource.indexOf('const boundNarrativeControls'))
const finalRevealLifecycleSource = frontendSource.slice(frontendSource.indexOf('export async function settlePlacementVisualLifecycle'), frontendSource.indexOf('export function setup'))
const visualSessionSource = frontendSource.slice(frontendSource.indexOf('const sendFrontendSession ='), frontendSource.indexOf('const submissionId ='))
assert(finalRevealSource.includes('sawActiveLifecycle: boolean') && finalRevealSource.includes('revealedImageUrl?: string'), 'final reveal replay protection must stay card-scoped in the existing WeakMap state')
assert(frontendSource.includes('rememberBoundedMap(pendingFinalRevealByRecord, record.key, record.requestId') && frontendSource.includes('pendingFinalRevealByRecord.clear()') && frontendSource.includes('const shouldReveal = shouldStartFinalImageReveal({'), 'active lifecycle evidence must survive a Lumiverse card/media remount and reveal an already-hydrated new final URL exactly once')
assert(frontendSource.includes("record.status === 'placement-pending' && pendingRecordReveal") && frontendSource.includes('readyForReveal: !waitingForCompletedRender') && frontendSource.includes("mediaSlot.dataset.rrnMediaEmpty = waitingForCompletedRender || shouldReveal ? 'true' : 'false'"), 'all media must keep their selected effect through pending placement and until decoded final Reveal begins')
assert(frontendSource.includes("if (mediaSlot) mediaSlot.dataset.rrnMediaEmpty = 'false'"), 'decoded final Reveal must clear the media-empty marker when its effect yields to the image')
assert(frontendSource.includes('armProseRevealGuard(record)') && frontendSource.includes('disarmProseRevealGuard(expectedRecordKey, record.requestId)') && frontendSource.includes('visibility:hidden!important') && frontendSource.includes('display:grid!important;opacity:1!important'), 'a completed host remount must keep pixels covered and the effect present before its first paint')
assert(!nativeSource.includes('.rrl-media-slot[data-rrn-media-state="completed"] .rrl-generation-placeholder{display:none}') && nativeSource.includes('.rrl-media-slot[data-rrn-media-empty="false"] .rrl-media-skeleton') && nativeSource.includes("stableLifecycleMediaSlot(aspect, 'completed', input.title, resolved, false, input.context.generationPlaceholderEffect || 'glitter')"), 'fresh completion must keep its effect until Reveal while historical completed media hides its dormant effect')
assert(finalRevealLifecycleSource.includes('if (!image.complete || image.naturalWidth <= 0)') && finalRevealLifecycleSource.includes("image.addEventListener('load', onLoad") && finalRevealLifecycleSource.includes('await image.decode?.()') && finalRevealLifecycleSource.includes('image.naturalWidth <= 0'), 'final reveal must wait for a usable loaded and decoded image')
const revealKeyframeIndex = finalRevealLifecycleSource.indexOf("image.classList.add('rrl-final-reveal')")
assert(finalRevealLifecycleSource.includes('image.hidden = true') && revealKeyframeIndex >= 0 && finalRevealLifecycleSource.indexOf('image.hidden = false', revealKeyframeIndex) > revealKeyframeIndex, 'progressive image pixels must stay hidden until decode and the Reveal keyframe are both ready')
assert(finalRevealLifecycleSource.includes('if (reveal) image.hidden = true') && finalRevealLifecycleSource.includes('if (!matchesUrl(image.currentSrc || image.src, url)) image.src = url'), 'animated final image hydration must hide before assigning src')
assert(finalRevealSource.includes('card ? card.isConnected') && finalRevealSource.includes('image.isConnected') && finalRevealSource.includes('mediaCardUpdates.get(card) === update') && finalRevealSource.includes('urlMatches(image.currentSrc || image.src, expectedUrl)'), 'asynchronous reveal must reject stale cards, images, records, and URLs')
assert(finalRevealSource.includes("ctx.display?.invalidate(['*'])") && !finalRevealSource.includes('ctx.display?.invalidate([record.messageId])'), 'missing images must invalidate Lumiverse display output using its supported wildcard, not an inert message-id variable')
assert(frontendSource.includes('ensureCompletedProseProjection(record, root, completedProseImageUrl)') && frontendSource.includes('renderCompletedProseLifecycleProjection(record, {') && frontendSource.includes("template.content.querySelector<HTMLElement>('.dgir-prose-lifecycle-projection')"), 'fresh authored prose Markdown must return to the stable lifecycle owner before reveal even without original request XML')
assert(frontendSource.includes('mountAuthoredRevealEffect(image)') && frontendSource.includes('revealFinalImageWhenReady(null, image, visualImageUrl, record, null, authoredRevealOverlayByImage.get(image))') && finalRevealSource.includes('preserveGeometry: !card'), 'Core, Narrative and custom authored images must keep their effect through pending placement and reveal without collapsing geometry')
assert(finalRevealSource.includes("window.matchMedia?.('(prefers-reduced-motion: reduce)').matches") && finalRevealLifecycleSource.includes("image.addEventListener('animationend'") && finalRevealLifecycleSource.includes("image.classList.remove('rrl-final-reveal')"), 'final reveal must skip reduced motion and remove its one-shot class on animation end')
assert(finalRevealSource.includes("type: 'placement_visual_settled'") && finalRevealLifecycleSource.lastIndexOf('onSettled()') > finalRevealLifecycleSource.indexOf('await animationFinished'), 'normal-motion visual settlement ACK must occur only after animationend')
assert(!/MutationObserver|setInterval|setTimeout/.test(finalRevealLifecycleSource) && (visualSessionSource.match(/setInterval/g) || []).length === 1 && visualSessionSource.includes('sendFrontendSession(true, true)') && finalRevealSource.includes('PROJECTION_INVALIDATION_RETRY_MS'), 'final reveal must use event synchronization; missing-projection repair may use only its separate bounded retry timer')
assert(nativeSource.includes('.rrl-media-slot .rrl-slot-image[hidden]{display:none!important}') && nativeSource.includes('.rrl-media-slot .rrl-slot-image.rrl-final-reveal{animation:rrlFinalReveal 1.5s cubic-bezier(.16,1,.3,1) both;will-change:filter,opacity}') && nativeSource.includes('@keyframes rrlFinalReveal{from{opacity:.48;filter:blur(7px) brightness(.98)}to{opacity:1;filter:none}}'), 'lifecycle CSS must honor hidden before first paint and use a smoother, lower-cost unblur reveal')
assert(nativeSource.includes('@media(prefers-reduced-motion:reduce){.rrl-media-slot .rrl-slot-image.rrl-final-reveal') && nativeSource.includes('animation:none!important'), 'shared lifecycle CSS must disable the final reveal under reduced motion')
assert(frontendSource.includes('isFailureRecoveryStatus(record.status)') && !frontendSource.includes("record.status === 'completed'\n              ? [['regenerate'"), 'prose-facing recovery buttons must be driven only by current canonical failure state')
assert(backendSource.includes("'image_request_error', 'scene_image'") && nativeSource.includes('content.replace(/<scene_image\\b'), 'Relay-Planned scene_image reservations must enter the real native render path')
assert(frontendSource.includes('openLightbox(current)') && frontendSource.includes('renderActionButtons(record'), 'established image actions must remain available through their existing proper UI')
assert(!/requestAnimationFrame|setInterval|setTimeout|animationstart|animationiteration/i.test(placeholderSyncSource), 'placeholder effects must remain CSS-only without timer or animation restart logic')

console.log('generation placeholder smoke passed: persistent four-mode config, active Status Card chrome, exact 24-particle glitter, seamless CSS loop contracts, lifecycle, identity, reduced motion, and in-place appearance updates verified.')
