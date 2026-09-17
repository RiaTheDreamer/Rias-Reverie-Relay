import { bracketExampleFromXml, compactBracketSchemaFromXml } from '../src/bracketSurfaceAuthoring'
import { containsImageRequestMarkup, parseImageRequests } from '../src/contracts'
import { shippedSurfaceDefinitions } from '../src/shippedSurfaceDefinitions'
import { r45SupplementalSurfaceDefinitions } from '../src/r45SurfaceCatalog'
import { narrativeUtilityItems } from '../src/narrativeRegexAssets'

function assert(value: unknown, reason: string): asserts value {
  if (!value) throw new Error(reason)
}

const semanticAngleTag = /<\/?[A-Za-z][A-Za-z0-9:_-]*(?:\s[^>]*)?>/g
const legacyXml = '<photo><image_request id="bracket-protocol-1" target="custom.artifact-media" slot="photo-1" aspect="4:3" alt="Station photograph"><scene_brief>Rainy station platform.</scene_brief></image_request></photo>'
const canonical = `[photo]
  [image_request]
    [id]bracket-protocol-1[/id]
    [target]custom.artifact-media[/target]
    [slot]photo-1[/slot]
    [aspect]4:3[/aspect]
    [alt]Station photograph[/alt]
    [scene_brief]Rainy station platform.[/scene_brief]
  [/image_request]
[/photo]`

const example = bracketExampleFromXml(legacyXml)
const schema = compactBracketSchemaFromXml(legacyXml)
const orderedTokens = ['[photo]', '[image_request]', '[id]bracket-protocol-1[/id]', '[target]custom.artifact-media[/target]', '[slot]photo-1[/slot]', '[aspect]4:3[/aspect]', '[alt]Station photograph[/alt]', '[scene_brief]', 'Rainy station platform.', '[/scene_brief]', '[/image_request]', '[/photo]']
let tokenAt = -1
for (const token of orderedTokens) {
  const next = example.indexOf(token, tokenAt + 1)
  assert(next > tokenAt, `bracket image serializer lost or reordered ${token}`)
  tokenAt = next
}
assert(!semanticAngleTag.test(example), 'bracket image example must contain zero semantic angle tags')
semanticAngleTag.lastIndex = 0
assert(!semanticAngleTag.test(schema), 'compact bracket schema must contain zero semantic angle tags')
assert(schema.includes('[image_request]') && /\[scene_brief\]\s*…\s*\[\/scene_brief\]/.test(schema), 'compact schema must expose the canonical bracket image node')

const bracketRequest = parseImageRequests(canonical)[0]
const legacyRequest = parseImageRequests(legacyXml)[0]
assert(bracketRequest && legacyRequest, 'canonical bracket and legacy XML image requests must both parse')
for (const key of ['id', 'target', 'slot', 'aspect', 'alt', 'prompt'] as const) {
  assert(bracketRequest[key] === legacyRequest[key], `bracket/XML normalization mismatch for ${key}`)
}
assert(bracketRequest.fullMatch.startsWith('[image_request]'), 'canonical request ownership must retain its exact bracket source range')
assert(legacyRequest.fullMatch.startsWith('<image_request'), 'legacy XML ingress must remain available')
const mixedOrder = parseImageRequests(`${canonical}\n${legacyXml.replace(/bracket-protocol-1/g, 'legacy-protocol-2')}`)
assert(mixedOrder.map(request => request.id).join(',') === 'bracket-protocol-1,legacy-protocol-2', 'mixed bracket/XML requests must retain authored production order')
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

assert(containsImageRequestMarkup(canonical), 'production request detection gate must admit canonical bracket image requests')
assert(containsImageRequestMarkup(legacyXml), 'production request detection gate must retain legacy XML ingress')

const surfaces = [...shippedSurfaceDefinitions(1), ...r45SupplementalSurfaceDefinitions(1)]
assert(surfaces.length === 46, `expected protected 46-Surface inventory, got ${surfaces.length}`)
const surfaceFailures = surfaces.flatMap(definition => {
  const tags = String(definition.promptModule || '').match(semanticAngleTag) || []
  return tags.length ? [{ surfaceId: definition.surfaceId, tags: [...new Set(tags)].slice(0, 20) }] : []
})
console.log(`Batch A model-prompt angle audit: ${surfaces.length} Surfaces inspected; ${surfaceFailures.length} still require Batch B contract migration.`)

if (process.env.REVERIE_CHECK_SURFACE_BRACKET_ONLY === '1' && surfaceFailures.length) {
  throw new Error(`Bracket-only Surface prompt gate failed:\n${JSON.stringify(surfaceFailures, null, 2)}`)
}

if (process.env.REVERIE_CHECK_NARRATIVE_BRACKET_ONLY === '1') {
  const narrativeFailures = narrativeUtilityItems().flatMap(item => {
    const tags = String(item.loomContent || '').match(semanticAngleTag) || []
    return tags.length ? [{ utility: item.loomName, tags: [...new Set(tags)].slice(0, 20) }] : []
  })
  if (narrativeFailures.length) {
    throw new Error(`Bracket-only Narrative prompt gate failed:\n${JSON.stringify(narrativeFailures, null, 2)}`)
  }
  console.log('Narrative Utility prompt grammar PASS: zero semantic angle tags.')
}

console.log('Bracket-only Batch A grammar infrastructure PASS.')
