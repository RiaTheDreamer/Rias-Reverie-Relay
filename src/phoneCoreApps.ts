import {shippedSurfaceDefinitions} from './shippedSurfaceDefinitions'
import {r45SupplementalSurfaceDefinitions} from './r45SurfaceCatalog'
import {parseSurfaceXml,surfaceXmlAttributes} from './surfaceXml'
import {normalizeBracketSurfaceDocument} from './bracketSurfaceBridge'
import {completeSurfaceSpecs} from './surfaceXml'
import {SHIPPED_SURFACE_SPECS} from './shippedSurfaceDefinitions'
import {renderNativeSurfaceMarkup,renderSurfaceContractRecovery,type NativeSurfaceRenderContext} from './nativeSurfaces'
import {xmlSurfaceExamples} from './xmlSurfaceFormat'
import {contentFingerprint,type CustomSurfaceStudioState} from './contracts'
import type {PhoneLocalAppMedia} from './phoneDevice'

export const PHONE_CORE_APPS=[...new Map([...shippedSurfaceDefinitions(0),...r45SupplementalSurfaceDefinitions(0)].map(definition=>[definition.baseSurfaceId,{id:definition.baseSurfaceId,label:definition.displayName,root:definition.canonicalOuterWrapper,icon:definition.icon}])).values()]
export type PhoneCoreRecord={id:string;appId:string;messageId:string;swipeId:number;markup:string;ownerName?:string;ownerId?:string;local?:boolean;title:string;media?:PhoneLocalAppMedia[]}
const PRIVATE_OWNER_APPS=new Set(['smartphone','notes-app','diary-app','phone-gallery'])
export function phoneCoreRecords(source:string,messageId:string,swipeId:number):PhoneCoreRecord[]{
  let content=source.replace(/```[\s\S]*?(?:```|$)|~~~[\s\S]*?(?:~~~|$)|<!--[\s\S]*?(?:-->|$)|<(think|analysis|reasoning|script|style)\b[^>]*>[\s\S]*?(?:<\/\1\s*>|$)/gi,'')
  content=normalizeBracketSurfaceDocument(content,completeSurfaceSpecs(SHIPPED_SURFACE_SPECS),block=>xmlSurfaceExamples(block.markup)).markup
  const records:PhoneCoreRecord[]=[]
  for(const app of PHONE_CORE_APPS){
    for(const match of content.matchAll(new RegExp(`<${app.root}\\b[^>]*>[\\s\\S]*?<\\/${app.root}\\s*>`,'gi'))){
      const parsed=parseSurfaceXml(match[0]);if(!parsed)continue
      const attrs=surfaceXmlAttributes(parsed.attrs)
      const ownerChild=parsed.children.find(child=>typeof child!=='string'&&child.tag==='owner')
      const ownerName=attrs.owner||(typeof ownerChild==='object'?ownerChild.children.filter(child=>typeof child==='string').join('').trim():undefined)
      records.push({id:`${messageId}:${swipeId}:${app.id}:${records.length}:${contentFingerprint(match[0])}`,appId:app.id,messageId,swipeId,markup:match[0],ownerName:PRIVATE_OWNER_APPS.has(app.id)?ownerName:undefined,title:attrs.title||attrs.subject||attrs.name||attrs.handle||app.label})
    }
  }
  return records
}
/** Reuse production renderers, exact source and media ownership. Opening is read-only. */
export function renderPhoneCoreRecord(record:PhoneCoreRecord,studio:CustomSurfaceStudioState,context:NativeSurfaceRenderContext):string {
  const localMedia=(record.media||[]).filter(media=>media.image.status==='ready'&&media.image.imageUrl).map(media=>({key:`phone-local-${record.id}-${media.id}`,requestId:media.requestId,messageId:record.messageId,swipeId:record.swipeId,status:'completed',imageUrl:media.image.imageUrl,imageId:media.image.imageId,target:media.target,slot:media.slot,alt:media.alt,requestAspect:media.aspect}))
  const ownerContext={...context,records:[...(context.records||[]),...localMedia],messageId:record.messageId,swipeId:record.swipeId,autoGenerate:false}
  const parsed=parseSurfaceXml(record.markup)
  const content=parsed&&!parsed.children.some(child=>typeof child==='string'?child.trim():true)&&Object.values(surfaceXmlAttributes(parsed.attrs)).every(value=>/^(?:\s*|—|-|n\/a|none|unknown)$/i.test(value))
    ?renderSurfaceContractRecovery(record.appId,parsed.tag,record.markup,'This saved app record contains no readable content. Its source was preserved; inspect or repair the record rather than inventing a conversation.',ownerContext,PHONE_CORE_APPS.find(app=>app.id===record.appId)?.label||record.appId)
    :renderNativeSurfaceMarkup(record.markup,{...studio,defaultShellMode:'inline'},ownerContext).content
  const unresolved=(record.media||[]).filter(media=>media.image.status==='pending'||media.image.status==='failed')
  const mediaStatus=unresolved.length?`<aside class="rp-phone-media-status" role="status" aria-live="polite">${unresolved.map(media=>`<div><span>${media.image.status==='pending'?'Generating app image…':'This app image failed to generate.'}</span>${media.image.status==='failed'?`<button type="button" data-phone-app-image-retry="${media.id}" aria-label="Retry app image">Retry image</button>`:''}</div>`).join('')}</aside>`:''
  return `${mediaStatus}${content}`
}
