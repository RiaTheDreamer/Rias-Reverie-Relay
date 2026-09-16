// @ts-nocheck -- Local mocked Smartphone repair regression harness.
import type { CustomSurfaceStudioState } from '../src/contracts'
import { DEFAULT_SURFACE_PROMPT_MODULES } from '../src/protocols'
import { R45_UTILITY_CONTRACTS } from '../src/r45UtilityContracts'
import { renderNativeSurfaceMarkup } from '../src/nativeSurfaces'
import { SHIPPED_SURFACE_SPECS } from '../src/shippedSurfaceDefinitions'
import { completeSurfaceSpecs, normalizeSurfaceBlock } from '../src/surfaceXml'
import { r45SupplementalSurfaceDefinitions } from '../src/r45SurfaceCatalog'

function assert(value: unknown, reason: string): asserts value { if (!value) throw new Error(reason) }

const studio: CustomSurfaceStudioState = {
  definitions: {},
  activePresetIds: {},
  collectionPresets: {},
  rendererMode: 'relay',
  defaultShellMode: 'plain',
  colorMode: 'realistic',
  utilityInjectionEnabled: true,
  utilityInjectionPosition: 'after-chat-history',
  utilityTemplate: '',
  validationErrors: {},
  lastInjectedModuleIds: [],
  lastInjectionAt: 0,
  lastInjectionSource: 'none',
  lastInjectionPosition: 'none',
  lastInjectionSummary: '',
  updatedAt: 1,
}

const smartphoneSpec = completeSurfaceSpecs(SHIPPED_SURFACE_SPECS).find(spec => spec.id === 'smartphone')
assert(smartphoneSpec, 'Smartphone normalization spec missing')

function phone(body: string): string {
  return `<smart_phone sender="Contact A" initial="C" time="19:13" day="Thursday" battery="62%"><messages>${body}</messages></smart_phone>`
}

function assertPhoneRenders(markup: string, label: string, expected: string[]): void {
  const normalized = normalizeSurfaceBlock(markup, smartphoneSpec!)
  assert(!normalized.diagnostics.length, `${label}: Smartphone normalization failed: ${normalized.diagnostics.join('; ')}`)
  assert(normalized.markup.includes('<messages>'), `${label}: canonical messages region missing`)
  assert(!/<\/s_recv>\s*<\/s_sent>|<\/s_sent>\s*<\/s_recv>/i.test(normalized.markup), `${label}: crossed message closers leaked after normalization`)
  const rendered = renderNativeSurfaceMarkup(markup, studio, { chatId: 'offline-phone-repair', messageId: label })
  assert(rendered.renderedSurfaceIds.includes('smartphone'), `${label}: Smartphone surface ID was not resolved`)
  assert(!rendered.content.includes('Relay Surface needs repair'), `${label}: deterministic message drift fell into repair fallback`)
  for (const text of expected) assert(rendered.content.includes(text), `${label}: rendered output lost message text "${text}"`)
}

assertPhoneRenders(phone('<s_recv time="19:13" sender="Contact A">hello</s_sent>'), 'recv-closed-as-sent', ['hello'])
assertPhoneRenders(phone('<s_sent time="19:14">hello back</s_recv>'), 'sent-closed-as-recv', ['hello back'])
assertPhoneRenders(
  phone('<s_recv time="19:12">valid first</s_recv><s_recv time="19:13" sender="Contact A">broken middle</s_sent><s_sent time="19:14">valid third</s_sent>'),
  'malformed-message-among-valid-siblings',
  ['valid first', 'broken middle', 'valid third'],
)
assertPhoneRenders(
  phone('<s_recv time="19:12">obvious missing close<s_sent time="19:13">next message</s_sent>'),
  'missing-close-before-next-message',
  ['obvious missing close', 'next message'],
)
assertPhoneRenders(
  phone('</s_recv><s_recv time="19:12">orphan was ignored</s_recv></s_sent><s_sent time="19:13">reply survived</s_sent>'),
  'orphaned-message-closing-tags',
  ['orphan was ignored', 'reply survived'],
)

const ambiguous = phone('<s_recv time="19:12"><rr_unclosed_noise>ambiguous nested corruption</s_sent><s_sent time="19:13">still not enough</s_sent>')
const ambiguousRender = renderNativeSurfaceMarkup(ambiguous, studio, { chatId: 'offline-phone-repair', messageId: 'ambiguous-nesting' })
assert(ambiguousRender.content.includes('Format error') && ambiguousRender.content.includes('data-rrn-action="edit-surface"'), 'ambiguous nested Smartphone corruption should still expose the repair inspector')

const utilityText = R45_UTILITY_CONTRACTS.smartphone
const promptText = r45SupplementalSurfaceDefinitions().find(row => row.baseSurfaceId === 'smartphone')?.promptModule || DEFAULT_SURFACE_PROMPT_MODULES.smartphone
assert(utilityText.includes('[smart_phone]') && utilityText.includes('[s_recv]') && utilityText.includes('[s_sent]') && utilityText.includes('[messages]'), 'R4.5 Smartphone Utility must teach the active bracket-native message contract')
assert(promptText.includes('same co-present characters') && promptText.includes('[s_recv]') && promptText.includes('BRACKET ROOT'), 'active bracket Smartphone prompt must preserve both co-presence anti-trigger guidance and structural grammar')

console.log('Smartphone message repair smoke passed: mismatched closers, missing close, orphan close, sibling isolation, fallback boundary, and Utility hardening verified.')
