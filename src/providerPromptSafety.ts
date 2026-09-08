export type ProviderPromptSafetyIssue = {
  field: 'prompt' | 'negativePrompt' | 'parameters'
  code: string
  message: string
}

export class ProviderPromptSafetyError extends Error {
  readonly issues: ProviderPromptSafetyIssue[]

  constructor(issues: ProviderPromptSafetyIssue[]) {
    super(`Relay blocked a contaminated provider request: ${issues.map(issue => issue.message).join('; ')}`)
    this.name = 'ProviderPromptSafetyError'
    this.issues = issues
  }
}

const RAW_MARKUP = /<\/?(?:character_profile|portrait|image_request|reverie-illustration|lorebook|entry|world_info|script|style|html|body|metadata)\b/i
const RAW_PROVENANCE = /\[[^\]\n]{0,80}(?:activated\s+)?(?:lorebook|world\s*book|world\s*lore|world\s*info|source|provenance|sidecar|card|history)[^\]\n]{0,80}:/i
const RAW_METADATA_LINE = /(?:^|[\n;,])\s*(?:song|lyrics?|chapter|lorebook\s+entry|world\s*(?:info|lore)|sidecar(?:\s+card)?|card|history|context\s+history|source(?:Reference|\s+reference)?|provenance|metadata|title|body|content|entry)\s*[-:=]/i
const RAW_NESTED_METADATA = /(?:^|\n)\s*(?:[-*]\s*)?(?:metadata|source|provenance|card|history|sidecar|lorebook|world\s*(?:info|lore))\s*:\s*(?:\{|\[|$)/im
const RAW_MARKDOWN = /```|^\s{0,3}#{1,6}\s+\S|!\[[^\]]*\]\([^)]*\)|\[[^\]]+\]\([^)]*\)/m
const RAW_JSON = /^\s*(?:\{[\s\S]*\}|\[[\s\S]*\])\s*$/
const RAW_JSON_PROVENANCE = /["'](?:sourceReference|source|provenance|metadata|card|history|sidecar|lorebook|worldLore|world_info|body|content)["']\s*:/
const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/

export function inspectProviderPromptSafety(
  prompt: string,
  negativePrompt = '',
  parameters: Record<string, unknown> = {},
): ProviderPromptSafetyIssue[] {
  const issues: ProviderPromptSafetyIssue[] = []
  for (const [field, value] of [['prompt', prompt], ['negativePrompt', negativePrompt]] as const) {
    if (CONTROL.test(value)) issues.push({ field, code: 'control-characters', message: `${field} contains control characters` })
    if (RAW_MARKUP.test(value)) issues.push({ field, code: 'raw-markup', message: `${field} contains raw XML or HTML` })
    if (RAW_PROVENANCE.test(value)) issues.push({ field, code: 'raw-provenance', message: `${field} contains a retrieval provenance label` })
    if (RAW_METADATA_LINE.test(value)) issues.push({ field, code: 'raw-metadata', message: `${field} contains raw story or lore metadata` })
    if (RAW_NESTED_METADATA.test(value)) issues.push({ field, code: 'raw-nested-metadata', message: `${field} contains nested retrieved metadata` })
    if (RAW_MARKDOWN.test(value)) issues.push({ field, code: 'raw-markdown', message: `${field} contains raw markdown or a code fence` })
    if (RAW_JSON.test(value) && /[\[{]\s*["'][\w -]+["']\s*:/.test(value)) issues.push({ field, code: 'raw-json', message: `${field} contains a raw JSON object` })
    if (RAW_JSON_PROVENANCE.test(value)) issues.push({ field, code: 'raw-json-provenance', message: `${field} contains raw source metadata JSON` })
  }

  const loraWeights = parameters.loraWeights ?? parameters.lora_weights
  if (typeof loraWeights === 'string') {
    const invalid = loraWeights.split(',').map(value => value.trim()).filter(value => value && !Number.isFinite(Number(value)))
    if (invalid.length) issues.push({ field: 'parameters', code: 'invalid-lora-weights', message: 'LoRA weight parameters contain non-numeric text' })
  }
  if (Array.isArray(loraWeights) && loraWeights.some(value => !Number.isFinite(Number(value)))) {
    issues.push({ field: 'parameters', code: 'invalid-lora-weights', message: 'LoRA weight parameters contain non-numeric values' })
  }
  const loraPayload = parameters.lora
  if (typeof loraPayload === 'string' && loraPayload.trim().startsWith('[')) {
    try {
      const parsed = JSON.parse(loraPayload)
      if (Array.isArray(parsed) && parsed.some(row => row && typeof row === 'object' && !Number.isFinite(Number((row as Record<string, unknown>).multiplier)))) {
        issues.push({ field: 'parameters', code: 'invalid-lora-multiplier', message: 'LoRA multiplier parameters contain non-numeric values' })
      }
    } catch {
      issues.push({ field: 'parameters', code: 'invalid-lora-json', message: 'LoRA parameters contain malformed JSON' })
    }
  }
  return issues
}

export function assertProviderRequestSafe(
  prompt: string,
  negativePrompt = '',
  parameters: Record<string, unknown> = {},
): void {
  const issues = inspectProviderPromptSafety(prompt, negativePrompt, parameters)
  if (issues.length) throw new ProviderPromptSafetyError(issues)
}
