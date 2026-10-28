// @ts-nocheck -- real widget and renderers; deterministic host, no providers.
import assert from 'node:assert/strict'
import {JSDOM,VirtualConsole} from 'jsdom'
import {mountPhoneWidget} from '../src/phoneWidget'
import {PHONE_CORE_APPS,phoneCoreRecords,renderPhoneCoreRecord} from '../src/phoneCoreApps'
import {shippedSurfaceDefinitions} from '../src/shippedSurfaceDefinitions'
import {r45SupplementalSurfaceDefinitions} from '../src/r45SurfaceCatalog'
import {emptyPhoneDevice,normalizePhoneDevice} from '../src/phoneDevice'
import {validatePhoneLocalApp,phoneLocalAppRecord,phoneLocalAppImageRequests} from '../src/phoneLocalApps'
import {createPhoneService} from '../src/phoneService'
import {PHONE_APP_PRESENTATION_CSS} from '../src/phoneAppPresentation'
// The embedded handset can be narrow while the desktop viewport is wide.
// Native viewport media queries cannot select its single-column room view.
const handsetRules=PHONE_APP_PRESENTATION_CSS.slice(PHONE_APP_PRESENTATION_CSS.indexOf('@container(max-width:440px)'))
assert.match(handsetRules,/\.bl-head\s*,\s*\.bl-floor\s*,\s*\.bl-room-copy dl\s*\{grid-template-columns:minmax\(0,1fr\)!important\}/,'Building Layout must stack within the handset instead of using the outer desktop viewport')
const dom=new JSDOM('<body></body>',{url:'http://localhost/',pretendToBeVisual:true,virtualConsole:new VirtualConsole()})
const win=dom.window;globalThis.window=win;globalThis.document=win.document
const sent=[],handlers=[],widgets=[],events=new Map()
let chatId='all-apps'
const ctx={getActiveChat:()=>({chatId}),sendToBackend:message=>sent.push(message),onBackendMessage(handler){handlers.push(handler);return()=>{}},events:{on(name,fn){events.set(name,fn);return()=>events.delete(name)}},ui:{createFloatWidget(options){const root=document.createElement('div');document.body.append(root);const widget={root,options,setVisible(){},destroy(){root.remove()}};widgets.push(widget);return widget}}}
const phone=mountPhoneWidget(ctx)
const root=()=>widgets.findLast(widget=>widget.root.isConnected&&widget.root.dataset.reveriePhoneUi==='handset').root.shadowRoot
const click=label=>{const el=root().querySelector(`[aria-label="${label}"]`);assert(el,label);el.click()}
const receive=message=>handlers.forEach(handler=>handler(message))
const state=emptyPhoneDevice(),identities=[{id:'persona:reader',name:'Reader',kind:'persona'},{id:'character:actor',name:'Actor',kind:'character'}]
const definitions=[...shippedSurfaceDefinitions(1),...r45SupplementalSurfaceDefinitions(1)]
const studio={definitions:Object.fromEntries(definitions.map(def=>[def.surfaceId,def])),activePresetIds:Object.fromEntries(definitions.map(def=>[def.baseSurfaceId,def.surfaceId])),defaultShellMode:'glass',rendererMode:'relay',colorMode:'realistic'}
const records=PHONE_CORE_APPS.map(app=>phoneCoreRecords(definitions.find(def=>def.baseSurfaceId===app.id).sampleXml.replace(/owner="[^"]*"/g,'owner="Reader"'),'source',0)[0])
// Exercise the same service action as "provide context", not just validation.
// Canonical model replies and ImageGen results are deterministic mocks here;
// this verifies every app's save/media/render handshake without provider spend.
let setupState=emptyPhoneDevice(),setupRecord=records[0],setupStarts=0,setupImages=0
setupState.connectionId='setup-test'
const setupOutput=[]
const setupService=createPhoneService({
 read:async()=>structuredClone(setupState),identities:async()=>identities,
 mutate:async(_chat,_user,change)=>{const next=normalizePhoneDevice(structuredClone(setupState));change(next);setupState=next},
 projection:async()=>({appRecords:setupState.localApps?.map(record=>phoneLocalAppRecord(record,identities[0]))}),
 rpContext:async()=>'A neutral adult test scene.',
 generate:async(connection,prompt,_user,maxTokens)=>{setupStarts++;assert.equal(connection,'setup-test');assert.equal(maxTokens,setupRecord.appId==='amazon'?6500:3500);assert(prompt[1].content.includes('A neutral adult test scene.'));return setupRecord.markup},
 generateImage:async()=>{setupImages++;return{imageId:`phone-fixture-${setupImages}`,imageUrl:`/api/images/phone-fixture-${setupImages}`}},
 send:message=>setupOutput.push(message),
})
for(const record of records){
 setupRecord=record
 await setupService.handle({type:'reverie_phone_command',action:'app-create',operationId:`all-app-setup-${record.appId}`,chatId:'all-apps',from:'persona:reader',appId:record.appId,text:`Set up the ${record.appId} fixture.`})
 assert(!setupOutput.at(-1)?.error,`${record.appId}: ${setupOutput.at(-1)?.error}`)
 const saved=setupState.localApps?.at(-1)
 assert.equal(saved?.appId,record.appId);assert.equal(saved.markup,record.markup)
 assert.equal(saved.media?.length||0,phoneLocalAppImageRequests(record.markup).length,`${record.appId}: each authored image slot is saved`)
 const restored=normalizePhoneDevice(JSON.parse(JSON.stringify(setupState))).localApps.at(-1)
 const view=renderPhoneCoreRecord(phoneLocalAppRecord(restored,identities[0]),studio,{chatId:'all-apps',records:[]})
 assert(!view.includes('data-rrn-surface-recovery='),`${record.appId}: restored app must render`)
 for(const media of restored.media||[]){assert.equal(media.image.status,'ready');assert(view.includes(media.image.imageUrl),`${record.appId}: restored media appears in the app renderer`)}
}
assert.equal(setupStarts,48,'Every Core app exercises its real app-create service route')
let current=records
function projection(rows=current){current=rows;receive({type:'phone_state',chatId,operationId:sent.findLast(row=>row.action==='load')?.operationId||'projection',state:structuredClone(state),identities,connections:[],saved:[],apps:PHONE_CORE_APPS,appRecords:rows})}
function deliver(record){const request=sent.findLast(row=>row.action==='app');assert.equal(request.recordId,record.id);receive({type:'phone_app',chatId,operationId:request.operationId,appId:record.appId,recordId:record.id,html:renderPhoneCoreRecord(record,studio,{chatId,records:[]}),targets:[]})}
function home(){const back=[...root().querySelectorAll('.head button')].find(el=>el.textContent==='‹');back?.click()}
function library(){home();[...root().querySelectorAll('button')].find(el=>el.textContent==='Core apps').click()}
try{
 phone.open();projection()
 // Both source paths mount the exact authored markup, not a replacement model summary.
 for(const local of [false,true])for(const record of records){
  const copy=local?{...record,id:`phone-local-${record.appId}`,local:true,ownerId:'persona:reader'}:record
  if(local)assert.equal(validatePhoneLocalApp(copy.markup,copy.appId),copy.markup)
  projection([copy]);library();click(`Open Core app ${PHONE_CORE_APPS.find(app=>app.id===copy.appId).label}`);deliver(copy)
  const app=root().querySelector('.core-app-view')?.shadowRoot
  assert(app,`${copy.appId} mounts inside the handset (${local?'provided context':'story'})`)
  assert(app.textContent.trim().length>50,copy.appId)
  assert(!app.querySelector('script,iframe'),copy.appId)
  for(const outer of app.querySelectorAll('details.dg-compact-launch-host,details.srv2-collapse'))assert(outer.open,`${copy.appId}: story launcher opens in phone`)
  // Native renderers may add empty optional attributes to their editor copy.
  // The stored source must stay untouched, and the phone must consume its root.
  assert.equal(copy.markup,record.markup,`${copy.appId}: opening never rewrites saved source`)
  assert(!app.querySelector(PHONE_CORE_APPS.find(row=>row.id===copy.appId).root),`${copy.appId}: source root was rendered`)
 }
 const forum=records.find(record=>record.appId==='forum-thread')
 projection([]);library();click('Open Core app Forum / Reddit Thread')
 const before=sent.length;projection([forum])
 assert(sent.slice(before).some(row=>row.action==='app'&&row.recordId===forum.id),'An already-open empty app mounts its newly committed story Surface immediately')
 deliver(forum)
 const updated={...forum,id:`edited-${forum.id}`,messageId:'edited-source',renderFingerprint:'v2'}
 projection([forum,updated]);assert.equal(sent.findLast(row=>row.action==='app').recordId,updated.id,'Following the current app switches to its new story record')
 deliver(updated)
 const beforeMedia=sent.length;projection([forum,{...updated,renderFingerprint:'image-ready'}])
 assert(sent.slice(beforeMedia).some(row=>row.action==='app'&&row.recordId===updated.id),'An existing app refreshes when its generated media is ready')
 deliver(updated)
 const beforeState=sent.length;receive({type:'state',chatId,records:[{messageId:updated.messageId,swipeId:0,status:'completed',imageUrl:'/image-ready'}]})
 assert(sent.slice(beforeState).some(row=>row.action==='load'),'Story ImageGen completion invalidates the displayed app without a page reload')
 const beforeDuplicate=sent.length;receive({type:'state',chatId,records:[{messageId:updated.messageId,swipeId:0,status:'completed',imageUrl:'/image-ready'}]})
 assert.equal(sent.length,beforeDuplicate,'Unchanged story media does not repeatedly reload the phone')
 const beforeRead=sent.length;state.revision++;projection()
 assert(!sent.slice(beforeRead).some(row=>row.action==='app'),'Read receipts alone must not loop app refreshes')
 const picker=root().querySelector('select[aria-label="Core app record"]');picker.value=forum.id;picker.dispatchEvent(new win.Event('change'));deliver(forum)
 projection([...current,{...updated,id:'another-story',messageId:'third-source'}]);assert.equal(sent.findLast(row=>row.action==='app').recordId,forum.id,'A deliberately selected historical record stays selected')
 for(const name of ['MESSAGE_SENT','MESSAGE_DELETED']){
  const count=sent.length;events.get(name)?.({chatId});assert(sent.slice(count).some(row=>row.action==='load'),`${name} refreshes source records`)
  projection()
 }
 const beforeOverlap=sent.length;events.get('GENERATION_ENDED')();events.get('MESSAGE_SENT')()
 assert.equal(sent.slice(beforeOverlap).filter(row=>row.action==='load').length,1,'Overlapping source events queue one fresh follow-up instead of sharing a stale in-flight snapshot')
 projection();await new Promise(resolve=>win.setTimeout(resolve,5))
 assert.equal(sent.slice(beforeOverlap).filter(row=>row.action==='load').length,2,'A source change during loading gets a fresh read after the old load completes')
 projection()
 const oldChat=chatId;chatId='other-chat';events.get('CHAT_SWITCHED')();phone.open();projection([]);receive({type:'phone_state',chatId:oldChat,state,identities,appRecords:records})
 assert(!root().querySelector('.core-app-view'),'Late projections from another chat cannot mount old app content')
 console.log(`All-app DOM matrix passed: 48 real setup service actions (${setupImages} mocked image outputs), 48 story and 48 phone-local mounted schemas, source preservation, open-app refresh, media refresh, history selection, deletion and chat isolation; no providers`)
}finally{phone.destroy();dom.window.close()}
