# Distribution branding and promotion

- Private staging's display name is `Private Reverie`; its compact sidebar label is `Private`.
- Public staging's display name remains `Ria's Reverie Relay`; its compact sidebar label remains `Reverie`. Never carry private display branding into the public repository.
- Branding does not change install/drawer/action identifiers, tool names, Regex ownership, saved state, or user-edited protocols.
- Keep private branding changes separate from functional fixes when promoting private work to public. Restore the public display labels and branding assertions in the destination checkout; do not blindly copy private release metadata or version-only assertions.
- Before any public promotion, run `bun scripts/distribution-branding.mjs --target=public` against the candidate, then its build and release tests. Private candidates use `--target=private`. The automatic build check prefers the current branch's upstream remote over origin, because an isolated private worktree can have a public origin.
- This guard is a build/release check, not a server-side restriction on arbitrary Git pushes. Do not bypass it. Public staging must never be pushed from an unvalidated private-brand candidate.
