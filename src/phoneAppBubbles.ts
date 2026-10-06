import {parseSurfaceXml,xmlChildren,xmlText,serializeSurfaceXml,surfaceXmlAttributes,type SurfaceXmlNode} from './surfaceXml'
import {contentFingerprint} from './contracts'
import type {PhoneIdentity} from './phoneDevice'
export type PhoneSourceBubble={id:string;body:string;author:string;actorId?:string;targetId:string}
const messageTags=new Set(['avatar_msg','dm_msg','discord_avatar_msg','discord_msg','chat_msg','im_msg','k_msg','s_recv','s_sent','ws_msg','server_avatar_msg','server_msg','email_body','fm_comment','tw_comment','ig_comment','igp_comment','xp_comment','tt_comment','yt_comment','nv_comment','live_msg'])
/** Exact author mapping only. A renderer's left/right alignment is not an identity. */
export function phoneSourceBubbles(targets:Array<{id:string;markup:string}>,identities:PhoneIdentity[]):PhoneSourceBubble[]{
  return targets.flatMap(target=>{
    const root=parseSurfaceXml(target.markup);if(!root)return []
    const result:PhoneSourceBubble[]=[];const rootAttrs=surfaceXmlAttributes(root.attrs)
    function visit(node:SurfaceXmlNode){
      if(messageTags.has(node.tag)){
        const attrs=surfaceXmlAttributes(node.attrs),bodyNode=xmlChildren(node).find(child=>child.tag==='text')
        const body=bodyNode?xmlText(bodyNode):node.children.filter(child=>typeof child==='string').join('').trim()
        const author=attrs.from||attrs.sender||attrs.user||attrs.author||(node.tag==='s_recv'?rootAttrs.sender:node.tag==='email_body'?rootAttrs.from:'')||''
        const matches=identities.filter(person=>[person.name,...person.aliases||[]].some(name=>name.toLocaleLowerCase()===author.toLocaleLowerCase()))
        if(body)result.push({id:`source-${contentFingerprint(serializeSurfaceXml(node)).replace(':','-')}-${result.length}`,body,author,targetId:target.id,...(matches.length===1?{actorId:matches[0].id}:{})})
        return
      }
      for(const child of xmlChildren(node))visit(child)
    }visit(root);return result
  })
}
export function phoneAppResponder(markup:string,identities:PhoneIdentity[],owner:string):string|undefined{
 const root=parseSurfaceXml(markup);if(!root)return
 const attrs=surfaceXmlAttributes(root.attrs),author=attrs.name||attrs.author||attrs.sender||attrs.from||attrs.user
 const exact=author?identities.filter(person=>person.id!==owner&&[person.name,...person.aliases||[]].some(name=>name.toLocaleLowerCase()===author.toLocaleLowerCase())):[]
 if(exact.length===1)return exact[0].id
 const participants=[...new Set(phoneSourceBubbles([{id:'root',markup}],identities).flatMap(bubble=>bubble.actorId&&bubble.actorId!==owner?[bubble.actorId]:[]))]
 return participants.length===1?participants[0]:undefined
}
