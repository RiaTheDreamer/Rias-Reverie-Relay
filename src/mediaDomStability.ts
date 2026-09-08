// Observe host mounts, including its isolated shadow trees, without reacting to
// Relay's own status text and action-button updates.
export function observeRelayMediaMounts(root: ParentNode, onMount: () => void): () => void {
  const observers = new Map<ParentNode, MutationObserver>()
  const scan = (node: ParentNode): void => {
    if (!observers.has(node)) {
      const observer = new MutationObserver(mutations => {
        const hostChanged = mutations.some(mutation => {
          const target = mutation.target instanceof Element ? mutation.target : mutation.target.parentElement
          return !target?.closest('.rrl-card, .dg-router-panel, .dg-relay-orb')
        })
        if (!hostChanged) return
        for (const [observed, current] of observers) {
          if (observed instanceof ShadowRoot && !observed.host.isConnected) {
            current.disconnect()
            observers.delete(observed)
          }
        }
        scan(root)
        onMount()
      })
      observer.observe(node, { childList: true, subtree: true })
      observers.set(node, observer)
    }
    for (const element of Array.from(node.querySelectorAll('*'))) {
      if (element.shadowRoot) scan(element.shadowRoot)
    }
  }
  scan(root)
  return () => { for (const observer of observers.values()) observer.disconnect(); observers.clear() }
}

export function setMediaText(element: HTMLElement | null, text: string): void {
  if (element && element.textContent !== text) element.textContent = text
}
