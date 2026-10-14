# 0.5.1.2 staging validation — 2026-10-14

## Release scope

- Await the exact completed turn's Appearance refresh before the Relay-Planned Director/local compiler and before the non-Relay prompt Composer. Re-read current state instead of planning from a competing background snapshot.
- Keep Appearance disabled when selected, preserve settled-turn deduplication/outage handling, and keep diagnostic Dry Run free of Appearance writes and additional model calls.
- Treat explicitly full undress as replacement wardrobe, not an additive temporary trait beside an old shirt or trousers. Preserve partial exposure, owner separation and user-confirmed outfit locks.
- Reject clearly off-body garment placements from reusable current-appearance facts while retaining worn draping and body traits.
- Suppress synthetic Relay image rebindings during a new swipe's generation. Preserve historical swipes, unrelated messages and Continue's existing images; reject late terminal events from older generations.

## Preservation

- src/protocols.ts remains identical to both staging parents: Git blob 331557e6a7ef70180a2433976ab25f63d4be9502.
- Public and private retain their existing provider-specific source. The narrow production/test patch was compared across both baselines and is identical.
- The dirty historical checkout and unrelated test-copy work were not promoted wholesale.
- Package, manifest, source build identity, README and release assertions agree on 0.5.1.2 / 20261014-0.5.1.2. Both distributions were rebuilt from their own baselines.

## Automated evidence

Every package test gate was exercised on both candidates across the initial full run and the final continuation. Type-check, build, distribution checks and all runtime/mounted-DOM regression gates passed. The initial aggregate command stopped at an old build-date assertion; that assertion was updated to the release date, then smoke:release and the remaining smoke:hygiene/Story/Phone chain passed with exit code 0. No production assertion was removed.

The new Appearance turn-order fixture verifies delayed refresh blocking, fresh Composer/Director/compiler inputs, dressed → full undress → robe replacement, deduplication, Dry Run no-spend, outage preservation, cancellation preventing successor calls and late writes, owner isolation and manual locks.

The new mounted swipe fixture verifies removal of prior images, state/render races, matching-swipe deferral, completion, overlapping generations, Stop without a message ID and Continue preservation.

Existing gates include 46 Core Surfaces, XML/Plot Sparks recovery, Building Layout, lifecycle/cancellation, count/Booru/Reparse contracts, identity and prompt firebreaks, 184320 Illustrator normalization/runtime combinations plus 172 numeric/count boundaries, and 2304 phone interceptor/placement cases plus 9900 cadence/numeric cases. These are automated checks, not live-provider or device certification.

## Prior live evidence and boundaries

On the isolated test installation on 2026-10-13, an actual next swipe removed the prior image at generation start, kept it absent while the new response arrived, and finally mounted only the new swipe's image. A separate next-turn wardrobe transition refreshed the vault before composition, superseded the unclothed state with a tied robe/slippers and produced a visually checked robe image. Original test settings were restored.

The initial Gemini story response did not follow the controlled wardrobe instruction and is not counted as a wardrobe-test pass. The successful controlled transition used another configured story connection. No fresh Gemini, mobile-device, exhaustive live settings matrix or general image-anatomy certification is claimed for this publication.
