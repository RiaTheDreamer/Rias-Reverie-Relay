# Reverie Relay

Reverie Relay is a Lumiverse extension for interactive story Surfaces, in-chat image generation, prose illustration, and visual continuity.

**Version:** `0.2.0`

## Getting started

1. Install the extension through Lumiverse using a release archive.
2. Open **Reverie Relay → Surfaces → Library** and choose the Surfaces and Narrative Utilities you want the Story Model to use.
3. Use **View Exact Injected Prompt** to inspect the complete enabled prompt before starting a chat.
4. Configure illustration, image, LoRA, and Appearance Memory settings from the Relay panel.

## What is included

- 46 configurable story Surfaces, with Inline, Button, and Sparkling Button presentation choices.
- Narrative Utilities, including Character Phone with optional ordered default apps.
- Relay and Regex-compatible rendering paths, recoverable image slots, and stable media layout while a response is streaming.
- Appearance Memory for durable visual identity, current outfit, and optional alternate looks.

## Building from source

This repository contains the complete source and compiled Lumiverse extension bundles. With Bun installed:

```powershell
bun install
bun run build
bun run test:public
```

All checks run locally. They do not call a provider, Story Model, Appearance Sidecar, or image-generation endpoint.

For usage details, see the [User Guide](docs/USER-GUIDE.md) and [Surface list](docs/SURFACES.md).
