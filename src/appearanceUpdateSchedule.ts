export const MAX_APPEARANCE_UPDATE_INTERVAL = 1000

/** Zero disables automatic refreshes after the mandatory initial setup. */
export function normalizeAppearanceUpdateInterval(value: unknown): number {
  if (value === null || value === undefined || value === '') return 1
  const parsed = Number(value)
  return Number.isFinite(parsed) ? Math.max(0, Math.min(MAX_APPEARANCE_UPDATE_INTERVAL, Math.trunc(parsed))) : 1
}

export function appearanceUpdateIsDue(interval: number, lastFullRefreshMessageId: string, messageId: string, storyMessageIds: string[]): boolean {
  if (!lastFullRefreshMessageId) return true
  if (interval === 0) return false
  // Keep the original per-turn/swipe/edit behavior for the default setting.
  if (interval === 1) return true
  const ids = [...new Set(storyMessageIds)]
  const baseline = ids.indexOf(lastFullRefreshMessageId)
  // A deleted/truncated baseline gets one refresh to establish a new anchor.
  if (baseline < 0) return true
  const current = ids.indexOf(messageId)
  return (current < 0 ? ids.length : current) - baseline >= interval
}
