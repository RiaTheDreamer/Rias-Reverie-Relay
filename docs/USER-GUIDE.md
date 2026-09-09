# Reverie Relay User Guide

## Surfaces and Utilities

Open **Reverie Relay → Surfaces → Library** to enable individual Surface Utilities. The category toggle selects every Utility in that category; individual toggles remain available for finer control.

**View Exact Injected Prompt** is at the top of the Library. It resolves every enabled Surface and Narrative Utility together without sending anything to a model.

Presentation is global: choose Inline, Button, or Sparkling Button under Surface Defaults. Existing Relay-rendered Surfaces refresh when this setting changes. Narrative Utilities inherit this same choice.

## Character Phone

When Narrative Utilities and Character Phone are enabled, **Character Phone Apps** lets you select and order zero to eight default apps. Defaults occupy the earliest slots. The Story Model fills any remaining slots from the approved app catalog using story context. An empty selection is valid and lets the model choose all eight apps.

## Illustrations and media

Illustrations can be Relay-Planned, Model-Placed, or authored through the Inline Protocol. Image slots reserve their final aspect ratio while an image is queued, generating, completed, retried, or repaired, so images can resolve without shifting surrounding story text.

Use **Repair / Reinsert** only when Relay offers it for a preserved request. It reuses the exact slot identity and request details. Reparse and Rescan are available when a Surface needs structural recovery.

## Appearance Memory

Appearance Memory stores stable visual identity separately from current outfits and temporary visible state. You can edit saved tags directly, add alternate looks, or remove a memory. Changes update the panel immediately.

## Surface presets

Enable the desired global Surface definitions in Library, then save that collection under Presets. One collection may be the global default. A chat may bind another preset; removing the binding returns it to the global default. Custom Surface definitions remain globally available.

Presentation selects Inline, Button, or Sparkling Button. Inline has no top-level launcher. Both button modes start closed behind one centered launcher and retain internal state where the host preserves the DOM. Color selects Realistic or Lumiverse Primary without changing bracket-native semantic content. Legacy XML remains compatibility input: safely recoverable XML is normalized, while ambiguous structures retain source and show Reparse/Rescan instead of invented content. The Relationship Map inner design is unchanged. Dossier tabs switch panels without replacing its media node, Gallery images use full-frame fitting, and newly authored Album Covers require the actual release title.

Each of the 46 Surface Utilities and 13 Narrative Utilities includes a plain-language overview next to its toggle. `View Exact Injected Prompt` stays above the complete Utility list and resolves all enabled Utilities together without calling a model or provider.

Relay registers `reverie_surfaces`, `reverie_illustrator`, `reverie_narrative`, and `reverie_all` as real Lumiverse macros. A macro expands to its current enabled instructions when the preset is assembled; it is not a visible placeholder tag. Use automatic injection or a manual macro placement, not both.

Character Dossier, Location File, and Cast Introduction include **Send to Lorebook**. Relay creates or reuses a chat-bound Stage Archive, preserves other bound Lorebooks, adds the exact selected Surface with source provenance, and opens the host Lorebook drawer when that host tab is discoverable.

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
