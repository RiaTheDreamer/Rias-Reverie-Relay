import type {
  AppearanceCharacterSheet,
  AppearanceFactCategory,
  AppearanceHistoryEntry,
  AppearanceQuarantineItem,
  AppearanceSourceReference,
  AppearanceSourceType,
  AppearanceSuggestion,
  AppearanceVaultFact,
  AppearanceVaultLayer,
  CanonicalVisualCharacter,
  ContinuityDecision,
  ContinuityStrength,
  ContinuityVaultState,
  VaultMigrationDisposition,
  VaultMigrationItem,
  VaultMigrationPreview,
} from './contracts'

const INVALID_SUBJECTS = new Set([
  'he', 'she', 'him', 'her', 'his', 'hers', 'they', 'them', 'their', 'theirs',
  'it', 'its', 'realistic', 'cinematic', 'detailed', 'close', 'medium', 'wide',
  'selfie', 'character', 'subject', 'woman', 'girl', 'boy', 'man', 'person',
  'profile', 'portrait', 'photo', 'image', 'scene', 'lighting', 'composition',
  'camera', 'background', 'quality', 'masterpiece', 'illustration', 'render',
])

export function isUnresolvedAppearanceRole(value: string): boolean {
  return /^(?:active|current)[\s_-]+(?:persona|character|user)$/i.test(clean(value))
}

const TRUSTED_CHARACTER_SOURCES = new Set<AppearanceSourceType>([
  'manual', 'character-card', 'persona-card', 'native-visual-preset', 'user-confirmed-analysis',
])

const STYLE_RE = /\b(?:realistic|cinematic|photorealistic|anime|manhwa|painterly|render(?:ing)?|style|shading|lighting|golden hour|bokeh|depth of field|masterpiece|best quality|highres|absurdres|skin textures?|volumetric|rim light|composition)\b/i
const CAMERA_RE = /\b(?:camera|angle|shot|close[- ]?up|medium shot|wide shot|portrait view|over[- ]the[- ]shoulder|selfie|pov|framing|composition|lens|depth of field)\b/i
const ACTION_RE = /\b(?:holding|walking|running|standing|sitting|looking|smiling|crying|speaking|turning|raising|pointing|presenting|showing|leaning|lying)\b/i
const TEMPORARY_RE = /\b(?:tear(?:s|[- ]streaked)?|flushed|red[- ]rimmed|wet eyes?|bruis(?:e|ed|ing)|blood(?:y|ied)?|dirty|dirt|wet hair|dishevelled|disheveled|bandage(?:d|s)?|injur(?:y|ed)|swollen|scratched|cut lip|temporary|current makeup|smudged makeup|damaged clothing|torn clothing|muddy|sweaty|pale from|cold extremities|expression)\b/i
const CLOTHING_RE = /\b(?:wearing|dressed|clad|outfit|uniform|jersey|hoodie|shirt|blouse|sweater|sweatshirt|jacket|coat|dress|sundress|skirt|pants|trousers|jeans|shorts|shoes|boots|socks|hospital gown|stage outfit|school uniform|practice uniform|practice jersey|work attire|accessor(?:y|ies)|earrings?|necklace|bracelet|glasses|hat|scarf)\b/i
const STABLE_RE = /\b(?:natural hair|hair color|black hair|dark hair|jet[- ]black hair|raven[- ]black hair|brown hair|medium brown hair|blonde hair|white hair|red hair|long hair|very long hair|medium[- ]length hair|waist[- ]length hair|knee[- ]length hair|short hair|shoulder[- ]length hair|wavy hair|straight hair|curly hair|eye color|brown eyes|blue eyes|green eyes|grey eyes|gray eyes|hazel eyes|face shape|jawline|body build|athletic build|slim|lean|stocky|broad|petite|height|tall|short|winged eyeliner|eyelashes?|lashes|beauty mark|scar|tattoo|birthmark|mole|freckles|prosthetic|permanent)\b/i
const EYE_COLOR_RE = /\b(?:brown|blue|green|grey|gray|hazel|amber|black|violet|pink|red)[_ -]eyes?\b/i
const HAIR_COLOR_RE = /\b(?:jet[- ]black|raven[- ]black|black|medium[- ]brown|brown|blonde|blond|white|silver|red|auburn|pink|blue|green|purple|brunette)[_ -]hair\b/i
const HAIR_LENGTH_RE = /\b(?:very long|long|shoulder[- ]length|medium[- ]length|short|cropped|waist[- ]length|knee[- ]length) hair\b/i
const HAIR_TEXTURE_RE = /\b(?:straight|wavy|curly|coily|messy|silky|thick|fine) hair\b/i
const PERMANENT_MARK_RE = /\b(?:scar|tattoo|birthmark|mole|freckles|prosthetic)\b/i

export type AppearanceClassification = {
  kind: 'stable-identity' | 'wardrobe' | 'current-appearance' | 'expression' | 'pose-action' | 'camera-composition' | 'style-rendering' | 'invalid-unresolved'
  layer?: AppearanceVaultLayer
  category?: AppearanceFactCategory
  reason: string
}

export type AppearanceSelection = {
  included: AppearanceVaultFact[]
  excluded: ContinuityDecision[]
  attachedReferenceAssetIds: string[]
  conflicts: string[]
  strength: ContinuityStrength
  subjectCharacterIds: string[]
}

/**
 * The editor and Illustrator both read this projection.  `characterSheets`
 * retains compatibility-only presentation data (alternate looks, negatives,
 * references), while its two primary text fields are always regenerated from
 * the fact maps below.
 */
export type AppearanceMemoryView = {
  characterId: string
  stableAppearance: string
  currentOutfit: string
  currentState: string
  hasFacts: boolean
  updatedAt: number
}


export type ExtractedAppearanceTrait = {
  value: string
  sourceSentence: string
}

export type CharacterScopedAppearanceRow<T> = {
  message: T
  role: string
  text: string
  isOwnMessage?: boolean
}

type AddAppearanceFactInput = {
  layer: AppearanceVaultLayer
  characterId: string
  category: AppearanceFactCategory
  value: string
  /** Opaque Sidecar or user-confirmed semantic replacement key. */
  conflictDomain?: string
  sourceType: AppearanceSourceType
  sourceReference?: Partial<AppearanceSourceReference>
  confidence?: number
  pinned?: boolean
  userConfirmed?: boolean
  referenceAssetIds?: string[]
  notes?: string
  outfitName?: string
  defaultWardrobe?: boolean
  currentWardrobe?: boolean
  chatId?: string
  sourceMessageId?: string
  sourceSwipeId?: number
  active?: boolean
  expiryPolicy?: AppearanceVaultFact['expiryPolicy']
  expiresAt?: number
  /**
   * Sidecar and explicit-editor values already carry an intentional semantic
   * layer/category. Relay still routes them through the shared canonical writer
   * so trusted sources cannot persist prose, duplicates, or mixed categories.
   */
  semanticAuthority?: 'appearance-sidecar' | 'explicit-user' | 'legacy-migration'
}

type CanonicalAppearanceRow = {
  layer: AppearanceVaultLayer
  category: AppearanceFactCategory
  value: string
  conflictDomain?: string
}

const HAIR_COLOR_TAGS: Array<[RegExp, string]> = [
  [/\b(?:jet[- ]black|raven[- ]black|black)\s+hair\b|\bblack_hair\b/i, 'black_hair'],
  [/\bdark\s+hair\b|\bdark_hair\b/i, 'dark_hair'],
  [/\b(?:soft\s+)?medium\s+brown(?:\s+with\s+warm\s+golden\s+undertones)?\s+hair\b|\bmedium_brown_hair\b/i, 'medium_brown_hair'],
  [/\bbrown\s+hair\b|\bbrunette\s+hair\b|\bbrown_hair\b/i, 'brown_hair'],
  [/\bauburn\s+hair\b|\bauburn_hair\b/i, 'auburn_hair'],
  [/\bblond(?:e)?\s+hair\b|\bblonde_hair\b/i, 'blonde_hair'],
  [/\bwhite\s+hair\b|\bwhite_hair\b/i, 'white_hair'],
  [/\bsilver\s+hair\b|\bsilver_hair\b/i, 'silver_hair'],
  [/\bred\s+hair\b|\bred_hair\b/i, 'red_hair'],
  [/\bpink\s+hair\b|\bpink_hair\b/i, 'pink_hair'],
  [/\bblue\s+hair\b|\bblue_hair\b/i, 'blue_hair'],
  [/\bgreen\s+hair\b|\bgreen_hair\b/i, 'green_hair'],
  [/\bpurple\s+hair\b|\bpurple_hair\b/i, 'purple_hair'],
  [/\blavender\s+hair\b|\blavender_hair\b/i, 'lavender_hair'],
]

const EYE_COLOR_TAGS: Array<[RegExp, string]> = [
  [/\bbrown\s+eyes?\b|\bbrown_eyes\b/i, 'brown_eyes'],
  [/\bblue\s+eyes?\b|\bblue_eyes\b/i, 'blue_eyes'],
  [/\bgreen\s+eyes?\b|\bgreen_eyes\b/i, 'green_eyes'],
  [/\bgr[ae]y\s+eyes?\b|\bgr[ae]y_eyes\b/i, 'gray_eyes'],
  [/\bhazel\s+eyes?\b|\bhazel_eyes\b/i, 'hazel_eyes'],
  [/\bamber\s+eyes?\b|\bamber_eyes\b/i, 'amber_eyes'],
  [/\bblack\s+eyes?\b|\bblack_eyes\b/i, 'black_eyes'],
  [/\bviolet\s+eyes?\b|\bviolet_eyes\b/i, 'violet_eyes'],
]

const HAIR_LENGTH_TAGS: Array<[RegExp, string]> = [
  [/\bknee[- ]length(?:\s+(?:jet[- ]black|raven[- ]black|black|medium[- ]brown|brown|blonde|blond|white|silver|red|auburn|pink|blue|green|purple|lavender|brunette))?\s+hair\b|\bknee_length_hair\b/i, 'knee_length_hair'],
  [/\bwaist[- ]length(?:\s+(?:jet[- ]black|raven[- ]black|black|medium[- ]brown|brown|blonde|blond|white|silver|red|auburn|pink|blue|green|purple|lavender|brunette))?\s+hair\b|\bwaist_length_hair\b/i, 'waist_length_hair'],
  [/\bvery\s+long(?:\s+(?:jet[- ]black|raven[- ]black|black|medium[- ]brown|brown|blonde|blond|white|silver|red|auburn|pink|blue|green|purple|lavender|brunette))?\s+hair\b|\bvery_long_hair\b/i, 'very_long_hair'],
  [/\bshoulder[- ]length(?:\s+(?:jet[- ]black|raven[- ]black|black|medium[- ]brown|brown|blonde|blond|white|silver|red|auburn|pink|blue|green|purple|lavender|brunette))?\s+hair\b|\bshoulder_length_hair\b/i, 'shoulder_length_hair'],
  [/\bmedium[- ]length(?:\s+(?:jet[- ]black|raven[- ]black|black|medium[- ]brown|brown|blonde|blond|white|silver|red|auburn|pink|blue|green|purple|lavender|brunette))?\s+hair\b|\bmedium_length_hair\b/i, 'medium_length_hair'],
  [/\blong(?:\s+(?:jet[- ]black|raven[- ]black|black|medium[- ]brown|brown|blonde|blond|white|silver|red|auburn|pink|blue|green|purple|lavender|brunette))?\s+hair\b|\blong_hair\b/i, 'long_hair'],
  [/\bshort(?:\s+(?:jet[- ]black|raven[- ]black|black|medium[- ]brown|brown|blonde|blond|white|silver|red|auburn|pink|blue|green|purple|lavender|brunette))?\s+hair\b|\bshort_hair\b/i, 'short_hair'],
  [/\bcropped(?:\s+(?:jet[- ]black|raven[- ]black|black|medium[- ]brown|brown|blonde|blond|white|silver|red|auburn|pink|blue|green|purple|lavender|brunette))?\s+hair\b|\bcropped_hair\b/i, 'cropped_hair'],
]

const HAIR_TEXTURE_TAGS: Array<[RegExp, string]> = [
  [/\bstraight(?:\s+(?:jet[- ]black|raven[- ]black|black|medium[- ]brown|brown|blonde|blond|white|silver|red|auburn|pink|blue|green|purple|lavender|brunette))?\s+hair\b|\bstraight_hair\b/i, 'straight_hair'],
  [/\bwavy(?:\s+(?:jet[- ]black|raven[- ]black|black|medium[- ]brown|brown|blonde|blond|white|silver|red|auburn|pink|blue|green|purple|lavender|brunette))?\s+hair\b|\bwavy_hair\b/i, 'wavy_hair'],
  [/\bcurly(?:\s+(?:jet[- ]black|raven[- ]black|black|medium[- ]brown|brown|blonde|blond|white|silver|red|auburn|pink|blue|green|purple|lavender|brunette))?\s+hair\b|\bcurly_hair\b/i, 'curly_hair'],
  [/\bcoily(?:\s+(?:jet[- ]black|raven[- ]black|black|medium[- ]brown|brown|blonde|blond|white|silver|red|auburn|pink|blue|green|purple|lavender|brunette))?\s+hair\b|\bcoily_hair\b/i, 'coily_hair'],
  [/\bmessy(?:\s+(?:jet[- ]black|raven[- ]black|black|medium[- ]brown|brown|blonde|blond|white|silver|red|auburn|pink|blue|green|purple|lavender|brunette))?\s+hair\b|\bmessy_hair\b/i, 'messy_hair'],
]

const BODY_TAGS: Array<[RegExp, string]> = [
  [/\bathletic(?:\s+(?:build|frame|physique))?\b|\bathletic_build\b/i, 'athletic_build'],
  [/\bmuscular(?:\s+(?:build|frame|physique))?\b|\bmuscular_build\b/i, 'muscular_build'],
  [/\bslim(?:\s+(?:build|frame|physique))?\b|\bslim_build\b/i, 'slim_build'],
  [/\blean(?:\s+(?:build|frame|physique))?\b|\blean_build\b/i, 'lean_build'],
  [/\bpetite(?:\s+(?:build|frame|physique))?\b|\bpetite_build\b/i, 'petite_build'],
  [/\bstocky(?:\s+(?:build|frame|physique))?\b|\bstocky_build\b/i, 'stocky_build'],
  [/\bbroad[- ]shouldered\b|\bbroad\s+shoulders\b|\bbroad_shoulders\b/i, 'broad_shoulders'],
  [/\btall\b/i, 'tall'],
  [/\bshort\b/i, 'short'],
]

const WARDROBE_TAGS: Array<[RegExp, string]> = [
  [/\bpractice\s+jersey\b|\bpractice_jersey\b/i, 'practice_jersey'],
  [/\bwhite\s+oversized\s+sweater\b|\bwhite_oversized_sweater\b/i, 'white_oversized_sweater'],
  [/\bblack\s+pleated\s+skirt\b|\bblack_pleated_skirt\b/i, 'black_pleated_skirt'],
  [/\boversized\s+(?:mens?|men's)\s+t[- ]shirt\b|\boversized_mens_t_shirt\b/i, 'oversized_mens_t_shirt'],
  [/\bbarefoot\s+with\s+no\s+shoes\b|\bbarefoot_no_shoes\b/i, 'barefoot_no_shoes'],
  [/\bblack\s+hoodie\b|\bblack_hoodie\b/i, 'black_hoodie'],
  [/\bgr[ae]y\s+hoodie\b|\bgr[ae]y_hoodie\b/i, 'gray_hoodie'],
  [/\bpale\s+blue\s+cardigan\b|\bpale_blue_cardigan\b/i, 'pale_blue_cardigan'],
  [/\bwhite\s+sundress\b|\bwhite_sundress\b/i, 'white_sundress'],
  [/\bblack\s+school\s+jacket\b|\bblack_school_jacket\b/i, 'black_school_jacket'],
  [/\bschool\s+uniform\b|\bschool_uniform\b/i, 'school_uniform'],
  [/\bjeans\b/i, 'jeans'],
  [/\bskirt\b/i, 'skirt'],
  [/\bshoes\b/i, 'shoes'],
  [/\bboots\b/i, 'boots'],
  [/\bglasses\b/i, 'glasses'],
]

function tagText(value: string): string {
  return clean(value).replace(/_/g, ' ').replace(/[“”"']/g, '').replace(/\s+/g, ' ')
}

function canonicalTag(value: string): string {
  return clean(value)
    .normalize('NFKC')
    .toLocaleLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_{2,}/g, '_')
}

function splitAppearanceSegments(value: string): string[] {
  const text = clean(value)
    .replace(/\bwearing\s+/gi, '')
    .replace(/\bdressed\s+in\s+/gi, '')
    .replace(/\bclad\s+in\s+/gi, '')
  const parts = text.split(/[,;\n]+|\s+\band\b\s+/i).map(clean).filter(Boolean)
  // Once the author supplied an explicit list boundary, the list items are the
  // semantic units. Re-processing the complete sentence allows a later
  // fallback to mint compound tags such as hair_glasses.
  return unique(parts.length > 1 ? parts : [text])
}

function serializeCanonicalTagList(value: unknown): string {
  const items = Array.isArray(value) ? stringList(value) : clean(value) ? [clean(value)] : []
  return unique(items.flatMap(item => clean(item).split(/[,;\n]+/)).map(canonicalTag).filter(Boolean)).join(', ')
}

function addCanonicalRow(rows: CanonicalAppearanceRow[], row: CanonicalAppearanceRow): void {
  const value = canonicalTag(row.value)
  if (!value || value.length < 2 || value.length > 64) return
  const conflictDomain = row.conflictDomain ? row.conflictDomain.replace(/_/g, '-') : undefined
  const key = `${row.layer}:${row.category}:${conflictDomain || ''}:${value}`
  if (rows.some(existing => `${existing.layer}:${existing.category}:${existing.conflictDomain || ''}:${existing.value}` === key)) return
  rows.push({ ...row, value, conflictDomain })
}

function domainTag(value: string): string {
  return canonicalTag(value).replace(/_/g, '-')
}

function canonicalRowsForSegment(segment: string, requestedLayer?: AppearanceVaultLayer, requestedCategory?: AppearanceFactCategory): CanonicalAppearanceRow[] {
  const rows: CanonicalAppearanceRow[] = []
  const text = tagText(segment)
  const lower = text.toLocaleLowerCase()
  const allowStable = !requestedLayer || requestedLayer === 'visual-identity'
  const allowWardrobe = !requestedLayer || requestedLayer === 'wardrobe'
  const allowCurrent = !requestedLayer || requestedLayer === 'current-appearance'
  const stableCategoryOverride = requestedLayer === 'visual-identity' && requestedCategory && isCategoryAllowedForLayer('visual-identity', requestedCategory) ? requestedCategory : undefined
  const wardrobeCategoryOverride = requestedLayer === 'wardrobe' && requestedCategory && isCategoryAllowedForLayer('wardrobe', requestedCategory) ? requestedCategory : undefined

  if (allowStable && !/\b(?:bronze|golden)\b.+\b(?:sunset|lighting|lights?|under|looked)\b/i.test(lower)) {
    if (requestedCategory === 'hair-color') {
      if (/^(?:jet[- ]black|raven[- ]black|black)$/i.test(lower)) addCanonicalRow(rows, { layer: 'visual-identity', category: 'hair-color', value: 'black_hair', conflictDomain: 'hair-color' })
      else if (/^dark$/i.test(lower)) addCanonicalRow(rows, { layer: 'visual-identity', category: 'hair-color', value: 'dark_hair', conflictDomain: 'hair-color' })
      else if (/^medium[- ]brown$/i.test(lower)) addCanonicalRow(rows, { layer: 'visual-identity', category: 'hair-color', value: 'medium_brown_hair', conflictDomain: 'hair-color' })
      else if (/^(?:brown|brunette)$/i.test(lower)) addCanonicalRow(rows, { layer: 'visual-identity', category: 'hair-color', value: 'brown_hair', conflictDomain: 'hair-color' })
      else if (/^(?:blonde|blond)$/i.test(lower)) addCanonicalRow(rows, { layer: 'visual-identity', category: 'hair-color', value: 'blonde_hair', conflictDomain: 'hair-color' })
      else if (/^(?:white|silver|red|auburn|pink|blue|green|purple)$/i.test(lower)) addCanonicalRow(rows, { layer: 'visual-identity', category: 'hair-color', value: `${canonicalTag(lower)}_hair`, conflictDomain: 'hair-color' })
    }
    if (requestedCategory === 'eye-color') {
      if (/^(?:deep[- ]brown|dark[- ]brown|brown)$/i.test(lower)) addCanonicalRow(rows, { layer: 'visual-identity', category: 'eye-color', value: 'brown_eyes', conflictDomain: 'eye-color' })
      else if (/^(?:blue|green|hazel|amber|black|violet|pink|red)$/i.test(lower)) addCanonicalRow(rows, { layer: 'visual-identity', category: 'eye-color', value: `${canonicalTag(lower)}_eyes`, conflictDomain: 'eye-color' })
      else if (/^gr[ae]y$/i.test(lower)) addCanonicalRow(rows, { layer: 'visual-identity', category: 'eye-color', value: 'gray_eyes', conflictDomain: 'eye-color' })
    }
    for (const [pattern, tag] of HAIR_COLOR_TAGS) {
      if (pattern.test(segment) || pattern.test(text)) addCanonicalRow(rows, { layer: 'visual-identity', category: 'hair-color', value: tag, conflictDomain: 'hair-color' })
    }
    for (const [pattern, tag] of EYE_COLOR_TAGS) {
      if (pattern.test(segment) || pattern.test(text)) addCanonicalRow(rows, { layer: 'visual-identity', category: 'eye-color', value: tag, conflictDomain: 'eye-color' })
    }
    for (const [pattern, tag] of HAIR_LENGTH_TAGS) {
      if (pattern.test(segment) || pattern.test(text)) addCanonicalRow(rows, { layer: 'visual-identity', category: 'hair-length', value: tag, conflictDomain: `hair-length:${domainTag(tag)}` })
    }
    for (const [pattern, tag] of HAIR_TEXTURE_TAGS) {
      if (pattern.test(segment) || pattern.test(text)) addCanonicalRow(rows, { layer: 'visual-identity', category: 'hair-texture', value: tag, conflictDomain: `hair-texture:${domainTag(tag)}` })
    }
    for (const [pattern, tag] of BODY_TAGS) {
      if (pattern.test(segment) || pattern.test(text)) addCanonicalRow(rows, { layer: 'visual-identity', category: 'body-build', value: tag, conflictDomain: `body:${domainTag(tag)}` })
    }
    if (/\bwinged\s+eyeliner\b|\bwinged_eyeliner\b/i.test(segment)) {
      addCanonicalRow(rows, { layer: 'visual-identity', category: stableCategoryOverride || 'other', value: 'winged_eyeliner', conflictDomain: 'makeup:eyeliner' })
    }
    if (/\b(?:manhwa\s+lashes|long\s+eyelashes|long\s+lashes)\b|\blong_eyelashes\b/i.test(segment)) {
      addCanonicalRow(rows, { layer: 'visual-identity', category: stableCategoryOverride || 'other', value: 'long_eyelashes', conflictDomain: 'feature:eyelashes' })
    }
    if (/\b(?:beauty\s+mark|mole)\b.*\b(?:under|beneath|below|outer\s+corner).*\b(?:eye|right\s+eye|left\s+eye)\b|\bbeauty_mark_under_eye\b/i.test(segment)) {
      addCanonicalRow(rows, { layer: 'visual-identity', category: 'mole', value: 'beauty_mark_under_eye', conflictDomain: 'mark:under-eye' })
    } else if (/\b(?:beauty\s+mark|mole)\b/i.test(segment)) {
      addCanonicalRow(rows, { layer: 'visual-identity', category: 'mole', value: 'beauty_mark', conflictDomain: 'mark:mole' })
    }
    if (/\bfreckles\b/i.test(segment)) addCanonicalRow(rows, { layer: 'visual-identity', category: 'permanent-mark', value: 'freckles', conflictDomain: 'mark:freckles' })
    if (/\b(?:eye)?glasses\b|\bspectacles\b/i.test(segment)) addCanonicalRow(rows, { layer: 'visual-identity', category: 'other', value: 'glasses', conflictDomain: 'feature:glasses' })
    if (/\b(?:eyebrow|brow)\s+scar\b|\bscar\b.*\b(?:eyebrow|brow)\b/i.test(segment)) addCanonicalRow(rows, { layer: 'visual-identity', category: 'scar', value: 'eyebrow_scar', conflictDomain: 'scar:eyebrow' })
    else if (/\bscar\b/i.test(segment)) addCanonicalRow(rows, { layer: 'visual-identity', category: 'scar', value: canonicalTag(segment).includes('scar') ? canonicalTag(segment).replace(/^.*?(scar(?:_[a-z0-9]+){0,4}).*$/, '$1') : 'scar' })
  }

  if (allowWardrobe) {
    for (const [pattern, tag] of WARDROBE_TAGS) {
      if (pattern.test(segment) || pattern.test(text)) addCanonicalRow(rows, { layer: 'wardrobe', category: wardrobeCategoryOverride || wardrobeCategory(text), value: tag, conflictDomain: `outfit:${domainTag(tag)}` })
    }
    if (!rows.some(row => row.layer === 'wardrobe') && (CLOTHING_RE.test(text) || requestedLayer === 'wardrobe')) {
      const stripped = clean(text).replace(/^(?:a|an|the)\s+/i, '')
      const tag = canonicalTag(stripped)
      if (tag && tag.length <= 48 && !/\b(?:because|while|looked|under|scene|prompt|metadata)\b/i.test(stripped)) {
        addCanonicalRow(rows, { layer: 'wardrobe', category: wardrobeCategoryOverride || wardrobeCategory(text), value: tag, conflictDomain: `outfit:${domainTag(tag)}` })
      }
    }
  }

  if (allowCurrent && TEMPORARY_RE.test(text)) {
    const tag = canonicalTag(text)
    if (tag) addCanonicalRow(rows, { layer: 'current-appearance', category: requestedCategory && isCategoryAllowedForLayer('current-appearance', requestedCategory) ? requestedCategory : temporaryCategory(text), value: tag })
  }

  return rows
}

function canonicalizeAppearanceFactInput(input: AddAppearanceFactInput): CanonicalAppearanceRow[] {
  if (input.layer === 'current-appearance' && isSceneActionOnlyAppearanceValue(input.value, input.category)) return []
  const rows: CanonicalAppearanceRow[] = []
  for (const segment of splitAppearanceSegments(input.value)) {
    for (const row of canonicalRowsForSegment(segment, input.layer, input.category)) addCanonicalRow(rows, {
      ...row,
      conflictDomain: clean(input.conflictDomain) || row.conflictDomain,
    })
  }
  if (!rows.length) {
    const tag = canonicalTag(input.value)
    const tagLooksCanonical = /^[a-z0-9]+(?:_[a-z0-9]+)*$/.test(tag) && tag.length <= 64
    if (tagLooksCanonical) {
      const text = tag.replace(/_/g, ' ')
      const classification = classifyAppearanceValue(text, input.category)
      if (classification.layer === input.layer || Boolean(input.semanticAuthority)) {
        addCanonicalRow(rows, {
          layer: input.layer,
          category: isCategoryAllowedForLayer(input.layer, input.category) ? input.category : (classification.category || input.category),
          value: tag,
          conflictDomain: clean(input.conflictDomain) || undefined,
        })
      }
    }
  }
  return rows.sort((left, right) => {
    const leftRequested = Number(left.layer === input.layer && left.category === input.category)
    const rightRequested = Number(right.layer === input.layer && right.category === input.category)
    return rightRequested - leftRequested
  })
}

function semanticFactIdentityKey(layer: AppearanceVaultLayer, characterId: string, category: AppearanceFactCategory, value: string, conflictDomain?: string): string {
  if (layer === 'visual-identity') return `${layer}:${characterId}:semantic:${normalizeValue(value)}`
  return `${layer}:${characterId}:${category}:${conflictDomain || 'legacy'}:${normalizeValue(value)}`
}

function currentAppearanceDomain(fact: Pick<AppearanceVaultFact, 'category' | 'value' | 'conflictDomain'>): string {
  const text = clean(fact.value).replace(/_/g, ' ').toLocaleLowerCase()
  if (fact.category === 'temporary-hair' || /\b(?:hair|bangs|ponytail|braid|bun|wet|drying|dry|damp|loose|curled?|wavy)\b/.test(text)) return 'current:hair-state'
  if (fact.category === 'temporary-makeup' || /\b(?:makeup|eyeliner|liner|mascara|lipstick|washed away|smudged)\b/.test(text)) return 'current:makeup-state'
  if (fact.category === 'temporary-injury' || /\b(?:bruise|blood|bandage|injur|swollen|scratch|cut lip)\b/.test(text)) return 'current:injury-state'
  if (fact.category === 'temporary-clothing-state' || /\b(?:torn|damaged|muddy|wet clothing|soaked clothing)\b/.test(text)) return 'current:clothing-state'
  if (fact.category === 'temporary-accessory' || /\baccessor/i.test(text)) return 'current:accessory-state'
  return `current:${fact.category}`
}

function isSceneActionOnlyAppearanceValue(value: string, category?: AppearanceFactCategory): boolean {
  const text = clean(value).replace(/_/g, ' ').toLocaleLowerCase()
  if (!text) return false
  const visualState = /\b(?:wet|drying|dry|damp|loose|curled?|wavy|makeup|eyeliner|liner|mascara|washed away|smudged|bandage|bruise|blood|injur|swollen|scratch|torn|damaged|muddy|barefoot|hair|eyes?|scar|mole|tattoo|birthmark|freckles|skin)\b/.test(text)
  const staging = /\b(?:standing|sitting|running|walking|fled|holding|watching|leaning|lying|kneeling|by the door|floor cushion|center room|tea in hand|folder|stage|van bench|shoulder|room)\b/.test(text)
  if (staging && !visualState) return true
  if (staging && category === 'temporary-expression' && !/\b(?:tear|flushed|smile|frown|angry|sad|afraid|expression|makeup|hair|injur|bandage|blood|bruise)\b/.test(text)) return true
  return false
}

function scopedCharacterNameAppears(text: string, names: string[]): boolean {
  const haystack = String(text || '').normalize('NFKC').toLocaleLowerCase()
  return names.some(rawName => {
    const name = clean(rawName).normalize('NFKC').toLocaleLowerCase()
    if (!name) return false
    let cursor = haystack.indexOf(name)
    while (cursor >= 0) {
      const before = cursor > 0 ? haystack[cursor - 1] : ''
      const after = cursor + name.length < haystack.length ? haystack[cursor + name.length] : ''
      const word = /[\p{L}\p{N}_]/u
      if ((!before || !word.test(before)) && (!after || !word.test(after))) return true
      cursor = haystack.indexOf(name, cursor + name.length)
    }
    return false
  })
}

/**
 * Keeps assistant-authored clauses attributable to the selected character.
 * Literal names and aliases are strongest; safe first-person physical clauses
 * are also eligible when the selected target is the active assistant.
 */
export function selectCharacterScopedAppearanceRows<T>(
  rows: CharacterScopedAppearanceRow<T>[],
  targetNames: string[],
  contextMessageCount: number,
  allCharacterNames: string[] = [],
  activeAssistantNames: string[] = [],
): Array<{ message: T; text: string }> {
  const names = targetNames.map(clean).filter(Boolean)
  if (!names.length) return []
  const targetIsActiveAssistant = activeAssistantNames.some(name => scopedCharacterNameAppears(name, names))
  const otherNames = allCharacterNames.map(clean).filter(name => name && !scopedCharacterNameAppears(name, names))
  const eligible = rows
    .filter(row => row.role === 'assistant' && row.isOwnMessage !== true)
    .slice(-Math.max(1, contextMessageCount))
  const selected: Array<{ message: T; text: string }> = []
  for (const row of eligible) {
    const clauses = clean(row.text)
      .split(/(?<=[.!?])\s+|\n+|;\s+/)
      .map(clean)
      .filter(Boolean)
    const matched = clauses.filter(clause => {
      const targetNamed = scopedCharacterNameAppears(clause, names)
      const firstPerson = /\b(?:I|me|my|mine|myself)\b/i.test(clause)
      const firstPersonAppearance = firstPerson && /\b(?:hair|eyes?|skin|face|jaw|scar|freckles?|tattoo|piercing|build|frame|physique|shoulders?|height|brow|eyebrow|nose|lips?)\b/i.test(clause)
      const mentionsOther = scopedCharacterNameAppears(clause, otherNames)
      if (!targetNamed && !(targetIsActiveAssistant && firstPersonAppearance && !mentionsOther)) return false
      if (firstPerson && !targetIsActiveAssistant) return false
      if (!targetNamed) return true
      const lower = clause.normalize('NFKC').toLocaleLowerCase()
      const targetIndexes = names
        .map(name => lower.indexOf(name.normalize('NFKC').toLocaleLowerCase()))
        .filter(index => index >= 0)
      const targetIndex = targetIndexes.length ? Math.min(...targetIndexes) : -1
      const otherIndexes = otherNames
        .map(name => lower.indexOf(name.normalize('NFKC').toLocaleLowerCase()))
        .filter(index => index >= 0)
      const firstOther = otherIndexes.length ? Math.min(...otherIndexes) : Number.POSITIVE_INFINITY
      const targetPossessive = names.some(name => new RegExp(`\\b${escapeRegex(name)}(?:'s|’s)\\b`, 'i').test(clause))
      return targetPossessive || targetIndex <= firstOther
    })
    if (matched.length) selected.push({ message: row.message, text: matched.join('\n') })
  }
  return selected
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

const APPEARANCE_TRAIT_PATTERNS: RegExp[] = [
  /\b(?:(?:very long|waist[- ]length|knee[- ]length|shoulder[- ]length|medium[- ]length|long|short|cropped)\s+)?(?:straight|wavy|curly|coily|messy|silky|thick|fine\s+)?(?:black|brown|blonde|blond|white|silver|red|auburn|pink|blue|green|purple|brunette)?\s*hair\b/giu,
  /\b(?:brown|blue|green|grey|gray|hazel|amber|black|violet|pink|red) eyes?\b/giu,
  /\b(?:fair|light|olive|tan|tanned|brown|dark|deep) skin(?: tone)?\b/giu,
  /\b(?:slim|lean|stocky|broad[- ]shouldered|petite|athletic|muscular|delicate|thin)(?:\s+(?:build|frame|physique))?\b/giu,
  /\b(?:oval|round|heart[- ]shaped|angular|delicate|sharp)(?:\s+(?:face|face shape|features))\b/giu,
  /\b(?:sharp|soft|defined|square) jawline\b/giu,
  /\b(?:faint|small|prominent|long|thin|dark|blackwork|rose)?\s*(?:[\p{L}\d-]+\s+){0,3}(?:scar|tattoo|birthmark|mole|freckles|prosthetic)(?:\s+(?:on|under|across|along)\s+[^,.;!?]{1,48})?/giu,
  /\b(?:wearing|dressed in|clad in)\s+[^.;!?]{2,120}/giu,
  /\b(?:red[- ]rimmed eyes|tear[- ]streaked (?:face|cheeks)|wet hair|dishevelled hair|disheveled hair|smudged makeup|cut lip|torn clothing|damaged clothing|bloody [\p{L}-]+|bruised? [\p{L}-]+|bandaged [\p{L}-]+|swollen [\p{L}-]+|scratched [\p{L}-]+|muddy [\p{L}-]+|sweaty skin)\b/giu,
]

/**
 * Extract concise appearance-only phrases from prose. The full source sentence is
 * retained for inspection, but narrative action/dialogue is never used as the fact value.
 */
export function extractAppearanceTraitPhrases(input: string): ExtractedAppearanceTrait[] {
  const text = clean(input)
    .replace(/<[^>]+>/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[[^\]]+\]\([^)]*\)/g, ' ')
    .replace(/[`*_~#>]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (!text) return []
  const sentences = text.split(/(?<=[.!?])\s+|\n+/).map(clean).filter(Boolean)
  const output: ExtractedAppearanceTrait[] = []
  const seen = new Set<string>()
  for (const sourceSentence of sentences) {
    for (const pattern of APPEARANCE_TRAIT_PATTERNS) {
      pattern.lastIndex = 0
      for (const match of sourceSentence.matchAll(pattern)) {
        let value = clean(match[0])
          .replace(/^(?:he|she|they|his|her|their|the|a|an)\s+/i, '')
          .replace(/\s*,\s*(?:while|as|but|and\s+(?:he|she|they)|sitting|standing|walking|looking|holding|turning|leaning|lying)\b.*$/i, '')
          .replace(/\s+\b(?:while|as|because|when|before|after)\b.*$/i, '')
          .replace(/["'“”‘’]+$/g, '')
          .trim()
        if (/^hair$/i.test(value) || value.length < 3 || value.length > 140) continue
        const classification = classifyAppearanceValue(value)
        if (!classification.layer || !classification.category) continue
        const key = `${classification.layer}:${classification.category}:${normalizeValue(value)}`
        if (seen.has(key)) continue
        seen.add(key)
        output.push({ value, sourceSentence: sourceSentence.slice(0, 320) })
      }
    }
  }
  return output.slice(0, 32)
}

export function emptyContinuityVault(chatId: string): ContinuityVaultState {
  return {
    chatId,
    strength: 'off',
    characters: {},
    characterSheets: {},
    visualIdentity: {},
    wardrobe: {},
    currentAppearance: {},
    suggestions: {},
    quarantine: {},
    history: [],
    migrationPreview: null,
    ignoredForSlotKeys: [],
    deliberateBreaks: {},
    appearanceSidecar: { revision: 0, processedTurnKeys: {}, lastRunAt: 0 },
    updatedAt: 0,
  }
}

export function normalizeContinuityVault(value: unknown, chatId = '', sourceSchemaVersion = 1): ContinuityVaultState {
  const raw = asRecord(value)
  const vault = emptyContinuityVault(clean(raw.chatId) || chatId)
  const strength = clean(raw.strength)
  vault.strength = isStrength(strength) ? strength : 'off'
  vault.characters = normalizeCharacters(raw.characters)
  vault.characterSheets = normalizeCharacterSheets(raw.characterSheets, vault.characters)
  vault.visualIdentity = normalizeFactMap(raw.visualIdentity, 'visual-identity', vault.characters)
  vault.wardrobe = normalizeFactMap(raw.wardrobe, 'wardrobe', vault.characters)
  vault.currentAppearance = normalizeFactMap(raw.currentAppearance, 'current-appearance', vault.characters)
  adoptLegacySheetFacts(vault)
  canonicalizeResolvedAppearanceState(vault)
  syncAllCharacterSheetPresentation(vault)
  vault.suggestions = normalizeSuggestions(raw.suggestions)
  vault.quarantine = normalizeQuarantine(raw.quarantine)
  vault.history = Array.isArray(raw.history) ? raw.history.map(normalizeHistory).filter(Boolean) as AppearanceHistoryEntry[] : []
  // A former generation fallback stored a role label as an identity. Keep a
  // recoverable archive, but never attach its unknown facts to today's persona.
  for (const [id, value] of Object.entries(asRecord(raw.characters))) {
    const character = asRecord(value)
    if (!isUnresolvedAppearanceRole(clean(character.canonicalCharacterName || character.name))) continue
    const characterId = clean(character.canonicalCharacterId) || id
    if (vault.history.some(row => row.action === 'unresolved-role-archived' && row.characterId === characterId)) continue
    appendHistory(vault, 'unresolved-role-archived', { characterId, details: {
      character, sheet: asRecord(raw.characterSheets)[characterId],
      facts: ['visualIdentity', 'wardrobe', 'currentAppearance'].flatMap(layer => Object.values(asRecord(raw[layer])).filter(fact => asRecord(fact).canonicalCharacterId === characterId)),
      reason: 'Unresolved role label is not a named identity; original data retained for recovery.',
    } }, Date.now())
  }
  vault.migrationPreview = normalizeMigrationPreview(raw.migrationPreview)
  vault.ignoredForSlotKeys = stringList(raw.ignoredForSlotKeys)
  vault.deliberateBreaks = stringRecord(raw.deliberateBreaks)
  const rawSidecar = asRecord(raw.appearanceSidecar)
  vault.appearanceSidecar = {
    revision: Math.max(0, Math.floor(finite(rawSidecar.revision) || 0)),
    processedTurnKeys: Object.fromEntries(Object.entries(asRecord(rawSidecar.processedTurnKeys))
      .map(([key, timestamp]) => [clean(key), Math.max(0, finite(timestamp) || 0)] as const)
      .filter(([key, timestamp]) => Boolean(key) && timestamp > 0)
      .sort(([, left], [, right]) => right - left)
      .slice(0, 128)),
    lastRunAt: Math.max(0, finite(rawSidecar.lastRunAt) || 0),
    lastMessageId: clean(rawSidecar.lastMessageId) || undefined,
    lastSwipeId: Number.isFinite(Number(rawSidecar.lastSwipeId)) ? Number(rawSidecar.lastSwipeId) : undefined,
    lastConnectionId: clean(rawSidecar.lastConnectionId) || undefined,
    lastModel: clean(rawSidecar.lastModel) || undefined,
    lastError: clean(rawSidecar.lastError) || undefined,
  }
  vault.updatedAt = finite(raw.updatedAt) || 0

  // Legacy schemas stored every accepted prompt fragment in one flat `facts` map.
  // Build a non-mutating cleanup preview and leave those values out of active layers
  // until the user explicitly applies the preview.
  if (!vault.migrationPreview && raw.facts && typeof raw.facts === 'object') {
    vault.migrationPreview = buildMigrationPreview(raw.facts, vault, sourceSchemaVersion)
  }
  expireCurrentAppearance(vault, Date.now())
  return vault
}

export function isValidCanonicalCharacterName(value: string): boolean {
  const name = clean(value)
  if (!name) return false
  if (isUnresolvedAppearanceRole(name)) return false
  const normalized = normalizeAlias(name)
  if (INVALID_SUBJECTS.has(normalized)) return false
  if (STYLE_RE.test(name) || CAMERA_RE.test(name)) return false
  const words = name.split(/\s+/).filter(Boolean)
  if (words.length > 4) return false
  if (words.some(word => INVALID_SUBJECTS.has(normalizeAlias(word)))) return false
  return /[\p{L}]/u.test(name) && !/^\d+$/.test(name)
}

export function resolveCanonicalCharacter(vault: ContinuityVaultState, candidate: string): CanonicalVisualCharacter | null {
  const key = normalizeAlias(candidate)
  if (!key || INVALID_SUBJECTS.has(key)) return null
  const candidateForms = new Set(aliasForms(candidate))
  for (const character of Object.values(vault.characters)) {
    const forms = new Set([
      ...aliasForms(character.canonicalCharacterName),
      ...character.aliases.flatMap(aliasForms),
    ])
    if ([...candidateForms].some(form => forms.has(form))) return character
  }
  return null
}

export function registerCanonicalCharacter(
  vault: ContinuityVaultState,
  input: {
    name: string
    canonicalCharacterId?: string
    lumiverseCharacterId?: string
    lumiversePersonaId?: string
    aliases?: string[]
    avatarUrl?: string
    sourceType: AppearanceSourceType
    userConfirmed?: boolean
    /** Only the model-backed Appearance Sidecar may automatically promote a recurring NPC. */
    sidecarVerified?: boolean
  },
  now = Date.now(),
): CanonicalVisualCharacter {
  const name = clean(input.name)
  if (!isValidCanonicalCharacterName(name)) throw new Error(`Invalid canonical character name: ${name || '(empty)'}`)
  const byId = (input.canonicalCharacterId ? vault.characters[input.canonicalCharacterId] : undefined)
    || Object.values(vault.characters).find(character =>
      (input.lumiversePersonaId && character.lumiversePersonaId === input.lumiversePersonaId)
      || (input.lumiverseCharacterId && character.lumiverseCharacterId === input.lumiverseCharacterId))
  const names = [name, ...stringList(input.aliases)]
  const namedMatches = [...new Set(names.map(candidate => resolveCanonicalCharacter(vault, candidate)).filter((character): character is CanonicalVisualCharacter => Boolean(character)))].filter(character =>
    !(input.lumiversePersonaId && character.lumiversePersonaId && input.lumiversePersonaId !== character.lumiversePersonaId)
    && !(input.lumiverseCharacterId && character.lumiverseCharacterId && input.lumiverseCharacterId !== character.lumiverseCharacterId))
  const existing = byId || namedMatches[0]
  if (existing) {
    for (const duplicate of namedMatches) {
      if (duplicate === existing) continue
      // Conflicting explicit host bindings are separate identities.
      if (duplicate.lumiversePersonaId && input.lumiversePersonaId && duplicate.lumiversePersonaId !== input.lumiversePersonaId) continue
      if (duplicate.lumiverseCharacterId && input.lumiverseCharacterId && duplicate.lumiverseCharacterId !== input.lumiverseCharacterId) continue
      mergeCharacters(vault, duplicate.canonicalCharacterId, existing.canonicalCharacterId, now)
    }
  }
  const trusted = Boolean(input.userConfirmed || TRUSTED_CHARACTER_SOURCES.has(input.sourceType) || (input.sourceType === 'appearance-sidecar' && input.sidecarVerified))
  if (!existing && !trusted) throw new Error('Automatically inferred subjects must remain unresolved until reviewed.')
  if (existing) {
    existing.aliases = unique([
      ...existing.aliases,
      ...stringList(input.aliases),
      name,
    ]).filter(alias => normalizeAlias(alias) !== normalizeAlias(existing.canonicalCharacterName))
    existing.lumiverseCharacterId ||= clean(input.lumiverseCharacterId) || undefined
    existing.lumiversePersonaId ||= clean(input.lumiversePersonaId) || undefined
    existing.avatarUrl ||= clean(input.avatarUrl) || undefined
    existing.userConfirmed ||= Boolean(input.userConfirmed)
    existing.updatedAt = now
    vault.updatedAt = now
    return existing
  }
  const id = clean(input.canonicalCharacterId)
    || clean(input.lumiverseCharacterId)
    || `character-${hash(`${normalizeAlias(name)}:${now}`)}`
  const character: CanonicalVisualCharacter = {
    canonicalCharacterId: id,
    canonicalCharacterName: name,
    aliases: unique(stringList(input.aliases).filter(alias => normalizeAlias(alias) !== normalizeAlias(name))),
    lumiverseCharacterId: clean(input.lumiverseCharacterId) || undefined,
    lumiversePersonaId: clean(input.lumiversePersonaId) || undefined,
    avatarUrl: clean(input.avatarUrl) || undefined,
    sourceType: input.sourceType,
    userConfirmed: Boolean(input.userConfirmed),
    createdAt: now,
    updatedAt: now,
  }
  vault.characters[id] = character
  appendHistory(vault, 'character-created', { characterId: id, details: { name, sourceType: input.sourceType } }, now)
  vault.updatedAt = now
  return character
}

export function classifyAppearanceValue(value: string, legacyEntityType = ''): AppearanceClassification {
  const text = clean(value).replace(/_/g, ' ')
  const legacy = clean(legacyEntityType).toLocaleLowerCase()
  if (!text) return { kind: 'invalid-unresolved', reason: 'Empty appearance value.' }
  if (STYLE_RE.test(text) && !STABLE_RE.test(text) && !CLOTHING_RE.test(text) && !TEMPORARY_RE.test(text)) {
    return { kind: 'style-rendering', reason: 'Rendering/style language is prompt metadata, not character memory.' }
  }
  if (CAMERA_RE.test(text) && !STABLE_RE.test(text) && !CLOTHING_RE.test(text) && !TEMPORARY_RE.test(text)) {
    return { kind: 'camera-composition', reason: 'Camera and composition language is prompt metadata.' }
  }
  if (ACTION_RE.test(text) && !STABLE_RE.test(text) && !CLOTHING_RE.test(text) && !TEMPORARY_RE.test(text)) {
    return { kind: 'pose-action', reason: 'Pose/action language is not appearance memory.' }
  }
  if (TEMPORARY_RE.test(text) || /injury|temporary|expression/.test(legacy)) {
    return {
      kind: 'current-appearance', layer: 'current-appearance', category: temporaryCategory(text),
      reason: 'Temporary emotional, injury, makeup, hair, or clothing state belongs to Scene Appearance.',
    }
  }
  if (CLOTHING_RE.test(text) || /clothing|accessory|wardrobe/.test(legacy)) {
    return {
      kind: 'wardrobe', layer: 'wardrobe', category: wardrobeCategory(text),
      reason: 'Clothing and accessories belong to Wardrobe rather than biological identity.',
    }
  }
  if (STABLE_RE.test(text) || /character-appearance|hairstyle|permanent/.test(legacy)) {
    return {
      kind: 'stable-identity', layer: 'visual-identity', category: stableCategory(text),
      reason: 'Stable physical identity anchor.',
    }
  }
  if (/\b(?:smile|frown|angry|sad|happy|afraid|tearful|expression)\b/i.test(text)) {
    return { kind: 'expression', reason: 'Expression is scene metadata unless explicitly stored as temporary state.' }
  }
  return { kind: 'invalid-unresolved', reason: 'The value could not be safely classified as stable identity, wardrobe, or current appearance.' }
}

function addCanonicalAppearanceFact(
  vault: ContinuityVaultState,
  input: AddAppearanceFactInput,
  now = Date.now(),
  options: { deferCurrentWardrobeSupersede?: boolean } = {},
): AppearanceVaultFact {
  const character = vault.characters[input.characterId]
  if (!character) throw new Error('A resolved canonical character is required before saving appearance memory.')
  const value = clean(input.value)
  if (!value) throw new Error('Appearance value is required.')
  if (!isCategory(input.category) || !isCategoryAllowedForLayer(input.layer, input.category)) {
    throw new Error('Appearance fact layer and category are incompatible.')
  }
  if (!input.semanticAuthority) {
    // This path is deliberately limited to legacy import and old explicit
    // workflows.  Automatic Appearance Sidecar facts must never be re-read by
    // Relay's vocabulary classifier after the Sidecar selected their bucket.
    const classification = classifyAppearanceValue(value, input.category)
    if (input.layer === 'visual-identity' && classification.kind !== 'stable-identity') {
      throw new Error('Only stable physical identity anchors may enter Visual Identity.')
    }
    if (input.layer === 'wardrobe' && classification.kind !== 'wardrobe') {
      throw new Error('Only clothing, outfits, uniforms, and accessories may enter Wardrobe.')
    }
    if (input.layer === 'current-appearance' && !['current-appearance', 'wardrobe', 'expression'].includes(classification.kind)) {
      throw new Error('Scene Appearance accepts temporary visual state only.')
    }
  }
  if (input.sourceType === 'generated-prompt' && input.layer === 'visual-identity') {
    throw new Error('Generated prompts cannot create permanent Visual Identity facts.')
  }
  const conflictDomain = clean(input.conflictDomain)
  if (conflictDomain && !isValidConflictDomain(conflictDomain)) throw new Error('Appearance conflict domain is structurally invalid.')
  const factId = `fact-${hash(semanticFactIdentityKey(input.layer, character.canonicalCharacterId, input.category, value, conflictDomain || undefined))}`
  const map = layerMap(vault, input.layer)
  const existing = map[factId]
  const sourceReference: AppearanceSourceReference = {
    sourceType: input.sourceType,
    ...input.sourceReference,
    chatId: clean(input.sourceReference?.chatId) || clean(input.chatId) || vault.chatId || undefined,
    messageId: clean(input.sourceReference?.messageId) || clean(input.sourceMessageId) || undefined,
    swipeId: input.sourceReference?.swipeId ?? input.sourceSwipeId,
  }
  const fact: AppearanceVaultFact = {
    factId,
    layer: input.layer,
    canonicalCharacterId: character.canonicalCharacterId,
    canonicalCharacterName: character.canonicalCharacterName,
    aliases: [...character.aliases],
    category: input.category,
    value,
    conflictDomain: conflictDomain || existing?.conflictDomain,
    sourceType: input.sourceType,
    sourceReference,
    confidence: clamp(input.confidence ?? (input.userConfirmed ? 1 : 0.7), 0, 1),
    status: 'active',
    createdAt: existing?.createdAt || now,
    updatedAt: now,
    pinned: Boolean(input.pinned || existing?.pinned),
    userConfirmed: Boolean(input.userConfirmed || existing?.userConfirmed),
    referenceAssetIds: unique([...(existing?.referenceAssetIds || []), ...stringList(input.referenceAssetIds)]),
    notes: clean(input.notes) || existing?.notes,
    outfitName: clean(input.outfitName) || existing?.outfitName,
    defaultWardrobe: input.layer === 'wardrobe' ? Boolean(input.defaultWardrobe ?? existing?.defaultWardrobe) : undefined,
    currentWardrobe: input.layer === 'wardrobe' ? Boolean(input.currentWardrobe ?? existing?.currentWardrobe) : undefined,
    chatId: input.layer === 'current-appearance' ? clean(input.chatId) || vault.chatId : undefined,
    sourceMessageId: input.layer === 'current-appearance' ? clean(input.sourceMessageId) || undefined : undefined,
    sourceSwipeId: input.layer === 'current-appearance' ? input.sourceSwipeId : undefined,
    active: input.layer === 'current-appearance' ? input.active !== false : undefined,
    expiryPolicy: input.layer === 'current-appearance' ? input.expiryPolicy || 'superseded' : undefined,
    expiresAt: input.layer === 'current-appearance' ? input.expiresAt : undefined,
    lastUsedAt: existing?.lastUsedAt,
  }
  map[factId] = fact
  supersedeAppearanceConflicts(vault, fact.layer, character.canonicalCharacterId, factId, now)
  if (input.layer === 'wardrobe' && input.currentWardrobe && !options.deferCurrentWardrobeSupersede) supersedeCurrentWardrobe(vault, character.canonicalCharacterId, factId, now, Boolean(input.userConfirmed))
  appendHistory(vault, 'fact-added', { characterId: character.canonicalCharacterId, factId, sourceReference, details: { layer: input.layer, category: input.category } }, now)
  syncCharacterSheetPresentation(vault, character.canonicalCharacterId, now)
  vault.updatedAt = now
  return fact
}

export function addAppearanceFacts(vault: ContinuityVaultState, input: AddAppearanceFactInput, now = Date.now()): AppearanceVaultFact[] {
  const rows = canonicalizeAppearanceFactInput(input)
  if (!rows.length) throw new Error('Appearance value could not be normalized into canonical appearance tags.')
  const currentWardrobeBatch = input.layer === 'wardrobe' && input.currentWardrobe && rows.some(row => row.layer === 'wardrobe')
  const saved: AppearanceVaultFact[] = []
  for (const row of rows) {
    saved.push(addCanonicalAppearanceFact(vault, {
      ...input,
      layer: row.layer,
      category: row.category,
      value: row.value,
      conflictDomain: row.conflictDomain || input.conflictDomain,
      currentWardrobe: row.layer === 'wardrobe' ? input.currentWardrobe : undefined,
    }, now, { deferCurrentWardrobeSupersede: currentWardrobeBatch }))
  }
  if (currentWardrobeBatch) {
    supersedeCurrentWardrobeSet(vault, input.characterId, new Set(saved.filter(fact => fact.layer === 'wardrobe').map(fact => fact.factId)), now, Boolean(input.userConfirmed))
    syncCharacterSheetPresentation(vault, input.characterId, now)
  }
  return saved
}

export function addAppearanceFact(vault: ContinuityVaultState, input: AddAppearanceFactInput, now = Date.now()): AppearanceVaultFact {
  const facts = addAppearanceFacts(vault, input, now)
  return facts[0]
}

export function addAppearanceSuggestion(
  vault: ContinuityVaultState,
  input: Omit<AppearanceSuggestion, 'suggestionId' | 'status' | 'createdAt' | 'updatedAt'>,
  now = Date.now(),
): AppearanceSuggestion {
  const suggestionId = `suggestion-${hash(`${input.resolvedCharacterId || input.unresolvedSubject || ''}:${input.recommendedLayer}:${input.proposedCategory}:${normalizeValue(input.proposedValue)}`)}`
  const existing = vault.suggestions[suggestionId]
  const suggestion: AppearanceSuggestion = {
    ...input,
    suggestionId,
    status: existing?.status === 'accepted' || existing?.status === 'rejected' ? existing.status : 'pending',
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  }
  vault.suggestions[suggestionId] = suggestion
  appendHistory(vault, 'suggestion-created', { characterId: input.resolvedCharacterId, suggestionId, sourceReference: input.sourceReference }, now)
  vault.updatedAt = now
  return suggestion
}

export function suggestionFromGeneratedPrompt(
  vault: ContinuityVaultState,
  input: {
    subjectName: string
    value: string
    chatId?: string
    messageId?: string
    swipeId?: number
    requestId?: string
    slot?: string
    assetId?: string
    versionId?: string
  },
  now = Date.now(),
): AppearanceSuggestion | AppearanceQuarantineItem | null {
  const classification = classifyAppearanceValue(input.value)
  if (!classification.layer || !classification.category) return null
  const character = resolveCanonicalCharacter(vault, input.subjectName)
  const sourceReference: AppearanceSourceReference = {
    sourceType: 'generated-prompt',
    chatId: clean(input.chatId) || undefined,
    messageId: clean(input.messageId) || undefined,
    swipeId: input.swipeId,
    requestId: clean(input.requestId) || undefined,
    slot: clean(input.slot) || undefined,
    assetId: clean(input.assetId) || undefined,
    versionId: clean(input.versionId) || undefined,
  }
  if (!character) {
    return quarantineValue(vault, {
      unresolvedSubject: input.subjectName,
      value: input.value,
      reason: 'Generated prompt trait has no resolved canonical character and cannot become memory.',
      sourceReference,
      recommendedLayer: classification.layer,
    }, now)
  }
  return addAppearanceSuggestion(vault, {
    resolvedCharacterId: character.canonicalCharacterId,
    resolvedCharacterName: character.canonicalCharacterName,
    proposedValue: clean(input.value),
    proposedCategory: classification.category,
    recommendedLayer: classification.layer,
    sourceType: 'generated-prompt',
    sourceReference,
    confidence: 0.45,
    reason: 'Accepted images may suggest appearance traits, but generated prompt text is not authoritative permanent memory.',
  }, now)
}

export function acceptSuggestion(
  vault: ContinuityVaultState,
  suggestionId: string,
  targetLayer?: AppearanceVaultLayer,
  editedValue?: string,
  now = Date.now(),
): AppearanceVaultFact {
  const suggestion = vault.suggestions[suggestionId]
  if (!suggestion) throw new Error('Appearance suggestion not found.')
  if (!suggestion.resolvedCharacterId || !vault.characters[suggestion.resolvedCharacterId]) {
    throw new Error('Resolve the suggestion to a canonical character before accepting it.')
  }
  const layer = targetLayer || suggestion.recommendedLayer
  const value = clean(editedValue) || suggestion.proposedValue
  const classification = classifyAppearanceValue(value, suggestion.proposedCategory)
  const category = classification.category || suggestion.proposedCategory
  const fact = addAppearanceFact(vault, {
    layer,
    characterId: suggestion.resolvedCharacterId,
    category,
    value,
    sourceType: 'user-confirmed-analysis',
    sourceReference: { ...suggestion.sourceReference, sourceType: 'user-confirmed-analysis' },
    confidence: 1,
    userConfirmed: true,
    pinned: layer === 'visual-identity',
    chatId: suggestion.sourceReference.chatId,
    sourceMessageId: suggestion.sourceReference.messageId,
    sourceSwipeId: suggestion.sourceReference.swipeId,
    currentWardrobe: layer === 'wardrobe' && category === 'current-outfit',
    semanticAuthority: 'explicit-user',
  }, now)
  suggestion.status = 'accepted'
  suggestion.updatedAt = now
  appendHistory(vault, 'suggestion-accepted', { characterId: suggestion.resolvedCharacterId, factId: fact.factId, suggestionId }, now)
  delete vault.suggestions[suggestionId]
  vault.updatedAt = now
  return fact
}

export function rejectSuggestion(vault: ContinuityVaultState, suggestionId: string, now = Date.now()): void {
  const suggestion = vault.suggestions[suggestionId]
  if (!suggestion) throw new Error('Appearance suggestion not found.')
  suggestion.status = 'rejected'
  suggestion.updatedAt = now
  appendHistory(vault, 'suggestion-rejected', { characterId: suggestion.resolvedCharacterId, suggestionId }, now)
  delete vault.suggestions[suggestionId]
  vault.updatedAt = now
}

export function clearCurrentAppearance(vault: ContinuityVaultState, characterId: string, now = Date.now()): number {
  let count = 0
  for (const fact of Object.values(vault.currentAppearance)) {
    if (fact.canonicalCharacterId !== characterId || fact.status !== 'active' || fact.active === false) continue
    fact.active = false
    fact.status = 'inactive'
    fact.updatedAt = now
    count += 1
  }
  if (count) appendHistory(vault, 'current-appearance-cleared', { characterId, details: { count } }, now)
  vault.updatedAt = now
  return count
}

export function expireCurrentAppearance(vault: ContinuityVaultState, now = Date.now()): void {
  for (const fact of Object.values(vault.currentAppearance)) {
    if (fact.status !== 'active' || fact.active === false) continue
    if (fact.expiryPolicy === 'timestamp' && fact.expiresAt && fact.expiresAt <= now) {
      fact.active = false
      fact.status = 'inactive'
      fact.updatedAt = now
    }
  }
}

/**
 * Stable identity is an anchor, but temporary wardrobe, accessories and body
 * state only belong in an image when that part of the frame can actually be
 * seen.  This intentionally uses the existing structured fact layer/category
 * plus the supplied scene brief; it is not a second Sidecar classifier.
 */
function continuityFactVisibleInScene(fact: AppearanceVaultFact, sceneBrief: string): boolean {
  if (fact.layer === 'visual-identity') return true
  const scene = sceneBrief.toLocaleLowerCase()
  const value = `${fact.category} ${fact.value}`.replace(/_/g, ' ').toLocaleLowerCase()
  const fullBody = /\b(full[ -]?body|head[ -]?to[ -]?toe|standing|walking|running|kneel|kneeling|feet|barefoot|shoes?|boots?|legs?|whole body)\b/.test(scene)
  const handsVisible = /\b(hand|hands|finger|fingers|holding|grip|touching|gesture|bandage|glove)\b/.test(scene)
  const upperVisible = /\b(face|head|portrait|close[ -]?up|waist[ -]?up|upper body|shoulders?|bust)\b/.test(scene)
  if (/\b(shoes?|boots?|socks?|barefoot|ankle|calf|legwear)\b/.test(value)) return fullBody
  if (/\b(hand|finger|wrist|glove|bandage|bracelet|ring)\b/.test(value)) return handsVisible || fullBody
  // Only externally visible removable layers are safely omitted in a tight
  // crop. A normal outfit (including a hoodie) remains continuity context
  // unless the scene explicitly frames the layer out.
  if (/\b(jacket|coat|outerwear|backpack|belt|waist)\b/.test(value)) return fullBody || /\b(jacket|coat|outerwear|waist)\b/.test(scene)
  if (/\b(hair|ponytail|braid|hat|cap|earring|necklace)\b/.test(value)) return upperVisible || fullBody
  return true
}

export function selectContinuityForSubjects(
  vault: ContinuityVaultState,
  input: {
    subjectNames: string[]
    chatId: string
    sceneBrief: string
    strength?: ContinuityStrength
    ignored?: boolean
  },
  now = Date.now(),
): AppearanceSelection {
  expireCurrentAppearance(vault, now)
  const strength = input.strength || vault.strength
  const excluded: ContinuityDecision[] = []
  if (strength === 'off' || input.ignored) {
    return {
      included: [],
      excluded: allAppearanceFacts(vault).map(fact => ({ factId: fact.factId, included: false, reason: strength === 'off' ? 'Appearance Memory is off.' : 'Appearance Memory is ignored for this slot.' })),
      attachedReferenceAssetIds: [], conflicts: [], strength, subjectCharacterIds: [],
    }
  }
  const resolvedCharacters = unique(input.subjectNames.map(name => resolveCanonicalCharacter(vault, name)?.canonicalCharacterId || '').filter(Boolean))
  const subjectSet = new Set(resolvedCharacters)
  if (!subjectSet.size) {
    return {
      included: [],
      excluded: allAppearanceFacts(vault).map(fact => ({ factId: fact.factId, included: false, reason: 'No canonical subject in the generation request matched this fact.' })),
      attachedReferenceAssetIds: [], conflicts: [], strength, subjectCharacterIds: [],
    }
  }
  // Alternate looks are deliberate user-selected presentation overrides. They
  // are the only primary-generation input retained in the compatibility sheet;
  // stable appearance and current outfit always come from canonical fact maps.
  const activeAlternateLookFacts: AppearanceVaultFact[] = []
  for (const characterId of resolvedCharacters) {
    const sheet = vault.characterSheets[characterId]
    const look = sheet?.alternateLooks.find(candidate => candidate.lookId === sheet.activeAlternateLookId)
    const character = vault.characters[characterId]
    if (!look || !character) continue
    activeAlternateLookFacts.push({
      factId: `alternate-look:${characterId}:${look.lookId}`,
      layer: 'visual-identity', category: 'other', value: look.booruTags,
      canonicalCharacterId: characterId, canonicalCharacterName: character.canonicalCharacterName, aliases: [...character.aliases],
      sourceType: 'user-confirmed-analysis', sourceReference: { sourceType: 'user-confirmed-analysis', sourceReference: `alternate-look:${look.lookId}`, chatId: input.chatId },
      confidence: 1, status: 'active', createdAt: look.createdAt, updatedAt: look.updatedAt, pinned: true, userConfirmed: true,
      referenceAssetIds: [...look.referenceAssetIds], notes: look.negativeIdentityTags ? `NEGATIVE_IDENTITY_TAGS: ${look.negativeIdentityTags}` : undefined, lastUsedAt: now,
    })
  }
  const sceneOverrideDomains = new Set(appearanceOverrideDomains(input.sceneBrief))
  // Stable identity and the current outfit are passive fallbacks. The current
  // scene still wins whenever it explicitly supplies the same appearance domain.
  // All Sidecar-owned layers participate. Current outfit/state must carry forward
  // until the Sidecar supplies a real replacement; it cannot disappear merely
  // because a later assistant message did not restate clothing.
  // Fact maps are the sole canonical semantic state. Character sheets are a
  // derived UI/compatibility cache, so they cannot inject a second conflicting
  // stable appearance or current outfit into Illustrator.
  const facts = [...activeAlternateLookFacts, ...Object.values(vault.visualIdentity), ...Object.values(vault.wardrobe), ...Object.values(vault.currentAppearance)]
  const currentWardrobeCharacters = new Set(facts
    .filter(fact => fact.layer === 'wardrobe' && fact.status === 'active' && fact.currentWardrobe)
    .map(fact => fact.canonicalCharacterId))
  const eligible: AppearanceVaultFact[] = []
  for (const fact of facts) {
    if (!subjectSet.has(fact.canonicalCharacterId)) {
      excluded.push({ factId: fact.factId, included: false, reason: 'Fact belongs to a different canonical character.' })
      continue
    }
    if (fact.status !== 'active') {
      excluded.push({ factId: fact.factId, included: false, reason: `Fact is ${fact.status}.` })
      continue
    }
    if (fact.layer === 'wardrobe' && !fact.currentWardrobe && currentWardrobeCharacters.has(fact.canonicalCharacterId)) {
      excluded.push({ factId: fact.factId, included: false, reason: 'Current outfit supersedes older base or saved wardrobe for this generation.' })
      continue
    }
    const stableDomains = appearanceOverrideDomains(fact.value, fact.category)
    if (stableDomains.some(domain => sceneOverrideDomains.has(domain))) {
      excluded.push({ factId: fact.factId, included: false, reason: 'Authoritative current scene overrides this stable fallback for the present generation.' })
      continue
    }
    if (!continuityFactVisibleInScene(fact, input.sceneBrief)) {
      excluded.push({ factId: fact.factId, included: false, reason: 'Current framing does not make this temporary wardrobe, accessory, or body-state fact visible.' })
      continue
    }
    eligible.push(fact)
  }
  const resolvedEligible = dedupeResolvedAppearanceFacts(eligible)
  const conflicts: string[] = []
  const grouped = new Map<string, AppearanceVaultFact[]>()
  for (const fact of resolvedEligible) {
    const key = `${fact.canonicalCharacterId}:${conflictCategory(fact.category, fact.value, fact.conflictDomain)}`
    const rows = grouped.get(key) || []
    rows.push(fact)
    grouped.set(key, rows)
  }
  const winners: AppearanceVaultFact[] = []
  for (const rows of grouped.values()) {
    rows.sort(compareFactPriority)
    const take = rows[0]
    winners.push(take)
    for (const loser of rows.slice(1)) {
      const conflict = `Preferred ${take.factId} over ${loser.factId} for ${take.canonicalCharacterName} / ${conflictCategory(take.category, take.value, take.conflictDomain)}.`
      conflicts.push(conflict)
      excluded.push({ factId: loser.factId, included: false, reason: 'Superseded by a higher-priority relevant fact.', conflict })
    }
  }
  const perSubjectLimit = strength === 'strong' ? 18 : strength === 'medium' ? 10 : 5
  const included: AppearanceVaultFact[] = []
  for (const characterId of resolvedCharacters) {
    const subjectRows = winners.filter(fact => fact.canonicalCharacterId === characterId).sort(compareFactPriority)
    included.push(...subjectRows.slice(0, perSubjectLimit))
    for (const fact of subjectRows.slice(perSubjectLimit)) excluded.push({ factId: fact.factId, included: false, reason: `Omitted by ${strength} subject-scoped fact limit.` })
  }
  const attachedReferenceAssetIds = unique(included.flatMap(fact => fact.referenceAssetIds))
  for (const fact of included) fact.lastUsedAt = now
  // Generation records retain immutable fact snapshots. A later Sidecar wardrobe
  // change may supersede live state, but cannot rewrite an already-prepared job.
  const snapshot = included.map(fact => ({
    ...fact,
    aliases: [...fact.aliases],
    referenceAssetIds: [...fact.referenceAssetIds],
    sourceReference: { ...fact.sourceReference },
  }))
  return { included: snapshot, excluded, attachedReferenceAssetIds, conflicts, strength, subjectCharacterIds: resolvedCharacters }
}

/** Presentation only: semantic category/value storage remains untouched. */
export function appearanceFactDescriptor(fact: Pick<AppearanceVaultFact, 'category' | 'value'>): string {
  const value = fact.value.trim()
  const readable = value.replace(/_/g, ' ')
  const descriptors: Partial<Record<AppearanceFactCategory, [RegExp, string]>> = {
    'hair-color': [/\bhair\b/i, 'hair'], 'hair-length': [/\bhair\b/i, 'hair'], 'hair-texture': [/\bhair\b/i, 'hair'],
    'eye-color': [/\beyes?\b/i, 'eyes'], 'face-shape': [/\bface\b/i, 'face'], 'body-build': [/\b(?:body|build|physique)\b/i, 'build'],
    height: [/\b(?:tall|height)\b/i, 'tall'], scar: [/\bscars?\b/i, 'scar'], tattoo: [/\btattoos?\b/i, 'tattoo'],
    birthmark: [/\bbirthmarks?\b/i, 'birthmark'], mole: [/\b(?:moles?|beauty mark)\b/i, 'mole'], prosthetic: [/\bprosthe\w*\b/i, 'prosthetic'],
    'temporary-hair': [/\bhair\b/i, 'hair'], 'temporary-makeup': [/\bmakeup\b/i, 'makeup'],
  }
  const descriptor = descriptors[fact.category]
  if (!value || !descriptor || descriptor[0].test(readable)) return value
  return `${value} ${descriptor[1]}`
}

export function formatSelectedAppearanceFacts(facts: AppearanceVaultFact[]): string {
  const byCharacter = new Map<string, AppearanceVaultFact[]>()
  for (const fact of dedupeResolvedAppearanceFacts(facts)) {
    const rows = byCharacter.get(fact.canonicalCharacterId) || []
    rows.push(fact)
    byCharacter.set(fact.canonicalCharacterId, rows)
  }
  const sections: string[] = []
  for (const rows of byCharacter.values()) {
    const name = rows[0]?.canonicalCharacterName || 'Character'
    const identity = rows.filter(fact => fact.layer === 'visual-identity')
    const wardrobe = rows.filter(fact => fact.layer === 'wardrobe')
    const current = rows.filter(fact => fact.layer === 'current-appearance')
    sections.push([
      `${name}:`,
      identity.length ? `  Appearance booru tags: ${identity.map(appearanceFactDescriptor).join('; ')}` : '',
      identity.some(fact => fact.notes?.startsWith('NEGATIVE_IDENTITY_TAGS:')) ? `  Negative identity tags: ${identity.map(fact => fact.notes || '').filter(note => note.startsWith('NEGATIVE_IDENTITY_TAGS:')).map(note => note.replace('NEGATIVE_IDENTITY_TAGS:', '').trim()).join('; ')}` : '',
      wardrobe.length ? `  Wardrobe: ${wardrobe.map(appearanceFactDescriptor).join('; ')}` : '',
      current.length ? `  Scene Appearance: ${current.map(appearanceFactDescriptor).join('; ')}` : '',
    ].filter(Boolean).join('\n'))
  }
  return sections.join('\n')
}

export function allAppearanceFacts(vault: ContinuityVaultState): AppearanceVaultFact[] {
  return [
    ...Object.values(vault.visualIdentity),
    ...Object.values(vault.wardrobe),
    ...Object.values(vault.currentAppearance),
  ]
}

export function dedupeResolvedAppearanceFacts(facts: AppearanceVaultFact[]): AppearanceVaultFact[] {
  const groups = new Map<string, AppearanceVaultFact[]>()
  for (const fact of facts) {
    if (fact.status !== 'active' || (fact.layer === 'current-appearance' && fact.active === false)) continue
    if (fact.layer === 'current-appearance' && isSceneActionOnlyAppearanceValue(fact.value, fact.category)) continue
    const key = fact.layer === 'visual-identity'
      ? `${fact.canonicalCharacterId}:${fact.layer}:${normalizeValue(fact.value)}`
      : fact.layer === 'current-appearance'
        ? `${fact.canonicalCharacterId}:${fact.layer}:${currentAppearanceDomain(fact)}`
        : `${fact.canonicalCharacterId}:${fact.layer}:${conflictCategory(fact.category, fact.value, fact.conflictDomain)}`
    const rows = groups.get(key) || []
    rows.push(fact)
    groups.set(key, rows)
  }
  return [...groups.values()].map(rows => rows.sort((left, right) => {
    if (left.layer === 'current-appearance' || right.layer === 'current-appearance') return right.updatedAt - left.updatedAt || compareFactPriority(left, right)
    return compareFactPriority(left, right)
  })[0])
}

/** Returns the exact canonical values the Appearance editor presents. */
export function appearanceMemoryView(vault: ContinuityVaultState, characterId: string): AppearanceMemoryView {
  const active = (facts: AppearanceVaultFact[]) => {
    const rows = dedupeResolvedAppearanceFacts(facts
    .filter(fact => fact.canonicalCharacterId === characterId && fact.status === 'active' && (fact.layer !== 'current-appearance' || fact.active !== false))
    .sort(compareFactPriority))
    const byConflict = new Map<string, AppearanceVaultFact>()
    for (const fact of rows) {
      const key = fact.layer === 'visual-identity'
        ? `${fact.layer}:${normalizeValue(fact.value)}`
        : fact.layer === 'current-appearance'
          ? `${fact.layer}:${currentAppearanceDomain(fact)}`
          : `${fact.layer}:${conflictCategory(fact.category, fact.value, fact.conflictDomain)}`
      if (!byConflict.has(key)) byConflict.set(key, fact)
    }
    return [...byConflict.values()]
  }
  const stable = active(Object.values(vault.visualIdentity))
  const wardrobe = active(Object.values(vault.wardrobe))
  const current = active(Object.values(vault.currentAppearance))
  const currentOutfit = wardrobe
    .filter(fact => fact.currentWardrobe || fact.category === 'current-outfit')
    .map(appearanceFactDescriptor)
  const fallbackOutfit = currentOutfit.length ? currentOutfit : wardrobe.map(appearanceFactDescriptor)
  const facts = [...stable, ...wardrobe, ...current]
  return {
    characterId,
    stableAppearance: stable.map(appearanceFactDescriptor).join(', '),
    currentOutfit: fallbackOutfit.join(', '),
    currentState: current.map(appearanceFactDescriptor).join(', '),
    hasFacts: facts.length > 0,
    updatedAt: Math.max(0, ...facts.map(fact => fact.updatedAt)),
  }
}

/**
 * Keeps the legacy sheet shape available to the frontend without allowing it
 * to become a second store for stable appearance or current outfit values.
 */
export function syncCharacterSheetPresentation(vault: ContinuityVaultState, characterId: string, now = Date.now()): AppearanceCharacterSheet | undefined {
  const character = vault.characters[characterId]
  if (!character) return undefined
  const view = appearanceMemoryView(vault, characterId)
  const existing = vault.characterSheets[characterId]
  if (!view.hasFacts && !existing) return undefined
  const sourceFact = [...Object.values(vault.visualIdentity), ...Object.values(vault.wardrobe), ...Object.values(vault.currentAppearance)]
    .filter(fact => fact.canonicalCharacterId === characterId)
    .sort(compareFactPriority)[0]
  const sheet: AppearanceCharacterSheet = {
    canonicalCharacterId: characterId,
    canonicalCharacterName: character.canonicalCharacterName,
    aliases: [...character.aliases],
    booruTags: view.stableAppearance,
    currentOutfitTags: view.currentOutfit,
    negativeIdentityTags: existing?.negativeIdentityTags || '',
    referenceAssetIds: unique([...(existing?.referenceAssetIds || []), ...(sourceFact?.referenceAssetIds || [])]),
    alternateLooks: existing?.alternateLooks || [],
    activeAlternateLookId: existing?.activeAlternateLookId,
    sourceSentence: existing?.sourceSentence || (sourceFact?.sourceType === 'appearance-sidecar' ? 'Appearance Sidecar-maintained canonical memory.' : 'Canonical Appearance Memory.'),
    sourceMessageId: sourceFact?.sourceReference.messageId || existing?.sourceMessageId,
    sourceSwipeId: sourceFact?.sourceReference.swipeId ?? existing?.sourceSwipeId,
    lastScanAt: undefined,
    createdAt: existing?.createdAt || now,
    updatedAt: Math.max(view.updatedAt, existing?.updatedAt || 0, existing ? 0 : now),
  }
  vault.characterSheets[characterId] = sheet
  return sheet
}

export function syncAllCharacterSheetPresentation(vault: ContinuityVaultState, now = Date.now()): void {
  for (const characterId of Object.keys(vault.characters)) syncCharacterSheetPresentation(vault, characterId, now)
}

/**
 * The primary Appearance Memory editor is an explicit user authority. It writes
 * canonical facts rather than maintaining a parallel sheet-only record.
 */
export function saveManualAppearanceMemory(
  vault: ContinuityVaultState,
  input: { characterId: string; stableAppearance: string; currentOutfit: string; negativeIdentityTags?: string; referenceAssetIds?: string[]; chatId?: string },
  now = Date.now(),
): void {
  const character = vault.characters[input.characterId]
  if (!character) throw new Error('Character not found.')
  for (const fact of allAppearanceFacts(vault)) {
    if (fact.canonicalCharacterId !== input.characterId || fact.sourceReference.sourceReference !== 'appearance-editor') continue
    removeAppearanceFact(vault, fact.factId, now)
  }
  if (clean(input.stableAppearance)) {
    addAppearanceFacts(vault, {
      layer: 'visual-identity', characterId: input.characterId,
      category: 'other', value: input.stableAppearance,
      sourceType: 'manual', sourceReference: { sourceType: 'manual', sourceReference: 'appearance-editor', chatId: input.chatId || vault.chatId },
      confidence: 1, pinned: true, userConfirmed: true, referenceAssetIds: input.referenceAssetIds,
      semanticAuthority: 'explicit-user',
    }, now)
  }
  if (clean(input.currentOutfit)) {
    addAppearanceFacts(vault, {
      layer: 'wardrobe', characterId: input.characterId, category: 'current-outfit', value: input.currentOutfit,
      sourceType: 'manual', sourceReference: { sourceType: 'manual', sourceReference: 'appearance-editor', chatId: input.chatId || vault.chatId },
      confidence: 1, pinned: true, userConfirmed: true, currentWardrobe: true, referenceAssetIds: input.referenceAssetIds,
      semanticAuthority: 'explicit-user',
    }, now)
  } else {
    for (const fact of Object.values(vault.wardrobe)) {
      if (fact.canonicalCharacterId !== input.characterId || !fact.currentWardrobe || fact.userConfirmed) continue
      fact.status = 'inactive'
      fact.currentWardrobe = false
      fact.updatedAt = now
    }
  }
  const existing = vault.characterSheets[input.characterId]
  if (existing || Object.values(vault.visualIdentity).some(fact => fact.canonicalCharacterId === input.characterId)) {
    vault.characterSheets[input.characterId] = {
      ...(existing || {
        canonicalCharacterId: input.characterId, canonicalCharacterName: character.canonicalCharacterName, aliases: [...character.aliases],
        booruTags: '', currentOutfitTags: '', negativeIdentityTags: '', referenceAssetIds: [], alternateLooks: [], sourceSentence: '', createdAt: now, updatedAt: now,
      }),
      negativeIdentityTags: serializeCanonicalTagList(input.negativeIdentityTags),
      referenceAssetIds: unique(input.referenceAssetIds || existing?.referenceAssetIds || []),
      sourceSentence: 'Manual Appearance Memory editor.',
      updatedAt: now,
    }
  }
  syncCharacterSheetPresentation(vault, input.characterId, now)
  appendHistory(vault, 'appearance-memory-saved', { characterId: input.characterId, details: { source: 'appearance-editor' } }, now)
  vault.updatedAt = now
}

export function findAppearanceFact(vault: ContinuityVaultState, factId: string): AppearanceVaultFact | undefined {
  return vault.visualIdentity[factId] || vault.wardrobe[factId] || vault.currentAppearance[factId]
}

export function removeAppearanceFact(vault: ContinuityVaultState, factId: string, now = Date.now()): boolean {
  for (const map of [vault.visualIdentity, vault.wardrobe, vault.currentAppearance]) {
    if (!map[factId]) continue
    const fact = map[factId]
    delete map[factId]
    appendHistory(vault, 'fact-removed', { characterId: fact.canonicalCharacterId, factId }, now)
    syncCharacterSheetPresentation(vault, fact.canonicalCharacterId, now)
    vault.updatedAt = now
    return true
  }
  return false
}

export function mergeAppearanceFacts(vault: ContinuityVaultState, factIds: string[], now = Date.now()): AppearanceVaultFact {
  const facts = unique(factIds).map(factId => findAppearanceFact(vault, factId)).filter(Boolean) as AppearanceVaultFact[]
  if (facts.length < 2) throw new Error('Select at least two appearance facts to merge.')
  const characterId = facts[0].canonicalCharacterId
  const layer = facts[0].layer
  const category = facts[0].category
  if (facts.some(fact => fact.canonicalCharacterId !== characterId)) throw new Error('Appearance facts from different characters cannot be merged.')
  if (facts.some(fact => fact.layer !== layer)) throw new Error('Move facts into the same Vault layer before merging them.')
  if (facts.some(fact => conflictCategory(fact.category) !== conflictCategory(category))) throw new Error('Only duplicate or equivalent appearance categories can be merged.')

  const winner = [...facts].sort(compareFacts)[0]
  const mergedValue = [...facts]
    .sort(compareFacts)
    .map(fact => fact.value)
    .find(value => Boolean(value)) || winner.value
  const mergedReferences = unique(facts.flatMap(fact => fact.referenceAssetIds))
  const mergedNotes = unique(facts.map(fact => clean(fact.notes)).filter(Boolean)).join(' | ') || undefined
  const sourceReferences = facts.map(fact => fact.sourceReference)

  for (const fact of facts) removeAppearanceFact(vault, fact.factId, now)
  const merged = addAppearanceFact(vault, {
    layer,
    characterId,
    category: winner.category,
    value: mergedValue,
    conflictDomain: winner.conflictDomain,
    sourceType: 'user-confirmed-analysis',
    sourceReference: { ...winner.sourceReference, sourceType: 'user-confirmed-analysis' },
    confidence: Math.max(...facts.map(fact => fact.confidence), 0.95),
    pinned: facts.some(fact => fact.pinned),
    userConfirmed: true,
    referenceAssetIds: mergedReferences,
    notes: mergedNotes,
    outfitName: winner.outfitName,
    defaultWardrobe: layer === 'wardrobe' ? facts.some(fact => fact.defaultWardrobe) : undefined,
    currentWardrobe: layer === 'wardrobe' ? facts.some(fact => fact.currentWardrobe) : undefined,
    chatId: layer === 'current-appearance' ? winner.chatId || vault.chatId : undefined,
    sourceMessageId: layer === 'current-appearance' ? winner.sourceMessageId : undefined,
    sourceSwipeId: layer === 'current-appearance' ? winner.sourceSwipeId : undefined,
    active: layer === 'current-appearance' ? facts.some(fact => fact.active !== false && fact.status === 'active') : undefined,
    expiryPolicy: layer === 'current-appearance' ? winner.expiryPolicy || 'manual' : undefined,
    expiresAt: layer === 'current-appearance' ? Math.max(...facts.map(fact => fact.expiresAt || 0)) || undefined : undefined,
    semanticAuthority: 'explicit-user',
  }, now)
  appendHistory(vault, 'facts-merged', {
    characterId,
    factId: merged.factId,
    details: { mergedFactIds: facts.map(fact => fact.factId), sourceReferences },
  }, now)
  return merged
}

export function moveAppearanceFact(
  vault: ContinuityVaultState,
  factId: string,
  layer: AppearanceVaultLayer,
  category?: AppearanceFactCategory,
  now = Date.now(),
): AppearanceVaultFact {
  const fact = findAppearanceFact(vault, factId)
  if (!fact) throw new Error('Appearance fact not found.')
  const original = { ...fact }
  removeAppearanceFact(vault, factId, now)
  return addAppearanceFact(vault, {
    layer,
    characterId: original.canonicalCharacterId,
    category: category || original.category,
    value: original.value,
    conflictDomain: original.conflictDomain,
    sourceType: 'user-confirmed-analysis',
    sourceReference: { ...original.sourceReference, sourceType: 'user-confirmed-analysis' },
    confidence: Math.max(original.confidence, 0.95),
    pinned: original.pinned,
    userConfirmed: true,
    referenceAssetIds: original.referenceAssetIds,
    notes: original.notes,
    outfitName: original.outfitName,
    defaultWardrobe: layer === 'wardrobe' ? original.defaultWardrobe : undefined,
    currentWardrobe: layer === 'wardrobe' ? original.currentWardrobe : undefined,
    chatId: layer === 'current-appearance' ? original.chatId || vault.chatId : undefined,
    sourceMessageId: layer === 'current-appearance' ? original.sourceMessageId : undefined,
    sourceSwipeId: layer === 'current-appearance' ? original.sourceSwipeId : undefined,
    active: layer === 'current-appearance' ? true : undefined,
    expiryPolicy: layer === 'current-appearance' ? original.expiryPolicy || 'manual' : undefined,
    semanticAuthority: 'explicit-user',
  }, now)
}

export function buildMigrationPreview(
  legacyFactsValue: unknown,
  vault: ContinuityVaultState,
  sourceSchemaVersion: number,
  now = Date.now(),
): VaultMigrationPreview {
  const legacyFacts = asRecord(legacyFactsValue)
  const items: VaultMigrationItem[] = []
  const seen = new Map<string, string>()
  for (const [legacyFactId, payload] of Object.entries(legacyFacts)) {
    const raw = asRecord(payload)
    const entityName = clean(raw.entityName || raw.canonicalCharacterName || raw.subject)
    const entityType = clean(raw.entityType || raw.category || 'character-appearance')
    const value = clean(raw.value)
    const pinned = raw.pinned === true
    const classification = classifyAppearanceValue(value, entityType)
    const resolved = resolveCanonicalCharacter(vault, entityName)
    let disposition: VaultMigrationDisposition
    let reason = classification.reason
    if (!isValidCanonicalCharacterName(entityName)) {
      disposition = STYLE_RE.test(`${entityName} ${value}`) && !pinned ? 'remove' : 'quarantine'
      reason = INVALID_SUBJECTS.has(normalizeAlias(entityName))
        ? 'Invalid pronoun/style/camera entity name; source-based resolution is required.'
        : 'Unresolved or invalid legacy entity name.'
    } else if (!resolved) {
      disposition = 'quarantine'
      reason = 'Legacy subject is not yet resolved to a canonical character.'
    } else if (classification.layer === 'visual-identity') disposition = 'keep-visual-identity'
    else if (classification.layer === 'wardrobe') disposition = 'move-wardrobe'
    else if (classification.layer === 'current-appearance') disposition = 'move-current-appearance'
    else disposition = pinned ? 'quarantine' : 'remove'

    const duplicateKey = resolved && classification.category
      ? `${resolved.canonicalCharacterId}:${classification.layer}:${classification.category}:${normalizeValue(value)}`
      : ''
    const duplicateOfFactId = duplicateKey ? seen.get(duplicateKey) : undefined
    if (duplicateOfFactId) {
      disposition = 'merge'
      reason = 'Duplicate legacy fact can be merged into the first matching canonical fact.'
    } else if (duplicateKey) seen.set(duplicateKey, legacyFactId)

    items.push({
      migrationItemId: `migration-${hash(`${legacyFactId}:${entityName}:${value}`)}`,
      legacyFactId,
      legacyEntityName: entityName,
      legacyEntityType: entityType,
      legacyValue: value,
      disposition,
      reason,
      resolvedCharacterId: resolved?.canonicalCharacterId,
      resolvedCharacterName: resolved?.canonicalCharacterName,
      proposedCategory: classification.category,
      duplicateOfFactId,
      pinned,
      selected: true,
      legacyPayload: raw,
    })
  }
  return {
    previewId: `vault-clean-${hash(`${sourceSchemaVersion}:${now}:${items.length}`)}`,
    sourceSchemaVersion,
    createdAt: now,
    items,
    counts: migrationCounts(items),
  }
}

export function applyMigrationPreview(vault: ContinuityVaultState, selectedItemIds?: string[], now = Date.now()): { applied: number; skipped: number } {
  const preview = vault.migrationPreview
  if (!preview) return { applied: 0, skipped: 0 }
  const selected = selectedItemIds?.length ? new Set(selectedItemIds) : null
  let applied = 0
  let skipped = 0
  for (const item of preview.items) {
    if (!item.selected || selected && !selected.has(item.migrationItemId)) { skipped += 1; continue }
    const sourceReference = legacySourceReference(item.legacyPayload)
    if (item.disposition === 'remove') {
      applied += 1
      continue
    }
    if (item.disposition === 'quarantine' || !item.resolvedCharacterId || !item.proposedCategory) {
      quarantineValue(vault, {
        unresolvedSubject: item.legacyEntityName,
        value: item.legacyValue,
        reason: item.reason,
        sourceReference,
        recommendedLayer: dispositionLayer(item.disposition, item.proposedCategory),
        recommendedCharacterId: item.resolvedCharacterId,
        legacyFactId: item.legacyFactId,
      }, now)
      applied += 1
      continue
    }
    if (!vault.characters[item.resolvedCharacterId]) { skipped += 1; continue }
    const layer = dispositionLayer(item.disposition, item.proposedCategory)
    if (!layer) { applied += 1; continue }
    try {
      addAppearanceFact(vault, {
        layer,
        characterId: item.resolvedCharacterId,
        category: item.proposedCategory,
        value: item.legacyValue,
        sourceType: 'migration',
        sourceReference,
        confidence: clamp(Number(item.legacyPayload?.confidence) || 0.65, 0, 1),
        pinned: item.pinned,
        userConfirmed: item.pinned,
        referenceAssetIds: stringList(item.legacyPayload?.referenceAssetIds),
        chatId: clean(item.legacyPayload?.chatId) || vault.chatId,
        sourceMessageId: clean(asRecord(item.legacyPayload?.sourceProvenance).messageId),
        sourceSwipeId: optionalFinite(asRecord(item.legacyPayload?.sourceProvenance).swipeId),
        currentWardrobe: layer === 'wardrobe' && item.proposedCategory === 'current-outfit',
        defaultWardrobe: layer === 'wardrobe' && item.proposedCategory === 'base-attire',
        active: layer === 'current-appearance',
        expiryPolicy: layer === 'current-appearance' ? 'manual' : undefined,
      }, now)
      applied += 1
    } catch {
      quarantineValue(vault, {
        unresolvedSubject: item.legacyEntityName,
        value: item.legacyValue,
        reason: `Migration could not safely activate this value: ${item.reason}`,
        sourceReference,
        recommendedLayer: layer,
        recommendedCharacterId: item.resolvedCharacterId,
        legacyFactId: item.legacyFactId,
      }, now)
      applied += 1
    }
  }
  preview.appliedAt = now
  vault.updatedAt = now
  appendHistory(vault, 'migration-applied', { details: { previewId: preview.previewId, applied, skipped } }, now)
  return { applied, skipped }
}

export function updateMigrationItem(
  vault: ContinuityVaultState,
  migrationItemId: string,
  patch: Partial<Pick<VaultMigrationItem, 'disposition' | 'resolvedCharacterId' | 'resolvedCharacterName' | 'proposedCategory' | 'selected'>>,
  now = Date.now(),
): void {
  const preview = vault.migrationPreview
  const item = preview?.items.find(row => row.migrationItemId === migrationItemId)
  if (!preview || !item) throw new Error('Vault migration preview item not found.')
  Object.assign(item, patch)
  preview.counts = migrationCounts(preview.items)
  vault.updatedAt = now
}

export function quarantineValue(
  vault: ContinuityVaultState,
  input: Omit<AppearanceQuarantineItem, 'quarantineId' | 'createdAt' | 'updatedAt'>,
  now = Date.now(),
): AppearanceQuarantineItem {
  const quarantineId = `quarantine-${hash(`${input.legacyFactId || ''}:${input.unresolvedSubject || ''}:${normalizeValue(input.value)}`)}`
  const existing = vault.quarantine[quarantineId]
  const row: AppearanceQuarantineItem = {
    ...input,
    quarantineId,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  }
  vault.quarantine[quarantineId] = row
  appendHistory(vault, 'value-quarantined', { characterId: input.recommendedCharacterId, details: { quarantineId, reason: input.reason } }, now)
  vault.updatedAt = now
  return row
}

export function mergeCharacters(vault: ContinuityVaultState, sourceId: string, targetId: string, now = Date.now()): void {
  if (sourceId === targetId) return
  const source = vault.characters[sourceId]
  const target = vault.characters[targetId]
  if (!source || !target) throw new Error('Both canonical characters are required for merge.')
  target.aliases = unique([...target.aliases, source.canonicalCharacterName, ...source.aliases])
  target.userConfirmed ||= source.userConfirmed
  target.lumiverseCharacterId ||= source.lumiverseCharacterId
  target.lumiversePersonaId ||= source.lumiversePersonaId
  target.updatedAt = now
  for (const fact of allAppearanceFacts(vault)) {
    if (fact.canonicalCharacterId !== sourceId) continue
    fact.canonicalCharacterId = targetId
    fact.canonicalCharacterName = target.canonicalCharacterName
    fact.aliases = [...target.aliases]
    fact.updatedAt = now
  }
  const sourceSheet = vault.characterSheets[sourceId]
  const targetSheet = vault.characterSheets[targetId]
  if (sourceSheet) {
    vault.characterSheets[targetId] = {
      ...(targetSheet || sourceSheet),
      canonicalCharacterId: targetId,
      canonicalCharacterName: target.canonicalCharacterName,
      aliases: unique([...(targetSheet?.aliases || []), ...sourceSheet.aliases, source.canonicalCharacterName]),
      booruTags: targetSheet?.booruTags || sourceSheet.booruTags,
      currentOutfitTags: targetSheet?.currentOutfitTags || sourceSheet.currentOutfitTags,
      negativeIdentityTags: targetSheet?.negativeIdentityTags || sourceSheet.negativeIdentityTags,
      referenceAssetIds: unique([...(targetSheet?.referenceAssetIds || []), ...sourceSheet.referenceAssetIds]),
      alternateLooks: [...(targetSheet?.alternateLooks || []), ...sourceSheet.alternateLooks],
      updatedAt: now,
    }
    delete vault.characterSheets[sourceId]
  }
  for (const suggestion of Object.values(vault.suggestions)) {
    if (suggestion.resolvedCharacterId !== sourceId) continue
    suggestion.resolvedCharacterId = targetId
    suggestion.resolvedCharacterName = target.canonicalCharacterName
    suggestion.updatedAt = now
  }
  delete vault.characters[sourceId]
  appendHistory(vault, 'characters-merged', { characterId: targetId, details: { sourceId, targetId } }, now)
  vault.updatedAt = now
}

function normalizeCharacters(value: unknown): Record<string, CanonicalVisualCharacter> {
  const out: Record<string, CanonicalVisualCharacter> = {}
  for (const [id, payload] of Object.entries(asRecord(value))) {
    const raw = asRecord(payload)
    const name = clean(raw.canonicalCharacterName || raw.name)
    if (!isValidCanonicalCharacterName(name)) continue
    const characterId = clean(raw.canonicalCharacterId) || id
    out[characterId] = {
      canonicalCharacterId: characterId,
      canonicalCharacterName: name,
      aliases: unique(stringList(raw.aliases).filter(isValidCanonicalCharacterName)),
      lumiverseCharacterId: clean(raw.lumiverseCharacterId) || undefined,
      lumiversePersonaId: clean(raw.lumiversePersonaId) || undefined,
      avatarUrl: clean(raw.avatarUrl) || undefined,
      sourceType: isSourceType(clean(raw.sourceType)) ? clean(raw.sourceType) as AppearanceSourceType : 'migration',
      userConfirmed: raw.userConfirmed === true,
      createdAt: finite(raw.createdAt) || Date.now(),
      updatedAt: finite(raw.updatedAt) || Date.now(),
    }
  }
  return out
}

function normalizeCharacterSheets(value: unknown, characters: Record<string, CanonicalVisualCharacter>): Record<string, AppearanceCharacterSheet> {
  const out: Record<string, AppearanceCharacterSheet> = {}
  for (const [id, payload] of Object.entries(asRecord(value))) {
    const raw = asRecord(payload)
    const characterId = clean(raw.canonicalCharacterId) || id
    const character = characters[characterId]
    if (!character) continue
    const booruTags = clean(raw.booruTags || raw.appearanceTags || raw.tags)
    const alternateLooks = Array.isArray(raw.alternateLooks) ? raw.alternateLooks.map((look, index) => {
      const row = asRecord(look)
      const tags = clean(row.booruTags || row.tags)
      if (!tags) return null
      return {
        lookId: clean(row.lookId) || `look-${characterId}-${index + 1}`,
        name: clean(row.name) || `Alternate Look ${index + 1}`,
        booruTags: tags,
        negativeIdentityTags: clean(row.negativeIdentityTags),
        referenceAssetIds: unique(stringList(row.referenceAssetIds)),
        createdAt: finite(row.createdAt) || Date.now(),
        updatedAt: finite(row.updatedAt) || Date.now(),
      }
    }).filter(Boolean) as AppearanceCharacterSheet['alternateLooks'] : []
    out[characterId] = {
      canonicalCharacterId: characterId,
      canonicalCharacterName: character.canonicalCharacterName,
      aliases: unique([...character.aliases, ...stringList(raw.aliases)]),
      booruTags,
      currentOutfitTags: clean(raw.currentOutfitTags),
      negativeIdentityTags: clean(raw.negativeIdentityTags),
      referenceAssetIds: unique(stringList(raw.referenceAssetIds)),
      alternateLooks,
      sourceSentence: clean(raw.sourceSentence),
      sourceMessageId: clean(raw.sourceMessageId) || undefined,
      sourceSwipeId: optionalFinite(raw.sourceSwipeId),
      lastScanAt: finite(raw.lastScanAt) || undefined,
      createdAt: finite(raw.createdAt) || Date.now(),
      updatedAt: finite(raw.updatedAt) || Date.now(),
    }
  }
  return out
}

/**
 * C5A stored primary sheet fields separately from fact maps.  Adopt those
 * historical values once into canonical facts so older saved chats continue to
 * render and generate consistently after the prior Appearance correction.
 */
function adoptLegacySheetFacts(vault: ContinuityVaultState): void {
  for (const [characterId, sheet] of Object.entries(vault.characterSheets)) {
    if (!vault.characters[characterId]) continue
    const hasIdentity = Object.values(vault.visualIdentity).some(fact => fact.canonicalCharacterId === characterId && fact.status === 'active')
    if (sheet.booruTags && !hasIdentity) {
      addAppearanceFact(vault, {
        layer: 'visual-identity', characterId, category: 'other', value: sheet.booruTags,
        sourceType: 'migration', sourceReference: { sourceType: 'migration', sourceReference: 'legacy-character-sheet', chatId: vault.chatId, messageId: sheet.sourceMessageId, swipeId: sheet.sourceSwipeId },
        confidence: 0.9, pinned: true, userConfirmed: true, referenceAssetIds: sheet.referenceAssetIds,
        semanticAuthority: 'legacy-migration',
      }, sheet.updatedAt || Date.now())
    }
    const hasCurrentOutfit = Object.values(vault.wardrobe).some(fact => fact.canonicalCharacterId === characterId && fact.status === 'active' && (fact.currentWardrobe || fact.category === 'current-outfit'))
    if (sheet.currentOutfitTags && !hasCurrentOutfit) {
      addAppearanceFact(vault, {
        layer: 'wardrobe', characterId, category: 'current-outfit', value: sheet.currentOutfitTags,
        sourceType: 'migration', sourceReference: { sourceType: 'migration', sourceReference: 'legacy-character-sheet', chatId: vault.chatId, messageId: sheet.sourceMessageId, swipeId: sheet.sourceSwipeId },
        confidence: 0.9, pinned: true, userConfirmed: true, currentWardrobe: true, referenceAssetIds: sheet.referenceAssetIds,
        semanticAuthority: 'legacy-migration',
      }, sheet.updatedAt || Date.now())
    }
  }
}

function normalizeFactMap(value: unknown, layer: AppearanceVaultLayer, characters: Record<string, CanonicalVisualCharacter>): Record<string, AppearanceVaultFact> {
  const out: Record<string, AppearanceVaultFact> = {}
  for (const [id, payload] of Object.entries(asRecord(value))) {
    const raw = asRecord(payload)
    const characterId = clean(raw.canonicalCharacterId)
    const character = characters[characterId]
    const factValue = clean(raw.value)
    const category = clean(raw.category)
    if (!character || !factValue || !isCategory(category)) continue
    const sourceReference = normalizeSourceReference(raw.sourceReference, raw.sourceType)
    const sourceType = sourceReference.sourceType
    const rows = canonicalizeAppearanceFactInput({
      layer,
      characterId,
      category: category as AppearanceFactCategory,
      value: factValue,
      conflictDomain: isValidConflictDomain(clean(raw.conflictDomain)) ? clean(raw.conflictDomain) : undefined,
      sourceType,
      semanticAuthority: 'legacy-migration',
    })
    for (const row of rows) {
      if (row.layer !== layer) continue
      const conflictDomain = isValidConflictDomain(clean(row.conflictDomain)) ? clean(row.conflictDomain) : undefined
      const factId = `fact-${hash(semanticFactIdentityKey(layer, characterId, row.category, row.value, conflictDomain))}`
      const existing = out[factId]
      out[factId] = {
        factId,
        layer,
        canonicalCharacterId: characterId,
        canonicalCharacterName: character.canonicalCharacterName,
        aliases: unique([...character.aliases, ...stringList(raw.aliases), ...(existing?.aliases || [])]),
        category: row.category,
        value: row.value,
        conflictDomain: conflictDomain || existing?.conflictDomain,
        sourceType,
        sourceReference,
        confidence: Math.max(existing?.confidence || 0, clamp(Number(raw.confidence) || 0.5, 0, 1)),
        status: existing?.status === 'active' || isStatus(clean(raw.status)) ? (existing?.status === 'active' ? 'active' : clean(raw.status) as AppearanceVaultFact['status']) : 'active',
        createdAt: Math.min(existing?.createdAt || Number.POSITIVE_INFINITY, finite(raw.createdAt) || Date.now()),
        updatedAt: Math.max(existing?.updatedAt || 0, finite(raw.updatedAt) || Date.now()),
        pinned: Boolean(existing?.pinned || raw.pinned === true),
        userConfirmed: Boolean(existing?.userConfirmed || raw.userConfirmed === true),
        referenceAssetIds: unique([...(existing?.referenceAssetIds || []), ...stringList(raw.referenceAssetIds)]),
        notes: clean(raw.notes) || existing?.notes,
        outfitName: clean(raw.outfitName) || existing?.outfitName,
        defaultWardrobe: layer === 'wardrobe' ? Boolean(raw.defaultWardrobe === true || existing?.defaultWardrobe) : undefined,
        currentWardrobe: layer === 'wardrobe' ? Boolean(raw.currentWardrobe === true || existing?.currentWardrobe) : undefined,
        chatId: layer === 'current-appearance' ? clean(raw.chatId) || existing?.chatId : undefined,
        sourceMessageId: layer === 'current-appearance' ? clean(raw.sourceMessageId) || existing?.sourceMessageId : undefined,
        sourceSwipeId: layer === 'current-appearance' ? optionalFinite(raw.sourceSwipeId) ?? existing?.sourceSwipeId : undefined,
        active: layer === 'current-appearance' ? raw.active !== false : undefined,
        expiryPolicy: layer === 'current-appearance' && isExpiry(clean(raw.expiryPolicy)) ? clean(raw.expiryPolicy) as AppearanceVaultFact['expiryPolicy'] : layer === 'current-appearance' ? existing?.expiryPolicy || 'superseded' : undefined,
        expiresAt: layer === 'current-appearance' ? finite(raw.expiresAt) || existing?.expiresAt : undefined,
        supersededByFactId: clean(raw.supersededByFactId) || existing?.supersededByFactId,
        lastUsedAt: Math.max(existing?.lastUsedAt || 0, finite(raw.lastUsedAt) || 0) || undefined,
      }
    }
  }
  return out
}

function normalizeSuggestions(value: unknown): Record<string, AppearanceSuggestion> {
  const out: Record<string, AppearanceSuggestion> = {}
  for (const [id, payload] of Object.entries(asRecord(value))) {
    const raw = asRecord(payload)
    const proposedValue = clean(raw.proposedValue)
    const proposedCategory = clean(raw.proposedCategory)
    const recommendedLayer = clean(raw.recommendedLayer)
    if (!proposedValue || !isCategory(proposedCategory) || !isLayer(recommendedLayer)) continue
    const suggestionId = clean(raw.suggestionId) || id
    out[suggestionId] = {
      suggestionId,
      resolvedCharacterId: clean(raw.resolvedCharacterId) || undefined,
      resolvedCharacterName: clean(raw.resolvedCharacterName) || undefined,
      unresolvedSubject: clean(raw.unresolvedSubject) || undefined,
      proposedValue,
      proposedCategory: proposedCategory as AppearanceFactCategory,
      recommendedLayer: recommendedLayer as AppearanceVaultLayer,
      sourceType: isSourceType(clean(raw.sourceType)) ? clean(raw.sourceType) as AppearanceSourceType : 'inferred',
      sourceReference: normalizeSourceReference(raw.sourceReference, raw.sourceType),
      confidence: clamp(Number(raw.confidence) || 0.5, 0, 1),
      reason: clean(raw.reason),
      sourceSentence: clean(raw.sourceSentence) || undefined,
      status: ['pending', 'accepted', 'rejected', 'quarantined'].includes(clean(raw.status)) ? clean(raw.status) as AppearanceSuggestion['status'] : 'pending',
      createdAt: finite(raw.createdAt) || Date.now(),
      updatedAt: finite(raw.updatedAt) || Date.now(),
    }
  }
  return out
}

function normalizeQuarantine(value: unknown): Record<string, AppearanceQuarantineItem> {
  const out: Record<string, AppearanceQuarantineItem> = {}
  for (const [id, payload] of Object.entries(asRecord(value))) {
    const raw = asRecord(payload)
    const rowValue = clean(raw.value)
    if (!rowValue) continue
    const quarantineId = clean(raw.quarantineId) || id
    out[quarantineId] = {
      quarantineId,
      legacyFactId: clean(raw.legacyFactId) || undefined,
      unresolvedSubject: clean(raw.unresolvedSubject) || undefined,
      value: rowValue,
      reason: clean(raw.reason),
      sourceReference: normalizeSourceReference(raw.sourceReference, asRecord(raw.sourceReference).sourceType),
      recommendedLayer: isLayer(clean(raw.recommendedLayer)) ? clean(raw.recommendedLayer) as AppearanceVaultLayer : undefined,
      recommendedCharacterId: clean(raw.recommendedCharacterId) || undefined,
      createdAt: finite(raw.createdAt) || Date.now(),
      updatedAt: finite(raw.updatedAt) || Date.now(),
    }
  }
  return out
}

function normalizeMigrationPreview(value: unknown): VaultMigrationPreview | null {
  const raw = asRecord(value)
  if (!Array.isArray(raw.items)) return null
  const items = raw.items.map(item => {
    const row = asRecord(item)
    const disposition = clean(row.disposition)
    if (!isDisposition(disposition)) return null
    return {
      migrationItemId: clean(row.migrationItemId) || `migration-${hash(JSON.stringify(row))}`,
      legacyFactId: clean(row.legacyFactId) || undefined,
      legacyEntityName: clean(row.legacyEntityName),
      legacyEntityType: clean(row.legacyEntityType),
      legacyValue: clean(row.legacyValue),
      disposition: disposition as VaultMigrationDisposition,
      reason: clean(row.reason),
      resolvedCharacterId: clean(row.resolvedCharacterId) || undefined,
      resolvedCharacterName: clean(row.resolvedCharacterName) || undefined,
      proposedCategory: isCategory(clean(row.proposedCategory)) ? clean(row.proposedCategory) as AppearanceFactCategory : undefined,
      duplicateOfFactId: clean(row.duplicateOfFactId) || undefined,
      pinned: row.pinned === true,
      selected: row.selected !== false,
      legacyPayload: asRecord(row.legacyPayload),
    } satisfies VaultMigrationItem
  }).filter(Boolean) as VaultMigrationItem[]
  return {
    previewId: clean(raw.previewId) || `vault-clean-${hash(JSON.stringify(items))}`,
    sourceSchemaVersion: finite(raw.sourceSchemaVersion) || 1,
    createdAt: finite(raw.createdAt) || Date.now(),
    appliedAt: finite(raw.appliedAt) || undefined,
    items,
    counts: migrationCounts(items),
  }
}

function normalizeHistory(value: unknown): AppearanceHistoryEntry | null {
  const raw = asRecord(value)
  const action = clean(raw.action)
  if (!action) return null
  return {
    historyId: clean(raw.historyId) || `history-${hash(JSON.stringify(raw))}`,
    action,
    characterId: clean(raw.characterId) || undefined,
    factId: clean(raw.factId) || undefined,
    suggestionId: clean(raw.suggestionId) || undefined,
    sourceReference: raw.sourceReference ? normalizeSourceReference(raw.sourceReference, asRecord(raw.sourceReference).sourceType) : undefined,
    details: asRecord(raw.details),
    createdAt: finite(raw.createdAt) || Date.now(),
  }
}

function normalizeSourceReference(value: unknown, fallbackType: unknown): AppearanceSourceReference {
  const raw = asRecord(value)
  const sourceType = isSourceType(clean(raw.sourceType || fallbackType)) ? clean(raw.sourceType || fallbackType) as AppearanceSourceType : 'inferred'
  return {
    sourceType,
    sourceReference: clean(raw.sourceReference) || undefined,
    chatId: clean(raw.chatId) || undefined,
    messageId: clean(raw.messageId) || undefined,
    swipeId: optionalFinite(raw.swipeId),
    requestId: clean(raw.requestId) || undefined,
    slot: clean(raw.slot) || undefined,
    assetId: clean(raw.assetId) || undefined,
    versionId: clean(raw.versionId) || undefined,
    promptHash: clean(raw.promptHash) || undefined,
  }
}

function legacySourceReference(payload: unknown): AppearanceSourceReference {
  const raw = asRecord(payload)
  const provenance = asRecord(raw.sourceProvenance)
  return {
    sourceType: 'migration',
    sourceReference: clean(provenance.source) || 'legacy-continuity-vault',
    chatId: clean(provenance.chatId || raw.chatId) || undefined,
    messageId: clean(provenance.messageId) || undefined,
    swipeId: optionalFinite(provenance.swipeId),
    requestId: clean(provenance.requestId) || undefined,
    slot: clean(provenance.slot) || undefined,
    assetId: clean(provenance.assetId) || undefined,
    versionId: clean(provenance.versionId) || undefined,
  }
}

function layerMap(vault: ContinuityVaultState, layer: AppearanceVaultLayer): Record<string, AppearanceVaultFact> {
  if (layer === 'visual-identity') return vault.visualIdentity
  if (layer === 'wardrobe') return vault.wardrobe
  return vault.currentAppearance
}

function supersedeAppearanceConflicts(vault: ContinuityVaultState, layer: AppearanceVaultLayer, characterId: string, replacementId: string, now: number): void {
  const map = layerMap(vault, layer)
  const replacement = map[replacementId]
  if (!replacement) return
  const group = conflictCategory(replacement.category, replacement.value, replacement.conflictDomain)
  const competing = Object.values(map).filter(fact => fact.canonicalCharacterId === characterId && fact.status === 'active' && conflictCategory(fact.category, fact.value, fact.conflictDomain) === group)
  if (competing.length < 2) return
  // A newly ingested equally-ranked Sidecar observation is the later semantic
  // statement for that domain, even when mocked/fast clocks share a millisecond.
  const winner = [...competing].sort((left, right) => compareFacts(left, right)
    || Number(right.factId === replacementId) - Number(left.factId === replacementId))[0]
  for (const fact of competing) {
    if (fact.factId === winner.factId) continue
    fact.status = 'superseded'
    if (fact.layer === 'current-appearance') fact.active = false
    if (fact.layer === 'wardrobe' && fact.currentWardrobe) fact.currentWardrobe = false
    fact.supersededByFactId = winner.factId
    fact.updatedAt = now
  }
}

function supersedeCurrentWardrobe(vault: ContinuityVaultState, characterId: string, replacementId: string, now: number, replacementIsUserConfirmed = false): void {
  for (const fact of Object.values(vault.wardrobe)) {
    if (fact.factId === replacementId || fact.canonicalCharacterId !== characterId || !fact.currentWardrobe || fact.status !== 'active') continue
    if (fact.userConfirmed && !replacementIsUserConfirmed) continue
    fact.status = 'superseded'
    fact.currentWardrobe = false
    fact.supersededByFactId = replacementId
    fact.updatedAt = now
  }
}

function supersedeCurrentWardrobeSet(vault: ContinuityVaultState, characterId: string, replacementIds: Set<string>, now: number, replacementIsUserConfirmed = false): void {
  const replacementId = [...replacementIds][0]
  if (!replacementId) return
  for (const fact of Object.values(vault.wardrobe)) {
    if (replacementIds.has(fact.factId) || fact.canonicalCharacterId !== characterId || !fact.currentWardrobe || fact.status !== 'active') continue
    if (fact.userConfirmed && !replacementIsUserConfirmed) continue
    fact.status = 'superseded'
    fact.currentWardrobe = false
    fact.supersededByFactId = replacementId
    fact.updatedAt = now
  }
}

function canonicalizeResolvedAppearanceState(vault: ContinuityVaultState, now = Date.now()): void {
  const stableGroups = new Map<string, AppearanceVaultFact[]>()
  for (const fact of Object.values(vault.visualIdentity)) {
    if (fact.status !== 'active') continue
    const key = `${fact.canonicalCharacterId}:${normalizeValue(fact.value)}`
    const rows = stableGroups.get(key) || []
    rows.push(fact)
    stableGroups.set(key, rows)
  }
  for (const facts of stableGroups.values()) {
    if (facts.length < 2) continue
    const winner = [...facts].sort(compareFacts)[0]
    for (const fact of facts) {
      if (fact.factId === winner.factId) continue
      winner.referenceAssetIds = unique([...winner.referenceAssetIds, ...fact.referenceAssetIds])
      winner.pinned ||= fact.pinned
      winner.userConfirmed ||= fact.userConfirmed
      winner.confidence = Math.max(winner.confidence, fact.confidence)
      winner.notes ||= fact.notes
      fact.status = 'superseded'
      fact.supersededByFactId = winner.factId
      fact.updatedAt = now
    }
  }

  for (const fact of Object.values(vault.currentAppearance)) {
    if (fact.status !== 'active' || fact.active === false) continue
    if (!isSceneActionOnlyAppearanceValue(fact.value, fact.category)) continue
    fact.status = 'inactive'
    fact.active = false
    fact.updatedAt = now
  }

  const currentGroups = new Map<string, AppearanceVaultFact[]>()
  for (const fact of Object.values(vault.currentAppearance)) {
    if (fact.status !== 'active' || fact.active === false) continue
    const key = `${fact.canonicalCharacterId}:${currentAppearanceDomain(fact)}`
    const rows = currentGroups.get(key) || []
    rows.push(fact)
    currentGroups.set(key, rows)
  }
  for (const facts of currentGroups.values()) {
    if (facts.length < 2) continue
    const winner = [...facts].sort((left, right) => right.updatedAt - left.updatedAt || compareFacts(left, right))[0]
    for (const fact of facts) {
      if (fact.factId === winner.factId) continue
      fact.status = 'superseded'
      fact.active = false
      fact.supersededByFactId = winner.factId
      fact.updatedAt = now
    }
  }
}

function appearanceOverrideDomains(value: string, category?: AppearanceFactCategory): string[] {
  const text = clean(value).replace(/_/g, ' ')
  const domains = new Set<string>()
  if (category === 'eye-color' || EYE_COLOR_RE.test(text)) domains.add('eye-color')
  if (category === 'hair-color' || HAIR_COLOR_RE.test(text) || /\bhair\s+(?:dyed\s+)?(?:black|brown|blonde|blond|white|silver|red|auburn|pink|blue|green|purple|brunette)\b/i.test(text)) domains.add('hair-color')
  if (category === 'hair-length' || HAIR_LENGTH_RE.test(text)) domains.add('hair-shape')
  if (category === 'hair-texture' || HAIR_TEXTURE_RE.test(text)) domains.add('hair-shape')
  if (category === 'hairstyle' || category === 'temporary-hair' || /(?:hairstyle|haircut|bangs|ponytail|bun|braid)/i.test(text)) domains.add('hair-shape')
  if (category === 'current-outfit' || category === 'base-attire' || category === 'saved-outfit' || category === 'uniform' || category === 'work-attire' || CLOTHING_RE.test(text)) domains.add('outfit')
  return [...domains]
}

function conflictCategory(category: AppearanceFactCategory, value = '', conflictDomain?: string): string {
  if (['temporary-hair', 'temporary-makeup', 'temporary-injury', 'temporary-clothing-state', 'temporary-accessory', 'temporary-expression'].includes(category)) {
    return currentAppearanceDomain({ category, value, conflictDomain })
  }
  if (isValidConflictDomain(clean(conflictDomain))) return `sidecar:${clean(conflictDomain)}`
  if (['hair-color'].includes(category)) return 'hair-color'
  if (['hair-length', 'hairstyle'].includes(category)) return 'hair-shape'
  if (category === 'eye-color') return 'eye-color'
  if (category === 'current-outfit') return `outfit:${normalizeValue(value) || 'current'}`
  if (['base-attire', 'saved-outfit', 'uniform', 'work-attire'].includes(category)) return 'outfit'
  return category === 'other' ? `other:${normalizeValue(value) || 'generic'}` : category
}

function isValidConflictDomain(value: string): boolean {
  return /^[a-z][a-z0-9-]{0,47}(?::[a-z][a-z0-9-]{0,47})?$/.test(value) && value.length <= 96
}

function stableCategory(text: string): AppearanceFactCategory {
  if (EYE_COLOR_RE.test(text)) return 'eye-color'
  if (HAIR_COLOR_RE.test(text)) return 'hair-color'
  if (HAIR_LENGTH_RE.test(text)) return 'hair-length'
  if (HAIR_TEXTURE_RE.test(text)) return 'hair-texture'
  if (/face shape|jawline|round-faced|sharp-featured/i.test(text)) return 'face-shape'
  if (/height|\btall\b|\bshort\b/i.test(text)) return 'height'
  if (/body build|\bslim\b|\blean\b|\bstocky\b|\bbroad\b|\bpetite\b/i.test(text)) return 'body-build'
  if (/tattoo/i.test(text)) return 'tattoo'
  if (/birthmark/i.test(text)) return 'birthmark'
  if (/\bmole\b/i.test(text)) return 'mole'
  if (/prosthetic/i.test(text)) return 'prosthetic'
  if (/scar/i.test(text)) return 'scar'
  if (PERMANENT_MARK_RE.test(text)) return 'permanent-mark'
  return 'other'
}

function wardrobeCategory(text: string): AppearanceFactCategory {
  if (/uniform/i.test(text)) return 'uniform'
  if (/work attire/i.test(text)) return 'work-attire'
  if (/signature|always wears|earrings?|necklace|bracelet|glasses|hat|scarf/i.test(text)) return 'signature-accessory'
  if (/current|wearing|dressed|clad/i.test(text)) return 'current-outfit'
  if (/default|base outfit/i.test(text)) return 'base-attire'
  return 'saved-outfit'
}

function temporaryCategory(text: string): AppearanceFactCategory {
  if (/bruise|blood|bandage|injur|swollen|scratch|cut lip/i.test(text)) return 'temporary-injury'
  if (/wet hair|dishevel|temporary hairstyle|hair/i.test(text)) return 'temporary-hair'
  if (/makeup|smudged/i.test(text)) return 'temporary-makeup'
  if (/clothing|torn|damaged|muddy outfit/i.test(text)) return 'temporary-clothing-state'
  if (/accessor/i.test(text)) return 'temporary-accessory'
  return 'temporary-expression'
}

function dispositionLayer(disposition: VaultMigrationDisposition, category?: AppearanceFactCategory): AppearanceVaultLayer | undefined {
  if (disposition === 'keep-visual-identity') return 'visual-identity'
  if (disposition === 'move-wardrobe') return 'wardrobe'
  if (disposition === 'move-current-appearance') return 'current-appearance'
  if (disposition === 'merge') return categoryLayer(category)
  return undefined
}

function categoryLayer(category?: AppearanceFactCategory): AppearanceVaultLayer | undefined {
  if (!category) return undefined
  if (['base-attire', 'saved-outfit', 'current-outfit', 'signature-accessory', 'uniform', 'work-attire'].includes(category)) return 'wardrobe'
  if (['temporary-expression', 'temporary-injury', 'temporary-hair', 'temporary-makeup', 'temporary-clothing-state', 'temporary-accessory'].includes(category)) return 'current-appearance'
  return 'visual-identity'
}

function migrationCounts(items: VaultMigrationItem[]): Record<VaultMigrationDisposition, number> {
  const counts: Record<VaultMigrationDisposition, number> = {
    'keep-visual-identity': 0,
    'move-wardrobe': 0,
    'move-current-appearance': 0,
    merge: 0,
    quarantine: 0,
    remove: 0,
  }
  for (const item of items) counts[item.disposition] += 1
  return counts
}

function compareFacts(a: AppearanceVaultFact, b: AppearanceVaultFact): number {
  const directIdentity = (fact: AppearanceVaultFact) => fact.layer === 'visual-identity' && /character-card|persona-card|lorebook/.test(fact.sourceReference.sourceReference || '') ? 1 : 0
  return Number(b.userConfirmed) - Number(a.userConfirmed)
    || Number(b.pinned) - Number(a.pinned)
    || directIdentity(b) - directIdentity(a)
    || b.confidence - a.confidence
    || b.updatedAt - a.updatedAt
}

function compareFactPriority(a: AppearanceVaultFact, b: AppearanceVaultFact): number {
  const layerPriority = (fact: AppearanceVaultFact) => fact.layer === 'current-appearance'
    ? (fact.category === 'current-outfit' ? 2.25 : 3)
    : fact.layer === 'wardrobe' ? (fact.currentWardrobe ? 2.75 : fact.defaultWardrobe ? 1 : 2) : 1.5
  return layerPriority(b) - layerPriority(a) || compareFacts(a, b)
}

function appendHistory(
  vault: ContinuityVaultState,
  action: string,
  input: Partial<Omit<AppearanceHistoryEntry, 'historyId' | 'action' | 'createdAt'>>,
  now: number,
): void {
  vault.history.push({
    historyId: `history-${hash(`${action}:${now}:${vault.history.length}`)}`,
    action,
    characterId: input.characterId,
    factId: input.factId,
    suggestionId: input.suggestionId,
    sourceReference: input.sourceReference,
    details: input.details,
    createdAt: now,
  })
  if (vault.history.length > 500) vault.history.splice(0, vault.history.length - 500)
}

function aliasForms(value: string): string[] {
  const name = clean(value)
  if (!name) return []
  const withoutVocative = name.replace(/[-–—](?:ya|ah)$/i, '').replace(/(?:야|아)$/u, '').trim()
  const words = withoutVocative.split(/\s+/).filter(Boolean)
  const forms = [normalizeAlias(name), normalizeAlias(withoutVocative)]
  if (words.length >= 2) forms.push(normalizeAlias(words[words.length - 1]))
  return unique(forms.filter(Boolean))
}

function normalizeAlias(value: string): string {
  return clean(value).toLocaleLowerCase().replace(/[’'`]/g, '').replace(/[-–—](?:ya|ah)$/i, '').replace(/(?:야|아)$/u, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
}

function normalizeValue(value: string): string {
  return clean(value).toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
}

function hash(value: string): string {
  let h1 = 0x811c9dc5
  for (let index = 0; index < value.length; index += 1) {
    h1 ^= value.charCodeAt(index)
    h1 = Math.imul(h1, 0x01000193)
  }
  return (h1 >>> 0).toString(36).padStart(7, '0')
}

function asRecord(value: unknown): Record<string, any> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, any> : {}
}

function clean(value: unknown): string {
  return typeof value === 'string' || typeof value === 'number' ? String(value).trim().replace(/\s+/g, ' ') : ''
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.map(clean).filter(Boolean)
}

function stringRecord(value: unknown): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [key, row] of Object.entries(asRecord(value))) {
    const text = clean(row)
    if (text) out[key] = text
  }
  return out
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)]
}

function finite(value: unknown): number {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

function optionalFinite(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') return undefined
  const number = Number(value)
  return Number.isFinite(number) ? number : undefined
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Number.isFinite(value) ? value : min))
}

function isStrength(value: string): value is ContinuityStrength {
  return ['off', 'low', 'medium', 'strong'].includes(value)
}

function isLayer(value: string): value is AppearanceVaultLayer {
  return ['visual-identity', 'wardrobe', 'current-appearance'].includes(value)
}

function isStatus(value: string): boolean {
  return ['active', 'inactive', 'superseded', 'quarantined', 'rejected'].includes(value)
}

function isExpiry(value: string): boolean {
  return ['chat', 'scene', 'superseded', 'manual', 'timestamp'].includes(value)
}

function isSourceType(value: string): value is AppearanceSourceType {
  return ['manual', 'character-card', 'persona-card', 'native-visual-preset', 'appearance-sidecar', 'user-confirmed-analysis', 'accepted-image', 'generated-prompt', 'inferred', 'migration'].includes(value)
}

function isCategory(value: string): value is AppearanceFactCategory {
  return [
    'hair-color', 'hair-length', 'hair-texture', 'hairstyle', 'eye-color', 'face-shape', 'body-build', 'height',
    'scar', 'tattoo', 'birthmark', 'mole', 'prosthetic', 'permanent-mark', 'base-attire', 'saved-outfit',
    'current-outfit', 'signature-accessory', 'uniform', 'work-attire', 'temporary-expression', 'temporary-injury',
    'temporary-hair', 'temporary-makeup', 'temporary-clothing-state', 'temporary-accessory', 'other',
  ].includes(value)
}

/** Structural layer/category validation; it intentionally makes no judgment about prose. */
export function isCategoryAllowedForLayer(layer: AppearanceVaultLayer, category: AppearanceFactCategory): boolean {
  if (category === 'other') return true
  if (['base-attire', 'saved-outfit', 'current-outfit', 'signature-accessory', 'uniform', 'work-attire'].includes(category)) return layer === 'wardrobe'
  if (['temporary-expression', 'temporary-injury', 'temporary-hair', 'temporary-makeup', 'temporary-clothing-state', 'temporary-accessory'].includes(category)) return layer === 'current-appearance'
  return layer === 'visual-identity'
}

function isDisposition(value: string): value is VaultMigrationDisposition {
  return ['keep-visual-identity', 'move-wardrobe', 'move-current-appearance', 'merge', 'quarantine', 'remove'].includes(value)
}
