// @ts-nocheck -- offline production-renderer and mounted DOM regression.
import assert from 'node:assert/strict'
import { JSDOM, VirtualConsole } from 'jsdom'
import { renderNativeSurfaceMarkup } from '../src/nativeSurfaces'
import { r45SupplementalSurfaceDefinitions } from '../src/r45SurfaceCatalog'
import { r45ScriptOverrideKey, r45SurfaceAuthorityPack, renderR45BracketSurfaceAuthority, renderR45SurfaceAuthority } from '../src/r45SurfaceAuthority'
import { validateAssistedSurfaceRepair } from '../src/assistedSurfaceRepair'
import { SURFACE_RENDER_FAILURE_MESSAGE, surfacePresetDisplayName, rendererScriptDisplayName } from '../src/uxCopy'

const notes = [
  { title: '밖에서 살 것 (Outside List)', updated: '10:42 AM', body: '1. 렌즈 (Lenses)\n 2. 사용자가 고른 옷 (Chosen clothes)\n 3. 어깨 맞는 자켓 (Fitted jacket)' },
  { title: '글자 연습 (Words)', updated: '09:15 AM', body: '나는 자유다\n 이름을 써 보기\n 둘이 같이' },
  { title: 'Route', updated: 'Yesterday', body: 'Two exits; keep the original wording.' },
  { title: 'Archive', updated: 'Monday', body: 'A fourth authored note, not an invented placeholder.' },
]
const xml = count => `<notes_app folder="Personal &amp; Archive" owner="Note Owner"><nt_list>${notes.slice(0, count).map((note, index) => `<nt_note slot="${index + 1}" title="${note.title}" updated="${note.updated}">${note.body}</nt_note>`).join('')}</nt_list></notes_app>`
const bracket = count => `[notes_app][folder]Personal &amp; Archive[/folder][owner]Note Owner[/owner][nt_list]${notes.slice(0, count).map((note, index) => `[nt_note][slot]${index + 1}[/slot][title]${note.title}[/title][updated]${note.updated}[/updated]${note.body}[/nt_note]`).join('')}[/nt_list][/notes_app]`
const definition = r45SupplementalSurfaceDefinitions(1).find(row => row.baseSurfaceId === 'notes-app')!
const studio = {
  definitions: { [definition.surfaceId]: definition }, activePresetIds: { 'notes-app': definition.surfaceId },
  collectionPresets: {}, rendererMode: 'relay', defaultShellMode: 'plain', colorMode: 'realistic',
  rendererScriptOverrides: {}, utilityInjectionEnabled: true, utilityInjectionPosition: 'after-chat-history', utilityTemplate: '',
  validationErrors: {}, updatedAt: 1,
}
const dom = new JSDOM('<!doctype html><html><body></body></html>', { virtualConsole: new VirtualConsole() })
const host = dom.window.document.createElement('section')
dom.window.document.body.append(host)
let cases = 0
for (const presentation of ['inline', 'plain', 'sparkling', 'glass']) {
  for (const color of ['realistic', 'primary', 'glass']) {
    for (const count of [1, 2, 3, 4]) {
      for (const dialect of ['xml', 'bracket']) {
        const source = dialect === 'xml' ? xml(count) : bracket(count)
        const id = `notes-${presentation}-${color}-${count}-${dialect}`
        const direct = dialect === 'xml'
          ? renderR45SurfaceAuthority(source, presentation, color, id)
          : renderR45BracketSurfaceAuthority(source, presentation, id, color)
        assert(direct.includes('rr23-notes-shell'), `${id}: renderer rejected a valid variable-count Notes surface`)
        const rendered = renderNativeSurfaceMarkup(source, { ...studio, defaultShellMode: presentation, colorMode: color }, { chatId: 'notes-fixture', messageId: id })
        assert(!rendered.content.includes('data-reverie-surface-contract="failed"'), `${id}: native render must not show a repair card`)
        assert(!rendered.content.includes('<notes_app') && !rendered.content.includes('[notes_app]'), `${id}: raw authored markup escaped`)
        host.innerHTML = rendered.content
        assert.equal(host.querySelectorAll('.rr23-note-tab').length, count, `${id}: exactly the authored tabs must exist`)
        assert.equal(host.querySelectorAll('.rr23-note-page').length, count, `${id}: no fabricated pages`)
        for (const [index, tab] of [...host.querySelectorAll('.rr23-note-tab')].entries()) {
          const input = host.querySelector(`[id="${tab.getAttribute('for')}"]`)
          assert(input, `${id}: note tab lost its radio target`)
          tab.click()
          assert(input.checked, `${id}: clicking note ${index + 1} must select it`)
          assert.equal(host.querySelectorAll('.rr23-notes input[type="radio"]:checked').length, 1, `${id}: only one note may be selected`)
          const page = host.querySelector(`.rr23-note-page.p${index + 1}`)!
          assert.equal(page.querySelector('h3').textContent, notes[index].title)
          assert.equal(page.querySelector('time').textContent, notes[index].updated)
          assert.equal(page.querySelector('.rr23-note-body').textContent, notes[index].body, `${id}: content/Unicode/line breaks changed`)
        }
        cases += 1
      }
    }
  }
}

const literalBody = 'Keep [literal brackets], $5, <b>bold text</b>, &amp; entities exactly.'
const attached = xml(2).replace(notes[0].body, `${literalBody}<img src="/fixtures/note.png" alt="Attached diagram" data-dgir-key="notes-existing-image">`)
const attachmentRender = renderNativeSurfaceMarkup(attached, studio, { chatId: 'notes-fixture', messageId: 'notes-attachment' })
assert(attachmentRender.content.includes(literalBody), 'XML content must not travel through an example converter that rewrites brackets or whitespace')
assert(attachmentRender.content.includes('data-dgir-key="notes-existing-image"'), 'existing attachment ownership must be preserved')

const noOp = validateAssistedSurfaceRepair('notes-app', xml(2), xml(2))
assert(noOp.ok, `valid two-note XML must be accepted by the repair validator: ${noOp.reason}`)
const missingCloser = xml(2).replace('</nt_note>', '')
assert(validateAssistedSurfaceRepair('notes-app', missingCloser, xml(2)).ok, 'closing-only repair must still preserve and accept the authored notes')

const fiveNotes = xml(4).replace('</nt_list>', '<nt_note slot="5" title="Fifth" updated="Today">Do not silently discard me.</nt_note></nt_list>')
for (const invalid of [
  xml(0), fiveNotes, xml(2).replace('slot="2"', 'slot="1"'),
  xml(2).replace('slot="2"', 'slot="3"'), xml(2).replace(' title="글자 연습 (Words)"', ''),
  xml(2).replace(' updated="09:15 AM"', ''), xml(2).replace('</nt_list>', 'Unowned list text.</nt_list>'),
]) assert(renderR45SurfaceAuthority(invalid, 'plain', 'realistic', 'invalid-notes').includes('<notes_app'), 'invalid XML must remain unconsumed, never partially rendered or padded')
const invalidNative = renderNativeSurfaceMarkup(xml(2).replace(' title="글자 연습 (Words)"', ''), studio, { chatId: 'notes-fixture', messageId: 'invalid-notes' })
host.innerHTML = invalidNative.content
const recovery = host.querySelector('.rrn-contract-recovery')!
assert(recovery, 'truly missing fields must still show a usable repair card')
assert(recovery.textContent.includes(SURFACE_RENDER_FAILURE_MESSAGE), 'repair card must offer plain-language next steps')
assert(recovery.textContent.includes('Notes App · Format error'), 'repair card must show a human-readable Surface name')
assert(!/R4\.5|FINAL|approved Surface/i.test(recovery.textContent), 'internal version/authority names must not leak into the error card')
for (const invalid of [bracket(2).replace('[slot]2[/slot]', '[slot]1[/slot]'), bracket(2).replace('[/nt_list]', 'Unowned list text.[/nt_list]')]) {
  assert(!renderR45BracketSurfaceAuthority(invalid, 'plain', 'invalid-bracket-notes').includes('rr23-notes-shell'), 'invalid bracket lists must not silently discard records/text')
}

const script = r45SurfaceAuthorityPack('plain', 'realistic').scripts.find(row => row.find_regex.includes('<notes_app'))!
const overrideKey = r45ScriptOverrideKey('legacy-xml', 'plain', 'realistic', script.script_id)
assert.equal(renderR45SurfaceAuthority(xml(4), 'plain', 'realistic', 'override-notes', { [overrideKey]: { findRegex: '(?!)' } }), xml(4), 'variable-count handling must not bypass an explicit custom find expression')
assert(renderR45SurfaceAuthority(xml(2), 'plain', 'realistic', 'override-notes', { [overrideKey]: { replaceString: script.replace_string + '<small>Custom Notes template</small>' } }).includes('Custom Notes template'), 'custom Notes replacement templates must still apply')

assert.equal(definition.presetName, 'Reverie Default')
assert.equal(surfacePresetDisplayName({ builtIn: true, presetName: 'R4.5 FINAL' }), 'Reverie Default')
assert.equal(surfacePresetDisplayName({ builtIn: true, presetName: 'FINAL R4.5' }), 'Reverie Default')
assert.equal(surfacePresetDisplayName({ builtIn: false, presetName: 'R4.5 FINAL' }), 'R4.5 FINAL', 'explicitly named custom presets must remain untouched')
assert.equal(surfacePresetDisplayName({ builtIn: true, presetName: 'My Saved Name' }), 'My Saved Name')
assert.equal(rendererScriptDisplayName('📝 Notes App — R4.5 — Collapsible Plain'), '📝 Notes App — Collapsible Plain')
assert.equal(rendererScriptDisplayName('↳ R4.5 — Workspace Bubble Transformer — Inline'), '↳ Workspace Bubble Transformer — Inline')
assert.equal(rendererScriptDisplayName('Custom R4.5 FINAL', true), 'Custom R4.5 FINAL', 'custom renderer names must remain authored data')
for (const presentation of ['inline', 'plain', 'sparkling', 'glass']) {
  for (const color of ['realistic', 'primary', 'glass']) {
    for (const stock of r45SurfaceAuthorityPack(presentation, color).scripts) {
      assert(!/\bR\d+\.\d+\b|\bFINAL\b/i.test(rendererScriptDisplayName(stock.name)), 'bundled script display labels must not expose internal renderer revisions')
    }
  }
}
dom.window.close()
console.log(`Notes regression passed: ${cases} XML/bracket × count/presentation/color cases, mounted tab selection, source/media preservation, fail-closed malformed lists, custom renderer overrides, closing-only repair, and plain-language labels.`)
