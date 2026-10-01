export type BoundedCacheOptions<V> = {
  maxEntries: number
  ttlMs?: number
  maxBytes?: number
  sizeOf?: (value: V, key: string) => number
}

type CacheEntry<V> = {
  value: V
  createdAt: number
  touchedAt: number
  bytes: number
}

export class BoundedLruCache<V> {
  private readonly entries = new Map<string, CacheEntry<V>>()
  private totalBytes = 0

  constructor(private readonly options: BoundedCacheOptions<V>) {
    if (!Number.isInteger(options.maxEntries) || options.maxEntries < 1) throw new Error('maxEntries must be a positive integer')
  }

  get size(): number { this.pruneExpired(); return this.entries.size }
  get byteSize(): number { this.pruneExpired(); return this.totalBytes }

  has(key: string): boolean { return this.get(key) !== undefined }

  get(key: string): V | undefined {
    const entry = this.entries.get(key)
    if (!entry) return undefined
    if (this.isExpired(entry)) { this.remove(key, entry); return undefined }
    entry.touchedAt = Date.now()
    this.entries.delete(key)
    this.entries.set(key, entry)
    return entry.value
  }

  set(key: string, value: V): this {
    const now = Date.now()
    const previous = this.entries.get(key)
    if (previous) this.remove(key, previous)
    const bytes = Math.max(0, Math.floor(this.options.sizeOf?.(value, key) ?? 0))
    this.entries.set(key, { value, createdAt: now, touchedAt: now, bytes })
    this.totalBytes += bytes
    this.prune(now)
    return this
  }

  delete(key: string): boolean {
    const entry = this.entries.get(key)
    if (!entry) return false
    this.remove(key, entry)
    return true
  }

  clear(): void { this.entries.clear(); this.totalBytes = 0 }

  keys(): IterableIterator<string> { this.pruneExpired(); return this.entries.keys() }

  deleteWhere(predicate: (key: string, value: V) => boolean): number {
    let removed = 0
    for (const [key, entry] of [...this.entries]) {
      if (!predicate(key, entry.value)) continue
      this.remove(key, entry)
      removed += 1
    }
    return removed
  }

  private isExpired(entry: CacheEntry<V>, now = Date.now()): boolean {
    return Boolean(this.options.ttlMs && now - entry.createdAt > this.options.ttlMs)
  }

  private pruneExpired(now = Date.now()): void {
    if (!this.options.ttlMs) return
    for (const [key, entry] of [...this.entries]) if (this.isExpired(entry, now)) this.remove(key, entry)
  }

  private prune(now = Date.now()): void {
    this.pruneExpired(now)
    while (this.entries.size > this.options.maxEntries || (this.options.maxBytes !== undefined && this.totalBytes > this.options.maxBytes)) {
      const oldest = this.entries.entries().next().value as [string, CacheEntry<V>] | undefined
      if (!oldest) break
      this.remove(oldest[0], oldest[1])
    }
  }

  private remove(key: string, entry: CacheEntry<V>): void {
    if (!this.entries.delete(key)) return
    this.totalBytes = Math.max(0, this.totalBytes - entry.bytes)
  }
}
