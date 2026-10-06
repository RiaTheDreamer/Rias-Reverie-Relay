/** Framing describes the view, not equipment in the scene. Only recognized
 * framing phrases are rewritten; actual cameras and unknown uses stay intact.
 * JSON cameraAngle and other host/schema keys are deliberately unchanged.
 */
export function normalizeIllustrationViewWording(prompt: string, perspectiveMode: string, format = 'natural-language'): string {
  if (perspectiveMode !== 'storyboard') return prompt
  const framing = '(?:low[- _]angle|high[- _]angle|eye[- _]level|overhead|top[- _]down|bird[\'’]s[- _]eye|worm[\'’]s[- _]eye|dutch[- _]angle|wide|medium|close[- _]up|full[- _]body|upper[- _]body|rear|side|front|from[- _](?:above|below|behind|side))'
  const viewPrompt = prompt
    // Require a framing value after the label. "Camera: black DSLR" stays.
    .replace(new RegExp(`(^|[\\n,;.!]\\s*)camera(?:[ _-]+(?:angle|position|perspective|distance|framing))?\\s*:\\s*(?=${framing}\\b)`, 'giu'), '$1View: ')
    .replace(new RegExp(`\\bcamera[ -]+(?:angle|perspective|distance|position)\\s+(?=(?:is\\s+)?${framing}\\b)`, 'giu'), 'view ')
    .replace(new RegExp(`\\b(${framing})([ -]+)camera(?=\\s*(?:view|angle|perspective|shot|[,;.!]|$))`, 'giu'), (match, angle, separator, offset, text) =>
      /\b(?:a|an|the|holding|holds|mounted|placed)\s*$/iu.test(text.slice(Math.max(0, offset - 30), offset)) ? match : `${angle}${separator}view`)
    .replace(/\bview\s+view\b/giu, 'view')
  // Strip a framing label from an already-established viewpoint tag only.
  // Never invent underscores or a Booru tag from a natural-language angle.
  return format === 'danbooru-tags' ? viewPrompt.split(',').map(fragment =>
    fragment.replace(/^\s*View:\s*(from_above|from_below|from_side|from_behind|dutch_angle|full_body|upper_body|close-up)\s*$/iu, '$1')).join(',') : viewPrompt
}
