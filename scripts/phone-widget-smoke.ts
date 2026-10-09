// @ts-nocheck -- production phone service and mounted widget with a simulated host.
import assert from 'node:assert/strict'
import { emptyPhoneDevice, normalizePhoneDevice, addPhoneText, phoneConversation, phoneReplyPrompt, phoneStoryContext } from '../src/phoneDevice'
import { createPhoneService } from '../src/phoneService'
import { mountPhoneWidget, phoneWidgetCss } from '../src/phoneWidget'
import {renderPhoneActivities} from '../src/phoneStoryBridge'
import {phoneContextDraft,renderPhoneContextDraft} from '../src/phoneComposerDraft'
import {phoneRpContext} from '../src/phoneRpContext'
import {PHONE_CORE_APPS} from '../src/phoneCoreApps'
import {phoneAppInteractionMode} from '../src/phoneAppInteractions'
import {PHONE_APP_PRESENTATION_CSS,applyPhoneAppDarkTheme} from '../src/phoneAppPresentation'
import {latestPhoneArchive,phoneArchivePath} from '../src/phoneArchive'
const identities = [{id:'character:1',name:'Character A',kind:'character',description:'A measured, concise speaker.'},{id:'persona:2',name:'Persona B',kind:'persona'}]
const state=emptyPhoneDevice()
assert.equal(latestPhoneArchive(undefined,state),state,'separate checkpoint survives a general-state downgrade')
assert.equal(latestPhoneArchive(state,{...state,revision:2}).revision,2,'checkpoint restores a newer phone transaction')
assert.equal(latestPhoneArchive({...state,revision:3},state).revision,3,'a stale checkpoint does not roll back primary storage')
assert(!phoneArchivePath('../other').includes('../'),'archive filenames are confined to their namespace')
addPhoneText(state,{id:'send-00000001',from:identities[1].id,to:identities[0].id,body:'Are you nearby?'},identities,100)
addPhoneText(state,{id:'send-00000001',from:identities[1].id,to:identities[0].id,body:'Are you nearby?'},identities,101)
assert.equal(state.messages.length,1,'duplicate send must be delivery once')
assert.equal(phoneConversation(state,identities[0].id,identities[1].id).length,1,'both phones share the same thread')
assert.throws(()=>addPhoneText(state,{id:'send-00000001',from:identities[1].id,to:identities[0].id,body:'different'},identities),/different message/)
assert.throws(()=>normalizePhoneDevice({...state,schemaVersion:2}),/unsupported storage/)
assert.throws(()=>normalizePhoneDevice({...state,messages:[state.messages[0],state.messages[0]]}),/invalid message/)
const privateThread={...state,messages:[...state.messages,{id:'secret-000001',from:'character:other',to:'persona:other',body:'PRIVATE OTHER INBOX',createdAt:90,replyStatus:'none'}]}
assert(!JSON.stringify(phoneReplyPrompt(privateThread,state.messages[0],identities)).includes('PRIVATE OTHER INBOX'))
assert(!phoneStoryContext(privateThread,identities).includes('PRIVATE OTHER INBOX'))
assert.throws(()=>phoneReplyPrompt(state,{...state.messages[0],from:identities[0].id,to:identities[1].id},identities),/composer/)
const rp=phoneRpContext([{role:'assistant',content:'The rehearsal entrance is closed for repairs. <think>HIDDEN REASONING</think><Plot_Sparks>SPECULATIVE FUTURE</Plot_Sparks><instagram_dm>PRIVATE APP INBOX</instagram_dm>[instagram_dm name="Other"]PRIVATE BRACKET INBOX[/instagram_dm][Plot_Sparks]BRACKET FUTURE[/Plot_Sparks]'}])
assert(rp.includes('closed for repairs')&&!/HIDDEN REASONING|SPECULATIVE FUTURE|PRIVATE APP INBOX/.test(rp))
assert(!/PRIVATE BRACKET INBOX|BRACKET FUTURE/.test(rp),'legacy bracket app records and speculative utilities are not common RP knowledge')
assert(JSON.stringify(phoneReplyPrompt(state,state.messages[0],identities,rp)).includes('closed for repairs'))
assert(phoneRpContext(Array.from({length:30},()=>({role:'assistant',content:'x'.repeat(10000)}))).length<14500)
const stores=new Map();let generated=0;let fail=true;let handoffs=0;const outputs=[]
const key=(chat,user)=>`${user}:${chat}`
const service=createPhoneService({
  read:async(chat,user)=>structuredClone(stores.get(key(chat,user))),
  mutate:async(chat,user,change)=>{const draft=normalizePhoneDevice(structuredClone(stores.get(key(chat,user))));change(draft);stores.set(key(chat,user),draft)},
  identities:async()=>identities, projection:async()=>({saved:[{ownerName:'Legacy owner'}],connections:[]}),
  rpContext:async(chat,user)=>{assert.equal(chat,'chat-a');assert.equal(user,'user-a');return rp},
  generate:async(id,prompt)=>{assert.equal(id,'phone-connection');assert(prompt[0].content.includes('sent by Character A'));assert(JSON.stringify(prompt).includes('closed for repairs'));generated++;if(fail)throw new Error('Provider unavailable');return 'I’m just outside.'},
  continueStory:async()=>{handoffs++},send:message=>outputs.push(message),
})
const action=(name,patch={})=>({type:'reverie_phone_command',chatId:'chat-a',operationId:crypto.randomUUID(),action:name,...patch})
await service.handle(action('settings',{autoReply:false}),'user-a')
const sent=action('send',{from:identities[1].id,to:identities[0].id,text:'Are you nearby?'})
await Promise.all([service.handle(sent,'user-a'),service.handle(sent,'user-a')])
assert.equal(generated,0,'sending never authorizes a model reply')
assert.equal(stores.get('user-a:chat-a').messages.length,1)
await service.handle(action('settings',{connectionId:'phone-connection'}),'user-a')
await service.handle(action('settings',{from:'character:1',legacyOwnerName:'Legacy owner'}),'user-a')
assert.equal(stores.get('user-a:chat-a').linkedOwners['Legacy owner'],'character:1','legacy names require an explicit confirmed link')
await service.handle(action('settings',{from:'character:1',legacyOwnerName:'Invented owner'}),'user-a')
assert(!stores.get('user-a:chat-a').linkedOwners['Invented owner'],'unconfirmed ownership cannot be invented')
await service.handle(action('reply',{messageId:sent.operationId}),'user-a')
assert.equal(stores.get('user-a:chat-a').messages[0].replyStatus,'failed')
assert.equal(stores.get('user-a:chat-a').messages[0].body,'Are you nearby?','outage cannot remove the outgoing text')
fail=false
await Promise.all([service.handle(action('reply',{messageId:sent.operationId}),'user-a'),service.handle(action('reply',{messageId:sent.operationId}),'user-a')])
assert.equal(generated,2,'one failed attempt and one successful retry; duplicate click cannot spend again')
assert.equal(stores.get('user-a:chat-a').messages.length,2)
assert.equal(stores.get('user-a:chat-a').messages[1].from,'character:1')
await service.handle(action('reply',{messageId:`reply-${sent.operationId}`}),'user-a')
assert.equal(generated,2,'model never replies as persona')
await service.handle(action('continue',{from:'persona:2',to:'character:1'}),'user-a');assert.equal(handoffs,0);assert(stores.get('user-a:chat-a').contextRequest,'manual context is queued without appending chat or starting generation')
await service.handle(action('load'),'user-b');assert.equal(outputs.at(-1).state.messages.length,0,'users are isolated')
const interrupted=structuredClone(stores.get('user-a:chat-a'));interrupted.messages[0].replyStatus='pending';stores.set('user-a:chat-a',interrupted)
await service.handle(action('load'),'user-a');assert.equal(stores.get('user-a:chat-a').messages[0].replyStatus,'failed','orphaned pending recovers without automatic retries')

// Abort invalidates active results and queued spend, but preserves the delivered text.
let abortEpoch=0;let starts=0;let cancelledHandoffs=0;let releaseReply;let started
const startedReply=new Promise(resolve=>{started=resolve})
const heldReply=new Promise(resolve=>{releaseReply=resolve})
let cancelState=emptyPhoneDevice();cancelState.connectionId='phone-connection'
addPhoneText(cancelState,{id:'cancel-send-001',from:'persona:2',to:'character:1',body:'Still there?'},identities)
const cancelledService=createPhoneService({
  read:async()=>structuredClone(cancelState),mutate:async(_chat,_user,change)=>{const next=structuredClone(cancelState);change(next);cancelState=next},
  identities:async()=>identities,projection:async()=>({saved:[],connections:[]}),send:()=>{},
  captureAuthorization:()=>{const epoch=abortEpoch;return()=>epoch===abortEpoch},
  generate:async()=>{starts++;started();await heldReply;return 'Late reply'},continueStory:async()=>{cancelledHandoffs++},
})
const activeReply=cancelledService.handle(action('reply',{messageId:'cancel-send-001'}),'abort-user')
await startedReply
await cancelledService.handle(action('load'),'abort-user')
assert.equal(cancelState.messages[0].replyStatus,'pending','reopening an active reply cannot mark it orphaned')
const queuedReply=cancelledService.handle(action('reply',{messageId:'cancel-send-001'}),'abort-user')
const queuedHandoff=cancelledService.handle(action('continue',{from:'persona:2',to:'character:1'}),'abort-user')
abortEpoch++;releaseReply()
await Promise.all([activeReply,queuedReply,queuedHandoff])
assert.equal(starts,1,'Abort All blocks queued successor provider starts')
assert.equal(cancelledHandoffs,0,'queued continuation cannot start a story reply after Abort All')
assert.equal(cancelState.messages.length,1,'cancelled provider results never enter the inbox')
assert.equal(cancelState.messages[0].replyStatus,'failed')

const {JSDOM}=await import('jsdom')
const dom=new JSDOM('<!doctype html><body></body>',{url:'http://localhost/',pretendToBeVisual:true})
globalThis.window=dom.window;globalThis.document=dom.window.document
const sentUi=[];const handlers=[];const events=new Map();const widgets=[];let active='chat-a'
const ctx={getActiveChat:()=>({chatId:active,characterId:'1'}),sendToBackend:message=>sentUi.push(message),onBackendMessage:fn=>{handlers.push(fn);return()=>handlers.splice(handlers.indexOf(fn),1)},events:{on:(name,fn)=>{events.set(name,fn);return()=>events.delete(name)}},ui:{createFloatWidget:options=>{const root=document.createElement('div');document.body.append(root);const widget={root,options,visible:true,setVisible(value){this.visible=value},destroy(){root.remove();this.destroyed=true}};widgets.push(widget);return widget}}}
const controller=mountPhoneWidget(ctx);controller.open()
const projected={type:'phone_state',chatId:'chat-a',operationId:sentUi.at(-1).operationId,state:structuredClone(stores.get('user-a:chat-a')),identities,connections:[{id:'phone-connection',name:'Test connection',model:'test'}],saved:[{entryId:'photo',ownerName:'Persona B',kind:'photo',app:'Photos',title:'Saved photo',body:'',imageUrl:'http://localhost/photo.png'}]}
handlers[0](projected)
const root=()=>widgets.at(-1).root.shadowRoot
const click=(label)=>{const button=[...root().querySelectorAll('button')].find(button=>button.textContent===label);assert(button,`missing ${label}`);button.click()}
click('Messages');root().querySelector('.row').click()
assert(root().textContent.includes('I’m just outside.'))
assert.equal(root().querySelectorAll('.bubble').length,2)
let input=root().querySelector('[aria-label="Phone message"]');input.value='First draft';input.dispatchEvent(new window.Event('input'));input.focus()
handlers[0]({...projected,operationId:'status-refresh',state:{...projected.state,revision:100}})
assert.equal(root().querySelector('textarea').value,'First draft','state refresh preserves composer draft')
assert.equal(root().activeElement.getAttribute('aria-label'),'Phone message','state refresh preserves focus')
root().querySelector('form').dispatchEvent(new window.Event('submit',{cancelable:true}))
const submit=sentUi.at(-1);assert.equal(submit.action,'send');assert.equal(submit.text,'First draft')
input=root().querySelector('textarea');input.value='Next draft';input.dispatchEvent(new window.Event('input'))
handlers[0]({...projected,operationId:submit.operationId,state:{...projected.state,revision:101}})
assert.equal(root().querySelector('textarea').value,'Next draft','late send acknowledgement cannot erase subsequent typing')
const commandsBeforeContext=sentUi.length;click('Use in Story')
assert.equal(sentUi.length,commandsBeforeContext,'composer handoff is not a backend continue/send request')
assert(root().textContent.includes('Main story composer is unavailable. Nothing was sent.'),'missing composer must leave the phone and its texts available')
assert(!root().querySelector('.owner'),'phone ownership is not switched inside a conversation')
root().querySelector('.head button').click()
const owner=root().querySelector('.owner');owner.value='character:1';owner.dispatchEvent(new window.Event('change'))
click('Messages');root().querySelector('.row').click()
assert(root().querySelector('.bubble.self').textContent.includes('I’m just outside.'),'same thread reverses bubble ownership on the other phone')
assert(![...root().querySelectorAll('button')].some(button=>/Get Persona|Retry Persona/.test(button.textContent)),'no persona model-reply button')
root().querySelector('.head button').click()
const ownerAgain=root().querySelector('.owner');ownerAgain.value='persona:2';ownerAgain.dispatchEvent(new window.Event('change'))
click('Photos');assert.equal(root().querySelector('img').src,'http://localhost/photo.png')
root().querySelector('.head button').click();click('Settings')
assert.equal(root().querySelector('#phone-connection').value,'phone-connection')
assert(!root().querySelector('#phone-incoming-transport') && root().textContent.includes('Incoming text transport: XML'), 'XML-only staging cannot expose a native toggle')
const frequency=root().querySelector('#phone-incoming-frequency');assert.equal(frequency.value,'model')
assert(root().querySelector('#phone-incoming-interval').parentElement.hidden,'Model determined hides the interval control')
frequency.value='every';frequency.dispatchEvent(new window.Event('change'))
assert(root().querySelector('#phone-incoming-interval').parentElement.hidden,'Every eligible message hides the interval control')
const everyFrequency=root().querySelector('#phone-incoming-frequency');everyFrequency.value='model';everyFrequency.dispatchEvent(new window.Event('change'))
assert(root().querySelector('#phone-incoming-interval').parentElement.hidden,'switching back to Model determined hides the interval')
const intervalFrequency=root().querySelector('#phone-incoming-frequency')
intervalFrequency.value='every-n';intervalFrequency.dispatchEvent(new window.Event('change'))
assert(!root().querySelector('#phone-incoming-interval').parentElement.hidden,'Every X messages exposes the interval')
const interval=root().querySelector('#phone-incoming-interval');interval.value='4';interval.dispatchEvent(new window.Event('input'))
const cap=root().querySelector('#phone-incoming-cap');cap.value='2';cap.dispatchEvent(new window.Event('input'))
assert(root().textContent.includes('Max notifications per response: 2')&&root().textContent.includes('Every 4 eligible messages'))
const scene=root().querySelector('#phone-scene');scene.value='Both participants are arranging lunch.';scene.dispatchEvent(new window.Event('input'))
click('Save phone settings');assert.equal(sentUi.at(-1).sharedScene,'Both participants are arranging lunch.')
assert.deepEqual(sentUi.at(-1).incoming,{frequency:'every-n',everyN:4,maxNotifications:2})
const legacyPicker=root().querySelector('#phone-legacy-owner');legacyPicker.value='Persona B'
click('Link records to this phone');assert.equal(sentUi.at(-1).legacyOwnerName,'Persona B');assert.equal(sentUi.at(-1).from,'persona:2')
assert(root().querySelector('.hardware')&&root().querySelector('.island'),'realistic device frame and status island are mounted')
root().querySelector('[aria-label="Close phone"]').click()
const notificationHost=document.createElement('div');document.body.append(notificationHost)
const notificationRoot=notificationHost.attachShadow({mode:'open'});notificationRoot.innerHTML=renderPhoneActivities('<reverie-phone from="character" to="persona" scope="character:1|persona:2">Come outside.</reverie-phone>').content
const spendBefore=sentUi.filter(message=>['reply','continue'].includes(message.action)).length
notificationRoot.querySelector('button').click()
handlers[0]({...projected,operationId:sentUi.at(-1).operationId,state:{...projected.state,revision:103}})
assert(root().querySelector('.head strong').textContent==='Character A','notification deep-link opens the correct thread through a real ShadowDOM click')
assert(!root().querySelector('.owner'),'notification opens a conversation, not an owner picker')
assert.equal(sentUi.filter(message=>['reply','continue'].includes(message.action)).length,spendBefore,'opening a notification never starts another model or story reply')
root().querySelector('.head button').click()
handlers[0]({...projected,operationId:'app-library',state:{...projected.state,revision:104},apps:[{id:'instagram-dm',label:'Instagram Direct Messages',icon:'◎'}],appRecords:[{id:'source:0:instagram',appId:'instagram-dm',title:'Saved conversation',messageId:'source',swipeId:0}]})
assert(root().querySelector('[aria-label="Open Core app Instagram Direct Messages"] svg'),'Core apps have actual vector home icons, not a text list')
root().querySelector('[aria-label="Open Core app Instagram Direct Messages"]').click()
const appCommand=sentUi.at(-1);assert.equal(appCommand.action,'app');assert.equal(appCommand.from,'persona:2')
assert.equal(appCommand.recordId,'source:0:instagram','a home icon opens the latest source-owned app directly')
handlers[0]({type:'phone_app',chatId:'chat-a',operationId:appCommand.operationId,appId:'instagram-dm',recordId:'source:0:instagram',html:'<details class="srv2-collapse"><summary>Outer launcher</summary><div class="rr23-igdm-phone"><details><summary>Conversation</summary><input type="checkbox" aria-label="Page two"><p>Saved message</p></details></div></details><script>bad()</script><button onclick="bad()">Control</button>'})
const appRoot=root().querySelector('.core-app-view').shadowRoot
assert(!appRoot.querySelector('script')&&!appRoot.querySelector('[onclick]'),'phone does not execute app source scripts or event attributes')
assert(appRoot.querySelector('.srv2-collapse').open,'outer Surface is already open inside the app')
assert.equal(appRoot.querySelector('[data-reverie-phone-app-presentation]').textContent,PHONE_APP_PRESENTATION_CSS,'phone-only full-bleed presentation does not alter the chat renderer')
const lightHost=document.createElement('div');document.body.append(lightHost);const lightRoot=lightHost.attachShadow({mode:'open'});lightRoot.innerHTML='<section style="background-color:rgb(255,255,255);color:rgb(0,0,0)">Bright app surface</section>';applyPhoneAppDarkTheme(lightRoot);assert.notEqual(lightRoot.querySelector('section').style.getPropertyValue('background-color'),'rgb(255, 255, 255)','phone-local app adaptation writes a dark surface override');assert.notEqual(lightRoot.querySelector('section').style.getPropertyValue('color'),'rgb(0, 0, 0)','darkened phone app text receives a readable override');lightHost.remove()
const appActivityButton=root().querySelector('[aria-label="Open messages and comments"]');assert(appActivityButton,'every app has an outer-phone route to its messages/comments');appActivityButton.click()
assert(root().querySelector('.head strong').textContent==='Messages & comments'&&root().querySelector('[aria-label="App message"]'),'app messages are reachable from the phone header even after an app notification deep-link')
assert(root().querySelector('.head [aria-label="Back to app"] svg'),'the messages doorway uses a recognizable app-navigation icon')
root().querySelector('.head button').click();assert(root().querySelector('.core-app-view'),'app activity back navigation returns to the same app')
const disclosure=appRoot.querySelector('.rr23-igdm-phone details');assert(!disclosure.open,'inner app navigation is not force-opened');disclosure.open=true
const pageControl=appRoot.querySelector('input');pageControl.click();assert(pageControl.checked,'real app controls remain interactive inside the phone')
handlers[0]({...projected,operationId:'changed-source',state:{...projected.state,revision:105},apps:[{id:'instagram-dm',label:'Instagram Direct Messages',icon:'◎'}],appRecords:[]})
assert(!root().querySelector('.core-app-view'),'replaced/deleted source cannot leave stale app markup visible')
root().querySelector('.head button').click()
handlers[0]({...projected,operationId:'all-app-home',state:{...projected.state,revision:106},apps:PHONE_CORE_APPS,appRecords:[]})
root().querySelector('[aria-label="Open Core app Instagram Direct Messages"]').click()
assert(root().textContent.includes('nothing needs to appear in chat first'),'an empty app has an independent setup path')
root().querySelector('[aria-label="Set up phone-local app"]').click()
const setup=root().querySelector('[aria-label="Phone app setup"]');setup.value='A conversation with the current character.';setup.dispatchEvent(new window.Event('input'))
click('Generate app content');const creation=sentUi.at(-1);assert.equal(creation.action,'app-create');assert.equal(creation.from,'persona:2')
handlers[0]({...projected,operationId:creation.operationId,state:{...projected.state,revision:107},error:'Test provider offline',apps:PHONE_CORE_APPS,appRecords:[]})
assert.equal(root().querySelector('[aria-label="Phone app setup"]').value,'A conversation with the current character.','failed setup preserves its draft')
assert(root().textContent.includes('Test provider offline'))
root().querySelector('.head button').click()
const allHomeApps=new Set<string>()
for(let page=0;page<4;page++){
 for(const icon of root().querySelectorAll('[aria-label^="Open Core app "]')){assert(icon.querySelector('svg'),'every Core home icon has a vector');allHomeApps.add(icon.getAttribute('aria-label'))}
 const next=root().querySelector('[aria-label="Next app page"]');if(next&&!next.disabled)next.click()
}
assert.equal(allHomeApps.size,47,'all 47 Core apps are reachable from paged phone home icons')
// Exercise the persistent Messages doorway from every Core app, not just Instagram.
handlers[0]({...projected,operationId:'app-doorway-sweep',state:{...projected.state,revision:108},apps:PHONE_CORE_APPS,appRecords:[]})
while(root().querySelector<HTMLButtonElement>('[aria-label="Previous app page"]')&&!root().querySelector<HTMLButtonElement>('[aria-label="Previous app page"]')!.disabled)root().querySelector<HTMLButtonElement>('[aria-label="Previous app page"]')!.click()
for(let page=0;page<4;page++){
 for(const icon of [...root().querySelectorAll<HTMLButtonElement>('[aria-label^="Open Core app "]')]){
  const appLabel=icon.getAttribute('aria-label')!,app=PHONE_CORE_APPS.find(entry=>appLabel===`Open Core app ${entry.label}`)!
  icon.click();const doorway=root().querySelector<HTMLButtonElement>('[aria-label="Open messages and comments"]');assert(doorway,`${app.id}: app shell exposes the messages/comments doorway`);assert(doorway.querySelector('svg'),`${app.id}: doorway has a visible messages icon`)
  doorway.click();assert.equal(root().querySelector('.head strong')?.textContent,'Messages & comments',`${app.id}: doorway opens the shared activity screen`)
  assert(root().textContent.includes('Choose an app record first'),`${app.id}: empty-record route explains why activity is not yet available`)
  assert([...root().querySelectorAll('button')].some(button=>button.textContent==='Back to app library'),`${app.id}: empty-record recovery links back to the app library`)
  root().querySelector<HTMLButtonElement>('[aria-label="Back to app"]')!.click();root().querySelector('.head button')!.click()
 }
 const next=root().querySelector<HTMLButtonElement>('[aria-label="Next app page"]');if(page<3){assert(next&&!next.disabled,'all Core app pages are traversable');next.click()}
}
// Reproduce the reported Tinder notification entry path: deep-link to the app,
// then reach Tinder messages without relying on the original chat Surface.
const tinderRecord={id:'tinder-source',appId:'dating-profile',title:'Taejun · Tinder',messageId:'story-source',swipeId:0,ownerId:'persona:2'}
const tinderParent={id:'tinder-user-message',recordId:tinderRecord.id,appId:'dating-profile',from:'persona:2',body:'Your profile made me laugh.',createdAt:1,targetId:'tinder-chat',sourceBubbleId:'tinder-source-bubble'}
const tinderReply={id:'tinder-character-reply',recordId:tinderRecord.id,appId:'dating-profile',from:'character:1',body:'Good. I was aiming for memorable.',createdAt:2,targetId:'tinder-chat',replyTo:tinderParent.id}
handlers[0]({...projected,operationId:'tinder-notification-fixture',state:{...projected.state,revision:109,appInteractions:[tinderParent,tinderReply],readAt:{}},apps:PHONE_CORE_APPS,appRecords:[tinderRecord]})
root().querySelector<HTMLButtonElement>('[aria-label="Phone notifications"]')!.click()
const tinderNotification=[...root().querySelectorAll<HTMLButtonElement>('.notification')].find(button=>button.textContent.includes('replied · Tinder'));assert(tinderNotification,'Tinder reply appears in the phone notification center');tinderNotification.click()
const tinderOpen=sentUi.at(-1);assert.equal(tinderOpen.action,'app');assert.equal(tinderOpen.appId,'dating-profile');assert.equal(tinderOpen.recordId,tinderRecord.id,'Tinder notification deep-links to its exact saved app')
assert(root().querySelector('[aria-label="Open messages and comments"]'),'Tinder app reached from a notification exposes a messages doorway')
handlers[0]({type:'phone_app',chatId:'chat-a',operationId:tinderOpen.operationId,appId:'dating-profile',recordId:tinderRecord.id,interactionMode:'message',targetId:'tinder-chat',targets:[{id:'tinder-chat',label:'Taejun messages',replyActorId:'character:1'}],bubbles:[{id:'tinder-source-bubble',targetId:'tinder-chat',actorId:'persona:2',author:'Arin',body:'Your profile made me laugh.'}],html:'<div class="rrt-root">Tinder</div>'})
root().querySelector<HTMLButtonElement>('[aria-label="Open messages and comments"]')!.click()
assert.equal(phoneAppInteractionMode('dating-profile'),'message','Tinder activity is modeled as a DM, not a public comment thread')
assert(root().querySelector('[aria-label="App message"]'),"Tinder's notification opens an app-local DM composer without returning to chat or story generation")
assert(root().textContent.includes('Good. I was aiming for memorable.'),'Tinder message history is visible from the notification deep-link')
root().querySelector<HTMLButtonElement>('[aria-label="Back to app"]')!.click();assert(root().querySelector('.core-app-view'),'Tinder activity back action returns to the same app')
root().querySelector('.head button')!.click()
while(root().querySelector<HTMLButtonElement>('[aria-label="Previous app page"]')&&!root().querySelector<HTMLButtonElement>('[aria-label="Previous app page"]')!.disabled)root().querySelector<HTMLButtonElement>('[aria-label="Previous app page"]')!.click()
const localImageRecord={...tinderRecord,id:'phone-app-local-image',local:true,title:'Local Tinder profile',media:[{id:'0-0',requestId:'tinder-profile',target:'custom.dating-profile',alt:'Profile portrait',image:{status:'failed',prompt:'A profile portrait of Taejun.',framing:'auto',connectionId:'',error:'provider offline'}}]}
handlers[0]({...projected,operationId:'local-image-record',state:{...projected.state,revision:111},apps:PHONE_CORE_APPS,appRecords:[localImageRecord]})
const tinderLabel=PHONE_CORE_APPS.find(app=>app.id==='dating-profile')!.label
root().querySelector<HTMLButtonElement>(`[aria-label="Open Core app ${tinderLabel}"]`)!.click()
const localOpen=sentUi.at(-1);handlers[0]({type:'phone_app',chatId:'chat-a',operationId:localOpen.operationId,appId:'dating-profile',recordId:localImageRecord.id,html:'<aside><button data-phone-app-image-retry="0-0">Retry image</button></aside><div>Tinder</div>'})
root().querySelector('.core-app-view')!.shadowRoot!.querySelector<HTMLButtonElement>('[data-phone-app-image-retry="0-0"]')!.click()
const imageRetry=sentUi.at(-1);assert.equal(imageRetry.action,'app-image');assert.equal(imageRetry.appId,'dating-profile');assert.equal(imageRetry.recordId,localImageRecord.id);assert.equal(imageRetry.mediaId,'0-0');assert.equal(imageRetry.from,'persona:2','image retry is scoped to the exact app record, image slot and phone owner')
const readyLocalImage={...localImageRecord,media:[{...localImageRecord.media[0],image:{status:'ready',prompt:'A profile portrait of Taejun.',framing:'auto',connectionId:'',imageId:'tinder-profile',imageUrl:'/api/images/tinder-profile'}}]}
handlers[0]({...projected,operationId:imageRetry.operationId,state:{...projected.state,revision:112},apps:PHONE_CORE_APPS,appRecords:[readyLocalImage]})
assert.equal(sentUi.at(-1).action,'app','a retry response refreshes the current exact app instead of leaving stale failed markup')
assert.equal(sentUi.at(-1).recordId,localImageRecord.id)
root().querySelector('.head button')!.click()
assert.equal(sentUi.filter(message=>['reply','continue'].includes(message.action)).length,spendBefore,'Core app navigation starts no model or story generation')
const composer=document.createElement('textarea');composer.name='chat-message';composer.value='My own draft stays.';document.body.append(composer)
const sentBeforeDraft=sentUi.length;let inputEvents=0;composer.addEventListener('input',()=>inputEvents++)
click('Messages');root().querySelector('.row').click();click('Use in Story')
assert(composer.value.startsWith('My own draft stays.\n\n<reverie-phone-context'))
assert.equal(inputEvents,1);assert.equal(document.activeElement,composer)
assert.equal(sentUi.length,sentBeforeDraft+1,'opening the thread only marks it read; Use in Story sends no backend command')
assert.equal(sentUi.at(-1).action,'read');composer.remove();controller.open();handlers[0]({...projected,operationId:sentUi.at(-1).operationId})
const hardware=root().querySelector('.hardware');hardware.dispatchEvent(new window.MouseEvent('contextmenu',{bubbles:true,cancelable:true}));assert(!root().querySelector('.resize-menu').hidden,'desktop right-click opens phone sizing controls')
root().querySelector('[aria-label="Large phone size"]').click();assert.equal(window.localStorage.getItem('reverie-phone-scale-v1'),'1.15','selected phone size persists locally')
hardware.dispatchEvent(new window.MouseEvent('contextmenu',{bubbles:true,cancelable:true}));root().querySelector('[aria-label="Default phone size"]').click();assert.equal(window.localStorage.getItem('reverie-phone-scale-v1'),'1','default size can be restored')
const top=root().querySelector('.top'),touchDown=new window.Event('pointerdown',{bubbles:true});Object.defineProperty(touchDown,'pointerType',{value:'touch'});top.dispatchEvent(touchDown);await new Promise(resolve=>setTimeout(resolve,650));assert(!root().querySelector('.resize-menu').hidden,'mobile long-press opens the same sizing controls');const touchUp=new window.Event('pointerup',{bubbles:true});Object.defineProperty(touchUp,'pointerType',{value:'touch'});top.dispatchEvent(touchUp)
const inboxBeforeContext=projected.state.messages.length
notificationRoot.innerHTML=renderPhoneContextDraft(phoneContextDraft(projected.state,identities,'character:1','persona:2')).content
const contextButton=notificationRoot.querySelector('button');const contextSender=contextButton.dataset.phoneFrom;const contextRecipient=contextButton.dataset.phoneTo;contextButton.dispatchEvent(new window.MouseEvent('click',{bubbles:true,cancelable:true,composed:true}))
handlers[0]({...projected,operationId:sentUi.at(-1).operationId,state:{...projected.state,revision:113}})
assert.equal(root().querySelector('.head strong').textContent,identities.find(actor=>actor.id===contextSender).name,'submitted context XML opens its exact confirmed conversation')
assert.equal(sentUi.at(-1).from,contextRecipient);assert.equal(sentUi.at(-1).to,contextSender)
assert.equal(projected.state.messages.length,inboxBeforeContext,'display-only context notification cannot duplicate the inbox')
notificationHost.remove()
active='chat-b';events.get('CHAT_CHANGED')();assert(widgets.at(-1).destroyed,'chat switch destroys the old phone overlay')
controller.open();handlers[0]({...projected,state:{...projected.state,revision:999}})
assert(!root().textContent.includes('I’m just outside.'),'late old-chat response cannot appear in another chat')
assert(phoneWidgetCss.includes('env(safe-area-inset-bottom)')&&phoneWidgetCss.includes('prefers-reduced-motion'))
controller.destroy();assert.equal(handlers.length,0);assert.equal(events.size,0);assert(widgets.every(widget=>widget.destroyed))
// Simulate socket startup dropping the first projection and mobile reconnect.
const originalSchedule=window.setTimeout;const originalCancel=window.clearTimeout
const loadTimers=new Map();let timerId=0
window.setTimeout=(callback)=>{const id=++timerId;loadTimers.set(id,callback);return id}
window.clearTimeout=id=>loadTimers.delete(id)
const recoveryController=mountPhoneWidget(ctx);recoveryController.open()
const recoverRoot=()=>widgets.at(-1).root.shadowRoot
const tickLoad=()=>{const [id,callback]=loadTimers.entries().next().value;loadTimers.delete(id);callback()}
const firstLoads=sentUi.length
assert.equal(loadTimers.size,1,'opening replaces the bootstrap timer rather than duplicating it')
tickLoad();assert.equal(sentUi.length,firstLoads+1);assert.equal(sentUi.at(-1).action,'load','socket recovery must never repeat text, reply or generation')
handlers[0]({...projected,chatId:'chat-b',operationId:sentUi.at(-1).operationId})
assert.equal(loadTimers.size,0);assert(!recoverRoot().textContent.includes('Loading this chat'))
window.dispatchEvent(new window.Event('online'));assert.equal(sentUi.at(-1).action,'load');assert.equal(loadTimers.size,1)
handlers[0]({...projected,chatId:'chat-b',operationId:sentUi.at(-1).operationId});assert.equal(loadTimers.size,0)
active='chat-c';events.get('CHAT_CHANGED')();recoveryController.open()
for(let retry=0;retry<4;retry++)tickLoad()
assert.equal(loadTimers.size,0,'failed loads stop after a bounded handshake')
assert(recoverRoot().textContent.includes('connection did not respond')&&!recoverRoot().textContent.includes('Loading this chat'))
const retryButton=[...recoverRoot().querySelectorAll('button')].find(button=>button.textContent==='Retry');retryButton.click()
assert.equal(loadTimers.size,1);assert(recoverRoot().textContent.includes('Loading this chat'))
const staleCallback=loadTimers.values().next().value
recoveryController.destroy();assert.equal(loadTimers.size,0);const stoppedCount=sentUi.length;staleCallback();assert.equal(sentUi.length,stoppedCount,'a detached phone cannot issue a delayed load')
// Optional Phone settings remain available without mounting an active handset.
let settingsVisits=0
const optionalController=mountPhoneWidget(ctx,{enabled:false,onSettings:()=>{settingsVisits++}})
const optionalLauncher=widgets.at(-1)
const quietStart=sentUi.length;optionalController.open()
assert(!optionalLauncher.visible&&sentUi.length===quietStart,'disabled Phone hides the launcher and sends no bootstrap/open requests')
const settingsHost=document.createElement('div');document.body.append(settingsHost);optionalController.mountSettings(settingsHost)
assert.equal(sentUi.at(-1).action,'load','disabled settings allow only a read-only projection')
const quietProjection={...projected,chatId:'chat-c',state:{...emptyPhoneDevice(),revision:1000},operationId:sentUi.at(-1).operationId}
handlers[0](quietProjection)
assert(settingsHost.shadowRoot.querySelector('#phone-incoming-frequency')&&settingsHost.shadowRoot.querySelector('#phone-connection'),'actual frequency and sidecar settings render in the dashboard host')
optionalController.setEnabled(true);handlers[0]({...quietProjection,operationId:sentUi.at(-1).operationId})
assert(optionalLauncher.visible&&loadTimers.size===0)
const launch=optionalLauncher.root.shadowRoot.querySelector('.launcher')
const incoming={id:'new-incoming-01',from:'character:1',to:'persona:2',body:'New incoming text',createdAt:Date.now(),replyStatus:'none'}
const received={...quietProjection,state:{...quietProjection.state,revision:1001,messages:[incoming]},operationId:'incoming-event'}
handlers[0](received)
assert(launch.classList.contains('is-vibrating')&&loadTimers.size===1,'a newly delivered incoming text vibrates the widget once')
assert(!launch.querySelector('.badge'),'badge must wait until the vibration ends')
tickLoad()
assert(!launch.classList.contains('is-vibrating')&&launch.querySelector('.badge').textContent==='1','notification badge appears after vibration')
handlers[0](received);assert.equal(loadTimers.size,0,'duplicate projections cannot replay notification animation')
const outgoing={...incoming,id:'manual-outgoing-01',from:'persona:2',to:'character:1'}
handlers[0]({...received,state:{...received.state,revision:1002,messages:[incoming,outgoing]}})
assert(!launch.classList.contains('is-vibrating')&&loadTimers.size===0,'manual outgoing texts do not vibrate the incoming widget')
window.matchMedia=()=>({matches:true})
handlers[0]({...received,state:{...received.state,revision:1003,messages:[incoming,{...incoming,id:'reduced-incoming-02'}]}})
assert(!launch.classList.contains('is-vibrating')&&loadTimers.size===0&&launch.querySelector('.badge').textContent==='2','reduced motion shows new unread count immediately without a shake or delay')
window.matchMedia=()=>({matches:false})
handlers[0]({...received,state:{...received.state,revision:1004,messages:[incoming,{...incoming,id:'reduced-incoming-02'},{...incoming,id:'incoming-03'}]}})
assert.equal(loadTimers.size,1)
optionalController.setEnabled(false)
assert(!optionalLauncher.visible&&!launch.classList.contains('is-vibrating')&&loadTimers.size===0,'disabling stops motion and timers without erasing inbox data')
optionalController.setEnabled(true);handlers[0]({...received,state:{...received.state,revision:1004,messages:[incoming,{...incoming,id:'incoming-03'}]},operationId:sentUi.at(-1).operationId})
assert(!launch.classList.contains('is-vibrating')&&loadTimers.size===0,'enabling an existing archive seeds unread state without replay')
optionalController.open();handlers[0]({...received,state:{...received.state,revision:1004},operationId:sentUi.at(-1).operationId})
const optionalRoot=widgets.at(-1).root.shadowRoot
optionalRoot.querySelector('[aria-label="Settings"]').click()
assert.equal(settingsVisits,0,'handset Settings must not redirect to the dashboard')
assert(!widgets.at(-1).destroyed,'Settings keeps the handset open')
assert(optionalRoot.querySelector('#phone-connection'),'Settings exposes the actual in-phone connection editor')
optionalController.destroy();settingsHost.remove()
window.setTimeout=originalSchedule;window.clearTimeout=originalCancel
assert.equal(handlers.length,0);assert.equal(events.size,0)
console.log('Phone widget smoke passed: durable delivery, shared ownership, bounded context, restart recovery, all 46 Core app message doorways, Tinder notification-to-DM navigation, exact app-image retry routing, resize controls, drafts/focus and teardown. Device geometry and actual generation require live-host tests.')
