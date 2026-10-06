import type {PhoneDeviceState,PhoneIdentity} from './phoneDevice'
import {safePhoneImageUrl} from './phoneMedia'

export function phoneAvatarUrl(actor:PhoneIdentity|undefined,state:PhoneDeviceState):string|undefined{
 const value=actor&&(state.portraits?.[actor.id]?.imageUrl||actor.avatarUrl)
 return safePhoneImageUrl(value)?value:undefined
}
export function phoneAvatar(actor:PhoneIdentity|undefined,state:PhoneDeviceState,label:string):HTMLElement{
 const avatar=document.createElement('span');avatar.className='rp-account-avatar'
 const url=phoneAvatarUrl(actor,state)
 if(url){const image=document.createElement('img');image.src=url;image.alt=`${label} profile picture`;image.loading='lazy';avatar.append(image)}
 else avatar.textContent=label.trim().slice(0,1)||'•'
 return avatar
}
export type PhoneConversationChoice={id:string;label:string;actorId?:string;recordId:string;targetId?:string}
const headers:Record<string,{head:string;avatar:string}>={
 'instagram-dm':{head:'.rr23-igdm-head',avatar:'.rr23-igdm-av'},
 'x-dm':{head:'.rr22-xdm-head',avatar:'.rr22-xdm-avatar'},
 'imessage-chat':{head:'.rr22-im-head',avatar:'.rr22-im-people'},
 kakao:{head:'.kk-header',avatar:'.kk-avatar'},
 'inline-chat':{head:'.srv2 .head',avatar:'.avatar'},
 'discord-dm':{head:'.srv2-ddm .head',avatar:'.avatar'},
 smartphone:{head:'.rpx-chat-head',avatar:'.rpx-avatar'},
 'workspace-chat':{head:'.rr22-ws-head',avatar:'.avatar'},
 'discord-server':{head:'.rrdc-head',avatar:'.avatar'},
 'email-thread':{head:'.srv-email-reader',avatar:'.avatar'},
}
export const PHONE_ACCOUNTS_CSS=`
:host{position:relative}.rp-account-avatar{width:36px;height:36px;flex-shrink:0;display:grid;place-items:center;overflow:hidden;border-radius:50%;background:#4d3f61;color:white;font:600 14px system-ui}.rp-account-avatar img{width:100%;height:100%;object-fit:cover}
.rp-conversation-trigger{display:inline-flex;align-items:center;gap:3px;border:0;padding:0;background:transparent;color:inherit;cursor:pointer;flex-shrink:0}.rp-conversation-trigger:focus-visible{outline:2px solid #ee8fbd;outline-offset:3px;border-radius:50%}
.rp-conversations{position:absolute;z-index:40;top:62px;left:12px;right:12px;max-height:65%;overflow:auto;padding:10px;border:1px solid #ffffff35;border-radius:20px;background:#25202df7;color:#fff;box-shadow:0 16px 50px #000a;backdrop-filter:blur(16px);font:14px/1.4 system-ui}.rp-conversations[hidden]{display:none}.rp-conversations-title{display:flex;align-items:center;justify-content:space-between;padding:5px 5px 10px}.rp-conversations button{cursor:pointer;color:inherit}.rp-conversation-choice{display:flex;align-items:center;gap:12px;width:100%;text-align:left;padding:10px;border:0;border-radius:13px;background:transparent;color:inherit}.rp-conversation-choice:hover,.rp-conversation-choice[aria-current=true]{background:#ffffff12}.rp-conversation-choice span:last-child{min-width:0;overflow-wrap:anywhere}
`
/** Phone-only header upgrade. A conversation selection never changes the phone owner. */
export function mountPhoneConversationPicker(root:ShadowRoot,options:{appId:string;choices:PhoneConversationChoice[];currentId:string;identities:PhoneIdentity[];state:PhoneDeviceState;select:(choice:PhoneConversationChoice)=>void}){
 const layout=headers[options.appId];if(!layout||!options.choices.length)return
 const head=root.querySelector<HTMLElement>(layout.head);if(!head)return
 const current=options.choices.find(choice=>choice.id===options.currentId)||options.choices.at(-1)!
 const actor=options.identities.find(actor=>actor.id===current.actorId)
 const trigger=document.createElement('button');trigger.type='button';trigger.className='rp-conversation-trigger';trigger.setAttribute('aria-label','Switch app conversation');trigger.setAttribute('aria-expanded','false');trigger.setAttribute('aria-haspopup','dialog');trigger.append(phoneAvatar(actor,options.state,current.label),document.createTextNode('⌄'))
 const old=head.querySelector(layout.avatar);if(old)old.replaceWith(trigger);else head.prepend(trigger)
 const menu=document.createElement('section');menu.className='rp-conversations';menu.hidden=true;menu.setAttribute('role','dialog');menu.setAttribute('aria-label','App conversations')
 const title=document.createElement('div');title.className='rp-conversations-title';title.textContent='Conversations';const close=document.createElement('button');close.type='button';close.textContent='×';close.setAttribute('aria-label','Close conversations');title.append(close);menu.append(title)
 const dismiss=()=>{menu.hidden=true;trigger.setAttribute('aria-expanded','false');trigger.focus()};close.addEventListener('click',dismiss)
 for(const choice of options.choices){const button=document.createElement('button');button.type='button';button.className='rp-conversation-choice';button.setAttribute('aria-current',String(choice.id===current.id));button.append(phoneAvatar(options.identities.find(actor=>actor.id===choice.actorId),options.state,choice.label));const name=document.createElement('span');name.textContent=choice.label;button.append(name);button.addEventListener('click',()=>{dismiss();options.select(choice)});menu.append(button)}
 trigger.addEventListener('click',()=>{menu.hidden=!menu.hidden;trigger.setAttribute('aria-expanded',String(!menu.hidden));if(!menu.hidden)menu.querySelector<HTMLButtonElement>('.rp-conversation-choice[aria-current=true]')?.focus()})
 menu.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();dismiss()}})
 const style=document.createElement('style');style.textContent=PHONE_ACCOUNTS_CSS;root.append(style,menu)
}
