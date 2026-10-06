import { phoneConversation, type PhoneDeviceState, type PhoneIdentity } from './phoneDevice'
import { phoneStoryScope } from './phoneStoryBridge'
const xml = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')

/** This is a citation of delivered texts, never a new incoming-text control. */
export function phoneContextDraft(state: PhoneDeviceState, identities: PhoneIdentity[], from?: string, to?: string): string {
  const inactive = new Set(state.messages.filter(message => message.sourceActive === false).map(message => message.id))
  const messages = from && to ? phoneConversation(state, from, to) : state.messages.filter(message => message.sourceActive !== false)
  const rows = messages.filter(message => identities.some(person => person.id === message.from) && identities.some(person => person.id === message.to)
    && !inactive.has(message.replyTo || '') && (!message.image || message.image.status === 'ready')).slice(-8)
  return rows.map(message => `<reverie-phone-context from="${xml(message.from)}" to="${xml(message.to)}" scope="${xml(phoneStoryScope(identities))}" sender="${xml(identities.find(person => person.id === message.from)!.name)}" recipient="${xml(identities.find(person => person.id === message.to)!.name)}">${xml(message.body.slice(0, 2000))}</reverie-phone-context>`).join('\n')
}

/** Native value setter updates React's controlled draft, preserving user text.
 * No submit event, keyboard shortcut, chat write or generation is performed. */
export function appendPhoneDraftToComposer(draft: string): boolean {
  const composer = document.querySelector<HTMLTextAreaElement>('textarea[name="chat-message"]')
  if (!draft || !composer?.isConnected) return false
  const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set
  if (!setter) return false
  const value = `${composer.value}${composer.value.trim() ? '\n\n' : ''}${draft}`
  setter.call(composer, value)
  composer.dispatchEvent(new window.Event('input', { bubbles: true }))
  composer.focus(); composer.setSelectionRange(value.length, value.length)
  return true
}

/** Display-only XML Regex. Copied context must not create phone deliveries. */
export function renderPhoneContextDraft(source: string): { content: string; count: number } {
  let count = 0
  const content = source.replace(/<reverie-phone-context from="([^"<>]{1,120})" to="([^"<>]{1,120})" scope="([^"<>]{1,260})" sender="([^"<>]{1,300})" recipient="([^"<>]{1,300})">([^<]{1,12000})<\/reverie-phone-context>/g,
    (_full, from: string, to: string, scope: string, sender: string, recipient: string, body: string) => {
      // Attribute/body values are already XML-escaped; do not decode/reparse HTML.
      count++
      return `<div class="rr-phone-notification"><button type="button" data-reverie-phone-open="true" data-phone-from="${from}" data-phone-to="${to}" data-phone-scope="${scope}" style="display:flex;flex-direction:column;gap:6px;text-align:left;width:100%;max-width:420px;margin:12px 0;padding:14px 18px;border:1px solid #75556d;border-radius:18px;background:#241b2bf2;color:#f6eef8;cursor:pointer;font:inherit"><span style="font-size:12px;color:#dba9c2">Phone context · ${sender} → ${recipient}</span><span style="white-space:pre-wrap;overflow-wrap:anywhere">${body}</span><span style="font-size:11px;color:#baa6c5">Already delivered · Open conversation ↗</span></button></div>`
    })
  return { content, count }
}
