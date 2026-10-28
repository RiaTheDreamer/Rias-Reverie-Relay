/** Delegate from the persistent handset root: page renders replace the screen.
 * Keeping click suppression here prevents a completed swipe from opening an app. */
export function mountPhoneHomeSwipe(root: ShadowRoot, turnPage: (direction: number) => void): () => void {
  let gesture: { id: number; screen: HTMLElement; x: number; y: number; horizontal: boolean } | null = null
  let suppressClickUntil = 0
  const down = (event: PointerEvent) => {
    suppressClickUntil = 0
    gesture = null
    if (event.isPrimary === false) { gesture = null; return }
    if (event.pointerType === 'mouse' && event.button !== 0) return
    const path = event.composedPath()
    const screen = path.find(item => item instanceof window.HTMLElement && item.matches('.home-screen')) as HTMLElement | undefined
    if (!screen || Number(screen.dataset.appPages) < 2 || path.some(item => item instanceof window.HTMLElement && item.matches('.app-pages, .notification, input, select, textarea, a, [contenteditable]'))) return
    gesture = { id: event.pointerId, screen, x: event.clientX, y: event.clientY, horizontal: false }
  }
  const move = (event: PointerEvent) => {
    if (!gesture || gesture.id !== event.pointerId) return
    if (!gesture.screen.isConnected) { gesture = null; return }
    const dx = Math.abs(event.clientX - gesture.x), dy = Math.abs(event.clientY - gesture.y)
    if (!gesture.horizontal) {
      if (dy > 10 && dy >= dx) { gesture = null; return }
      if (dx < 12 || dx < dy * 1.3) return
      gesture.horizontal = true
      gesture.screen.setPointerCapture?.(event.pointerId)
    }
    event.preventDefault()
  }
  const up = (event: PointerEvent) => {
    if (!gesture || gesture.id !== event.pointerId) return
    const completed = gesture; gesture = null
    const dx = event.clientX - completed.x, dy = Math.abs(event.clientY - completed.y)
    if (!completed.screen.isConnected || !completed.horizontal) return
    // Suppress the pointer-generated click even on a short drag or page boundary.
    suppressClickUntil = Date.now() + 500
    event.preventDefault()
    if (Math.abs(dx) >= 48 && Math.abs(dx) > dy * 1.3) turnPage(dx < 0 ? 1 : -1)
  }
  const cancel = () => { gesture = null }
  const click = (event: MouseEvent) => {
    if (event.detail === 0 || Date.now() > suppressClickUntil) return
    suppressClickUntil = 0; event.preventDefault(); event.stopImmediatePropagation()
  }
  root.addEventListener('pointerdown', down as EventListener, true)
  root.addEventListener('pointermove', move as EventListener, { capture: true, passive: false })
  root.addEventListener('pointerup', up as EventListener, true)
  root.addEventListener('pointercancel', cancel, true)
  root.addEventListener('click', click as EventListener, true)
  return () => {
    cancel()
    root.removeEventListener('pointerdown', down as EventListener, true)
    root.removeEventListener('pointermove', move as EventListener, true)
    root.removeEventListener('pointerup', up as EventListener, true)
    root.removeEventListener('pointercancel', cancel, true)
    root.removeEventListener('click', click as EventListener, true)
  }
}
