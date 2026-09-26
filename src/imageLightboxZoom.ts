export interface ImageLightboxZoom {
  scale: number
  x: number
  y: number
}

export interface ImageLightboxBounds {
  imageWidth: number
  imageHeight: number
  viewportWidth: number
  viewportHeight: number
}

export interface ImageLightboxPoint {
  x: number
  y: number
}

export const INITIAL_IMAGE_LIGHTBOX_ZOOM: ImageLightboxZoom = { scale: 1, x: 0, y: 0 }
export const MAX_IMAGE_LIGHTBOX_ZOOM = 4

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

export function constrainImageLightboxZoom(zoom: ImageLightboxZoom, bounds: ImageLightboxBounds): ImageLightboxZoom {
  const scale = clamp(Number.isFinite(zoom.scale) ? zoom.scale : 1, 1, MAX_IMAGE_LIGHTBOX_ZOOM)
  if (scale <= 1 || bounds.imageWidth <= 0 || bounds.imageHeight <= 0 || bounds.viewportWidth <= 0 || bounds.viewportHeight <= 0) {
    return { ...INITIAL_IMAGE_LIGHTBOX_ZOOM }
  }
  const maxX = Math.max(0, (bounds.imageWidth * scale - bounds.viewportWidth) / 2)
  const maxY = Math.max(0, (bounds.imageHeight * scale - bounds.viewportHeight) / 2)
  return {
    scale,
    x: clamp(Number.isFinite(zoom.x) ? zoom.x : 0, -maxX, maxX),
    y: clamp(Number.isFinite(zoom.y) ? zoom.y : 0, -maxY, maxY),
  }
}

export function pinchImageLightboxZoom(
  startZoom: ImageLightboxZoom,
  startDistance: number,
  distance: number,
  startPoint: ImageLightboxPoint,
  point: ImageLightboxPoint,
  bounds: ImageLightboxBounds,
): ImageLightboxZoom {
  if (!(startDistance > 0) || !(distance > 0)) return constrainImageLightboxZoom(startZoom, bounds)
  const scale = clamp(startZoom.scale * distance / startDistance, 1, MAX_IMAGE_LIGHTBOX_ZOOM)
  const ratio = scale / startZoom.scale
  return constrainImageLightboxZoom({
    scale,
    x: point.x - (startPoint.x - startZoom.x) * ratio,
    y: point.y - (startPoint.y - startZoom.y) * ratio,
  }, bounds)
}

type ZoomPointSource = { clientX: number; clientY: number }
type TouchPair = { 0: ZoomPointSource; 1: ZoomPointSource; length: number }
type GestureLikeEvent = Event & { clientX?: number; clientY?: number; scale?: number }

/** Attach zoom/pan only to one lightbox image and its clipping viewport. */
export function bindImageLightboxZoom(image: HTMLImageElement, viewport: HTMLElement): () => void {
  let zoom = { ...INITIAL_IMAGE_LIGHTBOX_ZOOM }
  let source = image.currentSrc || image.src
  let lastPointerPoint: ImageLightboxPoint | undefined
  let pointerPan: { id: number; point: ImageLightboxPoint; zoom: ImageLightboxZoom } | undefined
  let touchPinch: { distance: number; point: ImageLightboxPoint; zoom: ImageLightboxZoom } | undefined
  let touchPan: { point: ImageLightboxPoint; zoom: ImageLightboxZoom } | undefined
  let gestureStart: { point: ImageLightboxPoint; zoom: ImageLightboxZoom } | undefined

  const uiScale = (): number => {
    const view = image.ownerDocument?.defaultView
    const value = Number.parseFloat(view?.getComputedStyle(image.ownerDocument.documentElement).getPropertyValue('--lumiverse-ui-scale') || '')
    return Number.isFinite(value) && value > 0 ? value : 1
  }
  const bounds = (): ImageLightboxBounds => {
    const unit = uiScale()
    return {
      imageWidth: image.offsetWidth / unit,
      imageHeight: image.offsetHeight / unit,
      viewportWidth: viewport.clientWidth / unit,
      viewportHeight: viewport.clientHeight / unit,
    }
  }
  const pointAt = (event: ZoomPointSource): ImageLightboxPoint => {
    const rect = viewport.getBoundingClientRect()
    const unit = uiScale()
    return {
      x: (event.clientX - (rect.left + rect.width / 2)) / unit,
      y: (event.clientY - (rect.top + rect.height / 2)) / unit,
    }
  }
  const apply = (next: ImageLightboxZoom): void => {
    zoom = constrainImageLightboxZoom(next, bounds())
    if (zoom.scale === 1) {
      image.style.transform = ''
      image.style.willChange = ''
      image.classList.remove('dg-image-lightbox-zoomed')
    } else {
      image.style.transform = `translate3d(${zoom.x}px, ${zoom.y}px, 0) scale(${zoom.scale})`
      image.style.willChange = 'transform'
      image.classList.add('dg-image-lightbox-zoomed')
    }
  }
  const zoomAround = (scale: number, point: ImageLightboxPoint): void => {
    const boundedScale = clamp(scale, 1, MAX_IMAGE_LIGHTBOX_ZOOM)
    const ratio = boundedScale / zoom.scale
    apply({
      scale: boundedScale,
      x: point.x - (point.x - zoom.x) * ratio,
      y: point.y - (point.y - zoom.y) * ratio,
    })
  }
  const midpoint = (first: ZoomPointSource, second: ZoomPointSource): ImageLightboxPoint => pointAt({
    clientX: (first.clientX + second.clientX) / 2,
    clientY: (first.clientY + second.clientY) / 2,
  })
  const pairDistance = (first: ZoomPointSource, second: ZoomPointSource): number =>
    Math.hypot(first.clientX - second.clientX, first.clientY - second.clientY) / uiScale()
  const touchPair = (event: TouchEvent): TouchPair | undefined => event.touches.length >= 2
    ? [event.touches[0], event.touches[1]] as unknown as TouchPair
    : undefined
  const onWheel = (rawEvent: Event): void => {
    const event = rawEvent as WheelEvent
    event.preventDefault()
    const sensitivity = event.deltaMode === 1 ? 0.04 : event.deltaMode === 2 ? 0.2 : event.ctrlKey ? 0.01 : 0.002
    zoomAround(zoom.scale * Math.exp(-event.deltaY * sensitivity), pointAt(event))
    lastPointerPoint = pointAt(event)
  }
  const onGestureStart = (rawEvent: Event): void => {
    const event = rawEvent as GestureLikeEvent
    if (touchPinch) return
    event.preventDefault()
    const point = typeof event.clientX === 'number' && typeof event.clientY === 'number'
      ? pointAt(event as ZoomPointSource)
      : lastPointerPoint || { x: 0, y: 0 }
    gestureStart = { point, zoom: { ...zoom } }
  }
  const onGestureChange = (rawEvent: Event): void => {
    const event = rawEvent as GestureLikeEvent
    if (touchPinch || !gestureStart || !(Number(event.scale) > 0)) return
    event.preventDefault()
    const point = typeof event.clientX === 'number' && typeof event.clientY === 'number'
      ? pointAt(event as ZoomPointSource)
      : gestureStart.point
    const scale = clamp(gestureStart.zoom.scale * Number(event.scale), 1, MAX_IMAGE_LIGHTBOX_ZOOM)
    const ratio = scale / gestureStart.zoom.scale
    apply({
      scale,
      x: point.x - (gestureStart.point.x - gestureStart.zoom.x) * ratio,
      y: point.y - (gestureStart.point.y - gestureStart.zoom.y) * ratio,
    })
  }
  const onGestureEnd = (): void => { gestureStart = undefined }
  const onTouchStart = (event: TouchEvent): void => {
    const pair = touchPair(event)
    if (pair) {
      event.preventDefault()
      touchPan = undefined
      touchPinch = { distance: pairDistance(pair[0], pair[1]), point: midpoint(pair[0], pair[1]), zoom: { ...zoom } }
      return
    }
    if (event.touches.length === 1 && zoom.scale > 1) {
      event.preventDefault()
      const touch = event.touches[0]
      touchPan = { point: pointAt(touch), zoom: { ...zoom } }
    }
  }
  const onTouchMove = (event: TouchEvent): void => {
    const pair = touchPair(event)
    if (pair && touchPinch) {
      event.preventDefault()
      apply(pinchImageLightboxZoom(touchPinch.zoom, touchPinch.distance, pairDistance(pair[0], pair[1]), touchPinch.point, midpoint(pair[0], pair[1]), bounds()))
      return
    }
    if (event.touches.length === 1 && touchPinch && zoom.scale > 1) {
      const touch = event.touches[0]
      touchPinch = undefined
      touchPan = { point: pointAt(touch), zoom: { ...zoom } }
      event.preventDefault()
      return
    }
    if (event.touches.length === 1 && touchPan && zoom.scale > 1) {
      event.preventDefault()
      const point = pointAt(event.touches[0])
      apply({ scale: touchPan.zoom.scale, x: touchPan.zoom.x + point.x - touchPan.point.x, y: touchPan.zoom.y + point.y - touchPan.point.y })
    }
  }
  const onTouchEnd = (event: TouchEvent): void => {
    if (event.touches.length === 1 && zoom.scale > 1) {
      touchPinch = undefined
      touchPan = { point: pointAt(event.touches[0]), zoom: { ...zoom } }
    } else if (event.touches.length < 2) {
      touchPinch = undefined
      if (event.touches.length === 0) touchPan = undefined
    }
  }
  const onPointerDown = (event: PointerEvent): void => {
    if (event.pointerType !== 'mouse' || event.button !== 0 || zoom.scale <= 1) return
    event.preventDefault()
    const point = pointAt(event)
    lastPointerPoint = point
    pointerPan = { id: event.pointerId, point, zoom: { ...zoom } }
    try { image.setPointerCapture(event.pointerId) } catch { /* Detached modal image: no pointer capture is available. */ }
  }
  const onPointerMove = (event: PointerEvent): void => {
    const point = pointAt(event)
    lastPointerPoint = point
    if (!pointerPan || event.pointerId !== pointerPan.id) return
    event.preventDefault()
    apply({ scale: pointerPan.zoom.scale, x: pointerPan.zoom.x + point.x - pointerPan.point.x, y: pointerPan.zoom.y + point.y - pointerPan.point.y })
  }
  const stopPointerPan = (event: PointerEvent): void => {
    if (!pointerPan || event.pointerId !== pointerPan.id) return
    const id = pointerPan.id
    pointerPan = undefined
    try { if (image.hasPointerCapture(id)) image.releasePointerCapture(id) } catch { /* Modal may have been detached during the gesture. */ }
  }
  const onImageLoad = (): void => {
    const nextSource = image.currentSrc || image.src
    if (nextSource && nextSource !== source) {
      source = nextSource
      pointerPan = undefined
      touchPinch = undefined
      touchPan = undefined
      gestureStart = undefined
      apply({ ...INITIAL_IMAGE_LIGHTBOX_ZOOM })
    }
  }

  image.style.touchAction = 'none'
  image.style.userSelect = 'none'
  image.draggable = false
  image.addEventListener('wheel', onWheel, { passive: false })
  image.addEventListener('gesturestart', onGestureStart as EventListener, { passive: false })
  image.addEventListener('gesturechange', onGestureChange as EventListener, { passive: false })
  image.addEventListener('gestureend', onGestureEnd)
  image.addEventListener('touchstart', onTouchStart, { passive: false })
  image.addEventListener('touchmove', onTouchMove, { passive: false })
  image.addEventListener('touchend', onTouchEnd)
  image.addEventListener('touchcancel', onTouchEnd)
  image.addEventListener('pointerdown', onPointerDown)
  image.addEventListener('pointermove', onPointerMove)
  image.addEventListener('pointerup', stopPointerPan)
  image.addEventListener('pointercancel', stopPointerPan)
  image.addEventListener('lostpointercapture', stopPointerPan)
  image.addEventListener('load', onImageLoad)

  return () => {
    pointerPan = undefined
    image.removeEventListener('wheel', onWheel)
    image.removeEventListener('gesturestart', onGestureStart as EventListener)
    image.removeEventListener('gesturechange', onGestureChange as EventListener)
    image.removeEventListener('gestureend', onGestureEnd)
    image.removeEventListener('touchstart', onTouchStart)
    image.removeEventListener('touchmove', onTouchMove)
    image.removeEventListener('touchend', onTouchEnd)
    image.removeEventListener('touchcancel', onTouchEnd)
    image.removeEventListener('pointerdown', onPointerDown)
    image.removeEventListener('pointermove', onPointerMove)
    image.removeEventListener('pointerup', stopPointerPan)
    image.removeEventListener('pointercancel', stopPointerPan)
    image.removeEventListener('lostpointercapture', stopPointerPan)
    image.removeEventListener('load', onImageLoad)
  }
}
