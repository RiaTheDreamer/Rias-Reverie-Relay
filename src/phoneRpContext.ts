import { sanitizeRelayPromptHistoryText } from './contracts'
import { shippedSurfaceDefinitions } from './shippedSurfaceDefinitions'
import { r45SupplementalSurfaceDefinitions } from './r45SurfaceCatalog'

export type PhoneRpRow={role:string;content:string;name?:string}
/** A fresh, bounded window from this saved chat, not the entire account or another inbox. */
export function phoneRpContext(rows:PhoneRpRow[]):string {
  const roots=[...shippedSurfaceDefinitions(0),...r45SupplementalSurfaceDefinitions(0)].map(definition=>definition.canonicalOuterWrapper)
  const clean=(content:string)=>{
    let result=sanitizeRelayPromptHistoryText(content)
      .replace(/<(think|analysis|reasoning|script|style|Plot_Sparks|WHATIF|character_phone)\b[^>]*>[\s\S]*?(?:<\/\1\s*>|$)/gi,'')
      .replace(/\[(think|analysis|reasoning|Plot_Sparks|WHATIF|character_phone)\b[^\]]*\][\s\S]*?(?:\[\/\1\s*\]|$)/gi,'')
      .replace(/```[\s\S]*?(?:```|$)|<!--[\s\S]*?(?:-->|$)/g,'')
    for(const root of roots){
      result=result.replace(new RegExp(`<${root}\\b[^>]*>[\\s\\S]*?<\\/${root}\\s*>`,'gi'),'[Separate app record omitted]')
        .replace(new RegExp(`\\[${root}\\b[^\\]]*\\][\\s\\S]*?\\[\\/${root}\\s*\\]`,'gi'),'[Separate app record omitted]')
    }
    return result.trim()
  }
  let budget=12000;const selected:PhoneRpRow[]=[]
  for(const row of rows.slice(-20).reverse()){
    if(!['user','assistant'].includes(row.role))continue
    const content=clean(row.content).slice(-Math.min(4000,budget))
    if(!content)continue
    selected.unshift({role:row.role,...(row.name?{name:row.name}:{}),content});budget-=content.length
    if(budget<=0)break
  }
  return selected.length?JSON.stringify(selected):'No recent RP scene is available.'
}
