---
paths:
  - '.changeset/**'
---

# PR Description Format

Follow the structure and tone used in this repository. PR descriptions are technical documents aimed at reviewers who already know the codebase — be precise, not verbose. Do not use em dashes. Use American English.

## Opening Paragraph

One to two sentences summarizing **what** the PR adds or changes and **why** it matters. Mention the user-facing capability, not implementation details.

```
Adds progressive/chunked delivery of large point clouds and point sets so they can be
streamed incrementally instead of sent as a single payload.
```

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

## Layer-by-Layer Breakdown

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

```markdown
### Go Draw API

- `AddEntity` detects `Chunks` metadata and creates a chunked entity.
- `UpdateEntity` appends data to it via `accumulateChunk`.
- `GetEntityChunk` reads a slice from disk, returns with a `done` flag.
```

## Why?

Include a **Why?** section when the PR involves non-obvious design decisions. Format each decision as a bold question followed by a paragraph answer.

```markdown
### Why?

**Why not use actual streaming for this?**

We want the frontend to acknowledge that it has received and finished processing
a chunk of data before receiving the next one. ...

**Why use the disk buffer?**

So I tested this with an actual PCD (~700 MB) that came from a production machine. ...
```

Skip this section for straightforward PRs where the "what" is self-explanatory.

## Testing

End with a **Testing** section listing which test suites were run and any new tests added.

```markdown
### Testing

Ran the `draw-client` and `snapshot` e2e tests.

There are two new tests specifically for drawing chunked data.
```

Name the specific test commands or e2e test names — don't just say "tests pass".

## Style Rules

- Use `###` (h3) for each section heading.
- Use GitHub-flavoured Markdown — backtick-fenced code, bullet lists, bold.
- Do **not** add a `## Summary` or `## Description` wrapper heading; the opening paragraph stands on its own.
- Do **not** include auto-generated changelogs, file lists, or diff stats — reviewers can see those in the Files tab.
- Keep the tone direct and technical. Write in first person when explaining rationale ("I tested this with..."). Use present tense for describing behaviour ("`AddEntity` detects...").
- When renaming or deprecating something, call out both the old and new names explicitly.
- If the PR depends on or stacks on another PR, note the base branch and link the parent PR in the opening paragraph.
