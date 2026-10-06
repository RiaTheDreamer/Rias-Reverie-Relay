/** Phone-only presentation. Never alter the renderer or the authored story record. */
export const PHONE_APP_PRESENTATION_CSS=`
:host{display:flex;width:100%;height:100%;min-width:0;max-width:100%;min-height:0;flex-direction:column;container-type:inline-size;color-scheme:dark;color:#f4f1f7;overflow:hidden}
*{box-sizing:border-box}img{max-width:100%}
.rrn-editable-surface{display:block;flex:1 1 auto;width:100%;min-width:0;min-height:0;margin:0!important;overflow:auto!important;color-scheme:dark}
.rp-phone-media-status{display:flex;flex:0 0 auto;flex-direction:column;gap:6px;padding:8px 12px;background:#251923;color:#f4e9f1;border-bottom:1px solid #70425c;font:12px/1.4 system-ui,sans-serif}.rp-phone-media-status>div{display:flex;align-items:center;justify-content:space-between;gap:10px}.rp-phone-media-status button{padding:5px 10px;border:1px solid #b14d78;border-radius:999px;background:#4a1e36;color:#fff;font:inherit}
.rrn-editable-surface>section,.rrn-editable-surface>div{width:100%!important;max-width:100%!important;margin:0!important;zoom:1!important}
.rr23-igdm-phone,.rr22-im-phone,.rr22-xdm-phone,.rr22-vm-phone,.rrloc-phone,.srv54-phone,.r43story-phone,.rrn-phone,[class^="rpx-device-"],.srv2-phone,.srv2-gallery,.srv2-ddm{
 width:100%!important;max-width:100%!important;margin:0!important;padding:0!important;border:0!important;border-radius:0!important;box-shadow:none!important;min-height:0!important;height:auto!important
}
.rr23-igdm-screen,.rr22-im-screen,.rr22-vm-screen,.rrloc-screen,.srv54-screen,.rrn-phone-screen,.rpx-screen,.srv2-surface>.screen{
 border-radius:0!important;border:0!important;min-height:0!important;height:auto!important
}
.rr23-igdm-status,.rr22-im-status,.rrn-phone-top,.rpx-statusbar,.srv2-phone .status{display:none!important}
.rr23-igdm-phone::before,.rr22-im-phone::before,.rr22-xdm-phone::before,.srv54-phone::before,.r43story-phone::before,[class^="rpx-device-"]::before{display:none!important}
.dg-compact-launch-host>summary,.srv2-collapse>summary{display:none!important}
[class^="igls-shell-"],[class^="kk-shell-"],.rrmail-shell,.rr22-twitter-shell,.rr23-notes-shell,.r43ig-card,.r43tw-card,.rrt-root,.rrt-app{
 width:100%!important;max-width:100%!important;margin:0!important;border-radius:0!important;box-shadow:none!important
}
/* Tinder's source is a responsive app, not another handset nested inside this one. */
.rrt-root{display:flex!important;flex-direction:column!important;justify-content:stretch!important;width:100%!important;height:100%!important;min-height:0!important;overflow:hidden!important;background:#100e16!important;color:#f4f1f7!important}
.rrt-phone{display:flex!important;flex:1 1 auto!important;flex-direction:column!important;width:100%!important;height:100%!important;max-height:100%!important;min-height:0!important;margin:0!important;padding:0!important;border:0!important;border-radius:0!important;box-shadow:none!important;background:#100e16!important;color:#f4f1f7!important}
.rrt-profiles{position:relative!important;display:block!important;flex:1 1 auto!important;height:auto!important;min-height:0!important;overflow:auto!important;padding:0 10px 8px!important;background:#100e16!important}
.rrt-profile{inset:0 10px 8px!important;min-height:0!important}
.rrt-card{display:flex!important;flex-direction:column!important;width:100%!important;height:100%!important;min-height:0!important;background:#191721!important;color:#f4f1f7!important;border-color:#34303d!important}
.rrt-photo{flex:1 1 auto!important;width:100%!important;height:auto!important;min-height:120px!important;background:#24212c!important}
.rrt-meta{flex:0 0 auto!important;height:auto!important;min-height:0!important;max-height:34%!important;overflow:auto!important;background:#191721!important;color:#f4f1f7!important;border-color:#34303d!important}
.rrt-root .rrt-top,.rrt-root .rrt-top *{color-scheme:dark}
@container(max-width:440px){
 .rrmail-layout,.rr23-notes-shell,.rr22-ws-shell,.rrdc-shell{grid-template-columns:minmax(0,1fr)!important}
 .rrmail-folders,.rr23-notes-side,.rr22-ws-side,.rrdc-servers,.rrdc-chans{max-width:100%!important;min-width:0!important}
 .rrmail-folders,.rr23-notes-side,.rr22-ws-side{max-height:150px;overflow:auto}
}
.rr23-igdm,.rr22-im,.rr22-xdm,.srv2,.srv2-collapse,.srv2-surface,.rr23-igdm-phone,.rr22-im-phone,.rr22-xdm-phone,.srv2-collapse>div,.srv2-surface>.screen{height:100%!important;min-height:0!important}
.rr23-igdm-screen,.rr23-igdm-phone,.rr22-im-phone,.rr22-xdm-phone,.srv2-surface>.screen{display:flex!important;flex-direction:column!important;overflow:hidden;height:100%!important;flex:1;min-height:0!important}
.rr23-igdm-chat,.rr22-im-feed,.rr22-xdm-feed,.srv2-chat,.srv2-ddm .msgs{flex:1!important;min-height:0!important;overflow:auto!important}
.rr23-igdm-head,.rr22-im-head,.rr22-xdm-head,.srv2 .head{flex-shrink:0}
.rrn-editable-surface,.rrn-editable-surface>.rr23-igdm,.rrn-editable-surface>.rr22-im,.rrn-editable-surface>.rr22-xdm{height:100%!important}
`

/** Re-theme only light UI surfaces in the isolated phone app. Media pixels and authored accent colors stay intact. */
export function applyPhoneAppDarkTheme(root:ShadowRoot):void{
 const view=root.host.ownerDocument.defaultView
 if(!view)return
 const parse=(value:string)=>{const match=/rgba?\(\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)(?:\s*,\s*(\d+(?:\.\d+)?))?\s*\)/i.exec(value);return match?{r:Number(match[1]),g:Number(match[2]),b:Number(match[3]),a:match[4]===undefined?1:Number(match[4])}:null}
 const luminance=({r,g,b}:NonNullable<ReturnType<typeof parse>>)=>{const channel=(value:number)=>{const n=value/255;return n<=.04045?n/12.92:((n+.055)/1.055)**2.4};return .2126*channel(r)+.7152*channel(g)+.0722*channel(b)}
 const hsl=({r,g,b}:NonNullable<ReturnType<typeof parse>>)=>{r/=255;g/=255;b/=255;const max=Math.max(r,g,b),min=Math.min(r,g,b),delta=max-min;let h=0;const l=(max+min)/2;let s=0;if(delta){s=delta/(1-Math.abs(2*l-1));if(max===r)h=60*(((g-b)/delta)%6);else if(max===g)h=60*((b-r)/delta+2);else h=60*((r-g)/delta+4)}return {h:(h+360)%360,s,l}}
 const mutedBackground=(color:NonNullable<ReturnType<typeof parse>>)=>{const tone=hsl(color);return tone.s<.16?'#191721':`hsl(${Math.round(tone.h)} ${Math.round(Math.min(34,tone.s*100))}% 17%)`}
 const readableText=(color:NonNullable<ReturnType<typeof parse>>)=>{const tone=hsl(color);return tone.s>.24?`hsl(${Math.round(tone.h)} ${Math.round(Math.min(78,Math.max(42,tone.s*100)))}% 76%)`:'#f4f1f7'}
 const excluded=new Set(['IMG','SVG','VIDEO','PICTURE','CANVAS','IFRAME'])
 const control=root.querySelector<HTMLElement>('.rp-app-discussion')
 for(const element of Array.from(root.querySelectorAll<HTMLElement>('*'))){
  if(excluded.has(element.tagName)||element.closest('.rp-app-discussion,.rp-phone-composer,.rp-phone-responder,.rp-phone-bubble,.rp-conversations,.rp-conversation-trigger'))continue
  const style=view.getComputedStyle(element),background=parse(style.backgroundColor),foreground=parse(style.color)
  const light=Boolean(background&&background.a>.08&&luminance(background)>.55)
  const parentLight=Boolean(element.parentElement?.closest('[data-reverie-phone-darkened="true"]'))
  if(light){element.dataset.reveriePhoneDarkened='true';element.style.setProperty('background-color',mutedBackground(background!), 'important')}
  if((light||parentLight)&&foreground&&luminance(foreground)<.19)element.style.setProperty('color',readableText(foreground),'important')
 }
 if(control)control.dataset.reveriePhoneControls='true'
}
