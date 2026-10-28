/** Fetch only a host-owned avatar URL, with the current browser session. */
export async function readPortraitAvatar(url: string, fetcher: typeof fetch = fetch): Promise<{ data: string; mime: string } | null> {
  try {
    const parsed = new URL(url, window.location.origin)
    if (parsed.origin !== window.location.origin || !/^\/api\/(?:v1\/)?images\//.test(parsed.pathname)) return null
    const abort = new AbortController(), timer = setTimeout(() => abort.abort(), 4000)
    try {
      const response = await fetcher(parsed.href, { credentials: 'same-origin', redirect: 'error', signal: abort.signal })
      const mime = (response.headers.get('content-type') || '').split(';')[0].toLowerCase()
      if (!response.ok || !['image/png','image/jpeg','image/webp'].includes(mime)) return null
      if (Number(response.headers.get('content-length')) > 4_500_000) return null
      const bytes = new Uint8Array(await response.arrayBuffer())
      if (bytes.length > 4_500_000) return null
      let binary = ''; for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192))
      return { data: btoa(binary), mime }
    } finally { clearTimeout(timer) }
  } catch { return null }
}
