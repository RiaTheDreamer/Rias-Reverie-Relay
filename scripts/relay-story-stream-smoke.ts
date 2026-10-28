// @ts-nocheck -- deterministic stream-boundary tests without provider access.
import assert from 'node:assert/strict'
import { RelayStoryStream } from '../src/relayStoryStream'

const a = 'The blue mug stands left of a closed yellow notebook on the empty table.'
const b = 'The window is open above the unoccupied wooden bench.'
const stream = new RelayStoryStream()
assert.equal(stream.push({ token: a, offset: 0 }), true)
assert.equal(stream.completeProse(), '', 'an unfinished paragraph cannot be selected')
stream.push({ token: '\n\n' + b, offset: a.length })
assert.equal(stream.completeProse(), a)
const current = `${a}\n\n${b}`
stream.push({ token: current, offset: 0 })
assert.equal(stream.completeProse(), a, 'replayed offsets do not append duplicate text')
stream.push({ token: '\n\n<Plot_Sparks><Spark>unfinished', offset: current.length })
assert.equal(stream.completeProse(), current, 'unfinished utility markup stays outside the planning prefix')
assert.equal(stream.push({ token: 'different', offset: 0 }), false)
assert.equal(stream.completeProse(), '', 'divergent rewrites invalidate the source')

for (const offset of [undefined, -1, 1, 0.5, Number.NaN]) {
  const bad = new RelayStoryStream()
  assert.equal(bad.push({ token: a, offset }), false)
  assert.equal(bad.completeProse(), '')
}
for (const markup of ['<reverie-illustration', '[plot_sparks]', '```xml']) {
  const marked = new RelayStoryStream()
  marked.push({ token: `${a}\n\n${markup}\n\nInvented utility body.\n\n`, offset: 0 })
  assert.equal(marked.completeProse(), a, 'utility/code content cannot become a story beat')
}
const reasoning = new RelayStoryStream()
assert.equal(reasoning.push({ token: `${a}\n\n`, offset: 0, type: 'reasoning' }), false)
assert.equal(reasoning.completeProse(), '')
reasoning.push({ token: `${a}\n\n`, offset: 0 })
assert.equal(reasoning.completeProse(), a, 'reasoning offsets do not corrupt the content buffer')
for (const delimiter of ['\r\n\r\n', '\n \t\n']) {
  const spaced = new RelayStoryStream()
  spaced.push({ token: `${a}${delimiter}`, offset: 0 })
  assert.equal(spaced.completeProse(), a, 'host line endings and whitespace-only blank lines must close paragraphs')
}
const oversized = new RelayStoryStream()
oversized.push({ token: 'x'.repeat(128_001), offset: 0 })
assert.equal(oversized.valid, false)
assert.equal(oversized.completeProse(), '')
console.log('PASS Relay story stream: closed prose, append/replay offsets, divergent/gapped/missing offsets, reasoning exclusion, utility/code boundaries and bounded memory. No providers.')
