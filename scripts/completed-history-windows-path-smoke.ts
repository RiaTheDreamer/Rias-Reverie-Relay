// @ts-nocheck -- Deterministic host harness; the repo intentionally omits Node ambient types.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

;(globalThis as any).spindle = {
  registerMessageContentProcessor() {}, registerMacro() {}, on() {}, onFrontendMessage() {}, sendToFrontend() {},
  log: { info() {}, warn() {}, error() {} }, toast: { info() {}, success() {}, warning() {}, error() {} },
}

const { completedDiagnosticPath, safeStorageSegment } = await import('../src/backend')
const windowsInvalid = /[<>:"/\\|?*]/

assert.equal(safeStorageSegment('36:389a4b48'), '36-389a4b48', 'the live fingerprint must become a Windows-safe storage segment')

const path = completedDiagnosticPath('x'.repeat(36), 'archive:bad/\\?*"<>|id')
const segments = path.split('/')
assert.equal(segments.length, 4, `completed diagnostic path shape changed: ${path}`)
assert.equal(segments[0], 'completed-history')
assert.equal(segments[2], 'diagnostics')
assert(!segments[1].includes(':'), `raw fingerprint leaked into the chat directory: ${path}`)
assert(!segments[1].includes('36:389a4b48'), `live fingerprint leaked into the chat directory: ${path}`)
assert(!windowsInvalid.test(segments[1]), `chat storage segment is not Windows-safe: ${segments[1]}`)
assert(!windowsInvalid.test(segments[3]), `archive storage segment is not Windows-safe: ${segments[3]}`)

const backendSource = readFileSync(new URL('../src/backend.ts', import.meta.url), 'utf8')
const frontendSource = readFileSync(new URL('../src/frontend.ts', import.meta.url), 'utf8')
const completedStateSource = readFileSync(new URL('../src/completedState.ts', import.meta.url), 'utf8')
assert.match(backendSource, /readCompletedDiagnostic\(chatId, archiveId, userId\)[\s\S]{0,300}record: diagnostic\?\.record/, 'completed diagnostic response must expose the archived production record')
assert.match(backendSource, /async function getRecordByKey[\s\S]{0,900}readCompletedDiagnostic\(chatId, archiveId, userId\)/, 'completed slot actions must hydrate through the production archive reader')
assert.match(frontendSource, /requestCompletedRecord[\s\S]{0,900}completed_diagnostic/, 'completed-image diagnostics and local actions must request the archived production record')
assert.match(completedStateSource, /diagnosticArchiveId: compact\.diagnosticArchiveId/, 'hot completed records must retain the archive key after compaction')

console.log(`Completed-history Windows path smoke passed: ${path}`)
