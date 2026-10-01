export type RelayRuntimeHealth = {
  setupCount: number; disposeCount: number; activeInstances: number; lastSetupAt: number; lastDisposeAt?: number
  listeners: number; observers: number; timers: number; subscriptions: number
  previewListeners: number; abortControllers: number; orbControllers: number
  settingsSubscriptions: number; slotSubscriptions: number; activeViews: number; activeView: string; actionScopes: number
}

const empty = (): RelayRuntimeHealth => ({ setupCount: 0, disposeCount: 0, activeInstances: 0, lastSetupAt: 0, listeners: 0, observers: 0, timers: 0, subscriptions: 0, previewListeners: 0, abortControllers: 0, orbControllers: 0, settingsSubscriptions: 0, slotSubscriptions: 0, activeViews: 0, activeView: '', actionScopes: 0 })

export class RelayRuntimeLifecycle {
  readonly health: RelayRuntimeHealth
  private cleanups: Array<() => void> = []
  private previews = new Set<string>()
  private actions = new Set<string>()
  private disposed = false

  constructor(previous?: Partial<RelayRuntimeHealth>) {
    this.health = { ...empty(), ...(previous || {}) }
    this.health.setupCount += 1; this.health.activeInstances = 1; this.health.lastSetupAt = Date.now()
    for (const key of ['listeners', 'observers', 'timers', 'subscriptions', 'previewListeners', 'abortControllers', 'orbControllers', 'settingsSubscriptions', 'slotSubscriptions', 'activeViews', 'actionScopes'] as const) this.health[key] = 0
    this.health.activeView = ''
  }

  track(cleanup: () => void, category: 'listener' | 'observer' | 'timer' | 'subscription' | 'settings' | 'slot' = 'subscription'): () => void {
    const counters: Array<keyof RelayRuntimeHealth> = category === 'listener' ? ['listeners'] : category === 'observer' ? ['observers'] : category === 'timer' ? ['timers'] : category === 'settings' ? ['subscriptions', 'settingsSubscriptions'] : category === 'slot' ? ['subscriptions', 'slotSubscriptions'] : ['subscriptions']
    for (const key of counters) (this.health[key] as number) += 1
    let active = true
    const wrapped = () => { if (!active) return; active = false; try { cleanup() } finally { for (const key of counters) (this.health[key] as number) = Math.max(0, (this.health[key] as number) - 1) } }
    this.cleanups.push(wrapped)
    return wrapped
  }

  activateView(view: string): void { this.health.activeView = view; this.health.activeViews = view ? 1 : 0 }
  setOrbMounted(mounted: boolean): void { this.health.orbControllers = mounted ? 1 : 0 }
  beginPreview(id: string): void { this.previews.add(id); this.health.previewListeners = this.previews.size }
  endPreview(id: string): void { this.previews.delete(id); this.health.previewListeners = this.previews.size }
  beginAction(id: string): boolean { if (this.actions.has(id)) return false; this.actions.add(id); this.health.actionScopes = this.actions.size; return true }
  endAction(id: string): void { this.actions.delete(id); this.health.actionScopes = this.actions.size }
  createAbortController(): AbortController { const controller = new AbortController(); this.health.abortControllers += 1; controller.signal.addEventListener('abort', () => { this.health.abortControllers = Math.max(0, this.health.abortControllers - 1) }, { once: true }); this.track(() => { if (!controller.signal.aborted) controller.abort() }); return controller }
  snapshot(): RelayRuntimeHealth { return { ...this.health } }
  dispose(): void { if (this.disposed) return; this.disposed = true; for (const cleanup of this.cleanups.splice(0).reverse()) cleanup(); this.previews.clear(); this.actions.clear(); Object.assign(this.health, { activeInstances: 0, activeViews: 0, activeView: '', previewListeners: 0, abortControllers: 0, orbControllers: 0, actionScopes: 0 }); this.health.disposeCount += 1; this.health.lastDisposeAt = Date.now() }
}
