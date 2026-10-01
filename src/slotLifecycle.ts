import type { SlotStatus } from './contracts'

export type SlotLifecycleSemantics = {
  generationActive: boolean
  placementActive: boolean
  terminal: boolean
  canAbort: boolean
  blocksRegeneration: boolean
}

const lifecycle = (
  generationActive: boolean,
  placementActive: boolean,
  terminal: boolean,
  canAbort = generationActive,
): SlotLifecycleSemantics => ({
  generationActive,
  placementActive,
  terminal,
  canAbort,
  blocksRegeneration: generationActive || placementActive,
})

export const SLOT_LIFECYCLE: Readonly<Record<SlotStatus, SlotLifecycleSemantics>> = {
  'recovered-pending': lifecycle(false, false, false),
  preparing: lifecycle(true, false, false),
  queued: lifecycle(true, false, false),
  'awaiting-native-settings': lifecycle(true, false, false),
  'paused-backlog': lifecycle(false, false, false, true),
  superseded: lifecycle(false, false, true),
  parsing: lifecycle(true, false, false),
  'provider-waiting': lifecycle(true, false, false),
  generating: lifecycle(true, false, false),
  previewing: lifecycle(true, false, false),
  'placement-pending': lifecycle(false, true, false, false),
  'placement-repair-needed': lifecycle(false, false, false),
  completed: lifecycle(false, false, true),
  'image-unavailable': lifecycle(false, false, true),
  failed: lifecycle(false, false, true),
  cancelled: lifecycle(false, false, true),
}

export function slotLifecycle(status: SlotStatus): SlotLifecycleSemantics {
  return SLOT_LIFECYCLE[status]
}

export function isGenerationActiveStatus(status: SlotStatus): boolean {
  return SLOT_LIFECYCLE[status].generationActive
}

export function isPlacementActiveStatus(status: SlotStatus): boolean {
  return SLOT_LIFECYCLE[status].placementActive
}

export function isSlotLifecycleActive(status: SlotStatus): boolean {
  const semantics = SLOT_LIFECYCLE[status]
  return semantics.generationActive || semantics.placementActive
}

export function canAbortSlotStatus(status: SlotStatus): boolean {
  return SLOT_LIFECYCLE[status].canAbort
}

export function isFailureRecoveryStatus(status: SlotStatus): boolean {
  return status === 'failed'
    || status === 'image-unavailable'
    || status === 'placement-repair-needed'
}

export type CurrentChatOverviewCounts = {
  processing: number
  readyToPlace: number
  failed: number
  completed: number
}

/** Mutually exclusive lifecycle counts for the active chat only. Lifetime
 * archive totals deliberately do not belong in this view. */
export function countCurrentChatOverview(
  records: ReadonlyArray<{ chatId: string; status: SlotStatus }>,
  activeChatId: string | null | undefined,
): CurrentChatOverviewCounts {
  const counts: CurrentChatOverviewCounts = { processing: 0, readyToPlace: 0, failed: 0, completed: 0 }
  if (!activeChatId) return counts
  for (const record of records) {
    if (record.chatId !== activeChatId) continue
    if (isGenerationActiveStatus(record.status)) counts.processing += 1
    else if (isPlacementActiveStatus(record.status)) counts.readyToPlace += 1
    else if (isFailureRecoveryStatus(record.status)) counts.failed += 1
    else if (record.status === 'completed') counts.completed += 1
  }
  return counts
}
