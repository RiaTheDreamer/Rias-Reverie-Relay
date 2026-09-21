import { renderNarrativeRegex } from '../src/narrativeRegexAssets'
import { renderNativeSurfaceMarkup } from '../src/nativeSurfaces'
import { renderRegexSurfaceParity } from '../src/regexSurfaceParity'

function assert(value: unknown, reason: string): asserts value {
  if (!value) throw new Error(reason)
}

const vectors = [
  'detonation',
  'heartknife',
  'wrongness',
  'crash-in',
  'matchstrike',
  'reputation-fire',
  'wildcard-collision',
] as const

const illustration = (key: string) => `<reverie-illustration request="generate" slot="plot-spark-${key}" aspect="16:9" cast="none" alt="Plot Spark ${key.toUpperCase()}"><visual_prompt>${key.toUpperCase()} first playable instant.</visual_prompt></reverie-illustration>`
const plotSparks = `[Plot_Sparks]
[ID]selfie-fallout-live-lineup-sparks[/ID]
[Lifecycle]Unused Plot Sparks dissolve after this response.[/Lifecycle]

${vectors.map((vector, index) => {
  const key = String.fromCharCode(97 + index)
  return `[Spark]
[Key]${key}[/Key]
[Vector]${vector}[/Vector]
[Text]${key.toUpperCase()}[/Text]
[Media]${illustration(key)}[/Media]
[/Spark]`
}).join('\n\n')}

[/Plot_Sparks]`

const smartphone = `[smart_phone]
[sender]Selfie Fallout[/sender]
[initial]S[/initial]
[time]00:11[/time]
[day]Thursday[/day]
[battery]23[/battery]
[messages]
[s_recv][time]00:08[/time]The lineup is live.[/s_recv]
[s_sent][time]00:09[/time]I saw it.[/s_sent]
[/messages]
[/smart_phone]`

const phoneApps = Array.from({ length: 8 }, (_, index) => `[cp_app][cp_slot]${index + 1}[/cp_slot][cp_name]App ${index + 1}[/cp_name][cp_icon]◇[/cp_icon][cp_tone]blue[/cp_tone][cp_badge]0[/cp_badge][cp_content][cp_row][cp_glyph]◇[/cp_glyph][cp_title]Row ${index + 1}[/cp_title][cp_meta]Now[/cp_meta][cp_text]Text ${index + 1}[/cp_text][/cp_row][/cp_content][/cp_app]`).join('')
const characterPhone = `[character_phone][cp_presentation]inline[/cp_presentation][cp_owner]Ria[/cp_owner][cp_subtitle]Private phone[/cp_subtitle][cp_time]00:11[/cp_time][cp_day]Thursday[/cp_day][cp_battery]23[/cp_battery][cp_wallpaper][/cp_wallpaper][cp_apps]${phoneApps}[/cp_apps][/character_phone]`

const parallel = `[PARALLEL|Selfie fallout|active]
- First thread <parallel-media></parallel-media>
- Second thread <parallel-media></parallel-media>
- Third thread <parallel-media></parallel-media>
<parallel-context><trajectory>Three threads keep moving.</trajectory><intersection>The lineup connects them.</intersection></parallel-context>
[/PARALLEL]`

const secret = `[SECRET|Ria|The source of the lineup|No one]
<secret-media>secret-media-owner</secret-media>
<context>The source has not been disclosed.</context>
<pressure>Trust is now under pressure.</pressure>
[/SECRET]`

const world = `[WORLD|DAILY LIFE|Backstage]
<world-media>world-media-owner</world-media>
<world-detail>Lineups are posted before doors open.</world-detail>
<world-context><why-it-matters>Everyone can react early.</why-it-matters><future-use>The timing can expose a leak.</future-use></world-context>
[/WORLD]`

const narrativeRanges = `${characterPhone}\n\n${parallel}\n\n${secret}\n\n${world}\n\n${plotSparks}`
const mixed = `${smartphone}\n\n${narrativeRanges}`
const countPlotMedia = (value: string) => (value.match(/\[Media\]/g) || []).length
const rawPlotTags = /\[\/?(?:Plot_Sparks|Spark|Key|Vector|Text|Media)\]/i

// V7 itself must still consume the strict canonical seven-Spark contract.
const plotOnlyRendered = renderNarrativeRegex(plotSparks, 'inline', 'plot-only')
assert(plotOnlyRendered.includes('class="ch-og') && !rawPlotTags.test(plotOnlyRendered), 'canonical Plot Sparks did not render cleanly through V7')
assert((plotOnlyRendered.match(/class="ch-media"/g) || []).length === 7, 'canonical Plot Sparks did not preserve seven media lanes')

// Architectural invariant: an R4.5 pass may mutate only its owned Surface
// block. Every unrelated Narrative Utility range remains byte-for-byte intact.
assert(countPlotMedia(mixed) === 7, 'mixed regression fixture must begin with seven Plot Sparks Media owners')
const afterR45 = renderRegexSurfaceParity(mixed, 'inline', 'mixed-r45-ownership')
assert(countPlotMedia(afterR45) === 7, 'R4.5 normalization changed the Plot Sparks Media owner count (expected 7 -> 7)')
assert(afterR45.includes(narrativeRanges), 'R4.5 compatibility normalization altered a non-R4.5 Narrative Utility source range')
assert(!afterR45.includes('[smart_phone]') && afterR45.includes('rpx-'), 'R4.5 Smartphone owner did not render independently')

// The legacy wrapper is still accepted, but only while nested in its R4.5
// Smartphone owner.
const legacyMediaPhone = smartphone.replace(
  '[s_sent][time]00:09[/time]I saw it.[/s_sent]',
  '[s_img][side]sent[/side][time]00:09[/time][media]<image_request id="legacy-phone-media" target="smartphone.message-image" slot="legacy-phone-media" aspect="4:3"><scene_brief>Legacy attachment.</scene_brief></image_request>[/media][/s_img]',
)
const legacyMediaRendered = renderRegexSurfaceParity(legacyMediaPhone, 'inline', 'legacy-media-owner')
assert(!/\[\/?media\]/i.test(legacyMediaRendered) && legacyMediaRendered.includes('legacy-phone-media'), 'legacy [media] compatibility stopped working inside its R4.5 owner')

const studio = {
  definitions: {}, activePresetIds: {}, collectionPresets: {}, rendererMode: 'relay',
  defaultShellMode: 'plain', colorMode: 'realistic',
} as any
const plotRecords = vectors.map((_vector, index) => {
  const key = String.fromCharCode(97 + index)
  const requestId = `plot-spark-${key}`
  return {
    key: `mixed-contracts:mixed-contracts:0:${requestId}:${requestId}`, chatId: 'mixed-contracts', messageId: 'mixed-contracts', swipeId: 0,
    requestId, slot: requestId, target: 'custom.artifact-media', targetApp: 'custom', status: 'generating', requestAspect: '16:9',
    originalSceneBrief: `${key} scene`, originalNegativePrompt: '', originalRequestXml: illustration(key), alt: requestId,
    count: 1, createdAt: 1, updatedAt: 2, history: [],
  }
})
const nativeMixed = renderNativeSurfaceMarkup(mixed, studio, {
  chatId: 'mixed-contracts', messageId: 'mixed-contracts', swipeId: 0, autoGenerate: true,
  generationPlaceholderEffect: 'glitter', records: plotRecords as any,
})
assert(countPlotMedia(nativeMixed.content) === 7, 'production native pass stripped Plot Sparks Media wrappers')
const fullyRendered = renderNarrativeRegex(nativeMixed.content, 'inline', 'mixed-contracts', { chatId: 'mixed-contracts', swipeId: 0 })
assert(!rawPlotTags.test(fullyRendered), 'mixed production path exposed raw Plot Sparks syntax')
assert(fullyRendered.includes('rpx-') && fullyRendered.includes('rrcp-wrap') && fullyRendered.includes('r65') && fullyRendered.includes('ch-og'), 'mixed production path did not render every Surface/Narrative owner')
for (const key of vectors.map((_vector, index) => String.fromCharCode(97 + index))) {
  const panel = new RegExp(`<section class="ch-panel ch-panel-${key}">([\\s\\S]*?)<\\/section>`).exec(fullyRendered)?.[1] || ''
  assert(panel.includes(`data-rrn-native-request="plot-spark-${key}"`), `Plot Spark ${key} lost its exact lifecycle request owner`)
}
assert((fullyRendered.match(/data-rrn-native-request="plot-spark-[a-g]"/g) || []).length === 7, 'mixed production path did not preserve all seven Spark lifecycle requests')
assert((fullyRendered.match(/rrl-generation-placeholder/g) || []).length === 7, 'Plot Sparks did not reserve all seven media footprints before provider completion')
assert((fullyRendered.match(/--reverie-media-aspect:16 \/ 9/g) || []).length === 7, 'Plot Sparks placeholders lost their measurable 16:9 footprints')

// Closed-but-invalid siblings fail independently. One malformed owner cannot
// redirect the other subsystem's valid owner through its fallback path.
const malformedPhone = '[smart_phone][sender]Broken[/sender][/smart_phone]'
const badPhoneNative = renderNativeSurfaceMarkup(`${malformedPhone}\n\n${plotSparks}`, studio, { chatId: 'bad-phone', messageId: 'bad-phone', swipeId: 0 })
const badPhoneFinal = renderNarrativeRegex(badPhoneNative.content, 'inline', 'bad-phone')
assert(badPhoneFinal.includes('ch-og') && !badPhoneFinal.includes('[Plot_Sparks]'), 'malformed Smartphone poisoned a valid Plot Sparks sibling')

const malformedPlot = plotSparks.replace(`[Media]${illustration('g')}[/Media]`, '')
const badPlotAfterR45 = renderRegexSurfaceParity(`${smartphone}\n\n${malformedPlot}`, 'inline', 'bad-plot')
assert(badPlotAfterR45.includes('rpx-') && !badPlotAfterR45.includes('[smart_phone]'), 'malformed Plot Sparks poisoned a valid Smartphone sibling')

console.log('R4.5 ownership smoke passed: Plot Sparks Media 7 -> 7, mixed owners rendered, seven lifecycle requests survived, and legacy [media] stayed R4.5-local.')
