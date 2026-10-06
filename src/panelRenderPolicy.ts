type FocusedControl = {
  tagName?: string
  type?: string
  isContentEditable?: boolean
}

/** Preserve typed edits and open native pickers without delaying toggle repaint. */
export function shouldDeferPanelRenderForControl(control: FocusedControl | null | undefined): boolean {
  if (!control) return false
  if (control.isContentEditable) return true
  const tagName = String(control.tagName || '').toLowerCase()
  if (tagName === 'textarea' || tagName === 'select') return true
  if (tagName !== 'input') return false
  const type = String(control.type || 'text').toLowerCase()
  return type !== 'checkbox' && type !== 'radio'
}
