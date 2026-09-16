// @ts-nocheck -- Deterministic host harness; the repo intentionally omits Node ambient types.
import assert from 'node:assert/strict'

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

console.log(`Completed-history Windows path smoke passed: ${path}`)
