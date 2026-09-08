// @ts-nocheck -- Offline Bun harness; Node types are not a runtime dependency.
import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { renderNativeSurfaceMarkup } from '../src/nativeSurfaces'
import { renderNarrativeRegex, narrativeRegexPack, narrativeRegexScripts } from '../src/narrativeRegexAssets'

const storage = new Map<string, unknown>()
const requests: any[] = []
let resolvedPrompt = ''
;(globalThis as any).spindle = {
  on() {}, onFrontendMessage() {}, registerInterceptor() {}, registerMacro() {}, registerMessageContentProcessor() {}, sendToFrontend() {},
  permissions: { has: () => true }, log: { info() {}, warn() {}, error() {} },
  userStorage: { async getJson(path: string, { fallback }: any) { return structuredClone(storage.get(path) ?? fallback) }, async setJson(path: string, value: any) { storage.set(path, structuredClone(value)) }, async mkdir() {} },
  chats: { async get() { return { character_id: 'alpha' } } }, characters: { async get() { return { id: 'alpha', name: 'Alpha', description: 'black hair' } } },
  personas: { async getActive() { return null } }, chat: { async getMessages() { return [] } },
  connections: { async get() { return { id: 'mock', model: 'mock', provider: 'offline' } } },
  generate: { async raw(request: any) { requests.push(request); return { content: JSON.stringify({ sceneBrief: resolvedPrompt, positivePrompt: resolvedPrompt, prompt: resolvedPrompt, negativePrompt: '', namedSubjects: ['Alpha'], expectedPeopleCount: 1, peoplePolicy: 'required' }) } } },
  imageGen: new Proxy({}, { get() { throw new Error('Live image call forbidden') } }),
}
const backend = await import('../src/backend')
const settings = { ...backend.defaultProseIllustratorSettings(), plannerConnectionId: 'mock', appearanceMemoryEnabled: false }
const config = await backend.getConfig('offline')
const scene = 'Alpha sits side-on beside an open window, bracing one hand on the sill, eyes lowered toward a letter, jaw tight.'
const opportunities: any = { opportunityId: 'scene', chatId: 'offline', messageId: 'm', swipeId: 0, sceneSummary: scene, selectedExcerpt: scene, namedSubjects: ['Alpha'], omittedSubjects: [], expectedPeopleCount: 1, peoplePolicy: 'required', importantProps: [], composition: 'side view' }
for (const mode of ['scene-snapshot', 'sequence', 'emotional-beat', 'solo-scene'] as const) {
  const selected = { ...settings, perspectiveMode: mode, characterOnlySubjects: 'Alpha' }
  const story = backend.resolveIllustratorStoryPrompt(selected, [])
  assert(story.includes(selected.promptRegistry[`story.framing.${mode}`].replace(/\{\{char\}\}/g, 'Alpha')), `${mode}: final Story Model injection lost selected framing`)
  resolvedPrompt = 'side-on medium shot, Alpha seated at the window, torso turned toward a letter, hand braced on sill, lowered eyes, tight jaw'
  const composition = await backend.composePromptForOpportunity('offline', opportunities, scene, selected, 'offline')
  const payload = JSON.stringify(requests.at(-1).messages)
  assert(payload.includes('framingPrompt') && payload.includes(selected.promptRegistry[`story.framing.${mode}`].split('\n')[0]), `${mode}: composer did not receive current mode`)
  assert.equal(composition.positivePrompt, resolvedPrompt + (mode === 'solo-scene' ? ', character-only composition, only Alpha visible, no unrelated people' : ''), `${mode}: writer instructions leaked into composed prompt`)
  const job: any = { chatId: 'offline', messageId: 'm', swipeId: 0, requestId: mode, target: 'prose.illustration', slots: ['image'], count: 1, originalSceneBrief: scene, originalNegativePrompt: '', originalRequestXml: '', cast: 'char', composedPositivePrompt: composition.positivePrompt }
  const prepared = await backend.parseSlotPrompt(job, 'image', [], 0, { ...config, proseIllustratorSettings: selected }, 'offline', { boundCharacterPreset: { presetId: 'identity', prompt: 'adult male, black hair, grey eyes' }, includeCharacters: true })
  assert(prepared.prompt.indexOf('side-on medium shot') < prepared.prompt.indexOf('black hair'), `${mode}: identity displaced the composed camera`)
  assert(!prepared.prompt.includes('FRAMING') && !prepared.prompt.includes('Do not') && !prepared.prompt.includes('Instagram-model'), `${mode}: instruction text reached provider prompt`)
}
// Authored direct gaze and understated emotion must remain possible.
const gaze = 'eye-level photograph, Alpha looking at viewer, deliberately blank expression'
assert(backend.enforceVisualSubjectIdentity(gaze, [{ name: 'Alpha', kind: 'character', prompt: 'black hair' }], true).startsWith(gaze))
const raw = `[SCENE|Station concourse|Evening|Rain easing]
<scene-media><image_request id="compass" target="custom.artifact-media" slot="compass" aspect="16:9"><scene_brief>Empty station concourse in rain.</scene_brief></image_request></scene-media>
<scene-detail>Rain beads on the platform windows.</scene-detail>
<scene-context><reason>The journey reaches the station.</reason><continuity>The same travel bag remains by the bench.</continuity></scene-context>[/SCENE]`
const fixtures: Record<string, string> = {}
for (const variant of ['inline', 'plain-button', 'sparkle-button'] as const) {
  const originals = narrativeRegexPack(variant).scripts
  for (const script of narrativeRegexScripts(variant)) {
    const original = originals.find(row => row.script_id === script.script_id)
    if (original && script.script_id !== 'reverie_scene_tracker_images_v1') assert.equal(script.replace_string, original.replace_string, `${script.script_id}: unrelated styling changed`)
  }
  fixtures[variant] = renderNarrativeRegex(renderNativeSurfaceMarkup(raw, { definitions: {}, activePresetIds: {}, rendererMode: 'relay' } as any, { chatId: 'browser', messageId: 'm', swipeId: 0, autoGenerate: false }).content, variant, 'm')
  assert(fixtures[variant].includes('rr-scene-compass') && fixtures[variant].includes('data-rrn-native-request="compass"'))
  assert(!fixtures[variant].includes('[SCENE|'), 'Compass with lifecycle card failed to render')
}
mkdirSync('artifacts', { recursive: true })
writeFileSync('artifacts/scene-compass-browser-fixtures.json', JSON.stringify(fixtures))
console.log('Scene framing runtime regression passed: four established modes, concrete composer output, provider composition order, direct gaze preserved, and scoped Compass presentation.')
