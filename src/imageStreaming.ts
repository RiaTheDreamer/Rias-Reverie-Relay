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

export function isSwarmUiProvider(providerId: string): boolean {
  return ['swarmui', 'swarm-ui'].includes(String(providerId || '').trim().toLocaleLowerCase())
}

/** The Spindle stream contract is the only ImageGen transport that accepts an
 * AbortSignal. Provider capability discovery still decides whether the host can
 * actually use it; this policy must not force SwarmUI back onto the
 * uninterruptible request/response RPC when the host advertises streaming. */
export function relayStreamingAllowedForProvider(_providerId: string): boolean {
  return true
}

/** SwarmUI owns one mutable provider session. Relay therefore requires the
 * abortable stream contract instead of spending through an RPC that cannot be
 * cancelled and can hold the serialized lane forever. */
export function providerRequiresAbortableStream(providerId: string): boolean {
  return isSwarmUiProvider(providerId)
}

/** The host may expose generateStream globally even when the selected provider
 * only supports request/response generation. Provider identity and advertised
 * capabilities therefore gate the WebSocket path. */
export function imageProviderSupportsStreaming(
  providerId: string,
  provider: ImageStreamingProviderInfo | undefined,
  generateStreamAvailable: boolean,
): boolean {
  if (!relayStreamingAllowedForProvider(providerId)) return false
  if (!generateStreamAvailable) return false
  if (!provider) return false
  const capability = provider.capabilities?.websocketPreviewStreaming
  return capability?.previews === true && capability?.status === true
}
