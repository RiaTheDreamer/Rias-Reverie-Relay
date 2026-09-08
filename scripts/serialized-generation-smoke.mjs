import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const read = file => fs.readFileSync(path.join(root, file), 'utf8')
const assert = (ok, message) => { if (!ok) throw new Error(message) }

const backend = read('src/backend.ts')
const frontend = read('src/frontend.ts')
const backendLf = backend.replace(/\r\n/g, '\n')

assert(backend.includes('const imageGenerationLanes = new Map<string, ImageGenerationLane>()'), 'shared provider generation lane is missing')
assert(backend.includes('await acquireImageGenerationLane(userId, context, controller)'), 'ImageGen calls do not acquire the shared serialized lane')
assert(backend.includes('Queued behind the current image. Relay will start this one next.'), 'queued image status is missing')
assert(backend.includes("source: job.target === 'prose.illustration' ? 'relay-illustrator' : 'relay-slot'"), 'illustrations and surface images no longer share the generation path')
assert(backend.includes("source: 'relay-slot' | 'relay-illustrator' | 'relay-candidate'"), 'retained generation stream sources disappeared')
assert(backendLf.includes("if (!result) {\n      sendImageStreamEvent"), 'stream-without-result fallback is missing')
assert(frontend.includes('const lastActivityAt = Math.max') && frontend.includes('stream?.updatedAt || 0'), 'queued stream activity does not prevent false stalled cards')

assert(backend.includes('export function proseAnalysisText'), 'mixed prose/surface sanitizer is missing')
assert(backend.includes('PROSE_NON_NARRATIVE_ROOTS') && backend.includes('...NATIVE_SURFACE_ROOT_TAGS'), 'surface roots are not removed before Relay-Planned analysis')
assert(!backend.includes("if (settings.skipContinuation && input.generationType === 'continue') return []"), 'Continue generations are still blocked from Relay-Planned')
assert(!backend.includes("if (settings.skipImpersonation && input.generationType === 'impersonate') return []"), 'Impersonation generations are still blocked from Relay-Planned')
assert(backend.includes('skipContinuation: false') && backend.includes('skipImpersonation: false'), 'retired roleplay skip flags are not migrated off')
assert(!frontend.includes('Skip Continue Fragments') && !frontend.includes('Skip Impersonation'), 'retired roleplay skip toggles remain visible')

globalThis.spindle = {
  registerMessageContentProcessor: undefined,
  registerInterceptor: undefined,
  registerMacro: () => undefined,
  on: () => undefined,
  onFrontendMessage: () => undefined,
  log: { info: () => undefined, warn: () => undefined, error: () => undefined },
}
const compiled = await import(`../dist/backend.js?serialized-smoke=${Date.now()}`)
const narrative = 'He caught the falling glass before it reached the floor, then stayed close enough that neither of them could pretend the moment was ordinary.\n\nShe took the glass back and changed the subject, but the room had already shifted around them.'
const surface = '<kakao_chat title="Friends" date="Friday" time="18:42" unread="1"><participants><k_part name="Character A" avatar="M" color="#555555"/></participants><messages><k_msg sender="Character A" avatar="M" color="#555555" time="18:42" side="left" read="READ">Look.</k_msg><image_request id="surface-one" target="kakao.image" slot="chat-image" aspect="4:5" alt="Shared image"><scene_brief>A candid photograph.</scene_brief></image_request></messages></kakao_chat>'
const eligibilitySettings = { skipUtilities: true, skipOoc: true, skipTestFixtures: true, skipShortMessages: true, minimumMessageLength: 80 }
assert(compiled.isEligibleProseContent(`${narrative}\n\n${surface}`, eligibilitySettings) === true, 'normal prose containing a surface is still rejected by Relay-Planned')
assert(compiled.isEligibleProseContent(surface, eligibilitySettings) === false, 'utility-only output is incorrectly treated as narrative prose')
assert(!compiled.proseAnalysisText(`${narrative}\n\n${surface}`).includes('kakao_chat'), 'surface XML leaks into Relay-Planned narrative analysis')

console.log('serialized generation and relay-planned smoke ok')
