import {phoneAppInteractionMode} from './phoneAppInteractions'
import type {PhoneAppInteraction,PhoneIdentity,PhoneDeviceState} from './phoneDevice'
import type {PhoneSourceBubble} from './phoneAppBubbles'
import {phoneAvatar,phoneAvatarUrl,PHONE_ACCOUNTS_CSS} from './phoneAppAccounts'

const layouts:Record<string,{feed:string;field?:string;composer?:string;bubble?:string;target?:string}>={
 'instagram-dm':{feed:'.rr23-igdm-chat',field:'.rr23-igdm-field',composer:'.rr23-igdm-composer',bubble:'.srv-bubble'},
 'x-dm':{feed:'.rr22-xdm-feed',field:'.rr22-xdm-input',composer:'.rr22-xdm-compose',bubble:'.srv-bubble'},
 'imessage-chat':{feed:'.rr22-im-feed',field:'.rr22-im-input',composer:'.rr22-im-compose',bubble:'.rr22-im-bubble'},
 'inline-chat':{feed:'.srv2-chat',field:'.composer .field',composer:'.composer',bubble:'.srv-bubble'},
 'discord-dm':{feed:'.msgs',field:'.composer>div',composer:'.composer',bubble:'.srv-discord-row>div>p'},
 kakao:{feed:'.kk-chat',field:'.kk-input',composer:'.kk-footer',bubble:'.kk-msg-bubble'},
 smartphone:{feed:'.rpx-chat-body',bubble:'.rpx-bubble'},
 'workspace-chat':{feed:'.rr22-ws-feed',bubble:'.rr22-ws-bubble',target:'.rr22-ws-page'},
 'discord-server':{feed:'.rrdc-feed',bubble:'.srv-discord-row>div>p',target:'.rrdc-page'},
 'email-thread':{feed:'.srv-email-reader',bubble:'.srv-email-body',target:'.srv-email-item'},
 instagram:{feed:'.igls-comments',bubble:'.igls-comment-text'},
 twitter:{feed:'.twlr-comments-panel',bubble:'.twlr-comment-body',target:'.twlr-post'},
 'instagram-profile':{feed:'.r43ig-comments',target:'.r43ig-fullpost'},
 'twitter-profile':{feed:'.r43tw-postspage',target:'.r43tw-postspage>article'},
 'instagram-stories':{feed:'.r43story-slide',target:'.r43story-slide'},
 'tiktok-post':{feed:'.srv54-tt-comments-list',field:'.srv54-tt-commentbox',bubble:'.srv54-tt-cbody'},
 'youtube-thumbnail':{feed:'.rr22-yt-comments',bubble:'.rr22-yt-comment'},
 'forum-thread':{feed:'.comments',bubble:'.srv4-rd-comment>div'},
 livestream:{feed:'.chat',bubble:'.srv-live-msg'},
 'naver-article':{feed:'.rr23-nv-comments-panel',bubble:'.rr23-nv-cbody'},
 'dating-profile':{feed:'.rrt-message-box',field:'.rrt-message-input',target:'.rrt-card'},
}
const outgoingBubble:Record<string,string>={
 'instagram-dm':'.srv-msg-right .srv-bubble','x-dm':'.srv-msg-right .srv-bubble','inline-chat':'.srv-msg-right .srv-bubble',
 'imessage-chat':'.rr22-im-right',kakao:'.kk-msg-right .kk-msg-bubble',smartphone:'.rpx-bubble-out,.rpx-bubble-sent',
}
/** Copy the active app's actual bubble palette; never impose the phone shell's accent. */
function matchAppBubble(root:ShadowRoot,bubble:HTMLElement,appId:string,selector:string|undefined,self:boolean){
 const source=(self&&outgoingBubble[appId]?root.querySelector<HTMLElement>(outgoingBubble[appId]):null)||
   (selector?Array.from(root.querySelectorAll<HTMLElement>(selector)).find(el=>!el.classList.contains('rp-phone-bubble')):null)
 if(!source)return
 const style=source.ownerDocument.defaultView!.getComputedStyle(source)
 for(const property of ['background-color','background-image','color','border-radius','border','box-shadow','font-size','font-family','line-height','padding']){
   const value=style.getPropertyValue(property);if(value)bubble.style.setProperty(property,value)
 }
}
export const PHONE_APP_CONTROLS_CSS=`
:host{height:100%;min-height:0;display:flex;flex-direction:column;overflow:hidden;color-scheme:dark;color:#f4f1f7}
.rrn-editable-surface{flex:1 1 auto;min-height:0;overflow:auto!important}
.rp-app-discussion{position:relative;z-index:6;flex:0 0 auto;max-height:42%;min-height:120px;overflow:auto;padding:10px 12px;background:#14121b;border-top:1px solid #ffffff24;color:#f4f1f7;box-shadow:0 -8px 24px #0007}
.rp-app-discussion-toggle{display:flex;align-items:center;gap:8px;width:100%;min-height:38px;padding:7px 10px;border:1px solid #ffffff1c;border-radius:12px;background:#1d1a26;color:#f7d9e7;text-align:left;font:700 12px system-ui;cursor:pointer}
.rp-app-discussion-content{padding-top:8px}.rp-app-discussion-content[hidden]{display:none}
.rp-app-discussion-title{display:block;margin:0 0 7px;color:#f7d9e7;font-size:12px;letter-spacing:.04em}
.rp-phone-composer{display:flex!important;gap:8px;align-items:center;padding:10px!important;position:sticky;bottom:0;background:#17131f;border-top:1px solid #ffffff20;z-index:5;flex-shrink:0}
.rp-phone-input{display:block!important;position:static!important;flex:1!important;width:100%!important;min-width:0;min-height:40px!important;height:40px;max-height:120px;padding:10px!important;border:1px solid #ffffff30!important;border-radius:18px;background:#22202b!important;color:#fff!important;font:14px/1.4 system-ui!important;resize:vertical;box-sizing:border-box}
.rp-phone-send{flex-shrink:0;min-height:36px;padding:8px 12px;background:#8b365d;border:0;border-radius:14px;color:white;font:13px system-ui;cursor:pointer}.rp-phone-send:disabled{opacity:.45}
.rp-phone-composer{flex-wrap:wrap}.rp-phone-responder{flex-basis:100%;min-width:0;border:1px solid #ffffff20;border-radius:8px;background:#22202b;color:#ddd;padding:5px;font:11px system-ui}
.rp-phone-target{width:100%;min-width:0;margin:0 0 7px;padding:7px 9px;border:1px solid #ffffff24;border-radius:9px;background:#211e2a;color:#eee;font:12px system-ui}
.rp-phone-discussion-entry{margin:6px 0;padding:8px 10px;border:1px solid #ffffff12;border-radius:12px;background:#201d28;color:#f4f1f7;font:13px/1.4 system-ui;white-space:pre-wrap;overflow-wrap:anywhere}
.rp-phone-discussion-entry.self{margin-left:auto;background:#233956;border-color:#385a7e}
.rp-phone-bubble{max-width:85%;margin:10px 8px;padding:10px 13px;border-radius:16px;background:#282435;color:#fff;font:14px/1.4 system-ui;white-space:pre-wrap;overflow-wrap:anywhere;cursor:pointer}.rp-phone-bubble.self{margin-left:auto;background:#833952}.rp-phone-bubble small{display:block;opacity:.7;font-size:11px;margin-bottom:4px}
[data-phone-bubble]{cursor:pointer}[data-phone-bubble]:focus-visible{outline:2px solid #f099bb;outline-offset:2px}
`
/** Upgrade the rendered app's own controls in its isolated phone shadow only. */
export function mountPhoneAppControls(root:ShadowRoot,options:{appId:string;owner:string;identities:PhoneIdentity[];state?:PhoneDeviceState;targets:Array<{id:string;label:string;replyActorId?:string}>;activeTargetId?:string;bubbles:PhoneSourceBubble[];entries:PhoneAppInteraction[];drafts:Map<string,string>;pending:boolean;autoReply?:boolean;responders?:Map<string,string>;post:(text:string,target:string,responder?:string)=>void;inspect:(id:string,target:string)=>void}){
 const mode=phoneAppInteractionMode(options.appId);if(!mode)return
 const layout=layouts[options.appId]||{feed:'.rrn-editable-surface>section,.rrn-editable-surface>div'}
 const targetNodes=layout.target?[...root.querySelectorAll<HTMLElement>(layout.target)]:[]
 const injectedTargets=new WeakMap<HTMLElement,string>()
 const targetFor=(el:Element)=>{const injected=injectedTargets.get(el as HTMLElement);if(injected)return injected;const match=targetNodes.findIndex(target=>target.contains(el));return options.targets[match<0?0:match]?.id||'root'}
 const bindBubble=(element:HTMLElement,id:string,target:string)=>{element.dataset.phoneBubble=id;element.tabIndex=0;element.setAttribute('aria-label',`Message actions: ${element.textContent?.slice(0,60)}`);const inspect=()=>options.inspect(id,target);element.addEventListener('click',event=>{if((event.target as HTMLElement)?.closest('a,button,summary,input,textarea'))return;event.stopPropagation();inspect()});element.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();inspect()}})}
 const used=new Set<string>()
 if(layout.bubble)for(const bubble of root.querySelectorAll<HTMLElement>(layout.bubble)){
   const text=bubble.textContent?.trim(),target=targetFor(bubble)
   const source=options.bubbles.find(source=>source.body.trim()===text&&source.targetId===target&&!used.has(source.id))||options.bubbles.find(source=>source.body.trim()===text&&source.targetId===target)
   if(source){used.add(source.id);const variant=options.entries.filter(entry=>entry.sourceBubbleId===source.id).at(-1);if(variant)bubble.textContent=variant.body;bindBubble(bubble,variant?.id||source.id,target)
     const actor=options.identities.find(actor=>actor.id===source.actorId),avatar=bubble.closest('.srv-msg,.kk-msg-row,.srv-discord-row')?.querySelector('.srv-avatar,.kk-msg-ava,.srv-discord-avatar')
     if(avatar&&options.state&&phoneAvatarUrl(actor,options.state))avatar.replaceWith(phoneAvatar(actor,options.state,actor!.name))
   }
   else{bubble.tabIndex=0;bubble.dataset.phoneBubble='unmapped';bubble.addEventListener('click',()=>options.inspect('',target))}
 }
 let feeds=[...root.querySelectorAll<HTMLElement>(layout.feed)]
 const fields=layout.field?[...root.querySelectorAll<HTMLElement>(layout.field)]:[]
 // Some app Surfaces contain only read-only cards, not an authored composer.
 // Keep discussion in a phone-owned dock below the app, never inside its root.
 if(!feeds.length){
   const dock=document.createElement('section');dock.className='rp-app-discussion';dock.setAttribute('aria-label',mode==='message'?'App messages':'App comments')
   const toggle=document.createElement('button');toggle.type='button';toggle.className='rp-app-discussion-toggle';toggle.setAttribute('aria-expanded','false');toggle.textContent=mode==='message'?'✉  Messages':'✎  Comments & replies'
   const content=document.createElement('div');content.className='rp-app-discussion-content';content.hidden=true
   const choices=options.targets.length?options.targets:[{id:'root',label:'This conversation'}]
   let active=choices.some(choice=>choice.id===options.activeTargetId)?options.activeTargetId!:choices[0].id
   if(choices.length>1){
     const select=document.createElement('select');select.className='rp-phone-target';select.setAttribute('aria-label',mode==='message'?'App conversation':'Comment target')
     for(const choice of choices){const option=document.createElement('option');option.value=choice.id;option.textContent=choice.label;select.append(option)}
     select.value=active;content.append(select)
   }
   const panes=new Map<string,HTMLElement>()
   const updateTarget=(target:string)=>{active=target;for(const [id,pane] of panes)pane.hidden=id!==active}
   for(const choice of choices){
     const pane=document.createElement('div');pane.className='rp-app-discussion-thread';pane.hidden=choice.id!==active;panes.set(choice.id,pane);injectedTargets.set(pane,choice.id)
     const label=document.createElement('strong');label.className='rp-app-discussion-title';label.textContent=choice.label;pane.append(label)
     for(const entry of options.entries.filter(entry=>!entry.sourceBubbleId&&(entry.targetId||'root')===choice.id)){
       const bubble=document.createElement('article');bubble.className=`rp-phone-discussion-entry${entry.from===options.owner?' self':''}`
       const actor=options.identities.find(person=>person.id===entry.from),author=document.createElement('small');author.textContent=actor?.name||'Archived contact';if(options.state&&phoneAvatarUrl(actor,options.state)&&entry.from!==options.owner)author.prepend(phoneAvatar(actor,options.state,actor!.name));bubble.append(author,document.createTextNode(entry.body));pane.append(bubble);bindBubble(bubble,entry.id,choice.id)
     }
     const form=document.createElement('form');form.className='rp-phone-composer'
     const input=document.createElement('textarea');input.dataset.phoneTarget=choice.id;input.className='rp-phone-input';input.rows=1;input.maxLength=2000;input.setAttribute('aria-label',mode==='message'?'App message':'App comment');input.placeholder=mode==='message'?'Message…':'Add a comment…';input.value=options.drafts.get(choice.id)||'';input.addEventListener('input',()=>options.drafts.set(choice.id,input.value))
     const send=document.createElement('button');send.type='submit';send.className='rp-phone-send';send.textContent=options.pending?'Sending…':mode==='message'?'Send':'Post';send.disabled=options.pending
     const responder=document.createElement('select');responder.className='rp-phone-responder';responder.setAttribute('aria-label','Automatic reply participant');responder.dataset.phoneTarget=choice.id
     const automatic=document.createElement('option');automatic.value='';automatic.textContent='Reply from app contact';responder.append(automatic)
     for(const actor of options.identities.filter(actor=>actor.kind!=='persona'&&actor.id!==options.owner)){const option=document.createElement('option');option.value=actor.id;option.textContent=actor.name;responder.append(option)}
     responder.value=options.responders?.get(choice.id)||choice.replyActorId||'';responder.addEventListener('change',()=>options.responders?.set(choice.id,responder.value))
     form.append(input,send);if(options.autoReply!==false)form.append(responder)
     form.addEventListener('submit',event=>{event.preventDefault();if(!options.pending&&input.value.trim())options.post(input.value,choice.id,responder.value||undefined)})
     input.addEventListener('keydown',event=>{if(event.key==='Enter'&&!event.shiftKey&&!event.isComposing){event.preventDefault();form.requestSubmit()}})
     pane.append(form);content.append(pane)
   }
   toggle.addEventListener('click',()=>{content.hidden=!content.hidden;toggle.setAttribute('aria-expanded',String(!content.hidden))})
   const selector=content.querySelector<HTMLSelectElement>('.rp-phone-target');selector?.addEventListener('change',()=>updateTarget(selector.value))
   dock.append(toggle,content);root.append(dock);feeds=[]
 }else{
  for(const feed of feeds){
   const target=targetFor(feed)
   for(const entry of options.entries.filter(entry=>!entry.sourceBubbleId&&(entry.targetId||'root')===target)){
     const bubble=document.createElement('article');bubble.className=`rp-phone-bubble${entry.from===options.owner?' self':''}`
     if(mode==='message'){
       matchAppBubble(root,bubble,options.appId,layout.bubble,entry.from===options.owner)
       // The widget builds its shadow while detached. Read stylesheet values again
       // after the synchronous mount, not from an unstyled detached host.
       queueMicrotask(()=>{if(root.host.isConnected)matchAppBubble(root,bubble,options.appId,layout.bubble,entry.from===options.owner)})
     }
     else{bubble.style.background='transparent';bubble.style.borderRadius='0';bubble.style.maxWidth='100%';bubble.style.marginLeft='8px'}
     const actor=options.identities.find(person=>person.id===entry.from),author=document.createElement('small');author.textContent=actor?.name||'Archived contact';if(options.state&&phoneAvatarUrl(actor,options.state)&&entry.from!==options.owner)author.prepend(phoneAvatar(actor,options.state,actor!.name));bubble.append(author,document.createTextNode(entry.body));feed.append(bubble);bindBubble(bubble,entry.id,target)
   }
  }
  // Replace actual app fields in place; if an app has a feed but no composer,
  // mount its new form at the end of that feed.
  const mounts=fields.length?fields:feeds
  for(const mount of mounts){
   const target=targetFor(mount),composer=fields.length?(layout.composer?mount.closest<HTMLElement>(layout.composer):mount.parentElement):null
   const form=document.createElement('form');form.className=[composer?.className||'','rp-phone-composer'].join(' ')
   const input=document.createElement('textarea');input.dataset.phoneTarget=target;input.className=`${fields.length?mount.className:''} rp-phone-input`;input.rows=1;input.maxLength=2000;input.setAttribute('aria-label',mode==='message'?'App message':'App comment');input.placeholder=mode==='message'?'Message…':'Add a comment…';input.value=options.drafts.get(target)||''
   input.addEventListener('input',()=>{options.drafts.set(target,input.value)})
   const send=document.createElement('button');send.type='submit';send.className='rp-phone-send';send.textContent=options.pending?'Sending…':mode==='message'?'Send':'Post';send.disabled=options.pending
   const responder=document.createElement('select');responder.className='rp-phone-responder';responder.setAttribute('aria-label','Automatic reply participant');responder.dataset.phoneTarget=target
   const automatic=document.createElement('option');automatic.value='';automatic.textContent='Reply from app contact';responder.append(automatic)
   for(const actor of options.identities.filter(actor=>actor.kind!=='persona'&&actor.id!==options.owner)){const option=document.createElement('option');option.value=actor.id;option.textContent=actor.name;responder.append(option)}
   responder.value=options.responders?.get(target)||options.targets.find(entry=>entry.id===target)?.replyActorId||'';responder.addEventListener('change',()=>options.responders?.set(target,responder.value))
   form.append(input,send);if(options.autoReply!==false)form.append(responder)
   form.addEventListener('submit',event=>{event.preventDefault();if(!options.pending&&input.value.trim())options.post(input.value,target,responder.value||undefined)})
   input.addEventListener('keydown',event=>{if(event.key==='Enter'&&!event.shiftKey&&!event.isComposing){event.preventDefault();form.requestSubmit()}})
   if(composer)composer.replaceWith(form);else if(fields.length)mount.replaceWith(form);else mount.append(form)
  }
 }
 const style=document.createElement('style');style.textContent=PHONE_APP_CONTROLS_CSS+PHONE_ACCOUNTS_CSS;root.append(style)
 return ()=>{for(const input of root.querySelectorAll<HTMLTextAreaElement>('.rp-phone-input'))input.disabled=options.pending}
}
