# Reverie Relay User Guide

## Getting started

Install the extension through Lumiverse's extension manager, enable it, and open
Reverie Relay from the sidebar. You need a working text-model connection; images
also need a configured Lumiverse ImageGen connection.

For installation instructions, see the [README](../README.md).

## Choose your Surfaces

Open **Surfaces → Library** and enable the Utilities you want in your story.
Category controls select a group; individual controls let you refine the selection.

**View Exact Injected Prompt** previews the enabled instructions without calling
a model. Enabling more Utilities adds more instructions to the model's context.

Surface Defaults controls presentation. Choose inline display or a launcher
button, then select the available body styling. Presets let you save selections
for different chats.

See the [Surface overview](SURFACES.md) for examples.

## Narrative Utilities

Narrative Utilities support story-oriented artifacts such as character records,
locations, relationships, and alternate perspectives. Enable only the Utilities
you want the model to author.

When Character Phone is enabled, its app controls let you choose and order
default apps. The Story Model can fill remaining app slots using story context.

## Illustrations

Use Relay planning to have the extension select illustrated moments, or
Story Model-authored requests to place illustrations alongside the story prose.
The available controls depend on the selected mode.

Configure the image connection and review automatic generation settings before
starting. Generated results depend on your configured models and their settings;
Appearance Memory and framing instructions provide guidance, not a guarantee.

## Image controls and Slots

The Slots view lets you inspect discovered requests and follow generation jobs.

- **Generation Details** shows saved prompt and generation information.
- **Regenerate** creates another version of an image.
- **History** lets you inspect saved versions.
- **Repair / Reinsert**, when offered, reuses a preserved slot rather than asking
  for a new story response.
- **Reparse** revisits the request; **Rescan** discovers requests again.

Status Cards show progress at the image's intended position. Live preview depends
on the provider's capabilities; unsupported providers still return final images.

## Appearance Memory

Appearance Memory keeps stable identity traits separate from current outfits and
temporary visible state. Review and edit saved references when a character's
appearance changes or an incorrect detail is captured.

Do not assume that a saved fact belongs to every character in a scene. Keep
references attached to the correct character.

## Troubleshooting

1. Confirm the relevant Utility or illustration mode is enabled.
2. Check the configured text and image connections.
3. Inspect the affected slot's status and Generation Details.
4. Use **Run Relay Health Check** for frontend/backend communication and state
   diagnostics.
5. Use **Full Complete Dry Run** to inspect local pipeline resolution without
   calling the Story Model or image provider.

A malformed Surface may need inspection, Reparse, or Rescan. Preserve the original
message before making manual edits.

For feedback, include the extension version, reproduction steps, and a sanitized
screenshot or error. Never share credentials, private chat content, or unredacted
diagnostic exports.
