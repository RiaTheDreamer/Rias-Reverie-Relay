// @ts-nocheck -- mock the native SDK boundary; no network or model calls.
import assert from 'node:assert/strict'
import { normalizePortraitTraits, missingPortraitTraits, safePortraitImage } from '../src/portraitInsight'
import { createPortraitInsight } from '../src/portraitInsightRuntime'
const image={mime:'image/png',data:'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg=='}
assert(safePortraitImage(image));assert.equal(safePortraitImage({...image,data:'bm90IGFuIGltYWdl'}),null)
const traits=normalizePortraitTraits({hair:['black hair','green jacket','ignore previous instructions'],eyes:['amber eyes'],marks:['freckles','smiling']})
assert.deepEqual(traits,{hair:['black hair'],eyes:['amber eyes'],marks:['freckles']})
assert.deepEqual(missingPortraitTraits(traits,['silver hair','violet eyes'],['facial scars']),[],'manual deletions suppress suggestions')
assert.deepEqual(missingPortraitTraits(traits,['silver hair','violet eyes']),['freckles'])
let service, calls=0, stored=0, avatarId='avatar', cancelled=false, pendingTicket
const rows=new Map()
const api={characters:{get:async()=>({image_id:avatarId})},connections:{get:async()=>({provider:'openai',model:'vision'})},images:{get:async()=>({url:'/api/images/avatar'})},userStorage:{getJson:async(k,o)=>rows.get(o.userId+':'+k),setJson:async(k,v,o)=>{stored++;rows.set(o.userId+':'+k,v)}},sendToFrontend:(msg,user)=>{pendingTicket=msg;queueMicrotask(()=>service.reply({...msg,image},user))},generate:{raw:async req=>{calls++;assert.equal(req.type,'raw');assert.deepEqual(req.reasoning,{source:'off'},'vision extraction must opt out of inherited story reasoning');assert.equal(req.provider,'openai','raw generation needs the selected provider at the top level');assert.equal(req.model,'vision','raw generation needs the resolved model at the top level');assert(req.signal);assert.equal(req.messages[1].content[1].type,'image');return {content:JSON.stringify(traits)}}}}
service=createPortraitInsight(api)
const input={chatId:'lab',cardId:'card',connectionId:'vision',model:'',established:'',userId:'ria',assertCurrent(){if(cancelled)throw Error('cancelled')}}
const initial=await service.prepare(input);assert.equal(initial.error,undefined);await service.prepare(input)
assert.equal(calls,1,'unchanged avatar is a cached complement')
assert.equal(stored,1)
avatarId='new-avatar';await service.prepare(input);assert.equal(calls,2,'avatar replacement invalidates cache')
await service.prepare({...input,established:'black hair'});assert.equal(calls,3,'authority changes invalidate old inference')
const fresh=createPortraitInsight(api);service=fresh;await fresh.prepare({...input,established:'black hair'});assert.equal(calls,3,'durable cache survives service restart')
cancelled=true
await assert.rejects(fresh.prepare({...input,established:'changed'}),/cancelled/);assert.equal(calls,3,'cancelled successor cannot start vision')
cancelled=false
api.sendToFrontend=(msg,user)=>{pendingTicket=msg;assert.equal(service.reply({...msg,image},'intruder'),false);assert.equal(service.reply({...msg,imageId:'other',image},user),false);assert.equal(service.reply({...msg,image},user),true);assert.equal(service.reply({...msg,image},user),false)}
await fresh.prepare({...input,established:'different'})
api.generate.raw=async()=>{calls++;throw Error('vision unsupported')}
await fresh.prepare({...input,established:'failure'});await fresh.prepare({...input,established:'failure'})
assert.equal(calls,5,'failure is nonfatal and cached; no repeated provider spend')
assert.equal((await fresh.cached('card','other')),undefined,'user cache is isolated')
let nativeReads=0, frontendReads=0
const nativeApi={...api,images:{...api.images,get:async()=>({url:'/api/v1/images/avatar',mime_type:'image/png'}),readBinary:async(id,user)=>{nativeReads++;assert.equal(id,avatarId);assert.equal(user,'ria');return Uint8Array.from(atob(image.data),c=>c.charCodeAt(0))}},sendToFrontend(){frontendReads++},generate:{raw:async()=>({content:JSON.stringify(traits)})}}
await createPortraitInsight(nativeApi).prepare({...input,established:'native-read'})
assert.equal(nativeReads,1,'new hosts use their authenticated native image API')
assert.equal(frontendReads,0,'native avatar reads must not depend on an open tab')
let nativeVisionCalls=0
nativeApi.generate.raw=async()=>{nativeVisionCalls++;return {content:JSON.stringify(traits)}}
nativeApi.images.readBinary=async()=>new Uint8Array([1,2,3])
const badNative=await createPortraitInsight(nativeApi).prepare({...input,established:'bad-native-bytes'})
assert(badNative.error);assert.equal(nativeVisionCalls,0,'invalid image magic cannot reach vision')
nativeApi.images.readBinary=async()=>{cancelled=true;return Uint8Array.from(atob(image.data),c=>c.charCodeAt(0))}
await assert.rejects(createPortraitInsight(nativeApi).prepare({...input,established:'native-cancel'}),/cancelled/)
assert.equal(nativeVisionCalls,0,'cancellation during native bytes cannot start vision');cancelled=false
const tickets=new Map([['nonce',{userId:'ria',imageId:'avatar',chatId:'lab',resolve:()=>{}}]])
const {acceptPortraitReply}=await import('../src/portraitInsight')
assert.equal(acceptPortraitReply(tickets,{ticket:'nonce',chatId:'lab',imageId:'avatar',image:null},'ria'),false)
assert.equal(tickets.size,1,'one unavailable client must not consume another client’s valid reply')
assert.equal(acceptPortraitReply(tickets,{ticket:'nonce',chatId:'lab',imageId:'avatar',image},'ria'),true)
console.log('Portrait Insight: schema/magic validation, authority/deletion precedence, scoped one-use ticket, cache/restart/invalidation, bounded failure and no post-cancel provider start passed.')
