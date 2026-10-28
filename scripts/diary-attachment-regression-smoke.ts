// @ts-nocheck -- production normalizer/renderer and mounted ownership regression.
import assert from 'node:assert/strict'
import { JSDOM, VirtualConsole } from 'jsdom'
import { normalizeSurfaceBlock, parseSurfaceXml, serializeSurfaceXml, surfaceXmlAttributes, xmlChildren } from '../src/surfaceXml'
import { r45SupplementalSurfaceDefinitions } from '../src/r45SurfaceCatalog'
import { renderNativeSurfaceMarkup } from '../src/nativeSurfaces'
import { renderRegexSurfaceParity } from '../src/regexSurfaceParity'

// Exact user-supplied failing request and diary: no rewritten prompt or text.
const request = '<image_request id="liam-diary-piano-note-01" target="custom.artifact-media" slot="liam-diary-piano-note-01" aspect="4:3" alt="Handwritten musical notation and chord changes on a cream notebook page resting on a dark upright piano beside a warm amber fairy light"><scene_brief>Clear object-focused composition of an open cream-colored manuscript notebook resting on the dark polished wood of an upright piano, penciled musical chord progressions and vocal harmony notes visible on the staff lines, a single warm amber fairy light glowing softly out of focus in the background, half-empty ceramic tea cup nearby, no people visible, no readable text.</scene_brief></image_request>'
const entries = [
  ['October 10, 2026', "03:40 AM - Quartz Wing Corridor", "She fell asleep on the upright piano bench in Rose's loft again with her cardigan sleeves pulled over her hands. Carried her back to her room; she didn't wake up, just caught my thumb in her fist like she used to do in the orphanage bunk when the radiator pipes banged. I still check the locks three times before I can lie down."],
  ['October 12, 2026', '02:15 AM - East Wing Stairs', "Jaehyun came back from the basement gym with his right knuckles split through the wraps. Stood in the kitchen for twenty minutes staring at the container of white peaches Jennie bought for Ria, then threw his protein shake in the sink and went upstairs without saying a word. He's terrified of breaking her, so he acts like her shadow burns him. If he doesn't figure out his own head soon, we're going to have a problem I can't mediate."],
  ['October 14, 2026', '11:10 PM - Main Production Studio', 'Found her uncredited guide vocal on the new girl-group bridge. She fixed the entire harmonic lift in twenty minutes and stripped her metadata off the file before uploading it to the server. She wants the whole world to hear her voice, and she wants to disappear the second anyone looks at the door.'],
]
const xml = (attachments = [request, '', '']) => '<diary_app owner="Song Liam" title="Private Household &amp; Studio Log (Encrypted)">' + entries.map(([date, heading, text], i) => `<diary_entry slot="${i+1}" date="${date}" heading="${heading}">${text}${attachments[i] || ''}</diary_entry>`).join('') + '</diary_app>'
const definition = r45SupplementalSurfaceDefinitions(1).find(d => d.baseSurfaceId === 'diary-app')!
const spec = { id: 'diary-app', wrapper: 'diary_app', sampleXml: definition.sampleXml }
const exact = normalizeSurfaceBlock(xml(), spec)
assert.deepEqual(exact.diagnostics, [], 'valid entry-owned optional image request must not fail normalization')
assert(exact.markup.includes(request), 'exact request and scene brief must survive normalization')

function bracket(source) {
  const visit = node => `[${node.tag}]` + Object.entries(surfaceXmlAttributes(node.attrs)).map(([key,value])=>`[${key}]${value}[/${key}]`).join('') + node.children.map(child => typeof child === 'string' ? child : child.tag === 'image_request' || child.tag === 'img' ? serializeSurfaceXml(child) : visit(child)).join('') + `[/${node.tag}]`
  return visit(parseSurfaceXml(source))
}
const dom = new JSDOM('<!doctype html><html><body></body></html>', {virtualConsole:new VirtualConsole()})
const host = dom.window.document.body
let cases = 0
for (const mode of ['inline','plain','sparkling','glass','plain-glass']) for (const color of ['realistic','primary','glass']) {
  for (const dialect of ['xml','bracket']) for (const attachedTo of [[], [0], [1], [2], [0,1,2]]) {
    const attachments = entries.map((_,i)=>attachedTo.includes(i) ? request.replaceAll('liam-diary-piano-note-01', `diary-attachment-${i+1}`) : '')
    const source = dialect === 'xml' ? xml(attachments) : bracket(xml(attachments))
    const studio = { definitions:{[definition.surfaceId]:definition}, activePresetIds:{'diary-app':definition.surfaceId}, defaultShellMode:mode, rendererMode:'relay', colorMode:color }
    for (const completed of [false,true]) {
      const records = attachedTo.map(i=>({key:`diary:message:0:diary-attachment-${i+1}:diary-attachment-${i+1}`,chatId:'diary',messageId:'message',swipeId:0,surfaceId:'diary-app',requestId:`diary-attachment-${i+1}`,slot:`diary-attachment-${i+1}`,target:'custom.artifact-media',status:completed?'completed':'recovered-pending',imageUrl:completed?`/api/v1/images/diary-${i+1}`:undefined,imageId:completed?`diary-${i+1}`:undefined,updatedAt:1}))
      const rendered = renderNativeSurfaceMarkup(source, studio, {chatId:'diary',messageId:'message',swipeId:0,autoGenerate:false,records})
      assert(!rendered.content.includes('data-reverie-surface-contract="failed"'), `${mode}/${color}/${dialect}: valid attachment rejected`)
      host.innerHTML = rendered.content
      assert.equal(host.querySelectorAll('.rr22-diary-page').length, 3, 'authored three diary pages retained')
      assert.equal(host.querySelector('.rr22-diary-index h2')?.textContent, 'Private Household & Studio Log (Encrypted)')
      for (const [i, [date,heading,text]] of entries.entries()) {
        const page = host.querySelector(`.rr22-dy-p${i+1}`)!
        assert.equal(page.querySelector('h3')?.textContent, heading)
        assert.equal(page.querySelector('time')?.textContent, date)
        assert(page.textContent.includes(text), 'diary prose must remain unchanged')
        const requestId = `diary-attachment-${i+1}`
        const owned = page.querySelectorAll(`[data-rrn-native-request="${requestId}"], img[data-dgir-request-id="${requestId}"]`)
        assert.equal(owned.length, attachedTo.includes(i) ? 1 : 0, `${mode}/${color}/${dialect}/completed=${completed}/entry=${i+1}: attachment must stay in its authored entry`)
        for (const other of entries.keys()) if (other !== i) {
          assert.equal(page.querySelectorAll(`[data-rrn-native-request="diary-attachment-${other+1}"], img[data-dgir-request-id="diary-attachment-${other+1}"]`).length, 0, 'attachments must never leak into another entry')
        }
        if (completed && attachedTo.includes(i)) assert(page.querySelector(`img[src="/api/v1/images/diary-${i+1}"]`), 'completed media must stay in its page after reconstruction')
        const tab = host.querySelector(`label[for="rr22-dy-${i+1}-message"]`)
        assert(tab, 'diary navigation target retained'); tab.click()
        assert(host.querySelector(`[id="${tab.htmlFor}"]`).checked, 'each diary page remains selectable')
      }
      cases++
    }
    const parity = renderRegexSurfaceParity(source, mode === 'plain-glass' ? 'glass' : mode, 'message', color)
    assert(parity.includes('rr22-diary-page') && !parity.includes('No unique destination'), 'Regex path must also accept entry attachments')
  }
}
for (const tag of ['image_request_error','img']) {
  const replacement = tag === 'img' ? '<img src="/api/v1/images/existing" data-dgir-key="diary-existing" alt="Existing diary attachment">' : '<image_request_error id="diary-failed">Preserved request error</image_request_error>'
  const normalized = normalizeSurfaceBlock(xml([replacement,'','']),spec)
  assert.deepEqual(normalized.diagnostics,[]); assert(normalized.markup.includes(replacement))
}
const escaped = xml(['','','']).replace('</diary_app>', request+'</diary_app>')
assert(normalizeSurfaceBlock(escaped,spec).diagnostics.length, 'root media with three possible owners must remain ambiguous')
assert(normalizeSurfaceBlock(xml().replace('</diary_entry>','</diary_app>'),spec).diagnostics.length, 'overlapping owner boundary must not become valid')
dom.window.close()
console.log(`PASS Diary attachments: exact user regression, ${cases} native XML/bracket mode/color/pending/completed cases, exact per-entry ownership, navigation, preserved error/existing image and ambiguous-owner rejection. No provider calls.`)
