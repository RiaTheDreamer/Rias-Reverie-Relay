import { bracketImageControls } from './imageControlMarkup'

/** One active generation, offset-reconciled and capped. No DOM polling and no
 * provider dispatch until a complete, structurally valid root is received. */
export class BracketIllustrationStream {
  private generation: { generationId: string; chatId: string; messageId: string; swipeId: number } | null = null
  private buffer = ''
  private emitted = new Set<string>()
  start(generationId: string, chatId: string, messageId: string, swipeId = 0): void {
    this.clear()
    if (generationId && chatId && messageId) this.generation = { generationId, chatId, messageId, swipeId }
  }
  clear(): void { this.generation = null; this.buffer = ''; this.emitted.clear() }
  push(payload: { generationId?: string; chatId?: string; token?: string; type?: string; offset?: number }): Array<{ chatId: string; messageId: string; swipeId: number; fullMatch: string; content: string; attrs: Record<string, string>; sourceContent: string }> {
    const generation = this.generation
    if (!generation || payload.generationId !== generation.generationId || payload.chatId !== generation.chatId || payload.type === 'reasoning' || typeof payload.token !== 'string') return []
    const offset = Number(payload.offset)
    // Missing offset cannot safely distinguish a retry from a new segment.
    if (!Number.isInteger(offset) || offset < 0 || offset > this.buffer.length) { this.clear(); return [] }
    const overlap = this.buffer.length - offset
    if (payload.token.slice(0, overlap) !== this.buffer.slice(offset, offset + Math.min(overlap, payload.token.length))) { this.clear(); return [] }
    this.buffer += payload.token.slice(overlap)
    if (this.buffer.length > 128_000) { this.clear(); return [] }
    const requests = []
    for (const control of bracketImageControls(this.buffer)) {
      if (control.root !== 'reverie_illustration' || !control.complete || control.diagnostics.length) continue
      const key = `${control.index}:${control.fields.slot}`
      if (this.emitted.has(key)) continue
      this.emitted.add(key)
      requests.push({ ...generation, fullMatch: control.fullMatch, content: control.fields.visual_prompt,
        attrs: control.fields, sourceContent: this.buffer.slice(0, control.index + control.fullMatch.length) })
    }
    return requests
  }
}

export interface StreamingIllustrationTagPayload {
  fullMatch?: unknown
  content?: unknown
}

/** Locate the exact request through HTML-island shadow roots, then recover
 * only its immediately preceding prose paragraph across the island boundary. */
export function findInstantIllustrationAnchor(messageContent: HTMLElement, requestId: string): { cardFound: boolean; text: string | null } {
  if (!requestId.trim()) return { cardFound: false, text: null }
  const findCard = (root: ParentNode): HTMLElement | null => {
    for (const card of Array.from(root.querySelectorAll<HTMLElement>('[data-rrn-native-request]'))) {
      if (card.getAttribute('data-rrn-native-request') === requestId) return card
    }
    for (const element of Array.from(root.querySelectorAll<HTMLElement>('*'))) {
      if (element.shadowRoot) {
        const card = findCard(element.shadowRoot)
        if (card) return card
      }
    }
    return null
  }
  const card = findCard(messageContent)
  if (!card) return { cardFound: false, text: null }
  let island: HTMLElement | null = card.closest<HTMLElement>('.dgir-prose-lifecycle-projection, .rrl-island') || card
  while (island && island !== messageContent) {
    let previous = island.previousElementSibling as HTMLElement | null
    while (previous?.matches('style, script')) previous = previous.previousElementSibling as HTMLElement | null
    if (previous) {
      if (previous.matches('.rrl-island, .dgir-prose-lifecycle-projection, [data-rrn-native-request], [data-lumiverse-html-island]')) return { cardFound: true, text: null }
      const paragraphs = previous.querySelectorAll<HTMLElement>('p, blockquote, li')
      const paragraph = previous.matches('p, blockquote, li') ? previous : paragraphs.item(paragraphs.length - 1)
      return { cardFound: true, text: String(paragraph?.innerText || paragraph?.textContent || '').trim() || null }
    }
    const parent: HTMLElement | null = island.parentElement
    island = parent || (island.getRootNode() as ShadowRoot).host as HTMLElement | null
  }
  return { cardFound: true, text: null }
}

export const INSTANT_STREAM_RENDER_RETRY_MS = 100
export const INSTANT_STREAM_RENDER_MAX_RETRIES = 20

function normalizeWithSourceOffsets(value: string): { normalized: string; sourceOffsets: number[] } {
  let normalized = ''
  const sourceOffsets: number[] = []
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index]
    if (/\s/u.test(character)) {
      if (normalized && !normalized.endsWith(' ')) {
        normalized += ' '
        sourceOffsets.push(index)
      }
      continue
    }
    normalized += character
    sourceOffsets.push(index)
  }
  return { normalized: normalized.trim(), sourceOffsets }
}

function visibleTextFromTagMarkup(value: string): string {
  return value
    .replace(/\[\/?(?:visual_prompt|scene_brief)\]/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
}

/**
 * Rebuild a bounded scan source from the visible streaming message and the
 * completed request-tag payload. Fail closed when the tag body cannot be
 * located in the rendered message: normal completed-response discovery can
 * still take over without risking a wrong paragraph lock.
 */
export function buildInstantIllustrationSource(
  renderedMessageText: string,
  payload: StreamingIllustrationTagPayload,
  precedingAnchorText?: string | null,
): string | null {
  const fullMatch = typeof payload.fullMatch === 'string' ? payload.fullMatch.trim() : ''
  const tagBody = typeof payload.content === 'string' ? payload.content : ''
  if (!fullMatch || !tagBody) return null

  // Relay's live renderer replaces request markup with an in-place lifecycle
  // island before the message body becomes readable text. When the exact
  // request card is available, its immediately preceding prose paragraph is
  // the authoritative anchor; don't require hidden tag text to remain in the
  // visible DOM.
  const anchoredText = typeof precedingAnchorText === 'string' ? precedingAnchorText.trim() : ''
  if (anchoredText) return `${anchoredText}\n\n${fullMatch}`
  if (!renderedMessageText.trim()) return null

  const marker = normalizeWithSourceOffsets(visibleTextFromTagMarkup(tagBody)).normalized
  const rendered = normalizeWithSourceOffsets(renderedMessageText)
  if (marker.length < 4 || !rendered.normalized) return null

  const normalizedStart = rendered.normalized.lastIndexOf(marker)
  if (normalizedStart < 0) return null
  const originalStart = rendered.sourceOffsets[normalizedStart]
  if (!Number.isInteger(originalStart) || originalStart <= 0) return null

  const precedingText = renderedMessageText.slice(0, originalStart).trim()
  if (!precedingText) return null
  return `${precedingText}\n\n${fullMatch}`
}

export function createStreamingAssistantSnapshot(messageId: string, swipeId: number) {
  return {
    id: messageId,
    role: 'assistant',
    is_user: false,
    content: '',
    swipe_id: Number.isInteger(swipeId) && swipeId >= 0 ? swipeId : 0,
    swipes: [],
    metadata: {},
  }
}
