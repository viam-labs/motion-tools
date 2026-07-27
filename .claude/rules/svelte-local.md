---
paths:
  - '**/*.svelte'
  - '**/*.svelte.ts'
  - '**/*.svelte.js'
---

# Svelte 5 — motion-tools specifics

Repo-specific Svelte patterns that extend the shared `svelte.md`. General Svelte 5 conventions (runes, typed `Props`, `$state.raw`, context providers with `Symbol` keys, accessibility, conditional-class styling) live in `svelte.md`; this file covers what is unique to this repo: Koota ECS, Threlte on-demand rendering, and the Svelte MCP workflow.

## State Management with Koota ECS

This project uses [Koota](https://github.com/pmndrs/koota) (Entity Component System) for shared scene state — not Svelte stores or TanStack Query.

- **Traits** are defined in `src/lib/ecs/traits.ts`. Marker traits return `() => true`; data traits return a default value factory.
- **World** is injected via Svelte context: call `provideWorld()` at the root, `useWorld()` to consume.
- **Reactive queries** via `useQuery` from `$lib/ecs`: `const meshEntities = useQuery(traits.Mesh)`
- **Trait access** on a specific entity via `useTrait` from `$lib/ecs`: `const pose = useTrait(entity, traits.Pose)`
- **Relations** (`ChildOf`, `SubEntityLink`) are in `src/lib/ecs/relations.ts`.

Default to local component state (`$state`, `$derived`) for UI-only values. Use Koota ECS for shared scene/entity data. Use Svelte context for shared service/config objects.

## 3D Rendering with Threlte

This project renders a 3D scene using [Threlte](https://threlte.xyz/llms-full.txt) (Svelte bindings for Three.js). All 3D components live inside a Threlte `<Canvas>` context. Custom Three.js extensions live in `src/lib/three/` and are mounted with `<T is={obj} />`.

**Rendering is on-demand, not continuous.** Call `invalidate()` (from `useThrelte()`) after mutating scene objects to trigger a re-render. Use `useTask` for continuous per-frame updates — never `$effect`, which does not participate in Threlte's task scheduler.

- **`$effect.pre`** runs before the DOM updates (and before child effects in the same flush).
- **`$effect`** runs after the DOM updates.

The question to ask when choosing `$effect` vs `$effect.pre` is "does anything downstream in the same flush need to read this before render/DOM-commit?" If yes, use `.pre`; if it's a pure side-effect with nothing observing the result inside the same flush, plain `$effect` is correct.

**`dispose={false}`** — pass when you manage the Three.js object's lifecycle yourself (pooled or shared instances).

**BVH / raycasting** — opt out objects that don't need hit-testing: `bvh={{ enabled: false }}` or `raycast={() => null}` for display-only geometry.

## Svelte MCP Server

Use the Svelte MCP server for authoritative Svelte 5 / SvelteKit docs and validation. Delegate to the `svelte-file-editor` agent when creating or editing `.svelte`, `.svelte.ts`, or `.svelte.js` files — it handles MCP calls efficiently.

- `list-sections` — call FIRST on any Svelte/SvelteKit question to discover relevant docs (returns titles, use_cases, paths).
- `get-documentation` — fetch every section whose `use_cases` matches the task. Batch multiple sections in one call.
- `svelte-autofixer` — run on any Svelte code you write before handing it to the user. Keep iterating until it returns no issues or suggestions.
- `playground-link` — only offer after code is complete AND the user confirms. NEVER call it for code written to files in the project.
