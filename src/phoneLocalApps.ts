import {shippedSurfaceDefinitions} from './shippedSurfaceDefinitions'
import {r45SupplementalSurfaceDefinitions} from './r45SurfaceCatalog'
import {parseSurfaceXml,xmlText} from './surfaceXml'
import type {PhoneIdentity,PhoneLocalApp} from './phoneDevice'
import {parseImageRequests} from './contracts'

export const MAX_PHONE_LOCAL_APP_IMAGES=12
function localImageRequests(markup:string){
  const openings=markup.match(/<image_request\b/gi)||[],blocks=markup.match(/<image_request\b[^>]*>[\s\S]*?<\/image_request\s*>/gi)||[]
  if(openings.length!==blocks.length)throw new Error('The app setup returned an incomplete image request. Nothing was saved; retry with complete XML media slots.')
  const parsed=blocks.map(block=>parseImageRequests(block).map(request=>{
    const rawCount=/\bcount\s*=\s*["']([^"']+)["']/i.exec(block)?.[1]
    if(rawCount===undefined)return request
    const count=Number(rawCount)
    if(!Number.isInteger(count)||count<1||count>4)throw new Error('The app setup requested an unsupported image count. Use one to four images per media slot.')
    return {...request,count}
  }))
  if(parsed.some(requests=>requests.length!==1))throw new Error('The app setup returned an invalid image request. Nothing was saved; retry with complete IDs, supported targets and visual descriptions.')
  return parsed.flat()
}

const definitions=[...shippedSurfaceDefinitions(0),...r45SupplementalSurfaceDefinitions(0)]
export function phoneLocalAppPrompt(appId:string,owner:PhoneIdentity,identities:PhoneIdentity[],brief:string,rp:string){
  const definition=definitions.find(entry=>entry.baseSurfaceId===appId)
  if(!definition)throw new Error('Choose an installed Core app.')
  const shape=definition.sampleXml.replace(/<img\b[^>]*>/gi,'')
  const hasMedia=/<image_request\b/i.test(shape)
  return [{role:'system' as const,content:`Prepare one phone-local ${definition.displayName} app record for ${owner.name}. This is a fictional phone app, not a new main-story turn. Return only one complete <${definition.canonicalOuterWrapper}> XML document. Use the semantic structure below; example names and content are schema placeholders, never RP facts. Ground the app in the supplied RP and user's setup. Keep private content within this owner's knowledge. Use registered participants where applicable. No prose outside XML, code fences, HTML images or executable markup. ${hasMedia?'Preserve each defined <image_request> media slot and fill it with a scene-relevant visual description; requests are generated through native ImageGen after this record is saved. Do not place image markup in the authored XML.':'This app schema has no authored media slot; media can still be sent separately through the phone.'} Do not simulate a reply to a message the user has not sent. Keep content brief.\nSCHEMA SHAPE:\n${shape}`},
    {role:'user' as const,content:JSON.stringify({owner:{id:owner.id,name:owner.name,description:owner.description},participants:identities.map(({id,name,kind})=>({id,name,kind})),setup:brief,rp:rp.slice(0,14000)})}]
}
export function validatePhoneLocalApp(source:string,appId:string):string{
  const definition=definitions.find(entry=>entry.baseSurfaceId===appId),markup=source.trim()
  if(!definition||markup.length>30000||!markup.startsWith(`<${definition.canonicalOuterWrapper}`)||!markup.endsWith(`</${definition.canonicalOuterWrapper}>`))throw new Error('The app setup did not return its complete XML record. Nothing was saved; retry with a specific setup.')
  const parsed=parseSurfaceXml(markup)
  const hasContent=parsed&&(xmlText(parsed).trim()||parsed.children.some(child=>typeof child==='object'&&child.attrs.trim()))
  const imageRequests=localImageRequests(markup),rawImageRequests=markup.match(/<image_request\b/gi)||[],requestSignatures=new Map<string,string>()
  for(const request of imageRequests){const signature=request.target,existing=requestSignatures.get(request.id);if(existing&&existing!==signature)throw new Error('The app setup reused an image request ID across different image targets. Nothing was saved; retry with distinct IDs for distinct media.');requestSignatures.set(request.id,signature)}
  if(rawImageRequests.length&&!/<image_request\b/i.test(definition.sampleXml)||imageRequests.length>MAX_PHONE_LOCAL_APP_IMAGES)throw new Error('The app setup returned an unsupported image request. Nothing was saved; retry with valid unique XML media slots.')
  phoneLocalAppImageRequests(markup)
  if(!parsed||parsed.tag!==definition.canonicalOuterWrapper||!hasContent||/<\/?(?:script|style|iframe|object|embed|link|img|reverie-phone)\b|\son(?!line\b)\w+\s*=|(?:javascript|vbscript|file):/i.test(markup))throw new Error('The app setup returned malformed or unsupported content. Nothing was saved; refine the setup and retry.')
  return markup
}
export function phoneLocalAppImageRequests(markup:string){
  const requests=localImageRequests(markup),signatures=new Map<string,string>(),uniqueRequests=[] as ReturnType<typeof parseImageRequests>,expanded:Array<{id:string;requestId:string;target:string;slot?:string;alt?:string;aspect?:string;prompt:string}>=[]
  for(const request of requests){const signature=request.target,existing=signatures.get(request.id);if(existing&&existing!==signature)throw new Error('An app image request reuses an ID across different targets.');if(!existing){signatures.set(request.id,signature);uniqueRequests.push(request)}}
  for(const [requestIndex,request] of uniqueRequests.entries())for(let imageIndex=0;imageIndex<request.count;imageIndex++){
    if(expanded.length>=MAX_PHONE_LOCAL_APP_IMAGES)throw new Error(`This app requested more than ${MAX_PHONE_LOCAL_APP_IMAGES} images. Reduce the media count and retry.`)
    expanded.push({id:`${requestIndex}-${imageIndex}`,requestId:request.id,target:request.target,...(request.slot?{slot:`${request.slot}-${imageIndex+1}`} :{}),...(request.alt?{alt:request.alt}:{}),...(request.aspect?{aspect:request.aspect}:{}),prompt:request.prompt.trim()})
  }
  return expanded
}
export function phoneLocalAppRecord(record:PhoneLocalApp,owner:PhoneIdentity){
  if(record.ownerId!==owner.id)throw new Error('This phone-local app belongs to another owner.')
  return {id:record.id,appId:record.appId,messageId:record.id,swipeId:0,markup:record.markup,ownerName:owner.name,ownerId:owner.id,title:record.title,local:true as const,media:record.media||[]}
}
