// @ts-nocheck -- offline XML migration and compatibility acceptance gate.
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { xmlSurfaceExamples, xmlSurfaceRegex, xmlAuthoringInstructions } from '../src/xmlSurfaceFormat'
import { shippedSurfaceDefinitions, SHIPPED_SURFACE_SPECS } from '../src/shippedSurfaceDefinitions'
import { r45SupplementalSurfaceDefinitions } from '../src/r45SurfaceCatalog'
import { r45SurfaceAuthorityPack, r45LegacyXmlSurfaceAuthorityPack } from '../src/r45SurfaceAuthority'
import { narrativeUtilityItems, narrativeRegexScripts, renderNarrativeRegex, NARRATIVE_REGEX_VARIANTS } from '../src/narrativeRegexAssets'
import { buildNarrativeUtilityPrompt } from '../src/narrativeDlcRuntime'
import { REVERIE_INLINE_PROTOCOL, REVERIE_ILLUSTRATION_PROTOCOL, REVERIE_SURFACE_PROTOCOL } from '../src/protocols'
import { PLOT_SPARK_VECTOR_BY_KEY, parseImageRequests, inspectStoryModelOutputContracts, sanitizeRelayPromptHistoryText } from '../src/contracts'
import { parseSurfaceXml, repairSurfaceLexicalMarkup } from '../src/surfaceXml'
import { PLOT_SPARKS_XML_REPAIR_EXAMPLE, plotSparksContractDiagnostic, normalizePlotSparksXmlClosingTags } from '../src/plotSparksContract'
import { validateAssistedSurfaceRepair } from '../src/assistedSurfaceRepair'
import { extractCharacterPhoneEntries } from '../src/livingCharacterPhone'

const definitions = [...shippedSurfaceDefinitions(1), ...r45SupplementalSurfaceDefinitions(1)]
assert.equal(definitions.length, 48)
for (const definition of definitions) {
  assert(parseSurfaceXml(definition.sampleXml), `${definition.baseSurfaceId}: canonical XML sample`)
  assert(definition.promptModule.includes(`ROOT: <${definition.canonicalOuterWrapper}>`))
  assert(!/\[(?:image_request|visual_prompt|scene_brief)\]|Author.*bracket-native/.test(definition.promptModule))
}
for (const presentation of ['inline', 'plain', 'sparkling', 'glass']) for (const color of ['realistic', 'primary', 'glass']) {
  assert.deepEqual(r45SurfaceAuthorityPack(presentation, color), r45LegacyXmlSurfaceAuthorityPack(presentation, color), 'Core XML authority must retain original capture/presentation ownership')
}
for (const utility of narrativeUtilityItems()) {
  assert(!/bracket-native|XML.*compatibility input only|opening bracket tags/i.test(utility.loomContent), utility.loomName)
  assert(!/\[(?:character_phone|Plot_Sparks|image_request|reverie_illustration|scene_brief|visual_prompt)\]/.test(utility.loomContent), utility.loomName)
  const textOnly = buildNarrativeUtilityPrompt([utility.loomName], {}, { [utility.loomName]: false }).content
  assert(!/<(?:image_request|reverie-illustration)\b/.test(textOnly), `${utility.loomName}: text-only`)
  assert(textOnly.includes('<reverie_narrative_utility>'))
}
for (const protocol of [REVERIE_INLINE_PROTOCOL, REVERIE_ILLUSTRATION_PROTOCOL, REVERIE_SURFACE_PROTOCOL]) {
  assert(!/\[(?:image_request|reverie_illustration|visual_prompt)\]|Legacy XML.*compatibility|Opening bracket tags/i.test(protocol))
}
const literal = '[urgent] is literal prose; [/word] and [Media] are also literal.'
const board = PLOT_SPARKS_XML_REPAIR_EXAMPLE.replace('Possible branch A.', literal)
assert.equal(plotSparksContractDiagnostic(board), undefined)

const generatedImageBoard = `<Plot_Sparks><ID>closure-recovery</ID><Lifecycle>Unused Plot Sparks dissolve after this response.</Lifecycle>${Object.entries(PLOT_SPARK_VECTOR_BY_KEY).map(([key, vector]) => `<Spark><Key>${key}</Key><Vector>${vector}</Vector><Text>Current scene branch ${key}.</Text><Media><reverie-illustration request="generate" slot="closure-${key}" aspect="16:9" cast="char" alt="Scene ${key}"><visual_prompt>Established character performs a distinct current-scene action, with clear position and expression.</visual_prompt></reverie-illustration></Media></Spark>`).join('')}</Plot_Sparks>`
assert.equal(plotSparksContractDiagnostic(generatedImageBoard), undefined, 'canonical XML image-enabled Plot Sparks board')
const generatedLegacySparks = [...generatedImageBoard.matchAll(/<Spark>[\s\S]*?<\/Spark>/gi)].map(match => match[0])
const generatedLegacyImageBoard = `${generatedImageBoard.slice(0, generatedImageBoard.indexOf('<Spark>'))}${generatedLegacySparks.slice(0, 7).join('')}</Plot_Sparks>`
assert.equal(plotSparksContractDiagnostic(generatedLegacyImageBoard), undefined, 'saved seven-Spark XML compatibility')
assert.equal(normalizePlotSparksXmlClosingTags(generatedLegacyImageBoard.replace('</Text><Media>', '<Media>')), generatedLegacyImageBoard, 'seven-Spark saved XML should receive the same bounded closer recovery')
for (const malformed of [
  generatedImageBoard.replace('</Text><Media>', '<Media>'),
  generatedImageBoard.replace('</visual_prompt>', ''),
  generatedImageBoard.replace('</Media></Spark>', '</Spark>'),
  generatedImageBoard.replace('</Spark><Spark>', '<Spark>'),
]) {
  assert.equal(normalizePlotSparksXmlClosingTags(malformed), generatedImageBoard, 'unambiguous missing XML closer should be restored byte-for-byte')
}
// Oct 12 live export: every one of ten options omitted </Media> between the
// complete illustration and </Spark>. Keep a privacy-safe structural fixture.
const allMissingMediaClosers = generatedImageBoard.replaceAll('</Media>', '')
// Second live export: Media closes correctly but all ten illustration closers
// are absent. Display recovery alone cannot register those image requests.
const allMissingIllustrationClosers = generatedImageBoard.replaceAll('</reverie-illustration>', '')
const bothMissingContainerClosers = allMissingIllustrationClosers.replaceAll('</Media>', '')
for (const malformed of [allMissingIllustrationClosers, bothMissingContainerClosers]) {
  assert.equal(normalizePlotSparksXmlClosingTags(malformed), generatedImageBoard, 'missing illustration/Media closers must recover every complete prompt without changing values')
}
assert.equal(normalizePlotSparksXmlClosingTags(allMissingMediaClosers), generatedImageBoard, 'all ten missing Media closers must recover, not just the first')
assert.equal(normalizePlotSparksXmlClosingTags(generatedImageBoard), generatedImageBoard, 'canonical board must remain byte-exact and idempotent')
for (let missingMask = 0; missingMask < 1024; missingMask += 1) {
  let mediaIndex = 0
  const malformed = generatedImageBoard.replace(/<\/Media>/g, closer => missingMask & (1 << mediaIndex++) ? '' : closer)
  assert.equal(normalizePlotSparksXmlClosingTags(malformed), generatedImageBoard, `missing Media subset ${missingMask} must preserve every branch and image value`)
  let illustrationIndex = 0
  const malformedIllustrations = generatedImageBoard.replace(/<\/reverie-illustration>/g, closer => missingMask & (1 << illustrationIndex++) ? '' : closer)
  assert.equal(normalizePlotSparksXmlClosingTags(malformedIllustrations), generatedImageBoard, `missing illustration subset ${missingMask} must preserve every branch and image value`)
}
const tracker = '<!-- GFX_START --><internal_states><details><summary>Tracker</summary><ul><li>Established scene state.</li></ul></details></internal_states><!-- GFX_END -->'
const responseWithTracker = `Story prose.\n${allMissingMediaClosers}\n${tracker}`
assert.equal(normalizePlotSparksXmlClosingTags(responseWithTracker), `Story prose.\n${generatedImageBoard}\n${tracker}`, 'recovery must leave adjacent story and HTML tracker byte-exact')
assert.equal(normalizePlotSparksXmlClosingTags(generatedImageBoard.replace('</Plot_Sparks>', '')), generatedImageBoard.replace('</Plot_Sparks>', ''), 'unfinished board must not be closed eagerly while streaming')
const incompleteBranch = allMissingMediaClosers.replace('<Text>Current scene branch a.</Text>', '')
assert.equal(normalizePlotSparksXmlClosingTags(incompleteBranch), incompleteBranch, 'missing content is not a closing-tag repair')
const extraImage = allMissingMediaClosers.replace('</reverie-illustration></Spark>', '</reverie-illustration><reverie-illustration request="generate" slot="ambiguous-extra" cast="char"><visual_prompt>Another image.</visual_prompt></reverie-illustration></Spark>')
assert.equal(normalizePlotSparksXmlClosingTags(extraImage), extraImage, 'multiple images in one owner must remain fail-closed')
const crossedCloser = generatedImageBoard.replace('</Vector>', '</Key>')
assert.equal(normalizePlotSparksXmlClosingTags(crossedCloser), crossedCloser, 'crossed/wrong closers must remain fail-closed')
for (const variant of NARRATIVE_REGEX_VARIANTS) for (const color of ['realistic', 'glass']) {
  const rendered = renderNarrativeRegex(board, variant, 'xml-board', {}, color)
  assert.equal((rendered.match(/class="ch-panel ch-panel-/g) || []).length, 10)
  assert(rendered.includes(literal))
  assert(!rendered.includes('Format error'))
  assert(!renderNarrativeRegex(generatedImageBoard.replace('</Text><Media>', '<Media>'), variant).includes('Format error'), 'safe XML closer recovery should keep the Spark board renderable')
  const recoveredResponse = renderNarrativeRegex(responseWithTracker, variant, 'closure-recovery', {}, color)
  assert(!recoveredResponse.includes('Format error'), 'all missing Media closers must render without requiring Assisted Repair')
  assert.equal((recoveredResponse.match(/class="ch-panel ch-panel-/g) || []).length, 10, 'all ten recovered options must render')
  assert(recoveredResponse.startsWith('Story prose.\n') && recoveredResponse.endsWith(tracker), 'render recovery must not absorb the tracker or story prose')
  assert(!renderNarrativeRegex(board.replace('</Text>', ''), variant).includes('Format error'), 'safe XML text closer recovery should preserve an otherwise valid text-only board')
  for (const script of narrativeRegexScripts(variant, color)) assert.doesNotThrow(() => new RegExp(script.find_regex, script.flags))
}
assert(validateAssistedSurfaceRepair('plot-sparks', board.replace('</Text>', ''), board).ok)
assert(!validateAssistedSurfaceRepair('plot-sparks', board.replace('</Text>', ''), board.replace('[urgent]', 'changed')).ok)
const fixtures = [
  ['[SCENE|Workshop|Now|Rain][scene_media][/scene_media][scene_detail]Tools remain on the bench.[/scene_detail][scene_context][reason]Repair work.[/reason][continuity]Same evening.[/continuity][/scene_context][/scene]', 'Tools remain'],
  ['[[npc Mira|main|revised]][npc_media][/npc_media]Established dossier.[[/npc]]', 'rv6'],
  ['[[place Workshop|revised]][place_media][/place_media]Established place.[[/place]]', 'rv6'],
  ['[NPC:MAJOR|Mira][npc_media][/npc_media]\nb: mechanic\na: short hair\np: precise\n[/NPC]', 'Mira'],
]
for (const [legacy, marker] of fixtures) for (const variant of NARRATIVE_REGEX_VARIANTS) {
  const xml = xmlSurfaceExamples(legacy)
  assert(parseSurfaceXml(xml), xml)
  const output = renderNarrativeRegex(xml, variant)
  assert(output.includes(marker) && !output.includes(xml), `${variant}: ${xml}`)
  assert.equal(renderNarrativeRegex(legacy, variant), output, 'saved legacy rendering must match canonical XML')
}
const request = '<reverie-illustration request="generate" slot="xml-proof" aspect="4:3" cast="none"><visual_prompt>1girl, holding_folder, [soft light], A &amp; B.</visual_prompt></reverie-illustration>'
assert.equal(parseImageRequests(request)[0].prompt, '1girl, holding_folder, [soft light], A & B.')
assert.equal(xmlAuthoringInstructions(request), request, 'XML prompt values must remain opaque')
assert.equal(inspectStoryModelOutputContracts(board, { expectPlotSparks: true, plotSparksImagesEnabled: false }).valid, true)
assert(!sanitizeRelayPromptHistoryText(`Story action. ${request}`).includes('visual_prompt'))
const phone = '<character_phone><cp_owner>Mira</cp_owner><cp_apps><cp_app><cp_name>Messages</cp_name><cp_content><cp_msg><cp_side>self</cp_side><cp_name>Mira</cp_name><cp_time>10:00</cp_time><cp_text>On my way.</cp_text></cp_msg></cp_content></cp_app></cp_apps></character_phone>'
assert.equal(extractCharacterPhoneEntries(phone, { chatId: 'proof', messageId: 'phone', swipeId: 0, sourceKind: 'phone' }).length, 1)
assert.equal(xmlAuthoringInstructions('<Text>[Media] is a literal phrase.</Text>'), '<Text>[Media] is a literal phrase.</Text>')
const { normalizeNarrativeMarkupForRendering } = await import('../src/narrativeRegexAssets')
assert.equal(normalizeNarrativeMarkupForRendering(phone.replace('On my way.', '[urgent] On my way.')), phone.replace('On my way.', '[urgent] On my way.'), 'canonical XML phone text must not reclassify literal brackets')
;(globalThis as any).spindle = { registerMessageContentProcessor() {}, registerInterceptor() {}, registerMacro() {}, on() {}, onFrontendMessage() {}, sendToFrontend() {}, permissions: { has: () => true }, log: { info() {}, warn() {}, error() {} } }
const backend = await import('../src/backend')
const canonicalRequests = parseImageRequests(generatedImageBoard)
for (const malformed of [allMissingIllustrationClosers, bothMissingContainerClosers]) {
  const backendNormalized = backend.normalizeRelaySurfaceContracts(malformed)
  assert.equal(backendNormalized, generatedImageBoard, 'actual scan/rescan normalizer must repair before source snapshots are persisted')
  const discovered = backend.parseSafeSurfaceImageRequests(malformed)
  assert.equal(discovered.length, 10, 'actual backend discovery must find ten images, not just render ten panels')
  assert.deepEqual(discovered, canonicalRequests, 'backend recovery must preserve canonical request identity, prompt, cast, owner and offsets')
  assert.equal(backend.normalizeRelaySurfaceContracts(backendNormalized), backendNormalized, 'replay must not add further closers or create new request identities')
  assert.equal(backend.suppressTextOnlyNarrativeRequests(backendNormalized, discovered, { 'Plot Sparks': false }).length, 0, 'Images Off must still suppress recovered illustration requests')
  for (const request of discovered) assert(backend.hasExactStateProjectionOwner(backendNormalized, { requestId: request.id, target: request.target, slots: [request.slot] }), 'recovered image must have an exact canonical placement owner')
}
const unrepairableRequests = allMissingIllustrationClosers.replace('<Vector>detonation</Vector>', '<Vector>wrongness</Vector>')
assert.equal(backend.normalizeRelaySurfaceContracts(unrepairableRequests), unrepairableRequests, 'backend recovery must not reinterpret a structurally invalid board')
assert.equal(backend.parseSafeSurfaceImageRequests(unrepairableRequests).length, 0, 'unvalidated closer recovery cannot enable new image requests')
const recoveredResponseRequests = backend.parseSafeSurfaceImageRequests(normalizePlotSparksXmlClosingTags(responseWithTracker))
const originalResponseRequests = backend.parseSafeSurfaceImageRequests(responseWithTracker)
assert.equal(recoveredResponseRequests.length, 10, 'all recovered Spark images must remain discoverable')
assert.deepEqual(recoveredResponseRequests.map(row => [row.id, row.target, row.cast, row.prompt, row.fullMatch]), originalResponseRequests.map(row => [row.id, row.target, row.cast, row.prompt, row.fullMatch]), 'closing-tag repair must not alter image identity, narrative ownership or dispatch payload')
assert.equal(backend.suppressTextOnlyNarrativeRequests(responseWithTracker, originalResponseRequests, { 'Plot Sparks': false }).length, 0, 'Images Off still suppresses every recovered Spark request')
const ownedRequest = '<image_request id="owned" target="custom.artifact-media" slot="owned"><scene_brief>Bench detail.</scene_brief></image_request>'
const outsideRequest = ownedRequest.replaceAll('owned', 'outside')
for (const [root, name] of [['character_phone', 'Character Phone'], ['WORLD', 'Setting the Scene'], ['npc', 'Character Dossier'], ['NPC', 'Cast Introduction'], ['Plot_Sparks', 'Plot Sparks']]) {
  const content = `<${root}>${ownedRequest}</${root}>\n${outsideRequest}`
  assert.deepEqual(backend.suppressTextOnlyNarrativeRequests(content, parseImageRequests(content), { [name]: false }).map(row => row.id), ['outside'], `${name}: XML Images Off must be limited to its own owner`)
}
assert.equal(parseImageRequests(request.replace('A &amp; B.', 'A &amp;amp; B.'))[0].prompt, '1girl, holding_folder, [soft light], A &amp; B.', 'decode XML entities exactly once')
console.log('XML system smoke passed: 48 Core schemas, 12 XML authority combinations, 16 image/text Utilities, 10 Spark presentation/color cases, repair immutability, old bracket compatibility, XML image dispatch/history and Living Phone extraction.')
