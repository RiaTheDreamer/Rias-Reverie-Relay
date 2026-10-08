type FocusedControl = {
  tagName?: string
  type?: string
  isContentEditable?: boolean
}

/** document.activeElement is the host, not the select inside a settings shadow. */
export function focusedPanelControl(root: HTMLElement): HTMLElement | null {
  let focused=(root.ownerDocument||document).activeElement as HTMLElement|null
  if(!focused||!root.contains(focused))return null
  while(focused.shadowRoot?.activeElement)focused=focused.shadowRoot.activeElement as HTMLElement
  return focused
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
