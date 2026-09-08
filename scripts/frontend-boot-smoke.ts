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
  listeners = new Map<string, Array<() => void>>()
  parentNode: FakeElement | null = null
  children: FakeElement[] = []
  className = ''
  classList = new FakeClassList()
  dataset: Record<string, string> = {}
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
  querySelector(): null { return null }
  querySelectorAll(): FakeElement[] { return [] }
  setAttribute(): void {}
  removeAttribute(): void {}
  addEventListener(name: string, handler: () => void): void { this.listeners.set(name, [...(this.listeners.get(name) || []), handler]) }
  click(): void { if (!this.disabled) for (const handler of this.listeners.get('click') || []) handler() }
  removeEventListener(): void {}
  focus(): void {}
  setPointerCapture(): void {}
  releasePointerCapture(): void {}
  getBoundingClientRect() { return { left: 0, top: 0, right: 52, bottom: 52, width: 52, height: 52 } }
}

class FakeMutationObserver {
  observed = false
  disconnected = false
  constructor(private readonly callback: () => void) {}
  observe(): void { this.observed = true }
  disconnect(): void { this.disconnected = true }
}

const body = new FakeElement()
const documentMock = {
  body,
  documentElement: new FakeElement(),
  activeElement: null,
  createElement: () => new FakeElement(),
  createDocumentFragment: () => new FakeElement(),
  addEventListener: () => {},
  removeEventListener: () => {},
  querySelector: () => null,
  querySelectorAll: () => [],
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
  MutationObserver: FakeMutationObserver,
  requestAnimationFrame: (callback: () => void) => { callback(); return 0 },
  fetch: async () => ({ ok: false, status: 404, json: async () => ({}) }),
})

const builtFrontend = readFileSync(builtFrontendPath, 'utf8')
assert(!builtFrontend.includes('relay-sidebar-icon-APPROVED-white-r3.png') && !builtFrontend.includes('relay-tab-icon-APPROVED-fullcolor-portal.png'), 'built frontend must not retain a runtime path to an approved PNG asset')
assert((builtFrontend.match(/data:image\/png;base64,/g) || []).length >= 2, 'built frontend must embed both approved icon data URLs')

const drawerRegistrations: any[] = []
const inputRegistrations: any[] = []
const backendPayloads: unknown[] = []
const eventSubscriptions: string[] = []
const tagInterceptors: string[] = []
let backendHandler: ((payload: unknown) => void) | null = null
let drawerActivations = 0
let drawerDestroyed = false
let stylesRegistered = 0
let stylesRemoved = 0

const drawer = {
  root: new FakeElement(),
  tabId: 'dreamglass-image-router',
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

const ctx: any = {
  dom: {
    addStyle: () => { stylesRegistered += 1; return () => { stylesRemoved += 1 } },
    findMessageElement: () => null,
    cleanup: () => {},
  },
  events: {
    on: (event: string) => { eventSubscriptions.push(event); return () => {} },
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
    registerTagInterceptor: ({ tagName }: any) => { tagInterceptors.push(tagName); return () => {} },
  },
  getActiveChat: () => ({ chatId: 'boot-chat', characterId: 'boot-character' }),
  sendToBackend: (payload: unknown) => { backendPayloads.push(payload) },
  onBackendMessage: (handler: (payload: unknown) => void) => { backendHandler = handler; return () => { backendHandler = null } },
  display: { invalidate: () => {} },
}

const moduleUrl = `${pathToFileURL(builtFrontendPath).href}?boot-smoke=${Date.now()}`
const frontendModule = await import(moduleUrl)
const cleanup = frontendModule.setup(ctx)
assert(typeof cleanup === 'function', 'built frontend setup must return its lifecycle cleanup')
assert(stylesRegistered === 1, 'frontend setup must register Relay styles')
assert(drawerRegistrations.length === 1 && drawerRegistrations[0].id === 'dreamglass-image-router', 'frontend setup must register the Relay drawer tab')
assert(inputRegistrations.length === 2, 'frontend setup must register both input-bar actions')
assert(inputRegistrations.some(entry => entry.options.id === 'open-reverie-relay'), 'Relay input-bar action must be registered')
assert(inputRegistrations.some(entry => entry.options.id === 'open-reverie-surfaces'), 'Surface Registry input-bar action must be registered')
for (const registration of [...drawerRegistrations, ...inputRegistrations.map(entry => entry.options)]) {
  assert(typeof registration.iconUrl === 'string' && registration.iconUrl.startsWith('data:image/png;base64,'), `${registration.id} must receive an embedded PNG data URL`)
}
assert(dataUrlHash(drawerRegistrations[0].iconUrl) === 'C04DBDB9D146B4313C7E6D363B49C47DB9D683BF43E4F2FEE85F6C5FD1766F50', 'drawer registration must receive the exact compact selected sidebar artwork')
for (const registration of inputRegistrations) assert(dataUrlHash(registration.options.iconUrl) === '4CFA6015EF0097A7CEDE3266CBFFE008CF135CBAB5A8B0AFB6D9E916AB425DA8', `${registration.options.id} must receive the exact approved input-action artwork`)
assert(backendHandler, 'frontend setup must subscribe to backend messages')
assert(['CHAT_SWITCHED', 'CHAT_CHANGED', 'MESSAGE_EDITED', 'MESSAGE_SWIPED', 'SWIPE_EDITED'].every(event => eventSubscriptions.includes(event)), 'frontend setup must register the expected chat lifecycle subscriptions')
assert(tagInterceptors.includes('character_profile') && tagInterceptors.includes('image_request'), 'frontend setup must register native Surface lifecycle interception')

inputRegistrations.find(entry => entry.options.id === 'open-reverie-relay').action.trigger()
inputRegistrations.find(entry => entry.options.id === 'open-reverie-surfaces').action.trigger()
assert(drawerActivations === 2, 'both input-bar actions must activate the owning Relay drawer tab')

backendHandler!({
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
})
assert(body.children.some(child => child.className.includes('dg-relay-orb')), 'Orb bootstrap must be reachable after the accepted config and chat state arrive')

for (let tick = 0; tick < 8; tick += 1) await Promise.resolve()
assert(backendPayloads.some((payload: any) => payload?.type === 'list_state' && payload.chatId === 'boot-chat'), 'frontend setup must begin backend state synchronization')
cleanup()
assert(drawerDestroyed && stylesRemoved === 1, 'frontend cleanup must retire registered host resources')

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

console.log('Frontend boot smoke passed.')
