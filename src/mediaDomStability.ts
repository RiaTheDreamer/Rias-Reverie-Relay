// Observe host mounts, including its isolated shadow trees, without reacting to
// Relay's own status text and action-button updates.
export function observeRelayMediaMounts(root: ParentNode, onMount: () => void): () => void {
  const observers = new Map<ParentNode, MutationObserver>()
  const phoneSelector = '[data-reverie-phone-ui]'
  const inPhone = (node: Node): boolean => {
    let scope: Node | null = node
    while (scope) {
      if (scope instanceof Element && scope.closest(phoneSelector)) return true
      const tree = scope.getRootNode()
      scope = tree instanceof ShadowRoot ? tree.host : null
    }
    return false
  }
  // Spindle attaches the marked root inside an unmarked placement wrapper.
  // Ignore that wrapper only when all its content belongs to the phone; a
  // mixed host/story mount must continue through normal media reconciliation.
  const phoneTree = (node: Node): boolean => {
    if (inPhone(node)) return true
    if (node.nodeType === Node.COMMENT_NODE || node.nodeType === Node.TEXT_NODE && !node.textContent?.trim()) return true
    if (!(node instanceof Element) || !node.querySelector(phoneSelector)) return false
    return Array.from(node.childNodes).every(phoneTree)
  }
  const scan = (node: ParentNode): void => {
    if ((node instanceof ShadowRoot && inPhone(node.host)) || (node instanceof Element && inPhone(node))) return
    if (!observers.has(node)) {
      const observer = new MutationObserver(mutations => {
        const hostChanged = mutations.some(mutation => {
          if (inPhone(mutation.target)) return false
          const changed = [...mutation.addedNodes, ...mutation.removedNodes]
          if (changed.length && changed.every(phoneTree)) return false
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
      if (element.shadowRoot && !inPhone(element)) scan(element.shadowRoot)
    }
  }
  scan(root)
  return () => { for (const observer of observers.values()) observer.disconnect(); observers.clear() }
}

export function setMediaText(element: HTMLElement | null, text: string): void {
  if (element && element.textContent !== text) element.textContent = text
}
