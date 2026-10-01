export interface StreamingIllustrationTagPayload {
  fullMatch?: unknown
  content?: unknown
}

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
