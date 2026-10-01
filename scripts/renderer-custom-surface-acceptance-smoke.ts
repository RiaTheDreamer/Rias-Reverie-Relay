import type { CustomSurfaceDefinition, CustomSurfaceStudioState } from '../src/contracts'
import { renderNativeSurfaceMarkup } from '../src/nativeSurfaces'
import { r45RendererScripts, r45ScriptOverrideKey, type R45PresentationMode, type R45ScriptSource } from '../src/r45SurfaceAuthority'
import { r45SupplementalSurfaceDefinitions } from '../src/r45SurfaceCatalog'
import { shippedSurfaceDefinitions } from '../src/shippedSurfaceDefinitions'
import { renderRegexSurfaceParity } from '../src/regexSurfaceParity'
import { bracketExampleFromXml } from '../src/bracketSurfaceAuthoring'
import { validateDeclarativeSurfaceCss } from '../src/surfaceCssSafety'
import { createValidatedRendererOverride, validateRendererRegex } from '../src/surfaceRendererValidation'
import { activeSurfaceDefinitions } from '../src/surfacePromptSelection'

function assert(value: unknown, reason: string): asserts value { if (!value) throw new Error(reason) }

const presentations: R45PresentationMode[] = ['inline', 'plain', 'sparkling', 'glass']
const colors = ['realistic', 'primary', 'glass'] as const
const sources: R45ScriptSource[] = ['bracket', 'legacy-xml']
for (const source of sources) for (const presentation of presentations) for (const color of colors) {
  const scripts = r45RendererScripts(source, presentation, color)
  assert(scripts.length === 138, `${source}/${presentation}/${color}: expected complete effective renderer inventory`)
  assert(scripts.every(script => new RegExp(script.find_regex, script.flags)), `${source}/${presentation}/${color}: a shipped matcher is invalid`)
}
const fractionalOrderScript = r45RendererScripts('bracket', 'plain', 'realistic').find(row => !Number.isInteger(row.sort_order))
assert(fractionalOrderScript, 'fractional shipped renderer order fixture is missing')
assert(createValidatedRendererOverride(fractionalOrderScript, { name: 'QA fractional order' }).order === fractionalOrderScript.sort_order,
  'a harmless edit must preserve a bundled fractional renderer sort order')

const relationship = [...shippedSurfaceDefinitions(1), ...r45SupplementalSurfaceDefinitions(1)].find(row => row.baseSurfaceId === 'relationship-map')
assert(relationship, 'Relationship Map fixture is missing')
const script = r45RendererScripts('bracket', 'inline', 'realistic').find(row => /\\\[relationship_map\\\]/i.test(row.find_regex))
assert(script, 'Relationship Map does not have an anchored inline/realistic renderer owner')
const pinkDeclaration = /--pink\s*:\s*(#[\da-f]{3,8})\s*;/i.exec(script.replace_string)
assert(pinkDeclaration, 'Relationship Map renderer no longer exposes a harmless scoped color fixture')
const editedReplacement = script.replace_string.replace(pinkDeclaration[0], '--pink:#55aaff;')
assert(editedReplacement !== script.replace_string, 'Relationship Map test edit did not change the replacement')
const override = createValidatedRendererOverride(script, { replaceString: editedReplacement })
const inlineKey = r45ScriptOverrideKey('bracket', 'inline', 'realistic', script.script_id)
const editedInline = renderRegexSurfaceParity(bracketExampleFromXml(relationship.sampleXml), 'inline', 'track-b-relationship', 'realistic', { [inlineKey]: override })
assert(editedInline.includes('--pink:#55aaff;'), 'edited local override did not affect the actual inline Relationship Map rendering')
const glassBaseline = renderRegexSurfaceParity(bracketExampleFromXml(relationship.sampleXml), 'glass', 'track-b-glass', 'realistic')
assert(!glassBaseline.includes('--pink:#55aaff;'), 'inline override leaked into the Glass presentation')
const glassScript = r45RendererScripts('bracket', 'glass', 'realistic').find(row => /\\\[relationship_map\\\]/i.test(row.find_regex))
assert(glassScript, 'Relationship Map has no corresponding Glass renderer script')
const glassPinkDeclaration = /--pink\s*:\s*(#[\da-f]{3,8})\s*;/i.exec(glassScript.replace_string)
assert(glassPinkDeclaration, 'Relationship Map Glass renderer has no safe color value fixture')
const glassEdit = createValidatedRendererOverride(glassScript, { replaceString: glassScript.replace_string.replace(glassPinkDeclaration[0], '--pink:#55aaff;') })
const glassKey = r45ScriptOverrideKey('bracket', 'glass', 'realistic', glassScript.script_id)
const editedGlass = renderRegexSurfaceParity(bracketExampleFromXml(relationship.sampleXml), 'glass', 'track-b-glass-edited', 'realistic', { [glassKey]: glassEdit })
assert(editedGlass.includes('--pink:#55aaff;'), 'Glass override did not affect its own scoped renderer')
const resetGlass = renderRegexSurfaceParity(bracketExampleFromXml(relationship.sampleXml), 'glass', 'track-b-glass-reset', 'realistic', {})
assert(!resetGlass.includes('--pink:#55aaff;') && resetGlass === glassBaseline, 'reset did not restore the exact bundled Glass rendering')

const validEdit = createValidatedRendererOverride(script, { replaceString: editedReplacement })
let retained = validEdit
try { retained = createValidatedRendererOverride(script, { ...validEdit, findRegex: '[' }) } catch { /* backend rejects without replacing the saved value */ }
assert(retained === validEdit && validateRendererRegex('[', 'gi') !== null, 'invalid regex replaced the prior valid renderer overlay')

const customId = 'memory-postcard-live-qa'
const customRoot = 'memory_postcard_live_qa'
const requestId = 'memory-postcard-media-1'
const sampleXml = `<${customRoot}><headline>One afternoon, remembered</headline><body>The train windows caught the last sunlight.</body><image_request id="${requestId}" target="custom.artifact-media" slot="postcard-front" aspect="4:3" alt="A sunlit train window"><scene_brief>A candid view of the last sunlight reflected across a train window, seen from inside the carriage.</scene_brief></image_request></${customRoot}>`
const custom: CustomSurfaceDefinition = {
  ...relationship,
  surfaceId: customId,
  baseSurfaceId: customId,
  presetName: 'Memory Postcard',
  displayName: 'Memory Postcard',
  icon: '▧',
  targetId: 'custom.artifact-media',
  canonicalOuterWrapper: customRoot,
  sampleXml,
  promptCategory: 'custom',
  promptEnabled: true,
  promptModule: `MEMORY POSTCARD UTILITY SENTINEL\nUse [${customRoot}]...[/${customRoot}] and keep the image_request within the card.`,
  advancedCss: `.rrn-surface[data-rrn-preset="${customId}"] .rrn-title { color: #55aaff; }`,
  builtIn: false,
  enabled: true,
  updatedAt: 2,
}
const studio: CustomSurfaceStudioState = {
  definitions: { [customId]: custom },
  activePresetIds: { [customId]: customId },
  collectionPresets: {},
  rendererMode: 'relay',
  defaultShellMode: 'inline',
  colorMode: 'realistic',
  utilityInjectionEnabled: true,
  utilityInjectionPosition: 'after-chat-history',
  utilityTemplate: '{{reverie_enabled_surface_modules}}',
  rendererScriptOverrides: { [inlineKey]: validEdit },
  validationErrors: {},
  lastInjectedModuleIds: [],
  lastInjectionAt: 0,
  lastInjectionSource: 'none',
  lastInjectionPosition: 'none',
  lastInjectionSummary: '',
  updatedAt: 2,
}
const bundledDefinitions = [...shippedSurfaceDefinitions(0), ...r45SupplementalSurfaceDefinitions(0)]
const rendererStudio: CustomSurfaceStudioState = {
  ...studio,
  definitions: { ...Object.fromEntries(bundledDefinitions.map(row => [row.surfaceId, row])), [customId]: custom },
  activePresetIds: { ...Object.fromEntries(bundledDefinitions.map(row => [row.baseSurfaceId, row.surfaceId])), [customId]: customId },
}
const nativeRelationshipEdit = renderNativeSurfaceMarkup(bracketExampleFromXml(relationship.sampleXml), rendererStudio, { chatId: 'track-b', messageId: 'relationship-map' })
assert(nativeRelationshipEdit.content.includes('--pink:#55aaff;'), 'persisted editor overlay was not threaded into Relay native rendering')
const nativeRelationshipResetStudio = structuredClone(rendererStudio)
delete nativeRelationshipResetStudio.rendererScriptOverrides?.[inlineKey]
const nativeRelationshipReset = renderNativeSurfaceMarkup(bracketExampleFromXml(relationship.sampleXml), nativeRelationshipResetStudio, { chatId: 'track-b', messageId: 'relationship-map' })
assert(nativeRelationshipReset.content === renderNativeSurfaceMarkup(bracketExampleFromXml(relationship.sampleXml), { ...rendererStudio, rendererScriptOverrides: {} }, { chatId: 'track-b', messageId: 'relationship-map' }).content, 'native renderer reset did not restore the exact bundled output')
const xmlScript = r45RendererScripts('legacy-xml', 'inline', 'realistic').find(row => /<relationship_map\b/i.test(row.find_regex))
assert(xmlScript, 'Relationship Map has no Legacy XML compatibility renderer script')
const xmlPink = /--pink\s*:\s*(#[\da-f]{3,8})\s*;/i.exec(xmlScript.replace_string)
assert(xmlPink, 'Legacy XML Relationship Map does not contain its expected style owner')
const xmlEdit = createValidatedRendererOverride(xmlScript, { replaceString: xmlScript.replace_string.replace(xmlPink[0], '--pink:#55aaff;') })
const xmlKey = r45ScriptOverrideKey('legacy-xml', 'inline', 'realistic', xmlScript.script_id)
assert(renderRegexSurfaceParity(relationship.sampleXml, 'inline', 'track-b-xml', 'realistic', { [xmlKey]: xmlEdit }).includes('--pink:#55aaff;'), 'Legacy XML renderer ignored its source-scoped override')
const utilityDefinitions = activeSurfaceDefinitions(studio).filter(row => row.baseSurfaceId === customId)
assert(utilityDefinitions.length === 1 && utilityDefinitions[0].promptModule === custom.promptModule, 'custom Utility was not selected exactly once for injection')
assert(validateDeclarativeSurfaceCss(custom.advancedCss, customId).length === 0, 'properly scoped custom CSS was rejected')
for (const unsafe of [
  'body { color: red; }',
  `@import url("https://example.invalid/a.css"); .rrn-surface[data-rrn-preset="${customId}"] { color:red; }`,
  `.rrn-surface[data-rrn-preset="${customId}"] .x { background:url(javascript:alert(1)); }`,
]) assert(validateDeclarativeSurfaceCss(unsafe, customId).length > 0, 'unsafe/global custom CSS was accepted')

const bracket = bracketExampleFromXml(sampleXml)
const pending = renderNativeSurfaceMarkup(bracket, studio, { chatId: 'track-c', messageId: 'memory-postcard', autoGenerate: true })
assert(pending.renderedSurfaceIds.includes(customId), 'custom bracket-native Surface was not consumed')
assert(pending.content.includes(`data-rrn-surface="${customId}"`) && pending.content.includes('One afternoon, remembered'), 'custom Surface did not render its semantic content in Relay')
assert(pending.content.includes(custom.advancedCss), 'safe namespaced CSS was not applied to the custom Surface')
assert(pending.content.includes(`data-rrn-live-status="preparing"`) && pending.content.includes(requestId), 'custom image request did not stay inside its live media slot')
const visiblePendingText = pending.content.replace(/<style\b[\s\S]*?<\/style>/gi, ' ').replace(/<textarea\b[^>]*>[\s\S]*?<\/textarea>/gi, ' ').replace(/<[^>]+>/g, ' ')
assert(!visiblePendingText.includes(`[${customRoot}]`), 'raw custom bracket contract escaped into the rendered message')

const completed = renderNativeSurfaceMarkup(bracket, studio, {
  chatId: 'track-c', messageId: 'memory-postcard', autoGenerate: true,
  records: [{ requestId, target: 'custom.artifact-media', slot: 'postcard-front', messageId: 'memory-postcard', status: 'completed', imageUrl: 'https://example.invalid/postcard.png', imageId: 'postcard-image' } as any],
})
assert(completed.content.includes('https://example.invalid/postcard.png') && completed.content.includes(`data-rrn-surface="${customId}"`), 'completed custom image did not remain inside its Surface region')
const disabledStudio = structuredClone(studio)
disabledStudio.definitions[customId].promptEnabled = false
assert(activeSurfaceDefinitions(disabledStudio).filter(row => row.baseSurfaceId === customId).length === 1, 'disabled Surface vanished from the Library editor state')
assert(activeSurfaceDefinitions(disabledStudio).filter(row => row.baseSurfaceId === customId && row.promptEnabled).length === 0, 'disabled Surface remained eligible for Utility injection')
const editedUtilityStudio = structuredClone(studio)
editedUtilityStudio.definitions[customId].promptModule += '\nMEMORY POSTCARD FUTURE-AUTHORING REVISION'
assert(activeSurfaceDefinitions(editedUtilityStudio).find(row => row.baseSurfaceId === customId)?.promptModule.includes('FUTURE-AUTHORING REVISION'), 'editing the Utility did not change the selected authoring contract')
disabledStudio.definitions[customId].enabled = false
const disabledRender = renderNativeSurfaceMarkup(bracket, disabledStudio, { chatId: 'track-c', messageId: 'memory-postcard-disabled' })
assert(disabledRender.content.includes(`data-rrn-surface="${customId}"`), 'disabled custom Surface broke rendering of already-authored messages')

console.log('renderer editor and custom Surface acceptance smoke passed')
