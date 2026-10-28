import {createAmazonPhoneState,applyAmazonAction,commerceScopeKey,commerceContextForPrompt,acknowledgeCommerceContext,type CommerceState} from './amazon-phone-state.mjs'
import {parseAmazon} from './amazon-contract.mjs'
import type {PhoneCommand,PhoneDeviceState,PhoneIdentity} from './phoneDevice'
import type {PhoneCoreRecord} from './phoneCoreApps'

export function normalizeCommerce(value:unknown):CommerceState[] {
  if(value===undefined)return []
  const fail=()=>{throw new Error('Shopping archive is damaged. Existing Phone data was preserved.')}
  if(!Array.isArray(value)||value.length>100) return fail()
  const keys=new Set<string>()
  for(const state of value){
    if(!state||state.schemaVersion!==1||!state.scope||!['userId','chatId','ownerId','snapshotId','sourceKey'].every(key=>typeof state.scope[key]==='string'&&state.scope[key]&&state.scope[key].length<=500)||!Number.isSafeInteger(state.revision)||state.revision<0)return fail()
    const key=commerceScopeKey(state);if(keys.has(key))return fail();keys.add(key)
    if(!Array.isArray(state.cart)||state.cart.length>8||!Array.isArray(state.wishlist)||state.wishlist.length>8||!Array.isArray(state.orders)||state.orders.length>100||!Array.isArray(state.events)||state.events.length>1000||!state.operations||typeof state.operations!=='object'||Array.isArray(state.operations)||Object.keys(state.operations).length>1000)return fail()
    const line=(row:any)=>row&&typeof row.productId==='string'&&/^[a-z0-9][a-z0-9-]{0,95}$/.test(row.productId)&&typeof row.title==='string'&&row.title.length<=180&&Number.isSafeInteger(row.quantity)&&row.quantity>=1&&row.quantity<=20&&Number.isSafeInteger(row.unitAmount)&&row.unitAmount>=0&&row.unitAmount<=100000000&&['EUR','USD','GBP','JPY','KRW'].includes(row.currency)
    const order=(row:any)=>row&&typeof row.id==='string'&&row.ownerId===state.scope.ownerId&&row.snapshotId===state.scope.snapshotId&&Array.isArray(row.lines)&&row.lines.length>=1&&row.lines.length<=8&&row.lines.every(line)&&Number.isSafeInteger(row.total)&&row.total===row.lines.reduce((sum:number,item:any)=>sum+item.unitAmount*item.quantity,0)&&row.lines.every((item:any)=>item.currency===row.currency)&&row.status==='Placed'&&row.delivery==='Delivery not confirmed'&&Number.isFinite(row.at)
    if(!state.cart.every(line)||new Set(state.cart.map((row:any)=>row.productId)).size!==state.cart.length||state.wishlist.some((id:any)=>typeof id!=='string'||!/^[a-z0-9][a-z0-9-]{0,95}$/.test(id))||!state.orders.every(order)||state.events.some((event:any)=>!event||!/^[-\w]{8,110}$/.test(event.id||'')||event.ownerId!==state.scope.ownerId||event.snapshotId!==state.scope.snapshotId||event.sourceKey!==state.scope.sourceKey||!Number.isFinite(event.at)||!['browse','view','cart-add','cart-remove','cart-quantity','wishlist-add','wishlist-remove','purchase'].includes(event.action)||event.action==='purchase'&&!order(event.order)||event.consumedBy!==undefined&&typeof event.consumedBy!=='string'))return fail()
    if(JSON.stringify(state).length>2000000)return fail()
  }
  return structuredClone(value)
}
export function amazonScope(record:PhoneCoreRecord,userId:string|undefined,chatId:string,ownerId:string){return {userId:userId||'__default__',chatId,ownerId,snapshotId:parseAmazon(record.markup).id,sourceKey:record.id}}
export function amazonState(device:PhoneDeviceState,record:PhoneCoreRecord,userId:string|undefined,chatId:string,ownerId:string):CommerceState {
  const scope=amazonScope(record,userId,chatId,ownerId),key=JSON.stringify([scope.userId,scope.chatId,scope.ownerId,scope.snapshotId,scope.sourceKey])
  return device.commerce?.find(state=>commerceScopeKey(state)===key)||createAmazonPhoneState(scope)
}
export function mutateAmazon(device:PhoneDeviceState,record:PhoneCoreRecord,command:PhoneCommand,userId?:string){
  if(record.appId!=='amazon'||!command.from||record.ownerId&&record.ownerId!==command.from)throw new Error('Choose this shopping record and its current Phone owner.')
  const state=amazonState(device,record,userId,command.chatId,command.from)
  if(command.commerceScope!==commerceScopeKey(state))throw new Error('Shopping source or owner changed. Reopen the app before continuing.')
  if(command.commerceAction==='inject'){
    device.commerceRequest={id:command.operationId,ownerId:command.from};device.revision++;return
  }
  applyAmazonAction(state,parseAmazon(record.markup),{scopeKey:command.commerceScope,operationId:command.operationId,action:command.commerceAction||'',productId:command.productId,quantity:command.quantity,query:command.text,confirmation:command.confirmation})
  if(!device.commerce?.some(row=>commerceScopeKey(row)===commerceScopeKey(state))){if((device.commerce?.length||0)>=100)throw new Error('Shopping snapshot archive is full. Existing purchases were preserved.');(device.commerce||=[]).push(state)}
  device.revision++
}
export type CommerceClaim={scopeKey:string;eventIds:string[]}
export function selectCommerce(device:PhoneDeviceState,identities:PhoneIdentity[],userId:string|undefined,chatId:string){
  const owners=identities.filter(identity=>device.contextMode!=='manual'||identity.id===device.commerceRequest?.ownerId).map(identity=>identity.id)
  let remaining=8000;const sections:string[]=[],claims:CommerceClaim[]=[]
  // Across snapshots, preserve receipts before recent browse events.
  for(const state of [...device.commerce||[]].sort((a,b)=>Number(b.events.some(event=>event.action==='purchase'&&!event.consumedBy))-Number(a.events.some(event=>event.action==='purchase'&&!event.consumedBy)))){
    if(remaining<512)break
    const selected=commerceContextForPrompt(state,{userId:userId||'__default__',chatId,ownerIds:owners,maxChars:Math.min(8000,remaining)})
    if(selected.content){sections.push(selected.content);remaining-=selected.content.length+2;claims.push({scopeKey:commerceScopeKey(state),eventIds:selected.eventIds})}
  }
  return {content:sections.join('\n\n'),claims,requestId:device.commerceRequest?.id}
}
export function commitCommerce(device:PhoneDeviceState,claims:CommerceClaim[],generationId:string,requestId?:string){
  let changed=false
  for(const claim of claims){const state=device.commerce?.find(state=>commerceScopeKey(state)===claim.scopeKey);if(state&&acknowledgeCommerceContext(state,{...claim,committed:true,generationId}))changed=true}
  // Keep a manual request if budget-limited receipts/actions remain queued.
  if(requestId===device.commerceRequest?.id&&!device.commerce?.some(state=>state.scope.ownerId===device.commerceRequest?.ownerId&&state.events.some(event=>!event.consumedBy))){delete device.commerceRequest;changed=true}
  if(changed)device.revision++
  return changed
}
