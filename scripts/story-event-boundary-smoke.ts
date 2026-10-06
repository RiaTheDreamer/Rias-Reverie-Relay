// @ts-nocheck -- Static event-wiring contract for historical chat-open replay safety.
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const backend = await readFile(new URL('../src/backend.ts', import.meta.url), 'utf8')
const sentStart = backend.indexOf("spindle.on('MESSAGE_SENT'")
const sentEnd = backend.indexOf('// Rendering is not a fresh-generation signal', sentStart)
assert(sentStart >= 0 && sentEnd > sentStart, 'MESSAGE_SENT replay handler boundary must remain identifiable')
const messageSentHandler = backend.slice(sentStart, sentEnd)
assert(!messageSentHandler.includes('scheduleStoryAnalysis'), 'replayed MESSAGE_SENT events must never start Event Sidecar analysis')

const generationStart = backend.indexOf('async function handleGenerationEnded(')
const generationEnd = backend.indexOf('\nasync function recordLifecycleEvent(', generationStart)
assert(generationStart >= 0 && generationEnd > generationStart, 'fresh generation handler boundary must remain identifiable')
const generationHandler = backend.slice(generationStart, generationEnd)
assert(generationHandler.includes('if (config.storyConstellationsEnabled && completed'), 'automatic analysis must remain feature gated')
assert(generationHandler.includes('scheduleStoryAnalysis({ chatId: cleanString(payload.chatId), message: completed'), 'completed generated prose is analyzed at the fresh boundary')
assert(generationHandler.includes('completed.parent_message_id'), 'user prose is reached only through an explicit message-parent link')
assert(generationHandler.includes("parent?.role === 'user'"), 'only a validated user parent may be analyzed with its generated response')

console.log('PASS story event boundary: chat-open MESSAGE_SENT replay is inert; completed generations alone schedule assistant and explicit parent-user analysis')
