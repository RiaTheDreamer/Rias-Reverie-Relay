/** Optional render-only avatar complements; never an Appearance ingestion source. */
export type PortraitTraits = { hair: string[]; eyes: string[]; marks: string[] }
export type PortraitImage = { data: string; mime: string }
export const PORTRAIT_INSIGHT_GUIDANCE = `Inspect only the supplied adult character avatar. Return JSON {"hair":[],"eyes":[],"marks":[]} with short visible stable visual descriptors only. Fill missing traits only. Do not infer age, ethnicity, gender, personality, anatomy hidden by clothing, pose, mood, expression, lighting, background, style or outfit. No instructions or commentary. Unknown/occluded fields are empty arrays. Supplied card/current appearance is authoritative and must never be contradicted.`
const key = (v: string) => v.replace(/_/g, ' ').trim().toLocaleLowerCase()
export function normalizePortraitTraits(raw: unknown): PortraitTraits {
  const out: PortraitTraits = { hair: [], eyes: [], marks: [] }
  if (!raw || typeof raw !== 'object') return out
  for (const field of ['hair', 'eyes', 'marks'] as const) {
    const value = (raw as Record<string, unknown>)[field]
    out[field] = (Array.isArray(value) ? value : []).filter((v): v is string => typeof v === 'string')
      .map(v => v.trim()).filter(v => v.length > 2 && v.length <= 90 && !/[<>\n{}]/.test(v)
        && !/\b(?:ignore|instruction|prompt|system|unknown|unseen|wearing|shirt|dress|coat|nude|young|old|adult|child|asian|european|happy|smiling|standing|sitting|lighting|background)\b/i.test(v)
        && (field === 'hair' ? /hair|bald|buzzcut|braid|ponytail|dreadlock|curl|fringe|bangs/i.test(v) : field === 'eyes' ? /eyes?|iris|irises|heterochromia/i.test(v) : /scar|freckle|tattoo|birthmark|mole|marking/i.test(v))).slice(0, 4)
  }
  return out
}
export function missingPortraitTraits(traits: PortraitTraits, established: string[], excluded: string[] = []): string[] {
  // A manually cleared sheet is a deliberate choice. Conservatively suppress
  // all avatar suggestions for that owner rather than relearn a paraphrase.
  if (excluded.length) return []
  const known = key(established.join(', '))
  return [
    ...(/\bhair\b|bald|buzzcut|ponytail|braid/.test(known) ? [] : traits.hair),
    ...(/\beyes?\b|heterochromia/.test(known) ? [] : traits.eyes),
    ...(/scar|freckle|tattoo|birthmark|marking/.test(known) ? [] : traits.marks),
  ].filter(v => !known.includes(key(v)))
}
export function safePortraitImage(value: unknown): PortraitImage | null {
  if (!value || typeof value !== 'object') return null
  const image = value as PortraitImage
  const shape = ['image/png','image/jpeg','image/webp'].includes(image.mime) && typeof image.data === 'string'
    && image.data.length > 8 && image.data.length <= 6_000_000 && /^[a-zA-Z0-9+/]+={0,2}$/.test(image.data)
  if (!shape) return null
  try {
    const bytes = atob(image.data.slice(0, 24))
    const magic = image.mime === 'image/png' ? bytes.startsWith('\x89PNG\r\n\x1a\n') : image.mime === 'image/jpeg' ? bytes.startsWith('\xff\xd8\xff') : bytes.startsWith('RIFF') && bytes.slice(8, 12) === 'WEBP'
    return magic ? image : null
  } catch { return null }
}

export type PortraitTicket = { userId?: string; imageId: string; chatId: string; resolve: (value: PortraitImage | null) => void }
/** Nonces are issued by the worker and scoped to user, chat and exact avatar. */
export function acceptPortraitReply(tickets: Map<string, PortraitTicket>, payload: { ticket: string; chatId: string; imageId: string; image?: unknown }, userId?: string): boolean {
  const pending = tickets.get(payload.ticket)
  if (!pending || pending.userId !== userId || pending.chatId !== payload.chatId || pending.imageId !== payload.imageId) return false
  const image = safePortraitImage(payload.image)
  if (!image) return false // another connected client may still supply the avatar
  tickets.delete(payload.ticket); pending.resolve(image); return true
}
