// @ts-nocheck -- Offline Bun harness; Node types are not a runtime dependency.
import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { renderNativeSurfaceMarkup } from '../src/nativeSurfaces'
import { NARRATIVE_BLOCK_SPACING_STYLE, NARRATIVE_MEDIA_COMPATIBILITY_STYLE, renderNarrativeRegex, narrativeRegexPack, narrativeRegexScripts } from '../src/narrativeRegexAssets'
import { DEFAULT_PROMPT_REGISTRY } from '../src/protocols'
import { SHIPPED_SURFACE_PRESENTATION_CSS } from '../src/surfacePresentation'

const storage = new Map<string, unknown>()
const requests: any[] = []
let resolvedPrompt = ''
let parserResponseOverride: string | null = null
mkdirSync('artifacts', { recursive: true })
;(globalThis as any).spindle = {
  on() {}, onFrontendMessage() {}, registerInterceptor() {}, registerMacro() {}, registerMessageContentProcessor() {}, sendToFrontend() {},
  permissions: { has: () => true }, log: { info() {}, warn() {}, error() {} },
  userStorage: { async getJson(path: string, { fallback }: any) { return structuredClone(storage.get(path) ?? fallback) }, async setJson(path: string, value: any) { storage.set(path, structuredClone(value)) }, async mkdir() {} },
  chats: { async get() { return { character_id: 'alpha' } } }, characters: { async get() { return { id: 'alpha', name: 'Alpha', description: 'black hair' } } },
  personas: { async getActive() { return null } }, chat: { async getMessages() { return [] } },
  connections: { async get() { return { id: 'mock', model: 'mock', provider: 'offline' } } },
  generate: { async raw(request: any) { requests.push(request); return { content: parserResponseOverride ?? JSON.stringify({ sceneBrief: resolvedPrompt, positivePrompt: resolvedPrompt, prompt: resolvedPrompt, negativePrompt: '', namedSubjects: ['Alpha'], expectedPeopleCount: 1, peoplePolicy: 'required' }) } } },
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
  const framingPrompt = selected.promptRegistry[`story.framing.${mode}`] ?? DEFAULT_PROMPT_REGISTRY[`story.framing.${mode}`]
  assert(story.includes(framingPrompt.replace(/\{\{char\}\}/g, 'Alpha')), `${mode}: final Story Model injection lost selected framing`)
  resolvedPrompt = 'side-on medium shot, Alpha seated at the window, torso turned toward a letter, hand braced on sill, lowered eyes, tight jaw'
  const composition = await backend.composePromptForOpportunity('offline', opportunities, scene, selected, 'offline')
  const payload = JSON.stringify(requests.at(-1).messages)
  assert(payload.includes('framingPrompt') && payload.includes(framingPrompt.split('\n')[0]), `${mode}: composer did not receive current mode`)
  assert.equal(composition.positivePrompt, resolvedPrompt + (mode === 'solo-scene' ? ', character-only composition, only Alpha visible, no unrelated people' : ''), `${mode}: writer instructions leaked into composed prompt`)
  const job: any = { chatId: 'offline', messageId: 'm', swipeId: 0, requestId: mode, target: 'prose.illustration', slots: ['image'], count: 1, originalSceneBrief: scene, originalNegativePrompt: '', originalRequestXml: '', cast: 'char', composedPositivePrompt: composition.positivePrompt }
  const prepared = await backend.parseSlotPrompt(job, 'image', [], 0, { ...config, proseIllustratorSettings: selected }, 'offline', { boundCharacterPreset: { presetId: 'identity', prompt: 'adult male, black hair, grey eyes' }, includeCharacters: true })
  assert(prepared.prompt.indexOf('side-on medium shot') < prepared.prompt.indexOf('black hair'), `${mode}: identity displaced the composed camera`)
  assert(!prepared.prompt.includes('FRAMING') && !prepared.prompt.includes('Do not') && !prepared.prompt.includes('Instagram-model'), `${mode}: instruction text reached provider prompt`)
}

// Reproduce the live C5A failure: a scene request must lead, while a native
// Character preset contributes identity only once and cannot smuggle its old
// pose, gaze, environment, lighting, style, or quality boilerplate ahead of it.
const descentScene = '2people, volcanic cave interior, male siren prince using iron pry-bar to lift circular carved stone hatch from floor, glowing green-blue water visible in deep shaft below, steam rising, female human with long blonde hair watching intently while holding folded fleece wrap, high contrast lighting, tense atmosphere, cinematic medium shot'
const contaminatedCharacterPreset = '1boy, handsome Korean man, dark slightly wavy hair, warm dark brown eyes, sharp jawline, broad shoulders, athletic swimmer build, pearl-white merman tail, champagne-gold iridescence, deep crimson fin tips, gold bioluminescent markings, royal jewelry, looking toward viewer, charismatic expression, subtle confident smirk, graceful dynamic pose, swimming underwater, underwater palace background, warm rim light, dramatic light rays, manhwa style, masterpiece, best quality'
const descentJob: any = {
  chatId: 'offline', messageId: 'm', swipeId: 0, requestId: 'descent-corridor-03', target: 'prose.illustration',
  slots: ['image'], count: 1, cast: 'char', promptSource: 'visual_prompt',
  originalSceneBrief: descentScene, originalNegativePrompt: '', originalRequestXml: '', composedPositivePrompt: descentScene,
}
const descentPrepared = await backend.parseSlotPrompt(descentJob, 'image', [], 0, { ...config, proseIllustratorSettings: settings }, 'offline', {
  boundCharacterPreset: { presetId: 'taejun-native', prompt: contaminatedCharacterPreset },
  includeCharacters: true,
})
const descentPrompt = descentPrepared.prompt
const identityIndex = descentPrompt.indexOf('male subject Alpha')
assert(identityIndex > 0, 'identity-only Character subject block was not inserted')
assert(descentPrompt.indexOf('using iron pry-bar') < identityIndex, 'C5A displaced the authoritative scene action')
assert(descentPrompt.indexOf('cinematic medium shot') < identityIndex, 'C5A displaced the authored camera framing')
assert(descentPrompt.indexOf('cinematic narrative still') < identityIndex, 'selected Cinematic Scene profile did not precede identity')
for (const contamination of ['pearl-white merman tail', 'champagne-gold iridescence', 'deep crimson fin tips', 'gold bioluminescent markings', 'royal jewelry', 'looking toward viewer', 'charismatic expression', 'subtle confident smirk', 'graceful dynamic pose', 'swimming underwater', 'underwater palace background', 'warm rim light', 'dramatic light rays', 'manhwa style', 'masterpiece', 'best quality']) {
  assert(!descentPrompt.toLocaleLowerCase().includes(contamination), `native Character scene contamination survived: ${contamination}`)
}
for (const identityFact of ['handsome Korean man', 'dark slightly wavy hair', 'warm dark brown eyes', 'sharp jawline', 'broad shoulders', 'athletic swimmer build']) {
  assert(descentPrompt.includes(identityFact), `persistent Character identity was lost: ${identityFact}`)
}
assert.equal((descentPrompt.match(/male subject Alpha/g) || []).length, 1, 'Character identity was injected twice')
assert.equal(descentPrepared.promptPipeline.promptProfile?.automaticClassification, 'narrative-scene')
assert.equal(descentPrepared.promptPipeline.promptProfile?.selectedProfileId, 'cinematic-scene')
assert((descentPrepared.promptPipeline.finalPromptCharsBeforeIdentityFix || 0) > (descentPrepared.promptPipeline.finalPromptChars || 0), 'identity prompt bloat metrics did not record the legacy duplicate')
assert((descentPrepared.promptPipeline.duplicateIdentityFragmentsRemoved || 0) > 0, 'duplicate identity removal metric was not populated')
const vowScene = 'extreme close-up underwater, Taejun in current mer-form with a long merman tail and a blonde mermaid touching foreheads during a parting vow, eyes fixed on each other'
const vowPrepared = await backend.parseSlotPrompt({ ...descentJob, requestId: 'parting-vow-06', originalSceneBrief: vowScene, composedPositivePrompt: vowScene }, 'image', [], 0, { ...config, proseIllustratorSettings: settings }, 'offline', {
  boundCharacterPreset: { presetId: 'taejun-native', prompt: contaminatedCharacterPreset }, includeCharacters: true,
})
assert(vowPrepared.prompt.includes('extreme close-up underwater'), 'authored extreme close-up was lost')
assert(vowPrepared.prompt.includes('long merman tail'), 'authored current mer-form was lost')
assert(!vowPrepared.prompt.includes('medium or wide story framing by default'), 'generic profile framing overrode authored extreme close-up')

// Live 0.2.8.6 regression: all parser rejection shapes must converge on the
// same scene-led C5A fallback and the provider-bound seam must not re-prepend a
// full native preset through custom prefixes or generation recipes.
const concealmentScene = 'Arin crouches inside a narrow volcanic concealment niche, one hand braced against black stone, watching the corridor through a crack, tense medium shot'
const fallbackJob: any = {
  ...descentJob,
  requestId: 'concealment-niche-05',
  originalSceneBrief: concealmentScene,
  composedPositivePrompt: undefined,
  prosePromptComposition: { namedSubjects: ['Arin'] },
  cast: 'char+user',
}
const fallbackConfig = { ...config, parserConnectionId: 'mock', parserRetries: 0, nativePromptMode: 'parsed_custom', proseIllustratorSettings: settings }
const fallbackNative = {
  boundCharacterPreset: { presetId: 'taejun-native', prompt: contaminatedCharacterPreset },
  boundPersonaPreset: { presetId: 'ria-native', prompt: '1girl, adult woman, long blonde hair, blue eyes, slim build, looking at viewer, smiling, palace background, portrait, masterpiece' },
  includeCharacters: true,
  includePersona: true,
}
const fallbackCases = [
  { name: 'empty', response: '', reason: /empty response/i },
  { name: 'unusable-json', response: '{}', reason: /usable image prompt/i },
  { name: 'protected-semantics', response: JSON.stringify({ prompt: 'empty volcanic corridor, wide shot', negativeAdditions: '' }), reason: /protected Model-Placed semantics/i },
]
const fallbackPrepared: any[] = []
for (const fixture of fallbackCases) {
  parserResponseOverride = fixture.response
  const prepared = await backend.parseSlotPrompt({ ...fallbackJob, requestId: `concealment-${fixture.name}` }, 'image', [], 0, fallbackConfig, 'offline', fallbackNative)
  fallbackPrepared.push(prepared)
  assert.match(prepared.promptMode, /^router_parser_fallback:parsed_custom$/, `${fixture.name}: wrong fallback mode`)
  assert(fixture.reason.test(prepared.promptPipeline.parserFallbackReason || ''), `${fixture.name}: fallback reason was not preserved`)
  assert(prepared.prompt.startsWith(concealmentScene), `${fixture.name}: fallback stopped being scene-led`)
  const profileIndex = prepared.prompt.indexOf('cinematic narrative still')
  const characterIndex = Math.max(prepared.prompt.indexOf('male subject Alpha'), prepared.prompt.indexOf('Active Character (Alpha)'))
  const personaIndex = Math.max(prepared.prompt.indexOf('subject active persona'), prepared.prompt.indexOf('Active Persona'))
  assert(profileIndex > concealmentScene.length && characterIndex > profileIndex, `${fixture.name}: Cinematic Scene / Character ordering regressed`)
  assert(personaIndex > characterIndex, `${fixture.name}: Persona binding did not follow Character identity`)
  assert.equal((prepared.prompt.match(/(?:male subject Alpha|Active Character \(Alpha\))/g) || []).length, 1, `${fixture.name}: Character identity was injected twice`)
  assert.equal((prepared.prompt.match(/(?:subject active persona|Active Persona)/g) || []).length, 1, `${fixture.name}: Persona identity was injected twice`)
  for (const contamination of ['looking toward viewer', 'charismatic expression', 'swimming underwater', 'underwater palace background', 'warm rim light', 'dramatic light rays', 'manhwa style']) {
    assert(!prepared.prompt.toLocaleLowerCase().includes(contamination), `${fixture.name}: raw Character contamination survived fallback shaping: ${contamination}`)
  }
  assert(prepared.prompt.length < 1800, `${fixture.name}: fallback prompt remained implausibly long (${prepared.prompt.length})`)
}
parserResponseOverride = null

const authoritativePrepared = await backend.parseSlotPrompt(
  { ...fallbackJob, requestId: 'concealment-authoritative' },
  'image',
  [],
  0,
  { ...config, parserConnectionId: '', nativePromptMode: 'parsed_custom', proseIllustratorSettings: settings },
  'offline',
  fallbackNative,
)
assert.equal(authoritativePrepared.promptMode, 'story_model_visual_prompt', 'Parser-unavailable visual_prompt did not use authoritative recovery')
assert(authoritativePrepared.prompt.startsWith(concealmentScene), 'authoritative recovery stopped being scene-led')
const authoritativeProfileIndex = authoritativePrepared.prompt.indexOf('cinematic narrative still')
const authoritativeCharacterIndex = Math.max(authoritativePrepared.prompt.indexOf('male subject Alpha'), authoritativePrepared.prompt.indexOf('Active Character (Alpha)'))
const authoritativePersonaIndex = Math.max(authoritativePrepared.prompt.indexOf('subject active persona'), authoritativePrepared.prompt.indexOf('Active Persona'))
assert(authoritativeProfileIndex > concealmentScene.length && authoritativeCharacterIndex > authoritativeProfileIndex && authoritativePersonaIndex > authoritativeCharacterIndex, 'authoritative recovery lost scene -> profile -> Character -> Persona ordering')
assert.equal((authoritativePrepared.prompt.match(/(?:male subject Alpha|Active Character \(Alpha\))/g) || []).length, 1, 'authoritative recovery duplicated Character identity')
assert.equal((authoritativePrepared.prompt.match(/(?:subject active persona|Active Persona)/g) || []).length, 1, 'authoritative recovery duplicated Persona identity')
for (const contamination of ['looking toward viewer', 'charismatic expression', 'swimming underwater', 'underwater palace background', 'warm rim light', 'dramatic light rays', 'manhwa style']) {
  assert(!authoritativePrepared.prompt.toLocaleLowerCase().includes(contamination), `authoritative recovery retained raw preset contamination: ${contamination}`)
}

const representativeFallback = fallbackPrepared[0]
const guardedProvider = backend.assemblePreparedProviderPrompts({
  recipePositivePrompt: `Active Character (Seo Taejun): ${contaminatedCharacterPreset}`,
  recipeNegativePrompt: '',
  effectiveBaseTags: 'score_9, source_anime',
  userPositivePromptPrefix: `Active Character (Seo Taejun): ${contaminatedCharacterPreset}`,
  userNegativePromptPrefix: '',
}, representativeFallback)
const legacyFallbackProviderPrompt = [`Active Character (Seo Taejun): ${contaminatedCharacterPreset}`, `Active Character (Seo Taejun): ${contaminatedCharacterPreset}`, representativeFallback.prompt, 'score_9, source_anime'].join(', ')
assert(guardedProvider.prompt.startsWith(concealmentScene), 'provider assembly re-prepended an Active Character dump')
assert(guardedProvider.removedFallbackFragments.length > 10, 'provider-bound fallback guard did not report removed preset fragments')
assert(!/Active Character \(Seo Taejun\)/i.test(guardedProvider.prompt), 'raw native Character wrapper survived provider-bound fallback guard')
assert(guardedProvider.prompt.endsWith('score_9, source_anime'), 'LoRA/base tags no longer follow scene/identity/continuity')
const providerPromptReduction = legacyFallbackProviderPrompt.length - guardedProvider.prompt.length
assert(providerPromptReduction >= contaminatedCharacterPreset.length, `fallback provider guard removed only ${providerPromptReduction} chars; expected at least the ${contaminatedCharacterPreset.length}-char raw preset payload`)
assert(guardedProvider.prompt.length < 1800, `fallback provider prompt remained implausibly long (${guardedProvider.prompt.length})`)
writeFileSync('artifacts/live-fallback-regression-fixture.json', JSON.stringify({
  promptMode: representativeFallback.promptMode,
  before: legacyFallbackProviderPrompt,
  after: guardedProvider.prompt,
  beforeChars: legacyFallbackProviderPrompt.length,
  afterChars: guardedProvider.prompt.length,
  removedProviderFragments: guardedProvider.removedFallbackFragments,
}, null, 2))
// Authored direct gaze and understated emotion must remain possible.
const gaze = 'eye-level photograph, Alpha looking at viewer, deliberately blank expression'
assert(backend.enforceVisualSubjectIdentity(gaze, [{ name: 'Alpha', kind: 'character', prompt: 'black hair' }], true).startsWith(gaze))
const raw = `[SCENE|Station concourse|Evening|Rain easing]
[scene_media]<image_request id="compass" target="custom.artifact-media" slot="compass" aspect="16:9"><scene_brief>Empty station concourse in rain.</scene_brief></image_request>[/scene_media]
[scene_detail]Rain beads on the platform windows.[/scene_detail]
[scene_context][reason]The journey reaches the station.[/reason][continuity]The same travel bag remains by the bench.[/continuity][/scene_context][/SCENE]`
const fixtures: Record<string, string> = {}
for (const variant of ['inline', 'plain-button', 'sparkle-button', 'glass'] as const) {
  const colorMode = variant === 'glass' ? 'glass' : 'realistic'
  const originals = narrativeRegexPack(variant).scripts
  for (const script of narrativeRegexScripts(variant, colorMode)) {
    const original = originals.find(row => row.script_id === script.script_id)
    if (original && script.script_id !== 'reverie_scene_tracker_images_v1') {
      const suppliedReplacement = script.replace_string.startsWith(NARRATIVE_MEDIA_COMPATIBILITY_STYLE)
        ? script.replace_string.slice(NARRATIVE_MEDIA_COMPATIBILITY_STYLE.length)
        : script.replace_string
      const compatibilityBase = suppliedReplacement.startsWith(NARRATIVE_BLOCK_SPACING_STYLE)
        ? suppliedReplacement.slice(NARRATIVE_BLOCK_SPACING_STYLE.length)
        : suppliedReplacement
      const adaptedPresentationBase = compatibilityBase
        .replace(SHIPPED_SURFACE_PRESENTATION_CSS, '')
        .replace(/ rr-surface-presentation-(?:inline|button|sparkling)/, '')
      const presentationBase = variant === 'inline'
        ? adaptedPresentationBase.replace(/(<details class="(?:r65|ra66|ch-og|bf-drawer)\b[^"]*"(?:(?:\$<[^>]+>|[^>])*?)) open>/, '$1>')
        : adaptedPresentationBase
      const structuralAddition = '<div class="r65-section r65-parallel-context"><p class="r65-section-title">Context</p><div class="r65-opt" data-label="Trajectory">$<trajectory></div><div class="r65-opt r65-gap" data-label="Intersection">$<intersection></div></div>'
      const suppliedBase = script.script_id === 'reverie_parallel_tracker_images_v1'
        ? presentationBase.replace(structuralAddition, '')
        : presentationBase
      assert.equal(suppliedBase, original.replace_string, `${script.script_id}: supplied Narrative styling changed`)
    }
  }
  fixtures[variant] = renderNarrativeRegex(renderNativeSurfaceMarkup(raw, { definitions: {}, activePresetIds: {}, rendererMode: 'relay' } as any, { chatId: 'browser', messageId: 'm', swipeId: 0, autoGenerate: false }).content, variant, 'm', {}, colorMode)
  assert(fixtures[variant].includes('rr-scene-compass') && fixtures[variant].includes('data-rrn-native-request="compass"'))
  assert(!fixtures[variant].includes('[SCENE|'), 'Compass with lifecycle card failed to render')
}
writeFileSync('artifacts/scene-compass-browser-fixtures.json', JSON.stringify(fixtures))
console.log(`Scene framing runtime regression passed: primary C5A ${descentPrepared.promptPipeline.finalPromptCharsBeforeIdentityFix} -> ${descentPrepared.promptPipeline.finalPromptChars} chars; parser empty/unusable/protected-semantics fallbacks converge on scene-led identity; provider fallback ${legacyFallbackProviderPrompt.length} -> ${guardedProvider.prompt.length} chars.`)
