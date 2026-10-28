/** A bounded, offset-reconciled story buffer. Only closed prose paragraphs
 * before any utility/image markup are eligible for speculative planning. */
export class RelayStoryStream {
  private buffer = ''
  valid = true

  push(payload: { token?: unknown; offset?: unknown; type?: unknown }): boolean {
    if (!this.valid || payload.type === 'reasoning' || typeof payload.token !== 'string') return false
    const offset = Number(payload.offset)
    if (!Number.isInteger(offset) || offset < 0 || offset > this.buffer.length) { this.valid = false; return false }
    const overlap = Math.min(this.buffer.length - offset, payload.token.length)
    if (payload.token.slice(0, overlap) !== this.buffer.slice(offset, offset + overlap)) { this.valid = false; return false }
    this.buffer += payload.token.slice(this.buffer.length - offset)
    if (this.buffer.length > 128_000) { this.valid = false; return false }
    return true
  }

  completeProse(): string {
    if (!this.valid) return ''
    // A partial utility opening must not be mistaken for ordinary prose. Do
    // not guess closing tags or strip them into a fabricated scene.
    const markup = this.buffer.search(/<\/?[a-z!]|\[\/?[a-z_][\w-]*(?:\]|\s)|```/i)
    const prose = markup < 0 ? this.buffer : this.buffer.slice(0, markup)
    let boundary = -1
    for (const match of prose.matchAll(/\r?\n[ \t]*\r?\n/g)) boundary = match.index!
    return boundary < 0 ? '' : prose.slice(0, boundary).trim()
  }
}
