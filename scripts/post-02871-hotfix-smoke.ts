// @ts-nocheck -- focused contracts for the post-0.2.8.7.1 live hotfix.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { countCurrentChatOverview } from '../src/slotLifecycle'

const records = [
  { chatId: 'active', status: 'generating' },
  { chatId: 'active', status: 'placement-pending' },
  { chatId: 'active', status: 'completed' },
  { chatId: 'active', status: 'failed' },
  { chatId: 'other', status: 'generating' },
  { chatId: 'other', status: 'completed' },
] as any
assert.deepEqual(countCurrentChatOverview(records, 'active'), { processing: 1, readyToPlace: 1, failed: 1, completed: 1 })

const lifecycle = [{ chatId: 'active', status: 'generating' }] as any
assert.deepEqual(countCurrentChatOverview(lifecycle, 'active'), { processing: 1, readyToPlace: 0, failed: 0, completed: 0 })
lifecycle[0].status = 'placement-pending'
assert.deepEqual(countCurrentChatOverview(lifecycle, 'active'), { processing: 0, readyToPlace: 1, failed: 0, completed: 0 })
lifecycle[0].status = 'completed'
assert.deepEqual(countCurrentChatOverview(lifecycle, 'active'), { processing: 0, readyToPlace: 0, failed: 0, completed: 1 })

const frontend = readFileSync(new URL('../src/frontend.ts', import.meta.url), 'utf8')
const overview = frontend.slice(frontend.indexOf('function countStatuses'), frontend.indexOf('function canReparse'))
assert(overview.includes('countCurrentChatOverview(records, activeChatId)'), 'Current Chat Overview is not scoped through lifecycle semantics')
assert(!overview.includes('stats.completedTotal'), 'Current Chat Overview still uses the lifetime archive total')
assert(!frontend.includes('setProperty(\'--dgir-prose-bubble-inner-width\''), 'Image Size still widens the prose bubble contract')
assert(!frontend.includes('[data-component="BubbleMessage"] > div[class*="bubble"] > div[class*="content"]:has(img'), 'Relay still overrides BubbleMessage/content width for prose images')
assert(frontend.includes('img[data-dgir-app="prose"][data-dgir-prose-size="full"] { flex-basis: 100% !important; width: 100% !important; max-width: none !important;'), 'Full Width lacks an image-only 100% rule')
assert(frontend.includes(':is(span, a):has(> img[data-dgir-app="prose"][data-dgir-prose-size="full"])'), 'Full Width lacks a realistic sanitized image-wrapper rule')
assert(frontend.includes('image.dataset.dgirProseSize = size') && frontend.includes('applyLiveProseImagePresentation(image)'), 'mounted prose images do not receive live size metadata')

const nativeSurfaces = readFileSync(new URL('../src/nativeSurfaces.ts', import.meta.url), 'utf8')
assert(nativeSurfaces.includes('.rrn-media img{width:100%;height:100%;object-fit:var(--rrn-fit,contain)}'), 'Surface media sizing contract changed or disappeared')

console.log('post-0.2.8.7.1 hotfix smoke passed: current-chat buckets are exclusive and chat-scoped; lifetime completion is excluded; Full Width targets only live-bound prose images/wrappers; Surface media sizing remains unchanged.')
