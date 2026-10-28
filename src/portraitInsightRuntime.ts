import type { SpindleAPI } from 'lumiverse-spindle-types'
import { acceptPortraitReply, normalizePortraitTraits, safePortraitImage, PORTRAIT_INSIGHT_GUIDANCE, type PortraitTraits, type PortraitTicket, type PortraitImage } from './portraitInsight'

type CacheRow = { key: string; traits: PortraitTraits; updatedAt: number; error?: string }
export function createPortraitInsight(api: SpindleAPI) {
  const tickets = new Map<string, PortraitTicket>(), cache = new Map<string, CacheRow>(), pending = new Map<string, Promise<CacheRow>>()
  const scope = (userId: string | undefined, cardId: string) => JSON.stringify([userId || '', cardId])
  const path = (cardId: string) => `portrait-insight-${encodeURIComponent(cardId)}.json`
  const stored = async (cardId: string, userId?: string): Promise<CacheRow | undefined> => {
    const s = scope(userId, cardId)
    if (cache.has(s)) return cache.get(s)
    const row = await api.userStorage.getJson<CacheRow | null>(path(cardId), { fallback: null, userId }).catch(() => null)
    if (row?.key && row.traits) { cache.set(s, row); return row }
  }
  return {
    reply(payload: { ticket: string; chatId: string; imageId: string; image?: unknown }, userId?: string) { return acceptPortraitReply(tickets, payload, userId) },
    async cached(cardId: string, userId?: string) { return (await stored(cardId, userId))?.traits },
    async prepare(input: { chatId: string; cardId: string; connectionId: string; model: string; established: string; assertCurrent: () => void; userId?: string }): Promise<CacheRow> {
      const card = await api.characters.get(input.cardId, input.userId)
      const imageId = card?.image_id
      const empty: CacheRow = { key: '', traits: { hair: [], eyes: [], marks: [] }, updatedAt: Date.now() }
      if (!card || !imageId) return empty
      const connection = await api.connections.get(input.connectionId, input.userId)
      if (!connection) return empty
      const metadata = connection as unknown as Record<string, unknown>
      if (metadata.supportsVision === false || metadata.vision === false) return empty
      const fingerprint = JSON.stringify(['portrait-insight-v3', input.cardId, imageId, input.connectionId, input.model || connection.model, input.established])
      const previous = await stored(input.cardId, input.userId)
      if (previous?.key === fingerprint && (!previous.error || Date.now() - previous.updatedAt < 600_000)) return previous
      const pendingKey = JSON.stringify([input.userId || '', fingerprint])
      const existing = pending.get(pendingKey)
      if (existing) return existing
      const work = (async () => {
        let row: CacheRow = { ...empty, key: fingerprint }
        try {
          input.assertCurrent()
          const image = await api.images.get(imageId, { specificity: 'lg', userId: input.userId })
          if (!image) return row
          // Newer hosts expose authenticated image bytes directly. Feature
          // detect it because older supported SDK declarations lack this API.
          const nativeImages = api.images as typeof api.images & { readBinary?: (id: string, userId?: string) => Promise<Uint8Array> }
          let avatar: PortraitImage | null
          if (typeof nativeImages.readBinary === 'function') {
            let timer: ReturnType<typeof setTimeout> | undefined
            const bytes = await Promise.race([
              nativeImages.readBinary(imageId, input.userId),
              new Promise<never>((_, reject) => { timer = setTimeout(() => reject(Error('Avatar read timed out')), 4500) }),
            ]).finally(() => { if (timer) clearTimeout(timer) })
            input.assertCurrent()
            if (!(bytes instanceof Uint8Array) || bytes.byteLength > 4_500_000) throw Error('Avatar bytes exceed the supported image bound')
            let binary = ''
            for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192))
            avatar = safePortraitImage({ data: btoa(binary), mime: image.mime_type })
          } else avatar = await new Promise<PortraitImage | null>(resolve => {
            const ticket = crypto.randomUUID()
            const timer = setTimeout(() => { tickets.delete(ticket); resolve(null) }, 4500)
            tickets.set(ticket, { userId: input.userId, imageId, chatId: input.chatId, resolve: value => { clearTimeout(timer); resolve(value) } })
            api.sendToFrontend({ type: 'portrait_insight_avatar', ticket, chatId: input.chatId, imageId, url: image.url }, input.userId)
          })
          input.assertCurrent()
          if (!avatar) throw Error('Avatar bytes unavailable from the active client; continuing without Portrait Insight.')
          const controller = new AbortController()
          const deadline = setTimeout(() => controller.abort(), 30_000)
          const cancellation = setInterval(() => { try { input.assertCurrent() } catch { controller.abort() } }, 250)
          // Host raw generation consumes these top-level fields even though
          // older SDK DTOs omit them from their request declarations.
          const request: Parameters<typeof api.generate.raw>[0] & { provider: string; model: string } = { type: 'raw', connection_id: input.connectionId, provider: connection.provider, model: input.model || connection.model,
            messages: [{ role: 'system', content: PORTRAIT_INSIGHT_GUIDANCE }, { role: 'user', content: [
              { type: 'text', text: `Authoritative existing appearance (do not contradict): ${input.established.slice(0, 5000)}` },
              { type: 'image', data: avatar.data, mime_type: avatar.mime },
            ] }], parameters: { max_tokens: 700 }, reasoning: { source: 'off' }, signal: controller.signal, userId: input.userId }
          const result = await api.generate.raw(request).finally(() => { clearTimeout(deadline); clearInterval(cancellation) })
          input.assertCurrent()
          const response = result as { content?: unknown }
          const content = typeof response?.content === 'string' ? response.content : ''
          row.traits = normalizePortraitTraits(JSON.parse(content.replace(/^\s*```(?:json)?\s*|\s*```\s*$/g, '')))
        } catch (error) {
          input.assertCurrent() // cancellation must not be converted to a cached success/fallback
          row.error = error instanceof Error ? error.message.slice(0, 240) : 'Portrait Insight unavailable'
        }
        input.assertCurrent()
        await api.userStorage.setJson(path(input.cardId), row, { userId: input.userId })
        cache.set(scope(input.userId, input.cardId), row)
        return row
      })()
      pending.set(pendingKey, work)
      try { return await work } finally { pending.delete(pendingKey) }
    },
  }
}
