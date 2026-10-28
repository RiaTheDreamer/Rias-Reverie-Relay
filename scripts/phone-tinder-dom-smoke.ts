// @ts-nocheck -- mounted production frontend/widget with a simulated host; no model calls.
import assert from 'node:assert/strict'
import {JSDOM,VirtualConsole} from 'jsdom'
import {shippedSurfaceDefinitions} from '../src/shippedSurfaceDefinitions'
import {phoneCoreRecords,renderPhoneCoreRecord,PHONE_CORE_APPS} from '../src/phoneCoreApps'
import {PHONE_APP_PRESENTATION_CSS} from '../src/phoneAppPresentation'
import {emptyPhoneDevice} from '../src/phoneDevice'
const dom=new JSDOM('<body><div id="drawer"></div><article id="message"></article></body>',{url:'http://localhost/',pretendToBeVisual:true,virtualConsole:new VirtualConsole()})
const win=dom.window
for(const name of ['window','document','HTMLElement','HTMLButtonElement','HTMLImageElement','HTMLInputElement','HTMLSelectElement','HTMLTextAreaElement','HTMLStyleElement','HTMLDetailsElement','Element','ShadowRoot','Node','MutationObserver','Event','CustomEvent','getComputedStyle'])globalThis[name]=name==='window'?win:name==='document'?win.document:win[name]
win.matchMedia=()=>({matches:true,addEventListener(){},removeEventListener(){}})
win.setInterval=()=>0;win.clearInterval=()=>{}
const frames=new Map();let frame=0
win.requestAnimationFrame=callback=>{frames.set(++frame,callback);return frame};win.cancelAnimationFrame=id=>frames.delete(id)
globalThis.requestAnimationFrame=win.requestAnimationFrame;globalThis.cancelAnimationFrame=win.cancelAnimationFrame
globalThis.fetch=async()=>({ok:false,status:404})
globalThis.spindle={on(){},onFrontendMessage(){},registerInterceptor(){},registerMacro(){},registerMessageContentProcessor(){},sendToFrontend(){},log:{info(){},warn(){},error(){}}}
const sent=[],opened=[],widgets=[],receivers=[]
const ctx={
 dom:{addStyle:()=>()=>{},findMessageElement:id=>id==='message'?document.getElementById('message'):null,cleanup(){}},
 ui:{registerDrawerTab:()=>({root:document.getElementById('drawer'),setTitle(){},setShortName(){},setBadge(){},activate(){},onActivate:()=>()=>{},destroy(){}}),registerInputBarAction:()=>({setLabel(){},setSubtitle(){},setEnabled(){},onClick:()=>()=>{},destroy(){}}),
  createFloatWidget(options){const root=document.createElement('div');document.body.append(root);const widget={root,options,setVisible(){},destroy(){root.remove()}};widgets.push(widget);return widget},
  showModal(options){const root=document.createElement('div');document.body.append(root);const modal={root,title:options.title,dismiss(){root.remove()}};opened.push(modal);return modal}},
 events:{on:()=>()=>{},emit(){}},display:{invalidate(){}},messages:{registerTagInterceptor:()=>()=>{},getRecent:()=>[{id:'message',swipe_id:0,is_user:false}]},getActiveChat:()=>({chatId:'chat',characterId:'actor'}),sendToBackend:message=>sent.push(message),onBackendMessage(handler){receivers.push(handler);return()=>receivers.splice(receivers.indexOf(handler),1)},
}
const receive=message=>{for(const handler of [...receivers])handler(message)}
async function flush(){for(let i=0;i<5;i++){await Promise.resolve();const batch=[...frames];frames.clear();for(const [,callback]of batch)callback(0)}}
const definition=shippedSurfaceDefinitions(1).find(d=>d.baseSurfaceId==='dating-profile')
const record={...phoneCoreRecords(definition.sampleXml,'message',0)[0],id:'phone-tinder',ownerId:'persona:1',local:true}
const studio={definitions:{[definition.surfaceId]:definition},activePresetIds:{'dating-profile':definition.surfaceId},defaultShellMode:'glass',rendererMode:'relay',colorMode:'realistic'}
const html=renderPhoneCoreRecord(record,studio,{chatId:'chat',records:[]})
const {setup}=await import('../src/frontend')
const cleanup=setup(ctx)
try{
 receive({type:'state',chatId:'chat',revision:1,records:[],config:{enabled:true,phoneEnabled:true,enableRelayOrb:false,autoRescanOnChatOpen:false},parserConnections:[],imageConnections:[],imageProviders:[],logs:[],candidateBatches:[],galleryLinks:[],versionTrees:[]});await flush()
 const launcher=widgets.find(w=>w.root.dataset.reveriePhoneUi==='launcher')
 launcher.root.shadowRoot.querySelector('button').click()
 receive({type:'phone_state',chatId:'chat',operationId:'load',state:emptyPhoneDevice(),identities:[{id:'persona:1',name:'Local reader',kind:'persona'},{id:'character:actor',name:'Local actor',kind:'character'}],connections:[],saved:[],apps:PHONE_CORE_APPS,appRecords:[record]})
 const phone=()=>widgets.find(w=>w.root.dataset.reveriePhoneUi==='handset').root.shadowRoot
 phone().querySelector('[aria-label="Open Core app Tinder Dating Profile"]').click()
 const request=sent.findLast(m=>m.action==='app')
 receive({type:'phone_app',chatId:'chat',operationId:request.operationId,appId:'dating-profile',recordId:record.id,html,targets:[]});await flush()
 const app=phone().querySelector('.core-app-view').shadowRoot
 assert(app.querySelector('.rrt-profile-1 .rrt-name-row').textContent.includes('Profile A'),'real production Tinder deck mounts')
 assert.equal(app.querySelectorAll('.rrt-profile').length,3)
 assert(app.querySelector('.rrt-state:checked'),'initial profile remains selected')
 assert.equal(app.querySelector('.rrt-root>details'),null,'phone Tinder must not retain a percentage-height disclosure content box')
 assert.equal(app.querySelector('.rrt-root').id,'rp-phone-tinder','phone-only responsive rules must have a scoped root stronger than legacy radio-ID rules')
 const sourceBefore=app.querySelector('[data-rrn-surface-source]').dataset.rrnSurfaceSource
 for(const [selector,state]of [['.rrt-profile-1 .rrt-nav .rrt-x','rrt-card-2-'],['.rrt-profile-2 .rrt-nav .rrt-heart','rrt-match-2-'],['.rrt-profile-2 .rrt-match-copy .rrt-primary','rrt-msg-2-']]){
  app.querySelector(selector).click()
  assert(app.querySelector('.rrt-state:checked').id.startsWith(state),'native Tinder labels retain profile/match/message navigation')
 }
 assert.equal(app.querySelector('[data-rrn-surface-source]').dataset.rrnSurfaceSource,sourceBefore,'phone presentation never rewrites saved Surface source')
 const before=sent.length
 app.querySelector('.rrt-profile-1 .rrt-meta').dispatchEvent(new win.MouseEvent('contextmenu',{bubbles:true,composed:true,cancelable:true}))
 assert(!opened.some(m=>m.root.isConnected),'phone right-click must not open the saved story Surface editor')
 assert(!phone().querySelector('.resize-menu').hidden,'phone right-click reaches its own resize menu')
 assert.equal(sent.length,before,'right-click must not save/reparse/generate anything')
 const scheduledLongPress=[];const originalTimeout=win.setTimeout
 win.setTimeout=(callback,delay,...args)=>{if(delay===560){scheduledLongPress.push(callback);return 0}return originalTimeout(callback,delay,...args)}
 const touch=new win.MouseEvent('pointerdown',{bubbles:true,composed:true,cancelable:true});Object.defineProperty(touch,'pointerType',{value:'touch'})
 app.querySelector('.rrt-profile-1 .rrt-meta').dispatchEvent(touch)
 assert.equal(scheduledLongPress.length,0,'phone long-press must not schedule the saved story editor either')
 win.setTimeout=originalTimeout
 // Story Surface editing remains available outside the phone.
 document.getElementById('message').innerHTML=html
 document.querySelector('#message .rrt-meta').dispatchEvent(new win.MouseEvent('contextmenu',{bubbles:true,composed:true,cancelable:true}))
 assert(opened.some(m=>m.root.isConnected&&m.title.startsWith('Inspect / Fix')),'story right-click still opens Inspect / Fix')
 // JSDOM has no layout engine. Check the computed percentage/flex chain here;
 // the real browser check must also prove positive pixel heights and visible navigation.
 const geometry=new JSDOM(`<body>${app.innerHTML}</body>`,{virtualConsole:new VirtualConsole()})
 const outer=geometry.window.document.querySelector('.rrt-root>.rrt-phone')
 assert(outer,'Tinder handset must be a direct flex child of the phone app root')
 assert.equal(geometry.window.getComputedStyle(outer).height,'100%','handset must receive the available phone height')
 assert.equal(geometry.window.getComputedStyle(geometry.window.document.querySelector('.rrt-screen-shell')).flexGrow,'1','screen must give the profile deck the remaining phone height')
 assert.equal(geometry.window.getComputedStyle(geometry.window.document.querySelector('.rrt-card')).height,'calc(100% - 64px)','profile card reserves its action row instead of covering the bio')
 assert.equal(geometry.window.getComputedStyle(geometry.window.document.querySelector('.rrt-photo')).minHeight,'0px','profile photo must shrink with a compact handset instead of pushing its details below the card')
 assert.equal(geometry.window.getComputedStyle(geometry.window.document.querySelector('.rrt-meta')).paddingTop,'8px','compact profile details must leave room for a visible name before scrolling')
 assert.equal(geometry.window.getComputedStyle(geometry.window.document.querySelector('.rrt-primary')).bottom,'70px','match controls need a fixed non-overlapping action row on compact phones')
 for(const mode of ['inline','plain','sparkling','glass','plain-glass']){
  const content=renderPhoneCoreRecord(record,{...studio,defaultShellMode:mode},{chatId:'chat',records:[]})
  const doc=new JSDOM(content,{virtualConsole:new VirtualConsole()}).window.document
  assert(doc.querySelector('.rrt-root>details').open,`${mode} story preference must keep the phone app open`)
  assert.equal(doc.querySelector('.rrt-root>details>summary').dataset.rrLauncherMode,'inline','phone uses its own inline presentation')
 }
 console.log('Phone Tinder DOM passed: real deck, default selection, scoped right-click, story editing retained, and complete height chain. Pixel geometry requires live browser verification.')
}finally{cleanup();dom.window.close()}
