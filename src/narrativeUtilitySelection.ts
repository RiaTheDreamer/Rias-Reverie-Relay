export function updateNarrativeUtilitySelection(
  currentNames: readonly string[],
  masterEnabled: boolean,
  utilityName: string,
  enabled: boolean,
  availableNames: readonly string[],
): string[] {
  // A disabled master can retain the shipped list for migration and
  // compatibility. Treat it as dormant, not as active selections, when a
  // user enables a single utility.
  const selected = new Set(masterEnabled ? currentNames : [])
  if (enabled) selected.add(utilityName)
  else selected.delete(utilityName)
  return availableNames.filter(name => selected.has(name))
}
