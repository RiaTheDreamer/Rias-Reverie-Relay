/** Existing Narrative glass launcher appearance, shared by Core/App launchers.
 * Keep disclosure wrappers and Surface body styling outside this contract. */
export const GLASS_BUTTON_LAUNCHER_DECLARATIONS = 'position:relative!important;z-index:2!important;isolation:isolate!important;display:flex!important;align-items:center!important;justify-content:center!important;width:max-content!important;max-width:min(calc(100% - 24px),360px)!important;height:40px!important;min-height:40px!important;margin:0 auto!important;padding:0 20px!important;overflow:hidden!important;cursor:pointer!important;pointer-events:auto!important;list-style:none!important;border:1px solid color-mix(in srgb,var(--lumiverse-primary,#ff70bd) 7%,transparent)!important;border-radius:13px!important;background:color-mix(in srgb,var(--lumiverse-bg-deep,#0b0710) 4%,transparent)!important;color:var(--lumiverse-primary-text,var(--lumiverse-text,#f6f1f7))!important;font:800 10px/1 var(--lumiverse-font-mono,"Courier New",monospace)!important;letter-spacing:.18em!important;text-transform:uppercase!important;text-align:center!important;box-shadow:0 0 10px color-mix(in srgb,var(--lumiverse-primary,#ff70bd) 3%,transparent)!important;-webkit-backdrop-filter:blur(9px) saturate(1.05);backdrop-filter:blur(9px) saturate(1.05)'

/** Plain and Sparkling share the existing Narrative button design. Only the
 * shared particle field differs; app-specific body colors never style it. */
export const BUTTON_LAUNCHER_DECLARATIONS = GLASS_BUTTON_LAUNCHER_DECLARATIONS
  .replace('height:40px!important;min-height:40px!important', 'height:auto!important;min-height:42px!important')
  .replace('padding:0 20px!important', 'padding:10px 23px!important')
  .replace(' 7%,transparent)', ' 35%,transparent)')
  .replace('background:color-mix(in srgb,var(--lumiverse-bg-deep,#0b0710) 4%,transparent)!important', 'background:linear-gradient(180deg,color-mix(in srgb,var(--lumiverse-bg-elevated,#25172f) 76%,var(--lumiverse-primary,#ff70bd) 24%),color-mix(in srgb,var(--lumiverse-bg-deep,#0c0711) 90%,var(--lumiverse-primary,#ff70bd) 10%))!important')
  .replace('letter-spacing:.18em', 'letter-spacing:.19em')
  .replace('box-shadow:0 0 10px color-mix(in srgb,var(--lumiverse-primary,#ff70bd) 3%,transparent)!important', 'box-shadow:0 8px 24px #0003,inset 0 1px 0 #ffffff12!important')
  .replace(/(?:-webkit-)?backdrop-filter:[^;]+;?/g, '')

export type LauncherPresentation = 'inline' | 'plain' | 'sparkling' | 'glass' | 'plain-glass'
export function surfaceLauncherDeclarations(mode: LauncherPresentation, core = false): string {
  if (mode === 'inline') return 'display:none!important'
  const base = mode === 'glass' || mode === 'plain-glass' ? GLASS_BUTTON_LAUNCHER_DECLARATIONS : BUTTON_LAUNCHER_DECLARATIONS
  return base.replace('margin:0 auto!important', `margin:${core ? '16px auto' : '0 auto'}!important`) + ';box-sizing:border-box!important;gap:9px!important;min-width:0!important;white-space:normal!important;overflow-wrap:anywhere!important'
}
