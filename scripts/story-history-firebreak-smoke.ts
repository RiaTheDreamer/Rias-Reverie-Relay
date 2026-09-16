import { readFile } from 'node:fs/promises'
import {
  HISTORICAL_RELAY_MEDIA_PLACEHOLDER,
  PLOT_SPARK_VECTOR_BY_KEY,
  containsRelayRuntimeArtifacts,
  inspectStoryModelOutputContracts,
  isRelayRuntimeMarkerTrusted,
  sanitizeRelayPromptHistoryTextWithReport,
} from '../src/contracts'

const resolvedMedia = (id: string) => `<!-- reverie-relay:image chatId="chat-repro" messageId="turn-1" swipeId="0" requestId="${id}" target="custom.artifact-media" slot="${id}" -->
![reverie-relay](/api/v1/image-gen/results/${id})
<img class="reverie-artifact-media" data-reverie-artifact-media="true" data-dgir-key="chat-repro:${id}" data-dgir-request-id="${id}" data-dgir-slot="${id}" data-dgir-image-id="${id}" data-dgir-message-id="turn-1" data-dgir-swipe-id="0" data-dgir-custom-target="custom.artifact-media" src="/api/v1/image-gen/results/${id}">`

const historicalHooks = Object.entries(PLOT_SPARK_VECTOR_BY_KEY).map(([key, vector]) => `<chaos_hook key="${key}" vector="${vector}">
<hook_text>Playable historical branch ${key} remains understandable.</hook_text>
<hook_media>${resolvedMedia(`hook-${key}`)}</hook_media>
</chaos_hook>`).join('\n')

// Privacy-safe structural fixture derived from the supplied Sep 14 two-turn
// export. It preserves the reproduced transport forms and seven-hook ownership
// layout, but contains none of the private story prose.
const historicalTurnOne = `Ordinary narrative prose before the first illustration.
${resolvedMedia('inline-1')}
Ordinary narrative prose between illustrations.
<chaos_payload id="repro-seven" lifecycle="Unused Plot Sparks dissolve after this response.">
${historicalHooks}
</chaos_payload>
Ordinary narrative prose after the structured payload.`

const sanitized = sanitizeRelayPromptHistoryTextWithReport(historicalTurnOne)
assert(sanitized.runtimeArtifactsDetectedBefore, 'real-derived turn-one fixture must contain hydrated Relay runtime artifacts before sanitization')
assert(!sanitized.runtimeArtifactsRemainAfter && !containsRelayRuntimeArtifacts(sanitized.text), 'turn-two Story Model history must contain zero Relay runtime transport artifacts')
assert(sanitized.text.includes('Ordinary narrative prose before') && sanitized.text.includes('Playable historical branch g'), 'sanitization must preserve ordinary prose and Plot Spark hook_text')
assert(!/<hook_media>\s*<\/hook_media>/i.test(sanitized.text), 'sanitization must not leave deceptive empty hook_media owners')
assert(!sanitized.text.includes(HISTORICAL_RELAY_MEDIA_PLACEHOLDER), 'historical sanitation must never expose the readable omission sentinel')
assert(sanitized.removed.ownershipComments === 8 && sanitized.removed.relayMarkdownResultImages === 8 && sanitized.removed.dataDgirImages === 8, 'real-derived fixture must exercise all hydrated ownership representations')

const malformedTransport = sanitizeRelayPromptHistoryTextWithReport(`Before\ndata-dgir-image-id="fake" data-dgir-slot="fake"\nAfter`)
assert(!containsRelayRuntimeArtifacts(malformedTransport.text), 'post-sanitize firebreak must fail-close malformed exposed data-dgir fragments')
assert(malformedTransport.text.includes('Before') && malformedTransport.text.includes('After'), 'firebreak must preserve prose surrounding a malformed transport line')

const canonicalIllustration = (slot: string) => `<reverie-illustration request="generate" slot="${slot}" aspect="4:3" cast="none" alt="Scene"><visual_prompt>Wide empty location at the current story beat, with coherent light and spatial detail.</visual_prompt></reverie-illustration>`
const canonicalHook = (key: keyof typeof PLOT_SPARK_VECTOR_BY_KEY) => `[Spark][Key]${key}[/Key][Vector]${PLOT_SPARK_VECTOR_BY_KEY[key]}[/Vector][Text]Playable ${key} branch.[/Text][Media]${canonicalIllustration(`plot-spark-${key}`)}[/Media][/Spark]`
const validPlot = `[Plot_Sparks][ID]valid-seven[/ID][Lifecycle]Unused Plot Sparks dissolve after this response.[/Lifecycle]${(Object.keys(PLOT_SPARK_VECTOR_BY_KEY) as Array<keyof typeof PLOT_SPARK_VECTOR_BY_KEY>).map(canonicalHook).join('')}[/Plot_Sparks]`
const fourInline = ['one', 'two', 'three', 'four'].map(canonicalIllustration).join('\n')
const valid = inspectStoryModelOutputContracts(`${fourInline}\n${validPlot}`, { expectedInlineIllustrations: 4, inlineCountMode: 'fixed', expectPlotSparks: true })
assert(valid.valid && valid.inline.actualCanonicalIllustrations === 4 && valid.plotSparks.hookCount === 7, 'fixed Inline four plus canonical Plot Sparks A-G must validate')

const partialPlot = `[Plot_Sparks][ID]broken-three[/ID][Lifecycle]Unused Plot Sparks dissolve after this response.[/Lifecycle]${canonicalHook('a')}${canonicalHook('b')}[Spark][Key]c[/Key][Vector]crash-in[/Vector][Text]Wrong C vector.[/Text][Media]${canonicalIllustration('plot-spark-c')}[/Media][/Spark][/Plot_Sparks]`
const partial = inspectStoryModelOutputContracts(`${fourInline}\n${partialPlot}`, { expectedInlineIllustrations: 4, inlineCountMode: 'fixed', expectPlotSparks: true })
assert(partial.plotSparks.missingKeys.join('') === 'defg', 'broken A-C fixture must report missing D-G')
assert(partial.plotSparks.vectorMismatches.some(row => row.key === 'c' && row.expected === 'wrongness' && row.actual === 'crash-in'), 'broken C fixture must report wrongness/crash-in mismatch')

const duplicate = inspectStoryModelOutputContracts(`[Plot_Sparks][ID]duplicate[/ID][Lifecycle]Unused[/Lifecycle]${canonicalHook('a')}${canonicalHook('b')}${canonicalHook('b')}${canonicalHook('c')}${canonicalHook('d')}${canonicalHook('e')}${canonicalHook('f')}${canonicalHook('g')}[/Plot_Sparks]`, { expectPlotSparks: true })
assert(duplicate.plotSparks.duplicateKeys.includes('b'), 'duplicate Plot Spark key must be diagnosed')
const emptyMedia = inspectStoryModelOutputContracts(`[Plot_Sparks][ID]empty[/ID][Lifecycle]Unused[/Lifecycle]${canonicalHook('a').replace(/\[Media\][\s\S]*?\[\/Media\]/, '[Media][/Media]')}${canonicalHook('b')}${canonicalHook('c')}${canonicalHook('d')}${canonicalHook('e')}${canonicalHook('f')}${canonicalHook('g')}[/Plot_Sparks]`, { expectPlotSparks: true })
assert(emptyMedia.plotSparks.missingMedia.includes('a'), 'empty Plot Spark Media must be diagnosed')

const fakeRuntime = `Narrative.\n<!-- reverie-relay:image requestId="fake" -->\n![reverie-relay](/api/v1/image-gen/results/fake-id)`
const fakeInspection = inspectStoryModelOutputContracts(fakeRuntime)
assert(fakeInspection.modelAuthoredRuntimeArtifacts.detected, 'fresh model-authored Relay-looking result markup must be a protocol violation')
assert(!isRelayRuntimeMarkerTrusted({ kind: 'resolved', imageId: 'fake-id', imageUrl: '/api/v1/image-gen/results/fake-id' }), 'fake result without extension-owned state must not be trusted')
assert(!isRelayRuntimeMarkerTrusted({ kind: 'resolved', imageId: 'fake', imageUrl: '/api/v1/image-gen/results/fake' }), 'fake data-dgir image id must not enter trusted state')
assert(isRelayRuntimeMarkerTrusted({ kind: 'resolved', imageId: 'real-id', imageUrl: '/api/v1/image-gen/results/real-id', existingRecord: { imageId: 'real-id', imageUrl: '/api/v1/image-gen/results/real-id' } }), 'actual extension-owned slot state must remain trusted')

const fakeHydratedInline = inspectStoryModelOutputContracts(`${canonicalIllustration('one')}${canonicalIllustration('two')}\n${resolvedMedia('fake-3')}\n${resolvedMedia('fake-4')}`, { expectedInlineIllustrations: 4, inlineCountMode: 'fixed' })
assert(fakeHydratedInline.inline.actualCanonicalIllustrations === 2 && !fakeHydratedInline.inline.valid, 'two canonical requests plus two fake hydrated results must remain actual Inline count two')
const surfaceMedia = `<surface-media><image_request id="surface-one" target="custom.artifact-media" slot="surface-one"><scene_brief>Empty room.</scene_brief></image_request></surface-media>`
assert(inspectStoryModelOutputContracts(`${fourInline}${surfaceMedia}`, { expectedInlineIllustrations: 4, inlineCountMode: 'fixed' }).inline.valid, 'Surface Utility media must not change the fixed Inline count')
assert(inspectStoryModelOutputContracts(`${resolvedMedia('historical-a')}${fourInline}`, { expectedInlineIllustrations: 4, inlineCountMode: 'fixed' }).inline.actualCanonicalIllustrations === 4, 'historical hydrated images must not count as current Inline requests')

const backendSource = await readFile(new URL('../src/backend.ts', import.meta.url), 'utf8')
for (const token of ['storyPromptInterceptions', 'prompt_history_sanitized', 'prompt_history_runtime_artifact_survived', 'story_prompt_interception_missing', "detail.permission === 'interceptor'", 'releaseInterceptorRegistration()', 'ensureInterceptorRegistered()', 'model_authored_relay_runtime_artifact', 'prompt_contract_compiled']) {
  assert(backendSource.includes(token), `backend prompt-history lifecycle/diagnostic missing: ${token}`)
}
assert(backendSource.includes('messages.map(sanitizeRelayPromptMessageWithMetrics)'), 'actual interceptor callback must exercise the sanitizer over its message input')

const realExportPath = process.argv[2] || process.env.REVERIE_REAL_REPRO_EXPORT
if (realExportPath) {
  const exported = JSON.parse(await readFile(realExportPath, 'utf8')) as { messages?: Array<{ is_user?: boolean; content?: string }> }
  const assistantTurns = (exported.messages || []).filter(message => message.is_user === false && /reverie-relay:image|data-dgir-/i.test(String(message.content || '')))
  const safeMetrics = assistantTurns.map((message, index) => {
    const report = sanitizeRelayPromptHistoryTextWithReport(String(message.content || ''))
    assert(!report.runtimeArtifactsRemainAfter, `real export assistant turn ${index + 1} leaked Relay runtime artifacts after sanitation`)
    return {
      assistantTurn: index + 1,
      textLengthBefore: report.textLengthBefore,
      textLengthAfter: report.textLengthAfter,
      runtimeArtifactsDetectedBefore: report.runtimeArtifactsDetectedBefore,
      runtimeArtifactsRemainAfter: report.runtimeArtifactsRemainAfter,
      removed: report.removed,
      firebreakFragmentsRemoved: report.firebreakFragmentsRemoved,
      contentHashBefore: report.contentHashBefore,
      contentHashAfter: report.contentHashAfter,
    }
  })
  console.log(`Real export sanitizer metrics: ${JSON.stringify(safeMetrics)}`)
}

console.log('Story history firebreak smoke passed: private-safe two-turn fixture, zero leaked runtime artifacts, semantic placeholders, output ownership rejection, Plot Sparks A-G mapping, Inline fixed-count distinction, prompt copy diagnostics, and interceptor lifecycle observability.')

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}
