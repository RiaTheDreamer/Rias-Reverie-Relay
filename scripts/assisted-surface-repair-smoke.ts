import { validateAssistedSurfaceRepair, MAX_ASSISTED_SURFACE_REPAIR_CHARS } from '../src/assistedSurfaceRepair'
import { bracketExampleFromXml } from '../src/bracketSurfaceAuthoring'
import { SHIPPED_SURFACE_SPECS } from '../src/shippedSurfaceDefinitions'
import { completeSurfaceSpecs } from '../src/surfaceXml'
import { PLOT_SPARKS_REPAIR_EXAMPLE } from '../src/plotSparksContract'
import { bracketImageControls } from '../src/imageControlMarkup'

function assert(value: unknown, reason: string): asserts value { if (!value) throw new Error(reason) }
function equal(actual: unknown, expected: unknown, reason = 'Values did not match.'): void { if (!Object.is(actual, expected)) throw new Error(`${reason} Actual: ${String(actual)}; expected: ${String(expected)}.`) }
function match(actual: string, expected: RegExp, reason: string): void { if (!expected.test(actual)) throw new Error(reason) }
function deepEqual(actual: unknown, expected: unknown, reason: string): void { if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(reason) }

// Building Layout's strict mixed XML/legacy-bracket repair gate is tested separately.
const specs = completeSurfaceSpecs(SHIPPED_SURFACE_SPECS).filter(row => row.id !== 'building-layout')
equal(specs.length, 46, 'repair registry must cover all shipped Core Surface contracts')

const normalizationBlocked: string[] = []
let bracketSurfaceCases = 0
for (const spec of specs) {
  assert(typeof spec.sampleXml === 'string', `${spec.id}: shipped sample is required`)
  const unchanged = validateAssistedSurfaceRepair(spec.id, spec.sampleXml, spec.sampleXml)
  if (!unchanged.ok) {
    match(unchanged.reason || '', /normalization would change text or image requests/i, `${spec.id}: only semantic normalization hazards may block a canonical sample`)
    normalizationBlocked.push(spec.id)
  }

  const bracket = bracketExampleFromXml(spec.sampleXml)
  assert(/^\s*\[/.test(bracket), `${spec.id}: shipped sample must convert to bracket-native format`)
  const bracketNoOp = validateAssistedSurfaceRepair(spec.id, bracket, bracket)
  assert(bracketNoOp.ok, `${spec.id}: canonical bracket Surface should pass: ${bracketNoOp.reason || ''}`)
  const controls = bracketImageControls(bracket)
  const closer = [...bracket.matchAll(/\[\/([A-Za-z][\w-]*)\]/g)].find(match => match[1]?.toLocaleLowerCase() !== spec.wrapper.toLocaleLowerCase()
    && !controls.some(control => match.index! >= control.index && match.index! < control.index + control.fullMatch.length))
    || [...bracket.matchAll(/\[\/([A-Za-z][\w-]*)\]/g)][0]
  assert(closer, `${spec.id}: bracket sample needs a closer for repair coverage`)
  const brokenBracket = bracket.slice(0, closer.index) + `[/${closer[1]}_broken]` + bracket.slice(closer.index! + closer[0].length)
  const bracketRepair = validateAssistedSurfaceRepair(spec.id, brokenBracket, bracket)
  assert(bracketRepair.ok, `${spec.id}: bracket closing-tag repair should pass: ${bracketRepair.reason || ''}`)
  equal(bracketRepair.markup, bracket)
  const missingCloser = bracket.slice(0, closer.index) + bracket.slice(closer.index! + closer[0].length)
  const insertedCloser = validateAssistedSurfaceRepair(spec.id, missingCloser, bracket)
  assert(insertedCloser.ok, `${spec.id}: inserting a missing closing tag must preserve content: ${insertedCloser.reason || ''}`)
  bracketSurfaceCases += 1
}
deepEqual(normalizationBlocked, ['smartphone', 'kakao'], 'known normalizer request rewrites must remain fail-closed')

// Regression: the reported Kakao error omits scalar closers, not opening tags.
const kakao = '[kakao_chat][title]Field Team[/title][date]Today[/date][time]08:30[/time][unread]0[/unread][messages][k_date]Today[/k_date][k_msg from="Participant A" side="left"]Meet at the gate.[/k_msg][/messages][/kakao_chat]'
const brokenKakao = kakao.replace(/\[\/(?:title|date|time|unread|k_date|k_msg)\]/g, '')
const kakaoRepair = validateAssistedSurfaceRepair('kakao', brokenKakao, kakao)
assert(kakaoRepair.ok, `Kakao missing scalar closers must be repairable: ${kakaoRepair.reason || ''}`)
equal(validateAssistedSurfaceRepair('kakao', brokenKakao, kakao.replace('Meet at the gate.', 'Meet somewhere else.')).ok, false, 'Kakao repair must not rewrite message text')

const literalSparks = PLOT_SPARKS_REPAIR_EXAMPLE.replace('Possible branch A.', '[The paper says [urgent] and [/literal]; keep this prose.]')
const missingSparkTextCloser = literalSparks.replace('[/Text][Media]', '[Media]')
const repairedLiteralSparks = validateAssistedSurfaceRepair('plot-sparks', missingSparkTextCloser, literalSparks)
assert(repairedLiteralSparks.ok, `Spark field closer may be restored without changing bracketed prose: ${repairedLiteralSparks.reason || ''}`)
equal(repairedLiteralSparks.markup, literalSparks, 'Literal Spark prose must survive repair byte-for-byte')
equal(validateAssistedSurfaceRepair('plot-sparks', missingSparkTextCloser, literalSparks.replace('[/literal]', '')).ok, false, 'Literal closing-looking prose must not be deleted')
equal(validateAssistedSurfaceRepair('plot-sparks', missingSparkTextCloser, literalSparks.replace('[urgent]', '[urgent][/urgent]')).ok, false, 'Literal brackets must not gain invented closing tags')
equal(validateAssistedSurfaceRepair('plot-sparks', missingSparkTextCloser, literalSparks.replace('[urgent]', 'urgent')).ok, false, 'Repair must not silently remove decorative prose brackets')

const spec = specs.find(row => typeof row.sampleXml === 'string' && row.sampleXml.includes('<image_request'))
assert(spec, 'at least one shipped sample must exercise an image request')
const source = spec.sampleXml
assert(typeof source === 'string', `${spec.id}: Surface sample is required`)
const rootClose = new RegExp(`<\\/${spec.wrapper}\\s*>`, 'i')
const requestRange = source.match(/<image_request\b[\s\S]*?<\/image_request\s*>/i)
const candidateCloser = [...source.matchAll(/<\/([A-Za-z][\w:-]*)\s*>/g)]
  .find(match => match[1].toLocaleLowerCase() !== spec.wrapper.toLocaleLowerCase()
    && (!requestRange || match.index! < source.indexOf(requestRange[0]) || match.index! >= source.indexOf(requestRange[0]) + requestRange[0].length))
assert(candidateCloser, `${spec.id}: sample needs a non-root closer for structural repair coverage`)
const wrongCloser = candidateCloser[1] || 'tag'
const malformed = source.slice(0, candidateCloser.index) + `</${wrongCloser}_broken>` + source.slice(candidateCloser.index! + candidateCloser[0].length)
equal(rootClose.test(source), true)
const accepted = validateAssistedSurfaceRepair(spec.id, malformed, source)
equal(accepted.ok, true, `exact closing-tag correction should pass: ${accepted.reason || ''}`)
equal(accepted.markup, source)

const bracketSource = bracketExampleFromXml(source)
const bracketCloser = [...bracketSource.matchAll(/\[\/([A-Za-z][\w-]*)\]/g)]
  .find(match => match[1]?.toLocaleLowerCase() !== spec.wrapper.toLocaleLowerCase())
assert(bracketCloser, `${spec.id}: bracket sample needs a non-root closer for structural repair coverage`)
const bracketWrongCloser = bracketCloser[1] || 'tag'
const malformedBracket = bracketSource.slice(0, bracketCloser.index)
  + `[/${bracketWrongCloser}_broken]`
  + bracketSource.slice(bracketCloser.index! + bracketCloser[0].length)
const acceptedBracket = validateAssistedSurfaceRepair(spec.id, malformedBracket, bracketSource)
equal(acceptedBracket.ok, true, `bracket-native closing-tag correction should pass: ${acceptedBracket.reason || ''}`)
equal(acceptedBracket.markup, bracketSource)

equal(validateAssistedSurfaceRepair(spec.id, malformed, source.replace(/(?<=<[^>]+>)[^<]/, 'X')).ok, false, 'text edits must fail closed')
equal(validateAssistedSurfaceRepair(spec.id, malformed, source.replace(/(\w+="[^"]*")/, '$1 changed="1"')).ok, false, 'opening-tag or attribute edits must fail closed')
equal(validateAssistedSurfaceRepair(spec.id, malformed, source.replace(/<scene_brief>([\s\S]*?)<\/scene_brief>/i, '<scene_brief>changed request</scene_brief>')).ok, false, 'image-request prompt edits must fail closed')
equal(validateAssistedSurfaceRepair(spec.id, malformed, source.replace(new RegExp(`<${spec.wrapper}\\b`), '<wrong_surface')).ok, false, 'root changes must fail closed')
equal(validateAssistedSurfaceRepair(spec.id, malformed, `${source}<aside>extra root</aside>`).ok, false, 'extra roots must fail closed')
equal(validateAssistedSurfaceRepair(spec.id, malformed, source + ' trailing prose').ok, false, 'trailing prose must fail closed')
equal(validateAssistedSurfaceRepair(spec.id, malformedBracket, bracketSource.replace(`[${spec.wrapper}]`, `[${spec.wrapper} changed="1"]`)).ok, false, 'bracket opening-tag or attribute edits must fail closed')
equal(validateAssistedSurfaceRepair(spec.id, malformedBracket, bracketSource.replace(/\[scene_brief\]([\s\S]*?)\[\/scene_brief\]/i, '[scene_brief]changed request[/scene_brief]')).ok, false, 'bracket image-request prompt edits must fail closed')
equal(validateAssistedSurfaceRepair(spec.id, malformedBracket, `${bracketSource} trailing prose`).ok, false, 'bracket trailing prose must fail closed')
equal(validateAssistedSurfaceRepair('custom-surface-not-registered', malformed, source).ok, false, 'unregistered surfaces must fail closed')
equal(validateAssistedSurfaceRepair(spec.id, `${source}${'x'.repeat(MAX_ASSISTED_SURFACE_REPAIR_CHARS)}`, source).ok, false, 'oversized content must fail closed')

console.log(`Assisted Surface Repair smoke passed: ${specs.length} shipped XML and ${bracketSurfaceCases} bracket-native samples; structure-only repair accepted in both formats; XML normalizer request rewrites fail closed for ${normalizationBlocked.join(', ')}; text, attrs, image request, root, extra-root, trailing content, unregistered IDs, and size violations rejected.`)
