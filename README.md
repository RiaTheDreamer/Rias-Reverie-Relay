# Reverie Relay

Ria's Reverie Relay is a Lumiverse extension for interactive story Surfaces, in-chat image generation, illustration planning, Appearance Memory and persistent in-world phones.

**Version:** `0.5.1.35`

All 48 Core app Surfaces sync from saved story messages into their matching phone apps, preserving authored content, media and app interactions. Open apps refresh when their source changes, and historical records remain available. Narrative Surfaces stay outside the phone.

Both Relay Planned and Story Model Planned support the illustration framing modes and scene-planning controls, including Sightline Guard, Blocking Fidelity, Scene Flow, Dreamcut and optional cover cards. Prompt and anatomy fidelity still depend on the selected image model and LoRAs. Instant analysis/generation, progressive status cards, cancellation, image history and settings persistence include the latest fixes.

This public build excludes the experimental Story workspace and its event-analysis, backfill and knowledge-injection tools. Reverie Phone, Story Model Planned illustrations, Storyboard framing and Narrative Surfaces remain available. Existing saved messages, media and legacy phone records are preserved.

Install or update from this repository through Lumiverse's extension manager. This build retains the public extension identity `reverie_relay`.

- [User guide](docs/USER-GUIDE.md)
- [Illustration controls](docs/illustration-weave.md)
- [Blocking Fidelity experiment](docs/blocking-fidelity-experiment.md)
- [Blocking Fidelity test limits](docs/blocking-fidelity-validation.md)
- [Release validation](docs/validation-0.5.1.35.md)

For local development, run `bun install --frozen-lockfile`, `bun run build`, and `bun run test`. Public branding and Story exclusion are release gates.
