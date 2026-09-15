// @ts-nocheck -- Deterministic contract coverage for the generation reservation appearance.
import { readFileSync } from 'node:fs'
import { normalizeGenerationPlaceholderEffect } from '../src/contracts'
import { renderNativeSurfaceMarkup } from '../src/nativeSurfaces'
import { r45SupplementalSurfaceDefinitions } from '../src/r45SurfaceCatalog'
import { shippedSurfaceDefinitions } from '../src/shippedSurfaceDefinitions'

function assert(value: unknown, reason: string): asserts value { if (!value) throw new Error(reason) }

const definitions = [...shippedSurfaceDefinitions(1), ...r45SupplementalSurfaceDefinitions(1)]
const studio = {
  definitions: Object.fromEntries(definitions.map(definition => [definition.surfaceId, definition])),
  activePresetIds: Object.fromEntries(definitions.map(definition => [definition.baseSurfaceId, definition.surfaceId])),
  collectionPresets: {}, rendererMode: 'relay', defaultShellMode: 'plain', colorMode: 'realistic',
  utilityInjectionEnabled: true, utilityInjectionPosition: 'after-chat-history', utilityTemplate: '', validationErrors: {},
  lastInjectedModuleIds: [], lastInjectionAt: 0, lastInjectionSource: 'none', lastInjectionPosition: 'none', lastInjectionSummary: '', updatedAt: 1,
}
const requestId = 'placeholder-contract'
const request = `<image_request id="${requestId}" target="custom.artifact-media" slot="${requestId}" aspect="4:3" alt="Reserved media"><scene_brief>Fixture.</scene_brief></image_request>`
const baseRecord = { key: `chat:message:0:${requestId}:${requestId}`, requestId, slot: requestId, target: 'custom.artifact-media', status: 'generating', messageId: 'message', swipeId: 0, requestAspect: '4:3' }

const runtimeMarkup = (effect: string, status = 'generating', imageUrl?: string) => {
  const content = renderNativeSurfaceMarkup(request, studio as any, {
    chatId: 'chat', messageId: 'message', swipeId: 0, autoGenerate: true,
    generationPlaceholderEffect: effect as any,
    records: [{ ...baseRecord, status, imageUrl, imageId: imageUrl ? 'image-id' : undefined }],
  }).content
  return content.slice(content.lastIndexOf('</style>') + '</style>'.length)
}

assert(normalizeGenerationPlaceholderEffect(undefined) === 'glitter', 'missing config must migrate to glitter')
assert(normalizeGenerationPlaceholderEffect('corrupt') === 'glitter', 'invalid config must fall back to glitter')
for (const effect of ['spinner', 'glitter', 'none', 'dream-orb'] as const) {
  assert(normalizeGenerationPlaceholderEffect(effect) === effect, `${effect}: config value must survive normalization/save-load`)
  const markup = runtimeMarkup(effect)
  assert(markup.includes(`data-rr-placeholder-effect="${effect}"`), `${effect}: active reservation must use selected effect`)
  assert(markup.includes('--reverie-media-aspect:4 / 3'), `${effect}: canonical reservation aspect footprint changed`)
  assert(markup.includes(`data-rrn-native-request="${requestId}"`) && markup.includes(`data-rrn-record-key="${baseRecord.key}"`), `${effect}: appearance changed slot/request identity`)
  assert(!markup.includes('<strong class="rrl-title">') && !markup.includes('<span class="rrl-status">') && !markup.includes('<button'), `${effect}: active placeholder rendered status text or actions`)
  assert(!/>\s*(?:Generating|Dreaming up your image|Preparing|Queued|Inserting|Live preview)\s*</i.test(markup), `${effect}: active placeholder rendered forbidden copy`)
  const spinner = (markup.match(/class="rr-spinner"/g) || []).length
  const glitter = (markup.match(/class="rr-regex-particles"/g) || []).length
  const orb = (markup.match(/class="rr-orb"/g) || []).length
  if (effect === 'spinner') assert(spinner === 1 && glitter === 0 && orb === 0, 'spinner mode must render spinner only')
  if (effect === 'glitter') assert(glitter === 1 && spinner === 0 && orb === 0 && (markup.match(/<i><\/i>/g) || []).length === 24, 'glitter mode must render exactly 24 Regex particles')
  if (effect === 'dream-orb') assert(orb === 1 && spinner === 0 && glitter === 0, 'dream-orb mode must render orb only')
  if (effect === 'none') assert(spinner === 0 && glitter === 0 && orb === 0 && /rrl-generation-placeholder[^>]*><\/div>/.test(markup), 'none mode must render an empty effect shell')
}

const completed = runtimeMarkup('glitter', 'completed', '/images/completed.png')
assert(!completed.includes('data-rr-placeholder-effect=') && completed.includes('/images/completed.png'), 'completed generation must remove the active effect and keep the image')
const retry = runtimeMarkup('dream-orb', 'generating')
assert(retry.includes('data-rr-placeholder-effect="dream-orb"'), 'retry returning to active state must restore selected effect')

const nativeSource = readFileSync(new URL('../src/nativeSurfaces.ts', import.meta.url), 'utf8')
assert(nativeSource.includes('linear-gradient(135deg,rgba(255,255,255,.045),rgba(255,255,255,.015)),var(--rr-bg)') && nativeSource.includes('backdrop-filter:blur(20px)') && nativeSource.includes('0 16px 50px rgba(0,0,0,.32)'), 'shared approved Dreamglass shell is missing')
assert(nativeSource.includes('.rrl-generation-placeholder .rr-regex-particles i{') && nativeSource.includes('pointer-events:none'), 'decorative particles must be scoped and ignore pointer input')
assert((nativeSource.match(/\.rrl-generation-placeholder \.rr-regex-particles i:nth-child\(/g) || []).length === 24, 'approved glitter particle values must contain exactly 24 rows')
assert(nativeSource.includes('animation:rr-spin 1.15s linear infinite') && nativeSource.includes('@keyframes rr-spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}'), 'spinner must rotate continuously through visually identical loop endpoints')
const approvedGlitterKeyframes = '@keyframes rr-regex-floating-particle{0%{opacity:0;transform:translate3d(0,10px,0) scale(.45)}18%{opacity:.72}55%{opacity:.94}100%{opacity:0;transform:translate3d(var(--dx),var(--dy),0) scale(1.18)}}'
assert(nativeSource.includes(approvedGlitterKeyframes), 'approved glitter keyframes or invisible positional-reset endpoints changed')
const glitterTimings = [...nativeSource.matchAll(/\.rrl-generation-placeholder \.rr-regex-particles i:nth-child\(\d+\)\{[^}]*--d:([\d.]+s);--delay:(-[\d.]+s)\}/g)]
assert(glitterTimings.length === 24, 'glitter must preserve all 24 staggered timing rows')
assert(new Set(glitterTimings.map(match => match[1])).size === 24 && glitterTimings.every(match => match[2].startsWith('-')), 'glitter must preserve varied durations and negative delays without a synchronized reset')
assert(nativeSource.includes('@keyframes rr-orb-float{0%,100%{transform:translateY(1px)}50%{transform:translateY(-3px)}}'), 'Dream Orb float loop endpoints must remain identical')
assert(nativeSource.includes('@keyframes rr-orb-breathe{0%,100%{scale:.97}50%{scale:1.025}}'), 'Dream Orb breathe loop endpoints must remain identical')
assert(nativeSource.includes('@keyframes rr-glint{0%,70%,100%{opacity:.25;transform:scale(.8)}82%{opacity:1;transform:scale(1.35)}}'), 'Dream Orb glint loop endpoints must remain identical')
assert(nativeSource.includes('animation:rr-glint 3.9s ease-in-out infinite') && nativeSource.includes('animation:rr-glint 5.1s ease-in-out -2s infinite'), 'Dream Orb glints must retain asynchronous continuous timing')
assert(nativeSource.includes('@media(prefers-reduced-motion:reduce)') && nativeSource.includes('.rrl-generation-placeholder .rr-regex-particles{display:none}'), 'reduced-motion handling is missing')
assert(!nativeSource.includes('\ni{') && !nativeSource.includes('}i{'), 'unscoped global i selector is forbidden')

const frontendSource = readFileSync(new URL('../src/frontend.ts', import.meta.url), 'utf8')
const patchConfigSource = frontendSource.slice(frontendSource.indexOf('function patchConfig('), frontendSource.indexOf('async function copyText('))
const placeholderSyncSource = frontendSource.slice(frontendSource.indexOf('function syncGenerationPlaceholderEffect('), frontendSource.indexOf('function applyGlobalInterfaceSettings('))
assert(patchConfigSource.includes("type: 'set_config'") && !/scan_message|regenerate_slot|generate_image/.test(patchConfigSource), 'appearance setting must persist without dispatching image work')
assert(frontendSource.includes('syncGenerationPlaceholderEffect') && frontendSource.includes('Array.from({ length: 24 }'), 'visible active placeholders must update in place')
assert(!/requestAnimationFrame|setInterval|setTimeout|animationstart|animationiteration/i.test(placeholderSyncSource), 'placeholder effects must remain CSS-only without timer or animation restart logic')

console.log('generation placeholder smoke passed: persistent four-mode config, textless canonical shell, exact 24-particle glitter, seamless CSS loop contracts, lifecycle, identity, reduced motion, and in-place appearance updates verified.')
