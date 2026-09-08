import { normalizeSurfaceDocument, plainSurfaceText, completeSurfaceSpecs, residualSurfaceTags } from './surfaceXml'
import { albumPresentation, dossierPresentation, GALLERY_FULL_IMAGE_CSS } from './surfacePresentation'
import { normalizeBracketSurfaceDocument } from './bracketSurfaceBridge'

import type { CustomSurfaceDefinition, CustomSurfaceStudioState, SurfaceColorMode, SurfaceRendererMode, SurfaceShellMode } from './contracts'
import { hybridSurfaceOwner, SHIPPED_SURFACE_BY_ID, SHIPPED_SURFACE_SPECS, type ShippedSurfaceSpec } from './shippedSurfaceDefinitions'
import { containsRenderedRegexSurface, renderRegexSurfaceParity, type RegexSurfaceParityMode } from './regexSurfaceParity'
import { R45_SUPPLEMENTAL_ROOTS } from './r45SurfaceCatalog'
import { isSlotLifecycleActive } from './slotLifecycle'

export type NativeSurfaceRenderContext = {
  chatId: string
  messageId?: string
  swipeId?: number
  isUser?: boolean
  suppressLifecycleCards?: boolean
  autoGenerate?: boolean
  /** Assigned once per root in a streamed message so re-renders replace the
   * same DOM island instead of appending duplicate Surface cards. */
  streamIslandOrdinal?: number
  defaultShellMode?: SurfaceShellMode
  colorMode?: SurfaceColorMode
  rendererMode?: SurfaceRendererMode
  records?: Array<{
    key?: string
    requestId: string
    messageId?: string
    swipeId?: number
    status: string
    error?: string
    imageUrl?: string
    imageId?: string
    pendingPlacement?: { imageUrl?: string; imageId?: string }
    target?: string
    slot?: string
    alt?: string
    caption?: string
    time?: string
    requestAspect?: string
  }>
}

export type NativeSurfaceRenderResult = {
  content: string
  renderedCount: number
  renderedSurfaceIds: string[]
}

const STYLE_MARKER = 'data-reverie-native-surface-style="release"'

const NATIVE_SURFACE_CSS = `<style ${STYLE_MARKER}>
.rrn-root{--rrn-accent:var(--lumiverse-primary,#c24b78);--rrn-bg:color-mix(in srgb,var(--lumiverse-bg-deep,#150a11) 92%,#000);--rrn-panel:color-mix(in srgb,var(--lumiverse-bg-elevated,#24131d) 86%,var(--rrn-accent) 14%);--rrn-border:color-mix(in srgb,var(--rrn-accent) 34%,transparent);--rrn-text:var(--lumiverse-text-primary,#f7eaf0);--rrn-muted:var(--lumiverse-text-secondary,#c8aeb9);font-family:var(--lumiverse-font-family,system-ui,-apple-system,"Segoe UI",sans-serif);color:var(--rrn-text);width:min(100%,var(--rrn-width,760px));margin:8px auto;box-sizing:border-box}.rrn-root *{box-sizing:border-box}.rrn-shell{position:relative;border:1px solid var(--rrn-border);border-radius:20px;background:linear-gradient(155deg,color-mix(in srgb,var(--rrn-panel) 96%,transparent),color-mix(in srgb,var(--rrn-bg) 96%,transparent));box-shadow:0 18px 48px rgba(0,0,0,.34),inset 0 1px rgba(255,255,255,.05);overflow:hidden}.rrn-shell:before{content:"";position:absolute;inset:0;pointer-events:none;background:radial-gradient(circle at 85% 0,color-mix(in srgb,var(--rrn-accent) 14%,transparent),transparent 36%),linear-gradient(115deg,transparent 0 46%,rgba(255,255,255,.025) 47% 48%,transparent 49%)}.rrn-shell>summary{position:relative;display:flex;align-items:center;gap:10px;min-height:48px;padding:12px 15px;cursor:pointer;list-style:none;border-bottom:1px solid transparent;font-weight:750;letter-spacing:.04em}.rrn-shell>summary::-webkit-details-marker{display:none}.rrn-shell[open]>summary{border-bottom-color:var(--rrn-border)}.rrn-shell>summary:after{content:"⌄";margin-left:auto;color:var(--rrn-muted);transition:transform .22s ease}.rrn-shell[open]>summary:after{transform:rotate(180deg)}.rrn-inline>.rrn-body,.rrn-shell[open]>.rrn-body{display:block}.rrn-body{position:relative;padding:14px}.rrn-collapsible>.rrn-body{display:none}.rrn-kicker{font-size:11px;text-transform:uppercase;letter-spacing:.18em;color:color-mix(in srgb,var(--rrn-accent) 78%,white);font-weight:800}.rrn-title{font-family:Georgia,"Times New Roman",serif;font-size:clamp(18px,3vw,25px);line-height:1.15;margin:3px 0 8px}.rrn-sub{font-size:12px;color:var(--rrn-muted)}.rrn-grid{display:grid;gap:12px}.rrn-grid-2{grid-template-columns:repeat(auto-fit,minmax(min(260px,100%),1fr))}.rrn-card{position:relative;border:1px solid color-mix(in srgb,var(--rrn-border) 72%,transparent);border-radius:15px;background:color-mix(in srgb,var(--rrn-bg) 72%,transparent);padding:12px;min-width:0}.rrn-media{position:relative;width:100%;border-radius:14px;overflow:hidden;background:#0b0709;border:1px solid var(--rrn-border);display:grid;place-items:center;min-height:180px}.rrn-media img{display:block;max-width:100%;width:100%;height:auto;object-fit:var(--rrn-fit,contain)}.rrn-media[data-aspect="1:1"]{aspect-ratio:1/1}.rrn-media[data-aspect="4:5"]{aspect-ratio:4/5}.rrn-media[data-aspect="3:4"]{aspect-ratio:3/4}.rrn-media[data-aspect="16:9"]{aspect-ratio:16/9}.rrn-media[data-aspect="9:16"]{aspect-ratio:9/16}.rrn-media[data-aspect="2:3"]{aspect-ratio:2/3}.rrn-media img{height:100%}.rrn-card[data-rrn-native-request]{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:6px;padding:5px 7px;border-radius:10px;min-height:42px;max-width:660px;margin-inline:auto}.rrn-pending{display:flex;align-items:center;gap:9px;min-width:0;padding:0}.rrn-pending-icon{width:24px;height:24px;flex:0 0 24px;border-radius:8px;display:grid;place-items:center;border:1px solid var(--rrn-border);background:color-mix(in srgb,var(--rrn-accent) 14%,transparent);font-size:14px}.rrn-pending-copy{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:3px 8px;min-width:0;flex:1}.rrn-pending strong{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:Georgia,"Times New Roman",serif;font-size:12px;line-height:1.2}.rrn-status{display:inline-flex;align-items:center;gap:6px;padding:2px 6px;border-radius:999px;border:1px solid var(--rrn-border);font-size:9px;color:var(--rrn-muted);white-space:nowrap}.rrn-status:before{content:"";width:6px;height:6px;border-radius:50%;background:var(--rrn-accent);box-shadow:0 0 9px var(--rrn-accent)}.rrn-lifecycle-detail{grid-column:1/-1;margin:0}.rrn-lifecycle-detail>summary{cursor:pointer;list-style:none;color:var(--rrn-muted);font-size:10px;padding-left:35px}.rrn-lifecycle-detail>summary::-webkit-details-marker{display:none}.rrn-lifecycle-detail>summary:before{content:"Details"}.rrn-lifecycle-detail[open]>summary:before{content:"Hide details"}.rrn-lifecycle-detail p{margin:6px 0 0;padding:7px 9px;border-radius:9px;background:rgba(0,0,0,.14);color:var(--rrn-muted);font-size:11px;line-height:1.42;max-height:7.1em;overflow:auto}.rrn-actions{display:flex;flex-wrap:nowrap;justify-content:flex-end;gap:5px;margin:0}.rrn-actions button{appearance:none;border:1px solid var(--rrn-border);border-radius:9px;background:color-mix(in srgb,var(--rrn-panel) 82%,transparent);color:var(--rrn-text);padding:4px 7px;min-height:26px;font:inherit;font-size:9px;font-weight:700;cursor:pointer;white-space:nowrap}.rrn-actions button:hover{background:color-mix(in srgb,var(--rrn-accent) 18%,var(--rrn-panel))}.rrn-actions button[data-rrn-action="delete"]{color:#ffb8c7;border-color:rgba(255,92,127,.35)}.rrn-actions .rrn-secondary-action{display:none}.rrn-parity-slot-pending{display:flex;align-items:center;justify-content:center;min-height:44px;padding:8px 10px;border:1px dashed color-mix(in srgb,var(--rrn-accent) 30%,transparent);border-radius:10px;color:var(--rrn-muted);font-size:10px;background:color-mix(in srgb,var(--rrn-accent) 6%,transparent)}.rrn-row{display:flex;align-items:flex-start;gap:10px}.rrn-avatar{flex:0 0 38px;width:38px;height:38px;border-radius:50%;display:grid;place-items:center;background:linear-gradient(135deg,color-mix(in srgb,var(--rrn-accent) 35%,#1a1016),#0d090c);border:1px solid var(--rrn-border);font-weight:800}.rrn-copy{min-width:0;flex:1}.rrn-copy p{margin:.25em 0;line-height:1.48}.rrn-meta{display:flex;flex-wrap:wrap;gap:5px 9px;align-items:center;font-size:11px;color:var(--rrn-muted)}.rrn-chip{display:inline-flex;padding:4px 8px;border-radius:999px;background:color-mix(in srgb,var(--rrn-accent) 12%,transparent);border:1px solid color-mix(in srgb,var(--rrn-accent) 24%,transparent);font-size:11px}.rrn-tabs{display:flex;gap:6px;overflow:auto;padding:2px 0 9px}.rrn-tab{padding:6px 10px;border-radius:999px;border:1px solid var(--rrn-border);white-space:nowrap;font-size:12px;color:var(--rrn-muted)}.rrn-post,.rrn-message,.rrn-note,.rrn-comment{border-top:1px solid color-mix(in srgb,var(--rrn-border) 55%,transparent);padding:11px 0}.rrn-post:first-child,.rrn-message:first-child,.rrn-note:first-child,.rrn-comment:first-child{border-top:0}.rrn-bubble{display:inline-block;max-width:min(82%,560px);padding:9px 11px;border-radius:15px;background:color-mix(in srgb,var(--rrn-panel) 88%,transparent);line-height:1.44}.rrn-bubble.is-sent{margin-left:auto;background:color-mix(in srgb,var(--rrn-accent) 28%,var(--rrn-panel))}.rrn-message{display:flex;gap:8px;align-items:flex-end}.rrn-message.is-sent{justify-content:flex-end}.rrn-phone{max-width:430px;margin:auto;border:2px solid color-mix(in srgb,var(--rrn-border) 90%,transparent);border-radius:30px;background:#09070a;padding:8px}.rrn-phone-screen{border-radius:23px;overflow:hidden;background:linear-gradient(180deg,#1c1018,#0d090c);padding:12px}.rrn-phone-top{display:flex;justify-content:space-between;font-size:12px;color:var(--rrn-muted);padding:2px 3px 10px}.rrn-ig-head,.rrn-tw-head,.rrn-kakao-head{display:flex;align-items:center;gap:10px;padding-bottom:10px}.rrn-caption{font-size:14px;line-height:1.5;margin:11px 0}.rrn-trend{display:flex;justify-content:space-between;gap:10px;padding:9px;border-radius:12px;background:color-mix(in srgb,var(--rrn-panel) 58%,transparent);margin:6px 0}.rrn-reactions{display:flex;gap:10px;color:var(--rrn-muted);font-size:12px;margin-top:8px}.rrn-document{font-family:Georgia,"Times New Roman",serif;background:linear-gradient(145deg,#f2e5d2,#d8c3aa);color:#301c20;border-color:rgba(80,30,45,.28)}.rrn-document .rrn-body{padding:clamp(18px,4vw,34px)}.rrn-document .rrn-sub,.rrn-document .rrn-meta{color:#765b58}.rrn-document .rrn-card{background:rgba(255,255,255,.34);border-color:rgba(80,30,45,.18)}.rrn-evidence{background:linear-gradient(145deg,#111419,#08090c);--rrn-accent:#d06b74}.rrn-magazine{background:linear-gradient(145deg,#25101e,#0d070b);--rrn-accent:#f55e9b}.rrn-album{background:linear-gradient(145deg,#151029,#090712);--rrn-accent:#a87cff}.rrn-polaroid .rrn-media{padding:10px 10px 42px;background:#f5efe5;border-radius:4px}.rrn-photostrip .rrn-media{max-width:330px;margin:auto;background:#f2e7dc;padding:12px;border-radius:5px}.rrn-youtube{--rrn-accent:#ff345d}.rrn-carousel{display:grid;grid-auto-flow:column;grid-auto-columns:minmax(82%,1fr);gap:10px;overflow-x:auto;scroll-snap-type:x mandatory;padding-bottom:6px}.rrn-carousel>*{scroll-snap-align:center}.rrn-link{display:block;text-decoration:none;color:inherit;border:1px solid var(--rrn-border);border-radius:13px;padding:11px;margin:9px 0;background:color-mix(in srgb,var(--rrn-panel) 74%,transparent)}.rrn-file{display:flex;align-items:center;gap:9px;padding:9px;border:1px dashed var(--rrn-border);border-radius:12px;margin-top:8px}.rrn-quote{border-left:3px solid var(--rrn-accent);padding-left:10px}.rrn-compact .rrn-body{padding:10px}.rrn-spacious .rrn-body{padding:22px}.rrn-error{border-color:rgba(255,95,125,.45);--rrn-accent:#ff5f7d}.rrn-card[data-rrn-live-status="generating"] .rrn-status:before,.rrn-card[data-rrn-live-status="parsing"] .rrn-status:before{animation:rrnPulse 1.1s ease-in-out infinite}.rrn-card[data-rrn-live-status="generating"] .rrn-pending-icon{animation:rrnSpin 1.8s linear infinite}.rrn-card[data-rrn-live-status="completed"] .rrn-status:before{background:#62d69c;box-shadow:0 0 12px #62d69c}.rrn-card[data-rrn-live-status="failed"] .rrn-status:before,.rrn-card[data-rrn-live-status="image-unavailable"] .rrn-status:before{background:#ff5f7d;box-shadow:0 0 12px #ff5f7d}@keyframes rrnPulse{0%,100%{opacity:.42;transform:scale(.82)}50%{opacity:1;transform:scale(1.2)}}@keyframes rrnSpin{to{transform:rotate(360deg)}}.rrn-hidden-source{display:none!important}.rrn-inline-lifecycle{width:100%;margin:10px 0}.rrn-inline-lifecycle>.rrn-card{background:color-mix(in srgb,var(--rrn-bg) 92%,transparent)}.rrn-inline-lifecycle .rrn-pending{min-height:0;padding:0}.rrn-inline-lifecycle .rrn-lifecycle-detail p{font-size:11px}.rrn-twitter{max-width:620px;margin:0 auto;border:1px solid color-mix(in srgb,var(--rrn-border) 76%,transparent);border-radius:18px;overflow:hidden;background:#000;color:#eff3f4}.rrn-twitter-nav{display:flex;align-items:center;gap:0;border-bottom:1px solid #2f3336;background:#000;overflow-x:auto}.rrn-twitter-nav span{flex:1;min-width:92px;padding:12px 10px;text-align:center;color:#71767b;font-size:12px;font-weight:700}.rrn-twitter-nav span:first-child{color:#eff3f4;box-shadow:inset 0 -3px #1d9bf0}.rrn-twitter-feed{background:#000}.rrn-tweet{padding:14px 15px;border-bottom:1px solid #2f3336;background:#000}.rrn-tweet:last-child{border-bottom:0}.rrn-tweet-grid{display:grid;grid-template-columns:44px minmax(0,1fr);gap:10px}.rrn-tweet .rrn-avatar{width:44px;height:44px;flex-basis:44px;border-color:#2f3336;background:#202327}.rrn-tweet-head{display:flex;align-items:center;gap:4px;min-width:0;font-size:14px}.rrn-tweet-head b{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.rrn-tweet-head span,.rrn-tweet-head time{color:#71767b;white-space:nowrap}.rrn-tweet-text{margin-top:3px;color:#eff3f4;font-size:15px;line-height:1.38;overflow-wrap:anywhere}.rrn-tweet .rrn-media{margin-top:10px;border-color:#2f3336;border-radius:16px;background:#000;min-height:0}.rrn-tweet .rrn-media img{object-fit:cover}.rrn-tweet-actions{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;margin-top:10px;color:#71767b;font-size:12px}.rrn-tweet-actions span{display:flex;align-items:center;gap:5px}.rrn-twitter-comments{margin-top:10px;border-top:1px solid #2f3336}.rrn-twitter-comments>summary{list-style:none;cursor:pointer;padding:11px 0;color:#1d9bf0;font-size:13px;font-weight:700}.rrn-twitter-comments>summary::-webkit-details-marker{display:none}.rrn-twitter-comments>summary:before{content:"Show replies"}.rrn-twitter-comments[open]>summary:before{content:"Hide replies"}.rrn-twitter-comments .rrn-comment{padding:12px 0;border-top:1px solid #2f3336}.rrn-twitter-comments .rrn-comment:first-of-type{border-top:0}.rrn-twitter-comments .rrn-meta{color:#71767b}.rrn-twitter-comments .rrn-meta b{color:#eff3f4}.rrn-twitter-empty{padding:28px;text-align:center;color:#71767b}.rrn-twitter-trends{padding:12px 15px;border-top:1px solid #2f3336}.rrn-twitter-trends .rrn-trend{background:#16181c;border:0}
@media(max-width:560px){.rrn-root{margin:8px auto}.rrn-card[data-rrn-native-request]{grid-template-columns:minmax(0,1fr) auto;padding:5px 6px}.rrn-actions{justify-content:flex-end;max-width:46vw;overflow-x:auto}.rrn-actions button{min-height:26px;padding:4px 6px;font-size:8px}.rrn-pending-copy{grid-template-columns:minmax(0,1fr) auto}.rrn-lifecycle-detail>summary{padding-left:32px}.rrn-body{padding:11px}.rrn-media{min-height:140px}.rrn-title{font-size:19px}}
.rrn-editable-surface{position:relative;width:100%;margin:0}
</style>`

const CHARACTER_PROFILE_CSS = `<style data-reverie-surface="character-profile">
.rr-character-profile{--ink:var(--lumiverse-text,#f8eef4);--muted:var(--lumiverse-text-muted,#c5b3bd);--paper:var(--lumiverse-bg-elevated,#21171e);--deep:var(--lumiverse-bg-deep,#0e090d);--accent:var(--lumiverse-primary,#d96ca8);--accent-soft:rgba(217,108,168,.18);box-sizing:border-box;width:min(96%,520px);margin:16px auto;font-family:var(--lumiverse-font-family,system-ui,-apple-system,"Segoe UI",sans-serif);color:var(--ink)}.rr-character-profile,.rr-character-profile *{box-sizing:border-box}.rr-character-profile .cp-card{position:relative;display:grid;grid-template-columns:minmax(126px,38%) 1fr;overflow:hidden;border:1px solid rgba(255,255,255,.13);border-radius:24px;background:linear-gradient(145deg,var(--paper),var(--deep));box-shadow:0 20px 45px rgba(0,0,0,.38)}.rr-character-profile .cp-card:before{content:"";position:absolute;inset:0;pointer-events:none;background:radial-gradient(circle at 12% 18%,var(--accent-soft),transparent 26%),repeating-linear-gradient(128deg,transparent 0 14px,rgba(255,255,255,.025) 15px 16px)}.rr-character-profile .cp-portrait{position:relative;min-height:250px;overflow:hidden;background:linear-gradient(160deg,rgba(217,108,168,.24),rgba(15,8,13,.96));display:grid;place-items:stretch}.rr-character-profile .cp-portrait:after{content:"";position:absolute;inset:0;pointer-events:none;box-shadow:inset -18px 0 28px rgba(14,9,13,.55)}.rr-character-profile .cp-portrait img,.rr-character-profile .cp-portrait image_request>img{display:block;width:100%!important;height:100%!important;min-height:250px;object-fit:cover!important}.rr-character-profile .cp-portrait image_request{position:relative;display:grid;width:100%;height:100%;min-height:250px;place-items:center}.rr-character-profile .cp-portrait image_request:not(:has(img)):before{content:"✦ REVERIE RELAY PORTRAIT";padding:8px 10px;border:1px solid rgba(255,255,255,.16);border-radius:999px;color:#f5cfe3;font:800 8px/1.2 var(--lumiverse-font-mono,"Courier New",monospace);letter-spacing:.09em}.rr-character-profile scene_brief{display:none!important}.rr-character-profile image_request_error,.rr-character-profile .reverie-relay-status-card{display:block!important;width:100%!important;max-width:100%!important;margin:0!important}.rr-character-profile .cp-portrait .rrn-media,.rr-character-profile .cp-portrait .rrl-resolved,.rr-character-profile .cp-portrait .rrl-card{width:100%;height:100%;min-height:250px;margin:0;border:0;border-radius:0}.rr-character-profile .cp-portrait .rrl-detail{display:none!important}.rr-character-profile .cp-copy{position:relative;z-index:1;display:flex;min-width:0;flex-direction:column;justify-content:center;padding:20px 18px 18px}.rr-character-profile .cp-kicker{display:flex;align-items:center;gap:7px;margin-bottom:8px;color:#f5cfe3;font:900 8px/1 var(--lumiverse-font-mono,"Courier New",monospace);letter-spacing:.14em;text-transform:uppercase}.rr-character-profile .cp-kicker:before{content:"";width:24px;height:2px;border-radius:999px;background:var(--accent)}.rr-character-profile .cp-name{overflow-wrap:anywhere;font-family:Georgia,"Times New Roman",serif;font-size:clamp(24px,6vw,38px);font-style:italic;font-weight:800;line-height:.96;letter-spacing:-.04em}.rr-character-profile .cp-role{align-self:flex-start;margin-top:10px;padding:6px 9px;border:1px solid rgba(217,108,168,.35);border-radius:999px;background:rgba(217,108,168,.11);color:#f5cfe3;font-size:9px;font-weight:800;letter-spacing:.04em}.rr-character-profile .cp-hook{position:relative;margin-top:15px;padding:12px 13px;border-radius:16px 16px 16px 4px;background:rgba(255,255,255,.075);font-size:12px;font-weight:700;line-height:1.45}.rr-character-profile .cp-hook:before{content:"“";position:absolute;left:8px;top:-9px;color:var(--accent);font:900 28px/1 Georgia,serif}.rr-character-profile .cp-hook span{display:block;padding-left:12px}.rr-character-profile .cp-trait{margin-top:11px;color:var(--muted);font-size:10px;line-height:1.35}.rr-character-profile .cp-trait:before{content:"☆ ";color:var(--accent)}.rr-character-profile-shell>summary{cursor:pointer;list-style:none;margin:0 auto;width:min(96%,520px);padding:9px 12px;border:1px solid rgba(255,255,255,.13);border-radius:14px;color:var(--ink);background:var(--paper);font-weight:800}.rr-character-profile-shell>summary::-webkit-details-marker{display:none}.rr-character-profile-shell>.rr-character-profile{display:none}.rr-character-profile-shell[open]>.rr-character-profile{display:block}@media(max-width:480px){.rr-character-profile .cp-card{grid-template-columns:118px 1fr}.rr-character-profile .cp-copy{padding:16px 14px}.rr-character-profile .cp-name{font-size:25px}.rr-character-profile .cp-portrait,.rr-character-profile .cp-portrait image_request,.rr-character-profile .cp-portrait img,.rr-character-profile .cp-portrait image_request>img,.rr-character-profile .cp-portrait .rrn-media,.rr-character-profile .cp-portrait .rrl-resolved,.rr-character-profile .cp-portrait .rrl-card{min-height:220px}}
</style>`

const SHIPPED_SURFACE_CSS = `<style data-reverie-shipped-surface-style="1">
.rrn-surface-v1{--rrn-card-gap:10px}.rrn-surface-v1 .rrn-surface-head{display:flex;align-items:flex-start;gap:12px;margin-bottom:12px}.rrn-surface-v1 .rrn-surface-icon{display:grid;place-items:center;flex:0 0 42px;width:42px;height:42px;border:1px solid var(--rrn-border);border-radius:13px;background:color-mix(in srgb,var(--rrn-accent) 16%,transparent);font-size:21px}.rrn-surface-v1 .rrn-surface-copy{min-width:0;flex:1}.rrn-surface-v1 .rrn-surface-title{margin:0;font:750 clamp(18px,3vw,24px)/1.15 Georgia,"Times New Roman",serif}.rrn-surface-v1 .rrn-surface-meta{display:flex;flex-wrap:wrap;gap:5px 9px;margin-top:6px;color:var(--rrn-muted);font-size:11px}.rrn-surface-v1 .rrn-node{min-width:0}.rrn-surface-v1 .rrn-node-group{display:grid;gap:var(--rrn-card-gap)}.rrn-surface-v1 .rrn-node-card{padding:11px;border:1px solid color-mix(in srgb,var(--rrn-border) 72%,transparent);border-radius:13px;background:color-mix(in srgb,var(--rrn-bg) 70%,transparent)}.rrn-surface-v1 .rrn-node-message{padding:9px 11px;border-radius:14px;background:color-mix(in srgb,var(--rrn-panel) 78%,transparent);line-height:1.48}.rrn-surface-v1 .rrn-node-message+.rrn-node-message{margin-top:7px}.rrn-surface-v1 .rrn-node-highlight{padding:10px 12px;border-left:3px solid var(--rrn-accent);border-radius:8px;background:color-mix(in srgb,var(--rrn-accent) 10%,transparent);line-height:1.48}.rrn-surface-v1 .rrn-node-text{line-height:1.58;white-space:pre-wrap;overflow-wrap:anywhere}.rrn-surface-v1 .rrn-node-label{display:block;margin-bottom:4px;color:color-mix(in srgb,var(--rrn-accent) 76%,white);font-size:10px;font-weight:850;letter-spacing:.12em;text-transform:uppercase}.rrn-surface-v1 .rrn-node-meta{display:flex;flex-wrap:wrap;gap:4px 8px;margin-bottom:6px;color:var(--rrn-muted);font-size:10px}.rrn-surface-v1 .rrn-node-chip{display:inline-flex;align-items:center;gap:5px;padding:5px 8px;border:1px solid var(--rrn-border);border-radius:999px;background:color-mix(in srgb,var(--rrn-accent) 10%,transparent);font-size:11px}.rrn-surface-v1 .rrn-node-media{display:grid;gap:9px}.rrn-surface-v1 details.rrn-node-details{margin-top:10px;border:1px solid var(--rrn-border);border-radius:12px;background:color-mix(in srgb,var(--rrn-panel) 52%,transparent);overflow:hidden}.rrn-surface-v1 details.rrn-node-details>summary{cursor:pointer;list-style:none;padding:10px 12px;font-weight:750}.rrn-surface-v1 details.rrn-node-details>summary::-webkit-details-marker{display:none}.rrn-surface-v1 details.rrn-node-details>summary:after{content:"⌄";float:right;color:var(--rrn-muted)}.rrn-surface-v1 details.rrn-node-details[open]>summary:after{transform:rotate(180deg)}.rrn-surface-v1 details.rrn-node-details>.rrn-details-body{padding:0 12px 12px}.rrn-surface-v1 .rrn-contract-warning{margin:0 0 11px;padding:9px 11px;border:1px solid color-mix(in srgb,#f4b96f 46%,transparent);border-radius:11px;background:rgba(244,185,111,.08);color:#f4cf9f;font-size:11px}.rrn-surface-v1 .rrn-resolved-media{position:relative}.rrn-surface-v1 .rrn-resolved-media img{cursor:zoom-in}.rrn-surface-v1 .rrn-media-caption{padding:7px 9px;color:var(--rrn-muted);font-size:11px;line-height:1.4}.rrn-surface-v1-imessage-chat .rrn-node-media,.rrn-surface-v1-workspace-chat .rrn-node-media{width:100%}.rrn-surface-v1-imessage-chat .rrn-media,.rrn-surface-v1-workspace-chat .rrn-media{aspect-ratio:16/9;min-height:0}.rrn-surface-v1-imessage-chat .rrn-media img,.rrn-surface-v1-workspace-chat .rrn-media img{object-fit:contain!important;background:#09090c}.rrn-surface-v1-property-listing [data-rrn-child="pr_gallery"],.rrn-surface-v1-webtoon-panel [data-rrn-child="wb_panels"],.rrn-surface-v1-cctv-feed [data-rrn-child="cv_feeds"]{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(240px,100%),1fr));gap:10px}.rrn-surface-v1-webtoon-panel .rrn-media{aspect-ratio:9/16;max-height:72vh;min-height:360px}.rrn-surface-v1-webtoon-panel .rrn-media img{object-fit:contain!important}.rrn-surface-v1-cctv-feed .rrn-media{aspect-ratio:16/9;min-height:0}.rrn-surface-v1-medical-record [data-rrn-child="med_avatar"]{width:min(190px,55vw);margin:0 auto 12px}.rrn-surface-v1-medical-record [data-rrn-child="med_avatar"] .rrn-media{aspect-ratio:1/1;border-radius:50%;min-height:0}.rrn-surface-v1-medical-record [data-rrn-child="med_avatar"] img{object-fit:cover!important}.rrn-surface-v1-letter-dispatch .rrn-shell{overflow:visible}.rrn-surface-v1-letter-dispatch .rrn-body{padding:18px}.rrn-surface-v1-letter-dispatch [data-rrn-child="lt_body"]{position:relative;z-index:1;padding:clamp(16px,4vw,28px);border-radius:8px;background:linear-gradient(145deg,#f7ecd8,#ddc7a5);color:#35211e;box-shadow:0 10px 25px rgba(0,0,0,.22)}.rrn-surface-v1-case-file .rrn-body{padding-top:22px}.rrn-surface-v1-case-file .rrn-surface-head{padding-top:3px}.rrn-surface-v1-divination-surface .rrn-media{aspect-ratio:4/5}.rrn-surface-v1 .rrn-node[data-rrn-side="right"]{margin-left:auto;max-width:82%;background:color-mix(in srgb,var(--rrn-accent) 28%,var(--rrn-panel))}.rrn-surface-v1 .rrn-node[data-rrn-side="left"]{margin-right:auto;max-width:82%}@media(max-width:560px){.rrn-surface-v1 .rrn-surface-icon{width:36px;height:36px;flex-basis:36px;font-size:18px}.rrn-surface-v1 .rrn-surface-title{font-size:18px}.rrn-surface-v1-property-listing [data-rrn-child="pr_gallery"],.rrn-surface-v1-webtoon-panel [data-rrn-child="wb_panels"],.rrn-surface-v1-cctv-feed [data-rrn-child="cv_feeds"]{grid-template-columns:1fr}.rrn-surface-v1-case-file .rrn-body{padding-top:18px}.rrn-surface-v1-letter-dispatch .rrn-body{padding:12px}}
</style>`

const LIFECYCLE_CARD_CSS = `<style data-reverie-lifecycle-style="release">
.rrl-island{--rrl-accent:var(--lumiverse-primary,var(--lumiverse-accent,#c24b78));--rrl-bg:color-mix(in srgb,var(--lumiverse-bg-deep,var(--lumiverse-fill,#150a11)) 94%,#000);--rrl-panel:color-mix(in srgb,var(--lumiverse-bg-elevated,var(--lumiverse-fill-subtle,#24131d)) 91%,var(--rrl-accent) 9%);--rrl-border:color-mix(in srgb,var(--rrl-accent) 34%,var(--lumiverse-border,transparent));--rrl-text:var(--lumiverse-text-primary,var(--lumiverse-text,#f7eaf0));--rrl-muted:var(--lumiverse-text-secondary,var(--lumiverse-text-muted,#c8aeb9));display:block;width:min(100%,680px);margin:8px auto;font-family:var(--lumiverse-font-family,system-ui,-apple-system,"Segoe UI",sans-serif);color:var(--rrl-text);box-sizing:border-box}.rrl-island *{box-sizing:border-box}.rrl-card{position:relative;display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:8px 10px;min-height:54px;padding:9px 10px;border:1px solid var(--rrl-border);border-radius:15px;background:linear-gradient(145deg,color-mix(in srgb,var(--rrl-panel) 96%,transparent),color-mix(in srgb,var(--rrl-bg) 98%,transparent));box-shadow:0 8px 24px rgba(0,0,0,.22),inset 0 1px rgba(255,255,255,.045);overflow:hidden}.rrl-preview{grid-column:1/-1;position:relative;width:100%;max-height:320px;overflow:hidden;border:1px solid var(--rrl-border);border-radius:11px;background:#070507}.rrl-preview[hidden]{display:none}.rrl-preview img{display:block;width:100%;max-height:320px;object-fit:contain;background:#070507}.rrl-preview-badge{position:absolute;right:7px;bottom:7px;padding:3px 7px;border:1px solid rgba(255,255,255,.18);border-radius:999px;background:rgba(0,0,0,.62);backdrop-filter:blur(8px);color:#fff;font-size:9px}.rrl-main{display:flex;align-items:center;gap:9px;min-width:0}.rrl-icon{display:grid;place-items:center;flex:0 0 30px;width:30px;height:30px;border:1px solid var(--rrl-border);border-radius:10px;background:color-mix(in srgb,var(--rrl-accent) 12%,transparent)}.rrl-spinner{display:none;width:15px;height:15px;border:2px solid color-mix(in srgb,var(--rrl-accent) 22%,transparent);border-top-color:var(--rrl-accent);border-radius:50%;animation:rrlSpin .78s linear infinite}.rrl-state-icon{font:800 13px/1 system-ui,sans-serif}.rrl-card[data-rrn-live-status="preparing"] .rrl-spinner,.rrl-card[data-rrn-live-status="queued"] .rrl-spinner,.rrl-card[data-rrn-live-status="parsing"] .rrl-spinner,.rrl-card[data-rrn-live-status="generating"] .rrl-spinner,.rrl-card[data-rrn-live-status="previewing"] .rrl-spinner,.rrl-card[data-rrn-live-status="placement-pending"] .rrl-spinner{display:block}.rrl-card[data-rrn-live-status="preparing"] .rrl-state-icon,.rrl-card[data-rrn-live-status="queued"] .rrl-state-icon,.rrl-card[data-rrn-live-status="parsing"] .rrl-state-icon,.rrl-card[data-rrn-live-status="generating"] .rrl-state-icon,.rrl-card[data-rrn-live-status="previewing"] .rrl-state-icon,.rrl-card[data-rrn-live-status="placement-pending"] .rrl-state-icon{display:none}.rrl-copy{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:3px 8px;min-width:0;flex:1}.rrl-title{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font:700 12px/1.25 Georgia,"Times New Roman",serif}.rrl-status{display:inline-flex;align-items:center;gap:5px;flex:0 0 auto;padding:3px 7px;border:1px solid var(--rrl-border);border-radius:999px;color:var(--rrl-muted);font-size:9px;white-space:nowrap}.rrl-status:before{content:"";width:5px;height:5px;border-radius:50%;background:var(--rrl-accent);box-shadow:0 0 8px var(--rrl-accent)}.rrl-stream-status{grid-column:1/-1;color:var(--rrl-muted);font-size:9px;line-height:1.25;min-height:0}.rrl-stream-status:empty{display:none}.rrl-progress{grid-column:1/-1;height:3px;border-radius:99px;background:color-mix(in srgb,var(--rrl-border) 36%,transparent);overflow:hidden}.rrl-progress[hidden]{display:none}.rrl-progress>span{display:block;width:0;height:100%;border-radius:inherit;background:var(--rrl-accent);box-shadow:0 0 9px color-mix(in srgb,var(--rrl-accent) 70%,transparent);transition:width .18s ease}.rrl-actions{display:flex;align-items:center;justify-content:flex-end;gap:5px;min-width:0}.rrl-actions button{appearance:none;min-height:28px;padding:4px 8px;border:1px solid var(--rrl-border);border-radius:9px;background:color-mix(in srgb,var(--rrl-panel) 91%,transparent);color:var(--rrl-text);font:700 9px/1 system-ui,sans-serif;white-space:nowrap;cursor:pointer}.rrl-actions button:hover{background:color-mix(in srgb,var(--rrl-accent) 18%,var(--rrl-panel))}.rrl-actions button[data-rrn-action="abort"]{color:#ffc2cf;border-color:color-mix(in srgb,#ff5f7d 45%,transparent)}.rrl-detail{grid-column:1/-1;margin:0}.rrl-detail>summary{width:max-content;cursor:pointer;list-style:none;color:var(--rrl-muted);font-size:9px;line-height:1.2}.rrl-detail>summary::-webkit-details-marker{display:none}.rrl-detail>summary:before{content:"Details"}.rrl-detail[open]>summary:before{content:"Hide details"}.rrl-detail p{margin:5px 0 0;padding:7px 9px;border-radius:8px;background:rgba(0,0,0,.15);color:var(--rrl-muted);font-size:10px;line-height:1.4;max-height:7em;overflow:auto}.rrl-error{--rrl-accent:#ff5f7d}.rrl-card[data-rrn-live-status="generating"] .rrl-status:before,.rrl-card[data-rrn-live-status="parsing"] .rrl-status:before{animation:rrlPulse 1.05s ease-in-out infinite}.rrl-resolved{position:relative;width:100%;margin:0}.rrl-resolved img{display:block;width:100%;height:auto;border-radius:13px}.rrl-resolved-actions{margin-top:6px;justify-content:flex-start}@keyframes rrlPulse{0%,100%{opacity:.38;transform:scale(.8)}50%{opacity:1;transform:scale(1.18)}}@keyframes rrlSpin{to{transform:rotate(360deg)}}@media(max-width:560px){.rrl-island{margin:7px 0}.rrl-card{grid-template-columns:1fr;padding:8px}.rrl-actions{justify-content:flex-start;overflow-x:auto;scrollbar-width:none}.rrl-actions::-webkit-scrollbar{display:none}.rrl-actions button{flex:0 0 auto}.rrl-copy{gap:3px 5px}.rrl-status{font-size:8px}.rrl-title{font-size:11px}.rrl-preview,.rrl-preview img{max-height:260px}}@media(prefers-reduced-motion:reduce){.rrl-card *{animation:none!important}.rrl-progress>span{transition:none}}
</style>`

const STABLE_MEDIA_SLOT_CSS = `<style data-reverie-stable-media-slot="1">
.rrn-editable-surface,.rrl-island,.rrn-media,.rrl-media-slot,[data-reverie-r45-lifecycle-media]{overflow-anchor:none}.rrn-media{aspect-ratio:var(--reverie-media-aspect,16/9);min-height:0;contain:layout paint}.rrn-media img{width:100%;height:100%;object-fit:var(--rrn-fit,contain)}.rrl-card>.rrl-media-slot{grid-column:1/-1}.rrl-media-slot{--reverie-media-aspect:1/1;position:relative;display:block;width:100%;aspect-ratio:var(--reverie-media-aspect);min-height:0;overflow:hidden;border:1px solid var(--rrl-border);border-radius:11px;background:linear-gradient(135deg,color-mix(in srgb,var(--rrl-panel) 74%,#050305),#070507);contain:layout paint;overflow-anchor:none}.rrl-media-slot .rrl-preview,.rrl-media-slot .rrl-resolved{position:absolute;inset:0;width:100%;height:100%;margin:0;border:0;border-radius:0;background:transparent}.rrl-media-slot .rrl-preview{max-height:none}.rrl-media-slot .rrl-preview[hidden]{display:none}.rrl-media-slot .rrl-preview-image,.rrl-media-slot .rrl-slot-image,.rrl-media-slot .rrl-resolved img{display:block;width:100%;height:100%;max-height:none;object-fit:contain;background:#070507;border-radius:0}.rrl-actions button[data-rrn-action]{touch-action:manipulation;pointer-events:auto}.rrl-actions button[data-rrl-submitting="true"]{opacity:.68;cursor:progress}.rrl-media-skeleton{position:absolute;inset:0;display:grid;place-items:center;padding:10px;color:var(--rrl-muted);font-size:10px;text-align:center;background:radial-gradient(circle at 50% 35%,color-mix(in srgb,var(--rrl-accent) 18%,transparent),transparent 44%)}.rrl-media-skeleton:before{content:"Media slot reserved"}.rrl-card[data-rrn-live-status="failed"] .rrl-media-skeleton:before,.rrl-card[data-rrn-live-status="image-unavailable"] .rrl-media-skeleton:before,.rrl-card[data-rrn-live-status="cancelled"] .rrl-media-skeleton:before{content:"Media unavailable"}.rrl-media-slot[data-rrn-media-empty="false"] .rrl-media-skeleton{opacity:0;pointer-events:none}.rrl-media-slot[data-rrn-media-state="previewing"] .rrl-media-skeleton{opacity:0}@media(max-width:560px){.rrl-media-slot{width:100%;max-height:none}.rrl-media-slot .rrl-preview,.rrl-media-slot .rrl-preview-image{max-height:none}}
</style>`

function lifecycleCardIsland(card: string): string {
  return `<div class="rrl-island" data-reverie-lifecycle-card="true">${LIFECYCLE_CARD_CSS}${STABLE_MEDIA_SLOT_CSS}${card}</div>`
}


function titleCaseToken(value: string): string {
  return value.replace(/^\w+_/, '').replace(/[_-]+/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase())
}

function renderShippedSurface(spec: ShippedSurfaceSpec, _attrs: Record<string, string>, _body: string, _preset: CustomSurfaceDefinition | undefined, _context: NativeSurfaceRenderContext): string {
  // All approved roots are consumed by the FINAL R4.5 authority before this
  // legacy compatibility function can be reached. Do not substitute an older
  // renderer if that authority cannot consume a root.
  return reviewedContractError(spec.id, 'The FINAL R4.5 renderer did not consume this approved Surface.')
}

function renderCaseFileDossier(attrs: Record<string, string>, body: string, preset: CustomSurfaceDefinition | undefined, context: NativeSurfaceRenderContext): string {
  const sheet = firstTagText(body, 'cf_sheet') || body
  const mediaPayload = firstTagText(sheet, 'cf_media')
  const media = renderedLifecycleMarkup(mediaPayload) || renderAnyMedia(mediaPayload, context, 'case-file')
  const facts = allTagMatches(firstTagText(sheet, 'cf_facts'), 'cf_fact').map(fact => {
    const values = parseAttrs(fact.attrs)
    return `<div class="rrn-case-fact"><small>${escapeHtml(plainSurfaceText(values.label || 'Record'))}</small><b>${escapeHtml(plainSurfaceText(values.value || fact.body))}</b></div>`
  }).join('')
  const meta = [attrs.case, attrs.status, attrs.risk, attrs.agent].filter(Boolean).map(value => escapeHtml(plainSurfaceText(value))).join(' · ')
  return NATIVE_SURFACE_CSS + dossierPresentation({
    key: surfaceStreamIslandKey(context.messageId, context.swipeId, 'case-file', context.streamIslandOrdinal),
    subject: escapeHtml(plainSurfaceText(attrs.subject || 'Case dossier')), meta, media, facts,
    timeline: escapeHtml(plainSurfaceText(firstTagText(body, 'cf_timeline') || (attrs.last_seen ? `Last seen: ${attrs.last_seen}` : ''))),
    evidence: escapeHtml(plainSurfaceText(firstTagText(body, 'cf_evidence'))),
    notes: escapeHtml(plainSurfaceText(firstTagText(body, 'cf_notes') || firstTagText(body, 'notes'))),
  })
}

function renderAlbumCoverRedesign(attrs: Record<string, string>, body: string, preset: CustomSurfaceDefinition | undefined, context: NativeSurfaceRenderContext): string {
  const title = plainSurfaceText(firstTagText(body, 'title') || attrs.title || attrs.album || '')
  const artist = plainSurfaceText(firstTagText(body, 'artist') || attrs.artist || '')
  const release = plainSurfaceText(firstTagText(body, 'release') || attrs.release || attrs.date || '')
  const mediaPayload = firstTagText(body, 'artwork') || firstTagText(body, 'media') || body.replace(/<(title|artist|release)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
  const media = renderedLifecycleMarkup(mediaPayload) || renderAnyMedia(mediaPayload, context, 'album-cover')
  return NATIVE_SURFACE_CSS + albumPresentation({ title: escapeHtml(title), artist: escapeHtml(artist), release: escapeHtml(release), art: media })
}

function renderedLifecycleMarkup(value: string): string {
  // hydrateParityRequests has already converted this one exact request into a
  // Relay-owned lifecycle island. Preserve that island in the Surface region;
  // reparsing it as raw XML would make a pending request disappear.
  return /(?:\brrl-card\b|\brrl-resolved\b|data-rrn-native-request=)/.test(value) ? value : ''
}

const REGEX_PARITY_SURFACE_IDS = new Set<string>([
  'smartphone', 'instagram', 'twitter', 'kakao',
  'album-cover', 'magazine-cover', 'photo-booth-strip', 'polaroid', 'youtube-thumbnail',
  ...R45_SUPPLEMENTAL_ROOTS.map(([, id]) => id),
  ...SHIPPED_SURFACE_SPECS.map(spec => spec.id),
])

const ROOT_SPECS: ReadonlyArray<readonly [string, string]> = [
  ['smart_phone', 'smartphone'],
  ['smartphone', 'smartphone'],
  ['inline_chat', 'inline-chat'],
  ['ig_app', 'instagram'],
  ['instagram_app', 'instagram'],
  ['twitter_app', 'twitter'],
  ['kakao_chat', 'kakao'],
  ['album_cover', 'album-cover'],
  ['magazine_cover', 'magazine-cover'],
  ['photo_booth_strip', 'photo-booth-strip'],
  ['polaroid_frame', 'polaroid'],
  ['yt_thumbnail', 'youtube-thumbnail'],
  ['newspaper', 'newspaper'],
  ['character_profile', 'character-profile'],
  ...R45_SUPPLEMENTAL_ROOTS,
  ...SHIPPED_SURFACE_SPECS.map(spec => [spec.wrapper, spec.id] as const),
]

export const NATIVE_SURFACE_ROOT_TAGS = ROOT_SPECS.map(([tag]) => tag)

function parityModeForSurface(baseSurfaceId: string, preset: CustomSurfaceDefinition | undefined, context: NativeSurfaceRenderContext): RegexSurfaceParityMode {
  const mode = context.defaultShellMode || preset?.shellMode || defaultShellMode(baseSurfaceId)
  if (mode === 'sparkling') return 'sparkling'
  if (mode === 'plain' || mode === 'collapsible') return 'plain'
  return 'inline'
}

function matchingRequestRecords(
  context: NativeSurfaceRenderContext,
  requestId: string,
  target: string,
): NonNullable<NativeSurfaceRenderContext['records']> {
  return (context.records || [])
    .filter(record => record.requestId === requestId)
    .filter(record => !context.messageId || !record.messageId || record.messageId === context.messageId)
    .filter(record => context.swipeId === undefined || record.swipeId === undefined || record.swipeId === context.swipeId)
    .filter(record => !target || !record.target || record.target === target)
    .sort((left, right) => String(left.slot || '').localeCompare(String(right.slot || ''), undefined, { numeric: true }))
}

function requestRecordAttributes(record: NonNullable<NativeSurfaceRenderContext['records']>[number]): string {
  return [
    record.key ? ` data-dgir-key="${escapeAttr(record.key)}"` : '',
    record.requestId ? ` data-dgir-request-id="${escapeAttr(record.requestId)}"` : '',
    record.slot ? ` data-dgir-slot="${escapeAttr(record.slot)}"` : '',
    record.imageId ? ` data-dgir-image-id="${escapeAttr(record.imageId)}"` : '',
    record.messageId ? ` data-dgir-message-id="${escapeAttr(record.messageId)}"` : '',
    record.swipeId !== undefined ? ` data-dgir-swipe-id="${escapeAttr(String(record.swipeId))}"` : '',
  ].join('')
}

function resolvedParityRequestMarkup(
  attrs: Record<string, string>,
  records: NonNullable<NativeSurfaceRenderContext['records']>,
): string | null {
  const target = attrs.target || records[0]?.target || ''
  const ready = records.filter(record => Boolean(record.imageUrl) && ['completed', 'placement-pending', 'placement-repair-needed'].includes(record.status))
  if (!ready.length) return null
  const alt = attrs.alt || ready[0]?.alt || 'Reverie media'
  if (target === 'twitter.media') {
    const record = ready[0]
    return `<tw_media src="${escapeAttr(record.imageUrl || '')}" alt="${escapeAttr(alt)}" type="image"${requestRecordAttributes(record)}></tw_media>`
  }
  if (target === 'instagram.single') {
    const record = ready[0]
    return `<image><img src="${escapeAttr(record.imageUrl || '')}" alt="${escapeAttr(alt)}"${requestRecordAttributes(record)}></image>`
  }
  if (target === 'instagram.carousel') {
    const slides = ready.map((record, index) => `<ig_slide src="${escapeAttr(record.imageUrl || '')}" alt="${escapeAttr(alt ? `${alt} ${index + 1}` : `Slide ${index + 1}`)}"${requestRecordAttributes(record)}></ig_slide>`).join('')
    return `<ig_media active="1" total="${ready.length}">${slides}</ig_media>`
  }
  if (target === 'smartphone.message-image') {
    const record = ready[0]
    // hydrateParityRequests runs inside the already-authored <s_img> owner;
    // return only the resolved image to avoid nested message wrappers.
    return `<img src="${escapeAttr(record.imageUrl || '')}" alt="${escapeAttr(alt || 'Smartphone attachment')}"${requestRecordAttributes(record)}>`
  }
  if (target === 'kakao.image') {
    const record = ready[0]
    // The outer <k_img> remains the message-owned media node. R4.5 authority
    // normalizes its completed form before applying the final image rule.
    return `<img src="${escapeAttr(record.imageUrl || '')}" alt="${escapeAttr(alt || 'Kakao attachment')}"${requestRecordAttributes(record)}>`
  }
  if (target.startsWith('custom.')) {
    const record = ready[0]
    const caption = record.caption ? ` data-caption="${escapeAttr(record.caption)}"` : ''
    const artifactMedia = target === 'custom.artifact-media'
      ? ' class="reverie-artifact-media" data-reverie-artifact-media="true"'
      : ''
    return `<img src="${escapeAttr(record.imageUrl || '')}" alt="${escapeAttr(alt || target)}"${artifactMedia}${requestRecordAttributes(record)} data-dgir-custom-target="${escapeAttr(target)}"${caption} loading="lazy" decoding="async">`
  }
  return null
}

function hydrateParityRequests(
  markup: string,
  baseSurfaceId: string,
  context: NativeSurfaceRenderContext,
  options: { unresolved?: 'card' | 'preserve' } = {},
): string {
  let content = String(markup || '').replace(/<image_request\b([^>]*)>([\s\S]*?)<\/image_request>/gi, (full, rawAttrs, body) => {
    const attrs = parseAttrs(rawAttrs)
    const requestId = attrs.id || attrs.request_id || attrs.slot || ''
    const records = matchingRequestRecords(context, requestId, attrs.target || '')
    const resolved = resolvedParityRequestMarkup(attrs, records)
    if (resolved) return resolved
    if (options.unresolved === 'preserve') return full
    const record = records[0]
    const failed = record?.status === 'failed' || record?.status === 'image-unavailable' || record?.status === 'cancelled'
    return lifecycleCardIsland(renderRequestCard({
      title: failed ? 'Media unavailable' : 'Media requested',
      brief: firstTagText(body, 'scene_brief') || firstTagText(body, 'prompt') || stripMarkup(body),
      requestId,
      aspect: attrs.aspect || record?.requestAspect || '16:9',
      rootTag: 'image_request',
      baseSurfaceId,
      context,
      failed,
    }, true))
  })
  content = content.replace(/<image_request_error\b([^>]*)>([\s\S]*?)<\/image_request_error>/gi, (_full, rawAttrs, body) => {
    const attrs = parseAttrs(rawAttrs)
    const requestId = attrs.id || attrs.request_id || attrs.slot || ''
    const records = matchingRequestRecords(context, requestId, attrs.target || '')
    const record = records[0]
    const forceFailed = !record || ['failed', 'image-unavailable', 'cancelled'].includes(record.status)
    return lifecycleCardIsland(renderRequestCard({
      title: 'Media unavailable',
      brief: record?.error || stripMarkup(body) || 'Relay could not generate this media.',
      requestId,
      aspect: attrs.aspect || record?.requestAspect || '16:9',
      rootTag: 'image_request_error',
      baseSurfaceId,
      context,
      failed: forceFailed,
    }, true))
  })
  return content
}

function decorateParityImages(markup: string, context: NativeSurfaceRenderContext): string {
  const records = (context.records || []).filter(record => record.imageUrl)
  if (!records.length) return markup
  return String(markup || '').replace(/<img\b([^>]*)>/gi, (full, rawAttrs) => {
    const attrs = parseAttrs(rawAttrs)
    const src = attrs.src || ''
    const record = records.find(candidate => candidate.imageUrl === src)
    if (!record || /\bdata-dgir-(?:key|request-id|image-id)\s*=/.test(rawAttrs)) return full
    return `<img${rawAttrs}${requestRecordAttributes(record)}>`
  })
}


function normalizeTwitterContract(markup: string): string {
  let output = String(markup || '')
  output = output.replace(/<tw_media\s*>\s*(<tw_media\b[\s\S]*?<\/tw_media>)\s*<\/tw_media>/gi, '$1')
  output = output.replace(/<tw_post\b([^>]*)>/gi, (full, rawAttrs) => {
    const attrs = parseAttrs(rawAttrs)
    if (!attrs.user || attrs.author) return full
    const author = attrs.user
    const handle = attrs.handle || `@${author.toLocaleLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '') || 'user'}`
    return `<tw_post author="${escapeAttr(author)}" handle="${escapeAttr(handle)}" time="${escapeAttr(attrs.time || '')}" verified="${escapeAttr(attrs.verified || '')}" replies="${escapeAttr(attrs.replies || '')}" reposts="${escapeAttr(attrs.reposts || '')}" likes="${escapeAttr(attrs.likes || '')}" views="${escapeAttr(attrs.views || '')}" pinned="${escapeAttr(attrs.pinned || '')}">`
  })
  output = output.replace(/<tw_comment\b([^>]*)>/gi, (full, rawAttrs) => {
    const attrs = parseAttrs(rawAttrs)
    if (!attrs.user || attrs.author) return full
    const author = attrs.user
    const handle = attrs.handle || `@${author.toLocaleLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '') || 'user'}`
    return `<tw_comment author="${escapeAttr(author)}" handle="${escapeAttr(handle)}" time="${escapeAttr(attrs.time || '')}" verified="${escapeAttr(attrs.verified || '')}" likes="${escapeAttr(attrs.likes || '')}">`
  })
  output = output.replace(/<twitter_app>\s*((?:<tw_post\b[\s\S]*?<\/tw_post>\s*)+)<\/twitter_app>/gi, '<twitter_app><for_you>$1</for_you></twitter_app>')
  return output
}

function normalizeSmartphoneContract(markup: string): string {
  return String(markup || '').replace(/<(contact|info)\b([^>]*)>([\s\S]*?)<\/\1>/gi, (_full, tagName, rawAttrs, body) => {
    return `<${tagName}${rawAttrs}>${removeMediaMarkup(String(body || ''))}</${tagName}>`
  })
}

/**
 * Repairs the one unambiguous legacy Character Profile shape without moving
 * media between profiles. The wrapper-only rewrite preserves the exact Relay
 * request/marker/image payload and therefore its request ownership.
 */
export function normalizeCharacterProfileContract(markup: string): string {
  return String(markup || '').replace(/<character_profile\b([^>]*)>([\s\S]*?)<\/character_profile>/gi, (full, rawAttrs, body) => {
    if (/<portrait\b[^>]*>[\s\S]*?<\/portrait>/i.test(body)) return full
    const media = /<media\b([^>]*)>([\s\S]*?)<\/media>/i.exec(body)
    if (!media) return full
    const payload = media[2]
    const artifactIntent = /<image_request\b[^>]*\btarget=["']custom\.artifact-media["'][^>]*>/i.test(payload)
      || /<!--\s*(?:reverie-relay|dreamglass):image\b[^>]*\btarget=["']custom\.artifact-media["'][\s\S]*?-->/i.test(payload)
      || /<img\b[^>]*(?:\bdata-reverie-artifact-media=["']true["']|\bdata-dgir-custom-target=["']custom\.artifact-media["'])[^>]*>/i.test(payload)
    if (!artifactIntent) return full
    const repairedBody = body.slice(0, media.index) + `<portrait${media[1]}>${payload}</portrait>` + body.slice(media.index + media[0].length)
    return `<character_profile${rawAttrs}>${repairedBody}</character_profile>`
  })
}

export interface CharacterProfileRelayOwnership {
  chatId: string
  messageId: string
  swipeId: number
  requestId: string
  slot: string
  imageUrl: string
}

/** Proves that one generated asset is renderable inside its exact portrait. */
export function characterProfilePortraitHasExactRelayImage(markup: string, ownership: CharacterProfileRelayOwnership): boolean {
  const profiles = String(markup || '').match(/<character_profile\b[^>]*>[\s\S]*?<\/character_profile>/gi) || []
  return profiles.some(profile => {
    const portrait = /<portrait\b[^>]*>([\s\S]*?)<\/portrait>/i.exec(profile)?.[1] || ''
    const markerRe = /<!--\s*(?:reverie-relay|dreamglass):image\b([\s\S]*?)-->/gi
    let marker: RegExpExecArray | null
    while ((marker = markerRe.exec(portrait)) !== null) {
      const markerAttrs = parseAttrs(marker[1])
      if (markerAttrs.chatId !== ownership.chatId || markerAttrs.messageId !== ownership.messageId
        || Number(markerAttrs.swipeId) !== ownership.swipeId || markerAttrs.requestId !== ownership.requestId
        || markerAttrs.slot !== ownership.slot || markerAttrs.target !== 'custom.artifact-media') continue
      const tail = portrait.slice(marker.index + marker[0].length)
      const nextMarker = /<!--\s*(?:reverie-relay|dreamglass):image\b/i.exec(tail)?.index ?? tail.length
      const imageMatch = /<img\b([^>]*)>/i.exec(tail.slice(0, nextMarker))
      if (!imageMatch) continue
      const imageAttrs = parseAttrs(imageMatch[1])
      if (imageAttrs.src === ownership.imageUrl
        && imageAttrs['data-dgir-request-id'] === ownership.requestId
        && imageAttrs['data-dgir-slot'] === ownership.slot
        && imageAttrs['data-dgir-message-id'] === ownership.messageId
        && Number(imageAttrs['data-dgir-swipe-id']) === ownership.swipeId
        && imageAttrs['data-dgir-custom-target'] === 'custom.artifact-media') return true
    }
    return false
  })
}

function editableRelaySurface(rendered: string, editorMarkup: string, rootTag: string, baseSurfaceId: string, context: NativeSurfaceRenderContext, originalMarkup = editorMarkup): string {
  // R4.5 is presentation authority. Inline stays inline, while the Plain and
  // Sparkling packs provide their own single closed launcher. Adding a Relay
  // launcher here would create the double-wrapper regression seen in live QA.
  rendered = (baseSurfaceId === 'phone-gallery' ? GALLERY_FULL_IMAGE_CSS : '') + rendered
  if (!context.chatId || !context.messageId) return rendered
  const island = surfaceStreamIslandKey(context.messageId, context.swipeId, baseSurfaceId, context.streamIslandOrdinal || 0)
  return `<section class="rrn-editable-surface" data-reverie-stream-island="${escapeAttr(island)}" data-rrn-editable-surface="${escapeAttr(baseSurfaceId)}" data-rrn-chat-id="${escapeAttr(context.chatId)}" data-rrn-message-id="${escapeAttr(context.messageId)}" data-rrn-root-tag="${escapeAttr(rootTag)}" data-rrn-surface-id="${escapeAttr(baseSurfaceId)}" tabindex="0">${STABLE_MEDIA_SLOT_CSS}${rendered}<textarea class="rrn-surface-source" hidden>${escapeHtml(editorMarkup)}</textarea><textarea class="rrn-surface-original" hidden>${escapeHtml(originalMarkup)}</textarea></section>`
}

export function surfaceStreamIslandKey(messageId: string | undefined, swipeId: number | undefined, surfaceId: string, ordinal = 0): string {
  const message = String(messageId || 'stream-message').replace(/[^A-Za-z0-9_-]+/g, '-') || 'stream-message'
  const surface = String(surfaceId || 'surface').replace(/[^A-Za-z0-9_-]+/g, '-') || 'surface'
  return `${message}:${Number.isFinite(Number(swipeId)) ? Number(swipeId) : 'active'}:${surface}:${Math.max(0, ordinal)}`
}

const REVIEWED_STALE_CONTRACT_PATTERNS: Record<string, Array<[RegExp, string]>> = {
  'email-thread': [
    [/<\/?email_inbox\b/i, 'Retired Email Thread root <email_inbox> is not valid R4.5 XML.'],
    [/<\/?em_message\b/i, 'Retired Email Thread child <em_message> is not valid R4.5 XML.'],
  ],
  'dating-profile': [
    [/<\/?dating_profile\b/i, 'Retired Dating Profile root <dating_profile> is not valid R4.5 XML.'],
    [/<profile\b(?=[^>]*\bid=)/i, 'Retired Dating Profile profile id attribute is not valid R4.5 XML.'],
    [/<profile\b(?=[^>]*\bname=)/i, 'Retired Dating Profile profile name attribute is not valid R4.5 XML.'],
    [/<profile\b(?=[^>]*\bage=)/i, 'Retired Dating Profile profile age attribute is not valid R4.5 XML.'],
  ],
  livestream: [
    [/<\/?twitch_stream\b/i, 'Retired Livestream root <twitch_stream> is not valid R4.5 XML.'],
    [/<\/?stream_media\b/i, 'Retired Livestream child <stream_media> is not valid R4.5 XML.'],
  ],
  'discord-server': [
    [/<\/?channels\b/i, 'Retired Discord Server <channels> wrapper is not valid R4.5 XML.'],
    [/<\/?channel\b/i, 'Retired Discord Server <channel> child is not valid R4.5 XML.'],
    [/<\/?message\b/i, 'Retired Discord Server <message> child is not valid R4.5 XML.'],
    [/<\/?users\b/i, 'Retired Discord Server <users> wrapper is not valid R4.5 XML.'],
  ],
  'google-images': [
    [/<result\b(?=[^>]*\bindex=)/i, 'Retired Google Images result index contract is not valid R4.5 XML.'],
    [/<\/?gallery_item\b/i, 'Retired Google Images <gallery_item> child is not valid R4.5 XML.'],
  ],
  'phone-gallery': [
    [/<photo\b(?=[^>]*\bid=)/i, 'Retired Phone Gallery photo id contract is not valid R4.5 XML.'],
    [/<photo\b(?=[^>]*\bcaption=)/i, 'Retired Phone Gallery photo caption contract is not valid R4.5 XML.'],
  ],
}

function attrValue(source: string, name: string): string {
  return source.match(new RegExp(`\\b${name}\\s*=\\s*(['"])(.*?)\\1`, 'i'))?.[2]?.trim() || ''
}

function reviewedNaverContractMismatch(source: string): string | null {
  const rootAttrs = source.match(/<naver_news\b([^>]*)>/i)?.[1] || ''
  const expectedCommentCount = Number(attrValue(rootAttrs, 'comments'))
  const comments = [...source.matchAll(/<nv_comment\b([^>]*)>[\s\S]*?<\/nv_comment>/gi)]
  for (const comment of comments) {
    const attrs = comment[1] || ''
    if (!attrValue(attrs, 'user') || !attrValue(attrs, 'time')) return 'Naver comments require non-empty user and time attributes.'
  }
  if (Number.isFinite(expectedCommentCount) && comments.length !== expectedCommentCount) return `Naver comments must contain exactly ${expectedCommentCount} <nv_comment> rows; found ${comments.length}.`
  return null
}

/** Historical diagnostic API retained for tooling. FINAL R4.5 is the only
 * production contract authority; this helper rejects known retired live shapes
 * before falling back to the light outer-root sanity check. */
export function reviewedSurfaceContractMismatch(surfaceId: string, markup: string): string | null {
  const spec = SHIPPED_SURFACE_BY_ID.get(surfaceId)
  if (!spec) return null
  const source = String(markup || '')
  if (surfaceId === 'naver-article') {
    const naverMismatch = reviewedNaverContractMismatch(source)
    if (naverMismatch) return naverMismatch
  }
  for (const [pattern, reason] of REVIEWED_STALE_CONTRACT_PATTERNS[surfaceId] || []) {
    if (pattern.test(source)) return reason
  }
  return new RegExp(`<${spec.wrapper}\\b`, 'i').test(source) ? null : `Expected <${spec.wrapper}>`
}

/** Contract reasons belong to Relay diagnostics, never to the narrative DOM.
 * Keep a short local diagnostic history for the host-facing status inspector. */
const reviewedSurfaceDiagnostics = new Map<string, string>()
export function reviewedSurfaceContractDiagnostic(surfaceId: string): string | undefined {
  return reviewedSurfaceDiagnostics.get(surfaceId)
}
const reviewedSurfacePipelineDiagnostics = new Map<string, string[]>()
export function reviewedSurfacePipelineDiagnostic(surfaceId: string): string[] {
  return [...(reviewedSurfacePipelineDiagnostics.get(surfaceId) || [])]
}
function recordSurfacePipelineDiagnostic(surfaceId: string, stage: string, detail: string): void {
  const rows = [...(reviewedSurfacePipelineDiagnostics.get(surfaceId) || []), `${stage}: ${detail}`].slice(-24)
  reviewedSurfacePipelineDiagnostics.set(surfaceId, rows)
  while (reviewedSurfacePipelineDiagnostics.size > 128) reviewedSurfacePipelineDiagnostics.delete(reviewedSurfacePipelineDiagnostics.keys().next().value!)
}
function directKakaoMessageChildTags(markup: string): string[] {
  const messages = firstTagText(markup, 'messages') || ''
  const tags: string[] = []
  const re = /<\/?([A-Za-z][\w:-]*)\b(?:\s+(?:[^<>"']|"[^"]*"|'[^']*')*)?\s*\/?>/g
  let depth = 0
  for (const match of messages.matchAll(re)) {
    const token = match[0]
    const tag = match[1].toLowerCase()
    if (token.startsWith('</')) {
      if (depth > 0) depth -= 1
      continue
    }
    if (depth === 0) tags.push(tag)
    if (!/\/\s*>$/.test(token) && tag !== 'img') depth += 1
  }
  return tags
}
function kakaoCanonicalRows(markup: string): Array<{ type: string; sender: string; side: string; time: string }> {
  return directKakaoMessageChildTags(markup).map(type => ({ type: type === 'k_msg' ? 'message' : type === 'k_img' ? 'image' : type === 'k_system' ? 'system' : type, sender: '', side: '', time: '' }))
}
function recordKakaoNormalizationTrace(original: string, canonical: string): void {
  const rawTags = directKakaoMessageChildTags(original)
  const canonicalTags = directKakaoMessageChildTags(canonical)
  const senderRows = allTagMatches(firstTagText(canonical, 'messages') || '', 'k_msg')
    .map(row => parseAttrs(row.attrs))
    .map(attrs => `${attrs.sender || 'Participant'}:${attrs.side || 'left'}:${attrs.time || ''}`)
  recordSurfacePipelineDiagnostic('kakao', 'raw-messages', `${rawTags.length} children: ${rawTags.join(', ') || 'none'}`)
  recordSurfacePipelineDiagnostic('kakao', 'canonical-messages', `${canonicalTags.length} children: ${kakaoCanonicalRows(canonical).map(row => row.type).join(', ') || 'none'}`)
  recordSurfacePipelineDiagnostic('kakao', 'sender-side-resolution', senderRows.join('; ') || 'none')
}
function recordKakaoRenderTrace(rendered: string): void {
  const messageRows = (rendered.match(/\bkk-msg-row\b/g) || []).length
  const systemRows = (rendered.match(/\bkk-system\b/g) || []).length
  const imageRows = (rendered.match(/\bkk-image\b/g) || []).length
  recordSurfacePipelineDiagnostic('kakao', 'renderer-row-count', `${messageRows + systemRows + imageRows} rows: messages=${messageRows}, system=${systemRows}, images=${imageRows}`)
}

function reviewedContractError(surfaceId: string, reason: string): string {
  reviewedSurfaceDiagnostics.set(surfaceId, reason)
  recordSurfacePipelineDiagnostic(surfaceId, 'final', `repair fallback: ${reason}`)
  while (reviewedSurfaceDiagnostics.size > 128) reviewedSurfaceDiagnostics.delete(reviewedSurfaceDiagnostics.keys().next().value!)
  // The recovery affordance remains usable in-place, but raw grammar and
  // implementation detail are intentionally withheld from reader-facing story
  // content. Relay Health/diagnostics owns the exact reason above.
  return `<aside class="rrn-contract-recovery" role="status" data-reverie-surface-contract="failed" data-reverie-surface-id="${escapeAttr(surfaceId)}"><b>Relay Surface needs repair</b><span>Its existing request was preserved.</span><div><button type="button" data-rrn-action="reparse">Reparse</button><button type="button" data-rrn-action="rescan">Rescan</button></div></aside>`
}
function renderParityOwnedSurface(
  baseSurfaceId: string,
  rootTag: string,
  fullMarkup: string,
  preset: CustomSurfaceDefinition | undefined,
  context: NativeSurfaceRenderContext,
): string {
  recordSurfacePipelineDiagnostic(baseSurfaceId, 'detected-root', `<${rootTag}>`)
  recordSurfacePipelineDiagnostic(baseSurfaceId, 'resolved-surface', baseSurfaceId)
  recordSurfacePipelineDiagnostic(baseSurfaceId, 'selected-renderer', `R4.5 regex parity (${parityModeForSurface(baseSurfaceId, preset, context)})`)
  const canonicalMarkup = baseSurfaceId === 'twitter'
    ? normalizeTwitterContract(fullMarkup)
    : baseSurfaceId === 'smartphone'
      ? normalizeSmartphoneContract(fullMarkup)
      : baseSurfaceId === 'character-profile'
        ? normalizeCharacterProfileContract(fullMarkup)
      : fullMarkup
  if (baseSurfaceId === 'kakao') recordKakaoNormalizationTrace(fullMarkup, canonicalMarkup)
  const hydrated = hydrateParityRequests(canonicalMarkup, baseSurfaceId, context)
  const mode = parityModeForSurface(baseSurfaceId, preset, context)
  let rendered = renderRegexSurfaceParity(hydrated, mode, context.messageId || `${baseSurfaceId}-surface`, context.colorMode || 'realistic')
  if (baseSurfaceId === 'kakao') recordKakaoRenderTrace(rendered)
  const contract = completeSurfaceSpecs(SHIPPED_SURFACE_SPECS).find(spec => spec.id === baseSurfaceId)
  const residual = contract ? residualSurfaceTags(rendered, contract) : []
  recordSurfacePipelineDiagnostic(baseSurfaceId, 'selected-contract', contract ? `${contract.id} <${contract.wrapper}>` : 'missing')
  recordSurfacePipelineDiagnostic(baseSurfaceId, 'validator', residual.length ? `failed residual root: ${residual.join(', ')}` : 'passed root-consumption check')
  if (residual.length && containsRenderedRegexSurface(rendered)) return editableRelaySurface(reviewedContractError(baseSurfaceId, `The renderer left unconsumed Surface elements: ${residual.join(', ')}.`), canonicalMarkup, rootTag, baseSurfaceId, context, fullMarkup)
  if (!containsRenderedRegexSurface(rendered)) return editableRelaySurface(
    reviewedContractError(baseSurfaceId, 'The FINAL R4.5 renderer did not consume this approved Surface.'),
    canonicalMarkup,
    rootTag,
    baseSurfaceId,
    context,
    fullMarkup,
  )
  rendered = decorateParityImages(rendered, context)
  recordSurfacePipelineDiagnostic(baseSurfaceId, 'final', 'rendered')
  return editableRelaySurface(rendered, canonicalMarkup, rootTag, baseSurfaceId, context, fullMarkup)
}

export function renderNativeSurfaceMarkup(
  input: string,
  studio: CustomSurfaceStudioState,
  context: NativeSurfaceRenderContext,
): NativeSurfaceRenderResult {
  const renderContext: NativeSurfaceRenderContext = {
    ...context,
    defaultShellMode: studio.defaultShellMode || context.defaultShellMode,
    colorMode: studio.colorMode || context.colorMode || 'realistic',
    rendererMode: context.rendererMode || studio.rendererMode,
  }
  const bracketRenderedSurfaceIds: string[] = []
  let bracketRenderedCount = 0
  // Bracket-native authoring is the active model-facing Surface language.
  // Consume bracket roots as one document through the bracket parser and
  // bracket Regex authority. Legacy XML normalization below remains a parallel
  // compatibility path, not a whole-Surface bridge for canonical brackets.
  const bracketBlocks: Array<{ spec: { id: string; wrapper: string }; diagnostics: string[]; warnings: string[]; sourceFormat: string; bracketDialect: string; legacyXmlBridgeUsed: boolean; original: string; markup: string }> = []
  const bracketNormalized = normalizeBracketSurfaceDocument(input, SHIPPED_SURFACE_SPECS, block => {
    bracketBlocks.push(block)
    return block.diagnostics.length
      ? reviewedContractError(block.spec.id, block.diagnostics.join('; '))
      : block.markup
  })
  if (bracketBlocks.length) {
    bracketRenderedCount = bracketBlocks.length
    for (const block of bracketBlocks) {
      bracketRenderedSurfaceIds.push(block.spec.id)
      recordSurfacePipelineDiagnostic(block.spec.id, 'source-format', `${block.sourceFormat}; dialect=${block.bracketDialect}; legacyXmlBridgeUsed=${block.legacyXmlBridgeUsed}`)
      recordSurfacePipelineDiagnostic(block.spec.id, 'detected-root', `[${block.spec.wrapper}]`)
      recordSurfacePipelineDiagnostic(block.spec.id, 'resolved-surface', block.spec.id)
      recordSurfacePipelineDiagnostic(block.spec.id, 'normalization', block.diagnostics.length ? `failed: ${block.diagnostics.join('; ')}` : (block.original === block.markup ? 'bypassed: canonical bracket' : `repaired: bracket drift${block.warnings.length ? ` (${block.warnings.join('; ')})` : ''}`))
      recordSurfacePipelineDiagnostic(block.spec.id, 'selected-renderer', `R4.5 bracket regex parity (${parityModeForSurface(block.spec.id, activePreset(studio, block.spec.id), renderContext)})`)
      recordSurfacePipelineDiagnostic(block.spec.id, 'final', block.diagnostics.length ? 'repair fallback' : 'rendered')
    }
    const hydrated = hydrateParityRequests(bracketNormalized.markup, 'message', renderContext, { unresolved: 'preserve' })
    input = decorateParityImages(renderRegexSurfaceParity(hydrated, parityModeForSurface('message', undefined, renderContext), renderContext.messageId || 'bracket-surface', renderContext.colorMode || 'realistic'), renderContext)
  }
  // One shared, conservative normalization pass runs before either the Relay
  // renderer or the Regex-parity path sees an active shipped Surface.
  const normalizationFailures: string[] = []
  const normalizedSurface = normalizeSurfaceDocument(input, SHIPPED_SURFACE_SPECS, block => {
    recordSurfacePipelineDiagnostic(block.spec.id, 'detected-root', `<${block.spec.wrapper}>`)
    recordSurfacePipelineDiagnostic(block.spec.id, 'resolved-surface', block.spec.id)
    recordSurfacePipelineDiagnostic(block.spec.id, 'selected-contract', `${block.spec.id} <${block.spec.wrapper}>`)
    recordSurfacePipelineDiagnostic(block.spec.id, 'normalization', block.diagnostics.length ? `failed: ${block.diagnostics.join('; ')}` : (block.original === block.markup ? 'bypassed: canonical' : 'repaired: recoverable drift'))
    if (block.driftDiagnostics?.length) recordSurfacePipelineDiagnostic(block.spec.id, 'attribute-child-drift', block.driftDiagnostics.join('; '))
    if (block.spec.id === 'kakao') recordKakaoNormalizationTrace(block.original, block.markup)
    if ((renderContext.rendererMode === 'legacy-regex' || (renderContext.rendererMode === 'hybrid' && hybridSurfaceOwner(activePreset(studio, block.spec.id) || { baseSurfaceId: block.spec.id }) === 'regex'))) return block.original
    if (!block.diagnostics.length) return block.markup
    normalizationFailures.push(block.spec.id)
    recordSurfacePipelineDiagnostic(block.spec.id, 'repair', 'invoked: unrecoverable normalization failure')
    return editableRelaySurface(reviewedContractError(block.spec.id, block.diagnostics.join('; ')), block.original, block.spec.wrapper, block.spec.id, { ...renderContext, streamIslandOrdinal: normalizationFailures.length })
  })
  let content = normalizedSurface.markup
  // Legacy Regex-mode still exists for imported compatibility payloads, but
  // approved R4.5 runtime Surfaces are Relay-owned by default. When a user has
  // explicitly selected legacy ownership, hide the semantic payload from
  // Relay's generic request pass so one instance never gets two render owners.
  const protectedRegexSurfaces = new Map<string, string>()
  let renderedCount = bracketRenderedCount + normalizationFailures.length
  const renderedSurfaceIds: string[] = [...bracketRenderedSurfaceIds, ...normalizationFailures]

  // The reviewed Tinder contract deliberately has its own <tinder> wrapper
  // rather than the older Relay-only dating_profile wrapper. In Hybrid it is
  // owned in full by surface_review_tinder, including its nested requests.
  if ((renderContext.rendererMode === 'legacy-regex' || (renderContext.rendererMode === 'hybrid' && hybridSurfaceOwner(activePreset(studio, 'dating-profile')) === 'regex'))) {
    content = content.replace(/<tinder\b[^>]*>[\s\S]*?<\/tinder>/gi, fullMatch => {
      const token = `<!--rrl-hybrid-regex:${protectedRegexSurfaces.size}-->`
      protectedRegexSurfaces.set(token, hydrateParityRequests(String(fullMatch || ''), 'dating-profile', renderContext))
      renderedCount += 1
      renderedSurfaceIds.push('dating-profile')
      return token
    })
  }

  for (const [tagName, baseSurfaceId] of ROOT_SPECS) {
    const re = new RegExp(`<${escapeRegExp(tagName)}\\b([^>]*)>([\\s\\S]*?)</${escapeRegExp(tagName)}>`, 'gi')
    content = content.replace(re, (fullMatch, rawAttrs, body) => {
      const preset = activePreset(studio, baseSurfaceId)
      if (preset?.enabled === false) return fullMatch
      if (renderContext.rendererMode === 'legacy-regex' || (renderContext.rendererMode === 'hybrid' && hybridSurfaceOwner(preset || { baseSurfaceId }) === 'regex')) {
        const token = `<!--rrl-hybrid-regex:${protectedRegexSurfaces.size}-->`
        protectedRegexSurfaces.set(token, hydrateParityRequests(String(fullMatch || ''), baseSurfaceId, renderContext))
        renderedCount += 1
        renderedSurfaceIds.push(baseSurfaceId)
        return token
      }
      renderedCount += 1
      renderedSurfaceIds.push(baseSurfaceId)
      const instanceContext = { ...renderContext, streamIslandOrdinal: renderedCount }
      if (REGEX_PARITY_SURFACE_IDS.has(baseSurfaceId)) {
        return renderParityOwnedSurface(baseSurfaceId, tagName, String(fullMatch || ''), preset, instanceContext)
      }
      const originalMarkup = String(fullMatch || '')
      const canonicalMarkup = baseSurfaceId === 'character-profile'
        ? normalizeCharacterProfileContract(originalMarkup)
        : originalMarkup
      const canonicalOpen = /^<([A-Za-z0-9_:-]+)\b([^>]*)>([\s\S]*)<\/\1>$/.exec(canonicalMarkup.trim())
      return editableRelaySurface(
        renderBySurface(baseSurfaceId, canonicalOpen?.[1] || tagName, parseAttrs(canonicalOpen?.[2] || rawAttrs), canonicalOpen?.[3] || String(body || ''), preset, instanceContext),
        canonicalMarkup,
        tagName,
        baseSurfaceId,
        instanceContext,
        originalMarkup,
      )
    })
  }

  content = content.replace(/<reverie-illustration\b([^>]*)>([\s\S]*?)<\/reverie-illustration>/gi, (_full, rawAttrs, body) => {
    const attrs = parseAttrs(rawAttrs)
    if ((attrs.request || '').toLowerCase() !== 'generate') return ''
    renderedCount += 1
    renderedSurfaceIds.push('prose-illustration')
    return renderRequestCard({
      title: 'Illustration requested',
      brief: stripMarkup(String(body || '')),
      requestId: attrs.slot || attrs.id || '',
      aspect: attrs.aspect || '4:3',
      rootTag: 'reverie-illustration',
      baseSurfaceId: 'prose-illustration',
      preset: activePreset(studio, 'prose-illustration'),
      context: renderContext,
    })
  })

  // Artifact Media may appear inside arbitrary authored HTML rather than a
  // dedicated root wrapper. Replace only unresolved semantic requests; Relay's
  // completed <img> write-back remains untouched.
  content = content.replace(/<image_request\b([^>]*)>([\s\S]*?)<\/image_request>/gi, (full, rawAttrs, body) => {
    const attrs = parseAttrs(rawAttrs)
    if (attrs.target !== 'custom.artifact-media') return full
    renderedCount += 1
    renderedSurfaceIds.push('artifact-media')
    return renderRequestCard({
      title: 'Artifact media requested',
      brief: firstTagText(body, 'scene_brief') || stripMarkup(body),
      requestId: attrs.id || attrs.request_id || '',
      aspect: attrs.aspect || '4:3',
      rootTag: 'image_request',
      baseSurfaceId: 'artifact-media',
      preset: activePreset(studio, 'artifact-media'),
      context: renderContext,
    })
  })

  // Universal fallback: every remaining Relay image request receives the
  // same inline lifecycle card, even before its dedicated shipped surface
  // renderer exists. Registered surfaces were already consumed above, so this
  // only catches valid requests left inside future/custom semantic wrappers.
  content = content.replace(/<image_request\b([^>]*)>([\s\S]*?)<\/image_request>/gi, (_full, rawAttrs, body) => {
    const attrs = parseAttrs(rawAttrs)
    const target = attrs.target || ''
    const baseSurfaceId = baseSurfaceIdForTarget(target)
    renderedCount += 1
    renderedSurfaceIds.push(baseSurfaceId)
    return renderRequestCard({
      title: 'Media requested',
      brief: firstTagText(body, 'scene_brief') || firstTagText(body, 'prompt') || stripMarkup(body),
      requestId: attrs.id || attrs.request_id || '',
      aspect: attrs.aspect || '16:9',
      rootTag: 'image_request',
      baseSurfaceId,
      preset: activePreset(studio, baseSurfaceId),
      context: renderContext,
    })
  })

  // Failure write-back replaces the original request wrapper with a standalone
  // image_request_error marker. Handle those globally so prose illustrations
  // and Artifact Media keep the exact same inline lifecycle card on failure.
  content = content.replace(/<image_request_error\b([^>]*)>([\s\S]*?)<\/image_request_error>/gi, (_full, rawAttrs, body) => {
    const attrs = parseAttrs(rawAttrs)
    const target = attrs.target || ''
    const baseSurfaceId = baseSurfaceIdForTarget(target)
    renderedCount += 1
    renderedSurfaceIds.push(baseSurfaceId)
    return renderRequestCard({
      title: 'Generation failed',
      brief: stripMarkup(body) || 'Relay could not generate this media.',
      requestId: attrs.id || attrs.request_id || '',
      aspect: attrs.aspect || '16:9',
      rootTag: 'image_request_error',
      baseSurfaceId,
      preset: activePreset(studio, baseSurfaceId),
      context: renderContext,
      failed: true,
    })
  })

  for (const [token, original] of protectedRegexSurfaces) content = content.replace(token, original)
  if (protectedRegexSurfaces.size) {
    content = renderRegexSurfaceParity(
      content,
      parityModeForSurface('message', undefined, renderContext),
      renderContext.messageId || 'message-surface',
      renderContext.colorMode || 'realistic',
    )
  }
  return { content, renderedCount, renderedSurfaceIds }
}


export function renderLifecycleWidgetMarkup(
  tagName: 'reverie-illustration' | 'image_request' | 'image_request_error',
  input: string,
  context: NativeSurfaceRenderContext,
): NativeSurfaceRenderResult {
  const source = String(input || '').trim()
  const open = new RegExp(`^<${escapeRegExp(tagName)}\\b([^>]*)>([\\s\\S]*?)</${escapeRegExp(tagName)}>$`, 'i').exec(source)
  if (!open) return { content: '', renderedCount: 0, renderedSurfaceIds: [] }
  const attrs = parseAttrs(open[1])
  const body = open[2] || ''
  if (tagName === 'reverie-illustration' && (attrs.request || '').toLowerCase() !== 'generate') {
    return { content: '', renderedCount: 0, renderedSurfaceIds: [] }
  }
  const target = tagName === 'reverie-illustration' ? 'prose.illustration' : (attrs.target || '')
  const baseSurfaceId = baseSurfaceIdForTarget(target)
  const requestId = attrs.id || attrs.request_id || attrs.slot || ''
  const failed = tagName === 'image_request_error'
  const title = tagName === 'reverie-illustration'
    ? 'Illustration requested'
    : failed ? 'Generation failed' : 'Media requested'
  const brief = tagName === 'reverie-illustration'
    ? stripMarkup(body)
    : failed
      ? stripMarkup(body) || 'Relay could not generate this media.'
      : firstTagText(body, 'scene_brief') || firstTagText(body, 'prompt') || stripMarkup(body)
  const card = renderRequestCard({
    title,
    brief,
    requestId,
    aspect: attrs.aspect || (tagName === 'reverie-illustration' ? '4:3' : '16:9'),
    rootTag: tagName,
    baseSurfaceId,
    context,
    failed,
  }, true)
  return {
    content: lifecycleCardIsland(card),
    renderedCount: 1,
    renderedSurfaceIds: [baseSurfaceId],
  }
}


export function renderLegacyLifecycleMarkup(
  input: string,
  context: NativeSurfaceRenderContext,
): NativeSurfaceRenderResult {
  let renderedCount = 0
  const renderedSurfaceIds: string[] = []
  let content = normalizeSurfaceDocument(input, SHIPPED_SURFACE_SPECS, block => {
    if (!block.diagnostics.length) return block.markup
    renderedCount += 1
    renderedSurfaceIds.push(block.spec.id)
    return editableRelaySurface(reviewedContractError(block.spec.id, block.diagnostics.join('; ')), block.original, block.spec.wrapper, block.spec.id, context)
  }).markup

  const compactCard = (card: string): string => lifecycleCardIsland(card)

  content = content.replace(/<reverie-illustration\b([^>]*)>([\s\S]*?)<\/reverie-illustration>/gi, (full, rawAttrs, body) => {
    const attrs = parseAttrs(rawAttrs)
    if ((attrs.request || '').toLowerCase() !== 'generate') return full
    renderedCount += 1
    renderedSurfaceIds.push('prose-illustration')
    return compactCard(renderRequestCard({
      title: 'Illustration requested',
      brief: stripMarkup(String(body || '')),
      requestId: attrs.slot || attrs.id || '',
      aspect: attrs.aspect || '4:3',
      rootTag: 'reverie-illustration',
      baseSurfaceId: 'prose-illustration',
      context,
    }, true))
  })

  content = content.replace(/<image_request\b([^>]*)>([\s\S]*?)<\/image_request>/gi, (_full, rawAttrs, body) => {
    const attrs = parseAttrs(rawAttrs)
    const target = attrs.target || ''
    const baseSurfaceId = baseSurfaceIdForTarget(target)
    renderedCount += 1
    renderedSurfaceIds.push(baseSurfaceId)
    return compactCard(renderRequestCard({
      title: 'Generating media',
      brief: firstTagText(body, 'scene_brief') || firstTagText(body, 'prompt') || stripMarkup(body),
      requestId: attrs.id || attrs.request_id || attrs.slot || '',
      aspect: attrs.aspect || '16:9',
      rootTag: 'image_request',
      baseSurfaceId,
      context,
    }, true))
  })

  content = content.replace(/<image_request_error\b([^>]*)>([\s\S]*?)<\/image_request_error>/gi, (_full, rawAttrs, body) => {
    const attrs = parseAttrs(rawAttrs)
    const target = attrs.target || ''
    const baseSurfaceId = baseSurfaceIdForTarget(target)
    renderedCount += 1
    renderedSurfaceIds.push(baseSurfaceId)
    return compactCard(renderRequestCard({
      title: 'Generation failed',
      brief: stripMarkup(body) || 'Relay could not generate this media.',
      requestId: attrs.id || attrs.request_id || attrs.slot || '',
      aspect: attrs.aspect || '16:9',
      rootTag: 'image_request_error',
      baseSurfaceId,
      context,
      failed: true,
    }, true))
  })

  return { content, renderedCount, renderedSurfaceIds }
}

function baseSurfaceIdForTarget(target: string): string {
  if (target === 'prose.illustration') return 'prose-illustration'
  if (target === 'custom.artifact-media') return 'artifact-media'
  if (target.startsWith('custom.')) return target.slice('custom.'.length).replace(/\./g, '-')
  if (target.startsWith('smartphone.')) return 'smartphone'
  if (target.startsWith('instagram.')) return 'instagram'
  if (target.startsWith('twitter.')) return 'twitter'
  if (target.startsWith('kakao.')) return 'kakao'
  return target ? target.replace(/\./g, '-') : 'relay-media'
}

function renderBySurface(
  baseSurfaceId: string,
  rootTag: string,
  attrs: Record<string, string>,
  body: string,
  preset: CustomSurfaceDefinition | undefined,
  context: NativeSurfaceRenderContext,
): string {
  if (baseSurfaceId === 'case-file') return renderCaseFileDossier(attrs, body, preset, context)
  if (baseSurfaceId === 'album-cover') return renderAlbumCoverRedesign(attrs, body, preset, context)
  const shippedSpec = SHIPPED_SURFACE_BY_ID.get(baseSurfaceId)
  if (shippedSpec) return renderShippedSurface(shippedSpec, attrs, body, preset, context)
  switch (baseSurfaceId) {
    case 'smartphone': return renderSmartphone(attrs, body, preset, context)
    case 'inline-chat': return renderInlineChat(attrs, body, preset, context)
    case 'instagram': return renderInstagram(attrs, body, preset, context)
    case 'twitter': return renderTwitter(body, preset, context)
    case 'kakao': return renderKakao(attrs, body, preset, context)
    case 'news': return renderNews(body, preset, context, false)
    case 'dispatch': return renderNews(body, preset, context, true)
    case 'letter': return renderLetter(body, preset, context)
    case 'character-profile': return renderCharacterProfile(body, preset, context)
    default: return renderImageSurface(baseSurfaceId, rootTag, attrs, body, preset, context)
  }
}

function normalizeSmartphoneBody(body: string): { body: string; warnings: string[] } {
  let normalized = body
  const warnings: string[] = []
  normalized = normalized.replace(/<notif\b(?=[^>]*\bapp\s*=\s*["']([^"']*)["'])(?=[^>]*\bfrom\s*=\s*["']([^"']*)["'])(?=[^>]*\btext\s*=\s*["']([^"']*)["'])(?=[^>]*\btime\s*=\s*["']([^"']*)["'])[^>]*\/>/gi, (_m, app, sender, text, time) => {
    warnings.push('notif → s_note')
    return `<s_note app="${escapeAttr(app)}" sender="${escapeAttr(sender)}" time="${escapeAttr(time)}">${escapeHtml(text)}</s_note>`
  })
  normalized = normalized.replace(/<contact\b([^>]*)\/>/gi, (_m, rawAttrs) => {
    const a = parseAttrs(rawAttrs)
    warnings.push('self-closing contact → paired contact')
    const rows = [a.name || '', a.status || '', a.avatar || ''].filter(Boolean)
    return `<contact>${rows.map(row => escapeHtml(row)).join('<br>')}</contact>`
  })
  normalized = normalized.replace(/<k_msg\b([^>]*)>([\s\S]*?)<\/k_msg>/gi, (_m, rawAttrs, content) => {
    const a = parseAttrs(rawAttrs)
    const side = String(a.side || '').toLowerCase()
    if (side !== 'left' && side !== 'right') return _m
    warnings.push(`k_msg ${side} → ${side === 'left' ? 's_recv' : 's_sent'}`)
    return `<${side === 'left' ? 's_recv' : 's_sent'} time="${escapeAttr(a.time || '')}">${content}</${side === 'left' ? 's_recv' : 's_sent'}>`
  })
  return { body: normalized, warnings: [...new Set(warnings)] }
}

function renderSmartphone(attrs: Record<string, string>, body: string, preset: CustomSurfaceDefinition | undefined, context: NativeSurfaceRenderContext): string {
  const normalized = normalizeSmartphoneBody(body)
  body = normalized.body
  const notes = firstTagText(body, 'notifications') || ''
  const contact = removeMediaMarkup(firstTagText(body, 'contact') || '') || attrs.sender || 'Contact'
  const messages = firstTagText(body, 'messages') || ''
  const info = removeMediaMarkup(firstTagText(body, 'info') || '')
  const noteRows = allTagMatches(notes, 's_note').map(row => {
    const a = parseAttrs(row.attrs)
    return `<div class="rrn-note"><div class="rrn-meta"><b>${escapeHtml(a.app || 'Notification')}</b><span>${escapeHtml(a.sender || '')}</span><time>${escapeHtml(a.time || '')}</time></div><div>${sanitizeInline(row.body)}</div></div>`
  }).join('')
  const messageRows = renderMessageChildren(messages, context, 'smartphone')
  const hasTextMessages = /<(?:s_recv|s_sent)\b[^>]*>[\s\S]*?\S[\s\S]*?<\/(?:s_recv|s_sent)>/i.test(messages)
  const validationWarnings = [...normalized.warnings]
  if (!/^\d{2}:\d{2}$/.test(attrs.time || '')) validationWarnings.push('time must use 24-hour HH:MM')
  const battery = Number(attrs.battery)
  if (!Number.isFinite(battery) || battery < 0 || battery > 100) validationWarnings.push('battery must be 0–100')
  if (!hasTextMessages) validationWarnings.push('conversation requires at least one non-empty s_recv or s_sent')
  if (/<k_msg\b/i.test(messages)) validationWarnings.push('unsupported k_msg remained inside Smartphone')
  const warning = validationWarnings.length ? `<div class="rrn-card rrn-error"><div class="rrn-kicker">Smartphone schema warning</div><div class="rrn-sub">${escapeHtml([...new Set(validationWarnings)].join(' · '))}</div></div>` : ''
  const inner = `<div class="rrn-phone"><div class="rrn-phone-screen"><div class="rrn-phone-top"><span>${escapeHtml(attrs.time || '')}</span><span>${escapeHtml(attrs.battery || '')}%</span></div>${warning}<div class="rrn-card"><div class="rrn-kicker">Notifications</div>${noteRows || '<div class="rrn-sub">No notifications</div>'}</div><div class="rrn-card" style="margin-top:10px"><div class="rrn-ig-head"><span class="rrn-avatar">${escapeHtml(attrs.initial || initial(attrs.sender || 'R'))}</span><div><b>${sanitizeInline(contact)}</b><div class="rrn-sub">${escapeHtml(attrs.day || '')}</div></div></div>${messageRows || '<div class="rrn-sub">No visible messages</div>'}</div>${info ? `<div class="rrn-sub" style="padding:10px 4px 2px">${sanitizeInline(info)}</div>` : ''}</div></div>`
  return shell('smartphone', attrs.sender ? `${attrs.sender}'s phone` : 'Smartphone', 'Private thread', inner, preset, context, 'rrn-compact')
}

function renderInlineChat(attrs: Record<string, string>, body: string, preset: CustomSurfaceDefinition | undefined, context: NativeSurfaceRenderContext): string {
  const rows: string[] = []
  const tokenRe = /<(message|s_recv|s_sent)\b([^>]*)>([\s\S]*?)<\/\1>/gi
  let match: RegExpExecArray | null
  while ((match = tokenRe.exec(body)) !== null) {
    const tag = match[1].toLowerCase()
    const a = parseAttrs(match[2] || '')
    const sent = tag === 's_sent' || a.side === 'right' || a.side === 'sent' || a.sender === 'self'
    rows.push(`<div class="rrn-message ${sent ? 'is-sent' : ''}"><div class="rrn-copy"><div class="rrn-bubble ${sent ? 'is-sent' : ''}">${sanitizeInline(match[3])}</div>${a.time ? `<div class="rrn-meta"><time>${escapeHtml(a.time)}</time></div>` : ''}</div></div>`)
  }
  const media = renderAnyMedia(body, context, 'inline-chat')
  const fallback = rows.length ? rows.join('') : sanitizeParagraphs(removeMediaMarkup(body))
  return shell('inline-chat', attrs.header || attrs.sender || 'Inline Chat', 'Compact conversation', `<div class="rrn-card">${fallback || '<div class="rrn-sub">No visible messages</div>'}${media}</div>`, preset, context)
}

function renderInstagram(attrs: Record<string, string>, body: string, preset: CustomSurfaceDefinition | undefined, context: NativeSurfaceRenderContext): string {
  const caption = firstTagText(body, 'caption') || ''
  const commentsBody = firstTagText(body, 'comments') || firstTagText(body, 'ig_comments') || ''
  const media = renderInstagramMedia(body, context)
  const commentRows = [...allTagMatches(commentsBody, 'i_comment'), ...allTagMatches(commentsBody, 'ig_comment')]
  const comments = commentRows.map(row => {
    const a = parseAttrs(row.attrs)
    const replyRows = [...allTagMatches(row.body, 'i_reply'), ...allTagMatches(row.body, 'ig_reply')]
    let commentBody = removeNestedTag(row.body, 'i_reply')
    commentBody = removeNestedTag(commentBody, 'ig_reply')
    const replies = replyRows.map(reply => {
      const ra = parseAttrs(reply.attrs)
      return `<div class="rrn-card rrn-ig-reply" style="margin-top:8px"><div class="rrn-meta"><b>${escapeHtml(ra.user || 'user')}</b><span>${escapeHtml(ra.time || '')}</span></div><div>${sanitizeInline(reply.body)}</div></div>`
    }).join('')
    return `<div class="rrn-comment"><div class="rrn-meta"><b>${escapeHtml(a.user || 'user')}</b><span>${escapeHtml(a.time || '')}</span>${a.verified ? '<span class="rrn-chip">verified</span>' : ''}${a.likes ? `<span>${escapeHtml(a.likes)} likes</span>` : ''}</div><div>${sanitizeInline(commentBody)}</div>${replies}</div>`
  }).join('')
  const inner = `<div class="rrn-ig-head"><span class="rrn-avatar">${escapeHtml(initial(attrs.user || 'I'))}</span><div><b>${escapeHtml(attrs.user || 'Instagram')}</b><div class="rrn-sub">${escapeHtml(attrs.loc || '')}</div></div>${attrs.verified ? '<span class="rrn-chip">verified</span>' : ''}</div>${media}<div class="rrn-reactions"><span>♡ ${escapeHtml(attrs.likes || '0')}</span><span>Comment</span><span>Share</span></div>${caption ? `<div class="rrn-caption"><b>${escapeHtml(attrs.user || '')}</b> ${sanitizeInline(caption)}</div>` : ''}${comments ? `<div class="rrn-card"><div class="rrn-kicker">Comments</div>${comments}</div>` : ''}`
  return shell('instagram', `@${attrs.user || 'instagram'}`, attrs.loc || 'Visual post', inner, preset, context)
}

function renderInstagramMedia(body: string, context: NativeSurfaceRenderContext): string {
  const request = firstTagMatch(body, 'image_request')
  if (request) return renderAnyMedia(body, context, 'instagram')
  const container = firstTagMatch(body, 'ig_media')
  const source = container?.body || body
  const slides = allTagMatches(source, 'ig_slide')
  if (slides.length) {
    const rendered = slides.map((slide, index) => {
      const attrs = parseAttrs(slide.attrs)
      const nested = /<img\b([^>]*)>/i.exec(slide.body)
      const nestedAttrs = nested ? parseAttrs(nested[1]) : {}
      const src = attrs.src || nestedAttrs.src || ''
      const alt = attrs.alt || nestedAttrs.alt || `Instagram slide ${index + 1}`
      const caption = stripMarkup(slide.body.replace(/<img\b[^>]*>/gi, ''))
      return src ? `<figure class="rrn-media" data-aspect="1:1" style="--reverie-media-aspect:1 / 1"><img src="${escapeAttr(src)}" alt="${escapeAttr(alt)}">${caption ? `<figcaption class="rrn-caption">${escapeHtml(caption)}</figcaption>` : ''}</figure>` : ''
    }).filter(Boolean).join('')
    return `<div class="rrn-carousel">${rendered}</div>`
  }
  return renderAnyMedia(body, context, 'instagram')
}

function renderTwitter(body: string, preset: CustomSurfaceDefinition | undefined, context: NativeSurfaceRenderContext): string {
  const sections = ['for_you', 'following', 'thread', 'trends']
  const available = sections.filter(tag => firstTagText(body, tag))
  const tabs = (available.length ? available : ['for_you']).map(tag => `<span>${titleCase(tag.replace('_', ' '))}</span>`).join('')
  const feedBody = ['for_you', 'following', 'thread'].map(tag => firstTagText(body, tag) || '').join('\n')
  const posts = [
    ...allTagMatches(feedBody, 'tw_post'),
    ...allTagMatches(feedBody, 'tw_thread_main'),
    ...allTagMatches(feedBody, 'tw_reply'),
  ].map(row => renderTwitterPost(row.attrs, row.body, context)).join('')
  const trendBody = firstTagText(body, 'trends') || ''
  const trends = allTagMatches(trendBody, 'tw_trend').map(row => {
    const a = parseAttrs(row.attrs)
    return `<div class="rrn-trend"><div><b>${sanitizeInline(row.body)}</b><div class="rrn-sub">${escapeHtml(a.posts || '')} posts${a.category ? ` · ${escapeHtml(a.category)}` : ''}</div></div><span class="rrn-chip">#${escapeHtml(a.rank || '')}</span></div>`
  }).join('')
  const inner = `<div class="rrn-twitter"><div class="rrn-twitter-nav">${tabs}</div><div class="rrn-twitter-feed">${posts || '<div class="rrn-twitter-empty">No posts yet</div>'}</div>${trends ? `<div class="rrn-twitter-trends">${trends}</div>` : ''}</div>`
  return shell('twitter', 'X', 'Timeline', inner, preset, context)
}

function renderTwitterPost(rawAttrs: string, body: string, context: NativeSurfaceRenderContext): string {
  const attrs = parseAttrs(rawAttrs)
  const author = attrs.author || attrs.user || 'User'
  const handle = attrs.handle || `@${author.toLowerCase().replace(/\s+/g, '_')}`
  const commentsBody = firstTagText(body, 'tw_comments') || ''
  let mainBody = removeNestedTag(body, 'tw_comments')
  const media = renderAnyMedia(mainBody, context, 'twitter')
  const quotes = allTagMatches(mainBody, 'tw_quote').map(row => {
    const a = parseAttrs(row.attrs)
    return `<div class="rrn-card rrn-quote"><div class="rrn-meta"><b>${escapeHtml(a.author || a.user || '')}</b><span>${escapeHtml(a.handle || '')}</span><time>${escapeHtml(a.time || '')}</time></div><div>${sanitizeInline(row.body)}</div></div>`
  }).join('')
  const polls = allTagMatches(mainBody, 'tw_poll').map(row => {
    const a = parseAttrs(row.attrs)
    const options = allTagMatches(row.body, 'tw_option').map(opt => {
      const oa = parseAttrs(opt.attrs)
      return `<div class="rrn-trend"><span>${sanitizeInline(opt.body)}</span><b>${escapeHtml(oa.percent || '')}%</b></div>`
    }).join('')
    return `<div class="rrn-card">${options}<div class="rrn-sub">${a.votes ? `${escapeHtml(a.votes)} votes` : ''}${a.ends ? ` · ends ${escapeHtml(a.ends)}` : ''}</div></div>`
  }).join('')
  const links = allTagMatches(mainBody, 'tw_link').map(row => {
    const a = parseAttrs(row.attrs)
    const href = /^https?:\/\//i.test(a.url || '') ? a.url : '#'
    return `<a class="rrn-link" href="${escapeAttr(href)}" target="_blank" rel="noopener"><div class="rrn-kicker">${escapeHtml(a.domain || '')}</div><b>${escapeHtml(a.title || '')}</b>${a.description ? `<div class="rrn-sub">${escapeHtml(a.description)}</div>` : ''}${stripMarkup(row.body) ? `<div class="rrn-caption">${sanitizeInline(row.body)}</div>` : ''}</a>`
  }).join('')
  const notes = allTagMatches(mainBody, 'tw_note').map(row => `<div class="rrn-card"><div class="rrn-kicker">Community Note</div>${sanitizeInline(row.body)}</div>`).join('')
  mainBody = removeMediaMarkup(stripKnownTags(mainBody, ['tw_quote', 'tw_poll', 'tw_link', 'tw_note']))
  const commentRows = allTagMatches(commentsBody, 'tw_comment')
  const comments = commentRows.map(row => {
    const a = parseAttrs(row.attrs)
    const replyAuthor = a.author || a.user || 'User'
    const replies = allTagMatches(row.body, 'tw_comment_reply').map(reply => {
      const ra = parseAttrs(reply.attrs)
      return `<div class="rrn-comment"><div class="rrn-meta"><b>${escapeHtml(ra.author || ra.user || '')}</b><span>${escapeHtml(ra.handle || '')}</span><time>${escapeHtml(ra.time || '')}</time></div>${sanitizeInline(reply.body)}</div>`
    }).join('')
    return `<div class="rrn-comment"><div class="rrn-meta"><b>${escapeHtml(replyAuthor)}</b><span>${escapeHtml(a.handle || '')}</span><time>${escapeHtml(a.time || '')}</time>${a.likes ? `<span>${escapeHtml(a.likes)} likes</span>` : ''}</div><div>${sanitizeInline(removeNestedTag(row.body, 'tw_comment_reply'))}</div>${replies}</div>`
  }).join('')
  const commentsDrawer = comments
    ? `<details class="rrn-twitter-comments"><summary aria-label="Toggle replies"></summary>${comments}</details>`
    : ''
  return `<article class="rrn-tweet"><div class="rrn-tweet-grid"><span class="rrn-avatar">${escapeHtml(initial(author))}</span><div><div class="rrn-tweet-head"><b>${escapeHtml(author)}</b>${attrs.verified ? '<span aria-label="Verified">✓</span>' : ''}<span>${escapeHtml(handle)}</span><span>·</span><time>${escapeHtml(attrs.time || '')}</time></div><div class="rrn-tweet-text">${sanitizeInline(mainBody)}</div>${quotes}${polls}${links}${notes}${media}<div class="rrn-tweet-actions"><span>↩ ${escapeHtml(attrs.replies || '')}</span><span>⟳ ${escapeHtml(attrs.reposts || '')}</span><span>♡ ${escapeHtml(attrs.likes || '')}</span><span>◉ ${escapeHtml(attrs.views || '')}</span></div>${commentsDrawer}</div></div></article>`
}

function renderKakao(attrs: Record<string, string>, body: string, preset: CustomSurfaceDefinition | undefined, context: NativeSurfaceRenderContext): string {
  const participants = firstTagText(body, 'participants') || ''
  const messages = firstTagText(body, 'messages') || ''
  const chips = allTagMatches(participants, 'k_part').map(row => {
    const a = parseAttrs(row.attrs)
    return `<span class="rrn-chip">${escapeHtml(a.avatar || initial(a.name || 'K'))} ${escapeHtml(a.name || '')}</span>`
  }).join('')
  const rows: string[] = []
  const tokenRe = /<(k_msg|k_date|k_system|k_unread)\b([^>]*)>([\s\S]*?)<\/\1>|<(k_typing|k_part|k_react)\b([^>]*)\/?\s*>/gi
  let match: RegExpExecArray | null
  while ((match = tokenRe.exec(messages)) !== null) {
    const tag = match[1] || match[4]
    const a = parseAttrs(match[2] || match[5] || '')
    const value = match[3] || ''
    if (tag === 'k_msg') {
      const sent = a.side === 'right'
      const reply = firstTagMatch(value, 'k_reply')
      const file = firstTagMatch(value, 'k_file')
      const reactions = allTagMatches(value, 'k_react').map(row => {
        const ra = parseAttrs(row.attrs)
        return `<span class="rrn-chip">${escapeHtml(ra.emoji || '')} ${escapeHtml(ra.count || '')}</span>`
      }).join('')
      let clean = removeMediaMarkup(value)
      clean = stripKnownTags(clean, ['k_reply', 'k_file', 'k_react'])
      const replyMarkup = reply ? `<div class="rrn-card rrn-quote"><div class="rrn-meta"><b>${escapeHtml(parseAttrs(reply.attrs).sender || '')}</b></div>${sanitizeInline(reply.body)}</div>` : ''
      const fileMarkup = file ? (() => { const fa = parseAttrs(file.attrs); return `<div class="rrn-file"><span>▧</span><div><b>${escapeHtml(fa.name || 'Attachment')}</b><div class="rrn-sub">${escapeHtml(fa.type || '')}${fa.size ? ` · ${escapeHtml(fa.size)}` : ''}</div>${stripMarkup(file.body) ? `<div>${sanitizeInline(file.body)}</div>` : ''}</div></div>` })() : ''
      rows.push(`<div class="rrn-message ${sent ? 'is-sent' : ''}">${sent ? '' : `<span class="rrn-avatar">${escapeHtml(a.avatar || initial(a.sender || 'K'))}</span>`}<div class="rrn-copy"><div class="rrn-meta">${sent ? '' : `<b>${escapeHtml(a.sender || '')}</b>`}<time>${escapeHtml(a.time || '')}</time>${a.read ? `<span>${escapeHtml(a.read)}</span>` : ''}</div>${replyMarkup}<div class="rrn-bubble ${sent ? 'is-sent' : ''}">${sanitizeInline(clean)}</div>${renderAnyMedia(value, context, 'kakao')}${fileMarkup}${reactions ? `<div class="rrn-reactions">${reactions}</div>` : ''}</div></div>`)
    } else if (tag === 'k_date' || tag === 'k_unread') rows.push(`<div class="rrn-sub" style="text-align:center;padding:8px">${sanitizeInline(value)}</div>`)
    else if (tag === 'k_system') rows.push(`<div class="rrn-chip" style="margin:6px auto;display:flex;width:max-content">${sanitizeInline(value)}</div>`)
    else if (tag === 'k_typing') rows.push(`<div class="rrn-sub">${escapeHtml(a.names || '')} is typing…</div>`)
  }
  return shell('kakao', attrs.title || 'KakaoTalk', `${attrs.date || ''} · ${attrs.time || ''}`, `<div class="rrn-kakao-head"><div class="rrn-copy"><div class="rrn-meta">${chips}</div></div>${attrs.unread && attrs.unread !== '0' ? `<span class="rrn-chip">${escapeHtml(attrs.unread)} unread</span>` : ''}</div><div class="rrn-card">${rows.join('')}</div>`, preset, context)
}

function renderImageSurface(baseSurfaceId: string, rootTag: string, attrs: Record<string, string>, body: string, preset: CustomSurfaceDefinition | undefined, context: NativeSurfaceRenderContext): string {
  const labels: Record<string, [string, string, string]> = {
    'album-cover': ['Album Cover', 'Music release artwork', 'rrn-album'],
    'evidence-photo': ['Evidence Photo', 'Documentary visual record', 'rrn-evidence'],
    'magazine-cover': ['Magazine Cover', 'Editorial feature', 'rrn-magazine'],
    'photo-booth-strip': ['Photo Booth Strip', 'Sequential keepsake', 'rrn-photostrip'],
    polaroid: ['Polaroid', 'Instant memory', 'rrn-polaroid'],
    'youtube-thumbnail': ['YouTube Thumbnail', 'Video cover image', 'rrn-youtube'],
    newspaper: ['Newspaper Image', 'Publication photograph', 'rrn-document'],
    'artifact-media': ['Artifact Media', 'Authored media slot', ''],
  }
  const [title, subtitle, extraClass] = labels[baseSurfaceId] || [titleCase(baseSurfaceId.replace(/-/g, ' ')), 'Reverie surface', '']
  const media = renderAnyMedia(body, context, baseSurfaceId)
  const pending = media || renderRequestCard({
    title: `${title} requested`, brief: firstSceneBrief(body) || stripMarkup(body), requestId: firstRequestId(body), aspect: firstRequestAspect(body) || attrs.aspect || '16:9', rootTag, baseSurfaceId, preset, context,
  }, true)
  return shell(baseSurfaceId, title, subtitle, pending, preset, context, extraClass)
}

function renderNews(body: string, preset: CustomSurfaceDefinition | undefined, context: NativeSurfaceRenderContext, dispatch: boolean): string {
  const headline = firstTagText(body, 'headline') || (dispatch ? 'Dispatch' : 'News')
  const source = firstTagText(body, dispatch ? 'agency' : 'source') || ''
  const byline = firstTagText(body, 'byline') || ''
  const timestamp = firstTagText(body, 'timestamp') || ''
  const article = firstTagText(body, dispatch ? 'content' : 'body') || ''
  const tags = firstTagText(body, dispatch ? 'tags' : 'category') || ''
  const inner = `<div class="rrn-kicker">${escapeHtml(source)}</div><div class="rrn-title">${sanitizeInline(headline)}</div><div class="rrn-meta"><span>${escapeHtml(byline)}</span><time>${escapeHtml(timestamp)}</time></div><div class="rrn-card" style="margin-top:14px">${sanitizeParagraphs(article)}</div>${tags ? `<div class="rrn-actions"><span class="rrn-chip">${sanitizeInline(tags)}</span></div>` : ''}`
  return shell(dispatch ? 'dispatch' : 'news', dispatch ? 'Dispatch' : 'News', 'Structured article', inner, preset, context, 'rrn-document')
}

function renderLetter(body: string, preset: CustomSurfaceDefinition | undefined, context: NativeSurfaceRenderContext): string {
  const from = firstTagText(body, 'from') || ''
  const to = firstTagText(body, 'to') || ''
  const date = firstTagText(body, 'date') || ''
  const letterBody = firstTagText(body, 'body') || ''
  const folded = firstTagText(body, 'folded') || ''
  return shell('letter', `Letter from ${from || 'Unknown'}`, `To ${to}${date ? ` · ${date}` : ''}`, `<div class="rrn-card">${sanitizeParagraphs(letterBody)}</div>${folded ? `<div class="rrn-sub" style="margin-top:12px">Folded note: ${sanitizeInline(folded)}</div>` : ''}`, preset, context, 'rrn-document')
}





function renderCharacterProfile(body: string, preset: CustomSurfaceDefinition | undefined, context: NativeSurfaceRenderContext): string {
  const portrait = firstTagText(body, 'portrait') || ''
  const name = firstTagText(body, 'name') || 'New character'
  const role = firstTagText(body, 'role') || ''
  const hook = firstTagText(body, 'hook') || ''
  const trait = firstTagText(body, 'trait') || ''
  const media = renderAnyMedia(portrait, context, 'character-profile') || '<div class="rrn-parity-slot-pending">Portrait request unavailable</div>'
  const card = `<div class="rr-character-profile" data-rrn-surface="character-profile"><article class="cp-card"><div class="cp-portrait">${media}</div><div class="cp-copy"><div class="cp-kicker">Cast Sheet</div><div class="cp-name">${sanitizeInline(name)}</div><div class="cp-role">${sanitizeInline(role)}</div><div class="cp-hook"><span>${sanitizeInline(hook)}</span></div><div class="cp-trait">${sanitizeInline(trait)}</div></div></article></div>`
  const shellMode: SurfaceShellMode = context.defaultShellMode || preset?.shellMode || defaultShellMode('character-profile')
  const rendered = shellMode === 'collapsible'
    ? `<details class="rr-character-profile-shell"${preset?.defaultOpen === true ? ' open' : ''}><summary>${escapeHtml(preset?.launcherLabel || name)}</summary>${card}</details>`
    : card
  return `<div class="rrn-native-island">${NATIVE_SURFACE_CSS}${CHARACTER_PROFILE_CSS}${rendered}${safePresetCss(preset)}</div>`
}




function renderMessageChildren(body: string, context: NativeSurfaceRenderContext, baseSurfaceId: string): string {
  // Preserve the exact authored order. Smartphone media is a sibling of its
  // surrounding text bubbles while pending, and becomes <s_img> after Relay
  // hydrates it. Appending media after every text row breaks the conversation.
  const rows: string[] = []
  const re = /<(s_recv|s_sent|s_img|image_request|image_request_error)\b([^>]*)>([\s\S]*?)<\/\1>/gi
  let match: RegExpExecArray | null
  while ((match = re.exec(body)) !== null) {
    const tag = match[1].toLowerCase()
    const full = match[0]
    if (tag === 'image_request' || tag === 'image_request_error' || tag === 's_img') {
      rows.push(renderAnyMedia(full, context, baseSurfaceId))
      continue
    }
    const sent = tag === 's_sent'
    const attrs = parseAttrs(match[2])
    rows.push(`<div class="rrn-message ${sent ? 'is-sent' : ''}"><div class="rrn-copy"><div class="rrn-bubble ${sent ? 'is-sent' : ''}">${sanitizeInline(match[3])}</div><div class="rrn-meta"><time>${escapeHtml(attrs.time || '')}</time></div></div></div>`)
  }
  return rows.join('')
}

function renderAnyMedia(body: string, context: NativeSurfaceRenderContext, baseSurfaceId: string): string {
  const request = firstTagMatch(body, 'image_request')
  if (request) {
    const attrs = parseAttrs(request.attrs)
    return renderRequestCard({ title: 'Media requested', brief: firstTagText(request.body, 'scene_brief') || firstTagText(request.body, 'prompt') || stripMarkup(request.body), requestId: attrs.id || attrs.request_id || '', aspect: attrs.aspect || '16:9', rootTag: 'image_request', baseSurfaceId, preset: undefined, context }, true)
  }
  const error = firstTagMatch(body, 'image_request_error')
  if (error) {
    const attrs = parseAttrs(error.attrs)
    return renderRequestCard({ title: 'Generation failed', brief: stripMarkup(error.body) || 'Relay could not generate this media.', requestId: attrs.id || '', aspect: attrs.aspect || '16:9', rootTag: 'image_request_error', baseSurfaceId, preset: undefined, context, failed: true }, true)
  }
  const image = extractImage(body)
  if (!image) return ''
  const actions = renderActionButtons(image.requestId, context, baseSurfaceId, 'resolved')
  const relayAttrs = [
    image.key ? ` data-dgir-key="${escapeAttr(image.key)}"` : '',
    image.requestId ? ` data-dgir-request-id="${escapeAttr(image.requestId)}"` : '',
    image.slot ? ` data-dgir-slot="${escapeAttr(image.slot)}"` : '',
    image.imageId ? ` data-dgir-image-id="${escapeAttr(image.imageId)}"` : '',
  ].join('')
  const aspect = image.aspect || '16:9'
  return `<figure class="rrn-media" data-aspect="${escapeAttr(aspect)}" style="--reverie-media-aspect:${escapeAttr(cssAspectRatio(aspect, '16:9'))}"><img src="${escapeAttr(image.src)}" alt="${escapeAttr(image.alt || 'Reverie media')}" data-rrn-request-id="${escapeAttr(image.requestId)}"${relayAttrs}>${image.caption ? `<figcaption class="rrn-caption">${sanitizeInline(image.caption)}</figcaption>` : ''}</figure>${actions}`
}

function extractImage(body: string): { src: string; alt: string; caption: string; requestId: string; aspect: string; key: string; imageId: string; slot: string } | null {
  const img = /<img\b([^>]*)>/i.exec(body)
  if (img) {
    const attrs = parseAttrs(img[1])
    return { src: attrs.src || '', alt: attrs.alt || '', caption: attrs['data-caption'] || '', requestId: attrs['data-dgir-request-id'] || attrs['data-request-id'] || '', aspect: attrs['data-aspect'] || '', key: attrs['data-dgir-key'] || '', imageId: attrs['data-dgir-image-id'] || '', slot: attrs['data-dgir-slot'] || '' }
  }
  for (const tag of ['ig_slide', 'tw_media', 's_img', 'k_img']) {
    const match = firstTagMatch(body, tag)
    if (!match) continue
    const attrs = parseAttrs(match.attrs)
    const nested = /<img\b([^>]*)>/i.exec(match.body)
    const nestedAttrs = nested ? parseAttrs(nested[1]) : {}
    return { src: attrs.src || nestedAttrs.src || '', alt: attrs.alt || nestedAttrs.alt || '', caption: tag === 'k_img' ? attrs.caption || stripMarkup(match.body) : stripMarkup(match.body), requestId: attrs['data-dgir-request-id'] || nestedAttrs['data-dgir-request-id'] || '', aspect: attrs.aspect || '', key: attrs['data-dgir-key'] || nestedAttrs['data-dgir-key'] || '', imageId: attrs['data-dgir-image-id'] || nestedAttrs['data-dgir-image-id'] || '', slot: attrs['data-dgir-slot'] || nestedAttrs['data-dgir-slot'] || '' }
  }
  return null
}

function cssAspectRatio(value: string, fallback = '1:1'): string {
  const source = String(value || fallback || '1:1').trim()
  const match = /^(\d+(?:\.\d+)?)\s*[:/]\s*(\d+(?:\.\d+)?)$/.exec(source)
  if (!match) return '1 / 1'
  const width = Math.max(0.1, Number(match[1]))
  const height = Math.max(0.1, Number(match[2]))
  return `${width} / ${height}`
}

function stableMediaSlotAttrs(aspect: string, state: string, empty: boolean): string {
  const ratio = cssAspectRatio(aspect || '1:1')
  return ` class="rrl-media-slot" data-aspect="${escapeAttr(aspect || '1:1')}" data-rrn-media-state="${escapeAttr(state)}" data-rrn-media-empty="${empty ? 'true' : 'false'}" style="--reverie-media-aspect:${escapeAttr(ratio)}"`
}

function stableLifecycleMediaSlot(aspect: string, state: string, title: string, inner = '', empty = true): string {
  const alt = escapeAttr(title || 'Reverie media')
  const fallbackImage = inner ? '' : `<img class="rrl-slot-image" alt="${alt}" hidden>`
  return `<div${stableMediaSlotAttrs(aspect, state, empty)}>${inner}${fallbackImage}<div class="rrl-preview" hidden><img class="rrl-preview-image" alt="Live generation preview"><span class="rrl-preview-badge">Live preview</span></div><div class="rrl-media-skeleton" aria-hidden="true"></div></div>`
}

function renderRequestCard(input: {
  title: string
  brief: string
  requestId: string
  aspect: string
  rootTag: string
  baseSurfaceId: string
  preset?: CustomSurfaceDefinition
  context: NativeSurfaceRenderContext
  failed?: boolean
}, bare = false): string {
  const record = input.context.records?.find(candidate => candidate.requestId === input.requestId
    && (!input.context.messageId || !candidate.messageId || candidate.messageId === input.context.messageId)
    && (input.context.swipeId === undefined || candidate.swipeId === undefined || candidate.swipeId === input.context.swipeId))
  const fallbackStatus = input.context.autoGenerate === false ? 'recovered-pending' : 'preparing'
  const liveStatus = input.failed ? 'failed' : (record?.status || fallbackStatus)
  const statusLabels: Record<string, string> = {
    'recovered-pending': 'Discovered', preparing: 'Preparing', queued: 'Queued', parsing: 'Parsing', generating: 'Generating', previewing: 'Previewing',
    'placement-pending': 'Inserting', 'placement-repair-needed': 'Repair needed', completed: 'Completed', 'image-unavailable': 'Unavailable',
    failed: 'Failed', cancelled: 'Stopped',
  }
  const titleLabels: Record<string, string> = {
    'recovered-pending': input.title, preparing: 'Preparing generation', queued: 'Preparing automatically', parsing: 'Preparing prompt', generating: 'Generating image', previewing: 'Previewing image',
    'placement-pending': 'Inserting image', 'placement-repair-needed': 'Placement needs repair', completed: 'Image completed', 'image-unavailable': 'Image unavailable',
    failed: 'Generation failed', cancelled: 'Generation stopped',
  }
  const failure = input.failed || liveStatus === 'failed' || liveStatus === 'image-unavailable' || liveStatus === 'cancelled' || liveStatus === 'placement-repair-needed'
  const icon = failure ? '!' : liveStatus === 'completed' ? '✓' : '✦'
  const brief = failure && record?.error ? record.error : (input.brief || 'Visual request attached to this message.')
  const active = isSlotLifecycleActive(liveStatus as import('./contracts').SlotStatus)
  const repairAvailable = liveStatus === 'placement-repair-needed' && Boolean(record?.pendingPlacement)
  const actionState = repairAvailable ? 'repair' : failure ? 'failed' : liveStatus === 'completed' ? 'resolved' : active ? 'active' : 'pending'
  const completedImageUrl = record?.imageUrl || record?.pendingPlacement?.imageUrl
  const aspect = input.aspect || record?.requestAspect || '1:1'
  if (completedImageUrl && (liveStatus === 'completed' || liveStatus === 'placement-repair-needed')) {
    const artifactMedia = input.baseSurfaceId === 'character-profile'
      ? ' class="reverie-artifact-media" data-reverie-artifact-media="true" data-dgir-custom-target="custom.artifact-media"'
      : ''
    const repairNeeded = liveStatus === 'placement-repair-needed'
    const imageAttrs = artifactMedia || ' class="rrl-slot-image"'
    const mediaSlot = stableLifecycleMediaSlot(aspect, liveStatus, input.title, `<figure class="rrl-resolved"><img src="${escapeAttr(completedImageUrl)}" alt="${escapeAttr(input.title || 'Reverie media')}"${imageAttrs}${requestRecordAttributes(record)} loading="lazy" decoding="async"></figure>`, false)
    const resolved = `<div class="rrl-card ${repairNeeded ? 'rrl-error' : ''}" data-rrn-native-request="${escapeAttr(input.requestId)}" data-rrn-record-key="${escapeAttr(record?.key || '')}" data-rrn-live-status="${escapeAttr(liveStatus)}" aria-live="polite">${mediaSlot}<div class="rrl-main"><span class="rrl-icon"><span class="rrl-state-icon">${icon}</span></span><div class="rrl-copy"><strong class="rrl-title">${escapeHtml(titleLabels[liveStatus] || input.title)}</strong><span class="rrl-status">${escapeHtml(statusLabels[liveStatus] || titleCaseToken(liveStatus))}</span><span class="rrl-stream-status"></span><div class="rrl-progress" hidden><span></span></div></div></div><div class="rrl-actions">${renderActionButtons(input.requestId, input.context, input.baseSurfaceId, repairAvailable ? 'repair' : 'resolved', input.rootTag)}</div><details class="rrl-detail"><summary aria-label="Show request details"></summary><p>${escapeHtml(brief)}</p></details></div>`
    return bare ? resolved : lifecycleCardIsland(resolved)
  }
  const mediaSlot = stableLifecycleMediaSlot(aspect, liveStatus, input.title)
  const card = `<div class="rrl-card ${failure ? 'rrl-error' : ''}" data-rrn-native-request="${escapeAttr(input.requestId)}" data-rrn-record-key="${escapeAttr(record?.key || '')}" data-rrn-live-status="${escapeAttr(liveStatus)}" aria-live="polite">${mediaSlot}<div class="rrl-main"><span class="rrl-icon"><span class="rrl-spinner" aria-hidden="true"></span><span class="rrl-state-icon">${icon}</span></span><div class="rrl-copy"><strong class="rrl-title">${escapeHtml(titleLabels[liveStatus] || input.title)}</strong><span class="rrl-status">${escapeHtml(statusLabels[liveStatus] || titleCaseToken(liveStatus))}</span><span class="rrl-stream-status"></span><div class="rrl-progress" hidden><span></span></div></div></div><div class="rrl-actions">${renderActionButtons(input.requestId, input.context, input.baseSurfaceId, actionState, input.rootTag)}</div><details class="rrl-detail"><summary aria-label="Show request details"></summary><p>${escapeHtml(brief)}</p></details></div>`
  return bare ? card : lifecycleCardIsland(card)
}

function renderActionButtons(requestId: string, context: NativeSurfaceRenderContext, baseSurfaceId: string, state: 'pending' | 'active' | 'failed' | 'repair' | 'resolved', rootTag = ''): string {
  if (!context.messageId) return ''
  const common = `data-rrn-message-id="${escapeAttr(context.messageId)}" data-rrn-swipe-id="${escapeAttr(String(context.swipeId ?? ''))}" data-rrn-chat-id="${escapeAttr(context.chatId)}" data-rrn-request-id="${escapeAttr(requestId)}" data-rrn-surface-id="${escapeAttr(baseSurfaceId)}" data-rrn-root-tag="${escapeAttr(rootTag)}"`
  const rescan = `<button type="button" data-rrn-action="rescan" ${common}>Rescan</button>`
  if (state === 'resolved') return `<button type="button" data-rrn-action="regenerate" ${common}>Regenerate</button><button type="button" data-rrn-action="reparse" ${common}>Reparse</button>${rescan}`
  if (state === 'repair') return `<button type="button" data-rrn-action="repair-placement" ${common}>Repair / Reinsert</button><button type="button" data-rrn-action="reparse" ${common}>Reparse</button>${rescan}`
  if (state === 'failed') return `<button type="button" data-rrn-action="regenerate" ${common}>Regenerate</button><button type="button" data-rrn-action="reparse" ${common}>Reparse</button>${rescan}`
  if (state === 'active') return `<button type="button" data-rrn-action="abort" ${common}>Abort</button><button type="button" data-rrn-action="regenerate" ${common}>Regenerate</button><button type="button" data-rrn-action="reparse" ${common}>Reparse</button>${rescan}`
  return `<button type="button" data-rrn-action="retry" ${common}>Generate now</button><button type="button" data-rrn-action="reparse" ${common}>Reparse</button>${rescan}`
}

function shell(baseSurfaceId: string, title: string, subtitle: string, inner: string, preset: CustomSurfaceDefinition | undefined, context: NativeSurfaceRenderContext, extraClass = ''): string {
  const shellMode: SurfaceShellMode = context.defaultShellMode || preset?.shellMode || defaultShellMode(baseSurfaceId)
  const defaultOpen = preset?.defaultOpen === true
  const densityClass = preset?.density === 'compact' ? 'rrn-compact' : preset?.density === 'spacious' ? 'rrn-spacious' : ''
  const width = sanitizeCssLength(preset?.maxWidth || '760px')
  const fit = preset?.mediaFit === 'cover' ? 'cover' : 'contain'
  const accent = preset?.accentMode === 'custom' && /^#[0-9a-f]{3,8}$/i.test(preset.customAccent || '') ? preset.customAccent : ''
  const style = `--rrn-width:${escapeAttr(width)};--rrn-fit:${fit};${accent ? `--rrn-accent:${escapeAttr(accent)};` : ''}`
  const presetId = preset?.surfaceId || `${baseSurfaceId}-builtin`
  const classes = `rrn-root rrn-surface ${densityClass} ${extraClass}`.trim()
  const body = `<div class="rrn-body">${inner}</div>`
  const customCss = safePresetCss(preset)
  if (shellMode === 'collapsible') {
    return `<div class="rrn-native-island">${NATIVE_SURFACE_CSS}${SHIPPED_SURFACE_CSS}<div class="${classes}" style="${style}" data-rrn-surface="${escapeAttr(baseSurfaceId)}" data-rrn-preset="${escapeAttr(presetId)}"><details class="rrn-shell rrn-collapsible"${defaultOpen ? ' open' : ''}><summary><span>${escapeHtml(preset?.launcherLabel || title)}</span><small class="rrn-sub">${escapeHtml(subtitle)}</small></summary>${body}</details>${customCss}</div></div>`
  }
  return `<div class="rrn-native-island">${NATIVE_SURFACE_CSS}${SHIPPED_SURFACE_CSS}<div class="${classes}" style="${style}" data-rrn-surface="${escapeAttr(baseSurfaceId)}" data-rrn-preset="${escapeAttr(presetId)}"><section class="rrn-shell rrn-inline"><div class="rrn-body"><div class="rrn-kicker">${escapeHtml(subtitle)}</div><div class="rrn-title">${escapeHtml(title)}</div>${inner}</div></section>${customCss}</div></div>`
}

function activePreset(studio: CustomSurfaceStudioState, baseSurfaceId: string): CustomSurfaceDefinition | undefined {
  const id = studio.activePresetIds?.[baseSurfaceId]
  if (id && studio.definitions[id]?.enabled !== false) return studio.definitions[id]
  const exact = studio.definitions[baseSurfaceId]
  if (exact?.enabled !== false) return exact
  return Object.values(studio.definitions).find(definition => definition.baseSurfaceId === baseSurfaceId && definition.enabled !== false)
}

function defaultShellMode(baseSurfaceId: string): SurfaceShellMode {
  return ['smartphone', 'twitter', 'kakao', 'news', 'dispatch'].includes(baseSurfaceId) ? 'collapsible' : 'inline'
}

function safePresetCss(preset: CustomSurfaceDefinition | undefined): string {
  const css = preset?.advancedCss?.trim()
  if (!css) return ''
  if (/<\/style|<script|javascript:|@import/i.test(css)) return ''
  const presetId = preset?.surfaceId || ''
  if (!presetId) return ''
  const required = `.rrn-surface[data-rrn-preset="${presetId}"]`
  if (!css.includes(required)) return ''
  return `<style data-rrn-preset-style="${escapeAttr(presetId)}">${css}</style>`
}

function sanitizeCssLength(value: string): string {
  const clean = value.trim()
  return /^(?:\d+(?:\.\d+)?(?:px|rem|em|%|vw)|min\([^;{}]+\)|clamp\([^;{}]+\))$/i.test(clean) ? clean : '760px'
}

function parseAttrs(raw: string): Record<string, string> {
  const out: Record<string, string> = {}
  const re = /([A-Za-z_:][A-Za-z0-9_.:-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/g
  let match: RegExpExecArray | null
  while ((match = re.exec(String(raw || ''))) !== null) out[match[1]] = match[2] ?? match[3] ?? match[4] ?? ''
  return out
}

function firstTagText(body: string, tagName: string): string {
  const match = new RegExp(`<${escapeRegExp(tagName)}\\b[^>]*>([\\s\\S]*?)</${escapeRegExp(tagName)}>`, 'i').exec(body)
  return match?.[1]?.trim() || ''
}

function firstTagMatch(body: string, tagName: string): { attrs: string; body: string } | null {
  const match = new RegExp(`<${escapeRegExp(tagName)}\\b([^>]*)>([\\s\\S]*?)</${escapeRegExp(tagName)}>`, 'i').exec(body)
  return match ? { attrs: match[1] || '', body: match[2] || '' } : null
}

function allTagMatches(body: string, tagName: string): Array<{ attrs: string; body: string }> {
  const out: Array<{ attrs: string; body: string }> = []
  const re = new RegExp(`<${escapeRegExp(tagName)}\\b([^>]*)>([\\s\\S]*?)</${escapeRegExp(tagName)}>`, 'gi')
  let match: RegExpExecArray | null
  while ((match = re.exec(body)) !== null) out.push({ attrs: match[1] || '', body: match[2] || '' })
  return out
}

function firstDivByClass(body: string, className: string): string {
  const re = new RegExp(`<div\\b(?=[^>]*\\bclass=(?:"[^"]*\\b${escapeRegExp(className)}\\b[^"]*"|'[^']*\\b${escapeRegExp(className)}\\b[^']*'))[^>]*>([\\s\\S]*?)</div>`, 'i')
  return re.exec(body)?.[1]?.trim() || ''
}

function removeNestedTag(body: string, tagName: string): string {
  return body.replace(new RegExp(`<${escapeRegExp(tagName)}\\b[^>]*>[\\s\\S]*?</${escapeRegExp(tagName)}>`, 'gi'), '')
}

function stripKnownTags(body: string, tagNames: string[]): string {
  let value = body
  for (const tag of tagNames) value = removeNestedTag(value, tag)
  return value
}

function removeMediaMarkup(body: string): string {
  let value = body
  for (const tag of ['image_request', 'image_request_error', 'ig_media', 'ig_slide', 'tw_media', 's_img', 'k_img']) value = removeNestedTag(value, tag)
  value = value.replace(/<img\b[^>]*>/gi, '')
  return value
}

function firstSceneBrief(body: string): string {
  const request = firstTagMatch(body, 'image_request')
  return request ? firstTagText(request.body, 'scene_brief') || firstTagText(request.body, 'prompt') || stripMarkup(request.body) : ''
}

function firstRequestId(body: string): string {
  const request = firstTagMatch(body, 'image_request')
  if (request) { const attrs = parseAttrs(request.attrs); return attrs.id || attrs.request_id || '' }
  const img = /<img\b([^>]*)>/i.exec(body)
  if (img) return parseAttrs(img[1])['data-dgir-request-id'] || ''
  return ''
}

function firstRequestAspect(body: string): string {
  const request = firstTagMatch(body, 'image_request')
  return request ? parseAttrs(request.attrs).aspect || '' : ''
}

function renderFieldTags(body: string): string {
  const rows: string[] = []
  const re = /<([A-Za-z][A-Za-z0-9_-]*)\b[^>]*>([\s\S]*?)<\/\1>/g
  let match: RegExpExecArray | null
  while ((match = re.exec(body)) !== null) rows.push(`<div class="rrn-meta"><b>${escapeHtml(titleCase(match[1].replace(/^(?:sc-)/, '').replace(/-/g, ' ')))}</b><span>${sanitizeInline(match[2])}</span></div>`)
  return rows.join('') || sanitizeInline(body)
}

function sanitizeParagraphs(value: string): string {
  const paragraphs = allTagMatches(value, 'p')
  if (paragraphs.length) return paragraphs.map(row => `<p>${sanitizeInline(row.body)}</p>`).join('')
  return String(value || '').split(/\n{2,}/).filter(Boolean).map(part => `<p>${sanitizeInline(part)}</p>`).join('')
}

function sanitizeInline(value: string): string {
  return String(value || '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*')/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/<(?!\/?(?:b|strong|em|i|small|span|br|time|code)\b)[^>]+>/gi, '')
}

function stripMarkup(value: string): string {
  return decodeEntities(String(value || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim())
}

function decodeEntities(value: string): string {
  return value.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&')
}

function escapeHtml(value: string): string {
  return String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

function escapeAttr(value: string): string { return escapeHtml(value) }
function escapeRegExp(value: string): string { return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') }
function initial(value: string): string { return stripMarkup(value).trim().slice(0, 1).toUpperCase() || 'R' }
function titleCase(value: string): string { return value.replace(/\b\w/g, char => char.toUpperCase()) }
