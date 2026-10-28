# 0.5.1.34 public promotion baseline validation (unpublished)

This baseline includes illustration, Surface and phone fixes while preserving the public `reverie_relay` installation identity and saved phone data.

Mounted frontend checks verify seven primary tabs, safe handling of stale saved tab preferences, and access to Phone and Storyboard framing. Backend checks verify legacy phone state migration. Distribution checks cover the source and compiled bundles.

Phone coverage includes 48 production app setup routes, 68 mocked image outputs, 96 mounted app views and 310 saved records. Existing interactive tests cover the 24 app renderers with composers. No providers are called by synchronization or migration tests. Prior isolated live checks covered every app opening and representative phone interactions; this public package has not been installed into a live public host during release preparation.

Build, typecheck and focused distribution checks passed. The complete `bun run test` command exited 0, including source/bundle distribution checks, the mounted drawer, release hashes, source hygiene, legacy phone migration and all 2,761 public Regex label assertions. The log is retained locally as `release-05134-public-validated-suite.log`. This baseline was not published; the 0.5.1.35 follow-up adds the family-specific enabled badge and matching version metadata.
