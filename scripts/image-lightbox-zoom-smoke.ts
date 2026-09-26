// @ts-nocheck -- executable browser-event regression harness; Bun provides node:fs.
import {
  constrainImageLightboxZoom,
  INITIAL_IMAGE_LIGHTBOX_ZOOM,
  MAX_IMAGE_LIGHTBOX_ZOOM,
  pinchImageLightboxZoom,
  bindImageLightboxZoom,
} from '../src/imageLightboxZoom'
import { readFileSync } from 'node:fs'

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

function near(actual: number, expected: number, message: string): void {
  assert(Math.abs(actual - expected) < 0.001, `${message}: expected ${expected}, received ${actual}`)
}

function event(type: string, fields: Record<string, unknown> = {}): Event {
  const value = new Event(type, { cancelable: true })
  for (const [key, field] of Object.entries(fields)) Object.defineProperty(value, key, { configurable: true, value: field })
  return value
}

function touch(clientX: number, clientY: number): { clientX: number; clientY: number } {
  return { clientX, clientY }
}

class FakeImage extends EventTarget {
  style: Record<string, string> = {}
  offsetWidth = 360
  offsetHeight = 600
  draggable = true
  src = 'first.png'
  currentSrc = 'first.png'
  capturedPointerId: number | undefined
  releasedPointerId: number | undefined
  classes = new Set<string>()
  classList = {
    add: (name: string) => this.classes.add(name),
    remove: (name: string) => this.classes.delete(name),
  }
  ownerDocument = {
    documentElement: {},
    defaultView: { getComputedStyle: () => ({ getPropertyValue: () => this.scale }) },
  }
  scale = '1'
  setPointerCapture(id: number): void { this.capturedPointerId = id }
  hasPointerCapture(id: number): boolean { return this.capturedPointerId === id && this.releasedPointerId !== id }
  releasePointerCapture(id: number): void { this.releasedPointerId = id }
}

class FakeViewport {
  clientWidth = 400
  clientHeight = 800
  getBoundingClientRect(): DOMRect { return { left: 0, top: 0, width: 400, height: 800 } as DOMRect }
}

function transform(image: FakeImage): string {
  return image.style.transform || 'none'
}

function scaleOf(image: FakeImage): number {
  return Number(/scale\(([-\d.]+)/.exec(transform(image))?.[1] || '1')
}

function panOf(image: FakeImage): [number, number] {
  const match = /translate3d\(([-\d.]+)px, ([-\d.]+)px/.exec(transform(image))
  return [Number(match?.[1] || 0), Number(match?.[2] || 0)]
}

const bounds = { imageWidth: 360, imageHeight: 600, viewportWidth: 400, viewportHeight: 800 }
const bounded = constrainImageLightboxZoom({ scale: 9, x: 900, y: -900 }, bounds)
assert(bounded.scale === MAX_IMAGE_LIGHTBOX_ZOOM, 'zoom must clamp at 4x')
near(bounded.x, 520, 'horizontal pan must clamp at the zoomed image edge')
near(bounded.y, -800, 'vertical pan must clamp at the zoomed image edge')
assert(JSON.stringify(constrainImageLightboxZoom({ scale: 1, x: 99, y: 99 }, bounds)) === JSON.stringify(INITIAL_IMAGE_LIGHTBOX_ZOOM), '1x must reset pan')
const anchored = pinchImageLightboxZoom(INITIAL_IMAGE_LIGHTBOX_ZOOM, 100, 200, { x: 50, y: 40 }, { x: 70, y: 60 }, bounds)
assert(anchored.scale === 2, 'pinch distance must scale proportionally')
near(anchored.x, -30, 'pinch must remain centered on the moving contact midpoint (x)')
near(anchored.y, -20, 'pinch must remain centered on the moving contact midpoint (y)')

const image = new FakeImage()
const viewport = new FakeViewport()
const unbind = bindImageLightboxZoom(image as unknown as HTMLImageElement, viewport as unknown as HTMLElement)
assert(image.style.touchAction === 'none' && image.style.userSelect === 'none' && !image.draggable, 'only the bound lightbox image should disable native gestures and dragging')

const wheelAtLeft = event('wheel', { clientX: 20, clientY: 400, deltaY: -17.3287, deltaMode: 1, ctrlKey: false })
image.dispatchEvent(wheelAtLeft)
assert(wheelAtLeft.defaultPrevented, 'image wheel zoom should prevent the browser from scrolling the image surface')
near(scaleOf(image), 2, 'wheel zoom should apply the expected line-mode scale')
assert(panOf(image)[0] > 0, 'wheel zoom should remain anchored at the cursor')
image.dispatchEvent(event('wheel', { clientX: 200, clientY: 400, deltaY: -10_000, deltaMode: 0, ctrlKey: false }))
near(scaleOf(image), 4, 'wheel zoom should clamp at 4x')
image.dispatchEvent(event('wheel', { clientX: 200, clientY: 400, deltaY: 10_000, deltaMode: 0, ctrlKey: false }))
assert(transform(image) === 'none' && !image.classes.has('dg-image-lightbox-zoomed'), 'zooming back out should reset transform and cursor state')

image.dispatchEvent(event('gesturestart', { clientX: 200, clientY: 400, scale: 1 }))
image.dispatchEvent(event('gesturechange', { clientX: 220, clientY: 410, scale: 2 }))
near(scaleOf(image), 2, 'Safari gesture events should zoom the lightbox')
near(panOf(image)[0], 20, 'Safari pinch should preserve the gesture focal point (x)')
near(panOf(image)[1], 10, 'Safari pinch should preserve the gesture focal point (y)')
image.dispatchEvent(event('gestureend'))

image.dispatchEvent(event('pointerdown', { pointerType: 'mouse', pointerId: 7, button: 0, clientX: 200, clientY: 400 }))
image.dispatchEvent(event('pointermove', { pointerType: 'mouse', pointerId: 7, button: 0, clientX: 225, clientY: 420 }))
near(panOf(image)[0], 45, 'mouse drag should pan the zoomed image (x)')
near(panOf(image)[1], 30, 'mouse drag should pan the zoomed image (y)')
image.dispatchEvent(event('pointerup', { pointerType: 'mouse', pointerId: 7, button: 0, clientX: 225, clientY: 420 }))
assert(image.capturedPointerId === 7 && image.releasedPointerId === 7, 'mouse pan should capture and release its pointer')

image.dispatchEvent(event('wheel', { clientX: 200, clientY: 400, deltaY: 10_000, deltaMode: 0, ctrlKey: false }))
image.dispatchEvent(event('wheel', { clientX: 200, clientY: 400, deltaY: -69.3147, deltaMode: 0, ctrlKey: true }))
image.dispatchEvent(event('touchstart', { touches: [touch(150, 400), touch(250, 400)] }))
const touchMove = event('touchmove', { touches: [touch(130, 390), touch(270, 410)] })
image.dispatchEvent(touchMove)
assert(touchMove.defaultPrevented, 'two-finger touch should prevent competing browser zoom on this image')
near(scaleOf(image), Math.sqrt(8), 'two-finger touch should pinch the image')
image.dispatchEvent(event('touchend', { touches: [touch(220, 410)] }))
image.dispatchEvent(event('touchmove', { touches: [touch(240, 430)] }))
near(panOf(image)[0], 20, 'single-finger touch should pan after zoom (x)')
near(panOf(image)[1], 20, 'single-finger touch should pan after zoom (y)')
image.dispatchEvent(event('touchend', { touches: [] }))

image.scale = '2'
image.offsetWidth = 360
image.offsetHeight = 600
image.dispatchEvent(event('wheel', { clientX: 200, clientY: 400, deltaY: -1000, deltaMode: 0, ctrlKey: true }))
const scaledPointPan = /translate3d\(([-\d.]+)px, ([-\d.]+)px/.exec(transform(image))
assert(scaledPointPan && Math.abs(Number(scaledPointPan[1])) <= 260 && Math.abs(Number(scaledPointPan[2])) <= 500, 'UI scale must be accounted for when constraining zoom and pan')
image.scale = '1'

image.src = 'second.png'
image.currentSrc = 'second.png'
image.dispatchEvent(event('load'))
assert(transform(image) === 'none', 'switching the image source should reset zoom')
unbind()

const frontend = readFileSync(new URL('../src/frontend.ts', import.meta.url), 'utf8')
for (const modal of ['openImageUrl', 'openAssetImage', 'openLightbox', 'openHistoryVersionImage', 'openSlotImagePreview']) {
  const start = frontend.indexOf(`function ${modal}(`)
  assert(start >= 0, `${modal}: image lightbox entrypoint is missing`)
  const next = frontend.indexOf('\n  function ', start + 1)
  const body = frontend.slice(start, next < 0 ? undefined : next)
  assert(body.includes('bindImageLightboxZoom') || body.includes('imageLightboxViewport('), `${modal}: did not receive image-scoped zoom behavior`)
}
assert(!frontend.slice(frontend.indexOf('function imageLightboxViewport('), frontend.indexOf('function openImageUrl(')).includes('document.addEventListener'), 'lightbox zoom must not register page-global touch listeners')
assert(frontend.includes('.dg-image-lightbox-viewport { position: relative; display: grid; place-items: center; align-content: start; width: 100%; height: auto; min-height: 0; max-height: min(72vh, 820px);') && frontend.includes('max-height: min(72vh, 820px); border: 0;'), 'general lightbox viewport must follow the displayed image aspect instead of reserving a tall fixed-height letterbox')
assert(frontend.includes('.dg-asset-lightbox-body { display: grid; grid-template-columns: minmax(0, 1fr) minmax(230px, 310px); align-items: start; align-content: start;') && frontend.includes('.dg-asset-lightbox-stage { min-width: 0; min-height: 0; height: auto;'), 'asset lightbox stage must size to its image on desktop')
assert(frontend.includes('grid-template-rows: auto auto; min-height: 0; max-height: calc(100dvh - 72px);') && frontend.includes('max-height: min(72dvh, calc(100dvh - 230px));'), 'mobile asset lightbox must constrain content without an oversized empty stage')

console.log('Image lightbox zoom smoke passed.')
