// @ts-nocheck -- Node-backed test harness; production helper is checked with the application.
import { strict as assert } from 'node:assert'
import { readFileSync } from 'node:fs'
import { providerImageDataUrl } from '../src/providerImageDownload'

const png = 'iVBORw0KGgo='
const calls: Array<{ url: string; options: unknown }> = []
const image = { status: 200, headers: { 'content-type': 'image/png' }, body: png, encoding: 'base64' }
const response = (value: unknown) => async (url: string, options: unknown) => { calls.push({ url, options }); return value }
assert.equal(await providerImageDataUrl('http://127.0.0.1:7801/generated.png', response(image)), `data:image/png;base64,${png}`)
assert.deepEqual(calls, [{ url: 'http://127.0.0.1:7801/generated.png', options: { method: 'GET', responseType: 'arraybuffer', mediaType: 'image' } }])
assert.equal(await providerImageDataUrl('https://example.invalid/image', response({ ...image, status: 201, headers: { 'Content-Type': 'IMAGE/WEBP; charset=binary' } })), `data:image/webp;base64,${png}`)
for (const invalid of [null, { ...image, status: 404 }, { ...image, status: 500 }, { ...image, status: '200' },
  { ...image, headers: {} }, { ...image, headers: { 'content-type': 'text/html' } },
  { ...image, encoding: undefined }, { ...image, body: '' }, { ...image, body: '<html>not an image</html>' },
  { ...image, body: 'abc' }, { ...image, body: '=AAA' }]) {
  await assert.rejects(providerImageDataUrl('https://example.invalid/image', response(invalid)))
}
let permissionCalls = 0
await assert.rejects(providerImageDataUrl('https://example.invalid/image', async () => {
  permissionCalls += 1
  throw new Error('CORS proxy permission not granted')
}), /permission not granted/)
assert.equal(permissionCalls, 1, 'a rejected host request must not cause a network retry')
const backend = readFileSync(new URL('../src/backend.ts', import.meta.url), 'utf8')
assert(!/(?<![.\w$])fetch\s*\(/.test(backend), 'backend must not use a direct network request')
assert(backend.includes('providerImageDataUrl(imageUrl, (url, options) => spindle.cors(url, options))'), 'image persistence must use the host broker')
console.log('Backend network compatibility: binary proxy, MIME/base64 validation, HTTP failures and permission rejection passed.')
