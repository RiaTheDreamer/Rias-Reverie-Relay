import type { SpindleAPI } from 'lumiverse-spindle-types'

// The host owns network policy, timeouts, byte limits, and image magic-byte
// validation. Binary CORS responses cross the worker boundary as base64, not a
// Response/ArrayBuffer. Do not replace this with an unbrokered network request.
export async function providerImageDataUrl(url: string, cors: SpindleAPI['cors']): Promise<string> {
  const response = await cors(url, { method: 'GET', responseType: 'arraybuffer', mediaType: 'image' }) as {
    status?: number
    headers?: Record<string, string>
    body?: string
    encoding?: string
  } | null
  if (!response || typeof response.status !== 'number' || response.status < 200 || response.status >= 300) {
    throw new Error(`Provider image download failed (HTTP ${response?.status ?? 'unknown'}).`)
  }
  const contentType = Object.entries(response.headers || {}).find(([name]) => name.toLowerCase() === 'content-type')?.[1]
  const mime = typeof contentType === 'string' ? contentType.split(';', 1)[0].trim().toLowerCase() : ''
  if (!/^image\/[a-z0-9.+-]+$/.test(mime) || response.encoding !== 'base64'
    || typeof response.body !== 'string' || !response.body.length
    || response.body.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(response.body)) {
    throw new Error('Provider image download did not return a valid host-proxied image payload.')
  }
  return `data:${mime};base64,${response.body}`
}
