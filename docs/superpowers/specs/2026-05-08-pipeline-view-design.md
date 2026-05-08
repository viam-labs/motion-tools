# Pipeline View — Design

**Status:** Draft
**Date:** 2026-05-08
**Author:** nick.hehr@viam.com
**Branch:** `feat/pipeline-view`

## Purpose

The visualization app currently renders every camera point cloud, every vision-service object cloud, and every framed component in one shared scene with no notion of how they relate. There is no way to trace data from a source camera through transforms and joins to a final segmenter output, and no way to compare the output of two stages of the same pipeline against each other.

This feature adds a **Pipeline view** at `/pipeline` that:

- Auto-derives the perception pipeline from the machine config (with a manual override escape hatch).
- Renders the pipeline as a DAG in a left-pane graph panel.
- "Spotlights" the selected stage (or stages) in the existing 3D scene, hiding non-active stages.
- Shows 2D outputs (images, detections, classifications) in a right-pane preview when the active stage is non-3D.
- Tints each active stage in compare mode so multi-stage overlays are visually distinct.

The user value: identify which stage of a perception pipeline is misbehaving, with the source-to-output relationship made visible, so config tuning has a fast feedback loop against a live machine.

## Goals

- **Live monitor flavored.** Stages re-render against fresh data on the existing refresh cadence; a config edit on the live machine flows through.
- **No new "pipeline file" to author.** Auto-derivation from machine config is the default; users only touch override settings when the auto-derivation can't see something.
- **Reuse the existing canvas, ECS world, hooks, and PCD worker.** Pipeline view is a new route, not a fork of the app.
- **Minimal change surface in shared code.** The only modification to existing hooks is an optional resource filter — no breaking changes for the main app.
- **All four output kinds in v1:** point clouds, segmenter object clouds, 2D images (multi-named), detections / classifications.

## Non-Goals

- **Editing machine config from the pipeline view.** Config remains a Viam-platform concern; pipeline view is read-and-visualize.
- **Server-side pipeline graph.** Derivation is purely client-side; no Connect-RPC additions for v1.
- **`getPipelineMetadata` DoCommand convention.** Worthwhile follow-up for custom modules but not v1.
- **Multi-part pipelines spanning machines.** A pipeline lives within one part.
- **Per-stage refresh rates.** Existing `RefreshRates` settings apply to all stages of a kind. Per-stage cadence is a follow-up.
- **Snapshot-mode pipeline replay.** The existing `/snapshot` route handles frozen scenes; pipeline view is live.
- **Frame-system `transformPCD` alignment.** Existing entities are placed via parent frames already; revisit only if compare-mode alignment surfaces problems in practice.
- **Replacing or modifying the main app's UX.** Pipeline view is opt-in via a separate route.

## Decisions

| # | Decision | Rationale |
|---|---|---|
| P1 | New route at `/pipeline`; trimmed shell (`Settings` + `RefreshRate` overlays kept; tree, dashboard, XR, etc. dropped) | Focused UX for a focused use case; main app unchanged |
| P2 | Auto-derive pipeline graph from machine config + manual override (localStorage per `partID`) | Common case is free; escape hatch for custom modules |
| P3 | Edges discovered by attribute-**value** matching against known resource names (not by attribute-key heuristics) | Robust to varied attribute naming (`src`, `camera`, `cameras`, `service`, `detector`, `vision`, etc.); custom modules covered automatically |
| P4 | Output kinds discovered via runtime `getProperties()` (cached via existing TanStack pattern), not from model-name guessing | Authoritative; aligns with how `usePointclouds` / `usePointcloudObjects` already gate fetching |
| P5 | Spotlight scene paradigm (one shared `<Canvas>`) — graph picks active stages; non-active hidden via `Invisible` trait | Reuses existing entity renderer; no multi-canvas complexity |
| P6 | Per-stage color tint via new `PipelineTint` trait + header toggle to restore native RGB | Compare mode legibility; user-controllable when colors themselves matter |
| P7 | 2D preview in a right-pane `StagePreview2D`, mounted only when the active set contains a 2D-only output | Doesn't take space when not needed |
| P8 | 2D image stages use `getImages()` (multi-named-image) with stream fallback when supported | Aligns with current camera API; reuses existing `Camera.svelte` stream logic where applicable |
| P9 | Optional `filter` parameter added to `providePointclouds` / `providePointcloudObjects`; defaults to undefined | Pipeline route only fetches stages it shows; main app behavior unchanged |
| P10 | `usePipeline` Svelte context owns graph, active set, status, tint, preview-2D-stage; both graph panel and scene read from it | Single source of truth; predictable reactivity |
| P11 | Cycle detection drops the back-edge with a warning on the offending node | Pipeline view stays usable even with broken configs |
| P12 | All persistence (overrides, preview pane width, native-RGB toggle) keyed by `partID` in `localStorage` | Per-machine state without backend changes |

## Architecture

### Route shape

```
/pipeline
├─ providers shell: provideWorld, provideSettings, provideEnvironment,
│                   providePartConfig, providePipeline
├─ <Canvas renderMode="on-demand">
│   ├─ <Scene>           (grid, camera controls, environment lights — existing)
│   └─ <Entities />      (ECS-driven entity rendering — existing)
└─ overlays
    ├─ <PipelineGraph>   (left, ~280px, resizable; new)
    ├─ <StagePreview2D>  (right; mounts when preview2D !== undefined; new)
    ├─ <RefreshRate>     (existing component)
    └─ <Settings>        (existing component, with new "Pipeline overrides" tab)
```

The page lives at `src/routes/pipeline/+page.svelte` and is a composition-only file. All meaningful code is library code under `src/lib/pipeline/`.

### Module map

```
src/lib/pipeline/
  types.ts                       # Stage, Edge, StageKind, StageOutput, PipelineGraph, RGB
  derive.ts                      # buildGraph(config: Struct, properties: PropertiesMap): PipelineGraph
  override.ts                    # mergeOverrides(graph, overrides): PipelineGraph
  tint.ts                        # tintForStageId(id: string): RGB
  usePipeline.svelte.ts          # context provider: graph, active, preview2D, tint, status, solo/toggle/clear
  PipelineGraph.svelte           # left-pane DAG renderer (FloatingPanel-style; resizable)
  StageNode.svelte               # one node: icon, label, status dot, tint chip, eye toggle
  EdgeLayer.svelte               # SVG edges between StageNodes (computed from layout)
  StagePreview2D.svelte          # right-pane image / detection / classification renderer
  PipelineOverrides.svelte       # modal/tab for overrides (visibility, outputs, manual edges)

src/lib/pipeline/__tests__/
  derive.spec.ts
  override.spec.ts
  tint.spec.ts

src/routes/pipeline/
  +page.svelte                   # composition only
  +page.ts                       # part selection from URL params

src/lib/hooks/
  usePointclouds.svelte.ts       # MODIFIED — accept optional filter
  usePointcloudObjects.svelte.ts # MODIFIED — accept optional filter
```

### Component responsibilities

**`derive.ts`** — Pure function from `(config: Struct, properties: PropertiesMap) → PipelineGraph`.

1. Collect `resourceNames` from `config.components[].name ∪ config.services[].name`.
2. For each component / service whose API is `camera` or `vision`, build a candidate `Stage`. Set `outputs` from the cached `properties` map: cameras → `pointcloud` iff `supportsPcd`, `image` iff `mimeTypes.length > 0`; vision services → union of `{detections, classifications, objects}` flagged by `getProperties`.
3. Stages with no relevant outputs are dropped.
4. For each candidate, recursively walk its `attributes` Struct. Every string-valued leaf and every string array element is checked against `resourceNames`. Each match (other than self) yields a candidate edge `match → candidate`. Dedupe.
5. Topologically sort; if cyclic, drop the latest-discovered back-edge and append a warning.
6. Return `{ stages: Stage[], edges: Edge[], warnings: Warning[] }`.

**`override.ts`** — Merges user overrides into the auto-derived graph:

```ts
interface Overrides {
  hidden: Set<StageId>                      // exclude from graph entirely
  outputsByStage: Map<StageId, StageOutput[]>  // pin outputs (replace discovered)
  extraEdges: Edge[]                        // user-added edges
}
```

Validates that referenced stage ids still exist in the derived graph and silently drops stale entries (the override-panel UI surfaces them as "unknown — remove").

**`tint.ts`** — `tintForStageId(id) → {r,g,b}`. Hash the id, map to evenly-distributed hue in HSL, fixed S/L. Deterministic so the same stage always gets the same color across reloads.

**`usePipeline.svelte.ts`** — Context provider, called by `+page.svelte`:

```ts
interface PipelineContext {
  graph(): PipelineGraph
  active(): ReadonlySet<StageId>
  preview2D(): StageId | undefined
  tint(id: StageId): RGB
  status(id: StageId): 'idle' | 'loading' | 'ok' | 'error'
  solo(id: StageId): void
  toggle(id: StageId): void   // shift-click; flips membership in active
  clear(): void
}
```

Internally, `graph` is `$derived` from `usePartConfig` + per-stage `getProperties` queries + overrides. `active` is `$state` (a `SvelteSet<string>`). `preview2D` is `$derived` from `active`: the most-recently-toggled active stage whose outputs include any of `image | detections | classifications` (and whose outputs do **not** include `pointcloud | objects`, OR whose `pointcloud`/`objects` is hidden via override). `status` aggregates per-stage TanStack queries.

**`PipelineGraph.svelte`** — A `FloatingPanel`-shaped left-pane component (matches the existing tree's docking style). Layout computed via simple Sugiyama-style top-down DAG layout (small N — under 30 stages typically — so a hand-rolled layout is fine; no new dep). Renders:

- One `<StageNode>` per stage with: icon (camera | vision | unknown), label (override or resource name), status dot (color-coded), tint chip (filled when active), eye toggle (independent show/hide for graph-only filtering).
- One SVG `<EdgeLayer>` over the node grid drawing arrows between connected nodes.
- Header with: "⚙ Overrides" button, "Use native colors" toggle, "Clear selection" button.

Click semantics:
- Plain click on a node → `solo(id)`.
- Shift-click → `toggle(id)`.
- Click on background → `clear()`.

**`StagePreview2D.svelte`** — Mounts iff `preview2D() !== undefined`. Reads the stage's outputs and renders accordingly:

- For `image` stages: `getImages()` on `RefreshRates.pointclouds` cadence (a small misnomer, but reuses the existing rate; introducing `RefreshRates.images` is a follow-up). Returns `NamedImage[]`; rendered as labeled tiles in a vertical stack. If the camera's `mimeTypes` indicate a streamable format and the user has a stream-capable connection, fall back to the existing `StreamClient` approach (extracted from `Camera.svelte` into a shared utility).
- For `detections` stages: call `getDetectionsFromCamera(cameraName)` against the upstream camera (resolved from the DAG: the most-recently-active upstream camera in the active set; if none active, the configured `camera_name`). Render bounding boxes overlaid on that camera's current image (also via `getImages` for that camera).
- For `classifications` stages: `getClassificationsFromCamera(cameraName)`; render a ranked label list above the source image.
- For `objects`: not 2D — never the preview-2D candidate; rendered as 3D in the scene like today.

Pane width is resizable via a drag handle; persisted to settings.

**`PipelineOverrides.svelte`** — A new tab inside the existing `Settings` component. Three sections:

1. **Visibility** — list of all stages with checkboxes.
2. **Outputs** — per-stage chip selector for `pointcloud | image | objects | detections | classifications`. Pre-checked from discovered outputs; unchecking forces an output off in this pipeline.
3. **Manual edges** — list of user-added `from → to` pairs with delete buttons; "Add edge" form with two pickers populated from the resource name set.

A "Reset to derived" button clears all overrides for the current `partID`.

### Hook modifications

```ts
// existing
export const providePointclouds = (partID: () => string) => { ... }

// modified
export interface PointcloudsOptions {
  filter?: () => Set<string> | undefined
}
export const providePointclouds = (partID: () => string, options: PointcloudsOptions = {}) => {
  // inside enabledClients:
  //   if (options.filter && !options.filter().has(client.current.name)) continue
  // rest unchanged
}
```

`providePointcloudObjects` gets the same shape. Existing call sites pass no options (no behavior change).

The pipeline route's provider call is:

```ts
providePointclouds(() => partID, { filter: () => pipelineResourceNames() })
providePointcloudObjects(() => partID, { filter: () => pipelineResourceNames() })
```

`pipelineResourceNames()` is a derived getter: the set of stage ids in the merged graph minus those hidden via override.

### Scene rendering — filter and tint

Two reactive effects in `+page.svelte`:

1. **Visibility effect.** Watches `active()` and the world's entities. For each entity with a `Name` trait that matches a stage id: if the stage is in `active`, ensure the entity has no `Invisible` trait; otherwise add `Invisible`. Entities whose `Name` is not a stage id (e.g. arms, geometries) are left alone — the pipeline view doesn't hide non-pipeline entities by default. (Alternative considered: hide everything not in `active`. Rejected: drops the framed components that contextualize the pointclouds. The user can use the existing tree in the main app for that view.)
2. **Tint effect.** Watches `active()` + the "use native colors" setting. For each active entity, when native-colors is OFF: ensure a `PipelineTint(tint(id))` trait is present and the geometry's `color` attribute (if any) is removed; the existing `Color` trait reading then drives material color. When the entity becomes inactive or the toggle flips ON: remove the trait and let the original color render again. (The `color` attribute removal is one-way in Three.js — once deleted, we'd need to re-parse to restore. Plan: store the original color attribute on the entity in a `OriginalColors` trait at first apply, restore on tint removal. The existing PCD worker output already gives us the bytes to re-create the attribute without a re-fetch.)

### Data flow

```
machine config (Struct)
   │
   └─► usePartConfig                              ─┐
                                                   │
per-stage getProperties (TanStack, staleTime ∞)   ─┤
                                                   │
overrides (localStorage, partID)                  ─┤
                                                   ▼
                                               buildGraph + mergeOverrides → PipelineGraph
                                                                                │
                                                                                ▼
                                                                  usePipeline context
                                                                  ├─► PipelineGraph.svelte (renders)
                                                                  ├─► usePointclouds.filter
                                                                  ├─► usePointcloudObjects.filter
                                                                  ├─► visibility effect (Invisible trait)
                                                                  ├─► tint effect (PipelineTint trait)
                                                                  └─► StagePreview2D (when 2D active)
```

## Pipeline schema (in-memory; not persisted as JSON)

```ts
type StageId = string  // resource name

type StageOutput =
  | 'pointcloud'
  | 'image'
  | 'objects'
  | 'detections'
  | 'classifications'

interface Stage {
  id: StageId
  label: string
  api: 'camera' | 'vision'
  model: string
  outputs: StageOutput[]
  derivedFrom: 'config' | 'override'
}

interface Edge {
  from: StageId
  to: StageId
  derivedFrom: 'config' | 'override'
}

interface Warning {
  stageId: StageId | null
  message: string
}

interface PipelineGraph {
  stages: Stage[]
  edges: Edge[]
  warnings: Warning[]
}
```

## Layout

```
┌─ header: part selector · refresh · "Pipeline overrides" ──────────────┐
├─ graph (left, ~280px)  ─┬─ scene (center, flex-1) ──┬─ preview-2d ────┤
│ ▼ wrist-cam-left  ●     │                            │ named-img: color│
│   │                     │   [3D point clouds]        │ [tile]          │
│ ▼ wrist-l-cropped ●     │                            │                 │
│   │                     │   [optional 2nd cloud      │ named-img: depth│
│ ▼ merged-cloud ◑        │    in compare mode,        │ [tile]          │
│   │                     │    different tint]         │                 │
│ ▼ object-segmenter ◐    │                            │ (only mounted   │
│                         │                            │  when preview2D │
│ ⚙ Overrides             │                            │  is active)     │
└─────────────────────────┴────────────────────────────┴─────────────────┘
```

## Error handling

| Failure | Surface | Recovery |
|---|---|---|
| `getProperties` failure for a stage | Red status dot + tooltip; outputs default to "unknown" until override pins them | User opens overrides → set outputs manually |
| Pointcloud / image fetch failure | Stage status = error; scene/preview retains last-good or shows "no data yet" | Re-fetch on next refresh tick |
| Cyclic edges | Back-edge dropped; warning annotation on the receiving node | User uses overrides → "Hide edge" / "Add edge" to fix |
| Resource referenced in attributes but absent from resources list | Edge silently ignored; reported in `warnings[]` shown in overrides panel | User edits machine config or accepts |
| Detection stage's input camera not active | Preview pane warning: "input camera not active — graph lineage broken" | User shift-clicks the input camera into the active set |
| Stale override (references resource that no longer exists) | Override panel shows it as "unknown — remove" with a one-click remove | User clicks remove |

## Testing

**Unit (Vitest)**

- `derive.ts`:
  - Linear chain (camera → transform → segmenter)
  - Fan-in (multiple cameras → join)
  - Fan-out (one camera → multiple services)
  - Unknown model with attribute references
  - Cyclic config — verifies back-edge dropped + warning emitted
  - Attribute-key variations (`src`, `source`, `camera`, `cameras`, `source_cameras`, `service`, `detector`, `vision`)
  - Self-reference filtered
  - Reference to non-existent resource → warning, no edge
- `override.ts`:
  - Override wins over derived
  - Stale override (referenced stage gone) emits a warning, doesn't crash
  - Reset-to-derived clears all
- `tint.ts`:
  - Deterministic per-id
  - Reasonable hue distribution for N=20

**Component (Vitest + @testing-library/svelte)**

- `PipelineGraph.svelte`: click → solo, shift-click → toggle, eye toggle → independent visibility.
- `StagePreview2D.svelte`: image stage renders tiles; detection stage renders bboxes given a fixture image + detection list.

**E2E (Playwright)**

- Open `/pipeline` against the existing fixture machine; assert the graph renders with expected nodes; solo a stage; assert the scene contains only that stage's points (count entities in the world that don't have `Invisible`).

## Open Questions

None blocking — implementation can begin.

## Out-of-scope follow-ups

1. `getPipelineMetadata` DoCommand convention so custom modules can declare lineage explicitly.
2. Per-stage `RefreshRates` (e.g. images at 100ms, pointclouds at 5s).
3. `transformPCD` to a common frame for compare mode if alignment problems surface.
4. Snapshot integration: capturing a pipeline frame and replaying it via `/snapshot`.
5. Server-side pipeline graph if a future backend wants to drive pipeline UX from a service.
6. Multi-part pipelines spanning machines.

## Phased rollout

1. **Phase 1 — Skeleton.** Route, providers shell, `derive.ts` + tests, `usePipeline`, `PipelineGraph` rendering nodes only. Unit tests green.
2. **Phase 2 — Spotlight scene.** Hook `filter` plumbing, `Invisible` + `PipelineTint` reactive effects, solo / toggle, header tint switch. Pointcloud + objects end-to-end.
3. **Phase 3 — Edges + cycles.** Attribute-value walker, edge layer in graph, cycle detection.
4. **Phase 4 — 2D preview.** `getImages` + stream fallback for image stages; detections / classifications overlays.
5. **Phase 5 — Override panel.** Visibility, outputs pinning, manual edges, persistence.

Each phase is independently testable and demoable.
