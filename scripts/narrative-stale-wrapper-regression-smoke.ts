// @ts-nocheck -- host-contract harness deliberately supplies a narrow Spindle mock.
import { strict as assert } from 'node:assert'
import { buildNarrativeUtilityPrompt } from '../src/narrativeDlcRuntime'

let interceptor: ((messages: any[], context: any) => Promise<any>) | undefined
let frontendHandler: ((payload: any, userId?: string) => void) | undefined
const frontendEvents: any[] = []
const storage = new Map<string, any>()

;(globalThis as any).spindle = {
  registerMessageContentProcessor() {},
  registerInterceptor(handler: any) { interceptor = handler; return () => {} },
  registerMacro() {},
  on() {},
  onFrontendMessage(handler: any) { frontendHandler = handler },
  sendToFrontend(payload: any) { frontendEvents.push(payload) },
  permissions: { has() { return true }, onChanged() { return () => {} } },
  userStorage: {
    async getJson(path: string, options: any = {}) { return structuredClone(storage.get(path) ?? options.fallback ?? {}) },
    async setJson(path: string, value: any) { storage.set(path, structuredClone(value)) },
    async mkdir() {},
  },
  chat: { async getMessages() { return [] } },
  chats: { async get(chatId: string) { return { id: chatId } } },
  characters: { async get() { return null } },
  personas: { async getActive() { return null } },
  world_books: { async getActivated() { return [] }, entries: { async get() { return null } } },
  imageGen: {},
  variables: { global: { async set() {} }, chat: { async set() {} } },
  log: { info() {}, warn() {}, error() {} },
}

const backend = await import('../src/backend')
assert(interceptor, 'Story Model interceptor did not register')
assert(frontendHandler, 'Prompt Preview handler did not register')

const userId = 'narrative-authority-user'
const names = ['Character Phone', 'Dramatic Cutaway', 'Parallel Scene']
const [A, B, C] = names
const ownedWrapper = /\[reverie_narrative_utility\]\s*\[contract\]narrative\[\/contract\]\s*\[version\][^\[]*\[\/version\]\s*\[utilities\][\s\S]*?\[\/utilities\][\s\S]*?\[\/reverie_narrative_utility\]/gi
const wrapperCount = (text: string) => (text.match(ownedWrapper) || []).length
const wrapper = (text: string) => text.match(ownedWrapper)?.[0] || ''
const textOf = (result: any) => (Array.isArray(result) ? result : result.messages).map((message: any) => String(message.content || '')).join('\n')
const messagesOf = (result: any) => Array.isArray(result) ? result : result.messages
const desired = (selected: string[], overrides: Record<string, string> = {}) => buildNarrativeUtilityPrompt(selected, overrides).content

async function configure(selected: string[], overrides: Record<string, string> = {}) {
  await backend.setConfig({
    narrativeDlcEnabled: selected.length > 0,
    narrativeDlcUtilityNames: selected,
    narrativeUtilityOverrides: Object.fromEntries(Object.entries(overrides).map(([name, content]) => [name, { content, revision: 1, updatedAt: 1 }])),
  }, userId)
}

async function intercept(messages: any[], chatId: string) {
  return interceptor!(messages, { chatId, userId, isDryRun: true })
}

async function preview(chatId: string) {
  frontendEvents.length = 0
  frontendHandler!({ type: 'surface_prompt_preview', requestId: chatId, chatId }, userId)
  for (let tick = 0; tick < 4 && frontendEvents.length === 0; tick += 1) await new Promise(resolve => setTimeout(resolve, 0))
  const event = frontendEvents.find(event => event.type === 'surface_prompt_preview' && event.requestId === chatId)
  assert(event, 'Prompt Preview did not reply')
  return event
}

function assertExactlyCurrent(text: string, expected: string, stage: string) {
  assert.equal(wrapperCount(text), expected ? 1 : 0, `${stage}: unexpected owned Narrative wrapper count`)
  if (expected) assert.equal(wrapper(text), expected, `${stage}: wrapper does not equal current resolved configuration`)
}

// A. An old macro-expanded A+B wrapper must refresh in place to current B.
const oldAB = desired([A, B])
await configure([B])
const placed = await intercept([
  { role: 'system', content: `before-macro\n${oldAB}\nafter-macro` },
  { role: 'user', content: 'Latest user turn.' },
], 'stale-placement')
const placedMessages = messagesOf(placed)
assert.equal(placedMessages[0].content.indexOf(desired([B])) > placedMessages[0].content.indexOf('before-macro'), true, 'A: refreshed wrapper moved before its placed location')
assert.equal(placedMessages[0].content.indexOf(desired([B])) < placedMessages[0].content.indexOf('after-macro'), true, 'A: refreshed wrapper moved after its placed location')
assertExactlyCurrent(textOf(placed), desired([B]), 'A')
assert(!wrapper(textOf(placed)).includes(A), 'A: disabled Utility survived the replacement')

// B. Clearing all selections removes an old owned wrapper; nothing is injected.
await configure([])
const disabled = await intercept([{ role: 'system', content: oldAB }, { role: 'user', content: 'Continue.' }], 'disable-all')
assertExactlyCurrent(textOf(disabled), '', 'B')

// C. Previously expanded state never wins an ON -> OFF -> ON -> OFF -> ON cycle.
let previous = oldAB
for (const [index, selected] of [[B], [], [B], [], [B]].entries()) {
  await configure(selected as string[])
  const result = await intercept([{ role: 'system', content: previous }, { role: 'user', content: `Toggle ${index}` }], `toggle-${index}`)
  const text = textOf(result)
  const current = desired(selected as string[])
  assertExactlyCurrent(text, current, `C-${index}`)
  previous = current || 'Previously removed Relay state.'
}

// D. Independently disabling A and then B cannot disturb C.
await configure([A, B, C])
const oldABC = desired([A, B, C])
await configure([B, C])
const withoutA = textOf(await intercept([{ role: 'system', content: oldABC }], 'multiple-a'))
assertExactlyCurrent(withoutA, desired([B, C]), 'D-A')
await configure([C])
const withoutB = textOf(await intercept([{ role: 'system', content: wrapper(withoutA) }], 'multiple-b'))
assertExactlyCurrent(withoutB, desired([C]), 'D-B')

// E. An override update replaces the old authored content rather than retaining it.
const oldOverride = 'OLD CHARACTER PHONE AUTHORITY TOKEN'
const newOverride = 'NEW CHARACTER PHONE AUTHORITY TOKEN'
await configure([A], { [A]: oldOverride })
const staleOverride = desired([A], { [A]: oldOverride })
await configure([A], { [A]: newOverride })
const updatedOverride = textOf(await intercept([{ role: 'system', content: staleOverride }], 'override'))
assertExactlyCurrent(updatedOverride, desired([A], { [A]: newOverride }), 'E')
assert(!updatedOverride.includes(oldOverride) && updatedOverride.includes(newOverride), 'E: old override survived or new override was absent')

// F. A non-schema lookalike belongs to the user and must survive unchanged.
await configure([B])
const lookalike = '[reverie_narrative_utility] Narrative Plot Sparks Character Phone reverie Utility prose, not a Relay contract. [/reverie_narrative_utility]'
const withLookalike = textOf(await intercept([{ role: 'user', content: lookalike }], 'lookalike'))
assert(withLookalike.includes(lookalike), 'F: user-authored Narrative lookalike was stripped')
assertExactlyCurrent(withLookalike, desired([B]), 'F')

// G. The preview and interceptor derive the same selected Narrative set even with stale input.
const previewResult = await preview('preview-parity')
const previewNames = previewResult.narrativeUtilityNames
const parity = textOf(await intercept([{ role: 'system', content: oldABC }], 'preview-parity'))
assert.deepEqual(previewNames, [B], 'G: Prompt Preview did not resolve current names')
assertExactlyCurrent(parity, desired([B]), 'G')

// H. Both raw Narrative and all-utility macros retain their placement and do not double inject.
for (const [label, marker] of [['narrative', '<reverie_narrative_macro/>'], ['all', '<reverie_all_macro/>']]) {
  await configure([C])
  const result = await intercept([{ role: 'system', content: `before-${label}\n${marker}\nafter-${label}` }], `macro-${label}`)
  const message = messagesOf(result)[0].content
  assert(message.indexOf(desired([C])) > message.indexOf(`before-${label}`) && message.indexOf(desired([C])) < message.indexOf(`after-${label}`), `H-${label}: macro placement moved`)
  assertExactlyCurrent(textOf(result), desired([C]), `H-${label}`)
}

// I. With no macro or historical wrapper, automatic injection remains active; off injects nothing.
await configure([A])
assertExactlyCurrent(textOf(await intercept([{ role: 'user', content: 'Automatic path.' }], 'automatic-on')), desired([A]), 'I-on')
await configure([])
assertExactlyCurrent(textOf(await intercept([{ role: 'user', content: 'Automatic path.' }], 'automatic-off')), '', 'I-off')

// J. Multiple stale owned wrappers collapse to one current wrapper, then zero when disabled.
await configure([B])
const duplicated = `${oldAB}\nold-middle\n${oldABC}\nold-end\n${oldAB}`
assertExactlyCurrent(textOf(await intercept([{ role: 'system', content: duplicated }], 'duplicates-on')), desired([B]), 'J-on')
await configure([])
assertExactlyCurrent(textOf(await intercept([{ role: 'system', content: duplicated }], 'duplicates-off')), '', 'J-off')

console.log('Narrative stale-wrapper authority regression passed.')
