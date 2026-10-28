// @ts-nocheck -- production renderer and mounted DOM test, like the native smoke suite.
import assert from 'node:assert/strict'
import { JSDOM, VirtualConsole } from 'jsdom'
import { renderNativeSurfaceMarkup } from '../src/nativeSurfaces'
import { shippedSurfaceDefinitions, SHIPPED_SURFACE_SPECS } from '../src/shippedSurfaceDefinitions'
import { normalizeSurfaceBlock, normalizeSurfaceDocument } from '../src/surfaceXml'
import { parseImageRequests } from '../src/contracts'
import { renderRegexSurfaceParity } from '../src/regexSurfaceParity'
import { r45SupplementalSurfaceDefinitions } from '../src/r45SurfaceCatalog'
import { surfaceRepairEditorHelp } from '../src/uxCopy'
import { maskInlineCodeSpans, protectInlineCodeSpans } from '../src/inlineCodeBoundary'

const definition = shippedSurfaceDefinitions(1).find(row => row.baseSurfaceId === 'dating-profile')!
const spec = SHIPPED_SURFACE_SPECS.find(row => row.id === 'dating-profile')!
const studio: any = {
  definitions: { [definition.surfaceId]: definition }, activePresetIds: { 'dating-profile': definition.surfaceId },
  collectionPresets: {}, rendererMode: 'relay', defaultShellMode: 'plain', colorMode: 'realistic',
  rendererScriptOverrides: {}, utilityInjectionEnabled: true, utilityInjectionPosition: 'after-chat-history',
  utilityTemplate: '', validationErrors: {}, updatedAt: 1,
}
const source = definition.sampleXml.replace('<name>You</name>', '<name>Deck Owner</name>')
const broken = source.replace('<tinder><user>', '<tinder>Deck Owner')
const quoted = '`<tinder><user><name>You</name><avatar>Y</avatar></user><profiles></profiles>`'
const message = `Test the \`<tinder>\` surface with \`<thread_accessibility>\` active.\n\n${broken}\n\nThere is the complete ${quoted} example.</tinder>`
const before = normalizeSurfaceDocument(message, SHIPPED_SURFACE_SPECS)
assert.equal(before.diagnostics.length, 0, `quoted root stole the live deck: ${before.diagnostics.join('; ')}`)
assert(before.markup.includes('<tinder><user><name>Deck Owner</name>'), 'missing user opener was not safely recovered')
assert(before.markup.includes(quoted), 'normalization changed the literal example')

let cases = 0
for (const presentation of ['inline', 'plain', 'sparkling', 'glass']) {
  for (const color of ['realistic', 'primary', 'glass']) {
    const rendered = renderNativeSurfaceMarkup(message, { ...studio, defaultShellMode: presentation, colorMode: color }, { chatId: 'tinder-fixture', messageId: `tinder-${presentation}-${color}` })
    assert(!rendered.content.includes('data-reverie-surface-contract="failed"'), 'safe deck produced a repair card')
    assert.equal(rendered.renderedSurfaceIds.filter(id => id === 'dating-profile').length, 1, 'literal example became a second app')
    assert(rendered.content.includes(quoted), 'literal code must remain literal')
    const dom = new JSDOM(rendered.content, { virtualConsole: new VirtualConsole() })
    assert.equal(dom.window.document.querySelector('[data-rrn-surface-original]')?.getAttribute('data-rrn-surface-original'), broken, 'original malformed deck must remain inspectable exactly')
    assert(dom.window.document.body.textContent?.includes('Profile A'), 'first authored profile disappeared')
    assert(dom.window.document.body.textContent?.includes('Profile B'), 'second authored profile disappeared')
    assert(dom.window.document.body.textContent?.includes('Profile C'), 'third authored profile disappeared')
    const imageOwners = new Set([...dom.window.document.querySelectorAll('[data-rrn-native-request]')].map(node => node.getAttribute('data-rrn-native-request')))
    assert.equal(imageOwners.size, 4, 'avatar/profile image ownership changed; match views may reuse the same portrait')
    dom.window.close()
    cases++
  }
}
for (const renderer of ['relay', 'legacy-regex']) {
  const rendered = renderNativeSurfaceMarkup(`Mention \`<tinder>\`, then:\n${source}\n${quoted}`, { ...studio, rendererMode: renderer }, { chatId: 'tinder-fixture', messageId: renderer })
  assert(!rendered.content.includes('data-reverie-surface-contract="failed"'), `${renderer}: quoted code poisoned the deck`)
  assert.equal(rendered.renderedSurfaceIds.filter(id => id === 'dating-profile').length, 1)
}
assert.equal(parseImageRequests(message).length, 4, 'all real image requests must remain eligible')
const inlineImage = '`' + source + '`'
assert.equal(parseImageRequests(inlineImage).length, 0, 'a quoted example must never dispatch images')
assert.equal(renderNativeSurfaceMarkup(inlineImage, studio, { chatId: 'tinder-fixture' }).renderedCount, 0)
assert.equal(renderRegexSurfaceParity(inlineImage, 'plain', 'quoted'), inlineImage, 'standalone parity must respect code spans')
assert.equal(parseImageRequests('``' + source + '``').length, 0, 'double-backtick examples must remain inactive')
assert.equal(parseImageRequests('```' + source + '```').length, 0, 'same-line triple-backtick examples must remain inactive')
assert.equal(parseImageRequests('```xml\n' + source + '\n```').length, 4, 'existing fenced payload compatibility must remain active')
const empty = source.replace(/<profiles>[\s\S]*?<\/profiles>/, '<profiles></profiles>')
assert.match(normalizeSurfaceBlock(empty, spec).diagnostics.join('; '), /requires exactly 3 profiles; found 0/i)
const incomplete = source.replace('<age>27</age>', '')
assert.match(normalizeSurfaceBlock(incomplete, spec).diagnostics.join('; '), /profile 1.*<age>/i)
const ambiguous = broken.replace('<tinder>Deck Owner', '<tinder>Different Owner')
assert.match(normalizeSurfaceBlock(ambiguous, spec).diagnostics.join('; '), /<user> opening tag/i)
assert.equal(normalizeSurfaceBlock(ambiguous, spec).markup, ambiguous, 'ambiguous names must not be rewritten')
assert.equal(normalizeSurfaceBlock(source, spec).diagnostics.length, 0)
assert(normalizeSurfaceBlock(broken, spec).changed, 'recovered wrapper must report a real normalization change')
assert.equal(normalizeSurfaceBlock(source.replace(/<image_request\b[^>]*>[\s\S]*?<\/image_request>/g, ''), spec).diagnostics.length, 0, 'Images Off must keep a valid text-only Tinder deck')
for (const surface of [...shippedSurfaceDefinitions(1), ...r45SupplementalSurfaceDefinitions(1)]) {
  const example = '`' + surface.sampleXml + '`'
  const rendered = renderNativeSurfaceMarkup(`Reference: ${example}`, studio, { chatId: 'literal-fixture', messageId: surface.baseSurfaceId })
  assert.equal(rendered.renderedCount, 0, `${surface.baseSurfaceId}: quoted code became a live Surface`)
  assert(rendered.content.includes(example), `${surface.baseSurfaceId}: code source was changed`)
  assert.equal(parseImageRequests(example).length, 0, `${surface.baseSurfaceId}: literal example could spend image credits`)
}
const detail = normalizeSurfaceBlock(empty, spec).diagnostics.join('; ')
const editorHelp = surfaceRepairEditorHelp(detail)
assert(editorHelp.startsWith(detail), 'editor must lead with the exact diagnosed field problem')
assert(editorHelp.includes('cannot add missing opening tags or fields'), 'editor must state the repair boundary plainly')
assert(!editorHelp.includes('This Surface could not be displayed'), 'vague dead-end error returned')
const literal = 'A ``<tinder> and ` text`` B'
assert.equal(protectInlineCodeSpans(literal).restore(protectInlineCodeSpans(literal).markup), literal)
assert.equal(maskInlineCodeSpans(literal).length, literal.length, 'request source offsets must not shift')
assert.equal(maskInlineCodeSpans('unclosed ` mention\n\nreal paragraph ` here'), 'unclosed ` mention\n\nreal paragraph ` here', 'unmatched ticks must not swallow separate paragraphs')
const briefs = source.replace('Centered reusable dating-app avatar', 'A literal `crop-safe pose` in a reusable dating-app avatar')
assert(parseImageRequests(briefs)[0].prompt.includes('`crop-safe pose`'), 'real image request briefs must retain literal text')
const codeInBio = source.replace('Short profile bio.', 'Keep `<name>` and `[brackets]` as literal text.')
const bioRender = renderNativeSurfaceMarkup(codeInBio, studio, { chatId: 'source-fixture', messageId: 'source-fixture' })
const bioDom = new JSDOM(bioRender.content, { virtualConsole: new VirtualConsole() })
assert.equal(bioDom.window.document.querySelector('[data-rrn-surface-original]')?.getAttribute('data-rrn-surface-original'), codeInBio, 'Inspect / Fix must preserve code spans in original source')
assert(!bioDom.window.document.querySelector('[data-rrn-surface-source]')?.getAttribute('data-rrn-surface-source')?.includes('rrl-literal-code'), 'editor leaked a temporary code marker')
bioDom.window.close()
console.log(`Tinder boundary regression passed: ${cases} presentations/colors, literal examples, safe wrapper recovery, image ownership and actionable diagnostics`)
