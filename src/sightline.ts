/** Relay-owned camera projection. Changes camera words only, never cast or action.
 * This bounded English cue detector is not an entailment or anatomy oracle. */
export type DreamcutFocus = { kind: 'object' | 'environment' | 'reflection' | 'silhouette' | 'detail'; quote: string }
const readable = (s: string) => s.replace(/_/g, ' ').replace(/\s+/g, ' ').trim().toLocaleLowerCase()
const performed = (s: string) => readable(s.replace(/"[^"\n]*"|“[^”\n]*”/g, '')).split(/[.!?\n]+/)
  .filter(s => !/\b(?:not|never|would|could|might|imagine|remember|used to)\b/.test(s)).join('. ')
const frame = /\b(?:close[-_ ]up(?: of (?:her|his|their|the) face)?|portrait|head[-_ ]and[-_ ]shoulders|bust[_ ]shot|waist[-_ ]up|upper[-_ ]body|medium[_ ]shot|knees[-_ ]up|full[-_ ]body|wide[_ ]shot)\b/gi
const level = (s: string) => /full[-_ ]body|wide[_ ]shot/i.test(s) ? 4 : /knees[-_ ]up/i.test(s) ? 3 : /medium[_ ]shot/i.test(s) ? 2 : /waist[-_ ]up|upper[-_ ]body/i.test(s) ? 1 : 0

export function guardSightline(prompt: string, source: string, enabled = true, tags = false): { prompt: string; notes: string[] } {
  if (!enabled || !source.trim()) return { prompt, notes: [] }
  const action = performed(source), notes: string[] = []
  let required = -1
  if (/\b(?:feet|foot|boots?|shoes?|toes?)\b.{0,65}\b(?:floor|ground|step|stair|pedal)\b|\b(?:kick(?:s|ed|ing)?|stomp(?:s|ed|ing)?|ties? (?:his |her |their )?shoelaces)\b/.test(action)) required = 4
  else if (/\b(?:palms?|hands?|fingers?)\b.{0,65}\b(?:thighs?|knees?|lap)\b/.test(action)) required = 3
  else if (/\b(?:hold(?:s|ing)?|held|grip(?:s|ped|ping)?|touch(?:es|ed|ing)?|rest(?:s|ed|ing)?|press(?:es|ed|ing)?|reach(?:es|ed|ing)?)\b/.test(action)) required = 2
  const matches = [...readable(prompt).matchAll(frame)]
  let result = prompt
  if (required >= 0 && matches.some(m => level(m[0]) < required)) {
    const replacement = required === 4 ? 'full body' : required === 3 ? 'knees-up' : 'medium shot'
    // Normalize separators only for matching camera fragments; do not flatten
    // the owner's prose paragraphs or rewrite the remainder of a Booru item.
    result = result.replace(frame, value => level(value) < required ? replacement : value)
    if (tags) result = result.split(',').map(s => s.trim().replace(/\b(full body|medium shot)\b/g, s => s.replace(/ /g, '_'))).join(', ')
    notes.push(`Sightline Guard widened the crop to ${replacement} for the anchored action.`)
  }
  if (/\b(?:smil(?:e|es|ed|ing)|gazes?|eye contact|facial expression|tears|grins?)\b/.test(action)
    && !/\b(?:from behind|rear view|back view)\b/.test(action)) {
    const rear = /\b(?:from[_ ]behind|rear[_ ]view|back[_ ]view)\b/gi
    if (rear.test(result)) {
      result = result.replace(rear, tags ? 'three-quarter_view' : 'three-quarter view')
      notes.push('Sightline Guard kept the source facial action visible with a three-quarter view.')
    }
  }
  return { prompt: result, notes }
}

export function validDreamcutFocus(value: unknown, source: string): value is DreamcutFocus {
  if (!value || typeof value !== 'object') return false
  const focus = value as DreamcutFocus
  return ['object', 'environment', 'reflection', 'silhouette', 'detail'].includes(focus.kind)
    && typeof focus.quote === 'string' && focus.quote.trim().length >= 3 && focus.quote.length <= 240
    && readable(source).includes(readable(focus.quote))
}

export function chooseSceneFlow(source: string, visibleCount: number, focus?: DreamcutFocus): 'scene-snapshot' | 'blocking-fidelity' | 'dreamcut' {
  const motion = /\b(?:hold(?:s|ing)?|held|grip(?:s|ped|ping)?|hand(?:s|ed|ing)?|touch(?:es|ed|ing)?|rest(?:s|ed|ing)?|lift(?:s|ed|ing)?|reach(?:es|ed|ing)?|sit(?:s|ting)?|sat|kneel(?:s|ing)?|kick(?:s|ed|ing)?|run(?:s|ning)?|walk(?:s|ed|ing)?|embrac(?:e|es|ing)|hug(?:s|ged|ging)?)\b/
  if (visibleCount > 0 && motion.test(performed(source))) return 'blocking-fidelity'
  if (visibleCount === 0 && validDreamcutFocus(focus, source)) return 'dreamcut'
  return 'scene-snapshot'
}

/** Story requests keep their own treatment in saved XML, so a reload does not
 * depend on the current framing selector. Unknown attributes never grant it. */
export function storyFraming(mode: string, xml: string, source: string, count: number): string {
  const opening = xml.match(/^<reverie-illustration\b[^>]*>/i)?.[0] || ''
  const attr = (name: string) => {
    const raw = opening.match(new RegExp(`\\b${name}=["']([^"']*)["']`, 'i'))?.[1] || ''
    return raw.replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
  }
  const focus = { kind: attr('focus-kind'), quote: attr('focus') } as DreamcutFocus
  const saved = attr('framing')
  const effective = ['scene-snapshot', 'blocking-fidelity', 'dreamcut'].includes(saved) ? saved : mode
  if (mode !== 'scene-flow' && mode !== 'dreamcut') return mode
  if (effective === 'dreamcut' && validDreamcutFocus(focus, source)) return 'dreamcut'
  if (mode === 'dreamcut') return 'scene-snapshot' // missing evidence keeps a normal scene eligible
  return chooseSceneFlow(source, count, validDreamcutFocus(focus, source) ? focus : undefined)
}

export const SIGHTLINE_GUIDANCE = `SIGHTLINE GUARD: Choose a camera that makes the source action readable. Keep the acting hand, exact contact target and owned prop inside the crop. Feet touching the floor require a full-body or wider shot; palms on thighs require a knees-up or wider shot. Facial reactions require a visible face unless the story fixes another view. Never change the actor, side, prop owner, posture or contact to fit a prettier crop. Do not add limbs hidden by occlusion. A camera check cannot guarantee image-model anatomy.`
export const DREAMCUT_GUIDANCE = `DREAMCUT: Select one source-established object, environmental detail, reflection, silhouette or limited body detail as a quiet visual cutaway. Director JSON reports dreamcutFocus with kind (object/environment/reflection/silhouette/detail) and quote (an exact short phrase from this image's own paragraph). Story XML instead places framing="dreamcut", focus-kind="object" (or the applicable kind) and focus="exact short source phrase" on the reverie-illustration opening tag. Preserve the anchor's material, color, state and location. An object/environment-only frame has expectedPeopleCount 0, namedSubjects [], subjectDirectives [], cast="none", and no invented people. A reflected person, silhouette or body detail still belongs to a source-established named subject and must be counted; describe only what this crop can reveal, including its relevant established appearance directly in visual_prompt. Never attach a complete character portrait to a selected fragment. No imagined symbolism or future aftermath.`
export const SCENE_FLOW_GUIDANCE = `SCENE FLOW: Choose each illustration's framingMode independently from scene-snapshot, blocking-fidelity, dreamcut. Still scene/setting -> scene-snapshot. Visible action, contact or owned prop -> blocking-fidelity. Use dreamcut only for a source-grounded cutaway without hiding that paragraph's required action. Include dreamcutFocus for that choice. Every shot keeps its own anchor, cast and current appearance. Do not change the requested number of inline images. Fixed Char only and Persona POV are never rerouted.`
