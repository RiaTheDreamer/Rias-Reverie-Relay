// @ts-nocheck -- mounted production widget; no provider calls.
import assert from 'node:assert/strict'
import {JSDOM} from 'jsdom'
import {mountPhoneWidget} from '../src/phoneWidget'
import {emptyPhoneDevice} from '../src/phoneDevice'
import {focusedPanelControl,shouldDeferPanelRenderForControl} from '../src/panelRenderPolicy'
const dom=new JSDOM('<body></body>',{url:'http://localhost',pretendToBeVisual:true})
globalThis.window=dom.window;globalThis.document=dom.window.document
const widgets=[],sent=[],handlers=[],events=new Map();let active='settings-chat-a',redirects=0
const ctx={getActiveChat:()=>({chatId:active}),sendToBackend:value=>sent.push(value),onBackendMessage:fn=>{handlers.push(fn);return()=>{}},events:{on:(name,fn)=>{events.set(name,fn);return()=>{}}},ui:{createFloatWidget:()=>{const root=document.createElement('div');document.body.append(root);const widget={root,setVisible(){},destroy(){root.remove()}};widgets.push(widget);return widget}}}
const controller=mountPhoneWidget(ctx,{onSettings:()=>redirects++})
const projection={type:'phone_state',chatId:active,operationId:'settings-load',state:emptyPhoneDevice(),identities:[{id:'character:a',name:'Character',kind:'character'},{id:'persona:a',name:'Persona',kind:'persona'}],connections:[{id:'first',name:'First',model:'model-a'},{id:'second',name:'Second',model:'model-b'}],saved:[]}
handlers[0](projection)
const panel=document.createElement('div');document.body.append(panel);controller.mountSettings(panel)
const panelSelect=panel.shadowRoot.querySelector('#phone-connection')
assert.equal(panelSelect.value,'','empty choice must be a real option')
panelSelect.focus()
assert.equal(focusedPanelControl(panel),panelSelect,'outer panel focus policy must see the real select through ShadowDOM')
assert(shouldDeferPanelRenderForControl(focusedPanelControl(panel)),'outer panel must defer replacement while a shadow picker is focused')
handlers[0]({...projection,operationId:'unrelated-refresh',state:{...projection.state,revision:1}})
assert.equal(panel.shadowRoot.querySelector('#phone-connection'),panelSelect,'refresh must not destroy an open native connection picker')
panelSelect.value='second';panelSelect.dispatchEvent(new window.Event('change'))
handlers[0]({...projection,operationId:'second-refresh',state:{...projection.state,revision:2}})
assert.equal(panelSelect.value,'second','refresh must preserve the selection and its draft')
controller.open();const root=()=>widgets.at(-1).root.shadowRoot
const settings=[...root().querySelectorAll('button')].find(el=>el.textContent==='Settings');assert(settings);settings.click()
assert.equal(redirects,0,'Settings app must stay inside the phone')
assert(root().querySelector('#phone-connection'),'Settings app renders the actual editor')
const select=root().querySelector('#phone-connection');select.focus()
handlers[0]({...projection,operationId:'notification-refresh',state:{...projection.state,revision:3}})
assert.equal(root().querySelector('#phone-connection'),select,'phone-side native dropdown is stable during refresh')
select.value='first';select.dispatchEvent(new window.Event('change'))
handlers[0]({...projection,operationId:'changed-preference-refresh',state:{...projection.state,revision:4,connectionId:'second'}})
assert.equal(root().querySelector('#phone-connection'),select,'even a changed projection cannot close an actively edited picker')
select.blur();[...root().querySelectorAll('button')].find(el=>el.textContent==='Save phone settings').click()
assert.equal(sent.at(-1).connectionId,'first')
const save=sent.at(-1)
assert.match(root().querySelector('[role="status"]').textContent,/Saving/,'saving must be visibly acknowledged before the backend returns')
assert(root().querySelector('[data-phone-settings-save]').disabled,'duplicate saves cannot race')
select.focus()
handlers[0]({...projection,operationId:save.operationId,state:{...projection.state,revision:5,connectionId:'first'}})
assert.match(root().querySelector('[role="status"]').textContent,/saved/i,'only the matching backend acknowledgement reports success')
assert.equal(root().querySelector('#phone-connection'),select,'save feedback must not replace the settings controls')
root().querySelector('[data-phone-settings-save]').click();const failed=sent.at(-1)
handlers[0]({type:'phone_error',chatId:active,operationId:failed.operationId,error:'Storage unavailable'})
assert.match(root().querySelector('[role="status"]').textContent,/not saved/i)
assert(!root().querySelector('[data-phone-settings-save]').disabled,'failed save is retryable')
root().querySelector('[data-phone-settings-save]').click();const retry=sent.at(-1)
const frequency=root().querySelector('#phone-incoming-frequency');frequency.value='every';frequency.dispatchEvent(new window.Event('change'))
handlers[0]({...projection,operationId:retry.operationId,state:{...projection.state,revision:6,connectionId:'first'}})
assert.match(root().querySelector('[role="status"]').textContent,/New changes are not saved yet/,'an acknowledgement cannot claim later edits were saved')
const lateIncoming=root().querySelector('#phone-incoming-frequency');assert.equal(lateIncoming.value,'every','edits during save retain the draft')
controller.destroy();dom.window.close()
console.log('PASS phone settings: stable native pickers, retained drafts, in-phone editor, save command')
