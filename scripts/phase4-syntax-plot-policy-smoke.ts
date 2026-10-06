// @ts-nocheck -- Bun smoke harness uses runtime crypto without Node typings.
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { parseBracketDocument } from '../src/bracketParser'
import { normalizeKnownHybridClosingDelimiters, normalizeBracketSurfaceDocument } from '../src/bracketSurfaceBridge'
import { HISTORICAL_RELAY_MEDIA_PLACEHOLDER, PLOT_SPARK_VECTOR_BY_KEY, inspectStoryModelOutputContracts, sanitizeRelayPromptHistoryText } from '../src/contracts'
import { buildNarrativeUtilityPrompt } from '../src/narrativeDlcRuntime'
import { NARRATIVE_UTILITY_PACK, containsNarrativeRegexMarkup, narrativeRegexScripts, narrativeUtilityItems, normalizeNarrativeMarkupForRendering, renderNarrativeRegex } from '../src/narrativeRegexAssets'
import { xmlAuthoringInstructions as bracketImageControlInstructions } from '../src/xmlSurfaceFormat'
import { plotSparksUtilityPrompt } from '../src/plotSparksUtility'
import { PLOT_SPARKS_LEGACY_SCRIPT_ID } from '../src/plotSparksPresentation'
import { renderNativeSurfaceMarkup } from '../src/nativeSurfaces'
import { SHIPPED_SURFACE_SPECS, shippedSurfaceDefinitions } from '../src/shippedSurfaceDefinitions'
import { r45SupplementalSurfaceDefinitions } from '../src/r45SurfaceCatalog'
import { completeSurfaceSpecs } from '../src/surfaceXml'

const assert = (value: unknown, message: string): asserts value => { if (!value) throw new Error(message) }
const hash = (value: string) => createHash('sha256').update(value).digest('hex')

const allSpecs = completeSurfaceSpecs(SHIPPED_SURFACE_SPECS)
const phone = allSpecs.find(row => row.id === 'smartphone')!
const request = '<image_request id="keep-me" target="smartphone.message-image" slot="keep-me" aspect="4:3"><scene_brief>Exact payload.</scene_brief></image_request>'
const hybrid = `[smart_phone][sender]Carrier[/sender>[initial]C[/initial][time]09:12[/time][day]Monday[/day][battery]80[/battery][messages][s_recv][time]09:12[/time]Hello[/s_recv][s_img][side]recv[/side][time]09:12[/time]${request}[/s_img][/messages][info]Roaming[/info>[/smart_phone]`
const normalized = normalizeBracketSurfaceDocument(hybrid, allSpecs)
assert(!normalized.diagnostics.length && normalized.markup.includes('Carrier') && normalized.markup.includes('Roaming'), 'two known hybrid scalar closers must repair without killing Smartphone')
assert(normalized.markup.includes(request), 'Surface delimiter repair must preserve embedded image_request byte-for-byte')

const other = allSpecs.find(row => row.id !== 'smartphone' && /<([A-Za-z][\w-]*)\b/.test(String(row.sampleXml || '').replace(/^<[^>]+>/, '')))!
const child = /<([A-Za-z][\w-]*)\b/.exec(String(other.sampleXml || '').replace(/^<[^>]+>/, ''))?.[1] || ''
const generic = normalizeKnownHybridClosingDelimiters(`[${other.wrapper}][${child}]x[/${child}>[/${other.wrapper}]`, other)
assert(generic.warnings.length === 1 && generic.markup.includes(`[/${child.toLocaleLowerCase()}]`), 'generic repair must work beyond Smartphone for a known Surface field')
assert(normalizeKnownHybridClosingDelimiters('[smart_phone]ordinary [/invented> prose[/smart_phone]', phone).markup.includes('[/invented>'), 'unknown bracket-like prose must not be globally rewritten')
assert(normalizeKnownHybridClosingDelimiters('[smart_phone][sender]A[/sender][/smart_phone]', phone).warnings.length === 0, 'canonical bracket Surface must remain untouched')

const ancestor = parseBracketDocument('[smart_phone][sender]A[/smart_phone]')
assert(ancestor.diagnostics.some(row => row.includes('[sender] was still open')), 'ancestor close must diagnose implicitly open children')
const failed = renderNativeSurfaceMarkup('[smart_phone][sender]A[/smart_phone]', { definitions: {}, activePresetIds: {}, collectionPresets: {}, rendererMode: 'relay', defaultShellMode: 'inline', colorMode: 'realistic', utilityInjectionEnabled: true, utilityInjectionPosition: 'system-prefix', utilityTemplate: '', validationErrors: {}, lastInjectedModuleIds: [], lastInjectionAt: 0, lastInjectionSource: 'none', lastInjectionPosition: 'none', lastInjectionSummary: '', updatedAt: 0 }, { chatId: 'phase4', messageId: 'ambiguous' })
assert(failed.content.includes('Format error') && failed.content.includes('Inspect / Fix') && failed.content.includes('data-rrn-editable-surface'), 'ambiguous Surface must fail into one clickable preserved-source inspector')

const scrubbed = sanitizeRelayPromptHistoryText(`Before ${HISTORICAL_RELAY_MEDIA_PLACEHOLDER} <reverie-illustration request="generate" slot="old"><visual_prompt>Old.</visual_prompt></reverie-illustration> After`)
assert(scrubbed.includes('Before') && scrubbed.includes('After') && !scrubbed.includes(HISTORICAL_RELAY_MEDIA_PLACEHOLDER) && !scrubbed.includes('reverie-illustration'), 'historical Relay media must be removed silently while surrounding prose survives')

const reviewedPlotSparksUtility = NARRATIVE_UTILITY_PACK.loomItems.find(item => item.loomName === 'Plot Sparks')?.loomContent || ''
assert(reviewedPlotSparksUtility === plotSparksUtilityPrompt(true), 'shipped ten-option Plot Sparks Utility must match the shared authoring contract exactly')
assert(narrativeUtilityItems().find(item => item.loomName === 'Plot Sparks')?.loomContent === bracketImageControlInstructions(reviewedPlotSparksUtility), 'model-facing Plot Sparks grammar must be derived from the unchanged reviewed authority')
const plotScript = narrativeRegexScripts('sparkle-button').find(script => script.script_id === PLOT_SPARKS_LEGACY_SCRIPT_ID)!
assert(hash(`${plotScript.find_regex}\n`) === '75a7ca775e3543ae3c442dd697c5d9973f6844b4c41a9e869764c9b0f263824e', 'Plot Sparks XML Find must match the capture-preserving migration')
const packedReplacement = JSON.parse(await readFile(new URL('../regex-packs/Narrative/Reverie-Plot-Sparks.json', import.meta.url), 'utf8')).scripts[0].replace_string
assert(hash(packedReplacement) === '3a3705a7055006994059897717514f5800786903ed17036fb588117ffec4a039', 'Plot Sparks Replace must match supplied asset unchanged')

const illustration = (key: string) => `<reverie-illustration request="generate" slot="plot-spark-${key}-test" aspect="16:9" cast="none" alt="Spark ${key}"><visual_prompt>Grounded opening instant ${key}.</visual_prompt></reverie-illustration>`
const spark = (key: keyof typeof PLOT_SPARK_VECTOR_BY_KEY, media = illustration(key)) => `[Spark][Key]${key}[/Key][Vector]${PLOT_SPARK_VECTOR_BY_KEY[key]}[/Vector][Text]Branch ${key}.[/Text][Media]${media}[/Media][/Spark]`
const canonical = `[Plot_Sparks][ID]phase4-seven[/ID][Lifecycle]Unused Plot Sparks dissolve after this response.[/Lifecycle]${(Object.keys(PLOT_SPARK_VECTOR_BY_KEY) as Array<keyof typeof PLOT_SPARK_VECTOR_BY_KEY>).map(key => spark(key)).join('')}[/Plot_Sparks]`
assert(containsNarrativeRegexMarkup(canonical), 'Narrative detection must recognize canonical Plot_Sparks')
const inspection = inspectStoryModelOutputContracts(canonical, { expectPlotSparks: true })
assert(inspection.valid && inspection.plotSparks.sparkCount === 10, 'canonical Plot Sparks A-J must validate')
const rendered = renderNarrativeRegex(canonical, 'sparkle-button', 'phase4-plot')
assert(rendered.includes('ch-og') && !rendered.includes('[Plot_Sparks]') && rendered.includes('plot-spark-g-test'), 'new bracket Plot Sparks must render all seven media captures')
const missing = canonical.replace(/\[Media\][\s\S]*?\[\/Media\]/, '')
const missingRendered = renderNarrativeRegex(missing, 'sparkle-button', 'phase4-missing')
assert(missingRendered.includes('ch-og') && !missingRendered.includes('[Plot_Sparks]') && (missingRendered.match(/class="ch-media"/g) || []).length === 10, 'a wholly omitted Spark Media owner must not block rendering of the complete ten-Spark surface')
const malformedMissing = canonical.replace(/\[Media\][\s\S]*?\[\/Media\]/, '[Media]')
const malformedMediaRendered = renderNarrativeRegex(malformedMissing, 'sparkle-button', 'phase4-malformed-media', { chatId: 'phase4', swipeId: 0 })
assert(malformedMediaRendered.includes('Plot Sparks · Format error') && malformedMediaRendered.includes('data-rrn-editable-surface="plot-sparks"')
  && !malformedMediaRendered.includes('[Plot_Sparks]') && !malformedMediaRendered.includes('<reverie-illustration'), 'an incomplete Media owner must fail closed into a preserved-source inspector, not raw markup or image dispatch')

const blended = canonical.replace(illustration('a'), '<reverie-illustration request="generate" slot="plot-spark-a-test" aspect="16:9" cast="none"><scene_brief>Keep this exact prompt.</scene_brief></image_request>')
const repairedBlend = normalizeNarrativeMarkupForRendering(blended)
assert(repairedBlend.includes('<visual_prompt>Keep this exact prompt.</visual_prompt></reverie-illustration>'), 'unambiguous Plot Sparks media-owner blend must repair mechanically')

const utility = buildNarrativeUtilityPrompt(['Plot Sparks']).content
assert(utility.includes('<Plot_Sparks>') && utility.includes('plot-spark-g-'), 'effective Plot Sparks injection must use XML grammar and new slot prefixes')
for (const lockToken of ['PLOT SPARKS STRUCTURAL LOCK', 'exactly ten <Spark> blocks', 'keys a through j', 'one non-empty <Text>', 'one non-empty <Media>', '</Spark>', '</Plot_Sparks>']) assert(utility.includes(lockToken), `current Plot Sparks completion lock missing ${lockToken}`)
assert(buildNarrativeUtilityPrompt(['Plot Sparks'], { 'Plot Sparks': canonical }).content.includes('phase4-seven'), 'complete current bracket-native Plot Sparks overrides must remain authoritative')
const incompleteCurrentOverride = '[Plot_Sparks][Spark][Key]a[/Key][Vector]detonation[/Vector][Text]Incomplete.[/Text][Media]CURRENT OVERRIDE[/Media][/Spark][/Plot_Sparks]'
const guardedOverrideUtility = buildNarrativeUtilityPrompt(['Plot Sparks'], { 'Plot Sparks': incompleteCurrentOverride }).content
assert(!guardedOverrideUtility.includes('CURRENT OVERRIDE') && guardedOverrideUtility.includes('plot-spark-g-'), 'incomplete current-shape Plot Sparks overrides must fail closed to the canonical Utility')
const definitions = [...shippedSurfaceDefinitions(), ...r45SupplementalSurfaceDefinitions()]
assert(definitions.every(row => row.promptModule.includes('FORMAT: compact-v1') && row.promptModule.includes(`ROOT: <${row.canonicalOuterWrapper}>`) && row.promptModule.includes('SCHEMA\n')), 'every active R4.5 Surface must retain compact XML structural grammar')
assert(definitions.find(row => row.baseSurfaceId === 'smartphone')?.promptModule.includes('same co-present characters'), 'Smartphone co-presence anti-trigger missing')
assert(definitions.find(row => row.baseSurfaceId === 'relationship-map')?.promptModule.includes('focal + meaningful connection A + meaningful connection B'), 'Relationship Map lower threshold missing')
assert(buildNarrativeUtilityPrompt(['Cast Introduction']).content.includes('at least two of:'), 'Cast Introduction deterministic first-appearance threshold missing')
assert(buildNarrativeUtilityPrompt(['Archive Entry']).content.includes('pass BOTH gates'), 'Archive durable-canon and future-reference gates missing')

const backendSource = await readFile(new URL('../src/backend.ts', import.meta.url), 'utf8')
assert(backendSource.includes('canonicalEditedSurfaceRoot') && backendSource.includes('same canonical outer wrapper'), 'bracket-native editor root safety must use canonical root handling')
console.log('Phase 4 smoke passed: conservative Surface recovery, clickable failure inspector, silent history sanitation, bracket-native standalone Plot Sparks, and durable trigger guidance.')
