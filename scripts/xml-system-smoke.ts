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
import { parseImageRequests, inspectStoryModelOutputContracts, sanitizeRelayPromptHistoryText } from '../src/contracts'
import { parseSurfaceXml, repairSurfaceLexicalMarkup } from '../src/surfaceXml'
import { PLOT_SPARKS_XML_REPAIR_EXAMPLE, plotSparksContractDiagnostic } from '../src/plotSparksContract'
import { validateAssistedSurfaceRepair } from '../src/assistedSurfaceRepair'
import { extractCharacterPhoneEntries } from '../src/livingCharacterPhone'

const definitions = [...shippedSurfaceDefinitions(1), ...r45SupplementalSurfaceDefinitions(1)]
assert.equal(definitions.length, 47)
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
for (const variant of NARRATIVE_REGEX_VARIANTS) for (const color of ['realistic', 'glass']) {
  const rendered = renderNarrativeRegex(board, variant, 'xml-board', {}, color)
  assert.equal((rendered.match(/class="ch-panel ch-panel-/g) || []).length, 10)
  assert(rendered.includes(literal))
  assert(!rendered.includes('Format error'))
  assert(renderNarrativeRegex(board.replace('</Text>', ''), variant).includes('Plot Sparks · Format error'))
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
const ownedRequest = '<image_request id="owned" target="custom.artifact-media" slot="owned"><scene_brief>Bench detail.</scene_brief></image_request>'
const outsideRequest = ownedRequest.replaceAll('owned', 'outside')
for (const [root, name] of [['character_phone', 'Character Phone'], ['WORLD', 'Setting the Scene'], ['npc', 'Character Dossier'], ['NPC', 'Cast Introduction'], ['Plot_Sparks', 'Plot Sparks']]) {
  const content = `<${root}>${ownedRequest}</${root}>\n${outsideRequest}`
  assert.deepEqual(backend.suppressTextOnlyNarrativeRequests(content, parseImageRequests(content), { [name]: false }).map(row => row.id), ['outside'], `${name}: XML Images Off must be limited to its own owner`)
}
assert.equal(parseImageRequests(request.replace('A &amp; B.', 'A &amp;amp; B.'))[0].prompt, '1girl, holding_folder, [soft light], A &amp; B.', 'decode XML entities exactly once')
console.log('XML system smoke passed: 46 Core schemas, 12 XML authority combinations, 16 image/text Utilities, 10 Spark presentation/color cases, repair immutability, old bracket compatibility, XML image dispatch/history and Living Phone extraction.')
