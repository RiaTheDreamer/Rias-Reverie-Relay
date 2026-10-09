import { bracketExampleFromXml, compactBracketSchemaFromXml } from '../src/bracketSurfaceAuthoring'
import { containsImageRequestMarkup, parseImageRequests } from '../src/contracts'
import { shippedSurfaceDefinitions } from '../src/shippedSurfaceDefinitions'
import { r45SupplementalSurfaceDefinitions } from '../src/r45SurfaceCatalog'
import { narrativeUtilityItems } from '../src/narrativeRegexAssets'

function assert(value: unknown, reason: string): asserts value {
  if (!value) throw new Error(reason)
}

const semanticAngleTag = /<\/?[A-Za-z][A-Za-z0-9:_-]*(?:\s[^>]*)?>/g
const protectedRelayControl = /<\/?(?:image_request|scene_brief|reverie-illustration|visual_prompt)(?:\s[^>]*)?>/gi
const bracketImageControl = /\[\/?(?:image_request|scene_brief|reverie-illustration|visual_prompt)\b/i
const canonicalXml = '<photo><image_request id="bracket-protocol-1" target="custom.artifact-media" slot="photo-1" aspect="4:3" alt="Station photograph"><scene_brief>Rainy station platform.</scene_brief></image_request></photo>'
const bracketCompatible = `[photo]
  [image_request]
    [id]bracket-protocol-1[/id]
    [target]custom.artifact-media[/target]
    [slot]photo-1[/slot]
    [aspect]4:3[/aspect]
    [alt]Station photograph[/alt]
    [scene_brief]Rainy station platform.[/scene_brief]
  [/image_request]
[/photo]`

const example = bracketExampleFromXml(canonicalXml)
const schema = compactBracketSchemaFromXml(canonicalXml)
const orderedTokens = ['[photo]', '[image_request]', '[id]bracket-protocol-1[/id]', '[scene_brief]', 'Rainy station platform.', '[/scene_brief]', '[/image_request]', '[/photo]']
let tokenAt = -1
for (const token of orderedTokens) {
  const next = example.indexOf(token, tokenAt + 1)
  assert(next > tokenAt, `hybrid Surface serializer lost or reordered ${token}`)
  tokenAt = next
}
assert(bracketImageControl.test(example), 'Surface example must author bracket image controls')
assert(bracketImageControl.test(schema), 'Surface schema must author bracket image controls')
assert(example.includes('[image_request]') && example.includes('[scene_brief]'), 'legacy compatibility serializer must expose bracket image control')
assert(schema.includes('[image_request]') && /\[scene_brief\]\s*…\s*\[\/scene_brief\]/.test(schema), 'legacy compatibility schema must expose bracket image control')
assert(!(example.replace(protectedRelayControl, '').match(semanticAngleTag) || []).length, 'Surface example must contain no structural XML outside protected Relay control')
assert(!(schema.replace(protectedRelayControl, '').match(semanticAngleTag) || []).length, 'Surface schema must contain no structural XML outside protected Relay control')

const bracketRequest = parseImageRequests(bracketCompatible)[0]
const canonicalRequest = parseImageRequests(canonicalXml)[0]
assert(bracketRequest && canonicalRequest, 'canonical XML and bracket-compatible image requests must both parse')
for (const key of ['id', 'target', 'slot', 'aspect', 'alt', 'prompt'] as const) {
  assert(bracketRequest[key] === canonicalRequest[key], `bracket/XML normalization mismatch for ${key}`)
}
assert(bracketRequest.fullMatch.startsWith('[image_request]'), 'bracket-compatible request ownership must retain its exact source range')
assert(canonicalRequest.fullMatch.startsWith('<image_request'), 'canonical XML request ownership must retain its exact source range')
const mixedOrder = parseImageRequests(`${bracketCompatible}\n${canonicalXml.replace(/bracket-protocol-1/g, 'canonical-protocol-2')}`)
assert(mixedOrder.map(request => request.id).join(',') === 'bracket-protocol-1,canonical-protocol-2', 'mixed bracket/XML requests must retain authored production order')
assert(parseImageRequests('[image_request id="not-canonical"][/image_request]').length === 0, 'bracket image opening tags must not accept attributes')
const optionalRequest = parseImageRequests('[image_request][id]carousel-1[/id][target]instagram.carousel[/target][slot]carousel[/slot][aspect]1:1[/aspect][alt]Three slides[/alt][cast]none[/cast][count]3[/count][visual_prompt]Three connected story images.[/visual_prompt][negative_prompt]readable text[/negative_prompt][/image_request]')[0]
assert(optionalRequest?.count === 3 && optionalRequest.cast === 'none', 'optional bracket count and cast fields must survive normalization')
assert(optionalRequest?.prompt === 'Three connected story images.' && optionalRequest.negative === 'readable text', 'optional bracket visual and negative prompts must survive normalization')

const phone = `[smart_phone]
[time]21:14[/time]
[messages]
[s_img]
[side]recv[/side]
[time]21:12[/time]
[image_request]
[id]phone-photo-1[/id]
[target]smartphone.message-image[/target]
[slot]phone-photo-1[/slot]
[aspect]4:3[/aspect]
[alt]Chat attachment[/alt]
[scene_brief]Contextual chat photograph.[/scene_brief]
[/image_request]
[/s_img]
[/messages]
[/smart_phone]`
assert(parseImageRequests(phone)[0]?.time === '21:12', 'bracket Smartphone request must inherit its exact authored message time')

const plotSparks = `[Plot_Sparks]
[Spark]
[Media]
[image_request]
[id]plot-spark-a[/id]
[target]prose.illustration[/target]
[slot]plot-spark-a[/slot]
[aspect]4:3[/aspect]
[alt]Plot Spark[/alt]
[scene_brief]A consequential visual beat.[/scene_brief]
[/image_request]
[/Media]
[/Spark]
[/Plot_Sparks]`
assert(parseImageRequests(plotSparks)[0]?.target === 'custom.artifact-media', 'Narrative-owned bracket requests must retain artifact-media ownership isolation')

assert(containsImageRequestMarkup(canonicalXml), 'production request detection gate must admit canonical XML image requests')
assert(containsImageRequestMarkup(bracketCompatible), 'production request detection gate must retain bracket compatibility ingress')

const surfaces = [...shippedSurfaceDefinitions(1), ...r45SupplementalSurfaceDefinitions(1)]
assert(surfaces.length === 47, `expected protected 47-Surface inventory, got ${surfaces.length}`)
const canonicalSurfaceRequests = surfaces.filter(definition => String(definition.promptModule || '').includes('<image_request'))
assert(canonicalSurfaceRequests.length > 0, 'current Surface prompts must teach canonical XML image requests')
for (const definition of surfaces) {
  assert(String(definition.promptModule).includes(`ROOT: <${definition.canonicalOuterWrapper}>`), `${definition.surfaceId}: new authoring must use its XML root`)
}
for (const utility of narrativeUtilityItems()) {
  assert(!/bracket-native|\[(?:Plot_Sparks|character_phone|image_request|scene_brief|visual_prompt)\]/.test(utility.loomContent), `${utility.loomName}: legacy bracket authoring leaked into the current Utility`)
}
console.log(`XML authoring with saved bracket compatibility PASS: ${surfaces.length} Surface roots, ${canonicalSurfaceRequests.length} image-request modules, all Narrative Utilities and exact mixed-source ownership.`)
