// @ts-nocheck -- Bun-hosted regressions; production modules are typechecked separately.
import assert from 'node:assert/strict'
import {phoneLocalAppImageRequests,phoneLocalAppPrompt,validatePhoneLocalApp,phoneLocalAppRecord} from '../src/phoneLocalApps'
import {emptyPhoneDevice,normalizePhoneDevice,type PhoneIdentity,type PhoneCommand} from '../src/phoneDevice'
import {createPhoneService} from '../src/phoneService'
import {shippedSurfaceDefinitions} from '../src/shippedSurfaceDefinitions'
import {r45SupplementalSurfaceDefinitions} from '../src/r45SurfaceCatalog'

const identities:PhoneIdentity[]=[{id:'character:qa',name:'Actor One',kind:'character'},{id:'persona:qa',name:'Actor Two',kind:'persona'}]
for(const definition of [...shippedSurfaceDefinitions(0),...r45SupplementalSurfaceDefinitions(0)]){
  const markup=definition.sampleXml.replace(/<img\b[^>]*>/gi,'')
  try{assert.equal(validatePhoneLocalApp(markup,definition.baseSurfaceId),markup.trim(),definition.baseSurfaceId)}catch(error){throw new Error(`${definition.baseSurfaceId}: ${error}`)}
  const prompt=phoneLocalAppPrompt(definition.baseSurfaceId,identities[1],identities,'A phone-local QA record','The rehearsal ended.')
  assert(prompt[0].content.includes('not a new main-story turn'))
  assert.equal(/<image_request\b/i.test(prompt[0].content),/<image_request\b/i.test(markup),`${definition.baseSurfaceId}: app schema retains its media slots`)
  if(/<image_request\b/i.test(markup))assert(prompt[0].content.includes('Preserve each defined <image_request> media slot'))
}
for(const markup of ['<instagram_dm name="QA">unfinished','<instagram_dm name="QA"><script>bad()</script></instagram_dm>','<instagram_dm name="QA"><image_request>bad</image_request></instagram_dm>','<instagram_dm name="QA"></instagram_dm>','<instagram_dm name="QA">ok</instagram_dm>extraneous'])assert.throws(()=>validatePhoneLocalApp(markup,'instagram-dm'))
const imageMarkup='<instagram_dm name="Actor One"><ig_media><image_request id="phone-image" target="custom.instagram-dm" slot="profile-photo" count="2" aspect="4:5" alt="A scene photo"><scene_brief>Actor One stands outside the rehearsal hall after rain.</scene_brief></image_request></ig_media></instagram_dm>'
assert.equal(phoneLocalAppImageRequests(imageMarkup).length,2,'media count creates bounded individual native generation jobs')
let state=emptyPhoneDevice();state.connectionId='qa-connection';let starts=0,imageStarts=0,imageFail=false,valid=true,epoch=0
let hold:Promise<void>|undefined,release:(()=>void)|undefined,notify:(()=>void)|undefined
let imageHold:Promise<void>|undefined,releaseImage:(()=>void)|undefined,notifyImage:(()=>void)|undefined
const output:Array<Record<string,any>>=[]
const service=createPhoneService({read:async()=>structuredClone(state),mutate:async(_chat,_user,change)=>{const next=normalizePhoneDevice(structuredClone(state));change(next);state=next},identities:async()=>identities,projection:async()=>({saved:[],appRecords:(state.localApps||[]).map(record=>phoneLocalAppRecord(record,identities[1]))}),rpContext:async()=> 'The rehearsal ended.',captureAuthorization:()=>{const captured=epoch;return()=>captured===epoch},generate:async(connection,prompt,_user,maxTokens)=>{starts++;assert.equal(connection,'qa-connection');assert.equal(maxTokens,3500);assert(prompt[1].content.includes('The rehearsal ended.'));notify?.();await hold;return valid?imageMarkup:'<instagram_dm>bad'},generateImage:async command=>{imageStarts++;assert(command.prompt.includes('Actor One stands outside the rehearsal hall'));assert.equal(command.framing,'auto');notifyImage?.();await imageHold;if(imageFail)throw new Error('Image provider offline');return {imageId:`image-${imageStarts}`,imageUrl:`/api/images/image-${imageStarts}`}},send:message=>output.push(message)})
const command:PhoneCommand={type:'reverie_phone_command',action:'app-create',chatId:'no-surface-chat',operationId:'local-app-qa-001',appId:'instagram-dm',from:'persona:qa',text:'A new conversation with Actor One.'}
await service.handle({...command,action:'load'})
assert.equal(starts,0,'opening the phone never spends tokens')
await Promise.all([service.handle(command),service.handle(command)])
assert.equal(starts,1,'duplicate app setup is delivered once')
assert.equal(state.localApps?.length,1)
assert.equal(imageStarts,2,'explicit local app setup dispatches each schema image through native ImageGen')
assert.deepEqual(state.localApps![0].media?.map(media=>media.image.status),['ready','ready'],'generated media is persisted with its app slots')
assert.equal(state.localApps![0].media?.[0].requestId,'phone-image')
assert.equal(phoneLocalAppRecord(state.localApps![0],identities[1]).media?.length,2,'phone app projection carries image ownership into its renderer')
const firstMedia=state.localApps![0].media![0];firstMedia.image={...firstMedia.image,status:'failed',error:'previous generation failed'}
imageFail=true;await service.handle({...command,action:'app-image',operationId:'local-image-retry-001',recordId:state.localApps![0].id,mediaId:firstMedia.id})
assert.equal(state.localApps![0].media![0].image.status,'failed','failed ImageGen remains recoverable and exposes its error')
imageFail=false;await service.handle({...command,action:'app-image',operationId:'local-image-retry-002',recordId:state.localApps![0].id,mediaId:firstMedia.id})
assert.equal(imageStarts,4,'explicit app image retry only regenerates the selected slot')
assert.equal(state.localApps![0].media![0].image.status,'ready','successful retry replaces the exact saved app image slot')
await service.handle({...command,action:'app-image',operationId:'local-image-owner-guard',from:'character:qa',recordId:state.localApps![0].id,mediaId:firstMedia.id})
assert.equal(imageStarts,4,'another character cannot regenerate the phone owner’s private app image')
assert.equal(state.localApps![0].ownerId,'persona:qa')
assert.throws(()=>phoneLocalAppRecord(state.localApps![0],identities[0]),/another owner/)
assert.equal(state.messages.length,0,'phone app setup does not fabricate incoming texts')
assert.equal(normalizePhoneDevice(JSON.parse(JSON.stringify(state))).localApps![0].markup,state.localApps![0].markup,'app content survives archive reload')
assert.throws(()=>normalizePhoneDevice({...state,localApps:[state.localApps![0],state.localApps![0]]}),/damaged/)
valid=false;await service.handle({...command,operationId:'local-app-qa-002'})
assert.equal(state.localApps?.length,1,'invalid generated XML never overwrites the saved app')
assert(output.at(-1)?.error.includes('complete XML'))
valid=true;hold=new Promise(resolve=>{release=resolve});const begun=new Promise<void>(resolve=>{notify=resolve})
const pending=service.handle({...command,operationId:'local-app-qa-003'});await begun
const queued=service.handle({...command,operationId:'local-app-qa-004'});epoch++;release!();await Promise.all([pending,queued])
assert.equal(starts,3,'Abort All prevents the queued successor provider start')
assert.equal(state.localApps?.length,1,'cancelled provider result is not saved')
hold=undefined;imageHold=new Promise(resolve=>{releaseImage=resolve});const imageBegun=new Promise<void>(resolve=>{notifyImage=resolve})
const imageCreate=service.handle({...command,operationId:'local-app-image-abort-001'});await imageBegun;epoch++;releaseImage!();await imageCreate;imageHold=undefined;notifyImage=undefined
assert.equal(state.localApps?.length,2,'explicitly generated app record is retained when image generation is cancelled')
assert(state.localApps![1].media?.every(media=>media.image.status==='failed'),'Abort All marks active and not-yet-started app images as retryable failures')
state.localApps![1].media![1].image={...state.localApps![1].media![1].image,status:'pending'}
await service.handle({...command,action:'load',operationId:'local-app-orphan-recovery'});
assert.equal(state.localApps![1].media![1].image.status,'failed','restart recovery resolves orphaned pending app image slots')
console.log('Phone-local apps passed: all 46 XML shapes, schema image slots, bounded native ImageGen dispatch, exact-slot retry/owner checks, cancel and restart recovery, persisted app-owned media, no story side effects, malformed output and deduplication.')
