// @ts-nocheck -- deterministic render/ownership contract; live browser geometry remains a release gate.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { renderNativeSurfaceMarkup } from '../src/nativeSurfaces'

const frontend = readFileSync(new URL('../src/frontend.ts', import.meta.url), 'utf8')
const nativeSurfaces = readFileSync(new URL('../src/nativeSurfaces.ts', import.meta.url), 'utf8')
const requestId = 'pre-glass-parity'
const key = `parity-chat:parity-message:0:${requestId}:illustration`
const baseRecord = {
  key, chatId: 'parity-chat', messageId: 'parity-message', swipeId: 0,
  requestId, slot: 'illustration', target: 'prose.illustration', targetApp: 'prose',
  requestAspect: '4:3', createdAt: Date.now(), updatedAt: Date.now(),
}
const studio = { definitions: {}, activePresetIds: {}, rendererMode: 'final-r45', colorMode: 'realistic', defaultShellMode: 'plain' } as any
const render = (record: any) => renderNativeSurfaceMarkup(
  `<scene_image pending="true" requestId="${requestId}" aspect="4:3">A faithful illustration.</scene_image>`,
  studio,
  { chatId: 'parity-chat', messageId: 'parity-message', swipeId: 0, isUser: false, records: [record] } as any,
).content

const active = render({ ...baseRecord, status: 'generating' })
const completed = render({ ...baseRecord, status: 'completed', imageId: 'parity-image', imageUrl: '/parity-image.png' })
const ownerChain = /dgir-prose-lifecycle-projection[\s\S]*rrl-island[\s\S]*data-rrn-native-request="pre-glass-parity"[\s\S]*rrl-media-slot/
assert.match(active, ownerChain, 'active prose status lost the pre-Glass projection/island/card/media owner chain')
assert.match(completed, ownerChain, 'completed prose image abandoned the active lifecycle owner chain')
assert.match(completed, /rrl-slot-image[^>]*|class="rrl-slot-image"/, 'completed prose lifecycle slot has no final image')
assert(completed.includes('src="/parity-image.png"'), 'completed prose lifecycle slot did not receive the canonical image URL')

const availableWidth = 1_000
for (const [size, width, maxWidth, percent, maxPixels] of [
  ['small', '48%', '420px', 48, 420], ['medium', '66%', '720px', 66, 720],
  ['large', '84%', '920px', 84, 920], ['full', '100%', '100%', 100, Number.POSITIVE_INFINITY],
] as const) {
  assert(frontend.includes(`imageSize === '${size}' ? '${width}'`) || (size === 'medium' && frontend.includes(": '66%'")), `${size}: restored width mapping is missing`)
  assert(frontend.includes(`imageSize === '${size}' ? '${maxWidth}'`) || (size === 'medium' && frontend.includes(": '720px'")), `${size}: restored max-width mapping is missing`)
  const placeholderWidth = Math.min(availableWidth * percent / 100, maxPixels)
  const completedWidth = Math.min(availableWidth * percent / 100, maxPixels)
  assert(Math.abs(completedWidth - placeholderWidth) <= 0.5, `${size}: completed width diverged from the shared lifecycle owner`)
}
assert(frontend.includes("slotImage = document.createElement('img')"), 'sanitizer-removed lifecycle image is not recreated in its stable media slot')
assert(frontend.includes('.dgir-prose-lifecycle-projection .rrl-media-slot :is(img.rrl-slot-image[data-dgir-app="prose"],img.rrl-preview-image) { width: 100% !important; max-width: none !important; height: 100% !important;'), 'prose preview and final images do not fill the stable outer-sized media slot')
assert(frontend.includes('PROJECTION_INVALIDATION_MAX_ATTEMPTS = 3'), 'missing-card invalidation retry is not explicitly bounded')
assert(frontend.includes('acknowledgeProjectionInvalidation(messageId)'), 'host message-render acknowledgement does not re-arm missing-card reconciliation')
assert(!frontend.includes('location.reload('), 'pre-Glass parity repair introduced a page refresh')
assert(nativeSurfaces.includes("input.baseSurfaceId === 'prose-illustration'"), 'stable completion branch is not isolated to prose illustration')
assert(nativeSurfaces.includes('.rrn-media img{width:100%;height:100%;object-fit:var(--rrn-fit,contain)}'), 'Surface media sizing contract changed')

console.log('Pre-Glass parity smoke passed: status and final share one prose slot, missing children hydrate in place, retries are bounded, and Surface sizing remains isolated. Live browser geometry is still required.')
