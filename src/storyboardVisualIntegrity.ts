/** Shared positive composition guardrails for Storyboard prompt routes. */
export const STORYBOARD_SPATIAL_FIDELITY_GUIDANCE = `STORYBOARD SPATIAL FIDELITY: Treat the selected story excerpt as the authority for physical blocking. For every named visible actor, preserve their frame position, body orientation, distance, posture, gaze, and hand-to-target contact as the source establishes them. Keep each figure visually distinct and assign every visible hand and limb to its correct body. Frame the complete interacting gesture where the chosen shot permits. For Danbooru output, express these facts with separate person-specific pose/action/contact tags and recognized frame-placement tags; do not flatten several actors into one shared pose.`

/** A positive provider-facing reminder; it names no unsupported actor or action. */
export function storyboardFigureIntegrityClause(expectedPeopleCount: number, namedSubjects: string[] = []): string {
  const count = Number.isFinite(expectedPeopleCount) ? Math.max(0, Math.floor(expectedPeopleCount)) : 0
  if (count < 2) return ''
  const names = [...new Set(namedSubjects.map(name => name.trim()).filter(Boolean))]
  const cast = names.length ? `, including ${names.join(' and ')}` : ''
  return `Show exactly ${count} visible people${cast}, each with a distinct, readable silhouette and visible limbs clearly connected to the correct body. Preserve every source-stated position, orientation, distance, and contact point.`
}
