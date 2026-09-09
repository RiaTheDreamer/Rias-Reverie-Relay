// @ts-nocheck -- local provider-capability regression harness.
import { strict as assert } from 'node:assert'
import { imageProviderSupportsStreaming } from '../src/imageStreaming'

assert.equal(imageProviderSupportsStreaming('novelai', { id: 'novelai', name: 'NovelAI' }, true), false)
assert.equal(imageProviderSupportsStreaming('novel-ai', { id: 'novel-ai' }, true), false)
assert.equal(imageProviderSupportsStreaming('nai', undefined, true), false)
assert.equal(imageProviderSupportsStreaming('custom-http', { id: 'custom-http', capabilities: { transport: 'http' } }, true), false)
assert.equal(imageProviderSupportsStreaming('custom', { id: 'custom', capabilities: { previewStreaming: false } }, true), false)
assert.equal(imageProviderSupportsStreaming('swarmui', { id: 'swarmui', capabilities: { streaming: true } }, true), true)
assert.equal(imageProviderSupportsStreaming('comfyui', { id: 'comfyui' }, false), false)

console.log('NovelAI streaming smoke passed: non-WebSocket providers use standard ImageGen while capable providers keep preview streaming.')
