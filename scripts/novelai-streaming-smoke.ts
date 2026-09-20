// @ts-nocheck -- local provider-capability regression harness.
import { strict as assert } from 'node:assert'
import { imageProviderSupportsStreaming } from '../src/imageStreaming'

assert.equal(imageProviderSupportsStreaming('novelai', { id: 'novelai', name: 'NovelAI' }, true), false)
assert.equal(imageProviderSupportsStreaming('novel-ai', { id: 'novel-ai' }, true), false)
assert.equal(imageProviderSupportsStreaming('nai', undefined, true), false)
assert.equal(imageProviderSupportsStreaming('custom-http', { id: 'custom-http' }, true), false)
assert.equal(imageProviderSupportsStreaming('custom', { id: 'custom', capabilities: {} }, true), false)
assert.equal(imageProviderSupportsStreaming('swarmui', { id: 'swarmui', capabilities: { websocketPreviewStreaming: { previews: true, status: true } } }, true), true)
assert.equal(imageProviderSupportsStreaming('arbitrary-name', { id: 'arbitrary-name', capabilities: { websocketPreviewStreaming: { previews: true, status: true } } }, true), true)
assert.equal(imageProviderSupportsStreaming('comfyui', { id: 'comfyui' }, false), false)

console.log('Image streaming smoke passed: request/response providers stay standard while SwarmUI and other explicitly capable providers use abortable preview streaming.')
