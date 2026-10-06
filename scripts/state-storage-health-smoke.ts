// @ts-nocheck -- Storage-path regression harness; the repo intentionally omits Node ambient types.
import { readFileSync } from 'node:fs'
function assert(value: unknown, reason: string): asserts value { if (!value) throw new Error(reason) }

const requestedPaths: string[] = []
let corruptActiveChatState = false
;(globalThis as any).spindle = {
  registerMessageContentProcessor() {}, registerMacro() {}, on() {}, onFrontendMessage() {}, sendToFrontend() {},
  userStorage: {
    async getJson(path: string, { fallback, userId }: any = {}) {
      requestedPaths.push(`${path}|${userId || ''}`)
      if (path === 'state.json') throw new Error('Failed to parse JSON from state.json')
      if (path === 'states/chat_one.json' && corruptActiveChatState) throw new Error(`Failed to parse JSON from ${path}`)
      return structuredClone(fallback ?? {})
    },
  },
  log: { info() {}, warn() {}, error() {} },
  toast: { info() {}, success() {}, warning() {}, error() {} },
}

const backend = await import('../src/backend')

const noActiveChat = await backend.inspectRelayStateStorage()
assert(noActiveChat.ok && requestedPaths.length === 0, 'diagnostics without an active chat must not probe a legacy global state file')

const activeState = await backend.inspectRelayStateStorage('chat/one', 'user-1')
assert(activeState.ok && activeState.slotCount === 0, 'healthy active chat state should be readable with its fallback')
assert(activeState.message.includes('states/chat_one.json'), 'diagnostics should report the current chat-scoped state path')
assert(requestedPaths.includes('states/chat_one.json|user-1') && !requestedPaths.some(path => path.startsWith('state.json|')), 'diagnostics must read the active chat state, never legacy root state.json')

corruptActiveChatState = true
const corruptState = await backend.inspectRelayStateStorage('chat/one', 'user-1')
assert(!corruptState.ok && corruptState.message.includes('states/chat_one.json') && corruptState.message.includes('Failed to parse JSON'), 'a genuinely corrupt active chat file must still fail visibly and identify the exact file')

const backendSource = readFileSync(new URL('../src/backend.ts', import.meta.url), 'utf8')
const selfTestSource = backendSource.slice(backendSource.indexOf('async function runInstallationSelfTest'), backendSource.indexOf('async function editPrompt', backendSource.indexOf('async function runInstallationSelfTest')))
assert(selfTestSource.includes('inspectRelayStateStorage(chatId, userId)') && !selfTestSource.includes("getJson('state.json'"), 'the actual installation self-test must use active-chat storage rather than the obsolete root state.json file')
assert(selfTestSource.includes('if (chatId && stateStorage.ok)') && selfTestSource.includes("healthCheck('state-storage', 'Relay state storage'"), 'diagnostics may only append its health log after active chat storage was read successfully and must surface the result')

console.log('state storage health smoke passed: diagnostics inspect only the active chat-scoped file, ignore stale legacy root state.json, and report actual per-chat parse failures without writing or resetting data.')
