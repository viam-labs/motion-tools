---
paths:
  - '.changeset/**'
---

# PR Description — motion-tools layers

Repo-specific additions to the shared `pr-description.md`. Follow that file for the opening paragraph, output format, the Why? and Testing sections, and style rules (no em dashes, American English). This file replaces its **Layer-by-Layer Breakdown** with this repo's actual architecture and adds the stacked-PR convention.

## Layer-by-Layer Breakdown (this repo)

Break changes into sections that match the architecture layers they touch. Use the exact heading names below (singular or plural depending on scope). Omit any section with no changes.

| Heading           | What it covers                                                      |
| ----------------- | ------------------------------------------------------------------- |
| **Proto(s)**      | New/changed messages, fields, RPCs, reserved tags in `.proto` files |
| **Go Draw API**   | Changes in the `draw/` package (server-side drawing logic)          |
| **Go Client API** | Changes in `client/` (the Go client library consumers use)          |
| **Frontend**      | Changes in `src/` (Svelte/Threlte/Koota/TypeScript)                 |

Within each section:

- Use a bulleted list.
- Each bullet starts with the symbol being changed (function, field, struct, file) in backticks or bold, then describes **what** changed.
- Be specific: name the new field, the new function, the new RPC — don't just say "updated metadata".
- Keep bullets to one or two sentences.

## Stacked PRs

When a PR is part of a multi-PR stack, follow the opening paragraph with a `### Stack` section that lists every PR in the chain from bottom (base) to top (tip). This lets a reviewer who lands in the middle of the stack navigate to neighboring PRs without hunting through GitHub.

For each entry, link the PR by number, give a short phrase naming the scope, and mark the current PR in bold (without a self-link). Example:

```markdown
### Stack

1. Shared ECS traits and helpers (#735)
2. Details refactor (#736)
3. Component tweaks (#737)
4. **This PR**: Gizmos plugin
5. Gizmos plugin docs (#739)
```

The opening paragraph should still name the immediate parent PR; the `### Stack` block exists so reviewers can jump anywhere in the chain.
