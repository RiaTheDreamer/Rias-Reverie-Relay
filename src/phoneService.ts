import { addPhoneText, normalizePhoneDevice, phoneReplyPrompt, phoneConversation, validatePhoneReply, type PhoneCommand, type PhoneDeviceState, type PhoneIdentity, type PhoneGeneration } from './phoneDevice'
import type {PhoneSourceBubble} from './phoneAppBubbles'
import {phoneImagePrompt,normalizePhoneImage} from './phoneMedia'
import {phoneAppReplyPrompt} from './phoneAppInteractions'
import {contentFingerprint} from './contracts'
import {phoneLocalAppImageRequests,phoneLocalAppPrompt,validatePhoneLocalApp} from './phoneLocalApps'
import { normalizePhoneIncoming } from './phoneIncomingSettings'
import type {PhonePreferences} from './phonePreferences'

export type PhoneServiceDependencies = {
  read(chatId: string, userId?: string, identities?: PhoneIdentity[]): Promise<unknown>;
  mutate(chatId: string, userId: string | undefined, change: (state: PhoneDeviceState) => void): Promise<void>;
  savePreferences?(chatId: string, userId: string | undefined, patch: Partial<PhonePreferences>): Promise<void>;
  identities(chatId: string, userId?: string): Promise<PhoneIdentity[]>;
  projection(chatId: string, userId?: string, snapshot?: { state: PhoneDeviceState; identities: PhoneIdentity[] }): Promise<Record<string, unknown>>;
  rpContext?(chatId:string,userId?:string):Promise<string>;
  appView?(command:PhoneCommand,userId?:string):Promise<Record<string,unknown>>;
  generateImage?(command:PhoneCommand,userId?:string):Promise<{imageId:string;imageUrl:string}>;
  generate(connectionId: string, messages: ReturnType<typeof phoneReplyPrompt>, userId?: string, maxTokens?:number): Promise<string>;
  captureAuthorization?(userId?: string): () => boolean;
  enabled?(userId?: string): Promise<boolean>;
  send(message: Record<string, unknown>, userId?: string): void;
}
/** One serialized lane per user/chat. Provider retries reuse the original send id. */
export function createPhoneService(deps: PhoneServiceDependencies) {
  const lanes = new Map<string, Promise<void>>()
  const loads = new Map<string, Promise<Record<string, unknown> | undefined>>()
  const replying = new Set<string>()
  async function project(command: PhoneCommand, userId?: string, error?: string, snapshot?: { state: PhoneDeviceState; identities: PhoneIdentity[] }) {
    const participants = snapshot?.identities || await deps.identities(command.chatId, userId)
    const state = snapshot?.state || normalizePhoneDevice(await deps.read(command.chatId, userId, participants))
    const identities = participants.map(({ description: _, ...identity }) => identity)
    const message = { type: 'phone_state', chatId: command.chatId, operationId: command.operationId, state, identities, ...await deps.projection(command.chatId, userId, { state, identities: participants }), error }
    deps.send(message, userId)
    return message
  }
  async function run(command: PhoneCommand, userId?: string, authorized = () => true) {
    if (!command.chatId || command.chatId.length > 150 || !/^[\w-]{8,100}$/.test(command.operationId)) throw new Error('Invalid phone operation.')
    if(!['load','settings'].includes(command.action)&&!authorized())throw new Error('Phone operation cancelled. Your saved data was preserved.')
    if(!['load','settings'].includes(command.action)&&deps.enabled&&!(await deps.enabled(userId)))throw new Error('Reverie Phone is disabled. Enable it in the Phone tab; your saved data is unchanged.')
    const identities = await deps.identities(command.chatId, userId)
    if(command.action==='app'){
      if(!deps.appView)throw new Error('This build does not support Core phone apps.')
      deps.send({type:'phone_app',chatId:command.chatId,operationId:command.operationId,...await deps.appView(command,userId)},userId)
      return
    }
    if(command.action==='app-create'){
      const owner=identities.find(person=>person.id===command.from)
      if(!owner)throw new Error('Choose a current phone owner.')
      const brief=(command.text||'').trim()
      if(!brief||brief.length>2000)throw new Error('Describe this app setup in 1–2,000 characters.')
      const state=normalizePhoneDevice(await deps.read(command.chatId,userId)),id=`phone-app-${command.operationId}`
      if(state.localApps?.some(record=>record.id===id)){await project(command,userId);return}
      if(!state.connectionId)throw new Error('Choose a phone reply connection in Settings first.')
      if((state.localApps?.length||0)>=100)throw new Error('This phone archive has reached its local app limit. Existing records were preserved.')
      const prompt=phoneLocalAppPrompt(command.appId||'',owner,identities,brief,await deps.rpContext?.(command.chatId,userId)||'')
      if(!authorized())throw new Error('App setup cancelled before dispatch.')
      const started=Date.now(),markup=validatePhoneLocalApp(await deps.generate(state.connectionId,prompt,userId,3500),command.appId!),requests=phoneLocalAppImageRequests(markup)
      if(!authorized()||!(await deps.identities(command.chatId,userId)).some(person=>person.id===owner.id))throw new Error('App setup cancelled or its owner changed. Nothing was saved.')
      const generation:PhoneGeneration={connectionId:state.connectionId,prompt,operationId:command.operationId,createdAt:Date.now(),durationMs:Date.now()-started}
      const media=requests.map(request=>({id:request.id,requestId:request.requestId,target:request.target,...(request.slot?{slot:request.slot}:{}),...(request.alt?{alt:request.alt}:{}),...(request.aspect?{aspect:request.aspect}:{}),image:normalizePhoneImage({status:'pending',prompt:request.prompt,framing:'auto',connectionId:''})!}))
      await deps.mutate(command.chatId,userId,draft=>{if(draft.localApps?.some(record=>record.id===id))return;if((draft.localApps?.length||0)>=100)throw new Error('Local app limit reached.');(draft.localApps||=[]).push({id,appId:command.appId!,ownerId:owner.id,title:brief.slice(0,80),markup,createdAt:Date.now(),generation,...(media.length?{media}:{})});draft.revision++})
      // The explicit app-generation action may also create its authored media slots.
      // Track every in-flight request so a concurrent load cannot mark active work stale.
      const imageAttempts=media.map(item=>`${userId}:${command.chatId}:app-image:${id}:${item.id}`)
      imageAttempts.forEach(attempt=>replying.add(attempt))
      try{
        for(const item of media){
          const attempt=`${userId}:${command.chatId}:app-image:${id}:${item.id}`
          let image= item.image
          try{
            if(!authorized())throw new Error('Image generation cancelled. The app record was saved; remaining images were not dispatched.')
            if(!deps.generateImage)throw new Error('Native ImageGen is unavailable. The app record was saved; retry its media when ImageGen is available.')
            const aspect=item.aspect?`\nComposition: ${item.aspect} aspect ratio.`:''
            const generated=await deps.generateImage({...command,prompt:`${item.image.prompt}${aspect}`,framing:'auto',imageConnectionId:''},userId)
            if(!authorized())throw new Error('Image generation cancelled. This result was not attached; the app record was saved.')
            image=normalizePhoneImage({...item.image,...generated,status:'ready'})!
          }catch(error){image={...item.image,status:'failed',error:error instanceof Error?error.message:String(error)}}
          await deps.mutate(command.chatId,userId,draft=>{const local=draft.localApps?.find(record=>record.id===id),saved=local?.media?.find(entry=>entry.id===item.id);if(saved){saved.image=image;draft.revision++}})
          if(image.status==='failed'&&!authorized())break
        }
        if(!authorized())await deps.mutate(command.chatId,userId,draft=>{const local=draft.localApps?.find(record=>record.id===id);for(const item of local?.media||[])if(item.image.status==='pending')item.image={...item.image,status:'failed',error:'Image generation was cancelled. The app is saved; retry this image from the app.'};draft.revision++})
      }finally{imageAttempts.forEach(attempt=>replying.delete(attempt))}
    }else if(command.action==='app-image'){
      const owner=identities.find(person=>person.id===command.from)
      if(!owner||!command.recordId||!command.mediaId||!/^\d+-\d+$/.test(command.mediaId))throw new Error('Choose one saved app image slot and its confirmed phone owner.')
      const state=normalizePhoneDevice(await deps.read(command.chatId,userId)),record=state.localApps?.find(entry=>entry.id===command.recordId&&entry.appId===command.appId&&entry.ownerId===owner.id)
      if(!record)throw new Error('That phone-local app record is unavailable to this phone owner.')
      const slot=record.media?.find(entry=>entry.id===command.mediaId)
      if(!slot)throw new Error('That saved app image slot no longer exists.')
      if(slot.image.status==='ready'){await project(command,userId);return}
      if(slot.image.status!=='failed')throw new Error('Only a failed app image can be retried; active generation is left alone.')
      if(!deps.generateImage)throw new Error('Native ImageGen is unavailable. The failed app image remains saved for a later retry.')
      if(!authorized())throw new Error('App image retry cancelled before dispatch.')
      const attempt=`${userId}:${command.chatId}:app-image:${record.id}:${slot.id}`
      if(replying.has(attempt)){await project(command,userId);return}
      replying.add(attempt)
      const pending={...slot.image,status:'pending' as const};delete pending.error
      try{
        await deps.mutate(command.chatId,userId,draft=>{const local=draft.localApps?.find(entry=>entry.id===record.id&&entry.appId===record.appId&&entry.ownerId===owner.id),saved=local?.media?.find(entry=>entry.id===slot.id);if(!saved||saved.image.status!=='failed'||saved.image.prompt!==slot.image.prompt)throw new Error('The saved app image changed before retry. Nothing was dispatched.');saved.image=pending;draft.revision++})
        if(!authorized())throw new Error('App image retry cancelled before dispatch.')
        const aspect=slot.aspect?`\nComposition: ${slot.aspect} aspect ratio.`:''
        const generated=await deps.generateImage({...command,prompt:`${slot.image.prompt}${aspect}`,framing:'auto',imageConnectionId:''},userId)
        if(!authorized())throw new Error('App image retry cancelled. The result was not attached.')
        const ready=normalizePhoneImage({...pending,...generated,status:'ready'})!
        await deps.mutate(command.chatId,userId,draft=>{const local=draft.localApps?.find(entry=>entry.id===record.id&&entry.appId===record.appId&&entry.ownerId===owner.id),saved=local?.media?.find(entry=>entry.id===slot.id);if(!saved||saved.image.status!=='pending'||saved.image.prompt!==slot.image.prompt)throw new Error('The saved app image changed during generation. Its result was not attached.');saved.image=ready;draft.revision++})
      }catch(error){
        await deps.mutate(command.chatId,userId,draft=>{const local=draft.localApps?.find(entry=>entry.id===record.id&&entry.appId===record.appId&&entry.ownerId===owner.id),saved=local?.media?.find(entry=>entry.id===slot.id);if(saved&&saved.image.prompt===slot.image.prompt){saved.image={...pending,status:'failed',error:error instanceof Error?error.message:String(error)};draft.revision++}})
      }finally{replying.delete(attempt)}
    }else if(command.action==='contact'){
      const name=(command.contactName||'').trim(),description=(command.contactDescription||'').trim()
      if(!name||name.length>80||!description||description.length>3000||/[<>\n]/.test(name))throw new Error('Supply an NPC name (1–80 characters) and their established RP role/details (1–3,000 characters).')
      if(identities.some(person=>[person.name,...(person.aliases||[])].some(alias=>alias.toLocaleLowerCase()===name.toLocaleLowerCase())))throw new Error('That participant already has a phone contact; no duplicate identity was created.')
      await deps.mutate(command.chatId,userId,state=>{const contacts=state.npcContacts||=[];if(contacts.length>=40)throw new Error('This phone has reached its NPC contact limit.');contacts.push({id:`npc:manual-${contentFingerprint(name.toLocaleLowerCase()).replace(':','-')}`,name,kind:'npc',description});state.revision++})
    }else if(command.action==='portrait'){
      const actor=identities.find(person=>person.id===command.from)
      if(!actor||!deps.generateImage)throw new Error('Choose a confirmed phone contact with native ImageGen available.')
      const prompt=phoneImagePrompt(command.prompt||'')
      const current=normalizePhoneDevice(await deps.read(command.chatId,userId)).portraits?.[actor.id]
      if(current?.status==='ready'&&current.prompt===prompt){await project(command,userId);return}
      const attachment=normalizePhoneImage({status:'pending',prompt,framing:'character-portrait',connectionId:command.imageConnectionId||'',imageId:current?.imageId,imageUrl:current?.imageUrl})!
      if(!authorized())throw new Error('Portrait cancelled before dispatch.')
      const attempt=`${userId}:${command.chatId}:portrait:${actor.id}`;replying.add(attempt)
      try{
        await deps.mutate(command.chatId,userId,draft=>{(draft.portraits||={})[actor.id]=attachment;draft.revision++})
        await project(command,userId)
        if(!authorized())throw new Error('Portrait cancelled before dispatch.')
        const image=await deps.generateImage({...command,prompt,framing:'character-portrait'},userId)
        if(!authorized()||!(await deps.identities(command.chatId,userId)).some(person=>person.id===actor.id))throw new Error('Portrait destination changed. No profile picture was applied.')
        const ready=normalizePhoneImage({...attachment,...image,status:'ready'})!
        await deps.mutate(command.chatId,userId,draft=>{(draft.portraits||={})[actor.id]=ready;draft.revision++})
      }catch(error){await deps.mutate(command.chatId,userId,draft=>{(draft.portraits||={})[actor.id]={...attachment,status:'failed',error:error instanceof Error?error.message:String(error)};draft.revision++})}
      finally{replying.delete(attempt)}
    }else if(command.action==='image'){
      if(!deps.generateImage)throw new Error('Phone images are unavailable in this build.')
      const prompt=phoneImagePrompt(command.prompt||'')
      const attachment=normalizePhoneImage({status:'pending',prompt,framing:command.framing,connectionId:command.imageConnectionId||''})!
      const id=command.messageId||command.operationId
      const state=normalizePhoneDevice(await deps.read(command.chatId,userId))
      const existing=state.messages.find(message=>message.id===id)
      if(existing?.image?.status==='ready'){await project(command,userId);return}
      if(existing&&(existing.from!==command.from||existing.to!==command.to||!existing.image||existing.sourceActive===false))throw new Error('This image draft belongs to another message or inactive source. Start a new image instead.')
      if(!authorized())throw new Error('Phone image cancelled before dispatch.')
      const attempt=`${userId}:${command.chatId}:image:${id}`;replying.add(attempt)
      try{
        await deps.mutate(command.chatId,userId,draft=>{const message=existing?draft.messages.find(message=>message.id===id)!:addPhoneText(draft,{id,from:command.from||'',to:command.to||'',body:command.text?.trim()||'Photo',image:attachment},identities);message.image=attachment;draft.revision++})
        await project(command,userId)
        if(!authorized())throw new Error('Phone image cancelled before dispatch.')
        const image=await deps.generateImage({...command,prompt},userId)
        if(!authorized())throw new Error('Phone image cancelled. No attachment was delivered.')
        const current=normalizePhoneDevice(await deps.read(command.chatId,userId)).messages.find(message=>message.id===id)
        if(!current||current.sourceActive===false)throw new Error('The source was edited or its swipe changed. The generated photo was not delivered.')
        const ready=normalizePhoneImage({...attachment,...image,status:'ready'})!
        await deps.mutate(command.chatId,userId,draft=>{const message=draft.messages.find(message=>message.id===id)!;message.image=ready;message.createdAt=Date.now();draft.revision++})
      }catch(error){await deps.mutate(command.chatId,userId,draft=>{const message=draft.messages.find(message=>message.id===id);if(!message)throw error;message.image={...attachment,status:'failed',error:error instanceof Error?error.message:String(error)};draft.revision++})}
      finally{replying.delete(attempt)}
    }else if(command.action==='app-regenerate'||command.action==='regenerate'){
      const state=normalizePhoneDevice(await deps.read(command.chatId,userId))
      const app=command.action==='app-regenerate'
      const view=app?await deps.appView?.(command,userId):null
      if(app&&!view)throw new Error('Phone app regeneration is unavailable.')
      const existing=app?state.appInteractions?.find(entry=>entry.id===command.messageId&&entry.recordId===command.recordId&&entry.appId===command.appId&&(entry.targetId||'root')===(view?.targetId||'root')):state.messages.find(entry=>entry.id===command.messageId&&entry.sourceActive!==false)
      const source=app?(view?.bubbles as PhoneSourceBubble[]|undefined)?.find(entry=>entry.id===command.messageId&&entry.targetId===view?.targetId):null
      if(existing?.generation?.operationId===command.operationId||(app&&state.appInteractions?.some(entry=>entry.generation?.operationId===command.operationId))){await project(command,userId);return}
      if(!existing&&!source)throw new Error('This bubble is no longer in the current conversation.')
      const actor=identities.find(person=>person.id===(existing?.from||source?.actorId))
      if(!actor||actor.kind==='persona')throw new Error('Choose a confirmed character or NPC author. User replies are written in the composer.')
      if(!state.connectionId)throw new Error('Choose a phone reply connection in Settings first.')
      const body=existing?.body||source!.body
      const prompt=phoneAppReplyPrompt(actor,String(view?.sourceMarkup||''),[],identities,await deps.rpContext?.(command.chatId,userId)||'')
      prompt.push({role:'user',content:JSON.stringify({task:'Rewrite only this one message as a new alternative. Preserve the same moment, recipient, intent and known facts. Do not introduce events, facts, dialogue or actions for anyone else.',message:body,conversation:!app&&existing&&'to' in existing?phoneConversation(state,existing.from,existing.to).filter(entry=>entry.createdAt<existing.createdAt).slice(-12).map(entry=>({from:identities.find(person=>person.id===entry.from)?.name,text:entry.body})):[]})})
      if(!authorized())throw new Error('Bubble regeneration cancelled before dispatch.')
      const started=Date.now(),replacement=validatePhoneReply(await deps.generate(state.connectionId,prompt,userId))
      if(!authorized())throw new Error('Bubble regeneration cancelled; the original was preserved.')
      if(app)await deps.appView!(command,userId)
      const generation:PhoneGeneration={connectionId:state.connectionId,prompt,operationId:command.operationId,createdAt:Date.now(),durationMs:Date.now()-started}
      await deps.mutate(command.chatId,userId,draft=>{
        const current=app?draft.appInteractions?.find(entry=>entry.id===existing?.id):draft.messages.find(entry=>entry.id===existing?.id)
        if(existing){if(!current||current.body!==body||('sourceActive' in current&&current.sourceActive===false))throw new Error('This bubble changed during regeneration. The result was not applied.');current.variants=[...(current.variants||[]),{body:current.body,...(current.generation?{generation:current.generation}:{})}].slice(-5);current.body=replacement;current.generation=generation}
        else{const entries=draft.appInteractions||=[];if(entries.length>=5000)throw new Error('Phone archive limit reached.');entries.push({id:command.operationId,recordId:command.recordId!,appId:command.appId!,targetId:String(view!.targetId),sourceBubbleId:source!.id,from:actor.id,body:replacement,createdAt:Date.now(),generation,variants:[{body}]})}
        draft.revision++
      })
    }else if(command.action==='app-post'||command.action==='app-reply'){
      if(!deps.appView)throw new Error('Phone app interactions are unavailable.')
      const view=await deps.appView(command,userId)
      if(!view.interactionMode)throw new Error('This app is read-only; it has no messaging or comment interface.')
      const actor=identities.find(person=>person.id===command.from)
      if(!actor)throw new Error('Choose a current phone identity.')
      const state=normalizePhoneDevice(await deps.read(command.chatId,userId))
      let body=(command.text||'').trim(),id=command.operationId,replyTo:string|undefined,generation:PhoneGeneration|undefined
      if(command.action==='app-reply'){
        const incoming=state.appInteractions?.find(entry=>entry.id===command.messageId&&entry.recordId===command.recordId&&entry.appId===command.appId&&(entry.targetId||'root')===(view.targetId||'root'))
        if(!incoming)throw new Error('That comment is no longer in this app record.')
        id=`app-reply-${incoming.id}-${actor.id}`;replyTo=incoming.id
        if(state.appInteractions?.some(entry=>entry.id===id)){await project(command,userId);return}
        if(!state.connectionId)throw new Error('Choose a phone reply connection in Settings first.')
        const prompt=phoneAppReplyPrompt(actor,String(view.sourceMarkup||''),(state.appInteractions||[]).filter(entry=>entry.recordId===command.recordId&&(entry.targetId||'root')===(view.targetId||'root')),identities,await deps.rpContext?.(command.chatId,userId)||'')
        if(!authorized())throw new Error('App reply cancelled before dispatch.')
        const started=Date.now();body=validatePhoneReply(await deps.generate(state.connectionId,prompt,userId))
        generation={connectionId:state.connectionId,prompt,createdAt:Date.now(),durationMs:Date.now()-started}
        if(!authorized())throw new Error('App reply cancelled. No comment was posted.')
        await deps.appView(command,userId) // Source/ownership can change during a provider call.
      }
      if(!body||body.length>2000)throw new Error('Write a message or comment between 1 and 2,000 characters.')
      await deps.mutate(command.chatId,userId,draft=>{const entries=draft.appInteractions||=[];const existing=entries.find(entry=>entry.id===id);if(existing){if(existing.from!==actor.id||existing.recordId!==command.recordId||existing.body!==body||existing.targetId!==view.targetId)throw new Error('This app send identifier is already used.');return}if(entries.length>=5000)throw new Error('Phone comment archive limit reached. Existing records were preserved.');entries.push({id,recordId:command.recordId!,appId:command.appId!,targetId:String(view.targetId||'root'),from:actor.id,body,createdAt:Date.now(),...(replyTo?{replyTo}:{}),...(generation?{generation}:{})});draft.revision++})
      if(command.action==='app-post'&&state.autoReply!==false){
        const responder=identities.find(person=>person.id===(command.to||view.replyActorId)&&person.id!==actor.id)
        if(!responder)throw new Error('Your message was delivered. Choose a reply participant in this app to enable automatic replies.')
        if(responder.kind==='persona'){await project(command,userId);return}
        const current=normalizePhoneDevice(await deps.read(command.chatId,userId)).appInteractions?.find(entry=>entry.id===id)
        if(!current?.autoReplyAttempted){
          await deps.mutate(command.chatId,userId,draft=>{draft.appInteractions!.find(entry=>entry.id===id)!.autoReplyAttempted=true;draft.revision++})
          await project(command,userId)
          await run({...command,action:'app-reply',ownerId:command.from,from:responder.id,messageId:id},userId,authorized)
          return
        }
      }
    }else if (command.action === 'settings') {
      if(command.contextMode!==undefined&&!['automatic','manual'].includes(command.contextMode))throw new Error('Choose Automatic or Manual phone context.')
      if (command.legacyOwnerName !== undefined) {
        const projection = await deps.projection(command.chatId, userId)
        const records=[...(Array.isArray(projection.saved)?projection.saved:[]),...(Array.isArray(projection.appRecords)?projection.appRecords:[])]
        if (!identities.some(person => person.id === command.from) || !records.some(entry => entry.ownerName === command.legacyOwnerName)) throw new Error('Choose an existing saved-record owner and a current phone identity.')
      }
      await deps.mutate(command.chatId, userId, state => {
        if (command.connectionId !== undefined) state.connectionId = command.connectionId || null
        if (command.sharedScene !== undefined) state.sharedScene = command.sharedScene.trim().slice(0, 3000)
        if(command.autoReply!==undefined)state.autoReply=command.autoReply
        if(command.incoming!==undefined)state.incoming=normalizePhoneIncoming(command.incoming)
        if (command.contextMode !== undefined) {
          if (!['automatic','manual'].includes(command.contextMode)) throw new Error('Choose Automatic or Manual phone context.')
          state.contextMode=command.contextMode; delete state.contextRequest
        }
        if (command.legacyOwnerName !== undefined) state.linkedOwners = { ...state.linkedOwners, [command.legacyOwnerName]: command.from! }
        state.revision++
      })
      const preferences:Partial<PhonePreferences>={
        ...(command.connectionId!==undefined?{connectionId:command.connectionId||null}:{}),
        ...(command.autoReply!==undefined?{autoReply:command.autoReply}:{}),
        ...(command.contextMode!==undefined?{contextMode:command.contextMode}:{}),
        ...(command.incoming!==undefined?{incoming:normalizePhoneIncoming(command.incoming)}:{}),
      }
      if(Object.keys(preferences).length)await deps.savePreferences?.(command.chatId,userId,preferences)
    } else if (command.action === 'read') {
      if(command.recordId){if(!identities.some(person=>person.id===command.from)||!deps.appView)throw new Error('Unknown phone identity.');await deps.appView(command,userId);await deps.mutate(command.chatId,userId,state=>{state.readAt[`app:${command.from}:${command.recordId}`]=Date.now();state.revision++});await project(command,userId);return}
      if (!identities.some(person => person.id === command.from) || !identities.some(person => person.id === command.to)) throw new Error('Unknown phone identity.')
      await deps.mutate(command.chatId, userId, state => { state.readAt[`${command.from}:${command.to}`] = Date.now(); state.revision++ })
    } else if (command.action === 'send') {
      await deps.mutate(command.chatId, userId, state => {
        addPhoneText(state, { id: command.operationId, from: command.from || '', to: command.to || '', body: command.text || '' }, identities)
      })
      const current=normalizePhoneDevice(await deps.read(command.chatId,userId)),recipient=identities.find(person=>person.id===command.to)
      if(current.autoReply!==false&&recipient&&recipient.kind!=='persona'&&current.messages.find(message=>message.id===command.operationId)?.replyStatus==='none'){await project(command,userId);await run({...command,action:'reply',messageId:command.operationId},userId,authorized);return}
    } else if (command.action === 'continue') {
      const state = normalizePhoneDevice(await deps.read(command.chatId, userId))
      if (command.from || command.to) {
        if (!identities.some(person => person.id === command.from) || !identities.some(person => person.id === command.to) || command.from === command.to) throw new Error('Choose a current phone conversation first.')
        if (!phoneConversation(state, command.from!, command.to!).length) throw new Error('Send a phone message before adding this conversation to the next prompt.')
      }
      if (!authorized()) throw new Error('Phone context request cancelled.')
      // Legacy action name retained for existing clients. No chat append and no generation.
      await deps.mutate(command.chatId,userId,draft=>{draft.contextRequest={id:command.operationId,...(command.from?{from:command.from,to:command.to}:{})};draft.revision++})
    } else if (command.action === 'reply') {
      const state = normalizePhoneDevice(await deps.read(command.chatId, userId))
      const incoming = state.messages.find(message => message.id === command.messageId)
      if (!incoming) throw new Error('That phone message no longer exists.')
      if(incoming.image&&incoming.image.status!=='ready')throw new Error('Finish or retry this image before requesting a reply.')
      if (state.messages.some(message => message.replyTo === incoming.id)) { await project(command, userId); return }
      if (phoneConversation(state, incoming.from, incoming.to).at(-1)?.id !== incoming.id) throw new Error('Reply to the latest text, not an older turn in this conversation.')
      const connectionId = state.connectionId
      if (!connectionId) throw new Error('Select a phone reply connection in Phone Settings first.')
      const prompt = phoneReplyPrompt(state, incoming, identities, await deps.rpContext?.(command.chatId,userId))
      if (!authorized()) throw new Error('Phone reply cancelled before dispatch. Your sent text was preserved.')
      const attempt = `${userId}:${command.chatId}:${incoming.id}`
      replying.add(attempt)
      try {
      await deps.mutate(command.chatId, userId, draft => {
        const message = draft.messages.find(message => message.id === incoming.id)!
        message.replyStatus = 'pending'; delete message.error; draft.revision++
      })
      await project(command, userId)
        if (!authorized()) throw new Error('Phone reply cancelled before dispatch. Your sent text was preserved.')
        const started=Date.now(),reply = validatePhoneReply(await deps.generate(connectionId, prompt, userId))
        const generation:PhoneGeneration={connectionId,prompt,createdAt:Date.now(),durationMs:Date.now()-started}
        if (!authorized()) throw new Error('Phone reply cancelled. Your sent text was preserved.')
        await deps.mutate(command.chatId, userId, draft => {
          // Persist once, even if the UI closed or changed chats while waiting.
          if (draft.messages.find(message=>message.id===incoming.id)?.sourceActive===false)throw new Error('This source was edited during the reply. The result was not delivered.')
          if (!draft.messages.some(message => message.replyTo === incoming.id)) addPhoneText(draft, { id: `reply-${incoming.id}`, from: incoming.to, to: incoming.from, body: reply, replyTo: incoming.id,generation }, identities)
          const message = draft.messages.find(message => message.id === incoming.id)!
          message.replyStatus = 'complete'; delete message.error; draft.revision++
        })
      } catch (error) {
        await deps.mutate(command.chatId, userId, draft => {
          const message = draft.messages.find(message => message.id === incoming.id)!
          message.replyStatus = 'failed'; message.error = error instanceof Error ? error.message : String(error); draft.revision++
        })
      } finally { replying.delete(attempt) }
    } else if (command.action === 'load') {
      // A server restart cannot leave a persisted in-flight reply spinning forever.
      const state = normalizePhoneDevice(await deps.read(command.chatId, userId, identities))
      let recovered = false
      if (state.messages.some(message => message.replyStatus === 'pending' && !replying.has(`${userId}:${command.chatId}:${message.id}`)||message.image?.status==='pending'&&!replying.has(`${userId}:${command.chatId}:image:${message.id}`))||state.localApps?.some(app=>app.media?.some(media=>media.image.status==='pending'&&!replying.has(`${userId}:${command.chatId}:app-image:${app.id}:${media.id}`)))) {
        await deps.mutate(command.chatId, userId, draft => {
          for (const message of draft.messages) if (message.replyStatus === 'pending' && !replying.has(`${userId}:${command.chatId}:${message.id}`)) { message.replyStatus = 'failed'; message.error = 'Reply interrupted by a restart. Retry explicitly; your sent message was preserved.' }
          for(const message of draft.messages)if(message.image?.status==='pending'&&!replying.has(`${userId}:${command.chatId}:image:${message.id}`))message.image={...message.image,status:'failed',error:'Image generation interrupted by a restart. Retry explicitly.'}
          for(const app of draft.localApps||[])for(const media of app.media||[])if(media.image.status==='pending'&&!replying.has(`${userId}:${command.chatId}:app-image:${app.id}:${media.id}`))media.image={...media.image,status:'failed',error:'App image generation was interrupted by a restart. The app content is saved; retry this image from the app.'}
          draft.revision++
        })
        recovered = true
      }
      if(Object.entries(state.portraits||{}).some(([id,image])=>image.status==='pending'&&!replying.has(`${userId}:${command.chatId}:portrait:${id}`))){await deps.mutate(command.chatId,userId,draft=>{for(const [id,image] of Object.entries(draft.portraits||{}))if(image.status==='pending'&&!replying.has(`${userId}:${command.chatId}:portrait:${id}`))draft.portraits![id]={...image,status:'failed',error:'Portrait interrupted by restart. Retry explicitly.'};draft.revision++});recovered=true}
      // Only reread after recovery actually changed storage. Ordinary opens use
      // the reconciled state already read above, never a second history scan.
      return project(command, userId, undefined, { state: recovered ? normalizePhoneDevice(await deps.read(command.chatId, userId, identities)) : state, identities })
    } else throw new Error('Unknown phone action.')
    await project(command, userId)
  }
  return {
    async handle(command: PhoneCommand, userId?: string) {
      // Capture at receipt, not when a queued action eventually reaches its lane.
      const authorized = deps.captureAuthorization?.(userId) || (() => true)
      const lane = `${userId || '__default__'}:${command.chatId}`
      // Loads must see pending state immediately, not wait behind the provider.
      if (command.action === 'load') {
        const loadKey = JSON.stringify([userId ?? null, command.chatId])
        let task: Promise<Record<string, unknown> | undefined> | undefined
        try {
          if (!command.chatId || command.chatId.length > 150 || !/^[\w-]{8,100}$/.test(command.operationId)) throw new Error('Invalid phone operation.')
          const pending = loads.get(loadKey)
          if (pending) {
            const message = await pending
            if (message) deps.send({ ...message, operationId: command.operationId }, userId)
          } else {
            task = run(command, userId)
            loads.set(loadKey, task)
            await task
          }
        } catch (error) { deps.send({ type: 'phone_error', chatId: command.chatId, operationId: command.operationId, error: String(error instanceof Error ? error.message : error) }, userId) }
        finally { if (task && loads.get(loadKey) === task) loads.delete(loadKey) }
        return
      }
      const task = (lanes.get(lane) || Promise.resolve()).then(async () => { await run(command, userId, authorized) }).catch(async error => {
        try { await project(command, userId, error instanceof Error ? error.message : String(error)) }
        catch { deps.send({ type: 'phone_error', chatId: command.chatId, operationId: command.operationId, error: String(error instanceof Error ? error.message : error) }, userId) }
      })
      lanes.set(lane, task)
      await task
      if (lanes.get(lane) === task) lanes.delete(lane)
    },
  }
}
