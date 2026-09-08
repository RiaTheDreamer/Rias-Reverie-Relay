import { normalizeSurfaceDocument } from './surfaceXml'

/**
 * Correction 5B reliability primitives.  These are deliberately framework-free
 * so the host-facing code and the local mock gate share the same decisions.
 */

export const C5B_CACHE_LIMITS = {
  messageSnapshots: 512,
  abortableOperations: 1_024,
  activeSwipes: 512,
  galleryLinks: 256,
  galleryLinkMaxAgeMs: 30 * 24 * 60 * 60 * 1_000,
} as const

export function rememberBoundedMap<T>(map: Map<string, T>, key: string, value: T, limit: number): void {
  // Map insertion order gives us a small deterministic LRU without another
  // dependency. Re-inserting a key also counts as a touch.
  map.delete(key)
  map.set(key, value)
  while (map.size > limit) {
    const oldest = map.keys().next().value
    if (oldest === undefined) break
    map.delete(oldest)
  }
}

export type GalleryLinkCacheEntry = { galleryItemId: string; savedAt: number }

export function normalizeGalleryLinkCache(raw: unknown, now = Date.now()): Record<string, GalleryLinkCacheEntry> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const kept: Array<[string, GalleryLinkCacheEntry]> = []
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const legacyId = typeof value === 'string' ? value.trim() : ''
    const record = value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
    const galleryItemId = legacyId || (typeof record.galleryItemId === 'string' ? record.galleryItemId.trim() : '')
    const savedAt = typeof record.savedAt === 'number' && Number.isFinite(record.savedAt) ? record.savedAt : now
    if (key && galleryItemId && now - savedAt <= C5B_CACHE_LIMITS.galleryLinkMaxAgeMs) kept.push([key, { galleryItemId, savedAt }])
  }
  return Object.fromEntries(kept.slice(-C5B_CACHE_LIMITS.galleryLinks))
}

export type RelayHealthCheck = {
  id: string
  name: string
  class: 'core' | 'optional'
  result: 'pass' | 'warn' | 'fail'
  detail: string
}

export function healthCheck(id: string, name: string, className: RelayHealthCheck['class'], ok: boolean, detail: string, failure: 'warn' | 'fail' = className === 'core' ? 'fail' : 'warn'): RelayHealthCheck {
  return { id, name, class: className, result: ok ? 'pass' : failure, detail }
}

export function summarizeRelayHealth(checks: RelayHealthCheck[]): 'pass' | 'warn' | 'fail' {
  if (checks.some(check => check.class === 'core' && check.result === 'fail')) return 'fail'
  return checks.some(check => check.result === 'warn' || check.result === 'fail') ? 'warn' : 'pass'
}

/**
 * The normalizer deliberately consumes the shipped definition inventory instead
 * of maintaining another list of Surface grammar.  The optional fields mirror
 * the existing shipped definitions and let callers pass the definitions
 * directly without duplicating their contract data.
 */
export type SurfaceNormalizationSpec = {
  id: string
  wrapper: string
  sampleXml?: string
  rootAttributes?: string[]
  requiredMediaCount?: number
  maximumMediaCount?: number
  normalization?: {
    rootAliases?: string[]
    attributeAliases?: Record<string, string>
    allowedChildren?: string[]
    childAliases?: Record<string, string>
    canonicalChildOrder?: string[]
    uniqueParents?: Record<string, string>
    optionalMeta?: string[]
  }
}
export type SurfaceNormalizationResult = { markup: string; changed: boolean; diagnostics: string[]; driftDiagnostics?: string[] }

function wrapperAliases(wrapper: string): string[] {
  return [...new Set([
    wrapper.replace(/_/g, '-'),
    wrapper.replace(/_/g, ''),
    wrapper === 'smart_phone' ? 'phone' : '',
    wrapper === 'smart_phone' ? 'smartphone' : '',
  ].filter(alias => alias && alias !== wrapper))]
}

/** Back-end queue actions and the UI must ask this one question, not infer it
 * from a broad "processing" flag (which also includes placement repair). */
export function abortableSlotKeys<T extends { key: string; status: string }>(records: T[], canAbort: (status: T['status']) => boolean): string[] {
  return records.filter(record => canAbort(record.status)).map(record => record.key)
}

export function normalizeShippedSurfaceMarkup(markup: string, specs: SurfaceNormalizationSpec[]): SurfaceNormalizationResult {
  return normalizeSurfaceDocument(String(markup || ''), specs)
}
