// @ts-nocheck -- mounted production renderers, no provider or host writes.
import assert from 'node:assert/strict'
import {JSDOM} from 'jsdom'
import {PHONE_CORE_APPS,phoneCoreRecords,renderPhoneCoreRecord} from '../src/phoneCoreApps'
import {shippedSurfaceDefinitions} from '../src/shippedSurfaceDefinitions'
import {r45SupplementalSurfaceDefinitions} from '../src/r45SurfaceCatalog'
import {bracketExampleFromXml} from '../src/bracketSurfaceAuthoring'
import {parseImageRequests} from '../src/contracts'
const definitions=[...shippedSurfaceDefinitions(1),...r45SupplementalSurfaceDefinitions(1)]
const studio={definitions:Object.fromEntries(definitions.map(d=>[d.surfaceId,d])),activePresetIds:Object.fromEntries(definitions.map(d=>[d.baseSurfaceId,d.surfaceId])),defaultShellMode:'plain',rendererMode:'relay',colorMode:'realistic'}
assert.equal(PHONE_CORE_APPS.length,46);assert.equal(new Set(PHONE_CORE_APPS.map(app=>app.id)).size,46)
for(const definition of definitions){
  const records=phoneCoreRecords(definition.sampleXml,'sample-message',0)
  const record=records.find(row=>row.appId===definition.baseSurfaceId)
  assert(record,`missing ${definition.baseSurfaceId}`)
  assert.equal(record.messageId,'sample-message');assert.equal(record.swipeId,0)
  const html=renderPhoneCoreRecord(record,studio,{chatId:'test-chat',records:[]})
  assert(html&&!html.includes(`<${definition.canonicalOuterWrapper}`),`unconsumed ${definition.baseSurfaceId}`)
  const dom=new JSDOM(`<main>${html}</main>`)
  assert(dom.window.document.querySelector('main').textContent.trim(),`empty mounted ${definition.baseSurfaceId}`)
  assert(!dom.window.document.querySelector('script'),`script in ${definition.baseSurfaceId}`)
  const localMarkup=definition.sampleXml.replace(/<image_request\b[^>]*>[\s\S]*?<\/image_request\s*>/gi,'')
  const localHtml=renderPhoneCoreRecord({...record,id:`phone-local-${definition.baseSurfaceId}`,messageId:`phone-local-${definition.baseSurfaceId}`,markup:localMarkup,local:true},studio,{chatId:'test-chat',records:[]})
  assert(localHtml&&!localHtml.includes(`<${definition.canonicalOuterWrapper}`),`unconsumed phone-local ${definition.baseSurfaceId}`)
  const saved=phoneCoreRecords(bracketExampleFromXml(definition.sampleXml),'old-message',1)
  assert(saved.some(row=>row.appId===definition.baseSurfaceId),`saved bracket ${definition.baseSurfaceId} inaccessible`)
  if(definition.baseSurfaceId==='dating-profile'){
    const request=parseImageRequests(record.markup)[0]
    const media={id:'0-0',requestId:request.id,target:request.target,slot:request.slot,alt:request.alt,aspect:request.aspect,image:{status:'ready',prompt:request.prompt,framing:'auto',connectionId:'',imageId:'tinder-profile-image',imageUrl:'/api/v1/images/tinder-profile-image'}}
    const localHtml=renderPhoneCoreRecord({...record,id:'phone-local-tinder',messageId:'phone-local-tinder',local:true,media:[media]},studio,{chatId:'test-chat',records:[]})
    assert(localHtml.includes('tinder-profile-image'),'local phone app media hydrates through its exact saved request slot')
    assert(localHtml.includes('Dating profile portrait'),'phone-generated app image retains authored alt text')
    const failed=renderPhoneCoreRecord({...record,id:'phone-local-tinder-failed',messageId:'phone-local-tinder-failed',local:true,media:[{...media,id:'0-1',image:{...media.image,status:'failed',error:'provider unavailable'}}]},studio,{chatId:'test-chat',records:[]})
    assert(failed.includes('This app image failed to generate.')&&failed.includes('data-phone-app-image-retry="0-1"'),'failed app images expose an exact-slot phone retry')
    const pending=renderPhoneCoreRecord({...record,id:'phone-local-tinder-pending',messageId:'phone-local-tinder-pending',local:true,media:[{...media,id:'0-2',image:{...media.image,status:'pending'}}]},studio,{chatId:'test-chat',records:[]})
    assert(pending.includes('Generating app image…')&&!pending.includes('data-phone-app-image-retry'),'active image generation does not offer a duplicate retry')
  }
}
const sample=definitions[0].sampleXml
assert.equal(phoneCoreRecords('```xml\n'+sample+'\n```','example',0).length,0)
assert.equal(phoneCoreRecords('<think>'+sample+'</think>','reasoning',0).length,0)
const empty=phoneCoreRecords('<instagram_dm name="—" handle="—" time="—">\n</instagram_dm>','empty-app',0)[0]
assert(renderPhoneCoreRecord(empty,studio,{chatId:'test-chat',records:[]}).includes('contains no readable content'),'empty authored app reports exact-source recovery instead of displaying a misleading blank thread')
console.log('Phone Core apps passed: all 46 canonical and saved-bracket roots extracted, source/swipe identity preserved, production renderers mounted with real app controls and no scripts/provider writes.')
