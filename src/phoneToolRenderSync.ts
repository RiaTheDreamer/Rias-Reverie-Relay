import type { SpindleFrontendContext } from 'lumiverse-spindle-types'

type Receipt = { type: 'phone_tools_committed'; receipt: string; chatId: string; messageId: string; notificationCount: number; attempts?: number }
function notifications(root: ParentNode): number {
  let count = root.querySelectorAll('[data-reverie-phone-open]').length
  for (const element of root.querySelectorAll('*')) if (element.shadowRoot) count += notifications(element.shadowRoot)
  return count
}
/** A terminal-tail fetch may precede the tool write. Request a metadata-only
 * reannouncement after the real row mounts; never rewrite content or the DOM. */
export function mountPhoneToolRenderSync(ctx: SpindleFrontendContext): () => void {
  const pending = new Map<string, Receipt>()
  function check(messageId: string) {
    for (const entry of pending.values()) {
      if (entry.messageId !== messageId || ctx.getActiveChat().chatId !== entry.chatId) continue
      const root = ctx.dom.findMessageElement(messageId)
      if (!root) continue
      if (notifications(root) >= entry.notificationCount) { pending.delete(entry.receipt); continue }
      if ((entry.attempts || 0) >= 2) { pending.delete(entry.receipt); continue }
      entry.attempts = (entry.attempts || 0) + 1
      ctx.sendToBackend({ type: 'phone_tools_render_refresh', receipt: entry.receipt })
    }
  }
  const offBackend = ctx.onBackendMessage(payload => {
    const entry = payload as Receipt
    if (entry.type !== 'phone_tools_committed' || !entry.receipt || !entry.messageId || !entry.chatId) return
    if (!pending.has(entry.receipt)) {
      if (pending.size >= 100) pending.delete(pending.keys().next().value!)
      pending.set(entry.receipt, { ...entry, attempts: 0 })
    }
    check(entry.messageId)
  })
  const offRender = ctx.events.on('CHARACTER_MESSAGE_RENDERED', (event: any) => check(String(event?.messageId || event?.message?.id || '')))
  const offSwitch = ctx.events.on('CHAT_SWITCHED', () => pending.clear())
  return () => { pending.clear(); offBackend(); offRender(); offSwitch() }
}
