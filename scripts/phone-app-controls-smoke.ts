// @ts-nocheck -- mounted production renderers and DI; not live model evidence.
import assert from 'node:assert/strict'
import {JSDOM,VirtualConsole} from 'jsdom'
import {mountPhoneAppControls} from '../src/phoneAppControls'
import {phoneAppTargets,phoneAppInteractionMode} from '../src/phoneAppInteractions'
import {phoneSourceBubbles,phoneAppResponder} from '../src/phoneAppBubbles'
import {mountPhoneConversationPicker,phoneAvatarUrl} from '../src/phoneAppAccounts'
import {renderPhoneCoreRecord} from '../src/phoneCoreApps'
import {shippedSurfaceDefinitions} from '../src/shippedSurfaceDefinitions'
import {r45SupplementalSurfaceDefinitions} from '../src/r45SurfaceCatalog'
import {emptyPhoneDevice,normalizePhoneDevice,phoneContextForPrompt,addPhoneText} from '../src/phoneDevice'
import {createPhoneService} from '../src/phoneService'
const virtualConsole=new VirtualConsole();const dom=new JSDOM('<body></body>',{virtualConsole,pretendToBeVisual:true});globalThis.document=dom.window.document;globalThis.window=dom.window
const ids=[{id:'character:1',kind:'character',name:'Actor A'},{id:'persona:2',kind:'persona',name:'Actor B'}]
assert.equal(phoneAppInteractionMode('dating-profile'),'message','Tinder exposes a private message thread, not a social comment composer')
let count=0
for(const definition of [...shippedSurfaceDefinitions(0),...r45SupplementalSurfaceDefinitions(0)]){
 const mode=phoneAppInteractionMode(definition.baseSurfaceId);if(!mode)continue
 const root=document.createElement('div').attachShadow({mode:'open'}),targets=phoneAppTargets(definition.sampleXml),sent=[]
 root.innerHTML=renderPhoneCoreRecord({id:'record',appId:definition.baseSurfaceId,markup:definition.sampleXml,messageId:'saved',swipeId:0,title:'Test'},{defaultShellMode:'inline',definitions:{},customStyles:{}},{autoGenerate:false})
 mountPhoneAppControls(root,{appId:definition.baseSurfaceId,owner:ids[1].id,identities:ids,targets,bubbles:phoneSourceBubbles(targets,ids),entries:[],drafts:new Map(),pending:false,post:(text,target)=>sent.push({text,target}),inspect(){}})
 const forms=[...root.querySelectorAll('.rp-phone-composer')];assert(forms.length,`${definition.baseSurfaceId}: input is mounted inside the app`)
 forms.forEach((form,index)=>{const input=form.querySelector('textarea');input.value=`reply ${index}`;input.dispatchEvent(new window.Event('input'));form.dispatchEvent(new window.Event('submit',{cancelable:true}));assert.equal(sent.at(-1).text,`reply ${index}`);assert(targets.some(target=>target.id===sent.at(-1).target),`${definition.baseSurfaceId}: exact source target`)})
 assert.equal(root.querySelectorAll('.app-compose').length,0);count++
}
assert.equal(count,24)
const themed=document.createElement('div').attachShadow({mode:'open'});themed.innerHTML='<div class="rr23-igdm-chat"><div class="srv-msg-right"><div class="srv-bubble" style="background-color:rgb(55,151,240);color:white">Old sent text</div></div><div class="srv-bubble" style="background-color:rgb(38,38,38)">Incoming</div></div><div class="rr23-igdm-composer"><span class="rr23-igdm-field">Message…</span></div>'
mountPhoneAppControls(themed,{appId:'instagram-dm',owner:ids[1].id,identities:ids,targets:[{id:'root',label:'DM'}],bubbles:[],entries:[{id:'new',recordId:'record',appId:'instagram-dm',from:ids[1].id,body:'New sent text',createdAt:1}],drafts:new Map(),pending:false,post(){},inspect(){}})
assert.equal(themed.querySelector('.rp-phone-bubble.self').style.backgroundColor,'rgb(55, 151, 240)','new messages inherit the app outgoing palette instead of shell burgundy')
const accountState=emptyPhoneDevice();accountState.portraits={[ids[0].id]:{status:'ready',prompt:'Portrait',framing:'character-portrait',connectionId:'native',imageId:'avatar-1',imageUrl:'/api/images/avatar-1'}}
themed.prepend(Object.assign(document.createElement('header'),{className:'rr23-igdm-head',innerHTML:'<span class="rr23-igdm-av">A</span><b>Actor A</b>'}))
let selected='';mountPhoneConversationPicker(themed,{appId:'instagram-dm',choices:[{id:'one',recordId:'one',label:'Actor A',actorId:ids[0].id},{id:'two',recordId:'two',label:'Second contact'}],currentId:'one',identities:ids,state:accountState,select:choice=>{selected=choice.recordId}})
assert.equal(phoneAvatarUrl(ids[0],accountState),'/api/images/avatar-1')
assert(themed.querySelector('.rp-conversation-trigger img'),'saved portrait is reused in the app header')
themed.querySelector('.rp-conversation-trigger').click();assert(!themed.querySelector('.rp-conversations').hidden)
themed.querySelectorAll('.rp-conversation-choice')[1].click();assert.equal(selected,'two');assert(themed.querySelector('.rp-conversations').hidden)
const xml='<instagram_dm name="Actor A"><dm_msg user="Actor A" side="left">Hello.</dm_msg><dm_msg user="Actor B" side="right">Hi.</dm_msg></instagram_dm>',targets=phoneAppTargets(xml),bubbles=phoneSourceBubbles(targets,ids)
assert.equal(bubbles[0].actorId,ids[0].id);assert.equal(bubbles[1].actorId,ids[1].id)
const comments=phoneSourceBubbles([{id:'root',markup:'<forum_thread><fm_comments><fm_comment user="Actor A">A source comment.</fm_comment></fm_comments></forum_thread>'}],ids);assert.equal(comments[0].actorId,ids[0].id);assert.equal(comments[0].body,'A source comment.')
let state=emptyPhoneDevice(),spends=0,active=true;const outputs=[]
const service=createPhoneService({read:async()=>structuredClone(state),mutate:async(_c,_u,fn)=>{const draft=normalizePhoneDevice(state);fn(draft);state=draft},identities:async()=>ids,projection:async()=>({}),appView:async()=>{if(!active)throw new Error('Source changed');return {interactionMode:'message',targetId:'root',sourceMarkup:xml,bubbles}},generate:async()=>{spends++;return 'Alternative greeting.'},send:message=>outputs.push(message)})
const command=(action,patch={})=>({type:'reverie_phone_command',chatId:'chat-test',operationId:crypto.randomUUID(),action,...patch})
await service.handle(command('settings',{connectionId:'test-connection',contextMode:'manual',autoReply:false}))
assert.equal(phoneContextForPrompt(state,ids).content,'')
await service.handle(command('send',{from:ids[1].id,to:ids[0].id,text:'Context only.'}))
await service.handle(command('continue',{from:ids[1].id,to:ids[0].id}))
assert.equal(spends,0);assert(phoneContextForPrompt(state,ids).content.includes('Context only.'));assert(phoneContextForPrompt(state,ids).requestId)
delete state.contextRequest;assert.equal(phoneContextForPrompt(state,ids).content,'')
await service.handle(command('settings',{contextMode:'automatic'}));assert(phoneContextForPrompt(state,ids).content.includes('Context only.'))
const regen=command('app-regenerate',{from:ids[1].id,appId:'instagram-dm',recordId:'record',targetId:'root',messageId:bubbles[0].id})
await Promise.all([service.handle(regen),service.handle(regen)]);assert.equal(spends,1);assert.equal(state.appInteractions[0].sourceBubbleId,bubbles[0].id);assert.equal(state.appInteractions[0].variants[0].body,'Hello.');assert(state.appInteractions[0].generation.prompt.length)
await service.handle({...regen,operationId:crypto.randomUUID(),messageId:bubbles[1].id});assert.equal(spends,1,'persona source not generated')
active=false;await service.handle({...regen,operationId:crypto.randomUUID()});assert.equal(spends,1,'inactive source prevents spend')
assert.equal(normalizePhoneDevice(state).appInteractions[0].generation.connectionId,'test-connection')
// Real automatic reply path, serialized with delivery, bounded to one attempt.
active=true;state=emptyPhoneDevice();state.connectionId='test-connection';spends=0
const automatic=createPhoneService({read:async()=>structuredClone(state),mutate:async(_c,_u,fn)=>{const draft=normalizePhoneDevice(state);fn(draft);state=draft},identities:async()=>ids,projection:async()=>({}),appView:async command=>{assert.equal(command.ownerId||command.from,ids[1].id);return {interactionMode:'message',targetId:'root',sourceMarkup:xml,bubbles,replyActorId:ids[0].id}},generate:async()=>{spends++;return 'Automatic app reply.'},send:message=>outputs.push(message)})
assert.equal(phoneAppResponder(xml,ids,ids[1].id),ids[0].id)
const post=command('app-post',{from:ids[1].id,appId:'instagram-dm',recordId:'record',targetId:'root',text:'Please confirm.'})
await Promise.all([automatic.handle(post),automatic.handle(post)])
assert.equal(spends,1);assert.equal(state.appInteractions.length,2);assert.equal(state.appInteractions[1].replyTo,post.operationId)
await automatic.handle(command('send',{from:ids[0].id,to:ids[1].id,text:'An incoming text.'}));assert.equal(spends,1,'no automatic user response')
await automatic.handle(command('send',{from:ids[1].id,to:ids[0].id,text:'A direct user text.'}));assert.equal(spends,2,'direct send gets an automatic character reply')
await automatic.handle(command('settings',{autoReply:false}));await automatic.handle({...post,operationId:crypto.randomUUID()});assert.equal(spends,2,'manual switch stops automatic app spending')
assert(!('personaAuthoring' in normalizePhoneDevice({...state,personaAuthoring:'model'})),'no persona-permission policy is stored')
const failedState=emptyPhoneDevice();failedState.connectionId='test-connection';let failedSpends=0
const failure=createPhoneService({read:async()=>structuredClone(failedState),mutate:async(_c,_u,fn)=>fn(failedState),identities:async()=>ids,projection:async()=>({}),appView:async()=>({interactionMode:'message',targetId:'root',sourceMarkup:xml,replyActorId:ids[0].id}),generate:async()=>{failedSpends++;throw new Error('Provider down')},send:message=>outputs.push(message)})
await failure.handle(post);await failure.handle(post);assert.equal(failedSpends,1);assert.equal(failedState.appInteractions.length,1,'failed automatic app reply preserves posted text without an automatic retry')
console.log('Phone app controls passed: all 24 interactive production app renderers have in-app composers; exact targets; source author mapping; bounded regeneration/history/details/dedup/persona protection; silent automatic/manual next-prompt context, no story spend.')
