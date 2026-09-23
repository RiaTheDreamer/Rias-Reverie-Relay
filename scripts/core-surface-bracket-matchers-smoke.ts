import { bracketExampleFromXml } from '../src/bracketSurfaceAuthoring'
import {
  R45_ACTIVE_ROOTS,
  containsR45RenderedSurface,
  r45LegacyXmlSurfaceAuthorityPack,
  r45SurfaceAuthorityPack,
  renderR45SurfaceAuthority,
  type R45ColorMode,
  type R45PresentationMode,
} from '../src/r45SurfaceAuthority'
import { renderRegexSurfaceParity } from '../src/regexSurfaceParity'
import { r45SupplementalSurfaceDefinitions } from '../src/r45SurfaceCatalog'
import { shippedSurfaceDefinitions } from '../src/shippedSurfaceDefinitions'
import { normalizeKnownHybridClosingDelimiters } from '../src/bracketSurfaceBridge'

function assert(value: unknown, reason: string): asserts value {
  if (!value) throw new Error(reason)
}

function captureCount(pattern: string): number {
  let count = 0
  let escaped = false
  let characterClass = false
  for (let index = 0; index < pattern.length; index += 1) {
    const char = pattern[index]
    if (escaped) { escaped = false; continue }
    if (char === '\\') { escaped = true; continue }
    if (char === '[') { characterClass = true; continue }
    if (char === ']') { characterClass = false; continue }
    if (characterClass || char !== '(') continue
    if (pattern[index + 1] !== '?') count += 1
    else if (pattern[index + 2] === '<' && !['=', '!'].includes(pattern[index + 3] || '')) count += 1
  }
  return count
}

function replacementCaptureReferences(replacement: string): number[] {
  return [...replacement.matchAll(/\$(\d{1,2})/g)]
    .map(match => Number(match[1]))
    .filter((value, index, values) => values.indexOf(value) === index)
    .sort((left, right) => left - right)
}

const presentations: R45PresentationMode[] = ['inline', 'plain', 'sparkling', 'glass']
const colors: R45ColorMode[] = ['realistic', 'primary', 'glass']
let matcherChanges = 0
let protectedControlMatchers = 0
let replacementDrift = 0
let captureDrift = 0
const approvedSparkReplacementIds = new Set([
  'rr22_sp_045_06dcb0',
  'rr22_sp_067_ca2bc5',
  'rr22_sp_099_53f974',
])

for (const presentation of presentations) for (const color of colors) {
  const current = r45SurfaceAuthorityPack(presentation, color)
  const legacy = r45LegacyXmlSurfaceAuthorityPack(presentation, color)
  assert(current.scripts.length === 138 && legacy.scripts.length === 138, `${presentation}/${color}: authority inventory must remain 138 scripts`)
  for (let index = 0; index < current.scripts.length; index += 1) {
    const migrated = current.scripts[index]
    const original = legacy.scripts[index]
    if (migrated.find_regex !== original.find_regex) matcherChanges += 1
    else {
      assert(/<image_request(?:_error)?\b/i.test(migrated.find_regex), `${presentation}/${color}/${migrated.script_id}: unchanged matcher is not protected Relay control XML`)
      protectedControlMatchers += 1
    }
    if (migrated.replace_string !== original.replace_string) {
      replacementDrift += 1
      const approvedSparkDrift = (presentation === 'sparkling' || presentation === 'glass') && color === 'realistic' && approvedSparkReplacementIds.has(original.script_id)
      const dedicatedGlassBracketBody = presentation === 'glass' && color === 'realistic'
        && migrated.replace_string.includes('data-reverie-glass-button="1"')
        && original.replace_string.includes('data-reverie-glass-button="1"')
      assert(approvedSparkDrift || dedicatedGlassBracketBody, `${presentation}/${color}/${original.script_id}: unauthorized replacement drift`)
    }
    if (captureCount(migrated.find_regex) !== captureCount(original.find_regex)) captureDrift += 1
    const { find_regex: _migratedFind, replace_string: _migratedReplacement, ...migratedAuthority } = migrated
    const { find_regex: _legacyFind, replace_string: _legacyReplacement, ...legacyAuthority } = original
    assert(JSON.stringify(migratedAuthority) === JSON.stringify(legacyAuthority), `${presentation}/${color}/${migrated.script_id}: field outside authorized matcher/replacement drifted`)
    const references = replacementCaptureReferences(migrated.replace_string)
    assert(!references.length || references.at(-1)! <= captureCount(migrated.find_regex), `${presentation}/${color}/${migrated.script_id}: replacement references a missing bracket capture`)
    assert(new RegExp(migrated.find_regex, migrated.flags), `${presentation}/${color}/${migrated.script_id}: bracket matcher does not compile`)
  }
}

assert(matcherChanges === 134 * presentations.length * colors.length, `expected 804 structural matcher instances to be bracket-native; changed=${matcherChanges}`)
assert(protectedControlMatchers === 4 * presentations.length * colors.length, `expected 24 protected XML control matcher instances; retained=${protectedControlMatchers}`)
assert(replacementDrift > approvedSparkReplacementIds.size, `Core presentation authority failed: dedicated Glass Button bracket replacements were not retained; received ${replacementDrift}`)
assert(captureDrift === 0, `Core capture authority failed: ${captureDrift} matcher capture-count changes`)

const definitions = [...shippedSurfaceDefinitions(1), ...r45SupplementalSurfaceDefinitions(1)]
assert(definitions.length === 46 && R45_ACTIVE_ROOTS.length === 46, `expected 46 current Core Surfaces; definitions=${definitions.length}, roots=${R45_ACTIVE_ROOTS.length}`)
assert(!definitions.some(definition => /stella/i.test(`${definition.surfaceId} ${definition.baseSurfaceId} ${definition.presetName}`)), 'Stella must not enter the Core Surface inventory')

let fixtureCases = 0
let protectedXmlCases = 0
let closingDelimiterMutationCases = 0
for (const definition of definitions) {
  const bracket = bracketExampleFromXml(definition.sampleXml)
  assert(bracket.includes(`[${definition.canonicalOuterWrapper}]`) && bracket.includes(`[/${definition.canonicalOuterWrapper}]`), `${definition.surfaceId}: canonical bracket root missing`)
  assert(!/\[\/?(?:image_request|scene_brief|reverie-illustration|visual_prompt)\b/i.test(bracket), `${definition.surfaceId}: canonical fixture migrated Relay image-control XML`)
  if (/<image_request\b/i.test(definition.sampleXml)) {
    protectedXmlCases += 1
    assert(/<image_request\b[\s\S]*?<scene_brief>[\s\S]*?<\/scene_brief>[\s\S]*?<\/image_request>/i.test(bracket), `${definition.surfaceId}: protected XML image control left its bracket owner`)
  }
  for (const close of bracket.matchAll(/\[\/([A-Za-z][\w-]*)\]/g)) {
    const start = close.index || 0
    for (const malformed of [`</${close[1]}]`, `[/${close[1]}>`]) {
      const mutated = `${bracket.slice(0, start)}${malformed}${bracket.slice(start + close[0].length)}`
      const repaired = normalizeKnownHybridClosingDelimiters(mutated, {
        id: definition.baseSurfaceId,
        wrapper: definition.canonicalOuterWrapper,
        sampleXml: definition.sampleXml,
      } as any).markup
      assert(repaired === bracket, `${definition.surfaceId}: shared closer repair failed ${malformed}`)
      closingDelimiterMutationCases += 1
    }
  }
  for (const presentation of presentations) for (const color of colors) {
    const rendered = renderRegexSurfaceParity(bracket, presentation, `batch-c-${definition.surfaceId}`, color)
    assert(containsR45RenderedSurface(rendered), `${definition.surfaceId}/${presentation}/${color}: authorized visual did not render`)
    assert(!rendered.includes('Relay Surface needs repair'), `${definition.surfaceId}/${presentation}/${color}: canonical bracket fixture fell into generic repair UI`)
    assert(!rendered.includes(`[${definition.canonicalOuterWrapper}]`), `${definition.surfaceId}/${presentation}/${color}: bracket root remained visible`)
    fixtureCases += 1
  }
  const legacyRendered = renderR45SurfaceAuthority(definition.sampleXml, 'inline', 'realistic', `batch-c-legacy-${definition.surfaceId}`)
  assert(containsR45RenderedSurface(legacyRendered), `${definition.surfaceId}: legacy XML compatibility path stopped rendering`)
}

assert(protectedXmlCases > 0, 'Core fixtures must exercise canonical XML image controls')
assert(closingDelimiterMutationCases > definitions.length * 2, 'Core closer mutation matrix did not cover nested registered fields')
console.log(`Core Batch C matcher gate passed: 46 Core Surfaces, ${fixtureCases} bracket fixture variants, ${closingDelimiterMutationCases} closer mutations, ${protectedXmlCases} XML-control fixtures, ${matcherChanges} structural matcher instances migrated, ${protectedControlMatchers} Relay XML-control matcher instances retained, ${replacementDrift} authorized Sparkling/Glass Button replacement updates, capture drift 0.`)
