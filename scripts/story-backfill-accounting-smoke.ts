// @ts-nocheck -- Bun-hosted focused acceptance test.
import assert from 'node:assert/strict'
import { emptyStoryBackfillStats, recordStoryBackfillOutcome, storyBackfillSummary } from '../src/storyBackfill'

const stats = emptyStoryBackfillStats()
stats.scanned = 4
stats.eligible = 3
recordStoryBackfillOutcome(stats, { status: 'failed', reason: 'no-parser-connection' })
recordStoryBackfillOutcome(stats, { status: 'analyzed', rawCandidates: 0, normalizedCandidates: 1, fallbackEchoes: 1, rejectedCandidates: 1, proposals: 1, rejectionReasons: { 'anchor-not-in-source': 1 } })
recordStoryBackfillOutcome(stats, { status: 'skipped', reason: 'already-processed' })
assert.equal(stats.completed, 3, 'completion counts terminal items, not only successful analysis')
assert.equal(stats.analyzed, 1, 'missing parser is not reported as an analyzed item')
assert.equal(stats.failed, 1)
assert.equal(stats.skipped, 1)
assert.equal(stats.proposals, 1)
assert.equal(stats.fallbackEchoes, 1, 'bounded Echo fallback use is visible in resumable backfill accounting')
assert.equal(stats.reasons['no-parser-connection'], 1)
assert.equal(stats.reasons['anchor-not-in-source'], 1)
assert.match(storyBackfillSummary(stats), /1 analyzed, 1 skipped, 1 failed/)
assert.match(storyBackfillSummary(stats), /1 conservative Echo fallback used/)
console.log('PASS Story backfill: terminal accounting, analyzer failure visibility, fallback Echo and proposal totals')
