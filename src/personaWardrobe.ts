import type { NarrativeSurfacePresentationVariant } from './surfacePresentation'
import { surfaceIconMarkup } from './surfaceIcons'

/** Model-facing ownership only. Tabs, buttons, active state, and CSS belong to
 * the renderer, never to the Story Model or the image provider. */
export const PERSONA_WARDROBE_UTILITY_PROMPT = `# Persona Wardrobe — private atelier
Use only when outfit selection, dressing, styling, or an appearance change is relevant to the current scene or the user asks for looks. This is a choice utility, not RP narration or story progression. Style the active user persona unless another named subject is explicitly requested. Respect established taste, current setting, occasion, season, and climate. Never invent a new identity.
Emit exactly one [persona_wardrobe] with exactly five distinct [outfit_option] blocks. Make the looks meaningfully different in silhouette, mood, and palette. Output only the bracket payload; no Markdown, HTML, renderer-owned tags, or explanatory prose.

[persona_wardrobe]
[title]Persona Wardrobe[/title]
[subtitle]Short elegant subtitle[/subtitle]
[wardrobe_context][character]Subject being styled[/character][occasion]Current event or use case[/occasion][season]Season or climate[/season][location]Current place[/location][style_note]One concise styling goal[/style_note][/wardrobe_context]
[outfit_option]
[id]unique-look-id[/id]
[name]Distinct look name[/name]
[style_tags]three concise, comma-separated style tags[/style_tags]
[occasion_fit]Best use case[/occasion_fit]
[color_story]Short palette[/color_story]
[summary]One or two sentences selling the overall silhouette and mood.[/summary]
[pieces][top]Top if applicable[/top][outerwear]Outerwear if applicable[/outerwear][bottom]Bottom if applicable[/bottom][dress]Dress if applicable[/dress][legwear]Legwear if applicable[/legwear][shoes]Shoes[/shoes][accessories]Accessories[/accessories][/pieces]
[wear_text]Subject named in [character] is wearing a concise, natural, RP-ready description of this exact look.[/wear_text]
[media]<image_request id="unique-image-id" target="custom.artifact-media" slot="unique-image-id" aspect="3:4" alt="Accessible outfit description"><scene_brief>Fashion-only full coordinated outfit presentation: mannequin, dress form, hanger styling, or polished flat lay. Describe garments, colors, materials, and accessories precisely. No person portrait, readable text, UI, social media framing, or story instruction.</scene_brief></image_request>[/media]
[/outfit_option]
Repeat [outfit_option] until there are exactly five options, then close [/persona_wardrobe]. Each [media] contains exactly one native image request with target="custom.artifact-media" and aspect="3:4". Do not emit [buttons], [wardrobe_tabs], active-state tags, HTML, or CSS. The person in every [wear_text] must be exactly the person named in [wardrobe_context][character]; begin with that name followed by " is wearing...". Do not substitute the active persona when a different named subject was explicitly requested. Never mention this Surface, its tabs, or its cards in wear_text.`

export const PERSONA_WARDROBE_TEXT_ONLY_PROMPT = `# Persona Wardrobe — text-only private atelier
Use only when outfit selection, dressing, styling, or an appearance change is relevant, or the user asks for looks. Style the active user persona unless another named subject is explicitly requested. Respect established taste, occasion, season, climate, and location. This is a choice utility, not RP narration. Do not output image requests, HTML, CSS, Markdown, or renderer-owned tags.
Emit exactly one [persona_wardrobe] with [title], [subtitle], [wardrobe_context] containing [character], [occasion], [season], [location], [style_note], and exactly five [outfit_option] blocks. Each option contains, in order, [id], [name], [style_tags], [occasion_fit], [color_story], [summary], [pieces], [wear_text], and an empty [media][/media]. Within [pieces], describe applicable [top], [outerwear], [bottom], [dress], [legwear], [shoes], and [accessories]. Do not invent incompatible garment combinations. Make all five looks meaningfully distinct.
[persona_wardrobe]
[title]Persona Wardrobe[/title][subtitle]Short elegant subtitle[/subtitle]
[wardrobe_context][character]Subject[/character][occasion]Event[/occasion][season]Season[/season][location]Place[/location][style_note]Styling goal[/style_note][/wardrobe_context]
[outfit_option][id]unique-look-id[/id][name]Look name[/name][style_tags]Three concise tags[/style_tags][occasion_fit]Best use[/occasion_fit][color_story]Palette[/color_story][summary]Mood and silhouette.[/summary][pieces][top]Top if applicable[/top][outerwear]Outerwear if applicable[/outerwear][bottom]Bottom if applicable[/bottom][dress]Dress if applicable[/dress][legwear]Legwear if applicable[/legwear][shoes]Shoes[/shoes][accessories]Accessories[/accessories][/pieces][wear_text]Subject named in [character] is wearing a concise, natural, RP-ready description of this exact look.[/wear_text][media][/media][/outfit_option]
Repeat [outfit_option] to exactly five options, then close [/persona_wardrobe]. Every media wrapper remains empty. The person in every [wear_text] must exactly match [wardrobe_context][character]; begin with that name followed by " is wearing...". Do not substitute the active persona when a different named subject was explicitly requested. Never mention the Surface or UI.`

const field = (source: string, name: string): string | null => {
  const match = new RegExp(`\\[${name}\\]([\\s\\S]*?)\\[\\/${name}\\]`, 'i').exec(source)
  return match ? match[1].trim() : null
}
const escapeHtml = (value: string): string => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const safeKey = (value: string): string => value.replace(/[^A-Za-z0-9_-]+/g, '-').slice(0, 80) || 'wardrobe'
const wearTextForSubject = (wear: string, subject: string): string => {
  // Story Models can resolve {{user}} to the active persona even when this
  // utility was explicitly asked to style somebody else. Keep the authored
  // garments, but make the Composer draft agree with [character].
  return subject ? wear.replace(/^.{1,100}?\s+(?=is wearing\b)/i, `${subject} `) : wear
}

export const PERSONA_WARDROBE_STYLE = `<style data-reverie-persona-wardrobe="1">
.pw-wardrobe{--pw-accent:var(--lumiverse-primary,#c66591);--pw-text:var(--lumiverse-text,#f8f0f5);--pw-muted:var(--lumiverse-text-muted,#c8b9c3);--pw-bg:var(--lumiverse-bg-deep,#10090e);--pw-gold:#d7bd91;width:min(96%,820px);margin:12px auto;color:var(--pw-text);font-family:var(--lumiverse-font-family,system-ui,sans-serif);line-height:1.4}
.pw-wardrobe,.pw-wardrobe *{box-sizing:border-box}.pw-wardrobe>summary{display:flex;align-items:center;justify-content:center;gap:9px;width:fit-content;max-width:100%;min-height:40px;margin:auto;padding:9px 17px;border:1px solid color-mix(in srgb,var(--pw-accent) 55%,transparent);border-radius:999px;background:linear-gradient(160deg,color-mix(in srgb,var(--pw-bg) 75%,var(--pw-accent) 25%),var(--pw-bg));color:var(--pw-text);font:800 10px/1.2 var(--lumiverse-font-mono,monospace);letter-spacing:.12em;text-transform:uppercase;cursor:pointer;list-style:none;box-shadow:0 8px 24px #0005}.pw-wardrobe>summary::-webkit-details-marker{display:none}.pw-wardrobe>summary::marker{content:""}.pw-wardrobe>summary .rr-surface-svg-icon{display:inline-grid;width:17px;height:17px;color:var(--pw-gold)}.pw-wardrobe>summary svg{display:block;width:100%;height:100%}
.pw-wardrobe.rr-surface-presentation-inline>summary{display:none}.pw-wardrobe.rr-surface-presentation-button>summary{border-radius:12px;box-shadow:none;background:var(--pw-bg)}.pw-wardrobe.rr-surface-presentation-sparkling>summary{box-shadow:0 0 0 1px color-mix(in srgb,var(--pw-accent) 24%,transparent),0 0 26px color-mix(in srgb,var(--pw-accent) 30%,transparent)}.pw-wardrobe[data-pw-variant="glass"]>summary,.pw-wardrobe[data-pw-variant="plain-glass"]>summary{border-radius:13px;background:color-mix(in srgb,var(--pw-bg) 36%,transparent);box-shadow:0 0 12px color-mix(in srgb,var(--pw-accent) 12%,transparent);backdrop-filter:blur(12px)}.pw-wardrobe[data-pw-variant="plain-glass"]>summary{box-shadow:none}
.pw-shell{margin-top:10px;overflow:hidden;border:1px solid color-mix(in srgb,var(--pw-accent) 30%,transparent);border-radius:22px;background:radial-gradient(ellipse at 50% -20%,color-mix(in srgb,var(--pw-accent) 13%,transparent),transparent 45%),linear-gradient(145deg,color-mix(in srgb,var(--pw-bg) 91%,#2b1722 9%),var(--pw-bg));box-shadow:0 18px 45px #0006}.pw-head{display:flex;align-items:end;justify-content:space-between;gap:14px;padding:19px 20px 15px;border-bottom:1px solid #ffffff18}.pw-eyebrow{font:800 9px/1 var(--lumiverse-font-mono,monospace);letter-spacing:.18em;text-transform:uppercase;color:var(--pw-gold)}.pw-title{margin:5px 0 0;font:600 clamp(21px,4vw,30px)/1.1 Georgia,serif}.pw-sub{margin:5px 0 0;color:var(--pw-muted);font-size:12px}.pw-context{max-width:42%;text-align:right;color:var(--pw-muted);font-size:10px}.pw-context strong{display:block;color:var(--pw-text);font-size:11px}
.pw-radio{position:absolute!important;width:1px!important;height:1px!important;opacity:0!important}.pw-rail{display:grid;grid-template-columns:repeat(5,minmax(95px,1fr));gap:7px;padding:17px 15px 10px;overflow-x:auto;scrollbar-width:thin}.pw-tab{position:relative;display:flex;flex-direction:column;justify-content:center;gap:3px;min-height:48px;padding:7px 9px;border:1px solid #ffffff24;border-radius:9px 9px 13px 13px;background:color-mix(in srgb,var(--pw-bg) 88%,var(--pw-accent) 12%);cursor:pointer}.pw-tab:before{content:"";position:absolute;top:-6px;left:calc(50% - 8px);width:16px;height:7px;border:1px solid var(--pw-gold);border-bottom:0;border-radius:9px 9px 0 0}.pw-tab small{color:var(--pw-gold);font:800 8px/1 var(--lumiverse-font-mono,monospace);letter-spacing:.12em;text-transform:uppercase}.pw-tab span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px;color:var(--pw-muted)}
.pw-radio[data-pw-index="1"]:checked~.pw-rail label:nth-child(1),.pw-radio[data-pw-index="2"]:checked~.pw-rail label:nth-child(2),.pw-radio[data-pw-index="3"]:checked~.pw-rail label:nth-child(3),.pw-radio[data-pw-index="4"]:checked~.pw-rail label:nth-child(4),.pw-radio[data-pw-index="5"]:checked~.pw-rail label:nth-child(5){border-color:var(--pw-accent);background:color-mix(in srgb,var(--pw-bg) 64%,var(--pw-accent) 36%);box-shadow:0 6px 18px #0005}.pw-radio:focus-visible~.pw-rail{outline:2px solid var(--pw-accent);outline-offset:-2px}
.pw-stage{padding:5px 15px 16px}.pw-panel{display:none}.pw-radio[data-pw-index="1"]:checked~.pw-stage .pw-panel-1,.pw-radio[data-pw-index="2"]:checked~.pw-stage .pw-panel-2,.pw-radio[data-pw-index="3"]:checked~.pw-stage .pw-panel-3,.pw-radio[data-pw-index="4"]:checked~.pw-stage .pw-panel-4,.pw-radio[data-pw-index="5"]:checked~.pw-stage .pw-panel-5{display:block}.pw-look{display:grid;grid-template-columns:minmax(0,.9fr) minmax(0,1.1fr);gap:15px;padding:14px;border:1px solid #ffffff20;border-radius:17px;background:linear-gradient(135deg,#ffffff08,color-mix(in srgb,var(--pw-bg) 86%,var(--pw-accent) 14%))}.pw-look.pw-look-text-only{grid-template-columns:1fr}.pw-mirror{min-width:0;padding:7px;border:1px solid color-mix(in srgb,var(--pw-gold) 24%,transparent);border-radius:14px;background:#0002}.pw-media{display:grid;place-items:center;min-height:290px;overflow:hidden;border-radius:10px;background:#0004}.pw-media>*{max-width:100%;min-width:0}.pw-media img,.pw-media .reverie-artifact-media{display:block!important;width:100%!important;max-width:100%!important;height:auto!important;max-height:520px!important;object-fit:contain!important}.pw-media .rrl-island,.pw-media .rrl-media-slot,.pw-media .rm-card{width:100%;max-width:100%}
.pw-copy{display:flex;flex-direction:column;min-width:0;padding:5px 3px}.pw-lookno{color:var(--pw-gold);font:800 9px/1 var(--lumiverse-font-mono,monospace);letter-spacing:.16em;text-transform:uppercase}.pw-name{margin:7px 0 0;font:600 clamp(21px,4vw,30px)/1.1 Georgia,serif}.pw-summary{margin:9px 0;color:var(--pw-muted);font-size:12px;line-height:1.55}.pw-tags{display:flex;flex-wrap:wrap;gap:5px;margin:5px 0 11px}.pw-chip{padding:5px 8px;border:1px solid #ffffff26;border-radius:999px;color:var(--pw-muted);font:700 9px/1.2 var(--lumiverse-font-mono,monospace)}.pw-pieces{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:5px 10px;margin:3px 0 12px}.pw-piece{font-size:11px;color:var(--pw-muted)}.pw-piece b{display:block;color:var(--pw-gold);font:800 8px/1.5 var(--lumiverse-font-mono,monospace);letter-spacing:.1em;text-transform:uppercase}.pw-wearcopy{margin-top:auto;padding:10px 12px;border-left:2px solid var(--pw-accent);border-radius:0 9px 9px 0;background:#ffffff09;font-size:11px;line-height:1.5}.pw-wear{display:inline-flex;align-items:center;gap:10px;margin-top:12px;padding:10px 14px;border:1px solid var(--pw-accent);border-radius:999px;background:linear-gradient(135deg,color-mix(in srgb,var(--pw-bg) 57%,var(--pw-accent) 43%),var(--pw-bg));color:var(--pw-text);font:800 10px/1.2 var(--lumiverse-font-mono,monospace);cursor:pointer}.pw-wear:hover{filter:brightness(1.15)}.pw-wear:focus-visible,.pw-tab:focus-visible{outline:2px solid var(--pw-gold);outline-offset:2px}.pw-wear em{color:var(--pw-gold);font-style:normal}
@media(max-width:620px){.pw-wardrobe{width:100%;margin:9px auto}.pw-head{align-items:start;flex-direction:column;padding:16px}.pw-context{max-width:none;text-align:left}.pw-rail{grid-template-columns:repeat(5,minmax(104px,1fr));padding:15px 12px 9px}.pw-stage{padding:4px 10px 11px}.pw-look{grid-template-columns:1fr;padding:9px;gap:10px}.pw-media{min-height:0}.pw-media img{max-height:50vh!important}.pw-copy{padding:5px}.pw-pieces{grid-template-columns:1fr 1fr}.pw-shell{border-radius:17px}}
@media(prefers-reduced-motion:reduce){.pw-wardrobe *{animation:none!important;transition:none!important}}
</style>`

function renderOwner(body: string, variant: NarrativeSurfacePresentationVariant, messageId: string, occurrence: number): string | null {
  const context = field(body, 'wardrobe_context')
  const title = field(body, 'title')
  const subtitle = field(body, 'subtitle')
  if (!context || title === null || subtitle === null) return null
  const character = field(context, 'character')
  const occasion = field(context, 'occasion')
  const season = field(context, 'season')
  const location = field(context, 'location')
  const styleNote = field(context, 'style_note')
  if ([character, occasion, season, location, styleNote].some(value => value === null)) return null
  const optionMatches = [...body.matchAll(/\[outfit_option\]([\s\S]*?)\[\/outfit_option\]/gi)]
  if (optionMatches.length !== 5 || (body.match(/\[outfit_option\]/gi) || []).length !== 5 || (body.match(/\[\/outfit_option\]/gi) || []).length !== 5) return null
  const options = optionMatches.map(match => {
    const source = match[1]
    const pieces = field(source, 'pieces')
    const option = {
      id: field(source, 'id'), name: field(source, 'name'), tags: field(source, 'style_tags'),
      fit: field(source, 'occasion_fit'), colors: field(source, 'color_story'), summary: field(source, 'summary'),
      pieces, wear: field(source, 'wear_text'), media: field(source, 'media'),
    }
    if (Object.values(option).some(value => value === null) || !option.id || !option.name || !option.wear) return null
    return option as { id: string; name: string; tags: string; fit: string; colors: string; summary: string; pieces: string; wear: string; media: string }
  })
  if (options.some(option => !option)) return null
  const looks = options as NonNullable<typeof options[number]>[]
  if (new Set(looks.map(look => look.id)).size !== 5) return null
  const key = `pw-${safeKey(messageId)}-${occurrence}`
  const mode = variant === 'inline' ? 'inline' : variant === 'plain-button' ? 'button' : variant === 'sparkle-button' ? 'sparkling' : 'glass'
  const radios = looks.map((_, index) => `<input class="pw-radio" type="radio" name="${key}" id="${key}-${index + 1}" data-pw-index="${index + 1}" aria-label="Look ${index + 1}"${index === 0 ? ' checked' : ''}>`).join('')
  const tabs = looks.map((look, index) => `<label class="pw-tab" for="${key}-${index + 1}"><small>Look ${String(index + 1).padStart(2, '0')}</small><span>${escapeHtml(look.name)}</span></label>`).join('')
  const panels = looks.map((look, index) => {
    const parts = ['top', 'outerwear', 'bottom', 'dress', 'legwear', 'shoes', 'accessories'].flatMap(name => {
      const value = field(look.pieces, name)
      return value ? [`<span class="pw-piece"><b>${name}</b>${escapeHtml(value)}</span>`] : []
    }).join('')
    const hasMedia = Boolean(look.media.trim())
    const wear = wearTextForSubject(look.wear, character || '')
    return `<section class="pw-panel pw-panel-${index + 1}" aria-label="${escapeHtml(look.name)}"><div class="pw-look${hasMedia ? '' : ' pw-look-text-only'}">${hasMedia ? `<div class="pw-mirror"><div class="pw-media">${look.media}</div></div>` : ''}<div class="pw-copy"><div class="pw-lookno">Look ${String(index + 1).padStart(2, '0')} · ${escapeHtml(look.fit)}</div><h3 class="pw-name">${escapeHtml(look.name)}</h3><p class="pw-summary">${escapeHtml(look.summary)}</p><div class="pw-tags"><span class="pw-chip">${escapeHtml(look.tags)}</span><span class="pw-chip">${escapeHtml(look.colors)}</span></div><div class="pw-pieces">${parts}</div><div class="pw-wearcopy">${escapeHtml(wear)}</div><button type="button" class="pw-wear" data-rrn-action="wardrobe-wear"><span>Wear this outfit</span><em>→ Composer</em></button></div></div></section>`
  }).join('')
  return `<!-- UI_START -->${PERSONA_WARDROBE_STYLE}<details class="pw-wardrobe rr-surface-presentation-${mode}" data-pw-variant="${variant}"${variant === 'inline' ? ' open' : ''}><summary>${surfaceIconMarkup('narrative', 'Persona Wardrobe')}<span>Persona Wardrobe</span></summary><div class="pw-shell"><header class="pw-head"><div><div class="pw-eyebrow">Private Atelier · ${escapeHtml(character || '')}</div><h2 class="pw-title">${escapeHtml(title)}</h2><p class="pw-sub">${escapeHtml(subtitle)}</p></div><div class="pw-context"><strong>${escapeHtml(occasion || '')} · ${escapeHtml(season || '')}</strong><span>${escapeHtml(location || '')}</span></div></header>${radios}<nav class="pw-rail" aria-label="Wardrobe looks">${tabs}</nav><div class="pw-stage">${panels}</div></div></details><!-- UI_END -->`
}

/** Transform only complete five-look owners; ambiguous or partial markup stays
 * untouched for the existing Surface repair and edit path. Media is opaque so
 * raw requests, placeholders, completed images, and errors keep their owner. */
export function renderPersonaWardrobeMarkup(markup: string, variant: NarrativeSurfacePresentationVariant, messageId = 'narrative'): string {
  let occurrence = 0
  return String(markup || '').replace(/\[persona_wardrobe\]([\s\S]*?)\[\/persona_wardrobe\]/gi, (full, body: string) => {
    const rendered = renderOwner(body, variant, messageId, occurrence++)
    return rendered || full
  })
}
