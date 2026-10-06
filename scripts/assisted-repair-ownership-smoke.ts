// @ts-nocheck -- actual backend message handler with bounded host/model mocks.
import assert from 'node:assert/strict'
import { bracketExampleFromXml } from '../src/bracketSurfaceAuthoring'
import { completeSurfaceSpecs } from '../src/surfaceXml'
import { SHIPPED_SURFACE_SPECS } from '../src/shippedSurfaceDefinitions'
import { PLOT_SPARKS_REPAIR_EXAMPLE } from '../src/plotSparksContract'

const sample = completeSurfaceSpecs(SHIPPED_SURFACE_SPECS).find(spec => spec.id === 'kakao')!
const repaired = bracketExampleFromXml(sample.sampleXml.replace(/<k_img\b[^>]*>[\s\S]*?<\/k_img>/gi, ''))
const malformed = repaired.replace(/\[\/(?:title|date|time|unread|k_date|k_msg)\]/g, '')
let candidate = repaired
const storage = new Map()
const events = []
let handler
let parserCalls = 0
const parserInputs = []
let writes = 0
let writeFailure = ''
let duringParser = () => {}
let message = { id: 'repair-message', role: 'assistant', is_user: false, swipe_id: 1, content: malformed, swipes: ['different swipe', malformed] }
globalThis.spindle = {
  on() {}, registerInterceptor() {}, registerMacro() {}, registerMessageContentProcessor() {},
  onFrontendMessage(fn) { handler = fn }, sendToFrontend(payload) { events.push(payload) },
  permissions: { has: () => true }, log: { info() {}, warn() {}, error() {} },
  userStorage: { async mkdir() {}, async getJson(path, { fallback } = {}) { return structuredClone(storage.get(path) ?? fallback ?? {}) }, async setJson(path, value) { storage.set(path, structuredClone(value)) } },
  chat: {
    async getMessages() { return [structuredClone(message)] },
    async updateMessage(_chatId, _messageId, patch) {
      if (writeFailure) throw new Error(writeFailure)
      writes++
      message = { ...message, ...structuredClone(patch) }
      if (patch.swipes) message.content = patch.swipes[message.swipe_id]
      if (typeof patch.content === 'string') message.swipes[message.swipe_id] = patch.content
    },
  },
  connections: { async get(id) { return id === 'missing-connection' ? null : { id, name: 'Offline Parser', provider: 'offline', model: `default-${id}` } } },
  generate: { async raw(input) {
    parserCalls++; parserInputs.push(structuredClone(input)); duringParser()
    if (input.connection_id === 'unavailable-gem') throw new Error('Fixture Gemini unavailable')
    return { content: JSON.stringify({ repairable: true, surfaceMarkup: candidate, summary: 'Added missing closing tags.' }) }
  } },
}
const backend = await import('../src/backend')
assert.equal(backend.relayMediaPersistencePatch(message, 1, repaired).skipChunkRebuild, true, 'image placement must preserve existing chunk anchors')
assert.equal(backend.relayMediaPersistencePatch(message, 1, repaired, true).skipChunkRebuild, false, 'approved Surface edits must rebuild the stale rendered chunks')
assert.equal(backend.relayMediaPersistencePatch(message, 0, repaired, true).skipChunkRebuild, false, 'inactive Surface edits must keep the rebuild policy')
await backend.setConfig({ parserConnectionId: 'offline-parser', parserModel: 'offline', followNativeParser: false }, 'repair-user')
const base = { type: 'native_surface_repair_preview', chatId: 'repair-chat', messageId: message.id, surfaceId: 'kakao', rootTag: 'kakao_chat', sourceMarkup: malformed, originalMarkup: malformed }
async function preview(patch = {}) {
  const requestId = `test-${events.length}`
  handler({ ...base, requestId, ...patch }, 'repair-user')
  for (let tick = 0; tick < 100; tick++) {
    const result = events.find(row => row.type === 'native_surface_repair_result' && row.requestId === requestId)
    if (result) return result
    await new Promise(resolve => setTimeout(resolve, 0))
  }
  throw new Error('Backend did not return the repair preview result')
}
const ready = await preview()
assert.equal(ready.status, 'preview-ready', ready.error)
assert.equal(ready.proposedMarkup, repaired)
assert.equal(message.content, malformed, 'preview must never mutate the stored message')
// Repair can move off a failed Parser without changing planning, native sync,
// the Parser override, or the approval/source-ownership gates.
await backend.setConfig({ parserConnectionId: 'unavailable-gem', parserModel: 'stale-gem-override', parserParameters: { gemOnly: true }, surfaceRepairConnectionId: 'smol-gpt' }, 'repair-user')
assert.equal((await preview()).status, 'preview-ready', 'saved dedicated repair connection must bypass unavailable Gemini')
assert.equal(parserInputs.at(-1).connection_id, 'smol-gpt')
assert.equal(parserInputs.at(-1).model, 'default-smol-gpt', 'repair must inherit its selected connection model')
assert.deepEqual(parserInputs.at(-1).parameters, {}, 'Parser-specific parameters must not cross to another connection')
assert.equal((await preview({ repairConnectionId: 'nano-repair' })).status, 'preview-ready', 'explicit modal selection must win even before its settings acknowledgement')
assert.equal(parserInputs.at(-1).connection_id, 'nano-repair')
assert.equal((await preview({ repairConnectionId: null })).status, 'failed', 'Use Surface Parser must deliberately return to the unavailable Parser, not silently fail over')
assert.equal(parserInputs.at(-1).model, 'stale-gem-override')
const beforeMissingConnection = parserCalls
assert.equal((await preview({ repairConnectionId: 'missing-connection' })).status, 'failed')
assert.equal(parserCalls, beforeMissingConnection, 'missing connection must fail before provider spend')
const persistedConfig = await backend.getConfig('repair-user')
assert.equal(persistedConfig.surfaceRepairConnectionId, 'smol-gpt')
assert.equal(persistedConfig.parserConnectionId, 'unavailable-gem', 'repair must not silently rewrite the shared Parser')
await backend.setConfig({ parserConnectionId: 'offline-parser', parserModel: 'offline', parserParameters: {}, surfaceRepairConnectionId: null }, 'repair-user')
const before = parserCalls
assert.equal((await preview({ swipeId: 0 })).status, 'failed', 'explicit stale swipe must remain rejected')
assert.equal((await preview({ swipeId: -1 })).status, 'failed', 'invalid swipe must remain rejected')
assert.equal(parserCalls, before, 'stale and invalid ownership must fail before model spend')
message.swipes[1] = `${malformed}\n${malformed}`
assert.equal((await preview()).status, 'failed', 'ambiguous duplicate source must fail closed')
assert.equal(parserCalls, before)
message.swipes[1] = malformed
duringParser = () => { message.swipe_id = 0 }
const changed = await preview()
assert.equal(changed.status, 'failed', 'swipe changed during model preview must fail closed')
assert.match(changed.error, /changed during preview/)
message.swipe_id = 1
duringParser = () => {}
const unsupported = '[kakao_chat][title]Field Team[date]Today[time]08:30[unread]0[messages][k_date]Today[k_msg from="Participant A" side="left"]Meet at the gate.[/messages][/kakao_chat]'
candidate = '[kakao_chat][title]Field Team[/title][date]Today[/date][time]08:30[/time][unread]0[/unread][messages][k_date]Today[/k_date][k_msg from="Participant A" side="left"]Meet at the gate.[/k_msg][/messages][/kakao_chat]'
const unsupportedRepaired = candidate
message.swipes[1] = message.content = unsupported
const rejectedShape = await preview({ sourceMarkup: unsupported, originalMarkup: unsupported })
assert.equal(rejectedShape.status, 'failed', 'well-formed but unrenderable candidate must not receive approval')
assert.match(rejectedShape.error, /renderer still rejects/)
const invalidManual = await operation({ type: 'native_surface_action', action: 'edit', swipeId: 1, surfaceId: 'kakao', rootTag: 'kakao_chat', originalMarkup: unsupported, replacementMarkup: unsupportedRepaired })
assert.equal(invalidManual.status, 'failed')
assert.match(invalidManual.error, /draft still fails/)
assert.equal(writes, 0, 'Save must not claim success for a still-unrenderable draft')
// Narrative Plot Sparks use the same exact-source preview gates as Core.
candidate = PLOT_SPARKS_REPAIR_EXAMPLE
const malformedSparks = candidate.replace('branch D.[/Text]', 'branch D.')
message.swipes[1] = message.content = malformedSparks
const sparkPayload = { surfaceId: 'plot-sparks', rootTag: 'Plot_Sparks', sourceMarkup: malformedSparks, originalMarkup: malformedSparks }
const sparkReady = await preview(sparkPayload)
assert.equal(sparkReady.status, 'preview-ready', sparkReady.error)
assert.equal(sparkReady.proposedMarkup, candidate)
assert.match(parserInputs.at(-1).messages[0].content, /Text is an opaque value/, 'Spark repair must distinguish literal prose brackets from real field delimiters')
assert.equal(message.content, malformedSparks, 'Spark preview must not mutate stored branches')
const beforeSparkStale = parserCalls
assert.equal((await preview({ ...sparkPayload, swipeId: 0 })).status, 'failed')
assert.equal(parserCalls, beforeSparkStale, 'stale Spark ownership must fail before model spend')
candidate = candidate.replace('Possible branch A.', 'Invented branch.')
assert.equal((await preview(sparkPayload)).status, 'failed', 'Spark repair must not rewrite the story')
async function operation(payload) {
  const requestId = `operation-${events.length}`
  handler({ chatId: 'repair-chat', messageId: message.id, ...payload, ...(payload.type === 'native_surface_action' ? { operationId: requestId } : { requestId }) }, 'repair-user')
  for (let tick = 0; tick < 100; tick++) {
    const result = events.find(row => row.type === 'native_surface_repair_result' && row.requestId === requestId)
    if (result) return result
    await new Promise(resolve => setTimeout(resolve, 0))
  }
  throw new Error('Backend did not acknowledge the Surface operation')
}
const manualPayload = { type: 'native_surface_action', action: 'edit', swipeId: 1, surfaceId: 'plot-sparks', rootTag: 'Plot_Sparks', originalMarkup: malformedSparks, replacementMarkup: PLOT_SPARKS_REPAIR_EXAMPLE }
writeFailure = 'Fixture storage write failed'
const refused = await operation(manualPayload)
assert.equal(refused.status, 'failed')
assert.equal(refused.error, writeFailure, 'manual storage failure must return to the still-open editor')
assert.equal(writes, 0)
writeFailure = ''
assert.equal((await operation({ ...manualPayload, swipeId: 0 })).status, 'failed')
assert.equal(writes, 0, 'stale manual editor must not write another swipe')
assert.equal((await operation(manualPayload)).status, 'applied')
assert.equal(message.content, PLOT_SPARKS_REPAIR_EXAMPLE)
assert.equal(message.skipChunkRebuild, false)
assert.equal(message.swipes[0], 'different swipe')
// The first save seeded an event snapshot. A subsequent host edit must win.
const external = malformedSparks.replace('Possible branch A.', 'Updated branch A.')
message.content = message.swipes[1] = `New surrounding prose.\n${external}\nUnchanged sibling.`
assert.equal((await operation({ ...manualPayload, originalMarkup: external, replacementMarkup: PLOT_SPARKS_REPAIR_EXAMPLE.replace('Possible branch A.', 'Updated branch A.') })).status, 'applied')
assert.match(message.content, /^New surrounding prose\./)
assert.match(message.content, /Unchanged sibling\.$/)
const beforeDuplicate = writes
message.content = message.swipes[1] = `${malformedSparks}\n${malformedSparks}`
assert.equal((await operation(manualPayload)).status, 'failed')
assert.equal(writes, beforeDuplicate, 'duplicate owners must fail rather than replace an arbitrary copy')
candidate = PLOT_SPARKS_REPAIR_EXAMPLE
message.content = message.swipes[1] = malformedSparks
const approved = await preview(sparkPayload)
assert.equal(approved.status, 'preview-ready', approved.error)
assert.equal((await operation({ type: 'native_surface_repair_apply', repairId: approved.repairId })).status, 'applied')
assert.equal(message.content, candidate, 'approved candidate must actually persist')
assert.equal((await operation({ type: 'native_surface_repair_apply', repairId: approved.repairId })).status, 'failed', 'approval is one-use')
const beforeManualModels = parserCalls
const lastManual = await operation({ ...manualPayload, originalMarkup: candidate })
assert.equal(lastManual.status, 'applied', lastManual.error)
assert.equal(parserCalls, beforeManualModels, 'Inspect / Fix must not call a model')
console.log('Assisted repair ownership smoke passed: absent stream metadata resolved to nonzero host swipe; exact source and preview-only behavior preserved; stale, invalid, duplicate, and mid-preview changed ownership rejected.')
