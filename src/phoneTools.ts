import type { ToolRegistrationDTO } from 'lumiverse-spindle-types'
import type { PhoneIdentity } from './phoneDevice'
import { parsePhoneActivities, phoneStoryScope, resolvePhoneParticipant } from './phoneStoryBridge'

/** Native tool transport only. Provider adapters, credentials and continuations belong to Lumiverse. */
export const PHONE_TEXT_TOOL = 'deliver_phone_text'
export const PHONE_PHOTO_TOOL = 'draft_phone_photo'
const MAX_EVENTS = 3
const SESSION_TTL = 30 * 60_000
const plain = (value: unknown, max: number): string => {
  if (typeof value !== 'string' || !value.trim() || value.length > max || /<\/?[A-Za-z]|```|~~~/.test(value)) throw new Error('Supply bounded plain text, not XML, HTML or a code block.')
  return value.trim()
}
const xml = (value: string): string => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')

export const PHONE_TOOL_DEFINITIONS: ToolRegistrationDTO[] = [PHONE_TEXT_TOOL, PHONE_PHOTO_TOOL].map(name => ({
  name,
  display_name: name === PHONE_TEXT_TOOL ? 'Reverie · Incoming text' : 'Reverie · Photo draft',
  description: name === PHONE_TEXT_TOOL
    ? 'Stage one incoming in-world text from a character or established NPC for the current Reverie Phone session. Delivery occurs only after the story response is successfully saved. Never repeat this message as XML. No real-world messaging.'
    : 'Stage an incoming photo description for the current Reverie Phone session. Creates a reviewed photo draft, NOT an image-generation job. Delivery occurs only after the story response is successfully saved. Never repeat it as XML.',
  inline_available: true,
  council_eligible: false,
  parameters: {
    type: 'object', additionalProperties: false,
    properties: {
      session: { type: 'string', description: 'Copy the current session token from the Reverie Phone protocol exactly.' },
      event_id: { type: 'string', description: 'A short unique identifier for this text in this response; reuse it if retrying the SAME text.' },
      from: { type: 'string', description: 'character or an exact registered npc:id from the current protocol.' },
      to: { type: 'string', description: 'persona, character, or an exact registered npc:id from the current protocol.' },
      body: { type: 'string', description: 'Only the delivered text/caption, 1–2000 characters.' },
      ...(name === PHONE_PHOTO_TOOL ? { image_prompt: { type: 'string', description: 'Visible photo content, 1–6000 characters; no UI or generation instructions.' } } : {}),
    },
    required: ['session', 'event_id', 'from', 'to', 'body', ...(name === PHONE_PHOTO_TOOL ? ['image_prompt'] : [])],
  },
}))

export type PhoneToolEvent = { eventId: string; from: string; to: string; body: string; imagePrompt?: string }
export type PhoneToolSession = {
  token: string; userId: string; chatId: string; generationId: string; scope: string;
  identities: PhoneIdentity[]; createdAt: number; targetMessageId?: string; events: PhoneToolEvent[];
  authorized?: () => boolean; cancelled?: boolean;
}
export type PhoneToolTerminal = { generationId: string; chatId: string; messageId?: string; content?: string; error?: unknown; generationType?: string }

/** Compile accepted tool arguments through the SAME saved XML owner as legacy requests. */
export function appendPhoneToolEvents(source: string, session: PhoneToolSession): string {
  const existing = parsePhoneActivities(source)
  const seen = new Set(existing.filter(entry => entry.scope === session.scope).map(entry => JSON.stringify([entry.from, entry.to, entry.body, entry.imagePrompt || ''])))
  const blocks: string[] = []
  for (const event of session.events) {
    const key = JSON.stringify([event.from, event.to, event.body, event.imagePrompt || ''])
    if (seen.has(key)) continue
    if (existing.length + blocks.length >= MAX_EVENTS) throw new Error('XML and tool messages exceed the response delivery limit.')
    blocks.push(`<reverie-phone from="${xml(event.from)}" to="${xml(event.to)}" scope="${xml(session.scope)}"${event.imagePrompt ? ` image-prompt="${xml(event.imagePrompt)}"` : ''}>${xml(event.body)}</reverie-phone>`)
    seen.add(key)
  }
  const next = blocks.length ? `${source}${source ? '\n\n' : ''}${blocks.join('\n\n')}` : source
  if (blocks.length && parsePhoneActivities(next).length !== existing.length + blocks.length) throw new Error('The source has an unclosed wrapper; the phone notification cannot be attached safely.')
  return next
}

export function phoneToolProtocol(session: PhoneToolSession): string {
  const participants = session.identities.map(({ id, name, kind }) => ({ id: kind === 'npc' ? id : kind, name }))
  return `<reverie_phone_protocol>\nOutput incoming in-world texts from characters or registered NPC contacts when relevant to the current scene. Participants: ${JSON.stringify(participants)}.\nWhen native functions are available, use the declared incoming-text function whose name ends with __${PHONE_TEXT_TOOL}, or the photo-draft function whose name ends with __${PHONE_PHOTO_TOOL}. Use the exact function name from the available declarations; its installation prefix is host-owned, not private_relay. Copy session ${JSON.stringify(session.token)} exactly. Use only these participant IDs, a stable event_id, and the actual message as body. At most three incoming messages per response. A successful tool result stages the text until the story is saved; do not repeat it in XML or call again with a new event_id. Photo descriptions create drafts, not automatic generation.\nIf these functions are NOT available, use standalone <reverie-phone from="character" to="persona" scope="${xml(session.scope)}">The actual text.</reverie-phone> instead, with the appropriate participant IDs. Escape XML text/attributes. Never use both transports for the same message.\n</reverie_phone_protocol>`
}

export function createPhoneToolBridge(deps: {
  allowed(userId: string, chatId: string): Promise<boolean>;
  commit(session: PhoneToolSession, terminal: PhoneToolTerminal): Promise<void>;
  captureAuthorization?(userId: string): () => boolean;
  now?: () => number;
}) {
  const now = deps.now || Date.now
  const sessions = new Map<string, PhoneToolSession>()
  const starts = new Map<string, { userId: string; generationId: string; chatId: string; targetMessageId?: string; generationType?: string; frontendSessionId?: string; at: number }>()
  const closed = new Map<string, number>()
  const finishing = new Map<string, PhoneToolSession>()
  const key = (userId: string, generationId: string) => JSON.stringify([userId, generationId])
  function prune() {
    for (const [id, session] of sessions) if (now() - session.createdAt > SESSION_TTL) sessions.delete(id)
    for (const [id, started] of starts) if (now() - started.at > SESSION_TTL) starts.delete(id)
    for (const [id, at] of closed) if (now() - at > SESSION_TTL) closed.delete(id)
  }
  function start(payload: { generationId: string; chatId: string; targetMessageId?: string; generationType?: string; frontendSessionId?: string }, userId?: string) {
    prune()
    if (!userId || !payload.generationId || !payload.chatId || payload.generationType === 'impersonate') return
    const id = key(userId, payload.generationId)
    if (!closed.has(id) && !starts.has(id) && starts.size < 100) starts.set(id, { userId, generationId: payload.generationId, chatId: payload.chatId, targetMessageId: payload.targetMessageId, generationType: payload.generationType, frontendSessionId: payload.frontendSessionId, at: now() })
  }
  function open(context: { userId?: string; chatId?: string; generationId?: string; isDryRun?: boolean; dryRun?: boolean; generationType?: string; frontendSessionId?: string }, identities: PhoneIdentity[]): PhoneToolSession | undefined {
    prune()
    if (context.isDryRun || context.dryRun || context.generationType === 'impersonate' || !context.userId || !context.chatId) return
    // Some hosts omit generationId from interceptor context. Correlate only a
    // unique observed start for this user/chat/type/frontend, never the latest.
    const candidates = [...starts.values()].filter(entry => entry.userId === context.userId && entry.chatId === context.chatId
      && (!context.generationId || entry.generationId === context.generationId)
      && (!context.generationType || !entry.generationType || entry.generationType === context.generationType)
      && (!context.frontendSessionId || entry.frontendSessionId === context.frontendSessionId))
    if (candidates.length !== 1) return
    const started = candidates[0], id = key(context.userId, started.generationId)
    if (closed.has(id) || !started || started.chatId !== context.chatId || !identities.some(person => person.kind === 'character') || !identities.some(person => person.kind === 'persona')) return
    // Reassembly is a new attempt: revoke tokens and proposals from its previous prompt.
    for (const [token, session] of sessions) if (key(session.userId, session.generationId) === id) sessions.delete(token)
    const session: PhoneToolSession = { token: crypto.randomUUID(), userId: context.userId, chatId: context.chatId, generationId: started.generationId, scope: phoneStoryScope(identities), identities: identities.map(({ id, name, kind }) => ({ id, name, kind })), createdAt: now(), targetMessageId: started.targetMessageId, events: [], authorized: deps.captureAuthorization?.(context.userId) }
    sessions.set(session.token, session)
    return session
  }
  async function invoke(payload: { toolName: string; args: Record<string, unknown>; councilMember?: unknown }, userId?: string): Promise<string | undefined> {
    if (![PHONE_TEXT_TOOL, PHONE_PHOTO_TOOL].includes(payload.toolName)) return
    try {
      prune()
      const session = typeof payload.args?.session === 'string' ? sessions.get(payload.args.session) : undefined
      if (!session || !userId || session.userId !== userId || payload.councilMember) throw new Error('This phone session is not active for this story generation. No message was delivered.')
      if (!await deps.allowed(userId, session.chatId) || sessions.get(session.token) !== session || session.authorized?.() === false) throw new Error('Phone tools are unavailable or this generation was cancelled. No message was delivered.')
      // The host adds context/deadline; never interpret either as action input.
      const fields = ['session', 'event_id', 'from', 'to', 'body', 'context', '__deadlineMs', ...(payload.toolName === PHONE_PHOTO_TOOL ? ['image_prompt'] : [])]
      if (Object.keys(payload.args).some(field => !fields.includes(field))) throw new Error('Unsupported phone argument. No message was delivered.')
      const eventId = plain(payload.args.event_id, 60)
      if (!/^[A-Za-z0-9_-]+$/.test(eventId)) throw new Error('event_id must contain only letters, numbers, underscores or hyphens.')
      const from = plain(payload.args.from, 150), to = plain(payload.args.to, 150)
      const sender = resolvePhoneParticipant(from, session.identities), recipient = resolvePhoneParticipant(to, session.identities)
      if (!sender || !recipient || sender.kind === 'persona' || sender.id === recipient.id) throw new Error('Choose distinct established phone participants and an incoming sender.')
      const event: PhoneToolEvent = { eventId, from: sender.kind === 'npc' ? sender.id : sender.kind, to: recipient.kind === 'npc' ? recipient.id : recipient.kind, body: plain(payload.args.body, 2000), ...(payload.toolName === PHONE_PHOTO_TOOL ? { imagePrompt: plain(payload.args.image_prompt, 6000) } : {}) }
      const previous = session.events.find(entry => entry.eventId === eventId)
      if (previous && JSON.stringify(previous) !== JSON.stringify(event)) throw new Error('That event_id already belongs to a different message. No replacement was made.')
      const duplicate = previous || session.events.find(entry => entry.from === event.from && entry.to === event.to && entry.body === event.body && entry.imagePrompt === event.imagePrompt)
      if (!duplicate) {
        if (session.events.length >= MAX_EVENTS) throw new Error('This response has reached its three incoming-message limit.')
        session.events.push(event)
      }
      return JSON.stringify({ status: 'staged', event_id: (duplicate || event).eventId, duplicate: Boolean(duplicate), delivery: 'Only after the current story response is successfully saved. Do not repeat this text as XML.' })
    } catch (error) {
      return JSON.stringify({ status: 'rejected', error: error instanceof Error ? error.message : String(error), delivered: false })
    }
  }
  function take(payload: { generationId: string }, userId?: string): PhoneToolSession | undefined {
    if (!userId) return
    prune()
    const id = key(userId, payload.generationId)
    starts.delete(id); closed.set(id, now())
    if (closed.size > 1000) closed.delete(closed.keys().next().value!)
    let pending: PhoneToolSession | undefined
    for (const [token, session] of sessions) if (key(session.userId, session.generationId) === id) { pending = session; sessions.delete(token) }
    return pending
  }
  async function finish(payload: PhoneToolTerminal, userId?: string) {
    const session = take(payload, userId)
    if (!session || !session.events.length || payload.chatId !== session.chatId || payload.error || !payload.messageId || typeof payload.content !== 'string' || payload.generationType === 'impersonate') return
    const id = key(session.userId, session.generationId)
    finishing.set(id, session)
    try {
      if (!await deps.allowed(session.userId, session.chatId) || session.cancelled || session.authorized?.() === false) return
      await deps.commit(session, payload)
    } finally { finishing.delete(id) }
  }
  function cancel(payload: { generationId: string }, userId?: string) {
    take(payload, userId)
    if (userId) { const pending = finishing.get(key(userId, payload.generationId)); if (pending) pending.cancelled = true }
  }
  function revoke() { sessions.clear(); starts.clear(); for (const pending of finishing.values()) pending.cancelled = true }
  return { start, open, invoke, finish, cancel, revoke }
}
