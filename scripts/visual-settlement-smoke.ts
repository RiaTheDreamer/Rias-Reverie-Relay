// @ts-nocheck -- Deterministic DOM-event and placement-batch synchronization harness.
import { readFileSync } from 'node:fs'
function assert(value: unknown, reason: string): asserts value { if (!value) throw new Error(reason) }

;(globalThis as any).spindle = {
  registerMessageContentProcessor() {}, registerMacro() {}, on() {}, onFrontendMessage() {}, sendToFrontend() {},
  log: { info() {}, warn() {}, error() {} }, toast: { info() {}, success() {}, warning() {}, error() {} },
}

const backend = await import('../src/backend')
const { chooseReplacementProjectionOwner, concealPreviousLifecycleImage, currentLifecycleImageUrl, prepareFinalLifecycleImage, prepareRegeneratedLifecycleImage, restoreCompletedLifecycleImage, settlePlacementVisualLifecycle, shouldStartFinalImageReveal } = await import('../src/frontend')

assert(shouldStartFinalImageReveal({ imageChanged: false, sawActiveLifecycle: false, pendingRecordReveal: true, cardAlreadyRevealed: false, recordAlreadyRevealed: false }), 'a newly completed final URL already hydrated by a Lumiverse remount did not reveal')
assert(!shouldStartFinalImageReveal({ imageChanged: false, sawActiveLifecycle: false, pendingRecordReveal: true, cardAlreadyRevealed: false, recordAlreadyRevealed: false, readyForReveal: false }), 'a pending prose card started Reveal before the durable completed render')
assert(!shouldStartFinalImageReveal({ imageChanged: false, sawActiveLifecycle: false, pendingRecordReveal: false, cardAlreadyRevealed: false, recordAlreadyRevealed: false }), 'a historical completed image revealed during cold hydration')
assert(!shouldStartFinalImageReveal({ imageChanged: true, sawActiveLifecycle: true, pendingRecordReveal: true, cardAlreadyRevealed: false, recordAlreadyRevealed: true }), 'an already revealed record replayed its final animation')

const proseProjectionOwner = {} as HTMLElement
const lifecycleIslandOwner = {} as HTMLElement
const lifecycleCardOwner = {} as HTMLElement
const resolvedMediaOwner = {} as HTMLElement
const authoredImageOwner = {} as HTMLElement
assert(chooseReplacementProjectionOwner({ proseProjection: proseProjectionOwner, lifecycleIsland: lifecycleIslandOwner }) === proseProjectionOwner, 'prose regeneration must replace its complete projection owner')
assert(chooseReplacementProjectionOwner({ lifecycleIsland: lifecycleIslandOwner, lifecycleCard: lifecycleCardOwner, resolvedMedia: resolvedMediaOwner }) === lifecycleIslandOwner, 'card-backed regeneration must replace the whole island, not nest a second card inside the image figure')
assert(chooseReplacementProjectionOwner({ lifecycleCard: lifecycleCardOwner, resolvedMedia: resolvedMediaOwner }) === lifecycleCardOwner, 'a lifecycle card without an island must remain the replacement owner')
assert(chooseReplacementProjectionOwner({ resolvedMedia: resolvedMediaOwner, image: authoredImageOwner }) === resolvedMediaOwner, 'authored media outside a lifecycle card must preserve its media wrapper')
assert(chooseReplacementProjectionOwner({ image: authoredImageOwner }) === authoredImageOwner, 'authored images without a media wrapper must remain replaceable')

const regenerationTriggers = ['regenerate-same-settings', 'regenerate-current-settings', 'intent-regeneration']
for (const triggerType of regenerationTriggers) {
  for (const status of ['queued', 'parsing', 'provider-waiting', 'generating', 'previewing'] as const) {
    assert(currentLifecycleImageUrl({ status, triggerType, imageUrl: '/previous.png' }) === '', `${triggerType}/${status}: previous image must not be a live reveal candidate`)
  }
}
assert(currentLifecycleImageUrl({ status: 'placement-pending', triggerType: 'regenerate-same-settings', imageUrl: '/previous.png', pendingPlacement: { imageUrl: '/replacement.png' } as any }) === '/replacement.png', 'a freshly generated replacement must become visible only from its own pending-placement URL')
assert(currentLifecycleImageUrl({ status: 'placement-pending', triggerType: 'regenerate-same-settings', imageUrl: '/previous.png' }) === '', 'a replacement awaiting its new pending-placement URL must not flash the previous final image')
assert(currentLifecycleImageUrl({ status: 'completed', triggerType: 'regenerate-same-settings', imageUrl: '/replacement.png' }) === '/replacement.png', 'completed regeneration must expose the new final image')
assert(currentLifecycleImageUrl({ status: 'generating', triggerType: 'retry', imageUrl: '/previous.png' }) === '/previous.png', 'non-regeneration retry visibility behavior must remain unchanged')

class FakeClassList {
  values = new Set<string>()
  events: string[]
  constructor(events: string[]) { this.events = events }
  add(value: string) { this.values.add(value); this.events.push(`class-add:${value}`) }
  remove(value: string) { this.values.delete(value); this.events.push(`class-remove:${value}`) }
  contains(value: string) { return this.values.has(value) }
}

class FakeImage {
  complete = false
  naturalWidth = 0
  events: string[] = []
  private visibilityValue = ''
  style!: { visibility: string }
  classList = new FakeClassList(this.events)
  private hiddenValue = false
  private srcValue = ''
  constructor() {
    const owner = this
    this.style = Object.defineProperty({}, 'visibility', {
      get() { return owner.visibilityValue },
      set(value: string) { owner.visibilityValue = value; owner.events.push(`visibility:${value}`) },
    }) as { visibility: string }
  }
  get hidden() { return this.hiddenValue }
  set hidden(value: boolean) { this.hiddenValue = value; this.events.push(value ? 'hidden' : 'visible') }
  get src() { return this.srcValue }
  set src(value: string) { this.srcValue = value; this.events.push('src') }
  get currentSrc() { return this.srcValue }
  listeners = new Map<string, Set<(event: any) => void>>()
  addEventListener(type: string, listener: (event: any) => void) {
    const listeners = this.listeners.get(type) || new Set()
    listeners.add(listener)
    this.listeners.set(type, listeners)
  }
  removeEventListener(type: string, listener: (event: any) => void) { this.listeners.get(type)?.delete(listener) }
  dispatch(type: string) { for (const listener of [...(this.listeners.get(type) || [])]) listener({ type, target: this }) }
  async decode() { this.events.push('decode') }
}

async function flushMicrotasks() { await Promise.resolve(); await Promise.resolve(); await Promise.resolve() }

const normalImage = new FakeImage()
prepareFinalLifecycleImage(normalImage as any, '/final.png', true, (current, expected) => current === expected)
assert(normalImage.hidden && normalImage.events.indexOf('hidden') < normalImage.events.indexOf('src'), 'animated hydration must hide the image before assigning its final URL')
let normalCurrent = true
let normalAcks = 0
const normal = settlePlacementVisualLifecycle({
  image: normalImage as any,
  isCurrent: () => normalCurrent,
  reducedMotion: false,
  onRevealStart: () => { normalImage.events.push('reveal-start') },
  onSettled: () => { normalImage.events.push('ack'); normalAcks += 1 },
})
assert(normalAcks === 0 && !normalImage.classList.contains('rrl-final-reveal') && normalImage.hidden, 'normal motion must keep the incomplete image hidden before reveal readiness')
normalImage.complete = true
normalImage.naturalWidth = 1280
normalImage.dispatch('load')
await flushMicrotasks()
assert(normalImage.events.includes('decode'), 'normal motion did not decode the loaded image')
assert(normalImage.classList.contains('rrl-final-reveal'), 'normal motion did not attach the Reveal class after decode')
assert(!normalImage.hidden, 'decoded final image did not become visible when Reveal began')
assert(normalAcks === 0, 'normal motion ACKed before animationend')
normalImage.dispatch('animationend')
assert(await normal === 'settled', 'normal motion did not settle after animationend')
assert(normalAcks === 1 && !normalImage.classList.contains('rrl-final-reveal'), 'normal motion must remove Reveal and ACK exactly once after animationend')
assert(normalImage.events.indexOf('decode') < normalImage.events.indexOf('class-add:rrl-final-reveal') && normalImage.events.indexOf('class-add:rrl-final-reveal') < normalImage.events.indexOf('reveal-start') && normalImage.events.indexOf('reveal-start') < normalImage.events.indexOf('visible') && normalImage.events.indexOf('visible') < normalImage.events.indexOf('ack'), 'completed motion must decode before releasing its effect guard, then reveal and ACK')

const staleImage = new FakeImage()
staleImage.complete = true
staleImage.naturalWidth = 640
let staleCurrent = true
let staleVisualAcks = 0
const staleVisual = settlePlacementVisualLifecycle({ image: staleImage as any, isCurrent: () => staleCurrent, reducedMotion: false, onSettled: () => { staleVisualAcks += 1 } })
await flushMicrotasks()
assert(staleImage.classList.contains('rrl-final-reveal'), 'stale callback fixture never began Reveal')
staleCurrent = false
staleImage.dispatch('animationend')
assert(await staleVisual === 'stale' && staleVisualAcks === 0, 'a replaced image node ACKed after becoming stale')

const oldRegenerationImage = new FakeImage()
oldRegenerationImage.src = '/previous.png'
oldRegenerationImage.complete = true
oldRegenerationImage.naturalWidth = 640
let oldRegenerationAcks = 0
const oldRegenerationReveal = settlePlacementVisualLifecycle({
  image: oldRegenerationImage as any, isCurrent: () => true, reducedMotion: false,
  onSettled: () => { oldRegenerationAcks += 1 },
})
await flushMicrotasks()
assert(oldRegenerationImage.classList.contains('rrl-final-reveal'), 'previous completed image fixture did not begin its reveal')
concealPreviousLifecycleImage(oldRegenerationImage as any)
assert(oldRegenerationImage.style.visibility === 'hidden' && !oldRegenerationImage.classList.contains('rrl-final-reveal'), 'regeneration must conceal the old pixels and cancel their reveal class immediately')
oldRegenerationImage.dispatch('animationcancel')
assert(await oldRegenerationReveal === 'stale' && oldRegenerationAcks === 0, 'cancelled previous-image reveal must never settle or ACK as the replacement')
assert(oldRegenerationImage.style.visibility === 'hidden' && oldRegenerationImage.classList.contains('rrl-final-reveal') === false, 'the old reveal must remain permanently cancelled after its stale callback drains')

const replacementImage = new FakeImage()
prepareFinalLifecycleImage(replacementImage as any, '/replacement.png', true, (current, expected) => current === expected)
assert(replacementImage.hidden && replacementImage.events.indexOf('hidden') < replacementImage.events.indexOf('src'), 'replacement image must be hidden before its new URL is assigned')
replacementImage.complete = true
replacementImage.naturalWidth = 960
let replacementAcks = 0
const replacementReveal = settlePlacementVisualLifecycle({
  image: replacementImage as any, isCurrent: () => true, reducedMotion: false,
  onSettled: () => { replacementAcks += 1 },
})
await flushMicrotasks()
assert(replacementImage.classList.contains('rrl-final-reveal') && replacementAcks === 0, 'replacement image must get a fresh reveal after decode')
replacementImage.dispatch('animationend')
assert(await replacementReveal === 'settled' && replacementAcks === 1, 'new image reveal must settle exactly once after its own animation')

const regeneratedAuthoredImage = new FakeImage()
regeneratedAuthoredImage.src = '/previous-authored.png'
regeneratedAuthoredImage.complete = true
regeneratedAuthoredImage.naturalWidth = 960
prepareRegeneratedLifecycleImage(regeneratedAuthoredImage as any, '/replacement-authored.png', true, (current, expected) => current === expected)
assert(!regeneratedAuthoredImage.hidden && regeneratedAuthoredImage.style.visibility === 'hidden', 'regeneration must cover authored pixels without collapsing their media geometry')
assert(regeneratedAuthoredImage.events.lastIndexOf('visibility:hidden') < regeneratedAuthoredImage.events.lastIndexOf('src'), 'authored replacement URL was assigned before its stale pixels were covered')
// The frontend mounts the selected placeholder effect after restoring the live
// Surface wrapper. Keep it covered until decode; restore its original inline
// visibility only as the replacement reveal begins.
let regeneratedAuthoredAcks = 0
const regeneratedAuthoredReveal = settlePlacementVisualLifecycle({
  image: regeneratedAuthoredImage as any, isCurrent: () => true, reducedMotion: false, preserveGeometry: true, restoreVisibility: '',
  onSettled: () => { regeneratedAuthoredAcks += 1 },
})
await flushMicrotasks()
assert(regeneratedAuthoredImage.classList.contains('rrl-final-reveal') && regeneratedAuthoredImage.style.visibility === '' && regeneratedAuthoredAcks === 0, 'same authored Surface image node did not start a fresh reveal in its original layout box')
regeneratedAuthoredImage.dispatch('animationend')
assert(await regeneratedAuthoredReveal === 'settled' && regeneratedAuthoredAcks === 1, 'same-node regenerated image did not settle exactly once after its replacement reveal')

const remountedAuthoredImage = new FakeImage()
remountedAuthoredImage.src = '/replacement-after-remount.png'
remountedAuthoredImage.complete = true
remountedAuthoredImage.naturalWidth = 960
remountedAuthoredImage.style.visibility = 'hidden'
let remountedAuthoredAcks = 0
const remountedAuthoredReveal = settlePlacementVisualLifecycle({
  image: remountedAuthoredImage as any, isCurrent: () => true, reducedMotion: false, preserveGeometry: true,
  onSettled: () => { remountedAuthoredAcks += 1 },
})
await flushMicrotasks()
assert(remountedAuthoredImage.classList.contains('rrl-final-reveal') && remountedAuthoredImage.style.visibility === '', 'a remounted replacement inherited its temporary hidden cover as its permanent visibility')
remountedAuthoredImage.dispatch('animationend')
assert(await remountedAuthoredReveal === 'settled' && remountedAuthoredAcks === 1 && remountedAuthoredImage.style.visibility === '', 'remounted replacement did not remain visible after its reveal settled')

const coveredAuthoredImage = new FakeImage()
coveredAuthoredImage.src = '/replacement-covered.png'
coveredAuthoredImage.complete = true
coveredAuthoredImage.naturalWidth = 960
coveredAuthoredImage.style.visibility = 'hidden'
const coveredAuthoredReveal = settlePlacementVisualLifecycle({
  image: coveredAuthoredImage as any, isCurrent: () => true, reducedMotion: false, preserveGeometry: true, restoreVisibility: 'hidden',
  onSettled: () => {},
})
await flushMicrotasks()
assert(coveredAuthoredImage.style.visibility === '', 'a stale hidden visibility token kept the decoded replacement invisible during reveal')
coveredAuthoredImage.style.visibility = 'hidden'
coveredAuthoredImage.dispatch('animationend')
assert(await coveredAuthoredReveal === 'settled' && coveredAuthoredImage.style.visibility === '', 'a status update re-covered the current image before animation settlement')

const remountedCompletedCardImage = new FakeImage()
remountedCompletedCardImage.src = '/current-completed.png'
remountedCompletedCardImage.complete = true
remountedCompletedCardImage.naturalWidth = 960
remountedCompletedCardImage.hidden = true
remountedCompletedCardImage.style.visibility = 'hidden'
assert(!restoreCompletedLifecycleImage(remountedCompletedCardImage as any, '/other.png', (current, expected) => current === expected), 'reconciliation uncovered a stale image URL')
assert(restoreCompletedLifecycleImage(remountedCompletedCardImage as any, '/current-completed.png', (current, expected) => current === expected), 'completed current-URL image was not recovered after a cancelled remount reveal')
assert(!remountedCompletedCardImage.hidden && remountedCompletedCardImage.style.visibility === '', 'completed image remained covered after recovery')
assert(!restoreCompletedLifecycleImage(remountedCompletedCardImage as any, '/current-completed.png', (current, expected) => current === expected), 'already-visible completed image replayed recovery')
const frontendSource = readFileSync(new URL('../src/frontend.ts', import.meta.url), 'utf8')
const recoveryIndex = frontendSource.indexOf('restoreCompletedLifecycleImage(slotImage, visualImageUrl, urlMatches)')
const signatureSkipIndex = frontendSource.indexOf('if (update.signature === signature && previous === update) continue', recoveryIndex)
assert(recoveryIndex >= 0 && signatureSkipIndex > recoveryIndex, 'completed-image recovery must run before the unchanged-signature fast path')

const reducedImage = new FakeImage()
reducedImage.complete = true
reducedImage.naturalWidth = 800
let reducedAcks = 0
const reduced = await settlePlacementVisualLifecycle({ image: reducedImage as any, isCurrent: () => true, reducedMotion: true, onRevealStart: () => { reducedImage.events.push('reveal-start') }, onSettled: () => { reducedImage.events.push('ack'); reducedAcks += 1 } })
assert(reduced === 'settled' && reducedAcks === 1 && !reducedImage.hidden, 'reduced motion must reveal and ACK one stable decoded insertion')
assert(reducedImage.events.includes('decode') && !reducedImage.events.includes('class-add:rrl-final-reveal'), 'reduced motion must decode without starting a nonexistent animation')
assert(reducedImage.events.indexOf('reveal-start') < reducedImage.events.indexOf('visible'), 'reduced motion must release the placeholder before showing the decoded final image')

const authoredImage = new FakeImage()
authoredImage.complete = true
authoredImage.naturalWidth = 960
let authoredAcks = 0
const authored = settlePlacementVisualLifecycle({
  image: authoredImage as any, isCurrent: () => true, reducedMotion: false, preserveGeometry: true,
  onRevealStart: () => authoredImage.events.push('authored-reveal-start'),
  onSettled: () => { authoredAcks += 1 },
})
assert(!authoredImage.hidden && authoredImage.style.visibility === 'hidden', 'authored Core/Narrative/custom image must stay laid out while decode is pending')
await flushMicrotasks()
assert(!authoredImage.hidden && authoredImage.style.visibility === '' && authoredImage.classList.contains('rrl-final-reveal') && authoredAcks === 0, 'authored image must reveal in place without collapsing its media owner or ACKing early')
authoredImage.dispatch('animationend')
assert(await authored === 'settled' && authoredAcks === 1, 'authored image must settle only after its reveal completes')

const requestMarkup = (id: string) => `<image_request id="${id}" target="custom.artifact-media" slot="${id}"><scene_brief>${id}</scene_brief></image_request>`
const visual = (id: string, suffix = '1') => ({ key: `chat:message:0:${id}:${id}`, requestId: id, slot: id, imageUrl: `/${id}-${suffix}.png`, imageId: `${id}-${suffix}`, required: true, started: false, settled: false })
const entry = (id: string, suffix = '1') => ({
  job: { chatId: 'chat', messageId: 'message', swipeId: 0, requestId: id, target: 'custom.artifact-media', count: 1, slots: [id], alt: id, originalSceneBrief: id, originalNegativePrompt: '', originalRequestXml: requestMarkup(id), sourceContent: '' },
  results: [{ slot: id, imageId: `${id}-${suffix}`, imageUrl: `/${id}-${suffix}.png` }],
  visualSettlements: [visual(id, suffix)],
})
const batch = (...entries: any[]) => ({ chatId: 'chat', messageId: 'message', swipeId: 0, sourceFingerprint: 'source', entries })
const ack = (id: string, suffix = '1') => ({ chatId: 'chat', messageId: 'message', swipeId: 0, key: `chat:message:0:${id}:${id}`, requestId: id, slot: id, imageUrl: `/${id}-${suffix}.png`, imageId: `${id}-${suffix}` })
const gate = (fixture: any, hasGenerationSibling = false, hasVisibleFrontend = true, allowSafetyFallback = false, healthyStartedVisual = false) => backend.initialPlacementBatchCommitGate(fixture, { hasGenerationSibling, hasVisibleFrontend, allowSafetyFallback, healthyStartedVisual })

const one = batch(entry('a'))
assert(gate(one) === 'ready', 'Test A: visual presentation incorrectly blocked durable state projection')
assert(backend.markInitialPlacementVisualSettled(one, ack('a')) === 'settled' && gate(one) === 'ready', 'Test A: one matching ACK changed the non-blocking persistence gate')

const siblings = batch(entry('a'), entry('b'))
assert(backend.markInitialPlacementVisualSettled(siblings, ack('a')) === 'settled', 'Test B: A ACK was not recorded')
assert(gate(siblings, true) === 'ready', 'Test B: a ready Spark image must not wait for its generating siblings')
assert(gate(siblings, false) === 'ready', 'Test B: terminal siblings or visual settlement remained a persistence barrier')
assert(backend.markInitialPlacementVisualSettled(siblings, ack('b')) === 'settled' && gate(siblings) === 'ready', 'Test B: B ACK changed the non-blocking gate')

const failedSibling = batch(entry('a'), entry('c'))
assert(backend.markInitialPlacementVisualSettled(failedSibling, ack('a')) === 'settled', 'Test C: A ACK failed')
assert(backend.markInitialPlacementVisualSettled(failedSibling, ack('c')) === 'settled', 'Test C: C ACK failed')
assert(gate(failedSibling) === 'ready' && failedSibling.entries.every((item: any) => item.job.requestId !== 'b'), 'Test C: failed B incorrectly required a Reveal ACK or poisoned A/C')

const regenerated = batch(entry('a', '2'))
assert(backend.markInitialPlacementVisualSettled(regenerated, ack('a', '1')) === 'stale', 'Test D: late A1 ACK matched regenerated A2')
assert(backend.markInitialPlacementVisualSettled(regenerated, { ...ack('a', '2'), imageId: 'a-old-id' }) === 'stale', 'Test D: wrong image identity matched a reused image URL')
assert(gate(regenerated) === 'ready', 'Test D: regenerated visual incorrectly blocked persistence')
assert(backend.markInitialPlacementVisualSettled(regenerated, ack('a', '2')) === 'settled' && gate(regenerated) === 'ready', 'Test D: A2 did not accept its own telemetry ACK')

const duplicate = batch(entry('a'))
assert(backend.markInitialPlacementVisualSettled(duplicate, ack('a')) === 'settled', 'Test E: first ACK did not settle')
assert(backend.markInitialPlacementVisualSettled(duplicate, ack('a')) === 'duplicate' && gate(duplicate) === 'ready', 'Test E: duplicate ACK changed the settled result or blocked the transaction')

const disconnected = batch(entry('a'))
assert(gate(disconnected, false, false) === 'ready', 'Test G: disconnected/non-visible frontend could leave persistence stuck')
assert(gate(disconnected, false, true, true) === 'ready', 'Test G: bounded safety recovery could not release a vanished visual client')
const healthyStarted = batch(entry('a'))
assert(backend.markInitialPlacementVisualStarted(healthyStarted, ack('a')) === 'started', 'Test G: mounted visual lifecycle did not register as started')
assert(gate(healthyStarted, false, true, true, true) === 'ready', 'Test G: a healthy Reveal still blocked marker persistence')

const activePatch = backend.relayMediaPersistencePatch({ id: 'message', content: 'old', swipe_id: 0, swipes: ['old'] } as any, 0, 'composed A+B+C')
assert(activePatch.content === 'composed A+B+C' && activePatch.skipChunkRebuild === true && !('swipes' in activePatch), 'active-swipe persistence regressed from content-only + skipChunkRebuild')

console.log('visual settlement smoke passed: durable state projection is immediate; load/decode -> Reveal -> animationend remains exact-version, non-blocking telemetry with reduced-motion and stale callback safety.')
