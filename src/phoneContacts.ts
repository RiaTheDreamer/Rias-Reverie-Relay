import type {PhoneIdentity} from './phoneDevice'
import {storyFingerprint,type StoryActor} from './storyState'
import {contentFingerprint} from './contracts'
import {plainSurfaceText,surfaceXmlAttributes,parseSurfaceXml,xmlChildren,type SurfaceXmlNode} from './surfaceXml'
import {phoneCoreRecords} from './phoneCoreApps'
import {phoneAppInteractionMode} from './phoneAppInteractions'
export function phoneNpcContacts(actors:StoryActor[],sources:Array<{messageId:string;swipeId:number;content:string}>,existing:PhoneIdentity[]):PhoneIdentity[]{
  const contacts:PhoneIdentity[]=[]
  const used=new Set(existing.flatMap(person=>[person.name,...(person.aliases||[])].map(name=>name.toLocaleLowerCase())))
  function add(person:PhoneIdentity){const key=person.name.toLocaleLowerCase();if(!key||person.name.length>80||used.has(key)||contacts.length>=40)return;used.add(key);contacts.push(person)}
  for(const actor of actors){const refs=actor.sourceRefs.filter(ref=>ref.sourceState==='active'&&(ref.sourceKind==='manual'||sources.some(source=>source.messageId===ref.messageId&&source.swipeId===ref.swipeId&&storyFingerprint(source.content)===ref.contentFingerprint)));if(actor.kind==='npc'&&!actor.mergedIntoActorId&&refs.length)add({id:`npc:${actor.actorId}`,name:actor.displayName,kind:'npc',aliases:actor.aliases,description:refs.map(ref=>ref.excerpt).join('\n').slice(0,4000)})}
  // Explicit cast introductions work even when Event Constellations is off.
  for(const source of sources){const visible=source.content.replace(/```[\s\S]*?(?:```|$)|<!--[\s\S]*?(?:-->|$)|<(think|analysis|reasoning|Plot_Sparks|WHATIF)\b[^>]*>[\s\S]*?(?:<\/\1\s*>|$)/gi,'');for(const match of visible.matchAll(/<NPC\b([^>]*)>([\s\S]*?)<\/NPC\s*>/g)){const attrs=surfaceXmlAttributes(match[1]);const name=plainSurfaceText(attrs.name||'');if(name&&!/^(?:name|unknown|—)$/i.test(name))add({id:`npc:cast-${contentFingerprint(name.toLocaleLowerCase()).replace(':','-')}`,name,kind:'npc',description:plainSurfaceText(match[2]).slice(0,4000)})}}
  // A named author/contact in a committed app record is source-backed, too.
  // Never infer an identity from bubble alignment or a generated avatar.
  for(const source of sources)for(const app of phoneCoreRecords(source.content,source.messageId,source.swipeId)){
    if(!phoneAppInteractionMode(app.appId))continue
    const root=parseSurfaceXml(app.markup);if(!root)continue
    function visit(node:SurfaceXmlNode){
      const attrs=surfaceXmlAttributes(node.attrs)
      const names=[attrs.author,attrs.sender,attrs.from,attrs.user,...(node===root&&['instagram-dm','x-dm','discord-dm'].includes(app.appId)?[attrs.name]:[])]
      for(const value of names){const name=plainSurfaceText(value||'');if(!name||/^(?:you|user|persona|me|name|unknown|current (?:character|contact)|other participant|additional participant|—)$/i.test(name))continue;add({id:`npc:app-${contentFingerprint(name.toLocaleLowerCase()).replace(':','-')}`,name,kind:'npc',description:`Source-established ${app.appId} contact/account named ${name}. No biography is established by the account label. Use the selected thread and established RP facts.`})}
      for(const child of xmlChildren(node))visit(child)
    }visit(root)
  }
  return contacts
}
