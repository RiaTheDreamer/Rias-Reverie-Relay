// @ts-nocheck -- this harness imports the built browser bundle into a mocked host.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { createHash } from 'node:crypto'

const root = resolve(import.meta.dirname, '..')
const builtFrontendPath = resolve(root, 'dist', 'frontend.js')
const assert = (value: unknown, message: string): asserts value => {
  if (!value) throw new Error(message)
}
const dataUrlHash = (url: string) => createHash('sha256').update(Buffer.from(url.slice(url.indexOf(',') + 1), 'base64')).digest('hex').toUpperCase()

class FakeStyle {
  setProperty(name: string, value: string): void { this[name] = value }
  removeProperty(name: string): void { delete this[name] }
}

class FakeClassList {
  private values = new Set<string>()
  add(...names: string[]): void { names.forEach(name => this.values.add(name)) }
  remove(...names: string[]): void { names.forEach(name => this.values.delete(name)) }
  contains(name: string): boolean { return this.values.has(name) }
  toggle(name: string, force?: boolean): boolean {
    const next = force ?? !this.values.has(name)
    if (next) this.values.add(name)
    else this.values.delete(name)
    return next
  }
}

class FakeElement {
  constructor(readonly tagName = 'div') {}
  listeners = new Map<string, Array<() => void>>()
  parentNode: FakeElement | null = null
  children: FakeElement[] = []
  className = ''
  classList = new FakeClassList()
  dataset: Record<string, string> = {}
  attributes: Record<string, string> = {}
  style = new FakeStyle()
  textContent = ''
  innerHTML = ''
  title = ''
  type = ''
  value = ''
  disabled = false
  hidden = false
  scrollTop = 0
  offsetWidth = 52
  offsetHeight = 52
  nodeType = 1
  shadowRoot: FakeElement | null = null
  get childNodes(): FakeElement[] { return this.children }
  getRootNode(): FakeElement {
    let root: FakeElement = this
    while (root.parentNode) root = root.parentNode
    return root
  }
  append(...nodes: FakeElement[]): void { nodes.forEach(node => this.appendChild(node)) }
  appendChild(node: FakeElement): FakeElement {
    node.parentNode = this
    this.children.push(node)
    return node
  }
  replaceChildren(...nodes: FakeElement[]): void {
    this.children = []
    this.append(...nodes)
  }
  remove(): void {
    if (this.parentNode) this.parentNode.children = this.parentNode.children.filter(child => child !== this)
    this.parentNode = null
  }
  contains(node: unknown): boolean { return node === this || this.children.some(child => child.contains(node)) }
  matches(): boolean { return false }
  closest(): null { return null }
  querySelector(selector: string): FakeElement | null { return this.querySelectorAll(selector)[0] || null }
  querySelectorAll(selector: string): FakeElement[] {
    const selectors = selector.split(',').map(value => value.trim()).filter(Boolean)
    const descendants = this.children.flatMap(child => [child, ...child.querySelectorAll('*')])
    if (selectors.includes('*')) return descendants
    const matches = (node: FakeElement, candidate: string): boolean => {
      const classMatch = /^\.([\w-]+)$/.exec(candidate)
      if (classMatch) return String(node.className).split(/\s+/).includes(classMatch[1])
      const attributeMatch = /^\[data-([\w-]+)(?:="([^"]*)")?\]$/.exec(candidate)
      if (attributeMatch) {
        const key = attributeMatch[1].replace(/-([a-z])/g, (_match, letter) => letter.toUpperCase())
        return key in node.dataset && (attributeMatch[2] === undefined || node.dataset[key] === attributeMatch[2])
      }
      return node.tagName.toLocaleLowerCase() === candidate.toLocaleLowerCase()
    }
    return descendants.filter(node => selectors.some(candidate => matches(node, candidate)))
  }
  setAttribute(name: string, value: string): void { this.attributes[name] = String(value) }
  getAttribute(name: string): string | null { return this.attributes[name] ?? null }
  removeAttribute(name: string): void { delete this.attributes[name] }
  addEventListener(name: string, handler: () => void): void { this.listeners.set(name, [...(this.listeners.get(name) || []), handler]) }
  click(): void { if (!this.disabled) for (const handler of this.listeners.get('click') || []) handler() }
  removeEventListener(): void {}
  focus(): void {}
  setPointerCapture(): void {}
  releasePointerCapture(): void {}
  getBoundingClientRect() { return { left: 0, top: 0, right: 52, bottom: 52, width: 52, height: 52 } }
}

class FakeMutationObserver {
  static instances: FakeMutationObserver[] = []
  observed = false
  disconnected = false
  constructor(private readonly callback: () => void) { FakeMutationObserver.instances.push(this) }
  observe(): void { this.observed = true }
  disconnect(): void { this.disconnected = true }
}

const body = new FakeElement()
const documentMock = {
  body,
  documentElement: new FakeElement(),
  activeElement: null,
  createElement: (tagName: string) => new FakeElement(tagName),
  createDocumentFragment: () => new FakeElement(),
  addEventListener: () => {},
  removeEventListener: () => {},
  querySelector: (selector: string) => body.querySelector(selector),
  querySelectorAll: (selector: string) => body.querySelectorAll(selector),
}
const localStorageValues = new Map<string, string>()
const windowMock = Object.assign(globalThis, {
  document: documentMock,
  innerWidth: 1280,
  innerHeight: 720,
  location: { origin: 'https://relay.test' },
  localStorage: {
    getItem: (key: string) => localStorageValues.get(key) ?? null,
    setItem: (key: string, value: string) => { localStorageValues.set(key, value) },
    removeItem: (key: string) => { localStorageValues.delete(key) },
  },
  addEventListener: () => {},
  removeEventListener: () => {},
  setTimeout: () => 0,
  clearTimeout: () => {},
  setInterval: () => 0,
  clearInterval: () => {},
  matchMedia: () => ({ matches: false }),
})

Object.assign(globalThis, {
  window: windowMock,
  document: documentMock,
  HTMLElement: FakeElement,
  HTMLButtonElement: FakeElement,
  HTMLImageElement: FakeElement,
  Element: FakeElement,
  ShadowRoot: class {},
  Node: { TEXT_NODE: 3 },
  MutationObserver: FakeMutationObserver,
  requestAnimationFrame: (callback: () => void) => { callback(); return 0 },
  fetch: async () => ({ ok: false, status: 404, json: async () => ({}) }),
})

const builtFrontend = readFileSync(builtFrontendPath, 'utf8')
assert(!builtFrontend.includes('relay-sidebar-icon-white-transparent-20260927.png') && !builtFrontend.includes('relay-overview-emblem-20260927.png') && !builtFrontend.includes('relay-sidebar-icon-APPROVED-white-r3.png') && !builtFrontend.includes('relay-tab-icon-APPROVED-fullcolor-portal.png'), 'built frontend must not retain a runtime path to an approved PNG asset')
assert((builtFrontend.match(/data:image\/png;base64,/g) || []).length >= 3, 'built frontend must embed the sidebar, overview, and input-action PNG assets')

const drawerRegistrations: any[] = []
const inputRegistrations: any[] = []
const backendPayloads: unknown[] = []
const eventSubscriptions: string[] = []
const eventHandlers = new Map<string, Array<(event: any) => void>>()
const tagInterceptors: string[] = []
const invalidatedMessages: string[][] = []
let activeTagInterceptors = 0
let backendHandler: ((payload: unknown) => void) | null = null
let drawerActivations = 0
let drawerDestroyed = false
let stylesRegistered = 0
let stylesRemoved = 0

const drawer = {
  root: new FakeElement(),
  tabId: 'private-relay',
  setTitle: () => {},
  setShortName: () => {},
  setBadge: () => {},
  activate: () => { drawerActivations += 1 },
  destroy: () => { drawerDestroyed = true },
  onActivate: () => () => {},
}
const inputAction = (id: string) => {
  let clickHandler: (() => void) | null = null
  return {
    actionId: id,
    setLabel: () => {},
    setSubtitle: () => {},
    setEnabled: () => {},
    onClick: (handler: () => void) => { clickHandler = handler; return () => { clickHandler = null } },
    trigger: () => clickHandler?.(),
    destroy: () => {},
  }
}

const messageRoots = new Map<string, FakeElement>()
const ctx: any = {
  dom: {
    addStyle: () => { stylesRegistered += 1; return () => { stylesRemoved += 1 } },
    findMessageElement: (messageId: string) => messageRoots.get(messageId) || null,
    cleanup: () => {},
  },
  events: {
    on: (event: string, handler: (payload: any) => void) => {
      eventSubscriptions.push(event)
      eventHandlers.set(event, [...(eventHandlers.get(event) || []), handler])
      return () => eventHandlers.set(event, (eventHandlers.get(event) || []).filter(candidate => candidate !== handler))
    },
    emit: () => {},
  },
  ui: {
    registerDrawerTab: (options: any) => { drawerRegistrations.push(options); return drawer },
    registerInputBarAction: (options: any) => {
      const action = inputAction(options.id)
      inputRegistrations.push({ options, action })
      return action
    },
  },
  messages: {
    registerTagInterceptor: ({ tagName }: any) => {
      tagInterceptors.push(tagName)
      activeTagInterceptors += 1
      let active = true
      return () => {
        if (!active) return
        active = false
        activeTagInterceptors -= 1
      }
    },
  },
  getActiveChat: () => ({ chatId: 'boot-chat', characterId: 'boot-character' }),
  sendToBackend: (payload: unknown) => { backendPayloads.push(payload) },
  onBackendMessage: (handler: (payload: unknown) => void) => { backendHandler = handler; return () => { backendHandler = null } },
  display: { invalidate: (messageIds: string[]) => { invalidatedMessages.push([...messageIds]) } },
}

const moduleUrl = `${pathToFileURL(builtFrontendPath).href}?boot-smoke=${Date.now()}`
const frontendModule = await import(moduleUrl)
const cleanup = frontendModule.setup(ctx)
assert(typeof cleanup === 'function', 'built frontend setup must return its lifecycle cleanup')
assert(stylesRegistered === 2, 'frontend setup must register panel and lifecycle reservation styles')
assert(drawerRegistrations.length === 1 && drawerRegistrations[0].id === 'private-relay', 'frontend setup must register the Private Relay drawer tab')
assert(drawerRegistrations[0].shortName === 'Reverie', 'sidebar label must use Reverie without changing the private drawer identity')
assert(drawerRegistrations[0].title === "Ria's Reverie Relay" && drawerRegistrations[0].headerTitle === "Ria's Reverie Relay", 'dashboard and drawer header must use the requested Reverie name')
assert(inputRegistrations.length === 2, 'frontend setup must register both input-bar actions')
assert(inputRegistrations.some(entry => entry.options.id === 'open-private-relay'), 'Private Relay input-bar action must be registered')
assert(inputRegistrations.find(entry => entry.options.id === 'open-private-relay')!.options.label === "Open Ria's Reverie Relay", 'input action must match the dashboard branding')
assert(inputRegistrations.some(entry => entry.options.id === 'open-private-relay-surfaces'), 'Surface Registry input-bar action must be registered')
for (const registration of [...drawerRegistrations, ...inputRegistrations.map(entry => entry.options)]) {
  assert(typeof registration.iconUrl === 'string' && registration.iconUrl.startsWith('data:image/png;base64,'), `${registration.id} must receive an embedded PNG data URL`)
}
assert(dataUrlHash(drawerRegistrations[0].iconUrl) === '1D6B4B4A615DFF14BB87B215716DD265C6908C802CB6A7C1A5224E22CF269A46', 'drawer registration must receive the white transparent Relay emblem')
const frontendSource = readFileSync(new URL('../src/frontend.ts', import.meta.url), 'utf8')
assert(frontendSource.includes("button('Close', closePreviewWave"), 'pending image preview must provide an explicit Close button')
assert(frontendSource.includes(':not(.dg-router-panel img){visibility:hidden!important}'), 'prose reveal guard must not hide Relay preview/lightbox images')
assert(frontendSource.includes('nativeImageSettingsCacheChatId === requestedChatId'), 'Native identity cache must be scoped to the active chat')
assert(frontendSource.includes('message.chatId === activeChatId && config.autoRescanOnChatOpen'), 'auto-rescan must be scheduled only from the active chat state and enabled preference')
assert(frontendModule && frontendSource.includes('prismImage.src = REVERIE_RELAY_OVERVIEW_ICON_URL') && frontendSource.includes('.dg-router-panel .dg-prism.dg-prism-overview { border: 0 !important; border-radius: 0 !important; background: transparent !important; background-color: transparent !important; box-shadow: none !important; }'), 'overview panel must use its own supplied emblem without a frame')
assert(dataUrlHash(inputRegistrations.find(entry => entry.options.id === 'open-private-relay')!.options.iconUrl) === '6BE79BF8B0CCED1AB2109D6E8FB525417D9F394297BB89835F205DB2B6C7E6CB', 'Open Private Relay must use the approved full-color emblem')
assert(dataUrlHash(inputRegistrations.find(entry => entry.options.id === 'open-private-relay-surfaces')!.options.iconUrl) === '1D6B4B4A615DFF14BB87B215716DD265C6908C802CB6A7C1A5224E22CF269A46', 'Open Surface Registry must use the distinct white Relay emblem')
assert(backendHandler, 'frontend setup must subscribe to backend messages')
assert(['CHAT_SWITCHED', 'CHAT_CHANGED', 'MESSAGE_EDITED', 'MESSAGE_SWIPED', 'SWIPE_EDITED'].every(event => eventSubscriptions.includes(event)), 'frontend setup must register the expected chat lifecycle subscriptions')
assert(tagInterceptors.includes('character_profile') && tagInterceptors.includes('image_request'), 'frontend setup must register native Surface lifecycle interception')

inputRegistrations.find(entry => entry.options.id === 'open-private-relay').action.trigger()
inputRegistrations.find(entry => entry.options.id === 'open-private-relay-surfaces').action.trigger()
assert(drawerActivations === 2, 'both input-bar actions must activate the owning Relay drawer tab')

const bootState = {
  type: 'state',
  chatId: 'boot-chat',
  records: [],
  config: {
    enabled: true,
    enableRelayOrb: true,
    orbDesign: 'classic',
    orbSize: 'medium',
    orbPositionDesktop: { x: 0.86, y: 0.78 },
    orbPositionMobile: { x: 0.86, y: 0.78 },
    proseIllustratorSettings: {},
  },
  parserConnections: [], imageConnections: [], imageProviders: [], logs: [], candidateBatches: [],
  queueDirector: { pausedAfterCurrent: false, concurrencyLimit: 1, selectedKeys: [], jobStatuses: {} },
  assetLibrary: null, versionTrees: [], continuityVault: null, customSurfaces: null,
  proseIllustrator: null, backgroundQueue: null, galleryLinks: [], lastDryRun: null,
  lastGenerationBlockers: [], schemaVersion: 34, revision: 1, build: null,
}
backendHandler!(bootState)
assert(body.children.some(child => child.className.includes('dg-relay-orb')), 'Orb bootstrap must be reachable after the accepted config and chat state arrive')
assert(JSON.stringify(invalidatedMessages) === JSON.stringify([['*']]), 'first saved Surface state must invalidate any raw cold-start host render exactly once')

// Mount a real lifecycle card into the host harness, then drive the production
// state/bind path. This catches DOM hydration regressions that renderer-string
// assertions cannot see.
const mountedRoot = new FakeElement()
const mountedProjection = new FakeElement()
mountedProjection.className = 'dgir-prose-lifecycle-projection'
const mountedIsland = new FakeElement()
mountedIsland.className = 'rrl-island'
const mountedCard = new FakeElement()
mountedCard.className = 'rrl-card'
mountedCard.dataset.rrnNativeRequest = 'mounted-placeholder'
mountedCard.dataset.rrnRecordKey = 'boot-chat:boot-message:0:mounted-placeholder:mounted-placeholder'
const mountedMedia = new FakeElement()
mountedMedia.className = 'rrl-media-slot'
const mountedPlaceholder = new FakeElement()
mountedPlaceholder.className = 'rrl-media-skeleton rrl-generation-placeholder'
mountedPlaceholder.dataset.rrPlaceholderEffect = 'spinner'
mountedPlaceholder.appendChild(new FakeElement('span'))
mountedMedia.appendChild(mountedPlaceholder)
mountedCard.appendChild(mountedMedia)
const mountedMain = new FakeElement()
mountedMain.className = 'rrl-main'
const mountedTitle = new FakeElement('strong')
mountedTitle.className = 'rrl-title'
const mountedStatus = new FakeElement('span')
mountedStatus.className = 'rrl-status'
mountedMain.appendChild(mountedTitle)
mountedMain.appendChild(mountedStatus)
mountedCard.appendChild(mountedMain)
mountedIsland.appendChild(mountedCard)
mountedProjection.appendChild(mountedIsland)
mountedRoot.appendChild(mountedProjection)
messageRoots.set('boot-message', mountedRoot)
const mountedRecord = {
  key: mountedCard.dataset.rrnRecordKey, chatId: 'boot-chat', messageId: 'boot-message', swipeId: 0,
  requestId: 'mounted-placeholder', slot: 'mounted-placeholder', target: 'prose.illustration', targetApp: 'prose',
  status: 'generating', createdAt: Date.now(), updatedAt: Date.now(),
}
backendHandler!({
  ...bootState,
  revision: 2,
  records: [mountedRecord],
  config: { ...bootState.config, generationPlaceholderEffect: 'glitter' },
})
assert(body.querySelector('.dg-relay-orb')?.getAttribute('aria-busy') === 'true', 'Orb must animate while Relay generation is actively running')
assert(mountedRoot.contains(mountedCard) && mountedCard.contains(mountedMedia) && mountedMedia.contains(mountedPlaceholder), 'mounted active lifecycle reservation was remounted or removed')
const mountedLifecycleStyle = mountedRoot.querySelector('style')
assert(mountedLifecycleStyle?.textContent.includes('.rrl-card') && mountedLifecycleStyle.textContent.includes('.rrl-media-slot'), 'mounted message scope did not receive extension-owned lifecycle CSS')
assert(mountedCard.contains(mountedMain) && mountedStatus.textContent === 'Generating', 'mounted active Status Card chrome was removed or did not hydrate')
assert(mountedPlaceholder.dataset.rrPlaceholderEffect === 'glitter', 'mounted active placeholder did not hydrate the selected effect')
const mountedGlitter = mountedPlaceholder.querySelector('.rr-regex-particles')
assert(mountedGlitter && mountedGlitter.children.length === 24, 'mounted active placeholder did not hydrate the 24-particle glitter layer')

backendHandler!({ type: 'queue_abort_ack', abortedQueued: 0, abortedActive: 1, remoteCancelRequested: 0, alreadyStopped: 0 })
assert(body.querySelector('.dg-relay-orb')?.getAttribute('aria-busy') === 'false', 'Abort acknowledgement must stop the Orb immediately instead of allowing optimistic state to restart it')

backendHandler!({
  ...bootState,
  revision: 3,
  records: [{ ...mountedRecord, status: 'completed', imageId: 'mounted-image', imageUrl: '/mounted-image.png', updatedAt: Date.now() + 1 }],
  config: { ...bootState.config, generationPlaceholderEffect: 'glitter' },
})
assert(mountedCard.querySelector('.rrl-generation-placeholder'), 'completed mounted lifecycle dropped its selected effect before the final image decoded')
assert(mountedCard.querySelector('.rrl-main'), 'completed mounted lifecycle dropped Status Card chrome before Reveal began')
const mountedFinalImage = mountedMedia.querySelector('.rrl-slot-image') as any
assert(mountedRoot.contains(mountedProjection) && mountedProjection.contains(mountedIsland) && mountedIsland.contains(mountedCard) && mountedCard.contains(mountedMedia), 'completed prose image abandoned or remounted the stable lifecycle projection')
assert(mountedFinalImage && mountedFinalImage.src === '/mounted-image.png' && mountedFinalImage.hidden === true, 'completed prose image did not recreate in place and remain concealed until decode/reveal readiness')
assert(invalidatedMessages.length === 1, 'an already-mounted prose lifecycle slot triggered another host refresh')

// Missing projection repair is render-ack based, not a permanent one-shot
// latch. The first host paint may still omit the projection; that ACK must
// permit one bounded retry, after which the mounted slot hydrates in place.
const retryRoot = new FakeElement()
retryRoot.appendChild(new FakeElement('p'))
messageRoots.set('retry-message', retryRoot)
const retryRecord = {
  key: 'boot-chat:retry-message:0:retry:illustration', chatId: 'boot-chat', messageId: 'retry-message', swipeId: 0,
  requestId: 'retry', slot: 'illustration', target: 'prose.illustration', targetApp: 'prose', status: 'completed',
  imageId: 'retry-image', imageUrl: '/retry-image.png', createdAt: Date.now(), updatedAt: Date.now(),
}
backendHandler!({ ...bootState, revision: 4, records: [retryRecord] })
assert(JSON.stringify(invalidatedMessages) === JSON.stringify([['*'], ['*']]), 'missing prose projection did not request Lumiverse display invalidation')
for (const handler of eventHandlers.get('CHARACTER_MESSAGE_RENDERED') || []) handler({ chatId: 'boot-chat', messageId: 'retry-message' })
assert(JSON.stringify(invalidatedMessages) === JSON.stringify([['*'], ['*'], ['*']]), 'failed first host paint permanently latched projection invalidation')
const retryProjection = new FakeElement()
retryProjection.className = 'dgir-prose-lifecycle-projection'
const retryIsland = new FakeElement()
retryIsland.className = 'rrl-island'
const retryCard = new FakeElement()
retryCard.className = 'rrl-card'
retryCard.dataset.rrnNativeRequest = 'retry'
retryCard.dataset.rrnRecordKey = retryRecord.key
const retryMedia = new FakeElement()
retryMedia.className = 'rrl-media-slot'
retryCard.appendChild(retryMedia)
retryIsland.appendChild(retryCard)
retryProjection.appendChild(retryIsland)
retryRoot.appendChild(retryProjection)
for (const handler of eventHandlers.get('CHARACTER_MESSAGE_RENDERED') || []) handler({ chatId: 'boot-chat', messageId: 'retry-message' })
const retryImage = retryMedia.querySelector('.rrl-slot-image') as any
assert(retryImage?.src === '/retry-image.png' && retryImage.hidden === false, 'second host paint did not hydrate the expected final image')
assert(invalidatedMessages.length === 3, 'successful projection mount did not clear bounded invalidation state')
const duplicateRetryImage = new FakeElement('img') as any
duplicateRetryImage.src = '/retry-image.png'
duplicateRetryImage.currentSrc = '/retry-image.png'
retryRoot.appendChild(duplicateRetryImage)
for (const handler of eventHandlers.get('CHARACTER_MESSAGE_RENDERED') || []) handler({ chatId: 'boot-chat', messageId: 'retry-message' })
assert(!retryRoot.contains(duplicateRetryImage) && retryRoot.querySelectorAll('img').filter((image: any) => image.src === '/retry-image.png').length === 1, 'refresh reconciliation duplicated the already-live prose image')

backendHandler!({
  ...bootState,
  revision: 4,
  records: [{ ...mountedRecord, status: 'placement-pending', updatedAt: Date.now() + 2 }],
})
assert(body.querySelector('.dg-relay-orb')?.getAttribute('aria-busy') === 'false', 'placement-pending is waiting on the user and must not animate the Orb as Relay work')

// Realistic prose DOM: Relay may stamp and size only the bound illustration
// and its image wrapper. Live setting changes must not rewrite prose owners.
const proseRoot = new FakeElement('div')
const messageContent = new FakeElement('div')
messageContent.setAttribute('data-component', 'MessageContent')
const proseParagraph = new FakeElement('p')
const proseImageWrapper = new FakeElement('span')
const proseImage = new FakeElement('img') as any
proseImage.src = '/live-prose.png'
proseImage.currentSrc = '/live-prose.png'
proseImageWrapper.appendChild(proseImage)
proseParagraph.appendChild(proseImageWrapper)
messageContent.appendChild(proseParagraph)
const surfaceImage = new FakeElement('img') as any
surfaceImage.src = '/surface.png'
surfaceImage.currentSrc = '/surface.png'
messageContent.appendChild(surfaceImage)
proseRoot.appendChild(messageContent)
messageRoots.set('prose-message', proseRoot)
const proseRecord = {
  key: 'boot-chat:prose-message:0:prose:illustration', chatId: 'boot-chat', messageId: 'prose-message', swipeId: 0,
  requestId: 'prose', slot: 'illustration', target: 'prose.illustration', targetApp: 'prose', status: 'completed',
  imageId: 'prose-image', imageUrl: '/live-prose.png', createdAt: Date.now(), updatedAt: Date.now(),
}
const surfaceRecord = {
  key: 'boot-chat:prose-message:0:surface:media', chatId: 'boot-chat', messageId: 'prose-message', swipeId: 0,
  requestId: 'surface', slot: 'media', target: 'custom.artifact-media', targetApp: 'custom', status: 'completed',
  imageId: 'surface-image', imageUrl: '/surface.png', createdAt: Date.now(), updatedAt: Date.now(),
}
const proseOwnerStyleBefore = JSON.stringify({ paragraph: proseParagraph.style, messageContent: messageContent.style })
for (const [offset, imageSize] of ['small', 'medium', 'large', 'full'].entries()) {
  backendHandler!({
    ...bootState,
    revision: 5 + offset,
    records: [proseRecord, surfaceRecord],
    config: { ...bootState.config, proseIllustratorSettings: { imageSize, imageAlignment: 'center' } },
  })
  assert(proseImage.dataset.dgirApp === 'prose' && proseImage.dataset.dgirProseSize === imageSize, `${imageSize}: mounted prose image did not receive the live Image Size contract`)
  assert(!surfaceImage.dataset.dgirProseSize, `${imageSize}: Surface image inherited prose sizing metadata`)
  assert(JSON.stringify({ paragraph: proseParagraph.style, messageContent: messageContent.style }) === proseOwnerStyleBefore, `${imageSize}: Relay rewrote prose/MessageContent layout state`)
}

// A completed Core, Narrative, or custom media request can retain its pending
// Status Card without an authored fallback <img>. All three must hydrate that
// mounted slot directly; a host refresh must not be required to see the image.
for (const [index, targetApp] of ['core', 'narrative', 'custom'].entries()) {
  const surfaceMessageId = `live-${targetApp}-message`
  const requestId = `live-${targetApp}-media`
  const root = new FakeElement('div')
  const island = new FakeElement('div')
  island.className = 'rrl-island'
  const card = new FakeElement('div')
  card.className = 'rrl-card'
  card.dataset.rrnNativeRequest = requestId
  card.dataset.rrnRecordKey = `boot-chat:${surfaceMessageId}:0:${requestId}:${requestId}`
  const media = new FakeElement('div')
  media.className = 'rrl-media-slot'
  const effect = new FakeElement('div')
  effect.className = 'rrl-generation-placeholder'
  media.appendChild(effect)
  card.appendChild(media)
  island.appendChild(card)
  root.appendChild(island)
  messageRoots.set(surfaceMessageId, root)
  const base = {
    key: card.dataset.rrnRecordKey, chatId: 'boot-chat', messageId: surfaceMessageId, swipeId: 0,
    requestId, slot: requestId, target: 'custom.artifact-media', targetApp,
    createdAt: Date.now(), updatedAt: Date.now(),
  }
  backendHandler!({ ...bootState, revision: 10 + index * 2, records: [{ ...base, status: 'generating' }] })
  backendHandler!({ ...bootState, revision: 11 + index * 2, records: [{ ...base, status: 'completed', imageId: `image-${index}`, imageUrl: `/live-${targetApp}.png`, updatedAt: Date.now() + 1 }] })
  const image = media.querySelector('.rrl-slot-image') as any
  assert(root.contains(card) && card.contains(media) && image?.src === `/live-${targetApp}.png`, `${targetApp}: completed Surface did not hydrate its existing media slot without a refresh`)
  assert(image.hidden === true && media.dataset.rrnMediaEmpty === 'true' && media.contains(effect), `${targetApp}: placeholder vanished before decoded final Reveal could begin`)
  assert(invalidatedMessages.length === 3, `${targetApp}: mounted Surface card incorrectly requested host display invalidation`)
}

for (let tick = 0; tick < 8; tick += 1) await Promise.resolve()
assert(backendPayloads.some((payload: any) => payload?.type === 'list_state' && payload.chatId === 'boot-chat'), 'frontend setup must begin backend state synchronization')
cleanup()
assert(drawerDestroyed && stylesRemoved === 2, 'frontend cleanup must retire registered host resources')

// Separate bundled realms share a document but not globalThis. Simulate that
// split by hiding the first realm's global disposer: the document owner must
// still retire the old orb and interceptors before the replacement mounts.
const cleanupRealmA = frontendModule.setup(ctx)
backendHandler!(bootState)
assert(body.querySelectorAll('.dg-relay-orb').length === 1, 'first document realm must mount exactly one orb')
const realmAInterceptorCount = activeTagInterceptors
delete (globalThis as any).__REVERIE_RELAY_FRONTEND_DISPOSE__
const cleanupRealmB = frontendModule.setup(ctx)
backendHandler!(bootState)
assert(body.querySelectorAll('.dg-relay-orb').length === 1, 'replacement document realm must evict the stale orb before mounting')
assert(activeTagInterceptors === realmAInterceptorCount, 'replacement document realm must not stack lifecycle interceptors')
const replacementOrb = body.querySelector('.dg-relay-orb')
assert(replacementOrb && (replacementOrb.listeners.get('click') || []).length === 1, 'the surviving orb must have exactly one click handler')
cleanupRealmA()
assert(body.querySelectorAll('.dg-relay-orb').length === 1, 'stale realm cleanup must not remove the replacement orb')
cleanupRealmB()
assert(body.querySelectorAll('.dg-relay-orb').length === 0, 'replacement realm cleanup must remove its orb')
assert(activeTagInterceptors === 0, 'document realm cleanup must release every lifecycle interceptor')

// Real bundled UI handlers: controls must work outside a chat and paint the
// selection before any backend state echo (including a stale echo).
ctx.getActiveChat = () => ({ chatId: null, characterId: null })
const cleanupGlobal = frontendModule.setup(ctx)
for (let tick = 0; tick < 8; tick++) await Promise.resolve()
const globalState = {
  type: 'state', chatId: null, records: [], config: {
    enabled: true, enableRelayOrb: false, vaultStrength: 'off',
    proseIllustratorSettings: { appearanceMemoryEnabled: false, appearanceMemoryOverride: 'global' },
  },
  parserConnections: [], imageConnections: [], imageProviders: [], logs: [], candidateBatches: [],
  queueDirector: {}, assetLibrary: null, versionTrees: [], continuityVault: null, customSurfaces: null,
  proseIllustrator: null, backgroundQueue: null, galleryLinks: [], lastDryRun: null,
  lastGenerationBlockers: [], schemaVersion: 34, revision: 1, build: null,
}
backendHandler!(globalState)
const walk = (node: FakeElement): FakeElement[] => [node, ...node.children.flatMap(walk)]
const findButton = (label: string) => walk(drawer.root).find(node => node.type === 'button' && (node.textContent === label || node.children.some(child => child.textContent === label)))
findButton('Appearance')!.click()
for (const label of ['Low', 'Medium', 'Strong', 'Off']) {
  const control = findButton(label)
  assert(control && !control.disabled, `${label} must be available without a chat`)
  control.click()
  assert(findButton(`${label} Active`), `${label} must paint immediately before server confirmation`)
  assert(backendPayloads.some((payload: any) => payload.type === 'set_config' && payload.patch.vaultStrength === label.toLowerCase()), `${label} must dispatch a global preference`)
}
findButton('Strong')!.click()
backendHandler!({ ...globalState, revision: 2 })
assert(findButton('Strong Active'), 'a delayed state echo must not undo the pending Appearance strength')
backendHandler!({ ...globalState, config: { ...globalState.config, vaultStrength: 'strong' }, revision: 3 })
assert(findButton('Strong Active'), 'confirmation of the newest click must not revive an older pending selection')
const memoryControl = findButton('Memory Off')
assert(memoryControl && !memoryControl.disabled, 'Memory enable toggle must be available outside a chat')
memoryControl.click()
assert(findButton('Memory Active'), 'Memory enable must paint without waiting for a backend round trip')
cleanupGlobal()

// Slot Workflow must expose completed images that have been compacted out of
// the hot state. Keep routine state small, but page older thumbnails on demand.
ctx.getActiveChat = () => ({ chatId: 'boot-chat', characterId: 'boot-character' })
const cleanupArchivedSlots = frontendModule.setup(ctx)
backendHandler!(bootState)
assert(backendPayloads.some((payload: any) => payload?.type === 'completed_history_page' && payload.chatId === 'boot-chat' && payload.cursor === 0), 'Slots must request the first completed archive page')
const archivedRows = Array.from({ length: 26 }, (_unused, index) => ({
  key: `boot-chat:archive-message-${index}:0:request-${index}:slot-${index}`,
  chatId: 'boot-chat', messageId: `archive-message-${index}`, swipeId: 0,
  requestId: `request-${index}`, slot: `slot-${index}`, target: 'prose.illustration',
  imageId: `archive-image-${index}`, imageUrl: `/archive-image-${index}.png`, completedAt: 1_000 + index,
  diagnosticArchiveId: `completed-${index}`,
})).reverse()
const hotRecords = archivedRows.slice(0, 24).map(row => ({
  ...row, status: 'completed', imageIntent: 'auto', targetApp: 'illustrator',
  originalSceneBrief: '', originalNegativePrompt: '', originalRequestXml: '', alt: row.slot,
  caption: '', count: 1, requestAspect: '', createdAt: row.completedAt,
  discoveredAt: row.completedAt, registeredAt: row.completedAt, updatedAt: row.completedAt,
  history: [],
}))
backendHandler!({ ...bootState, revision: 2, records: hotRecords, stats: { discoveredTotal: 26, generatedTotal: 26, completedTotal: 26, failedTotal: 0, cancelledTotal: 0, completedByTarget: { 'prose.illustration': 26 }, updatedAt: 2_000 } })
backendHandler!({ type: 'completed_history_page', chatId: 'boot-chat', cursor: 0, limit: 24, rows: archivedRows.slice(0, 24), nextCursor: 24, total: 26, completedLifetime: 26 })
assert(backendPayloads.some((payload: any) => payload?.type === 'completed_history_page' && payload.cursor === 24), 'Slots must automatically skip the first archive page when it only duplicates hot records')
backendHandler!({ type: 'completed_history_page', chatId: 'boot-chat', cursor: 24, limit: 24, rows: archivedRows.slice(24), nextCursor: null, total: 26, completedLifetime: 26 })
backendHandler!({ type: 'completed_history_page', chatId: 'boot-chat', cursor: 24, limit: 24, rows: archivedRows.slice(24), nextCursor: null, total: 26, completedLifetime: 26 })
assert(drawer.root.querySelectorAll('.dg-slot-card').length === 24, 'Slots must retain all 24 hot cards')
assert(drawer.root.querySelectorAll('.dg-history-item').length === 2, 'Slots must display the two older completed images without duplicate page responses or hot cards')
const ghost = { ...hotRecords[23], status: 'recovered-pending', recoverySource: 'unresolved-request', imageUrl: undefined }
backendHandler!({ ...bootState, revision: 3, records: [...hotRecords.slice(0, 23), ghost], stats: { discoveredTotal: 26, generatedTotal: 26, completedTotal: 26, failedTotal: 0, cancelledTotal: 0, completedByTarget: { 'prose.illustration': 26 }, updatedAt: 2_000 } })
assert(drawer.root.querySelectorAll('.dg-slot-card').length === 23, 'An imageless rescan ghost must not appear as an extra hot slot')
assert(drawer.root.querySelectorAll('.dg-history-item').length === 3, 'The archived image must remain visible when a rescan ghost shares its key')
backendHandler!({ type: 'completed_history_page', chatId: 'some-other-chat', cursor: 0, limit: 24, rows: [], nextCursor: null, total: 0, completedLifetime: 0 })
assert(drawer.root.querySelectorAll('.dg-history-item').length === 3, 'A late page from another chat must not erase the visible archived images')
cleanupArchivedSlots()

// Prompt formats remain selectable without an inline tutorial/example panel.
const cleanupPromptFormats = frontendModule.setup(ctx)
backendHandler!({ ...bootState, config: { ...bootState.config, proseIllustratorSettings: { enabled: true, mode: 'inline-protocol', promptFormat: 'natural-language' } } })
findButton('Illustrations')!.click()
for (const label of ['Booru Tag Mode', 'Natural Language']) {
  const choice = findButton(label)
  assert(choice && !choice.disabled, `${label} must remain selectable`)
  choice.click()
  const formatPanel = walk(drawer.root).find(node => node.className === 'dg-section' && node.children.some(child => child.textContent === 'Image Prompt Format'))
  assert(formatPanel && formatPanel.children.length === 2, `${label}: format section must contain only its heading and choice controls`)
  assert(!walk(formatPanel).some(node => node.textContent.startsWith('Image request:')), `${label}: inline example explanation must not return`)
}
cleanupPromptFormats()

// The host invalidates a frontend generation before invoking its disposer.
// A rejected disconnect notification must not strand document observers.
const cleanupInactiveHost = frontendModule.setup(ctx)
const liveObservers = FakeMutationObserver.instances.filter(observer => observer.observed && !observer.disconnected)
const originalSend = ctx.sendToBackend
ctx.sendToBackend = () => { throw new Error('SPINDLE_FRONTEND_INACTIVE') }
try {
  cleanupInactiveHost()
} finally {
  ctx.sendToBackend = originalSend
}
assert(liveObservers.length > 0 && liveObservers.every(observer => observer.disconnected), 'inactive host cleanup must disconnect every media observer')
assert(activeTagInterceptors === 0, 'inactive host cleanup must release lifecycle interceptors')
assert([...eventHandlers.values()].every(handlers => handlers.length === 0), 'inactive host cleanup must release chat subscriptions')

console.log('Frontend boot smoke passed.')
