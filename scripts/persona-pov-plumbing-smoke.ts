// @ts-nocheck -- Offline Bun harness; host APIs are mocked and no provider call is allowed.
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const storage = new Map<string, unknown>()
let chatPersonaId = 'chat-persona'
let activePersona: any = { id: 'global-persona', name: 'Global Persona' }
let connectionReads = 0
let promptInterceptor: ((messages: any[], context: any) => Promise<any>) | null = null

;(globalThis as any).spindle = {
  on() {}, onFrontendMessage() {}, registerInterceptor(handler: any) { promptInterceptor = handler }, registerMacro() {}, registerMessageContentProcessor() {}, sendToFrontend() {},
  permissions: { has: () => true }, log: { info() {}, warn() {}, error() {} },
  userStorage: {
    async getJson(path: string, { fallback }: any) { return structuredClone(storage.get(path) ?? fallback) },
    async setJson(path: string, value: any) { storage.set(path, structuredClone(value)) },
    async mkdir() {},
  },
  chats: { async get() { return { character_id: 'character-1', metadata: { active_persona_id: chatPersonaId } } } },
  characters: { async get() { return { id: 'character-1', name: 'Character One' } } },
  personas: {
    async get(id: string) { return id === 'chat-persona' ? { id, name: 'Chat Persona' } : null },
    async getActive() { return activePersona },
  },
  chat: { async getMessages() { return [] } },
  connections: { async get() { connectionReads += 1; return { id: 'offline', name: 'Offline', provider: 'offline', model: 'offline' } } },
  generate: { async raw() { throw new Error('Provider call forbidden in Persona POV plumbing smoke') } },
  imageGen: new Proxy({}, { get() { throw new Error('Live image call forbidden') } }),
}

const backend = await import('../src/backend')
const protocols = await import('../src/protocols')

storage.set('states/chat-inline.json', {
  proseIllustrator: { settings: {} },
  slots: {}, logs: [],
})
storage.set('config.json', {
  proseIllustratorSettings: { ...backend.defaultProseIllustratorSettings(), enabled: true, mode: 'inline-protocol', automaticProtocolInjection: true, perspectiveMode: 'scene-snapshot' },
  surfacePreferencesInitialized: true,
})
assert(promptInterceptor, 'backend did not register the Story Model prompt interceptor')
const inlineIntercepted = await promptInterceptor!([{ role: 'user', content: 'Gabrielle sits at the workshop soldering bench amid CRTs and cables while Cerys stands between his knees. Gabrielle holds Cerys\'s wrist beside a holographic memory projection under indigo light.' }], { chatId: 'chat-inline', userId: 'user-1' })
const inlineMessages = Array.isArray(inlineIntercepted) ? inlineIntercepted : inlineIntercepted.messages
const inlinePrompt = inlineMessages.map((message: any) => String(message?.content || '')).join('\n\n')
assert(inlinePrompt.includes('REVERIE RELAY — INLINE PROTOCOL'), 'Inline Protocol mode was selected but its real prompt was not injected')
assert(inlinePrompt.includes('<mode>inline-protocol</mode>') && inlinePrompt.includes('<request_illustrations>true</request_illustrations>'), 'Inline Protocol injection lost its live runtime directive')
for (const contract of [
  'The subject of the illustration is the story moment',
  'Emotional importance does not automatically justify a close-up',
  'If the environment, hands, body relationship, or important prop would be lost in a close-up, widen the camera',
  'Do not use cast=\"char+user\" merely because two people are visible',
  'Prefer a meaningfully different scale, angle, or visual center',
  'Relay will not perform a second creative composition pass',
]) {
  assert(inlinePrompt.includes(contract), `resolved Inline Story Model prompt missing cinematic/cast contract: ${contract}`)
}
for (const castValue of ['cast=\"char\"', 'cast=\"user\"', 'cast=\"char+user\"', 'cast=\"none\"']) {
  assert(inlinePrompt.includes(castValue), `resolved Inline Story Model prompt missing bound-identity cast semantics: ${castValue}`)
}
assert(inlinePrompt.includes('cast=\"char+user\" includes BOTH active bound identities'), 'Inline char+user semantics must mean both bound identities, not two arbitrary people')
assert(inlinePrompt.includes('Close-ups remain valid when the scene genuinely calls for them') && /face|eyes|expression|gaze/.test(inlinePrompt), 'Inline cinematic guidance must select close/face detail intentionally rather than banning it')
assert.equal(connectionReads, 0, 'Inline prompt injection must not invoke planner, composer, parser, or provider connections')

const inlineDefinition = protocols.PROMPT_REGISTRY_DEFINITIONS.find((row: any) => row.id === 'story.inline-protocol')
assert(inlineDefinition, 'story.inline-protocol registry definition is missing')
assert.equal(inlineDefinition.version, 2, 'story.inline-protocol registry version must be 2')
const stockInlineV1 = `REVERIE RELAY — INLINE PROTOCOL

Write the completed image-ready request directly at its narrative location. Use the canonical grammar exactly:

<reverie-illustration request="generate" slot="short-stable-slot" aspect="4:3" cast="char" alt="Accessible description"><visual_prompt>Complete scene-specific visual prompt.</visual_prompt></reverie-illustration>

This is a one-pass protocol. Do not emit a planning note, a parser task, an acknowledgement, or a second completion request. When Auto Generate is enabled Relay dispatches the exact inline request after it is parsed; when Auto Generate is disabled it remains a manual lazy slot. Preserve the authored scene, cast, action, setting, and framing. Use cast="none" for object or environment shots.`
const migratedStockInline = backend.normalizeProseIllustratorSettings({
  promptRegistry: { 'story.inline-protocol': stockInlineV1 },
  promptRegistryVersions: { 'story.inline-protocol': 1 },
})
assert.equal(migratedStockInline.promptRegistry['story.inline-protocol'], inlineDefinition.defaultTemplate, 'exact stock Inline v1 must migrate to the v2 default')
assert.equal(migratedStockInline.promptRegistryVersions['story.inline-protocol'], 2, 'migrated stock Inline prompt must record registry version 2')
const customInline = `${stockInlineV1}\n\nCUSTOM USER CAMERA LAW: hold the authored diagonal.`
const preservedCustomInline = backend.normalizeProseIllustratorSettings({
  promptRegistry: { 'story.inline-protocol': customInline },
  promptRegistryVersions: { 'story.inline-protocol': 1 },
})
assert.equal(preservedCustomInline.promptRegistry['story.inline-protocol'], customInline, 'custom Inline registry text must survive normalization unchanged')

const definitions = protocols.PROMPT_REGISTRY_DEFINITIONS.filter((row: any) => row.id.startsWith('story.framing.'))
assert.deepEqual(definitions.map((row: any) => row.id), [
  'story.framing.scene-snapshot', 'story.framing.sequence', 'story.framing.emotional-beat', 'story.framing.solo-scene', 'story.framing.persona-pov',
])
assert(definitions.every((row: any) => row.status === 'stable' && row.version >= 1), 'all framing defaults must be finalized and versioned')
const personaDefinition = definitions.find((row: any) => row.id === 'story.framing.persona-pov')
for (const contract of ['Treat the active Persona as a physically located observer', 'Resolve where the Persona is before writing', 'Characters may meet the lens', 'Do not add generic hands']) {
  assert(personaDefinition.defaultTemplate.includes(contract), `Persona POV final contract missing: ${contract}`)
}

for (const [legacy, canonical] of Object.entries({ creative: 'scene-snapshot', 'scene-led': 'scene-snapshot', static: 'sequence', 'continuity-frame': 'sequence', dynamic: 'emotional-beat', 'expressive-frame': 'emotional-beat', 'character-only': 'solo-scene', 'persona-pov': 'persona-pov' })) {
  assert.equal(backend.normalizeProseIllustratorSettings({ perspectiveMode: legacy }).perspectiveMode, canonical, `${legacy} did not migrate to ${canonical}`)
}

const customLegacy = 'MY CUSTOM LEGACY SCENE PROMPT'
const migrated = backend.normalizeProseIllustratorSettings({
  perspectiveMode: 'scene-led',
  adaptiveMode: true,
  promptRegistry: { 'story.framing.scene-led': customLegacy },
  sceneLedFramingPrompt: 'mirror must not override registry',
})
assert.equal(migrated.perspectiveMode, 'scene-snapshot')
assert.equal(migrated.promptRegistry['story.framing.scene-snapshot'], customLegacy)

const canonicalWins = backend.normalizeProseIllustratorSettings({
  perspectiveMode: 'character-only', adaptiveMode: true,
  promptRegistry: { 'story.framing.scene-led': 'legacy', 'story.framing.scene-snapshot': 'canonical' },
})
assert.equal(canonicalWins.promptRegistry['story.framing.scene-snapshot'], 'canonical')
assert.equal(canonicalWins.perspectiveMode, 'solo-scene')
assert.equal(canonicalWins.adaptiveMode, false)
assert.equal(backend.normalizeProseIllustratorSettings({ perspectiveMode: 'persona-pov', adaptiveMode: true }).adaptiveMode, false)

const chatBound = await backend.resolvePersonaPovContext('chat-1', 'user-1')
assert.deepEqual(chatBound, { available: true, personaId: 'chat-persona', personaName: 'Chat Persona', binding: 'chat-persona' })
chatPersonaId = ''
const globalBound = await backend.resolvePersonaPovContext('chat-1', 'user-1')
assert.equal(globalBound.binding, 'active-persona')

const personaSettings = { ...backend.defaultProseIllustratorSettings(), perspectiveMode: 'persona-pov' as const }
for (const mode of ['model-placed', 'inline-protocol', 'relay-planned'] as const) {
  const settings = { ...personaSettings, mode }
  const resolved = backend.resolveIllustratorStoryPrompt(settings, [], globalBound)
  assert(resolved.includes('Camera holder: Global Persona'), `${mode} lost resolved Persona POV runtime context`)
  assert(!/cast\s*=\s*["']Global Persona/i.test(resolved), `${mode} incorrectly added the camera holder to cast`)
  assert(!resolved.includes('only the selected subject') && !resolved.includes('No persona, second character'), `${mode} leaked Solo Scene constraints into Persona POV`)
}

activePersona = null
const unavailable = await backend.resolvePersonaPovContext('chat-1', 'user-1')
assert.deepEqual(unavailable, { available: false, binding: 'unavailable' })
const unavailableRuntime = backend.buildIllustratorRuntimeDirective({ ...personaSettings, mode: 'model-placed' }, [], unavailable)
assert(unavailableRuntime.includes('<request_illustrations>false</request_illustrations>'), 'Model-Placed Persona POV must emit no request when Persona resolution fails')
await assert.rejects(
  backend.composePromptForOpportunity('chat-1', { opportunityId: 'x' } as any, 'scene', { ...personaSettings, mode: 'relay-planned', plannerConnectionId: 'offline' }, 'user-1'),
  /Persona POV cannot compose or dispatch/,
)
assert.equal(connectionReads, 0, 'unavailable Persona POV must reject before Sidecar/provider lookup')

const frontendSource = await readFile(new URL('../src/frontend.ts', import.meta.url), 'utf8')
const backendSource = await readFile(new URL('../src/backend.ts', import.meta.url), 'utf8')
assert(frontendSource.includes("label: 'Scene Snapshot'") && frontendSource.includes("label: 'Sequence'") && frontendSource.includes("label: 'Emotional Beat'") && frontendSource.includes("label: 'Solo Scene'") && frontendSource.includes("label: 'Persona POV'"), 'all five framing cards must be present')
assert(frontendSource.includes('dg-choice-five') && frontendSource.includes('repeat(2, minmax(0,1fr))'), 'five framing cards need a responsive narrow layout')
assert(backendSource.includes("settings.mode === 'inline-protocol' ? 'story.inline-protocol'"), 'Inline preview must identify story.inline-protocol')

console.log('Persona POV plumbing smoke passed: migration, resolver priority, finalized registry, no-Persona refusal, five-card UI, and real Inline Protocol injection.')
