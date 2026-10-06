// Renderer/CSS contract coverage. Mounted shadow-DOM pixels are checked in
// the persistent 7861 review chat; this suite alone is not visual proof.
import { renderRegexSurfaceParity } from '../src/regexSurfaceParity'
import { bracketExampleFromXml } from '../src/bracketSurfaceAuthoring'
import { renderNativeSurfaceMarkup } from '../src/nativeSurfaces'
import type { CustomSurfaceStudioState } from '../src/contracts'

function assert(value: unknown, reason: string): asserts value { if (!value) throw new Error(reason) }
const xml = '<instagram_dm name="Person" handle="@person" time="08:30"><avatar_msg side="left" user="Person"><avatar>A</avatar><text>Message.</text></avatar_msg><dm_msg side="right" user="You" avatar="Y">Reply.</dm_msg><dm_media side="left"><img src="/fixture.jpg" alt="Attachment"></dm_media></instagram_dm>'
let cases = 0
for (const mode of ['inline', 'plain', 'sparkling', 'glass'] as const) {
  for (const color of ['realistic', 'primary', 'glass'] as const) {
    for (const input of [xml, bracketExampleFromXml(xml)]) {
      const rendered = renderRegexSurfaceParity(input, mode, 'dm-bubbles', color)
      assert(/class="srv-bubble">\s*Message\.\s*<\/div>/.test(rendered) && /class="srv-bubble">\s*Reply\.\s*<\/div>/.test(rendered), `${mode}/${color}: ordered message bubbles missing`)
      assert(rendered.includes('data-rrn-instagram-bubbles'), `${mode}/${color}: Instagram cannot style the shared bubble classes`)
      assert(/\.rr23-igdm \.srv-bubble\{[^}]*padding:9px 11px/.test(rendered), `${mode}/${color}: bubble geometry missing`)
      assert(/\.rr23-igdm \.srv-msg-right \.srv-bubble\{[^}]*border-radius:17px 17px 5px 17px/.test(rendered), `${mode}/${color}: outgoing bubble style missing`)
      if (color === 'glass') assert(/\.rr23-igdm \.srv-bubble\{[^}]*background:color-mix/.test(rendered), `${mode}: Glass palette lost`)
      assert(rendered.indexOf('Message.') < rendered.indexOf('Reply.') && rendered.indexOf('Reply.') < rendered.indexOf('alt="Attachment"'), `${mode}/${color}: conversation/media ordering changed`)
      assert(!rendered.includes('<avatar_msg') && !rendered.includes('<dm_msg'), `${mode}/${color}: unconsumed message grammar`)
      cases++
    }
  }
}
const xDm = renderRegexSurfaceParity(xml.replaceAll('instagram_dm', 'x_dm'), 'plain', 'x-dm')
assert(!xDm.includes('data-rrn-instagram-bubbles'), 'Instagram styles leaked into X DMs')
const studio = {definitions:{},activePresetIds:{},rendererMode:'relay',defaultShellMode:'plain',colorMode:'realistic'} as unknown as CustomSurfaceStudioState
const native = renderNativeSurfaceMarkup(xml, studio, {chatId:'dm-test',messageId:'dm-owned'})
assert(native.content.indexOf('data-rrn-instagram-bubbles') < native.content.indexOf('<textarea class="rrn-surface-source"'), 'Bubble stylesheet escaped its owning editable Surface island')
assert(native.content.includes('.srv-avatar:empty{display:none!important}'), 'Shared avatar authority can resurrect empty avatar circles')
console.log(`Instagram DM bubble regression passed (${cases} XML/bracket/presentation/palette cases)`)
