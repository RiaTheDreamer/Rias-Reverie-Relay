// @ts-nocheck -- production DI service and mounted DOM; no live provider is simulated as proof.
import assert from 'node:assert/strict'
import {emptyPhoneDevice,addPhoneText,phoneUnread,normalizePhoneDevice,phoneStoryContext} from '../src/phoneDevice'
import {parsePhoneActivities,resolvePhoneParticipant,phoneStoryProtocol,renderPhoneActivities} from '../src/phoneStoryBridge'
import {phoneNpcContacts} from '../src/phoneContacts'
import {phoneAppTargets,phoneAppInteractionMode} from '../src/phoneAppInteractions'
import {phoneImagePrompt,phoneFramingCue,PHONE_FRAMING,normalizePhoneImage} from '../src/phoneMedia'
import {createPhoneService} from '../src/phoneService'
import {mountPhoneWidget} from '../src/phoneWidget'
const ids=[{id:'character:1',name:'Character A',kind:'character'},{id:'persona:2',name:'Persona B',kind:'persona'},{id:'npc:manual-3',name:'NPC C',kind:'npc',description:'Venue coordinator; knows the public delivery schedule.'}]
const npc='<reverie-phone from="npc:manual-3" to="character" scope="character:1|persona:2">The delivery is here.</reverie-phone>'
assert.equal(parsePhoneActivities(npc)[0].from,ids[2].id)
assert.equal(resolvePhoneParticipant('character',ids).id,ids[0].id)
assert(!resolvePhoneParticipant('npc:invented',ids))
assert(phoneStoryProtocol(ids).includes(ids[2].id))
assert(renderPhoneActivities(npc).content.includes('data-phone-from="npc:manual-3"'))
const photo=npc.replace('scope=','image-prompt="a wooden equipment case &amp; red label" scope=')
assert.equal(parsePhoneActivities(photo)[0].imagePrompt,'a wooden equipment case & red label')
assert.equal(parsePhoneActivities(npc.replace('from="npc:manual-3"','from="persona"')).length,0,'model cannot author persona text')
assert.deepEqual(phoneNpcContacts([], [{messageId:'m',swipeId:0,content:'```xml\n<NPC name="Fake">Invented.</NPC>\n```'}],ids),[])
const cast=phoneNpcContacts([],[{messageId:'m',swipeId:0,content:'<NPC name="Fresh NPC"><role>Courier</role></NPC>'}],ids)
assert.equal(cast[0].name,'Fresh NPC')
assert.equal(phoneNpcContacts([],[],ids).length,0,'no hardcoded NPC fallback')
const feed='<twitter_app><for_you><tw_post author="A">First post.</tw_post><tw_post author="B">Second post.</tw_post></for_you></twitter_app>'
const targets=phoneAppTargets(feed);assert.equal(targets.length,2);assert(!targets[0].markup.includes('Second post'))
assert.equal(phoneAppInteractionMode('twitter'),'comment');assert.equal(phoneAppInteractionMode('instagram-dm'),'message');assert.equal(phoneAppInteractionMode('location-share'),null)
assert(phoneImagePrompt('Camera: from above, wooden case').startsWith('View:'))
assert.throws(()=>phoneImagePrompt('<image_request>thing</image_request>'),/markup/)
assert.throws(()=>phoneFramingCue('invented'),/supported/)
assert(PHONE_FRAMING.some(mode=>mode.id==='cctv'))
assert(PHONE_FRAMING.some(mode=>mode.id==='selfie'))
assert(PHONE_FRAMING.some(mode=>mode.id==='social-candid'))
assert(!PHONE_FRAMING.some(mode=>mode.id==='storyboard'),'photo menu is not Illustrator scene selection')
assert(normalizePhoneImage({status:'draft',prompt:'Old saved draft',framing:'storyboard',connectionId:''}),'legacy photo drafts remain readable')
let state=emptyPhoneDevice(),images=0,replies=0,failImage=true,sourceActive=true;const output=[]
const service=createPhoneService({read:async()=>structuredClone(state),mutate:async(_c,_u,change)=>{const next=normalizePhoneDevice(structuredClone(state));change(next);state=next},identities:async()=>[...ids,...(state.npcContacts||[])],projection:async()=>({saved:[],connections:[]}),send:message=>output.push(message),rpContext:async()=> 'The venue delivery is due at noon. The private envelope is sealed.',appView:async command=>{if(!sourceActive)throw new Error('Source changed');if(command.recordId!=='record-a')throw new Error('Wrong record');if(command.targetId&&command.targetId!==targets[0].id)throw new Error('Wrong post');return {interactionMode:'comment',targetId:targets[0].id,sourceMarkup:targets[0].markup}},generate:async(_id,prompt)=>{replies++;assert(JSON.stringify(prompt).includes('First post'));assert(!JSON.stringify(prompt).includes('Second post'));return 'The delivery is still due at noon.'},generateImage:async command=>{images++;assert(command.prompt.includes('wooden case'));if(failImage)throw new Error('Test provider outage');return {imageId:'image-123',imageUrl:'/api/images/image-123'}},continueStory:async()=>assert.fail('No automatic story starts')})
const action=(name,patch={})=>({type:'reverie_phone_command',chatId:'test-chat',operationId:crypto.randomUUID(),action:name,...patch})
await service.handle(action('contact',{contactName:'Confirmed D',contactDescription:'RP-established friend.'}))
assert.equal(state.npcContacts.length,1)
await service.handle(action('contact',{contactName:'Character A',contactDescription:'Duplicate.'}));assert.equal(state.npcContacts.length,1)
await service.handle(action('settings',{connectionId:'text-connection',autoReply:false}))
const sent=action('image',{from:ids[2].id,to:ids[0].id,prompt:'A wooden case at the venue entrance',framing:'storyboard',text:'Delivery photo'})
await service.handle(sent);assert.equal(state.messages[0].image.status,'failed');assert.equal(phoneUnread(state,ids.map(person=>person.id)).length,0);assert(!phoneStoryContext(state,ids).includes('Delivery photo'))
failImage=false
await Promise.all([service.handle({...sent,operationId:crypto.randomUUID(),messageId:sent.operationId}),service.handle({...sent,operationId:crypto.randomUUID(),messageId:sent.operationId})])
assert.equal(images,2,'failure + one explicit retry, duplicate click cannot spend twice');assert.equal(state.messages.length,1);assert.equal(state.messages[0].image.status,'ready');assert.equal(phoneUnread(state,[ids[0].id]).length,1)
await service.handle(action('read',{from:ids[0].id,to:ids[2].id}));assert.equal(phoneUnread(state,[ids[0].id]).length,0)
state.messages[0].sourceKey='source';state.messages[0].sourceActive=false;assert.equal(phoneUnread(state,[ids[0].id]).length,0)
const post=action('app-post',{from:ids[1].id,appId:'twitter',recordId:'record-a',targetId:targets[0].id,text:'Can you confirm the delivery time?'})
await Promise.all([service.handle(post),service.handle(post)]);assert.equal(state.appInteractions.length,1);assert.equal(replies,0)
const reply=action('app-reply',{from:ids[2].id,appId:'twitter',recordId:'record-a',targetId:targets[0].id,messageId:post.operationId})
await Promise.all([service.handle(reply),service.handle(reply)]);assert.equal(replies,1);assert.equal(state.appInteractions[1].from,ids[2].id);assert.equal(state.appInteractions[1].replyTo,post.operationId)
await service.handle({...reply,operationId:crypto.randomUUID(),from:ids[1].id});assert.equal(replies,1,'never generate the persona comment')
sourceActive=false;await service.handle({...post,operationId:crypto.randomUUID()});assert.equal(state.appInteractions.length,2,'edited/deleted source cannot accept a comment')
const {JSDOM}=await import('jsdom');const dom=new JSDOM('<!doctype html><body></body>',{url:'http://localhost/',pretendToBeVisual:true});globalThis.window=dom.window;globalThis.document=dom.window.document
// Portraits use native assets, deduplicate deliberate retries and preserve the last good image through an outage.
let portraitState=emptyPhoneDevice(),portraitCalls=0,portraitFail=false
const portraits=createPhoneService({read:async()=>structuredClone(portraitState),mutate:async(_c,_u,fn)=>fn(portraitState),identities:async()=>ids,projection:async()=>({}),generate:async()=>assert.fail('No text rewrite for portraits'),generateImage:async command=>{portraitCalls++;assert.equal(command.framing,'character-portrait');if(portraitFail)throw new Error('Native outage');return {imageId:'portrait-1',imageUrl:'/api/images/portrait-1'}},send:()=>{}})
const portrait=action('portrait',{from:ids[2].id,prompt:'NPC C, close portrait, established current clothing'})
await Promise.all([portraits.handle(portrait),portraits.handle({...portrait,operationId:crypto.randomUUID()})]);assert.equal(portraitCalls,1);assert.equal(portraitState.portraits[ids[2].id].status,'ready')
portraitFail=true;await portraits.handle({...portrait,operationId:crypto.randomUUID(),prompt:'NPC C, updated portrait'});assert.equal(portraitState.portraits[ids[2].id].status,'failed');assert.equal(portraitState.portraits[ids[2].id].imageUrl,'/api/images/portrait-1')
assert.equal(normalizePhoneDevice(portraitState).portraits[ids[2].id].imageId,'portrait-1','asset survives storage reload')
const widgets=[],sentUi=[],handlers=[],events=new Map()
const ctx={getActiveChat:()=>({chatId:'test-chat'}),sendToBackend:m=>sentUi.push(m),onBackendMessage:fn=>{handlers.push(fn);return()=>{}},events:{on:(name,fn)=>{events.set(name,fn);return()=>events.delete(name)}},ui:{createFloatWidget:options=>{const root=document.createElement('div');document.body.append(root);const widget={root,setVisible(){},destroy(){root.remove()}};widgets.push(widget);return widget}}}
const widget=mountPhoneWidget(ctx);const uiState=emptyPhoneDevice();addPhoneText(uiState,{id:'incoming-npc-001',from:ids[2].id,to:ids[0].id,body:'Delivery arrived.'},ids,Date.now())
const projection={type:'phone_state',chatId:'test-chat',operationId:sentUi.at(-1).operationId,state:uiState,identities:ids,connections:[],imageConnections:[{id:'native-1',name:'Native test',model:'test'}],saved:[],apps:[{id:'twitter',label:'Twitter / X Post',icon:'X'}],appRecords:[{id:'record-a',appId:'twitter',title:'Feed',messageId:'m',swipeId:0}]}
handlers[0](projection);assert(widgets[0].root.shadowRoot.querySelector('.badge'),'closed launcher badge updates on load')
widget.open();handlers[0]({...projection,operationId:sentUi.at(-1).operationId});let root=()=>widgets.at(-1).root.shadowRoot
root().querySelector('[aria-label="Phone notifications"]').click();assert(root().textContent.includes('NPC C → Character A'))
root().querySelector('.notification').click();assert.equal(sentUi.at(-1).action,'read');assert(!sentUi.some(command=>['reply','continue','image'].includes(command.action)))
root().querySelector('[aria-label="Send generated photo"]').click();assert(root().querySelector('[aria-label="Phone image prompt"]'));root().querySelector('[aria-label="Image framing"]').value='cctv';root().querySelector('[aria-label="Image framing"]').dispatchEvent(new window.Event('change'));[...root().querySelectorAll('button')].find(button=>button.textContent==='Insert framing').click();assert(root().querySelector('[aria-label="Phone image prompt"]').value.includes('fixed elevated wide view'))
root().querySelector('.head button').click();root().querySelector('[aria-label="Open Core app Twitter / X Post"]').click();const open=sentUi.filter(command=>command.action==='app').at(-1)
handlers[0]({type:'phone_app',chatId:'test-chat',operationId:open.operationId,appId:'twitter',recordId:'record-a',html:'<article class="twlr-post"><div class="twlr-comments-panel">First post.</div></article><article class="twlr-post"><div class="twlr-comments-panel">Second post.</div></article>',targets:targets.map(({markup,...target})=>target),targetId:targets[0].id})
const appRoot=root().querySelector('.core-app-view').shadowRoot
assert.equal(appRoot.querySelectorAll('[aria-label="App comment"]').length,2);assert(!root().querySelector('.app-compose'),'no duplicate outer reply panel')
const input=appRoot.querySelector('[aria-label="App comment"]');input.value='New comment';input.dispatchEvent(new window.Event('input'));appRoot.querySelector('form').dispatchEvent(new window.Event('submit',{cancelable:true}));assert.equal(sentUi.at(-1).action,'app-post');assert.equal(sentUi.at(-1).targetId,targets[0].id)
events.get('GENERATION_ENDED')();assert.equal(sentUi.at(-1).action,'load');widget.destroy()
console.log('Phone social/media passed: NPC authority and XML routing, unread/read isolation, image failure/retry/dedup/persistence, no automatic spend/story, exact post targeting, NPC comment replies and persona agency, mounted badges/notifications/image composer/app comments.')
