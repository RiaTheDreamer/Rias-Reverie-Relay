// @ts-nocheck -- Bun asset generator, like the other scripts; production modules remain strict.
/** Generated display packs reuse native chrome; preserve matcher, IDs and host settings. */
import {readFileSync,writeFileSync} from 'node:fs'
import {amazonShell,amazonSurfacePresentation} from '../src/amazonSurface'
const definitionPath='src/amazonDefinition.ts',definition=readFileSync(definitionPath,'utf8')
if(!/^export const AMAZON_UTILITY = .+$/m.test(definition))throw new Error('Amazon Utility export anchor missing')
writeFileSync(definitionPath,definition.replace(/^export const AMAZON_UTILITY = .+$/m,()=>`export const AMAZON_UTILITY = ${JSON.stringify(readFileSync('assets/Amazon-Utility.txt','utf8').replace(/\r\n/g,'\n'))}`))
const shell=amazonShell('$1','$2','$3','$4','$5','<p class="amz-no-orders">No established orders in this snapshot.</p>$6','<h3>Current catalog</h3><p>$2</p><hr><h3>Delivery</h3><p>$4</p><small>Use the Phone app for saved cart and wishlist actions.</small>')
for(const mode of ['Inline','Collapsible']){
  const path=`regex-packs/Amazon/Reverie-Amazon-${mode}.json`,pack=JSON.parse(readFileSync(path,'utf8')),script=pack.scripts[0]
  script.replace_string=amazonSurfacePresentation(shell,'Open Amazon',mode==='Inline'?'inline':'plain')
  script.metadata.visual_revision='amazon-brand-20261015'
  writeFileSync(path,JSON.stringify(pack,null,2)+'\n')
}
