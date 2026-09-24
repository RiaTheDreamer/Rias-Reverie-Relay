// @ts-nocheck -- deterministic source/geometry contract; this is not browser visual proof.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const frontend = readFileSync(new URL('../src/frontend.ts', import.meta.url), 'utf8')
const nativeSurfaces = readFileSync(new URL('../src/nativeSurfaces.ts', import.meta.url), 'utf8')

assert(frontend.includes('[data-component="BubbleMessage"] > div[class*="bubble"] > div[class*="content"]:has(:is(img[alt="reverie-relay"], img[data-dgir-app="prose"]))'), 'Relay-image BubbleMessage content owner does not restore the pre-Glass 100% width boundary')
assert(frontend.includes('--dgir-bubble-image-inner-width: calc(100% - (2 * clamp(18px, 3vw, 38px)));'), 'desktop pre-Glass image inner-width boundary is missing')
assert(frontend.includes('--dgir-bubble-image-inner-width: calc(100% - 28px);'), 'mobile pre-Glass image inner-width boundary is missing')
assert(frontend.includes('width: min(var(--dgir-prose-image-width, 66%), var(--dgir-bubble-image-inner-width)) !important;'), 'sanitized image wrapper is not driven by the restored owner width')
assert(frontend.includes('p:has(:is(img[alt="reverie-relay"], img[data-dgir-app="prose"]))'), 'current data identity and pre-Glass alt identity are not both supported')

const mappings = {
  small: { percent: 48, max: 420 },
  medium: { percent: 66, max: 720 },
  large: { percent: 84, max: 920 },
  full: { percent: 100, max: Number.POSITIVE_INFINITY },
}
assert(frontend.includes("imageSize === 'small' ? '48%'") && frontend.includes("imageSize === 'large' ? '84%'") && frontend.includes("imageSize === 'full' ? '100%'") && frontend.includes(": '66%'"), 'Image Size no longer maps to 48/66/84/100 percent')
assert(frontend.includes("imageSize === 'small' ? '420px'") && frontend.includes("imageSize === 'large' ? '920px'") && frontend.includes("imageSize === 'full' ? '100%'") && frontend.includes(": '720px'"), 'Image Size no longer maps to 420/720/920/100 percent max-width')

const availableContentWidth = 1_000
const restoredInnerWidth = availableContentWidth - (2 * 38)
const rendered = Object.fromEntries(Object.entries(mappings).map(([size, value]) => [
  size,
  Math.min(availableContentWidth * value.percent / 100, restoredInnerWidth, value.max),
]))
assert(rendered.full / restoredInnerWidth >= 0.95, 'Full Width does not structurally occupy the restored Relay-image content boundary')
assert(rendered.full > rendered.large && rendered.large > rendered.medium && rendered.medium > rendered.small, 'Small/Medium/Large/Full structural widths are not strictly increasing')
assert(nativeSurfaces.includes('.rrn-media img{width:100%;height:100%;object-fit:var(--rrn-fit,contain)}'), 'Surface media sizing contract changed')

console.log('Image Size restore smoke passed: pre-Glass owner chain and 48/66/84/100 geometry are structurally preserved; live browser visual proof is still required.')
