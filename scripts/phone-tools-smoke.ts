// @ts-nocheck -- offline host lifecycle simulation; production phone modules are typechecked.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { PHONE_TEXT_TOOL, PHONE_PHOTO_TOOL, PHONE_TOOL_DEFINITIONS, createPhoneToolBridge, appendPhoneToolEvents, phoneToolProtocol } from '../src/phoneTools'
import { parsePhoneActivities, renderPhoneActivities, reconcileStoryPhoneTexts } from '../src/phoneStoryBridge'
import { emptyPhoneDevice, normalizePhoneDevice, phoneConversation } from '../src/phoneDevice'
import { JSDOM } from 'jsdom'
import { mountPhoneToolRenderSync } from '../src/phoneToolRenderSync'
import { createPhoneToolTransport } from '../src/phoneToolTransport'

let persistedTransport:unknown='xml', transportWriteFails=false, toolsAllowed=true, revocations=0
const registeredTools=new Set<string>()
const transportDeps={read:async()=>persistedTransport,write:async(mode)=>{if(transportWriteFails)throw new Error('Storage unavailable');persistedTransport=mode},canRegister:()=>toolsAllowed,register:tool=>registeredTools.add(tool.name),unregister:name=>registeredTools.delete(name),revoke:()=>{revocations++}}
const transport=createPhoneToolTransport(transportDeps)
await transport.ready
assert.equal(transport.mode(),'xml');assert.equal(registeredTools.size,0,'XML mode removes native declarations before any Main request')
assert.equal(transport.native(),false)
await transport.change('native');assert.equal(registeredTools.size,2);assert.equal(transport.native(),true)
transportWriteFails=true;await assert.rejects(()=>transport.change('xml'),/Storage unavailable/);assert.equal(transport.native(),true,'failed save preserves current transport')
transportWriteFails=false
const beforeRevoke=revocations
await transport.change('xml');assert.equal(registeredTools.size,0);assert(revocations>beforeRevoke,'switching transports revokes staged native sessions')
await assert.rejects(()=>transport.change('creative'),/Choose Native/);assert.equal(persistedTransport,'xml')
const restoredTransport=createPhoneToolTransport(transportDeps);await restoredTransport.ready;assert.equal(restoredTransport.native(),false,'XML choice survives runtime restart')
toolsAllowed=false;await assert.rejects(()=>restoredTransport.change('native'),/permission/);assert.equal(registeredTools.size,0)
toolsAllowed=true;await restoredTransport.change('native');toolsAllowed=false;assert.equal(restoredTransport.native(),false,'permission revocation closes the immediate dispatch gate');restoredTransport.refresh();assert.equal(registeredTools.size,0)
const damagedTransport=createPhoneToolTransport({...transportDeps,read:async()=>({invalid:true})});await assert.rejects(()=>damagedTransport.ready,/damaged/);assert.equal(damagedTransport.native(),false)
await damagedTransport.change('xml');assert.equal(damagedTransport.mode(),'xml','explicit valid choice recovers damaged configuration without losing phone storage')
toolsAllowed=true

persistedTransport='native'
const xmlOnly=createPhoneToolTransport({...transportDeps,xmlOnly:true})
await xmlOnly.ready
assert.equal(xmlOnly.mode(),'xml');assert.equal(registeredTools.size,0);assert.equal(persistedTransport,'xml','XML-only build migrates the installation-wide saved native choice')
await assert.rejects(()=>xmlOnly.change('native'),/XML incoming texts only/)
xmlOnly.refresh();assert.equal(registeredTools.size,0,'permission refresh cannot register native tools in XML-only staging')
assert.equal(xmlOnly.native(),false)

const identities = [{ id: 'character:one', name: 'Actor A', kind: 'character' }, { id: 'persona:two', name: 'Actor B', kind: 'persona' }, { id: 'npc:assistant-1', name: 'Assistant C', kind: 'npc' }]
let now = 100, allowed = true, epoch = 1
const commits = [], state = emptyPhoneDevice()
const bridge = createPhoneToolBridge({ now: () => now, allowed: async () => allowed, captureAuthorization: () => { const at = epoch; return () => at === epoch }, commit: async (session, terminal) => {
  const content = appendPhoneToolEvents(terminal.content, session)
  commits.push({ session, content })
  const rows = parsePhoneActivities(content).map((entry, index) => ({ id: `story-delivery-${terminal.messageId}-${index}`, from: identities.find(person => person.kind === entry.from || person.id === entry.from).id, to: identities.find(person => person.kind === entry.to || person.id === entry.to).id, body: entry.body, sourceKey: `${terminal.messageId}:0:${index}`, createdAt: now }))
  reconcileStoryPhoneTexts(state, rows, identities)
} })
let sequence = 0
const start = (patch = {}) => { const context = { userId: 'user-a', chatId: 'chat-a', generationId: `generation-${++sequence}`, generationType: 'normal', ...patch }; bridge.start(context, context.userId); return { context, session: bridge.open(context, identities) } }
const invoke = (session, patch = {}, toolName = PHONE_TEXT_TOOL, userId = 'user-a') => bridge.invoke({ toolName, args: { session: session.token, event_id: 'first_text', from: 'character', to: 'persona', body: 'Meet me by the lift & bring the notes.', ...patch } }, userId).then(JSON.parse)
const finish = (test, patch = {}) => bridge.finish({ generationId: test.context.generationId, chatId: test.context.chatId, messageId: `message-${sequence}`, content: 'A quiet story beat.', ...patch }, test.context.userId)

for (const definition of PHONE_TOOL_DEFINITIONS) {
  assert(/^[A-Za-z_][A-Za-z0-9_]{0,63}$/.test(definition.name), 'bare extension names are provider-safe; qualified names are host-owned')
  assert.equal(definition.inline_available, true); assert.equal(definition.council_eligible, false)
  assert.equal(definition.parameters.additionalProperties, false)
  assert.deepEqual(Object.keys(definition.parameters.properties).filter(field => field.includes('chat') || field.includes('user')), [], 'models cannot choose a user/chat')
}
assert.equal(bridge.open({ userId: 'user-a', chatId: 'chat-a', generationId: 'never-started' }, identities), undefined)
assert.equal(start({ isDryRun: true }).session, undefined)
assert.equal(start({ dryRun: true }).session, undefined, 'actual host dryRun flag cannot open a session')
assert.equal(start({ generationType: 'impersonate' }).session, undefined)
const missing = { userId: 'user-a', chatId: 'chat-a', generationId: 'missing-participant' }; bridge.start(missing, missing.userId)
assert.equal(bridge.open(missing, identities.slice(0, 1)), undefined)

const hostBridge = createPhoneToolBridge({ allowed: async () => true, commit: async () => {} })
const hostStart = { generationId: 'host-generation', chatId: 'host-chat', generationType: 'normal', frontendSessionId: 'host-frontend' }
hostBridge.start(hostStart, 'host-user')
const hostContext = { userId: 'host-user', chatId: 'host-chat', generationType: 'normal', frontendSessionId: 'host-frontend', dryRun: false }
assert.equal(hostBridge.open(hostContext, identities).generationId, hostStart.generationId, 'real host context omits generationId')
assert.equal(hostBridge.open({ ...hostContext, dryRun: true }, identities), undefined)
assert.equal(hostBridge.open({ ...hostContext, frontendSessionId: 'wrong' }, identities), undefined)
assert.equal(hostBridge.open({ ...hostContext, generationType: 'continue' }, identities), undefined)
hostBridge.start({ ...hostStart, generationId: 'other-generation' }, 'host-user')
assert.equal(hostBridge.open(hostContext, identities), undefined, 'ambiguous host starts fail closed instead of choosing latest')
hostBridge.cancel({ generationId: 'other-generation' }, 'host-user')
assert.equal(hostBridge.open(hostContext, identities).generationId, hostStart.generationId)
hostBridge.cancel(hostStart, 'host-user')
assert.equal(hostBridge.open(hostContext, identities), undefined, 'closed host generation cannot reopen without explicit ID')

const good = start()
const protocol = phoneToolProtocol(good.session)
assert(protocol.includes('__deliver_phone_text') && protocol.includes('__draft_phone_photo') && protocol.includes('functions are NOT available'))
assert(protocol.includes('exact function name from the available declarations') && !protocol.includes('private_relay__'), 'do not invent the manifest identifier as an installation namespace')
const actualHostName = '23fd83a2-9461-4c8e-a51c-ba6426d4561a:deliver_phone_text'.replace(/:/g, '__')
assert(!/^[A-Za-z_][A-Za-z0-9_.:-]{0,127}$/.test(actualHostName), 'numeric installation UUID reproduces the host-side Gemini rejection; bare-name checks must not claim end-to-end compatibility')
assert(!/author.*persona|persona.*permission|persona.*reaction|user feelings|do not.*user.*response/i.test(protocol), 'no narrative persona-authorship policy')
assert.equal((await invoke(good.session)).status, 'staged'); assert.equal(commits.length, 0, 'tool invocation does not deliver before saved completion')
assert.equal((await invoke(good.session)).duplicate, true)
assert.equal((await invoke(good.session, { event_id: 'retry_with_new_id' })).duplicate, true)
assert.equal((await invoke(good.session, { body: 'Changed content.' })).status, 'rejected')
assert.equal((await invoke(good.session, {}, PHONE_TEXT_TOOL, 'other-user')).status, 'rejected')
assert.equal((await invoke(good.session, { from: 'persona', body: 'Pretend user reply.' })).status, 'rejected')
assert.equal((await invoke(good.session, { to: 'stranger' })).status, 'rejected')
assert.equal((await invoke(good.session, { to: 'character' })).status, 'rejected')
assert.equal((await invoke(good.session, { body: '<script>unsafe()</script>' })).status, 'rejected')
assert.equal((await invoke(good.session, { body: 'x'.repeat(2001) })).status, 'rejected')
assert.equal((await invoke(good.session, { event_id: 'bad id' })).status, 'rejected')
assert.equal((await invoke(good.session, { chatId: 'chat-b' })).status, 'rejected')
assert.equal((await invoke(good.session, { body: 'Photo attached.', event_id: 'photo', image_prompt: 'A sunlit desk, a folded green map, brass lamp.' }, PHONE_PHOTO_TOOL)).status, 'staged')
assert.equal((await invoke(good.session, { event_id: 'third', from: 'npc:assistant-1', to: 'character', body: 'The driver is downstairs.' })).status, 'staged')
assert.equal((await invoke(good.session, { event_id: 'fourth', body: 'Too many.' })).status, 'rejected')
await Promise.all([finish(good), finish(good)])
assert.equal(commits.length, 1, 'repeated terminal events commit once')
assert.equal(parsePhoneActivities(commits[0].content).length, 3)
assert.equal(state.messages.length, 3)
assert.equal((await invoke(good.session)).status, 'rejected', 'completed sessions cannot be replayed')
assert(renderPhoneActivities(commits[0].content).content.includes('data-reverie-phone-open="true"'), 'same actual notification renderer')
assert.equal(parsePhoneActivities(commits[0].content)[1].imagePrompt, 'A sunlit desk, a folded green map, brass lamp.', 'tool photos remain drafts; no ImageGen dependency')
assert.deepEqual(normalizePhoneDevice(state).messages, state.messages, 'saved deliveries survive checkpoint normalization')
reconcileStoryPhoneTexts(state, [], identities)
assert.equal(phoneConversation(state, 'character:one', 'persona:two').length, 0, 'inactive swipe removes projection without deleting archive')

for (const outcome of [{ error: 'provider failed' }, { messageId: undefined }, { chatId: 'wrong-chat' }, { generationType: 'impersonate' }]) {
  const test = start(); await invoke(test.session); await finish(test, outcome)
}
assert.equal(commits.length, 1, 'failed/unbound terminal responses never deliver')
const cancelled = start(); await invoke(cancelled.session); bridge.cancel(cancelled.context, 'user-a'); await finish(cancelled)
assert.equal(commits.length, 1)
assert.equal(bridge.open(cancelled.context, identities), undefined, 'stop cannot be revived by late assembly')
const reassembled = start(); const stale = reassembled.session; reassembled.session = bridge.open(reassembled.context, identities)
assert.equal((await invoke(stale)).status, 'rejected'); await invoke(reassembled.session); await finish(reassembled)
assert.equal(commits.length, 2, 'reassembly revokes old token, current token can deliver')
const expired = start(); await invoke(expired.session); now += 31 * 60_000; await finish(expired)
assert.equal(commits.length, 2, 'expired proposals do not dispatch')
const aborted = start(); await invoke(aborted.session); epoch++; await finish(aborted)
assert.equal(commits.length, 2, 'Abort All epoch prevents later delivery')
const revoked = start(); await invoke(revoked.session); bridge.revoke(); await finish(revoked)
assert.equal(commits.length, 2)
const disabled = start(); allowed = false; assert.equal((await invoke(disabled.session)).status, 'rejected'); allowed = true
const malformed = start(); await invoke(malformed.session)
assert.throws(() => appendPhoneToolEvents('<instagram_dm>unclosed', malformed.session), /unclosed wrapper/)
const xmlDuplicate = appendPhoneToolEvents('', malformed.session)
assert.equal(appendPhoneToolEvents(xmlDuplicate, malformed.session), xmlDuplicate, 'XML/tool duplicate has one saved owner')
assert.throws(() => appendPhoneToolEvents(xmlDuplicate.replace('Meet me', 'Changed').repeat(3), malformed.session), /delivery limit/)

let releaseAllowed; let commitCalls = 0
const racing = createPhoneToolBridge({ allowed: () => new Promise(resolve => { releaseAllowed = resolve }), commit: async () => { commitCalls++ } })
const context = { userId: 'user-a', chatId: 'chat-a', generationId: 'racing-generation' }; racing.start(context, context.userId)
const session = racing.open(context, identities)
const pendingCall = racing.invoke({ toolName: PHONE_TEXT_TOOL, args: { session: session.token, event_id: 'race', from: 'character', to: 'persona', body: 'Pending.' } }, context.userId)
racing.cancel(context, context.userId); releaseAllowed(true)
assert.equal(JSON.parse(await pendingCall).status, 'rejected'); assert.equal(commitCalls, 0, 'cancel during authorization blocks staging')
assert.equal(await bridge.invoke({ toolName: 'some_other_extension_tool', args: {} }, 'user-a'), undefined)

const backend = readFileSync(new URL('../src/backend.ts', import.meta.url), 'utf8')
assert(backend.includes("('TOOL_INVOCATION', (payload, userId) => phoneToolBridge.invoke(payload, userId))"))
assert(backend.includes('phoneToolBridge.start(payload, userId)') && backend.includes('phoneToolBridge.finish(payload, userId)') && backend.includes('phoneToolBridge.cancel(payload, userId)'))
assert(backend.includes('getAuthoritativeSwipeContent(current, swipeId) !== source'), 'write-time fingerprint protection stays wired')
assert(JSON.parse(readFileSync(new URL('../spindle.json', import.meta.url), 'utf8')).permissions.includes('tools'))
const document = new JSDOM('<main><div id="message"></div></main>').window.document
const root = document.getElementById('message'), handlers = new Map(), refreshes = []
let backendHandler, activeChat = 'render-chat', mounted = true
const stopRenderSync = mountPhoneToolRenderSync({
  getActiveChat: () => ({ chatId: activeChat }),
  dom: { findMessageElement: id => mounted && id === 'render-message' ? root : null },
  sendToBackend: payload => refreshes.push(payload),
  onBackendMessage: handler => { backendHandler = handler; return () => { backendHandler = undefined } },
  events: { on: (name, handler) => { handlers.set(name, handler); return () => handlers.delete(name) } },
})
const receipt = { type: 'phone_tools_committed', receipt: 'render-receipt', chatId: 'render-chat', messageId: 'render-message', notificationCount: 1 }
mounted = false; backendHandler(receipt)
assert.equal(refreshes.length, 0, 'do not reannounce before the real message mounts')
mounted = true; handlers.get('CHARACTER_MESSAGE_RENDERED')({ messageId: 'render-message' })
assert.deepEqual(refreshes[0], { type: 'phone_tools_render_refresh', receipt: 'render-receipt' }, 'no model args, content or chat selector in refresh request')
handlers.get('CHARACTER_MESSAGE_RENDERED')({ messageId: 'render-message' })
handlers.get('CHARACTER_MESSAGE_RENDERED')({ messageId: 'render-message' })
assert.equal(refreshes.length, 2, 'tail/render refresh race has a hard two-request bound')
const island = document.createElement('div'); root.append(island)
island.attachShadow({ mode: 'open' }).innerHTML = '<button data-reverie-phone-open="true">Delivered</button>'
backendHandler({ ...receipt, receipt: 'already-visible' })
assert.equal(refreshes.length, 2, 'already rendered ShadowDOM notifications do not refresh')
activeChat = 'another-chat'; backendHandler({ ...receipt, receipt: 'other-chat' })
assert.equal(refreshes.length, 2, 'no background-chat UI mutation')
handlers.get('CHAT_SWITCHED')({}); activeChat = 'render-chat'; root.replaceChildren()
handlers.get('CHARACTER_MESSAGE_RENDERED')({ messageId: 'render-message' })
assert.equal(refreshes.length, 2, 'chat switch clears pending receipts')
stopRenderSync(); assert.equal(handlers.size, 0); assert.equal(backendHandler, undefined)
assert(backend.includes('entry.userId !== userId') && backend.includes('entry.attempts >= 2') && backend.includes('!== entry.fingerprint'), 'refresh is receipt/user/source-bound and bounded')
console.log('Phone tools passed: provider-neutral definitions, session/user/chat binding, recipient limits, saved-only delivery, deduplication, reload/swipe ownership, photo drafts, dry-run/impersonate exclusion, stop/Abort All/revoke/expiry/reassembly and cancellation races. No live provider claim.')
