// Lumiverse forwards Relay's parameter object to the selected ImageGen provider.
// NovelAI reads these provider-specific fields rather than the generic aspect
// and top-level negative prompt used by other providers.
const NOVELAI_RESOLUTIONS = [
  '832x1216', '1216x832', '1024x1024', '512x768', '768x512',
  '640x640', '1024x1536', '1536x1024', '1088x1920', '1920x1088',
] as const

function nearestNovelAiResolution(aspect: string): string | undefined {
  const [width, height] = aspect.split(':').map(Number)
  if (!(width > 0 && height > 0)) return undefined
  const ratio = width / height
  return NOVELAI_RESOLUTIONS.reduce<string | undefined>((best, size) => {
    const [w, h] = size.split('x').map(Number)
    if (!best) return size
    const [bestW, bestH] = best.split('x').map(Number)
    const difference = Math.abs(Math.log(w / h / ratio))
    const bestDifference = Math.abs(Math.log(bestW / bestH / ratio))
    return difference < bestDifference - 1e-10 || (Math.abs(difference - bestDifference) <= 1e-10 && w * h > bestW * bestH) ? size : best
  }, undefined)
}

function combineNegativeTags(generated: string, saved: unknown): string {
  const fragments = [generated, typeof saved === 'string' ? saved : '']
    .flatMap(value => value.split(/[\n,]+/).map(fragment => fragment.trim()).filter(Boolean))
  return [...new Map(fragments.map(fragment => [fragment.toLocaleLowerCase(), fragment])).values()].join(', ')
}

export function imageProviderParameters(
  providerId: string,
  parameters: Record<string, unknown>,
  aspect: string | undefined,
  negativePrompt: string,
  relayGuidance?: unknown,
): Record<string, unknown> {
  const result = { ...parameters }
  if (providerId.trim().toLocaleLowerCase() !== 'novelai') return result
  if (aspect) result.resolution = nearestNovelAiResolution(aspect) || result.resolution
  if (negativePrompt) result.negativePrompt = combineNegativeTags(negativePrompt, result.negativePrompt)
  if (relayGuidance !== undefined && relayGuidance !== '' && Number(relayGuidance) >= 1 && Number(relayGuidance) <= 20) {
    result.guidance = Number(relayGuidance)
  }
  return result
}
