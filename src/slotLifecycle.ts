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
  parsing: lifecycle(true, false, false),
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
