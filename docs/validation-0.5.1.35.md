# 0.5.1.35 public release validation

This public release includes the current illustration, Surface and Core phone synchronization fixes. The experimental Story workspace is removed: navigation, views, event analysis, backfill, actions, prompt registration, knowledge injection and unused authoring functions. Legacy state readers preserve saved phone entries and media. Phone, Story Model Planned and Storyboard framing remain available. Stale private settings cannot enable removed workers.

Public branding, the `reverie_relay` installation identity, existing drawer/action identifiers, and the Core/Narrative Regex package names and paths are preserved. All 2,761 packaged-script label assertions pass.

The full public `bun run test` command exited 0 on the unpublished 0.5.1.34 promotion baseline, as recorded in [the baseline validation](validation-0.5.1.34.md). The only subsequent production change is the Surface header enabled-count correction, plus version metadata: Narratives counts its enabled Utilities and Apps & UIs counts its selected modules, instead of adding both categories.

The production mounted settings regression first failed with `5 Enabled` versus `2 Enabled`. It now passes across initial mount, chat switches, cold reload, stale responses, optimistic/acknowledged saves, partial selection and all-off, without provider calls.

On the final 0.5.1.35 candidate, typecheck, public build, mounted frontend boot, Surface preference persistence, Narrative bracket gate, post-hotfix audit, UX/version assertions, release metadata/authority hashes, distribution branding, source/bundle Story exclusion, Regex label coverage and source hygiene all passed. No live public host or physical phone was changed or tested during this promotion.
