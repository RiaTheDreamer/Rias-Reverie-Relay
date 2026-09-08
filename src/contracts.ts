export type ImageTarget =
  | 'twitter.media'
  | 'instagram.single'
  | 'instagram.carousel'
  | 'smartphone.message-image'
  | 'kakao.image'
  | 'prose.illustration'
  | `custom.${string}`

export type ImageIntent =
  | 'auto'
  | 'photo'
  | 'selfie'
  | 'candid'
  | 'evidence'
  | 'screenshot'
  | 'meme'
  | 'reaction'
  | 'funny_edit'
  | 'shitpost'
  | 'cursed'
  | 'viral_graphic'
  | 'fandom_edit'

export const NORMAL_IMAGE_INTENTS = new Set<ImageIntent>([
  'auto', 'photo', 'selfie', 'candid', 'evidence', 'screenshot',
])

export const SPECIAL_IMAGE_INTENTS = new Set<ImageIntent>([
  'meme', 'reaction', 'funny_edit', 'shitpost', 'cursed', 'viral_graphic', 'fandom_edit',
])

export function normalizeImageIntent(value: unknown): ImageIntent {
  const normalized = String(value || '').trim().toLocaleLowerCase().replace(/[\s-]+/g, '_')
  return NORMAL_IMAGE_INTENTS.has(normalized as ImageIntent) || SPECIAL_IMAGE_INTENTS.has(normalized as ImageIntent)
    ? normalized as ImageIntent
    : 'auto'
}

export function isSpecialImageIntent(value: unknown): value is ImageIntent {
  return SPECIAL_IMAGE_INTENTS.has(normalizeImageIntent(value))
}

export type SlotGenerationMode = 'auto-insert' | 'prompt-preview' | 'image-preview'


export type RelayExperienceMode = 'beginner' | 'expert'

export type GenerationRecipeScope = 'relay' | 'both'

export type GenerationLoraEntry = {
  id: string
  lora_name: string
  displayName: string
  weight_model: number
  weight_clip: number
  triggerWords: string[]
  previewUrl?: string
  source?: string
  metadata?: Record<string, unknown>
}

export type ImageProviderParameterSchema = {
  type: 'number' | 'integer' | 'boolean' | 'string' | 'select' | 'image_array'
  default?: unknown
  min?: number
  max?: number
  step?: number
  description?: string
  required?: boolean
  options?: Array<{ id: string; label: string }>
  group?: string
  modelSubtype?: string
}

export type ImageProviderInfo = {
  id: string
  name: string
  capabilities?: {
    parameters?: Record<string, ImageProviderParameterSchema>
    apiKeyRequired?: boolean
    modelListStyle?: string
    staticModels?: Array<{ id: string; label: string }>
    defaultUrl?: string
  }
}

export type GenerationRecipe = {
  id: string
  name: string
  description: string
  scope: GenerationRecipeScope
  connectionId: string | null
  model: string
  loraStack: GenerationLoraEntry[]
  positivePrompt: string
  negativePrompt: string
  promptSnippetIds: string[]
  aspectRatio: string
  width?: number
  height?: number
  promptProfileId: PromptProfileId
  parameterOverrides: Record<string, unknown>
  createdAt: number
  updatedAt: number
}

export type BackgroundQueueStage =
  | 'queued'
  | 'analyzing'
  | 'composing-prompt'
  | 'waiting-for-provider'
  | 'generating'
  | 'saving-preview'
  | 'saving-gallery'
  | 'placing'
  | 'completed'
  | 'failed'
  | 'cancelled'

export type BackgroundQueueItem = {
  id: string
  chatId: string
  source: 'relay-slot' | 'relay-candidate' | 'relay-illustrator' | 'analysis' | 'gallery-link' | 'unknown'
  label: string
  stage: BackgroundQueueStage
  statusText: string
  current: number
  total: number
  etaSeconds: number | null
  createdAt: number
  startedAt?: number
  updatedAt: number
  completedAt?: number
  error?: string
  slotKey?: string
  requestId?: string
  planId?: string
}

export type BackgroundQueueState = {
  items: Record<string, BackgroundQueueItem>
  abortRequestedAt: number
  updatedAt: number
}

export type GalleryLinkStatus = 'pending' | 'linked' | 'failed' | 'skipped'

export type GalleryLinkRequest = {
  id: string
  chatId: string
  characterId: string
  imageId: string
  imageUrl: string
  caption: string
  source: 'relay-slot' | 'relay-illustrator'
  slotKey?: string
  status: GalleryLinkStatus
  attempts: number
  createdAt: number
  updatedAt: number
  galleryItemId?: string
  error?: string
}

export type DryRunReport = {
  id: string
  kind: 'slot' | 'prose-plan'
  generatedAt: number
  chatId: string | null
  title: string
  origin: string
  prompt: string
  negativePrompt: string
  subjects: string[]
  peoplePolicy: string
  vaultFacts: Array<{ character: string; layer: string; value: string }>
  connectionId: string | null
  connectionName: string
  provider: string
  model: string
  loras: Array<{ name: string; weightModel: number; weightClip?: number }>
  aspectRatio: string
  width: number | null
  height: number | null
  anchor: Record<string, unknown> | null
  galleryDestination: string
  warnings: string[]
  finalParameters: Record<string, unknown>
  finalRequestPreview: Record<string, unknown>
}

export type GenerationBlocker = {
  code: string
  title: string
  detail: string
  severity: 'info' | 'warning' | 'error'
  action?: string
}


export type SlotStatus =
  | 'recovered-pending'
  | 'preparing'
  | 'queued'
  | 'parsing'
  | 'generating'
  | 'previewing'
  | 'placement-pending'
  | 'placement-repair-needed'
  | 'completed'
  | 'image-unavailable'
  | 'failed'
  | 'cancelled'

export type TriggerType = 'initial' | 'retry' | 'regenerate-same-settings' | 'regenerate-current-settings' | 'reparse' | 'edited-prompt' | 'restore' | 'intent-regeneration'

export type PromptProfileId =
  | 'auto'
  | 'character-portrait'
  | 'selfie'
  | 'social-candid'
  | 'object-prop'
  | 'environment-location'
  | 'evidence-surveillance'
  | 'high-resolution-modifier'
  | string

export type PromptPresetProfile = {
  id: PromptProfileId
  name: string
  builtIn: boolean
  promptAdditions: string
  negativeAdditions: string
  contextPolicy: 'auto' | 'character' | 'persona' | 'suppress-character' | 'minimal'
  framingGuidance: string
  characterContextPolicy: 'auto' | 'preserve' | 'suppress-unless-explicit'
  continuityStrength: 'low' | 'medium' | 'high'
  defaultAspectBehavior: 'native' | 'request' | 'square' | 'portrait' | 'landscape'
  promptCleanupRules: string[]
  compatibleTargets: ImageTarget[]
  optionalNativePresetReference?: string | null
}

export type GenerationProfile = {
  chatId?: string
  defaultPromptProfileId: PromptProfileId
  preferredNativePresetId?: string | null
  preferredImageConnectionId?: string | null
  preferredImageModel?: string
  defaultCandidateCount: 1 | 2 | 4
  automationEnabled?: boolean
  continuityStrength: 'low' | 'medium' | 'high'
  preferredSocialImageBehavior: 'native' | 'polished' | 'candid' | 'evidence'
  suppressPeopleForObjects: boolean
  defaultNegativeAdditions: string
  defaultAspectPreference: 'native' | 'request' | 'square' | 'portrait' | 'landscape'
}

export type RegenerationIntentId =
  | 'new-angle'
  | 'wider-shot'
  | 'closer-shot'
  | 'better-expression'
  | 'preserve-character-change-pose'
  | 'preserve-pose-improve-quality'
  | 'preserve-composition-improve-quality'
  | 'more-candid'
  | 'stronger-social-media-feel'
  | 'full-reimagining'
  | 'custom'

export type RegenerationIntent = {
  id: RegenerationIntentId
  label: string
  promptDelta: string
  negativeDelta: string
  customText?: string
  /** Optional replacement aspect requested for this regeneration only. */
  aspectRatio?: '1:1' | '2:3' | '3:2' | '3:4' | '4:3' | '4:5' | '5:4' | '9:16' | '16:9'
}

export type PromptProfileDecision = {
  requestedProfileId: PromptProfileId
  selectedProfileId: PromptProfileId
  selectedProfileName: string
  automaticClassification: string
  reason: string
  framingGuidance: string
  promptAdditions: string
  negativeAdditions: string
  removedPositiveFragments: Array<{ fragment: string; reason: string }>
  suppressedContext: Array<{ source: string; reason: string }>
}

export type QueueJobStatus = 'queued' | 'running' | 'paused' | 'cancelled' | 'skipped' | 'finished'

export type QueueDirectorState = {
  pausedAfterCurrent: boolean
  concurrencyLimit: number
  selectedKeys: string[]
  jobStatuses: Record<string, QueueJobStatus>
}

export type ProseIllustratorMode = 'off' | 'relay-planned' | 'model-placed' | 'inline-protocol'
export type ProseIllustratorFrequencyMode = 'key-moments' | 'every-eligible' | 'every-n'
export type ProseIllustratorPlacementPolicy = 'after-beat' | 'before-beat' | 'end-of-message' | 'ask'
export type ProseIllustratorInsertionMode = 'auto' | 'review'
export type ProseIllustratorPeoplePolicy = 'required' | 'allowed' | 'forbidden'
export type ProseIllustratorPerspectiveMode = 'scene-snapshot' | 'sequence' | 'emotional-beat' | 'solo-scene' | 'persona-pov'
export type ProseIllustratorAspectPolicy = 'adaptive' | '1:1' | '2:3' | '3:2' | '3:4' | '4:3' | '4:5' | '5:4' | '9:16' | '16:9'

export type PersonaPovContext = {
  available: boolean
  personaId?: string
  personaName?: string
  binding: 'chat-persona' | 'active-persona' | 'unavailable'
}

export type PromptRegistryCategory = 'story-model' | 'image-interpretation' | 'sidecars'

export type PromptRegistryDefinition = {
  id: string
  displayName: string
  description: string
  category: PromptRegistryCategory
  defaultTemplate: string
  version: number
  status?: 'stable' | 'provisional'
  requiredTokens?: string[]
}
export type ProseImageAlignment = 'left' | 'center' | 'right'
export type ProseImageSize = 'small' | 'medium' | 'large' | 'full'

export type ProseOpportunityStatus =
  | 'analyzing'
  | 'proposed'
  | 'selected'
  | 'dismissed'
  | 'stale'
  | 'superseded'
  | 'generated'
  | 'failed-analysis'
export type ProseIllustratorRecordStatus =
  | 'planned'
  | 'approval-required'
  | 'queued'
  | 'generating'
  | 'completed'
  | 'ready-to-place'
  | 'failed'
  | 'cancelled'
  | 'removed'

export type ProseIllustratorSettings = {
  enabled: boolean
  automaticProtocolInjection: boolean
  mode: ProseIllustratorMode
  plannerConnectionId: string | null
  plannerModel: string
  plannerParameters: Record<string, unknown>
  contextMessageCount: number
  maximumCharacters: number
  frequencyMode: ProseIllustratorFrequencyMode
  everyNEligibleMessages: number
  maximumOpportunitiesPerMessage: number
  maximumIllustrationsPerMessage: number
  illustrationsPerRun: number
  minimumImages: number
  maximumImages: number
  /** Fixed requests use illustrationsPerRun; range requests use min/max. */
  modelPlacedCountMode: 'fixed' | 'range'
  perspectiveMode: ProseIllustratorPerspectiveMode
  imageAlignment: ProseImageAlignment
  imageSize: ProseImageSize
  adaptiveMode: boolean
  defaultPromptProfileId: PromptProfileId
  defaultAspectRatio: string
  promptRegistry: Record<string, string>
  promptRegistryVersions: Record<string, number>
  appearanceMemoryEnabled: boolean
  /** Actual Sidecar routing is separate from Appearance Memory strength. */
  useGlobalAppearanceSidecar: boolean
  appearanceSidecarConnectionId: string | null
  appearanceSidecarModel: string
  appearanceSidecarParameters: Record<string, unknown>
  customPromptPrefix: string
  customNegativePrefix: string
  stripGenericStyleBoilerplate: boolean
  defaultCandidateCount: 1 | 2 | 4
  continuityStrength: ContinuityStrength
  appearanceMemoryOverride: 'global' | ContinuityStrength
  reuseAcceptedReferences: boolean
  reuseLocationReferences: boolean
  placementPolicy: ProseIllustratorPlacementPolicy
  relayInsertionMode: ProseIllustratorInsertionMode
  showCaptions: boolean
  autoGenerateRequiresApproval: boolean
  immediateDispatchOnOpportunitySelection: boolean
  reanalyzeEditedMessages: boolean
  skipOoc: boolean
  skipUtilities: boolean
  skipShortMessages: boolean
  skipContinuation: boolean
  skipImpersonation: boolean
  skipTestFixtures: boolean
  minimumMessageLength: number
  highResolutionModifier: boolean
  characterOnlySubjects: string
  modelPlacedProtocolOverride: string
  relayPlannedProtocolOverride: string
  characterOnlyFramingPrompt: string
  sceneLedFramingPrompt: string
  continuityFramePrompt: string
  expressiveFramePrompt: string
  paused: boolean
}

export type ProseIllustrationAnchor = {
  messageId: string
  swipeId: number
  paragraphIndex: number
  paragraphFingerprint: string
  previousParagraphFingerprint?: string
  nextParagraphFingerprint?: string
  insertionSide: 'before' | 'after' | 'end'
  sourceContentFingerprint: string
  selectedExcerpt: string
}

export type ProseIllustrationOpportunity = {
  opportunityId: string
  chatId: string
  messageId: string
  swipeId: number
  sourceContentFingerprint: string
  settingsFingerprint: string
  plannerVersion: string
  status: ProseOpportunityStatus
  title: string
  reason: string
  sceneSummary: string
  selectedExcerpt: string
  paragraphIndex: number
  insertionSide: ProseIllustrationAnchor['insertionSide']
  composition: string
  peoplePolicy: ProseIllustratorPeoplePolicy
  expectedPeopleCount: number
  namedSubjects: string[]
  omittedSubjects: string[]
  backgroundPeople: string
  location: string
  timeOfDay: string
  mood: string
  importantProps: string[]
  recommendedProfileId: PromptProfileId
  recommendedAspectRatio: string
  visualPlan?: Record<string, unknown>
  continuityFactIds: string[]
  referenceAssetIds: string[]
  locationReferenceAssetIds: string[]
  confidence: number
  sidecarConnectionId: string | null
  sidecarModel: string
  sidecarOutput?: Record<string, unknown>
  contextSummary?: Record<string, unknown>
  dismissedAt?: number
  selectedAt?: number
  staleAt?: number
  createdAt: number
  updatedAt: number
  warning?: string
}

export type ProsePromptComposition = {
  composerConnectionId: string | null
  composerModel: string
  composedAt: number
  sceneBrief: string
  positivePrompt: string
  negativePrompt: string
  framing: string
  perspectiveMode?: ProseIllustratorPerspectiveMode
  peoplePolicy: ProseIllustratorPeoplePolicy
  expectedPeopleCount: number
  namedSubjects: string[]
  omittedSubjects: string[]
  backgroundPeople: string
  location: string
  importantProps: string[]
  continuityFactIdsUsed: string[]
  referenceAssetIdsUsed: string[]
  locationReferenceAssetIdsUsed: string[]
  highResolutionModifier: boolean
  candidateCount: 1 | 2 | 4
  imageAlignment: ProseImageAlignment
  imageSize: ProseImageSize
  warnings: string[]
  rawOutput?: Record<string, unknown>
}

export type ProseIllustrationPlan = {
  planId: string
  chatId: string
  messageId: string
  swipeId: number
  opportunityId?: string
  mode: ProseIllustratorMode
  perspectiveMode?: ProseIllustratorPerspectiveMode
  shouldIllustrate: boolean
  reason: string
  sceneBrief: string
  selectedExcerpt: string
  anchor: ProseIllustrationAnchor
  title: string
  caption: string
  altText: string
  promptProfileId: PromptProfileId
  aspectRatio: string
  peoplePolicy: ProseIllustratorPeoplePolicy
  expectedPeopleCount: number
  namedSubjects: string[]
  location: string
  timeOfDay: string
  mood: string
  importantProps: string[]
  continuityFactIds: string[]
  referenceAssetIds: string[]
  planningConnectionId: string | null
  planningModel: string
  planningTimestamp: number
  warnings: string[]
  plannerOutput?: Record<string, unknown>
  visualPlan?: Record<string, unknown>
  promptComposition?: ProsePromptComposition
  candidateCount?: 1 | 2 | 4
  highResolutionModifier?: boolean
  imageAlignment?: ProseImageAlignment
  imageSize?: ProseImageSize
  approvalRequired?: boolean
  placementConfirmed: boolean
  source: 'planner' | 'auto'
  status: 'draft' | 'ready' | 'placement-required' | 'awaiting-approval' | 'candidate-review' | 'rejected' | 'generated' | 'cancelled'
}

export type ProseIllustrationRecord = {
  illustrationId: string
  requestId: string
  slotKey: string
  planId: string
  anchor: ProseIllustrationAnchor
  status: ProseIllustratorRecordStatus
  createdAt: number
  completedAt?: number
  imageId?: string
  imageUrl?: string
  assetId?: string
  versionId?: string
  error?: string
  inserted: boolean
  insertionVerified: boolean
  removed: boolean
}

export type ProseIllustratorState = {
  settings: Record<string, ProseIllustratorSettings>
  opportunities: Record<string, ProseIllustrationOpportunity>
  plans: Record<string, ProseIllustrationPlan>
  records: Record<string, ProseIllustrationRecord>
  processedMessageKeys: Record<string, number>
  autoCounters: Record<string, { eligibleMessages: number; updatedAt: number }>
  frequencyDecisions: Record<string, { eligibleOrdinal: number; passes: boolean; everyN: number; recordedAt: number }>
  activeOpportunityIdByChat: Record<string, string>
  activePlanIdByChat: Record<string, string>
}

export type VisualAssetStatus = 'available' | 'unavailable' | 'deleted' | 'unknown'

export type VisualAssetReference = {
  assetId: string
  imageId: string
  imageUrl: string
  status: VisualAssetStatus
  favorite: boolean
  visualReference: boolean
  tags: string[]
  caption: string
  alt: string
  characterNames: string[]
  locationNames: string[]
  promptProfileId?: PromptProfileId
  target: ImageTarget
  targetApp: 'twitter' | 'instagram' | 'smartphone' | 'kakao' | 'prose' | 'custom'
  chatId: string
  messageId: string
  swipeId: number
  sourceDeletedAt?: number
  sourceDeletedReason?: string
  requestId: string
  slot: string
  versionId?: string
  rootVersionId?: string
  source: 'current-slot' | 'history' | 'candidate' | 'reused'
  createdAt: number
  updatedAt: number
  lastUsedAt?: number
  originalSceneBrief: string
  resolvedPositivePrompt: string
  resolvedNegativePrompt: string
  metadata: Record<string, unknown>
}

export type AssetLibraryFilters = {
  chatId?: string
  character?: string
  location?: string
  target?: ImageTarget | 'all'
  surface?: string
  promptProfileId?: PromptProfileId | 'all'
  favorite?: boolean
  dateFrom?: number
  dateTo?: number
  query?: string
}

export type AssetLibraryState = {
  assets: Record<string, VisualAssetReference>
  compare: { leftAssetId?: string; rightAssetId?: string }
  updatedAt: number
}

export type VersionNodeState = 'committed' | 'selected' | 'discarded' | 'unavailable'

export type VersionTreeNode = {
  versionId: string
  assetId: string
  parentVersionId?: string
  rootVersionId: string
  childVersionIds: string[]
  branchLabel: string
  generationIntent?: RegenerationIntent
  promptProfile?: PromptProfileDecision
  sourceRequestId: string
  sourceSlotId: string
  createdAt: number
  state: VersionNodeState
  diagnostic?: SlotDiagnostic
}

export type VersionTree = {
  treeId: string
  chatId: string
  slotKey: string
  rootVersionId: string
  currentVersionId?: string
  nodes: Record<string, VersionTreeNode>
  updatedAt: number
}

export type ContinuityStrength = 'off' | 'low' | 'medium' | 'strong'

export type AppearanceVaultLayer = 'visual-identity' | 'wardrobe' | 'current-appearance'

export type AppearanceFactStatus = 'active' | 'inactive' | 'superseded' | 'quarantined' | 'rejected'

export type AppearanceSourceType =
  | 'manual'
  | 'character-card'
  | 'persona-card'
  | 'native-visual-preset'
  | 'appearance-sidecar'
  | 'user-confirmed-analysis'
  | 'accepted-image'
  | 'generated-prompt'
  | 'inferred'
  | 'migration'

export type AppearanceFactCategory =
  | 'hair-color'
  | 'hair-length'
  | 'hair-texture'
  | 'hairstyle'
  | 'eye-color'
  | 'face-shape'
  | 'body-build'
  | 'height'
  | 'scar'
  | 'tattoo'
  | 'birthmark'
  | 'mole'
  | 'prosthetic'
  | 'permanent-mark'
  | 'base-attire'
  | 'saved-outfit'
  | 'current-outfit'
  | 'signature-accessory'
  | 'uniform'
  | 'work-attire'
  | 'temporary-expression'
  | 'temporary-injury'
  | 'temporary-hair'
  | 'temporary-makeup'
  | 'temporary-clothing-state'
  | 'temporary-accessory'
  | 'other'

export type CanonicalVisualCharacter = {
  canonicalCharacterId: string
  canonicalCharacterName: string
  aliases: string[]
  lumiverseCharacterId?: string
  lumiversePersonaId?: string
  avatarUrl?: string
  sourceType: AppearanceSourceType
  userConfirmed: boolean
  createdAt: number
  updatedAt: number
}

export type AppearanceSourceReference = {
  sourceType: AppearanceSourceType
  sourceReference?: string
  chatId?: string
  messageId?: string
  swipeId?: number
  requestId?: string
  slot?: string
  assetId?: string
  versionId?: string
  promptHash?: string
}

export type AppearanceVaultFact = {
  factId: string
  layer: AppearanceVaultLayer
  canonicalCharacterId: string
  canonicalCharacterName: string
  aliases: string[]
  category: AppearanceFactCategory
  value: string
  /** Optional Sidecar-owned semantic replacement domain. Relay validates and stores this opaque key. */
  conflictDomain?: string
  sourceType: AppearanceSourceType
  sourceReference: AppearanceSourceReference
  confidence: number
  status: AppearanceFactStatus
  createdAt: number
  updatedAt: number
  pinned: boolean
  userConfirmed: boolean
  referenceAssetIds: string[]
  notes?: string
  outfitName?: string
  defaultWardrobe?: boolean
  currentWardrobe?: boolean
  chatId?: string
  sourceMessageId?: string
  sourceSwipeId?: number
  active?: boolean
  expiryPolicy?: 'chat' | 'scene' | 'superseded' | 'manual' | 'timestamp'
  expiresAt?: number
  supersededByFactId?: string
  lastUsedAt?: number
}

// Kept as the public compatibility name used throughout Relay diagnostics.
export type ContinuityFact = AppearanceVaultFact

export type AppearanceSuggestionStatus = 'pending' | 'accepted' | 'rejected' | 'quarantined'

export type AppearanceSuggestion = {
  suggestionId: string
  resolvedCharacterId?: string
  resolvedCharacterName?: string
  unresolvedSubject?: string
  proposedValue: string
  proposedCategory: AppearanceFactCategory
  recommendedLayer: AppearanceVaultLayer
  sourceType: AppearanceSourceType
  sourceReference: AppearanceSourceReference
  confidence: number
  reason: string
  sourceSentence?: string
  status: AppearanceSuggestionStatus
  createdAt: number
  updatedAt: number
}

export type AppearanceQuarantineItem = {
  quarantineId: string
  legacyFactId?: string
  unresolvedSubject?: string
  value: string
  reason: string
  sourceReference: AppearanceSourceReference
  recommendedLayer?: AppearanceVaultLayer
  recommendedCharacterId?: string
  createdAt: number
  updatedAt: number
}

export type VaultMigrationDisposition =
  | 'keep-visual-identity'
  | 'move-wardrobe'
  | 'move-current-appearance'
  | 'merge'
  | 'quarantine'
  | 'remove'

export type VaultMigrationItem = {
  migrationItemId: string
  legacyFactId?: string
  legacyEntityName: string
  legacyEntityType: string
  legacyValue: string
  disposition: VaultMigrationDisposition
  reason: string
  resolvedCharacterId?: string
  resolvedCharacterName?: string
  proposedCategory?: AppearanceFactCategory
  duplicateOfFactId?: string
  pinned: boolean
  selected: boolean
  legacyPayload?: Record<string, unknown>
}

export type VaultMigrationPreview = {
  previewId: string
  sourceSchemaVersion: number
  createdAt: number
  appliedAt?: number
  items: VaultMigrationItem[]
  counts: Record<VaultMigrationDisposition, number>
}


export type AppearanceAlternateLook = {
  lookId: string
  name: string
  booruTags: string
  negativeIdentityTags: string
  referenceAssetIds: string[]
  createdAt: number
  updatedAt: number
}

export type AppearanceCharacterSheet = {
  canonicalCharacterId: string
  canonicalCharacterName: string
  aliases: string[]
  booruTags: string
  currentOutfitTags: string
  negativeIdentityTags: string
  referenceAssetIds: string[]
  alternateLooks: AppearanceAlternateLook[]
  activeAlternateLookId?: string
  sourceSentence: string
  sourceMessageId?: string
  sourceSwipeId?: number
  lastScanAt?: number
  createdAt: number
  updatedAt: number
}

export type AppearanceHistoryEntry = {
  historyId: string
  action: string
  characterId?: string
  factId?: string
  suggestionId?: string
  sourceReference?: AppearanceSourceReference
  details?: Record<string, unknown>
  createdAt: number
}

export type ContinuityDecision = {
  factId: string
  included: boolean
  reason: string
  conflict?: string
}

export type ContinuityVaultState = {
  chatId: string
  strength: ContinuityStrength
  characters: Record<string, CanonicalVisualCharacter>
  characterSheets: Record<string, AppearanceCharacterSheet>
  visualIdentity: Record<string, AppearanceVaultFact>
  wardrobe: Record<string, AppearanceVaultFact>
  currentAppearance: Record<string, AppearanceVaultFact>
  suggestions: Record<string, AppearanceSuggestion>
  quarantine: Record<string, AppearanceQuarantineItem>
  history: AppearanceHistoryEntry[]
  migrationPreview: VaultMigrationPreview | null
  ignoredForSlotKeys: string[]
  deliberateBreaks: Record<string, string>
  appearanceSidecar: {
    revision: number
    processedTurnKeys: Record<string, number>
    lastRunAt: number
    lastMessageId?: string
    lastSwipeId?: number
    lastConnectionId?: string
    lastModel?: string
    lastError?: string
  }
  updatedAt: number
}

/** `collapsible` is a persisted legacy alias normalized to `plain`. */
export type SurfaceShellMode = 'inline' | 'plain' | 'sparkling' | 'collapsible'
export type SurfaceColorMode = 'realistic' | 'primary'
/** Every rendered surface has exactly one visual owner. */
export type SurfaceRendererMode = 'relay' | 'legacy-regex' | 'hybrid'
export type HybridSurfaceOwner = 'relay' | 'regex'
export type SurfaceUtilityInjectionPosition = 'system-prefix' | 'before-chat-history' | 'before-latest-user' | 'after-latest-user' | 'after-chat-history'
export type SurfacePromptCategory = 'social-messaging' | 'photography-keepsakes' | 'covers-promotion' | 'evidence-editorial' | 'narrative-visuals' | 'custom'
export type SurfaceDensity = 'compact' | 'comfortable' | 'spacious'

export type CustomSurfaceDefinition = {
  surfaceId: string
  baseSurfaceId: string
  basedOnSurfaceId?: string
  presetName: string
  shellMode: SurfaceShellMode
  defaultOpen: boolean
  launcherLabel: string
  density: SurfaceDensity
  maxWidth: string
  mediaFit: 'contain' | 'cover'
  accentMode: 'theme' | 'custom'
  customAccent: string
  typography: 'system' | 'editorial' | 'mono' | 'mixed'
  advancedCss: string
  displayName: string
  icon: string
  targetId: ImageTarget
  canonicalOuterWrapper: string
  imageSlotSelector: string
  resolvedImageChildFormat: string
  supportedAspectRatios: string[]
  defaultPromptProfileId: PromptProfileId
  peoplePolicy: 'allow' | 'discourage' | 'require' | 'forbid'
  captionSupport: boolean
  altTextSupport: boolean
  defaultCandidateCount: 1 | 2 | 4
  compatibleRegenerationIntents: RegenerationIntentId[]
  declarativeLayoutFields: Record<string, string>
  validationRules: string[]
  sampleXml: string
  deterministicPreviewFixture: Record<string, unknown>
  builtIn: boolean
  enabled: boolean
  promptEnabled: boolean
  promptCategory: SurfacePromptCategory
  promptModule: string
  /** Optional compatibility override; approved R4.5 runtime Surfaces default to Relay ownership. */
  hybridOwner?: HybridSurfaceOwner
  /** True only after a person deliberately changed the Hybrid owner control.
   * Older saved defaults are intentionally re-migrated as reviewed contracts expand. */
  hybridOwnerConfigured?: boolean
  updatedAt: number
}

export type CustomSurfaceStudioState = {
  definitions: Record<string, CustomSurfaceDefinition>
  activePresetIds: Record<string, string>
  collectionPresets: Record<string, SurfaceCollectionPreset>
  defaultCollectionPresetId?: string
  rendererMode: SurfaceRendererMode
  defaultShellMode: SurfaceShellMode
  colorMode: SurfaceColorMode
  utilityInjectionEnabled: boolean
  utilityInjectionPosition: SurfaceUtilityInjectionPosition
  utilityTemplate: string
  validationErrors: Record<string, string[]>
  lastInjectedModuleIds: string[]
  lastInjectionAt: number
  lastInjectionSource: 'automatic' | 'macro' | 'none'
  lastInjectionPosition: SurfaceUtilityInjectionPosition | 'macro-placement' | 'none'
  lastInjectionSummary: string
  updatedAt: number
}

export type SurfaceCollectionPreset = {
  presetId: string
  name: string
  surfaceIds: string[]
  createdAt: number
  updatedAt: number
}

export type SlotDiagnostic = {
  slotKey: string
  generatedAt: number
  proven: Record<string, unknown>
  inheritedNative: Record<string, unknown>
  relayInferred: Record<string, unknown>
  unavailable: string[]
  summary: string
}

export type AttemptHistoryEntry = {
  attemptNumber: number
  triggerType: TriggerType
  startedAt: number
  parsingStartedAt?: number
  generationStartedAt?: number
  completedAt?: number
  failedAt?: number
  cancelledAt?: number
  durationMs?: number
  stage: 'queued' | 'parser' | 'image-generation' | 'placement-pending' | 'placement-repair-needed' | 'completed' | 'failed' | 'cancelled'
  error?: string | null
}

export type PromptWarning = {
  code: string
  message: string
  sources?: string[]
  suggestion?: string
}

export type PromptPipeline = {
  userPositivePromptPrefix?: string
  userNegativePromptPrefix?: string
  prefixesApplied?: boolean
  scenePromptBeforePrefix?: string
  finalProviderPrompt?: string
  finalProviderNegativePrompt?: string
  contextCaption?: string
  nativeNegativePrompt: string
  requestNegativePrompt: string
  parserNegativeAdditions: string
  additionalRouterNegativePrompt: string
  rawMergedNegativePrompt: string
  finalNormalizedNegativePrompt: string
  removedNegativeDuplicates: Array<{ term: string; sources: string[] }>
  rawNativeParserTemplate?: string
  resolvedNativeParserInstructions?: string
  characterContext?: string
  personaContext?: string
  routerParserInstructions?: string
  parserRequest?: unknown
  rawParserResponse?: string
  parsedPositivePrompt?: string
  parserRequested?: boolean
  parserSucceeded?: boolean
  parserFailed?: boolean
  parserFallbackUsed?: boolean
  parserFallbackReason?: string
  unresolvedMacros: string[]
  warnings: PromptWarning[]
  requestClassification?: string
  detectedTargetClass?: string
  imageIntent?: ImageIntent
  specialIntentApplied?: boolean
  specialIntentSuppressedFragments?: string[]
  nativeIncludeCharacters?: boolean
  nativeIncludePersona?: boolean
  effectiveIncludeCharacters?: boolean
  effectiveIncludePersona?: boolean
  characterContextSuppressed?: boolean
  personaContextSuppressed?: boolean
  noHumanGuardrailsApplied?: boolean
  parserHumanContaminationDetected?: boolean
  parserHumanContaminationRepaired?: boolean
  contextGatingReason?: string
  faceExpressionApplicable?: boolean
  visualCharacterPrompt?: string
  visualPersonaPrompt?: string
  visualSubjectPrompts?: Array<{ id?: string; name: string; kind: string; prompt: string; negativePrompt: string }>
  subjectNegativePrompt?: string
  sanitizedRecentContext?: string
  rejectedParserNegativeAdditions?: Array<{ term: string; reason: string }>
  nativeActiveLoraPreset?: unknown
  effectiveAppliedLoraPreset?: unknown
  lorasSentToProvider?: unknown
  loraBaseTags?: string
  baseTagsAddedToPrompt?: string
  omittedBaseTags?: Array<{ tag: string; group: string; reason: string }>
  highResMode?: boolean
  highResRetainedBaseTags?: string[]
  highResPreservedFramingCues?: string[]
  loraOmittedFields?: string[]
  promptProfile?: PromptProfileDecision
  regenerationIntent?: RegenerationIntent
  diagnostic?: SlotDiagnostic
  includedContinuityFacts?: ContinuityFact[]
  excludedContinuityFacts?: ContinuityDecision[]
  attachedReferenceAssetIds?: string[]
  continuityConflicts?: string[]
  continuityStrength?: ContinuityStrength
  identityResolution?: {
    requestedCast: string
    effectiveRequiredCast: string[]
    bindings: Array<{ kind: string; subjectId: string; subjectName: string; presetId: string; presetName: string; prompt: string; source: string; diagnostics: string[] }>
    fallbacks: string[]
    corrections: string[]
    appearanceRevision: number
  }
}

export type ImageRequest = {
  id: string
  target: ImageTarget
  intent: ImageIntent
  count: number
  aspect?: string
  alt?: string
  caption?: string
  time?: string
  prompt: string
  cast?: 'char' | 'user' | 'char+user' | 'none'
  promptSource?: 'visual_prompt' | 'legacy-body' | 'structured'
  negative?: string
  slot?: string
  fullMatch: string
  index: number
}

export type GenerationSnapshot = {
  imageId: string
  imageIntent?: ImageIntent
  imageUrl: string
  imageWidth?: number | null
  imageHeight?: number | null
  aspectRatio?: string
  resolvedPositivePrompt: string
  resolvedNegativePrompt: string
  promptMode: string
  promptPresetId: string | null
  parserUsed?: boolean
  parserOutput?: string
  parserConnectionId?: string | null
  parserModel?: string
  parserParameters?: Record<string, unknown>
  imageConnectionId?: string | null
  imageConnectionName?: string
  imageProvider?: string
  imageModel?: string
  imageParameters?: Record<string, unknown>
  nativeImageSettings?: Record<string, unknown>
  nativeSettingsCapturedAt?: number
  connectionDefaultParameters?: Record<string, unknown>
  slotOverrides?: Record<string, unknown>
  finalImageParameters?: Record<string, unknown>
  finalImageRequest?: Record<string, unknown>
  nativeActiveLoraPreset?: Record<string, unknown> | null
  effectiveAppliedLoraPreset?: Record<string, unknown> | null
  lorasSentToProvider?: unknown
  loraBaseTags?: string
  baseTagsAddedToPrompt?: string
  omittedBaseTags?: Array<{ tag: string; group: string; reason: string }>
  highResMode?: boolean
  highResRetainedBaseTags?: string[]
  highResPreservedFramingCues?: string[]
  loraOmittedFields?: string[]
  promptProfile?: PromptProfileDecision
  regenerationIntent?: RegenerationIntent
  diagnostic?: SlotDiagnostic
  assetId?: string
  versionId?: string
  parentVersionId?: string
  rootVersionId?: string
  branchLabel?: string
  includedContinuityFacts?: ContinuityFact[]
  excludedContinuityFacts?: ContinuityDecision[]
  continuityStrength?: ContinuityStrength
  finalImageSettingsSource?: 'current-native' | 'stored' | 'router-config'
  attemptNumber?: number
  triggerType?: TriggerType
  generatedAt: number
  promptPipeline?: PromptPipeline
  galleryLinkStatus?: GalleryLinkStatus
  galleryItemId?: string
  galleryLinkError?: string
  galleryLinkedAt?: number
}

export type SlotRecord = {
  key: string
  chatId: string
  messageId: string
  swipeId: number
  requestId: string
  target: ImageTarget
  imageIntent?: ImageIntent
  targetApp: 'twitter' | 'instagram' | 'smartphone' | 'kakao' | 'prose' | 'custom'
  slot: string
  status: SlotStatus
  originalSceneBrief: string
  originalNegativePrompt: string
  originalRequestXml: string
  cast?: 'char' | 'user' | 'char+user' | 'none'
  promptSource?: 'visual_prompt' | 'legacy-body' | 'structured'
  alt: string
  caption?: string
  time?: string
  count: number
  requestAspect?: string
  createdAt: number
  discoveredAt?: number
  registeredAt?: number
  queuedAt?: number
  parsingStartedAt?: number
  generationStartedAt?: number
  failedAt?: number
  completedAt?: number
  cancelledAt?: number
  lastAttemptAt?: number
  lastRetriedAt?: number
  lastReparsedAt?: number
  lastRegeneratedAt?: number
  lastRestoredAt?: number
  lastEditedAt?: number
  recoveredAt?: number
  recoverySource?: 'unresolved-request' | 'resolved-marker' | 'error-marker'
  recoveryCompleteness?: 'full' | 'partial' | 'marker-only' | 'reconstructed'
  missingRecoveryFields?: string[]
  recoveredFromInactiveSwipe?: boolean
  activeSwipeAtRecovery?: number
  reconstructedAt?: number
  reconstructionSource?: 'user-edited-alt'
  updatedAt: number
  error?: string
  errorToastKey?: string
  imageId?: string
  imageUrl?: string
  imageWidth?: number | null
  imageHeight?: number | null
  aspectRatio?: string
  resolvedPositivePrompt?: string
  resolvedNegativePrompt?: string
  promptMode?: string
  promptPresetId?: string | null
  parserUsed?: boolean
  parserOutput?: string
  parserConnectionId?: string | null
  parserModel?: string
  parserParameters?: Record<string, unknown>
  imageConnectionId?: string | null
  imageConnectionName?: string
  imageProvider?: string
  imageModel?: string
  imageParameters?: Record<string, unknown>
  nativeImageSettings?: Record<string, unknown>
  nativeSettingsCapturedAt?: number
  connectionDefaultParameters?: Record<string, unknown>
  slotOverrides?: Record<string, unknown>
  finalImageParameters?: Record<string, unknown>
  finalImageRequest?: Record<string, unknown>
  nativeActiveLoraPreset?: Record<string, unknown> | null
  effectiveAppliedLoraPreset?: Record<string, unknown> | null
  lorasSentToProvider?: unknown
  loraBaseTags?: string
  baseTagsAddedToPrompt?: string
  omittedBaseTags?: Array<{ tag: string; group: string; reason: string }>
  highResMode?: boolean
  highResRetainedBaseTags?: string[]
  highResPreservedFramingCues?: string[]
  loraOmittedFields?: string[]
  promptProfile?: PromptProfileDecision
  selectedPromptProfileId?: PromptProfileId
  temporaryPromptProfileId?: PromptProfileId
  regenerationIntent?: RegenerationIntent
  diagnostic?: SlotDiagnostic
  assetId?: string
  currentVersionId?: string
  rootVersionId?: string
  versionTreeId?: string
  includedContinuityFacts?: ContinuityFact[]
  excludedContinuityFacts?: ContinuityDecision[]
  continuityStrength?: ContinuityStrength
  finalImageSettingsSource?: GenerationSnapshot['finalImageSettingsSource']
  attemptNumber?: number
  triggerType?: TriggerType
  attempts?: AttemptHistoryEntry[]
  promptPipeline?: PromptPipeline
  orphaned?: boolean
  orphanReason?: string
  proseIllustrationId?: string
  prosePlanId?: string
  proseAnchor?: ProseIllustrationAnchor
  proseSynthetic?: boolean
  composedPositivePrompt?: string
  composedNegativePrompt?: string
  prosePromptComposition?: ProsePromptComposition
  pendingPlacement?: SlotGenerationResult
  previewPending?: boolean
  placementFailure?: {
    failedAt: number
    reason: string
    anchorsChecked: string[]
    contentFingerprint: string
    retryCount: number
  }
  imageAvailability?: 'available' | 'missing' | 'unchecked'
  imageAvailabilityCheckedAt?: number
  galleryLinkStatus?: GalleryLinkStatus
  galleryItemId?: string
  galleryLinkError?: string
  galleryLinkedAt?: number
  history: GenerationSnapshot[]
}

export type RouterJob = {
  chatId: string
  messageId: string
  swipeId: number
  requestId: string
  target: ImageTarget
  intent?: ImageIntent
  count: number
  slots: string[]
  alt: string
  caption?: string
  time?: string
  aspect?: string
  originalSceneBrief: string
  originalNegativePrompt: string
  originalRequestXml: string
  cast?: 'char' | 'user' | 'char+user' | 'none'
  promptSource?: 'visual_prompt' | 'legacy-body' | 'structured'
  sourceContent?: string
  promptProfileId?: PromptProfileId
  regenerationIntent?: RegenerationIntent
  proseIllustrationId?: string
  prosePlanId?: string
  proseAnchor?: ProseIllustrationAnchor
  synthetic?: boolean
  proseImageAlignment?: ProseImageAlignment
  proseImageSize?: ProseImageSize
  composedPositivePrompt?: string
  composedNegativePrompt?: string
  prosePromptComposition?: ProsePromptComposition
}

export type SlotGenerationResult = GenerationSnapshot & {
  slot: string
}

export type RelayCandidateStatus = 'preflight' | 'parsing' | 'generating' | 'ready' | 'failed' | 'unavailable' | 'replaced' | 'discarded'

export type RelayCandidate = {
  candidateKey: string
  stableSlotKey: string
  batchId: string
  chatId: string
  messageId: string
  swipeId: number
  requestId: string
  target: ImageTarget
  imageIntent?: ImageIntent
  targetApp: 'twitter' | 'instagram' | 'smartphone' | 'kakao' | 'prose' | 'custom'
  slot: string
  sourceImageId?: string
  sourceImageUrl?: string
  candidateImageId?: string
  candidateImageUrl?: string
  originalSceneBrief: string
  originalRequestXml: string
  resolvedSourcePrompt: string
  newlyParsedPrompt?: string
  negativePrompt?: string
  provider?: string
  connection?: string
  model?: string
  generationParameters?: Record<string, unknown>
  finalImageRequest?: Record<string, unknown>
  highResMode: boolean
  status: RelayCandidateStatus
  error?: string
  createdAt: number
  attemptNumber: number
  triggerType: 'reparse' | 'intent-regeneration'
  candidateNumber?: number
  candidateTotal?: number
  promptProfile?: PromptProfileDecision
  regenerationIntent?: RegenerationIntent
  replacementPreflightStatus: 'pending' | 'ready' | 'missing-marker' | 'stale-swipe' | 'source-changed' | 'failed'
  selected: boolean
  snapshot?: SlotGenerationResult
}

export type RelayBatchSummary = {
  slotsDiscovered: number
  candidatesGenerated: number
  candidatesFailed: number
  candidatesSkipped: number
  replacementsSelected: number
  replacementsApplied: number
  existingImagesPreserved: number
}

export type RelayCandidateBatch = {
  batchId: string
  chatId: string
  messageId: string
  swipeId: number
  createdAt: number
  updatedAt: number
  mode: 'normal' | 'high-res'
  status: 'processing' | 'review' | 'completed' | 'discarded' | 'expired'
  candidateCount: 1 | 2 | 4
  intent?: RegenerationIntent
  candidates: RelayCandidate[]
  summary: RelayBatchSummary
}

export const ROUTER_COMMENT = 'reverie-relay:image'
export const ROUTER_ERROR_COMMENT = 'reverie-relay:image-error'
export const LEGACY_ROUTER_COMMENT = 'dreamglass:image'
export const LEGACY_ROUTER_ERROR_COMMENT = 'dreamglass:image-error'

const RELAY_PROMPT_MARKDOWN_IMAGE_RE = /(?:\n\s*)*!\[reverie-relay\]\(\/api\/v1\/(?:images|image-gen\/results)\/[^)\s]+\)/gi
const RELAY_OWNERSHIP_MARKER_RE = /<!--\s*(?:reverie-relay|dreamglass):image(?:-error)?\b[\s\S]*?-->/gi
const RELAY_PROMPT_SCENE_IMAGE_RE = /<scene_image\b[^>]*>[\s\S]*?<\/scene_image>/gi
const RELAY_PROMPT_OWNED_IMAGE_RE = /<img\b(?=[^>]*\bdata-dgir-(?:key|request-id|image-id)\s*=)[^>]*>/gi
const RELAY_PROMPT_REQUEST_RE = /<(?:reverie-illustration|image_request|image_request_error)\b[^>]*>[\s\S]*?<\/(?:reverie-illustration|image_request|image_request_error)>/gi
const LEGACY_DREAMGLASS_REQUEST_RE = /<dreamglass(?:[-_:][a-z0-9_-]+)?\b[^>]*>[\s\S]*?<\/dreamglass(?:[-_:][a-z0-9_-]+)?>/gi

/** Removes Relay-owned runtime artifacts and historical request blocks from text
 * sent back to the story model. Current request syntax is supplied only by the
 * active Reverie utility, preventing old saved requests from being imitated.
 */
export function sanitizeRelayPromptHistoryText(value: string): string {
  return String(value || '')
    .replace(RELAY_PROMPT_MARKDOWN_IMAGE_RE, '')
    .replace(RELAY_OWNERSHIP_MARKER_RE, '')
    .replace(RELAY_PROMPT_SCENE_IMAGE_RE, '')
    .replace(RELAY_PROMPT_OWNED_IMAGE_RE, '')
    .replace(RELAY_PROMPT_REQUEST_RE, '')
    .replace(LEGACY_DREAMGLASS_REQUEST_RE, '')
}

export function contentFingerprint(content: string): string {
  let hash = 0x811c9dc5
  for (let index = 0; index < content.length; index += 1) {
    hash ^= content.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  return `${content.length}:${(hash >>> 0).toString(16).padStart(8, '0')}`
}

export type ParsedRouterMarker = {
  kind: 'resolved' | 'failed'
  requestId: string
  target: ImageTarget | null
  slot: string
  imageUrl: string
  imageId: string
  alt: string
  error: string
  valid: boolean
  reason?: string
}

const TARGETS = new Set<ImageTarget>([
  'twitter.media',
  'instagram.single',
  'instagram.carousel',
  'smartphone.message-image',
  'kakao.image',
  'prose.illustration',
])
const MAX_COUNT = 4
const MAX_PROMPT_CHARS = 6000

export function isImageTarget(value: string): value is ImageTarget {
  return TARGETS.has(value as ImageTarget) || /^custom\.[a-z0-9][a-z0-9._-]{1,62}$/i.test(value)
}

export function slotKey(parts: {
  chatId: string
  messageId: string
  swipeId: number
  requestId: string
  slot: string
}): string {
  return [
    parts.chatId,
    parts.messageId,
    String(parts.swipeId),
    parts.requestId,
    parts.slot,
  ].join(':')
}

export function mergeMissingSlotRecords<T extends { key: string }>(latest: Record<string, T>, discoveries: T[]): { added: T[]; skipped: T[] } {
  const added: T[] = []
  const skipped: T[] = []
  for (const discovery of discoveries) {
    if (latest[discovery.key]) {
      skipped.push(discovery)
      continue
    }
    latest[discovery.key] = discovery
    added.push(discovery)
  }
  return { added, skipped }
}

export function selectRescanSwipeRows(message: { content: string; swipe_id?: number; swipes?: string[] }, includeInactive: boolean): Array<{ swipeId: number; content: string; inactive: boolean }> {
  const max = Array.isArray(message.swipes) && message.swipes.length ? message.swipes.length - 1 : Number.MAX_SAFE_INTEGER
  const active = Math.max(0, Math.min(max, Number.isFinite(Number(message.swipe_id)) ? Number(message.swipe_id) : 0))
  if (!Array.isArray(message.swipes) || !message.swipes.length) return [{ swipeId: active, content: String(message.content || ''), inactive: false }]
  if (!includeInactive) return [{ swipeId: active, content: String(message.swipes[active] || message.content || ''), inactive: false }]
  return message.swipes.map((content, swipeId) => ({ swipeId, content: String(content || ''), inactive: swipeId !== active }))
}

export function slotsForRequest(req: ImageRequest): string[] {
  if (req.target.startsWith('custom.')) return [req.slot || 'image']
  if (req.target === 'instagram.carousel') {
    return Array.from({ length: req.count }, (_, i) => `slide-${i + 1}`)
  }
  if (req.slot) return [req.slot]
  if (req.target === 'twitter.media') return ['media']
  if (req.target === 'smartphone.message-image') return ['message-image']
  if (req.target === 'prose.illustration') return ['illustration']
  return ['image']
}

export function targetApp(target: ImageTarget): SlotRecord['targetApp'] {
  if (target.startsWith('custom.')) return 'custom'
  if (target.startsWith('twitter.')) return 'twitter'
  if (target.startsWith('smartphone.')) return 'smartphone'
  if (target.startsWith('kakao.')) return 'kakao'
  if (target.startsWith('prose.')) return 'prose'
  return 'instagram'
}

export function parseImageRequests(content: string): ImageRequest[] {
  const out: ImageRequest[] = []
  const phoneRanges: Array<{ start: number; end: number; bodyStart: number; time: string }> = []
  const phoneRe = /<(?:smart_phone|smartphone)\b([^>]*)>([\s\S]*?)<\/(?:smart_phone|smartphone)>/gi
  let phoneMatch: RegExpExecArray | null
  while ((phoneMatch = phoneRe.exec(content)) !== null) {
    const rootAttrs = parseAttrs(phoneMatch[1] || '')
    const openEnd = phoneMatch[0].indexOf('>') + 1
    phoneRanges.push({ start: phoneMatch.index, end: phoneMatch.index + phoneMatch[0].length, bodyStart: phoneMatch.index + openEnd, time: rootAttrs.time?.trim() || '' })
  }

  const re = /<(image_request|reverie-illustration)\b([^>]*)>([\s\S]*?)<\/\1>/gi
  let match: RegExpExecArray | null

  while ((match = re.exec(content)) !== null) {
    const tagName = match[1].toLocaleLowerCase()
    const attrs = parseAttrs(match[2])
    const body = match[3].trim()
    const isIllustrationProtocol = tagName === 'reverie-illustration'
    if (isIllustrationProtocol && String(attrs.request || '').toLocaleLowerCase() !== 'generate') continue

    const id = (attrs.id || attrs.request_id || (isIllustrationProtocol ? attrs.slot : ''))?.trim()
    const target = (isIllustrationProtocol ? 'prose.illustration' : attrs.target?.trim()) as ImageTarget | undefined
    if (!id || !target || !isImageTarget(target)) continue

    const visualPrompt = isIllustrationProtocol ? firstTagText(body, 'visual_prompt')?.trim() : ''
    const structuredPrompt = firstTagText(body, 'scene_brief') || firstTagText(body, 'prompt')
    const prompt = visualPrompt || structuredPrompt || stripKnownTags(body)
    if (!prompt.trim()) continue
    const rawCast = String(attrs.cast || '').trim().toLocaleLowerCase()
    const cast = isIllustrationProtocol && ['char', 'user', 'char+user', 'none'].includes(rawCast)
      ? rawCast as ImageRequest['cast']
      : undefined

    const count = clampInt(attrs.count ? Number(attrs.count) : 1, 1, MAX_COUNT)
    const caption = firstTagText(body, 'context_caption')?.trim()
    const alt = attrs.alt?.trim() || caption || ''
    let requestTime = attrs.time?.trim() || undefined
    if (target === 'smartphone.message-image' && !requestTime) {
      const phone = phoneRanges.find(range => match!.index >= range.start && match!.index < range.end)
      if (phone) {
        const beforeRequest = content.slice(phone.bodyStart, match.index)
        const messageTimeRe = /<(?:s_recv|s_sent)\b[^>]*\btime\s*=\s*["']([^"']+)["'][^>]*>/gi
        let messageTime: RegExpExecArray | null
        let latest = ''
        while ((messageTime = messageTimeRe.exec(beforeRequest)) !== null) latest = messageTime[1].trim()
        requestTime = latest || phone.time || undefined
      }
    }
    out.push({
      id,
      target,
      intent: normalizeImageIntent(attrs.intent),
      count: target === 'instagram.carousel' ? count : 1,
      aspect: attrs.aspect,
      alt,
      caption,
      time: requestTime,
      prompt: prompt.trim().slice(0, MAX_PROMPT_CHARS),
      cast,
      promptSource: isIllustrationProtocol
        ? visualPrompt ? 'visual_prompt' : 'legacy-body'
        : 'structured',
      negative: firstTagText(body, 'negative')?.trim(),
      slot: (attrs.slot?.trim() || (isIllustrationProtocol ? 'illustration' : undefined)),
      fullMatch: match[0],
      index: match.index,
    })
  }

  // A reusable Surface avatar can intentionally appear in several message rows.
  // Its stable id/slot identifies one generation job, not one job per placement.
  const unique = new Map<string, ImageRequest>()
  for (const request of out) {
    const key = `${request.target}:${request.id}:${request.slot || ''}`
    if (!unique.has(key)) unique.set(key, request)
  }
  return [...unique.values()]
}


export function parseRouterMarkers(content: string): ParsedRouterMarker[] {
  const out: ParsedRouterMarker[] = []
  const markerRe = /<!--\s*((?:reverie-relay|dreamglass):image(?:-error)?)\s+([^>]*?)-->/gi
  let match: RegExpExecArray | null
  while ((match = markerRe.exec(content)) !== null) {
    const attrs = parseAttrs(match[2])
    const nextMarker = content.slice(markerRe.lastIndex).search(/<!--\s*(?:reverie-relay|dreamglass):image(?:-error)?\b/i)
    const segmentEnd = nextMarker >= 0 ? markerRe.lastIndex + nextMarker : content.length
    const segment = content.slice(markerRe.lastIndex, segmentEnd)
    const kind = match[1].toLocaleLowerCase().endsWith('-error') ? 'failed' : 'resolved'
    const requestId = (attrs.requestId || attrs.request_id || '').trim()
    const targetValue = attrs.target?.trim() as ImageTarget | undefined
    const target = targetValue && TARGETS.has(targetValue) ? targetValue : null
    const slot = attrs.slot?.trim() || ''
    const srcMatch = segment.match(/\bsrc\s*=\s*["']([^"']+)["']/i)
    const altMatch = segment.match(/\balt\s*=\s*["']([^"']*)["']/i)
    const errorMatch = segment.match(/<image_request_error\b[^>]*>([\s\S]*?)<\/image_request_error>/i)
    const imageUrl = srcMatch?.[1]?.trim() || ''
    const imageId = imageIdFromUrl(imageUrl)
    const missing = [!requestId ? 'requestId' : '', !target ? 'target' : '', !slot ? 'slot' : '', kind === 'resolved' && !imageUrl ? 'image URL' : ''].filter(Boolean)
    out.push({
      kind,
      requestId,
      target,
      slot,
      imageUrl,
      imageId,
      alt: altMatch?.[1]?.trim() || '',
      error: errorMatch?.[1]?.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() || '',
      valid: missing.length === 0,
      reason: missing.length ? `Missing or unsupported ${missing.join(', ')}` : undefined,
    })
  }
  return out
}

function imageIdFromUrl(url: string): string {
  if (!url) return ''
  const clean = url.split(/[?#]/, 1)[0]
  const match = clean.match(/\/(?:images|results)\/([^/]+)$/i)
  if (!match) return ''
  try { return decodeURIComponent(match[1]) } catch { return match[1] }
}

export function renderResolvedMarkup(job: RouterJob, results: SlotGenerationResult[]): string {
  const bySlot = new Map(results.map(r => [r.slot, r]))

  if (job.target === 'twitter.media') {
    const result = bySlot.get(job.slots[0])
    if (!result) throw new Error('Missing Twitter media result')
    return `${slotComment(job, result.slot)}\n<tw_media src="${escapeAttr(result.imageUrl)}" alt="${escapeAttr(job.alt)}" type="image"></tw_media>`
  }

  if (job.target === 'instagram.single') {
    const result = bySlot.get(job.slots[0])
    if (!result) throw new Error('Missing Instagram image result')
    return `${slotComment(job, result.slot)}\n<image><img src="${escapeAttr(result.imageUrl)}" alt="${escapeAttr(job.alt)}"></image>`
  }

  if (job.target === 'smartphone.message-image') {
    const result = bySlot.get(job.slots[0])
    if (!result) throw new Error('Missing Smartphone image result')
    return `${slotComment(job, result.slot)}\n<s_img side="${escapeAttr(smartphoneSideForJob(job))}" time="${escapeAttr(job.time || 'now')}"><img src="${escapeAttr(result.imageUrl)}" alt="${escapeAttr(job.alt || 'Smartphone attachment')}"${resolvedRelayImageAttributes(job, result)}></s_img>`
  }

  if (job.target === 'kakao.image') {
    const result = bySlot.get(job.slots[0])
    if (!result) throw new Error('Missing Kakao image result')
    return `${slotComment(job, result.slot)}\n<k_img caption="${escapeAttr(job.caption || job.alt)}"><img src="${escapeAttr(result.imageUrl)}" alt="${escapeAttr(job.alt || 'Kakao attachment')}"></k_img>`
  }

  if (job.target === 'prose.illustration') {
    const result = bySlot.get(job.slots[0])
    if (!result) throw new Error('Missing prose illustration result')
    return renderProseResolvedMarkup(job, result)
  }

  if (job.target.startsWith('custom.')) {
    const result = bySlot.get(job.slots[0])
    if (!result) throw new Error('Missing custom surface result')
    const caption = job.caption ? ` data-caption="${escapeAttr(job.caption)}"` : ''
    const artifactMedia = job.target === 'custom.artifact-media'
      ? ' class="reverie-artifact-media" data-reverie-artifact-media="true"'
      : ''
    return `${slotComment(job, result.slot)}
<img src="${escapeAttr(result.imageUrl)}" alt="${escapeAttr(job.alt || job.target)}"${artifactMedia}${resolvedRelayImageAttributes(job, result)} data-dgir-custom-target="${escapeAttr(job.target)}"${caption} loading="lazy" decoding="async">`
  }

  const slides = job.slots.map((slot, index) => {
    const result = bySlot.get(slot)
    if (!result) throw new Error(`Missing Instagram carousel result for ${slot}`)
    const alt = job.alt ? `${job.alt} ${index + 1}` : `Slide ${index + 1}`
    return `${slotComment(job, slot)}\n<ig_slide src="${escapeAttr(result.imageUrl)}" alt="${escapeAttr(alt)}"></ig_slide>`
  }).join('\n')

  return `<ig_media active="1" total="${job.slots.length}">\n${slides}\n</ig_media>`
}

export function replaceResolvedSlotAfterComment(content: string, job: RouterJob, result: SlotGenerationResult): string | null {
  let output = content
  let searchFrom = 0
  let replacementCount = 0
  const tag = job.target === 'twitter.media' ? 'tw_media'
    : job.target === 'instagram.single' ? 'image'
      : job.target === 'instagram.carousel' ? 'ig_slide'
        : job.target === 'smartphone.message-image' ? 's_img'
          : job.target === 'kakao.image' ? 'k_img'
            : 'scene_image'
  while (searchFrom < output.length) {
    const located = findFirstMarker(output.slice(searchFrom), slotCommentVariants(job, result.slot))
    if (!located) break
    const markerIndex = searchFrom + located.markerIndex
    const marker = located.marker
    const tail = output.slice(markerIndex + marker.length)
    const match = job.target === 'prose.illustration'
      ? (tail.match(/^\s*!\[reverie-relay\]\([^)\s]+\)/i) || tail.match(/^\s*<scene_image\b[\s\S]*?<\/scene_image>/i))
      : job.target.startsWith('custom.')
        ? tail.match(/^\s*<img\b[^>]*\bdata-dgir-custom-target=["'][^"']+["'][^>]*>/i)
        : tail.match(new RegExp(`^\\s*<${tag}\\b[\\s\\S]*?<\\/${tag}>`, 'i'))
    if (!match || match.index === undefined) { searchFrom = markerIndex + marker.length; continue }
    const replacement = renderResolvedSlotMarkup(job, result)
    const end = markerIndex + marker.length + match.index + match[0].length
    output = output.slice(0, markerIndex) + replacement + output.slice(end)
    replacementCount += 1
    searchFrom = markerIndex + replacement.length
  }
  return replacementCount ? output : null
}

function renderResolvedSlotMarkup(job: RouterJob, result: SlotGenerationResult): string {
  if (job.target === 'twitter.media') return `${slotComment(job, result.slot)}\n<tw_media src="${escapeAttr(result.imageUrl)}" alt="${escapeAttr(job.alt)}" type="image"></tw_media>`
  if (job.target === 'instagram.single') return `${slotComment(job, result.slot)}\n<image><img src="${escapeAttr(result.imageUrl)}" alt="${escapeAttr(job.alt)}"></image>`
  if (job.target === 'smartphone.message-image') return `${slotComment(job, result.slot)}\n<s_img side="${escapeAttr(smartphoneSideForJob(job))}" time="${escapeAttr(job.time || 'now')}"><img src="${escapeAttr(result.imageUrl)}" alt="${escapeAttr(job.alt || 'Smartphone attachment')}"${resolvedRelayImageAttributes(job, result)}></s_img>`
  if (job.target === 'kakao.image') return `${slotComment(job, result.slot)}\n<k_img caption="${escapeAttr(job.caption || job.alt)}"><img src="${escapeAttr(result.imageUrl)}" alt="${escapeAttr(job.alt || 'Kakao attachment')}"></k_img>`
  if (job.target === 'prose.illustration') {
    return renderProseResolvedMarkup(job, result)
  }
  if (job.target.startsWith('custom.')) {
    const caption = job.caption ? ` data-caption="${escapeAttr(job.caption)}"` : ''
    const artifactMedia = job.target === 'custom.artifact-media'
      ? ' class="reverie-artifact-media" data-reverie-artifact-media="true"'
      : ''
    return `${slotComment(job, result.slot)}\n<img src="${escapeAttr(result.imageUrl)}" alt="${escapeAttr(job.alt || job.target)}"${artifactMedia}${resolvedRelayImageAttributes(job, result)} data-dgir-custom-target="${escapeAttr(job.target)}"${caption}>`
  }
  const slideNumber = Math.max(1, Number(result.slot.match(/\\d+$/)?.[0] || 1))
  const alt = job.alt ? `${job.alt} ${slideNumber}` : `Slide ${slideNumber}`
  return `${slotComment(job, result.slot)}\n<ig_slide src="${escapeAttr(result.imageUrl)}" alt="${escapeAttr(alt)}"></ig_slide>`
}

const escapeRegExp = (value: string): string => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

function smartphoneSideForJob(job: RouterJob): 'sent' | 'recv' {
  const requestId = escapeRegExp(job.requestId)
  const slot = escapeRegExp(job.slots[0] || '')
  const source = String(job.sourceContent || '')
  const wrapper = new RegExp(`<s_img\\b([^>]*)>[\\s\\S]*?<image_request\\b(?=[^>]*(?:\\bid|\\bslot)=["'][^"']*(?:${requestId}|${slot})[^"']*["'])[^>]*>[\\s\\S]*?<\\/s_img>`, 'i').exec(source)
  const raw = wrapper?.[1] || ''
  const value = /\bside\s*=\s*["']([^"']+)["']/i.exec(raw)?.[1].toLowerCase() || ''
  return ['sent', 'right', 'user'].includes(value) ? 'sent' : 'recv'
}

function resolvedRelayImageAttributes(job: RouterJob, result: SlotGenerationResult): string {
  const key = slotKey({
    chatId: job.chatId,
    messageId: job.messageId,
    swipeId: job.swipeId,
    requestId: job.requestId,
    slot: result.slot,
  })
  return [
    ` data-dgir-key="${escapeAttr(key)}"`,
    ` data-dgir-request-id="${escapeAttr(job.requestId)}"`,
    ` data-dgir-slot="${escapeAttr(result.slot)}"`,
    ` data-dgir-image-id="${escapeAttr(result.imageId)}"`,
    ` data-dgir-message-id="${escapeAttr(job.messageId)}"`,
    ` data-dgir-swipe-id="${job.swipeId}"`,
    normalizeImageIntent(job.intent) !== 'auto' ? ` data-dgir-image-intent="${escapeAttr(normalizeImageIntent(job.intent))}"` : '',
  ].join('')
}

function renderProseResolvedMarkup(job: RouterJob, result: SlotGenerationResult): string {
  return `${slotComment(job, result.slot)}\n![reverie-relay](${result.imageUrl})`
}

function normalizeProseImageAlignment(value: unknown): ProseImageAlignment {
  return value === 'left' || value === 'right' || value === 'center' ? value : 'center'
}

function normalizeProseImageSize(value: unknown): ProseImageSize {
  return value === 'small' || value === 'large' || value === 'full' || value === 'medium' ? value : 'medium'
}

function proseWrapperStyle(alignment: ProseImageAlignment): string {
  const justify = alignment === 'left' ? 'flex-start' : alignment === 'right' ? 'flex-end' : 'center'
  return `display:flex;justify-content:${justify};width:100%;`
}

function proseImageStyle(size: ProseImageSize): string {
  const width = size === 'small' ? '48%' : size === 'large' ? '84%' : size === 'full' ? '100%' : '66%'
  const maxWidth = size === 'small' ? '420px' : size === 'large' ? '960px' : size === 'full' ? '100%' : '720px'
  return `display:block;width:${width};max-width:${maxWidth};height:auto;object-fit:contain;`
}

export function renderFailureMarkup(job: RouterJob, message: string): string {
  const slot = job.slots[0] || 'image'
  return `${errorComment(job, slot)}\n<image_request_error id="${escapeAttr(job.requestId)}" target="${escapeAttr(job.target)}" slot="${escapeAttr(slot)}" retryable="true">${escapeText(message)}</image_request_error>`
}

export function slotComment(job: Pick<RouterJob, 'chatId' | 'messageId' | 'swipeId' | 'requestId' | 'target'>, slot: string): string {
  return `<!-- ${ROUTER_COMMENT} chatId="${escapeAttr(job.chatId)}" messageId="${escapeAttr(job.messageId)}" swipeId="${job.swipeId}" requestId="${escapeAttr(job.requestId)}" target="${escapeAttr(job.target)}" slot="${escapeAttr(slot)}" -->`
}

export function errorComment(job: Pick<RouterJob, 'chatId' | 'messageId' | 'swipeId' | 'requestId' | 'target'>, slot: string): string {
  return `<!-- ${ROUTER_ERROR_COMMENT} chatId="${escapeAttr(job.chatId)}" messageId="${escapeAttr(job.messageId)}" swipeId="${job.swipeId}" requestId="${escapeAttr(job.requestId)}" target="${escapeAttr(job.target)}" slot="${escapeAttr(slot)}" -->`
}


export function slotCommentVariants(job: Pick<RouterJob, 'chatId' | 'messageId' | 'swipeId' | 'requestId' | 'target'>, slot: string): string[] {
  const current = slotComment(job, slot)
  return [current, current.replace(ROUTER_COMMENT, LEGACY_ROUTER_COMMENT)]
}

export function errorCommentVariants(job: Pick<RouterJob, 'chatId' | 'messageId' | 'swipeId' | 'requestId' | 'target'>, slot: string): string[] {
  const current = errorComment(job, slot)
  return [current, current.replace(ROUTER_ERROR_COMMENT, LEGACY_ROUTER_ERROR_COMMENT)]
}

export function findFirstMarker(content: string, markers: string[]): { marker: string; markerIndex: number } | null {
  let found: { marker: string; markerIndex: number } | null = null
  for (const marker of markers) {
    const markerIndex = content.indexOf(marker)
    if (markerIndex < 0) continue
    if (!found || markerIndex < found.markerIndex) found = { marker, markerIndex }
  }
  return found
}

function nextOwnershipMarkerIndex(content: string, fromIndex: number): number {
  const tail = content.slice(fromIndex)
  const match = /<!--\s*(?:reverie-relay|dreamglass):image(?:-error)?\b/i.exec(tail)
  return match?.index === undefined ? -1 : fromIndex + match.index
}

export function replaceImageUrlAfterSlotComment(content: string, record: SlotRecord, nextUrl: string): string | null {
  if (!record.imageUrl) return null
  const located = findFirstMarker(content, slotCommentVariants(record, record.slot))
  if (!located) return null
  const { marker, markerIndex } = located

  const nextMarker = nextOwnershipMarkerIndex(content, markerIndex + marker.length)
  const end = nextMarker >= 0 ? nextMarker : content.length
  const before = content.slice(0, markerIndex)
  const segment = content.slice(markerIndex, end)
  const after = content.slice(end)
  const replaced = segment.replace(record.imageUrl, nextUrl)
  if (replaced === segment) return null
  return before + replaced + after
}

export function replaceErrorAfterComment(content: string, job: RouterJob, replacement: string): string | null {
  const located = findFirstMarker(content, errorCommentVariants(job, job.slots[0] || 'image'))
  if (!located) return null
  const { marker, markerIndex } = located
  const re = /<image_request_error\b[\s\S]*?<\/image_request_error>/i
  const tail = content.slice(markerIndex + marker.length)
  const match = tail.match(re)
  if (!match || match.index === undefined) return null
  const start = markerIndex
  const end = markerIndex + marker.length + match.index + match[0].length
  return content.slice(0, start) + replacement + content.slice(end)
}

export function escapeAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function escapeText(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function parseAttrs(input: string): Record<string, string> {
  const attrs: Record<string, string> = {}
  const re = /([A-Za-z_:][\w:.-]*)\s*=\s*"([^"]*)"/g
  let match: RegExpExecArray | null
  while ((match = re.exec(input)) !== null) {
    attrs[match[1]] = match[2]
  }
  return attrs
}

function firstTagText(body: string, tag: string): string | undefined {
  const re = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i')
  const match = body.match(re)
  return match?.[1]?.trim()
}

function stripKnownTags(body: string): string {
  return body
    .replace(/<\/?(?:scene_brief|context_caption|prompt|negative)\b[^>]*>/gi, '')
    .trim()
}

function clampInt(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min
  return Math.max(min, Math.min(max, Math.round(value)))
}

export function findSlotMarkupRange(content: string, record: SlotRecord): { start: number; end: number } | null {
  const located = findFirstMarker(content, slotCommentVariants(record, record.slot))
  if (!located) return null
  const { marker, markerIndex } = located

  const tail = content.slice(markerIndex + marker.length)
  const ownedMarkup = record.target === 'twitter.media'
    ? tail.match(/^\s*<tw_media\b[\s\S]*?<\/tw_media>/i)
    : record.target === 'instagram.single'
      ? tail.match(/^\s*<image\b[\s\S]*?<\/image>/i)
      : record.target === 'instagram.carousel'
        ? tail.match(/^\s*<ig_slide\b[\s\S]*?<\/ig_slide>/i)
        : record.target === 'smartphone.message-image'
          ? tail.match(/^\s*<s_img\b[\s\S]*?<\/s_img>/i)
          : record.target === 'kakao.image'
            ? tail.match(/^\s*<k_img\b[\s\S]*?<\/k_img>/i)
            : record.target === 'prose.illustration'
              ? (
                tail.match(/^\s*!\[reverie-relay\]\([^)\s]+\)/i) ||
                tail.match(/^\s*<scene_image\b[\s\S]*?<\/scene_image>/i)
              )
              : record.target.startsWith('custom.')
                ? tail.match(/^\s*<img\b[^>]*(?:data-dgir-key|data-dgir-request-id|data-dgir-custom-target)=["'][^"']+["'][^>]*>/i)
                : null

  if (!ownedMarkup || ownedMarkup.index === undefined) return null
  const end = markerIndex + marker.length + ownedMarkup.index + ownedMarkup[0].length
  return { start: markerIndex, end }
}

export function findErrorMarkupRange(content: string, record: SlotRecord): { start: number; end: number } | null {
  const job: RouterJob = {
    chatId: record.chatId, messageId: record.messageId, swipeId: record.swipeId,
    requestId: record.requestId, target: record.target, count: record.count || 1,
    slots: [record.slot], alt: record.alt || '', caption: record.caption, time: record.time,
    aspect: record.requestAspect, originalSceneBrief: record.originalSceneBrief || '',
    originalNegativePrompt: record.originalNegativePrompt || '', originalRequestXml: record.originalRequestXml || '',
  }
  const located = findFirstMarker(content, errorCommentVariants(job, record.slot))
  if (!located) return null
  const tail = content.slice(located.markerIndex + located.marker.length)
  const match = tail.match(/^\s*<image_request_error\b[\s\S]*?<\/image_request_error>/i)
  if (!match || match.index === undefined) return null
  return {
    start: located.markerIndex,
    end: located.markerIndex + located.marker.length + match.index + match[0].length,
  }
}

export function removeSlotMarkup(content: string, record: SlotRecord): string | null {
  const range = findSlotMarkupRange(content, record)
  if (!range) return null
  return content.slice(0, range.start) + content.slice(range.end)
}
