import type { SpindleFrontendContext, SpindleFloatWidgetHandle } from 'lumiverse-spindle-types'
import { emptyPhoneDevice, phoneConversation, phoneUnread, type PhoneCommand, type PhoneDeviceState, type PhoneIdentity, type PhoneLocalAppMedia } from './phoneDevice'
import {phoneStoryScope,resolvePhoneParticipant} from './phoneStoryBridge'
import {PHONE_FRAMING,phoneFramingCue} from './phoneMedia'
import {phoneAppInteractionMode} from './phoneAppInteractions'
import {surfaceIconMarkup} from './surfaceIcons'
import {PHONE_APP_PRESENTATION_CSS,applyPhoneAppDarkTheme} from './phoneAppPresentation'
import {mountPhoneAppControls} from './phoneAppControls'
import type {PhoneSourceBubble} from './phoneAppBubbles'
import {phoneAvatar,mountPhoneConversationPicker,PHONE_ACCOUNTS_CSS,type PhoneConversationChoice} from './phoneAppAccounts'
import { normalizePhoneIncoming, type PhoneIncomingSettings } from './phoneIncomingSettings'
import {shouldDeferPanelRenderForControl} from './panelRenderPolicy'
import { appendPhoneDraftToComposer, phoneContextDraft } from './phoneComposerDraft'
import { createPhoneLoadRecovery } from './phoneLoadRecovery'
import {applyPhonePreferences,normalizePhonePreferences} from './phonePreferences'
import { phoneOperationId } from './phoneOperationId'

type SavedRecord = { entryId: string; ownerName: string; kind: string; app: string; title: string; body: string; storyTimeLabel?: string; imageUrl?: string }
type CoreApp={id:string;label:string;icon:string}
type CoreRecord={id:string;appId:string;messageId:string;swipeId:number;ownerName?:string;ownerId?:string;local?:boolean;title:string;media?:PhoneLocalAppMedia[]}
const CORE_APP_LABELS:Record<string,string>={'forum-thread':'Forum','email-thread':'Mail','imessage-chat':'iMessage','workspace-chat':'Workspace','livestream':'Twitch','dating-profile':'Tinder','public-bulletin':'News','case-file':'Case Files','relationship-map':'Relationships','instagram-dm':'Instagram DM','x-dm':'X Messages','discord-dm':'Discord DM','discord-server':'Discord','google-images':'Google Images','phone-gallery':'Gallery','tiktok-post':'TikTok','naver-article':'Naver','inline-chat':'Chat','smartphone':'SMS','instagram':'Instagram','twitter':'X','youtube-thumbnail':'YouTube','character-profile':'Cast','music-player':'Music','location-share':'Maps','voice-memo':'Voice Memos','notes-app':'Notes','market-listing':'Marketplace','property-listing':'Properties','codex-entry':'Reference','diary-app':'Diary','instagram-profile':'IG Profile','twitter-profile':'X Profile','instagram-stories':'IG Stories'}
type PhoneProjection = { type: 'phone_state'; chatId: string; operationId: string; state: PhoneDeviceState; identities: PhoneIdentity[]; connections: Array<{ id: string; name: string; model: string }>; imageConnections?:Array<{id:string;name:string;model:string;isDefault?:boolean}>; saved: SavedRecord[]; apps?:CoreApp[];appRecords?:CoreRecord[]; incomingTransport?:'native'|'xml'; error?: string }
const PHONE_ICON = '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><rect x="6" y="2" width="12" height="20" rx="3"/><path d="M10 5h4M10 19h4"/></svg>'
const svg = (body:string) => `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`
const APP_ICONS: Record<string,string> = {
  messages:svg('<path fill="currentColor" stroke="none" d="M16 5C9.4 5 4 9.4 4 14.8c0 3.1 1.8 5.9 4.7 7.7l-1 4.5 5.1-2.7c1 .2 2.1.3 3.2.3 6.6 0 12-4.4 12-9.8S22.6 5 16 5Z"/>'),
  contacts:svg('<rect x="5" y="4" width="22" height="24" rx="4"/><circle cx="16" cy="12" r="4"/><path d="M9 23c0-6 14-6 14 0M3 9h3M3 16h3M3 23h3"/>'),
  photos:'<svg viewBox="0 0 32 32" aria-hidden="true">'+['#f08eb9','#e65d7b','#ec8d50','#e8bf56','#67b48d','#5facc7','#737bd3','#ad78bd'].map((color,index)=>`<ellipse cx="16" cy="10" rx="4.2" ry="7" fill="${color}" opacity=".92" transform="rotate(${index*45} 16 16)"/>`).join('')+'</svg>',
  saved:svg('<path d="M7 3h13l5 5v21H7zM20 3v6h5M11 14h10M11 19h10M11 24h7"/>'),
  settings:svg('<path d="m13 3 6 0 1 4 4 2 4-1 3 5-3 3 0 4 3 3-3 5-4-1-4 2-1 4-6 0-1-4-4-2-4 1-3-5 3-3 0-4-3-3 3-5 4 1 4-2z" transform="translate(2 0) scale(.83)"/><circle cx="16" cy="16" r="5"/>'),
  apps:svg('<rect x="4" y="4" width="9" height="9" rx="2"/><rect x="19" y="4" width="9" height="9" rx="2"/><rect x="4" y="19" width="9" height="9" rx="2"/><rect x="19" y="19" width="9" height="9" rx="2"/>'),
}
const STATUS_ICONS='<svg viewBox="0 0 64 20" width="62" height="20" aria-hidden="true"><g fill="currentColor"><rect x="1" y="12" width="3" height="5" rx=".7"/><rect x="6" y="9" width="3" height="8" rx=".7"/><rect x="11" y="6" width="3" height="11" rx=".7"/><rect x="16" y="3" width="3" height="14" rx=".7"/></g><g fill="none" stroke="currentColor" stroke-width="1.5"><path d="M23 7q7-7 14 0M26 10q4-4 8 0M29 13q1-1 2 0"/><rect x="42" y="5" width="18" height="10" rx="2"/></g><rect x="44" y="7" width="12" height="6" rx="1" fill="currentColor"/><path d="M62 8v4" stroke="currentColor" stroke-width="1.5"/></svg>'
// Spindle's placement wraps the extension root in a content div and a fixed
// widget. Raise only our handset above the drawer, below host modal dialogs.
export const phoneHostLayerCss = `
div:has(> div > [data-reverie-phone-ui="handset"]) { z-index: 9993; }
`
export const phoneWidgetCss = `
:host { color-scheme: dark; font: 14px/1.45 system-ui,sans-serif; color: #f6f2fa; }
* { box-sizing: border-box; } button,select,textarea { font: inherit; } button { cursor:pointer; color:inherit; } button:disabled { opacity:.45; cursor:default; }
button:focus-visible,select:focus-visible,textarea:focus-visible { outline:2px solid #f29dbb; outline-offset:3px; }
.launcher { width:52px;height:52px;border:1px solid #ab5874;border-radius:18px;background:#241622;box-shadow:0 5px 22px #0008;position:relative;display:grid;place-items:center; }
.badge { position:absolute;right:0;top:0;border-radius:12px;padding:1px 5px;background:#b73e69;font-size:10px; }
.launcher.is-vibrating { animation:reverie-phone-vibrate 520ms ease-in-out;transform-origin:50% 65%; }
@keyframes reverie-phone-vibrate { 0%,100%{transform:translateX(0) rotate(0)} 12%,36%,60%{transform:translateX(-2px) rotate(-9deg)} 24%,48%,72%{transform:translateX(2px) rotate(9deg)} 84%{transform:translateX(-1px) rotate(-4deg)} }
.badge.is-arriving { animation:reverie-phone-badge 180ms ease-out; }
@keyframes reverie-phone-badge { from{transform:scale(.6);opacity:0} to{transform:scale(1);opacity:1} }
.glyph{position:relative}.glyph .badge,.launcher .badge{min-width:18px;text-shadow:none;color:white;background:#e34863;border:2px solid #17131d;line-height:15px;font-weight:700}.notification{display:block;width:100%;text-align:left;padding:12px;border:1px solid #8d617e;border-radius:16px;background:#37273feF;color:#fff;margin:0 0 12px;overflow-wrap:anywhere}.notification strong,.notification small{display:block}.notification small{color:#dbc6e0;margin-top:4px}.bell{position:relative}.photo-message{display:block;width:100%;max-width:270px;border-radius:12px;margin:5px 0}.image-panel{padding:16px}.image-panel select,.app-compose select{width:100%;padding:9px;margin:7px 0;background:#24202b;color:inherit;border:1px solid #49354d;border-radius:10px}.image-panel textarea{min-height:140px}.image-actions{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0}.app-compose{padding:14px;border-top:1px solid #62425e;background:#17131d}.app-comment{padding:10px 0;border-bottom:1px solid #33273a;overflow-wrap:anywhere}.app-comment p{white-space:pre-wrap;margin:5px 0}.image-state{font-size:12px;color:#dcc0d4}
.shade { width:100%;height:100%;display:grid;grid-template-rows:minmax(0,1fr);grid-template-columns:minmax(0,1fr);place-items:center;background:#07060b70;padding:14px; }
.hardware { position:relative;width:min(390px,100%);height:min(780px,calc(100dvh - 28px));padding:7px;background:linear-gradient(110deg,#55505c,#151319 16%,#211e26 80%,#706a75);border:1px solid #8b818e;border-radius:47px;box-shadow:0 28px 80px #000a,inset 0 0 0 2px #060607; }
.hardware::before,.hardware::after { content:'';position:absolute;width:3px;background:linear-gradient(90deg,#625969,#17151c);border-radius:3px; }
.hardware::before { left:-3px;top:108px;height:72px;box-shadow:0 84px 0 #35303d; } .hardware::after { right:-3px;top:154px;height:90px; }
.phone { width:100%;height:100%;display:flex;flex-direction:column;overflow:hidden;background:#101018;border:2px solid #030304;border-radius:39px;position:relative; }
.top { position:relative;display:flex;justify-content:space-between;align-items:center;padding:12px 23px 4px;min-height:46px;font-size:14px;font-weight:650;color:#f4f1f6;z-index:1;flex-shrink:0; }
.island { position:absolute;left:50%;transform:translateX(-50%);top:8px;width:108px;height:29px;border-radius:20px;background:#030305;box-shadow:inset 0 0 0 1px #ffffff05; }
.island::after { content:'';position:absolute;right:11px;top:9px;width:9px;height:9px;background:radial-gradient(circle at 40% 40%,#22324a,#090c13 65%);border-radius:50%; }
.head { display:flex;align-items:center;gap:8px;padding:14px 16px;border-bottom:1px solid #302936;min-width:0; }
.head strong { flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:18px; }
.icon { border:0;background:#24202b;border-radius:10px;min-width:34px;min-height:34px; }
.owner { width:100%;padding:10px 16px;background:#16131c;border:0;color:#eed6e0; }
.screen { flex:1;min-height:0;overflow:auto;padding:16px;overscroll-behavior:contain; }
.grid { display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px; }
.app-grid { grid-template-columns:repeat(4,minmax(0,1fr));gap:14px 9px;padding-top:10px; }
.app { min-width:0;min-height:78px;padding:0;background:transparent;border:0;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;gap:7px;font-size:10px;text-align:center;text-shadow:0 1px 3px #0008; }
.core-icon .rr-surface-svg-icon{display:grid;place-items:center;width:29px;height:29px}.core-icon svg{width:100%;height:100%}.app-label{width:100%;line-height:1.25;overflow-wrap:anywhere}.app-pages{display:flex;justify-content:center;align-items:center;gap:14px;margin:12px 0}.app-pages button{padding:6px 10px;font-size:12px}.app-pages span{font-size:11px;color:#d5c3d8}.core-screen{padding:0!important}.core-history{margin:0;padding:8px 12px;background:#17131d;font-size:11px}.core-history summary{cursor:pointer;color:#cabcd3}.core-history select{width:100%;margin-top:8px;padding:7px;background:#24202b;color:inherit;border:1px solid #49354d;border-radius:8px}.core-empty{padding:20px}.core-app-view{width:100%;min-width:0}
.core-screen{display:flex;flex-direction:column;overflow:hidden}.core-history{flex-shrink:0}.core-app-view{flex:1;min-height:0;height:100%;overflow:hidden}.saved pre{white-space:pre-wrap;overflow-wrap:anywhere;font-size:12px}.saved summary{cursor:pointer}
.glyph { width:54px;height:54px;border-radius:14px;display:grid;place-items:center;box-shadow:0 4px 10px #0003,inset 0 1px 0 #fff4;background:linear-gradient(145deg,#7e798b,#393442);color:white; }
.glyph svg { width:34px;height:34px; } .app-messages .glyph { background:linear-gradient(160deg,#6bd878,#20a34b); } .app-contacts .glyph { background:linear-gradient(160deg,#c6b5a0,#8a7967); } .app-photos .glyph { background:#f9f6fb; } .app-saved .glyph { background:linear-gradient(160deg,#ead4aa,#aa8654); } .app-settings .glyph { background:linear-gradient(160deg,#b9bdc8,#5f6473); }
.glyph .rr-surface-svg-icon{width:34px;height:34px;display:grid;place-items:center;line-height:0}.glyph .rr-surface-svg-icon>svg{display:block;width:100%;height:100%}
.home-screen { padding-top:12px;background:radial-gradient(ellipse at 22% 26%,#df528740,transparent 60%),radial-gradient(ellipse at 95% 70%,#6454aa70,transparent 64%),linear-gradient(150deg,#312338,#13131f 75%); }
.home-date { text-align:center;font-size:14px;color:#f4e6f1;margin:8px 0 15px; }.home-head { border-bottom:0;background:#312338; }.home-head .icon:first-child { visibility:hidden; }.home-head strong { text-align:center;font-weight:600;font-size:18px; }.home-phone .owner { background:#312338;color:#dac7dc;font-size:11px; }
.home-phone .top { background:#312338; }.home-phone .footer { background:#242037; }.phone-dock { display:grid;grid-template-columns:repeat(3,1fr);gap:5px;padding:14px 16px 3px;background:#373044;border-top:1px solid #ffffff0d; }.phone-dock .app { min-height:77px; }.phone-dock .glyph { width:48px;height:48px;border-radius:13px; }
.app-activity-thread{display:flex;flex-direction:column;gap:4px;min-height:0;overflow:auto;padding:8px 0 18px}.app-activity-source{display:block;width:100%;padding:11px 12px;border:1px solid #ffffff19;border-radius:14px;background:#1e1b27;color:#f4f1f7;text-align:left;white-space:pre-wrap;overflow-wrap:anywhere}.app-activity-source.self{margin-left:auto;max-width:88%;background:#233956;border-color:#385a7e}.app-activity-source small{display:block;margin-bottom:4px;color:#c9bfd1;font-size:11px}.app-activity-compose{display:flex;flex-direction:column;gap:8px;padding:10px 0 4px;border-top:1px solid #ffffff1d}.app-activity-compose textarea{min-height:48px;max-height:130px}.resize-menu{position:absolute;z-index:20;top:58px;left:50%;transform:translateX(-50%);width:min(286px,calc(100% - 26px));padding:12px;border:1px solid #765068;border-radius:16px;background:#17131dee;box-shadow:0 14px 38px #000b;backdrop-filter:blur(14px)}.resize-menu[hidden]{display:none}.resize-menu strong{display:block;margin-bottom:9px}.resize-presets{display:flex;gap:6px}.resize-presets button{flex:1;min-height:36px;padding:6px;border:1px solid #ffffff24;border-radius:10px;background:#282130;color:#f5e9f1;font-size:12px}.resize-menu label{margin:10px 0 4px}.resize-menu input[type=range]{width:100%;accent-color:#d76a97}
.muted { color:#b1a6b9;font-size:12px; } .intro { margin:0 0 18px;color:#bdb2c5; }
.row { display:flex;align-items:center;gap:12px;padding:14px 10px;border-bottom:1px solid #302936;width:100%;text-align:left;background:transparent;border-top:0;border-left:0;border-right:0; }
.avatar { width:40px;height:40px;border-radius:14px;display:grid;place-items:center;flex-shrink:0;background:#3b2845;color:#edacc7; }
.rowtext { min-width:0;flex:1; } .rowtext strong,.rowtext small { display:block;overflow-wrap:anywhere; } .rowtext small { margin-top:3px;color:#a99fb3; }
.bubble { width:fit-content;max-width:86%;padding:10px 13px;margin:9px 0;border-radius:18px 18px 18px 5px;background:#282333;white-space:pre-wrap;overflow-wrap:anywhere; }
.bubble.self { margin-left:auto;border-radius:18px 18px 5px 18px;background:#853655; }
.time { font-size:10px;opacity:.65;margin-top:4px;display:block; }
.compose { display:flex;gap:8px;align-items:flex-end;padding:12px 14px;border-top:1px solid #302936;background:#17131d; }
textarea { width:100%;min-height:44px;resize:vertical;max-height:140px;color:#f6f2fa;border:1px solid #49354d;border-radius:14px;background:#24202b;padding:11px; }
.compose textarea { resize:none; } .primary { background:#a8416d;border:0;border-radius:13px;padding:11px 14px;min-height:44px; }
.secondary { background:#282130;border:1px solid #59405e;border-radius:12px;padding:9px 12px; }
.notice { color:#ffd0da;background:#381b29;padding:10px 14px;font-size:12px;overflow-wrap:anywhere; }
.footer { height:23px;display:grid;place-items:center;flex-shrink:0; } .footer::after { content:'';width:95px;height:4px;border-radius:8px;background:#bdb5c5; }
label { display:block;color:#d7c9e0;font-size:12px;margin:12px 0 7px; } .settings select { padding:11px;width:100%;background:#24202b;border:1px solid #49354d;border-radius:12px;color:inherit; }
.settings textarea { min-height:160px; } .photo { width:100%;aspect-ratio:1;object-fit:cover;display:block;border-radius:16px;background:#201a27; } figure { margin:0;min-width:0; } figcaption { margin:6px 0 12px;font-size:12px;overflow-wrap:anywhere; } .saved { padding:12px 0;border-bottom:1px solid #302936; } .saved strong { display:block; } .saved p { margin:5px 0;white-space:pre-wrap;overflow-wrap:anywhere; }
@media(max-width:520px) { .shade { padding:max(12px,env(safe-area-inset-top)) max(12px,env(safe-area-inset-right)) max(12px,env(safe-area-inset-bottom)) max(12px,env(safe-area-inset-left)); } .hardware { width:min(390px,100%);height:min(780px,100%); } .screen { padding:12px; } .top { padding-left:18px;padding-right:18px; } .island { width:96px; } }
@media(prefers-reduced-motion:reduce) { * { scroll-behavior:auto!important;animation:none!important; } }
`
const node = <K extends keyof HTMLElementTagNameMap>(tag: K, className = '', content = '') => { const el = document.createElement(tag); el.className = className; el.textContent = content; return el }
const btn = (label: string, action: () => void, className = 'secondary') => { const el = node('button', className, label); el.type = 'button'; el.addEventListener('click', action); return el }
function shadow(root: HTMLElement) { const result = root.shadowRoot || root.attachShadow({ mode: 'open' }); const style = node('style'); style.textContent = phoneWidgetCss+PHONE_ACCOUNTS_CSS; result.append(style); return result }
export function mountPhoneWidget(ctx: SpindleFrontendContext, options:{enabled?:boolean;onSettings?:()=>void}={}) {
  let enabled=options.enabled!==false
  let settingsRoot:ShadowRoot|null=null
  let knownDelivered:Set<string>|null=null;let notificationTimer:number|null=null;let badgeCount=0;let badgeArriving=false
  let chatId: string | null = ctx.getActiveChat().chatId
  let data: PhoneProjection | null = null
  let owner = ''; let peer = ''; let page = 'home'; let error = ''; let overlay: SpindleFloatWidgetHandle | null = null
  let overlayRoot: ShadowRoot | null = null; let selectedOperation = ''; let draft = ''; let sceneDraft: string | null = null; let connectionDraft: string | null = null
  let disposed = false; let submitting = ''; let handingOff = ''; let viewportHandler: (() => void) | null = null
  let submittedDraft: { owner:string; peer:string; text:string } | null = null
  let requestedThread:{from:string;to:string;scope?:string}|null=null
  let coreAppId='';let coreRecordId='';let coreHtml='';let coreLoading=''
  let localAppBrief='';let localCreating='';let localCreateOwner='';let localCreateApp=''
  const appImageRetryOperations=new Map<string,{key:string;recordId:string;appId:string}>(),appImageRetriesInFlight=new Set<string>()
  const appImageRetryKey=(recordId:string,mediaId:string)=>JSON.stringify([recordId,mediaId])
  let homePage=0
  let imagePromptDraft='';let imageCaption='';let imageFraming='auto';let imageConnection='';let imageSender='';let imageRecipient='';let imageMessageId='';let imageOperation=''
  let appDraft='';let appReplyActor='';let appPosting=''
  const appDrafts=new Map<string,Map<string,string>>()
  const appResponders=new Map<string,Map<string,string>>()
  const viewedThreadReplies=new Map<string,string>()
  let portraitActor='';let portraitPrompt='';let portraitConnection='';let portraitOperation=''
  let coreBubbles:PhoneSourceBubble[]=[]
  let selectedBubble:{id:string;targetId?:string;app:boolean}|null=null
  let appTargetId='';let appTargets:Array<{id:string;label:string;replyActorId?:string}>=[]
  let contactName='';let contactDescription='';let contactSaving=''
  let contextModeDraft:'automatic'|'manual'|null=null
  let autoReplyDraft:boolean|null=null
  let incomingDraft:PhoneIncomingSettings|null=null
  let settingsSaving='';let settingsFeedback='';let settingsEdit=0;let savingEdit=0
  let connectionSaving='';let connectionFeedback=''
  let loadError=''
  let resizeMenuOpen=false,bubbleReturnPage='core-app',longPressTimer:number|null=null
  const PHONE_SCALE_KEY='reverie-phone-scale-v1'
  let phoneScale=1
  try{const stored=Number(window.localStorage.getItem(PHONE_SCALE_KEY));if(Number.isFinite(stored)&&stored>=.8&&stored<=1.2)phoneScale=stored}catch{}
  function applyPhoneScale(hardware:HTMLElement){const scale=Math.min(phoneScale,Math.max(.1,(window.innerWidth-28)/390),Math.max(.1,(window.innerHeight-28)/780));hardware.style.width=`${390*scale}px`;hardware.style.height=`${780*scale}px`}
  function setPhoneScale(value:number,save=true){phoneScale=Math.max(.8,Math.min(1.2,Math.round(value*100)/100));if(save)try{window.localStorage.setItem(PHONE_SCALE_KEY,String(phoneScale))}catch{};const hardware=overlayRoot?.querySelector<HTMLElement>('.hardware');if(hardware)applyPhoneScale(hardware);const slider=overlayRoot?.querySelector<HTMLInputElement>('.resize-menu input[type=range]');if(slider)slider.value=String(Math.round(phoneScale*100));const output=overlayRoot?.querySelector<HTMLOutputElement>('.resize-value');if(output)output.value=`${Math.round(phoneScale*100)}%`}
  function openResizeMenu(){resizeMenuOpen=true;render()}
  const loadRecovery=createPhoneLoadRecovery({
    request:()=>send('load'),
    exhausted:()=>{loadError='The phone connection did not respond. Retry when connected; your saved phones were not changed.';render()},
    failed:cause=>{loadError=`Phone connection unavailable: ${cause instanceof Error?cause.message:String(cause)}`;render()},
  })
  function loadPhone(){if(!enabled&&!settingsRoot)return;loadError='';loadRecovery.start()}
  const launcher = ctx.ui.createFloatWidget({ width:52, height:52, chromeless:true, snapToEdge:true, tooltip:'Open Reverie Phone', initialPosition:{ x:Math.max(8, window.innerWidth - 70), y:Math.max(16, window.innerHeight - 180) } })
  launcher.root.setAttribute('data-reverie-phone-ui','launcher')
  let launcherVisible = true
  const launcherRoot = shadow(launcher.root)
  const launchButton = btn('', () => open(), 'launcher'); launchButton.innerHTML = PHONE_ICON; launchButton.setAttribute('aria-label', 'Open Reverie Phone'); launcherRoot.append(launchButton)
  function send(action: PhoneCommand['action'], patch: Partial<PhoneCommand> = {}) {
    if (!chatId || (!enabled&&!['load','settings'].includes(action))) return ''
    const operationId = phoneOperationId()
    if(action!=='load')selectedOperation = operationId
    ctx.sendToBackend({ type:'reverie_phone_command', action, chatId, operationId, ...patch })
    return operationId
  }
  function close() { loadRecovery.stop();if(longPressTimer!==null)window.clearTimeout(longPressTimer);longPressTimer=null;resizeMenuOpen=false;overlay?.destroy(); overlay = null; overlayRoot = null; if (viewportHandler) window.visualViewport?.removeEventListener('resize', viewportHandler); viewportHandler = null; launchButton.focus() }
  function useInStory(from?:string,to?:string) {
    if(!enabled||!data||ctx.getActiveChat().chatId!==chatId)return
    const context=phoneContextDraft(data.state,identities(),from,to)
    if(!context||!appendPhoneDraftToComposer(context)){error=context?'Main story composer is unavailable. Nothing was sent.':'No delivered phone texts to add yet.';render();return}
    close();document.querySelector<HTMLTextAreaElement>('textarea[name="chat-message"]')?.focus()
  }
  function open(target?:{from:string;to:string;scope?:string}) {
    if (disposed || !enabled || !chatId) return
    requestedThread=target||null
    if (!overlay) {
      overlay = ctx.ui.createFloatWidget({ fullscreen:true, chromeless:true, width:window.innerWidth, height:window.innerHeight })
      overlay.root.setAttribute('data-reverie-phone-ui','handset')
      overlayRoot = shadow(overlay.root)
      viewportHandler = () => {
        const viewport = window.visualViewport
        if (overlayRoot && viewport) { const shade = overlayRoot.querySelector<HTMLElement>('.shade'); if (shade) { shade.style.height = `${viewport.height}px`; shade.style.transform = `translateY(${viewport.offsetTop}px)` } }
      }
      window.visualViewport?.addEventListener('resize', viewportHandler)
      overlayRoot.addEventListener('keydown', event => {
        const key = event as KeyboardEvent
        if (key.key === 'Escape') { if(resizeMenuOpen){resizeMenuOpen=false;render();return} close(); return }
        if (key.key === 'Tab' && overlayRoot) {
          const focusable = Array.from(overlayRoot.querySelectorAll<HTMLElement>('button:not(:disabled),select,textarea,[tabindex="0"]'))
          const first = focusable[0], last = focusable[focusable.length - 1]
          if (key.shiftKey && overlayRoot.activeElement === first) { key.preventDefault(); last?.focus() }
          else if (!key.shiftKey && overlayRoot.activeElement === last) { key.preventDefault(); first?.focus() }
        }
      })
    }
    // The closeable shell must exist even if the backend bridge throws.
    render()
    loadPhone()
    overlayRoot?.querySelector<HTMLElement>('[aria-label="Close phone"]')?.focus()
  }
  function identities() { return data?.identities || [] }
  function currentOwner() { return identities().find(identity => identity.id === owner) }
  function appMemory(store:Map<string,Map<string,string>>){const key=JSON.stringify([owner,coreAppId,coreRecordId]);let memory=store.get(key);if(!memory){memory=new Map();store.set(key,memory)}return memory}
  function portraitEditor(actor:PhoneIdentity){portraitActor=actor.id;portraitPrompt=data?.state.portraits?.[actor.id]?.prompt||`Profile portrait of ${actor.name}, close portrait view, clear face and expression`;portraitConnection=data?.state.portraits?.[actor.id]?.connectionId||'';page='portrait';error='';render()}
  function conversationChoices():PhoneConversationChoice[]{
    const latest=new Map<string,CoreRecord>();for(const record of appRecords())latest.set(record.title.trim().toLocaleLowerCase(),record)
    return [...latest.values()].map(record=>{const actor=identities().find(actor=>[actor.name,...(actor.aliases||[])].some(name=>name.toLocaleLowerCase()===record.title.toLocaleLowerCase()));return {id:record.id,recordId:record.id,label:record.title,actorId:actor?.id}})
  }
  function saved() { return (data?.saved || []).filter(record => data?.state.linkedOwners?.[record.ownerName] === owner || [currentOwner()?.name, ...(currentOwner()?.aliases||[])].some(name => name?.toLocaleLowerCase() === record.ownerName.toLocaleLowerCase())) }
  function selectThread(id: string) { peer = id; page = 'thread'; draft = ''; error = ''; render(); send('read', { from:owner, to:peer }) }
  function openCoreRecord(record:CoreRecord,targetId=''){coreRecordId=record.id;coreHtml='';appTargetId=targetId;appTargets=[];send('read',{from:owner,recordId:record.id,appId:coreAppId,...(targetId?{targetId}:{})});coreLoading=send('app',{appId:coreAppId,recordId:record.id,from:owner,...(targetId?{targetId}:{})});appDraft='';error='';render()}
  function appRecords(){return (data?.appRecords||[]).filter(record=>record.appId===coreAppId&&(record.ownerId?record.ownerId===owner:(!record.ownerName||[currentOwner()?.name,...(currentOwner()?.aliases||[])].some(name=>name?.toLocaleLowerCase()===record.ownerName?.toLocaleLowerCase())||data?.state.linkedOwners[record.ownerName]===owner)))}
  function openCoreApp(app:CoreApp){coreAppId=app.id;coreHtml='';coreRecordId='';coreLoading='';error='';page='core-app';const latest=appRecords().at(-1);if(latest)openCoreRecord(latest);else render()}
  function coreAppIcon(app:CoreApp,index:number){const button=btn('',()=>openCoreApp(app),'app');button.setAttribute('aria-label',`Open Core app ${app.label}`);const icon=node('span','glyph core-icon');icon.style.background=`linear-gradient(145deg,hsl(${(index*47+205)%360} 58% 49%),hsl(${(index*47+240)%360} 50% 27%))`;icon.innerHTML=surfaceIconMarkup('core',app.id)||APP_ICONS.apps;button.append(icon,node('span','app-label',CORE_APP_LABELS[app.id]||app.label));return button}
  function unread(){return data?phoneUnread(data.state,identities().map(person=>person.id)):[]}
  function readVisibleThread(){
    if(!enabled||!overlayRoot||document.hidden||page!=='thread'||!owner||!peer)return
    const rows=unread().filter(entry=>entry.to===owner&&entry.from===peer)
    if(!rows.length)return
    const key=JSON.stringify([owner,peer]),fingerprint=JSON.stringify(rows.map(entry=>entry.id).sort())
    if(viewedThreadReplies.get(key)===fingerprint)return
    if(viewedThreadReplies.size>=100&&!viewedThreadReplies.has(key))viewedThreadReplies.delete(viewedThreadReplies.keys().next().value!)
    viewedThreadReplies.set(key,fingerprint);send('read',{from:owner,to:peer})
  }
  function appUnread(){
    const entries=data?.state.appInteractions||[],records=new Set((data?.appRecords||[]).map(record=>record.id))
    const parents=new Map<string,(typeof entries)[number]>()
    for(const entry of entries)if(!parents.has(entry.id))parents.set(entry.id,entry)
    return entries.filter(entry=>entry.replyTo&&records.has(entry.recordId)&&entry.createdAt>(data?.state.readAt[`app:${parents.get(entry.replyTo)?.from}:${entry.recordId}`]||0))
  }
  function unreadCount(){return unread().length+appUnread().length}
  function badge(icon:HTMLElement,count:number){if(count){const dot=node('span','badge',count>99?'99+':String(count));dot.setAttribute('aria-label',`${count} unread notifications`);icon.append(dot)}}
  function stopNotification(){if(notificationTimer!==null)window.clearTimeout(notificationTimer);notificationTimer=null;badgeArriving=false;launchButton.classList.remove('is-vibrating')}
  function registerIncoming(next:PhoneProjection){
    const delivered=next.state.messages.filter(entry=>entry.sourceActive!==false&&(!entry.image||entry.image.status==='ready'))
    if(knownDelivered===null){knownDelivered=new Set(delivered.map(entry=>entry.id));return}
    const unreadIds=new Set(phoneUnread(next.state,next.identities.map(actor=>actor.id)).map(entry=>entry.id))
    const fresh=delivered.some(entry=>!knownDelivered!.has(entry.id)&&unreadIds.has(entry.id)&&next.identities.some(actor=>actor.id===entry.from&&actor.kind!=='persona'))
    for(const entry of delivered)knownDelivered.add(entry.id)
    if(!enabled||!fresh)return
    if(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches){stopNotification();return}
    badgeCount=notificationTimer===null?unreadCount():badgeCount
    stopNotification();launchButton.classList.add('is-vibrating')
    notificationTimer=window.setTimeout(()=>{notificationTimer=null;launchButton.classList.remove('is-vibrating');badgeArriving=true;render();badgeArriving=false},530)
  }
  function imageComposer(message?:PhoneDeviceState['messages'][number]){imagePromptDraft=message?.image?.prompt||'';imageCaption=message?.body||'';imageFraming=PHONE_FRAMING.some(mode=>mode.id===message?.image?.framing)?message!.image!.framing:'auto';imageConnection=message?.image?.connectionId||'';imageSender=message?.from||owner;imageRecipient=message?.to||peer;imageMessageId=message?.id||'';page='image';error='';render()}
  function renderPhoneSettings(screen:HTMLElement) {
    if(!chatId){screen.append(node('p','intro','Open a saved character chat to configure its phones.'));return}
    if(!data){screen.append(node('p','intro',loadError||'Loading phone settings…'),btn('Retry',()=>{loadPhone();render()}));return}
    screen.classList.add('settings'); screen.append(node('p','intro','Phone preferences apply to all your chats. Replies use this connection—not the Illustrator or Assisted Repair connection. Inboxes and shared scene notes stay separate for each chat.'))
    screen.append(node('strong','','Incoming text transport: XML'),node('p','muted','This build uses XML only; Reverie registers no native phone function declarations. Incoming texts, replies, notifications and photos still work. Other extensions’ tools are not changed.'))
    const incoming=incomingDraft??normalizePhoneIncoming(data.state.incoming)
    const frequencyLabel=node('label','','Incoming text frequency');frequencyLabel.htmlFor='phone-incoming-frequency'
    const frequency=node('select');frequency.id='phone-incoming-frequency';frequency.setAttribute('aria-label','Incoming text frequency')
    for(const [value,title] of [['model','Model determined'],['every','Every eligible message'],['every-n','Every X messages']]){const option=node('option','',title);option.value=value;frequency.append(option)}frequency.value=incoming.frequency
    const intervalRow=node('div');const intervalLabel=node('label','',`Every ${incoming.everyN} eligible messages`);intervalLabel.htmlFor='phone-incoming-interval'
    const interval=node('input');interval.type='range';interval.id='phone-incoming-interval';interval.min='1';interval.max='100';interval.step='1';interval.value=String(incoming.everyN);interval.setAttribute('aria-label','Incoming text interval');interval.style.width='100%';intervalRow.append(intervalLabel,interval);intervalRow.hidden=incoming.frequency!=='every-n'
    const capLabel=node('label','',`Max notifications per response: ${incoming.maxNotifications}`);capLabel.htmlFor='phone-incoming-cap'
    const cap=node('input');cap.type='range';cap.id='phone-incoming-cap';cap.min='0';cap.max='10';cap.step='1';cap.value=String(incoming.maxNotifications);cap.setAttribute('aria-label','Max notifications per response');cap.style.width='100%'
    const updateIncoming=()=>{incomingDraft={frequency:frequency.value as PhoneIncomingSettings['frequency'],everyN:Number(interval.value),maxNotifications:Number(cap.value)};intervalRow.hidden=frequency.value!=='every-n';intervalLabel.textContent=`Every ${interval.value} eligible messages`;capLabel.textContent=`Max notifications per response: ${cap.value}`}
    frequency.addEventListener('change',updateIncoming);interval.addEventListener('input',updateIncoming);cap.addEventListener('input',updateIncoming)
    screen.append(frequencyLabel,frequency,intervalRow,capLabel,cap,node('p','muted','Applies to incoming texts authored in normal story replies, not phone-sidecar replies. Eligible responses have a confirmed character and persona. Every X counts saved story replies; previews do not advance it. Zero notifications disables incoming texts. The model receives these limits in {{reverie_phone}} (automatically injected unless placed in your preset).'))
    const label=node('label','','Phone reply connection'); label.htmlFor='phone-connection'
    const select=node('select'); select.id='phone-connection'; select.setAttribute('aria-label','Phone reply connection');const placeholder=node('option','','Choose a connection…');placeholder.value='';select.append(placeholder)
    for(const connection of data.connections){ const option=node('option','',`${connection.name} · ${connection.model}`); option.value=connection.id; select.append(option) }
    const selectedConnection=connectionDraft??data.state.connectionId??''
    if(selectedConnection&&!data.connections.some(connection=>connection.id===selectedConnection)){const unavailable=node('option','','Saved connection unavailable · choose another');unavailable.value=selectedConnection;select.append(unavailable)}
    select.value=connectionDraft??data.state.connectionId??''; select.addEventListener('change',()=>{
      connectionDraft=select.value;connectionSaving=send('settings',{connectionId:select.value||null})
      connectionFeedback=connectionSaving?'Saving shared connection…':'Connection was not saved. Retry in a saved chat.';updateSettingsFeedback()
    })
    const connectionStatus=node('p','muted',connectionFeedback||'This connection is shared across all chats. Choosing it saves automatically.');connectionStatus.dataset.phoneConnectionFeedback='true';connectionStatus.setAttribute('aria-live','polite')
    const sceneLabel=node('label','','Shared scene'); sceneLabel.htmlFor='phone-scene'
    const scene=node('textarea'); scene.id='phone-scene'; scene.setAttribute('aria-label','Shared phone scene'); scene.value=sceneDraft??data.state.sharedScene; scene.maxLength=3000; scene.placeholder='Optional shared facts. Replies also receive recent RP context from this chat, with character-knowledge boundaries.'; scene.addEventListener('input',()=>{sceneDraft=scene.value})
    screen.append(node('p','muted','Recent RP context is read fresh for each requested character reply. Narration does not give the character access to another person’s secrets.'))
    const contextLabel=node('label','','Phone context in story prompts');contextLabel.htmlFor='phone-context-mode'
    const contextMode=node('select');contextMode.id='phone-context-mode';contextMode.setAttribute('aria-label','Phone context mode')
    for(const [value,title] of [['automatic','Automatic · every story prompt'],['manual','Manual · via composer']]){const option=node('option','',title);option.value=value;contextMode.append(option)}
    contextMode.value=contextModeDraft??data.state.contextMode??'automatic';contextMode.addEventListener('change',()=>{contextModeDraft=contextMode.value as 'automatic'|'manual'})
    const repliesLabel=node('label','','Character / NPC replies after sending');repliesLabel.htmlFor='phone-auto-reply'
    const replies=node('select');replies.id='phone-auto-reply';replies.setAttribute('aria-label','Automatic phone replies');for(const [value,title] of [['on','Automatic'],['off','Manual']]){const option=node('option','',title);option.value=value;replies.append(option)}replies.value=(autoReplyDraft??data.state.autoReply??true)?'on':'off';replies.addEventListener('change',()=>{autoReplyDraft=replies.value==='on'})
    const save=btn('Save phone settings',()=>{
      if(settingsSaving)return
      savingEdit=settingsEdit;settingsSaving=send('settings',{connectionId:select.value||null,sharedScene:scene.value,autoReply:replies.value==='on',contextMode:contextMode.value as 'automatic'|'manual',incoming:incomingDraft??incoming})
      settingsFeedback=settingsSaving?'Saving phone settings…':'Settings were not saved. Open a saved chat and retry.';updateSettingsFeedback()
    },'primary');save.dataset.phoneSettingsSave='true';save.disabled=Boolean(settingsSaving);save.textContent=settingsSaving?'Saving…':'Save phone settings'
    const feedback=node('p','muted',settingsFeedback);feedback.dataset.phoneSettingsFeedback='true';feedback.setAttribute('role','status');feedback.setAttribute('aria-live','polite')
    for(const control of [frequency,interval,cap,scene,replies,contextMode])control.addEventListener(control.tagName==='SELECT'?'change':'input',()=>{settingsEdit++;settingsFeedback=settingsSaving?'Saving earlier changes… New changes are not saved yet.':'Unsaved changes';updateSettingsFeedback()})
    screen.append(label,select,connectionStatus,sceneLabel,scene,repliesLabel,replies,contextLabel,contextMode,node('p','muted','Automatic replies use the selected phone connection after you send. Image generation always requires confirmation. Automatic context is added silently to story prompts; “Use in Story” appends editable notification XML to your main composer. Nothing is sent until you send it.'),save,feedback,btn('Use in Story',()=>useInStory()))
    const oldOwners=[...new Set([...data.saved.map(record=>record.ownerName),...(data.appRecords||[]).flatMap(record=>record.ownerName?[record.ownerName]:[])])]
    if(oldOwners.length){
      const oldLabel=node('label','','Link saved phone records');oldLabel.htmlFor='phone-legacy-owner'
      const oldPicker=node('select');oldPicker.id='phone-legacy-owner';oldPicker.setAttribute('aria-label','Saved phone record owner');oldPicker.append(node('option','','Choose saved records…'))
      for(const name of oldOwners){const option=node('option','',name);option.value=name;oldPicker.append(option)}
      screen.append(oldLabel,oldPicker,node('p','muted',`Explicitly link an old snapshot’s records to ${currentOwner()?.name}’s phone. Source messages stay unchanged; no name guessing.`),btn('Link records to this phone',()=>{if(oldPicker.value)send('settings',{from:owner,legacyOwnerName:oldPicker.value})}))
    }
  }
  function updateSettingsFeedback(){
    for(const root of [settingsRoot,overlayRoot]){
      root?.querySelectorAll<HTMLElement>('[data-phone-settings-feedback]').forEach(el=>{el.textContent=settingsFeedback})
      root?.querySelectorAll<HTMLElement>('[data-phone-connection-feedback]').forEach(el=>{el.textContent=connectionFeedback||'This connection is shared across all chats. Choosing it saves automatically.'})
      root?.querySelectorAll<HTMLButtonElement>('[data-phone-settings-save]').forEach(el=>{el.disabled=Boolean(settingsSaving);el.textContent=settingsSaving?'Saving…':'Save phone settings'})
    }
  }
  function settingsSignature(){return JSON.stringify([chatId,error,loadError,owner,data?.connections,data?.state.connectionId,data?.state.incoming,data?.state.contextMode,data?.state.autoReply,data?.state.sharedScene,data?.saved.map(record=>record.ownerName),data?.appRecords?.map(record=>record.ownerName)])}
  function updateSettingsScreen(root:ShadowRoot,screen:HTMLElement){
    const signature=settingsSignature()
    if(screen.dataset.phoneSettingsSignature===signature)return
    const focused=root.activeElement as HTMLElement|null
    if(focused&&screen.contains(focused)&&shouldDeferPanelRenderForControl(focused)){
      if(!focused.hasAttribute('data-phone-settings-deferred')){focused.setAttribute('data-phone-settings-deferred','');focused.addEventListener('blur',()=>{focused.removeAttribute('data-phone-settings-deferred');window.requestAnimationFrame(()=>{if(!disposed)render()})},{once:true})}
      return
    }
    screen.replaceChildren();if(error)screen.append(node('p','notice',error));renderPhoneSettings(screen);screen.dataset.phoneSettingsSignature=signature
  }
  function render() {
    updateSettingsFeedback()
    const visible=enabled&&Boolean(chatId)
    if(visible!==launcherVisible){launcher.setVisible(visible);launcherVisible=visible}
    launchButton.title = 'Open Reverie Phone'
    const count=unreadCount()
    launchButton.querySelector('.badge')?.remove();badge(launchButton,notificationTimer===null?count:badgeCount);if(badgeArriving)launchButton.querySelector('.badge')?.classList.add('is-arriving');launchButton.setAttribute('aria-label',count?`Open Reverie Phone · ${count} unread notifications`:'Open Reverie Phone')
    if(settingsRoot){let screen=settingsRoot.querySelector<HTMLElement>('.settings');if(!screen){screen=node('div','settings');settingsRoot.append(screen)}updateSettingsScreen(settingsRoot,screen)}
    if (!overlayRoot) return
    // Keep the handset and editor nodes alive while native pickers are open.
    const settingsScreen=overlayRoot.querySelector<HTMLElement>('.screen.settings')
    if(page==='settings'&&settingsScreen&&overlayRoot.querySelector<HTMLElement>('.resize-menu')?.hidden===!resizeMenuOpen){updateSettingsScreen(overlayRoot,settingsScreen);updateSettingsFeedback();return}
    const appShadow=overlayRoot.querySelector('.core-app-view')?.shadowRoot
    const appChecks=appShadow?Array.from(appShadow.querySelectorAll<HTMLInputElement>('input[type=radio],input[type=checkbox]')).map(el=>({id:el.id,checked:el.checked})):[]
    const focused = (appShadow?.activeElement||overlayRoot.activeElement) as HTMLTextAreaElement | null
    const appScroll=appShadow?Array.from(appShadow.querySelectorAll<HTMLElement>('*')).filter(el=>el.scrollTop).map(el=>({className:el.className,top:el.scrollTop})):[]
    const focusKey = focused?.getAttribute('aria-label'); const focusTarget=focused?.dataset.phoneTarget;const start = focused?.selectionStart; const end = focused?.selectionEnd
    overlayRoot.querySelector('.shade')?.remove()
    const shade = node('div', 'shade'); shade.addEventListener('click', event => { if (event.target === shade) close() })
    const phone = node('section', `phone${page==='home'?' home-phone':''}`); phone.setAttribute('role','dialog'); phone.setAttribute('aria-modal','true'); phone.setAttribute('aria-label','Reverie Phone')
    const top = node('div','top'); const status=node('span');status.innerHTML=STATUS_ICONS;status.setAttribute('aria-label','Decorative phone status');top.append(node('span','',new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})),node('span','island'),status)
    top.addEventListener('pointerdown',event=>{if(event.pointerType==='touch'||event.pointerType==='pen'){if(longPressTimer!==null)window.clearTimeout(longPressTimer);longPressTimer=window.setTimeout(()=>{longPressTimer=null;openResizeMenu()},620)}})
    for(const eventName of ['pointerup','pointercancel','pointerleave'])top.addEventListener(eventName,()=>{if(longPressTimer!==null)window.clearTimeout(longPressTimer);longPressTimer=null})
    const pageTitle=page==='thread'?identities().find(person=>person.id===peer)?.name||'Conversation':page==='core-app'?CORE_APP_LABELS[coreAppId]||data?.apps?.find(app=>app.id===coreAppId)?.label||'App':page==='app-activity'?'Messages & comments':({home:currentOwner()?.name||'Phone',messages:'Messages',contacts:'Contacts',photos:'Photos',apps:'App Library',saved:'Saved records',settings:'Settings',image:'New photo',notifications:'Notifications'} as Record<string,string>)[page]||'Phone'
    const head = node('div',`head${page==='home'?' home-head':''}`)
    head.append(btn('‹',()=>{if(page==='app-activity'){page='core-app'}else if(page==='bubble'&&selectedBubble?.app){page=bubbleReturnPage}else{page='home';draft=''}error='';render()},'icon'),node('strong','',pageTitle))
    const closeButton = btn('×', close, 'icon'); closeButton.setAttribute('aria-label','Close phone'); head.append(closeButton)
    const bell=btn('♧',()=>{page='notifications';error='';render()},'icon bell');bell.innerHTML=svg('<path d="M8 22h16l-2-4v-6a6 6 0 0 0-12 0v6zM13 26h6"/>');bell.querySelector('svg')?.setAttribute('width','23');bell.querySelector('svg')?.setAttribute('height','23');bell.setAttribute('aria-label','Phone notifications');badge(bell,count);head.insertBefore(bell,closeButton)
    if(page==='core-app'||page==='app-activity'){const activity=btn('',()=>{if(page==='app-activity'){page='core-app'}else{page='app-activity';if(!appTargets.some(target=>target.id===appTargetId))appTargetId=appTargets[0]?.id||'root'}error='';render()},'icon');activity.innerHTML=APP_ICONS.messages;activity.setAttribute('aria-label',page==='app-activity'?'Back to app':'Open messages and comments');activity.title=page==='app-activity'?'Back to app':'Messages & comments';head.insertBefore(activity,closeButton)}
    const picker = node('select','owner'); picker.setAttribute('aria-label','Phone owner')
    for (const identity of identities()) { const option=node('option','', `${identity.name} · ${identity.kind === 'persona' ? 'Your phone' : identity.kind==='npc'?'NPC phone':'Character phone'}`); option.value=identity.id; option.selected=identity.id===owner; picker.append(option) }
    picker.addEventListener('change',()=>{ owner=picker.value; peer=''; page='home'; draft=''; error='';coreHtml='';coreRecordId='';coreLoading='';render() })
    const screen = node('main','screen'); phone.append(top,head);if(page==='home')phone.append(picker)
    if (error||(data&&loadError)) { const notice=node('div','notice',error||loadError); notice.setAttribute('role','status'); phone.append(notice) }
    if (!data) { screen.append(node('p','intro',loadError||'Loading this chat’s phones…')); screen.append(btn('Retry',()=>{loadPhone();render()})) }
    else if (identities().length<2) screen.append(node('p','intro','Open a character chat and select a persona to use both phones. No identity will be invented.'))
    else if(page==='bubble'&&selectedBubble){
      const selection=selectedBubble
      const entry=selection.app?data.state.appInteractions?.find(entry=>entry.id===selection.id):data.state.messages.find(entry=>entry.id===selection.id)
      const source=selection.app?coreBubbles.find(entry=>entry.id===selection.id):null
      const actor=identities().find(person=>person.id===(entry?.from||source?.actorId))
      screen.append(node('p','intro',entry?.body||source?.body||'This rendered bubble is part of the saved Surface. No independently mapped generation is available.'))
      const regenerate=btn(appPosting?'Regenerating…':'Regenerate message',()=>{if(appPosting)return;appPosting=send(selection.app?'app-regenerate':'regenerate',{messageId:selection.id,from:owner,...(selection.app?{appId:coreAppId,recordId:coreRecordId,targetId:selection.targetId}:{})});render()},'primary')
      regenerate.disabled=Boolean(appPosting)||!actor||actor.kind==='persona';screen.append(regenerate)
      if(!actor||actor.kind==='persona')screen.append(node('p','muted',actor?.kind==='persona'?'Persona text is manually authored; Reverie will not write your character for you.':'The source author has no exact confirmed identity match. Regeneration is disabled instead of guessing.'))
      if(selection.app&&entry&&(!('sourceBubbleId' in entry)||!entry.sourceBubbleId)){
        const actors=identities().filter(person=>person.kind!=='persona'&&person.id!==entry.from)
        if(actors.length){const choose=node('select');choose.setAttribute('aria-label','App reply character or NPC');for(const person of actors){const option=node('option','',person.name);option.value=person.id;choose.append(option)}choose.value=actors.some(person=>person.id===appReplyActor)?appReplyActor:actors[0].id;appReplyActor=choose.value;choose.addEventListener('change',()=>{appReplyActor=choose.value})
        const reply=btn('Get character / NPC reply',()=>{if(appPosting)return;appPosting=send('app-reply',{appId:coreAppId,recordId:coreRecordId,targetId:selection.targetId,ownerId:owner,from:appReplyActor,messageId:entry.id});render()});reply.disabled=Boolean(appPosting);screen.append(choose,reply)}
      }
      const details=node('details','saved');details.append(node('summary','','Generation details'))
      const generation=entry?.generation
      if(generation){const connection=data.connections.find(connection=>connection.id===generation.connectionId);details.append(node('p','',`${connection?`${connection.name} · ${connection.model}`:generation.connectionId}\n${new Date(generation.createdAt).toLocaleString()} · ${(generation.durationMs/1000).toFixed(1)} seconds`),node('pre','',JSON.stringify(generation.prompt,null,2)))}
      else details.append(node('p','muted',entry?'Manually authored or imported from the saved story. No independent phone model call is recorded.':'Imported Surface text; see the saved story source. No phone generation metrics were recorded.'))
      if(selection.app)details.append(node('p','muted',`Saved app record: ${coreRecordId}\nTarget: ${selection.targetId||'root'}\nPhone alternatives do not rewrite the original chat Surface.`))
      if(entry&&'image' in entry&&entry.image)details.append(node('pre','',JSON.stringify(entry.image,null,2)))
      screen.append(details)
      for(const [index,variant] of (entry?.variants||[]).entries()){const history=node('details','saved');history.append(node('summary','',`Previous version ${index+1}`),node('p','',variant.body));screen.append(history)}
      screen.append(node('p','muted','Regenerating a historical bubble changes only this phone alternative. Later messages are not rewritten.'),btn('Back to conversation',()=>{page=selection.app?bubbleReturnPage:'thread';selectedBubble=null;render()}))
    } else if(page==='app-setup'){
      screen.append(node('p','intro',`Set up ${CORE_APP_LABELS[coreAppId]||coreAppId} for ${currentOwner()?.name}. It lives in this phone without adding a Surface to the story. Your phone connection uses the current RP context and the setup below.`))
      const brief=node('textarea');brief.setAttribute('aria-label','Phone app setup');brief.placeholder='Describe the conversation, post, inbox or app content you want to open…';brief.maxLength=2000;brief.value=localAppBrief;brief.addEventListener('input',()=>{localAppBrief=brief.value})
      const create=btn(localCreating?'Setting up app…':'Generate app content',()=>{if(localCreating||!localAppBrief.trim())return;localCreateOwner=owner;localCreateApp=coreAppId;localCreating=send('app-create',{appId:coreAppId,from:owner,text:localAppBrief});error='';render()},'primary');create.disabled=Boolean(localCreating)
      screen.append(brief,node('p','muted','One text-model request, saved only in this phone. If this app defines image slots, native ImageGen fills them after you press Generate. Your setup stays here if a provider fails.'),create,btn('Back to app',()=>{page='core-app';render()}))
    } else if(page==='portrait'){
      const actor=identities().find(actor=>actor.id===portraitActor)
      screen.classList.add('image-panel');screen.append(node('p','intro',`Profile picture for ${actor?.name||'contact'}. Review their established appearance here. Native ImageGen uses this exact prompt; one saved portrait is reused across their phone accounts.`))
      const existing=data.state.portraits?.[portraitActor];const avatar=phoneAvatar(actor,data.state,actor?.name||'Contact');screen.append(avatar)
      const prompt=node('textarea');prompt.setAttribute('aria-label','Profile picture prompt');prompt.maxLength=6000;prompt.value=portraitPrompt;prompt.addEventListener('input',()=>{portraitPrompt=prompt.value})
      const connection=node('select');connection.setAttribute('aria-label','Profile picture image connection');const native=node('option','','Active native ImageGen settings');native.value='';connection.append(native);for(const entry of data.imageConnections||[]){const option=node('option','',`${entry.name} · ${entry.model}`);option.value=entry.id;connection.append(option)}connection.value=portraitConnection;connection.addEventListener('change',()=>{portraitConnection=connection.value})
      const generate=btn(portraitOperation||existing?.status==='pending'?'Generating portrait…':'Generate profile picture',()=>{if(portraitOperation)return;portraitOperation=send('portrait',{from:portraitActor,prompt:portraitPrompt,imageConnectionId:portraitConnection});render()},'primary');generate.disabled=Boolean(portraitOperation)||existing?.status==='pending'||!actor
      screen.append(prompt,connection,generate,btn('Back to contacts',()=>{page='contacts';render()}));if(existing?.error)screen.append(node('p','notice',existing.error))
    } else if(page==='contact'){
      screen.append(node('p','intro','Add an NPC already established in your RP. This is your explicit identity confirmation, not a model-invented stranger.'))
      const name=node('textarea');name.rows=1;name.maxLength=80;name.value=contactName;name.setAttribute('aria-label','NPC contact name');name.placeholder='NPC name';name.addEventListener('input',()=>{contactName=name.value})
      const description=node('textarea');description.maxLength=3000;description.value=contactDescription;description.setAttribute('aria-label','NPC established details');description.placeholder='Their established role, voice and known RP details…';description.addEventListener('input',()=>{contactDescription=description.value})
      const add=btn(contactSaving?'Saving…':'Confirm NPC contact',()=>{if(contactSaving)return;contactSaving=send('contact',{contactName,contactDescription});render()},'primary');add.disabled=Boolean(contactSaving);screen.append(name,description,add)
    } else if(page==='notifications'){
      if(!unreadCount())screen.append(node('p','intro','All caught up. No unread phone activity.'))
      for(const message of unread()){const notification=btn('',()=>{owner=message.to;selectThread(message.from)},'notification');notification.append(node('strong','',`${identities().find(person=>person.id===message.from)?.name||'Archived contact'} → ${identities().find(person=>person.id===message.to)?.name||'Phone'}`),node('small','',message.image?'Photo received':message.body.slice(0,150)));screen.append(notification)}
      for(const entry of appUnread()){const record=data.appRecords?.find(record=>record.id===entry.recordId);if(!record)continue;const notification=btn('',()=>{owner=data!.state.appInteractions!.find(parent=>parent.id===entry.replyTo)!.from;coreAppId=entry.appId;page='core-app';openCoreRecord(record,entry.targetId)},'notification');notification.append(node('strong','',`${identities().find(person=>person.id===entry.from)?.name||'Contact'} replied · ${CORE_APP_LABELS[entry.appId]||entry.appId}`),node('small','',entry.body.slice(0,150)));screen.append(notification)}
    } else if(page==='image'){
      screen.classList.add('image-panel');screen.append(node('p','intro','Generate & send uses native ImageGen. Review the visible scene and sender before dispatch; no model rewrites your prompt.'))
      const sender=node('select');sender.setAttribute('aria-label','Image sender');for(const person of identities()){const option=node('option','',person.name);option.value=person.id;sender.append(option)}sender.value=imageSender;sender.addEventListener('change',()=>{imageSender=sender.value})
      const recipient=node('select');recipient.setAttribute('aria-label','Image recipient');for(const person of identities()){const option=node('option','',person.name);option.value=person.id;recipient.append(option)}recipient.value=imageRecipient;recipient.addEventListener('change',()=>{imageRecipient=recipient.value})
      const connections=node('select');connections.setAttribute('aria-label','Phone image connection');const native=node('option','','Active native ImageGen settings');native.value='';connections.append(native);for(const connection of data.imageConnections||[]){const option=node('option','',`${connection.name} · ${connection.model}`);option.value=connection.id;connections.append(option)}connections.value=imageConnection;connections.addEventListener('change',()=>{imageConnection=connections.value})
      const modes=node('select');modes.setAttribute('aria-label','Image framing');for(const mode of PHONE_FRAMING){const option=node('option','',mode.label);option.value=mode.id;modes.append(option)}modes.value=imageFraming;modes.addEventListener('change',()=>{imageFraming=modes.value})
      const prompt=node('textarea');prompt.setAttribute('aria-label','Phone image prompt');prompt.maxLength=6000;prompt.value=imagePromptDraft;prompt.placeholder='Describe the visible subjects, current action, surroundings and view…';prompt.addEventListener('input',()=>{imagePromptDraft=prompt.value})
      const caption=node('textarea');caption.setAttribute('aria-label','Photo caption');caption.rows=1;caption.maxLength=2000;caption.value=imageCaption;caption.placeholder='Optional message with this photo';caption.addEventListener('input',()=>{imageCaption=caption.value})
      const actions=node('div','image-actions');actions.append(btn('Insert framing',()=>{const cue=phoneFramingCue(imageFraming);if(!imagePromptDraft.includes(cue))imagePromptDraft=[imagePromptDraft,cue].filter(Boolean).join(', ');render()}))
      const generate=btn(imageOperation?'Generating…':'Generate & send image',()=>{if(imageOperation)return;imageOperation=send('image',{from:imageSender,to:imageRecipient,text:imageCaption,prompt:imagePromptDraft,framing:imageFraming,imageConnectionId:imageConnection,...(imageMessageId?{messageId:imageMessageId}:{})});render()},'primary');generate.disabled=Boolean(imageOperation)||imageSender===imageRecipient;actions.append(generate,btn('Back to thread',()=>{page='thread';render()}));screen.append(sender,recipient,connections,modes,prompt,caption,actions)
    } else if (page==='home') {
      screen.classList.add('home-screen');screen.append(node('p','home-date',new Date().toLocaleDateString([], {weekday:'long',day:'numeric',month:'long'})))
      const latest=unread()[0];if(latest){const notice=btn('',()=>{owner=latest.to;selectThread(latest.from)},'notification');notice.setAttribute('role','status');notice.append(node('strong','',`New text · ${identities().find(person=>person.id===latest.from)?.name||'Contact'}`),node('small','',`${identities().find(person=>person.id===latest.to)?.name}: ${latest.image?'Photo received':latest.body.slice(0,95)}`));screen.append(notice)}
      const grid=node('div','grid app-grid')
      const homeApps:HTMLElement[]=[]
      for (const [id,label,glyph] of [['messages','Messages','✉'],['contacts','Contacts','♧'],['photos','Photos','▧'],['apps','Core apps','▦'],['saved','Saved records','≡'],['settings','Settings','⚙']]) {
        const app=btn('',()=>{page=id;error='';render()},`app app-${id}`);app.setAttribute('aria-label',label);const icon=node('span','glyph');icon.innerHTML=APP_ICONS[id];if(id==='messages')badge(icon,unread().filter(message=>message.to===owner).length);app.append(icon,node('span','',label));homeApps.push(app)
      }
      homeApps.push(...(data.apps||[]).map(coreAppIcon));const pages=Math.max(1,Math.ceil(homeApps.length/16));homePage=Math.min(homePage,pages-1);grid.append(...homeApps.slice(homePage*16,(homePage+1)*16))
      screen.append(grid)
      if(pages>1){const pager=node('nav','app-pages');pager.setAttribute('aria-label','Home app pages');const previous=btn('‹',()=>{homePage--;render()});previous.setAttribute('aria-label','Previous app page');previous.disabled=homePage===0;const next=btn('›',()=>{homePage++;render()});next.setAttribute('aria-label','Next app page');next.disabled=homePage===pages-1;pager.append(previous,node('span','',`${homePage+1} / ${pages}`),next);screen.append(pager)}
    } else if(page==='apps'){
      const grid=node('div','grid app-grid');grid.append(...(data.apps||[]).map(coreAppIcon));screen.append(grid)
    } else if(page==='core-app'){
      screen.classList.add('core-screen')
      const records=appRecords()
      const setup=btn(records.length?'New app record':'Set up this app',()=>{page='app-setup';localAppBrief='';error='';render()});setup.setAttribute('aria-label','Set up phone-local app');if(!records.length)screen.append(setup)
      if(!records.length)screen.append(node('p','intro core-empty','No app records yet. Set up this app using the current RP context; nothing needs to appear in chat first.'))
      else{
        const history=node('details','core-history');history.append(node('summary','','App records'))
        const picker=node('select');picker.setAttribute('aria-label','Core app record')
        for(const record of [...records].reverse()){const option=node('option','',`${record.title} · ${record.local?'Phone-local':record.ownerName||'Story record; owner unspecified'}`);option.value=record.id;picker.append(option)}
        picker.value=coreRecordId;picker.addEventListener('change',()=>{const record=records.find(record=>record.id===picker.value);if(record)openCoreRecord(record)});history.append(picker,setup);screen.append(history)
        if(coreLoading)screen.append(node('p','muted','Opening app…'))
        if(coreHtml){
          const container=node('div','core-app-view');const appRoot=container.attachShadow({mode:'open'});const template=document.createElement('template');template.innerHTML=coreHtml
          template.content.querySelectorAll('script,iframe,object,embed,base,meta,link').forEach(el=>el.remove())
          for(const el of template.content.querySelectorAll('*'))for(const attr of [...el.attributes])if(/^on/i.test(attr.name)||(['href','src','action','formaction'].includes(attr.name)&&/^\s*(?:javascript|vbscript|file):/i.test(attr.value)))el.removeAttribute(attr.name)
          // Open only the outer chat launcher; inner app tabs/disclosures retain their state.
          template.content.querySelectorAll<HTMLDetailsElement>('details.dg-compact-launch-host,details.srv2-collapse').forEach(el=>{el.open=true})
          appRoot.append(template.content)
          const fit=node('style');fit.setAttribute('data-reverie-phone-app-presentation','');fit.textContent=PHONE_APP_PRESENTATION_CSS;appRoot.append(fit)
          appRoot.addEventListener('click',event=>{
            const retry=event.composedPath().find(target=>target instanceof window.HTMLElement&&target.matches('[data-phone-app-image-retry]')) as HTMLButtonElement|undefined
            if(!retry)return
            const mediaId=retry.dataset.phoneAppImageRetry||'',record=records.find(entry=>entry.id===coreRecordId&&entry.appId===coreAppId&&entry.local&&entry.ownerId===owner),media=record?.media?.find(entry=>entry.id===mediaId&&entry.image.status==='failed')
            if(!record||!media)return
            const key=appImageRetryKey(record.id,media.id);if(appImageRetriesInFlight.has(key))return
            appImageRetriesInFlight.add(key);retry.disabled=true;retry.textContent='Retrying…'
            const operationId=send('app-image',{appId:record.appId,recordId:record.id,mediaId:media.id,from:record.ownerId})
            if(operationId)appImageRetryOperations.set(operationId,{key,recordId:record.id,appId:record.appId})
            else{appImageRetriesInFlight.delete(key);retry.disabled=false;retry.textContent='Retry image'}
          })
          for(const retry of appRoot.querySelectorAll<HTMLButtonElement>('[data-phone-app-image-retry]'))if(appImageRetriesInFlight.has(appImageRetryKey(coreRecordId,retry.dataset.phoneAppImageRetry||''))){retry.disabled=true;retry.textContent='Retrying…'}
          // Existing disclosure, radio/checkbox navigation and delegated Reverie actions remain native.
          appRoot.addEventListener('submit',event=>event.preventDefault());screen.append(container)
          mountPhoneAppControls(appRoot,{appId:coreAppId,owner,identities:identities(),state:data.state,targets:appTargets,activeTargetId:appTargetId,bubbles:coreBubbles,entries:(data.state.appInteractions||[]).filter(entry=>entry.recordId===coreRecordId&&entry.appId===coreAppId),drafts:appMemory(appDrafts),responders:appMemory(appResponders),autoReply:data.state.autoReply,pending:Boolean(appPosting),post:(text,target,responder)=>{appTargetId=target;appDraft=text;appPosting=send('app-post',{appId:coreAppId,recordId:coreRecordId,targetId:target,from:owner,to:responder,text});render()},inspect:(id,target)=>{appTargetId=target;bubbleReturnPage='core-app';selectedBubble={id,targetId:target,app:true};page='bubble';error='';render()}})
          mountPhoneConversationPicker(appRoot,{appId:coreAppId,choices:conversationChoices(),currentId:coreRecordId,identities:identities(),state:data.state,select:choice=>{const record=records.find(record=>record.id===choice.recordId);if(record)openCoreRecord(record,choice.targetId)}})
          window.requestAnimationFrame(()=>{if(appRoot.host.isConnected)applyPhoneAppDarkTheme(appRoot)})
        }
      }
    } else if(page==='app-activity'){
      const mode=phoneAppInteractionMode(coreAppId),record=appRecords().find(entry=>entry.id===coreRecordId)
      screen.classList.add('core-screen')
      if(!record){screen.append(node('p','intro','Choose an app record first to view its messages and comments.'),btn('Back to app library',()=>{page='apps';render()}))}
      else if(!mode){screen.append(node('p','intro',`${CORE_APP_LABELS[coreAppId]||coreAppId} does not contain a message or comment thread. Your phone conversations are still available here.`),btn('Open phone messages',()=>{page='messages';render()},'primary'))}
      else{
        const targets=appTargets.length?appTargets:[{id:'root',label:'This conversation / post',replyActorId:undefined}]
        if(!targets.some(target=>target.id===appTargetId))appTargetId=targets[0].id
        if(targets.length>1){const select=node('select');select.setAttribute('aria-label',mode==='message'?'App conversation':'Comment thread');for(const target of targets){const option=node('option','',target.label);option.value=target.id;select.append(option)}select.value=appTargetId;select.addEventListener('change',()=>{appTargetId=select.value;render()});screen.append(select)}
        const thread=node('div','app-activity-thread');thread.setAttribute('aria-label',mode==='message'?'Messages in this app':'Comments in this app')
        const entries=(data.state.appInteractions||[]).filter(entry=>entry.recordId===coreRecordId&&entry.appId===coreAppId&&(entry.targetId||'root')===appTargetId)
        for(const source of coreBubbles.filter(bubble=>bubble.targetId===appTargetId)){
          const alternative=entries.filter(entry=>entry.sourceBubbleId===source.id).at(-1),body=alternative?.variants?.at(-1)?.body||alternative?.body||source.body
          const item=btn('',()=>{bubbleReturnPage='app-activity';selectedBubble={id:alternative?.id||source.id,targetId:appTargetId,app:true};page='bubble';render()},`app-activity-source${source.actorId===owner?' self':''}`)
          item.append(node('small','',source.author||'App participant'),document.createTextNode(body));thread.append(item)
        }
        for(const entry of entries.filter(entry=>!entry.sourceBubbleId)){
          const actor=identities().find(person=>person.id===entry.from),item=btn('',()=>{bubbleReturnPage='app-activity';selectedBubble={id:entry.id,targetId:appTargetId,app:true};page='bubble';render()},`app-activity-source${entry.from===owner?' self':''}`)
          item.append(node('small','',actor?.name||'Archived contact'),document.createTextNode(entry.variants?.at(-1)?.body||entry.body));thread.append(item)
        }
        if(!thread.childElementCount)thread.append(node('p','muted',mode==='message'?'No messages in this app conversation yet.':'No comments here yet.'))
        screen.append(thread)
        const compose=node('form','app-activity-compose'),input=node('textarea');input.rows=2;input.maxLength=2000;input.setAttribute('aria-label',mode==='message'?'App message':'App comment');input.placeholder=mode==='message'?'Message…':'Add a comment…';input.value=appMemory(appDrafts).get(appTargetId)||'';input.addEventListener('input',()=>appMemory(appDrafts).set(appTargetId,input.value))
        const submit=btn(appPosting?'Posting…':mode==='message'?'Send':'Post comment',()=>{},'primary');submit.type='submit';submit.disabled=Boolean(appPosting)
        compose.append(input,submit)
        if(data.state.autoReply!==false){const responder=node('select');responder.setAttribute('aria-label','Automatic reply participant');const automatic=node('option','','Reply from app contact');automatic.value='';responder.append(automatic);for(const person of identities().filter(person=>person.kind!=='persona'&&person.id!==owner)){const option=node('option','',person.name);option.value=person.id;responder.append(option)}responder.value=appMemory(appResponders).get(appTargetId)||targets.find(target=>target.id===appTargetId)?.replyActorId||'';responder.addEventListener('change',()=>appMemory(appResponders).set(appTargetId,responder.value));compose.append(responder)}
        compose.addEventListener('submit',event=>{event.preventDefault();const text=input.value.trim();if(!text||appPosting)return;appMemory(appDrafts).set(appTargetId,text);appPosting=send('app-post',{appId:coreAppId,recordId:coreRecordId,targetId:appTargetId,from:owner,to:appMemory(appResponders).get(appTargetId)||targets.find(target=>target.id===appTargetId)?.replyActorId,text});render()})
        input.addEventListener('keydown',event=>{if(event.key==='Enter'&&!event.shiftKey&&!event.isComposing){event.preventDefault();compose.requestSubmit()}})
        screen.append(compose)
      }
    } else if (page==='messages'||page==='contacts') {
      if(page==='contacts')screen.append(btn('Add NPC contact',()=>{page='contact';error='';render()}))
      if(page==='contacts'&&currentOwner())screen.append(btn(`Profile picture · ${currentOwner()!.name}`,()=>portraitEditor(currentOwner()!)))
      for (const identity of identities().filter(identity=>identity.id!==owner)) {
        const thread=phoneConversation(data.state,owner,identity.id); const latest=thread.at(-1)
        const row=btn('',()=>selectThread(identity.id),'row'); const text=node('div','rowtext'); text.append(node('strong','',identity.name),node('small','',page==='contacts' ? identity.kind==='persona'?'User persona · manually authored replies':'Character · model replies available' : latest?.body.slice(0,90)||'Start a conversation'))
        row.append(phoneAvatar(identity,data.state,identity.name),text)
        const unread=thread.filter(message=>message.to===owner&&message.createdAt>(data!.state.readAt[`${owner}:${identity.id}`]||0)).length
        if (unread) row.append(node('span','muted',`${unread} new`)); screen.append(row)
        if(page==='contacts')screen.append(btn(`Profile picture · ${identity.name}`,()=>portraitEditor(identity)))
      }
    } else if (page==='thread') {
      const thread=phoneConversation(data.state,owner,peer)
      if(thread.length) screen.append(btn('Use in Story',()=>useInStory(owner,peer)))
      if(data.state.contextRequest)screen.append(node('p','muted','Context is queued for the next normal story prompt. No OOC message or story reply is created.'))
      if (!thread.length) screen.append(node('p','intro',data.state.autoReply!==false?'Start with a text. The confirmed character or NPC replies automatically using your phone connection.':'Start with a text. Automatic replies are off; request the contact’s reply explicitly.'))
      for (const message of thread.slice(-100)) {
        const bubble=node('article',`bubble${message.from===owner?' self':''}`,message.body)
        bubble.tabIndex=0;bubble.setAttribute('aria-label',`Message actions: ${message.body.slice(0,60)}`);const inspect=()=>{selectedBubble={id:message.id,app:false};page='bubble';error='';render()};bubble.addEventListener('click',event=>{if((event.target as HTMLElement).closest('button'))return;inspect()});bubble.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();inspect()}})
        if(message.image){if(message.image.status==='ready'){const image=node('img','photo-message');image.src=message.image.imageUrl!;image.alt=message.body==='Photo'?'Received photo':message.body;image.loading='lazy';bubble.prepend(image)}else{bubble.append(node('p','image-state',message.image.status==='pending'?'Generating photo… not delivered yet':message.image.status==='draft'?'Photo draft · awaiting generation':message.image.error||'Image failed'));const retry=btn(message.image.status==='draft'?'Review & generate photo':'Retry photo',()=>imageComposer(message));retry.disabled=message.image.status==='pending';bubble.append(retry)}}
        bubble.append(node('time','time',new Date(message.createdAt).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}))); screen.append(bubble)
        const recipient=identities().find(identity=>identity.id===message.to)
        const replyExists=data.state.messages.some(candidate=>candidate.replyTo===message.id)
        // Only the latest message can solicit a reply; never regenerate old turns out of order.
        if (message===thread.at(-1)&&recipient?.kind!=='persona'&&recipient&&!replyExists&&(!message.image||message.image.status==='ready')) {
          if (message.error) screen.append(node('p','muted',message.error))
          const reply=btn(message.replyStatus==='pending'?'Waiting for reply…':message.replyStatus==='failed'?`Retry ${recipient.name}’s reply`:`Get ${recipient.name}’s reply`,()=>{ send('reply',{messageId:message.id}); error='' })
          reply.disabled=message.replyStatus==='pending'; screen.append(reply)
        }
      }
      const compose=node('form','compose'); const input=node('textarea'); input.rows=1; input.maxLength=2000; input.placeholder=`Text ${identities().find(person=>person.id===peer)?.name||'contact'}…`; input.value=draft; input.setAttribute('aria-label','Phone message')
      input.addEventListener('input',()=>{draft=input.value})
      const submit=btn(submitting?'Sending…':'Send',()=>{},'primary'); submit.type='submit'; submit.disabled=Boolean(submitting)
      compose.addEventListener('submit',event=>{ event.preventDefault(); if (!draft.trim()||submitting) return; submittedDraft={owner,peer,text:draft}; submitting=send('send',{from:owner,to:peer,text:draft}); render() })
      input.addEventListener('keydown',event=>{ if(event.key==='Enter'&&!event.shiftKey&&!event.isComposing){event.preventDefault();compose.requestSubmit()} })
      const attach=btn('＋',()=>imageComposer(),'icon');attach.setAttribute('aria-label','Send generated photo');compose.append(attach,input,submit); phone.append(screen,compose); screen.scrollTop=screen.scrollHeight
    } else if (page==='settings') {
      updateSettingsScreen(overlayRoot,screen)
    } else {
      const entries=saved().filter(entry=>page!=='photos'||entry.kind==='photo')
      const phonePhotos=data.state.messages.filter(message=>(message.from===owner||message.to===owner)&&message.sourceActive!==false&&message.image?.status==='ready')
      if(page==='photos')for(const message of phonePhotos)entries.push({entryId:message.id,ownerName:currentOwner()?.name||'',kind:'photo',app:'Messages',title:message.body,body:'',imageUrl:message.image!.imageUrl})
      if (!entries.length) screen.append(node('p','intro','No saved records for this phone yet. Existing chat phone snapshots remain untouched.'))
      if(page==='photos'){
        const grid=node('div','grid');for(const entry of entries){const figure=node('figure');if(entry.imageUrl){const image=node('img','photo');image.src=entry.imageUrl;image.alt=entry.title;image.loading='lazy';figure.append(image)}else figure.append(node('div','photo','Photo unavailable'));figure.append(node('figcaption','',entry.title));grid.append(figure)}screen.append(grid)
      }else for(const entry of entries){const row=node('article','saved');row.append(node('strong','',entry.title),node('small','muted',`${entry.app}${entry.storyTimeLabel?' · '+entry.storyTimeLabel:''}`),node('p','',entry.body));screen.append(row)}
    }
    if(page!=='thread'||!data||identities().length<2)phone.append(screen)
    if(page==='home'&&data){const dock=node('div','phone-dock');for(const [id,label] of [['messages','Messages'],['contacts','Contacts'],['photos','Photos']]){const app=btn('',()=>{page=id;render()},`app app-${id}`);app.setAttribute('aria-label',`Dock ${label}`);const icon=node('span','glyph');icon.innerHTML=APP_ICONS[id];app.append(icon,node('span','',label));dock.append(app)}phone.append(dock)}
    phone.append(node('div','footer'));const hardware=node('div','hardware');applyPhoneScale(hardware)
    hardware.addEventListener('contextmenu',event=>{if((event.target as HTMLElement).closest('.resize-menu'))return;event.preventDefault();openResizeMenu()})
    const resize=node('section','resize-menu');resize.hidden=!resizeMenuOpen;resize.setAttribute('aria-label','Resize phone')
    const resizeTitle=node('strong','','Phone size'),value=node('output','resize-value',`${Math.round(phoneScale*100)}%`);resizeTitle.append(document.createTextNode(' · '),value)
    const presets=node('div','resize-presets');for(const [label,scale] of [['Small',.85],['Default',1],['Large',1.15]] as const){const preset=btn(label,()=>{setPhoneScale(scale);resize.hidden=true;resizeMenuOpen=false},'secondary');preset.setAttribute('aria-label',`${label} phone size`);presets.append(preset)}
    const sizeLabel=node('label','','Custom size');const slider=node('input');slider.type='range';slider.min='80';slider.max='120';slider.step='1';slider.value=String(Math.round(phoneScale*100));slider.setAttribute('aria-label','Phone size percentage');slider.addEventListener('input',()=>setPhoneScale(Number(slider.value)/100,false));slider.addEventListener('change',()=>setPhoneScale(Number(slider.value)/100,true))
    const done=btn('Done',()=>{resize.hidden=true;resizeMenuOpen=false},'secondary');done.style.width='100%';resize.append(resizeTitle,presets,sizeLabel,slider,done)
    hardware.append(phone,resize);shade.addEventListener('pointerdown',event=>{if(resizeMenuOpen&&!(event.target as HTMLElement).closest('.resize-menu')){resizeMenuOpen=false;resize.hidden=true}})
    shade.append(hardware);overlayRoot.append(shade);viewportHandler?.()
    if(page==='thread')screen.scrollTop=screen.scrollHeight
    const restoredApp=overlayRoot.querySelector('.core-app-view')?.shadowRoot
    for(const item of appChecks){const el=restoredApp?.getElementById(item.id) as HTMLInputElement|undefined;if(el)el.checked=item.checked}
    for(const item of appScroll){const el=Array.from(restoredApp?.querySelectorAll<HTMLElement>('*')||[]).find(el=>el.className===item.className);if(el)el.scrollTop=item.top}
    if(focusKey){ const restored=[...Array.from(overlayRoot.querySelectorAll<HTMLTextAreaElement>('textarea,select,button')),...Array.from(restoredApp?.querySelectorAll<HTMLTextAreaElement>('textarea,select,button')||[])].find(el=>el.getAttribute('aria-label')===focusKey&&el.dataset.phoneTarget===focusTarget); restored?.focus(); if(restored?.tagName==='TEXTAREA'&&start!=null&&end!=null)restored.setSelectionRange(start,end) }
    updateSettingsFeedback();queueMicrotask(readVisibleThread)
  }
  function switchChat() {
    const next=ctx.getActiveChat().chatId
    if(next===chatId)return
    stopNotification();knownDelivered=null
    settingsSaving='';settingsFeedback='';settingsEdit=0;savingEdit=0;connectionSaving='';connectionFeedback='';viewedThreadReplies.clear()
    chatId=next;data=null;owner='';peer='';page='home';draft='';sceneDraft=null;connectionDraft=null;incomingDraft=null;error='';submitting='';handingOff='';submittedDraft=null;requestedThread=null;selectedOperation='';coreAppId='';coreRecordId='';coreHtml='';coreLoading=''
    imagePromptDraft='';imageCaption='';imageMessageId='';imageOperation='';portraitActor='';portraitPrompt='';portraitConnection='';portraitOperation='';contactName='';contactDescription='';appDraft='';appPosting='';appDrafts.clear();appResponders.clear();appImageRetryOperations.clear();appImageRetriesInFlight.clear();appTargets=[];coreBubbles=[];selectedBubble=null;contextModeDraft=null;autoReplyDraft=null;loadError='';close();render();if(chatId)loadPhone()
  }
  const unsubscribe=ctx.onBackendMessage((raw:unknown)=>{
    if((raw as any).type==='phone_preferences_changed'){
      if(data){data={...data,state:applyPhonePreferences(data.state,normalizePhonePreferences((raw as any).preferences))};render()}
      else if(chatId)loadPhone()
      return
    }
    const message=raw as PhoneProjection
    if(message.chatId!==chatId)return
    if((message as any).type==='phone_app'){
      const app=message as any
      if(app.operationId!==coreLoading||app.appId!==coreAppId||app.recordId!==coreRecordId)return
      coreLoading='';coreHtml=app.html;appTargets=app.targets||[];coreBubbles=app.bubbles||[];appTargetId=app.targetId||'root';render()
    }else if(message.type==='phone_state'){
      if(data&&message.state.revision<data.state.revision)return
      loadRecovery.stop();loadError=''
      if(message.operationId===connectionSaving){connectionSaving='';connectionFeedback=message.error?'Shared connection was not saved. Retry.':'Connection saved · shared across all chats.'}
      if(message.operationId===settingsSaving){settingsSaving='';settingsFeedback=message.error?'Settings were not saved. Retry after resolving the error.':settingsEdit===savingEdit?'Phone settings saved · applies to all chats.':'Earlier changes saved. New changes are not saved yet.'}
      registerIncoming(message)
      data=message
      const retryImage=appImageRetryOperations.get(message.operationId)
      if(retryImage){appImageRetryOperations.delete(message.operationId);appImageRetriesInFlight.delete(retryImage.key);if(message.error)error=message.error;if(page==='core-app'&&coreRecordId===retryImage.recordId&&coreAppId===retryImage.appId){const refreshed=data.appRecords?.find(record=>record.id===retryImage.recordId);if(refreshed)openCoreRecord(refreshed)}}
      if(message.operationId===localCreating){const created=message.appRecords?.find(record=>record.id===`phone-app-${localCreating}`);localCreating='';error=message.error||'';if(created&&page==='app-setup'&&owner===localCreateOwner&&coreAppId===localCreateApp){page='core-app';localAppBrief='';openCoreRecord(created)}}
      if(coreRecordId&&!(data.appRecords||[]).some(record=>record.id===coreRecordId)){coreHtml='';coreLoading='';coreRecordId='';if(page==='core-app')error='This source was edited or its swipe changed. Choose a current app record.'}
      if(!identities().some(person=>person.id===owner))owner=identities().find(person=>person.kind==='persona')?.id||identities()[0]?.id||''
      if(requestedThread){
        const sender=resolvePhoneParticipant(requestedThread!.from,identities()),recipient=resolvePhoneParticipant(requestedThread!.to,identities())
        const matching=!requestedThread.scope||requestedThread.scope===phoneStoryScope(identities())
        requestedThread=null
        if(sender&&recipient&&matching){owner=recipient.id;peer=sender.id;page='thread';draft='';send('read',{from:owner,to:peer})}
        else{page='home';error='This notification belongs to another character/persona phone pair. Its source was preserved; no text was delivered here.'}
      }
      if(message.operationId===submitting){ if(!message.error&&submittedDraft?.owner===owner&&submittedDraft.peer===peer&&submittedDraft.text===draft)draft=''; submitting='';submittedDraft=null }
      if(message.operationId===imageOperation){const image=data.state.messages.find(entry=>entry.id===(imageMessageId||imageOperation));if(message.error||image?.image?.status==='failed'){error=message.error||image?.image?.error||'Image generation failed.';imageMessageId=image?.id||imageMessageId;imageOperation=''}else if(image?.image?.status==='ready'){owner=image.to;peer=image.from;imageOperation='';page='thread';send('read',{from:owner,to:peer})}}
      if(message.operationId===appPosting){error=message.error||'';if(!error){appDraft='';appMemory(appDrafts).delete(appTargetId);if(page==='bubble'){page=selectedBubble?.app?'core-app':'thread';selectedBubble=null}}appPosting=''}
      if(message.operationId===portraitOperation&&message.state.portraits?.[portraitActor]?.status!=='pending'){portraitOperation='';error=message.error||message.state.portraits?.[portraitActor]?.error||''}
      if(message.operationId===contactSaving){error=message.error||'';contactSaving='';if(!error){contactName='';contactDescription='';page='contacts'}}
      if(message.operationId===selectedOperation){error=message.error||''; if(!error){if(sceneDraft===message.state.sharedScene)sceneDraft=null;if(connectionDraft===(message.state.connectionId||''))connectionDraft=null;if(contextModeDraft===message.state.contextMode)contextModeDraft=null;if(autoReplyDraft===message.state.autoReply)autoReplyDraft=null;if(JSON.stringify(incomingDraft)===JSON.stringify(message.state.incoming))incomingDraft=null} }
      if(message.operationId===handingOff){handingOff=''}
      render()
    }else if((message as any).type==='phone_error'){if(message.operationId===connectionSaving){connectionSaving='';connectionFeedback='Shared connection was not saved. Retry.'}if(message.operationId===settingsSaving){settingsSaving='';settingsFeedback='Settings were not saved. Retry after resolving the error.'}const retryImage=appImageRetryOperations.get(message.operationId);if(retryImage){appImageRetryOperations.delete(message.operationId);appImageRetriesInFlight.delete(retryImage.key)}if(loadRecovery.owns(message.operationId)){loadRecovery.stop();loadError=message.error||'Phone load failed. Retry when connected.'}error=message.error||'Phone request failed.';submitting='';if(message.operationId===handingOff)handingOff='';if(message.operationId===imageOperation)imageOperation='';if(message.operationId===appPosting)appPosting='';if(message.operationId===coreLoading)coreLoading='';render()}
  })
  const offSwitch=ctx.events.on('CHAT_SWITCHED',switchChat);const offChange=ctx.events.on('CHAT_CHANGED',switchChat)
  const onNotification=(event:Event)=>{
    if(!enabled)return
    const library=event.composedPath().find(target=>target instanceof window.HTMLElement&&target.matches('[data-reverie-phone-library="true"]'))
    if(library){event.preventDefault();event.stopPropagation();open();return}
    const button=event.composedPath().find(target=>target instanceof window.HTMLElement&&target.matches('[data-reverie-phone-open]')) as HTMLElement|undefined
    if(!button||!button.dataset.phoneFrom||!button.dataset.phoneTo)return
    event.preventDefault();event.stopPropagation();open({from:button.dataset.phoneFrom,to:button.dataset.phoneTo,scope:button.dataset.phoneScope||'invalid'})
  }
  document.addEventListener('click',onNotification,true)
  const offEnded=ctx.events.on('GENERATION_ENDED',()=>loadPhone())
  const offEdited=ctx.events.on('MESSAGE_EDITED',()=>loadPhone())
  const offSwiped=ctx.events.on('MESSAGE_SWIPED',()=>loadPhone())
  const recoverConnection=()=>{if(!disposed&&overlay&&document.visibilityState!=='hidden'){loadPhone();render()}}
  window.addEventListener('online',recoverConnection);document.addEventListener('visibilitychange',recoverConnection)
  render();if(chatId)loadPhone()
  return { open,
    setEnabled(value:boolean){if(value===enabled)return;enabled=value;stopNotification();knownDelivered=null;if(!enabled)close();render();if(enabled&&chatId)loadPhone()},
    mountSettings(root:HTMLElement){settingsRoot=shadow(root);render();if(chatId&&!data)loadPhone()},
    unmountSettings(){settingsRoot=null;if(!enabled)loadRecovery.stop()},
    destroy(){disposed=true;stopNotification();close();settingsRoot=null;unsubscribe();offSwitch();offChange();offEnded();offEdited();offSwiped();document.removeEventListener('click',onNotification,true);window.removeEventListener('online',recoverConnection);document.removeEventListener('visibilitychange',recoverConnection);launcher.destroy()} }
}
