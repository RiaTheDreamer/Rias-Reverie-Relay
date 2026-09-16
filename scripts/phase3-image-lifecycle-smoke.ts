// @ts-nocheck -- Deterministic host-lifecycle harness; the repo intentionally omits Node ambient types.
import { readFileSync } from 'node:fs'
import { renderNativeSurfaceMarkup } from '../src/nativeSurfaces'
import { shippedSurfaceDefinitions } from '../src/shippedSurfaceDefinitions'
import { r45SupplementalSurfaceDefinitions } from '../src/r45SurfaceCatalog'

function assert(value: unknown, reason: string): asserts value { if (!value) throw new Error(reason) }
const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms))

;(globalThis as any).spindle = {
  registerMessageContentProcessor() {}, registerMacro() {}, on() {}, onFrontendMessage() {}, sendToFrontend() {},
  log: { info() {}, warn() {}, error() {} }, toast: { info() {}, success() {}, warning() {}, error() {} },
}
const backend = await import('../src/backend')

let content = '[a] [b] [c]'
const events: string[] = []
const place = async (id: string, generationDelay: number) => {
  await sleep(generationDelay)
  events.push(`generated-${id}`)
  await backend.withPlacementMutationLock({ chatId: 'phase3', messageId: 'message', swipeId: 0 }, async () => {
    const latest = content
    await sleep(10)
    content = latest.replace(`[${id}]`, `<img src="/${id}.png">`)
    events.push(`placed-${id}`)
  })
}
await Promise.all([place('a', 0), place('b', 40), place('c', 80)])
assert(content.includes('/a.png') && content.includes('/b.png') && content.includes('/c.png'), 'serialized per-message placement must retain every sibling insertion')
assert(events.indexOf('placed-a') < events.indexOf('generated-b'), 'first completed generation must place before slower siblings finish')

const definitions = [...shippedSurfaceDefinitions(1), ...r45SupplementalSurfaceDefinitions(1)]
const studio = {
  definitions: Object.fromEntries(definitions.map(definition => [definition.surfaceId, definition])),
  activePresetIds: Object.fromEntries(definitions.map(definition => [definition.baseSurfaceId, definition.surfaceId])),
  collectionPresets: {}, rendererMode: 'relay', defaultShellMode: 'plain', colorMode: 'realistic',
  utilityInjectionEnabled: true, utilityInjectionPosition: 'after-chat-history', utilityTemplate: '', validationErrors: {},
  lastInjectedModuleIds: [], lastInjectionAt: 0, lastInjectionSource: 'none', lastInjectionPosition: 'none', lastInjectionSummary: '', updatedAt: 1,
}
const request = '<image_request id="phase3" target="custom.artifact-media" slot="phase3" aspect="4:3"><scene_brief>Fixture</scene_brief></image_request>'
const render = (record: any) => renderNativeSurfaceMarkup(request, studio as any, { chatId: 'phase3', messageId: 'message', swipeId: 0, autoGenerate: true, generationPlaceholderEffect: 'glitter', records: [record] }).content
const pending = render({ key: 'phase3-key', requestId: 'phase3', slot: 'phase3', target: 'custom.artifact-media', messageId: 'message', swipeId: 0, status: 'placement-pending', requestAspect: '4:3', pendingPlacement: { imageId: 'asset', imageUrl: '/asset.png' } })
assert(pending.includes('data-rrn-live-status="placement-pending"') && pending.includes('data-rr-placeholder-effect="glitter"'), 'placement-pending must retain the selected placeholder effect')
const repair = render({ key: 'phase3-key', requestId: 'phase3', slot: 'phase3', target: 'custom.artifact-media', messageId: 'message', swipeId: 0, status: 'placement-repair-needed', requestAspect: '4:3', pendingPlacement: { imageId: 'asset', imageUrl: '/asset.png' } })
assert(repair.includes('/asset.png') && repair.includes('Repair / Reinsert') && !repair.includes('>Regenerate<'), 'placement repair must preserve the generated asset and expose placement-only recovery')
const completed = render({ key: 'phase3-key', requestId: 'phase3', slot: 'phase3', target: 'custom.artifact-media', messageId: 'message', swipeId: 0, status: 'completed', requestAspect: '4:3', imageId: 'asset', imageUrl: '/asset.png' })
assert(completed.includes('/asset.png') && !/Image completed|Ready|Regenerate|Reparse|Rescan|Repair \/ Reinsert/.test(completed), 'verified completion must collapse to final media only')

const frontend = readFileSync(new URL('../src/frontend.ts', import.meta.url), 'utf8')
const backendSource = readFileSync(new URL('../src/backend.ts', import.meta.url), 'utf8')
const nativeSource = readFileSync(new URL('../src/nativeSurfaces.ts', import.meta.url), 'utf8')
assert((frontend.match(/'Generation Placeholder Effect'/g) || []).length === 1 && frontend.indexOf("'Generation Placeholder Effect'") > frontend.indexOf('function renderProseSettings'), 'placeholder selector must exist once under Illustrator Settings')
assert(frontend.includes('function resolveLightboxAsset') && frontend.includes("source: 'pending-placement'") && frontend.includes('Export Diagnostic JSON'), 'lightbox diagnostics must resolve pending/repair assets independently of completed status')
assert(backendSource.includes('applyGeneration(state, record, pending') && backendSource.includes('record.placementFailure = undefined'), 'confirmed current placement must outrank stale repair state during reconciliation')
assert(backendSource.includes("eventType: 'invalid_prose_illustration_schema'") && !backendSource.includes('invalidProseSchemaNotices'), 'Prose schema errors must remain diagnostic-only and lane-scoped')
assert(nativeSource.includes('.rrl-media-slot{box-shadow:0 2px 10px rgba(0,0,0,.12)') && !nativeSource.includes('.rrl-media-slot{box-shadow:0 16px 50px'), 'reservation shell must constrain downward shadow bleed')
assert(nativeSource.includes('`request-${input.requestId}`') && nativeSource.includes('data-reverie-stream-island'), 'request lifecycle must keep a stable stream-island identity')

console.log(`Phase 3 image lifecycle smoke passed: ${events.join(' -> ')}; three sibling placements retained; pending, repair, completion, diagnostics, schema isolation, and stable island contracts verified.`)
