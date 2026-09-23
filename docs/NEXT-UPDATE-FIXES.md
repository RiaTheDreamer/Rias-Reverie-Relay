# Next Update Fixes

Living regression ledger for the update after `0.2.8.6.2`.

- Last audited: 2026-09-23
- Baseline: `staging` at `545b973`
- Target release: `0.2.8.6.3`
- Scope: record confirmed defects, candidate repairs, and validation evidence; automated and live evidence remain separate.

## Open

### NU-001 - Image placement remounts the whole message

**Symptoms**

- Prose flickers whenever a generated image is persisted.
- Open multi-image Surfaces close after every inserted image.
- Plot Sparks also returns to its default tab; Parallel Scene loses its open state.

**Confirmed mechanism**

Each sibling image has a request-scoped placement batch and independently reaches `updateMessage`. Lumiverse then replaces the full assistant-message DOM, recreating prose and transient `<details>`/tab state. Progressive in-place reveal works, but persistent write-back causes the remount regression.

**Required repair**

- Keep progressive per-slot image reveal.
- Coalesce durable placement writes per message/swipe, or avoid `updateMessage` for the active rendered message.
- Preserve open `<details>` and selected-tab state across any unavoidable remount.
- Replace the regression assertion that requires sibling images to have different placement batch keys with a behavioral transaction assertion.

**Implementation status — `0.2.8.6.3` candidate**

- Initial siblings now share one message/swipe placement key and successful results wait until every initial sibling is terminal before one durable write.
- Progressive in-place reveal remains request-local and does not wait for the durable transaction.
- Mounted disclosure and radio/checkbox state is retained by message/swipe and restored after the final host remount.
- Deterministic placement, streaming-layout, and lifecycle gates pass. Live Lumiverse observation remains separate.

**Acceptance evidence**

- Deterministic multi-image tests for prose-node stability, one durable message transaction, open-state retention, and selected-tab retention.
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

## Validation Rules

- Automated local gates and live Lumiverse checks must be reported separately.
- A focused smoke is not release proof; run the full repository gate before packaging or pushing.
- Update an item only with the commit and evidence that changed its status.
