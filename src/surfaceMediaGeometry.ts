/** Surface panes own media geometry, not the host's prose-image defaults.
 * Keep this below each Surface's intentional crop/height rules in specificity.
 * Completed lifecycle figures must also fit when the pending card's mounted
 * stylesheet is absent after a reload or replacement. Never target prose. */
const narrativeMediaOwners = '.r65-media,.rv6-media,.ru-media,.ru-portrait,.ru-secret-media,.ru-thread-media,.ra66-archive-media,.rrcp-media,.rrcp-photo-media,.rrcp-wallpaper,.dg-dramatic-media,.ch-media,.pw-media'
const fixedMediaOwners = '.r65-media,.rv6-media,.ru-portrait,.ru-secret-media,.ru-thread-media,.ra66-archive-media,.rrcp-media,.rrcp-photo-media,.rrcp-wallpaper'

export const SURFACE_MEDIA_GEOMETRY_CSS = `
:is([data-rrn-editable-surface],[data-rrn-surface],${narrativeMediaOwners}) :where(img){max-height:none}
:where(${fixedMediaOwners}){position:relative}
:is(${narrativeMediaOwners})>.rrl-island{display:block!important;width:100%!important;max-width:100%!important;min-width:0!important;margin:0!important}
:is(${narrativeMediaOwners}) .rrl-resolved{display:block!important;width:100%!important;max-width:100%!important;min-width:0!important;margin:0!important;padding:0!important}
:is(${narrativeMediaOwners}) .rrl-resolved>img{display:block;width:100%;max-width:100%;margin:0}
:is(${fixedMediaOwners})>.rrl-island:has(>.rrl-resolved){position:absolute!important;inset:0!important;height:100%!important}
:is(${fixedMediaOwners})>.rrl-island>.rrl-resolved{position:absolute!important;inset:0!important;height:100%!important}
:is(${fixedMediaOwners})>.rrl-island>.rrl-resolved>img{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;max-width:none!important;max-height:none!important;margin:0!important;object-fit:cover;object-position:center}
.ra66-card[data-archive-category="ITEM"] .ra66-archive-media>.rrl-island>.rrl-resolved>img{object-fit:contain!important}
`

export const SURFACE_MEDIA_GEOMETRY_STYLE = `<style data-reverie-surface-media-geometry="1">${SURFACE_MEDIA_GEOMETRY_CSS}</style>`
