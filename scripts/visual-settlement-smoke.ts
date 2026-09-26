// @ts-nocheck -- Deterministic DOM-event and placement-batch synchronization harness.
function assert(value: unknown, reason: string): asserts value { if (!value) throw new Error(reason) }

;(globalThis as any).spindle = {
  registerMessageContentProcessor() {}, registerMacro() {}, on() {}, onFrontendMessage() {}, sendToFrontend() {},
  log: { info() {}, warn() {}, error() {} }, toast: { info() {}, success() {}, warning() {}, error() {} },
}

const backend = await import('../src/backend')
const { prepareFinalLifecycleImage, settlePlacementVisualLifecycle, shouldStartFinalImageReveal } = await import('../src/frontend')

assert(shouldStartFinalImageReveal({ imageChanged: false, sawActiveLifecycle: false, pendingRecordReveal: true, cardAlreadyRevealed: false, recordAlreadyRevealed: false }), 'a newly completed final URL already hydrated by a Lumiverse remount did not reveal')
assert(!shouldStartFinalImageReveal({ imageChanged: false, sawActiveLifecycle: false, pendingRecordReveal: true, cardAlreadyRevealed: false, recordAlreadyRevealed: false, readyForReveal: false }), 'a pending prose card started Reveal before the durable completed render')
assert(!shouldStartFinalImageReveal({ imageChanged: false, sawActiveLifecycle: false, pendingRecordReveal: false, cardAlreadyRevealed: false, recordAlreadyRevealed: false }), 'a historical completed image revealed during cold hydration')
assert(!shouldStartFinalImageReveal({ imageChanged: true, sawActiveLifecycle: true, pendingRecordReveal: true, cardAlreadyRevealed: false, recordAlreadyRevealed: true }), 'an already revealed record replayed its final animation')

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
  style = { visibility: '' }
  events: string[] = []
  classList = new FakeClassList(this.events)
  private hiddenValue = false
  private srcValue = ''
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
