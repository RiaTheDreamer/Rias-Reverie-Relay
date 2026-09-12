// @ts-nocheck -- Deterministic structural coverage for streaming layout-shift prevention.
import { readFileSync } from 'node:fs'
import { renderNativeSurfaceMarkup } from '../src/nativeSurfaces'
import { r45SupplementalSurfaceDefinitions } from '../src/r45SurfaceCatalog'
import { shippedSurfaceDefinitions } from '../src/shippedSurfaceDefinitions'
import type { CustomSurfaceStudioState } from '../src/contracts'

function assert(value: unknown, reason: string): asserts value { if (!value) throw new Error(reason) }

const definitions = [...shippedSurfaceDefinitions(1), ...r45SupplementalSurfaceDefinitions(1)]
const studio: CustomSurfaceStudioState = {
  definitions: Object.fromEntries(definitions.map(definition => [definition.surfaceId, definition])),
  activePresetIds: Object.fromEntries(definitions.map(definition => [definition.baseSurfaceId, definition.surfaceId])),
  collectionPresets: {}, rendererMode: 'relay', defaultShellMode: 'plain', colorMode: 'realistic',
  utilityInjectionEnabled: true, utilityInjectionPosition: 'after-chat-history', utilityTemplate: '',
  validationErrors: {}, lastInjectedModuleIds: [], lastInjectionAt: 0, lastInjectionSource: 'none',
  lastInjectionPosition: 'none', lastInjectionSummary: '', updatedAt: 1,
}

const request = (id: string, aspect: string) => `<image_request id="${id}" target="custom.artifact-media" slot="${id}" aspect="${aspect}" alt="Stable media"><scene_brief>Offline fixture.</scene_brief></image_request>`

function rendered(markup: string, records = []) {
  return renderNativeSurfaceMarkup(markup, studio, { chatId: 'layout', messageId: 'layout-message', autoGenerate: true, records }).content
}

function cardFor(content: string, requestId: string): string {
  const marker = `data-rrn-native-request="${requestId}"`
  const index = content.indexOf(marker)
  assert(index >= 0, `${requestId}: lifecycle card missing`)
  return content.slice(Math.max(0, content.lastIndexOf('<div class="rrl-card', index)), content.indexOf('</div><textarea', index) > 0 ? content.indexOf('</div><textarea', index) : content.length)
}

function assertStableSlot(content: string, requestId: string, ratio: string, state: string): void {
  const card = cardFor(content, requestId)
  assert(card.includes('class="rrl-media-slot"'), `${requestId}/${state}: missing stable media slot`)
  assert(card.includes(`data-aspect="${ratio}"`), `${requestId}/${state}: missing request aspect`)
  assert(card.includes(`--reverie-media-aspect:${ratio.replace(':', ' / ')}`), `${requestId}/${state}: missing reserved CSS ratio`)
  assert(card.includes(`data-rrn-live-status="${state}"`), `${requestId}/${state}: wrong card state`)
}

const pending = rendered(`Intro prose.${request('one', '1:1')}Still streaming.`)
assertStableSlot(pending, 'one', '1:1', 'preparing')

const queued = rendered(request('one', '1:1'), [{ requestId: 'one', slot: 'one', target: 'custom.artifact-media', status: 'queued', messageId: 'layout-message', requestAspect: '1:1' }])
assertStableSlot(queued, 'one', '1:1', 'queued')

const generating = rendered(request('wide', '16:9'), [{ requestId: 'wide', slot: 'wide', target: 'custom.artifact-media', status: 'generating', messageId: 'layout-message', requestAspect: '16:9' }])
assertStableSlot(generating, 'wide', '16:9', 'generating')

const failed = rendered(request('portrait', '3:4'), [{ requestId: 'portrait', slot: 'portrait', target: 'custom.artifact-media', status: 'failed', messageId: 'layout-message', requestAspect: '3:4', error: 'Mock failure' }])
assertStableSlot(failed, 'portrait', '3:4', 'failed')

const completed = rendered(request('portrait', '3:4'), [{ requestId: 'portrait', slot: 'portrait', target: 'custom.artifact-media', status: 'completed', messageId: 'layout-message', requestAspect: '3:4', imageUrl: '/mock/portrait.jpg', imageId: 'portrait-img' }])
assertStableSlot(completed, 'portrait', '3:4', 'completed')
assert(cardFor(completed, 'portrait').includes('/mock/portrait.jpg') && cardFor(completed, 'portrait').includes('class="rrl-resolved"'), 'completed image must replace content inside the stable slot')

const retrySuccess = rendered(request('retry', '4:5'), [{ requestId: 'retry', slot: 'retry', target: 'custom.artifact-media', status: 'placement-repair-needed', messageId: 'layout-message', requestAspect: '4:5', pendingPlacement: { imageUrl: '/mock/retry.jpg' }, imageId: 'retry-img' }])
assertStableSlot(retrySuccess, 'retry', '4:5', 'placement-repair-needed')

const mixed = rendered(`${request('square', '1:1')}\nMiddle prose\n${request('wide', '16:9')}\n${request('tall', '9:16')}`, [
  { requestId: 'square', slot: 'square', target: 'custom.artifact-media', status: 'completed', messageId: 'layout-message', requestAspect: '1:1', imageUrl: '/mock/square.jpg' },
  { requestId: 'wide', slot: 'wide', target: 'custom.artifact-media', status: 'generating', messageId: 'layout-message', requestAspect: '16:9' },
  { requestId: 'tall', slot: 'tall', target: 'custom.artifact-media', status: 'queued', messageId: 'layout-message', requestAspect: '9:16' },
])
for (const [id, ratio, state] of [['square', '1:1', 'completed'], ['wide', '16:9', 'generating'], ['tall', '9:16', 'queued']] as const) assertStableSlot(mixed, id, ratio, state)

const terminalSource = `Opening prose remains visible.\n${request('terminal', '4:3')}\nClosing prose remains visible.`
const terminalPending = rendered(terminalSource, [{ requestId: 'terminal', slot: 'terminal', target: 'custom.artifact-media', status: 'generating', messageId: 'layout-message', requestAspect: '4:3' }])
const terminalCompleted = rendered(terminalSource, [{ requestId: 'terminal', slot: 'terminal', target: 'custom.artifact-media', status: 'completed', messageId: 'layout-message', requestAspect: '4:3', imageUrl: '/mock/terminal.jpg' }])
for (const [state, content] of [['pending', terminalPending], ['completed', terminalCompleted]] as const) {
  assert(content.includes('Opening prose remains visible.') && content.includes('Closing prose remains visible.'), `${state}: terminal lifecycle transition removed surrounding prose`)
  assertStableSlot(content, 'terminal', '4:3', state === 'pending' ? 'generating' : 'completed')
}

const phone = definitions.find(definition => definition.baseSurfaceId === 'smartphone')!
const phoneRendered = rendered(phone.sampleXml)
assert((phoneRendered.includes('data-reverie-r45-lifecycle-media="smartphone"') || phoneRendered.includes('data-rrn-native-request="phone-message-1"')) && phoneRendered.includes('class="rrl-media-slot"') && phoneRendered.includes('--reverie-media-aspect:4 / 3'), 'Smartphone pending media must reserve its 4:3 message-image slot inside the Surface')

const nativeSource = readFileSync(new URL('../src/nativeSurfaces.ts', import.meta.url), 'utf8')
assert(nativeSource.includes('data-reverie-stable-media-slot="1"') && nativeSource.includes('overflow-anchor:none'), 'stable media CSS must ship with Relay media output')
assert(!/html\s*,\s*body[\s\S]{0,80}overflow-anchor\s*:\s*none/i.test(nativeSource), 'scroll anchoring must not be globally disabled')

const frontendSource = readFileSync(new URL('../src/frontend.ts', import.meta.url), 'utf8')
assert(frontendSource.includes('mediaSlot.dataset.rrnMediaState') && frontendSource.includes('slotImage.hidden = false'), 'frontend must mutate the existing stable media slot when image state changes')
assert(frontendSource.includes("if (!card.querySelector('.rrl-media-slot')) card.remove()"), 'frontend must not remove stable lifecycle cards when completed images bind')
assert(frontendSource.includes('invalidateDisplayIfContractChanged') && (frontendSource.match(/ctx\.display\?\.invalidate\(\['\*'\]\)/g) || []).length === 1, 'slot-state updates must not wholesale-invalidate and remount every Surface')

const backendSource = readFileSync(new URL('../src/backend.ts', import.meta.url), 'utf8')
assert(backendSource.includes('activeStreamingSurfaceChats.add(chatId)') && backendSource.includes('activeStreamingSurfaceChats.has(chatId)'), 'Surface discovery must wait until assistant streaming finishes')
const renderProcessor = backendSource.slice(backendSource.indexOf("if (typeof registerMessageContentProcessor === 'function')"), backendSource.indexOf('const registerInterceptor'))
assert(renderProcessor.includes('hotFallbackRenderSnapshot(context.userId)') && !renderProcessor.includes('await Promise.all([\n          getState'), 'render-origin processing must never wait on state/config storage reads')
assert(!renderProcessor.includes('recordSignature') && renderProcessor.includes('contentFingerprint(source)'), 'slot lifecycle changes must reuse the same rendered message body')
assert(backendSource.includes('renderConfigurationFingerprint(current) !== renderConfigurationFingerprint(next)'), 'unrelated settings writes must not invalidate every rendered message')

console.log('streaming layout stability smoke passed: stable reserved slots, state geometry, multi-image/aspect coverage, and frontend in-place binding verified.')
