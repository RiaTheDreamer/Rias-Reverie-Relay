// @ts-nocheck -- Node-built-in assertions; production extractor is typechecked.
import assert from 'node:assert/strict'
import { closedRelayDirectorBatch } from '../src/relayPlannedStream'

const first = { title: 'Braces } { and escaped "quotes" \\', directives: [{ pose: 'seated', props: ['folder', 'key'] }] }
const second = { title: 'Second', anchor: { paragraphIndex: 1 } }
// JSON.stringify supplies a valid escaped string rather than hand-built fixtures.
const header = JSON.stringify({ shouldIllustrate: true, reason: 'An array named "illustrations" [ is just prose' }).slice(0, -1) + ',"illustrations":['
const firstText = JSON.stringify(first), secondText = JSON.stringify(second)
assert.equal(closedRelayDirectorBatch(header + firstText.slice(0, -1)), null)
const one = closedRelayDirectorBatch(header + firstText + ',{"title":"unfinished')
assert.deepEqual(JSON.parse(one!).illustrations, [first])
assert.deepEqual(JSON.parse(closedRelayDirectorBatch(header + firstText + ',' + secondText + ']}')!).illustrations, [first, second])
assert.deepEqual(JSON.parse(closedRelayDirectorBatch('```json\n' + header + firstText + ',')!).illustrations, [first])
assert.equal(closedRelayDirectorBatch('{"shouldIllustrate":false,"illustrations":[' + firstText), null)
assert.equal(closedRelayDirectorBatch('{"reason":"illustrations","other":[' + firstText), null)
assert.equal(closedRelayDirectorBatch('{"shouldIllustrate":true,"nested":{"illustrations":[' + firstText), null)
assert.equal(closedRelayDirectorBatch(header + firstText + ',garbage,' + secondText), null)
assert.equal(closedRelayDirectorBatch(header + firstText + ']'), one)
assert.equal(closedRelayDirectorBatch('plain prose'), null)
// Every character boundary must retain only wholly closed root-array entries.
const full = header + firstText + ',' + secondText + ']}'
for (let i = 0; i <= full.length; i++) {
  const partial = closedRelayDirectorBatch(full.slice(0, i))
  const expected = i >= header.length + firstText.length + 1 + secondText.length ? 2 : i >= header.length + firstText.length ? 1 : 0
  assert.equal(partial ? JSON.parse(partial).illustrations.length : 0, expected)
}
console.log('Director stream extraction passed: every character boundary, nested/escaped strings, fenced JSON, incomplete/rejected envelopes and exact closed-shot prefixes.')
