# Vendored Surface icons

- Lucide vectors: https://github.com/lucide-icons/lucide — ISC License (including upstream Feather-derived notices in that repository).
- Relationship Map Spider Web: https://www.svgrepo.com/svg/55672/spider-web — CC0, as stated on the SVG Repo source page.

The individual source page for each stable Surface mapping is recorded in `SURFACE_ICON_REGISTRY` in `surfaceIcons.ts`. Building Layout uses the user-supplied Lucide Blocks vector in both the native renderer and Narrative Utilities. The SVGs are sanitized and bundled into Relay; no icon is fetched at runtime.
