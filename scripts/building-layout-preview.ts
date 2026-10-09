// @ts-nocheck -- Bun-only local visual acceptance fixture; no host/provider calls.
import { readFileSync } from 'node:fs'
import { renderNativeSurfaceMarkup } from '../src/nativeSurfaces'
import { r45SupplementalSurfaceDefinitions } from '../src/r45SurfaceCatalog'
const source = readFileSync(new URL('./fixtures/building-layout-legacy.txt', import.meta.url), 'utf8').replace(/\[(\/?)([a-z_]+)\]/g, '<$1$2>').replace(/<move_text>[\s\S]*?<\/move_text>/g, '')
const definitions = r45SupplementalSurfaceDefinitions(1)
const firstId = /<image_request id="([^"]+)"/.exec(source)![1]
const studio = { definitions: Object.fromEntries(definitions.map(row => [row.surfaceId, row])), activePresetIds: {}, collectionPresets: {}, defaultShellMode: 'inline', colorMode: 'realistic', rendererMode: 'relay' } as any
const markup = renderNativeSurfaceMarkup(source, studio, { chatId: 'preview', messageId: 'preview', swipeId: 0, autoGenerate: false, records: [{ requestId: firstId, slot: firstId, target: 'custom.artifact-media', messageId: 'preview', swipeId: 0, status: 'completed', imageUrl: '/room.svg' }] }).content
const navigation = await Bun.build({ entrypoints: ['src/buildingLayout.ts'], target: 'browser', write: false })
if (!navigation.success) throw new Error('Preview navigation bundle failed.')
const html = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Building Layout acceptance preview</title><style>body{margin:0;padding:18px;background:#0b090b;color:#eee;font-family:system-ui;--lumiverse-primary:#e66b9e}main{max-width:1080px;margin:auto}.bl-media img:not([data-dgir-request-id]){display:none}.rrn-source-editors{display:none}</style></head><body><main><p>Local visual fixture · one completed room, seven pending · no provider or lorebook writes</p>${markup}</main><script type="module">import {handleBuildingLayoutNavigation} from '/navigation.js';document.addEventListener('click',event=>{const button=event.target.closest('[data-rrn-action]');if(button){if(handleBuildingLayoutNavigation(button))event.preventDefault();else if(button.dataset.rrnAction==='building-lorebook'){button.textContent='Preview only — no writes';}}});</script></body></html>`
const room = '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600"><rect width="800" height="600" fill="#c6b6a0"/><path d="M0 0h800L610 330H160Z" fill="#e2d7c5"/><path d="M0 600h800L610 330H160Z" fill="#ac9984"/><path d="M160 0v330h450V0" fill="#f0e6d5"/><rect x="195" y="50" width="160" height="240" fill="#495756"/><path d="M440 330h150v-25H465v-25h125v-25H490v-25h100v-25H515v-25h75v-25h-50V60h20v120" fill="none" stroke="#493429" stroke-width="18"/><ellipse cx="175" cy="365" rx="30" ry="12" fill="#523d34"/><path d="M175 350V230" stroke="#4d4d30" stroke-width="7"/><ellipse cx="170" cy="215" rx="46" ry="61" fill="#567045"/></svg>'
const server = Bun.serve({ hostname: '127.0.0.1', port: 0, fetch(request) {
  const path = new URL(request.url).pathname
  if (path === '/room.svg') return new Response(room, { headers: { 'Content-Type': 'image/svg+xml' } })
  if (path === '/navigation.js') return new Response(navigation.outputs[0], { headers: { 'Content-Type': 'text/javascript' } })
  if (path === '/mobile') return new Response('<!doctype html><title>390px mobile preview</title><body style="background:#090709;margin:0"><iframe title="Mobile atlas" src="/" style="width:390px;height:1450px;border:0;display:block;margin:auto"></iframe>', { headers: { 'Content-Type': 'text/html' } })
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
} })
console.log(`Building Layout preview: ${server.url} (mobile: /mobile). Ctrl+C stops the local preview.`)
