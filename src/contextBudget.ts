/** Full sources stay local. Only ranked, bounded excerpts cross the model seam. */
export type ContextTier = 'routine' | 'expanded' | 'diagnostic'
export type ContextMetrics = {
  tier: ContextTier; expansionReason: string; historyMessages: number; lorebookEntries: number; lorebookSegments: number
  characterChars: number; personaChars: number; appearanceMemoryChars: number; cacheHits: number; cacheMisses: number
}
export const CONTEXT_LIMITS = {
  routine: { source: 6000, lorebook: 9000, history: 4000, messages: 2, entries: 6, memory: 10000, scene: 20000 },
  expanded: { source: 14000, lorebook: 20000, history: 10000, messages: 6, entries: 12, memory: 20000, scene: 36000 },
  diagnostic: { source: 20000, lorebook: 30000, history: 18000, messages: 12, entries: 20, memory: 28000, scene: 48000 },
} as const
const visual = /\b(?:hair|eyes?|height|face|skin|build|appearance|body|wears?|wearing|outfit|clothes?|coat|dress|jacket|shirt|scar|tattoo|injur\w*|makeup|portrait|species|fur|horns?|wings?|prosthe\w*|mechanical|ears?|hands?|tail)\b/i
const stop = new Set('this that with from have were their there into about been would could some scene image request character persona'.split(' '))
const words = (text: string) => [...new Set((text.toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) || []).filter(word => !stop.has(word)))]
const record = (value: unknown): Record<string, any> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, any> : {}
const text = (value: unknown): string => typeof value === 'string' ? value : ''
const FIELDS = ['name', 'title', 'comment', 'description', 'personality', 'scenario', 'appearance', 'physical_description', 'creator_notes', 'content', 'text', 'card']
type SourceSnapshot = { fingerprint: string; fullText: string; excerpts: Map<string, string> }
const sourceCache = new Map<string, SourceSnapshot>()

export function sourceFingerprint(parts: string[]): string {
  let hash = 2166136261
  for (const part of parts) { for (let i = 0; i < part.length; i++) hash = Math.imul(hash ^ part.charCodeAt(i), 16777619); hash = Math.imul(hash ^ 0, 16777619) }
  return `${parts.reduce((sum, part) => sum + part.length, 0)}:${hash >>> 0}`
}
export function sourceText(value: unknown): string {
  if (typeof value === 'string') return value
  const raw = record(value)
  return [...FIELDS.map(key => text(raw[key])), ...FIELDS.map(key => text(record(raw.data)[key])), ...FIELDS.map(key => text(record(raw.card)[key]))].filter(Boolean).join('\n')
}
export function selectExcerpts(full: string, query: string, budget: number, requireRelevant = false): string {
  const terms = words(query).slice(0, 100)
  const segments = full.split(/\n+|(?<=[.!?])\s+/).flatMap(segment => {
    const chunks: string[] = []
    for (let at = 0; at < segment.length; at += 700) chunks.push(segment.slice(at, at + 700))
    return chunks
  }).map(value => value.trim()).filter(Boolean)
  const ranked = [...new Set(segments)].map((value, index) => ({ value, index, score: terms.reduce((sum, term) => sum + (value.toLowerCase().includes(term) ? 3 : 0), 0) + (visual.test(value) ? 12 : 0) }))
    .filter(item => !requireRelevant || item.score > 0).sort((a, b) => b.score - a.score || a.index - b.index)
  const chosen: typeof ranked = []; let length = 0
  for (const item of ranked) { if (length + item.value.length + 1 > budget) continue; chosen.push(item); length += item.value.length + 1; if (length >= budget - 80) break }
  return chosen.sort((a, b) => a.index - b.index).map(item => item.value).join('\n')
}
export function visualSourceSnapshot(key: string, value: unknown, query = '', tier: ContextTier = 'routine', invalidate = false): { text: string; fingerprint: string; cacheHit: boolean } {
  // Fingerprint only usable source fields, never JSON-stringify a host graph.
  const full = sourceText(value); const fingerprint = sourceFingerprint([full])
  const prior = sourceCache.get(key); const cacheHit = !invalidate && prior?.fingerprint === fingerprint
  const snapshot: SourceSnapshot = cacheHit ? prior! : { fingerprint, fullText: full, excerpts: new Map() }
  const selectionKey = `${tier}:${sourceFingerprint([query])}`
  if (!snapshot.excerpts.has(selectionKey)) snapshot.excerpts.set(selectionKey, selectExcerpts(snapshot.fullText, query, CONTEXT_LIMITS[tier].source, tier === 'routine'))
  while (snapshot.excerpts.size > 16) snapshot.excerpts.delete(snapshot.excerpts.keys().next().value!)
  sourceCache.delete(key); sourceCache.set(key, snapshot)
  while (sourceCache.size > 64) sourceCache.delete(sourceCache.keys().next().value!)
  return { text: snapshot.excerpts.get(selectionKey)!, fingerprint, cacheHit: Boolean(cacheHit) }
}
export function invalidateContextSnapshots(): void { sourceCache.clear() }

export function selectLorebookContext(entries: unknown, query: string, tier: ContextTier = 'routine'): { text: string; entries: number; segments: number; cacheHits: number; cacheMisses: number } {
  const rows = Array.isArray(entries) ? entries : typeof entries === 'string' ? [{ content: entries }] : []
  const terms = words(query)
  const ranked = rows.map((value, index) => {
    const row = record(value); const title = text(row.name || row.title || row.comment)
    const keys = Array.isArray(row.keys || row.key) ? (row.keys || row.key).filter((key: unknown) => typeof key === 'string') : []
    const full = sourceText(value); const lower = full.toLowerCase()
    const direct = [title, ...keys].some(key => key.length > 2 && query.toLowerCase().includes(key.toLowerCase()))
    return { row, title, index, score: (direct ? 80 : 0) + terms.reduce((sum, term) => sum + (lower.includes(term) ? 2 : 0), 0) + (visual.test(full) ? 12 : 0) }
  }).filter(row => row.score > 0).sort((a, b) => b.score - a.score || a.index - b.index)
  const chosen: string[] = []; let length = 0; let segments = 0; let cacheHits = 0; let cacheMisses = 0
  for (const item of ranked.slice(0, CONTEXT_LIMITS[tier].entries)) {
    const snapshot = visualSourceSnapshot(`lore:${item.row.id || item.title || item.index}`, item.row, query, tier)
    snapshot.cacheHit ? cacheHits++ : cacheMisses++
    const excerpt = selectExcerpts(snapshot.text, query, Math.min(2200, CONTEXT_LIMITS[tier].lorebook - length - 120), true)
    if (!excerpt) continue
    const row = `[Activated lorebook: ${item.title || item.row.id || 'entry'}]\n${excerpt}`
    if (length + row.length > CONTEXT_LIMITS[tier].lorebook) continue
    chosen.push(row); length += row.length + 2; segments += excerpt.split('\n').length
  }
  return { text: chosen.join('\n\n'), entries: chosen.length, segments, cacheHits, cacheMisses }
}

export function selectHistoryContext(history: unknown, query: string, tier: ContextTier = 'routine'): Array<{ id: string; role: string; content: string }> {
  const rows = Array.isArray(history) ? history : []
  const terms = words(query)
  const ranked = rows.map((value, index) => {
    const row = record(value); const content = text(row.content)
    return { id: text(row.id), role: text(row.role), content, index, score: terms.reduce((sum, term) => sum + (content.toLowerCase().includes(term) ? 2 : 0), 0) + (visual.test(content) ? 4 : 0) + index / Math.max(1, rows.length) }
  }).filter(row => row.content && row.content !== query && row.score >= 2).sort((a, b) => b.score - a.score || b.index - a.index).slice(0, CONTEXT_LIMITS[tier].messages)
  return ranked.sort((a, b) => a.index - b.index).map(row => ({ id: row.id, role: row.role, content: selectExcerpts(row.content, query, Math.floor(CONTEXT_LIMITS[tier].history / Math.max(1, ranked.length)), true) }))
}

export function measureModelMessages(workflow: string, messages: Array<{ role: string; content: string }>, metrics?: Partial<ContextMetrics>) {
  const systemChars = messages.filter(row => row.role === 'system').reduce((sum, row) => sum + row.content.length, 0)
  const userChars = messages.filter(row => row.role !== 'system').reduce((sum, row) => sum + row.content.length, 0)
  const chars = systemChars + userChars
  return { workflow, chars, bytes: new TextEncoder().encode(messages.map(row => row.content).join('')).length, estimatedInputTokens: Math.ceil(chars / 4), tokenEstimateMethod: 'characters / 4; heuristic, not provider usage', systemChars, userChars, messages: messages.length, historyMessages: 0, lorebookEntries: 0, lorebookSegments: 0, characterChars: 0, personaChars: 0, appearanceMemoryChars: 0, cacheHits: 0, cacheMisses: 0, tier: 'routine', expansionReason: '', ...metrics }
}
export function assertModelContextBudget(measurement: ReturnType<typeof measureModelMessages>): void {
  if (measurement.estimatedInputTokens > 64000 && (!measurement.expansionReason || measurement.tier === 'routine')) throw new Error('Relay context exceeds 64k estimated input tokens. Use an explicit bounded diagnostic/reconcile request or shorten the custom prompt.')
}
