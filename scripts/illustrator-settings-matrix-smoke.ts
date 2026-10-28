// @ts-nocheck -- Offline Bun harness: production normalization/directives, no host or providers.
import assert from 'node:assert/strict'
import { DEFAULT_PROMPT_REGISTRY, ILLUSTRATOR_FRAMING_REGISTRY_ALIASES } from '../src/protocols'

let providerCalls = 0
const forbidProvider = () => { providerCalls++; throw new Error('Offline matrix cannot dispatch generation') }
globalThis.spindle = {
  on() {}, onFrontendMessage() {}, registerInterceptor() {}, registerMacro() {}, registerMessageContentProcessor() {}, sendToFrontend() {},
  permissions: { has: () => true }, log: { info() {}, warn() {}, error() {} },
  generate: { raw: forbidProvider }, imageGen: { generate: forbidProvider },
}
const backend = await import('../src/backend')
const defaults = backend.defaultProseIllustratorSettings()
const modes = ['off', 'relay-planned', 'inline-protocol', 'model-placed']
const framings = ['scene-snapshot', 'sequence', 'emotional-beat', 'solo-scene', 'persona-pov', 'storyboard', 'blocking-fidelity']
const formats = ['natural-language', 'danbooru-tags']
const frequencies = ['key-moments', 'every-eligible', 'every-n']
const placements = ['after-beat', 'before-beat', 'end-of-message', 'ask']
const aspects = ['adaptive', '1:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9']
const persona = { available: true, personaName: 'Persona Fixture', binding: 'chat-persona' }
const history = [[], [{ role: 'assistant', content: 'Saved fixture one.' }, { role: 'user', content: 'User fixture.' }, { role: 'assistant', content: 'Saved fixture two.' }]]
const field = (directive, name) => directive.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`))?.[1]
let cases = 0
for (const mode of modes)
for (const perspectiveMode of framings)
for (const promptFormat of formats)
for (const frequencyMode of frequencies)
for (const placementPolicy of placements)
for (const relayInsertionMode of ['auto', 'review'])
for (const defaultAspectRatio of aspects)
for (const [enabled, paused] of [[true, false], [true, true], [false, false], [false, true]])
for (const modelPlacedCountMode of ['fixed', 'range'])
for (const messages of history) {
  const raw = { ...defaults, mode, perspectiveMode, promptFormat, frequencyMode, placementPolicy, relayInsertionMode, defaultAspectRatio,
    enabled, paused, modelPlacedCountMode, everyNEligibleMessages: 3, illustrationsPerRun: 2, minimumImages: 1, maximumImages: 3,
    characterOnlySubjects: 'Character Fixture', plannerConnectionId: 'offline-fixture' }
  const settings = backend.normalizeProseIllustratorSettings(raw)
  const expectedMode = mode === 'model-placed' ? 'inline-protocol' : mode
  assert.equal(settings.mode, expectedMode, 'retired Model Placed aliases Model Planned rather than opening a second authoring lane')
  for (const key of ['perspectiveMode', 'promptFormat', 'frequencyMode', 'relayInsertionMode', 'defaultAspectRatio', 'enabled', 'paused', 'modelPlacedCountMode']) assert.equal(settings[key], raw[key], `normalization lost ${key}`)
  assert.equal(settings.placementPolicy, mode === 'relay-planned' && placementPolicy === 'ask' ? 'after-beat' : placementPolicy)
  assert.deepEqual(backend.normalizeProseIllustratorSettings(settings), settings, 'saved settings must be idempotent on reload')
  const before = JSON.stringify(messages)
  const directive = backend.buildIllustratorRuntimeDirective(settings, messages, persona)
  assert.equal(JSON.stringify(messages), before, 'runtime preview must not mutate history')
  assert.equal(backend.buildIllustratorRuntimeDirective(settings, messages, persona), directive, 'repeated preview must not advance cadence')
  const activeMode = enabled && !paused ? expectedMode : 'off'
  const eligible = activeMode === 'inline-protocol' && (frequencyMode !== 'every-n' || (messages.filter(row => row.role === 'assistant').length + 1) % 3 === 0)
  const target = eligible ? modelPlacedCountMode === 'range' ? 3 : 2 : 0
  assert.equal(field(directive, 'mode'), activeMode)
  assert.equal(field(directive, 'request_illustrations'), String(eligible))
  assert.equal(field(directive, 'target_count'), String(target))
  assert.equal(field(directive, 'minimum_count'), String(eligible ? modelPlacedCountMode === 'range' ? 1 : 2 : 0))
  assert.equal(field(directive, 'aspect_policy'), defaultAspectRatio)
  assert.equal(field(directive, 'framing_mode'), perspectiveMode)
  assert.equal(field(directive, 'selected_character_subjects'), perspectiveMode === 'solo-scene' ? 'Character Fixture' : '')
  assert.match(directive, /Exclude every media request required inside an invoked Surface or Narrative Utility/)
  if (perspectiveMode === 'persona-pov') assert.equal(field(backend.buildIllustratorRuntimeDirective(settings, messages, { available: false, binding: 'unavailable' }), 'request_illustrations'), 'false')
  // Framing content is independent of placement/aspect/count. Exercise its real resolver once per mode/format/framing/lifecycle.
  if (placementPolicy === 'after-beat' && relayInsertionMode === 'auto' && defaultAspectRatio === 'adaptive' && frequencyMode === 'every-eligible' && modelPlacedCountMode === 'fixed' && messages.length === 0) {
    const prompt = backend.resolveIllustratorStoryPrompt(settings, messages, persona)
    assert.match(prompt, /<reverie_illustrator_runtime>/)
    const framing = DEFAULT_PROMPT_REGISTRY[`story.framing.${perspectiveMode}`].replace(/\{\{char\}\}/g, 'Character Fixture')
    if (enabled && expectedMode !== 'off') {
      if (expectedMode === 'relay-planned' && perspectiveMode === 'blocking-fidelity') assert(!prompt.includes(framing), 'Relay story prose keeps narrative ownership; experimental layout goes to its Director')
      else assert(prompt.includes(framing), `missing ${perspectiveMode} authoring guidance`)
    }
    if (perspectiveMode === 'persona-pov') assert.match(prompt, /Persona Fixture \(chat-bound Persona\)/)
  }
  cases++
}

// Exact shipped compatibility fields/aliases are not user edits. Genuine edits must survive every save/reload pass.
for (const [legacyId, canonicalId] of Object.entries(ILLUSTRATOR_FRAMING_REGISTRY_ALIASES)) {
  const stock = DEFAULT_PROMPT_REGISTRY[canonicalId]
  const unchanged = backend.normalizeProseIllustratorSettings({ promptRegistry: { [legacyId]: stock.replace(/\n/g, '\r\n') } })
  assert(!Object.hasOwn(unchanged.promptRegistry, canonicalId), `${legacyId}: stock alias must remain default-owned`)
  const customized = `${stock}\n\nUSER FIXTURE: preserve this explicit instruction.`
  let settings = backend.normalizeProseIllustratorSettings({ promptRegistry: { [legacyId]: customized } })
  for (let pass = 0; pass < 4; pass++) {
    assert.equal(settings.promptRegistry[canonicalId], customized)
    settings = backend.normalizeProseIllustratorSettings(settings)
  }
}
for (const [legacyField, canonicalId] of [
  ['sceneLedFramingPrompt', 'story.framing.scene-snapshot'], ['continuityFramePrompt', 'story.framing.sequence'],
  ['expressiveFramePrompt', 'story.framing.emotional-beat'], ['characterOnlyFramingPrompt', 'story.framing.solo-scene'],
]) {
  const customized = `${DEFAULT_PROMPT_REGISTRY[canonicalId]}\n\nUSER FIXTURE: keep this setting.`
  let settings = backend.normalizeProseIllustratorSettings({ [legacyField]: customized })
  for (let pass = 0; pass < 4; pass++) {
    assert.equal(settings.promptRegistry[canonicalId], customized)
    settings = backend.normalizeProseIllustratorSettings(settings)
  }
}

const numericFields = [
  ['contextMessageCount', 0, 12], ['maximumCharacters', 1, 8], ['everyNEligibleMessages', 1, 100],
  ['minimumMessageLength', 0, 2000], ['illustrationsPerRun', 1, 32], ['minimumImages', 1, 32],
  ['maximumImages', 1, 32], ['maximumIllustrationsPerMessage', 1, 32],
]
let boundaries = 0
for (const [name, min, max] of numericFields) {
  const numericDefaults = { ...defaults, illustrationsPerRun: 1, minimumImages: 1, maximumImages: 1, maximumOpportunitiesPerMessage: 1, maximumIllustrationsPerMessage: 1 }
  for (const value of [min - 1, min, max, max + 1, (min + max) / 2, NaN, Infinity, -Infinity]) {
    const settings = backend.normalizeProseIllustratorSettings({ ...numericDefaults, [name]: value })
    const fallback = name === 'maximumIllustrationsPerMessage' ? Math.max(defaults.maximumIllustrationsPerMessage, settings.maximumImages) : numericDefaults[name]
    const expected = Number.isFinite(value) ? Math.min(max, Math.max(min, Math.round(value))) : fallback
    assert.equal(settings[name], name === 'minimumImages' ? Math.min(settings.maximumImages, expected) : expected, `${name}/${value}: unsafe numeric normalization`)
    assert.deepEqual(backend.normalizeProseIllustratorSettings(settings), settings)
    boundaries++
  }
}
for (const mode of ['inline-protocol', 'relay-planned'])
for (const modelPlacedCountMode of ['fixed', 'range'])
for (const illustrationsPerRun of [1, 3, 32])
for (const minimumImages of [1, 3, 32])
for (const maximumImages of [1, 3, 32]) {
  const settings = backend.normalizeProseIllustratorSettings({ ...defaults, mode, modelPlacedCountMode, illustrationsPerRun, minimumImages, maximumImages, frequencyMode: 'every-eligible' })
  assert(settings.minimumImages <= settings.maximumImages)
  if (modelPlacedCountMode === 'fixed') assert(settings.maximumImages >= settings.illustrationsPerRun)
  else assert.equal(settings.maximumImages, maximumImages, 'an inactive fixed count must not inflate the selected range')
  const directive = backend.buildIllustratorRuntimeDirective(settings, [], persona)
  assert(Number(field(directive, 'minimum_count')) <= Number(field(directive, 'target_count')))
  if (mode === 'relay-planned') assert.equal(field(directive, 'target_count'), '0', 'Relay Planned must not also request Model Planned images')
  else assert.equal(Number(field(directive, 'target_count')), modelPlacedCountMode === 'range' ? settings.maximumImages : settings.illustrationsPerRun)
  boundaries++
}
assert.equal(providerCalls, 0)
console.log(`Illustrator settings matrix passed: ${cases} production normalization/runtime combinations and ${boundaries} numeric/count boundaries, zero provider calls. Native/Relay parser and image routing, live model output and image fidelity remain separate gates.`)
