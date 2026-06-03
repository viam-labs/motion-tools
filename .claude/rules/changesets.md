---
paths:
  - '.changeset/**'
  - 'CHANGELOG.md'
---

# Changesets

Every PR that changes runtime behavior needs a changeset in `.changeset/`. The single package is `@viamrobotics/motion-tools`; see [CHANGELOG.md](../../CHANGELOG.md) for voice and existing `.changeset/*.md` files for format.

## Creating a Changeset

Run `pnpm changeset` — it prompts for a bump and writes `.changeset/<random-name>.md` with the right frontmatter.

## Bump Types

Bump types follow semver:

- `major` — breaking public API changes (rare; coordinate before merging).
- `minor` — additive features, new capabilities (`feat:` entries: new traits, hooks, settings, APIs).
- `patch` — bug fixes, perf, security, dependency bumps, internal refactors (`fix:`, `sec:`, `deps:` entries).

## Summary Voice

Summary is one imperative phrase matching the changelog voice. Examples:

- `Fix world state point cloud rendering and updating`
- `Add chunking metadata and support in world state hook`
- `sec: replace expr-eval with filtrex`
- `Consolidate \`Parent\` trait handling.`

## When to Skip

Skip a changeset only for changes that don't affect consumers of the package: CI config, test-only edits, docs-only edits, internal tooling.
