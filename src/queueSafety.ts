import type { RouterJob, SlotRecord } from './contracts'

export const NATIVE_SETTINGS_SOFT_TTL_MS = 10 * 60_000
export const NATIVE_SETTINGS_HARD_TTL_MS = 24 * 60 * 60_000
export const AUTO_DISPATCH_STALE_MS = 10 * 60_000
export const AUTO_RESUME_MAX_JOBS = 12

export type DispatchLeaseStatus =
  | 'discovered'
  | 'awaiting-native-settings'
  | 'queued'
  | 'dispatched'
  | 'completed'
  | 'failed'
  | 'placement-repair-needed'
  | 'paused-backlog'
  | 'superseded'
  | 'cancelled'

export type DispatchLease = {
  dispatchKey: string
  attemptId: string
  status: DispatchLeaseStatus
  discoveredAt: number
  dispatchEligibleAt?: number
  queuedAt?: number
  dispatchedAt?: number
  completedAt?: number
  providerRequestId?: string
  settingsSource?: string
  settingsAgeMs?: number
  dispatchReason?: string
  cancellationEpoch?: number
}

export type NativeSettingsFreshness = {
  usable: boolean
  ageMs: number
  source: 'fresh' | 'last-known-stale-refresh-requested' | 'expired' | 'missing'
  requestRefresh: boolean
}

export type BacklogDecision = {
  pause: boolean
  uniqueJobs: number
  rawRecords: number
  duplicateRecordsCollapsed: number
  oldestPendingAgeMs: number
  reason: 'ready' | 'stale' | 'large'
}

export function canonicalDispatchKey(input: Pick<RouterJob, 'chatId' | 'messageId' | 'swipeId' | 'requestId'> & { slot: string }): string {
  return [input.chatId, input.messageId, input.swipeId, input.requestId, input.slot.trim().toLocaleLowerCase()].join(':')
}

export function dispatchKeysForJob(job: RouterJob): string[] {
  return [...new Set(job.slots.map(slot => canonicalDispatchKey({ ...job, slot })))]
}

export function requestJobFromRecords(records: SlotRecord[]): RouterJob | null {
  const ordered = [...records].sort((left, right) => left.slot.localeCompare(right.slot))
  const first = ordered[0]
  if (!first) return null
  return {
    chatId: first.chatId,
    messageId: first.messageId,
    swipeId: first.swipeId,
    requestId: first.requestId,
    target: first.target,
    intent: first.imageIntent,
    count: first.count,
    slots: ordered.map(record => record.slot),
    alt: first.alt,
    caption: first.caption,
    time: first.time,
    aspect: first.requestAspect,
    originalSceneBrief: first.originalSceneBrief,
    originalNegativePrompt: first.originalNegativePrompt,
    originalRequestXml: first.originalRequestXml,
    cast: first.cast,
    promptSource: first.promptSource,
    proseIllustrationId: first.proseIllustrationId,
    prosePlanId: first.prosePlanId,
    proseAnchor: first.proseAnchor,
    synthetic: first.proseSynthetic,
    proseImageAlignment: first.proseImageAlignment,
    proseImageSize: first.proseImageSize,
    composedPositivePrompt: first.composedPositivePrompt,
    composedNegativePrompt: first.composedNegativePrompt,
    prosePromptComposition: first.prosePromptComposition,
  }
}

export function groupRecordsIntoJobs(records: SlotRecord[]): RouterJob[] {
  const groups = new Map<string, SlotRecord[]>()
  for (const record of records) {
    const key = [record.chatId, record.messageId, record.swipeId, record.requestId].join(':')
    groups.set(key, [...(groups.get(key) || []), record])
  }
  return [...groups.values()].map(requestJobFromRecords).filter((job): job is RouterJob => Boolean(job))
}

export function classifyNativeSettings(capturedAt: number | undefined, now = Date.now()): NativeSettingsFreshness {
  if (!capturedAt || !Number.isFinite(capturedAt)) return { usable: false, ageMs: Number.POSITIVE_INFINITY, source: 'missing', requestRefresh: true }
  const ageMs = Math.max(0, now - capturedAt)
  if (ageMs <= NATIVE_SETTINGS_SOFT_TTL_MS) return { usable: true, ageMs, source: 'fresh', requestRefresh: false }
  if (ageMs <= NATIVE_SETTINGS_HARD_TTL_MS) return { usable: true, ageMs, source: 'last-known-stale-refresh-requested', requestRefresh: true }
  return { usable: false, ageMs, source: 'expired', requestRefresh: true }
}

export function classifyBacklog(records: SlotRecord[], now = Date.now()): BacklogDecision {
  const rawRecords = records.length
  const uniqueKeys = new Set(records.map(record => canonicalDispatchKey(record)))
  const oldestDiscoveredAt = records.reduce((oldest, record) => Math.min(oldest, record.discoveredAt || record.createdAt || now), now)
  const oldestPendingAgeMs = records.length ? Math.max(0, now - oldestDiscoveredAt) : 0
  const uniqueJobs = uniqueKeys.size
  const stale = oldestPendingAgeMs > AUTO_DISPATCH_STALE_MS
  const large = uniqueJobs > AUTO_RESUME_MAX_JOBS
  return {
    pause: stale || large,
    uniqueJobs,
    rawRecords,
    duplicateRecordsCollapsed: Math.max(0, rawRecords - uniqueJobs),
    oldestPendingAgeMs,
    reason: stale ? 'stale' : large ? 'large' : 'ready',
  }
}

export function throwIfAborted(signal?: AbortSignal): void {
  if (!signal?.aborted) return
  const error = new Error(typeof signal.reason === 'string' ? signal.reason : 'Relay attempt aborted by user.')
  error.name = 'AbortError'
  throw error
}

export async function raceWithAbort<T>(operation: Promise<T>, signal?: AbortSignal): Promise<T> {
  throwIfAborted(signal)
  if (!signal) return operation
  return await new Promise<T>((resolve, reject) => {
    const abort = () => {
      const error = new Error(typeof signal.reason === 'string' ? signal.reason : 'Relay attempt aborted by user.')
      error.name = 'AbortError'
      reject(error)
    }
    signal.addEventListener('abort', abort, { once: true })
    operation.then(
      value => { signal.removeEventListener('abort', abort); resolve(value) },
      error => { signal.removeEventListener('abort', abort); reject(error) },
    )
  })
}
