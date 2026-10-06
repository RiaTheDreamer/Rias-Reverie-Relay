<p align="center">
  <img src="assets/reverie-relay-icon-128.png" alt="Reverie Relay" width="96" height="96">
</p>

# Reverie Relay

**Interactive story surfaces, in-chat illustrations, and visual continuity for Lumiverse.**

Reverie brings your roleplay's messages, memories, documents, and visual moments into the chat. A phone conversation can become a phone interface; a diary entry can become a readable keepsake; a story beat can have its own illustration.

**Version:** `0.5.0`

This is a preview build. Use the `main` branch for the public release; staging builds may change before release.

## What you can do

- **Bring story artifacts to life.** Render messaging apps, social posts, diaries, news, photos, character records, and other interactive Surfaces inside your chat.
- **Carry the story into a usable phone.** Open phone-local Core apps, read and respond to supported conversations or comments, and keep app activity alongside the roleplay without requiring an inline Surface first.
- **Illustrate your story.** Let Relay plan illustrated moments, or let the Story Model author image requests alongside the prose.
- **Keep visual references.** Appearance Memory separates established character traits from current outfits and temporary visual changes, with editable saved references.
- **Control the presentation.** Choose which Utilities are enabled, customize their presentation, and save Surface presets for different chats.
- **Review and manage images.** Follow generation jobs in Slots, inspect prompts, regenerate images, and browse saved versions. Live previews are available when supported by the image provider.

See the [Surface overview](docs/SURFACES.md) and [User Guide](docs/USER-GUIDE.md) for more.

## Requirements

- **Lumiverse 1.1.6 or newer**, with access to its extension manager.
- A configured text-model connection.
- A working Lumiverse ImageGen connection if you want generated images.

Reverie uses your configured model and image connections. Model behavior, generation speed, image quality, and provider charges depend on those connections.

## Installation

1. Open Lumiverse's extension manager and install from this GitHub repository:

   ```text
   https://github.com/RiaTheDreamer/Rias-Reverie-Relay
   ```

2. Select `main` for the public release and review the requested permissions.
3. Enable the extension and open **Reverie Relay** in the sidebar.
4. Enable the Surface Utilities you want under **Surfaces → Library**.
5. For illustrations, configure your image connection and choose an illustration mode.

Start with a few Utilities and add more as you discover what fits your story. The Library's prompt preview lets you inspect enabled instructions without calling a model.

## Repository layout

| Folder | Purpose |
| --- | --- |
| `assets` | Extension icons and branding |
| `dist` | Compiled runtime loaded by Lumiverse |
| `docs` | User guides and Surface reference |
| `regex-packs/Core` | Authorized Regex for apps, documents, and media |
| `regex-packs/Narrative` | Authorized Regex for story utilities |
| `scripts` | Build tools and regression checks |
| `src` | Extension source code |

Individual Regex names identify their category, Surface, component, and presentation; for example, `Core - Instagram - Carousel Slide - Inline`.

## Help and feedback

The [User Guide](docs/USER-GUIDE.md) covers setup, image controls, Appearance Memory, and diagnostics. Settings also include contextual help controls.

Found a problem? [Open an issue](https://github.com/RiaTheDreamer/Rias-Reverie-Relay/issues) with the extension version, steps to reproduce, expected behavior, and a sanitized screenshot or error message. Please do not post API keys, private chat history, or unredacted diagnostics.

---

Created by **Ria** for Lumiverse.
