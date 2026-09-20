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

/**
 * Emergency-safe transport policy retained in 0.2.8.5. The extension-facing Spindle API
 * documents request/response generation for SwarmUI, but not a stable public
 * streaming result contract. Keep Swarm on the authoritative standard RPC
 * until the host exposes and documents a compatible streaming contract.
 */
export function relayStreamingAllowedForProvider(providerId: string): boolean {
  return !isSwarmUiProvider(providerId)
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
