const SAFE_KAKAO_COLOR = /^(?:#[0-9a-f]{3,8}|(?:rgb|hsl|hwb|lab|lch|oklab|oklch)\([^;{}]{1,56}\)|[a-z]{1,24})$/i

export function sanitizedKakaoColor(value: unknown): string {
  const color = String(value || '').trim()
  if (!color || color.length > 64 || !SAFE_KAKAO_COLOR.test(color)) return ''
  return color
}

export function applyKakaoColorBinding(element: { dataset?: Record<string, string | undefined>; style?: { setProperty(name: string, value: string): void } }): boolean {
  const color = sanitizedKakaoColor(element.dataset?.rrKakaoColor)
  if (!color || !element.style?.setProperty) return false
  element.style.setProperty('--kk-color', color)
  return true
}
