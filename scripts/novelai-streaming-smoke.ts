// @ts-nocheck -- local provider-capability regression harness.
import { strict as assert } from 'node:assert'
import { imageProviderSupportsStreaming } from '../src/imageStreaming'
import { imageProviderParameters } from '../src/imageProviderParameters'

assert.equal(imageProviderSupportsStreaming('novelai', { id: 'novelai', name: 'NovelAI' }, true), false)
assert.equal(imageProviderSupportsStreaming('novel-ai', { id: 'novel-ai' }, true), false)
assert.equal(imageProviderSupportsStreaming('nai', undefined, true), false)
assert.equal(imageProviderSupportsStreaming('custom-http', { id: 'custom-http' }, true), false)
assert.equal(imageProviderSupportsStreaming('custom', { id: 'custom', capabilities: {} }, true), false)
assert.equal(imageProviderSupportsStreaming('swarmui', { id: 'swarmui', capabilities: { websocketPreviewStreaming: { previews: true, status: true } } }, true), true)
assert.equal(imageProviderSupportsStreaming('arbitrary-name', { id: 'arbitrary-name', capabilities: { websocketPreviewStreaming: { previews: true, status: true } } }, true), true)
assert.equal(imageProviderSupportsStreaming('comfyui', { id: 'comfyui' }, false), false)

const saved = { resolution: '1216x832', guidance: 6, negativePrompt: 'bad anatomy', steps: 28 }
const novel = imageProviderParameters('novelai', saved, '2:3', 'watermark, bad anatomy')
assert.equal(novel.resolution, '1024x1536')
assert.equal(novel.negativePrompt, 'watermark, bad anatomy')
assert.equal(novel.guidance, 6)
assert.equal(novel.steps, 28)
assert.equal(saved.resolution, '1216x832', 'saved connection defaults must remain unchanged')
assert.equal(imageProviderParameters('novelai', saved, undefined, '').resolution, '1216x832')
assert.equal(imageProviderParameters('novelai', saved, '1:1', '', 8).guidance, 8)
assert.deepEqual(imageProviderParameters('swarmui', saved, '2:3', 'watermark'), saved, 'non-NovelAI providers must remain unchanged')

console.log('NovelAI compatibility smoke passed: stream capability, supported resolution, negative tags, guidance, and preserved provider defaults.')
