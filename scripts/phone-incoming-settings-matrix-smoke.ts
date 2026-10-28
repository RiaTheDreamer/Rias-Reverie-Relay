// @ts-nocheck -- real interceptor with in-memory host APIs; no live providers.
import assert from 'node:assert/strict'
import { normalizePhoneIncoming, phoneIncomingDirective } from '../src/phoneIncomingSettings'

const stored = new Map()
let interceptor
let providerCalls = 0
const warnings = []
const userId = 'incoming-matrix-user', chatId = 'incoming-matrix-chat'
const history = [
  { id: 'saved-1', role: 'assistant', is_user: false, content: 'First saved story reply.', extra: {} },
  { id: 'saved-2', role: 'assistant', is_user: false, content: 'Second saved story reply.', extra: {} },
  { id: 'empty-reply', role: 'assistant', is_user: false, content: '  \n ', extra: {} },
  { id: 'stopped', role: 'assistant', is_user: false, content: 'Incomplete prose.', extra: { promptActivation: { complete: false } } },
  { id: 'failed', role: 'assistant', is_user: false, content: 'Failed prose.', extra: { generationOutcome: { error: 'Offline fixture failure' } } },
  { id: 'user-turn', role: 'user', is_user: true, content: 'An editable user turn.', extra: {} },
]
const forbidProvider = () => { providerCalls++; throw new Error('Matrix must not call a provider') }
globalThis.spindle = {
  registerInterceptor(fn) { interceptor = fn; return () => {} },
  registerMessageContentProcessor() {}, registerMacro() {}, on() {}, onFrontendMessage() {}, sendToFrontend() {},
  registerTool() { throw new Error('XML transport must not register native phone tools') }, unregisterTool() {},
  permissions: { has: () => true, onChanged: () => () => {} },
  log: { info() {}, warn(message) { warnings.push(message) }, error(message) { warnings.push(message) } },
  userStorage: {
    async getJson(path, options = {}) { return structuredClone(stored.has(path) ? stored.get(path) : options.fallback) },
    async setJson(path, value) { stored.set(path, structuredClone(value)) }, async mkdir() {},
  },
  chats: { async get(id) { return { id, character_id: 'matrix-char', metadata: { active_persona_id: 'matrix-persona' } } } },
  characters: { async get() { return { id: 'matrix-char', name: 'Character Fixture', description: 'An established speaker.' } } },
  personas: { async get() { return { id: 'matrix-persona', name: 'Persona Fixture' } }, async getActive() { return null } },
  chat: { async getMessages() { return structuredClone(history) }, updateMessage: forbidProvider },
  connections: { async list() { return [] } }, imageGen: { async listConnections() { return [] }, generate: forbidProvider },
  generate: { raw: forbidProvider }, variables: { global: { async set() {} }, chat: { async set() {} } },
  world_books: { async getActivated() { return [] }, entries: { async get() { return null } } },
}
const backend = await import('../src/backend')
await backend.setConfig({ enabled: true, autoGenerate: false, appearanceSidecarEnabled: false,
  surfaceUtilityInjectionEnabled: false, narrativeDlcEnabled: false, narrativeDlcUtilityNames: [],
  storyConstellationsEnabled: false, proseIllustratorSettings: { enabled: false, mode: 'off' } }, userId)

const placements = [
  { id: 'automatic', content: 'Before. No phone macro. After.' },
  { id: 'raw-macro', content: 'Before. {{reverie_phone}} After.' },
  { id: 'resolved-marker', content: 'Before. <reverie_phone_macro/> After.' },
  { id: 'duplicates-and-stale', content: 'Before. {{reverie_phone}} <reverie_phone_macro/> <reverie_phone_protocol>STALE MATRIX SETTINGS</reverie_phone_protocol> After.' },
]
let cases = 0
for (const frequency of ['model', 'every', 'every-n'])
for (const everyN of [1, 3, 100])
for (const maxNotifications of [0, 1, 3, 10])
for (const phoneEnabled of [false, true])
for (const contextMode of ['automatic', 'manual'])
for (const autoReply of [false, true])
for (const connectionId of [null, 'matrix-connection']) {
  const incoming = { frequency, everyN, maxNotifications }
  await backend.setConfig({ phoneEnabled, phonePreferences: { connectionId, autoReply, contextMode, incoming } }, userId)
  const reloaded = await backend.getConfig(userId)
  assert.deepEqual(reloaded.phonePreferences, { connectionId, autoReply, contextMode, incoming })
  for (const placement of placements) {
    const label = JSON.stringify({ frequency, everyN, maxNotifications, phoneEnabled, contextMode, autoReply, connectionId, placement: placement.id })
    const input = [{ role: 'system', content: placement.content }, { role: 'user', content: 'An ordinary RP turn.' }]
    const originalInput = JSON.stringify(input)
    const result = await interceptor(input, { chatId, userId, isDryRun: true })
    const output = (Array.isArray(result) ? result : result.messages).map(row => row.content).join('\n')
    assert.equal(JSON.stringify(input), originalInput, 'preview cannot mutate its source messages: ' + label)
    assert(output.includes('Before.') && output.includes('After.'), 'macro placement must preserve surrounding text: ' + label)
    assert(!/\{\{\s*reverie_phone\s*\}\}|<reverie_phone_macro\s*\/>|STALE MATRIX SETTINGS/.test(output), 'owned raw/stale markers must not leak: ' + label)
    assert.equal((output.match(/<reverie_phone_protocol>/g) || []).length, phoneEnabled ? 1 : 0, 'one enabled protocol, none when disabled: ' + label)
    if (phoneEnabled) {
      const settings = /<incoming_text_settings\b([^>]*)>([\s\S]*?)<\/incoming_text_settings>/.exec(output)
      assert(settings, 'actual final prompt must contain resolved frequency settings: ' + label)
      assert(settings[1].includes(`frequency="${frequency}" interval="${everyN}" max_notifications="${maxNotifications}"`), 'actual prompt must match persisted settings: ' + label)
      assert.equal(/response="(\d+)"/.exec(settings[1])?.[1], '3', 'only nonempty committed assistant replies count: ' + label)
      const due = maxNotifications > 0 && (frequency !== 'every-n' || 3 % everyN === 0)
      assert(settings[1].includes(`due="${due}"`), 'cadence due flag: ' + label)
      assert(settings[2].includes(`Never exceed ${maxNotifications}`), 'numeric cap must reach the real prompt: ' + label)
      if (!maxNotifications) assert(settings[2].includes('disabled'), 'zero is disabled: ' + label)
      if (placement.id !== 'automatic') assert(output.includes('Before. <reverie_phone_protocol>'), 'explicit macro stays in place: ' + label)
    }
    cases++
  }
}

// Exhaust the bounded numeric domains in the pure production directive too.
let numericCases = 0
for (const frequency of ['model', 'every', 'every-n'])
for (let everyN = 1; everyN <= 100; everyN++)
for (let maxNotifications = 0; maxNotifications <= 10; maxNotifications++) {
  const settings = normalizePhoneIncoming({ frequency, everyN, maxNotifications })
  for (const completedReplies of [0, everyN - 1, everyN]) {
    const expectedDue = maxNotifications > 0 && (frequency !== 'every-n' || (completedReplies + 1) % everyN === 0)
    const directive = phoneIncomingDirective(settings, completedReplies)
    assert(directive.includes(`due="${expectedDue}"`))
    assert(directive.includes(`Never exceed ${maxNotifications}`))
    assert.equal(phoneIncomingDirective(settings, completedReplies), directive, 'preview cannot advance an ordinal')
    numericCases++
  }
}
for (const invalid of [
  null, [], 'damaged', { frequency: 'invalid', everyN: 3, maxNotifications: 3 },
  ...[0, 101, 1.5, NaN, Infinity].map(everyN => ({ frequency: 'every-n', everyN, maxNotifications: 3 })),
  ...[-1, 11, 1.5, NaN, Infinity].map(maxNotifications => ({ frequency: 'model', everyN: 3, maxNotifications })),
]) assert.throws(() => normalizePhoneIncoming(invalid), 'invalid boundaries must be rejected')
assert.equal(providerCalls, 0, 'prompt checks must not spend, send a message or change a chat')
assert(!warnings.some(message => message.includes('Continuity unavailable')), 'a silent Phone fallback cannot masquerade as successful injection')
console.log(`Phone incoming matrix passed: ${cases} real-interceptor settings/placement cases, ${numericCases} numeric/cadence cases, empty/stopped/failed/user exclusions, invalid boundaries and zero provider calls. Live model and mobile UI verification remain separate.`)
