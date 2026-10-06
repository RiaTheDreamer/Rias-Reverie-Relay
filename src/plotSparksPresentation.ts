import { PLOT_SPARK_VECTOR_BY_KEY } from './contracts'
import type { NarrativeRegexScript } from './narrativeRegexAssets'
import { xmlSurfaceRegex } from './xmlSurfaceFormat'

export const PLOT_SPARKS_SCRIPT_ID = 'ria_plot_sparks_og_sparkle_tabs_bulletproof_v7'
export const PLOT_SPARKS_LEGACY_SCRIPT_ID = `${PLOT_SPARKS_SCRIPT_ID}_legacy_seven`
const EXTRA_LENSES = [
  { key: 'h', tab: 'Chance', title: 'Golden Door' },
  { key: 'i', tab: 'Bargain', title: 'Dangerous Bargain' },
  { key: 'j', tab: 'Thread', title: 'Buried Thread' },
] as const

/** Extend the established seven-panel shell, not a second UI architecture.
 * Keep its original capture/action identities; append H–J before the root close.
 * A separate exact legacy matcher renders old boards without three empty tabs. */
export function plotSparksPresentationScripts(script: NarrativeRegexScript): NarrativeRegexScript[] {
  if (script.script_id !== PLOT_SPARKS_SCRIPT_ID) return [script]
  const extraFind = EXTRA_LENSES.map(({ key }) => `\\s*\\[Spark\\]\\s*\\[Key\\]\\s*${key}\\s*\\[/Key\\]\\s*\\[Vector\\]\\s*${PLOT_SPARK_VECTOR_BY_KEY[key].replaceAll('-', '\\-')}\\s*\\[/Vector\\]\\s*\\[Text\\]\\s*([\\s\\S]*?)\\s*\\[/Text\\]\\s*\\[Media\\]\\s*([\\s\\S]*?)\\s*\\[/Media\\]\\s*\\[/Spark\\]`).join('')
  const extraRadios = EXTRA_LENSES.map(({ key }) => `<input type="radio" id="ch-$1-${key}" name="ch-$1">`).join('')
  const extraTabs = EXTRA_LENSES.map(({ key, tab }) => `<label class="ch-tab" for="ch-$1-${key}">${tab}</label>`).join('')
  const extraPanels = EXTRA_LENSES.map(({ key, title }, index) => `<section class="ch-panel ch-panel-${key}"><div class="ch-cardhead"><div class="ch-vector">${title}</div></div><div class="ch-divider"></div><div class="ch-copy">$${17 + index * 2}</div><div class="ch-media">$${18 + index * 2}</div><div class="ch-actions"><button type="button" class="ch-btn" data-regex-action="choose-chaos-${key}">⑂ Branch from this Spark</button></div></section>`).join('')
  const replacement = script.replace_string
    .replace('repeat(7,minmax(0,1fr))', 'repeat(5,minmax(0,1fr))')
    .replace("#ch-$1-g:checked~.ch-tabs label[for='ch-$1-g']", ["#ch-$1-g:checked~.ch-tabs label[for='ch-$1-g']", ...EXTRA_LENSES.map(({ key }) => `#ch-$1-${key}:checked~.ch-tabs label[for='ch-$1-${key}']`)].join(','))
    .replace('#ch-$1-g:checked~.ch-tabs~.ch-stage .ch-panel-g', ['#ch-$1-g:checked~.ch-tabs~.ch-stage .ch-panel-g', ...EXTRA_LENSES.map(({ key }) => `#ch-$1-${key}:checked~.ch-tabs~.ch-stage .ch-panel-${key}`)].join(','))
    .replace('<div class="ch-tabs">', `${extraRadios}<div class="ch-tabs">`)
    .replace(/(<label class="ch-tab" for="ch-\$1-g">[\s\S]*?<\/label>)/, match => `${match}${extraTabs}`)
    .replace(/(<section class="ch-panel ch-panel-g">[\s\S]*?<\/section>)/, match => `${match}${extraPanels}`)
  const actions = EXTRA_LENSES.map(({ key, title }, index) => ({
    id: `choose-chaos-${key}`, type: 'effects', multi_select: false, cost: '1', limit: '1',
    title: `Branch from ${title}`, subtitle: `$${17 + index * 2}`, content: '',
    effects: [{ type: 'fork' }, { type: 'draft', content: `$${17 + index * 2}`, mode: 'replace' }],
  }))
  return [
    { ...script, name: 'Narrative - Plot Sparks - Ten Options', find_regex: script.find_regex.replace('\\s*</Plot_Sparks>', `${xmlSurfaceRegex(extraFind)}\\s*</Plot_Sparks>`), replace_string: replacement, actions: [...(script.actions || []), ...actions] },
    { ...script, script_id: PLOT_SPARKS_LEGACY_SCRIPT_ID, name: 'Narrative - Plot Sparks - Saved Seven Options' },
  ]
}
