import type { SlotRecord } from './contracts'

export const RECENT_COMPLETED_HOT_LIMIT = 24
export const COMPLETED_HISTORY_PAGE_SIZE = 24
export const HOT_LOG_LIMIT = 250

export type RelayChatStats = {
  discoveredTotal: number
  generatedTotal: number
  completedTotal: number
  failedTotal: number
  cancelledTotal: number
  completedByTarget: Record<string, number>
  updatedAt: number
}

export type CompactCompletedRecord = {
  key: string
  chatId: string
  messageId: string
  swipeId: number
  requestId: string
  slot: string
  target: string
  imageId?: string
  imageUrl?: string
  imageProvider?: string
  imageModel?: string
  highResMode?: boolean
  completedAt: number
  diagnosticArchiveId?: string
}

export type CompletedArchiveRecord = CompactCompletedRecord & {
  historyVersionIds?: string[]
  diagnosticArchivedAt?: number
}

export function emptyRelayChatStats(now = 0): RelayChatStats {
  return { discoveredTotal: 0, generatedTotal: 0, completedTotal: 0, failedTotal: 0, cancelledTotal: 0, completedByTarget: {}, updatedAt: now }
}

export function completedArchiveId(record: Pick<SlotRecord, 'key' | 'completedAt' | 'updatedAt'>): string {
  let hash = 2166136261
  const value = `${record.key}:${record.completedAt || record.updatedAt || 0}`
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return `completed-${(hash >>> 0).toString(16).padStart(8, '0')}`
}

export function compactCompletedRecord(record: SlotRecord): CompactCompletedRecord {
  return {
    key: record.key,
    chatId: record.chatId,
    messageId: record.messageId,
    swipeId: record.swipeId,
    requestId: record.requestId,
    slot: record.slot,
    target: record.target,
    imageId: record.imageId,
    imageUrl: record.imageUrl,
    imageProvider: record.imageProvider,
    imageModel: record.imageModel,
    highResMode: record.highResMode,
    completedAt: record.completedAt || record.updatedAt,
    diagnosticArchiveId: completedArchiveId(record),
  }
}

export function stripCompletedRecord(record: SlotRecord): SlotRecord {
  const compact = compactCompletedRecord(record)
  return {
    key: compact.key,
    chatId: compact.chatId,
    messageId: compact.messageId,
    swipeId: compact.swipeId,
    requestId: compact.requestId,
    target: record.target,
    imageIntent: record.imageIntent,
    targetApp: record.targetApp,
    slot: compact.slot,
    status: 'completed',
    originalSceneBrief: '',
    originalNegativePrompt: '',
    originalRequestXml: '',
    alt: record.alt,
    caption: record.caption,
    count: record.count,
    requestAspect: record.requestAspect,
    createdAt: record.createdAt,
    discoveredAt: record.discoveredAt,
    registeredAt: record.registeredAt,
    updatedAt: record.updatedAt,
    completedAt: compact.completedAt,
    imageId: compact.imageId,
    imageUrl: compact.imageUrl,
    imageProvider: compact.imageProvider,
    imageModel: compact.imageModel,
    highResMode: compact.highResMode,
    imageWidth: record.imageWidth,
    imageHeight: record.imageHeight,
    aspectRatio: record.aspectRatio,
    attemptNumber: record.attemptNumber,
    triggerType: record.triggerType,
    diagnosticArchiveId: compact.diagnosticArchiveId,
    proseIllustrationId: record.proseIllustrationId,
    prosePlanId: record.prosePlanId,
    proseAnchor: record.proseAnchor,
    proseSynthetic: record.proseSynthetic,
    proseImageAlignment: record.proseImageAlignment,
    proseImageSize: record.proseImageSize,
    imageAvailability: record.imageAvailability,
    imageAvailabilityCheckedAt: record.imageAvailabilityCheckedAt,
    galleryLinkStatus: record.galleryLinkStatus,
    galleryItemId: record.galleryItemId,
    galleryLinkedAt: record.galleryLinkedAt,
    history: [],
  }
}

export function serializedBytes(value: unknown): number {
  return new TextEncoder().encode(JSON.stringify(value)).byteLength
}
