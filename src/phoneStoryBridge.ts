import { addPhoneText, type PhoneDeviceState, type PhoneIdentity, type PhoneText } from './phoneDevice'
import { DEFAULT_PHONE_INCOMING, phoneIncomingDirective, type PhoneIncomingSettings } from './phoneIncomingSettings'

type PhoneActivity = { start:number; end:number; from:string; to:string; scope:string; body:string; index:number;imagePrompt?:string }
const escapeHtml=(value:string)=>value.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;')
const decodeXml=(value:string)=>value.replace(/&(amp|lt|gt|quot|apos);/g,(_,name:string)=>({amp:'&',lt:'<',gt:'>',quot:'"',apos:"'"} as Record<string,string>)[name])
function maskExamples(source:string):string {
  return source.replace(/```[\s\S]*?(?:```|$)|~~~[\s\S]*?(?:~~~|$)|`[^`\n]*`|<!--[\s\S]*?(?:-->|$)|<(think|analysis|reasoning|script|style)\b[^>]*>[\s\S]*?(?:<\/\1\s*>|$)/gi,value=>' '.repeat(value.length))
}
function standalone(prefix:string):boolean {
  const stack:string[]=[]
  for(const tag of prefix.matchAll(/<(\/?)(([A-Za-z][\w-]*))\b[^>]*>/g)){
    const name=tag[2].toLowerCase()
    if(tag[1]){if(stack.at(-1)===name)stack.pop()}
    else if(!/\/\s*>$/.test(tag[0])&&!['br','hr','img','input','meta','link'].includes(name))stack.push(name)
  }
  return stack.length===0
}
/** Only explicit standalone XML controls; never infer phone actions from prose. */
export function parsePhoneActivities(source:string):PhoneActivity[]{
  const masked=maskExamples(source);const entries:PhoneActivity[]=[]
  for(const match of masked.matchAll(/<reverie-phone\b([^>]*)>([\s\S]*?)<\/reverie-phone\s*>/gi)){
    if(entries.length>=10)break
    const attrs:Record<string,string>={};let invalid=false
    const remainder=match[1].replace(/([\w-]+)\s*=\s*(["'])([\s\S]*?)\2/g,(_,name,_quote,value)=>{if(attrs[name]!==undefined)invalid=true;attrs[name]=value;return ''})
    const body=decodeXml(source.slice(match.index!+match[0].indexOf('>')+1,match.index!+match[0].lastIndexOf('</'))).trim()
    if(invalid||remainder.trim()||Object.keys(attrs).some(name=>!['from','to','scope','image-prompt'].includes(name))||!/^(?:character|npc:[\w.-]+)$/.test(attrs.from||'')||!/^(?:persona|character|npc:[\w.-]+)$/.test(attrs.to||'')||attrs.from===attrs.to||!/^character:[\w.-]+\|persona:[\w.-]+$/.test(attrs.scope||'')
      ||!body||body.length>2000||/<\/?[A-Za-z]|```|~~~/.test(body)||!standalone(masked.slice(0,match.index)))continue
    const imagePrompt=attrs['image-prompt']?decodeXml(attrs['image-prompt']).trim():undefined
    if(imagePrompt&&(imagePrompt.length>6000||/<\/?[A-Za-z]|```/.test(imagePrompt)))continue
    entries.push({start:match.index!,end:match.index!+match[0].length,from:attrs.from,to:attrs.to,scope:attrs.scope,body,index:entries.length,...(imagePrompt?{imagePrompt}:{})})
  }
  return entries
}
export function phoneStoryProtocol(identities:PhoneIdentity[], incoming:PhoneIncomingSettings=DEFAULT_PHONE_INCOMING, completedReplies=0):string {
  const character=identities.find(person=>person.kind==='character'),persona=identities.find(person=>person.kind==='persona')
  if(!character||!persona)return ''
  const contacts=JSON.stringify(identities.filter(person=>person.kind==='npc').map(person=>({id:person.id,name:person.name})))
  return `<reverie_phone_protocol>\n${phoneIncomingDirective(incoming, completedReplies)}\nUse the frequency and notification cap above. Output incoming in-world texts from ${character.name} or registered NPC contacts using standalone XML at the point the message arrives: <reverie-phone from="character" to="persona" scope="${escapeHtml(phoneStoryScope(identities))}">The actual text message.</reverie-phone>\nParticipants: character = ${JSON.stringify(character.name)}; persona = ${JSON.stringify(persona.name)}; NPC contacts = ${contacts}. Set from/to to character, persona, or an exact registered npc:id, and copy scope exactly. Include only delivered message content: plain text, up to 2,000 characters. Escape & and < as XML entities. For a sent photo, add image-prompt="visible photo description", escaping quotes as &quot;. The XML renders a clickable notification opening the recipient's phone conversation; image descriptions become photo drafts.\n</reverie_phone_protocol>`
}
export function resolvePhoneParticipant(ref:string,identities:PhoneIdentity[]):PhoneIdentity|undefined{return identities.find(person=>person.id===ref||person.kind===ref)}
export function phoneStoryScope(identities:PhoneIdentity[]):string{return `${identities.find(person=>person.kind==='character')?.id||''}|${identities.find(person=>person.kind==='persona')?.id||''}`}
/** Native Lumiverse preserves interrupted output. Stored text alone is not delivery proof. */
export function phoneStorySourceCommitted(extra:unknown,swipeId:number):boolean {
  if(!extra||typeof extra!=='object')return true // Legacy/manual saved messages have no generation receipt.
  const metadata=extra as Record<string,any>
  const activation=Array.isArray(metadata.promptActivationBySwipe)?metadata.promptActivationBySwipe[swipeId]:metadata.promptActivation
  const outcome=Array.isArray(metadata.generationOutcomeBySwipe)?metadata.generationOutcomeBySwipe[swipeId]:metadata.generationOutcome
  return activation?.complete!==false&&!outcome?.error
}
export function renderPhoneActivities(source:string):{content:string;count:number}{
  const entries=parsePhoneActivities(source);let content=source
  for(const entry of [...entries].reverse()){
    const html=`<div class="rr-phone-notification"><button type="button" data-reverie-phone-open="true" data-phone-from="character" data-phone-to="persona" data-phone-scope="${escapeHtml(entry.scope)}" style="display:flex;flex-direction:column;gap:6px;text-align:left;width:100%;max-width:420px;margin:12px 0;padding:14px 18px;border:1px solid #75556d;border-radius:18px;background:#241b2bf2;color:#f6eef8;box-shadow:0 5px 18px #0004;cursor:pointer;font:inherit"><span style="font-size:12px;color:#dba9c2">▣ &nbsp; New phone text · Character → You</span><span style="white-space:pre-wrap;overflow-wrap:anywhere">${escapeHtml(entry.body)}</span><span style="font-size:11px;color:#baa6c5">Open conversation ↗</span></button></div>`
    const routed=html.replace('data-phone-from="character"',`data-phone-from="${escapeHtml(entry.from)}"`).replace('data-phone-to="persona"',`data-phone-to="${escapeHtml(entry.to)}"`).replace('Character → You',entry.from==='character'&&entry.to==='persona'?'Character → You':`${entry.from.startsWith('npc:')?'NPC':'Character'} → ${entry.to==='persona'?'You':entry.to==='character'?'Character':'NPC'}`)
    content=content.slice(0,entry.start)+routed+content.slice(entry.end)
  }
  return {content,count:entries.length}
}
export type StoryPhoneText = {id:string;from:string;to:string;body:string;createdAt:number;sourceKey:string;image?:PhoneText['image']}
/** Host message dates are Unix seconds; phone timestamps are milliseconds. */
export function phoneStoryTimestamp(value:unknown, fallback=Date.now()):number {
  if(typeof value==='number'&&Number.isFinite(value)&&value>0)return value<100_000_000_000?value*1000:value
  const parsed=typeof value==='string'?Date.parse(value):NaN
  return Number.isFinite(parsed)?parsed:fallback
}
/** Source-owned archive is retained; only the currently committed candidate projects. */
export function reconcileStoryPhoneTexts(state:PhoneDeviceState, current:StoryPhoneText[], identities:PhoneIdentity[]):void {
  const active=new Set(current.map(entry=>entry.sourceKey));let changed=false
  for(const message of state.messages)if(message.sourceKey){const next=active.has(message.sourceKey);if(message.sourceActive!==next){message.sourceActive=next;changed=true}}
  for(const entry of current){
    const existing=state.messages.find(message=>message.id===entry.id)
    if(existing){if(existing.createdAt!==entry.createdAt){existing.createdAt=entry.createdAt;changed=true}continue}
    const message=addPhoneText(state,entry,identities,entry.createdAt) as PhoneText
    message.sourceKey=entry.sourceKey;message.sourceActive=true
  }
  if(changed)state.revision++
}
