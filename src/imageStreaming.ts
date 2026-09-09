export type ImageStreamingProviderInfo = {
  id?: string
  name?: string
  capabilities?: Record<string, unknown>
}

const clean = (value: unknown): string => String(value || '').trim()

/** The host may expose generateStream globally even when the selected provider
 * only supports request/response generation. Provider identity and advertised
 * capabilities therefore gate the WebSocket path. */
export function imageProviderSupportsStreaming(
  providerId: string,
  provider: ImageStreamingProviderInfo | undefined,
  generateStreamAvailable: boolean,
): boolean {
  if (!generateStreamAvailable) return false
  const identity = [providerId, provider?.id, provider?.name].map(value => clean(value).toLocaleLowerCase()).join(' ')
  if (/\b(?:novel[-_ ]?ai|nai)\b/.test(identity)) return false
  const capabilities = provider?.capabilities || {}
  for (const key of ['streaming', 'stream', 'previewStreaming', 'preview_streaming', 'websocket', 'webSocket']) {
    if (capabilities[key] === false) return false
  }
  const transport = clean(capabilities.transport || capabilities.protocol).toLocaleLowerCase()
  if (['http', 'request-response', 'request_response', 'rest'].includes(transport)) return false
  return true
}
