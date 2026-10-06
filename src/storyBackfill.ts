export type StoryAnalysisOutcome = {
  status: 'analyzed' | 'skipped' | 'failed'
  reason?: string
  rawCandidates?: number
  normalizedCandidates?: number
  rejectedCandidates?: number
  proposals?: number
  reconciled?: number
  phoneEntries?: number
  fallbackEchoes?: number
  rejectionReasons?: Record<string, number>
  rejectionExamples?: Array<{ reason: string; anchor: string }>
}

export type StoryBackfillStats = {
  scanned: number
  eligible: number
  completed: number
  analyzed: number
  skipped: number
  failed: number
  rawCandidates: number
  normalizedCandidates: number
  rejectedCandidates: number
  proposals: number
  reconciled: number
  phoneEntries: number
  fallbackEchoes: number
  reasons: Record<string, number>
}

export function emptyStoryBackfillStats(): StoryBackfillStats {
  return { scanned: 0, eligible: 0, completed: 0, analyzed: 0, skipped: 0, failed: 0, rawCandidates: 0, normalizedCandidates: 0, rejectedCandidates: 0, proposals: 0, reconciled: 0, phoneEntries: 0, fallbackEchoes: 0, reasons: {} }
}

export function recordStoryBackfillOutcome(stats: StoryBackfillStats, outcome: StoryAnalysisOutcome): void {
  stats.completed += 1
  stats[outcome.status] += 1
  stats.rawCandidates += outcome.rawCandidates || 0
  stats.normalizedCandidates += outcome.normalizedCandidates || 0
  stats.rejectedCandidates += outcome.rejectedCandidates || 0
  stats.proposals += outcome.proposals || 0
  stats.reconciled += outcome.reconciled || 0
  stats.phoneEntries += outcome.phoneEntries || 0
  stats.fallbackEchoes += outcome.fallbackEchoes || 0
  if (outcome.reason) stats.reasons[outcome.reason] = (stats.reasons[outcome.reason] || 0) + 1
  for (const [reason, count] of Object.entries(outcome.rejectionReasons || {})) {
    stats.reasons[reason] = (stats.reasons[reason] || 0) + count
  }
}

export function storyBackfillSummary(stats: StoryBackfillStats): string {
  const core = `${stats.analyzed} analyzed, ${stats.skipped} skipped, ${stats.failed} failed; ${stats.rawCandidates} raw candidates, ${stats.normalizedCandidates} candidates, ${stats.rejectedCandidates} rejected, ${stats.proposals} proposals, ${stats.phoneEntries} phone records.${stats.fallbackEchoes ? ` ${stats.fallbackEchoes} conservative Echo fallback${stats.fallbackEchoes === 1 ? '' : 's'} used.` : ''}`
  const reasons = Object.entries(stats.reasons).sort((left, right) => right[1] - left[1]).slice(0, 4).map(([reason, count]) => `${reason} ${count}`).join(', ')
  return reasons ? `${core} Reasons: ${reasons}.` : core
}
