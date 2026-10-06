# Reverie Relay User Guide

## Surfaces and Utilities

Open **Reverie Relay → Surfaces → Library** to enable individual Surface Utilities. The category toggle selects every Utility in that category; individual toggles remain available for finer control.

**View Exact Injected Prompt** is at the top of the Library. It resolves every enabled Surface and Narrative Utility together without sending anything to a model.

Presentation is global: choose Inline, Button, Sparkling Button, or Glass Button under Surface Defaults. App and UI Surface body styling is selected separately under Color Mode: Realistic, Lumiverse Primary, or Glass Mode. Existing Surfaces refresh when either setting changes.

## Character Phone

When Narrative Utilities and Character Phone are enabled, **Character Phone Apps** lets you select and order zero to eight default apps. Defaults occupy the earliest slots. The Story Model fills any remaining slots from the approved app catalog using story context. An empty selection is valid and lets the model choose all eight apps.

## Event Constellations, Living Phones, and Story Reel

Open **Reverie Relay → Story** to review the optional Story State tools. **Event Constellations** is off by default. When enabled, Relay can use the configured parser connection to analyze newly authored or edited chat messages; it does not rescan chats on open. Findings are proposals until reviewed, unless the separate high-confidence auto-confirm option is explicitly enabled. That option only accepts validated candidates at 95% confidence or higher.

Confirmed events retain their exact source message and swipe. Changing or deleting a source does not erase confirmed canon: Relay flags it for review and excludes it from current prompt context until the source is active and reconciled. Switching swipes updates which source evidence is active. Manual backfill is available from the Story settings panel, supports cancellation, and can optionally inspect inactive swipes without adding them to active projections.

The **Constellations** panel lets you review proposals, confirm or supersede events, mark non-canon history, merge duplicate events or actor identities, classify story actors, record each participant's knowledge and how it was acquired, resolve knowledge conflicts, link Event Echoes, and associate existing Relay Assets. A later article, social post, or phone message that repeats an established event can be reviewed as an Echo of that event instead of creating a duplicate Event Node. If the configured Sidecar omits an obvious Echo, Relay can offer a conservative fallback only when a unique active confirmed event matches named participants, event-specific terms, explicit repetition language, and a grounded media/communication action. It remains a proposal, never silently confirmed; ambiguous matches and generic messages fail closed. Unknown knowledge is not treated as proof that a character is unaware.

**Reverie Phone** is an optional feature with its own **Phone** tab and settings. Its widget opens a phone alongside the story, even when no phone Surface has appeared in chat. Open Core apps, exchange messages, add supported comments, and send generated images. Configure the phone connection and incoming-message frequency in the Phone settings. The retired Character Phone Surface is no longer offered for new story output; saved records remain readable. **Inject character knowledge context** is an independent Story opt-in; the Story Reel itself is never injected.

**Story Reel** is a presentation-only projection of confirmed events, with optional pinning, hiding, captions, chapter labels, linked images, and Echoes. It does not create a second event store. Proposed, non-canon, and inactive-swipe events are not Reel cards. Use the event title to jump back to its reviewed Constellation entry.

## Illustrations and media

Illustrations can be Relay-Planned or Model Planned. In Model Planned, the Story Model authors each request at its exact prose position. Image slots reserve their final aspect ratio while an image is queued, generating, completed, retried, or repaired, so images can resolve without shifting surrounding story text.

Use **Repair / Reinsert** only when Relay offers it for a preserved request. It reuses the exact slot identity and request details. Reparse and Rescan are available when a Surface needs structural recovery.

## Appearance Memory

Appearance Memory stores stable visual identity separately from current outfits and temporary visible state. You can edit saved tags directly, add alternate looks, or remove a memory. Changes update the panel immediately.

## Surface presets

Enable the desired global Surface definitions in Library, then save that collection under Presets. One collection may be the global default. A chat may bind another preset; removing the binding returns it to the global default. Custom Surface definitions remain globally available.

Presentation selects Inline, Button, Sparkling Button, or Glass Button. Inline has no top-level launcher. The other modes start closed behind one centered launcher and retain internal state across image placement. Glass Button applies only the almost-transparent reduced-motion-aware launcher. Color independently selects Realistic, Lumiverse Primary, or Glass Mode for App and UI Surface bodies without changing semantic content. All new Surfaces, Utilities and image requests use XML; their shipped Regexes use the same schemas. Saved bracket messages remain readable without rewriting the chat. Safely recoverable markup is normalized, while ambiguous structures retain source and expose repair actions instead of inventing content. Narrative Glass authorities, including Plot Sparks, retain their complete presentation. The Relationship Map inner design is unchanged. Dossier tabs switch panels without replacing their media node, Gallery images use full-frame fitting, and newly authored Album Covers require the actual release title. Square brackets inside XML text are literal text; escape & and < in values as &amp; and &lt;.

Each of the 59 shipped Surfaces includes a plain-language overview next to its toggle. `View Exact Injected Prompt` stays above the complete Utility list and resolves all enabled Utilities together without calling a model or provider.

Relay registers `reverie_surfaces`, `reverie_illustrator`, `reverie_narrative`, and `reverie_all` as real Lumiverse macros. A macro expands to its current enabled instructions when the preset is assembled; it is not a visible placeholder tag. Use automatic injection or a manual macro placement, not both.

Character Dossier, Location File, and Cast Introduction include **Send to Lorebook**. Relay creates or reuses a chat-bound Reverie Relay Lorebook, preserves other bound Lorebooks, adds the exact selected Surface with source provenance, and opens the host Lorebook drawer when that host tab is discoverable.

The Illustrator overview includes `Copy Image Request Template`, which copies the complete canonical request block rather than only the opening tag.

## Add images to an existing tracker or preset

Keep the tracker's existing wrapper, semantic fields, child order, and Regex presentation. Choose or add one child that owns the image, such as `<tracker_media>`, and place one complete `target="custom.artifact-media"` request inside it. The request needs a stable unique `id`, a matching stable `slot`, an allowed `aspect`, useful `alt` text, and a complete `<scene_brief>`.

Teach the Story Model the exact revised tracker skeleton in a Custom Surface Utility and enable that Utility in the Surface Library. If the tracker is maintained entirely by a manual preset instead, place `{{reverie_artifact_media_protocol}}` in that preset once. Do not combine manual macro placement with duplicate automatic injection. The Guide and Surface Creator workspace include copyable tracker markup, preset instructions, and the correct Artifact Media macro.

The owner node must remain around the request through pending, generation, completion, failure, retry, reparse, and reload. Do not place the request beside or outside the tracker: Relay uses that ownership boundary to reinsert the generated asset in the correct location.

## Status Cards

A Status Card stays at the authored media location. It shows parse, queue, generation, live-preview, placement, completion, failure, retry, reparse, regeneration, and removal state for that exact slot.

Live preview is capability-dependent. Providers such as NovelAI that use request/response generation skip WebSocket preview and run one normal ImageGen request; the completed image still returns to the same reserved slot.

## Diagnostics

Run Relay Health Check verifies core frontend/backend/state communication and reports optional integrations separately. Full Complete Dry Run resolves the current local pipeline without Story Model or image-generation calls. Recovery, logs, and danger-zone cleanup are grouped here rather than mixed into Configuration.

## Help

Every setting has a `?` control. On desktop, hover or focus it; on mobile, tap it. The tooltip explains the setting in place.
