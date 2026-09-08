// @ts-nocheck -- Offline Bun harness; host APIs are mocked and no provider call is allowed.
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const storage = new Map<string, unknown>()
let chatPersonaId = 'chat-persona'
let activePersona: any = { id: 'global-persona', name: 'Global Persona' }
let connectionReads = 0

;(globalThis as any).spindle = {
  on() {}, onFrontendMessage() {}, registerInterceptor() {}, registerMacro() {}, registerMessageContentProcessor() {}, sendToFrontend() {},
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

console.log('Persona POV plumbing smoke passed: migration, resolver priority, finalized registry, no-Persona refusal, five-card UI, and inline preview identity.')
