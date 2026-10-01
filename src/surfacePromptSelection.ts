import type { CustomSurfaceDefinition, CustomSurfaceStudioState } from './contracts'

/** Resolve one active preset per Surface family, with a built-in fallback if a
 * saved collection points at a deleted custom preset. */
export function activeSurfaceDefinitions(studio: CustomSurfaceStudioState): CustomSurfaceDefinition[] {
  const selected: CustomSurfaceDefinition[] = []
  const seen = new Set<string>()
  for (const definition of Object.values(studio.definitions || {})) {
    const activeId = studio.activePresetIds?.[definition.baseSurfaceId]
    const active = activeId && studio.definitions[activeId]?.baseSurfaceId === definition.baseSurfaceId
      ? studio.definitions[activeId]
      : Object.values(studio.definitions).find(candidate => candidate.baseSurfaceId === definition.baseSurfaceId && candidate.builtIn)
        || definition
    if (!active || seen.has(active.baseSurfaceId)) continue
    seen.add(active.baseSurfaceId)
    selected.push(active)
  }
  return selected.sort((left, right) => left.promptCategory.localeCompare(right.promptCategory) || left.displayName.localeCompare(right.displayName))
}
