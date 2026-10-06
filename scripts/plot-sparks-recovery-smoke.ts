import { renderNarrativeRegex, NARRATIVE_REGEX_VARIANTS } from '../src/narrativeRegexAssets'
import { renderNativeSurfaceMarkup } from '../src/nativeSurfaces'
import { validateAssistedSurfaceRepair } from '../src/assistedSurfaceRepair'
import { PLOT_SPARKS_REPAIR_EXAMPLE as valid, plotSparksContractDiagnostic } from '../src/plotSparksContract'

function assert(value: unknown, reason: string): asserts value { if (!value) throw new Error(reason) }
const decode = (value: string) => value.replace(/&#91;/g, '[').replace(/&#93;/g, ']').replace(/&quot;/g, '"').replace(/&#39;|&#x27;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
const missingCloser = valid.replace('branch D.[/Text]', 'branch D.')
const wrongCloser = valid.replace('branch D.[/Text]', 'branch D.[/Vector]')
const wrongVector = valid.replace('[Vector]crash-in', '[Vector]wrongness')
const missingSpark = valid.replace(/\[Spark\]\[Key\]g[\s\S]*?\[\/Spark\]/, '')
const duplicate = valid.replace('[Key]g[/Key]', '[Key]a[/Key]')
const extraText = valid.replace('branch D.[/Text]', 'branch D.[/Text][Text]Duplicate[/Text]')
const fixtures = [
  [missingCloser, /text.*still open/i], [wrongCloser, /Unmatched closing|still open/i],
  [wrongVector, /Vector "crash-in"/], [missingSpark, /ten Sparks.*found 9/i],
  [duplicate, /Key G/], [extraText, /duplicated|out of order/],
] as const
assert(!plotSparksContractDiagnostic(valid), 'canonical text-only board must be valid')
let cases = 0
for (const [source, diagnostic] of fixtures) for (const variant of NARRATIVE_REGEX_VARIANTS) for (const color of ['realistic', 'glass'] as const) {
  const rendered = renderNarrativeRegex(source, variant, 'spark-error-message', { chatId: 'spark-test-chat', swipeId: 3 }, color)
  assert(rendered.includes('Plot Sparks · Format error') && diagnostic.test(decode(rendered)), `${variant}/${color}: missing specific recovery explanation`)
  for (const action of ['edit-surface', 'repair-surface', 'reparse', 'rescan']) assert(rendered.includes(`data-rrn-action="${action}"`), `missing ${action}`)
  assert(rendered.includes('data-rrn-chat-id="spark-test-chat"') && rendered.includes('data-rrn-message-id="spark-error-message"') && rendered.includes('data-rrn-swipe-id="3"'), 'recovery actions lost exact owner')
  assert(rendered.includes('data-rrn-root-tag="Plot_Sparks"') && rendered.includes('data-rrn-surface-id="plot-sparks"'), 'recovery actions lost registered board identity')
  const original = /data-rrn-surface-original="([^"]*)"/.exec(rendered)?.[1] || ''
  const editor = /data-rrn-surface-source="([^"]*)"/.exec(rendered)?.[1] || ''
  assert(decode(original) === source && decode(editor) === source, 'editor must preserve exact pre-normalization source')
  assert(!rendered.includes('[Plot_Sparks]') && !rendered.includes('<!--reverie-plot-recovery:'), 'raw owner or temporary token leaked')
  assert(renderNarrativeRegex(rendered, variant, 'spark-error-message', { chatId: 'spark-test-chat', swipeId: 3 }, color) === rendered, 'recovery rerender duplicated or changed the card')
  const sibling = renderNarrativeRegex(`Before\n${source}\n${valid}\nAfter`, variant, 'spark-siblings', { chatId: 'spark-test-chat' }, color)
  assert((sibling.match(/data-reverie-surface-contract="failed"/g) || []).length === 1 && sibling.includes('class="ch-og'), 'failed board poisoned valid sibling or duplicated card')
  assert(sibling.startsWith('Before\n') && sibling.endsWith('\nAfter'), 'sibling prose changed')
  cases += 1
}
const media = '<reverie-illustration request="generate" slot="preserved"><visual_prompt>Untouched scene.</visual_prompt></reverie-illustration>'
const mediaSource = missingCloser.replace('[Media][/Media]', `[Media]${media}[/Media]`)
const renderedMedia = renderNarrativeRegex(mediaSource, 'inline', 'media-error', { chatId: 'spark-test-chat', swipeId: 3 })
assert(!renderedMedia.includes('<reverie-illustration'), 'failed owner exposed live image control outside its recovery source')
assert(decode(/data-rrn-surface-original="([^"]*)"/.exec(renderedMedia)?.[1] || '') === mediaSource, 'failed owner lost authored media')
const studio = { definitions: {}, activePresetIds: {}, collectionPresets: {}, defaultShellMode: 'inline', colorMode: 'realistic' } as any
const native = renderNativeSurfaceMarkup(renderedMedia, studio, { chatId: 'spark-test-chat', messageId: 'media-error', swipeId: 3 })
assert((native.content.match(/data-reverie-surface-contract="failed"/g) || []).length === 1 && !native.content.includes('data-rrn-native-request'), 'native image pass consumed preserved repair source')
assert(validateAssistedSurfaceRepair('plot-sparks', missingCloser, valid).ok, 'structure-only closing repair rejected')
assert(validateAssistedSurfaceRepair('plot-sparks', wrongCloser, valid).ok, 'wrong-closing repair rejected')
assert(!validateAssistedSurfaceRepair('plot-sparks', missingSpark, valid).ok, 'assisted repair invented a branch')
assert(!validateAssistedSurfaceRepair('plot-sparks', wrongVector, valid).ok, 'assisted repair rewrote a vector')
assert(!validateAssistedSurfaceRepair('plot-sparks', missingCloser, valid.replace('Possible branch A.', 'Changed story.')).ok, 'assisted repair rewrote story text')
assert(!validateAssistedSurfaceRepair('plot-sparks', mediaSource, valid.replace('[Media][/Media]', `[Media]${media.replace('Untouched scene.', 'Changed scene.')}[/Media]`)).ok, 'assisted repair rewrote image prompt')
assert(!validateAssistedSurfaceRepair('plot-sparks', missingCloser, `${valid}${valid}`).ok, 'assisted repair added another owner')
console.log(`Plot Sparks recovery smoke passed: ${cases} malformed board/shell/color cases, exact source/media preservation, valid sibling isolation, idempotent rendering, and bounded closing-only repair.`)
