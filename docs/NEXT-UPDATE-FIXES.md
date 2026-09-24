# Next Update Fixes

Living regression ledger for the update after `0.2.8.6.2`.

- Last audited: 2026-09-23
- Baseline: `staging` at `545b973`
- Target release: `0.2.8.7.1`
- Scope: record confirmed defects, candidate repairs, and validation evidence; automated and live evidence remain separate.

## Open

### NU-001 - Image placement remounts the whole message

**Symptoms**

- Prose flickers whenever a generated image is persisted.
- Open multi-image Surfaces close after every inserted image.
- Plot Sparks also returns to its default tab; Parallel Scene loses its open state.

**Confirmed mechanism**

The first repair coalesced sibling placement into one final `updateMessage`, but the 2026-09-23 recording proves that one call is still destructive: the whole assistant body disappears at roughly 00:44 and returns around 01:05. Lumiverse emits `MESSAGE_EDITED` for every public `spindle.chat.updateMessage()` content mutation; `skipChunkRebuild` suppresses retrieval rebuilding only and does not suppress that UI event. The remaining final write therefore tears down the large mounted Surface tree while Lumiverse reconstructs it.

**Required repair**

- Keep progressive per-slot image reveal.
- Coalesce durable placement writes per message/swipe, or avoid `updateMessage` for the active rendered message.
- Preserve open `<details>` and selected-tab state across any unavoidable remount.
- Replace the regression assertion that requires sibling images to have different placement batch keys with a behavioral transaction assertion.

**Implementation status — post-`0.2.8.6.3` candidate**

- Initial siblings still share one message/swipe batch and wait until every initial sibling is terminal.
- The terminal batch now uses deterministic composition only as an anchor/ownership proof; it does not call `updateMessage`.
- Generated pixels are canonical in Relay's durable slot/completion archive and are projected into the immutable authored message by the render processor on every paint/reload.
- Completed archive rows participate in rendering after hot-state compaction, and the render-cache identity includes exact slot status/image identity so pending markup cannot survive a later host render.
- Progressive in-place reveal remains request-local. There is no automatic host-message remount at terminal insertion.
- Automated gates cover no-write terminal placement, completed-archive hydration, live-slot precedence, and prose preservation. Post-fix live Lumiverse observation remains separate.

**Acceptance evidence**

- Deterministic multi-image tests for prose-node stability, zero host content writes at terminal placement, completed-archive reload hydration, open-state retention, and selected-tab retention.
- Live Lumiverse observation with Plot Sparks and Parallel Scene while every image resolves; no prose flash and no Surface closure.

### NU-002 - Appearance Vault mode controls leak across effective Off/strength settings

**Symptoms**

- Illustrator-specific **Off** can still apply Vault facts when the global Vault remains enabled.
- Relay-Planned can retain Vault facts compiled through its Director path even when the effective setting is Off.
- Low/Medium/Strong overrides do not reliably govern final fact selection in both Model-Placed and Relay-Planned modes.

**Confirmed mechanism**

The UI persists the Illustrator override, but Relay-Planned subject collection and final generation do not consistently use the same effective enable/strength value. Final generation can fall back to global Vault strength instead of the Illustrator override.

**Required repair**

- Resolve one effective Appearance Vault policy for the active Illustrator mode.
- Apply that policy at Director input, local compilation, and final generation.
- Ensure Off removes Vault facts rather than merely hiding the setting from one stage.

**Implementation status — `0.2.8.6.3` candidate**

- One effective Illustrator Appearance policy now resolves explicit Off/Low/Medium/Strong against the global setting.
- Relay-Planned Director subject state, Appearance Sidecar activity, identity fallback, selection/projection, and final generation use that same policy.
- Model-Placed and Relay-Planned automated matrices cover global Off/Strong plus explicit Off/Low/Medium/Strong, including explicit Strong over global Off.
- Explicit current-scene facts retain authority through the existing selection/projection layer. Live provider/Lumiverse validation remains separate.

**Acceptance evidence**

- Model-Placed and Relay-Planned matrix for global Off/On and Illustrator Off/Low/Medium/Strong.
- Assertions cover both Director/Story-Model input and final provider prompt composition.
- Explicit scene facts continue to override stale Vault facts.

### NU-003 - Complete World body leaks raw when `[/WORLD]` is omitted

**Observed fixture**

The 2026-09-23 Incheon archery response emitted a valid `[WORLD|...]` header and complete `[world_media]`, `[world_detail]`, and `[world_context]` fields, but omitted the final `[/WORLD]`. The generated image was successfully placed inside `[world_media]`; the Setting the Scene Surface itself remained raw.

**Confirmed mechanism**

- The canonical Regex correctly requires `[/WORLD]`.
- `normalizeWorldMarkup` only examines an owner range that already contains `[/WORLD]`.
- Its current bounded repair handles one swapped inner closer, not a missing root closer.
- A deterministic reproduction remains unchanged after normalization, leaks `[WORLD|...]`, and does not render "Setting the Scene."

**Required repair**

- Add fail-closed recovery for exactly one World opener followed by the complete canonical inner shell when only the root closer is missing.
- Run that repair only when completion is authoritative (or at a proven owner boundary), so streaming content is not closed early.
- Accept both pending image-control markup and resolved Relay image markup inside `[world_media]` without changing either.
- Do not consume ambiguous, nested, partial, or multiply-owned World payloads.

**Implementation status — `0.2.8.6.3` candidate (2026-09-23)**

- Added bounded recovery at a proven following Narrative-owner boundary; end-of-input remains untouched because it may still be streaming.
- Requires exactly one unmatched World root, one of every canonical inner field pair, non-empty context values, and known pending or resolved Relay media.
- Added three-presentation coverage for the reported World-to-Plot-Sparks shape plus canonical, streaming, ambiguous, multiply-owned, pending-media, and resolved-media cases.
- Focused Narrative/streaming gates and the full `bun run test` repository gate pass. Live Lumiverse validation has not been run.

**Acceptance evidence**

- All three Narrative Regex presentations render the reported missing-root fixture without raw brackets or a repair card.
- Canonical World remains byte-identical.
- Incomplete streaming World remains untouched.
- Ambiguous World fails closed and cannot poison valid sibling Surfaces.
- Focused Narrative gates and full `bun run test` pass.

### NU-004 - Hybrid closing delimiters break otherwise valid Surfaces

**Observed fixture**

The 2026-09-23 Mokdong response emitted a complete Setting the Scene owner and canonical `[/WORLD]`, but opened `[world_detail]` and closed it as `</world_detail]`. The strict World renderer correctly rejected the malformed child closer, leaving the World scaffold raw.

**Confirmed mechanism**

- Core bracket Surfaces already had deterministic hybrid-closer repair, but it lived only in the Core bracket bridge.
- Narrative Utilities bypassed that bridge and relied on one-off normalizers for previously observed World/Phone failures.
- The new fixture therefore failed before the World Regex despite belonging to the same lexical error class already handled elsewhere.

**Candidate repair**

- Added one shared registered-Surface lexical normalizer for `[field]... </field]` and `[field]... [/field>` contamination.
- Core Surfaces resolve their allowed tags from each registered Surface grammar; Narrative Utilities resolve tags from the shipped model-facing contracts and cache the registry.
- Repair requires a registered tag, a matching bracket opener at the stack top, and an active registered owner. Unknown tags, XML-owned elements, crossed nesting, and prose outside an owner remain byte-identical.
- The strict presentation Regexes remain unchanged; only canonical bracket markup reaches them.

**Acceptance evidence**

- 1,580 deterministic closer mutations pass across all 46 Core Surface fixtures.
- 248 deterministic closer mutations pass across 124 registered Narrative contract tags and all 13 Utilities.
- The exact `[world_detail]... </world_detail]` World fixture renders in all three Narrative presentations without raw `[WORLD|...]` markup.
- Full `bun run test` passes, including build, release, and source-hygiene gates. Live Lumiverse validation has not been run.

**Scope boundary**

`[scenecard]` is not in the current registered Core or Narrative inventories and remains intentionally unsupported. Adding it would be a separate Surface contract decision, not structural repair.

### NU-005 - Presentation modes do not govern every shipped Surface

**Symptoms**

- Inline and Button work across the Core/App Surface inventory but not across most previously labeled Narrative Surfaces.
- Setting the Scene and nine sibling layouts remain closed sparkling launchers in every mode.
- Plot Sparks and Dramatic Cutaway are permanently sparkling; Inline can hide a launch control without reliably opening its `<details>` root, making the Surface disappear.

**Confirmed mechanism**

- Relay shipped one global presentation selector but retained two implementation authorities: `surfaceDefaultShellMode` and `narrativeDlcVariant`.
- Eleven of the thirteen Narrative replacement sets are byte-identical across Inline, Button, and Sparkling Button. Only Character Phone and part of Archive Entry contain meaningful variant differences.
- Plot Sparks and Dramatic Cutaway are appended from fixed packs outside that variant set.

**Implementation status — candidate**

- All 59 shipped Surfaces now derive from the same `SurfaceShellMode` authority.
- A final outer-shell adapter applies Inline, Button, or Sparkling Button where the historical packs require normalization without rewriting their internal design.
- Inline roots are explicitly open with the launcher hidden; Button roots start closed with launcher spark decoration suppressed; Sparkling Button roots start closed with their approved animation intact.
- Old persisted `narrativeDlcVariant` values no longer override the global Surface choice during configuration normalization.
- Glass Button is a first-class fourth launcher presentation. App and UI body styling is independently selected as Realistic, Lumiverse Primary, or Glass Mode through four complete 138-script Glass color authorities.
- Narrative Glass remains a complete 56-active-script authority covering Character Phone, Plot Sparks, and Dramatic Cutaway; it does not fall back to Sparkling/Plain at runtime.

**Acceptance evidence**

- All 13 Surfaces from the second authority path render canonical fixtures in all four modes (52 presentation cases), including Character Phone, Dramatic Cutaway, Plot Sparks, Setting the Scene, and Archive Entry.
- The first authority path covers all 46 remaining shipped Surfaces across all four modes, renderer modes, and color modes.
- The dedicated Glass gate proves 46 + 13 = all 59 shipped Surfaces with no Sparkling runtime fallback.

## Validation Rules

- Automated local gates and live Lumiverse checks must be reported separately.
- A focused smoke is not release proof; run the full repository gate before packaging or pushing.
- Update an item only with the commit and evidence that changed its status.
