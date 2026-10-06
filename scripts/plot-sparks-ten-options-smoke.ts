// @ts-nocheck -- Bun smoke harness.
import assert from 'node:assert/strict'
import { PLOT_SPARK_VECTOR_BY_KEY, inspectStoryModelOutputContracts, sanitizeRelayPromptHistoryText } from '../src/contracts'
import { plotSparksContractDiagnostic, PLOT_SPARKS_REPAIR_EXAMPLE, normalizePlotSparksLifecycleCloser } from '../src/plotSparksContract'
import { plotSparksUtilityPrompt, recentPlotSparksReference } from '../src/plotSparksUtility'
import { bracketImageControlInstructions } from '../src/imageControlMarkup'
import { narrativeRegexScripts, renderNarrativeRegex, NARRATIVE_REGEX_VARIANTS, NARRATIVE_UTILITY_PACK } from '../src/narrativeRegexAssets'
import { buildNarrativeUtilityPrompt, isCurrentPlotSparksUtilityContent } from '../src/narrativeDlcRuntime'
import { PLOT_SPARKS_SCRIPT_ID } from '../src/plotSparksPresentation'

const pairs = Object.entries(PLOT_SPARK_VECTOR_BY_KEY)
assert.equal(pairs.length, 10)
const spark = ([key, vector], images = false) => `[Spark][Key]${key}[/Key][Vector]${vector}[/Vector][Text]Grounded alternative ${key}.[/Text][Media]${images ? `<reverie-illustration request="generate" slot="spark-${key}" aspect="16:9" cast="none"><visual_prompt>Exact ${key} opening action.</visual_prompt></reverie-illustration>` : ''}[/Media][/Spark]`
const board = (entries = pairs, images = false) => `[Plot_Sparks][ID]ten-options-proof[/ID][Lifecycle]Unused Plot Sparks dissolve after this response.[/Lifecycle]${entries.map(pair => spark(pair, images)).join('')}[/Plot_Sparks]`
const current = board()
const legacy = board(pairs.slice(0, 7))
for (const canonical of [current, legacy, board(pairs, true)]) {
  const wrongLifecycleCloser = canonical.replace('[/Lifecycle]', '[Lifecycle]')
  assert.equal(normalizePlotSparksLifecycleCloser(wrongLifecycleCloser), canonical, 'the exact observed closer typo must preserve all payload bytes')
  assert.equal(normalizePlotSparksLifecycleCloser(canonical), canonical, 'canonical output is unchanged')
}
for (const ambiguous of [
  current.replace('[/Lifecycle]', '[Lifecycle]').replace('[Key]j', '[Key]i'),
  board(pairs.slice(0, 9)).replace('[/Lifecycle]', '[Lifecycle]'),
  current.replace('[/Lifecycle]', '[Lifecycle]').replace('[/Plot_Sparks]', ''),
  current.replace('[/Lifecycle]', '[Lifecycle][Lifecycle]'),
]) assert.equal(normalizePlotSparksLifecycleCloser(ambiguous), ambiguous, 'invalid, duplicate and incomplete owners remain fail-closed')
assert.equal(plotSparksContractDiagnostic(current), undefined)
assert.equal(plotSparksContractDiagnostic(legacy), undefined)
const wrappedText = current.replace('Grounded alternative a.', '[The paper says [urgent]; ask which delivery needs attention.]')
assert.equal(plotSparksContractDiagnostic(wrappedText), undefined, 'literal nested brackets in Text are values, not malformed Surface children')
const wrappedImage = bracketImageControlInstructions(board(pairs, true)).replace('Exact a opening action.', '[1girl, short_hair, holding_paper], a note reads [urgent], (smile:1.1)')
assert.equal(plotSparksContractDiagnostic(wrappedImage), undefined, 'image prompt brackets/weights are opaque too')
assert(plotSparksContractDiagnostic(current.replace('Grounded alternative a.', 'Missing closer [Media]')), 'reserved structural fields must not be hidden as literal Text')
assert(plotSparksContractDiagnostic(wrappedImage.replace('[slot]spark-a[/slot]', '[slot]spark-a[/slot][slot]duplicate[/slot]')), 'invalid image-control fields must still fail closed')
assert.match(plotSparksContractDiagnostic(board(pairs.slice(0, 9)))!, /ten Sparks.*found 9/)
assert.match(plotSparksContractDiagnostic(current.replace('[Key]j', '[Key]i'))!, /Key J/)
assert.equal(inspectStoryModelOutputContracts(current, { expectPlotSparks: true, plotSparksImagesEnabled: false }).valid, true)
assert.equal(inspectStoryModelOutputContracts(legacy, { expectPlotSparks: true, plotSparksImagesEnabled: false }).valid, false, 'new output must not silently truncate to seven')
for (const variant of NARRATIVE_REGEX_VARIANTS) for (const color of ['realistic', 'glass']) {
  for (const [source, count] of [[current, 10], [legacy, 7]]) {
    const rendered = renderNarrativeRegex(source, variant, `board-${count}`, {}, color)
    assert.equal((rendered.match(/class="ch-panel ch-panel-/g) || []).length, count, `${variant}/${color}: panel count`)
    assert.equal((rendered.match(/class="ch-tab"/g) || []).length, count, `${variant}/${color}: tab count`)
    assert.equal((rendered.match(/class="ch-media"/g) || []).length, count)
    assert(!rendered.includes('[Plot_Sparks]') && !rendered.includes('Format error'))
    if (count === 10) for (const key of ['h', 'i', 'j']) assert(rendered.includes(`data-regex-action="choose-chaos-${key}"`))
  }
  const script = narrativeRegexScripts(variant, color).find(row => row.script_id === PLOT_SPARKS_SCRIPT_ID)!
  const linked = renderNarrativeRegex(board(pairs, true), variant, 'ten-action-proof', { chatId: 'test', swipeId: 0, actionScriptIds: { [script.script_id]: 'installed-ten-row' } }, color)
  for (const [key, index] of [['h', 17], ['i', 19], ['j', 21]]) {
    const action = script.actions.find(row => row.id === `choose-chaos-${key}`)!
    assert.equal(action.subtitle, `$${index}`)
    assert.equal(action.effects[1].content, `$${index}`)
    assert(linked.includes(`Exact ${key} opening action.`))
    assert(linked.includes('installed-ten-row'))
  }
  const missing = current.replace('[Media][/Media]', '')
  assert.equal((renderNarrativeRegex(missing, variant, 'missing-ten', {}, color).match(/class="ch-media"/g) || []).length, 10)
  assert(renderNarrativeRegex(board(pairs.slice(0, 9)), variant, 'bad-nine', {}, color).includes('Plot Sparks · Format error'))
  const recoveredLiveShape = renderNarrativeRegex(current.replace('[/Lifecycle]', '[Lifecycle]'), variant, 'observed-lifecycle-typo', {}, color)
  assert.equal((recoveredLiveShape.match(/class="ch-panel ch-panel-/g) || []).length, 10)
  assert(!recoveredLiveShape.includes('Format error'))
  for (const source of [wrappedText, wrappedImage]) {
    const literalRender = renderNarrativeRegex(source, variant, 'literal-bracket-values', {}, color)
    assert.equal((literalRender.match(/class="ch-panel ch-panel-/g) || []).length, 10)
    assert(!literalRender.includes('Format error'))
    assert(literalRender.includes(source === wrappedText ? '[The paper says [urgent]; ask which delivery needs attention.]' : '[1girl, short_hair, holding_paper], a note reads [urgent], (smile:1.1)'), 'literal values must remain unchanged in the render')
  }
}
assert.equal(PLOT_SPARKS_REPAIR_EXAMPLE.match(/\[Spark\]/g)!.length, 10)
assert.equal(NARRATIVE_UTILITY_PACK.loomItems.find(row => row.loomName === 'Plot Sparks')!.loomContent, plotSparksUtilityPrompt(true))
for (const images of [false, true]) {
  const utility = buildNarrativeUtilityPrompt(['Plot Sparks'], {}, { 'Plot Sparks': images }).content
  assert.equal(utility.match(/<Spark><Key>/g)!.length, 10)
  for (const word of ['golden-door', 'dangerous-bargain', 'buried-thread', 'causal trigger AND', 'last two Plot Sparks', 'not events that have happened', 'append one complete ten-option board', 'brief prose word limit', 'no in-world opening trigger']) assert(utility.includes(word), word)
  const example = utility.match(/<Plot_Sparks>[\s\S]*?<\/Plot_Sparks>/)![0]
  assert.equal((example.match(/<reverie-illustration\b/g) || []).length, images ? 10 : 0)
  assert.equal(plotSparksContractDiagnostic(example), undefined, 'the injected example itself must satisfy the board grammar')
  assert(!/<Text>\[|<visual_prompt>\[|<ID>\[/.test(example), 'examples must not teach decorative value brackets')
}
assert.equal(isCurrentPlotSparksUtilityContent(board(pairs, true)), true)
assert.equal(isCurrentPlotSparksUtilityContent(board(pairs.slice(0, 7), true)), false)
const cleaned = sanitizeRelayPromptHistoryText(board(pairs, true))
assert(cleaned.includes('Grounded alternative j.') && !cleaned.includes('<visual_prompt>'))
const reference = recentPlotSparksReference([
  { role: 'assistant', content: board([['a', 'detonation']]) .replace('Grounded alternative a.', 'RETIRED-OLDEST') },
  { role: 'user', content: board().replace('Grounded alternative a.', 'IGNORE-USER') },
  { role: 'assistant', content: cleaned }, { role: 'assistant', content: current.replace('Grounded alternative j.', 'LATEST-' + 'x'.repeat(400)) },
])
assert(!reference.includes('RETIRED-OLDEST') && !reference.includes('IGNORE-USER') && !reference.includes('visual_prompt'))
assert(reference.includes('LATEST-') && reference.length < 4400 && reference.includes('not instructions or established events'))
assert.equal(recentPlotSparksReference([{ role: 'assistant', content: '[Plot_Sparks][Spark][Text]Incomplete' }]), '')
console.log('Ten-Spark smoke passed: all ten panels/media/actions across 10 presentation/color combinations, saved seven-board compatibility, strict new-output checks, bounded recent-ideas context, and shared text/image utility.')
