export type ImageStreamingProviderInfo = {
  id?: string
  name?: string
  capabilities?: {
    websocketPreviewStreaming?: {
      previews?: boolean
      status?: boolean
    }
  }
}

/** The host may expose generateStream globally even when the selected provider
 * only supports request/response generation. Provider identity and advertised
 * capabilities therefore gate the WebSocket path. */
export function imageProviderSupportsStreaming(
  _providerId: string,
  provider: ImageStreamingProviderInfo | undefined,
  generateStreamAvailable: boolean,
): boolean {
  if (!generateStreamAvailable) return false
  if (!provider) return false
  const capability = provider.capabilities?.websocketPreviewStreaming
  return capability?.previews === true && capability?.status === true
}
