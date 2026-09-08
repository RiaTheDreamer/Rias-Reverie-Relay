// Requested mobile layout adjustment. The approved assets stay intact; both
// the Relay adapter and managed Regex installation apply this same revision.
export const SCENE_COMPASS_LAYOUT_CSS = `
.rr-scene-compass .r65-card{display:grid;grid-template-columns:minmax(0,2fr) minmax(0,3fr);gap:10px;align-items:start}
.rr-scene-compass .r65-head{grid-column:1/-1;min-width:0}
.rr-scene-compass .r65-card>.r65-gap{margin-top:0;min-width:0}
.rr-scene-compass .r65-card>.r65-grid2{grid-column:1/-1;grid-template-columns:repeat(2,minmax(0,1fr))}
.rr-scene-compass .r65-title,.rr-scene-compass .r65-k,.rr-scene-compass .r65-box p{overflow-wrap:anywhere}
.rr-scene-compass .r65-box{padding:9px 10px}
.rr-scene-compass .r65-media{align-self:start;aspect-ratio:16/9;min-height:0}
.rr-scene-compass .r65-media .rrl-island{position:absolute;inset:0;width:100%;height:100%;margin:0}
.rr-scene-compass .r65-media .rrl-card{position:absolute;inset:0;width:100%;height:100%;min-height:0;padding:0;border:0;border-radius:inherit;display:block;box-shadow:none}
.rr-scene-compass .r65-media .rrl-media-slot{position:absolute;inset:0;width:100%;height:100%;border:0;border-radius:inherit}
.rr-scene-compass .r65-media .rrl-main{position:absolute;z-index:2;left:0;right:0;bottom:27px;padding:3px 5px;background:#170d19eF;gap:4px}
.rr-scene-compass .r65-media .rrl-icon{flex:0 0 14px;width:14px;height:14px;border:0;background:none}
.rr-scene-compass .r65-media .rrl-spinner{width:11px;height:11px}
.rr-scene-compass .r65-media .rrl-copy{display:block;overflow:hidden}
.rr-scene-compass .r65-media .rrl-title,.rr-scene-compass .r65-media .rrl-status:before,.rr-scene-compass .r65-media .rrl-stream-status,.rr-scene-compass .r65-media .rrl-detail,.rr-scene-compass .r65-media .rrl-media-skeleton:before{display:none}
.rr-scene-compass .r65-media .rrl-status{padding:0;border:0;font-size:9px}
.rr-scene-compass .r65-media .rrl-actions{position:absolute;z-index:3;left:0;right:0;bottom:0;height:27px;display:flex;justify-content:flex-start;overflow-x:auto;gap:4px;padding:2px 4px;background:#170d19;scrollbar-width:none}
.rr-scene-compass .r65-media .rrl-actions button{flex:0 0 auto;min-height:23px;padding:3px 5px;font-size:9px}
.rr-scene-compass .r65-media .rrl-preview-badge{top:3px;bottom:auto;right:3px;font-size:8px}
.rr-scene-compass .r65-media .rrl-card[data-rrn-live-status="completed"] .rrl-main{display:none}
@media(max-width:600px){.rr-scene-compass .r65-card{padding:10px;gap:8px}.rr-scene-compass .r65-title{font-size:14px}.rr-scene-compass .r65-box{padding:8px}.rr-scene-compass .r65-box p{font-size:11px;line-height:1.45}.rr-scene-compass .r65-box small{margin-bottom:4px;letter-spacing:.05em}}
`

export function sceneCompassPresentation(scriptId: string, replacement: string): string {
  if (scriptId !== 'reverie_scene_tracker_images_v1') return replacement
  return replacement.replace('</style>', `${SCENE_COMPASS_LAYOUT_CSS}</style>`)
    .replace('<details class="r65"', '<details class="r65 rr-scene-compass"')
}
