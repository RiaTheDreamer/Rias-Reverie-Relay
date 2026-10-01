type FocusedControl = {
  tagName?: string
  type?: string
  isContentEditable?: boolean
}

/** Preserve in-progress typed edits without delaying checkbox/radio repaint. */
export function shouldDeferPanelRenderForControl(control: FocusedControl | null | undefined): boolean {
  if (!control) return false
  if (control.isContentEditable) return true
  const tagName = String(control.tagName || '').toLowerCase()
  if (tagName === 'textarea') return true
  if (tagName !== 'input') return false
  const type = String(control.type || 'text').toLowerCase()
  return type !== 'checkbox' && type !== 'radio'
}
