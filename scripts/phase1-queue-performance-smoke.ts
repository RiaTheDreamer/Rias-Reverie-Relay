// @ts-nocheck -- Deterministic Bun smoke harness; no host/provider calls.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { AUTO_RESUME_MAX_JOBS, NATIVE_SETTINGS_HARD_TTL_MS, NATIVE_SETTINGS_REFRESH_TIMEOUT_MS, NATIVE_SETTINGS_SOFT_TTL_MS, addNativeSettingsWaiters, canonicalDispatchKey, classifyBacklog, classifyNativeSettings, nativeSettingsWaiterCount, nativeSettingsWaiterCountsByChat, raceWithAbort, removeNativeSettingsWaiters } from '../src/queueSafety'
import { HOT_LOG_LIMIT, RECENT_COMPLETED_HOT_LIMIT, compactCompletedRecord, serializedBytes, stripCompletedRecord } from '../src/completedState'
import type { SlotRecord } from '../src/contracts'

const now = 2_000_000_000_000

function record(index: number, ageMinutes: number, duplicateOf?: number): SlotRecord {
  const identity = duplicateOf ?? index
  return {
    key: `fixture-chat:message-${Math.floor(identity / 8)}:0:request-${identity}:slot-${identity}`,
    chatId: 'fixture-chat', messageId: `message-${Math.floor(identity / 8)}`, swipeId: 0,
    requestId: `request-${String(identity).padStart(3, '0')}`, target: 'prose.illustration', targetApp: 'prose',
    slot: `slot-${String(identity).padStart(3, '0')}`, status: 'awaiting-native-settings',
    originalSceneBrief: `fixture scene ${identity}`, originalNegativePrompt: '',
    originalRequestXml: `<reverie-illustration slot="slot-${identity}">fixture</reverie-illustration>`,
    alt: `fixture ${identity}`, count: 1, createdAt: now - ageMinutes * 60_000,
    discoveredAt: now - ageMinutes * 60_000, updatedAt: now - ageMinutes * 60_000, history: [],
  }
}

assert.equal(classifyNativeSettings(now - NATIVE_SETTINGS_SOFT_TTL_MS, now).source, 'fresh')
assert.equal(classifyNativeSettings(now - NATIVE_SETTINGS_SOFT_TTL_MS - 1, now).source, 'last-known-stale-refresh-requested')
assert.equal(classifyNativeSettings(now - NATIVE_SETTINGS_HARD_TTL_MS - 1, now).usable, false)

const incident = [
  ...Array.from({ length: 88 }, (_, index) => record(index, 120 - Math.min(index, 87))),
  ...Array.from({ length: 40 }, (_, index) => record(88 + index, 120, index)),
]
const incidentDecision = classifyBacklog(incident, now)
assert.equal(incidentDecision.rawRecords, 128)
assert.equal(incidentDecision.uniqueJobs, 88)
assert.equal(incidentDecision.duplicateRecordsCollapsed, 40)
assert.equal(incidentDecision.pause, true)
assert.equal(incidentDecision.reason, 'stale')
assert.equal(new Set(incident.map(canonicalDispatchKey)).size, 88)

assert.equal(classifyBacklog(Array.from({ length: 5 }, (_, index) => record(index, 0)), now).pause, false)
assert.equal(classifyBacklog(Array.from({ length: AUTO_RESUME_MAX_JOBS + 1 }, (_, index) => record(index, 0)), now).reason, 'large')

// One user-level Native settings refresh may satisfy multiple chats, but the
// waiter registry must retain chat ownership until each chat is processed.
const settingsWaiters = new Map<string, Set<string>>()
addNativeSettingsWaiters(settingsWaiters, 'chat-a', ['a:1', 'a:2'])
addNativeSettingsWaiters(settingsWaiters, 'chat-b', ['b:1'])
assert.deepEqual(nativeSettingsWaiterCountsByChat(settingsWaiters), { 'chat-a': 2, 'chat-b': 1 })
assert.equal(nativeSettingsWaiterCount(settingsWaiters), 3)
removeNativeSettingsWaiters(settingsWaiters, 'chat-a', ['a:1', 'a:2'])
assert.deepEqual(nativeSettingsWaiterCountsByChat(settingsWaiters), { 'chat-b': 1 }, 'processing Chat A erased Chat B waiter ownership')
removeNativeSettingsWaiters(settingsWaiters, 'chat-b', ['b:1'])
assert.equal(nativeSettingsWaiterCount(settingsWaiters), 0)
assert.equal(NATIVE_SETTINGS_REFRESH_TIMEOUT_MS, 30_000)

const completed = Array.from({ length: 393 }, (_, index) => ({
  ...record(index, 0), status: 'completed' as const, imageId: `fixture-image-${index}`,
  imageUrl: `/api/v1/image-gen/results/fixture-image-${index}`, completedAt: 1_000_000_000 + index,
  diagnosticArchiveId: `archive-${index}`,
  promptPipeline: { excludedContinuityFacts: Array.from({ length: 385 }, (_, fact) => ({ factId: `fact-${fact}`, included: false, reason: 'historical' })) } as any,
  history: [{ imageId: `old-${index}`, imageUrl: `/old/${index}`, resolvedPositivePrompt: 'heavy'.repeat(500), resolvedNegativePrompt: '', promptMode: '', promptPresetId: null, generatedAt: now }],
}))
const oldBytes = serializedBytes(completed)
const hot = completed.sort((left, right) => right.completedAt - left.completedAt).slice(0, RECENT_COMPLETED_HOT_LIMIT).map(stripCompletedRecord)
const archive = completed.map(compactCompletedRecord)
const newBytes = serializedBytes({ stats: { completedTotal: completed.length }, hot, archive })
assert.equal(hot.length, 24)
assert.equal(archive.length, 393)
assert.equal(hot.every(item => !item.promptPipeline && item.history.length === 0), true)
assert.equal(hot.every(item => Boolean(item.diagnosticArchiveId)), true, 'compacted completed records must retain their archive-backed action key')
assert.equal(newBytes < oldBytes / 10, true)
assert.equal(HOT_LOG_LIMIT, 250)

const controller = new AbortController()
let resolveLate!: (value: string) => void
const late = new Promise<string>(resolve => { resolveLate = resolve })
const raced = raceWithAbort(late, controller.signal)
controller.abort('Abort All')
await assert.rejects(raced, /Abort All/)
resolveLate('must not resurrect')

const backend = readFileSync(new URL('../src/backend.ts', import.meta.url), 'utf8')
const frontend = readFileSync(new URL('../src/frontend.ts', import.meta.url), 'utf8')
assert.match(backend, /nativeSettingsBrokers/)
assert.match(backend, /broker\.refreshInFlight/)
assert.match(backend, /handleNativeSettingsRefreshTimeout/)
assert.match(backend, /for \(const \[chatId, registeredKeys\] of \[\.\.\.broker\.waiters\.entries\(\)\]\)/)
assert.doesNotMatch(backend, /broker\.waiters\.clear\(\)/)
assert.match(backend, /cancelRelayDispatchScope/)
assert.match(backend, /abortImageStreamsForChat\(payload\.chatId, userId\)/)
assert.match(backend, /inspectImageGenerationLaneDiagnostics/)
assert.match(backend, /providerLane:/)
assert.match(backend, /providerAttempts:/)
for (const field of ['providerDispatchCount', 'providerSpendStartedAt', 'providerTransport', 'providerStreamingUsed', 'providerFallbackUsed', 'providerDraining', 'destinationAvailable']) assert.match(backend, new RegExp(field))
assert.match(backend, /relayStreamingAllowedForProvider\(plan\.provider\)/)
assert.match(backend, /releaseAbortedImageGenerationLane/)
assert.doesNotMatch(backend, /image_stream_fallback/)
assert.match(backend, /waiterCountsByChat:/)
assert.match(backend, /activeRelayAttempts/)
assert.match(backend, /attemptSignal: options\.signal/)
assert.match(backend, /includeDataUrl: false/)
assert.match(backend, /records: Object\.values\(state\.slots\)\.filter\(record => record\.status !== 'completed'\)/)
assert.match(backend, /state\.logs\.length - HOT_LOG_LIMIT/)
assert.match(backend, /releaseDiscoveryLock\(\)[\s\S]{0,2500}dispatchRelayJob/)
assert.doesNotMatch(backend, /relayDispatchQueues|enqueuedRelayJobs/)
assert.match(frontend, /native_snapshot_requested[\s\S]{0,400}syncNativeSettings\(true\)/)
assert.doesNotMatch(frontend, /native_snapshot_requested[\s\S]{0,300}sendScanWithNativeSnapshot/)
assert.match(frontend, /Generate Pending/)
assert.match(frontend, /Export Queue Diagnostic/)

console.log(`Phase 1 queue/performance smoke passed: 88 unique + 40 duplicates paused, 393 lifetime completed -> ${hot.length} hot, payload ${oldBytes} -> ${newBytes} bytes, cancellation late result suppressed.`)
