// @ts-nocheck -- Regression contracts for 0.2.7.5 live failures.
import { readFileSync } from 'node:fs'
import { inspectProseIllustrationSchemas, normalizeProseIllustrationCast, normalizeProseIllustrationContracts, parseImageRequests, placementFailureCanReplaceRecord, renderResolvedMarkup, selectRescanSwipeRows } from '../src/contracts'

function assert(value: unknown, reason: string): asserts value { if (!value) throw new Error(reason) }

const illustration = (cast?: string) => `<reverie-illustration request="generate" slot="scene-one" aspect="4:3"${cast === undefined ? '' : ` cast="${cast}"`}><visual_prompt>A moonlit lake.</visual_prompt></reverie-illustration>`
for (const cast of ['char', 'user', 'char+user', 'none']) assert(inspectProseIllustrationSchemas(illustration(cast)).length === 0, `${cast}: canonical cast must validate`)
for (const [alias, canonical] of [['character', 'char'], ['char_user', 'char+user'], ['char-user', 'char+user'], ['user+char', 'char+user'], ['both', 'char+user'], ['', 'none'], ['null', 'none']] as const) {
  assert(normalizeProseIllustrationCast(alias) === canonical, `${alias}: alias normalization failed`)
  const normalized = normalizeProseIllustrationContracts(illustration(alias)).markup
  assert(normalized.includes(`cast="${canonical}"`) && inspectProseIllustrationSchemas(normalized).length === 0, `${alias}: normalized markup must validate`)
}
const absent = normalizeProseIllustrationContracts(illustration()).markup
assert(absent.includes('cast="none"') && inspectProseIllustrationSchemas(absent).length === 0 && parseImageRequests(absent)[0]?.cast === 'none', 'absent optional cast must default to none without poisoning a valid request')
assert(normalizeProseIllustrationCast('dragon-party') === null && inspectProseIllustrationSchemas(normalizeProseIllustrationContracts(illustration('dragon-party')).markup).length === 1, 'genuinely invalid cast must fail deterministically')

const job = { chatId: 'chat', messageId: 'message', swipeId: 0, requestId: 'req', target: 'custom.artifact-media', count: 1, slots: ['slot'], alt: '', originalSceneBrief: '', originalNegativePrompt: '', originalRequestXml: '' }
const result = { slot: 'slot', imageId: 'image-2', imageUrl: '/images/current.png', attemptNumber: 2 }
const healthyContent = renderResolvedMarkup(job as any, [result] as any)
assert(healthyContent.includes('/images/current.png') && healthyContent.includes('reverie-relay:image'), 'successful rendered image must retain its exact owned marker and media')
assert(!placementFailureCanReplaceRecord({ status: 'completed', attemptNumber: 2, imageUrl: '/images/current.png' } as any, { attemptNumber: 1, imageUrl: '/images/old.png' } as any), 'stale older placement failure must not overwrite current success')
assert(placementFailureCanReplaceRecord({ status: 'completed', attemptNumber: 2, imageUrl: '/images/current.png' } as any, result as any), 'current-attempt missing placement must still be allowed to enter Repair Needed')

const rows = selectRescanSwipeRows({ content: healthyContent, swipe_id: 0, swipes: ['stale pre-placement source'] }, false)
assert(rows[0]?.content === healthyContent, 'rescan/reparse must inspect canonical active content, not stale swipes[]')

const backendSource = readFileSync(new URL('../src/backend.ts', import.meta.url), 'utf8')
assert(backendSource.includes('getAuthoritativeSwipeContent(verifiedMessage, batch.swipeId)') && backendSource.includes('const placementVerified = batch.entries.every'), 'atomic placement verification must accept valid canonical rendered output')
assert(backendSource.includes("await storePendingPlacement(job, results, 'No deterministic request, error, or resolved slot anchor was found.'"), 'truly missing rendered media must still enter Repair Needed')
assert(backendSource.includes('record.attemptNumber !== expectedAttemptNumbers[slot]') && backendSource.includes('isJobCancelled(job) || !failureApplied'), 'stale generic failure state/toast protection is missing')
assert(backendSource.includes("eventType: 'invalid_prose_illustration_schema'") && !backendSource.includes('invalidProseSchemaNotices'), 'malformed Prose schema must remain lane-scoped diagnostic evidence instead of becoming a generic toast')

console.log('live regressions smoke passed: canonical render health wins over stale snapshots/failures, real missing media remains repairable, cast aliases/default normalize, and invalid casts stay lane-scoped without toast spam.')
