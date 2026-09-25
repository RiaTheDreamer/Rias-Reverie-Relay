// @ts-nocheck -- host-contract harness deliberately supplies a narrow Spindle mock.
import { strict as assert } from 'node:assert'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

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

const frontendSource = readFileSync(resolve(import.meta.dirname, '..', 'src', 'frontend.ts'), 'utf8')
assert(/function toggleCard[\s\S]*?input\.addEventListener\('input'/.test(frontendSource), 'category toggles must commit on the immediate input event')
assert(/function checkbox[\s\S]*?input\.addEventListener\('input'/.test(frontendSource), 'individual Surface toggles must commit on the immediate input event')

const userId = 'surface-authority-user'
const [A, B, C] = ['instagram', 'smartphone', 'kakao']
const ownedSurfaceWrapper = /<reverie_surface_utility\b(?=[^>]*\bsource\s*=\s*(?:"(?:macro|automatic)"|'(?:macro|automatic)'))(?=[^>]*\brenderer\s*=\s*(?:"[^"]*"|'[^']*'))(?=[^>]*\bcontract\s*=\s*(?:"shared"|'shared'))(?=[^>]*\bmodules\s*=\s*(?:"[^"]*"|'[^']*'))[^>]*>[\s\S]*?<\/reverie_surface_utility>/gi
const wrapperCount = (text: string) => (text.match(ownedSurfaceWrapper) || []).length
const wrapper = (text: string) => text.match(ownedSurfaceWrapper)?.[0] || ''
const modules = (value: string) => (value.match(/\bmodules="([^"]*)"/i)?.[1] || '').split(',').filter(Boolean)
const textOf = (result: any) => (Array.isArray(result) ? result : result.messages).map((message: any) => String(message.content || '')).join('\n')
const messagesOf = (result: any) => Array.isArray(result) ? result : result.messages

async function configure(enabledIds: string[]) {
  const current = await backend.getConfig(userId)
  const studio = structuredClone(current.globalSurfaceStudio)
  const enabled = new Set(enabledIds)
  for (const definition of Object.values(studio.definitions)) {
    definition.promptEnabled = enabled.has(definition.baseSurfaceId)
    definition.updatedAt = (definition.updatedAt || 0) + 1
  }
  studio.utilityInjectionEnabled = true
  studio.updatedAt = (studio.updatedAt || 0) + 1
  const saved = await backend.setConfig({
    globalSurfaceStudio: studio,
    surfacePreferencesInitialized: true,
    surfaceUtilityInjectionEnabled: true,
    narrativeDlcEnabled: false,
    narrativeDlcUtilityNames: [],
  }, userId)
  return {
    macro: backend.buildEnabledSurfaceUtility(saved.globalSurfaceStudio, 'macro').content,
    automatic: backend.buildEnabledSurfaceUtility(saved.globalSurfaceStudio, 'automatic').content,
  }
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

async function state(chatId?: string) {
  frontendEvents.length = 0
  frontendHandler!({ type: 'list_state', chatId }, userId)
  for (let tick = 0; tick < 4 && frontendEvents.length === 0; tick += 1) await new Promise(resolve => setTimeout(resolve, 0))
  const event = frontendEvents.find(event => event.type === 'state')
  assert(event, 'State request did not reply')
  return event
}

function assertExactlyCurrent(text: string, expected: string, stage: string) {
  assert.equal(wrapperCount(text), expected ? 1 : 0, `${stage}: unexpected Relay-owned Surface wrapper count`)
  if (expected) assert.equal(wrapper(text), expected, `${stage}: Surface wrapper does not equal current enabled Surface configuration`)
}

// A. A stale app/UI macro wrapper refreshes in place and drops disabled apps.
const oldAB = (await configure([A, B])).macro
const currentB = await configure([B])
const placed = await intercept([
  { role: 'system', content: `before-macro\n${oldAB}\nafter-macro` },
  { role: 'user', content: 'Latest user turn.' },
], 'surface-stale-placement')
const placedMessage = messagesOf(placed)[0].content
assert(placedMessage.indexOf(currentB.macro) > placedMessage.indexOf('before-macro') && placedMessage.indexOf(currentB.macro) < placedMessage.indexOf('after-macro'), 'A: refreshed app/UI wrapper moved from its placed location')
assertExactlyCurrent(textOf(placed), currentB.macro, 'A')
assert.deepEqual(modules(wrapper(textOf(placed))), [B], 'A: disabled app/UI module survived the refreshed wrapper')

// B. No selected Surface means no Relay-owned Surface wrapper or hidden module instructions.
const none = await configure([])
assert.equal(none.macro, '', 'B: empty Surface selection still produced a Relay-owned contract')
assertExactlyCurrent(textOf(await intercept([{ role: 'system', content: oldAB }], 'surface-all-off')), '', 'B')

// B1. A chatless state broadcast must expose persisted Surface settings, never
// emptyState() defaults. The frontend accepts that global message while a chat
// is active, so the wrong projection makes every category appear enabled until
// an unrelated interaction produces a chat-bound refresh.
const globalState = await state()
assert.equal(Object.values(globalState.customSurfaces.definitions).filter((definition: any) => definition.promptEnabled).length, 0, 'B1: chatless state revived default enabled Surface modules')

// C. Repeated app/UI selection changes cannot accumulate earlier expanded state.
let previous = oldAB
for (const [index, selected] of [[B], [], [B], [], [B]].entries()) {
  const current = await configure(selected as string[])
  const result = await intercept([{ role: 'system', content: previous }, { role: 'user', content: `Toggle ${index}` }], `surface-toggle-${index}`)
  const expected = wrapperCount(previous) ? current.macro : current.automatic
  const text = textOf(result)
  assertExactlyCurrent(text, expected, `C-${index}`)
  previous = wrapper(text) || 'Previously removed Relay Surface state.'
}

// D. Apps change independently: disabling A then B keeps C exactly once.
const oldABC = (await configure([A, B, C])).macro
const currentBC = await configure([B, C])
const withoutA = textOf(await intercept([{ role: 'system', content: oldABC }], 'surface-multiple-a'))
assertExactlyCurrent(withoutA, currentBC.macro, 'D-A')
const currentC = await configure([C])
const withoutB = textOf(await intercept([{ role: 'system', content: wrapper(withoutA) }], 'surface-multiple-b'))
assertExactlyCurrent(withoutB, currentC.macro, 'D-B')

// E. A user-authored lookalike without Relay's schema survives unchanged.
const lookalike = '<reverie_surface_utility>Instagram Smartphone Kakao user prose, not Relay contract markup.</reverie_surface_utility>'
const withLookalike = textOf(await intercept([{ role: 'user', content: lookalike }], 'surface-lookalike'))
assert(withLookalike.includes(lookalike), 'E: user-authored Surface lookalike was stripped')
assertExactlyCurrent(withLookalike, currentC.automatic, 'E')

// F. Preview and final interceptor composition agree for current App/UI selections.
const previewResult = await preview('surface-preview-parity')
assert.deepEqual(previewResult.surfaceModuleIds, [C], 'F: Prompt Preview did not expose the current App/UI selection')
assertExactlyCurrent(textOf(await intercept([{ role: 'system', content: oldABC }], 'surface-preview-parity')), currentC.macro, 'F')

// G. Both explicit Surface macro placements retain position and do not double inject.
for (const [label, marker] of [['surface', '<reverie_surfaces_macro/>'], ['all', '<reverie_all_macro/>']]) {
  const current = await configure([B])
  const result = await intercept([{ role: 'system', content: `before-${label}\n${marker}\nafter-${label}` }], `surface-macro-${label}`)
  const message = messagesOf(result)[0].content
  assert(message.indexOf(current.macro) > message.indexOf(`before-${label}`) && message.indexOf(current.macro) < message.indexOf(`after-${label}`), `G-${label}: Surface macro placement moved`)
  assertExactlyCurrent(textOf(result), current.macro, `G-${label}`)
}

// H. Automatic-only injection still works when no prior wrapper exists.
const automaticOnly = await configure([A])
assertExactlyCurrent(textOf(await intercept([{ role: 'user', content: 'Automatic Surface path.' }], 'surface-automatic')), automaticOnly.automatic, 'H')

// I. Duplicated old wrappers collapse to one current block; a full inventory also
// proves the shared path covers every shipped Core/App/UI Surface, not just A/B/C.
const allIds = Object.values((await backend.getConfig(userId)).globalSurfaceStudio.definitions).map((definition: any) => definition.baseSurfaceId)
const allOld = (await configure(allIds)).macro
const withoutInstagram = await configure(allIds.filter(id => id !== A))
const duplicated = `${allOld}\nold-middle\n${oldAB}\nold-end\n${allOld}`
const allReconciled = textOf(await intercept([{ role: 'system', content: duplicated }], 'surface-duplicates'))
assertExactlyCurrent(allReconciled, withoutInstagram.macro, 'I')
assert(!modules(wrapper(allReconciled)).includes(A) && modules(wrapper(allReconciled)).length === allIds.length - 1, 'I: one disabled app/UI module did not reconcile against the complete shipped Surface inventory')

console.log('Surface prompt authority regression passed: Core, App/UI, and Narrative-adjacent Surface selections reconcile from current config and chatless state preserves persisted toggle authority.')
