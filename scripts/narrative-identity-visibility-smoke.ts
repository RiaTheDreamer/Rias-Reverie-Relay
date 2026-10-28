// @ts-nocheck -- Mounted production renderers; no model or image-provider calls.
import { strict as assert } from 'node:assert'
import { JSDOM } from 'jsdom'
import {
  NARRATIVE_REGEX_VARIANTS, narrativeRegexScripts, normalizeNarrativeMarkupForRendering, renderNarrativeRegex,
} from '../src/narrativeRegexAssets'
import { extractNarrativeLorebookRecord } from '../src/narrativeLorebook'
import { xmlNarrativeAsLegacy } from '../src/xmlSurfaceFormat'

const name = 'Han Seo-yun (한서윤)'
const visible = "a tall woman in a canvas carpenter's apron"
const place = 'the Mapo Supernatural Community Hall'
const media = '<img src="/fixture/portrait.png" alt="Existing portrait">'
const intro = (image: string) => `<NPC tier="SUPPORT" name="${name}"><npc_media>${image}</npc_media>
b: ${name} | 29 | Meetup Coordinator
a: crimson irises | olive apron
p: brisk | protective of privacy
h: established history
r: keeps the hall open
</NPC>`
const fixtures = [
  { id: 'character-dossier', phrase: visible, before: 'Porcelain clatters as ', after: ' steps through the archway.', lorebook: 'character-dossier',
    source: image => `<npc visible="${visible}" tier="side"><npc_media>${image}</npc_media>»» side\n» name · role | ${name} · Meetup Coordinator\n» look | olive apron</npc>` },
  { id: 'location-file', phrase: place, before: 'Sunlight bakes the courtyard of ', after: ', where the double doors stand open.', lorebook: 'location-file',
    source: image => `<place visible="${place}"><place_media>${image}</place_media>»» identity\n» name · kind | Mapo Supernatural Community Hall · peer sanctuary\n» routes | two open exits</place>` },
  { id: 'cast-introduction', phrase: name, before: 'The coordinator, ', after: ', waves them inside.', lorebook: 'cast-introduction', source: intro },
  { id: 'cast-introduction', phrase: name, before: 'The returning coordinator, ', after: ', has a larger role.',
    source: image => intro(image).replace(`<NPC tier="SUPPORT" name="${name}">`, `<NPC action="UP" name="${name}" tier="SUPPORT">`) },
  { id: 'cast-introduction', phrase: name, before: 'Nearby, ', after: ' watches the exits.', source: () => `<NPC_REF name="${name}" cue="olive apron" mood="alert"/>` },
  { id: 'cast-introduction', phrase: name, before: 'For ', after: ', their trust has changed.', source: () => `<NPC_REL name="${name}" change="trust deepens"/>` },
]

function mount(html: string) {
  // Rendering CSS is inspected in the browser; skip JSDOM's unsupported modern
  // CSS parser here so the DOM contract failures stay readable.
  return new JSDOM(`<main>${html.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')}</main>`).window.document
}

function proseOnly(document: Document) {
  const clone = document.querySelector('main')!.cloneNode(true) as Element
  clone.querySelectorAll('details').forEach(node => node.remove())
  return clone.textContent
}

let cases = 0
for (const variant of NARRATIVE_REGEX_VARIANTS) for (const color of ['realistic', 'primary', 'glass'] as const) {
  for (const legacy of [false, true]) for (const image of ['', media]) for (const fixture of fixtures) {
    const owner = legacy ? xmlNarrativeAsLegacy(fixture.source(image)) : fixture.source(image)
    const source = fixture.before + owner + fixture.after
    const html = renderNarrativeRegex(source, variant, 'identity-message', { chatId: 'identity-chat', swipeId: 2 }, color)
    const document = mount(html)
    const echoes = document.querySelectorAll('[data-reverie-narrative-identity]')
    assert.equal(echoes.length, 1, `${variant}/${color}/${fixture.id}: missing or repeated visible identity`)
    const echo = echoes[0]
    assert.equal(echo.textContent, fixture.phrase, 'Do not substitute the full name for the authored visible description')
    assert.equal(echo.getAttribute('data-reverie-narrative-identity'), fixture.id)
    assert.equal(echo.closest('details'), null, 'Identity must not be hidden by the launcher')
    assert.equal(echo.closest('[hidden],[aria-hidden="true"]'), null)
    assert.equal(proseOnly(document), fixture.before + fixture.phrase + fixture.after, 'Story grammar or punctuation changed')
    const details = document.querySelector('details')!
    assert(details, 'Existing Surface launcher was removed')
    assert.equal(details.hasAttribute('open'), variant === 'inline')
    // Open/close does not move or erase the phrase; no image is cloned into it.
    details.setAttribute('open', '')
    assert.equal(proseOnly(document), fixture.before + fixture.phrase + fixture.after)
    details.removeAttribute('open')
    assert.equal(proseOnly(document), fixture.before + fixture.phrase + fixture.after)
    assert.equal(echo.querySelector('img'), null)
    if (fixture.lorebook) {
      assert.equal(document.querySelectorAll('button[data-rrn-action="export-lorebook"]').length, 1, `${variant}/${color}/${fixture.id}: lorebook action missing`)
      assert.equal(document.querySelector('button[data-rrn-action]')!.getAttribute('data-rrn-swipe-id'), '2')
      assert(extractNarrativeLorebookRecord(owner, fixture.lorebook), 'Lorebook extraction regressed')
      assert.equal(details.querySelectorAll('img').length, image ? 1 : 0, 'Media ownership changed')
    }
    // A later host display pass must not add a second phrase to rendered HTML.
    assert.equal(renderNarrativeRegex(html, variant, 'identity-message', {}, color), html)
    cases++
  }
}

// Imported/native Regexes use the same assembled replacement, not a direct-
// render-only fix. Encoded characters remain literal text, never HTML nodes.
const encoded = '<place visible="R&amp;D &lt;Annex&gt; &quot;North&quot;"><place_media></place_media>» routes | east gate</place>'
for (const variant of NARRATIVE_REGEX_VARIANTS) {
  const script = narrativeRegexScripts(variant).find(row => row.script_id === 'relay_shenanigans_location_images_sparkle_v1')!
  const rendered = normalizeNarrativeMarkupForRendering(encoded).replace(new RegExp(script.find_regex, script.flags), script.replace_string)
  const document = mount(rendered)
  const echo = document.querySelector('[data-reverie-narrative-identity]')!
  assert.equal(echo?.textContent, 'R&D <Annex> "North"')
  assert.equal(echo.children.length, 0)
}

const twins = `${fixtures[0].source('')} and ${fixtures[0].source('')}`
const twinDocument = mount(renderNarrativeRegex(twins, 'plain-button', 'twins'))
assert.equal(twinDocument.querySelectorAll('[data-reverie-narrative-identity]').length, 2)
assert.deepEqual([...twinDocument.querySelectorAll('[data-rrn-lorebook-index]')].map(node => node.getAttribute('data-rrn-lorebook-index')), ['0', '1'])

// Exercise the real Lumiverse content-processor registration and cache boundary,
// not just its render helper. The host/storage/provider interfaces are local.
let processor: (context: any) => Promise<any>
let providerCalls = 0
const stored = new Map()
globalThis.spindle = {
  registerMessageContentProcessor(handler) { processor = handler }, registerInterceptor() { return () => {} },
  registerMacro() {}, on() {}, onFrontendMessage() {}, sendToFrontend() {},
  permissions: { has: () => true, onChanged: () => () => {} },
  userStorage: {
    async getJson(path, options = {}) { return structuredClone(stored.has(path) ? stored.get(path) : options.fallback) },
    async setJson(path, value) { stored.set(path, structuredClone(value)) }, async mkdir() {},
  },
  chat: { async getMessages() { return [] } }, chats: { async get() { return null } },
  characters: { async get() { return null } }, personas: { async getActive() { return null } },
  world_books: { async getActivated() { return [] }, entries: { async get() { return null } } },
  generate: { async raw() { providerCalls++; throw Error('No provider calls permitted') } }, imageGen: {},
  variables: { global: { async set() {} }, chat: { async set() {} } }, log: { info() {}, warn() {}, error() {} },
}
const backend = await import('../src/backend')
await backend.setConfig({ autoGenerate: false }, 'identity-user')
for (const [index, fixture] of fixtures.slice(0, 3).entries()) {
  const source = fixture.before + fixture.source('') + fixture.after
  const context = { origin: 'render', content: source, chatId: 'identity-chat', messageId: `identity-${index}`, userId: 'identity-user', extra: { swipe_id: 0 } }
  const first = await processor(context)
  const repeated = await processor(context)
  assert.equal(first?.content, repeated?.content, 'Cached renders must keep the same single identity')
  assert.equal(proseOnly(mount(first.content)), fixture.before + fixture.phrase + fixture.after)
  assert.equal(context.content, source, 'Display rendering must not rewrite saved story source')
  assert.equal(await processor({ ...context, extra: { is_user: true } }), undefined, 'Do not rewrite user-authored messages')
}
assert.equal(providerCalls, 0)

console.log(`Narrative identity visibility passed: ${cases} mounted XML/legacy, media/text-only, shell/color cases; imported Regex parity, idempotence, lorebook ownership and real backend render/cache path (mock host, zero provider calls).`)
