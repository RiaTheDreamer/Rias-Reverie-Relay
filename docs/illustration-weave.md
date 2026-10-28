# Illustration planning controls

Open **Illustrations → Advanced Illustrator Controls** for the feature switches. Scene Flow and Dreamcut are available under **Framing Mode**. Existing saved protocol edits are preserved.

| Control | Purpose | Default |
| --- | --- | --- |
| Sightline Guard | Widens a conflicting crop when a supported action requires hands, knees or feet to be visible. Keeps actor, handedness, contact and prop ownership. | On |
| Quickweave | Compact one-pass Relay planning with less auxiliary history and no automatic plan/count repair calls. Missing images are reported as shortfalls. | Off |
| Portrait Insight | Uses the selected vision-capable illustration Sidecar to read missing stable hair, eye or mark traits from a character avatar. | Off |
| Opening Frame | Adds one source-grounded establishing image above the first paragraph, separately from the requested inline count. | Off |
| Scene Flow | Chooses Scene Snapshot, Blocking Fidelity or Dreamcut separately for each image. | Optional framing mode |
| Dreamcut | Uses an exact source quotation for a detail, object, environment, reflection or silhouette cutaway. | Optional framing mode |

Sightline Guard uses a conservative set of English camera/action cues. It is not a general scene-understanding or anatomy checker. It does not rewrite who performs the action. Char only and Persona POV remain fixed constraints under adaptive framing.

Quickweave preserves mandatory Appearance setup and the configured full-update cadence. It makes one planning attempt; malformed or missing shots do not trigger hidden repair spend. Its latency benefit has not been established by a matched timing study.

Portrait Insight requires a usable native character identity, avatar and vision-capable Sidecar. Suggestions complement missing categories and are used only for rendering; canonical Appearance is not overwritten. Existing category facts take priority, and manual exclusions suppress suggestions for that owner. Results are cached by avatar, model and established Appearance. Missing images or unsupported providers are nonfatal. Successful vision access may incur a provider call when the cache changes.

Opening Frame waits for its following source paragraph when Story Model output is streaming. One requested inline image plus an opening means two outputs. A legitimate response decline does not require a cover. Normal Relay can use its existing single bounded retry for a missing opening; Quickweave reports the omission without retrying. Safe partial shots remain usable. No invented cover is generated to satisfy the count.

Dreamcut requires source-established focus evidence. Object/environment-only frames have zero people and do not receive a full-character Appearance append. Reflections, silhouettes and body details still count their source-established subject. Unsupported Story Model focus metadata falls back to ordinary eligible framing; ambiguous Relay plans require validation. Scene Flow and Dreamcut remain provisional: completed slots alone do not establish visual fidelity.

## Prism Lab

Prism Lab is a local comparison tool, available through `bun run prism:report manifest.json report.html`. It does not generate images or switch providers. Supply two original local PNG/JPEG/WebP images and a manifest following `src/prismLab.ts`; `scripts/prism-lab-smoke.ts` includes a minimal fixture.

Record the frozen source, declared comparison boundary, distinct run/image IDs, prompts and actual outgoing provider/model, ordered LoRAs and weights, fixed seed, steps, CFG, dimensions, sampler, scheduler and negative prompt. All generation parameters must match except the declared boundary. Unknown/random seeds, duplicate evidence, undeclared differences and unsafe file paths are rejected. The CLI checks that both images exist.

Open the generated HTML and independently score actor count, posture, hands/contact, prop ownership, clothing, framing and anatomy. Unscored and not applicable are separate choices. Export review JSON to retain scores, notes, treatment mapping and actual parameters. Treatments start hidden, but previously seeing an image limits blinding. A controlled report is a measurement aid, not proof that a feature caused an improvement.
