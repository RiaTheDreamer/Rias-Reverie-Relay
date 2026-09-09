declare const spindle: import('lumiverse-spindle-types').SpindleAPI

type LlmMessage = import('lumiverse-spindle-types').LlmMessageDTO

import {
  parseImageRequests,
  parseRouterMarkers,
  mergeMissingSlotRecords,
  selectRescanSwipeRows,
  replaceErrorAfterComment,
  removeSlotMarkup,
  findSlotMarkupRange,
  findErrorMarkupRange,
  replaceImageUrlAfterSlotComment,
  replaceResolvedSlotAfterComment,
  renderFailureMarkup,
  renderResolvedMarkup,
  contentFingerprint,
  isImageTarget,
  ROUTER_COMMENT,
  errorComment,
  slotComment,
  slotCommentVariants,
  errorCommentVariants,
  findFirstMarker,
  slotKey,
  slotsForRequest,
  targetApp,
  normalizeImageIntent,
  sanitizeRelayPromptHistoryText,
  isSpecialImageIntent,
  type ImageIntent,
  type ImageTarget,
  type GenerationSnapshot,
  type AttemptHistoryEntry,
  type PromptPipeline,
  type PromptWarning,
  type RouterJob,
  type SlotGenerationMode,
  type SlotGenerationResult,
  type SlotRecord,
  type RelayCandidate,
  type RelayCandidateBatch,
  type RelayBatchSummary,
  type GenerationProfile,
  type AssetLibraryFilters,
  type AssetLibraryState,
  type AppearanceCharacterSheet,
  type AppearanceFactCategory,
  type AppearanceSourceType,
  type AppearanceSuggestion,
  type AppearanceVaultFact,
  type AppearanceVaultLayer,
  type CanonicalVisualCharacter,
  type ContinuityDecision,
  type ContinuityFact,
  type ContinuityStrength,
  type ContinuityVaultState,
  type VaultMigrationDisposition,
  type CustomSurfaceDefinition,
  type CustomSurfaceStudioState,
  type SurfaceShellMode,
  type SurfaceColorMode,
  type SurfaceRendererMode,
  type SurfacePromptCategory,
  type SurfaceUtilityInjectionPosition,
  type GenerationLoraEntry,
  type ImageProviderInfo,
  type GenerationRecipe,
  type RelayExperienceMode,
  type BackgroundQueueItem,
  type BackgroundQueueState,
  type BackgroundQueueStage,
  type GalleryLinkRequest,
  type GalleryLinkStatus,
  type DryRunReport,
  type GenerationBlocker,
  type PromptPresetProfile,
  type PromptProfileDecision,
  type PromptProfileId,
  type PersonaPovContext,
  type ProseIllustrationAnchor,
  type ProseIllustrationOpportunity,
  type ProseIllustrationPlan,
  type ProseIllustrationRecord,
  type ProseIllustratorMode,
  type ProseIllustratorPeoplePolicy,
  type ProseIllustratorSettings,
  type ProseIllustratorState,
  type ProsePromptComposition,
  type QueueDirectorState,
  type RegenerationIntent,
  type RegenerationIntentId,
  type SlotDiagnostic,
  type VersionTree,
  type VersionTreeNode,
  type VisualAssetReference,
} from './contracts'
import { canAbortSlotStatus, isGenerationActiveStatus, isSlotLifecycleActive } from './slotLifecycle'
import { BoundedLruCache } from './boundedCache'
import { abortableSlotKeys, C5B_CACHE_LIMITS, healthCheck, rememberBoundedMap, summarizeRelayHealth, type RelayHealthCheck } from './c5bReliability'
import { c5aCastRequirements, enforceC5AKnownIdentity, resolveC5ANativeIdentityBinding, type C5ANativeIdentityBinding } from './c5aIdentity'
import { buildAppearanceSidecarPayload, ingestAppearanceSidecarObservations, normalizeAppearanceSidecarOutput, preserveCompleteSidecarContext } from './appearanceSidecar'
import { assertModelContextBudget, invalidateContextSnapshots, measureModelMessages, selectExcerpts, selectLorebookContext, visualSourceSnapshot, type ContextMetrics } from './contextBudget'
import { BUILD_ID, EXTENSION_VERSION } from './build'
import { hybridSurfaceOwner, REVIEWED_REGEX_SURFACE_IDS, shippedSurfaceDefinitions, SHIPPED_SURFACE_SPECS } from './shippedSurfaceDefinitions'
import { r45SupplementalSurfaceDefinitions } from './r45SurfaceCatalog'
import { hasR45UtilityContract, r45UtilityContract } from './r45UtilityContracts'
import { assertProviderRequestSafe } from './providerPromptSafety'
import { imageProviderSupportsStreaming } from './imageStreaming'
import { normalizeSurfaceDocument } from './surfaceXml'
import { bracketSurfacePromptModule } from './bracketSurfaceAuthoring'
import { r45SurfaceAuthorityPack, r45SurfaceAuthorityScripts } from './r45SurfaceAuthority'
import { buildCharacterPhoneRuntimeDirective, normalizeCharacterPhoneDefaultApps, type CharacterPhoneAppId } from './characterPhoneConfig'
import { DEFAULT_EXPLICIT_SCENE_NEGATIVE_GUIDANCE, DEFAULT_EXPLICIT_SCENE_POSITIVE_GUIDANCE, DEFAULT_ILLUSTRATOR_FRAMING_PROMPTS, DEFAULT_PROMPT_REGISTRY, DEFAULT_PROMPT_REGISTRY_VERSIONS, DEFAULT_SURFACE_PROMPT_MODULES, ILLUSTRATOR_FRAMING_REGISTRY_ALIASES, PROSE_ILLUSTRATOR_PERSPECTIVE_MODE_ALIASES, PROMPT_REGISTRY_DEFINITIONS, REVERIE_ARTIFACT_MEDIA_PROTOCOL, REVERIE_SURFACE_UTILITY_TEMPLATE, REVERIE_ILLUSTRATION_PROTOCOL, REVERIE_RELAY_PLANNED_PROTOCOL, REVERIE_SURFACE_PROTOCOL } from './protocols'
import { characterProfilePortraitHasExactRelayImage, NATIVE_SURFACE_ROOT_TAGS, normalizeCharacterProfileContract, renderNativeSurfaceMarkup } from './nativeSurfaces'
import {
  buildNarrativeUtilityPrompt,
  inspectNarrativeRegex,
  reconcileNarrativeRegex,
  removeNarrativeRegex,
  type NarrativeDlcHealth,
} from './narrativeDlcRuntime'
import { NARRATIVE_REGEX_VARIANTS, containsNarrativeRegexMarkup, narrativeRegexScripts, narrativeUtilityNames, renderNarrativeRegex, shouldRelayRenderNarrativeMarkup, type NarrativeLorebookKind, type NarrativeRegexVariant } from './narrativeRegexAssets'
import { exportNarrativeLorebookRecord, extractNarrativeLorebookRecord } from './narrativeLorebook'
import {
  acceptSuggestion,
  addAppearanceFact,
  addAppearanceSuggestion,
  allAppearanceFacts,
  applyMigrationPreview,
  buildMigrationPreview,
  classifyAppearanceValue,
  clearCurrentAppearance,
  emptyContinuityVault,
  expireCurrentAppearance,
  extractAppearanceTraitPhrases,
  findAppearanceFact,
  formatSelectedAppearanceFacts,
  appearanceFactDescriptor,
  isValidCanonicalCharacterName,
  mergeAppearanceFacts,
  mergeCharacters,
  moveAppearanceFact,
  normalizeContinuityVault,
  registerCanonicalCharacter,
  rejectSuggestion,
  removeAppearanceFact,
  resolveCanonicalCharacter,
  saveManualAppearanceMemory,
  selectContinuityForSubjects,
  suggestionFromGeneratedPrompt,
  updateMigrationItem,
} from './vault'

const UTILITY_STATE_ID = '__reverie_relay_utility__'

type ChatMessage = {
  id: string
  role: string
  content: string
  swipe_id?: number
  swipes?: string[]
  swipe_dates?: number[]
  metadata?: Record<string, unknown>
  extra?: Record<string, unknown>
  is_user?: boolean
}

type ParserConnection = {
  id: string
  name: string
  provider: string
  model: string
}

export type ImageConnection = {
  id: string
  name?: string
  provider: string
  api_url?: string
  model?: string
  is_default?: boolean
  default_parameters?: Record<string, unknown>
  metadata?: Record<string, unknown>
}

export type NativeImageSettings = {
  [key: string]: unknown
  promptMode?: string
  activePromptPresetId?: string | null
  customPrompt?: string
  customNegativePrompt?: string
  negativePrompt?: string
  promptParserConnectionId?: string | null
  promptParserModel?: string
  promptParserParameters?: Record<string, unknown>
  activeImageGenConnectionId?: string | null
  model?: string
  parameters?: Record<string, unknown>
  includeCharacters?: boolean
  includePersona?: boolean
  promptPresets?: Array<Record<string, unknown>>
  activeLoraPresetId?: string | null
  loraPresets?: Array<Record<string, unknown>>
  bypassActiveLoraPreset?: boolean
  loraStrengthScale?: number
}

type NativeSettingsSnapshot = {
  settings: NativeImageSettings
  capturedAt: number
}

const ORB_DESIGNS = [
  'classic',
  'minimal',
  'glow',
  'glass',
  'prism-flower',
  'lunar-crescent',
  'starlit-ring',
  'fourpetal-seal',
  'custom',
] as const

type OrbDesign = typeof ORB_DESIGNS[number]

type RelayLoraStack = {
  id: string
  name: string
  loras: Array<{ lora_name: string; weight_model: number; weight_clip: number }>
  baseTags: string
  createdAt: number
  updatedAt: number
}

type RouterConfig = {
  enabled: boolean
  autoGenerate: boolean
  slotGenerationMode: SlotGenerationMode
  debugLogging: boolean
  highResMode: boolean
  enableRelayOrb: boolean
  tutorialModeEnabled: boolean
  tutorialStep: number
  autoRescanOnChatOpen: boolean
  includeInactiveSwipesInRescan: boolean
  followNativeParser: boolean
  followNativeImageGen: boolean
  generationSettingsSource: 'native' | 'relay'
  loraSource: 'native' | 'relay' | 'none'
  vaultStrength: ContinuityStrength
  parserConnectionId: string | null
  parserModel: string
  parserParameters: Record<string, unknown>
  appearanceSidecarConnectionId: string | null
  appearanceSidecarModel: string
  appearanceSidecarParameters: Record<string, unknown>
  parserRetries: number
  includeRecentMessages: number
  includeCharacterInfo: boolean
  includePersonaInfo: boolean
  includeLorebook: boolean
  customParserInstructions: string
  imageConnectionId: string | null
  imageModel: string
  imageParameters: Record<string, unknown>
  imageLoraStack: Array<{ lora_name: string; weight_model: number; weight_clip: number }>
  relayLoraStacks: RelayLoraStack[]
  activeRelayLoraStackId: string | null
  nativePromptMode: string
  nativePromptPresetId: string | null
  nativeCustomPrompt: string
  nativeNegativePrompt: string
  additionalNegativePrompt: string
  nativeIncludeCharacters: boolean
  nativeIncludePersona: boolean
  nativeCharacterPrompt: string
  nativePersonaPrompt: string
  nativePromptPresets: Array<Record<string, unknown>>
  nativeImageSettingsSnapshot: Record<string, unknown>
  nativeSettingsCapturedAt: number
  interfaceTheme: 'velvet-prism' | 'clean-panel'
  orbPositionDesktop: { x: number; y: number }
  orbPositionMobile: { x: number; y: number }
  orbSize: 'small' | 'medium' | 'large'
  orbDesign: OrbDesign
  orbCustomIconDataUrl: string
  lastActiveDrawerTab: string
  defaultPromptProfileId: PromptProfileId
  promptProfiles: PromptPresetProfile[]
  chatGenerationProfiles: Record<string, GenerationProfile>
  defaultGenerationProfile: GenerationProfile
  defaultCandidateCount: 1 | 2 | 4
  queueConcurrencyLimit: number
  objectEnvironmentPersonSuppression: boolean
  experienceMode: RelayExperienceMode
  nativeAutoGenerationGuard: boolean
  nativeAutoGenerationPreviousValue: boolean | null
  nativeAutoGenerationGuardOwned: boolean
  galleryAutoLink: boolean
  generationRecipes: GenerationRecipe[]
  activeGenerationRecipeId: string | null
  surfaceRendererMode: SurfaceRendererMode
  surfaceDefaultShellMode: SurfaceShellMode
  surfaceColorMode: SurfaceColorMode
  surfaceUtilityInjectionEnabled: boolean
  surfacePreferencesInitialized: boolean
  narrativeDlcEnabled: boolean
  narrativeDlcVariant: NarrativeRegexVariant
  narrativeDlcUtilityNames: string[]
  characterPhoneDefaultApps: CharacterPhoneAppId[]
  narrativeDlcLastSync: NarrativeDlcHealth | null
  globalSurfaceStudio: CustomSurfaceStudioState
  proseIllustratorSettings: ProseIllustratorSettings
}

function narrativeVariantForSurfaceShellMode(shellMode: SurfaceShellMode): NarrativeRegexVariant {
  if (shellMode === 'sparkling') return 'sparkle-button'
  if (shellMode === 'plain') return 'plain-button'
  return 'inline'
}

function sanitizeRelayPromptMessage(message: LlmMessage): LlmMessage {
  if (typeof message.content === 'string') {
    return { ...message, content: sanitizeRelayPromptHistoryText(message.content) }
  }
  return {
    ...message,
    content: message.content.map(part =>
      part.type === 'text' && typeof part.text === 'string'
        ? { ...part, text: sanitizeRelayPromptHistoryText(part.text) }
        : part,
    ),
  }
}

type ProseMessagePickerRow = {
  messageId: string
  activeSwipeId: number
  order: number
  timestamp?: number
  excerpt: string
  contentLength: number
  illustrationCount: number
  opportunityCount: number
  stale: boolean
  eligible: boolean
  ineligibilityReason?: string
  latest: boolean
}

type ProseBeatPickerRow = {
  paragraphIndex: number
  excerpt: string
  paragraphFingerprint: string
  previousParagraphFingerprint?: string
  nextParagraphFingerprint?: string
  utilityMarkup: boolean
  adjacentIllustration: boolean
  eligible: boolean
}

type RouterLogEntry = {
  id: string
  timestamp: number
  severity: 'debug' | 'info' | 'warning' | 'error'
  stage: string
  eventType: string
  extensionVersion: string
  backendBuildId: string
  frontendBuildId?: string
  chatId?: string
  messageId?: string
  swipeId?: number
  requestId?: string
  slot?: string
  target?: string
  attemptNumber?: number
  triggerType?: string
  provider?: string
  connectionId?: string | null
  connectionName?: string
  model?: string
  statusBefore?: string
  statusAfter?: string
  message?: string
  errorName?: string
  errorMessage?: string
  stack?: string
  durationMs?: number
  validationResult?: string
  toastShown?: boolean
  toastDeduplicated?: boolean
  details?: Record<string, unknown>
}

type ReconciliationSummary = {
  checked: number
  valid: number
  orphanedFound: number
  orphanedRemoved: number
  deletedMessageRemoved: number
  deletedSwipeRemoved: number
  malformed: number
  retainedForManualReview: number
  reconciledAt: number
}

type ChatRescanSummary = {
  messagesScanned: number
  activeSwipesScanned: number
  inactiveSwipesScanned: number
  unresolvedRequestsFound: number
  resolvedMarkersFound: number
  errorMarkersFound: number
  existingSlotsSkipped: number
  recoveredPending: number
  recoveredCompleted: number
  recoveredFailed: number
  imageUnavailable: number
  malformedSources: number
  inactiveRecordsRecovered: number
  durationMs: number
  recoveredKeys: string[]
}

type RescanDiscovery = {
  key: string
  record: SlotRecord
  kind: 'pending' | 'completed' | 'unavailable' | 'failed'
}

type RescanMalformed = {
  messageId: string
  swipeId: number
  requestId?: string
  slot?: string
  message: string
  details: Record<string, unknown>
}

type StateFile = {
  schemaVersion: number
  revision: number
  clearedAt?: number
  suppressedContentFingerprints: Record<string, string>
  slots: Record<string, SlotRecord>
  logs: RouterLogEntry[]
  lastReconciledAt: number
  lastReconciliation?: ReconciliationSummary
  candidateBatches: Record<string, RelayCandidateBatch>
  queueDirector: QueueDirectorState
  assetLibrary: AssetLibraryState
  versionTrees: Record<string, VersionTree>
  continuityVault: ContinuityVaultState
  customSurfaces: CustomSurfaceStudioState
  surfacePresetBindingId?: string
  proseIllustrator: ProseIllustratorState
  backgroundQueue: BackgroundQueueState
  galleryLinks: Record<string, GalleryLinkRequest>
  lastDryRun: DryRunReport | null
  lastGenerationBlockers: GenerationBlocker[]
}

type BackendStateMessage = {
  type: 'state'
  chatId: string | null
  records: SlotRecord[]
  config: RouterConfig
  parserConnections: ParserConnection[]
  imageConnections: ImageConnection[]
  imageProviders: ImageProviderInfo[]
  logs: RouterLogEntry[]
  candidateBatches: RelayCandidateBatch[]
  queueDirector: QueueDirectorState
  assetLibrary: AssetLibraryState
  versionTrees: VersionTree[]
  continuityVault: ContinuityVaultState
  customSurfaces: CustomSurfaceStudioState
  proseIllustrator: ProseIllustratorState
  backgroundQueue: BackgroundQueueState
  galleryLinks: GalleryLinkRequest[]
  lastDryRun: DryRunReport | null
  lastGenerationBlockers: GenerationBlocker[]
  schemaVersion: number
  revision: number
  build: BackendBuildInfo
}

type BackendBuildInfo = {
  extensionVersion: string
  buildId: string
  loadedAt: number
  lastResponseAt: number
}

type FrontendMessage =
  | { type: 'list_state'; chatId?: string | null }
  | {
    type: 'scan_message'
    chatId: string
    messageId?: string | null
    swipeId?: number
    sourceContent?: string
    nativeImageSettings?: NativeImageSettings
    nativeSettingsCapturedAt?: number
  }
  | { type: 'sync_native_settings'; chatId?: string | null; imageGeneration?: NativeImageSettings }
  | { type: 'set_config'; chatId?: string | null; patch: Partial<RouterConfig> }
  | { type: 'narrative_dlc_action'; chatId?: string | null; action: 'install' | 'repair' | 'inspect' | 'remove'; variant?: NarrativeRegexVariant }
  | { type: 'export_narrative_lorebook'; requestId: string; chatId: string; messageId: string; swipeId?: number; kind: NarrativeLorebookKind; occurrence?: number }
  | { type: 'surface_prompt_preview'; chatId?: string | null; requestId: string }
  | { type: 'regenerate_slot'; key: string; submissionId?: string; highResMode?: boolean; useCurrentNativeSettings?: boolean; nativeImageSettings?: NativeImageSettings; nativeSettingsCapturedAt?: number }
  | { type: 'regenerate_with_intent'; key: string; submissionId?: string; intent: RegenerationIntent; candidateCount?: 1 | 2 | 4; nativeImageSettings?: NativeImageSettings; nativeSettingsCapturedAt?: number }
  | { type: 'reparse_slot'; key: string; submissionId?: string; useCurrentNativeSettings?: boolean; nativeImageSettings?: NativeImageSettings; nativeSettingsCapturedAt?: number }
  | { type: 'reparse_chat_slots'; chatId: string; nativeImageSettings?: NativeImageSettings; nativeSettingsCapturedAt?: number }
  | { type: 'retry_failed'; chatId: string }
  | { type: 'rescan_chat'; chatId: string; automatic?: boolean; includeInactiveSwipes?: boolean }
  | { type: 'generate_recovered'; key: string; nativeImageSettings?: NativeImageSettings; nativeSettingsCapturedAt?: number }
  | { type: 'generate_all_recovered'; chatId: string; nativeImageSettings?: NativeImageSettings; nativeSettingsCapturedAt?: number }
  | { type: 'rebuild_request'; key: string; sceneBrief: string; negativePrompt: string; aspect?: string; imageIntent?: ImageIntent; highResMode: boolean; generate: boolean; nativeImageSettings?: NativeImageSettings; nativeSettingsCapturedAt?: number }
  | { type: 'edit_prompt'; key: string; prompt: string; negativePrompt: string; imageIntent?: ImageIntent; useCurrentNativeSettings?: boolean; nativeImageSettings?: NativeImageSettings; nativeSettingsCapturedAt?: number }
  | { type: 'restore_history'; chatId: string; key: string; historyIndex: number }
  | { type: 'retry_placement'; key: string; submissionId?: string }
  | { type: 'discard_pending_placement'; key: string }
  | { type: 'reconcile_state'; chatId: string; messageId?: string }
  | { type: 'cleanup'; chatId: string; scope: 'slot' | 'message' | 'chat'; action: 'remove' | 'remove_with_history' | 'clear_error' | 'clear_failed' | 'clear_completed' | 'clear_cancelled' | 'clear_orphaned' | 'clear_all' | 'clear_logs'; key?: string; messageId?: string }
  | { type: 'reparse_preview'; key: string }
  | { type: 'generate_preview'; key: string; prompt: string; negativePrompt: string; useCurrentNativeSettings?: boolean; nativeImageSettings?: NativeImageSettings; nativeSettingsCapturedAt?: number }
  | { type: 'preview_action'; key: string; action: 'accepted' | 'cancelled' }
  | { type: 'relay_batch_start'; chatId: string; candidateCount?: 1 | 2 | 4; intent?: RegenerationIntent; selectedKeys?: string[]; nativeImageSettings?: NativeImageSettings; nativeSettingsCapturedAt?: number }
  | { type: 'relay_replace_selected'; chatId: string; batchId: string; candidateKeys: string[] }
  | { type: 'relay_discard_batch'; chatId: string; batchId: string }
  | { type: 'relay_retry_candidate'; chatId: string; batchId: string; candidateKey: string; nativeImageSettings?: NativeImageSettings; nativeSettingsCapturedAt?: number }
  | { type: 'relay_discard_candidate'; chatId: string; batchId: string; candidateKey: string }
  | { type: 'queue_action'; chatId: string; action: 'pause_after_current' | 'resume' | 'cancel_selected' | 'skip_selected' | 'generate_selected_only' | 'abort_all'; selectedKeys?: string[]; concurrencyLimit?: number; nativeImageSettings?: NativeImageSettings; nativeSettingsCapturedAt?: number }
  | { type: 'asset_library_action'; chatId: string; action: 'favorite' | 'unfavorite' | 'mark_reference' | 'clear_reference' | 'tag' | 'untag' | 'compare' | 'clear_compare'; assetId?: string; otherAssetId?: string; tag?: string }
  | { type: 'reuse_asset_in_slot'; chatId: string; key: string; assetId: string }
  | { type: 'discover_lora_catalog'; requestId: string; connectionId?: string | null }
  | { type: 'continuity_action'; chatId: string; action: 'set_strength' | 'create_character' | 'merge_characters' | 'merge_facts' | 'pin' | 'unpin' | 'exclude' | 'include' | 'remove' | 'edit_fact' | 'move_fact' | 'quarantine_fact' | 'ignore_slot' | 'clear_ignore_slot' | 'add_fact' | 'mark_break' | 'clear_current' | 'accept_suggestion' | 'reject_suggestion' | 'move_suggestion_current' | 'move_suggestion_wardrobe' | 'update_migration_item' | 'apply_migration' | 'save_character_sheet' | 'delete_character_sheet' | 'update_character_aliases' | 'delete_character' | 'add_alternate_look' | 'remove_alternate_look' | 'activate_alternate_look' | 'return_to_base'; factId?: string; factIds?: string[]; suggestionId?: string; migrationItemId?: string; selectedMigrationItemIds?: string[]; disposition?: VaultMigrationDisposition; key?: string; strength?: ContinuityStrength; characterId?: string; targetCharacterId?: string; characterName?: string; aliases?: string[]; layer?: AppearanceVaultLayer; category?: AppearanceFactCategory; sourceType?: AppearanceSourceType; value?: string; booruTags?: string; currentOutfitTags?: string; negativeIdentityTags?: string; referenceAssetIds?: string[]; lookId?: string; lookName?: string; assetId?: string; reason?: string; note?: string; permanence?: 'permanent' | 'temporary'; defaultWardrobe?: boolean; currentWardrobe?: boolean }
  | { type: 'prose_illustrator_action'; chatId: string; action: 'set_settings' | 'preview_prompt' | 'plan_latest' | 'plan_message' | 'relay_plan_once' | 'generate_plan' | 'cancel_active' | 'remove_illustration' | 'pause_auto' | 'resume_auto'; messageId?: string; swipeId?: number; planId?: string; illustrationId?: string; settings?: Partial<ProseIllustratorSettings>; nativeImageSettings?: NativeImageSettings; nativeSettingsCapturedAt?: number }
  | { type: 'custom_surface_action'; chatId?: string; action: 'create' | 'duplicate' | 'edit' | 'enable' | 'disable' | 'delete' | 'import' | 'activate' | 'set_renderer_mode' | 'set_default_shell_mode' | 'set_color_mode' | 'set_hybrid_owner' | 'set_prompt_enabled' | 'set_category_prompt_enabled' | 'set_prompt_module' | 'set_utility_settings' | 'reset_utility_template' | 'save_collection' | 'set_default_collection' | 'delete_collection' | 'bind_collection' | 'unbind_collection'; surfaceId?: string; definition?: Partial<CustomSurfaceDefinition>; rendererMode?: CustomSurfaceStudioState['rendererMode']; hybridOwner?: CustomSurfaceDefinition['hybridOwner']; shellMode?: SurfaceShellMode; colorMode?: SurfaceColorMode; promptEnabled?: boolean; promptCategory?: SurfacePromptCategory; promptModule?: string; utilityInjectionEnabled?: boolean; utilityInjectionPosition?: SurfaceUtilityInjectionPosition; utilityTemplate?: string; presetId?: string; presetName?: string; surfaceIds?: string[] }
  | { type: 'bulk_chat_media_action'; chatId: string; lane: 'surfaces' | 'illustrations'; mode: 'remove-images-keep-slots' | 'remove-images-and-slots' }
  | { type: 'native_surface_action'; chatId: string; messageId: string; action: 'delete' | 'edit'; requestId?: string; rootTag?: string; surfaceId?: string; originalMarkup?: string; replacementMarkup?: string }
  | { type: 'remove_slot_image'; chatId: string; key: string }
  | { type: 'gallery_link_result'; chatId?: string | null; linkId: string; ok: boolean; galleryItemId?: string; error?: string }
  | { type: 'dry_run'; chatId?: string | null; kind: 'slot' | 'prose-plan'; key?: string; planId?: string; prompt?: string; negativePrompt?: string; nativeImageSettings?: NativeImageSettings; nativeSettingsCapturedAt?: number }
  | { type: 'full_complete_dry_run'; chatId?: string | null; runtimeHealth?: Record<string, unknown>; nativeImageSettings?: NativeImageSettings; nativeSettingsCapturedAt?: number }
  | { type: 'explain_no_generation'; chatId?: string | null; scope: 'slot' | 'illustrator' | 'auto'; key?: string; planId?: string }
  | { type: 'self_test'; chatId?: string | null; frontendBuildId?: string; frontendLoadedAt?: number; nativeSettingsAvailable?: boolean }
  | { type: 'show_toast'; level: 'info' | 'success' | 'warning' | 'error'; message: string }

type PreparedPrompt = {
  prompt: string
  negativePrompt: string
  promptMode: string
  promptPresetId: string | null
  parserUsed: boolean
  parserOutput: string
  parserConnectionId: string | null
  parserModel: string
  parserParameters: Record<string, unknown>
  promptPipeline: PromptPipeline
}

type ParserContextResult = {
  contextMetrics?: Partial<ContextMetrics>
  context: string
  rawTemplate: string
  resolvedTemplate: string
  characterContext: string
  personaContext: string
  unresolvedMacros: string[]
  classification: RequestClassification
  nativeIncludeCharacters: boolean
  nativeIncludePersona: boolean
  effectiveIncludeCharacters: boolean
  effectiveIncludePersona: boolean
  gatingReason: string
  sanitizedRecentContext: string
  visualSubjects: VisualSubjectPrompt[]
  subjectNegativePrompt: string
  includedContinuityFacts: ContinuityFact[]
  excludedContinuityFacts: ContinuityDecision[]
  attachedReferenceAssetIds: string[]
  continuityConflicts: string[]
  continuityStrength: ContinuityStrength
  identityBindings: C5ANativeIdentityBinding[]
  identityFallbacks: string[]
  appearanceRevision: number
}

type VisualSubjectPrompt = {
  id?: string
  name: string
  kind: string
  prompt: string
  negativePrompt: string
}

export type RequestClassification =
  | 'character portrait' | 'person-focused candid' | 'group photo' | 'object photo'
  | 'location/interior' | 'food' | 'meme' | 'document' | 'screenshot/article/ui' | 'evidence photo'
  | 'scenery' | 'abstract/non-character' | 'selfie'

type TargetHumanPolicy = {
  targetClass: 'character' | 'group' | 'object' | 'location' | 'document' | 'screenshot/article/ui'
  allowHumanContext: boolean
  allowHumanPrompt: boolean
  noHumanGuardrails: string
}

type ImagePlan = {
  connection: ImageConnection | null
  connectionId: string | null
  connectionName: string
  provider: string
  model: string
  nativeImageSettings: Record<string, unknown>
  nativeSettingsCapturedAt?: number
  connectionDefaultParameters: Record<string, unknown>
  nativeActiveParameters: Record<string, unknown>
  slotOverrides: Record<string, unknown>
  finalParameters: Record<string, unknown>
  settingsSource: GenerationSnapshot['finalImageSettingsSource']
  nativeActiveLoraPreset: Record<string, unknown> | null
  effectiveAppliedLoraPreset: Record<string, unknown> | null
  effectiveLoras: Array<{ lora_name: string; weight_model: number; weight_clip: number }>
  loraBaseTags: string
  effectiveBaseTags: string
  omittedBaseTags: Array<{ tag: string; group: string; reason: string }>
  highResMode: boolean
  highResRetainedBaseTags: string[]
  highResPreservedFramingCues: string[]
  lorasSentToProvider: unknown
  loraOmittedFields: string[]
  recipeId?: string
  recipeName?: string
  recipePositivePrompt?: string
  recipeNegativePrompt?: string
  userPositivePromptPrefix: string
  userNegativePromptPrefix: string
}

type ImageGenerationStreamContext = {
  chatId?: string
  generationId: string
  source: 'relay-slot' | 'relay-illustrator' | 'relay-candidate'
  slotKey?: string
  requestId?: string
  addToGallery?: boolean
}

type JobTrigger = NonNullable<GenerationSnapshot['triggerType']>

export const BUILT_IN_PROMPT_PROFILES: PromptPresetProfile[] = [
  {
    id: 'auto', name: 'Auto', builtIn: true, promptAdditions: '', negativeAdditions: '',
    contextPolicy: 'auto', framingGuidance: 'Classify the request from target, scene brief, visible subjects, and social framing.',
    characterContextPolicy: 'auto', continuityStrength: 'medium', defaultAspectBehavior: 'request',
    promptCleanupRules: ['auto-classify', 'remove-contradictory-portrait-tags-for-object-environment'],
    compatibleTargets: ['twitter.media', 'instagram.single', 'instagram.carousel', 'smartphone.message-image', 'kakao.image', 'prose.illustration'],
  },
  {
    id: 'character-portrait', name: 'Character Portrait', builtIn: true,
    promptAdditions: 'identity-focused character image, consistent facial features, outfit continuity, expressive but natural pose',
    negativeAdditions: 'wrong identity, inconsistent eye color, inconsistent hair, distorted face',
    contextPolicy: 'character', framingGuidance: 'Prioritize the named character identity, expression, outfit, and pose.',
    characterContextPolicy: 'preserve', continuityStrength: 'high', defaultAspectBehavior: 'request',
    promptCleanupRules: ['preserve-character-identity'], compatibleTargets: ['twitter.media', 'instagram.single', 'instagram.carousel', 'smartphone.message-image', 'kakao.image', 'prose.illustration'],
  },
  {
    id: 'selfie', name: 'Selfie', builtIn: true,
    promptAdditions: 'front-facing camera output, natural arm-length self-taken framing, direct intimate composition, device outside the frame',
    negativeAdditions: 'visible phone, hand holding phone, arm in frame, phone device, phone screen, camera body, studio portrait, impossible angle, detached limb, overprocessed beauty filter',
    contextPolicy: 'auto', framingGuidance: 'Render the image produced by the subject’s front-facing camera with the capture device outside the frame. Visible hardware appears only for an explicitly requested mirror selfie or device-focused composition.',
    characterContextPolicy: 'preserve', continuityStrength: 'medium', defaultAspectBehavior: 'portrait',
    promptCleanupRules: ['preserve-phone-framing'], compatibleTargets: ['smartphone.message-image', 'kakao.image', 'instagram.single', 'twitter.media'],
  },
  {
    id: 'social-candid', name: 'Social Candid', builtIn: true,
    promptAdditions: 'natural candid social-photo timing, believable ambient lighting, casual framing',
    negativeAdditions: 'stiff posed portrait, studio backdrop, artificial glamour shoot',
    contextPolicy: 'auto', framingGuidance: 'Preserve candid/social intent and target-specific camera behavior.',
    characterContextPolicy: 'auto', continuityStrength: 'medium', defaultAspectBehavior: 'request',
    promptCleanupRules: ['avoid-studio-override'], compatibleTargets: ['twitter.media', 'instagram.single', 'instagram.carousel', 'smartphone.message-image', 'kakao.image'],
  },
  {
    id: 'object-prop', name: 'Object / Prop', builtIn: true,
    promptAdditions: 'clear object-focused composition, readable surface detail',
    negativeAdditions: 'person, face, portrait, hands covering the object',
    contextPolicy: 'minimal', framingGuidance: 'Make the object or prop the subject. Remove contradictory portrait-positive language.',
    characterContextPolicy: 'suppress-unless-explicit', continuityStrength: 'low', defaultAspectBehavior: 'request',
    promptCleanupRules: ['remove-portrait-positive-tags', 'suppress-character-appearance'],
    compatibleTargets: ['twitter.media', 'instagram.single', 'instagram.carousel', 'smartphone.message-image', 'kakao.image', 'prose.illustration'],
  },
  {
    id: 'environment-location', name: 'Environment / Location', builtIn: true,
    promptAdditions: 'environment-focused composition, spatial continuity, readable location details',
    negativeAdditions: 'portrait subject, detailed face, person blocking the location',
    contextPolicy: 'minimal', framingGuidance: 'Make the place, room, or environment the subject.',
    characterContextPolicy: 'suppress-unless-explicit', continuityStrength: 'medium', defaultAspectBehavior: 'landscape',
    promptCleanupRules: ['remove-portrait-positive-tags', 'suppress-character-appearance'],
    compatibleTargets: ['twitter.media', 'instagram.single', 'instagram.carousel', 'smartphone.message-image', 'kakao.image', 'prose.illustration'],
  },
  {
    id: 'evidence-surveillance', name: 'Evidence / Surveillance', builtIn: true,
    promptAdditions: 'distant candid evidence capture, imperfect candid capture produced by a phone camera, device outside the frame, preserved obstruction and timing',
    negativeAdditions: 'studio portrait, centered glamour close-up, cinematic portrait lighting',
    contextPolicy: 'auto', framingGuidance: 'Keep the evidence/surveillance framing legible while preserving requested imperfections.',
    characterContextPolicy: 'auto', continuityStrength: 'medium', defaultAspectBehavior: 'request',
    promptCleanupRules: ['soften-polish-conflicts', 'preserve-imperfect-framing'],
    compatibleTargets: ['twitter.media', 'smartphone.message-image', 'kakao.image', 'prose.illustration'],
  },
  {
    id: 'high-resolution-modifier', name: 'High-Resolution modifier', builtIn: true,
    promptAdditions: 'polished rendering, clean anatomy, coherent details, high texture fidelity, refined lighting balance',
    negativeAdditions: 'muddy detail, low fidelity anatomy, incoherent textures',
    contextPolicy: 'auto', framingGuidance: 'Improve visual finish without overriding the requested framing intent.',
    characterContextPolicy: 'auto', continuityStrength: 'medium', defaultAspectBehavior: 'native',
    promptCleanupRules: ['quality-modifier-only'], compatibleTargets: ['twitter.media', 'instagram.single', 'instagram.carousel', 'smartphone.message-image', 'kakao.image', 'prose.illustration'],
  },
]

export const REGENERATION_INTENTS: RegenerationIntent[] = [
  { id: 'new-angle', label: 'New Angle', promptDelta: 'same subject and moment from a different plausible camera angle', negativeDelta: 'duplicate composition' },
  { id: 'wider-shot', label: 'Wider Shot', promptDelta: 'wider framing with more surrounding context while preserving the subject', negativeDelta: 'tight crop, face-only close-up' },
  { id: 'closer-shot', label: 'Closer Shot', promptDelta: 'closer framing with clearer subject detail while preserving the same scene intent', negativeDelta: 'distant unreadable subject' },
  { id: 'better-expression', label: 'Better Expression', promptDelta: 'more natural and compelling expression, same identity and scene', negativeDelta: 'blank expression, uncanny smile' },
  { id: 'preserve-character-change-pose', label: 'Preserve Character, Change Pose', promptDelta: 'preserve character identity and outfit, change the pose naturally', negativeDelta: 'wrong identity, same stiff pose' },
  { id: 'preserve-pose-improve-quality', label: 'Preserve Pose, Improve Quality', promptDelta: 'preserve pose and framing, improve clarity, anatomy, and rendering quality', negativeDelta: 'pose drift, composition drift' },
  { id: 'preserve-composition-improve-quality', label: 'Preserve Composition, Improve Quality', promptDelta: 'preserve composition and subject placement, improve visual finish and detail coherence', negativeDelta: 'changed composition, changed framing' },
  { id: 'more-candid', label: 'More Candid', promptDelta: 'more candid timing and natural in-the-moment feel', negativeDelta: 'posed studio portrait' },
  { id: 'stronger-social-media-feel', label: 'Stronger Social-Media Feel', promptDelta: 'stronger believable social-media image styling for the target app', negativeDelta: 'generic stock photo' },
  { id: 'full-reimagining', label: 'Full Reimagining', promptDelta: 'new visual interpretation of the same request, preserving required subjects and target', negativeDelta: 'literal duplicate' },
  { id: 'custom', label: 'Custom Direction', promptDelta: '', negativeDelta: '' },
]

const DEFAULT_GENERATION_PROFILE: GenerationProfile = {
  defaultPromptProfileId: 'auto',
  defaultCandidateCount: 1,
  automationEnabled: true,
  continuityStrength: 'medium',
  preferredSocialImageBehavior: 'native',
  suppressPeopleForObjects: true,
  defaultNegativeAdditions: '',
  defaultAspectPreference: 'request',
}

const CONFIG_PATH = 'config.json'
const EXTENSION_ID = 'reverie_relay'
const STATE_SCHEMA_VERSION = 34
const PROSE_OPPORTUNITY_PLANNER_VERSION = 'prose-opportunity-sidecar-v1'
const PROSE_PROMPT_COMPOSER_VERSION = 'prose-prompt-composer-v1'
const BACKEND_LOADED_AT = Date.now()
// CHARACTER_MESSAGE_RENDERED may fire repeatedly while the assistant is still
// streaming. Defer Surface discovery until the authored wrapper is complete so
// Relay does not repeatedly mount and discard partial Surface trees.
const activeStreamingSurfaceChats = new Set<string>()
let lastBackendResponseAt = BACKEND_LOADED_AT
const messageLocks = new Set<string>()
const slotLocks = new Set<string>()
const cancelledJobs = new Set<string>()
const activeImageStreams = new Map<string, AbortController>()

type ImageGenerationLaneWaiter = {
  controller: AbortController
  context: ImageGenerationStreamContext
  userId?: string
  resolve: (release: () => void) => void
  reject: (error: Error) => void
  heartbeat?: ReturnType<typeof setInterval>
  abortHandler?: () => void
}

type ImageGenerationLane = {
  active: boolean
  waiters: ImageGenerationLaneWaiter[]
}

// SwarmUI and several local ImageGen bridges expose one mutable WebSocket/session
// per user. Keep parser work parallel, but serialize every actual provider call so
// prose illustrations, surface media, candidates, and Illustrator cannot interrupt
// one another.
const imageGenerationLanes = new Map<string, ImageGenerationLane>()

function imageStreamAliases(context: ImageGenerationStreamContext): string[] {
  return [...new Set([context.generationId, context.slotKey, context.requestId].filter((value): value is string => Boolean(value)))]
}

function registerImageStream(context: ImageGenerationStreamContext, controller: AbortController): void {
  for (const alias of imageStreamAliases(context)) activeImageStreams.set(alias, controller)
}

function releaseImageStream(context: ImageGenerationStreamContext, controller: AbortController): void {
  for (const alias of imageStreamAliases(context)) {
    if (activeImageStreams.get(alias) === controller) activeImageStreams.delete(alias)
  }
}

function abortImageStream(alias: string): boolean {
  const controller = activeImageStreams.get(alias)
  if (!controller) return false
  if (!controller.signal.aborted) controller.abort('Cancelled by user.')
  return true
}

function abortAllImageStreams(): number {
  const controllers = new Set(activeImageStreams.values())
  for (const controller of controllers) if (!controller.signal.aborted) controller.abort('Cancelled by user.')
  return controllers.size
}


function imageGenerationLaneKey(userId?: string): string {
  return userId || '__default-user__'
}

function abortError(message = 'Generation cancelled by user.'): Error {
  const error = new Error(message)
  error.name = 'AbortError'
  return error
}

function releaseImageGenerationLane(key: string): void {
  const lane = imageGenerationLanes.get(key)
  if (!lane) return
  while (lane.waiters.length) {
    const waiter = lane.waiters.shift()!
    if (waiter.heartbeat) clearInterval(waiter.heartbeat)
    if (waiter.abortHandler) waiter.controller.signal.removeEventListener('abort', waiter.abortHandler)
    if (waiter.controller.signal.aborted) {
      waiter.reject(abortError())
      continue
    }
    sendImageStreamEvent(waiter.userId, waiter.context, {
      event: 'status',
      streaming: false,
      statusText: 'Image worker available. Starting generation…',
    })
    waiter.resolve(() => releaseImageGenerationLane(key))
    return
  }
  lane.active = false
  imageGenerationLanes.delete(key)
}

async function acquireImageGenerationLane(
  userId: string | undefined,
  context: ImageGenerationStreamContext,
  controller: AbortController,
): Promise<() => void> {
  const key = imageGenerationLaneKey(userId)
  const lane = imageGenerationLanes.get(key) || { active: false, waiters: [] }
  imageGenerationLanes.set(key, lane)
  if (!lane.active) {
    lane.active = true
    return () => releaseImageGenerationLane(key)
  }

  sendImageStreamEvent(userId, context, {
    event: 'status',
    streaming: false,
    statusText: 'Queued behind the current image. Relay will start this one next.',
  })

  return await new Promise<() => void>((resolve, reject) => {
    const waiter: ImageGenerationLaneWaiter = { controller, context, userId, resolve, reject }
    waiter.abortHandler = () => {
      const currentLane = imageGenerationLanes.get(key)
      if (currentLane) currentLane.waiters = currentLane.waiters.filter(candidate => candidate !== waiter)
      if (waiter.heartbeat) clearInterval(waiter.heartbeat)
      reject(abortError())
    }
    controller.signal.addEventListener('abort', waiter.abortHandler, { once: true })
    waiter.heartbeat = setInterval(() => {
      if (controller.signal.aborted) return
      sendImageStreamEvent(userId, context, {
        event: 'status',
        streaming: false,
        statusText: 'Still queued. Waiting for the current image to finish…',
      })
    }, 20_000)
    lane.waiters.push(waiter)
  })
}

function isAbortError(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  return error.name === 'AbortError' || error.name === 'OperationCancelledError' || /abort|cancel/i.test(error.message)
}
const rescanLocks = new Set<string>()
const relayBatchLocks = new Set<string>()
const relayProcessingKeys = new Set<string>()
const BACKEND_STARTED_AT = Date.now()
const stateMutationQueues = new Map<string, Promise<void>>()
const configMutationQueues = new Map<string, Promise<void>>()
const pendingGenerationContent = new Map<string, { content: string; receivedAt: number }>()
export const ILLUSTRATOR_RUNTIME_CACHE_POLICY = { maxEntries: 128, ttlMs: 15 * 60_000 } as const
const latestIllustratorRuntimeByChat = new BoundedLruCache<{ directive: string; createdAt: number }>(ILLUSTRATOR_RUNTIME_CACHE_POLICY)
const extensionMessageMutations = new Set<string>()
const latestMessageSnapshots = new Map<string, ChatMessage>()
const deferredScans = new Map<string, Parameters<typeof scanAndGenerate>>()
type AppearanceSidecarMode = 'normal' | 'reconcile' | 'enrichment'
type AppearanceReadyInput = {
  chatId: string
  messageId: string
  swipeId: number
  content: string
  userId?: string
  nativeSnapshot?: NativeSettingsSnapshot
  mode?: AppearanceSidecarMode
  reason?: string
  focusCharacter?: { id: string; name: string }
}
// Timers only decide when a lifecycle event is noticed. Every planning path for
// the same authoritative turn shares this promise before it reads Appearance Memory.
const appearanceReadinessByTurn = new Map<string, Promise<void>>()
// A failed normal lifecycle pass is settled for a short window by message
// identity, not just an exact byte fingerprint. Hosts can deliver the same
// turn through different event payload shapes; retrying the provider for that
// is duplication, not recovery. Explicit reconcile remains immediate.
const appearanceFailureCooldownByTurn = new Map<string, number>()
const scheduledAssistantScans = new Map<string, {
  chatId: string
  messageId: string
  swipeId?: number
  userId?: string
  sourceContent?: string
  sources: Set<string>
  attempt: number
  timer?: ReturnType<typeof setTimeout>
}>()
const scheduledProseOpportunityScans = new Map<string, {
  chatId: string
  messageId: string
  swipeId?: number
  userId?: string
  sourceContent?: string
  sources: Set<string>
  generationType?: string
  attempt: number
  timer?: ReturnType<typeof setTimeout>
}>()
const deferredReparseRequests = new Map<string, { key: string; nativeSnapshot?: NativeSettingsSnapshot; userId?: string; attempts: number; timer?: ReturnType<typeof setTimeout> }>()
const deferredRegenerateRequests = new Map<string, { key: string; nativeSnapshot?: NativeSettingsSnapshot; userId?: string; highResMode?: boolean; attempts: number; timer?: ReturnType<typeof setTimeout> }>()
const abortableOperationSerials = new Map<string, number>()

type RenderSnapshot = {
  studio: CustomSurfaceStudioState
  autoGenerate: boolean
  narrativeVariant: NarrativeRegexVariant
  records: SlotRecord[]
  cachedAt: number
}

const renderSnapshotCache = new BoundedLruCache<RenderSnapshot>({ maxEntries: 64, ttlMs: 5 * 60_000 })
const renderOutputCache = new BoundedLruCache<{ content: string; scope: string; messageId: string; swipeId: string }>({
  maxEntries: 96,
  maxBytes: 3 * 1024 * 1024,
  ttlMs: 5 * 60_000,
  sizeOf: value => value.content.length * 2,
})
const CONFIG_CACHE_TTL_MS = 2_500
const CHAT_CHARACTER_IDENTITY_CACHE_TTL_MS = 5 * 60_000
const configCache = new BoundedLruCache<{ value: RouterConfig; cachedAt: number }>({ maxEntries: 64 })
const chatCharacterIdentityCache = new BoundedLruCache<{ value: { id: string; name: string; aliases: string[]; avatarUrl?: string } | null; cachedAt: number }>({ maxEntries: 128, ttlMs: CHAT_CHARACTER_IDENTITY_CACHE_TTL_MS })
const surfaceUtilityCache = new Map<string, { content: string; moduleIds: string[] }>()
const pendingPromptInjectionRecords = new Map<string, {
  source: 'automatic' | 'macro'
  position: SurfaceUtilityInjectionPosition | 'macro-placement'
  moduleIds: string[]
  summary: string
  userId?: string
  timer?: ReturnType<typeof setTimeout>
}>()
const lastPromptInjectionFingerprint = new BoundedLruCache<{ fingerprint: string; recordedAt: number }>({ maxEntries: 128, ttlMs: 30 * 60_000 })
const surfaceMacroSyncFingerprints = new BoundedLruCache<string>({ maxEntries: 128 })
const scheduledStateBroadcasts = new Map<string, ReturnType<typeof setTimeout>>()

function userConfigCacheKey(userId?: string): string {
  return userId || '__default__'
}

function trimSurfaceUtilityCache(): void {
  while (surfaceUtilityCache.size > 12) {
    const first = surfaceUtilityCache.keys().next().value
    if (!first) break
    surfaceUtilityCache.delete(first)
  }
}

function renderScopeKey(chatId: string, userId?: string): string {
  return `${userId || '__default__'}:${chatId}`
}

function cacheRenderSnapshot(chatId: string, userId: string | undefined, state: StateFile, config: RouterConfig): RenderSnapshot {
  const snapshot: RenderSnapshot = {
    studio: state.customSurfaces,
    autoGenerate: config.autoGenerate,
    narrativeVariant: narrativeVariantForSurfaceShellMode(config.surfaceDefaultShellMode),
    records: Object.values(state.slots),
    cachedAt: Date.now(),
  }
  renderSnapshotCache.set(renderScopeKey(chatId, userId), snapshot)
  return snapshot
}

function invalidateRenderCaches(chatId?: string, userId?: string): void {
  const scopePrefix = userId ? `${userId}:` : ''
  for (const key of renderSnapshotCache.keys()) {
    if (scopePrefix && !key.startsWith(scopePrefix)) continue
    if (chatId && !key.endsWith(`:${chatId}`)) continue
    renderSnapshotCache.delete(key)
  }
  for (const key of renderOutputCache.keys()) {
    if (scopePrefix && !key.startsWith(scopePrefix)) continue
    if (chatId && !key.includes(`:${chatId}:`)) continue
    renderOutputCache.delete(key)
  }
}

const renderSnapshotWarmups = new Map<string, Promise<void>>()

function warmRenderSnapshot(chatId: string, userId?: string): void {
  if (!chatId) return
  const scope = renderScopeKey(chatId, userId)
  if (renderSnapshotCache.has(scope) || renderSnapshotWarmups.has(scope)) return
  const warmup = Promise.all([getState(chatId, userId), getConfig(userId)])
    .then(([state, config]) => { cacheRenderSnapshot(chatId, userId, state, config) })
    .catch(error => { spindle.log.warn(`[Reverie Relay] Render snapshot warmup failed: ${error instanceof Error ? error.message : String(error)}`) })
    .finally(() => { renderSnapshotWarmups.delete(scope) })
  renderSnapshotWarmups.set(scope, warmup)
}

function beginAbortableOperation(key: string): number {
  const next = (abortableOperationSerials.get(key) || 0) + 1
  rememberBoundedMap(abortableOperationSerials, key, next, C5B_CACHE_LIMITS.abortableOperations)
  return next
}

function cancelAbortableOperation(key: string): number {
  const next = (abortableOperationSerials.get(key) || 0) + 1
  rememberBoundedMap(abortableOperationSerials, key, next, C5B_CACHE_LIMITS.abortableOperations)
  return next
}

function captureAbortableOperation(key: string): number {
  return abortableOperationSerials.get(key) || 0
}

function assertAbortableOperationCurrent(key: string, serial: number): void {
  if ((abortableOperationSerials.get(key) || 0) !== serial) {
    const error = new Error('Operation cancelled by user.')
    error.name = 'OperationCancelledError'
    throw error
  }
}

class JobCancelledError extends Error {
  constructor() {
    super('Reverie Relay job was cancelled because its state was removed.')
    this.name = 'JobCancelledError'
  }
}

class ReplacementPreflightError extends Error {
  constructor(message = 'This recovered slot no longer has a replaceable marker in the message. Rebuild the request before generating a replacement.') {
    super(message)
    this.name = 'ReplacementPreflightError'
  }
}

class StaleOpportunityError extends Error {
  constructor(message = 'This illustration opportunity no longer has a valid source message or swipe.') {
    super(message)
    this.name = 'StaleOpportunityError'
  }
}

const DEFAULT_CONFIG: RouterConfig = {
  enabled: true,
  autoGenerate: true,
  slotGenerationMode: 'auto-insert',
  debugLogging: false,
  highResMode: false,
  enableRelayOrb: false,
  tutorialModeEnabled: true,
  tutorialStep: 0,
  autoRescanOnChatOpen: true,
  includeInactiveSwipesInRescan: false,
  followNativeParser: true,
  followNativeImageGen: true,
  generationSettingsSource: 'native',
  loraSource: 'native',
  vaultStrength: 'medium',
  parserConnectionId: null,
  parserModel: '',
  parserParameters: {},
  appearanceSidecarConnectionId: null,
  appearanceSidecarModel: '',
  appearanceSidecarParameters: {},
  parserRetries: 1,
  includeRecentMessages: 8,
  includeCharacterInfo: true,
  includePersonaInfo: true,
  includeLorebook: true,
  customParserInstructions: '',
  imageConnectionId: null,
  imageModel: '',
  imageParameters: {},
  imageLoraStack: [],
  relayLoraStacks: [],
  activeRelayLoraStackId: null,
  nativePromptMode: '',
  nativePromptPresetId: null,
  nativeCustomPrompt: '',
  nativeNegativePrompt: '',
  additionalNegativePrompt: '',
  nativeIncludeCharacters: false,
  nativeIncludePersona: false,
  nativeCharacterPrompt: '',
  nativePersonaPrompt: '',
  nativePromptPresets: [],
  nativeImageSettingsSnapshot: {},
  nativeSettingsCapturedAt: 0,
  interfaceTheme: 'velvet-prism',
  orbPositionDesktop: { x: 0.86, y: 0.78 },
  orbPositionMobile: { x: 0.86, y: 0.78 },
  orbSize: 'medium',
  orbDesign: 'prism-flower',
  orbCustomIconDataUrl: '',
  lastActiveDrawerTab: 'slots',
  defaultPromptProfileId: 'auto',
  promptProfiles: BUILT_IN_PROMPT_PROFILES,
  chatGenerationProfiles: {},
  defaultGenerationProfile: DEFAULT_GENERATION_PROFILE,
  defaultCandidateCount: 1,
  queueConcurrencyLimit: 2,
  objectEnvironmentPersonSuppression: true,
  experienceMode: 'expert',
  nativeAutoGenerationGuard: true,
  nativeAutoGenerationPreviousValue: null,
  nativeAutoGenerationGuardOwned: false,
  galleryAutoLink: true,
  generationRecipes: [],
  activeGenerationRecipeId: null,
  surfaceRendererMode: 'relay',
  surfaceDefaultShellMode: 'plain',
  surfaceColorMode: 'realistic',
  surfaceUtilityInjectionEnabled: true,
  surfacePreferencesInitialized: false,
  narrativeDlcEnabled: false,
  narrativeDlcVariant: 'sparkle-button',
  narrativeDlcUtilityNames: narrativeUtilityNames(),
  characterPhoneDefaultApps: normalizeCharacterPhoneDefaultApps(undefined),
  narrativeDlcLastSync: null,
  globalSurfaceStudio: {
    definitions: {}, activePresetIds: {}, collectionPresets: {}, rendererMode: 'relay', defaultShellMode: 'plain', colorMode: 'realistic',
    utilityInjectionEnabled: true, utilityInjectionPosition: 'after-chat-history', utilityTemplate: '', validationErrors: {},
    lastInjectedModuleIds: [], lastInjectionAt: 0, lastInjectionSource: 'none', lastInjectionPosition: 'none',
    lastInjectionSummary: 'No Relay prompt injection has been recorded yet.', updatedAt: 0,
  },
  proseIllustratorSettings: defaultProseIllustratorSettings(),
}

function containsStalePromptTemplate(value: unknown): boolean {
  return /(?:dreamglass:image|dreamglass\s+image\s+router|dreamglass\s+router|<dreamglass\b|\{\{\s*dreamglass|enabled\s+surface\s+authority)/i.test(cleanString(value))
}

function canonicalSurfaceUtilityTemplate(value: unknown): string {
  const text = cleanString(value)
  return !text || containsStalePromptTemplate(text) ? REVERIE_SURFACE_UTILITY_TEMPLATE : text
}

function canonicalProtocolOverride(value: unknown, fallback: string): string {
  const text = cleanString(value)
  return !text || containsStalePromptTemplate(text) ? fallback : text
}

function registryPrompt(settings: ProseIllustratorSettings, id: string): string {
  return Object.prototype.hasOwnProperty.call(settings.promptRegistry || {}, id)
    ? String(settings.promptRegistry[id] ?? '')
    : String(DEFAULT_PROMPT_REGISTRY[id] ?? '')
}

export function buildResolvedNarrativeUtilityPrompt(config: Pick<RouterConfig, 'narrativeDlcEnabled' | 'narrativeDlcUtilityNames' | 'characterPhoneDefaultApps'>): {
  content: string
  utilityNames: string[]
  characterPhoneDirective: string
} {
  if (!config.narrativeDlcEnabled) return { content: '', utilityNames: [], characterPhoneDirective: '' }
  const narrative = buildNarrativeUtilityPrompt(config.narrativeDlcUtilityNames)
  const characterPhoneDirective = narrative.utilityNames.includes('Character Phone')
    ? buildCharacterPhoneRuntimeDirective(config.characterPhoneDefaultApps)
    : ''
  return {
    ...narrative,
    characterPhoneDirective,
    content: [narrative.content, characterPhoneDirective].filter(Boolean).join('\n\n'),
  }
}

function expandPromptTemplate(template: string, values: Record<string, unknown>): string {
  return String(template || '').replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (_match, key: string) => {
    const value = values[key]
    return (value === undefined || value === null ? '' : String(value)).trim().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  })
}

const registryContextMetrics = new WeakMap<object, Partial<ContextMetrics>>()
function sidecarRegistryMessages(settings: ProseIllustratorSettings, workflow: 'opportunity' | 'composer' | 'planner', runtimePayload: unknown): Array<{ role: 'system' | 'user'; content: string }> {
  const runtime = JSON.stringify(runtimePayload, null, 2)
  const messages: Array<{ role: 'system' | 'user'; content: string }> = [
    { role: 'system', content: registryPrompt(settings, `sidecar.${workflow}.system`) },
    { role: 'user', content: registryPrompt(settings, `sidecar.${workflow}.request`).replace(/\{\{\s*runtime_payload\s*\}\}/gi, runtime) },
  ]
  const payload = runtimePayload as { recentContext?: unknown[]; appearanceMemory?: string }
  registryContextMetrics.set(messages, { historyMessages: payload.recentContext?.length || 0, appearanceMemoryChars: payload.appearanceMemory?.length || 0 })
  return messages
}

function compactBuiltInSurfacePromptModule(definition: CustomSurfaceDefinition): string {
  const requiredMedia = (definition.validationRules || [])
    .map(rule => /^required-media:(\d+)$/i.exec(cleanString(rule))?.[1] || '')
    .find(Boolean)
  const maximumMedia = (definition.validationRules || [])
    .map(rule => /^maximum-media:(\d+)$/i.exec(cleanString(rule))?.[1] || '')
    .find(Boolean)
  const countLabel = requiredMedia ? (maximumMedia && maximumMedia !== requiredMedia ? `${requiredMedia}-${maximumMedia}` : requiredMedia) : ''
  const media = definition.targetId
    ? ` target="${definition.targetId}"${countLabel ? ` count="${countLabel}"` : ''}${definition.supportedAspectRatios.length ? ` aspect="${definition.supportedAspectRatios.join('|')}"` : ''}`
    : ''
  return bracketSurfacePromptModule({
    label: definition.displayName,
    root: definition.canonicalOuterWrapper,
    sampleXml: definition.sampleXml,
    target: definition.targetId,
    aspect: definition.supportedAspectRatios[0],
  }) + (media ? `\nMEDIA SUMMARY:${media}` : '')
}

function r45BracketSpecificGuidance(contract: string): string {
  const body = cleanString(contract)
    .replace(/^<[A-Za-z][\w:-]*_utility>\s*/i, '')
    .replace(/<\/[A-Za-z][\w:-]*_utility>\s*$/i, '')
    .replace(/^R4\.5 FINAL SURFACE UTILITY CONTRACT[\s\S]*?generic substitute cards, HTML layouts, centered prose blobs, or renderer fallback text\.\s*/i, '')
    .replace(/^(?:SURFACE|BRACKET) ROOT:\s*(?:<[^>]+>|\[[^\]]+\])\s*/im, '')
    .split(/\n\s*(?:Canonical structure:|OUTPUT FORMAT(?:\s+—\s+EXACT)?)/i)[0]
    .replace(/Output raw XML only\.?/gi, '')
    .replace(/<((?!image_request\b|\/image_request\b|scene_brief\b|\/scene_brief\b)[A-Za-z][\w:-]*)>/g, '[$1]')
    .replace(/<\/((?!image_request\b|scene_brief\b)[A-Za-z][\w:-]*)>/g, '[/$1]')
    .trim()
  return body ? `\n\nR4.5 SURFACE-SPECIFIC RULES\n${body}` : ''
}

function surfacePromptMediaContract(definition: CustomSurfaceDefinition): string {
  const wrapper = cleanString(definition.canonicalOuterWrapper) || cleanString(definition.baseSurfaceId).replace(/[.-]/g, '_') || 'custom_surface'
  const target = cleanString(definition.targetId) || `custom.${cleanString(definition.baseSurfaceId) || 'surface'}`
  const aspect = definition.supportedAspectRatios?.[0] || '1:1'
  const stem = cleanString(definition.baseSurfaceId) || 'custom-surface'
  return `IMAGE REQUEST CONTRACT
Every authored ${definition.displayName || 'surface'} must include a complete request like this inside its owning media field:
[${wrapper}]
[media]
<image_request id="${stem}-001" target="${target}" slot="${stem}-media-1" aspect="${aspect}" alt="${definition.displayName || 'Surface'} image">
<scene_brief>Complete scene-specific visual description with visible subjects, setting, lighting, camera, framing, and composition. No readable interface text.</scene_brief>
</image_request>
[/media]
[/${wrapper}]`
}

function ensureSurfacePromptContainsImageRequest(definition: CustomSurfaceDefinition, prompt: string): string {
  const text = cleanString(prompt)
  if (!text || /<image_request\b/i.test(text)) return text
  return `${text}

${surfacePromptMediaContract(definition)}`
}

function canonicalSurfacePromptModule(definition: CustomSurfaceDefinition): string {
  const text = cleanString(definition.promptModule)
  // A Surface Utility is user-editable.  Keep a non-stale authored module rather
  // than silently replacing it with the stock pack during the next state load.
  // The shipped R4.5 contract remains the default/fallback, not a write lock.
  if (text && !definition.builtIn && !containsStalePromptTemplate(text)) return ensureSurfacePromptContainsImageRequest(definition, text)
  const builtInDefault = cleanString(builtInSurfaceDefinitionTemplate?.[definition.surfaceId]?.promptModule)
  if (builtInDefault && /bracket-native syntax/i.test(builtInDefault)) return builtInDefault
  const r45 = r45UtilityContract(definition.baseSurfaceId)
  const bracket = bracketSurfacePromptModule({
    label: definition.displayName,
    root: definition.canonicalOuterWrapper,
    sampleXml: definition.sampleXml,
    target: definition.targetId,
    aspect: definition.supportedAspectRatios[0],
  })
  const builtInGuidance = r45 || text
  if (definition.builtIn) return ensureSurfacePromptContainsImageRequest(definition, `${bracket}${r45BracketSpecificGuidance(builtInGuidance)}`)
  if (!text || containsStalePromptTemplate(text)) return ensureSurfacePromptContainsImageRequest(definition, bracket)
  return ensureSurfacePromptContainsImageRequest(definition, `${text}\n\n${bracket}`)
}

function selectedSurfaceDefinitions(studio: CustomSurfaceStudioState): CustomSurfaceDefinition[] {
  const selected: CustomSurfaceDefinition[] = []
  const seen = new Set<string>()
  for (const definition of Object.values(studio.definitions || {})) {
    const activeId = studio.activePresetIds?.[definition.baseSurfaceId]
    // Persisted collections can point at a deleted custom preset.  Fall back to
    // the current built-in/default Surface instead of dropping the whole module.
    const active = (activeId && studio.definitions[activeId]?.baseSurfaceId === definition.baseSurfaceId
      ? studio.definitions[activeId]
      : Object.values(studio.definitions).find(candidate => candidate.baseSurfaceId === definition.baseSurfaceId && candidate.builtIn)
        || definition)
    if (!active || seen.has(active.baseSurfaceId)) continue
    seen.add(active.baseSurfaceId)
    if (active.promptEnabled !== true) continue
    selected.push(active)
  }
  return selected.sort((a, b) => a.promptCategory.localeCompare(b.promptCategory) || a.displayName.localeCompare(b.displayName))
}

export function applySurfaceCategoryPromptEnabled(
  studio: CustomSurfaceStudioState,
  promptCategory: SurfacePromptCategory,
  promptEnabled: boolean,
  now = Date.now(),
): number {
  let changed = 0
  for (const definition of Object.values(studio.definitions)) {
    if (definition.promptCategory !== promptCategory || definition.promptEnabled === promptEnabled) continue
    definition.promptEnabled = promptEnabled
    definition.updatedAt = now
    changed += 1
  }
  if (changed) studio.updatedAt = now
  return changed
}

function surfaceUtilityCacheKey(studio: CustomSurfaceStudioState, source: 'macro' | 'automatic'): string {
  const active = selectedSurfaceDefinitions(studio)
    .map(definition => `${definition.surfaceId}:${definition.updatedAt || 0}:${definition.promptEnabled === true ? 1 : 0}`)
    .join('|')
  return `${source}:${studio.rendererMode}:${studio.updatedAt || 0}:${studio.utilityInjectionPosition}:${contentFingerprint(canonicalSurfaceUtilityTemplate(studio.utilityTemplate))}:${active}`
}

export function buildEnabledSurfaceUtility(studio: CustomSurfaceStudioState, source: 'macro' | 'automatic' = 'automatic'): { content: string; moduleIds: string[] } {
  const cacheKey = surfaceUtilityCacheKey(studio, source)
  const cached = surfaceUtilityCache.get(cacheKey)
  if (cached) return { content: cached.content, moduleIds: [...cached.moduleIds] }

  const enabled = selectedSurfaceDefinitions(studio)
  const moduleIds = enabled.map(definition => definition.baseSurfaceId)
  const modules = enabled.map(definition => canonicalSurfacePromptModule(definition))
    .filter(Boolean)
    .join('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n')
  const template = canonicalSurfaceUtilityTemplate(studio.utilityTemplate)
  const expanded = template
    .replace(/\{\{\s*reverie_enabled_surface_modules\s*\}\}/gi, modules || 'Enabled surface-authoring modules: none.')
    .replace(/\{\{\s*reverie_renderer_mode\s*\}\}/gi, 'shared')
  const result = {
    content: `<reverie_surface_utility source="${source}" renderer="${studio.rendererMode}" contract="shared" modules="${escapeXmlText(moduleIds.join(','))}">
${expanded}
</reverie_surface_utility>`,
    moduleIds,
  }
  surfaceUtilityCache.set(cacheKey, { content: result.content, moduleIds: [...moduleIds] })
  trimSurfaceUtilityCache()
  return result
}

async function syncEnabledSurfaceMacro(chatId: string, state: StateFile, config: RouterConfig, userId?: string): Promise<void> {
  const surfaceExpansion = buildEnabledSurfaceUtility(state.customSurfaces, 'macro').content
  const illustratorSettings = proseSettingsForChat(state, chatId)
  const personaPovContext = illustratorSettings.perspectiveMode === 'persona-pov' ? await resolvePersonaPovContext(chatId, userId) : undefined
  const illustratorExpansion = resolveIllustratorStoryPrompt(illustratorSettings, [], personaPovContext)
  const narrativeExpansion = buildResolvedNarrativeUtilityPrompt(config).content
  const values: Record<string, string> = {
    reverie_surfaces: surfaceExpansion,
    reverie_enabled_surfaces: surfaceExpansion,
    reverie_illustrator: illustratorExpansion,
    reverie_narrative: narrativeExpansion,
    reverie_all: [surfaceExpansion, narrativeExpansion, illustratorExpansion].filter(Boolean).join('\n\n'),
  }
  const scope = renderScopeKey(chatId, userId)
  const fingerprint = contentFingerprint(JSON.stringify(values))
  if (surfaceMacroSyncFingerprints.get(scope) === fingerprint) return

  let synced = false
  await Promise.all(Object.entries(values).flatMap(([name, value]) => [
    spindle.variables.chat.set(chatId, name, value).then(() => { synced = true }),
    spindle.variables.global.set(name, value, userId).then(() => { synced = true }),
  ])).catch((error: unknown) => {
    spindle.log.warn(`[Reverie Relay] Could not update resolved Relay macros for ${chatId}: ${error instanceof Error ? error.message : String(error)}`)
  })
  if (synced) surfaceMacroSyncFingerprints.set(scope, fingerprint)
}

async function recordPromptInjection(
  chatId: string,
  source: 'automatic' | 'macro',
  position: SurfaceUtilityInjectionPosition | 'macro-placement',
  moduleIds: string[],
  summary: string,
  userId?: string,
): Promise<void> {
  await mutateState(chatId, userId, state => {
    const studio = normalizeCustomSurfaceStudio(state.customSurfaces || defaultCustomSurfaceStudio())
    studio.lastInjectedModuleIds = [...moduleIds]
    studio.lastInjectionAt = Date.now()
    studio.lastInjectionSource = source
    studio.lastInjectionPosition = position
    studio.lastInjectionSummary = summary
    studio.updatedAt = Date.now()
    state.customSurfaces = studio
  }).catch(error => {
    spindle.log.warn(`[Reverie Relay] Could not record prompt injection for ${chatId}: ${error instanceof Error ? error.message : String(error)}`)
  })
}


function schedulePromptInjectionRecord(
  chatId: string,
  source: 'automatic' | 'macro',
  position: SurfaceUtilityInjectionPosition | 'macro-placement',
  moduleIds: string[],
  summary: string,
  userId?: string,
): void {
  const scope = `${userId || '__default__'}:${chatId}`
  const fingerprint = `${source}:${position}:${moduleIds.join(',')}:${summary}`
  const last = lastPromptInjectionFingerprint.get(scope)
  if (last?.fingerprint === fingerprint && Date.now() - last.recordedAt < 30_000) return

  const pending = pendingPromptInjectionRecords.get(scope)
  if (pending?.timer) clearTimeout(pending.timer)
  const next = { source, position, moduleIds: [...moduleIds], summary, userId } as {
    source: 'automatic' | 'macro'
    position: SurfaceUtilityInjectionPosition | 'macro-placement'
    moduleIds: string[]
    summary: string
    userId?: string
    timer?: ReturnType<typeof setTimeout>
  }
  next.timer = setTimeout(() => {
    pendingPromptInjectionRecords.delete(scope)
    lastPromptInjectionFingerprint.set(scope, { fingerprint, recordedAt: Date.now() })
    void recordPromptInjection(chatId, next.source, next.position, next.moduleIds, next.summary, next.userId)
  }, 25)
  pendingPromptInjectionRecords.set(scope, next)
}

function insertPromptDirective(messages: LlmMessage[], directive: string, position: SurfaceUtilityInjectionPosition): { messages: LlmMessage[]; index: number } {
  const next = [...messages]
  let index = next.length
  if (position === 'system-prefix') index = 0
  else if (position === 'before-chat-history') {
    const firstHistory = next.findIndex(message => !['system', 'developer'].includes(cleanString((message as any)?.role).toLocaleLowerCase()))
    index = firstHistory < 0 ? next.length : firstHistory
  } else if (position === 'before-latest-user' || position === 'after-latest-user') {
    let latestUser = -1
    for (let i = next.length - 1; i >= 0; i -= 1) {
      if (cleanString((next[i] as any)?.role).toLocaleLowerCase() === 'user') { latestUser = i; break }
    }
    index = latestUser < 0 ? next.length : latestUser + (position === 'after-latest-user' ? 1 : 0)
  }
  next.splice(index, 0, { role: 'system', content: directive } as LlmMessage)
  return { messages: next, index }
}

const SURFACE_MACRO_MARKERS = /<reverie_(?:surfaces|enabled_surfaces)_macro\s*\/>/gi
const ILLUSTRATOR_MACRO_MARKER = /<reverie_illustrator_macro\s*\/>/gi
const NARRATIVE_MACRO_MARKER = /<reverie_narrative_macro\s*\/>/gi
const ALL_MACRO_MARKER = /<reverie_all_macro\s*\/>/gi
const utilityInjectionWarningAtByChat = new BoundedLruCache<number>({ maxEntries: 128, ttlMs: 30 * 60_000 })

export type SidecarPromptResolution = {
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>
  resolvedMacros: string[]
  unresolvedRequiredMacros: string[]
}

export async function resolveSidecarPromptMessages(
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  chatId: string | undefined,
  userId?: string,
  fallback?: { characterPrompt?: string; personaPrompt?: string; nativeSettings?: Record<string, unknown> },
): Promise<SidecarPromptResolution> {
  if (!messages.some(message => /\{\{|<reverie_[\w-]*macro\b/i.test(message.content))) return { messages, resolvedMacros: [], unresolvedRequiredMacros: [] }
  // Reading global config is only necessary for the Narrative macro. Keeping
  // ordinary Sidecar macro expansion independent avoids an unnecessary host
  // storage round-trip and preserves compatibility with minimal host shims.
  const needsNarrativeMacro = messages.some(message => /\{\{\s*(reverie_narrative|reverie_all)\s*\}\}|<reverie_(?:narrative|all)_macro\b/i.test(message.content))
  const [character, persona, state, config] = await Promise.all([
    chatId ? readChatCharacterIdentity(chatId, userId) : Promise.resolve(null),
    readCurrentHostPersona(userId, chatId),
    chatId ? getState(chatId, userId).catch(() => null) : Promise.resolve(null),
    needsNarrativeMacro ? getConfig(userId) : Promise.resolve(null),
  ])
  const settings = state && chatId ? proseSettingsForChat(state, chatId) : null
  const surfaceUtility = state ? buildEnabledSurfaceUtility(state.customSurfaces, 'macro').content : ''
  const narrativeUtility = config ? buildResolvedNarrativeUtilityPrompt(config).content : ''
  const personaPovContext = settings?.perspectiveMode === 'persona-pov' && chatId ? await resolvePersonaPovContext(chatId, userId) : undefined
  const illustrator = settings ? resolveIllustratorStoryPrompt(settings, messages as LlmMessage[], personaPovContext) : ''
  const nativeSettings = fallback?.nativeSettings || {}
  const characterBinding = resolveC5ANativeIdentityBinding(nativeSettings, 'character', character ? { id: cleanString(character.id), name: cleanString(character.name) } : null)
  const personaBinding = resolveC5ANativeIdentityBinding(nativeSettings, 'persona', persona ? { id: cleanString(persona.id || persona.persona_id || persona.personaId), name: cleanString(persona.name) } : null)
  const values: Record<string, string> = {
    char: cleanString(character?.name),
    character: cleanString(character?.name),
    user: cleanString(persona?.name),
    persona: cleanString(persona?.name),
    // Prompt macros resolve the actual active subject binding. A singleton prompt-preset
    // fallback would silently attach the wrong identity in multi-preset configurations.
    character_prompt: characterBinding.prompt,
    character_negative_prompt: characterBinding.negativePrompt,
    persona_prompt: personaBinding.prompt,
    persona_negative_prompt: personaBinding.negativePrompt,
    reverie_surfaces: surfaceUtility,
    reverie_enabled_surfaces: surfaceUtility,
    reverie_illustrator: illustrator,
    reverie_narrative: narrativeUtility,
    reverie_all: [surfaceUtility, narrativeUtility, illustrator].filter(Boolean).join('\n\n'),
  }
  const resolvedMacros = new Set<string>()
  const unresolvedRequiredMacros = new Set<string>()
  const resolved = messages.map(message => {
    let content = message.content
      .replace(ALL_MACRO_MARKER, values.reverie_all)
      .replace(SURFACE_MACRO_MARKERS, values.reverie_surfaces)
      .replace(ILLUSTRATOR_MACRO_MARKER, values.reverie_illustrator)
      .replace(NARRATIVE_MACRO_MARKER, values.reverie_narrative)
    content = content.replace(/\{\{\s*(char|character|user|persona|character_prompt|character_negative_prompt|persona_prompt|persona_negative_prompt|reverie_surfaces|reverie_enabled_surfaces|reverie_illustrator|reverie_narrative|reverie_all)\s*\}\}/gi, (match, name: string) => {
      const key = name.toLocaleLowerCase()
      const value = values[key]
      if (!value && ['character_prompt', 'character_negative_prompt', 'persona_prompt', 'persona_negative_prompt'].includes(key)) {
        resolvedMacros.add(`{{${key}}}`)
        return ''
      }
      if (!value) { unresolvedRequiredMacros.add(match); return '' }
      resolvedMacros.add(`{{${key}}}`)
      return value
    })
    return { ...message, content }
  })
  return { messages: resolved, resolvedMacros: [...resolvedMacros], unresolvedRequiredMacros: [...unresolvedRequiredMacros] }
}

async function generateRawSidecar(request: Record<string, unknown> & { messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> }, chatId?: string, userId?: string): Promise<unknown> {
  const config = await getConfig(userId)
  const resolution = await resolveSidecarPromptMessages(request.messages, chatId, userId, {
    characterPrompt: config.nativeCharacterPrompt,
    personaPrompt: config.nativePersonaPrompt,
    nativeSettings: nativeSnapshotFromConfig(config)?.settings || {},
  })
  if (resolution.unresolvedRequiredMacros.length) throw new Error(`Required Sidecar macros could not be resolved: ${resolution.unresolvedRequiredMacros.join(', ')}`)
  const { relayContextMetrics, relayWorkflow, ...providerRequest } = request
  const workflow = typeof relayWorkflow === 'string' ? relayWorkflow : 'parser'
  const measurement = measureModelMessages(workflow, resolution.messages, relayContextMetrics as Partial<ContextMetrics> | undefined)
  assertModelContextBudget(measurement)
  logStage(config, 'model_context_budget', measurement)
  if (chatId && config.debugLogging) await mutateState(chatId, userId, state => appendStateLog(state, { severity: 'debug', stage: 'model-context', eventType: 'model_context_budget', chatId, message: `${workflow}: ${measurement.estimatedInputTokens} estimated input tokens (${measurement.tier}).`, details: measurement }))
  return spindle.generate.raw({ ...providerRequest, messages: resolution.messages, userId } as any)
}

function activeIllustratorPrompt(settings: ProseIllustratorSettings): string {
  if (!settings.enabled || settings.mode === 'off') return ''
  const base = registryPrompt(settings, settings.mode === 'relay-planned' ? 'story.relay-planned' : settings.mode === 'inline-protocol' ? 'story.inline-protocol' : 'story.model-placed')
  const framing = effectiveFramingPrompt(settings)
  const adult = registryPrompt(settings, 'story.adult-content-fidelity')
  return [base, framing, adult].filter(Boolean).join('\n\n')
}

function personaPovRuntimeGuidance(settings: ProseIllustratorSettings, context?: PersonaPovContext): string {
  if (settings.perspectiveMode !== 'persona-pov') return ''
  if (!context?.available) {
    return 'PERSONA POV RUNTIME\nNo chat-bound or active host Persona resolved. Do not author, plan, or dispatch an illustration request.'
  }
  const binding = context.binding === 'chat-persona' ? 'chat-bound Persona' : 'active host Persona'
  const name = cleanString(context.personaName) || 'resolved Persona'
  return `PERSONA POV RUNTIME\nCamera holder: ${name} (${binding}). Treat this Persona as the in-world viewpoint. Do not add the camera holder to the visible cast unless the authored scene independently makes part of their body visible.`
}

export function resolveIllustratorStoryPrompt(settings: ProseIllustratorSettings, messages: LlmMessage[] = [], personaPovContext?: PersonaPovContext): string {
  return [activeIllustratorPrompt(settings), buildIllustratorRuntimeDirective(settings, messages, personaPovContext), personaPovRuntimeGuidance(settings, personaPovContext)].filter(Boolean).join('\n\n')
}

function maybeWarnUtilityNotInjected(chatId: string, userId?: string): void {
  const now = Date.now()
  const last = utilityInjectionWarningAtByChat.get(chatId) || 0
  if (now - last < 60_000) return
  utilityInjectionWarningAtByChat.set(chatId, now)
  spindle.sendToFrontend({
    type: 'relay_notice',
    level: 'warning',
    message: 'Relay Surface Utility was not injected. Place {{reverie_surfaces}} or {{reverie_all}} in the preset, or enable Automatic Surface Injection.',
  }, userId)
}

type MessageContentProcessorContext = {
  chatId: string
  messageId?: string
  content: string
  extra?: Record<string, unknown>
  origin: 'create' | 'update' | 'swipe_add' | 'swipe_update' | 'render'
  userId?: string
}

const NATIVE_RENDER_TAG_RE = new RegExp(
  `(?:<|\\[)(?:${[...new Set([...NATIVE_SURFACE_ROOT_TAGS, 'reverie-illustration', 'image_request', 'image_request_error'])].map(escapeRegExp).join('|')})(?=[\\s>\\]])`,
  'i',
)

const registerMessageContentProcessor = (spindle as unknown as {
  registerMessageContentProcessor?: (
    handler: (context: MessageContentProcessorContext) => Promise<{ content?: string } | void>,
    priority?: number,
  ) => void
}).registerMessageContentProcessor

if (typeof registerMessageContentProcessor === 'function') {
  registerMessageContentProcessor.call(spindle, async context => {
    if (context.origin !== 'render') return
    if (context.extra?.is_user === true || cleanString(context.extra?.role).toLocaleLowerCase() === 'user') return
    const source = typeof context.content === 'string' ? context.content : ''
    const nativeCandidate = NATIVE_RENDER_TAG_RE.test(source)
    const narrativeCandidate = containsNarrativeRegexMarkup(source)
    if (!source || (!nativeCandidate && !narrativeCandidate)) return
    try {
      const scope = renderScopeKey(context.chatId, context.userId)
      let snapshot = renderSnapshotCache.get(scope)
      if (!snapshot) {
        const [state, config] = await Promise.all([
          getState(context.chatId, context.userId),
          getConfig(context.userId),
        ])
        snapshot = cacheRenderSnapshot(context.chatId, context.userId, state, config)
      }
      const renderSwipeId = context.extra?.swipe_id === undefined && context.extra?.swipeId === undefined
        ? undefined
        : Number(context.extra?.swipe_id ?? context.extra?.swipeId)
      const recordSignature = snapshot.records
        .filter(record => !context.messageId || record.messageId === context.messageId)
        .filter(record => renderSwipeId === undefined || record.swipeId === renderSwipeId)
        .map(record => `${record.key}:${isSlotLifecycleActive(record.status) ? 'active' : record.status}:${record.imageUrl || record.pendingPlacement?.imageUrl || ''}:${record.requestAspect || ''}:${record.error || ''}`)
        .join('|')
      const outputKey = `${scope}:${context.messageId || '__new__'}:${renderSwipeId ?? '__active__'}:${contentFingerprint(source)}:${snapshot.studio.rendererMode}:${snapshot.studio.defaultShellMode}:${snapshot.studio.colorMode}:${snapshot.narrativeVariant}:${contentFingerprint(recordSignature)}`
      const cached = renderOutputCache.get(outputKey)
      if (cached) return { content: cached.content }
      const renderContext = {
        chatId: context.chatId,
        messageId: context.messageId,
        swipeId: renderSwipeId,
        isUser: false,
        autoGenerate: snapshot.autoGenerate,
        rendererMode: snapshot.studio.rendererMode,
        colorMode: snapshot.studio.colorMode,
        records: snapshot.records
          .filter(record => !context.messageId || record.messageId === context.messageId)
          .filter(record => renderSwipeId === undefined || record.swipeId === renderSwipeId),
      }
      let renderedContent = source
      let renderedCount = 0
      if (nativeCandidate) {
        const rendered = renderNativeSurfaceMarkup(renderedContent, snapshot.studio, renderContext)
        renderedContent = rendered.content
        renderedCount += rendered.renderedCount
      }
      // Narrative Utilities are not part of the 46 built-in registry. Relay
      // executes their approved, bundled display transformations through this
      // isolated adapter so Relay/Hybrid modes do not depend on host Regex
      // enablement. Regex mode normally leaves them for Lumiverse Regex, but
      // failed media write-back gets a bounded Relay fallback so an older or
      // stale host Regex pack cannot expose raw Narrative syntax in the story.
      if (narrativeCandidate && shouldRelayRenderNarrativeMarkup(source, renderContext.rendererMode)) {
        const narrativeRendered = renderNarrativeRegex(renderedContent, snapshot.narrativeVariant, context.messageId || 'narrative', { chatId: context.chatId, swipeId: renderSwipeId })
        if (narrativeRendered !== renderedContent) renderedCount += 1
        renderedContent = narrativeRendered
      }
      if (renderedCount < 1 || renderedContent === source) return
      const messageScope = String(context.messageId || '__new__')
      const swipeScope = String(renderSwipeId ?? '__active__')
      renderOutputCache.deleteWhere((key, value) => key !== outputKey && value.scope === scope && value.messageId === messageScope && value.swipeId === swipeScope)
      renderOutputCache.set(outputKey, { content: renderedContent, scope, messageId: messageScope, swipeId: swipeScope })
      return { content: renderedContent }
    } catch (error) {
      spindle.log.warn(`[Reverie Relay] Render-time surface processing failed: ${error instanceof Error ? error.message : String(error)}`)
      return
    }
  }, 35)
}

const registerInterceptor = (spindle as unknown as { registerInterceptor?: typeof spindle.registerInterceptor }).registerInterceptor
if (typeof registerInterceptor === 'function') {
  ;(registerInterceptor as any).call(spindle, async (messages: LlmMessage[], context: any) => {
    const cleaned = messages.map(sanitizeRelayPromptMessage)
    const chatId = cleanString(context?.chatId || context?.chat_id)
    if (!chatId) return cleaned
    try {
      const state = await getState(chatId, context?.userId)
      const routerConfig = await getConfig(context?.userId)
      cacheRenderSnapshot(chatId, context?.userId, state, routerConfig)
      const storedSettings = proseSettingsForChat(state, chatId)
      const settings = await resolveCharacterOnlySettingsForPrompt(storedSettings, chatId, context?.userId, context)
      const personaPovContext = settings.perspectiveMode === 'persona-pov' ? await resolvePersonaPovContext(chatId, context?.userId) : undefined
      const runtimeDirective = buildIllustratorRuntimeDirective(settings, cleaned, personaPovContext)
      const illustratorPrompt = resolveIllustratorStoryPrompt(settings, cleaned, personaPovContext)
      latestIllustratorRuntimeByChat.set(chatId, { directive: runtimeDirective, createdAt: Date.now() })
      const studio = state.customSurfaces
      const macroUtility = buildEnabledSurfaceUtility(studio, 'macro')
      const narrativeUtility = buildResolvedNarrativeUtilityPrompt(routerConfig)
      let surfaceMacroExpanded = false
      let illustratorMacroExpanded = false
      let narrativeMacroExpanded = false

      const macroResolvedMessages = cleaned.map(message => {
        let content = cleanString((message as any)?.content)
        if (!content) return message
        // Current Lumiverse resolves Relay macros before this interceptor. The
        // expanded payload itself therefore proves that the user placed it and
        // prevents Automatic Injection from serializing the same Utility twice.
        if (/<reverie_surface_utility\b/i.test(content)) surfaceMacroExpanded = true
        if (/<reverie_narrative_utility\b/i.test(content)) narrativeMacroExpanded = true
        if (/<reverie_illustrator_runtime\b|\[REVERIE RELAY\s+[—-]\s+(?:MODEL-PLACED|RELAY-PLANNED)/i.test(content)) illustratorMacroExpanded = true
        ALL_MACRO_MARKER.lastIndex = 0
        if (ALL_MACRO_MARKER.test(content)) {
          surfaceMacroExpanded = true
          illustratorMacroExpanded = true
          narrativeMacroExpanded = true
          const all = [macroUtility.content, narrativeUtility.content, illustratorPrompt].filter(Boolean).join('\n\n')
          ALL_MACRO_MARKER.lastIndex = 0
          content = content.replace(ALL_MACRO_MARKER, all)
        }
        SURFACE_MACRO_MARKERS.lastIndex = 0
        if (SURFACE_MACRO_MARKERS.test(content)) {
          surfaceMacroExpanded = true
          SURFACE_MACRO_MARKERS.lastIndex = 0
          content = content.replace(SURFACE_MACRO_MARKERS, macroUtility.content)
        }
        ILLUSTRATOR_MACRO_MARKER.lastIndex = 0
        if (ILLUSTRATOR_MACRO_MARKER.test(content)) {
          illustratorMacroExpanded = true
          ILLUSTRATOR_MACRO_MARKER.lastIndex = 0
          content = content.replace(ILLUSTRATOR_MACRO_MARKER, illustratorPrompt)
        }
        NARRATIVE_MACRO_MARKER.lastIndex = 0
        if (NARRATIVE_MACRO_MARKER.test(content)) {
          narrativeMacroExpanded = true
          NARRATIVE_MACRO_MARKER.lastIndex = 0
          content = content.replace(NARRATIVE_MACRO_MARKER, narrativeUtility.content)
        }
        return { ...message, content } as LlmMessage
      })

      const automaticUtility = studio.utilityInjectionEnabled && !surfaceMacroExpanded
        ? buildEnabledSurfaceUtility(studio, 'automatic')
        : null
      if (!studio.utilityInjectionEnabled && !surfaceMacroExpanded) maybeWarnUtilityNotInjected(chatId, context?.userId)

      // Automatic injection must honor the live Prompt Registry override just like every
      // other model-facing prompt. The constant remains only as the registry default.
      const automaticSurfaceProtocol = studio.utilityInjectionEnabled && !surfaceMacroExpanded ? registryPrompt(settings, 'story.surface-protocol') : ''
      const automaticIllustrator = settings.mode === 'model-placed' && settings.automaticProtocolInjection && !illustratorMacroExpanded ? illustratorPrompt : ''
      const automaticNarrative = routerConfig.narrativeDlcEnabled && !narrativeMacroExpanded ? narrativeUtility.content : ''
      const automaticRuntime = ''
      const combined = [automaticSurfaceProtocol, automaticUtility?.content || '', automaticNarrative, automaticIllustrator, automaticRuntime].filter(Boolean).join('\n\n')
      if (!combined) {
        if (surfaceMacroExpanded) schedulePromptInjectionRecord(chatId, 'macro', 'macro-placement', macroUtility.moduleIds, `Expanded ${macroUtility.moduleIds.length} enabled surface module${macroUtility.moduleIds.length === 1 ? '' : 's'} at the placed macro.`, context?.userId)
        return macroResolvedMessages
      }
      const inserted = insertPromptDirective(macroResolvedMessages, combined, studio.utilityInjectionPosition || 'after-chat-history')
      const injectedNames = [
        automaticSurfaceProtocol ? 'surface protocol' : '',
        automaticUtility ? `surfaces (${automaticUtility.moduleIds.join(', ') || 'none'})` : '',
        automaticNarrative ? `Narrative Utilities (${narrativeUtility.utilityNames.length})` : '',
        automaticIllustrator ? `illustrator (${settings.mode})` : '',
        automaticRuntime ? 'live runtime' : '',
      ].filter(Boolean).join(' + ')
      if (automaticUtility) {
        schedulePromptInjectionRecord(chatId, 'automatic', studio.utilityInjectionPosition || 'after-chat-history', automaticUtility.moduleIds, `Automatically injected ${automaticUtility.moduleIds.length} enabled surface module${automaticUtility.moduleIds.length === 1 ? '' : 's'}.`, context?.userId)
      } else if (surfaceMacroExpanded) {
        schedulePromptInjectionRecord(chatId, 'macro', 'macro-placement', macroUtility.moduleIds, `Expanded ${macroUtility.moduleIds.length} enabled surface module${macroUtility.moduleIds.length === 1 ? '' : 's'} at the placed macro.`, context?.userId)
      }
      return {
        messages: inserted.messages,
        breakdown: [{
          messageIndex: inserted.index,
          name: 'Reverie Relay Prompt Injection',
          description: `Injected ${injectedNames || 'macro-expanded modules'} at ${studio.utilityInjectionPosition || 'after-chat-history'}.`,
        }],
      }
    } catch (error) {
      spindle.log.warn(`[Reverie Relay] Runtime directive fallback: ${error instanceof Error ? error.message : String(error)}`)
      return cleaned
    }
  }, { priority: 20 })
} else {
  spindle.log.warn('[Reverie Relay] Lumiverse interceptor API is unavailable; dynamic Surface and Illustrator prompt injection is unavailable.')
}

spindle.registerMacro({
  name: 'last_genned',
  category: `extension:${EXTENSION_ID}`,
  description: 'Latest persisted image URL generated by Reverie Relay for the active chat, with a global standalone fallback.',
  returnType: 'string',
  handler: ((ctx: any) => ctx?.env?.variables?.chat?.get?.('last_genned') || ctx?.env?.variables?.global?.get?.('last_genned') || '') as any,
})

function resolvedRelayMacroValue(ctx: any, name: 'reverie_surfaces' | 'reverie_illustrator' | 'reverie_narrative' | 'reverie_all'): string {
  const read = (scope: 'chat' | 'global', key: string) => cleanString(ctx?.env?.variables?.[scope]?.get?.(key))
  const cached = read('chat', name)
  if (cached) return cached
  // Do not borrow another chat's global cache or expand all defaults. The
  // interceptor resolves this marker against the active chat's live state.
  const markers = {
    reverie_surfaces: '<reverie_surfaces_macro/>',
    reverie_illustrator: '<reverie_illustrator_macro/>',
    reverie_narrative: '<reverie_narrative_macro/>',
    reverie_all: '<reverie_all_macro/>',
  } as const
  return markers[name]
}


for (const macro of [
  {
    name: 'reverie_surfaces',
    description: 'Dynamic enabled Surface Library modules. Relay expands only the surfaces switched on for the active chat.',
    marker: '<reverie_surfaces_macro/>',
  },
  {
    name: 'reverie_illustrator',
    description: 'Active Illustrator protocol plus live runtime settings for the active chat.',
    marker: '<reverie_illustrator_macro/>',
  },
  {
    name: 'reverie_narrative',
    description: 'Narrative Utility contracts. Expands only when Narrative Utilities are enabled.',
    marker: '<reverie_narrative_macro/>',
  },
  {
    name: 'reverie_all',
    description: 'Enabled Surface Library, Narrative Utilities, and active Illustrator protocol/runtime.',
    marker: '<reverie_all_macro/>',
  },
]) {
  spindle.registerMacro({
    name: macro.name,
    category: `extension:${EXTENSION_ID}`,
    description: macro.description,
    returnType: 'string',
    handler: ((ctx: any) => resolvedRelayMacroValue(ctx, macro.name as 'reverie_surfaces' | 'reverie_illustrator' | 'reverie_narrative' | 'reverie_all')) as any,
  })
}

// Migration aliases. They remain functional for existing presets but are no
// longer shown as the preferred user-facing macro names.
for (const alias of ['reverie_enabled_surfaces', 'reverie_relay_utility']) {
  spindle.registerMacro({
    name: alias,
    category: `extension:${EXTENSION_ID}`,
    description: 'Legacy alias for {{reverie_surfaces}}.',
    returnType: 'string',
    handler: ((ctx: any) => resolvedRelayMacroValue(ctx, 'reverie_surfaces')) as any,
  })
}

for (const macro of [
  { name: 'reverie_illustration_protocol', description: 'Complete Model-Placed prose illustration protocol. Active settings arrive separately in the live runtime.', value: REVERIE_ILLUSTRATION_PROTOCOL },
  { name: 'reverie_artifact_media_protocol', description: 'Complete secure generated-media protocol for authored HTML artifacts.', value: REVERIE_ARTIFACT_MEDIA_PROTOCOL },
  { name: 'reverie_surface_protocol', description: 'Complete semantic contract for Relay surfaces.', value: REVERIE_SURFACE_PROTOCOL },
]) {
  spindle.registerMacro({
    name: macro.name,
    category: `extension:${EXTENSION_ID}`,
    description: macro.description,
    returnType: 'string',
    handler: (() => macro.value) as any,
  })
}

// shipped release keeps stable user-facing macros separate from internal build numbers.


spindle.on('GENERATION_STARTED', (payload: any, userId?: string) => {
  const chatId = cleanString(payload?.chatId || payload?.chat_id)
  if (chatId) activeStreamingSurfaceChats.add(chatId)
  warmRenderSnapshot(chatId, userId)
  void recordLifecycleEvent('generation-started', payload, userId)
})

spindle.on('GENERATION_ENDED', (payload: any, userId?: string) => {
  const chatId = cleanString(payload?.chatId || payload?.chat_id)
  if (chatId) activeStreamingSurfaceChats.delete(chatId)
  void recordLifecycleEvent('generation-ended', payload, userId)
  void handleGenerationEnded(payload, userId).catch(error => {
    const message = error instanceof Error ? error.message : String(error)
    spindle.log.error(`[Reverie Relay:generation_ended] ${message}`)
    spindle.sendToFrontend({ type: 'error', source: 'GENERATION_ENDED', message }, userId)
  })
})

spindle.on('GENERATION_STOPPED', (payload: any, userId?: string) => {
  const chatId = cleanString(payload?.chatId || payload?.chat_id)
  if (chatId) activeStreamingSurfaceChats.delete(chatId)
  void recordLifecycleEvent('generation-stopped', payload, userId)
})

const runtimePermissionEvents = spindle.permissions as unknown as { onChanged?: (listener: (detail: { extensionId: string; permission: string; granted: boolean; allGranted: string[] }) => void) => unknown } | undefined
runtimePermissionEvents?.onChanged?.((detail: { extensionId: string; permission: string; granted: boolean; allGranted: string[] }) => {
  invalidateContextSnapshots()
  renderSnapshotCache.clear()
  renderOutputCache.clear()
  const required = ['generation', 'image_gen', 'images', 'chat_mutation'].includes(detail.permission)
  if (required && !detail.granted) abortAllImageStreams()
  spindle.sendToFrontend({
    type: 'relay_notice',
    level: detail.granted ? 'info' : 'warning',
    message: detail.granted
      ? `Relay refreshed capabilities after ${detail.permission} permission was granted.`
      : `Relay paused affected work because ${detail.permission} permission was revoked.`,
  })
})

spindle.on('MESSAGE_SENT', (payload: any, userId?: string) => {
  const chatId = cleanString(payload?.chatId || payload?.chat_id)
  const message = payload?.message as ChatMessage | undefined
  if (chatId && message?.id) rememberMessageSnapshot(chatId, message)
  if (!chatId || !message?.id || !isAssistantMessage(message) || isOwnMessage(message)) return
  scheduleAssistantScan({
    chatId,
    messageId: message.id,
    swipeId: activeSwipeId(message),
    userId,
    sourceContent: getSwipeContent(message, activeSwipeId(message)),
    source: 'message-sent',
    delayMs: 20,
  })
  scheduleProseOpportunityScan({
    chatId,
    messageId: message.id,
    swipeId: activeSwipeId(message),
    userId,
    sourceContent: getSwipeContent(message, activeSwipeId(message)),
    source: 'message-sent',
    delayMs: 80,
  })
})

spindle.on('CHARACTER_MESSAGE_RENDERED', (payload: any, userId?: string) => {
  const chatId = cleanString(payload?.chatId || payload?.chat_id)
  const messageId = cleanString(payload?.messageId || payload?.message_id)
  if (!chatId || !messageId) return
  if (activeStreamingSurfaceChats.has(chatId) || payload?.streaming === true || payload?.isStreaming === true) return
  scheduleAssistantScan({ chatId, messageId, userId, source: 'character-message-rendered', delayMs: 40 })
  scheduleProseOpportunityScan({ chatId, messageId, userId, source: 'character-message-rendered', delayMs: 120 })
})

const lifecycleOn = spindle.on as unknown as (event: string, handler: (payload: any, userId?: string) => void) => void
for (const eventName of ['MESSAGE_DELETED', 'MESSAGE_REMOVED', 'CHAT_MESSAGE_DELETED']) {
  lifecycleOn(eventName, (payload: any, userId?: string) => {
    const { chatId, messageId } = deletedMessageIdentity(payload)
    if (chatId && messageId) latestMessageSnapshots.delete(messageSnapshotKey(chatId, messageId))
    void handleMessageDeleted(payload, userId).catch(error => spindle.log.error(`[Reverie Relay:${eventName.toLocaleLowerCase()}] ${error instanceof Error ? error.message : String(error)}`))
  })
}

spindle.on('MESSAGE_SWIPED', (payload: any, userId?: string) => {
  const chatId = cleanString(payload?.chatId || payload?.chat_id)
  const message = payload?.message as ChatMessage | undefined
  if (chatId && message?.id) rememberMessageSnapshot(chatId, message)
  void handleSwipeLifecycle(payload, userId).catch(error => spindle.log.error(`[Reverie Relay:swipe_lifecycle] ${error instanceof Error ? error.message : String(error)}`))
})

spindle.on('MESSAGE_EDITED', (payload: any, userId?: string) => {
  const chatId = cleanString(payload?.chatId || payload?.chat_id)
  const messageId = cleanString(payload?.messageId || payload?.message_id || payload?.message?.id)
  if (!chatId || !messageId) return
  const mutationKey = `${chatId}:${messageId}`
  const message = payload?.message as ChatMessage | undefined
  if (message?.id) rememberMessageSnapshot(chatId, message)
  if (!extensionMessageMutations.has(mutationKey) && message && isAssistantMessage(message) && !isOwnMessage(message)) {
    const swipeId = activeSwipeId(message)
    const content = getSwipeContent(message, swipeId)
    if (containsRelayRequestMarkup(content)) {
      scheduleAssistantScan({ chatId, messageId, swipeId, userId, sourceContent: content, source: 'message-edited', delayMs: 60 })
    }
    void (async () => {
      const current = await getState(chatId, userId)
      const settings = proseSettingsForChat(current, chatId)
      const fingerprint = contentFingerprint(content)
      await mutateState(chatId, userId, next => markStaleProseOpportunities(next, chatId, messageId, swipeId, fingerprint))
      if (settings.reanalyzeEditedMessages) scheduleProseOpportunityScan({ chatId, messageId, swipeId, userId, sourceContent: content, source: 'message-edited', delayMs: 140 })
    })().catch(error => spindle.log.warn(`[Reverie Relay:message_edited_prose] ${error instanceof Error ? error.message : String(error)}`))
  }
  void reconcileChatState(chatId, userId, messageId).catch(error => spindle.log.warn(`[Reverie Relay:message_edited] ${error instanceof Error ? error.message : String(error)}`))
})

const acceptedSlotSubmissions = new Set<string>()

type SlotSubmissionMessage = Extract<FrontendMessage, { type: 'regenerate_slot' | 'regenerate_with_intent' | 'reparse_slot' | 'retry_placement' }>

function slotSubmissionDetails(payload: FrontendMessage): { submissionId: string; key: string; action: 'reparse' | 'regenerate' | 'regenerate-with-direction' | 'repair-placement' } | null {
  if (!('submissionId' in payload) || !payload.submissionId || !('key' in payload)) return null
  if (payload.type === 'reparse_slot') return { submissionId: payload.submissionId, key: payload.key, action: 'reparse' }
  if (payload.type === 'regenerate_with_intent') return { submissionId: payload.submissionId, key: payload.key, action: 'regenerate-with-direction' }
  if (payload.type === 'regenerate_slot') return { submissionId: payload.submissionId, key: payload.key, action: 'regenerate' }
  if (payload.type === 'retry_placement') return { submissionId: payload.submissionId, key: payload.key, action: 'repair-placement' }
  return null
}

async function acknowledgeSlotSubmission(payload: SlotSubmissionMessage, userId?: string): Promise<void> {
  const submission = slotSubmissionDetails(payload)
  if (!submission) return
  const { record } = await getRecordByKey(payload.key, userId)
  if (payload.type === 'reparse_slot' && !canReparseRecord(record)) throw new Error('This slot does not have enough source metadata to reparse.')
  if (payload.type === 'retry_placement' && (!['placement-pending', 'placement-repair-needed'].includes(record.status) || !record.pendingPlacement)) throw new Error('This slot has no preserved generated asset to repair or reinsert.')
  if (payload.type === 'regenerate_with_intent') {
    if (!canReparseRecord(record) && !canRegenerateRecord(record)) throw new Error('This slot does not have enough prompt metadata for direction regeneration.')
    if (isProcessing(record) || relayProcessingKeys.has(record.key)) throw new Error('This slot is already processing.')
  }
  if (payload.type === 'regenerate_slot' && !canReparseRecord(record) && !canRegenerateRecord(record)) throw new Error('This slot does not have enough prompt metadata to regenerate.')
  acceptedSlotSubmissions.add(submission.submissionId)
  spindle.sendToFrontend({
    type: 'slot_action_feedback',
    ...submission,
    status: 'accepted',
    statusText: payload.type === 'reparse_slot' ? 'Reparsing…' : payload.type === 'regenerate_with_intent' ? 'Applying direction…' : payload.type === 'retry_placement' ? 'Repairing placement…' : 'Preparing regeneration…',
    intent: payload.type === 'regenerate_with_intent' ? sanitizeRegenerationIntent(payload.intent) : undefined,
  }, userId)
}

spindle.onFrontendMessage((raw: unknown, userId?: string) => {
  const payload = raw as FrontendMessage
  void handleFrontendMessage(payload, userId).then(() => {
    const submission = slotSubmissionDetails(payload)
    if (submission && acceptedSlotSubmissions.delete(submission.submissionId)) {
      spindle.sendToFrontend({ type: 'slot_action_feedback', ...submission, status: 'completed' }, userId)
    }
  }).catch(error => {
    const type = payload && typeof payload === 'object' && 'type' in payload ? payload.type : 'unknown'
    const message = error instanceof Error ? error.message : String(error)
    const submission = slotSubmissionDetails(payload)
    if (submission) {
      const accepted = acceptedSlotSubmissions.delete(submission.submissionId)
      spindle.sendToFrontend({ type: 'slot_action_feedback', ...submission, status: accepted ? 'failed' : 'rejected', message }, userId)
    }
    if (error instanceof StaleOpportunityError) {
      spindle.log.warn(`[Reverie Relay:${type}] ${message}`)
      spindle.sendToFrontend({ type: 'relay_notice', level: 'warning', message }, userId)
      return
    }
    if (error instanceof Error && error.name === 'OperationCancelledError') {
      spindle.log.info(`[Reverie Relay:${type}] ${message}`)
      spindle.sendToFrontend({ type: 'relay_notice', level: 'info', message: 'Relay stopped the active operation.' }, userId)
      return
    }
    spindle.log.error(`[Reverie Relay:${type}] ${message}`)
    spindle.sendToFrontend({ type: 'error', source: type, message }, userId)
  })
})

async function handleGenerationEnded(payload: any, userId?: string): Promise<void> {
  const config = await getConfig(userId)
  const payloadContent = typeof payload?.content === 'string' ? payload.content : ''
  const payloadHasImageRequest = containsRelayRequestMarkup(payloadContent)
  const payloadHasProseIllustration = /<reverie-illustration\b/i.test(payloadContent)
  logStage(config, 'generation_ended', {
    chatId: payload?.chatId,
    messageId: payload?.messageId ?? null,
    generationType: payload?.generationType ?? null,
    hasError: Boolean(payload?.error),
    hasContent: Boolean(payload?.content),
    payloadContainsImageRequest: payloadHasImageRequest,
  })

  if (payload?.error || !payload?.chatId || !payload?.messageId || !payload?.content) return
  const runtime = latestIllustratorRuntimeByChat.get(cleanString(payload.chatId))
  if (runtime && Date.now() - runtime.createdAt < 15 * 60_000 && /<mode>model-placed<\/mode>/i.test(runtime.directive) && /<request_illustrations>true<\/request_illustrations>/i.test(runtime.directive) && !/<minimum_count>0<\/minimum_count>/i.test(runtime.directive) && !payloadHasProseIllustration) {
    const state = await getState(cleanString(payload.chatId), userId)
    const settings = proseSettingsForChat(state, cleanString(payload.chatId))
    if (isEligibleProseContent(payloadContent, settings)) {
      await mutateState(cleanString(payload.chatId), userId, next => appendStateLog(next, {
        severity: 'warning', stage: 'prose-illustrator-runtime', eventType: 'model_placed_requests_missing',
        chatId: cleanString(payload.chatId), messageId: cleanString(payload.messageId),
        message: 'Model-Placed requested prose illustrations, but the completed response contained no reverie-illustration tags.',
        details: { runtimeDirective: runtime.directive, contentFingerprint: contentFingerprint(payloadContent) },
      }))
      spindle.sendToFrontend({
        type: 'model_placed_requests_missing',
        chatId: cleanString(payload.chatId),
        messageId: cleanString(payload.messageId),
        runtimeDirective: runtime.directive,
      }, userId)
    }
  }
  // Appearance continuity is independent from auto-generation. Run it before this completed
  // response can enter the image queue, and also for ordinary assistant turns.
  try {
    const completed = await resolveMessage(cleanString(payload.chatId), cleanString(payload.messageId))
    if (completed && isAssistantMessage(completed) && !isOwnMessage(completed)) {
      await ensureAppearanceReadyForTurn({ chatId: cleanString(payload.chatId), messageId: cleanString(payload.messageId), swipeId: activeSwipeId(completed), content: payloadContent, userId, reason: 'generation-ended' })
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    await mutateState(cleanString(payload.chatId), userId, state => {
      state.continuityVault.appearanceSidecar.lastError = message
      appendStateLog(state, { severity: 'warning', stage: 'appearance-sidecar', eventType: 'appearance_sidecar_failed', chatId: cleanString(payload.chatId), messageId: cleanString(payload.messageId), message: `Appearance Sidecar fallback: ${message}` })
    })
  }
  scheduleProseOpportunityScan({
    chatId: cleanString(payload.chatId),
    messageId: cleanString(payload.messageId),
    userId,
    sourceContent: payloadContent,
    source: 'generation-ended',
    generationType: cleanString(payload.generationType),
    delayMs: 20,
  })
  if (payload.generationType === 'continue' || payload.generationType === 'impersonate') return

  const latest = await getConfig(userId)
  if (!latest.enabled) return
  if (payloadHasImageRequest) {
    pendingGenerationContent.set(pendingContentKey(payload.chatId, payload.messageId), {
      content: payloadContent,
      receivedAt: Date.now(),
    })
  }
  scheduleAssistantScan({
    chatId: cleanString(payload.chatId),
    messageId: cleanString(payload.messageId),
    userId,
    sourceContent: payloadContent,
    source: 'generation-ended',
    delayMs: 50,
  })
}

async function recordLifecycleEvent(stage: string, payload: any, userId?: string): Promise<void> {
  const chatId = cleanString(payload?.chatId || payload?.chat_id)
  if (!chatId) return
  const messageId = cleanString(payload?.messageId || payload?.message_id || payload?.message?.id)
  await mutateState(chatId, userId, state => appendStateLog(state, {
    severity: 'debug',
    stage,
    eventType: stage.replace(/-/g, '_'),
    chatId,
    messageId: messageId || undefined,
    message: `Observed ${stage}.`,
    details: {
      generationType: payload?.generationType ?? null,
      hasContent: typeof payload?.content === 'string',
      contentFingerprint: typeof payload?.content === 'string' ? contentFingerprint(payload.content) : null,
    },
  })).catch(error => spindle.log.warn(`[Reverie Relay:${stage}] ${error instanceof Error ? error.message : String(error)}`))
}

async function discoverProseOpportunities(input: {
  chatId: string
  messageId: string
  swipeId: number
  content: string
  source: string
  generationType?: string
  force?: boolean
  userId?: string
}): Promise<ProseIllustrationOpportunity[]> {
  if (!input.chatId || !input.messageId || !input.content) return []
  const state = await getState(input.chatId, input.userId)
  const settings = proseSettingsForChat(state, input.chatId)
  if (settings.perspectiveMode === 'persona-pov') {
    const personaPovContext = await resolvePersonaPovContext(input.chatId, input.userId)
    if (!personaPovContext.available) {
      await mutateState(input.chatId, input.userId, next => appendStateLog(next, {
        severity: 'warning', stage: 'prose-opportunity-discovery', eventType: 'persona_pov_unavailable',
        chatId: input.chatId, messageId: input.messageId, swipeId: input.swipeId,
        message: 'Persona POV skipped illustration planning because no chat-bound or active host Persona resolved.',
      }))
      spindle.sendToFrontend({ type: 'relay_notice', level: 'warning', message: 'Persona POV needs a chat-bound or active Persona before Relay can plan an illustration.' }, input.userId)
      return []
    }
  }
  await ensureAppearanceReadyForTurn({
    chatId: input.chatId, messageId: input.messageId, swipeId: input.swipeId,
    content: input.content, userId: input.userId, reason: `prose-opportunity:${input.source}`,
  })
  const operationKey = `prose:${input.chatId}`
  const queueTaskId = `analysis:${input.chatId}:${input.messageId}:${input.swipeId}`
  const operationSerial = captureAbortableOperation(operationKey)
  assertAbortableOperationCurrent(operationKey, operationSerial)
  const config = await getConfig(input.userId)
  const chatProfile = effectiveGenerationProfile(config, input.chatId)
  const discoveryEnabled = input.force || isHandsOffProseMode(settings)
  if (!discoveryEnabled || settings.mode === 'off') return []
  if (!input.force && !config.autoGenerate) {
    await mutateState(input.chatId, input.userId, next => appendStateLog(next, {
      severity: 'info', stage: 'prose-opportunity-discovery', eventType: 'automatic_provider_dispatch_suppressed',
      chatId: input.chatId, messageId: input.messageId, swipeId: input.swipeId,
      message: 'Auto Generate is off; Relay skipped automatic Sidecar and image-provider dispatch.',
      details: { source: input.source },
    }))
    return []
  }
  if (!isEligibleProseContent(input.content, settings)) return []
  const existingCount = countCommittedProseIllustrationsForMessage(state, input.chatId, input.messageId, input.swipeId) + countActiveProsePlansForMessage(state, input.chatId, input.messageId, input.swipeId)
  if (existingCount >= settings.maximumIllustrationsPerMessage) {
    await mutateState(input.chatId, input.userId, next => appendStateLog(next, {
      severity: 'info', stage: 'prose-opportunity-discovery', eventType: 'prose_opportunity_limit_reached',
      chatId: input.chatId, messageId: input.messageId, swipeId: input.swipeId,
      message: 'Skipped Prose Illustrator discovery because this message is already at the configured illustration limit.',
      details: { existingCount, maximumIllustrationsPerMessage: settings.maximumIllustrationsPerMessage },
    }))
    return []
  }
  const settingsFingerprint = proseOpportunitySettingsFingerprint(settings)
  const sourceFingerprint = contentFingerprint(input.content)
  if (!input.force) {
    const frequency = await evaluateAndPersistProseFrequencyGate({ chatId: input.chatId, messageId: input.messageId, swipeId: input.swipeId, sourceContentFingerprint: sourceFingerprint, settingsFingerprint }, settings, input.userId)
    if (!frequency.passes) return []
  }
  const idempotenceKey = proseOpportunityIdempotenceKey(input.chatId, input.messageId, input.swipeId, sourceFingerprint, settingsFingerprint)
  if (!input.force && state.proseIllustrator.processedMessageKeys[idempotenceKey]) return []
  if (!settings.plannerConnectionId) {
    await mutateState(input.chatId, input.userId, next => {
      next.proseIllustrator.processedMessageKeys[idempotenceKey] = Date.now()
      appendStateLog(next, {
        severity: 'warning', stage: 'prose-opportunity-discovery', eventType: 'prose_sidecar_unavailable',
        chatId: input.chatId, messageId: input.messageId, swipeId: input.swipeId,
        message: 'Planner unavailable. Configure a Relay-Planned connection or use Model-Placed mode.',
        details: { settingsFingerprint, source: input.source },
      })
    })
    await sendState(input.userId, input.chatId)
    return []
  }
  await mutateState(input.chatId, input.userId, next => {
    next.proseIllustrator.processedMessageKeys[idempotenceKey] = Date.now()
    markStaleProseOpportunities(next, input.chatId, input.messageId, input.swipeId, sourceFingerprint)
    startBackgroundTask(next, {
      id: queueTaskId,
      chatId: input.chatId,
      source: 'analysis',
      label: 'Analyze illustration opportunities',
      stage: 'analyzing',
      statusText: 'Analyzing message 1/1',
      current: 0,
      total: 1,
      requestId: input.messageId,
    })
    appendStateLog(next, {
      severity: 'info', stage: 'prose-opportunity-discovery', eventType: 'prose_opportunity_analysis_started',
      chatId: input.chatId, messageId: input.messageId, swipeId: input.swipeId,
      message: 'Sidecar opportunity discovery started.',
      details: { source: input.source, settingsFingerprint, sourceFingerprint, plannerVersion: PROSE_OPPORTUNITY_PLANNER_VERSION },
    })
  })
  await sendState(input.userId, input.chatId)

  try {
    const connection = await spindle.connections.get(settings.plannerConnectionId, input.userId)
    if (!connection) throw new Error('Prose Illustrator Sidecar connection not found.')
    const messages = await buildProseOpportunityMessages(input.chatId, input.messageId, input.swipeId, input.content, settings, input.userId)
    assertAbortableOperationCurrent(operationKey, operationSerial)
    const raw = await generateParserText({ id: connection.id, name: connection.name, provider: connection.provider, model: connection.model }, {
      ...config,
      parserModel: settings.plannerModel || connection.model,
      parserParameters: settings.plannerParameters,
    }, messages, input.userId, input.chatId, undefined, 'opportunity')
    assertAbortableOperationCurrent(operationKey, operationSerial)
    const parsed = parseProseOpportunityJson(raw)
    const opportunities = normalizeProseOpportunities(input, settings, parsed, {
      connectionId: connection.id,
      model: settings.plannerModel || connection.model,
      settingsFingerprint,
      sourceFingerprint,
    })
    assertAbortableOperationCurrent(operationKey, operationSerial)
    const accepted: ProseIllustrationOpportunity[] = []
    await mutateState(input.chatId, input.userId, next => {
      for (const opportunity of opportunities) {
        next.proseIllustrator.opportunities[opportunity.opportunityId] = opportunity
        accepted.push(opportunity)
      }
      if (isHandsOffProseMode(settings)) {
        delete next.proseIllustrator.activeOpportunityIdByChat[input.chatId]
        delete next.proseIllustrator.activePlanIdByChat[input.chatId]
      }
      finishBackgroundTask(next, queueTaskId, accepted.length ? `Found ${accepted.length} visual beat${accepted.length === 1 ? '' : 's'}` : 'No strong visual beats found')
      appendStateLog(next, {
        severity: accepted.length ? 'info' : 'info',
        stage: 'prose-opportunity-discovery',
        eventType: 'prose_opportunity_analysis_completed',
        chatId: input.chatId, messageId: input.messageId, swipeId: input.swipeId,
        message: accepted.length ? `Sidecar found ${accepted.length} Prose Illustrator opportunit${accepted.length === 1 ? 'y' : 'ies'}.` : 'Sidecar found no strong Prose Illustrator opportunity.',
        details: { raw: parsed, accepted, ignoredCount: opportunities.length - accepted.length },
      })
    })
    await sendState(input.userId, input.chatId)
    spindle.sendToFrontend({
      type: 'prose_opportunities_ready',
      chatId: input.chatId,
      messageId: input.messageId,
      swipeId: input.swipeId,
      opportunities: accepted,
      source: input.source,
    }, input.userId)
    assertAbortableOperationCurrent(operationKey, operationSerial)
    if (isHandsOffProseMode(settings)) await handleAutoOpportunityDispatch(input.chatId, accepted, input.userId)
    return accepted
  } catch (error) {
    if (error instanceof Error && error.name === 'OperationCancelledError') {
      await mutateState(input.chatId, input.userId, next => {
        updateBackgroundTask(next, queueTaskId, { stage: 'cancelled', statusText: 'Analysis cancelled', etaSeconds: null })
        appendStateLog(next, {
          severity: 'info', stage: 'prose-opportunity-discovery', eventType: 'prose_opportunity_analysis_cancelled',
          chatId: input.chatId, messageId: input.messageId, swipeId: input.swipeId,
          message: 'Scene analysis was cancelled by the user.',
        })
      })
      await sendState(input.userId, input.chatId)
      return []
    }
    const message = error instanceof Error ? error.message : String(error)
    await mutateState(input.chatId, input.userId, next => {
      failBackgroundTask(next, queueTaskId, message)
      const failedId = `opp-failed-${contentFingerprint(`${idempotenceKey}:${message}`).replace(/[^a-z0-9]/gi, '-')}`
      next.proseIllustrator.opportunities[failedId] = {
        opportunityId: failedId, chatId: input.chatId, messageId: input.messageId, swipeId: input.swipeId,
        sourceContentFingerprint: sourceFingerprint, settingsFingerprint, plannerVersion: PROSE_OPPORTUNITY_PLANNER_VERSION,
        status: 'failed-analysis', title: 'Sidecar analysis failed', reason: message, sceneSummary: '', selectedExcerpt: '',
        paragraphIndex: 0, insertionSide: 'after', composition: '', peoplePolicy: 'allowed', expectedPeopleCount: 0,
        namedSubjects: [], omittedSubjects: [], backgroundPeople: '', location: '', timeOfDay: '', mood: '',
        importantProps: [], recommendedProfileId: settings.defaultPromptProfileId, recommendedAspectRatio: settings.defaultAspectRatio,
        continuityFactIds: [], referenceAssetIds: [], locationReferenceAssetIds: [], confidence: 0,
        sidecarConnectionId: settings.plannerConnectionId, sidecarModel: settings.plannerModel,
        createdAt: Date.now(), updatedAt: Date.now(), warning: message,
      }
      appendStateLog(next, {
        severity: 'error', stage: 'prose-opportunity-discovery', eventType: 'prose_opportunity_analysis_failed',
        chatId: input.chatId, messageId: input.messageId, swipeId: input.swipeId, errorMessage: message,
        message: 'Sidecar opportunity discovery failed.',
      })
    })
    await sendState(input.userId, input.chatId)
    return []
  }
}

export async function buildProseOpportunityMessages(
  chatId: string,
  messageId: string,
  swipeId: number,
  content: string,
  settings: ProseIllustratorSettings,
  userId?: string,
): Promise<Array<{ role: 'system' | 'user' | 'assistant'; content: string }>> {
  await ensureCanonicalSubjectsForGeneration(chatId, [], userId)
  const state = await getState(chatId, userId)
  const messages = await spindle.chat.getMessages(chatId) as ChatMessage[]
  const targetIndex = Math.max(0, messages.findIndex(message => message.id === messageId))
  const filtered: string[] = []
  const recent = messages.slice(Math.max(0, targetIndex - settings.contextMessageCount), targetIndex)
    .filter(message => message.role === 'user' || message.role === 'assistant')
    .filter(message => !isOwnMessage(message))
    .map(message => {
      const text = sanitizeRecentVisualContext(getSwipeContent(message, activeSwipeId(message)))
      if (!text) filtered.push(message.id || 'unknown')
      return text
    })
    .filter(Boolean)
    .slice(-settings.contextMessageCount)
  const namedSubjects = settings.perspectiveMode === 'solo-scene' ? selectedCharacterOnlySubjects(settings) : extractCharacterCandidates(`${content} ${recent.join(' ')}`)
  const facts = selectProseContinuityFacts(state, chatId, settings, namedSubjects)
  const references = selectProseReferenceAssets(state, chatId, settings, false)
  const locationReferences = selectProseReferenceAssets(state, chatId, settings, true)
  const existingIllustrations = Object.values(state.proseIllustrator.records)
    .filter(record => state.proseIllustrator.plans[record.planId]?.messageId === messageId && state.proseIllustrator.plans[record.planId]?.swipeId === swipeId)
    .map(record => `${record.requestId}: ${record.status}`)
  const personaPovContext = settings.perspectiveMode === 'persona-pov' ? await resolvePersonaPovContext(chatId, userId) : undefined
  return sidecarRegistryMessages(settings, 'opportunity', {
    plannerVersion: PROSE_OPPORTUNITY_PLANNER_VERSION,
    identity: { chatId, messageId, swipeId },
    settings: {
      mode: settings.mode, maximumCharacters: settings.maximumCharacters, frequency: settings.frequencyMode,
      minimumImages: settings.minimumImages, maximumImages: settings.maximumImages,
      maximumIllustrationsPerMessage: settings.maximumIllustrationsPerMessage,
      maximumOpportunitiesPerMessage: settings.maximumOpportunitiesPerMessage,
      placementPolicy: settings.placementPolicy, profile: settings.defaultPromptProfileId,
      aspectPolicy: settings.defaultAspectRatio, framingMode: settings.perspectiveMode,
      framingPrompt: effectiveFramingPrompt(settings), adaptiveFraming: settings.adaptiveMode,
    },
    characterOnlyConstraint: characterOnlyConstraint(settings),
    personaPovContext,
    appearanceMemory: settings.appearanceMemoryEnabled ? formatSelectedAppearanceFacts(facts) : '',
    references, locationReferences, existingIllustrations, recentContext: recent, filteredMessageIds: filtered,
    paragraphs: proseParagraphs(content).map((paragraph, index) => ({ index, text: compact(paragraph, 1100) })),
  })
}

function parseProseOpportunityJson(raw: string): Record<string, unknown> {
  const clean = raw.trim().replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim()
  const json = clean.startsWith('{') ? clean : clean.slice(clean.indexOf('{'), clean.lastIndexOf('}') + 1)
  const parsed = JSON.parse(json) as Record<string, unknown>
  if (!Array.isArray(parsed.opportunities)) throw new Error('Sidecar opportunity JSON must include an opportunities array.')
  return parsed
}

function normalizeProseOpportunities(
  input: { chatId: string; messageId: string; swipeId: number; content: string },
  settings: ProseIllustratorSettings,
  parsed: Record<string, unknown>,
  meta: { connectionId: string; model: string; settingsFingerprint: string; sourceFingerprint: string },
): ProseIllustrationOpportunity[] {
  const paragraphs = proseParagraphs(input.content)
    const rows = Array.isArray(parsed.opportunities) ? parsed.opportunities.slice(0, Math.max(0, settings.maximumOpportunitiesPerMessage)) : []
  const now = Date.now()
  const out: ProseIllustrationOpportunity[] = []
  for (const row of rows) {
    const raw = cleanParameters(row)
    const selectedExcerpt = cleanString(raw.selectedExcerpt)
    const paragraphIndex = clampInt(raw.paragraphIndex, 0, Math.max(0, paragraphs.length - 1), bestParagraphIndex(paragraphs, selectedExcerpt))
    if (!paragraphs[paragraphIndex]) continue
    const excerptPresent = selectedExcerpt ? prosePlainText(input.content).toLocaleLowerCase().includes(prosePlainText(selectedExcerpt).toLocaleLowerCase()) : true
    const requestedNamed = stringList(raw.namedSubjects)
    const allowedCharacterOnly = selectedCharacterOnlySubjects(settings)
    const named = settings.perspectiveMode === 'solo-scene'
      ? (requestedNamed.length ? requestedNamed.filter(name => allowedCharacterOnly.some(allowed => allowed.toLocaleLowerCase() === name.toLocaleLowerCase())) : allowedCharacterOnly)
      : requestedNamed
    const limited = enforceMaximumCharacters(named, settings.maximumCharacters)
    const insertionRaw = cleanString(raw.insertionSide)
    const peoplePolicyRaw = cleanString(raw.peoplePolicy)
    const baseId = cleanString(raw.opportunityId) || cleanString(raw.title) || `${paragraphIndex}:${selectedExcerpt || paragraphs[paragraphIndex]}`
    const opportunityId = `opp-${contentFingerprint(`${input.chatId}:${input.messageId}:${input.swipeId}:${meta.sourceFingerprint}:${baseId}`).replace(/[^a-z0-9]/gi, '-')}`
    out.push({
      opportunityId,
      chatId: input.chatId,
      messageId: input.messageId,
      swipeId: input.swipeId,
      sourceContentFingerprint: meta.sourceFingerprint,
      settingsFingerprint: meta.settingsFingerprint,
      plannerVersion: PROSE_OPPORTUNITY_PLANNER_VERSION,
      status: 'proposed',
      title: cleanString(raw.title) || 'Prose illustration opportunity',
      reason: cleanString(raw.reason) || 'Sidecar identified this as a strong visual beat.',
      sceneSummary: cleanString(raw.sceneSummary) || cleanString(raw.sceneBrief) || selectedExcerpt || paragraphs[paragraphIndex],
      selectedExcerpt: selectedExcerpt || paragraphs[paragraphIndex],
      paragraphIndex,
      insertionSide: ['before', 'after', 'end'].includes(insertionRaw) ? insertionRaw as ProseIllustrationAnchor['insertionSide'] : placementSideFromPolicy(settings.placementPolicy),
      composition: cleanString(raw.composition),
      peoplePolicy: settings.perspectiveMode === 'solo-scene' ? 'required' : ['required', 'allowed', 'forbidden'].includes(peoplePolicyRaw) ? peoplePolicyRaw as ProseIllustratorPeoplePolicy : 'allowed',
      expectedPeopleCount: settings.perspectiveMode === 'solo-scene' ? limited.kept.length : Math.min(clampInt(raw.expectedPeopleCount, 0, 64, limited.kept.length), settings.maximumCharacters > 0 ? settings.maximumCharacters : clampInt(raw.expectedPeopleCount, 0, 64, limited.kept.length)),
      namedSubjects: limited.kept,
      omittedSubjects: limited.omitted,
      backgroundPeople: settings.perspectiveMode === 'solo-scene' ? '' : cleanString(raw.backgroundPeople),
      location: cleanString(raw.location),
      timeOfDay: cleanString(raw.timeOfDay),
      mood: cleanString(raw.mood),
      importantProps: stringList(raw.importantProps).slice(0, 12),
      recommendedProfileId: cleanString(raw.recommendedProfileId) || cleanString(raw.promptProfileId) || settings.defaultPromptProfileId,
      recommendedAspectRatio: resolveAdaptiveAspect(cleanString(raw.recommendedAspectRatio) || cleanString(raw.aspectRatio) || settings.defaultAspectRatio, `${cleanString(raw.sceneSummary)} ${cleanString(raw.composition)} ${selectedExcerpt}`, limited.kept.length),
      visualPlan: cleanParameters(raw.visualPlan),
      continuityFactIds: stringList(raw.continuityFactIds).slice(0, 16),
      referenceAssetIds: stringList(raw.referenceAssetIds).slice(0, 16),
      locationReferenceAssetIds: settings.reuseLocationReferences ? stringList(raw.locationReferenceAssetIds).slice(0, 16) : [],
      confidence: clampNumber(Number(raw.confidence), 0, 1, 0.5),
      sidecarConnectionId: meta.connectionId,
      sidecarModel: meta.model,
      sidecarOutput: cleanParameters(raw),
      contextSummary: {
        excerptPresent,
        maximumCharactersInImage: settings.maximumCharacters,
        omittedSubjects: limited.omitted,
      },
      createdAt: now,
      updatedAt: now,
      warning: excerptPresent ? undefined : 'Selected excerpt was normalized because the exact Sidecar excerpt was not found in the message.',
    })
  }
  return out
}

export function isUnresolvedCharacterMacro(value: unknown): boolean {
  return /^\{\{\s*char\s*\}\}$/i.test(cleanString(value))
}

function selectedCharacterOnlySubjects(settings: ProseIllustratorSettings): string[] {
  const selected = [...new Set(cleanString(settings.characterOnlySubjects)
    .split(/[,\n]/)
    .map(item => cleanString(item))
    .filter(item => Boolean(item) && !isUnresolvedCharacterMacro(item)))]
  return selected.length ? [selected[0]] : []
}

export function replaceCharacterMacro(value: unknown, characterName: string): string {
  const replacement = cleanString(characterName) || 'the current chat character'
  return cleanString(value).replace(/\{\{\s*char\s*\}\}/gi, replacement)
}

function characterNameFromInterceptorContext(context: any): string {
  return firstString(
    context?.characterName,
    context?.character_name,
    context?.charName,
    context?.char_name,
    context?.character?.name,
    context?.char?.name,
    context?.metadata?.characterName,
    context?.metadata?.character_name,
  )
}

function cachedChatCharacterIdentity(chatId: string): { id: string; name: string; aliases: string[]; avatarUrl?: string } | null | undefined {
  const cached = chatCharacterIdentityCache.get(chatId)
  if (!cached) return undefined
  if (Date.now() - cached.cachedAt > CHAT_CHARACTER_IDENTITY_CACHE_TTL_MS) {
    chatCharacterIdentityCache.delete(chatId)
    return undefined
  }
  return cached.value
}

async function resolveCharacterOnlySettingsForPrompt(settings: ProseIllustratorSettings, chatId: string, userId?: string, context?: any): Promise<ProseIllustratorSettings> {
  if (settings.perspectiveMode !== 'solo-scene') return settings
  const explicit = selectedCharacterOnlySubjects(settings)[0]
  let resolvedName = explicit || characterNameFromInterceptorContext(context)
  if (!resolvedName) {
    const cached = cachedChatCharacterIdentity(chatId)
    if (cached !== undefined) resolvedName = cached?.name || ''
    else {
      const identity = await readChatCharacterIdentity(chatId, userId)
      chatCharacterIdentityCache.set(chatId, { value: identity, cachedAt: Date.now() })
      resolvedName = identity?.name || ''
    }
  }
  if (resolvedName) chatCharacterIdentityCache.set(chatId, { value: { id: '', name: resolvedName, aliases: [] }, cachedAt: Date.now() })
  return {
    ...settings,
    characterOnlySubjects: resolvedName,
    characterOnlyFramingPrompt: replaceCharacterMacro(settings.characterOnlyFramingPrompt || DEFAULT_ILLUSTRATOR_FRAMING_PROMPTS['solo-scene'], resolvedName),
  }
}

function normalizedCharacterOnlyFramingPrompt(value: unknown, fallback: string): string {
  const prompt = cleanString(value)
  if (!prompt) return fallback
  const normalized = prompt.toLocaleLowerCase()
  const legacyReferencePrompt = normalized.includes('plan reusable character-reference images')
    || normalized.includes('setting.place contains "white background"')
    || normalized.includes('setting.environment contains "simple background"')
    || (normalized.includes('white background') && normalized.includes('simple background') && !normalized.includes('do not replace'))
  return legacyReferencePrompt ? fallback : prompt
}

function effectiveFramingPrompt(settings: ProseIllustratorSettings): string {
  const selected = selectedCharacterOnlySubjects(settings)[0] || ''
  const registered = registryPrompt(settings, `story.framing.${settings.perspectiveMode}`)
  if (settings.perspectiveMode === 'solo-scene') return replaceCharacterMacro(registered, selected)
  return registered
}

function resolveAdaptiveAspect(policy: string, scene: string, peopleCount = 0): string {
  if (policy && policy !== 'adaptive') return policy
  const value = cleanString(scene).toLocaleLowerCase()
  if (/\b(?:phone|story|full[- ]body|standing portrait|vertical|tower|tall building)\b/.test(value)) return peopleCount > 1 ? '4:5' : '3:4'
  if (/\b(?:panorama|landscape|horizon|wide shot|cityscape|road|vehicle interior)\b/.test(value)) return '16:9'
  if (/\b(?:icon|avatar|album|object close-up|food|product)\b/.test(value) && peopleCount < 2) return '1:1'
  return peopleCount > 2 ? '16:9' : peopleCount === 1 ? '3:4' : '4:3'
}

function characterOnlyConstraint(settings: ProseIllustratorSettings): string {
  if (settings.perspectiveMode !== 'solo-scene') return ''
  const subjects = selectedCharacterOnlySubjects(settings)
  return [
    'CHARACTER ONLY HARD CONSTRAINT.',
    `The one allowed visible character is: ${subjects[0] || 'the current chat character'}.`,
    'Exactly one visible person must appear. The selected character remains inside the current narrative scene, with the real location, environment, props, lighting, weather, action, pose, expression, outfit, injuries, and continuity details preserved.',
    'Do not extract the character onto a white, plain, simple, studio, character-sheet, or reference-sheet background unless that is literally the current story setting.',
    'Reject the opportunity before generation if it contains any other visible person. Background people, crowds, silhouettes, reflections, posters, screens, and cropped body parts that read as another person count as visible people.',
    'Use only the selected character in namedSubjects, set expectedPeopleCount to 1, and set backgroundPeople to an empty string. Add extra person, background people, crowd, duplicate person, and unrelated character to negativePrompt.',
  ].join('\n')
}

function enforceMaximumCharacters(subjects: string[], maximum: number): { kept: string[]; omitted: string[] } {
  const clean = [...new Set(subjects.map(subject => subject.trim()).filter(Boolean))]
  if (maximum <= 0 || clean.length <= maximum) return { kept: clean, omitted: [] }
  return { kept: clean.slice(0, maximum), omitted: clean.slice(maximum) }
}

function selectProseContinuityFacts(
  state: StateFile,
  chatId: string,
  settings: ProseIllustratorSettings,
  namedSubjects: string[] = [],
): ContinuityFact[] {
  if (!settings.appearanceMemoryEnabled || settings.continuityStrength === 'off' || state.continuityVault.strength === 'off') return []
  expireCurrentAppearance(state.continuityVault)
  return selectContinuityForSubjects(state.continuityVault, {
    subjectNames: namedSubjects,
    chatId,
    sceneBrief: '',
    strength: settings.continuityStrength,
  }).included
}

function selectProseReferenceAssets(state: StateFile, chatId: string, settings: ProseIllustratorSettings, locationOnly: boolean): VisualAssetReference[] {
  if (locationOnly && !settings.reuseLocationReferences) return []
  if (!locationOnly && !settings.reuseAcceptedReferences) return []
  return Object.values(state.assetLibrary.assets || {})
    .filter(asset => asset.chatId === chatId && asset.status === 'available' && asset.visualReference)
    .filter(asset => locationOnly ? asset.locationNames.length > 0 : true)
    .slice(0, 8)
}

function countCommittedProseIllustrationsForMessage(state: StateFile, chatId: string, messageId: string, swipeId: number): number {
  return Object.values(state.proseIllustrator.records || {}).filter(record => {
    const plan = state.proseIllustrator.plans[record.planId]
    return plan?.chatId === chatId && plan.messageId === messageId && plan.swipeId === swipeId && record.status !== 'removed'
  }).length
}

function countActiveProsePlansForMessage(state: StateFile, chatId: string, messageId: string, swipeId: number): number {
  return Object.values(state.proseIllustrator.plans || {}).filter(plan =>
    plan.chatId === chatId && plan.messageId === messageId && plan.swipeId === swipeId &&
    ['awaiting-approval', 'ready', 'candidate-review', 'generated'].includes(plan.status) &&
    !Object.values(state.proseIllustrator.records || {}).some(record => record.planId === plan.planId && record.status === 'completed'),
  ).length
}

function countProposedOpportunitiesForMessage(state: StateFile, chatId: string, messageId: string, swipeId: number, sourceFingerprint: string): number {
  return Object.values(state.proseIllustrator.opportunities || {}).filter(opportunity =>
    opportunity.chatId === chatId && opportunity.messageId === messageId && opportunity.swipeId === swipeId &&
    opportunity.sourceContentFingerprint === sourceFingerprint && ['proposed', 'selected'].includes(opportunity.status),
  ).length
}

async function evaluateAndPersistProseFrequencyGate(input: { chatId: string; messageId: string; swipeId: number; sourceContentFingerprint: string; settingsFingerprint: string }, settings: ProseIllustratorSettings, userId?: string): Promise<{ eligibleOrdinal: number; frequencyMode: string; everyN: number; passes: boolean; alreadyCounted: boolean }> {
  const key = `${input.chatId}:${input.messageId}:${input.swipeId}:${input.sourceContentFingerprint}:${input.settingsFingerprint}`
  let result = { eligibleOrdinal: 0, frequencyMode: settings.frequencyMode, everyN: Math.max(1, settings.everyNEligibleMessages), passes: true, alreadyCounted: false }
  await mutateState(input.chatId, userId, state => {
    const existing = state.proseIllustrator.frequencyDecisions[key]
    if (existing) {
      result = { eligibleOrdinal: existing.eligibleOrdinal, frequencyMode: settings.frequencyMode, everyN: existing.everyN, passes: existing.passes, alreadyCounted: true }
      return
    }
    const counters = state.proseIllustrator.autoCounters[input.chatId] || { eligibleMessages: 0, updatedAt: Date.now() }
    counters.eligibleMessages += 1
    counters.updatedAt = Date.now()
    const passes = settings.frequencyMode !== 'every-n' || ((counters.eligibleMessages - 1) % Math.max(1, settings.everyNEligibleMessages)) === 0
    state.proseIllustrator.autoCounters[input.chatId] = counters
    state.proseIllustrator.frequencyDecisions[key] = { eligibleOrdinal: counters.eligibleMessages, passes, everyN: Math.max(1, settings.everyNEligibleMessages), recordedAt: Date.now() }
    result = { eligibleOrdinal: counters.eligibleMessages, frequencyMode: settings.frequencyMode, everyN: Math.max(1, settings.everyNEligibleMessages), passes, alreadyCounted: false }
  })
  return result
}

function proseOpportunitySettingsFingerprint(settings: ProseIllustratorSettings): string {
  return contentFingerprint(JSON.stringify({
    mode: settings.mode,
    plannerConnectionId: settings.plannerConnectionId,
    plannerModel: settings.plannerModel,
    contextMessageCount: settings.contextMessageCount,
    maximumCharacters: settings.maximumCharacters,
    maximumOpportunitiesPerMessage: settings.maximumOpportunitiesPerMessage,
    frequencyMode: settings.frequencyMode,
    everyNEligibleMessages: settings.everyNEligibleMessages,
    maximumIllustrationsPerMessage: settings.maximumIllustrationsPerMessage,
    defaultPromptProfileId: settings.defaultPromptProfileId,
    defaultAspectRatio: settings.defaultAspectRatio,
    continuityStrength: settings.continuityStrength,
    reuseAcceptedReferences: settings.reuseAcceptedReferences,
    reuseLocationReferences: settings.reuseLocationReferences,
    placementPolicy: settings.placementPolicy,
    highResolutionModifier: settings.highResolutionModifier,
    imageAlignment: settings.imageAlignment,
    imageSize: settings.imageSize,
  }))
}

function proseOpportunityIdempotenceKey(chatId: string, messageId: string, swipeId: number, sourceFingerprint: string, settingsFingerprint: string): string {
  return `${chatId}:${messageId}:${swipeId}:${sourceFingerprint}:${PROSE_OPPORTUNITY_PLANNER_VERSION}:${settingsFingerprint}`
}

function markStaleProseOpportunities(state: StateFile, chatId: string, messageId: string, swipeId: number, sourceFingerprint: string): void {
  const now = Date.now()
  for (const opportunity of Object.values(state.proseIllustrator.opportunities || {})) {
    if (opportunity.chatId !== chatId || opportunity.messageId !== messageId || opportunity.swipeId !== swipeId) continue
    if (opportunity.sourceContentFingerprint === sourceFingerprint) continue
    if (['generated', 'dismissed', 'stale', 'superseded'].includes(opportunity.status)) continue
    opportunity.status = 'stale'
    opportunity.staleAt = now
    opportunity.updatedAt = now
  }
}

function scheduleAssistantScan(input: {
  chatId: string
  messageId: string
  swipeId?: number
  userId?: string
  sourceContent?: string
  source: string
  delayMs?: number
  attempt?: number
}): void {
  if (!input.chatId || !input.messageId) return
  const key = `${input.chatId}:${input.messageId}:${input.swipeId ?? '__active__'}`
  const existing = scheduledAssistantScans.get(key)
  if (existing?.timer) clearTimeout(existing.timer)
  const scheduled = existing || {
    chatId: input.chatId,
    messageId: input.messageId,
    swipeId: input.swipeId,
    userId: input.userId,
    sourceContent: input.sourceContent,
    sources: new Set<string>(),
    attempt: input.attempt ?? 0,
  }
  scheduled.sources.add(input.source)
  scheduled.userId = input.userId ?? scheduled.userId
  scheduled.swipeId = input.swipeId ?? scheduled.swipeId
  if (containsRelayRequestMarkup(input.sourceContent) || !scheduled.sourceContent) scheduled.sourceContent = input.sourceContent
  scheduled.attempt = Math.max(scheduled.attempt, input.attempt ?? 0)
  scheduled.timer = setTimeout(() => {
    scheduledAssistantScans.delete(key)
    void flushAssistantScan(scheduled).catch(error => {
      spindle.log.error(`[Reverie Relay:assistant_scan] ${error instanceof Error ? error.message : String(error)}`)
    })
  }, input.delayMs ?? 75)
  scheduledAssistantScans.set(key, scheduled)
}

function scheduleProseOpportunityScan(input: {
  chatId: string
  messageId: string
  swipeId?: number
  userId?: string
  sourceContent?: string
  source: string
  generationType?: string
  delayMs?: number
  attempt?: number
}): void {
  if (!input.chatId || !input.messageId) return
  const key = `${input.chatId}:${input.messageId}:${input.swipeId ?? '__active__'}`
  const existing = scheduledProseOpportunityScans.get(key)
  if (existing?.timer) clearTimeout(existing.timer)
  const scheduled = existing || {
    chatId: input.chatId,
    messageId: input.messageId,
    swipeId: input.swipeId,
    userId: input.userId,
    sourceContent: input.sourceContent,
    sources: new Set<string>(),
    generationType: input.generationType,
    attempt: input.attempt ?? 0,
  }
  scheduled.sources.add(input.source)
  scheduled.userId = input.userId ?? scheduled.userId
  scheduled.swipeId = input.swipeId ?? scheduled.swipeId
  scheduled.generationType = input.generationType || scheduled.generationType
  if (input.sourceContent && !scheduled.sourceContent) scheduled.sourceContent = input.sourceContent
  scheduled.attempt = Math.max(scheduled.attempt, input.attempt ?? 0)
  scheduled.timer = setTimeout(() => {
    scheduledProseOpportunityScans.delete(key)
    void flushProseOpportunityScan(scheduled).catch(error => {
      spindle.log.error(`[Reverie Relay:prose_opportunity_scan] ${error instanceof Error ? error.message : String(error)}`)
    })
  }, input.delayMs ?? 120)
  scheduledProseOpportunityScans.set(key, scheduled)
}

async function flushProseOpportunityScan(scheduled: Omit<NonNullable<ReturnType<typeof scheduledProseOpportunityScans.get>>, 'timer'> & { timer?: ReturnType<typeof setTimeout> }): Promise<void> {
  const message = await resolveMessage(scheduled.chatId, scheduled.messageId)
  if (!message && scheduled.attempt < 4) {
    scheduleProseOpportunityScan({ ...scheduled, source: 'prose-opportunity-authoritative-retry', attempt: scheduled.attempt + 1, delayMs: 80 * (scheduled.attempt + 1) })
    return
  }
  if (!message || !isAssistantMessage(message) || isOwnMessage(message)) return
  const swipeId = Number.isFinite(Number(scheduled.swipeId)) ? Number(scheduled.swipeId) : activeSwipeId(message)
  const content = scheduled.sourceContent || getSwipeContent(message, swipeId)
  await discoverProseOpportunities({
    chatId: scheduled.chatId,
    messageId: scheduled.messageId,
    swipeId,
    content,
    source: [...scheduled.sources].join('+') || 'lifecycle',
    generationType: scheduled.generationType,
    userId: scheduled.userId,
  })
}

async function flushAssistantScan(scheduled: Omit<NonNullable<ReturnType<typeof scheduledAssistantScans.get>>, 'timer'> & { timer?: ReturnType<typeof setTimeout> }): Promise<void> {
  const config = await getConfig(scheduled.userId)
  if (!config.enabled) return
  const message = await resolveMessage(scheduled.chatId, scheduled.messageId)
  if (!message && scheduled.attempt < 4) {
    scheduleAssistantScan({ ...scheduled, source: 'authoritative-message-retry', attempt: scheduled.attempt + 1, delayMs: 75 * (scheduled.attempt + 1) })
    return
  }
  if (!message || !isAssistantMessage(message) || isOwnMessage(message)) return
  const swipeId = Number.isFinite(Number(scheduled.swipeId)) ? Number(scheduled.swipeId) : activeSwipeId(message)
  const storedContent = getSwipeContent(message, swipeId)
  const sourceContent = containsRelayRequestMarkup(scheduled.sourceContent) ? scheduled.sourceContent : storedContent
  await mutateState(scheduled.chatId, scheduled.userId, state => appendStateLog(state, {
    severity: 'info', stage: 'assistant-message-finalized', eventType: 'assistant_message_finalized', chatId: scheduled.chatId,
    messageId: scheduled.messageId, swipeId, message: 'Assistant message reached deterministic Relay discovery.',
    details: {
      eventSources: [...scheduled.sources],
      authoritativeFingerprint: contentFingerprint(storedContent),
      sourceFingerprint: contentFingerprint(sourceContent || ''),
      authoritativeContainsRequest: containsRelayRequestMarkup(storedContent),
      sourceContainsRequest: Boolean(containsRelayRequestMarkup(sourceContent)),
      retryAttempt: scheduled.attempt,
    },
  }))
  // Auto Generate controls provider dispatch, not discovery.  This keeps
  // authored inline-protocol requests visible as manual Relay slots while
  // making a backend dispatch impossible until the user explicitly asks.
  await scanAndGenerate(scheduled.chatId, scheduled.messageId, swipeId, scheduled.userId, undefined, sourceContent, !config.autoGenerate)
}

function deletedMessageIdentity(payload: any): { chatId: string; messageId: string } {
  const message = payload?.message || payload?.deletedMessage || payload?.item || {}
  return {
    chatId: cleanString(
      payload?.chatId || payload?.chat_id || payload?.chat?.id || payload?.chat?.chatId ||
      message?.chatId || message?.chat_id || message?.chat?.id || payload?.conversationId || payload?.conversation_id,
    ),
    messageId: cleanString(
      payload?.messageId || payload?.message_id || payload?.deletedMessageId || payload?.deleted_message_id ||
      message?.id || message?.messageId || message?.message_id || payload?.id,
    ),
  }
}

function purgeOwnedMessageState(state: StateFile, chatId: string, messageId: string): { slots: number; opportunities: number; plans: number; records: number; batches: number; archivedAssets: number } {
  const now = Date.now()
  let archivedAssets = 0
  for (const asset of Object.values(state.assetLibrary.assets || {})) {
    if (asset.chatId !== chatId || asset.messageId !== messageId) continue
    if (!asset.sourceDeletedAt) archivedAssets += 1
    asset.sourceDeletedAt ||= now
    asset.sourceDeletedReason = 'Source message deleted; image retained in Relay History.'
    asset.updatedAt = now
  }
  if (archivedAssets) state.assetLibrary.updatedAt = now
  const ownedSlots = Object.values(state.slots).filter(record => record.chatId === chatId && record.messageId === messageId)
  removeSlotRecords(state, ownedSlots)
  let opportunities = 0
  let plans = 0
  let records = 0
  let batches = 0
  for (const [id, opportunity] of Object.entries({ ...state.proseIllustrator.opportunities })) {
    if (opportunity.chatId !== chatId || opportunity.messageId !== messageId) continue
    delete state.proseIllustrator.opportunities[id]
    opportunities += 1
  }
  for (const [id, plan] of Object.entries({ ...state.proseIllustrator.plans })) {
    if (plan.chatId !== chatId || plan.messageId !== messageId) continue
    delete state.proseIllustrator.plans[id]
    plans += 1
  }
  for (const [id, record] of Object.entries({ ...state.proseIllustrator.records })) {
    const slot = state.slots[record.slotKey]
    if (record.anchor?.messageId !== messageId && slot?.messageId !== messageId) continue
    delete state.proseIllustrator.records[id]
    records += 1
  }
  for (const [id, batch] of Object.entries({ ...state.candidateBatches })) {
    if (batch.chatId !== chatId || batch.messageId !== messageId) continue
    delete state.candidateBatches[id]
    batches += 1
  }
  for (const key of Object.keys(state.proseIllustrator.processedMessageKeys)) {
    if (key.startsWith(`${chatId}:${messageId}:`)) delete state.proseIllustrator.processedMessageKeys[key]
  }
  const activeOpportunityId = state.proseIllustrator.activeOpportunityIdByChat[chatId]
  if (activeOpportunityId && !state.proseIllustrator.opportunities[activeOpportunityId]) delete state.proseIllustrator.activeOpportunityIdByChat[chatId]
  const activePlanId = state.proseIllustrator.activePlanIdByChat[chatId]
  if (activePlanId && !state.proseIllustrator.plans[activePlanId]) delete state.proseIllustrator.activePlanIdByChat[chatId]
  return { slots: ownedSlots.length, opportunities, plans, records, batches, archivedAssets }
}

async function handleMessageDeleted(payload: any, userId?: string): Promise<void> {
  const { chatId, messageId } = deletedMessageIdentity(payload)
  if (!chatId || !messageId) return
  pendingGenerationContent.delete(pendingContentKey(chatId, messageId))

  for (const [key, scheduled] of [...scheduledAssistantScans.entries()]) {
    if (scheduled.chatId !== chatId || scheduled.messageId !== messageId) continue
    clearTimeout(scheduled.timer)
    scheduledAssistantScans.delete(key)
  }
  for (const [key, scheduled] of [...scheduledProseOpportunityScans.entries()]) {
    if (scheduled.chatId !== chatId || scheduled.messageId !== messageId) continue
    clearTimeout(scheduled.timer)
    scheduledProseOpportunityScans.delete(key)
  }
  for (const [key, deferred] of [...deferredScans.entries()]) {
    if (deferred[0] === chatId && deferred[1] === messageId) deferredScans.delete(key)
  }

  const before = await getState(chatId, userId)
  for (const record of Object.values(before.slots).filter(record => record.messageId === messageId)) {
    cancelledJobs.add(jobCancellationKey(record))
  }
  await mutateState(chatId, userId, state => {
    const removed = purgeOwnedMessageState(state, chatId, messageId)
    appendStateLog(state, {
      severity: 'info', stage: 'message-deleted', eventType: 'message_deleted', chatId, messageId,
      message: `Removed ${removed.slots} Relay slot record${removed.slots === 1 ? '' : 's'}, ${removed.opportunities} scene opportunit${removed.opportunities === 1 ? 'y' : 'ies'}, and associated pending Illustrator state after message deletion.`,
      details: removed,
    })
  })
  await sendState(userId, chatId)
}

async function handleSwipeLifecycle(payload: any, userId?: string): Promise<void> {
  const chatId = cleanString(payload?.chatId)
  const messageId = cleanString(payload?.message?.id)
  if (!chatId || !messageId) return
  const action = cleanString(payload?.action) || 'updated'
  if (action === 'deleted') {
    const summary = await reconcileDeletedSwipe(chatId, messageId, Number(payload?.swipeId), payload?.message as ChatMessage, userId)
    await sendState(userId, chatId)
    return
  }
  if (action === 'added' || action === 'updated') {
    const message = payload?.message as ChatMessage
    const swipeId = Number.isFinite(Number(payload?.swipeId)) ? Number(payload.swipeId) : activeSwipeId(message)
    const content = getSwipeContent(message, swipeId)
    if (isAssistantMessage(message) && !isOwnMessage(message) && containsRelayRequestMarkup(content)) {
      scheduleAssistantScan({ chatId, messageId, swipeId, userId, sourceContent: content, source: `message-swiped-${action}`, delayMs: 40 })
    }
    if (isAssistantMessage(message) && !isOwnMessage(message)) {
      scheduleProseOpportunityScan({ chatId, messageId, swipeId, userId, sourceContent: content, source: `message-swiped-${action}`, delayMs: 140 })
    }
  }
  if (action === 'updated') await reconcileChatState(chatId, userId, messageId, payload?.message)
}

async function reconcileDeletedSwipe(chatId: string, messageId: string, deletedSwipeId: number, message: ChatMessage, userId?: string): Promise<ReconciliationSummary> {
  const before = await getState(chatId, userId)
  for (const record of Object.values(before.slots).filter(record => record.messageId === messageId && record.swipeId === deletedSwipeId && isRecordJobActive(record))) {
    cancelledJobs.add(jobCancellationKey(record))
  }
  return mutateState(chatId, userId, state => {
    const summary: ReconciliationSummary = {
      checked: 0, valid: 0, orphanedFound: 0, orphanedRemoved: 0, deletedMessageRemoved: 0,
      deletedSwipeRemoved: 0, malformed: 0, retainedForManualReview: 0, reconciledAt: Date.now(),
    }
    const swipes = Array.isArray(message.swipes) ? message.swipes : []
    for (const [key, record] of Object.entries({ ...state.slots })) {
      if (record.messageId !== messageId) continue
      summary.checked += 1
      if (!record.requestId || !record.slot || !record.originalRequestXml) summary.malformed += 1
      const survivingSwipe = swipes.findIndex(content => hasRouterMarker(content || '', record))
      if (survivingSwipe >= 0) {
        if (record.swipeId !== survivingSwipe) {
          delete state.slots[key]
          record.swipeId = survivingSwipe
          record.key = slotKey(record)
          state.slots[record.key] = record
        }
        if (record.imageAvailability !== 'missing') { record.orphaned = false; record.orphanReason = undefined }
        summary.valid += 1
        continue
      }
      if (record.swipeId === deletedSwipeId) {
        removeSlotRecords(state, [record])
        summary.deletedSwipeRemoved += 1
        summary.orphanedRemoved += 1
      } else {
        record.orphaned = true
        record.orphanReason = 'Relay marker was not found after swipe deletion reconciliation.'
        record.updatedAt = Date.now()
        summary.orphanedFound += 1
        summary.retainedForManualReview += 1
      }
    }
    let removedOpportunities = 0
    let removedPlans = 0
    const removedOpportunityIds = new Set<string>()
    for (const [id, opportunity] of Object.entries({ ...state.proseIllustrator.opportunities })) {
      if (opportunity.chatId !== chatId || opportunity.messageId !== messageId || opportunity.swipeId !== deletedSwipeId) continue
      delete state.proseIllustrator.opportunities[id]
      removedOpportunityIds.add(id)
      removedOpportunities += 1
    }
    for (const [id, plan] of Object.entries({ ...state.proseIllustrator.plans })) {
      if (plan.chatId !== chatId || plan.messageId !== messageId || plan.swipeId !== deletedSwipeId) continue
      const hasCompletedRecord = Object.values(state.proseIllustrator.records).some(record => record.planId === id && ['completed', 'ready-to-place'].includes(record.status))
      if (hasCompletedRecord) continue
      delete state.proseIllustrator.plans[id]
      removedPlans += 1
    }
    if (removedOpportunities || removedPlans) {
      const activeOpportunityId = state.proseIllustrator.activeOpportunityIdByChat[chatId]
      if (activeOpportunityId && !state.proseIllustrator.opportunities[activeOpportunityId]) delete state.proseIllustrator.activeOpportunityIdByChat[chatId]
      const activePlanId = state.proseIllustrator.activePlanIdByChat[chatId]
      if (activePlanId && !state.proseIllustrator.plans[activePlanId]) delete state.proseIllustrator.activePlanIdByChat[chatId]
      appendStateLog(state, {
        severity: 'info', stage: 'prose-opportunity-cleanup', eventType: 'deleted_swipe_prose_state_removed', chatId,
        messageId, swipeId: deletedSwipeId,
        message: `Removed ${removedOpportunities} scene opportunit${removedOpportunities === 1 ? 'y' : 'ies'} and ${removedPlans} pending plan${removedPlans === 1 ? '' : 's'} owned by the deleted swipe.`,
      })
    }

    state.lastReconciledAt = summary.reconciledAt
    state.lastReconciliation = summary
    appendStateLog(state, {
      severity: summary.orphanedFound || summary.malformed ? 'warning' : 'info', stage: 'swipe-deleted', eventType: 'swipe_deleted',
      chatId, messageId, swipeId: deletedSwipeId,
      message: `Removed ${summary.deletedSwipeRemoved} deleted-swipe record${summary.deletedSwipeRemoved === 1 ? '' : 's'} and retained ${summary.orphanedFound} for review.`, details: summary,
    })
    return summary
  })
}

async function exportNarrativeSurfaceToLorebook(payload: Extract<FrontendMessage, { type: 'export_narrative_lorebook' }>, userId?: string): Promise<{ bookId: string; entryId: string; message: string }> {
  if (!spindle.permissions.has('world_books') || !spindle.permissions.has('chats')) {
    throw new Error('Grant Relay the World Books and Chats permissions before exporting a Narrative Surface.')
  }
  const chat = await spindle.chats.get(payload.chatId, userId)
  if (!chat) throw new Error('Relay could not find the chat that owns this Narrative Surface.')
  const message = await resolveMessage(payload.chatId, payload.messageId)
  if (!message) throw new Error('Relay could not find the message that owns this Narrative Surface.')
  const swipeId = Number.isFinite(Number(payload.swipeId)) ? Math.max(0, Number(payload.swipeId)) : activeSwipeId(message)
  const record = extractNarrativeLorebookRecord(getSwipeContent(message, swipeId), payload.kind, payload.occurrence)
  if (!record) throw new Error('Relay could not safely isolate that exact Narrative Surface for Lorebook export.')

  const result = await exportNarrativeLorebookRecord({
    api: spindle, chat, record, kind: payload.kind, messageId: payload.messageId, swipeId,
    occurrence: payload.occurrence, relayVersion: EXTENSION_VERSION, schemaVersion: STATE_SCHEMA_VERSION, userId,
  })
  const ui = spindle.ui as typeof spindle.ui & {
    getDrawerTabs?: (options?: { userId?: string }) => Promise<Array<{ id: string; shortName?: string; tabName?: string; tabDescription?: string; keywords?: string[] }>>
    openDrawerTab?: (tabId: string, options?: { userId?: string }) => Promise<void>
  }
  try {
    const tabs = await ui.getDrawerTabs?.({ userId }) || []
    const lorebookTab = tabs.find(tab => [tab.id, tab.shortName, tab.tabName, tab.tabDescription, ...(tab.keywords || [])]
      .some(value => /(?:lorebook|lore book|world book)/i.test(cleanString(value))))
    if (lorebookTab && ui.openDrawerTab) {
      await ui.openDrawerTab(lorebookTab.id, { userId })
      return { ...result, message: `${result.message} Opened the Lorebook drawer.` }
    }
  } catch (error) {
    spindle.log.warn(`[Reverie Relay] Lorebook export succeeded, but the Lorebook drawer could not be opened: ${error instanceof Error ? error.message : String(error)}`)
  }
  return { ...result, message: `${result.message} Open the Lorebook drawer to review it.` }
}

async function handleFrontendMessage(payload: FrontendMessage, userId?: string): Promise<void> {
  switch (payload.type) {
    case 'list_state':
      await sendState(userId, payload.chatId ?? undefined)
      return
    case 'scan_message':
      await scanAndGenerate(payload.chatId, payload.messageId ?? undefined, payload.swipeId, userId, snapshotFromPayload(payload), payload.sourceContent)
      return
    case 'sync_native_settings':
      await syncNativeSettings(payload.imageGeneration || {}, userId)
      await sendState(userId, payload.chatId ?? undefined)
      return
    case 'set_config':
      await setConfig(payload.patch, userId)
      await sendState(userId, payload.chatId ?? undefined)
      return
    case 'surface_prompt_preview': {
      try {
        const current = await getConfig(userId)
        const chatId = cleanNullableString(payload.chatId)
        const state = chatId ? await getState(chatId, userId) : null
        const studio = state?.customSurfaces || normalizeCustomSurfaceStudio(current.globalSurfaceStudio || defaultCustomSurfaceStudio())
        const settings = state ? proseSettingsForChat(state, chatId!) : current.proseIllustratorSettings
        const surfaceUtility = buildEnabledSurfaceUtility(studio, 'automatic')
        const narrativeUtility = buildResolvedNarrativeUtilityPrompt(current)
        const surfaceProtocol = registryPrompt(settings, 'story.surface-protocol')
        const prompt = [surfaceProtocol, surfaceUtility.content, narrativeUtility.content].filter(Boolean).join('\n\n')
        spindle.sendToFrontend({
          type: 'surface_prompt_preview',
          requestId: payload.requestId,
          prompt: prompt || 'No Surface or Narrative Utilities are selected.',
          surfaceModuleIds: surfaceUtility.moduleIds,
          narrativeUtilityNames: narrativeUtility.utilityNames,
          surfaceInjectionEnabled: studio.utilityInjectionEnabled !== false,
          narrativeInjectionEnabled: current.narrativeDlcEnabled,
        }, userId)
      } catch (error) {
        spindle.sendToFrontend({
          type: 'surface_prompt_preview',
          requestId: payload.requestId,
          prompt: '',
          surfaceModuleIds: [],
          narrativeUtilityNames: [],
          surfaceInjectionEnabled: false,
          narrativeInjectionEnabled: false,
          error: error instanceof Error ? error.message : String(error),
        }, userId)
      }
      return
    }
    case 'narrative_dlc_action': {
      const current = await getConfig(userId)
      const variant = narrativeVariantForSurfaceShellMode(current.surfaceDefaultShellMode)
      try {
        const health = payload.action === 'remove'
          ? await removeNarrativeRegex(spindle.regex_scripts, variant, userId)
          : payload.action === 'inspect'
            ? await inspectNarrativeRegex(spindle.regex_scripts, variant, userId)
            : await reconcileNarrativeRegex(spindle.regex_scripts, variant, userId)
        await setConfig({
          narrativeDlcEnabled: payload.action === 'remove' ? false : current.narrativeDlcEnabled || payload.action === 'install',
          narrativeDlcVariant: variant,
          narrativeDlcLastSync: health,
        }, userId)
        spindle.sendToFrontend({ type: 'relay_notice', level: health.status === 'healthy' || health.status === 'removed' ? 'success' : 'warning', message: health.message }, userId)
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        const expected = narrativeRegexScripts(variant).length
        const failed: NarrativeDlcHealth = {
          status: 'failed', variant, expected, installed: current.narrativeDlcLastSync?.installed || 0,
          healthy: 0, drifted: expected, blocked: /outside Relay ownership/i.test(message) ? 1 : 0,
          updatedAt: Date.now(), message,
        }
        await setConfig({ narrativeDlcLastSync: failed }, userId)
        throw error
      }
      await sendState(userId, payload.chatId ?? undefined)
      return
    }
    case 'export_narrative_lorebook': {
      try {
        const result = await exportNarrativeSurfaceToLorebook(payload, userId)
        spindle.sendToFrontend({ type: 'narrative_lorebook_export_result', requestId: payload.requestId, ok: true, ...result }, userId)
      } catch (error) {
        spindle.sendToFrontend({
          type: 'narrative_lorebook_export_result', requestId: payload.requestId, ok: false,
          message: error instanceof Error ? error.message : String(error),
        }, userId)
      }
      return
    }
    case 'regenerate_slot':
      await acknowledgeSlotSubmission(payload, userId)
      await regenerateSlot(payload.key, payload.useCurrentNativeSettings ? snapshotFromPayload(payload) : undefined, userId, payload.highResMode)
      return
    case 'regenerate_with_intent':
      await acknowledgeSlotSubmission(payload, userId)
      await regenerateWithIntent(payload.key, payload.intent, payload.candidateCount, snapshotFromPayload(payload), userId)
      return
    case 'reparse_slot':
      await acknowledgeSlotSubmission(payload, userId)
      await reparseSlot(payload.key, payload.useCurrentNativeSettings ? snapshotFromPayload(payload) : undefined, userId)
      return
    case 'reparse_chat_slots':
      await reparseChatSlots(payload.chatId, snapshotFromPayload(payload), userId)
      return
    case 'retry_failed':
      await retryFailed(payload.chatId, userId)
      return
    case 'rescan_chat':
      await rescanChatForSlots(payload.chatId, userId, payload.automatic === true, payload.includeInactiveSwipes)
      return
    case 'generate_recovered':
      await generateRecoveredSlot(payload.key, snapshotFromPayload(payload), userId)
      return
    case 'generate_all_recovered':
      await generateAllRecovered(payload.chatId, snapshotFromPayload(payload), userId)
      return
    case 'rebuild_request':
      await rebuildRequest(payload, userId)
      return
    case 'edit_prompt':
      await editPrompt(payload.key, payload.prompt, payload.negativePrompt, payload.imageIntent, payload.useCurrentNativeSettings ? snapshotFromPayload(payload) : undefined, userId)
      return
    case 'restore_history':
      await restoreHistory(payload.chatId, payload.key, payload.historyIndex, userId)
      return
    case 'retry_placement':
      await acknowledgeSlotSubmission(payload, userId)
      await retryPendingPlacement(payload.key, userId)
      return
    case 'discard_pending_placement':
      await discardPendingPlacement(payload.key, userId)
      return
    case 'reconcile_state':
      await reconcileChatState(payload.chatId, userId, payload.messageId)
      await sendState(userId, payload.chatId)
      return
    case 'cleanup':
      await cleanupState(payload, userId)
      return
    case 'reparse_preview':
      await previewReparse(payload.key, userId)
      return
    case 'generate_preview':
      await editPrompt(payload.key, payload.prompt, payload.negativePrompt, undefined, payload.useCurrentNativeSettings ? snapshotFromPayload(payload) : undefined, userId)
      return
    case 'preview_action':
      await logPreviewAction(payload.key, payload.action, userId)
      return
    case 'relay_batch_start':
      await startRelayBatch(payload.chatId, snapshotFromPayload(payload), userId, payload.candidateCount, payload.intent, payload.selectedKeys)
      return
    case 'relay_replace_selected':
      await replaceRelayCandidates(payload.chatId, payload.batchId, payload.candidateKeys, userId)
      return
    case 'relay_discard_batch':
      await discardRelayBatch(payload.chatId, payload.batchId, userId)
      return
    case 'relay_retry_candidate':
      await retryRelayCandidate(payload.chatId, payload.batchId, payload.candidateKey, snapshotFromPayload(payload), userId)
      return
    case 'relay_discard_candidate':
      await discardRelayCandidate(payload.chatId, payload.batchId, payload.candidateKey, userId)
      return
    case 'queue_action':
      await handleQueueAction(payload, snapshotFromPayload(payload), userId)
      return
    case 'asset_library_action':
      await handleAssetLibraryAction(payload, userId)
      return
    case 'reuse_asset_in_slot':
      await reuseAssetInSlot(payload.chatId, payload.key, payload.assetId, userId)
      return
    case 'discover_lora_catalog':
      await discoverProviderLoraCatalog(payload.requestId, payload.connectionId, userId)
      return
    case 'continuity_action':
      await handleContinuityAction(payload, userId)
      return
    case 'prose_illustrator_action':
      await handleProseIllustratorAction(payload, snapshotFromPayload(payload), userId)
      return
    case 'custom_surface_action':
      await handleCustomSurfaceAction(payload, userId)
      return
    case 'bulk_chat_media_action':
      await handleBulkChatMediaAction(payload, userId)
      return
    case 'native_surface_action':
      await handleNativeSurfaceAction(payload, userId)
      return
    case 'remove_slot_image':
      await handleRemoveSlotImage(payload, userId)
      return
    case 'gallery_link_result':
      await handleGalleryLinkResult(payload, userId)
      return
    case 'dry_run':
      await handleDryRun(payload, snapshotFromPayload(payload), userId)
      return
    case 'full_complete_dry_run':
      await handleFullCompleteDryRun(payload, snapshotFromPayload(payload), userId)
      return
    case 'explain_no_generation':
      await handleExplainNoGeneration(payload, userId)
      return
    case 'self_test':
      await runInstallationSelfTest(payload.chatId ?? undefined, payload.frontendBuildId, payload.frontendLoadedAt, payload.nativeSettingsAvailable, userId)
      return
    case 'show_toast':
      spindle.toast[payload.level](payload.message, { userId })
      return
  }
}


async function handleGalleryLinkResult(payload: Extract<FrontendMessage, { type: 'gallery_link_result' }>, userId?: string): Promise<void> {
  const chatId = cleanString(payload.chatId)
  if (!chatId) return
  await mutateState(chatId, userId, state => {
    const link = state.galleryLinks[payload.linkId]
    if (!link) return
    link.attempts += 1
    link.updatedAt = Date.now()
    if (payload.ok) {
      link.status = 'linked'
      link.galleryItemId = cleanString(payload.galleryItemId) || link.galleryItemId
      link.error = undefined
      finishBackgroundTask(state, `queue:${link.id}`, 'Saved to Character Gallery')
    } else {
      link.status = 'failed'
      link.error = cleanString(payload.error) || 'Character Gallery registration failed.'
      failBackgroundTask(state, `queue:${link.id}`, link.error)
    }
    if (link.slotKey && state.slots[link.slotKey]) {
      const record = state.slots[link.slotKey]
      record.galleryLinkStatus = link.status
      record.galleryItemId = link.galleryItemId
      record.galleryLinkError = link.error
      record.galleryLinkedAt = payload.ok ? Date.now() : undefined
    }
    appendStateLog(state, {
      severity: payload.ok ? 'info' : 'error', stage: 'character-gallery', eventType: payload.ok ? 'gallery_link_completed' : 'gallery_link_failed',
      chatId, requestId: link.id, message: payload.ok ? 'Generated image linked to the current character Gallery.' : `Character Gallery link failed: ${link.error}`,
      details: { imageId: link.imageId, characterId: link.characterId, source: link.source, galleryItemId: link.galleryItemId },
    })
  })
  await sendState(userId, chatId)
}

function numberParameter(parameters: Record<string, unknown>, ...keys: string[]): number | null {
  for (const key of keys) {
    const value = Number(parameters[key])
    if (Number.isFinite(value) && value > 0) return Math.round(value)
  }
  return null
}

function dryRunReportFromPlan(input: {
  kind: DryRunReport['kind']
  chatId: string | null
  title: string
  origin: string
  prompt: string
  negativePrompt: string
  subjects?: string[]
  peoplePolicy?: string
  vaultFacts?: ContinuityFact[]
  plan: ImagePlan
  anchor?: Record<string, unknown> | null
  warnings?: string[]
  galleryDestination?: string
}): DryRunReport {
  const assembled = assembleProviderPrompts(input.plan, input.prompt, input.negativePrompt)
  const finalPrompt = assembled.prompt
  const finalNegative = assembled.negativePrompt
  const parameters = buildImageParameters(input.plan, {
    prompt: finalPrompt,
    negativePrompt: finalNegative,
    promptMode: 'dry-run', promptPresetId: null, parserUsed: false, parserOutput: '', parserConnectionId: null, parserModel: '', parserParameters: {},
    promptPipeline: emptyPromptPipeline({ originalNegativePrompt: finalNegative, resolvedNegativePrompt: finalNegative }),
  })
  assertProviderRequestSafe(finalPrompt, finalNegative, parameters)
  return {
    id: `dry-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    kind: input.kind,
    generatedAt: Date.now(),
    chatId: input.chatId,
    title: input.title,
    origin: input.origin,
    prompt: finalPrompt,
    negativePrompt: finalNegative,
    subjects: input.subjects || [],
    peoplePolicy: input.peoplePolicy || 'auto',
    vaultFacts: (input.vaultFacts || []).map(fact => ({ character: fact.canonicalCharacterName, layer: fact.layer, value: appearanceFactDescriptor(fact) })),
    connectionId: input.plan.connectionId,
    connectionName: input.plan.connectionName,
    provider: input.plan.provider,
    model: input.plan.model,
    loras: (input.plan.effectiveLoras || []).map(row => ({ name: row.lora_name, weightModel: row.weight_model, weightClip: row.weight_clip })),
    aspectRatio: cleanString(parameters.aspectRatio) || cleanString(parameters.aspect_ratio) || 'native',
    width: numberParameter(parameters, 'width', 'imageWidth'),
    height: numberParameter(parameters, 'height', 'imageHeight'),
    anchor: input.anchor || null,
    galleryDestination: input.galleryDestination || 'Current character Gallery',
    warnings: [...(input.warnings || []), ...(input.plan.loraOmittedFields || [])],
    finalParameters: parameters,
    finalRequestPreview: {
      connection_id: input.plan.connectionId,
      prompt: finalPrompt,
      negativePrompt: finalNegative || undefined,
      model: input.plan.model || undefined,
      parameters,
      dryRun: true,
      origin: input.origin,
    },
  }
}

async function handleDryRun(payload: Extract<FrontendMessage, { type: 'dry_run' }>, nativeSnapshot?: NativeSettingsSnapshot, userId?: string): Promise<void> {
  const chatId = cleanNullableString(payload.chatId)
  const config = await getConfig(userId)
  let report: DryRunReport
  if (payload.kind === 'prose-plan') {
    if (!chatId || !payload.planId) throw new Error('A prose plan is required for Dry Run.')
    const state = await getState(chatId, userId)
    const planRecord = state.proseIllustrator.plans[payload.planId]
    if (!planRecord) throw new Error('Illustration plan not found.')
    const job = jobFromProsePlan(planRecord, '')
    const slotRecord = Object.values(state.slots).find(row => row.prosePlanId === planRecord.planId) || {} as SlotRecord
    const plan = await prepareImagePlan(config, job, slotRecord, nativeSnapshot, userId, planRecord.highResolutionModifier)
    const prompt = planRecord.promptComposition?.positivePrompt || planRecord.sceneBrief
    const negative = planRecord.promptComposition?.negativePrompt || ''
    report = dryRunReportFromPlan({ kind: 'prose-plan', chatId, title: planRecord.title || 'Illustration Dry Run', origin: 'relay-illustrator', prompt, negativePrompt: negative, subjects: planRecord.namedSubjects, peoplePolicy: planRecord.peoplePolicy, plan, anchor: planRecord.anchor as unknown as Record<string, unknown>, warnings: planRecord.warnings, galleryDestination: 'Current character Gallery' })
  } else {
    if (!chatId || !payload.key) throw new Error('A Relay slot is required for Dry Run.')
    const state = await getState(chatId, userId)
    const record = state.slots[payload.key]
    if (!record) throw new Error('Relay slot not found.')
    const job = jobFromRecord(record)
    const plan = await prepareImagePlan(config, job, record, nativeSnapshot, userId, record.highResMode ?? config.highResMode)
    const prompt = record.resolvedPositivePrompt || record.originalSceneBrief
    const negative = record.resolvedNegativePrompt || record.originalNegativePrompt
    report = dryRunReportFromPlan({ kind: 'slot', chatId, title: record.alt || record.requestId, origin: record.target === 'prose.illustration' ? 'relay-illustrator' : 'relay-slot', prompt, negativePrompt: negative, subjects: record.promptPipeline?.visualSubjectPrompts?.map(row => row.name) || [], peoplePolicy: record.promptPipeline?.requestClassification || 'auto', vaultFacts: record.includedContinuityFacts, plan, anchor: record.proseAnchor as unknown as Record<string, unknown> | undefined, warnings: record.promptPipeline?.warnings?.map(row => row.message) || [], galleryDestination: 'Current character Gallery' })
  }
  const stateId = chatId || UTILITY_STATE_ID
  await mutateState(stateId, userId, state => { state.lastDryRun = report })
  spindle.sendToFrontend({ type: 'dry_run_result', report }, userId)
  await sendState(userId, chatId || undefined)
}

export type FullCompleteDryRunReport = {
  id: string
  generatedAt: number
  chatId: string | null
  generated: false
  modelCalls: 0
  imageGenerationCalls: 0
  sections: Record<string, unknown>
}

/** Pure assembly used by Diagnostics and by the regression soak. It intentionally
 * accepts already-resolved local state and has no Spindle/provider dependencies. */
export function buildFullCompleteDryRunReport(input: {
  chatId?: string | null
  illustratorPrompt: string
  runtimeDirective: string
  adultFidelity: string
  surfaceProtocol: string
  surfaceUtility: { content: string; moduleIds: string[] }
  settings: ProseIllustratorSettings
  nativeSettings?: NativeImageSettings
  runtimeHealth?: Record<string, unknown>
  slots?: SlotRecord[]
  appearance?: ContinuityVaultState
  surfaceStudio?: CustomSurfaceStudioState
  queueConcurrencyLimit?: number
}): FullCompleteDryRunReport {
  const native = input.nativeSettings || {}
  const loraPlan = resolveNativeLoraPlan(native)
  const slots = input.slots || []
  const ownership = slots.map(slot => ({
    key: slot.key,
    chatId: slot.chatId,
    messageId: slot.messageId,
    swipeId: slot.swipeId,
    requestId: slot.requestId,
    slot: slot.slot,
    status: slot.status,
    cast: slot.cast || 'unspecified',
    aspect: slot.requestAspect || slot.aspectRatio || 'adaptive',
    // A recognized request never leaks raw XML, including terminal failures and repair states.
    rawMarkupSuppressed: true,
    placement: slot.status === 'placement-repair-needed' ? 'repair-needed' : slot.status === 'placement-pending' ? 'pending' : slot.status === 'completed' ? 'verified' : 'not-ready',
    placementFailure: slot.placementFailure ? { reason: slot.placementFailure.reason, retryCount: slot.placementFailure.retryCount } : null,
    queueLifecycle: (slot.attempts || []).map(attempt => attempt.stage),
  }))
  const ownershipKeys = ownership.map(row => `${row.chatId}:${row.messageId}:${row.swipeId}:${row.requestId}:${row.slot}`)
  const duplicates = ownershipKeys.filter((key, index) => ownershipKeys.indexOf(key) !== index)
  const promptPrefix = firstString(native.customPrompt, (native.parameters as Record<string, unknown> | undefined)?.positivePromptPrefix)
  const negativePrefix = firstString(native.customNegativePrompt, native.negativePrompt, (native.parameters as Record<string, unknown> | undefined)?.negativePromptPrefix)
  return {
    id: `full-dry-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    generatedAt: Date.now(),
    chatId: cleanNullableString(input.chatId),
    generated: false,
    modelCalls: 0,
    imageGenerationCalls: 0,
    sections: {
      illustrator: {
        resolvedPrompt: input.illustratorPrompt,
        runtimeDirective: input.runtimeDirective,
        storyModelState: input.settings.enabled && !input.settings.paused ? input.settings.mode : 'off',
        modelPlacedCount: input.settings.modelPlacedCountMode === 'range'
          ? { mode: 'range', minimum: input.settings.minimumImages, maximum: input.settings.maximumImages }
          : { mode: 'fixed', count: input.settings.illustrationsPerRun },
      },
      runtimeDirectives: { adultFidelity: input.adultFidelity, framing: input.settings.perspectiveMode, aspect: input.settings.defaultAspectRatio, rawMarkupSuppression: 'Relay replaces recognized requests with lifecycle cards before display.' },
      surfaces: {
        resolvedEditableProtocol: input.surfaceProtocol,
        enabledUtilityModuleIds: input.surfaceUtility.moduleIds,
        enabledUtilities: input.surfaceUtility.content,
        rendererOwner: input.surfaceStudio?.rendererMode || 'relay',
        reviewedRegexScripts: input.surfaceStudio?.rendererMode === 'hybrid' ? [...REVIEWED_REGEX_SURFACE_IDS] : [],
        contractTrace: r45SurfaceAuthorityScripts('plain', 'realistic').map(script => ({
          scriptId: script.script_id,
          expectedPackVersion: r45SurfaceAuthorityPack('plain', 'realistic').version,
          installed: 'bundled-runtime-authority',
          enabled: script.disabled !== true,
          target: ['display'],
          sortOrder: script.sort_order,
          owner: 'r45-authority',
          conflicts: [],
        })),
      },
      provider: { connectionId: native.activeImageGenConnectionId || null, model: native.model || null, parameters: cloneRecord(native.parameters) },
      promptPrefixes: { positive: promptPrefix, negative: negativePrefix },
      loraAssembly: { activePresetId: native.activeLoraPresetId || null, effectiveLoras: loraPlan.effectiveLoras, baseTags: loraPlan.baseTags, bypassed: native.bypassActiveLoraPreset === true },
      appearanceMemory: {
        strength: input.appearance?.strength || 'off',
        characters: Object.keys(input.appearance?.characters || {}).length,
        characterSheets: Object.keys(input.appearance?.characterSheets || {}).length,
        currentAppearance: Object.keys(input.appearance?.currentAppearance || {}).length,
      },
      parserComposerOwnership: {
        parserConnectionId: input.settings.plannerConnectionId || null,
        parserModel: input.settings.plannerModel || null,
        promptRegistryIds: Object.keys(input.settings.promptRegistry || {}).sort(),
        modelCalls: 0,
      },
      exactSlotOwnership: { records: ownership, duplicates: [...new Set(duplicates)], collisionFree: duplicates.length === 0 },
      queueLifecycle: { configuredConcurrency: input.queueConcurrencyLimit || 1, bounded: true, terminalStages: ['completed', 'failed', 'cancelled', 'placement-repair-needed'] },
      runtimeHealth: cloneRecord(input.runtimeHealth),
    },
  }
}

async function handleFullCompleteDryRun(payload: Extract<FrontendMessage, { type: 'full_complete_dry_run' }>, nativeSnapshot?: NativeSettingsSnapshot, userId?: string): Promise<void> {
  const chatId = cleanNullableString(payload.chatId)
  const state = chatId ? await getState(chatId, userId) : await getState(UTILITY_STATE_ID, userId)
  const config = await getConfig(userId)
  const settings = proseSettingsForChat(state, chatId || UTILITY_STATE_ID)
  const messages = chatId ? await spindle.chat.getMessages(chatId).catch(() => []) as LlmMessage[] : []
  const personaPovContext = settings.perspectiveMode === 'persona-pov' && chatId ? await resolvePersonaPovContext(chatId, userId) : undefined
  const surfaceUtility = buildEnabledSurfaceUtility(state.customSurfaces, 'automatic')
  const report = buildFullCompleteDryRunReport({
    chatId,
    illustratorPrompt: resolveIllustratorStoryPrompt(settings, messages, personaPovContext),
    runtimeDirective: buildIllustratorRuntimeDirective(settings, messages, personaPovContext),
    adultFidelity: registryPrompt(settings, 'story.adult-content-fidelity'),
    surfaceProtocol: registryPrompt(settings, 'story.surface-protocol'),
    surfaceUtility,
    settings,
    nativeSettings: nativeSnapshot?.settings || nativeSnapshotFromConfig(config)?.settings || {},
    runtimeHealth: payload.runtimeHealth,
    slots: Object.values(state.slots),
    appearance: state.continuityVault,
    surfaceStudio: state.customSurfaces,
    queueConcurrencyLimit: config.queueConcurrencyLimit,
  })
  spindle.sendToFrontend({ type: 'full_complete_dry_run_result', report }, userId)
}

async function handleExplainNoGeneration(payload: Extract<FrontendMessage, { type: 'explain_no_generation' }>, userId?: string): Promise<void> {
  const chatId = cleanNullableString(payload.chatId)
  const config = await getConfig(userId)
  const blockers: GenerationBlocker[] = []
  if (!config.enabled) blockers.push({ code: 'relay-disabled', title: 'Relay is disabled', detail: 'Enable Reverie Relay before scanning or generating.', severity: 'error', action: 'Enable Relay' })
  if (!config.imageConnectionId && !Object.keys(config.nativeImageSettingsSnapshot || {}).length) blockers.push({ code: 'missing-image-connection', title: 'No image connection', detail: 'Choose an ImageGen connection or sync native ImageGen settings.', severity: 'error', action: 'Choose connection' })
  if (chatId && payload.scope === 'slot' && payload.key) {
    const state = await getState(chatId, userId)
    const record = state.slots[payload.key]
    if (!record) blockers.push({ code: 'missing-slot', title: 'Slot no longer exists', detail: 'The message, swipe, or Relay slot was deleted.', severity: 'error' })
    else {
      if (record.orphaned) blockers.push({ code: 'orphaned-slot', title: 'Slot is orphaned', detail: record.orphanReason || 'The original message or swipe no longer exists.', severity: 'error' })
      if (record.status === 'failed') blockers.push({ code: 'slot-failed', title: 'Last attempt failed', detail: record.error || 'Open Logs for the provider/parser failure.', severity: 'error', action: 'Retry or reparse' })
      if (!isMeaningfulAutomaticPrompt(record.resolvedPositivePrompt || record.originalSceneBrief, record.baseTagsAddedToPrompt || '')) blockers.push({ code: 'style-only-prompt', title: 'Only style/default tags were resolved', detail: 'Relay blocked this request to prevent a random ghost portrait.', severity: 'error', action: 'Reparse the scene' })
      if (record.status === 'placement-pending') blockers.push({ code: 'placement-pending', title: 'Image is waiting for placement', detail: 'Generation finished and is awaiting the configured preview/placement confirmation.', severity: 'warning', action: 'Review placement' })
      if (record.status === 'placement-repair-needed') blockers.push({ code: 'placement-repair-needed', title: 'Surface placement needs repair', detail: record.placementFailure?.reason || 'Generation finished, but the exact Surface location could not be verified.', severity: 'warning', action: 'Repair / Reinsert' })
    }
  }
  if (chatId && payload.scope === 'illustrator') {
    const state = await getState(chatId, userId)
    const settings = proseSettingsForChat(state, chatId)
    if (!settings.enabled || settings.mode === 'off') blockers.push({ code: 'illustrator-off', title: 'Illustrator is off', detail: 'Choose Suggest, Manual, or Auto mode.', severity: 'warning', action: 'Change mode' })
    if (settings.paused) blockers.push({ code: 'illustrator-paused', title: 'Auto Illustrator is paused', detail: 'Resume Auto Illustrator for this chat.', severity: 'warning', action: 'Resume' })
    if (settings.frequencyMode === 'every-n') blockers.push({ code: 'frequency-gate', title: `Every ${settings.everyNEligibleMessages} eligible messages`, detail: 'Messages that are too short, utility-only, stale, or otherwise ineligible do not advance the counter.', severity: 'info' })
    const opportunities = Object.values(state.proseIllustrator.opportunities).filter(row => row.chatId === chatId && row.status !== 'dismissed')
    if (!opportunities.length) blockers.push({ code: 'no-eligible-beat', title: 'No eligible illustration beat', detail: 'Relay did not find an eligible visual moment in the available prose.', severity: 'info', action: 'Check Illustrator settings and planner connection' })
  }
  if (!blockers.length) blockers.push({ code: 'ready', title: 'No blocker found', detail: 'The current configuration is eligible to generate. Check the Background Queue for a waiting or active provider job.', severity: 'info' })
  const stateId = chatId || UTILITY_STATE_ID
  await mutateState(stateId, userId, state => { state.lastGenerationBlockers = blockers })
  spindle.sendToFrontend({ type: 'generation_blockers', scope: payload.scope, blockers }, userId)
  await sendState(userId, chatId || undefined)
}

function snapshotFromPayload(payload: {
  nativeImageSettings?: NativeImageSettings
  nativeSettingsCapturedAt?: number
}): NativeSettingsSnapshot | undefined {
  const settings = cleanParameters(payload.nativeImageSettings) as NativeImageSettings
  if (Object.keys(settings).length === 0) return undefined
  const capturedAt = Number.isFinite(Number(payload.nativeSettingsCapturedAt)) ? Number(payload.nativeSettingsCapturedAt) : Date.now()
  return { settings, capturedAt }
}

function containsRelayRequestMarkup(value: unknown): boolean {
  return typeof value === 'string' && /<(?:image_request|reverie-illustration)\b/i.test(value)
}

function pendingContentKey(chatId: string, messageId: string): string {
  return `${chatId}:${messageId}`
}

function inspectRawImageRequestTags(content: string): Array<{ id: string; target: string }> {
  const out: Array<{ id: string; target: string }> = []
  const re = /<(image_request|reverie-illustration)\b([^>]*)>[\s\S]*?<\/\1>/gi
  let match: RegExpExecArray | null
  while ((match = re.exec(content)) !== null) {
    const attrs: Record<string, string> = {}
    const attrRe = /([A-Za-z_:][\w:.-]*)\s*=\s*"([^"]*)"/g
    let attrMatch: RegExpExecArray | null
    while ((attrMatch = attrRe.exec(match[2])) !== null) attrs[attrMatch[1]] = attrMatch[2]
    const illustration = match[1].toLocaleLowerCase() === 'reverie-illustration'
    out.push({ id: attrs.id || attrs.request_id || attrs.slot || '', target: illustration ? 'prose.illustration' : attrs.target || '' })
  }
  return out
}


function requestNativeSettingsSnapshot(chatId: string, messageId: string | undefined, swipeId: number | undefined, userId?: string, sourceContent?: string): void {
  spindle.sendToFrontend({
    type: 'native_snapshot_requested',
    chatId,
    messageId: messageId ?? null,
    swipeId: swipeId ?? null,
    sourceContent,
  }, userId)
}

export async function runWithConcurrency<T>(items: T[], limit: number, worker: (item: T, index: number) => Promise<void>): Promise<void> {
  let cursor = 0
  const count = Math.max(1, Math.min(Math.max(1, limit), items.length || 1))
  await Promise.all(Array.from({ length: count }, async () => {
    while (cursor < items.length) {
      const index = cursor++
      await worker(items[index], index)
    }
  }))
}

async function readActivePersonaIdentity(userId?: string, chatId?: string): Promise<{ id: string; name: string; aliases: string[] } | null> {
  try {
    const persona = await readCurrentHostPersona(userId, chatId)
    const name = cleanString(persona?.name)
    if (!name || !isValidCanonicalCharacterName(name)) return null
    return {
      id: cleanString(persona?.id || persona?.persona_id || persona?.personaId),
      name,
      aliases: [...new Set([...(Array.isArray(persona?.aliases) ? persona.aliases : []), persona?.nickname].map(cleanString).filter(Boolean))],
    }
  } catch {
    return null
  }
}

export function registerDirectHostAppearanceSources(
  vault: ContinuityVaultState,
  input: {
    character: { id: string; name: string; aliases?: string[]; avatarUrl?: string } | null
    persona: { id: string; name: string; aliases?: string[] } | null
    characterContext?: string
    personaContext?: string
    chatId?: string
  },
  now = Date.now(),
): { characterId?: string; personaId?: string; factsAdded: number } {
  let factsAdded = 0
  const register = (
    subject: { id: string; name: string; aliases?: string[]; avatarUrl?: string } | null,
    sourceType: 'character-card' | 'persona-card',
    context: string,
  ): string | undefined => {
    if (!subject) return undefined
    try {
      const canonical = registerCanonicalCharacter(vault, {
        name: subject.name,
        canonicalCharacterId: subject.id,
        lumiverseCharacterId: sourceType === 'character-card' ? subject.id : undefined,
        lumiversePersonaId: sourceType === 'persona-card' ? subject.id : undefined,
        aliases: subject.aliases || [],
        avatarUrl: subject.avatarUrl,
        sourceType,
        userConfirmed: false,
      }, now)
      for (const trait of extractAppearanceTraitPhrases(context)) {
        const classification = classifyAppearanceValue(trait.value)
        if (!classification.layer || !classification.category) continue
        try {
          addAppearanceFact(vault, {
            layer: classification.layer,
            characterId: canonical.canonicalCharacterId,
            category: classification.category,
            value: trait.value,
            sourceType,
            sourceReference: {
              sourceType,
              sourceReference: sourceType,
              chatId: input.chatId || vault.chatId || undefined,
            },
            confidence: 0.9,
            userConfirmed: false,
            chatId: input.chatId || vault.chatId,
          }, now)
          factsAdded += 1
        } catch {
          // Direct card registration is conservative: unclassifiable text is
          // omitted instead of being promoted as appearance memory.
        }
      }
      return canonical.canonicalCharacterId
    } catch {
      return undefined
    }
  }
  return {
    characterId: register(input.character, 'character-card', input.characterContext || ''),
    personaId: register(input.persona, 'persona-card', input.personaContext || ''),
    factsAdded,
  }
}

function appearanceReadinessKey(input: AppearanceReadyInput): string {
  return `${input.chatId}:${input.messageId}:${input.swipeId}:${contentFingerprint(input.content)}`
}

async function ensureAppearanceReadyForTurn(input: AppearanceReadyInput): Promise<void> {
  const mode = input.mode || 'normal'
  const key = appearanceReadinessKey(input)
  if (mode === 'normal') {
    const existing = appearanceReadinessByTurn.get(key)
    if (existing) return existing
  }
  const ready = (async () => {
    try {
      await runAppearanceSidecar({ ...input, mode })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      if (mode === 'normal') appearanceFailureCooldownByTurn.set(`${input.chatId}:${input.messageId}:${input.swipeId}`, Date.now())
      await mutateState(input.chatId, input.userId, state => {
        state.continuityVault.appearanceSidecar.lastError = message
        if (mode === 'normal') {
          state.continuityVault.appearanceSidecar.processedTurnKeys[`${input.messageId}:${input.swipeId}:${contentFingerprint(input.content)}`] = Date.now()
          state.continuityVault.appearanceSidecar.processedTurnKeys = Object.fromEntries(Object.entries(state.continuityVault.appearanceSidecar.processedTurnKeys).sort(([, left], [, right]) => right - left).slice(0, 128))
        }
        appendStateLog(state, {
          severity: 'warning', stage: 'appearance-sidecar', eventType: 'appearance_sidecar_failed',
          chatId: input.chatId, messageId: input.messageId, swipeId: input.swipeId,
          message: `Appearance Sidecar ${mode} fallback: ${message}`,
          details: { mode, reason: input.reason || 'lifecycle', readinessKey: key },
        })
      })
      // A failed Sidecar pass is explicitly settled: planning may use retained
      // memory rather than waiting forever for a model call that already failed.
    }
  })()
  if (mode !== 'normal') return ready
  appearanceReadinessByTurn.set(key, ready)
  try {
    await ready
  } finally {
    // Lifecycle hooks often arrive in adjacent ticks (message sent, rendered,
    // generation ended). Retain the settled result briefly so a failed pass
    // cannot be immediately re-issued as a duplicate provider call. Explicit
    // rescan/reconcile uses a distinct mode and remains available at once.
    setTimeout(() => {
      if (appearanceReadinessByTurn.get(key) === ready) appearanceReadinessByTurn.delete(key)
    }, 1_000)
  }
}

export async function runAppearanceSidecar(input: AppearanceReadyInput): Promise<void> {
  const mode = input.mode || 'normal'
  const contextTier = mode === 'normal' ? 'routine' : mode === 'reconcile' ? 'diagnostic' : 'expanded'
  if (mode !== 'normal') invalidateContextSnapshots()
  const config = await getConfig(input.userId)
  if (!config.enabled || (!cleanString(input.content) && mode !== 'enrichment')) return
  const state = await getState(input.chatId, input.userId)
  const settings = proseSettingsForChat(state, input.chatId)
  if (!settings.appearanceMemoryEnabled || settings.continuityStrength === 'off') return
  const cooldownKey = `${input.chatId}:${input.messageId}:${input.swipeId}`
  if (mode === 'normal') {
    const failedAt = appearanceFailureCooldownByTurn.get(cooldownKey) || 0
    if (failedAt && Date.now() - failedAt < 5_000) return
  }
  const turnKey = `${input.messageId}:${input.swipeId}:${contentFingerprint(input.content)}${mode === 'enrichment' ? `:enrichment:${input.focusCharacter?.id || ''}` : ''}`
  if (mode === 'normal' && state.continuityVault.appearanceSidecar.processedTurnKeys[turnKey]) return
  const [character, persona, characterContext, personaContext] = await Promise.all([
    readChatCharacterIdentity(input.chatId, input.userId),
    readActivePersonaIdentity(input.userId, input.chatId),
    readCharacterContext(input.chatId, input.userId, input.content, contextTier),
    readActivePersonaContext(input.userId, input.content, contextTier, input.chatId),
  ])
  // Host-owned Character and Persona records are deterministic sources. They
  // are registered before any Sidecar connection check so an offline Sidecar
  // cannot make the active Persona disappear from Appearance Memory.
  await mutateState(input.chatId, input.userId, next => {
    const registered = registerDirectHostAppearanceSources(next.continuityVault, {
      character,
      persona,
      characterContext,
      personaContext,
      chatId: input.chatId,
    })
    if (registered.characterId || registered.personaId || registered.factsAdded) {
      appendStateLog(next, {
        severity: 'info', stage: 'appearance-direct-sources', eventType: 'appearance_direct_sources_registered',
        chatId: input.chatId, messageId: input.messageId, swipeId: input.swipeId,
        message: 'Registered active Character and Persona appearance sources from the host.',
        details: { ...registered, sidecarDispatched: false },
      })
    }
  })
  // Appearance Sidecar routing is a provider/model/parameter decision.  It is
  // intentionally independent from continuity strength, which only controls
  // how much accepted Appearance Memory reaches a prompt.
  const { sidecarConnectionId, sidecarModel, sidecarParameters } = resolveAppearanceSidecarRouting(config, settings)
  if (!sidecarConnectionId) {
    await mutateState(input.chatId, input.userId, next => {
      next.continuityVault.appearanceSidecar.lastError = 'Appearance Sidecar is waiting for a configured Sidecar or Relay parser connection.'
      appendStateLog(next, { severity: 'warning', stage: 'appearance-sidecar', eventType: 'appearance_sidecar_unavailable', chatId: input.chatId, messageId: input.messageId, swipeId: input.swipeId, message: 'Appearance Sidecar is waiting for a configured Sidecar or Relay parser connection.' })
    })
    return
  }
  const connection = await spindle.connections.get(sidecarConnectionId, input.userId)
  if (!connection) throw new Error('Appearance Sidecar connection not found.')
  const appearanceState = await getState(input.chatId, input.userId)
  const [history, lorebookContext] = await Promise.all([
    spindle.chat.getMessages(input.chatId) as Promise<ChatMessage[]>,
    readLorebookSources(input.chatId, input.userId),
  ])
  const nativeSettings = input.nativeSnapshot?.settings || nativeSnapshotFromConfig(config)?.settings || {}
  const bindings = [
    resolveC5ANativeIdentityBinding(nativeSettings, 'character', character ? { id: character.id, name: character.name } : null),
    resolveC5ANativeIdentityBinding(nativeSettings, 'persona', persona ? { id: persona.id, name: persona.name } : null),
  ]
  const payload = buildAppearanceSidecarPayload({
    currentAssistantMessage: input.content,
    fullHistory: history.map(message => ({ id: message.id, role: message.role, swipeId: activeSwipeId(message), content: getSwipeContent(message, activeSwipeId(message)) })),
    activeCharacter: character ? { ...character, card: characterContext } : null,
    activePersona: persona ? { ...persona, card: personaContext } : null,
    lorebook: lorebookContext,
    nativeImageGenBindings: bindings.map(binding => ({ kind: binding.kind, subjectId: binding.subjectId, subjectName: binding.subjectName, presetId: binding.presetId, presetName: binding.presetName, generationAnchorAvailable: Boolean(binding.prompt), source: binding.source })),
    appearanceMemory: appearanceState.continuityVault,
    focusCharacter: input.focusCharacter || null,
    tier: contextTier,
    expansionReason: mode === 'normal' ? '' : input.reason || 'Explicit Appearance reconcile',
  })
  const raw = await generateParserText({ id: connection.id, name: connection.name, provider: connection.provider, model: connection.model }, {
    ...config,
    parserModel: sidecarModel || connection.model,
    parserParameters: sidecarParameters,
  }, [
    { role: 'system', content: registryPrompt(settings, 'sidecar.appearance.system') },
    { role: 'user', content: registryPrompt(settings, 'sidecar.appearance.request').replace(/\{\{\s*runtime_payload\s*\}\}/gi, JSON.stringify(payload)) },
  ], input.userId, input.chatId, payload.contextMetrics as ContextMetrics, 'appearance-sidecar')
  const observations = normalizeAppearanceSidecarOutput(raw)
  await mutateState(input.chatId, input.userId, next => {
    const vault = next.continuityVault
    if (mode === 'normal' && vault.appearanceSidecar.processedTurnKeys[turnKey]) return
    const ingestion = ingestAppearanceSidecarObservations(vault, observations, {
      chatId: input.chatId, messageId: input.messageId, swipeId: input.swipeId,
      activeCharacter: character,
      activePersona: persona,
    })
    const changed = ingestion.changed
    vault.appearanceSidecar.processedTurnKeys[turnKey] = Date.now()
    vault.appearanceSidecar.processedTurnKeys = Object.fromEntries(Object.entries(vault.appearanceSidecar.processedTurnKeys).sort(([, left], [, right]) => right - left).slice(0, 128))
    vault.appearanceSidecar.lastRunAt = Date.now()
    vault.appearanceSidecar.lastMessageId = input.messageId
    vault.appearanceSidecar.lastSwipeId = input.swipeId
    vault.appearanceSidecar.lastConnectionId = connection.id
    vault.appearanceSidecar.lastModel = sidecarModel || connection.model
    vault.appearanceSidecar.lastError = undefined
    appearanceFailureCooldownByTurn.delete(cooldownKey)
    if (changed) vault.appearanceSidecar.revision += 1
    appendStateLog(next, { severity: 'info', stage: 'appearance-sidecar', eventType: mode === 'normal' ? 'appearance_sidecar_completed' : 'appearance_sidecar_reconciled', chatId: input.chatId, messageId: input.messageId, swipeId: input.swipeId, message: changed ? 'Appearance Sidecar updated subject continuity.' : 'Appearance Sidecar found no continuity changes.', details: { mode, reason: input.reason || mode, focusCharacter: input.focusCharacter || null, observationCount: observations.length, acceptedFacts: ingestion.acceptedFacts, revision: vault.appearanceSidecar.revision, bindings } })
  })
}

export function resolveAppearanceSidecarRouting(
  config: Pick<RouterConfig, 'parserConnectionId' | 'parserModel' | 'parserParameters' | 'appearanceSidecarConnectionId' | 'appearanceSidecarModel' | 'appearanceSidecarParameters'>,
  settings: Pick<ProseIllustratorSettings, 'useGlobalAppearanceSidecar' | 'appearanceSidecarConnectionId' | 'appearanceSidecarModel' | 'appearanceSidecarParameters'>,
): { sidecarConnectionId: string | null; sidecarModel: string; sidecarParameters: Record<string, unknown> } {
  const useGlobalSidecar = settings.useGlobalAppearanceSidecar !== false
  const globalConnectionId = config.appearanceSidecarConnectionId || config.parserConnectionId
  // When an explicit Sidecar connection is selected, blank means that
  // connection's own default model. With no explicit connection, blank keeps
  // inheriting the Relay Parser model override.
  const globalModel = config.appearanceSidecarModel
    || (config.appearanceSidecarConnectionId ? '' : config.parserModel)
  const globalParameters = Object.keys(config.appearanceSidecarParameters || {}).length ? config.appearanceSidecarParameters : config.parserParameters
  const sidecarConnectionId = useGlobalSidecar ? globalConnectionId : (settings.appearanceSidecarConnectionId || globalConnectionId)
  const sidecarModel = useGlobalSidecar
    ? globalModel
    : settings.appearanceSidecarModel || (settings.appearanceSidecarConnectionId ? '' : globalModel)
  const sidecarParameters = useGlobalSidecar
    ? globalParameters
    : (Object.keys(settings.appearanceSidecarParameters || {}).length ? settings.appearanceSidecarParameters : globalParameters)
  return { sidecarConnectionId, sidecarModel, sidecarParameters }
}

async function enrichManualCharacterAppearance(chatId: string, focusCharacter: { id: string; name: string }, userId?: string): Promise<void> {
  try {
    const messages = (await spindle.chat.getMessages(chatId) as ChatMessage[]).filter(message => isAssistantMessage(message) && !isOwnMessage(message))
    const anchor = messages.at(-1)
    const swipeId = anchor ? activeSwipeId(anchor) : 0
    await ensureAppearanceReadyForTurn({
      chatId,
      messageId: anchor?.id || `manual-character:${focusCharacter.id}`,
      swipeId,
      content: anchor ? getSwipeContent(anchor, swipeId) : '',
      userId,
      mode: 'enrichment',
      reason: 'manual-character-enrichment',
      focusCharacter,
    })
    await sendState(userId, chatId)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    await mutateState(chatId, userId, state => {
      state.continuityVault.appearanceSidecar.lastError = message
      appendStateLog(state, {
        severity: 'warning', stage: 'appearance-sidecar', eventType: 'appearance_sidecar_enrichment_failed', chatId,
        message: `Appearance Sidecar enrichment fallback: ${message}`,
        details: { focusCharacter, reason: 'manual-character-enrichment' },
      })
    })
    await sendState(userId, chatId)
  }
}

async function scanAndGenerate(
  chatId: string,
  messageId: string | undefined,
  forcedSwipeId: number | undefined,
  userId?: string,
  nativeSnapshot?: NativeSettingsSnapshot,
  sourceContent?: string,
  registerOnly = false,
): Promise<void> {
  if (!hasRequiredPermissions()) {
    spindle.sendToFrontend({ type: 'error', source: 'scan_message', message: 'Reverie Relay needs generation, image_gen, and chat_mutation permissions.' }, userId)
    return
  }

  const lockKey = `${chatId}:${messageId ?? '__latest__'}:${forcedSwipeId ?? '__active__'}`
  if (messageLocks.has(lockKey)) {
    deferredScans.set(lockKey, [chatId, messageId, forcedSwipeId, userId, nativeSnapshot, sourceContent])
    return
  }
  messageLocks.add(lockKey)

  try {
    const config = await getConfig(userId)
    if (!config.enabled) return

    const message = await resolveMessage(chatId, messageId)
    if (!message || !isAssistantMessage(message) || isOwnMessage(message)) {
      await sendState(userId, chatId)
      return
    }

    const swipeId = Number.isFinite(Number(forcedSwipeId)) ? Number(forcedSwipeId) : Number(message.swipe_id ?? 0)
    const rawStoredContent = getSwipeContent(message, swipeId)
    const storedContent = normalizeRelaySurfaceContracts(rawStoredContent)
    if (storedContent !== rawStoredContent) await patchSwipeContent(chatId, message, swipeId, storedContent)
    const pending = messageId ? pendingGenerationContent.get(pendingContentKey(chatId, message.id)) : undefined
    const capturedContent = normalizeRelaySurfaceContracts(sourceContent || pending?.content || '')
    const content = containsRelayRequestMarkup(capturedContent) ? capturedContent : storedContent
    const storedContainsImageRequest = containsRelayRequestMarkup(storedContent)
    const capturedContainsImageRequest = containsRelayRequestMarkup(capturedContent)
    try {
      // The same assistant turn must update continuity before Relay snapshots its image jobs.
      await ensureAppearanceReadyForTurn({ chatId, messageId: message.id, swipeId, content, userId, nativeSnapshot, reason: 'scan-and-generate' })
    } catch (error) {
      await mutateState(chatId, userId, state => {
        state.continuityVault.appearanceSidecar.lastError = error instanceof Error ? error.message : String(error)
        appendStateLog(state, { severity: 'warning', stage: 'appearance-sidecar', eventType: 'appearance_sidecar_failed', chatId, messageId: message.id, swipeId, message: `Appearance Sidecar fallback: ${state.continuityVault.appearanceSidecar.lastError}` })
      })
    }
    if (!containsRelayRequestMarkup(content)) {
      logStage(config, 'request_detection', {
        chatId,
        messageId: message.id,
        swipeId,
        payloadContainsImageRequest: capturedContainsImageRequest,
        storedMessageContainsImageRequest: storedContainsImageRequest,
        parsedRequestCount: 0,
        reason: 'no image_request or reverie-illustration request found in stored message or captured payload',
      }, 'warn')
      await sendState(userId, chatId)
      return
    }

    const requests = parseSafeSurfaceImageRequests(content)
    const rawTags = inspectRawImageRequestTags(content)
    logStage(config, 'request_detection', {
      chatId,
      messageId: message.id,
      swipeId,
      payloadContainsImageRequest: capturedContainsImageRequest,
      storedMessageContainsImageRequest: storedContainsImageRequest,
      rawTagCount: rawTags.length,
      parsedRequestCount: requests.length,
      requestIdsFound: requests.map(request => request.id),
      targetsFound: requests.map(request => request.target),
      ignoredRawTags: rawTags.length > requests.length ? rawTags.slice(requests.length) : [],
    }, requests.length === 0 ? 'warn' : 'info')
    if (requests.length === 0) {
      await sendState(userId, chatId)
      return
    }

    const fingerprintKey = `${message.id}:${swipeId}`
    const fingerprint = contentFingerprint(content)
    const stateBeforeRegistration = await getState(chatId, userId)
    if (stateBeforeRegistration.suppressedContentFingerprints[fingerprintKey] === fingerprint) {
      logStage(config, 'request_skipped', { chatId, messageId: message.id, swipeId, reason: 'content was explicitly cleared from Relay state', fingerprint })
      return
    }

    const now = Date.now()
    const jobs = await mutateState(chatId, userId, state => {
      if (state.suppressedContentFingerprints[fingerprintKey] && state.suppressedContentFingerprints[fingerprintKey] !== fingerprint) {
        delete state.suppressedContentFingerprints[fingerprintKey]
      }
      const registeredJobs: RouterJob[] = []
      for (const req of requests) {
      const slots = slotsForRequest(req)
      const keys = slots.map(slot => slotKey({ chatId, messageId: message.id, swipeId, requestId: req.id, slot }))
      const registered = keys
        .map(key => state.slots[key])
        .filter((record): record is SlotRecord => Boolean(record))
      const blocking = registered.find(record => record.status !== 'queued')
      const queuedRecords = registered.filter(record => record.status === 'queued')
      const job: RouterJob = {
        chatId,
        messageId: message.id,
        swipeId,
        requestId: req.id,
        target: req.target,
        intent: req.intent,
        count: req.count,
        slots,
        alt: req.alt || '',
        caption: req.caption,
        time: req.time,
        aspect: req.aspect,
        originalSceneBrief: req.prompt,
        originalNegativePrompt: req.negative || '',
        originalRequestXml: req.fullMatch,
        cast: req.cast,
        promptSource: req.promptSource,
        sourceContent: content,
      }
      if (blocking) {
        logStage(config, 'request_skipped', {
          chatId,
          messageId: message.id,
          swipeId,
          requestId: req.id,
          target: req.target,
          slots,
          reason: 'already registered',
          existingStatus: blocking.status,
          existingKey: blocking.key,
        })
        continue
      }
      if (registered.length > 0 && registered.length !== slots.length) {
        logStage(config, 'request_skipped', {
          chatId,
          messageId: message.id,
          swipeId,
          requestId: req.id,
          target: req.target,
          slots,
          reason: 'partial existing registration requires explicit recovery',
          existingKeys: registered.map(record => record.key),
        }, 'warn')
        continue
      }
      if (queuedRecords.length === slots.length) {
        logStage(config, 'request_registered', {
          chatId,
          messageId: message.id,
          swipeId,
          requestId: req.id,
          target: req.target,
          slots,
          status: 'already queued',
        })
        registeredJobs.push(job)
        continue
      }

      for (const slot of slots) {
        const key = slotKey({ chatId, messageId: message.id, swipeId, requestId: req.id, slot })
        const previous = state.slots[key]
        state.slots[key] = {
          key,
          chatId,
          messageId: message.id,
          swipeId,
          requestId: req.id,
          target: req.target,
          imageIntent: req.intent,
          targetApp: targetApp(req.target),
          slot,
          status: 'queued',
          originalSceneBrief: req.prompt,
          originalNegativePrompt: req.negative || '',
          originalRequestXml: req.fullMatch,
          cast: req.cast,
          promptSource: req.promptSource,
          alt: req.alt || '',
          caption: req.caption,
          time: req.time,
          count: req.count,
          requestAspect: req.aspect,
          createdAt: previous?.createdAt ?? now,
          discoveredAt: previous?.discoveredAt ?? now,
          registeredAt: previous?.registeredAt ?? now,
          queuedAt: now,
          updatedAt: now,
          highResMode: previous?.highResMode ?? config.highResMode,
          selectedPromptProfileId: previous?.selectedPromptProfileId ?? effectiveGenerationProfile(config, chatId).defaultPromptProfileId,
          attempts: previous?.attempts ?? [],
          promptPipeline: previous?.promptPipeline ?? emptyPromptPipeline({ caption: req.caption, originalNegativePrompt: req.negative || '' }),
          history: previous?.history ?? [],
        }
      }
      logStage(config, 'request_registered', {
        chatId,
        messageId: message.id,
        swipeId,
        requestId: req.id,
        target: req.target,
        slots,
      })
      appendStateLog(state, {
        severity: 'info', stage: 'request-registration', eventType: 'request_registered', chatId, messageId: message.id, swipeId,
        requestId: req.id, target: req.target, message: `Registered ${slots.length} slot${slots.length === 1 ? '' : 's'} for ${req.target}.`,
      })
        registeredJobs.push(job)
      }
      return registeredJobs
    })

    if (jobs.length === 0) {
      pendingGenerationContent.delete(pendingContentKey(chatId, message.id))
      await sendState(userId, chatId)
      return
    }

    pendingGenerationContent.delete(pendingContentKey(chatId, message.id))
    logSlotSummary(config, await getState(chatId, userId), chatId)
    await sendState(userId, chatId)
    if (registerOnly) {
      await mutateState(chatId, userId, state => appendStateLog(state, {
        severity: 'info', stage: 'request-registration', eventType: 'manual_slot_registered', chatId, messageId: message.id, swipeId,
        message: 'Relay registered manual slots; Auto Generate is off, so no provider job was dispatched.',
        details: { requestIds: jobs.map(job => job.requestId), mode: 'manual-lazy-slot' },
      }))
      await sendState(userId, chatId)
      return
    }
    if (config.followNativeImageGen && !nativeSnapshot && !nativeSnapshotFromConfig(config)) {
      requestNativeSettingsSnapshot(chatId, message.id, swipeId, userId, content)
      return
    }
    const effectiveSnapshot = nativeSnapshot || nativeSnapshotFromConfig(config)
    if (config.slotGenerationMode === 'prompt-preview') {
      for (const job of jobs) {
        const key = slotKey({ ...job, slot: job.slots[0] || 'image' })
        await previewReparse(key, userId, effectiveSnapshot)
      }
      return
    }
    await runWithConcurrency(jobs, config.queueConcurrencyLimit, job => runJob(job, { replaceExisting: false, reparse: true, triggerType: 'initial', nativeSnapshot: effectiveSnapshot, automaticDispatch: true }, userId))
  } finally {
    messageLocks.delete(lockKey)
    if (messageId) clearIdleCancellationKeys(chatId, messageId)
    const deferred = deferredScans.get(lockKey)
    if (deferred) {
      deferredScans.delete(lockKey)
      queueMicrotask(() => {
        void scanAndGenerate(...deferred).catch(error => spindle.log.error(`[Reverie Relay:deferred_scan] ${error instanceof Error ? error.message : String(error)}`))
      })
    }
  }
}

function clearIdleCancellationKeys(chatId: string, messageId: string): void {
  const prefix = `${chatId}:${messageId}:`
  for (const key of [...cancelledJobs]) {
    if (!key.startsWith(prefix)) continue
    const active = [...slotLocks].some(lock => lock.startsWith(`${key}:`))
    if (!active) cancelledJobs.delete(key)
  }
}

async function assertPersonaPovDispatchAllowed(job: RouterJob, userId?: string): Promise<void> {
  if (job.target !== 'prose.illustration') return
  const state = await getState(job.chatId, userId)
  const storedPlan = job.prosePlanId ? state.proseIllustrator.plans[job.prosePlanId] : undefined
  const perspectiveMode = job.prosePromptComposition?.perspectiveMode
    || storedPlan?.perspectiveMode
    || proseSettingsForChat(state, job.chatId).perspectiveMode
  if (perspectiveMode !== 'persona-pov') return
  const context = await resolvePersonaPovContext(job.chatId, userId)
  if (!context.available) throw new Error('Persona POV refused provider dispatch because no chat-bound or active host Persona resolved.')
}

async function runJob(job: RouterJob, options: {
  replaceExisting: boolean
  reparse: boolean
  triggerType: JobTrigger
  nativeSnapshot?: NativeSettingsSnapshot
  highResMode?: boolean
  forceImagePreview?: boolean
  automaticDispatch?: boolean
}, userId?: string): Promise<void> {
  const lockKey = `${job.chatId}:${job.messageId}:${job.swipeId}:${job.requestId}:${job.slots.join(',')}`
  if (slotLocks.has(lockKey)) return
  slotLocks.add(lockKey)
  let failureStage: 'provider-validation' | 'parser-failed' | 'image-generation-failed' = 'parser-failed'
  const backgroundTaskId = `slot:${contentFingerprint(lockKey).slice(0, 20)}`

  try {
    if (isJobCancelled(job)) throw new JobCancelledError()
    await assertPersonaPovDispatchAllowed(job, userId)
    if (options.triggerType !== 'initial') await preflightJobReplacement(job)
    const config = await getConfig(userId)
    if (options.automaticDispatch && !config.autoGenerate) {
      await mutateJobState(job, userId, state => {
        for (const slot of job.slots) {
          const record = state.slots[slotKey({ ...job, slot })]
          if (!record) continue
          record.status = 'queued'
          record.updatedAt = Date.now()
        }
        appendStateLog(state, {
          severity: 'info', stage: 'provider-dispatch', eventType: 'automatic_provider_dispatch_suppressed',
          chatId: job.chatId, messageId: job.messageId, swipeId: job.swipeId, requestId: job.requestId,
          message: 'Auto Generate is off; the slot remains ready for manual generation.',
        })
      })
      await sendState(userId, job.chatId)
      return
    }
    await mutateJobState(job, userId, state => {
      markJobStatus(state, job, 'parsing', options.triggerType)
      startBackgroundTask(state, { id: backgroundTaskId, chatId: job.chatId, source: job.target === 'prose.illustration' ? 'relay-illustrator' : 'relay-slot', label: job.target === 'prose.illustration' ? `Illustrate ${job.alt || job.requestId}` : `Generate ${job.target}`, stage: 'analyzing', statusText: 'Analyzing 1/3', current: 1, total: 3, requestId: job.requestId, slotKey: job.slots[0] ? slotKey({ ...job, slot: job.slots[0] }) : undefined, planId: job.prosePlanId })
      for (const slot of job.slots) {
        const record = state.slots[slotKey({ ...job, slot })]
        appendStateLog(state, {
          severity: 'info', stage: 'parser-start', eventType: 'parser_started', chatId: job.chatId, messageId: job.messageId,
          swipeId: job.swipeId, requestId: job.requestId, slot, target: job.target, attemptNumber: record.attemptNumber,
          triggerType: options.triggerType, message: 'Prompt parsing started.',
        })
      }
    })
    await sendState(userId, job.chatId)

    if (isJobCancelled(job)) throw new JobCancelledError()
    const messages = await spindle.chat.getMessages(job.chatId) as ChatMessage[]
    const targetIndex = Math.max(0, messages.findIndex(message => message.id === job.messageId))
    const results: SlotGenerationResult[] = []

    await runWithConcurrency(job.slots, Math.min(config.queueConcurrencyLimit, job.slots.length), async slot => {
      const key = slotKey({ ...job, slot })
      if (isJobCancelled(job)) throw new JobCancelledError()
      const currentState = await getState(job.chatId, userId)
      const record = currentState.slots[key]
      if (!record) throw new JobCancelledError()
      const highResMode = options.highResMode ?? (options.reparse ? config.highResMode : record.highResMode ?? config.highResMode)

      failureStage = 'provider-validation'
      const imagePlan = await prepareImagePlan(config, job, record, options.nativeSnapshot, userId, highResMode)
      await mutateJobState(job, userId, state => stampImagePlan(state.slots[key], imagePlan))
      scheduleStateBroadcast(userId, job.chatId)
      if (isJobCancelled(job)) throw new JobCancelledError()
      validateImagePlan(imagePlan)

      failureStage = 'parser-failed'
      if (isJobCancelled(job)) throw new JobCancelledError()
      const prepared = options.reparse
        ? await parseSlotPrompt(job, slot, messages, targetIndex, config, userId, imagePlan.nativeImageSettings as NativeImageSettings, highResMode, options.triggerType === 'reparse' || options.triggerType === 'intent-regeneration')
        : resolvedPromptFromRecord(record, config)
      if (isJobCancelled(job)) throw new JobCancelledError()
      enrichPromptPipelineWithImagePlan(prepared.promptPipeline, imagePlan, prepared.prompt, prepared.negativePrompt)

      const attemptNumber = await mutateJobState(job, userId, state => {
        const stored = state.slots[key]
        stored.resolvedPositivePrompt = prepared.prompt
        stored.resolvedNegativePrompt = prepared.negativePrompt
        stored.promptMode = prepared.promptMode
        stored.promptPresetId = prepared.promptPresetId
        stored.parserConnectionId = prepared.parserConnectionId
        stored.parserModel = prepared.parserModel
        stored.parserParameters = prepared.parserParameters
        stored.promptPipeline = prepared.promptPipeline
        updateBackgroundTask(state, backgroundTaskId, { stage: 'composing-prompt', statusText: 'Composing prompt 2/3', current: 2, total: 3 })
        appendStateLog(state, {
          severity: 'info', stage: 'parser-response', eventType: 'parser_completed', chatId: job.chatId, messageId: job.messageId,
          swipeId: job.swipeId, requestId: job.requestId, slot, target: job.target, attemptNumber: stored.attemptNumber,
          triggerType: options.triggerType, provider: stored.imageProvider, connectionId: stored.imageConnectionId,
          connectionName: stored.imageConnectionName, model: stored.imageModel, message: 'Prompt parsing completed.',
        })
        markSlotStatus(stored, 'generating')
        updateBackgroundTask(state, backgroundTaskId, { stage: 'waiting-for-provider', statusText: 'Waiting for Swarm', current: 2, total: 3 })
        appendStateLog(state, {
          severity: 'info', stage: 'image-generation-start', eventType: 'image_generation_started', chatId: job.chatId, messageId: job.messageId,
          swipeId: job.swipeId, requestId: job.requestId, slot, target: job.target, attemptNumber: stored.attemptNumber,
          triggerType: options.triggerType, provider: stored.imageProvider, connectionId: stored.imageConnectionId,
          connectionName: stored.imageConnectionName, model: stored.imageModel, message: 'Native ImageGen request started.',
        })
        return stored.attemptNumber
      })
      scheduleStateBroadcast(userId, job.chatId)

      failureStage = 'image-generation-failed'
      if (isJobCancelled(job)) throw new JobCancelledError()
      const generated = await generateImage(job.chatId, prepared, imagePlan, userId, {
        chatId: job.chatId,
        generationId: `${key}:${attemptNumber}`,
        source: job.target === 'prose.illustration' ? 'relay-illustrator' : 'relay-slot',
        slotKey: key,
        requestId: job.requestId,
        addToGallery: config.galleryAutoLink,
      })
      if (isJobCancelled(job)) throw new JobCancelledError()
      await mutateJobState(job, userId, state => updateBackgroundTask(state, backgroundTaskId, { stage: 'placing', statusText: 'Saving and placing 3/3', current: 3, total: 3 }))
      const requestedAspect = cleanString(job.aspect)
      const returnedAspect = cleanString(generated.aspectRatio)
      if (requestedAspect && returnedAspect && !aspectRatioEquivalent(requestedAspect, returnedAspect)) {
        prepared.promptPipeline.warnings.push({
          code: 'aspect-ratio-mismatch',
          message: `Requested ${requestedAspect}; provider returned ${returnedAspect} (${generated.imageWidth || '?'}×${generated.imageHeight || '?'}).`,
          sources: ['provider result validation'],
        })
      }
      results.push({
        slot,
        imageId: generated.imageId,
        imageIntent: job.intent,
        imageUrl: generated.imageUrl,
        imageWidth: generated.imageWidth,
        imageHeight: generated.imageHeight,
        aspectRatio: generated.aspectRatio,
        resolvedPositivePrompt: prepared.prompt,
        resolvedNegativePrompt: prepared.negativePrompt,
        promptMode: prepared.promptMode,
        promptPresetId: prepared.promptPresetId,
        parserUsed: prepared.parserUsed,
        parserOutput: prepared.parserOutput,
        parserConnectionId: prepared.parserConnectionId,
        parserModel: prepared.parserModel,
        parserParameters: prepared.parserParameters,
        promptPipeline: prepared.promptPipeline,
        imageConnectionId: generated.imageConnectionId,
        imageConnectionName: generated.imageConnectionName,
        imageProvider: generated.imageProvider,
        imageModel: generated.imageModel,
        imageParameters: generated.imageParameters,
        nativeImageSettings: generated.nativeImageSettings,
        nativeSettingsCapturedAt: generated.nativeSettingsCapturedAt,
        connectionDefaultParameters: generated.connectionDefaultParameters,
        slotOverrides: generated.slotOverrides,
        finalImageParameters: generated.finalImageParameters,
        finalImageRequest: generated.finalImageRequest,
        finalImageSettingsSource: generated.finalImageSettingsSource,
        nativeActiveLoraPreset: generated.nativeActiveLoraPreset,
        effectiveAppliedLoraPreset: generated.effectiveAppliedLoraPreset,
        lorasSentToProvider: generated.lorasSentToProvider,
        loraBaseTags: generated.loraBaseTags,
        baseTagsAddedToPrompt: generated.baseTagsAddedToPrompt,
        omittedBaseTags: generated.omittedBaseTags,
        highResMode: generated.highResMode,
        highResRetainedBaseTags: generated.highResRetainedBaseTags,
        highResPreservedFramingCues: generated.highResPreservedFramingCues,
        loraOmittedFields: generated.loraOmittedFields,
        galleryLinkStatus: generated.galleryLinkStatus,
        galleryItemId: generated.galleryItemId,
        galleryLinkError: generated.galleryLinkError,
        galleryLinkedAt: generated.galleryLinkStatus === 'linked' ? Date.now() : undefined,
        promptProfile: prepared.promptPipeline.promptProfile,
        regenerationIntent: job.regenerationIntent,
        diagnostic: createSlotDiagnostic(job, slot, prepared, generated, prepared.promptPipeline.promptProfile, job.regenerationIntent),
        includedContinuityFacts: prepared.promptPipeline.includedContinuityFacts,
        excludedContinuityFacts: prepared.promptPipeline.excludedContinuityFacts,
        continuityStrength: prepared.promptPipeline.continuityStrength,
        attemptNumber,
        triggerType: options.triggerType,
        generatedAt: Date.now(),
      })
    })

    results.sort((left, right) => job.slots.indexOf(left.slot) - job.slots.indexOf(right.slot))
    if (isJobCancelled(job)) throw new JobCancelledError()
    const placement = await applyJobSuccess(job, results, options.replaceExisting, userId, false, options.forceImagePreview === true)
    await enqueueGalleryLinksForResults(job, results, userId)
    await mutateState(job.chatId, userId, state => finishBackgroundTask(state, backgroundTaskId, placement === 'completed' ? 'Complete' : 'Ready to place'))
    spindle.sendToFrontend({ type: 'status', status: placement === 'completed' ? 'Generated' : 'Ready to Place', requestId: job.requestId }, userId)
  } catch (error) {
    if (error instanceof JobCancelledError || isJobCancelled(job)) { await mutateState(job.chatId, userId, state => updateBackgroundTask(state, backgroundTaskId, { stage: 'cancelled', statusText: 'Cancelled', etaSeconds: null })).catch(() => undefined); return }
    if (error instanceof ReplacementPreflightError) {
      await reportReplacementPreflightFailure(job, error.message, userId)
      return
    }
    const message = error instanceof Error ? error.message : String(error)
    await mutateState(job.chatId, userId, state => failBackgroundTask(state, backgroundTaskId, message)).catch(() => undefined)
    spindle.log.error(`[Reverie Relay:job_failed] ${message}`)
    try {
      await applyJobFailure(job, message, failureStage, userId)
    } catch (failureError) {
      if (failureError instanceof JobCancelledError || isJobCancelled(job)) return
      spindle.log.error(`[Reverie Relay:failure_state_error] ${failureError instanceof Error ? failureError.message : String(failureError)}`)
      await forceMarkFailed(job, message, userId)
    }
    if (isJobCancelled(job)) return
    await sendSlotErrors(job, message, userId)
  } finally {
    slotLocks.delete(lockKey)
    cancelledJobs.delete(jobCancellationKey(job))
  }
}


async function enqueueGalleryLinksForResults(job: RouterJob, results: SlotGenerationResult[], userId?: string): Promise<void> {
  const config = await getConfig(userId)
  if (!config.galleryAutoLink || !job.chatId) return
  const characterId = await ownerCharacterIdForChat(job.chatId, userId)
  if (!characterId) {
    await mutateState(job.chatId, userId, state => appendStateLog(state, { severity: 'warning', stage: 'character-gallery', eventType: 'gallery_link_skipped', chatId: job.chatId, requestId: job.requestId, message: 'Could not save generated images to Character Gallery because the active chat has no character owner.' }))
    return
  }
  await mutateState(job.chatId, userId, state => {
    let linked = 0
    let queued = 0
    for (const result of results) {
      if (!result.imageId) continue
      const key = slotKey({ ...job, slot: result.slot })
      const record = state.slots[key]
      if (result.galleryLinkStatus === 'linked' && result.galleryItemId) {
        linked += 1
        if (record) {
          record.galleryLinkStatus = 'linked'
          record.galleryItemId = result.galleryItemId
          record.galleryLinkError = undefined
          record.galleryLinkedAt = result.galleryLinkedAt || Date.now()
        }
        appendStateLog(state, {
          severity: 'info', stage: 'character-gallery', eventType: 'gallery_link_confirmed', chatId: job.chatId, requestId: job.requestId,
          message: 'Lumiverse confirmed the Character Gallery row during image persistence.',
          details: { imageId: result.imageId, galleryItemId: result.galleryItemId, slotKey: key },
        })
        continue
      }

      const source: GalleryLinkRequest['source'] = job.target === 'prose.illustration' ? 'relay-illustrator' : 'relay-slot'
      const link = queueGalleryLink(state, {
        chatId: job.chatId,
        characterId,
        imageId: result.imageId,
        imageUrl: result.imageUrl,
        caption: job.caption || job.alt || job.originalSceneBrief.slice(0, 180),
        source,
        slotKey: key,
      })
      queued += 1
      if (record) {
        record.galleryLinkStatus = link.status
        record.galleryItemId = link.galleryItemId
        record.galleryLinkError = result.galleryLinkError || link.error
      }
    }
    appendStateLog(state, {
      severity: queued ? 'warning' : 'info', stage: 'character-gallery', eventType: queued ? 'gallery_link_fallback_queued' : 'gallery_link_confirmed_batch',
      chatId: job.chatId, requestId: job.requestId,
      message: queued
        ? `${linked} image${linked === 1 ? '' : 's'} linked server-side; ${queued} queued for the REST fallback.`
        : `Lumiverse confirmed ${linked} Character Gallery row${linked === 1 ? '' : 's'} server-side.`,
    })
  })
  await sendState(userId, job.chatId)
}

async function regenerateSlot(key: string, nativeSnapshot?: NativeSettingsSnapshot, userId?: string, highResMode?: boolean): Promise<void> {
  const { chatId, record } = await getRecordByKey(key, userId)
  if (!canRegenerateRecord(record)) {
    if (canReparseRecord(record)) {
      await reparseSlot(key, nativeSnapshot, userId)
      return
    }
    throw new Error('Original prompt metadata was not available when this slot was recovered. Rebuild the request or supply a prompt first.')
  }
  if (relayProcessingKeys.has(record.key) || isRecordJobActive(record)) {
    cancelledJobs.add(jobCancellationKey(record))
    abortImageStream(record.key)
    abortImageStream(record.requestId)
    scheduleDeferredRegenerate(key, nativeSnapshot, userId, highResMode)
    spindle.sendToFrontend({ type: 'relay_notice', level: 'info', message: 'Regeneration is queued and will start as soon as the current provider call stops.' }, userId)
    await sendState(userId, chatId)
    return
  }
  cancelledJobs.delete(jobCancellationKey(record))
  const job = jobFromRecord(record)
  // Regeneration rebuilds from the canonical request and current trusted
  // sources; it never replays a previously assembled provider prompt.
  await runJob(job, { replaceExisting: record.status === 'completed', reparse: true, triggerType: nativeSnapshot ? 'regenerate-current-settings' : 'regenerate-same-settings', nativeSnapshot, highResMode }, userId)
  await sendState(userId, chatId)
}

export function normalizeRelaySurfaceContracts(content: string): string {
  return normalizeSurfaceDocument(normalizeCharacterProfileContract(content), SHIPPED_SURFACE_SPECS).markup
}

export function parseSafeSurfaceImageRequests(content: string): ReturnType<typeof parseImageRequests> {
  // Mask only ambiguous Surface islands; retain offsets and all other prose.
  // Scans/reparse persist safe repairs before a job snapshots original XML.
  const safe = normalizeSurfaceDocument(content, SHIPPED_SURFACE_SPECS, block => block.diagnostics.length ? ' '.repeat(block.original.length) : block.markup)
  return parseImageRequests(safe.markup)
}

async function preflightJobReplacement(job: RouterJob): Promise<void> {
  const message = await resolveMessage(job.chatId, job.messageId)
  if (!message) throw new ReplacementPreflightError('This recovered slot no longer has a message to update. Remove the Relay record or rebuild the request in an existing message.')
  const content = strictSwipeContent(message, job.swipeId)
  const requests = parseSafeSurfaceImageRequests(content)
  const request = requests.find(candidate => candidate.id === job.requestId && candidate.target === job.target)
  const unresolvedSlots = request ? new Set(slotsForRequest(request)) : new Set<string>()
  for (const slot of job.slots) {
    if (request && unresolvedSlots.has(slot)) continue
    if (slotCommentVariants(job, slot).some(marker => content.includes(marker)) || errorCommentVariants(job, slot).some(marker => content.includes(marker))) continue
    throw new ReplacementPreflightError()
  }
}

function strictSwipeContent(message: ChatMessage, swipeId: number): string {
  if (Array.isArray(message.swipes) && message.swipes.length) {
  if (swipeId < 0 || swipeId >= message.swipes.length) throw new ReplacementPreflightError('The original message swipe no longer exists. The Relay record was left unchanged.')
    return String(message.swipes[swipeId] || '')
  }
  if (swipeId !== activeSwipeId(message)) throw new ReplacementPreflightError('The original message swipe no longer exists. The Relay record was left unchanged.')
  return String(message.content || '')
}

async function reportReplacementPreflightFailure(job: RouterJob, message: string, userId?: string): Promise<void> {
  const sourceGone = /message (?:is unavailable|no longer exists)|message swipe no longer exists|no message to update/i.test(message)
  await mutateState(job.chatId, userId, state => {
    const removed = sourceGone ? purgeOwnedMessageState(state, job.chatId, job.messageId) : null
    appendStateLog(state, {
      severity: sourceGone ? 'info' : 'warning', stage: 'message-replacement-preflight', eventType: sourceGone ? 'missing_source_state_purged' : 'message_replacement_preflight_failed', chatId: job.chatId,
      messageId: job.messageId, swipeId: job.swipeId, requestId: job.requestId, target: job.target,
      message: sourceGone ? 'The source message or swipe no longer exists. Relay removed its owned pending slot and review state instead of leaving a frozen record.' : message,
      details: { slots: job.slots, originalMessage: message, removed },
    })
  })
  spindle.sendToFrontend({
    type: 'relay_notice',
    level: sourceGone ? 'info' : 'warning',
    message: sourceGone ? 'The deleted message owned this slot, so Relay removed the stale slot automatically.' : message,
  }, userId)
  await sendState(userId, job.chatId)
}

async function resetRecordForReparse(chatId: string, key: string, userId?: string): Promise<SlotRecord> {
  await mutateState(chatId, userId, state => {
    const record = state.slots[key]
    if (!record) throw new Error('Slot not found.')
    const now = Date.now()
    if (record.attempts?.length) {
      const attempt = record.attempts[record.attempts.length - 1]
      if (!['completed', 'failed', 'cancelled', 'placement-pending', 'placement-repair-needed'].includes(attempt.stage)) finishAttempt(record, 'cancelled', now, 'Reset before explicit reparse.')
    }
    record.status = record.imageUrl ? 'completed' : 'recovered-pending'
    record.error = undefined
    record.errorToastKey = undefined
    record.cancelledAt = undefined
    record.failedAt = undefined
    record.pendingPlacement = undefined
    record.previewPending = false
    record.placementFailure = undefined
    record.updatedAt = now
  })
  const state = await getState(chatId, userId)
  const record = state.slots[key]
  if (!record) throw new Error('Slot not found.')
  cancelledJobs.delete(jobCancellationKey(record))
  relayProcessingKeys.delete(record.key)
  return record
}

function scheduleDeferredRegenerate(key: string, nativeSnapshot: NativeSettingsSnapshot | undefined, userId: string | undefined, highResMode?: boolean, attempts = 0): void {
  const existing = deferredRegenerateRequests.get(key)
  if (existing?.timer) clearTimeout(existing.timer)
  const request: { key: string; nativeSnapshot?: NativeSettingsSnapshot; userId?: string; highResMode?: boolean; attempts: number; timer?: ReturnType<typeof setTimeout> } = { key, nativeSnapshot, userId, highResMode, attempts }
  request.timer = setTimeout(() => {
    void (async () => {
      try {
        const located = await getRecordByKey(key, userId)
        if (isRecordJobActive(located.record) || relayProcessingKeys.has(key)) {
          if (attempts < 120) scheduleDeferredRegenerate(key, nativeSnapshot, userId, highResMode, attempts + 1)
          else spindle.sendToFrontend({ type: 'relay_notice', level: 'warning', message: 'The previous provider call did not release this slot. Use Regenerate again after it stops.' }, userId)
          return
        }
        deferredRegenerateRequests.delete(key)
        await regenerateSlot(key, nativeSnapshot, userId, highResMode)
      } catch (error) {
        deferredRegenerateRequests.delete(key)
        const message = error instanceof Error ? error.message : String(error)
        if (!/Slot not found/i.test(message)) spindle.sendToFrontend({ type: 'error', source: 'deferred_regenerate', message }, userId)
      }
    })()
  }, 500)
  deferredRegenerateRequests.set(key, request)
}

function scheduleDeferredReparse(key: string, nativeSnapshot: NativeSettingsSnapshot | undefined, userId: string | undefined, attempts = 0): void {
  const existing = deferredReparseRequests.get(key)
  if (existing?.timer) clearTimeout(existing.timer)
  const request: { key: string; nativeSnapshot?: NativeSettingsSnapshot; userId?: string; attempts: number; timer?: ReturnType<typeof setTimeout> } = { key, nativeSnapshot, userId, attempts }
  request.timer = setTimeout(() => {
    void (async () => {
      try {
        const located = await getRecordByKey(key, userId)
        if (isRecordJobActive(located.record) || relayProcessingKeys.has(key)) {
          if (attempts < 120) scheduleDeferredReparse(key, nativeSnapshot, userId, attempts + 1)
          else spindle.sendToFrontend({ type: 'relay_notice', level: 'warning', message: 'The previous provider call did not release this slot. Use Reparse again after it stops.' }, userId)
          return
        }
        deferredReparseRequests.delete(key)
        await reparseSlot(key, nativeSnapshot, userId)
      } catch (error) {
        deferredReparseRequests.delete(key)
        const message = error instanceof Error ? error.message : String(error)
        if (!/Slot not found/i.test(message)) spindle.sendToFrontend({ type: 'error', source: 'deferred_reparse', message }, userId)
      }
    })()
  }, 500)
  deferredReparseRequests.set(key, request)
}

async function reparseChatSlots(chatId: string, nativeSnapshot?: NativeSettingsSnapshot, userId?: string): Promise<void> {
  await reconcileChatState(chatId, userId)
  const state = await getState(chatId, userId)
  const eligible = Object.values(state.slots).filter(record => canReparseRecord(record) && !record.orphaned && record.status !== 'completed')
  if (!eligible.length) {
    spindle.sendToFrontend({ type: 'relay_notice', level: 'info', message: 'No reparsable Relay slots were found in this chat.' }, userId)
    await sendState(userId, chatId)
    return
  }
  spindle.sendToFrontend({ type: 'status', status: `Reparsing 0 / ${eligible.length} slots…` }, userId)
  const config = await getConfig(userId)
  let completed = 0
  await runWithConcurrency(eligible, config.queueConcurrencyLimit, async record => {
    await reparseSlot(record.key, nativeSnapshot || nativeSnapshotFromConfig(config), userId)
    completed += 1
    spindle.sendToFrontend({ type: 'status', status: `Reparsing ${completed} / ${eligible.length} slots…` }, userId)
  })
  spindle.sendToFrontend({ type: 'relay_notice', level: 'success', message: `Reparse finished for ${completed} Relay slot${completed === 1 ? '' : 's'}.` }, userId)
  await sendState(userId, chatId)
}

async function reparseSlot(key: string, nativeSnapshot?: NativeSettingsSnapshot, userId?: string): Promise<void> {
  const located = await getRecordByKey(key, userId)
  const chatId = located.chatId
  const record = await resetRecordForReparse(chatId, key, userId)
  if (!canReparseRecord(record)) throw new Error('Original request metadata was not available when this slot was recovered. Rebuild the request first.')
  if (isRecordJobActive(record) || relayProcessingKeys.has(record.key)) {
    cancelledJobs.add(jobCancellationKey(record))
    abortImageStream(record.key)
    abortImageStream(record.requestId)
    scheduleDeferredReparse(key, nativeSnapshot, userId)
    spindle.sendToFrontend({ type: 'relay_notice', level: 'info', message: 'Reparse is queued and will start as soon as the previous provider call releases this slot.' }, userId)
    await sendState(userId, chatId)
    return
  }
  cancelledJobs.delete(jobCancellationKey(record))
  if (record.target === 'instagram.carousel' && !record.imageUrl) {
    const state = await getState(chatId, userId)
    const siblings = Object.values(state.slots).filter(candidate =>
      candidate.target === 'instagram.carousel' &&
      candidate.chatId === record.chatId && candidate.messageId === record.messageId &&
      candidate.swipeId === record.swipeId && candidate.requestId === record.requestId,
    )
    if (siblings.some(isProcessing)) throw new Error('This carousel is already processing.')
    const job = groupFailedRetryJobs(siblings)[0]
    if (!job) throw new Error('Could not reconstruct the original carousel request.')
    await runJob(job, { replaceExisting: false, reparse: true, triggerType: 'reparse', nativeSnapshot: nativeSnapshot || nativeSnapshotFromConfig(await getConfig(userId)) }, userId)
    await sendState(userId, chatId)
    return
  }
  const job = jobFromRecord(record)
  await runJob(job, { replaceExisting: Boolean(record.imageUrl), reparse: true, triggerType: 'reparse', nativeSnapshot: nativeSnapshot || nativeSnapshotFromConfig(await getConfig(userId)) }, userId)
  await sendState(userId, chatId)
}

async function retryFailed(chatId: string, userId?: string): Promise<void> {
  await reconcileChatState(chatId, userId)
  const state = await getState(chatId, userId)
  const failed = Object.values(state.slots).filter(record => record.status === 'failed' && !isProcessing(record) && canReparseRecord(record))
  const jobs = groupFailedRetryJobs(failed)
  const config = await getConfig(userId)
  const validationError = await validateRetryJobsBeforeAttempt(jobs, state, config, userId)
  if (validationError) {
    spindle.sendToFrontend({ type: 'error', source: 'retry_failed', message: validationError }, userId)
    await sendState(userId, chatId)
    return
  }
  await runWithConcurrency(jobs, config.queueConcurrencyLimit, async job => {
    await runJob(job, { replaceExisting: retryJobHasCurrentImage(state, job), reparse: true, triggerType: 'retry', nativeSnapshot: nativeSnapshotFromConfig(config) }, userId)
  })
  await sendState(userId, chatId)
}

async function startRelayBatch(
  chatId: string,
  nativeSnapshot?: NativeSettingsSnapshot,
  userId?: string,
  requestedCandidateCount?: 1 | 2 | 4,
  intent?: RegenerationIntent,
  selectedKeys?: string[],
  options?: { highResModeOverride?: boolean; source?: 'relay' | 'prose-illustrator' },
): Promise<void> {
  if (relayBatchLocks.has(chatId)) return
  relayBatchLocks.add(chatId)
  const startedAt = Date.now()
  try {
    // A click is an explicit recovery point: register any active-swipe slots before selecting the batch.
    await rescanChatForSlots(chatId, userId, true, false)
    const state = await getState(chatId, userId)
    const messages = await spindle.chat.getMessages(chatId) as ChatMessage[]
    const assistantMessages = messages.filter(message => isAssistantMessage(message) && !isOwnMessage(message))
    let selectedMessage: ChatMessage | null = null
    let selectedSwipe = -1
    let selectedRecords: SlotRecord[] = []
    const selectedKeySet = new Set(selectedKeys || [])
    for (const message of [...assistantMessages].reverse()) {
      const swipeId = activeSwipeId(message)
      const candidates = Object.values(state.slots).filter(record => record.messageId === message.id && record.swipeId === swipeId && !record.orphaned && (!selectedKeySet.size || selectedKeySet.has(record.key)))
      if (candidates.length) {
        selectedMessage = message
        selectedSwipe = swipeId
        selectedRecords = candidates
        break
      }
    }
    if (!selectedMessage || selectedSwipe < 0 || selectedRecords.length === 0) {
      spindle.sendToFrontend({ type: 'relay_notice', level: 'info', message: 'No Reverie Relay image slots were found in the latest assistant message.' }, userId)
      return
    }

    const config = await getConfig(userId)
    const generationProfile = effectiveGenerationProfile(config, chatId)
    const candidateCount = normalizeCandidateCount(requestedCandidateCount, generationProfile.defaultCandidateCount || config.defaultCandidateCount)
    const batchId = `${chatId}:${selectedMessage.id}:${selectedSwipe}:${Date.now().toString(36)}`
    const batchHighRes = options?.highResModeOverride ?? config.highResMode
    const mode = batchHighRes ? 'high-res' : 'normal'
    const candidates: RelayCandidate[] = selectedRecords
      .sort((a, b) => `${a.requestId}:${a.slot}`.localeCompare(`${b.requestId}:${b.slot}`))
      .flatMap(record => Array.from({ length: candidateCount }, (_value, index) => ({
        candidateKey: candidateCount > 1 ? `${batchId}:${record.key}:candidate-${index + 1}` : `${batchId}:${record.key}`,
        stableSlotKey: record.key,
        batchId,
        chatId,
        messageId: record.messageId,
        swipeId: record.swipeId,
        requestId: record.requestId,
        target: record.target,
        imageIntent: normalizeImageIntent(record.imageIntent),
        targetApp: record.targetApp,
        slot: record.slot,
        sourceImageId: record.imageId,
        sourceImageUrl: record.imageUrl,
        originalSceneBrief: record.originalSceneBrief,
        originalRequestXml: record.originalRequestXml,
        resolvedSourcePrompt: record.resolvedPositivePrompt || '',
        highResMode: options?.highResModeOverride ?? record.highResMode ?? config.highResMode,
        status: 'preflight',
        createdAt: startedAt,
        attemptNumber: (record.attemptNumber || 0) + 1,
        triggerType: intent ? 'intent-regeneration' : 'reparse',
        candidateNumber: index + 1,
        candidateTotal: candidateCount,
        regenerationIntent: intent,
        replacementPreflightStatus: 'pending',
        selected: false,
      })))
    const summary: RelayBatchSummary = {
      slotsDiscovered: candidates.length, candidatesGenerated: 0, candidatesFailed: 0,
      candidatesSkipped: 0, replacementsSelected: 0, replacementsApplied: 0,
      existingImagesPreserved: candidates.filter(candidate => Boolean(candidate.sourceImageUrl)).length,
    }
    const batch: RelayCandidateBatch = {
      batchId, chatId, messageId: selectedMessage.id, swipeId: selectedSwipe, createdAt: startedAt,
      updatedAt: startedAt, mode, status: 'processing', candidateCount, intent, candidates, summary,
    }
    await mutateState(chatId, userId, stateToUpdate => {
      stateToUpdate.candidateBatches[batchId] = batch
      appendStateLog(stateToUpdate, {
        severity: 'info', stage: 'relay-batch-started', eventType: 'relay_batch_started', chatId,
        messageId: batch.messageId, swipeId: batch.swipeId,
        message: `Relay batch started for ${candidates.length} active image slot${candidates.length === 1 ? '' : 's'}.`,
        details: { batchId, mode },
      })
    })
    await sendState(userId, chatId)

    const targetIndex = Math.max(0, messages.findIndex(message => message.id === batch.messageId))
    for (const candidate of candidates) {
      try {
        const record = state.slots[candidate.stableSlotKey]
        const proseCandidatePending = record?.target === 'prose.illustration' && record.proseSynthetic === true && record.status === 'queued'
        if (!record || (!proseCandidatePending && isProcessing(record)) || relayProcessingKeys.has(record.key)) throw new ReplacementPreflightError('This slot is already processing.')
        relayProcessingKeys.add(record.key)
        await updateRelayCandidate(chatId, batchId, candidate.candidateKey, { status: 'parsing', replacementPreflightStatus: 'ready' }, userId)
        const result = await generateRelayCandidate(batch, candidate, record, messages, targetIndex, config, nativeSnapshot, userId)
        await updateRelayCandidate(chatId, batchId, candidate.candidateKey, {
          status: 'ready', candidateImageId: result.imageId, candidateImageUrl: result.imageUrl,
          newlyParsedPrompt: result.resolvedPositivePrompt, negativePrompt: result.resolvedNegativePrompt,
          provider: result.imageProvider, connection: result.imageConnectionName || result.imageConnectionId || '',
          model: result.imageModel, generationParameters: result.finalImageParameters || result.imageParameters || {},
          finalImageRequest: result.finalImageRequest, promptProfile: result.promptProfile, regenerationIntent: result.regenerationIntent, snapshot: result,
        }, userId)
        summary.candidatesGenerated += 1
        await sendState(userId, chatId)
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        const unavailable = error instanceof ReplacementPreflightError || /marker|swipe|message|original prompt metadata/i.test(message)
        await updateRelayCandidate(chatId, batchId, candidate.candidateKey, {
          status: unavailable ? 'unavailable' : 'failed',
          replacementPreflightStatus: unavailable ? 'missing-marker' : 'failed', error: message,
        }, userId)
        if (unavailable) summary.candidatesSkipped += 1
        else summary.candidatesFailed += 1
        await sendState(userId, chatId)
      } finally {
        relayProcessingKeys.delete(candidate.stableSlotKey)
      }
    }
    await mutateState(chatId, userId, stateToUpdate => {
      const stored = stateToUpdate.candidateBatches[batchId]
      if (!stored) return
      stored.status = 'review'
      stored.updatedAt = Date.now()
      stored.summary = { ...summary }
      appendStateLog(stateToUpdate, {
        severity: summary.candidatesFailed || summary.candidatesSkipped ? 'warning' : 'info',
        stage: 'relay-batch-completed', eventType: 'relay_batch_completed', chatId,
        messageId: stored.messageId, swipeId: stored.swipeId,
        message: `Relay batch complete: ${summary.candidatesGenerated} candidates ready; ${summary.candidatesFailed + summary.candidatesSkipped} skipped or failed.`,
        durationMs: Date.now() - startedAt, details: { batchId, summary },
      })
    })
    await sendState(userId, chatId)
    spindle.sendToFrontend({ type: 'relay_notice', level: summary.candidatesGenerated ? 'info' : 'warning', batchId, message: summary.candidatesGenerated ? 'Relay candidates are ready for review.' : 'Relay could not create any replacement candidates.' }, userId)
  } finally {
    relayBatchLocks.delete(chatId)
  }
}

async function generateRelayCandidate(
  batch: RelayCandidateBatch,
  candidate: RelayCandidate,
  record: SlotRecord,
  messages: ChatMessage[],
  targetIndex: number,
  config: RouterConfig,
  nativeSnapshot: NativeSettingsSnapshot | undefined,
  userId?: string,
): Promise<SlotGenerationResult> {
  const job = jobFromRecord(record)
  await assertPersonaPovDispatchAllowed(job, userId)
  job.regenerationIntent = candidate.regenerationIntent
  if (candidate.regenerationIntent?.aspectRatio) job.aspect = candidate.regenerationIntent.aspectRatio
  if (!(record.target === 'prose.illustration' && record.proseSynthetic === true && record.proseAnchor)) {
    await preflightJobReplacement(job)
  }
  const imagePlan = await prepareImagePlan(config, job, record, nativeSnapshot, userId, candidate.highResMode)
  validateImagePlan(imagePlan)
  const prepared = await parseSlotPrompt(job, candidate.slot, messages, targetIndex, config, userId, imagePlan.nativeImageSettings as NativeImageSettings, candidate.highResMode)
  enrichPromptPipelineWithImagePlan(prepared.promptPipeline, imagePlan, prepared.prompt, prepared.negativePrompt)
  const generated = await generateImage(job.chatId, prepared, imagePlan, userId, {
    chatId: job.chatId,
    generationId: candidate.candidateKey,
    source: 'relay-candidate',
    slotKey: candidate.stableSlotKey,
    requestId: candidate.requestId,
    addToGallery: false,
  })
  const attemptNumber = candidate.attemptNumber
  return {
    slot: candidate.slot,
    imageId: generated.imageId,
    imageIntent: job.intent,
    imageUrl: generated.imageUrl,
    imageWidth: generated.imageWidth,
    imageHeight: generated.imageHeight,
    aspectRatio: generated.aspectRatio,
    resolvedPositivePrompt: prepared.prompt,
    resolvedNegativePrompt: prepared.negativePrompt,
    promptMode: prepared.promptMode,
    promptPresetId: prepared.promptPresetId,
    parserUsed: prepared.parserUsed,
    parserOutput: prepared.parserOutput,
    parserConnectionId: prepared.parserConnectionId,
    parserModel: prepared.parserModel,
    parserParameters: prepared.parserParameters,
    promptPipeline: prepared.promptPipeline,
    imageConnectionId: generated.imageConnectionId,
    imageConnectionName: generated.imageConnectionName,
    imageProvider: generated.imageProvider,
    imageModel: generated.imageModel,
    imageParameters: generated.imageParameters,
    nativeImageSettings: generated.nativeImageSettings,
    nativeSettingsCapturedAt: generated.nativeSettingsCapturedAt,
    connectionDefaultParameters: generated.connectionDefaultParameters,
    slotOverrides: generated.slotOverrides,
    finalImageParameters: generated.finalImageParameters,
    finalImageRequest: generated.finalImageRequest,
    finalImageSettingsSource: generated.finalImageSettingsSource,
    nativeActiveLoraPreset: generated.nativeActiveLoraPreset,
    effectiveAppliedLoraPreset: generated.effectiveAppliedLoraPreset,
    lorasSentToProvider: generated.lorasSentToProvider,
    loraBaseTags: generated.loraBaseTags,
    baseTagsAddedToPrompt: generated.baseTagsAddedToPrompt,
    omittedBaseTags: generated.omittedBaseTags,
    highResMode: generated.highResMode,
    highResRetainedBaseTags: generated.highResRetainedBaseTags,
    highResPreservedFramingCues: generated.highResPreservedFramingCues,
    loraOmittedFields: generated.loraOmittedFields,
    galleryLinkStatus: generated.galleryLinkStatus,
    galleryItemId: generated.galleryItemId,
    galleryLinkError: generated.galleryLinkError,
    galleryLinkedAt: generated.galleryLinkStatus === 'linked' ? Date.now() : undefined,
    promptProfile: prepared.promptPipeline.promptProfile,
    regenerationIntent: candidate.regenerationIntent,
    diagnostic: createSlotDiagnostic(job, candidate.slot, prepared, generated, prepared.promptPipeline.promptProfile, candidate.regenerationIntent),
    includedContinuityFacts: prepared.promptPipeline.includedContinuityFacts,
    excludedContinuityFacts: prepared.promptPipeline.excludedContinuityFacts,
    continuityStrength: prepared.promptPipeline.continuityStrength,
    attemptNumber,
    triggerType: candidate.triggerType,
    generatedAt: Date.now(),
  }
}

async function updateRelayCandidate(chatId: string, batchId: string, candidateKey: string, patch: Partial<RelayCandidate>, userId?: string): Promise<void> {
  await mutateState(chatId, userId, state => {
    const batch = state.candidateBatches[batchId]
    const candidate = batch?.candidates.find(item => item.candidateKey === candidateKey)
    if (!batch || !candidate) return
    if (candidate.status === 'replaced') return
    if (candidate.status === 'discarded' && patch.status && patch.status !== 'parsing' && patch.status !== 'discarded') return
    Object.assign(candidate, patch)
    batch.updatedAt = Date.now()
    refreshRelayBatchStatus(batch)
  })
}

function refreshRelayBatchStatus(batch: RelayCandidateBatch): void {
  const terminal = new Set<RelayCandidate['status']>(['ready', 'failed', 'unavailable', 'replaced', 'discarded'])
  const finished = batch.candidates.every(candidate => terminal.has(candidate.status))
  const unresolved = batch.candidates.some(candidate => ['preflight', 'parsing', 'generating'].includes(candidate.status))
  if (batch.status === 'discarded' || batch.status === 'completed') return
  if (unresolved) batch.status = 'processing'
  else batch.status = finished ? 'review' : batch.status
}

function completeRelayBatchIfTerminal(batch: RelayCandidateBatch): void {
  const terminal = new Set<RelayCandidate['status']>(['replaced', 'discarded', 'failed', 'unavailable'])
  if (batch.candidates.every(candidate => terminal.has(candidate.status))) batch.status = 'completed'
  else if (batch.status !== 'discarded') batch.status = 'review'
}

async function replaceRelayCandidates(chatId: string, batchId: string, candidateKeys: string[], userId?: string): Promise<void> {
  const selected = new Set(candidateKeys)
  await mutateState(chatId, userId, async state => {
    const batch = state.candidateBatches[batchId]
    if (!batch || batch.chatId !== chatId || batch.status !== 'review') throw new Error('This Relay candidate batch is no longer available.')
    const message = await resolveMessage(batch.chatId, batch.messageId)
    if (!message) throw new Error('The original Relay message no longer exists.')
    let content = getSwipeContent(message, batch.swipeId)
    const originalContent = content
    const applied: string[] = []
    const skipped: string[] = []
    const winners = new Set<string>()
    for (const candidate of batch.candidates) {
      if (!selected.has(candidate.candidateKey) || candidate.status !== 'ready' || !candidate.snapshot) continue
      if (winners.has(candidate.stableSlotKey)) { skipped.push(`${candidate.slot} duplicate winner`); continue }
      winners.add(candidate.stableSlotKey)
      const record = state.slots[candidate.stableSlotKey]
      if (!record || record.messageId !== batch.messageId || record.swipeId !== batch.swipeId) { skipped.push(candidate.slot); continue }
      const job = jobFromRecord(record)
      const result = candidate.snapshot
      const replaced = replaceResolvedSlotAfterComment(content, job, result)
        || replaceErrorAfterComment(content, job, renderResolvedMarkup(job, [result]))
        || insertProseCandidateAtStoredAnchor(content, record, job, result)
      if (!replaced) { skipped.push(candidate.slot); continue }
      content = replaced
      const now = Date.now()
      record.attemptNumber = Math.max(record.attemptNumber || 0, candidate.attemptNumber)
      record.attempts ||= []
      record.attempts.push({ attemptNumber: record.attemptNumber, triggerType: 'reparse', startedAt: candidate.createdAt, parsingStartedAt: candidate.createdAt, generationStartedAt: candidate.createdAt, stage: 'image-generation' })
      applyGeneration(state, record, result, now)
      candidate.status = 'replaced'
      candidate.selected = true
      applied.push(candidate.slot)
    }
    if (content === originalContent) throw new Error('No selected Relay candidate still has an exact replaceable marker.')
    await patchSwipeContent(batch.chatId, message, batch.swipeId, content)
    batch.updatedAt = Date.now()
    completeRelayBatchIfTerminal(batch)
    batch.summary.replacementsSelected = selected.size
    batch.summary.replacementsApplied = (batch.summary.replacementsApplied || 0) + applied.length
    appendStateLog(state, {
      severity: skipped.length ? 'warning' : 'info', stage: 'relay-replacement-committed', eventType: 'relay_replacement_committed', chatId,
      messageId: batch.messageId, swipeId: batch.swipeId,
      message: `Applied ${applied.length} selected Relay replacement${applied.length === 1 ? '' : 's'}.`,
      details: { batchId, applied, skipped },
    })
  })
  await sendState(userId, chatId)
  spindle.sendToFrontend({ type: 'relay_notice', level: 'success', message: 'Selected Relay replacement was applied.', batchId }, userId)
}

async function discardRelayBatch(chatId: string, batchId: string, userId?: string): Promise<void> {
  await mutateState(chatId, userId, state => {
    const batch = state.candidateBatches[batchId]
    if (!batch) return
    batch.status = 'discarded'
    batch.updatedAt = Date.now()
    for (const candidate of batch.candidates) candidate.status = 'discarded'
    appendStateLog(state, {
      severity: 'info', stage: 'relay-candidates-discarded', eventType: 'relay_candidates_discarded', chatId,
      messageId: batch.messageId, swipeId: batch.swipeId, message: 'Temporary Relay candidates were discarded.', details: { batchId },
    })
  })
  await sendState(userId, chatId)
}

async function rescanChatForSlots(chatId: string, userId?: string, automatic = false, requestedIncludeInactive?: boolean): Promise<void> {
  const startedAt = Date.now()
  const lockKey = `${userId || 'default'}:${chatId}`
  if (rescanLocks.has(lockKey)) {
    const summary = emptyRescanSummary()
    spindle.sendToFrontend({ type: 'rescan_result', summary, automatic, alreadyRunning: true }, userId)
    return
  }
  rescanLocks.add(lockKey)
  try {
    const config = await getConfig(userId)
    const includeInactive = requestedIncludeInactive ?? config.includeInactiveSwipesInRescan
    const messages = (await spindle.chat.getMessages(chatId) as ChatMessage[]).filter(message => isAssistantMessage(message) && !isOwnMessage(message))
    // A rescan is also a reconciliation point. One Sidecar pass over the latest
    // assistant turn reconstructs current continuity from the complete history
    // without fan-out model calls for every historical message.
    const latestAssistant = messages.at(-1)
    if (latestAssistant) {
      const latestSwipe = activeSwipeId(latestAssistant)
      try {
        await ensureAppearanceReadyForTurn({ chatId, messageId: latestAssistant.id, swipeId: latestSwipe, content: getSwipeContent(latestAssistant, latestSwipe), userId, mode: 'reconcile', reason: 'explicit-rescan' })
      } catch (error) {
        await mutateState(chatId, userId, state => {
          state.continuityVault.appearanceSidecar.lastError = error instanceof Error ? error.message : String(error)
          appendStateLog(state, { severity: 'warning', stage: 'appearance-sidecar', eventType: 'appearance_sidecar_reconciliation_failed', chatId, messageId: latestAssistant.id, swipeId: latestSwipe, message: `Appearance Sidecar reconciliation fallback: ${state.continuityVault.appearanceSidecar.lastError}` })
        })
      }
    }
    const summary = emptyRescanSummary()
    const discoveries = new Map<string, RescanDiscovery>()
    const malformed: RescanMalformed[] = []
    const trace: Array<Record<string, unknown>> = []
    const scannedFingerprints = new Map<string, string>()
    const automaticallySuppressed: Array<{ messageId: string; swipeId: number; fingerprint: string }> = []
    const stateAtScanStart = await getState(chatId, userId)
    const discoveredAt = Date.now()
    summary.messagesScanned = messages.length

    for (const message of messages) {
      const activeSwipe = activeSwipeId(message)
      for (const row of selectRescanSwipeRows(message, includeInactive)) {
        const { swipeId, inactive } = row
        const content = normalizeRelaySurfaceContracts(row.content)
        if (content !== row.content) await patchSwipeContent(chatId, message, swipeId, content)
        const fingerprintKey = `${message.id}:${swipeId}`
        const fingerprint = contentFingerprint(content)
        scannedFingerprints.set(fingerprintKey, fingerprint)
        if (inactive) summary.inactiveSwipesScanned += 1
        else summary.activeSwipesScanned += 1
        if (config.debugLogging) trace.push({ messageId: message.id, swipeId, inactive, contentLength: content.length })
        if (automatic && stateAtScanStart.suppressedContentFingerprints[fingerprintKey] === fingerprint) {
          automaticallySuppressed.push({ messageId: message.id, swipeId, fingerprint })
          continue
        }

        const requests = parseSafeSurfaceImageRequests(content)
        summary.unresolvedRequestsFound += requests.length
        const rawTags = inspectRawImageRequestTags(content)
        const malformedRaw = Math.max(0, (content.match(/<image_request\b/gi)?.length || 0) - requests.length)
        if (malformedRaw) {
          summary.malformedSources += malformedRaw
          malformed.push({
            messageId: message.id, swipeId, requestId: rawTags.find(tag => tag.id)?.id,
            message: `${malformedRaw} malformed or unsupported image request${malformedRaw === 1 ? '' : 's'} found; no broken slot was registered.`,
            details: { rawTags, rawSource: compact(content, 4000) },
          })
        }
        for (const request of requests) {
          for (const slot of slotsForRequest(request)) {
            const key = slotKey({ chatId, messageId: message.id, swipeId, requestId: request.id, slot })
            discoveries.set(key, {
              key, kind: 'pending', record: {
                key, chatId, messageId: message.id, swipeId, requestId: request.id, target: request.target,
                targetApp: targetApp(request.target), slot, status: 'recovered-pending',
                originalSceneBrief: request.prompt, originalNegativePrompt: request.negative || '', originalRequestXml: request.fullMatch,
                alt: request.alt || '', caption: request.caption, time: request.time, count: request.count, requestAspect: request.aspect,
                createdAt: discoveredAt, discoveredAt, registeredAt: discoveredAt, recoveredAt: discoveredAt,
                recoverySource: 'unresolved-request', recoveryCompleteness: 'full', missingRecoveryFields: [],
                recoveredFromInactiveSwipe: inactive, activeSwipeAtRecovery: activeSwipe, updatedAt: discoveredAt,
                highResMode: config.highResMode, attempts: [],
                selectedPromptProfileId: effectiveGenerationProfile(config, chatId).defaultPromptProfileId,
                promptPipeline: emptyPromptPipeline({ caption: request.caption, originalNegativePrompt: request.negative || '' }), history: [],
              },
            })
          }
        }

        const markers = parseRouterMarkers(content)
        const markerCounts = new Map<string, number>()
        for (const marker of markers.filter(marker => marker.valid && marker.target)) {
          const group = `${marker.requestId}:${marker.target}`
          markerCounts.set(group, (markerCounts.get(group) || 0) + 1)
        }
        for (const marker of markers) {
          if (!marker.valid || !marker.target) {
            summary.malformedSources += 1
            malformed.push({
              messageId: message.id, swipeId, requestId: marker.requestId || undefined, slot: marker.slot || undefined,
              message: `Malformed Relay marker was skipped: ${marker.reason || 'unknown marker error'}.`,
              details: { marker, rawSource: compact(content, 4000) },
            })
            continue
          }
          if (marker.kind === 'resolved') summary.resolvedMarkersFound += 1
          else summary.errorMarkersFound += 1
          const key = slotKey({ chatId, messageId: message.id, swipeId, requestId: marker.requestId, slot: marker.slot })
          const count = marker.target === 'instagram.carousel' ? Math.max(1, markerCounts.get(`${marker.requestId}:${marker.target}`) || 1) : 1
          const imageAvailable = marker.kind === 'resolved' ? await isStoredImageAvailable(marker.imageId, userId) : false
          const status = marker.kind === 'resolved' ? (imageAvailable ? 'completed' : 'image-unavailable') : 'failed'
          discoveries.set(key, {
            key, kind: marker.kind === 'resolved' ? (imageAvailable ? 'completed' : 'unavailable') : 'failed', record: {
              key, chatId, messageId: message.id, swipeId, requestId: marker.requestId, target: marker.target,
              targetApp: targetApp(marker.target), slot: marker.slot, status,
              originalSceneBrief: '', originalNegativePrompt: '', originalRequestXml: '', alt: marker.alt, count,
              createdAt: discoveredAt, discoveredAt, registeredAt: discoveredAt, recoveredAt: discoveredAt,
              recoverySource: marker.kind === 'resolved' ? 'resolved-marker' : 'error-marker',
              recoveryCompleteness: 'marker-only',
              missingRecoveryFields: ['originalSceneBrief', 'originalRequestXml', 'resolvedPrompt', 'generationSettings', 'parserOutput', 'attempts', 'history'],
              recoveredFromInactiveSwipe: inactive, activeSwipeAtRecovery: activeSwipe, updatedAt: discoveredAt,
              completedAt: marker.kind === 'resolved' ? discoveredAt : undefined, failedAt: marker.kind === 'failed' ? discoveredAt : undefined,
              error: marker.kind === 'failed' ? marker.error || 'Recovered failed Relay request.' : undefined,
              imageId: marker.imageId || undefined, imageUrl: marker.imageUrl || undefined,
              imageAvailability: marker.kind === 'resolved' ? (imageAvailable ? 'available' : 'missing') : 'unchecked',
              imageAvailabilityCheckedAt: marker.kind === 'resolved' ? discoveredAt : undefined,
              selectedPromptProfileId: effectiveGenerationProfile(config, chatId).defaultPromptProfileId,
              orphaned: marker.kind === 'resolved' && !imageAvailable ? true : undefined,
              orphanReason: marker.kind === 'resolved' && !imageAvailable ? 'The resolved marker references an image asset that is no longer available.' : undefined,
              attempts: [], promptPipeline: emptyPromptPipeline(), history: [],
            },
          })
        }
      }
    }

    await mutateState(chatId, userId, state => {
      for (const [key, fingerprint] of scannedFingerprints) {
        const suppressed = state.suppressedContentFingerprints[key]
        if (!suppressed) continue
        if (!automatic || suppressed !== fingerprint) delete state.suppressedContentFingerprints[key]
      }
      appendStateLog(state, {
        severity: 'info', stage: 'chat-rescan-started', eventType: 'chat_rescan_started', chatId,
        message: automatic ? 'Automatic active-swipe chat rescan started.' : `Manual chat rescan started${includeInactive ? ' with inactive swipes' : ' for active swipes'}.`,
        details: config.debugLogging ? { trace } : { includeInactive },
      })
      for (const skipped of automaticallySuppressed) appendStateLog(state, {
        severity: 'debug', stage: 'chat-rescan-slot-skipped', eventType: 'chat_rescan_slot_skipped', chatId,
        messageId: skipped.messageId, swipeId: skipped.swipeId,
        message: 'Automatic rescan skipped unchanged message content that was explicitly removed by Clear All.',
        details: { reason: 'clear-all-suppressed-fingerprint', fingerprint: skipped.fingerprint },
      })
      const merged = mergeMissingSlotRecords(state.slots, [...discoveries.values()].map(item => item.record))
      summary.existingSlotsSkipped += merged.skipped.length
      for (const discovery of merged.skipped) {
        const inspected = discoveries.get(discovery.key)?.record
        const current = state.slots[discovery.key]
        if (!inspected || !current || inspected.recoverySource !== 'resolved-marker') continue
        current.imageAvailability = inspected.imageAvailability
        current.imageAvailabilityCheckedAt = inspected.imageAvailabilityCheckedAt
        if (inspected.imageAvailability === 'missing' && current.status === 'completed') {
          current.status = 'image-unavailable'
          current.orphaned = true
          current.orphanReason = inspected.orphanReason
          current.updatedAt = discoveredAt
          summary.imageUnavailable += 1
        }
      }
      if (config.debugLogging) for (const record of merged.skipped) appendStateLog(state, {
            severity: 'debug', stage: 'chat-rescan-slot-skipped', eventType: 'chat_rescan_slot_skipped', chatId,
            messageId: record.messageId, swipeId: record.swipeId, requestId: record.requestId,
            slot: record.slot, target: record.target, message: 'Latest state already contains this stable slot key; no fields were changed.',
          })
      for (const record of merged.added) {
        const item = discoveries.get(record.key)!
        summary.recoveredKeys.push(item.key)
        if (item.kind === 'pending') summary.recoveredPending += 1
        else if (item.kind === 'completed') summary.recoveredCompleted += 1
        else if (item.kind === 'unavailable') summary.imageUnavailable += 1
        else summary.recoveredFailed += 1
        if (item.record.recoveredFromInactiveSwipe) summary.inactiveRecordsRecovered += 1
        appendStateLog(state, {
          severity: item.kind === 'failed' || item.kind === 'unavailable' ? 'warning' : 'info', stage: 'chat-rescan-slot-recovered', eventType: 'chat_rescan_slot_recovered', chatId,
          messageId: item.record.messageId, swipeId: item.record.swipeId, requestId: item.record.requestId,
          slot: item.record.slot, target: item.record.target, statusAfter: item.record.status,
          message: item.kind === 'pending' ? 'Recovered missing unresolved slot without starting generation.'
            : item.kind === 'completed' ? 'Recovered completed image from its stable message marker.'
              : item.kind === 'unavailable' ? 'Recovered a stable marker whose image asset is unavailable; generation was not started.'
              : 'Recovered failed request from its stable error marker without retrying.',
          details: { recoverySource: item.record.recoverySource, recoveryCompleteness: item.record.recoveryCompleteness, inactiveSwipe: item.record.recoveredFromInactiveSwipe },
        })
      }
      for (const warning of malformed) appendStateLog(state, {
        severity: 'warning', stage: 'chat-rescan-malformed', eventType: 'chat_rescan_malformed', chatId,
        messageId: warning.messageId, swipeId: warning.swipeId, requestId: warning.requestId, slot: warning.slot,
        message: warning.message, details: warning.details,
      })
      summary.durationMs = Date.now() - startedAt
      const recovered = rescanRecoveredCount(summary)
      appendStateLog(state, {
        severity: summary.malformedSources ? 'warning' : 'info', stage: 'chat-rescan-completed', eventType: 'chat_rescan_completed', chatId,
        message: recovered ? `Chat rescan completed: ${recovered} missing slot${recovered === 1 ? '' : 's'} recovered.` : 'Chat rescan completed with no missing slots.',
        durationMs: summary.durationMs, details: summary,
      })
    })
    await sendState(userId, chatId)
    spindle.sendToFrontend({ type: 'rescan_result', summary, automatic }, userId)
  } finally {
    rescanLocks.delete(lockKey)
  }
}

async function isStoredImageAvailable(imageId: string, userId?: string): Promise<boolean> {
  if (!imageId) return false
  try {
    return Boolean(await spindle.images.get(imageId, { userId }))
  } catch (error) {
    spindle.log.warn(`[Reverie Relay:image-availability] ${error instanceof Error ? error.message : String(error)}`)
    return false
  }
}

function emptyRescanSummary(): ChatRescanSummary {
  return {
    messagesScanned: 0, activeSwipesScanned: 0, inactiveSwipesScanned: 0,
    unresolvedRequestsFound: 0, resolvedMarkersFound: 0, errorMarkersFound: 0,
    existingSlotsSkipped: 0, recoveredPending: 0, recoveredCompleted: 0,
    recoveredFailed: 0, imageUnavailable: 0, malformedSources: 0, inactiveRecordsRecovered: 0,
    durationMs: 0, recoveredKeys: [],
  }
}

function rescanRecoveredCount(summary: ChatRescanSummary): number {
  return summary.recoveredPending + summary.recoveredCompleted + summary.recoveredFailed + summary.imageUnavailable
}

function activeSwipeId(message: ChatMessage): number {
  const max = Array.isArray(message.swipes) && message.swipes.length ? message.swipes.length - 1 : Number.MAX_SAFE_INTEGER
  return Math.max(0, Math.min(max, Number.isFinite(Number(message.swipe_id)) ? Number(message.swipe_id) : 0))
}

async function generateRecoveredSlot(key: string, nativeSnapshot?: NativeSettingsSnapshot, userId?: string): Promise<void> {
  const initial = await getRecordByKey(key, userId)
  await reconcileChatState(initial.chatId, userId)
  const { chatId, state, record } = await getRecordByKey(key, userId)
  if (record.status !== 'recovered-pending') {
    if (record.status === 'completed' || record.status === 'placement-pending') {
      spindle.sendToFrontend({ type: 'relay_notice', level: 'info', message: 'That recovered slot has already finished.' }, userId)
      await sendState(userId, chatId)
      return
    }
    throw new Error('Recovered slot is no longer pending generation.')
  }
  if (!canReparseRecord(record)) throw new Error('Recovered request source is incomplete. Rebuild the request before generation.')
  const config = await getConfig(userId)
  const effectiveSnapshot = nativeSnapshot || nativeSnapshotFromConfig(config)
  cancelledJobs.delete(jobCancellationKey(record))
  relayProcessingKeys.delete(record.key)
  if (isRecordJobActive(record)) {
    scheduleDeferredReparse(key, effectiveSnapshot, userId)
    spindle.sendToFrontend({ type: 'relay_notice', level: 'info', message: 'Recovery is queued and will resume when the interrupted provider call releases this slot.' }, userId)
    await sendState(userId, chatId)
    return
  }
  if (config.slotGenerationMode === 'prompt-preview') {
    await previewReparse(key, userId, effectiveSnapshot)
    return
  }
  const candidates = Object.values(state.slots).filter(candidate =>
    candidate.chatId === chatId && candidate.status === 'recovered-pending' && candidate.messageId === record.messageId
    && candidate.swipeId === record.swipeId && candidate.requestId === record.requestId,
  )
  const job = groupFailedRetryJobs(candidates)[0]
  if (!job) throw new Error('Could not reconstruct the recovered request.')
  await runJob(job, { replaceExisting: false, reparse: true, triggerType: 'retry', nativeSnapshot: effectiveSnapshot }, userId)
  await sendState(userId, chatId)
}

async function generateAllRecovered(chatId: string, nativeSnapshot?: NativeSettingsSnapshot, userId?: string): Promise<void> {
  await reconcileChatState(chatId, userId)
  const state = await getState(chatId, userId)
  const pending = Object.values(state.slots).filter(record => record.chatId === chatId && record.status === 'recovered-pending' && canReparseRecord(record) && !record.orphaned)
  if (!pending.length) {
    spindle.sendToFrontend({ type: 'relay_notice', level: 'info', message: 'No recovered Relay slots are waiting for generation.' }, userId)
    await sendState(userId, chatId)
    return
  }
  const config = await getConfig(userId)
  const effectiveSnapshot = nativeSnapshot || nativeSnapshotFromConfig(config)
  for (const record of pending) {
    cancelledJobs.delete(jobCancellationKey(record))
    relayProcessingKeys.delete(record.key)
  }
  if (config.slotGenerationMode === 'prompt-preview') {
    let previewed = 0
    spindle.sendToFrontend({ type: 'status', status: `Preparing recovered prompts 0 / ${pending.length}…` }, userId)
    for (const record of pending) {
      await previewReparse(record.key, userId, effectiveSnapshot)
      previewed += 1
      spindle.sendToFrontend({ type: 'status', status: `Preparing recovered prompts ${previewed} / ${pending.length}…` }, userId)
    }
    spindle.sendToFrontend({ type: 'relay_notice', level: 'success', message: `Prepared ${previewed} recovered prompt preview${previewed === 1 ? '' : 's'}.` }, userId)
    await sendState(userId, chatId)
    return
  }
  const jobs = groupFailedRetryJobs(pending)
  let completed = 0
  spindle.sendToFrontend({ type: 'status', status: `Resuming recovered slots 0 / ${jobs.length}…` }, userId)
  await runWithConcurrency(jobs, config.queueConcurrencyLimit, async job => {
    await runJob(job, { replaceExisting: false, reparse: true, triggerType: 'retry', nativeSnapshot: effectiveSnapshot }, userId)
    completed += 1
    spindle.sendToFrontend({ type: 'status', status: `Resuming recovered slots ${completed} / ${jobs.length}…` }, userId)
  })
  spindle.sendToFrontend({ type: 'relay_notice', level: 'success', message: `Recovery run finished for ${completed} job${completed === 1 ? '' : 's'}.` }, userId)
  await sendState(userId, chatId)
}

async function rebuildRequest(payload: Extract<FrontendMessage, { type: 'rebuild_request' }>, userId?: string): Promise<void> {
  const sceneBrief = payload.sceneBrief.trim()
  if (!sceneBrief) throw new Error('Scene brief cannot be empty.')
  const { chatId, record } = await getRecordByKey(payload.key, userId)
  if (isProcessing(record)) throw new Error('This slot is already processing.')
  const reconstructedAt = Date.now()
  record.imageIntent = normalizeImageIntent(payload.imageIntent ?? record.imageIntent)
  const requestXml = renderReconstructedRequest(record, sceneBrief, payload.negativePrompt.trim(), payload.aspect?.trim())
  const message = await resolveMessage(record.chatId, record.messageId)
  if (!message) throw new ReplacementPreflightError('The original message no longer exists, so Reverie Relay cannot rebuild its raw slot anchor.')
  const content = getSwipeContent(message, record.swipeId)
  const anchor = rebuildRawSlotAnchor(content, record, requestXml)
  if (!anchor) throw new ReplacementPreflightError('No unique raw request, Relay marker, error marker, or target image anchor was found. The message was left unchanged.')
  if (anchor.content !== content) await patchSwipeContent(chatId, message, record.swipeId, anchor.content)
  const verifiedMessage = await resolveMessage(record.chatId, record.messageId)
  const verifiedContent = verifiedMessage ? getSwipeContent(verifiedMessage, record.swipeId) : ''
  const exactMarkers = slotCommentVariants(record, record.slot)
  if (!verifiedContent.includes(requestXml) && !exactMarkers.some(marker => verifiedContent.includes(marker))) {
    throw new ReplacementPreflightError('The rebuilt raw slot anchor could not be verified after saving. Relay state was not changed.')
  }
  await mutateState(chatId, userId, state => {
    const stored = state.slots[payload.key]
    if (!stored) throw new Error('Slot not found.')
    stored.originalSceneBrief = sceneBrief
    stored.originalNegativePrompt = payload.negativePrompt.trim()
    stored.originalRequestXml = requestXml
    stored.requestAspect = payload.aspect?.trim() || undefined
    stored.imageIntent = normalizeImageIntent(payload.imageIntent ?? stored.imageIntent)
    stored.highResMode = payload.highResMode
    stored.recoveryCompleteness = 'reconstructed'
    stored.missingRecoveryFields = ['resolvedPrompt', 'generationSettings', 'parserOutput', 'attempts', 'history'].filter(field => {
      if (field === 'resolvedPrompt') return !stored.resolvedPositivePrompt
      if (field === 'generationSettings') return !stored.finalImageParameters
      if (field === 'parserOutput') return !stored.parserOutput
      if (field === 'attempts') return !stored.attempts?.length
      return !stored.history.length
    })
    stored.reconstructedAt = reconstructedAt
    stored.reconstructionSource = 'user-edited-alt'
    stored.updatedAt = reconstructedAt
    appendStateLog(state, {
      severity: 'info', stage: 'request-reconstructed', eventType: 'request_reconstructed', chatId,
      messageId: stored.messageId, swipeId: stored.swipeId, requestId: stored.requestId, slot: stored.slot, target: stored.target,
      message: payload.generate ? 'Reconstructed request saved; replacement preflight will run before generation.' : 'Reconstructed request saved without generation.',
      details: { reconstructionSource: stored.reconstructionSource, highResMode: stored.highResMode, rawAnchorMode: anchor.mode },
    })
  })
  await sendState(userId, chatId)
  if (!payload.generate) return
  const latest = (await getState(chatId, userId)).slots[payload.key]
  if (!latest) throw new Error('Slot not found after reconstruction.')
  const job = jobFromRecord(latest)
  await runJob(job, {
    replaceExisting: Boolean(latest.imageUrl), reparse: true, triggerType: 'reparse',
    nativeSnapshot: snapshotFromPayload(payload), highResMode: payload.highResMode,
  }, userId)
}

function renderReconstructedRequest(record: SlotRecord, sceneBrief: string, negativePrompt: string, aspect?: string): string {
  const attrs = [
    `id="${escapeXml(record.requestId)}"`, `target="${escapeXml(record.target)}"`,
    `slot="${escapeXml(record.slot)}"`, `count="${Math.max(1, record.count || 1)}"`,
    aspect ? `aspect="${escapeXml(aspect)}"` : '', normalizeImageIntent(record.imageIntent) !== 'auto' ? `intent="${escapeXml(normalizeImageIntent(record.imageIntent))}"` : '', record.alt ? `alt="${escapeXml(record.alt)}"` : '',
  ].filter(Boolean).join(' ')
  const negative = negativePrompt ? `\n  <negative>${escapeXml(negativePrompt)}</negative>` : ''
  return `<image_request ${attrs}>\n  <scene_brief>${escapeXml(sceneBrief)}</scene_brief>${negative}\n</image_request>`
}

function escapeXml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

async function reconcileChatState(chatId: string, userId?: string, onlyMessageId?: string, suppliedMessage?: ChatMessage): Promise<ReconciliationSummary> {
  const config = await getConfig(userId)
  const messages = suppliedMessage ? [suppliedMessage] : await spindle.chat.getMessages(chatId) as ChatMessage[]
  const byId = new Map(messages.map(message => [message.id, message]))
  return mutateState(chatId, userId, state => {
    let changed = false
    const summary: ReconciliationSummary = {
    checked: 0, valid: 0, orphanedFound: 0, orphanedRemoved: 0, deletedMessageRemoved: 0,
    deletedSwipeRemoved: 0, malformed: 0, retainedForManualReview: 0, reconciledAt: Date.now(),
  }

    for (const [key, record] of Object.entries({ ...state.slots })) {
    if (onlyMessageId && record.messageId !== onlyMessageId) continue
    summary.checked += 1
    if (!record.requestId || !record.slot || (!record.originalRequestXml && record.recoverySource === 'unresolved-request')) summary.malformed += 1
    const message = byId.get(record.messageId)
    if (!message) {
      removeSlotRecords(state, [record])
      changed = true
      summary.deletedMessageRemoved += 1
      summary.orphanedRemoved += 1
      continue
    }
    if (isProcessing(record)) {
      summary.valid += 1
      continue
    }
    const swipes = Array.isArray(message.swipes) && message.swipes.length ? message.swipes : [message.content]
    const recordedContent = swipes[record.swipeId]
    const matchingSwipe = recordedContent && hasRouterMarker(recordedContent, record)
      ? record.swipeId
      : swipes.findIndex(content => Boolean(content) && (slotCommentVariants(record, record.slot).some(marker => content!.includes(marker)) || errorCommentVariants(record, record.slot).some(marker => content!.includes(marker))))
    if (matchingSwipe >= 0) {
      if (record.swipeId !== matchingSwipe) {
        delete state.slots[key]
        record.swipeId = matchingSwipe
        record.key = slotKey(record)
        state.slots[record.key] = record
        changed = true
      }
      if (record.imageAvailability !== 'missing') {
        if (record.orphaned || record.orphanReason) changed = true
        record.orphaned = false
        record.orphanReason = undefined
      }
      summary.valid += 1
      continue
    }
    const orphanReason = 'Relay request or result marker is no longer present in the stored swipe content.'
    if (!record.orphaned || record.orphanReason !== orphanReason) {
      record.orphaned = true
      record.orphanReason = orphanReason
      record.updatedAt = Date.now()
      changed = true
    }
    summary.orphanedFound += 1
    summary.retainedForManualReview += 1
    }

    let removedOpportunities = 0
    let removedPlans = 0
    for (const [id, opportunity] of Object.entries({ ...state.proseIllustrator.opportunities })) {
      if (opportunity.chatId !== chatId || (onlyMessageId && opportunity.messageId !== onlyMessageId)) continue
      const sourceMessage = byId.get(opportunity.messageId)
      const swipes = sourceMessage ? (Array.isArray(sourceMessage.swipes) && sourceMessage.swipes.length ? sourceMessage.swipes : [sourceMessage.content]) : []
      const content = swipes[opportunity.swipeId]
      if (sourceMessage && typeof content === 'string' && contentFingerprint(content) === opportunity.sourceContentFingerprint) continue
      delete state.proseIllustrator.opportunities[id]
      removedOpportunities += 1
      changed = true
    }
    for (const [id, plan] of Object.entries({ ...state.proseIllustrator.plans })) {
      if (plan.chatId !== chatId || (onlyMessageId && plan.messageId !== onlyMessageId)) continue
      const sourceMessage = byId.get(plan.messageId)
      const swipes = sourceMessage ? (Array.isArray(sourceMessage.swipes) && sourceMessage.swipes.length ? sourceMessage.swipes : [sourceMessage.content]) : []
      if (sourceMessage && typeof swipes[plan.swipeId] === 'string') continue
      const hasCompletedRecord = Object.values(state.proseIllustrator.records).some(record => record.planId === id && ['completed', 'ready-to-place'].includes(record.status))
      if (hasCompletedRecord) continue
      delete state.proseIllustrator.plans[id]
      removedPlans += 1
      changed = true
    }
    if (removedOpportunities || removedPlans) {
      const activeOpportunityId = state.proseIllustrator.activeOpportunityIdByChat[chatId]
      if (activeOpportunityId && !state.proseIllustrator.opportunities[activeOpportunityId]) delete state.proseIllustrator.activeOpportunityIdByChat[chatId]
      const activePlanId = state.proseIllustrator.activePlanIdByChat[chatId]
      if (activePlanId && !state.proseIllustrator.plans[activePlanId]) delete state.proseIllustrator.activePlanIdByChat[chatId]
      appendStateLog(state, {
        severity: 'info', stage: 'prose-opportunity-cleanup', eventType: 'stale_prose_state_removed', chatId,
        message: `Removed ${removedOpportunities} stale scene opportunit${removedOpportunities === 1 ? 'y' : 'ies'} and ${removedPlans} unusable plan${removedPlans === 1 ? '' : 's'} during reconciliation.`,
        details: { removedOpportunities, removedPlans, onlyMessageId: onlyMessageId || null },
      })
    }

    state.lastReconciledAt = summary.reconciledAt
    state.lastReconciliation = summary
    if (changed || config.debugLogging) appendStateLog(state, {
      severity: summary.orphanedFound ? 'warning' : 'info', stage: 'state-reconciliation', eventType: 'state_reconciled', chatId,
      message: `Checked ${summary.checked} Relay records: ${summary.valid} valid, ${summary.orphanedFound} retained for review.`, details: { ...summary, changed },
    })
    return summary
  })
}

function hasRouterMarker(content: string, record: SlotRecord): boolean {
  if (slotCommentVariants(record, record.slot).some(marker => content.includes(marker)) || errorCommentVariants(record, record.slot).some(marker => content.includes(marker))) return true
  return Boolean(record.originalRequestXml && content.includes(record.originalRequestXml))
}

function removeSlotRecords(state: StateFile, records: SlotRecord[]): void {
  for (const record of records) {
    delete state.slots[record.key]
    if (isRecordJobActive(record)) {
      cancelledJobs.add(jobCancellationKey(record))
      const now = Date.now()
      for (const sibling of Object.values(state.slots).filter(candidate => jobCancellationKey(candidate) === jobCancellationKey(record) && isProcessing(candidate))) {
        sibling.status = 'cancelled'
        sibling.cancelledAt = now
        sibling.updatedAt = now
        finishAttempt(sibling, 'cancelled', now, 'Cancelled because Relay state was removed while the job was active.')
      }
    }
  }
}

function isRecordJobActive(record: SlotRecord): boolean {
  const prefix = `${record.chatId}:${record.messageId}:${record.swipeId}:${record.requestId}:`
  return [...slotLocks].some(lock => lock.startsWith(prefix)) ||
    [...messageLocks].some(lock => lock.startsWith(`${record.chatId}:${record.messageId}:`))
}

function jobCancellationKey(job: Pick<RouterJob, 'chatId' | 'messageId' | 'swipeId' | 'requestId'>): string {
  return `${job.chatId}:${job.messageId}:${job.swipeId}:${job.requestId}`
}

function isJobCancelled(job: RouterJob): boolean {
  return cancelledJobs.has(jobCancellationKey(job))
}

async function cleanupState(payload: Extract<FrontendMessage, { type: 'cleanup' }>, userId?: string): Promise<void> {
  const before = await getState(payload.chatId, userId)
  let beforeSelected = Object.values(before.slots)
  if (payload.scope === 'slot') beforeSelected = payload.key && before.slots[payload.key] ? [before.slots[payload.key]] : []
  if (payload.scope === 'message') beforeSelected = beforeSelected.filter(record => record.messageId === payload.messageId)
  for (const record of beforeSelected.filter(isRecordJobActive)) cancelledJobs.add(jobCancellationKey(record))
  let clearedFingerprints: Record<string, string> = {}
  if (payload.action === 'clear_all' && payload.scope === 'chat') {
    const messages = await spindle.chat.getMessages(payload.chatId) as ChatMessage[]
    for (const message of messages.filter(message => isAssistantMessage(message) && !isOwnMessage(message))) {
      for (const row of selectRescanSwipeRows(message, true)) clearedFingerprints[`${message.id}:${row.swipeId}`] = contentFingerprint(row.content)
    }
    for (const key of [...pendingGenerationContent.keys()]) if (key.startsWith(`${payload.chatId}:`)) pendingGenerationContent.delete(key)
    for (const [key, scheduled] of [...scheduledAssistantScans.entries()]) {
      if (!key.startsWith(`${payload.chatId}:`)) continue
      if (scheduled.timer) clearTimeout(scheduled.timer)
      scheduledAssistantScans.delete(key)
    }
    for (const key of [...deferredScans.keys()]) if (key.startsWith(`${payload.chatId}:`)) deferredScans.delete(key)
  }
  await mutateState(payload.chatId, userId, state => {
    let selected = Object.values(state.slots)
    if (payload.scope === 'slot') selected = payload.key && state.slots[payload.key] ? [state.slots[payload.key]] : []
    if (payload.scope === 'message') selected = selected.filter(record => record.messageId === payload.messageId)
    if (payload.action === 'clear_error') {
      for (const record of selected) {
        record.error = undefined; record.errorToastKey = undefined
        if (record.status === 'failed') record.status = record.imageUrl ? 'completed' : 'cancelled'
        record.updatedAt = Date.now()
        appendStateLog(state, { severity: 'info', stage: 'manual-cleanup', eventType: 'error_cleared', chatId: payload.chatId, messageId: record.messageId, swipeId: record.swipeId, requestId: record.requestId, slot: record.slot, target: record.target, message: 'Cleared slot error state.' })
      }
    } else if (payload.action === 'clear_failed') removeSlotRecords(state, selected.filter(record => record.status === 'failed'))
    else if (payload.action === 'clear_completed') removeSlotRecords(state, selected.filter(record => record.status === 'completed'))
    else if (payload.action === 'clear_cancelled') removeSlotRecords(state, selected.filter(record => record.status === 'cancelled'))
    else if (payload.action === 'clear_orphaned') removeSlotRecords(state, selected.filter(record => record.orphaned))
    else if (payload.action === 'clear_all') {
      if (payload.scope === 'chat') {
        state.slots = {}
        state.candidateBatches = {}
        state.clearedAt = Date.now()
        state.suppressedContentFingerprints = clearedFingerprints
      } else removeSlotRecords(state, selected)
    }
    else if (payload.action === 'clear_logs') state.logs = []
    else removeSlotRecords(state, selected)
    appendStateLog(state, {
      severity: 'info', stage: 'manual-cleanup', eventType: 'manual_cleanup', chatId: payload.chatId,
      message: `Manual cleanup: ${payload.action}. Relay metadata only; message content and generated assets were not deleted.`,
    })
  })
  await sendState(userId, payload.chatId)
}

async function previewReparse(key: string, userId?: string, nativeSnapshot?: NativeSettingsSnapshot): Promise<void> {
  const { chatId, record } = await getRecordByKey(key, userId)
  if (!canReparseRecord(record)) throw new Error('Original request metadata was not available when this slot was recovered. Rebuild the request first.')
  if ((record.status === 'parsing' || record.status === 'generating') && relayProcessingKeys.has(record.key)) throw new Error('This slot is already processing.')
  const config = await getConfig(userId)
  const job = jobFromRecord(record)
  await assertPersonaPovDispatchAllowed(job, userId)
  const messages = await spindle.chat.getMessages(chatId) as ChatMessage[]
  const targetIndex = Math.max(0, messages.findIndex(message => message.id === record.messageId))
  const effectiveSnapshot = nativeSnapshot || nativeSnapshotFromConfig(config)
  const prepared = await parseSlotPrompt(job, record.slot, messages, targetIndex, config, userId, effectiveSnapshot?.settings, config.highResMode, true)
  await mutateState(chatId, userId, state => {
    if (!state.slots[key]) return
    appendStateLog(state, {
      severity: 'info', stage: 'reparse-preview', eventType: 'reparse_preview', chatId, messageId: record.messageId, swipeId: record.swipeId,
      requestId: record.requestId, slot: record.slot, target: record.target, message: 'Reparse preview completed without image generation.',
    })
  })
  spindle.sendToFrontend({ type: 'reparse_preview', key, prompt: prepared.prompt, negativePrompt: prepared.negativePrompt, pipeline: prepared.promptPipeline }, userId)
  await sendState(userId, chatId)
}

async function logPreviewAction(key: string, action: 'accepted' | 'cancelled', userId?: string): Promise<void> {
  const { chatId, record } = await getRecordByKey(key, userId)
  await mutateState(chatId, userId, state => appendStateLog(state, {
    severity: 'info', stage: 'reparse-preview', eventType: `reparse_preview_${action}`, chatId,
    messageId: record.messageId, swipeId: record.swipeId, requestId: record.requestId, slot: record.slot,
    target: record.target, message: `Reparse preview ${action}.`,
  }))
}

async function runInstallationSelfTest(chatId: string | undefined, frontendBuildId: string | undefined, frontendLoadedAt: number | undefined, nativeSettingsAvailable: boolean | undefined, userId?: string): Promise<void> {
  const checks: RelayHealthCheck[] = []
  try { await spindle.userStorage.getJson(CONFIG_PATH, { fallback: {}, userId }); checks.push(healthCheck('config-storage', 'Configuration storage', 'core', true, 'ok')) } catch (error) { checks.push(healthCheck('config-storage', 'Configuration storage', 'core', false, String(error))) }
  try { await spindle.userStorage.getJson('state.json', { userId }); checks.push(healthCheck('state-storage', 'Relay state storage', 'core', true, 'available; no Relay Health Check file created')) } catch (error) { checks.push(healthCheck('state-storage', 'Relay state storage', 'core', false, String(error))) }
  const state = chatId ? await getState(chatId, userId) : emptyState()
  checks.push(healthCheck('state-list', 'Relay state list', 'core', true, `${Object.keys(state.slots).length} slots`))
  checks.push(healthCheck('active-chat', 'Active chat', 'optional', Boolean(chatId), chatId || 'no active chat'))
  if (chatId) {
    try { await spindle.chats.get(chatId, userId); checks.push(healthCheck('active-chat-read', 'Active chat read', 'core', true, 'ok')) } catch (error) { checks.push(healthCheck('active-chat-read', 'Active chat read', 'core', false, String(error))) }
    try { const messages = await spindle.chat.getMessages(chatId); checks.push(healthCheck('message-listing', 'Message listing', 'core', true, `${messages.length} messages`)) } catch (error) { checks.push(healthCheck('message-listing', 'Message listing', 'core', false, String(error))) }
  }
  checks.push(healthCheck('native-settings', 'Native settings snapshot', 'optional', nativeSettingsAvailable === true, nativeSettingsAvailable ? 'available' : 'unavailable'))
  try { const connections = await spindle.imageGen.listConnections(userId); checks.push(healthCheck('imagegen-connection', 'ImageGen connection', 'optional', connections.length > 0, connections.length ? 'connection available' : 'no connection available')) } catch (error) { checks.push(healthCheck('imagegen-connection', 'ImageGen connection', 'optional', false, String(error))) }
  const buildMatch = !frontendBuildId || frontendBuildId === BUILD_ID
  checks.push(healthCheck('build-match', 'Frontend/backend build match', 'core', buildMatch, buildMatch ? 'match' : `frontend ${frontendBuildId}, backend ${BUILD_ID}`))
  const health = summarizeRelayHealth(checks)
  if (chatId) {
    await mutateState(chatId, userId, current => appendStateLog(current, { severity: health === 'fail' ? 'error' : health === 'warn' ? 'warning' : 'info', stage: 'relay-health-check', eventType: 'relay_health_check', chatId, message: `Relay Health Check ${health === 'pass' ? 'passed' : health === 'warn' ? 'completed with warnings' : 'failed core checks'}. No image generation was started.`, details: { checks, frontendLoadedAt, health } }))
  }
  spindle.sendToFrontend({ type: 'self_test_result', checks, frontendBuildId: frontendBuildId || '', backend: backendBuildInfo(), buildMatch }, userId)
  if (chatId) await sendState(userId, chatId)
}

async function editPrompt(key: string, prompt: string, negativePrompt: string, imageIntent: ImageIntent | undefined, nativeSnapshot?: NativeSettingsSnapshot, userId?: string): Promise<void> {
  const { chatId, record } = await getRecordByKey(key, userId)
  if (record.target === 'instagram.carousel' && !record.imageUrl && record.recoveryCompleteness !== 'marker-only') {
    throw new Error('Edit Prompt is unavailable until this failed carousel resolves. Use Reparse Carousel to preserve its original slide structure.')
  }
  const config = await getConfig(userId)
  const normalized = normalizeNegativePrompts({
    native: config.nativeNegativePrompt,
    request: record.originalNegativePrompt,
    subject: record.promptPipeline?.subjectNegativePrompt || '',
    parser: '',
    router: '',
  })
  const normalizedIntent = normalizeImageIntent(imageIntent ?? record.imageIntent)
  const specialEdited = applySpecialImageIntent(prompt.trim(), normalizedIntent, `${record.originalSceneBrief} ${record.caption || ''} ${record.alt || ''}`)
  const prepared: PreparedPrompt = {
    prompt: specialEdited.prompt,
    negativePrompt: negativePrompt.trim(),
    promptMode: 'edited',
    promptPresetId: record.promptPresetId ?? config.nativePromptPresetId,
    parserUsed: false,
    parserOutput: '',
    parserConnectionId: record.parserConnectionId ?? config.parserConnectionId,
    parserModel: record.parserModel ?? effectiveParserModel(config),
    parserParameters: record.parserParameters ?? config.parserParameters,
    promptPipeline: {
      ...normalized.pipeline,
      finalNormalizedNegativePrompt: negativePrompt.trim(),
      rawMergedNegativePrompt: negativePrompt.trim(),
      warnings: [...normalized.pipeline.warnings, ...promptWarnings(specialEdited.prompt, negativePrompt.trim(), normalized.pipeline)],
      imageIntent: normalizedIntent,
      specialIntentApplied: specialEdited.applied,
      specialIntentSuppressedFragments: specialEdited.suppressed,
    },
  }
  if (!prepared.prompt) throw new Error('Prompt cannot be empty.')
  if (isProcessing(record)) throw new Error('This slot is already processing.')
  record.imageIntent = normalizedIntent

  const job = jobFromRecord(record)
  await assertPersonaPovDispatchAllowed(job, userId)
  const lockKey = `${job.chatId}:${job.messageId}:${job.swipeId}:${job.requestId}:${job.slots.join(',')}`
  if (slotLocks.has(lockKey)) throw new Error('This slot is already processing.')
  slotLocks.add(lockKey)
  let failureStage: 'provider-validation' | 'image-generation-failed' = 'provider-validation'
  try {
    await preflightJobReplacement(job)
    const attemptNumber = await mutateJobState(job, userId, state => {
      markJobStatus(state, job, 'parsing', 'edited-prompt')
      const stored = state.slots[key]
      stored.resolvedPositivePrompt = prepared.prompt; stored.resolvedNegativePrompt = prepared.negativePrompt
      stored.promptMode = prepared.promptMode; stored.promptPresetId = prepared.promptPresetId
      stored.parserConnectionId = prepared.parserConnectionId; stored.parserModel = prepared.parserModel
      stored.parserParameters = prepared.parserParameters; stored.promptPipeline = prepared.promptPipeline
      return stored.attemptNumber
    })
    await sendState(userId, chatId)
    if (isJobCancelled(job)) throw new JobCancelledError()
    const current = (await getState(chatId, userId)).slots[key]
    if (!current) throw new JobCancelledError()
    const imagePlan = await prepareImagePlan(config, job, current, nativeSnapshot, userId, current.highResMode ?? config.highResMode)
    enrichPromptPipelineWithImagePlan(prepared.promptPipeline, imagePlan, prepared.prompt, prepared.negativePrompt)
    await mutateJobState(job, userId, state => stampImagePlan(state.slots[key], imagePlan))
    if (isJobCancelled(job)) throw new JobCancelledError()
    validateImagePlan(imagePlan)
    await mutateJobState(job, userId, state => markSlotStatus(state.slots[key], 'generating'))
    await sendState(userId, chatId)
    failureStage = 'image-generation-failed'
    if (isJobCancelled(job)) throw new JobCancelledError()
    const generated = await generateImage(chatId, prepared, imagePlan, userId, {
      chatId,
      generationId: `${key}:${attemptNumber}`,
      source: job.target === 'prose.illustration' ? 'relay-illustrator' : 'relay-slot',
      slotKey: key,
      requestId: job.requestId,
      addToGallery: config.galleryAutoLink,
    })
    if (isJobCancelled(job)) throw new JobCancelledError()
    await applyJobSuccess(job, [{
      slot: record.slot,
      imageId: generated.imageId,
      imageUrl: generated.imageUrl,
      imageWidth: generated.imageWidth,
      imageHeight: generated.imageHeight,
      aspectRatio: generated.aspectRatio,
      resolvedPositivePrompt: prepared.prompt,
      resolvedNegativePrompt: prepared.negativePrompt,
      promptMode: prepared.promptMode,
      promptPresetId: prepared.promptPresetId,
      parserUsed: prepared.parserUsed,
      parserOutput: prepared.parserOutput,
      parserConnectionId: prepared.parserConnectionId,
      parserModel: prepared.parserModel,
      parserParameters: prepared.parserParameters,
      promptPipeline: prepared.promptPipeline,
      imageConnectionId: generated.imageConnectionId,
      imageConnectionName: generated.imageConnectionName,
      imageProvider: generated.imageProvider,
      imageModel: generated.imageModel,
      imageParameters: generated.imageParameters,
      nativeImageSettings: generated.nativeImageSettings,
      nativeSettingsCapturedAt: generated.nativeSettingsCapturedAt,
      connectionDefaultParameters: generated.connectionDefaultParameters,
      slotOverrides: generated.slotOverrides,
      finalImageParameters: generated.finalImageParameters,
      finalImageRequest: generated.finalImageRequest,
      finalImageSettingsSource: generated.finalImageSettingsSource,
      nativeActiveLoraPreset: generated.nativeActiveLoraPreset,
      effectiveAppliedLoraPreset: generated.effectiveAppliedLoraPreset,
      lorasSentToProvider: generated.lorasSentToProvider,
      loraBaseTags: generated.loraBaseTags,
      baseTagsAddedToPrompt: generated.baseTagsAddedToPrompt,
      omittedBaseTags: generated.omittedBaseTags,
      highResMode: generated.highResMode,
      highResRetainedBaseTags: generated.highResRetainedBaseTags,
      highResPreservedFramingCues: generated.highResPreservedFramingCues,
      loraOmittedFields: generated.loraOmittedFields,
      galleryLinkStatus: generated.galleryLinkStatus,
      galleryItemId: generated.galleryItemId,
      galleryLinkError: generated.galleryLinkError,
      galleryLinkedAt: generated.galleryLinkStatus === 'linked' ? Date.now() : undefined,
      promptProfile: prepared.promptPipeline.promptProfile,
      regenerationIntent: job.regenerationIntent,
      diagnostic: createSlotDiagnostic(job, record.slot, prepared, generated, prepared.promptPipeline.promptProfile, job.regenerationIntent),
      includedContinuityFacts: prepared.promptPipeline.includedContinuityFacts,
      excludedContinuityFacts: prepared.promptPipeline.excludedContinuityFacts,
      continuityStrength: prepared.promptPipeline.continuityStrength,
      attemptNumber,
      triggerType: 'edited-prompt',
      generatedAt: Date.now(),
    }], record.status === 'completed', userId)
  } catch (error) {
    if (error instanceof JobCancelledError || isJobCancelled(job)) return
    if (error instanceof ReplacementPreflightError) {
      await reportReplacementPreflightFailure(job, error.message, userId)
      return
    }
    const message = error instanceof Error ? error.message : String(error)
    try {
      await applyJobFailure(job, message, failureStage, userId)
    } catch (failureError) {
      if (failureError instanceof JobCancelledError || isJobCancelled(job)) return
      await forceMarkFailed(job, message, userId)
    }
    if (isJobCancelled(job)) return
    await sendSlotErrors(job, message, userId)
  } finally {
    slotLocks.delete(lockKey)
    cancelledJobs.delete(jobCancellationKey(job))
  }
}

function replaceOwningMessageMediaWrapper(content: string, job: RouterJob, replacement: string): string | null {
  const tag = job.target === 'smartphone.message-image' ? 's_img' : job.target === 'kakao.image' ? 'k_img' : ''
  if (!tag) return null
  const requestId = escapeRegExp(job.requestId)
  const slot = escapeRegExp(job.slots[0] || '')
  const requestOwner = requestId
    ? new RegExp(`<image_request\\b(?=[^>]*\\bid=["']${requestId}["'])[^>]*>`, 'i')
    : null
  const slotOwner = slot
    ? new RegExp(`<image_request\\b(?=[^>]*\\bslot=["']${slot}["'])[^>]*>`, 'i')
    : null
  const matches: Array<{ start: number; end: number }> = []
  const re = new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}>`, 'gi')
  let match: RegExpExecArray | null
  while ((match = re.exec(content)) !== null) {
    const ownsExactRequest = Boolean(job.originalRequestXml && match[0].includes(job.originalRequestXml))
    const ownsIdentity = Boolean(requestOwner?.test(match[0]) || slotOwner?.test(match[0]))
    if (ownsExactRequest || ownsIdentity) matches.push({ start: match.index, end: match.index + match[0].length })
  }
  if (matches.length !== 1) return null
  const owner = matches[0]
  return `${content.slice(0, owner.start)}${replacement}${content.slice(owner.end)}`
}


async function applyJobSuccess(job: RouterJob, results: SlotGenerationResult[], replaceExisting: boolean, userId?: string, bypassImagePreview = false, forceImagePreview = false): Promise<'completed' | 'placement-pending' | 'placement-repair-needed'> {
  if (results.length === 0) throw new Error('No image results were produced.')
  if (isJobCancelled(job)) throw new JobCancelledError()
  const config = await getConfig(userId)
  if ((forceImagePreview || config.slotGenerationMode === 'image-preview') && !bypassImagePreview) {
    await storePendingPlacement(job, results, 'Awaiting user preview and insertion.', ['user preview mode'], '', userId, true)
    spindle.sendToFrontend({ type: 'status', status: 'Preview Ready', requestId: job.requestId }, userId)
    return 'placement-pending'
  }
  const anchorsChecked = ['exact resolved slot marker', 'exact original image_request or reverie-illustration tag', 'exact Relay error marker']
  const message = await resolveMessage(job.chatId, job.messageId)
  if (!message) {
    await storePendingPlacement(job, results, 'The generated image is ready, but the original message is unavailable.', anchorsChecked, '', userId)
    return 'placement-repair-needed'
  }
  try {
    const rawContent = getSwipeContent(message, job.swipeId)
    const content = normalizeRelaySurfaceContracts(rawContent)
    const expectedPlacements = new Map(results.map(result => [result.slot, expectedPlacementCount(content, job, result)]))
    const requiresCharacterProfilePortrait = isCharacterProfileArtifactJob(rawContent, job, results)
    if (requiresCharacterProfilePortrait) anchorsChecked.push('exact Character Profile portrait ownership and renderable image')
    // Placement must mutate the authoritative current swipe. Falling back to
    // the pre-generation payload can overwrite an edit that removed or moved
    // the slot while the provider was running. A missing current anchor is a
    // recoverable placement-pending result, not permission to restore stale XML.
    let nextContent = content
    if (replaceExisting) {
      for (const result of results) {
        const replaced = replaceResolvedSlotAfterComment(nextContent, job, result)
        if (replaced) nextContent = replaced
      }
    } else {
      const replacement = renderResolvedMarkup(job, results)
      if (nextContent.includes(job.originalRequestXml)) {
        // Smartphone/Kakao requests are authored inside their owning message
        // media wrapper. Replace that one wrapper atomically so a completed
        // <s_img>/<k_img> can never be nested inside the original wrapper.
        const ownedMediaReplacement = replaceOwningMessageMediaWrapper(nextContent, job, replacement)
        nextContent = ownedMediaReplacement || nextContent.split(job.originalRequestXml).join(replacement)
      } else {
        const replaced = replaceErrorAfterComment(nextContent, job, replacement)
        if (replaced) nextContent = replaced
      }
    }
    if (isJobCancelled(job)) throw new JobCancelledError()
    if (nextContent !== rawContent) await patchSwipeContent(job.chatId, message, job.swipeId, nextContent)
    else if (!placementIsPresent(content, job, results, expectedPlacements)) {
      await storePendingPlacement(job, results, 'No deterministic request, error, or resolved slot anchor was found.', anchorsChecked, content, userId)
      return 'placement-repair-needed'
    }
    if (isJobCancelled(job)) throw new JobCancelledError()
    const verifiedMessage = await resolveMessage(job.chatId, job.messageId)
    const verifiedContent = verifiedMessage ? getSwipeContent(verifiedMessage, job.swipeId) : ''
    if (!placementIsPresent(verifiedContent, job, results, expectedPlacements)) {
      await storePendingPlacement(job, results, 'Message update completed without a verifiable exact slot marker and image URL.', anchorsChecked, verifiedContent, userId)
      return 'placement-repair-needed'
    }
    if (requiresCharacterProfilePortrait && !results.every(result => characterProfilePortraitHasExactRelayImage(verifiedContent, {
      chatId: job.chatId,
      messageId: job.messageId,
      swipeId: job.swipeId,
      requestId: job.requestId,
      slot: result.slot,
      imageUrl: result.imageUrl,
    }))) {
      await storePendingPlacement(job, results, 'Generation completed, but the exact Relay asset is not renderable inside its matching Character Profile portrait.', anchorsChecked, verifiedContent, userId)
      return 'placement-repair-needed'
    }
  } catch (error) {
    if (error instanceof JobCancelledError) throw error
    await storePendingPlacement(job, results, error instanceof Error ? error.message : String(error), anchorsChecked, '', userId)
    return 'placement-repair-needed'
  }

  await mutateJobState(job, userId, state => {
    const now = Date.now()
    for (const result of results) {
      const record = state.slots[slotKey({ ...job, slot: result.slot })]
      applyGeneration(state, record, result, now)
      appendStateLog(state, {
        severity: 'info', stage: 'image-generation-completed', eventType: 'image_generation_completed', chatId: job.chatId,
        messageId: job.messageId, swipeId: job.swipeId, requestId: job.requestId, slot: result.slot, target: job.target,
        attemptNumber: record.attemptNumber, triggerType: result.triggerType, provider: result.imageProvider,
        connectionId: result.imageConnectionId, connectionName: result.imageConnectionName, model: result.imageModel,
        durationMs: currentAttempt(record)?.durationMs, message: 'Image generation completed.',
      })
    }
  })
  await sendState(userId, job.chatId)
  return 'completed'
}

function resolvedSlotRegex(target: SlotRecord['target'], flags = 'i'): RegExp {
  if (target.startsWith('custom.')) return new RegExp(`<img\\b[^>]*\\bdata-dgir-custom-target=["'][^"']+["'][^>]*>`, flags)
  const tag = slotTagForTarget(target)
  return new RegExp(`<${tag}\\b[\\s\\S]*?<\\/${tag}>`, flags)
}

function rebuildRawSlotAnchor(content: string, record: SlotRecord, requestXml: string): { content: string; mode: string } | null {
  const currentMarker = slotComment(record, record.slot)
  const locatedMarker = findFirstMarker(content, slotCommentVariants(record, record.slot))
  if (locatedMarker) {
    const { marker, markerIndex } = locatedMarker
    const tag = slotTagForTarget(record.target)
    const tail = content.slice(markerIndex + marker.length)
    const direct = resolvedSlotRegex(record.target, 'i')
    if (new RegExp(`^\\s*${direct.source}`, 'i').test(tail)) return { content, mode: 'existing-resolved-marker' }

    // Recovered markup can place the marker before an enclosing social wrapper.
    // Move it directly beside the uniquely identified slot so later replacement
    // cannot consume or duplicate the parent wrapper.
    if (record.imageUrl) {
      const withoutMarker = `${content.slice(0, markerIndex)}${content.slice(markerIndex + marker.length)}`
      const matches: Array<{ index: number; text: string }> = []
      const re = resolvedSlotRegex(record.target, 'gi')
      let match: RegExpExecArray | null
      while ((match = re.exec(withoutMarker)) !== null) {
        if (match[0].includes(record.imageUrl)) matches.push({ index: match.index, text: match[0] })
      }
      if (matches.length === 1) {
        const target = matches[0]
        return {
          content: `${withoutMarker.slice(0, target.index)}${currentMarker}\n${withoutMarker.slice(target.index)}`,
          mode: `normalized-${tag}-marker`,
        }
      }
    }
    return { content, mode: 'existing-resolved-marker' }
  }
  if (record.originalRequestXml && content.includes(record.originalRequestXml)) {
    return { content: content.replace(record.originalRequestXml, requestXml), mode: 'existing-request' }
  }
  const replacedError = replaceErrorAfterComment(content, jobFromRecord(record), requestXml)
  if (replacedError) return { content: replacedError, mode: 'error-marker' }
  if (!record.imageUrl) return null

  const tag = slotTagForTarget(record.target)
  const matches: Array<{ index: number; text: string }> = []
  const re = resolvedSlotRegex(record.target, 'gi')
  let match: RegExpExecArray | null
  while ((match = re.exec(content)) !== null) {
    if (match[0].includes(record.imageUrl)) matches.push({ index: match.index, text: match[0] })
  }
  if (matches.length !== 1) return null
  const target = matches[0]
  return {
    content: `${content.slice(0, target.index)}${currentMarker}\n${content.slice(target.index)}`,
    mode: `unique-${tag}-image-url`,
  }
}

function slotTagForTarget(target: SlotRecord['target']): string {
  if (target.startsWith('custom.')) return 'img'
  return target === 'twitter.media' ? 'tw_media'
    : target === 'instagram.single' ? 'image'
      : target === 'instagram.carousel' ? 'ig_slide'
        : target === 'smartphone.message-image' ? 's_img'
          : target === 'kakao.image' ? 'k_img'
            : 'scene_image'
}

function expectedPlacementCount(content: string, job: RouterJob, result: SlotGenerationResult): number {
  const requestCount = job.originalRequestXml ? content.split(job.originalRequestXml).length - 1 : 0
  const markerCount = slotCommentVariants(job, result.slot).reduce((total, marker) => total + content.split(marker).length - 1, 0)
  return Math.max(1, requestCount, markerCount)
}

function placementIsPresent(content: string, job: RouterJob, results: SlotGenerationResult[], expected = new Map<string, number>()): boolean {
  return results.every(result => {
    let valid = 0
    let searchFrom = 0
    while (searchFrom < content.length) {
      const located = findFirstMarker(content.slice(searchFrom), slotCommentVariants(job, result.slot))
      if (!located) break
      const markerIndex = searchFrom + located.markerIndex
      const afterMarker = markerIndex + located.marker.length
      const nextMatch = /<!--\s*(?:reverie-relay|dreamglass):image(?:-error)?\b/i.exec(content.slice(afterMarker))
      const nextMarker = nextMatch?.index === undefined ? -1 : afterMarker + nextMatch.index
      const segment = content.slice(markerIndex, nextMarker < 0 ? content.length : nextMarker)
      if (segment.includes(result.imageUrl)) valid += 1
      searchFrom = afterMarker
    }
    return valid >= (expected.get(result.slot) || 1)
  })
}

function isCharacterProfileArtifactJob(content: string, job: RouterJob, results: SlotGenerationResult[]): boolean {
  if (job.target !== 'custom.artifact-media') return false
  if (job.requestId.startsWith('character-profile-') || results.some(result => result.slot.startsWith('character-profile-'))) return true
  const profiles = String(content || '').match(/<character_profile\b[^>]*>[\s\S]*?<\/character_profile>/gi) || []
  return profiles.some(profile => profile.includes(job.originalRequestXml)
    || results.some(result => slotCommentVariants(job, result.slot).some(marker => profile.includes(marker))))
}

async function storePendingPlacement(
  job: RouterJob,
  results: SlotGenerationResult[],
  reason: string,
  anchorsChecked: string[],
  content: string,
  userId?: string,
  previewPending = false,
): Promise<void> {
  await mutateJobState(job, userId, state => {
    const now = Date.now()
    for (const result of results) {
      const record = state.slots[slotKey({ ...job, slot: result.slot })]
      record.status = previewPending ? 'placement-pending' : 'placement-repair-needed'
      record.pendingPlacement = result
      record.previewPending = previewPending
      record.placementFailure = previewPending ? undefined : {
        failedAt: now,
        reason,
        anchorsChecked: [...anchorsChecked],
        contentFingerprint: contentFingerprint(content),
        retryCount: (record.placementFailure?.retryCount || 0) + 1,
      }
      record.error = undefined
      record.errorToastKey = undefined
      record.updatedAt = now
      finishAttempt(record, previewPending ? 'placement-pending' : 'placement-repair-needed', now, reason)
      if (record.proseIllustrationId && state.proseIllustrator.records[record.proseIllustrationId]) {
        const proseRecord = state.proseIllustrator.records[record.proseIllustrationId]
        proseRecord.status = 'ready-to-place'
        proseRecord.imageId = result.imageId
        proseRecord.imageUrl = result.imageUrl
        proseRecord.error = reason
      }
      appendStateLog(state, {
        severity: previewPending ? 'info' : 'warning', stage: previewPending ? 'image-preview-ready' : 'placement-repair-needed', eventType: previewPending ? 'placement_pending' : 'placement_repair_needed', chatId: job.chatId,
        messageId: job.messageId, swipeId: job.swipeId, requestId: job.requestId, slot: result.slot, target: job.target,
        attemptNumber: record.attemptNumber, triggerType: result.triggerType, provider: result.imageProvider,
        connectionId: result.imageConnectionId, connectionName: result.imageConnectionName, model: result.imageModel,
        message: previewPending ? 'Image generation succeeded and is ready for review.' : 'Image generation succeeded, but exact Surface placement needs repair.',
        details: { reason, anchorsChecked, imageId: result.imageId, imageUrl: result.imageUrl },
      })
    }
  })
  await sendState(userId, job.chatId)
}

async function retryPendingPlacement(key: string, userId?: string): Promise<void> {
  const { chatId, state, record } = await getRecordByKey(key, userId)
  if (!['placement-pending', 'placement-repair-needed'].includes(record.status) || !record.pendingPlacement) throw new Error('This slot has no pending image placement to retry.')
  const siblings = Object.values(state.slots)
    .filter(candidate => candidate.chatId === record.chatId && candidate.messageId === record.messageId
      && candidate.swipeId === record.swipeId && candidate.requestId === record.requestId
      && ['placement-pending', 'placement-repair-needed'].includes(candidate.status) && Boolean(candidate.pendingPlacement))
    .sort((a, b) => a.slot.localeCompare(b.slot, undefined, { numeric: true }))
  const job = jobFromRecord(record)
  job.slots = siblings.map(candidate => candidate.slot)
  job.count = siblings.length
  const results = siblings.map(candidate => candidate.pendingPlacement!)
  await mutateState(chatId, userId, next => {
    const now = Date.now()
    for (const sibling of siblings) {
      const stored = next.slots[sibling.key]
      if (!stored || !stored.pendingPlacement) continue
      stored.status = 'placement-pending'
      stored.error = undefined
      stored.errorToastKey = undefined
      stored.updatedAt = now
      appendStateLog(next, {
        severity: 'info', stage: 'placement-repair', eventType: 'placement_repair_requested', chatId,
        messageId: stored.messageId, swipeId: stored.swipeId, requestId: stored.requestId, slot: stored.slot, target: stored.target,
        message: 'Repair / Reinsert requested for the preserved generated asset.',
        details: { pendingImageId: stored.pendingPlacement.imageId, pendingImageUrl: stored.pendingPlacement.imageUrl, priorFailure: stored.placementFailure },
      })
    }
  })
  spindle.sendToFrontend({ type: 'status', status: 'Repairing placement', requestId: record.requestId }, userId)
  await sendState(userId, chatId)
  const outcome = await applyJobSuccess(job, results, siblings.every(candidate => Boolean(candidate.imageUrl)), userId, true)
  if (outcome !== 'completed') {
    const refreshed = await getState(chatId, userId)
    const reason = job.slots.map(slot => refreshed.slots[slotKey({ ...job, slot })]?.placementFailure?.reason).find(Boolean)
    throw new Error(reason || 'Relay could not verify the repaired placement in the original slot.')
  }
  spindle.sendToFrontend({ type: 'status', status: outcome === 'completed' ? 'Placed' : outcome === 'placement-repair-needed' ? 'Placement needs repair' : 'Ready to Place', requestId: record.requestId }, userId)
  await sendState(userId, chatId)
}

async function regenerateWithIntent(key: string, intent: RegenerationIntent, candidateCount: 1 | 2 | 4 | undefined, nativeSnapshot?: NativeSettingsSnapshot, userId?: string): Promise<void> {
  const { chatId, record } = await getRecordByKey(key, userId)
  if (!canReparseRecord(record) && !canRegenerateRecord(record)) throw new Error('This slot does not have enough prompt metadata for direction regeneration.')
  if (isProcessing(record) || relayProcessingKeys.has(record.key)) throw new Error('This slot is already processing.')
  const sanitizedIntent = sanitizeRegenerationIntent(intent)
  await mutateState(chatId, userId, state => {
    const stored = state.slots[key]
    if (!stored) return
    stored.regenerationIntent = sanitizedIntent
    stored.updatedAt = Date.now()
    appendStateLog(state, {
      severity: 'info', stage: 'regeneration-intent', eventType: 'regeneration_intent_requested', chatId,
      messageId: stored.messageId, swipeId: stored.swipeId, requestId: stored.requestId, slot: stored.slot, target: stored.target,
      message: `Direction regeneration requested: ${stored.regenerationIntent.label}.`,
      details: { intent: stored.regenerationIntent, candidateCount },
    })
  })
  const requestedCandidateCount = candidateCount || 1
  if (requestedCandidateCount === 1) {
    const updated = await getRecordByKey(key, userId)
    const job = jobFromRecord(updated.record)
    job.regenerationIntent = sanitizedIntent
    if (sanitizedIntent.aspectRatio) job.aspect = sanitizedIntent.aspectRatio
    const effectiveSnapshot = nativeSnapshot || nativeSnapshotFromConfig(await getConfig(userId))
    spindle.sendToFrontend({ type: 'status', status: 'Regenerating with direction', requestId: updated.record.requestId }, userId)
    await runJob(job, { replaceExisting: Boolean(updated.record.imageUrl), reparse: true, triggerType: 'intent-regeneration', nativeSnapshot: effectiveSnapshot }, userId)
    return
  }
  await startRelayBatch(chatId, nativeSnapshot, userId, requestedCandidateCount, sanitizedIntent, [key])
}

function sanitizeRegenerationIntent(intent: RegenerationIntent): RegenerationIntent {
  const builtIn = REGENERATION_INTENTS.find(item => item.id === intent.id)
  const base = builtIn || REGENERATION_INTENTS[0]
  const customText = cleanString(intent.customText)
  const customNegative = cleanString(intent.negativeDelta)
  const aspect = cleanString(intent.aspectRatio).replace(/\s+/g, '')
  const aspectRatio = ['1:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9'].includes(aspect)
    ? aspect as RegenerationIntent['aspectRatio']
    : undefined
  return {
    ...base,
    customText: customText || undefined,
    promptDelta: [base.promptDelta, customText].filter(Boolean).join('; '),
    negativeDelta: [base.negativeDelta, customNegative].filter(Boolean).join(', '),
    aspectRatio,
  }
}

async function retryRelayCandidate(chatId: string, batchId: string, candidateKey: string, nativeSnapshot?: NativeSettingsSnapshot, userId?: string): Promise<void> {
  const state = await getState(chatId, userId)
  const batch = state.candidateBatches[batchId]
  const candidate = batch?.candidates.find(item => item.candidateKey === candidateKey)
  if (!batch || !candidate) throw new Error('Relay candidate not found.')
  const record = state.slots[candidate.stableSlotKey]
  if (!record) throw new Error('Original slot record not found.')
  const messages = await spindle.chat.getMessages(chatId) as ChatMessage[]
  const targetIndex = Math.max(0, messages.findIndex(message => message.id === batch.messageId))
  await updateRelayCandidate(chatId, batchId, candidateKey, { status: 'parsing', error: undefined }, userId)
  try {
    const config = await getConfig(userId)
    const result = await generateRelayCandidate(batch, candidate, record, messages, targetIndex, config, nativeSnapshot, userId)
    await updateRelayCandidate(chatId, batchId, candidateKey, {
      status: 'ready', candidateImageId: result.imageId, candidateImageUrl: result.imageUrl,
      newlyParsedPrompt: result.resolvedPositivePrompt, negativePrompt: result.resolvedNegativePrompt,
      provider: result.imageProvider, connection: result.imageConnectionName || result.imageConnectionId || '',
      model: result.imageModel, generationParameters: result.finalImageParameters || result.imageParameters || {},
      finalImageRequest: result.finalImageRequest, promptProfile: result.promptProfile, regenerationIntent: result.regenerationIntent, snapshot: result,
    }, userId)
  } catch (error) {
    await updateRelayCandidate(chatId, batchId, candidateKey, { status: 'failed', error: error instanceof Error ? error.message : String(error) }, userId)
  }
  await sendState(userId, chatId)
}

async function discardRelayCandidate(chatId: string, batchId: string, candidateKey: string, userId?: string): Promise<void> {
  await mutateState(chatId, userId, state => {
    const batch = state.candidateBatches[batchId]
    const candidate = batch?.candidates.find(item => item.candidateKey === candidateKey)
    if (!batch || !candidate) return
    candidate.status = 'discarded'
    candidate.selected = false
    batch.updatedAt = Date.now()
    completeRelayBatchIfTerminal(batch)
    appendStateLog(state, {
      severity: 'info', stage: 'relay-candidate-discarded', eventType: 'relay_candidate_discarded', chatId,
      messageId: batch.messageId, swipeId: batch.swipeId, requestId: candidate.requestId, slot: candidate.slot,
      message: 'Discarded one temporary Relay candidate without changing the current image.',
    })
  })
  await sendState(userId, chatId)
}

async function handleQueueAction(payload: Extract<FrontendMessage, { type: 'queue_action' }>, nativeSnapshot?: NativeSettingsSnapshot, userId?: string): Promise<void> {
  if (payload.action === 'abort_all') {
    const stoppedStreams = abortAllImageStreams()
    for (const key of abortableOperationSerials.keys()) cancelAbortableOperation(key)
    await mutateState(payload.chatId, userId, state => {
      state.backgroundQueue.abortRequestedAt = Date.now()
      state.backgroundQueue.updatedAt = Date.now()
      for (const record of Object.values(state.slots)) {
        if (!isGenerationActiveStatus(record.status)) continue
        cancelledJobs.add(jobCancellationKey(record))
        record.status = 'cancelled'
        record.cancelledAt = Date.now()
        record.updatedAt = Date.now()
        finishAttempt(record, 'cancelled', Date.now(), 'Cancelled by global Abort All.')
      }
      for (const item of Object.values(state.backgroundQueue.items)) {
        if (['completed','failed','cancelled'].includes(item.stage)) continue
        updateBackgroundTask(state, item.id, { stage: 'cancelled', statusText: 'Cancelled by Abort All', etaSeconds: null })
      }
      appendStateLog(state, { severity: 'warning', stage: 'background-queue', eventType: 'abort_all', chatId: payload.chatId, message: 'User cancelled all active Relay analysis and generation work.' })
    })
    await sendState(userId, payload.chatId)
    spindle.sendToFrontend({ type: 'relay_notice', level: 'info', message: stoppedStreams > 0 ? `Stopped ${stoppedStreams} active image generation stream${stoppedStreams === 1 ? '' : 's'}.` : 'Stopped active Relay work.' }, userId)
    return
  }
  if (payload.action === 'generate_selected_only' && payload.selectedKeys?.length) {
    await startRelayBatch(payload.chatId, nativeSnapshot, userId, undefined, undefined, payload.selectedKeys)
    return
  }
  if (payload.action === 'cancel_selected') {
    // The selected-key button is intentionally capability-gated below against
    // the persisted lifecycle state.  Do not eagerly abort a stale key here:
    // placement-only records own an already-generated asset, not a stream.
  }
  await mutateState(payload.chatId, userId, state => {
    const queue = state.queueDirector
    if (payload.concurrencyLimit) queue.concurrencyLimit = clampInt(payload.concurrencyLimit, 1, 4, queue.concurrencyLimit)
    if (payload.selectedKeys) queue.selectedKeys = [...payload.selectedKeys]
    if (payload.action === 'pause_after_current') queue.pausedAfterCurrent = true
    if (payload.action === 'resume') queue.pausedAfterCurrent = false
    if (payload.action === 'cancel_selected' || payload.action === 'skip_selected') {
      const status = payload.action === 'cancel_selected' ? 'cancelled' : 'skipped'
      const selectedKeys = payload.selectedKeys || queue.selectedKeys
      const selectedRecords = selectedKeys.map(key => state.slots[key]).filter(Boolean) as SlotRecord[]
      const abortableKeys = new Set(abortableSlotKeys(selectedRecords, canAbortSlotStatus))
      for (const key of selectedKeys) {
        const record = state.slots[key]
        // Skip keeps its own queue capability. Cancellation is generation-only
        // and must never rewrite placement-pending / repair-needed state.
        if (status === 'cancelled' && !abortableKeys.has(key)) continue
        queue.jobStatuses[key] = status
        if (record && (status === 'skipped' ? isProcessing(record) : canAbortSlotStatus(record.status))) {
          if (status === 'cancelled') {
            cancelledJobs.add(jobCancellationKey(record))
            abortImageStream(record.key)
            abortImageStream(record.requestId)
          }
          record.status = status === 'cancelled' ? 'cancelled' : record.status
          record.cancelledAt = status === 'cancelled' ? Date.now() : record.cancelledAt
          record.updatedAt = Date.now()
          if (status === 'cancelled') finishAttempt(record, 'cancelled', Date.now(), 'Cancelled by user from Relay controls.')
        }
      }
    }
    appendStateLog(state, {
      severity: 'info', stage: 'queue-director', eventType: 'queue_director_action', chatId: payload.chatId,
      message: `Queue Director action: ${payload.action}.`,
      details: { selectedKeys: payload.selectedKeys || queue.selectedKeys, queue },
    })
  })
  await sendState(userId, payload.chatId)
}

async function handleProseIllustratorAction(
  payload: Extract<FrontendMessage, { type: 'prose_illustrator_action' }>,
  nativeSnapshot?: NativeSettingsSnapshot,
  userId?: string,
): Promise<void> {
  const chatId = payload.chatId
  if (!chatId) throw new Error('Prose Illustrator needs an active chat.')
  switch (payload.action) {
    case 'preview_prompt': {
      const state = await getState(chatId, userId)
      const settings = proseSettingsForChat(state, chatId)
      const messages = await spindle.chat.getMessages(chatId) as LlmMessage[]
      const personaPovContext = settings.perspectiveMode === 'persona-pov' ? await resolvePersonaPovContext(chatId, userId) : undefined
      spindle.sendToFrontend({
        type: 'prompt_registry_preview',
        chatId,
        prompt: resolveIllustratorStoryPrompt(settings, messages, personaPovContext),
        registryIds: [
          settings.mode === 'relay-planned' ? 'story.relay-planned' : settings.mode === 'inline-protocol' ? 'story.inline-protocol' : 'story.model-placed',
          `story.framing.${settings.perspectiveMode}`,
          'story.adult-content-fidelity',
          'story.runtime-directives',
        ],
      }, userId)
      return
    }
    case 'cancel_active': {
      cancelAbortableOperation(`prose:${chatId}`)
      for (const [key, scheduled] of [...scheduledProseOpportunityScans.entries()]) {
        if (scheduled.chatId !== chatId) continue
        if (scheduled.timer) clearTimeout(scheduled.timer)
        scheduledProseOpportunityScans.delete(key)
      }
      await mutateState(chatId, userId, state => {
        for (const plan of Object.values(state.proseIllustrator.plans)) {
          if (plan.chatId !== chatId || ['generated', 'cancelled', 'rejected'].includes(plan.status)) continue
          plan.status = 'cancelled'
          plan.warnings = [...new Set([...(plan.warnings || []), 'Cancelled by user.'])]
        }
        for (const record of Object.values(state.proseIllustrator.records)) {
          const plan = state.proseIllustrator.plans[record.planId]
          if (!plan || plan.chatId !== chatId || ['completed', 'removed', 'cancelled'].includes(record.status)) continue
          record.status = 'cancelled'
          record.error = 'Cancelled by user.'
        }
        for (const slot of Object.values(state.slots)) {
          if (slot.chatId !== chatId || slot.target !== 'prose.illustration' || !isRecordJobActive(slot)) continue
          cancelledJobs.add(jobCancellationKey(slot))
          slot.status = 'cancelled'
          slot.cancelledAt = Date.now()
          slot.updatedAt = Date.now()
        }
        appendStateLog(state, { severity: 'info', stage: 'prose-illustrator', eventType: 'prose_active_work_cancelled', chatId, message: 'Cancelled active scene analysis and prose illustration work.' })
      })
      await sendState(userId, chatId)
      spindle.sendToFrontend({ type: 'relay_notice', level: 'info', message: 'Cancelled active scene analysis and prose illustration work.' }, userId)
      return
    }
    case 'set_settings': {
      const patch = payload.settings || {}
      const currentConfig = await getConfig(userId)
      const globalSettings = normalizeProseIllustratorSettings({
        ...currentConfig.proseIllustratorSettings,
        ...patch,
        paused: false,
      })
      await setConfig({ proseIllustratorSettings: globalSettings }, userId)
      await mutateState(chatId, userId, state => {
        const currentPaused = state.proseIllustrator.settings[chatId]?.paused === true
        state.proseIllustrator.settings.__global__ = globalSettings
        state.proseIllustrator.settings[chatId] = normalizeProseIllustratorSettings({
          ...globalSettings,
          paused: currentPaused,
        })
        appendStateLog(state, {
          severity: 'info',
          stage: 'prose-illustrator-settings',
          eventType: 'prose_illustrator_settings_updated',
          chatId,
          message: 'Updated global Prose Illustrator settings. New and existing chats will use the same controls.',
          details: { settings: state.proseIllustrator.settings[chatId] },
        })
      })
      await sendState(userId, chatId)
      return
    }
    case 'pause_auto':
    case 'resume_auto':
      await mutateState(chatId, userId, state => {
        const settings = proseSettingsForChat(state, chatId)
        settings.paused = payload.action === 'pause_auto'
        state.proseIllustrator.settings[chatId] = settings
        appendStateLog(state, { severity: 'info', stage: 'prose-illustrator-auto', eventType: payload.action, chatId, message: settings.paused ? 'Paused Prose Illustrator Auto mode.' : 'Resumed Prose Illustrator Auto mode.' })
      })
      await sendState(userId, chatId)
      return
    case 'plan_latest':
    case 'plan_message': {
      const plan = await planProseIllustrationForMessage(chatId, payload.messageId, payload.swipeId, 'relay-planned', userId)
      await sendState(userId, chatId)
      spindle.sendToFrontend({ type: 'relay_notice', level: plan.shouldIllustrate ? 'info' : 'warning', message: plan.shouldIllustrate ? 'Relay-Planned created an illustration plan.' : `Planner declined illustration: ${plan.reason}` }, userId)
      return
    }
    case 'relay_plan_once': {
      const message = await resolveMessage(chatId, payload.messageId)
      if (!message) throw new Error('Message not found.')
      const swipeId = Number.isFinite(Number(payload.swipeId)) ? Number(payload.swipeId) : activeSwipeId(message)
      const accepted = await discoverProseOpportunities({
        chatId,
        messageId: message.id,
        swipeId,
        content: strictSwipeContent(message, swipeId),
        source: 'model-placed-recovery-once',
        force: true,
        userId,
      })
      if (!accepted.length) {
        spindle.sendToFrontend({ type: 'relay_notice', level: 'warning', message: 'Relay-Planned found no strong visual beat in that response.' }, userId)
        return
      }
      await handleAutoOpportunityDispatch(chatId, accepted, userId)
      spindle.sendToFrontend({ type: 'relay_notice', level: 'info', message: 'Relay-Planned recovery started for this response only. Your selected Illustrator mode was not changed.' }, userId)
      return
    }
    case 'generate_plan':
      if (!payload.planId) throw new Error('Plan ID is required.')
      await generateProseIllustrationPlan(chatId, payload.planId, nativeSnapshot, userId)
      return
    case 'remove_illustration':
      if (!payload.illustrationId) throw new Error('Illustration ID is required.')
      await removeProseIllustration(chatId, payload.illustrationId, userId)
      return
  }
}

function normalizeTagList(value: string): string {
  return [...new Set(value.split(/[,\n]+/).map(tag => tag.trim().replace(/\s+/g, '_')).filter(Boolean))].join(', ')
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  const chunkSize = 0x8000
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, Math.min(bytes.length, offset + chunkSize)))
  }
  return btoa(binary)
}

async function recordLastGeneratedImage(chatId: string | null | undefined, imageUrl: string, userId?: string): Promise<void> {
  const url = cleanString(imageUrl)
  if (!url) return
  try {
    await spindle.variables.global.set('last_genned', url, userId)
  } catch (error) {
    spindle.log.warn(`[ReverieRelay:last_genned] Could not update global variable: ${error instanceof Error ? error.message : String(error)}`)
  }
  const resolvedChatId = cleanString(chatId)
  if (!resolvedChatId) return
  try {
    await spindle.variables.chat.set(resolvedChatId, 'last_genned', url)
  } catch (error) {
    spindle.log.warn(`[ReverieRelay:last_genned] Could not update chat variable for ${resolvedChatId}: ${error instanceof Error ? error.message : String(error)}`)
  }
}

function normalizeGenerationLoraStack(value: unknown): GenerationLoraEntry[] {
  if (!Array.isArray(value)) return []
  const seen = new Set<string>()
  const rows: GenerationLoraEntry[] = []
  for (const entry of value) {
    const row = cleanParameters(entry)
    const name = firstString(row.lora_name, row.name, row.path, row.fileName, row.filename, row.id)
    if (!name) continue
    const id = cleanString(row.id) || contentFingerprint(name).slice(0, 16)
    const key = name.replace(/\\/g, '/').split('/').pop()!.toLocaleLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    const model = Number(row.weight_model ?? row.strength ?? row.weight ?? row.multiplier ?? 1)
    const clip = Number(row.weight_clip ?? row.clipStrength ?? row.clip ?? model)
    const triggerWords = Array.isArray(row.triggerWords)
      ? row.triggerWords.map(cleanString).filter(Boolean)
      : Array.isArray(row.triggers)
        ? row.triggers.map(cleanString).filter(Boolean)
        : commaSeparatedValues(row.trigger_words)
    rows.push({
      id,
      lora_name: name,
      displayName: firstString(row.displayName, row.label, row.name, name),
      weight_model: Number.isFinite(model) ? model : 1,
      weight_clip: Number.isFinite(clip) ? clip : Number.isFinite(model) ? model : 1,
      triggerWords,
      previewUrl: firstString(row.previewUrl, row.imageUrl, row.thumbnailUrl, row.preview, row.image) || undefined,
      source: firstString(row.source, row.provider, row.origin) || undefined,
      metadata: cleanParameters(row.metadata || row.raw || row),
    })
  }
  return rows.slice(0, 64)
}

function mergeLoraSentMetadata(existing: unknown, addition: unknown, label: string): unknown {
  const cleanExisting = cloneValue(existing)
  const cleanAddition = cloneValue(addition)
  if (Array.isArray(cleanExisting) && cleanExisting.length === 0) return { [label]: cleanAddition }
  if (cleanExisting && typeof cleanExisting === 'object' && !Array.isArray(cleanExisting)) {
    return { ...(cleanExisting as Record<string, unknown>), [label]: cleanAddition }
  }
  return { native: cleanExisting, [label]: cleanAddition }
}

async function planProseIllustrationForMessage(
  chatId: string,
  messageId: string | undefined,
  swipeIdInput: number | undefined,
  mode: ProseIllustratorMode,
  userId?: string,
  contentOverride?: string,
): Promise<ProseIllustrationPlan> {
  const operationKey = `prose:${chatId}`
  const operationSerial = captureAbortableOperation(operationKey)
  const state = await getState(chatId, userId)
  assertAbortableOperationCurrent(operationKey, operationSerial)
  const settings = proseSettingsForChat(state, chatId)
  const message = await resolveMessage(chatId, messageId)
  if (!message) throw new Error('Message not found.')
  const swipeId = Number.isFinite(Number(swipeIdInput)) ? Number(swipeIdInput) : activeSwipeId(message)
  const content = contentOverride || strictSwipeContent(message, swipeId)
  if (!isEligibleProseContent(content, settings)) throw new Error('Selected message is not eligible for Prose Illustrator planning.')
  if (!settings.plannerConnectionId) throw new Error('Planner unavailable. Select a Prose Illustrator planner connection or use Model-Placed mode with the preset prompt.')
  const paragraphs = proseParagraphs(content)
  const plannerMessages = await buildProsePlannerMessages(chatId, message.id, swipeId, content, paragraphs, settings, userId)
  const connection = await spindle.connections.get(settings.plannerConnectionId, userId)
  if (!connection) throw new Error('Prose Illustrator planner connection not found.')
  assertAbortableOperationCurrent(operationKey, operationSerial)
  const raw = await generateParserText({ id: connection.id, name: connection.name, provider: connection.provider, model: connection.model }, {
    ...(await getConfig(userId)),
    parserModel: settings.plannerModel || connection.model,
    parserParameters: settings.plannerParameters,
  }, plannerMessages, userId, chatId, undefined, 'planner')
  assertAbortableOperationCurrent(operationKey, operationSerial)
  const parsed = parseProsePlannerJson(raw)
  const plan = normalizeProsePlan(chatId, message.id, swipeId, content, settings, parsed, {
    mode,
    planningConnectionId: connection.id,
    planningModel: settings.plannerModel || connection.model,
    plannerOutput: parsed,
    source: mode === 'relay-planned' ? 'auto' : 'planner',
  })
  assertAbortableOperationCurrent(operationKey, operationSerial)
  await mutateState(chatId, userId, next => storeProsePlan(next, plan))
  return plan
}

async function selectProseOpportunity(chatId: string, opportunityId: string, userId?: string): Promise<ProseIllustrationPlan> {
  const state = await getState(chatId, userId)
  const opportunity = state.proseIllustrator.opportunities[opportunityId]
  if (!opportunity || opportunity.chatId !== chatId) throw new Error('Opportunity not found.')
  if (!['proposed', 'selected'].includes(opportunity.status)) throw new Error(`Opportunity is ${opportunity.status} and cannot be selected.`)
  const message = await resolveMessage(chatId, opportunity.messageId)
  if (!message) {
    await mutateState(chatId, userId, next => {
      delete next.proseIllustrator.opportunities[opportunityId]
      if (next.proseIllustrator.activeOpportunityIdByChat[chatId] === opportunityId) delete next.proseIllustrator.activeOpportunityIdByChat[chatId]
      appendStateLog(next, {
        severity: 'warning', stage: 'prose-opportunity-discovery', eventType: 'stale_opportunity_purged_missing_message',
        chatId, messageId: opportunity.messageId, swipeId: opportunity.swipeId, requestId: opportunityId,
        message: 'Purged an illustration candidate because its source message no longer exists.',
      })
    })
    await sendState(userId, chatId)
    throw new StaleOpportunityError('That illustration candidate belonged to a deleted message and was removed.')
  }
  const content = strictSwipeContent(message, opportunity.swipeId)
  if (!content || contentFingerprint(content) !== opportunity.sourceContentFingerprint) {
    await mutateState(chatId, userId, next => {
      delete next.proseIllustrator.opportunities[opportunityId]
      if (next.proseIllustrator.activeOpportunityIdByChat[chatId] === opportunityId) delete next.proseIllustrator.activeOpportunityIdByChat[chatId]
      appendStateLog(next, {
        severity: 'warning', stage: 'prose-opportunity-discovery', eventType: 'stale_opportunity_purged_changed_swipe',
        chatId, messageId: opportunity.messageId, swipeId: opportunity.swipeId, requestId: opportunityId,
        message: 'Purged an illustration candidate because its source swipe changed or disappeared.',
      })
    })
    await sendState(userId, chatId)
    throw new StaleOpportunityError('That illustration candidate was stale and has been removed. Relay can plan a fresh candidate from the current content.')
  }
  const settings = proseSettingsForChat(state, chatId)
  const composition = await composePromptForOpportunity(chatId, opportunity, content, settings, userId)
  const plan = planFromOpportunity(opportunity, content, settings, composition)
  await mutateState(chatId, userId, next => {
    const stored = next.proseIllustrator.opportunities[opportunityId]
    if (stored) {
      stored.status = 'selected'
      stored.selectedAt = Date.now()
      stored.updatedAt = Date.now()
    }
    storeProsePlan(next, plan)
    next.proseIllustrator.activeOpportunityIdByChat[chatId] = opportunityId
  })
  return plan
}

const PROTECTED_EXPLICIT_SCENE_NEGATIVE_FLOOR = 'minor, child, teen, underage, ambiguous age, non-consensual sexual activity, coercion, sexual violence'

const UNDERAGE_SCENE_PATTERN = /\b(?:minor|child|teen(?:ager)?|underage|schoolgirl|schoolboy|young teen|middle school|high school(?: student)?|secondary school(?: student)?|loli|shota|(?:1[0-7]|[0-9])-year-old|age\s+(?:1[0-7]|[0-9])|seventeen(?:-year-old)?|sixteen(?:-year-old)?|fifteen(?:-year-old)?|fourteen(?:-year-old)?|thirteen(?:-year-old)?)\b/i
const EXPLICIT_SEXUAL_SCENE_PATTERN = /\b(?:having sex|sexual intercourse|intercourse|sex scene|sex act|making love|penetrat(?:e|ed|es|ing|ion)|masturbat(?:e|ed|es|ing|ion)|oral sex|fellatio|cunnilingus|blowjob|handjob|anal sex|vaginal sex|genital contact|erect penis|sexual climax|orgasm(?:ic|ing|ed)?|explicit genital contact)\b/i
const EXPLICIT_ESCALATION_PATTERN = /\b(?:explicit sexual content|adult-only explicit sexual|erect penis|penis|vagina|genitalia|genitals|penetrat(?:e|ed|es|ing|ion)|masturbat(?:e|ed|es|ing|ion)|oral sex|fellatio|cunnilingus|blowjob|handjob|anal sex|vaginal sex|sexual intercourse|having sex|sex act|orgasm(?:ic|ing|ed)?)\b/i

function authoritativeSceneText(job: Pick<RouterJob, 'originalSceneBrief' | 'caption' | 'alt'>): string {
  return [job.originalSceneBrief, job.caption, job.alt].map(cleanString).filter(Boolean).join(' ')
}

export function isExplicitAdultScene(value: string): boolean {
  const text = cleanString(value)
  if (!text || UNDERAGE_SCENE_PATTERN.test(text)) return false
  return EXPLICIT_SEXUAL_SCENE_PATTERN.test(text)
}

export function hasUnrequestedExplicitEscalation(authoritativeScene: string, candidatePrompt: string): boolean {
  const authoritative = cleanString(authoritativeScene)
  const candidate = cleanString(candidatePrompt)
  if (!candidate || isExplicitAdultScene(authoritative)) return false
  if (!EXPLICIT_ESCALATION_PATTERN.test(candidate)) return false
  return !EXPLICIT_ESCALATION_PATTERN.test(authoritative)
}

export function contextualizeSexualParserInstructions(value: string): string {
  const rewritten = cleanString(value)
    .replace(/when\s+sex\s+occurs[:,]?\s*prioriti[sz]e\s+genitalia[.!]?/gi, 'Only when the authoritative scene brief clearly depicts consensual sexual activity between established adults, preserve the explicit sexual details already present; otherwise do not add nudity, genitalia, arousal, or sexual acts.')
    .replace(/\[\s*if\s+sexual,?\s*add:\s*explicit,?\s*nsfw\s*\]/gi, 'If and only if the authoritative scene brief is explicitly sexual and all participants are established adults, preserve that explicit content without escalation.')
  return rewritten
}

function applyContextualSexualGuidance(
  prompt: string,
  negativePrompt: string,
  authoritativeScene: string,
): { prompt: string; negativePrompt: string; applied: boolean } {
  if (!isExplicitAdultScene(authoritativeScene)) return { prompt, negativePrompt, applied: false }
  return {
    prompt: [prompt, DEFAULT_EXPLICIT_SCENE_POSITIVE_GUIDANCE].filter(Boolean).join(', '),
    negativePrompt: [negativePrompt, DEFAULT_EXPLICIT_SCENE_NEGATIVE_GUIDANCE, PROTECTED_EXPLICIT_SCENE_NEGATIVE_FLOOR].filter(Boolean).join(', '),
    applied: true,
  }
}

const GENERIC_ILLUSTRATOR_STYLE_TAGS = new Set([
  'semi-realistic', 'anime realism', 'manhwa style', 'painterly', 'soft shading',
  'detailed face', 'detailed eyes', 'delicate facial features', 'realistic proportions',
  'cinematic composition', 'warm lighting', 'golden hour', 'sunlight', 'backlighting',
  'rim lighting', 'soft glow', 'volumetric lighting', 'dust particles', 'depth of field',
  'bokeh', 'shallow depth of field', 'detailed hair', 'glossy hair', 'natural skin texture',
  'soft blush', 'highly detailed', 'masterpiece', 'best quality',
])

function stripGenericIllustratorStyleBoilerplate(value: string): string {
  const kept = value.split(',').map(part => cleanString(part)).filter(Boolean).filter(part => !GENERIC_ILLUSTRATOR_STYLE_TAGS.has(part.toLocaleLowerCase()))
  return kept.join(', ')
}

export async function composePromptForOpportunity(
  chatId: string,
  opportunity: ProseIllustrationOpportunity,
  content: string,
  settings: ProseIllustratorSettings,
  userId?: string,
): Promise<ProsePromptComposition> {
  const operationKey = `prose:${chatId}`
  const operationSerial = captureAbortableOperation(operationKey)
  assertAbortableOperationCurrent(operationKey, operationSerial)
  if (settings.perspectiveMode === 'persona-pov') {
    const personaPovContext = await resolvePersonaPovContext(chatId, userId)
    if (!personaPovContext.available) throw new Error('Persona POV cannot compose or dispatch an illustration because no chat-bound or active host Persona resolved.')
  }
  if (!settings.plannerConnectionId) throw new Error('Scene analyzer unavailable. Select a Prose Illustrator planner connection before composing a prompt.')
  const connection = await spindle.connections.get(settings.plannerConnectionId, userId)
  if (!connection) throw new Error('Prose Illustrator Sidecar connection not found.')
  const messages = await buildProsePromptComposerMessages(chatId, opportunity, content, settings, userId)
  const config = await getConfig(userId)
  assertAbortableOperationCurrent(operationKey, operationSerial)
  const raw = await generateParserText({ id: connection.id, name: connection.name, provider: connection.provider, model: connection.model }, {
    ...config,
    parserModel: settings.plannerModel || connection.model,
    parserParameters: settings.plannerParameters,
  }, messages, userId, chatId, undefined, 'composer')
  assertAbortableOperationCurrent(operationKey, operationSerial)
  const parsed = parseProsePromptCompositionJson(raw)
  const composerNamed = stringList(parsed.namedSubjects).length ? stringList(parsed.namedSubjects) : opportunity.namedSubjects
  const rawExpectedPeopleCount = clampInt(parsed.expectedPeopleCount, 0, 64, opportunity.expectedPeopleCount)
  const rawBackgroundPeople = cleanString(parsed.backgroundPeople) || opportunity.backgroundPeople
  validateIllustratorPeopleConstraints(settings, composerNamed, rawExpectedPeopleCount, rawBackgroundPeople)
  const named = composerNamed
  const limited = enforceMaximumCharacters(named, settings.maximumCharacters)
  const warnings = [...stringList(parsed.warnings), ...opportunity.omittedSubjects.map(name => `Opportunity omitted "${name}" because of Maximum Characters in Image.`), ...limited.omitted.map(name => `Prompt composer omitted "${name}" because of Maximum Characters in Image.`)]
  const rawPositivePrompt = cleanString(parsed.positivePrompt)
  if (!rawPositivePrompt) throw new Error('Sidecar prompt composer returned no positivePrompt.')
  const authoritativeScene = [opportunity.sceneSummary, opportunity.selectedExcerpt, content].map(cleanString).filter(Boolean).join(' ')
  const sexualEscalationRejected = hasUnrequestedExplicitEscalation(authoritativeScene, rawPositivePrompt)
  if (sexualEscalationRejected) warnings.push('Prompt composer added explicit sexual content that was absent from the selected scene; Relay used the authoritative scene instead.')
  const safeRawPositivePrompt = sexualEscalationRejected ? (cleanString(opportunity.sceneSummary) || cleanString(opportunity.selectedExcerpt) || compact(content, 1800)) : rawPositivePrompt
  const cleanedPositivePrompt = settings.stripGenericStyleBoilerplate ? stripGenericIllustratorStyleBoilerplate(safeRawPositivePrompt) : safeRawPositivePrompt
  const positivePrompt = [
    settings.customPromptPrefix,
    cleanedPositivePrompt,
    settings.perspectiveMode === 'solo-scene' ? `character-only composition, only ${limited.kept.join(', ') || 'the selected subject'} visible, no unrelated people` : '',
    settings.highResolutionModifier ? 'high-resolution polished rendering, cleaner anatomy, stronger identity consistency, refined detail while preserving the selected prose framing' : '',
  ].filter(Boolean).join(', ')
  const baseNegativePrompt = [settings.customNegativePrefix, cleanString(parsed.negativePrompt), settings.perspectiveMode === 'solo-scene' ? 'extra person, background people, crowd, unrelated character, duplicate person, additional face, silhouette person, reflected person' : ''].filter(Boolean).join(', ')
  const contextualSexual = applyContextualSexualGuidance(positivePrompt, baseNegativePrompt, authoritativeScene)
  const expectedPeopleCount = settings.perspectiveMode === 'solo-scene' ? limited.kept.length : settings.maximumCharacters > 0 ? Math.min(clampInt(parsed.expectedPeopleCount, 0, 64, opportunity.expectedPeopleCount), settings.maximumCharacters) : clampInt(parsed.expectedPeopleCount, 0, 64, opportunity.expectedPeopleCount)
  const backgroundPeople = settings.perspectiveMode === 'solo-scene' ? '' : cleanString(parsed.backgroundPeople) || opportunity.backgroundPeople
  validateIllustratorPeopleConstraints(settings, limited.kept, expectedPeopleCount, backgroundPeople)
  return {
    composerConnectionId: connection.id,
    composerModel: settings.plannerModel || connection.model,
    composedAt: Date.now(),
    sceneBrief: sexualEscalationRejected ? (cleanString(opportunity.sceneSummary) || cleanString(opportunity.selectedExcerpt)) : (cleanString(parsed.sceneBrief) || opportunity.sceneSummary),
    positivePrompt: contextualSexual.prompt,
    negativePrompt: contextualSexual.negativePrompt,
    framing: cleanString(parsed.framing) || opportunity.composition,
    peoplePolicy: settings.perspectiveMode === 'solo-scene' ? 'required' : ['required', 'allowed', 'forbidden'].includes(cleanString(parsed.peoplePolicy)) ? cleanString(parsed.peoplePolicy) as ProseIllustratorPeoplePolicy : opportunity.peoplePolicy,
    expectedPeopleCount,
    namedSubjects: limited.kept,
    omittedSubjects: [...new Set([...opportunity.omittedSubjects, ...limited.omitted])],
    backgroundPeople,
    location: cleanString(parsed.location) || opportunity.location,
    importantProps: stringList(parsed.importantProps).length ? stringList(parsed.importantProps).slice(0, 12) : opportunity.importantProps,
    continuityFactIdsUsed: stringList(parsed.continuityFactIdsUsed).slice(0, 16),
    referenceAssetIdsUsed: settings.reuseAcceptedReferences ? stringList(parsed.referenceAssetIdsUsed).slice(0, 16) : [],
    locationReferenceAssetIdsUsed: settings.reuseLocationReferences ? stringList(parsed.locationReferenceAssetIdsUsed).slice(0, 16) : [],
    highResolutionModifier: settings.highResolutionModifier,
    candidateCount: settings.defaultCandidateCount,
    imageAlignment: settings.imageAlignment,
    imageSize: settings.imageSize,
    perspectiveMode: settings.perspectiveMode,
    warnings,
    rawOutput: parsed,
  }
}

export async function buildProsePromptComposerMessages(
  chatId: string,
  opportunity: ProseIllustrationOpportunity,
  content: string,
  settings: ProseIllustratorSettings,
  userId?: string,
): Promise<Array<{ role: 'system' | 'user' | 'assistant'; content: string }>> {
  await ensureCanonicalSubjectsForGeneration(chatId, [], userId)
  const state = await getState(chatId, userId)
  const facts = selectProseContinuityFacts(state, chatId, settings, opportunity.namedSubjects || [])
  const references = selectProseReferenceAssets(state, chatId, settings, false)
  const locationReferences = selectProseReferenceAssets(state, chatId, settings, true)
  const personaPovContext = settings.perspectiveMode === 'persona-pov' ? await resolvePersonaPovContext(chatId, userId) : undefined
  return sidecarRegistryMessages(settings, 'composer', {
    composerVersion: PROSE_PROMPT_COMPOSER_VERSION,
    settings: {
      mode: settings.mode, maximumCharacters: settings.maximumCharacters,
      framingPrompt: effectiveFramingPrompt(settings), highResolutionModifier: settings.highResolutionModifier,
      candidateCount: settings.defaultCandidateCount,
      profile: opportunity.recommendedProfileId || settings.defaultPromptProfileId,
      aspectPolicy: opportunity.recommendedAspectRatio || settings.defaultAspectRatio,
      stripGenericStyleBoilerplate: settings.stripGenericStyleBoilerplate,
    },
    characterOnlyConstraint: characterOnlyConstraint(settings),
    personaPovContext,
    appearanceMemory: settings.appearanceMemoryEnabled ? formatSelectedAppearanceFacts(facts) : '',
    references, locationReferences, opportunity, activeMessage: compact(content, 5000),
  })
}

function parseProsePromptCompositionJson(raw: string): Record<string, unknown> {
  const clean = raw.trim().replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim()
  const json = clean.startsWith('{') ? clean : clean.slice(clean.indexOf('{'), clean.lastIndexOf('}') + 1)
  const parsed = JSON.parse(json) as Record<string, unknown>
  if (!cleanString(parsed.positivePrompt)) throw new Error('Prompt composer JSON must include positivePrompt.')
  return parsed
}

function validateIllustratorPeopleConstraints(
  settings: ProseIllustratorSettings,
  namedSubjects: string[],
  expectedPeopleCount: number,
  backgroundPeople = '',
): void {
  const normalizedNames = [...new Set(namedSubjects.map(cleanString).filter(Boolean))]
  if (expectedPeopleCount > settings.maximumCharacters || normalizedNames.length > settings.maximumCharacters) {
    throw new Error(`Maximum Characters in Image is ${settings.maximumCharacters}; the planned image contains ${Math.max(expectedPeopleCount, normalizedNames.length)} visible characters.`)
  }
  if (settings.perspectiveMode !== 'solo-scene') return
  const allowed = selectedCharacterOnlySubjects(settings)
  if (allowed.length !== 1) throw new Error('Character Only requires exactly one selected {{char}} before planning or generation.')
  const unrelated = normalizedNames.filter(name => name.toLocaleLowerCase() !== allowed[0].toLocaleLowerCase())
  if (unrelated.length) throw new Error(`Character Only rejected unrelated visible subjects: ${unrelated.join(', ')}.`)
  if (normalizedNames.length !== 1) throw new Error(`Character Only requires exactly one named subject: ${allowed[0]}.`)
  if (cleanString(backgroundPeople)) throw new Error('Character Only rejected background people. Remove crowds, silhouettes, reflected people, screen people, poster people, and unrelated figures.')
  if (expectedPeopleCount !== 1) throw new Error(`Character Only requires exactly one visible person, but the plan expects ${expectedPeopleCount}.`)
}

function isHandsOffProseMode(settings: ProseIllustratorSettings): boolean {
  return settings.mode === 'relay-planned' && settings.enabled && !settings.paused
}

function planFromOpportunity(
  opportunity: ProseIllustrationOpportunity,
  content: string,
  settings: ProseIllustratorSettings,
  composition: ProsePromptComposition,
): ProseIllustrationPlan {
  const paragraphs = proseParagraphs(content)
  const handsOffAuto = isHandsOffProseMode(settings)
  const insertionSide = settings.placementPolicy === 'end-of-message' ? 'end' : (opportunity.insertionSide || placementSideFromPolicy(settings.placementPolicy))
  const planId = `prose-${contentFingerprint(`${opportunity.opportunityId}:${composition.composedAt}`).replace(/[^a-z0-9]/gi, '-')}`
  return {
    planId,
    chatId: opportunity.chatId,
    messageId: opportunity.messageId,
    swipeId: opportunity.swipeId,
    opportunityId: opportunity.opportunityId,
    mode: settings.mode,
    shouldIllustrate: true,
    reason: opportunity.reason,
    sceneBrief: composition.sceneBrief || opportunity.sceneSummary,
    selectedExcerpt: opportunity.selectedExcerpt,
    anchor: proseAnchor(opportunity.messageId, opportunity.swipeId, content, paragraphs, opportunity.paragraphIndex, opportunity.selectedExcerpt, insertionSide),
    title: opportunity.title,
    caption: settings.showCaptions ? opportunity.title : '',
    altText: opportunity.title || 'Scene illustration',
    promptProfileId: opportunity.recommendedProfileId || settings.defaultPromptProfileId,
    aspectRatio: resolveAdaptiveAspect(opportunity.recommendedAspectRatio || settings.defaultAspectRatio, composition.sceneBrief || opportunity.sceneSummary, composition.expectedPeopleCount),
    peoplePolicy: composition.peoplePolicy,
    expectedPeopleCount: composition.expectedPeopleCount,
    namedSubjects: composition.namedSubjects,
    location: composition.location,
    timeOfDay: opportunity.timeOfDay,
    mood: opportunity.mood,
    importantProps: composition.importantProps,
    continuityFactIds: composition.continuityFactIdsUsed,
    referenceAssetIds: [...new Set([...composition.referenceAssetIdsUsed, ...composition.locationReferenceAssetIdsUsed])],
    planningConnectionId: opportunity.sidecarConnectionId,
    planningModel: opportunity.sidecarModel,
    planningTimestamp: Date.now(),
    warnings: composition.warnings,
    plannerOutput: opportunity.sidecarOutput,
    visualPlan: opportunity.visualPlan || cleanParameters(opportunity.sidecarOutput?.visualPlan),
    promptComposition: composition,
    candidateCount: handsOffAuto ? 1 : settings.defaultCandidateCount,
    highResolutionModifier: settings.highResolutionModifier,
    imageAlignment: settings.imageAlignment,
    imageSize: settings.imageSize,
    approvalRequired: !handsOffAuto,
    placementConfirmed: true,
    source: isHandsOffProseMode(settings) ? 'auto' : 'planner',
    status: handsOffAuto ? 'ready' : 'awaiting-approval',
  }
}

async function handleAutoOpportunityDispatch(chatId: string, opportunities: ProseIllustrationOpportunity[], userId?: string): Promise<void> {
  const operationKey = `prose:${chatId}`
  const operationSerial = captureAbortableOperation(operationKey)
  const state = await getState(chatId, userId)
  assertAbortableOperationCurrent(operationKey, operationSerial)
  const settings = proseSettingsForChat(state, chatId)
  if (!isHandsOffProseMode(settings) || !opportunities.length) return
  const requested = Math.max(1, Math.min(settings.illustrationsPerRun || 1, settings.maximumIllustrationsPerMessage))
  const seenBeats = new Set<string>()
  const selected = [...opportunities]
    .filter(item => item.status === 'proposed')
    .sort((a, b) => b.confidence - a.confidence)
    .filter(item => {
      const beat = `${item.messageId}:${item.swipeId}:${item.paragraphIndex}:${item.insertionSide}`
      if (seenBeats.has(beat)) return false
      seenBeats.add(beat)
      return true
    })
    .slice(0, requested)
  if (!selected.length) return
  await mutateState(chatId, userId, next => {
    appendStateLog(next, {
      severity: 'info', stage: 'prose-illustrator-auto', eventType: 'prose_hands_off_dispatch_started',
      chatId, messageId: selected[0].messageId, swipeId: selected[0].swipeId,
      message: `Relay-Planned selected ${selected.length} distinct prose beat${selected.length === 1 ? '' : 's'} for direct generation and inline insertion.`,
      details: { requested, selectedOpportunityIds: selected.map(item => item.opportunityId), paragraphIndexes: selected.map(item => item.paragraphIndex) },
    })
  })
  for (const opportunity of selected) {
    assertAbortableOperationCurrent(operationKey, operationSerial)
    const plan = await selectProseOpportunity(chatId, opportunity.opportunityId, userId)
    await generateProseIllustrationPlan(chatId, plan.planId, undefined, userId)
  }
}

async function generateProseIllustrationPlan(chatId: string, planId: string, nativeSnapshot?: NativeSettingsSnapshot, userId?: string): Promise<void> {
  const operationKey = `prose:${chatId}`
  const operationSerial = captureAbortableOperation(operationKey)
  const state = await getState(chatId, userId)
  assertAbortableOperationCurrent(operationKey, operationSerial)
  const plan = state.proseIllustrator.plans[planId]
  if (!plan) throw new Error('Prose illustration plan not found.')
  if (!plan.shouldIllustrate || !plan.sceneBrief) throw new Error(plan.reason || 'Planner did not approve this illustration.')
  const settings = proseSettingsForChat(state, chatId)
  if (!plan.placementConfirmed || settings.placementPolicy === 'ask' && !plan.placementConfirmed) {
    await mutateState(chatId, userId, next => {
      const stored = next.proseIllustrator.plans[planId]
      if (stored) { stored.status = 'draft'; stored.approvalRequired = true; stored.warnings = [...new Set([...(stored.warnings || []), 'Choose and confirm a prose placement before generating.'])] }
    })
    await sendState(userId, chatId)
    spindle.sendToFrontend({ type: 'relay_notice', level: 'warning', message: 'Placement was not resolved, so generation was skipped.' }, userId)
    return
  }
  const committed = countCommittedProseIllustrationsForMessage(state, chatId, plan.messageId, plan.swipeId)
  const active = countActiveProsePlansForMessage(state, chatId, plan.messageId, plan.swipeId) - 1
  if (committed + Math.max(0, active) >= settings.maximumIllustrationsPerMessage) {
    spindle.sendToFrontend({ type: 'relay_notice', level: 'warning', message: `Illustration limit reached for this message (${settings.maximumIllustrationsPerMessage}). Remove an existing illustration or raise the limit.` }, userId)
    return
  }
  if (!plan.promptComposition && plan.opportunityId && settings.plannerConnectionId) {
    const opportunity = state.proseIllustrator.opportunities[plan.opportunityId]
    const messageForCompose = await resolveMessage(chatId, plan.messageId)
    if (opportunity && messageForCompose) {
      const contentForCompose = strictSwipeContent(messageForCompose, plan.swipeId)
      plan.promptComposition = await composePromptForOpportunity(chatId, opportunity, contentForCompose, settings, userId)
      assertAbortableOperationCurrent(operationKey, operationSerial)
      plan.sceneBrief = plan.promptComposition.sceneBrief || plan.sceneBrief
      plan.namedSubjects = plan.promptComposition.namedSubjects
      plan.expectedPeopleCount = plan.promptComposition.expectedPeopleCount
      plan.peoplePolicy = plan.promptComposition.peoplePolicy
      plan.location = plan.promptComposition.location
      plan.importantProps = plan.promptComposition.importantProps
      plan.referenceAssetIds = [...new Set([...plan.promptComposition.referenceAssetIdsUsed, ...plan.promptComposition.locationReferenceAssetIdsUsed])]
      plan.candidateCount = plan.promptComposition.candidateCount
      plan.warnings = [...new Set([...(plan.warnings || []), ...(plan.promptComposition.warnings || [])])]
      await mutateState(chatId, userId, next => { next.proseIllustrator.plans[plan.planId] = plan })
    }
  }
  const message = await resolveMessage(chatId, plan.messageId)
  if (!message) throw new Error('Message not found.')
  const content = strictSwipeContent(message, plan.swipeId)
  const pending = renderProsePendingMarker(plan)
  const placement = insertProseMarker(content, plan.anchor, pending)
  if (!placement.content || placement.ambiguous) {
    await mutateState(chatId, userId, next => {
      plan.status = 'ready'
      plan.warnings.push(placement.warning || 'Prose anchor is ambiguous. The illustration was left for manual placement.')
      appendStateLog(next, { severity: 'warning', stage: 'prose-illustrator-placement', eventType: 'prose_anchor_ambiguous', chatId, messageId: plan.messageId, swipeId: plan.swipeId, message: 'Prose anchor was ambiguous; generation did not start.', details: { plan } })
    })
    await sendState(userId, chatId)
    return
  }
  assertAbortableOperationCurrent(operationKey, operationSerial)
  const now = Date.now()
  await mutateState(chatId, userId, next => {
    const key = slotKey({ chatId, messageId: plan.messageId, swipeId: plan.swipeId, requestId: plan.planId, slot: 'illustration' })
    const record: SlotRecord = {
      key, chatId, messageId: plan.messageId, swipeId: plan.swipeId, requestId: plan.planId,
      target: 'prose.illustration', imageIntent: 'auto', targetApp: 'prose', slot: 'illustration', status: 'queued',
      originalSceneBrief: plan.sceneBrief, originalNegativePrompt: '', originalRequestXml: pending,
      alt: plan.altText || plan.title || 'Scene illustration', caption: plan.caption, count: 1,
      requestAspect: plan.aspectRatio, createdAt: now, discoveredAt: now, registeredAt: now, queuedAt: now, updatedAt: now,
      selectedPromptProfileId: plan.promptProfileId, proseIllustrationId: plan.planId, prosePlanId: plan.planId,
      proseAnchor: plan.anchor, proseSynthetic: true, attempts: [], promptPipeline: emptyPromptPipeline({ caption: plan.caption, originalNegativePrompt: '' }), history: [],
      composedPositivePrompt: plan.promptComposition?.positivePrompt,
      composedNegativePrompt: plan.promptComposition?.negativePrompt,
      prosePromptComposition: plan.promptComposition,
    }
    next.slots[key] = record
    next.proseIllustrator.records[plan.planId] = {
      illustrationId: plan.planId, requestId: plan.planId, slotKey: key, planId: plan.planId,
      anchor: plan.anchor, status: 'queued', createdAt: now, inserted: false, insertionVerified: false, removed: false,
    }
    plan.status = isHandsOffProseMode(settings) ? 'ready' : 'candidate-review'
    plan.approvalRequired = false
    next.proseIllustrator.plans[plan.planId] = plan
    next.queueDirector.jobStatuses[key] = next.queueDirector.pausedAfterCurrent ? 'paused' : 'queued'
    appendStateLog(next, { severity: 'info', stage: 'prose-illustrator', eventType: 'prose_illustration_queued', chatId, messageId: plan.messageId, swipeId: plan.swipeId, requestId: plan.planId, target: 'prose.illustration', message: 'Queued synthetic prose illustration through the synthetic prose slot.', details: { plan } })
  })
  await sendState(userId, chatId)
  const proseSlotKey = slotKey({ chatId, messageId: plan.messageId, swipeId: plan.swipeId, requestId: plan.planId, slot: 'illustration' })
  if (isHandsOffProseMode(settings)) {
    assertAbortableOperationCurrent(operationKey, operationSerial)
    await patchSwipeContent(chatId, message, plan.swipeId, placement.content)
    const latest = await getState(chatId, userId)
    const autoRecord = latest.slots[proseSlotKey]
    if (!autoRecord) throw new Error('Relay-Planned could not resolve the synthetic prose slot after placement.')
    assertAbortableOperationCurrent(operationKey, operationSerial)
    await runJob(jobFromRecord(autoRecord), {
      replaceExisting: false,
      reparse: true,
      triggerType: 'initial',
      nativeSnapshot,
      highResMode: plan.highResolutionModifier ?? settings.highResolutionModifier,
      forceImagePreview: settings.relayInsertionMode === 'review',
      automaticDispatch: true,
    }, userId)
    return
  }
  assertAbortableOperationCurrent(operationKey, operationSerial)
  await startRelayBatch(chatId, nativeSnapshot, userId, normalizeCandidateCount(plan.candidateCount, settings.defaultCandidateCount), undefined, [proseSlotKey], { highResModeOverride: plan.highResolutionModifier ?? settings.highResolutionModifier, source: 'prose-illustrator' })
}

async function removeProseIllustration(chatId: string, illustrationId: string, userId?: string): Promise<void> {
  await mutateState(chatId, userId, async state => {
    const record = state.proseIllustrator.records[illustrationId]
    const plan = state.proseIllustrator.plans[record?.planId || illustrationId]
    if (!record || !plan) throw new Error('Prose illustration not found.')
    const message = await resolveMessage(chatId, plan.messageId)
    if (!message) throw new Error('Message not found.')
    const content = strictSwipeContent(message, plan.swipeId)
    const slot = state.slots[record.slotKey]
    const marker = slot ? slotComment(slot, slot.slot) : slotComment(jobFromProsePlan(plan, renderProsePendingMarker(plan)), 'illustration')
    const next = removeOwnedProseSegment(content, marker, renderProsePendingMarker(plan))
    if (next === content) throw new Error('No owned prose illustration marker was found in the message.')
    await patchSwipeContent(chatId, message, plan.swipeId, next)
    record.removed = true
    record.status = 'removed'
    record.inserted = false
    if (slot) { slot.orphaned = true; slot.orphanReason = 'Prose illustration was removed from the message by the user.'; slot.updatedAt = Date.now() }
    appendStateLog(state, { severity: 'info', stage: 'prose-illustrator', eventType: 'prose_illustration_removed', chatId, messageId: plan.messageId, swipeId: plan.swipeId, requestId: record.requestId, slot: 'illustration', target: 'prose.illustration', message: 'Removed only the owned inline prose illustration marker.' })
  })
  await sendState(userId, chatId)
}

function normalizeProsePlan(
  chatId: string,
  messageId: string,
  swipeId: number,
  content: string,
  settings: ProseIllustratorSettings,
  raw: Record<string, unknown>,
  meta: {
    mode: ProseIllustratorMode
    planningConnectionId: string | null
    planningModel: string
    plannerOutput: Record<string, unknown>
    source: ProseIllustrationPlan['source']
  },
): ProseIllustrationPlan {
  const paragraphs = proseParagraphs(content)
  const shouldIllustrate = raw.shouldIllustrate === true
  const selectedExcerpt = cleanString(raw.selectedExcerpt) || paragraphs[0] || compact(content, 400)
  const paragraphIndex = clampInt(raw.paragraphIndex, 0, Math.max(0, paragraphs.length - 1), bestParagraphIndex(paragraphs, selectedExcerpt))
  const insertionRaw = cleanString(raw.insertionSide)
  const insertionSide = ['before', 'after', 'end'].includes(insertionRaw) ? insertionRaw as ProseIllustrationAnchor['insertionSide'] : placementSideFromPolicy(settings.placementPolicy)
  const planId = `prose-${contentFingerprint(`${chatId}:${messageId}:${swipeId}:${selectedExcerpt}:${Date.now()}`).replace(/[^a-z0-9]/gi, '-')}`
  const peoplePolicyRaw = cleanString(raw.peoplePolicy)
  const namedSubjects = stringList(raw.namedSubjects).slice(0, 8)
  const expectedPeopleCount = clampInt(raw.expectedPeopleCount, 0, 8, 0)
  if (shouldIllustrate) validateIllustratorPeopleConstraints(settings, namedSubjects, expectedPeopleCount, cleanString(raw.backgroundPeople))
  return {
    planId, chatId, messageId, swipeId, mode: meta.mode, perspectiveMode: settings.perspectiveMode, shouldIllustrate,
    reason: cleanString(raw.reason) || (shouldIllustrate ? 'Planner selected a visual beat.' : 'Planner did not select a visual beat.'),
    sceneBrief: cleanString(raw.sceneBrief),
    selectedExcerpt,
    anchor: proseAnchor(messageId, swipeId, content, paragraphs, paragraphIndex, selectedExcerpt, insertionSide),
    title: cleanString(raw.title) || 'Prose Illustration',
    caption: settings.showCaptions ? cleanString(raw.caption) : '',
    altText: cleanString(raw.altText) || 'Scene illustration',
    promptProfileId: cleanString(raw.promptProfileId) || settings.defaultPromptProfileId,
    aspectRatio: resolveAdaptiveAspect(cleanString(raw.aspectRatio) || settings.defaultAspectRatio, cleanString(raw.sceneBrief) || selectedExcerpt, expectedPeopleCount),
    peoplePolicy: ['required', 'allowed', 'forbidden'].includes(peoplePolicyRaw) ? peoplePolicyRaw as ProseIllustrationPlan['peoplePolicy'] : 'allowed',
    expectedPeopleCount,
    namedSubjects,
    location: cleanString(raw.location),
    timeOfDay: cleanString(raw.timeOfDay),
    mood: cleanString(raw.mood),
    importantProps: stringList(raw.importantProps).slice(0, 12),
    continuityFactIds: stringList(raw.continuityFactIds).slice(0, 16),
    referenceAssetIds: stringList(raw.referenceAssetIds).slice(0, 16),
    planningConnectionId: meta.planningConnectionId,
    planningModel: meta.planningModel,
    planningTimestamp: Date.now(),
    warnings: validateProsePlanWarnings(raw, settings),
    plannerOutput: meta.plannerOutput,
    imageAlignment: settings.imageAlignment,
    imageSize: settings.imageSize,
    source: meta.source,
    placementConfirmed: settings.placementPolicy !== 'ask' && Boolean(insertionRaw),
    status: shouldIllustrate ? 'ready' : 'rejected',
  }
}

function storeProsePlan(state: StateFile, plan: ProseIllustrationPlan): void {
  state.proseIllustrator.plans[plan.planId] = plan
  state.proseIllustrator.activePlanIdByChat[plan.chatId] = plan.planId
  appendStateLog(state, {
    severity: plan.shouldIllustrate ? 'info' : 'warning',
    stage: 'prose-illustrator-planner',
    eventType: 'prose_illustration_planned',
    chatId: plan.chatId,
    messageId: plan.messageId,
    swipeId: plan.swipeId,
    requestId: plan.planId,
    target: 'prose.illustration',
    message: plan.shouldIllustrate ? 'Prose Illustrator plan is ready.' : 'Prose Illustrator planner declined this beat.',
    details: { plan },
  })
}

function parseProsePlannerJson(raw: string): Record<string, unknown> {
  const clean = raw.trim().replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim()
  const json = clean.startsWith('{') ? clean : clean.slice(clean.indexOf('{'), clean.lastIndexOf('}') + 1)
  const parsed = JSON.parse(json) as Record<string, unknown>
  if (typeof parsed.shouldIllustrate !== 'boolean') throw new Error('Planner JSON must include boolean shouldIllustrate.')
  if (parsed.shouldIllustrate && !cleanString(parsed.sceneBrief)) throw new Error('Planner approved illustration without sceneBrief.')
  return parsed
}

function validateProsePlanWarnings(raw: Record<string, unknown>, settings: ProseIllustratorSettings): string[] {
  const warnings: string[] = []
  if (!cleanString(raw.selectedExcerpt)) warnings.push('Planner omitted selectedExcerpt; Relay selected the nearest available paragraph.')
  if (!cleanString(raw.altText)) warnings.push('Planner omitted altText; Relay used a generic scene illustration label.')
  if (settings.maximumCharacters > 0 && stringList(raw.namedSubjects).length > settings.maximumCharacters) warnings.push('HARD LIMIT: planner named more characters than Maximum Characters in Image; extras are rejected before generation.')
  if (settings.perspectiveMode === 'solo-scene') {
    const allowed = selectedCharacterOnlySubjects(settings).map(name => name.toLocaleLowerCase())
    const unrelated = stringList(raw.namedSubjects).filter(name => !allowed.includes(name.toLocaleLowerCase()))
    if (unrelated.length) warnings.push(`CHARACTER ONLY REJECTED unrelated visible subjects: ${unrelated.join(', ')}`)
  }
  return warnings
}

export async function buildProsePlannerMessages(
  chatId: string,
  messageId: string,
  swipeId: number,
  content: string,
  paragraphs: string[],
  settings: ProseIllustratorSettings,
  userId?: string,
): Promise<Array<{ role: 'system' | 'user' | 'assistant'; content: string }>> {
  const messages = await spindle.chat.getMessages(chatId) as ChatMessage[]
  const targetIndex = Math.max(0, messages.findIndex(message => message.id === messageId))
  const recent = messages.slice(Math.max(0, targetIndex - settings.contextMessageCount), targetIndex)
    .filter(message => message.role === 'user' || message.role === 'assistant')
    .map(message => sanitizeRecentVisualContext(getSwipeContent(message, activeSwipeId(message))))
    .filter(Boolean)
    .slice(-settings.contextMessageCount)
  await ensureCanonicalSubjectsForGeneration(chatId, [], userId)
  const state = await getState(chatId, userId)
  const namedSubjects = settings.perspectiveMode === 'solo-scene' ? selectedCharacterOnlySubjects(settings) : extractCharacterCandidates(`${content} ${recent.join(' ')}`)
  const facts = selectProseContinuityFacts(state, chatId, settings, namedSubjects)
  const references = Object.values(state.assetLibrary.assets || {})
    .filter(asset => asset.chatId === chatId && asset.status === 'available' && (asset.visualReference || settings.reuseAcceptedReferences))
    .slice(0, 8)
  const personaPovContext = settings.perspectiveMode === 'persona-pov' ? await resolvePersonaPovContext(chatId, userId) : undefined
  return sidecarRegistryMessages(settings, 'planner', {
    identity: { chatId, messageId, swipeId },
    settings: {
      mode: settings.mode, framingPrompt: effectiveFramingPrompt(settings),
      maximumCharacters: settings.maximumCharacters, placementPolicy: settings.placementPolicy,
      profile: settings.defaultPromptProfileId, aspectPolicy: settings.defaultAspectRatio,
    },
    characterOnlyConstraint: characterOnlyConstraint(settings),
    personaPovContext,
    appearanceMemory: settings.appearanceMemoryEnabled ? formatSelectedAppearanceFacts(facts) : '',
    references, recentContext: recent,
    paragraphs: paragraphs.map((paragraph, index) => ({ index, text: compact(paragraph, 900) })),
  })
}

const PROSE_NON_NARRATIVE_ROOTS = [...new Set([
  ...NATIVE_SURFACE_ROOT_TAGS,
  'reverie-illustration',
  'image_request',
  'image_request_error',
  'scene_image',
  'parallel',
  'adventurecard',
  'payload',
])]
const PROSE_NON_NARRATIVE_BLOCK_RE = new RegExp(
  `<(${PROSE_NON_NARRATIVE_ROOTS.map(escapeRegExp).join('|')})\\b[^>]*>[\\s\\S]*?<\\/\\1\\s*>`,
  'gi',
)

export function proseAnalysisText(content: string): string {
  let value = content || ''
  for (let pass = 0; pass < 4; pass += 1) {
    const next = value.replace(PROSE_NON_NARRATIVE_BLOCK_RE, ' ')
    if (next === value) break
    value = next
  }
  return value
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/!\[reverie-relay\]\([^)\s]+\)/gi, ' ')
}

export function isEligibleProseContent(content: string, settings: ProseIllustratorSettings): boolean {
  if (!content) return false
  const narrative = settings.skipUtilities ? proseAnalysisText(content) : content
  if (settings.skipOoc && /\b(OOC|out of character|system note|developer handoff)\b/i.test(prosePlainText(narrative))) return false
  if (settings.skipTestFixtures && /\b(integration test|debug fixture|test-phone|router metadata|smoke test|lifecycle smoke)\b/i.test(prosePlainText(narrative))) return false
  const text = prosePlainText(narrative)
  if (settings.skipShortMessages && text.length < settings.minimumMessageLength) return false
  return proseParagraphs(narrative).length > 0
}

function proseAutoIdempotenceKey(chatId: string, messageId: string, content: string, settings: ProseIllustratorSettings): string {
  return `${chatId}:${messageId}:${contentFingerprint(content)}:${settings.mode}:prose-planner-v1`
}

function prosePlainText(content: string): string {
  return proseAnalysisText(content)
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function proseParagraphs(content: string): string[] {
  return proseAnalysisText(content)
    .split(/\n\s*\n+/)
    .map(part => prosePlainText(part))
    .filter(Boolean)
}

function bestParagraphIndex(paragraphs: string[], excerpt: string): number {
  if (!paragraphs.length) return 0
  const needle = prosePlainText(excerpt).toLocaleLowerCase()
  const exact = paragraphs.findIndex(paragraph => paragraph.toLocaleLowerCase().includes(needle) || needle.includes(paragraph.toLocaleLowerCase()))
  if (exact >= 0) return exact
  return paragraphs.map((paragraph, index) => ({ index, score: contextRelevanceScore(paragraph, excerpt, []) })).sort((a, b) => b.score - a.score)[0]?.index || 0
}

function proseAnchor(
  messageId: string,
  swipeId: number,
  content: string,
  paragraphs: string[],
  paragraphIndex: number,
  selectedExcerpt: string,
  insertionSide: ProseIllustrationAnchor['insertionSide'],
): ProseIllustrationAnchor {
  const selected = paragraphs[paragraphIndex] || selectedExcerpt || prosePlainText(content)
  return {
    messageId,
    swipeId,
    paragraphIndex,
    paragraphFingerprint: contentFingerprint(selected),
    previousParagraphFingerprint: paragraphs[paragraphIndex - 1] ? contentFingerprint(paragraphs[paragraphIndex - 1]) : undefined,
    nextParagraphFingerprint: paragraphs[paragraphIndex + 1] ? contentFingerprint(paragraphs[paragraphIndex + 1]) : undefined,
    insertionSide,
    sourceContentFingerprint: contentFingerprint(content),
    selectedExcerpt: compact(selectedExcerpt || selected, 700),
  }
}

function placementSideFromPolicy(policy: ProseIllustratorSettings['placementPolicy']): ProseIllustrationAnchor['insertionSide'] {
  if (policy === 'before-beat') return 'before'
  if (policy === 'end-of-message') return 'end'
  return 'after'
}

function renderProsePendingMarker(plan: ProseIllustrationPlan): string {
  const job = jobFromProsePlan(plan, '')
  return `${slotComment(job, 'illustration')}\n<scene_image pending="true" requestId="${escapeForMarker(plan.planId)}" planId="${escapeForMarker(plan.planId)}" anchor="${escapeForMarker(plan.anchor.paragraphFingerprint)}" alt="${escapeForMarker(plan.altText || 'Scene illustration')}">${escapeForMarker(plan.title || 'Generating scene illustration...')}</scene_image>`
}

function insertProseMarker(content: string, anchor: ProseIllustrationAnchor, marker: string): { content: string; ambiguous: boolean; warning?: string } {
  // The exact owned marker always wins. This keeps retries and out-of-order completions idempotent.
  if (content.includes(marker)) return { content, ambiguous: false }
  if (anchor.insertionSide === 'end') return { content: `${content.trimEnd()}\n\n${marker}`, ambiguous: false }

  const paragraphs = splitRawParagraphs(content)
  const normalized = paragraphs.map(part => prosePlainText(part))
  const fingerprints = normalized.map(contentFingerprint)
  let index = -1
  let warning: string | undefined

  // 1. Exact paragraph fingerprint.
  const exactIndexes = fingerprints.map((fingerprint, candidate) => fingerprint === anchor.paragraphFingerprint ? candidate : -1).filter(candidate => candidate >= 0)
  if (exactIndexes.length === 1) index = exactIndexes[0]

  // 2. Stable neighbouring fingerprints. This survives edits to the selected paragraph itself.
  if (index < 0 && (anchor.previousParagraphFingerprint || anchor.nextParagraphFingerprint)) {
    const neighbourMatches = normalized.map((_, candidate) => {
      const previousMatches = !anchor.previousParagraphFingerprint || fingerprints[candidate - 1] === anchor.previousParagraphFingerprint
      const nextMatches = !anchor.nextParagraphFingerprint || fingerprints[candidate + 1] === anchor.nextParagraphFingerprint
      const evidenceCount = Number(Boolean(anchor.previousParagraphFingerprint)) + Number(Boolean(anchor.nextParagraphFingerprint))
      const matchedCount = Number(Boolean(anchor.previousParagraphFingerprint) && previousMatches) + Number(Boolean(anchor.nextParagraphFingerprint) && nextMatches)
      return evidenceCount > 0 && matchedCount === evidenceCount ? candidate : -1
    }).filter(candidate => candidate >= 0)
    if (neighbourMatches.length === 1) {
      index = neighbourMatches[0]
      warning = 'The selected paragraph changed; placement was recovered from its neighbouring paragraphs.'
    }
  }

  // 3. Selected excerpt matching.
  if (index < 0 && anchor.selectedExcerpt) {
    const excerpt = prosePlainText(anchor.selectedExcerpt).toLocaleLowerCase().trim()
    const matches = normalized.map((paragraph, candidate) => {
      const text = paragraph.toLocaleLowerCase().trim()
      if (!text || !excerpt) return -1
      return text.includes(excerpt) || excerpt.includes(text) ? candidate : -1
    }).filter(candidate => candidate >= 0)
    if (matches.length === 1) {
      index = matches[0]
      warning = 'The prose anchor was recovered from its selected excerpt.'
    }
  }

  // 4. Validated paragraph index fallback. Never use a raw index when the surrounding content contradicts it.
  if (index < 0 && Number.isInteger(anchor.paragraphIndex) && anchor.paragraphIndex >= 0 && anchor.paragraphIndex < paragraphs.length) {
    const candidate = anchor.paragraphIndex
    const previousMatches = !anchor.previousParagraphFingerprint || fingerprints[candidate - 1] === anchor.previousParagraphFingerprint
    const nextMatches = !anchor.nextParagraphFingerprint || fingerprints[candidate + 1] === anchor.nextParagraphFingerprint
    const excerpt = prosePlainText(anchor.selectedExcerpt || '').toLocaleLowerCase().trim()
    const candidateText = normalized[candidate].toLocaleLowerCase().trim()
    const excerptMatches = Boolean(excerpt && candidateText && (candidateText.includes(excerpt) || excerpt.includes(candidateText)))
    if (previousMatches || nextMatches || excerptMatches || fingerprints[candidate] === anchor.paragraphFingerprint) {
      index = candidate
      warning = 'The prose anchor was recovered from its validated paragraph index.'
    }
  }

  if (index < 0) {
    return {
      content: '',
      ambiguous: true,
      warning: 'Could not resolve the selected prose paragraph. Exact fingerprint, neighbouring fingerprints, excerpt, and validated paragraph index all failed.',
    }
  }
  const insertAt = anchor.insertionSide === 'before' ? index : index + 1
  const next = [...paragraphs.slice(0, insertAt), marker, ...paragraphs.slice(insertAt)].join('\n\n')
  return { content: next, ambiguous: false, warning }
}

function insertProseCandidateAtStoredAnchor(content: string, record: SlotRecord, job: RouterJob, result: SlotGenerationResult): string | null {
  if (record.target !== 'prose.illustration' || !record.proseSynthetic || !record.proseAnchor) return null
  const placement = insertProseMarker(content, record.proseAnchor, renderResolvedMarkup(job, [result]))
  return placement.content && !placement.ambiguous ? placement.content : null
}

function splitRawParagraphs(content: string): string[] {
  const parts = content.split(/\n\s*\n+/)
  return parts.length ? parts : [content]
}

function removeOwnedProseSegment(content: string, marker: string, pending: string): string {
  const escaped = escapeRegExp(marker)
  const re = new RegExp(`\\n?\\n?${escaped}\\s*(?:<scene_image\\b[\\s\\S]*?<\\/scene_image>|!\\[reverie-relay\\]\\([^\\)\\s]+\\))\\n?`, 'i')
  const next = content.replace(re, '\n\n').replace(/\n{3,}/g, '\n\n').trim()
  if (next !== content) return next
  return content.replace(pending, '').replace(/\n{3,}/g, '\n\n').trim()
}

function jobFromProsePlan(plan: ProseIllustrationPlan, pendingMarker: string): RouterJob {
  return {
    chatId: plan.chatId,
    messageId: plan.messageId,
    swipeId: plan.swipeId,
    requestId: plan.planId,
    target: 'prose.illustration',
    intent: 'auto',
    count: 1,
    slots: ['illustration'],
    alt: plan.altText || 'Scene illustration',
    caption: plan.caption,
    aspect: plan.aspectRatio,
    originalSceneBrief: proseSceneBrief(plan),
    originalNegativePrompt: '',
    originalRequestXml: pendingMarker,
    promptProfileId: plan.promptProfileId,
    proseIllustrationId: plan.planId,
    prosePlanId: plan.planId,
    proseAnchor: plan.anchor,
    proseImageAlignment: plan.imageAlignment || 'center',
    proseImageSize: plan.imageSize || 'medium',
    synthetic: true,
    composedPositivePrompt: plan.promptComposition?.positivePrompt,
    composedNegativePrompt: plan.promptComposition?.negativePrompt,
    prosePromptComposition: plan.promptComposition,
  }
}

function proseSceneBrief(plan: ProseIllustrationPlan): string {
  return [
    plan.sceneBrief,
    plan.namedSubjects.length ? `Named subjects: ${plan.namedSubjects.join(', ')}` : '',
    plan.location ? `Location: ${plan.location}` : '',
    plan.timeOfDay ? `Time of day: ${plan.timeOfDay}` : '',
    plan.mood ? `Mood: ${plan.mood}` : '',
    plan.importantProps.length ? `Important props: ${plan.importantProps.join(', ')}` : '',
    `This is a visual-novel-style inline prose illustration anchored to this excerpt: ${plan.selectedExcerpt}`,
  ].filter(Boolean).join('\n')
}

function escapeForMarker(value: string): string {
  return String(value || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

async function discardPendingPlacement(key: string, userId?: string): Promise<void> {
  const { chatId, record: selected } = await getRecordByKey(key, userId)
  await mutateState(chatId, userId, state => {
    const records = Object.values(state.slots).filter(record => record.messageId === selected.messageId
      && record.swipeId === selected.swipeId && record.requestId === selected.requestId && Boolean(record.pendingPlacement))
    for (const record of records) {
      record.pendingPlacement = undefined
      record.placementFailure = undefined
      record.status = record.imageUrl ? 'completed' : 'recovered-pending'
      record.updatedAt = Date.now()
      appendStateLog(state, {
        severity: 'info', stage: 'placement-discarded', eventType: 'placement_discarded', chatId,
        messageId: record.messageId, swipeId: record.swipeId, requestId: record.requestId, slot: record.slot,
        target: record.target, message: 'Discarded the unplaced generated image without changing message content.',
      })
    }
  })
  await sendState(userId, chatId)
}

async function applyJobFailure(job: RouterJob, error: string, stage: 'provider-validation' | 'parser-failed' | 'image-generation-failed', userId?: string): Promise<void> {
  await mutateJobState(job, userId, async state => {
    const now = Date.now()
    for (const slot of job.slots) {
      const record = state.slots[slotKey({ ...job, slot })]
      record.status = 'failed'; record.error = error; record.errorToastKey = `${record.key}:${record.attemptNumber || 0}:${error}`
      record.updatedAt = now; record.failedAt = now; finishAttempt(record, 'failed', now, error)
      if (record.proseIllustrationId && state.proseIllustrator.records[record.proseIllustrationId]) {
        const proseRecord = state.proseIllustrator.records[record.proseIllustrationId]
        proseRecord.status = 'failed'
        proseRecord.error = error
      }
      appendStateLog(state, {
        severity: 'error', stage, eventType: stage.replace(/-/g, '_'), chatId: job.chatId, messageId: job.messageId,
        swipeId: job.swipeId, requestId: job.requestId, slot, target: job.target, attemptNumber: record.attemptNumber,
        triggerType: record.triggerType, provider: record.imageProvider, connectionId: record.imageConnectionId,
        connectionName: record.imageConnectionName, model: record.imageModel, errorMessage: error,
        durationMs: currentAttempt(record)?.durationMs, message: `Job failed during ${stage}.`,
      })
    }
    if (isJobCancelled(job)) throw new JobCancelledError()
    const message = await resolveMessage(job.chatId, job.messageId)
    if (message) {
      const content = getSwipeContent(message, job.swipeId)
      if (content.includes(job.originalRequestXml)) {
        if (isJobCancelled(job)) throw new JobCancelledError()
        const next = content.replace(job.originalRequestXml, renderFailureMarkup(job, 'Image generation failed. Open Reverie Relay to retry.'))
        await patchSwipeContent(job.chatId, message, job.swipeId, next)
      }
    }
  })
  await sendState(userId, job.chatId)
}

async function forceMarkFailed(job: RouterJob, error: string, userId?: string): Promise<void> {
  if (isJobCancelled(job)) return
  await mutateState(job.chatId, userId, state => {
    const now = Date.now()
    for (const slot of job.slots) {
      const record = state.slots[slotKey({ ...job, slot })]
      if (!record) continue
      record.status = 'failed'; record.error = error; record.errorToastKey = `${record.key}:${record.attemptNumber || 0}:${error}`
      record.updatedAt = now; record.failedAt = now; finishAttempt(record, 'failed', now, error)
      if (record.proseIllustrationId && state.proseIllustrator.records[record.proseIllustrationId]) {
        const proseRecord = state.proseIllustrator.records[record.proseIllustrationId]
        proseRecord.status = 'failed'
        proseRecord.error = error
      }
    }
  })
  await sendState(userId, job.chatId)
}

async function restoreHistory(chatId: string, key: string, historyIndex: number, userId?: string): Promise<void> {
  await mutateState(chatId, userId, async state => {
    const record = state.slots[key]
    if (!record) throw new Error('Slot not found.')
    const snapshot = record.history[historyIndex]
    if (!snapshot) throw new Error('History entry not found.')

    const message = await resolveMessage(record.chatId, record.messageId)
    if (!message) throw new Error('Message not found.')

    const content = getSwipeContent(message, record.swipeId)
    const next = replaceImageUrlAfterSlotComment(content, record, snapshot.imageUrl)
    if (!next) throw new Error('Could not find the current image slot in the message.')
    await patchSwipeContent(record.chatId, message, record.swipeId, next)

    const now = Date.now()
    const current = snapshotFromRecord(record, now)
    if (current) record.history.unshift(current)

    record.imageId = snapshot.imageId
  record.imageUrl = snapshot.imageUrl
  record.imageWidth = snapshot.imageWidth
  record.imageHeight = snapshot.imageHeight
  record.aspectRatio = snapshot.aspectRatio
  record.resolvedPositivePrompt = snapshot.resolvedPositivePrompt
  record.resolvedNegativePrompt = snapshot.resolvedNegativePrompt
  record.promptMode = snapshot.promptMode
  record.promptPresetId = snapshot.promptPresetId
  record.parserUsed = snapshot.parserUsed
  record.parserOutput = snapshot.parserOutput
  record.parserConnectionId = snapshot.parserConnectionId
  record.parserModel = snapshot.parserModel
  record.parserParameters = snapshot.parserParameters
  record.imageConnectionId = snapshot.imageConnectionId
  record.imageConnectionName = snapshot.imageConnectionName
  record.imageProvider = snapshot.imageProvider
  record.imageModel = snapshot.imageModel
  record.imageParameters = snapshot.imageParameters
  record.nativeImageSettings = snapshot.nativeImageSettings
  record.nativeSettingsCapturedAt = snapshot.nativeSettingsCapturedAt
  record.connectionDefaultParameters = snapshot.connectionDefaultParameters
  record.slotOverrides = snapshot.slotOverrides
  record.finalImageParameters = snapshot.finalImageParameters
  record.finalImageRequest = snapshot.finalImageRequest
  record.finalImageSettingsSource = snapshot.finalImageSettingsSource
  record.promptPipeline = snapshot.promptPipeline
  record.nativeActiveLoraPreset = snapshot.nativeActiveLoraPreset
  record.effectiveAppliedLoraPreset = snapshot.effectiveAppliedLoraPreset
  record.lorasSentToProvider = snapshot.lorasSentToProvider
  record.loraBaseTags = snapshot.loraBaseTags
  record.baseTagsAddedToPrompt = snapshot.baseTagsAddedToPrompt
  record.omittedBaseTags = snapshot.omittedBaseTags
  record.highResMode = snapshot.highResMode
  record.highResRetainedBaseTags = snapshot.highResRetainedBaseTags
  record.highResPreservedFramingCues = snapshot.highResPreservedFramingCues
  record.loraOmittedFields = snapshot.loraOmittedFields
  record.promptProfile = snapshot.promptProfile
  record.selectedPromptProfileId = snapshot.promptProfile?.selectedProfileId
  record.regenerationIntent = snapshot.regenerationIntent
  record.diagnostic = snapshot.diagnostic
  record.includedContinuityFacts = snapshot.includedContinuityFacts
  record.excludedContinuityFacts = snapshot.excludedContinuityFacts
  record.continuityStrength = snapshot.continuityStrength
  record.assetId = snapshot.assetId || assetIdForImage(snapshot.imageId, snapshot.imageUrl)
  record.currentVersionId = snapshot.versionId || versionIdForSnapshot(record.key, snapshot)
  record.rootVersionId = snapshot.rootVersionId || record.rootVersionId || record.currentVersionId
  record.versionTreeId = record.versionTreeId || versionTreeIdForSlot(record.key)
  record.triggerType = 'restore'
  record.status = 'completed'
  record.error = undefined
  record.updatedAt = now
  record.lastRestoredAt = now
  record.completedAt = now
    markRestoredVersion(state, record, snapshot, now)
    record.history.splice(historyIndex + 1, 1)
    appendStateLog(state, {
      severity: 'info', stage: 'restore', eventType: 'history_restored', chatId, messageId: record.messageId,
      swipeId: record.swipeId, requestId: record.requestId, slot: record.slot, target: record.target,
      attemptNumber: record.attemptNumber, triggerType: 'restore', provider: record.imageProvider, model: record.imageModel,
      message: 'Restored a previous slot image without regenerating.',
    })
  })
  await sendState(userId, chatId)
}

async function handleAssetLibraryAction(payload: Extract<FrontendMessage, { type: 'asset_library_action' }>, userId?: string): Promise<void> {
  await mutateState(payload.chatId, userId, state => {
    const now = Date.now()
    const asset = payload.assetId ? state.assetLibrary.assets[payload.assetId] : undefined
    if (payload.action !== 'clear_compare' && !asset) throw new Error('Asset not found.')
    switch (payload.action) {
      case 'favorite':
        asset!.favorite = true
        asset!.updatedAt = now
        break
      case 'unfavorite':
        asset!.favorite = false
        asset!.updatedAt = now
        break
      case 'mark_reference':
        asset!.visualReference = true
        asset!.updatedAt = now
        break
      case 'clear_reference':
        asset!.visualReference = false
        asset!.updatedAt = now
        break
      case 'tag': {
        const tag = cleanString(payload.tag)
        if (!tag) throw new Error('Tag cannot be empty.')
        asset!.tags = [...new Set([...(asset!.tags || []), tag])]
        asset!.updatedAt = now
        break
      }
      case 'untag': {
        const tag = cleanString(payload.tag)
        asset!.tags = (asset!.tags || []).filter(item => item !== tag)
        asset!.updatedAt = now
        break
      }
      case 'compare':
        if (!payload.assetId || !payload.otherAssetId || !state.assetLibrary.assets[payload.otherAssetId]) throw new Error('Choose two assets to compare.')
        state.assetLibrary.compare = { leftAssetId: payload.assetId, rightAssetId: payload.otherAssetId }
        break
      case 'clear_compare':
        state.assetLibrary.compare = {}
        break
    }
    state.assetLibrary.updatedAt = now
    appendStateLog(state, {
      severity: 'info', stage: 'asset-library', eventType: `asset_${payload.action}`, chatId: payload.chatId,
      message: `Asset Library action: ${payload.action}.`, details: { assetId: payload.assetId, otherAssetId: payload.otherAssetId, tag: payload.tag },
    })
  })
  await sendState(userId, payload.chatId)
}

async function reuseAssetInSlot(chatId: string, key: string, assetId: string, userId?: string): Promise<void> {
  await mutateState(chatId, userId, async state => {
    const record = state.slots[key]
    if (!record) throw new Error('Slot not found.')
    const asset = state.assetLibrary.assets[assetId]
    if (!asset) throw new Error('Asset not found.')
    if (asset.status !== 'available' || !asset.imageUrl) throw new Error('This asset is unavailable and cannot be reused.')
    if (asset.target !== record.target && asset.targetApp !== record.targetApp) throw new Error('This asset belongs to an incompatible target surface.')

    const message = await resolveMessage(record.chatId, record.messageId)
    if (!message) throw new Error('Message not found.')
    const content = getSwipeContent(message, record.swipeId)
    const next = replaceImageUrlAfterSlotComment(content, record, asset.imageUrl)
    if (!next) throw new Error('Could not find the current image slot in the message.')
    await patchSwipeContent(record.chatId, message, record.swipeId, next)

    const now = Date.now()
    const current = snapshotFromRecord(record, now)
    if (current) record.history.unshift(current)
    const result: SlotGenerationResult = {
      slot: record.slot,
      imageId: asset.imageId,
      imageUrl: asset.imageUrl,
      resolvedPositivePrompt: asset.resolvedPositivePrompt || record.resolvedPositivePrompt || asset.originalSceneBrief,
      resolvedNegativePrompt: asset.resolvedNegativePrompt || record.resolvedNegativePrompt || '',
      promptMode: 'reused-asset',
      promptPresetId: asset.promptProfileId || null,
      promptProfile: asset.metadata.promptProfile as PromptProfileDecision | undefined,
      parserUsed: false,
      parserOutput: '',
      imageProvider: cleanString((asset.metadata as Record<string, unknown>).provider) || record.imageProvider,
      imageConnectionName: cleanString((asset.metadata as Record<string, unknown>).connection) || record.imageConnectionName,
      imageModel: cleanString((asset.metadata as Record<string, unknown>).model) || record.imageModel,
      finalImageParameters: cleanParameters(asset.metadata.generationParameters),
      finalImageRequest: cleanParameters(asset.metadata.finalImageRequest),
      nativeImageSettings: cleanParameters(asset.metadata.nativeImageSettings),
      diagnostic: asset.metadata.diagnostic as SlotDiagnostic | undefined,
      attemptNumber: (record.attemptNumber || 0) + 1,
      triggerType: 'restore',
      generatedAt: now,
    }
    record.imageId = result.imageId
    record.imageUrl = result.imageUrl
    record.resolvedPositivePrompt = result.resolvedPositivePrompt
    record.resolvedNegativePrompt = result.resolvedNegativePrompt
    record.promptMode = result.promptMode
    record.promptPresetId = result.promptPresetId
    record.promptProfile = result.promptProfile
    record.selectedPromptProfileId = result.promptProfile?.selectedProfileId || asset.promptProfileId
    record.parserUsed = false
    record.parserOutput = ''
    record.imageProvider = result.imageProvider
    record.imageConnectionName = result.imageConnectionName
    record.imageModel = result.imageModel
    record.finalImageParameters = result.finalImageParameters
    record.finalImageRequest = result.finalImageRequest
    record.nativeImageSettings = result.nativeImageSettings
    record.diagnostic = result.diagnostic
    record.status = 'completed'
    record.error = undefined
    record.updatedAt = now
    record.completedAt = now
    record.lastRestoredAt = now
    commitSlotAssetVersion(state, record, result, current, now)
    asset.lastUsedAt = now
    asset.updatedAt = now
    appendStateLog(state, {
      severity: 'info', stage: 'asset-library', eventType: 'asset_reused', chatId,
      messageId: record.messageId, swipeId: record.swipeId, requestId: record.requestId, slot: record.slot, target: record.target,
      message: 'Reused an existing Relay asset without parser or ImageGen.', details: { assetId, imageUrl: asset.imageUrl },
    })
  })
  await sendState(userId, chatId)
}

async function handleContinuityAction(payload: Extract<FrontendMessage, { type: 'continuity_action' }>, userId?: string): Promise<void> {
  let continuityNotice = ''
  let manualCharacterForEnrichment: { id: string; name: string } | null = null
  await mutateState(payload.chatId, userId, state => {
    const vault = state.continuityVault || emptyContinuityVault(payload.chatId)
    vault.chatId = payload.chatId
    const now = Date.now()
    const fact = payload.factId ? findAppearanceFact(vault, payload.factId) : undefined
    switch (payload.action) {
      case 'update_character_aliases': {
        if (!payload.characterId) throw new Error('Character is required.')
        const character = vault.characters[payload.characterId]
        if (!character) throw new Error('Character not found.')
        const canonical = character.canonicalCharacterName.toLocaleLowerCase()
        character.aliases = [...new Set((payload.aliases || [])
          .map(cleanString)
          .filter(Boolean)
          .filter(alias => alias.toLocaleLowerCase() !== canonical))]
        character.updatedAt = now
        const sheet = vault.characterSheets[payload.characterId]
        if (sheet) { sheet.aliases = [...character.aliases]; sheet.updatedAt = now }
        for (const fact of [...Object.values(vault.visualIdentity), ...Object.values(vault.wardrobe), ...Object.values(vault.currentAppearance)]) {
          if (fact.canonicalCharacterId === payload.characterId) fact.aliases = [...character.aliases]
        }
        continuityNotice = `Updated aliases for ${character.canonicalCharacterName}.`
        break
      }
      case 'delete_character': {
        if (!payload.characterId) throw new Error('Character is required.')
        const character = vault.characters[payload.characterId]
        if (!character) throw new Error('Character not found.')
        const removeOwned = <T extends { canonicalCharacterId?: string }>(rows: Record<string, T>) => {
          for (const [id, row] of Object.entries(rows)) if (row.canonicalCharacterId === payload.characterId) delete rows[id]
        }
        delete vault.characters[payload.characterId]
        delete vault.characterSheets[payload.characterId]
        removeOwned(vault.visualIdentity)
        removeOwned(vault.wardrobe)
        removeOwned(vault.currentAppearance)
        for (const [id, suggestion] of Object.entries(vault.suggestions)) if (suggestion.resolvedCharacterId === payload.characterId) delete vault.suggestions[id]
        for (const [id, item] of Object.entries(vault.quarantine)) if (item.recommendedCharacterId === payload.characterId) delete vault.quarantine[id]
        continuityNotice = `Deleted ${character.canonicalCharacterName} from Appearance Memory.`
        break
      }
      case 'save_character_sheet': {
        if (!payload.characterId) throw new Error('Character is required.')
        const character = vault.characters[payload.characterId]
        if (!character) throw new Error('Character not found.')
        saveManualAppearanceMemory(vault, {
          characterId: payload.characterId,
          stableAppearance: cleanString(payload.booruTags),
          currentOutfit: cleanString(payload.currentOutfitTags),
          negativeIdentityTags: cleanString(payload.negativeIdentityTags),
          referenceAssetIds: payload.referenceAssetIds || [],
          chatId: payload.chatId,
        }, now)
        continuityNotice = `Saved Appearance Memory for ${character.canonicalCharacterName}.`
        break
      }
      case 'delete_character_sheet':
        if (!payload.characterId) throw new Error('Character is required.')
        for (const existingFact of allAppearanceFacts(vault)) {
          if (existingFact.canonicalCharacterId === payload.characterId) removeAppearanceFact(vault, existingFact.factId, now)
        }
        delete vault.characterSheets[payload.characterId]
        continuityNotice = 'Appearance Memory removed.'
        break
      case 'add_alternate_look': {
        if (!payload.characterId) throw new Error('Character is required.')
        const sheet = vault.characterSheets[payload.characterId]
        if (!sheet) {
          const character = vault.characters[payload.characterId]
          if (!character) throw new Error('Character not found.')
          vault.characterSheets[payload.characterId] = {
            canonicalCharacterId: character.canonicalCharacterId, canonicalCharacterName: character.canonicalCharacterName, aliases: [...character.aliases],
            booruTags: '', currentOutfitTags: '', negativeIdentityTags: '', referenceAssetIds: [], alternateLooks: [],
            sourceSentence: 'Alternate-look library.', createdAt: now, updatedAt: now,
          }
        }
        const editableSheet = vault.characterSheets[payload.characterId]
        const tags = normalizeTagList(cleanString(payload.booruTags))
        if (!tags) throw new Error('Alternate-look booru tags are required.')
        editableSheet.alternateLooks.push({ lookId: `look-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, name: cleanString(payload.lookName) || `Alternate Look ${editableSheet.alternateLooks.length + 1}`, booruTags: tags, negativeIdentityTags: normalizeTagList(cleanString(payload.negativeIdentityTags)), referenceAssetIds: [...new Set(payload.referenceAssetIds || [])], createdAt: now, updatedAt: now })
        editableSheet.updatedAt = now
        break
      }
      case 'remove_alternate_look': {
        if (!payload.characterId || !payload.lookId) throw new Error('Character and alternate look are required.')
        const sheet = vault.characterSheets[payload.characterId]
        if (!sheet) throw new Error('Appearance sheet not found.')
        sheet.alternateLooks = sheet.alternateLooks.filter(look => look.lookId !== payload.lookId)
        if (sheet.activeAlternateLookId === payload.lookId) sheet.activeAlternateLookId = undefined
        sheet.updatedAt = now
        break
      }
      case 'activate_alternate_look': {
        if (!payload.characterId || !payload.lookId) throw new Error('Character and alternate look are required.')
        const sheet = vault.characterSheets[payload.characterId]
        if (!sheet?.alternateLooks.some(look => look.lookId === payload.lookId)) throw new Error('Alternate look not found.')
        sheet.activeAlternateLookId = payload.lookId
        sheet.updatedAt = now
        continuityNotice = 'Alternate look is now active.'
        break
      }
      case 'return_to_base': {
        if (!payload.characterId) throw new Error('Character is required.')
        const sheet = vault.characterSheets[payload.characterId]
        if (!sheet) throw new Error('Appearance sheet not found.')
        sheet.activeAlternateLookId = undefined
        sheet.updatedAt = now
        continuityNotice = 'Base appearance is now active.'
        break
      }
      case 'set_strength':
        vault.strength = payload.strength || 'off'
        break
      case 'create_character':
      {
        const character = registerCanonicalCharacter(vault, {
          name: cleanString(payload.characterName), aliases: payload.aliases || [],
          sourceType: 'manual', userConfirmed: true,
        }, now)
        // A manual character is usable immediately. Trusted appearance facts
        // can fill this record later without requiring a separate scan.
        vault.characterSheets[character.canonicalCharacterId] ||= {
          canonicalCharacterId: character.canonicalCharacterId,
          canonicalCharacterName: character.canonicalCharacterName,
          aliases: [...character.aliases], booruTags: '', currentOutfitTags: '', negativeIdentityTags: '',
          referenceAssetIds: [], alternateLooks: [], sourceSentence: 'Manual character record; awaiting trusted appearance details.',
          createdAt: now, updatedAt: now,
        }
        manualCharacterForEnrichment = { id: character.canonicalCharacterId, name: character.canonicalCharacterName }
        continuityNotice = `Created ${character.canonicalCharacterName}. Configure an Appearance Sidecar or Relay parser to reconcile context.`
        break
      }
      case 'merge_characters':
        if (!payload.characterId || !payload.targetCharacterId) throw new Error('Both source and target characters are required.')
        mergeCharacters(vault, payload.characterId, payload.targetCharacterId, now)
        break
      case 'merge_facts': {
        const selectedIds = [...new Set(payload.factIds || (payload.factId ? [payload.factId] : []))]
        const selectedFacts = selectedIds.map(id => findAppearanceFact(vault, id)).filter(Boolean) as AppearanceVaultFact[]
        const groups = new Map<string, AppearanceVaultFact[]>()
        for (const selectedFact of selectedFacts) {
          const key = `${selectedFact.canonicalCharacterId}:${selectedFact.layer}:${selectedFact.category}`
          const rows = groups.get(key) || []
          rows.push(selectedFact)
          groups.set(key, rows)
        }
        let mergedGroups = 0
        let mergedEntries = 0
        for (const rows of groups.values()) {
          if (rows.length < 2) continue
          mergeAppearanceFacts(vault, rows.map(row => row.factId), now)
          mergedGroups += 1
          mergedEntries += rows.length
        }
        if (!mergedGroups) throw new Error('No compatible duplicates were selected. Duplicates must belong to the same character, Vault section, and appearance category.')
        continuityNotice = `Merged ${mergedEntries} selected entries into ${mergedGroups} clean appearance entr${mergedGroups === 1 ? 'y' : 'ies'}.`
        break
      }
      case 'pin':
        if (!fact) throw new Error('Appearance fact not found.')
        fact.pinned = true; fact.userConfirmed = true; fact.status = 'active'; fact.updatedAt = now
        break
      case 'unpin':
        if (!fact) throw new Error('Appearance fact not found.')
        fact.pinned = false; fact.updatedAt = now
        break
      case 'exclude':
        if (!fact) throw new Error('Appearance fact not found.')
        fact.status = 'inactive'; fact.active = false; fact.updatedAt = now
        break
      case 'include':
        if (!fact) throw new Error('Appearance fact not found.')
        fact.status = 'active'; if (fact.layer === 'current-appearance') fact.active = true; fact.updatedAt = now
        break
      case 'remove': {
        const selectedIds = [...new Set(payload.factIds || (payload.factId ? [payload.factId] : []))]
        if (!selectedIds.length) throw new Error('Select at least one appearance entry to remove.')
        let removed = 0
        for (const factId of selectedIds) if (removeAppearanceFact(vault, factId, now)) removed += 1
        if (!removed) throw new Error('The selected appearance entries no longer exist.')
        continuityNotice = `Removed ${removed} appearance entr${removed === 1 ? 'y' : 'ies'}.`
        break
      }
      case 'edit_fact': {
        if (!fact) throw new Error('Appearance fact not found.')
        const nextValue = cleanString(payload.value) || fact.value
        const nextCategory = payload.category || fact.category
        const snapshot = { ...fact }
        removeAppearanceFact(vault, fact.factId, now)
        addAppearanceFact(vault, {
          layer: snapshot.layer,
          characterId: snapshot.canonicalCharacterId,
          category: nextCategory,
          value: nextValue,
          conflictDomain: snapshot.conflictDomain,
          sourceType: 'manual',
          sourceReference: { ...snapshot.sourceReference, sourceType: 'manual' },
          confidence: 1,
          pinned: snapshot.pinned,
          userConfirmed: true,
          referenceAssetIds: snapshot.referenceAssetIds,
          notes: cleanString(payload.note) || snapshot.notes,
          outfitName: snapshot.outfitName,
          defaultWardrobe: snapshot.defaultWardrobe,
          currentWardrobe: snapshot.currentWardrobe,
          chatId: snapshot.chatId || payload.chatId,
          sourceMessageId: snapshot.sourceMessageId,
          sourceSwipeId: snapshot.sourceSwipeId,
          active: snapshot.active !== false,
          expiryPolicy: snapshot.expiryPolicy,
          expiresAt: snapshot.expiresAt,
          semanticAuthority: 'explicit-user',
        }, now)
        break
      }
      case 'quarantine_fact': {
        const selectedIds = [...new Set(payload.factIds || (payload.factId ? [payload.factId] : []))]
        if (!selectedIds.length) throw new Error('Select at least one appearance entry to quarantine.')
        let quarantined = 0
        for (const factId of selectedIds) {
          const selectedFact = findAppearanceFact(vault, factId)
          if (!selectedFact) continue
          selectedFact.status = 'quarantined'
          selectedFact.active = false
          selectedFact.updatedAt = now
          quarantined += 1
        }
        if (!quarantined) throw new Error('The selected appearance entries no longer exist.')
        continuityNotice = `Quarantined ${quarantined} appearance entr${quarantined === 1 ? 'y' : 'ies'}.`
        break
      }
      case 'move_fact': {
        if (!payload.layer) throw new Error('Choose a destination Vault section first.')
        const selectedIds = [...new Set(payload.factIds || (payload.factId ? [payload.factId] : []))]
        if (!selectedIds.length) throw new Error('Select at least one appearance entry to move.')
        let moved = 0
        const skipped: string[] = []
        for (const factId of selectedIds) {
          const selectedFact = findAppearanceFact(vault, factId)
          if (!selectedFact) { skipped.push('missing entry'); continue }
          if (selectedFact.layer === payload.layer) { skipped.push(`${selectedFact.value}: already there`); continue }
          try {
            moveAppearanceFact(vault, factId, payload.layer, payload.category, now)
            moved += 1
          } catch (error) {
            skipped.push(`${selectedFact.value}: ${error instanceof Error ? error.message : String(error)}`)
          }
        }
        if (!moved) throw new Error(skipped[0] || 'None of the selected appearance entries could be moved.')
        continuityNotice = `Moved ${moved} appearance entr${moved === 1 ? 'y' : 'ies'} to ${payload.layer === 'wardrobe' ? 'Wardrobe' : payload.layer === 'current-appearance' ? 'Scene Appearance' : 'Visual Identity'}${skipped.length ? `; skipped ${skipped.length} incompatible entr${skipped.length === 1 ? 'y' : 'ies'}` : ''}.`
        break
      }
      case 'ignore_slot':
        if (!payload.key) throw new Error('Slot key is required.')
        vault.ignoredForSlotKeys = [...new Set([...vault.ignoredForSlotKeys, payload.key])]
        break
      case 'clear_ignore_slot':
        vault.ignoredForSlotKeys = payload.key ? vault.ignoredForSlotKeys.filter(key => key !== payload.key) : []
        break
      case 'mark_break':
        if (!payload.key) throw new Error('Slot key is required.')
        vault.deliberateBreaks[payload.key] = cleanString(payload.reason) || 'Deliberate visual continuity break.'
        vault.ignoredForSlotKeys = [...new Set([...vault.ignoredForSlotKeys, payload.key])]
        break
      case 'add_fact': {
        let characterId = cleanString(payload.characterId)
        if (!characterId && payload.characterName) {
          const resolved = resolveCanonicalCharacter(vault, payload.characterName)
            || registerCanonicalCharacter(vault, { name: payload.characterName, aliases: payload.aliases || [], sourceType: 'manual', userConfirmed: true }, now)
          characterId = resolved.canonicalCharacterId
        }
        if (!characterId || !payload.layer || !payload.category || !cleanString(payload.value)) {
          throw new Error('Select a resolved character, destination layer, category, and value.')
        }
        addAppearanceFact(vault, {
          layer: payload.layer,
          characterId,
          category: payload.category,
          value: cleanString(payload.value),
          sourceType: payload.sourceType || 'manual',
          sourceReference: { sourceType: payload.sourceType || 'manual', chatId: payload.chatId, assetId: cleanString(payload.assetId) || undefined },
          confidence: 1,
          pinned: payload.layer === 'visual-identity',
          userConfirmed: true,
          referenceAssetIds: payload.assetId ? [payload.assetId] : [],
          notes: cleanString(payload.note) || undefined,
          defaultWardrobe: payload.defaultWardrobe,
          currentWardrobe: payload.currentWardrobe,
          chatId: payload.chatId,
          active: true,
          expiryPolicy: payload.layer === 'current-appearance' ? 'superseded' : undefined,
          semanticAuthority: 'explicit-user',
        }, now)
        break
      }
      case 'clear_current':
        if (!payload.characterId) throw new Error('Character is required.')
        clearCurrentAppearance(vault, payload.characterId, now)
        break
      case 'accept_suggestion':
        if (!payload.suggestionId) throw new Error('Suggestion is required.')
        acceptSuggestion(vault, payload.suggestionId, payload.layer, payload.value, now)
        break
      case 'move_suggestion_current':
        if (!payload.suggestionId) throw new Error('Suggestion is required.')
        acceptSuggestion(vault, payload.suggestionId, 'current-appearance', payload.value, now)
        break
      case 'move_suggestion_wardrobe':
        if (!payload.suggestionId) throw new Error('Suggestion is required.')
        acceptSuggestion(vault, payload.suggestionId, 'wardrobe', payload.value, now)
        break
      case 'reject_suggestion':
        if (!payload.suggestionId) throw new Error('Suggestion is required.')
        rejectSuggestion(vault, payload.suggestionId, now)
        break
      case 'update_migration_item':
        if (!payload.migrationItemId || !payload.disposition) throw new Error('Migration item and disposition are required.')
        updateMigrationItem(vault, payload.migrationItemId, { disposition: payload.disposition, resolvedCharacterId: payload.characterId, selected: true }, now)
        break
      case 'apply_migration':
        applyMigrationPreview(vault, payload.selectedMigrationItemIds, now)
        break
    }
    expireCurrentAppearance(vault, now)
    vault.updatedAt = now
    state.continuityVault = vault
    appendStateLog(state, {
      severity: 'info', stage: 'appearance-vault', eventType: `continuity_${payload.action}`, chatId: payload.chatId,
      message: `Appearance Memory action: ${payload.action}.`, details: { factId: payload.factId, suggestionId: payload.suggestionId, characterId: payload.characterId, strength: payload.strength },
    })
  })
  if (payload.action === 'set_strength') await setConfig({ vaultStrength: payload.strength || 'off' }, userId)
  await sendState(userId, payload.chatId)
  if (continuityNotice) spindle.sendToFrontend({ type: 'relay_notice', level: 'success', message: continuityNotice }, userId)
  if (manualCharacterForEnrichment) {
    // This starts only after the canonical record has been persisted. No model
    // call is made inside the state mutation queue.
    void enrichManualCharacterAppearance(payload.chatId, manualCharacterForEnrichment, userId)
  }
}

function defaultSurfacePromptCategory(surfaceId: string): SurfacePromptCategory {
  if (['smartphone', 'inline-chat', 'instagram', 'twitter', 'kakao'].includes(surfaceId)) return 'social-messaging'
  if (['polaroid', 'photo-booth-strip', 'phone-gallery'].includes(surfaceId)) return 'photography-keepsakes'
  if (['album-cover', 'magazine-cover', 'youtube-thumbnail'].includes(surfaceId)) return 'covers-promotion'
  if (['newspaper', 'artifact-media', 'evidence-photo'].includes(surfaceId)) return 'evidence-editorial'
  if (['character-profile', 'relationship-map'].includes(surfaceId)) return 'narrative-visuals'
  return 'custom'
}

function defaultSurfacePromptEnabled(surfaceId: string): boolean {
  if (hasR45UtilityContract(surfaceId)) return true
  return [
    'smartphone', 'inline-chat', 'instagram', 'twitter', 'kakao',
    'album-cover', 'magazine-cover', 'photo-booth-strip',
    'polaroid', 'youtube-thumbnail', 'newspaper', 'artifact-media', 'evidence-photo',
    'relationship-map',
  ].includes(surfaceId)
}

const REMOVED_SURFACE_IDS = new Set([
  'parallel', 'elsewhere-bloom', 'manga-intro', 'scene-card', 'adventure-card', 'loadout-card', 'scene-demo', 'scene-options',
  'weverse-post', 'fandom', 'fandom-community', 'fansite-post', 'photocard', 'specimen-scan',
  'divination-surface', 'radio-broadcast', 'travel-log', 'expedition-journal', 'webtoon-panel',
  'creature-scanner', 'artifact-scanner', 'ship-console', 'id-card',
  'dispatch', 'letter',
])

function isRemovedSurfaceDefinition(surfaceId: unknown, baseSurfaceId?: unknown): boolean {
  return REMOVED_SURFACE_IDS.has(cleanString(surfaceId)) || REMOVED_SURFACE_IDS.has(cleanString(baseSurfaceId))
}

let builtInSurfaceDefinitionTemplate: Record<string, CustomSurfaceDefinition> | null = null
const CANONICAL_REGEX_PACK_SURFACE_IDS = new Set([
  'smartphone', 'instagram', 'twitter', 'kakao', 'album-cover', 'magazine-cover',
  'photo-booth-strip', 'polaroid', 'youtube-thumbnail', 'relationship-map',
  // IDs are deliberately stable for persisted enablement and custom collections.
  // Their canonical wrappers/renderers come from the accepted Compact v3 pack.
  'instagram-dm', 'x-dm', 'discord-dm', 'discord-server', 'google-images',
  'phone-gallery', 'tiktok-post', 'naver-article',
])

function builtInSurfaceDefinitions(now = Date.now()): Record<string, CustomSurfaceDefinition> {
  if (builtInSurfaceDefinitionTemplate) {
    return Object.fromEntries(Object.entries(builtInSurfaceDefinitionTemplate).map(([id, definition]) => [id, { ...definition }]))
  }

  // FINAL R4.5 owns the user-facing Surface inventory. Artifact Media and
  // Prose Illustration remain internal Relay protocols and never appear as
  // Library/Preset Surfaces. The two authority catalogs are complementary:
  // shippedSurfaceDefinitions supplies the reviewed legacy-lineage roots and
  // r45SupplementalSurfaceDefinitions supplies the new/current roots.
  const byBaseId = new Map<string, CustomSurfaceDefinition>()
  for (const definition of [...shippedSurfaceDefinitions(now), ...r45SupplementalSurfaceDefinitions(now)]) {
    if (isRemovedSurfaceDefinition(definition.surfaceId, definition.baseSurfaceId)) continue
    if (!hasR45UtilityContract(definition.baseSurfaceId)) continue
    byBaseId.set(definition.baseSurfaceId, {
      ...definition,
      surfaceId: definition.baseSurfaceId,
      baseSurfaceId: definition.baseSurfaceId,
      builtIn: true,
      enabled: true,
      promptEnabled: true,
      promptModule: cleanString(definition.promptModule) || r45UtilityContract(definition.baseSurfaceId),
      updatedAt: now,
    })
  }
  const activeRows = [...byBaseId.values()]
  if (activeRows.length !== 46) throw new Error(`FINAL R4.5 Surface inventory drift: expected 46, got ${activeRows.length}`)
  const definitions = Object.fromEntries(activeRows.map(definition => [definition.surfaceId, definition]))
  builtInSurfaceDefinitionTemplate = definitions
  return Object.fromEntries(Object.entries(definitions).map(([id, definition]) => [id, { ...definition }]))
}

export function resolveAutomaticSurfaceInjectionEnabled(utilityInjectionEnabled: unknown, surfaceProtocolInjectionEnabled: unknown): boolean {
  return utilityInjectionEnabled !== false || surfaceProtocolInjectionEnabled === true
}

function defaultCustomSurfaceStudio(): CustomSurfaceStudioState {
  const definitions = builtInSurfaceDefinitions()
  return {
    definitions,
    activePresetIds: Object.fromEntries(Object.values(definitions).map(definition => [definition.baseSurfaceId, definition.surfaceId])),
    collectionPresets: {},
    defaultCollectionPresetId: undefined,
    rendererMode: 'relay',
    defaultShellMode: 'plain',
    colorMode: 'realistic',
    utilityInjectionEnabled: true,
      utilityInjectionPosition: 'after-chat-history',
    utilityTemplate: REVERIE_SURFACE_UTILITY_TEMPLATE,
    validationErrors: validateCustomSurfaceDefinitions(definitions),
    lastInjectedModuleIds: [],
    lastInjectionAt: 0,
    lastInjectionSource: 'none',
    lastInjectionPosition: 'none',
    lastInjectionSummary: 'No Relay prompt injection has been recorded yet.',
    updatedAt: Date.now(),
  }
}

function normalizeCustomSurfaceStudio(value: unknown): CustomSurfaceStudioState {
  const defaults = defaultCustomSurfaceStudio()
  const raw = cleanParameters(value)
  const definitions: Record<string, CustomSurfaceDefinition> = { ...defaults.definitions }
  if (raw.definitions && typeof raw.definitions === 'object') {
    for (const [surfaceId, value] of Object.entries(raw.definitions as Record<string, unknown>)) {
      if (isRemovedSurfaceDefinition(surfaceId)) continue
      const normalized = normalizeCustomSurfaceDefinition(surfaceId, value)
      if (!normalized || isRemovedSurfaceDefinition(normalized.surfaceId, normalized.baseSurfaceId)) continue
      const builtIn = defaults.definitions[normalized.surfaceId]
      if (builtIn) {
        definitions[normalized.surfaceId] = {
          ...builtIn,
          enabled: normalized.enabled !== false,
          promptEnabled: normalized.promptEnabled !== false,
          promptCategory: normalized.promptCategory || builtIn.promptCategory,
          // Preserve deliberate Utility edits for every active Surface.  Only
          // obsolete pre-bracket templates are migrated back to the R4.5 default.
          promptModule: containsStalePromptTemplate(normalized.promptModule) ? builtIn.promptModule : cleanString(normalized.promptModule) || builtIn.promptModule,
          shellMode: normalized.shellMode || builtIn.shellMode,
          hybridOwner: normalized.hybridOwnerConfigured ? normalized.hybridOwner : builtIn.hybridOwner,
          hybridOwnerConfigured: normalized.hybridOwnerConfigured === true,
          defaultOpen: normalized.defaultOpen,
          updatedAt: Math.max(builtIn.updatedAt, normalized.updatedAt || 0),
        }
      } else definitions[normalized.surfaceId] = { ...normalized, builtIn: false }
    }
  }
  const requestedActive = cleanParameters(raw.activePresetIds)
  const activePresetIds: Record<string, string> = { ...defaults.activePresetIds }
  for (const definition of Object.values(definitions)) {
    const requested = cleanString(requestedActive[definition.baseSurfaceId])
    if (requested && definitions[requested]?.baseSurfaceId === definition.baseSurfaceId) activePresetIds[definition.baseSurfaceId] = requested
  }
  const rendererMode = cleanString(raw.rendererMode)
  const migratedRendererMode: CustomSurfaceStudioState['rendererMode'] = ['relay', 'legacy-regex', 'hybrid'].includes(rendererMode)
    ? rendererMode as CustomSurfaceStudioState['rendererMode']
    : 'relay'
  const injectionPosition = cleanString(raw.utilityInjectionPosition)
  const validInjectionPositions: SurfaceUtilityInjectionPosition[] = ['system-prefix', 'before-chat-history', 'before-latest-user', 'after-latest-user', 'after-chat-history']
  // Preserve the former utility/protocol switches as one setting.
  // Either legacy switch being on migrates to Automatic Surface Injection = on.
  const automaticSurfaceInjectionEnabled = resolveAutomaticSurfaceInjectionEnabled(raw.utilityInjectionEnabled, (raw as Record<string, unknown>).surfaceProtocolInjectionEnabled)
  return {
    definitions,
    activePresetIds,
    collectionPresets: Object.fromEntries(Object.entries(cleanParameters(raw.collectionPresets)).map(([presetId, value]) => {
      const row = cleanParameters(value)
      return [presetId, {
        presetId,
        name: cleanString(row.name) || 'Surface Collection',
        surfaceIds: stringList(row.surfaceIds).filter(surfaceId => Boolean(definitions[surfaceId])),
        createdAt: Math.max(0, Number(row.createdAt) || Date.now()),
        updatedAt: Math.max(0, Number(row.updatedAt) || Date.now()),
      }]
    })),
    defaultCollectionPresetId: cleanString(raw.defaultCollectionPresetId) || undefined,
    rendererMode: migratedRendererMode,
    defaultShellMode: ['inline', 'plain', 'sparkling'].includes(cleanString(raw.defaultShellMode))
      ? cleanString(raw.defaultShellMode) as SurfaceShellMode
      : cleanString(raw.defaultShellMode) === 'collapsible' ? 'plain' : defaults.defaultShellMode,
    colorMode: cleanString(raw.colorMode) === 'primary' ? 'primary' : 'realistic',
    utilityInjectionEnabled: automaticSurfaceInjectionEnabled,
    utilityInjectionPosition: validInjectionPositions.includes(injectionPosition as SurfaceUtilityInjectionPosition) ? injectionPosition as SurfaceUtilityInjectionPosition : defaults.utilityInjectionPosition,
    utilityTemplate: canonicalSurfaceUtilityTemplate(raw.utilityTemplate),
    validationErrors: validateCustomSurfaceDefinitions(definitions),
    lastInjectedModuleIds: stringList(raw.lastInjectedModuleIds),
    lastInjectionAt: Math.max(0, Number(raw.lastInjectionAt) || 0),
    lastInjectionSource: ['automatic', 'macro'].includes(cleanString(raw.lastInjectionSource)) ? cleanString(raw.lastInjectionSource) as CustomSurfaceStudioState['lastInjectionSource'] : 'none',
    lastInjectionPosition: [...validInjectionPositions, 'macro-placement'].includes(cleanString(raw.lastInjectionPosition) as any) ? cleanString(raw.lastInjectionPosition) as CustomSurfaceStudioState['lastInjectionPosition'] : 'none',
    lastInjectionSummary: cleanString(raw.lastInjectionSummary) || defaults.lastInjectionSummary,
    updatedAt: Number(raw.updatedAt) || defaults.updatedAt,
  }
}

export function normalizedSurfaceDefinitionIds(value: unknown = {}): string[] {
  return Object.keys(normalizeCustomSurfaceStudio(value).definitions).sort()
}

export function normalizedSurfaceStudioSnapshot(value: unknown = {}): CustomSurfaceStudioState {
  return structuredClone(normalizeCustomSurfaceStudio(value))
}

function emptyProseIllustratorState(): ProseIllustratorState {
  return {
    settings: {},
    opportunities: {},
    plans: {},
    records: {},
    processedMessageKeys: {},
    autoCounters: {},
    frequencyDecisions: {},
    activeOpportunityIdByChat: {},
    activePlanIdByChat: {},
  }
}

export function buildIllustratorRuntimeDirective(settings: ProseIllustratorSettings, messages: LlmMessage[], personaPovContext?: PersonaPovContext): string {
  const mode = settings.enabled && !settings.paused ? settings.mode : 'off'
  const assistantCount = messages.filter(message => cleanString((message as any)?.role).toLocaleLowerCase() === 'assistant').length
  const nextEligibleIndex = assistantCount + 1
  let requestIllustrations = mode === 'model-placed' || mode === 'inline-protocol'
  if (mode === 'off') {
    requestIllustrations = false
  } else if (mode === 'relay-planned') {
    requestIllustrations = false
  } else if (settings.frequencyMode === 'every-n') {
    requestIllustrations = nextEligibleIndex % Math.max(1, settings.everyNEligibleMessages) === 0
  } else if (settings.frequencyMode === 'every-eligible') {
    requestIllustrations = true
  } else {
    requestIllustrations = true
  }
  if (settings.perspectiveMode === 'persona-pov' && !personaPovContext?.available) requestIllustrations = false
  // Model-placed output is a contract, not a suggestion. A fixed count means
  // exactly that count; an enabled range means an inclusive lower/upper bound.
  const countMode = settings.modelPlacedCountMode === 'range' ? 'range' : 'fixed'
  const target = countMode === 'range'
    ? Math.max(1, Math.min(32, settings.maximumImages || settings.illustrationsPerRun || 1))
    : Math.max(1, Math.min(32, settings.illustrationsPerRun || settings.maximumIllustrationsPerMessage || 1))
  const minimum = requestIllustrations
    ? (countMode === 'range' ? Math.max(1, Math.min(target, settings.minimumImages || 1)) : target)
    : 0
  const illustrationInstruction = !requestIllustrations
    ? 'Do not emit a Reverie Relay illustration request for this response.'
    : countMode === 'range'
      ? `You MUST emit from ${minimum} through ${target} Reverie Relay illustration requests, inclusive.`
      : `You MUST emit exactly ${target} Reverie Relay illustration request${target === 1 ? '' : 's'}.`
  const subjects = selectedCharacterOnlySubjects(settings)
  return expandPromptTemplate(registryPrompt(settings, 'story.runtime-directives'), {
    mode,
    request_illustrations: requestIllustrations,
    target_count: requestIllustrations ? target : 0,
    minimum_count: minimum,
    count_mode: countMode,
    illustration_instruction: illustrationInstruction,
    candidate_count: settings.defaultCandidateCount,
    aspect_policy: settings.defaultAspectRatio,
    image_size: settings.imageSize,
    framing_mode: settings.perspectiveMode,
    maximum_visible_characters: settings.maximumCharacters,
    selected_character_subjects: subjects.join(','),
    prompt_profile: settings.defaultPromptProfileId,
    continuity_strength: settings.appearanceMemoryEnabled ? settings.continuityStrength : 'off',
  })
}

function escapeXmlText(value: unknown): string {
  return cleanString(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export function defaultProseIllustratorSettings(): ProseIllustratorSettings {
  return {
    enabled: true,
    automaticProtocolInjection: true,
    mode: 'model-placed',
    plannerConnectionId: null,
    plannerModel: '',
    plannerParameters: {},
    contextMessageCount: 4,
    maximumCharacters: 2,
    frequencyMode: 'key-moments',
    everyNEligibleMessages: 3,
    maximumOpportunitiesPerMessage: 3,
    maximumIllustrationsPerMessage: 3,
    illustrationsPerRun: 1,
    minimumImages: 1,
    maximumImages: 3,
    modelPlacedCountMode: 'fixed',
    perspectiveMode: 'scene-snapshot',
    imageAlignment: 'center',
    imageSize: 'medium',
    adaptiveMode: true,
    defaultPromptProfileId: 'auto',
    defaultAspectRatio: 'adaptive',
    promptRegistry: { ...DEFAULT_PROMPT_REGISTRY },
    promptRegistryVersions: { ...DEFAULT_PROMPT_REGISTRY_VERSIONS },
    appearanceMemoryEnabled: true,
    useGlobalAppearanceSidecar: true,
    appearanceSidecarConnectionId: null,
    appearanceSidecarModel: '',
    appearanceSidecarParameters: {},
    customPromptPrefix: '',
    customNegativePrefix: '',
    stripGenericStyleBoilerplate: true,
    defaultCandidateCount: 1,
    continuityStrength: 'medium',
    appearanceMemoryOverride: 'global',
    reuseAcceptedReferences: true,
    reuseLocationReferences: true,
    placementPolicy: 'after-beat',
    relayInsertionMode: 'auto',
    showCaptions: true,
    autoGenerateRequiresApproval: false,
    immediateDispatchOnOpportunitySelection: false,
    reanalyzeEditedMessages: true,
    skipOoc: true,
    skipUtilities: true,
    skipShortMessages: true,
    skipContinuation: false,
    skipImpersonation: false,
    skipTestFixtures: true,
    minimumMessageLength: 180,
    highResolutionModifier: false,
    characterOnlySubjects: '',
    modelPlacedProtocolOverride: REVERIE_ILLUSTRATION_PROTOCOL,
    relayPlannedProtocolOverride: REVERIE_RELAY_PLANNED_PROTOCOL,
    characterOnlyFramingPrompt: DEFAULT_ILLUSTRATOR_FRAMING_PROMPTS['solo-scene'],
    sceneLedFramingPrompt: DEFAULT_ILLUSTRATOR_FRAMING_PROMPTS['scene-snapshot'],
    continuityFramePrompt: DEFAULT_ILLUSTRATOR_FRAMING_PROMPTS['sequence'],
    expressiveFramePrompt: DEFAULT_ILLUSTRATOR_FRAMING_PROMPTS['emotional-beat'],
    paused: false,
  }
}

function normalizeProseAutoCounters(value: unknown): ProseIllustratorState['autoCounters'] {
  const raw = cleanParameters(value)
  const counters: ProseIllustratorState['autoCounters'] = {}
  for (const [chatId, rowValue] of Object.entries(raw)) {
    const row = cleanParameters(rowValue)
    counters[chatId] = {
      eligibleMessages: Math.max(0, clampInt(row.eligibleMessages, 0, Number.MAX_SAFE_INTEGER, 0)),
      updatedAt: Math.max(0, clampInt(row.updatedAt, 0, Number.MAX_SAFE_INTEGER, Date.now())),
    }
  }
  return counters
}

function normalizeProseIllustratorState(value: unknown): ProseIllustratorState {
  const raw = cleanParameters(value)
  const settings: Record<string, ProseIllustratorSettings> = {}
  const rawSettings = cleanParameters(raw.settings)
  for (const [chatId, row] of Object.entries(rawSettings)) settings[chatId] = normalizeProseIllustratorSettings(row)
  return {
    settings,
    opportunities: normalizeOpportunityMap(raw.opportunities),
    plans: normalizeProsePlanMap(raw.plans),
    records: normalizeRecordMap(raw.records) as Record<string, ProseIllustrationRecord>,
    processedMessageKeys: cleanParameters(raw.processedMessageKeys) as Record<string, number>,
    autoCounters: normalizeProseAutoCounters(raw.autoCounters),
    frequencyDecisions: cleanParameters(raw.frequencyDecisions) as ProseIllustratorState['frequencyDecisions'],
    activeOpportunityIdByChat: cleanParameters(raw.activeOpportunityIdByChat) as Record<string, string>,
    activePlanIdByChat: cleanParameters(raw.activePlanIdByChat) as Record<string, string>,
  }
}

function normalizeRecordMap(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function normalizeOpportunityMap(value: unknown): Record<string, ProseIllustrationOpportunity> {
  const raw = normalizeRecordMap(value)
  const out: Record<string, ProseIllustrationOpportunity> = {}
  for (const [id, value] of Object.entries(raw)) {
    const candidate = normalizeProseOpportunity(id, value)
    if (candidate) out[candidate.opportunityId] = candidate
  }
  return out
}

function normalizeProsePlanMap(value: unknown): Record<string, ProseIllustrationPlan> {
  const raw = normalizeRecordMap(value)
  const out: Record<string, ProseIllustrationPlan> = {}
  for (const [id, value] of Object.entries(raw)) {
    const row = cleanParameters(value)
    const planId = cleanString(row.planId) || id
    const status = cleanString(row.status)
    out[planId] = {
      ...(row as unknown as ProseIllustrationPlan),
      planId,
      perspectiveMode: cleanString(row.perspectiveMode) ? normalizeProsePerspectiveMode(row.perspectiveMode) : undefined,
      promptComposition: row.promptComposition && typeof row.promptComposition === 'object'
        ? {
            ...(row.promptComposition as ProsePromptComposition),
            perspectiveMode: cleanString((row.promptComposition as Record<string, unknown>).perspectiveMode)
              ? normalizeProsePerspectiveMode((row.promptComposition as Record<string, unknown>).perspectiveMode)
              : undefined,
          }
        : undefined,
      candidateCount: normalizeCandidateCount(row.candidateCount, 1),
      imageAlignment: ['left', 'center', 'right'].includes(cleanString(row.imageAlignment)) ? cleanString(row.imageAlignment) as ProseIllustrationPlan['imageAlignment'] : 'center',
      imageSize: ['small', 'medium', 'large', 'full'].includes(cleanString(row.imageSize)) ? cleanString(row.imageSize) as ProseIllustrationPlan['imageSize'] : 'medium',
      approvalRequired: row.approvalRequired === true,
      placementConfirmed: row.placementConfirmed === true,
      status: ['draft', 'ready', 'placement-required', 'awaiting-approval', 'candidate-review', 'rejected', 'generated', 'cancelled'].includes(status)
        ? status as ProseIllustrationPlan['status']
        : (row.shouldIllustrate === false ? 'rejected' : 'ready'),
    }
  }
  return out
}

function normalizeProseOpportunity(id: string, value: unknown): ProseIllustrationOpportunity | null {
  const raw = cleanParameters(value)
  const opportunityId = cleanString(raw.opportunityId) || id
  const chatId = cleanString(raw.chatId)
  const messageId = cleanString(raw.messageId)
  if (!opportunityId || !chatId || !messageId) return null
  const status = cleanString(raw.status)
  const insertionSide = cleanString(raw.insertionSide)
  const peoplePolicy = cleanString(raw.peoplePolicy)
  const now = Date.now()
  return {
    opportunityId,
    chatId,
    messageId,
    swipeId: Number(raw.swipeId) || 0,
    sourceContentFingerprint: cleanString(raw.sourceContentFingerprint),
    settingsFingerprint: cleanString(raw.settingsFingerprint),
    plannerVersion: cleanString(raw.plannerVersion) || PROSE_OPPORTUNITY_PLANNER_VERSION,
    status: ['analyzing', 'proposed', 'selected', 'dismissed', 'stale', 'superseded', 'generated', 'failed-analysis'].includes(status) ? status as ProseIllustrationOpportunity['status'] : 'proposed',
    title: cleanString(raw.title) || 'Prose illustration opportunity',
    reason: cleanString(raw.reason),
    sceneSummary: cleanString(raw.sceneSummary) || cleanString(raw.sceneBrief),
    selectedExcerpt: cleanString(raw.selectedExcerpt),
    paragraphIndex: Math.max(0, Number(raw.paragraphIndex) || 0),
    insertionSide: ['before', 'after', 'end'].includes(insertionSide) ? insertionSide as ProseIllustrationAnchor['insertionSide'] : 'after',
    composition: cleanString(raw.composition),
    peoplePolicy: ['required', 'allowed', 'forbidden'].includes(peoplePolicy) ? peoplePolicy as ProseIllustratorPeoplePolicy : 'allowed',
    expectedPeopleCount: clampInt(raw.expectedPeopleCount, 0, 64, 0),
    namedSubjects: stringList(raw.namedSubjects),
    omittedSubjects: stringList(raw.omittedSubjects),
    backgroundPeople: cleanString(raw.backgroundPeople),
    location: cleanString(raw.location),
    timeOfDay: cleanString(raw.timeOfDay),
    mood: cleanString(raw.mood),
    importantProps: stringList(raw.importantProps),
    recommendedProfileId: cleanString(raw.recommendedProfileId) || cleanString(raw.profileId) || 'auto',
    recommendedAspectRatio: cleanString(raw.recommendedAspectRatio) || '16:9',
    visualPlan: cleanParameters(raw.visualPlan),
    continuityFactIds: stringList(raw.continuityFactIds),
    referenceAssetIds: stringList(raw.referenceAssetIds),
    locationReferenceAssetIds: stringList(raw.locationReferenceAssetIds),
    confidence: clampNumber(Number(raw.confidence), 0, 1, 0),
    sidecarConnectionId: cleanNullableString(raw.sidecarConnectionId),
    sidecarModel: cleanString(raw.sidecarModel),
    sidecarOutput: cleanParameters(raw.sidecarOutput),
    contextSummary: cleanParameters(raw.contextSummary),
    dismissedAt: Number(raw.dismissedAt) || undefined,
    selectedAt: Number(raw.selectedAt) || undefined,
    staleAt: Number(raw.staleAt) || undefined,
    createdAt: Number(raw.createdAt) || now,
    updatedAt: Number(raw.updatedAt) || now,
    warning: cleanString(raw.warning) || undefined,
  }
}

export function normalizeProseIllustratorSettings(value: unknown): ProseIllustratorSettings {
  const raw = cleanParameters(value)
  const defaults = defaultProseIllustratorSettings()
  const rawRegistry = cleanParameters(raw.promptRegistry)
  const rawRegistryVersions = cleanParameters(raw.promptRegistryVersions)
  const promptRegistry: Record<string, string> = { ...DEFAULT_PROMPT_REGISTRY }
  const supersededDefaults: Record<string, string[]> = {
    'sidecar.appearance.system': ['949:be700edb'],
    'sidecar.appearance.request': ['1303:3e03e978'],
    'sidecar.composer.request': ['417:efc17757', '1230:866f8aaa', '1521:19bf99cf'],
    'sidecar.parser.request': ['209:1016af91', '883:c2956739'],
    'sidecar.parser.repair': ['193:1d11cac7'],
    'story.framing.scene-snapshot': ['1775:c849c434'],
    'story.framing.sequence': ['973:4473f87f'],
    'story.framing.emotional-beat': ['889:37d0359f'],
    'story.framing.solo-scene': ['1245:00682bff'],
    'story.framing.persona-pov': ['374:078a3a0c', '1489:0572269d'],
    'story.framing.scene-led': ['391:4a3c1ff7'],
    'story.framing.continuity-frame': ['239:d3cc0320'],
    'story.framing.expressive-frame': ['432:3d535eb2'],
    'story.framing.character-only': ['673:95fdff36'],
  }
  const isStockRetired = (id: string, value: string) => supersededDefaults[id]?.includes(contentFingerprint(value.replace(/\r\n/g, '\n').trim())) === true
  const migratedPromptRegistryIds = new Set<string>()
  for (const id of Object.keys(DEFAULT_PROMPT_REGISTRY)) {
    if (!Object.prototype.hasOwnProperty.call(rawRegistry, id)) continue
    const stored = String(rawRegistry[id] ?? '')
    if (isStockRetired(id, stored) || stored.replace(/\r\n/g, '\n').trim() === DEFAULT_PROMPT_REGISTRY[id].replace(/\r\n/g, '\n').trim()) migratedPromptRegistryIds.add(id)
    else promptRegistry[id] = stored
  }
  for (const [legacyId, canonicalId] of Object.entries(ILLUSTRATOR_FRAMING_REGISTRY_ALIASES)) {
    if (Object.prototype.hasOwnProperty.call(rawRegistry, canonicalId) || !Object.prototype.hasOwnProperty.call(rawRegistry, legacyId)) continue
    const stored = String(rawRegistry[legacyId] ?? '')
    if (!isStockRetired(legacyId, stored)) promptRegistry[canonicalId] = stored
  }
  const legacyRegistryInputs: Array<{ canonicalId: string; legacyId: string; value: unknown }> = [
    { canonicalId: 'story.model-placed', legacyId: 'story.model-placed', value: raw.modelPlacedProtocolOverride },
    { canonicalId: 'story.relay-planned', legacyId: 'story.relay-planned', value: raw.relayPlannedProtocolOverride },
    { canonicalId: 'story.framing.solo-scene', legacyId: 'story.framing.character-only', value: raw.characterOnlyFramingPrompt || raw.characterOnlyProtocolOverride },
    { canonicalId: 'story.framing.scene-snapshot', legacyId: 'story.framing.scene-led', value: raw.sceneLedFramingPrompt },
    { canonicalId: 'story.framing.sequence', legacyId: 'story.framing.continuity-frame', value: raw.continuityFramePrompt },
    { canonicalId: 'story.framing.emotional-beat', legacyId: 'story.framing.expressive-frame', value: raw.expressiveFramePrompt },
  ]
  for (const { canonicalId, legacyId, value: legacy } of legacyRegistryInputs) {
    if (Object.prototype.hasOwnProperty.call(rawRegistry, canonicalId) || Object.prototype.hasOwnProperty.call(rawRegistry, legacyId) || !cleanString(legacy)) continue
    const stored = cleanString(legacy)
    if (isStockRetired(legacyId, stored)) migratedPromptRegistryIds.add(canonicalId)
    else promptRegistry[canonicalId] = stored
  }
  const mode = cleanString(raw.mode)
  const normalizedMode: ProseIllustratorMode = ['off', 'relay-planned', 'model-placed', 'inline-protocol'].includes(mode)
    ? mode as ProseIllustratorMode
    : defaults.mode
  const frequencyMode = cleanString(raw.frequencyMode)
  const placementPolicy = cleanString(raw.placementPolicy)
  const strength = cleanString(raw.continuityStrength)
  const perspectiveMode = normalizeProsePerspectiveMode(raw.perspectiveMode)
  const imageAlignment = cleanString(raw.imageAlignment)
  const imageSize = cleanString(raw.imageSize)
  const illustrationsPerRun = clampInt(raw.illustrationsPerRun, 1, 32, defaults.illustrationsPerRun)
  const maximumImages = Math.max(illustrationsPerRun, clampInt(raw.maximumImages, 1, 32, clampInt(raw.maximumOpportunitiesPerMessage, 1, 32, defaults.maximumImages)))
  const minimumImages = Math.min(maximumImages, clampInt(raw.minimumImages, 1, 32, defaults.minimumImages))
  const maximumIllustrationsPerMessageInput = raw.maximumIllustrationsPerMessage === undefined ? maximumImages : raw.maximumIllustrationsPerMessage
  return {
    ...defaults,
    enabled: raw.enabled !== false,
    // Model-Placed always receives its real runtime contract through the
    // interceptor path; the retired optional setting cannot silently omit it.
    automaticProtocolInjection: normalizedMode === 'model-placed' || normalizedMode === 'inline-protocol' ? true : raw.automaticProtocolInjection === true,
    mode: normalizedMode,
    plannerConnectionId: cleanNullableString(raw.plannerConnectionId),
    plannerModel: cleanString(raw.plannerModel),
    plannerParameters: cleanParameters(raw.plannerParameters),
    contextMessageCount: clampInt(raw.contextMessageCount, 0, 12, defaults.contextMessageCount),
    maximumCharacters: clampInt(raw.maximumCharacters, 1, 8, defaults.maximumCharacters),
    frequencyMode: ['key-moments', 'every-eligible', 'every-n'].includes(frequencyMode) ? frequencyMode as ProseIllustratorSettings['frequencyMode'] : defaults.frequencyMode,
    everyNEligibleMessages: clampInt(raw.everyNEligibleMessages, 1, 100, defaults.everyNEligibleMessages),
    maximumOpportunitiesPerMessage: maximumImages,
    maximumIllustrationsPerMessage: Math.max(illustrationsPerRun, clampInt(maximumIllustrationsPerMessageInput, 1, 32, Math.max(defaults.maximumIllustrationsPerMessage, maximumImages))),
    illustrationsPerRun,
    minimumImages,
    maximumImages,
    modelPlacedCountMode: cleanString(raw.modelPlacedCountMode) === 'range' ? 'range' : 'fixed',
    perspectiveMode,
    imageAlignment: ['left', 'center', 'right'].includes(imageAlignment) ? imageAlignment as ProseIllustratorSettings['imageAlignment'] : defaults.imageAlignment,
    imageSize: ['small', 'medium', 'large', 'full'].includes(imageSize) ? imageSize as ProseIllustratorSettings['imageSize'] : defaults.imageSize,
    adaptiveMode: perspectiveMode === 'solo-scene' || perspectiveMode === 'persona-pov' ? false : raw.adaptiveMode !== false,
    defaultPromptProfileId: cleanString(raw.defaultPromptProfileId) || defaults.defaultPromptProfileId,
    defaultAspectRatio: ['adaptive', '1:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9'].includes(cleanString(raw.defaultAspectRatio)) ? cleanString(raw.defaultAspectRatio) : defaults.defaultAspectRatio,
    promptRegistry,
    promptRegistryVersions: Object.fromEntries(PROMPT_REGISTRY_DEFINITIONS.map(definition => [definition.id, migratedPromptRegistryIds.has(definition.id) ? definition.version : clampInt(rawRegistryVersions[definition.id], 0, definition.version, Object.prototype.hasOwnProperty.call(rawRegistry, definition.id) ? 0 : definition.version)])),
    appearanceMemoryEnabled: raw.appearanceMemoryEnabled !== false,
    useGlobalAppearanceSidecar: raw.useGlobalAppearanceSidecar !== false,
    appearanceSidecarConnectionId: cleanNullableString(raw.appearanceSidecarConnectionId),
    appearanceSidecarModel: cleanString(raw.appearanceSidecarModel),
    appearanceSidecarParameters: cleanParameters(raw.appearanceSidecarParameters),
    customPromptPrefix: cleanString(raw.customPromptPrefix),
    customNegativePrefix: cleanString(raw.customNegativePrefix),
    stripGenericStyleBoilerplate: raw.stripGenericStyleBoilerplate !== false,
    defaultCandidateCount: normalizedMode === 'relay-planned' ? 1 : normalizeCandidateCount(raw.defaultCandidateCount, defaults.defaultCandidateCount),
    continuityStrength: ['off', 'low', 'medium', 'strong'].includes(strength) ? strength as ContinuityStrength : defaults.continuityStrength,
    appearanceMemoryOverride: cleanString(raw.appearanceMemoryOverride) === 'global' || ['off', 'low', 'medium', 'strong'].includes(cleanString(raw.appearanceMemoryOverride)) ? cleanString(raw.appearanceMemoryOverride) as ProseIllustratorSettings['appearanceMemoryOverride'] : defaults.appearanceMemoryOverride,
    reuseAcceptedReferences: raw.reuseAcceptedReferences !== false,
    reuseLocationReferences: raw.reuseLocationReferences !== false,
    placementPolicy: normalizedMode === 'relay-planned' && placementPolicy === 'ask' ? 'after-beat' : (['after-beat', 'before-beat', 'end-of-message', 'ask'].includes(placementPolicy) ? placementPolicy as ProseIllustratorSettings['placementPolicy'] : defaults.placementPolicy),
    relayInsertionMode: raw.relayInsertionMode === 'review' ? 'review' : 'auto',
    showCaptions: raw.showCaptions !== false,
    autoGenerateRequiresApproval: raw.autoGenerateRequiresApproval === true,
    immediateDispatchOnOpportunitySelection: normalizedMode === 'relay-planned' ? true : raw.immediateDispatchOnOpportunitySelection === true,
    reanalyzeEditedMessages: raw.reanalyzeEditedMessages !== false,
    skipOoc: raw.skipOoc !== false,
    skipUtilities: raw.skipUtilities !== false,
    skipShortMessages: raw.skipShortMessages !== false,
    skipContinuation: false,
    skipImpersonation: false,
    skipTestFixtures: raw.skipTestFixtures !== false,
    minimumMessageLength: clampInt(raw.minimumMessageLength, 0, 2000, defaults.minimumMessageLength),
    highResolutionModifier: raw.highResolutionModifier === true,
    characterOnlySubjects: cleanString(raw.characterOnlySubjects),
    modelPlacedProtocolOverride: canonicalProtocolOverride(raw.modelPlacedProtocolOverride, defaults.modelPlacedProtocolOverride),
    relayPlannedProtocolOverride: canonicalProtocolOverride(raw.relayPlannedProtocolOverride, defaults.relayPlannedProtocolOverride),
    characterOnlyFramingPrompt: promptRegistry['story.framing.solo-scene'],
    sceneLedFramingPrompt: promptRegistry['story.framing.scene-snapshot'],
    continuityFramePrompt: promptRegistry['story.framing.sequence'],
    expressiveFramePrompt: promptRegistry['story.framing.emotional-beat'],
    paused: raw.paused === true,
  }
}

function proseSettingsForChat(state: StateFile, chatId: string): ProseIllustratorSettings {
  const globalSettings = state.proseIllustrator.settings.__global__ || {}
  const current = state.proseIllustrator.settings[chatId] || {}
  const normalized = normalizeProseIllustratorSettings({ ...defaultProseIllustratorSettings(), ...globalSettings, ...current })
  if (normalized.perspectiveMode === 'solo-scene' && selectedCharacterOnlySubjects(normalized).length === 0) {
    const cached = cachedChatCharacterIdentity(chatId)
    if (cached?.name) normalized.characterOnlySubjects = cached.name
  }
  state.proseIllustrator.settings[chatId] = normalized
  return normalized
}

function normalizeProsePerspectiveMode(value: unknown): ProseIllustratorSettings['perspectiveMode'] {
  const raw = cleanString(value)
  return PROSE_ILLUSTRATOR_PERSPECTIVE_MODE_ALIASES[raw as keyof typeof PROSE_ILLUSTRATOR_PERSPECTIVE_MODE_ALIASES]
    || defaultProseIllustratorSettings().perspectiveMode
}

function normalizeCustomSurfaceDefinition(surfaceId: string, value: unknown): CustomSurfaceDefinition | null {
  const raw = cleanParameters(value)
  const id = sanitizeSurfaceId(cleanString(raw.surfaceId) || surfaceId)
  if (!id) return null
  const baseSurfaceId = sanitizeSurfaceId(cleanString(raw.baseSurfaceId)) || id
  const target = cleanString(raw.targetId)
  const wrapper = sanitizeWrapperName(cleanString(raw.canonicalOuterWrapper))
  const shellMode = cleanString(raw.shellMode)
  const density = cleanString(raw.density)
  const accentMode = cleanString(raw.accentMode)
  const typography = cleanString(raw.typography)
  const mediaFit = cleanString(raw.mediaFit)
  return {
    surfaceId: id,
    baseSurfaceId,
    basedOnSurfaceId: sanitizeSurfaceId(cleanString(raw.basedOnSurfaceId)) || undefined,
    presetName: cleanString(raw.presetName) || (raw.builtIn === true ? 'Relay Default' : cleanString(raw.displayName) || titleCase(id)),
    shellMode: ['plain', 'sparkling'].includes(shellMode) ? shellMode as SurfaceShellMode : shellMode === 'collapsible' ? 'plain' : 'inline',
    defaultOpen: raw.defaultOpen === true,
    launcherLabel: cleanString(raw.launcherLabel) || cleanString(raw.displayName) || titleCase(baseSurfaceId),
    density: ['compact', 'comfortable', 'spacious'].includes(density) ? density as CustomSurfaceDefinition['density'] : 'comfortable',
    maxWidth: cleanString(raw.maxWidth) || (baseSurfaceId === 'smartphone' ? '430px' : '760px'),
    mediaFit: mediaFit === 'cover' ? 'cover' : 'contain',
    accentMode: accentMode === 'custom' ? 'custom' : 'theme',
    customAccent: /^#[0-9a-f]{3,8}$/i.test(cleanString(raw.customAccent)) ? cleanString(raw.customAccent) : '#c24b78',
    typography: ['system', 'editorial', 'mono', 'mixed'].includes(typography) ? typography as CustomSurfaceDefinition['typography'] : 'mixed',
    advancedCss: sanitizeDeclarativeCss(cleanString(raw.advancedCss)),
    displayName: cleanString(raw.displayName) || titleCase(baseSurfaceId),
    icon: cleanString(raw.icon) || 'image',
    targetId: isImageTarget(target) ? target : `custom.${baseSurfaceId}`,
    canonicalOuterWrapper: wrapper || `${baseSurfaceId.replace(/-/g, '_')}_surface`,
    imageSlotSelector: sanitizeWrapperName(cleanString(raw.imageSlotSelector)) || 'img',
    resolvedImageChildFormat: sanitizeDeclarativeMarkup(cleanString(raw.resolvedImageChildFormat)) || '<img src="{{imageUrl}}" alt="{{alt}}" data-dgir-key="{{slotKey}}" data-dgir-request-id="{{requestId}}" data-dgir-slot="{{slot}}" data-dgir-custom-target="{{target}}" data-dgir-image-id="{{imageId}}">',
    supportedAspectRatios: stringList(raw.supportedAspectRatios).filter(Boolean).slice(0, 8),
    defaultPromptProfileId: cleanString(raw.defaultPromptProfileId) || 'auto',
    peoplePolicy: ['allow', 'discourage', 'require', 'forbid'].includes(cleanString(raw.peoplePolicy)) ? cleanString(raw.peoplePolicy) as CustomSurfaceDefinition['peoplePolicy'] : 'allow',
    captionSupport: raw.captionSupport !== false,
    altTextSupport: raw.altTextSupport !== false,
    defaultCandidateCount: [1, 2, 4].includes(Number(raw.defaultCandidateCount)) ? Number(raw.defaultCandidateCount) as 1 | 2 | 4 : 1,
    compatibleRegenerationIntents: stringList(raw.compatibleRegenerationIntents).filter(id => REGENERATION_INTENTS.some(intent => intent.id === id)) as CustomSurfaceDefinition['compatibleRegenerationIntents'],
    declarativeLayoutFields: cleanParameters(raw.declarativeLayoutFields) as Record<string, string>,
    validationRules: stringList(raw.validationRules),
    sampleXml: sanitizeDeclarativeMarkup(cleanString(raw.sampleXml)),
    deterministicPreviewFixture: cleanParameters(raw.deterministicPreviewFixture),
    builtIn: raw.builtIn === true,
    enabled: raw.enabled !== false,
    promptEnabled: Object.prototype.hasOwnProperty.call(raw, 'promptEnabled') ? raw.promptEnabled !== false : (raw.builtIn === true ? defaultSurfacePromptEnabled(baseSurfaceId) : true),
    promptCategory: ['social-messaging', 'photography-keepsakes', 'covers-promotion', 'evidence-editorial', 'narrative-visuals', 'custom'].includes(cleanString(raw.promptCategory))
      ? cleanString(raw.promptCategory) as SurfacePromptCategory
      : defaultSurfacePromptCategory(baseSurfaceId),
    promptModule: cleanString(raw.promptModule) || DEFAULT_SURFACE_PROMPT_MODULES[baseSurfaceId] || `SURFACE: ${cleanString(raw.displayName) || titleCase(baseSurfaceId)}\nUse [${wrapper || `${baseSurfaceId.replace(/-/g, '_')}_surface`}]...[/${wrapper || `${baseSurfaceId.replace(/-/g, '_')}_surface`}] only when this enabled Relay surface is appropriate.`,
    hybridOwner: ['relay', 'regex'].includes(cleanString(raw.hybridOwner)) ? cleanString(raw.hybridOwner) as CustomSurfaceDefinition['hybridOwner'] : undefined,
    hybridOwnerConfigured: raw.hybridOwnerConfigured === true,
    updatedAt: Number(raw.updatedAt) || Date.now(),
  }
}

function sanitizeDeclarativeCss(value: string): string {
  if (!value) return ''
  return /<\/style|<script|javascript:|@import/i.test(value) ? '' : value
}

function validateCustomSurfaceDefinitions(definitions: Record<string, CustomSurfaceDefinition>): Record<string, string[]> {
  const errors: Record<string, string[]> = {}
  const activeTargets = new Map<string, string>()
  for (const definition of Object.values(definitions)) {
    const list = validateCustomSurfaceDefinition(definition)
    if (definition.enabled) {
      const targetKey = `${definition.targetId}:${definition.baseSurfaceId}`
      const existing = activeTargets.get(targetKey)
      if (existing && existing !== definition.surfaceId && definition.builtIn) list.push(`Duplicate built-in target preset also used by ${existing}.`)
      activeTargets.set(targetKey, definition.surfaceId)
    }
    if (list.length) errors[definition.surfaceId] = list
  }
  return errors
}

function validateCustomSurfaceDefinition(definition: CustomSurfaceDefinition): string[] {
  const errors: string[] = []
  if (!sanitizeSurfaceId(definition.surfaceId)) errors.push('Invalid surface ID.')
  if (!isImageTarget(definition.targetId)) errors.push('Invalid image target ID.')
  if (!sanitizeWrapperName(definition.canonicalOuterWrapper)) errors.push('Invalid wrapper name.')
  if (!sanitizeWrapperName(definition.imageSlotSelector)) errors.push('Invalid image slot selector.')
  const unsafe = `${definition.resolvedImageChildFormat}\n${definition.sampleXml}`
  if (/<script\b|on[a-z]+\s*=|javascript:/i.test(unsafe)) errors.push('Unsafe script or event-handler markup is not allowed.')
  if ((definition.sampleXml.match(new RegExp(`<${definition.canonicalOuterWrapper}\\b`, 'gi')) || []).length !== (definition.sampleXml.match(new RegExp(`</${definition.canonicalOuterWrapper}>`, 'gi')) || []).length) errors.push('Sample XML wrapper is unbalanced.')
  if (!definition.resolvedImageChildFormat.includes('{{imageUrl}}')) errors.push('Resolved child format must include {{imageUrl}}.')
  const mediaOptional = ['news', 'dispatch', 'letter', 'character-profile', 'inline-chat'].includes(definition.baseSurfaceId)
  if (!mediaOptional && !definition.sampleXml.includes('<image_request') && !definition.sampleXml.includes('<reverie-illustration')) errors.push('Sample XML must include an image request fixture.')
  return errors
}

function sanitizeSurfaceId(value: string): string {
  const clean = cleanString(value).toLocaleLowerCase().replace(/[^a-z0-9._-]/g, '-').replace(/^-+|-+$/g, '')
  return /^[a-z0-9][a-z0-9._-]{1,62}$/.test(clean) ? clean : ''
}

function sanitizeWrapperName(value: string): string {
  const clean = cleanString(value).replace(/[^A-Za-z0-9_-]/g, '')
  return /^[A-Za-z][A-Za-z0-9_-]{0,62}$/.test(clean) ? clean : ''
}

function sanitizeDeclarativeMarkup(value: string): string {
  return cleanString(value).replace(/<script[\s\S]*?<\/script>/gi, '').replace(/\son[a-z]+\s*=\s*(['"]).*?\1/gi, '').replace(/javascript:/gi, '')
}

async function handleNativeSurfaceAction(payload: Extract<FrontendMessage, { type: 'native_surface_action' }>, userId?: string): Promise<void> {
  const message = await resolveMessage(payload.chatId, payload.messageId)
  if (!message) throw new Error('Message not found.')
  const swipeId = activeSwipeId(message)
  const content = strictSwipeContent(message, swipeId)
  const requestId = cleanString(payload.requestId)
  const rootTag = sanitizeWrapperName(cleanString(payload.rootTag))
  let next = content
  if (payload.action === 'edit') {
    const originalMarkup = cleanString(payload.originalMarkup)
    const replacementMarkup = sanitizeDeclarativeMarkup(payload.replacementMarkup || '')
    if (!originalMarkup || !replacementMarkup) throw new Error('Relay needs both the current and replacement surface markup.')
    const originalRoot = /^<([A-Za-z][A-Za-z0-9_-]*)\b/i.exec(originalMarkup)?.[1] || ''
    const replacementRoot = /^<([A-Za-z][A-Za-z0-9_-]*)\b/i.exec(replacementMarkup)?.[1] || ''
    if (!originalRoot || replacementRoot.toLocaleLowerCase() !== originalRoot.toLocaleLowerCase()) throw new Error('The edited surface must keep the same outer wrapper.')
    const exactIndex = next.indexOf(originalMarkup)
    if (exactIndex < 0) throw new Error('Relay could not locate the original surface markup in the active swipe. Reopen the editor and try again.')
    next = `${next.slice(0, exactIndex)}${replacementMarkup}${next.slice(exactIndex + originalMarkup.length)}`
    await patchSwipeContent(payload.chatId, message, swipeId, next)
    await mutateState(payload.chatId, userId, state => {
      appendStateLog(state, {
        severity: 'info', stage: 'native-surface-renderer', eventType: 'native_surface_edited', chatId: payload.chatId,
        messageId: payload.messageId, requestId, message: 'Relay surface markup edited in place.',
        details: { rootTag: originalRoot, surfaceId: payload.surfaceId },
      })
    })
    await reconcileChatState(payload.chatId, userId, payload.messageId)
  } else if (payload.action === 'delete') {
    next = removeNativeSurfaceRequest(next, rootTag, requestId)
    if (next === content) throw new Error('Relay could not locate that native surface request in the active swipe.')
    await patchSwipeContent(payload.chatId, message, swipeId, next)
    await mutateState(payload.chatId, userId, state => {
      for (const record of Object.values(state.slots)) {
        if (record.chatId !== payload.chatId || record.messageId !== payload.messageId) continue
        if (requestId && record.requestId !== requestId) continue
        record.status = 'cancelled'
        record.orphaned = true
        record.updatedAt = Date.now()
      }
      appendStateLog(state, {
        severity: 'info', stage: 'native-surface-renderer', eventType: 'native_surface_deleted', chatId: payload.chatId,
        messageId: payload.messageId, requestId, message: 'Native Relay surface request removed from the active message. Completed assets remain in Archive.',
        details: { rootTag, surfaceId: payload.surfaceId },
      })
    })
  }
  await sendState(userId, payload.chatId)
}

function removeNativeSurfaceRequest(content: string, rootTag: string, requestId: string): string {
  const escapedId = requestId ? escapeRegExp(requestId) : ''
  if (rootTag) {
    const escapedTag = escapeRegExp(rootTag)
    const paired = new RegExp(`<${escapedTag}\\b[^>]*>[\\s\\S]*?${escapedId || '[\\s\\S]*?'}[\\s\\S]*?<\\/${escapedTag}>`, 'i')
    const replaced = content.replace(paired, '')
    if (replaced !== content) return replaced
  }
  if (requestId) {
    const illustration = new RegExp(`<reverie-illustration\\b(?=[^>]*(?:slot|id)=["'][^"']*${escapedId}[^"']*["'])[^>]*>[\\s\\S]*?<\\/reverie-illustration>`, 'i')
    let next = content.replace(illustration, '')
    if (next !== content) return next
    const request = new RegExp(`<image_request\\b(?=[^>]*(?:id|request_id)=["']${escapedId}["'])[^>]*>[\\s\\S]*?<\\/image_request>`, 'i')
    next = content.replace(request, '')
    if (next !== content) return next
    const resolved = new RegExp(`(?:<!--[\\s\\S]*?${escapedId}[\\s\\S]*?-->)?\\s*<(?:img|scene_image)\\b[^>]*data-dgir-request-id=["']${escapedId}["'][^>]*>(?:[\\s\\S]*?<\\/(?:scene_image)>)?`, 'i')
    next = content.replace(resolved, '')
    if (next !== content) return next
  }
  return content
}

async function handleCustomSurfaceAction(payload: Extract<FrontendMessage, { type: 'custom_surface_action' }>, userId?: string): Promise<void> {
  const chatId = payload.chatId || 'global'
  if (payload.action === 'bind_collection' || payload.action === 'unbind_collection') {
    if (!payload.chatId) throw new Error('A chat is required for Surface preset binding.')
    const config = await getConfig(userId)
    const presetId = cleanString(payload.presetId)
    if (payload.action === 'bind_collection' && !config.globalSurfaceStudio.collectionPresets[presetId]) throw new Error('Surface preset not found.')
    await mutateState(payload.chatId, userId, state => { state.surfacePresetBindingId = payload.action === 'bind_collection' ? presetId : undefined })
    await sendState(userId, payload.chatId)
    return
  }
  const configPatch: Partial<RouterConfig> = {}
  const simpleInjectionPreference = payload.action === 'set_utility_settings'
    && !payload.utilityInjectionPosition
    && typeof payload.utilityTemplate !== 'string'
    && typeof payload.utilityInjectionEnabled === 'boolean'
  if (payload.action === 'set_renderer_mode' || payload.action === 'set_default_shell_mode' || payload.action === 'set_color_mode' || simpleInjectionPreference) {
    const currentConfig = await getConfig(userId)
    const globalStudio = normalizeCustomSurfaceStudio(currentConfig.globalSurfaceStudio || defaultCustomSurfaceStudio())
    if (payload.action === 'set_renderer_mode') {
      if (!payload.rendererMode || !['relay', 'legacy-regex', 'hybrid'].includes(payload.rendererMode)) throw new Error('Renderer mode is invalid.')
      configPatch.surfaceRendererMode = payload.rendererMode
      globalStudio.rendererMode = payload.rendererMode
    } else if (payload.action === 'set_default_shell_mode') {
      if (!payload.shellMode || !['inline', 'plain', 'sparkling'].includes(payload.shellMode)) throw new Error('Default surface presentation is invalid.')
      configPatch.surfaceDefaultShellMode = payload.shellMode
      configPatch.narrativeDlcVariant = narrativeVariantForSurfaceShellMode(payload.shellMode)
      globalStudio.defaultShellMode = payload.shellMode
    } else if (payload.action === 'set_color_mode') {
      if (!payload.colorMode || !['realistic', 'primary'].includes(payload.colorMode)) throw new Error('Surface color mode is invalid.')
      configPatch.surfaceColorMode = payload.colorMode
      globalStudio.colorMode = payload.colorMode
    } else {
      const requested = payload.utilityInjectionEnabled === true
      configPatch.surfaceUtilityInjectionEnabled = requested
      globalStudio.utilityInjectionEnabled = requested
    }
    configPatch.surfacePreferencesInitialized = true
    configPatch.globalSurfaceStudio = globalStudio
    let savedConfig = await setConfig(configPatch, userId)
    // Narrative Utilities inherit the single Surface presentation choice. When
    // their Relay-owned scripts are installed, reconcile their variant now so
    // existing messages change with the same preference rather than waiting for
    // a manual reinstall or a later chat.
    const previousNarrativeHealth = savedConfig.narrativeDlcLastSync
    if (payload.action === 'set_default_shell_mode' && previousNarrativeHealth?.installed) {
      try {
        const health = await reconcileNarrativeRegex(spindle.regex_scripts, narrativeVariantForSurfaceShellMode(savedConfig.surfaceDefaultShellMode), userId)
        savedConfig = await setConfig({ narrativeDlcLastSync: health }, userId)
      } catch (error) {
        savedConfig = await setConfig({
          narrativeDlcLastSync: {
            status: 'failed',
            variant: narrativeVariantForSurfaceShellMode(savedConfig.surfaceDefaultShellMode),
            expected: previousNarrativeHealth.expected,
            installed: previousNarrativeHealth.installed,
            healthy: previousNarrativeHealth.healthy,
            drifted: previousNarrativeHealth.drifted,
            blocked: previousNarrativeHealth.blocked,
            message: `Narrative presentation could not be reconciled: ${error instanceof Error ? error.message : String(error)}`,
            updatedAt: Date.now(),
          },
        }, userId)
      }
    }
    invalidateRenderCaches(undefined, userId)
    await sendState(userId, payload.chatId)
    return
  }
  const currentConfig = await getConfig(userId)
  const updatedStudio = await mutateState(chatId, userId, state => {
    const studio = normalizeCustomSurfaceStudio(currentConfig.globalSurfaceStudio || state.customSurfaces || defaultCustomSurfaceStudio())
    const now = Date.now()
    const id = sanitizeSurfaceId(cleanString(payload.surfaceId) || cleanString(payload.definition?.surfaceId) || `surface-${now}`)
    const existing = id ? studio.definitions[id] : undefined
    if (payload.action === 'set_renderer_mode') {
      if (!payload.rendererMode || !['relay', 'legacy-regex', 'hybrid'].includes(payload.rendererMode)) throw new Error('Renderer mode is invalid.')
      studio.rendererMode = payload.rendererMode
      configPatch.surfaceRendererMode = payload.rendererMode
      configPatch.surfacePreferencesInitialized = true
    } else if (payload.action === 'set_default_shell_mode') {
      if (!payload.shellMode || !['inline', 'plain', 'sparkling'].includes(payload.shellMode)) throw new Error('Default surface presentation is invalid.')
      studio.defaultShellMode = payload.shellMode
      configPatch.surfaceDefaultShellMode = payload.shellMode
      configPatch.narrativeDlcVariant = narrativeVariantForSurfaceShellMode(payload.shellMode)
      configPatch.surfacePreferencesInitialized = true
    } else if (payload.action === 'set_color_mode') {
      if (!payload.colorMode || !['realistic', 'primary'].includes(payload.colorMode)) throw new Error('Surface color mode is invalid.')
      studio.colorMode = payload.colorMode
      configPatch.surfaceColorMode = payload.colorMode
      configPatch.surfacePreferencesInitialized = true
    } else if (payload.action === 'create' || payload.action === 'import') {
      const definition = normalizeCustomSurfaceDefinition(id, { ...payload.definition, surfaceId: id, builtIn: false, enabled: payload.definition?.enabled !== false })
      if (!definition) throw new Error('Surface preset definition is invalid.')
      studio.definitions[definition.surfaceId] = definition
      studio.activePresetIds[definition.baseSurfaceId] = definition.surfaceId
    } else if (payload.action === 'duplicate') {
      if (!existing) throw new Error('Surface preset not found.')
      const baseCopyId = sanitizeSurfaceId(`${existing.baseSurfaceId}-preset`)
      let copyId = baseCopyId
      let suffix = 2
      while (studio.definitions[copyId]) copyId = sanitizeSurfaceId(`${baseCopyId}-${suffix++}`)
      const copy = normalizeCustomSurfaceDefinition(copyId, {
        ...existing,
        surfaceId: copyId,
        baseSurfaceId: existing.baseSurfaceId,
        basedOnSurfaceId: existing.surfaceId,
        presetName: `${existing.presetName || existing.displayName} Copy`,
        displayName: existing.displayName,
        targetId: existing.targetId,
        builtIn: false,
        updatedAt: now,
      })!
      studio.definitions[copyId] = copy
      studio.activePresetIds[copy.baseSurfaceId] = copyId
    } else if (payload.action === 'edit') {
      if (!existing) throw new Error('Surface preset not found.')
      if (existing.builtIn) throw new Error('Built-in surface presets are protected. Duplicate or use Edit as Preset first.')
      studio.definitions[id] = normalizeCustomSurfaceDefinition(id, { ...existing, ...payload.definition, surfaceId: id, baseSurfaceId: existing.baseSurfaceId, targetId: existing.targetId, builtIn: false, updatedAt: now })!
    } else if (payload.action === 'activate') {
      if (!existing) throw new Error('Surface preset not found.')
      studio.activePresetIds[existing.baseSurfaceId] = existing.surfaceId
    } else if (payload.action === 'enable' || payload.action === 'disable') {
      if (!existing) throw new Error('Surface preset not found.')
      existing.enabled = payload.action === 'enable'
      existing.updatedAt = now
      if (existing.enabled && !studio.activePresetIds[existing.baseSurfaceId]) studio.activePresetIds[existing.baseSurfaceId] = existing.surfaceId
    } else if (payload.action === 'set_prompt_enabled') {
      if (!existing) throw new Error('Surface preset not found.')
      existing.promptEnabled = payload.promptEnabled === true
      existing.updatedAt = now
    } else if (payload.action === 'set_hybrid_owner') {
      if (!existing) throw new Error('Surface preset not found.')
      if (!payload.hybridOwner || !['relay', 'regex'].includes(payload.hybridOwner)) throw new Error('Hybrid owner is invalid.')
      existing.hybridOwner = payload.hybridOwner
      existing.hybridOwnerConfigured = true
      existing.updatedAt = now
    } else if (payload.action === 'set_category_prompt_enabled') {
      if (!payload.promptCategory) throw new Error('Surface prompt category is required.')
      applySurfaceCategoryPromptEnabled(studio, payload.promptCategory, payload.promptEnabled === true, now)
    } else if (payload.action === 'set_prompt_module') {
      if (!existing) throw new Error('Surface preset not found.')
      existing.promptModule = containsStalePromptTemplate(payload.promptModule)
        ? DEFAULT_SURFACE_PROMPT_MODULES[existing.baseSurfaceId] || existing.promptModule
        : cleanString(payload.promptModule) || DEFAULT_SURFACE_PROMPT_MODULES[existing.baseSurfaceId] || existing.promptModule
      existing.updatedAt = now
    } else if (payload.action === 'set_utility_settings') {
      const requestedInjectionState = typeof payload.utilityInjectionEnabled === 'boolean' ? payload.utilityInjectionEnabled : undefined
      if (typeof requestedInjectionState === 'boolean') {
        studio.utilityInjectionEnabled = requestedInjectionState
        configPatch.surfaceUtilityInjectionEnabled = requestedInjectionState
        configPatch.surfacePreferencesInitialized = true
      }
      if (payload.utilityInjectionPosition && ['system-prefix', 'before-chat-history', 'before-latest-user', 'after-latest-user', 'after-chat-history'].includes(payload.utilityInjectionPosition)) studio.utilityInjectionPosition = payload.utilityInjectionPosition
      if (typeof payload.utilityTemplate === 'string') studio.utilityTemplate = canonicalSurfaceUtilityTemplate(payload.utilityTemplate)
    } else if (payload.action === 'reset_utility_template') {
      studio.utilityTemplate = REVERIE_SURFACE_UTILITY_TEMPLATE
    } else if (payload.action === 'save_collection') {
      const presetId = sanitizeSurfaceId(cleanString(payload.presetId) || `collection-${now}`)
      const previous = studio.collectionPresets[presetId]
      studio.collectionPresets[presetId] = {
        presetId,
        name: cleanString(payload.presetName) || previous?.name || 'Surface Collection',
        surfaceIds: [...new Set((payload.surfaceIds || []).filter(surfaceId => Boolean(studio.definitions[surfaceId])))],
        createdAt: previous?.createdAt || now,
        updatedAt: now,
      }
    } else if (payload.action === 'set_default_collection') {
      const presetId = cleanString(payload.presetId)
      if (!studio.collectionPresets[presetId]) throw new Error('Surface preset not found.')
      studio.defaultCollectionPresetId = presetId
    } else if (payload.action === 'delete_collection') {
      const presetId = cleanString(payload.presetId)
      if (!studio.collectionPresets[presetId]) throw new Error('Surface preset not found.')
      delete studio.collectionPresets[presetId]
      if (studio.defaultCollectionPresetId === presetId) studio.defaultCollectionPresetId = undefined
    } else if (payload.action === 'delete') {
      if (!existing) throw new Error('Surface preset not found.')
      if (existing.builtIn) throw new Error('Built-in surface presets cannot be deleted. Disable them instead.')
      delete studio.definitions[id]
      if (studio.activePresetIds[existing.baseSurfaceId] === id) {
        const fallback = Object.values(studio.definitions).find(definition => definition.baseSurfaceId === existing.baseSurfaceId && definition.builtIn)
          || Object.values(studio.definitions).find(definition => definition.baseSurfaceId === existing.baseSurfaceId)
        if (fallback) studio.activePresetIds[existing.baseSurfaceId] = fallback.surfaceId
        else delete studio.activePresetIds[existing.baseSurfaceId]
      }
    }
    studio.validationErrors = validateCustomSurfaceDefinitions(studio.definitions)
    studio.updatedAt = now
    state.customSurfaces = studio
    appendStateLog(state, {
      severity: 'info', stage: 'native-surface-studio', eventType: `custom_surface_${payload.action}`, chatId,
      message: `Surface Studio action: ${payload.action}.`, details: { surfaceId: id, rendererMode: studio.rendererMode, errors: studio.validationErrors[id] || [] },
    })
    return studio
  })
  configPatch.globalSurfaceStudio = updatedStudio
  if (Object.keys(configPatch).length > 0) await setConfig(configPatch, userId)
  await sendState(userId, payload.chatId || undefined)
}

const SPECIAL_INTENT_ADDITIONS: Record<Exclude<ImageIntent, 'auto' | 'photo' | 'selfie' | 'candid' | 'evidence' | 'screenshot'>, string[]> = {
  meme: ['deliberately simple social-media image macro', 'clear visual punchline', 'short readable caption when requested', 'recognizable meme composition'],
  reaction: ['reusable social-media reaction image', 'emotionally legible expression and body language', 'awkward close crop when appropriate', 'unpolished phone-camera framing'],
  funny_edit: ['deliberately obvious cheap edit', 'arrows circles stickers or labels when requested', 'badly composited joke elements', 'group-chat edit aesthetic'],
  shitpost: ['intentionally chaotic low-effort shitpost', 'overcompressed repost quality', 'bad cropping and excessive effects when requested', 'unserious absurd visual humor'],
  cursed: ['accidental-looking cursed picture', 'awkward strange framing', 'harsh or imperfect capture', 'contextless social-media reaction energy'],
  viral_graphic: ['social-native viral graphic layout', 'clear headline hierarchy', 'short readable labels', 'repost-card or fake-infographic composition'],
  fandom_edit: ['fan-made collage or edit', 'decorative typography hearts sparkles or dramatic filters when requested', 'stan-account aesthetic', 'exaggerated emotional presentation'],
}

export function applySpecialImageIntent(prompt: string, intentValue: unknown, authoritativeText = ''): { prompt: string; applied: boolean; suppressed: string[] } {
  const intent = normalizeImageIntent(intentValue)
  if (!isSpecialImageIntent(intent)) return { prompt, applied: false, suppressed: [] }
  const authoritative = authoritativeText.toLocaleLowerCase()
  const conflict = /\b(?:cinematic|professional|polished|editorial|elegant|luxury|idealized|glamour|beauty[- ]focused|perfectly composed|pristine photography|key visual)\b/i
  const parts = prompt.split(',').map(part => cleanString(part)).filter(Boolean)
  const suppressed: string[] = []
  const retained = parts.filter(part => {
    if (!conflict.test(part)) return true
    if (authoritative.includes(part.toLocaleLowerCase())) return true
    suppressed.push(part)
    return false
  })
  const additions = SPECIAL_INTENT_ADDITIONS[intent as keyof typeof SPECIAL_INTENT_ADDITIONS] || []
  return {
    prompt: [...retained, ...additions].filter(Boolean).join(', '),
    applied: true,
    suppressed,
  }
}

const GENERIC_HUMAN_REMOVAL_NEGATIVES = new Set([
  'people', 'person', 'human', 'face', 'portrait', 'eyes', 'expression', 'hand', 'hands', 'body', 'legs', 'feet', 'shoes',
  'occupant', 'character', 'woman', 'man', 'girl', 'boy', 'portrait subject', 'detailed face',
  'person blocking the location', 'someone holding the object', 'reflected face',
])

export function removeConflictingHumanNegatives(value: string): { negative: string; removed: string[] } {
  const removed: string[] = []
  const kept = value.split(',').map(part => cleanString(part)).filter(Boolean).filter(term => {
    const normalized = term.toLocaleLowerCase().replace(/[.]+$/g, '').trim()
    if (!GENERIC_HUMAN_REMOVAL_NEGATIVES.has(normalized)) return true
    removed.push(term)
    return false
  })
  return { negative: kept.join(', '), removed }
}

function c5aIdentityResolution(job: RouterJob, context: ParserContextResult, corrections: string[] = []): NonNullable<PromptPipeline['identityResolution']> {
  const requirements = c5aCastRequirements(job.cast)
  return {
    requestedCast: job.cast || 'unspecified',
    effectiveRequiredCast: [requirements.character ? 'character' : '', requirements.persona ? 'persona' : ''].filter(Boolean),
    bindings: context.identityBindings.map(binding => ({
      kind: binding.kind,
      subjectId: binding.subjectId,
      subjectName: binding.subjectName,
      presetId: binding.presetId,
      presetName: binding.presetName,
      prompt: binding.prompt,
      source: binding.source,
      diagnostics: [...binding.diagnostics],
    })),
    fallbacks: [...context.identityFallbacks],
    corrections: [...corrections],
    appearanceRevision: context.appearanceRevision,
  }
}

function c5aIdentityWarnings(context: ParserContextResult, corrections: string[] = []): PromptWarning[] {
  const warnings: PromptWarning[] = []
  for (const binding of context.identityBindings) {
    const label = `${binding.kind === 'character' ? 'Character' : 'Persona'} binding`
    if (binding.source === 'unresolved') {
      warnings.push({ code: `c5a-${binding.kind}-identity-unresolved`, message: `${label} is unresolved: ${binding.diagnostics.join(' ')}`, sources: ['Native ImageGen active binding', 'Appearance Sidecar fallback chain'] })
    } else {
      warnings.push({ code: `c5a-${binding.kind}-binding-resolved`, message: `${label} resolved from ${binding.source}${binding.presetName ? ` (${binding.presetName})` : ''}.`, sources: ['Native ImageGen active binding'] })
    }
  }
  for (const fallback of context.identityFallbacks) warnings.push({ code: 'c5a-identity-fallback', message: fallback, sources: ['Appearance Sidecar fallback chain'] })
  for (const correction of corrections) warnings.push({ code: 'c5a-identity-conflict-corrected', message: correction, sources: ['Active Character/Persona identity contract'] })
  return warnings
}

async function buildAuthoritativeVisualPrompt(
  job: RouterJob,
  slot: string,
  config: RouterConfig,
  context: ParserContextResult,
  nativeSettings?: NativeImageSettings,
): Promise<PreparedPrompt> {
  const classification = context.classification
  const humanPolicy = targetHumanPolicy(job, classification)
  const profileBase = resolvePromptProfileDecision(job, config)
  let identityPrompt = job.originalSceneBrief
  if (humanPolicy.allowHumanPrompt) {
    identityPrompt = enforceVisualSubjectIdentity(identityPrompt, context.visualSubjects, job.target === 'prose.illustration')
    if (!context.visualSubjects.length && context.characterContext) identityPrompt = `${identityPrompt}, ${context.characterContext}`
    if (!context.visualSubjects.length && context.personaContext) identityPrompt = `${identityPrompt}, ${context.personaContext}`
    if (context.includedContinuityFacts.length) identityPrompt += `, Appearance Memory continuity: ${formatSelectedAppearanceFacts(context.includedContinuityFacts)}`
  }
  const profiled = applyPromptProfileToPositivePrompt(identityPrompt, profileBase)
  const identityCorrection = enforceC5AKnownIdentity(profiled.prompt, context.identityBindings)
  const finalized = finalizeParsedPositivePrompt(identityCorrection.prompt, classification, job)
  const specialIntent = applySpecialImageIntent(finalized, job.intent, authoritativeSceneText(job))
  const contextualSexual = applyContextualSexualGuidance(specialIntent.prompt, '', authoritativeSceneText(job))
  const nativeNegative = firstString(nativeSettings?.customNegativePrompt, nativeSettings?.negativePrompt, config.nativeNegativePrompt)
  const normalized = normalizeNegativePrompts({
    native: humanPolicy.allowHumanPrompt ? resolveSubjectNegativeMacros(nativeNegative, context.subjectNegativePrompt) : nativeNegative,
    request: job.originalNegativePrompt,
    subject: humanPolicy.allowHumanPrompt ? context.subjectNegativePrompt : '',
    parser: contextualSexual.negativePrompt,
    router: [profiled.decision.negativeAdditions, !humanPolicy.allowHumanPrompt ? humanPolicy.noHumanGuardrails : '', config.additionalNegativePrompt].filter(Boolean).join(', '),
  })
  const humanConflict = humanPolicy.allowHumanPrompt
    ? removeConflictingHumanNegatives(normalized.negative)
    : { negative: normalized.negative, removed: [] as string[] }
  normalized.negative = humanConflict.negative
  normalized.pipeline.finalNormalizedNegativePrompt = humanConflict.negative
  const pipeline: PromptPipeline = {
    ...normalized.pipeline,
    contextCaption: job.caption,
    rawNativeParserTemplate: context.rawTemplate,
    resolvedNativeParserInstructions: context.resolvedTemplate,
    characterContext: context.characterContext,
    personaContext: context.personaContext,
    routerParserInstructions: contextualizeSexualParserInstructions(config.customParserInstructions),
    parserRequest: [],
    rawParserResponse: '',
    parsedPositivePrompt: contextualSexual.prompt,
    parserRequested: false,
    parserSucceeded: false,
    parserFailed: false,
    parserFallbackUsed: false,
    unresolvedMacros: context.unresolvedMacros,
    requestClassification: classification,
    detectedTargetClass: humanPolicy.targetClass,
    imageIntent: job.intent,
    specialIntentApplied: specialIntent.applied,
    specialIntentSuppressedFragments: specialIntent.suppressed,
    nativeIncludeCharacters: context.nativeIncludeCharacters,
    nativeIncludePersona: context.nativeIncludePersona,
    effectiveIncludeCharacters: context.effectiveIncludeCharacters,
    effectiveIncludePersona: context.effectiveIncludePersona,
    characterContextSuppressed: !context.effectiveIncludeCharacters,
    personaContextSuppressed: !context.effectiveIncludePersona,
    noHumanGuardrailsApplied: !humanPolicy.allowHumanPrompt,
    contextGatingReason: `${context.gatingReason}; Story Model visual_prompt preserved without routine semantic Parser rewrite`,
    faceExpressionApplicable: humanPolicy.allowHumanPrompt && requestHasVisibleFace(classification),
    visualCharacterPrompt: humanPolicy.allowHumanPrompt ? context.characterContext : '',
    visualPersonaPrompt: humanPolicy.allowHumanPrompt ? context.personaContext : '',
    visualSubjectPrompts: humanPolicy.allowHumanPrompt ? context.visualSubjects : [],
    subjectNegativePrompt: humanPolicy.allowHumanPrompt ? context.subjectNegativePrompt : '',
    sanitizedRecentContext: context.sanitizedRecentContext,
    rejectedParserNegativeAdditions: [],
    promptProfile: profiled.decision,
    regenerationIntent: job.regenerationIntent,
    includedContinuityFacts: context.includedContinuityFacts,
    excludedContinuityFacts: context.excludedContinuityFacts,
    attachedReferenceAssetIds: context.attachedReferenceAssetIds,
    continuityConflicts: context.continuityConflicts,
    continuityStrength: context.continuityStrength,
    identityResolution: c5aIdentityResolution(job, context, identityCorrection.corrections),
    warnings: [
      ...c5aIdentityWarnings(context, identityCorrection.corrections),
      ...(humanConflict.removed.length ? [{ code: 'human-negative-conflict-repaired', message: `Removed generic human-suppression negatives from an explicit people scene: ${humanConflict.removed.join(', ')}`, sources: ['defensive prompt conflict check'] }] : []),
    ],
  }
  return {
    prompt: contextualSexual.prompt,
    negativePrompt: normalized.negative,
    promptMode: 'story_model_visual_prompt',
    promptPresetId: job.promptProfileId || config.nativePromptPresetId,
    parserUsed: false,
    parserOutput: '',
    parserConnectionId: null,
    parserModel: '',
    parserParameters: {},
    promptPipeline: pipeline,
  }
}

export async function parseSlotPrompt(
  job: RouterJob,
  slot: string,
  messages: ChatMessage[],
  targetIndex: number,
  config: RouterConfig,
  userId?: string,
  nativeSettings?: NativeImageSettings,
  highResMode = config.highResMode,
  forceSemanticRewrite = false,
): Promise<PreparedPrompt> {
  if (job.promptSource === 'visual_prompt' && job.originalSceneBrief.trim() && !forceSemanticRewrite) {
    const context = await buildParserContext(job, messages, targetIndex, config, userId, nativeSettings)
    return buildAuthoritativeVisualPrompt(job, slot, config, context, nativeSettings)
  }
  if (job.composedPositivePrompt?.trim()) {
    const classification = classifyImageRequest(job)
    const profile = resolvePromptProfileDecision(job, config)
    const humanPolicy = targetHumanPolicy(job, classification)
    const context = await buildParserContext(job, messages, targetIndex, config, userId, nativeSettings)
    const authoritativeScene = authoritativeSceneText(job)
    const composedSexualEscalationRejected = hasUnrequestedExplicitEscalation(authoritativeScene, job.composedPositivePrompt)
    const safeComposedPrompt = composedSexualEscalationRejected ? job.originalSceneBrief : job.composedPositivePrompt
    const identityPrompt = humanPolicy.allowHumanPrompt
      ? enforceVisualSubjectIdentity(safeComposedPrompt, context.visualSubjects, job.target === 'prose.illustration')
      : safeComposedPrompt
    const continuityText = humanPolicy.allowHumanPrompt && context.includedContinuityFacts.length
      ? `, Appearance Memory continuity: ${formatSelectedAppearanceFacts(context.includedContinuityFacts)}`
      : ''
    const profiled = applyPromptProfileToPositivePrompt(`${identityPrompt}${continuityText}`, profile)
    const identityCorrection = enforceC5AKnownIdentity(profiled.prompt, context.identityBindings)
    const finalizedPositivePrompt = finalizeParsedPositivePrompt(identityCorrection.prompt, classification, job)
    const specialIntent = applySpecialImageIntent(finalizedPositivePrompt, job.intent, authoritativeScene)
    const contextualSexual = applyContextualSexualGuidance(specialIntent.prompt, job.composedNegativePrompt || '', authoritativeScene)
    const positivePrompt = contextualSexual.prompt
    job.composedNegativePrompt = contextualSexual.negativePrompt
    const cleanupWarnings: PromptWarning[] = profiled.decision.removedPositiveFragments.map(item => ({
      code: 'portrait-language-removed',
      message: `Removed "${item.fragment}" from Sidecar composed prompt: ${item.reason}`,
      sources: ['prompt profile cleanup'],
    }))
    if (composedSexualEscalationRejected) cleanupWarnings.push({
      code: 'unrequested-sexual-escalation-rejected',
      message: 'The composed prompt added explicit sexual content that was absent from the authoritative scene brief. Relay discarded the escalation.',
      sources: ['authoritative scene fidelity'],
    })
    const negative = normalizeNegativePrompts({
      native: firstString(nativeSettings?.customNegativePrompt, nativeSettings?.negativePrompt, config.nativeNegativePrompt),
      request: job.originalNegativePrompt,
      subject: humanPolicy.allowHumanPrompt ? context.subjectNegativePrompt : '',
      parser: job.composedNegativePrompt || '',
      router: [profiled.decision.negativeAdditions, !humanPolicy.allowHumanPrompt ? humanPolicy.noHumanGuardrails : '', config.additionalNegativePrompt].filter(Boolean).join(', '),
    })
    const humanConflict = humanPolicy.allowHumanPrompt ? removeConflictingHumanNegatives(negative.negative) : { negative: negative.negative, removed: [] as string[] }
    negative.negative = humanConflict.negative
    negative.pipeline.finalNormalizedNegativePrompt = humanConflict.negative
    const pipeline: PromptPipeline = {
      ...negative.pipeline,
      contextCaption: job.caption,
      routerParserInstructions: contextualizeSexualParserInstructions(config.customParserInstructions),
      parserRequest: [],
      rawParserResponse: JSON.stringify(job.prosePromptComposition || {}),
      parsedPositivePrompt: positivePrompt,
      parserRequested: true,
      parserSucceeded: true,
      parserFailed: false,
      parserFallbackUsed: false,
      unresolvedMacros: [],
      requestClassification: classification,
      detectedTargetClass: humanPolicy.targetClass,
      imageIntent: job.intent,
      specialIntentApplied: specialIntent.applied,
      specialIntentSuppressedFragments: specialIntent.suppressed,
      nativeIncludeCharacters: config.nativeIncludeCharacters,
      nativeIncludePersona: config.nativeIncludePersona,
      effectiveIncludeCharacters: context.effectiveIncludeCharacters,
      effectiveIncludePersona: context.effectiveIncludePersona,
      characterContextSuppressed: !context.effectiveIncludeCharacters,
      personaContextSuppressed: !context.effectiveIncludePersona,
      noHumanGuardrailsApplied: !humanPolicy.allowHumanPrompt,
      contextGatingReason: humanPolicy.allowHumanPrompt && requestHasVisibleFace(classification)
        ? 'sidecar prompt composer supplied final person-facing prompt'
        : 'sidecar prompt composer supplied final non-person prompt; portrait/person context suppressed',
      faceExpressionApplicable: humanPolicy.allowHumanPrompt && requestHasVisibleFace(classification),
      visualCharacterPrompt: context.characterContext,
      visualPersonaPrompt: context.personaContext,
      visualSubjectPrompts: context.visualSubjects,
      subjectNegativePrompt: context.subjectNegativePrompt,
      sanitizedRecentContext: context.sanitizedRecentContext,
      rejectedParserNegativeAdditions: [],
      promptProfile: profiled.decision,
      regenerationIntent: job.regenerationIntent,
      includedContinuityFacts: context.includedContinuityFacts,
      excludedContinuityFacts: context.excludedContinuityFacts,
      attachedReferenceAssetIds: [...new Set([...(job.prosePromptComposition?.referenceAssetIdsUsed || []), ...context.attachedReferenceAssetIds])],
      continuityConflicts: context.continuityConflicts,
      continuityStrength: context.continuityStrength,
      identityResolution: c5aIdentityResolution(job, context, identityCorrection.corrections),
      warnings: [
        ...c5aIdentityWarnings(context, identityCorrection.corrections),
        ...(job.prosePromptComposition?.warnings?.map(message => ({ code: 'sidecar-composer-warning', message, sources: ['Sidecar prompt composer'] })) || []),
        ...cleanupWarnings,
        ...(humanConflict.removed.length ? [{ code: 'human-negative-conflict-repaired', message: `Removed generic human-suppression negatives from an explicit people scene: ${humanConflict.removed.join(', ')}`, sources: ['defensive prompt conflict check'] }] : []),
      ],
    }
    return {
      prompt: positivePrompt,
      negativePrompt: negative.negative,
      promptMode: `sidecar_prompt_composer:${PROSE_PROMPT_COMPOSER_VERSION}`,
      promptPresetId: job.promptProfileId || config.nativePromptPresetId,
      parserUsed: true,
      parserOutput: JSON.stringify(job.prosePromptComposition || {}),
      parserConnectionId: job.prosePromptComposition?.composerConnectionId || null,
      parserModel: job.prosePromptComposition?.composerModel || '',
      parserParameters: config.parserParameters,
      promptPipeline: pipeline,
    }
  }
  const connection = await resolveParserConnection(config, userId)
  const context = await buildParserContext(job, messages, targetIndex, config, userId, nativeSettings)
  const instruction = parserInstruction(job, slot, config, highResMode)
  const parserState = await getState(job.chatId, userId)
  const parserSettings = proseSettingsForChat(parserState, job.chatId)
  const sceneFraming = job.target === 'prose.illustration' ? effectiveFramingPrompt(parserSettings) : ''
  let lastError: unknown
  let lastRaw = ''

  for (let attempt = 0; attempt <= config.parserRetries; attempt += 1) {
    try {
      const parserRequest = [
        { role: 'system', content: registryPrompt(parserSettings, 'sidecar.parser.system') },
        { role: 'user', content: registryPrompt(parserSettings, 'sidecar.parser.request').replace(/\{\{\s*runtime_payload\s*\}\}/gi, JSON.stringify({ context: context.context, instruction, ...(sceneFraming ? { framingPrompt: sceneFraming } : {}) }, null, 2)) },
      ] as Array<{ role: 'system' | 'user' | 'assistant'; content: string }>
      const raw = await generateParserText(connection, config, parserRequest, userId, job.chatId, context.contextMetrics)
      lastRaw = raw
      let parserOutput = raw
      let parsed = parsePromptJson(raw)
      const authoritativeScene = authoritativeSceneText(job)
      if (hasUnrequestedExplicitEscalation(authoritativeScene, parsed.prompt)) {
        return buildParserFallbackPrompt(job, slot, config, context, nativeSettings, connection, raw, 'Parser added explicit sexual content that was absent from the authoritative scene brief.')
      }
      let parserHumanContaminationDetected = false
      let parserHumanContaminationRepaired = false
      const humanPolicy = targetHumanPolicy(job, context.classification)
      if (!humanPolicy.allowHumanPrompt) {
        const contamination = detectHumanPromptContamination(parsed.prompt)
        if (contamination.length) {
          parserHumanContaminationDetected = true
          const repairedRaw = await generateParserText(connection, config, [
            ...parserRequest,
            { role: 'assistant', content: raw },
            { role: 'user', content: registryPrompt(parserSettings, 'sidecar.parser.repair').replace(/\{\{\s*runtime_payload\s*\}\}/gi, JSON.stringify({ request: authoritativeSceneText(job), targetClass: humanPolicy.targetClass, priorPrompt: parsed.prompt, contamination }, null, 2)) },
          ], userId, job.chatId, context.contextMetrics)
          parserOutput = repairedRaw
          lastRaw = repairedRaw
          parsed = parsePromptJson(repairedRaw)
          parserHumanContaminationRepaired = true
          const remaining = detectHumanPromptContamination(parsed.prompt)
          if (remaining.length) throw new Error(`Parser returned human-contaminated prompt for ${humanPolicy.targetClass} target after repair: ${remaining.join(', ')}`)
        }
      }
      const identityPrompt = humanPolicy.allowHumanPrompt ? enforceVisualSubjectIdentity(parsed.prompt, context.visualSubjects, job.target === 'prose.illustration') : parsed.prompt
      const profileBase = resolvePromptProfileDecision(job, config)
      const profiled = applyPromptProfileToPositivePrompt(identityPrompt, profileBase)
      const identityCorrection = enforceC5AKnownIdentity(profiled.prompt, context.identityBindings)
      const finalizedPositivePrompt = finalizeParsedPositivePrompt(identityCorrection.prompt, context.classification, job)
      const specialIntent = applySpecialImageIntent(finalizedPositivePrompt, job.intent, authoritativeScene)
      const contextualSexual = applyContextualSexualGuidance(specialIntent.prompt, cleanString(parsed.negativeAdditions), authoritativeScene)
      const positivePrompt = contextualSexual.prompt
      parsed.negativeAdditions = contextualSexual.negativePrompt
      const snapshotNativeNegative = firstString(nativeSettings?.customNegativePrompt, nativeSettings?.negativePrompt, config.nativeNegativePrompt)
      const nativeNegative = humanPolicy.allowHumanPrompt ? resolveSubjectNegativeMacros(snapshotNativeNegative, context.subjectNegativePrompt) : snapshotNativeNegative
      const subjectNegative = humanPolicy.allowHumanPrompt ? context.subjectNegativePrompt : ''
      const disciplined = disciplineParserNegativeAdditions(parsed.negativeAdditions, positivePrompt, context.classification, nativeNegative, job.originalNegativePrompt, subjectNegative)
      const normalized = normalizeNegativePrompts({
        native: nativeNegative,
        request: job.originalNegativePrompt,
        subject: subjectNegative,
        parser: disciplined.negativeAdditions,
        router: [profiled.decision.negativeAdditions, !humanPolicy.allowHumanPrompt ? humanPolicy.noHumanGuardrails : '', config.additionalNegativePrompt].filter(Boolean).join(', '),
      })
      const humanConflict = humanPolicy.allowHumanPrompt ? removeConflictingHumanNegatives(normalized.negative) : { negative: normalized.negative, removed: [] as string[] }
      normalized.negative = humanConflict.negative
      normalized.pipeline.finalNormalizedNegativePrompt = humanConflict.negative
      const warningPipeline: PromptPipeline = {
        ...normalized.pipeline,
        contextCaption: job.caption,
        rawNativeParserTemplate: context.rawTemplate,
        resolvedNativeParserInstructions: context.resolvedTemplate,
        characterContext: context.characterContext,
        personaContext: context.personaContext,
        routerParserInstructions: contextualizeSexualParserInstructions(config.customParserInstructions),
        parserRequest,
        rawParserResponse: parserOutput,
        parsedPositivePrompt: positivePrompt,
        unresolvedMacros: context.unresolvedMacros,
        requestClassification: context.classification,
        detectedTargetClass: humanPolicy.targetClass,
        imageIntent: job.intent,
        specialIntentApplied: specialIntent.applied,
        specialIntentSuppressedFragments: specialIntent.suppressed,
        nativeIncludeCharacters: context.nativeIncludeCharacters,
        nativeIncludePersona: context.nativeIncludePersona,
        effectiveIncludeCharacters: context.effectiveIncludeCharacters,
        effectiveIncludePersona: context.effectiveIncludePersona,
        characterContextSuppressed: !context.effectiveIncludeCharacters,
        personaContextSuppressed: !context.effectiveIncludePersona,
        noHumanGuardrailsApplied: !humanPolicy.allowHumanPrompt,
        parserHumanContaminationDetected,
        parserHumanContaminationRepaired,
        contextGatingReason: context.gatingReason,
        faceExpressionApplicable: humanPolicy.allowHumanPrompt && requestHasVisibleFace(context.classification),
        visualCharacterPrompt: humanPolicy.allowHumanPrompt ? context.characterContext : '',
        visualPersonaPrompt: humanPolicy.allowHumanPrompt ? context.personaContext : '',
        visualSubjectPrompts: humanPolicy.allowHumanPrompt ? context.visualSubjects : [],
        subjectNegativePrompt: subjectNegative,
        sanitizedRecentContext: context.sanitizedRecentContext,
        rejectedParserNegativeAdditions: disciplined.rejected,
        promptProfile: profiled.decision,
        regenerationIntent: job.regenerationIntent,
        includedContinuityFacts: context.includedContinuityFacts,
        excludedContinuityFacts: context.excludedContinuityFacts,
        attachedReferenceAssetIds: context.attachedReferenceAssetIds,
        continuityConflicts: context.continuityConflicts,
        continuityStrength: context.continuityStrength,
        identityResolution: c5aIdentityResolution(job, context, identityCorrection.corrections),
        warnings: [],
      }
      const pipeline: PromptPipeline = {
        ...warningPipeline,
        warnings: [
          ...normalized.pipeline.warnings,
          ...c5aIdentityWarnings(context, identityCorrection.corrections),
          ...context.unresolvedMacros.map(macro => ({ code: 'unresolved-parser-macro', message: `${macro} could not be resolved from active context.`, sources: ['native parser template'] })),
          ...(parsed.recoveryMethod ? [{ code: 'parser-json-recovered', message: `Recovered a usable prompt from malformed parser output using ${parsed.recoveryMethod}.`, sources: ['parser output recovery'] }] : []),
          ...(parsed.legacyNegativePrompt ? [{ code: 'legacy-parser-negative', message: 'Parser returned legacy negativePrompt; treated as candidate negative additions.', sources: ['parser output'] }] : []),
          ...disciplined.warnings,
          ...(humanConflict.removed.length ? [{ code: 'human-negative-conflict-repaired', message: `Removed generic human-suppression negatives from an explicit people scene: ${humanConflict.removed.join(', ')}`, sources: ['defensive prompt conflict check'] }] : []),
          ...promptWarnings(positivePrompt, normalized.negative, warningPipeline),
        ],
        parserRequested: true,
        parserSucceeded: true,
        parserFailed: false,
        parserFallbackUsed: false,
      }
      return {
        prompt: positivePrompt,
        negativePrompt: normalized.negative,
        promptMode: `router_parser${config.nativePromptMode ? `:${config.nativePromptMode}` : ''}`,
        promptPresetId: config.nativePromptPresetId,
        parserUsed: true,
        parserOutput,
        parserConnectionId: connection.id,
        parserModel: config.parserModel || connection.model,
        parserParameters: config.parserParameters,
        promptPipeline: pipeline,
      }
    } catch (error) {
      lastError = error
      logStage(config, 'parser_attempt_failed', { attempt, error: error instanceof Error ? error.message : String(error) }, attempt >= config.parserRetries ? 'error' : 'warn')
      if (attempt >= config.parserRetries) break
    }
  }

  const fallbackError = lastError instanceof Error ? lastError : new Error('Parser did not return a usable prompt.')
  logStage(config, 'parser_fallback_used', {
    error: fallbackError.message,
    requestId: job.requestId,
    slot,
    target: job.target,
    rawLength: lastRaw.length,
  }, 'warn')
  return buildParserFallbackPrompt(job, slot, config, context, nativeSettings, connection, lastRaw, fallbackError.message)
}

export async function generateParserText(connection: ParserConnection, config: RouterConfig, messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>, userId?: string, chatId?: string, contextMetrics?: Partial<ContextMetrics>, workflow = 'parser'): Promise<string> {
  logStage(config, 'parser_start', {
    connectionId: connection.id,
    provider: connection.provider,
    model: config.parserModel || connection.model,
    parameterKeys: Object.keys(config.parserParameters),
  })
  const resolution = await resolveSidecarPromptMessages(messages, chatId, userId, {
    characterPrompt: config.nativeCharacterPrompt,
    personaPrompt: config.nativePersonaPrompt,
    nativeSettings: nativeSnapshotFromConfig(config)?.settings || {},
  })
  if (resolution.unresolvedRequiredMacros.length) throw new Error(`Required Sidecar macros could not be resolved: ${resolution.unresolvedRequiredMacros.join(', ')}`)
  const result = await generateRawSidecar({
    type: 'raw',
    provider: connection.provider,
    model: config.parserModel || connection.model,
    connection_id: connection.id,
    messages: resolution.messages,
    relayContextMetrics: contextMetrics || registryContextMetrics.get(messages),
    relayWorkflow: workflow,
    parameters: config.parserParameters,
    reasoning: { source: 'off' },
    userId,
  } as any, chatId, userId)
  const text = extractText(result)
  if (!text.trim()) throw new Error('Parser returned an empty response.')
  return text
}


function normalizedPromptFragment(value: string): string {
  return value.trim().replace(/[\s_]+/g, ' ').replace(/[.,;:]+$/g, '').toLocaleLowerCase()
}

function mergePromptFragmentsUnique(...values: string[]): string {
  const seen = new Set<string>()
  const out: string[] = []
  for (const value of values) {
    for (const fragment of cleanString(value).split(/[,\n]+/)) {
      const clean = fragment.trim().replace(/^[,;\s]+|[,;\s]+$/g, '')
      const key = normalizedPromptFragment(clean)
      if (!clean || !key || seen.has(key)) continue
      seen.add(key)
      out.push(clean)
    }
  }
  return out.join(', ')
}

const GENERIC_SUBJECT_ONLY_PROMPT_TOKENS = new Set([
  '1girl','1boy','2girls','2boys','solo','female','male','woman','man','girl','boy','person','portrait','character',
  'masterpiece','best quality','highly detailed','highres','absurdres','newest','official art','anime style','anime realism','manhwa style','semi realistic','painterly','soft shading',
])

function isMeaningfulAutomaticPrompt(prompt: string, baseTags = ''): boolean {
  const base = new Set(cleanString(baseTags).split(/[,\n]+/).map(normalizedPromptFragment).filter(Boolean))
  const fragments = cleanString(prompt).split(/[,\n.]+/).map(normalizedPromptFragment).filter(Boolean)
  const meaningful = fragments.filter(fragment => !base.has(fragment) && !GENERIC_SUBJECT_ONLY_PROMPT_TOKENS.has(fragment))
  if (!meaningful.length) return false
  const joined = meaningful.join(' ')
  return joined.replace(/\b(?:1girl|1boy|solo|portrait|character|masterpiece|best quality|highres|absurdres)\b/g, '').trim().length >= 8
}

function activeGenerationRecipe(config: RouterConfig, scope: 'relay'): GenerationRecipe | null {
  const id = cleanNullableString(config.activeGenerationRecipeId)
  if (!id) return null
  const recipe = config.generationRecipes.find(row => row.id === id)
  if (!recipe || (recipe.scope !== 'both' && recipe.scope !== scope)) return null
  return recipe
}

function applyRecipeToImagePlan(plan: ImagePlan, recipe: GenerationRecipe | null): void {
  if (!recipe) return
  plan.recipeId = recipe.id
  plan.recipeName = recipe.name
  plan.recipePositivePrompt = recipe.positivePrompt
  plan.recipeNegativePrompt = recipe.negativePrompt
  if (recipe.model) plan.model = recipe.model
  const overrides = { ...recipe.parameterOverrides }
  if (recipe.aspectRatio && recipe.aspectRatio !== 'native') overrides.aspectRatio = recipe.aspectRatio
  if (recipe.width) overrides.width = recipe.width
  if (recipe.height) overrides.height = recipe.height
  plan.slotOverrides = { ...plan.slotOverrides, ...overrides }
  plan.finalParameters = { ...plan.finalParameters, ...overrides }
  if (recipe.loraStack.length && plan.connection) {
    const loras = normalizeGenerationLoraStack(recipe.loraStack).map(entry => ({ lora_name: entry.lora_name, weight_model: entry.weight_model, weight_clip: entry.weight_clip }))
    removeProviderLoraParameters(plan.finalParameters)
    const application = applyLorasToProviderParameters(plan.provider || '', plan.finalParameters, loras, plan.connection)
    plan.effectiveLoras = loras
    plan.lorasSentToProvider = application.sent
    plan.loraOmittedFields = application.omitted
    plan.nativeActiveLoraPreset = null
    plan.effectiveAppliedLoraPreset = { id: recipe.id, name: recipe.name, source: 'generation-recipe', loras: recipe.loraStack }
    plan.loraBaseTags = ''
    plan.effectiveBaseTags = ''
  }
}

function removeProviderLoraParameters(parameters: Record<string, unknown>): void {
  for (const key of ['loras','loraWeights','lora_weights','loraNames','lora_names','loras_json','lora_strengths']) delete parameters[key]
}

async function generateImage(chatId: string | undefined, prepared: PreparedPrompt, plan: ImagePlan, userId?: string, streamContext?: ImageGenerationStreamContext, ownerChatId?: string): Promise<{
  imageId: string
  imageUrl: string
  imageWidth: number | null
  imageHeight: number | null
  aspectRatio: string
  imageConnectionId: string | null
  imageConnectionName: string
  imageProvider: string
  imageModel: string
  imageParameters: Record<string, unknown>
  nativeImageSettings: Record<string, unknown>
  nativeSettingsCapturedAt?: number
  connectionDefaultParameters: Record<string, unknown>
  slotOverrides: Record<string, unknown>
  finalImageParameters: Record<string, unknown>
  finalImageRequest: Record<string, unknown>
  finalImageSettingsSource: GenerationSnapshot['finalImageSettingsSource']
  nativeActiveLoraPreset: Record<string, unknown> | null
  effectiveAppliedLoraPreset: Record<string, unknown> | null
  lorasSentToProvider: unknown
  loraBaseTags: string
  baseTagsAddedToPrompt: string
  omittedBaseTags: Array<{ tag: string; group: string; reason: string }>
  highResMode: boolean
  highResRetainedBaseTags: string[]
  highResPreservedFramingCues: string[]
  loraOmittedFields: string[]
  galleryLinkStatus: GalleryLinkStatus
  galleryItemId?: string
  galleryLinkError?: string
}> {
  const source = streamContext?.source || 'relay-slot'
  const recipeMergedPrompt = mergePromptFragmentsUnique(plan.recipePositivePrompt || '', prepared.prompt)
  if (!isMeaningfulAutomaticPrompt(recipeMergedPrompt, plan.effectiveBaseTags)) {
    throw new Error('Relay blocked an automatic generation because the resolved scene prompt contained only style, quality, or generic subject tags.')
  }
  const assembled = assembleProviderPrompts(plan, prepared.prompt, prepared.negativePrompt)
  const effectivePrompt = assembled.prompt
  const effectivePrepared = { ...prepared, prompt: effectivePrompt, negativePrompt: assembled.negativePrompt }
  prepared.promptPipeline.userPositivePromptPrefix = plan.userPositivePromptPrefix
  prepared.promptPipeline.userNegativePromptPrefix = plan.userNegativePromptPrefix
  prepared.promptPipeline.prefixesApplied = Boolean(plan.userPositivePromptPrefix || plan.userNegativePromptPrefix)
  prepared.promptPipeline.scenePromptBeforePrefix = assembled.scenePromptBeforePrefix
  prepared.promptPipeline.finalProviderPrompt = effectivePrompt
  prepared.promptPipeline.finalProviderNegativePrompt = assembled.negativePrompt
  const parameters = buildImageParameters(plan, effectivePrepared)
  // Last provider-bound seam: retrieval prose, raw markup, provenance labels,
  // and malformed LoRA weights cannot cross into a live image request.
  assertProviderRequestSafe(effectivePrompt, effectivePrepared.negativePrompt, parameters)
  const resolvedOwnerChatId = cleanString(ownerChatId || chatId)
  const ownerCharacterId = resolvedOwnerChatId ? await ownerCharacterIdForChat(resolvedOwnerChatId, userId) : ''
  const shouldLinkToGallery = streamContext?.addToGallery === true && (source === 'relay-slot' || source === 'relay-illustrator')
  const finalRequest = {
    connection_id: plan.connectionId || undefined,
    prompt: effectivePrompt,
    negativePrompt: effectivePrepared.negativePrompt || undefined,
    model: plan.model || undefined,
    parameters,
    owner_chat_id: resolvedOwnerChatId || undefined,
    owner_character_id: ownerCharacterId || undefined,
    ownerCharacterId: ownerCharacterId || undefined,
    add_to_gallery: shouldLinkToGallery,
    gallery_caption: shouldLinkToGallery ? prepared.prompt.slice(0, 240) : undefined,
    generation_origin: source,
  }
  const resolvedStreamContext = streamContext || (chatId ? {
    chatId,
    generationId: `relay-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    source: 'relay-slot' as const,
  } : undefined)
  if (!resolvedStreamContext) throw new Error('Image generation requires either a real chat context or an explicit stream context.')
  spindle.log.info(`[ReverieRelay:generation_origin] ${JSON.stringify({ origin: source, chatId: resolvedOwnerChatId || chatId || null, requestId: resolvedStreamContext.requestId || null, generationId: resolvedStreamContext.generationId, connectionId: plan.connectionId, model: plan.model, semanticPromptPresent: isMeaningfulAutomaticPrompt(recipeMergedPrompt, plan.effectiveBaseTags), recipeId: plan.recipeId || null })}`)
  const result = await generateWithOptionalStream(finalRequest, plan, userId, resolvedStreamContext)

  let galleryItemId = cleanString(result.galleryItemId) || undefined
  let galleryLinkStatus: GalleryLinkStatus = cleanString(result.galleryLinkStatus) === 'linked' || result.galleryLinked === true
    ? 'linked'
    : shouldLinkToGallery
      ? 'failed'
      : 'skipped'
  let galleryLinkError = cleanString(result.galleryLinkError) || undefined
  let imageId = cleanString(result.imageId)
  let imageUrl = cleanString(result.imageUrl) || (imageId ? imageUrlFromId(imageId) : '')
  if (!imageId && imageUrl) imageId = imageIdFromResultUrl(imageUrl)
  let asset = imageId ? await spindle.images.get(imageId, { onlyOwned: true, userId }).catch(() => null) : null
  let visibleUnownedAsset = false
  if (!asset && imageId) {
    // Streaming providers may return a persisted host asset before extension ownership is visible.
    // Accept it as persisted, but prefer an owned upload whenever a data URL is available below.
    const anyAsset = await spindle.images.get(imageId, { onlyOwned: false, userId }).catch(() => null)
    if (anyAsset) {
      asset = anyAsset
      visibleUnownedAsset = true
    }
  }
  const persistedDataUrl = cleanString(result.imageDataUrl)
  if ((!asset || visibleUnownedAsset) && persistedDataUrl) {
    const uploaded = await spindle.images.uploadFromDataUrl(persistedDataUrl, {
      originalFilename: `reverie-relay-${streamContext?.source || 'generation'}-${Date.now()}.png`,
      owner_character_id: ownerCharacterId || undefined,
      owner_chat_id: resolvedOwnerChatId || undefined,
      add_to_gallery: shouldLinkToGallery,
      gallery_caption: shouldLinkToGallery ? prepared.prompt.slice(0, 240) : undefined,
      userId,
    } as any)
    imageId = cleanString(uploaded.id)
    imageUrl = cleanString(uploaded.url) || (imageId ? imageUrlFromId(imageId) : imageUrl)
    galleryItemId = cleanString((uploaded as any).galleryItemId) || galleryItemId
    if ((uploaded as any).galleryLinked === true || cleanString((uploaded as any).galleryLinkStatus) === 'linked') galleryLinkStatus = 'linked'
    galleryLinkError = cleanString((uploaded as any).galleryLinkError) || galleryLinkError
    asset = uploaded
    visibleUnownedAsset = false
  }
  if (!asset) {
    if (!persistedDataUrl && imageUrl) {
      try {
        const response = await fetch(imageUrl)
        if (response.ok) {
          const bytes = new Uint8Array(await response.arrayBuffer())
          const mime = response.headers.get('content-type') || 'image/png'
          const dataUrl = `data:${mime};base64,${bytesToBase64(bytes)}`
          const uploaded = await spindle.images.uploadFromDataUrl(dataUrl, {
            originalFilename: `reverie-relay-${streamContext?.source || 'generation'}-${Date.now()}.png`,
            owner_character_id: ownerCharacterId || undefined,
            owner_chat_id: resolvedOwnerChatId || undefined,
            add_to_gallery: shouldLinkToGallery,
            gallery_caption: shouldLinkToGallery ? prepared.prompt.slice(0, 240) : undefined,
            userId,
          } as any)
          imageId = cleanString(uploaded.id)
          imageUrl = cleanString(uploaded.url) || (imageId ? imageUrlFromId(imageId) : imageUrl)
          galleryItemId = cleanString((uploaded as any).galleryItemId) || galleryItemId
          if ((uploaded as any).galleryLinked === true || cleanString((uploaded as any).galleryLinkStatus) === 'linked') galleryLinkStatus = 'linked'
          galleryLinkError = cleanString((uploaded as any).galleryLinkError) || galleryLinkError
          asset = uploaded
        }
      } catch (error) {
        spindle.log.warn(`[ReverieRelay:image_persistence] Could not copy provider result URL into ImageTable: ${error instanceof Error ? error.message : String(error)}`)
      }
    }
  }
  if (visibleUnownedAsset) {
    spindle.log.warn(`[ReverieRelay:image_persistence] Provider result ${imageId} exists in ImageTable but could not be copied into an extension-owned row because no image data was returned.`)
  }
  if (!imageId || !asset) {
    spindle.log.error(`[ReverieRelay:image_persistence] ImageGen completed without a retrievable ImageTable asset for ${chatId || 'unscoped-generation'}:${plan.connectionId || 'connection?'}.`)
    throw new Error('ImageGen completed but could not be persisted to the ImageTable.')
  }
  if (!imageUrl) imageUrl = cleanString(asset.url) || imageUrlFromId(imageId)
  spindle.log.info(`[ReverieRelay:image_persistence] Confirmed ImageTable asset ${imageId} for ${streamContext?.source || 'generation'}.`)
  if (shouldLinkToGallery) {
    if (galleryLinkStatus === 'linked' && galleryItemId) {
      spindle.log.info(`[ReverieRelay:character_gallery] Linked ${imageId} as Gallery item ${galleryItemId} for ${source}.`)
    } else {
      galleryLinkStatus = 'failed'
      galleryLinkError ||= 'Lumiverse did not confirm a Character Gallery row.'
      spindle.log.warn(`[ReverieRelay:character_gallery] ${galleryLinkError}`)
    }
  }
  const imageWidth = asset?.width ?? null
  const imageHeight = asset?.height ?? null
  await recordLastGeneratedImage(resolvedOwnerChatId || chatId, imageUrl, userId)

  return {
    imageId,
    imageUrl,
    imageWidth,
    imageHeight,
    aspectRatio: aspectRatio(imageWidth, imageHeight),
    imageConnectionId: plan.connectionId,
    imageConnectionName: plan.connectionName,
    imageProvider: result.provider || plan.provider,
    imageModel: plan.model || result.model || '',
    imageParameters: parameters,
    nativeImageSettings: plan.nativeImageSettings,
    nativeSettingsCapturedAt: plan.nativeSettingsCapturedAt,
    connectionDefaultParameters: plan.connectionDefaultParameters,
    slotOverrides: plan.slotOverrides,
    finalImageParameters: parameters,
    finalImageRequest: { ...finalRequest, relay_origin: source, relay_generation_id: resolvedStreamContext.generationId, relay_recipe_id: plan.recipeId || undefined },
    finalImageSettingsSource: plan.settingsSource,
    nativeActiveLoraPreset: plan.nativeActiveLoraPreset,
    effectiveAppliedLoraPreset: plan.effectiveAppliedLoraPreset,
    lorasSentToProvider: plan.lorasSentToProvider,
    loraBaseTags: plan.loraBaseTags,
    baseTagsAddedToPrompt: plan.effectiveBaseTags,
    omittedBaseTags: plan.omittedBaseTags,
    highResMode: plan.highResMode,
    highResRetainedBaseTags: plan.highResRetainedBaseTags,
    highResPreservedFramingCues: plan.highResPreservedFramingCues,
    loraOmittedFields: plan.loraOmittedFields,
    galleryLinkStatus,
    galleryItemId,
    galleryLinkError,
  }
}

function createSlotDiagnostic(
  job: RouterJob,
  slot: string,
  prepared: PreparedPrompt,
  generated: {
    imageId: string
    imageUrl: string
    imageProvider: string
    imageConnectionName: string
    imageConnectionId: string | null
    imageModel: string
    finalImageParameters: Record<string, unknown>
    finalImageRequest: Record<string, unknown>
    nativeImageSettings: Record<string, unknown>
    connectionDefaultParameters: Record<string, unknown>
    slotOverrides: Record<string, unknown>
    nativeActiveLoraPreset: Record<string, unknown> | null
    lorasSentToProvider: unknown
  },
  promptProfile: PromptProfileDecision | undefined,
  intent: RegenerationIntent | undefined,
): SlotDiagnostic {
  const unavailable: string[] = []
  if (!generated.imageProvider) unavailable.push('provider result did not include provider name')
  if (!generated.imageModel) unavailable.push('provider result did not include model name')
  if (!prepared.parserOutput) unavailable.push('raw parser output unavailable')
  return {
    slotKey: slotKey({ chatId: job.chatId, messageId: job.messageId, swipeId: job.swipeId, requestId: job.requestId, slot }),
    generatedAt: Date.now(),
    proven: {
      originalRequestXml: job.originalRequestXml,
      originalSceneBrief: job.originalSceneBrief,
      target: job.target,
      imageIntent: job.intent,
      requestId: job.requestId,
      slot,
      finalPositivePrompt: prepared.prompt,
      finalNegativePrompt: prepared.negativePrompt,
      parserOutput: prepared.parserOutput,
      parserRequested: prepared.promptPipeline.parserRequested ?? prepared.parserUsed,
      parserSucceeded: prepared.promptPipeline.parserSucceeded ?? prepared.parserUsed,
      parserFailed: prepared.promptPipeline.parserFailed ?? false,
      parserFallbackUsed: prepared.promptPipeline.parserFallbackUsed ?? false,
      parserFallbackReason: prepared.promptPipeline.parserFallbackReason || '',
      imageId: generated.imageId,
      imageUrl: generated.imageUrl,
    },
    inheritedNative: {
      nativeImageSettings: generated.nativeImageSettings,
      connectionDefaultParameters: generated.connectionDefaultParameters,
      loras: generated.lorasSentToProvider,
      nativeActiveLoraPreset: generated.nativeActiveLoraPreset,
    },
    relayInferred: {
      automaticTargetClassification: promptProfile?.automaticClassification || classifyImageRequest(job),
      imageIntent: job.intent,
      selectedPromptProfile: promptProfile,
      regenerationIntent: intent,
      slotOverrides: generated.slotOverrides,
      finalImageParameters: generated.finalImageParameters,
      finalProviderRequest: generated.finalImageRequest,
      placementStrategy: 'exact slot marker or original request replacement',
      fallbackDecisions: prepared.promptPipeline.warnings,
    },
    unavailable,
    summary: [
      `${job.target} / ${slot}`,
      promptProfile ? `profile ${promptProfile.selectedProfileName}` : 'profile unavailable',
      intent ? `intent ${intent.label}` : '',
      generated.imageProvider ? `${generated.imageProvider} ${generated.imageModel || ''}`.trim() : '',
    ].filter(Boolean).join(' | '),
  }
}

function nativeSnapshotFromConfig(config: RouterConfig): NativeSettingsSnapshot | undefined {
  if (!Object.keys(config.nativeImageSettingsSnapshot || {}).length) return undefined
  return {
    settings: cloneRecord(config.nativeImageSettingsSnapshot) as NativeImageSettings,
    capturedAt: config.nativeSettingsCapturedAt || Date.now(),
  }
}

async function prepareImagePlan(
  config: RouterConfig,
  job: RouterJob,
  record: SlotRecord,
  nativeSnapshot: NativeSettingsSnapshot | undefined,
  userId?: string,
  highResMode = config.highResMode,
): Promise<ImagePlan> {
  const userPositivePromptPrefix = cleanString(config.proseIllustratorSettings.customPromptPrefix)
  const userNegativePromptPrefix = cleanString(config.proseIllustratorSettings.customNegativePrefix)
  const nativeLoraSnapshot = nativeSnapshot || nativeSnapshotFromConfig(config)
  if (config.generationSettingsSource !== 'native') nativeSnapshot = undefined
  else nativeSnapshot = nativeSnapshot || nativeSnapshotFromConfig(config)
  if (!nativeSnapshot && hasStoredImageSettings(record)) {
    const connection = record.imageConnectionId ? await getImageConnection(record.imageConnectionId, userId) : null
    const storedBaseTagPlan = filterBaseTagsForTarget(record.loraBaseTags || '', job, classifyImageRequest(job), highResMode)
    const regenerationOverrides = buildSlotOverrides(job, record.imageProvider || connection?.provider || '')
    const storedSlotOverrides = { ...cloneRecord(record.slotOverrides), ...regenerationOverrides }
    const storedFinalParameters = { ...cloneRecord(record.finalImageParameters || record.imageParameters), ...regenerationOverrides }
    const plan: ImagePlan = {
      connection,
      connectionId: record.imageConnectionId ?? connection?.id ?? null,
      connectionName: record.imageConnectionName || connection?.name || record.imageConnectionId || '',
      provider: record.imageProvider || connection?.provider || '',
      model: record.imageModel || connection?.model || '',
      nativeImageSettings: cloneRecord(record.nativeImageSettings),
      nativeSettingsCapturedAt: record.nativeSettingsCapturedAt,
      connectionDefaultParameters: cloneRecord(record.connectionDefaultParameters),
      nativeActiveParameters: extractNativeParameters(record.nativeImageSettings || {}),
      slotOverrides: storedSlotOverrides,
      finalParameters: storedFinalParameters,
      settingsSource: 'stored',
      nativeActiveLoraPreset: cloneNullableRecord(record.nativeActiveLoraPreset),
      effectiveAppliedLoraPreset: record.effectiveAppliedLoraPreset
        ? { ...cloneRecord(record.effectiveAppliedLoraPreset), base_tags: storedBaseTagPlan.effectiveBaseTags }
        : null,
      effectiveLoras: normalizeLoraEntries(record.effectiveAppliedLoraPreset?.loras),
      loraBaseTags: record.loraBaseTags || '',
      effectiveBaseTags: storedBaseTagPlan.effectiveBaseTags,
      omittedBaseTags: storedBaseTagPlan.omitted,
      highResMode,
      highResRetainedBaseTags: storedBaseTagPlan.retainedForHighRes,
      highResPreservedFramingCues: storedBaseTagPlan.preservedFramingCues,
      lorasSentToProvider: cloneValue(record.lorasSentToProvider),
      loraOmittedFields: [...(record.loraOmittedFields || [])],
      userPositivePromptPrefix,
      userNegativePromptPrefix,
    }
    return plan
  }

  const nativeSettings = nativeSnapshot?.settings || {}
  const connection = await resolveImageConnectionForPlan(config, nativeSnapshot, userId)
  if (!connection) throw new Error('No ImageGen connection is available.')

  const connectionDefaultParameters = withConnectionWorkflowDefaults(cleanParameters(connection.default_parameters), connection)
  const nativeActiveParameters = nativeSnapshot ? extractNativeParameters(nativeSettings) : cloneRecord(config.imageParameters)
  const slotOverrides = buildSlotOverrides(job, connection.provider || '')
  const finalParameters: Record<string, unknown> = {
    ...connectionDefaultParameters,
    ...nativeActiveParameters,
    ...slotOverrides,
  }
  const model = nativeSnapshot
    ? cleanString(nativeSettings.model) || cleanString(nativeSettings.checkpoint) || cleanString(finalParameters.model) || connection.model || ''
    : config.imageModel || connection.model || ''
  if (!nativeSnapshot || config.loraSource !== 'native') {
    for (const key of ['loraStack', 'loras', 'lora', 'loraWeights', 'lora_weights', 'loraModelWeights', 'loraClipWeights']) delete finalParameters[key]
  }
  const activeRelayStack = config.relayLoraStacks.find(stack => stack.id === config.activeRelayLoraStackId) || null
  const legacyRelayLoras = normalizeLoraEntries(config.imageLoraStack)
  const relayLoras = activeRelayStack?.loras || legacyRelayLoras
  const loraPlan = config.loraSource === 'native' && nativeLoraSnapshot
    ? resolveNativeLoraPlan(nativeLoraSnapshot.settings)
    : config.loraSource === 'relay'
      ? { nativePreset: null, effectivePreset: relayLoras.length || activeRelayStack?.baseTags ? { id: activeRelayStack?.id || 'relay-manual-loras', name: activeRelayStack?.name || 'Relay Manual LoRA Stack', loras: relayLoras, base_tags: activeRelayStack?.baseTags || '' } : null, effectiveLoras: relayLoras, baseTags: activeRelayStack?.baseTags || '' }
      : { nativePreset: null, effectivePreset: null, effectiveLoras: [], baseTags: '' }
  const baseTagPlan = filterBaseTagsForTarget(loraPlan.baseTags, job, classifyImageRequest(job), highResMode)
  const loraApplication = applyLorasToProviderParameters(connection.provider || '', finalParameters, loraPlan.effectiveLoras, connection)
  const plan: ImagePlan = {
    connection,
    connectionId: connection.id || null,
    connectionName: connection.name || connection.id || '',
    provider: connection.provider || '',
    model,
    nativeImageSettings: cloneRecord(nativeSettings),
    nativeSettingsCapturedAt: nativeSnapshot?.capturedAt,
    connectionDefaultParameters,
    nativeActiveParameters,
    slotOverrides,
    finalParameters,
    settingsSource: nativeSnapshot ? 'current-native' : 'router-config',
    nativeActiveLoraPreset: loraPlan.nativePreset,
    effectiveAppliedLoraPreset: loraPlan.effectivePreset
      ? { ...loraPlan.effectivePreset, base_tags: baseTagPlan.effectiveBaseTags }
      : null,
    effectiveLoras: loraPlan.effectiveLoras,
    loraBaseTags: loraPlan.baseTags,
    effectiveBaseTags: baseTagPlan.effectiveBaseTags,
    omittedBaseTags: baseTagPlan.omitted,
    highResMode,
    highResRetainedBaseTags: baseTagPlan.retainedForHighRes,
    highResPreservedFramingCues: baseTagPlan.preservedFramingCues,
    lorasSentToProvider: loraApplication.sent,
    loraOmittedFields: loraApplication.omitted,
    userPositivePromptPrefix,
    userNegativePromptPrefix,
  }

  applyRecipeToImagePlan(plan, activeGenerationRecipe(config, 'relay'))
  return plan
}

function validateImagePlan(plan: ImagePlan): void {
  if (!requiresWorkflow(plan)) return
  if (plan.finalParameters.workflow) return
  throw new Error(`${plan.provider} ImageGen connection "${plan.connectionName}" is missing parameters.workflow. Configure/select a native ComfyUI workflow before Reverie Relay generation.`)
}

function buildImageParameters(plan: ImagePlan, prepared: PreparedPrompt): Record<string, unknown> {
  const parameters = cloneRecord(plan.finalParameters)
  if (!parameters.workflow || typeof parameters.workflow !== 'object') return parameters

  const comfy = readComfyConfig(plan.connection?.metadata)
  if (!comfy?.fieldMappings?.length) return parameters
  parameters.workflow = patchWorkflow(parameters.workflow as Record<string, unknown>, comfy.fieldMappings, {
    positive_prompt: prepared.prompt,
    prompt: prepared.prompt,
    negative_prompt: prepared.negativePrompt,
    negativePrompt: prepared.negativePrompt,
    model: plan.model,
    checkpoint: plan.model,
    seed: Math.floor(Math.random() * 2147483647),
  })
  parameters.workflowFormat = parameters.workflowFormat || 'api_prompt'
  parameters.preserveImportedWorkflow = parameters.preserveImportedWorkflow ?? true
  return parameters
}

function hasStoredImageSettings(record: SlotRecord): boolean {
  return Boolean(record.finalImageParameters || record.imageParameters)
}

export function dimensionsForAspect(value: unknown): { width: number; height: number; aspectRatio: string } | null {
  const normalized = cleanString(value).replace(/\s+/g, '')
  const map: Record<string, [number, number]> = {
    '1:1': [1024, 1024],
    '3:2': [1216, 832],
    '2:3': [832, 1216],
    '4:3': [1152, 896],
    '3:4': [896, 1152],
    '4:5': [896, 1120],
    '5:4': [1120, 896],
    '16:9': [1344, 768],
    '9:16': [768, 1344],
  }
  const dims = map[normalized]
  return dims ? { width: dims[0], height: dims[1], aspectRatio: normalized } : null
}

function buildSlotOverrides(job: RouterJob, provider = ''): Record<string, unknown> {
  const overrides: Record<string, unknown> = {}
  if (!job.aspect) return overrides
  overrides.aspectRatio = job.aspect
  const dims = dimensionsForAspect(job.aspect)
  if (dims && /swarm|stability|sdapi|stable-diffusion/i.test(provider)) {
    overrides.width = dims.width
    overrides.height = dims.height
  }
  return overrides
}

function extractNativeParameters(settings: Record<string, unknown>): Record<string, unknown> {
  const base = cloneRecord(settings.parameters)
  for (const key of [
    'vae',
    'steps',
    'cfg',
    'cfgScale',
    'guidance',
    'guidanceScale',
    'sampler',
    'scheduler',
    'seed',
    'seedBehavior',
    'width',
    'height',
    'aspectRatio',
    'loras',
    'LoRAs',
    'lora',
    'loraSelections',
    'checkpoint',
    'model',
    'workflow',
    'workflowFormat',
    'workflowInputs',
    'providerParameters',
    'comfyui',
    'swarmui',
    'swarm',
  ]) {
    if (settings[key] !== undefined) base[key] = cloneValue(settings[key])
  }
  return base
}

export function resolveNativeLoraPlan(settings: NativeImageSettings): {
  nativePreset: Record<string, unknown> | null
  effectivePreset: Record<string, unknown> | null
  effectiveLoras: Array<{ lora_name: string; weight_model: number; weight_clip: number }>
  baseTags: string
} {
  const activeId = cleanString(settings.activeLoraPresetId)
  const presets = Array.isArray(settings.loraPresets) ? settings.loraPresets : []
  const nativePreset = activeId ? presets.find(preset => cleanString(preset.id) === activeId) || null : null
  if (!nativePreset || settings.bypassActiveLoraPreset === true) {
    return { nativePreset: cloneNullableRecord(nativePreset), effectivePreset: null, effectiveLoras: [], baseTags: '' }
  }
  const scaleValue = Number(settings.loraStrengthScale ?? 1)
  const scale = Number.isFinite(scaleValue) ? Math.max(0, Math.min(2, scaleValue)) : 1
  const effectiveLoras = normalizeLoraEntries(nativePreset.loras).map(entry => ({
    ...entry,
    weight_model: Math.max(0, entry.weight_model * scale),
    weight_clip: Math.max(0, entry.weight_clip * scale),
  }))
  const effectivePreset = { ...cloneRecord(nativePreset), loras: effectiveLoras, strengthScale: scale }
  return {
    nativePreset: cloneRecord(nativePreset),
    effectivePreset,
    effectiveLoras,
    baseTags: cleanString(nativePreset.base_tags),
  }
}

function normalizeLoraEntries(value: unknown): Array<{ lora_name: string; weight_model: number; weight_clip: number }> {
  if (!Array.isArray(value)) return []
  return value.map(entry => {
    const row = cleanParameters(entry)
    const name = firstString(row.lora_name, row.name, row.path)
    const model = Number(row.weight_model ?? row.strength ?? row.multiplier ?? 1)
    const clip = Number(row.weight_clip ?? model)
    return {
      lora_name: name,
      weight_model: Number.isFinite(model) ? model : 1,
      weight_clip: Number.isFinite(clip) ? clip : Number.isFinite(model) ? model : 1,
    }
  }).filter(entry => entry.lora_name)
}

export function normalizeRelayLoraStacks(value: unknown): RelayLoraStack[] {
  if (!Array.isArray(value)) return []
  const seen = new Set<string>()
  return value.map((entry, index) => {
    const row = cleanParameters(entry)
    const id = cleanString(row.id).replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '') || `relay-stack-${index + 1}`
    if (seen.has(id)) return null
    seen.add(id)
    const now = Date.now()
    return {
      id,
      name: cleanString(row.name) || `Relay Stack ${index + 1}`,
      loras: normalizeLoraEntries(row.loras),
      baseTags: normalizeTagList(firstString(row.baseTags, row.base_tags)),
      createdAt: Number.isFinite(Number(row.createdAt)) ? Number(row.createdAt) : now,
      updatedAt: Number.isFinite(Number(row.updatedAt)) ? Number(row.updatedAt) : now,
    }
  }).filter((entry): entry is RelayLoraStack => Boolean(entry))
}

export function applyLorasToProviderParameters(
  provider: string,
  parameters: Record<string, unknown>,
  loras: Array<{ lora_name: string; weight_model: number; weight_clip: number }>,
  connection: ImageConnection,
): { sent: unknown; omitted: string[] } {
  if (!loras.length) return { sent: [], omitted: [] }
  const normalizedProvider = provider.toLocaleLowerCase()
  if (normalizedProvider.includes('swarm')) {
    const names = commaSeparatedValues(parameters.loras)
    const weights = commaSeparatedValues(parameters.loraWeights ?? parameters.loraweights)
    const existingNames: string[] = []
    const existingWeights: string[] = []
    names.forEach((name, index) => {
      if (!name) return
      existingNames.push(name)
      existingWeights.push(weights[index] || '1')
    })
    parameters.loras = [...existingNames, ...loras.map(entry => entry.lora_name)].join(',')
    parameters.loraWeights = [...existingWeights, ...loras.map(entry => String(entry.weight_model))].join(',')
    delete parameters.loraweights
    return { sent: { loras: parameters.loras, loraWeights: parameters.loraWeights }, omitted: ['weight_clip (SwarmUI uses model strength)'] }
  }
  if (normalizedProvider.includes('sdapi') || normalizedProvider.includes('stable-diffusion')) {
    const existing = parseExistingSdLoras(parameters.lora)
    parameters.lora = JSON.stringify([...existing, ...loras.map(entry => ({ path: entry.lora_name, multiplier: entry.weight_model }))])
    return { sent: { lora: parameters.lora }, omitted: ['weight_clip (SD API uses model strength)'] }
  }
  if (normalizedProvider.includes('comfy')) {
    const comfy = readComfyConfig(connection.metadata)
    if (!parameters.workflow || !comfy?.fieldMappings.length) return { sent: [], omitted: ['LoRAs: ComfyUI workflow has no mapped LoRA loader fields'] }
    const patched = patchComfyWorkflowLoras(parameters.workflow as Record<string, unknown>, comfy.fieldMappings, loras)
    parameters.workflow = patched.workflow
    return { sent: patched.sent, omitted: patched.omitted }
  }
  return { sent: [], omitted: [`LoRAs: provider ${provider || 'unknown'} has no supported Relay translation`] }
}

function commaSeparatedValues(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(item => String(item).trim())
  return typeof value === 'string' ? value.split(',').map(item => item.trim()) : []
}

function parseExistingSdLoras(value: unknown): unknown[] {
  if (Array.isArray(value)) return [...value]
  if (typeof value !== 'string' || !value.trim()) return []
  try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed : [] } catch { return [] }
}

function patchComfyWorkflowLoras(
  workflow: Record<string, unknown>,
  mappings: Array<Record<string, string>>,
  loras: Array<{ lora_name: string; weight_model: number; weight_clip: number }>,
): { workflow: Record<string, unknown>; sent: unknown; omitted: string[] } {
  const patched = cloneRecord(workflow) as Record<string, { inputs?: Record<string, unknown> }>
  const nodeIds = [...new Set(mappings.filter(mapping => (mapping.mappedAs || mapping.mapped_as) === 'lora_name').map(mapping => mapping.nodeId || mapping.node_id).filter(Boolean))]
  const sent: Array<Record<string, unknown>> = []
  const count = Math.min(nodeIds.length, loras.length)
  for (let index = 0; index < count; index += 1) {
    const nodeId = nodeIds[index]
    const entry = loras[index]
    const node = patched[nodeId]
    if (!node?.inputs) continue
    for (const mapping of mappings.filter(row => (row.nodeId || row.node_id) === nodeId)) {
      const field = mapping.fieldName || mapping.field_name
      const mappedAs = mapping.mappedAs || mapping.mapped_as
      if (!field) continue
      if (mappedAs === 'lora_name') node.inputs[field] = entry.lora_name
      if (mappedAs === 'lora_strength_model') node.inputs[field] = entry.weight_model
      if (mappedAs === 'lora_strength_clip') node.inputs[field] = entry.weight_clip
    }
    sent.push({ nodeId, ...entry })
  }
  const omitted = loras.length > count ? [`${loras.length - count} LoRA(s): no mapped ComfyUI loader node`] : []
  return { workflow: patched as Record<string, unknown>, sent, omitted }
}

export function assembleProviderPrompts(
  plan: Pick<ImagePlan, 'recipePositivePrompt' | 'recipeNegativePrompt' | 'effectiveBaseTags' | 'userPositivePromptPrefix' | 'userNegativePromptPrefix'>,
  scenePrompt: string,
  sceneNegativePrompt: string,
): { prompt: string; negativePrompt: string; scenePromptBeforePrefix: string } {
  const scenePromptBeforePrefix = mergePromptFragmentsUnique(plan.recipePositivePrompt || '', scenePrompt)
  return {
    prompt: mergePromptFragmentsUnique(plan.userPositivePromptPrefix, scenePromptBeforePrefix, plan.effectiveBaseTags),
    negativePrompt: mergePromptFragmentsUnique(plan.userNegativePromptPrefix, plan.recipeNegativePrompt || '', sceneNegativePrompt),
    scenePromptBeforePrefix,
  }
}

export function filterBaseTagsForTarget(
  baseTags: string,
  job: Pick<RouterJob, 'originalSceneBrief' | 'caption' | 'alt' | 'target' | 'intent'>,
  classification: RequestClassification,
  highResMode = false,
): {
  effectiveBaseTags: string
  omitted: Array<{ tag: string; group: string; reason: string }>
  retainedForHighRes: string[]
  preservedFramingCues: string[]
} {
  const tags = baseTags.split(',').map(tag => tag.trim()).filter(Boolean)
  const authoritative = `${job.originalSceneBrief} ${job.caption || ''} ${job.alt || ''}`
  const authoritativeLower = authoritative.toLocaleLowerCase()
  const directSurface = classification === 'screenshot/article/ui' || classification === 'document'
  const imperfectCapture = classification === 'evidence photo'
    || /\b(surveillance|paparazzi|cctv|security camera|accidental|anonymous[- ]phone|low[- ]resolution|grainy|out[- ]of[- ]focus|from a distance|distant phone|blurry|poor focus)\b/i.test(authoritative)
  const framingCues = detectPreservedFramingCues(job)
  const specialIntent = isSpecialImageIntent(job.intent)
  const specialConflict = /\b(?:cinematic|professional|polished|editorial|elegant|luxury|idealized|glamour|beauty[- ]focused|pristine photography|key visual)\b/i

  const qualityPolish = new Set(['detailed face', 'detailed eyes', 'highly detailed', 'masterpiece', 'best quality'])
  const lightingComposition = new Set(['golden hour', 'backlighting', 'rim lighting', 'volumetric lighting', 'cinematic composition', 'shallow depth of field'])
  const humanAppearance = new Set([
    'detailed face', 'detailed eyes', 'delicate facial features', 'facial features',
    'detailed hair', 'glossy hair', 'natural skin texture', 'soft blush',
  ])
  const retained: string[] = []
  const retainedForHighRes: string[] = []
  const omitted: Array<{ tag: string; group: string; reason: string }> = []
  for (const tag of tags) {
    const normalized = normalizeBaseTag(tag)
    const explicitlyRequested = authoritativeLower.includes(normalized)
    if (specialIntent && specialConflict.test(tag) && !explicitlyRequested) {
      omitted.push({ tag, group: 'special-intent fidelity', reason: `${normalizeImageIntent(job.intent)} intent suppresses conflicting polished/editorial base styling` })
      continue
    }
    if (directSurface && !explicitlyRequested) {
      omitted.push({
        tag,
        group: humanAppearance.has(normalized) ? 'human appearance' : 'direct-surface fidelity',
        reason: `${classification} requests use the authoritative surface prompt without inherited LoRA base-tag styling unless that exact tag was explicitly requested`,
      })
      continue
    }
    if (humanAppearance.has(normalized) && !requestHasVisibleFace(classification)) {
      omitted.push({ tag, group: 'human appearance', reason: 'human appearance base tag conflicts with a non-face image request' })
      continue
    }
    if (!imperfectCapture) {
      retained.push(tag)
      continue
    }
    if (qualityPolish.has(normalized) && !highResMode) {
      omitted.push({ tag, group: 'quality/polish', reason: 'conflicts with the authoritative imperfect, distant, or evidentiary capture intent' })
      continue
    }
    if (qualityPolish.has(normalized) && highResMode) {
      const faceSpecific = normalized === 'detailed face' || normalized === 'detailed eyes'
      const distantOrObstructed = framingCues.some(cue => /distance|obstruction|surveillance/i.test(cue))
      if (faceSpecific && (!requestHasVisibleFace(classification) || distantOrObstructed)) {
        omitted.push({ tag, group: 'quality/polish', reason: 'face-detail emphasis would fight the preserved distant, obstructed, or non-face framing even in high-res mode' })
        continue
      }
      retained.push(tag)
      retainedForHighRes.push(tag)
      continue
    }
    if (lightingComposition.has(normalized)) {
      if (highResMode && authoritativeLower.includes(normalized)) {
        retained.push(tag)
        retainedForHighRes.push(tag)
        continue
      }
      omitted.push({ tag, group: 'lighting/composition', reason: 'would override the requested surveillance, candid, or anonymous-phone composition' })
      continue
    }
    retained.push(tag)
  }
  if (highResMode) {
    const enhancements = directSurface
      ? classification === 'screenshot/article/ui'
        ? ['high resolution', 'crisp interface edges', 'legible text layout', 'clean flat rendering']
        : ['high resolution', 'sharp document detail', 'legible surface text', 'even page clarity']
      : [
          'best quality',
          'polished rendering',
          'high texture fidelity',
          'refined lighting balance',
          'coherent details',
          ...(requestHasVisibleFace(classification) ? ['clean anatomy', 'identity-consistent features'] : []),
        ]
    for (const enhancement of enhancements) {
      if (retained.some(tag => normalizeBaseTag(tag) === enhancement)) continue
      retained.push(enhancement)
      retainedForHighRes.push(enhancement)
    }
  }
  return {
    effectiveBaseTags: retained.join(', '),
    omitted,
    retainedForHighRes,
    preservedFramingCues: highResMode ? framingCues : [],
  }
}

export function detectPreservedFramingCues(job: Pick<RouterJob, 'originalSceneBrief' | 'caption' | 'alt' | 'target'>): string[] {
  const text = `${job.originalSceneBrief} ${job.caption || ''} ${job.alt || ''}`
  const cues: string[] = []
  if (/\b(from a distance|distant|far away|long shot|wide shot)\b/i.test(text)) cues.push('subject distance')
  if (/\b(obstructed|obstruction|partially hidden|through (?:a |the )?(?:gate|fence|window)|behind (?:a |the )?(?:gate|fence|window))\b/i.test(text)) cues.push('visible obstruction')
  if (/\b(off[- ]center|crooked|imperfect(?:ly)? framed|accidental framing)\b/i.test(text)) cues.push('off-center imperfect framing')
  if (/\b(handheld|phone[- ]camera|smartphone|anonymous[- ]phone|camera phone)\b/i.test(text)) cues.push('handheld phone-camera perspective')
  if (/\b(grainy|mild grain|motion softness|motion blur|out[- ]of[- ]focus|soft focus|low[- ]resolution)\b/i.test(text)) cues.push('requested grain or focus softness')
  if (/\b(evidence|surveillance|paparazzi|cctv|security camera|stalker|candid)\b/i.test(text)) cues.push('candid evidence or surveillance intent')
  if (/\bselfie\b/i.test(text)) cues.push('believable selfie framing')
  return [...new Set(cues)]
}

function normalizeBaseTag(tag: string): string {
  return tag.toLocaleLowerCase().replace(/[()]/g, '').replace(/:\s*-?\d+(?:\.\d+)?\s*$/, '').trim()
}

function enrichPromptPipelineWithImagePlan(pipeline: PromptPipeline, plan: ImagePlan, prompt: string, negative: string): void {
  pipeline.nativeActiveLoraPreset = cloneValue(plan.nativeActiveLoraPreset)
  pipeline.effectiveAppliedLoraPreset = cloneValue(plan.effectiveAppliedLoraPreset)
  pipeline.lorasSentToProvider = cloneValue(plan.lorasSentToProvider)
  pipeline.loraBaseTags = plan.loraBaseTags
  pipeline.baseTagsAddedToPrompt = plan.effectiveBaseTags
  pipeline.omittedBaseTags = [...plan.omittedBaseTags]
  pipeline.highResMode = plan.highResMode
  pipeline.highResRetainedBaseTags = [...plan.highResRetainedBaseTags]
  pipeline.highResPreservedFramingCues = [...plan.highResPreservedFramingCues]
  pipeline.loraOmittedFields = [...plan.loraOmittedFields]
  const assembled = assembleProviderPrompts(plan, prompt, negative)
  pipeline.userPositivePromptPrefix = plan.userPositivePromptPrefix
  pipeline.userNegativePromptPrefix = plan.userNegativePromptPrefix
  pipeline.prefixesApplied = Boolean(plan.userPositivePromptPrefix || plan.userNegativePromptPrefix)
  pipeline.scenePromptBeforePrefix = assembled.scenePromptBeforePrefix
  pipeline.finalProviderPrompt = assembled.prompt
  pipeline.finalProviderNegativePrompt = assembled.negativePrompt
  const extra = [
    ...nativeImagePlanWarnings(plan),
    ...promptWarnings(assembled.prompt, assembled.negativePrompt, pipeline),
  ]
  const existing = new Set(pipeline.warnings.map(warning => `${warning.code}:${warning.message}`))
  pipeline.warnings.push(...extra.filter(warning => !existing.has(`${warning.code}:${warning.message}`)))
}

function nativeImagePlanWarnings(plan: ImagePlan): PromptWarning[] {
  const warnings: PromptWarning[] = []
  const nativeSettings = plan.nativeImageSettings || {}
  if (plan.settingsSource === 'router-config' && Object.keys(nativeSettings).length === 0) {
    warnings.push({
      code: 'native-settings-unavailable',
      message: 'Native ImageGen settings were unavailable. Relay used its connection defaults, so active native LoRAs and presets could not be verified.',
      sources: ['native ImageGen snapshot', 'resolved generation plan'],
      suggestion: 'Open native ImageGen once or use Sync Native Settings before regenerating.',
    })
  }
  const activePresetId = cleanString(nativeSettings.activeLoraPresetId)
  const bypassed = nativeSettings.bypassActiveLoraPreset === true
  if (activePresetId && !bypassed && !plan.nativeActiveLoraPreset) {
    warnings.push({
      code: 'native-lora-preset-unresolved',
      message: `Native LoRA preset "${activePresetId}" was selected but its preset definition could not be resolved. No preset LoRAs were inherited.`,
      sources: ['native ImageGen LoRA preset'],
      suggestion: 'Re-sync native settings and verify the preset still exists.',
    })
  } else if (plan.nativeActiveLoraPreset && !bypassed && plan.effectiveLoras.length === 0) {
    warnings.push({
      code: 'native-lora-stack-empty',
      message: 'The active native LoRA preset resolved, but it contained no usable LoRA entries.',
      sources: ['native ImageGen LoRA preset'],
    })
  }
  if (plan.effectiveLoras.length > 0 && !providerPayloadContainsLoras(plan.lorasSentToProvider)) {
    warnings.push({
      code: 'native-lora-provider-translation-failed',
      message: `${plan.effectiveLoras.length} inherited LoRA${plan.effectiveLoras.length === 1 ? '' : 's'} resolved, but none were confirmed in the provider payload.`,
      sources: ['native ImageGen LoRA preset', 'provider translation'],
      suggestion: 'Inspect the provider mapping and LoRA fields before trusting the result.',
    })
  }
  return warnings
}

function providerPayloadContainsLoras(value: unknown): boolean {
  if (Array.isArray(value)) return value.length > 0
  if (!value || typeof value !== 'object') return Boolean(cleanString(value))
  const row = value as Record<string, unknown>
  return Boolean(
    cleanString(row.loras) ||
    cleanString(row.loraWeights) ||
    cleanString(row.lora) ||
    (Array.isArray(row.entries) && row.entries.length) ||
    Object.keys(row).length,
  )
}

function withConnectionWorkflowDefaults(parameters: Record<string, unknown>, connection: ImageConnection): Record<string, unknown> {
  const next = cloneRecord(parameters)
  if (next.workflow) return next
  const comfy = readComfyConfig(connection.metadata)
  if (comfy?.workflow) {
    next.workflow = cloneValue(comfy.workflow)
    next.workflowFormat = next.workflowFormat || 'api_prompt'
    next.preserveImportedWorkflow = next.preserveImportedWorkflow ?? true
  }
  return next
}

async function resolveImageConnectionForPlan(config: RouterConfig, nativeSnapshot: NativeSettingsSnapshot | undefined, userId?: string): Promise<ImageConnection | null> {
  const nativeConnectionId = nativeSnapshot ? firstString(
    nativeSnapshot.settings.activeImageGenConnectionId,
    nativeSnapshot.settings.imageConnectionId,
    nativeSnapshot.settings.connectionId,
    nativeSnapshot.settings.activeConnectionId,
  ) : null
  const requestedId = nativeConnectionId || config.imageConnectionId
  if (requestedId) {
    const configured = await getImageConnection(requestedId, userId)
    if (configured) return configured
    const source = nativeConnectionId ? 'native ImageGen' : 'Relay'
    throw new Error(`${source} ImageGen connection "${requestedId}" was selected but could not be found.`)
  }
  const connections = await spindle.imageGen.listConnections(userId) as ImageConnection[]
  return connections.find(connection => connection.is_default) || connections[0] || null
}

async function getImageConnection(connectionId: string, userId?: string): Promise<ImageConnection | null> {
  try {
    return await spindle.imageGen.getConnection(connectionId, userId) as ImageConnection | null
  } catch {
    return null
  }
}

function cloneRecord(value: unknown): Record<string, unknown> {
  return cleanParameters(cloneValue(value))
}

function cloneNullableRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return cloneRecord(value)
}

function cloneValue<T>(value: T): T {
  if (value === undefined || value === null) return value
  try {
    return JSON.parse(JSON.stringify(value)) as T
  } catch {
    return value
  }
}

function firstString(...values: unknown[]): string {
  for (const value of values) {
    const clean = cleanString(value)
    if (clean) return clean
  }
  return ''
}

export function requiresWorkflow(plan: ImagePlan): boolean {
  const provider = `${plan.provider} ${plan.connectionName}`.toLowerCase()
  if (provider.includes('swarm')) return false
  if (provider.includes('comfy')) return true
  const metadata = plan.connection?.metadata
  if (!metadata || typeof metadata !== 'object') return false
  const record = metadata as Record<string, any>
  return record.comfyui?.requires_workflow === true || record.comfyui?.requiresWorkflow === true
}

function readComfyConfig(metadata: unknown): { workflow: Record<string, unknown> | null; fieldMappings: Array<Record<string, string>> } | null {
  if (!metadata || typeof metadata !== 'object') return null
  const record = metadata as Record<string, any>
  const comfy = record.comfyui && typeof record.comfyui === 'object' ? record.comfyui : record.swarmui
  if (!comfy || typeof comfy !== 'object') return null
  const workflow = comfy.workflow_api_json || comfy.workflow_json || comfy.workflow || null
  const fieldMappings = Array.isArray(comfy.field_mappings) ? comfy.field_mappings : []
  return {
    workflow: workflow && typeof workflow === 'object' ? workflow as Record<string, unknown> : null,
    fieldMappings,
  }
}

function patchWorkflow(workflow: Record<string, unknown>, mappings: Array<Record<string, string>>, values: Record<string, unknown>): Record<string, unknown> {
  const patched = JSON.parse(JSON.stringify(workflow)) as Record<string, { inputs?: Record<string, unknown> }>
  for (const mapping of mappings) {
    const nodeId = mapping.nodeId || mapping.node_id
    const fieldName = mapping.fieldName || mapping.field_name
    const mappedAs = mapping.mappedAs || mapping.mapped_as
    if (!nodeId || !fieldName || !mappedAs) continue
    const node = patched[nodeId]
    if (!node?.inputs || typeof node.inputs !== 'object') continue
    const value = values[mappedAs]
    if (value !== undefined && value !== null && value !== '') node.inputs[fieldName] = value
  }
  return patched as Record<string, unknown>
}

async function resolveParserConnection(config: RouterConfig, userId?: string): Promise<ParserConnection> {
  if (!config.parserConnectionId) throw new Error('Select or sync a Relay parser connection before generating.')
  const connection = await spindle.connections.get(config.parserConnectionId, userId)
  if (!connection) throw new Error('Relay parser connection not found.')
  return {
    id: connection.id,
    name: connection.name,
    provider: connection.provider,
    model: connection.model,
  }
}

async function resolveImageConnection(config: RouterConfig, userId?: string): Promise<ImageConnection | null> {
  if (config.imageConnectionId) {
    const configured = await spindle.imageGen.getConnection(config.imageConnectionId, userId) as ImageConnection | null
    if (configured) return configured
  }
  const connections = await spindle.imageGen.listConnections(userId) as ImageConnection[]
  return connections.find(connection => connection.is_default) || connections[0] || null
}

async function buildParserContext(
  job: RouterJob,
  messages: ChatMessage[],
  targetIndex: number,
  config: RouterConfig,
  _userId?: string,
  nativeSettings?: NativeImageSettings,
): Promise<ParserContextResult> {
  const blocks: string[] = []
  const classification = classifyImageRequest(job)
  const humanPolicy = targetHumanPolicy(job, classification)
  const profileDecision = resolvePromptProfileDecision(job, config)
  const castRequirements = c5aCastRequirements(job.cast)
  const suppressIdentityContext = profileDecision.suppressedContext.some(item => item.source.includes('character/persona'))
  // Explicit cast always wins over profile suppression. A profile can shape the
  // photograph, but it cannot silently remove a requested active identity.
  const characterApplicable = humanPolicy.allowHumanContext && (castRequirements.character || (!job.cast && !suppressIdentityContext && requestDepictsCharacter(classification, job.originalSceneBrief)))
  const personaApplicable = humanPolicy.allowHumanContext && (castRequirements.persona || (!job.cast && !suppressIdentityContext && requestDepictsPersona(classification, job.originalSceneBrief)))
  const nativeIncludeCharacters = typeof nativeSettings?.includeCharacters === 'boolean' ? nativeSettings.includeCharacters : config.nativeIncludeCharacters
  const nativeIncludePersona = typeof nativeSettings?.includePersona === 'boolean' ? nativeSettings.includePersona : config.nativeIncludePersona
  const promptPresets = clonePromptPresets(nativeSettings?.promptPresets ?? config.nativePromptPresets)
  const [activeCharacter, activePersona] = await Promise.all([
    characterApplicable ? readChatCharacterIdentity(job.chatId, _userId).catch(() => null) : Promise.resolve(null),
    personaApplicable ? readCurrentHostPersona(_userId, job.chatId) : Promise.resolve(null),
  ])
  const state = await getState(job.chatId, _userId)
  const [characterCard, personaCard, lorebookContext] = await Promise.all([
    characterApplicable ? readCharacterContext(job.chatId, _userId, job.originalSceneBrief) : Promise.resolve(''),
    personaApplicable ? readActivePersonaContext(_userId, job.originalSceneBrief, 'routine', job.chatId) : Promise.resolve(''),
    config.includeLorebook ? readLorebookContext(job.chatId, _userId, job.originalSceneBrief) : Promise.resolve(''),
  ])
  const settingsForBinding = nativeSettings || nativeSnapshotFromConfig(config)?.settings || {}
  const characterBinding = characterApplicable
    ? resolveC5ANativeIdentityBinding(settingsForBinding, 'character', activeCharacter)
    : null
  const personaBinding = personaApplicable
    ? resolveC5ANativeIdentityBinding(settingsForBinding, 'persona', activePersona ? { id: cleanString(activePersona.id), name: cleanString(activePersona.name) } : null)
    : null
  const identityBindings = [characterBinding, personaBinding].filter((binding): binding is C5ANativeIdentityBinding => Boolean(binding))
  const identityFallbacks: string[] = []
  const sidecarFallbackSubjectKeys = new Set<string>()
  const identityKey = (value: unknown) => cleanString(value).toLocaleLowerCase().replace(/[\s_-]+/g, '')
  const continuityPromptFor = (name: string): string => {
    if (!name) return ''
    const selected = selectContinuityForSubjects(state.continuityVault, {
      subjectNames: [name], chatId: job.chatId, sceneBrief: job.originalSceneBrief, strength: state.continuityVault.strength,
    }).included
    return selected.map(appearanceFactDescriptor).filter(Boolean).join(', ')
  }
  const resolveIdentityPrompt = (binding: C5ANativeIdentityBinding | null, cardContext: string, label: string): string => {
    if (!binding) return ''
    const nativePrompt = sanitizeVisualPreset(binding.prompt)
    if (nativePrompt) return nativePrompt
    const sidecarPrompt = sanitizeVisualPreset(continuityPromptFor(binding.subjectName))
    if (sidecarPrompt) {
      identityFallbacks.push(`${label}: Appearance Sidecar state used because ${binding.diagnostics.join(' ')}`)
      sidecarFallbackSubjectKeys.add(identityKey(binding.subjectName))
      sidecarFallbackSubjectKeys.add(identityKey(binding.subjectId))
      return sidecarPrompt
    }
    // Card context is identity authority. Lorebook prose is retrieval context
    // for the Sidecar and must never be copied wholesale into a provider prompt.
    const trustedContext = normalizedVisualFactsFromContext(cardContext)
    if (trustedContext) {
      identityFallbacks.push(`${label}: normalized card visual facts used because ${binding.diagnostics.join(' ')}`)
      return trustedContext
    }
    identityFallbacks.push(`${label}: unresolved; ${binding.diagnostics.join(' ')}`)
    return ''
  }
  const characterPrompt = resolveIdentityPrompt(characterBinding, characterCard, 'Character')
  const personaPrompt = resolveIdentityPrompt(personaBinding, personaCard, 'Persona')
  const matchedSubjects = humanPolicy.allowHumanContext ? resolveNamedVisualSubjects(job.originalSceneBrief, promptPresets) : []
  const castSubjects: VisualSubjectPrompt[] = []
  const includeCharacter = characterApplicable && (castRequirements.character || config.includeCharacterInfo)
  const includePersona = personaApplicable && (castRequirements.persona || config.includePersonaInfo)
  if (includeCharacter) castSubjects.push({
    id: cleanString(activeCharacter?.id) || undefined,
    name: cleanString(activeCharacter?.name) || 'active character',
    kind: 'character',
    prompt: characterPrompt || 'Identity unresolved: preserve the active Character in this scene.',
    negativePrompt: sanitizeVisualPreset(characterBinding?.negativePrompt || ''),
  })
  if (includePersona) castSubjects.push({
    id: cleanString(activePersona?.id) || undefined,
    name: cleanString(activePersona?.name) || 'active persona',
    kind: 'persona',
    prompt: personaPrompt || 'Identity unresolved: preserve the active Persona in this scene.',
    negativePrompt: sanitizeVisualPreset(personaBinding?.negativePrompt || ''),
  })
  // A declared cast is authoritative for the active Character/Persona, but it
  // must not erase separately named NPCs in the scene. Filter active bindings
  // out of discovery first, then add only the cast-authorized active subjects.
  const activeSubjectKeys = new Set([
    cleanString(activeCharacter?.id), cleanString(activeCharacter?.name),
    cleanString(activePersona?.id), cleanString(activePersona?.name),
  ].filter(Boolean).map(value => value.toLocaleLowerCase().replace(/[\s_-]+/g, '')))
  const independentlyMatchedNpcSubjects = matchedSubjects.filter(subject => {
    const keys = [subject.id || '', subject.name || ''].map(value => cleanString(value).toLocaleLowerCase().replace(/[\s_-]+/g, ''))
    return !keys.some(key => key && activeSubjectKeys.has(key))
  })
  const visualSubjects = job.cast
    ? [...castSubjects, ...independentlyMatchedNpcSubjects].filter((subject, index, all) => {
      const key = cleanString(subject.id || subject.name).toLocaleLowerCase().replace(/[\s_-]+/g, '')
      return Boolean(key) && all.findIndex(candidate => cleanString(candidate.id || candidate.name).toLocaleLowerCase().replace(/[\s_-]+/g, '') === key) === index
    })
    : matchedSubjects
  await ensureCanonicalSubjectsForGeneration(job.chatId, visualSubjects, _userId)
  const namedSubjectContext = formatVisualSubjectPrompts(visualSubjects)
  const subjectNegativePrompt = visualSubjects.map(subject => subject.negativePrompt).filter(Boolean).join(', ')
  const character = characterPrompt
  const persona = personaPrompt
  const effectiveIncludeCharacters = includeCharacter && Boolean(characterPrompt || castRequirements.character)
  const effectiveIncludePersona = includePersona && Boolean(personaPrompt || castRequirements.persona)
  const gated: string[] = []
  if (includeCharacter && !characterPrompt) gated.push('Character identity unresolved after native → Appearance Memory → Character card fallback')
  if (includePersona && !personaPrompt) gated.push('Persona identity unresolved after native → Appearance Memory → Persona card fallback')
  if (config.includeCharacterInfo && !characterApplicable) gated.push(`${classification} request uses environment or object context`)
  if (config.includePersonaInfo && !personaApplicable) gated.push(`${classification} request uses non-persona context`)
  const gatingReason = visualSubjects.length
    ? `matched depicted subject preset${visualSubjects.length === 1 ? '' : 's'} by name: ${visualSubjects.map(subject => subject.name).join(', ')}`
    : gated.join('; ') || 'requested visual identity context is applicable'

  const parentContext = extractParentArtifactContext(job)
  if (parentContext) blocks.push(`Parent artifact context:\n${parentContext}`)
  if (lorebookContext) {
    const subjectNames = visualSubjects.map(subject => subject.name).filter(Boolean)
    const lorebookVisualFacts = normalizedVisualFactsFromContext(lorebookContext, subjectNames)
    if (lorebookVisualFacts) {
      blocks.push(`Lorebook-derived visual facts (normalized, syntax-neutral):\n${lorebookVisualFacts}`)
      identityFallbacks.push(`Lorebook retrieval: accepted normalized visual facts relevant to ${subjectNames.join(', ') || 'the visible scene'}; raw entry text was discarded.`)
    } else {
      identityFallbacks.push('Lorebook retrieval: activated entries were rejected as non-visual or unrelated; raw entry text was discarded.')
    }
  }
  const recent = humanPolicy.allowHumanContext ? selectRelevantRecentContext(messages, targetIndex, job, visualSubjects, Math.min(2, config.includeRecentMessages)) : ''
  if (recent) blocks.push(`Nearest relevant visual continuity only:\n${recent}`)
  const continuity = humanPolicy.allowHumanContext
    ? selectContinuityForJob(state, job, classification, visualSubjects.map(subject => subject.name))
    : { included: [], excluded: [], attachedReferenceAssetIds: [], conflicts: [], strength: state.continuityVault.strength }
  const continuityIncludedOnce = continuity.included.filter(fact => {
    if (!sidecarFallbackSubjectKeys.size) return true
    return !sidecarFallbackSubjectKeys.has(identityKey(fact.canonicalCharacterId)) && !sidecarFallbackSubjectKeys.has(identityKey(fact.canonicalCharacterName))
  })
  if (continuityIncludedOnce.length) {
    blocks.push(`Relay Appearance Memory (${continuity.strength}; canonical identity, wardrobe, and current scene state; authoritative current scene wins):\n${formatSelectedAppearanceFacts(continuityIncludedOnce)}`)
  }
  if (continuity.attachedReferenceAssetIds.length) blocks.push(`Relay reference asset IDs:\n${continuity.attachedReferenceAssetIds.join(', ')}`)
  if (state.continuityVault.deliberateBreaks[slotKey({ ...job, slot: job.slots[0] || 'image' })]) {
    blocks.push(`Deliberate continuity break:\n${state.continuityVault.deliberateBreaks[slotKey({ ...job, slot: job.slots[0] || 'image' })]}`)
  }

  const rawTemplate = contextualizeSexualParserInstructions(firstString(nativeSettings?.customPrompt, config.nativeCustomPrompt))
  const hasCharacterMacro = /\{\{character_prompt\}\}/i.test(rawTemplate)
  const hasPersonaMacro = /\{\{persona_prompt\}\}/i.test(rawTemplate)
  if (effectiveIncludePersona && !hasPersonaMacro) blocks.push(`Persona appearance only:\n${persona}`)
  if (effectiveIncludeCharacters && !hasCharacterMacro) blocks.push(`${visualSubjects.length ? 'Matched depicted subjects' : 'Character appearance only'}:\n${character}`)
  const macroResolution = resolveVisualPromptMacros(rawTemplate, {
    characterValue: effectiveIncludeCharacters ? character : '',
    personaValue: effectiveIncludePersona ? persona : '',
    characterExpected: characterApplicable && config.includeCharacterInfo,
    personaExpected: personaApplicable && config.includePersonaInfo,
  })
  const { resolvedTemplate, unresolvedMacros } = macroResolution
  const compactNativeInstructions = compact(resolvedTemplate, 5000)
  const compactRouterInstructions = compact(contextualizeSexualParserInstructions(config.customParserInstructions), 5000)
  if (compactNativeInstructions) blocks.push(`Native ImageGen parser instructions:\n${compactNativeInstructions}`)
  if (compactRouterInstructions && normalizePromptInstructionText(compactRouterInstructions) !== normalizePromptInstructionText(compactNativeInstructions)) {
    blocks.push(`Relay parser override:\n${compactRouterInstructions}`)
  }
  if (!humanPolicy.allowHumanPrompt) blocks.push(`Visible subject policy:\n${noHumanParserPolicyInstruction(humanPolicy)}`)

  return {
    context: blocks.join('\n\n---\n\n'), rawTemplate, resolvedTemplate,
    contextMetrics: { tier: 'routine', expansionReason: '', historyMessages: recent ? (recent.match(/^(?:user|assistant):/gm) || []).length : 0, characterChars: characterCard.length, personaChars: personaCard.length, appearanceMemoryChars: formatSelectedAppearanceFacts(continuityIncludedOnce).length, ...(lorebookContextMetrics.get(job.chatId) || {}) },
    characterContext: effectiveIncludeCharacters ? character : '', personaContext: effectiveIncludePersona ? persona : '', unresolvedMacros,
    classification, nativeIncludeCharacters, nativeIncludePersona, effectiveIncludeCharacters, effectiveIncludePersona,
    gatingReason: [
      suppressIdentityContext ? `${gatingReason}; profile suppressed character/persona context` : gatingReason,
      !humanPolicy.allowHumanContext ? `${humanPolicy.targetClass} target suppressed character/persona/recent-human context` : '',
    ].filter(Boolean).join('; '),
    sanitizedRecentContext: [parentContext, recent].filter(Boolean).join('\n\n'), visualSubjects, subjectNegativePrompt,
    includedContinuityFacts: continuityIncludedOnce,
    excludedContinuityFacts: continuity.excluded,
    attachedReferenceAssetIds: continuity.attachedReferenceAssetIds,
    continuityConflicts: continuity.conflicts,
    continuityStrength: continuity.strength,
    identityBindings,
    identityFallbacks,
    appearanceRevision: state.continuityVault.updatedAt || 0,
  }
}

function normalizePromptInstructionText(value: string): string {
  return cleanString(value).toLocaleLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

function parserInstruction(job: RouterJob, slot: string, config: RouterConfig, highResMode = config.highResMode): string {
  const classification = classifyImageRequest(job)
  const humanPolicy = targetHumanPolicy(job, classification)
  const framingCues = detectPreservedFramingCues(job)
  const profileDecision = resolvePromptProfileDecision(job, config)
  return [
    `Original scene brief (authoritative):\n${job.originalSceneBrief}`,
    job.caption ? `Context caption / alt text:\n${job.caption}` : '',
    'Create a concrete provider-ready image prompt that preserves the requested subject exactly and uses only characters named in the authoritative brief.',
    'Treat this as the in-universe asset assigned to the specified social app target; the authoritative scene brief defines its content.',
    `Target: ${job.target}`,
    `Image intent: ${normalizeImageIntent(job.intent)}`,
    isSpecialImageIntent(job.intent) ? `Special social-image intent is active (${normalizeImageIntent(job.intent)}). Preserve the requested joke, caption, identity, clothing, location, action, continuity, target, aspect ratio, and underlying scene while adapting incompatible generic polish.` : '',
    `Request classification: ${classification}`,
    `Detected target class: ${humanPolicy.targetClass}`,
    !humanPolicy.allowHumanPrompt ? noHumanParserPolicyInstruction(humanPolicy) : '',
    `Selected Relay prompt profile: ${profileDecision.selectedProfileName}`,
    profileDecision.framingGuidance ? `Profile framing guidance:\n${profileDecision.framingGuidance}` : '',
    profileDecision.promptAdditions ? `Profile positive additions to preserve where compatible:\n${profileDecision.promptAdditions}` : '',
    profileDecision.negativeAdditions ? `Profile negative additions to merge:\n${profileDecision.negativeAdditions}` : '',
    profileDecision.suppressedContext.length ? `Profile context suppression:\n${profileDecision.suppressedContext.map(item => `${item.source}: ${item.reason}`).join('\n')}` : '',
    job.regenerationIntent ? `Regeneration direction:\n${job.regenerationIntent.label}: ${job.regenerationIntent.promptDelta || job.regenerationIntent.customText}` : '',
    job.regenerationIntent?.aspectRatio ? `Regeneration aspect ratio: ${job.regenerationIntent.aspectRatio}` : '',
    job.regenerationIntent?.negativeDelta ? `Regeneration-specific avoid guidance:\n${job.regenerationIntent.negativeDelta}` : '',
    `Request ID: ${job.requestId}`,
    slotDescription(job, slot),
    targetFramingInstruction(job.target, classification),
    highResMode
      ? `High-Res / Polished Capture Mode is enabled. Improve rendering quality, anatomy, identity consistency, texture retention, lighting balance, and coherence while preserving the requested camera position, subject distance, and candid, evidence, surveillance, or phone capture language.${framingCues.length ? ` Preserve these capture cues: ${framingCues.join(', ')}.` : ''}`
      : 'Normal target-aware mode is enabled. Preserve the requested capture fidelity, imperfections, camera language, and original finish.',
    job.originalNegativePrompt ? `Request negative prompt:\n${job.originalNegativePrompt}` : '',
    config.nativePromptMode ? `Mirrored native ImageGen prompt mode: ${config.nativePromptMode}` : '',
    config.nativePromptPresetId ? `Mirrored native ImageGen prompt preset id: ${config.nativePromptPresetId}` : '',
    'Use sanitized chat context to fill missing visual continuity while keeping the authoritative scene brief primary.',
      'If the authoritative scene brief describes a physical appearance change, preserve character identity anchors but let that explicit change override older Appearance Sidecar state.',
    'Preserve matched subject presets exactly for stated age, hair, eyes, and identity-defining traits, including age-specific wording.',
    requestHasVisibleFace(classification)
      ? 'Preserve the authored gaze target, expression, camera angle, and physical action. Translate established emotion into observable eyes, brows, mouth, jaw, hands, and posture. Choose a gaze target within the scene unless direct camera gaze is requested. Do not force a face into a rear, silhouette, detail, or intentionally obscured shot; do not add a default smile or model pose.'
      : 'Use a faceless composition centered on the requested subject, with face-expression fields omitted and the people count kept at zero.',
    'Default negativeAdditions to an empty string. Add a term only for a likely concrete failure directly relevant to this subject.',
    'Limit negative additions to concrete likely failures directly relevant to the depicted subject and merge them once with native/request negatives.',
    'Use realism, resolution, and professional-photography language only when the request explicitly calls for that treatment.',
    'Return strict JSON only, with this shape:',
    '{"prompt":"final positive image prompt","negativeAdditions":"new negative concepts only, or empty string"}',
  ].filter(Boolean).join('\n\n')
}

type ParsedPromptJson = {
  prompt: string
  negativeAdditions: string
  legacyNegativePrompt: boolean
  recoveryMethod?: 'balanced-json' | 'repaired-json' | 'field-salvage' | 'plain-text'
}

function stripParserCodeFences(raw: string): string {
  return raw.trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()
}

function extractBalancedJsonObject(value: string): string {
  const start = value.indexOf('{')
  if (start < 0) return ''
  let depth = 0
  let quote = ''
  let escaped = false
  for (let index = start; index < value.length; index += 1) {
    const char = value[index]
    if (quote) {
      if (escaped) escaped = false
      else if (char === '\\') escaped = true
      else if (char === quote) quote = ''
      continue
    }
    if (char === '"' || char === "'") {
      quote = char
      continue
    }
    if (char === '{') depth += 1
    else if (char === '}') {
      depth -= 1
      if (depth === 0) return value.slice(start, index + 1)
    }
  }
  return ''
}

function decodeLooseJsonString(value: string): string {
  const clean = value.trim()
  if (!clean) return ''
  try { return JSON.parse(`"${clean.replace(/\r?\n/g, '\\n')}"`) as string } catch { /* fall through */ }
  return clean
    .replace(/\\n/g, ' ')
    .replace(/\\r/g, ' ')
    .replace(/\\t/g, ' ')
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\')
    .trim()
}

function extractLooseJsonStringField(value: string, keys: string[]): string {
  for (const key of keys) {
    const escapedKey = escapeRegExp(key)
    const quoted = new RegExp(`["']${escapedKey}["']\\s*:\\s*["']((?:\\\\.|[^"'\\\\])*)(?:["']|$)`, 'is').exec(value)
    if (quoted?.[1]) return decodeLooseJsonString(quoted[1])
    const bare = new RegExp(`["']${escapedKey}["']\\s*:\\s*([^,}\n]+)`, 'i').exec(value)
    if (bare?.[1]) return bare[1].trim().replace(/^["']|["']$/g, '')
  }
  return ''
}

function parsedPromptFields(parsed: Record<string, unknown>): ParsedPromptJson | null {
  const nested = parsed.data && typeof parsed.data === 'object' && !Array.isArray(parsed.data)
    ? parsed.data as Record<string, unknown>
    : parsed.result && typeof parsed.result === 'object' && !Array.isArray(parsed.result)
      ? parsed.result as Record<string, unknown>
      : parsed
  const promptKeys = ['prompt', 'positivePrompt', 'positive_prompt', 'finalPrompt', 'final_prompt', 'text', 'content']
  const prompt = promptKeys.map(key => typeof nested[key] === 'string' ? cleanString(nested[key]) : '').find(Boolean) || ''
  const hasLegacy = typeof nested.negativePrompt === 'string' && typeof nested.negativeAdditions !== 'string'
  const negativeAdditions = typeof nested.negativeAdditions === 'string'
    ? cleanString(nested.negativeAdditions)
    : typeof nested.negative_prompt === 'string'
      ? cleanString(nested.negative_prompt)
      : typeof nested.negativePrompt === 'string' ? cleanString(nested.negativePrompt) : ''
  return prompt ? { prompt, negativeAdditions, legacyNegativePrompt: hasLegacy } : null
}

export function parsePromptJson(raw: string): ParsedPromptJson {
  const clean = stripParserCodeFences(raw)
  if (!clean) throw new Error('Parser returned an empty response.')

  const balanced = extractBalancedJsonObject(clean)
  if (balanced) {
    try {
      const parsed = parsedPromptFields(JSON.parse(balanced) as Record<string, unknown>)
      if (parsed) return { ...parsed, recoveryMethod: balanced === clean ? undefined : 'balanced-json' }
    } catch { /* continue into recovery */ }
  }

  const firstBrace = clean.indexOf('{')
  if (firstBrace >= 0) {
    let repaired = clean.slice(firstBrace).trim()
    repaired = repaired.replace(/,\s*$/, '')
    const quoteCount = (repaired.match(/(?<!\\)"/g) || []).length
    if (quoteCount % 2 === 1) repaired += '"'
    const openBraces = (repaired.match(/{/g) || []).length
    const closeBraces = (repaired.match(/}/g) || []).length
    if (openBraces > closeBraces) repaired += '}'.repeat(openBraces - closeBraces)
    try {
      const parsed = parsedPromptFields(JSON.parse(repaired) as Record<string, unknown>)
      if (parsed) return { ...parsed, recoveryMethod: 'repaired-json' }
    } catch { /* continue into field salvage */ }
  }

  const prompt = extractLooseJsonStringField(clean, ['prompt', 'positivePrompt', 'positive_prompt', 'finalPrompt', 'final_prompt'])
  const negativeAdditions = extractLooseJsonStringField(clean, ['negativeAdditions', 'negative_prompt', 'negativePrompt'])
  if (prompt) {
    return {
      prompt,
      negativeAdditions,
      legacyNegativePrompt: !/negativeAdditions/i.test(clean) && /negativePrompt/i.test(clean),
      recoveryMethod: 'field-salvage',
    }
  }

  const plain = clean
    .replace(/^Here(?:'s| is) (?:the )?(?:strict )?JSON:?/i, '')
    .replace(/^Final (?:positive )?prompt:?/i, '')
    .trim()
  if (!/[{}]/.test(plain) && plain.length >= 24 && !/^(?:error|unable|cannot|sorry)\b/i.test(plain)) {
    return { prompt: plain, negativeAdditions: '', legacyNegativePrompt: false, recoveryMethod: 'plain-text' }
  }

  throw new Error('Parser response did not contain a usable image prompt.')
}


function buildParserFallbackPrompt(
  job: RouterJob,
  slot: string,
  config: RouterConfig,
  context: ParserContextResult,
  nativeSettings: NativeImageSettings | undefined,
  connection: ParserConnection,
  parserOutput: string,
  parserError: string,
): PreparedPrompt {
  const classification = context.classification
  const humanPolicy = targetHumanPolicy(job, classification)
  const profileBase = resolvePromptProfileDecision(job, config)
  const visibleBase = [
    job.originalSceneBrief,
    job.caption ? `Context: ${job.caption}` : '',
    targetFramingInstruction(job.target, classification),
    slotDescription(job, slot),
  ].filter(Boolean).join(', ')
  let identityPrompt = humanPolicy.allowHumanPrompt
    ? enforceVisualSubjectIdentity(visibleBase, context.visualSubjects, job.target === 'prose.illustration')
    : visibleBase
  if (humanPolicy.allowHumanPrompt && !context.visualSubjects.length && context.characterContext) {
    identityPrompt = `${context.characterContext}, ${identityPrompt}`
  }
  if (humanPolicy.allowHumanPrompt && !context.visualSubjects.length && context.personaContext) {
    identityPrompt = `${context.personaContext}, ${identityPrompt}`
  }
  if (humanPolicy.allowHumanPrompt && context.includedContinuityFacts.length) {
    identityPrompt += `, Appearance Memory continuity: ${formatSelectedAppearanceFacts(context.includedContinuityFacts)}`
  }
  const profiled = applyPromptProfileToPositivePrompt(identityPrompt, profileBase)
  const identityCorrection = enforceC5AKnownIdentity(profiled.prompt, context.identityBindings)
  const finalizedPositivePrompt = finalizeParsedPositivePrompt(identityCorrection.prompt, classification, job)
  const authoritativeScene = authoritativeSceneText(job)
  const specialIntent = applySpecialImageIntent(finalizedPositivePrompt, job.intent, authoritativeScene)
  const contextualSexual = applyContextualSexualGuidance(specialIntent.prompt, '', authoritativeScene)
  const positivePrompt = contextualSexual.prompt
  const snapshotNativeNegative = firstString(nativeSettings?.customNegativePrompt, nativeSettings?.negativePrompt, config.nativeNegativePrompt)
  const nativeNegative = humanPolicy.allowHumanPrompt
    ? resolveSubjectNegativeMacros(snapshotNativeNegative, context.subjectNegativePrompt)
    : snapshotNativeNegative
  const normalized = normalizeNegativePrompts({
    native: nativeNegative,
    request: job.originalNegativePrompt,
    subject: humanPolicy.allowHumanPrompt ? context.subjectNegativePrompt : '',
    parser: contextualSexual.negativePrompt,
    router: [profiled.decision.negativeAdditions, !humanPolicy.allowHumanPrompt ? humanPolicy.noHumanGuardrails : '', config.additionalNegativePrompt].filter(Boolean).join(', '),
  })
  const humanConflict = humanPolicy.allowHumanPrompt
    ? removeConflictingHumanNegatives(normalized.negative)
    : { negative: normalized.negative, removed: [] as string[] }
  normalized.negative = humanConflict.negative
  normalized.pipeline.finalNormalizedNegativePrompt = humanConflict.negative
  const pipeline: PromptPipeline = {
    ...normalized.pipeline,
    contextCaption: job.caption,
    rawNativeParserTemplate: context.rawTemplate,
    resolvedNativeParserInstructions: context.resolvedTemplate,
    characterContext: context.characterContext,
    personaContext: context.personaContext,
    routerParserInstructions: contextualizeSexualParserInstructions(config.customParserInstructions),
    parserRequest: [],
    rawParserResponse: parserOutput,
    parsedPositivePrompt: positivePrompt,
    parserRequested: true,
    parserSucceeded: false,
    parserFailed: true,
    parserFallbackUsed: true,
    parserFallbackReason: parserError,
    unresolvedMacros: context.unresolvedMacros,
    requestClassification: classification,
    detectedTargetClass: humanPolicy.targetClass,
    imageIntent: job.intent,
    specialIntentApplied: specialIntent.applied,
    specialIntentSuppressedFragments: specialIntent.suppressed,
    nativeIncludeCharacters: context.nativeIncludeCharacters,
    nativeIncludePersona: context.nativeIncludePersona,
    effectiveIncludeCharacters: context.effectiveIncludeCharacters,
    effectiveIncludePersona: context.effectiveIncludePersona,
    characterContextSuppressed: !context.effectiveIncludeCharacters,
    personaContextSuppressed: !context.effectiveIncludePersona,
    noHumanGuardrailsApplied: !humanPolicy.allowHumanPrompt,
    contextGatingReason: `${context.gatingReason}; malformed parser output fell back to the authoritative scene brief`,
    faceExpressionApplicable: humanPolicy.allowHumanPrompt && requestHasVisibleFace(classification),
    visualCharacterPrompt: humanPolicy.allowHumanPrompt ? context.characterContext : '',
    visualPersonaPrompt: humanPolicy.allowHumanPrompt ? context.personaContext : '',
    visualSubjectPrompts: humanPolicy.allowHumanPrompt ? context.visualSubjects : [],
    subjectNegativePrompt: humanPolicy.allowHumanPrompt ? context.subjectNegativePrompt : '',
    sanitizedRecentContext: context.sanitizedRecentContext,
    rejectedParserNegativeAdditions: [],
    promptProfile: profiled.decision,
    regenerationIntent: job.regenerationIntent,
    includedContinuityFacts: context.includedContinuityFacts,
    excludedContinuityFacts: context.excludedContinuityFacts,
    attachedReferenceAssetIds: context.attachedReferenceAssetIds,
    continuityConflicts: context.continuityConflicts,
    continuityStrength: context.continuityStrength,
    identityResolution: c5aIdentityResolution(job, context, identityCorrection.corrections),
    warnings: [
      ...normalized.pipeline.warnings,
      ...c5aIdentityWarnings(context, identityCorrection.corrections),
      {
        code: 'parser-fallback-used',
        message: `The sidecar parser returned unusable JSON (${parserError}). Relay continued with the authoritative scene brief instead of failing the image.`,
        sources: ['parser resilience fallback'],
      },
      ...context.unresolvedMacros.map(macro => ({ code: 'unresolved-parser-macro', message: `${macro} could not be resolved from active context.`, sources: ['native parser template'] })),
      ...(humanConflict.removed.length ? [{ code: 'human-negative-conflict-repaired', message: `Removed generic human-suppression negatives from an explicit people scene: ${humanConflict.removed.join(', ')}`, sources: ['defensive prompt conflict check'] }] : []),
      ...promptWarnings(positivePrompt, normalized.negative, normalized.pipeline),
    ],
  }
  return {
    prompt: positivePrompt,
    negativePrompt: normalized.negative,
    promptMode: `router_parser_fallback${config.nativePromptMode ? `:${config.nativePromptMode}` : ''}`,
    promptPresetId: config.nativePromptPresetId,
    parserUsed: true,
    parserOutput,
    parserConnectionId: connection.id,
    parserModel: config.parserModel || connection.model,
    parserParameters: config.parserParameters,
    promptPipeline: pipeline,
  }
}

async function syncNativeSettings(imageGeneration: NativeImageSettings, userId?: string): Promise<RouterConfig> {
  const current = await getConfig(userId)
  const patch: Partial<RouterConfig> = {
    nativeImageSettingsSnapshot: cloneRecord(imageGeneration),
    nativeSettingsCapturedAt: Date.now(),
    nativePromptMode: cleanString(imageGeneration.promptMode),
    nativePromptPresetId: cleanNullableString(imageGeneration.activePromptPresetId),
    nativeCustomPrompt: cleanString(imageGeneration.customPrompt),
    nativeNegativePrompt: cleanString(imageGeneration.customNegativePrompt) || cleanString(imageGeneration.negativePrompt),
    nativeIncludeCharacters: imageGeneration.includeCharacters === true,
    nativeIncludePersona: imageGeneration.includePersona === true,
    nativeCharacterPrompt: resolveExposedVisualPreset(imageGeneration, 'character'),
    nativePersonaPrompt: resolveExposedVisualPreset(imageGeneration, 'persona'),
    nativePromptPresets: clonePromptPresets(imageGeneration.promptPresets),
  }

  if (current.followNativeParser) {
    patch.parserConnectionId = cleanNullableString(imageGeneration.promptParserConnectionId)
    patch.parserModel = cleanString(imageGeneration.promptParserModel)
    patch.parserParameters = cleanParameters(imageGeneration.promptParserParameters)
  }

  if (current.generationSettingsSource === 'native') {
    patch.imageConnectionId = cleanNullableString(imageGeneration.activeImageGenConnectionId)
    patch.imageModel = cleanString(imageGeneration.model)
    patch.imageParameters = cleanParameters(imageGeneration.parameters)
  }

  return setConfig(patch, userId)
}

export async function getConfig(userId?: string): Promise<RouterConfig> {
  const cacheKey = userConfigCacheKey(userId)
  const cached = configCache.get(cacheKey)
  if (cached && Date.now() - cached.cachedAt < CONFIG_CACHE_TTL_MS) return cached.value
  const raw = await spindle.userStorage.getJson<Partial<RouterConfig>>(CONFIG_PATH, { fallback: DEFAULT_CONFIG, userId })
  const value = normalizeConfig(raw || {})
  configCache.set(cacheKey, { value, cachedAt: Date.now() })
  return value
}

async function setConfig(patch: Partial<RouterConfig>, userId?: string): Promise<RouterConfig> {
  const key = userConfigCacheKey(userId)
  const previous = configMutationQueues.get(key) || Promise.resolve()
  let release = () => {}
  const pending = new Promise<void>(resolve => { release = resolve })
  const queued = previous.then(() => pending)
  configMutationQueues.set(key, queued)
  await previous
  try {
    const current = await getConfig(userId)
    const next = normalizeConfig({ ...current, ...patch })
    await spindle.userStorage.setJson(CONFIG_PATH, next, { indent: 2, userId })
    configCache.set(key, { value: next, cachedAt: Date.now() })
    invalidateRenderCaches(undefined, userId)
    return next
  } finally {
    release()
    if (configMutationQueues.get(key) === queued) configMutationQueues.delete(key)
  }
}

function sanitizeOrbCustomIconDataUrl(value: unknown): string {
  const text = cleanString(value)
  if (!text || text.length > 3_000_000) return ''
  return /^data:image\/(?:png|jpe?g|webp|gif|svg\+xml);base64,[a-z0-9+/=\s]+$/i.test(text) ? text : ''
}

function normalizeConfig(raw: Partial<RouterConfig>): RouterConfig {
  const legacy = raw as Partial<RouterConfig> & Record<string, unknown>
  const {
    slotNsfwMode: _retiredAdultMode,
    slotNsfwPositivePrompt: _retiredSlotAdultPositivePrompt,
    slotNsfwNegativePrompt: _retiredSlotAdultNegativePrompt,
    illustratorNsfwPositivePrompt: _retiredIllustratorAdultPositivePrompt,
    illustratorNsfwNegativePrompt: _retiredIllustratorAdultNegativePrompt,
    surfaceProtocolInjectionEnabled: legacySurfaceProtocolInjectionEnabled,
    ...activeRaw
  } = legacy
  const automaticSurfaceInjectionEnabled = resolveAutomaticSurfaceInjectionEnabled(raw.surfaceUtilityInjectionEnabled, legacySurfaceProtocolInjectionEnabled)
  const relayLoraStacks = normalizeRelayLoraStacks(raw.relayLoraStacks)
  const requestedRelayStackId = cleanNullableString(raw.activeRelayLoraStackId)
  const activeRelayLoraStackId = requestedRelayStackId && relayLoraStacks.some(stack => stack.id === requestedRelayStackId)
    ? requestedRelayStackId
    : relayLoraStacks[0]?.id || null
  const vaultStrength = ['off', 'low', 'medium', 'strong'].includes(String(raw.vaultStrength)) ? raw.vaultStrength as ContinuityStrength : DEFAULT_CONFIG.vaultStrength
  const proseIllustratorSettings = normalizeProseIllustratorSettings(raw.proseIllustratorSettings || DEFAULT_CONFIG.proseIllustratorSettings)
  if (proseIllustratorSettings.appearanceMemoryOverride === 'global') proseIllustratorSettings.continuityStrength = vaultStrength
  return {
    ...DEFAULT_CONFIG,
    ...activeRaw,
    enabled: raw.enabled !== false,
    autoGenerate: raw.autoGenerate !== false,
    slotGenerationMode: ['auto-insert', 'prompt-preview', 'image-preview'].includes(String(raw.slotGenerationMode)) ? raw.slotGenerationMode as SlotGenerationMode : DEFAULT_CONFIG.slotGenerationMode,
    debugLogging: raw.debugLogging === true,
    highResMode: raw.highResMode === true,
    enableRelayOrb: raw.enableRelayOrb === true,
    tutorialModeEnabled: raw.tutorialModeEnabled !== false,
    tutorialStep: clampInt(raw.tutorialStep, 0, 12, 0),
    autoRescanOnChatOpen: raw.autoRescanOnChatOpen !== false,
    includeInactiveSwipesInRescan: raw.includeInactiveSwipesInRescan === true,
    followNativeParser: raw.followNativeParser !== false,
    followNativeImageGen: raw.followNativeImageGen !== false,
    generationSettingsSource: raw.generationSettingsSource === 'relay' ? 'relay' : raw.followNativeImageGen === false ? 'relay' : 'native',
    loraSource: ['native', 'relay', 'none'].includes(String(raw.loraSource)) ? raw.loraSource as RouterConfig['loraSource'] : raw.followNativeImageGen === false ? 'relay' : 'native',
    vaultStrength,
    parserConnectionId: cleanNullableString(raw.parserConnectionId),
    parserModel: cleanString(raw.parserModel),
    parserParameters: cleanParameters(raw.parserParameters),
    appearanceSidecarConnectionId: cleanNullableString(raw.appearanceSidecarConnectionId),
    appearanceSidecarModel: cleanString(raw.appearanceSidecarModel),
    appearanceSidecarParameters: cleanParameters(raw.appearanceSidecarParameters),
    parserRetries: clampInt(raw.parserRetries, 0, 5, DEFAULT_CONFIG.parserRetries),
    includeRecentMessages: clampInt(raw.includeRecentMessages, 0, 32, DEFAULT_CONFIG.includeRecentMessages),
    includeCharacterInfo: raw.includeCharacterInfo !== false,
    includePersonaInfo: raw.includePersonaInfo !== false,
    includeLorebook: raw.includeLorebook !== false,
    customParserInstructions: cleanString(raw.customParserInstructions),
    imageConnectionId: cleanNullableString(raw.imageConnectionId),
    imageModel: cleanString(raw.imageModel),
    imageParameters: cleanParameters(raw.imageParameters),
    imageLoraStack: normalizeLoraEntries(raw.imageLoraStack),
    relayLoraStacks,
    activeRelayLoraStackId,
    nativePromptMode: cleanString(raw.nativePromptMode),
    nativePromptPresetId: cleanNullableString(raw.nativePromptPresetId),
    nativeCustomPrompt: cleanString(raw.nativeCustomPrompt),
    nativeNegativePrompt: cleanString(raw.nativeNegativePrompt),
    additionalNegativePrompt: cleanString(raw.additionalNegativePrompt),
    nativeIncludeCharacters: raw.nativeIncludeCharacters === true,
    nativeIncludePersona: raw.nativeIncludePersona === true,
    nativeCharacterPrompt: cleanString(raw.nativeCharacterPrompt),
    nativePersonaPrompt: cleanString(raw.nativePersonaPrompt),
    nativePromptPresets: clonePromptPresets(raw.nativePromptPresets),
    nativeImageSettingsSnapshot: cloneRecord(raw.nativeImageSettingsSnapshot),
    nativeSettingsCapturedAt: Number.isFinite(Number(raw.nativeSettingsCapturedAt)) ? Number(raw.nativeSettingsCapturedAt) : 0,
    interfaceTheme: raw.interfaceTheme === 'clean-panel' ? 'clean-panel' : 'velvet-prism',
    orbPositionDesktop: normalizeOrbPosition(raw.orbPositionDesktop, DEFAULT_CONFIG.orbPositionDesktop),
    orbPositionMobile: normalizeOrbPosition(raw.orbPositionMobile, DEFAULT_CONFIG.orbPositionMobile),
    orbSize: ['small', 'medium', 'large'].includes(String(raw.orbSize)) ? raw.orbSize as RouterConfig['orbSize'] : DEFAULT_CONFIG.orbSize,
    orbDesign: ORB_DESIGNS.includes(String(raw.orbDesign) as OrbDesign) ? raw.orbDesign as RouterConfig['orbDesign'] : DEFAULT_CONFIG.orbDesign,
    orbCustomIconDataUrl: sanitizeOrbCustomIconDataUrl(raw.orbCustomIconDataUrl),
    lastActiveDrawerTab: cleanString(raw.lastActiveDrawerTab) || DEFAULT_CONFIG.lastActiveDrawerTab,
    defaultPromptProfileId: cleanString(raw.defaultPromptProfileId) || 'auto',
    promptProfiles: normalizePromptProfiles(raw.promptProfiles),
    chatGenerationProfiles: normalizeChatGenerationProfiles(raw.chatGenerationProfiles),
    defaultGenerationProfile: normalizeGenerationProfile(raw.defaultGenerationProfile, undefined),
    defaultCandidateCount: normalizeCandidateCount(raw.defaultCandidateCount, DEFAULT_CONFIG.defaultCandidateCount),
    queueConcurrencyLimit: clampInt(raw.queueConcurrencyLimit, 1, 4, DEFAULT_CONFIG.queueConcurrencyLimit),
    objectEnvironmentPersonSuppression: raw.objectEnvironmentPersonSuppression !== false,
    experienceMode: 'expert',
    nativeAutoGenerationGuard: raw.nativeAutoGenerationGuard !== false,
    nativeAutoGenerationPreviousValue: typeof raw.nativeAutoGenerationPreviousValue === 'boolean' ? raw.nativeAutoGenerationPreviousValue : null,
    // Earlier Relay releases stored only the previous value; it was written
    // solely by the guard, so migrate that evidence into explicit ownership.
    nativeAutoGenerationGuardOwned: raw.nativeAutoGenerationGuardOwned === true || raw.nativeAutoGenerationPreviousValue === true,
    galleryAutoLink: raw.galleryAutoLink !== false,
    generationRecipes: normalizeGenerationRecipes(raw.generationRecipes),
    activeGenerationRecipeId: cleanNullableString(raw.activeGenerationRecipeId),
    surfaceRendererMode: ['relay', 'legacy-regex', 'hybrid'].includes(String(raw.surfaceRendererMode))
      ? raw.surfaceRendererMode as RouterConfig['surfaceRendererMode']
      : 'relay',
    surfaceDefaultShellMode: ['inline', 'plain', 'sparkling'].includes(String(raw.surfaceDefaultShellMode))
      ? raw.surfaceDefaultShellMode as SurfaceShellMode
      : raw.surfaceDefaultShellMode === 'collapsible' ? 'plain' : DEFAULT_CONFIG.surfaceDefaultShellMode,
    surfaceColorMode: raw.surfaceColorMode === 'primary' ? 'primary' : 'realistic',
    surfaceUtilityInjectionEnabled: automaticSurfaceInjectionEnabled,
    surfacePreferencesInitialized: raw.surfacePreferencesInitialized === true,
    narrativeDlcEnabled: raw.narrativeDlcEnabled === true,
    narrativeDlcVariant: NARRATIVE_REGEX_VARIANTS.includes(raw.narrativeDlcVariant as NarrativeRegexVariant)
      ? raw.narrativeDlcVariant as NarrativeRegexVariant
      : DEFAULT_CONFIG.narrativeDlcVariant,
    narrativeDlcUtilityNames: Array.isArray(raw.narrativeDlcUtilityNames)
      ? narrativeUtilityNames().filter(name => raw.narrativeDlcUtilityNames?.includes(name))
      : narrativeUtilityNames(),
    characterPhoneDefaultApps: normalizeCharacterPhoneDefaultApps(raw.characterPhoneDefaultApps, {
      migrateMissing: !Object.prototype.hasOwnProperty.call(raw, 'characterPhoneDefaultApps'),
    }),
    narrativeDlcLastSync: raw.narrativeDlcLastSync && typeof raw.narrativeDlcLastSync === 'object'
      ? raw.narrativeDlcLastSync as NarrativeDlcHealth
      : null,
    globalSurfaceStudio: normalizeCustomSurfaceStudio(raw.globalSurfaceStudio || DEFAULT_CONFIG.globalSurfaceStudio),
    proseIllustratorSettings,
  }
}

function normalizeOrbPosition(value: unknown, fallback: { x: number; y: number }): { x: number; y: number } {
  const record = cleanParameters(value)
  const x = Number(record.x)
  const y = Number(record.y)
  return {
    x: Number.isFinite(x) ? Math.max(0, Math.min(1, x)) : fallback.x,
    y: Number.isFinite(y) ? Math.max(0, Math.min(1, y)) : fallback.y,
  }
}

function normalizeCandidateCount(value: unknown, fallback: 1 | 2 | 4): 1 | 2 | 4 {
  const parsed = Number(value)
  return parsed === 2 || parsed === 4 ? parsed : fallback
}

function normalizePromptProfiles(value: unknown): PromptPresetProfile[] {
  const userProfiles = Array.isArray(value)
    ? value.filter(profile => profile && typeof profile === 'object' && !Array.isArray(profile)).map(profile => normalizePromptProfile(profile as Partial<PromptPresetProfile>))
    : []
  const byId = new Map<string, PromptPresetProfile>()
  for (const profile of BUILT_IN_PROMPT_PROFILES) byId.set(profile.id, cloneValue(profile))
  for (const profile of userProfiles) {
    if (!profile.id) continue
    if (BUILT_IN_PROMPT_PROFILES.some(builtIn => builtIn.id === profile.id)) byId.set(profile.id, { ...cloneValue(BUILT_IN_PROMPT_PROFILES.find(builtIn => builtIn.id === profile.id)!), ...profile, builtIn: true })
    else byId.set(profile.id, profile)
  }
  return [...byId.values()]
}

function normalizePromptProfile(raw: Partial<PromptPresetProfile>): PromptPresetProfile {
  const compatibleTargets = Array.isArray(raw.compatibleTargets)
    ? raw.compatibleTargets.filter(target => typeof target === 'string') as PromptPresetProfile['compatibleTargets']
    : ['twitter.media', 'instagram.single', 'instagram.carousel', 'smartphone.message-image', 'kakao.image', 'prose.illustration'] as PromptPresetProfile['compatibleTargets']
  return {
    id: cleanString(raw.id) || `profile-${Date.now().toString(36)}`,
    name: cleanString(raw.name) || 'Untitled Profile',
    builtIn: raw.builtIn === true,
    promptAdditions: cleanString(raw.promptAdditions),
    negativeAdditions: cleanString(raw.negativeAdditions),
    contextPolicy: ['auto', 'character', 'persona', 'suppress-character', 'minimal'].includes(String(raw.contextPolicy)) ? raw.contextPolicy! : 'auto',
    framingGuidance: cleanString(raw.framingGuidance),
    characterContextPolicy: ['auto', 'preserve', 'suppress-unless-explicit'].includes(String(raw.characterContextPolicy)) ? raw.characterContextPolicy! : 'auto',
    continuityStrength: ['low', 'medium', 'high'].includes(String(raw.continuityStrength)) ? raw.continuityStrength! : 'medium',
    defaultAspectBehavior: ['native', 'request', 'square', 'portrait', 'landscape'].includes(String(raw.defaultAspectBehavior)) ? raw.defaultAspectBehavior! : 'request',
    promptCleanupRules: Array.isArray(raw.promptCleanupRules) ? raw.promptCleanupRules.map(rule => String(rule)).filter(Boolean) : [],
    compatibleTargets,
    optionalNativePresetReference: cleanNullableString(raw.optionalNativePresetReference),
  }
}

function normalizeGenerationProfile(raw: unknown, chatId: string | undefined): GenerationProfile {
  const value = cleanParameters(raw)
  return {
    chatId,
    defaultPromptProfileId: cleanString(value.defaultPromptProfileId) || DEFAULT_GENERATION_PROFILE.defaultPromptProfileId,
    preferredNativePresetId: cleanNullableString(value.preferredNativePresetId),
    preferredImageConnectionId: cleanNullableString(value.preferredImageConnectionId),
    preferredImageModel: cleanString(value.preferredImageModel),
    defaultCandidateCount: normalizeCandidateCount(value.defaultCandidateCount, DEFAULT_GENERATION_PROFILE.defaultCandidateCount),
    automationEnabled: value.automationEnabled !== false,
    continuityStrength: ['low', 'medium', 'high'].includes(String(value.continuityStrength)) ? value.continuityStrength as GenerationProfile['continuityStrength'] : 'medium',
    preferredSocialImageBehavior: ['native', 'polished', 'candid', 'evidence'].includes(String(value.preferredSocialImageBehavior)) ? value.preferredSocialImageBehavior as GenerationProfile['preferredSocialImageBehavior'] : 'native',
    suppressPeopleForObjects: value.suppressPeopleForObjects !== false,
    defaultNegativeAdditions: cleanString(value.defaultNegativeAdditions),
    defaultAspectPreference: ['native', 'request', 'square', 'portrait', 'landscape'].includes(String(value.defaultAspectPreference)) ? value.defaultAspectPreference as GenerationProfile['defaultAspectPreference'] : 'request',
  }
}

function normalizeChatGenerationProfiles(value: unknown): Record<string, GenerationProfile> {
  const raw = cleanParameters(value)
  return Object.fromEntries(Object.entries(raw).map(([chatId, profile]) => [chatId, normalizeGenerationProfile(profile, chatId)]))
}

function clonePromptPresets(value: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(value)) return []
  return value.filter(preset => preset && typeof preset === 'object' && !Array.isArray(preset)).map(preset => cloneRecord(preset))
}

function resolveExposedVisualPreset(settings: NativeImageSettings, kind: 'character' | 'persona'): string {
  const direct = kind === 'character'
    ? firstString(settings.resolvedCharacterPrompt, settings.characterPrompt, settings.boundCharacterPrompt)
    : firstString(settings.resolvedPersonaPrompt, settings.personaPrompt, settings.boundPersonaPrompt)
  if (direct) return sanitizeVisualPreset(direct)
  // A list with one preset is not a binding. The active host binding is the
  // authority; selecting a singleton here was the source of C5A drift.
  return ''
}


function emptyBackgroundQueue(): BackgroundQueueState {
  return { items: {}, abortRequestedAt: 0, updatedAt: Date.now() }
}

function normalizeBackgroundQueue(value: unknown): BackgroundQueueState {
  const raw = cleanParameters(value)
  const itemsRaw = cleanParameters(raw.items)
  const items: Record<string, BackgroundQueueItem> = {}
  for (const [id, value] of Object.entries(itemsRaw)) {
    const row = cleanParameters(value)
    const stage = cleanString(row.stage) as BackgroundQueueStage
    if (!id || !stage) continue
    items[id] = {
      id,
      chatId: cleanString(row.chatId),
      source: (['relay-slot','relay-candidate','relay-illustrator','analysis','gallery-link','unknown'].includes(cleanString(row.source)) ? cleanString(row.source) : 'unknown') as BackgroundQueueItem['source'],
      label: cleanString(row.label) || 'Relay task',
      stage: (['queued','analyzing','composing-prompt','waiting-for-provider','generating','saving-preview','saving-gallery','placing','completed','failed','cancelled'].includes(stage) ? stage : 'queued') as BackgroundQueueStage,
      statusText: cleanString(row.statusText) || 'Queued',
      current: Math.max(0, Number(row.current) || 0),
      total: Math.max(1, Number(row.total) || 1),
      etaSeconds: Number.isFinite(Number(row.etaSeconds)) ? Math.max(0, Number(row.etaSeconds)) : null,
      createdAt: Number(row.createdAt) || Date.now(),
      startedAt: Number(row.startedAt) || undefined,
      updatedAt: Number(row.updatedAt) || Date.now(),
      completedAt: Number(row.completedAt) || undefined,
      error: cleanString(row.error) || undefined,
      slotKey: cleanString(row.slotKey) || undefined,
      requestId: cleanString(row.requestId) || undefined,
      planId: cleanString(row.planId) || undefined,
    }
  }
  return { items, abortRequestedAt: Number(raw.abortRequestedAt) || 0, updatedAt: Number(raw.updatedAt) || Date.now() }
}

function normalizeGalleryLinks(value: unknown): Record<string, GalleryLinkRequest> {
  const raw = cleanParameters(value)
  const out: Record<string, GalleryLinkRequest> = {}
  for (const [id, value] of Object.entries(raw)) {
    const row = cleanParameters(value)
    const imageId = cleanString(row.imageId)
    const chatId = cleanString(row.chatId)
    const characterId = cleanString(row.characterId)
    if (!id || !imageId || !chatId || !characterId) continue
    const source = cleanString(row.source)
    const status = cleanString(row.status)
    out[id] = {
      id,
      chatId,
      characterId,
      imageId,
      imageUrl: cleanString(row.imageUrl),
      caption: cleanString(row.caption),
      source: (['relay-slot','relay-illustrator'].includes(source) ? source : 'relay-slot') as GalleryLinkRequest['source'],
      slotKey: cleanString(row.slotKey) || undefined,
      status: (['pending','linked','failed','skipped'].includes(status) ? status : 'pending') as GalleryLinkStatus,
      attempts: Math.max(0, Number(row.attempts) || 0),
      createdAt: Number(row.createdAt) || Date.now(),
      updatedAt: Number(row.updatedAt) || Date.now(),
      galleryItemId: cleanString(row.galleryItemId) || undefined,
      error: cleanString(row.error) || undefined,
    }
  }
  return out
}

function normalizeGenerationRecipes(value: unknown): GenerationRecipe[] {
  if (!Array.isArray(value)) return []
  const out: GenerationRecipe[] = []
  const seen = new Set<string>()
  for (const entry of value) {
    const row = cleanParameters(entry)
    const name = cleanString(row.name)
    if (!name) continue
    const id = cleanString(row.id) || `recipe-${contentFingerprint(`${name}:${out.length}`).slice(0, 16)}`
    if (seen.has(id)) continue
    seen.add(id)
    const scope = cleanString(row.scope)
    const createdAt = Number(row.createdAt) || Date.now()
    out.push({
      id,
      name,
      description: cleanString(row.description),
      scope: scope === 'both' ? 'both' : 'relay',
      connectionId: cleanNullableString(row.connectionId),
      model: cleanString(row.model),
      loraStack: normalizeGenerationLoraStack(row.loraStack),
      positivePrompt: cleanString(row.positivePrompt),
      negativePrompt: cleanString(row.negativePrompt),
      promptSnippetIds: stringList(row.promptSnippetIds),
      aspectRatio: cleanString(row.aspectRatio) || 'native',
      width: Number.isFinite(Number(row.width)) ? Math.max(64, Math.round(Number(row.width))) : undefined,
      height: Number.isFinite(Number(row.height)) ? Math.max(64, Math.round(Number(row.height))) : undefined,
      promptProfileId: cleanString(row.promptProfileId) || 'auto',
      parameterOverrides: cleanParameters(row.parameterOverrides),
      createdAt,
      updatedAt: Number(row.updatedAt) || createdAt,
    })
  }
  return out.slice(0, 120)
}

function startBackgroundTask(state: StateFile, input: Partial<BackgroundQueueItem> & Pick<BackgroundQueueItem, 'id' | 'chatId' | 'source' | 'label'>): BackgroundQueueItem {
  const now = Date.now()
  const item: BackgroundQueueItem = {
    id: input.id,
    chatId: input.chatId,
    source: input.source,
    label: input.label,
    stage: input.stage || 'queued',
    statusText: input.statusText || 'Queued',
    current: input.current || 0,
    total: Math.max(1, input.total || 1),
    etaSeconds: input.etaSeconds ?? null,
    createdAt: input.createdAt || now,
    startedAt: input.startedAt || now,
    updatedAt: now,
    slotKey: input.slotKey,
    requestId: input.requestId,
    planId: input.planId,
  }
  state.backgroundQueue.items[item.id] = item
  state.backgroundQueue.updatedAt = now
  return item
}

function updateBackgroundTask(state: StateFile, id: string, patch: Partial<BackgroundQueueItem>): void {
  const item = state.backgroundQueue.items[id]
  if (!item) return
  const now = Date.now()
  Object.assign(item, patch, { updatedAt: now })
  const elapsed = item.startedAt ? Math.max(0, (now - item.startedAt) / 1000) : 0
  if (item.current > 0 && item.total > item.current) item.etaSeconds = Math.round((elapsed / item.current) * (item.total - item.current))
  if (['completed','failed','cancelled'].includes(item.stage)) item.completedAt = item.completedAt || now
  state.backgroundQueue.updatedAt = now
}

function finishBackgroundTask(state: StateFile, id: string, statusText = 'Complete'): void {
  updateBackgroundTask(state, id, { stage: 'completed', statusText, current: state.backgroundQueue.items[id]?.total || 1, etaSeconds: 0 })
}

function failBackgroundTask(state: StateFile, id: string, error: string): void {
  updateBackgroundTask(state, id, { stage: 'failed', statusText: 'Failed', error, etaSeconds: null })
}

function queueGalleryLink(state: StateFile, input: Omit<GalleryLinkRequest, 'id' | 'status' | 'attempts' | 'createdAt' | 'updatedAt'>): GalleryLinkRequest {
  const id = `gallery-${contentFingerprint(`${input.characterId}:${input.imageId}:${input.source}`).slice(0, 20)}`
  const existing = state.galleryLinks[id]
  if (existing?.status === 'linked') return existing
  const now = Date.now()
  const link: GalleryLinkRequest = existing || {
    ...input,
    id,
    status: 'pending',
    attempts: 0,
    createdAt: now,
    updatedAt: now,
  }
  Object.assign(link, input, { status: existing?.status === 'failed' ? 'pending' : link.status, error: undefined, updatedAt: now })
  state.galleryLinks[id] = link
  startBackgroundTask(state, {
    id: `queue:${id}`,
    chatId: input.chatId,
    source: 'gallery-link',
    label: `Save ${input.source === 'relay-illustrator' ? 'illustration' : 'Relay image'} to Character Gallery`,
    stage: 'saving-gallery',
    statusText: 'Waiting for Character Gallery',
    total: 1,
    requestId: id,
    slotKey: input.slotKey,
  })
  return link
}

function emptyState(): StateFile {
  return {
    schemaVersion: STATE_SCHEMA_VERSION,
    revision: 0,
    slots: {},
    logs: [],
    lastReconciledAt: 0,
    candidateBatches: {},
    suppressedContentFingerprints: {},
    queueDirector: defaultQueueDirector(),
    assetLibrary: emptyAssetLibrary(),
    versionTrees: {},
    continuityVault: emptyContinuityVault(''),
    customSurfaces: defaultCustomSurfaceStudio(),
    proseIllustrator: emptyProseIllustratorState(),
    backgroundQueue: emptyBackgroundQueue(),
    galleryLinks: {},
    lastDryRun: null,
    lastGenerationBlockers: [],
  }
}

function streamEventType(event: Record<string, unknown>): string {
  return cleanString(event.type || event.event || event.kind || event.statusType)
    .toLocaleLowerCase()
    .replace(/[\s_]+/g, '-')
}

function streamImageValue(value: unknown): string {
  if (typeof value === 'string') {
    const text = value.trim()
    return /^(?:data:image\/|blob:|https?:\/\/|\/)/i.test(text) ? text : ''
  }
  if (!value || typeof value !== 'object') return ''
  const record = value as Record<string, unknown>
  for (const key of ['previewImageDataUrl', 'imageDataUrl', 'dataUrl', 'imageUrl', 'url', 'src']) {
    const found = streamImageValue(record[key])
    if (found) return found
  }
  for (const key of ['preview', 'image', 'output', 'result', 'data', 'payload']) {
    const found = streamImageValue(record[key])
    if (found) return found
  }
  return ''
}

function streamGenerationResult(event: Record<string, unknown>): any {
  for (const candidate of [event.result, event.output, event.data, event.image]) {
    if (candidate && typeof candidate === 'object') return candidate
  }
  return null
}

export function normalizeImageGenerationStreamEvent(rawEvent: unknown): {
  type: string
  previewImageDataUrl: string
  statusText: string
  step?: number
  totalSteps?: number
  nodeId: string
  result: any
} | null {
  if (!rawEvent || typeof rawEvent !== 'object') return null
  const event = rawEvent as Record<string, unknown>
  return {
    type: streamEventType(event),
    previewImageDataUrl: streamImageValue(event),
    statusText: cleanString(event.status) || cleanString(event.message) || cleanString(event.text),
    step: numberOrUndefined(event.step ?? event.currentStep ?? event.current ?? event.progressStep),
    totalSteps: numberOrUndefined(event.totalSteps ?? event.steps ?? event.maxSteps ?? event.total),
    nodeId: cleanString(event.nodeId ?? event.node ?? event.executingNode),
    result: streamGenerationResult(event),
  }
}

async function generateWithOptionalStream(
  finalRequest: Record<string, unknown>,
  plan: ImagePlan,
  userId: string | undefined,
  context: ImageGenerationStreamContext,
): Promise<any> {
  const controller = new AbortController()
  registerImageStream(context, controller)
  let releaseLane: (() => void) | null = null
  try {
    releaseLane = await acquireImageGenerationLane(userId, context, controller)
    if (controller.signal.aborted) throw abortError()

    const input = { ...finalRequest, userId, signal: controller.signal }
    const api = spindle.imageGen as unknown as {
      generate: (input: Record<string, unknown>) => Promise<any>
      generateStream?: (input: Record<string, unknown>) => AsyncIterable<any>
    }
    const providerInfo = await streamProviderInfo(plan.provider, userId)
    const canStream = imageProviderSupportsStreaming(plan.provider, providerInfo, typeof api.generateStream === 'function')
    sendImageStreamEvent(userId, context, { event: 'started', streaming: canStream, statusText: canStream ? 'Connecting to live preview…' : 'Starting generation…' })

    if (!canStream || !api.generateStream) {
      const result = await api.generate(input)
      if (controller.signal.aborted) throw abortError()
      const finalPreview = streamImageValue(result)
      if (finalPreview) sendImageStreamEvent(userId, context, { event: 'preview', previewImageDataUrl: finalPreview, streaming: false, statusText: 'Final preview ready.' })
      sendImageStreamEvent(userId, context, { event: 'done', streaming: false, statusText: 'Generation complete.' })
      return result
    }

    let result: any = null
    for await (const rawEvent of api.generateStream(input)) {
      if (controller.signal.aborted) throw abortError()
      const normalizedEvent = normalizeImageGenerationStreamEvent(rawEvent)
      if (!normalizedEvent) continue
      const { type, previewImageDataUrl, step, totalSteps, nodeId } = normalizedEvent

      if (previewImageDataUrl && !['done', 'complete', 'completed', 'finished', 'result'].includes(type)) {
        sendImageStreamEvent(userId, context, {
          event: 'preview',
          streaming: true,
          statusText: normalizedEvent.statusText || 'Generating live preview…',
          previewImageDataUrl,
          step,
          totalSteps,
          nodeId,
        })
      } else if (['status', 'progress', 'executing', 'execution-status', 'queued'].includes(type)) {
        sendImageStreamEvent(userId, context, {
          event: 'status',
          streaming: true,
          statusText: normalizedEvent.statusText || 'Generating…',
          step,
          totalSteps,
          nodeId,
        })
      }

      if (['done', 'complete', 'completed', 'finished', 'result'].includes(type)) {
        result = normalizedEvent.result
        const finalPreview = previewImageDataUrl || streamImageValue(result)
        if (finalPreview) {
          sendImageStreamEvent(userId, context, {
            event: 'preview',
            streaming: false,
            statusText: 'Final preview ready.',
            previewImageDataUrl: finalPreview,
            step,
            totalSteps,
            nodeId,
          })
        }
      }
    }
    if (!result) {
      sendImageStreamEvent(userId, context, { event: 'status', streaming: false, statusText: 'Live preview ended early. Finishing through the standard ImageGen call…' })
      result = await api.generate(input)
      const finalPreview = streamImageValue(result)
      if (finalPreview) sendImageStreamEvent(userId, context, { event: 'preview', previewImageDataUrl: finalPreview, streaming: false, statusText: 'Final preview ready.' })
    }
    if (!result) throw new Error('ImageGen completed without returning an image result.')
    sendImageStreamEvent(userId, context, { event: 'done', streaming: canStream, statusText: 'Generation complete.' })
    return result
  } catch (error) {
    if (isAbortError(error) || controller.signal.aborted) {
      sendImageStreamEvent(userId, context, { event: 'cancelled', streaming: false, statusText: 'Generation stopped.' })
      throw abortError(error instanceof Error ? error.message : 'Generation cancelled by user.')
    }
    const message = error instanceof Error ? error.message : String(error)
    sendImageStreamEvent(userId, context, { event: 'error', streaming: false, statusText: 'Generation failed.', error: message })
    throw error
  } finally {
    releaseLane?.()
    releaseImageStream(context, controller)
  }
}

async function streamProviderInfo(providerId: string, userId?: string): Promise<{ id: string; name?: string; capabilities?: Record<string, unknown> } | undefined> {
  try {
    const api = spindle.imageGen as typeof spindle.imageGen & { getProviders?: (userId?: string) => Promise<Array<{ id: string; name?: string; capabilities?: Record<string, unknown> }>> }
    if (!api.getProviders) return undefined
    const providers = await api.getProviders(userId)
    const normalized = cleanString(providerId).toLocaleLowerCase()
    return providers.find((provider: any) => cleanString(provider.id).toLocaleLowerCase() === normalized || cleanString(provider.name).toLocaleLowerCase() === normalized)
  } catch (error) {
    spindle.log.warn(`[ReverieRelay:image_stream_provider] ${error instanceof Error ? error.message : String(error)}`)
    return undefined
  }
}

function sendImageStreamEvent(
  userId: string | undefined,
  context: ImageGenerationStreamContext,
  patch: { event: 'started' | 'status' | 'preview' | 'done' | 'cancelled' | 'error'; previewImageDataUrl?: string; statusText?: string; step?: number; totalSteps?: number; nodeId?: string; streaming?: boolean; error?: string },
): void {
  spindle.sendToFrontend({
    type: 'image_generation_stream',
    chatId: context.chatId,
    generationId: context.generationId,
    source: context.source,
    slotKey: context.slotKey,
    requestId: context.requestId,
    ...patch,
  }, userId)
}

function clampNumber(value: number, min: number, max: number, fallback: number): number {
  return Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : fallback
}

function numberOrUndefined(value: unknown): number | undefined {
  const number = Number(value)
  return Number.isFinite(number) ? number : undefined
}

function migrateState(raw: Partial<StateFile> | null | undefined): StateFile {
  const base = raw && typeof raw === 'object' ? raw : {}
  const slots = base.slots && typeof base.slots === 'object' ? base.slots as Record<string, SlotRecord> : {}
  const state: StateFile = {
    schemaVersion: STATE_SCHEMA_VERSION,
    revision: Math.max(0, Number(base.revision) || 0),
    clearedAt: Number(base.clearedAt) || undefined,
    suppressedContentFingerprints: base.suppressedContentFingerprints && typeof base.suppressedContentFingerprints === 'object'
      ? base.suppressedContentFingerprints as Record<string, string>
      : {},
    slots,
    logs: Array.isArray(base.logs) ? base.logs as RouterLogEntry[] : [],
    lastReconciledAt: Number(base.lastReconciledAt) || 0,
    lastReconciliation: base.lastReconciliation,
    candidateBatches: base.candidateBatches && typeof base.candidateBatches === 'object'
      ? base.candidateBatches as Record<string, RelayCandidateBatch>
      : {},
    queueDirector: normalizeQueueDirector((base as Partial<StateFile>).queueDirector),
    assetLibrary: normalizeAssetLibrary((base as Partial<StateFile>).assetLibrary),
    versionTrees: normalizeVersionTrees((base as Partial<StateFile>).versionTrees),
    continuityVault: normalizeContinuityVault((base as Partial<StateFile>).continuityVault, firstString(Object.values(slots)[0]?.chatId), Number(base.schemaVersion) || 1),
    customSurfaces: normalizeCustomSurfaceStudio((base as Partial<StateFile>).customSurfaces),
    proseIllustrator: normalizeProseIllustratorState((base as Partial<StateFile>).proseIllustrator),
    backgroundQueue: normalizeBackgroundQueue((base as Partial<StateFile>).backgroundQueue),
    galleryLinks: normalizeGalleryLinks((base as Partial<StateFile>).galleryLinks),
    lastDryRun: (base as Partial<StateFile>).lastDryRun && typeof (base as Partial<StateFile>).lastDryRun === 'object' ? cloneValue((base as Partial<StateFile>).lastDryRun!) : null,
    lastGenerationBlockers: Array.isArray((base as Partial<StateFile>).lastGenerationBlockers) ? cloneValue((base as Partial<StateFile>).lastGenerationBlockers!) : [],
  }
  const migrated = Number(base.schemaVersion) !== STATE_SCHEMA_VERSION
  if (!state.continuityVault.chatId) state.continuityVault.chatId = firstString(Object.values(slots)[0]?.chatId)
  for (const record of Object.values(state.slots)) migrateSlotRecord(record)
  for (const batch of Object.values(state.candidateBatches)) for (const candidate of batch.candidates || []) candidate.imageIntent = normalizeImageIntent(candidate.imageIntent)
  rebuildAssetLibraryAndVersionTrees(state)
  for (const key of Object.keys(state.queueDirector.jobStatuses || {})) {
    if (key.startsWith('storyboard:')) delete state.queueDirector.jobStatuses[key]
  }
  if (migrated) {
    appendStateLog(state, {
      severity: 'info', stage: 'state-migration', eventType: 'state_migrated',
      message: `Migrated Relay state from schema ${Number(base.schemaVersion) || 1} to ${STATE_SCHEMA_VERSION}.`,
    })
  }
  return state
}

function migrateSlotRecord(record: SlotRecord): void {
  const now = record.updatedAt || record.createdAt || Date.now()
  record.imageIntent = normalizeImageIntent(record.imageIntent)
  record.discoveredAt ||= record.createdAt || now
  record.registeredAt ||= record.createdAt || now
  if (!record.recoverySource) record.queuedAt ||= record.createdAt || now
  record.attempts ||= []
  record.history ||= []
  record.history = record.history.map(version => ({ ...version, imageIntent: normalizeImageIntent(version.imageIntent ?? record.imageIntent), promptPipeline: version.promptPipeline ? { ...version.promptPipeline, imageIntent: normalizeImageIntent(version.promptPipeline.imageIntent ?? version.imageIntent ?? record.imageIntent) } : version.promptPipeline }))
  record.promptPipeline ||= emptyPromptPipeline(record)
  record.promptPipeline.imageIntent = normalizeImageIntent(record.promptPipeline.imageIntent ?? record.imageIntent)
  if (record.recoverySource && !record.recoveryCompleteness) {
    record.recoveryCompleteness = record.recoverySource === 'unresolved-request' ? 'full' : 'marker-only'
  }
  if (record.recoveryCompleteness === 'marker-only' && !record.missingRecoveryFields) {
    record.missingRecoveryFields = ['originalSceneBrief', 'originalRequestXml', 'resolvedPrompt', 'generationSettings', 'parserOutput', 'attempts', 'history']
  }
  if (record.status === 'completed') record.completedAt ||= record.updatedAt || now
  if (record.status === 'failed') record.failedAt ||= record.updatedAt || now
  const lastProcessingAt = Math.max(record.generationStartedAt || 0, record.parsingStartedAt || 0, record.queuedAt || 0, record.updatedAt || 0)
  const processingAge = Date.now() - lastProcessingAt
  const persistedBeforeThisRuntime = lastProcessingAt > 0 && lastProcessingAt < BACKEND_STARTED_AT
  const activeInThisRuntime = relayProcessingKeys.has(record.key) || isRecordJobActive(record)
  if ((record.status === 'parsing' || record.status === 'generating') && !activeInThisRuntime && (persistedBeforeThisRuntime || processingAge > 90_000)) {
    record.status = canReparseRecord(record) ? 'recovered-pending' : 'failed'
    record.error = 'Recovered after the app closed or generation state became stale. Reparse or generate this slot again.'
    record.updatedAt = Date.now()
    finishAttempt(record, 'cancelled', record.updatedAt, 'Recovered stale processing state after restart.')
  } else if (record.status === 'queued' && !activeInThisRuntime && processingAge > 90_000) {
    record.status = canReparseRecord(record) ? 'recovered-pending' : 'failed'
    record.error = 'Recovered a stale queued slot after restart.'
    record.updatedAt = Date.now()
  }
}

function defaultQueueDirector(): QueueDirectorState {
  return { pausedAfterCurrent: false, concurrencyLimit: 2, selectedKeys: [], jobStatuses: {} }
}

function normalizeQueueDirector(value: unknown): QueueDirectorState {
  const raw = cleanParameters(value)
  return {
    pausedAfterCurrent: raw.pausedAfterCurrent === true,
    concurrencyLimit: clampInt(raw.concurrencyLimit, 1, 4, 2),
    selectedKeys: Array.isArray(raw.selectedKeys) ? raw.selectedKeys.map(key => String(key)).filter(Boolean) : [],
    jobStatuses: cleanParameters(raw.jobStatuses) as QueueDirectorState['jobStatuses'],
  }
}

function emptyAssetLibrary(): AssetLibraryState {
  return { assets: {}, compare: {}, updatedAt: 0 }
}

function normalizeAssetLibrary(value: unknown): AssetLibraryState {
  const raw = cleanParameters(value)
  const assets: Record<string, VisualAssetReference> = {}
  if (raw.assets && typeof raw.assets === 'object') {
    for (const [assetId, asset] of Object.entries(raw.assets as Record<string, unknown>)) {
      const normalized = normalizeAssetReference(assetId, asset)
      if (normalized) assets[normalized.assetId] = normalized
    }
  }
  const compareRaw = cleanParameters(raw.compare)
  return {
    assets,
    compare: {
      leftAssetId: cleanString(compareRaw.leftAssetId) || undefined,
      rightAssetId: cleanString(compareRaw.rightAssetId) || undefined,
    },
    updatedAt: Number(raw.updatedAt) || 0,
  }
}

function normalizeAssetReference(assetId: string, value: unknown): VisualAssetReference | null {
  const raw = cleanParameters(value)
  const imageUrl = cleanString(raw.imageUrl)
  const imageId = cleanString(raw.imageId) || imageIdFromUrl(imageUrl)
  if (!imageUrl && !imageId) return null
  const target = cleanString(raw.target) as SlotRecord['target']
  return {
    assetId: cleanString(raw.assetId) || assetId,
    imageId,
    imageUrl,
    status: ['available', 'unavailable', 'deleted', 'unknown'].includes(cleanString(raw.status)) ? cleanString(raw.status) as VisualAssetReference['status'] : 'unknown',
    favorite: raw.favorite === true,
    visualReference: raw.visualReference === true,
    tags: stringList(raw.tags),
    caption: cleanString(raw.caption),
    alt: cleanString(raw.alt),
    characterNames: stringList(raw.characterNames),
    locationNames: stringList(raw.locationNames),
    promptProfileId: cleanString(raw.promptProfileId) || undefined,
    target: isImageTarget(target) ? target : 'twitter.media',
    targetApp: ['twitter', 'instagram', 'smartphone', 'kakao', 'prose', 'custom'].includes(cleanString(raw.targetApp)) ? cleanString(raw.targetApp) as VisualAssetReference['targetApp'] : targetApp(isImageTarget(target) ? target : 'twitter.media'),
    chatId: cleanString(raw.chatId),
    messageId: cleanString(raw.messageId),
    swipeId: Number(raw.swipeId) || 0,
    sourceDeletedAt: Number(raw.sourceDeletedAt) || undefined,
    sourceDeletedReason: cleanString(raw.sourceDeletedReason) || undefined,
    requestId: cleanString(raw.requestId),
    slot: cleanString(raw.slot),
    versionId: cleanString(raw.versionId) || undefined,
    rootVersionId: cleanString(raw.rootVersionId) || undefined,
    source: ['current-slot', 'history', 'candidate', 'reused'].includes(cleanString(raw.source)) ? cleanString(raw.source) as VisualAssetReference['source'] : 'current-slot',
    createdAt: Number(raw.createdAt) || Date.now(),
    updatedAt: Number(raw.updatedAt) || Date.now(),
    lastUsedAt: Number(raw.lastUsedAt) || undefined,
    originalSceneBrief: cleanString(raw.originalSceneBrief),
    resolvedPositivePrompt: cleanString(raw.resolvedPositivePrompt),
    resolvedNegativePrompt: cleanString(raw.resolvedNegativePrompt),
    metadata: cleanParameters(raw.metadata),
  }
}

function normalizeVersionTrees(value: unknown): Record<string, VersionTree> {
  const raw = value && typeof value === 'object' ? value as Record<string, unknown> : {}
  const trees: Record<string, VersionTree> = {}
  for (const [treeId, treeValue] of Object.entries(raw)) {
    const tree = normalizeVersionTree(treeId, treeValue)
    if (tree) trees[tree.treeId] = tree
  }
  return trees
}

function normalizeVersionTree(treeId: string, value: unknown): VersionTree | null {
  const raw = cleanParameters(value)
  const nodes: Record<string, VersionTreeNode> = {}
  if (raw.nodes && typeof raw.nodes === 'object') {
    for (const [versionId, nodeValue] of Object.entries(raw.nodes as Record<string, unknown>)) {
      const node = normalizeVersionNode(versionId, nodeValue)
      if (node) nodes[node.versionId] = node
    }
  }
  const slotKeyValue = cleanString(raw.slotKey)
  if (!slotKeyValue && !Object.keys(nodes).length) return null
  return {
    treeId: cleanString(raw.treeId) || treeId,
    chatId: cleanString(raw.chatId),
    slotKey: slotKeyValue,
    rootVersionId: cleanString(raw.rootVersionId) || Object.keys(nodes)[0] || '',
    currentVersionId: cleanString(raw.currentVersionId) || undefined,
    nodes,
    updatedAt: Number(raw.updatedAt) || Date.now(),
  }
}

function normalizeVersionNode(versionId: string, value: unknown): VersionTreeNode | null {
  const raw = cleanParameters(value)
  const assetId = cleanString(raw.assetId)
  if (!assetId) return null
  const state = cleanString(raw.state)
  return {
    versionId: cleanString(raw.versionId) || versionId,
    assetId,
    parentVersionId: cleanString(raw.parentVersionId) || undefined,
    rootVersionId: cleanString(raw.rootVersionId),
    childVersionIds: stringList(raw.childVersionIds),
    branchLabel: cleanString(raw.branchLabel) || 'Imported',
    generationIntent: raw.generationIntent as RegenerationIntent | undefined,
    promptProfile: raw.promptProfile as PromptProfileDecision | undefined,
    sourceRequestId: cleanString(raw.sourceRequestId),
    sourceSlotId: cleanString(raw.sourceSlotId),
    createdAt: Number(raw.createdAt) || Date.now(),
    state: ['committed', 'selected', 'discarded', 'unavailable'].includes(state) ? state as VersionTreeNode['state'] : 'committed',
    diagnostic: raw.diagnostic as SlotDiagnostic | undefined,
  }
}

function rebuildAssetLibraryAndVersionTrees(state: StateFile): void {
  const preserved = state.assetLibrary?.assets || {}
  const nextLibrary = emptyAssetLibrary()
  nextLibrary.compare = state.assetLibrary?.compare || {}

  // Message deletion intentionally removes active slots, but completed image
  // assets remain a durable archive. Preserve those orphaned-by-deletion rows
  // before rebuilding the live slot-derived library.
  for (const asset of Object.values(preserved)) {
    if (!asset.sourceDeletedAt) continue
    nextLibrary.assets[asset.assetId] = cloneValue(asset)
    nextLibrary.updatedAt = Math.max(nextLibrary.updatedAt, asset.updatedAt || asset.sourceDeletedAt)
  }

  const nextTrees: Record<string, VersionTree> = {}
  for (const record of Object.values(state.slots)) {
    rebuildSlotAssetsAndTree(record, nextLibrary, nextTrees, preserved)
  }
  state.assetLibrary = nextLibrary
  state.versionTrees = nextTrees
}

function rebuildSlotAssetsAndTree(
  record: SlotRecord,
  library: AssetLibraryState,
  trees: Record<string, VersionTree>,
  preserved: Record<string, VisualAssetReference>,
): void {
  const versions: Array<{ snapshot: GenerationSnapshot; source: VisualAssetReference['source']; current: boolean }> = []
  for (const snapshot of [...(record.history || [])].reverse()) versions.push({ snapshot, source: 'history', current: false })
  const current = snapshotFromRecord(record, record.updatedAt || Date.now())
  if (current) versions.push({ snapshot: current, source: 'current-slot', current: true })
  if (!versions.length) return

  let parentVersionId: string | undefined
  let rootVersionId = ''
  const treeId = versionTreeIdForSlot(record.key)
  const tree: VersionTree = {
    treeId,
    chatId: record.chatId,
    slotKey: record.key,
    rootVersionId: '',
    currentVersionId: undefined,
    nodes: {},
    updatedAt: record.updatedAt || Date.now(),
  }
  for (const item of versions) {
    const asset = assetFromSnapshot(record, item.snapshot, item.source, preserved)
    if (!asset) continue
    if (item.current) asset.lastUsedAt = record.updatedAt || Date.now()
    const versionId = versionIdForSnapshot(record.key, item.snapshot)
    if (!rootVersionId) rootVersionId = versionId
    asset.versionId = versionId
    asset.rootVersionId = rootVersionId
    library.assets[asset.assetId] = asset
    library.updatedAt = Math.max(library.updatedAt, asset.updatedAt)
    const node: VersionTreeNode = {
      versionId,
      assetId: asset.assetId,
      parentVersionId,
      rootVersionId,
      childVersionIds: [],
      branchLabel: branchLabelForSnapshot(item.snapshot),
      generationIntent: item.snapshot.regenerationIntent,
      promptProfile: item.snapshot.promptProfile,
      sourceRequestId: record.requestId,
      sourceSlotId: record.key,
      createdAt: item.snapshot.generatedAt || asset.createdAt,
      state: item.current ? 'selected' : item.snapshot.imageUrl ? 'committed' : 'unavailable',
      diagnostic: item.snapshot.diagnostic,
    }
    tree.nodes[versionId] = node
    if (parentVersionId && tree.nodes[parentVersionId]) tree.nodes[parentVersionId].childVersionIds.push(versionId)
    parentVersionId = versionId
    if (item.current) {
      tree.currentVersionId = versionId
      record.assetId = asset.assetId
      record.currentVersionId = versionId
      record.rootVersionId = rootVersionId
      record.versionTreeId = treeId
    }
  }
  tree.rootVersionId = rootVersionId
  if (tree.rootVersionId) trees[treeId] = tree
}

function assetFromSnapshot(
  record: SlotRecord,
  snapshot: GenerationSnapshot,
  source: VisualAssetReference['source'],
  preserved: Record<string, VisualAssetReference>,
): VisualAssetReference | null {
  if (!snapshot.imageUrl && !snapshot.imageId) return null
  const assetId = assetIdForImage(snapshot.imageId, snapshot.imageUrl)
  const prior = preserved[assetId]
  const createdAt = snapshot.generatedAt || record.completedAt || record.updatedAt || Date.now()
  const characterOwner = singleCharacterOwnerName(`${record.originalSceneBrief} ${snapshot.resolvedPositivePrompt}`)
  return {
    assetId,
    imageId: snapshot.imageId || imageIdFromUrl(snapshot.imageUrl),
    imageUrl: snapshot.imageUrl || '',
    status: record.imageAvailability === 'missing' || !snapshot.imageUrl ? 'unavailable' : 'available',
    favorite: prior?.favorite === true,
    visualReference: prior?.visualReference === true,
    tags: prior?.tags ? [...prior.tags] : [],
    caption: record.caption || '',
    alt: record.alt || '',
    characterNames: characterOwner ? [characterOwner] : [],
    locationNames: extractLocationHints(`${record.originalSceneBrief} ${snapshot.resolvedPositivePrompt}`),
    promptProfileId: snapshot.promptProfile?.selectedProfileId || record.selectedPromptProfileId || snapshot.promptPresetId || undefined,
    target: record.target,
    targetApp: record.targetApp,
    chatId: record.chatId,
    messageId: record.messageId,
    swipeId: record.swipeId,
    requestId: record.requestId,
    slot: record.slot,
    versionId: snapshot.versionId,
    rootVersionId: snapshot.rootVersionId,
    source,
    createdAt,
    updatedAt: Math.max(createdAt, Number(prior?.updatedAt) || 0),
    lastUsedAt: prior?.lastUsedAt,
    originalSceneBrief: record.originalSceneBrief,
    resolvedPositivePrompt: snapshot.resolvedPositivePrompt || '',
    resolvedNegativePrompt: snapshot.resolvedNegativePrompt || '',
    metadata: {
      provider: snapshot.imageProvider,
      connection: snapshot.imageConnectionName,
      model: snapshot.imageModel,
      target: record.target,
      promptProfile: snapshot.promptProfile,
      regenerationIntent: snapshot.regenerationIntent,
      generationParameters: snapshot.finalImageParameters,
      finalImageRequest: snapshot.finalImageRequest,
      nativeImageSettings: snapshot.nativeImageSettings,
      diagnostic: snapshot.diagnostic,
    },
  }
}

function commitSlotAssetVersion(state: StateFile, record: SlotRecord, result: SlotGenerationResult, previousSnapshot: GenerationSnapshot | null, now: number): void {
  const treeId = versionTreeIdForSlot(record.key)
  let tree = state.versionTrees[treeId]
  if (!tree) {
    const seedLibrary = emptyAssetLibrary()
    const seedTrees: Record<string, VersionTree> = {}
    rebuildSlotAssetsAndTree(record, seedLibrary, seedTrees, state.assetLibrary.assets)
    tree = seedTrees[treeId] || {
      treeId,
      chatId: record.chatId,
      slotKey: record.key,
      rootVersionId: '',
      currentVersionId: undefined,
      nodes: {},
      updatedAt: now,
    }
    state.versionTrees[treeId] = tree
    for (const asset of Object.values(seedLibrary.assets)) state.assetLibrary.assets[asset.assetId] = asset
  }

  const asset = assetFromSnapshot(record, result, 'current-slot', state.assetLibrary.assets)
  if (!asset) return
  const previousVersionId = previousSnapshot?.versionId || record.currentVersionId || tree.currentVersionId
  const rootVersionId = tree.rootVersionId || previousSnapshot?.rootVersionId || previousVersionId || versionIdForSnapshot(record.key, result)
  const parentVersionId = result.regenerationIntent?.id === 'full-reimagining' && tree.rootVersionId ? tree.rootVersionId : previousVersionId
  const versionId = versionIdForSnapshot(record.key, result)
  asset.versionId = versionId
  asset.rootVersionId = rootVersionId
  asset.lastUsedAt = now
  asset.updatedAt = now
  state.assetLibrary.assets[asset.assetId] = asset
  state.assetLibrary.updatedAt = now

  for (const node of Object.values(tree.nodes)) {
    if (node.state === 'selected') node.state = 'committed'
  }
  if (parentVersionId && tree.nodes[parentVersionId] && !tree.nodes[parentVersionId].childVersionIds.includes(versionId)) {
    tree.nodes[parentVersionId].childVersionIds.push(versionId)
  }
  tree.nodes[versionId] = {
    versionId,
    assetId: asset.assetId,
    parentVersionId,
    rootVersionId,
    childVersionIds: tree.nodes[versionId]?.childVersionIds || [],
    branchLabel: branchLabelForSnapshot(result),
    generationIntent: result.regenerationIntent,
    promptProfile: result.promptProfile,
    sourceRequestId: record.requestId,
    sourceSlotId: record.key,
    createdAt: now,
    state: 'selected',
    diagnostic: result.diagnostic,
  }
  tree.rootVersionId = rootVersionId
  tree.currentVersionId = versionId
  tree.updatedAt = now
  record.assetId = asset.assetId
  record.currentVersionId = versionId
  record.rootVersionId = rootVersionId
  record.versionTreeId = treeId
  result.assetId = asset.assetId
  result.versionId = versionId
  result.parentVersionId = parentVersionId
  result.rootVersionId = rootVersionId
  result.branchLabel = tree.nodes[versionId].branchLabel
  if (record.proseIllustrationId && state.proseIllustrator.records[record.proseIllustrationId]) {
    const proseRecord = state.proseIllustrator.records[record.proseIllustrationId]
    proseRecord.status = 'completed'
    proseRecord.completedAt = now
    proseRecord.imageId = result.imageId
    proseRecord.imageUrl = result.imageUrl
    proseRecord.assetId = asset.assetId
    proseRecord.versionId = versionId
    proseRecord.inserted = true
    proseRecord.insertionVerified = true
    proseRecord.error = undefined
    const prosePlan = state.proseIllustrator.plans[proseRecord.planId]
    if (prosePlan) {
      prosePlan.status = 'generated'
      prosePlan.approvalRequired = false
      if (prosePlan.opportunityId && state.proseIllustrator.opportunities[prosePlan.opportunityId]) {
        state.proseIllustrator.opportunities[prosePlan.opportunityId].status = 'generated'
        state.proseIllustrator.opportunities[prosePlan.opportunityId].updatedAt = now
      }
    }
  }
  updateContinuityFromAcceptedAsset(state, record, result, now)
}

function markRestoredVersion(state: StateFile, record: SlotRecord, snapshot: GenerationSnapshot, now: number): void {
  const treeId = record.versionTreeId || versionTreeIdForSlot(record.key)
  const tree = state.versionTrees[treeId]
  const versionId = snapshot.versionId || versionIdForSnapshot(record.key, snapshot)
  const assetId = snapshot.assetId || assetIdForImage(snapshot.imageId, snapshot.imageUrl)
  if (tree) {
    for (const node of Object.values(tree.nodes)) {
      if (node.state === 'selected') node.state = 'committed'
    }
    if (tree.nodes[versionId]) tree.nodes[versionId].state = 'selected'
    tree.currentVersionId = versionId
    tree.updatedAt = now
  }
  const asset = state.assetLibrary.assets[assetId]
  if (asset) {
    asset.lastUsedAt = now
    asset.updatedAt = now
    state.assetLibrary.updatedAt = now
  }
  record.assetId = assetId
  record.currentVersionId = versionId
  record.rootVersionId = snapshot.rootVersionId || tree?.rootVersionId || versionId
  record.versionTreeId = treeId
}

function assetIdForImage(imageId?: string, imageUrl?: string): string {
  const stable = cleanString(imageId) || imageIdFromUrl(cleanString(imageUrl)) || cleanString(imageUrl) || 'unknown'
  return `asset-${contentFingerprint(stable).slice(0, 18)}`
}

function versionTreeIdForSlot(key: string): string {
  return `tree-${contentFingerprint(key).slice(0, 18)}`
}

function versionIdForSnapshot(key: string, snapshot: Pick<GenerationSnapshot, 'imageId' | 'imageUrl' | 'generatedAt'>): string {
  return `version-${contentFingerprint(`${key}:${snapshot.imageId || ''}:${snapshot.imageUrl || ''}:${snapshot.generatedAt || 0}`).slice(0, 22)}`
}

function branchLabelForSnapshot(snapshot: Pick<GenerationSnapshot, 'regenerationIntent' | 'triggerType'>): string {
  if (snapshot.regenerationIntent?.label) return snapshot.regenerationIntent.label
  if (snapshot.triggerType === 'restore') return 'Restored'
  if (snapshot.triggerType === 'reparse') return 'Reparse'
  if (snapshot.triggerType === 'edited-prompt') return 'Edited Prompt'
  if (snapshot.triggerType?.startsWith('regenerate')) return 'Regenerate'
  return 'Original'
}

function imageIdFromUrl(value: string): string {
  const clean = cleanString(value)
  const match = clean.match(/(?:results|images|image-gen)\/([^/?#"\s]+)/i)
  return match ? decodeURIComponent(match[1]) : ''
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return [...new Set(value.map(item => cleanString(item)).filter(Boolean))]
}

function extractNamedEntities(value: string): string[] {
  const text = cleanString(value)
  const matches = text.match(/\b[A-Z][a-z]{2,}(?:\s+[A-Z][a-z]{2,})?\b/g) || []
  const ignored = new Set(['Twitter', 'Instagram', 'Kakao', 'Smartphone', 'Reverie', 'Relay', 'ImageGen'])
  return [...new Set(matches.filter(name => !ignored.has(name)).slice(0, 12))]
}

const NON_CHARACTER_ENTITY_RE = /\b(?:Twitter|Instagram|Kakao|Smartphone|Reverie|Relay|ImageGen|Office|Education|School|Gate|Gates|Room|Studio|Cafe|Café|Classroom|Hallway|Bedroom|Vanity|Street|Station|Garden|Kitchen|Library|Building|Government|Court|Board|Lobby|Corridor|Door|Window|Wall|Floor|Ceiling|Suit|Sweatshirt|Jacket|Dress|Shirt|Skirt|Pants|Shoes|Phone|Camera|Photo|Image|Asset|Eye|Eyes|Face|Hair|Hand|Hands|Mouth|Smile|Shot|Lighting|Composition|Quality|Record|Illustration|Scene|Prompt)\b/i

function extractCharacterCandidates(value: string): string[] {
  return extractNamedEntities(value)
    .filter(name => !/^(?:A|An|The)\s+/i.test(name))
    .filter(isLikelyGeneticCharacterName)
}

function singleCharacterOwnerName(value: string): string {
  const names = extractCharacterCandidates(value)
  return names.length === 1 ? names[0] : ''
}

function extractLocationHints(value: string): string[] {
  const text = cleanString(value)
  const hints: string[] = []
  const patterns = [
    /\b(?:at|in|inside|outside|near|beside)\s+(?:the\s+)?([a-z][a-z\s-]{2,40}?)(?:[,.;]|$)/gi,
    /\b(school gates?|studio floor|rehearsal studio|cafe|classroom|hallway|bedroom|vanity|street|station|garden|kitchen|library)\b/gi,
  ]
  for (const pattern of patterns) {
    let match: RegExpExecArray | null
    while ((match = pattern.exec(text)) !== null) hints.push(titleCase(cleanString(match[1])))
  }
  return [...new Set(hints.filter(Boolean).slice(0, 12))]
}

function titleCase(value: string): string {
  return cleanString(value).replace(/\b\w/g, char => char.toLocaleUpperCase())
}

function isLikelyGeneticCharacterName(value: string): boolean {
  const name = cleanString(value)
  if (!name || NON_CHARACTER_ENTITY_RE.test(name)) return false
  const words = name.split(/\s+/).filter(Boolean)
  if (words.length > 3) return false
  if (words.some(word => word.length < 2 || NON_CHARACTER_ENTITY_RE.test(word))) return false
  if (/^(?:A|An|The|This|That|These|Those|Young|Old|Medium|Close|Wide|Long|Short)$/i.test(words[0])) return false
  return /^[A-Z][A-Za-z'-]*(?:\s+[A-Z][A-Za-z'-]*){0,2}$/.test(name)
}

function geneticEntityNamesFromAsset(record: SlotRecord, result: SlotGenerationResult): string[] {
  const pipeline = result.promptPipeline || record.promptPipeline
  const visualSubjects = pipeline?.visualSubjectPrompts?.map(subject => subject.name) || []
  const proseSubjects = record.prosePromptComposition?.namedSubjects || []
  const textSubjects = extractCharacterCandidates(`${record.originalSceneBrief} ${result.resolvedPositivePrompt || ''}`)
  return [...new Set([...visualSubjects, ...proseSubjects, ...textSubjects].map(name => cleanString(name)).filter(isLikelyGeneticCharacterName))].slice(0, 6)
}

function extractAppearanceSuggestionValues(source: string, entityName: string, allEntityNames: string[]): string[] {
  const text = cleanString(source).replace(/\s+/g, ' ')
  if (!text || !entityName) return []
  let scope = text
  const entityIndex = text.toLocaleLowerCase().indexOf(entityName.toLocaleLowerCase())
  if (entityIndex >= 0) {
    const remainder = text.slice(entityIndex)
    let end = remainder.length
    for (const otherName of allEntityNames.filter(name => name.toLocaleLowerCase() !== entityName.toLocaleLowerCase())) {
      const otherIndex = remainder.toLocaleLowerCase().indexOf(otherName.toLocaleLowerCase(), entityName.length)
      if (otherIndex > 0) end = Math.min(end, otherIndex)
    }
    scope = remainder.slice(0, end)
  }

  const clauses = scope
    .split(/[,.;\n]\s*/)
    .map(part => cleanString(part.replace(new RegExp(`\\b${escapeRegExp(entityName)}\\b`, 'gi'), '')))
    .map(part => part.replace(/^(?:is|has|with|and|a|an|the)\s+/i, ''))
    .map(part => cleanString(part))
    .filter(Boolean)

  const safe: string[] = []
  for (const clause of clauses) {
    if (clause.length > 180 || looksLikeWholePrompt(clause)) continue
    const classification = classifyAppearanceValue(clause)
    if (!classification.layer || !classification.category) continue
    const cleaned = sanitizeAppearanceSuggestionClause(clause)
    if (!cleaned || safe.some(value => normalizePromptInstructionText(value) === normalizePromptInstructionText(cleaned))) continue
    safe.push(cleaned)
    if (safe.length >= 10) break
  }
  return safe
}

function sanitizeAppearanceSuggestionClause(value: string): string {
  return cleanString(value)
    .replace(/^(?:physically|appearance|character appearance)\s*[:\-]?\s*/i, '')
    .replace(/\s{2,}/g, ' ')
}

function looksLikeWholePrompt(value: string): boolean {
  const text = cleanString(value).toLocaleLowerCase()
  if (value.length > 280) return true
  const promptMarkers = ['shot', 'camera', 'lighting', 'composition', 'background', 'office', 'school', 'gate', 'building']
  return promptMarkers.filter(marker => text.includes(marker)).length >= 2
}


function updateContinuityFromAcceptedAsset(state: StateFile, record: SlotRecord, result: SlotGenerationResult, now: number): void {
  const vault = state.continuityVault
  if (!vault || vault.strength === 'off') return
  const assetId = record.assetId || assetIdForImage(result.imageId, result.imageUrl)
  const pipeline = result.promptPipeline || record.promptPipeline
  const trustedSubjects = [
    ...(pipeline?.visualSubjectPrompts || []).map(subject => subject.name),
    ...(record.prosePromptComposition?.namedSubjects || []),
  ].map(cleanString).filter(isValidCanonicalCharacterName)
  for (const subjectName of [...new Set(trustedSubjects)]) {
    try {
      registerCanonicalCharacter(vault, {
        name: subjectName,
        sourceType: (pipeline?.visualSubjectPrompts || []).some(subject => cleanString(subject.name) === subjectName)
          ? 'native-visual-preset'
          : 'user-confirmed-analysis',
        userConfirmed: true,
      }, now)
    } catch {
      // Invalid and unresolved subjects are deliberately not promoted.
    }
  }
  const entityNames = geneticEntityNamesFromAsset(record, result)
  for (const entityName of entityNames) {
    const values = extractAppearanceSuggestionValues(result.resolvedPositivePrompt || record.resolvedPositivePrompt || '', entityName, entityNames)
    for (const value of values) {
      suggestionFromGeneratedPrompt(vault, {
        subjectName: entityName,
        value,
        chatId: record.chatId,
        messageId: record.messageId,
        swipeId: record.swipeId,
        requestId: record.requestId,
        slot: record.slot,
        assetId,
        versionId: record.currentVersionId,
      }, now)
    }
  }
  vault.updatedAt = now
}

function selectContinuityForJob(state: StateFile, job: RouterJob, _classification: RequestClassification, resolvedSubjectNames: string[] = []): {
  included: ContinuityFact[]
  excluded: ContinuityDecision[]
  attachedReferenceAssetIds: string[]
  conflicts: string[]
  strength: ContinuityStrength
} {
  const vault = state.continuityVault || emptyContinuityVault(job.chatId)
  const key = slotKey({ ...job, slot: job.slots[0] || 'image' })
  if (vault.strength === 'off' || vault.ignoredForSlotKeys.includes(key)) {
    return {
      included: [],
      excluded: allAppearanceFacts(vault).map(fact => ({ factId: fact.factId, included: false, reason: vault.strength === 'off' ? 'Appearance Memory is off.' : 'Appearance Memory is ignored for this slot.' })),
      attachedReferenceAssetIds: [], conflicts: [], strength: vault.strength,
    }
  }
  expireCurrentAppearance(vault)
  if (hasExplicitNoHumanIntent(job) || job.prosePromptComposition?.peoplePolicy === 'forbidden') {
    return {
      included: [],
      excluded: allAppearanceFacts(vault).map(fact => ({ factId: fact.factId, included: false, reason: 'Authoritative scene explicitly forbids visible people.' })),
      attachedReferenceAssetIds: [], conflicts: [], strength: vault.strength,
    }
  }
  const proseSubjects = job.prosePromptComposition?.namedSubjects || []
  const sceneSubjects = extractCharacterCandidates(`${job.originalSceneBrief} ${job.caption || ''} ${job.alt || ''}`)
  const subjects = [...new Set([...resolvedSubjectNames, ...proseSubjects, ...sceneSubjects].map(cleanString).filter(Boolean))]
  const selection = selectContinuityForSubjects(vault, { subjectNames: subjects, chatId: job.chatId, sceneBrief: job.originalSceneBrief, strength: vault.strength })
  const attachedReferenceAssetIds = [...new Set(selection.included.flatMap(fact => fact.referenceAssetIds))]
  return { ...selection, attachedReferenceAssetIds, strength: vault.strength }
}

function appendStateLog(state: StateFile, entry: Omit<RouterLogEntry, 'id' | 'timestamp' | 'extensionVersion' | 'backendBuildId'>): void {
  state.logs.push({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: Date.now(),
    extensionVersion: EXTENSION_VERSION,
    backendBuildId: BUILD_ID,
    ...entry,
  })
  trimLogs(state)
}

function trimLogs(state: StateFile): void {
  if (state.logs.length > 500) state.logs.splice(0, state.logs.length - 500)
}

function backendBuildInfo(): BackendBuildInfo {
  return { extensionVersion: EXTENSION_VERSION, buildId: BUILD_ID, loadedAt: BACKEND_LOADED_AT, lastResponseAt: lastBackendResponseAt }
}

async function getState(chatId: string, userId?: string): Promise<StateFile> {
  const raw = await spindle.userStorage.getJson<Partial<StateFile>>(statePath(chatId), { fallback: {}, userId })
  const state = migrateState(raw)
  if (chatId !== UTILITY_STATE_ID) {
    let config = await getConfig(userId)
    const localStudio = normalizeCustomSurfaceStudio(state.customSurfaces || defaultCustomSurfaceStudio())
    if (!config.surfacePreferencesInitialized) {
      config = await setConfig({
        surfaceRendererMode: localStudio.rendererMode,
        surfaceDefaultShellMode: localStudio.defaultShellMode,
        surfaceColorMode: localStudio.colorMode,
        surfaceUtilityInjectionEnabled: localStudio.utilityInjectionEnabled,
        surfacePreferencesInitialized: true,
        globalSurfaceStudio: localStudio,
      }, userId)
    }
    const globalStudio = normalizeCustomSurfaceStudio(config.globalSurfaceStudio)
    globalStudio.rendererMode = config.surfaceRendererMode
    globalStudio.defaultShellMode = config.surfaceDefaultShellMode
    globalStudio.colorMode = config.surfaceColorMode
    globalStudio.utilityInjectionEnabled = config.surfaceUtilityInjectionEnabled
    const activeCollectionId = state.surfacePresetBindingId || globalStudio.defaultCollectionPresetId
    const collection = activeCollectionId ? globalStudio.collectionPresets[activeCollectionId] : undefined
    if (collection) {
      const enabled = new Set(collection.surfaceIds)
      for (const definition of Object.values(globalStudio.definitions)) definition.enabled = enabled.has(definition.surfaceId)
    }
    state.customSurfaces = globalStudio
    state.continuityVault.strength = config.vaultStrength

    const existing = state.proseIllustrator.settings[chatId]
    const localPaused = existing?.paused === true
    state.proseIllustrator.settings.__global__ = config.proseIllustratorSettings
    state.proseIllustrator.settings[chatId] = normalizeProseIllustratorSettings({
      ...config.proseIllustratorSettings,
      paused: localPaused,
    })
  }
  return state
}

async function writeStateUnlocked(chatId: string, state: StateFile, userId?: string): Promise<void> {
  await spindle.userStorage.mkdir('states', userId).catch(() => undefined)
  state.schemaVersion = STATE_SCHEMA_VERSION
  trimLogs(state)
  await spindle.userStorage.setJson(statePath(chatId), state, { indent: 2, userId })
}

async function mutateState<T>(chatId: string, userId: string | undefined, mutator: (state: StateFile) => T | Promise<T>): Promise<T> {
  return withStateMutationLock(chatId, async () => {
    const state = await getState(chatId, userId)
    const result = await mutator(state)
    state.revision = Math.max(0, Number(state.revision) || 0) + 1
    await writeStateUnlocked(chatId, state, userId)
    return result
  })
}

async function mutateJobState<T>(job: RouterJob, userId: string | undefined, mutator: (state: StateFile) => T | Promise<T>): Promise<T> {
  if (isJobCancelled(job)) throw new JobCancelledError()
  return mutateState(job.chatId, userId, state => {
    if (isJobCancelled(job) || !job.slots.every(slot => Boolean(state.slots[slotKey({ ...job, slot })]))) throw new JobCancelledError()
    return mutator(state)
  })
}

async function withStateMutationLock<T>(chatId: string, action: () => Promise<T>): Promise<T> {
  const previous = stateMutationQueues.get(chatId) || Promise.resolve()
  let release: () => void = () => undefined
  const current = new Promise<void>(resolve => { release = resolve })
  const queued = previous.then(() => current)
  stateMutationQueues.set(chatId, queued)
  await previous
  try {
    return await action()
  } finally {
    release()
    if (stateMutationQueues.get(chatId) === queued) stateMutationQueues.delete(chatId)
  }
}

function scheduleStateBroadcast(userId?: string, chatId?: string, delayMs = 16): void {
  const scope = `${userId || '__default__'}:${chatId || '__none__'}`
  if (scheduledStateBroadcasts.has(scope)) return
  const timer = setTimeout(() => {
    scheduledStateBroadcasts.delete(scope)
    void sendState(userId, chatId).catch(error => {
      spindle.log.warn(`[Reverie Relay] Deferred state broadcast failed: ${error instanceof Error ? error.message : String(error)}`)
    })
  }, Math.max(0, delayMs))
  scheduledStateBroadcasts.set(scope, timer)
}

async function sendState(userId?: string, chatId?: string): Promise<void> {
  const config = await getConfig(userId)
  let state = chatId ? await getState(chatId, userId) : emptyState()
  state.continuityVault.strength = config.vaultStrength
  if (chatId && Date.now() - state.lastReconciledAt > 5000) {
    await reconcileChatState(chatId, userId)
    state = await getState(chatId, userId)
  }
  if (chatId) cacheRenderSnapshot(chatId, userId, state, config)
  if (chatId) await syncEnabledSurfaceMacro(chatId, state, config, userId).catch(error => {
    spindle.log.warn(`[Reverie Relay] Resolved-macro sync failed: ${error instanceof Error ? error.message : String(error)}`)
  })
  const records = Object.values(state.slots).sort((a, b) => b.updatedAt - a.updatedAt)
  const globalAssets = await hostOwnedRelayAssetLibrary(state.assetLibrary, userId)
  const message: BackendStateMessage = {
    type: 'state',
    chatId: chatId ?? null,
    records,
    config,
    parserConnections: await getParserConnections(userId),
    imageConnections: await getImageConnections(userId),
    imageProviders: await getImageProviders(userId),
    logs: [...state.logs].sort((a, b) => b.timestamp - a.timestamp),
    candidateBatches: Object.values(state.candidateBatches || {}).sort((a, b) => b.updatedAt - a.updatedAt),
    queueDirector: state.queueDirector,
    assetLibrary: globalAssets,
    versionTrees: Object.values(state.versionTrees || {}).sort((a, b) => b.updatedAt - a.updatedAt),
    continuityVault: state.continuityVault,
    customSurfaces: state.customSurfaces,
    proseIllustrator: state.proseIllustrator,
    backgroundQueue: state.backgroundQueue,
    galleryLinks: Object.values(state.galleryLinks).sort((a, b) => b.updatedAt - a.updatedAt),
    lastDryRun: state.lastDryRun,
    lastGenerationBlockers: state.lastGenerationBlockers,
    schemaVersion: state.schemaVersion,
    revision: state.revision,
    build: backendBuildInfo(),
  }
  lastBackendResponseAt = Date.now()
  spindle.sendToFrontend(message, userId)
}

async function hostOwnedRelayAssetLibrary(local: AssetLibraryState, userId?: string): Promise<AssetLibraryState> {
  const api = spindle.images as typeof spindle.images & { list?: (options?: Record<string, unknown>) => Promise<any[]> }
  if (typeof api.list !== 'function') return local
  try {
    const rows = await api.list({ onlyOwned: true, userId })
    const assets = { ...local.assets }
    for (const row of Array.isArray(rows) ? rows : []) {
      const metadata = cleanParameters(row?.metadata)
      const origin = firstString(metadata.origin, metadata.source, row?.origin)
      if (!/reverie|relay/i.test(origin) && cleanString(metadata.extensionIdentifier) !== EXTENSION_ID) continue
      const imageId = firstString(row?.id, row?.imageId, metadata.imageId)
      const imageUrl = firstString(row?.url, row?.imageUrl, metadata.imageUrl)
      if (!imageId || !imageUrl) continue
      const assetId = firstString(metadata.assetId, `host:${imageId}`)
      if (assets[assetId]) continue
      const createdAt = Number(row?.createdAt || metadata.createdAt) || Date.now()
      assets[assetId] = {
        assetId, imageId, imageUrl, status: 'available', favorite: false, visualReference: false,
        tags: stringList(metadata.tags), caption: cleanString(metadata.caption), alt: cleanString(metadata.alt),
        characterNames: stringList(metadata.characterNames), locationNames: stringList(metadata.locationNames),
        target: firstString(metadata.target, 'custom.artifact-media') as ImageTarget,
        targetApp: firstString(metadata.targetApp, 'custom') as VisualAssetReference['targetApp'],
        chatId: cleanString(metadata.chatId), messageId: cleanString(metadata.messageId), swipeId: Number(metadata.swipeId) || 0,
        requestId: cleanString(metadata.requestId), slot: cleanString(metadata.slot), source: 'history',
        createdAt, updatedAt: Number(row?.updatedAt || metadata.updatedAt) || createdAt,
        originalSceneBrief: cleanString(metadata.originalSceneBrief), resolvedPositivePrompt: cleanString(metadata.resolvedPositivePrompt),
        resolvedNegativePrompt: cleanString(metadata.resolvedNegativePrompt), metadata: { ...metadata, hostCatalog: true },
      }
    }
    return { ...local, assets, updatedAt: Math.max(local.updatedAt, Date.now()) }
  } catch (error) {
    spindle.log.warn(`[Reverie Relay:host_catalog] ${error instanceof Error ? error.message : String(error)}`)
    return local
  }
}

type TimedListCache<T> = { value: T[]; cachedAt: number; inFlight?: Promise<T[]> }
const CONNECTION_LIST_CACHE_TTL_MS = 2_000
const parserConnectionListCache = new Map<string, TimedListCache<ParserConnection>>()
const imageConnectionListCache = new Map<string, TimedListCache<ImageConnection>>()
const imageProviderListCache = new Map<string, TimedListCache<ImageProviderInfo>>()

async function cachedList<T>(cache: Map<string, TimedListCache<T>>, userId: string | undefined, loader: () => Promise<T[]>): Promise<T[]> {
  const key = userConfigCacheKey(userId)
  const current = cache.get(key)
  if (current && Date.now() - current.cachedAt < CONNECTION_LIST_CACHE_TTL_MS) return current.value
  if (current?.inFlight) return current.inFlight
  const inFlight = loader().then(value => {
    cache.set(key, { value, cachedAt: Date.now() })
    return value
  }).catch(error => {
    if (current) cache.set(key, { value: current.value, cachedAt: current.cachedAt })
    throw error
  })
  cache.set(key, { value: current?.value || [], cachedAt: current?.cachedAt || 0, inFlight })
  return inFlight
}

async function getParserConnections(userId?: string): Promise<ParserConnection[]> {
  try {
    return await cachedList(parserConnectionListCache, userId, async () => (await spindle.connections.list(userId)).map((connection: any) => ({
      id: connection.id,
      name: connection.name,
      provider: connection.provider,
      model: connection.model,
    })))
  } catch (error) {
    spindle.log.warn(`[Reverie Relay:connections] ${error instanceof Error ? error.message : String(error)}`)
    return []
  }
}

async function getImageConnections(userId?: string): Promise<ImageConnection[]> {
  try {
    return await cachedList(imageConnectionListCache, userId, () => spindle.imageGen.listConnections(userId) as Promise<ImageConnection[]>)
  } catch (error) {
    spindle.log.warn(`[ReverieRelay:image_connections] ${error instanceof Error ? error.message : String(error)}`)
    return []
  }
}

async function getImageProviders(userId?: string): Promise<ImageProviderInfo[]> {
  try {
    const api = spindle.imageGen as typeof spindle.imageGen & { getProviders?: (userId?: string) => Promise<ImageProviderInfo[]> }
    if (!api.getProviders) return []
    return await cachedList(imageProviderListCache, userId, () => api.getProviders!(userId))
  } catch (error) {
    spindle.log.warn(`[ReverieRelay:image_providers] ${error instanceof Error ? error.message : String(error)}`)
    return []
  }
}

export function extractProviderLoraCatalog(...sources: unknown[]): string[] {
  const found = new Set<string>()
  const add = (value: unknown) => {
    const text = cleanString(value)
    // Native catalogs contain actual asset identifiers. Schema vocabulary such as
    // "loras", "models", option labels, and prose descriptions is never an asset.
    if (!text || !/(?:\.safetensors|\.ckpt|(?:^|[\\/])loras?[\\/])/i.test(text)) return
    found.add(text)
  }
  const visitAssetList = (value: unknown): void => {
    if (!Array.isArray(value)) return
    for (const item of value) {
      if (typeof item === 'string') add(item)
      else if (item && typeof item === 'object') {
        const row = item as Record<string, unknown>
        add(firstString(row.path, row.filename, row.fileName, row.assetPath, row.id, row.name, row.value))
      }
    }
  }
  for (const source of sources) {
    if (!source || typeof source !== 'object') continue
    const row = source as Record<string, unknown>
    visitAssetList(row.availableLoras)
    visitAssetList(row.loraCatalog)
    visitAssetList(row.loraAssets)
    visitAssetList(row.installedLoras)
    visitAssetList(row.models)
    visitAssetList(row.options)
    visitAssetList((row.modelAssets as Record<string, unknown> | undefined)?.loras)
    for (const preset of Array.isArray(row.loraPresets) ? row.loraPresets : []) {
      if (!preset || typeof preset !== 'object') continue
      visitAssetList((preset as Record<string, unknown>).loras)
    }
  }
  return [...found].sort((left, right) => left.localeCompare(right))
}

function parseCorsJsonResponse(response: unknown, operation: string): Record<string, unknown> {
  const row = response && typeof response === 'object' ? response as Record<string, unknown> : {}
  const status = Number(row.status)
  if (Number.isFinite(status) && (status < 200 || status >= 300)) throw new Error(`${operation} failed (${status}).`)
  const body = typeof row.body === 'string' ? row.body : row.body
  let parsed: unknown = body
  if (typeof body === 'string') {
    try { parsed = JSON.parse(body) } catch { throw new Error(`${operation} returned invalid JSON.`) }
  }
  const data = parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : {}
  if (cleanString(data.error)) throw new Error(cleanString(data.error))
  return data
}

async function withLoraDiscoveryTimeout<T>(operation: string, task: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      task,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${operation} timed out after 15 seconds.`)), 15_000)
      }),
    ])
  } finally {
    if (timer) clearTimeout(timer)
  }
}

async function discoverSwarmLoraCatalog(connection: ImageConnection): Promise<string[]> {
  if (connection.provider !== 'swarmui') return []
  if (!spindle.permissions.has('cors_proxy')) throw new Error('Grant Relay the CORS Proxy permission to browse the SwarmUI LoRA catalog.')
  const base = cleanString(connection.api_url).replace(/\/+$/, '') || 'http://localhost:7801'
  let parsed: URL
  try { parsed = new URL(base) } catch { throw new Error('The selected SwarmUI connection has an invalid API URL.') }
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('SwarmUI LoRA discovery requires an HTTP or HTTPS API URL.')
  const headers = { Accept: 'application/json', 'Content-Type': 'application/json' }
  const sessionResponse = await withLoraDiscoveryTimeout('SwarmUI session request', spindle.cors(`${base}/API/GetNewSession`, { method: 'POST', headers, body: '{}' }))
  const session = cleanString(parseCorsJsonResponse(sessionResponse, 'SwarmUI session request').session_id)
  if (!session) throw new Error('SwarmUI returned no metadata session. Authenticated servers may require a metadata token.')
  const catalogResponse = await withLoraDiscoveryTimeout('SwarmUI LoRA catalog', spindle.cors(`${base}/API/ListModels`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ session_id: session, path: '', depth: 10, subtype: 'LoRA', sortBy: 'Name', allowRemote: true, sortReverse: false, dataImages: false }),
  }))
  const files = parseCorsJsonResponse(catalogResponse, 'SwarmUI LoRA catalog').files
  return extractProviderLoraCatalog({ models: Array.isArray(files) ? files : [] })
}

async function discoverProviderLoraCatalog(requestId: string, requestedConnectionId: string | null | undefined, userId?: string): Promise<void> {
  try {
    const connections = await getImageConnections(userId)
    const selectedId = cleanString(requestedConnectionId) || connections.find(connection => connection.is_default)?.id || connections[0]?.id || ''
    if (!selectedId) throw new Error('Select an ImageGen connection before browsing LoRAs.')
    const connection = await spindle.imageGen.getConnection(selectedId, userId) as ImageConnection | null
    if (!connection) throw new Error('The selected ImageGen connection is unavailable.')
    const config = await getConfig(userId)
    const providers = await getImageProviders(userId)
    const provider = providers.find(item => item.id === connection.provider)
    let items = extractProviderLoraCatalog(
      config.nativeImageSettingsSnapshot,
      connection.metadata,
      connection.default_parameters,
      provider?.capabilities?.parameters,
    )
    if (!items.length && connection.provider === 'swarmui') items = await discoverSwarmLoraCatalog(connection)
    spindle.sendToFrontend({ type: 'lora_catalog_result', requestId, connectionId: selectedId, status: 'completed', items }, userId)
  } catch (error) {
    spindle.sendToFrontend({ type: 'lora_catalog_result', requestId, connectionId: cleanString(requestedConnectionId), status: 'failed', items: [], error: error instanceof Error ? error.message : String(error) }, userId)
  }
}

async function getRecordByKey(key: string, userId?: string): Promise<{ chatId: string; state: StateFile; record: SlotRecord }> {
  const chatId = key.split(':')[0]
  const state = await getState(chatId, userId)
  const record = state.slots[key]
  if (!record) throw new Error('Slot not found.')
  return { chatId, state, record }
}

async function resolveMessage(chatId: string, messageId?: string): Promise<ChatMessage | null> {
  const messages = await spindle.chat.getMessages(chatId) as ChatMessage[]
  if (messageId) {
    const eventSnapshot = latestMessageSnapshots.get(messageSnapshotKey(chatId, messageId))
    return eventSnapshot ? cloneMessageSnapshot(eventSnapshot) : messages.find(message => message.id === messageId) ?? null
  }
  return [...messages].reverse().find(message => isAssistantMessage(message) && !isOwnMessage(message)) ?? null
}

function messageSnapshotKey(chatId: string, messageId: string): string {
  return `${chatId}:${messageId}`
}

function cloneMessageSnapshot(message: ChatMessage): ChatMessage {
  return {
    ...message,
    swipes: Array.isArray(message.swipes) ? [...message.swipes] : undefined,
    swipe_dates: Array.isArray(message.swipe_dates) ? [...message.swipe_dates] : undefined,
    metadata: message.metadata ? { ...message.metadata } : undefined,
    extra: message.extra ? { ...message.extra } : undefined,
  }
}

function rememberMessageSnapshot(chatId: string, message: ChatMessage): void {
  rememberBoundedMap(latestMessageSnapshots, messageSnapshotKey(chatId, message.id), cloneMessageSnapshot(message), C5B_CACHE_LIMITS.messageSnapshots)
}

function isAssistantMessage(message: ChatMessage): boolean {
  return message.role === 'assistant' || message.is_user === false
}

function getSwipeContent(message: ChatMessage, swipeId: number): string {
  if (Array.isArray(message.swipes) && message.swipes[swipeId] !== undefined) return message.swipes[swipeId]
  return message.content
}

async function patchSwipeContent(chatId: string, message: ChatMessage, swipeId: number, content: string): Promise<void> {
  const mutationKey = `${chatId}:${message.id}`
  extensionMessageMutations.add(mutationKey)
  try {
    if (Array.isArray(message.swipes) && message.swipes.length > swipeId) {
      const swipes = [...message.swipes]
      swipes[swipeId] = content
      const patch: Record<string, unknown> = {
        swipes,
        metadata: {
          ...(message.metadata || {}),
          dreamglassImageRouterUpdatedAt: new Date().toISOString(),
        },
      }
      if (Array.isArray(message.swipe_dates) && message.swipe_dates.length === swipes.length) patch.swipe_dates = message.swipe_dates
      await spindle.chat.updateMessage(chatId, message.id, patch)
      rememberMessageSnapshot(chatId, { ...message, ...patch } as ChatMessage)
    } else {
      const patch = {
        content,
        metadata: {
          ...(message.metadata || {}),
          dreamglassImageRouterUpdatedAt: new Date().toISOString(),
        },
      }
      await spindle.chat.updateMessage(chatId, message.id, patch)
      rememberMessageSnapshot(chatId, { ...message, ...patch })
    }
  } finally {
    setTimeout(() => extensionMessageMutations.delete(mutationKey), 250)
  }
}

function applyGeneration(state: StateFile, record: SlotRecord, result: SlotGenerationResult, now: number): void {
  const snapshot = snapshotFromRecord(record, now)
  if (snapshot) record.history.unshift(snapshot)

  record.status = 'completed'
  record.pendingPlacement = undefined
  record.previewPending = false
  record.placementFailure = undefined
  record.error = undefined
  record.errorToastKey = undefined
  record.imageId = result.imageId
  record.imageUrl = result.imageUrl
  record.imageWidth = result.imageWidth
  record.imageHeight = result.imageHeight
  record.aspectRatio = result.aspectRatio
  record.resolvedPositivePrompt = result.resolvedPositivePrompt
  record.resolvedNegativePrompt = result.resolvedNegativePrompt
  record.promptMode = result.promptMode
  record.promptPresetId = result.promptPresetId
  record.parserUsed = result.parserUsed
  record.parserOutput = result.parserOutput
  record.parserConnectionId = result.parserConnectionId
  record.parserModel = result.parserModel
  record.parserParameters = result.parserParameters
  record.promptPipeline = result.promptPipeline
  record.imageConnectionId = result.imageConnectionId
  record.imageConnectionName = result.imageConnectionName
  record.imageProvider = result.imageProvider
  record.imageModel = result.imageModel
  record.imageParameters = result.imageParameters
  record.nativeImageSettings = result.nativeImageSettings
  record.nativeSettingsCapturedAt = result.nativeSettingsCapturedAt
  record.connectionDefaultParameters = result.connectionDefaultParameters
  record.slotOverrides = result.slotOverrides
  record.finalImageParameters = result.finalImageParameters
  record.finalImageRequest = result.finalImageRequest
  record.finalImageSettingsSource = result.finalImageSettingsSource
  record.nativeActiveLoraPreset = result.nativeActiveLoraPreset
  record.effectiveAppliedLoraPreset = result.effectiveAppliedLoraPreset
  record.lorasSentToProvider = result.lorasSentToProvider
  record.loraBaseTags = result.loraBaseTags
  record.baseTagsAddedToPrompt = result.baseTagsAddedToPrompt
  record.omittedBaseTags = result.omittedBaseTags
  record.highResMode = result.highResMode
  record.highResRetainedBaseTags = result.highResRetainedBaseTags
  record.highResPreservedFramingCues = result.highResPreservedFramingCues
  record.loraOmittedFields = result.loraOmittedFields
  record.promptProfile = result.promptProfile
  record.selectedPromptProfileId = result.promptProfile?.selectedProfileId
  record.regenerationIntent = result.regenerationIntent
  record.diagnostic = result.diagnostic
  record.includedContinuityFacts = result.includedContinuityFacts
  record.excludedContinuityFacts = result.excludedContinuityFacts
  record.continuityStrength = result.continuityStrength
  record.attemptNumber = result.attemptNumber
  record.triggerType = result.triggerType
  record.updatedAt = now
  record.completedAt = now
  if (record.recoveryCompleteness === 'marker-only') {
    record.recoveryCompleteness = 'partial'
    record.missingRecoveryFields = ['originalSceneBrief', 'originalRequestXml'].filter(field => field === 'originalSceneBrief' ? !record.originalSceneBrief : !record.originalRequestXml)
  }
  commitSlotAssetVersion(state, record, result, snapshot, now)
  finishAttempt(record, 'completed', now)
}

function snapshotFromRecord(record: SlotRecord, now: number): GenerationSnapshot | null {
  if (!record.imageUrl) return null
  return {
    imageId: record.imageId || '',
    imageUrl: record.imageUrl,
    imageWidth: record.imageWidth,
    imageHeight: record.imageHeight,
    aspectRatio: record.aspectRatio,
    resolvedPositivePrompt: record.resolvedPositivePrompt || '',
    resolvedNegativePrompt: record.resolvedNegativePrompt || '',
    promptMode: record.promptMode || '',
    promptPresetId: record.promptPresetId ?? null,
    parserUsed: record.parserUsed,
    parserOutput: record.parserOutput,
    parserConnectionId: record.parserConnectionId ?? null,
    parserModel: record.parserModel,
    parserParameters: record.parserParameters,
    promptPipeline: record.promptPipeline,
    imageConnectionId: record.imageConnectionId ?? null,
    imageConnectionName: record.imageConnectionName,
    imageProvider: record.imageProvider,
    imageModel: record.imageModel,
    imageParameters: record.imageParameters,
    nativeImageSettings: record.nativeImageSettings,
    nativeSettingsCapturedAt: record.nativeSettingsCapturedAt,
    connectionDefaultParameters: record.connectionDefaultParameters,
    slotOverrides: record.slotOverrides,
    finalImageParameters: record.finalImageParameters,
    finalImageRequest: record.finalImageRequest,
    finalImageSettingsSource: record.finalImageSettingsSource,
    nativeActiveLoraPreset: record.nativeActiveLoraPreset,
    effectiveAppliedLoraPreset: record.effectiveAppliedLoraPreset,
    lorasSentToProvider: record.lorasSentToProvider,
    loraBaseTags: record.loraBaseTags,
    baseTagsAddedToPrompt: record.baseTagsAddedToPrompt,
    omittedBaseTags: record.omittedBaseTags,
    highResMode: record.highResMode,
    highResRetainedBaseTags: record.highResRetainedBaseTags,
    highResPreservedFramingCues: record.highResPreservedFramingCues,
    loraOmittedFields: record.loraOmittedFields,
    promptProfile: record.promptProfile,
    regenerationIntent: record.regenerationIntent,
    diagnostic: record.diagnostic,
    includedContinuityFacts: record.includedContinuityFacts,
    excludedContinuityFacts: record.excludedContinuityFacts,
    continuityStrength: record.continuityStrength,
    assetId: record.assetId,
    versionId: record.currentVersionId,
    rootVersionId: record.rootVersionId,
    attemptNumber: record.attemptNumber,
    triggerType: record.triggerType,
    generatedAt: record.updatedAt || now,
  }
}

function markJobStatus(state: StateFile, job: RouterJob, status: SlotRecord['status'], triggerType?: JobTrigger): void {
  const now = Date.now()
  for (const slot of job.slots) {
    const record = state.slots[slotKey({ ...job, slot })]
    if (!record || record.status === 'completed' && status === 'queued') continue
    if (status === 'parsing') {
      record.attemptNumber = (record.attemptNumber || 0) + 1
      record.error = undefined
      record.errorToastKey = undefined
      record.triggerType = triggerType
      record.lastAttemptAt = now
      record.parsingStartedAt = now
      if (triggerType === 'retry') record.lastRetriedAt = now
      if (triggerType === 'reparse') record.lastReparsedAt = now
      if (triggerType === 'regenerate-same-settings' || triggerType === 'regenerate-current-settings' || triggerType === 'intent-regeneration') record.lastRegeneratedAt = now
      if (triggerType === 'edited-prompt') record.lastEditedAt = now
      record.attempts ||= []
      record.attempts.push({
        attemptNumber: record.attemptNumber,
        triggerType: triggerType || 'initial',
        startedAt: now,
        parsingStartedAt: now,
        stage: 'parser',
        error: null,
      })
    }
    record.status = status
    record.updatedAt = now
  }
}

function markSlotStatus(record: SlotRecord, status: SlotRecord['status']): void {
  record.status = status
  const now = Date.now()
  record.updatedAt = now
  if (status === 'generating') {
    record.generationStartedAt = now
    const attempt = currentAttempt(record)
    if (attempt) {
      attempt.generationStartedAt = now
      attempt.stage = 'image-generation'
    }
  }
}

function currentAttempt(record: SlotRecord): AttemptHistoryEntry | undefined {
  return record.attempts?.[record.attempts.length - 1]
}

function finishAttempt(record: SlotRecord, stage: 'placement-pending' | 'placement-repair-needed' | 'completed' | 'failed' | 'cancelled', now: number, error?: string): void {
  const attempt = currentAttempt(record)
  if (!attempt) return
  attempt.stage = stage
  attempt.error = error || null
  if (stage === 'completed') attempt.completedAt = now
  if (stage === 'failed') attempt.failedAt = now
  if (stage === 'cancelled') attempt.cancelledAt = now
  attempt.durationMs = Math.max(0, now - attempt.startedAt)
}

function resolvedPromptFromRecord(record: SlotRecord, config: RouterConfig): PreparedPrompt {
  if (!record.resolvedPositivePrompt) throw new Error('No stored resolved prompt.')
  return {
    prompt: record.resolvedPositivePrompt,
    negativePrompt: record.resolvedNegativePrompt || '',
    promptMode: record.promptMode || 'stored',
    promptPresetId: record.promptPresetId ?? config.nativePromptPresetId,
    parserUsed: false,
    parserOutput: record.parserOutput || '',
    parserConnectionId: record.parserConnectionId ?? config.parserConnectionId,
    parserModel: record.parserModel ?? effectiveParserModel(config),
    parserParameters: record.parserParameters ?? config.parserParameters,
    promptPipeline: record.promptPipeline || emptyPromptPipeline(record),
  }
}

function stampImagePlan(record: SlotRecord, plan: ImagePlan): void {
  record.imageConnectionId = plan.connectionId
  record.imageConnectionName = plan.connectionName
  record.imageProvider = plan.provider
  record.imageModel = plan.model
  record.imageParameters = plan.finalParameters
  record.nativeImageSettings = plan.nativeImageSettings
  record.nativeSettingsCapturedAt = plan.nativeSettingsCapturedAt
  record.connectionDefaultParameters = plan.connectionDefaultParameters
  record.slotOverrides = plan.slotOverrides
  record.finalImageParameters = plan.finalParameters
  record.finalImageSettingsSource = plan.settingsSource
  record.nativeActiveLoraPreset = plan.nativeActiveLoraPreset
  record.effectiveAppliedLoraPreset = plan.effectiveAppliedLoraPreset
  record.lorasSentToProvider = plan.lorasSentToProvider
  record.loraBaseTags = plan.loraBaseTags
  record.baseTagsAddedToPrompt = plan.effectiveBaseTags
  record.omittedBaseTags = plan.omittedBaseTags
  record.highResMode = plan.highResMode
  record.highResRetainedBaseTags = plan.highResRetainedBaseTags
  record.highResPreservedFramingCues = plan.highResPreservedFramingCues
  record.loraOmittedFields = plan.loraOmittedFields
  record.updatedAt = Date.now()
}

async function sendSlotErrors(job: RouterJob, message: string, userId?: string): Promise<void> {
  const state = await getState(job.chatId, userId)
  const first = state.slots[slotKey({ ...job, slot: job.slots[0] })]
  spindle.sendToFrontend({
    type: 'error', source: 'job_failed', key: first?.key, attemptNumber: first?.attemptNumber || 0,
    message: job.slots.length > 1 ? `${job.slots.length} image slots failed during generation. Open Reverie Relay Logs for details.` : message,
  }, userId)
}

function logSlotSummary(config: RouterConfig, state: StateFile, chatId: string): void {
  const groups = Object.values(state.slots)
    .map(record => ({
      messageId: record.messageId,
      swipeId: record.swipeId,
      requestId: record.requestId,
      slot: record.slot,
      status: record.status,
      target: record.target,
    }))
    .sort((a, b) => `${a.messageId}:${a.swipeId}:${a.requestId}:${a.slot}`.localeCompare(`${b.messageId}:${b.swipeId}:${b.requestId}:${b.slot}`))
  logStage(config, 'slot_summary', {
    chatId,
    totalSlots: groups.length,
    groups: groups.slice(0, 80),
    truncated: groups.length > 80,
  })
}

function isProcessing(record: SlotRecord): boolean {
  return isSlotLifecycleActive(record.status)
}

function canReparseRecord(record: SlotRecord): boolean {
  return Boolean(record.originalSceneBrief.trim() && record.originalRequestXml.trim())
}

function canRegenerateRecord(record: SlotRecord): boolean {
  return Boolean(record.resolvedPositivePrompt?.trim())
}

function jobFromRecord(record: SlotRecord): RouterJob {
  return {
    chatId: record.chatId,
    messageId: record.messageId,
    swipeId: record.swipeId,
    requestId: record.requestId,
    target: record.target,
    intent: normalizeImageIntent(record.imageIntent),
    count: record.count,
    slots: [record.slot],
    alt: record.alt,
    caption: record.caption,
    time: record.time,
    aspect: record.requestAspect,
    originalSceneBrief: record.originalSceneBrief,
    originalNegativePrompt: record.originalNegativePrompt,
    originalRequestXml: record.originalRequestXml,
    cast: record.cast,
    promptSource: record.promptSource,
    promptProfileId: record.temporaryPromptProfileId || record.selectedPromptProfileId,
    regenerationIntent: record.regenerationIntent,
    composedPositivePrompt: record.composedPositivePrompt,
    composedNegativePrompt: record.composedNegativePrompt,
    prosePromptComposition: record.prosePromptComposition,
    proseIllustrationId: record.proseIllustrationId,
    prosePlanId: record.prosePlanId,
    proseAnchor: record.proseAnchor,
    synthetic: record.proseSynthetic,
  }
}

function groupFailedRetryJobs(records: SlotRecord[]): RouterJob[] {
  const grouped = new Map<string, SlotRecord[]>()
  for (const record of records) {
    const key = record.target === 'instagram.carousel'
      ? `${record.chatId}:${record.messageId}:${record.swipeId}:${record.requestId}`
      : record.key
    const list = grouped.get(key) || []
    list.push(record)
    grouped.set(key, list)
  }

  return Array.from(grouped.values()).map(list => {
    const first = list[0]
    if (first.target !== 'instagram.carousel') return jobFromRecord(first)
    const count = Math.max(first.count || list.length, list.length, 1)
    return {
      ...jobFromRecord(first),
      count,
      slots: Array.from({ length: count }, (_value, index) => `slide-${index + 1}`),
    }
  })
}

function retryJobHasCurrentImage(state: StateFile, job: RouterJob): boolean {
  return job.slots.some(slot => Boolean(state.slots[slotKey({ ...job, slot })]?.imageUrl))
}

async function validateRetryJobsBeforeAttempt(jobs: RouterJob[], state: StateFile, config: RouterConfig, userId?: string): Promise<string | null> {
  const seen = new Set<string>()
  for (const job of jobs) {
    const record = state.slots[slotKey({ ...job, slot: job.slots[0] })]
    if (!record) continue
    try {
      const plan = await prepareImagePlan(config, job, record, undefined, userId, record.highResMode ?? config.highResMode)
      const planKey = `${plan.connectionId || ''}:${plan.provider}:${plan.model}:${JSON.stringify(plan.finalParameters.workflow ?? null)}`
      if (seen.has(planKey)) continue
      seen.add(planKey)
      validateImagePlan(plan)
    } catch (error) {
      return error instanceof Error ? error.message : String(error)
    }
  }
  return null
}

async function readPersonaContext(userId?: string): Promise<string> {
  try {
    const persona = await readCurrentHostPersona(userId)
    return compactObject([
      named('Name', persona?.name),
      named('Description', persona?.description),
      named('Personality', persona?.personality),
      named('Scenario', persona?.scenario),
    ])
  } catch {
    return ''
  }
}

async function ensureCanonicalSubjectsForGeneration(chatId: string, visualSubjects: VisualSubjectPrompt[], userId?: string): Promise<void> {
  const [chatCharacter, chatPersona] = await Promise.all([
    readChatCharacterIdentity(chatId, userId), readActivePersonaIdentity(userId, chatId),
  ])
  if (!chatCharacter && !chatPersona && !visualSubjects.length) return
  await mutateState(chatId, userId, state => {
    if (chatCharacter) {
      try {
        registerCanonicalCharacter(state.continuityVault, {
          name: chatCharacter.name,
          canonicalCharacterId: chatCharacter.id,
          lumiverseCharacterId: chatCharacter.id,
          aliases: chatCharacter.aliases,
          avatarUrl: chatCharacter.avatarUrl,
          sourceType: 'character-card',
          userConfirmed: true,
        })
      } catch {
        // Invalid card names remain unresolved rather than contaminating Appearance Memory.
      }
    }
    if (chatPersona) registerCanonicalCharacter(state.continuityVault, {
      name: chatPersona.name, canonicalCharacterId: chatPersona.id,
      lumiversePersonaId: chatPersona.id,
      aliases: chatPersona.aliases, sourceType: 'persona-card', userConfirmed: true,
    })
    for (const subject of visualSubjects) {
      try {
        registerCanonicalCharacter(state.continuityVault, {
          name: subject.name,
          canonicalCharacterId: subject.id,
          sourceType: 'native-visual-preset',
        })
      } catch {
        // Invalid preset labels remain prompt metadata only.
      }
    }
  })
}

/**
 * Legacy import/compatibility helper only. Live Native preset and Appearance
 * Sidecar paths never call this to decide what is a wardrobe fact.
 */
export function sanitizeCurrentOutfitMemory(scenePrompt: string, candidateOutfit: string, previousOutfit = ''): string {
  const scene = cleanString(scenePrompt)
  const transient = /\b(?:nude|naked|topless|bottomless|undress(?:ed|ing)?|shirt\s+(?:is\s+)?lifted|skirt\s+(?:is\s+)?lifted|wet\s+clothes?|soaked\s+(?:clothes?|outfit)|torn\s+clothes?|ripped\s+clothes?|clothes?\s+removed|removed\s+(?:their|his|her)?\s*(?:clothes?|outfit))\b/i
  const explicitClear = /\b(?:changed\s+(?:clothes|outfits?)|changed\s+into|wardrobe\s+cleared|no\s+longer\s+wearing|discarded\s+(?:their|his|her)?\s*(?:clothes?|outfit))\b/i
  if (explicitClear.test(scene)) return ''
  const stableCandidate = normalizeTagList(cleanString(candidateOutfit)
    .split(/[,;\n]+/)
    .map(cleanString)
    .filter(value => value && !transient.test(value))
    .join(', '))
  return stableCandidate || previousOutfit
}

async function readChatCharacterIdentity(chatId: string, userId?: string): Promise<{ id: string; name: string; aliases: string[]; avatarUrl?: string } | null> {
  if (!spindle.permissions.has('chats') || !spindle.permissions.has('characters')) return null
  try {
    const id = await ownerCharacterIdForChat(chatId, userId)
    if (!id) return null
    const character = await spindle.characters.get(id, userId) as any
    const name = cleanString(character?.name)
    if (!name || !isValidCanonicalCharacterName(name)) return null
    const aliases = [
      ...(Array.isArray(character?.aliases) ? character.aliases : []),
      ...(Array.isArray(character?.alternate_names) ? character.alternate_names : []),
      character?.nickname,
    ].map(cleanString).filter(Boolean)
    const avatarUrl = cleanString(character?.avatar_url || character?.avatarUrl || character?.image_url || character?.imageUrl || character?.avatar?.url)
    return { id, name, aliases: [...new Set(aliases)], avatarUrl: avatarUrl || undefined }
  } catch {
    return null
  }
}

async function readCharacterContext(chatId: string, userId?: string, query = '', tier: 'routine' | 'expanded' | 'diagnostic' = 'routine'): Promise<string> {
  if (!spindle.permissions.has('chats') || !spindle.permissions.has('characters')) return ''
  try {
    const characterId = await ownerCharacterIdForChat(chatId, userId)
    if (!characterId) return ''
    const character = await spindle.characters.get(String(characterId), userId) as any
    return visualSourceSnapshot(`character:${characterId}`, character, query, tier, tier === 'diagnostic').text
  } catch {
    return ''
  }
}

/**
 * Confirmed against the bundled current Lumiverse Spindle declarations:
 * spindle.personas.getActive(userId?) returns the current PersonaDTO or null.
 * Persona access intentionally stays separate from the chat-character path.
 */
async function resolveHostPersonaBinding(userId?: string, chatId?: string): Promise<{ persona: any | null; context: PersonaPovContext }> {
  const unavailable: PersonaPovContext = { available: false, binding: 'unavailable' }
  if (!spindle.permissions.has('personas')) return { persona: null, context: unavailable }

  // Lumiverse persists the conversation's selection separately from the
  // global active Persona. Read that exact binding before the global fallback.
  if (chatId && spindle.permissions.has('chats') && typeof spindle.personas?.get === 'function') {
    try {
      const chat = await spindle.chats.get(chatId, userId)
      const personaId = cleanString(chat?.metadata?.active_persona_id)
      if (personaId) {
        const persona = await spindle.personas.get(personaId, userId)
        if (persona) {
          const personaRecord = persona as any
          return {
            persona,
            context: { available: true, personaId: cleanString(personaRecord.id || personaRecord.persona_id || personaRecord.personaId) || personaId, personaName: cleanString(personaRecord.name), binding: 'chat-persona' },
          }
        }
      }
    } catch {
      // A failed chat-bound lookup may still use the confirmed global host fallback.
    }
  }

  try {
    const persona = typeof spindle.personas?.getActive === 'function' ? await spindle.personas.getActive(userId) : null
    if (!persona) return { persona: null, context: unavailable }
    const personaRecord = persona as any
    return {
      persona,
      context: { available: true, personaId: cleanString(personaRecord.id || personaRecord.persona_id || personaRecord.personaId) || undefined, personaName: cleanString(personaRecord.name) || undefined, binding: 'active-persona' },
    }
  } catch {
    return { persona: null, context: unavailable }
  }
}

export async function resolvePersonaPovContext(chatId: string, userId?: string): Promise<PersonaPovContext> {
  return (await resolveHostPersonaBinding(userId, chatId)).context
}

async function readCurrentHostPersona(userId?: string, chatId?: string): Promise<any | null> {
  return (await resolveHostPersonaBinding(userId, chatId)).persona
}

async function readActivePersonaContext(userId?: string, query = '', tier: 'routine' | 'expanded' | 'diagnostic' = 'routine', chatId?: string): Promise<string> {
  try {
    const persona = await readCurrentHostPersona(userId, chatId)
    return visualSourceSnapshot(`persona:${persona?.id || userId || 'active'}`, persona, query, tier, tier === 'diagnostic').text
  } catch {
    return ''
  }
}

async function ownerCharacterIdForChat(chatId: string, userId?: string): Promise<string> {
  if (!spindle.permissions.has('chats')) return ''
  try {
    const chat = await spindle.chats.get(chatId, userId) as any
    return cleanString(chat?.character_id)
      || cleanString(chat?.characterId)
      || cleanString(chat?.character?.id)
      || cleanString(chat?.character?.character_id)
      || cleanString(chat?.character?.characterId)
      || cleanString(chat?.metadata?.character_id)
      || cleanString(chat?.metadata?.characterId)
      || cleanString(chat?.chat?.character_id)
      || cleanString(chat?.chat?.characterId)
  } catch {
    return ''
  }
}

async function readLorebookSources(chatId: string, userId?: string): Promise<unknown[]> {
  if (!spindle.permissions.has('world_books')) return []
  try {
    const entries = await spindle.world_books.getActivated(chatId, userId) as any[]
    return Promise.all(entries.map(async entry => {
      if (entry.content) return entry
      try { const full = await spindle.world_books.entries.get(entry.id, userId); return { ...entry, ...full } } catch { return entry }
    }))
  } catch {
    return []
  }
}
const lorebookContextMetrics = new Map<string, Partial<ContextMetrics>>()
async function readLorebookContext(chatId: string, userId?: string, query = ''): Promise<string> {
  const selected = selectLorebookContext(await readLorebookSources(chatId, userId), query)
  rememberBoundedMap(lorebookContextMetrics, chatId, { lorebookEntries: selected.entries, lorebookSegments: selected.segments, cacheHits: selected.cacheHits, cacheMisses: selected.cacheMisses }, 64)
  return selected.text
}

function hasRequiredPermissions(): boolean {
  return spindle.permissions.has('generation') && spindle.permissions.has('image_gen') && spindle.permissions.has('images') && spindle.permissions.has('chat_mutation')
}

function isOwnMessage(message: { metadata?: Record<string, unknown> }): boolean {
  return Boolean(message.metadata?.extension === EXTENSION_ID)
}

function imageUrlFromId(imageId: string): string {
  return `/api/v1/images/${encodeURIComponent(imageId)}`
}

function imageIdFromResultUrl(value: string): string {
  const match = cleanString(value).match(/\/api\/v1\/(?:image-gen\/results|images)\/([^/?#]+)/i)
  return match ? decodeURIComponent(match[1]) : ''
}

export function aspectRatioEquivalent(left: string, right: string, tolerance = 0.035): boolean {
  const parse = (value: string): number | null => {
    const match = cleanString(value).match(/^(\d+(?:\.\d+)?):(\d+(?:\.\d+)?)$/)
    if (!match) return null
    const a = Number(match[1]); const b = Number(match[2])
    return a > 0 && b > 0 ? a / b : null
  }
  const a = parse(left); const b = parse(right)
  return a !== null && b !== null && Math.abs(a - b) <= tolerance
}

function aspectRatio(width?: number | null, height?: number | null): string {
  if (!width || !height) return ''
  const divisor = gcd(width, height)
  return `${Math.round(width / divisor)}:${Math.round(height / divisor)}`
}

function gcd(a: number, b: number): number {
  let x = Math.abs(Math.round(a))
  let y = Math.abs(Math.round(b))
  while (y) {
    const next = x % y
    x = y
    y = next
  }
  return x || 1
}

function slotDescription(job: RouterJob, slot: string): string {
  if (job.target === 'instagram.carousel') {
    const index = Math.max(1, Number(slot.match(/\d+$/)?.[0] || job.slots.indexOf(slot) + 1))
    return `Carousel slot: slide ${index} of ${job.count}. Keep it independently addressable and coherent with sibling slides.`
  }
  if (job.target === 'twitter.media') return 'Slot: the media image inside this exact Twitter post.'
  if (job.target === 'smartphone.message-image') return 'Slot: the image attachment inside this exact Smartphone message bubble.'
  if (job.target === 'kakao.image') return 'Slot: the image attachment inside this exact Kakao message.'
  if (job.target === 'prose.illustration') return 'Slot: the illustration media child inside this exact scene_illustration wrapper.'
  if (job.target.startsWith('custom.')) return 'Slot: the image child inside this exact declarative custom surface wrapper.'
  return 'Slot: the single image inside this exact Instagram post.'
}

export function hasExplicitNoHumanIntent(job: Pick<RouterJob, 'originalSceneBrief' | 'caption' | 'alt' | 'cast'>): boolean {
  if (job.cast === 'none') return true
  const authoritative = `${job.originalSceneBrief} ${job.caption || ''} ${job.alt || ''}`
  return /\b(?:no people(?: visible)?|no person(?:s)?(?: visible)?|without (?:any )?(?:people|persons|humans|characters)|empty (?:room|lounge|office|hallway|classroom|studio|interior|building|street|scene)|unoccupied|vacant|environment only|location only|object only|no message)\b/i.test(authoritative)
}

export function classifyImageRequest(job: Pick<RouterJob, 'originalSceneBrief' | 'caption' | 'alt' | 'target' | 'prosePromptComposition' | 'composedPositivePrompt' | 'cast'>): RequestClassification {
  const composition = job.prosePromptComposition
  const namedSubjects = (composition?.namedSubjects || []).map(cleanString).filter(Boolean)
  const peoplePolicy = composition?.peoplePolicy || 'allowed'
  const authoritative = `${job.originalSceneBrief} ${job.caption || ''} ${job.alt || ''}`
  const text = authoritative.toLocaleLowerCase()
  const explicitNoHumans = hasExplicitNoHumanIntent(job) || peoplePolicy === 'forbidden'

  // Explicit no-human/environment intent is authoritative. Names mentioned as
  // backstory (for example “the chair where Alpha sat”) are not visible subjects.
  if (explicitNoHumans) {
    const noHumanText = authoritative.toLocaleLowerCase()
    if (/\b(screenshot|screen capture|article screenshot|news article|webpage|interface|ui|text conversation|chat interface)\b/.test(noHumanText)) return 'screenshot/article/ui'
    if (/\b(document|receipt|letter|article|newspaper article|paper form|form scan)\b/.test(noHumanText)) return 'document'
    if (/\b(food|meal|dish|cake|coffee|drink|lunch|dinner|breakfast|tea)\b/.test(noHumanText) && !/\b(room|lounge|office|interior|table|chair)\b/.test(noHumanText)) return 'food'
    if (/\b(room|lounge|studio|interior|office|kitchen|bedroom|hallway|classroom|venue|building|location|floor|stage|cafe|restaurant|street)\b/.test(noHumanText)) return 'location/interior'
    if (/\b(landscape|mountain|forest|beach|sky|sunset|scenery|outdoor vista|cityscape)\b/.test(noHumanText)) return 'scenery'
    if (/\b(object|device|phone|package|sign|prop|tool|equipment|table|chair|marker|tape|surface|close-up|closeup|cup)\b/.test(noHumanText)) return 'object photo'
    return 'abstract/non-character'
  }

  if (job.cast === 'char+user') return 'group photo'
  if (job.cast === 'char' || job.cast === 'user') return /\b(?:portrait|headshot|profile)\b/i.test(authoritative) ? 'character portrait' : 'person-focused candid'

  if (/\b(screenshot|screen capture|article screenshot|news article|webpage|interface|ui|text conversation|chat interface)\b/.test(text)) return 'screenshot/article/ui'
  if (/\b(document|receipt|letter|article|newspaper article|paper form|form scan)\b/.test(text)) return 'document'
  if (/\b(meme|reaction image|captioned image)\b/.test(text)) return 'meme'
  const explicitNamedPerson = namedSubjects.some(name => namedEntityPosition(authoritative, name) >= 0)
    || /\b(?:photo|picture|candid|portrait|selfie) of [A-Z][a-z]+\b/.test(authoritative)
    || /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\s+(?:wearing|smiling|standing|walking|sitting|entering|looking|holding|lying|hovering|braced|kissing|embracing|sprawling|sprawls)\b/.test(authoritative)
  const explicitPerson = /\b(selfie|person|people|woman|man|girl|boy|teen|staff member|performer|dancer|singer|actor|face|expression|candid of|couple|duo|embrace|kissing)\b/i.test(authoritative) || explicitNamedPerson
  const authoritativeSubjects = namedSubjects.filter(name => namedEntityPosition(authoritative, name) >= 0)
  const statedPeopleCount = /\b(?:three|3)\s+(?:people|persons|characters)\b/i.test(authoritative) ? 3
    : /\b(?:two|2)\s+(?:people|persons|characters)\b|\b(?:couple|duo)\b/i.test(authoritative) ? 2
      : explicitPerson ? 1 : 0
  const authoritativePeopleCount = Math.max(statedPeopleCount, authoritativeSubjects.length)
  const isSelfie = /\bselfie\b/i.test(authoritative)
  if (isSelfie) return 'selfie'
  if (authoritativePeopleCount > 1) return 'group photo'
  if (job.target === 'prose.illustration' && explicitPerson) return /\b(two|three|couple|duo|people|together|embrace|kissing)\b/i.test(authoritative) ? 'group photo' : 'person-focused candid'
  if (/\b(food|meal|dish|cake|coffee|drink|lunch|dinner|breakfast)\b/.test(text)) return 'food'
  const explicitObject = /\b(object|device|phone|package|sign|prop|tool|equipment|table|chair|marker|tape|surface|close-up|closeup)\b/.test(text)
  const explicitEvidenceIntent = /\b(evidence|proof|inspection|failing|failure|misses?|not catching)\b/.test(text)
  if (explicitObject && !explicitPerson && !explicitEvidenceIntent) return 'object photo'
  if (/\b(evidence|proof|damage|broken|failing|failure|misses?|not catching|inspection|marker|close-up of|closeup of)\b/.test(text)) return 'evidence photo'
  if (/\b(group|team|crowd|friends|everyone|people together|two people|three people|couple|duo|embrace|kissing)\b/.test(text)) return 'group photo'
  if (/\b(portrait|headshot|profile photo|character sheet)\b/.test(text)) return 'character portrait'
  if (explicitObject && !explicitPerson) return 'object photo'
  if (explicitPerson) return /\b(two|three|couple|duo|people|together|embrace|kissing)\b/i.test(authoritative) ? 'group photo' : 'person-focused candid'
  if (/\b(room|studio|interior|office|kitchen|bedroom|hallway|venue|building|location|floor|stage|cafe|restaurant|lounge|classroom)\b/.test(text)) return 'location/interior'
  if (/\b(landscape|mountain|forest|beach|sky|sunset|scenery|outdoor vista|cityscape)\b/.test(text)) return 'scenery'
  if (explicitObject) return 'object photo'
  return 'abstract/non-character'
}

export function requestHasVisibleFace(classification: RequestClassification): boolean {
  return classification === 'character portrait' || classification === 'person-focused candid' || classification === 'group photo' || classification === 'selfie'
}

export function targetHumanPolicy(
  job: Pick<RouterJob, 'originalSceneBrief' | 'caption' | 'alt' | 'target' | 'prosePromptComposition' | 'composedPositivePrompt' | 'cast'>,
  classification = classifyImageRequest(job),
): TargetHumanPolicy {
  const text = `${job.originalSceneBrief} ${job.caption || ''} ${job.alt || ''}`
  const castRequirements = c5aCastRequirements(job.cast)
  const castRequiresIdentity = castRequirements.character || castRequirements.persona
  const explicitNoHumans = hasExplicitNoHumanIntent(job) || job.prosePromptComposition?.peoplePolicy === 'forbidden'
  const explicitHumanPresence = job.cast === 'char' || job.cast === 'user' || job.cast === 'char+user' || /\b(person|people|woman|man|girl|boy|teen|character|face|portrait|selfie|hand|hands|held|holding|someone|body|legs|feet|dancer|performer|couple|duo|embrace|kissing)\b/i.test(text)
  const compositionPeople = !explicitNoHumans && explicitHumanPresence && (Math.max(0, Number(job.prosePromptComposition?.expectedPeopleCount || 0)) > 0 || (job.prosePromptComposition?.namedSubjects || []).some(name => namedEntityPosition(text, cleanString(name)) >= 0))
  const explicitHeldObject = /\b(?:phone|object|device|camera|paper|document)\s+(?:being\s+)?(?:held|held by|in hand|in someone's hand)|\bholding\s+(?:a\s+)?(?:phone|object|device|camera|paper|document)\b/i.test(text)
  const targetClass: TargetHumanPolicy['targetClass'] =
    classification === 'group photo' ? 'group'
      : requestHasVisibleFace(classification) ? 'character'
        : classification === 'location/interior' || classification === 'scenery' ? 'location'
          : classification === 'document' ? 'document'
            : classification === 'screenshot/article/ui' ? 'screenshot/article/ui'
              : 'object'
  const allowHumanPrompt = !explicitNoHumans && (compositionPeople || targetClass === 'character' || targetClass === 'group' || explicitHeldObject || (targetClass === 'object' && explicitHumanPresence && classification !== 'screenshot/article/ui'))
  const commonNoHumanGuardrails = 'people, person, human, face, portrait, eyes, expression, hands, body, legs, feet, shoes, dancer, occupant, character, woman, man, girl, boy, someone holding the object, phone mockup, over-the-shoulder view, reflected face'
  const targetSpecificNoHumanGuardrails = targetClass === 'screenshot/article/ui'
    ? 'anime portrait, character illustration, person integrated into interface, floating interface around a person, cinematic scene, environmental background, phone frame, device bezel, screen mockup, perspective display, depth of field, bokeh'
    : targetClass === 'document'
      ? 'wide room view, chair, cafe interior, lifestyle staging, distant document, tiny document, dramatic perspective, shallow depth of field, bokeh, hand holding document, phone frame'
      : ''
  return {
    targetClass,
    // A declared cast is an authorial contract. Object-like target heuristics
    // must not silently erase its active Character or Persona.
    allowHumanContext: !explicitNoHumans && (castRequiresIdentity || compositionPeople || targetClass === 'character' || targetClass === 'group'),
    allowHumanPrompt: !explicitNoHumans && (castRequiresIdentity || allowHumanPrompt),
    noHumanGuardrails: [commonNoHumanGuardrails, targetSpecificNoHumanGuardrails].filter(Boolean).join(', '),
  }
}

export function detectHumanPromptContamination(prompt: string): string[] {
  const terms = [
    'girl', 'boy', 'woman', 'man', 'person', 'people', 'human', 'face', 'portrait', 'eyes', 'expression',
    'hand', 'hands', 'holding', 'body', 'legs', 'feet', 'shoes', 'dancer', 'occupant', 'selfie', '1girl', '1boy', 'POV of someone holding a phone',
    'over-the-shoulder', 'someone holding', 'phone mockup',
  ]
  const found = new Set<string>()
  for (const term of terms) {
    const pattern = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\ /g, '[-_ ]+')}\\b`, 'i')
    if (pattern.test(prompt)) found.add(term)
  }
  return [...found]
}

const SELFIE_VISIBLE_DEVICE_REQUEST_PATTERNS: RegExp[] = [
  /\bmirror selfie\b/i,
  /\b(?:phone|smartphone|device)\s+(?:is\s+)?(?:visible|shown|displayed|in (?:the )?(?:frame|shot))\b/i,
  /\b(?:holding|holds|held|showing|displaying)\b.{0,48}\b(?:phone|smartphone|device|phone screen)\b/i,
  /\b(?:hand|hands)\b.{0,24}\bholding\b.{0,24}\b(?:phone|smartphone|device)\b/i,
  /\b(?:phone|smartphone|device)\b.{0,36}\b(?:toward|towards|facing)\b.{0,16}\b(?:camera|viewer)\b/i,
  /\b(?:phone|smartphone|device|interface)\s+mockup\b/i,
  /\bdevice covering (?:the )?face\b/i,
]

const SELFIE_DEVICE_CONTAMINATION_PATTERNS: Array<{ label: string; pattern: RegExp }> = [
  {
    label: 'subject holding a phone toward the camera',
    pattern: /\b(?:the subject|she|he|they|i)\s+(?:is|are|am)\s+holding\s+(?:a|an|the|her|his|their|my)?\s*(?:phone|smartphone|device)(?:\s+up)?(?:\s+towards?\s+(?:the\s+)?camera(?:\s+lens)?)?\b/i,
  },
  {
    label: 'holding a phone or device',
    pattern: /\bholding\s+(?:a|an|the|her|his|their|my)?\s*(?:phone|smartphone|device)(?:\s+up)?(?:\s+towards?\s+(?:the\s+)?camera(?:\s+lens)?)?\b/i,
  },
  {
    label: 'hand holding a phone or device',
    pattern: /\b(?:a|the)?\s*(?:hand|hands)\s+holding\s+(?:a|an|the)?\s*(?:phone|smartphone|device)\b/i,
  },
  {
    label: 'visible phone or device',
    pattern: /\b(?:phone|smartphone|device)\s+(?:is\s+)?(?:visible|shown|displayed|in (?:the )?(?:frame|shot))\b/i,
  },
  {
    label: 'phone or device toward the camera',
    pattern: /\b(?:phone|smartphone|device)\s+(?:pointed\s+)?(?:toward|towards|facing)\s+(?:the\s+)?camera(?:\s+lens)?\b/i,
  },
  {
    label: 'displaying or showing a screen',
    pattern: /\b(?:displaying|showing)\s+(?:a|the)?\s*(?:(?:chat|text|message|phone)\s+)?screen(?:\s+(?:to|towards?)\s+(?:the\s+)?camera)?\b/i,
  },
  { label: 'phone screen', pattern: /\bphone screen\b/i },
  { label: 'mirror selfie', pattern: /\bmirror selfie\b/i },
  { label: 'device covering face', pattern: /\bdevice covering (?:the )?face\b/i },
  { label: 'phone or interface mockup', pattern: /\b(?:phone|smartphone|device|interface)\s+mockup\b/i },
]

export function requestsVisibleDeviceHardware(job: Pick<RouterJob, 'originalSceneBrief' | 'caption'>): boolean {
  const authoritativeText = [job.originalSceneBrief, job.caption || ''].join(' ')
  return SELFIE_VISIBLE_DEVICE_REQUEST_PATTERNS.some(pattern => pattern.test(authoritativeText))
}

export function finalizeParsedPositivePrompt(
  prompt: string,
  classification: RequestClassification,
  job: RouterJob,
): string {
  const castRequirements = c5aCastRequirements(job.cast)
  const disciplinedPrompt = castRequirements.character || castRequirements.persona
    ? prompt
    : disciplineParsedPositivePrompt(prompt, classification, job)
  const surfaceFramedPrompt = enforceDirectSurfaceFraming(disciplinedPrompt, classification)
  if (classification !== 'selfie') return surfaceFramedPrompt
  const repairResult = repairSelfieDeviceContamination(surfaceFramedPrompt, '', requestsVisibleDeviceHardware(job))
  if (repairResult.contaminated) {
    throw new Error('[SelfieDeviceRepair] Visible-device contamination persisted after one repair pass, while the authoritative scene brief did not explicitly request visible hardware.')
  }
  return repairResult.prompt
}

export function repairSelfieDeviceContamination(prompt: string, negative: string, requestedHardwareExplicitly: boolean): { prompt: string; negative: string; contaminated: boolean } {
  if (requestedHardwareExplicitly) return { prompt, negative, contaminated: false }
  const found = SELFIE_DEVICE_CONTAMINATION_PATTERNS.filter(item => item.pattern.test(prompt))
  if (!found.length) return { prompt, negative, contaminated: false }
  let repaired = prompt
  for (const item of found) {
    const pattern = new RegExp(`[\\s,.;:—-]*${item.pattern.source}[\\s,.;:—-]*`, 'gi')
    repaired = repaired.replace(pattern, ' ')
  }
  repaired = repaired
    .replace(/\s+/g, ' ')
    .replace(/,\s*,/g, ',')
    .replace(/^\s*[,;:—-]+|[,;:—-]+\s*$/g, '')
    .trim()
  const stillContaminated = SELFIE_DEVICE_CONTAMINATION_PATTERNS.some(item => item.pattern.test(repaired))
  return { prompt: repaired, negative, contaminated: stillContaminated }
}

function noHumanParserPolicyInstruction(policy: TargetHumanPolicy): string {
  if (policy.targetClass === 'screenshot/article/ui') {
    return 'Flat-content screenshot/article/UI policy: generate the screen, article, or document itself as the complete full-frame visible subject in a clean source-capture composition.'
  }
  if (policy.targetClass === 'document') {
    return 'Flat-content document policy: generate the document, article, receipt, or page itself as the complete full-frame visible subject. Explicitly requested staging may add its named surroundings.'
  }
  return `Object/location ${policy.targetClass} policy: center the requested object or location as the complete visible subject. Any explicitly named person remains part of the scene.`
}

function repairNoHumanPromptInstruction(job: Pick<RouterJob, 'originalSceneBrief'>, policy: TargetHumanPolicy, contaminatedPrompt: string, contamination: string[]): string {
  return [
    'Revise the previous JSON prompt. Return strict JSON only with prompt and negativeAdditions.',
    `Authoritative scene brief:\n${job.originalSceneBrief}`,
    noHumanParserPolicyInstruction(policy),
    `Concepts outside the visible-subject assignment: ${contamination.join(', ')}`,
    `Previous prompt:\n${contaminatedPrompt}`,
    'Write the prompt with the requested object, location, document, or screenshot as the complete visible subject and preserve the scene brief’s explicitly named visible subjects.',
  ].join('\n\n')
}

export function effectiveGenerationProfile(config: RouterConfig, chatId: string): GenerationProfile {
  return normalizeGenerationProfile(config.chatGenerationProfiles[chatId] || config.defaultGenerationProfile, chatId)
}

export function resolvePromptProfileDecision(
  job: Pick<RouterJob, 'chatId' | 'target' | 'originalSceneBrief' | 'caption' | 'alt' | 'promptProfileId'>,
  config: RouterConfig,
): PromptProfileDecision {
  const chatProfile = effectiveGenerationProfile(config, job.chatId)
  const classification = classifyImageRequest(job)
  const requested = job.promptProfileId || chatProfile.defaultPromptProfileId || config.defaultPromptProfileId || 'auto'
  const selectedId = requested === 'auto' ? autoPromptProfileId(job, classification) : requested
  const profiles = normalizePromptProfiles(config.promptProfiles)
  const selected = profiles.find(profile => profile.id === selectedId) || profiles.find(profile => profile.id === 'auto') || BUILT_IN_PROMPT_PROFILES[0]
  const suppression = profileSuppressesPeople(selected, classification, job.originalSceneBrief)
  return {
    requestedProfileId: requested,
    selectedProfileId: selected.id,
    selectedProfileName: selected.name,
    automaticClassification: classification,
    reason: requested === 'auto' ? `Auto selected ${selected.name} for ${classification}.` : `User selected ${selected.name}.`,
    framingGuidance: selected.framingGuidance,
    promptAdditions: selected.promptAdditions,
    negativeAdditions: [
      selected.negativeAdditions,
      chatProfile.defaultNegativeAdditions,
      suppression ? 'person, face, portrait subject, facial features, hair close-up' : '',
    ].filter(Boolean).join(', '),
    removedPositiveFragments: [],
    suppressedContext: suppression ? [{ source: 'character/persona visual context', reason: `${selected.name} does not depict a person unless explicitly requested.` }] : [],
  }
}

export function autoPromptProfileId(
  job: Pick<RouterJob, 'target' | 'originalSceneBrief' | 'caption' | 'alt' | 'prosePromptComposition' | 'composedPositivePrompt'>,
  classification: RequestClassification,
): PromptProfileId {
  const text = `${job.originalSceneBrief} ${job.caption || ''} ${job.alt || ''}`
  if (/\bselfie\b/i.test(text)) return 'selfie'
  if (job.target === 'prose.illustration' && (classification === 'group photo' || classification === 'person-focused candid' || classification === 'character portrait')) return 'social-candid'
  if (classification === 'object photo' || classification === 'food' || classification === 'document' || classification === 'screenshot/article/ui') return 'object-prop'
  if (classification === 'location/interior' || classification === 'scenery') return 'environment-location'
  if (classification === 'evidence photo' || /\b(surveillance|cctv|evidence|anonymous[- ]phone|stalker|paparazzi)\b/i.test(text)) return 'evidence-surveillance'
  if (classification === 'character portrait') return 'character-portrait'
  if (classification === 'person-focused candid' || classification === 'group photo') return 'social-candid'
  if (job.target === 'prose.illustration') return 'environment-location'
  if (job.target.startsWith('custom.')) return 'auto'
  return 'social-candid'
}

function profileSuppressesPeople(profile: PromptPresetProfile, classification: RequestClassification, sceneBrief: string): boolean {
  if (profile.characterContextPolicy !== 'suppress-unless-explicit' && profile.contextPolicy !== 'minimal') return false
  if (requestHasVisibleFace(classification)) return false
  return !/\b(person|people|woman|man|girl|boy|character|face|portrait|selfie|Character B|Character A)\b/i.test(sceneBrief)
}

const PORTRAIT_POSITIVE_PATTERNS = [
  /\bdetailed face\b/gi,
  /\bdetailed eyes\b/gi,
  /\bfacial features\b/gi,
  /\bdetailed hair\b/gi,
  /\bglossy hair\b/gi,
  /\bnatural skin texture\b/gi,
  /\bsoft blush\b/gi,
  /\bportrait subject\b/gi,
  /\bperson-focused\b/gi,
  /\bexpressive (?:face|expression)\b/gi,
  /\bflattering (?:face|portrait)\b/gi,
]

const NON_PERSON_POSITIVE_PATTERNS = [
  /\b(?:a |one |single )?(?:person|woman|man|girl|boy|teen|character)\b/gi,
  /\b(?:human figure|human subject|visible human|visible person|background person|people in frame|person in frame)\b/gi,
  /\b(?:portrait|headshot|selfie|face shot|facial portrait)\b/gi,
  /\b(?:face|eyes|hair|skin|makeup|smile|expression)\s*(?:detail|details|focus|close-up|closeup)\b/gi,
  /\b(?:close-up|closeup) (?:portrait|of (?:a )?(?:face|person|woman|man|girl|boy))\b/gi,
]

export function applyPromptProfileToPositivePrompt(prompt: string, decision: PromptProfileDecision): { prompt: string; decision: PromptProfileDecision } {
  let next = prompt
  const removed = [...decision.removedPositiveFragments]
  const suppressPeople = decision.suppressedContext.some(item => item.source.includes('character/persona'))
  if (suppressPeople) {
    for (const pattern of [...PORTRAIT_POSITIVE_PATTERNS, ...NON_PERSON_POSITIVE_PATTERNS]) {
      next = next.replace(pattern, match => {
        removed.push({ fragment: match, reason: 'Object/environment profile removed portrait-positive language.' })
        return ' '
      })
    }
  }
  if (decision.promptAdditions) next = `${next}, ${decision.promptAdditions}`
  return {
    prompt: next.split(',').map(part => part.trim()).filter(Boolean).join(', '),
    decision: { ...decision, removedPositiveFragments: removed },
  }
}

function requestDepictsCharacter(classification: RequestClassification, brief: string): boolean {
  if (!requestHasVisibleFace(classification)) return false
  return !/\b(my selfie|selfie of me|the user|persona selfie|my face)\b/i.test(brief)
}

function requestDepictsPersona(classification: RequestClassification, brief: string): boolean {
  return requestHasVisibleFace(classification) && /\b(selfie|myself|\bme\b|the user|persona|my face|my outfit)\b/i.test(brief)
}

export function targetFramingInstruction(target: RouterJob['target'], classification: RequestClassification): string {
  if (target === 'smartphone.message-image') {
    if (classification === 'screenshot/article/ui' || classification === 'object photo' || classification === 'document') return 'Direct image attachment: show the requested content clearly as complete full-frame media. Named device, hand, and framing elements remain visible.'
    if (classification === 'selfie' || classification === 'character portrait' || classification === 'person-focused candid') return 'Believable phone selfie: natural first-person angle, arm-length crop around the subject, casual perspective, and natural imperfections.'
    return 'Direct image attachment: show the requested subject clearly as complete full-frame media; selfie intent uses a natural arm-length capture angle.'
  }
  if (target === 'kakao.image') {
    if (classification === 'screenshot/article/ui' || classification === 'document') return 'Direct flat-content attachment: the requested content itself fills the frame as a clean source capture.'
    if (classification === 'selfie') return 'Front-facing camera output: center the subject in a natural arm-length self-taken crop.'
    if (classification === 'object photo' || classification === 'location/interior' || classification === 'scenery') return 'Center the requested subject as the complete full-frame attachment; explicitly named people and devices remain part of the scene.'
    return "Frame this as a casual Kakao chat attachment or candid social snapshot from the sender's believable perspective."
  }
  if (target === 'prose.illustration') return `Frame this as an approved prose illustration: a visual plate for the requested narrative beat, preserving inline or after-prose placement and caption intent.`
  if (target === 'instagram.single') return 'Use intentional, aesthetically polished social-post composition while preserving the requested subject.'
  if (target === 'instagram.carousel') return 'Use intentional social-post composition and keep visual styling coherent with the other independently addressable carousel slides.'
  if (target === 'twitter.media') return `Use post-appropriate framing for this ${classification}: news or fan photo, meme, screenshot, press image, or candid update according to the brief.`
  if (target.startsWith('custom.')) return `Frame this as a declarative custom surface asset for ${target}. Follow the supplied surface request, aspect ratio, caption, alt text, people policy, and authored layout behavior.`
  return ''
}

export function sanitizeVisualPreset(value: string): string {
  if (!value) return ''
  return value
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/\b(system|instruction|diagnostic|regex|css|json|macro|preset architecture)\b[^.!?]*(?:[.!?]|$)/gi, ' ')
    .replace(/[{}<>]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 1600)
}

/** Converts context prose into bounded syntax-neutral appearance facts. With
 * subject names supplied, facts must come from a sentence naming a depicted
 * subject; unrelated activated lorebooks therefore cannot become identity. */
export function normalizedVisualFactsFromContext(value: string, subjectNames: string[] = []): string {
  const normalizedNames = subjectNames.map(name => cleanString(name).toLocaleLowerCase()).filter(Boolean)
  const values = extractAppearanceTraitPhrases(value)
    .filter(trait => !normalizedNames.length || normalizedNames.some(name => trait.sourceSentence.toLocaleLowerCase().includes(name)))
    .map(trait => sanitizeVisualPreset(trait.value))
    .filter(Boolean)
  return [...new Set(values)].slice(0, 16).join(', ')
}

export function sanitizeRecentVisualContext(value: string): string {
  if (!value) return ''
  if (/\b(OOC|integration test|debug export|motive ledger|router logs?|regex|stylesheet|developer handoff)\b/i.test(value)) return ''
  const clean = value
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<(?:image_request|reverie-illustration)\b[\s\S]*?<\/(?:image_request|reverie-illustration)>/gi, ' ')
    .replace(/<!--\s*(?:reverie-relay|dreamglass):image(?:-error)?[\s\S]*?-->/gi, ' ')
    .replace(/<(?:tw_media|ig_media|ig_slide|s_img|k_img|image_request_error)\b[\s\S]*?<\/(?:tw_media|ig_media|ig_slide|s_img|k_img|image_request_error)>/gi, ' ')
    .replace(/\{[\s\S]{120,}?\}/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return compact(clean, 700)
}

export function resolveNamedVisualSubjects(sceneBrief: string, presets: Array<Record<string, unknown>>): VisualSubjectPrompt[] {
  const matches: Array<VisualSubjectPrompt & { position: number }> = []
  for (const preset of presets) {
    const kind = cleanString(preset.kind).toLocaleLowerCase()
    if (kind !== 'character' && kind !== 'persona') continue
    const name = firstString(preset.name, preset.label)
    const prompt = sanitizeVisualPreset(cleanString(preset.prompt))
    if (!name || !prompt) continue
    const position = namedEntityPosition(sceneBrief, name)
    if (position < 0) continue
    matches.push({
      id: cleanString(preset.id) || undefined,
      name,
      kind,
      prompt,
      negativePrompt: sanitizeVisualPreset(firstString(preset.negativePrompt, preset.negative_prompt, preset.negative)),
      position,
    })
  }
  return matches.sort((a, b) => a.position - b.position).map(({ position: _position, ...subject }) => subject)
}

function namedEntityPosition(sceneBrief: string, name: string): number {
  const escaped = escapeRegExp(name.trim())
  if (!escaped) return -1
  const match = new RegExp(`(^|[^\\p{L}\\p{N}_])${escaped}(?=$|[^\\p{L}\\p{N}_])`, 'iu').exec(sceneBrief)
  return match ? match.index + match[1].length : -1
}

function formatVisualSubjectPrompts(subjects: VisualSubjectPrompt[]): string {
  return subjects.map(subject => `${subject.name}: ${sanitizeSubjectIdentityPrompt(subject.prompt)}`).join('\n')
}

const SUBJECT_CARDINALITY_TOKEN = /(?:^|[,;]\s*)\b(?:solo|1boy|1girl|2boys|2girls|multiple boys|multiple girls)\b\s*/gi
const SUBJECT_SCENE_STATE_TOKEN = /(?:^|[,;]\s*)\b(?:(?:soft|gentle|subtle|faint|broad)\s+)?(?:smil(?:e|ing)|smirk(?:ing)?|expression|crying|tearful|tears?|eyes? closed|eyes? open|looking (?:at|away|up|down)[^,;]*|gaze[^,;]*|relaxed posture|tense posture|standing|sitting|kneeling|lying down|trembling|laughing|angry|sad|happy|afraid|injured|bruised|bleeding|wounded|wet clothes?|torn clothes?|disheveled clothes?)\b\s*/gi

export function sanitizeSubjectIdentityPrompt(prompt: string): string {
  return sanitizeVisualPreset(prompt)
    .replace(SUBJECT_CARDINALITY_TOKEN, ' ')
    .replace(SUBJECT_SCENE_STATE_TOKEN, ' ')
    .replace(/\s*[,;]\s*[,;]+/g, ', ')
    .replace(/^\s*[,;]\s*|\s*[,;]\s*$/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function subjectScope(subject: VisualSubjectPrompt): string {
  if (/\b(?:1boy|boy|male|man)\b/i.test(subject.prompt)) return 'male subject'
  if (/\b(?:1girl|girl|female|woman)\b/i.test(subject.prompt)) return 'female subject'
  return 'subject'
}

export function enforceVisualSubjectIdentity(prompt: string, subjects: VisualSubjectPrompt[], sceneFirst = false): string {
  if (!subjects.length) return prompt
  let body = prompt
  for (const subject of subjects) {
    if (/\byoung teen\b/i.test(subject.prompt)) body = body.replace(/\b(?:young|adult) woman\b/gi, 'young teen')
    if (/\bteen(?:age)? girl\b/i.test(subject.prompt)) body = body.replace(/\b(?:young|adult) woman\b/gi, 'teen girl')
  }
  const identity = subjects
    .map(subject => `${subjectScope(subject)} ${subject.name}: ${sanitizeSubjectIdentityPrompt(subject.prompt)}`.replace(/:\s*$/, ''))
    .join('; ')
  const cardinality = subjects.length > 1 ? `${subjects.length}people, ` : ''
  return (sceneFirst ? `${body}, ${cardinality}${identity}` : `${cardinality}${identity}, ${body}`).replace(/\s+/g, ' ').trim()
}

export function resolveSubjectNegativeMacros(nativeNegative: string, subjectNegative: string): string {
  return nativeNegative
    .replace(/\{\{\s*(?:character|persona)_negative_prompt\s*\}\}/gi, subjectNegative)
    .replace(/\s*,\s*,+/g, ', ')
    .replace(/^\s*,\s*|\s*,\s*$/g, '')
    .trim()
}

export function resolveVisualPromptMacros(
  rawTemplate: string,
  options: { characterValue: string; personaValue: string; characterExpected: boolean; personaExpected: boolean },
): { resolvedTemplate: string; unresolvedMacros: string[] } {
  const unresolvedMacros: string[] = []
  const resolvedTemplate = rawTemplate.replace(/\{\{(character_prompt|persona_prompt)\}\}/gi, (_match, macro: string) => {
    const isCharacter = macro.toLowerCase() === 'character_prompt'
    const value = isCharacter ? options.characterValue : options.personaValue
    if (value) return value
    if ((isCharacter && options.characterExpected) || (!isCharacter && options.personaExpected)) unresolvedMacros.push(`{{${macro}}}`)
    return ''
  })
  return { resolvedTemplate, unresolvedMacros }
}

function extractParentArtifactContext(job: RouterJob): string {
  const source = job.sourceContent || ''
  if (!source) return ''
  const index = source.indexOf(job.originalRequestXml)
  if (index < 0) return ''
  const contained = smallestContainingArtifact(source, index, index + job.originalRequestXml.length)
  const start = contained?.start ?? Math.max(0, index - 700)
  const end = contained?.end ?? Math.min(source.length, index + job.originalRequestXml.length + 350)
  const window = source.slice(start, end).replace(job.originalRequestXml, ' ')
  return sanitizeArtifactWindow(window)
}

function smallestContainingArtifact(source: string, requestStart: number, requestEnd: number): { start: number; end: number } | null {
  const candidates: Array<{ start: number; end: number }> = []
  for (const tag of ['s_msg', 'k_msg', 'message', 'tw_post', 'ig_slide', 'ig_post', 'smart_phone', 'kakao_chat', 'ig_app']) {
    const openPattern = new RegExp(`<${tag}\\b`, 'gi')
    let open = -1
    for (let match = openPattern.exec(source); match && match.index < requestStart; match = openPattern.exec(source)) open = match.index
    if (open < 0) continue
    const closePattern = new RegExp(`</${tag}\\s*>`, 'gi')
    closePattern.lastIndex = requestEnd
    const close = closePattern.exec(source)
    if (!close) continue
    candidates.push({ start: open, end: close.index + close[0].length })
  }
  return candidates.sort((a, b) => (a.end - a.start) - (b.end - b.start))[0] || null
}

function sanitizeArtifactWindow(value: string): string {
  return compact(value
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<(?:image_request|reverie-illustration)\b[\s\S]*?<\/(?:image_request|reverie-illustration)>/gi, ' ')
    .replace(/<!--\s*(?:reverie-relay|dreamglass):image(?:-error)?[\s\S]*?-->/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\{[\s\S]{120,}?\}/g, ' '), 900)
}

function selectRelevantRecentContext(
  messages: ChatMessage[],
  targetIndex: number,
  job: RouterJob,
  subjects: VisualSubjectPrompt[],
  includeRecentMessages: number,
): string {
  const lowerBound = Math.max(0, targetIndex - Math.min(includeRecentMessages, 6))
  const candidates = messages.slice(lowerBound, targetIndex)
    .map((message, offset) => ({ message, index: lowerBound + offset }))
    .filter(({ message }) => message.role === 'user' || message.role === 'assistant')
    .filter(({ message }) => !isUnrelatedArtifact(String(message.content || '')))
    .map(({ message, index }) => ({
      role: message.role,
      index,
      text: sanitizeRecentVisualContext(String(message.content || '')),
      score: contextRelevanceScore(String(message.content || ''), job.originalSceneBrief, subjects),
    }))
    .filter(candidate => candidate.text && candidate.score > 0)
    .sort((a, b) => b.score - a.score || b.index - a.index)
    .slice(0, 2)
    .sort((a, b) => a.index - b.index)
  return candidates.map(candidate => `${candidate.role}: ${candidate.text}`).join('\n\n')
}

function isUnrelatedArtifact(value: string): boolean {
  return /<(?:image_request|reverie-illustration|smart_phone|kakao_chat|ig_app|tw_post)\b|(?:reverie-relay|dreamglass):image|\b(?:integration test|test-phone|debug export|router metadata)\b/i.test(value)
}

function contextRelevanceScore(value: string, sceneBrief: string, subjects: VisualSubjectPrompt[]): number {
  const lower = value.toLocaleLowerCase()
  let score = subjects.reduce((total, subject) => total + (lower.includes(subject.name.toLocaleLowerCase()) ? 8 : 0), 0)
  const stop = new Set(['about', 'after', 'again', 'anonymous', 'before', 'candid', 'entering', 'focus', 'grainy', 'image', 'photo', 'slightly', 'taken', 'through', 'where', 'while', 'with'])
  const keywords = [...new Set((sceneBrief.toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu) || []).filter(word => word.length >= 4 && !stop.has(word)))]
  score += keywords.reduce((total, word) => total + (lower.includes(word) ? 1 : 0), 0)
  if (/\b(wearing|outfit|uniform|hair|eyes|school|gates?|location|lighting|clothing)\b/i.test(value)) score += 1
  return score
}

function statePath(chatId: string): string {
  return `states/${chatId.replace(/[^A-Za-z0-9_.-]/g, '_')}.json`
}

function effectiveParserModel(config: RouterConfig): string {
  return config.parserModel || ''
}

export function extractText(result: unknown): string {
  const readContent = (value: unknown, depth = 0): string => {
    if (depth > 6 || value == null) return ''
    if (typeof value === 'string') return value
    if (Array.isArray(value)) return value.map(item => readContent(item, depth + 1)).filter(Boolean).join('\n')
    if (typeof value !== 'object') return ''
    const row = value as Record<string, unknown>
    for (const key of ['text', 'output_text', 'content', 'parts']) {
      const resolved = readContent(row[key], depth + 1)
      if (resolved.trim()) return resolved
    }
    return ''
  }

  if (typeof result === 'string') return result
  if (!result || typeof result !== 'object') return ''
  const value = result as Record<string, any>
  const candidates: unknown[] = [
    value.text,
    value.output_text,
    value.content,
    value.output,
    value.response,
    value.result,
    value.data?.text,
    value.data?.content,
    value.data?.output,
    Array.isArray(value.candidates) ? value.candidates[0]?.content : null,
    Array.isArray(value.choices) ? value.choices[0]?.message?.content : null,
    Array.isArray(value.choices) ? value.choices[0]?.text : null,
  ]
  for (const candidate of candidates) {
    const text = readContent(candidate)
    if (text.trim()) return text
  }
  return ''
}

function cleanString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function cleanNullableString(value: unknown): string | null {
  const clean = cleanString(value)
  return clean || null
}

function cleanParameters(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, Math.round(parsed))) : fallback
}

function emptyPromptPipeline(record?: Partial<SlotRecord>): PromptPipeline {
  return {
    contextCaption: record?.caption,
    nativeNegativePrompt: '',
    requestNegativePrompt: record?.originalNegativePrompt || '',
    parserNegativeAdditions: '',
    additionalRouterNegativePrompt: '',
    rawMergedNegativePrompt: record?.resolvedNegativePrompt || '',
    finalNormalizedNegativePrompt: record?.resolvedNegativePrompt || '',
    removedNegativeDuplicates: [],
    unresolvedMacros: [],
    warnings: [],
  }
}

function normalizeNegativePrompts(sources: { native: string; request: string; subject: string; parser: string; router: string }): { negative: string; pipeline: PromptPipeline } {
  const ordered: Array<[keyof typeof sources, string]> = [
    ['native', sources.native], ['request', sources.request], ['subject', sources.subject], ['parser', sources.parser], ['router', sources.router],
  ]
  const seen = new Map<string, { term: string; sources: string[] }>()
  const removed = new Map<string, { term: string; sources: string[] }>()
  let malformed = false
  for (const [source, value] of ordered) {
    if (!value) continue
    if (/(^\s*,)|(,\s*,)|(,\s*$)/.test(value)) malformed = true
    for (const rawTerm of value.split(',')) {
      const term = rawTerm.trim()
      if (!term) continue
      const normalized = term.toLocaleLowerCase()
      const existing = seen.get(normalized)
      if (existing) {
        if (!existing.sources.includes(source)) existing.sources.push(source)
        const duplicate = removed.get(normalized) || { term: existing.term, sources: [...existing.sources] }
        if (!duplicate.sources.includes(source)) duplicate.sources.push(source)
        removed.set(normalized, duplicate)
        continue
      }
      seen.set(normalized, { term, sources: [source] })
    }
  }
  const duplicates = [...removed.values()]
  const warnings: PromptWarning[] = []
  if (malformed) warnings.push({ code: 'malformed-negative-separators', message: 'Negative prompt contained empty or repeated comma separators.' })
  if (duplicates.length) warnings.push({ code: 'duplicate-negative-terms', message: `${duplicates.length} duplicate negative term${duplicates.length === 1 ? '' : 's'} were removed while preserving first-source order.`, sources: duplicates.flatMap(item => item.sources) })
  const rawMergedNegativePrompt = ordered.map(([, value]) => value.trim()).filter(Boolean).join(', ')
  const negative = [...seen.values()].map(item => item.term).join(', ')
  return {
    negative,
    pipeline: {
      nativeNegativePrompt: sources.native.trim(),
      requestNegativePrompt: sources.request.trim(),
      subjectNegativePrompt: sources.subject.trim(),
      parserNegativeAdditions: sources.parser.trim(),
      additionalRouterNegativePrompt: sources.router.trim(),
      rawMergedNegativePrompt,
      finalNormalizedNegativePrompt: negative,
      removedNegativeDuplicates: duplicates,
      unresolvedMacros: [],
      warnings,
    },
  }
}

export function disciplineParserNegativeAdditions(
  additions: string,
  positivePrompt: string,
  classification: RequestClassification,
  nativeNegative: string,
  requestNegative: string,
  subjectNegative = '',
): { negativeAdditions: string; rejected: Array<{ term: string; reason: string }>; warnings: PromptWarning[] } {
  const covered = new Set(`${nativeNegative},${requestNegative},${subjectNegative}`.split(',').map(term => term.trim().toLocaleLowerCase()).filter(Boolean))
  const kept: string[] = []
  const rejected: Array<{ term: string; reason: string }> = []
  for (const raw of additions.split(',')) {
    const term = raw.trim()
    if (!term) continue
    const normalized = term.toLocaleLowerCase()
    let reason = ''
    if (covered.has(normalized)) reason = 'already covered by native or request negatives'
    else if (!requestHasVisibleFace(classification) && /\b(smile|smiling|makeup|face|facial|expression|static pose|posed portrait)\b/i.test(term)) reason = `not applicable to ${classification}`
    else reason = directPromptConflictReason(positivePrompt, term, classification)
    if (reason) rejected.push({ term, reason })
    else kept.push(term)
  }
  return {
    negativeAdditions: kept.join(', '),
    rejected,
    warnings: rejected.map(item => ({
      code: 'parser-negative-rejected',
      message: `Generated parser negative "${item.term}" was rejected: ${item.reason}.`,
      sources: ['parser negative additions'],
    })),
  }
}

export function disciplineParsedPositivePrompt(prompt: string, classification: RequestClassification, job: RouterJob): string {
  let clean = prompt
  if (!requestHasVisibleFace(classification)) {
    for (const pattern of [...PORTRAIT_POSITIVE_PATTERNS, ...NON_PERSON_POSITIVE_PATTERNS]) {
      clean = clean.replace(pattern, ' ')
    }
    clean = clean.replace(/\b(?:face\s*)?expression(?:\s*tags?)?\s*:\s*(?:none|n\/a|not applicable)\b\s*,?/gi, ' ')
  }
  const requested = `${job.originalSceneBrief} ${job.caption || ''}`.toLocaleLowerCase()
  const generic = /^(?:realistic|4k(?: photography)?(?: style)?|professional photography)$/i
  clean = clean.split(',').map(part => part.trim()).filter(part => part && (!generic.test(part) || requested.includes(part.toLocaleLowerCase()))).join(', ')
  return clean.replace(/\s+/g, ' ').replace(/^,\s*|,\s*$/g, '').trim()
}

export function enforceDirectSurfaceFraming(prompt: string, classification: RequestClassification): string {
  let clean = prompt
    .replace(/\bno\s+unless explicitly requested\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .replace(/,\s*,/g, ',')
    .replace(/^\s*[,;:\x97-]+|[,;:\x97-]+\s*$/g, '')
    .trim()
  const fragments = classification === 'screenshot/article/ui'
    ? ['direct flat 2D screen capture', 'edge-to-edge interface content', 'orthographic front-on view', 'screen content only', 'crisp readable UI layout']
    : classification === 'document'
      ? ['document fills most of the frame', 'top-down or near-top-down close-up', 'page-centered composition', 'minimal surrounding surface']
      : []
  if (!fragments.length) return clean
  const normalized = clean.toLocaleLowerCase()
  const missing = fragments.filter(fragment => !normalized.includes(fragment.toLocaleLowerCase()))
  return [clean, ...missing].filter(Boolean).join(', ')
}

function directPromptConflictReason(prompt: string, negativeTerm: string, classification: RequestClassification): string {
  const positive = prompt.toLocaleLowerCase()
  const negative = negativeTerm.toLocaleLowerCase()
  if (/\b(polished|reflective|glossy)\b/.test(positive) && /\b(shiny surface|reflection|reflective)\b/.test(negative)) return 'contradicts the requested reflective or polished surface'
  if (/\b(warm|golden|amber)\b/.test(positive) && /\b(warm tones?|warm lighting)\b/.test(negative)) return 'contradicts warm lighting or style in the positive prompt'
  if (/\b(clear|clearly visible|well-lit|clear exposure)\b/.test(positive) && /\b(dim|underexposed|shadow-obscured|dark image)\b/.test(negative)) return 'contradicts clear subject visibility'
  if (/\b(candid|action|moving|in motion)\b/.test(positive) && /\b(static pose|still pose)\b/.test(negative)) return 'contradicts candid action'
  if ((classification === 'evidence photo' || /\b(phone|smartphone|handheld|snapshot)\b/.test(positive)) && /\b(professional photography|studio photography)\b/.test(negative)) return 'conflicts with believable phone or evidence-photo intent'
  return ''
}

function promptWarnings(prompt: string, negative: string, pipeline: PromptPipeline): PromptWarning[] {
  const warnings: PromptWarning[] = []
  if (prompt.length > 3500) warnings.push({ code: 'long-positive-prompt', message: `Positive prompt is unusually long (${prompt.length} characters).` })
  if (negative.length > 2500) warnings.push({ code: 'long-negative-prompt', message: `Negative prompt is unusually long (${negative.length} characters).` })
  const lightingTerm = negative.match(/\b(bright lighting|brightly lit)\b/i)?.[0]
  if (lightingTerm && /\b(clear|well-lit|visibility)\b/i.test(pipeline.resolvedNativeParserInstructions || '')) {
    warnings.push({
      code: 'lighting-conflict',
      message: '"bright lighting" appears in the negative prompt while native parser instructions request clear, well-lit subject visibility.',
      sources: negativeTermSources(lightingTerm, pipeline),
      suggestion: 'harsh flash, blown highlights, overexposure, bright studio backdrop',
    })
  }
  if (/\b(person|someone|young person)\b/i.test(prompt) && (pipeline.characterContext || pipeline.personaContext)) {
    warnings.push({ code: 'missing-identity', message: 'Prompt uses a generic subject despite available character or persona context.' })
  }
  for (const term of negative.split(',').map(value => value.trim()).filter(Boolean)) {
    const reason = directPromptConflictReason(prompt, term, (pipeline.requestClassification || 'abstract/non-character') as RequestClassification)
    if (!reason) continue
    warnings.push({ code: 'positive-negative-conflict', message: `Negative term "${term}" ${reason}.`, sources: negativeTermSources(term, pipeline) })
  }
  return warnings
}

function negativeTermSources(term: string, pipeline: PromptPipeline): string[] {
  const normalized = term.trim().toLocaleLowerCase()
  const sources: Array<[string, string]> = [
    ['native negative', pipeline.nativeNegativePrompt],
    ['request negative', pipeline.requestNegativePrompt],
    ['subject preset negative', pipeline.subjectNegativePrompt || ''],
    ['parser negative additions', pipeline.parserNegativeAdditions],
    ['Relay additional negative', pipeline.additionalRouterNegativePrompt],
  ]
  return sources.filter(([, value]) => value.split(',').some(candidate => candidate.trim().toLocaleLowerCase() === normalized)).map(([label]) => label)
}

function named(label: string, value: unknown): string {
  const text = cleanString(value)
  return text ? `${label}: ${compact(text, 3000)}` : ''
}

function compactObject(parts: string[]): string {
  return parts.filter(Boolean).join('\n')
}

function compact(value: string, max: number): string {
  const clean = value.replace(/\s+/g, ' ').trim()
  return clean.length > max ? `${clean.slice(0, max)}...` : clean
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function logStage(config: Pick<RouterConfig, 'debugLogging'>, stage: string, details?: Record<string, unknown>, level: 'info' | 'warn' | 'error' = 'info'): void {
  if (!config.debugLogging && level !== 'error') return
  const suffix = details ? ` ${JSON.stringify(details, (_key, value) => {
    if (typeof value === 'string' && value.length > 300) return `${value.slice(0, 300)}...`
    return value
  })}` : ''
  const message = `[Reverie Relay:${stage}]${suffix}`
  if (level === 'error') spindle.log.error(message)
  else if (level === 'warn') spindle.log.warn(message)
  else spindle.log.info(message)
}

spindle.log.info(`Reverie Relay backend loaded - v${EXTENSION_VERSION} / ${BUILD_ID}`)

function pendingRequestMarkup(record: SlotRecord): string {
  const original = cleanString(record.originalRequestXml)
  if (original && /<(?:image_request|reverie-illustration)\b/i.test(original)) return original
  if (original && /<scene_image\b[^>]*\bpending(?:=|\s|>)/i.test(original)) return original
  return renderReconstructedRequest(record, record.originalSceneBrief || record.alt || 'Reverie Relay image slot.', record.originalNegativePrompt || '', record.requestAspect)
}

function uniqueMarkupRanges(ranges: Array<{ start: number; end: number }>): Array<{ start: number; end: number }> {
  const sorted = ranges
    .filter(range => Number.isFinite(range.start) && Number.isFinite(range.end) && range.end > range.start)
    .sort((left, right) => left.start - right.start || right.end - left.end)
  const result: Array<{ start: number; end: number }> = []
  for (const range of sorted) {
    const previous = result[result.length - 1]
    if (previous && range.start <= previous.end) {
      previous.end = Math.max(previous.end, range.end)
      continue
    }
    result.push({ ...range })
  }
  return result
}

function requestMarkupRange(content: string, record: SlotRecord): { start: number; end: number } | null {
  const original = cleanString(record.originalRequestXml)
  if (!original) return null
  const start = content.indexOf(original)
  return start >= 0 ? { start, end: start + original.length } : null
}

async function handleBulkChatMediaAction(payload: Extract<FrontendMessage, { type: 'bulk_chat_media_action' }>, userId?: string): Promise<void> {
  const before = await getState(payload.chatId, userId)
  const selected = Object.values(before.slots).filter(record => record.chatId === payload.chatId && (payload.lane === 'illustrations' ? record.target === 'prose.illustration' : record.target !== 'prose.illustration'))
  if (!selected.length) {
    await sendState(userId, payload.chatId)
    spindle.sendToFrontend({ type: 'relay_notice', level: 'info', message: payload.lane === 'illustrations' ? 'No illustrations were found in this chat.' : 'No surface slot images were found in this chat.' }, userId)
    return
  }

  for (const record of selected.filter(isRecordJobActive)) cancelledJobs.add(jobCancellationKey(record))

  const requestGroups = new Map<string, SlotRecord[]>()
  for (const record of selected) {
    const key = `${record.messageId}:${record.swipeId}:${record.requestId}:${record.target}`
    const rows = requestGroups.get(key) || []
    rows.push(record)
    requestGroups.set(key, rows)
  }

  const messageCache = new Map<string, ChatMessage | null>()
  let messageEdits = 0
  for (const rows of requestGroups.values()) {
    const representative = rows[0]
    let message = messageCache.get(representative.messageId)
    if (message === undefined) {
      message = await resolveMessage(payload.chatId, representative.messageId)
      messageCache.set(representative.messageId, message)
    }
    if (!message) continue
    const content = getSwipeContent(message, representative.swipeId)
    const ownedRanges = uniqueMarkupRanges(rows.flatMap(record => [findSlotMarkupRange(content, record), findErrorMarkupRange(content, record)].filter((range): range is { start: number; end: number } => Boolean(range))))
    const unresolvedRanges = payload.mode === 'remove-images-and-slots'
      ? uniqueMarkupRanges(rows.map(record => requestMarkupRange(content, record)).filter((range): range is { start: number; end: number } => Boolean(range)))
      : []
    const ranges = uniqueMarkupRanges([...ownedRanges, ...unresolvedRanges])
    if (!ranges.length) continue

    let next = content
    const keepSlots = payload.mode === 'remove-images-keep-slots'
    const replacementIndex = keepSlots ? ranges[0].start : -1
    for (const range of [...ranges].sort((left, right) => right.start - left.start)) {
      const replacement = keepSlots && range.start === replacementIndex ? pendingRequestMarkup(representative) : ''
      next = next.slice(0, range.start) + replacement + next.slice(range.end)
    }
    if (next === content) continue
    await patchSwipeContent(payload.chatId, message, representative.swipeId, next)
    message = { ...message, content: representative.swipeId === 0 ? next : message.content, swipes: Array.isArray(message.swipes) ? message.swipes.map((value, index) => index === representative.swipeId ? next : value) : message.swipes }
    messageCache.set(representative.messageId, message)
    messageEdits += 1
  }

  const selectedKeys = new Set(selected.map(record => record.key))
  const selectedRequestKeys = new Set(selected.map(record => `${record.messageId}:${record.swipeId}:${record.requestId}`))
  await mutateState(payload.chatId, userId, state => {
    const liveSelected = Object.values(state.slots).filter(record => selectedKeys.has(record.key))
    const now = Date.now()
    if (payload.mode === 'remove-images-and-slots') {
      removeSlotRecords(state, liveSelected)
      for (const [illustrationId, illustration] of Object.entries(state.proseIllustrator.records || {})) {
        if (!selectedRequestKeys.has(`${illustration.anchor.messageId}:${illustration.anchor.swipeId}:${illustration.requestId}`) && !selectedKeys.has(illustration.slotKey)) continue
        delete state.proseIllustrator.records[illustrationId]
        const plan = state.proseIllustrator.plans[illustration.planId]
        if (plan && payload.lane === 'illustrations') delete state.proseIllustrator.plans[illustration.planId]
      }
    } else {
      for (const record of liveSelected) {
        record.status = 'recovered-pending'
        record.imageId = undefined
        record.imageUrl = undefined
        record.imageWidth = null
        record.imageHeight = null
        record.aspectRatio = undefined
        record.error = undefined
        record.failedAt = undefined
        record.completedAt = undefined
        record.cancelledAt = undefined
        record.pendingPlacement = undefined
        record.previewPending = false
        record.placementFailure = undefined
        record.imageAvailability = 'unchecked'
        record.imageAvailabilityCheckedAt = undefined
        record.recoveredAt = now
        record.recoverySource = 'unresolved-request'
        record.updatedAt = now
      }
      for (const illustration of Object.values(state.proseIllustrator.records || {})) {
        if (!selectedRequestKeys.has(`${illustration.anchor.messageId}:${illustration.anchor.swipeId}:${illustration.requestId}`) && !selectedKeys.has(illustration.slotKey)) continue
        illustration.status = 'planned'
        illustration.imageId = undefined
        illustration.imageUrl = undefined
        illustration.assetId = undefined
        illustration.versionId = undefined
        illustration.error = undefined
        illustration.completedAt = undefined
        illustration.inserted = false
        illustration.insertionVerified = false
        illustration.removed = false
        const plan = state.proseIllustrator.plans[illustration.planId]
        if (plan) {
          plan.status = 'ready'
          plan.placementConfirmed = false
        }
      }
    }
    appendStateLog(state, {
      severity: 'info', stage: payload.lane === 'illustrations' ? 'prose-illustrator' : 'chat-cleanup', eventType: 'bulk_chat_media_action', chatId: payload.chatId,
      message: payload.mode === 'remove-images-keep-slots'
        ? `Removed ${liveSelected.length} chat image result${liveSelected.length === 1 ? '' : 's'} and restored reusable slots.`
        : `Removed ${liveSelected.length} chat image result${liveSelected.length === 1 ? '' : 's'} and their slots.`,
      details: { lane: payload.lane, mode: payload.mode, records: liveSelected.length, messageEdits },
    })
  })
  await sendState(userId, payload.chatId)
  spindle.sendToFrontend({
    type: 'relay_notice', level: 'success',
    message: payload.mode === 'remove-images-keep-slots'
      ? `${payload.lane === 'illustrations' ? 'Illustration' : 'Surface'} images removed. Their slots are ready to reparse or regenerate.`
      : `${payload.lane === 'illustrations' ? 'Illustrations' : 'Surface slot images'} and slots removed from this chat.`,
  }, userId)
}

async function handleRemoveSlotImage(payload: Extract<FrontendMessage, { type: 'remove_slot_image' }>, userId?: string): Promise<void> {
  const chatId = payload.chatId
  const state = await getState(chatId, userId)
  const record = state.slots[payload.key]
  if (!record) throw new Error('Slot not found.')
  const message = await resolveMessage(chatId, record.messageId)
  if (!message) throw new Error('Message not found.')
  const content = getSwipeContent(message, record.swipeId)
  const next = removeSlotMarkup(content, record)
  if (next === null) throw new Error('Could not find slot markup in message.')
  await patchSwipeContent(chatId, message, record.swipeId, next ?? undefined)
  await mutateState(chatId, userId, state => {
    const slot = state.slots[payload.key]
    if (slot) { slot.imageUrl = undefined; slot.imageId = undefined; slot.updatedAt = Date.now() }
  })
  await sendState(userId, chatId)
}
