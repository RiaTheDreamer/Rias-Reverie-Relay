import { SHIPPED_SURFACE_SPECS } from './shippedSurfaceDefinitions'
import { completeSurfaceSpecs, surfaceRootAliases, parseSurfaceXml, xmlChildren, surfaceXmlAttributes } from './surfaceXml'
import { albumPresentation, dossierPresentation, sharedSurfaceLauncher } from './surfacePresentation'

export type SurfaceRegexTransform = { name: string; find: string; replace: string; flags: string; order: number }
const escaped = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
export function surfaceNormalizationRegexScripts(): SurfaceRegexTransform[] {
  const scripts: SurfaceRegexTransform[] = []
  const seen = new Set<string>()
  const push = (name: string, find: string, replace: string, repeat = false) => { const key = `${find}:${replace}`; if (!repeat && seen.has(key)) return; seen.add(key); scripts.push({ name, find, replace, flags: 'gi', order: -1000 + scripts.length / 1000 }) }
  for (const spec of completeSurfaceSpecs(SHIPPED_SURFACE_SPECS)) {
    for (const alias of surfaceRootAliases(spec).filter(alias => alias !== spec.wrapper)) push(`Normalize ${spec.id} root`, `<(/?)${escaped(alias)}(?=[\\s>])`, `<$1${spec.wrapper}`)
    for (const [alias, canonical] of Object.entries(spec.normalization?.childAliases || {})) push(`Normalize ${spec.id} child`, `<(/?)${escaped(alias)}(?=[\\s>])`, `<$1${canonical}`)
    const tree = parseSurfaceXml(spec.sampleXml || '')
    if (tree) {
      const keys = Object.keys(surfaceXmlAttributes(tree.attrs))
      const optional = new Set(spec.normalization?.optionalMeta || [])
      const capture = (key: string) => optional.has(key) ? `(?:(?=[^>]*\\b${key}="([^"]*)")|(?![^>]*\\b${key}=))` : `(?=[^>]*\\b${key}="([^"]+)")`
      if (keys.length) push(`Normalize ${spec.id} optional metadata`, `<${spec.wrapper}\\b${keys.map(capture).join('')}(?:\\s+(?:${keys.map(escaped).join('|')})="[^"]*")*\\s*>`, `<${spec.wrapper}${keys.map((key,i) => ` ${key}="$${i+1}"`).join('')}>`)
      const walk = (node: typeof tree) => {
        for (const child of xmlChildren(node!)) {
          for (const alias of [child.tag.replace(/_/g,'-'),child.tag.replace(/_/g,'')].filter(alias=>alias!==child.tag)) push(`Normalize ${spec.id} nested child`, `<(/?)${escaped(alias)}(?=[\\s>])`, `<$1${child.tag}`)
          walk(child)
        }
      }
      walk(tree)
    }
  }
  push('Normalize Smartphone battery percent', '(<smart_phone\\b[^>]*\\bbattery=")\\s*(-?\\d+(?:\\.\\d+)?)\\s*%*\\s*(")', '$1$2$3')
  push('Clamp negative Smartphone battery', '(<smart_phone\\b[^>]*\\bbattery=")-\\d+(?:\\.\\d+)?(")', '$10$2')
  push('Clamp Smartphone battery range', '(<smart_phone\\b[^>]*\\bbattery=")(?:100\\.\\d+|1(?:0[1-9]|[1-9][0-9])(?:\\.\\d+)?|[2-9][0-9]{2}(?:\\.\\d+)?|[0-9]{4,}(?:\\.\\d+)?)(")', '$1100$2')
  push('Repair Smartphone missing messages wrapper', '(<smart_phone\\b[^>]*>)(\\s*(?:<(?:s_recv|s_sent|s_img|image_request)\\b[^>]*>[\\s\\S]*?</(?:s_recv|s_sent|s_img|image_request)>\\s*)+)(</smart_phone>)', '$1<notifications></notifications><contact></contact><messages>$2</messages><info></info>$3')
  for (let pass = 0; pass < 8; pass++) push('Clean Dossier encoded metadata markup', '(<case_file\\b[^>]*?)(?:&lt;/?span(?:\\s[\\s\\S]*?)?&gt;)', '$1', true)
  push('Normalize Character Profile portrait wrapper', '(<character_profile\\b[^>]*>\\s*)<media>([\\s\\S]*?)</media>', '$1<portrait>$2</portrait>')
  push('Album title before artwork', '(<album_cover\\b[^>]*>)([\\s\\S]*?)(<title>[^<]*</title>)([\\s\\S]*?</album_cover>)', '$1$3$2$4')
  return scripts
}
export function correctedSurfaceRegexScripts(mode: 'inline' | 'collapsible'): SurfaceRegexTransform[] {
  const wrap = (body: string, label: string) => mode === 'collapsible' ? sharedSurfaceLauncher(body, label) : body
  const optional = (name: string) => `(?:(?=[^>]*\\b${name}="([^"]*)")|(?![^>]*\\b${name}=))`
  const album = albumPresentation({ title: '$1', artist: '$2', release: '$3', art: '$4' })
  const dossier = dossierPresentation({ key: 'regex-{{lastMessageId}}-$1', subject: '$2', meta: '$1 · $3 · $5 · $6', media: '$7', facts: '$8', evidence: '$9', timeline: '$10', notes: '$11' }).replace(/regex---lastMessageId---/g, 'regex-{{lastMessageId}}')
  return [
    { name: 'Dossier readable facts', find: `<cf_fact\\b${optional('label')}${optional('value')}[^>]*>([\\s\\S]*?)</cf_fact>`, replace: '<div class="rrn-case-fact"><small>$1</small><b>$2$3</b></div>', flags: 'gi', order: 3900 },
    { name: 'Album music release', find: '<album_cover\\b[^>]*>\\s*(?:<title>\\s*([\\s\\S]*?)\\s*</title>\\s*)?(?:<artist>\\s*([\\s\\S]*?)\\s*</artist>\\s*)?(?:<release>\\s*([\\s\\S]*?)\\s*</release>\\s*)?([\\s\\S]*?)</album_cover>', replace: wrap(album, 'Music release'), flags: 'gi', order: 3901 },
    { name: 'Case dossier with functional tabs', find: `<case_file\\b${['case','subject','status','last_seen','risk','agent'].map(optional).join('')}[^>]*>\\s*(?:<cf_tab>[^<]*</cf_tab>\\s*)*<cf_sheet>\\s*<cf_media>([\\s\\S]*?)</cf_media>\\s*<cf_facts>([\\s\\S]*?)</cf_facts>\\s*</cf_sheet>\\s*(?:<cf_evidence>([\\s\\S]*?)</cf_evidence>\\s*)?(?:<cf_timeline>([\\s\\S]*?)</cf_timeline>\\s*)?(?:<details>\\s*<summary>[^<]*</summary>\\s*)?(?:<cf_notes>([\\s\\S]*?)</cf_notes>\\s*)?(?:</details>\\s*)?</case_file>`, replace: wrap(dossier, 'Case dossier'), flags: 'gi', order: 3902 },
  ]
}
