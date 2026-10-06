// Source/renderer regression only. Pixel geometry is checked separately in
// the saved 7861 Surface review chat; a string test is not a browser layout.
// @ts-ignore -- Bun supplies node:fs for executable repository smoke scripts.
import { readFileSync } from 'node:fs'
import { SURFACE_MEDIA_GEOMETRY_CSS, SURFACE_MEDIA_GEOMETRY_STYLE } from '../src/surfaceMediaGeometry'
import { lifecycleRuntimeCss, renderNativeSurfaceMarkup } from '../src/nativeSurfaces'
import { NARRATIVE_MEDIA_COMPATIBILITY_STYLE, renderNarrativeRegex } from '../src/narrativeRegexAssets'
import { PERSONA_WARDROBE_STYLE } from '../src/personaWardrobe'
import { completeSurfaceSpecs } from '../src/surfaceXml'
import { SHIPPED_SURFACE_SPECS } from '../src/shippedSurfaceDefinitions'
import type { CustomSurfaceStudioState } from '../src/contracts'

function assert(value: unknown, reason: string): asserts value { if (!value) throw new Error(reason) }
const css = SURFACE_MEDIA_GEOMETRY_CSS
assert(css.includes(':where(img){max-height:none}'), 'Host cap override lost its low specificity')
assert(!css.includes(':where(img){max-height:none!important}'), 'Surface-owned height limits must outrank the host-cap reset')
assert(!/dgir-prose|data-dgir-app|prose\.illustration/.test(css), 'Surface sizing leaked into prose Illustration preferences')
assert(css.includes('.rrl-resolved') && css.includes('margin:0!important'), 'Completed figures can regain browser-default margins')
assert(css.includes(':has(>.rrl-resolved)'), 'Fixed panes must fill only completed owners, not replace pending lifecycle geometry')
const croppedRules = css.split('}').filter(rule => rule.includes('object-fit:cover'))
assert(croppedRules.length === 1 && croppedRules.every(rule => rule.split('{')[0].trim().endsWith('>.rrl-island>.rrl-resolved>img')), 'Shared cover sizing must remain inside completed figures, never generic app photos or pending cards')
assert(css.includes('data-archive-category="ITEM"') && css.includes('object-fit:contain!important'), 'Archive item imagery lost its contain presentation')
for (const owner of ['r65-media','rv6-media','ru-portrait','ru-secret-media','ru-thread-media','ra66-archive-media','rrcp-media','rrcp-photo-media','rrcp-wallpaper','dg-dramatic-media','ch-media','pw-media']) {
  assert(css.includes(`.${owner}`), `${owner}: missing shared media owner`)
}
assert(NARRATIVE_MEDIA_COMPATIBILITY_STYLE.includes(css), 'Narrative renderer did not embed the shared geometry')
assert(PERSONA_WARDROBE_STYLE.includes(SURFACE_MEDIA_GEOMETRY_STYLE), 'Wardrobe did not embed the shared geometry')
assert(lifecycleRuntimeCss().includes(css), 'Mounted lifecycle CSS diverged from rendered Surface CSS')

const frontend = readFileSync(new URL('../src/frontend.ts', import.meta.url), 'utf8')
const binder = frontend.slice(frontend.indexOf('function bindInlineImages('), frontend.indexOf('const now = Date.now()', frontend.indexOf('function bindInlineImages(')))
assert(binder.includes('if (stylingRoot) ensureMountedLifecycleStyle(stylingRoot)'), 'Restored images still require a live job record for styling')

const studio = { definitions:{}, activePresetIds:{}, collectionPresets:{}, rendererMode:'relay', defaultShellMode:'inline', colorMode:'realistic', utilityInjectionEnabled:true, utilityInjectionPosition:'system-prefix', utilityTemplate:'', validationErrors:{}, lastInjectedModuleIds:[], lastInjectionAt:0, lastInjectionSource:'none', lastInjectionPosition:'none', lastInjectionSummary:'', updatedAt:0 } as unknown as CustomSurfaceStudioState
const specs = completeSurfaceSpecs(SHIPPED_SURFACE_SPECS)
assert(specs.length === 46, 'Core Surface inventory drifted')
let cases = 0
for (const spec of specs) for (const shell of ['inline','plain','sparkling','glass'] as const) {
  assert(spec.sampleXml, `${spec.id}: missing sample`)
  const result = renderNativeSurfaceMarkup(spec.sampleXml, { ...studio, defaultShellMode:shell }, {chatId:'geometry',messageId:`geometry-${spec.id}-${shell}`,swipeId:0,autoGenerate:false})
  assert(result.content.includes(css), `${spec.id}/${shell}: Surface HTML lacks its cap reset`)
  cases++
}

const request = '<image_request id="geometry-image" slot="geometry-image" target="custom.artifact-media" aspect="4:3"><scene_brief>A saved scene.</scene_brief></image_request>'
const parallel = `[PARALLEL|Campus|shifting]${Array(3).fill(`[parallel_entry][text]The established scene.[/text][parallel_media]${request}[/parallel_media][/parallel_entry]`).join('')}[parallel_context][trajectory]Current threads.[/trajectory][intersection]None.[/intersection][/parallel_context][/PARALLEL]`
for (const shell of ['inline','plain-button','sparkle-button','glass','plain-glass'] as const) {
  const narrative = renderNarrativeRegex(parallel,shell,`geometry-${shell}`)
  const result = renderNativeSurfaceMarkup(narrative,studio,{chatId:'geometry',messageId:`geometry-${shell}`,swipeId:0,records:[{requestId:'geometry-image',slot:'geometry-image',target:'custom.artifact-media',status:'completed',imageUrl:'/api/v1/images/geometry',requestAspect:'4:3',messageId:`geometry-${shell}`} ]})
  assert(result.content.includes(css), `${shell}: completed Narrative owner lacks shared CSS`)
  assert((result.content.match(/class="rrl-resolved"/g)||[]).length === 3, `${shell}: did not exercise the three completed figure wrappers`)
  assert(!result.content.includes('<image_request'), `${shell}: completed request was not resolved`)
}
console.log(`Surface media geometry smoke passed: ${cases} Core shell renders; five Parallel shell renders with three completed figures each; shared mounted/Narrative/Wardrobe CSS; prose and pending geometry isolation. Live pixels are a separate gate.`)
