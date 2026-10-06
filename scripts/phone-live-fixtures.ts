// @ts-nocheck -- offline fixture writer uses Bun's full filesystem API, not the narrow production shims.
// Reproducible saved-host fixtures. Not a Story Model quality evaluation.
import {mkdir,writeFile} from 'node:fs/promises'
import {shippedSurfaceDefinitions} from '../src/shippedSurfaceDefinitions'
import {r45SupplementalSurfaceDefinitions} from '../src/r45SurfaceCatalog'
import {parseSurfaceXml,serializeSurfaceXml,surfaceXmlAttributes,type SurfaceXmlNode} from '../src/surfaceXml'
import {phoneAppInteractionMode} from '../src/phoneAppInteractions'
const definitions=[...shippedSurfaceDefinitions(0),...r45SupplementalSurfaceDefinitions(0)]
const samples=definitions.map(d=>{
 const root=parseSurfaceXml(d.sampleXml)!;let index=0
 function patch(node:SurfaceXmlNode){
   const attrs=surfaceXmlAttributes(node.attrs)
   // Explicit QA actors, not application identity defaults. All fixtures stay
   // in the disposable saved test chat, separate from actual RP evidence.
   for(const key of ['user','author','sender','from','owner'])if(attrs[key])attrs[key]=key==='owner'?'Cerys the Dreamer':'Venue office'
   if(node===root&&['instagram-dm','x-dm','discord-dm'].includes(d.baseSurfaceId))attrs.name='Venue office'
   if(attrs.participants)attrs.participants='Venue office, Cerys the Dreamer'
   node.attrs=Object.entries(attrs).map(([key,value])=>`${key}="${value.replace(/&/g,'&amp;').replace(/"/g,'&quot;')}"`).join(' ')
   node.children=node.children.flatMap(child=>{
     if(typeof child==='string')return [child]
     // No provider dispatch from opening/rendering a QA app. Empty media slots
     // retain their contract wrappers, and generation is tested separately.
     if(child.tag==='image_request')return []
     patch(child);return [child]
   });index++
 }patch(root)
 return {id:d.baseSurfaceId,label:d.displayName,mode:phoneAppInteractionMode(d.baseSurfaceId),markup:serializeSurfaceXml(root)}
})
const directory='artifacts/phone-widget-04018';await mkdir(directory,{recursive:true})
await writeFile(`${directory}/all-apps-fixtures.txt`,'Saved phone QA fixtures — deterministic renderer integration test; no story events or image generation.\n\n'+samples.map(s=>s.markup).join('\n\n'))
await writeFile(`${directory}/all-apps-fixtures.json`,JSON.stringify(samples,null,2))
console.log(`Prepared ${samples.length} saved fixtures, ${samples.filter(s=>s.mode).length} interactive apps.`)
