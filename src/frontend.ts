import type { SpindleFrontendContext } from 'lumiverse-spindle-types'
import { mountPhoneWidget } from './phoneWidget'
import { mountPhoneToolRenderSync } from './phoneToolRenderSync'
import type {
  AppearanceCharacterSheet,
  AppearanceMemoryActionStatus,
  AppearanceFactCategory,
  AppearanceSuggestion,
  AppearanceVaultFact,
  AppearanceVaultLayer,
  CanonicalVisualCharacter,
  AssetLibraryState,
  ContinuityFact,
  ContinuityStrength,
  ContinuityVaultState,
  CustomSurfaceDefinition,
  CustomSurfaceStudioState,
  SurfacePromptCategory,
  SurfaceShellMode,
  SurfaceColorMode,
  SurfaceUtilityInjectionPosition,
  SurfaceRendererScriptOverride,
  GenerationProfile,
  GenerationSnapshot,
  GenerationRecipe,
  GenerationPlaceholderEffect,
  RelayExperienceMode,
  BackgroundQueueState,
  BackgroundQueueItem,
  GalleryLinkRequest,
  DryRunReport,
  GenerationBlocker,
  ImageTarget,
  ImageProviderInfo,
  ImageIntent,
  PromptPipeline,
  PromptPresetProfile,
  PromptProfileId,
  ProseIllustrationOpportunity,
  ProseIllustratorSettings,
  ProseIllustratorState,
  QueueDirectorState,
  RegenerationIntent,
  RelayCandidate,
  RelayCandidateBatch,
  SlotRecord,
  VersionTree,
  VisualAssetReference,
} from './contracts'
import { MAX_RELAY_JOB_CONCURRENCY, normalizeGenerationPlaceholderEffect } from './contracts'
import { BracketIllustrationStream } from './instantIllustrationStream'
import { SlotActionFeedbackCoordinator, type SlotActionFeedback, type SlotActionKind } from './slotActionFeedback'
import { observeRelayMediaMounts, setMediaText } from './mediaDomStability'
import { RelayRuntimeLifecycle, type RelayRuntimeHealth } from './runtimeLifecycle'
import { canAbortSlotStatus, countCurrentChatOverview, isFailureRecoveryStatus, isGenerationActiveStatus, isSlotLifecycleActive } from './slotLifecycle'
import { C5B_CACHE_LIMITS, normalizeGalleryLinkCache, rememberBoundedMap, summarizeRelayHealth, type RelayHealthCheck } from './c5bReliability'
import { BUILD_ID, EXTENSION_VERSION } from './build'
import { ORB_IMAGE_DESIGNS, ORB_IMAGE_DESIGN_URLS, type OrbImageDesignId } from './orbIconData'
import { REVERIE_RELAY_OVERVIEW_ICON_URL, REVERIE_RELAY_SIDEBAR_ICON_URL } from './brandIconData'
import { applyKakaoColorBinding } from './kakaoColor'
import { bindImageLightboxZoom } from './imageLightboxZoom'
import { lifecycleRuntimeCss, NATIVE_SURFACE_ROOT_TAGS, renderCompletedProseLifecycleProjection, renderGenerationPlaceholderEffect, renderNativeSurfaceMarkup, renderRegenerationLifecycleProjection } from './nativeSurfaces'
import { shippedSurfaceDefinitions } from './shippedSurfaceDefinitions'
import { r45SupplementalSurfaceDefinitions } from './r45SurfaceCatalog'
import { DEFAULT_ILLUSTRATOR_FRAMING_PROMPTS, DEFAULT_PROMPT_REGISTRY, DEFAULT_PROMPT_REGISTRY_VERSIONS, PROMPT_REGISTRY_DEFINITIONS, REVERIE_ILLUSTRATION_PROTOCOL, REVERIE_INLINE_PROTOCOL, REVERIE_RELAY_PLANNED_PROTOCOL, REVERIE_SURFACE_APP_SCHEMA_FIREBREAK } from './protocols'
import { normalizeCharacterPhoneDefaultApps, type CharacterPhoneAppId } from './characterPhoneConfig'
import { NARRATIVE_UTILITY_OVERVIEWS, SURFACE_UTILITY_OVERVIEWS, settingHelp } from './uxCopy'
import { bracketExampleFromXml } from './bracketSurfaceAuthoring'
import { xmlAuthoringInstructions } from './xmlSurfaceFormat'
import { containsImageRequestMarkup } from './contracts'
import { narrativeUtilityDisplayName } from './narrativeRegexAssets'
import { surfaceIconMarkup } from './surfaceIcons'
import { narrativeGlassButtonPresentationCss, narrativeVariantForSurfaceShellMode } from './surfacePresentation'
import { updateNarrativeUtilitySelection } from './narrativeUtilitySelection'
import { emptyRelayChatStats, type RelayChatStats } from './completedState'
import { shouldDeferPanelRenderForControl } from './panelRenderPolicy'
import { regexSurfaceParityScripts } from './regexSurfaceParity'
import type { R45PresentationMode, R45ScriptSource } from './r45SurfaceAuthority'
import { r45ScriptOverrideKey } from './r45SurfaceAuthority'
import { validateDeclarativeSurfaceCss } from './surfaceCssSafety'
import { validateRendererRegex } from './surfaceRendererValidation'
import { activeSurfaceDefinitions } from './surfacePromptSelection'
import { buildInstantIllustrationSource, findInstantIllustrationAnchor, INSTANT_STREAM_RENDER_MAX_RETRIES, INSTANT_STREAM_RENDER_RETRY_MS } from './instantIllustrationStream'
import { activeStoryEvents, visibleStoryPhoneEntries, type StoryBeliefState, type StoryConstellationState, type StoryEventNode, type StoryEventProposal, type StoryPhoneEntry, type StorySourceRef } from './storyState'
import { projectStoryReel } from './storyReel'
import { bindStoryGraphGeometry, storyEventImageIds } from './storyPresentation'

const COPYABLE_IMAGE_REQUEST_TEMPLATE = xmlAuthoringInstructions(`<reverie-illustration
  request="generate"
  slot="unique-image-request-id"
  aspect="4:3"
  cast="none"
  alt="Accessible description of the finished image"
>
  <visual_prompt>Describe the exact visible moment, subjects, established appearance and clothing, action, environment, lighting, camera, framing, and composition. Do not request readable interface text.</visual_prompt>
</reverie-illustration>`)

const COPYABLE_TRACKER_IMAGE_PATTERN = xmlAuthoringInstructions(`<tracker_card>
  <tracker_media>
    <image_request
      id="tracker-main-UNIQUE-ID"
      target="custom.artifact-media"
      slot="tracker-main-UNIQUE-ID"
      aspect="4:3"
      alt="Scene image for this tracker"
    >
      <scene_brief>Describe the exact visible tracker-owned image: subjects, established appearance and clothing, action, environment, lighting, camera, framing, and composition. Do not request readable interface text.</scene_brief>
    </image_request>
  </tracker_media>
  <!-- Keep the tracker’s existing semantic fields here. -->
</tracker_card>`)

const COPYABLE_TRACKER_PRESET_GUIDANCE = xmlAuthoringInstructions(`When the tracker is useful, author its existing semantic wrapper and fields exactly as defined. Add one <tracker_media> child in the documented position. Inside that owner, write one complete <image_request> with target="custom.artifact-media", a stable unique id and matching slot, an allowed aspect ratio, accessible alt text, and a complete <scene_brief>. Keep the request inside <tracker_media> through pending, generation, completion, retry, reparse, and reload. Do not place it beside or outside the tracker. Include {{reverie_artifact_media_protocol}} in the preset if Relay's automatic Surface injection is not supplying the custom Utility.`)

type ParserConnection = {
  id: string
  name: string
  provider: string
  model: string
}

function frontendSurfaceFallback(): CustomSurfaceStudioState {
  const byBaseId = new Map<string, CustomSurfaceDefinition>()
  for (const definition of [...shippedSurfaceDefinitions(0), ...r45SupplementalSurfaceDefinitions(0)]) {
    if (!definition.promptModule || definition.baseSurfaceId === 'artifact-media' || definition.baseSurfaceId === 'prose-illustration') continue
    byBaseId.set(definition.baseSurfaceId, { ...definition, surfaceId: definition.baseSurfaceId, baseSurfaceId: definition.baseSurfaceId })
  }
  const definitions = Object.fromEntries([...byBaseId.values()].map(definition => [definition.surfaceId, definition]))
  return {
    definitions,
    activePresetIds: Object.fromEntries(Object.values(definitions).map(definition => [definition.baseSurfaceId, definition.surfaceId])),
    collectionPresets: {}, rendererMode: 'relay', defaultShellMode: 'plain', colorMode: 'realistic', utilityInjectionEnabled: true,
    utilityInjectionPosition: 'after-chat-history', utilityTemplate: '', rendererScriptOverrides: {}, validationErrors: {}, lastInjectedModuleIds: [],
    lastInjectionAt: 0, lastInjectionSource: 'none', lastInjectionPosition: 'none', lastInjectionSummary: 'Built-in surface fallback is loading.', updatedAt: 0,
  }
}

type ImageConnection = {
  id: string
  name?: string
  provider: string
  model?: string
  is_default?: boolean
  default_parameters?: Record<string, unknown>
  metadata?: Record<string, unknown>
}

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
  slotGenerationMode: 'auto-insert' | 'prompt-preview' | 'image-preview'
  generationPlaceholderEffect: GenerationPlaceholderEffect
  debugLogging: boolean
  highResMode: boolean
  enableRelayOrb: boolean
  autoRescanOnChatOpen: boolean
  includeInactiveSwipesInRescan: boolean
  storyConstellationsEnabled: boolean
  autoConfirmStoryEvents: boolean
  storyKnowledgeConflictAlerts: boolean
  analyzeEditedStoryMessages: boolean
  injectStoryEventContext: boolean
  followNativeParser: boolean
  followNativeImageGen: boolean
  generationSettingsSource: 'native' | 'relay'
  loraSource: 'native' | 'relay' | 'none'
  vaultStrength: ContinuityStrength
  parserConnectionId: string | null
  parserModel: string
  parserParameters: Record<string, unknown>
  surfaceRepairConnectionId: string | null
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
  nativeIncludeCharacters?: boolean
  nativeIncludePersona?: boolean
  nativeCharacterPrompt?: string
  nativePersonaPrompt?: string
  nativePromptPresets?: Array<Record<string, unknown>>
  interfaceTheme: 'velvet-prism' | 'clean-panel'
  orbPositionDesktop: { x: number; y: number }
  orbPositionMobile: { x: number; y: number }
  orbSize: 'small' | 'medium' | 'large'
  orbDesign: 'classic' | 'minimal' | 'glow' | 'glass' | OrbImageDesignId | 'custom'
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
  surfaceRendererMode: CustomSurfaceStudioState['rendererMode']
  surfaceDefaultShellMode: CustomSurfaceStudioState['defaultShellMode']
  surfaceColorMode: SurfaceColorMode
  surfaceUtilityInjectionEnabled: boolean
  surfacePreferencesInitialized: boolean
  settingsRevision: number
  narrativeDlcEnabled: boolean
  narrativeDlcVariant: 'sparkle-button' | 'plain-button' | 'inline' | 'glass' | 'plain-glass'
  narrativeDlcUtilityNames: string[]
  narrativeUtilityOverrides: Record<string, { content: string; revision: number; updatedAt: number }>
  narrativeUtilityImageEnabled: Record<string, boolean>
  characterPhoneDefaultApps: CharacterPhoneAppId[]
  characterPhonePresentation: 'widget' | 'surface'
  phoneEnabled: boolean
  narrativeDlcLastSync: {
    status: 'not-installed' | 'healthy' | 'drifted' | 'failed' | 'removed'
    variant: 'sparkle-button' | 'plain-button' | 'inline' | 'glass' | 'plain-glass'
    expected: number
    installed: number
    healthy: number
    drifted: number
    blocked: number
    updatedAt: number
    message: string
  } | null
  globalSurfaceStudio: CustomSurfaceStudioState
  proseIllustratorSettings: ProseIllustratorSettings
  tutorialModeEnabled: boolean
  tutorialStep: number
}

type RelaySettingsPatch =
  | { kind: 'surface-preferences'; rendererMode?: CustomSurfaceStudioState['rendererMode']; defaultShellMode?: SurfaceShellMode; colorMode?: SurfaceColorMode; utilityInjectionEnabled?: boolean }
  | { kind: 'surface-prompt-enabled'; values: Record<string, boolean>; categoryId?: string }
  | { kind: 'character-phone-apps'; defaultApps: CharacterPhoneAppId[] }
  | { kind: 'narrative-enabled'; enabledNames: string[] }
  | { kind: 'narrative-image-enabled'; utilityName: string; enabled: boolean }
  | { kind: 'narrative-override'; utilityName: string; content: string | null }
  | { kind: 'prompt-registry-override'; promptId: string; content: string | null; version: number }

type NarrativeUtilityInjectionRecord = {
  id: string
  name: string
  defaultContent: string
  effectiveContent: string
  injectedContent: string
  enabled: boolean
  imageEnabled: boolean
  revision: number
  source: 'default' | 'user-override'
  updatedAt?: number
  warnings: string[]
}

type ImageWorkerRecoveryState = {
  active?: boolean
  draining?: boolean
  activeProvider?: string | null
  activeGenerationId?: string | null
  drainStartedAt?: number
  drainAgeMs?: number
  drainReason?: string
  resetAvailable?: boolean
  stuckThresholdMs?: number
  laneResetCount?: number
  lastLaneResetAt?: number
  lastAbandonedGenerationId?: string | null
  lastAbandonReason?: string
  waiterCount?: number
}

type BackendMessage =
  | { type: 'state'; chatId: string | null; records: SlotRecord[]; stats: RelayChatStats; recentCompleted: Array<Record<string, unknown>>; queueSafety: { rawPendingRecords: number; uniquePendingJobs: number; duplicateRecordsCollapsed: number; oldestPendingAgeMs: number; pausedBacklog: boolean; updatedAt: number }; config: RouterConfig; parserConnections: ParserConnection[]; imageConnections: ImageConnection[]; imageProviders?: ImageProviderInfo[]; logs: RouterLogEntry[]; candidateBatches: RelayCandidateBatch[]; queueDirector: QueueDirectorState; assetLibrary: AssetLibraryState; versionTrees: VersionTree[]; continuityVault: ContinuityVaultState; storyConstellations: StoryConstellationState; customSurfaces: CustomSurfaceStudioState; proseIllustrator: ProseIllustratorState; backgroundQueue: BackgroundQueueState; galleryLinks: GalleryLinkRequest[]; lastDryRun: DryRunReport | null; lastGenerationBlockers: GenerationBlocker[]; schemaVersion: number; revision: number; build: BackendBuildInfo; imageWorkerRecovery?: ImageWorkerRecoveryState; performance?: { statePayloadBytes: number; serializationMs: number; recordsSent: number; completedLifetime: number; hotCompleted: number } }
  | { type: 'story_backfill_status'; chatId: string; status: 'running' | 'completed' | 'cancelled' | 'failed'; completed: number; total: number; stats?: { scanned: number; eligible: number; analyzed: number; skipped: number; failed: number; rawCandidates: number; normalizedCandidates: number; rejectedCandidates: number; proposals: number; phoneEntries: number; fallbackEchoes: number; reasons: Record<string, number> }; message?: string }
  | { type: 'status'; status: string; requestId?: string }
  | { type: 'gallery_link_claim'; chatId: string; linkId: string; sessionId: string; granted: boolean; operationLeaseId?: string; reason?: string }
  | { type: 'error'; source: string; message: string; key?: string; attemptNumber?: number }
  | ({ type: 'slot_action_feedback' } & SlotActionFeedback)
  | { type: 'image_generation_stream'; event: 'started' | 'status' | 'preview' | 'done' | 'cancelled' | 'error'; chatId?: string; generationId: string; source: 'relay-slot' | 'relay-illustrator' | 'relay-candidate'; slotKey?: string; requestId?: string; previewImageDataUrl?: string; statusText?: string; step?: number; totalSteps?: number; nodeId?: string; streaming?: boolean; error?: string }
  | { type: 'recovery_notice'; key: string; message: string }
  | { type: 'native_snapshot_requested'; chatId: string; messageId: string | null; swipeId: number | null; sourceContent?: string; coalescedWaiterCount?: number }
  | { type: 'queue_abort_ack'; abortedQueued: number; abortedActive: number; remoteCancelRequested: number; alreadyStopped: number }
  | { type: 'queue_dispatch_diagnostic'; diagnostic: Record<string, unknown> }
  | { type: 'image_worker_recovery_state'; imageWorkerRecovery: ImageWorkerRecoveryState }
  | { type: 'completed_history_page'; chatId: string; cursor: number; limit: number; rows: Array<Record<string, unknown>>; nextCursor: number | null; total: number; completedLifetime: number }
  | { type: 'completed_diagnostic'; chatId: string; archiveId: string; requestId?: string; diagnostic: unknown; record?: SlotRecord; message: string }
  | { type: 'reparse_preview'; key: string; prompt: string; negativePrompt: string; pipeline: PromptPipeline }
  | { type: 'self_test_result'; checks: RelayHealthCheck[]; frontendBuildId: string; backend: BackendBuildInfo; buildMatch: boolean }
  | { type: 'rescan_result'; summary: ChatRescanSummary; automatic: boolean; alreadyRunning?: boolean }
  | { type: 'relay_notice'; level: 'info' | 'success' | 'warning'; message: string; batchId?: string }
  | ({ type: 'appearance_memory_action_status' } & AppearanceMemoryActionStatus)
  | { type: 'relay_settings_patch_result'; operationId: string; status: 'success' | 'failed'; settingsRevision: number; config: RouterConfig; customSurfaces: CustomSurfaceStudioState; error?: string; warnings: string[] }
  | { type: 'narrative_utility_registry'; requestId: string; settingsRevision: number; records: NarrativeUtilityInjectionRecord[] }
  | { type: 'prose_opportunities_ready'; chatId: string; messageId: string; swipeId: number; opportunities: ProseIllustrationOpportunity[]; source: string }
  | { type: 'model_placed_requests_missing'; chatId: string; messageId: string; runtimeDirective: string }
  | { type: 'prompt_registry_preview'; chatId: string; requestId?: string; prompt: string; registryIds: string[] }
  | { type: 'surface_prompt_preview'; requestId: string; prompt: string; surfaceModuleIds: string[]; narrativeUtilityNames: string[]; surfaceInjectionEnabled: boolean; narrativeInjectionEnabled: boolean; error?: string }
  | { type: 'native_surface_repair_result'; requestId: string; chatId: string; messageId: string; status: 'preview-ready' | 'applied' | 'failed'; repairId?: string; proposedMarkup?: string; summary?: string; error?: string }
  | { type: 'custom_surface_action_result'; requestId: string; ok: boolean; error?: string }
  | { type: 'narrative_lorebook_export_result'; requestId: string; ok: boolean; message: string; bookId?: string; entryId?: string }
  | { type: 'lora_catalog_result'; requestId: string; connectionId: string; status: 'completed' | 'failed'; items: string[]; error?: string }
  | { type: 'dry_run_result'; report: DryRunReport }
  | { type: 'full_complete_dry_run_result'; report: { id: string; generatedAt: number; chatId: string | null; generated: false; modelCalls: 0; imageGenerationCalls: 0; sections: Record<string, unknown> } }
  | { type: 'generation_blockers'; scope: 'slot' | 'illustrator' | 'auto'; blockers: GenerationBlocker[] }

type RouterLogEntry = {
  id: string
  timestamp: number
  severity: 'debug' | 'info' | 'warning' | 'error'
  stage: string
  eventType: string
  message?: string
  chatId?: string
  requestId?: string
  messageId?: string
  swipeId?: number
  target?: string
  provider?: string
  model?: string
  details?: Record<string, unknown>
}

type BackendBuildInfo = { extensionVersion: string; buildId: string; loadedAt: number; lastResponseAt: number }

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

type NativeSettingsSnapshot = {
  settings: Record<string, unknown>
  capturedAt: number
}

type DrawerTab = 'slots' | 'illustrator' | 'recipes' | 'genetics' | 'surfaces' | 'surface-library' | 'surface-presets' | 'utility-studio' | 'history' | 'logs' | 'manual' | 'settings' | 'story-constellations' | 'phone' | 'story-reel'
type SuiteSection = 'relay' | 'illustrator' | 'surfaces' | 'memory' | 'archive' | 'story' | 'phone' | 'settings'
type SlotFilter = 'all' | 'active' | 'generating' | 'failed' | 'completed' | 'recovered' | 'inactive'
type MetadataVersion = SlotRecord | GenerationSnapshot
type HistorySubTab = 'all-chats-gallery' | 'slot-history' | 'illustrator-candidates' | 'inline-illustrations' | 'deleted-message-images'

const PANEL_ICON = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7h16"/><path d="M7 4v16"/><path d="M17 4v16"/><path d="M4 17h16"/><circle cx="12" cy="12" r="3"/></svg>'

export async function settlePlacementVisualLifecycle(options: {
  image: HTMLImageElement
  isCurrent: () => boolean
  reducedMotion: boolean
  preserveGeometry?: boolean
  restoreVisibility?: string
  onRevealStart?: () => void
  onSettled: () => void
}): Promise<'settled' | 'stale' | 'failed'> {
  const { image, isCurrent, reducedMotion, preserveGeometry, restoreVisibility, onRevealStart, onSettled } = options
  if (!isCurrent()) return 'stale'
  const wasHidden = image.hidden
  // A host remount can replace the original image node after regeneration
  // covered it, leaving the new node with `visibility:hidden` but without the
  // saved pre-regeneration visibility token. Never restore that temporary
  // cover as the completed image's permanent inline style.
  const requestedVisibility = restoreVisibility ?? image.style.visibility
  const previousVisibility = preserveGeometry && requestedVisibility !== 'hidden' ? requestedVisibility : ''
  // Keep progressive JPEG/mobile paints behind the slot placeholder until the
  // decoded final frame and its reveal keyframe are ready to appear together.
  if (preserveGeometry) image.style.visibility = 'hidden'
  else image.hidden = true
  if (!image.complete || image.naturalWidth <= 0) {
    const loaded = await new Promise<boolean>(resolve => {
      const cleanup = () => {
        image.removeEventListener('load', onLoad)
        image.removeEventListener('error', onError)
      }
      const onLoad = () => { cleanup(); resolve(true) }
      const onError = () => { cleanup(); resolve(false) }
      image.addEventListener('load', onLoad, { once: true })
      image.addEventListener('error', onError, { once: true })
    })
    if (!loaded) {
      if (isCurrent()) {
        if (preserveGeometry) image.style.visibility = previousVisibility
        else image.hidden = wasHidden
      }
      return 'failed'
    }
  }
  if (image.naturalWidth <= 0 || !isCurrent()) {
    if (isCurrent()) {
      if (preserveGeometry) image.style.visibility = previousVisibility
      else image.hidden = wasHidden
    }
    return isCurrent() ? 'failed' : 'stale'
  }
  try {
    await image.decode?.()
  } catch {
    // Some browsers reject decode() for an otherwise loaded, paintable image.
  }
  if (!isCurrent()) return 'stale'
  image.classList.remove('rrl-final-reveal')
  if (reducedMotion) {
    onRevealStart?.()
    if (preserveGeometry) image.style.visibility = previousVisibility
    else image.hidden = false
    onSettled()
    return 'settled'
  }
  const animationFinished = new Promise<boolean>(resolve => {
    const cleanup = () => {
      image.removeEventListener('animationend', onAnimationEnd)
      image.removeEventListener('animationcancel', onAnimationCancel)
    }
    const onAnimationEnd = (event: Event) => {
      if (event.target !== image) return
      cleanup()
      resolve(true)
    }
    const onAnimationCancel = (event: Event) => {
      if (event.target !== image) return
      cleanup()
      resolve(false)
    }
    image.addEventListener('animationend', onAnimationEnd)
    image.addEventListener('animationcancel', onAnimationCancel)
  })
  image.classList.add('rrl-final-reveal')
  onRevealStart?.()
  if (preserveGeometry) image.style.visibility = previousVisibility
  else image.hidden = false
  const finished = await animationFinished
  image.classList.remove('rrl-final-reveal')
  if (!finished || !isCurrent()) return 'stale'
  if (preserveGeometry && image.style.visibility === 'hidden') image.style.visibility = previousVisibility
  onSettled()
  return 'settled'
}

export function prepareFinalLifecycleImage(
  image: HTMLImageElement,
  url: string,
  reveal: boolean,
  matchesUrl: (currentUrl: string, expectedUrl: string) => boolean,
): void {
  // Set the hidden state before assigning src: host rendering and browser paint
  // can otherwise expose the final image once before the reveal helper runs.
  if (reveal) image.hidden = true
  if (!matchesUrl(image.currentSrc || image.src, url)) image.src = url
  if (!reveal) image.hidden = false
}

export function prepareRegeneratedLifecycleImage(
  image: HTMLImageElement,
  url: string,
  preserveGeometry: boolean,
  matchesUrl: (currentUrl: string, expectedUrl: string) => boolean,
): void {
  if (!preserveGeometry) {
    prepareFinalLifecycleImage(image, url, true, matchesUrl)
    return
  }
  // An authored Surface often relies on this image's intrinsic box for its
  // layout. Cover its old pixels without `hidden`, then restore visibility
  // immediately after the new reveal guard has been mounted.
  image.hidden = false
  image.style.visibility = 'hidden'
  if (!matchesUrl(image.currentSrc || image.src, url)) image.src = url
}

/** Prefer the existing whole lifecycle owner during regeneration. Replacing
 * only its inner image figure nests a second Status Card inside the completed
 * card and loses the card-owned reveal lifecycle. */
export function chooseReplacementProjectionOwner(options: {
  proseProjection?: HTMLElement | null
  lifecycleIsland?: HTMLElement | null
  lifecycleCard?: HTMLElement | null
  resolvedMedia?: HTMLElement | null
  image?: HTMLElement | null
}): HTMLElement | null {
  return options.proseProjection
    || options.lifecycleIsland
    || options.lifecycleCard
    || options.resolvedMedia
    || options.image
    || null
}

export function shouldStartFinalImageReveal(options: {
  imageChanged: boolean
  sawActiveLifecycle: boolean
  pendingRecordReveal: boolean
  cardAlreadyRevealed: boolean
  recordAlreadyRevealed: boolean
  readyForReveal?: boolean
}): boolean {
  return options.readyForReveal !== false
    && ((options.imageChanged && options.sawActiveLifecycle) || options.pendingRecordReveal)
    && !options.cardAlreadyRevealed
    && !options.recordAlreadyRevealed
}

export function currentLifecycleImageUrl(record: Pick<SlotRecord, 'status' | 'triggerType' | 'imageUrl' | 'pendingPlacement'>): string {
  const isRegeneration = ['regenerate-same-settings', 'regenerate-current-settings', 'intent-regeneration'].includes(String(record.triggerType || ''))
  // A completed record keeps its previous URL while Relay prepares a
  // replacement. That URL is history until the replacement is ready; treating
  // it as the active final image replays the old image's reveal animation.
  if (isRegeneration && (isGenerationActiveStatus(record.status)
    || record.status === 'placement-pending' && !record.pendingPlacement?.imageUrl)) return ''
  return record.pendingPlacement?.imageUrl || record.imageUrl || ''
}

export function concealPreviousLifecycleImage(image: HTMLImageElement): void {
  image.style.visibility = 'hidden'
  image.hidden = false
  image.classList.remove('rrl-final-reveal')
}

/** A host remount can cancel the one-shot reveal after the new asset has
 * already loaded. Never leave a completed, current-URL image covered forever. */
export function restoreCompletedLifecycleImage(
  image: HTMLImageElement,
  expectedUrl: string,
  matchesUrl: (currentUrl: string, expectedUrl: string) => boolean,
): boolean {
  if (!image.complete || image.naturalWidth <= 0 || image.classList.contains('rrl-final-reveal')
    || !matchesUrl(image.currentSrc || image.src, expectedUrl)) return false
  if (!image.hidden && image.style.visibility !== 'hidden') return false
  image.hidden = false
  image.style.visibility = ''
  return true
}

export function setup(ctx: SpindleFrontendContext) {
  const runtimeHost = globalThis as typeof globalThis & {
    __REVERIE_RELAY_FRONTEND_DISPOSE__?: () => void
    __REVERIE_RELAY_HEALTH__?: RelayRuntimeHealth
  }
  const documentHost = document as Document & {
    __REVERIE_RELAY_DOCUMENT_RUNTIME__?: { ownerId: string; dispose: () => void }
  }
  const documentRuntimeOwnerId = `relay-document-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  runtimeHost.__REVERIE_RELAY_FRONTEND_DISPOSE__?.()
  documentHost.__REVERIE_RELAY_DOCUMENT_RUNTIME__?.dispose()
  let disposed = false
  const lifecycle = new RelayRuntimeLifecycle(runtimeHost.__REVERIE_RELAY_HEALTH__)
  const health = lifecycle.health
  runtimeHost.__REVERIE_RELAY_HEALTH__ = health
  console.info(`Reverie Relay frontend loaded - v${EXTENSION_VERSION} / ${BUILD_ID}`)
  let records: SlotRecord[] = []
  let stats: RelayChatStats = emptyRelayChatStats()
  let queueSafety = { rawPendingRecords: 0, uniquePendingJobs: 0, duplicateRecordsCollapsed: 0, oldestPendingAgeMs: 0, pausedBacklog: false, updatedAt: 0 }
  let candidateBatches: RelayCandidateBatch[] = []
  let queueDirector: QueueDirectorState = { pausedAfterCurrent: false, concurrencyLimit: 1, selectedKeys: [], jobStatuses: {} }
  let assetLibrary: AssetLibraryState = { assets: {}, compare: {}, updatedAt: 0 }
  let versionTrees: VersionTree[] = []
  let continuityVault: ContinuityVaultState = { chatId: '', strength: 'off', characters: {}, characterSheets: {}, visualIdentity: {}, wardrobe: {}, currentAppearance: {}, suggestions: {}, quarantine: {}, history: [], migrationPreview: null, ignoredForSlotKeys: [], deliberateBreaks: {}, appearanceSidecar: { revision: 0, processedTurnKeys: {}, lastRunAt: 0 }, updatedAt: 0 }
  let storyConstellations: StoryConstellationState = { schemaVersion: 1, activeTimelineId: 'main', actors: {}, events: {}, proposals: {}, echoes: {}, knowledgeEdges: {}, conflicts: {}, phoneEntries: {}, reelOverrides: {}, processedMessageFingerprints: {}, updatedAt: 0 }
  let storyBackfillStatus: Extract<BackendMessage, { type: 'story_backfill_status' }> | null = null
  let customSurfaces: CustomSurfaceStudioState = frontendSurfaceFallback()
  let proseIllustrator: ProseIllustratorState = { settings: {}, opportunities: {}, plans: {}, records: {}, processedMessageKeys: {}, autoCounters: {}, frequencyDecisions: {}, activeOpportunityIdByChat: {}, activePlanIdByChat: {} }
  let backgroundQueue: BackgroundQueueState = { items: {}, abortRequestedAt: 0, updatedAt: 0 }
  let imageWorkerRecovery: ImageWorkerRecoveryState = { active: false, draining: false, resetAvailable: false, laneResetCount: 0, waiterCount: 0 }
  let galleryLinks: GalleryLinkRequest[] = []
  let lastDryRun: DryRunReport | null = null
  let lastFullCompleteDryRun: Extract<BackendMessage, { type: 'full_complete_dry_run_result' }>['report'] | null = null
  let lastGenerationBlockers: GenerationBlocker[] = []
  let galleryLinkProcessing = false
  const galleryLinkClaimPending = new Set<string>()
  const galleryLinkResultAwaitingAck = new Set<string>()
  let galleryLinkLeaseRetryTimer = 0
  let nativeGuardBusy = false
  let nativeGuardToastShown = false
  let recordByKey = new Map<string, SlotRecord>()
  const pendingFinalRevealByRecord = new Map<string, string>()
  const proseRevealGuards = new Map<string, { requestId: string; messageId: string; imageUrl?: string }>()
  const proseRevealGuardStyles = new Map<Document | ShadowRoot, HTMLStyleElement>()
  const slotActionFeedback = new SlotActionFeedbackCoordinator()
  const pendingSurfacePromptPreviews = new Map<string, { setValue: (value: string) => void }>()
  const pendingAssistedSurfaceRepairRequests = new Map<string, (message: Extract<BackendMessage, { type: 'native_surface_repair_result' }>) => void>()
  const pendingCustomSurfaceSaves = new Map<string, (ok: boolean, error?: string) => void>()
  const appearanceActionStatuses = new Map<string, AppearanceMemoryActionStatus & { receivedAt: number }>()
  const optimisticSlotActions = new Map<string, { status: SlotRecord['status']; statusText: string; intent?: RegenerationIntent; triggerType?: SlotRecord['triggerType']; previousRecord: SlotRecord; basedOnUpdatedAt: number }>()
  type ReplacementStatusProjection = { marker: Comment; previousOwner: HTMLElement; previousImage?: HTMLImageElement; previousImages: Array<{ image: HTMLImageElement; visibility: string; hidden: boolean }>; projection: HTMLElement; previousImageUrl: string; previousImageId?: string; previousImageVisibility: string; previousImageHidden: boolean }
  const replacementStatusProjections = new Map<string, ReplacementStatusProjection>()
  const activeSwipeByMessage = new Map<string, number>()
  const openedSlotPreviewKeys = new Set<string>()
  let activeSlotPreviewKey: string | null = null
  let parserConnections: ParserConnection[] = []
  let frontendParserConnections: ParserConnection[] | null = null
  let imageConnections: ImageConnection[] = []
  let imageProviders: ImageProviderInfo[] = []
  let loraCatalogState: { requestId: string; connectionId: string; status: 'idle' | 'loading' | 'completed' | 'failed'; items: string[]; error: string } = { requestId: '', connectionId: '', status: 'idle', items: [], error: '' }
  let activeLoraCatalogRender: (() => void) | null = null
  let closeActiveHelpPopover: (() => void) | null = null
  let logs: RouterLogEntry[] = []
  let backendBuild: BackendBuildInfo | null = null
  let schemaVersion = 0
  let stateRevision = -1
  let lastChatStateReceivedAt = 0
  let lastLifecycleRefreshAt = 0
  let lastDisplayContractSignature = ''
  let pendingProseSettingsWrite: { settings: ProseIllustratorSettings; sentAt: number } | null = null
  let pendingPromptPreviewRequestId: string | null = null
  let pendingConfigPatches: Array<{ patch: Partial<RouterConfig>; sentAt: number }> = []
  const settingsPatchQueue: Array<{ operationId: string; expectedRevision: number; patch: RelaySettingsPatch }> = []
  let settingsPatchInFlight: string | null = null
  let narrativeUtilityRegistry: NarrativeUtilityInjectionRecord[] = []
  let narrativeUtilityRegistryRequested = false
  const appearanceSaveWatchdogs = new Map<string, number>()
  let selfTest: { checks: RelayHealthCheck[]; buildMatch: boolean } | null = null
  const frontendLoadedAt = Date.now()
  const frontendSessionId = `relay-${frontendLoadedAt}-${Math.random().toString(36).slice(2, 10)}`
  const frontendPlatformClass: 'mobile' | 'desktop' = /Android|Mobile|iPhone|iPad/i.test(navigator.userAgent) || window.matchMedia('(max-width: 768px)').matches ? 'mobile' : 'desktop'
  let config: RouterConfig | null = null
  let activeChatId: string | null = ctx.getActiveChat().chatId
  let activeTab: DrawerTab = 'slots'
  let selectedStoryEventId = ''
  let storyGraphCleanup: (() => void) | undefined
  lifecycle.track(() => storyGraphCleanup?.(), 'observer')
  let pendingStoryEventNavigation = ''
  let storyIncludeInactiveSwipes = false
  let storyAnalysisExpanded = false
  let storySettingsExpanded = false
  let storyProposalVisibleLimit = 80
  let storyEventVisibleLimit = 80
  const storyPhoneVisibleByOwner = new Map<string, number>()
  let nativeImageSettingsCache: Record<string, unknown> = {}
  let nativeImageSettingsCachedAt = 0
  let nativeImageSettingsCacheChatId: string | null = null
  let nativeSettingsLastSyncedAt = 0
  let nativeSettingsFetchInFlight: Promise<NativeSettingsSnapshot | null> | null = null
  let nativeSettingsFetchInFlightChatId: string | null = null
  let nativeSettingsFetchToken: object | null = null
  const NATIVE_SETTINGS_CACHE_TTL_MS = 1_000
  const nativeSnapshotScanAttempts = new Map<string, number>()
  const nativeSnapshotScanTimers = new Map<string, number>()
  const nativeSnapshotScanWarned = new Set<string>()
  let terminalStateRefreshTimer = 0
  let recipeEditorId = ''
  let narrativeUtilityEditorId = ''
  let historySubTab: HistorySubTab = 'all-chats-gallery'
  let completedHistoryChatId = ''
  let completedHistoryRows: Array<Record<string, unknown>> = []
  let completedHistoryNextCursor: number | null = null
  let completedHistoryTotal = 0
  let completedHistoryRequestedForCount = -1
  let completedHistoryAutoPageCursor = -1
  const pendingCompletedRecordLoads = new Map<string, (record: SlotRecord | null) => void>()
  let vaultSelectedCharacterId = ''
  const streamPreviews = new Map<string, { imageDataUrl?: string; statusText?: string; updatedAt: number; source: string; streaming?: boolean; step?: number; totalSteps?: number; failed?: boolean }>()
  const completedPreviewGenerations = new Set<string>()
  const panelScrollTopByTab = new Map<DrawerTab, number>()
  let tabStripScrollLeft = 0
  let slotFilter: SlotFilter = 'all'
  let historyFilter: SlotFilter = 'all'
  let assetQuery = ''
  let assetFavoriteOnly = false
  let allChatsQuery = ''
  let allChatsCharacterFilter = 'all'
  let allChatsTargetFilter = 'all'
  let allChatsSurfaceFilter = 'all'
  let allChatsDateFilter = 'all'
  let allChatsStatusFilter = 'all'
  let assetTargetFilter: ImageTarget | 'all' = 'all'
  let selectedAssetId = ''
  let rescanInProgress = false
  const autoResumeRecoveredSignatures = new Map<string, string>()
  let lastRescanSummary: ChatRescanSummary | null = null
  let lastStatus = ''

  const sendFrontendSession = (connected: boolean, heartbeat = false) => ctx.sendToBackend({
    type: 'frontend_session',
    chatId: activeChatId,
    sessionId: frontendSessionId,
    connected,
    nativeSettingsAvailable: Boolean(Object.keys(nativeImageSettingsCache).length),
    platformClass: frontendPlatformClass,
    heartbeat,
  })
  const activePlacementVisuals = new Set<string>()
  let placementVisualHeartbeatTimer = 0
  const beginPlacementVisualHeartbeat = (versionKey: string) => {
    activePlacementVisuals.add(versionKey)
    if (placementVisualHeartbeatTimer) return
    placementVisualHeartbeatTimer = window.setInterval(() => sendFrontendSession(true, true), 10_000)
  }
  const finishPlacementVisualHeartbeat = (versionKey: string) => {
    activePlacementVisuals.delete(versionKey)
    if (activePlacementVisuals.size || !placementVisualHeartbeatTimer) return
    window.clearInterval(placementVisualHeartbeatTimer)
    placementVisualHeartbeatTimer = 0
  }
  const clearPlacementVisualHeartbeats = () => {
    activePlacementVisuals.clear()
    if (placementVisualHeartbeatTimer) window.clearInterval(placementVisualHeartbeatTimer)
    placementVisualHeartbeatTimer = 0
  }

  const submissionId = (action: SlotActionKind, key: string) => `${action}:${key}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`

  function surfaceDisplayContractSignature(nextConfig: RouterConfig, studio: CustomSurfaceStudioState): string {
    const definitions = Object.values(studio.definitions || {})
      .map(definition => {
        const { promptEnabled: _promptEnabled, promptModule: _promptModule, updatedAt: _updatedAt, ...displayDefinition } = definition
        return displayDefinition
      })
      .sort((left, right) => left.surfaceId.localeCompare(right.surfaceId))
    return JSON.stringify({
      rendererMode: nextConfig.surfaceRendererMode,
      shellMode: nextConfig.surfaceDefaultShellMode,
      colorMode: nextConfig.surfaceColorMode,
      activePresetIds: studio.activePresetIds,
      rendererScriptOverrides: studio.rendererScriptOverrides || {},
      definitions,
    })
  }

  function invalidateDisplayIfContractChanged(nextConfig: RouterConfig, studio: CustomSurfaceStudioState): void {
    const signature = surfaceDisplayContractSignature(nextConfig, studio)
    // A cold host render can happen before Relay receives the saved custom
    // Surface registry. Refresh once on first hydration too, otherwise those
    // already-visible messages keep raw [custom_root] text until some later
    // unrelated setting change happens to invalidate Lumiverse's display.
    const changed = lastDisplayContractSignature !== signature
    lastDisplayContractSignature = signature
    // Display invalidation remounts the host's resolved Surface DOM. Restrict it
    // to actual renderer-contract changes; slot status and preview updates are
    // patched into the existing media nodes by bindInlineImages().
    if (changed) ctx.display?.invalidate(['*'])
  }

  function setOptimisticSlotBusy(key: string, statusText: string, intent?: unknown): void {
    const current = recordByKey.get(key)
    if (!current) return
    const lower = statusText.toLocaleLowerCase()
    const status: SlotRecord['status'] = lower.includes('repars') || lower.includes('pars')
      ? 'parsing'
      : lower.includes('repair') || lower.includes('insert') || lower.includes('place')
        ? 'placement-pending'
        : 'queued'
    const typedIntent = intent as RegenerationIntent | undefined
    const regeneration = lower.includes('regenerat')
    const previous = optimisticSlotActions.get(key)
    const triggerType: SlotRecord['triggerType'] | undefined = regeneration
      ? typedIntent ? 'intent-regeneration' : 'regenerate-same-settings'
      : undefined
    optimisticSlotActions.set(key, {
      status, statusText, intent: typedIntent, triggerType,
      previousRecord: previous?.previousRecord || current,
      basedOnUpdatedAt: previous?.basedOnUpdatedAt ?? current.updatedAt,
    })
    const next = { ...current, status, triggerType: triggerType || current.triggerType, regenerationIntent: typedIntent || current.regenerationIntent }
    records = records.map(record => record.key === key ? next : record)
    recordByKey.set(key, next)
    if (regeneration && current.imageUrl) requestReplacementStatusProjection(next)
    streamPreviews.set(key, { statusText, updatedAt: Date.now(), source: 'relay-slot', streaming: false, failed: false })
    renderPanel()
    scheduleBindInlineImages()
    renderRelayOrb()
  }

  function restoreOptimisticSlotAction(key: string): void {
    const optimistic = optimisticSlotActions.get(key)
    if (!optimistic) return
    optimisticSlotActions.delete(key)
    records = records.map(record => record.key === key ? optimistic.previousRecord : record)
    recordByKey.set(key, optimistic.previousRecord)
    if (optimistic.triggerType && optimistic.previousRecord.imageUrl) {
      restorePreviousLifecycleImage(optimistic.previousRecord)
    }
    renderPanel()
    scheduleBindInlineImages()
  }

  function finishOptimisticSlotBusy(key: string, status: 'completed' | 'failed', message?: string): void {
    optimisticSlotActions.delete(key)
    const current = recordByKey.get(key)
    if (status === 'failed' && current) {
      restorePreviousLifecycleImage(current)
      const failed = { ...current, status: 'failed' as const, error: message || 'Relay could not complete the action.' }
      records = records.map(record => record.key === key ? failed : record)
      recordByKey.set(key, failed)
    }
    streamPreviews.set(key, {
      ...streamPreviews.get(key),
      statusText: status === 'completed' ? 'Completed.' : message || 'Action failed.',
      updatedAt: Date.now(), source: 'relay-slot', streaming: false, failed: status === 'failed',
    })
    renderPanel()
    scheduleBindInlineImages()
    ctx.sendToBackend({ type: 'list_state', chatId: activeChatId })
  }
  let proseSettingsRenderFrame = 0
  let menuEl: HTMLElement | null = null
  let menuDismissCleanup: (() => void) | null = null
  let confirmEl: HTMLElement | null = null
  let bindTimer = 0
  let activeChatSyncTimer = 0
  let longPressTimer = 0
  let longPressKey = ''
  let longPressTriggeredKey = ''
  let relayOrb: HTMLButtonElement | null = null
  let relayOrbCleanup: (() => void) | null = null
  let relayOrbLongPressTimer = 0
  let relayOrbLongPressTriggered = false
  let relayOrbIsDragging = false
  let sidecarNoticeEl: HTMLElement | null = null
  let sidecarNoticeTimer = 0
  let illustratorAdvancedOpen = false
  let modelPlacedMissingRequest: { chatId: string; messageId: string; runtimeDirective: string } | null = null
  let relayOrbStatus: 'idle' | 'scanning' | 'analyzing' | 'preparing' | 'generating' | 'ready' | 'empty' | 'failed' | 'canceled' = 'idle'
  let localSidecarAnalysisStartedAt = 0
  let quickStartAutoOpened = false
  let deferredPanelRenderElement: Element | null = null
  const logFilters = { severity: 'all', stage: 'all', requestId: '', target: 'all', providerModel: '', order: 'newest' as 'newest' | 'oldest' }
  const errorToastKeys = new Set<string>()
  const autoRescannedChats = new Set<string>()

  type NativeSurfaceTagPayload = {
    chatId?: string
    messageId?: string
    tagName?: string
    attrs?: Record<string, string>
    content?: string
    fullMatch?: string
    isUser?: boolean
    isStreaming?: boolean
    sourceContent?: string
    swipeId?: number
  }
  const lifecycleScanTimers = new Map<string, number>()
  const lifecycleScanCooldown = new Map<string, number>()
  const lifecycleStreamingSignatures = new Map<string, string>()
  let instantStreamEpoch = 0
  const bracketIllustrationStream = new BracketIllustrationStream()
  const lifecycleInterceptorCleanups: Array<() => void> = []

  function cancelPendingLifecycleScans(): void {
    instantStreamEpoch += 1
    bracketIllustrationStream.clear()
    for (const timer of lifecycleScanTimers.values()) window.clearTimeout(timer)
    lifecycleScanTimers.clear()
  }

  function scheduleLifecycleAutoScan(payload: NativeSurfaceTagPayload): void {
    if (payload?.isUser) return
    const chatId = String(payload?.chatId || activeChatId || '')
    const messageId = String(payload?.messageId || '')
    if (!chatId || !messageId) return
    const liveSettings = currentProseSettings()
    const instantStreaming = payload.isStreaming === true
      && String(payload.tagName || '').toLocaleLowerCase() === 'reverie-illustration'
      && String(payload.attrs?.request || '').toLocaleLowerCase() === 'generate'
      && chatId === activeChatId
      && liveSettings.enabled
      && liveSettings.mode === 'inline-protocol'
      && liveSettings.instantIllustrationDispatch
    if (instantStreaming) ctx.sendToBackend({
      type: 'instant_stream_probe', chatId, messageId,
      requestId: String(payload.attrs?.slot || payload.attrs?.id || ''),
      phase: 'interceptor', streaming: true,
      instantEnabled: true, mode: liveSettings.mode,
    })
    if (payload.isStreaming === true && !instantStreaming) return
    const messageKey = `${chatId}:${messageId}`
    // Every completed request needs its own pending resolution. A later tag
    // in the same response must not cancel an earlier illustration's timer.
    const key = instantStreaming ? `${messageKey}:${String(payload.attrs?.slot || payload.attrs?.id || '')}` : messageKey
    if (!instantStreaming) {
      for (const [pendingKey, pendingTimer] of lifecycleScanTimers) {
        if (pendingKey.startsWith(`${messageKey}:`)) {
          window.clearTimeout(pendingTimer)
          lifecycleScanTimers.delete(pendingKey)
          lifecycleStreamingSignatures.delete(pendingKey)
        }
      }
    }
    const existing = lifecycleScanTimers.get(key)
    if (existing) window.clearTimeout(existing)
    if (!instantStreaming) lifecycleStreamingSignatures.delete(key)
    const scheduledEpoch = instantStreamEpoch
    const timer = window.setTimeout(() => {
      lifecycleScanTimers.delete(key)
      if (instantStreaming) {
        void scanInstantStreamingModelPlannedMessage(chatId, messageId, key, payload, 0, scheduledEpoch)
        return
      }
      const now = Date.now()
      if (now - (lifecycleScanCooldown.get(key) || 0) < 900) return
      lifecycleScanCooldown.set(key, now)
      // First-paint path: tell the backend to discover the request immediately.
      // Native settings sync is useful but must never delay the inline Status Card.
      ctx.sendToBackend({ type: 'scan_message', chatId, messageId, automatic: true })
      void syncNativeSettings().catch(() => null)
    }, 10)
    lifecycleScanTimers.set(key, timer)
  }

  async function scanInstantStreamingModelPlannedMessage(chatId: string, messageId: string, key: string, payload: NativeSurfaceTagPayload, retry: number, epoch: number): Promise<void> {
    const settings = currentProseSettings()
    if (epoch !== instantStreamEpoch || !settings.enabled || settings.mode !== 'inline-protocol' || !settings.instantIllustrationDispatch || chatId !== activeChatId) return
    try {
      const domApi = (ctx as any).dom
      const bubble = typeof domApi?.findMessageElement === 'function' ? domApi.findMessageElement(messageId) : null
      const messageContent = bubble?.querySelector?.('[data-component="MessageContent"]') as HTMLElement | null
      const renderedText = String(messageContent?.innerText || messageContent?.textContent || '')
      const anchor = messageContent ? findInstantIllustrationAnchor(messageContent, String(payload.attrs?.slot || payload.attrs?.id || '')) : { cardFound: false, text: null }
      const precedingAnchorText = anchor.text
      const sourceContent = payload.sourceContent || buildInstantIllustrationSource(renderedText, payload, precedingAnchorText)
      ctx.sendToBackend({
        type: 'instant_stream_probe', chatId, messageId,
        requestId: String(payload.attrs?.slot || payload.attrs?.id || ''),
        phase: 'source-resolution', streaming: payload.isStreaming === true,
        instantEnabled: true, mode: settings.mode,
        cardFound: anchor.cardFound, anchorLength: precedingAnchorText?.length || 0,
        sourceReady: Boolean(sourceContent),
      })
      if (!sourceContent) {
        // Interception runs before React has necessarily mounted the island.
        // Retry briefly; completed-response discovery remains the safe fallback.
        if (retry < INSTANT_STREAM_RENDER_MAX_RETRIES) {
          const timer = window.setTimeout(() => {
            lifecycleScanTimers.delete(key)
            void scanInstantStreamingModelPlannedMessage(chatId, messageId, key, payload, retry + 1, epoch)
          }, INSTANT_STREAM_RENDER_RETRY_MS)
          lifecycleScanTimers.set(key, timer)
        }
        return
      }

      const messagesApi = (ctx as any).messages
      const recentMessages = typeof messagesApi?.getRecent === 'function' ? messagesApi.getRecent(16) : []
      const message = Array.isArray(recentMessages) ? recentMessages.find(candidate => candidate?.id === messageId) : null
      if (message?.is_user === true) return
      const swipeId = Number.isFinite(Number(payload.swipeId)) ? Number(payload.swipeId) : Number.isFinite(Number(message?.swipe_id)) ? Number(message.swipe_id) : 0
      let hash = 2166136261
      for (let cursor = 0; cursor < sourceContent.length; cursor += 1) hash = Math.imul(hash ^ sourceContent.charCodeAt(cursor), 16777619)
      const slot = String(payload.attrs?.slot || 'request')
      const signature = `${slot}:${sourceContent.length}:${hash >>> 0}`
      if (lifecycleStreamingSignatures.get(key) === signature) return
      lifecycleStreamingSignatures.set(key, signature)
      if (lifecycleStreamingSignatures.size > 512) lifecycleStreamingSignatures.delete(lifecycleStreamingSignatures.keys().next().value as string)
      // Message-tag interceptors expose the complete tag while it streams, but
      // the host message store does not expose its live text buffer. Read only
      // the rendered message body, recover the preceding prose, and append the
      // exact intercepted tag. Never write partial text back to Lumiverse.
      ctx.sendToBackend({ type: 'scan_message', chatId, messageId, swipeId, sourceContent, automatic: false, streaming: true })
      void syncNativeSettings().catch(() => null)
    } catch (error) {
      if (config?.debugLogging) console.warn('[Reverie Relay] Instant Model Planned stream scan failed.', error)
    }
  }

  function registerLifecycleAutoScanInterceptors(): void {
    const messagesApi = (ctx as any).messages
    if (typeof messagesApi?.registerTagInterceptor !== 'function') return
    for (const tagName of [...new Set([...NATIVE_SURFACE_ROOT_TAGS, 'reverie-illustration', 'image_request'])]) {
      try {
        const unregister = messagesApi.registerTagInterceptor.call(
          messagesApi,
          { tagName, removeFromMessage: false },
          (payload: NativeSurfaceTagPayload) => scheduleLifecycleAutoScan(payload),
        )
        if (typeof unregister === 'function') lifecycleInterceptorCleanups.push(unregister)
      } catch (error) {
        console.warn(`[Reverie Relay] ${tagName} auto-scan interception is unavailable.`, error)
      }
    }
  }

  registerLifecycleAutoScanInterceptors()

  lifecycle.track(ctx.events.on('GENERATION_STARTED', (payload: any) => {
    if (payload?.chatId !== activeChatId) return
    cancelPendingLifecycleScans()
    lifecycleStreamingSignatures.clear()
    bracketIllustrationStream.start(String(payload.generationId || ''), String(payload.chatId || ''), String(payload.targetMessageId || ''), Number(payload.targetSwipeId) || 0)
  }), 'subscription')
  lifecycle.track(ctx.events.on('STREAM_TOKEN_RECEIVED', (payload: any) => {
    const settings = currentProseSettings()
    if (payload?.chatId !== activeChatId || !settings.enabled || settings.mode !== 'inline-protocol' || !settings.instantIllustrationDispatch) return
    for (const request of bracketIllustrationStream.push(payload)) scheduleLifecycleAutoScan({
      ...request, tagName: 'reverie-illustration', isStreaming: true, isUser: false,
    })
  }), 'subscription')
  for (const event of ['GENERATION_ENDED', 'GENERATION_STOPPED']) lifecycle.track(ctx.events.on(event, (payload: any) => {
    if (payload?.chatId !== activeChatId) return
    bracketIllustrationStream.clear()
    // Completed-response discovery owns the final reconciliation.
  }), 'subscription')

  const removeStyle = ctx.dom.addStyle(`
    .dg-router-panel {
      --dgir-bg: color-mix(in srgb, var(--lumiverse-fill, #17121a) 88%, transparent);
      --dgir-surface: color-mix(in srgb, var(--lumiverse-fill, #211825) 86%, transparent);
      --dgir-surface-raised: color-mix(in srgb, var(--lumiverse-fill-subtle, #2c2130) 90%, transparent);
      --dgir-surface-soft: color-mix(in srgb, var(--lumiverse-fill-subtle, #2c2130) 76%, transparent);
      --dgir-border: color-mix(in srgb, var(--lumiverse-border, #5a465d) 44%, transparent);
      --dgir-border-bright: color-mix(in srgb, var(--lumiverse-primary, #e980b7) 34%, var(--lumiverse-border, #5a465d));
      --dgir-text: var(--lumiverse-text, #f8f3fa);
      --dgir-text-muted: var(--lumiverse-text-muted, #c2b3c5);
      --dgir-text-dim: var(--lumiverse-text-dim, #8e7f92);
      --dgir-accent: var(--lumiverse-primary, var(--lumiverse-accent, #e980b7));
      --dgir-accent-text: var(--lumiverse-primary-text, var(--lumiverse-accent-fg, #fff7fb));
      --dgir-accent-soft: color-mix(in srgb, var(--dgir-accent) 14%, transparent);
      --dgir-accent-glow: color-mix(in srgb, var(--dgir-accent) 28%, transparent);
      --dgir-lavender: color-mix(in srgb, var(--dgir-accent) 56%, #c8b5ff);
      --dgir-success: var(--lumiverse-success, #91d7bd);
      --dgir-danger: var(--lumiverse-danger, #e88396);
      --dgir-warning: var(--lumiverse-warning, #e7c079);
      --dgir-glass-line: color-mix(in srgb, var(--lumiverse-border, #5a465d) 30%, transparent);
      --dgir-glass-highlight: color-mix(in srgb, var(--lumiverse-primary, #e980b7) 4%, rgba(255,255,255,.045));
      --dgir-shadow: 0 12px 32px rgba(5, 2, 12, .26);
      --dgir-radius-sm: 12px;
      --dgir-radius-md: 17px;
      --dgir-radius-lg: 22px;
      position: relative;
      isolation: isolate;
      overflow: hidden;
      padding: 12px;
      color: var(--dgir-text);
      background:
        radial-gradient(ellipse at 88% 0%, color-mix(in srgb, var(--dgir-accent) 13%, transparent), transparent 36%),
        radial-gradient(ellipse at 4% 42%, color-mix(in srgb, var(--dgir-lavender) 7%, transparent), transparent 34%),
        linear-gradient(155deg, color-mix(in srgb, var(--dgir-bg) 88%, transparent), color-mix(in srgb, var(--dgir-bg) 78%, transparent));
      border: 1px solid var(--dgir-glass-line);
      border-radius: var(--dgir-radius-lg);
      box-shadow: var(--dgir-shadow), inset 0 1px var(--dgir-glass-highlight);
      -webkit-backdrop-filter: blur(18px);
      backdrop-filter: blur(18px);
      font-family: var(--lumiverse-font-family, system-ui, sans-serif);
      letter-spacing: 0;
    }
    .dg-router-panel::before { content: ''; position: absolute; inset: 0; z-index: -1; pointer-events: none; opacity: .22; background-image: radial-gradient(1px 1px at 9% 13%, color-mix(in srgb, var(--dgir-accent) 76%, white) 0 70%, transparent 100%), radial-gradient(1px 1px at 29% 31%, rgba(255,255,255,.72) 0 65%, transparent 100%), radial-gradient(1px 1px at 71% 18%, color-mix(in srgb, var(--dgir-lavender) 82%, white) 0 68%, transparent 100%), radial-gradient(1px 1px at 91% 42%, rgba(255,255,255,.65) 0 65%, transparent 100%), radial-gradient(1px 1px at 45% 72%, color-mix(in srgb, var(--dgir-accent) 70%, white) 0 65%, transparent 100%), radial-gradient(1px 1px at 16% 88%, rgba(255,255,255,.6) 0 65%, transparent 100%); background-size: 100% 100%; mask-image: linear-gradient(to bottom, #000, transparent 80%); }
    :root[data-dgir-theme="clean-panel"] .dg-router-panel {
      --dgir-bg: color-mix(in srgb, var(--lumiverse-fill, #19171d) 92%, #06060a);
      --dgir-surface: color-mix(in srgb, var(--lumiverse-fill-subtle, #25222b) 86%, #101014);
      --dgir-surface-raised: color-mix(in srgb, var(--lumiverse-fill-subtle, #2c2932) 92%, #15131a);
      --dgir-surface-soft: color-mix(in srgb, var(--lumiverse-fill-subtle, #2c2932) 72%, transparent);
      --dgir-border: color-mix(in srgb, var(--lumiverse-border, #5c5666) 82%, transparent);
      --dgir-border-bright: color-mix(in srgb, var(--lumiverse-primary, #9db6ff) 44%, var(--lumiverse-border, #5c5666));
      --dgir-shadow: 0 8px 22px rgba(0,0,0,.24);
      background: linear-gradient(180deg, var(--dgir-bg), color-mix(in srgb, var(--dgir-bg) 88%, var(--dgir-surface)));
      -webkit-backdrop-filter: none;
      backdrop-filter: none;
    }
    :root[data-dgir-theme="clean-panel"] .dg-router-panel::before,
    :root[data-dgir-theme="clean-panel"] .dg-router-panel .dg-head::after,
    :root[data-dgir-theme="clean-panel"] .dg-router-panel .dg-prism::after { display: none; }
    :root[data-dgir-theme="clean-panel"] .dg-router-panel .dg-head,
    :root[data-dgir-theme="clean-panel"] .dg-router-panel .dg-section,
    :root[data-dgir-theme="clean-panel"] .dg-router-panel .dg-slot-card,
    :root[data-dgir-theme="clean-panel"] .dg-router-panel .dg-relay-candidate,
    :root[data-dgir-theme="clean-panel"] .dg-router-panel .dg-surface-card,
    :root[data-dgir-theme="clean-panel"] .dg-router-panel .dg-suite-primary {
      background: var(--dgir-surface);
      box-shadow: none;
      -webkit-backdrop-filter: none;
      backdrop-filter: none;
    }
    :root[data-dgir-theme="clean-panel"] .dg-router-panel .dg-btn { background: var(--dgir-surface-soft); -webkit-backdrop-filter: none; backdrop-filter: none; }
    :root[data-dgir-theme="clean-panel"] .dg-router-panel .dg-btn-primary { background: var(--dgir-accent-soft); }
    :root[data-dgir-theme="clean-panel"] .dg-router-panel .dg-tab-active {
      background: var(--dgir-surface-raised);
      box-shadow: none;
    }
    .dg-router-panel .dg-head { position: relative; display: grid; gap: 10px; padding: 14px; margin-bottom: 11px; border: 1px solid var(--dgir-glass-line); border-radius: var(--dgir-radius-lg); background: radial-gradient(ellipse at 100% 0%, color-mix(in srgb, var(--dgir-accent) 11%, transparent), transparent 48%), linear-gradient(145deg, color-mix(in srgb, var(--dgir-surface-raised) 74%, transparent), color-mix(in srgb, var(--dgir-surface) 62%, transparent)); box-shadow: 0 12px 32px rgba(5,2,12,.2), inset 0 1px var(--dgir-glass-highlight); -webkit-backdrop-filter: blur(16px); backdrop-filter: blur(16px); overflow: hidden; }
    .dg-router-panel .dg-head::after { content: ''; position: absolute; top: -86px; right: -34px; width: 190px; height: 190px; border: 0; border-radius: 50%; background: radial-gradient(circle, color-mix(in srgb, var(--dgir-accent) 18%, transparent), transparent 70%); opacity: .75; pointer-events: none; }
    .dg-router-panel .dg-head-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
    .dg-router-panel .dg-brand { display: flex; align-items: flex-start; gap: 9px; min-width: 0; }
    .dg-router-panel .dg-prism { position: relative; flex: 0 0 36px; width: 36px; height: 36px; display: grid; place-items: center; overflow: hidden; color: var(--dgir-accent-text); border: 1px solid var(--dgir-border-bright); border-radius: var(--dgir-radius-md); background: linear-gradient(145deg, var(--dgir-accent-soft), rgba(255,255,255,.035)); box-shadow: inset 0 0 14px var(--dgir-accent-soft); }
    .dg-router-panel .dg-prism::before, .dg-router-panel .dg-prism::after { content: none; display: none; }
    .dg-router-panel .dg-prism-image { display: block; width: 100%; height: 100%; padding: 2px; object-fit: contain; }
    .dg-router-panel .dg-prism-overview { flex: 0 0 54px; width: 54px; height: 54px; overflow: visible; border: 0; border-radius: 0; background: transparent !important; background-color: transparent !important; box-shadow: none !important; }
    .dg-router-panel .dg-prism-overview .dg-prism-image { width: 100%; height: 100%; padding: 0; object-fit: contain; }
    .dg-router-panel .dg-title { font-family: var(--lumiverse-font-family, system-ui, sans-serif); font-size: 17px; font-weight: 800; letter-spacing: -.025em; line-height: 1.15; overflow-wrap: anywhere; }
    .dg-router-panel .dg-title-line { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; }
    .dg-router-panel .dg-build-chip { padding: 2px 5px; border: 1px solid var(--dgir-border); border-radius: 999px; color: var(--dgir-text-dim); font: 10px/1.2 ui-monospace, SFMono-Regular, Consolas, monospace; }
    .dg-router-panel .dg-sub { margin-top: 3px; color: var(--dgir-text-muted); font-size: 11px; line-height: 1.35; }
    .dg-router-panel .dg-summary { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 6px; }
    .dg-router-panel .dg-count { position: relative; min-width: 0; display: grid; grid-template-columns: auto minmax(0, 1fr); align-items: center; gap: 7px; padding: 7px 8px; border: 1px solid var(--dgir-border); border-radius: var(--dgir-radius-md); background: color-mix(in srgb, var(--dgir-surface-soft) 76%, transparent); }
    .dg-router-panel .dg-count-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--dgir-text-dim); box-shadow: 0 0 7px currentColor; }
    .dg-router-panel .dg-count-processing .dg-count-dot { color: var(--dgir-lavender); background: currentColor; }
    .dg-router-panel .dg-count-ready .dg-count-dot { color: #f29a63; background: currentColor; }
    .dg-router-panel .dg-count-failed .dg-count-dot { color: var(--dgir-danger); background: currentColor; }
    .dg-router-panel .dg-count-completed .dg-count-dot { color: var(--dgir-success); background: currentColor; }
    .dg-router-panel .dg-main-ready-indicator { display: inline-flex; align-items: center; gap: 7px; }
    .dg-router-panel .dg-main-ready-indicator::before { content: ''; flex: 0 0 7px; width: 7px; height: 7px; border-radius: 50%; background: #f29a63; box-shadow: 0 0 8px rgba(242,154,99,.58); }
    .dg-router-panel .dg-count-copy { min-width: 0; }
    .dg-router-panel .dg-count b { display: block; font-size: 14px; line-height: 1; }
    .dg-router-panel .dg-count span { display: block; margin-top: 2px; color: var(--dgir-text-muted); font-size: 10px; overflow: hidden; text-overflow: ellipsis; }
    .dg-router-panel .dg-tabs { display: grid; grid-auto-flow: column; grid-auto-columns: minmax(0,1fr); gap: 2px; margin-bottom: 10px; padding: 3px; overflow: hidden; scrollbar-width: none; border: 1px solid var(--dgir-border); border-radius: var(--dgir-radius-lg); background: color-mix(in srgb, var(--dgir-surface) 86%, transparent); box-shadow: inset 0 1px rgba(255,255,255,.035); }
    .dg-router-panel .dg-tab { position: relative; min-width: 0; min-height: 32px; border: 0; border-radius: var(--dgir-radius-sm); padding: 7px 5px; overflow: hidden; text-overflow: ellipsis; background: transparent; color: var(--dgir-text-muted); font: 700 11px/1 var(--lumiverse-font-family, system-ui, sans-serif); cursor: pointer; white-space: nowrap; }
    .dg-router-panel .dg-tab:hover { color: var(--dgir-text); background: rgba(255,255,255,.035); }
    .dg-router-panel .dg-tab-active { color: var(--dgir-accent-text); background: linear-gradient(180deg, var(--dgir-accent-soft), rgba(255,255,255,.025)); box-shadow: inset 0 0 12px var(--dgir-accent-soft); }
    .dg-router-panel .dg-tab-active::after { content: ''; position: absolute; left: 18%; right: 18%; bottom: 1px; height: 1px; background: var(--dgir-accent); box-shadow: 0 0 8px var(--dgir-accent-glow); }
    .dg-router-panel .dg-router-empty { color: var(--dgir-text-muted); font-size: 12px; line-height: 1.45; padding: 14px 4px; }
    .dg-router-panel .dg-section { border: 1px solid var(--dgir-glass-line); background: linear-gradient(145deg, color-mix(in srgb, var(--dgir-surface) 72%, transparent), color-mix(in srgb, var(--dgir-surface-soft) 68%, transparent)); border-radius: var(--dgir-radius-lg); padding: 11px; margin-bottom: 10px; box-shadow: 0 9px 24px rgba(5,2,12,.12), inset 0 1px var(--dgir-glass-highlight); -webkit-backdrop-filter: blur(14px); backdrop-filter: blur(14px); }
    .dg-router-panel .dg-section-title { margin: 0 0 9px; color: var(--dgir-text); font: 750 12px/1.25 var(--lumiverse-font-family, system-ui, sans-serif); letter-spacing: .075em; }
    .dg-router-panel details.dg-section > summary.dg-section-title { margin:0; cursor:pointer; list-style-position:inside; }
    .dg-router-panel details.dg-section[open] > summary.dg-section-title { margin-bottom:9px; }
    .dg-router-panel .dg-section-sub { margin: -4px 0 9px; color: var(--dgir-text-muted); font-size: 12px; line-height: 1.4; }
    .dg-router-panel .dg-story-stack { display:grid; gap:9px; min-width:0; }
    .dg-router-panel .dg-story-card { min-width:0; padding:10px; border:1px solid color-mix(in srgb,var(--dgir-border) 66%,transparent); border-radius:var(--dgir-radius-md); background:linear-gradient(145deg,color-mix(in srgb,var(--dgir-surface-raised) 60%,transparent),color-mix(in srgb,var(--dgir-surface-soft) 56%,transparent)); box-shadow:inset 0 1px color-mix(in srgb,var(--dgir-glass-highlight) 55%,transparent); }
    .dg-router-panel .dg-story-title { margin:0 0 5px; font-size:13px; font-weight:800; overflow-wrap:anywhere; }
    .dg-router-panel .dg-story-copy { margin:0 0 8px; color:var(--dgir-text-muted); font-size:11px; line-height:1.45; overflow-wrap:anywhere; }
    .dg-router-panel .dg-story-meta { display:flex; flex-wrap:wrap; gap:5px; margin:5px 0 8px; color:var(--dgir-text-dim); font-size:10px; }
    .dg-router-panel .dg-story-pill { padding:3px 7px; border:1px solid color-mix(in srgb,var(--dgir-border) 60%,transparent); border-radius:999px; background:color-mix(in srgb,var(--dgir-surface) 52%,transparent); }
    .dg-router-panel .dg-story-constellation { position:relative; display:grid; grid-template-rows:auto auto auto; gap:34px; min-width:0; padding:18px 3px; isolation:isolate; background:radial-gradient(ellipse at center,color-mix(in srgb,var(--dgir-accent) 10%,transparent),transparent 72%); }
    .dg-router-panel .dg-story-orbit { z-index:1; display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:9px; min-width:0; }
    .dg-router-panel .dg-story-orbit > :last-child:nth-child(odd) { grid-column:1/-1; justify-self:center; width:min(100%,145px); }
    .dg-router-panel .dg-story-lines { position:absolute; inset:0; z-index:0; width:100%; height:100%; overflow:visible; pointer-events:none; }
    .dg-router-panel .dg-story-lines line { stroke:var(--dgir-accent); stroke-width:1.2; vector-effect:non-scaling-stroke; }
    .dg-router-panel .dg-story-lines line[data-belief="suspects"] { stroke-dasharray:2 3; }
    .dg-router-panel .dg-story-lines line[data-belief="rumor"] { stroke-dasharray:6 5; opacity:.62; }
    .dg-router-panel .dg-story-lines line[data-belief="misinformed"] { stroke-dasharray:7 2 1 2; stroke:var(--dgir-danger); }
    .dg-router-panel .dg-story-lines line[data-belief="unaware"] { opacity:.28; }
    .dg-router-panel .dg-story-lines line[data-belief="unknown"] { stroke-dasharray:1 5; opacity:.4; }
    .dg-router-panel .dg-story-center { z-index:1; justify-self:center; width:min(100%,220px); padding:18px 14px; border:1px solid var(--dgir-border-bright); border-radius:32px; background:color-mix(in srgb,var(--dgir-accent-soft) 60%,var(--dgir-surface)); box-shadow:0 6px 20px color-mix(in srgb,var(--dgir-accent-glow) 25%,transparent); text-align:center; font-size:12px; font-weight:800; overflow-wrap:anywhere; }
    .dg-router-panel .dg-story-actor { z-index:1; display:grid; justify-items:center; text-align:center; gap:5px; min-width:0; padding:12px 8px; border:1px solid color-mix(in srgb,var(--dgir-border-bright) 66%,transparent); border-radius:24px; background:color-mix(in srgb,var(--dgir-surface-raised) 94%,var(--dgir-surface)); font-size:11px; overflow-wrap:anywhere; }
    .dg-router-panel .dg-story-initial { display:grid; place-items:center; width:32px; height:32px; border-radius:50%; background:var(--dgir-accent-soft); border:1px solid var(--dgir-border-bright); font-size:14px; font-weight:800; }
    .dg-router-panel .dg-story-link { color:var(--dgir-text-muted); font-size:9px; }
    .dg-router-panel .dg-story-merge { min-width:0; }
    .dg-router-panel .dg-story-merge summary { cursor:pointer; color:var(--dgir-text-muted); }
    .dg-router-panel .dg-story-media { display:block; width:100%; max-height:240px; object-fit:contain; border-radius:var(--dgir-radius-md); background:color-mix(in srgb,var(--dgir-surface) 75%,transparent); }
    .dg-router-panel .dg-story-selected { border-color:var(--dgir-border-bright); }
    .dg-router-panel .dg-story-field { display:grid; gap:4px; min-width:0; color:var(--dgir-text-muted); font-size:10px; }
    .dg-router-panel .dg-story-field select,.dg-router-panel .dg-story-field input { min-width:0; width:100%; }
    .dg-router-panel .dg-story-gallery { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:8px; }
    .dg-router-panel .dg-story-image-button { display:block; width:100%; min-width:0; padding:0; overflow:hidden; border:1px solid var(--dgir-border); border-radius:var(--dgir-radius-md); background:var(--dgir-surface); cursor:zoom-in; }
    .dg-router-panel .dg-story-image-button:focus-visible { outline:2px solid var(--dgir-accent); outline-offset:3px; }
    .dg-router-panel .dg-story-image-button .dg-story-media { margin:0; }
    .dg-router-panel .dg-story-gallery .dg-story-media { height:100px; object-fit:cover; }
    .dg-router-panel .dg-story-manage { margin-top:12px; }
    .dg-router-panel .dg-story-manage > summary { cursor:pointer; min-height:44px; display:flex; align-items:center; font-weight:700; }
    .dg-router-panel .dg-story-manage .dg-actions select { width:100%; min-width:0; }
    @media (prefers-reduced-motion: reduce) { .dg-router-panel .dg-story-card, .dg-router-panel .dg-story-constellation { scroll-behavior:auto; animation:none!important; transition:none!important; } }
    .dg-router-panel .dg-field-help { margin-top: 5px; color: var(--dgir-text-dim); font-size: 10px; line-height: 1.45; }
    .dg-router-panel .dg-label-with-help,.dg-router-panel .dg-toggle-title-row { display:flex; align-items:center; gap:6px; min-width:0; }
    .dg-router-panel .dg-narrative-utility-row .rr-surface-svg-icon,.dg-router-panel .dg-narrative-utility-heading .rr-surface-svg-icon { display:inline-grid; place-items:center; flex:0 0 17px; width:17px; height:17px; color:var(--lumiverse-primary,#ff70bd); }
    .dg-router-panel .dg-narrative-utility-row .rr-surface-svg-icon svg,.dg-router-panel .dg-narrative-utility-heading .rr-surface-svg-icon svg { display:block; width:100%; height:100%; }
    .dg-router-panel .dg-narrative-utility-heading { display:flex; align-items:center; gap:8px; }
    .dg-router-panel .dg-toggle-title-row .dg-toggle-title { min-width:0; }
    .dg-router-panel .dg-help { position:relative; display:inline-grid; flex:0 0 auto; place-items:center; vertical-align:middle; }
    .dg-router-panel .dg-help-trigger { display:grid; place-items:center; width:17px; height:17px; padding:0; border:1px solid color-mix(in srgb,var(--dgir-accent) 45%,var(--dgir-border)); border-radius:50%; background:linear-gradient(145deg,var(--dgir-accent-soft),var(--dgir-surface-soft)); color:var(--dgir-accent-text); font:800 10px/1 var(--lumiverse-font-family,system-ui,sans-serif); cursor:help; box-shadow:inset 0 1px rgba(255,255,255,.08),0 0 8px color-mix(in srgb,var(--dgir-accent) 12%,transparent); }
    .dg-router-panel .dg-help-trigger:hover,.dg-router-panel .dg-help-trigger:focus-visible { border-color:var(--dgir-accent); outline:none; box-shadow:0 0 0 2px var(--dgir-accent-soft),0 0 12px var(--dgir-accent-glow); }
    .dg-router-panel .dg-help-popover { position:absolute; z-index:120; left:50%; bottom:calc(100% + 8px); width:min(244px,calc(100vw - 24px)); box-sizing:border-box; padding:8px 9px; border:1px solid color-mix(in srgb,var(--dgir-accent) 54%,#80506e); border-radius:var(--dgir-radius-md); background-color:#21121d; background-image:linear-gradient(145deg,#321b2b 0%,#21121d 58%,#140d13 100%); color:#fff7fc; font:600 10px/1.4 var(--lumiverse-font-family,system-ui,sans-serif); text-align:left; text-shadow:0 1px 1px rgba(0,0,0,.65); box-shadow:0 16px 38px rgba(0,0,0,.72),inset 0 1px rgba(255,255,255,.09); transform:translateX(-50%) translateY(3px); opacity:0; visibility:hidden; pointer-events:none; transition:opacity .14s ease,transform .14s ease,visibility .14s; }
    .dg-router-panel .dg-help.is-open .dg-help-popover { opacity:1; visibility:visible; transform:translateX(-50%) translateY(0); pointer-events:auto; }
    .dg-help-portal { position:fixed; inset:0; z-index:2147483000; pointer-events:none; }
    .dg-router-panel.dg-help-portal { padding:0; overflow:visible; isolation:auto; border:0; border-radius:0; background:none!important; box-shadow:none; }
    .dg-router-panel.dg-help-portal::before { content:none!important; display:none!important; }
    .dg-help-portal .dg-help-popover { position:fixed; right:auto; bottom:auto; max-height:min(240px,calc(100vh - 24px)); overflow:auto; transform:none; pointer-events:none; }
    .dg-help-portal .dg-help-popover.is-open { opacity:1; visibility:visible; transform:none; pointer-events:auto; }
    .dg-router-panel .dg-info-note { margin:7px 0; padding:10px 11px; border:1px solid color-mix(in srgb,var(--dgir-accent) 32%,var(--dgir-border)); border-left:3px solid var(--dgir-accent); border-radius:var(--dgir-radius-md); background:radial-gradient(circle at 0 0,var(--dgir-accent-soft),transparent 54%),color-mix(in srgb,var(--dgir-surface-soft) 92%,transparent); color:var(--dgir-text-muted); font-size:11px; line-height:1.5; box-shadow:inset 0 1px rgba(255,255,255,.035); }
    .dg-router-panel .dg-surface-creator { display: grid; gap: 12px; }
    .dg-router-panel .dg-creator-notice { display: grid; gap: 5px; padding: 12px 14px; border: 1px solid var(--dgir-border-bright); border-radius: var(--dgir-radius-lg); background: linear-gradient(135deg,var(--dgir-accent-soft),var(--dgir-surface-soft)); }
    .dg-router-panel .dg-creator-notice strong { color: var(--dgir-text); font-size: 13px; }
    .dg-router-panel .dg-creator-notice span { color: var(--dgir-text-muted); font-size: 11px; line-height: 1.5; }
    .dg-router-panel .dg-creator-section { display: grid; gap: 9px; padding: 12px; border: 1px solid var(--dgir-border); border-radius: var(--dgir-radius-lg); background: var(--dgir-surface-soft); }
    .dg-router-panel .dg-creator-section h3 { margin: 0; color: var(--dgir-text); font-size: 13px; }
    .dg-router-panel .dg-creator-section > p { margin: -3px 0 1px; color: var(--dgir-text-muted); font-size: 10px; line-height: 1.45; }
    .dg-router-panel .dg-creator-grid { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 9px; align-items: start; }
    .dg-router-panel .dg-creator-grid > .dg-field:has(textarea), .dg-router-panel .dg-creator-grid > .dg-toggle, .dg-router-panel .dg-creator-grid > .dg-actions { grid-column: 1 / -1; }
    .dg-router-panel .dg-creator-advanced { overflow: hidden; border: 1px solid var(--dgir-border); border-radius: var(--dgir-radius-lg); background: var(--dgir-surface-soft); }
    .dg-router-panel .dg-creator-advanced > summary { padding: 12px 14px; color: var(--dgir-text); font-size: 12px; font-weight: 800; cursor: pointer; }
    .dg-router-panel .dg-creator-advanced-body { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 9px; padding: 0 12px 12px; }
    .dg-router-panel .dg-creator-actions { position: sticky; bottom: 0; z-index: 3; justify-content: flex-end; padding: 10px; border: 1px solid var(--dgir-border); border-radius: var(--dgir-radius-lg); background: color-mix(in srgb,var(--dgir-bg) 92%,transparent); backdrop-filter: blur(12px); }
    @media(max-width:680px){.dg-router-panel .dg-creator-grid,.dg-router-panel .dg-creator-advanced-body{grid-template-columns:1fr}.dg-router-panel .dg-creator-grid > *,.dg-router-panel .dg-creator-advanced-body > *{grid-column:1!important}}
    .dg-router-panel .dg-settings { margin: 0; }
    .dg-router-panel .dg-settings-grid, .dg-router-panel .dg-filter-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; align-items: stretch; }
    .dg-router-panel .dg-settings-grid > *, .dg-router-panel .dg-filter-grid > * { min-width: 0; }
    .dg-router-panel .dg-settings-grid > .dg-btn { display: inline-flex; width: 100%; min-width: 0; min-height: 36px; justify-content: center; align-items: center; text-align: center; white-space: normal; overflow-wrap: anywhere; line-height: 1.25; }
    .dg-router-panel .dg-settings-grid > .dg-actions { grid-column: 1 / -1; width: 100%; }
    .dg-router-panel .dg-settings-grid > .dg-actions > .dg-btn { flex: 1 1 132px; max-width: 100%; min-width: 0; justify-content: center; text-align: center; white-space: normal; overflow-wrap: anywhere; line-height: 1.25; }
    .dg-router-panel .dg-toggle-grid { display: grid; grid-template-columns: 1fr; gap: 6px; }
    .dg-router-panel .dg-narrative-utility-row { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: stretch; gap: 6px; min-width: 0; }
    .dg-router-panel .dg-narrative-image-button { min-width: 82px; min-height: 32px; align-self: center; padding: 6px 8px; white-space: normal; line-height: 1.2; text-align: center; }
    .dg-router-panel .dg-narrative-image-button[aria-pressed="true"] { border-color: var(--dgir-border-bright); color: var(--dgir-accent-text); }
    .dg-router-panel .dg-toggle { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 10px; align-items: center; min-width: 0; padding: 8px; border: 1px solid var(--dgir-border); border-radius: var(--dgir-radius-md); background: var(--dgir-surface-soft); cursor: pointer; }
    .dg-router-panel .dg-toggle:hover { border-color: var(--dgir-border-bright); }
    .dg-router-panel .dg-toggle-on { border-color: var(--dgir-border-bright); background: linear-gradient(120deg, var(--dgir-accent-soft), var(--dgir-surface-soft)); }
    .dg-router-panel .dg-toggle-copy { min-width: 0; }
    .dg-router-panel .dg-toggle-title { color: var(--dgir-text); font-size: 12px; font-weight: 750; }
    .dg-router-panel .dg-toggle-description { margin-top: 2px; color: var(--dgir-text-dim); font-size: 10px; line-height: 1.35; }
    .dg-router-panel .dg-toggle input { position: absolute; opacity: 0; pointer-events: none; }
    .dg-router-panel .dg-switch { position: relative; width: 30px; height: 17px; border: 1px solid var(--dgir-border); border-radius: 999px; background: rgba(0,0,0,.24); transition: background .16s ease, border-color .16s ease; }
    .dg-router-panel .dg-switch::after { content: ''; position: absolute; top: 2px; left: 2px; width: 11px; height: 11px; border-radius: 50%; background: var(--dgir-text-muted); transition: transform .16s ease, background .16s ease; }
    .dg-router-panel .dg-toggle-on .dg-switch { border-color: var(--dgir-accent); background: var(--dgir-accent-soft); }
    .dg-router-panel .dg-toggle-on .dg-switch::after { transform: translateX(13px); background: var(--dgir-accent-text); box-shadow: 0 0 7px var(--dgir-accent-glow); }
    .dg-router-panel .dg-row { display: flex; align-items: center; gap: 8px; min-width: 0; }
    .dg-router-panel .dg-row label, .dg-router-panel .dg-field label { color: var(--dgir-text-muted); font-size: 10px; font-weight: 700; }
    .dg-router-panel .dg-field { display: flex; flex-direction: column; gap: 5px; min-width: 0; }
    .dg-router-panel .dg-input, .dg-router-panel .dg-select, .dg-router-panel .dg-textarea { border: 1px solid var(--dgir-border); border-radius: var(--dgir-radius-md); background: color-mix(in srgb, var(--dgir-bg) 72%, transparent); color: var(--dgir-text); font: 12px/1.4 var(--lumiverse-font-family, system-ui, sans-serif); padding: 7px 8px; width: 100%; min-width: 0; box-sizing: border-box; outline: none; }
    .dg-router-panel .dg-input:focus, .dg-router-panel .dg-select:focus, .dg-router-panel .dg-textarea:focus { border-color: var(--dgir-accent); box-shadow: 0 0 0 2px var(--dgir-accent-soft); }
    .dg-router-panel .dg-textarea { min-height: 78px; resize: vertical; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
    .dg-router-panel .dg-slot-card { position: relative; border: 1px solid var(--dgir-glass-line); background: radial-gradient(ellipse at 8% 0, color-mix(in srgb, var(--dgir-accent) 8%, transparent), transparent 42%), linear-gradient(145deg, color-mix(in srgb, var(--dgir-surface-raised) 70%, transparent), color-mix(in srgb, var(--dgir-surface) 64%, transparent)); border-radius: var(--dgir-radius-lg); padding: 12px; margin-bottom: 10px; box-shadow: 0 10px 26px rgba(5,2,8,.15), inset 0 1px var(--dgir-glass-highlight); -webkit-backdrop-filter: blur(14px); backdrop-filter: blur(14px); transition: transform .16s ease, border-color .16s ease, box-shadow .16s ease; }
    .dg-router-panel .dg-slot-card:hover { transform: translateY(-1px); border-color: var(--dgir-border-bright); }
    .dg-router-panel .dg-slot-workflow { display: grid; gap: 8px; }
    .dg-router-panel .dg-slot-mode-actions .dg-btn { flex: 1 1 150px; }
    .dg-router-panel .dg-beat-card { cursor: pointer; outline: none; }
    .dg-router-panel .dg-beat-card:focus-visible { box-shadow: 0 0 0 2px var(--dgir-accent), 0 8px 22px rgba(5,2,8,.2); }
    .dg-router-panel .dg-beat-card.is-selected { border-color: var(--dgir-accent); background: radial-gradient(circle at 8% 0, color-mix(in srgb, var(--dgir-accent) 28%, transparent), transparent 42%), linear-gradient(145deg, color-mix(in srgb, var(--dgir-surface-raised) 92%, transparent), color-mix(in srgb, var(--dgir-surface) 82%, transparent)); box-shadow: 0 0 0 1px color-mix(in srgb, var(--dgir-accent) 45%, transparent), 0 12px 30px rgba(5,2,8,.28); }
    .dg-router-panel .dg-beat-selected-label { color: var(--dgir-text-muted); font-size: 10px; white-space: nowrap; }
    .dg-router-panel .dg-beat-card.is-selected .dg-beat-selected-label { color: var(--dgir-accent-bright); font-weight: 800; }
    .dg-router-panel .dg-beat-card.is-selected .dg-beat-selected-label::before { content: 'Selected · '; }
    .dg-router-panel .dg-beat-review-controls { position: sticky; bottom: 0; z-index: 2; padding: 10px; border: 1px solid var(--dgir-border); border-radius: var(--dgir-radius-md); background: linear-gradient(145deg, #24101c, #0f080e); box-shadow: 0 -10px 26px rgba(0,0,0,.28); }
    .dg-router-panel .dg-slot-failed { border-left: 2px solid var(--dgir-danger); }
    .dg-router-panel .dg-slot-recovered-pending { border-left: 2px solid var(--dgir-warning); }
    .dg-router-panel .dg-slot-placement-pending { border-left: 2px solid var(--dgir-success); }
    .dg-router-panel .dg-slot-image-unavailable { border-left: 2px solid var(--dgir-danger); }
    .dg-router-panel .dg-slot-recovered { border-left: 2px solid color-mix(in srgb, var(--dgir-warning) 70%, var(--dgir-lavender)); }
    .dg-router-panel .dg-slot-generating, .dg-router-panel .dg-slot-provider-waiting, .dg-router-panel .dg-slot-parsing, .dg-router-panel .dg-slot-queued { border-left: 2px solid var(--dgir-lavender); }
    .dg-router-panel .dg-slot-grid { display: grid; grid-template-columns: 92px minmax(0, 1fr); gap: 10px; align-items: start; }
    .dg-router-panel .dg-thumb { width: 92px; height: 92px; object-fit: cover; border: 1px solid var(--dgir-border-bright); border-radius: var(--dgir-radius-md); background: var(--dgir-bg); box-shadow: 0 0 0 2px rgba(255,255,255,.02), 0 8px 20px rgba(0,0,0,.22); cursor: zoom-in; }
    .dg-router-panel .dg-thumb-empty { position: relative; width: 92px; height: 92px; overflow: hidden; border: 1px solid var(--dgir-border); border-radius: var(--dgir-radius-md); display: grid; place-items: center; color: var(--dgir-text-muted); background: linear-gradient(145deg, var(--dgir-surface-soft), color-mix(in srgb, var(--dgir-bg) 78%, transparent)); font-size: 10px; text-align: center; }
    .dg-router-panel .dg-thumb-empty::before { content: ''; width: 20px; height: 20px; border: 1px solid color-mix(in srgb, var(--dgir-accent) 45%, transparent); transform: rotate(45deg); }
    .dg-router-panel .dg-thumb-label { position: absolute; left: 5px; right: 5px; bottom: 7px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .dg-router-panel .dg-thumb-processing::after { content: ''; position: absolute; inset: -40%; background: linear-gradient(105deg, transparent 38%, color-mix(in srgb, var(--dgir-accent) 18%, transparent) 49%, transparent 60%); animation: dg-prism-shimmer 2.2s linear infinite; }
    .dg-router-panel .dg-thumb-failed::before { border-color: var(--dgir-danger); }
    .dg-router-panel .dg-slot-top { display: flex; justify-content: space-between; gap: 8px; align-items: flex-start; margin-bottom: 7px; }
    .dg-router-panel .dg-slot-side { display: flex; align-items: center; gap: 5px; flex: 0 0 auto; }
    .dg-router-panel .dg-slot-title { font-size: 13px; font-weight: 800; line-height: 1.25; overflow-wrap: anywhere; }
    .dg-router-panel .dg-slot-meta { margin-top: 5px; color: var(--dgir-text-muted); font-size: 11px; line-height: 1.45; word-break: break-word; }
    .dg-router-panel .dg-chip-row { display: flex; flex-wrap: wrap; gap: 5px; margin: 6px 0 8px; }
    .dg-router-panel .dg-chip { max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; border: 1px solid var(--dgir-border); border-radius: 999px; padding: 4px 7px; color: var(--dgir-text-muted); background: rgba(0,0,0,.11); font-size: 11px; line-height: 1.1; }
    .dg-router-panel .dg-chip-completed { color: var(--dgir-success); border-color: color-mix(in srgb, var(--dgir-success) 55%, var(--dgir-border)); }
    .dg-router-panel .dg-chip-failed { color: var(--dgir-danger); border-color: color-mix(in srgb, var(--dgir-danger) 55%, var(--dgir-border)); }
    .dg-router-panel .dg-chip-recovered-pending { color: var(--dgir-warning); border-color: color-mix(in srgb, var(--dgir-warning) 55%, var(--dgir-border)); }
    .dg-router-panel .dg-chip-placement-pending { color: var(--dgir-success); border-color: color-mix(in srgb, var(--dgir-success) 55%, var(--dgir-border)); }
    .dg-router-panel .dg-chip-image-unavailable { color: var(--dgir-danger); border-color: color-mix(in srgb, var(--dgir-danger) 55%, var(--dgir-border)); }
    .dg-router-panel .dg-chip-generating, .dg-router-panel .dg-chip-provider-waiting, .dg-router-panel .dg-chip-parsing, .dg-router-panel .dg-chip-queued { color: var(--dgir-lavender); border-color: color-mix(in srgb, var(--dgir-lavender) 55%, var(--dgir-border)); }
    .dg-router-panel .dg-actions { display: flex; flex-wrap: wrap; gap: 5px; align-items: center; }
    .dg-router-panel .dg-primary-actions { padding-top: 1px; }
    .dg-router-panel .dg-illustrator-overview-actions > .dg-btn { flex: 1 1 108px; min-width: 0; min-height: 36px; justify-content: center; text-align: center; white-space: normal; }
    .dg-router-panel .dg-background-queue { display: grid; gap: 7px; margin: 0 0 11px; padding: 10px; border: 1px solid var(--dgir-border); border-radius: var(--dgir-radius-lg); background: radial-gradient(circle at 8% 0, color-mix(in srgb, var(--dgir-lavender) 14%, transparent), transparent 42%), color-mix(in srgb, var(--dgir-surface-soft) 92%, transparent); box-shadow: inset 0 1px rgba(255,255,255,.035); }
    .dg-router-panel .dg-background-queue:empty { display: none; }
    .dg-router-panel .dg-queue-heading { display: flex; align-items: center; justify-content: space-between; gap: 9px; flex-wrap: wrap; }
    .dg-router-panel .dg-queue-heading > strong { color: var(--dgir-accent-text); font: 800 12px/1.3 ui-serif, Georgia, serif; }
    .dg-router-panel .dg-queue-row { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: 9px; padding: 8px 9px; border: 1px solid color-mix(in srgb, var(--dgir-border) 72%, transparent); border-radius: var(--dgir-radius-md); background: color-mix(in srgb, var(--dgir-bg) 30%, transparent); }
    .dg-router-panel .dg-queue-row strong { color: var(--dgir-text); font-size: 11px; }
    .dg-router-panel .dg-queue-row span { color: var(--dgir-text-muted); font-size: 10px; line-height: 1.4; }
    .dg-router-panel .dg-queue-analysis, .dg-router-panel .dg-queue-composition, .dg-router-panel .dg-queue-waiting-provider, .dg-router-panel .dg-queue-generating, .dg-router-panel .dg-queue-saving, .dg-router-panel .dg-queue-placing { border-left: 2px solid var(--dgir-lavender); }
    .dg-router-panel .dg-queue-failed { border-left: 2px solid var(--dgir-danger); }
    .dg-router-panel .dg-queue-completed { border-left: 2px solid var(--dgir-success); }
    .dg-router-panel .dg-queue-cancelled { border-left: 2px solid var(--dgir-warning); }
    .dg-router-panel .dg-next-action { display: grid; gap: 7px; padding: 11px; border: 1px solid var(--dgir-border-bright); border-radius: var(--dgir-radius-lg); background: radial-gradient(circle at 0 0, var(--dgir-accent-soft), transparent 48%), linear-gradient(145deg, color-mix(in srgb, var(--dgir-surface-raised) 94%, transparent), color-mix(in srgb, var(--dgir-surface) 82%, transparent)); box-shadow: 0 10px 25px rgba(4,2,7,.18), inset 0 1px rgba(255,255,255,.045); }
    .dg-router-panel .dg-next-action > strong { color: var(--dgir-accent-text); font: 800 14px/1.3 ui-serif, Georgia, serif; }
    .dg-router-panel .dg-next-action > p { margin: 0; color: var(--dgir-text-muted); font-size: 11px; line-height: 1.5; }
    .dg-router-panel .dg-diagnostic-actions { display: flex; flex-wrap: wrap; gap: 6px; padding: 8px; border: 1px dashed color-mix(in srgb, var(--dgir-border-bright) 72%, transparent); border-radius: var(--dgir-radius-md); background: color-mix(in srgb, var(--dgir-accent-soft) 35%, transparent); }
    .dg-router-panel button { text-align: center; }
    .dg-router-panel .dg-btn { min-height: 32px; display: inline-flex; align-items: center; justify-content: center; text-align: center; border: 1px solid var(--dgir-glass-line); background: linear-gradient(145deg, color-mix(in srgb, var(--dgir-surface-raised) 60%, transparent), color-mix(in srgb, var(--dgir-surface-soft) 56%, transparent)); color: var(--dgir-text); border-radius: var(--dgir-radius-md); padding: 7px 10px; font: 700 11px/1.1 var(--lumiverse-font-family, system-ui, sans-serif); cursor: pointer; -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px); transition: border-color .16s ease, background .16s ease, box-shadow .16s ease, transform .12s ease; }
    .dg-router-panel .dg-btn:hover:not(:disabled) { border-color: var(--dgir-border-bright); background: color-mix(in srgb, var(--dgir-surface-raised) 82%, var(--dgir-accent-soft)); }
    .dg-router-panel .dg-btn:active:not(:disabled) { transform: translateY(1px); }
    .dg-router-panel .dg-btn:focus-visible, .dg-router-panel .dg-tab:focus-visible, .dg-router-panel .dg-toggle:focus-within { outline: 2px solid var(--dgir-accent); outline-offset: 2px; }
    .dg-toast-stack { position: fixed; z-index: 2147483500; top: max(12px, env(safe-area-inset-top)); right: max(12px, env(safe-area-inset-right)); display: grid; gap: 8px; width: min(380px, calc(100vw - 24px)); pointer-events: none; }
    .dg-toast { display: grid; grid-template-columns: 8px minmax(0, 1fr) 26px; align-items: start; gap: 10px; padding: 11px 10px; border: 1px solid color-mix(in srgb, var(--dgir-accent) 34%, var(--dgir-glass-line)); border-radius: var(--dgir-radius-lg); color: var(--dgir-text); background: radial-gradient(ellipse at 0 0, color-mix(in srgb, var(--dgir-accent) 15%, transparent), transparent 62%), linear-gradient(145deg, color-mix(in srgb, var(--dgir-surface-raised) 90%, transparent), color-mix(in srgb, var(--dgir-surface) 92%, transparent)); box-shadow: 0 14px 36px rgba(0,0,0,.38), inset 0 1px var(--dgir-glass-highlight); -webkit-backdrop-filter: blur(18px); backdrop-filter: blur(18px); font: 650 12px/1.45 var(--lumiverse-font-family, system-ui, sans-serif); pointer-events: auto; }
    .dg-toast::before { content: ''; width: 7px; height: 7px; margin-top: 5px; border-radius: 50%; background: var(--dgir-lavender); box-shadow: 0 0 10px currentColor; }
    .dg-toast[data-level="success"]::before { background: var(--dgir-success); }
    .dg-toast[data-level="warning"]::before { background: var(--dgir-warning); }
    .dg-toast[data-level="error"]::before { background: var(--dgir-danger); }
    .dg-toast-copy { min-width: 0; overflow-wrap: anywhere; }
    .dg-toast-dismiss { display: grid; place-items: center; width: 26px; height: 26px; margin: -4px -3px 0 0; padding: 0; border: 1px solid transparent; border-radius: 50%; color: var(--dgir-text-muted); background: transparent; font: 500 18px/1 system-ui,sans-serif; cursor: pointer; }
    .dg-toast-dismiss:hover { border-color: var(--dgir-glass-line); color: var(--dgir-text); background: var(--dgir-accent-soft); }
    .dg-router-panel .dg-btn:disabled { opacity: .64; color: var(--dgir-text-dim); cursor: not-allowed; filter: saturate(.55); }
    .dg-router-panel .dg-btn-primary { color: var(--dgir-accent-text); border-color: color-mix(in srgb, var(--dgir-accent) 28%, var(--dgir-glass-line)); background: linear-gradient(135deg, color-mix(in srgb, var(--dgir-accent) 17%, transparent), color-mix(in srgb, var(--dgir-surface-soft) 55%, transparent)); box-shadow: inset 0 1px rgba(255,255,255,.07), 0 5px 16px rgba(5,2,12,.12); }
    .dg-router-panel .dg-btn-subtle { color: var(--dgir-text-muted); background: transparent; }
    .dg-router-panel .dg-btn-danger { color: var(--dgir-danger); border-color: color-mix(in srgb, var(--dgir-danger) 38%, var(--dgir-border)); background: color-mix(in srgb, var(--dgir-danger) 8%, transparent); }
    .dg-router-panel .dg-btn-icon { width: 29px; padding: 0; display: inline-grid; place-items: center; font-size: 16px; }
    .dg-router-panel .dg-manage { margin-top: 9px; border-top: 1px solid color-mix(in srgb, var(--dgir-border) 65%, transparent); padding-top: 7px; }
    .dg-router-panel .dg-manage > summary { width: max-content; min-height: 28px; display: flex; align-items: center; justify-content: center; padding: 3px 5px; border-radius: var(--dgir-radius-sm); color: var(--dgir-text-muted); font-size: 11px; text-align: center; cursor: pointer; user-select: none; }
    .dg-router-panel .dg-manage > summary:hover, .dg-router-panel .dg-manage > summary:focus-visible { color: var(--dgir-text); background: var(--dgir-surface-soft); outline: none; }
    .dg-router-panel .dg-manage[open] > summary { margin-bottom: 6px; color: var(--dgir-text-muted); }
    .dg-router-panel .dg-error { margin-top: 8px; padding: 7px 8px; border-left: 2px solid var(--dgir-danger); background: color-mix(in srgb, var(--dgir-danger) 7%, transparent); color: color-mix(in srgb, var(--dgir-danger) 82%, var(--dgir-text)); font-size: 11px; line-height: 1.4; }
    .dg-router-panel .dg-recovery-note { margin:7px 0; padding:10px 11px; border:1px solid color-mix(in srgb,var(--dgir-accent) 30%,var(--dgir-border)); border-left:3px solid var(--dgir-accent); border-radius:var(--dgir-radius-md); background:radial-gradient(circle at 0 0,var(--dgir-accent-soft),transparent 54%),color-mix(in srgb,var(--dgir-surface-soft) 92%,transparent); color:var(--dgir-text-muted); font-size:11px; line-height:1.5; box-shadow:inset 0 1px rgba(255,255,255,.035); }
    .dg-router-panel .dg-utility-row, .dg-router-panel .dg-filter-row { display: flex; flex-wrap: wrap; align-items: center; gap: 5px; margin: -3px 0 9px; }
    .dg-router-panel .dg-input, .dg-router-panel .dg-select { min-height: 32px; border: 1px solid var(--dgir-border); border-radius: var(--dgir-radius-md); background: color-mix(in srgb, var(--dgir-surface-raised) 82%, transparent); color: var(--dgir-text); padding: 7px 9px; font: 700 11px/1.2 var(--lumiverse-font-family, system-ui, sans-serif); }
    .dg-router-panel .dg-input:focus, .dg-router-panel .dg-select:focus { outline: 2px solid color-mix(in srgb, var(--dgir-accent) 55%, transparent); outline-offset: 1px; border-color: var(--dgir-border-bright); }
    .dg-router-panel .dg-asset-toolbar { display: grid; grid-template-columns: minmax(0, 1fr) minmax(128px, .35fr) auto; gap: 7px; align-items: stretch; width: 100%; }
    .dg-router-panel .dg-asset-search { width: 100%; }
    .dg-router-panel .dg-asset-select { width: 100%; }
    .dg-router-panel .dg-filter-pill { min-height: 27px; padding: 5px 8px; border: 1px solid var(--dgir-border); border-radius: 999px; background: transparent; color: var(--dgir-text-muted); font-size: 11px; cursor: pointer; }
    .dg-router-panel .dg-filter-pill-active { color: var(--dgir-accent-text); border-color: var(--dgir-border-bright); background: var(--dgir-accent-soft); }
    .dg-router-panel .dg-rescan-result { display: grid; gap: 6px; margin-bottom: 9px; padding: 8px 9px; border: 1px solid var(--dgir-border); border-left: 2px solid var(--dgir-lavender); border-radius: var(--dgir-radius-md); background: var(--dgir-surface-soft); }
    .dg-router-panel .dg-rescan-copy { color: var(--dgir-text-muted); font-size: 11px; line-height: 1.4; }
    .dg-router-panel.dg-confirm-backdrop { position: fixed; inset: 0; z-index: 2147483647; display: grid; place-items: center; padding: 16px; border: 0; border-radius: 0; background: rgba(3,1,5,.94); backdrop-filter: none; overflow: auto; }
    .dg-router-panel .dg-confirm-dialog { width: min(440px, 100%); padding: 16px; border: 1px solid var(--dgir-border-bright); border-radius: var(--dgir-radius-lg); background: linear-gradient(145deg, #210b17, #0b060c) !important; box-shadow: 0 22px 70px rgba(0,0,0,.55), inset 0 1px rgba(255,255,255,.07); }
    .dg-router-panel .dg-confirm-dialog-strong { border-color: color-mix(in srgb, var(--dgir-danger) 68%, var(--dgir-border)); }
    .dg-router-panel .dg-confirm-title { margin: 0 0 8px; font: 700 17px/1.25 ui-serif, Georgia, serif; }
    .dg-router-panel .dg-confirm-description { color: var(--dgir-text-muted); font-size: 12px; line-height: 1.5; white-space: pre-line; }
    .dg-router-panel .dg-confirm-scope { margin: 10px 0; padding: 8px; border: 1px solid var(--dgir-border); border-radius: var(--dgir-radius-md); color: var(--dgir-text-muted); font-size: 11px; background: rgba(0,0,0,.14); }
    .dg-router-panel .dg-history-group { margin-bottom: 13px; }
    .dg-router-panel .dg-history-date { position: sticky; top: 0; z-index: 2; margin: 0 0 6px; padding: 5px 8px; border: 1px solid var(--dgir-border); border-radius: var(--dgir-radius-md); background: color-mix(in srgb, var(--dgir-bg) 92%, transparent); color: var(--dgir-text-muted); font: 700 11px/1.2 ui-serif, Georgia, Cambria, serif; }
    .dg-router-panel .dg-history-track { position: relative; padding-left: 15px; }
    .dg-router-panel .dg-history-track::before { content: ''; position: absolute; left: 4px; top: 8px; bottom: 8px; width: 1px; background: linear-gradient(var(--dgir-accent-glow), var(--dgir-border), transparent); }
    .dg-router-panel .dg-history-item { position: relative; display: grid; grid-template-columns: 70px minmax(0, 1fr); gap: 9px; padding: 8px 0 10px 4px; border-bottom: 1px solid color-mix(in srgb, var(--dgir-border) 55%, transparent); }
    .dg-router-panel .dg-history-item::before { content: ''; position: absolute; left: -14px; top: 17px; width: 7px; height: 7px; border-radius: 50%; background: var(--dgir-accent); box-shadow: 0 0 7px var(--dgir-accent-glow); }
    .dg-router-panel .dg-asset-card { display: grid; grid-template-columns: 112px minmax(0, 1fr); gap: 12px; padding: 10px; margin-bottom: 9px; border: 1px solid var(--dgir-border); border-radius: var(--dgir-radius-lg); background: color-mix(in srgb, var(--dgir-surface-soft) 88%, transparent); box-shadow: inset 0 1px rgba(255,255,255,.025); }
    .dg-router-panel .dg-asset-card-compact { grid-template-columns: 88px minmax(0, 1fr); }
    .dg-router-panel .dg-asset-card-thumb { width: 112px; height: 112px; display: block; object-fit: cover; border: 1px solid var(--dgir-border-bright); border-radius: var(--dgir-radius-md); background: #050505; cursor: zoom-in; }
    .dg-router-panel .dg-asset-card-compact .dg-asset-card-thumb { width: 88px; height: 88px; }
    .dg-router-panel .dg-asset-card-main { min-width: 0; display: flex; flex-direction: column; gap: 5px; }
    .dg-router-panel .dg-asset-card-title { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font: 800 13px/1.3 ui-serif, Georgia, serif; }
    .dg-router-panel .dg-asset-card-meta { color: var(--dgir-text-muted); font-size: 10px; line-height: 1.35; }
    .dg-router-panel .dg-asset-card-summary { display: -webkit-box; overflow: hidden; -webkit-box-orient: vertical; -webkit-line-clamp: 2; color: var(--dgir-text-muted); font-size: 11px; line-height: 1.45; }
    .dg-router-panel .dg-asset-card-chips { margin: 1px 0 2px; }
    .dg-router-panel .dg-asset-card-actions { margin-top: auto; }
    .dg-router-panel.dg-asset-lightbox { width: min(1120px, calc(100dvw - 24px)) !important; max-width: none !important; }
    .dg-router-panel .dg-modal-body.dg-asset-lightbox-body { display: grid; grid-template-columns: minmax(0, 1fr) minmax(230px, 310px); align-items: start; align-content: start; gap: 14px; min-height: 0; border-radius: var(--dgir-radius-lg); }
    .dg-router-panel .dg-asset-lightbox-stage { min-width: 0; min-height: 0; height: auto; max-height: min(78dvh, 780px); display: grid; place-items: center; border: 1px solid var(--dgir-border); border-radius: var(--dgir-radius-lg); background: #030203; overflow: hidden; touch-action: none; }
    .dg-router-panel .dg-asset-lightbox-image { width: auto; height: auto; max-width: 100%; max-height: min(78dvh, 780px); object-fit: contain; border: 0; border-radius: 0; }
    .dg-router-panel .dg-asset-lightbox-details { min-width: 0; display: flex; flex-direction: column; gap: 12px; justify-content: flex-end; padding: 10px; border: 1px solid var(--dgir-border); border-radius: var(--dgir-radius-lg); background: var(--dgir-surface-soft); }
    .dg-router-panel .dg-plan-grid { display: grid; gap: 0; margin: 8px 0 12px; border: 1px solid var(--dgir-border); border-radius: var(--dgir-radius-lg); overflow: hidden; }
    .dg-router-panel .dg-plan-row { display: grid; grid-template-columns: minmax(140px, .32fr) minmax(0, 1fr); gap: 10px; padding: 9px 10px; border-bottom: 1px solid color-mix(in srgb, var(--dgir-border) 62%, transparent); background: color-mix(in srgb, var(--dgir-surface-soft) 86%, transparent); }
    .dg-router-panel .dg-plan-row:last-child { border-bottom: 0; }
    .dg-router-panel .dg-plan-row strong { color: var(--dgir-accent-text); font-size: 11px; }
    .dg-router-panel .dg-plan-row span { white-space: pre-line; overflow-wrap: anywhere; color: var(--dgir-text-muted); font-size: 11px; line-height: 1.45; }
    .dg-router-panel .dg-plan-warnings { margin: 10px 0; padding: 10px; border: 1px solid color-mix(in srgb, var(--dgir-warning) 48%, var(--dgir-border)); border-radius: var(--dgir-radius-lg); background: color-mix(in srgb, var(--dgir-warning) 7%, var(--dgir-surface-soft)); }
    .dg-router-panel .dg-plan-warnings h3 { margin: 0 0 7px; font-size: 12px; }
    .dg-router-panel .dg-plan-warning { padding: 6px 0; color: var(--dgir-text-muted); font-size: 11px; line-height: 1.45; border-top: 1px solid color-mix(in srgb, var(--dgir-border) 55%, transparent); }
    .dg-router-panel .dg-plan-warning:first-of-type { border-top: 0; }
    .dg-router-panel .dg-history-thumb { width: 70px; height: 70px; display: grid; place-items: center; object-fit: cover; border: 1px solid var(--dgir-border); border-radius: var(--dgir-radius-md); color: var(--dgir-text-muted); font-size: 10px; text-align: center; cursor: zoom-in; }
    .dg-router-panel .dg-history-head { display: flex; justify-content: space-between; gap: 7px; align-items: start; }
    .dg-router-panel .dg-history-title { font-size: 12px; font-weight: 800; }
    .dg-router-panel .dg-history-prompt { margin: 5px 0 7px; color: var(--dgir-text-muted); font-size: 11px; line-height: 1.35; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .dg-router-panel .dg-log-tools { display: grid; gap: 8px; margin-bottom: 8px; }
    .dg-router-panel .dg-log { position: relative; margin-bottom: 6px; padding: 8px 9px 8px 11px; border: 1px solid var(--dgir-border); border-radius: var(--dgir-radius-md); background: var(--dgir-surface-soft); font-size: 11px; }
    .dg-router-panel .dg-log::before { content: ''; position: absolute; left: 0; top: 7px; bottom: 7px; width: 2px; border-radius: 2px; background: var(--dgir-text-dim); }
    .dg-router-panel .dg-log-error::before { background: var(--dgir-danger); }
    .dg-router-panel .dg-log-warning::before { background: var(--dgir-warning); }
    .dg-router-panel .dg-log-info::before { background: var(--dgir-lavender); }
    .dg-router-panel .dg-log > summary { cursor: pointer; color: var(--dgir-text); line-height: 1.4; }
    .dg-router-panel .dg-log-meta { color: var(--dgir-text-muted); font-size: 10px; margin: 5px 0; overflow-wrap: anywhere; }
    .dg-router-panel .dg-modal-body { display: flex; flex-direction: column; gap: 10px; }
    .dg-router-panel .dg-lightbox-img { width: 100%; max-height: 72vh; object-fit: contain; border: 1px solid var(--dgir-border); border-radius: var(--dgir-radius-lg); background: #050505; }
    .dg-router-panel .dg-image-lightbox-viewport { position: relative; display: grid; place-items: center; align-content: start; width: 100%; height: auto; min-height: 0; max-height: min(72vh, 820px); overflow: hidden; border: 1px solid var(--dgir-border); border-radius: var(--dgir-radius-lg); background: #030203; touch-action: none; }
    .dg-router-panel .dg-image-lightbox-viewport > .dg-lightbox-img { display: block; width: auto; height: auto; max-width: 100%; max-height: min(72vh, 820px); border: 0; border-radius: 0; background: transparent; object-fit: contain; transform-origin: center center; touch-action: none; user-select: none; -webkit-user-drag: none; cursor: zoom-in; }
    .dg-router-panel .dg-image-lightbox-viewport > .dg-lightbox-img.dg-image-lightbox-zoomed { cursor: grab; }
    .dg-router-panel.dg-slot-lightbox { width: min(1480px, 100%) !important; max-width: 100% !important; max-height: calc(100dvh - 24px) !important; margin-inline: auto !important; overflow: hidden; box-sizing: border-box; border-radius: var(--dgir-radius-xl, 22px) !important; }
    .dg-relay-lightbox-modal-frame { width: 100% !important; max-width: 100% !important; min-width: 0; height: auto !important; max-height: calc(100dvh - 24px) !important; overflow: visible !important; }
    .dg-relay-lightbox-scroll-frame { display: flex !important; justify-content: center; align-items: flex-start; width: 100% !important; min-width: 0; height: auto !important; max-height: calc(100dvh - 24px) !important; padding: 12px !important; box-sizing: border-box; overflow: visible !important; }
    .dg-router-panel .dg-slot-lightbox-body { display: grid; grid-template-columns: minmax(0, 1fr); grid-template-rows: minmax(0, auto) auto; align-content: start; align-items: start; gap: 8px; width: 100%; max-height: calc(100dvh - 100px); min-width: 0; min-height: 0; padding: 8px; box-sizing: border-box; overflow: hidden; border-radius: inherit; }
    .dg-router-panel .dg-slot-lightbox-body > .dg-image-lightbox-viewport { justify-self: center; width: fit-content; max-width: 100%; height: auto; max-height: min(64dvh, calc(100dvh - 350px), 760px); align-content: center; overflow: hidden; border-color: var(--dgir-glass-line); border-radius: var(--dgir-radius-lg); background: radial-gradient(ellipse at 50% 0%, color-mix(in srgb, var(--dgir-accent) 11%, transparent), transparent 58%), linear-gradient(145deg, color-mix(in srgb, var(--dgir-surface-raised) 86%, transparent), color-mix(in srgb, var(--dgir-surface) 92%, transparent)); box-shadow: inset 0 1px var(--dgir-glass-highlight), 0 8px 22px rgba(0,0,0,.18); }
    .dg-router-panel .dg-slot-lightbox-body > .dg-image-lightbox-viewport > .dg-lightbox-img { max-width: 100%; max-height: min(64dvh, calc(100dvh - 350px), 760px); border-radius: inherit; }
    .dg-router-panel .dg-slot-lightbox-controls { display: grid; gap: 5px; min-width: 0; padding: 6px; overflow: hidden; border: 1px solid var(--dgir-glass-line); border-radius: var(--dgir-radius-lg); background: radial-gradient(ellipse at 100% 0%, color-mix(in srgb, var(--dgir-accent) 9%, transparent), transparent 54%), linear-gradient(145deg, color-mix(in srgb, var(--dgir-surface-raised) 82%, transparent), color-mix(in srgb, var(--dgir-surface) 90%, transparent)); box-shadow: inset 0 1px var(--dgir-glass-highlight); }
    .dg-router-panel .dg-slot-lightbox-primary-actions { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 5px; min-width: 0; padding: 0; border: 0; border-radius: 0; background: transparent; }
    .dg-router-panel .dg-slot-lightbox-primary-actions .dg-btn { flex: 0 1 auto; min-height: 32px; }
    .dg-router-panel .dg-slot-lightbox-history-manage { display: flex; flex: 0 0 auto; align-items: center; gap: 5px; min-width: 0; }
    .dg-router-panel .dg-slot-lightbox-history-manage:has(> .dg-manage[open]) { flex: 1 1 100%; flex-wrap: wrap; }
    .dg-router-panel .dg-slot-lightbox-history-manage > .dg-manage { flex: 0 0 auto; min-width: 0; margin: 0; border: 0; padding: 0; }
    .dg-router-panel .dg-slot-lightbox-history-manage > .dg-manage > summary { box-sizing: border-box; width: max-content; min-height: 32px; display: inline-flex; align-items: center; justify-content: center; padding: 6px 9px; border: 1px solid var(--dgir-glass-line); border-radius: var(--dgir-radius-md); background: linear-gradient(145deg, color-mix(in srgb, var(--dgir-surface-raised) 60%, transparent), color-mix(in srgb, var(--dgir-surface-soft) 56%, transparent)); color: var(--dgir-text); font: 700 11px/1.1 var(--lumiverse-font-family, system-ui, sans-serif); list-style: none; text-align: center; }
    .dg-router-panel .dg-slot-lightbox-history-manage > .dg-manage > summary::-webkit-details-marker { display: none; }
    .dg-router-panel .dg-slot-lightbox-history-manage > .dg-manage > summary:hover, .dg-router-panel .dg-slot-lightbox-history-manage > .dg-manage > summary:focus-visible { border-color: var(--dgir-border-bright); background: color-mix(in srgb, var(--dgir-surface-raised) 82%, var(--dgir-accent-soft)); box-shadow: 0 4px 12px color-mix(in srgb, var(--dgir-accent) 12%, transparent); color: var(--dgir-text); outline: none; }
    .dg-router-panel .dg-slot-lightbox-history-manage > .dg-manage[open] { flex: 1 1 100%; }
    .dg-router-panel .dg-slot-lightbox-footer { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 6px; min-width: 0; padding: 5px 0 0; border: 0; border-top: 1px solid color-mix(in srgb, var(--dgir-border) 66%, transparent); border-radius: 0; background: transparent; }
    .dg-router-panel .dg-slot-lightbox-footer .dg-actions { gap: 5px; }
    .dg-router-panel .dg-slot-lightbox-history-manage > .dg-manage[open] .dg-actions { max-height: none; overflow: visible; }
    .dg-router-panel .dg-slot-history-list { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 245px), 1fr)); gap: 12px; }
    .dg-router-panel .dg-slot-history-version { display: flex; flex-direction: column; gap: 9px; min-width: 0; padding: 10px; border: 1px solid var(--dgir-border); border-radius: var(--dgir-radius-lg); background: var(--dgir-surface-soft); }
    .dg-router-panel .dg-slot-history-version img { display: block; width: 100%; height: 190px; object-fit: contain; border-radius: var(--dgir-radius-md); background: #030203; cursor: zoom-in; }
    .dg-router-panel .dg-slot-history-version strong { font-size: 12px; }
    .dg-router-panel .dg-slot-history-version small { color: var(--dgir-text-muted); overflow-wrap: anywhere; }
    .dg-router-panel .dg-stream-status { margin-top: 5px; color: var(--dgir-accent-text); font-size: 10px; font-weight: 800; line-height: 1.25; overflow-wrap: anywhere; }
    .dg-router-panel .dg-thumb-streaming { position: relative; display: block; overflow: hidden; border: 1px solid var(--dgir-border-bright) !important; outline: 0 !important; box-shadow: none !important; }
    .dg-router-panel .dg-thumb-streaming::before, .dg-router-panel .dg-thumb-streaming::after { display: none !important; }
    .dg-router-panel .dg-thumb-streaming img { display: block; width: 100%; height: 100%; object-fit: cover; border-radius: inherit; border: 0 !important; outline: 0 !important; box-shadow: none !important; }
    .dg-router-panel .dg-thumb-streaming .dg-thumb-label { position: absolute; left: 5px; right: 5px; bottom: 5px; z-index: 2; max-height: 32px; overflow: hidden; padding: 4px 6px; border-radius: 5px; color: var(--dgir-text); background: color-mix(in srgb, var(--dgir-bg) 84%, transparent); backdrop-filter: blur(7px); font-size: 9px; line-height: 1.25; }
    .dg-router-panel.dg-menu { --dgir-text: #fff7fb; --dgir-text-muted: #ddd0da; --dgir-text-dim: #b9a7b5; --dgir-danger: #ff9eb5; position: fixed; z-index: 2147483647; box-sizing: border-box; width: min(288px, calc(100dvw - 16px)) !important; min-width: 0; max-width: calc(100dvw - 16px); max-height: min(78dvh, calc(100dvh - 16px)); overflow: auto; overscroll-behavior: contain; padding: 6px; border: 1px solid #a76787; border-radius: 16px; background: #211820 !important; background-image: none !important; box-shadow: 0 16px 48px #000a, inset 0 1px #ffffff14; -webkit-backdrop-filter: none; backdrop-filter: none; color: #fff7fb; }
    .dg-router-panel.dg-menu::before { content: none !important; }
    .dg-router-panel.dg-menu button { display: block; width: 100%; min-height: 40px; text-align: left; margin: 0; border: 0; border-radius: 10px; padding: 10px 12px; background: transparent; color: var(--dgir-text); font: 600 13px/1.35 var(--lumiverse-font-family, system-ui, sans-serif); cursor: pointer; }
    .dg-router-panel.dg-menu button:hover:not(:disabled), .dg-router-panel.dg-menu button:focus-visible { outline: none; background: var(--dgir-accent-soft); }
    .dg-router-panel.dg-menu button:disabled { opacity: .65; color: var(--dgir-text-dim); cursor: not-allowed; }
    .dg-router-panel.dg-menu > .dg-menu-more { margin-top: 4px; border-top: 1px solid color-mix(in srgb, var(--dgir-glass-line, var(--dgir-border)) 68%, transparent); padding-top: 4px; }
    .dg-router-panel.dg-menu .dg-menu-more > summary, .dg-router-panel.dg-menu .dg-menu-group > summary { display: flex; align-items: center; justify-content: space-between; gap: 10px; min-height: 40px; padding: 8px 12px; border-radius: 10px; color: var(--dgir-text-muted); font: 700 12px/1.35 var(--lumiverse-font-family, system-ui, sans-serif); cursor: pointer; list-style: none; }
    .dg-router-panel.dg-menu summary::-webkit-details-marker { display: none; }
    .dg-router-panel.dg-menu .dg-menu-more > summary::after, .dg-router-panel.dg-menu .dg-menu-group > summary::after { content: '+'; color: var(--dgir-accent-text); font-size: 13px; }
    .dg-router-panel.dg-menu details[open] > summary::after { content: '−'; }
    .dg-router-panel.dg-menu .dg-menu-more > summary:hover, .dg-router-panel.dg-menu .dg-menu-group > summary:hover, .dg-router-panel.dg-menu summary:focus-visible { outline: none; background: var(--dgir-accent-soft); color: var(--dgir-text); }
    .dg-router-panel.dg-menu .dg-menu-group { margin: 2px 0; border: 1px solid color-mix(in srgb, var(--dgir-glass-line, var(--dgir-border)) 48%, transparent); border-radius: var(--dgir-radius-sm); background: color-mix(in srgb, var(--dgir-surface-soft) 55%, transparent); }
    .dg-router-panel.dg-menu .dg-menu-group[open] { padding-bottom: 3px; }
    .dg-router-panel.dg-menu .dg-menu-danger { border-top: 1px solid color-mix(in srgb, var(--dgir-danger) 42%, transparent); }
    .dg-router-panel.dg-menu .dg-menu-danger > summary { color: var(--dgir-danger); }
    .dg-router-panel.dg-menu .dg-menu-danger-action { color: var(--dgir-danger); }
    .dg-router-panel.dg-menu .dg-menu-count { color: var(--dgir-text-dim); font-size: 11px; font-weight: 600; }
    .dg-router-panel.dg-menu button:focus-visible, .dg-router-panel.dg-menu summary:focus-visible { outline: 2px solid #f4a1c8; outline-offset: -2px; background: #513247; }
    @media (pointer: coarse) { .dg-router-panel.dg-menu button, .dg-router-panel.dg-menu summary { min-height: 44px; } }
    [data-component="MessageContent"] .dg-illustration-quick-button, [data-component="MessageContent"] [data-dgir-illustration-menu] { display: none !important; }
    .dg-danger-card { border-color: color-mix(in srgb, var(--dgir-danger) 52%, var(--dgir-border)) !important; background: color-mix(in srgb, var(--dgir-danger) 8%, var(--dgir-surface-soft)) !important; }
    img[data-dgir-key], img[data-dgir-image-id], img[data-dgir-request-id] { cursor: zoom-in; pointer-events: auto !important; }
    img[data-dgir-custom-target] { position: relative; z-index: 5; pointer-events: auto !important; -webkit-touch-callout: none; }
    :where(*):has(> img[data-dgir-custom-target])::before,
    :where(*):has(> img[data-dgir-custom-target])::after { pointer-events: none !important; }
    :where(*):has(> img[data-dgir-custom-target]) :is([class*="overlay"], [class*="gradient"], [class*="sparkle"], [class*="glow"], [class*="decoration"]) { pointer-events: none !important; }
    [data-component="BubbleMessage"] > div[class*="bubble"] > div[class*="content"]:has(:is(img[alt="reverie-relay"], img[data-dgir-app="prose"])) {
      width: 100% !important;
      max-width: 100% !important;
    }
    [data-component="MessageContent"] p:has(:is(img[alt="reverie-relay"], img[data-dgir-app="prose"])) {
      --dgir-bubble-image-inner-width: calc(100% - (2 * clamp(18px, 3vw, 38px)));
      --prose-image-max-width: var(--dgir-bubble-image-inner-width);
      --prose-image-max-height: none;
      text-align: var(--dgir-prose-image-text-align, center) !important;
      overflow: visible !important;
    }
    [data-component="MessageContent"] p:has(:is(img[alt="reverie-relay"], img[data-dgir-app="prose"])) > span:has(> :is(img[alt="reverie-relay"], img[data-dgir-app="prose"])),
    [data-component="MessageContent"] p:has(:is(img[alt="reverie-relay"], img[data-dgir-app="prose"])) > a:has(:is(img[alt="reverie-relay"], img[data-dgir-app="prose"])) {
      display: block !important;
      width: min(var(--dgir-prose-image-width, 66%), var(--dgir-bubble-image-inner-width)) !important;
      max-width: 100% !important;
      max-height: none !important;
      overflow: visible !important;
      margin-left: var(--dgir-prose-image-margin-left, auto) !important;
      margin-right: var(--dgir-prose-image-margin-right, auto) !important;
    }
    [data-component="MessageContent"] p:has(:is(img[alt="reverie-relay"], img[data-dgir-app="prose"])) :is(img[alt="reverie-relay"], img[data-dgir-app="prose"]) {
      display: block !important;
      width: 100% !important;
      height: auto !important;
      max-height: none !important;
      object-fit: contain !important;
      border-radius: 10px !important;
    }
    scene_image[data-dgir-prose-align], scene_image:has(img[data-dgir-app="prose"]), .dgir-prose-image-frame { display: flex !important; justify-content: var(--dgir-prose-image-justify, center) !important; width: 100% !important; max-width: 100% !important; box-sizing: border-box !important; margin: 10px 0 !important; }
    scene_image[data-dgir-prose-align] > img[data-dgir-app="prose"], scene_image:has(img[data-dgir-app="prose"]) > img[data-dgir-app="prose"], .dgir-prose-image-frame > img[data-dgir-app="prose"] { flex: 0 1 var(--dgir-prose-image-width, 66%) !important; width: var(--dgir-prose-image-width, 66%) !important; max-width: var(--dgir-prose-image-max-width, 720px) !important; min-width: min(100%, 220px) !important; }
    img[data-dgir-app="prose"] { display: block !important; width: var(--dgir-prose-image-width, 66%) !important; max-width: var(--dgir-prose-image-max-width, 720px) !important; height: auto !important; object-fit: contain !important; margin-left: var(--dgir-prose-image-margin-left, auto) !important; margin-right: var(--dgir-prose-image-margin-right, auto) !important; }
    .dgir-prose-lifecycle-projection .rrl-media-slot :is(img.rrl-slot-image[data-dgir-app="prose"],img.rrl-preview-image) { width: 100% !important; max-width: none !important; height: 100% !important; min-width: 0 !important; margin: 0 !important; object-fit: cover !important; }
    scene_image > img[data-dgir-app="prose"][data-dgir-prose-size="full"], .dgir-prose-image-frame > img[data-dgir-app="prose"][data-dgir-prose-size="full"], img[data-dgir-app="prose"][data-dgir-prose-size="full"] { flex-basis: 100% !important; width: 100% !important; max-width: none !important; min-width: 0 !important; height: auto !important; }
    .dg-router-panel .dg-meta-tabs { display: flex; gap: 5px; }
    .dg-router-panel .dg-meta-grid { display: grid; grid-template-columns: minmax(110px, .32fr) minmax(0, 1fr); gap: 7px 10px; font-size: 11px; }
    .dg-router-panel .dg-meta-label { color: var(--dgir-text-muted); font-weight: 800; }
    .dg-router-panel .dg-pre { white-space: pre-wrap; overflow: auto; max-height: 52vh; padding: 10px; border: 1px solid var(--dgir-border); border-radius: var(--dgir-radius-lg); background: color-mix(in srgb, var(--dgir-bg) 88%, #050505); color: var(--dgir-text); font: 11px/1.45 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
    .dg-router-panel .dg-build-warning { color: var(--dgir-danger); font-weight: 800; }
    .dg-router-panel .dg-sidecar-indicator { display: flex; align-items: center; gap: 8px; padding: 9px; border: 1px solid var(--dgir-border-bright); border-radius: var(--dgir-radius-md); background: color-mix(in srgb, var(--dgir-accent-soft) 62%, var(--dgir-surface-soft)); color: var(--dgir-text); font-size: 12px; font-weight: 750; }
    .dg-router-panel .dg-sidecar-indicator::before { content: ''; flex: 0 0 14px; width: 14px; height: 14px; border: 2px solid color-mix(in srgb, var(--dgir-accent) 32%, transparent); border-top-color: var(--dgir-accent); border-radius: 50%; animation: dg-relay-orbit .85s linear infinite; }
    .dg-router-panel .dg-appearance-action-status { min-height: 18px; display: inline-flex; align-items: center; gap: 6px; color: var(--dgir-text-muted); font-size: 11px; font-weight: 750; }
    .dg-router-panel .dg-appearance-action-status.is-running::before { content: ''; width: 12px; height: 12px; border: 2px solid color-mix(in srgb, var(--dgir-accent) 30%, transparent); border-top-color: var(--dgir-accent); border-radius: 50%; animation: dg-relay-orbit .85s linear infinite; }
    .dg-router-panel .dg-appearance-action-status.is-success { color: var(--dgir-success); }
    .dg-router-panel .dg-appearance-action-status.is-unknown { color: var(--dgir-warning); }
    .dg-router-panel .dg-appearance-action-status.is-error { color: var(--dgir-danger); }
    .dg-router-panel .dg-lab-tabs { display: flex; gap: 4px; overflow-x: auto; padding-bottom: 4px; margin-bottom: 9px; scrollbar-width: thin; }
    .dg-router-panel .dg-lab-tab { flex: 1 0 72px; min-height: 29px; border: 1px solid var(--dgir-border); border-radius: var(--dgir-radius-md); background: rgba(0,0,0,.12); color: var(--dgir-text-muted); font: 800 11px/1 var(--lumiverse-font-family, system-ui, sans-serif); cursor: pointer; }
    .dg-router-panel .dg-lab-tab-active { color: var(--dgir-accent-text); border-color: var(--dgir-border-bright); background: var(--dgir-accent-soft); box-shadow: inset 0 0 12px var(--dgir-accent-soft); }
    .dg-router-panel .dg-lab-hero { display: grid; gap: 8px; padding: 9px; border: 1px solid var(--dgir-border); border-radius: var(--dgir-radius-lg); background: linear-gradient(145deg, color-mix(in srgb, var(--dgir-surface-raised) 86%, transparent), color-mix(in srgb, var(--dgir-bg) 78%, transparent)); }
    .dg-router-panel .dg-lab-output { width: 100%; max-height: 50vh; object-fit: contain; border: 1px solid var(--dgir-border-bright); border-radius: var(--dgir-radius-lg); background: #050505; }
    .dg-router-panel .dg-lab-generating { display: flex; align-items: center; gap: 8px; padding: 12px; border: 1px solid var(--dgir-border-bright); border-radius: var(--dgir-radius-md); background: var(--dgir-surface-soft); color: var(--dgir-text); font-size: 12px; font-weight: 700; }
    .dg-router-panel .dg-lab-generating::before { content: ''; width: 16px; height: 16px; border: 2px solid color-mix(in srgb, var(--dgir-accent) 32%, transparent); border-top-color: var(--dgir-accent); border-radius: 50%; animation: dg-relay-orbit .85s linear infinite; }
    .dg-router-panel .dg-vault-character-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 8px; margin: 10px 0; }
    .dg-router-panel .dg-vault-character-card { appearance: none; display: grid; grid-template-columns: 46px minmax(0, 1fr); align-items: center; gap: 9px; width: 100%; padding: 8px; border: 1px solid var(--dgir-border); border-radius: var(--dgir-radius-md); background: var(--dgir-surface-soft); color: var(--dgir-text); text-align: left; cursor: pointer; }
    .dg-router-panel .dg-vault-character-card.is-active { border-color: var(--dgir-border-bright); box-shadow: inset 0 0 18px var(--dgir-accent-soft); }
    .dg-router-panel .dg-vault-character-card img, .dg-router-panel .dg-vault-avatar-fallback { width: 46px; height: 46px; border-radius: 50%; object-fit: cover; display: grid; place-items: center; background: var(--dgir-accent-soft); color: var(--dgir-accent-text); font-weight: 900; }
    .dg-router-panel .dg-vault-character-body { min-width: 0; display: grid; gap: 3px; }
    .dg-router-panel .dg-vault-character-body strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .dg-router-panel .dg-vault-character-body small { color: var(--dgir-text-muted); line-height: 1.3; }
    .dg-router-panel .dg-vault-tabs { position: sticky; top: 0; z-index: 1; padding: 6px 0; background: color-mix(in srgb, var(--dgir-bg) 94%, transparent); backdrop-filter: blur(8px); }
    .dg-router-panel .dg-vault-fact-card { cursor: pointer; transition: border-color .15s ease, background .15s ease, box-shadow .15s ease; }
    .dg-router-panel .dg-vault-fact-card:hover { border-color: color-mix(in srgb, var(--dgir-accent) 58%, var(--dgir-border)); }
    .dg-router-panel .dg-vault-fact-card.is-selected { border-color: var(--dgir-accent); background: color-mix(in srgb, var(--dgir-accent-soft) 56%, var(--dgir-surface)); box-shadow: 0 0 0 1px color-mix(in srgb, var(--dgir-accent) 34%, transparent); }
    .dg-router-panel .dg-vault-fact-card .dg-history-head { grid-template-columns: minmax(0,1fr) auto auto; }
    .dg-router-panel .dg-vault-editor-modal { --dgir-modal-accent: color-mix(in srgb, var(--dgir-accent) 72%, #fff); }
    .dg-router-panel .dg-vault-editor { display: grid; gap: 14px; padding: 16px; }
    .dg-router-panel .dg-vault-editor-hero { display: grid; grid-template-columns: 46px minmax(0,1fr); gap: 12px; align-items: center; padding: 13px; border: 1px solid var(--dgir-border-bright); border-radius: var(--dgir-radius-lg); background: linear-gradient(135deg, color-mix(in srgb, var(--dgir-accent-soft) 72%, var(--dgir-surface)), var(--dgir-surface-soft)); }
    .dg-router-panel .dg-vault-editor-glyph { width: 46px; height: 46px; display: grid; place-items: center; border-radius: 15px; background: color-mix(in srgb, var(--dgir-accent) 22%, var(--dgir-surface-raised)); color: var(--dgir-accent-text); font-size: 22px; box-shadow: inset 0 1px rgba(255,255,255,.12); }
    .dg-router-panel .dg-vault-editor-hero strong { display: block; color: var(--dgir-text); font-size: 14px; }
    .dg-router-panel .dg-vault-editor-hero span { display: block; margin-top: 3px; color: var(--dgir-text-muted); font-size: 11px; line-height: 1.45; }
    .dg-router-panel .dg-vault-form-grid { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 10px; }
    .dg-router-panel .dg-vault-form-grid > .dg-field-wide { grid-column: 1 / -1; }
    .dg-router-panel .dg-choice-grid { display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: 8px; }
    .dg-router-panel .dg-choice-card { appearance: none; min-height: 78px; padding: 10px; display: grid; align-content: start; gap: 4px; border: 1px solid var(--dgir-border); border-radius: var(--dgir-radius-md); color: var(--dgir-text); background: var(--dgir-surface-soft); text-align: left; cursor: pointer; }
    .dg-router-panel .dg-choice-card strong { font-size: 12px; }
    .dg-router-panel .dg-choice-card small { color: var(--dgir-text-muted); font-size: 10px; line-height: 1.35; }
    .dg-router-panel .dg-choice-card:hover { border-color: var(--dgir-border-bright); }
    .dg-router-panel .dg-choice-card.is-active { border-color: var(--dgir-accent); background: color-mix(in srgb, var(--dgir-accent-soft) 66%, var(--dgir-surface)); box-shadow: 0 0 0 1px color-mix(in srgb, var(--dgir-accent) 28%, transparent), inset 0 0 18px color-mix(in srgb, var(--dgir-accent-soft) 48%, transparent); }
    .dg-router-panel .dg-modal-footer { position: sticky; bottom: 0; z-index: 2; justify-content: flex-end; padding-top: 12px; border-top: 1px solid var(--dgir-border); background: linear-gradient(180deg, transparent, var(--dgir-bg) 24%); }
    .dg-router-panel .dg-illustrator-settings { display: grid; gap: 12px; }
    .dg-router-panel .dg-illustrator-mode-grid { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 8px; }
    .dg-router-panel .dg-illustrator-mode-card { appearance: none; min-height: 82px; display: grid; align-content: center; justify-items: center; gap: 5px; padding: 11px; border: 1px solid var(--dgir-border); border-radius: var(--dgir-radius-md); color: var(--dgir-text); background: var(--dgir-surface-soft); text-align: center; cursor: pointer; transition: border-color .12s ease, background .12s ease, transform .12s ease; }
    .dg-router-panel .dg-illustrator-mode-card:hover { border-color: var(--dgir-border-bright); transform: translateY(-1px); }
    .dg-router-panel .dg-illustrator-mode-card strong { font-size: 12px; }
    .dg-router-panel .dg-illustrator-mode-card small { color: var(--dgir-text-muted); font-size: 10px; line-height: 1.35; }
    .dg-router-panel .dg-illustrator-mode-card.is-active { border-color: var(--dgir-accent); background: color-mix(in srgb, var(--dgir-accent-soft) 58%, var(--dgir-surface)); box-shadow: 0 0 0 1px color-mix(in srgb, var(--dgir-accent) 28%, transparent), inset 0 0 20px color-mix(in srgb, var(--dgir-accent-soft) 36%, transparent); }
    .dg-router-panel .dg-choice-compact { gap: 6px; }
    .dg-router-panel .dg-choice-compact.dg-choice-two { grid-template-columns: repeat(2, minmax(0,1fr)); }
    .dg-router-panel .dg-choice-compact.dg-choice-three { grid-template-columns: repeat(3, minmax(0,1fr)); }
    .dg-router-panel .dg-choice-compact.dg-choice-four { grid-template-columns: repeat(4, minmax(0,1fr)); }
    .dg-router-panel .dg-choice-compact.dg-choice-five { grid-template-columns: repeat(5, minmax(0,1fr)); }
    .dg-router-panel .dg-choice-compact.dg-choice-six { grid-template-columns: repeat(3, minmax(0,1fr)); }
    .dg-router-panel .dg-prose-mode-selector { grid-template-columns: repeat(3, minmax(0,1fr)); gap: 4px; }
    .dg-router-panel .dg-prose-mode-selector .dg-illustrator-mode-card { min-width: 0; min-height: 34px; align-content: center; justify-items: center; padding: 5px 3px; text-align: center; }
    .dg-router-panel .dg-prose-mode-selector .dg-illustrator-mode-card strong { white-space: nowrap; font-size: 10px; }
    .dg-router-panel .dg-prose-mode-selector .dg-illustrator-mode-card small { display: none; }
    .dg-router-panel .dg-choice-compact .dg-illustrator-mode-card { min-height: 58px; align-content: center; gap: 3px; padding: 8px; }
    .dg-router-panel .dg-choice-compact .dg-illustrator-mode-card strong { font-size: 11px; line-height: 1.2; }
    .dg-router-panel .dg-choice-compact .dg-illustrator-mode-card small { display: -webkit-box; overflow: hidden; -webkit-box-orient: vertical; -webkit-line-clamp: 2; font-size: 9px; line-height: 1.2; }
    .dg-router-panel .dg-illustrator-essentials { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 10px; padding: 12px; border: 1px solid var(--dgir-border); border-radius: var(--dgir-radius-lg); background: linear-gradient(145deg, var(--dgir-surface), var(--dgir-surface-soft)); }
    .dg-router-panel .dg-illustrator-prompt-controls { display: grid; gap: 10px; padding: 12px; border: 1px solid color-mix(in srgb, var(--dgir-accent) 34%, var(--dgir-border)); border-radius: var(--dgir-radius-lg); background: color-mix(in srgb, var(--dgir-accent-soft) 24%, var(--dgir-surface)); }
    .dg-router-panel .dg-illustrator-advanced { overflow: hidden; border: 1px solid var(--dgir-border); border-radius: var(--dgir-radius-lg); background: var(--dgir-surface-soft); }
    .dg-router-panel .dg-illustrator-advanced > summary { list-style: none; display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 12px 14px; color: var(--dgir-text); font-weight: 850; cursor: pointer; background: linear-gradient(90deg, color-mix(in srgb, var(--dgir-accent-soft) 44%, transparent), transparent); }
    .dg-router-panel .dg-illustrator-advanced > summary::-webkit-details-marker { display: none; }
    .dg-router-panel .dg-illustrator-advanced > summary::after { content: '⌄'; color: var(--dgir-accent-text); transition: transform .15s ease; }
    .dg-router-panel .dg-illustrator-advanced[open] > summary::after { transform: rotate(180deg); }
    .dg-router-panel .dg-illustrator-advanced-body { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 10px; padding: 12px; border-top: 1px solid var(--dgir-border); }
    .dg-router-panel .dg-prompt-snippet-panel { display: grid; gap: 10px; padding: 12px; border: 1px solid var(--dgir-border); border-radius: var(--dgir-radius-lg); background: var(--dgir-surface-soft); }
    .dg-router-panel .dg-prompt-snippet-list { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px,1fr)); gap: 8px; }
    .dg-router-panel .dg-prompt-snippet-card { display: grid; gap: 8px; padding: 10px; border: 1px solid var(--dgir-border); border-radius: var(--dgir-radius-md); background: var(--dgir-surface); }
    .dg-router-panel .dg-prompt-snippet-card.is-active { border-color: var(--dgir-accent); box-shadow: inset 0 0 20px color-mix(in srgb, var(--dgir-accent-soft) 42%, transparent); }
    .dg-router-panel .dg-deleted-asset-note { display: grid; gap: 4px; padding: 12px; border: 1px solid color-mix(in srgb, var(--dgir-warning) 40%, var(--dgir-border)); border-radius: var(--dgir-radius-md); background: color-mix(in srgb, var(--dgir-warning) 9%, var(--dgir-surface)); }
    .dg-router-panel .dg-asset-card.is-archived { border-color: color-mix(in srgb, var(--dgir-warning) 44%, var(--dgir-border)); }
    .dg-router-panel .dg-lora-toolbar { display: grid; grid-template-columns: minmax(0, 1fr) minmax(108px, .32fr) auto; gap: 7px; margin-bottom: 8px; align-items: stretch; }
    .dg-router-panel .dg-lora-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
    .dg-router-panel .dg-lora-card { display: grid; grid-template-columns: 74px minmax(0, 1fr); gap: 8px; min-width: 0; padding: 7px; border: 1px solid var(--dgir-border); border-radius: var(--dgir-radius-md); background: color-mix(in srgb, var(--dgir-surface-soft) 88%, transparent); }
    .dg-router-panel .dg-lora-preview { width: 74px; height: 96px; display: grid; place-items: center; object-fit: cover; border: 1px solid var(--dgir-border); border-radius: var(--dgir-radius-sm); background: #050505; color: var(--dgir-text-muted); font-size: 10px; text-align: center; }
    .dg-router-panel .dg-lora-name { color: var(--dgir-text); font-size: 12px; font-weight: 850; line-height: 1.25; overflow-wrap: anywhere; }
    .dg-router-panel .dg-lora-meta { margin: 3px 0 6px; color: var(--dgir-text-muted); font-size: 10px; line-height: 1.35; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
    .dg-router-panel .dg-lora-stack-row { display: grid; grid-template-columns: minmax(0, 1fr) 72px 72px auto; gap: 6px; align-items: end; padding: 8px; border: 1px solid var(--dgir-border); border-radius: var(--dgir-radius-md); background: var(--dgir-surface-soft); margin-bottom: 7px; }
    .dg-router-panel .dg-lab-status { color: var(--dgir-text-muted); font-size: 11px; line-height: 1.45; white-space: pre-wrap; }
    .dg-router-panel .dg-lab-param-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
    .dg-router-panel .dg-checkbox-row { flex-direction: row !important; align-items: center; min-height: 34px; }
    .dg-lab-compose-quickbar { display: flex; flex-wrap: wrap; gap: 7px; margin: 4px 0 8px; }
    .dg-lab-edit-controls { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; }
    .dg-lab-edit-media { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; margin: 8px 0; }
    .dg-lab-edit-asset { min-height: 120px; display: grid; gap: 6px; align-content: start; padding: 8px; border: 1px solid var(--dgir-border); border-radius: var(--dgir-radius-md); background: rgba(0,0,0,.16); }
    .dg-lab-edit-asset img { width: 100%; max-height: 220px; object-fit: contain; border-radius: var(--dgir-radius-sm); background: rgba(0,0,0,.28); }
    .dg-lab-edit-placeholder { min-height: 88px; display: grid; place-items: center; border: 1px dashed var(--dgir-border); border-radius: var(--dgir-radius-sm); color: var(--dgir-text-dim); font-size: 11px; }
    .dg-mask-editor { display: grid; gap: 10px; }
    .dg-mask-canvas { width: 100%; max-height: 70dvh; object-fit: contain; border: 1px solid var(--dgir-border-bright); border-radius: var(--dgir-radius-md); background-repeat: no-repeat; background-position: center; background-size: contain; touch-action: none; cursor: crosshair; }
    .dg-sidecar-global-notice { position: fixed; top: max(48px, calc(env(safe-area-inset-top) + 10px)); left: 50%; transform: translateX(-50%); z-index: 2147482500; pointer-events: none; display: grid; grid-template-columns: 8px auto auto minmax(0, 1fr); align-items: center; gap: 8px; width: min(680px, calc(100vw - 40px)); min-width: 0; padding: 10px 14px 12px; border: 1px solid color-mix(in srgb, var(--lumiverse-primary, #e980b7) 30%, var(--lcs-glass-border, var(--lumiverse-border, rgba(255,255,255,.18)))); border-radius: 999px; background: color-mix(in srgb, var(--lumiverse-primary, #e980b7) 9%, var(--lcs-glass-bg, var(--lumiverse-bg-elevated, rgba(20,12,18,.94)))); color: var(--lumiverse-text, #fff7fb); box-shadow: var(--lumiverse-shadow-sm, 0 10px 28px rgba(0,0,0,.32)), 0 0 0 1px color-mix(in srgb, var(--lumiverse-primary, #e980b7) 14%, transparent); overflow: hidden; white-space: nowrap; backdrop-filter: blur(var(--lcs-glass-blur, 8px)); -webkit-backdrop-filter: blur(var(--lcs-glass-blur, 8px)); font-family: var(--lumiverse-font-family, system-ui, sans-serif); }
    .dg-sidecar-global-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--lumiverse-primary, #e980b7); box-shadow: 0 0 0 4px color-mix(in srgb, var(--lumiverse-primary, #e980b7) 16%, transparent); }
    .dg-sidecar-global-title { min-width: 0; max-width: 9ch; overflow: hidden; text-overflow: ellipsis; font-size: calc(12px * var(--lumiverse-font-scale, 1)); font-weight: 700; }
    .dg-sidecar-global-separator { width: 1ch; text-align: center; color: var(--lumiverse-text-dim, #9d8fa3); }
    .dg-sidecar-global-detail { min-width: 0; overflow: hidden; text-overflow: ellipsis; color: var(--lumiverse-text-muted, #c2b3c5); font-size: calc(12px * var(--lumiverse-font-scale, 1)); }
    .dg-sidecar-global-bar { position: absolute; left: 12px; right: 12px; bottom: 6px; height: 2px; overflow: hidden; border-radius: 999px; background: color-mix(in srgb, var(--lumiverse-border, #5a465d) 70%, transparent); }
    .dg-sidecar-global-fill { position: absolute; inset: 0; transform-origin: left center; background: linear-gradient(90deg, var(--lumiverse-primary, #e980b7), color-mix(in srgb, var(--lumiverse-primary, #e980b7) 60%, white)); animation: dg-sidecar-progress 1.7s ease-in-out infinite; }
    @keyframes dg-sidecar-progress { 0% { transform: translateX(-75%) scaleX(.28); } 50% { transform: translateX(22%) scaleX(.72); } 100% { transform: translateX(105%) scaleX(.28); } }
    .dg-relay-orb { position: fixed; z-index: 2147482000; left: 0; top: 0; width: 52px; height: 52px; display: grid; place-items: center; border: 1px solid color-mix(in srgb, var(--lumiverse-primary, #e980b7) 72%, #c8b5ff); border-radius: 50%; background: linear-gradient(145deg, color-mix(in srgb, var(--lumiverse-fill, #211825) 88%, #09070d), color-mix(in srgb, var(--lumiverse-primary, #e980b7) 23%, #17121a)); color: var(--lumiverse-text, #fff7fb); font: 800 15px/1 ui-serif, Georgia, serif; letter-spacing: 0; cursor: grab; box-shadow: 0 8px 26px rgba(4,2,8,.38), 0 0 0 1px rgba(255,255,255,.06) inset, 0 0 18px color-mix(in srgb, var(--lumiverse-primary, #e980b7) 28%, transparent); transition: box-shadow .16s ease, opacity .16s ease, filter .16s ease; touch-action: none; user-select: none; }
    .dg-relay-orb::before { content: ''; position: absolute; inset: 7px; border: 1px solid color-mix(in srgb, #c8b5ff 42%, transparent); border-radius: 50%; transform: rotate(45deg); pointer-events: none; }
    .dg-relay-orb::after { content: none; }
    .dg-relay-orb-mark { position: relative; z-index: 2; }
    .dg-relay-orb-icon { position: absolute; inset: 1px; z-index: 1; display: none; border-radius: 50%; background-image: var(--dg-relay-orb-icon); background-position: center; background-size: contain; background-repeat: no-repeat; filter: saturate(1.08) brightness(1.06); pointer-events: none; }
    .dg-relay-orb-image-design { overflow: visible; background: transparent; border-color: color-mix(in srgb, var(--lumiverse-primary, #e980b7) 70%, #ffd5a3); }
    .dg-relay-orb-image-design .dg-relay-orb-mark { opacity: 0; }
    .dg-relay-orb-image-design .dg-relay-orb-icon { display: block; }
    .dg-relay-orb-image-design::before, .dg-relay-orb-image-design::after { opacity: 0; }
    .dg-relay-orb:hover { box-shadow: 0 11px 30px rgba(4,2,8,.44), 0 0 22px color-mix(in srgb, var(--lumiverse-primary, #e980b7) 42%, transparent); }
    .dg-relay-orb:focus-visible { outline: 2px solid var(--lumiverse-primary, #e980b7); outline-offset: 4px; }
    .dg-relay-orb[aria-busy="true"] { cursor: grab; opacity: .92; }
    .dg-relay-orb[aria-busy="true"]::before, .dg-relay-orb-scanning::before, .dg-relay-orb-analyzing::before, .dg-relay-orb-preparing::before, .dg-relay-orb-generating::before { animation: dg-relay-orbit 1.5s linear infinite; }
    .dg-relay-orb-scanning, .dg-relay-orb-analyzing, .dg-relay-orb-preparing, .dg-relay-orb-generating { animation: dg-relay-orb-active 1.05s ease-in-out infinite alternate; filter: saturate(1.08); }
    .dg-relay-orb-image-design.dg-relay-orb-generating .dg-relay-orb-icon { animation: dg-relay-orb-icon-spin 1.15s linear infinite; }
    .dg-relay-orb-image-design.dg-relay-orb-analyzing { border-style: dashed; box-shadow: 0 0 0 1px color-mix(in srgb, #ffd5a3 36%, transparent), 0 0 18px color-mix(in srgb, #ffd5a3 34%, transparent); }
    .dg-relay-orb-image-design.dg-relay-orb-analyzing .dg-relay-orb-icon { animation: dg-relay-orb-icon-analyze 1.05s ease-in-out infinite alternate; transform-origin: center; }
    .dg-relay-orb-image-design[aria-busy="true"] .dg-relay-orb-icon { animation: dg-relay-orb-icon-spin 1.15s linear infinite; transform-origin: center; }
    .dg-relay-orb-dragging { cursor: grabbing; transition: none; animation: none !important; }
    .dg-relay-orb-modal-suppressed { opacity: .42; }
    .dg-relay-orb-size-small { width: 44px; height: 44px; font-size: 12px; }
    .dg-relay-orb-size-medium { width: 52px; height: 52px; font-size: 15px; }
    .dg-relay-orb-size-large { width: 62px; height: 62px; font-size: 18px; }
    .dg-relay-orb-design-minimal { background: color-mix(in srgb, var(--lumiverse-fill, #211825) 94%, #09070d); box-shadow: 0 7px 18px rgba(4,2,8,.34); }
    .dg-relay-orb-design-minimal::before, .dg-relay-orb-design-minimal::after { opacity: .35; }
    .dg-relay-orb-design-glow { box-shadow: 0 8px 26px rgba(4,2,8,.38), 0 0 28px color-mix(in srgb, var(--lumiverse-primary, #e980b7) 62%, transparent); }
    .dg-relay-orb-design-glass { background: color-mix(in srgb, var(--lumiverse-fill, #211825) 62%, transparent); backdrop-filter: blur(10px); box-shadow: 0 10px 28px rgba(4,2,8,.36), inset 0 1px rgba(255,255,255,.16); }
    .dg-relay-orb-ready { box-shadow: 0 8px 26px rgba(4,2,8,.38), 0 0 0 1px rgba(255,255,255,.06) inset, 0 0 22px color-mix(in srgb, var(--dgir-success, #91d7bd) 42%, transparent); }
    .dg-relay-orb-failed { box-shadow: 0 8px 26px rgba(4,2,8,.38), 0 0 0 1px rgba(255,255,255,.06) inset, 0 0 22px color-mix(in srgb, var(--dgir-danger, #e88396) 48%, transparent); }
    .dg-relay-orb-badge { position: absolute; z-index: 3; min-width: 16px; height: 16px; display: grid; place-items: center; right: -3px; top: -4px; padding: 0 4px; border-radius: 999px; border: 1px solid rgba(255,255,255,.28); background: color-mix(in srgb, var(--lumiverse-primary, #e980b7) 72%, #211825); color: #fff; font: 800 9px/1 system-ui, sans-serif; }
    .dg-relay-orb-status { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
    .dg-relay-review { max-height: min(72vh, 680px); overflow: auto; }
    .dg-relay-candidate { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 8px; padding: 9px; border: 1px solid var(--dgir-border); border-radius: var(--dgir-radius-md); background: var(--dgir-surface-soft); }
    .dg-relay-candidate-head { grid-column: 1 / -1; display: flex; align-items: center; justify-content: space-between; gap: 8px; color: var(--dgir-text-muted); font-size: 11px; }
    .dg-relay-candidate img { width: 100%; aspect-ratio: 1 / 1; object-fit: cover; border: 1px solid var(--dgir-border); border-radius: var(--dgir-radius-sm); background: var(--dgir-bg); }
    .dg-relay-candidate-selected { border-color: var(--dgir-border-bright); box-shadow: 0 0 0 1px var(--dgir-accent-soft), inset 0 0 18px var(--dgir-accent-soft); }
    .dg-relay-candidate-selectable img { cursor: pointer; }
    .dg-relay-image-choice { position: relative; padding: 5px; border: 1px solid color-mix(in srgb, var(--dgir-border) 82%, transparent); border-radius: var(--dgir-radius-md); background: rgba(0,0,0,.12); min-height: 84px; }
    .dg-relay-image-choice-clickable { cursor: pointer; }
    .dg-relay-image-choice-selected { border-color: var(--dgir-accent); box-shadow: 0 0 0 2px color-mix(in srgb, var(--dgir-accent) 30%, transparent), inset 0 0 18px color-mix(in srgb, var(--dgir-accent) 18%, transparent); }
    .dg-relay-candidate-label { margin-top: 4px; color: var(--dgir-text-dim); font-size: 10px; }
    .dg-relay-candidate-meta { grid-column: 1 / -1; color: var(--dgir-text-muted); font-size: 10px; line-height: 1.4; overflow-wrap: anywhere; }
    .dg-relay-candidate-failed { border-color: color-mix(in srgb, var(--dgir-danger) 55%, var(--dgir-border)); }
    .dg-relay-candidate-unavailable { border-color: color-mix(in srgb, var(--dgir-warning) 55%, var(--dgir-border)); }
    .dg-manual-list { display: grid; gap: 7px; margin-top: 8px; color: var(--dgir-text-muted); font-size: 12px; line-height: 1.45; }
    .dg-manual-list > div { padding-left: 10px; border-left: 2px solid color-mix(in srgb, var(--dgir-accent) 42%, transparent); }

    .dg-router-panel.dg-modal-host, .dg-router-panel .dg-modal, .dg-router-panel .dg-modal-body { background-color: #12080f; }
    .dg-router-panel.dg-modal-host { z-index: 2147483647 !important; opacity: 1 !important; backdrop-filter: none !important; }
    .dg-router-panel.dg-modal-host > *, .dg-router-panel .dg-modal { background-image: linear-gradient(145deg, #210b17, #0a050b) !important; opacity: 1 !important; }
    .dg-relay-menu-open .dg-relay-orb { pointer-events: none !important; }
    .dg-router-panel .dg-status-chips { display: flex; flex-wrap: wrap; gap: 6px; margin: 6px 0 10px; }
    .dg-router-panel .dg-tutorial { margin: 8px 0 12px; padding: 12px; border: 1px solid var(--dgir-border-bright); border-radius: var(--dgir-radius-lg); background: linear-gradient(135deg, #25101d, #0d0710); box-shadow: 0 10px 28px rgba(0,0,0,.32); }
    .dg-router-panel .dg-tutorial strong { display:block; margin-bottom:5px; font: 800 14px/1.2 ui-serif, Georgia, serif; }
    .dg-router-panel .dg-tutorial p { margin:0 0 8px; color:var(--dgir-text-muted); font-size:12px; line-height:1.45; }
    .dg-router-panel .dg-history-subtabs { display:flex; flex-wrap:wrap; gap:6px; margin-bottom:10px; }
    @keyframes dg-relay-orbit { to { transform: rotate(405deg); } }
    @keyframes dg-relay-orb-active { from { filter: saturate(1.02) brightness(1); box-shadow: 0 8px 26px rgba(4,2,8,.38), 0 0 18px color-mix(in srgb, var(--lumiverse-primary, #e980b7) 28%, transparent); } to { filter: saturate(1.16) brightness(1.06); box-shadow: 0 10px 30px rgba(4,2,8,.42), 0 0 28px color-mix(in srgb, var(--lumiverse-primary, #e980b7) 46%, transparent); } }
    @keyframes dg-relay-orb-icon-spin { to { transform: rotate(360deg); } }
    @keyframes dg-relay-orb-icon-analyze { from { transform: scale(.88) rotate(-7deg); opacity: .72; filter: saturate(.9) brightness(.95); } to { transform: scale(1.08) rotate(7deg); opacity: 1; filter: saturate(1.25) brightness(1.12); } }
    @media (prefers-reduced-motion: reduce) { .dg-router-panel .dg-sidecar-indicator::before, .dg-relay-orb[aria-busy="true"]::before, .dg-relay-orb-scanning::before, .dg-relay-orb-analyzing::before, .dg-relay-orb-preparing::before, .dg-relay-orb-generating::before, .dg-relay-orb-scanning, .dg-relay-orb-analyzing, .dg-relay-orb-preparing, .dg-relay-orb-generating, .dg-relay-orb-image-design[aria-busy="true"] .dg-relay-orb-icon, .dg-relay-orb-image-design.dg-relay-orb-generating .dg-relay-orb-icon, .dg-relay-orb-image-design.dg-relay-orb-analyzing .dg-relay-orb-icon { animation: none; } }
    @keyframes dg-prism-shimmer { from { transform: translateX(-45%); } to { transform: translateX(45%); } }

    /* Reverie Suite · Reverie Suite shell. Inspired by LumiBooks' calm hierarchy,
       but keeps Relay's own prism, living-surface, and archive identity. */
    .dg-router-panel.dg-suite-shell { container: dg-suite / inline-size; padding: 14px; border-radius: var(--dgir-radius-lg); }
    .dg-router-panel .dg-suite-stage { min-width: 0; }
    .dg-router-panel .dg-suite-head { gap: 14px; padding: 15px; margin-bottom: 12px; }
    .dg-router-panel .dg-suite-head::after { opacity: .18; }
    .dg-router-panel .dg-overview-label { display: flex; align-items: center; gap: 12px; color: var(--dgir-text-muted); font: 700 9px/1.2 var(--lumiverse-font-family, system-ui, sans-serif); letter-spacing: .2em; text-transform: uppercase; }
    .dg-router-panel .dg-overview-label::before, .dg-router-panel .dg-overview-label::after { content: ''; flex: 1; height: 1px; background: linear-gradient(90deg, transparent, var(--dgir-border), transparent); }
    .dg-router-panel .dg-head-actions { justify-content: flex-end; }
    .dg-router-panel .dg-suite-navigation { display: grid; gap: 8px; margin-bottom: 12px; }
    .dg-router-panel .dg-suite-primary { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 5px; padding: 5px; overflow: hidden; border: 1px solid var(--dgir-glass-line); border-radius: var(--dgir-radius-lg); background: color-mix(in srgb, var(--dgir-surface) 92%, transparent); box-shadow: inset 0 1px var(--dgir-glass-highlight); }
    .dg-router-panel .dg-suite-primary-tab { min-width: 0; min-height: 58px; display: grid; place-items: center; align-content: center; gap: 5px; border: 0; border-radius: var(--dgir-radius-md); padding: 8px 4px; color: var(--dgir-text-dim); background: transparent; font: 700 10px/1.1 var(--lumiverse-font-family, system-ui, sans-serif); letter-spacing: .02em; cursor: pointer; transition: background-color .16s ease, color .16s ease; overflow: hidden; }
    .dg-router-panel .dg-suite-primary-tab:hover { color: var(--dgir-text); background: rgba(255,255,255,.035); }
    .dg-router-panel .dg-suite-primary-tab.is-active { color: var(--dgir-accent-text); background: var(--dgir-accent-soft); box-shadow: inset 0 -2px var(--dgir-accent); }
    .dg-router-panel .dg-suite-primary-icon { color: var(--dgir-accent); font: 500 19px/1 var(--lumiverse-font-family, system-ui, sans-serif); }
    .dg-router-panel .dg-suite-primary-tab.is-active .dg-suite-primary-icon { color: var(--dgir-accent-text); }
    .dg-router-panel .dg-suite-secondary { display: flex; flex-wrap: wrap; justify-content: center; gap: 3px; padding: 2px 4px; }
    .dg-router-panel .dg-suite-secondary-tab { position: relative; min-height: 34px; border: 1px solid transparent; border-radius: 999px; padding: 8px 13px; color: var(--dgir-text-dim); background: transparent; font: 700 10px/1 var(--lumiverse-font-family, system-ui, sans-serif); letter-spacing: .09em; text-transform: uppercase; cursor: pointer; }
    .dg-router-panel .dg-suite-secondary-tab:hover { color: var(--dgir-text); }
    .dg-router-panel .dg-suite-secondary-tab.is-active { color: var(--dgir-accent-text); border-color: var(--dgir-glass-line); background: var(--dgir-accent-soft); }
    .dg-router-panel .dg-section { padding: 14px; margin-bottom: 12px; border-radius: var(--dgir-radius-lg); background: color-mix(in srgb, var(--dgir-surface) 94%, transparent); box-shadow: 0 8px 22px rgba(5,2,12,.14), inset 0 1px var(--dgir-glass-highlight); }
    .dg-router-panel .dg-section-title { display: flex; align-items: center; gap: 8px; margin: 0 0 12px; color: var(--dgir-text-muted); font: 750 10px/1.3 var(--lumiverse-font-family, system-ui, sans-serif); letter-spacing: .17em; text-align: left; text-transform: uppercase; }
    .dg-router-panel .dg-section-title::before, .dg-router-panel .dg-section-title::after { content: none; }
    .dg-router-panel .dg-section-sub { line-height: 1.55; }
    .dg-router-panel .dg-surface-intro { display: flex; align-items: center; justify-content: space-between; gap: 14px; }
    .dg-router-panel .dg-surface-intro > div:first-child { display: grid; gap: 5px; min-width: 0; }
    .dg-router-panel .dg-surface-intro strong { font: 750 15px/1.2 var(--lumiverse-font-family, system-ui, sans-serif); letter-spacing: -.02em; }
    .dg-router-panel .dg-surface-intro span { color: var(--dgir-text-muted); font-size: 11px; line-height: 1.5; }
    .dg-router-panel .dg-surface-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 9px; }
    .dg-router-panel .dg-surface-card { min-width: 0; display: grid; grid-template-columns: 36px minmax(0, 1fr) auto; align-items: start; gap: 10px; padding: 11px; border: 1px solid var(--dgir-glass-line); border-left: 2px solid var(--dgir-border); border-radius: var(--dgir-radius-md); background: color-mix(in srgb, var(--dgir-surface-soft) 64%, transparent); box-shadow: inset 0 1px rgba(255,255,255,.06); -webkit-backdrop-filter: blur(12px); backdrop-filter: blur(12px); }
    .dg-router-panel .dg-surface-card.is-enabled { border-left-color: var(--dgir-accent); }
    .dg-router-panel .dg-surface-card.has-error { border-left-color: var(--dgir-danger); }
    .dg-router-panel .dg-surface-icon { width: 34px; height: 34px; display: grid; place-items: center; border: 1px solid var(--dgir-border); border-radius: var(--dgir-radius-sm); color: var(--dgir-accent); background: var(--dgir-accent-soft); font: 500 16px/1 var(--lumiverse-font-family, system-ui, sans-serif); }
    .dg-router-panel .dg-surface-body { min-width: 0; display: grid; gap: 4px; }
    .dg-router-panel .dg-surface-body > strong { font: 700 13px/1.25 var(--lumiverse-font-family, system-ui, sans-serif); }
    .dg-router-panel .dg-surface-meta { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--dgir-text-dim); font: 10px/1.35 ui-monospace, SFMono-Regular, Consolas, monospace; }
    .dg-router-panel .dg-surface-body p { margin: 2px 0 4px; color: var(--dgir-text-muted); font-size: 11px; line-height: 1.45; }
    .dg-router-panel .dg-surface-actions { margin-top: 3px; }
    .dg-router-panel .dg-surface-empty { grid-column: 1 / -1; display: grid; gap: 5px; padding: 15px; border: 1px dashed var(--dgir-border); border-radius: var(--dgir-radius-md); text-align: center; }
    .dg-router-panel .dg-surface-empty strong { font: 700 13px/1.2 var(--lumiverse-font-family, system-ui, sans-serif); }
    .dg-router-panel .dg-surface-empty span { color: var(--dgir-text-muted); font-size: 11px; }
    .dg-router-panel .dg-protocol-card { display: flex; align-items: center; justify-content: space-between; gap: 14px; padding: 11px; border: 1px solid var(--dgir-border); border-left: 2px solid var(--dgir-accent); border-radius: 9px; background: color-mix(in srgb, var(--dgir-accent) 5%, var(--dgir-surface-soft)); }
    .dg-router-panel .dg-protocol-card > div:first-child { display: grid; gap: 5px; min-width: 0; }
    .dg-router-panel .dg-protocol-card strong { font: 700 13px/1.25 ui-serif, Georgia, serif; }
    .dg-router-panel .dg-protocol-card span { color: var(--dgir-text-muted); font-size: 11px; line-height: 1.5; }
    .dg-router-panel .reverie-artifact-media, img[data-reverie-artifact-media="true"] { max-width: 100%; height: auto; display: block; cursor: zoom-in; }

    /* The Suite often lives in a narrow side panel while the browser viewport
       remains wide. Container queries keep that real panel geometry usable;
       viewport-only mobile rules cannot see this case. */
    @container dg-suite (max-width: 560px) {
      .dg-suite-stage .dg-head-top { align-items: stretch; flex-direction: column; }
      .dg-suite-stage .dg-head-actions { justify-content: flex-start; flex-wrap: wrap; }
      .dg-suite-stage .dg-summary { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .dg-suite-navigation .dg-suite-primary { grid-template-columns: repeat(3, minmax(0, 1fr)); }
      .dg-suite-navigation .dg-suite-primary-tab { min-height: 48px; padding: 6px 3px; font-size: 9px; }
      .dg-suite-navigation .dg-suite-secondary { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); justify-content: stretch; }
      .dg-suite-navigation .dg-suite-secondary-tab { min-width: 0; padding-inline: 5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .dg-suite-stage .dg-section { padding: 10px; }
      .dg-suite-stage .dg-choice-grid,
      .dg-suite-stage .dg-choice-compact.dg-choice-three,
      .dg-suite-stage .dg-choice-compact.dg-choice-four,
      .dg-suite-stage .dg-choice-compact.dg-choice-five,
      .dg-suite-stage .dg-choice-compact.dg-choice-six,
      .dg-suite-stage .dg-illustrator-mode-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .dg-suite-stage .dg-prose-mode-selector { grid-template-columns: repeat(3, minmax(0,1fr)); }
      .dg-suite-stage .dg-illustrator-essentials,
      .dg-suite-stage .dg-illustrator-advanced-body,
      .dg-suite-stage .dg-settings-grid,
      .dg-suite-stage .dg-filter-grid,
      .dg-suite-stage .dg-vault-form-grid,
      .dg-suite-stage .dg-surface-grid,
      .dg-suite-stage .dg-lora-grid { grid-template-columns: 1fr; }
      .dg-suite-stage .dg-prompt-snippet-list { grid-template-columns: 1fr; }
      .dg-suite-stage .dg-surface-intro,
      .dg-suite-stage .dg-protocol-card { align-items: stretch; flex-direction: column; }
      .dg-suite-stage .dg-actions { flex-wrap: wrap; }
      .dg-suite-stage .dg-actions > .dg-btn { max-width: 100%; white-space: normal; }
    }

    @container dg-suite (max-width: 330px) {
      .dg-suite-stage .dg-suite-head { padding: 9px; }
      .dg-suite-stage .dg-suite-primary-tab { min-height: 44px; font-size: 8px; }
      .dg-suite-stage .dg-suite-primary-icon { font-size: 16px; }
      .dg-suite-stage .dg-choice-compact .dg-illustrator-mode-card { min-height: 48px; padding: 7px 5px; }
      .dg-suite-stage .dg-choice-compact .dg-illustrator-mode-card small { display: none; }
      .dg-suite-stage .dg-section-title { letter-spacing: .1em; }
      .dg-suite-stage .dg-overview-label { letter-spacing: .1em; }
    }

    @media (max-width: 470px) {
      .dg-router-panel.dg-suite-shell { padding: 8px; }
      .dg-router-panel .dg-suite-head { padding: 11px; }
      .dg-router-panel .dg-suite-primary { grid-template-columns: repeat(3, minmax(0, 1fr)); }
      .dg-router-panel .dg-suite-primary-tab { min-width: 0; min-height: 48px; padding: 6px 3px; font-size: 9px; letter-spacing: 0; }
      .dg-router-panel .dg-suite-primary-icon { font-size: 17px; }
      .dg-router-panel .dg-suite-secondary { display: grid; grid-auto-flow: column; grid-auto-columns: minmax(0,1fr); justify-content: stretch; overflow: hidden; flex-wrap: nowrap; scrollbar-width: none; }
      .dg-router-panel .dg-suite-secondary-tab { white-space: nowrap; padding: 7px 4px; font-size: 9px; letter-spacing: 0; }
      .dg-router-panel .dg-choice-compact .dg-illustrator-mode-card { min-height: 48px; padding: 7px 5px; text-align: center; place-items: center; }
      .dg-router-panel .dg-choice-compact .dg-illustrator-mode-card small { display: none; }
      .dg-router-panel .dg-choice-compact.dg-choice-five { grid-template-columns: repeat(2, minmax(0,1fr)); }
      .dg-router-panel .dg-choice-compact.dg-choice-six { grid-template-columns: repeat(2, minmax(0,1fr)); }
      .dg-router-panel .dg-prose-mode-selector { grid-template-columns: repeat(3, minmax(0,1fr)); }
      .dg-router-panel .dg-prose-mode-selector .dg-illustrator-mode-card { min-height: 34px; padding: 4px 2px; }
      .dg-router-panel .dg-surface-intro, .dg-router-panel .dg-protocol-card { align-items: stretch; flex-direction: column; }
      .dg-router-panel .dg-surface-grid { grid-template-columns: 1fr; }
      .dg-router-panel .dg-surface-card { grid-template-columns: 34px minmax(0, 1fr); }
      .dg-router-panel .dg-surface-card > .dg-chip { grid-column: 2; justify-self: start; }
      .dg-router-panel { padding: 9px; }
      .dg-router-panel .dg-summary { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .dg-router-panel .dg-head-top { flex-direction: column; }
      .dg-router-panel .dg-head-top > .dg-btn { width: 100%; }
      .dg-router-panel .dg-slot-grid { grid-template-columns: 1fr; }
      .dg-router-panel .dg-thumb, .dg-router-panel .dg-thumb-empty { width: 100%; height: auto; aspect-ratio: 16 / 9; }
      .dg-router-panel .dg-settings-grid, .dg-router-panel .dg-filter-grid { grid-template-columns: 1fr; }
      .dg-router-panel .dg-history-item { grid-template-columns: 58px minmax(0, 1fr); }
      .dg-router-panel .dg-history-thumb { width: 58px; height: 58px; }
      .dg-router-panel .dg-asset-card, .dg-router-panel .dg-asset-card-compact { grid-template-columns: 94px minmax(0, 1fr); gap: 9px; padding: 8px; }
      .dg-router-panel .dg-asset-card-thumb, .dg-router-panel .dg-asset-card-compact .dg-asset-card-thumb { width: 94px; height: 94px; }
      .dg-router-panel .dg-asset-card-title { font-size: 12px; }
      .dg-router-panel .dg-asset-card-summary { -webkit-line-clamp: 2; font-size: 10px; }
      .dg-router-panel .dg-asset-card-chips { display: none; }
      .dg-router-panel .dg-asset-card-actions .dg-btn { min-height: 28px; padding: 5px 7px; }
      .dg-router-panel.dg-asset-lightbox { width: calc(100dvw - 20px) !important; min-height: 0 !important; height: auto !important; max-height: calc(100dvh - 20px) !important; margin: 0 !important; border-radius: var(--dgir-radius-lg) !important; overflow-y: auto; }
      .dg-router-panel .dg-modal-body.dg-asset-lightbox-body { grid-template-columns: 1fr; grid-template-rows: auto auto; min-height: 0; max-height: calc(100dvh - 72px); overflow-y: auto; padding: 6px; }
      .dg-router-panel .dg-asset-lightbox-stage { height: auto; min-height: 0; max-height: min(72dvh, calc(100dvh - 230px)); }
      .dg-router-panel .dg-asset-lightbox-image { max-height: min(72dvh, calc(100dvh - 230px)); }
      .dg-router-panel .dg-asset-lightbox-details { padding: 8px; }
      .dg-relay-lightbox-scroll-frame, .dg-relay-lightbox-modal-frame { max-height: calc(100dvh - 20px) !important; }
      .dg-relay-lightbox-scroll-frame { padding: 8px !important; }
      .dg-router-panel.dg-slot-lightbox { width: min(1480px, 100%) !important; max-width: 100% !important; max-height: calc(100dvh - 20px) !important; min-height: 0 !important; margin: 0 auto !important; border-radius: var(--dgir-radius-lg) !important; overflow: hidden; }
      .dg-router-panel .dg-slot-lightbox-body { grid-template-columns: minmax(0, 1fr); grid-template-rows: minmax(0, auto) auto; gap: 6px; width: 100%; max-height: calc(100dvh - 98px); padding: 6px; }
      .dg-router-panel .dg-slot-lightbox-body > .dg-image-lightbox-viewport { max-height: min(35dvh, calc(100dvh - 375px), 360px); }
      .dg-router-panel .dg-slot-lightbox-body > .dg-image-lightbox-viewport > .dg-lightbox-img { max-height: min(35dvh, calc(100dvh - 375px), 360px); }
      .dg-router-panel .dg-slot-lightbox-controls { gap: 4px; padding: 5px; border-radius: var(--dgir-radius-lg); }
      .dg-router-panel .dg-slot-lightbox-primary-actions { gap: 4px; }
      .dg-router-panel .dg-slot-lightbox-primary-actions .dg-btn { min-height: 29px; padding: 5px 7px; font-size: 9px; }
      .dg-router-panel .dg-slot-lightbox-footer { justify-content: center; gap: 4px; padding-top: 4px; }
      .dg-router-panel .dg-slot-lightbox-footer .dg-actions { justify-content: center; gap: 4px; }
      .dg-router-panel .dg-slot-lightbox-footer .dg-btn { min-height: 28px; padding: 5px 6px; font-size: 9px; }
      .dg-router-panel .dg-slot-lightbox-history-manage > .dg-manage > summary { min-height: 29px; padding: 5px 7px; font-size: 9px; }
      .dg-router-panel .dg-plan-row { grid-template-columns: 1fr; gap: 3px; }
      .dg-router-panel .dg-meta-grid { grid-template-columns: 1fr; }
      .dg-router-panel .dg-meta-label { margin-top: 5px; }
      .dg-router-panel .dg-asset-toolbar { grid-template-columns: 1fr; }
      .dg-router-panel .dg-lora-toolbar, .dg-router-panel .dg-lora-grid, .dg-router-panel .dg-lora-card, .dg-router-panel .dg-lora-stack-row, .dg-router-panel .dg-lab-param-grid { grid-template-columns: 1fr; }
      .dg-lab-edit-controls, .dg-lab-edit-media { grid-template-columns: 1fr; }
      .dg-router-panel .dg-lora-preview { width: 100%; height: auto; aspect-ratio: 1 / 1; }
      [data-component="MessageContent"] p:has(:is(img[alt="reverie-relay"], img[data-dgir-app="prose"])) { --dgir-bubble-image-inner-width: calc(100% - 28px); }
      scene_image[data-dgir-prose-align] > img[data-dgir-app="prose"], scene_image:has(img[data-dgir-app="prose"]) > img[data-dgir-app="prose"], .dgir-prose-image-frame > img[data-dgir-app="prose"], img[data-dgir-app="prose"] { width: min(100%, var(--dgir-prose-image-width, 66%)) !important; min-width: 0 !important; }
    }
    @media (prefers-reduced-motion: reduce) {
      .dg-router-panel *, .dg-router-panel *::before, .dg-router-panel *::after { animation-duration: .01ms !important; animation-iteration-count: 1 !important; transition-duration: .01ms !important; scroll-behavior: auto !important; }
    }

    /* Keep Relay chrome compositor-light. The panel and its floating InputArea
       controls sit above Lumiverse's live chat; backdrop filters and layered
       gradients there can make the host UI repaint/flicker on mobile GPUs. */
    .dg-router-panel,
    .dg-router-panel *,
    .dg-router-panel::before,
    .dg-router-panel::after,
    .dg-router-panel *::before,
    .dg-router-panel *::after {
      background-image: none !important;
      -webkit-backdrop-filter: none !important;
      backdrop-filter: none !important;
    }
    .dg-router-panel,
    :root[data-dgir-theme="clean-panel"] .dg-router-panel {
      background-color: var(--dgir-bg) !important;
      border-color: var(--dgir-glass-line);
      border-radius: var(--dgir-radius-lg);
      box-shadow: var(--dgir-shadow), inset 0 1px var(--dgir-glass-highlight);
    }
    .dg-router-panel::before { content: none !important; display: none !important; }
    .dg-router-panel .dg-head,
    .dg-router-panel .dg-section,
    .dg-router-panel .dg-slot-card,
    .dg-router-panel .dg-asset-card,
    .dg-router-panel .dg-beat-card.is-selected,
    .dg-router-panel .dg-background-queue,
    .dg-router-panel .dg-next-action,
    .dg-router-panel .dg-confirm-dialog,
    .dg-router-panel .dg-lab-hero,
    .dg-router-panel .dg-vault-editor-hero,
    .dg-router-panel .dg-illustrator-essentials,
    .dg-router-panel .dg-tutorial,
    .dg-router-panel .dg-creator-section,
    .dg-router-panel .dg-creator-advanced,
    .dg-router-panel .dg-protocol-card,
    .dg-router-panel .dg-relay-candidate,
    .dg-router-panel .dg-vault-character-card,
    .dg-router-panel .dg-lora-card,
    .dg-router-panel .dg-log,
    .dg-router-panel .dg-rescan-result { background-color: var(--dgir-surface) !important; }
    .dg-router-panel .dg-head,
    .dg-router-panel .dg-section,
    .dg-router-panel .dg-slot-card,
    .dg-router-panel .dg-asset-card,
    .dg-router-panel .dg-background-queue,
    .dg-router-panel .dg-next-action,
    .dg-router-panel .dg-confirm-dialog,
    .dg-router-panel .dg-lab-hero,
    .dg-router-panel .dg-vault-editor-hero,
    .dg-router-panel .dg-illustrator-essentials,
    .dg-router-panel .dg-tutorial,
    .dg-router-panel .dg-creator-section,
    .dg-router-panel .dg-creator-advanced,
    .dg-router-panel .dg-relay-candidate,
    .dg-router-panel .dg-lora-card { border-radius: var(--dgir-radius-lg); }
    .dg-router-panel .dg-prism:not(.dg-prism-overview),
    .dg-router-panel .dg-tab-active,
    .dg-router-panel .dg-toggle-on,
    .dg-router-panel .dg-btn-primary,
    .dg-router-panel .dg-suite-primary-tab.is-active,
    .dg-router-panel .dg-suite-secondary-tab.is-active { background-color: var(--dgir-accent-soft) !important; }
    .dg-router-panel .dg-prism.dg-prism-overview { border: 0 !important; border-radius: 0 !important; background: transparent !important; background-color: transparent !important; box-shadow: none !important; }
    .dg-router-panel .dg-help-trigger,
    .dg-router-panel .dg-info-note,
    .dg-router-panel .dg-creator-notice,
    .dg-router-panel .dg-thumb-empty,
    .dg-router-panel .dg-btn,
    .dg-router-panel .dg-suite-primary,
    .dg-router-panel .dg-surface-card { background-color: var(--dgir-surface-soft) !important; }
    .dg-router-panel .dg-suite-primary { border-radius: var(--dgir-radius-lg); }
    .dg-router-panel .dg-surface-card { border-radius: var(--dgir-radius-md); }
    .dg-router-panel .dg-surface-icon { border-radius: var(--dgir-radius-sm); }
    .dg-router-panel .dg-btn { min-height: 36px; border-radius: var(--dgir-radius-md); }
    .dg-router-panel .dg-btn-subtle { background-color: transparent !important; }
    .dg-router-panel .dg-help-popover { background-color: var(--dgir-surface-raised) !important; }
    .dg-router-panel .dg-menu { background-color: var(--dgir-surface) !important; }
    .dg-router-panel .dg-beat-review-controls,
    .dg-router-panel .dg-modal-footer { background-color: var(--dgir-bg) !important; }
    .dg-router-panel .dg-history-track::before,
    .dg-router-panel .dg-overview-label::before,
    .dg-router-panel .dg-overview-label::after { background-color: var(--dgir-border) !important; }
    .dg-router-panel .dg-section-title::before,
    .dg-router-panel .dg-section-title::after { background-color: var(--dgir-border-bright) !important; }
    .dg-router-panel .dg-thumb-processing::after { content: none !important; animation: none !important; }
    .dg-sidecar-global-notice,
    .dg-relay-orb,
    .dg-relay-orb-design-glass { -webkit-backdrop-filter: none !important; backdrop-filter: none !important; }
    .dg-sidecar-global-fill { background: var(--lumiverse-primary, #e980b7) !important; }
    .dg-relay-orb,
    .dg-relay-orb-design-glass { background-image: none !important; background-color: color-mix(in srgb, var(--lumiverse-fill, #211825) 92%, var(--lumiverse-primary, #e980b7)) !important; }
  `)
  // Message renderers may sanitize detached <style> nodes from processed prose.
  // Keep the same reservation CSS registered through the extension-owned host
  // stylesheet so the real inline lifecycle path cannot become unstyled.
  const removeLifecycleStyle = ctx.dom.addStyle(lifecycleRuntimeCss())

  const tab = ctx.ui.registerDrawerTab({
    id: 'private-relay',
    title: "Ria's Reverie Relay",
    shortName: 'Reverie',
    headerTitle: "Ria's Reverie Relay",
    description: 'Living-world surfaces, prose illustrations, visual memory, and media archives',
    keywords: ['reverie', 'relay', 'surface', 'illustrator', 'media', 'instagram', 'twitter', 'smartphone', 'kakao'],
    iconUrl: REVERIE_RELAY_SIDEBAR_ICON_URL,
  })

  const inputRelayAction = ctx.ui.registerInputBarAction({
    id: 'open-private-relay',
    label: "Open Ria's Reverie Relay",
    iconUrl: REVERIE_RELAY_OVERVIEW_ICON_URL,
  })
  const inputSurfacesAction = ctx.ui.registerInputBarAction({
    id: 'open-private-relay-surfaces',
    label: 'Open Surface Registry',
    iconUrl: REVERIE_RELAY_SIDEBAR_ICON_URL,
  })
  const unsubInputRelay = inputRelayAction.onClick(() => tab.activate())
  const unsubInputSurfaces = inputSurfacesAction.onClick(() => { activeTab = 'surfaces'; tab.activate(); renderPanel() })
  const phoneWidget = typeof ctx.ui.createFloatWidget === 'function' ? mountPhoneWidget(ctx,{enabled:false,onSettings:()=>{activeTab='phone';tab.activate();patchConfig({lastActiveDrawerTab:'phone'});renderPanel()}}) : null
  const offPhoneToolRenderSync = mountPhoneToolRenderSync(ctx)

  const unsubBackend = lifecycle.track(lifecycle.track(ctx.onBackendMessage((payload: unknown) => {
    const message = payload as BackendMessage
    if (message.type === 'state') {
      if (!message.chatId || message.chatId === activeChatId) {
        if (message.chatId && message.revision < stateRevision) return
        const hasChatProjection = Boolean(message.chatId)
        if (hasChatProjection) {
          stateRevision = message.revision
          lastChatStateReceivedAt = Date.now()
          for (const record of message.records) {
            if (isSlotLifecycleActive(record.status)) {
              rememberBoundedMap(pendingFinalRevealByRecord, record.key, record.requestId, C5B_CACHE_LIMITS.messageSnapshots)
              armProseRevealGuard(record)
              if (['regenerate-same-settings', 'regenerate-current-settings', 'intent-regeneration'].includes(String(record.triggerType || '')) && isGenerationActiveStatus(record.status)) {
                requestReplacementStatusProjection(record)
              }
            } else if (record.status === 'failed' || record.status === 'image-unavailable' || record.status === 'cancelled') {
              pendingFinalRevealByRecord.delete(record.key)
              disarmProseRevealGuard(record.key, record.requestId)
              restorePreviousLifecycleImage(record)
            } else if (record.status === 'completed') {
              settleReplacementStatusProjection(record)
            }
          }
          records = message.records.map(record => {
            const optimistic = optimisticSlotActions.get(record.key)
            if (!optimistic) return record
            if (record.updatedAt > optimistic.basedOnUpdatedAt || ['preparing', 'queued', 'parsing', 'provider-waiting', 'generating', 'previewing', 'placement-pending'].includes(record.status)) {
              optimisticSlotActions.delete(record.key)
              return record
            }
            return {
              ...record,
              status: optimistic.status,
              triggerType: optimistic.triggerType || record.triggerType,
              regenerationIntent: optimistic.intent || record.regenerationIntent,
            }
          })
          stats = message.stats || emptyRelayChatStats()
          queueSafety = message.queueSafety || { rawPendingRecords: 0, uniquePendingJobs: 0, duplicateRecordsCollapsed: 0, oldestPendingAgeMs: 0, pausedBacklog: false, updatedAt: 0 }
          recordByKey = new Map(records.map(record => [record.key, record]))
        }
        const incomingProseSettings = message.config.proseIllustratorSettings
        const pendingStillFresh = Boolean(pendingProseSettingsWrite && Date.now() - pendingProseSettingsWrite.sentAt < 15_000)
        const pendingMatchesIncoming = Boolean(pendingProseSettingsWrite && JSON.stringify(incomingProseSettings) === JSON.stringify(pendingProseSettingsWrite.settings))
        if (pendingMatchesIncoming || (pendingProseSettingsWrite && !pendingStillFresh)) pendingProseSettingsWrite = null
        const effectiveProseSettings = pendingStillFresh && pendingProseSettingsWrite
          ? pendingProseSettingsWrite.settings
          : incomingProseSettings
        // Preserve a just-painted setting until the backend confirms that exact
        // value. State messages can arrive out of order while tabs/chat state
        // are changing, so an older echo must not undo the current control.
        const now = Date.now()
        pendingConfigPatches = pendingConfigPatches.filter(pending => {
          const confirmed = Object.entries(pending.patch).every(([key, value]) => JSON.stringify((message.config as Record<string, unknown>)[key]) === JSON.stringify(value))
          return !confirmed && now - pending.sentAt < 15_000
        })
        const effectiveConfig = pendingConfigPatches.reduce((resolved, pending) => ({ ...resolved, ...pending.patch }), message.config)
        config = { ...effectiveConfig, proseIllustratorSettings: effectiveProseSettings }
        phoneWidget?.setEnabled(config.phoneEnabled!==false)
        if (hasChatProjection) proseIllustrator = message.proseIllustrator || { settings: {}, opportunities: {}, plans: {}, records: {}, processedMessageKeys: {}, autoCounters: {}, frequencyDecisions: {}, activeOpportunityIdByChat: {}, activePlanIdByChat: {} }
        proseIllustrator = {
          ...proseIllustrator,
          settings: {
            ...(proseIllustrator.settings || {}),
            __global__: effectiveProseSettings,
            ...(activeChatId ? { [activeChatId]: { ...effectiveProseSettings, paused: proseIllustrator.settings?.[activeChatId]?.paused === true } } : {}),
          },
        }
        parserConnections = frontendParserConnections ?? message.parserConnections
        imageConnections = message.imageConnections || []
        imageProviders = message.imageProviders || []
        if (hasChatProjection) {
          logs = message.logs
          candidateBatches = message.candidateBatches || []
          queueDirector = message.queueDirector || { pausedAfterCurrent: false, concurrencyLimit: 1, selectedKeys: [], jobStatuses: {} }
          assetLibrary = message.assetLibrary || { assets: {}, compare: {}, updatedAt: 0 }
          versionTrees = message.versionTrees || []
          continuityVault = message.continuityVault || { chatId: activeChatId || '', strength: 'off', characters: {}, characterSheets: {}, visualIdentity: {}, wardrobe: {}, currentAppearance: {}, suggestions: {}, quarantine: {}, history: [], migrationPreview: null, ignoredForSlotKeys: [], deliberateBreaks: {}, updatedAt: 0 }
          storyConstellations = message.storyConstellations || { schemaVersion: 1, activeTimelineId: 'main', actors: {}, events: {}, proposals: {}, echoes: {}, knowledgeEdges: {}, conflicts: {}, phoneEntries: {}, reelOverrides: {}, processedMessageFingerprints: {}, updatedAt: 0 }
        }
        continuityVault.strength = effectiveConfig.vaultStrength
        // A chatless state broadcast carries global settings only. Its empty
        // transient chat state must never replace the persisted Surface
        // Library shown for the active chat; doing so paints every default
        // toggle as enabled until some unrelated chat-bound update arrives.
        const receivedSurfaceState = message.chatId
          ? message.customSurfaces
          : message.config.globalSurfaceStudio
        const receivedDefinitions = Object.keys(receivedSurfaceState?.definitions || {}).length
        const responseIsStale = Boolean(receivedSurfaceState && customSurfaces.updatedAt && receivedSurfaceState.updatedAt < customSurfaces.updatedAt)
        // A transient/late state echo must not wipe built-ins or a just-saved
        // collection. The only empty view is a confirmed empty server state.
        const stableSurfaceState = responseIsStale
          ? customSurfaces
          : receivedDefinitions
            ? receivedSurfaceState
            : frontendSurfaceFallback()
        // Global preferences are authoritative even when Lumiverse has not supplied an active chat id.
        customSurfaces = {
          ...stableSurfaceState,
          rendererMode: effectiveConfig.surfaceRendererMode,
          defaultShellMode: effectiveConfig.surfaceDefaultShellMode,
          colorMode: effectiveConfig.surfaceColorMode,
          utilityInjectionEnabled: effectiveConfig.surfaceUtilityInjectionEnabled,
        }
        // State broadcasts may race an in-flight settings mutation. Reapply
        // the ordered local draft so an unrelated click or status tick cannot
        // resurrect the last acknowledged/default values.
        for (const pending of settingsPatchQueue) applyRelaySettingsDraft(pending.patch)
        invalidateDisplayIfContractChanged(effectiveConfig, customSurfaces)
        if (hasChatProjection) {
          backgroundQueue = message.backgroundQueue || { items: {}, abortRequestedAt: 0, updatedAt: 0 }
          imageWorkerRecovery = message.imageWorkerRecovery || { active: false, draining: false, resetAvailable: false, laneResetCount: 0, waiterCount: 0 }
          galleryLinks = message.galleryLinks || []
          for (const linkId of [...galleryLinkClaimPending]) if (!galleryLinks.some(link => link.id === linkId && link.status === 'pending')) galleryLinkClaimPending.delete(linkId)
          for (const linkId of [...galleryLinkResultAwaitingAck]) if (!galleryLinks.some(link => link.id === linkId && link.status === 'pending')) galleryLinkResultAwaitingAck.delete(linkId)
          lastDryRun = message.lastDryRun || null
          lastGenerationBlockers = message.lastGenerationBlockers || []
        }
        void processPendingGalleryLinks()
        void enforceNativeAutoGenerationGuard()
        backendBuild = message.build
        schemaVersion = message.schemaVersion
        renderPanel()
        if (!nativeSettingsLastSyncedAt) void syncNativeSettings(true).catch(() => null)
        window.setTimeout(maybeOpenQuickStartOverview, 80)
        scheduleBindInlineImages()
        renderRelayOrb()
        maybeOpenSlotImagePreviews()
        updateSidecarTicker()
        if (activeChatId && message.chatId === activeChatId && config.autoRescanOnChatOpen && !autoRescannedChats.has(activeChatId)) {
          autoRescannedChats.add(activeChatId)
          const chatId = activeChatId
          window.setTimeout(() => {
            if (activeChatId === chatId && !rescanInProgress) {
              rescanInProgress = true
              ctx.sendToBackend({ type: 'rescan_chat', chatId, automatic: true })
              renderPanel()
            }
          }, 350)
        }
      }
      return
    }
    if (message.type === 'gallery_link_claim') {
      if (message.sessionId !== frontendSessionId) return
      galleryLinkClaimPending.delete(message.linkId)
      if (message.granted && message.operationLeaseId) void processClaimedGalleryLink(message.linkId, message.operationLeaseId)
      else window.setTimeout(() => void processPendingGalleryLinks(), 250)
      return
    }
    if (message.type === 'story_backfill_status') {
      if (message.chatId === activeChatId) {
        storyBackfillStatus = message
        if (activeTab.startsWith('story-')) renderPanel()
      }
      return
    }
    if (message.type === 'queue_abort_ack') {
      cancelPendingLifecycleScans()
      // The acknowledgement is a terminal UI boundary. Do not let an older
      // optimistic action, placement state, or processing candidate batch
      // repaint the Orb as busy while the terminal state broadcast settles.
      rescanInProgress = false
      localSidecarAnalysisStartedAt = 0
      optimisticSlotActions.clear()
      records = records.map(record => isGenerationActiveStatus(record.status)
        ? { ...record, status: 'cancelled' as const, updatedAt: Date.now() }
        : record)
      recordByKey = new Map(records.map(record => [record.key, record]))
      candidateBatches = candidateBatches.map(batch => batch.status === 'processing'
        ? {
            ...batch,
            status: 'discarded' as const,
            updatedAt: Date.now(),
            candidates: batch.candidates.map(candidate => ['preflight', 'parsing', 'provider-waiting', 'generating'].includes(candidate.status)
              ? { ...candidate, status: 'discarded' as const, error: 'Cancelled by Abort All.' }
              : candidate),
          }
        : batch)
      backgroundQueue = {
        ...backgroundQueue,
        items: Object.fromEntries(Object.entries(backgroundQueue.items || {}).map(([id, item]) => [id,
          ['completed', 'failed', 'cancelled'].includes(item.stage)
            ? item
            : { ...item, stage: 'cancelled' as const, statusText: 'Cancelled by Abort All', etaSeconds: null, updatedAt: Date.now() },
        ])),
      }
      for (const [key, preview] of streamPreviews) {
        if (preview.streaming) streamPreviews.set(key, { ...preview, streaming: false, statusText: 'Generation stopped.', updatedAt: Date.now() })
      }
      updateSidecarTicker()
      renderPanel()
      renderRelayOrb()
      return
    }
    if (message.type === 'prose_opportunities_ready') {
      if (message.chatId !== activeChatId) return
      localSidecarAnalysisStartedAt = 0
      updateSidecarTicker()
      renderPanel()
      return
    }
    if (message.type === 'model_placed_requests_missing') {
      modelPlacedMissingRequest = {
        chatId: message.chatId,
        messageId: message.messageId,
        runtimeDirective: message.runtimeDirective || '',
      }
      if (message.chatId === activeChatId) {
        showToast('warning', 'Model Planned requested illustrations, but the story model returned no valid Reverie illustration tags.')
        renderPanel()
      }
      return
    }
    if (message.type === 'prompt_registry_preview') {
      if (message.chatId !== activeChatId || !pendingPromptPreviewRequestId) return
      if (message.requestId && message.requestId !== pendingPromptPreviewRequestId) return
      pendingPromptPreviewRequestId = null
      openTextModal(`Resolved Illustrator Prompt · ${message.registryIds.join(' + ')}`, message.prompt)
      return
    }
    if (message.type === 'surface_prompt_preview') {
      const summary = [
        `Original Surfaces: ${message.surfaceModuleIds.length} enabled · automatic injection ${message.surfaceInjectionEnabled ? 'ON' : 'OFF'}`,
        `Narrative Utilities: ${message.narrativeUtilityNames.length} enabled · injection ${message.narrativeInjectionEnabled ? 'ON' : 'OFF'}`,
      ].join('\n')
      const value = message.error
        ? `Prompt preview failed: ${message.error}`
        : `${summary}\n\n${message.prompt}`
      const pending = pendingSurfacePromptPreviews.get(message.requestId)
      pendingSurfacePromptPreviews.delete(message.requestId)
      if (pending) pending.setValue(value)
      else openTextModal('Enabled Surface Prompt Dry Run · no model calls', value)
      return
    }
    if (message.type === 'native_surface_repair_result') {
      const finish = pendingAssistedSurfaceRepairRequests.get(message.requestId)
      pendingAssistedSurfaceRepairRequests.delete(message.requestId)
      finish?.(message)
      if (message.status === 'failed') showToast('error', message.error || 'Assisted Surface repair failed safely; no changes were made.')
      return
    }
    if (message.type === 'custom_surface_action_result') {
      const finish = pendingCustomSurfaceSaves.get(message.requestId)
      pendingCustomSurfaceSaves.delete(message.requestId)
      finish?.(message.ok, message.error)
      return
    }
    if (message.type === 'narrative_lorebook_export_result') {
      const trigger = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-rrn-export-request-id]'))
        .find(candidate => candidate.dataset.rrnExportRequestId === message.requestId)
      if (trigger) {
        trigger.disabled = false
        trigger.textContent = message.ok ? 'Sent to Lorebook' : 'Send to Lorebook'
        delete trigger.dataset.rrnExportRequestId
      }
      showToast(message.ok ? 'success' : 'error', message.message)
      return
    }
    if (message.type === 'dry_run_result') {
      lastDryRun = message.report
      openDryRunReport(message.report)
      renderPanel()
      return
    }
    if (message.type === 'full_complete_dry_run_result') {
      lastFullCompleteDryRun = message.report
      openTextModal('Full Complete Dry Run · no model or image calls', JSON.stringify(message.report, null, 2))
      renderPanel()
      return
    }
    if (message.type === 'generation_blockers') {
      lastGenerationBlockers = message.blockers
      openGenerationBlockers(message.scope, message.blockers)
      renderPanel()
      return
    }
    if (message.type === 'lora_catalog_result') {
      if (message.requestId !== loraCatalogState.requestId) return
      loraCatalogState = { requestId: message.requestId, connectionId: message.connectionId, status: message.status, items: [...new Set(message.items || [])], error: message.error || '' }
      activeLoraCatalogRender?.()
      return
    }
    if (message.type === 'status') {
      lastStatus = message.requestId ? `${message.status}: ${message.requestId}` : message.status
      renderPanel()
      scheduleBindInlineImages()
      return
    }
    if (message.type === 'slot_action_feedback') {
      const handled = slotActionFeedback.handle(message)
      if (handled && message.status === 'failed' && message.message) showToast('error', message.message)
      if (handled) scheduleBindInlineImages()
      return
    }
    if (message.type === 'error') {
      if (message.source === 'rescan_chat') {
        rescanInProgress = false
        renderPanel()
      }
      const toastKey = sharedConfigError(message.message)
        ? `shared-config:${message.message}`
        : message.key ? `${message.key}:${message.attemptNumber || 0}` : `${message.source}:${message.message}`
      if (errorToastKeys.has(toastKey)) return
      errorToastKeys.add(toastKey)
      showToast('error', message.message)
      return
    }
    if (message.type === 'image_generation_stream') {
      const key = message.slotKey || message.generationId
      const terminal = message.event === 'done' || message.event === 'cancelled' || message.event === 'error'
      if (!terminal && completedPreviewGenerations.has(message.generationId)) return
      if (message.event === 'started') { completedPreviewGenerations.delete(message.generationId); lifecycle.beginPreview(message.generationId) }
      if (terminal) {
        lifecycle.endPreview(message.generationId)
        completedPreviewGenerations.add(message.generationId)
        while (completedPreviewGenerations.size > 200) completedPreviewGenerations.delete(completedPreviewGenerations.values().next().value!)
        const current = streamPreviews.get(key)
        streamPreviews.set(key, {
          ...current,
          statusText: message.event === 'done' ? 'Final image saved.' : message.event === 'cancelled' ? 'Generation stopped.' : message.error || 'Generation failed.',
          updatedAt: Date.now(),
          source: message.source,
          streaming: false,
          step: message.step ?? current?.step,
          totalSteps: message.totalSteps ?? current?.totalSteps,
          failed: message.event === 'error',
        })
        resetRelayOrbInteractivity()
        scheduleTerminalStateRefresh(message.chatId)
      } else {
        const progress = streamStatusText(message)
        const current = streamPreviews.get(key)
        streamPreviews.set(key, {
          imageDataUrl: message.previewImageDataUrl || current?.imageDataUrl,
          statusText: progress || current?.statusText || (message.streaming ? 'Generating live preview…' : 'Generating…'),
          updatedAt: Date.now(),
          source: message.source,
          streaming: message.streaming,
          step: message.step ?? current?.step,
          totalSteps: message.totalSteps ?? current?.totalSteps,
          failed: false,
        })
      }
      scheduleBindInlineImages()
      window.setTimeout(bindInlineImages, 220)
      renderRelayOrb()
      if (terminal) {
        window.setTimeout(renderPanel, 0)
        window.setTimeout(() => {
          const current = streamPreviews.get(key)
          if (current && !current.streaming && Date.now() - current.updatedAt >= 15_000) streamPreviews.delete(key)
        }, 15_100)
      }
      return
    }
    if (message.type === 'recovery_notice') {
      lastStatus = message.message
      showToast('warning', message.message)
      renderPanel()
      return
    }
    if (message.type === 'queue_dispatch_diagnostic') {
      downloadJson(`reverie-relay-queue-diagnostic-${Date.now()}.json`, message.diagnostic)
      return
    }
    if (message.type === 'image_worker_recovery_state') {
      imageWorkerRecovery = message.imageWorkerRecovery
      renderPanel()
      return
    }
    if (message.type === 'completed_diagnostic') {
      const pending = message.requestId ? pendingCompletedRecordLoads.get(message.requestId) : undefined
      if (message.requestId) pendingCompletedRecordLoads.delete(message.requestId)
      if (pending) pending(message.record || null)
      else if (message.diagnostic) downloadJson(`reverie-relay-completed-${message.archiveId}.json`, message.diagnostic)
      else showToast('warning', message.message)
      return
    }
    if (message.type === 'completed_history_page') {
      if (message.chatId !== activeChatId) return
      if (activeTab === 'slots' && message.completedLifetime !== completedHistoryRequestedForCount) return
      completedHistoryChatId = message.chatId
      const pageRows = message.cursor === 0 ? message.rows : [...completedHistoryRows, ...message.rows]
      completedHistoryRows = [...new Map(pageRows.map(row => [String(row.key || ''), row])).values()]
      completedHistoryNextCursor = message.nextCursor
      completedHistoryTotal = message.total
      loadFirstArchivedOnlyPage()
      renderPanel()
      return
    }
    if (message.type === 'native_snapshot_requested') {
      // One broker refresh answers every waiting job. Re-submitting the source
      // scan here used to multiply old work after a suspended frontend resumed.
      void syncNativeSettings(true)
      return
    }
    if (message.type === 'reparse_preview') {
      const record = recordByKey.get(message.key)
      if (record) openReparsePreview(record, message.prompt, message.negativePrompt, message.pipeline)
      return
    }
    if (message.type === 'self_test_result') {
      selfTest = { checks: message.checks, buildMatch: message.buildMatch }
      renderPanel()
      const health = summarizeRelayHealth(message.checks)
      showToast(health === 'pass' ? 'success' : health === 'warn' ? 'warning' : 'error', health === 'pass' ? 'Relay Health Check passed.' : health === 'warn' ? 'Relay Health Check completed with warnings.' : 'Relay Health Check found a core failure.')
      return
    }
    if (message.type === 'rescan_result') {
      if (message.alreadyRunning) {
        rescanInProgress = true
        lastStatus = 'Chat rescan already in progress.'
        renderPanel()
        return
      }
      rescanInProgress = false
      lastRescanSummary = message.summary
      resetRelayOrbInteractivity()
      renderRelayOrb()
      renderPanel()
      if (!message.automatic) {
        const recovered = rescanRecoveredCount(message.summary)
        showToast('info', recovered > 0
          ? `Scan complete: recovered ${recovered} slot${recovered === 1 ? '' : 's'} in ${(message.summary.durationMs / 1000).toFixed(1)}s.`
          : `Scan complete: no missing slots found in ${(message.summary.durationMs / 1000).toFixed(1)}s.`)
      }
      if (message.automatic) {
        const recovered = rescanRecoveredCount(message.summary)
        if (recovered > 0) {
          showToast('info', `Recovered ${recovered} missing Reverie Relay slot${recovered === 1 ? '' : 's'}.`)
        }
      }
      return
    }
    if (message.type === 'relay_settings_patch_result') {
      const index = settingsPatchQueue.findIndex(item => item.operationId === message.operationId)
      const completed = index >= 0 ? settingsPatchQueue[index] : undefined
      if (index >= 0) settingsPatchQueue.splice(index, 1)
      if (settingsPatchInFlight === message.operationId) settingsPatchInFlight = null
      config = message.config
      phoneWidget?.setEnabled(config.phoneEnabled!==false)
      customSurfaces = message.customSurfaces
      for (const pending of settingsPatchQueue) applyRelaySettingsDraft(pending.patch)
      if (message.status === 'failed') showToast('error', `Setting was rolled back: ${message.error || 'backend persistence failed'}`)
      else if (message.warnings.length) showToast('warning', message.warnings[0])
      if (completed?.patch.kind === 'narrative-override' || completed?.patch.kind === 'narrative-image-enabled') requestNarrativeUtilityRegistry(true)
      renderPanel()
      dispatchNextRelaySettingsPatch()
      return
    }
    if (message.type === 'narrative_utility_registry') {
      narrativeUtilityRegistryRequested = false
      narrativeUtilityRegistry = message.records
      for (const pending of settingsPatchQueue) applyRelaySettingsDraft(pending.patch)
      renderPanel()
      return
    }
    if (message.type === 'appearance_memory_action_status') {
      const key = message.operation === 'save'
        ? `${message.characterId}:save`
        : `${message.characterId}:${message.field || 'unknown'}`
      const currentOperation = appearanceActionStatuses.get(key)
      if (message.operationId && currentOperation?.operationId && message.operationId !== currentOperation.operationId && currentOperation.status === 'started') return
      appearanceActionStatuses.set(key, { ...message, receivedAt: Date.now() })
      if (message.operationId) {
        const watchdog = appearanceSaveWatchdogs.get(message.operationId)
        if (watchdog && message.status !== 'started') {
          window.clearTimeout(watchdog)
          appearanceSaveWatchdogs.delete(message.operationId)
        }
      }
      const terminal = message.status !== 'started'
      // Save-start must not remount the editor and destroy unsaved textarea
      // contents. Its clicked button is updated in place; terminal state arrives
      // only after the backend's authoritative state broadcast.
      if (message.operation !== 'save' || message.status === 'success') renderPanel()
      if (message.operation === 'save' && message.status !== 'success') {
        const saveButton = document.querySelector<HTMLButtonElement>(`[data-appearance-save-character="${CSS.escape(message.characterId)}"]`)
        if (saveButton) { saveButton.disabled = message.status === 'started'; saveButton.textContent = message.status === 'started' ? 'Saving…' : 'Save Appearance Memory' }
        const inline = document.querySelector<HTMLElement>(`[data-appearance-save-status="${CSS.escape(message.characterId)}"]`)
        if (inline) {
          inline.className = `dg-appearance-action-status is-${message.status === 'started' ? 'running' : message.status}`
          inline.textContent = message.message
        }
      }
      if (terminal) {
        window.setTimeout(() => {
          const current = appearanceActionStatuses.get(key)
          if (current && current.receivedAt + 3_500 <= Date.now()) {
            appearanceActionStatuses.delete(key)
            if (message.operation !== 'save' || message.status === 'success') renderPanel()
            else {
              const inline = document.querySelector<HTMLElement>(`[data-appearance-save-status="${CSS.escape(message.characterId)}"]`)
              if (inline) inline.textContent = ''
            }
          }
        }, 3_600)
      }
      return
    }
    if (message.type === 'relay_notice') {
      renderRelayOrb()
      if (message.batchId) {
        const batch = candidateBatches.find(item => item.batchId === message.batchId)
        if (batch?.status === 'review') openRelayCandidateReview(batch)
        else if (batch?.status === 'completed' || batch?.status === 'discarded') {
          const modal = document.querySelector('.dg-modal-host')
          if (modal && document.querySelector('.dg-relay-candidate')) modal.closest('.dg-modal')?.remove()
          renderPanel()
        }
      }
      resetRelayOrbInteractivity()
      showToast(message.level, message.message)
      return
    }
  }), 'settings'), 'slot')

  const switchActiveChat = (chatId: string | null) => {
    if (chatId === activeChatId) return
    clearPlacementVisualHeartbeats()
    activeChatId = chatId
    activeSlotPreviewKey = null
    // Enriched Native bindings belong to the previous chat's subjects.
    nativeImageSettingsCache = {}
    nativeImageSettingsCachedAt = 0
    nativeImageSettingsCacheChatId = null
    nativeSettingsLastSyncedAt = 0
    nativeSettingsFetchInFlight = null
    nativeSettingsFetchInFlightChatId = null
    nativeSettingsFetchToken = null
    pendingPromptPreviewRequestId = null
    sendFrontendSession(true)
    slotActionFeedback.clear()
    optimisticSlotActions.clear()
    records = []
    candidateBatches = []
    recordByKey.clear()
    pendingFinalRevealByRecord.clear()
    clearProseRevealGuards()
    lastStatus = ''
    stateRevision = -1
    lastDisplayContractSignature = ''
    lastRescanSummary = null
    rescanInProgress = false
    renderRelayOrb()

    renderPanel()
    void refreshState(true)
  }
  const syncActiveChat = () => {
    const chatId = ctx.getActiveChat().chatId ?? null
    switchActiveChat(chatId)
  }
  const scheduleActiveChatSync = () => {
    if (activeChatSyncTimer) return
    activeChatSyncTimer = window.setTimeout(() => {
      activeChatSyncTimer = 0
      syncActiveChat()
    }, 0)
  }
  const unsubChat = lifecycle.track(ctx.events.on('CHAT_SWITCHED', (event: any) => {
    switchActiveChat(event.chatId ?? null)
  }), 'subscription')
  const unsubChatChanged = lifecycle.track(ctx.events.on('CHAT_CHANGED', () => {
    scheduleActiveChatSync()
  }), 'subscription')
  const unsubEdit = lifecycle.track(ctx.events.on('MESSAGE_EDITED', (event: any) => {
    if (event.chatId === activeChatId) void refreshState(false)
  }), 'subscription')
  lifecycle.track(ctx.events.on('CHARACTER_MESSAGE_RENDERED', (event: any) => {
    const chatId = String(event?.chatId ?? event?.chat_id ?? '').trim()
    const messageId = String(event?.messageId ?? event?.message_id ?? event?.message?.id ?? '').trim()
    if (!messageId || chatId && chatId !== activeChatId) return
    // The host has finished replacing this one message. Reconcile only its
    // Relay slots; a document-wide rescan would amplify the render churn.
    reconcileRenderedRelayMessage(messageId)
  }), 'subscription')
  const rememberActiveSwipe = (event: any) => {
    const messageId = String(event?.messageId ?? event?.message_id ?? event?.message?.id ?? event?.message?.messageId ?? '').trim()
    const rawSwipe = event?.swipeId ?? event?.swipe_id ?? event?.message?.swipeId ?? event?.message?.swipe_id
    const swipeId = Number(rawSwipe)
    if (messageId && Number.isFinite(swipeId)) {
      rememberBoundedMap(activeSwipeByMessage, messageId, swipeId, C5B_CACHE_LIMITS.activeSwipes)
      clearPlacementVisualHeartbeats()
    }
    const root = messageId ? ctx.dom.findMessageElement(messageId) : null
    if (root) {
      for (const image of deepQueryAll<HTMLImageElement>(root as ParentNode, relayImageSelector)) {
        delete image.dataset.dgirKey
        delete image.dataset.dgirImageId
        delete image.dataset.dgirRequestId
        delete image.dataset.dgirSlot
        delete image.dataset.dgirSwipeId
      }
    }
  }
  const unsubSwipe = lifecycle.track(ctx.events.on('MESSAGE_SWIPED', (event: any) => {
    if (event.chatId === activeChatId) { rememberActiveSwipe(event); void refreshState(false) }
  }), 'subscription')
  const unsubSwipeEdited = lifecycle.track(ctx.events.on('SWIPE_EDITED', (event: any) => {
    if (event.chatId === activeChatId) { rememberActiveSwipe(event); void refreshState(false) }
  }), 'subscription')

  const relayImageSelector = 'img[data-dgir-key], img[data-dgir-image-id], img[data-dgir-request-id]'
  const recordForImageUrl = (imageUrl: string): SlotRecord | null => {
    const normalized = imageUrl.trim()
    if (!normalized) return null
    const swipeVisible = (record: SlotRecord) => {
      const activeSwipe = activeSwipeByMessage.get(record.messageId)
      return activeSwipe === undefined || activeSwipe === record.swipeId
    }
    return records.find(record => swipeVisible(record) && urlMatches(normalized, record.imageUrl || ''))
      || records.find(record => urlMatches(normalized, record.imageUrl || ''))
      || records.find(record => swipeVisible(record) && urlMatches(normalized, record.pendingPlacement?.imageUrl || ''))
      || records.find(record => swipeVisible(record) && record.history?.some(version => urlMatches(normalized, version.imageUrl || '')))
      || null
  }

  const recordForImage = (image: HTMLImageElement | null | undefined): SlotRecord | null => {
    if (!image) return null
    const currentUrl = image.currentSrc || image.src || ''
    const byCurrentUrl = recordForImageUrl(currentUrl)
    if (byCurrentUrl) return byCurrentUrl

    const datasetSwipeText = image.dataset.dgirSwipeId || ''
    const datasetSwipe = datasetSwipeText ? Number(datasetSwipeText) : Number.NaN
    const swipeMatches = (record: SlotRecord) => !Number.isFinite(datasetSwipe) || record.swipeId === datasetSwipe
    const key = image.dataset.dgirKey || ''
    if (key) {
      const keyed = recordByKey.get(key)
      if (keyed && swipeMatches(keyed)) return keyed
    }
    const imageId = image.dataset.dgirImageId || ''
    if (imageId) {
      const byImage = records.find(record => swipeMatches(record) && (record.imageId === imageId || record.pendingPlacement?.imageId === imageId || record.history?.some(version => version.imageId === imageId)))
      if (byImage) return byImage
    }
    const requestId = image.dataset.dgirRequestId || ''
    const slot = image.dataset.dgirSlot || ''
    if (requestId) {
      const activeSwipe = activeSwipeByMessage.get(image.dataset.dgirMessageId || '')
      const byRequest = records.find(record => record.requestId === requestId && (!slot || record.slot === slot) && (activeSwipe === undefined || record.swipeId === activeSwipe) && swipeMatches(record))
      if (byRequest) return byRequest
    }
    return null
  }
  const onClick = (event: MouseEvent) => {
    const target = event.target as HTMLElement | null
    const path = typeof event.composedPath === 'function' ? event.composedPath() : []
    const pathAction = path.find(node => node instanceof HTMLElement && node.matches('[data-dgir-overflow]')) as HTMLElement | undefined
    const pathImage = path.find(node => node instanceof HTMLImageElement && node.matches(relayImageSelector)) as HTMLImageElement | undefined
    const actionButton = pathAction || target?.closest<HTMLElement>('[data-dgir-overflow]')
    const image = pathImage || target?.closest<HTMLImageElement>(relayImageSelector)
    const record = actionButton?.dataset.dgirKey ? recordByKey.get(actionButton.dataset.dgirKey) || null : recordForImage(image)
    if (!record) return
    event.preventDefault()
    event.stopImmediatePropagation()
    if (image && longPressTriggeredKey === record.key) {
      longPressTriggeredKey = ''
      return
    }
    if (actionButton) openActionMenu(record, event.clientX || 24, event.clientY || 24)
    else openLightbox(record)
  }
  const onRegexArtifactImageClick = (event: MouseEvent) => {
    if (event.defaultPrevented || event.button !== 0) return
    const path = typeof event.composedPath === 'function' ? event.composedPath() : []
    const image = path.find(node => node instanceof HTMLImageElement) as HTMLImageElement | undefined
    if (!image) return
    const insideShadowRoot = path.some(node => typeof ShadowRoot !== 'undefined' && node instanceof ShadowRoot)
    if (!insideShadowRoot) return
    const interactiveAncestor = path.find(node => node instanceof HTMLElement && node !== image && node.matches('button, input, textarea, select, [role="button"], [data-action]'))
    if (interactiveAncestor) return
    const src = image.currentSrc || image.src
    if (!src) return
    const record = recordForImage(image) || recordForImageUrl(src)
    event.preventDefault()
    event.stopImmediatePropagation()
    openImageUrl(src, image.alt?.trim() || 'Artifact Image', record?.imageId || image.dataset.dgirImageId, record)
  }

  function submitRepairPlacement(record: SlotRecord, options: { trigger?: HTMLButtonElement; closePopup?: () => void; showPopupError?: (message: string) => void } = {}): boolean {
    const showError = (message: string) => {
      options.showPopupError?.(message)
      if (message && !options.showPopupError) showToast('error', message)
    }
    if (options.trigger?.disabled) return false
    if (!['placement-pending', 'placement-repair-needed'].includes(record.status) || !record.pendingPlacement) {
      showError('Relay does not have a preserved generated asset to repair or reinsert for this slot.')
      return false
    }
    if (isSlotActionBusy(record) && record.status !== 'placement-pending') return false
    const previousOrbStatus = relayOrbStatus
    const originalButtonLabel = options.trigger?.textContent || ''
    relayOrbStatus = 'generating'
    lastStatus = record.status === 'placement-pending' ? 'Inserting Relay image…' : 'Repairing Relay placement…'
    renderRelayOrb()
    const id = submissionId('repair-placement', record.key)
    const submitted = slotActionFeedback.submit({
      submissionId: id,
      key: record.key,
      action: 'repair-placement',
      statusText: record.status === 'placement-pending' ? 'Inserting image…' : 'Repairing placement…',
      dispatch: () => ctx.sendToBackend({ type: 'retry_placement', submissionId: id, key: record.key }),
      closePopup: () => { options.closePopup?.(); closeActionMenu() },
      setDisabled: disabled => {
        if (options.trigger) {
          options.trigger.disabled = disabled
          options.trigger.dataset.rrlSubmitting = disabled ? 'true' : 'false'
          options.trigger.textContent = disabled ? record.status === 'placement-pending' ? 'Inserting…' : 'Repairing…' : originalButtonLabel
        }
      },
      showPopupError: showError,
      restorePending: () => { relayOrbStatus = previousOrbStatus; renderRelayOrb() },
      setBusy: setOptimisticSlotBusy,
      finishBusy: finishOptimisticSlotBusy,
    })
    if (!submitted) {
      relayOrbStatus = previousOrbStatus
      renderRelayOrb()
    }
    scheduleBindInlineImages()
    return submitted
  }

  function handleNativeSurfaceCommand(input: { action: string; chatId: string; messageId: string; swipeId?: number; requestId: string; rootTag: string; surfaceId: string; lorebookKind?: string; lorebookIndex?: number }, trigger?: HTMLButtonElement): void {
    const { action, chatId, messageId, swipeId, requestId, rootTag, surfaceId, lorebookKind, lorebookIndex } = input
    if (action === 'export-lorebook') {
      if (!trigger || !chatId || !messageId || !['cast-introduction', 'character-dossier', 'location-file'].includes(lorebookKind || '')) {
        showToast('warning', 'Relay could not resolve the Narrative Surface selected for Lorebook export.')
        return
      }
      const exportRequestId = `lorebook:${chatId}:${messageId}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`
      trigger.disabled = true
      trigger.textContent = 'Sending…'
      trigger.dataset.rrnExportRequestId = exportRequestId
      ctx.sendToBackend({
        type: 'export_narrative_lorebook', requestId: exportRequestId, chatId, messageId, swipeId,
        kind: lorebookKind, occurrence: Number.isFinite(Number(lorebookIndex)) ? Number(lorebookIndex) : 0,
      })
      return
    }
    const record = requestId
      ? records.find(candidate => candidate.requestId === requestId && (!messageId || candidate.messageId === messageId) && (swipeId === undefined || candidate.swipeId === swipeId)) || null
      : null
    if (action === 'repair-placement') {
      if (record) submitRepairPlacement(record, { trigger })
      else showToast('warning', 'Relay could not locate the generated asset that needs reinsertion.')
      return
    }
    if (action === 'retry' || action === 'regenerate') {
      if (record && isProcessing(record)) ctx.sendToBackend({ type: 'regenerate_slot', key: record.key })
      else if (record) void regenerate(record)
      else if (chatId && messageId) void sendScanWithNativeSnapshot(chatId, messageId)
      else showToast('warning', 'Relay could not locate the owning message for this request.')
      return
    }
    if (action === 'abort') {
      cancelPendingLifecycleScans()
      if (record) ctx.sendToBackend({ type: 'queue_action', chatId: record.chatId, action: 'cancel_selected', selectedKeys: [record.key] })
      else if (chatId) ctx.sendToBackend({ type: 'queue_action', chatId, action: 'abort_all' })
      else showToast('warning', 'Relay could not locate the owning generation for this request.')
      return
    }
    if (action === 'reparse') {
      if (record && isProcessing(record)) ctx.sendToBackend({ type: 'reparse_slot', key: record.key })
      else if (record) void reparse(record)
      else if (chatId && messageId) void sendScanWithNativeSnapshot(chatId, messageId)
      else showToast('warning', 'Relay could not locate the owning message for this request.')
      return
    }
    if (action === 'rescan') {
      if (chatId && messageId) {
        lastStatus = 'Scanning this message…'
        renderRelayOrb()
        void sendScanWithNativeSnapshot(chatId, messageId)
      } else showToast('warning', 'Relay could not locate the owning message for this request.')
      return
    }
    if (action === 'edit') {
      if (record) openEditPrompt(record)
      else {
        activeTab = 'slots'
        renderPanel()
        showToast('info', 'Open the request in Relay after it has been scanned once.')
      }
      return
    }
    if (action === 'details') {
      if (record) openMetadata(record)
      else {
        activeTab = 'logs'
        renderPanel()
        showToast('info', 'Relay has no generated metadata for this request yet.')
      }
      return
    }
    if (action === 'open-relay') {
      activeTab = record?.target === 'prose.illustration' ? 'illustrator' : 'slots'
      renderPanel()
      tab.activate()
      return
    }
    if (action === 'delete') {
      if (!chatId || !messageId) {
        showToast('warning', 'Relay could not locate the owning message for this request.')
        return
      }
      confirmCleanup({
        title: 'Delete Relay request?',
        description: 'This removes the request or native surface from the current message and cancels matching active slot state. Completed image versions remain in Archive.',
        scope: requestId || surfaceId || rootTag || 'Native surface',
        actionLabel: 'Delete Request',
        onConfirm: () => ctx.sendToBackend({ type: 'native_surface_action', chatId, messageId, action: 'delete', requestId: requestId || undefined, rootTag: rootTag || undefined, surfaceId: surfaceId || undefined }),
      })
    }
  }

  function requestAssistedSurfaceRepair(payload:
    | { type: 'native_surface_repair_preview'; chatId: string; messageId: string; swipeId?: number; surfaceId: string; rootTag: string; sourceMarkup: string; originalMarkup: string; repairConnectionId?: string | null }
    | { type: 'native_surface_repair_apply'; chatId: string; messageId: string; repairId: string }
    | { type: 'native_surface_action'; chatId: string; messageId: string; swipeId?: number; action: 'edit'; surfaceId: string; rootTag: string; originalMarkup: string; replacementMarkup: string },
  ): Promise<Extract<BackendMessage, { type: 'native_surface_repair_result' }>> {
    const requestId = `surface-repair-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    return new Promise(resolve => {
      const timeout = window.setTimeout(() => {
        const finish = pendingAssistedSurfaceRepairRequests.get(requestId)
        pendingAssistedSurfaceRepairRequests.delete(requestId)
        finish?.({ type: 'native_surface_repair_result', requestId, chatId: payload.chatId, messageId: payload.messageId, status: 'failed', error: payload.type === 'native_surface_repair_preview' ? 'The repair preview timed out. No change was applied. Your draft is still here.' : 'The save acknowledgement timed out. Your draft is still here. Check the message before retrying.' })
      }, 180_000)
      pendingAssistedSurfaceRepairRequests.set(requestId, message => { window.clearTimeout(timeout); resolve(message) })
      try {
        if (payload.type === 'native_surface_action') ctx.sendToBackend({ ...payload, operationId: requestId })
        else ctx.sendToBackend({ ...payload, requestId })
      } catch (error) {
        pendingAssistedSurfaceRepairRequests.delete(requestId)
        window.clearTimeout(timeout)
        resolve({ type: 'native_surface_repair_result', requestId, chatId: payload.chatId, messageId: payload.messageId, status: 'failed', error: error instanceof Error ? error.message : String(error) })
      }
    })
  }

  function openSurfaceMarkupEditor(buttonEl: HTMLElement): void {
    const host = buttonEl.closest<HTMLElement>('[data-rrn-editable-surface]')
    const source = host?.dataset.rrnSurfaceSource
      || host?.querySelector<HTMLTextAreaElement>('.rrn-surface-source')?.value
      || ''
    const originalSource = host?.dataset.rrnSurfaceOriginal
      || host?.querySelector<HTMLTextAreaElement>('.rrn-surface-original')?.value
      || source
    const chatId = buttonEl.dataset.rrnChatId || host?.dataset.rrnChatId || activeChatId || ''
    const messageId = buttonEl.dataset.rrnMessageId || host?.dataset.rrnMessageId || ''
    if (!host || !source || !chatId || !messageId) {
      showToast('warning', 'Relay could not open the editable source for this surface.')
      return
    }
    const assisted = buttonEl.dataset.rrnAction === 'repair-surface'
    const modal = ctx.ui.showModal({ title: `${assisted ? 'Assisted Repair' : 'Inspect / Fix'} · ${buttonEl.dataset.rrnSurfaceId || 'Surface'}`, width: 820, persistent: true })
    modal.root.classList.add('dg-router-panel', 'dg-modal-host')
    const body = document.createElement('div'); body.className = 'dg-modal-body'
    const failed = host.querySelector<HTMLElement>('[data-reverie-surface-contract="failed"]')
    const diagnostic = failed?.querySelector('span')?.textContent?.trim() || ''
    const note = document.createElement('div'); note.className = 'dg-recovery-note'; note.textContent = `${diagnostic ? `${diagnostic}\n\n` : ''}Edit the preserved markup and choose Save Surface for a manual fix. Choose the Assisted Repair connection below, then request a closing-tag-only preview. It cannot invent missing fields or rewrite text or images. Review the candidate before Apply Preview. Opening this editor makes no model call.`
    let repairConnectionId = config?.surfaceRepairConnectionId || null
    const repairConnectionField = surfaceRepairConnectionField(repairConnectionId, value => { repairConnectionId = value })
    const editor = document.createElement('textarea'); editor.className = 'dg-textarea dg-textarea-tall'; editor.value = source; editor.spellcheck = false; editor.style.minHeight = '340px'
    editor.setAttribute('aria-label', 'Surface markup')
    const repairStatus = document.createElement('div'); repairStatus.className = 'dg-recovery-note'; repairStatus.setAttribute('role', 'status'); repairStatus.textContent = 'Assisted repair is optional. The parser model is called only when you request a preview.'
    const surfaceId = buttonEl.dataset.rrnSurfaceId || host.dataset.rrnSurfaceId || ''
    const rootTag = buttonEl.dataset.rrnRootTag || host.dataset.rrnRootTag || ''
    const rawSwipeId = buttonEl.dataset.rrnSwipeId || host.dataset.rrnSwipeId || ''
    const swipeId = rawSwipeId === '' ? undefined : Number(rawSwipeId)
    const invalidSwipeId = swipeId !== undefined && (!Number.isInteger(swipeId) || swipeId < 0)
    let repairId = ''
    let pending = false
    const setPending = (value: boolean) => {
      pending = value
      editor.disabled = value
      previewButton.disabled = value || invalidSwipeId || source !== originalSource
      applyButton.disabled = value || !repairId
      saveButton.disabled = value || invalidSwipeId
      restoreButton.disabled = value
      repairConnectionField.querySelector('select')!.disabled = value
    }
    const actions = document.createElement('div'); actions.className = 'dg-actions'
    const previewButton = button('Preview Assisted Repair', () => {
      if (pending) return
      if (source !== originalSource || editor.value !== source) {
        repairStatus.textContent = 'Assisted repair is tied to the exact stored Surface source. Restore the original markup or use Save Surface for a manual edit.'
        showToast('warning', 'This edited or transformed Surface cannot be safely previewed. The source was left unchanged.')
        return
      }
      repairId = ''
      setPending(true)
      repairStatus.textContent = 'Sending this one Surface to the selected Assisted Repair connection…'
      void requestAssistedSurfaceRepair({
        type: 'native_surface_repair_preview', chatId, messageId, swipeId,
        surfaceId, rootTag, sourceMarkup: source, originalMarkup: originalSource, repairConnectionId,
      }).then(result => {
        setPending(false)
        if (result.status !== 'preview-ready' || !result.proposedMarkup || !result.repairId) {
          repairStatus.textContent = result.error || 'Relay rejected the repair preview. No changes were made.'
          return
        }
        editor.value = result.proposedMarkup
        repairId = result.repairId
        applyButton.disabled = false
        repairStatus.textContent = `${result.summary || 'Candidate passed structural validation.'}\nReview the markup above. Apply is enabled for this exact, unchanged message only.`
      })
    }, invalidSwipeId || source !== originalSource, 'primary', 'Ask the selected repair connection for a bounded structure-only preview; nothing is saved yet.')
    const applyButton = button('Apply Preview', () => {
      if (pending || !repairId) return
      setPending(true)
      repairStatus.textContent = 'Rechecking the message fingerprint and applying the approved structure-only repair…'
      void requestAssistedSurfaceRepair({ type: 'native_surface_repair_apply', chatId, messageId, repairId }).then(result => {
        setPending(false)
        if (result.status === 'applied') {
          repairStatus.textContent = 'Repair applied. Relay is re-rendering the exact message position.'
          modal.dismiss()
          return
        }
        repairStatus.textContent = result.error || 'Relay could not apply this preview; the original Surface remains unchanged.'
        repairId = ''
        applyButton.disabled = true
      })
    }, true, 'primary', 'Apply the reviewed preview only if the original message and Surface still match exactly.')
    editor.addEventListener('input', () => {
      if (!repairId) return
      repairId = ''
      applyButton.disabled = true
      repairStatus.textContent = 'The preview was edited, so its approval token is invalid. Request a fresh preview before applying.'
    })
    const restoreButton = button('Restore Original', () => {
      editor.value = source
      repairId = ''
      applyButton.disabled = true
      repairStatus.textContent = 'Original preserved source restored. You can request a fresh preview or make a manual correction.'
    }, false, 'subtle')
    const saveButton = button('Save Surface', () => {
      if (pending) return
      repairId = ''
      setPending(true)
      repairStatus.textContent = 'Saving this Surface to its original message position…'
      void requestAssistedSurfaceRepair({
        type: 'native_surface_action', chatId, messageId, swipeId, action: 'edit',
        rootTag, surfaceId, originalMarkup: originalSource, replacementMarkup: editor.value,
      }).then(result => {
        setPending(false)
        if (result.status === 'applied') modal.dismiss()
        else repairStatus.textContent = result.error || 'Save failed. Your draft is still here; the original Surface was not replaced.'
      })
    }, invalidSwipeId, 'primary')
    actions.append(
      previewButton,
      applyButton,
      restoreButton,
      saveButton,
      button('Cancel', () => modal.dismiss(), false, 'subtle'),
    )
    body.append(note, repairConnectionField, editor, repairStatus, actions)
    modal.root.appendChild(body)
    // Let the user choose a working provider before spending on a preview.
    // Neither entry point calls a model merely by opening the editor.
  }

  const onNativeSurfaceActionClick = (event: MouseEvent) => {
    if (event.defaultPrevented || event.button !== 0) return
    const target = event.target as HTMLElement | null
    const path = typeof event.composedPath === 'function' ? event.composedPath() : []
    const pathButton = path.find(node => node instanceof HTMLElement && node.matches('[data-rrn-action]'))
    const buttonEl = (pathButton instanceof HTMLButtonElement ? pathButton : null)
      || target?.closest<HTMLButtonElement>('[data-rrn-action]')
    if (!buttonEl) return
    event.preventDefault()
    event.stopImmediatePropagation()
    if (buttonEl.dataset.rrnAction === 'wardrobe-wear') {
      const owner = buttonEl.closest<HTMLElement>('.pw-wardrobe')
      const draft = owner && buttonEl.closest<HTMLElement>('.pw-panel')?.querySelector<HTMLElement>('.pw-wearcopy')?.textContent?.trim()
      const composer = document.querySelector<HTMLTextAreaElement>('textarea[name="chat-message"]')
      if (!owner || !draft || draft.length > 1200 || !composer || !composer.isConnected) {
        showToast('warning', 'Could not find this look or the current chat Composer.')
        return
      }
      // React owns the textarea. Its prototype setter plus a bubbling input
      // event updates the actual draft state; setting an attribute would only
      // paint temporary text, then lose it on the next host render.
      const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set
      if (!setter) { showToast('warning', 'The chat Composer is not available.'); return }
      setter.call(composer, draft)
      composer.dispatchEvent(new Event('input', { bubbles: true }))
      composer.focus()
      composer.setSelectionRange(draft.length, draft.length)
      showToast('success', 'Outfit added to Composer as a draft. Review it before sending.')
      return
    }
    const host = buttonEl.closest<HTMLElement>('[data-rrn-editable-surface]')
    if (buttonEl.dataset.rrnAction === 'edit-surface' || buttonEl.dataset.rrnAction === 'repair-surface') {
      openSurfaceMarkupEditor(buttonEl)
      return
    }
    handleNativeSurfaceCommand({
      action: buttonEl.dataset.rrnAction || '',
      chatId: buttonEl.dataset.rrnChatId || host?.dataset.rrnChatId || activeChatId || '',
      messageId: buttonEl.dataset.rrnMessageId || host?.dataset.rrnMessageId || '',
      swipeId: (buttonEl.dataset.rrnSwipeId || host?.dataset.rrnSwipeId) ? Number(buttonEl.dataset.rrnSwipeId || host?.dataset.rrnSwipeId) : undefined,
      requestId: buttonEl.dataset.rrnRequestId || '',
      rootTag: buttonEl.dataset.rrnRootTag || host?.dataset.rrnRootTag || '',
      surfaceId: buttonEl.dataset.rrnSurfaceId || host?.dataset.rrnSurfaceId || '',
      lorebookKind: buttonEl.dataset.rrnLorebookKind || '',
      lorebookIndex: buttonEl.dataset.rrnLorebookIndex === undefined || buttonEl.dataset.rrnLorebookIndex === '' ? undefined : Number(buttonEl.dataset.rrnLorebookIndex),
    }, buttonEl)
  }

  const onContext = (event: MouseEvent) => {
    const target = event.composedPath().find(node => node instanceof HTMLElement) as HTMLElement | undefined
    const editableSurface = target?.closest<HTMLElement>('[data-rrn-editable-surface]')
    const image = target?.closest<HTMLImageElement>(relayImageSelector)
    const record = recordForImage(image)
    if (record) {
      event.preventDefault()
      event.stopImmediatePropagation()
      openActionMenu(record, event.clientX, event.clientY)
      return
    }
    if (editableSurface && !target?.closest('button, input, textarea, select, a')) {
      event.preventDefault()
      event.stopImmediatePropagation()
      openSurfaceMarkupEditor(editableSurface)
    }
  }
  const onPointerDown = (event: PointerEvent) => {
    const target = event.composedPath().find(node => node instanceof HTMLElement) as HTMLElement | undefined
    const image = target?.closest<HTMLImageElement>(relayImageSelector)
    const record = recordForImage(image)
    const editableSurface = target?.closest<HTMLElement>('[data-rrn-editable-surface]')
    if (!record && editableSurface && event.pointerType !== 'mouse' && !target?.closest('button, input, textarea, select, a')) {
      event.stopPropagation()
      clearTimeout(longPressTimer)
      longPressKey = `surface:${editableSurface.dataset.rrnMessageId || ''}:${editableSurface.dataset.rrnSurfaceId || ''}`
      longPressTimer = window.setTimeout(() => {
        openSurfaceMarkupEditor(editableSurface)
        longPressKey = ''
      }, 560)
      return
    }
    if (!record || event.pointerType === 'mouse') return
    // Prevent outer semantic wrappers/details drawers from swallowing the
    // generated image long-press while preserving ordinary tap-to-open.
    event.stopPropagation()
    longPressKey = record.key
    clearTimeout(longPressTimer)
    longPressTimer = window.setTimeout(() => {
      const current = recordByKey.get(longPressKey) || recordForImage(image)
      if (current) {
        longPressTriggeredKey = current.key
        openActionMenu(current, event.clientX, event.clientY)
        window.setTimeout(() => {
          if (longPressTriggeredKey === current.key) longPressTriggeredKey = ''
        }, 1500)
      }
    }, 560)
  }
  const clearLongPress = () => {
    clearTimeout(longPressTimer)
    longPressKey = ''
  }
  type SurfaceInteractionSnapshot = { disclosures: Record<string, boolean>; controls: Record<string, boolean> }
  const surfaceInteractionState = new Map<string, SurfaceInteractionSnapshot>()
  const interactiveSurfaceControlSelector = 'input[type="radio"], input.rrcp-launch-toggle, input.rrcp-app-toggle'
  const nodeBelongsToMountedRoot = (root: Element, node: Node): boolean => {
    let current: Node | null = node
    while (current) {
      if (current === root || root.contains(current)) return true
      const owner = current.getRootNode?.()
      current = owner instanceof ShadowRoot ? owner.host : null
    }
    return false
  }
  const mountedMessageForNode = (node: Node): { messageId: string; root: Element } | null => {
    for (const messageId of new Set(records.map(record => record.messageId))) {
      const root = ctx.dom.findMessageElement(messageId)
      if (root && nodeBelongsToMountedRoot(root, node)) return { messageId, root }
    }
    return null
  }
  const surfaceInteractionScope = (messageId: string): string => `${activeChatId || ''}:${messageId}:${activeSwipeByMessage.get(messageId) ?? 0}`
  const disclosureStateKey = (root: ParentNode, disclosure: HTMLDetailsElement): string => {
    const rows = deepQueryAll<HTMLDetailsElement>(root, 'details')
    return `${rows.indexOf(disclosure)}:${disclosure.className}`
  }
  const controlStateKey = (root: ParentNode, control: HTMLInputElement): string => {
    const rows = deepQueryAll<HTMLInputElement>(root, interactiveSurfaceControlSelector)
    return `${rows.indexOf(control)}:${control.type}:${control.name}:${control.id}:${control.className}`
  }
  const onSurfaceDisclosureToggle = (event: Event) => {
    const disclosure = event.composedPath().find(node => node instanceof HTMLDetailsElement) as HTMLDetailsElement | undefined
    if (!disclosure) return
    const mounted = mountedMessageForNode(disclosure)
    if (!mounted) return
    const scope = surfaceInteractionScope(mounted.messageId)
    const snapshot = surfaceInteractionState.get(scope) || { disclosures: {}, controls: {} }
    snapshot.disclosures[disclosureStateKey(mounted.root, disclosure)] = disclosure.open
    rememberBoundedMap(surfaceInteractionState, scope, snapshot, C5B_CACHE_LIMITS.messageSnapshots)
  }
  const onSurfaceControlChange = (event: Event) => {
    const control = event.composedPath().find(node => node instanceof HTMLInputElement && node.matches(interactiveSurfaceControlSelector)) as HTMLInputElement | undefined
    if (!control) return
    const mounted = mountedMessageForNode(control)
    if (!mounted) return
    const scope = surfaceInteractionScope(mounted.messageId)
    const snapshot = surfaceInteractionState.get(scope) || { disclosures: {}, controls: {} }
    if (control.type === 'radio' && control.name) {
      for (const sibling of deepQueryAll<HTMLInputElement>(mounted.root, `input[type="radio"][name="${cssEscape(control.name)}"]`)) {
        snapshot.controls[controlStateKey(mounted.root, sibling)] = sibling.checked
      }
    } else snapshot.controls[controlStateKey(mounted.root, control)] = control.checked
    rememberBoundedMap(surfaceInteractionState, scope, snapshot, C5B_CACHE_LIMITS.messageSnapshots)
  }
  document.addEventListener('click', onNativeSurfaceActionClick, true)
  document.addEventListener('click', onClick, true)
  document.addEventListener('click', onRegexArtifactImageClick, true)
  document.addEventListener('contextmenu', onContext, true)
  document.addEventListener('pointerdown', onPointerDown, true)
  document.addEventListener('pointerup', clearLongPress, true)
  document.addEventListener('pointercancel', clearLongPress, true)
  document.addEventListener('toggle', onSurfaceDisclosureToggle, true)
  document.addEventListener('change', onSurfaceControlChange, true)
  lifecycle.track(() => document.removeEventListener('click', onNativeSurfaceActionClick, true), 'listener')
  lifecycle.track(() => document.removeEventListener('click', onClick, true), 'listener')
  lifecycle.track(() => document.removeEventListener('click', onRegexArtifactImageClick, true), 'listener')
  lifecycle.track(() => document.removeEventListener('contextmenu', onContext, true), 'listener')
  lifecycle.track(() => document.removeEventListener('pointerdown', onPointerDown, true), 'listener')
  lifecycle.track(() => document.removeEventListener('pointerup', clearLongPress, true), 'listener')
  lifecycle.track(() => document.removeEventListener('pointercancel', clearLongPress, true), 'listener')
  lifecycle.track(() => document.removeEventListener('toggle', onSurfaceDisclosureToggle, true), 'listener')
  lifecycle.track(() => document.removeEventListener('change', onSurfaceControlChange, true), 'listener')

  const stopMediaObserver = observeRelayMediaMounts(document.body, () => {
    scheduleBindInlineImages()
    scheduleActiveChatSync()
  })
  lifecycle.track(stopMediaObserver, 'observer')

  // Load Relay's persisted state before any write-capable native-settings sync.
  // Cold extension restarts can expose host settings before userStorage has
  // hydrated; syncing first allowed a fallback config to be saved as defaults.
  sendFrontendSession(true)
  void loadFrontendParserConnections()
  void refreshState(false)
  // Broadcasts can be delayed/lost during concurrent provider completions.
  // Recover persisted status while work is active; never restart a provider.
  const lifecycleRefreshTimer = window.setInterval(() => {
    const now = Date.now()
    if (disposed || !activeChatId || !records.some(record => isSlotLifecycleActive(record.status))) return
    if (now - lastChatStateReceivedAt < 20_000 || now - lastLifecycleRefreshAt < 20_000) return
    lastLifecycleRefreshAt = now
    void refreshState(false)
  }, 20_000)
  lifecycle.track(() => window.clearInterval(lifecycleRefreshTimer), 'timer')
  renderPanel()
  renderRelayOrb()


  async function refreshState(syncNative: boolean): Promise<void> {
    if (disposed) return
    if (syncNative) await syncNativeSettings()
    if (disposed) return
    ctx.sendToBackend({ type: 'list_state', chatId: activeChatId })
  }

  async function loadFrontendParserConnections(): Promise<void> {
    if (!ctx.connections?.list) return
    try {
      const profiles = await ctx.connections.list()
      if (disposed) return
      frontendParserConnections = profiles.map(profile => ({
        id: profile.id,
        name: profile.name,
        provider: profile.provider,
        model: profile.model,
      }))
      parserConnections = frontendParserConnections
      renderPanel()
    } catch (error) {
      console.warn('[Reverie Relay] Could not load credential-redacted connection profiles for selectors.', error)
    }
  }

  async function fetchNativeSettingsSnapshot(force = false): Promise<NativeSettingsSnapshot | null> {
    const now = Date.now()
    const requestedChatId = activeChatId
    if (!force && nativeImageSettingsCacheChatId === requestedChatId && Object.keys(nativeImageSettingsCache).length && now - nativeImageSettingsCachedAt < NATIVE_SETTINGS_CACHE_TTL_MS) {
      return { settings: { ...nativeImageSettingsCache }, capturedAt: nativeImageSettingsCachedAt }
    }
    if (!force && nativeSettingsFetchInFlight && nativeSettingsFetchInFlightChatId === requestedChatId) return nativeSettingsFetchInFlight

    const token = {}
    nativeSettingsFetchToken = token
    const request = (async (): Promise<NativeSettingsSnapshot | null> => {
      try {
        const response = await fetch('/api/v1/settings/imageGeneration', { headers: { Accept: 'application/json' } })
        if (!response.ok) return null
        const row = await response.json() as { value?: Record<string, unknown> }
        const settings = { ...(row.value || {}) }
        if (Object.keys(settings).length === 0) return null
        await enrichNativeVisualPrompts(settings, requestedChatId)
        if (activeChatId !== requestedChatId) return null
        nativeImageSettingsCache = settings
        nativeImageSettingsCachedAt = Date.now()
        nativeImageSettingsCacheChatId = requestedChatId
        return { settings: { ...settings }, capturedAt: nativeImageSettingsCachedAt }
      } catch {
        return null
      } finally {
        if (nativeSettingsFetchToken === token) {
          nativeSettingsFetchInFlight = null
          nativeSettingsFetchInFlightChatId = null
          nativeSettingsFetchToken = null
        }
      }
    })()
    nativeSettingsFetchInFlight = request
    nativeSettingsFetchInFlightChatId = requestedChatId
    return request
  }

  async function enrichNativeVisualPrompts(settings: Record<string, unknown>, requestedChatId: string | null): Promise<void> {
    const chat = ctx.getActiveChat()
    if (chat.chatId !== requestedChatId) return
    const characterId = chat.characterId
    const presets = Array.isArray(settings.promptPresets) ? settings.promptPresets as Array<Record<string, unknown>> : []
    const resolveBinding = async (kind: 'character' | 'persona', subjectId: string | null): Promise<void> => {
      if (!subjectId) return
      try {
        const response = await fetch(`/api/v1/image-gen/preset-bindings/${kind}/${encodeURIComponent(subjectId)}`, { headers: { Accept: 'application/json' } })
        if (response.ok) {
          const binding = await response.json() as Record<string, unknown>
          const presetId = String(binding.preset_id || binding.presetId || '')
          const preset = presets.find(candidate => candidate.id === presetId && candidate.kind === kind)
          const prompt = typeof preset?.prompt === 'string' ? preset.prompt : ''
          const title = typeof preset?.name === 'string' ? preset.name : ''
          const capitalized = kind === 'character' ? 'Character' : 'Persona'
          const resolved = { ...binding, kind, subjectId, presetId, presetName: title, prompt }
          const bindings = settings.nativePresetBindings && typeof settings.nativePresetBindings === 'object'
            ? settings.nativePresetBindings as Record<string, unknown>
            : {}
          settings.nativePresetBindings = { ...bindings, [kind]: resolved, [subjectId]: resolved }
          settings[`bound${capitalized}PresetId`] = presetId
          settings[`bound${capitalized}PresetName`] = title
          settings[`bound${capitalized}Prompt`] = prompt
          settings[`resolved${capitalized}Prompt`] = prompt
        }
      } catch {
        // The backend records the unresolved binding and follows its explicit
        // Appearance/card/lore fallback chain rather than guessing a preset.
      }
    }
    await resolveBinding('character', characterId || null)
    // The frontend Spindle context deliberately exposes only getActiveChat().
    // Current persona identity is resolved in the backend through the typed
    // host API, spindle.personas.getActive(userId), rather than speculative
    // context methods or undocumented REST endpoints.
    const personaId = String(settings.activePersonaId || settings.personaId || '')
    await resolveBinding('persona', personaId || null)
  }

  async function syncNativeSettings(force = false): Promise<NativeSettingsSnapshot | null> {
    const requestedChatId = activeChatId
    const snapshot = await fetchNativeSettingsSnapshot(force)
    if (activeChatId !== requestedChatId) return null
    if (snapshot && (force || Date.now() - nativeSettingsLastSyncedAt > NATIVE_SETTINGS_CACHE_TTL_MS)) {
      nativeSettingsLastSyncedAt = Date.now()
      ctx.sendToBackend({ type: 'sync_native_settings', chatId: activeChatId, imageGeneration: snapshot.settings, nativeSettingsCapturedAt: snapshot.capturedAt, frontendSessionId, platformClass: frontendPlatformClass })
    }
    return snapshot
  }

  function cachedNativeSettingsSnapshot(): NativeSettingsSnapshot | null {
    if (nativeImageSettingsCacheChatId !== activeChatId || !Object.keys(nativeImageSettingsCache).length) return null
    return { settings: { ...nativeImageSettingsCache }, capturedAt: nativeImageSettingsCachedAt || Date.now() }
  }


  function nativeSettingsForWrite(settings: Record<string, unknown>): Record<string, unknown> {
    const next = { ...settings }
    delete next.resolvedCharacterPrompt
    delete next.resolvedPersonaPrompt
    delete next.boundCharacterPrompt
    delete next.boundPersonaPrompt
    delete next.boundCharacterPresetId
    delete next.boundPersonaPresetId
    delete next.boundCharacterPresetName
    delete next.boundPersonaPresetName
    delete next.nativePresetBindings
    return next
  }

  async function writeNativeImageSettings(settings: Record<string, unknown>): Promise<boolean> {
    try {
      const response = await fetch('/api/v1/settings/imageGeneration', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ value: nativeSettingsForWrite(settings) }),
      })
      return response.ok
    } catch {
      return false
    }
  }

  async function enforceNativeAutoGenerationGuard(forceRelease = false): Promise<void> {
    if (nativeGuardBusy || !config) return
    nativeGuardBusy = true
    try {
      const snapshot = Object.keys(nativeImageSettingsCache).length
        ? { settings: { ...nativeImageSettingsCache }, capturedAt: Date.now() }
        : await fetchNativeSettingsSnapshot()
      if (!snapshot) return
      const currentAuto = snapshot.settings.autoGenerate === true
      const guardActive = !forceRelease && config.enabled && config.nativeAutoGenerationGuard
      if (guardActive && currentAuto) {
        const next = { ...snapshot.settings, autoGenerate: false }
        const ok = await writeNativeImageSettings(next)
        if (ok) {
          nativeImageSettingsCache = next
          nativeImageSettingsCachedAt = Date.now()
          if (config.nativeAutoGenerationPreviousValue === null) {
            patchConfig({ nativeAutoGenerationPreviousValue: true, nativeAutoGenerationGuardOwned: true })
            config.nativeAutoGenerationPreviousValue = true
            config.nativeAutoGenerationGuardOwned = true
          }
          ctx.sendToBackend({ type: 'sync_native_settings', chatId: activeChatId, imageGeneration: next })
          if (!nativeGuardToastShown) {
            nativeGuardToastShown = true
            showToast('info', 'Relay paused Lumiverse native auto-generation to prevent untracked style-only ghost jobs. Manual native generation still works.')
          }
        } else {
          showToast('warning', 'Relay could not apply the native auto-generation guard. Check Lumiverse logs before leaving Relay automation enabled.')
        }
      } else if (!guardActive && config.nativeAutoGenerationPreviousValue === true && config.nativeAutoGenerationGuardOwned && snapshot.settings.autoGenerate !== true) {
        const next = { ...snapshot.settings, autoGenerate: true }
        const ok = await writeNativeImageSettings(next)
        if (ok) {
          nativeImageSettingsCache = next
          nativeImageSettingsCachedAt = Date.now()
          patchConfig({ nativeAutoGenerationPreviousValue: null, nativeAutoGenerationGuardOwned: false })
          config.nativeAutoGenerationPreviousValue = null
          config.nativeAutoGenerationGuardOwned = false
          nativeGuardToastShown = false
          ctx.sendToBackend({ type: 'sync_native_settings', chatId: activeChatId, imageGeneration: next })
        }
      }
    } finally {
      nativeGuardBusy = false
    }
  }

  const galleryLinkCacheKey = 'reverie-relay-gallery-link-cache-v1'

  function readGalleryLinkCache(): Record<string, { galleryItemId: string; savedAt: number }> {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(galleryLinkCacheKey) || '{}')
      return normalizeGalleryLinkCache(parsed)
    } catch {
      return {}
    }
  }

  function rememberGalleryLink(linkId: string, galleryItemId: string): void {
    if (!linkId || !galleryItemId) return
    try {
      const cache = readGalleryLinkCache()
      cache[linkId] = { galleryItemId, savedAt: Date.now() }
      window.localStorage.setItem(galleryLinkCacheKey, JSON.stringify(cache))
    } catch {
      // The backend still records the confirmed Gallery item; local cache only
      // prevents duplicate fallback uploads if a frontend acknowledgement is lost.
    }
  }

  function galleryUploadFilename(blob: Blob, linkId: string): string {
    const mime = blob.type.toLowerCase()
    const extension = mime.includes('webp') ? 'webp'
      : mime.includes('jpeg') || mime.includes('jpg') ? 'jpg'
        : mime.includes('gif') ? 'gif'
          : mime.includes('avif') ? 'avif'
            : 'png'
    return `reverie-relay-${linkId.replace(/[^a-z0-9_-]+/gi, '-').slice(0, 64)}.${extension}`
  }

  async function processPendingGalleryLinks(): Promise<void> {
    if (galleryLinkProcessing || galleryLinkClaimPending.size || galleryLinkResultAwaitingAck.size) return
    if (galleryLinkLeaseRetryTimer) {
      window.clearTimeout(galleryLinkLeaseRetryTimer)
      galleryLinkLeaseRetryTimer = 0
    }
    const now = Date.now()
    const pending = galleryLinks.filter(link => link.status === 'pending')
    const candidate = pending.find(link => !link.operationLeaseId
      || !link.operationLeaseExpiresAt
      || link.operationLeaseExpiresAt <= now
      || link.operationLeaseSessionId === frontendSessionId)
    if (!candidate) {
      const nextExpiry = Math.min(...pending.map(link => link.operationLeaseExpiresAt || (now + 1_000)))
      if (Number.isFinite(nextExpiry)) galleryLinkLeaseRetryTimer = window.setTimeout(() => void processPendingGalleryLinks(), Math.max(50, nextExpiry - now + 25))
      return
    }
    galleryLinkClaimPending.add(candidate.id)
    ctx.sendToBackend({ type: 'claim_gallery_link', chatId: candidate.chatId, linkId: candidate.id, sessionId: frontendSessionId })
  }

  async function processClaimedGalleryLink(linkId: string, operationLeaseId: string): Promise<void> {
    if (galleryLinkProcessing) return
    const link = galleryLinks.find(candidate => candidate.id === linkId && candidate.status === 'pending')
    if (!link) return
    galleryLinkProcessing = true
    let ok = false
    let galleryItemId = ''
    let error = ''
    const leaseHeartbeat = window.setInterval(() => {
      sendFrontendSession(true, true)
      ctx.sendToBackend({ type: 'claim_gallery_link', chatId: link.chatId, linkId: link.id, sessionId: frontendSessionId })
    }, 30_000)
    try {
      const endpoint = `/api/v1/characters/${encodeURIComponent(link.characterId)}/gallery`
      try {
        let galleryRows: Array<Record<string, unknown>> = []
        const listResponse = await fetch(endpoint, {
          credentials: 'same-origin',
          cache: 'no-store',
          headers: { Accept: 'application/json' },
        })
        if (listResponse.ok) {
          const payload = await listResponse.json() as unknown
          galleryRows = Array.isArray(payload) ? payload as Array<Record<string, unknown>> : []
        }

        const cachedId = readGalleryLinkCache()[link.id]?.galleryItemId || ''
        const existing = galleryRows.find(row =>
          String(row.image_id || row.imageId || '') === link.imageId
          || Boolean(cachedId && String(row.id || '') === cachedId),
        )
        if (existing) {
          ok = true
          galleryItemId = String(existing.id || '')
        }

        let linkFailure = ''
        if (!ok) {
          const response = await fetch(`${endpoint}/link`, {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({ image_id: link.imageId, caption: link.caption || undefined }),
          })
          if (response.ok) {
            const row = await response.json() as Record<string, unknown>
            galleryItemId = String(row.id || '')
            ok = Boolean(galleryItemId)
          } else {
            const detail = await response.text().catch(() => '')
            linkFailure = `Gallery link returned ${response.status}${detail ? `: ${detail.slice(0, 180)}` : ''}`
          }
        }

        // Some provider result IDs are readable through /image-gen/results but
        // are not linkable image-table IDs. Upload the exact generated bytes,
        // but only after this frontend owns the backend-issued operation lease.
        if (!ok) {
          const imageResponse = await fetch(link.imageUrl, { credentials: 'same-origin', cache: 'no-store' })
          if (!imageResponse.ok) throw new Error(`${linkFailure ? `${linkFailure}; ` : ''}could not read generated image (${imageResponse.status}).`)
          const blob = await imageResponse.blob()
          if (!blob.size) throw new Error(`${linkFailure ? `${linkFailure}; ` : ''}generated image response was empty.`)
          const form = new FormData()
          form.append('image', new File([blob], galleryUploadFilename(blob, link.id), { type: blob.type || 'image/png' }))
          if (link.caption) form.append('caption', link.caption)
          const uploadResponse = await fetch(endpoint, {
            method: 'POST',
            credentials: 'same-origin',
            headers: { Accept: 'application/json' },
            body: form,
          })
          if (!uploadResponse.ok) {
            const detail = await uploadResponse.text().catch(() => '')
            throw new Error(`${linkFailure ? `${linkFailure}; ` : ''}Gallery upload returned ${uploadResponse.status}${detail ? `: ${detail.slice(0, 180)}` : ''}.`)
          }
          const row = await uploadResponse.json() as Record<string, unknown>
          galleryItemId = String(row.id || '')
          ok = Boolean(galleryItemId)
        }

        if (ok && galleryItemId) rememberGalleryLink(link.id, galleryItemId)
        if (!ok) error = 'Lumiverse did not return a Character Gallery item ID.'
      } catch (caught) {
        error = caught instanceof Error ? caught.message : String(caught)
      }
    } finally {
      window.clearInterval(leaseHeartbeat)
      galleryLinkProcessing = false
      galleryLinkResultAwaitingAck.add(link.id)
      ctx.sendToBackend({
        type: 'gallery_link_result',
        chatId: link.chatId,
        linkId: link.id,
        sessionId: frontendSessionId,
        operationLeaseId,
        ok,
        galleryItemId: galleryItemId || undefined,
        error: error || undefined,
      })
    }
  }

  async function runSelfTest(): Promise<void> {
    const snapshot = await fetchNativeSettingsSnapshot()
    ctx.sendToBackend({
      type: 'self_test',
      chatId: activeChatId,
      frontendBuildId: BUILD_ID,
      frontendLoadedAt,
      nativeSettingsAvailable: Boolean(snapshot),
    })
  }

  async function sendScanWithNativeSnapshot(chatId: string, messageId: string | null, swipeId?: number | null, sourceContent?: string): Promise<void> {
    const key = `${chatId}:${messageId || '__latest__'}:${swipeId ?? '__active__'}`
    const scheduled = nativeSnapshotScanTimers.get(key)
    if (scheduled) {
      window.clearTimeout(scheduled)
      nativeSnapshotScanTimers.delete(key)
    }
    const attempt = nativeSnapshotScanAttempts.get(key) || 0
    const snapshot = await syncNativeSettings(attempt > 0)
    if (!snapshot) {
      if (attempt >= 7) {
        if (!nativeSnapshotScanWarned.has(key)) {
          nativeSnapshotScanWarned.add(key)
          showToast('warning', 'Relay is still waiting for Native ImageGen settings. The queued images will resume automatically when the settings endpoint responds.')
        }
        ctx.sendToBackend({ type: 'list_state', chatId })
      }
      nativeSnapshotScanAttempts.set(key, Math.min(7, attempt + 1))
      const delay = attempt >= 7 ? 10_000 : Math.min(4_000, 250 * (2 ** attempt))
      const timer = window.setTimeout(() => {
        nativeSnapshotScanTimers.delete(key)
        void sendScanWithNativeSnapshot(chatId, messageId, swipeId, sourceContent)
      }, delay)
      nativeSnapshotScanTimers.set(key, timer)
      return
    }
    nativeSnapshotScanAttempts.delete(key)
    nativeSnapshotScanWarned.delete(key)
    ctx.sendToBackend({
      type: 'scan_message',
      chatId,
      messageId,
      swipeId: swipeId ?? undefined,
      sourceContent,
      nativeImageSettings: snapshot?.settings,
      nativeSettingsCapturedAt: snapshot?.capturedAt,
    })
  }

  function scheduleTerminalStateRefresh(chatId?: string): void {
    if (terminalStateRefreshTimer) window.clearTimeout(terminalStateRefreshTimer)
    terminalStateRefreshTimer = window.setTimeout(() => {
      terminalStateRefreshTimer = 0
      ctx.sendToBackend({ type: 'list_state', chatId: chatId || activeChatId })
    }, 180)
  }

  function deepQueryAll<T extends Element>(root: ParentNode, selector: string): T[] {
    const found = new Set<T>()
    const visited = new Set<ParentNode>()
    const visit = (node: ParentNode): void => {
      if (visited.has(node)) return
      visited.add(node)
      for (const match of Array.from(node.querySelectorAll<T>(selector))) found.add(match)
      for (const element of Array.from(node.querySelectorAll<HTMLElement>('*'))) {
        if (element.shadowRoot) visit(element.shadowRoot)
      }
      if (node instanceof HTMLElement && node.shadowRoot) visit(node.shadowRoot)
    }
    visit(root)
    return [...found]
  }

  const mountedLifecycleStyles = new WeakMap<Element | ShadowRoot, HTMLStyleElement>()
  const mountedLifecycleStyleNodes = new Set<HTMLStyleElement>()
  const mountedNarrativePresentationStyles = new WeakMap<Element | ShadowRoot, HTMLStyleElement>()
  const narrativeGlassRootSelector = '[data-reverie-narrative-glass-button]'

  function syncNarrativeSurfaceStack(scope: Element | ShadowRoot): void {
    if (!(scope instanceof ShadowRoot) || !(scope.host instanceof HTMLElement)) return
    const directSurfaceRoots = Array.from(scope.children).filter(element => element.matches(narrativeGlassRootSelector))
    const onlySurfaceContent = directSurfaceRoots.length > 0 && Array.from(scope.childNodes).every(node => {
      if (node.nodeType === Node.TEXT_NODE) return !node.textContent?.trim()
      return node instanceof HTMLStyleElement || (node instanceof HTMLElement && node.matches(narrativeGlassRootSelector))
    })
    scope.host.toggleAttribute('data-reverie-narrative-surface-stack', onlySurfaceContent)
  }

  function ensureMountedNarrativePresentationStyle(root: ParentNode): void {
    // Completed host messages retain the CSS that was emitted at generation
    // time. Their content may live under an isolated shadow root, where the
    // extension-wide stylesheet cannot override an old opaque launcher.
    // Mount the current presentation authority beside that content instead of
    // rewriting the message or relying on a fresh model response.
    const scopes = new Set<Element | ShadowRoot>()
    for (const surface of deepQueryAll<HTMLElement>(root, '[data-reverie-narrative-glass-button]')) {
      const owner = typeof surface.getRootNode === 'function' ? surface.getRootNode() : root
      scopes.add(owner instanceof ShadowRoot ? owner : document.head)
    }
    for (const scope of scopes) {
      syncNarrativeSurfaceStack(scope)
      const existing = mountedNarrativePresentationStyles.get(scope)
      if (existing && scope.contains(existing)) continue
      const style = document.createElement('style')
      style.dataset.reverieNarrativePresentationHost = 'glass-button'
      style.textContent = narrativeGlassButtonPresentationCss()
      scope.appendChild(style)
      mountedNarrativePresentationStyles.set(scope, style)
    }
  }

  function ensureMountedLifecycleStyle(root: Element): void {
    // Message content is not a stylesheet transport. Lumiverse may mount a
    // message inside a shadow scope that the extension-wide stylesheet cannot
    // reach, so install the same extension-owned CSS into the mounted message
    // tree without changing or persisting the assistant's authored content.
    const scopes = new Set<Element | ShadowRoot>()
    for (const card of deepQueryAll<HTMLElement>(root, '[data-reverie-lifecycle-card], [data-rrn-native-request]')) {
      const owner = typeof card.getRootNode === 'function' ? card.getRootNode() : root
      scopes.add(owner instanceof ShadowRoot ? owner : root)
    }
    for (const scope of scopes) {
      const existing = mountedLifecycleStyles.get(scope)
      if (existing && scope.contains(existing)) continue
      const style = document.createElement('style')
      style.dataset.reverieLifecycleStyleHost = 'release'
      style.textContent = lifecycleRuntimeCss()
      scope.appendChild(style)
      mountedLifecycleStyles.set(scope, style)
      mountedLifecycleStyleNodes.add(style)
    }
    for (const scope of scopes) if (scope instanceof ShadowRoot) refreshProseRevealGuardStyles(scope)
  }

  function cleanLegacyIllustrationControls(root: ParentNode): void {
    for (const stale of deepQueryAll<HTMLElement>(root, '[data-dgir-illustration-menu], .dg-illustration-quick-button, .dg-illustration-portal-button')) stale.remove()
    for (const candidate of deepQueryAll<HTMLElement>(root, 'p, span, div')) {
      if (candidate.querySelector('img')) continue
      const value = candidate.textContent || ''
      const arrowCount = (value.match(/↻/gu) || []).length
      if (arrowCount >= 3 && value.replace(/[↻\s\u200b]/gu, '') === '') candidate.remove()
    }
    const visited = new Set<Node>()
    const visit = (node: Node): void => {
      if (visited.has(node)) return
      visited.add(node)
      for (const child of Array.from(node.childNodes)) {
        if (child.nodeType === Node.TEXT_NODE) {
          const value = child.textContent || ''
          const arrowCount = (value.match(/↻/gu) || []).length
          if (arrowCount >= 3 && value.replace(/[↻\s\u200b]/gu, '') === '') child.remove()
          continue
        }
        visit(child)
        if (child instanceof HTMLElement && child.shadowRoot) visit(child.shadowRoot)
      }
    }
    visit(root)
  }

  function scheduleBindInlineImages(): void {
    if (bindTimer) return
    bindTimer = window.requestAnimationFrame(() => { bindTimer = 0; bindInlineImages() })
  }

  type MediaCardUpdate = {
    signature: string
    media: Element | null
    sawActiveLifecycle: boolean
    revealedImageUrl?: string
  }

  const mediaCardUpdates = new WeakMap<HTMLElement, MediaCardUpdate>()
  const revealedFinalImageByRecord = new Map<string, string>()
  const startedAuthoredReveals = new WeakSet<HTMLImageElement>()
  const authoredRevealOverlayByImage = new WeakMap<HTMLImageElement, HTMLElement>()
  const authoredRevealVisibilityByImage = new WeakMap<HTMLImageElement, string>()

  function refreshProseRevealGuardStyles(extraScope?: ShadowRoot): void {
    // A completed host render can replace the pending card before its image's
    // first paint. Keep that new image covered by the existing effect until
    // decoding finishes; the guard lives outside the replaced message markup.
    const rules = [...proseRevealGuards.entries()].map(([key, guard]) => {
      const owner = `.rrl-card[data-rrn-record-key=${cssEscape(key)}][data-rrn-live-status="completed"] .rrl-media-slot`
      // The same URL is also used in Relay's review/lightbox UI. Never hide
      // those images while guarding the in-chat reveal.
      const resolvedImage = guard.imageUrl ? `img[src=${JSON.stringify(guard.imageUrl)}]:not(.dg-router-panel img){visibility:hidden!important}` : ''
      return `${resolvedImage}${owner} .rrl-slot-image{visibility:hidden!important}${owner} .rrl-media-skeleton{display:grid!important;opacity:1!important}`
    }).join('')
    const scopes = new Set<Document | ShadowRoot>([document, ...proseRevealGuardStyles.keys()])
    if (extraScope) scopes.add(extraScope)
    for (const guard of proseRevealGuards.values()) {
      const root = ctx.dom.findMessageElement(guard.messageId)
      const owner = root?.getRootNode?.()
      if (typeof ShadowRoot !== 'undefined' && owner instanceof ShadowRoot) scopes.add(owner)
    }
    for (const scope of scopes) {
      let style = proseRevealGuardStyles.get(scope)
      if (!rules) {
        style?.remove()
        proseRevealGuardStyles.delete(scope)
        continue
      }
      if (!style || !style.isConnected) {
        style = document.createElement('style')
        style.dataset.reverieProseRevealGuard = 'active'
        if (scope === document) (document.head || document.documentElement).appendChild(style)
        else scope.appendChild(style)
        proseRevealGuardStyles.set(scope, style)
      }
      if (style.textContent !== rules) style.textContent = rules
    }
  }

  function armProseRevealGuard(record: SlotRecord): void {
    const previous = proseRevealGuards.get(record.key)
    const imageUrl = record.pendingPlacement?.imageUrl || record.imageUrl
    if (!previous || previous.requestId !== record.requestId || previous.messageId !== record.messageId || previous.imageUrl !== imageUrl) {
      proseRevealGuards.set(record.key, { requestId: record.requestId, messageId: record.messageId, imageUrl })
    }
    refreshProseRevealGuardStyles()
  }

  function disarmProseRevealGuard(key: string, requestId: string): void {
    if (proseRevealGuards.get(key)?.requestId !== requestId) return
    proseRevealGuards.delete(key)
    refreshProseRevealGuardStyles()
  }

  function clearProseRevealGuards(): void {
    proseRevealGuards.clear()
    refreshProseRevealGuardStyles()
  }
  const startedPlacementVisuals = new Map<string, string>()
  const acknowledgedPlacementVisuals = new Map<string, string>()
  type ProjectionInvalidationAttempt = { messageId: string; attempts: number; timer?: number }
  const requestedProjectionInvalidations = new Map<string, ProjectionInvalidationAttempt>()
  const PROJECTION_INVALIDATION_MAX_ATTEMPTS = 3
  const PROJECTION_INVALIDATION_RETRY_MS = 160

  function clearProjectionInvalidation(versionKey: string): void {
    const attempt = requestedProjectionInvalidations.get(versionKey)
    if (attempt?.timer) window.clearTimeout(attempt.timer)
    requestedProjectionInvalidations.delete(versionKey)
  }

  function requestProjectionInvalidation(record: SlotRecord, visualImageUrl: string, versionKey: string): void {
    let attempt = requestedProjectionInvalidations.get(versionKey)
    if (!attempt) {
      if (requestedProjectionInvalidations.size >= C5B_CACHE_LIMITS.messageSnapshots) {
        const oldestKey = requestedProjectionInvalidations.keys().next().value
        if (oldestKey) clearProjectionInvalidation(oldestKey)
      }
      attempt = { messageId: record.messageId, attempts: 0 }
    }
    if (attempt.timer || attempt.attempts >= PROJECTION_INVALIDATION_MAX_ATTEMPTS) return
    attempt.attempts += 1
    requestedProjectionInvalidations.set(versionKey, attempt)
    // Lumiverse display.invalidate accepts changed variable names, not
    // message IDs. The wildcard is its supported cache/re-render signal.
    ctx.display?.invalidate(['*'])
    attempt.timer = window.setTimeout(() => {
      attempt.timer = undefined
      const root = ctx.dom.findMessageElement(record.messageId)
      const mounted = root && deepQueryAll<HTMLImageElement>(root as ParentNode, 'img')
        .some(image => urlMatches(image.currentSrc || image.src, visualImageUrl))
      if (mounted) clearProjectionInvalidation(versionKey)
      else if (recordByKey.get(record.key)) requestProjectionInvalidation(record, visualImageUrl, versionKey)
    }, PROJECTION_INVALIDATION_RETRY_MS)
  }

  function acknowledgeProjectionInvalidation(messageId: string): void {
    for (const attempt of requestedProjectionInvalidations.values()) {
      if (attempt.messageId !== messageId || !attempt.timer) continue
      window.clearTimeout(attempt.timer)
      attempt.timer = undefined
    }
  }

  function revealFinalImageWhenReady(
    card: HTMLElement | null,
    image: HTMLImageElement,
    expectedUrl: string,
    record: SlotRecord,
    update: MediaCardUpdate | null,
    effectOverlay?: HTMLElement,
    restoreVisibility?: string,
  ): void {
    const expectedRecordKey = record.key
    const isCurrentFinalImage = () => (card ? card.isConnected : Boolean(ctx.dom.findMessageElement(record.messageId)?.contains(image)))
      && image.isConnected
      && (!card || card.contains(image))
      && (!card || card.dataset.rrnRecordKey === expectedRecordKey)
      && (!card || mediaCardUpdates.get(card) === update)
      && urlMatches(image.currentSrc || image.src, expectedUrl)

    const isCurrentPlacementVersion = () => {
      const current = recordByKey.get(expectedRecordKey)
      const pending = current?.pendingPlacement
      const currentUrl = pending?.imageUrl || current?.imageUrl || ''
      const currentImageId = pending?.imageId || current?.imageId || ''
      const visibleSwipe = activeSwipeByMessage.get(record.messageId)
      return activeChatId === record.chatId
        && Boolean(current && (current.status === 'placement-pending' || current.status === 'completed') && currentUrl)
        && current?.requestId === record.requestId
        && current?.slot === record.slot
        && current?.swipeId === record.swipeId
        && (visibleSwipe === undefined || visibleSwipe === record.swipeId)
        && urlMatches(currentUrl, expectedUrl)
        && (!(record.pendingPlacement?.imageId || record.imageId) || !currentImageId || (record.pendingPlacement?.imageId || record.imageId) === currentImageId)
    }
    const visualImageId = record.pendingPlacement?.imageId || record.imageId
    const visualVersionKey = JSON.stringify([record.chatId, record.messageId, record.swipeId, expectedRecordKey, expectedUrl, visualImageId || ''])
    const visualMessage = {
      chatId: record.chatId,
      messageId: record.messageId,
      swipeId: record.swipeId,
      key: expectedRecordKey,
      requestId: record.requestId,
      slot: record.slot,
      imageUrl: expectedUrl,
      imageId: visualImageId,
      sessionId: frontendSessionId,
    }
    const visualLifecycleTracked = isCurrentPlacementVersion()
    if (visualLifecycleTracked) {
      beginPlacementVisualHeartbeat(visualVersionKey)
      if (!startedPlacementVisuals.has(visualVersionKey)) {
        rememberBoundedMap(startedPlacementVisuals, visualVersionKey, expectedUrl, C5B_CACHE_LIMITS.messageSnapshots)
        ctx.sendToBackend({ type: 'placement_visual_started', ...visualMessage })
      }
    }
    const onSettled = () => {
      if (!isCurrentFinalImage()) return
      if (update) update.revealedImageUrl = expectedUrl
      rememberBoundedMap(revealedFinalImageByRecord, expectedRecordKey, expectedUrl, C5B_CACHE_LIMITS.messageSnapshots)
      if (pendingFinalRevealByRecord.get(expectedRecordKey) === record.requestId) pendingFinalRevealByRecord.delete(expectedRecordKey)
      if (!isCurrentPlacementVersion()) return
      if (acknowledgedPlacementVisuals.has(visualVersionKey)) return
      rememberBoundedMap(acknowledgedPlacementVisuals, visualVersionKey, expectedUrl, C5B_CACHE_LIMITS.messageSnapshots)
      ctx.sendToBackend({ type: 'placement_visual_settled', ...visualMessage })
    }
    void settlePlacementVisualLifecycle({
      image,
      isCurrent: isCurrentFinalImage,
      reducedMotion: Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches),
      preserveGeometry: !card,
      restoreVisibility,
      onRevealStart: () => {
        if (!isCurrentFinalImage()) return
        disarmProseRevealGuard(expectedRecordKey, record.requestId)
        const mediaSlot = image.closest<HTMLElement>('.rrl-media-slot')
        if (mediaSlot) mediaSlot.dataset.rrnMediaEmpty = 'false'
        if (effectOverlay) removeAuthoredRevealEffect(image, effectOverlay)
        if (card && record.status === 'completed') stripHealthyCompletedLifecycleUi(card)
      },
      onSettled,
    }).then(outcome => {
      if (restoreVisibility !== undefined && authoredRevealVisibilityByImage.get(image) === restoreVisibility) {
        authoredRevealVisibilityByImage.delete(image)
      }
      if (visualLifecycleTracked) finishPlacementVisualHeartbeat(visualVersionKey)
      if ((outcome === 'failed' || outcome === 'stale') && isCurrentFinalImage() && isCurrentPlacementVersion()) {
        ctx.sendToBackend({
          type: 'placement_visual_unavailable',
          ...visualMessage,
          reason: outcome === 'failed' ? 'image-load-failed' : 'visual-lifecycle-cancelled',
        })
      }
    })
  }
  const boundNarrativeControls = new WeakSet<HTMLElement>()
  function bindNarrativeInteractiveControls(): void {
    ensureMountedNarrativePresentationStyle(document)
    for (const launcher of deepQueryAll<HTMLElement>(document, '.rrcp-presentation-sparkling > .rrcp-launch, .rrcp-presentation-plain > .rrcp-launch, .rrcp-presentation-glass > .rrcp-launch')) {
      if (boundNarrativeControls.has(launcher)) continue
      const wrap = launcher.parentElement
      const toggle = launcher.querySelector<HTMLInputElement>('.rrcp-launch-toggle')
      const shell = wrap ? Array.from(wrap.children).find(child => child.classList.contains('rrcp-shell')) as HTMLElement | undefined : undefined
      if (!wrap || !shell) continue
      boundNarrativeControls.add(launcher)
      launcher.tabIndex = 0
      launcher.setAttribute('role', 'button')
      launcher.setAttribute('aria-expanded', toggle?.checked ? 'true' : 'false')
      const activate = (event: Event) => {
        event.preventDefault()
        const open = !(toggle?.checked || wrap.dataset.rrcpOpen === 'true')
        if (toggle) toggle.checked = open
        wrap.dataset.rrcpOpen = open ? 'true' : 'false'
        launcher.setAttribute('aria-expanded', open ? 'true' : 'false')
        shell.style.setProperty('display', open ? 'block' : 'none', 'important')
      }
      launcher.addEventListener('click', activate)
      launcher.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') activate(event)
      })
    }
    for (const launcher of deepQueryAll<HTMLElement>(document, '.rrcp-app-launch')) {
      if (boundNarrativeControls.has(launcher)) continue
      const toggle = launcher.querySelector<HTMLInputElement>('.rrcp-app-toggle')
      const page = launcher.nextElementSibling instanceof HTMLElement && launcher.nextElementSibling.classList.contains('rrcp-page')
        ? launcher.nextElementSibling
        : null
      if (!page) continue
      boundNarrativeControls.add(launcher)
      launcher.tabIndex = 0
      launcher.setAttribute('role', 'button')
      launcher.setAttribute('aria-expanded', toggle?.checked ? 'true' : 'false')
      const activate = (event: Event) => {
        event.preventDefault()
        const open = !(toggle?.checked || launcher.dataset.rrcpOpen === 'true')
        const phone = launcher.closest('.rrcp-phone')
        if (open && phone) {
          for (const other of Array.from(phone.querySelectorAll<HTMLElement>('.rrcp-app-launch'))) {
            if (other === launcher) continue
            const otherToggle = other.querySelector<HTMLInputElement>('.rrcp-app-toggle')
            if (otherToggle) otherToggle.checked = false
            other.dataset.rrcpOpen = 'false'
            other.setAttribute('aria-expanded', 'false')
            const otherPage = other.nextElementSibling
            if (otherPage instanceof HTMLElement && otherPage.classList.contains('rrcp-page')) otherPage.style.setProperty('display', 'none', 'important')
          }
        }
        if (toggle) toggle.checked = open
        launcher.dataset.rrcpOpen = open ? 'true' : 'false'
        launcher.setAttribute('aria-expanded', open ? 'true' : 'false')
        page.style.setProperty('display', open ? 'block' : 'none', 'important')
      }
      launcher.addEventListener('click', activate)
      launcher.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') activate(event)
      })
    }
  }

  const normalizedProseDomText = (value: string): string => value.replace(/\s+/g, ' ').trim().toLocaleLowerCase()

  function ensureSyntheticProseProjection(record: SlotRecord, root: Element): void {
    if (record.target !== 'prose.illustration' || record.proseSynthetic !== true) return
    const projectionSelector = `[data-dgir-prose-projection="${cssEscape(record.key)}"]`
    if (!record.proseAnchor || record.orphaned || record.status === 'superseded') {
      for (const projection of deepQueryAll<HTMLElement>(root as ParentNode, projectionSelector)) projection.remove()
      return
    }
    if (deepQueryAll<HTMLElement>(root as ParentNode, `${projectionSelector}, [data-rrn-native-request="${cssEscape(record.requestId)}"]`).length) return

    // Completed-state compaction discards the original request XML. Rebuild
    // only the inert reservation markup for this exact synthetic request;
    // renderNativeSurfaceMarkup hydrates it from the durable completed record.
    const reservation = record.originalRequestXml || `<scene_image pending="true" requestId="${escapeHtml(record.requestId)}" alt="${escapeHtml(record.alt || 'Scene illustration')}">${escapeHtml(record.caption || record.alt || 'Scene illustration')}</scene_image>`
    const rendered = renderNativeSurfaceMarkup(reservation, customSurfaces, {
      chatId: record.chatId,
      messageId: record.messageId,
      swipeId: record.swipeId,
      isUser: false,
      autoGenerate: config?.autoGenerate,
      generationPlaceholderEffect: config?.generationPlaceholderEffect,
      rendererMode: customSurfaces.rendererMode,
      colorMode: customSurfaces.colorMode,
      defaultShellMode: customSurfaces.defaultShellMode,
      records: [record],
    })
    if (rendered.renderedCount < 1 || !rendered.content.trim()) return

    const template = document.createElement('template')
    template.innerHTML = rendered.content
    const projection = template.content.querySelector<HTMLElement>(`[data-dgir-prose-projection="${cssEscape(record.key)}"]`)
    if (!projection) return

    const paragraphs = deepQueryAll<HTMLElement>(root as ParentNode, 'p').filter(paragraph => !paragraph.closest('.rrl-island, .rrn-native-island, .dgir-prose-lifecycle-projection'))
    const excerpt = normalizedProseDomText(record.proseAnchor.selectedExcerpt || '')
    let anchor = excerpt
      ? paragraphs.find(paragraph => {
          const text = normalizedProseDomText(paragraph.textContent || '')
          return Boolean(text && (text.includes(excerpt) || excerpt.includes(text)))
        })
      : undefined
    if (!anchor && Number.isInteger(record.proseAnchor.paragraphIndex)) anchor = paragraphs[record.proseAnchor.paragraphIndex]
    if (!anchor && record.proseAnchor.insertionSide !== 'end') return

    if (record.proseAnchor.insertionSide === 'before' && anchor?.parentNode) anchor.parentNode.insertBefore(projection, anchor)
    else if (anchor?.parentNode) anchor.parentNode.insertBefore(projection, anchor.nextSibling)
    else root.appendChild(projection)
  }

  function applyLiveProseImagePresentation(image: HTMLImageElement): void {
    const settings = currentProseSettings()
    const size = ['small', 'medium', 'large', 'full'].includes(String(settings.imageSize))
      ? settings.imageSize
      : 'medium'
    const alignment = ['left', 'center', 'right'].includes(String(settings.imageAlignment))
      ? settings.imageAlignment
      : 'center'
    image.dataset.dgirProseSize = size
    image.dataset.dgirProseAlign = alignment
  }

  function bindInlineImages(messageId?: string): void {
    // A completed Surface can outlive its job record or be restored by host
    // Regex rendering. Its figure still needs the same scoped geometry CSS;
    // do not make that stylesheet depend on a live records-loop iteration.
    const stylingRoot = messageId ? ctx.dom.findMessageElement(messageId) : document.body
    if (stylingRoot) ensureMountedLifecycleStyle(stylingRoot)
    if (!messageId) {
      bindNarrativeInteractiveControls()
      for (const row of deepQueryAll<HTMLElement>(document, '[data-rr-kakao-color]')) applyKakaoColorBinding(row)
    }
    const interactionMessageIds = messageId ? [messageId] : [...new Set(records.map(record => record.messageId))]
    for (const interactionMessageId of interactionMessageIds) {
      const root = ctx.dom.findMessageElement(interactionMessageId)
      const snapshot = surfaceInteractionState.get(surfaceInteractionScope(interactionMessageId))
      if (!root || !snapshot) continue
      for (const disclosure of deepQueryAll<HTMLDetailsElement>(root, 'details')) {
        const open = snapshot.disclosures[disclosureStateKey(root, disclosure)]
        if (open !== undefined && disclosure.open !== open) disclosure.open = open
      }
      for (const control of deepQueryAll<HTMLInputElement>(root, interactiveSurfaceControlSelector)) {
        const checked = snapshot.controls[controlStateKey(root, control)]
        if (checked !== undefined && control.checked !== checked) control.checked = checked
      }
    }
    const now = Date.now()
    for (const record of records) {
      if (messageId && record.messageId !== messageId) continue
      const visibleSwipe = activeSwipeByMessage.get(record.messageId)
      if (visibleSwipe !== undefined && record.swipeId !== visibleSwipe) continue
      const root = ctx.dom.findMessageElement(record.messageId)
      if (!root) continue
      ensureMountedLifecycleStyle(root)
      ensureSyntheticProseProjection(record, root)
      const completedProseImageUrl = currentLifecycleImageUrl(record)
      if (completedProseImageUrl) ensureCompletedProseProjection(record, root, completedProseImageUrl)
      const requestCards = deepQueryAll<HTMLElement>(root as ParentNode, `[data-rrn-native-request="${cssEscape(record.requestId)}"]`)
      const active = ['preparing', 'queued', 'awaiting-native-settings', 'parsing', 'provider-waiting', 'generating', 'previewing', 'placement-pending'].includes(record.status)
      const stream = streamPreviews.get(record.key)
      // A provider result is visually final before its message-scoped
      // persistence transaction commits. Hydrate that preserved asset directly
      // into the mounted slot so sibling completions never require a host remount.
      const visualImageUrl = currentLifecycleImageUrl(record)
      if (visualImageUrl) {
        const versionKey = JSON.stringify([record.key, visualImageUrl, record.pendingPlacement?.imageId || record.imageId || ''])
        if (requestCards.length === 0) {
          const alreadyMounted = deepQueryAll<HTMLImageElement>(root as ParentNode, 'img')
            .some(image => urlMatches(image.currentSrc || image.src, visualImageUrl))
          if (!alreadyMounted) {
            // A state update cannot hydrate a card that the host no longer has
            // mounted. Invalidate this message only and retry after the host's
            // render acknowledgement. Sanitizers may discard the first hot
            // projection; bounded retries avoid a permanent one-shot latch.
            requestProjectionInvalidation(record, visualImageUrl, versionKey)
          } else clearProjectionInvalidation(versionKey)
        } else clearProjectionInvalidation(versionKey)
      }
      const needsPlacementRepair = record.status === 'placement-repair-needed'
      const submittingPlacement = slotActionFeedback.isSubmitting(record.key, 'repair-placement')
      const canonicalFailure = isFailureRecoveryStatus(record.status)
      // Silence is not provider failure. Only canonical backend outcomes may
      // expose failure/retry controls; the state watchdog recovers missed ticks.
      const recoverable = canonicalFailure
      const statusLabel = record.status === 'recovered-pending' ? 'Ready'
          : record.status === 'preparing' ? 'Preparing'
          : record.status === 'queued' ? 'Queued'
            : record.status === 'awaiting-native-settings' ? 'Waiting for settings'
              : record.status === 'paused-backlog' ? 'Pending review'
                : record.status === 'superseded' ? 'Superseded'
                  : record.status === 'parsing' ? 'Preparing'
                    : record.status === 'provider-waiting' ? 'Waiting for image worker'
              : record.status === 'generating' ? 'Generating'
                : record.status === 'placement-pending' ? submittingPlacement ? 'Inserting' : record.pendingPlacement ? 'Ready' : 'Inserting'
                  : record.status === 'placement-repair-needed' ? submittingPlacement ? 'Repairing' : 'Repair needed'
                  : record.status === 'completed' ? 'Ready'
                    : record.status === 'failed' || record.status === 'image-unavailable' ? 'Failed'
                      : record.status === 'cancelled' ? 'Stopped'
                        : 'Requested'
      for (const card of requestCards) {
        const owningKey = card.dataset.rrnRecordKey
        if (owningKey && owningKey !== record.key) continue
        if (active) syncGenerationPlaceholderEffect(card)
        const signature = JSON.stringify([record.key, record.status, submittingPlacement, normalizeGenerationPlaceholderEffect(config?.generationPlaceholderEffect), visualImageUrl, record.requestAspect, record.error, stream])
        const media = card.querySelector<HTMLElement>('.rrl-media-slot')
        let slotImage = card.querySelector<HTMLImageElement>('.rrl-slot-image')
        if (media && visualImageUrl && !slotImage) {
          // Narrative, Core, and custom Surface reservations can mount without
          // a fallback <img> while their authored request is still pending.
          // Hydrate the same media slot in place when its canonical image lands;
          // waiting for a host rerender leaves a completed empty card until refresh.
          slotImage = document.createElement('img')
          slotImage.className = 'rrl-slot-image'
          slotImage.alt = record.target === 'prose.illustration' || record.targetApp === 'prose' ? 'Reverie illustration' : 'Reverie media'
          slotImage.hidden = true
          media.appendChild(slotImage)
        }
        const previous = mediaCardUpdates.get(card)
        const update: MediaCardUpdate = previous?.media === media
          ? previous
          : { signature: '', media, sawActiveLifecycle: false }
        if (active) update.sawActiveLifecycle = true
        // The host may remount or re-cover the same completed image without
        // changing Relay's record signature. Recover its decoded pixels before
        // the signature fast-path can skip this card entirely.
        if (record.status === 'completed' && visualImageUrl && slotImage
          && restoreCompletedLifecycleImage(slotImage, visualImageUrl, urlMatches)) {
          if (media) media.dataset.rrnMediaEmpty = 'false'
          disarmProseRevealGuard(record.key, record.requestId)
        }
        if (update.signature === signature && previous === update) continue
        update.signature = signature
        mediaCardUpdates.set(card, update)
        card.dataset.rrnLiveStatus = record.status
        card.dataset.rrnPlacementReady = record.status === 'placement-pending' && Boolean(record.pendingPlacement) && !submittingPlacement ? 'true' : 'false'
        card.dataset.rrnRecordKey = record.key
        card.classList.toggle('rrl-error', recoverable)
        const status = card.querySelector<HTMLElement>('.rrl-status')
        setMediaText(status, statusLabel)
        const title = card.querySelector<HTMLElement>('.rrl-title')
        const stateIcon = card.querySelector<HTMLElement>('.rrl-state-icon')
        if (title && record.status === 'preparing') title.textContent = 'Preparing generation…'
        else if (title && record.status === 'generating') title.textContent = 'Generating image…'
        else if (title && record.status === 'provider-waiting') title.textContent = 'Queued for ImageGen…'
        else if (title && record.status === 'parsing') title.textContent = 'Preparing image…'
        else if (title && record.status === 'queued') title.textContent = 'Waiting to generate…'
        else if (title && record.status === 'placement-pending') title.textContent = submittingPlacement ? 'Inserting image…' : record.pendingPlacement ? 'Image ready to insert' : 'Inserting image…'
        else if (title && record.status === 'placement-repair-needed') title.textContent = submittingPlacement ? 'Repairing image placement…' : 'Generated image needs placement repair'
        else if (title && (record.status === 'failed' || record.status === 'image-unavailable')) title.textContent = 'Generation failed'
        else if (title && record.status === 'cancelled') title.textContent = 'Generation stopped'
        else if (title && record.status === 'completed') title.textContent = 'Image completed'
        if (stateIcon) stateIcon.textContent = recoverable ? '!' : record.status === 'completed' || record.status === 'placement-pending' && record.pendingPlacement ? '✓' : '✦'

        const mediaSlot = media
        if (mediaSlot) {
          mediaSlot.dataset.rrnMediaState = record.status
          if (record.requestAspect && !mediaSlot.style.getPropertyValue('--reverie-media-aspect')) {
            const ratio = /^(\d+(?:\.\d+)?)\s*[:/]\s*(\d+(?:\.\d+)?)$/.exec(record.requestAspect.trim())
            if (ratio) mediaSlot.style.setProperty('--reverie-media-aspect', `${Number(ratio[1])} / ${Number(ratio[2])}`)
          }
          if (visualImageUrl && slotImage) {
            slotImage.loading = 'eager'
            slotImage.setAttribute('fetchpriority', 'high')
            slotImage.decoding = 'async'
            const isProseLifecycle = record.target === 'prose.illustration' || record.targetApp === 'prose'
            if (isProseLifecycle) {
              slotImage.dataset.dgirApp = 'prose'
              applyLiveProseImagePresentation(slotImage)
            }
            const imageChanged = !urlMatches(slotImage.currentSrc || slotImage.src, visualImageUrl)
            const pendingRecordReveal = pendingFinalRevealByRecord.get(record.key) === record.requestId
            const waitingForCompletedRender = record.status === 'placement-pending' && pendingRecordReveal
            const shouldReveal = shouldStartFinalImageReveal({
              imageChanged,
              sawActiveLifecycle: update.sawActiveLifecycle,
              pendingRecordReveal,
              cardAlreadyRevealed: urlMatches(update.revealedImageUrl || '', visualImageUrl),
              recordAlreadyRevealed: urlMatches(revealedFinalImageByRecord.get(record.key) || '', visualImageUrl),
              readyForReveal: !waitingForCompletedRender,
            })
            prepareFinalLifecycleImage(slotImage, visualImageUrl, shouldReveal || waitingForCompletedRender, urlMatches)
            mediaSlot.dataset.rrnMediaEmpty = waitingForCompletedRender || shouldReveal ? 'true' : 'false'
            if (shouldReveal) {
              update.sawActiveLifecycle = false
              revealFinalImageWhenReady(card, slotImage, visualImageUrl, record, update, authoredRevealOverlayByImage.get(slotImage))
            } else if (record.status === 'completed') {
              update.sawActiveLifecycle = false
              if (pendingRecordReveal) pendingFinalRevealByRecord.delete(record.key)
            }
          } else if (!stream?.imageDataUrl && slotImage && record.status !== 'completed') {
            const replacingPreviousImage = ['regenerate-same-settings', 'regenerate-current-settings', 'intent-regeneration'].includes(String(record.triggerType || ''))
              && isGenerationActiveStatus(record.status)
            if (replacingPreviousImage && (slotImage.currentSrc || slotImage.src)) {
              concealPreviousLifecycleImage(slotImage)
            } else if (!replacingPreviousImage) slotImage.hidden = true
            mediaSlot.dataset.rrnMediaEmpty = 'true'
          }
        }

        if (record.status === 'completed' && record.imageUrl && pendingFinalRevealByRecord.get(record.key) !== record.requestId) stripHealthyCompletedLifecycleUi(card)

        const previewHost = card.querySelector<HTMLElement>('.rrl-preview')
        const previewImage = card.querySelector<HTMLImageElement>('.rrl-preview-image')
        const previewBadge = card.querySelector<HTMLElement>('.rrl-preview-badge')
        const diffusionStage = card.querySelector<HTMLElement>('.rr-diffusion-stage')
        const diffusionFrame = diffusionStage?.querySelector<HTMLImageElement>('.rr-diffusion-frame')
        const diffusionAmbient = diffusionStage?.querySelector<HTMLImageElement>('.rr-diffusion-ambient')
        const diffusionStatus = diffusionStage?.querySelector<HTMLElement>('.rr-diffusion-status')
        if (active && !visualImageUrl && stream?.imageDataUrl && diffusionStage && diffusionFrame && diffusionAmbient) {
          if (diffusionFrame.src !== stream.imageDataUrl) diffusionFrame.src = stream.imageDataUrl
          if (diffusionAmbient.src !== stream.imageDataUrl) diffusionAmbient.src = stream.imageDataUrl
          diffusionFrame.hidden = false
          diffusionAmbient.hidden = false
          diffusionStage.dataset.rrPreviewReady = 'true'
          if (diffusionStatus) {
            diffusionStatus.textContent = stream.step !== undefined && stream.totalSteps ? `Diffusion preview · ${stream.step}/${stream.totalSteps}` : 'Diffusion preview'
            diffusionStatus.hidden = false
          }
          if (previewHost) previewHost.hidden = true
          if (mediaSlot) {
            mediaSlot.dataset.rrnMediaState = 'previewing'
            mediaSlot.dataset.rrnMediaEmpty = 'true'
          }
        } else if (active && !visualImageUrl && stream?.imageDataUrl && previewHost && previewImage) {
          if (previewImage.src !== stream.imageDataUrl) previewImage.src = stream.imageDataUrl
          previewHost.hidden = false
          if (mediaSlot) {
            mediaSlot.dataset.rrnMediaState = 'previewing'
            mediaSlot.dataset.rrnMediaEmpty = 'false'
          }
          if (previewBadge) previewBadge.textContent = stream.step !== undefined && stream.totalSteps ? `Live preview · ${stream.step}/${stream.totalSteps}` : 'Live preview'
        } else if (previewHost) {
          previewHost.hidden = true
        }
        const streamStatus = card.querySelector<HTMLElement>('.rrl-stream-status')
        setMediaText(streamStatus, stream?.statusText || '')
        const progress = card.querySelector<HTMLElement>('.rrl-progress')
        const progressFill = progress?.querySelector<HTMLElement>('span') || null
        if (progress && progressFill && stream?.totalSteps && stream.totalSteps > 0 && stream.step !== undefined) {
          const percentage = Math.max(0, Math.min(100, Math.round((stream.step / stream.totalSteps) * 100)))
          progress.hidden = false
          progressFill.style.width = `${percentage}%`
          progress.setAttribute('aria-label', `${percentage}% generated`)
        } else if (progress) {
          progress.hidden = true
        }

        const readyToInsert = record.status === 'placement-pending' && Boolean(record.pendingPlacement) && !submittingPlacement
        let actions = card.querySelector<HTMLElement>('.rrl-actions')
        if (!actions && readyToInsert) {
          actions = document.createElement('div')
          actions.className = 'rrl-actions'
          card.appendChild(actions)
        }
        if (actions) {
          const desired: Array<[string, string]> = submittingPlacement
            ? []
            : needsPlacementRepair
            ? [['repair-placement', 'Repair / Reinsert'], ['reparse', 'Reparse'], ['rescan', 'Rescan']]
            : canonicalFailure
            ? [['regenerate', 'Regenerate'], ['reparse', 'Reparse'], ['rescan', 'Rescan']]
            : readyToInsert
            ? [['repair-placement', 'Insert']]
            : []
          const signature = desired.map(([action]) => action).join('|')
          if (actions.dataset.rrlActionSet !== signature) {
            const source = actions.querySelector<HTMLButtonElement>('button')
            const surfaceId = source?.dataset.rrnSurfaceId || ''
            const rootTag = source?.dataset.rrnRootTag || ''
            const buttons = desired.map(([action, label]) => {
              const button = document.createElement('button')
              button.type = 'button'
              button.dataset.rrnAction = action
              button.dataset.rrnChatId = record.chatId
              button.dataset.rrnMessageId = record.messageId
              button.dataset.rrnSwipeId = String(record.swipeId)
              button.dataset.rrnRequestId = record.requestId
              if (surfaceId) button.dataset.rrnSurfaceId = surfaceId
              if (rootTag) button.dataset.rrnRootTag = rootTag
              button.textContent = label
              return button
            })
            actions.replaceChildren(...buttons)
            actions.dataset.rrlActionSet = signature
          }
          for (const actionButton of Array.from(actions.querySelectorAll<HTMLButtonElement>('button[data-rrn-action]'))) {
            if (actionButton.dataset.rrlDirectBound === 'true') continue
            actionButton.dataset.rrlDirectBound = 'true'
            actionButton.addEventListener('click', event => {
              event.preventDefault()
              event.stopImmediatePropagation()
              handleNativeSurfaceCommand({
                action: actionButton.dataset.rrnAction || '',
                chatId: actionButton.dataset.rrnChatId || record.chatId,
                messageId: actionButton.dataset.rrnMessageId || record.messageId,
                swipeId: actionButton.dataset.rrnSwipeId === undefined || actionButton.dataset.rrnSwipeId === '' ? record.swipeId : Number(actionButton.dataset.rrnSwipeId),
                requestId: actionButton.dataset.rrnRequestId || record.requestId,
                rootTag: actionButton.dataset.rrnRootTag || '',
                surfaceId: actionButton.dataset.rrnSurfaceId || '',
              }, actionButton)
            })
          }
        }
      }
    }
    const completed = records.filter(record => (!messageId || record.messageId === messageId) && currentLifecycleImageUrl(record))
    for (const record of completed) {
      const visualImageUrl = currentLifecycleImageUrl(record)
      const visualImageId = record.pendingPlacement?.imageId || record.imageId || ''
      const root = ctx.dom.findMessageElement(record.messageId)
      if (!root) continue
      const stableSelector = [
        `img[data-dgir-key="${cssEscape(record.key)}"]`,
        `img[data-dgir-request-id="${cssEscape(record.requestId)}"][data-dgir-slot="${cssEscape(record.slot)}"]`,
        visualImageId ? `img[data-dgir-image-id="${cssEscape(visualImageId)}"]` : '',
      ].filter(Boolean).join(',')
      const activeSwipe = activeSwipeByMessage.get(record.messageId)
      if (activeSwipe !== undefined && record.swipeId !== activeSwipe) continue
      const allMessageImages = deepQueryAll<HTMLImageElement>(root as ParentNode, 'img')
      const urlImages = allMessageImages.filter(image => urlMatches(image.currentSrc || image.src, visualImageUrl))
      const stableImages = stableSelector
        ? deepQueryAll<HTMLImageElement>(root as ParentNode, stableSelector).filter(image => {
            const imageSwipeText = image.dataset.dgirSwipeId || ''
            const imageSwipe = imageSwipeText ? Number(imageSwipeText) : Number.NaN
            return (!Number.isFinite(imageSwipe) || imageSwipe === record.swipeId) && (!image.src || urlMatches(image.currentSrc || image.src, visualImageUrl))
          })
        : []
      const images = urlImages.length > 0 ? urlImages : stableImages
      const requestCards = deepQueryAll<HTMLElement>(root as ParentNode, `[data-rrn-native-request="${cssEscape(record.requestId)}"]`)
      const lifecycleImages = images.filter(image => requestCards.some(card => card.contains(image)))
      const authoredImages = images.filter(image => !lifecycleImages.includes(image))
      const isProse = record.target === 'prose.illustration' || record.targetApp === 'prose'
      if (isProse && lifecycleImages.length) {
        // The lifecycle projection is the single canonical prose owner from
        // status through final. Remove only exact duplicate completed images.
        for (const image of authoredImages) image.remove()
      } else if (authoredImages.length) {
        for (const card of requestCards) {
          card.remove()
        }
      }
      cleanLegacyIllustrationControls(root as ParentNode)
      const bindingImages = isProse && lifecycleImages.length ? lifecycleImages : (authoredImages.length ? authoredImages : images)
      for (const image of bindingImages) {
        image.dataset.dgirKey = record.key
        image.dataset.dgirRequestId = record.requestId
        image.dataset.dgirSlot = record.slot
        image.dataset.dgirImageId = visualImageId
        image.dataset.dgirApp = record.targetApp
        image.dataset.dgirMessageId = record.messageId
        image.dataset.dgirSwipeId = String(record.swipeId)
        image.dataset.dgirBound = 'true'
        if (record.target === 'prose.illustration' || record.targetApp === 'prose') applyLiveProseImagePresentation(image)
        if (record.status === 'completed' && pendingFinalRevealByRecord.get(record.key) === record.requestId) {
          image.loading = 'eager'
          image.setAttribute('fetchpriority', 'high')
          image.decoding = 'async'
        }
        image.title = 'Open image'
        if (image.dataset.dgirLightboxBound !== 'true') {
          image.dataset.dgirLightboxBound = 'true'
          image.addEventListener('click', event => {
            const current = recordForImage(image) || recordByKey.get(image.dataset.dgirKey || '') || record
            if (!current) return
            event.preventDefault()
            event.stopImmediatePropagation()
            openLightbox(current)
          })
        }
        const pendingAuthoredReveal = pendingFinalRevealByRecord.get(record.key) === record.requestId && !lifecycleImages.includes(image)
        if (pendingAuthoredReveal && !authoredRevealOverlayByImage.has(image)) {
          const overlay = mountAuthoredRevealEffect(image)
          if (overlay) authoredRevealOverlayByImage.set(image, overlay)
        }
        if (record.status === 'completed' && pendingAuthoredReveal && !startedAuthoredReveals.has(image)) {
          startedAuthoredReveals.add(image)
          revealFinalImageWhenReady(null, image, visualImageUrl, record, null, authoredRevealOverlayByImage.get(image), authoredRevealVisibilityByImage.get(image))
        }
      }
    }
  }

  function reconcileRenderedRelayMessage(messageId: string): void {
    const root = ctx.dom.findMessageElement(messageId)
    if (!root) return
    acknowledgeProjectionInvalidation(messageId)
    const hadMountedContent = root.childNodes.length > 0
    ensureMountedLifecycleStyle(root)
    bindInlineImages(messageId)
    const expected = records.filter(record => record.messageId === messageId && currentLifecycleImageUrl(record))
    const images = deepQueryAll<HTMLImageElement>(root as ParentNode, 'img')
    const missing = expected.filter(record => {
      const expectedUrl = currentLifecycleImageUrl(record)
      return !images.some(image => urlMatches(image.currentSrc || image.src, expectedUrl))
    })
    if (hadMountedContent && root.childNodes.length === 0) console.warn('[Reverie Relay] Render reconciliation found an emptied message root.', { messageId })
    if (missing.length) console.warn('[Reverie Relay] Render reconciliation could not hydrate every expected media slot.', { messageId, slotKeys: missing.map(record => record.key) })
  }

  function stripHealthyCompletedLifecycleUi(card: HTMLElement): void {
    card.removeAttribute('aria-live')
    for (const selector of ['.rrl-generation-placeholder', '.rrl-preview', '.rrl-main', '.rrl-actions', '.rrl-detail']) {
      for (const node of Array.from(card.querySelectorAll(selector))) node.remove()
    }
  }

  function syncGenerationPlaceholderEffect(root: ParentNode = document): void {
    const effect = normalizeGenerationPlaceholderEffect(config?.generationPlaceholderEffect)
    for (const placeholder of deepQueryAll<HTMLElement>(root, '.rrl-generation-placeholder')) {
      if (placeholder.dataset.rrPlaceholderEffect === effect) continue
      placeholder.dataset.rrPlaceholderEffect = effect
      placeholder.replaceChildren()
      if (effect === 'none') continue
      const layer = document.createElement('span')
      layer.setAttribute('aria-hidden', 'true')
      if (effect === 'spinner') layer.className = 'rr-spinner'
      else if (effect === 'dream-orb') layer.className = 'rr-orb'
      else if (effect === 'diffusion-preview') {
        placeholder.innerHTML = renderGenerationPlaceholderEffect(effect)
        continue
      }
      else {
        layer.className = 'rr-regex-particles'
        layer.append(...Array.from({ length: 24 }, () => document.createElement('i')))
      }
      placeholder.appendChild(layer)
    }
  }

  function applyGlobalInterfaceSettings(): void {
    const theme = ['velvet-prism', 'clean-panel'].includes(String(config?.interfaceTheme))
      ? config!.interfaceTheme
      : 'velvet-prism'
    document.documentElement.dataset.dgirTheme = theme
    const prose = currentProseSettings()
    const imageSize = prose.imageSize || 'medium'
    const alignment = prose.imageAlignment || 'center'
    const imageWidth = imageSize === 'small' ? '48%'
      : imageSize === 'large' ? '84%'
        : imageSize === 'full' ? '100%'
          : '66%'
    const maxWidth = imageSize === 'small' ? '420px'
      : imageSize === 'large' ? '920px'
        : imageSize === 'full' ? '100%'
          : '720px'
    const justify = alignment === 'left' ? 'flex-start' : alignment === 'right' ? 'flex-end' : 'center'
    const marginLeft = alignment === 'left' ? '0' : 'auto'
    const marginRight = alignment === 'right' ? '0' : 'auto'
    const textAlign = alignment === 'left' ? 'left' : alignment === 'right' ? 'right' : 'center'
    document.documentElement.style.setProperty('--dgir-prose-image-width', imageWidth)
    document.documentElement.style.setProperty('--dgir-prose-image-max-width', maxWidth)
    document.documentElement.style.setProperty('--dgir-prose-image-justify', justify)
    document.documentElement.style.setProperty('--dgir-prose-image-margin-left', marginLeft)
    document.documentElement.style.setProperty('--dgir-prose-image-margin-right', marginRight)
    document.documentElement.style.setProperty('--dgir-prose-image-text-align', textAlign)
    document.documentElement.dataset.dgirProseImageSize = imageSize
    document.documentElement.style.removeProperty('--dgir-prose-bubble-inner-width')
    for (const image of deepQueryAll<HTMLImageElement>(document, 'img[data-dgir-app="prose"]')) applyLiveProseImagePresentation(image)
  }

  function renderQuickStartOverview(onFinish?: () => void): HTMLElement {
    const sections = [
      ['Relay', 'Semantic image requests stay attached to their exact message position while Relay parses, queues, generates, inserts, recovers, and archives them.'],
      ['Illustrator', 'Relay-Planned selects visual beats after the response. Model Planned follows exact inline request anchors authored through the active preset prompt.'],
      ['Surfaces', 'Relay Rendering creates native interactive surfaces. Regex Rendering keeps the supplied visual packs available as a compatibility renderer.'],
      ['Appearance Memory', 'Appearance Sidecar keeps stable identity, wardrobe, and current-scene appearance separately from full chat, card, persona, lorebook, native binding, and accepted continuity context.'],
      ['Archive', 'Media Archive keeps completed outputs, deleted-message assets, candidates, prompt metadata, and recovery history together.'],
      ['Configuration', 'Choose native or Relay-owned generation settings, presentation mode, prompt profiles, sidecar parsing, and gallery saving.'],
    ] as const
    const wrap = document.createElement('div')
    wrap.className = 'dg-tutorial dg-quick-start'
    const intro = document.createElement('p')
    intro.textContent = 'Reverie Relay connects semantic story surfaces, local image generation, visual continuity, and persistent media controls.'
    const grid = document.createElement('div')
    grid.className = 'dg-grid dg-grid-2'
    for (const [title, copy] of sections) {
      const card = document.createElement('div')
      card.className = 'dg-card'
      const strong = document.createElement('strong'); strong.textContent = title
      const paragraph = document.createElement('p'); paragraph.textContent = copy
      card.append(strong, paragraph)
      grid.appendChild(card)
    }
    const actions = document.createElement('div'); actions.className = 'dg-actions'
    actions.append(button('Finish Overview', () => {
      onFinish?.()
    }, false, 'primary'))
    wrap.append(intro, grid, actions)
    return wrap
  }

  function openQuickStartOverview(): void {
    const modal = ctx.ui.showModal({ title: 'Quick Start Overview', width: 780, persistent: false })
    modal.root.classList.add('dg-router-panel', 'dg-modal-host')
    modal.root.appendChild(renderQuickStartOverview(() => modal.dismiss()))
  }

  function maybeOpenQuickStartOverview(): void {
    if (quickStartAutoOpened || !config?.tutorialModeEnabled) return
    quickStartAutoOpened = true
    // This flag means the one-time first-run overview is still pending. Clear
    // it as soon as the overview is shown so closing Lumiverse or dismissing
    // the modal with its X cannot make onboarding repeat on every launch.
    patchConfig({ tutorialModeEnabled: false, tutorialStep: 0 })
    openQuickStartOverview()
  }

  function sendStoryAction(action: string, fields: Record<string, unknown> = {}): void {
    if (!activeChatId) return
    ctx.sendToBackend({ type: 'story_action', chatId: activeChatId, action, ...fields })
  }

  function storyText(text: string, className = 'dg-story-copy'): HTMLElement {
    const node = document.createElement('p')
    node.className = className
    node.textContent = text
    return node
  }

  function storyImages(event: StoryEventNode): VisualAssetReference[] {
    return storyEventImageIds(storyConstellations, event).map(id => assetLibrary.assets[id]).filter(asset => asset?.status === 'available' && Boolean(asset.imageUrl))
  }

  function openStoryEdit(options: { title: string; description?: string; fields?: Array<{ label: string; value: string; required?: boolean; maxLength?: number }>; submit?: string; danger?: boolean; save: (values: string[]) => void }): void {
    // Embedded Lumiverse browsers do not implement native prompt/confirm.
    // Use the host modal and keep edits scoped to the chat that opened it.
    const openingChatId = activeChatId
    const modal = ctx.ui.showModal({ title: options.title, width: 620, persistent: true })
    modal.root.classList.add('dg-router-panel', 'dg-modal-host')
    const dismiss = installAccessibleModalDismissal(modal, options.title)
    const body = document.createElement('div'); body.className = 'dg-modal-body'
    if (options.description) body.appendChild(storyText(options.description))
    const values = (options.fields || []).map(field => field.value)
    const inputs: HTMLTextAreaElement[] = []
    for (const [index, field] of (options.fields || []).entries()) {
      const control = textareaInput(field.label, field.value, value => { values[index] = value })
      const input = control.querySelector('textarea')!
      input.setAttribute('aria-label', field.label)
      if (field.maxLength) input.maxLength = field.maxLength
      input.required = field.required === true
      inputs.push(input); body.appendChild(control)
    }
    const error = document.createElement('div'); error.className = 'dg-warning'; error.hidden = true
    const actions = document.createElement('div'); actions.className = 'dg-actions'
    actions.append(button('Cancel', dismiss, false, 'subtle'), button(options.submit || 'Save', () => {
      inputs.forEach((input, index) => { values[index] = input.value })
      if (!openingChatId || activeChatId !== openingChatId) { error.textContent = 'Return to the original chat before saving this edit.'; error.hidden = false; return }
      const invalid = (options.fields || []).findIndex((field, index) => field.required && !values[index].trim())
      if (invalid >= 0) { error.textContent = `${options.fields![invalid].label} cannot be empty.`; error.hidden = false; inputs[invalid].focus(); return }
      options.save(values); dismiss()
    }, false, options.danger ? 'danger' : 'primary'))
    body.append(error, actions); modal.root.appendChild(body)
    inputs[0]?.focus()
  }

  function storyImage(asset: VisualAssetReference, title: string): HTMLButtonElement {
    const open = document.createElement('button'); open.type = 'button'; open.className = 'dg-story-image-button'
    open.setAttribute('aria-label', `Open image: ${title}`)
    const image = document.createElement('img'); image.className = 'dg-story-media'; image.src = asset.imageUrl; image.alt = asset.alt || title; image.loading = 'lazy'
    open.appendChild(image); open.addEventListener('click', () => openAssetImage(asset))
    return open
  }

  function goToStorySource(source: StorySourceRef | undefined): void {
    if (!source) return
    if (source.sourceState === 'deleted') { showToast('info', 'This source was deleted. Its confirmed story memory and evidence are retained.'); return }
    if (source.chatId !== activeChatId) { showToast('info', 'Open the source chat to inspect this memory. No other chat or swipe was changed.'); return }
    const message = ctx.dom.findMessageElement(source.messageId)
    if (!message) { showToast('info', 'This source is outside the mounted chat window. Use Browse messages to load it.'); return }
    // This host has no public virtual-message navigation or swipe-selection
    // API. Never silently show a different swipe as the originating source.
    const currentSwipe = activeSwipeByMessage.get(source.messageId)
    if (source.sourceState === 'inactive-swipe' || (currentSwipe !== undefined && currentSwipe !== source.swipeId)) {
      showToast('info', `Source belongs to swipe ${source.swipeId + 1}. Select that swipe to inspect the original; your active swipe was not changed.`)
    } else if (source.sourceState === 'edited') showToast('info', 'This source was edited. The event retains its original supporting excerpt.')
    message.scrollIntoView({ block: 'center', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
    ;(message as HTMLElement).focus?.({ preventScroll: true })
  }

  function renderStorySettingsAndBackfill(): HTMLElement {
    const box = document.createElement('div')
    const stack = document.createElement('div')
    stack.className = 'dg-story-stack'
    if (!config) {
      stack.appendChild(empty('Story settings are loading.'))
      box.appendChild(panelSection('Story State', stack))
      return box
    }
    stack.append(
      toggleCard('Event Constellations', 'Analyzes new and edited story messages with the configured Relay parser. Findings remain proposals until you confirm them. Existing story data stays available when analysis is off.', config.storyConstellationsEnabled, checked => patchConfig({ storyConstellationsEnabled: checked })),
      toggleCard('Auto-confirm high-confidence events', 'Allows only strongly grounded candidates at 95% confidence or higher to become canon automatically. Off by default; ambiguous or weak candidates always stay proposals.', config.autoConfirmStoryEvents, checked => patchConfig({ autoConfirmStoryEvents: checked }), !config.storyConstellationsEnabled),
      toggleCard('Knowledge conflict alerts', 'Shows when a new source conflicts with a recorded character knowledge state. Unknown is not treated as unaware.', config.storyKnowledgeConflictAlerts, checked => patchConfig({ storyKnowledgeConflictAlerts: checked }), !config.storyConstellationsEnabled),
      toggleCard('Analyze edited messages', 'Rechecks a changed message when Event Constellations is enabled. Confirmed events are preserved and changed meanings become new review proposals.', config.analyzeEditedStoryMessages, checked => patchConfig({ analyzeEditedStoryMessages: checked }), !config.storyConstellationsEnabled),
      toggleCard('Inject character knowledge context', 'Adds a short character-scoped reminder from confirmed active events only. It does not inject the Story Reel or inactive/non-canon events.', config.injectStoryEventContext, checked => patchConfig({ injectStoryEventContext: checked }), !config.storyConstellationsEnabled),
    )
    if (config.storyConstellationsEnabled && !config.parserConnectionId) {
      const warning = document.createElement('div'); warning.className = 'dg-warning'
      warning.textContent = 'Event analysis needs a Relay parser connection. Without one, backfill can ingest authored Character Phones but cannot find Event proposals.'
      stack.append(warning, button('Choose Parser Connection', () => { activeTab = 'utility-studio'; renderPanel() }, false, 'subtle'))
    }
    if (activeChatId) {
      const includeInactive = document.createElement('label')
      includeInactive.className = 'dg-story-field'
      const checkbox = document.createElement('input')
      checkbox.type = 'checkbox'
      checkbox.checked = storyIncludeInactiveSwipes
      checkbox.addEventListener('change', () => { storyIncludeInactiveSwipes = checkbox.checked })
      includeInactive.append(checkbox, document.createTextNode('Include inactive swipes (still excluded from active views)'))
      stack.appendChild(includeInactive)
    }
    const running = storyBackfillStatus?.chatId === activeChatId && storyBackfillStatus.status === 'running'
    stack.appendChild(button(running ? 'Cancel Backfill' : 'Backfill Existing Chat', () => sendStoryAction(running ? 'cancel-backfill' : 'backfill', { includeInactiveSwipes: storyIncludeInactiveSwipes }), !config.storyConstellationsEnabled || !activeChatId, running ? 'danger' : 'primary', 'Manual, resumable, proposal-first analysis. This does not run during migration or chat open.'))
    if (storyBackfillStatus?.chatId === activeChatId) {
      const status = document.createElement('div')
      status.className = 'dg-story-card'
      const text = storyBackfillStatus.message || `${storyBackfillStatus.status}: ${storyBackfillStatus.completed} / ${storyBackfillStatus.total}`
      status.textContent = `${storyBackfillStatus.status.toUpperCase()} · ${storyBackfillStatus.completed}/${storyBackfillStatus.total} terminal · ${text}`
      stack.appendChild(status)
    }
    const recent = logs.filter(log => log.chatId === activeChatId && log.eventType === 'story_analysis_outcome').sort((left, right) => right.timestamp - left.timestamp).slice(0, 3)
    if (recent.length) {
      const analysis = document.createElement('details'); analysis.className = 'dg-story-card dg-story-manage'
      analysis.open = storyAnalysisExpanded
      analysis.addEventListener('toggle', () => { if (analysis.isConnected) storyAnalysisExpanded = analysis.open })
      const heading = document.createElement('summary'); heading.textContent = 'Recent Story Analysis'; analysis.appendChild(heading)
      for (const log of recent) {
        const result = log.details || {}
        const row = document.createElement('div'); row.className = 'dg-story-card'
        const count = (key: string) => typeof result[key] === 'number' ? result[key] as number : 0
        const status = result.status === 'failed' ? 'Analysis failed' : result.status === 'skipped' ? 'Analysis skipped' : count('rawCandidates') === 0 ? 'No event found' : `${count('proposals')} proposals · ${count('rejectedCandidates')} rejected`
        row.appendChild(storyText(status, 'dg-story-title'))
        if (typeof result.reason === 'string') row.appendChild(storyText(result.reason.replace(/-/g, ' ')))
        const reasons = result.rejectionReasons && typeof result.rejectionReasons === 'object' ? Object.entries(result.rejectionReasons) : []
        for (const [reason, amount] of reasons) row.appendChild(storyText(`${reason.replace(/-/g, ' ')} (${amount})`))
        if (Array.isArray(result.rejectionExamples)) for (const example of result.rejectionExamples.slice(0, 3)) {
          if (example && typeof example.anchor === 'string') row.appendChild(storyText(`Rejected evidence: “${example.anchor}”`))
        }
        if (log.messageId && typeof log.swipeId === 'number') row.appendChild(button('Retry Analysis', () => sendStoryAction('retry-analysis', { messageId: log.messageId, swipeId: log.swipeId }), !config.storyConstellationsEnabled || running, 'subtle', 'Recheck this source with the configured parser. This makes one model call when eligible; proposals still require confirmation.'))
        analysis.appendChild(row)
      }
      stack.appendChild(analysis)
    }
    box.appendChild(panelSection('Story State & Backfill', stack))
    return box
  }

  function renderStoryProposal(proposal: StoryEventProposal): HTMLElement {
    const card = document.createElement('article')
    card.className = 'dg-story-card'
    const title = document.createElement('h4'); title.className = 'dg-story-title'; title.textContent = proposal.title
    card.append(title, storyText(proposal.summary))
    const meta = document.createElement('div'); meta.className = 'dg-story-meta'
    for (const value of [proposal.eventType, proposal.importance, `${Math.round(proposal.confidence * 100)}% confidence`, `Source ${proposal.sourceRef.messageId} · swipe ${proposal.sourceRef.swipeId}`, proposal.sourceRef.sourceState]) {
      const pill = document.createElement('span'); pill.className = 'dg-story-pill'; pill.textContent = value; meta.appendChild(pill)
    }
    card.appendChild(meta)
    if (proposal.sourceRef.excerpt) card.appendChild(storyText(`Evidence: “${proposal.sourceRef.excerpt}”`))
    const actors = proposal.participants.map(participant => storyConstellations.actors[participant.actorId]?.displayName || 'Unresolved character')
    if (actors.length) card.appendChild(storyText(`Participants: ${actors.join(', ')}`))
    const actions = document.createElement('div'); actions.className = 'dg-actions'
    const canConfirm = proposal.sourceRef.sourceState === 'active'
    const linksExistingEvent = proposal.proposalKind === 'event-echo' && Boolean(proposal.likelyDuplicateEventId && storyConstellations.events[proposal.likelyDuplicateEventId]?.canonState === 'confirmed')
    actions.append(
      button('Go to Source', () => goToStorySource(proposal.sourceRef), false, 'subtle'),
      button(proposal.proposalKind === 'revision' ? 'Confirm Revision & Supersede' : linksExistingEvent ? 'Link as Event Echo' : 'Confirm', () => sendStoryAction(proposal.proposalKind === 'revision' && proposal.likelyDuplicateEventId ? 'supersede-event' : 'confirm-proposal', { proposalId: proposal.proposalId, eventId: proposal.likelyDuplicateEventId }), !canConfirm, 'primary', canConfirm ? proposal.proposalKind === 'revision' ? 'Confirm the new meaning and retain the old event as superseded history.' : linksExistingEvent ? 'Attach this source and its grounded knowledge/Echoes to the existing event.' : 'Add this event to confirmed canon.' : 'Reactivate the source swipe before confirming.'),
      button('Edit', () => openStoryEdit({title:'Edit Event Proposal',fields:[{label:'Event title',value:proposal.title,required:true,maxLength:120},{label:'Event summary',value:proposal.summary,required:true,maxLength:520}],save:([title,summary])=>sendStoryAction('edit-proposal',{proposalId:proposal.proposalId,title,summary})}), false, 'subtle'),
      button('Mark Non-Canon', () => sendStoryAction('mark-non-canon', { proposalId: proposal.proposalId }), false, 'danger'),
    )
    if (proposal.proposalKind !== 'revision' && proposal.likelyDuplicateEventId && storyConstellations.events[proposal.likelyDuplicateEventId]) actions.appendChild(button('Create Separate Event & Supersede', () => sendStoryAction('supersede-event', { proposalId: proposal.proposalId, eventId: proposal.likelyDuplicateEventId }), !canConfirm, 'subtle'))
    card.appendChild(actions)
    return card
  }

  function renderStoryEventSummary(event: StoryEventNode): HTMLElement {
    const card = document.createElement('article'); card.className = 'dg-story-card'
    const title = document.createElement('h4'); title.className = 'dg-story-title'; title.textContent = event.title
    card.append(title, storyText(event.summary))
    const images = storyImages(event)
    if (images[0]) card.appendChild(storyImage(images[0], event.title))
    const meta = document.createElement('div'); meta.className = 'dg-story-meta'
    const names = event.participants.map(participant => storyConstellations.actors[participant.actorId]?.displayName || 'Unresolved character')
    const knowledgeCount = event.participants.filter(participant => Boolean(storyConstellations.knowledgeEdges[`${event.eventId}:${participant.actorId}`])).length
    for (const value of [event.storyTimeLabel, event.location, names.join(', '), `${event.echoIds.length} Echoes`, `${images.length} linked images`, `${knowledgeCount} knowledge links`, event.canonState]) {
      if (!value) continue
      const pill = document.createElement('span'); pill.className = 'dg-story-pill'; pill.textContent = value; meta.appendChild(pill)
    }
    card.appendChild(meta)
    if (event.sourceWarning) { const warning = document.createElement('div'); warning.className = 'dg-warning'; warning.textContent = event.sourceWarning; card.appendChild(warning) }
    const actions = document.createElement('div'); actions.className = 'dg-actions'
    actions.appendChild(button('Open Constellation', () => { selectedStoryEventId = event.eventId; pendingStoryEventNavigation = event.eventId; renderPanel() }, false, 'primary'))
    actions.appendChild(button('Go to Source', () => goToStorySource(event.sourceRefs[0]), !event.sourceRefs.length, 'subtle'))
    card.appendChild(actions)
    return card
  }

  function renderStoryEvent(eventId: string): HTMLElement {
    const event = storyConstellations.events[eventId]
    const card = document.createElement('article')
    card.className = 'dg-story-card'
    card.dataset.storyEventId = eventId
    if (!event) return card
    const heading = document.createElement('h4'); heading.className = 'dg-story-title'; heading.textContent = event.title
    heading.tabIndex = -1
    card.append(heading, storyText(event.summary), button('Close Detail', () => { selectedStoryEventId = ''; renderPanel() }, false, 'subtle'))
    const manage = document.createElement('details'); manage.className = 'dg-story-card dg-story-manage'
    const manageHeading = document.createElement('summary'); manageHeading.textContent = 'Edit Constellation'; manage.appendChild(manageHeading)
    const identities = document.createElement('div'); identities.className = 'dg-story-stack'
    const images = storyImages(event)
    if (images[0]) card.appendChild(storyImage(images[0], event.title))
    const nodes = document.createElement('div'); nodes.className = 'dg-story-constellation'
    const lines = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    lines.setAttribute('viewBox', '0 0 100 100'); lines.setAttribute('preserveAspectRatio', 'none'); lines.setAttribute('aria-hidden', 'true'); lines.setAttribute('class', 'dg-story-lines')
    const center = document.createElement('div'); center.className = 'dg-story-center'; center.textContent = `✧ ${event.title}`
    const actorNodes: HTMLElement[] = []
    const upperCount = Math.ceil(event.participants.length / 2)
    for (const participant of event.participants) {
      const actor = storyConstellations.actors[participant.actorId]
      const name = actor?.displayName || 'Unresolved character'
      const node = document.createElement('div'); node.className = 'dg-story-actor'
      node.dataset.storyActorId = participant.actorId
      const initial = document.createElement('span'); initial.className = 'dg-story-initial'; initial.textContent = Array.from(name)[0] || '?'; initial.setAttribute('aria-hidden', 'true'); node.appendChild(initial)
      const actorName = document.createElement('strong'); actorName.textContent = `${name} · ${participant.role}`; node.appendChild(actorName)
      const knowledgeEdge = storyConstellations.knowledgeEdges[`${eventId}:${participant.actorId}`]
      const beliefState = knowledgeEdge?.beliefState || 'unknown'
      const link = document.createElement('span'); link.className = 'dg-story-link'; link.textContent = `${beliefState} · ${knowledgeEdge?.acquisitionMode || 'acquisition unknown'}`; node.appendChild(link)
      const index = actorNodes.length
      const orbitIndex = index < upperCount ? index : index - upperCount
      const orbitSize = index < upperCount ? upperCount : event.participants.length - upperCount
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line')
      const orbitRow = Math.floor(orbitIndex / 2)
      const orbitX = orbitSize === 1 || (orbitSize % 2 === 1 && orbitIndex === orbitSize - 1) ? 50 : orbitIndex % 2 === 0 ? 25 : 75
      const orbitY = index < upperCount ? orbitSize > 2 ? orbitRow === 0 ? 11 : 30 : 22 : orbitSize > 2 ? orbitRow === 0 ? 70 : 89 : 78
      line.setAttribute('x1', '50'); line.setAttribute('y1', '50'); line.setAttribute('x2', String(orbitX)); line.setAttribute('y2', String(orbitY)); line.dataset.belief = beliefState
      lines.appendChild(line)
      line.dataset.storyActorId = participant.actorId
      if (actor?.kind === 'temporary') node.appendChild(storyText('Unresolved identity', 'dg-story-link'))
      if (actor && !actor.mergedIntoActorId) {
        const identityRow = document.createElement('div'); identityRow.className = 'dg-story-card'
        identityRow.appendChild(storyText(name, 'dg-story-title'))
        const kind = document.createElement('select'); kind.className = 'dg-select'; kind.setAttribute('aria-label', `${name} identity type`)
        for (const value of ['temporary', 'character', 'persona', 'npc', 'audience'] as const) {
          const option = document.createElement('option'); option.value = value; option.textContent = value === 'temporary' ? 'Unresolved / temporary' : value; option.selected = actor.kind === value; kind.appendChild(option)
        }
        kind.addEventListener('change', () => {
          const identityKind = kind.value as 'character' | 'persona' | 'npc' | 'audience' | 'temporary'
          if (identityKind === 'character' || identityKind === 'persona') {
            kind.value = actor.kind
            openStoryEdit({title:`Link ${name}`,description:`Classify as ${identityKind}. A Lumiverse ID is optional; leave blank to classify without linking.`,fields:[{label:'Lumiverse identity ID',value:identityKind==='character'?actor.lumiverseCharacterId||'':actor.lumiversePersonaId||'',maxLength:120}],save:([canonicalIdentityId])=>sendStoryAction('set-actor-kind',{actorId:actor.actorId,actorKind:identityKind,canonicalIdentityId})})
          } else sendStoryAction('set-actor-kind', { actorId: actor.actorId, actorKind: identityKind, canonicalIdentityId: '' })
        })
        identityRow.appendChild(kind)
        const merge = document.createElement('details'); merge.className = 'dg-story-merge'
        const mergeSummary = document.createElement('summary'); mergeSummary.textContent = 'Merge identity…'; merge.appendChild(mergeSummary)
        const target = document.createElement('select'); target.className = 'dg-select'; target.setAttribute('aria-label', `Merge ${name} into another story identity`)
        const blankTarget = document.createElement('option'); blankTarget.value = ''; blankTarget.textContent = 'Choose identity…'; target.appendChild(blankTarget)
        for (const other of Object.values(storyConstellations.actors).filter(value => !value.mergedIntoActorId && value.actorId !== actor.actorId)) {
          const option = document.createElement('option'); option.value = other.actorId; option.textContent = other.displayName; target.appendChild(option)
        }
        merge.append(target, button('Merge', () => {
          const chosen = storyConstellations.actors[target.value]
          if (chosen) openStoryEdit({title:'Merge Story Identities',description:`Merge ${name} into ${chosen.displayName}? Event, phone, and knowledge references will be reconciled.`,submit:'Merge Identities',danger:true,save:()=>sendStoryAction('merge-actors',{actorId:actor.actorId,mergeIntoActorId:chosen.actorId})})
        }, !Object.keys(storyConstellations.actors).some(id => id !== actor.actorId && !storyConstellations.actors[id].mergedIntoActorId), 'subtle'))
        identityRow.appendChild(merge)
        identities.appendChild(identityRow)
      }
      actorNodes.push(node)
    }
    const upper = document.createElement('div'); upper.className = 'dg-story-orbit'
    const lower = document.createElement('div'); lower.className = 'dg-story-orbit'
    upper.append(...actorNodes.slice(0, upperCount))
    lower.append(...actorNodes.slice(upperCount))
    nodes.append(lines, upper, center, lower)
    card.appendChild(nodes)
    manage.appendChild(panelSection('Character Identities', identities))
    const meta = document.createElement('div'); meta.className = 'dg-story-meta'
    for (const value of [event.storyTimeLabel || 'Time not specified', event.location || '', `Sources ${event.sourceRefs.length}`, `State ${event.sourceState}`].filter(Boolean)) {
      const pill = document.createElement('span'); pill.className = 'dg-story-pill'; pill.textContent = value; meta.appendChild(pill)
    }
    card.appendChild(meta)
    if (event.sourceWarning) {
      const warning = document.createElement('div'); warning.className = 'dg-warning'; warning.textContent = event.sourceWarning
      card.appendChild(warning)
      manage.appendChild(button('Resolve Source Warning', () => sendStoryAction('resolve-source-warning', { eventId }), false, 'subtle'))
    }
    const actions = document.createElement('div'); actions.className = 'dg-actions'
    const source = event.sourceRefs[0]
    actions.append(
      button('Go to Source', () => goToStorySource(source), !source, 'subtle'),
      button('Edit Constellation', () => { manage.open = !manage.open; if (manage.open) manage.scrollIntoView({block:'nearest'}) }, false, 'subtle'),
    )
    const duplicateSelect = document.createElement('select'); duplicateSelect.className = 'dg-select'
    const blank = document.createElement('option'); blank.value = ''; blank.textContent = 'Merge another confirmed event…'; duplicateSelect.appendChild(blank)
    for (const other of activeStoryEvents(storyConstellations).filter(candidate => candidate.eventId !== eventId)) {
      const option = document.createElement('option'); option.value = other.eventId; option.textContent = other.title; duplicateSelect.appendChild(option)
    }
    const mergeActions = document.createElement('div'); mergeActions.className = 'dg-actions'
    mergeActions.append(button('Mark Non-Canon', () => openStoryEdit({title:'Mark Event Non-Canon',description:'Its source and history will be retained, but it will leave active canon views.',submit:'Mark Non-Canon',danger:true,save:()=>sendStoryAction('mark-non-canon',{eventId})}), false, 'danger'), duplicateSelect, button('Merge', () => {
      const duplicateEventId = duplicateSelect.value
      if (duplicateEventId) openStoryEdit({title:'Merge Events',description:'Merge the selected event into this one? Source, Echo, knowledge, and Asset references are retained.',submit:'Merge Events',danger:true,save:()=>sendStoryAction('merge-events',{eventId,duplicateEventId})})
    }, false, 'subtle'))
    card.appendChild(actions)
    manage.appendChild(mergeActions)

    const assets = Object.values(assetLibrary.assets).filter(asset => asset.chatId === activeChatId && asset.status === 'available').slice(0, 60)
    const knowledge = document.createElement('div'); knowledge.className = 'dg-story-stack'
    for (const participant of event.participants) {
      const actor = storyConstellations.actors[participant.actorId]
      if (!actor) continue
      const row = document.createElement('div'); row.className = 'dg-actions'
      const label = document.createElement('span'); label.textContent = actor.displayName; row.appendChild(label)
      const edge = storyConstellations.knowledgeEdges[`${eventId}:${actor.actorId}`]
      const belief = document.createElement('select'); belief.setAttribute('aria-label', `${actor.displayName} knowledge of ${event.title}`)
      for (const value of ['unknown', 'unaware', 'rumor', 'suspects', 'knows', 'misinformed'] as StoryBeliefState[]) {
        const option = document.createElement('option'); option.value = value; option.textContent = value; option.selected = (edge?.beliefState || 'unknown') === value; belief.appendChild(option)
      }
      const acquisition = document.createElement('select'); acquisition.setAttribute('aria-label', `${actor.displayName} knowledge source`)
      for (const value of ['manual', 'involved', 'witnessed', 'told', 'evidence', 'inferred', 'public-broadcast']) {
        const option = document.createElement('option'); option.value = value; option.textContent = value; option.selected = (edge?.acquisitionMode || 'manual') === value; acquisition.appendChild(option)
      }
      row.append(belief, acquisition, button('Save', () => sendStoryAction('set-knowledge', { eventId, actorName: actor.displayName, beliefState: belief.value, acquisitionMode: acquisition.value }), false, 'subtle'))
      knowledge.appendChild(row)
    }
    manage.appendChild(panelSection('Knowledge Boundaries', knowledge))

    const echoes = document.createElement('div'); echoes.className = 'dg-story-stack'
    for (const echoId of event.echoIds) {
      const echo = storyConstellations.echoes[echoId]
      if (!echo) continue
      const row = document.createElement('div'); row.className = 'dg-story-card'
      row.append(storyText(`${echo.kind}${echo.channel ? ` · ${echo.channel}` : ''} · ${echo.linkState}`, 'dg-story-title'), storyText(echo.summary))
      const echoActions = document.createElement('div'); echoActions.className = 'dg-actions'
      echoActions.appendChild(button('Go to Source', () => goToStorySource(echo.sourceRef), false, 'subtle'))
      if (echo.assetId && assetLibrary.assets[echo.assetId]?.imageUrl) row.appendChild(storyImage(assetLibrary.assets[echo.assetId], echo.summary))
      const echoManage = document.createElement('details'); echoManage.className = 'dg-story-merge'
      const echoManageHeading = document.createElement('summary'); echoManageHeading.textContent = 'Manage Echo'; echoManage.appendChild(echoManageHeading)
      if (echo.linkState === 'proposed') echoActions.appendChild(button('Confirm Echo Link', () => sendStoryAction('link-echo', { echoId, eventId }), false, 'subtle'))
      echoActions.appendChild(button('Reject Echo', () => sendStoryAction('reject-echo', { echoId }), false, 'danger'))
      const echoAsset = document.createElement('select'); echoAsset.setAttribute('aria-label', `Asset for ${echo.kind} Echo`)
      const echoAssetBlank = document.createElement('option'); echoAssetBlank.value = ''; echoAssetBlank.textContent = 'Link an Asset…'; echoAsset.appendChild(echoAssetBlank)
      for (const asset of assets) { const option = document.createElement('option'); option.value = asset.assetId; option.textContent = asset.caption || asset.alt || asset.assetId; option.selected = asset.assetId === echo.assetId; echoAsset.appendChild(option) }
      echoActions.append(echoAsset, button(echo.assetId ? 'Update Echo Asset' : 'Link Echo Asset', () => echoAsset.value && sendStoryAction('link-echo-asset', { echoId, assetId: echoAsset.value }), false, 'subtle'))
      if (echo.assetId) echoActions.appendChild(button('Unlink Echo Asset', () => sendStoryAction('unlink-echo-asset', { echoId }), false, 'subtle'))
      // Keep source navigation visible; maintenance belongs in a disclosure.
      row.appendChild(echoActions.firstElementChild!)
      echoManage.appendChild(echoActions); row.appendChild(echoManage); echoes.appendChild(row)
    }
    card.appendChild(panelSection('Event Echoes', echoes.childNodes.length ? echoes : empty('No Echoes recorded.')))

    const assetPicker = document.createElement('select'); assetPicker.setAttribute('aria-label', 'Link existing Asset to this event')
    const noAsset = document.createElement('option'); noAsset.value = ''; noAsset.textContent = 'Link existing Asset…'; assetPicker.appendChild(noAsset)
    for (const asset of assets) { const option = document.createElement('option'); option.value = asset.assetId; option.textContent = asset.caption || asset.alt || asset.assetId; assetPicker.appendChild(option) }
    const assetArea = document.createElement('div'); assetArea.className = 'dg-actions'; assetArea.append(assetPicker, button('Link Asset', () => assetPicker.value && sendStoryAction('link-asset', { eventId, assetId: assetPicker.value }), false, 'subtle'))
    for (const assetId of event.linkedAssetIds) assetArea.appendChild(button(`Unlink ${assetId}`, () => sendStoryAction('unlink-asset', { eventId, assetId }), false, 'subtle'))
    const gallery = document.createElement('div'); gallery.className = 'dg-story-gallery'
    for (const asset of images) gallery.appendChild(storyImage(asset, asset.caption || asset.alt || event.title))
    card.appendChild(panelSection(`Linked Images (${images.length})`, images.length ? gallery : empty('No linked images yet. Link an existing image in Edit Constellation.')))
    manage.appendChild(panelSection('Linked Assets', assetArea))
    card.appendChild(manage)
    return card
  }

  function renderPhonePage(): HTMLElement {
    const box = document.createElement('div')
    const launch = document.createElement('div'); launch.className = 'dg-story-stack'
    const toggle=checkbox('Enable Reverie Phone',config?.phoneEnabled!==false,value=>patchConfig({phoneEnabled:value}));toggle.querySelector('input')?.setAttribute('aria-label','Enable Reverie Phone')
    launch.append(toggle,storyText('Optional phones live alongside the story, independently of Story features and chat Surfaces. Disabling Phone hides its widget and stops incoming-text instructions, new deliveries and phone generation. Saved messages, accounts and settings are preserved.'), button('Open Phone', () => phoneWidget ? phoneWidget.open() : showToast('error', 'This Lumiverse build does not expose floating widgets. Update Lumiverse to use the phone.'),config?.phoneEnabled===false))
    box.appendChild(panelSection('Reverie Phone', launch))
    if(phoneWidget){const settings=document.createElement('div');box.appendChild(panelSection('Phone Settings · this chat',settings));phoneWidget.mountSettings(settings)}
    const entries = visibleStoryPhoneEntries(storyConstellations)
    const stack = document.createElement('div'); stack.className = 'dg-story-stack'
    const grouped = new Map<string, StoryPhoneEntry[]>()
    for (const entry of entries) grouped.set(entry.ownerActorId, [...(grouped.get(entry.ownerActorId) || []), entry])
    if (!grouped.size) stack.appendChild(empty('No legacy phone records to display. Reverie Phone works in any saved character chat, with or without prior phone or app markup.'))
    for (const [ownerId, ownerEntries] of grouped) {
      const visibleLimit = storyPhoneVisibleByOwner.get(ownerId) || 40
      const visibleEntries = ownerEntries.slice(-visibleLimit)
      const ownerCard = document.createElement('section'); ownerCard.className = 'dg-story-card'
      const owner = document.createElement('h4'); owner.className = 'dg-story-title'; owner.textContent = ownerEntries[0].ownerName; ownerCard.appendChild(owner)
      for (const entry of visibleEntries) {
        const record = document.createElement('article'); record.className = 'dg-story-card'
        record.append(storyText(`${entry.app}${entry.storyTimeLabel ? ` · ${entry.storyTimeLabel}` : ''}`, 'dg-story-title'))
        if (entry.assetId && assetLibrary.assets[entry.assetId]?.imageUrl) {
          record.appendChild(storyImage(assetLibrary.assets[entry.assetId], entry.title))
        }
        record.appendChild(storyText(`${entry.title}${entry.body ? ` — ${entry.body}` : ''}`))
        if (entry.kind === 'photo') {
          const assets = Object.values(assetLibrary.assets).filter(asset => asset.chatId === activeChatId && asset.status === 'available').slice(0, 60)
          const picker = document.createElement('select'); picker.setAttribute('aria-label', `Asset for ${entry.title}`)
          const blank = document.createElement('option'); blank.value = ''; blank.textContent = entry.assetId ? 'Choose another Asset…' : 'Link an Asset…'; picker.appendChild(blank)
          for (const asset of assets) { const option = document.createElement('option'); option.value = asset.assetId; option.textContent = asset.caption || asset.alt || asset.assetId; option.selected = asset.assetId === entry.assetId; picker.appendChild(option) }
          const actions = document.createElement('div'); actions.className = 'dg-actions'
          actions.append(picker, button(entry.assetId ? 'Update Asset Link' : 'Link Asset', () => picker.value && sendStoryAction('link-phone-asset', { phoneEntryId: entry.entryId, assetId: picker.value }), false, 'subtle'))
          if (entry.assetId) actions.appendChild(button('Unlink Asset', () => sendStoryAction('unlink-phone-asset', { phoneEntryId: entry.entryId }), false, 'subtle'))
          record.appendChild(actions)
        }
        record.appendChild(button('Go to Source', () => goToStorySource(entry.sourceRef), false, 'subtle'))
        record.appendChild(button('Remove Record', () => openStoryEdit({title:'Remove Phone Record',description:'Remove this record from the Living Phone projection? The source chat message is unchanged.',submit:'Remove Record',danger:true,save:()=>sendStoryAction('remove-phone-entry',{phoneEntryId:entry.entryId})}), false, 'danger'))
        ownerCard.appendChild(record)
      }
      if (ownerEntries.length > visibleEntries.length) ownerCard.appendChild(button(`Load Earlier Records (${ownerEntries.length - visibleEntries.length} remaining)`, () => {
        storyPhoneVisibleByOwner.set(ownerId, visibleLimit + 40)
        renderPanel()
      }, false, 'subtle'))
      stack.appendChild(ownerCard)
    }
    const stale = Object.values(storyConstellations.phoneEntries).filter(entry => entry.sourceRef.sourceState !== 'active')
    if (stale.length) {
      const details = document.createElement('details'); details.className = 'dg-story-card'
      const summary = document.createElement('summary'); summary.textContent = `Inactive source records (${stale.length})`; details.appendChild(summary)
      for (const entry of stale.slice(-30)) details.appendChild(storyText(`${entry.ownerName} · ${entry.app} · ${entry.sourceRef.sourceState}: ${entry.title}`))
      stack.appendChild(details)
    }
    const archive = document.createElement('details'); archive.className = 'dg-story-card'
    const summary = document.createElement('summary'); summary.textContent = 'Legacy snapshot records · advanced management'; archive.append(summary, stack)
    box.appendChild(archive)
    return box
  }

  function renderStoryReel(): HTMLElement {
    const box = document.createElement('div')
    const stack = document.createElement('div'); stack.className = 'dg-story-stack'
    const items = projectStoryReel(storyConstellations)
    if (!items.length) stack.appendChild(empty('The Story Reel is derived from confirmed, active-swipe events. Proposed, non-canon, and inactive-swipe events stay out.'))
    for (const item of items) {
      const card = document.createElement('article'); card.className = 'dg-story-card'
      if (item.chapterLabel || item.pinned) {
        const meta = document.createElement('div'); meta.className = 'dg-story-meta'
        for (const label of [item.chapterLabel || '', item.pinned ? 'Pinned' : ''].filter(Boolean)) {
          const pill = document.createElement('span'); pill.className = 'dg-story-pill'; pill.textContent = label; meta.appendChild(pill)
        }
        card.appendChild(meta)
      }
      const title = document.createElement('h4'); title.className = 'dg-story-title'; title.textContent = item.title
      title.tabIndex = 0
      title.addEventListener('click', () => { selectedStoryEventId = item.eventId; pendingStoryEventNavigation = item.eventId; activeTab = 'story-constellations'; renderPanel() })
      title.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); selectedStoryEventId = item.eventId; pendingStoryEventNavigation = item.eventId; activeTab = 'story-constellations'; renderPanel() } })
      card.appendChild(title)
      const event = storyConstellations.events[item.eventId]
      const images = storyImages(event)
      if (images[0]) card.appendChild(storyImage(images[0], item.title))
      card.appendChild(storyText(`${item.echoIds.length} Echoes · ${images.length} linked images`, 'dg-story-meta'))
      card.append(storyText(item.caption), storyText([item.storyTimeLabel, item.location, item.participantNames.join(', ')].filter(Boolean).join(' · '), 'dg-story-meta'))
      if (item.sourceWarning) card.appendChild(storyText(item.sourceWarning))
      const actions = document.createElement('div'); actions.className = 'dg-actions'
      actions.append(
        button('Open Constellation', () => { selectedStoryEventId = item.eventId; pendingStoryEventNavigation = item.eventId; activeTab = 'story-constellations'; renderPanel() }, false, 'primary'),
        button('Go to Source', () => goToStorySource(event.sourceRefs[0]), !event.sourceRefs.length, 'subtle'),
        button(item.pinned ? 'Unpin' : 'Pin', () => sendStoryAction('set-reel-override', { eventId: item.eventId, pinned: !item.pinned }), false, 'subtle'),
        button('Edit Caption', () => openStoryEdit({title:'Edit Reel Caption',fields:[{label:'Reel caption',value:item.caption,maxLength:600}],save:([captionOverride])=>sendStoryAction('set-reel-override',{eventId:item.eventId,captionOverride})}), false, 'subtle'),
        button('Chapter', () => openStoryEdit({title:'Edit Reel Chapter',fields:[{label:'Chapter label',value:item.chapterLabel||'',maxLength:100}],save:([chapterLabelOverride])=>sendStoryAction('set-reel-override',{eventId:item.eventId,chapterLabelOverride})}), false, 'subtle'),
        button('Hide', () => sendStoryAction('set-reel-override', { eventId: item.eventId, hidden: true }), false, 'danger'),
      )
      card.appendChild(actions)
      const echoDetails = document.createElement('details'); echoDetails.className = 'dg-story-card'
      const summary = document.createElement('summary'); summary.textContent = `Echoes (${item.echoIds.length})`; echoDetails.appendChild(summary)
      for (const echoId of item.echoIds) { const echo = storyConstellations.echoes[echoId]; if (echo) echoDetails.append(storyText(`${echo.kind} · ${echo.summary}`), button('Go to Source', () => goToStorySource(echo.sourceRef), false, 'subtle')) }
      card.appendChild(echoDetails)
      stack.appendChild(card)
    }
    const hidden = Object.values(storyConstellations.reelOverrides).filter(override => override.hidden && storyConstellations.events[override.eventId]?.canonState === 'confirmed')
    if (hidden.length) {
      const hiddenSection = document.createElement('section'); hiddenSection.className = 'dg-story-card'
      const heading = document.createElement('h4'); heading.className = 'dg-story-title'; heading.textContent = `Hidden Reel cards (${hidden.length})`; hiddenSection.appendChild(heading)
      for (const override of hidden) { const event = storyConstellations.events[override.eventId]; hiddenSection.append(storyText(event.title), button('Restore', () => sendStoryAction('set-reel-override', { eventId: event.eventId, hidden: false }), false, 'subtle')) }
      stack.appendChild(hiddenSection)
    }
    box.appendChild(panelSection('Story Reel', stack))
    return box
  }

  function renderStoryView(): HTMLElement {
    const box = document.createElement('div')
    if (activeTab === 'story-reel') { box.appendChild(renderStoryReel()); return box }
    const settings = document.createElement('details'); settings.className = 'dg-story-card dg-story-manage'
    const settingsSummary = document.createElement('summary'); settingsSummary.textContent = 'Story Settings & Backfill'
    settings.open = storySettingsExpanded || !activeStoryEvents(storyConstellations).length
    settings.addEventListener('toggle', () => { storySettingsExpanded = settings.open })
    settings.append(settingsSummary, renderStorySettingsAndBackfill()); box.appendChild(settings)
    const proposals = Object.values(storyConstellations.proposals).filter(proposal => proposal.status === 'proposed' && proposal.sourceRef.sourceState !== 'deleted').sort((a, b) => b.createdAt - a.createdAt)
    const proposalStack = document.createElement('div'); proposalStack.className = 'dg-story-stack'
    if (!proposals.length) proposalStack.appendChild(empty('No pending Event proposals. Meaningful changes appear here for review.'))
    else for (const proposal of proposals.slice(0, storyProposalVisibleLimit)) proposalStack.appendChild(renderStoryProposal(proposal))
    if (proposals.length > storyProposalVisibleLimit) proposalStack.appendChild(button(`Show Older Proposals (${proposals.length - storyProposalVisibleLimit} remaining)`, () => { storyProposalVisibleLimit += 80; renderPanel() }, false, 'subtle'))
    box.appendChild(panelSection(`Proposals (${proposals.length})`, proposalStack))
    const events = activeStoryEvents(storyConstellations).sort((a, b) => b.updatedAt - a.updatedAt)
    const eventStack = document.createElement('div'); eventStack.className = 'dg-story-stack'
    if (!events.length) eventStack.appendChild(empty('No confirmed active-swipe events yet.'))
    const visibleEvents = events.slice(0, storyEventVisibleLimit)
    for (const event of visibleEvents) {
      const card = renderStoryEventSummary(event)
      if (event.eventId === selectedStoryEventId) card.classList.add('dg-story-selected')
      eventStack.appendChild(card)
    }
    if (events.length > storyEventVisibleLimit) eventStack.appendChild(button(`Show Older Events (${events.length - storyEventVisibleLimit} remaining)`, () => { storyEventVisibleLimit += 80; renderPanel() }, false, 'subtle'))
    box.appendChild(panelSection(`Confirmed Events (${events.length})`, eventStack))
    const conflicts = Object.values(storyConstellations.conflicts).filter(conflict => conflict.status === 'open')
    if (config?.storyKnowledgeConflictAlerts && conflicts.length) {
      const conflictStack = document.createElement('div'); conflictStack.className = 'dg-story-stack'
      for (const conflict of conflicts.slice(0, 30)) {
        const row = document.createElement('div'); row.className = 'dg-story-card'
        row.appendChild(storyText(`${conflict.severity.toUpperCase()} · ${conflict.summary}`))
        const resolution = document.createElement('select'); resolution.setAttribute('aria-label', 'Resolve knowledge conflict')
        const relatedEvent = storyConstellations.events[conflict.eventId]
        const confirmedEchoes = (relatedEvent?.echoIds || []).map(echoId => storyConstellations.echoes[echoId]).filter(echo => echo?.linkState === 'confirmed' && echo.sourceRef.sourceState === 'active')
        for (const [value, label] of [['learned-offscreen', 'Accept — learned off-screen'], ['linked-existing-echo', 'Link existing Echo'], ['kept-existing-state', 'Keep existing state'], ['model-mistake', 'Mark as model mistake'], ['manual', 'Set knows manually']]) {
          const option = document.createElement('option'); option.value = value; option.textContent = label
          if (value === 'linked-existing-echo' && !confirmedEchoes.length) option.disabled = true
          resolution.appendChild(option)
        }
        const echoPicker = document.createElement('select'); echoPicker.setAttribute('aria-label', 'Confirmed Echo that explains character knowledge')
        const echoPlaceholder = document.createElement('option'); echoPlaceholder.value = ''; echoPlaceholder.textContent = confirmedEchoes.length ? 'Choose confirmed Echo…' : 'No confirmed Echo available'; echoPicker.appendChild(echoPlaceholder)
        for (const echo of confirmedEchoes) { const option = document.createElement('option'); option.value = echo.echoId; option.textContent = `${echo.kind}${echo.channel ? ` · ${echo.channel}` : ''}: ${echo.summary}`; echoPicker.appendChild(option) }
        echoPicker.disabled = resolution.value !== 'linked-existing-echo'
        resolution.addEventListener('change', () => { echoPicker.disabled = resolution.value !== 'linked-existing-echo' })
        row.append(resolution, echoPicker, button('Resolve', () => sendStoryAction('resolve-conflict', {
          conflictId: conflict.conflictId, resolution: resolution.value,
          echoId: resolution.value === 'linked-existing-echo' ? echoPicker.value : undefined,
        }), false, 'subtle'))
        conflictStack.appendChild(row)
      }
      box.appendChild(panelSection(`Knowledge Conflicts (${conflicts.length})`, conflictStack))
    }
    if (selectedStoryEventId && storyConstellations.events[selectedStoryEventId]) {
      const selected = renderStoryEvent(selectedStoryEventId)
      selected.classList.add('dg-story-selected')
      box.prepend(panelSection('Selected Event', selected))
    }
    if (pendingStoryEventNavigation && pendingStoryEventNavigation === selectedStoryEventId) {
      const navigationId = pendingStoryEventNavigation
      const target = Array.from(box.querySelectorAll<HTMLElement>('[data-story-event-id]')).find(node => node.dataset.storyEventId === navigationId)
      if (target) window.requestAnimationFrame(() => {
        if (!target.isConnected) return
        target.scrollIntoView({ block: 'center', behavior: 'smooth' })
        target.querySelector<HTMLElement>('.dg-story-title')?.focus({ preventScroll: true })
        pendingStoryEventNavigation = ''
      })
    }
    return box
  }

  function renderPanel(): void {
    lifecycle.activateView(activeTab)
    const focused = document.activeElement
    const editing = focused instanceof HTMLElement
      && tab.root.contains(focused)
      && shouldDeferPanelRenderForControl(focused)
    if (editing) {
      if (deferredPanelRenderElement !== focused) {
        deferredPanelRenderElement = focused
        focused.addEventListener('blur', () => {
          if (deferredPanelRenderElement === focused) deferredPanelRenderElement = null
          window.requestAnimationFrame(() => renderPanel())
        }, { once: true })
      }
      return
    }
    deferredPanelRenderElement = null
    closeActiveHelpPopover?.()
    const previousTab = activeTab
    const previousScrollTop = tab.root.scrollTop
    panelScrollTopByTab.set(previousTab, previousScrollTop)
    applyGlobalInterfaceSettings()
    const root = document.createElement('div')
    root.className = 'dg-router-panel dg-suite-shell'
    root.appendChild(renderHeader())
    root.appendChild(renderTabs())
    if (activeTab === 'slots') root.appendChild(renderAdaptiveNextAction())
    if (activeTab === 'slots' && (lastRescanSummary || rescanInProgress)) root.appendChild(renderRescanResult())

    phoneWidget?.unmountSettings()
    const content = activeTab === 'phone' ? renderPhonePage()
      : activeTab === 'settings' ? renderSettings()
      : activeTab === 'illustrator' ? renderProseIllustrator()
        : activeTab === 'recipes' ? renderGenerationRecipes()
          : activeTab === 'genetics' ? renderGeneticVault()
            : activeTab === 'surfaces' ? renderCustomSurfaceStudio()
              : activeTab === 'surface-library' ? renderSurfaceLibrary()
                : activeTab === 'surface-presets' ? renderSurfacePresets()
                : activeTab === 'utility-studio' ? renderUtilityStudio()
                  : activeTab === 'history' ? renderHistoryList()
                : activeTab.startsWith('story-') ? renderStoryView()
                : activeTab === 'logs' ? renderLogs()
                  : activeTab === 'manual' ? renderManual()
                    : renderSlotsView()
    const stage = document.createElement('main')
    stage.className = 'dg-suite-stage'
    stage.appendChild(content)
    root.appendChild(stage)
    storyGraphCleanup?.()
    tab.root.replaceChildren(root)
    storyGraphCleanup = bindStoryGraphGeometry(root)
    tab.setBadge(records.length ? String(records.length) : null)
    const restoreScrollTop = panelScrollTopByTab.get(activeTab) ?? previousScrollTop
    requestAnimationFrame(() => { tab.root.scrollTop = restoreScrollTop })
  }


  function sidecarAnalysisInProgress(): { messageId?: string; swipeId?: number; startedAt: number } | null {
    if (!activeChatId) return null
    // Logs are historical evidence, not a live-work signal. A missing terminal
    // log used to resurrect the Orb on an unrelated user send, including after
    // Abort All. Only a currently active Relay analysis task may animate it.
    const active = Object.values(backgroundQueue.items || {})
      .filter(item => item.chatId === activeChatId
        && item.source === 'analysis'
        && !['completed', 'failed', 'cancelled'].includes(item.stage))
      .sort((a, b) => b.updatedAt - a.updatedAt)[0]
    return active
      ? { messageId: active.requestId, startedAt: active.startedAt || active.createdAt }
      : null
  }

  function renderSidecarAnalyzingIndicator(state: { messageId?: string; swipeId?: number; startedAt: number }): HTMLElement {
    const row = document.createElement('div')
    row.className = 'dg-sidecar-indicator'
    row.dataset.dgirSidecarElapsed = 'inline'
    updateSidecarElapsedText(row, state, 'Relay analyzing message')
    return row
  }

  function updateSidecarElapsedText(node: HTMLElement, state: { messageId?: string; swipeId?: number; startedAt: number }, label: string): void {
    const elapsed = Math.max(0, Math.round((Date.now() - state.startedAt) / 1000))
    const scope = `${state.messageId ? ` · ${state.messageId}` : ''}${state.swipeId !== undefined ? ` · swipe ${state.swipeId}` : ''}`
    const detail = `${label}${scope} · ${elapsed}s`
    const detailNode = node.querySelector<HTMLElement>('.dg-sidecar-global-detail')
    if (detailNode) detailNode.textContent = detail
    else node.textContent = detail
  }

  function renderSidecarGlobalNotice(): void {
    const state = sidecarAnalysisInProgress()
    if (!state) {
      sidecarNoticeEl?.remove()
      sidecarNoticeEl = null
      return
    }
    if (!sidecarNoticeEl) {
      sidecarNoticeEl = document.createElement('div')
      sidecarNoticeEl.className = 'dg-sidecar-global-notice'
      sidecarNoticeEl.setAttribute('role', 'status')
      sidecarNoticeEl.setAttribute('aria-live', 'polite')
      const dot = document.createElement('span'); dot.className = 'dg-sidecar-global-dot'
      const title = document.createElement('span'); title.className = 'dg-sidecar-global-title'; title.textContent = 'Extension'
      const separator = document.createElement('span'); separator.className = 'dg-sidecar-global-separator'; separator.textContent = '•'
      const detail = document.createElement('span'); detail.className = 'dg-sidecar-global-detail'
      const bar = document.createElement('span'); bar.className = 'dg-sidecar-global-bar'
      const fill = document.createElement('span'); fill.className = 'dg-sidecar-global-fill'; bar.appendChild(fill)
      sidecarNoticeEl.append(dot, title, separator, detail, bar)
      document.body.appendChild(sidecarNoticeEl)
    }
    updateSidecarElapsedText(sidecarNoticeEl, state, 'Relay is analyzing this message')
    for (const row of document.querySelectorAll<HTMLElement>('[data-dgir-sidecar-elapsed]')) {
      updateSidecarElapsedText(row, state, 'Relay analyzing message')
    }
  }

  function updateSidecarTicker(): void {
    if (!sidecarAnalysisInProgress()) {
      if (sidecarNoticeTimer) {
        clearInterval(sidecarNoticeTimer)
        sidecarNoticeTimer = 0
      }
      renderSidecarGlobalNotice()
      return
    }
    renderSidecarGlobalNotice()
    if (sidecarNoticeTimer) return
    sidecarNoticeTimer = window.setInterval(() => {
      if (!sidecarAnalysisInProgress()) {
        clearInterval(sidecarNoticeTimer)
        sidecarNoticeTimer = 0
        renderSidecarGlobalNotice()
        renderRelayOrb()
        return
      }
      renderSidecarGlobalNotice()
      renderRelayOrb()

    }, 1000)
  }

  function renderRelayOrb(): void {
    const enabled = Boolean(config?.enableRelayOrb && activeChatId)
    if (!enabled) {
      relayOrbCleanup?.()
      relayOrbCleanup = null
      relayOrb = null
      lifecycle.setOrbMounted(false)
      return
    }
    if (!relayOrb) {
      // Lumiverse can mount the same extension through separate JS realms that
      // share one document. Retire any orphaned DOM owner before mounting this
      // runtime's singleton; the document runtime handshake above owns full
      // listener/interceptor teardown for cooperative prior instances.
      for (const stale of Array.from(document.querySelectorAll<HTMLElement>('.dg-relay-orb'))) stale.remove()
      const orb = document.createElement('button')
      orb.type = 'button'
      orb.className = 'dg-relay-orb'
      orb.dataset.reverieRelayOrbOwner = documentRuntimeOwnerId
      orb.innerHTML = '<span class="dg-relay-orb-mark" aria-hidden="true">R&sup3;</span><span class="dg-relay-orb-icon" aria-hidden="true"></span><span class="dg-relay-orb-badge" hidden></span><span class="dg-relay-orb-status" aria-live="polite"></span>'
      orb.setAttribute('aria-label', 'Reparse and regenerate image slots in the latest message')
      orb.title = 'Relay Orb: generate replacement candidates'
      const start = { x: 0, y: 0, left: 0, top: 0 }
      let pointerId = -1
      let dragging = false
      let moved = false
      const cancelHold = () => {
        clearTimeout(relayOrbLongPressTimer)
        relayOrbLongPressTimer = 0
      }
      const onDown = (event: PointerEvent) => {
        if (event.button !== 0 && event.pointerType === 'mouse') return
        event.preventDefault()
        const rect = orb.getBoundingClientRect()
        pointerId = event.pointerId
        start.x = event.clientX
        start.y = event.clientY
        const viewport = orbViewportSize()
        start.left = (Number.parseFloat(orb.style.left) || rect.left) - viewport.offsetLeft
        start.top = (Number.parseFloat(orb.style.top) || rect.top) - viewport.offsetTop
        dragging = false
        moved = false
        relayOrbIsDragging = false
        orb.setPointerCapture?.(event.pointerId)
        cancelHold()
        relayOrbLongPressTriggered = false
        relayOrbLongPressTimer = window.setTimeout(() => {
          if (moved || dragging) return
          relayOrbLongPressTriggered = true
          openOrbScanMenu(start.x, start.y)
        }, 520)
      }
      const onMove = (event: PointerEvent) => {
        if (pointerId !== event.pointerId) return
        const dx = event.clientX - start.x
        const dy = event.clientY - start.y
        if (!dragging && Math.hypot(dx, dy) > 10) {
          dragging = true
          moved = true
          relayOrbIsDragging = true
          cancelHold()
          orb.classList.add('dg-relay-orb-dragging')
        }
        if (!dragging) return
        event.preventDefault()
        setOrbPixelPosition(start.left + dx, start.top + dy)
      }
      const onUp = (event: PointerEvent) => {
        cancelHold()
        if (pointerId === event.pointerId) {
          orb.releasePointerCapture?.(event.pointerId)
          pointerId = -1
        }
        if (dragging) {
          persistOrbPosition()
          window.setTimeout(() => { moved = false }, 0)
        }
        dragging = false
        relayOrbIsDragging = false
        orb.classList.remove('dg-relay-orb-dragging')
      }
      const onClick = (event: MouseEvent) => {
        if (moved || relayOrbLongPressTriggered) {
          event.preventDefault()
          event.stopImmediatePropagation()
          relayOrbLongPressTriggered = false
          moved = false
          return
        }
        void scanFromOrb()
      }
      const onContext = (event: MouseEvent) => {
        event.preventDefault()
        event.stopImmediatePropagation()
        cancelHold()
        relayOrbLongPressTriggered = false
        openOrbScanMenu(event.clientX, event.clientY)
      }
      const onKeyDown = (event: KeyboardEvent) => {
        if (event.key !== 'ContextMenu' && !(event.shiftKey && event.key === 'F10')) return
        event.preventDefault()
        event.stopImmediatePropagation()
        cancelHold()
        relayOrbLongPressTriggered = false
        const rect = orb.getBoundingClientRect()
        openOrbScanMenu(rect.left + rect.width / 2, rect.top + rect.height / 2)
      }
      const onResize = () => { if (!relayOrbIsDragging) applyOrbPosition() }
      orb.addEventListener('pointerdown', onDown)
      orb.addEventListener('pointermove', onMove)
      orb.addEventListener('pointerup', onUp)
      orb.addEventListener('pointercancel', onUp)
      orb.addEventListener('click', onClick)
      orb.addEventListener('contextmenu', onContext)
      orb.addEventListener('keydown', onKeyDown)
      window.addEventListener('resize', onResize)
      document.body.appendChild(orb)
      relayOrb = orb
      lifecycle.setOrbMounted(true)
      relayOrbCleanup = () => {
        relayOrbIsDragging = false
        cancelHold()
        orb.removeEventListener('pointerdown', onDown)
        orb.removeEventListener('pointermove', onMove)
        orb.removeEventListener('pointerup', onUp)
        orb.removeEventListener('pointercancel', onUp)
        orb.removeEventListener('click', onClick)
        orb.removeEventListener('contextmenu', onContext)
        orb.removeEventListener('keydown', onKeyDown)
        window.removeEventListener('resize', onResize)
        if (orb.dataset.reverieRelayOrbOwner === documentRuntimeOwnerId) orb.remove()
      }
    }
    // Placement-pending is user work, not Relay work. It must not keep the Orb
    // spinning or wake it again when an unrelated message is sent.
    const busy = candidateBatches.some(batch => batch.chatId === activeChatId && batch.status === 'processing') || records.some(record => isGenerationActiveStatus(record.status))
    const scanning = rescanInProgress
    const sidecarAnalyzing = sidecarAnalysisInProgress()
    const ready = candidateBatches.reduce((sum, batch) => sum + (batch.chatId === activeChatId && batch.status === 'review' ? batch.candidates.filter(candidate => candidate.status === 'ready').length : 0), 0)
    const failed = records.some(record => record.status === 'failed')
    relayOrbStatus = scanning ? 'scanning' : busy ? 'generating' : sidecarAnalyzing ? 'analyzing' : ready ? 'ready' : failed ? 'failed' : records.length ? 'idle' : 'empty'
    relayOrb.disabled = false
    relayOrb.setAttribute('aria-disabled', 'false')
    relayOrb.setAttribute('aria-busy', String(scanning || busy || Boolean(sidecarAnalyzing)))
    const design = config?.orbDesign || 'classic'
    const imageIcon = imageOrbDesignUrl(design)
    relayOrb.style.setProperty('--dg-relay-orb-icon', imageIcon ? `url("${imageIcon}")` : 'none')
    relayOrb.className = `dg-relay-orb dg-relay-orb-${relayOrbStatus} dg-relay-orb-size-${config?.orbSize || 'medium'} dg-relay-orb-design-${design}${imageIcon ? ' dg-relay-orb-image-design' : ''}${document.querySelector('.dg-modal-host') ? ' dg-relay-orb-modal-suppressed' : ''}`
    const badge = relayOrb.querySelector<HTMLElement>('.dg-relay-orb-badge')
    if (badge) {
      const label = scanning ? '…' : busy ? generatingBadgeText() : sidecarAnalyzing ? '…' : ready ? String(ready) : ''
      badge.hidden = !label
      badge.textContent = label
    }
    const status = relayOrb.querySelector<HTMLElement>('.dg-relay-orb-status')
    if (status) status.textContent = relayOrbStatusLabel(relayOrbStatus, ready)
    relayOrb.title = scanning ? 'Scanning the active chat' : busy ? 'Generating Relay candidates' : sidecarAnalyzing ? 'Relay analyzing message' : ready ? `${ready} Relay candidates awaiting review` : 'Tap to scan the active chat'
    if (!relayOrbIsDragging) applyOrbPosition()
  }

  async function startRelayBatchFromOrb(): Promise<void> {
    if (!activeChatId) return
    if (candidateBatches.some(batch => batch.chatId === activeChatId && batch.status === 'processing')) {
      relayOrbStatus = 'generating'
      renderRelayOrb()
      return
    }
    relayOrbStatus = 'scanning'
    renderRelayOrb()
    const snapshot = await syncNativeSettings()
    ctx.sendToBackend({ type: 'relay_batch_start', chatId: activeChatId, candidateCount: config?.defaultCandidateCount || 1, nativeImageSettings: snapshot?.settings as any, nativeSettingsCapturedAt: snapshot?.capturedAt })
  }

  function resetRelayOrbInteractivity(): void {
    relayOrbStatus = 'idle'
    relayOrbIsDragging = false
    relayOrbLongPressTriggered = false
    clearTimeout(relayOrbLongPressTimer)
    relayOrbLongPressTimer = 0
    if (!relayOrb) return
    relayOrb.disabled = false
    relayOrb.style.pointerEvents = ''
    relayOrb.removeAttribute('disabled')
    relayOrb.setAttribute('aria-disabled', 'false')
    relayOrb.setAttribute('aria-busy', 'false')
  }

  async function scanFromOrb(): Promise<void> {
    if (!activeChatId || rescanInProgress) return
    lastStatus = 'Scanning the active chat…'
    rescanChat()
    renderRelayOrb()
  }

  async function reparseChatSlotsFromOrb(): Promise<void> {
    if (!activeChatId) return
    relayOrbStatus = 'scanning'
    lastStatus = 'Reparsing Relay slots…'
    renderRelayOrb()
    renderPanel()
    const snapshot = await syncNativeSettings()
    ctx.sendToBackend({ type: 'reparse_chat_slots', chatId: activeChatId, nativeImageSettings: snapshot?.settings, nativeSettingsCapturedAt: snapshot?.capturedAt })
  }

  function openOrbScanMenu(x: number, y: number): void {
    closeActionMenu()
    const menu = document.createElement('div')
    menu.className = 'dg-router-panel dg-menu'
    const actions: Array<[string, () => void, boolean, string?]> = [
      ['Scan Relay Slots', rescanChat, !activeChatId || rescanInProgress],
      ['Reparse Slots', () => void reparseChatSlotsFromOrb(), !activeChatId],
      ['Generate Replacement Candidates', () => void startRelayBatchFromOrb(), !activeChatId],
      ['Open Surface Registry', () => { activeTab = 'surfaces'; tab.activate(); renderPanel() }, false],
      ['Open Reverie Relay', () => { tab.activate(); const storedTab = validDrawerTab(config?.lastActiveDrawerTab) || activeTab || 'slots'; activeTab = storedTab; renderPanel(); window.setTimeout(() => { tab.activate(); activeTab = storedTab; renderPanel() }, 80) }, false],
    ]
    for (const [label, action, disabled, tooltip] of actions) {
      const item = button(label, () => { closeActionMenu(); action() }, disabled, 'standard', tooltip || '')
      menu.appendChild(item)
    }
    document.body.appendChild(menu)
    document.body.classList.add('dg-relay-menu-open')
    menuEl = menu
    attachMenuDismissHandlers(menu)
    menu.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus({ preventScroll: true })
    const rect = menu.getBoundingClientRect()
    const left = Math.max(8, Math.min(window.innerWidth - rect.width - 8, x))
    const top = Math.max(8, Math.min(window.innerHeight - rect.height - 8, y))
    menu.style.left = `${left}px`
    menu.style.top = `${top}px`
  }

  function isCompactViewport(): boolean {
    return window.matchMedia('(max-width: 640px), (pointer: coarse)').matches
  }

  function currentOrbPosition(): { x: number; y: number } {
    return isCompactViewport() ? config?.orbPositionMobile || { x: 0.86, y: 0.78 } : config?.orbPositionDesktop || { x: 0.86, y: 0.78 }
  }

  function imageOrbDesignUrl(design: RouterConfig['orbDesign'] | string): string {
    if (design === 'custom') return config?.orbCustomIconDataUrl || ''
    return ORB_IMAGE_DESIGN_URLS[design as OrbImageDesignId] || ''
  }

  function streamStatusText(message: Extract<BackendMessage, { type: 'image_generation_stream' }>): string {
    const progress = message.totalSteps ? `${message.step ?? '?'} / ${message.totalSteps}` : message.step !== undefined ? `step ${message.step}` : ''
    const node = message.nodeId ? `node ${message.nodeId}` : ''
    return [message.statusText, progress, node].filter(Boolean).join(' / ')
  }

  async function imageUrlToDataUrl(imageUrl: string): Promise<string> {
    if (imageUrl.startsWith('data:')) return imageUrl
    const response = await fetch(imageUrl, { credentials: 'same-origin' })
    if (!response.ok) throw new Error(`Could not read image (${response.status}).`)
    const blob = await response.blob()
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onerror = () => reject(reader.error || new Error('Could not read image data.'))
      reader.onload = () => resolve(String(reader.result || ''))
      reader.readAsDataURL(blob)
    })
  }

  async function fileToDataUrl(file: File): Promise<string> {
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onerror = () => reject(reader.error || new Error('Could not read file.'))
      reader.onload = () => resolve(String(reader.result || ''))
      reader.readAsDataURL(file)
    })
  }

  function toastActionButton(label: string, title: string, action: () => void): HTMLButtonElement {
    const button = document.createElement('button')
    button.type = 'button'
    button.textContent = label
    button.title = title
    button.addEventListener('click', action)
    return button
  }

  function applyOrbPosition(): void {
    if (!relayOrb) return
    const pos = currentOrbPosition()
    const width = relayOrb.offsetWidth || 52
    const height = relayOrb.offsetHeight || 52
    const viewport = orbViewportSize()
    setOrbPixelPosition(pos.x * (viewport.width - width), pos.y * (viewport.height - height))
  }

  function setOrbPixelPosition(left: number, top: number): void {
    if (!relayOrb) return
    const width = relayOrb.offsetWidth || 52
    const height = relayOrb.offsetHeight || 52
    const viewport = orbViewportSize()
    const clampedLeft = Math.max(0, Math.min(Math.max(0, viewport.width - width), left))
    const clampedTop = Math.max(0, Math.min(Math.max(0, viewport.height - height), top))
    relayOrb.style.left = `${Math.round(clampedLeft + viewport.offsetLeft)}px`
    relayOrb.style.top = `${Math.round(clampedTop + viewport.offsetTop)}px`
    relayOrb.style.transform = ''
  }

  function persistOrbPosition(): void {
    if (!relayOrb || !config) return
    const viewport = orbViewportSize()
    const width = relayOrb.offsetWidth || 52
    const height = relayOrb.offsetHeight || 52
    const left = (Number.parseFloat(relayOrb.style.left) || relayOrb.getBoundingClientRect().left) - viewport.offsetLeft
    const top = (Number.parseFloat(relayOrb.style.top) || relayOrb.getBoundingClientRect().top) - viewport.offsetTop
    const x = Math.max(0, Math.min(1, left / Math.max(1, viewport.width - width)))
    const y = Math.max(0, Math.min(1, top / Math.max(1, viewport.height - height)))
    if (isCompactViewport()) {
      config = { ...config, orbPositionMobile: { x, y } }
      patchConfig({ orbPositionMobile: { x, y } })
    } else {
      config = { ...config, orbPositionDesktop: { x, y } }
      patchConfig({ orbPositionDesktop: { x, y } })
    }
  }

  function orbViewportSize(): { width: number; height: number; offsetLeft: number; offsetTop: number } {
    const visual = window.visualViewport
    return {
      width: Math.max(1, visual?.width || window.innerWidth),
      height: Math.max(1, visual?.height || window.innerHeight),
      offsetLeft: visual?.offsetLeft || 0,
      offsetTop: visual?.offsetTop || 0,
    }
  }

  function resetOrbPosition(): void {
    const patch = isCompactViewport() ? { orbPositionMobile: { x: 0.86, y: 0.78 } } : { orbPositionDesktop: { x: 0.86, y: 0.78 } }
    if (config) config = { ...config, ...patch }
    patchConfig(patch)
    if (!relayOrbIsDragging) applyOrbPosition()
  }

  function generatingBadgeText(): string {
    const batch = candidateBatches.find(item => item.chatId === activeChatId && item.status === 'processing')
    if (!batch) return ''
    const done = batch.candidates.filter(candidate => ['ready', 'failed', 'unavailable', 'discarded', 'replaced'].includes(candidate.status)).length
    return `${done}/${batch.candidates.length}`
  }

  function relayOrbStatusLabel(status: typeof relayOrbStatus, ready: number): string {
    if (status === 'scanning') return 'Relay scanning for eligible image slots.'
    if (status === 'analyzing') return 'Relay is analyzing the message.'
    if (status === 'preparing') return 'Relay preparing candidates.'
    if (status === 'generating') return 'Relay generating candidates.'
    if (status === 'ready') return `${ready} Relay candidates are ready for review.`
    if (status === 'empty') return 'No eligible Relay slots found.'
    if (status === 'failed') return 'Some Relay slots failed.'
    if (status === 'canceled') return 'Relay generation was canceled.'
    return 'Relay idle.'
  }

  function openRelayCandidateReview(batch: RelayCandidateBatch): void {
    if (batch.status !== 'review') return
    const modal = ctx.ui.showModal({ title: 'Review Relay Candidates', width: 860, persistent: false })
    modal.root.classList.add('dg-router-panel', 'dg-modal-host')
    const body = document.createElement('div')
    body.className = 'dg-modal-body dg-relay-review'
    const description = document.createElement('div')
    description.className = 'dg-section-sub'
    description.textContent = 'Click the image you want for each beat, then use that selection. Each beat is independent; applying one choice does not wait for the rest of the batch.'
    const mode = document.createElement('div')
    mode.className = 'dg-slot-meta'
    mode.textContent = `Message ${batch.messageId} / swipe ${batch.swipeId} / ${batch.mode === 'high-res' ? 'High-Res' : 'Normal'} mode`
    const selectedBySlot = new Map<string, { kind: 'original' | 'candidate'; candidateKey?: string }>()
    const list = document.createElement('div')
    list.className = 'dg-modal-body'
    const cardsByKey = new Map<string, { card: HTMLElement; current: HTMLElement; next: HTMLElement; use: HTMLButtonElement }>()
    const paintSelections = () => {
      for (const candidate of batch.candidates) {
        const row = cardsByKey.get(candidate.candidateKey)
        if (!row) continue
        const selection = selectedBySlot.get(candidate.stableSlotKey)
        const currentSelected = selection?.kind === 'original'
        const candidateSelected = selection?.kind === 'candidate' && selection.candidateKey === candidate.candidateKey
        row.current.classList.toggle('dg-relay-image-choice-selected', currentSelected)
        row.next.classList.toggle('dg-relay-image-choice-selected', candidateSelected)
        row.card.classList.toggle('dg-relay-candidate-selected', candidateSelected || currentSelected)
        row.use.disabled = !selection || (selection.kind === 'candidate' && selection.candidateKey !== candidate.candidateKey) || candidate.status === 'replaced'
      }
    }
    const selectCandidate = (candidate: RelayCandidate) => {
      if (candidate.status !== 'ready') return
      selectedBySlot.set(candidate.stableSlotKey, { kind: 'candidate', candidateKey: candidate.candidateKey })
      paintSelections()
    }
    const selectOriginal = (candidate: RelayCandidate) => {
      if (!candidate.sourceImageUrl) return
      selectedBySlot.set(candidate.stableSlotKey, { kind: 'original' })
      paintSelections()
    }
    const useSelection = (candidate: RelayCandidate) => {
      const selection = selectedBySlot.get(candidate.stableSlotKey)
      if (!selection) { showToast('warning', 'Select the current image or the candidate image first.'); return }
      if (selection.kind === 'candidate') {
        const key = selection.candidateKey || candidate.candidateKey
        const pendingNotice = document.createElement('div')
        pendingNotice.className = 'dg-section-sub'
        pendingNotice.textContent = 'Applying selection...'
        controls.appendChild(pendingNotice)
        cancel.textContent = 'Waiting...'
        cancel.disabled = true
        discard.disabled = true
        for (const [, item] of cardsByKey) { item.use.disabled = true }
        ctx.sendToBackend({ type: 'relay_replace_selected', chatId: batch.chatId, batchId: batch.batchId, candidateKeys: [key] })
        modal.dismiss()
      } else {
        for (const item of batch.candidates.filter(row => row.stableSlotKey === candidate.stableSlotKey && !['replaced', 'discarded'].includes(row.status))) {
          ctx.sendToBackend({ type: 'relay_discard_candidate', chatId: batch.chatId, batchId: batch.batchId, candidateKey: item.candidateKey })
        }
        modal.dismiss()
      }
    }
    for (const candidate of batch.candidates) {
      const card = document.createElement('div')
      card.className = `dg-relay-candidate dg-relay-candidate-${candidate.status}${candidate.status === 'ready' ? ' dg-relay-candidate-selectable' : ''}`
      const head = document.createElement('div')
      head.className = 'dg-relay-candidate-head'
      const label = document.createElement('span')
      label.textContent = `${appLabel(candidate)} / ${slotLabel(candidate)} / candidate ${candidate.candidateNumber || 1} of ${candidate.candidateTotal || batch.candidateCount || 1} / ${candidate.requestId}`
      head.append(label, chip(candidate.status, candidate.status))
      card.appendChild(head)
      const current = document.createElement('div')
      current.className = `dg-relay-image-choice${candidate.sourceImageUrl ? ' dg-relay-image-choice-clickable' : ''}`
      const currentImg = document.createElement('img')
      currentImg.alt = `Current ${candidate.target} ${candidate.slot}`
      if (candidate.sourceImageUrl) currentImg.src = candidate.sourceImageUrl
      else current.textContent = 'No current image'
      if (candidate.sourceImageUrl) {
        current.title = 'Keep the current image for this beat'
        current.addEventListener('click', () => selectOriginal(candidate))
      }
      if (candidate.sourceImageUrl) current.appendChild(currentImg)
      const currentLabel = document.createElement('div'); currentLabel.className = 'dg-relay-candidate-label'; currentLabel.textContent = 'Current image'
      current.appendChild(currentLabel)
      const next = document.createElement('div')
      next.className = `dg-relay-image-choice${candidate.status === 'ready' ? ' dg-relay-image-choice-clickable' : ''}`
      const nextImg = document.createElement('img')
      nextImg.alt = `Candidate ${candidate.target} ${candidate.slot}`
      const stream = streamPreviews.get(candidate.stableSlotKey)
      if (candidate.candidateImageUrl) nextImg.src = candidate.candidateImageUrl
      else if (stream?.imageDataUrl) nextImg.src = stream.imageDataUrl
      else next.textContent = candidate.error || 'No candidate generated'
      if (candidate.status === 'ready') {
        next.title = 'Use this generated candidate for this beat'
        next.addEventListener('click', () => selectCandidate(candidate))
      }
      if (candidate.candidateImageUrl || stream?.imageDataUrl) next.appendChild(nextImg)
      const nextLabel = document.createElement('div'); nextLabel.className = 'dg-relay-candidate-label'; nextLabel.textContent = candidate.status === 'ready' ? 'Candidate image' : titleCase(candidate.status)
      next.appendChild(nextLabel)
      if (stream?.statusText && ['preflight', 'parsing', 'provider-waiting', 'generating'].includes(candidate.status)) {
        const streamStatus = document.createElement('div')
        streamStatus.className = 'dg-stream-status'
        streamStatus.textContent = stream.statusText
        next.appendChild(streamStatus)
      }
      card.append(current, next)
      const meta = document.createElement('div')
      meta.className = 'dg-relay-candidate-meta'
      meta.textContent = `${candidate.provider || 'Provider unavailable'} / ${candidate.model || 'Model unavailable'}${candidate.promptProfile ? `\nProfile: ${candidate.promptProfile.selectedProfileName}` : ''}${candidate.regenerationIntent ? `\nIntent: ${candidate.regenerationIntent.label}` : ''}${candidate.newlyParsedPrompt ? `\n${candidate.newlyParsedPrompt.slice(0, 220)}` : candidate.error ? `\n${candidate.error}` : ''}`
      card.appendChild(meta)
      const candidateActions = document.createElement('div')
      candidateActions.className = 'dg-actions'
      const useButton = button('Use Selection', () => useSelection(candidate), true, 'primary', 'Select the current image or candidate image first.')
      cardsByKey.set(candidate.candidateKey, { card, current, next, use: useButton })
      candidateActions.append(
        button('Reroll Candidate', async () => {
          const snapshot = await syncNativeSettings()
          ctx.sendToBackend({ type: 'relay_retry_candidate', chatId: batch.chatId, batchId: batch.batchId, candidateKey: candidate.candidateKey, nativeImageSettings: snapshot?.settings, nativeSettingsCapturedAt: snapshot?.capturedAt })
          modal.dismiss()
        }, ['preflight', 'parsing', 'provider-waiting', 'generating', 'replaced'].includes(candidate.status), 'subtle'),
        useButton,
      )
      card.appendChild(candidateActions)
      list.appendChild(card)
    }
    paintSelections()
    const controls = document.createElement('div')
    controls.className = 'dg-actions'
    const cancel = button('Close Without Changes', () => modal.dismiss(), false, 'subtle')
    const discard = button('Cancel Remaining', () => { ctx.sendToBackend({ type: 'relay_discard_batch', chatId: batch.chatId, batchId: batch.batchId }); modal.dismiss() }, false, 'danger')
    controls.append(cancel, discard)
    body.append(description, mode, list, controls)
    modal.root.appendChild(body)
  }

  function renderHeader(): HTMLElement {
    const counts = countStatuses()
    const recovered = records.filter(record => record.status === 'recovered-pending').length
    const retryableFailed = records.filter(record => record.status === 'failed' && canReparse(record)).length
    const activeWork = records.some(record => canAbortSlotStatus(record.status)) || candidateBatches.some(batch => batch.chatId === activeChatId && batch.status === 'processing')
    const head = document.createElement('header')
    head.className = 'dg-head dg-suite-head'
    const top = document.createElement('div')
    top.className = 'dg-head-top'
    const brand = document.createElement('div')
    brand.className = 'dg-brand'
    const prism = document.createElement('div')
    prism.className = 'dg-prism dg-prism-overview'
    prism.setAttribute('aria-hidden', 'true')
    const prismImage = document.createElement('img')
    prismImage.className = 'dg-prism-image'
    prismImage.src = REVERIE_RELAY_OVERVIEW_ICON_URL
    prismImage.alt = ''
    prism.appendChild(prismImage)
    const copy = document.createElement('div')
    copy.style.minWidth = '0'
    const titleLine = document.createElement('div')
    titleLine.className = 'dg-title-line'
    const title = document.createElement('div')
    title.className = 'dg-title'
    title.textContent = "Ria's Reverie Relay"
    const buildChip = document.createElement('span')
    buildChip.className = 'dg-build-chip'
    buildChip.textContent = `R³ · v${EXTENSION_VERSION}`
    const sub = document.createElement('div')
    sub.className = 'dg-sub'
    sub.textContent = activeChatId
      ? (lastStatus || 'Surface Suite · Prose Illustrator · Visual Memory')
      : 'Open a chat to route visual media.'
    titleLine.append(title, buildChip)
    copy.append(titleLine, sub)
    brand.append(prism, copy)

    const headerActions = document.createElement('div')
    headerActions.className = 'dg-actions dg-head-actions'
    if (recovered) headerActions.appendChild(button('Generate Recovered', () => void generateAllRecovered(), false, 'primary'))
    const reviewBatch = candidateBatches.find(batch => batch.chatId === activeChatId && batch.status === 'review')
    if (reviewBatch) headerActions.appendChild(button('Review Candidates', () => openRelayCandidateReview(reviewBatch), false, 'primary'))
    headerActions.append(
      button(rescanInProgress ? 'Scanning…' : 'Rescan', rescanChat, !activeChatId || rescanInProgress, 'subtle', 'Find semantic image requests missing from Relay state.'),
      button('Abort All', abortActiveGeneration, !activeChatId || !activeWork, 'danger', activeWork ? 'Cancel queued, waiting, and active Relay work.' : 'No active generation to abort.'),
      button('Retry Failed', () => activeChatId && ctx.sendToBackend({ type: 'retry_failed', chatId: activeChatId }), retryableFailed === 0, 'subtle', retryableFailed ? '' : 'No retryable failures.'),
    )
    top.append(brand, headerActions)

    const overviewTitle = document.createElement('div')
    overviewTitle.className = 'dg-overview-label'
    overviewTitle.textContent = 'Current Chat Overview'
    const summary = document.createElement('div')
    summary.className = 'dg-summary'
    summary.append(
      countBox('Generating', counts.processing, 'processing'),
      countBox('Ready', counts.readyToPlace, 'ready'),
      countBox('Failed', counts.failed, 'failed'),
      countBox('Completed', Math.max(counts.completed, completedHistoryChatId === activeChatId ? completedHistoryTotal : 0), 'completed'),
    )
    head.append(top, overviewTitle, summary)
    if (queueSafety.pausedBacklog && activeChatId) {
      const backlog = document.createElement('div')
      backlog.className = 'dg-card dg-warning-card'
      const copy = document.createElement('div')
      copy.className = 'dg-copy'
      const ageMinutes = Math.max(1, Math.round(queueSafety.oldestPendingAgeMs / 60_000))
      copy.textContent = `Pending from earlier session: ${queueSafety.uniquePendingJobs}\nOldest: ${ageMinutes}m\nRelay will not generate these without approval.`
      const actions = document.createElement('div')
      actions.className = 'dg-actions'
      actions.append(
        button('Review Pending', () => { activeTab = 'slots'; slotFilter = 'all'; renderPanel() }, false, 'subtle'),
        button('Generate All Pending', () => activeChatId && ctx.sendToBackend({ type: 'queue_action', chatId: activeChatId, action: 'generate_all_pending' }), false, 'primary'),
        button('Discard Pending', () => activeChatId && ctx.sendToBackend({ type: 'queue_action', chatId: activeChatId, action: 'discard_pending' }), false, 'danger'),
        button('Export Queue Diagnostic', () => activeChatId && ctx.sendToBackend({ type: 'export_queue_diagnostic', chatId: activeChatId }), false, 'subtle'),
      )
      backlog.append(copy, actions)
      head.appendChild(backlog)
    }
    return head
  }

  function suiteSectionForTab(value: DrawerTab): SuiteSection {
    if (value === 'illustrator' || value === 'recipes') return 'illustrator'
    if (value === 'surfaces' || value === 'surface-library' || value === 'surface-presets' || value === 'utility-studio') return 'surfaces'
    if (value === 'genetics') return 'memory'
    if (value === 'history') return 'archive'
    if (value === 'phone') return 'phone'
    if (value.startsWith('story-')) return 'story'
    if (value === 'settings' || value === 'manual' || value === 'logs') return 'settings'
    return 'relay'
  }

  function defaultTabForSuiteSection(section: SuiteSection): DrawerTab {
    return section === 'illustrator' ? 'illustrator'
      : section === 'surfaces' ? 'surface-library'
        : section === 'memory' ? 'genetics'
          : section === 'archive' ? 'history'
          : section === 'story' ? 'story-constellations'
            : section === 'phone' ? 'phone'
            : section === 'settings' ? 'settings'
              : 'slots'
  }

  function renderTabs(): HTMLElement {
    const shell = document.createElement('nav')
    shell.className = 'dg-suite-navigation'
    const primary = document.createElement('div')
    primary.className = 'dg-suite-primary'
    const currentSection = suiteSectionForTab(activeTab)
    const sections: Array<{ id: SuiteSection; icon: string; label: string }> = [
      { id: 'relay', icon: '⌁', label: 'Relay' },
      { id: 'illustrator', icon: '✧', label: 'Illustrations' },
      { id: 'surfaces', icon: '▧', label: 'Surfaces' },
      { id: 'memory', icon: '◇', label: 'Appearance' },
      { id: 'story', icon: '✺', label: 'Story' },
      { id: 'phone', icon: '▯', label: 'Phone' },
      { id: 'archive', icon: '▤', label: 'Archive' },
      { id: 'settings', icon: '⚙', label: 'Settings' },
    ]
    for (const section of sections) {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = `dg-suite-primary-tab${currentSection === section.id ? ' is-active' : ''}`
      btn.setAttribute('aria-selected', String(currentSection === section.id))
      const icon = document.createElement('span'); icon.className = 'dg-suite-primary-icon'; icon.textContent = section.icon
      const label = document.createElement('span'); label.textContent = section.label
      btn.append(icon, label)
      btn.addEventListener('click', () => {
        panelScrollTopByTab.set(activeTab, tab.root.scrollTop)
        activeTab = defaultTabForSuiteSection(section.id)
        if (config?.lastActiveDrawerTab !== activeTab) patchConfig({ lastActiveDrawerTab: activeTab })
        renderPanel()
      })
      primary.appendChild(btn)
    }
    shell.appendChild(primary)

    const secondaryMap: Record<SuiteSection, Array<[DrawerTab, string]>> = {
      relay: [['slots', 'Slots']],
      illustrator: [['illustrator', 'Illustrations'], ['recipes', 'Profiles']],
      surfaces: [['surface-library', 'Library'], ['surfaces', 'Creator'], ['surface-presets', 'Presets'], ['utility-studio', 'Injection']],
memory: [['genetics', 'Appearance Memory']],
      story: [['story-constellations', 'Constellations'], ['story-reel', 'Story Reel']],
      phone: [['phone', 'Phone & Settings']],
      archive: [['history', 'Images & Versions']],
      settings: [['settings', 'Configuration'], ['logs', 'Diagnostics'], ['manual', 'Guide']],
    }
    const secondary = document.createElement('div')
    secondary.className = 'dg-suite-secondary'
    for (const [id, label] of secondaryMap[currentSection]) {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = `dg-suite-secondary-tab${activeTab === id ? ' is-active' : ''}`
      btn.textContent = label
      btn.addEventListener('click', () => {
        panelScrollTopByTab.set(activeTab, tab.root.scrollTop)
        activeTab = id
        if (config?.lastActiveDrawerTab !== id) patchConfig({ lastActiveDrawerTab: id })
        renderPanel()
      })
      secondary.appendChild(btn)
    }
    shell.appendChild(secondary)
    return shell
  }


  function renderRecordList(list: SlotRecord[], emptyText: string): HTMLElement {
    const box = document.createElement('div')
    if (list.length === 0) {
      box.appendChild(empty(emptyText))
      if (activeTab === 'slots' && activeChatId) box.appendChild(button(rescanInProgress ? 'Scanning...' : 'Rescan Chat', rescanChat, rescanInProgress, 'subtle'))
    }
    else for (const record of list) box.appendChild(renderRecord(record))
    return box
  }
  function escapeHtml(value: string): string {
    return value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character] || character))
  }

  function formatEta(seconds: number): string {
    const safe = Math.max(0, Math.round(seconds))
    if (safe < 60) return `${safe}s`
    const minutes = Math.floor(safe / 60)
    const remainder = safe % 60
    return remainder ? `${minutes}m ${remainder}s` : `${minutes}m`
  }

  function renderAdaptiveNextAction(): HTMLElement {
    const content = document.createElement('div')
    content.className = 'dg-next-action'
    const title = document.createElement('strong')
    const copy = document.createElement('p')
    const actions = document.createElement('div')
    actions.className = 'dg-actions'
    const activeQueue = Object.values(backgroundQueue.items || {}).find(item => !['completed', 'failed', 'cancelled'].includes(item.stage))
    const failed = records.find(record => record.status === 'failed')
    const unsavedOutput = false

    if (!config?.imageConnectionId && !nativeImageSettingsCache.activeImageGenConnectionId) {
      title.textContent = 'Next: choose an image connection'
      copy.textContent = 'Relay cannot generate until a Lumiverse ImageGen connection is available.'
      actions.append(button('Open Settings', () => { activeTab = 'settings'; renderPanel() }, false, 'primary'))
    } else if (activeQueue) {
      title.textContent = `Working: ${activeQueue.statusText || titleCase(activeQueue.stage)}`
      copy.textContent = activeQueue.etaSeconds ? `Relay is handling this in the background. Estimated time remaining: ${formatEta(activeQueue.etaSeconds)}.` : 'Relay is handling this in the background. You can keep using the chat.'
      actions.append(button('Abort All', abortActiveGeneration, !activeChatId, 'danger'))
    } else if (failed) {
      title.textContent = 'Next: inspect the failed generation'
      copy.textContent = 'Relay found a failure and can explain the exact blocker before you retry.'
      actions.append(
        button('Why Didn’t This Generate?', () => ctx.sendToBackend({ type: 'explain_no_generation', chatId: failed.chatId, scope: 'slot', key: failed.key }), false, 'primary'),
        button('Open Slot', () => { activeTab = 'slots'; slotFilter = 'failed'; renderPanel() }, false, 'subtle'),
      )
    } else if (unsavedOutput) {
      title.textContent = 'Next: review the latest generated media'
      copy.textContent = 'Open Archive to inspect, reuse, or compare the latest Relay and Illustrator output.'
      actions.append(
        button('Open Archive', () => { activeTab = 'history'; renderPanel() }, false, 'primary'),
      )
    } else {
      title.textContent = 'Ready'
      title.classList.add('dg-main-ready-indicator')
      copy.textContent = 'Relay is ready to route semantic surface media and handle prose illustrations automatically.'
      actions.append(
        button('Open Relay Slots', () => { activeTab = 'slots'; renderPanel() }, false, 'primary'),
      )
    }
    content.append(title, copy, actions)
    return panelSection('Recommended Next Action', content)
  }

  function renderGenerationRecipes(): HTMLElement {
    const wrapper = document.createElement('div')
    const recipes = config?.generationRecipes || []
    const intro = document.createElement('div')
    intro.className = 'dg-recovery-note'
    intro.textContent = 'Recipes are explicit generation presets: model, connection, LoRAs, prompt snippets, negative stack, style profile, aspect ratio, and provider controls. Applying one never silently changes the contents of another recipe.'
    const actions = document.createElement('div')
    actions.className = 'dg-actions'
    actions.append(
      button('New Recipe', () => openGenerationRecipeEditor(), false, 'primary'),
      button('Disable Active Recipe', () => patchConfig({ activeGenerationRecipeId: null }), !config?.activeGenerationRecipeId, 'subtle'),
    )
    wrapper.append(panelSection('Generation Recipes', documentFragment(intro, actions)))

    const list = document.createElement('div')
    if (!recipes.length) list.appendChild(empty('No profiles yet. Create one for Relay surfaces or the Illustrator.'))
    for (const recipe of recipes) {
      const card = document.createElement('div')
      card.className = `dg-slot-card${config?.activeGenerationRecipeId === recipe.id ? ' is-active' : ''}`
      const heading = document.createElement('div')
      heading.className = 'dg-slot-top'
      const title = document.createElement('div')
      title.innerHTML = `<strong>${escapeHtml(recipe.name)}</strong><div class="dg-slot-meta">${escapeHtml(recipe.description || 'No description')}<br>${escapeHtml(titleCase(recipe.scope))} · ${escapeHtml(recipe.model || 'connection default')} · ${escapeHtml(recipe.aspectRatio || 'native')} · ${recipe.loraStack.length} LoRA${recipe.loraStack.length === 1 ? '' : 's'}</div>`
      heading.append(title, chip(config?.activeGenerationRecipeId === recipe.id ? 'Active' : titleCase(recipe.scope), config?.activeGenerationRecipeId === recipe.id ? 'completed' : ''))
      const recipeActions = document.createElement('div')
      recipeActions.className = 'dg-actions'
      recipeActions.append(
        button('Apply', () => applyGenerationRecipe(recipe), false, config?.activeGenerationRecipeId === recipe.id ? 'subtle' : 'primary'),
        button('Edit', () => openGenerationRecipeEditor(recipe), false, 'subtle'),
        button('Duplicate', () => duplicateGenerationRecipe(recipe), false, 'subtle'),
        button('Delete', () => deleteGenerationRecipe(recipe), false, 'danger'),
      )
      card.append(heading, recipeActions)
      list.appendChild(card)
    }
    wrapper.appendChild(list)
    return wrapper
  }

  function applyGenerationRecipe(recipe: GenerationRecipe): void {
    patchConfig({
      activeGenerationRecipeId: recipe.id,
      imageConnectionId: recipe.connectionId || config?.imageConnectionId || null,
      imageModel: recipe.model || config?.imageModel || '',
      defaultPromptProfileId: recipe.promptProfileId || config?.defaultPromptProfileId || 'auto',
    })
    showToast('success', `Applied recipe “${recipe.name}”.`)
  }

  function duplicateGenerationRecipe(recipe: GenerationRecipe): void {
    if (!config) return
    const now = Date.now()
    const duplicate: GenerationRecipe = { ...recipe, id: `recipe-${now.toString(36)}`, name: `${recipe.name} Copy`, createdAt: now, updatedAt: now, loraStack: recipe.loraStack.map(item => ({ ...item })), parameterOverrides: { ...recipe.parameterOverrides } }
    patchConfig({ generationRecipes: [...config.generationRecipes, duplicate] })
  }

  function deleteGenerationRecipe(recipe: GenerationRecipe): void {
    if (!config) return
    confirmCleanup({
      title: 'Delete Generation Recipe?',
      description: `Delete “${recipe.name}”? This does not remove any generated images or LoRA files.`,
      scope: recipe.name,
      actionLabel: 'Delete Recipe',
      onConfirm: () => patchConfig({ generationRecipes: config!.generationRecipes.filter(item => item.id !== recipe.id), activeGenerationRecipeId: config!.activeGenerationRecipeId === recipe.id ? null : config!.activeGenerationRecipeId }),
    })
  }

  function openGenerationRecipeEditor(existing?: GenerationRecipe): void {
    if (!config) return
    const now = Date.now()
    const base: GenerationRecipe = existing || {
      id: `recipe-${now.toString(36)}`,
      name: 'New Generation Profile',
      description: '',
      scope: 'both',
      connectionId: config.imageConnectionId,
      model: config.imageModel,
      loraStack: [],
      positivePrompt: '',
      negativePrompt: '',
      promptSnippetIds: [],
      aspectRatio: 'native',
      promptProfileId: config.defaultPromptProfileId,
      parameterOverrides: {},
      createdAt: now,
      updatedAt: now,
    }
    const modal = ctx.ui.showModal({ title: existing ? 'Edit Generation Recipe' : 'Create Generation Recipe', width: 760, persistent: true })
    modal.root.classList.add('dg-router-panel', 'dg-modal-host')
    const body = document.createElement('div'); body.className = 'dg-modal-body'
    const name = textInput('Name', base.name, () => {})
    const description = textInput('Description', base.description, () => {})
    const scope = selectField('Use in', base.scope, [['relay', 'Relay surfaces'], ['both', 'Relay + Illustrator']], () => {})
    const connection = selectField('Connection', base.connectionId || '', [['', 'Use current/default'], ...imageConnections.map(item => [item.id, item.name || item.id] as [string, string])], () => {})
    const model = textInput('Model', base.model, () => {})
    const aspect = textInput('Aspect ratio', base.aspectRatio || 'native', () => {})
    const positive = modalTextarea('Positive prompt / style additions', base.positivePrompt)
    const negative = modalTextarea('Negative stack', base.negativePrompt, true)
    const parameters = modalTextarea('Provider parameter overrides (JSON)', JSON.stringify(base.parameterOverrides || {}, null, 2), true)
    const save = button('Save Recipe', () => {
      let parsedParameters: Record<string, unknown> = {}
      try { parsedParameters = JSON.parse(fieldText(parameters, 'textarea') || '{}') }
      catch { showToast('warning', 'Recipe parameters must be valid JSON.'); return }
      const next: GenerationRecipe = {
        ...base,
        name: fieldText(name, 'input').trim() || 'Untitled Recipe',
        description: fieldText(description, 'input').trim(),
        scope: (scope.querySelector('select')?.value || 'both') as GenerationRecipe['scope'],
        connectionId: connection.querySelector('select')?.value || null,
        model: fieldText(model, 'input').trim(),
        aspectRatio: fieldText(aspect, 'input').trim() || 'native',
        positivePrompt: fieldText(positive, 'textarea').trim(),
        negativePrompt: fieldText(negative, 'textarea').trim(),
        parameterOverrides: parsedParameters,
        updatedAt: Date.now(),
      }
      const recipes = existing ? config!.generationRecipes.map(item => item.id === existing.id ? next : item) : [...config!.generationRecipes, next]
      patchConfig({ generationRecipes: recipes })
      modal.dismiss()
    }, false, 'primary')
    const footer = document.createElement('div'); footer.className = 'dg-actions'; footer.append(save, button('Cancel', () => modal.dismiss(), false, 'subtle'))
    body.append(name, description, scope, connection, model, aspect, positive, negative, parameters, footer)
    modal.root.appendChild(body)
  }

  function openBulkChatMediaDialog(lane: 'surfaces' | 'illustrations'): void {
    const illustrationLane = lane === 'illustrations'
    const modal = ctx.ui.showModal({ title: illustrationLane ? 'Remove Chat Illustrations' : 'Remove Chat Slot Images', width: 620, persistent: true })
    modal.root.classList.add('dg-router-panel', 'dg-modal-host')
    const body = document.createElement('div')
    body.className = 'dg-modal-body'
    const warning = document.createElement('div')
    warning.className = 'dg-error'
    const title = document.createElement('strong')
    title.textContent = illustrationLane ? 'This affects every illustration in the current chat.' : 'This affects every Surface slot image in the current chat.'
    const detail = document.createElement('div')
    detail.textContent = 'Generated assets remain available in Relay history and the Media Archive. Choose whether the reusable request slots should stay in the prose.'
    warning.append(title, detail)

    const choices = document.createElement('div')
    choices.className = 'dg-illustrator-mode-grid'
    const keep = document.createElement('button')
    keep.type = 'button'
    keep.className = 'dg-illustrator-mode-card'
    const keepTitle = document.createElement('strong'); keepTitle.textContent = 'Remove Images · Keep Slots'
    const keepCopy = document.createElement('small'); keepCopy.textContent = 'Restores a compact pending Status Card at each original position so the slots can be reparsed or regenerated.'
    keep.append(keepTitle, keepCopy)
    keep.addEventListener('click', () => {
      ctx.sendToBackend({ type: 'bulk_chat_media_action', chatId: activeChatId, lane, mode: 'remove-images-keep-slots' })
      modal.dismiss()
    })

    const remove = document.createElement('button')
    remove.type = 'button'
    remove.className = 'dg-illustrator-mode-card dg-danger-card'
    const removeTitle = document.createElement('strong'); removeTitle.textContent = 'Remove Images & Slots'
    const removeCopy = document.createElement('small'); removeCopy.textContent = 'Removes the generated media and its Relay request slots from every affected message in this chat.'
    remove.append(removeTitle, removeCopy)
    remove.addEventListener('click', () => {
      ctx.sendToBackend({ type: 'bulk_chat_media_action', chatId: activeChatId, lane, mode: 'remove-images-and-slots' })
      modal.dismiss()
    })
    choices.append(keep, remove)
    const actions = document.createElement('div')
    actions.className = 'dg-actions'
    actions.append(button('Cancel', () => modal.dismiss(), false, 'subtle'))
    body.append(warning, choices, actions)
    modal.root.appendChild(body)
  }

  function renderChatMediaCleanup(lane: 'surfaces' | 'illustrations', count: number): HTMLElement {
    const wrap = document.createElement('div')
    wrap.className = 'dg-protocol-card'
    const copy = document.createElement('div')
    const noun = lane === 'illustrations' ? 'illustration' : 'Surface slot image'
    copy.innerHTML = `<strong>Chat-wide cleanup</strong><span>${count} ${noun}${count === 1 ? '' : 's'} currently tracked. Remove only the images and keep reusable slots, or remove both images and slots.</span>`
    const actions = document.createElement('div')
    actions.className = 'dg-actions'
    actions.append(button(lane === 'illustrations' ? 'Remove Chat Illustrations…' : 'Remove Chat Slot Images…', () => openBulkChatMediaDialog(lane), !activeChatId || count === 0, 'danger'))
    wrap.append(copy, actions)
    return wrap
  }

  function isArchiveOnlyCompletedRow(row: Record<string, unknown>): boolean {
    if (!row.imageUrl) return false
    const current = recordByKey.get(String(row.key || ''))
    return !current || current.status === 'recovered-pending' && !current.imageUrl && !current.pendingPlacement?.imageUrl
  }

  function loadFirstArchivedOnlyPage(): void {
    if (activeTab !== 'slots' || !activeChatId || completedHistoryNextCursor === null
      || completedHistoryRows.some(isArchiveOnlyCompletedRow) || completedHistoryAutoPageCursor === completedHistoryNextCursor) return
    const cursor = completedHistoryNextCursor
    completedHistoryAutoPageCursor = cursor
    ctx.sendToBackend({ type: 'completed_history_page', chatId: activeChatId, cursor, limit: 24 })
  }

  function renderSlotsView(): HTMLElement {
    const box = document.createElement('div')
    const workflow = document.createElement('div')
    workflow.className = 'dg-slot-workflow'
    const modeActions = document.createElement('div')
    modeActions.className = 'dg-actions dg-slot-mode-actions'
    const currentMode = config?.slotGenerationMode || 'auto-insert'
    const modes: Array<[RouterConfig['slotGenerationMode'], string, string]> = [
      ['auto-insert', 'Generate & Insert', 'Generate and place results immediately.'],
      ['prompt-preview', 'Preview Prompt', 'Review the resolved prompt before generation.'],
      ['image-preview', 'Preview Image', 'Generate first, then choose Reparse, Regenerate, or Insert.'],
    ]
    for (const [value, label, title] of modes) {
      modeActions.appendChild(button(label, () => patchConfig({ slotGenerationMode: value }), false, value === currentMode ? 'primary' : 'subtle', title))
    }
    const workflowCopy = document.createElement('div')
    workflowCopy.className = 'dg-section-sub'
    workflowCopy.textContent = currentMode === 'prompt-preview'
      ? 'Relay pauses before ImageGen and opens the complete prompt preview.'
      : currentMode === 'image-preview'
        ? 'Relay generates the image but does not write it into prose until you approve it.'
        : 'Relay generates and writes each result into its exact slot automatically.'
    const workflowActions = document.createElement('div')
    workflowActions.className = 'dg-actions'
    workflowActions.append(
      button(rescanInProgress ? 'Scanning Slots…' : 'Scan Slots', rescanChat, !activeChatId || rescanInProgress, 'subtle'),
      button('Reparse Slots', () => void reparseChatSlotsFromOrb(), !activeChatId, 'subtle'),
    )
    workflow.append(modeActions, workflowCopy, workflowActions)
    box.appendChild(panelSection('Slot Workflow', workflow))
    box.appendChild(renderSlotFilters(slotFilter, value => { slotFilter = value; renderPanel() }))
    const archivedOnlyKeys = new Set(completedHistoryRows.filter(isArchiveOnlyCompletedRow).map(row => String(row.key)))
    const visible = records.filter(record => !archivedOnlyKeys.has(record.key) && matchesSlotFilter(record, slotFilter))
    const hasArchivedOnly = completedHistoryChatId === activeChatId
      && completedHistoryRows.some(isArchiveOnlyCompletedRow)
    if (visible.length || !hasArchivedOnly || slotFilter !== 'all' && slotFilter !== 'completed') box.appendChild(renderRecordList(visible, slotFilter === 'all' ? 'No Reverie Relay image slots in this chat yet.' : `No ${filterLabel(slotFilter).toLocaleLowerCase()} slots.`))
    if (activeChatId && stateRevision >= 0 && (completedHistoryChatId !== activeChatId || completedHistoryRequestedForCount !== stats.completedTotal)) {
      completedHistoryChatId = activeChatId
      completedHistoryRows = []
      completedHistoryNextCursor = null
      completedHistoryTotal = 0
      completedHistoryRequestedForCount = stats.completedTotal
      completedHistoryAutoPageCursor = -1
      ctx.sendToBackend({ type: 'completed_history_page', chatId: activeChatId, cursor: 0, limit: 24 })
    }
    loadFirstArchivedOnlyPage()
    if (slotFilter === 'all' || slotFilter === 'completed') {
      const archived = completedHistoryRows.filter(isArchiveOnlyCompletedRow)
      if (archived.length || completedHistoryNextCursor !== null) {
        const older = document.createElement('div')
        older.className = 'dg-history-track'
        for (const row of archived) {
          const item = document.createElement('div')
          item.className = 'dg-history-item'
          const imageUrl = String(row.imageUrl)
          const image = document.createElement('img')
          image.className = 'dg-history-thumb'
          image.src = imageUrl.includes('?') ? `${imageUrl}&size=sm` : `${imageUrl}?size=sm`
          image.alt = String(row.slot || row.requestId || 'Relay image')
          image.loading = 'lazy'
          image.addEventListener('click', () => openImageUrl(imageUrl, image.alt, String(row.imageId || '')))
          const copy = document.createElement('div')
          copy.className = 'dg-slot-meta'
          copy.textContent = `${String(row.requestId || '')} / ${String(row.slot || '')}\n${new Date(Number(row.completedAt) || 0).toLocaleString()}`
          const actions = document.createElement('div')
          actions.className = 'dg-actions'
          actions.append(button('View Image', () => openImageUrl(imageUrl, image.alt, String(row.imageId || '')), false, 'subtle'))
          if (row.diagnosticArchiveId) actions.append(button('Generation Details', () => requestCompletedRecord(row as unknown as SlotRecord, loaded => loaded && openPromptInspector(loaded)), false, 'subtle'))
          item.append(image, copy, actions)
          older.appendChild(item)
        }
        const section = document.createElement('div')
        section.appendChild(older)
        if (completedHistoryNextCursor !== null) section.appendChild(button('Load 24 Older Images', () => activeChatId && ctx.sendToBackend({ type: 'completed_history_page', chatId: activeChatId, cursor: completedHistoryNextCursor || 0, limit: 24 }), false, 'subtle'))
        box.appendChild(panelSection(`Older Completed Images${completedHistoryTotal ? ` · ${completedHistoryTotal} archived` : ''}`, section))
      }
    }
    const surfaceCount = records.filter(record => record.chatId === activeChatId && record.target !== 'prose.illustration').length
    box.appendChild(panelSection('Chat Cleanup', renderChatMediaCleanup('surfaces', surfaceCount)))
    return box
  }

  function renderProseIllustrator(): HTMLElement {
    const box = document.createElement('div')
    const settings = currentProseSettings()
    const plans = Object.values(proseIllustrator.plans || {}).filter(plan => plan.chatId === activeChatId).sort((a, b) => b.planningTimestamp - a.planningTimestamp)
    const recordsForChat = Object.values(proseIllustrator.records || {}).filter(record => proseIllustrator.plans[record.planId]?.chatId === activeChatId).sort((a, b) => b.createdAt - a.createdAt)

    const modeControls = document.createElement('div')
    modeControls.className = 'dg-illustrator-mode-grid dg-choice-compact dg-prose-mode-selector'
    const modeOptions: Array<{ id: ProseIllustratorSettings['mode']; label: string; description: string }> = [
      { id: 'off', label: 'Off', description: 'Pause illustrations.' },
      { id: 'relay-planned', label: 'Relay', description: 'Relay picks the moments.' },
      { id: 'inline-protocol', label: 'Story Model', description: 'The model chooses and places requests.' },
    ]
    for (const option of modeOptions) {
      const control = document.createElement('button')
      control.type = 'button'
      control.className = `dg-illustrator-mode-card${option.id === settings.mode ? ' is-active' : ''}`
      control.setAttribute('aria-pressed', String(option.id === settings.mode))
      const title = document.createElement('strong'); title.textContent = option.label
      const description = document.createElement('small'); description.textContent = option.description
      control.append(title, description)
      control.addEventListener('click', () => {
        patchProseSettings({
          mode: option.id,
          enabled: option.id !== 'off',
          paused: false,
          autoGenerateRequiresApproval: false,
          immediateDispatchOnOpportunitySelection: option.id === 'relay-planned',
          placementPolicy: 'after-beat',
        })
      })
      modeControls.appendChild(control)
    }
    box.appendChild(panelSection('Who Chooses the Illustrated Moments?', modeControls))

    const promptFormatControls = document.createElement('div')
    promptFormatControls.className = 'dg-illustrator-mode-grid dg-choice-compact dg-choice-two'
    const promptFormatOptions: Array<{ id: ProseIllustratorSettings['promptFormat']; label: string; description: string }> = [
      { id: 'natural-language', label: 'Natural Language', description: 'Describe the image in sentences.' },
      { id: 'danbooru-tags', label: 'Booru Tag Mode', description: 'Describe the image with comma-separated tags.' },
    ]
    for (const option of promptFormatOptions) {
      const control = document.createElement('button')
      control.type = 'button'
      control.className = `dg-illustrator-mode-card${settings.promptFormat === option.id ? ' is-active' : ''}`
      control.setAttribute('aria-pressed', String(settings.promptFormat === option.id))
      const title = document.createElement('strong'); title.textContent = option.label
      const description = document.createElement('small'); description.textContent = option.description
      control.append(title, description)
      control.addEventListener('click', () => patchProseSettings({ promptFormat: option.id }))
      promptFormatControls.appendChild(control)
    }
    box.appendChild(panelSection('Image Prompt Format', promptFormatControls))

    if (settings.mode === 'relay-planned') {
      const insertionControls = document.createElement('div')
      insertionControls.className = 'dg-illustrator-mode-grid dg-choice-compact dg-choice-two'
      const insertionOptions: Array<{ id: 'auto' | 'review'; label: string; description: string }> = [
        { id: 'auto', label: 'Auto Insert', description: 'Insert when ready.' },
        { id: 'review', label: 'Review First', description: 'Approve before insertion.' },
      ]
      for (const option of insertionOptions) {
        const control = document.createElement('button')
        control.type = 'button'
        control.className = `dg-illustrator-mode-card${settings.relayInsertionMode === option.id ? ' is-active' : ''}`
        control.setAttribute('aria-pressed', String(settings.relayInsertionMode === option.id))
        const title = document.createElement('strong'); title.textContent = option.label
        const description = document.createElement('small'); description.textContent = option.description
        control.append(title, description)
        control.addEventListener('click', () => patchProseSettings({ relayInsertionMode: option.id }))
        insertionControls.appendChild(control)
      }
      box.appendChild(panelSection('Generated Image Insertion', insertionControls))
    }

    const chips = document.createElement('div')
    chips.className = 'dg-status-chips'
    chips.append(
      chip(settings.mode === 'relay-planned' ? 'Relay-Planned' : settings.mode === 'inline-protocol' || settings.mode === 'model-placed' ? 'Model Planned' : 'Off', settings.mode === 'off' ? '' : 'completed'),
      chip(`${settings.illustrationsPerRun || 1} per response`, ''),
      chip(settings.promptFormat === 'danbooru-tags' ? 'Booru Tags' : 'Natural Language', ''),
      chip(settings.frequencyMode.replace(/-/g, ' '), ''),
      chip(settings.defaultAspectRatio, ''),
      chip(`${recordsForChat.length} generated`, ''),
    )
    const actions = document.createElement('div')
    actions.className = 'dg-actions dg-primary-actions dg-illustrator-overview-actions'
    if (settings.mode === 'off') {
      actions.append(button('Enable Model Planned', () => patchProseSettings({ mode: 'inline-protocol', enabled: true }), false, 'primary'))
    } else if (settings.mode === 'relay-planned') {
      const readyPlan = plans.find(plan => plan.status === 'ready' && !proseIllustrator.records[plan.planId])
      actions.append(
        button(settings.paused ? 'Resume Relay-Planned' : 'Pause Relay-Planned', () => sendProseAction({ action: settings.paused ? 'resume_auto' : 'pause_auto' }), !activeChatId, settings.paused ? 'primary' : 'subtle'),
        button('Plan Latest Once', () => sendProseAction({ action: 'plan_latest' }), !activeChatId || !settings.plannerConnectionId, 'primary'),
        button('Relay-Planned Dry Run', () => void fetchNativeSettingsSnapshot(true).then(snapshot => ctx.sendToBackend({
          type: 'dry_run', chatId: activeChatId, kind: 'relay-planned',
          nativeImageSettings: snapshot?.settings, nativeSettingsCapturedAt: snapshot?.capturedAt,
        })), !activeChatId || !settings.plannerConnectionId, 'subtle', 'Runs the real Director, validator, optional repair, and local compiler without generating or inserting images.'),
      )
      if (readyPlan) actions.append(button('Generate Planned Image', async () => {
        const snapshot = await syncNativeSettings()
        sendProseAction({ action: 'generate_plan', planId: readyPlan.planId, nativeImageSettings: snapshot?.settings, nativeSettingsCapturedAt: snapshot?.capturedAt } as any)
      }, false, 'primary'))
    } else {
      actions.append(
        button('Copy Preset Prompt', () => void copyText(REVERIE_INLINE_PROTOCOL, 'Full Model Planned preset prompt copied'), false, 'primary'),
        button('Copy Macro', () => void copyText('{{reverie_illustrator}}', 'Illustrator macro copied'), false, 'subtle'),
      )
    }
    actions.append(button('Copy Image Request Template', () => void copyText(COPYABLE_IMAGE_REQUEST_TEMPLATE, 'Complete image request template copied'), false, 'subtle', 'Copies the complete canonical request block for a preset or prompt.'))
    const dryRunPlan = plans.find(plan => !['completed', 'cancelled'].includes(plan.status)) || plans[0]
    actions.append(
      button('Why Didn’t This Generate?', () => ctx.sendToBackend({ type: 'explain_no_generation', chatId: activeChatId, scope: 'illustrator', planId: dryRunPlan?.planId }), !activeChatId, 'subtle'),
      button('Open Inline History', () => { activeTab = 'history'; historySubTab = 'inline-illustrations'; renderPanel() }, false, 'subtle'),
    )
    const explanation = document.createElement('div')
    explanation.className = 'dg-recovery-note'
    explanation.textContent = settings.mode === 'relay-planned'
      ? `Relay independently chooses up to ${settings.illustrationsPerRun || 1} distinct moments and ${settings.relayInsertionMode === 'review' ? 'waits for approval before insertion' : 'inserts finished images automatically'}.`
      : settings.mode === 'inline-protocol' || settings.mode === 'model-placed'
        ? 'The Story Model writes one complete request in its exact prose position. Relay parses that same canonical request and dispatches it automatically only when Auto Generate is enabled.'
        : 'The Illustrator is disabled.'
    box.appendChild(panelSection('Illustrator Overview', documentFragment(chips, actions, explanation)))

    if (modelPlacedMissingRequest?.chatId === activeChatId) {
      const missing = document.createElement('div')
      missing.className = 'dg-error'
      const title = document.createElement('strong')
      title.textContent = 'No illustration requests were authored'
      const detail = document.createElement('div')
      detail.textContent = 'The active Story Model illustration mode requested images, but the completed response contained no valid illustration request blocks.'
      const missingActions = document.createElement('div')
      missingActions.className = 'dg-actions'
      missingActions.append(
        button('Copy Preset Prompt', () => void copyText(REVERIE_INLINE_PROTOCOL, 'Full Model Planned preset prompt copied'), false, 'primary'),
        button('Use Relay-Planned Once', () => {
          const request = modelPlacedMissingRequest
          if (!request) return
          sendProseAction({ action: 'relay_plan_once', messageId: request.messageId })
          modelPlacedMissingRequest = null
          renderPanel()
        }, !currentProseSettings().plannerConnectionId, 'subtle'),
        button('Inspect Runtime', () => modelPlacedMissingRequest && openTextModal('Resolved Illustrator Runtime', modelPlacedMissingRequest.runtimeDirective || 'Runtime directive unavailable.'), false, 'subtle'),
        button('Dismiss', () => { modelPlacedMissingRequest = null; renderPanel() }, false, 'subtle'),
      )
      missing.append(title, detail, missingActions)
      box.appendChild(panelSection('Model Planned Recovery', missing))
    }

    const protocol = document.createElement('div')
    protocol.className = 'dg-protocol-card'
    const protocolCopy = document.createElement('div')
    protocolCopy.innerHTML = '<strong>Model Planned preset prompt</strong><span>Copy Preset Prompt gives users a complete ready-to-paste instruction block. The Illustrator macro expands to the active protocol and runtime settings for the current chat.</span>'
    const protocolActions = document.createElement('div')
    protocolActions.className = 'dg-actions'
    protocolActions.append(
      button('Copy Preset Prompt', () => void copyText(REVERIE_INLINE_PROTOCOL, 'Full Model Planned preset prompt copied'), false, 'primary'),
      button('Copy Macro', () => void copyText('{{reverie_illustrator}}', 'Illustrator macro copied'), false, 'subtle'),
    )
    protocol.append(protocolCopy, protocolActions)
    box.appendChild(panelSection('Illustration Protocol', protocol))

    box.appendChild(panelSection('Illustrator Settings', renderProseSettings(settings)))

    const advanced = document.createElement('details')
    advanced.className = 'dg-manage'
    const advancedSummary = document.createElement('summary')
    advancedSummary.textContent = 'Maintenance & Diagnostics'
    const advancedActions = document.createElement('div')
    advancedActions.className = 'dg-actions'
    advancedActions.append(
      button('Open Illustrator Logs', () => { activeTab = 'logs'; logFilters.stage = 'prose-illustrator'; renderPanel() }, false, 'subtle'),
      button('Open Candidate History', () => { activeTab = 'history'; historySubTab = 'illustrator-candidates'; renderPanel() }, false, 'subtle'),
    )
    advanced.append(advancedSummary, advancedActions)
    box.appendChild(advanced)
    box.appendChild(panelSection('Chat Cleanup', renderChatMediaCleanup('illustrations', recordsForChat.length)))
    return box
  }

  function renderProseIllustrationRecord(record: ProseIllustratorState['records'][string]): HTMLElement {
    const plan = proseIllustrator.plans[record.planId]
    const slot = recordByKey.get(record.slotKey)
    const card = document.createElement('div')
    card.className = 'dg-slot-card'
    const title = document.createElement('div')
    title.className = 'dg-history-title'
    title.textContent = `${plan?.title || 'Inline Illustration'} / ${titleCase(record.status)}`
    const meta = document.createElement('div')
    meta.className = 'dg-slot-meta'
    meta.textContent = `${record.requestId}\n${plan?.messageId || ''} / swipe ${plan?.swipeId ?? ''}\n${record.imageId || record.error || 'No image yet'}`
    const actions = document.createElement('div')
    actions.className = 'dg-actions'
    actions.append(
      button('Open Slot', () => { if (slot) openMetadata(slot) }, !slot, 'subtle'),
      button('Retry', async () => {
        const snapshot = await syncNativeSettings()
        sendProseAction({ action: 'generate_plan', planId: record.planId, nativeImageSettings: snapshot?.settings, nativeSettingsCapturedAt: snapshot?.capturedAt } as any)
      }, record.status !== 'failed' && record.status !== 'ready-to-place', 'primary'),
      button('Remove Illustration', () => sendProseAction({ action: 'remove_illustration', illustrationId: record.illustrationId }), record.removed, 'danger'),
      button('Open in History', () => { activeTab = 'history'; selectedAssetId = record.assetId || ''; renderPanel() }, !record.assetId, 'subtle'),
    )
    card.append(title, meta, actions)
    return card
  }

  function readJsonField(field: HTMLElement, label: string): Record<string, unknown> | null {
    const value = field.querySelector('textarea')?.value || '{}'
    try {
      const parsed = JSON.parse(value || '{}')
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Expected object.')
      return parsed as Record<string, unknown>
    } catch (error) {
      showToast('error', `${label} JSON is invalid: ${error instanceof Error ? error.message : String(error)}`)
      return null
    }
  }

  function fieldText(field: HTMLElement, selector: 'input' | 'textarea'): string {
    return (field.querySelector(selector) as HTMLInputElement | HTMLTextAreaElement | null)?.value.trim() || ''
  }

  function openTextModal(titleText: string, value: string): { setValue: (next: string) => void } {
    const modal = ctx.ui.showModal({ title: titleText, width: 760 })
    modal.root.classList.add('dg-router-panel', 'dg-modal-host')
    const body = document.createElement('div')
    body.className = 'dg-modal-body'
    const pre = document.createElement('pre')
    pre.className = 'dg-pre'
    let currentValue = value
    pre.textContent = currentValue
    const actions = document.createElement('div')
    actions.className = 'dg-actions'
    actions.append(
      button('Copy', () => void copyText(currentValue, `${titleText} copied.`), false, 'primary'),
      button('Close', () => modal.dismiss(), false, 'subtle'),
    )
    body.append(pre, actions)
    modal.root.appendChild(body)
    return {
      setValue: next => {
        currentValue = next
        pre.textContent = next
      },
    }
  }

  function imageLightboxViewport(image: HTMLImageElement): HTMLDivElement {
    const viewport = document.createElement('div')
    viewport.className = 'dg-image-lightbox-viewport'
    viewport.appendChild(image)
    bindImageLightboxZoom(image, viewport)
    return viewport
  }

  function ensureCompletedProseProjection(record: SlotRecord, root: Element, imageUrl: string): void {
    if (record.target !== 'prose.illustration' || record.proseSynthetic === true || record.status !== 'completed') return
    if (pendingFinalRevealByRecord.get(record.key) !== record.requestId && !urlMatches(revealedFinalImageByRecord.get(record.key) || '', imageUrl)) return
    if (deepQueryAll(root as ParentNode, `[data-rrn-native-request="${cssEscape(record.requestId)}"]`).length) return
    const image = deepQueryAll<HTMLImageElement>(root as ParentNode, 'img')
      .find(candidate => urlMatches(candidate.currentSrc || candidate.src, imageUrl) && !candidate.closest('.rrl-card'))
    if (!image) return
    const rendered = renderCompletedProseLifecycleProjection(record, {
      chatId: record.chatId, messageId: record.messageId, swipeId: record.swipeId,
      isUser: false, autoGenerate: config?.autoGenerate,
      generationPlaceholderEffect: config?.generationPlaceholderEffect,
      rendererMode: customSurfaces.rendererMode, colorMode: customSurfaces.colorMode,
      defaultShellMode: customSurfaces.defaultShellMode,
    })
    const template = document.createElement('template')
    template.innerHTML = rendered
    const card = template.content.querySelector<HTMLElement>(`[data-rrn-native-request="${cssEscape(record.requestId)}"]`)
    if (!card) return
    const projection = template.content.querySelector<HTMLElement>('.dgir-prose-lifecycle-projection')
    if (!projection) return
    const parent = image.parentElement
    const standaloneParagraph = parent?.tagName === 'P' && [...parent.childNodes].every(node => node === image || node.nodeType === 3 && !node.textContent?.trim())
    if (standaloneParagraph) parent.replaceWith(projection)
    else image.replaceWith(projection)
  }

  function mountAuthoredRevealEffect(image: HTMLImageElement): HTMLElement | undefined {
    const parent = image.closest<HTMLElement>('.rrn-media, .rrl-media-slot') || image.parentElement
    if (!parent) return undefined
    const effect = normalizeGenerationPlaceholderEffect(config?.generationPlaceholderEffect)
    if (effect === 'none') return undefined
    const overlay = document.createElement('div')
    overlay.className = 'rrl-media-skeleton rrl-generation-placeholder rrl-reveal-overlay'
    overlay.dataset.rrPlaceholderEffect = effect
    overlay.setAttribute('aria-hidden', 'true')
    overlay.innerHTML = renderGenerationPlaceholderEffect(effect === 'diffusion-preview' ? 'spinner' : effect)
    if (window.getComputedStyle(parent).position === 'static') {
      overlay.dataset.rrnParentPosition = parent.style.position
      parent.style.position = 'relative'
    }
    const imageRect = image.getBoundingClientRect()
    const parentRect = parent.getBoundingClientRect()
    overlay.style.inset = 'auto'
    overlay.style.left = `${imageRect.left - parentRect.left}px`
    overlay.style.top = `${imageRect.top - parentRect.top}px`
    overlay.style.width = `${imageRect.width || parentRect.width}px`
    overlay.style.height = `${imageRect.height || parentRect.height}px`
    parent.appendChild(overlay)
    return overlay
  }

  function removeAuthoredRevealEffect(image: HTMLImageElement, overlay = authoredRevealOverlayByImage.get(image)): void {
    if (!overlay) return
    const parent = overlay.parentElement
    if (parent && overlay.dataset.rrnParentPosition !== undefined) parent.style.position = overlay.dataset.rrnParentPosition
    overlay.remove()
    authoredRevealOverlayByImage.delete(image)
  }

  function createReplacementStatusProjection(record: SlotRecord): HTMLElement | null {
    const prose = record.target === 'prose.illustration' || record.targetApp === 'prose'
    const html = renderRegenerationLifecycleProjection(record, customSurfaces, {
      chatId: record.chatId,
      messageId: record.messageId,
      swipeId: record.swipeId,
      isUser: false,
      autoGenerate: true,
      generationPlaceholderEffect: config?.generationPlaceholderEffect,
      rendererMode: customSurfaces.rendererMode,
      colorMode: customSurfaces.colorMode,
      defaultShellMode: customSurfaces.defaultShellMode,
    })
    const template = document.createElement('template')
    template.innerHTML = html
    return template.content.querySelector<HTMLElement>(prose
      ? `[data-dgir-prose-projection="${cssEscape(record.key)}"]`
      : '.rrl-island')
  }

  function requestReplacementStatusProjection(record: SlotRecord): void {
    if (!record.imageUrl) return
    // The same host URL may be reused for a newly persisted image identity.
    // A prior settled record must not suppress the replacement's fresh reveal.
    revealedFinalImageByRecord.delete(record.key)
    if (replacementStatusProjections.has(record.key)) return
    const root = ctx.dom.findMessageElement(record.messageId)
    if (!root) return
    const projection = createReplacementStatusProjection(record)
    if (!projection) return
    const prose = record.target === 'prose.illustration' || record.targetApp === 'prose'
    const previousProjection = prose
      ? deepQueryAll<HTMLElement>(root as ParentNode, `[data-dgir-prose-projection="${cssEscape(record.key)}"]`)[0]
      : undefined
    const matchingImages = deepQueryAll<HTMLImageElement>(root as ParentNode, 'img')
      .filter(image => urlMatches(image.currentSrc || image.src, record.imageUrl || ''))
    const ownedImages = matchingImages.filter(image => image.dataset.dgirKey === record.key
      || image.dataset.dgirRequestId === record.requestId && image.dataset.dgirSlot === record.slot)
    const previousImage = ownedImages[0] || (matchingImages.length === 1 ? matchingImages[0] : undefined)
    const lifecycleCard = previousImage?.closest<HTMLElement>('.rrl-card') || null
    const previousOwner = chooseReplacementProjectionOwner({
      proseProjection: previousProjection,
      lifecycleIsland: lifecycleCard?.closest<HTMLElement>('.rrl-island') || null,
      lifecycleCard,
      resolvedMedia: previousImage?.closest<HTMLElement>('.rrl-resolved') || null,
      image: previousImage || null,
    })
    const parent = previousOwner?.parentNode
    if (!previousOwner || !parent) return
    const previousImages = deepQueryAll<HTMLImageElement>(previousOwner, 'img').map(image => ({
      image, visibility: image.style.visibility || '', hidden: image.hidden === true,
    }))
    const previousImageState = previousImages.find(state => state.image === previousImage)
    const previousImageVisibility = previousImageState?.visibility || ''
    const previousImageHidden = previousImageState?.hidden || false

    for (const state of previousImages) {
      concealPreviousLifecycleImage(state.image)
      removeAuthoredRevealEffect(state.image)
    }
    const marker = document.createComment(`Reverie Relay regeneration ${record.requestId}`)
    parent.insertBefore(marker, previousOwner)
    previousOwner.replaceWith(projection)
    replacementStatusProjections.set(record.key, {
      marker, previousOwner, previousImage, previousImages, projection, previousImageUrl: record.imageUrl,
      previousImageId: record.imageId, previousImageVisibility, previousImageHidden,
    })
  }

  function restorePreviousLifecycleImage(record: SlotRecord): void {
    const replacement = replacementStatusProjections.get(record.key)
    if (!replacement) return
    replacement.projection.remove()
    for (const state of replacement.previousImages) {
      state.image.style.visibility = state.visibility
      state.image.hidden = state.hidden
      removeAuthoredRevealEffect(state.image)
    }
    if (replacement.marker.parentNode) replacement.marker.replaceWith(replacement.previousOwner)
    replacementStatusProjections.delete(record.key)
  }

  function settleReplacementStatusProjection(record: SlotRecord): void {
    const replacement = replacementStatusProjections.get(record.key)
    if (!replacement) return
    const finalImageUrl = currentLifecycleImageUrl(record)
    const imageChanged = finalImageUrl && !urlMatches(finalImageUrl, replacement.previousImageUrl)
    const imageIdentityChanged = Boolean(record.imageId && replacement.previousImageId && record.imageId !== replacement.previousImageId)
    if (!imageChanged && !imageIdentityChanged) {
      restorePreviousLifecycleImage(record)
      return
    }
    if (replacement.previousImage && finalImageUrl) {
      const finalImageId = record.pendingPlacement?.imageId || record.imageId
      const lifecycleCard = replacement.previousImage.closest<HTMLElement>('.rrl-card')
      // Keep the image covered while swapping its URL, but don't collapse an
      // authored Surface's media geometry with the native `hidden` attribute.
      prepareRegeneratedLifecycleImage(replacement.previousImage, finalImageUrl, !lifecycleCard, urlMatches)
      if (finalImageId) replacement.previousImage.dataset.dgirImageId = finalImageId
      replacement.previousImage.dataset.dgirKey = record.key
      replacement.previousImage.dataset.dgirRequestId = record.requestId
      replacement.previousImage.dataset.dgirSlot = record.slot
      startedAuthoredReveals.delete(replacement.previousImage)
      const priorCardUpdate = lifecycleCard ? mediaCardUpdates.get(lifecycleCard) : undefined
      if (priorCardUpdate) {
        priorCardUpdate.sawActiveLifecycle = true
        priorCardUpdate.revealedImageUrl = undefined
        priorCardUpdate.signature = ''
      }
      for (const state of replacement.previousImages) {
        if (state.image === replacement.previousImage) continue
        state.image.style.visibility = state.visibility
        state.image.hidden = state.hidden
      }
      replacement.projection.remove()
      if (replacement.marker.parentNode) replacement.marker.replaceWith(replacement.previousOwner)
      // Authored reveal effects derive their size/offset from the live layout;
      // mounting before restoring the Surface would capture a 0×0 rectangle.
      const overlay = lifecycleCard ? undefined : mountAuthoredRevealEffect(replacement.previousImage)
      if (overlay) authoredRevealOverlayByImage.set(replacement.previousImage, overlay)
      if (lifecycleCard) {
        replacement.previousImage.style.visibility = replacement.previousImageVisibility
        replacement.previousImage.hidden = true
      } else {
        // Keep the replacement covered until the decode/reveal lifecycle starts;
        // the explicit restore value prevents preserving this temporary cover.
        authoredRevealVisibilityByImage.set(replacement.previousImage, replacement.previousImageVisibility)
        replacement.previousImage.hidden = false
      }
    } else {
      replacement.marker.remove()
      replacement.previousOwner.remove()
    }
    replacementStatusProjections.delete(record.key)
  }

  function openImageUrl(imageUrl: string, titleText: string, imageId?: string, linkedRecord?: SlotRecord | null): void {
    const record = linkedRecord || recordForImageUrl(imageUrl)
    const modal = ctx.ui.showModal({ title: titleText, width: 920 })
    modal.root.classList.add('dg-router-panel', 'dg-modal-host')
    const body = document.createElement('div')
    body.className = 'dg-modal-body'
    const image = document.createElement('img')
    image.className = 'dg-lightbox-img'
    image.src = imageUrl
    image.alt = titleText
    const imageViewport = imageLightboxViewport(image)
    const actions = document.createElement('div')
    actions.className = 'dg-actions'
    if (record) {
      const actionError = document.createElement('div')
      actionError.className = 'dg-error'
      actionError.hidden = true
      const showActionError = (message: string) => { actionError.textContent = message; actionError.hidden = !message }
      let reparseButton: HTMLButtonElement
      actions.append(
        button('Regenerate', () => { void regenerate(record); modal.dismiss() }, isSlotActionBusy(record), 'primary'),
        reparseButton = button('Reparse', () => {
          const previousOrbStatus = relayOrbStatus
          relayOrbStatus = 'analyzing'
          lastStatus = 'Reparsing this image…'
          renderRelayOrb()
          showActionError('')
          try {
            const id = submissionId('reparse', record.key)
            const submitted = slotActionFeedback.submit({
              submissionId: id, key: record.key, action: 'reparse', statusText: 'Reparsing…',
              dispatch: () => ctx.sendToBackend({ type: 'reparse_slot', submissionId: id, key: record.key }),
              closePopup: () => { modal.dismiss(); showToast('info', 'Reparse accepted. Relay is rebuilding this slot.') },
              setDisabled: disabled => { reparseButton.disabled = disabled; reparseButton.textContent = disabled ? 'Reparsing…' : 'Reparse' },
              showPopupError: showActionError,
              restorePending: () => { relayOrbStatus = previousOrbStatus; renderRelayOrb() },
              setBusy: setOptimisticSlotBusy,
              finishBusy: finishOptimisticSlotBusy,
            })
            if (!submitted) {
              reparseButton.disabled = false
              reparseButton.textContent = 'Reparse'
              relayOrbStatus = previousOrbStatus
              renderRelayOrb()
              showActionError('This slot already has a Relay action in progress.')
            }
          } catch (error) {
            reparseButton.disabled = false
            reparseButton.textContent = 'Reparse'
            relayOrbStatus = previousOrbStatus
            renderRelayOrb()
            showActionError(error instanceof Error ? error.message : String(error))
          }
        }, isSlotActionBusy(record) || !canReparse(record), 'subtle'),
        button('Details', () => openMetadata(record), false, 'subtle'),
        button('Remove From Message', () => confirmRemoveImageFromMessage(record, () => modal.dismiss()), isSlotActionBusy(record), 'danger'),
      )
      body.append(imageViewport, actionError, actions)
    }
    actions.append(
      button('Copy Image URL', () => copyText(imageUrl, 'Image URL copied.'), false, 'subtle'),
      button('Copy Image ID', () => copyText(imageId || record?.imageId || '', 'Image ID copied.'), !(imageId || record?.imageId), 'subtle'),
    )
    if (!record) {
      const note = document.createElement('div')
      note.className = 'dg-recovery-note'
      note.textContent = 'Relay could open this artifact image, but the source slot is not available in the active chat state, so Regenerate and Reparse are unavailable.'
      body.append(imageViewport, note, actions)
    }
    modal.root.appendChild(body)
  }

  function errorBox(message: string): HTMLElement {
    const box = document.createElement('div')
    box.className = 'dg-error'
    box.textContent = message
    return box
  }

  function jsonBlock(value: unknown): HTMLElement {
    const pre = document.createElement('pre')
    pre.className = 'dg-pre'
    pre.textContent = JSON.stringify(value, null, 2)
    return pre
  }

  function firstNativeString(...values: unknown[]): string {
    for (const value of values) {
      const text = String(value ?? '').trim()
      if (text) return text
    }
    return ''
  }

  function renderProseSettings(settings: ProseIllustratorSettings): HTMLElement {
    const wrapper = document.createElement('div')
    wrapper.className = 'dg-illustrator-settings'

    const essentials = document.createElement('div')
    essentials.className = 'dg-settings-grid dg-illustrator-essentials'
    essentials.append(selectField('Generation Placeholder Effect', normalizeGenerationPlaceholderEffect(config?.generationPlaceholderEffect), [['glitter', 'Glitter'], ['spinner', 'Spinner'], ['dream-orb', 'Dream Orb'], ['diffusion-preview', 'Diffusion Preview'], ['none', 'None']], value => patchConfig({ generationPlaceholderEffect: normalizeGenerationPlaceholderEffect(value) })))
    essentials.append(prosePlannerSelect(settings), plannerModelControl(settings), surfaceRepairConnectionField())
    if (settings.mode === 'inline-protocol' || settings.mode === 'model-placed') {
      essentials.append(toggleCard('Illustration Runtime Contract', 'Model Planned sends the configured protocol, exact count/range, aspect policy, and framing to the Story Model through the final prompt path.', true, () => patchProseSettings({ automaticProtocolInjection: true })))
      essentials.append(toggleCard(
        'Instant',
        'Off: keep the normal Status Card flow and wait for the response to finish. On: dispatch each complete Model Planned request as soon as it streams. Auto Generate still controls provider dispatch; image placement remains Relay-managed.',
        settings.instantIllustrationDispatch,
        checked => patchProseSettings({ instantIllustrationDispatch: checked }),
      ))
    }
    essentials.append(selectField('Illustration Count', settings.modelPlacedCountMode, [['fixed', 'Fixed exact count'], ['range', 'Inclusive range']], value => patchProseSettings({ modelPlacedCountMode: value as ProseIllustratorSettings['modelPlacedCountMode'] })))
    if (settings.modelPlacedCountMode === 'range') {
      const range = document.createElement('div')
      range.className = 'dg-settings-grid dg-count-range-grid'
      range.append(
        numberInput('Minimum Illustrations', settings.minimumImages, 1, 32, value => {
          if (value > settings.maximumImages) { showToast('warning', 'Minimum Illustrations cannot exceed Maximum Illustrations.'); renderPanel(); return }
          patchProseSettings({ minimumImages: value })
        }),
        numberInput('Maximum Illustrations', settings.maximumImages, 1, 32, value => {
          if (value < settings.minimumImages) { showToast('warning', 'Maximum Illustrations cannot be below Minimum Illustrations.'); renderPanel(); return }
          patchProseSettings({ maximumImages: value, maximumIllustrationsPerMessage: Math.max(value, settings.maximumIllustrationsPerMessage) })
        }),
      )
      essentials.append(range)
    } else {
      essentials.append(numberInput('Illustrations per Response', settings.illustrationsPerRun || 1, 1, 32, value => patchProseSettings({ illustrationsPerRun: value, maximumIllustrationsPerMessage: Math.max(value, settings.maximumIllustrationsPerMessage) })))
    }
    essentials.append(
      numberInput('Maximum Characters in Image · Hard Limit', settings.maximumCharacters, 1, 8, value => patchProseSettings({ maximumCharacters: value })),
      selectField('Image Size', settings.imageSize || 'medium', [['small', 'Small'], ['medium', 'Medium'], ['large', 'Large'], ['full', 'Full Width']], value => patchProseSettings({ imageSize: value as ProseIllustratorSettings['imageSize'] })),
      selectField('Candidate Count per Illustration', String(settings.defaultCandidateCount), [['1', '1'], ['2', '2'], ['4', '4']], value => patchProseSettings({ defaultCandidateCount: Number(value) as 1 | 2 | 4 })),
      selectField('Frequency', settings.frequencyMode, [['key-moments', 'Key Moments'], ['every-eligible', 'Every Eligible Message'], ['every-n', 'Every N Eligible Messages']], value => patchProseSettings({ frequencyMode: value as ProseIllustratorSettings['frequencyMode'] })),
    )
    if (settings.frequencyMode === 'every-n') essentials.append(numberInput('Every N Eligible Messages', settings.everyNEligibleMessages, 1, 100, value => patchProseSettings({ everyNEligibleMessages: value })))
    const framingModes = document.createElement('div')
    framingModes.className = 'dg-illustrator-mode-grid dg-choice-compact dg-choice-six'
    const framingOptions: Array<{ id: ProseIllustratorSettings['perspectiveMode']; label: string; tooltip: string }> = [
      { id: 'scene-snapshot', label: 'Scene Snapshot', tooltip: 'Frames one readable moment from the current scene, including its setting, action, and visible subjects.' },
      { id: 'sequence', label: 'Sequence', tooltip: 'Treats the image as the next shot in an ongoing visual sequence while preserving continuity.' },
      { id: 'emotional-beat', label: 'Emotional Beat', tooltip: 'Centers the scene’s strongest emotional reaction, gesture, expression, or relationship beat.' },
      { id: 'solo-scene', label: 'Char only', tooltip: 'Shows exactly one selected character in the current scene; no other people appear in the frame.' },
      { id: 'persona-pov', label: 'Persona POV', tooltip: 'The active chat Persona is the in-world camera. Visible subjects meet the lens only when interacting with that Persona.' },
      { id: 'storyboard', label: 'Storyboard', tooltip: 'Requires each image prompt to depict the exact action in its anchored story paragraph—not just the characters, outfits, or mood.' },
    ]
    for (const option of framingOptions) {
      const control = document.createElement('button')
      control.type = 'button'
      control.className = `dg-illustrator-mode-card${settings.perspectiveMode === option.id ? ' is-active' : ''}`
      control.setAttribute('aria-pressed', String(settings.perspectiveMode === option.id))
      control.setAttribute('aria-label', `${option.label}: ${option.tooltip}`)
      control.title = option.tooltip
      const title = document.createElement('strong'); title.textContent = option.label
      const help = document.createElement('small'); help.textContent = option.tooltip
      control.append(title, help)
      control.addEventListener('click', () => patchProseSettings({ perspectiveMode: option.id, adaptiveMode: option.id === 'solo-scene' || option.id === 'persona-pov' ? false : settings.adaptiveMode }))
      framingModes.appendChild(control)
    }
    if (settings.perspectiveMode === 'solo-scene') essentials.append(textareaInput('Character Override · optional', settings.characterOnlySubjects || '', value => patchProseSettings({ characterOnlySubjects: value.split(/[,\n]/)[0]?.trim() || '' })))
    essentials.append(
      selectField('Aspect Policy', settings.defaultAspectRatio, [['adaptive', 'Adaptive'], ['1:1', 'Square · 1:1'], ['2:3', 'Portrait · 2:3'], ['3:2', 'Landscape · 3:2'], ['3:4', 'Portrait · 3:4'], ['4:3', 'Landscape · 4:3'], ['4:5', 'Portrait · 4:5'], ['5:4', 'Landscape · 5:4'], ['9:16', 'Tall · 9:16'], ['16:9', 'Wide · 16:9']], value => patchProseSettings({ defaultAspectRatio: value || 'adaptive' })),
      selectField('Appearance Memory Strength', settings.appearanceMemoryOverride || 'global', [['global', 'Use Global Memory Strength'], ['off', 'Off'], ['low', 'Low'], ['medium', 'Medium'], ['strong', 'Strong']], value => patchProseSettings({ appearanceMemoryOverride: value as ProseIllustratorSettings['appearanceMemoryOverride'], continuityStrength: value === 'global' ? (config?.vaultStrength || 'medium') : value as ContinuityStrength })),
    )
    essentials.append(
      selectField('Appearance Sidecar Source', settings.useGlobalAppearanceSidecar !== false ? 'global' : 'override', [['global', 'Use Global Sidecar'], ['override', 'Use Illustrator Override']], value => patchProseSettings({ useGlobalAppearanceSidecar: value === 'global' })),
    )
    if (settings.useGlobalAppearanceSidecar === false) {
      essentials.append(selectField('Appearance Sidecar Connection', settings.appearanceSidecarConnectionId || '', [['', 'Use Global Connection'], ...parserConnections.map(connection => [connection.id, `${connection.name} / ${connection.model}`] as [string, string])], value => {
        const globalConnectionId = config?.appearanceSidecarConnectionId || config?.parserConnectionId || ''
        patchProseSettings({
          appearanceSidecarConnectionId: value || null,
          appearanceSidecarModel: compatibleSidecarModel(settings.appearanceSidecarModel, value || globalConnectionId),
        })
      }))
      const globalConnectionId = config?.appearanceSidecarConnectionId || config?.parserConnectionId || null
      const globalConnection = parserConnections.find(connection => connection.id === globalConnectionId)
      const globalModel = config?.appearanceSidecarModel
        || (config?.appearanceSidecarConnectionId ? globalConnection?.model || '' : config?.parserModel || globalConnection?.model || '')
      essentials.append(appearanceSidecarModelField(
        'Appearance Sidecar Model',
        settings.appearanceSidecarConnectionId,
        settings.appearanceSidecarModel,
        globalConnectionId,
        globalModel,
        value => patchProseSettings({ appearanceSidecarModel: value }),
      ))
    }

    const promptControls = document.createElement('div')
    promptControls.className = 'dg-illustrator-prompt-controls'
    const promptTitle = document.createElement('div')
    promptTitle.className = 'dg-history-title'
    promptTitle.textContent = 'Prompt Registry'
    const promptHelp = document.createElement('div')
    promptHelp.className = 'dg-section-sub'
    promptHelp.textContent = 'Every Relay-authored model-facing instruction is visible here. Blank entries stay blank.'
    promptControls.append(
      promptTitle, promptHelp,
      button('Edit Prompts', () => openPromptRegistry(settings), false, 'primary'),
      button('View Final Prompt', () => openFinalPromptPreview(settings), false, 'subtle'),
      resettableTextareaInput('Positive Prompt Prefix', settings.customPromptPrefix || '', '', value => patchProseSettings({ customPromptPrefix: value })),
      resettableTextareaInput('Negative Prompt Prefix', settings.customNegativePrefix || '', '', value => patchProseSettings({ customNegativePrefix: value })),
      toggleCard('Remove Generic Style Boilerplate', 'Keeps the selected visual beat clean and lets the Prompt Profile supply the intended style.', settings.stripGenericStyleBoilerplate, checked => patchProseSettings({ stripGenericStyleBoilerplate: checked })),
    )

    const explanation = document.createElement('div')
    explanation.className = 'dg-recovery-note'
    explanation.textContent = settings.perspectiveMode === 'solo-scene'
      ? 'Relay automatically resolves the current chat character. An optional override can name a different single character. The character stays inside the current scene; no second, background, reflected, screen, or poster person is allowed.'
      : settings.perspectiveMode === 'persona-pov'
        ? 'Relay resolves the chat-bound Persona first, then the active host Persona. If neither exists, Persona POV refuses generation. The Persona holds the camera and is not automatically added to the visible cast.'
        : settings.perspectiveMode === 'storyboard'
          ? 'The exact anchored story paragraph must be recognizable from the image prompt itself. Natural Language must describe the event; Booru Tag Mode must use action-bearing tags plus the relevant participants, props, and setting.'
          : 'Maximum Characters is validated before generation.'

    const advanced = document.createElement('details')
    advanced.className = 'dg-illustrator-advanced'
    advanced.open = illustratorAdvancedOpen
    advanced.addEventListener('toggle', () => { illustratorAdvancedOpen = advanced.open })
    const advancedSummary = document.createElement('summary')
    const advancedTitle = document.createElement('span'); advancedTitle.textContent = 'Advanced Illustrator Controls'
    const advancedHint = document.createElement('small'); advancedHint.textContent = 'profiles, filtering, reuse, alignment, and diagnostics'
    advancedSummary.append(advancedTitle, advancedHint)
    const advancedBody = document.createElement('div')
    advancedBody.className = 'dg-illustrator-advanced-body'
    const advancedGrid = document.createElement('div')
    advancedGrid.className = 'dg-settings-grid'
    const profiles = (config?.promptProfiles || []).map(profile => [profile.id, `${profile.name}${profile.builtIn ? ' (built-in)' : ''}`]) as Array<[string, string]>
    if (!profiles.length) profiles.push(['auto', 'Auto'])
    advancedGrid.append(
      numberInput('Context Messages', settings.contextMessageCount, 0, 12, value => patchProseSettings({ contextMessageCount: value })),
      selectField('Prompt Profile', settings.defaultPromptProfileId || 'auto', profiles, value => patchProseSettings({ defaultPromptProfileId: (value || 'auto') as PromptProfileId })),
      selectField('Image Alignment', settings.imageAlignment || 'center', [['left', 'Left'], ['center', 'Center'], ['right', 'Right']], value => patchProseSettings({ imageAlignment: value as ProseIllustratorSettings['imageAlignment'] })),
      numberInput('Minimum Message Length', settings.minimumMessageLength, 0, 2000, value => patchProseSettings({ minimumMessageLength: value })),
    )
    const advancedToggles = document.createElement('div')
    advancedToggles.className = 'dg-toggle-grid'
    advancedToggles.append(
      toggleCard('Adaptive Framing', 'Lets the configured Sidecar adapt framing guidance where supported. Relay does not deterministically rotate modes; Char only and Persona POV remain fixed constraints.', settings.adaptiveMode, checked => patchProseSettings({ adaptiveMode: checked }), settings.perspectiveMode === 'solo-scene' || settings.perspectiveMode === 'persona-pov'),
      toggleCard('Reuse Accepted References', '', settings.reuseAcceptedReferences, checked => patchProseSettings({ reuseAcceptedReferences: checked })),
      toggleCard('Use Location References', '', settings.reuseLocationReferences, checked => patchProseSettings({ reuseLocationReferences: checked })),
      toggleCard('Show Captions', '', settings.showCaptions, checked => patchProseSettings({ showCaptions: checked })),
      toggleCard('Reanalyze Edited Messages', '', settings.reanalyzeEditedMessages, checked => patchProseSettings({ reanalyzeEditedMessages: checked })),
      toggleCard('Skip OOC', '', settings.skipOoc, checked => patchProseSettings({ skipOoc: checked })),
      toggleCard('Skip Utility Markup', '', settings.skipUtilities, checked => patchProseSettings({ skipUtilities: checked })),
      toggleCard('Skip Short Messages', '', settings.skipShortMessages, checked => patchProseSettings({ skipShortMessages: checked })),
      toggleCard('Skip Test Fixtures', '', settings.skipTestFixtures, checked => patchProseSettings({ skipTestFixtures: checked })),
      toggleCard('High-Resolution Modifier', '', settings.highResolutionModifier, checked => patchProseSettings({ highResolutionModifier: checked })),
    )
    advancedBody.append(advancedGrid, advancedToggles)
    advanced.append(advancedSummary, advancedBody)

    const macroOverview = document.createElement('div')
    macroOverview.className = 'dg-recovery-note'
    macroOverview.innerHTML = '<strong>Illustrator Macro</strong><br><code>{{reverie_illustrator}}</code> expands to the active workflow prompt, framing prompt, and live runtime. <code>{{reverie_all}}</code> includes both Illustrator and enabled Surface modules.'
    wrapper.append(panelSection('Framing Mode', framingModes), essentials, macroOverview, promptControls, explanation, advanced)
    return wrapper
  }

  function prosePlannerSelect(settings: ProseIllustratorSettings): HTMLElement {
    const field = document.createElement('div')
    field.className = 'dg-field'
    const label = fieldLabel('Sidecar Connection', 'Used for Relay illustration planning and targeted illustration repairs. Appearance has its own Sidecar setting; Surface Assisted Repair uses the separate connection below.')
    const select = document.createElement('select')
    select.className = 'dg-select'
    select.setAttribute('aria-label', 'Illustration Sidecar Connection')
    const none = document.createElement('option')
    none.value = ''
    none.textContent = 'Select Sidecar connection'
    none.selected = !settings.plannerConnectionId
    select.appendChild(none)
    for (const connection of parserConnections) {
      const option = document.createElement('option')
      option.value = connection.id
      option.textContent = `${connection.name} / ${connection.model}`
      option.selected = connection.id === settings.plannerConnectionId
      select.appendChild(option)
    }
    select.addEventListener('change', () => {
      const connection = parserConnections.find(item => item.id === select.value)
      patchProseSettings({ plannerConnectionId: connection?.id || null, plannerModel: '' })
    })
    field.append(label, select)
    return field
  }

  function openFinalPromptPreview(_settings: ProseIllustratorSettings): void {
    if (!activeChatId) { showToast('warning', 'Open a chat to resolve its final Illustrator prompt.'); return }
    if (pendingPromptPreviewRequestId) return
    const requestId = `illustrator-preview-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    pendingPromptPreviewRequestId = requestId
    ctx.sendToBackend({ type: 'prose_illustrator_action', chatId: activeChatId, action: 'preview_prompt', requestId, settings: currentProseSettings() })
    window.setTimeout(() => {
      if (pendingPromptPreviewRequestId !== requestId) return
      pendingPromptPreviewRequestId = null
      showToast('warning', 'Illustrator prompt preview timed out. Please try again.')
    }, 20_000)
  }

  function installAccessibleModalDismissal(modal: { root: HTMLElement; dismiss(): void }, label: string): () => void {
    modal.root.setAttribute('role', 'dialog')
    modal.root.setAttribute('aria-modal', 'true')
    modal.root.setAttribute('aria-label', label)
    const close = document.createElement('button')
    close.type = 'button'
    close.className = 'dg-modal-close-icon'
    close.setAttribute('aria-label', `Close ${label}`)
    close.textContent = '×'
    Object.assign(close.style, { position: 'absolute', top: '10px', right: '12px', zIndex: '4', width: '32px', height: '32px', borderRadius: '999px', cursor: 'pointer' })
    const keydown = (event: KeyboardEvent) => { if (event.key === 'Escape') dismiss() }
    const backdrop = modal.root.parentElement
    const backdropClick = (event: Event) => { if (event.target === backdrop) dismiss() }
    const cleanup = () => { document.removeEventListener('keydown', keydown); backdrop?.removeEventListener('click', backdropClick) }
    const dismiss = () => { cleanup(); modal.dismiss() }
    close.addEventListener('click', dismiss)
    document.addEventListener('keydown', keydown)
    backdrop?.addEventListener('click', backdropClick)
    modal.root.prepend(close)
    return dismiss
  }

  function openExpandedPromptEditor(definitionId: string, initialValue: string, save: (value: string) => boolean): void {
    const definition = PROMPT_REGISTRY_DEFINITIONS.find(item => item.id === definitionId)
    const modal = ctx.ui.showModal({ title: `Expand · ${definition?.displayName || definitionId}`, width: 960, persistent: true })
    modal.root.classList.add('dg-router-panel', 'dg-modal-host')
    const dismiss = installAccessibleModalDismissal(modal, `Expanded ${definition?.displayName || definitionId} prompt`)
    const body = document.createElement('div'); body.className = 'dg-modal-body'
    const editor = document.createElement('textarea'); editor.className = 'dg-textarea'; editor.rows = 24; editor.value = initialValue
    const find = document.createElement('input'); find.className = 'dg-input'; find.placeholder = 'Find'
    const replacement = document.createElement('input'); replacement.className = 'dg-input'; replacement.placeholder = 'Replace'
    const actions = document.createElement('div'); actions.className = 'dg-actions'
    actions.append(
      button('Replace All', () => { if (find.value) editor.value = editor.value.split(find.value).join(replacement.value) }, false, 'subtle'),
      button('Save', () => { if (save(editor.value)) dismiss() }, false, 'primary'),
    )
    body.append(find, replacement, editor, actions); modal.root.appendChild(body)
  }

  function openPromptRegistry(settings: ProseIllustratorSettings): void {
    // The host allows multiple copies of the same modal. A rapid second
    // activation must not stack another editor over a still-open draft.
    if (document.querySelector('[role="dialog"][aria-label="Prompt Registry"]')) return
    const modal = ctx.ui.showModal({ title: 'Prompt Registry', width: 980, persistent: true })
    modal.root.classList.add('dg-router-panel', 'dg-modal-host')
    installAccessibleModalDismissal(modal, 'Prompt Registry')
    let overrides = { ...(settings.promptRegistry || {}) }
    let query = ''
    let category = 'all'
    let customizedOnly = false
    const body = document.createElement('div'); body.className = 'dg-modal-body'
    const toolbar = document.createElement('div'); toolbar.className = 'dg-actions'
    const search = document.createElement('input'); search.className = 'dg-input'; search.placeholder = 'Search prompts'
    const categorySelect = document.createElement('select'); categorySelect.className = 'dg-select'
    const registryCategories = [['all', 'All categories'], ['story-model', 'Story Model'], ['sidecars', 'Sidecars']] as Array<[string, string]>
    const visibleDefinitions = PROMPT_REGISTRY_DEFINITIONS.filter(definition => definition.id !== 'story.model-placed')
    // Image Interpretation has no shipped workflow in this build. Do not
    // advertise an empty category; it returns if a definition is registered.
    if (visibleDefinitions.some(definition => definition.category === 'image-interpretation')) registryCategories.splice(2, 0, ['image-interpretation', 'Image Interpretation'])
    for (const [value, label] of registryCategories) {
      const option = document.createElement('option'); option.value = value; option.textContent = label; categorySelect.appendChild(option)
    }
    const list = document.createElement('div'); list.className = 'dg-history-track'
    let versions = { ...DEFAULT_PROMPT_REGISTRY_VERSIONS, ...(settings.promptRegistryVersions || {}) }
    const hasOverride = (id: string) => Object.prototype.hasOwnProperty.call(overrides, id)
    const effective = (definition: typeof PROMPT_REGISTRY_DEFINITIONS[number]) => hasOverride(definition.id)
      ? String(overrides[definition.id] ?? '')
      : definition.defaultTemplate
    const placeholders = (value: string) => [...new Set([...value.matchAll(/\{\{\s*([\w.-]+)\s*\}\}/g)].map(match => match[1]))]
    const validate = (definition: typeof PROMPT_REGISTRY_DEFINITIONS[number], value: string): boolean => {
      if (!definition.allowedPlaceholders) return true
      const unknown = placeholders(value).filter(name => !definition.allowedPlaceholders!.includes(name))
      if (!unknown.length) return true
      showToast('error', `Unsupported template variable${unknown.length === 1 ? '' : 's'}: ${unknown.join(', ')}`)
      return false
    }
    const saveOverride = (definition: typeof PROMPT_REGISTRY_DEFINITIONS[number], value: string): boolean => {
      if (!validate(definition, value)) return false
      const isDefault = value.replace(/\r\n/g, '\n') === definition.defaultTemplate.replace(/\r\n/g, '\n')
      if (isDefault) delete overrides[definition.id]
      else overrides[definition.id] = value
      versions[definition.id] = definition.version
      enqueueRelaySettingsPatch({ kind: 'prompt-registry-override', promptId: definition.id, content: isDefault ? null : value, version: definition.version })
      return true
    }
    const render = () => {
      list.replaceChildren()
      const filtered = visibleDefinitions.filter(definition => {
        if (category !== 'all' && definition.category !== category) return false
        if (customizedOnly && !hasOverride(definition.id)) return false
        const haystack = `${definition.displayName} ${definition.description} ${definition.id}`.toLocaleLowerCase()
        return !query || haystack.includes(query.toLocaleLowerCase())
      })
      for (const definition of filtered) {
        const value = effective(definition)
        const customized = hasOverride(definition.id)
        const card = document.createElement('div'); card.className = 'dg-slot-card'
        const head = document.createElement('div'); head.className = 'dg-history-head'
        const title = document.createElement('div'); title.className = 'dg-history-title'; title.textContent = definition.displayName
        head.append(title, chip(customized ? 'User Override' : 'Default', customized ? 'completed' : ''))
        if (definition.status === 'provisional') head.append(chip('Provisional', 'warning'))
        const help = document.createElement('div'); help.className = 'dg-section-sub'; help.textContent = `${definition.category} · ${definition.description} · ${value.length.toLocaleString()} chars · ~${Math.ceil(value.length / 4).toLocaleString()} input tokens`
        const variableHelp = document.createElement('div'); variableHelp.className = 'dg-section-sub'
        variableHelp.textContent = definition.allowedPlaceholders?.length
          ? `Supported variables: ${definition.allowedPlaceholders.map(name => `{{${name}}}`).join(', ')}`
          : definition.allowedPlaceholders ? 'No runtime template variables.' : 'Legacy prompt; template variables are validated by its workflow.'
        const missingTokens = (definition.requiredTokens || []).filter(token => !value.includes(token))
        const outdated = customized && ((versions[definition.id] || 0) < definition.version || missingTokens.length > 0)
        if (outdated) {
          const warning = document.createElement('div'); warning.className = 'dg-build-warning'
          warning.textContent = `Custom prompt uses an older schema${missingTokens.length ? ` and is missing required tokens: ${missingTokens.join(', ')}` : ''}. It was preserved; review or reset it to migrate safely.`
          card.appendChild(warning)
        }
        const editor = document.createElement('textarea'); editor.className = 'dg-textarea'; editor.rows = 7; editor.value = value
        editor.addEventListener('change', () => { if (saveOverride(definition, editor.value)) render(); else editor.value = value })
        const actions = document.createElement('div'); actions.className = 'dg-actions'
        actions.append(
          button('Edit', () => openExpandedPromptEditor(definition.id, editor.value, next => { const saved = saveOverride(definition, next); if (saved) render(); return saved }), false, 'subtle'),
          button('Reset to Default', () => { delete overrides[definition.id]; versions[definition.id] = definition.version; enqueueRelaySettingsPatch({ kind: 'prompt-registry-override', promptId: definition.id, content: null, version: definition.version }); render() }, !customized, 'subtle'),
          button('Preview Compiled Prompt', () => openJsonModal(`Compiled Prompt Preview · ${definition.displayName}`, { promptId: definition.id, source: customized ? 'user-override' : 'default', content: value, unresolvedPlaceholders: placeholders(value), characters: value.length, estimatedInputTokens: Math.ceil(value.length / 4) }), false, 'subtle'),
          button('Copy', () => copyText(value, `${definition.displayName} copied.`), false, 'subtle'),
          button('Export', () => downloadJson(`reverie-relay-prompt-${definition.id}.json`, { id: definition.id, source: customized ? 'user-override' : 'default', version: versions[definition.id] || definition.version, content: value }), false, 'subtle'),
        )
        card.append(head, help, variableHelp, editor, actions); list.appendChild(card)
      }
      if (!filtered.length) list.appendChild(empty('No prompts match these filters.'))
    }
    search.addEventListener('input', () => { query = search.value; render() })
    categorySelect.addEventListener('change', () => { category = categorySelect.value; render() })
    toolbar.append(search, categorySelect,
      button('Customized Only', () => { customizedOnly = !customizedOnly; render() }, false, 'subtle'),
      button('Reset All', () => {
        for (const definition of PROMPT_REGISTRY_DEFINITIONS) {
          if (!hasOverride(definition.id)) continue
          enqueueRelaySettingsPatch({ kind: 'prompt-registry-override', promptId: definition.id, content: null, version: definition.version })
        }
        overrides = {}
        versions = { ...DEFAULT_PROMPT_REGISTRY_VERSIONS }
        render()
      }, false, 'subtle'),
      button('Export', () => openJsonModal('Prompt Registry Overrides Export', { promptRegistry: overrides, promptRegistryVersions: versions }), false, 'subtle'),
      button('Import', () => {
        const raw = window.prompt('Paste a Prompt Registry JSON object')
        if (raw === null) return
        try {
          const parsed = JSON.parse(raw)
          const imported = parsed?.promptRegistry && typeof parsed.promptRegistry === 'object' ? parsed.promptRegistry : parsed
          if (!imported || typeof imported !== 'object' || Array.isArray(imported)) throw new Error('Expected an object.')
          for (const [id, content] of Object.entries(imported)) {
            const definition = PROMPT_REGISTRY_DEFINITIONS.find(candidate => candidate.id === id)
            if (!definition || typeof content !== 'string' || !validate(definition, content)) continue
            saveOverride(definition, content)
          }
          render()
        }
        catch (error) { showToast('error', `Prompt Registry import failed: ${error instanceof Error ? error.message : String(error)}`) }
      }, false, 'subtle'),
    )
    body.append(toolbar, list); modal.root.appendChild(body); render()
  }

  function plannerModelControl(settings: ProseIllustratorSettings): HTMLElement {
    const selected = parserConnections.find(connection => connection.id === settings.plannerConnectionId)
    const inherited = selected?.model || ''
    const resolved = settings.plannerModel || inherited || 'Unavailable'
    const field = document.createElement('div')
    field.className = 'dg-field'
    const label = fieldLabel('Sidecar Model', 'Optional model override for the selected Sidecar connection. Leave inherited unless a quieter planning model is preferred.')
    const summary = document.createElement('div')
    summary.className = 'dg-slot-meta'
    summary.textContent = `${settings.plannerModel ? 'Override' : 'Inherited'} / ${resolved}`
    field.append(label, summary, button('Choose Sidecar Model', () => openPlannerModelModal(settings), false, 'subtle'))
    return field
  }

  function openPlannerModelModal(settings: ProseIllustratorSettings): void {
    const modal = ctx.ui.showModal({ title: 'Sidecar Model', width: 620, persistent: true })
    modal.root.classList.add('dg-router-panel', 'dg-modal-host')
    const body = document.createElement('div')
    body.className = 'dg-modal-body'
    let selectedConnectionId = settings.plannerConnectionId || ''
    let overrideModel = settings.plannerModel || ''
    const connectionField = document.createElement('div')
    connectionField.className = 'dg-field'
    const connectionLabel = fieldLabel('Sidecar connection', 'Used for illustration planning and targeted illustration repairs. Its model is inherited unless you set the override below.')
    const connectionSelect = document.createElement('select')
    connectionSelect.className = 'dg-select'
    connectionSelect.setAttribute('aria-label', 'Illustration Sidecar Connection')
    const noConnection = document.createElement('option')
    noConnection.value = ''; noConnection.textContent = 'Select Sidecar connection'; noConnection.selected = !selectedConnectionId
    connectionSelect.appendChild(noConnection)
    for (const connection of parserConnections) {
      const option = document.createElement('option')
      option.value = connection.id
      option.textContent = `${connection.name} (${connection.provider}${connection.model ? ` / ${connection.model}` : ''})`
      option.selected = connection.id === selectedConnectionId
      connectionSelect.appendChild(option)
    }
    connectionSelect.addEventListener('change', () => {
      selectedConnectionId = connectionSelect.value
      const next = parserConnections.find(connection => connection.id === selectedConnectionId)
      if (overrideModel && next?.model && overrideModel !== next.model && !availablePlannerModels(selectedConnectionId).includes(overrideModel)) overrideModel = ''
      paint()
    })
    connectionField.append(connectionLabel, connectionSelect)
    const dynamic = document.createElement('div')
    dynamic.className = 'dg-modal-body'
    const paint = () => {
      dynamic.replaceChildren()
      const connection = parserConnections.find(item => item.id === selectedConnectionId)
      const inherited = connection?.model || ''
      const models = availablePlannerModels(selectedConnectionId)
      const resolved = overrideModel || inherited || 'Unavailable'
      const mode = document.createElement('div')
      mode.className = 'dg-slot-meta'
      mode.textContent = `Resolved active model: ${resolved}\nMode: ${overrideModel ? 'Override' : 'Inherited from connection'}${models.length ? '' : '\nModel enumeration unavailable; Relay can only show models exposed by configured connections.'}`
      const modelField = document.createElement('div')
      modelField.className = 'dg-field'
      const modelLabel = fieldLabel('Sidecar model override', 'Optionally chooses a different model from the selected Sidecar connection. Leave it inherited to follow that connection automatically.')
      const modelSelect = document.createElement('select')
      modelSelect.className = 'dg-select'
      const inherit = document.createElement('option')
      inherit.value = ''
      inherit.textContent = inherited ? `Use connection default (${inherited})` : 'Use connection default'
      inherit.selected = !overrideModel
      modelSelect.appendChild(inherit)
      for (const model of models) {
        const option = document.createElement('option')
        option.value = model
        option.textContent = model
        option.selected = model === overrideModel
        modelSelect.appendChild(option)
      }
      modelSelect.disabled = !models.length && !inherited
      modelSelect.addEventListener('change', () => { overrideModel = modelSelect.value; paint() })
      const modelActions = document.createElement('div')
      modelActions.className = 'dg-actions'
      modelActions.append(
        modelSelect,
        button('Refresh Models', () => {
          ctx.sendToBackend({ type: 'list_state', chatId: activeChatId })
          showToast('info', 'Refreshing parser connections and exposed models.')
        }, false, 'subtle'),
      )
      modelField.append(modelLabel, modelActions)
      dynamic.append(mode, modelField)
    }
    paint()
    const actions = document.createElement('div')
    actions.className = 'dg-actions'
    actions.append(
      button('Save', () => {
        patchProseSettings({ plannerConnectionId: selectedConnectionId || null, plannerModel: overrideModel })
        modal.dismiss()
      }, false, 'primary'),
      button('Cancel', () => modal.dismiss(), false, 'subtle'),
    )
    body.append(connectionField, dynamic, actions)
    modal.root.appendChild(body)
  }

  function availablePlannerModels(connectionId: string): string[] {
    const selected = parserConnections.find(connection => connection.id === connectionId)
    const provider = selected?.provider || ''
    const sameProvider = parserConnections.filter(connection => connection.provider === provider || connection.id === connectionId)
    return [...new Set(sameProvider.map(connection => connection.model).filter(Boolean))]
  }

  function compatibleSidecarModel(model: string, connectionId: string): string {
    if (!model) return ''
    const connection = parserConnections.find(item => item.id === connectionId)
    const models = availablePlannerModels(connectionId)
    return connection?.model && model !== connection.model && !models.includes(model) ? '' : model
  }

  function appearanceSidecarModelField(
    labelText: 'Global Appearance Sidecar Model' | 'Appearance Sidecar Model',
    connectionId: string | null,
    model: string,
    inheritedConnectionId: string | null,
    inheritedModel: string,
    onChange: (value: string) => void,
  ): HTMLElement {
    const wrapper = document.createElement('div')
    wrapper.className = 'dg-field'
    const label = fieldLabel(labelText)
    const row = document.createElement('div')
    row.className = 'dg-actions'
    const select = document.createElement('select')
    select.className = 'dg-select'
    const effectiveConnectionId = connectionId || inheritedConnectionId || ''
    const effectiveConnection = parserConnections.find(item => item.id === effectiveConnectionId)
    const inherited = connectionId ? effectiveConnection?.model || '' : inheritedModel || effectiveConnection?.model || ''
    const models = [...new Set([model, inherited, ...availablePlannerModels(effectiveConnectionId)].filter(Boolean))]
    const inherit = document.createElement('option')
    inherit.value = ''
    inherit.textContent = inherited ? `Inherit (${inherited})` : 'Inherit connection default'
    inherit.selected = !model
    select.appendChild(inherit)
    for (const availableModel of models) {
      const option = document.createElement('option')
      option.value = availableModel
      option.textContent = availableModel
      option.selected = availableModel === model
      select.appendChild(option)
    }
    select.addEventListener('change', () => onChange(select.value))
    row.append(
      select,
      button('Refresh Models', () => {
        ctx.sendToBackend({ type: 'list_state', chatId: activeChatId })
        showToast('info', 'Refreshing parser connections and exposed models.')
      }, false, 'subtle'),
    )
    const summary = document.createElement('div')
    summary.className = 'dg-slot-meta'
    summary.textContent = `${model ? 'Override' : 'Inherited'} / ${model || inherited || 'connection default'}${models.length ? ` / ${models.length} exposed model${models.length === 1 ? '' : 's'}` : ' / model enumeration unavailable'}`
    wrapper.append(label, row, summary)
    return wrapper
  }

  function parserModelField(current: RouterConfig): HTMLElement {
    const wrapper = document.createElement('div')
    wrapper.className = 'dg-field'
    const label = fieldLabel('Parser Model', 'Optional model override for Relay parsing. Leaving it inherited follows the selected Lumiverse connection.')
    const row = document.createElement('div')
    row.className = 'dg-actions'
    const select = document.createElement('select')
    select.className = 'dg-select'
    const inherited = parserConnections.find(connection => connection.id === current.parserConnectionId)?.model || ''
    const models = availablePlannerModels(current.parserConnectionId || '')
    const options = [...new Set([current.parserModel, inherited, ...models].filter(Boolean))]
    if (!options.length) options.push('')
    for (const model of options) {
      const option = document.createElement('option')
      option.value = model
      option.textContent = model || 'Model unavailable'
      option.selected = model === current.parserModel || (!current.parserModel && model === inherited)
      select.appendChild(option)
    }
    select.disabled = current.followNativeParser && !options.length
    select.addEventListener('change', () => patchConfig({ parserModel: select.value, followNativeParser: false }))
    row.append(
      select,
      button('Refresh Models', () => {
        ctx.sendToBackend({ type: 'list_state', chatId: activeChatId })
        showToast('info', 'Refreshing parser connections and exposed models.')
      }, false, 'subtle'),
    )
    const summary = document.createElement('div')
    summary.className = 'dg-slot-meta'
    summary.textContent = current.followNativeParser
      ? 'Following native parser settings.'
      : `Active: ${current.parserModel || inherited || 'Unavailable'}${models.length ? ` / ${models.length} exposed model${models.length === 1 ? '' : 's'}` : ' / model enumeration unavailable'}`
    wrapper.append(label, row, summary)
    return wrapper
  }

  function currentProseSettings(): ProseIllustratorSettings {
    const fallback: ProseIllustratorSettings = {
      enabled: true, automaticProtocolInjection: true, instantIllustrationDispatch: false, mode: 'inline-protocol', promptFormat: 'natural-language', plannerConnectionId: config?.parserConnectionId || null, plannerModel: config?.parserModel || '',
      plannerParameters: {}, contextMessageCount: 4, maximumCharacters: 2, frequencyMode: 'key-moments',
      everyNEligibleMessages: 3, maximumOpportunitiesPerMessage: 3, maximumIllustrationsPerMessage: 3, illustrationsPerRun: 1,
      minimumImages: 1, maximumImages: 3, modelPlacedCountMode: 'fixed', perspectiveMode: 'scene-snapshot', imageAlignment: 'center', imageSize: 'medium', adaptiveMode: true,
      defaultPromptProfileId: config?.defaultPromptProfileId || 'auto', defaultAspectRatio: 'adaptive', promptRegistry: {}, promptRegistryVersions: { ...DEFAULT_PROMPT_REGISTRY_VERSIONS }, appearanceMemoryEnabled: true, useGlobalAppearanceSidecar: true, appearanceSidecarConnectionId: null, appearanceSidecarModel: '', appearanceSidecarParameters: {},
      customPromptPrefix: '', customNegativePrefix: '', stripGenericStyleBoilerplate: true,
      defaultCandidateCount: config?.defaultCandidateCount || 1, continuityStrength: config?.vaultStrength || 'medium', appearanceMemoryOverride: 'global',
      reuseAcceptedReferences: true, reuseLocationReferences: true, placementPolicy: 'after-beat', relayInsertionMode: 'auto',
      showCaptions: true, autoGenerateRequiresApproval: false, immediateDispatchOnOpportunitySelection: false,
      reanalyzeEditedMessages: true, skipOoc: true, skipUtilities: true,
      skipShortMessages: true, skipContinuation: false, skipImpersonation: false, skipTestFixtures: true,
      minimumMessageLength: 180, highResolutionModifier: false, characterOnlySubjects: '', modelPlacedProtocolOverride: REVERIE_ILLUSTRATION_PROTOCOL, relayPlannedProtocolOverride: REVERIE_RELAY_PLANNED_PROTOCOL, characterOnlyFramingPrompt: DEFAULT_ILLUSTRATOR_FRAMING_PROMPTS['solo-scene'], sceneLedFramingPrompt: DEFAULT_ILLUSTRATOR_FRAMING_PROMPTS['scene-snapshot'], continuityFramePrompt: DEFAULT_ILLUSTRATOR_FRAMING_PROMPTS['sequence'], expressiveFramePrompt: DEFAULT_ILLUSTRATOR_FRAMING_PROMPTS['emotional-beat'], paused: false,
    }
    const globalSettings = pendingProseSettingsWrite?.settings || config?.proseIllustratorSettings || proseIllustrator.settings?.__global__ || fallback
    const chatSettings = activeChatId ? proseIllustrator.settings?.[activeChatId] : undefined
    const effective = { ...fallback, ...globalSettings, paused: chatSettings?.paused === true }
    return effective.mode === 'model-placed' ? { ...effective, mode: 'inline-protocol', automaticProtocolInjection: true } : effective
  }

  function settingsModeOff(): boolean {
    return currentProseSettings().mode === 'off'
  }

  function patchProseSettings(settings: Partial<ProseIllustratorSettings>): void {
    const merged = { ...currentProseSettings(), ...settings }
    pendingProseSettingsWrite = { settings: merged, sentAt: Date.now() }
    proseIllustrator = {
      ...proseIllustrator,
      settings: {
        ...(proseIllustrator.settings || {}),
        __global__: merged,
        ...(activeChatId ? { [activeChatId]: { ...merged, paused: proseIllustrator.settings?.[activeChatId]?.paused === true } } : {}),
      },
    }
    if (config) config = { ...config, proseIllustratorSettings: merged }
    // Interface-only presentation controls must take effect immediately. They
    // do not need to wait for the backend state echo (which may be delayed
    // while a generation queue is active).
    applyGlobalInterfaceSettings()
    if (!proseSettingsRenderFrame) {
      proseSettingsRenderFrame = window.requestAnimationFrame(() => {
        proseSettingsRenderFrame = 0
        renderPanel()
      })
    }
    ctx.sendToBackend({ type: 'set_config', chatId: activeChatId, patch: { proseIllustratorSettings: merged } })
  }

  function sendProseAction(payload: Record<string, unknown>): void {
    if (!activeChatId) return
    ctx.sendToBackend({ type: 'prose_illustrator_action', chatId: activeChatId, ...payload })
  }

  function abortActiveGeneration(): void {
    if (!activeChatId) return
    cancelPendingLifecycleScans()
    ctx.sendToBackend({ type: 'queue_action', chatId: activeChatId, action: 'abort_all' })
    localSidecarAnalysisStartedAt = 0
    updateSidecarTicker()
    // The backend sends one authoritative abort acknowledgement/notice. Avoid
    // an optimistic toast here; it used to stack on top of that notice.
    renderRelayOrb()
  }

  function openDryRunReport(report: DryRunReport): void {
    const modal = ctx.ui.showModal({ title: `Dry Run · ${report.title}`, width: 900 })
    modal.root.classList.add('dg-router-panel', 'dg-modal-host')
    const body = document.createElement('div'); body.className = 'dg-modal-body'
    const banner = document.createElement('div'); banner.className = 'dg-recovery-note'
    banner.textContent = report.simulationOnly
      ? 'Simulation only. Relay ran the planning pipeline but did not generate, queue, insert, or link an image.'
      : 'No image was generated. This is the exact request Relay would send after resolution.'
    const summary = document.createElement('div'); summary.className = 'dg-meta-grid'
    const rows: Array<[string, string]> = [
      ['Origin', report.origin],
      ['Connection', `${report.connectionName || report.connectionId || 'Missing'}${report.provider ? ` · ${report.provider}` : ''}`],
      ['Model', report.model || 'Missing'],
      ['Size', `${report.aspectRatio || 'native'} · ${report.width || '?'}×${report.height || '?'}`],
      ['Subjects', report.subjects.join(', ') || 'None resolved'],
      ['People policy', report.peoplePolicy || 'auto'],
      ['Gallery destination', report.galleryDestination],
      ...(report.telemetry ? [['Model calls', String(report.telemetry.modelCalls)], ['Estimated input tokens', String(report.telemetry.estimatedInputTokens)], ['Image generation calls', '0']] as Array<[string, string]> : []),
    ]
    for (const [labelText, value] of rows) {
      const label = document.createElement('div'); label.className = 'dg-meta-label'; label.textContent = labelText
      const cell = document.createElement('div'); cell.textContent = value
      summary.append(label, cell)
    }
const prompt = document.createElement('pre'); prompt.className = 'dg-pre'; prompt.textContent = `POSITIVE PROMPT\n${report.prompt || '(empty)'}\n\nNEGATIVE PROMPT\n${report.negativePrompt || '(empty)'}\n\nLORAS\n${report.loras.map(row => `${row.name} @ ${row.weightModel}${row.weightClip !== undefined ? ` / clip ${row.weightClip}` : ''}`).join('\n') || 'None'}\n\nAPPEARANCE MEMORY\n${report.vaultFacts.map(row => `${row.character} · ${row.layer}: ${row.value}`).join('\n') || 'None'}\n\nANCHOR\n${report.anchor ? JSON.stringify(report.anchor, null, 2) : 'None'}\n\nWARNINGS\n${report.warnings.join('\n') || 'None'}`
    const telemetry = document.createElement('pre'); telemetry.className = 'dg-pre'
    telemetry.textContent = report.telemetry ? `PIPELINE TELEMETRY\n${JSON.stringify(report.telemetry, null, 2)}` : 'PIPELINE TELEMETRY\nNot recorded'
    const details = document.createElement('details'); details.className = 'dg-manage'
    const detailsSummary = document.createElement('summary'); detailsSummary.textContent = 'Resolved parameters and request JSON'
    const raw = document.createElement('pre'); raw.className = 'dg-pre'; raw.textContent = JSON.stringify({ parameters: report.finalParameters, request: report.finalRequestPreview }, null, 2)
    details.append(detailsSummary, raw)
    const actions = document.createElement('div'); actions.className = 'dg-actions'
    actions.append(button('Copy Dry Run', () => void copyText(JSON.stringify(report, null, 2), 'Dry Run copied.'), false, 'subtle'), button('Close', () => modal.dismiss(), false, 'primary'))
    body.append(banner, summary, prompt, telemetry, details, actions); modal.root.appendChild(body)
  }

  function openGenerationBlockers(scope: string, blockers: GenerationBlocker[]): void {
    const modal = ctx.ui.showModal({ title: 'Why Didn’t This Generate?', width: 760 })
    modal.root.classList.add('dg-router-panel', 'dg-modal-host')
    const body = document.createElement('div'); body.className = 'dg-modal-body'
    const note = document.createElement('div'); note.className = 'dg-recovery-note'; note.textContent = `Relay checked the ${scope} workflow and found the following conditions.`
    body.appendChild(note)
    for (const blocker of blockers) {
      const card = document.createElement('div'); card.className = `dg-slot-card dg-slot-${blocker.severity === 'error' ? 'failed' : blocker.severity === 'warning' ? 'recovered-pending' : 'completed'}`
      const title = document.createElement('strong'); title.textContent = blocker.title
      const detail = document.createElement('div'); detail.className = 'dg-slot-meta'; detail.textContent = `${blocker.code}\n${blocker.detail}${blocker.action ? `\nNext action: ${blocker.action}` : ''}`
      card.append(title, detail); body.appendChild(card)
    }
    const actions = document.createElement('div'); actions.className = 'dg-actions'
    actions.append(button('Open Logs', () => { modal.dismiss(); activeTab = 'logs'; renderPanel() }, false, 'subtle'), button('Close', () => modal.dismiss(), false, 'primary'))
    body.appendChild(actions); modal.root.appendChild(body)
  }

  function openJsonModal(titleText: string, value: unknown): void {
    const modal = ctx.ui.showModal({ title: titleText, width: 760, persistent: true })
    modal.root.classList.add('dg-router-panel', 'dg-modal-host')
    const body = document.createElement('div')
    body.className = 'dg-modal-body'
    const pre = document.createElement('pre')
    pre.className = 'dg-pre'
    pre.textContent = JSON.stringify(value, null, 2)
    const actions = document.createElement('div')
    actions.className = 'dg-actions'
    actions.append(
      button('Copy JSON', () => void copyText(JSON.stringify(value, null, 2), 'JSON copied.'), false, 'subtle'),
      button('Close', () => modal.dismiss(), false, 'primary'),
    )
    body.append(pre, actions)
    modal.root.appendChild(body)
  }

  function renderAssetLibrary(): HTMLElement {
    const box = document.createElement('div')
    const assets = Object.values(assetLibrary.assets || {}).sort((a, b) => (b.lastUsedAt || b.updatedAt) - (a.lastUsedAt || a.updatedAt))
    const controls = document.createElement('div')
    controls.className = 'dg-filter-row dg-asset-toolbar'
    const search = document.createElement('input')
    search.type = 'search'
    search.className = 'dg-input dg-asset-search'
    search.placeholder = 'Search assets, tags, prompts, metadata'
    search.value = assetQuery
    search.addEventListener('input', () => { assetQuery = search.value; renderPanel() })
    const target = document.createElement('select')
    target.className = 'dg-select dg-asset-select'
    for (const value of ['all', ...Array.from(new Set(assets.map(asset => asset.target)))] as Array<ImageTarget | 'all'>) {
      const option = document.createElement('option')
      option.value = value
      option.textContent = value === 'all' ? 'All targets' : value
      option.selected = assetTargetFilter === value
      target.appendChild(option)
    }
    target.addEventListener('change', () => { assetTargetFilter = target.value as ImageTarget | 'all'; renderPanel() })
    controls.append(
      search,
      target,
      button(assetFavoriteOnly ? 'All Assets' : 'Favorites Only', () => { assetFavoriteOnly = !assetFavoriteOnly; renderPanel() }, false, 'subtle'),
    )
    box.appendChild(panelSection('Assets', controls))
    const compare = renderAssetCompare()
    if (compare) box.appendChild(compare)
    const filtered = assets.filter(matchesAssetFilters)
    if (!filtered.length) box.appendChild(empty(assets.length ? 'No assets match the current filters.' : 'No generated Relay assets are indexed yet.'))
    else {
      const list = document.createElement('div')
      list.className = 'dg-history-track'
      for (const asset of filtered) list.appendChild(renderAssetCard(asset))
      box.appendChild(list)
    }
    return box
  }

  function renderAssetCompare(): HTMLElement | null {
    const left = assetLibrary.compare?.leftAssetId ? assetLibrary.assets[assetLibrary.compare.leftAssetId] : null
    const right = assetLibrary.compare?.rightAssetId ? assetLibrary.assets[assetLibrary.compare.rightAssetId] : null
    if (!left || !right) return null
    const wrap = document.createElement('section')
    wrap.className = 'dg-section'
    const title = document.createElement('h3')
    title.className = 'dg-section-title'
    title.textContent = 'Compare Assets'
    const grid = document.createElement('div')
    grid.className = 'dg-history-track'
    grid.append(renderAssetCard(left, true), renderAssetCard(right, true))
    wrap.append(title, grid, button('Clear Compare', () => activeChatId && ctx.sendToBackend({ type: 'asset_library_action', chatId: activeChatId, action: 'clear_compare' }), false, 'subtle'))
    return wrap
  }

  function renderAssetCard(asset: VisualAssetReference, compact = false): HTMLElement {
    const card = document.createElement('article')
    card.className = `dg-asset-card${compact ? ' dg-asset-card-compact' : ''}${asset.sourceDeletedAt ? ' is-archived' : ''}`
    const image = asset.imageUrl && asset.status === 'available' ? document.createElement('img') : document.createElement('div')
    image.className = image instanceof HTMLImageElement ? 'dg-asset-card-thumb' : 'dg-asset-card-thumb dg-thumb-empty'
    if (image instanceof HTMLImageElement) {
      image.src = asset.imageUrl
      image.alt = asset.alt || asset.caption || asset.slot
    } else image.textContent = asset.status === 'available' ? 'No preview' : titleCase(asset.status)
    image.title = asset.imageUrl ? 'Open image' : 'Image unavailable'
    image.addEventListener('click', () => openAssetImage(asset))
    const main = document.createElement('div')
    main.className = 'dg-asset-card-main'
    const title = document.createElement('div')
    title.className = 'dg-asset-card-title'
    title.textContent = `${asset.favorite ? '★ ' : ''}${asset.caption || asset.alt || briefAssetTitle(asset)}`
    const meta = document.createElement('div')
    meta.className = 'dg-asset-card-meta'
    meta.textContent = `${new Date(asset.createdAt).toLocaleString()} · Chat ${asset.chatId} · ${asset.characterNames.join(', ') || 'No character'} · ${titleCase(asset.target)} · ${titleCase(String((asset.metadata || {}).surfaceId || asset.targetApp))} · ${asset.status}${asset.visualReference ? ' · Reference' : ''}${asset.sourceDeletedAt ? ` · Retained after source deletion ${new Date(asset.sourceDeletedAt).toLocaleString()}` : ''}`
    const prompt = document.createElement('div')
    prompt.className = 'dg-asset-card-summary'
    prompt.textContent = asset.originalSceneBrief || asset.resolvedPositivePrompt || 'No scene summary available.'
    const chips = document.createElement('div')
    chips.className = 'dg-chip-row dg-asset-card-chips'
    for (const text of [titleCase(asset.target), ...asset.characterNames.slice(0, 2), ...asset.locationNames.slice(0, 1)]) {
      if (!text) continue
      const chip = document.createElement('span')
      chip.className = 'dg-chip'
      chip.textContent = text
      chips.appendChild(chip)
    }
    const actions = document.createElement('div')
    actions.className = 'dg-actions dg-asset-card-actions'
    const originalTarget = !compact ? originalReuseSlot(asset) : undefined
    actions.append(
      button('Open', () => openAssetImage(asset), !asset.imageUrl, 'primary'),
      button(asset.favorite ? '★' : '☆', () => sendAssetAction(asset.assetId, asset.favorite ? 'unfavorite' : 'favorite'), false, 'subtle', asset.favorite ? 'Remove from favorites' : 'Add to favorites'),
    )
    if (!compact) {
      actions.append(
        button('Restore Original', () => restoreOriginalAsset(asset), !originalTarget, 'subtle', originalTarget ? `Restore ${originalTarget.requestId} / ${originalTarget.slot}` : 'Original slot is unavailable. Choose a destination slot.'),
        button('Use in Slot…', () => openAssetDestinationPicker(asset), !compatibleReuseSlots(asset).length, 'subtle'),
      )
    }
    let moreButton: HTMLButtonElement
    moreButton = button('•••', () => {
      const rect = moreButton.getBoundingClientRect()
      openAssetActionMenu(asset, rect.right, rect.bottom + 4)
    }, false, 'subtle', 'More asset actions')
    actions.appendChild(moreButton)
    main.append(title, meta, prompt, chips, actions)
    card.append(image, main)
    return card
  }

  function briefAssetTitle(asset: VisualAssetReference): string {
    const source = asset.originalSceneBrief || asset.resolvedPositivePrompt || `${appLabel(asset)} ${slotLabel(asset)}`
    const clean = source.replace(/\s+/g, ' ').trim()
    return clean.length > 62 ? `${clean.slice(0, 59)}…` : clean
  }

  function openAssetActionMenu(asset: VisualAssetReference, x: number, y: number): void {
    closeActionMenu()
    const menu = document.createElement('div')
    menu.className = 'dg-router-panel dg-menu'
    const compare = () => {
      if (selectedAssetId && selectedAssetId !== asset.assetId && activeChatId) {
        ctx.sendToBackend({ type: 'asset_library_action', chatId: activeChatId, action: 'compare', assetId: selectedAssetId, otherAssetId: asset.assetId })
        selectedAssetId = ''
      } else {
        selectedAssetId = asset.assetId
        showToast('info', 'Select another asset to compare.')
      }
    }
    const rows: Array<[string, () => void, boolean]> = [
      ['Restore Original', () => restoreOriginalAsset(asset), !originalReuseSlot(asset)],
      ['Use in Slot…', () => openAssetDestinationPicker(asset), !compatibleReuseSlots(asset).length],
      [asset.visualReference ? 'Clear Visual Reference' : 'Mark as Visual Reference', () => sendAssetAction(asset.assetId, asset.visualReference ? 'clear_reference' : 'mark_reference'), false],
      [selectedAssetId && selectedAssetId !== asset.assetId ? 'Compare with Selected' : 'Select for Compare', compare, false],
      ['Metadata', () => openAssetMetadata(asset), false],
      ['Copy Image URL', () => void copyText(asset.imageUrl, 'Image URL copied'), !asset.imageUrl],
      ['Copy Image ID', () => void copyText(asset.imageId, 'Image ID copied'), !asset.imageId],
      ['Copy Prompt', () => void copyText(asset.resolvedPositivePrompt, 'Prompt copied'), !asset.resolvedPositivePrompt],
      ['Copy Asset JSON', () => void copyText(JSON.stringify(asset, null, 2), 'Asset JSON copied'), false],
    ]
    for (const [label, handler, disabled] of rows) {
      const item = document.createElement('button')
      item.type = 'button'
      item.textContent = label
      item.disabled = disabled
      item.addEventListener('click', () => {
        closeActionMenu()
        handler()
      })
      menu.appendChild(item)
    }
    document.body.appendChild(menu)
    document.body.classList.add('dg-relay-menu-open')
    const rect = menu.getBoundingClientRect()
    menu.style.left = `${Math.max(8, Math.min(x - rect.width, window.innerWidth - rect.width - 8))}px`
    menu.style.top = `${Math.max(8, Math.min(y, window.innerHeight - rect.height - 8))}px`
    menuEl = menu
    attachMenuDismissHandlers(menu)
  }

  function matchesAssetFilters(asset: VisualAssetReference): boolean {
    if (assetFavoriteOnly && !asset.favorite) return false
    if (assetTargetFilter !== 'all' && asset.target !== assetTargetFilter) return false
    const query = assetQuery.trim().toLocaleLowerCase()
    if (!query) return true
    const haystack = JSON.stringify({
      caption: asset.caption, alt: asset.alt, tags: asset.tags, characters: asset.characterNames,
      locations: asset.locationNames, prompt: asset.resolvedPositivePrompt, negative: asset.resolvedNegativePrompt,
      scene: asset.originalSceneBrief, metadata: asset.metadata, target: asset.target, profile: asset.promptProfileId,
    }).toLocaleLowerCase()
    return haystack.includes(query)
  }

  function sendAssetAction(assetId: string, action: 'favorite' | 'unfavorite' | 'mark_reference' | 'clear_reference'): void {
    if (!activeChatId) return
    ctx.sendToBackend({ type: 'asset_library_action', chatId: activeChatId, assetId, action })
  }

  function assetSourceSlotKey(asset: VisualAssetReference): string {
    return `${asset.chatId}:${asset.messageId}:${asset.swipeId}:${asset.requestId}:${asset.slot}`
  }

  function originalReuseSlot(asset: VisualAssetReference): SlotRecord | undefined {
    if (asset.chatId !== activeChatId) return undefined
    const key = assetSourceSlotKey(asset)
    return records.find(record => record.key === key)
  }

  function compatibleReuseSlots(asset: VisualAssetReference): SlotRecord[] {
    return records.filter(record =>
      record.chatId === activeChatId &&
      record.status === 'completed' &&
      Boolean(record.imageUrl) &&
      (record.target === asset.target || record.targetApp === asset.targetApp))
  }

  function restoreOriginalAsset(asset: VisualAssetReference): void {
    const target = originalReuseSlot(asset)
    if (!activeChatId || !target) {
      showToast('warning', 'Original slot is unavailable. Choose a destination slot.')
      return
    }
    ctx.sendToBackend({ type: 'reuse_asset_in_slot', chatId: activeChatId, key: target.key, assetId: asset.assetId })
  }

  function openAssetDestinationPicker(asset: VisualAssetReference): void {
    const destinations = compatibleReuseSlots(asset)
    const modal = ctx.ui.showModal({ title: 'Use Archive Image in Slot', width: 720, persistent: true })
    modal.root.classList.add('dg-router-panel', 'dg-modal-host')
    const body = document.createElement('div'); body.className = 'dg-modal-body'
    const note = document.createElement('div'); note.className = 'dg-recovery-note'
    note.textContent = destinations.length ? 'Choose the exact destination. Relay will not guess.' : 'No compatible destination slots are available in the active chat.'
    body.appendChild(note)
    for (const record of destinations) {
      const row = document.createElement('div'); row.className = 'dg-slot-card'
      const title = document.createElement('div'); title.className = 'dg-history-title'; title.textContent = `${appLabel(record)} / ${record.requestId} / ${record.slot}`
      const summary = document.createElement('div'); summary.className = 'dg-history-prompt'; summary.textContent = record.originalSceneBrief || record.caption || record.alt || 'No scene summary'
      if (record.imageUrl) {
        const image = document.createElement('img'); image.className = 'dg-history-thumb'; image.src = record.imageUrl; image.alt = record.alt || record.slot; row.appendChild(image)
      }
      const use = button('Use Here', () => {
        if (!activeChatId) return
        ctx.sendToBackend({ type: 'reuse_asset_in_slot', chatId: activeChatId, key: record.key, assetId: asset.assetId })
        modal.dismiss()
      }, false, 'primary')
      row.append(title, summary, use)
      body.appendChild(row)
    }
    body.appendChild(button('Cancel', () => modal.dismiss(), false, 'subtle'))
    modal.root.appendChild(body)
  }

  function openAssetMetadata(asset: VisualAssetReference): void {
    const modal = ctx.ui.showModal({ title: 'Relay Asset Metadata', width: 760 })
    const body = document.createElement('div')
    body.className = 'dg-modal'
    const actions = document.createElement('div')
    actions.className = 'dg-actions'
    actions.append(
      button('Copy Image URL', () => void copyText(asset.imageUrl, 'Image URL copied'), !asset.imageUrl, 'subtle'),
      button('Copy Image ID', () => void copyText(asset.imageId, 'Image ID copied'), !asset.imageId, 'subtle'),
      button('Copy Prompt', () => void copyText(asset.resolvedPositivePrompt, 'Prompt copied'), !asset.resolvedPositivePrompt, 'subtle'),
      button('Copy JSON', () => void copyText(JSON.stringify(asset, null, 2), 'Asset JSON copied'), false, 'subtle'),
    )
    const pre = document.createElement('pre')
    pre.className = 'dg-json'
    pre.textContent = JSON.stringify({ asset, versionTree: versionTrees.find(tree => tree.treeId === asset.rootVersionId || tree.slotKey === `${asset.chatId}:${asset.messageId}:${asset.swipeId}:${asset.requestId}:${asset.slot}`) }, null, 2)
    body.append(actions, pre)
    modal.root.appendChild(body)
  }

  function openAssetImage(asset: VisualAssetReference): void {
    if (!asset.imageUrl) return
    const modal = ctx.ui.showModal({ title: asset.caption || asset.alt || `${appLabel(asset)} / ${slotLabel(asset)}`, width: 1120 })
    modal.root.classList.add('dg-router-panel', 'dg-modal-host', 'dg-asset-lightbox')
    fitRelayLightboxHost(modal)
    const body = document.createElement('div')
    body.className = 'dg-modal-body dg-asset-lightbox-body'
    const stage = document.createElement('div')
    stage.className = 'dg-image-lightbox-viewport dg-asset-lightbox-stage'
    const img = document.createElement('img')
    img.className = 'dg-lightbox-img dg-asset-lightbox-image'
    img.src = asset.imageUrl
    img.alt = asset.alt || asset.caption || asset.slot
    stage.appendChild(img)
    bindImageLightboxZoom(img, stage)
    const details = document.createElement('div')
    details.className = 'dg-asset-lightbox-details'
    const summary = document.createElement('div')
    summary.className = 'dg-asset-card-summary'
    summary.textContent = asset.originalSceneBrief || asset.resolvedPositivePrompt || 'No scene summary available.'
    const actions = document.createElement('div')
    actions.className = 'dg-actions'
    actions.append(
      button(asset.favorite ? 'Unfavorite' : 'Favorite', () => sendAssetAction(asset.assetId, asset.favorite ? 'unfavorite' : 'favorite'), false, 'subtle'),
      button(asset.visualReference ? 'Clear Reference' : 'Mark Reference', () => sendAssetAction(asset.assetId, asset.visualReference ? 'clear_reference' : 'mark_reference'), false, 'subtle'),
      button('Metadata', () => openAssetMetadata(asset), false, 'subtle'),
      button('Copy Image URL', () => void copyText(asset.imageUrl, 'Image URL copied'), false, 'subtle'),
    )
    actions.prepend(
      button('Restore Original', () => restoreOriginalAsset(asset), !originalReuseSlot(asset), 'primary', originalReuseSlot(asset) ? '' : 'Original slot is unavailable. Choose a destination slot.'),
      button('Use in Slot…', () => openAssetDestinationPicker(asset), !compatibleReuseSlots(asset).length, 'subtle'),
    )
    details.append(summary, actions)
    body.append(stage, details)
    modal.root.appendChild(body)
  }

  function renderGeneticVault(): HTMLElement {
    const box = document.createElement('div')
    const characters = Object.values(continuityVault.characters || {}).sort((a, b) => a.canonicalCharacterName.localeCompare(b.canonicalCharacterName))
    if (!vaultSelectedCharacterId || !continuityVault.characters[vaultSelectedCharacterId]) vaultSelectedCharacterId = characters[0]?.canonicalCharacterId || ''
    const controls = document.createElement('div')
    controls.className = 'dg-actions'
    const activeStrength = config?.vaultStrength || continuityVault.strength
    for (const strength of ['off', 'low', 'medium', 'strong'] as ContinuityStrength[]) {
      controls.appendChild(button(strength === activeStrength ? `${titleCase(strength)} Active` : titleCase(strength), () => {
        patchConfig({ vaultStrength: strength })
      }, false, strength === activeStrength ? 'primary' : 'subtle'))
    }
    controls.append(
      button('New Character', openCreateVaultCharacter, !activeChatId, 'subtle'),
      button(currentProseSettings().appearanceMemoryEnabled ? 'Memory Active' : 'Memory Off', () => patchProseSettings({ appearanceMemoryEnabled: !currentProseSettings().appearanceMemoryEnabled }), false, currentProseSettings().appearanceMemoryEnabled ? 'primary' : 'subtle'),
    )
    const contextSummary = document.createElement('div')
    contextSummary.className = 'dg-recovery-note'
    contextSummary.textContent = 'Appearance Sidecar maintains stable identity, wardrobe, and current scene state from the active conversation and bound native identity context. Current-scene details always win; every field remains manually editable.'
    box.appendChild(panelSection('Appearance Memory', documentFragment(controls, contextSummary)))

    if (config) {
      const current = config
      const sidecar = document.createElement('div')
      sidecar.className = 'dg-settings-grid'
      sidecar.append(
        selectField('Global Appearance Sidecar Connection', current.appearanceSidecarConnectionId || '', [['', 'Use Relay Parser Connection'], ...parserConnections.map(connection => [connection.id, `${connection.name} / ${connection.model}`] as [string, string])], value => {
          patchConfig({
            appearanceSidecarConnectionId: value || null,
            appearanceSidecarModel: compatibleSidecarModel(current.appearanceSidecarModel, value || current.parserConnectionId || ''),
          })
        }),
        appearanceSidecarModelField(
          'Global Appearance Sidecar Model',
          current.appearanceSidecarConnectionId,
          current.appearanceSidecarModel,
          current.parserConnectionId,
          current.parserModel || parserConnections.find(connection => connection.id === current.parserConnectionId)?.model || '',
          value => patchConfig({ appearanceSidecarModel: value }),
        ),
        textareaInput('Global Appearance Sidecar Parameters', JSON.stringify(current.appearanceSidecarParameters || {}, null, 2), value => {
          try { patchConfig({ appearanceSidecarParameters: JSON.parse(value || '{}') }) }
          catch { showToast('warning', 'Appearance Sidecar parameters must be valid JSON.') }
        }),
      )
      box.appendChild(panelDisclosure('Appearance Sidecar Routing', sidecar))
    }

    const sheets = continuityVault.characterSheets || {}
    const summary = document.createElement('div')
    summary.className = 'dg-recovery-note'
    summary.textContent = `One character, one editable Appearance Memory with Stable Appearance and Current Outfit. The configured Appearance Sidecar maintains it automatically from the conversation and available host context; every field remains editable. Characters: ${characters.length}. Memories: ${Object.keys(sheets).length}.`
    box.appendChild(summary)
    if (!characters.length) {
    box.appendChild(empty('No appearance entries yet. Relay will maintain confirmed continuity automatically; you can also add an entry manually.'))
      return box
    }

    const characterRail = document.createElement('div')
    characterRail.className = 'dg-vault-character-grid'
    for (const character of characters) characterRail.appendChild(renderVaultCharacterCard(character))
    box.appendChild(characterRail)
    const character = continuityVault.characters[vaultSelectedCharacterId]
    if (!character) return box
    box.appendChild(renderCharacterSheetEditor(character))
    return box
  }

  function renderVaultCharacterCard(character: CanonicalVisualCharacter): HTMLElement {
    const card = document.createElement('button')
    card.type = 'button'
    card.className = `dg-vault-character-card${character.canonicalCharacterId === vaultSelectedCharacterId ? ' is-active' : ''}`
    card.onclick = () => { vaultSelectedCharacterId = character.canonicalCharacterId; renderPanel() }
    if (character.avatarUrl) {
      const img = document.createElement('img'); img.src = character.avatarUrl; img.alt = character.canonicalCharacterName; img.loading = 'lazy'; img.onerror = () => img.remove(); card.appendChild(img)
    } else {
      const initials = document.createElement('span'); initials.className = 'dg-vault-avatar-fallback'; initials.textContent = character.canonicalCharacterName.split(/\s+/).slice(0, 2).map(word => word[0] || '').join('').toUpperCase(); card.appendChild(initials)
    }
    const body = document.createElement('span'); body.className = 'dg-vault-character-body'
    const name = document.createElement('strong'); name.textContent = character.canonicalCharacterName
    const sheet = continuityVault.characterSheets?.[character.canonicalCharacterId]
    const counts = document.createElement('small')
    const aliasText = character.aliases.length ? `Aliases: ${character.aliases.join(', ')}` : 'Aliases: none'
    counts.textContent = sheet ? `${aliasText} · memory updated ${new Date(sheet.updatedAt).toLocaleString()} · ${sheet.alternateLooks.length} alternate look(s)` : `${aliasText} · Appearance Memory is awaiting learned or manual details`
    body.append(name, counts); card.appendChild(body)
    return card
  }

  function renderCharacterSheetEditor(character: CanonicalVisualCharacter): HTMLElement {
    const wrap = document.createElement('div')
    wrap.className = 'dg-slot-card'
    const existing = continuityVault.characterSheets?.[character.canonicalCharacterId]
    let booruTags = existing?.booruTags || ''
    let currentOutfitTags = existing?.currentOutfitTags || ''
    let negativeTags = existing?.negativeIdentityTags || ''
    let referenceIds = (existing?.referenceAssetIds || []).join(', ')
    const head = document.createElement('div'); head.className = 'dg-history-head'
    const title = document.createElement('div'); title.className = 'dg-history-title'; title.textContent = `${character.canonicalCharacterName} · Appearance Memory`
    head.append(title, chip(existing ? 'Saved' : 'New', existing ? 'completed' : ''))
    const source = document.createElement('div'); source.className = 'dg-recovery-note'
    source.textContent = existing ? appearanceMemoryProvenance(existing) : 'Created from: No learned or manual details yet. Appearance Sidecar maintains this automatically from the full conversation, card, persona, lorebook, native bindings, and existing memory.'
    const tagsField = textareaInput('Stable Appearance · face, body, hair, durable features', booruTags, value => { booruTags = value })
    const outfitField = textareaInput('Current Outfit · clear this when clothing is unknown or changed', currentOutfitTags, value => { currentOutfitTags = value })
    const negativeField = textareaInput('Negative Identity Tags', negativeTags, value => { negativeTags = value })
    const refsField = textareaInput('Reference Asset IDs · comma-separated', referenceIds, value => { referenceIds = value })
    const hasUnsavedAppearanceEdits = () => booruTags !== (existing?.booruTags || '')
      || currentOutfitTags !== (existing?.currentOutfitTags || '')
      || negativeTags !== (existing?.negativeIdentityTags || '')
      || referenceIds !== (existing?.referenceAssetIds || []).join(', ')
    const addSidecarRefresh = (fieldElement: HTMLElement, appearanceField: 'stable-appearance' | 'current-outfit' | 'negative-identity-tags', label: string) => {
      const row = document.createElement('div')
      row.className = 'dg-actions dg-appearance-field-actions'
      const statusKey = `${character.canonicalCharacterId}:${appearanceField}`
      const fieldStatus = appearanceActionStatuses.get(statusKey)
      const running = fieldStatus?.status === 'started'
      const rerun = button(running ? 'Rerunning…' : 'Rerun Sidecar', () => {
        if (!activeChatId) return
        if (hasUnsavedAppearanceEdits()) {
          showToast('warning', 'Save your Appearance Memory edits before rerunning the Sidecar so they are not discarded.')
          return
        }
        appearanceActionStatuses.set(statusKey, {
          operation: 'rerun-field', chatId: activeChatId, characterId: character.canonicalCharacterId,
          field: appearanceField, status: 'started', message: `Appearance Sidecar analyzing ${label}…`, receivedAt: Date.now(),
        })
        ctx.sendToBackend({ type: 'continuity_action', chatId: activeChatId, action: 'rerun_appearance_field', characterId: character.canonicalCharacterId, appearanceField })
        renderPanel()
      }, !activeChatId || running, 'subtle')
      rerun.title = `Rerun the configured Appearance Sidecar for ${label} only.`
      rerun.setAttribute('aria-label', `Rerun Appearance Sidecar for ${label}`)
      row.appendChild(rerun)
      if (fieldStatus) {
        const inline = document.createElement('span')
        inline.className = `dg-appearance-action-status is-${fieldStatus.status === 'started' ? 'running' : fieldStatus.status}`
        inline.textContent = fieldStatus.message
        inline.setAttribute('role', 'status')
        row.appendChild(inline)
      }
      fieldElement.appendChild(row)
    }
    addSidecarRefresh(tagsField, 'stable-appearance', 'Stable Appearance')
    addSidecarRefresh(outfitField, 'current-outfit', 'Current Outfit')
    addSidecarRefresh(negativeField, 'negative-identity-tags', 'Negative Identity Tags')
    const actions = document.createElement('div'); actions.className = 'dg-actions'
    const saveStatusKey = `${character.canonicalCharacterId}:save`
    const saveStatus = appearanceActionStatuses.get(saveStatusKey)
    const saving = saveStatus?.status === 'started'
    const saveButton = button(saving ? 'Saving…' : saveStatus?.status === 'success' ? 'Saved ✓' : 'Save Appearance Memory', () => {
      if (!activeChatId) return
      const operationId = `appearance-save-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
      appearanceActionStatuses.set(saveStatusKey, {
        operation: 'save', operationId, chatId: activeChatId, characterId: character.canonicalCharacterId,
        status: 'started', message: 'Saving Appearance Memory…', receivedAt: Date.now(),
      })
      saveButton.disabled = true
      saveButton.textContent = 'Saving…'
      const inline = document.querySelector<HTMLElement>(`[data-appearance-save-status="${CSS.escape(character.canonicalCharacterId)}"]`)
      if (inline) { inline.className = 'dg-appearance-action-status is-running'; inline.textContent = 'Saving Appearance Memory…' }
      try {
        ctx.sendToBackend({
          type: 'continuity_action', chatId: activeChatId, action: 'save_character_sheet',
          operationId, expectedRevision: existing?.updatedAt || 0,
          characterId: character.canonicalCharacterId, booruTags, currentOutfitTags,
          negativeIdentityTags: negativeTags,
          referenceAssetIds: referenceIds.split(',').map(value => value.trim()).filter(Boolean),
        })
      } catch (error) {
        appearanceActionStatuses.delete(saveStatusKey)
        saveButton.disabled = false
        saveButton.textContent = 'Save Appearance Memory'
        if (inline) inline.textContent = ''
        showToast('error', `Appearance Memory save could not be sent: ${error instanceof Error ? error.message : String(error)}`)
        return
      }
      const watchdog = window.setTimeout(() => {
        const pending = appearanceActionStatuses.get(saveStatusKey)
        if (pending?.operationId !== operationId || pending.status !== 'started') return
        appearanceActionStatuses.set(saveStatusKey, { ...pending, status: 'unknown', message: `Save timed out — verify/retry · operation ${operationId}`, receivedAt: Date.now() })
        appearanceSaveWatchdogs.delete(operationId)
        saveButton.disabled = false
        saveButton.textContent = 'Retry Save'
        const inline = document.querySelector<HTMLElement>(`[data-appearance-save-status="${CSS.escape(character.canonicalCharacterId)}"]`)
        if (inline) { inline.className = 'dg-appearance-action-status is-unknown'; inline.textContent = `Save timed out — verify/retry · operation ${operationId}` }
      }, 15_000)
      appearanceSaveWatchdogs.set(operationId, watchdog)
    }, !activeChatId || saving, 'primary')
    saveButton.dataset.appearanceSaveCharacter = character.canonicalCharacterId
    actions.append(
      saveButton,
      button('Edit Aliases', () => {
        if (!activeChatId) return
        const next = window.prompt(`Aliases for ${character.canonicalCharacterName} · comma-separated`, character.aliases.join(', '))
        if (next === null) return
        ctx.sendToBackend({ type: 'continuity_action', chatId: activeChatId, action: 'update_character_aliases', characterId: character.canonicalCharacterId, aliases: next.split(',').map(value => value.trim()).filter(Boolean) })
      }, !activeChatId, 'subtle'),
      button('Add Alternate Look', () => openAddAlternateLook(character), !activeChatId || !existing, 'subtle'),
      button('Delete Memory', () => {
        if (!activeChatId) return
        removeAppearanceMemoryOptimistically(character.canonicalCharacterId, false)
        ctx.sendToBackend({ type: 'continuity_action', chatId: activeChatId, action: 'delete_character_sheet', characterId: character.canonicalCharacterId })
      }, !activeChatId || !existing, 'danger'),
      button('Delete Character', () => {
        if (!activeChatId || !window.confirm(`Delete ${character.canonicalCharacterName} and all of their Appearance Memory data?`)) return
        removeAppearanceMemoryOptimistically(character.canonicalCharacterId, true)
        ctx.sendToBackend({ type: 'continuity_action', chatId: activeChatId, action: 'delete_character', characterId: character.canonicalCharacterId })
      }, !activeChatId, 'danger'),
    )
    const saveInline = document.createElement('span')
    saveInline.dataset.appearanceSaveStatus = character.canonicalCharacterId
    saveInline.className = `dg-appearance-action-status${saveStatus ? ` is-${saveStatus.status === 'started' ? 'running' : saveStatus.status}` : ''}`
    saveInline.textContent = saveStatus?.message || ''
    saveInline.setAttribute('role', 'status')
    actions.appendChild(saveInline)
    wrap.append(head, source, tagsField, outfitField, negativeField, refsField, actions)
    if (existing?.alternateLooks.length) {
      const looks = document.createElement('div'); looks.className = 'dg-history-track'
      for (const look of existing.alternateLooks) {
        const card = document.createElement('div'); card.className = 'dg-slot-card'
        const t = document.createElement('div'); t.className = 'dg-history-title'; t.textContent = look.name
        const p = document.createElement('div'); p.className = 'dg-history-prompt'; p.textContent = look.booruTags
        const lookActions = document.createElement('div'); lookActions.className = 'dg-actions'
        lookActions.append(
          button(existing.activeAlternateLookId === look.lookId ? 'Active Look' : 'Use Look', () => activeChatId && ctx.sendToBackend({ type: 'continuity_action', chatId: activeChatId, action: 'activate_alternate_look', characterId: character.canonicalCharacterId, lookId: look.lookId }), !activeChatId || existing.activeAlternateLookId === look.lookId, 'subtle'),
          button('Remove Alternate Look', () => activeChatId && ctx.sendToBackend({ type: 'continuity_action', chatId: activeChatId, action: 'remove_alternate_look', characterId: character.canonicalCharacterId, lookId: look.lookId }), !activeChatId, 'danger'),
        )
        card.append(t, p, lookActions)
        looks.appendChild(card)
      }
      const baseActions = document.createElement('div'); baseActions.className = 'dg-actions'
      baseActions.append(button('Return to Base Appearance', () => activeChatId && ctx.sendToBackend({ type: 'continuity_action', chatId: activeChatId, action: 'return_to_base', characterId: character.canonicalCharacterId }), !activeChatId || !existing.activeAlternateLookId, 'subtle'))
      wrap.append(panelSection('Optional Alternate Looks', looks), baseActions)
    }
    return wrap
  }

  function appearanceMemoryProvenance(sheet: AppearanceCharacterSheet): string {
    const source = String(sheet.sourceSentence || '').trim()
    if (!source) return 'Created from: Appearance Memory'
    if (/manual/i.test(source)) return 'Created from: Manual Appearance Memory entry'
    if (/sidecar/i.test(source)) return 'Maintained by: Appearance Sidecar'
    if (/canonical/i.test(source)) return 'Maintained by: Canonical Appearance Memory'
    return `Last appearance update: ${source.slice(0, 140)}`
  }

  function openAddAlternateLook(character: CanonicalVisualCharacter): void {
    const modal = ctx.ui.showModal({ title: `Alternate Look · ${character.canonicalCharacterName}`, width: 680, persistent: true })
    modal.root.classList.add('dg-router-panel', 'dg-modal-host')
    const body = document.createElement('div'); body.className = 'dg-modal-body'
    let lookName = ''
    let booruTags = ''
    let negativeIdentityTags = ''
    let referenceIds = ''
    const actions = document.createElement('div'); actions.className = 'dg-actions'
    actions.append(
      button('Save Alternate Look', () => {
        if (!activeChatId || !booruTags.trim()) return
        ctx.sendToBackend({ type: 'continuity_action', chatId: activeChatId, action: 'add_alternate_look', characterId: character.canonicalCharacterId, lookName, booruTags, negativeIdentityTags, referenceAssetIds: referenceIds.split(',').map(value => value.trim()).filter(Boolean) })
        modal.dismiss()
      }, !activeChatId, 'primary'),
      button('Cancel', () => modal.dismiss(), false, 'subtle'),
    )
    body.append(
      textareaInput('Look Name', lookName, value => { lookName = value }),
      textareaInput('Alternate Look Booru Tags', booruTags, value => { booruTags = value }),
      textareaInput('Negative Identity Tags', negativeIdentityTags, value => { negativeIdentityTags = value }),
      textareaInput('Reference Asset IDs · comma-separated', referenceIds, value => { referenceIds = value }),
      actions,
    )
    modal.root.appendChild(body)
  }

  function openCreateVaultCharacter(): void {
    if (!activeChatId) return
    const modal = ctx.ui.showModal({ title: 'Add Character to Appearance Memory', width: 680, persistent: true })
    modal.root.classList.add('dg-router-panel', 'dg-modal-host', 'dg-vault-editor-modal')
    const body = document.createElement('div')
    body.className = 'dg-modal-body dg-vault-editor'
    const hero = document.createElement('div')
    hero.className = 'dg-vault-editor-hero'
    const glyph = document.createElement('div')
    glyph.className = 'dg-vault-editor-glyph'
    glyph.textContent = '✦'
    const copy = document.createElement('div')
    copy.innerHTML = '<strong>Create a visual identity</strong><span>Use the name the story uses most often. Aliases help Relay recognize nicknames, surnames, and alternate spellings during scans.</span>'
    hero.append(glyph, copy)
    const form = document.createElement('div')
    form.className = 'dg-vault-form-grid'
    const name = textInput('Canonical Character Name', '', () => undefined)
    const aliases = textInput('Aliases (comma separated)', '', () => undefined)
    name.classList.add('dg-field-wide')
    aliases.classList.add('dg-field-wide')
    const tip = document.createElement('div')
    tip.className = 'dg-recovery-note dg-field-wide'
    tip.textContent = 'Example: Canonical name “Alpha”; aliases “Alpha, Alpha Alias”. Relay never turns an inferred prose subject into a permanent character automatically.'
    form.append(name, aliases, tip)
    const actions = document.createElement('div')
    actions.className = 'dg-actions dg-modal-footer'
    actions.append(button('Cancel', () => modal.dismiss(), false, 'subtle'), button('Create Character', () => {
      const characterName = fieldText(name, 'input')
      const aliasList = fieldText(aliases, 'input').split(',').map(item => item.trim()).filter(Boolean)
      if (!characterName) { showToast('warning', 'Canonical name is required.'); return }
      ctx.sendToBackend({ type: 'continuity_action', chatId: activeChatId!, action: 'create_character', characterName, aliases: aliasList })
      modal.dismiss()
    }, false, 'primary'))
    body.append(hero, form, actions)
    modal.root.appendChild(body)
  }

  function renderTrackerIllustrationGuide(): HTMLElement {
    const guide = document.createElement('div')
    guide.className = 'dg-stack'
    const explanation = document.createElement('div')
    explanation.className = 'dg-info-note'
    explanation.innerHTML = '<strong>Keep the tracker. Add one owned media region.</strong><br>A pre-existing tracker does not become a prose illustration. Put a complete <code>target="custom.artifact-media"</code> request inside the tracker child that owns the finished image, then teach the Story Model that exact updated structure.'
    const steps = document.createElement('div')
    steps.className = 'dg-manual-list'
    for (const step of [
      'Keep the tracker’s current wrapper, field names, ordering, and Regex presentation contract.',
      'Choose or add one semantic child that owns the image, such as <tracker_media>. The request stays inside that owner while pending, generating, completed, failed, retried, reparsed, and reloaded.',
      'Use one stable unique id and the same stable slot, target="custom.artifact-media", an allowed aspect ratio, useful alt text, and a complete scene_brief.',
      'Put the exact revised tracker skeleton in its custom Surface Utility. If you maintain the tracker entirely in a preset instead, place {{reverie_artifact_media_protocol}} there once. Do not add both manual and automatic copies.',
      'Enable that custom Surface Utility in the Surface Library, then use View Exact Injected Prompt to confirm the Story Model receives it before a live generation.',
    ]) {
      const row = document.createElement('div')
      row.textContent = step
      steps.appendChild(row)
    }
    const example = document.createElement('pre')
    example.className = 'dg-pre'
    example.textContent = COPYABLE_TRACKER_IMAGE_PATTERN
    const actions = document.createElement('div')
    actions.className = 'dg-actions'
    actions.append(
      button('Copy Tracker Image Pattern', () => void copyText(COPYABLE_TRACKER_IMAGE_PATTERN, 'Tracker image pattern copied'), false, 'primary'),
      button('Copy Preset Instructions', () => void copyText(COPYABLE_TRACKER_PRESET_GUIDANCE, 'Tracker preset instructions copied'), false, 'subtle'),
      button('Copy Artifact Media Macro', () => void copyText('{{reverie_artifact_media_protocol}}', 'Artifact Media macro copied'), false, 'subtle'),
    )
    guide.append(explanation, steps, actions, example)
    return guide
  }

  function renderManual(): HTMLElement {
    const box = document.createElement('div')
    const intro = document.createElement('div')
    intro.className = 'dg-slot-card'
    const title = document.createElement('div')
    title.className = 'dg-history-title'
    title.textContent = 'Reverie Relay Quick Guide'
    const sub = document.createElement('div')
    sub.className = 'dg-section-sub'
    sub.textContent = 'Relay turns semantic image requests into generated images, preserves their exact slot, and keeps generation history, metadata, and appearance continuity available after reloads.'
    const quick = document.createElement('div')
    quick.className = 'dg-actions'
    quick.append(
      button('Open Quick Start Overview', openQuickStartOverview, false, 'primary'),
      button('Open Surface Library', () => { activeTab = 'surface-library'; renderPanel() }, false, 'primary'),
      button('Create Custom Surface', () => { activeTab = 'surfaces'; renderPanel(); window.setTimeout(() => openEditSurface(), 0) }, false, 'subtle'),
      button('Scan Slots', rescanChat, !activeChatId || rescanInProgress, 'subtle'),
      button('Reparse Slots', () => void reparseChatSlotsFromOrb(), !activeChatId, 'subtle'),
    )
    intro.append(title, sub, quick)
    box.appendChild(intro)
    box.appendChild(panelSection('Add Relay Images to an Existing Tracker or Preset', renderTrackerIllustrationGuide()))
    const sections: Array<[string, string[]]> = [
      ['Slots and social surfaces', [
        'Smartphone, Kakao, Instagram, Twitter, Prose Illustrator, and custom wrappers create exact image slots. Relay generates and writes the result back to that specific message, swipe, request, and slot.',
        'Right-click a generated image on desktop or long-press it on mobile for metadata, history, regeneration, prompt editing, reuse, and removal actions.',
        'Choose Auto Insert, Prompt Preview, or Image Preview Before Insert in Settings. Image Preview opens the finished result before write-back with Reparse, Regenerate, and Insert controls.',
      ]],
      ['Prose Illustrator', [
        'Relay-Planned analyzes and inserts automatically. Model Planned lets the narrative model place exact request anchors using the full preset prompt and injected runtime settings.',
        'Relay-Planned selection is automatic and does not open a separate scene-suggestion or manual picker workflow.',
        'Generated replacement candidates and completed inline illustration logs are stored under History instead of crowding the main Illustrator tab.',
        'Open Generation Details on any slot to inspect the chosen scene, visible subjects, profile reason, Appearance facts, references, model, LoRAs, prompts, requested and actual dimensions, anchor, and warnings.',
      ]],
      ['Appearance Memory', [
        'Appearance Sidecar continuously keeps stable identity, wardrobe, and temporary scene appearance separate. It uses the full chat, cards, lorebook, existing state, and active native identity bindings; no manual scan is required.',
        'Relevant Appearance facts are used for both normal slot images and Prose Illustrator prompts, scoped only to subjects actually named in the request.',
      ]],
      ['Memes and funny social images', [
        'image_request supports optional intent values: auto, photo, selfie, candid, evidence, screenshot, meme, reaction, funny_edit, shitpost, cursed, viral_graphic, and fandom_edit.',
        'Special intents preserve identity, clothing, setting, action, model, LoRAs, negatives, and slot routing while suppressing only conflicting polished or cinematic styling.',
      ]],
      ['Custom surfaces and recovery', [
        'Relay ships with protected communication, publication, keepsake, evidence, and Artifact Media contracts. Duplicate any built-in surface or create a new custom.* wrapper for your own Regex artifact.',
        'Scan Slots discovers missed requests. Reparse Slots resets stale or cancelled recovered requests and rebuilds their prompts. Both actions are available from the Slots workspace and Orb menu with visible progress.',
        'When Lumiverse reopens after interrupted work, stale queued/parsing/generating records become usable recovered slots and resume automatically when Auto Generate is enabled. Prompt Preview and Image Preview modes remain respected during recovery.',
        'Media Archive preserves completed images, versions, and metadata even when a source message is deleted. Active jobs and dead slots are cleaned up without discarding the finished asset.',
      ]],
    ]
    for (const [headingText, rows] of sections) {
      const wrap = document.createElement('div')
      wrap.className = 'dg-slot-card'
      const heading = document.createElement('div')
      heading.className = 'dg-history-title'
      heading.textContent = headingText
      const list = document.createElement('div')
      list.className = 'dg-manual-list'
      for (const row of rows) { const item = document.createElement('div'); item.textContent = row; list.appendChild(item) }
      wrap.append(heading, list)
      box.appendChild(wrap)
    }
    return box
  }

  const SURFACE_CATEGORY_LABELS: Record<SurfacePromptCategory, string> = {
    'social-messaging': 'Social & Messaging',
    'photography-keepsakes': 'Photography & Keepsakes',
    'covers-promotion': 'Covers & Promotion',
    'evidence-editorial': 'Evidence & Editorial',
    'narrative-visuals': 'Narrative Visuals',
    custom: 'Custom Surfaces',
  }

  const NARRATIVE_DLC_UTILITY_NAMES = [
    'Dramatic Cutaway', 'Plot Sparks', 'Scene Shift', 'Parallel Scene', 'Cast Introduction',
    'Backstage Secrets', 'Setting the Scene', 'Off-Stage', 'Character Dossier', 'Location File', 'In Another Life', 'Archive Entry',
    'Relationship Map', 'Cast Sheet', 'Persona Wardrobe',
  ] as const

  function removeAppearanceMemoryOptimistically(characterId: string, removeCharacter: boolean): void {
    const withoutCharacter = <T extends { canonicalCharacterId?: string }>(rows: Record<string, T>) => Object.fromEntries(
      Object.entries(rows).filter(([, row]) => row.canonicalCharacterId !== characterId),
    ) as Record<string, T>
    continuityVault = {
      ...continuityVault,
      ...(removeCharacter ? { characters: Object.fromEntries(Object.entries(continuityVault.characters).filter(([id]) => id !== characterId)) } : {}),
      characterSheets: Object.fromEntries(Object.entries(continuityVault.characterSheets).filter(([id]) => id !== characterId)),
      visualIdentity: withoutCharacter(continuityVault.visualIdentity),
      wardrobe: withoutCharacter(continuityVault.wardrobe),
      currentAppearance: withoutCharacter(continuityVault.currentAppearance),
    }
    if (vaultSelectedCharacterId === characterId) vaultSelectedCharacterId = ''
    renderPanel()
  }

  function requestEnabledSurfacePromptPreview(): void {
    const requestId = `surface-prompt-preview-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const modal = openTextModal('Enabled Surface Prompt Dry Run · no model calls', 'Resolving the enabled original Surface and Narrative Utility prompt…')
    pendingSurfacePromptPreviews.set(requestId, modal)
    try {
      ctx.sendToBackend({ type: 'surface_prompt_preview', chatId: activeChatId, requestId })
    } catch (error) {
      pendingSurfacePromptPreviews.delete(requestId)
      modal.setValue(`Prompt preview failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  function renderNarrativeUtilityCategory(current: RouterConfig): HTMLElement {
    const category = document.createElement('div')
    const selectedNarrativeUtilities = new Set(current.narrativeDlcUtilityNames || [])
    const allEnabled = current.narrativeDlcEnabled && selectedNarrativeUtilities.size === NARRATIVE_DLC_UTILITY_NAMES.length
    const someEnabled = current.narrativeDlcEnabled && selectedNarrativeUtilities.size > 0
    const categoryControl = toggleCard(
      'Toggle All Narrative Utilities',
      `Turns all ${NARRATIVE_DLC_UTILITY_NAMES.length} Narrative Utilities on or off together. Use the individual switches below for a partial selection. (${someEnabled ? allEnabled ? 'all injected' : 'partially injected' : 'none injected'})`,
      allEnabled,
      checked => enqueueRelaySettingsPatch({ kind: 'narrative-enabled', enabledNames: checked ? [...NARRATIVE_DLC_UTILITY_NAMES] : [] }),
    )
    const categoryInput = categoryControl.querySelector<HTMLInputElement>('input[type="checkbox"]')
    if (categoryInput) categoryInput.indeterminate = someEnabled && !allEnabled
    const utilityToggles = document.createElement('div')
    utilityToggles.className = 'dg-settings-grid'
    for (const name of NARRATIVE_DLC_UTILITY_NAMES) {
      const displayName = narrativeUtilityDisplayName(name)
      const imagesEnabled = current.narrativeUtilityImageEnabled?.[name] !== false
      const overview = NARRATIVE_UTILITY_OVERVIEWS[displayName] || 'Adds a structured story-aware Narrative module to the prompt.'
      const row = document.createElement('div')
      row.className = 'dg-narrative-utility-row'
      const utilityToggle = toggleCard(displayName, `${overview} · ${selectedNarrativeUtilities.has(name) ? 'Included in prompt' : 'Not injected'}`, current.narrativeDlcEnabled && selectedNarrativeUtilities.has(name), checked => {
        const narrativeDlcUtilityNames = updateNarrativeUtilitySelection(
          current.narrativeDlcUtilityNames,
          current.narrativeDlcEnabled,
          name,
          checked,
          NARRATIVE_DLC_UTILITY_NAMES,
        )
        enqueueRelaySettingsPatch({ kind: 'narrative-enabled', enabledNames: narrativeDlcUtilityNames })
      })
      utilityToggle.querySelector('.dg-toggle-title-row')?.insertAdjacentHTML('afterbegin', surfaceIconMarkup('narrative', displayName))
      const imageButton = button(imagesEnabled ? 'Images On' : 'Text Only', () => {
        enqueueRelaySettingsPatch({ kind: 'narrative-image-enabled', utilityName: name, enabled: !imagesEnabled })
      }, false, 'subtle', `${displayName}: ${imagesEnabled ? 'include image requests' : 'use text-only media'} for this Utility in future Story Model output. Illustrator and other Surfaces are unaffected; existing images and manual slot actions remain available.`)
      imageButton.classList.add('dg-narrative-image-button')
      imageButton.setAttribute('aria-pressed', String(imagesEnabled))
      imageButton.setAttribute('aria-label', `${displayName} images ${imagesEnabled ? 'on' : 'off'}; click to ${imagesEnabled ? 'turn them off' : 'turn them on'}`)
      row.append(utilityToggle, imageButton)
      utilityToggles.appendChild(row)
    }
    category.append(categoryControl, utilityToggles)
    return category
  }

  function activeSurfacePromptDefinitions(): CustomSurfaceDefinition[] {
    // A saved collection may refer to a preset which was later deleted; the
    // shared selector restores its built-in fallback so the module stays visible.
    return activeSurfaceDefinitions(customSurfaces).filter(definition => definition.baseSurfaceId !== 'prose-illustration'
      && definition.baseSurfaceId !== 'relationship-map' && definition.baseSurfaceId !== 'character-profile')
  }

  function buildUtilityPreview(): { content: string; moduleIds: string[] } {
    const enabled = activeSurfacePromptDefinitions().filter(definition => definition.promptEnabled)
    const moduleIds = enabled.map(definition => definition.baseSurfaceId)
    const rootRegistry = enabled.map(definition => `[${definition.canonicalOuterWrapper}]`).join(' ')
    const modules = enabled.map(definition => definition.promptModule).filter(Boolean).join('\n\n---\n\n')
    const template = customSurfaces.utilityTemplate || '{{reverie_enabled_surface_modules}}'
    const expandedTemplate = template
      .replace(/\{\{\s*reverie_enabled_surface_modules\s*\}\}/gi, modules || 'Enabled surface-authoring modules: none.')
      .replace(/\{\{\s*reverie_enabled_surface_roots\s*\}\}/gi, rootRegistry || 'none')
      .replace(/\{\{\s*reverie_renderer_mode\s*\}\}/gi, 'shared')
    const rootBoundary = `STRICT ENABLED ROOT REGISTRY\nOnly these exact roots are valid. Never rename a root after a platform or invent feed/post/story shorthand.\n${rootRegistry || 'none'}`
    return {
      content: [
        expandedTemplate,
        /STRICT ENABLED ROOT REGISTRY/i.test(expandedTemplate) ? '' : rootBoundary,
        /APP SURFACE SHAPE FIREBREAK/i.test(expandedTemplate) ? '' : REVERIE_SURFACE_APP_SCHEMA_FIREBREAK,
      ].filter(Boolean).join('\n\n'),
      moduleIds,
    }
  }


  function setSurfaceRendererPreference(rendererMode: CustomSurfaceStudioState['rendererMode']): void {
    if (customSurfaces.rendererMode === rendererMode) return
    if (rendererMode === 'legacy-regex') {
      const modal = ctx.ui.showModal({ title: 'Regex Rendered', width: 480 })
      modal.root.classList.add('dg-router-panel', 'dg-modal-host')
      const body = document.createElement('div')
      body.className = 'dg-modal-body'
      const reminder = document.createElement('div')
      reminder.className = 'dg-info-note'
      reminder.textContent = 'Relay renders its Core and Narrative Surfaces itself. In Lumiverse’s Native Regex tab, disable only Relay’s Regex Pack scripts if you previously enabled them. Leave your own Regex scripts alone. The optional Relay import starts disabled.'
      const actions = document.createElement('div')
      actions.className = 'dg-actions'
      actions.append(
        button('Use Regex Rendered', () => { modal.dismiss(); enqueueRelaySettingsPatch({ kind: 'surface-preferences', rendererMode }) }, false, 'primary'),
        button('Cancel', () => modal.dismiss(), false, 'subtle'),
      )
      body.append(reminder, actions)
      modal.root.appendChild(body)
      return
    }
    enqueueRelaySettingsPatch({ kind: 'surface-preferences', rendererMode })
  }

  function renderOptionalRegexImport(current: RouterConfig): HTMLElement {
    const wrap = document.createElement('div')
    wrap.className = 'dg-field-stack'
    const note = document.createElement('div')
    note.className = 'dg-info-note'
    note.textContent = 'Import the Core and Narrative Regex scripts only if you want them in Lumiverse’s Native Regex tab. All imported scripts start disabled. Relay renders Surfaces without this import.'
    const status = document.createElement('div')
    status.className = current.narrativeDlcLastSync?.status === 'failed' || current.narrativeDlcLastSync?.blocked ? 'dg-error' : 'dg-recovery-note'
    status.textContent = current.narrativeDlcLastSync?.message || 'The optional Regex pack is not imported.'
    const actions = document.createElement('div')
    actions.className = 'dg-actions'
    const send = (action: 'install' | 'inspect' | 'remove') => {
      ctx.sendToBackend({ type: 'narrative_dlc_action', chatId: activeChatId, action, variant: narrativeVariantForSurfaceShellMode(current.surfaceDefaultShellMode) })
      showToast('info', action === 'remove' ? 'Removing Private Relay Regex scripts…' : action === 'inspect' ? 'Checking Regex import…' : 'Importing disabled Core and Narrative Regex scripts…')
    }
    actions.append(
      button(current.narrativeDlcLastSync?.installed ? 'Repair Import' : 'Import Regex Pack', () => send('install'), false, 'primary'),
      button('Check Import', () => send('inspect'), false, 'subtle'),
      button('Remove Import', () => send('remove'), !current.narrativeDlcLastSync?.installed, 'danger'),
    )
    wrap.append(note, status, actions)
    return wrap
  }

  function setSurfacePresentationPreference(defaultShellMode: SurfaceShellMode): void {
    if (customSurfaces.defaultShellMode === defaultShellMode) return
    enqueueRelaySettingsPatch({ kind: 'surface-preferences', defaultShellMode })
  }

  function setSurfaceColorPreference(colorMode: SurfaceColorMode): void {
    if (customSurfaces.colorMode === colorMode) return
    enqueueRelaySettingsPatch({ kind: 'surface-preferences', colorMode })
  }

  function setAutomaticSurfaceInjection(enabled: boolean): void {
    enqueueRelaySettingsPatch({ kind: 'surface-preferences', utilityInjectionEnabled: enabled })
  }

  function openRendererScriptEditor(): void {
    const modal = ctx.ui.showModal({ title: 'Shipped Renderer Script Editor', width: 960 })
    modal.root.classList.add('dg-router-panel', 'dg-modal-host')
    const body = document.createElement('div')
    body.className = 'dg-modal-body dg-stack'
    const intro = document.createElement('div')
    intro.className = 'dg-info-note'
    intro.textContent = 'These are the effective bundled renderer scripts. Edits are saved as local overlays scoped to renderer format, presentation, and color; bundled JSON stays untouched. Reset removes only that scoped overlay.'
    const controls = document.createElement('div')
    controls.className = 'dg-settings-grid'
    const makeSelect = <T extends string>(labelText: string, initial: T, options: Array<[T, string]>, onChange: (value: T) => void): HTMLLabelElement => {
      const label = document.createElement('label')
      label.className = 'dg-field'
      const caption = document.createElement('span')
      caption.textContent = labelText
      const select = document.createElement('select')
      for (const [value, name] of options) {
        const option = document.createElement('option')
        option.value = value
        option.textContent = name
        select.appendChild(option)
      }
      select.value = initial
      select.addEventListener('change', () => onChange(select.value as T))
      label.append(caption, select)
      return label
    }
    let source: R45ScriptSource = 'legacy-xml'
    let presentation: R45PresentationMode = customSurfaces.defaultShellMode === 'sparkling'
      ? 'sparkling'
      : customSurfaces.defaultShellMode === 'glass' || customSurfaces.defaultShellMode === 'plain-glass'
        ? 'glass'
        : customSurfaces.defaultShellMode === 'inline' ? 'inline' : 'plain'
    let colorMode: SurfaceColorMode = customSurfaces.colorMode || 'realistic'
    let query = ''
    const search = document.createElement('input')
    search.type = 'search'
    search.placeholder = 'Filter by name or script ID'
    search.setAttribute('aria-label', 'Filter shipped renderer scripts')
    const list = document.createElement('div')
    list.className = 'dg-stack'
    list.style.maxHeight = '44vh'
    list.style.overflow = 'auto'
    list.style.padding = '4px'
    const editor = document.createElement('div')
    editor.className = 'dg-creator-section'
    const scriptScopes = (): string => `${source} · ${presentation} · ${colorMode}`
    const renderRows = () => {
      editor.replaceChildren()
      list.replaceChildren()
      const scripts = regexSurfaceParityScripts(presentation, colorMode, source, customSurfaces.rendererScriptOverrides || {})
      const filtered = scripts.filter(script => `${script.name} ${script.scriptId}`.toLocaleLowerCase().includes(query.toLocaleLowerCase()))
      const counter = document.createElement('div')
      counter.className = 'dg-subtle'
      counter.textContent = `${filtered.length} of ${scripts.length} effective shipped scripts · ${scriptScopes()}`
      list.appendChild(counter)
      for (const script of filtered) {
        const key = r45ScriptOverrideKey(source, presentation, colorMode, script.scriptId)
        const overridden = Boolean(customSurfaces.rendererScriptOverrides?.[key])
        const row = document.createElement('div')
        row.className = 'dg-creator-notice'
        const title = document.createElement('strong')
        title.textContent = script.name
        const detail = document.createElement('span')
        const owner = /\\\[([A-Za-z][\w-]*)\\\]/.exec(script.find)?.[1]
          || /<([A-Za-z][\w-]*)\b/.exec(script.find)?.[1]
          || 'shared/unanchored'
        detail.textContent = `owner ${owner} · ${script.scriptId} · order ${script.order} · flags ${script.flags || 'none'} · ${overridden ? 'Local override' : 'Bundled default'}`
        const actions = document.createElement('div')
        actions.className = 'dg-actions'
        actions.appendChild(button('Edit', () => renderEditor(script), false, 'subtle'))
        if (overridden) actions.appendChild(button('Reset to Shipped Default', () => {
          ctx.sendToBackend({ type: 'surface_renderer_script_action', chatId: activeChatId || undefined, action: 'reset', source, presentation, colorMode, scriptId: script.scriptId })
          modal.dismiss()
        }, false, 'danger'))
        row.append(title, detail, actions)
        list.appendChild(row)
      }
      if (!filtered.length) {
        const empty = document.createElement('div')
        empty.className = 'dg-info-note'
        empty.textContent = 'No effective shipped scripts match that filter.'
        list.appendChild(empty)
      }
    }
    const scriptInput = (labelText: string, value: string, multiline = false): HTMLInputElement | HTMLTextAreaElement => {
      const label = document.createElement('label')
      label.className = 'dg-field'
      const caption = document.createElement('span')
      caption.textContent = labelText
      const control = multiline ? document.createElement('textarea') : document.createElement('input')
      control.value = value
      if (control instanceof HTMLTextAreaElement) {
        control.rows = labelText === 'Replacement string' ? 12 : 4
        control.spellcheck = false
      } else {
        control.type = 'text'
        control.spellcheck = false
      }
      label.append(caption, control)
      editor.appendChild(label)
      return control
    }
    const renderEditor = (script: ReturnType<typeof regexSurfaceParityScripts>[number]) => {
      editor.replaceChildren()
      const heading = document.createElement('h3')
      heading.textContent = `Edit ${script.scriptId}`
      const note = document.createElement('p')
      note.textContent = 'This only changes the selected renderer/presentation/color copy. Source pack and ownership remain bundled metadata.'
      editor.append(heading, note)
      const name = scriptInput('Display name', script.name)
      const find = scriptInput('Find regex', script.find)
      const replace = scriptInput('Replacement string', script.replace, true)
      const flags = scriptInput('Regex flags', script.flags)
      const order = scriptInput('Sort order', String(script.order))
      const validationMessage = document.createElement('div')
      validationMessage.className = 'dg-error'
      validationMessage.setAttribute('role', 'alert')
      validationMessage.hidden = true
      const showValidationMessage = (message: string) => {
        validationMessage.textContent = message
        validationMessage.hidden = !message
        if (message) validationMessage.scrollIntoView({ block: 'nearest' })
      }
      for (const field of [name, find, flags, order]) {
        field.addEventListener('input', () => showValidationMessage(''))
      }
      const actions = document.createElement('div')
      actions.className = 'dg-actions'
      actions.append(
        button('Save Local Override', () => {
          const flagValue = flags.value.trim()
          const regexError = validateRendererRegex(find.value, flagValue)
          if (regexError) {
            showValidationMessage(regexError)
            return
          }
          const orderValue = Number(order.value)
          if (!name.value.trim() || !order.value.trim() || !Number.isFinite(orderValue) || orderValue < 0 || orderValue > 10_000) {
            showValidationMessage('Name and sort order are invalid; order must be a number from 0 to 10,000 (decimals allowed).')
            return
          }
          ctx.sendToBackend({
            type: 'surface_renderer_script_action', chatId: activeChatId || undefined,
            action: 'save', source, presentation, colorMode, scriptId: script.scriptId,
            override: { name: name.value.trim(), findRegex: find.value, replaceString: replace.value, flags: flagValue, order: orderValue },
          })
          modal.dismiss()
        }, false, 'primary'),
        button('Back to Scripts', renderRows, false, 'subtle'),
      )
      editor.append(validationMessage, actions)
    }
    controls.append(
      makeSelect('Renderer source', source, [['legacy-xml', 'XML (Canonical)'], ['bracket', 'Saved Bracket Compatibility']], value => { source = value; renderRows() }),
      makeSelect('Presentation', presentation, [['inline', 'Inline'], ['plain', 'Plain Button'], ['sparkling', 'Sparkling Button'], ['glass', 'Glass Button']], value => { presentation = value; renderRows() }),
      makeSelect('Color mode', colorMode, [['realistic', 'Realistic'], ['primary', 'Lumiverse Primary'], ['glass', 'Glass Mode']], value => { colorMode = value; renderRows() }),
    )
    search.addEventListener('input', () => { query = search.value; renderRows() })
    body.append(intro, controls, search, list, editor)
    modal.root.appendChild(body)
    renderRows()
  }

  function setSurfacePromptPreference(surfaceId: string, promptEnabled: boolean): void {
    const existing = customSurfaces.definitions?.[surfaceId]
    if (!existing || existing.promptEnabled === promptEnabled) return
    enqueueRelaySettingsPatch({ kind: 'surface-prompt-enabled', values: { [surfaceId]: promptEnabled } })
  }

  function setSurfaceCategoryPromptPreference(promptCategory: SurfacePromptCategory, promptEnabled: boolean): void {
    const values = Object.fromEntries(Object.entries(customSurfaces.definitions || {})
      .filter(([, definition]) => definition.promptCategory === promptCategory)
      .map(([surfaceId]) => [surfaceId, promptEnabled]))
    if (!Object.keys(values).length) return
    enqueueRelaySettingsPatch({ kind: 'surface-prompt-enabled', values, categoryId: promptCategory })
  }

  function renderSurfacePreferenceControls(): HTMLElement {
    const wrap = document.createElement('div')
    wrap.className = 'dg-stack'

    const renderer = document.createElement('div')
    renderer.className = 'dg-illustrator-mode-grid dg-choice-compact dg-choice-two'
    const rendererOptions: Array<{ id: CustomSurfaceStudioState['rendererMode']; label: string; description: string }> = [
      { id: 'relay', label: 'Relay Rendered', description: 'Built-in surface renderer.' },
      { id: 'legacy-regex', label: 'Regex Rendered', description: 'Bundled Regex presentation.' },
    ]
    for (const option of rendererOptions) {
      const control = document.createElement('button')
      control.type = 'button'
      control.className = `dg-illustrator-mode-card${customSurfaces.rendererMode === option.id ? ' is-active' : ''}`
      control.setAttribute('aria-pressed', String(customSurfaces.rendererMode === option.id))
      const title = document.createElement('strong'); title.textContent = option.label
      const description = document.createElement('small'); description.textContent = option.description
      control.append(title, description)
      control.addEventListener('click', () => setSurfaceRendererPreference(option.id))
      renderer.appendChild(control)
    }

    const presentation = document.createElement('div')
    presentation.className = 'dg-illustrator-mode-grid dg-choice-compact dg-choice-five'
    const presentationOptions: Array<{ id: SurfaceShellMode; label: string; description: string }> = [
      { id: 'inline', label: 'Inline', description: 'Open in the message.' },
      { id: 'plain', label: 'Button', description: 'Centered launcher without particles.' },
      { id: 'sparkling', label: 'Sparkling Button', description: 'Centered launcher with outer sparkles.' },
      { id: 'glass', label: 'Glass Button', description: 'Almost-transparent glass launcher.' },
      { id: 'plain-glass', label: 'Plain Glass', description: 'The same glass launcher, without sparkles.' },
    ]
    for (const option of presentationOptions) {
      const control = document.createElement('button')
      control.type = 'button'
      control.className = `dg-illustrator-mode-card${customSurfaces.defaultShellMode === option.id ? ' is-active' : ''}`
      control.setAttribute('aria-pressed', String(customSurfaces.defaultShellMode === option.id))
      const title = document.createElement('strong'); title.textContent = option.label
      const description = document.createElement('small'); description.textContent = option.description
      control.append(title, description)
      control.addEventListener('click', () => setSurfacePresentationPreference(option.id))
      presentation.appendChild(control)
    }

    const color = document.createElement('div')
    color.className = 'dg-illustrator-mode-grid dg-choice-compact dg-choice-three'
    const colorOptions: Array<{ id: SurfaceColorMode; label: string; description: string }> = [
      { id: 'realistic', label: 'Realistic', description: 'Platform-authentic Surface colors.' },
      { id: 'primary', label: 'Lumiverse Primary', description: 'Theme-primary Surface accents.' },
      { id: 'glass', label: 'Glass Mode', description: 'Almost-transparent Glass bodies for Apps and UI Surfaces.' },
    ]
    for (const option of colorOptions) {
      const control = document.createElement('button')
      control.type = 'button'
      control.className = `dg-illustrator-mode-card${customSurfaces.colorMode === option.id ? ' is-active' : ''}`
      control.setAttribute('aria-pressed', String(customSurfaces.colorMode === option.id))
      const title = document.createElement('strong'); title.textContent = option.label
      const description = document.createElement('small'); description.textContent = option.description
      control.append(title, description)
      control.addEventListener('click', () => setSurfaceColorPreference(option.id))
      color.appendChild(control)
    }

    const injection = document.createElement('div')
    injection.className = 'dg-toggle-grid'
    injection.append(
      toggleCard(
        'Automatic Surface Injection',
        'Injects the shared surface grammar and every enabled Surface Library module as one persistent setting.',
        customSurfaces.utilityInjectionEnabled !== false,
        checked => setAutomaticSurfaceInjection(checked),
      ),
    )

    const rendererLabel = settingHeading('Renderer')
    const presentationLabel = settingHeading('Default Presentation')
    const colorLabel = settingHeading('Color Mode')
    const injectionLabel = settingHeading('Automatic Injection', 'Controls whether Relay automatically inserts enabled Surface Utilities. The switch below is the setting itself.')
    const rendererScripts = document.createElement('div')
    rendererScripts.className = 'dg-creator-notice'
    const rendererScriptsTitle = document.createElement('strong')
    rendererScriptsTitle.textContent = 'Shipped Renderer Scripts'
    const rendererScriptsDescription = document.createElement('span')
    rendererScriptsDescription.textContent = 'Inspect the effective shipped transformations, save scoped local overrides, or restore an exact bundled default.'
    rendererScripts.append(rendererScriptsTitle, rendererScriptsDescription, button('Open Renderer Script Editor', openRendererScriptEditor, false, 'subtle'))
    wrap.append(rendererLabel, renderer, presentationLabel, presentation, colorLabel, color, injectionLabel, injection, rendererScripts)
    if (config) wrap.appendChild(panelSection('Optional Core + Narrative Regex Import', renderOptionalRegexImport(config)))
    return wrap
  }

  function renderSurfaceLibrary(): HTMLElement {
    const box = document.createElement('div')
    const startHere = document.createElement('div')
    startHere.className = 'dg-info-note'
    startHere.innerHTML = '<strong>Start here</strong><br>Enable only the Utilities you want the Story Model to author. Use the prompt preview below to inspect the exact combined instructions without making a model call. Rendering stays available for older messages even when authoring is switched off.'
    const intro = document.createElement('div')
    intro.className = 'dg-surface-intro'
    const copy = document.createElement('div')
    copy.innerHTML = '<strong>Surface Library</strong><span>Only surfaces switched on here are included in the Story Model prompt, along with enabled Narrative Utilities. Rendering support remains available for older messages even when a module is switched off.</span>'
    const count = activeSurfacePromptDefinitions().filter(definition => definition.promptEnabled).length
    const narrativeCount = config?.narrativeDlcEnabled ? (config.narrativeDlcUtilityNames || []).length : 0
    const previewActions = document.createElement('div')
    previewActions.className = 'dg-actions'
    previewActions.appendChild(button('View Exact Injected Prompt', () => window.setTimeout(requestEnabledSurfacePromptPreview, 0), false, 'primary', 'Dry-run the enabled original Surface and Narrative Utility prompt without calling a model.'))
    intro.append(copy, chip(`${count + narrativeCount} Enabled`, count + narrativeCount ? 'completed' : ''), previewActions)

    box.append(startHere)
    box.appendChild(panelSection('Prompt Preview · all enabled Utilities', intro))
    box.append(panelSection('Surface Defaults', renderSurfacePreferenceControls()))

    const grouped = new Map<SurfacePromptCategory, CustomSurfaceDefinition[]>()
    for (const definition of activeSurfacePromptDefinitions()) {
      const category = definition.promptCategory || 'custom'
      const rows = grouped.get(category) || []
      rows.push(definition)
      grouped.set(category, rows)
    }
    const categoryOrder: SurfacePromptCategory[] = ['social-messaging', 'photography-keepsakes', 'covers-promotion', 'evidence-editorial', 'narrative-visuals', 'custom']
    for (const category of categoryOrder) {
      const definitions = grouped.get(category)
      if (!definitions?.length) continue
      const categoryWrap = document.createElement('div')
      const categoryEnabled = definitions.every(definition => definition.promptEnabled === true)
      const categorySomeEnabled = definitions.some(definition => definition.promptEnabled === true)
      const categoryControl = toggleCard(
        `Toggle All ${SURFACE_CATEGORY_LABELS[category]}`,
        `${definitions.length} surface module${definitions.length === 1 ? '' : 's'} · ${categorySomeEnabled ? categoryEnabled ? 'all injected' : 'partially injected' : 'none injected'}`,
        categoryEnabled,
        checked => setSurfaceCategoryPromptPreference(category, checked),
      )
      const categoryInput = categoryControl.querySelector<HTMLInputElement>('input[type="checkbox"]')
      if (categoryInput) categoryInput.indeterminate = categorySomeEnabled && !categoryEnabled
      categoryControl.dataset.surfacePromptCategory = category
      const grid = document.createElement('div')
      grid.className = 'dg-settings-grid'
      for (const definition of definitions) {
        const overview = SURFACE_UTILITY_OVERVIEWS[definition.baseSurfaceId] || `Authors a structured ${definition.displayName} Surface using its approved contract.`
        const moduleControl = toggleCard(
          `${definition.icon || '◇'} ${definition.displayName}`,
          `${overview} · [${definition.canonicalOuterWrapper}] · ${definition.promptEnabled ? 'Included in prompt' : 'Not injected'}`,
          definition.promptEnabled === true,
          checked => setSurfacePromptPreference(definition.surfaceId, checked),
        )
        moduleControl.dataset.surfacePromptCategory = category
        grid.appendChild(moduleControl)
      }
      categoryWrap.append(categoryControl, grid)
      box.appendChild(panelSection(SURFACE_CATEGORY_LABELS[category], categoryWrap))
    }
    if (config) box.appendChild(panelSection('Narrative Utilities', renderNarrativeUtilityCategory(config)))
    else box.appendChild(panelSection('Narrative Utilities', empty('Narrative Utility controls are loading.')))
    return box
  }

  function renderSurfacePresets(): HTMLElement {
    const box = document.createElement('div')
    const enabledIds = Object.values(customSurfaces.definitions).filter(definition => definition.enabled).map(definition => definition.surfaceId)
    const diagnostics = document.createElement('div')
    diagnostics.className = 'dg-recovery-note'
    diagnostics.textContent = `Surface source: ${customSurfaces.lastInjectionSummary || 'saved state'} · ${Object.keys(customSurfaces.definitions).length} available · ${enabledIds.length} enabled.`
    box.appendChild(diagnostics)
    const actions = document.createElement('div')
    actions.className = 'dg-actions'
    actions.append(button('Save Current Collection', () => {
      if (!activeChatId) return
      const name = globalThis.prompt?.('Surface preset name', 'My Surface Collection')?.trim()
      if (!name) return
      ctx.sendToBackend({ type: 'custom_surface_action', chatId: activeChatId, action: 'save_collection', presetName: name, surfaceIds: enabledIds })
    }, !activeChatId || enabledIds.length === 0, 'primary'))
    box.appendChild(panelSection('Global Surface Presets', documentFragment(actions)))

    const rows = document.createElement('div')
    rows.className = 'dg-card-grid'
    const presets = Object.values(customSurfaces.collectionPresets || {}).sort((a, b) => a.name.localeCompare(b.name))
    if (!presets.length) rows.appendChild(empty('No saved Surface presets yet. Save the enabled Library collection to create one.'))
    for (const preset of presets) {
      const card = document.createElement('div'); card.className = 'dg-card'
      const title = document.createElement('strong'); title.textContent = preset.name
      const detail = document.createElement('p'); detail.textContent = `${preset.surfaceIds.length} surface${preset.surfaceIds.length === 1 ? '' : 's'}${customSurfaces.defaultCollectionPresetId === preset.presetId ? ' · global default' : ''}`
      const cardActions = document.createElement('div'); cardActions.className = 'dg-actions'
      cardActions.append(
        button('Bind to Chat', () => activeChatId && ctx.sendToBackend({ type: 'custom_surface_action', chatId: activeChatId, action: 'bind_collection', presetId: preset.presetId }), !activeChatId, 'subtle'),
        button('Set Global Default', () => ctx.sendToBackend({ type: 'custom_surface_action', chatId: activeChatId || undefined, action: 'set_default_collection', presetId: preset.presetId }), false, 'subtle'),
        button('Delete', () => {
          const collectionPresets = { ...customSurfaces.collectionPresets }
          delete collectionPresets[preset.presetId]
          customSurfaces = {
            ...customSurfaces,
            collectionPresets,
            defaultCollectionPresetId: customSurfaces.defaultCollectionPresetId === preset.presetId ? undefined : customSurfaces.defaultCollectionPresetId,
            updatedAt: Date.now(),
          }
          renderPanel()
          ctx.sendToBackend({ type: 'custom_surface_action', chatId: activeChatId || undefined, action: 'delete_collection', presetId: preset.presetId })
        }, false, 'danger'),
      )
      card.append(title, detail, cardActions); rows.appendChild(card)
    }
    const bindingActions = document.createElement('div'); bindingActions.className = 'dg-actions'
    bindingActions.append(button('Use Global Default', () => activeChatId && ctx.sendToBackend({ type: 'custom_surface_action', chatId: activeChatId, action: 'unbind_collection' }), !activeChatId, 'subtle'))
    box.append(panelSection('Saved Collections', rows), panelSection('Current Chat Binding', bindingActions))
    return box
  }

  function renderNarrativeUtilityInjectionEditor(): HTMLElement {
    requestNarrativeUtilityRegistry()
    const wrap = document.createElement('div')
    wrap.className = 'dg-stack'
    if (!narrativeUtilityRegistry.length) {
      wrap.appendChild(empty('Loading the Narrative Utility injection registry…'))
      return wrap
    }
    const rows = document.createElement('div')
    rows.className = 'dg-card-grid'
    for (const record of narrativeUtilityRegistry) {
      const card = document.createElement('div')
      card.className = `dg-card${record.enabled ? ' is-enabled' : ''}`
      const title = document.createElement('strong')
      title.className = 'dg-narrative-utility-heading'
      title.insertAdjacentHTML('afterbegin', surfaceIconMarkup('narrative', narrativeUtilityDisplayName(record.name)))
      title.append(document.createTextNode(narrativeUtilityDisplayName(record.name)))
      const status = document.createElement('p')
      status.textContent = `${record.enabled ? 'Injected' : 'Disabled'} · ${record.imageEnabled ? 'Images On' : 'Text Only'} · ${record.source === 'user-override' ? 'User Override' : 'Default'} · ${record.injectedContent.length.toLocaleString()} chars · ~${Math.ceil(record.injectedContent.length / 4).toLocaleString()} tokens`
      const actions = document.createElement('div')
      actions.className = 'dg-actions'
      actions.append(
        button(record.enabled ? 'Disable' : 'Enable', () => {
          const enabledNames = updateNarrativeUtilitySelection(
            config?.narrativeDlcUtilityNames || [],
            config?.narrativeDlcEnabled === true,
            record.id,
            !record.enabled,
            NARRATIVE_DLC_UTILITY_NAMES,
          )
          enqueueRelaySettingsPatch({ kind: 'narrative-enabled', enabledNames })
        }, false, 'subtle'),
        button(record.imageEnabled ? 'Images On' : 'Text Only', () => enqueueRelaySettingsPatch({ kind: 'narrative-image-enabled', utilityName: record.id, enabled: !record.imageEnabled }), false, 'subtle', 'Controls image requests inside this Utility only. Illustrator, other Surfaces, existing images, and manual slot actions are unaffected.'),
        button('Edit', () => { narrativeUtilityEditorId = record.id; renderPanel() }, false, 'primary'),
        button('Reset to Default', () => enqueueRelaySettingsPatch({ kind: 'narrative-override', utilityName: record.id, content: null }), record.source === 'default', 'subtle'),
      )
      card.append(title, status, actions)
      if (record.warnings.length) {
        const warning = document.createElement('div')
        warning.className = 'dg-build-warning'
        warning.textContent = record.warnings.join(' ')
        card.appendChild(warning)
      }
      rows.appendChild(card)
    }
    wrap.appendChild(rows)

    const selected = narrativeUtilityRegistry.find(record => record.id === narrativeUtilityEditorId)
    if (selected) {
      const editor = document.createElement('div')
      editor.className = 'dg-modal'
      const heading = document.createElement('strong')
      heading.textContent = `${narrativeUtilityDisplayName(selected.name)} · Model-Facing Utility Text`
      const source = document.createElement('div')
      source.className = 'dg-recovery-note'
      source.textContent = `${selected.source === 'user-override' ? 'User Override' : 'Shipped Default'} · revision ${selected.revision}. This editor changes the Images On prompt; Text Only uses a separate safe contract. Bracket Surface syntax and nested image-request XML are preserved literally. Compatibility checks warn; they do not rewrite.`
      const textarea = document.createElement('textarea')
      textarea.className = 'dg-textarea dg-textarea-tall'
      textarea.spellcheck = false
      textarea.value = selected.effectiveContent
      const actions = document.createElement('div')
      actions.className = 'dg-actions'
      actions.append(
        button('Save', () => enqueueRelaySettingsPatch({ kind: 'narrative-override', utilityName: selected.id, content: textarea.value }), false, 'primary'),
        button('Cancel', () => { narrativeUtilityEditorId = ''; renderPanel() }, false, 'subtle'),
        button('Reset to Default', () => enqueueRelaySettingsPatch({ kind: 'narrative-override', utilityName: selected.id, content: null }), selected.source === 'default', 'subtle'),
      )
      editor.append(heading, source, textarea, actions)
      wrap.appendChild(editor)
    }
    return wrap
  }

  function renderUtilityStudio(): HTMLElement {
    const box = document.createElement('div')
    const intro = document.createElement('div')
    intro.className = 'dg-surface-intro'
    const copy = document.createElement('div')
    copy.innerHTML = '<strong>Utility Studio</strong><span>Edit the shared utility, choose its prompt position, or place the dynamic macro yourself. The exact same enabled modules drive Relay Rendering and Regex Rendering.</span>'
    const actions = document.createElement('div')
    actions.className = 'dg-actions'
    actions.append(button('Copy Surfaces Macro', () => void copyText('{{reverie_surfaces}}', 'Surfaces macro copied'), false, 'subtle'), button('Copy All Macro', () => void copyText('{{reverie_all}}', 'Relay macro copied'), false, 'subtle'))
    intro.append(copy, actions)
    box.appendChild(panelSection('Relay Prompt Injection', intro))
    const macroOverview = document.createElement('div')
    macroOverview.className = 'dg-recovery-note'
    macroOverview.innerHTML = '<strong>Macro Overview</strong><br><code>{{reverie_surfaces}}</code> — enabled Surface Library modules.<br><code>{{reverie_illustrator}}</code> — active Illustrator protocol and runtime.<br><code>{{reverie_all}}</code> — both systems in one placement.'
    box.appendChild(panelSection('Macros', macroOverview))

    const enabledModules = activeSurfacePromptDefinitions().filter(definition => definition.promptEnabled)
    const enabledNarrativeUtilities = narrativeUtilityRegistry.filter(record => record.enabled)
    const utilityCharacters = enabledModules.reduce((total, definition) => total + String(definition.promptModule || '').length, 0)
      + enabledNarrativeUtilities.reduce((total, record) => total + record.injectedContent.length, 0)
      + String(customSurfaces.utilityTemplate || '').length
    const utilityEstimate = document.createElement('div')
    utilityEstimate.className = utilityCharacters > 60_000 ? 'dg-build-warning' : 'dg-recovery-note'
    utilityEstimate.innerHTML = `<strong>Injection Size</strong><br>${enabledModules.length} Surface module${enabledModules.length === 1 ? '' : 's'} + ${enabledNarrativeUtilities.length} Narrative Utilit${enabledNarrativeUtilities.length === 1 ? 'y' : 'ies'} · ${utilityCharacters.toLocaleString()} characters · approximately ${Math.ceil(utilityCharacters / 4).toLocaleString()} tokens${utilityCharacters > 60_000 ? '<br>Warning: this Utility is large. Disable unused modules to reduce Story Model context pressure.' : ''}`
    box.appendChild(panelSection('Utility Footprint', utilityEstimate))

    const injectionStatus = document.createElement('div')
    injectionStatus.className = 'dg-recovery-note'
    const injectedAt = customSurfaces.lastInjectionAt ? new Date(customSurfaces.lastInjectionAt).toLocaleString() : 'Never'
    injectionStatus.innerHTML = `<strong>Last Injection</strong><br>${escapeHtml(customSurfaces.lastInjectionSummary || 'No Relay prompt injection has been recorded yet.')}<br>Source: ${escapeHtml(customSurfaces.lastInjectionSource || 'none')} · Position: ${escapeHtml(customSurfaces.lastInjectionPosition || 'none')} · Time: ${escapeHtml(injectedAt)}<br>Modules: ${escapeHtml((customSurfaces.lastInjectedModuleIds || []).join(', ') || 'none')}`
    box.appendChild(panelSection('Injection Status', injectionStatus))

    const settings = document.createElement('div')
    settings.className = 'dg-settings-grid'
    settings.append(
      toggleCard(
        'Automatic Surface Injection',
        'Injects the shared surface grammar and every enabled Surface Library module as one persistent setting.',
        customSurfaces.utilityInjectionEnabled !== false,
        checked => setAutomaticSurfaceInjection(checked),
      ),
      selectField('Injection Position', customSurfaces.utilityInjectionPosition || 'after-chat-history', [
        ['system-prefix', 'System Prefix'],
        ['before-chat-history', 'Before Chat History'],
        ['before-latest-user', 'Before Latest User Message'],
        ['after-latest-user', 'After Latest User Message'],
        ['after-chat-history', 'After Chat History'],
      ], value => ctx.sendToBackend({
        type: 'custom_surface_action', chatId: activeChatId, action: 'set_utility_settings', utilityInjectionPosition: value as SurfaceUtilityInjectionPosition,
      })),
    )
    box.appendChild(panelSection('Injection Settings', settings))
    if (config) box.appendChild(renderSurfaceParserSettings(config))
    box.appendChild(panelSection('Narrative Utilities', renderNarrativeUtilityInjectionEditor()))

    const templateWrap = document.createElement('div')
    templateWrap.className = 'dg-modal'
    const templateLabel = fieldLabel('Utility Template', 'Defines the full model-facing authoring contract for this custom Surface. Keep the exact semantic wrapper, child order, attributes, and media ownership rules explicit.')
    templateLabel.classList.add('dg-field')
    const template = document.createElement('textarea')
    template.className = 'dg-textarea dg-textarea-tall'
    template.value = customSurfaces.utilityTemplate || ''
    template.spellcheck = false
    templateLabel.append(template)
    const templateActions = document.createElement('div')
    templateActions.className = 'dg-actions'
    templateActions.append(
      button('Save Utility Template', () => ctx.sendToBackend({ type: 'custom_surface_action', chatId: activeChatId, action: 'set_utility_settings', utilityTemplate: template.value }), false, 'primary'),
      button('Reset Template', () => ctx.sendToBackend({ type: 'custom_surface_action', chatId: activeChatId, action: 'reset_utility_template' }), false, 'subtle'),
    )
    templateWrap.append(templateLabel, templateActions)
    box.appendChild(panelSection('Editable Utility', templateWrap))

    const definitions = activeSurfacePromptDefinitions()
    if (definitions.length) {
      const moduleWrap = document.createElement('div')
      moduleWrap.className = 'dg-modal'
      const moduleSelect = document.createElement('select')
      moduleSelect.className = 'dg-select'
      for (const definition of definitions) {
        const option = document.createElement('option')
        option.value = definition.surfaceId
        option.textContent = `${SURFACE_CATEGORY_LABELS[definition.promptCategory]} · ${definition.displayName}`
        moduleSelect.appendChild(option)
      }
      const moduleEditor = document.createElement('textarea')
      moduleEditor.className = 'dg-textarea dg-textarea-tall'
      moduleEditor.spellcheck = false
      const bundledDefinitions = frontendSurfaceFallback().definitions
      const bundledModule = () => bundledDefinitions[customSurfaces.definitions[moduleSelect.value]?.baseSurfaceId || '']?.promptModule || ''
      const resetModule = button('Restore Bundled Module', () => {
        const bundled = bundledModule()
        if (!bundled) return
        confirmCleanup({
          title: 'Restore bundled Surface instructions?',
          description: 'This replaces your saved edits to this Surface module with the bundled instructions. Other modules are untouched.',
          scope: moduleSelect.selectedOptions[0]?.textContent || moduleSelect.value,
          actionLabel: 'Restore Module',
          onConfirm: () => {
            moduleEditor.value = bundled
            resetModule.disabled = true
            ctx.sendToBackend({ type: 'custom_surface_action', chatId: activeChatId, action: 'set_prompt_module', surfaceId: moduleSelect.value, promptModule: '' })
          },
        })
      }, true, 'subtle')
      const updateResetState = () => { resetModule.disabled = !bundledModule() || moduleEditor.value === bundledModule() }
      const loadSelected = () => {
        const selected = customSurfaces.definitions[moduleSelect.value]
        moduleEditor.value = selected?.promptModule || ''
        updateResetState()
      }
      moduleSelect.addEventListener('change', loadSelected)
      moduleEditor.addEventListener('input', updateResetState)
      loadSelected()
      const moduleActions = document.createElement('div')
      moduleActions.className = 'dg-actions'
      moduleActions.append(button('Save Surface Module', () => ctx.sendToBackend({
        type: 'custom_surface_action', chatId: activeChatId, action: 'set_prompt_module', surfaceId: moduleSelect.value, promptModule: moduleEditor.value,
      }), false, 'primary'), resetModule)
      moduleWrap.append(moduleSelect, moduleEditor, moduleActions)
      box.appendChild(panelSection('Surface Module Editor', moduleWrap))
    }

    const preview = buildUtilityPreview()
    const previewWrap = document.createElement('div')
    previewWrap.className = 'dg-modal'
    const summary = document.createElement('div')
    summary.className = 'dg-recovery-note'
    summary.textContent = `Expanded modules: ${preview.moduleIds.join(', ') || 'none'}`
    const pre = document.createElement('pre')
    pre.className = 'dg-pre'
    pre.textContent = preview.content
    const previewActions = document.createElement('div')
    previewActions.className = 'dg-actions'
    previewActions.append(button('Copy Expanded Utility', () => void copyText(preview.content, 'Expanded utility copied'), false, 'subtle'))
    previewWrap.append(summary, previewActions, pre)
    box.appendChild(panelSection('Expanded Preview', previewWrap))
    return box
  }

  function renderCustomSurfaceStudio(): HTMLElement {
    const box = document.createElement('div')
    const intro = document.createElement('div')
    intro.className = 'dg-surface-intro'
    const introCopy = document.createElement('div')
    introCopy.innerHTML = '<strong>Surface Presets</strong><span>Choose the visual preset used by each surface. The shared utility and semantic payload stay identical across both renderers.</span>'
    const introActions = document.createElement('div')
    introActions.className = 'dg-actions'
    introActions.append(
      button('Create New Surface', () => openEditSurface(), false, 'primary'),
      button('Copy Artifact Media Example', () => void copyText(`<div class="case-photo">
  <image_request id="case-photo-01" target="custom.artifact-media" slot="case-photo" aspect="4:3" alt="Evidence photograph of an empty corridor">
    <scene_brief>Empty institutional corridor under fluorescent light, one visitor badge on the floor, documentary evidence framing, the empty environment as the complete visible subject.</scene_brief>
  </image_request>
</div>`, 'Artifact Media example copied'), false, 'subtle'),
    )
    intro.append(introCopy, introActions)
    box.appendChild(panelSection('Surface Suite', intro))
    box.appendChild(panelDisclosure('Add Relay Images to an Existing Tracker', renderTrackerIllustrationGuide()))

    const groups = new Map<string, CustomSurfaceDefinition[]>()
    for (const definition of Object.values(customSurfaces.definitions || {})) {
      const group = groups.get(definition.baseSurfaceId) || []
      group.push(definition)
      groups.set(definition.baseSurfaceId, group)
    }
    const ordered = [...groups.entries()].sort((a, b) => {
      const aa = a[1].find(item => item.builtIn)?.displayName || a[0]
      const bb = b[1].find(item => item.builtIn)?.displayName || b[0]
      return aa.localeCompare(bb)
    })
    const grid = document.createElement('div')
    grid.className = 'dg-surface-grid'
    for (const [, definitions] of ordered) {
      definitions.sort((a, b) => Number(b.builtIn) - Number(a.builtIn) || a.presetName.localeCompare(b.presetName))
      for (const definition of definitions) grid.appendChild(renderSurfaceDefinition(definition))
    }
    box.appendChild(panelSection('Surface Presentation Presets', grid))
    return box
  }

  function renderSurfaceDefinition(definition: CustomSurfaceDefinition): HTMLElement {
    const errors = customSurfaces.validationErrors[definition.surfaceId] || []
    const active = customSurfaces.activePresetIds?.[definition.baseSurfaceId] === definition.surfaceId
    const card = document.createElement('article')
    card.className = `dg-surface-card${definition.enabled ? ' is-enabled' : ''}${errors.length ? ' has-error' : ''}${active ? ' is-active' : ''}`
    const icon = document.createElement('div'); icon.className = 'dg-surface-icon'; icon.textContent = definition.icon || '◇'
    const body = document.createElement('div'); body.className = 'dg-surface-body'
    const title = document.createElement('strong'); title.textContent = definition.displayName
    const meta = document.createElement('span'); meta.className = 'dg-surface-meta'; meta.textContent = `${definition.presetName} · ${titleCase(definition.shellMode)} · [${definition.canonicalOuterWrapper}]`
    const copy = document.createElement('p')
    copy.textContent = `${definition.targetId} · ${definition.supportedAspectRatios.join(' · ') || 'structured surface'} · ${definition.density} · ${definition.mediaFit}`
    const actions = document.createElement('div'); actions.className = 'dg-actions dg-surface-actions'
    actions.append(
      button(active ? 'Selected Preset' : 'Use Preset', () => sendSurfaceAction(definition.surfaceId, 'activate'), active, active ? 'primary' : 'subtle'),
      button('Preview', () => openSurfacePreview(definition), false, 'subtle'),
      button('Copy XML Example', () => void copyText(definition.sampleXml, `${definition.displayName} XML example copied`), false, 'subtle'),
      button(definition.builtIn ? 'Edit as Preset' : 'Duplicate', () => sendSurfaceAction(definition.surfaceId, 'duplicate'), false, 'subtle'),
      button(definition.enabled ? 'Disable' : 'Enable', () => sendSurfaceAction(definition.surfaceId, definition.enabled ? 'disable' : 'enable'), false, 'subtle'),
    )
    if (!definition.builtIn) {
      actions.append(
        button('Edit Preset', () => openEditSurface(definition), false, 'subtle'),
        button('Delete', () => sendSurfaceAction(definition.surfaceId, 'delete'), false, 'danger'),
      )
    }
    body.append(title, meta, copy)
    body.appendChild(actions)
    card.append(icon, body, chip(errors.length ? 'Needs Fix' : !definition.enabled ? 'Disabled' : active ? 'Ready to Use' : 'Available', errors.length ? 'failed' : definition.enabled && active ? 'completed' : ''))
    return card
  }

  function sendSurfaceAction(surfaceId: string, action: 'duplicate' | 'enable' | 'disable' | 'delete' | 'activate'): void {
    const existing = customSurfaces.definitions[surfaceId]
    if (existing && ['enable', 'disable', 'delete', 'activate'].includes(action)) {
      const now = Date.now()
      const definitions = { ...customSurfaces.definitions }
      const activePresetIds = { ...customSurfaces.activePresetIds }
      if (action === 'delete') {
        delete definitions[surfaceId]
        if (activePresetIds[existing.baseSurfaceId] === surfaceId) {
          const fallback = Object.values(definitions).find(definition => definition.baseSurfaceId === existing.baseSurfaceId && definition.builtIn)
            || Object.values(definitions).find(definition => definition.baseSurfaceId === existing.baseSurfaceId)
          if (fallback) activePresetIds[existing.baseSurfaceId] = fallback.surfaceId
          else delete activePresetIds[existing.baseSurfaceId]
        }
      } else {
        definitions[surfaceId] = {
          ...existing,
          ...(action === 'enable' ? { enabled: true } : action === 'disable' ? { enabled: false } : {}),
          updatedAt: now,
        }
        if (action === 'activate') activePresetIds[existing.baseSurfaceId] = surfaceId
      }
      customSurfaces = { ...customSurfaces, definitions, activePresetIds, updatedAt: now }
      renderPanel()
    }
    ctx.sendToBackend({ type: 'custom_surface_action', chatId: activeChatId, surfaceId, action })
  }

  function openEditSurface(existing?: CustomSurfaceDefinition): void {
    if (existing?.builtIn) { showToast('info', 'Built-in presets are protected. Use Edit as Preset to duplicate one first.'); return }
    // Lumiverse supplies its native top-right close control, Escape handling, and
    // backdrop dismissal whenever the modal is non-persistent.
    const modal = ctx.ui.showModal({ title: existing ? 'Edit Custom Surface' : 'Create Custom Surface', width: 820, persistent: false })
    modal.root.classList.add('dg-router-panel', 'dg-modal-host')
    const body = document.createElement('div')
    body.className = 'dg-modal dg-surface-creator'

    const display = creatorTextField(
      'Surface name',
      existing?.displayName || '',
      'The human-readable name shown in the Surface Library.',
      'Relationship Map',
    )
    const preset = creatorTextField(
      'Preset name',
      existing?.presetName || 'My Preset',
      'Names this visual presentation. Multiple presets may share one Base Surface ID.',
      'Relay Default',
    )
    const icon = creatorTextField(
      'Icon',
      existing?.icon || '◇',
      'A short emoji or symbol used in the Library.',
      '🕸️',
    )
    const id = creatorTextField(
      'Surface ID',
      existing?.surfaceId || '',
      'Unique internal ID for this exact surface or preset. Use lowercase letters, numbers, hyphens, dots, or underscores. For a brand-new surface, start with the recommended ID.',
      'e.g. relationship-map',
    )
    const base = creatorTextField(
      'Base Surface ID',
      existing?.baseSurfaceId || '',
      'Groups presets that share the same semantic surface. For a brand-new surface this should normally match Surface ID. Use a different value only when creating another visual preset for an existing surface.',
      'e.g. relationship-map',
    )
    const wrapper = creatorTextField(
      'XML Surface Root',
      existing?.canonicalOuterWrapper || '',
      'The XML root the Story Model writes. Enter the name only. Example: relationship_map becomes <relationship_map>...</relationship_map>.',
      'e.g. relationship_map',
    )
    const target = creatorTextField(
      'Image Target',
      existing?.targetId || '',
      'The route Relay uses for image requests owned by this surface. New standalone media usually uses custom.<base-surface-id>. A board containing portrait slots may use custom.artifact-media.',
      'e.g. custom.relationship-map',
    )
    const launcher = creatorTextField(
      'Launcher label',
      existing?.launcherLabel || existing?.displayName || '',
      'Text shown on the compact collapsible launcher.',
      'Open Relationship Map',
    )
    const width = creatorTextField(
      'Maximum width',
      existing?.maxWidth || '760px',
      'CSS width cap for the rendered surface.',
      '920px',
    )
    const accent = creatorTextField(
      'Custom accent',
      existing?.customAccent || '#c24b78',
      'Used only when Accent is set to Custom Accent.',
      '#c24b78',
    )
    const aspects = creatorTextField(
      'Supported aspect ratios',
      existing?.supportedAspectRatios?.join(', ') || '1:1, 4:3, 16:9',
      'Comma-separated image ratios allowed for this surface.',
      '1:1, 4:3, 16:9',
    )
    const sample = modalTextareaWithHelp(
      'Canonical Validation Fixture',
      existing?.sampleXml || '',
      'The complete canonical XML example used for validation, preview and Story Model instructions. Preserve its attributes, fields and order.',
      false,
      '<my_surface>...</my_surface>',
    )
    const utility = modalTextareaWithHelp(
      'Surface Utility / Model Instructions',
      existing?.promptModule || '',
      'These instructions are injected when this surface is enabled. Explain when to use it, viewpoint limits, XML fields, image-request ownership and the exact XML output format.',
      false,
      '[MY SURFACE — REVERIE RELAY UTILITY]\n\nUse this surface when...\n\nOUTPUT FORMAT — EXACT\n[my_surface]...[/my_surface]',
    )
    const css = modalTextareaWithHelp(
      'Advanced namespaced CSS',
      existing?.advancedCss || '',
      'Optional presentation-only CSS. Every selector must begin with this exact preset scope. Global selectors, nested rules, scripts, imports, and URLs are rejected.',
      false,
      `.rrn-surface[data-rrn-preset="${existing?.surfaceId || 'my-surface'}"] .rrn-title { color: #c24b78; }`,
    )

    const shell = selectField('Shell Mode', existing?.shellMode === 'collapsible' ? 'plain' : existing?.shellMode || 'inline', [['inline', 'Inline'], ['plain', 'Button'], ['sparkling', 'Sparkling Button'], ['glass', 'Glass Button'], ['plain-glass', 'Plain Glass']], () => {})
    const density = selectField('Density', existing?.density || 'comfortable', [['compact', 'Compact'], ['comfortable', 'Comfortable'], ['spacious', 'Spacious']], () => {})
    const fit = selectField('Media Fit', existing?.mediaFit || 'contain', [['contain', 'Contain'], ['cover', 'Cover']], () => {})
    const typography = selectField('Typography', existing?.typography || 'mixed', [['system', 'System'], ['editorial', 'Editorial'], ['mono', 'Mono'], ['mixed', 'Mixed']], () => {})
    const accentMode = selectField('Accent', existing?.accentMode || 'theme', [['theme', 'Use Lumiverse Theme'], ['custom', 'Custom Accent']], () => {})
    const promptCategory = selectField('Utility Category', existing?.promptCategory || 'custom', [
      ['social-messaging', 'Social & Messaging'],
      ['photography-keepsakes', 'Photography & Keepsakes'],
      ['covers-promotion', 'Covers & Promotion'],
      ['evidence-editorial', 'Evidence & Editorial'],
      ['narrative-visuals', 'Narrative Visuals'],
      ['custom', 'Custom Surfaces'],
    ], () => {})
    const promptProfileOptions = new Map<string, [string, string]>([['auto', ['auto', 'Automatic (chat/global default)']]])
    for (const promptProfile of config?.promptProfiles || []) {
      if (promptProfile.id !== 'auto') promptProfileOptions.set(promptProfile.id, [promptProfile.id, `${promptProfile.name}${promptProfile.builtIn ? ' (built-in)' : ''}`])
    }
    const existingProfileId = existing?.defaultPromptProfileId || 'auto'
    if (!promptProfileOptions.has(existingProfileId)) promptProfileOptions.set(existingProfileId, [existingProfileId, `Unavailable profile (${existingProfileId})`])
    const profile = selectField('Default Prompt Profile', existingProfileId, [...promptProfileOptions.values()], () => {})
    const peoplePolicy = selectField('People Policy', existing?.peoplePolicy || 'allow', [
      ['allow', 'Allow people'],
      ['discourage', 'Discourage people'],
      ['require', 'Require people'],
      ['forbid', 'Forbid people'],
    ], () => {})

    const defaultOpen = toggleCard('Open Collapsible by Default', 'Only applies when Shell Mode is Collapsible.', existing?.defaultOpen === true, () => {})
    const enabled = toggleCard('Surface Enabled', 'Makes the renderer and Surface Library recognize this surface.', existing?.enabled !== false, () => {})
    const promptEnabled = toggleCard('Inject Surface Utility', 'Adds the Utility / Model Instructions to automatic surface prompt injection.', existing?.promptEnabled !== false, () => {})
    const mediaRequired = toggleCard('Require Image', 'On: the validation example must include an owned image request. Off: this Surface may be text-only.', existing ? existing.mediaRequired ?? containsImageRequestMarkup(existing.sampleXml) : true, () => {})

    const getSelect = (node: HTMLElement) => node.querySelector('select') as HTMLSelectElement
    const getToggle = (node: HTMLElement) => node.querySelector('input') as HTMLInputElement
    const getText = (node: HTMLElement) => {
      const control = node.querySelector('textarea, input') as HTMLTextAreaElement | HTMLInputElement | null
      return control?.value.trim() || ''
    }
    const setText = (node: HTMLElement, value: string) => {
      const control = node.querySelector('textarea, input') as HTMLTextAreaElement | HTMLInputElement | null
      if (control) control.value = value
    }

    const recommendedIds = button('Fill Recommended IDs', () => {
      const name = getText(display) || 'Custom Surface'
      const surfaceId = slugifySurfaceId(name) || 'custom-surface'
      setText(id, surfaceId)
      setText(base, surfaceId)
      setText(wrapper, surfaceId.replace(/[.-]/g, '_'))
      setText(target, `custom.${surfaceId}`)
      if (!getText(launcher)) setText(launcher, name)
    }, false, 'subtle')

    const generateUtilityStarter = () => {
      const name = getText(display) || 'Custom Surface'
      const baseSurfaceId = slugifySurfaceId(getText(base) || getText(id) || name) || 'custom-surface'
      const tag = getText(wrapper) || baseSurfaceId.replace(/[.-]/g, '_')
      const imageTarget = getText(target) || `custom.${baseSurfaceId}`
      if (!getToggle(mediaRequired).checked) {
        const fixture = `<${tag}><title>Scene-supported title</title><content>Concise in-world content.</content></${tag}>`
        setText(utility, `[${name.toLocaleUpperCase()} — REVERIE RELAY UTILITY]

Use this text-only Surface when it adds a clear in-world artifact. Show only information available to the focal viewpoint.

OUTPUT FORMAT — EXACT
Output one complete XML Surface only. No Markdown fence, HTML or explanation. Do not add an image_request.

${fixture}`)
        if (!getText(sample)) setText(sample, fixture)
        return
      }
      const aspect = getText(aspects).split(/[,\s]+/).find(Boolean) || '1:1'
      const fixture = `<${tag}>
<media>
<image_request id="${baseSurfaceId}-001" target="${imageTarget}" slot="${baseSurfaceId}-media-1" aspect="${aspect}" alt="${name} image">
<scene_brief>Complete scene-specific visual description covering visible subjects, environment, lighting, camera, framing, and composition. No readable interface text.</scene_brief>
</image_request>
</media>
<content>Add the surface's required semantic text fields here.</content>
</${tag}>`
      const bracketFixture = fixture
      setText(utility, xmlAuthoringInstructions(`[${name.toLocaleUpperCase()} — REVERIE RELAY UTILITY]

Use this surface when it materially improves clarity or immersion.
Do not use it when the same information is already clear in prose.

VIEWPOINT RULES
Show only information available to the current focal viewpoint.

IMAGE RULES
- Include at least one complete <image_request> whenever this surface is authored.
- Keep each request inside the field that owns the final image.
- Use target="${imageTarget}".
- Use aspect="${aspect}" unless the contract allows another supported ratio.
- Give every request a unique id and matching unique slot.
- Describe visible subjects, environment, lighting, framing, and composition in <scene_brief>.
- Do not request readable interface text inside generated images.

OUTPUT FORMAT — EXACT
Output one complete XML Surface only. No Markdown fence, HTML or explanation. Keep each XML image_request inside its documented media element.

${bracketFixture}`))
      if (!getText(sample)) setText(sample, fixture)
    }
    const utilityStarter = button('Generate Utility Starter', generateUtilityStarter, false, 'subtle')

    const exampleChoices = document.createElement('div')
    exampleChoices.className = 'dg-actions'
    const loadExample = (kind: 'memo' | 'photo' | 'comparison') => {
      if (existing) return
      if ((getText(display) || getText(id) || getText(utility) || getText(sample))
        && !window.confirm('Replace the current unsaved Surface draft with this example?')) return
      const name = kind === 'memo' ? 'Field Memo' : kind === 'photo' ? 'Evidence Photo Card' : 'Before and After Board'
      const surfaceId = kind === 'memo' ? 'field-memo' : kind === 'photo' ? 'evidence-photo-card' : 'before-after-board'
      const root = surfaceId.replace(/-/g, '_')
      const imageTarget = `custom.${surfaceId}`
      setText(display, name)
      setText(id, surfaceId)
      setText(base, surfaceId)
      setText(wrapper, root)
      setText(target, imageTarget)
      setText(launcher, `Open ${name}`)
      setText(icon, kind === 'memo' ? '▤' : kind === 'photo' ? '▧' : '◫')
      setText(aspects, kind === 'memo' ? '4:3' : kind === 'photo' ? '4:3' : '1:1, 4:3')
      getToggle(mediaRequired).checked = kind !== 'memo'
      getSelect(promptCategory).value = kind === 'memo' ? 'narrative-visuals' : 'evidence-editorial'
      getSelect(shell).value = kind === 'memo' ? 'plain' : 'inline'
      setText(sample, '')
      setText(utility, '')
      generateUtilityStarter()
      if (kind === 'comparison') {
        const fixture = `<${root}>\n<title>Scene-supported comparison title</title>\n<before><image_request id="${surfaceId}-before-001" target="${imageTarget}" slot="${surfaceId}-before" aspect="4:3" alt="Before view"><scene_brief>The established before state, with camera position, visible subjects, and environment.</scene_brief></image_request></before>\n<after><image_request id="${surfaceId}-after-001" target="${imageTarget}" slot="${surfaceId}-after" aspect="4:3" alt="After view"><scene_brief>The established after state from a comparable camera position. Describe only changes supported by the story.</scene_brief></image_request></after>\n</${root}>`
        setText(sample, fixture)
        setText(utility, xmlAuthoringInstructions(`[${name.toLocaleUpperCase()} — REVERIE RELAY UTILITY]\n\nUse this Surface only when two distinct, story-established states can be compared. Never invent a before or after state.\n\nOUTPUT FORMAT — EXACT\nWrite one XML Surface. Keep both XML image requests in their own before and after elements, with distinct ids and slots. Describe the two views without asking the image model to draw text or labels.\n\n${fixture}`))
      }
    }
    if (!existing) exampleChoices.append(
      button('Use Text-Only Memo Example', () => loadExample('memo'), false, 'subtle'),
      button('Use Single-Image Card Example', () => loadExample('photo'), false, 'subtle'),
      button('Use Two-Image Board Example', () => loadExample('comparison'), false, 'subtle'),
    )

    const basics = creatorSection(
      '1 · Basics',
      'Name the surface and its visual preset. These are the labels people see.',
      display, preset, icon,
    )
    const identifiers = creatorSection(
      '2 · Technical Identifiers',
      'Reverie can fill safe defaults for a new Surface. Its XML example is used for model instructions, validation and rendering.',
      recommendedIds, id, base, wrapper, target,
    )
    const modelContract = creatorSection(
      '3 · Utility & Surface Contract',
      'The Utility teaches the Story Model when and how to author XML. Choose whether this Surface needs an image, then generate a starter and tailor its complete XML example.',
      promptEnabled, mediaRequired, promptCategory, utilityStarter, utility, sample,
    )
    const presentationDetails = document.createElement('details')
    presentationDetails.className = 'dg-creator-advanced'
    const presentationSummary = document.createElement('summary')
    presentationSummary.textContent = '4 · Presentation & Advanced Settings'
    const presentationBody = document.createElement('div')
    presentationBody.className = 'dg-creator-advanced-body'
    presentationBody.append(
      shell, defaultOpen, launcher, density, width, fit, profile, peoplePolicy,
      accentMode, accent, typography, aspects, css, enabled,
    )
    presentationDetails.append(presentationSummary, presentationBody)

    const actions = document.createElement('div')
    actions.className = 'dg-actions dg-creator-actions'
    const saveButton = button(existing ? 'Save Surface' : 'Create Surface', () => {
        const surfaceId = slugifySurfaceId(getText(id) || getText(display))
        const baseSurfaceId = slugifySurfaceId(getText(base) || surfaceId)
        const canonicalOuterWrapper = getText(wrapper).replace(/[^A-Za-z0-9_-]/g, '')
        const targetId = getText(target) || `custom.${baseSurfaceId}`
        const promptModule = getText(utility)
        if (!surfaceId || !baseSurfaceId || !canonicalOuterWrapper || !targetId) {
          showToast('error', 'Surface name, Surface ID, Base Surface ID, XML Surface Root, and Image Target are required.')
          return
        }
        const cssErrors = validateDeclarativeSurfaceCss(getText(css), surfaceId)
        if (cssErrors.length) {
          presentationDetails.open = true
          showToast('error', cssErrors[0])
          return
        }
        if (getToggle(promptEnabled).checked && !promptModule) {
          showToast('error', 'Write the Surface Utility or switch off Inject Surface Utility.')
          return
        }
        const fixture = getText(sample)
        if (!fixture.includes(`<${canonicalOuterWrapper}`) || !fixture.includes(`</${canonicalOuterWrapper}>`)) {
          showToast('error', 'Add one complete XML validation fixture using the XML Surface Root.')
          return
        }
        if (getToggle(mediaRequired).checked && !containsImageRequestMarkup(fixture)) {
          showToast('error', 'Add an owned image request to the fixture, or switch off Require Image for a text-only Surface.')
          return
        }
        const definition: Partial<CustomSurfaceDefinition> = {
          surfaceId,
          baseSurfaceId,
          basedOnSurfaceId: existing?.basedOnSurfaceId,
          presetName: getText(preset) || 'My Preset',
          shellMode: getSelect(shell).value as CustomSurfaceDefinition['shellMode'],
          defaultOpen: getToggle(defaultOpen).checked,
          launcherLabel: getText(launcher) || getText(display),
          density: getSelect(density).value as CustomSurfaceDefinition['density'],
          maxWidth: getText(width) || '760px',
          mediaFit: getSelect(fit).value as CustomSurfaceDefinition['mediaFit'],
          accentMode: getSelect(accentMode).value as CustomSurfaceDefinition['accentMode'],
          customAccent: getText(accent) || '#c24b78',
          typography: getSelect(typography).value as CustomSurfaceDefinition['typography'],
          advancedCss: getText(css),
          displayName: getText(display) || titleCase(baseSurfaceId),
          icon: getText(icon) || '◇',
          targetId: targetId as CustomSurfaceDefinition['targetId'],
          canonicalOuterWrapper,
          imageSlotSelector: 'img',
          resolvedImageChildFormat: existing?.resolvedImageChildFormat || '<img src="{{imageUrl}}" alt="{{alt}}" data-dgir-key="{{slotKey}}" data-dgir-request-id="{{requestId}}" data-dgir-slot="{{slot}}" data-dgir-custom-target="{{target}}" data-dgir-image-id="{{imageId}}">',
          sampleXml: fixture,
          mediaRequired: getToggle(mediaRequired).checked,
          defaultPromptProfileId: getSelect(profile).value as CustomSurfaceDefinition['defaultPromptProfileId'],
          supportedAspectRatios: getText(aspects).split(',').map(value => value.trim()).filter(Boolean),
          compatibleRegenerationIntents: existing?.compatibleRegenerationIntents || ['new-angle', 'better-expression', 'preserve-composition-improve-quality', 'full-reimagining'],
          peoplePolicy: getSelect(peoplePolicy).value as CustomSurfaceDefinition['peoplePolicy'],
          captionSupport: true,
          altTextSupport: true,
          defaultCandidateCount: existing?.defaultCandidateCount || 1,
          declarativeLayoutFields: existing?.declarativeLayoutFields || {},
          validationRules: existing?.validationRules || ['balanced-wrapper', 'safe-static-markup', 'stable-request-ownership'],
          deterministicPreviewFixture: { title: getText(display) || titleCase(baseSurfaceId), targetId },
          builtIn: false,
          enabled: getToggle(enabled).checked,
          promptEnabled: getToggle(promptEnabled).checked,
          promptCategory: getSelect(promptCategory).value as CustomSurfaceDefinition['promptCategory'],
          promptModule,
        }
        const requestId = `surface-save-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
        saveButton.disabled = true
        pendingCustomSurfaceSaves.set(requestId, (ok, error) => {
          saveButton.disabled = false
          if (ok) { modal.dismiss(); showToast('success', existing ? 'Surface saved.' : 'Surface created.') }
          else showToast('error', error || 'Surface could not be saved. Your draft is still here.')
        })
        try {
          ctx.sendToBackend({ type: 'custom_surface_action', chatId: activeChatId, requestId, action: existing ? 'edit' : 'create', surfaceId: existing?.surfaceId || surfaceId, definition })
        } catch (error) {
          pendingCustomSurfaceSaves.delete(requestId)
          saveButton.disabled = false
          showToast('error', error instanceof Error ? error.message : 'Surface could not be sent. Your draft is still here.')
        }
    }, false, 'primary')
    actions.append(button('Cancel', () => modal.dismiss(), false, 'subtle'), saveButton)

    body.append(
      creatorNotice(
        'Guided Custom Surface Creator',
        'Load an example or start with the name. Review the Utility and complete fixture before saving; Relay keeps your draft open until it confirms the save.',
      ),
      ...(!existing ? [creatorSection('Start from an Example', 'These fill the fields below with text-only, single-image, or two-image ownership patterns. Loading a different example replaces the draft.', exampleChoices)] : []),
      basics,
      identifiers,
      modelContract,
      presentationDetails,
      actions,
    )
    modal.root.appendChild(body)
  }

  function creatorNotice(titleText: string, detailText: string): HTMLElement {
    const node = document.createElement('div')
    node.className = 'dg-creator-notice'
    const title = document.createElement('strong')
    title.textContent = titleText
    const detail = document.createElement('span')
    detail.textContent = detailText
    node.append(title, detail)
    return node
  }

  function creatorSection(titleText: string, detailText: string, ...children: Node[]): HTMLElement {
    const section = document.createElement('section')
    section.className = 'dg-creator-section'
    const title = document.createElement('h3')
    title.textContent = titleText
    const detail = document.createElement('p')
    detail.textContent = detailText
    const grid = document.createElement('div')
    grid.className = 'dg-creator-grid'
    grid.append(...children)
    section.append(title, detail, grid)
    return section
  }

  function creatorTextField(labelText: string, value: string, helpText: string, placeholder = ''): HTMLElement {
    const input = document.createElement('input')
    input.type = 'text'
    input.className = 'dg-input'
    input.value = value
    input.placeholder = placeholder
    const field = fieldWrap(labelText, input, helpText)
    const help = document.createElement('div')
    help.className = 'dg-field-help'
    help.textContent = helpText
    field.appendChild(help)
    return field
  }

  function modalTextareaWithHelp(labelText: string, value: string, helpText: string, short = false, placeholder = ''): HTMLElement {
    const field = modalTextarea(labelText, value, short, helpText)
    const textarea = field.querySelector('textarea')
    if (textarea) textarea.placeholder = placeholder
    const help = document.createElement('div')
    help.className = 'dg-field-help'
    help.textContent = helpText
    field.appendChild(help)
    return field
  }

  function slugifySurfaceId(value: string): string {
    return value.toLocaleLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 63)
  }

  function openSurfacePreview(definition: CustomSurfaceDefinition): void {
    const modal = ctx.ui.showModal({ title: `${definition.displayName} · ${definition.presetName}`, width: 760 })
    modal.root.classList.add('dg-router-panel', 'dg-modal-host')
    const body = document.createElement('div')
    body.className = 'dg-modal'
    const preview = document.createElement('div')
    preview.innerHTML = renderNativeSurfaceMarkup(definition.sampleXml, {
      ...customSurfaces,
      activePresetIds: { ...customSurfaces.activePresetIds, [definition.baseSurfaceId]: definition.surfaceId },
    }, { chatId: activeChatId || 'preview', messageId: 'preview-message' }).content
    const actions = document.createElement('div')
    actions.className = 'dg-actions'
    const bracketExample = definition.sampleXml
    actions.append(
      button('Copy XML Example', () => void copyText(bracketExample, 'XML example copied'), false, 'subtle'),
      button('Copy Preset JSON', () => void copyText(JSON.stringify(definition, null, 2), 'Surface preset JSON copied'), false, 'subtle'),
    )
    const pre = document.createElement('pre')
    pre.className = 'dg-pre'
    pre.textContent = JSON.stringify({ definition, errors: customSurfaces.validationErrors[definition.surfaceId] || [] }, null, 2)
    body.append(preview, actions, pre)
    modal.root.appendChild(body)
  }

  function renderSlotFilters(value: SlotFilter, onChange: (value: SlotFilter) => void): HTMLElement {
    const row = document.createElement('div')
    row.className = 'dg-filter-row'
    const options: SlotFilter[] = ['all', 'active', 'generating', 'failed', 'completed', 'recovered']
    if (config?.includeInactiveSwipesInRescan || records.some(record => record.recoveredFromInactiveSwipe)) options.push('inactive')
    for (const option of options) {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = `dg-filter-pill ${value === option ? 'dg-filter-pill-active' : ''}`
      btn.textContent = filterLabel(option)
      btn.setAttribute('aria-pressed', String(value === option))
      btn.addEventListener('click', () => onChange(option))
      row.appendChild(btn)
    }
    return row
  }

  function filterLabel(value: SlotFilter): string {
    if (value === 'active') return 'Current Swipe'
    if (value === 'inactive') return 'Inactive Swipes'
    return titleCase(value)
  }

  function matchesSlotFilter(record: SlotRecord, filter: SlotFilter): boolean {
    if (filter === 'all') return true
    if (filter === 'active') return !record.recoveredFromInactiveSwipe
    if (filter === 'generating') return record.status === 'generating'
    if (filter === 'recovered') return Boolean(record.recoverySource)
    if (filter === 'inactive') return record.recoveredFromInactiveSwipe === true
    return record.status === filter
  }

  function renderAllReverieImages(): HTMLElement {
    const box = document.createElement('div')
    const all = Object.values(assetLibrary.assets || {})
      .filter(asset => !activeChatId || asset.chatId === activeChatId)
      .sort((a, b) => (b.lastUsedAt || b.updatedAt) - (a.lastUsedAt || a.updatedAt))
    const characters = [...new Set(all.flatMap(asset => asset.characterNames || []).filter(Boolean))].sort()
    const targets = [...new Set(all.map(asset => String(asset.target)).filter(Boolean))].sort()
    const surfaces = [...new Set(all.map(asset => String((asset.metadata || {}).surfaceId || asset.targetApp || 'unknown')).filter(Boolean))].sort()
    const controls = document.createElement('div'); controls.className = 'dg-settings-grid'
    const results = document.createElement('div')
    let drawResults = () => {}
    const search = document.createElement('input'); search.type = 'search'; search.className = 'dg-input'; search.placeholder = 'Search this chat’s images'; search.value = allChatsQuery
    search.addEventListener('input', () => { allChatsQuery = search.value; drawResults() })
    controls.append(
      fieldWrap('Search', search, 'Find images in this chat by title, image description, character, location, tag, request, or prompt excerpt.'),
      selectField('Character', allChatsCharacterFilter, [['all', 'All Characters'], ...characters.map(value => [value, value] as [string,string])], value => { allChatsCharacterFilter = value; drawResults() }),
      selectField('Target', allChatsTargetFilter, [['all', 'All Targets'], ...targets.map(value => [value, titleCase(value)] as [string,string])], value => { allChatsTargetFilter = value; drawResults() }),
      selectField('Surface', allChatsSurfaceFilter, [['all', 'All Surfaces'], ...surfaces.map(value => [value, titleCase(value)] as [string,string])], value => { allChatsSurfaceFilter = value; drawResults() }),
      selectField('Date', allChatsDateFilter, [['all', 'Any Date'], ['7d', 'Last 7 Days'], ['30d', 'Last 30 Days'], ['90d', 'Last 90 Days']], value => { allChatsDateFilter = value; drawResults() }),
      selectField('Status', allChatsStatusFilter, [['all', 'All Statuses'], ['available', 'Available'], ['unavailable', 'Unavailable'], ['retained', 'Retained after deletion']], value => { allChatsStatusFilter = value; drawResults() }),
    )
    box.appendChild(panelSection('Current Chat Images Filters', controls))
    drawResults = () => {
      const filtered = all.filter(asset => matchesAllReverieImageFilters(asset))
      const note = document.createElement('div'); note.className = 'dg-recovery-note'; note.textContent = `${filtered.length} of ${all.length} Relay images in this chat.`
      results.replaceChildren(note)
      if (!filtered.length) {
        results.appendChild(empty('No Relay-generated images match these filters.'))
        return
      }
      const list = document.createElement('div'); list.className = 'dg-history-track'
      for (const asset of filtered) list.appendChild(renderAssetCard(asset))
      results.appendChild(list)
    }
    box.appendChild(results)
    drawResults()
    return box
  }

  function fieldWrap(labelText: string, control: HTMLElement, helpText = ''): HTMLElement {
    const field = document.createElement('div'); field.className = 'dg-field'
    const label = fieldLabel(labelText, helpText)
    field.append(label, control); return field
  }

  function matchesAllReverieImageFilters(asset: VisualAssetReference): boolean {
    if (activeChatId && asset.chatId !== activeChatId) return false
    if (allChatsCharacterFilter !== 'all' && !(asset.characterNames || []).includes(allChatsCharacterFilter)) return false
    if (allChatsTargetFilter !== 'all' && String(asset.target) !== allChatsTargetFilter) return false
    const surface = String((asset.metadata || {}).surfaceId || asset.targetApp || 'unknown')
    if (allChatsSurfaceFilter !== 'all' && surface !== allChatsSurfaceFilter) return false
    if (allChatsStatusFilter === 'available' && (!asset.imageUrl || asset.status === 'unavailable')) return false
    if (allChatsStatusFilter === 'unavailable' && asset.status !== 'unavailable') return false
    if (allChatsStatusFilter === 'retained' && !asset.sourceDeletedAt) return false
    const age = Date.now() - asset.createdAt
    if (allChatsDateFilter === '7d' && age > 7 * 86400000) return false
    if (allChatsDateFilter === '30d' && age > 30 * 86400000) return false
    if (allChatsDateFilter === '90d' && age > 90 * 86400000) return false
    const query = allChatsQuery.trim().toLocaleLowerCase()
    if (!query) return true
    return [asset.caption, asset.alt, asset.characterNames.join(' '), asset.locationNames.join(' '), asset.tags.join(' '),
      asset.requestId, asset.slot, asset.imageId, asset.target, surface, asset.searchIndex,
    ].join(' ').toLocaleLowerCase().includes(query)
  }

  function renderHistoryList(): HTMLElement {
    const box = document.createElement('div')
    const tabs = document.createElement('div')
    tabs.className = 'dg-history-subtabs'
    const choices: Array<[HistorySubTab, string]> = [
      ['all-chats-gallery', 'Current Chat Images'],
      ['slot-history', 'Current Chat & Versions'],
      ['deleted-message-images', 'Deleted Message Images'],
      ['illustrator-candidates', 'Illustrator Candidates'],
      ['inline-illustrations', 'Inline Illustrations'],
    ]
    for (const [id, label] of choices) tabs.append(button(label, () => { historySubTab = id; renderPanel() }, false, historySubTab === id ? 'primary' : 'subtle'))
    box.appendChild(tabs)
    if (historySubTab === 'all-chats-gallery') { box.appendChild(renderAllReverieImages()); return box }
    if (historySubTab === 'slot-history') { box.appendChild(renderSlotVersionHistory()); return box }
    if (historySubTab === 'deleted-message-images') {
      const archived = Object.values(assetLibrary.assets || {})
        .filter(asset => Boolean(asset.sourceDeletedAt) && (!activeChatId || asset.chatId === activeChatId))
        .sort((a, b) => Number(b.sourceDeletedAt || b.updatedAt) - Number(a.sourceDeletedAt || a.updatedAt))
      const note = document.createElement('div')
      note.className = 'dg-deleted-asset-note'
      const strong = document.createElement('strong'); strong.textContent = 'Images survive message deletion'
      const detail = document.createElement('span'); detail.textContent = 'Relay removes the deleted message’s active slots and queues, but keeps completed image assets here for reuse, reference, and export.'
      note.append(strong, detail)
      box.appendChild(note)
      if (!archived.length) box.appendChild(empty('No retained images from deleted messages yet.'))
      else {
        const list = document.createElement('div')
        list.className = 'dg-history-track'
        for (const asset of archived) list.appendChild(renderAssetCard(asset))
        box.appendChild(list)
      }
      return box
    }
    if (historySubTab === 'illustrator-candidates') {
      const batches = candidateBatches.filter(item => !activeChatId || item.chatId === activeChatId).sort((a, b) => b.updatedAt - a.updatedAt)
      if (!batches.length) box.appendChild(empty('No replacement candidate batches yet.'))
      for (const batch of batches.slice(0, 30)) {
        const card = document.createElement('div')
        card.className = 'dg-slot-card'
        const title = document.createElement('div')
        title.className = 'dg-history-title'
        title.textContent = `Candidate Batch / ${titleCase(batch.status)}`
        const meta = document.createElement('div')
        meta.className = 'dg-slot-meta'
        meta.textContent = `${batch.messageId} / swipe ${batch.swipeId}\n${batch.mode} / ${batch.candidates.length} candidates / ${new Date(batch.updatedAt).toLocaleString()}`
        const actions = document.createElement('div')
        actions.className = 'dg-actions'
        actions.append(button('Review Candidates', () => openRelayCandidateReview(batch), batch.status !== 'review', 'primary'))
        card.append(title, meta, actions)
        box.appendChild(card)
      }
      return box
    }
    const recordsForChat = Object.values(proseIllustrator.records || {}).filter(record => !activeChatId || proseIllustrator.plans[record.planId]?.chatId === activeChatId).sort((a,b)=>b.createdAt-a.createdAt)
    if (!recordsForChat.length) box.appendChild(empty('No inline prose illustrations yet.'))
    for (const record of recordsForChat) box.appendChild(renderProseIllustrationRecord(record))
    return box
  }

  function renderSlotVersionHistory(): HTMLElement {
    const box = document.createElement('div')
    if (activeChatId && completedHistoryChatId !== activeChatId) {
      completedHistoryChatId = activeChatId
      completedHistoryRows = []
      completedHistoryNextCursor = null
      ctx.sendToBackend({ type: 'completed_history_page', chatId: activeChatId, cursor: 0, limit: 24 })
    }
    if (completedHistoryRows.length) {
      const archivedTitle = document.createElement('h3')
      archivedTitle.className = 'dg-section-title'
      archivedTitle.textContent = `Completed History · ${stats.completedTotal} lifetime`
      const archivedTrack = document.createElement('div')
      archivedTrack.className = 'dg-history-track'
      for (const row of completedHistoryRows) {
        const item = document.createElement('div')
        item.className = 'dg-history-item'
        const imageUrl = String(row.imageUrl || '')
        const image = imageUrl ? document.createElement('img') : document.createElement('div')
        image.className = imageUrl ? 'dg-history-thumb' : 'dg-history-thumb dg-thumb-empty'
        if (image instanceof HTMLImageElement) { image.src = imageUrl.includes('?') ? `${imageUrl}&size=sm` : `${imageUrl}?size=sm`; image.alt = String(row.requestId || 'Relay image'); image.loading = 'lazy' }
        else image.textContent = 'Image'
        const copy = document.createElement('div')
        copy.className = 'dg-slot-meta'
        copy.textContent = `${String(row.requestId || '')} / ${String(row.slot || '')}\n${new Date(Number(row.completedAt) || 0).toLocaleString()}`
        const actions = document.createElement('div')
        actions.className = 'dg-actions'
        if (row.diagnosticArchiveId) {
          const archivedRecord = row as unknown as SlotRecord
          actions.append(
            button('Why Did Relay Do That?', () => requestCompletedRecord(archivedRecord, loaded => loaded && openPromptInspector(loaded)), false, 'subtle'),
            button('Export Diagnostic', () => activeChatId && ctx.sendToBackend({ type: 'completed_diagnostic', chatId: activeChatId, archiveId: String(row.diagnosticArchiveId) }), false, 'subtle'),
          )
        }
        item.append(image, copy, actions)
        archivedTrack.appendChild(item)
      }
      box.append(archivedTitle, archivedTrack)
      if (completedHistoryNextCursor !== null && activeChatId) box.append(button('Load 24 More', () => ctx.sendToBackend({ type: 'completed_history_page', chatId: activeChatId!, cursor: completedHistoryNextCursor || 0, limit: 24 }), false, 'subtle'))
    }
    box.appendChild(renderAssetLibrary())
    box.appendChild(renderSlotFilters(historyFilter, value => { historyFilter = value; renderPanel() }))
    const items: Array<{ record: SlotRecord; version: SlotRecord | GenerationSnapshot; historyIndex?: number; timestamp: number }> = []
    for (const record of records) {
      if (!matchesSlotFilter(record, historyFilter)) continue
      if (record.status === 'completed' && record.imageUrl) items.push({ record, version: record, timestamp: record.completedAt || record.updatedAt })
      else if (record.recoverySource && (record.status === 'completed' || record.status === 'failed')) items.push({ record, version: record, timestamp: record.completedAt || record.failedAt || record.updatedAt })
      record.history.forEach((version, historyIndex) => items.push({ record, version, historyIndex, timestamp: version.generatedAt }))
    }
    items.sort((a, b) => b.timestamp - a.timestamp)
    const historyTitle = document.createElement('h3')
    historyTitle.className = 'dg-section-title'
    historyTitle.textContent = 'Slot Version History'
    box.appendChild(historyTitle)
    if (items.length === 0) {
      box.appendChild(empty(historyFilter === 'all' ? 'No slot history yet.' : `No ${filterLabel(historyFilter).toLocaleLowerCase()} history entries.`))
      return box
    }
    const groups = new Map<string, typeof items>()
    for (const item of items) {
      const label = historyDateLabel(item.timestamp)
      const list = groups.get(label) || []
      list.push(item)
      groups.set(label, list)
    }
    for (const [label, list] of groups) {
      const group = document.createElement('section')
      group.className = 'dg-history-group'
      const heading = document.createElement('h3')
      heading.className = 'dg-history-date'
      heading.textContent = label
      const track = document.createElement('div')
      track.className = 'dg-history-track'
      for (const item of list) track.appendChild(renderHistoryTimelineItem(item.record, item.version, item.historyIndex, item.timestamp))
      group.append(heading, track)
      box.appendChild(group)
    }
    return box
  }

  function renderHistoryTimelineItem(record: SlotRecord, version: SlotRecord | GenerationSnapshot, historyIndex: number | undefined, timestamp: number): HTMLElement {
    const item = document.createElement('div')
    item.className = 'dg-history-item'
    const image = version.imageUrl ? document.createElement('img') : document.createElement('div')
    image.className = version.imageUrl ? 'dg-history-thumb' : 'dg-history-thumb dg-thumb-empty'
    if (image instanceof HTMLImageElement) {
      image.src = version.imageUrl || ''
      image.alt = record.alt || record.slot
    } else image.textContent = record.status === 'failed' ? 'Recovered error' : 'Image unavailable'
    image.title = version.imageUrl ? 'Open image' : 'Image unavailable'
    image.addEventListener('click', () => {
      if (historyIndex === undefined) openLightbox(record)
      else openHistoryVersionImage(record, version as GenerationSnapshot, historyIndex)
    })
    const main = document.createElement('div')
    const head = document.createElement('div')
    head.className = 'dg-history-head'
    const identity = document.createElement('div')
    const title = document.createElement('div')
    title.className = 'dg-history-title'
    title.textContent = `${appLabel(record)} / ${slotLabel(record)}`
    const attempt = version.attemptNumber || record.attemptNumber || 0
    const duration = record.attempts?.find(entry => entry.attemptNumber === attempt)?.durationMs
    const meta = document.createElement('div')
    meta.className = 'dg-slot-meta'
    const provider = version.imageProvider || record.imageProvider || (record.recoverySource ? 'Provider unavailable' : 'Unknown provider')
    const model = version.imageModel || record.imageModel || (record.recoverySource ? 'Model unavailable' : 'Unknown model')
    meta.textContent = `${new Date(timestamp).toLocaleTimeString()}${duration !== undefined ? ` / ${(duration / 1000).toFixed(1)}s` : ''}\n${record.requestId} / ${provider} / ${model}${record.recoveredFromInactiveSwipe ? ' / Inactive swipe' : ''}`
    identity.append(title, meta)
    const modeKnown = version.highResMode !== undefined || record.highResMode !== undefined
    head.append(identity, chip(modeKnown ? (version.highResMode ?? record.highResMode ? 'High-Res' : 'Normal') : 'Mode unknown', version.highResMode ? 'completed' : ''))
    const prompt = document.createElement('div')
    prompt.className = 'dg-history-prompt'
    prompt.textContent = version.resolvedPositivePrompt || record.originalSceneBrief || recoveryHistoryMessage(record)
    const actions = document.createElement('div')
    actions.className = 'dg-actions'
    if (historyIndex === undefined) actions.appendChild(button('Open', () => openLightbox(record), !record.imageUrl, 'standard'))
    else actions.appendChild(button('Restore', () => ctx.sendToBackend({ type: 'restore_history', chatId: record.chatId, key: record.key, historyIndex }), false, 'primary'))
    actions.appendChild(button('Metadata', () => openMetadata(record, historyIndex === undefined ? undefined : version as GenerationSnapshot, historyIndex)))
    main.append(head, prompt, actions)
    item.append(image, main)
    return item
  }

  function historyDateLabel(timestamp: number): string {
    const date = new Date(timestamp)
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const day = new Date(date); day.setHours(0, 0, 0, 0)
    const difference = Math.round((today.getTime() - day.getTime()) / 86400000)
    if (difference === 0) return 'Today'
    if (difference === 1) return 'Yesterday'
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
  }

  function renderLogs(): HTMLElement {
    const box = document.createElement('div')
    if (config) box.appendChild(renderDiagnosticsHub(config))
    const stages = [...new Set(logs.map(entry => entry.stage))].sort()
    const targets = [...new Set(logs.map(entry => entry.target).filter((value): value is string => Boolean(value)))].sort()
    const filters = document.createElement('div')
    filters.className = 'dg-filter-grid'
    filters.append(
      logSelect('Severity', logFilters.severity, ['all', 'debug', 'info', 'warning', 'error'], value => { logFilters.severity = value; renderPanel() }),
      logSelect('Stage', logFilters.stage, ['all', ...stages], value => { logFilters.stage = value; renderPanel() }),
      logInput('Request ID', logFilters.requestId, value => { logFilters.requestId = value; renderPanel() }),
      logSelect('Target / App', logFilters.target, ['all', ...targets], value => { logFilters.target = value; renderPanel() }),
      logInput('Provider / Model', logFilters.providerModel, value => { logFilters.providerModel = value; renderPanel() }),
      logSelect('Order', logFilters.order, ['newest', 'oldest'], value => { logFilters.order = value as 'newest' | 'oldest'; renderPanel() }),
    )
    const visible = logs.filter(entry => {
      if (logFilters.severity !== 'all' && entry.severity !== logFilters.severity) return false
      if (logFilters.stage !== 'all' && entry.stage !== logFilters.stage) return false
      if (logFilters.target !== 'all' && entry.target !== logFilters.target) return false
      if (logFilters.requestId && !String(entry.requestId || '').toLocaleLowerCase().includes(logFilters.requestId.toLocaleLowerCase())) return false
      const providerModel = `${entry.provider || ''} ${entry.model || ''}`.toLocaleLowerCase()
      return !logFilters.providerModel || providerModel.includes(logFilters.providerModel.toLocaleLowerCase())
    }).sort((a, b) => logFilters.order === 'newest' ? b.timestamp - a.timestamp : a.timestamp - b.timestamp)
    const actions = document.createElement('div')
    actions.className = 'dg-actions'
    actions.append(
      button('Copy Visible', () => copyText(JSON.stringify(visible, null, 2), 'Visible logs copied.'), visible.length === 0),
      button('Copy Debug JSON', () => copyText(JSON.stringify(debugBundle(), null, 2), 'Debug JSON copied.'), !activeChatId),
      button('Download Debug Bundle', downloadDebugBundle, !activeChatId),
      button('Clear Logs', () => activeChatId && confirmCleanup({ title: 'Clear Relay Logs?', description: 'This removes stored Relay diagnostics for this chat.\nSlot state, messages, and image assets will remain.', scope: `${logs.length} log entries`, actionLabel: 'Clear Logs', onConfirm: () => ctx.sendToBackend({ type: 'cleanup', chatId: activeChatId!, scope: 'chat', action: 'clear_logs' }) }), logs.length === 0, 'danger'),
    )
    const tools = document.createElement('div')
    tools.className = 'dg-log-tools'
    tools.append(panelSection('Filters', filters), panelSection('Export and cleanup', actions))
    box.appendChild(tools)
    if (!visible.length) {
      box.appendChild(empty(logs.length ? 'No logs match the current filters.' : 'No persistent Relay logs in this chat yet.'))
      return box
    }
    for (const entry of visible) {
      const row = document.createElement('details')
      row.className = `dg-log dg-log-${entry.severity}`
      const summary = document.createElement('summary')
      summary.textContent = `${new Date(entry.timestamp).toLocaleTimeString()} / ${titleCase(entry.severity)} / ${entry.stage}${entry.message ? ` / ${entry.message}` : ''}`
      const meta = document.createElement('div')
      meta.className = 'dg-log-meta'
      meta.textContent = [entry.requestId, entry.messageId, entry.target, entry.provider, entry.model].filter(Boolean).join(' / ')
      const pre = document.createElement('pre')
      pre.className = 'dg-pre'
      pre.textContent = JSON.stringify(entry, null, 2)
      const copyEntry = button('Copy Entry', () => copyText(JSON.stringify(entry, null, 2), 'Log entry copied.'))
      row.append(summary, meta, copyEntry, pre)
      box.appendChild(row)
    }
    return box
  }

  function renderDiagnosticsHub(current: RouterConfig): HTMLElement {
    const diagnostics = document.createElement('div')
    const build = backendBuild
    const match = Boolean(build && build.buildId === BUILD_ID && build.extensionVersion === EXTENSION_VERSION)
    const details = document.createElement('div')
    details.className = 'dg-slot-meta'
    details.innerHTML = `Reverie Relay v${EXTENSION_VERSION}<br>Frontend: ${BUILD_ID} / loaded ${new Date(frontendLoadedAt).toLocaleString()}<br>Backend: ${build?.buildId || 'waiting'} / loaded ${build ? new Date(build.loadedAt).toLocaleString() : 'waiting'}<br>Backend responding: ${build ? new Date(build.lastResponseAt).toLocaleString() : 'waiting'}<br>State schema: ${schemaVersion || 'waiting'}`
    diagnostics.appendChild(details)
    if (!match && build) {
      const warning = document.createElement('div'); warning.className = 'dg-build-warning'
      warning.textContent = 'Version mismatch detected. Frontend and backend bundles may be from different installations.'
      diagnostics.appendChild(warning)
    }
    const healthActions = document.createElement('div'); healthActions.className = 'dg-actions'
    healthActions.append(
      button('Run Relay Health Check', () => void runSelfTest(), false, 'primary', 'Checks the Relay frontend, backend, and saved state without model or image generation.'),
      button(rescanInProgress ? 'Scanning Chat...' : 'Rescan Chat for Slots', rescanChat, !activeChatId || rescanInProgress, 'subtle'),
      button('Reconcile State', () => activeChatId && ctx.sendToBackend({ type: 'reconcile_state', chatId: activeChatId })),
    )
    diagnostics.appendChild(panelSection('Relay Health', healthActions))
    if (selfTest) {
      const result = document.createElement('div'); result.className = 'dg-slot-meta'
      result.textContent = selfTest.checks.map(check => `${check.class.toUpperCase()} · ${check.result.toUpperCase()} · ${check.name}: ${check.detail}`).join('\n')
      diagnostics.appendChild(result)
    }
    const resetStuckSwarmAvailable = imageWorkerRecovery.resetAvailable === true
      && imageWorkerRecovery.draining === true
      && ['swarmui', 'swarm-ui'].includes(String(imageWorkerRecovery.activeProvider || '').trim().toLocaleLowerCase())
    if (resetStuckSwarmAvailable) {
      const workerRecovery = document.createElement('div')
      const warning = document.createElement('div'); warning.className = 'dg-recovery-note'
      warning.textContent = `SwarmUI still appears to own an earlier generation. Relay has kept the user ImageGen worker quarantined for safety. ${imageWorkerRecovery.waiterCount || 0} queued Relay image job${imageWorkerRecovery.waiterCount === 1 ? '' : 's'} will be stopped by a manual reset.`
      const actions = document.createElement('div'); actions.className = 'dg-actions'
      actions.append(button('Reset Stuck Image Worker', () => confirmCleanup({
        title: 'Reset Stuck Image Worker?',
        description: 'SwarmUI still appears to own an earlier generation.\n\nOnly reset Relay\'s image worker after you have restarted or reset SwarmUI itself. Pending Relay image jobs will be stopped and must be retried manually.\n\nRelay cannot prove that the previous host generation was cancelled.',
        scope: 'All queued ImageGen work for this user across chats',
        actionLabel: 'Reset Image Worker',
        strong: true,
        onConfirm: () => ctx.sendToBackend({ type: 'reset_stuck_image_worker', confirmed: true }),
      }), false, 'danger', 'User-global recovery for an unresolved SwarmUI provider lane.'))
      workerRecovery.append(warning, actions)
      diagnostics.appendChild(panelSection('Image Worker Recovery', workerRecovery))
    }
    const pipeline = document.createElement('div'); pipeline.className = 'dg-actions'
    pipeline.append(
      button('Full Complete Dry Run', () => void fetchNativeSettingsSnapshot(true).then(snapshot => ctx.sendToBackend({ type: 'full_complete_dry_run', chatId: activeChatId, runtimeHealth: lifecycle.snapshot(), nativeImageSettings: snapshot?.settings, nativeSettingsCapturedAt: snapshot?.capturedAt })), false, 'primary', 'Resolves the complete local pipeline without calling a story model or image provider.'),
      button('Copy Last Full Dry Run', () => copyText(JSON.stringify(lastFullCompleteDryRun, null, 2), 'Full Complete Dry Run copied.'), !lastFullCompleteDryRun),
    )
    diagnostics.appendChild(panelSection('Full Pipeline', pipeline))
    const cleanup = document.createElement('div'); cleanup.className = 'dg-actions'
    cleanup.append(
      cleanupButton('Clear Failed', 'Clear Failed Slots?', 'This removes retry state and metadata for failed slots in this chat.\nMessages and generated image assets will remain.', 'clear_failed'),
      cleanupButton('Clear Completed from Relay History', 'Clear Completed Relay History?', 'This removes Relay history metadata for completed slots in this chat.\nLifetime statistics, messages, and generated image assets remain.', 'clear_completed'),
      cleanupButton('Clear Orphaned', 'Clear Orphaned Slots?', 'This removes Relay records whose source markers can no longer be found.\nMessages and generated image assets will remain.', 'clear_orphaned'),
      cleanupButton('Clear Cancelled', 'Clear Cancelled Slots?', 'This removes cancelled Relay records from this chat.\nMessages and generated image assets will remain.', 'clear_cancelled'),
      cleanupButton('Clear All Relay State', 'Clear All Relay State?', 'This removes every Reverie Relay record for this chat.\nGenerated image assets and message content will remain, but Relay history and metadata will be lost.', 'clear_all', true),
    )
    diagnostics.appendChild(panelSection('Danger Zone', cleanup))
    return panelSection('Diagnostics', diagnostics)
  }

  function logSelect(labelText: string, value: string, options: string[], onChange: (value: string) => void): HTMLElement {
    const field = document.createElement('div'); field.className = 'dg-field'
    const label = fieldLabel(labelText)
    const select = document.createElement('select'); select.className = 'dg-select'
    for (const optionValue of options) {
      const option = document.createElement('option'); option.value = optionValue; option.textContent = titleCase(optionValue); option.selected = optionValue === value
      select.appendChild(option)
    }
    select.addEventListener('change', () => onChange(select.value)); field.append(label, select); return field
  }

  function logInput(labelText: string, value: string, onChange: (value: string) => void): HTMLElement {
    const field = document.createElement('div'); field.className = 'dg-field'
    const label = fieldLabel(labelText)
    const input = document.createElement('input'); input.className = 'dg-input'; input.value = value
    input.addEventListener('change', () => onChange(input.value.trim())); field.append(label, input); return field
  }

  function relayParameterChoices(kind: 'sampler' | 'scheduler', currentValue: string, connection?: ImageConnection): Array<[string, string]> {
    const values = new Set<string>()
    if (currentValue) values.add(currentValue)
    const provider = imageProviders.find(item => item.id === connection?.provider)
    const parameterKeys = kind === 'sampler' ? ['sampler', 'sampler_name'] : ['scheduler']
    for (const key of parameterKeys) {
      const schema = provider?.capabilities?.parameters?.[key]
      for (const option of schema?.options || []) if (option.id) values.add(option.id)
      const raw = (connection?.metadata as Record<string, unknown> | undefined)?.[`${key}s`]
      if (Array.isArray(raw)) for (const option of raw) if (String(option || '').trim()) values.add(String(option).trim())
    }
    const fallback = kind === 'sampler'
      ? ['euler', 'euler_ancestral', 'dpmpp_2m', 'dpmpp_2m_sde', 'dpmpp_2m_sde_gpu']
      : ['normal', 'karras', 'exponential', 'sgm_uniform', 'beta57']
    for (const value of fallback) values.add(value)
    return [['', `Use connection ${kind}`], ...[...values].map(value => [value, value] as [string, string])]
  }

  function relayManualModelField(current: RouterConfig, connection?: ImageConnection): HTMLElement {
    return textInput('Model / Checkpoint', current.imageModel || connection?.model || '', value => patchConfig({ imageModel: value }))
  }

  function newRelayLoraStack(): RelayLoraStack {
    const now = Date.now()
    return { id: `relay-stack-${now.toString(36)}`, name: 'New Relay Stack', loras: [], baseTags: '', createdAt: now, updatedAt: now }
  }

  function renderRelayLoraStackControl(current: RouterConfig): HTMLElement {
    const wrap = document.createElement('div')
    wrap.className = 'dg-field-stack'
    const stacks = current.relayLoraStacks || []
    if (!stacks.length) {
      wrap.append(empty('No Relay LoRA stacks saved yet.'), button('Create Stack', () => openRelayLoraStackManager(current), false, 'primary'))
      return wrap
    }
    const actions = document.createElement('div'); actions.className = 'dg-actions'
    actions.append(
      selectField('Relay Stack', current.activeRelayLoraStackId || stacks[0].id, stacks.map(stack => [stack.id, stack.name] as [string, string]), value => patchConfig({ activeRelayLoraStackId: value })),
      button('Manage', () => openRelayLoraStackManager(current, current.activeRelayLoraStackId || stacks[0].id), false, 'subtle'),
    )
    wrap.appendChild(actions)
    return wrap
  }

  async function loadProviderLoraCatalog(requestId: string, connectionId: string): Promise<void> {
    const controller = new AbortController()
    const timer = window.setTimeout(() => controller.abort(), 15_000)
    try {
      const response = await fetch(`/api/v1/image-gen-connections/${encodeURIComponent(connectionId)}/models/loras`, {
        method: 'GET',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      })
      if (response.status === 404 || response.status === 405) {
        // Compatibility path for older Lumiverse builds that predate the
        // authenticated model-subtype endpoint.
        ctx.sendToBackend({ type: 'discover_lora_catalog', requestId, connectionId })
        return
      }
      const payload = await response.json() as { models?: Array<string | { id?: unknown; label?: unknown; name?: unknown }>; error?: unknown }
      const providerError = typeof payload.error === 'string' ? payload.error.trim() : ''
      if (!response.ok || providerError) throw new Error(providerError || `Lumiverse could not load this LoRA catalog (${response.status}).`)
      const items = [...new Set((Array.isArray(payload.models) ? payload.models : []).map(item => {
        if (typeof item === 'string') return item.trim()
        if (!item || typeof item !== 'object') return ''
        const exactId = typeof item.id === 'string' ? item.id.trim() : ''
        const name = typeof item.name === 'string' ? item.name.trim() : ''
        const label = typeof item.label === 'string' ? item.label.trim() : ''
        return exactId || name || label
      }).filter(Boolean))].sort((left, right) => left.localeCompare(right))
      if (loraCatalogState.requestId !== requestId) return
      loraCatalogState = { requestId, connectionId, status: 'completed', items, error: '' }
      activeLoraCatalogRender?.()
    } catch (error) {
      if (loraCatalogState.requestId !== requestId) return
      const message = error instanceof DOMException && error.name === 'AbortError'
        ? 'LoRA discovery timed out after 15 seconds. Check the selected ImageGen connection and retry.'
        : error instanceof Error ? error.message : String(error)
      loraCatalogState = { requestId, connectionId, status: 'failed', items: [], error: message }
      activeLoraCatalogRender?.()
    } finally {
      window.clearTimeout(timer)
    }
  }

  function openRelayLoraStackManager(current: RouterConfig, stackId?: string): void {
    const existing = (current.relayLoraStacks || []).find(stack => stack.id === stackId)
    let draft: RelayLoraStack = existing ? { ...existing, loras: existing.loras.map(item => ({ ...item })) } : newRelayLoraStack()
    const connection = imageConnections.find(item => item.id === current.imageConnectionId) || imageConnections.find(item => item.is_default) || imageConnections[0]
    const connectionId = connection?.id || ''
    const catalogRequestId = `lora-catalog-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    let catalogSearch = ''
    const modal = ctx.ui.showModal({ title: existing ? `Relay LoRA Stack · ${existing.name}` : 'Create Relay LoRA Stack', width: 820, persistent: true })
    modal.root.classList.add('dg-router-panel', 'dg-modal-host')
    const body = document.createElement('div'); body.className = 'dg-modal-body'
    const dismiss = () => {
      if (loraCatalogState.requestId === catalogRequestId) activeLoraCatalogRender = null
      modal.dismiss()
    }
    const render = () => {
      body.replaceChildren()
      const name = textInput('Stack Name', draft.name, value => { draft.name = value || 'Untitled Relay Stack' })
      const baseTags = textareaInput('Optional Base / Trigger Tags', draft.baseTags, value => { draft.baseTags = value })
      const catalog = document.createElement('div'); catalog.className = 'dg-field-stack'
      const addLora = (rawName: string) => {
        const loraName = rawName.trim()
        if (!loraName || draft.loras.some(item => item.lora_name === loraName)) return
        draft.loras.push({ lora_name: loraName, weight_model: 1, weight_clip: 1 })
        render()
      }
      const renderCatalog = () => {
        catalog.replaceChildren()
        const heading = document.createElement('strong'); heading.textContent = 'Provider LoRA Catalog'
        catalog.appendChild(heading)
        if (!connectionId) {
          catalog.appendChild(empty('Choose an ImageGen connection to browse its LoRAs.'))
          return
        }
        if (loraCatalogState.requestId !== catalogRequestId || loraCatalogState.status === 'loading') {
          catalog.appendChild(empty(`Loading LoRAs from ${connection?.name || connectionId}…`))
          return
        }
        if (loraCatalogState.status === 'failed') {
          catalog.append(
            empty(loraCatalogState.error || 'The provider catalog could not be loaded.'),
            button('Retry Catalog', () => {
              loraCatalogState = { requestId: catalogRequestId, connectionId, status: 'loading', items: [], error: '' }
              renderCatalog()
              void loadProviderLoraCatalog(catalogRequestId, connectionId)
            }, false, 'subtle'),
          )
          return
        }
        if (!loraCatalogState.items.length) {
          catalog.appendChild(empty('This provider returned no discoverable LoRAs. Use the advanced filename fallback only when you know the exact provider path.'))
          return
        }
        const search = document.createElement('input')
        search.className = 'dg-input'
        search.type = 'search'
        search.placeholder = `Search ${loraCatalogState.items.length} provider LoRAs`
        search.value = catalogSearch
        const results = document.createElement('div'); results.className = 'dg-lora-stack'
        const drawResults = () => {
          catalogSearch = search.value
          results.replaceChildren()
          const query = catalogSearch.trim().toLocaleLowerCase()
          const matches = loraCatalogState.items.filter(item => !query || item.toLocaleLowerCase().includes(query)).slice(0, 100)
          for (const item of matches) {
            const alreadyAdded = draft.loras.some(lora => lora.lora_name === item)
            const row = document.createElement('div'); row.className = 'dg-lora-stack-row'
            const label = document.createElement('span'); label.textContent = item
            row.append(label, button(alreadyAdded ? 'Added' : 'Add', () => addLora(item), alreadyAdded, 'subtle'))
            results.appendChild(row)
          }
          if (!matches.length) results.appendChild(empty('No catalog LoRAs match that search.'))
        }
        search.addEventListener('input', drawResults)
        drawResults()
        catalog.append(search, results)
      }
      activeLoraCatalogRender = renderCatalog
      renderCatalog()
      const manual = document.createElement('details')
      const manualSummary = document.createElement('summary'); manualSummary.textContent = 'Advanced: add exact LoRA filename'
      const manualRow = document.createElement('div'); manualRow.className = 'dg-actions'
      const filename = document.createElement('input'); filename.className = 'dg-input'; filename.placeholder = 'Exact provider LoRA filename or path'
      manualRow.append(filename, button('Add Exact Filename', () => addLora(filename.value), false, 'subtle'))
      manual.append(manualSummary, manualRow)
      const rows = document.createElement('div'); rows.className = 'dg-lora-stack'
      for (const [index, item] of draft.loras.entries()) {
        const row = document.createElement('div'); row.className = 'dg-lora-stack-row'
        const label = document.createElement('strong'); label.textContent = item.lora_name
        row.append(
          label,
          numberInput('Model Weight', item.weight_model, -10, 10, value => { draft.loras[index].weight_model = value }),
          numberInput('CLIP Weight', item.weight_clip, -10, 10, value => { draft.loras[index].weight_clip = value }),
          button('↑', () => { if (index > 0) [draft.loras[index - 1], draft.loras[index]] = [draft.loras[index], draft.loras[index - 1]]; render() }, index === 0, 'subtle'),
          button('↓', () => { if (index < draft.loras.length - 1) [draft.loras[index + 1], draft.loras[index]] = [draft.loras[index], draft.loras[index + 1]]; render() }, index === draft.loras.length - 1, 'subtle'),
          button('Remove', () => { draft.loras.splice(index, 1); render() }, false, 'danger'),
        )
        rows.appendChild(row)
      }
      if (!draft.loras.length) rows.appendChild(empty('This stack has no LoRAs yet. Base/trigger tags may still be saved.'))
      const footer = document.createElement('div'); footer.className = 'dg-actions'
      footer.append(
        button(existing ? 'Save Stack' : 'Create Stack', () => {
          draft = { ...draft, name: draft.name.trim() || 'Untitled Relay Stack', baseTags: draft.baseTags.trim(), updatedAt: Date.now() }
          const next = existing ? current.relayLoraStacks.map(stack => stack.id === existing.id ? draft : stack) : [...(current.relayLoraStacks || []), draft]
          patchConfig({ relayLoraStacks: next, activeRelayLoraStackId: draft.id, imageLoraStack: draft.loras })
          dismiss()
        }, false, 'primary'),
        button('Duplicate', () => {
          const now = Date.now()
          const copy = { ...draft, id: `relay-stack-${now.toString(36)}`, name: `${draft.name} Copy`, loras: draft.loras.map(item => ({ ...item })), createdAt: now, updatedAt: now }
          patchConfig({ relayLoraStacks: [...(current.relayLoraStacks || []), copy], activeRelayLoraStackId: copy.id, imageLoraStack: copy.loras })
          dismiss()
        }, !existing, 'subtle'),
        button('Delete', () => {
          if (!existing || !window.confirm(`Delete Relay LoRA stack “${existing.name}”?`)) return
          const next = current.relayLoraStacks.filter(stack => stack.id !== existing.id)
          const activeId = next[0]?.id || null
          patchConfig({ relayLoraStacks: next, activeRelayLoraStackId: activeId, imageLoraStack: next.find(stack => stack.id === activeId)?.loras || [] })
          dismiss()
        }, !existing, 'danger'),
        button('Cancel', dismiss, false, 'subtle'),
      )
      body.append(name, baseTags, catalog, manual, rows, footer)
    }
    loraCatalogState = { requestId: catalogRequestId, connectionId, status: connectionId ? 'loading' : 'failed', items: [], error: connectionId ? '' : 'No ImageGen connection is available.' }
    render()
    modal.root.appendChild(body)
    if (connectionId) void loadProviderLoraCatalog(catalogRequestId, connectionId)
  }

  function renderRelayImageSettings(current: RouterConfig): HTMLElement {
    const manualImage = document.createElement('div')
    manualImage.className = 'dg-settings-grid'
    const params = current.imageParameters || {}
    const connection = imageConnections.find(item => item.id === current.imageConnectionId)
    const patchImageParameter = (key: string, value: unknown) => patchConfig({ imageParameters: { ...(current.imageParameters || {}), [key]: value } })
    const connectionField = selectField('ImageGen Connection', current.imageConnectionId || '', [['', 'Use default connection'], ...imageConnections.map(item => [item.id, `${item.name || item.id} (${item.provider}${item.model ? ` / ${item.model}` : ''})`] as [string, string])], value => {
      const next = imageConnections.find(item => item.id === value)
      patchConfig({ imageConnectionId: value || null, imageModel: next?.model || '' })
    })
    manualImage.append(
      connectionField,
      relayManualModelField(current, connection),
      selectField('Sampler', String(params.sampler ?? params.sampler_name ?? ''), relayParameterChoices('sampler', String(params.sampler ?? params.sampler_name ?? ''), connection), value => patchConfig({ imageParameters: { ...(current.imageParameters || {}), sampler: value, sampler_name: value } })),
      selectField('Scheduler', String(params.scheduler ?? ''), relayParameterChoices('scheduler', String(params.scheduler ?? ''), connection), value => patchImageParameter('scheduler', value)),
      numberInput('Steps', Number(params.steps ?? 28), 1, 150, value => patchImageParameter('steps', value)),
      numberInput('CFG / Guidance', Number(params.cfgScale ?? params.cfg ?? 7), 0, 30, value => patchConfig({ imageParameters: { ...(current.imageParameters || {}), cfgScale: value, cfg: value } })),
    )
    return manualImage
  }

  function renderSurfaceParserSettings(current: RouterConfig): HTMLElement {
    const wrap = document.createElement('div')
    const sidecar = document.createElement('div')
    sidecar.className = 'dg-settings-grid'
    sidecar.append(
      toggleCard('Follow Native Parser', '', current.followNativeParser, checked => patchConfig({ followNativeParser: checked })),
      parserSelect(current),
      parserModelField(current),
      surfaceRepairConnectionField(),
    )
    wrap.appendChild(panelSection('Surface Parser Connection', sidecar))
    if (current.followNativeParser) {
      const note = document.createElement('div')
      note.className = 'dg-recovery-note'
      note.textContent = 'Native Parser is active. Relay mirrors its connection and instructions, so parser overrides are hidden to avoid conflicting settings.'
      wrap.appendChild(panelSection('Native Parser', note))
    } else {
      const behavior = document.createElement('div')
      behavior.className = 'dg-settings-grid'
      behavior.append(
        numberInput('Parser Retries', current.parserRetries, 0, 5, value => patchConfig({ parserRetries: value })),
        numberInput('Recent Messages', current.includeRecentMessages, 0, 32, value => patchConfig({ includeRecentMessages: value })),
      )
      wrap.appendChild(panelDisclosure('Parser Behavior', behavior))
      const context = document.createElement('div')
      context.className = 'dg-toggle-grid'
      context.append(
        toggleCard('Character Context', '', current.includeCharacterInfo, checked => patchConfig({ includeCharacterInfo: checked })),
        toggleCard('Persona Context', '', current.includePersonaInfo, checked => patchConfig({ includePersonaInfo: checked })),
        toggleCard('Lorebook Context', '', current.includeLorebook, checked => patchConfig({ includeLorebook: checked })),
      )
      wrap.appendChild(panelDisclosure('Parser Context Inclusion', context))
      wrap.appendChild(panelDisclosure('Parser Parameters', textareaInput('JSON', JSON.stringify(current.parserParameters || {}, null, 2), value => {
        try { patchConfig({ parserParameters: JSON.parse(value || '{}'), followNativeParser: false }) }
        catch { showToast('warning', 'Parser parameters must be valid JSON.') }
      })))
      wrap.appendChild(panelDisclosure('Relay Parser Instructions', textareaInput('Instructions', current.customParserInstructions, value => patchConfig({ customParserInstructions: value }))))
    }
    return wrap
  }

  function renderSettings(): HTMLElement {
    const current = config
    const box = document.createElement('div')
    if (!current) {
      box.appendChild(empty('Settings are loading.'))
      return box
    }
    box.className = 'dg-settings'
    const behavior = document.createElement('div')
    behavior.className = 'dg-toggle-grid'
    behavior.append(
      toggleCard('Relay Enabled', '', current.enabled, checked => patchConfig({ enabled: checked })),
      toggleCard('Auto Generate', '', current.autoGenerate, checked => patchConfig({ autoGenerate: checked })),
      toggleCard('High-Res / Polished Capture', 'Preserves the requested camera style while prioritizing identity, anatomy, clarity, and rendering polish.', current.highResMode, checked => patchConfig({ highResMode: checked })),
      toggleCard('Save completed images to Character Gallery', 'Links completed Relay Surface and Illustrator images to the active character Gallery when Lumiverse confirms the destination.', current.galleryAutoLink, checked => patchConfig({ galleryAutoLink: checked })),
    )
    box.appendChild(panelSection('Core Settings', behavior))
    const imageSettings = document.createElement('div')
    imageSettings.className = 'dg-settings-grid'
    imageSettings.append(
      selectField('Generation Settings Source', current.generationSettingsSource || (current.followNativeImageGen ? 'native' : 'relay'), [['native', 'Native ImageGen'], ['relay', 'Relay Settings']], value => patchConfig({ generationSettingsSource: value as RouterConfig['generationSettingsSource'], followNativeImageGen: value === 'native' })),
      selectField('LoRA Source', current.loraSource || 'native', [['native', 'Native ImageGen'], ['relay', 'Relay Stack'], ['none', 'None']], value => patchConfig({ loraSource: value as RouterConfig['loraSource'] })),
      ...(current.loraSource === 'relay' ? [renderRelayLoraStackControl(current)] : []),
    )
    box.appendChild(panelSection('Image Generation', imageSettings))
    const advancedBehavior = document.createElement('div')
    advancedBehavior.className = 'dg-toggle-grid'
    advancedBehavior.append(
      toggleCard('Auto-rescan on chat open', 'Recovers missed Relay slots without starting generation.', current.autoRescanOnChatOpen, checked => patchConfig({ autoRescanOnChatOpen: checked })),
      toggleCard('Include inactive swipes', 'Manual rescans recover all stored swipes and label inactive records. Active swipes only by default.', current.includeInactiveSwipesInRescan, checked => patchConfig({ includeInactiveSwipesInRescan: checked })),
      toggleCard('Debug logging', 'Stores per-message scan traces in persistent logs. Keep off for normal use.', current.debugLogging, checked => patchConfig({ debugLogging: checked })),
    )
    box.appendChild(panelDisclosure('Advanced Relay Behavior', advancedBehavior))
    const interfaceControls = document.createElement('div')
    interfaceControls.className = 'dg-settings-grid'
    interfaceControls.append(
      toggleCard('Enable Floating Relay Orb', 'Shows the Relay shortcut for replacement candidates in the latest relevant assistant message.', current.enableRelayOrb, checked => patchConfig({ enableRelayOrb: checked })),
      button('Reset Orb Position', resetOrbPosition, false, 'subtle'),
      selectField('Interface Theme', current.interfaceTheme || 'velvet-prism', [
        ['velvet-prism', 'Velvet Prism'],
        ['clean-panel', 'Clean Panel'],
      ], value => patchConfig({ interfaceTheme: value as RouterConfig['interfaceTheme'] })),
      selectField('Orb Size', current.orbSize || 'medium', [['small', 'Small'], ['medium', 'Medium'], ['large', 'Large']], value => patchConfig({ orbSize: value as RouterConfig['orbSize'] })),
      selectField('Orb Design', current.orbDesign || 'prism-flower', [
        ['classic', 'Classic'],
        ...ORB_IMAGE_DESIGNS.map(design => [design.id, design.label] as [string, string]),
        ['custom', current.orbCustomIconDataUrl ? 'Custom Upload' : 'Custom Upload · choose an image below'],
      ], value => patchConfig({ orbDesign: value as RouterConfig['orbDesign'] })),
      button('Upload Custom Orb Icon', () => {
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = 'image/png,image/jpeg,image/webp,image/gif,image/svg+xml'
        input.addEventListener('change', async () => {
          const file = input.files?.[0]
          if (!file) return
          if (!file.type.startsWith('image/')) { showToast('error', 'Choose an image file.'); return }
          if (file.size > 2_000_000) { showToast('error', 'Orb icons must be 2 MB or smaller.'); return }
          try {
            const orbCustomIconDataUrl = await fileToDataUrl(file)
            patchConfig({ orbCustomIconDataUrl, orbDesign: 'custom' })
            renderPanel()
            showToast('success', 'Custom orb icon saved.')
          } catch (error) {
            showToast('error', error instanceof Error ? error.message : 'Could not read the orb icon.')
          }
        }, { once: true })
        input.click()
      }, false, 'subtle'),
      button('Remove Custom Orb Icon', () => {
        patchConfig({ orbCustomIconDataUrl: '', orbDesign: current.orbDesign === 'custom' ? 'prism-flower' : current.orbDesign })
        renderPanel()
      }, !current.orbCustomIconDataUrl, 'subtle'),
    )
    box.appendChild(panelSection('Interface', interfaceControls))
    const workload = document.createElement('div')
    workload.className = 'dg-settings-grid'
    workload.append(
      selectField('Candidate Count', String(current.defaultCandidateCount), [['1', '1'], ['2', '2'], ['4', '4']], value => patchConfig({ defaultCandidateCount: Number(value) as 1 | 2 | 4 })),
      numberInput('Concurrent Relay Preprocessing Jobs', current.queueConcurrencyLimit, 1, MAX_RELAY_JOB_CONCURRENCY, value => patchConfig({ queueConcurrencyLimit: value })),
    )
    box.appendChild(panelSection('Workload', workload))
    const tutorial = document.createElement('div')
    tutorial.className = 'dg-settings-grid'
    const tutorialNote = document.createElement('div')
    tutorialNote.className = 'dg-recovery-note'
    tutorialNote.textContent = 'The overview opens automatically once after first installation. You can reopen it manually whenever you need it.'
    const tutorialActions = document.createElement('div'); tutorialActions.className = 'dg-actions'; tutorialActions.append(button('Open Quick Start Overview', openQuickStartOverview, false, 'subtle'))
    tutorial.append(tutorialNote, tutorialActions)
    box.appendChild(panelSection('Quick Start Overview', tutorial))
    box.appendChild(panelDisclosure('Generation · Prompt Profiles', renderPromptProfileSettings(current)))

    if (current.generationSettingsSource === 'native') {
        const nativeImageGenNote = document.createElement('div')
        nativeImageGenNote.className = 'dg-recovery-note'
        nativeImageGenNote.textContent = 'Native ImageGen is active. Relay mirrors the native model, provider parameters, negative prompt, and LoRA preset, so duplicate override controls are hidden.'
        box.appendChild(panelSection('ImageGen · Native Settings', nativeImageGenNote))
    } else {
        box.appendChild(panelSection('ImageGen · Relay Settings', renderRelayImageSettings(current)))
        box.appendChild(panelSection('Generation · Additional Negative', textareaInput('Negative prompt additions', current.additionalNegativePrompt, value => patchConfig({ additionalNegativePrompt: value }))))
    }

    return box
  }

  function renderPromptProfileSettings(current: RouterConfig): HTMLElement {
    const wrapper = document.createElement('div')
    const profiles = current.promptProfiles || []
    const selected = profiles.find(profile => profile.id === current.defaultPromptProfileId) || profiles[0]
    const select = document.createElement('select')
    select.className = 'dg-select'
    for (const profile of profiles) {
      const option = document.createElement('option')
      option.value = profile.id
      option.textContent = `${profile.name}${profile.builtIn ? ' (built-in)' : ''}`
      option.selected = profile.id === current.defaultPromptProfileId
      select.appendChild(option)
    }
    select.addEventListener('change', () => patchConfig({ defaultPromptProfileId: select.value }))
    wrapper.appendChild(select)
    const actions = document.createElement('div')
    actions.className = 'dg-actions'
    actions.append(
      button('New Profile', () => {
        const name = window.prompt('Profile name', 'New Relay Profile')?.trim()
        if (!name) return
        const id = `user-${Date.now().toString(36)}`
        patchConfig({ promptProfiles: [...profiles, { ...(selected || profiles[0]), id, name, builtIn: false }], defaultPromptProfileId: id })
      }, false, 'subtle'),
      button('Duplicate', () => {
        if (!selected) return
        const id = `user-${Date.now().toString(36)}`
        patchConfig({ promptProfiles: [...profiles, { ...selected, id, name: `${selected.name} Copy`, builtIn: false }], defaultPromptProfileId: id })
      }, !selected, 'subtle'),
      button('Rename', () => {
        if (!selected || selected.builtIn) return
        const name = window.prompt('Rename profile', selected.name)?.trim()
        if (name) patchConfig({ promptProfiles: profiles.map(profile => profile.id === selected.id ? { ...profile, name } : profile) })
      }, !selected || selected.builtIn, 'subtle'),
      button('Delete', () => {
        if (!selected || selected.builtIn) return
        confirmCleanup({
          title: 'Delete Prompt Profile?',
          description: `Delete “${selected.name}”? Its prompt additions and framing guidance will no longer be available to future Relay generations.`,
          scope: `${selected.name} · ${selected.id}`,
          actionLabel: 'Delete Profile',
          onConfirm: () => patchConfig({
            promptProfiles: profiles.filter(profile => profile.id !== selected.id),
            defaultPromptProfileId: current.defaultPromptProfileId === selected.id ? 'auto' : current.defaultPromptProfileId,
          }),
        })
      }, !selected || selected.builtIn, 'danger'),
      button('Reset Built-ins', () => patchConfig({ promptProfiles: profiles.filter(profile => !profile.builtIn) }), false, 'subtle', 'Restore built-in profiles while keeping custom profiles and the current default.'),
    )
    wrapper.appendChild(actions)
    if (selected) {
      wrapper.append(
        textareaInput('Prompt additions', selected.promptAdditions, value => patchPromptProfile(selected.id, { promptAdditions: value }), selected.builtIn),
        textareaInput('Negative additions', selected.negativeAdditions, value => patchPromptProfile(selected.id, { negativeAdditions: value }), selected.builtIn),
        textareaInput('Framing guidance', selected.framingGuidance, value => patchPromptProfile(selected.id, { framingGuidance: value }), selected.builtIn),
      )
    }
    return wrapper
  }

  function patchPromptProfile(id: string, patch: Partial<PromptPresetProfile>): void {
    if (!config) return
    patchConfig({ promptProfiles: config.promptProfiles.map(profile => profile.id === id && !profile.builtIn ? { ...profile, ...patch } : profile) })
  }

  function renderChatProfileSettings(current: RouterConfig): HTMLElement {
    const wrapper = document.createElement('div')
    const profile = activeChatId ? current.chatGenerationProfiles[activeChatId] : null
    const effective = profile || current.defaultGenerationProfile
    const inherited = document.createElement('div')
    inherited.className = 'dg-section-sub'
    inherited.textContent = profile ? 'This chat has Relay generation overrides.' : 'This chat is using global Relay defaults.'
    const select = document.createElement('select')
    select.className = 'dg-select'
    for (const promptProfile of current.promptProfiles || []) {
      const option = document.createElement('option')
      option.value = promptProfile.id
      option.textContent = promptProfile.name
      option.selected = promptProfile.id === effective.defaultPromptProfileId
      select.appendChild(option)
    }
    select.addEventListener('change', () => patchChatProfile({ defaultPromptProfileId: select.value }))
    const actions = document.createElement('div')
    actions.className = 'dg-actions'
    actions.append(
      button('Remove Chat Overrides', () => {
        if (!activeChatId || !config) return
        const next = { ...config.chatGenerationProfiles }
        delete next[activeChatId]
        patchConfig({ chatGenerationProfiles: next })
      }, !activeChatId || !profile, 'subtle'),
    )
    wrapper.append(inherited, select, actions)
    return wrapper
  }

  function patchChatProfile(patch: Partial<GenerationProfile>): void {
    if (!activeChatId || !config) return
    const current = config.chatGenerationProfiles[activeChatId] || { ...config.defaultGenerationProfile, chatId: activeChatId }
    patchConfig({ chatGenerationProfiles: { ...config.chatGenerationProfiles, [activeChatId]: { ...current, ...patch, chatId: activeChatId } } })
  }

  function toggleButton(label: string, value: boolean, onChange: (checked: boolean) => void): HTMLButtonElement {
    return button(`${label}: ${value ? 'On' : 'Off'}`, () => onChange(!value), false, value ? 'primary' : 'subtle')
  }

  function renderRecord(record: SlotRecord): HTMLElement {
    const card = document.createElement('div')
    card.className = `dg-slot-card dg-slot-${record.status}${record.recoverySource ? ' dg-slot-recovered' : ''}`
    const grid = document.createElement('div')
    grid.className = 'dg-slot-grid'
    grid.append(renderThumb(record), renderRecordMain(record))
    card.appendChild(grid)
    return card
  }

  function renderThumb(record: SlotRecord): HTMLElement {
    const stream = streamPreviews.get(record.key)
    const imageUrl = record.imageUrl || record.pendingPlacement?.imageUrl
    if (imageUrl) {
      const img = document.createElement('img')
      img.className = 'dg-thumb'
      img.src = imageUrl
      img.alt = record.alt || record.slot
      img.addEventListener('click', () => openLightbox(record))
      return img
    }
    if (stream?.imageDataUrl && (isProcessing(record) || isRelaySlotProcessing(record))) {
      const wrapper = document.createElement('div')
      wrapper.className = 'dg-thumb-empty dg-thumb-processing dg-thumb-streaming'
      const image = document.createElement('img')
      image.src = stream.imageDataUrl
      image.alt = `Live preview for ${record.slot}`
      const label = document.createElement('span')
      label.className = 'dg-thumb-label'
      label.textContent = stream.statusText || 'Generating preview...'
      wrapper.append(image, label)
      return wrapper
    }
    if (!imageUrl) {
      const emptyThumb = document.createElement('div')
      emptyThumb.className = `dg-thumb-empty ${isProcessing(record) ? 'dg-thumb-processing' : record.status === 'failed' ? 'dg-thumb-failed' : ''}`
      const label = document.createElement('span')
      label.className = 'dg-thumb-label'
      label.textContent = stream?.statusText || (record.status === 'recovered-pending' ? 'Ready to generate' : titleCase(record.status))
      emptyThumb.appendChild(label)
      return emptyThumb
    }
    return empty('Preview unavailable')
  }

  function renderRecordMain(record: SlotRecord): HTMLElement {
    const main = document.createElement('div')
    const top = document.createElement('div')
    top.className = 'dg-slot-top'
    const title = document.createElement('div')
    const titleText = document.createElement('div')
    titleText.className = 'dg-slot-title'
    titleText.textContent = `${appLabel(record)} / ${slotLabel(record)}`
    const meta = document.createElement('div')
    meta.className = 'dg-slot-meta'
    const latest = record.completedAt || record.failedAt || record.lastAttemptAt || record.updatedAt
    const duration = record.attempts?.[record.attempts.length - 1]?.durationMs
    meta.textContent = `${record.requestId} / swipe ${record.swipeId}\nRequested: ${new Date(record.registeredAt || record.createdAt).toLocaleString()}\nLatest: ${new Date(latest).toLocaleString()}${duration !== undefined ? ` / ${(duration / 1000).toFixed(1)}s` : ''}`
    title.append(titleText, meta)
    const side = document.createElement('div')
    side.className = 'dg-slot-side'
    const overflow = button('⋯', () => {
      const rect = overflow.getBoundingClientRect()
      openActionMenu(record, rect.right, rect.bottom + 4)
    }, false, 'icon')
    overflow.title = 'More slot actions'
    overflow.setAttribute('aria-label', 'More slot actions')
    side.append(chip(record.status, record.status), overflow)
    top.append(title, side)
    main.appendChild(top)

    const chips = document.createElement('div')
    chips.className = 'dg-chip-row'
    chips.append(
      chip(providerLabel(record), record.imageProvider ? 'completed' : ''),
      chip(modelLabel(record), ''),
      chip(`attempt ${record.attemptNumber || 0}`, ''),
      chip(modeLabel(record), record.highResMode ? 'completed' : ''),
    )
    const imageIntent = record.imageIntent || 'auto'
    if (imageIntent !== 'auto') chips.append(chip(titleCase(imageIntent.replace(/_/g, ' ')), 'completed'))
    if (record.recoverySource) chips.append(chip('Recovered', 'recovered-pending'), chip(titleCase(record.recoveryCompleteness || 'partial'), ''))
    if (record.recoveredFromInactiveSwipe) chips.append(chip('Inactive swipe', 'recovered-pending'))
    if (record.galleryLinkStatus) chips.append(chip(`Gallery ${titleCase(record.galleryLinkStatus)}`, record.galleryLinkStatus === 'linked' ? 'completed' : record.galleryLinkStatus === 'failed' ? 'failed' : 'processing'))
    main.appendChild(chips)
    if (record.galleryLinkStatus === 'failed') {
      const failedLink = galleryLinks.find(link => link.slotKey === record.key && link.status === 'failed')
      const galleryError = document.createElement('div')
      galleryError.className = 'dg-error'
      galleryError.textContent = `Character Gallery save failed: ${record.galleryLinkError || 'Unknown host error'}. The generated image is intact; retrying this link will not regenerate it.`
      const galleryActions = document.createElement('div')
      galleryActions.className = 'dg-actions'
      galleryActions.append(button('Retry Gallery Link', () => {
        if (!failedLink) return
        ctx.sendToBackend({ type: 'retry_gallery_link', chatId: record.chatId, linkId: failedLink.id })
      }, !failedLink, 'subtle'))
      main.append(galleryError, galleryActions)
    }

    if (record.recoverySource && record.recoverySource !== 'unresolved-request') {
      const note = document.createElement('div')
      note.className = 'dg-recovery-note'
      note.textContent = record.recoveryCompleteness === 'reconstructed'
        ? 'Reconstructed request. Edited from recovered alt text.'
        : `${record.recoverySource === 'resolved-marker' ? 'Recovered from message marker.' : 'Recovered from error marker.'} Original generation metadata is unavailable.`
      main.appendChild(note)
    }

    main.appendChild(renderActionButtons(record))
    if (record.error) {
      const error = document.createElement('div')
      error.className = 'dg-error'
      error.textContent = record.error
      main.appendChild(error)
    }
    const stream = streamPreviews.get(record.key)
    if (stream?.statusText && (isProcessing(record) || isRelaySlotProcessing(record))) {
      const status = document.createElement('div')
      status.className = 'dg-stream-status'
      status.textContent = stream.statusText
      main.appendChild(status)
    }
    return main
  }

  function confirmRemoveImageFromMessage(record: SlotRecord, afterSend?: () => void): void {
    const isProseIllustration = record.target === 'prose.illustration' && Boolean(record.proseIllustrationId)
    confirmCleanup({
      title: isProseIllustration ? 'Remove Inline Image?' : 'Remove Image From Message?',
      description: isProseIllustration
        ? 'This removes only the owned prose image marker from the message.\nThe remaining prose closes around the original illustration position. The generated asset remains in Media Archive.'
        : 'This removes the generated image marker from the current message.\nThe Relay slot and completed asset remain available in Media Archive.',
      scope: isProseIllustration
        ? `${record.proseIllustrationId} / ${record.messageId} / swipe ${record.swipeId}`
        : `${appLabel(record)} / ${slotLabel(record)} / ${record.requestId}`,
      actionLabel: 'Remove Image',
      onConfirm: () => {
        if (isProseIllustration && record.proseIllustrationId) {
          ctx.sendToBackend({ type: 'prose_illustrator_action', chatId: record.chatId, action: 'remove_illustration', illustrationId: record.proseIllustrationId })
        } else {
          ctx.sendToBackend({ type: 'remove_slot_image', chatId: record.chatId, key: record.key })
        }
        afterSend?.()
      },
    })
  }

  function renderActionButtons(record: SlotRecord, acceptedPopup?: () => void): HTMLElement {
    const wrapper = document.createElement('div')
    const actions = document.createElement('div')
    actions.className = 'dg-actions dg-primary-actions'
    const popupError = document.createElement('div')
    popupError.className = 'dg-error'
    popupError.hidden = true
    const showPopupError = (message: string) => { popupError.textContent = message; popupError.hidden = !message }
    const submitPopupAction = async (action: 'reparse' | 'regenerate', trigger: HTMLButtonElement) => {
      if (trigger.disabled || isSlotActionBusy(record)) return
      const previousOrbStatus = relayOrbStatus
      relayOrbStatus = action === 'reparse' ? 'analyzing' : 'generating'
      lastStatus = action === 'reparse' ? 'Reparsing Relay slot…' : 'Preparing regeneration…'
      renderRelayOrb()
      trigger.disabled = true
      showPopupError('')
      if (action === 'regenerate') setOptimisticSlotBusy(record.key, 'Preparing regeneration…')
      try {
        const snapshot = await syncNativeSettings()
        const id = submissionId(action, record.key)
        const submitted = slotActionFeedback.submit({
          submissionId: id,
          key: record.key,
          action,
          statusText: action === 'reparse' ? 'Reparsing…' : 'Preparing regeneration…',
          dispatch: () => ctx.sendToBackend(action === 'reparse'
            ? { type: 'reparse_slot', submissionId: id, key: record.key, useCurrentNativeSettings: true, nativeImageSettings: snapshot?.settings, nativeSettingsCapturedAt: snapshot?.capturedAt }
            : { type: 'regenerate_slot', submissionId: id, key: record.key, useCurrentNativeSettings: true, nativeImageSettings: snapshot?.settings, nativeSettingsCapturedAt: snapshot?.capturedAt }),
          closePopup: () => acceptedPopup?.(),
          setDisabled: disabled => { trigger.disabled = disabled },
          showPopupError,
          restorePending: () => {
            if (action === 'regenerate') restoreOptimisticSlotAction(record.key)
            relayOrbStatus = previousOrbStatus
            renderRelayOrb()
          },
          setBusy: setOptimisticSlotBusy,
          finishBusy: finishOptimisticSlotBusy,
        })
        if (!submitted) trigger.disabled = false
      } catch (error) {
        trigger.disabled = false
        if (action === 'regenerate') restoreOptimisticSlotAction(record.key)
        relayOrbStatus = previousOrbStatus
        renderRelayOrb()
        showPopupError(error instanceof Error ? error.message : String(error))
      }
    }
    const busy = isProcessing(record)
    const unresolvedCarousel = record.target === 'instagram.carousel' && !record.imageUrl
    const archiveBacked = Boolean(record.status === 'completed' && record.diagnosticArchiveId)
    const canParse = canReparse(record) || archiveBacked
    const canRegen = canRegenerate(record) || archiveBacked
    const unavailable = 'Original prompt metadata was not available when this slot was recovered.'
    if (['placement-pending', 'placement-repair-needed'].includes(record.status) && record.pendingPlacement) {
      let repairButton: HTMLButtonElement
      actions.append(
        repairButton = button(record.status === 'placement-repair-needed' ? 'Repair / Reinsert' : 'Retry Placement', () => submitRepairPlacement(record, { trigger: repairButton, showPopupError, closePopup: acceptedPopup }), false, 'primary'),
        button('Preview Unplaced Replacement', () => openImageUrl(record.pendingPlacement!.imageUrl, 'Generated replacement awaiting insertion', record.pendingPlacement?.imageId, record)),
        button('Discard Unplaced Replacement', () => ctx.sendToBackend({ type: 'discard_pending_placement', key: record.key }), false, 'danger'),
        button('Metadata', () => openMetadata(record)),
      )
    } else if (isMarkerOnly(record)) {
      actions.append(
        button(record.imageUrl && record.status !== 'image-unavailable' ? 'Open' : 'Image Unavailable', () => openLightbox(record), !record.imageUrl || record.status === 'image-unavailable', 'standard'),
        button('Rebuild Request', () => openRebuildRequest(record), busy, 'primary'),
        button('Edit / Supply Prompt', () => openEditPrompt(record), busy),
        button('Metadata', () => openMetadata(record)),
      )
    } else if (record.status === 'recovered-pending') {
      actions.append(
        button(unresolvedCarousel ? 'Generate Recovered Carousel' : 'Generate Recovered Slot', () => void generateRecovered(record), busy || !canParse, 'primary', canParse ? '' : unavailable),
        button('Metadata', () => openMetadata(record)),
      )
    } else {
      if (isReconstructedRecovery(record)) {
        actions.append(button('Rebuild Request', () => openRebuildRequest(record), busy, 'primary'))
      }
      const canRestart = canRegen || canParse
      if (busy) {
        actions.append(
          button('Abort', () => ctx.sendToBackend({ type: 'queue_action', chatId: record.chatId, action: 'cancel_selected', selectedKeys: [record.key] }), false, 'danger', 'Stop only this slot.'),
        )
      }
      let regenerateButton: HTMLButtonElement
      let reparseButton: HTMLButtonElement
      actions.append(
        regenerateButton = button('Regenerate', () => void submitPopupAction('regenerate', regenerateButton), !canRestart, 'primary', canRestart ? '' : unavailable),
        reparseButton = button(unresolvedCarousel ? 'Reparse Carousel' : 'Reparse', () => void submitPopupAction('reparse', reparseButton), !canParse, 'standard', canParse ? '' : unavailable),
        button('Regeneration Direction', () => withCompletedRecord(record, loaded => openRegenerationIntent(loaded, acceptedPopup)), busy || !canParse, 'subtle', canParse ? '' : unavailable),
        button('Edit Prompt', () => withCompletedRecord(record, openEditPrompt), busy || unresolvedCarousel),
      // Keep the Lightbox inspection action synchronous. A slow or missing
      // archive reply must never make its primary Details button feel dead.
      button('Generation Details', () => openResolvedGenerationPlan(record), false, 'subtle'),
      )
    }
    const historyAction = button(`History (${record.history.length + (record.imageUrl ? 1 : 0)})`, () => {
      // History opens another modal; from the lightbox, close this one first
      // so viewing a version still leaves a slot for Generation Details.
      acceptedPopup?.()
      openHistory(record)
    }, !record.imageUrl && record.history.length === 0, 'standard')
    historyAction.classList.add('dg-slot-history-action')
    actions.appendChild(historyAction)
    wrapper.append(actions, popupError)
    const manage = document.createElement('details')
    manage.className = 'dg-manage'
    const summary = document.createElement('summary')
    summary.textContent = 'Manage Slot'
    const maintenance = document.createElement('div')
    maintenance.className = 'dg-actions'
    maintenance.append(
      button('Reparse Preview', () => ctx.sendToBackend({ type: 'reparse_preview', key: record.key }), busy || !canParse, 'subtle', canParse ? '' : unavailable),
      button('Metadata', () => openMetadata(record), false, 'subtle'),
      button('Dry Run', async () => {
        const snapshot = await syncNativeSettings()
        ctx.sendToBackend({ type: 'dry_run', chatId: record.chatId, kind: 'slot', key: record.key, nativeImageSettings: snapshot?.settings, nativeSettingsCapturedAt: snapshot?.capturedAt })
      }, !canParse, 'subtle', 'Resolve the complete generation request without contacting Swarm.'),
      button('Explain Failure', () => ctx.sendToBackend({ type: 'explain_no_generation', chatId: record.chatId, scope: 'slot', key: record.key }), false, 'subtle'),
      button('Remove From Message', () => confirmRemoveImageFromMessage(record), busy || !record.imageUrl, 'danger'),
      button('Clear Error', () => ctx.sendToBackend({ type: 'cleanup', chatId: record.chatId, scope: 'slot', action: 'clear_error', key: record.key }), !record.error, 'subtle'),
      button('Reconcile Slot', () => ctx.sendToBackend({ type: 'reconcile_state', chatId: record.chatId, messageId: record.messageId }), false, 'subtle'),
      button('Clear Message Slots', () => confirmCleanup({ title: 'Clear Message Slots?', description: 'This removes every Relay state record for this message.\nThe chat message and generated image assets will remain.', scope: `${appLabel(record)} message ${record.messageId}`, actionLabel: 'Clear Message Slots', onConfirm: () => ctx.sendToBackend({ type: 'cleanup', chatId: record.chatId, scope: 'message', action: 'remove', messageId: record.messageId }) }), false, 'danger'),
      button('Remove Slot', () => confirmCleanup({ title: 'Remove Relay Slot?', description: 'This removes the Relay state record only.\nThe chat message and generated image asset will remain.', scope: `${appLabel(record)} / ${slotLabel(record)} / ${record.requestId}`, actionLabel: 'Remove Slot', onConfirm: () => ctx.sendToBackend({ type: 'cleanup', chatId: record.chatId, scope: 'slot', action: 'remove', key: record.key }) }), false, 'danger'),
    )
    manage.append(summary, maintenance)
    wrapper.appendChild(manage)
    return wrapper
  }

  function resolveLightboxAsset(record: SlotRecord, selectedVersion?: GenerationSnapshot, historyIndex?: number): {
    imageId: string
    imageUrl: string
    width: number | null
    height: number | null
    aspect: string
    lifecycleStatus: SlotRecord['status']
    placementError?: string
    selectedVersionIdentity?: string
    source: 'history' | 'completed' | 'pending-placement' | 'repair-preserved' | 'none'
    promptMetadata: unknown
  } {
    if (selectedVersion?.imageUrl) return {
      imageId: selectedVersion.imageId || '', imageUrl: selectedVersion.imageUrl,
      width: selectedVersion.imageWidth || null, height: selectedVersion.imageHeight || null,
      aspect: selectedVersion.aspectRatio || record.requestAspect || '', lifecycleStatus: record.status,
      placementError: record.placementFailure?.reason,
      selectedVersionIdentity: selectedVersion.versionId || String(historyIndex ?? ''), source: 'history',
      promptMetadata: selectedVersion.promptPipeline || selectedVersion,
    }
    if (record.status === 'completed' && record.imageUrl) return {
      imageId: record.imageId || '', imageUrl: record.imageUrl, width: record.imageWidth || null, height: record.imageHeight || null,
      aspect: record.aspectRatio || record.requestAspect || '', lifecycleStatus: record.status,
      placementError: record.placementFailure?.reason, source: 'completed', promptMetadata: record.promptPipeline || record.diagnostic,
    }
    if (record.pendingPlacement?.imageUrl) return {
      imageId: record.pendingPlacement.imageId || '', imageUrl: record.pendingPlacement.imageUrl,
      width: record.pendingPlacement.imageWidth || null, height: record.pendingPlacement.imageHeight || null,
      aspect: record.pendingPlacement.aspectRatio || record.requestAspect || '', lifecycleStatus: record.status,
      placementError: record.placementFailure?.reason, source: 'pending-placement',
      promptMetadata: record.pendingPlacement.promptPipeline || record.pendingPlacement.diagnostic,
    }
    if (record.imageUrl) return {
      imageId: record.imageId || '', imageUrl: record.imageUrl, width: record.imageWidth || null, height: record.imageHeight || null,
      aspect: record.aspectRatio || record.requestAspect || '', lifecycleStatus: record.status,
      placementError: record.placementFailure?.reason, source: 'repair-preserved', promptMetadata: record.promptPipeline || record.diagnostic,
    }
    return { imageId: '', imageUrl: '', width: null, height: null, aspect: record.requestAspect || '', lifecycleStatus: record.status, placementError: record.placementFailure?.reason, source: 'none', promptMetadata: record.diagnostic }
  }

  function renderLightboxDiagnostics(record: SlotRecord, asset: ReturnType<typeof resolveLightboxAsset>, version?: GenerationSnapshot, options: { includeGenerationDetails?: boolean; includeImageIdentity?: boolean } = {}): HTMLElement {
    const actions = document.createElement('div')
    actions.className = 'dg-actions'
    const includeGenerationDetails = options.includeGenerationDetails ?? true
    const includeImageIdentity = options.includeImageIdentity ?? true
    // History lightboxes describe a specific generation, not merely the
    // current slot. Keep the stable slot/archive identity, but let the chosen
    // snapshot supply that generation's prompts and provider settings.
    const detailsRecord = version ? { ...record, ...version } as SlotRecord : record
    if (includeGenerationDetails) actions.appendChild(
      button('Generation Details', () => withCompletedRecordOrCurrent(detailsRecord, loaded => {
        // If an older/partial history snapshot needs archive enrichment, merge
        // the selected snapshot last so the modal never shows the latest run's
        // prompt for a different image version. Empty compact-snapshot fields
        // are not authoritative and must not erase prompts from the archive.
        const selectedVersionRecord = version ? {
          ...mergeCompletedVersionPromptMetadata(loaded, version),
          key: record.key,
          chatId: record.chatId,
          messageId: record.messageId,
          swipeId: record.swipeId,
          requestId: record.requestId,
          target: record.target,
          targetApp: record.targetApp,
          slot: record.slot,
          diagnosticArchiveId: record.diagnosticArchiveId,
        } as SlotRecord : loaded
        openResolvedGenerationPlan(selectedVersionRecord)
      }), false, 'subtle'),
    )
    if (!includeGenerationDetails && includeImageIdentity) actions.appendChild(
      button('Copy Image ID', () => copyText(asset.imageId, 'Image ID copied.'), !asset.imageId, 'subtle'),
    )
    actions.append(
      button('Export Diagnostic JSON', () => downloadJson(`reverie-relay-diagnostic-${record.requestId}-${record.slot}.json`, {
        metadata: buildMetadata(record, version || record), asset, lifecycle: { status: record.status, placementFailure: record.placementFailure },
      }), false, 'subtle'),
    )
    if (includeImageIdentity) actions.append(
      button('Copy Image URL', () => copyText(asset.imageUrl, 'Image URL copied.'), !asset.imageUrl, 'subtle'),
      ...(includeGenerationDetails ? [button('Copy Image ID', () => copyText(asset.imageId, 'Image ID copied.'), !asset.imageId, 'subtle')] : []),
    )
    return actions
  }

  function fitRelayLightboxHost(modal: { root: HTMLElement; dismiss(): void }): void {
    // Lumiverse's generic modal shell caps regular dialogs at 520px and gives
    // its inner scroll frame overflow:auto. A Relay image lightbox needs both
    // frames to grow to the viewport so the image and every action stay
    // visible together instead of trapping the controls below an inner scroll.
    const scrollFrame = modal.root.parentElement
    const modalFrame = scrollFrame?.parentElement
    scrollFrame?.classList.add('dg-relay-lightbox-scroll-frame')
    modalFrame?.classList.add('dg-relay-lightbox-modal-frame')

    const dismiss = modal.dismiss.bind(modal)
    modal.dismiss = () => {
      scrollFrame?.classList.remove('dg-relay-lightbox-scroll-frame')
      modalFrame?.classList.remove('dg-relay-lightbox-modal-frame')
      dismiss()
    }
  }

  function openLightbox(record: SlotRecord): void {
    const modal = ctx.ui.showModal({ title: `${appLabel(record)} ${slotLabel(record)}`, width: 1480 })
    modal.root.classList.add('dg-router-panel', 'dg-modal-host', 'dg-slot-lightbox')
    fitRelayLightboxHost(modal)
    const body = document.createElement('div')
    body.className = 'dg-slot-lightbox-body'
    const asset = resolveLightboxAsset(record)
    const controls = renderActionButtons(record, () => modal.dismiss())
    const primaryActions = controls.querySelector<HTMLElement>('.dg-primary-actions')
    if (primaryActions) primaryActions.classList.add('dg-slot-lightbox-primary-actions')
    const controlPanel = document.createElement('div')
    controlPanel.className = 'dg-slot-lightbox-controls'
    const footer = document.createElement('div')
    footer.className = 'dg-slot-lightbox-footer'
    footer.appendChild(renderLightboxDiagnostics(record, asset, undefined, { includeGenerationDetails: false }))
    const manage = controls.querySelector<HTMLElement>('.dg-manage')
    const historyAction = primaryActions?.querySelector<HTMLElement>('.dg-slot-history-action')
    const actionError = controls.querySelector<HTMLElement>('.dg-error')
    if (manage && primaryActions && historyAction) {
      const historyManage = document.createElement('div')
      historyManage.className = 'dg-slot-lightbox-history-manage'
      historyAction.after(historyManage)
      historyManage.append(historyAction, manage)
    } else if (manage && primaryActions) primaryActions.appendChild(manage)
    if (actionError) footer.appendChild(actionError)
    if (asset.imageUrl) {
      const img = document.createElement('img')
      img.className = 'dg-lightbox-img'
      img.src = asset.imageUrl
      img.alt = record.alt || record.slot
      body.appendChild(imageLightboxViewport(img))
    }
    if (primaryActions) controlPanel.appendChild(primaryActions)
    controlPanel.appendChild(footer)
    body.appendChild(controlPanel)
    modal.root.appendChild(body)
  }

  function openHistoryVersionImage(record: SlotRecord, version: GenerationSnapshot, historyIndex: number): void {
    if (!version.imageUrl) return
    const modal = ctx.ui.showModal({ title: `${appLabel(record)} ${slotLabel(record)} History`, width: 1480 })
    modal.root.classList.add('dg-router-panel', 'dg-modal-host', 'dg-slot-lightbox')
    fitRelayLightboxHost(modal)
    const body = document.createElement('div')
    body.className = 'dg-slot-lightbox-body'
    const img = document.createElement('img')
    img.className = 'dg-lightbox-img'
    img.src = version.imageUrl
    img.alt = record.alt || record.slot
    const actions = document.createElement('div')
    actions.className = 'dg-actions'
    actions.append(
      button('Restore', () => ctx.sendToBackend({ type: 'restore_history', chatId: record.chatId, key: record.key, historyIndex }), false, 'primary'),
      button('Metadata', () => openMetadata(record, version, historyIndex), false, 'subtle'),
      button('Copy Image URL', () => copyText(version.imageUrl, 'Image URL copied.'), false, 'subtle'),
      button('Copy Image ID', () => copyText(version.imageId, 'Image ID copied.'), !version.imageId, 'subtle'),
    )
    actions.classList.add('dg-slot-lightbox-primary-actions')
    const controlPanel = document.createElement('div')
    controlPanel.className = 'dg-slot-lightbox-controls'
    const footer = document.createElement('div')
    footer.className = 'dg-slot-lightbox-footer'
    footer.append(renderLightboxDiagnostics(record, resolveLightboxAsset(record, version, historyIndex), version, { includeImageIdentity: false }), button('All Versions', () => {
      modal.dismiss()
      openHistory(record)
    }, false, 'standard'))
    controlPanel.append(actions, footer)
    body.append(imageLightboxViewport(img), controlPanel)
    modal.root.appendChild(body)
  }

  function openActionMenu(record: SlotRecord, x: number, y: number): void {
    closeActionMenu()
    const menu = document.createElement('div')
    menu.className = 'dg-router-panel dg-menu'
    const metadata = buildMetadata(record, record)
    const archiveBacked = Boolean(record.status === 'completed' && record.diagnosticArchiveId)
    const canParse = canReparse(record) || archiveBacked
    const canRegen = canRegenerate(record) || archiveBacked
    const unavailable = 'Original prompt metadata was not available when this slot was recovered.'
    const remove = () => confirmCleanup({ title: 'Remove Relay Slot?', description: 'This removes the Relay state record only.\nThe chat message and generated image asset will remain.', scope: `${appLabel(record)} / ${slotLabel(record)} / ${record.requestId}`, actionLabel: 'Remove Slot', onConfirm: () => ctx.sendToBackend({ type: 'cleanup', chatId: record.chatId, scope: 'slot', action: 'remove', key: record.key }) })
    const actions: Array<[string, () => void, boolean, string?]> = ['placement-pending', 'placement-repair-needed'].includes(record.status) && record.pendingPlacement ? [
      ['Preview Unplaced Replacement', () => openImageUrl(record.pendingPlacement!.imageUrl, 'Generated replacement awaiting insertion', record.pendingPlacement?.imageId, record), false],
      [record.status === 'placement-repair-needed' ? 'Repair / Reinsert' : 'Retry Placement', () => submitRepairPlacement(record), false],
      ['Discard Unplaced Replacement', () => ctx.sendToBackend({ type: 'discard_pending_placement', key: record.key }), false],
      ['View Metadata', () => openMetadata(record), false],
      ['Copy Image URL', () => copyText(record.pendingPlacement?.imageUrl || '', 'Image URL copied.'), false],
      ['Copy Image ID', () => copyText(record.pendingPlacement?.imageId || '', 'Image ID copied.'), false],
      ['Copy JSON', () => copyText(JSON.stringify(metadata, null, 2), 'Metadata JSON copied.'), false],
    ] : isMarkerOnly(record) ? [
      ['Open Image', () => openLightbox(record), !record.imageUrl],
      ['Rebuild Request', () => openRebuildRequest(record), isSlotActionBusy(record)],
      ['Edit / Supply Prompt', () => openEditPrompt(record), isSlotActionBusy(record)],
      ['View Metadata', () => openMetadata(record), false],
      ['Reconcile This Slot', () => ctx.sendToBackend({ type: 'reconcile_state', chatId: record.chatId, messageId: record.messageId }), false],
      ['Remove Slot Record', remove, false],
      ['Copy Image URL', () => copyText(record.imageUrl || '', 'Image URL copied.'), !record.imageUrl],
      ['Copy Image ID', () => copyText(record.imageId || '', 'Image ID copied.'), !record.imageId],
      ['Copy JSON', () => copyText(JSON.stringify(metadata, null, 2), 'Metadata JSON copied.'), false],
    ] : record.status === 'recovered-pending' ? [
      ['Generate Recovered Slot', () => void generateRecovered(record), isSlotActionBusy(record) || !canReparse(record), canReparse(record) ? '' : unavailable],
      ['View Metadata', () => openMetadata(record), false],
      ['Reconcile This Slot', () => ctx.sendToBackend({ type: 'reconcile_state', chatId: record.chatId, messageId: record.messageId }), false],
      ['Remove Slot Record', remove, false],
      ['Copy JSON', () => copyText(JSON.stringify(metadata, null, 2), 'Metadata JSON copied.'), false],
    ] : [
      ['Open Image', () => openLightbox(record), !record.imageUrl],
      ['Regenerate - Same Settings', () => regenerate(record), isSlotActionBusy(record) || !canRegen, canRegen ? '' : unavailable],
      ['Regenerate - Normal Mode', () => regenerate(record, false, false), isSlotActionBusy(record) || !canRegen, canRegen ? '' : unavailable],
      ['Regenerate - High-Res Mode', () => regenerate(record, false, true), isSlotActionBusy(record) || !canRegen, canRegen ? '' : unavailable],
      ['Regeneration Direction', () => withCompletedRecord(record, openRegenerationIntent), isSlotActionBusy(record) || !canParse, canParse ? '' : unavailable],
      [record.target === 'instagram.carousel' && !record.imageUrl ? 'Reparse Carousel' : 'Reparse', () => reparse(record), isSlotActionBusy(record) || !canParse, canParse ? '' : unavailable],
      ['Reparse Preview', () => ctx.sendToBackend({ type: 'reparse_preview', key: record.key }), isSlotActionBusy(record) || !canParse, canParse ? '' : unavailable],
      ['Regenerate - Current Native Settings', () => regenerate(record, true), isSlotActionBusy(record) || !canRegen, canRegen ? '' : unavailable],
      ['Edit Prompt', () => withCompletedRecord(record, openEditPrompt), isSlotActionBusy(record) || (record.target === 'instagram.carousel' && !record.imageUrl)],
      ['History', () => withCompletedRecord(record, openHistory), !archiveBacked && record.history.length === 0],
      ['Generation Details', () => withCompletedRecord(record, openResolvedGenerationPlan), false],
      ['Why Did Relay Do That?', () => openPromptInspector(record), false],
      ['View Metadata', () => openMetadata(record), false],
      ['Clear Error State', () => ctx.sendToBackend({ type: 'cleanup', chatId: record.chatId, scope: 'slot', action: 'clear_error', key: record.key }), !record.error],
      ['Reconcile This Slot', () => ctx.sendToBackend({ type: 'reconcile_state', chatId: record.chatId, messageId: record.messageId }), false],
      ['Remove Slot Record', remove, false],
      ['Remove Slot Record and History', () => confirmCleanup({ title: 'Remove Slot and History?', description: 'This removes the Relay record and all locally stored version history.\nThe chat message and generated image assets will remain.', scope: `${appLabel(record)} / ${slotLabel(record)} / ${record.history.length} historical version${record.history.length === 1 ? '' : 's'}`, actionLabel: 'Remove Slot and History', onConfirm: () => ctx.sendToBackend({ type: 'cleanup', chatId: record.chatId, scope: 'slot', action: 'remove_with_history', key: record.key }) }), false],
      ['Copy Positive Prompt', () => withCompletedRecord(record, loaded => copyText(loaded.resolvedPositivePrompt || '', 'Prompt copied.')), !archiveBacked && !record.resolvedPositivePrompt],
      ['Copy Negative Prompt', () => withCompletedRecord(record, loaded => copyText(loaded.resolvedNegativePrompt || '', 'Negative prompt copied.')), !archiveBacked && !record.resolvedNegativePrompt],
      ['Copy Image URL', () => copyText(record.imageUrl || '', 'Image URL copied.'), !record.imageUrl],
      ['Copy Image ID', () => copyText(record.imageId || '', 'Image ID copied.'), !record.imageId],
      ['Copy JSON', () => copyText(JSON.stringify(metadata, null, 2), 'Metadata JSON copied.'), false],
    ]
    if (isSlotActionBusy(record) && canAbortSlotStatus(record.status) && !actions.some(([label]) => label === 'Abort')) {
      actions.unshift(['Abort', () => ctx.sendToBackend({ type: 'queue_action', chatId: record.chatId, action: 'cancel_selected', selectedKeys: [record.key] }), false])
    }
    if (isReconstructedRecovery(record) && !['placement-pending', 'placement-repair-needed'].includes(record.status)) {
      actions.splice(1, 0, ['Rebuild Request', () => openRebuildRequest(record), isSlotActionBusy(record)])
    }
    const hasOwnedMessageImage = Boolean(
      record.imageUrl ||
      record.imageId ||
      record.pendingPlacement?.imageUrl ||
      record.pendingPlacement?.imageId,
    )
    if (
      hasOwnedMessageImage &&
      record.status !== 'recovered-pending' &&
      !['placement-pending', 'placement-repair-needed'].includes(record.status) &&
      !actions.some(([label]) => label === 'Remove Image From Message')
    ) {
      const insertAt = actions.findIndex(([label]) => label === 'Remove Slot Record')
      actions.splice(
        insertAt >= 0 ? insertAt : actions.length,
        0,
        ['Remove Image From Message', () => confirmRemoveImageFromMessage(record), isSlotActionBusy(record)],
      )
    }
    const primaryLabels = new Set([
      'Open Image', 'Regenerate - Same Settings', 'Edit Prompt', 'Edit / Supply Prompt',
      'History', 'Reparse', 'Reparse Carousel', 'Abort', 'Preview Unplaced Replacement',
      'Retry Placement', 'Repair / Reinsert', 'Generate Recovered Slot', 'Rebuild Request',
    ])
    const primaryActions = actions.filter(([label]) => primaryLabels.has(label))
    const moreActions = actions.filter(([label]) => !primaryLabels.has(label))
    const makeActionButton = ([label, handler, disabled, tooltip]: [string, () => void, boolean, string?]) => {
      const item = document.createElement('button')
      item.type = 'button'
      item.textContent = label
      item.disabled = disabled
      if (tooltip) item.title = tooltip
      item.addEventListener('click', () => {
        closeActionMenu()
        handler()
      })
      if (label.startsWith('Remove ')) item.classList.add('dg-menu-danger-action')
      return item
    }
    for (const action of primaryActions) menu.appendChild(makeActionButton(action))
    if (moreActions.length) {
      const more = document.createElement('details')
      more.className = 'dg-menu-more'
      const moreSummary = document.createElement('summary')
      moreSummary.setAttribute('aria-label', `More actions, ${moreActions.length} available`)
      moreSummary.append(document.createTextNode('More actions'))
      const count = document.createElement('span')
      count.className = 'dg-menu-count'
      count.textContent = String(moreActions.length)
      moreSummary.appendChild(count)
      more.appendChild(moreSummary)

      const groupOrder = ['Generate & revise', 'Inspect & copy', 'Repair', 'Remove']
      const groups = new Map<string, typeof moreActions>()
      const groupFor = (label: string): string => {
        if (label.startsWith('Remove ')) return 'Remove'
        if (label.startsWith('Copy ') || ['History', 'Generation Details', 'Why Did Relay Do That?', 'View Metadata'].includes(label)) return 'Inspect & copy'
        if (['Clear Error State', 'Reconcile This Slot', 'Rebuild Request', 'Discard Unplaced Replacement'].includes(label)) return 'Repair'
        return 'Generate & revise'
      }
      for (const action of moreActions) {
        const groupName = groupFor(action[0])
        const groupActions = groups.get(groupName) || []
        groupActions.push(action)
        groups.set(groupName, groupActions)
      }
      for (const groupName of groupOrder) {
        const groupActions = groups.get(groupName)
        if (!groupActions?.length) continue
        const group = document.createElement('details')
        group.className = `dg-menu-group${groupName === 'Remove' ? ' dg-menu-danger' : ''}`
        const summary = document.createElement('summary')
        summary.append(document.createTextNode(groupName))
        const groupCount = document.createElement('span')
        groupCount.className = 'dg-menu-count'
        groupCount.textContent = String(groupActions.length)
        summary.appendChild(groupCount)
        group.appendChild(summary)
        for (const action of groupActions) group.appendChild(makeActionButton(action))
        more.appendChild(group)
      }
      menu.appendChild(more)
    }
    document.body.appendChild(menu)
    document.body.classList.add('dg-relay-menu-open')
    const firstEnabled = menu.querySelector<HTMLButtonElement>('button:not(:disabled)')
    firstEnabled?.focus({ preventScroll: true })
    const rect = menu.getBoundingClientRect()
    menu.style.left = `${Math.max(8, Math.min(x, window.innerWidth - rect.width - 8))}px`
    menu.style.top = `${Math.max(8, Math.min(y, window.innerHeight - rect.height - 8))}px`
    menuEl = menu
    attachMenuDismissHandlers(menu)
  }

  function attachMenuDismissHandlers(menu: HTMLElement): void {
    menuDismissCleanup?.()
    const keepMenuInViewport = () => {
      const rect = menu.getBoundingClientRect()
      menu.style.left = `${Math.max(8, Math.min(rect.left, window.innerWidth - rect.width - 8))}px`
      menu.style.top = `${Math.max(8, Math.min(rect.top, window.innerHeight - rect.height - 8))}px`
    }
    menu.addEventListener('toggle', keepMenuInViewport, true)
    window.addEventListener('resize', keepMenuInViewport)
    let armed = false
    const dismissIfOutside = (event: Event) => {
      if (!armed) return
      const target = event.target as Node | null
      if (target && menu.contains(target)) return
      closeActionMenu()
    }
    const dismissOnKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeActionMenu()
    }
    window.setTimeout(() => { armed = true }, 0)
    document.addEventListener('pointerdown', dismissIfOutside, true)
    document.addEventListener('mousedown', dismissIfOutside, true)
    document.addEventListener('touchstart', dismissIfOutside, true)
    document.addEventListener('click', dismissIfOutside, true)
    document.addEventListener('contextmenu', dismissIfOutside, true)
    document.addEventListener('keydown', dismissOnKey, true)
    menuDismissCleanup = () => {
      menu.removeEventListener('toggle', keepMenuInViewport, true)
      window.removeEventListener('resize', keepMenuInViewport)
      document.removeEventListener('pointerdown', dismissIfOutside, true)
      document.removeEventListener('mousedown', dismissIfOutside, true)
      document.removeEventListener('touchstart', dismissIfOutside, true)
      document.removeEventListener('click', dismissIfOutside, true)
      document.removeEventListener('contextmenu', dismissIfOutside, true)
      document.removeEventListener('keydown', dismissOnKey, true)
      menuDismissCleanup = null
    }
  }

  function closeActionMenu(): void {
    const cleanup = menuDismissCleanup
    menuDismissCleanup = null
    cleanup?.()
    menuEl?.remove()
    menuEl = null
    document.body.classList.remove('dg-relay-menu-open')
  }

  function requestCompletedRecord(record: SlotRecord, onLoaded: (record: SlotRecord | null) => void): void {
    const archiveId = String(record.diagnosticArchiveId || '')
    const chatId = record.chatId || activeChatId || ''
    if (!archiveId || !chatId) {
      onLoaded(null)
      showToast('warning', 'Archived generation details are unavailable for this image.')
      return
    }
    const requestId = `completed-record-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    pendingCompletedRecordLoads.set(requestId, loaded => {
      if (!loaded) showToast('warning', 'Detailed Relay diagnostics were not retained for this historical image.')
      onLoaded(loaded)
    })
    ctx.sendToBackend({ type: 'completed_diagnostic', chatId, archiveId, requestId })
  }

  function hasGenerationPromptMetadata(record: SlotRecord): boolean {
    const pipeline = record.promptPipeline || record.pendingPlacement?.promptPipeline
    const composition = record.prosePromptComposition
    const requestPrompt = record.finalImageRequest?.prompt
    return Boolean(
      record.originalSceneBrief?.trim()
      || composition?.sceneBrief?.trim()
      || record.resolvedPositivePrompt?.trim()
      || pipeline?.finalProviderPrompt?.trim()
      || pipeline?.scenePromptBeforePrefix?.trim()
      || (typeof requestPrompt === 'string' && requestPrompt.trim()),
    )
  }

  function mergeCompletedVersionPromptMetadata(loaded: SlotRecord, version: GenerationSnapshot): SlotRecord {
    const loadedPipeline = loaded.promptPipeline || {} as NonNullable<SlotRecord['promptPipeline']>
    const versionPipeline = version.promptPipeline || {} as NonNullable<SlotRecord['promptPipeline']>
    const preferRecordedText = (selected: unknown, archived: unknown): string | undefined =>
      typeof selected === 'string' && selected.trim()
        ? selected
        : typeof archived === 'string' ? archived : undefined
    return {
      ...loaded,
      ...version,
      originalSceneBrief: loaded.originalSceneBrief,
      resolvedPositivePrompt: preferRecordedText(version.resolvedPositivePrompt, loaded.resolvedPositivePrompt),
      resolvedNegativePrompt: preferRecordedText(version.resolvedNegativePrompt, loaded.resolvedNegativePrompt),
      prosePromptComposition: loaded.prosePromptComposition,
      promptPipeline: {
        ...loadedPipeline,
        ...versionPipeline,
        finalProviderPrompt: preferRecordedText(versionPipeline.finalProviderPrompt, loadedPipeline.finalProviderPrompt),
        scenePromptBeforePrefix: preferRecordedText(versionPipeline.scenePromptBeforePrefix, loadedPipeline.scenePromptBeforePrefix),
        finalProviderNegativePrompt: preferRecordedText(versionPipeline.finalProviderNegativePrompt, loadedPipeline.finalProviderNegativePrompt),
      } as NonNullable<SlotRecord['promptPipeline']>,
      finalImageRequest: {
        ...loaded.finalImageRequest,
        ...version.finalImageRequest,
        prompt: preferRecordedText(version.finalImageRequest?.prompt, loaded.finalImageRequest?.prompt),
        negativePrompt: preferRecordedText(version.finalImageRequest?.negativePrompt, loaded.finalImageRequest?.negativePrompt),
      },
      diagnostic: { ...loaded.diagnostic, ...version.diagnostic },
      promptProfile: version.promptProfile || loaded.promptProfile,
    } as SlotRecord
  }

  function withCompletedRecord(record: SlotRecord, action: (record: SlotRecord) => void): void {
    // Compact live slot rows may carry an empty diagnostic shell or a partial
    // pipeline. Only skip the archive lookup when there's an actual prompt to
    // show; otherwise Details silently opens with unavailable fields.
    if (!record.diagnosticArchiveId || hasGenerationPromptMetadata(record)) action(record)
    else requestCompletedRecord(record, loaded => loaded && action(loaded))
  }

  function withCompletedRecordOrCurrent(record: SlotRecord, action: (record: SlotRecord) => void): void {
    // Generation Details is an inspection action, so it must remain useful for
    // recovered/older slots even when their archive is missing or unavailable.
    if (!record.diagnosticArchiveId || hasGenerationPromptMetadata(record)) {
      action(record)
      return
    }
    requestCompletedRecord(record, loaded => action(loaded || record))
  }

  function openPromptInspector(record: SlotRecord): void {
    if (record.diagnosticArchiveId && !hasGenerationPromptMetadata(record)) {
      requestCompletedRecord(record, loaded => loaded && openPromptInspector(loaded))
      return
    }
    const modal = ctx.ui.showModal({ title: 'Why Did Relay Do That?', width: 820 })
    modal.root.classList.add('dg-router-panel', 'dg-modal-host')
    const body = document.createElement('div')
    body.className = 'dg-modal-body'
    const metadata = buildMetadata(record, record)
    const diagnostic = record.diagnostic || record.pendingPlacement?.diagnostic || {
      summary: 'No stored diagnostic object is available for this slot.',
      proven: {},
      inheritedNative: {},
      relayInferred: {},
      unavailable: ['Slot predates the diagnostic inspector or was recovered from marker-only markup.'],
    }
    const sections: Array<[string, unknown]> = [
      ['Original Request XML', record.originalRequestXml || metadata.originalRequestXml || 'Unavailable'],
      ['Scene Brief', record.originalSceneBrief || 'Unavailable'],
      ['Target and Classification', { target: record.target, imageIntent: record.imageIntent || record.promptPipeline?.imageIntent || 'auto', specialIntentApplied: record.promptPipeline?.specialIntentApplied || false, suppressedForIntent: record.promptPipeline?.specialIntentSuppressedFragments || [], profile: record.promptProfile || record.promptPipeline?.promptProfile, classification: record.promptPipeline?.requestClassification }],
      ['Context Included / Excluded', { includedCharacter: record.promptPipeline?.characterContext, includedPersona: record.promptPipeline?.personaContext, suppressed: record.promptProfile?.suppressedContext }],
      ['Prompt Changes', { added: record.promptProfile?.promptAdditions, removed: record.promptProfile?.removedPositiveFragments, suppressed: record.promptPipeline?.omittedBaseTags || record.omittedBaseTags }],
      ['Negative Sources', { promptProfile: record.promptProfile?.negativeAdditions, pipeline: record.promptPipeline }],
      ['Native ImageGen and LoRAs', { provider: record.imageProvider, connection: record.imageConnectionName || record.imageConnectionId, model: record.imageModel, loras: record.lorasSentToProvider, parameters: record.finalImageParameters }],
      ['Final Parser Output', record.parserOutput || 'Unavailable'],
      ['Final Positive Prompt', record.resolvedPositivePrompt || 'Unavailable'],
      ['Final Negative Prompt', record.resolvedNegativePrompt || 'Unavailable'],
      ['Final Provider Request', record.finalImageRequest || 'Unavailable'],
      ['Placement / Repair Decisions', { status: record.status, placementFailure: record.placementFailure, recoverySource: record.recoverySource, diagnostic }],
      ['Unavailable Fields', diagnostic.unavailable || []],
    ]
    for (const [titleText, value] of sections) {
      const section = document.createElement('details')
      section.className = 'dg-section'
      section.open = ['Scene Brief', 'Target and Classification', 'Final Positive Prompt'].includes(titleText)
      const summary = document.createElement('summary')
      summary.className = 'dg-section-title'
      summary.textContent = titleText
      const pre = document.createElement('pre')
      pre.className = 'dg-pre'
      pre.textContent = typeof value === 'string' ? value : JSON.stringify(value, null, 2)
      section.append(summary, pre)
      body.appendChild(section)
    }
    const actions = document.createElement('div')
    actions.className = 'dg-actions'
    const diagnosticSummary = buildDiagnosticSummary(record)
    actions.append(
      button('Copy Final Prompt', () => copyText(record.resolvedPositivePrompt || '', 'Final prompt copied.'), !record.resolvedPositivePrompt),
      button('Copy Diagnostic Summary', () => copyText(diagnosticSummary, 'Diagnostic summary copied.')),
      button('Export Slot Diagnostic', () => downloadJson(`reverie-relay-diagnostic-${record.requestId}-${record.slot}.json`, { metadata, diagnostic })),
    )
    body.prepend(actions)
    modal.root.appendChild(body)
  }

  function openResolvedGenerationPlan(initialRecord: SlotRecord): void {
    const modal = ctx.ui.showModal({ title: 'Generation Details', width: 860 })
    modal.root.classList.add('dg-router-panel', 'dg-modal-host')
    const render = (record: SlotRecord): void => {
    const body = document.createElement('div')
    body.className = 'dg-modal-body dg-generation-plan'
    const pipeline = record.promptPipeline || record.pendingPlacement?.promptPipeline
    const profile = record.promptProfile || pipeline?.promptProfile
    const composition = record.prosePromptComposition
    const warnings = pipeline?.warnings || []
    const requestedAspect = record.requestAspect || record.slotOverrides?.aspectRatio || record.finalImageParameters?.aspectRatio || 'Unspecified'
    const returnedSize = record.imageWidth && record.imageHeight
      ? `${record.imageWidth} × ${record.imageHeight} (${record.aspectRatio || 'ratio unknown'})`
      : 'Not generated yet'
    const subjects = composition?.namedSubjects?.length
      ? composition.namedSubjects
      : pipeline?.visualSubjectPrompts?.map(subject => subject.name) || []
    const loraRows = Array.isArray(record.effectiveAppliedLoraPreset?.loras)
      ? record.effectiveAppliedLoraPreset.loras
      : []

    const summary = document.createElement('div')
    summary.className = 'dg-plan-grid'
    const planRows: Array<[string, unknown]> = [
      ['Authoritative Story Model / Composer Prompt', composition?.sceneBrief || record.originalSceneBrief || 'Unavailable'],
      ['Cast / depicted subjects', record.cast || (subjects.length ? subjects.join(', ') : 'none resolved')],
      ['Parser status', pipeline?.parserDecision || (pipeline?.parserRequested === false ? 'Skipped — reason not recorded' : pipeline?.parserSucceeded ? 'Used — normalization succeeded' : pipeline?.parserFallbackUsed ? 'Rejected — authoritative fallback' : pipeline?.parserFailed ? 'Failed' : 'Not recorded')],
      ['User Positive Prompt Prefix', pipeline?.userPositivePromptPrefix || 'Not configured'],
      ['User Negative Prompt Prefix', pipeline?.userNegativePromptPrefix || 'Not configured'],
      ['Prefixes applied', pipeline?.prefixesApplied === true ? 'yes' : pipeline?.prefixesApplied === false ? 'no' : 'not recorded'],
      ['Visible subjects', subjects.length ? subjects.join(', ') : 'No resolved visible subjects'],
      ['Profile', profile ? `${profile.selectedProfileName} — ${profile.reason}` : 'Unavailable'],
      ['Character context', pipeline?.effectiveIncludeCharacters === false ? 'Suppressed' : pipeline?.effectiveIncludeCharacters === true ? 'Included' : 'Not recorded'],
      ['Persona context', pipeline?.effectiveIncludePersona === false ? 'Suppressed' : pipeline?.effectiveIncludePersona === true ? 'Included' : 'Not recorded'],
      ['Appearance Memory', pipeline?.includedContinuityFacts?.length ? `${pipeline.includedContinuityFacts.length} fact(s) applied` : 'No facts applied'],
      ['Appearance Sidecar revision', pipeline?.identityResolution?.appearanceRevision ?? 'Not recorded'],
      ['Identity binding fallbacks', pipeline?.identityResolution?.fallbacks?.length ? pipeline.identityResolution.fallbacks.join('\n') : 'None'],
      ['Reference assets', pipeline?.attachedReferenceAssetIds?.length ? pipeline.attachedReferenceAssetIds.join(', ') : 'None'],
      ['Provider / model', `${record.imageProvider || 'Unknown provider'} / ${record.imageModel || 'Unknown model'}`],
      ['Selected Relay / Native LoRA Stack', record.effectiveAppliedLoraPreset?.name || 'None'],
      ['Exact LoRA payload', loraRows.length ? loraRows.map((row: any) => `${row.lora_name || row.name || 'LoRA'} @ model ${row.weight_model ?? row.strength ?? 1} / CLIP ${row.weight_clip ?? row.weight_model ?? 1}`).join('\n') : 'No LoRAs resolved'],
      ['LoRA Base / Trigger Tags', record.loraBaseTags || 'None'],
      ['Requested output', `${requestedAspect}${record.finalImageParameters?.width && record.finalImageParameters?.height ? ` · ${record.finalImageParameters.width} × ${record.finalImageParameters.height}` : ''}`],
      ['Actual output', returnedSize],
      ['Inline destination', record.proseAnchor ? `Paragraph ${record.proseAnchor.paragraphIndex + 1} · ${record.proseAnchor.insertionSide}` : record.target === 'prose.illustration' ? 'No prose anchor recorded' : 'Exact matching slot'],
    ]
    for (const [labelText, value] of planRows) {
      const row = document.createElement('div')
      row.className = 'dg-plan-row'
      const label = document.createElement('strong')
      label.textContent = labelText
      const copy = document.createElement('span')
      copy.textContent = String(value ?? 'Unavailable')
      row.append(label, copy)
      summary.appendChild(row)
    }
    body.appendChild(summary)

    if (warnings.length) {
      const warningBox = document.createElement('section')
      warningBox.className = 'dg-plan-warnings'
      const heading = document.createElement('h3')
      heading.textContent = `Warnings (${warnings.length})`
      warningBox.appendChild(heading)
      for (const warning of warnings) {
        const item = document.createElement('div')
        item.className = 'dg-plan-warning'
        item.textContent = `${warning.message}${warning.suggestion ? ` — ${warning.suggestion}` : ''}`
        warningBox.appendChild(item)
      }
      body.appendChild(warningBox)
    }

    for (const [labelText, content] of [
      ['Resolved Scene Prompt', record.resolvedPositivePrompt || 'Unavailable'],
      ['Scene Prompt Before Prefix', pipeline?.scenePromptBeforePrefix || record.resolvedPositivePrompt || 'Unavailable'],
      ['Final Provider Prompt', record.finalImageRequest?.prompt || record.resolvedPositivePrompt || 'Unavailable'],
      ['Final Provider Negative Prompt', record.finalImageRequest?.negativePrompt || pipeline?.finalProviderNegativePrompt || record.resolvedNegativePrompt || 'Unavailable'],
      ['Applied Appearance Facts', pipeline?.includedContinuityFacts || []],
      ['C5A Identity Resolution', pipeline?.identityResolution || null],
      ['Provider Parameters', record.finalImageParameters || record.imageParameters || {}],
      ['LoRA Provider Payload', record.lorasSentToProvider || []],
      ['Prose Anchor', record.proseAnchor || null],
    ] as Array<[string, unknown]>) {
      const details = document.createElement('details')
      details.className = 'dg-section'
      details.open = labelText === 'Final Provider Prompt'
      const detailsSummary = document.createElement('summary')
      detailsSummary.className = 'dg-section-title'
      detailsSummary.textContent = labelText
      const pre = document.createElement('pre')
      pre.className = 'dg-pre'
      pre.textContent = typeof content === 'string' ? content : JSON.stringify(content, null, 2)
      details.append(detailsSummary, pre)
      body.appendChild(details)
    }
    const actions = document.createElement('div')
    actions.className = 'dg-actions'
    actions.append(
      button('Copy Positive Prompt', () => copyText(record.resolvedPositivePrompt || '', 'Prompt copied.'), !record.resolvedPositivePrompt),
      button('Copy Negative Prompt', () => copyText(record.resolvedNegativePrompt || '', 'Negative prompt copied.'), !record.resolvedNegativePrompt, 'subtle'),
      button('Open Full Diagnostic', () => {
        modal.dismiss()
        queueMicrotask(() => openPromptInspector(record))
      }, false, 'subtle'),
    )
    body.prepend(actions)
    modal.root.replaceChildren(body)
    }
    // Compact slot rows can retain the scene brief while their final provider
    // prompt lives only in the completed diagnostic archive. Open immediately,
    // then hydrate this same modal instead of showing a second popup.
    render(initialRecord)
    if (initialRecord.diagnosticArchiveId
      && (!initialRecord.resolvedPositivePrompt?.trim()
        || typeof initialRecord.finalImageRequest?.prompt !== 'string'
        || !initialRecord.finalImageRequest.prompt.trim())) {
      requestCompletedRecord(initialRecord, loaded => {
        if (loaded && modal.root.isConnected) render(loaded)
      })
    }
  }

  function buildDiagnosticSummary(record: SlotRecord): string {
    return [
      `Slot: ${record.key}`,
      `Target: ${record.target}`,
      `Status: ${record.status}`,
      `Profile: ${record.promptProfile?.selectedProfileName || record.promptPipeline?.promptProfile?.selectedProfileName || 'Unavailable'}`,
      `Classification: ${record.promptPipeline?.requestClassification || 'Unavailable'}`,
      `Media style: ${record.imageIntent || record.promptPipeline?.imageIntent || 'auto'}`,
      `Provider/model: ${record.imageProvider || 'Unavailable'} / ${record.imageModel || 'Unavailable'}`,
      `Prompt: ${record.resolvedPositivePrompt || 'Unavailable'}`,
      `Negative: ${record.resolvedNegativePrompt || 'Unavailable'}`,
    ].join('\n')
  }

  function downloadJson(filename: string, value: unknown): void {
    const blob = new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
    URL.revokeObjectURL(url)
  }

  function openRegenerationIntent(record: SlotRecord, acceptedPopup?: () => void): void {
    const modal = ctx.ui.showModal({ title: 'Regeneration Direction', width: 680, persistent: false })
    modal.root.classList.add('dg-router-panel', 'dg-modal-host')
    const body = document.createElement('div')
    body.className = 'dg-modal-body'
    // Warm the host snapshot without making the action button wait on a REST
    // round trip. The click can dispatch immediately with the newest cache, or
    // let the backend use its current native snapshot when the cache is empty.
    void syncNativeSettings()
    const guide = document.createElement('div')
    guide.className = 'dg-info-note'
    guide.innerHTML = '<strong>What can I change?</strong><br>Describe camera angle, framing, pose, expression, lighting, mood, detail, or composition. State what must stay the same—identity, outfit, location, props, or moment. You can also choose a new aspect ratio below.'
    const intentSelect = document.createElement('select')
    intentSelect.className = 'dg-select'
    const intents: RegenerationIntent[] = [
      ['new-angle', 'New Angle'], ['wider-shot', 'Wider Shot'], ['closer-shot', 'Closer Shot'], ['better-expression', 'Better Expression'],
      ['preserve-character-change-pose', 'Preserve Character, Change Pose'], ['preserve-pose-improve-quality', 'Preserve Pose, Improve Quality'],
      ['preserve-composition-improve-quality', 'Preserve Composition, Improve Quality'], ['more-candid', 'More Candid'],
      ['stronger-social-media-feel', 'Stronger Social-Media Feel'], ['full-reimagining', 'Full Reimagining'], ['custom', 'Custom Direction'],
    ].map(([id, label]) => ({ id, label, promptDelta: '', negativeDelta: '' } as RegenerationIntent))
    for (const intent of intents) {
      const option = document.createElement('option')
      option.value = intent.id
      option.textContent = intent.label
      intentSelect.appendChild(option)
    }
    const intentField = fieldWrap('Direction Preset', intentSelect)
    const intentHelp = document.createElement('div')
    intentHelp.className = 'dg-field-help'
    intentHelp.textContent = 'Choose the closest starting instruction, then use Additional Direction to make it specific.'
    intentField.appendChild(intentHelp)
    const custom = modalTextareaWithHelp(
      'Additional Direction',
      '',
      'Optional for a preset direction; required for Custom Direction. Describe the visible change and any details that must remain unchanged.',
      true,
      'e.g. Move to a low camera angle, keep the same character identity and outfit, and preserve the rainy station setting.',
    )
    const negative = modalTextareaWithHelp(
      'Avoid in the New Version · optional',
      '',
      'Add concrete failures to avoid in this regeneration only. This is merged with the existing negative prompt instead of replacing it.',
      true,
      'e.g. no close crop, no outfit change, no duplicate hands',
    )
    const aspect = document.createElement('select')
    aspect.className = 'dg-select'
    const currentAspect = record.requestAspect || record.aspectRatio || 'unspecified'
    for (const [value, label] of [
      ['', `Keep current · ${currentAspect}`], ['1:1', 'Square · 1:1'], ['2:3', 'Portrait · 2:3'], ['3:2', 'Landscape · 3:2'],
      ['3:4', 'Portrait · 3:4'], ['4:3', 'Landscape · 4:3'], ['4:5', 'Portrait · 4:5'], ['5:4', 'Landscape · 5:4'],
      ['9:16', 'Tall · 9:16'], ['16:9', 'Wide · 16:9'],
    ]) {
      const option = document.createElement('option')
      option.value = value
      option.textContent = label
      aspect.appendChild(option)
    }
    const aspectField = fieldWrap('Aspect Ratio', aspect)
    const aspectHelp = document.createElement('div')
    aspectHelp.className = 'dg-field-help'
    aspectHelp.textContent = 'Changing this regenerates the image at the selected shape while keeping the original slot identity and placement.'
    aspectField.appendChild(aspectHelp)
    const count = document.createElement('select')
    count.className = 'dg-select'
    for (const value of [1, 2, 4]) {
      const option = document.createElement('option')
      option.value = String(value)
      option.textContent = value === 1 ? 'Single candidate' : `Choose from ${value}`
      count.appendChild(option)
    }
    const countField = fieldWrap('Candidate Count', count)
    const countHelp = document.createElement('div')
    countHelp.className = 'dg-field-help'
    countHelp.textContent = 'One replaces through the normal regeneration path. Two or four opens candidate review before anything is reinserted.'
    countField.appendChild(countHelp)
    const actions = document.createElement('div')
    actions.className = 'dg-actions'
    const error = document.createElement('div')
    error.className = 'dg-error'
    error.hidden = true
    const showError = (message: string) => { error.textContent = message; error.hidden = !message }
    let generateButton: HTMLButtonElement
    actions.append(
      button('Cancel', () => modal.dismiss(), false, 'subtle'),
      generateButton = button('Generate Candidates', () => {
        const selected = intents.find(intent => intent.id === intentSelect.value) || intents[0]
        const customText = custom.querySelector('textarea')?.value.trim() || ''
        const negativeText = negative.querySelector('textarea')?.value.trim() || ''
        if (selected.id === 'custom' && !customText) { showError('Enter a custom direction before submitting.'); return }
        const intent: RegenerationIntent = {
          ...selected,
          customText: customText || undefined,
          negativeDelta: negativeText,
          aspectRatio: (aspect.value || undefined) as RegenerationIntent['aspectRatio'],
        }
        const previousOrbStatus = relayOrbStatus
        relayOrbStatus = 'generating'
        lastStatus = 'Applying regeneration direction…'
        renderRelayOrb()
        showError('')
        try {
          const snapshot = cachedNativeSettingsSnapshot()
          const id = submissionId('regenerate-with-direction', record.key)
          const candidateCount = Number(count.value) as 1 | 2 | 4
          const replacesCurrentImage = candidateCount === 1
          if (replacesCurrentImage) setOptimisticSlotBusy(record.key, 'Preparing regeneration…', intent)
          const submitted = slotActionFeedback.submit({
            submissionId: id, key: record.key, action: 'regenerate-with-direction',
            statusText: replacesCurrentImage ? 'Preparing regeneration…' : 'Generating alternate candidates…',
            intent: replacesCurrentImage ? intent : undefined,
            dispatch: () => ctx.sendToBackend({ type: 'regenerate_with_intent', submissionId: id, key: record.key, intent, candidateCount, nativeImageSettings: snapshot?.settings, nativeSettingsCapturedAt: snapshot?.capturedAt }),
            closePopup: () => { modal.dismiss(); acceptedPopup?.(); showToast('info', 'Regeneration accepted. Relay is preparing candidates.') },
            setDisabled: disabled => { generateButton.disabled = disabled; generateButton.textContent = disabled ? 'Submitting…' : 'Generate Candidates' },
            showPopupError: showError,
            restorePending: () => {
              if (replacesCurrentImage) restoreOptimisticSlotAction(record.key)
              relayOrbStatus = previousOrbStatus
              renderRelayOrb()
            },
            setBusy: setOptimisticSlotBusy,
            finishBusy: finishOptimisticSlotBusy,
          })
          if (!submitted) {
            if (replacesCurrentImage) restoreOptimisticSlotAction(record.key)
            generateButton.disabled = false
            generateButton.textContent = 'Generate Candidates'
            relayOrbStatus = previousOrbStatus
            renderRelayOrb()
            showError('This slot already has a Relay action in progress.')
          }
        } catch (submissionError) {
          generateButton.disabled = false
          generateButton.textContent = 'Generate Candidates'
          relayOrbStatus = previousOrbStatus
          renderRelayOrb()
          showError(submissionError instanceof Error ? submissionError.message : String(submissionError))
        }
      }, false, 'primary'),
    )
    body.append(guide, intentField, custom, negative, aspectField, countField, error, actions)
    modal.root.appendChild(body)
  }

  const IMAGE_INTENT_OPTIONS: Array<[ImageIntent, string]> = [
    ['auto', 'Auto'], ['photo', 'Photo'], ['selfie', 'Selfie'], ['candid', 'Candid'], ['evidence', 'Evidence'],
    ['screenshot', 'Screenshot'], ['meme', 'Meme'], ['reaction', 'Reaction'], ['funny_edit', 'Funny Edit'],
    ['shitpost', 'Shitpost'], ['cursed', 'Cursed Picture'], ['viral_graphic', 'Viral Graphic'], ['fandom_edit', 'Fandom Edit'],
  ]

  function imageIntentField(value: ImageIntent | undefined): { field: HTMLElement; select: HTMLSelectElement } {
    const field = document.createElement('div')
    field.className = 'dg-field'
    const label = fieldLabel('Media Style', 'Guides Relay toward the intended visual medium while preserving the authored scene content.')
    const select = document.createElement('select')
    select.className = 'dg-select'
    for (const [intent, text] of IMAGE_INTENT_OPTIONS) {
      const option = document.createElement('option')
      option.value = intent
      option.textContent = text
      option.selected = (value || 'auto') === intent
      select.appendChild(option)
    }
    const note = document.createElement('div')
    note.className = 'dg-slot-meta'
    note.textContent = 'Media Style controls the requested visual treatment. Specialized styles replace only conflicting polished aesthetics.'
    field.append(label, select, note)
    return { field, select }
  }

  function openEditPrompt(record: SlotRecord): void {
    const modal = ctx.ui.showModal({ title: 'Edit Image Prompt', width: 660, persistent: true })
    modal.root.classList.add('dg-router-panel', 'dg-modal-host')
    const body = document.createElement('div')
    body.className = 'dg-modal-body'
    const prompt = modalTextarea('Positive prompt', record.resolvedPositivePrompt || record.originalSceneBrief)
    const negative = modalTextarea('Negative prompt', record.resolvedNegativePrompt || record.originalNegativePrompt || '', true)
    const intent = imageIntentField(record.imageIntent)
    const actions = document.createElement('div')
    actions.className = 'dg-actions'
    actions.append(
      button('Cancel', () => modal.dismiss()),
      button('Generate', () => {
        const positive = prompt.querySelector('textarea')?.value.trim() || ''
        const neg = negative.querySelector('textarea')?.value.trim() || ''
        if (!positive) {
          showToast('warning', 'Prompt cannot be empty.')
          return
        }
        ctx.sendToBackend({ type: 'edit_prompt', key: record.key, prompt: positive, negativePrompt: neg, imageIntent: intent.select.value as ImageIntent })
        modal.dismiss()
      }),
    )
    body.append(prompt, negative, intent.field, actions)
    modal.root.appendChild(body)
  }

  function openRebuildRequest(record: SlotRecord): void {
    const modal = ctx.ui.showModal({ title: 'Rebuild Relay Request', width: 680, persistent: true })
    modal.root.classList.add('dg-router-panel', 'dg-modal-host')
    const body = document.createElement('div')
    body.className = 'dg-modal-body'
    const identity = document.createElement('div')
    identity.className = 'dg-section'
    identity.textContent = `Target: ${record.target}\nRequest ID: ${record.requestId}\nSlot: ${record.slot}\nRecovered alt text: ${record.alt || 'Unavailable'}`
    if (record.imageUrl) {
      const image = document.createElement('img')
      image.className = 'dg-lightbox-img'
      image.src = record.imageUrl
      image.alt = record.alt || record.slot
      body.appendChild(image)
    }
    const inferred = document.createElement('div')
    inferred.className = 'dg-recovery-note'
    inferred.textContent = record.originalSceneBrief ? 'Existing reconstructed draft' : 'Draft reconstructed from image alt text. Review and edit it before saving.'
    const scene = modalTextarea('Scene brief', record.originalSceneBrief || record.alt || '')
    const negative = modalTextarea('Optional negative prompt', record.originalNegativePrompt || '', true)
    const aspect = textInput('Aspect ratio', record.requestAspect || '', () => {})
    const intent = imageIntentField(record.imageIntent)
    const modeField = document.createElement('div')
    modeField.className = 'dg-field'
    const modeLabelEl = fieldLabel('Capture mode', 'Normal preserves the standard request. High-Res asks Relay to prepare a polished capture using the existing request identity and slot.')
    const mode = document.createElement('select'); mode.className = 'dg-select'
    for (const [value, label] of [['normal', 'Normal'], ['high-res', 'High-Res / Polished Capture']]) {
      const option = document.createElement('option'); option.value = value; option.textContent = label
      option.selected = record.highResMode === (value === 'high-res'); mode.appendChild(option)
    }
    modeField.append(modeLabelEl, mode)
    const actions = document.createElement('div')
    actions.className = 'dg-actions'
    const submit = async (generate: boolean) => {
      const sceneBrief = scene.querySelector('textarea')?.value.trim() || ''
      if (!sceneBrief) { showToast('warning', 'Scene brief cannot be empty.'); return }
      const snapshot = generate ? await syncNativeSettings() : null
      ctx.sendToBackend({
        type: 'rebuild_request', key: record.key, sceneBrief,
        negativePrompt: negative.querySelector('textarea')?.value.trim() || '',
        aspect: aspect.querySelector('input')?.value.trim() || undefined,
        imageIntent: intent.select.value as ImageIntent,
        highResMode: mode.value === 'high-res', generate,
        nativeImageSettings: snapshot?.settings, nativeSettingsCapturedAt: snapshot?.capturedAt,
      })
      modal.dismiss()
    }
    actions.append(
      button('Cancel', () => modal.dismiss(), false, 'subtle'),
      button('Save Only', () => void submit(false)),
      button('Save and Generate', () => void submit(true), false, 'primary'),
    )
    body.append(identity, inferred, scene, negative, aspect, intent.field, modeField, actions)
    modal.root.appendChild(body)
  }

  function maybeOpenSlotImagePreviews(): void {
    const pending = records.filter(record => record.status === 'placement-pending' && record.previewPending && record.pendingPlacement)
    for (const key of [...openedSlotPreviewKeys]) {
      const record = recordByKey.get(key)
      if (!record || record.status !== 'placement-pending' || !record.previewPending) openedSlotPreviewKeys.delete(key)
    }
    if (activeSlotPreviewKey) return
    const next = pending.find(record => !openedSlotPreviewKeys.has(record.key))
    if (!next) return
    try {
      if (!openSlotImagePreview(next)) return
      openedSlotPreviewKeys.add(next.key)
      activeSlotPreviewKey = next.key
    } catch (error) {
      if (!(error instanceof Error) || !error.message.includes('Maximum of 2 stacked modals')) throw error
      // Another Relay modal occupies the host stack. Retry on the next state update.
    }
  }

  function openSlotImagePreview(record: SlotRecord): boolean {
    const result = record.pendingPlacement
    if (!result) return false
    const modal = ctx.ui.showModal({ title: 'Image Preview · Ready to Insert', width: 900, persistent: true })
    modal.root.classList.add('dg-router-panel', 'dg-modal-host', 'dg-slot-preview-modal')
    const dismissPreview = () => {
      if (activeSlotPreviewKey === record.key) activeSlotPreviewKey = null
      modal.dismiss()
    }
    const closePreviewWave = () => {
      // Closing review leaves pending images accessible in Relay Slots without
      // immediately opening the next pending preview over this one.
      for (const pending of records) {
        if (pending.status === 'placement-pending' && pending.previewPending && pending.pendingPlacement) openedSlotPreviewKeys.add(pending.key)
      }
      dismissPreview()
    }
    const body = document.createElement('div'); body.className = 'dg-modal-body'
    const image = document.createElement('img')
    image.className = 'dg-lightbox-img'
    image.src = result.imageUrl
    image.alt = record.alt || 'Generated slot preview'
    image.style.aspectRatio = result.imageWidth && result.imageHeight ? `${result.imageWidth} / ${result.imageHeight}` : 'auto'
    const details = document.createElement('details'); details.className = 'dg-section'
    const summary = document.createElement('summary'); summary.textContent = 'Prompt and generation details'
    const pre = document.createElement('pre'); pre.className = 'dg-pre'
    pre.textContent = `PROMPT
${result.resolvedPositivePrompt || record.resolvedPositivePrompt || record.originalSceneBrief}

NEGATIVE
${result.resolvedNegativePrompt || record.resolvedNegativePrompt || ''}

MODEL
${result.imageModel || record.imageModel || 'Unknown'}

LORAS
${JSON.stringify(result.lorasSentToProvider || record.lorasSentToProvider || [], null, 2)}

SIZE
${result.imageWidth || '?'}×${result.imageHeight || '?'} (${result.aspectRatio || '?'})`
    details.append(summary, pre)
    const actions = document.createElement('div'); actions.className = 'dg-actions'
    const submissionError = document.createElement('div'); submissionError.className = 'dg-error'; submissionError.hidden = true
    const showSubmissionError = (message: string) => { submissionError.textContent = message; submissionError.hidden = !message }
    let reparseButton: HTMLButtonElement
    let insertButton: HTMLButtonElement
    actions.append(
      button('Close', closePreviewWave, false, 'subtle'),
      reparseButton = button('Reparse', async () => {
        reparseButton.disabled = true
        showSubmissionError('')
        try {
          const snapshot = await syncNativeSettings()
          const id = submissionId('reparse', record.key)
          slotActionFeedback.submit({
            submissionId: id, key: record.key, action: 'reparse', statusText: 'Reparsing…',
            dispatch: () => ctx.sendToBackend({ type: 'reparse_slot', submissionId: id, key: record.key, useCurrentNativeSettings: true, nativeImageSettings: snapshot?.settings, nativeSettingsCapturedAt: snapshot?.capturedAt }),
            closePopup: () => { openedSlotPreviewKeys.delete(record.key); dismissPreview() },
            setDisabled: disabled => { reparseButton.disabled = disabled },
            showPopupError: showSubmissionError,
            setBusy: setOptimisticSlotBusy,
            finishBusy: finishOptimisticSlotBusy,
          })
        } catch (error) {
          restoreOptimisticSlotAction(record.key)
          reparseButton.disabled = false
          showSubmissionError(error instanceof Error ? error.message : String(error))
        }
      }, false, 'subtle'),
      button('Regenerate', async () => {
        void regenerate(record, true)
        openedSlotPreviewKeys.delete(record.key); dismissPreview()
      }),
      insertButton = button(record.status === 'placement-repair-needed' ? 'Repair / Reinsert' : 'Insert', () => {
        submitRepairPlacement(record, {
          trigger: insertButton,
          showPopupError: showSubmissionError,
          closePopup: () => { openedSlotPreviewKeys.delete(record.key); dismissPreview() },
        })
      }, false, 'primary'),
    )
    body.append(imageLightboxViewport(image), details, submissionError, actions)
    modal.root.appendChild(body)
    return true
  }

  function openReparsePreview(record: SlotRecord, prompt: string, negativePrompt: string, pipeline: PromptPipeline): void {
    const modal = ctx.ui.showModal({ title: 'Reparse Preview', width: 760, persistent: true })
    modal.root.classList.add('dg-router-panel', 'dg-modal-host')
    const body = document.createElement('div')
    body.className = 'dg-modal-body'
    const raw = document.createElement('pre')
    raw.className = 'dg-pre'
    raw.textContent = `BEFORE NORMALIZATION\n${pipeline.rawParserResponse || ''}\n\nRAW MERGED NEGATIVE\n${pipeline.rawMergedNegativePrompt || ''}\n\nAFTER NORMALIZATION\nPROMPT\n${prompt}\n\nNEGATIVE\n${negativePrompt}\n\nWARNINGS\n${pipeline.warnings.map(warning => warning.message).join('\n') || 'None'}`
    const actions = document.createElement('div')
    actions.className = 'dg-actions'
    const unresolvedCarousel = record.target === 'instagram.carousel' && !record.imageUrl
    if (unresolvedCarousel) body.appendChild(empty('This carousel has not resolved yet. Preview generation is disabled; use Reparse Carousel so every original slide stays together.'))
    actions.append(
      button('Cancel', () => { ctx.sendToBackend({ type: 'preview_action', key: record.key, action: 'cancelled' }); modal.dismiss() }),
      button('Edit Prompt', () => { modal.dismiss(); openEditPrompt({ ...record, resolvedPositivePrompt: prompt, resolvedNegativePrompt: negativePrompt }) }),
      button('Generate With Previewed Prompt', () => {
        ctx.sendToBackend({ type: 'preview_action', key: record.key, action: 'accepted' })
        ctx.sendToBackend({ type: 'generate_preview', key: record.key, prompt, negativePrompt })
        modal.dismiss()
      }, unresolvedCarousel),
    )
    body.append(raw, actions)
    modal.root.appendChild(body)
  }

  function openHistory(record: SlotRecord): void {
    const modal = ctx.ui.showModal({ title: `${appLabel(record)} ${slotLabel(record)} · History`, width: 1120 })
    modal.root.classList.add('dg-router-panel', 'dg-modal-host')
    const body = document.createElement('div')
    body.className = 'dg-slot-history-list'
    const versions: Array<{ entry?: GenerationSnapshot; index?: number }> = [
      ...(record.imageUrl ? [{}] : []),
      ...record.history.map((entry, index) => ({ entry, index })),
    ]
    const openVersion = (entry?: GenerationSnapshot, index?: number) => {
      // Replace History with the selected lightbox instead of stacking them.
      // The host allows only two modal layers, and Details is a second layer.
      modal.dismiss()
      if (index === undefined) openLightbox(record)
      else if (entry) openHistoryVersionImage(record, entry, index)
    }
    if (!versions.length) body.appendChild(empty('No generated versions for this slot yet.'))
    versions.forEach(({ entry, index }) => {
      const version = entry || record
      const card = document.createElement('div')
      card.className = 'dg-slot-history-version'
      const image = document.createElement('img')
      image.src = version.imageUrl || ''
      image.alt = record.alt || record.slot
      image.addEventListener('click', () => openVersion(entry, index))
      const heading = document.createElement('strong')
      heading.textContent = index === undefined ? 'Current version' : `Previous version ${record.history.length - index}`
      const meta = document.createElement('small')
      const generatedAt = entry?.generatedAt || record.completedAt
      meta.textContent = `${generatedAt ? new Date(generatedAt).toLocaleString() : 'Date unavailable'} · ${version.imageProvider || 'Provider unavailable'} · ${version.imageModel || 'Model unavailable'}${record.recoverySource ? ` · ${recoveryHistoryMessage(record)}` : ''}`
      const actions = document.createElement('div')
      actions.className = 'dg-actions'
      actions.append(
        button('View', () => openVersion(entry, index), false, 'primary'),
        button('Metadata', () => openMetadata(record, entry, index), false, 'subtle'),
      )
      if (index !== undefined) actions.appendChild(button('Restore', () => {
        ctx.sendToBackend({ type: 'restore_history', chatId: record.chatId, key: record.key, historyIndex: index })
        modal.dismiss()
      }, false, 'standard'))
      card.append(image, heading, meta, actions)
      body.appendChild(card)
    })
    modal.root.appendChild(body)
  }

  function openMetadata(record: SlotRecord, version?: GenerationSnapshot, historyIndex?: number): void {
    let rawMode = false
    const modal = ctx.ui.showModal({ title: 'Reverie Relay Metadata', width: 760 })
    modal.root.classList.add('dg-router-panel', 'dg-modal-host')
    const body = document.createElement('div')
    body.className = 'dg-modal-body'
    const tabs = document.createElement('div')
    tabs.className = 'dg-meta-tabs'
    const content = document.createElement('div')
    const selected = version || record
    const metadata = buildMetadata(record, selected, historyIndex)
    const overviewBtn = button('Overview', () => {
      rawMode = false
      paint()
    })
    const rawBtn = button('Raw JSON', () => {
      rawMode = true
      paint()
    })
    tabs.append(overviewBtn, rawBtn)
    const copyActions = document.createElement('div')
    copyActions.className = 'dg-actions'
    copyActions.append(
      button('Copy Prompt', () => copyText(metadataText(metadata.resolvedPositivePrompt), 'Prompt copied.'), !metadata.resolvedPositivePrompt),
      button('Copy Negative Prompt', () => copyText(metadataText(metadata.resolvedNegativePrompt), 'Negative prompt copied.'), !metadata.resolvedNegativePrompt),
      button('Copy JSON', () => copyText(JSON.stringify(metadata, null, 2), 'Metadata JSON copied.')),
      button('Copy Image URL', () => copyText(metadataText(metadata.imageUrl), 'Image URL copied.'), !metadata.imageUrl),
      button('Copy Image ID', () => copyText(metadataText(metadata.imageId), 'Image ID copied.'), !metadata.imageId),
    )

    function paint(): void {
      content.replaceChildren()
      if (rawMode) {
        const pre = document.createElement('pre')
        pre.className = 'dg-pre'
        pre.textContent = JSON.stringify(metadata, null, 2)
        content.appendChild(pre)
      } else {
        content.appendChild(renderMetadataOverview(metadata))
      }
    }

    paint()
    body.append(tabs, copyActions, content)
    modal.root.appendChild(body)
  }

  function renderMetadataOverview(metadata: Record<string, unknown>): HTMLElement {
    const grid = document.createElement('div')
    grid.className = 'dg-meta-grid'
    const fields = [
      'slotId', 'requestId', 'appTarget', 'imageIntent', 'chatId', 'messageId', 'swipeId', 'status', 'timestamp',
      'provider', 'connection', 'model', 'imageId', 'imageUrl', 'width', 'height', 'aspectRatio',
      'attemptNumber', 'triggerType', 'parserUsed', 'cast', 'promptSource', 'originalSceneBrief', 'resolvedPositivePrompt',
      'resolvedNegativePrompt', 'nativeSettingsCapturedAt', 'settingsSource', 'connectionDefaultParameters',
      'nativeImageSettings', 'slotOverrides', 'generationParameters', 'finalImageRequest', 'promptPipeline',
      'originalRequestXml', 'promptProfile', 'regenerationIntent', 'diagnostic',
      'assetId', 'versionId', 'rootVersionId', 'versionTreeId', 'versionTree',
      'proseIllustrationId', 'prosePlanId', 'proseAnchor', 'proseSynthetic', 'prosePromptComposition',
      'includedContinuityFacts', 'excludedContinuityFacts', 'continuityStrength',
      'nativeActiveLoraPreset', 'effectiveAppliedLoraPreset', 'lorasSentToProvider', 'loraBaseTags', 'baseTagsAddedToPrompt', 'omittedBaseTags', 'highResMode', 'highResRetainedBaseTags', 'highResPreservedFramingCues', 'loraOmittedFields',
      'recoverySource', 'recoveryCompleteness', 'missingRecoveryFields', 'recoveredFromInactiveSwipe', 'activeSwipeAtRecovery', 'reconstructedAt', 'reconstructionSource',
      'discoveredAt', 'registeredAt', 'queuedAt', 'parsingStartedAt', 'parsingCompletedAt', 'preparationStartedAt', 'preparationCompletedAt',
      'providerWaitStartedAt', 'providerRequestSentAt', 'providerResultReceivedAt', 'providerStartedAt', 'providerCompletedAt', 'generationStartedAt',
      'imagePersistedAt', 'galleryLinkedAt', 'placementLockAcquiredAt', 'messageRereadAt', 'markerReplacementStartedAt', 'markerReplacementCommittedAt',
      'visualSettlementStartedAt', 'visualSettlementCompletedAt', 'placementStartedAt', 'placementCompletedAt', 'failedAt', 'completedAt', 'attempts',
    ]
    for (const field of fields) {
      const label = document.createElement('div')
      label.className = 'dg-meta-label'
      label.textContent = field
      const value = document.createElement('div')
      const raw = metadata[field]
      value.textContent = typeof raw === 'object' ? JSON.stringify(raw, null, 2) : String(raw ?? '')
      grid.append(label, value)
    }
    return grid
  }

  function buildMetadata(record: SlotRecord, selected: MetadataVersion, historyIndex?: number): Record<string, unknown> {
    const version = selected as Partial<SlotRecord & GenerationSnapshot>
    const pending = record.status === 'placement-pending' ? record.pendingPlacement : undefined
    return {
      slotId: record.key,
      requestId: record.requestId,
      appTarget: record.target,
      imageIntent: version.imageIntent || record.imageIntent || record.promptPipeline?.imageIntent || 'auto',
      chatId: record.chatId,
      messageId: record.messageId,
      swipeId: record.swipeId,
      status: 'status' in selected ? (selected as SlotRecord).status : 'history',
      timestamp: new Date(version.generatedAt || record.updatedAt || record.createdAt).toISOString(),
      provider: pending?.imageProvider || version.imageProvider || record.imageProvider || '',
      connection: pending?.imageConnectionName || pending?.imageConnectionId || version.imageConnectionName || version.imageConnectionId || record.imageConnectionName || record.imageConnectionId || '',
      model: pending?.imageModel || version.imageModel || record.imageModel || '',
      originalSceneBrief: record.originalSceneBrief,
      cast: record.cast || '',
      promptSource: record.promptSource || '',
      originalRequestXml: record.originalRequestXml,
      resolvedPositivePrompt: pending?.resolvedPositivePrompt || version.resolvedPositivePrompt || '',
      resolvedNegativePrompt: pending?.resolvedNegativePrompt || version.resolvedNegativePrompt || '',
      parserUsed: version.parserUsed ?? false,
      parserOutput: version.parserOutput || '',
      parserConnectionId: version.parserConnectionId || record.parserConnectionId || null,
      parserModel: version.parserModel || record.parserModel || '',
      parserParameters: version.parserParameters || record.parserParameters || {},
      generationParameters: pending?.finalImageParameters || pending?.imageParameters || version.finalImageParameters || version.imageParameters || record.finalImageParameters || record.imageParameters || {},
      nativeImageSettings: version.nativeImageSettings || record.nativeImageSettings || {},
      nativeSettingsCapturedAt: version.nativeSettingsCapturedAt || record.nativeSettingsCapturedAt || null,
      connectionDefaultParameters: version.connectionDefaultParameters || record.connectionDefaultParameters || {},
      slotOverrides: version.slotOverrides || record.slotOverrides || {},
      finalImageParameters: version.finalImageParameters || record.finalImageParameters || {},
      finalImageRequest: pending?.finalImageRequest || version.finalImageRequest || record.finalImageRequest || {},
      settingsSource: version.finalImageSettingsSource || record.finalImageSettingsSource || '',
      imageId: pending?.imageId || version.imageId || '',
      imageUrl: pending?.imageUrl || version.imageUrl || '',
      width: pending?.imageWidth ?? version.imageWidth ?? null,
      height: pending?.imageHeight ?? version.imageHeight ?? null,
      aspectRatio: pending?.aspectRatio || version.aspectRatio || '',
      attemptNumber: version.attemptNumber || record.attemptNumber || 0,
      triggerType: version.triggerType || record.triggerType || '',
      historyIndex: historyIndex ?? null,
      slotVersionHistory: record.history,
      discoveredAt: record.discoveredAt || null,
      registeredAt: record.registeredAt || null,
      queuedAt: record.queuedAt || null,
      parsingStartedAt: record.parsingStartedAt || null,
      generationStartedAt: record.generationStartedAt || null,
      failedAt: record.failedAt || null,
      completedAt: record.completedAt || null,
      attempts: record.attempts || [],
      promptPipeline: version.promptPipeline || record.promptPipeline || {},
      promptProfile: version.promptProfile || record.promptProfile || record.promptPipeline?.promptProfile || {},
      regenerationIntent: version.regenerationIntent || record.regenerationIntent || {},
      diagnostic: version.diagnostic || record.diagnostic || {},
      assetId: version.assetId || record.assetId || '',
      versionId: version.versionId || record.currentVersionId || '',
      rootVersionId: version.rootVersionId || record.rootVersionId || '',
      versionTreeId: record.versionTreeId || '',
      versionTree: versionTrees.find(tree => tree.treeId === record.versionTreeId || tree.slotKey === record.key) || null,
      proseIllustrationId: record.proseIllustrationId || '',
      prosePlanId: record.prosePlanId || '',
      proseAnchor: record.proseAnchor || null,
      proseSynthetic: record.proseSynthetic ?? false,
      prosePromptComposition: record.prosePromptComposition || null,
      includedContinuityFacts: version.includedContinuityFacts || record.includedContinuityFacts || record.promptPipeline?.includedContinuityFacts || [],
      excludedContinuityFacts: version.excludedContinuityFacts || record.excludedContinuityFacts || record.promptPipeline?.excludedContinuityFacts || [],
      continuityStrength: version.continuityStrength || record.continuityStrength || record.promptPipeline?.continuityStrength || 'off',
      nativeActiveLoraPreset: version.nativeActiveLoraPreset || record.nativeActiveLoraPreset || null,
      effectiveAppliedLoraPreset: version.effectiveAppliedLoraPreset || record.effectiveAppliedLoraPreset || null,
      lorasSentToProvider: version.lorasSentToProvider || record.lorasSentToProvider || [],
      loraBaseTags: version.loraBaseTags || record.loraBaseTags || '',
      baseTagsAddedToPrompt: version.baseTagsAddedToPrompt || record.baseTagsAddedToPrompt || '',
      omittedBaseTags: version.omittedBaseTags || record.omittedBaseTags || [],
      highResMode: version.highResMode ?? record.highResMode ?? null,
      highResRetainedBaseTags: version.highResRetainedBaseTags || record.highResRetainedBaseTags || [],
      highResPreservedFramingCues: version.highResPreservedFramingCues || record.highResPreservedFramingCues || [],
      loraOmittedFields: version.loraOmittedFields || record.loraOmittedFields || [],
      recoverySource: record.recoverySource || '',
      recoveryCompleteness: record.recoveryCompleteness || '',
      missingRecoveryFields: record.missingRecoveryFields || [],
      recoveredFromInactiveSwipe: record.recoveredFromInactiveSwipe ?? false,
      activeSwipeAtRecovery: record.activeSwipeAtRecovery ?? null,
      reconstructedAt: record.reconstructedAt || null,
      reconstructionSource: record.reconstructionSource || '',
      pendingPlacement: record.pendingPlacement || null,
      placementFailure: record.placementFailure || null,
      imageAvailability: record.imageAvailability || 'unchecked',
      imageAvailabilityCheckedAt: record.imageAvailabilityCheckedAt || null,
      record,
      selectedVersion: selected,
    }
  }

  function rescanChat(): void {
    if (!activeChatId || rescanInProgress) return
    rescanInProgress = true
    lastRescanSummary = null
    renderPanel()
    ctx.sendToBackend({ type: 'rescan_chat', chatId: activeChatId, includeInactiveSwipes: config?.includeInactiveSwipesInRescan === true })
  }

  function renderRescanResult(): HTMLElement {
    const result = document.createElement('div')
    result.className = 'dg-rescan-result'
    const copy = document.createElement('div')
    copy.className = 'dg-rescan-copy'
    if (rescanInProgress) {
      copy.textContent = 'Scanning active chat messages for missing Reverie Relay slots...'
      result.appendChild(copy)
      return result
    }
    const summary = lastRescanSummary || emptyFrontendRescanSummary()
    const recovered = rescanRecoveredCount(summary)
    copy.textContent = recovered
      ? `Rescan complete\n${recovered} recovered / ${summary.imageUnavailable} unavailable / ${summary.existingSlotsSkipped} existing / ${summary.malformedSources} malformed / ${(summary.durationMs / 1000).toFixed(1)}s`
      : 'No missing Reverie Relay slots were found.'
    result.appendChild(copy)
    const actions = document.createElement('div')
    actions.className = 'dg-actions'
    if (recovered) actions.append(
      button('Show Recovered', () => { activeTab = 'slots'; slotFilter = 'recovered'; renderPanel() }, false, 'subtle'),
      ...(summary.recoveredPending ? [button('Generate Recovered', () => void generateAllRecovered(), false, 'primary')] : []),
    )
    if (summary.malformedSources || recovered) actions.appendChild(button('View Logs', () => { activeTab = 'logs'; renderPanel() }, false, 'subtle'))
    if (actions.childElementCount) result.appendChild(actions)
    return result
  }

  async function generateRecovered(record: SlotRecord): Promise<void> {
    if (record.status !== 'recovered-pending' || isSlotActionBusy(record)) return
    const snapshot = await syncNativeSettings()
    ctx.sendToBackend({
      type: 'generate_recovered',
      key: record.key,
      nativeImageSettings: snapshot?.settings,
      nativeSettingsCapturedAt: snapshot?.capturedAt,
    })
  }

  async function generateAllRecovered(): Promise<void> {
    if (!activeChatId) return
    const snapshot = await syncNativeSettings()
    ctx.sendToBackend({
      type: 'generate_all_recovered',
      chatId: activeChatId,
      nativeImageSettings: snapshot?.settings,
      nativeSettingsCapturedAt: snapshot?.capturedAt,
    })
  }

  async function regenerate(record: SlotRecord, useCurrentNativeSettings = false, highResMode?: boolean): Promise<void> {
    const current = recordByKey.get(record.key) || record
    if (isSlotActionBusy(current)) return
    const previousOrbStatus = relayOrbStatus
    relayOrbStatus = 'generating'
    lastStatus = 'Preparing regeneration…'
    setOptimisticSlotBusy(record.key, 'Preparing regeneration…')
    renderRelayOrb()
    try {
      const snapshot = useCurrentNativeSettings ? await syncNativeSettings() : null
      const id = submissionId('regenerate', record.key)
      const submitted = slotActionFeedback.submit({
        submissionId: id,
        key: record.key,
        action: 'regenerate',
        statusText: 'Preparing regeneration…',
        dispatch: () => ctx.sendToBackend({
          type: 'regenerate_slot', submissionId: id, key: record.key, highResMode,
          useCurrentNativeSettings, nativeImageSettings: snapshot?.settings,
          nativeSettingsCapturedAt: snapshot?.capturedAt,
        }),
        closePopup: () => {},
        setDisabled: () => {},
        showPopupError: message => { if (message) showToast('error', message) },
        restorePending: () => {
          restoreOptimisticSlotAction(record.key)
          relayOrbStatus = previousOrbStatus
          renderRelayOrb()
        },
        setBusy: setOptimisticSlotBusy,
        finishBusy: finishOptimisticSlotBusy,
      })
      if (!submitted) {
        restoreOptimisticSlotAction(record.key)
        relayOrbStatus = previousOrbStatus
        renderRelayOrb()
      }
    } catch (error) {
      restoreOptimisticSlotAction(record.key)
      relayOrbStatus = previousOrbStatus
      renderRelayOrb()
      showToast('error', error instanceof Error ? error.message : String(error))
    }
  }

  async function reparse(record: SlotRecord, useCurrentNativeSettings = false): Promise<void> {
    relayOrbStatus = 'analyzing'
    renderRelayOrb()
    const snapshot = useCurrentNativeSettings ? await syncNativeSettings() : null
    ctx.sendToBackend({
      type: 'reparse_slot',
      key: record.key,
      useCurrentNativeSettings,
      nativeImageSettings: snapshot?.settings,
      nativeSettingsCapturedAt: snapshot?.capturedAt,
    })
  }

  function applyRelaySettingsDraft(patch: RelaySettingsPatch): void {
    if (!config) return
    if (patch.kind === 'surface-preferences') {
      const now = Date.now()
      customSurfaces = {
        ...customSurfaces,
        ...(patch.rendererMode !== undefined ? { rendererMode: patch.rendererMode } : {}),
        ...(patch.defaultShellMode !== undefined ? { defaultShellMode: patch.defaultShellMode } : {}),
        ...(patch.colorMode !== undefined ? { colorMode: patch.colorMode } : {}),
        ...(patch.utilityInjectionEnabled !== undefined ? { utilityInjectionEnabled: patch.utilityInjectionEnabled } : {}),
        updatedAt: now,
      }
      config = {
        ...config,
        ...(patch.rendererMode !== undefined ? { surfaceRendererMode: patch.rendererMode } : {}),
        ...(patch.defaultShellMode !== undefined ? { surfaceDefaultShellMode: patch.defaultShellMode, narrativeDlcVariant: narrativeVariantForSurfaceShellMode(patch.defaultShellMode) } : {}),
        ...(patch.colorMode !== undefined ? { surfaceColorMode: patch.colorMode } : {}),
        ...(patch.utilityInjectionEnabled !== undefined ? { surfaceUtilityInjectionEnabled: patch.utilityInjectionEnabled } : {}),
        surfacePreferencesInitialized: true,
        globalSurfaceStudio: customSurfaces,
      }
      invalidateDisplayIfContractChanged(config, customSurfaces)
      return
    }
    if (patch.kind === 'surface-prompt-enabled') {
      const now = Date.now()
      const definitions = { ...customSurfaces.definitions }
      for (const [surfaceId, promptEnabled] of Object.entries(patch.values)) {
        const definition = definitions[surfaceId]
        if (definition) definitions[surfaceId] = { ...definition, promptEnabled, updatedAt: now }
      }
      customSurfaces = { ...customSurfaces, definitions, updatedAt: now }
      config = { ...config, globalSurfaceStudio: customSurfaces }
      return
    }
    if (patch.kind === 'character-phone-apps') {
      config = { ...config, characterPhoneDefaultApps: normalizeCharacterPhoneDefaultApps(patch.defaultApps, { migrateMissing: false }) }
      return
    }
    if (patch.kind === 'narrative-enabled') {
      config = { ...config, narrativeDlcEnabled: patch.enabledNames.length > 0, narrativeDlcUtilityNames: [...patch.enabledNames] }
      narrativeUtilityRegistry = narrativeUtilityRegistry.map(record => ({ ...record, enabled: patch.enabledNames.includes(record.id) }))
      return
    }
    if (patch.kind === 'narrative-image-enabled') {
      const imageEnabled = { ...(config.narrativeUtilityImageEnabled || {}) }
      if (patch.enabled) delete imageEnabled[patch.utilityName]
      else imageEnabled[patch.utilityName] = false
      config = { ...config, narrativeUtilityImageEnabled: imageEnabled }
      narrativeUtilityRegistry = narrativeUtilityRegistry.map(record => record.id === patch.utilityName ? { ...record, imageEnabled: patch.enabled } : record)
      return
    }
    if (patch.kind === 'prompt-registry-override') {
      const promptRegistry = { ...(config.proseIllustratorSettings.promptRegistry || {}) }
      const promptRegistryVersions = { ...(config.proseIllustratorSettings.promptRegistryVersions || {}) }
      if (patch.content === null) delete promptRegistry[patch.promptId]
      else promptRegistry[patch.promptId] = patch.content
      promptRegistryVersions[patch.promptId] = patch.version
      config = { ...config, proseIllustratorSettings: { ...config.proseIllustratorSettings, promptRegistry, promptRegistryVersions } }
      return
    }
    const overrides = { ...(config.narrativeUtilityOverrides || {}) }
    const record = narrativeUtilityRegistry.find(candidate => candidate.id === patch.utilityName)
    if (patch.content === null || !patch.content.trim()) delete overrides[patch.utilityName]
    else overrides[patch.utilityName] = { content: patch.content, revision: (overrides[patch.utilityName]?.revision || 0) + 1, updatedAt: Date.now() }
    config = { ...config, narrativeUtilityOverrides: overrides }
    narrativeUtilityRegistry = narrativeUtilityRegistry.map(candidate => candidate.id !== patch.utilityName ? candidate : {
      ...candidate,
      effectiveContent: patch.content?.trim() ? patch.content : candidate.defaultContent,
      source: patch.content?.trim() ? 'user-override' : 'default',
      revision: patch.content?.trim() ? candidate.revision + 1 : 0,
      updatedAt: Date.now(),
      warnings: record?.warnings || [],
    })
  }

  function dispatchNextRelaySettingsPatch(): void {
    if (settingsPatchInFlight || !settingsPatchQueue.length) return
    const next = settingsPatchQueue[0]
    next.expectedRevision = config?.settingsRevision || 0
    settingsPatchInFlight = next.operationId
    try {
      ctx.sendToBackend({ type: 'relay_settings_patch', chatId: activeChatId, ...next })
    } catch (error) {
      settingsPatchInFlight = null
      settingsPatchQueue.shift()
      showToast('error', `Setting could not be sent: ${error instanceof Error ? error.message : String(error)}`)
      dispatchNextRelaySettingsPatch()
    }
  }

  function enqueueRelaySettingsPatch(patch: RelaySettingsPatch): void {
    applyRelaySettingsDraft(patch)
    const operationId = `settings-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    settingsPatchQueue.push({ operationId, expectedRevision: config?.settingsRevision || 0, patch })
    renderPanel()
    dispatchNextRelaySettingsPatch()
  }

  function requestNarrativeUtilityRegistry(force = false): void {
    if (narrativeUtilityRegistryRequested || (!force && narrativeUtilityRegistry.length)) return
    narrativeUtilityRegistryRequested = true
    ctx.sendToBackend({ type: 'narrative_utility_registry', requestId: `narrative-registry-${Date.now()}` })
  }

  function patchConfig(patch: Partial<RouterConfig>): void {
    // Only the newest local value for each preference awaits confirmation.
    // Otherwise a coalesced server echo can confirm Strong and revive an older
    // pending Low/Medium selection for another fifteen seconds.
    pendingConfigPatches = pendingConfigPatches.map(pending => ({
      ...pending,
      patch: Object.fromEntries(Object.entries(pending.patch).filter(([key]) => !(key in patch))),
    })).filter(pending => Object.keys(pending.patch).length > 0)
    pendingConfigPatches.push({ patch, sentAt: Date.now() })
    if (config) {
      config = { ...config, ...patch }
      if('phoneEnabled' in patch)phoneWidget?.setEnabled(config.phoneEnabled!==false)
      if (patch.vaultStrength) {
        continuityVault = { ...continuityVault, strength: patch.vaultStrength }
        if (config.proseIllustratorSettings.appearanceMemoryOverride === 'global') {
          config.proseIllustratorSettings = { ...config.proseIllustratorSettings, continuityStrength: patch.vaultStrength }
          if (pendingProseSettingsWrite?.settings.appearanceMemoryOverride === 'global') {
            pendingProseSettingsWrite.settings = { ...pendingProseSettingsWrite.settings, continuityStrength: patch.vaultStrength }
          }
        }
      }
      invalidateDisplayIfContractChanged(config, customSurfaces)
      if (patch.generationPlaceholderEffect) syncGenerationPlaceholderEffect()
      applyGlobalInterfaceSettings()
      renderRelayOrb()
      renderPanel()
    }
    ctx.sendToBackend({ type: 'set_config', chatId: activeChatId, patch })
  }

  async function copyText(text: string, success: string): Promise<void> {
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const area = document.createElement('textarea')
      area.value = text
      area.style.position = 'fixed'
      area.style.left = '-9999px'
      document.body.appendChild(area)
      area.select()
      document.execCommand('copy')
      area.remove()
    }
    showToast('success', success)
  }

  function metadataText(value: unknown): string {
    return typeof value === 'string' ? value : ''
  }

  function confirmCleanup(options: { title: string; description: string; scope: string; actionLabel: string; onConfirm: () => void | Promise<void>; strong?: boolean }): void {
    confirmEl?.remove()
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const backdrop = document.createElement('div')
    backdrop.className = 'dg-router-panel dg-confirm-backdrop'
    const dialog = document.createElement('div')
    dialog.className = `dg-confirm-dialog${options.strong ? ' dg-confirm-dialog-strong' : ''}`
    dialog.setAttribute('role', 'dialog')
    dialog.setAttribute('aria-modal', 'true')
    const titleId = `dg-confirm-${Date.now()}`
    dialog.setAttribute('aria-labelledby', titleId)
    const title = document.createElement('h2')
    title.id = titleId
    title.className = 'dg-confirm-title'
    title.textContent = options.title
    const description = document.createElement('div')
    description.className = 'dg-confirm-description'
    description.textContent = options.description
    const scope = document.createElement('div')
    scope.className = 'dg-confirm-scope'
    scope.textContent = options.scope
    const actions = document.createElement('div')
    actions.className = 'dg-actions'
    let running = false
    const close = () => {
      if (running) return
      backdrop.remove()
      confirmEl = null
      document.removeEventListener('keydown', onKeyDown, true)
      previousFocus?.focus()
    }
    const cancel = button('Cancel', close, false, 'subtle')
    const confirm = button(options.actionLabel, () => {
      if (running) return
      running = true
      cancel.disabled = true
      confirm.disabled = true
      Promise.resolve(options.onConfirm()).finally(() => {
        running = false
        backdrop.remove()
        confirmEl = null
        document.removeEventListener('keydown', onKeyDown, true)
        previousFocus?.focus()
      })
    }, false, 'danger')
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); close(); return }
      if (event.key !== 'Tab') return
      const focusable = [cancel, confirm].filter(element => !element.disabled)
      if (!focusable.length) return
      const index = focusable.indexOf(document.activeElement as HTMLButtonElement)
      const next = event.shiftKey ? (index <= 0 ? focusable.length - 1 : index - 1) : (index >= focusable.length - 1 ? 0 : index + 1)
      event.preventDefault(); focusable[next].focus()
    }
    actions.append(cancel, confirm)
    dialog.append(title, description, scope, actions)
    backdrop.appendChild(dialog)
    backdrop.addEventListener('mousedown', event => { if (event.target === backdrop) close() })
    document.addEventListener('keydown', onKeyDown, true)
    document.documentElement.appendChild(backdrop)
    confirmEl = backdrop
    cancel.focus()
  }

  function cleanupButton(label: string, title: string, description: string, action: 'clear_failed' | 'clear_completed' | 'clear_orphaned' | 'clear_cancelled' | 'clear_all', strong = false): HTMLButtonElement {
    return button(label, () => {
      if (!activeChatId) return
      confirmCleanup({
        title, description, scope: `${records.length} Relay records in the current chat`, actionLabel: label === 'Clear All Relay State' ? 'Clear All State' : label,
        strong, onConfirm: () => ctx.sendToBackend({ type: 'cleanup', chatId: activeChatId!, scope: 'chat', action }),
      })
    }, !activeChatId, action === 'clear_all' ? 'danger' : 'subtle')
  }

  function debugBundle(): Record<string, unknown> {
    return redactSecrets({
      extensionVersion: EXTENSION_VERSION,
      frontendBuildId: BUILD_ID,
      frontendLoadedAt,
      backend: backendBuild,
      schemaVersion,
      config,
      activeChatId,
      records,
      candidateBatches,
      assetLibrary,
      versionTrees,
      continuityVault,
      customSurfaces,
      proseIllustrator,
      logs,
      selfTest,
    }) as Record<string, unknown>
  }

  function downloadDebugBundle(): void {
    const blob = new Blob([JSON.stringify(debugBundle(), null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `reverie-relay-debug-${Date.now()}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  function redactSecrets(value: unknown, key = ''): unknown {
    const sensitive = /api[_-]?key|token|secret|authorization|password|cookie|session|credential/i
    if (sensitive.test(key)) return '[REDACTED]'
    if (Array.isArray(value)) return value.map(item => redactSecrets(item))
    if (value && typeof value === 'object') {
      return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([entryKey, entryValue]) => [entryKey, redactSecrets(entryValue, entryKey)]))
    }
    return value
  }

  function surfaceRepairConnectionField(selected = config?.surfaceRepairConnectionId || null, onChange?: (value: string | null) => void): HTMLElement {
    const inherited = parserConnections.find(connection => connection.id === config?.parserConnectionId)
    const field = selectField('Assisted Repair Connection', selected || '', [
      ['', inherited ? `Use Surface Parser (${inherited.name} / ${config?.parserModel || inherited.model})` : 'Use Surface Parser (not configured)'],
      ...parserConnections.map(connection => [connection.id, `${connection.name} / ${connection.model}`] as [string, string]),
    ], value => {
      const next = value || null
      onChange?.(next)
      patchConfig({ surfaceRepairConnectionId: next })
    })
    field.querySelector('select')!.setAttribute('aria-label', 'Assisted Repair Connection')
    return field
  }

  function parserSelect(current: RouterConfig): HTMLElement {
    const field = document.createElement('div')
    field.className = 'dg-field'
    const label = fieldLabel('Parser Connection')
    const select = document.createElement('select')
    select.className = 'dg-select'
    select.disabled = current.followNativeParser
    const emptyOption = document.createElement('option')
    emptyOption.value = ''
    emptyOption.textContent = current.followNativeParser ? 'Mirroring native parser' : 'Select parser'
    select.appendChild(emptyOption)
    for (const connection of parserConnections) {
      const option = document.createElement('option')
      option.value = connection.id
      option.textContent = `${connection.name} (${connection.provider}${connection.model ? ` / ${connection.model}` : ''})`
      option.selected = connection.id === current.parserConnectionId
      select.appendChild(option)
    }
    select.addEventListener('change', () => patchConfig({ parserConnectionId: select.value || null, followNativeParser: false }))
    field.append(label, select)
    return field
  }

  function panelSection(titleText: string, content: Node): HTMLElement {
    const section = document.createElement('section')
    section.className = 'dg-section'
    const title = document.createElement('h3')
    title.className = 'dg-section-title'
    title.textContent = titleText
    section.append(title, content)
    return section
  }

  function panelDisclosure(titleText: string, content: Node, open = false): HTMLDetailsElement {
    const section = document.createElement('details')
    section.className = 'dg-section dg-disclosure'
    section.open = open
    const title = document.createElement('summary')
    title.className = 'dg-section-title'
    title.textContent = titleText
    section.append(title, content)
    return section
  }

  function documentFragment(...nodes: Node[]): DocumentFragment {
    const fragment = document.createDocumentFragment()
    fragment.append(...nodes)
    return fragment
  }

  function helpTip(labelText: string, helpText = ''): HTMLElement {
    const wrap = document.createElement('span')
    wrap.className = 'dg-help'
    const resolvedHelp = settingHelp(labelText, helpText)
    if (!resolvedHelp) {
      wrap.hidden = true
      return wrap
    }
    const trigger = document.createElement('span')
    trigger.className = 'dg-help-trigger'
    trigger.setAttribute('role', 'button')
    trigger.tabIndex = 0
    trigger.setAttribute('aria-label', `Help for ${labelText}`)
    trigger.setAttribute('aria-expanded', 'false')
    const tooltipId = `dg-help-${Math.random().toString(36).slice(2, 10)}`
    trigger.setAttribute('aria-describedby', tooltipId)
    trigger.textContent = '?'
    const popover = document.createElement('span')
    popover.className = 'dg-help-popover'
    popover.id = tooltipId
    popover.setAttribute('role', 'tooltip')
    popover.textContent = resolvedHelp
    let portal: HTMLElement | null = null
    let pinned = false
    let closeTimer: ReturnType<typeof window.setTimeout> | null = null
    const onDocumentPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null
      if (target && (trigger.contains(target) || popover.contains(target))) return
      pinned = false
      close()
    }
    const position = () => {
      if (!portal) return
      const triggerRect = trigger.getBoundingClientRect()
      const width = Math.max(180, Math.min(244, window.innerWidth - 24))
      popover.style.width = `${width}px`
      popover.style.left = '12px'
      popover.style.top = '12px'
      const measured = popover.getBoundingClientRect()
      const left = Math.max(12, Math.min(window.innerWidth - width - 12, triggerRect.left + (triggerRect.width / 2) - (width / 2)))
      const above = triggerRect.top - measured.height - 8
      const top = above >= 12
        ? above
        : Math.min(window.innerHeight - measured.height - 12, triggerRect.bottom + 8)
      popover.style.left = `${left}px`
      popover.style.top = `${Math.max(12, top)}px`
    }
    const close = () => {
      if (closeTimer !== null) { window.clearTimeout(closeTimer); closeTimer = null }
      pinned = false
      wrap.classList.remove('is-open')
      popover.classList.remove('is-open')
      trigger.setAttribute('aria-expanded', 'false')
      window.removeEventListener('resize', position)
      document.removeEventListener('scroll', position, true)
      document.removeEventListener('pointerdown', onDocumentPointerDown, true)
      if (portal) {
        wrap.appendChild(popover)
        portal.remove()
        portal = null
      }
      popover.removeAttribute('style')
      if (closeActiveHelpPopover === close) closeActiveHelpPopover = null
    }
    const open = () => {
      if (closeTimer !== null) { window.clearTimeout(closeTimer); closeTimer = null }
      if (portal) { position(); return }
      closeActiveHelpPopover?.()
      portal = document.createElement('span')
      portal.className = 'dg-router-panel dg-help-portal'
      portal.appendChild(popover)
      document.body.appendChild(portal)
      wrap.classList.add('is-open')
      popover.classList.add('is-open')
      trigger.setAttribute('aria-expanded', 'true')
      closeActiveHelpPopover = close
      position()
      window.addEventListener('resize', position)
      document.addEventListener('scroll', position, true)
      document.addEventListener('pointerdown', onDocumentPointerDown, true)
    }
    const scheduleClose = () => {
      if (pinned) return
      if (closeTimer !== null) window.clearTimeout(closeTimer)
      closeTimer = window.setTimeout(close, 120)
    }
    const toggle = (event: Event) => {
      event.preventDefault()
      event.stopPropagation()
      if (portal && pinned) {
        pinned = false
        close()
      } else {
        pinned = true
        open()
      }
    }
    trigger.addEventListener('click', toggle)
    trigger.addEventListener('pointerenter', open)
    trigger.addEventListener('pointerleave', scheduleClose)
    trigger.addEventListener('focus', open)
    trigger.addEventListener('blur', scheduleClose)
    popover.addEventListener('pointerenter', () => {
      if (closeTimer !== null) { window.clearTimeout(closeTimer); closeTimer = null }
    })
    popover.addEventListener('pointerleave', scheduleClose)
    trigger.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') toggle(event)
      else if (event.key === 'Escape') { pinned = false; close(); trigger.blur() }
    })
    wrap.append(trigger, popover)
    return wrap
  }

  function fieldLabel(labelText: string, helpText = ''): HTMLLabelElement {
    const label = document.createElement('label')
    label.className = 'dg-label-with-help'
    const copy = document.createElement('span')
    copy.textContent = labelText
    label.append(copy, helpTip(labelText, helpText))
    return label
  }

  function settingHeading(labelText: string, helpText = ''): HTMLElement {
    const heading = document.createElement('div')
    heading.className = 'dg-field-label dg-label-with-help'
    const copy = document.createElement('span')
    copy.textContent = labelText
    heading.append(copy, helpTip(labelText, helpText))
    return heading
  }

  function toggleCard(labelText: string, description: string, value: boolean, onChange: (checked: boolean) => void, disabled = false): HTMLElement {
    const label = document.createElement('label')
    label.className = `dg-toggle ${value ? 'dg-toggle-on' : ''}${disabled ? ' is-disabled' : ''}`
    const copy = document.createElement('span')
    copy.className = 'dg-toggle-copy'
    const titleRow = document.createElement('span')
    titleRow.className = 'dg-toggle-title-row'
    const title = document.createElement('span')
    title.className = 'dg-toggle-title'
    title.textContent = labelText
    titleRow.append(title, helpTip(labelText, description))
    copy.appendChild(titleRow)
    if (description) {
      const detail = document.createElement('span')
      detail.className = 'dg-toggle-description'
      detail.textContent = description
      copy.appendChild(detail)
    }
    const input = document.createElement('input')
    input.type = 'checkbox'
    input.checked = value
    input.disabled = disabled
    // Commit from the immediate toggle event. renderPanel() deliberately keeps
    // typed edits mounted, but checkbox/radio focus is not an editing session.
    input.addEventListener('input', () => { label.classList.toggle('dg-toggle-on', input.checked); onChange(input.checked) })
    const slider = document.createElement('span')
    slider.className = 'dg-switch'
    slider.setAttribute('aria-hidden', 'true')
    label.append(copy, input, slider)
    return label
  }

  function checkbox(labelText: string, value: boolean, onChange: (checked: boolean) => void): HTMLElement {
    const row = document.createElement('div')
    row.className = 'dg-row'
    const input = document.createElement('input')
    input.type = 'checkbox'
    input.checked = value
    const label = fieldLabel(labelText)
    input.addEventListener('input', () => { label.classList.toggle('dg-toggle-on', input.checked); onChange(input.checked) })
    row.append(input, label)
    return row
  }

  function textInput(labelText: string, value: string, onChange: (value: string) => void, disabled = false): HTMLElement {
    const field = document.createElement('div')
    field.className = 'dg-field'
    const label = fieldLabel(labelText)
    const input = document.createElement('input')
    input.className = 'dg-input'
    input.value = value
    input.disabled = disabled
    input.addEventListener('change', () => onChange(input.value.trim()))
    field.append(label, input)
    return field
  }

  function selectField(labelText: string, value: string, options: Array<[string, string]>, onChange: (value: string) => void): HTMLElement {
    const field = document.createElement('div')
    field.className = 'dg-field'
    const label = fieldLabel(labelText)
    const select = document.createElement('select')
    select.className = 'dg-select'
    for (const [optionValue, optionLabel] of options) {
      const option = document.createElement('option')
      option.value = optionValue
      option.textContent = optionLabel
      option.selected = optionValue === value
      select.appendChild(option)
    }
    select.addEventListener('change', () => onChange(select.value))
    field.append(label, select)
    return field
  }

  function numberInput(labelText: string, value: number, min: number, max: number, onChange: (value: number) => void): HTMLElement {
    const field = document.createElement('div')
    field.className = 'dg-field'
    const label = fieldLabel(labelText)
    const input = document.createElement('input')
    input.className = 'dg-input'
    input.type = 'number'
    input.min = String(min)
    input.max = String(max)
    input.value = String(value)
    input.addEventListener('change', () => onChange(Math.max(min, Math.min(max, Math.round(Number(input.value) || value)))))
    field.append(label, input)
    return field
  }

  function textareaInput(labelText: string, value: string, onChange: (value: string) => void, disabled = false): HTMLElement {
    const field = document.createElement('div')
    field.className = 'dg-field'
    const label = fieldLabel(labelText)
    const input = document.createElement('textarea')
    input.className = 'dg-textarea'
    input.value = value
    input.disabled = disabled
    input.addEventListener('change', () => onChange(input.value))
    field.append(label, input)
    return field
  }

  function resettableTextareaInput(labelText: string, value: string, template: string, onChange: (value: string) => void): HTMLElement {
    const field = textareaInput(labelText, value, onChange)
    field.classList.add('dg-resettable-prompt')
    const actions = document.createElement('div')
    actions.className = 'dg-actions dg-prompt-reset-actions'
    const reset = button('Reset to Template', () => {
      const input = field.querySelector<HTMLTextAreaElement>('textarea')
      if (input) input.value = template
      onChange(template)
    }, value === template, 'subtle')
    actions.appendChild(reset)
    field.appendChild(actions)
    return field
  }

  function modalTextarea(labelText: string, value: string, short = false, helpText = ''): HTMLElement {
    const field = textareaInput(labelText, value, () => {})
    const tooltip = field.querySelector<HTMLElement>('.dg-help-popover')
    if (tooltip) tooltip.textContent = settingHelp(labelText, helpText)
    const textarea = field.querySelector('textarea')
    if (textarea && short) textarea.style.minHeight = '70px'
    return field
  }

  function button(label: string, onClick: () => void, disabled = false, variant: 'standard' | 'primary' | 'subtle' | 'danger' | 'icon' = 'standard', tooltip = ''): HTMLButtonElement {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = `dg-btn ${variant !== 'standard' ? `dg-btn-${variant}` : ''}`
    btn.textContent = label
    btn.disabled = disabled
    if (tooltip) btn.title = tooltip
    btn.addEventListener('click', onClick)
    return btn
  }

  function countBox(label: string, value: number, status: 'processing' | 'ready' | 'failed' | 'completed'): HTMLElement {
    const box = document.createElement('div')
    box.className = `dg-count dg-count-${status}`
    const dot = document.createElement('span')
    dot.className = 'dg-count-dot'
    dot.setAttribute('aria-hidden', 'true')
    const copy = document.createElement('div')
    copy.className = 'dg-count-copy'
    const num = document.createElement('b')
    num.textContent = String(value)
    const text = document.createElement('span')
    text.textContent = label
    copy.append(num, text)
    box.append(dot, copy)
    return box
  }

  function chip(text: string, status: string): HTMLElement {
    const el = document.createElement('span')
    el.className = `dg-chip ${status ? `dg-chip-${status}` : ''}`
    el.textContent = text
    el.title = text
    return el
  }

  function empty(text: string): HTMLElement {
    const div = document.createElement('div')
    div.className = 'dg-router-empty'
    div.textContent = text
    return div
  }

  function countStatuses(): { processing: number; readyToPlace: number; failed: number; completed: number } {
    return countCurrentChatOverview(records, activeChatId)
  }

  function canReparse(record: SlotRecord): boolean {
    return Boolean(record.originalSceneBrief.trim() && record.originalRequestXml.trim())
  }

  function canRegenerate(record: SlotRecord): boolean {
    return Boolean(record.resolvedPositivePrompt?.trim())
  }

  function isMarkerOnly(record: SlotRecord): boolean {
    return record.recoveryCompleteness === 'marker-only' || Boolean(!record.recoveryCompleteness && record.recoverySource && !record.originalSceneBrief && !record.originalRequestXml)
  }

  function isReconstructedRecovery(record: SlotRecord): boolean {
    return record.recoveryCompleteness === 'reconstructed' && Boolean(record.recoverySource)
  }

  function providerLabel(record: SlotRecord): string {
    if (record.imageProvider) return record.imageProvider
    return record.recoverySource ? 'Provider unavailable' : 'Provider unavailable'
  }

  function modelLabel(record: SlotRecord): string {
    if (record.imageModel) return record.imageModel
    return record.recoverySource ? 'Model unavailable' : 'Model unavailable'
  }

  function modeLabel(record: SlotRecord): string {
    if (record.highResMode === undefined) return 'Mode unknown'
    return record.highResMode ? 'High-Res' : 'Normal'
  }

  function recoveryHistoryMessage(record: SlotRecord): string {
    if (record.recoveryCompleteness === 'reconstructed') return 'Reconstructed request\nEdited from recovered alt text'
    if (record.recoverySource === 'error-marker') return 'Recovered error marker\nRequest source unavailable'
    if (record.recoverySource === 'resolved-marker') return 'Recovered completed image\nOriginal prompt metadata unavailable'
    return 'Recovered request'
  }

  function rescanRecoveredCount(summary: ChatRescanSummary): number {
    return summary.recoveredPending + summary.recoveredCompleted + summary.recoveredFailed + summary.imageUnavailable
  }

  function emptyFrontendRescanSummary(): ChatRescanSummary {
    return {
      messagesScanned: 0, activeSwipesScanned: 0, inactiveSwipesScanned: 0,
      unresolvedRequestsFound: 0, resolvedMarkersFound: 0, errorMarkersFound: 0,
      existingSlotsSkipped: 0, recoveredPending: 0, recoveredCompleted: 0,
      recoveredFailed: 0, imageUnavailable: 0, malformedSources: 0, inactiveRecordsRecovered: 0,
      durationMs: 0, recoveredKeys: [],
    }
  }

  function isProcessing(record: SlotRecord): boolean {
    return isSlotLifecycleActive(record.status)
  }

  function isRelaySlotProcessing(record: SlotRecord): boolean {
    return candidateBatches.some(batch => batch.chatId === record.chatId && batch.status === 'processing' && batch.candidates.some(candidate => candidate.stableSlotKey === record.key && ['preflight', 'parsing', 'provider-waiting', 'generating'].includes(candidate.status)))
  }

  function isSlotActionBusy(record: SlotRecord): boolean {
    return isProcessing(record) || isRelaySlotProcessing(record)
  }

  function appLabel(record: { targetApp: SlotRecord['targetApp'] }): string {
    if (record.targetApp === 'twitter') return 'Twitter'
    if (record.targetApp === 'smartphone') return 'Smartphone'
    if (record.targetApp === 'kakao') return 'Kakao'
    if (record.targetApp === 'prose') return 'Illustrator'
    if (record.targetApp === 'custom') return 'Custom'
    return 'Instagram'
  }

  function slotLabel(record: { slot: string; target: ImageTarget; targetApp: SlotRecord['targetApp'] }): string {
    if (record.targetApp === 'custom' && record.target.startsWith('custom.')) return record.target.slice('custom.'.length).replace(/-/g, ' ')
    return record.slot.replace(/-/g, ' ')
  }

  function titleCase(value: string): string {
    return value.slice(0, 1).toUpperCase() + value.slice(1)
  }

  function drawerTabLabel(value: DrawerTab): string {
    if (value === 'genetics') return 'Appearance Memory'
    if (value === 'recipes') return 'Recipes'
    if (value === 'manual') return 'Guide'
    if (value === 'story-constellations') return 'Constellations'
    if (value === 'phone') return 'Phone'
    if (value === 'story-reel') return 'Story Reel'
    return titleCase(value)
  }

  function validDrawerTab(value?: string): DrawerTab | null {
    if (value === 'continuity') return 'genetics'
    if (value === 'assets') return 'history'
    if (value === 'queue') return 'slots'
    if (value === 'story-phones') return 'phone'
    const tabs: DrawerTab[] = ['slots', 'illustrator', 'recipes', 'genetics', 'surfaces', 'surface-library', 'surface-presets', 'utility-studio', 'history', 'logs', 'manual', 'settings', 'story-constellations', 'phone', 'story-reel']
    return tabs.includes(value as DrawerTab) ? value as DrawerTab : null
  }

  function urlMatches(renderedSrc: string, storedUrl: string): boolean {
    if (!renderedSrc || !storedUrl) return false
    if (renderedSrc === storedUrl || renderedSrc.endsWith(storedUrl)) return true
    try {
      const rendered = new URL(renderedSrc, window.location.origin)
      const stored = new URL(storedUrl, window.location.origin)
      return rendered.pathname === stored.pathname
    } catch {
      return renderedSrc.includes(storedUrl)
    }
  }

  function cssEscape(value: string): string {
    if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') return CSS.escape(value)
    return value.replace(/["\\]/g, '\\$&')
  }

  const toastDedupeUntil = new Map<string, number>()
  let toastStack: HTMLElement | null = null
  function showToast(level: 'info' | 'success' | 'warning' | 'error', message: string): void {
    const text = String(message || '').trim()
    if (!text) return
    const key = `${level}:${text}`
    const now = Date.now()
    if ((toastDedupeUntil.get(key) || 0) > now) return
    toastDedupeUntil.set(key, now + 1_600)
    window.setTimeout(() => {
      if ((toastDedupeUntil.get(key) || 0) <= Date.now()) toastDedupeUntil.delete(key)
    }, 1_650)

    if (!toastStack?.isConnected) {
      toastStack = document.createElement('div')
      toastStack.className = 'dg-toast-stack'
      toastStack.setAttribute('role', 'region')
      toastStack.setAttribute('aria-label', 'Relay notifications')
      toastStack.setAttribute('aria-live', 'polite')
      document.body.appendChild(toastStack)
    }
    const toast = document.createElement('div')
    toast.className = 'dg-toast'
    toast.dataset.level = level
    toast.setAttribute('role', level === 'error' || level === 'warning' ? 'alert' : 'status')
    const copy = document.createElement('span')
    copy.className = 'dg-toast-copy'
    copy.textContent = text
    const dismiss = document.createElement('button')
    dismiss.className = 'dg-toast-dismiss'
    dismiss.type = 'button'
    dismiss.setAttribute('aria-label', 'Dismiss notification')
    dismiss.textContent = '×'
    const remove = () => {
      window.clearTimeout(timeout)
      toast.remove()
      if (toastStack?.isConnected && !toastStack.childElementCount) {
        toastStack.remove()
        toastStack = null
      }
    }
    dismiss.addEventListener('click', remove, { once: true })
    toast.append(copy, dismiss)
    toastStack.appendChild(toast)
    const timeout = window.setTimeout(remove, level === 'error' || level === 'warning' ? 6_000 : 4_000)
  }

  function sharedConfigError(message: string): boolean {
    return /missing parameters\.workflow|configure\/select|connection .*not found|no imagegen connection|provider configuration/i.test(message)
  }

  const cleanup = () => {
    if (disposed) return
    disposed = true
    sendFrontendSession(false)
    clearPlacementVisualHeartbeats()
    clearProseRevealGuards()
    // Best effort only. Persisted ownership is cleared only after the host
    // setting write succeeds, so a later startup can repair a torn teardown.
    void enforceNativeAutoGenerationGuard(true)
    streamPreviews.clear()
    completedPreviewGenerations.clear()
    if (bindTimer) window.cancelAnimationFrame?.(bindTimer)
    clearTimeout(terminalStateRefreshTimer)
    terminalStateRefreshTimer = 0
    for (const timer of nativeSnapshotScanTimers.values()) window.clearTimeout(timer)
    nativeSnapshotScanTimers.clear()
    nativeSnapshotScanAttempts.clear()
    nativeSnapshotScanWarned.clear()
    for (const attempt of requestedProjectionInvalidations.values()) if (attempt.timer) window.clearTimeout(attempt.timer)
    requestedProjectionInvalidations.clear()
    for (const stale of Array.from(document.querySelectorAll<HTMLElement>('.dg-illustration-portal-button'))) stale.remove()
    clearTimeout(activeChatSyncTimer)
    clearInterval(sidecarNoticeTimer)
    sidecarNoticeTimer = 0
    clearLongPress()
    relayOrbCleanup?.()
    relayOrbCleanup = null
    relayOrb = null
    closeActionMenu()
    sidecarNoticeEl?.remove()
    sidecarNoticeEl = null
    confirmEl?.remove()
    lifecycle.dispose()
    for (const cleanup of lifecycleInterceptorCleanups.splice(0)) cleanup()
    cancelPendingLifecycleScans()
    lifecycleScanCooldown.clear()
    unsubBackend()
    unsubChat()
    unsubChatChanged()
    unsubEdit()
    unsubSwipe()
    unsubSwipeEdited()
    unsubInputRelay()
    unsubInputSurfaces()
    inputRelayAction.destroy()
    inputSurfacesAction.destroy()
    phoneWidget?.destroy()
    offPhoneToolRenderSync()
    tab.destroy()
    for (const style of mountedLifecycleStyleNodes) style.remove()
    mountedLifecycleStyleNodes.clear()
    removeLifecycleStyle()
    removeStyle()
    ctx.dom.cleanup()
    if (runtimeHost.__REVERIE_RELAY_FRONTEND_DISPOSE__ === cleanup) delete runtimeHost.__REVERIE_RELAY_FRONTEND_DISPOSE__
    if (documentHost.__REVERIE_RELAY_DOCUMENT_RUNTIME__?.ownerId === documentRuntimeOwnerId) delete documentHost.__REVERIE_RELAY_DOCUMENT_RUNTIME__
  }
  runtimeHost.__REVERIE_RELAY_FRONTEND_DISPOSE__ = cleanup
  documentHost.__REVERIE_RELAY_DOCUMENT_RUNTIME__ = { ownerId: documentRuntimeOwnerId, dispose: cleanup }
  return cleanup
}
