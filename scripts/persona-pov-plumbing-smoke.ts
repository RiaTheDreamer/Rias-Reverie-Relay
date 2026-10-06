// @ts-nocheck -- Offline Bun harness; host APIs are mocked and no provider call is allowed.
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { assertProviderRequestSafe } from '../src/providerPromptSafety'

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
assert(inlinePrompt.includes('REVERIE RELAY — MODEL PLANNED ILLUSTRATIONS'), 'Model Planned mode was selected but its real prompt was not injected')
assert(inlinePrompt.includes('<mode>inline-protocol</mode>') && inlinePrompt.includes('<request_illustrations>true</request_illustrations>'), 'Inline Protocol injection lost its live runtime directive')
for (const contract of [
  'The subject is the story moment',
  'Emotional importance does not automatically justify a close-up',
  'If the environment, hands, body relationship, or important prop would be lost in a close-up, widen the camera',
  'Do not use cast="char+user" merely because two people are visible',
  'Prefer a meaningfully different scale, angle, or visual center',
  'Relay will not perform a second creative composition pass',
]) {
  assert(inlinePrompt.includes(contract), `resolved Inline Story Model prompt missing cinematic/cast contract: ${contract}`)
}
for (const castValue of ['\"char\" = active Character', '\"user\" = active Persona', '\"char+user\" = both', '\"none\" = neither']) {
  assert(inlinePrompt.includes(castValue), `resolved Inline Story Model prompt missing bound-identity cast semantics: ${castValue}`)
}
assert(inlinePrompt.includes('\"char+user\" = both'), 'Inline char+user semantics must mean both bound identities, not two arbitrary people')
assert(inlinePrompt.includes('close-ups remain valid when the visible beat genuinely calls for one') && /face|eyes|expression|gaze/.test(inlinePrompt), 'Inline cinematic guidance must select close/face detail intentionally rather than banning it')
for (const fragment of ['establish visible count and camera', 'each subject\'s position/orientation/pose', 'the shared action or exact contact', 'scene\'s depth and environmental anchors']) {
  assert(inlinePrompt.includes(fragment), `Model Planned visual prompt lost subject-owned composition order: ${fragment}`)
}
assert.equal(connectionReads, 0, 'Inline prompt injection must not invoke planner, composer, parser, or provider connections')

const inlineDefinition = protocols.PROMPT_REGISTRY_DEFINITIONS.find((row: any) => row.id === 'story.inline-protocol')
assert(inlineDefinition, 'story.inline-protocol registry definition is missing')
assert.equal(inlineDefinition.version, 10, 'story.inline-protocol registry version must be 10')
const stockInlineV1 = `REVERIE RELAY — INLINE PROTOCOL

Write the completed image-ready request directly at its narrative location. Use the canonical grammar exactly:

<reverie-illustration request="generate" slot="short-stable-slot" aspect="4:3" cast="char" alt="Accessible description"><visual_prompt>Complete scene-specific visual prompt.</visual_prompt></reverie-illustration>

This is a one-pass protocol. Do not emit a planning note, a parser task, an acknowledgement, or a second completion request. When Auto Generate is enabled Relay dispatches the exact inline request after it is parsed; when Auto Generate is disabled it remains a manual lazy slot. Preserve the authored scene, cast, action, setting, and framing. Use cast="none" for object or environment shots.`
const migratedStockInline = backend.normalizeProseIllustratorSettings({
  promptRegistry: { 'story.inline-protocol': stockInlineV1 },
  promptRegistryVersions: { 'story.inline-protocol': 1 },
})
assert(!Object.prototype.hasOwnProperty.call(migratedStockInline.promptRegistry, 'story.inline-protocol'), 'exact stock Inline v1 must migrate by deleting the obsolete override')
assert.equal(migratedStockInline.promptRegistryVersions['story.inline-protocol'], 10, 'migrated stock Inline prompt must record registry version 10')
assert.equal(backend.normalizeProseIllustratorSettings({ mode: 'model-placed' }).mode, 'inline-protocol', 'saved Model-Placed mode must migrate to Model Planned')
const customInline = `${stockInlineV1}\n\nCUSTOM USER CAMERA LAW: hold the authored diagonal.`
const preservedCustomInline = backend.normalizeProseIllustratorSettings({
  promptRegistry: { 'story.inline-protocol': customInline },
  promptRegistryVersions: { 'story.inline-protocol': 1 },
})
assert.equal(preservedCustomInline.promptRegistry['story.inline-protocol'], customInline, 'custom Inline registry text must survive normalization unchanged')

const definitions = protocols.PROMPT_REGISTRY_DEFINITIONS.filter((row: any) => row.id.startsWith('story.framing.'))
assert.deepEqual(definitions.map((row: any) => row.id), [
  'story.framing.scene-snapshot', 'story.framing.sequence', 'story.framing.emotional-beat', 'story.framing.solo-scene', 'story.framing.persona-pov', 'story.framing.storyboard',
])
assert(definitions.every((row: any) => row.status === 'stable' && row.version >= 1), 'all framing defaults must be finalized and versioned')
const personaDefinition = definitions.find((row: any) => row.id === 'story.framing.persona-pov')
assert.equal(personaDefinition.version, 6, 'Persona POV visibility contract must publish as framing version 6')
for (const contract of ['active Persona is the camera/viewpoint only', 'never visible', 'Never depict any part of the Persona\'s body', 'must not appear as imagery on a monitor', 'Never turn this first-person view into a selfie']) {
  assert(personaDefinition.defaultTemplate.includes(contract), `Persona POV final contract missing: ${contract}`)
}

const stockPersonaPovV4 = `PERSONA POV FRAMING

Treat the active Persona as a physically located observer inside the scene.

Resolve where the Persona is before writing the prompt: standing or seated position, eye height, orientation, distance, foreground obstruction, nearby objects, and the direction of attention. The camera must feel attached to that location rather than floating outside the event.

Show what the Persona can actually see from that position. Characters may meet the lens when they are speaking to, touching, recognizing, confronting, or intentionally looking at the Persona. Otherwise, direct their attention toward the person, object, movement, or environment that holds it.

The Persona may remain entirely unseen. Do not add generic hands, knees, shoulders, reflections, mirror shots, or selfie framing. Only depict Persona body parts when the scene establishes them.`
const migratedStockPersonaPov = backend.normalizeProseIllustratorSettings({
  promptRegistry: { 'story.framing.persona-pov': stockPersonaPovV4 },
  promptRegistryVersions: { 'story.framing.persona-pov': 4 },
})
assert(!Object.prototype.hasOwnProperty.call(migratedStockPersonaPov.promptRegistry, 'story.framing.persona-pov'), 'exact stock Persona POV v4 must migrate to the invisible-viewpoint contract')
assert.equal(migratedStockPersonaPov.promptRegistryVersions['story.framing.persona-pov'], 6, 'migrated stock Persona POV must record registry version 6')

const stockPersonaPovV5 = `PERSONA POV FRAMING

The active Persona is the camera/viewpoint only. The final image is what that Persona sees from their eyes; the active Persona is never visible and is never part of the depicted cast.

Resolve the Persona's eye position, height, orientation, distance, foreground obstruction, nearby objects, and direction of attention. Attach the camera to that exact location rather than floating outside the event.

Show only what the Persona can see from that position. Never depict any part of the Persona's body—not hands, arms, legs, shoulders, or torso—and never show the Persona in a mirror, reflection, screen, photograph, silhouette, or shadow. Do not include the Persona's appearance or identity in visible-character descriptions, subject counts, or cast lists.

Other visible characters may meet the lens only when the scene establishes that they are speaking to, recognizing, confronting, or intentionally addressing the Persona. Otherwise, their gaze must follow the person, object, movement, or environment that holds their attention. Never turn this first-person view into a selfie or an outside-observer shot.`
const migratedStockPersonaPovV5 = backend.normalizeProseIllustratorSettings({
  promptRegistry: { 'story.framing.persona-pov': stockPersonaPovV5 },
  promptRegistryVersions: { 'story.framing.persona-pov': 5 },
})
assert(!Object.prototype.hasOwnProperty.call(migratedStockPersonaPovV5.promptRegistry, 'story.framing.persona-pov'), 'exact stock Persona POV v5 must migrate to the strengthened no-depiction contract')
assert.equal(migratedStockPersonaPovV5.promptRegistryVersions['story.framing.persona-pov'], 6, 'migrated stock Persona POV v5 must record registry version 6')

const personaSubjects = [
  { id: 'gabrielle', name: 'Gabrielle', kind: 'character', prompt: 'short dark hair', negativePrompt: '' },
  { id: 'cerys-profile', name: 'Cerys the Dreamer', kind: 'persona', prompt: 'branching horns, pink markings', negativePrompt: '' },
  { id: 'legacy-alias', name: 'Cerys', kind: 'character', prompt: 'long dark hair, horns', negativePrompt: '' },
]
const visiblePovSubjects = backend.filterPersonaPovVisualSubjects(personaSubjects, 'persona-pov', {
  id: 'cerys-profile', name: 'Cerys the Dreamer', aliases: ['Cerys'],
})
assert.deepEqual(visiblePovSubjects.map((subject: any) => subject.name), ['Gabrielle'], 'Persona POV must exclude the camera-holder profile and any name/alias match from visible subject identity')
const sceneNamedPovSubjects = backend.filterPersonaPovVisualSubjects([
  personaSubjects[0], personaSubjects[2],
], 'persona-pov', { id: 'unbound-default-persona', name: 'Arin' },
'First-person view from Cerys\'s standing eye-level across the mixing console; Gabrielle is the only visible person.')
assert.deepEqual(sceneNamedPovSubjects.map((subject: any) => subject.name), ['Gabrielle'], 'Persona POV must not inject a named camera-holder from the scene brief when the host Persona binding falls back to an unrelated default')
const explicitlyNamedPovSubjects = backend.filterPersonaPovVisualSubjects([
  personaSubjects[0], personaSubjects[2],
], 'persona-pov', { id: 'unbound-default-persona', name: 'Arin' },
'The image is Cerys\'s POV; Gabrielle stands across the mixing console.')
assert.deepEqual(explicitlyNamedPovSubjects.map((subject: any) => subject.name), ['Gabrielle'], 'Persona POV must filter explicit name-plus-POV declarations')
const unseenCameraPovSubjects = backend.filterPersonaPovVisualSubjects([
  personaSubjects[0], personaSubjects[2],
], 'persona-pov', { id: 'unbound-default-persona', name: 'Arin' },
'One visible person: Gabrielle; Cerys is the unseen camera viewpoint just inside the booth.')
assert.deepEqual(unseenCameraPovSubjects.map((subject: any) => subject.name), ['Gabrielle'], 'Persona POV must not append an explicitly unseen camera-holder as a second visual subject')
assert.equal(backend.filterPersonaPovVisualSubjects(personaSubjects, 'scene-snapshot', { name: 'Cerys the Dreamer', aliases: ['Cerys'] }).length, 3, 'other framing modes must retain their existing visible-cast identity behavior')
assert.equal(backend.chatBoundPersonaId({ metadata: {} }, [
  { id: 'user-old', role: 'user', is_user: true, content: '', extra: { persona_id: 'persona-old' } },
  { id: 'assistant', role: 'assistant', content: '', extra: { persona_id: 'must-not-win' } },
  { id: 'user-current', role: 'user', is_user: true, content: '', extra: { persona_id: 'persona-cerys' } },
]), 'persona-cerys', 'Persona POV binding must follow the latest user-authored message Persona when chat metadata has no binding')
assert.equal(backend.chatBoundPersonaId({ metadata: { active_persona_id: 'persona-chat' } }, [
  { id: 'user-current', role: 'user', is_user: true, content: '', extra: { persona_id: 'persona-cerys' } },
]), 'persona-chat', 'an explicit chat-level Persona binding must take priority over message history')
assert(backend.buildPersonaPovNegativePrompt(['Cerys']).includes('Cerys on a monitor') && backend.buildPersonaPovNegativePrompt(['Cerys']).includes('portrait of Cerys'), 'Persona POV negative prompt must explicitly exclude the camera-holder from screens and portraits')
const personaPovFinalPrompt = backend.finalizeParsedPositivePrompt('First-person view from Cerys the Dreamer\'s standing eye-level; Cerys watches Gabrielle', 'person-focused candid', { cast: 'char', originalSceneBrief: 'Cerys watches Gabrielle' } as any, 'persona-pov', ['Cerys the Dreamer', 'Cerys'])
assert(!/\bCerys\b/iu.test(personaPovFinalPrompt) && personaPovFinalPrompt.includes('the camera-holder\'s standing eye-level'), 'provider-facing Persona POV prompt must remove the camera-holder name from positive visual text')
assert(!personaPovFinalPrompt.includes('Persona POV visibility lock:') && !personaPovFinalPrompt.includes('active Persona is the camera only'), 'provider-facing positive prompt must not contain the Story/Sidecar Persona POV control contract')
const echoedPersonaPovContract = 'Persona POV visibility lock: the active Persona is the camera only and is never a visible subject. Show no part of the camera-holder (hands, arms, legs, shoulders, or torso), and no camera-holder reflection, mirror image, screen image, photograph, video, portrait, poster, avatar, silhouette, or shadow anywhere in frame. Do not invent people, faces, photographs, portraits, posters, or avatars on background monitors, phones, displays, or framed material; unless the scene explicitly requires such content, keep those surfaces blank, dark, or abstract. Never show an image or likeness of the camera-holder. Count only other people who are actually visible in the scene.'
const repairedPersonaPovPrompt = backend.finalizeParsedPositivePrompt(`Eye-level first-person view across a kitchen table; ${echoedPersonaPovContract} Gabrielle holds a ceramic bowl in the warm kitchen.`, 'person-focused candid', { cast: 'char', originalSceneBrief: 'Gabrielle holds a ceramic bowl in a warm kitchen.' } as any, 'persona-pov', ['Cerys'])
assert(!repairedPersonaPovPrompt.includes('Persona POV visibility lock:') && repairedPersonaPovPrompt.includes('Eye-level first-person view') && repairedPersonaPovPrompt.includes('Gabrielle holds a ceramic bowl'), 'echoed Story Model Persona POV control contract should be removed without losing the visual scene')
assert.doesNotThrow(() => assertProviderRequestSafe(repairedPersonaPovPrompt), 'sanitized Persona POV visual prompt must pass the provider contamination gate')

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
const framingModes = ['scene-snapshot', 'sequence', 'emotional-beat', 'solo-scene', 'persona-pov', 'storyboard'] as const
for (const selectedMode of framingModes) {
  const settings = { ...backend.defaultProseIllustratorSettings(), enabled: true, mode: 'inline-protocol' as const, perspectiveMode: selectedMode }
  const resolved = backend.resolveIllustratorStoryPrompt(settings, [], globalBound)
  const selectedHeading = protocols.DEFAULT_PROMPT_REGISTRY[`story.framing.${selectedMode}`].split('\n')[0]
  assert(resolved.includes(selectedHeading), `Model Planned did not inject selected ${selectedMode} framing`)
  for (const otherMode of framingModes.filter(mode => mode !== selectedMode)) {
    const otherHeading = protocols.DEFAULT_PROMPT_REGISTRY[`story.framing.${otherMode}`].split('\n')[0]
    assert(!resolved.includes(otherHeading), `Model Planned injected unselected ${otherMode} framing`)
  }
}
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
assert(frontendSource.includes("label: 'Scene Snapshot'") && frontendSource.includes("label: 'Sequence'") && frontendSource.includes("label: 'Emotional Beat'") && frontendSource.includes("label: 'Char only'") && frontendSource.includes("label: 'Persona POV'"), 'all five framing cards must be present')
assert(frontendSource.includes('dg-choice-five') && frontendSource.includes('repeat(2, minmax(0,1fr))'), 'five framing cards need a responsive narrow layout')
assert(backendSource.includes("settings.mode === 'inline-protocol' ? 'story.inline-protocol'"), 'Inline preview must identify story.inline-protocol')

console.log('Persona POV plumbing smoke passed: migration, resolver priority, finalized registry, no-Persona refusal, framing UI, and real Inline Protocol injection.')
