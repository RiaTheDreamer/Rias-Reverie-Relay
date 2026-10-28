// @ts-nocheck -- production backend with delayed, offline model responses.
import assert from 'node:assert/strict'
import { emptyContinuityVault, appearanceMemoryView, addAppearanceFacts, registerCanonicalCharacter } from '../src/vault'
import { normalizeAppearanceSidecarOutput, ingestAppearanceSidecarObservations } from '../src/appearanceSidecar'
import { validateRelayPlannedDirectorResult } from '../src/relayPlannedV2'

const storage = new Map<string, any>()
const requests: any[] = []
const sent: any[] = []
const events = new Map<string, Function>()
let frontend: Function
let gate: Promise<void> | null = null
let outfit = 'black_shirt, jeans'
let failed = false
let message = { id: 'dressed', role: 'assistant', is_user: false, swipe_id: 0, content: 'Mira stands beside the bathroom door wearing a black shirt and jeans.' }
const observation = () => JSON.stringify({ subjects: [{ name: 'Mira', role: 'character', canonical: { hair: { booruTags: ['black_hair'] } },
  current: outfit === 'nude' ? { intimateState: { booruTags: ['nude'] } } : { attire: { booruTags: outfit.split(', ') } } }] })
globalThis.spindle = {
  on(name, handler) { events.set(name, handler) }, onFrontendMessage(handler) { frontend = handler }, registerInterceptor() {}, registerMacro() {}, registerMessageContentProcessor() {},
  sendToFrontend(value) { sent.push(value) }, permissions: { has: () => true }, log: { info() {}, warn() {}, error() {} },
  userStorage: { async getJson(path, { fallback } = {}) { return structuredClone(storage.get(path) ?? fallback ?? {}) }, async setJson(path, value) { storage.set(path, structuredClone(value)) }, async mkdir() {} },
  chats: { async get() { return { character_id: 'mira' } } }, characters: { async get() { return { id: 'mira', name: 'Mira', description: 'Adult woman, black hair.' } } },
  personas: { async getActive() { return null } }, chat: { async getMessages() { return [structuredClone(message)] } },
  connections: { async get(id) { return { id, name: id, provider: 'offline', model: 'offline' } }, async list() { return [] } },
  generate: { async raw(request) {
    // Workflow diagnostics are deliberately removed from the host request.
    request = { ...request, relayWorkflow: request.connection_id === 'appearance' ? 'appearance-sidecar'
      : request.messages.some(row => row.content.includes('Sidecar Prompt Composer')) ? 'composer' : 'relay-planned-director' }
    requests.push(structuredClone(request))
    if (request.relayWorkflow === 'appearance-sidecar') {
      const result = observation(); if (gate) await gate
      if (failed) throw new Error('Offline Sidecar outage')
      return { content: result }
    }
    if (request.relayWorkflow === 'relay-planned-director') {
      const content = JSON.stringify({ shouldIllustrate: true, reason: 'Visible current scene', illustrations: [{
      rank: 1, title: 'Bathroom', reason: 'Current scene', anchor: { paragraphIndex: 0, insertionSide: 'after', anchorExcerpt: message.content }, aspectRatio: '4:3',
      expectedPeopleCount: 1, namedSubjects: ['Mira'], omittedSubjects: [],
      subjectDirectives: [{ name: 'Mira', role: 'character', appearanceOverrides: [], attireOverrides: [], temporaryTraits: [], expression: '', pose: 'standing', action: 'Mira stands', gaze: '', contact: '' }],
      composition: { shotType: 'medium shot', cameraAngle: 'eye level', framing: 'waist-up', blocking: 'Mira centered', foreground: '', background: 'bathroom tiles', location: 'bathroom', timeOfDay: 'day', lighting: 'soft daylight', mood: 'calm', importantProps: [], backgroundPeople: '' },
      promptCore: 'Mira standing in the bathroom', negativeCore: '', referenceAssetIds: [], locationReferenceAssetIds: [],
    }] })
      const state = [...storage.values()].find(row => row.continuityVault?.characters?.mira)
      const context = backend.relayPlannedContextForResponse({ chatId: 'wardrobe-chat', messageId: message.id, swipeId: 0, content: message.content, state, settings, config: await backend.getConfig('test') })
      const checked = validateRelayPlannedDirectorResult(content, context)
      assert(checked.illustrations.every(row => !row.rejected && !row.requiresRepair), JSON.stringify(checked.illustrations.map(row => row.issues)))
      return { content }
    }
    return { content: JSON.stringify({ positivePrompt: `Mira standing, ${outfit}`, negativePrompt: '', namedSubjects: ['Mira'], expectedPeopleCount: 1, peoplePolicy: 'required' }) }
  } },
  imageGen: { async listConnections() { return [{ id: 'image', provider: 'swarmui', model: 'fixture', parameters: {} }] }, async getConnection() { return { id: 'image', provider: 'swarmui', model: 'fixture', parameters: {} } }, async getProviders() { return [] }, async generate() { throw new Error('Image spending forbidden') } },
  images: { async list() { return [] } }, variables: { global: { async set() {} }, chat: { async set() {} } },
}
const backend = await import('../src/backend')
const settings = { ...backend.defaultProseIllustratorSettings(), enabled: true, mode: 'relay-planned', plannerConnectionId: 'director',
  appearanceMemoryEnabled: true, appearanceMemoryOverride: 'strong', perspectiveMode: 'scene-led', promptFormat: 'prose', modelPlacedCountMode: 'fixed', illustrationsPerRun: 1, skipShortMessages: false }
await backend.setConfig({ enabled: true, autoGenerate: false, parserRetries: 0, parserConnectionId: 'appearance', appearanceSidecarConnectionId: 'appearance',
  followNativeParser: false, followNativeImageGen: false, imageConnectionId: 'image', proseIllustratorSettings: settings, storyConstellationsEnabled: false, phoneEnabled: false }, 'test')
const opportunity = () => ({ messageId: message.id, swipeId: message.swipe_id, namedSubjects: ['Mira'], expectedPeopleCount: 1, sceneSummary: 'bathroom', selectedExcerpt: message.content,
  backgroundPeople: '', importantProps: [], omittedSubjects: [], referenceAssetIds: [], locationReferenceAssetIds: [] })
const until = async (condition: () => boolean) => { for (let i = 0; i < 400; i++) { if (condition()) return; await new Promise(resolve => setTimeout(resolve, 5)) } throw new Error(`Timed out; outputs: ${JSON.stringify(sent.filter(row => row.type !== 'state').slice(-3))}`) }
const workflowCount = (name: string) => requests.filter(request => request.relayWorkflow === name).length
const vault = () => [...storage.values()].find(state => state.continuityVault?.characters?.mira)?.continuityVault
const compose = () => backend.composePromptForOpportunity('wardrobe-chat', opportunity(), message.content, settings, 'test')

await compose()
assert.match(appearanceMemoryView(vault(), 'mira').currentOutfit, /black_shirt.*jeans/, JSON.stringify({ workflows: requests.map(row => row.relayWorkflow), wardrobe: vault().wardrobe, logs: [...storage.values()].flatMap(row => row.logs || []).slice(-3) }))
message = { ...message, id: 'shower', content: 'Mira stands unclothed under the shower.' }; outfit = 'nude'
let release: Function
gate = new Promise(resolve => { release = resolve })
const before = workflowCount('composer')
const pending = compose()
await until(() => workflowCount('appearance-sidecar') === 2)
assert.equal(workflowCount('composer'), before, 'Composer must wait for the exact completed turn')
release(); await pending; gate = null
assert.equal(appearanceMemoryView(vault(), 'mira').currentOutfit, 'nude', 'Full undress must replace the old automatic outfit')
const composedRequest = requests.filter(request => request.relayWorkflow === 'composer').at(-1)
assert(composedRequest.messages.some(row => row.content.includes('nude')), 'fresh outfit never reached the Composer')
assert(!composedRequest.messages.some(row => /black_shirt|jeans/.test(row.content)), 'old outfit leaked into current Composer input')
await compose()
assert.equal(workflowCount('appearance-sidecar'), 2, 'same turn must share one settled refresh')

// Relay-Planned does not use the legacy Composer: prove its Director and local
// compiler also wait and re-read storage instead of retaining their old state.
message = { ...message, id: 'redressed', content: 'Mira stands by the sink wearing a bathrobe.' }; outfit = 'bathrobe'
gate = new Promise(resolve => { release = resolve })
const noticeCount = sent.length
frontend({ type: 'prose_illustrator_action', action: 'plan_message', chatId: 'wardrobe-chat', messageId: message.id, swipeId: 0 }, 'test')
await until(() => workflowCount('appearance-sidecar') === 3)
assert.equal(workflowCount('relay-planned-director'), 0, 'Director raced the wardrobe refresh')
release(); gate = null
await until(() => sent.slice(noticeCount).some(row => row.type === 'relay_notice' && /created an illustration plan/.test(row.message)))
const director = requests.find(row => row.relayWorkflow === 'relay-planned-director')
assert(director.messages.some(row => row.content.includes('bathrobe')), 'Director kept the pre-refresh snapshot')
assert(!director.messages.some(row => row.content.includes('"nude"')), 'redressed Director retained naked outfit')
const state = [...storage.values()].find(row => row.continuityVault?.characters?.mira)
const plan = Object.values(state.proseIllustrator.plans).at(-1)
assert.match(plan.promptComposition.positivePrompt, /bathrobe/)
assert.doesNotMatch(plan.promptComposition.positivePrompt, /nude|black_shirt|jeans/)

message = { ...message, id: 'preview', content: 'Mira stands beside the sink.' }
const appearanceCalls = workflowCount('appearance-sidecar')
frontend({ type: 'dry_run', kind: 'relay-planned', chatId: 'wardrobe-chat', messageId: message.id, swipeId: 0 }, 'test')
await until(() => sent.some(row => row.type === 'dry_run_result'))
assert.equal(workflowCount('appearance-sidecar'), appearanceCalls, 'preview unexpectedly refreshed/spent Appearance')

message = { ...message, id: 'outage' }; failed = true
await compose(); failed = false
assert.equal(appearanceMemoryView(vault(), 'mira').currentOutfit, 'bathrobe', 'outage erased known wardrobe')
message = { ...message, id: 'cancelled' }; outfit = 'nude'
gate = new Promise(resolve => { release = resolve })
const cancelled = compose()
await until(() => workflowCount('appearance-sidecar') === appearanceCalls + 2)
const composerCalls = workflowCount('composer')
frontend({ type: 'prose_illustrator_action', action: 'cancel_active', chatId: 'wardrobe-chat' }, 'test')
await until(() => sent.some(row => row.type === 'relay_notice' && /Cancelled active scene analysis/.test(row.message)))
release(); await assert.rejects(cancelled, /cancelled by user/i); gate = null
assert.equal(workflowCount('composer'), composerCalls, 'cancelled refresh started a successor Composer')
assert.equal(appearanceMemoryView(vault(), 'mira').currentOutfit, 'bathrobe', 'late cancelled Sidecar overwrote wardrobe')

// The orb action reconciles Appearance without scanning or regenerating slots.
message = { ...message, id: 'orb-rescan', content: 'Mira wears a blue sweater by the window.' }; outfit = 'blue_sweater'
const beforeRescan = requests.length, noticesBeforeRescan = sent.length
gate = new Promise(resolve => { release = resolve })
frontend({ type: 'continuity_action', action: 'rescan_appearance', chatId: 'wardrobe-chat' }, 'test')
await until(() => requests.length === beforeRescan + 1)
frontend({ type: 'continuity_action', action: 'rescan_appearance', chatId: 'wardrobe-chat' }, 'test')
await until(() => sent.slice(noticesBeforeRescan).some(row => row.type === 'relay_notice' && /already running/.test(row.message)))
assert.equal(requests.length, beforeRescan + 1, 'Repeated orb rescans share a single active request')
release(); gate = null
await until(() => sent.slice(noticesBeforeRescan).some(row => row.type === 'relay_notice' && row.level === 'success' && /rescan completed/.test(row.message)))
assert.equal(appearanceMemoryView(vault(), 'mira').currentOutfit, 'blue_sweater')
assert.deepEqual(requests.slice(beforeRescan).map(row => row.relayWorkflow), ['appearance-sidecar'], 'An Appearance-only scan must never run the Director, Composer or image provider')

// Partial exposure, another owner's outfit, and manual overrides are not a
// license to erase clothing or identity across the cast.
const scoped = emptyContinuityVault('scoped')
for (const name of ['Mira', 'Nina']) {
  registerCanonicalCharacter(scoped, { name, canonicalCharacterId: name.toLowerCase(), sourceType: 'manual', userConfirmed: true })
  addAppearanceFacts(scoped, { characterId: name.toLowerCase(), layer: 'wardrobe', category: 'current-outfit', value: 'shirt, trousers', sourceType: 'appearance-sidecar', semanticAuthority: 'appearance-sidecar', currentWardrobe: true })
}
const input = { chatId: 'scoped', messageId: 'new', swipeId: 0, activeCharacter: { id: 'mira', name: 'Mira', aliases: [] }, activePersona: null }
const scan = (tags: string[]) => ingestAppearanceSidecarObservations(scoped, normalizeAppearanceSidecarOutput(JSON.stringify({ subjects: [{ name: 'Mira', role: 'character', current: { intimateState: { booruTags: tags } } }] })), input)
scan(['barefoot', 'topless']); assert.match(appearanceMemoryView(scoped, 'mira').currentOutfit, /shirt/)
scan(['nude']); assert.equal(appearanceMemoryView(scoped, 'mira').currentOutfit, 'nude')
assert.match(appearanceMemoryView(scoped, 'nina').currentOutfit, /shirt.*trousers/)
addAppearanceFacts(scoped, { characterId: 'mira', layer: 'wardrobe', category: 'current-outfit', value: 'green_shirt', sourceType: 'manual', userConfirmed: true, currentWardrobe: true })
scan(['nude']); assert.equal(appearanceMemoryView(scoped, 'mira').currentOutfit, 'green_shirt')
console.log('Appearance turn-order passed: delayed Composer/Director, fresh compiler snapshot, dressed -> nude -> redressed, per-turn dedupe, preview, outage, cancellation, owner scope and manual locks; no live providers.')
