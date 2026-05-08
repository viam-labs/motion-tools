# Pipeline View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the MVP slice of the pipeline view (spec phases 1–3): a `/pipeline` route that auto-derives perception stages from the live machine config, renders them as a DAG with directed edges, and "spotlights" selected stages in the existing 3D scene with per-stage color tinting.

**Architecture:** New SvelteKit route at `/pipeline` with a trimmed providers shell. A new `src/lib/pipeline/` library owns derivation (pure functions), context (`usePipeline`), and UI (`PipelineGraph`, `StageNode`, `EdgeLayer`). Existing `usePointclouds` / `usePointcloudObjects` hooks gain an optional `filter` parameter and stamp every entity they spawn with a new `PipelineSource(stageId)` trait so the route can match scene entities to graph nodes. Visibility (`Invisible` trait) and tint (`PipelineTint` + `OriginalColors` traits) are reactive effects in the route page.

**Tech Stack:** Svelte 5 runes, Threlte, Koota ECS, TanStack Query, `@viamrobotics/sdk`, `@viamrobotics/svelte-sdk`, Vitest, `@testing-library/svelte`, Playwright.

**Spec:** `docs/superpowers/specs/2026-05-08-pipeline-view-design.md`

**Out of scope (deferred to follow-up plans):** 2D preview pane (spec §6 / phase 4), override panel + persistence (spec §7 / phase 5).

---

## File Structure

**Created**

- `src/lib/pipeline/types.ts` — shared types (`Stage`, `Edge`, `StageOutput`, `PipelineGraph`, `RGB`, `Warning`).
- `src/lib/pipeline/tint.ts` — deterministic stage-id → RGB mapping.
- `src/lib/pipeline/derive.ts` — pure functions building `PipelineGraph` from `(config, propertiesMap)`.
- `src/lib/pipeline/visibility.ts` — pure helper: given active set + entity list, compute which to mark `Invisible`.
- `src/lib/pipeline/usePipeline.svelte.ts` — Svelte context: graph, active set, status, tint, solo/toggle/clear API.
- `src/lib/pipeline/StageNode.svelte` — single graph node (icon, label, status dot, tint chip).
- `src/lib/pipeline/EdgeLayer.svelte` — SVG arrow layer between nodes.
- `src/lib/pipeline/layout.ts` — DAG layout (column-major topo levels) producing `{x,y}` per stage id.
- `src/lib/pipeline/PipelineGraph.svelte` — left-pane panel composing nodes + edges.
- `src/lib/pipeline/__tests__/derive.spec.ts`
- `src/lib/pipeline/__tests__/tint.spec.ts`
- `src/lib/pipeline/__tests__/layout.spec.ts`
- `src/lib/pipeline/__tests__/visibility.spec.ts`
- `src/lib/pipeline/__tests__/StageNode.spec.ts`
- `src/lib/pipeline/__tests__/PipelineGraph.spec.ts`
- `src/routes/pipeline/+page.svelte` — composition only; mounts providers, canvas, graph panel, effects.
- `src/routes/pipeline/+page.ts` — extracts `partID` from URL params.
- `e2e/pipeline.test.ts` — Playwright smoke test (matches local `*.test.ts` convention).

**Modified**

- `src/lib/ecs/traits.ts` — add `PipelineSource(stageId: string)`, `PipelineTint({r,g,b})`.
- `src/lib/hooks/usePointclouds.svelte.ts` — accept optional `filter`, stamp `PipelineSource` on spawn, export `applyFilter`.
- `src/lib/hooks/usePointcloudObjects.svelte.ts` — same shape (re-uses `applyFilter`).
- `src/lib/hooks/usePartConfig.svelte.ts` — widen `PartConfig` to expose `attributes` on components and a typed `services[]`.
- `src/lib/components/SceneProviders.svelte` — accept optional `pointcloudsFilter` / `pointcloudObjectsFilter` props, threaded into the existing `providePointclouds` / `providePointcloudObjects` calls.
- `src/lib/components/Entities/Points.svelte` — read `PipelineTint` and prefer it over geometry's `color` attribute when present.
- `.gitignore` — add `.superpowers/`.

---

## Conventions for every task

- **TDD discipline.** Write the failing test first, run it to see the failure, write the smallest passing implementation, run again to see green, commit.
- **Run scope.** Use `pnpm test -- <path>` (Vitest) for the file under test, not the full suite, until the task closes. End each phase with `pnpm check && pnpm lint && pnpm test`.
- **Commit format.** Conventional Commits: `feat(pipeline): …`, `test(pipeline): …`, `refactor(hooks): …`. One commit per task unless a task explicitly says "split."
- **Imports.** Use `$lib/...` aliases (matches existing code).
- **Svelte 5 only.** Runes (`$state`, `$derived`, `$effect`, `$props`); no Svelte 4 syntax. No `<slot>` — snippets only.
- **No emojis** in code or commit messages.

---

## Phase 1 — Skeleton

### Task 0: Housekeeping

**Files:**
- Modify: `.gitignore`

- [ ] **Step 1:** Append `.superpowers/` on a new line in `.gitignore`.
- [ ] **Step 2:** Verify with `git status` that `.superpowers/` is now ignored.
- [ ] **Step 3:** Commit.

```bash
git add .gitignore
git commit -m "chore: ignore .superpowers brainstorming workspace"
```

---

### Task 1: Pipeline types

**Files:**
- Create: `src/lib/pipeline/types.ts`

- [ ] **Step 1:** Write the file. Pure type module — no tests required.

```ts
// src/lib/pipeline/types.ts

export type StageId = string

export type StageOutput =
	| 'pointcloud'
	| 'image'
	| 'objects'
	| 'detections'
	| 'classifications'

export type StageApi = 'camera' | 'vision'

export interface Stage {
	id: StageId
	label: string
	api: StageApi
	model: string
	outputs: StageOutput[]
	derivedFrom: 'config' | 'override'
}

export interface Edge {
	from: StageId
	to: StageId
	derivedFrom: 'config' | 'override'
}

export interface Warning {
	stageId: StageId | null
	message: string
}

export interface PipelineGraph {
	stages: Stage[]
	edges: Edge[]
	warnings: Warning[]
}

export interface RGB {
	r: number
	g: number
	b: number
}

export type StageStatus = 'idle' | 'loading' | 'ok' | 'error'
```

- [ ] **Step 2:** `pnpm check` — must pass with no errors.
- [ ] **Step 3:** Commit.

```bash
git add src/lib/pipeline/types.ts
git commit -m "feat(pipeline): add shared types"
```

---

### Task 2: Deterministic stage-id tint

**Files:**
- Create: `src/lib/pipeline/tint.ts`
- Test: `src/lib/pipeline/__tests__/tint.spec.ts`

- [ ] **Step 1: Write the failing test.**

```ts
// src/lib/pipeline/__tests__/tint.spec.ts
import { describe, expect, it } from 'vitest'

import { tintForStageId } from '../tint'

describe('tintForStageId', () => {
	it('returns r,g,b values in [0,1]', () => {
		const rgb = tintForStageId('wrist-cam-left')
		expect(rgb.r).toBeGreaterThanOrEqual(0)
		expect(rgb.r).toBeLessThanOrEqual(1)
		expect(rgb.g).toBeGreaterThanOrEqual(0)
		expect(rgb.g).toBeLessThanOrEqual(1)
		expect(rgb.b).toBeGreaterThanOrEqual(0)
		expect(rgb.b).toBeLessThanOrEqual(1)
	})

	it('is deterministic for the same id', () => {
		expect(tintForStageId('merged-cloud')).toEqual(tintForStageId('merged-cloud'))
	})

	it('produces different colors for different ids', () => {
		const a = tintForStageId('wrist-cam-left')
		const b = tintForStageId('wrist-cam-right')
		expect(a).not.toEqual(b)
	})

	it('distributes hues across many ids', () => {
		const ids = Array.from({ length: 20 }, (_, i) => `stage-${i}`)
		const tints = new Set(ids.map((id) => JSON.stringify(tintForStageId(id))))
		// Expect close to N distinct colors (hash collisions tolerated up to ~10%)
		expect(tints.size).toBeGreaterThanOrEqual(18)
	})
})
```

- [ ] **Step 2:** Run `pnpm test -- src/lib/pipeline/__tests__/tint.spec.ts`. Expected: FAIL ("Cannot find module '../tint'").

- [ ] **Step 3: Write implementation.**

```ts
// src/lib/pipeline/tint.ts
import type { RGB } from './types'

const hashString = (s: string): number => {
	let h = 2166136261
	for (let i = 0; i < s.length; i += 1) {
		h ^= s.charCodeAt(i)
		h = Math.imul(h, 16777619)
	}
	return h >>> 0
}

const hslToRgb = (h: number, s: number, l: number): RGB => {
	const c = (1 - Math.abs(2 * l - 1)) * s
	const hp = h * 6
	const x = c * (1 - Math.abs((hp % 2) - 1))
	let r = 0
	let g = 0
	let b = 0
	if (hp < 1) [r, g, b] = [c, x, 0]
	else if (hp < 2) [r, g, b] = [x, c, 0]
	else if (hp < 3) [r, g, b] = [0, c, x]
	else if (hp < 4) [r, g, b] = [0, x, c]
	else if (hp < 5) [r, g, b] = [x, 0, c]
	else [r, g, b] = [c, 0, x]
	const m = l - c / 2
	return { r: r + m, g: g + m, b: b + m }
}

export const tintForStageId = (id: string): RGB => {
	const hue = (hashString(id) % 360) / 360
	return hslToRgb(hue, 0.65, 0.55)
}
```

- [ ] **Step 4:** Run the test again. Expected: PASS.

- [ ] **Step 5:** Commit.

```bash
git add src/lib/pipeline/tint.ts src/lib/pipeline/__tests__/tint.spec.ts
git commit -m "feat(pipeline): deterministic stage-id tint helper"
```

---

### Task 3: Derive — stage list (no edges yet)

`derive.ts` is built incrementally. Task 3 produces stages from config + properties map. Edges land in Task 15 (Phase 3).

**Files:**
- Create: `src/lib/pipeline/derive.ts`
- Test: `src/lib/pipeline/__tests__/derive.spec.ts`

- [ ] **Step 1: Write the failing test.**

```ts
// src/lib/pipeline/__tests__/derive.spec.ts
import { describe, expect, it } from 'vitest'

import { buildGraph } from '../derive'

const config = {
	components: [
		{ name: 'wrist-cam-left', api: 'rdk:component:camera', model: 'webcam', attributes: {} },
		{
			name: 'merged-cloud',
			api: 'rdk:component:camera',
			model: 'transform',
			attributes: { source: 'wrist-cam-left' },
		},
		{ name: 'arm-1', api: 'rdk:component:arm', model: 'ur5', attributes: {} },
	],
	services: [
		{
			name: 'object-segmenter',
			api: 'rdk:service:vision',
			model: 'segmenter',
			attributes: { camera_name: 'merged-cloud' },
		},
	],
}

const properties = new Map([
	['wrist-cam-left', { supportsPcd: true, mimeTypes: ['image/jpeg'] }],
	['merged-cloud', { supportsPcd: true, mimeTypes: [] }],
	[
		'object-segmenter',
		{ classificationsSupported: false, detectionsSupported: false, objectPointCloudsSupported: true },
	],
])

describe('buildGraph: stages', () => {
	it('emits one stage per camera with relevant outputs', () => {
		const graph = buildGraph(config, properties)
		const ids = graph.stages.map((s) => s.id).sort()
		expect(ids).toEqual(['merged-cloud', 'object-segmenter', 'wrist-cam-left'])
	})

	it('skips arms and other irrelevant components', () => {
		const graph = buildGraph(config, properties)
		expect(graph.stages.find((s) => s.id === 'arm-1')).toBeUndefined()
	})

	it('infers camera outputs from properties', () => {
		const graph = buildGraph(config, properties)
		const wrist = graph.stages.find((s) => s.id === 'wrist-cam-left')!
		expect(wrist.outputs).toEqual(expect.arrayContaining(['pointcloud', 'image']))
		const merged = graph.stages.find((s) => s.id === 'merged-cloud')!
		expect(merged.outputs).toEqual(['pointcloud'])
	})

	it('infers vision outputs from properties', () => {
		const graph = buildGraph(config, properties)
		const seg = graph.stages.find((s) => s.id === 'object-segmenter')!
		expect(seg.outputs).toEqual(['objects'])
		expect(seg.api).toBe('vision')
	})

	it('drops cameras with no relevant outputs', () => {
		const graphProps = new Map([
			['cam', { supportsPcd: false, mimeTypes: [] }],
		])
		const graph = buildGraph(
			{
				components: [
					{ name: 'cam', api: 'rdk:component:camera', model: 'webcam', attributes: {} },
				],
				services: [],
			},
			graphProps
		)
		expect(graph.stages).toHaveLength(0)
	})

	it('returns empty edges in this milestone', () => {
		const graph = buildGraph(config, properties)
		expect(graph.edges).toEqual([])
	})
})
```

- [ ] **Step 2:** Run `pnpm test -- src/lib/pipeline/__tests__/derive.spec.ts`. Expected: FAIL.

- [ ] **Step 3: Write implementation.**

```ts
// src/lib/pipeline/derive.ts
import type {
	Edge,
	PipelineGraph,
	Stage,
	StageApi,
	StageOutput,
	Warning,
} from './types'

export interface CameraProperties {
	supportsPcd?: boolean
	mimeTypes?: string[]
}

export interface VisionProperties {
	classificationsSupported?: boolean
	detectionsSupported?: boolean
	objectPointCloudsSupported?: boolean
}

export type StageProperties = CameraProperties | VisionProperties

export type PropertiesMap = ReadonlyMap<string, StageProperties | undefined>

interface ResourceConfig {
	name: string
	api?: string
	model?: string
	attributes?: Record<string, unknown>
}

interface MachineConfig {
	components?: ResourceConfig[]
	services?: ResourceConfig[]
}

const apiOf = (res: ResourceConfig): StageApi | undefined => {
	if (res.api?.includes(':camera')) return 'camera'
	if (res.api?.includes(':vision')) return 'vision'
	return undefined
}

const cameraOutputs = (props: CameraProperties | undefined): StageOutput[] => {
	const outputs: StageOutput[] = []
	if (props?.supportsPcd) outputs.push('pointcloud')
	if (props?.mimeTypes && props.mimeTypes.length > 0) outputs.push('image')
	return outputs
}

const visionOutputs = (props: VisionProperties | undefined): StageOutput[] => {
	const outputs: StageOutput[] = []
	if (props?.objectPointCloudsSupported) outputs.push('objects')
	if (props?.detectionsSupported) outputs.push('detections')
	if (props?.classificationsSupported) outputs.push('classifications')
	return outputs
}

const resourceToStage = (
	res: ResourceConfig,
	properties: PropertiesMap
): Stage | undefined => {
	const api = apiOf(res)
	if (!api) return undefined
	const props = properties.get(res.name)
	const outputs =
		api === 'camera'
			? cameraOutputs(props as CameraProperties | undefined)
			: visionOutputs(props as VisionProperties | undefined)
	if (outputs.length === 0) return undefined
	return {
		id: res.name,
		label: res.name,
		api,
		model: res.model ?? '',
		outputs,
		derivedFrom: 'config',
	}
}

export const buildGraph = (
	config: MachineConfig,
	properties: PropertiesMap
): PipelineGraph => {
	const stages: Stage[] = []
	const warnings: Warning[] = []
	const edges: Edge[] = [] // edges land in phase 3

	for (const res of [...(config.components ?? []), ...(config.services ?? [])]) {
		const stage = resourceToStage(res, properties)
		if (stage) stages.push(stage)
	}

	return { stages, edges, warnings }
}
```

- [ ] **Step 4:** Run the test. Expected: PASS.

- [ ] **Step 5:** Commit.

```bash
git add src/lib/pipeline/derive.ts src/lib/pipeline/__tests__/derive.spec.ts
git commit -m "feat(pipeline): derive stages from machine config + properties"
```

---

### Task 4: `usePipeline` Svelte context

**Files:**
- Create: `src/lib/pipeline/usePipeline.svelte.ts`

`usePipeline` is mostly orchestration. Tested implicitly through component tests in Tasks 6 and 7. Pure-function bits (active-set transitions) should be testable but the API itself is small enough that direct unit testing isn't load-bearing.

- [ ] **Step 1:** Write the file.

```ts
// src/lib/pipeline/usePipeline.svelte.ts
import { SvelteSet } from 'svelte/reactivity'
import { getContext, setContext } from 'svelte'

import type { PipelineGraph, RGB, StageId, StageStatus } from './types'

import { tintForStageId } from './tint'

const KEY = Symbol('pipeline-context')

interface PipelineContext {
	graph: () => PipelineGraph
	active: () => ReadonlySet<StageId>
	tint: (id: StageId) => RGB
	status: (id: StageId) => StageStatus
	useNativeColors: () => boolean
	setUseNativeColors: (value: boolean) => void
	solo: (id: StageId) => void
	toggle: (id: StageId) => void
	clear: () => void
}

export interface ProvidePipelineParams {
	graph: () => PipelineGraph
	status?: (id: StageId) => StageStatus
}

export const providePipeline = (params: ProvidePipelineParams): PipelineContext => {
	const active = new SvelteSet<StageId>()
	let useNativeColors = $state(false)

	const ctx: PipelineContext = {
		graph: params.graph,
		active: () => active,
		tint: tintForStageId,
		status: params.status ?? (() => 'idle'),
		useNativeColors: () => useNativeColors,
		setUseNativeColors: (value) => {
			useNativeColors = value
		},
		solo: (id) => {
			active.clear()
			active.add(id)
		},
		toggle: (id) => {
			if (active.has(id)) active.delete(id)
			else active.add(id)
		},
		clear: () => active.clear(),
	}

	setContext(KEY, ctx)
	return ctx
}

export const usePipeline = (): PipelineContext => {
	const ctx = getContext<PipelineContext | undefined>(KEY)
	if (!ctx) throw new Error('usePipeline called outside providePipeline')
	return ctx
}
```

- [ ] **Step 2:** `pnpm check`. Expected: PASS.

- [ ] **Step 3:** Commit.

```bash
git add src/lib/pipeline/usePipeline.svelte.ts
git commit -m "feat(pipeline): usePipeline context with active-set + tint API"
```

---

### Task 5: `StageNode` component

**Files:**
- Create: `src/lib/pipeline/StageNode.svelte`
- Test: `src/lib/pipeline/__tests__/StageNode.spec.ts`

- [ ] **Step 1: Write the failing test.**

```ts
// src/lib/pipeline/__tests__/StageNode.spec.ts
import { render, screen } from '@testing-library/svelte'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import StageNode from '../StageNode.svelte'

const baseStage = {
	id: 'wrist-cam-left',
	label: 'Wrist L',
	api: 'camera' as const,
	model: 'webcam',
	outputs: ['pointcloud' as const, 'image' as const],
	derivedFrom: 'config' as const,
}

describe('StageNode', () => {
	it('renders the label', () => {
		render(StageNode, {
			stage: baseStage,
			active: false,
			status: 'ok',
			tint: { r: 1, g: 0, b: 0 },
			onclick: vi.fn(),
		})
		expect(screen.getByText('Wrist L')).toBeInTheDocument()
	})

	it('marks itself as active via aria-pressed', () => {
		render(StageNode, {
			stage: baseStage,
			active: true,
			status: 'ok',
			tint: { r: 1, g: 0, b: 0 },
			onclick: vi.fn(),
		})
		expect(screen.getByRole('button', { name: /Wrist L/ })).toHaveAttribute(
			'aria-pressed',
			'true'
		)
	})

	it('fires onclick with shiftKey when shift-clicked', async () => {
		const onclick = vi.fn()
		const user = userEvent.setup()
		render(StageNode, {
			stage: baseStage,
			active: false,
			status: 'ok',
			tint: { r: 1, g: 0, b: 0 },
			onclick,
		})
		await user.keyboard('{Shift>}')
		await user.click(screen.getByRole('button', { name: /Wrist L/ }))
		await user.keyboard('{/Shift}')
		expect(onclick).toHaveBeenCalledWith(expect.objectContaining({ shiftKey: true }))
	})
})
```

- [ ] **Step 2:** Run `pnpm test -- src/lib/pipeline/__tests__/StageNode.spec.ts`. Expected: FAIL (component not found).

- [ ] **Step 3: Write component.**

```svelte
<!-- src/lib/pipeline/StageNode.svelte -->
<script lang="ts">
	import type { RGB, Stage, StageStatus } from './types'

	interface Props {
		stage: Stage
		active: boolean
		status: StageStatus
		tint: RGB
		onclick: (event: MouseEvent) => void
	}

	let { stage, active, status, tint, onclick }: Props = $props()

	const statusColor: Record<StageStatus, string> = {
		idle: '#6b7280',
		loading: '#fbbf24',
		ok: '#22c55e',
		error: '#ef4444',
	}

	const tintCss = $derived(
		`rgb(${Math.round(tint.r * 255)}, ${Math.round(tint.g * 255)}, ${Math.round(tint.b * 255)})`
	)

	const apiIcon = $derived(stage.api === 'camera' ? '■' : '◆')
</script>

<button
	type="button"
	class={[
		'flex w-full items-center gap-2 rounded border px-2 py-1.5 text-left text-xs',
		active ? 'border-yellow-400 bg-slate-800' : 'border-slate-700 bg-slate-900 hover:bg-slate-800',
	]}
	aria-pressed={active}
	{onclick}
>
	<span aria-hidden="true">{apiIcon}</span>
	<span class="flex-1 truncate">{stage.label}</span>
	{#if active}
		<span
			class="inline-block h-3 w-3 rounded-sm"
			style:background-color={tintCss}
			aria-label="active tint"
		></span>
	{/if}
	<span
		class="inline-block h-2 w-2 rounded-full"
		style:background-color={statusColor[status]}
		aria-label={`status ${status}`}
	></span>
</button>
```

- [ ] **Step 4:** Run the test. Expected: PASS.

- [ ] **Step 5:** Commit.

```bash
git add src/lib/pipeline/StageNode.svelte src/lib/pipeline/__tests__/StageNode.spec.ts
git commit -m "feat(pipeline): StageNode component"
```

---

### Task 6: `PipelineGraph` panel (no edges)

**Files:**
- Create: `src/lib/pipeline/PipelineGraph.svelte`
- Test: `src/lib/pipeline/__tests__/PipelineGraph.spec.ts`

The panel renders a stack of `StageNode` instances in deterministic order, exposes a "Use native colors" toggle, and dispatches click events to `usePipeline`. Edges land in Task 14.

- [ ] **Step 1: Write the failing test.**

```ts
// src/lib/pipeline/__tests__/PipelineGraph.spec.ts
import { render, screen } from '@testing-library/svelte'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import GraphHarness from './__fixtures__/GraphHarness.svelte'

const stages = [
	{
		id: 'wrist-cam-left',
		label: 'Wrist L',
		api: 'camera' as const,
		model: 'webcam',
		outputs: ['pointcloud' as const],
		derivedFrom: 'config' as const,
	},
	{
		id: 'merged-cloud',
		label: 'Merged',
		api: 'camera' as const,
		model: 'transform',
		outputs: ['pointcloud' as const],
		derivedFrom: 'config' as const,
	},
]

describe('PipelineGraph', () => {
	it('renders one node per stage', () => {
		render(GraphHarness, { stages, edges: [], warnings: [] })
		expect(screen.getByRole('button', { name: /Wrist L/ })).toBeInTheDocument()
		expect(screen.getByRole('button', { name: /Merged/ })).toBeInTheDocument()
	})

	it('plain click solos the stage', async () => {
		const user = userEvent.setup()
		const harness = render(GraphHarness, { stages, edges: [], warnings: [] })
		await user.click(screen.getByRole('button', { name: /Wrist L/ }))
		expect(harness.component.activeIds()).toEqual(['wrist-cam-left'])
	})

	it('shift-click adds without clearing', async () => {
		const user = userEvent.setup()
		const harness = render(GraphHarness, { stages, edges: [], warnings: [] })
		await user.click(screen.getByRole('button', { name: /Wrist L/ }))
		await user.keyboard('{Shift>}')
		await user.click(screen.getByRole('button', { name: /Merged/ }))
		await user.keyboard('{/Shift}')
		expect(harness.component.activeIds().sort()).toEqual(['merged-cloud', 'wrist-cam-left'])
	})

	it('toggle native colors button is wired', async () => {
		const user = userEvent.setup()
		const harness = render(GraphHarness, { stages, edges: [], warnings: [] })
		expect(harness.component.useNativeColors()).toBe(false)
		await user.click(screen.getByRole('button', { name: /native colors/i }))
		expect(harness.component.useNativeColors()).toBe(true)
	})
})
```

- [ ] **Step 2:** Create the test fixture component.

```svelte
<!-- src/lib/pipeline/__tests__/__fixtures__/GraphHarness.svelte -->
<script lang="ts" module>
	export type HarnessHandle = {
		activeIds: () => string[]
		useNativeColors: () => boolean
	}
</script>

<script lang="ts">
	import type { Edge, Stage, Warning } from '../../types'

	import PipelineGraph from '../../PipelineGraph.svelte'
	import { providePipeline } from '../../usePipeline.svelte'

	interface Props {
		stages: Stage[]
		edges: Edge[]
		warnings: Warning[]
	}

	let { stages, edges, warnings }: Props = $props()

	const ctx = providePipeline({
		graph: () => ({ stages, edges, warnings }),
	})

	export const activeIds = (): string[] => [...ctx.active()]
	export const useNativeColors = (): boolean => ctx.useNativeColors()
</script>

<PipelineGraph />
```

- [ ] **Step 3:** Run `pnpm test -- src/lib/pipeline/__tests__/PipelineGraph.spec.ts`. Expected: FAIL.

- [ ] **Step 4: Write component.**

```svelte
<!-- src/lib/pipeline/PipelineGraph.svelte -->
<script lang="ts">
	import StageNode from './StageNode.svelte'
	import { usePipeline } from './usePipeline.svelte'

	const pipeline = usePipeline()

	const active = $derived(pipeline.active())
	const stages = $derived(pipeline.graph().stages)
</script>

<aside class="flex h-full w-72 flex-col gap-2 border-r border-slate-800 bg-slate-950 p-3">
	<header class="flex items-center justify-between text-xs text-slate-300">
		<span class="font-semibold">Pipeline</span>
		<button
			type="button"
			class="rounded border border-slate-700 px-2 py-0.5 hover:bg-slate-800"
			aria-pressed={pipeline.useNativeColors()}
			onclick={() => pipeline.setUseNativeColors(!pipeline.useNativeColors())}
		>
			Native colors
		</button>
	</header>

	<ol class="flex flex-col gap-1.5">
		{#each stages as stage (stage.id)}
			<li>
				<StageNode
					{stage}
					active={active.has(stage.id)}
					status={pipeline.status(stage.id)}
					tint={pipeline.tint(stage.id)}
					onclick={(event) => {
						if (event.shiftKey) pipeline.toggle(stage.id)
						else pipeline.solo(stage.id)
					}}
				/>
			</li>
		{/each}
	</ol>
</aside>
```

- [ ] **Step 5:** Run the test. Expected: PASS.

- [ ] **Step 6:** Commit.

```bash
git add src/lib/pipeline/PipelineGraph.svelte src/lib/pipeline/__tests__/PipelineGraph.spec.ts src/lib/pipeline/__tests__/__fixtures__/GraphHarness.svelte
git commit -m "feat(pipeline): PipelineGraph panel rendering nodes"
```

---

### Task 6.5: Widen `PartConfig` + thread filter props through `SceneProviders`

Two prerequisite shared-code edits the route depends on. Bundled here so the route in Task 7 mounts cleanly. **No tests** in this task — it's wiring; behavior is validated by Task 9 / Task 12 / Task 18 against real config.

**Files:**
- Modify: `src/lib/hooks/usePartConfig.svelte.ts`
- Modify: `src/lib/components/SceneProviders.svelte`

- [ ] **Step 1: Widen `PartConfig`.** In `src/lib/hooks/usePartConfig.svelte.ts`, replace the `PartConfig` interface with:

```ts
export interface PartConfigComponent {
	name: string
	api?: string
	model?: string
	attributes?: Record<string, unknown>
	frame?: Frame
}

export interface PartConfigService {
	name: string
	api?: string
	model?: string
	attributes?: Record<string, unknown>
}

export interface PartConfig {
	components: PartConfigComponent[]
	services?: PartConfigService[]
	fragment_mods?: {
		fragment_id: string
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		mods: any[]
	}[]
}
```

`Struct.toJson()` already returns these fields when the underlying config has them; we're just exposing them in the typed surface.

Also export `usePartConfig` as a named export if it isn't already (the existing file may only export `providePartConfig`):

```ts
export const usePartConfig = (): PartConfigContext => {
	const ctx = getContext<PartConfigContext | undefined>(key)
	if (!ctx) throw new Error('usePartConfig called outside providePartConfig')
	return ctx
}
```

(Check first: if `usePartConfig` already exists, leave it alone.)

- [ ] **Step 2:** `pnpm check`. Expected: PASS — no consumers should regress because the new fields are optional.

- [ ] **Step 3: Thread filter props through `SceneProviders`.** In `src/lib/components/SceneProviders.svelte`:

```svelte
<script lang="ts">
	import type { Snippet } from 'svelte'

	// existing imports …

	interface Props {
		cameraPose?: CameraPose
		pointcloudsFilter?: () => ReadonlySet<string> | undefined
		pointcloudObjectsFilter?: () => ReadonlySet<string> | undefined
		children: Snippet<[{ focus: boolean }]>
	}

	let {
		cameraPose,
		pointcloudsFilter,
		pointcloudObjectsFilter,
		children,
	}: Props = $props()

	// existing provides …

	providePointclouds(() => partID.current, { filter: pointcloudsFilter })
	providePointcloudObjects(() => partID.current, { filter: pointcloudObjectsFilter })

	// rest unchanged
</script>
```

(The `{ filter }` option arrives in Tasks 9 + 10. Check this task in **after** those tasks — see "Task ordering" below.)

> **Task ordering note.** Tasks 9 and 10 add the `filter` option to the hook signatures. This task (6.5) is logically a *prerequisite* for Task 7's route shell, but its `SceneProviders` edit *uses* the option. Implement the prerequisite split this way: do Step 1 (widen `PartConfig`) now, then jump to Tasks 9 + 10 to add the `filter` plumbing, then return to do Step 3 (thread filter props through `SceneProviders`), then proceed to Task 7. The phase-2 ordering in the plan reflects narrative order; this is the build order.

- [ ] **Step 4:** `pnpm check`. Expected: PASS.

- [ ] **Step 5:** Commit (split into two commits — one per file — for clean review):

```bash
git add src/lib/hooks/usePartConfig.svelte.ts
git commit -m "feat(hooks): widen PartConfig with attributes + services"

git add src/lib/components/SceneProviders.svelte
git commit -m "feat(scene): thread pointcloud filter props through SceneProviders"
```

---

### Task 7: `/pipeline` route shell

**Files:**
- Create: `src/routes/pipeline/+page.ts`
- Create: `src/routes/pipeline/+page.svelte`

The page reuses `<SceneProviders>` for the full provider tree (frames, geometries, draw API, hierarchy, **and** the pointcloud hooks with our filter), and mounts `Settings` / `RefreshRate` inside the Canvas snippet via the existing `domPortal` pattern (matching `App.svelte`). Property fetching for graph derivation is wired via `useResourceNames` + `createResourceQuery` (mirroring `usePointclouds`). No scene filter behavior yet — that lands in Task 12.

- [ ] **Step 1:** Add `+page.ts`.

```ts
// src/routes/pipeline/+page.ts
import type { PageLoad } from './$types'

export const ssr = false
export const prerender = false

export const load: PageLoad = ({ url }) => {
	const partID = url.searchParams.get('partID') ?? ''
	return { partID }
}
```

- [ ] **Step 2:** Add `+page.svelte`.

```svelte
<!-- src/routes/pipeline/+page.svelte -->
<script lang="ts">
	import { Canvas } from '@threlte/core'
	import { CameraClient, VisionClient } from '@viamrobotics/sdk'
	import {
		createResourceClient,
		createResourceQuery,
		useResourceNames,
	} from '@viamrobotics/svelte-sdk'

	import RefreshRate from '$lib/components/overlay/RefreshRate.svelte'
	import Scene from '$lib/components/Scene.svelte'
	import SceneProviders from '$lib/components/SceneProviders.svelte'
	import Settings from '$lib/components/overlay/settings/Settings.svelte'
	import { provideWorld } from '$lib/ecs'
	import { provideEnvironment } from '$lib/hooks/useEnvironment.svelte'
	import { providePartConfig, usePartConfig } from '$lib/hooks/usePartConfig.svelte'
	import { createPartIDContext } from '$lib/hooks/usePartID.svelte'
	import { provideSettings } from '$lib/hooks/useSettings.svelte'
	import { usePointclouds } from '$lib/hooks/usePointclouds.svelte'
	import { usePointcloudObjects } from '$lib/hooks/usePointcloudObjects.svelte'
	import { domPortal } from '$lib/portal'
	import { buildGraph, type PropertiesMap, type StageProperties } from '$lib/pipeline/derive'
	import PipelineGraph from '$lib/pipeline/PipelineGraph.svelte'
	import { providePipeline } from '$lib/pipeline/usePipeline.svelte'

	const { data } = $props()
	const partID = $derived(data.partID)

	provideWorld()
	provideSettings()
	provideEnvironment()
	createPartIDContext(() => partID)
	providePartConfig(() => partID, () => undefined)
	const partCfg = usePartConfig()

	const cameras = useResourceNames(() => partID, 'camera')
	const visionServices = useResourceNames(() => partID, 'vision')

	const cameraClients = $derived(
		cameras.current.map((cam) =>
			createResourceClient(CameraClient, () => partID, () => cam.name)
		)
	)
	const visionClients = $derived(
		visionServices.current.map((svc) =>
			createResourceClient(VisionClient, () => partID, () => svc.name)
		)
	)

	const cameraPropQueries = $derived(
		cameraClients.map(
			(client) =>
				[
					client,
					createResourceQuery(client, 'getProperties', {
						staleTime: Infinity,
						refetchOnMount: false,
						refetchInterval: false,
					}),
				] as const
		)
	)
	const visionPropQueries = $derived(
		visionClients.map(
			(client) =>
				[
					client,
					createResourceQuery(client, 'getProperties', {
						staleTime: Infinity,
						refetchOnMount: false,
						refetchInterval: false,
					}),
				] as const
		)
	)

	const properties = $derived.by((): PropertiesMap => {
		const map = new Map<string, StageProperties>()
		for (const [client, query] of cameraPropQueries) {
			if (client.current?.name && query.data) map.set(client.current.name, query.data)
		}
		for (const [client, query] of visionPropQueries) {
			if (client.current?.name && query.data) map.set(client.current.name, query.data)
		}
		return map
	})

	const partConfig = $derived({
		components: partCfg.current.components ?? [],
		services: partCfg.current.services ?? [],
	})

	const graph = $derived(buildGraph(partConfig, properties))

	const pipelineCtx = providePipeline({ graph: () => graph })

	const stageIdFilter = () => new Set(graph.stages.map((s) => s.id))

	let root = $state.raw<HTMLElement>()
</script>

<div
	class="relative grid h-screen grid-cols-[18rem_1fr] bg-slate-950"
	bind:this={root}
>
	<PipelineGraph />

	<div class="relative">
		<Canvas renderMode="on-demand">
			<SceneProviders
				pointcloudsFilter={stageIdFilter}
				pointcloudObjectsFilter={stageIdFilter}
			>
				{#snippet children({ focus: _focus })}
					<Scene />

					<!-- DOM-portalled out so the markup lands at <root>, but mounted
					     inside the Threlte context tree so useThrelte() resolves. -->
					{@const pointclouds = usePointclouds()}
					{@const pointcloudObjects = usePointcloudObjects()}
					<div {@attach domPortal(root)}>
						<div class="absolute right-2 top-2 flex flex-col gap-2 rounded border border-slate-700 bg-slate-900 p-2">
							<RefreshRate
								id="pointclouds"
								label="Pointclouds"
								onManualRefetch={() => pointclouds.refetch()}
							/>
							<RefreshRate
								id="vision"
								label="Vision"
								onManualRefetch={() => pointcloudObjects.refetch()}
							/>
						</div>
						<Settings />
					</div>
				{/snippet}
			</SceneProviders>
		</Canvas>
	</div>
</div>
```

- [ ] **Step 3:** `pnpm check`. Expected: PASS. (TypeScript will grumble about the `pointcloudsFilter` / `pointcloudObjectsFilter` props on `SceneProviders` until Task 6.5 Step 3 is done — see the **Task ordering note** in Task 6.5. If you implemented in plan order, jump back and finish Task 6.5 Step 3 now.)

- [ ] **Step 4:** `pnpm dev` and visit `http://localhost:5173/pipeline?partID=<test-partid>`. Expected: graph populated with derived stages (no edges yet), Threlte canvas renders, RefreshRate controls visible top-right. Until Task 12 lands, the scene shows every pipeline stage's points; clicking a node has no scene effect yet (only graph state changes).

> **Settings UX caveat.** `Settings.svelte` opens its `FloatingPanel` via a gear button portalled into `<PortalTarget id="dashboard" />`, which lives in the (deliberately omitted) `<Dashboard>` overlay. That means the gear button doesn't render on this route. The Settings panel itself functions correctly once opened — but you may need to add a Pipeline-route-specific opener (e.g. a small button in the `PipelineGraph` header) in a follow-up if Settings access becomes important. Not a v1 blocker.

- [ ] **Step 5:** Commit.

```bash
git add src/routes/pipeline/+page.ts src/routes/pipeline/+page.svelte
git commit -m "feat(pipeline): /pipeline route with providers + graph panel"
```

---

## Phase 2 — Spotlight scene

### Task 8: ECS traits for pipeline rendering

**Files:**
- Modify: `src/lib/ecs/traits.ts`

- [ ] **Step 1:** Append to `src/lib/ecs/traits.ts`:

```ts
import { trait } from 'koota'
// (existing imports unchanged)

/** The stage id (resource name) that produced this entity. Set by the pipeline-aware hooks. */
export const PipelineSource = trait(() => '')

/** Per-stage tint applied in pipeline view; rendered in place of geometry color. */
export const PipelineTint = trait({ r: 0, g: 0, b: 0 })
```

(`OriginalColors` from spec §5 is not added — Task 13 takes a renderer-side override path that doesn't need it. If a future renderer adopts `PipelineTint` and *does* need to mutate geometry, add the trait then.)

- [ ] **Step 2:** `pnpm check`. Expected: PASS.

- [ ] **Step 3:** Commit.

```bash
git add src/lib/ecs/traits.ts
git commit -m "feat(ecs): pipeline-rendering traits"
```

---

### Task 9: `usePointclouds` filter + `PipelineSource` stamp

**Files:**
- Modify: `src/lib/hooks/usePointclouds.svelte.ts`
- Test: `src/lib/hooks/__tests__/usePointclouds.filter.spec.ts`

The hook is large; this task only adds (a) an optional `filter` to `providePointclouds`, applied in `enabledClients`, and (b) a `traits.PipelineSource(name)` trait on every entity it spawns. No other behavior changes. The new test exercises the filter shape only — full hook integration is implicitly tested by the existing app.

- [ ] **Step 1: Write the failing test.**

```ts
// src/lib/hooks/__tests__/usePointclouds.filter.spec.ts
import { describe, expect, it } from 'vitest'

import { applyFilter } from '$lib/hooks/usePointclouds.svelte'

describe('usePointclouds applyFilter', () => {
	const allow = new Set(['cam-a', 'cam-c'])

	it('returns true when no filter is given', () => {
		expect(applyFilter('cam-a', undefined)).toBe(true)
	})

	it('returns true when name is in the filter', () => {
		expect(applyFilter('cam-a', allow)).toBe(true)
	})

	it('returns false when name is missing from the filter', () => {
		expect(applyFilter('cam-b', allow)).toBe(false)
	})
})
```

- [ ] **Step 2:** Run `pnpm test -- src/lib/hooks/__tests__/usePointclouds.filter.spec.ts`. Expected: FAIL.

- [ ] **Step 3: Modify the hook.** Add at the top of `usePointclouds.svelte.ts` (after imports):

```ts
export const applyFilter = (name: string, filter: ReadonlySet<string> | undefined): boolean =>
	filter === undefined || filter.has(name)

export interface ProvidePointcloudsOptions {
	filter?: () => ReadonlySet<string> | undefined
}
```

Update the `providePointclouds` signature:

```ts
export const providePointclouds = (
	partID: () => string,
	options: ProvidePointcloudsOptions = {}
) => {
	// ... existing code ...
}
```

In the `enabledClients` `$derived.by`, add the filter check alongside the existing checks. Replace this stretch:

```ts
if (
	fetchedPropQueries &&
	client.current?.name &&
	interval !== RefetchRates.OFF &&
	disabledCameras[client.current?.name] !== true
) {
	results.push(client as { current: CameraClient })
}
```

with:

```ts
const allow = options.filter?.()
if (
	fetchedPropQueries &&
	client.current?.name &&
	interval !== RefetchRates.OFF &&
	disabledCameras[client.current?.name] !== true &&
	applyFilter(client.current.name, allow)
) {
	results.push(client as { current: CameraClient })
}
```

In the spawn block, add `traits.PipelineSource(name)` to the entity traits:

```ts
const entity = world.spawn(
	...hierarchy.parentTraits(name),
	traits.Name(`${name} pointcloud`),
	traits.BufferGeometry(geometry),
	traits.Points,
	traits.PipelineSource(name)
)
```

- [ ] **Step 4:** Run the test. Expected: PASS.

- [ ] **Step 5:** `pnpm check && pnpm test -- usePointclouds`. Expected: existing tests stay green.

- [ ] **Step 6:** Commit.

```bash
git add src/lib/hooks/usePointclouds.svelte.ts src/lib/hooks/__tests__/usePointclouds.filter.spec.ts
git commit -m "feat(hooks): usePointclouds optional filter + PipelineSource trait"
```

---

### Task 10: `usePointcloudObjects` filter + `PipelineSource` stamp

**Files:**
- Modify: `src/lib/hooks/usePointcloudObjects.svelte.ts`

Same shape as Task 9. The test from Task 9 exports `applyFilter` from `usePointclouds`; this hook should import-and-reuse the same helper.

- [ ] **Step 1:** At the top of `usePointcloudObjects.svelte.ts`:

```ts
import { applyFilter } from './usePointclouds.svelte'

export interface ProvidePointcloudObjectsOptions {
	filter?: () => ReadonlySet<string> | undefined
}
```

- [ ] **Step 2:** Update the signature:

```ts
export const providePointcloudObjects = (
	partID: () => string,
	options: ProvidePointcloudObjectsOptions = {}
) => {
	// ...
}
```

- [ ] **Step 3:** In its `enabledClients` `$derived.by`, add the filter check (mirror Task 9). Then in **both** spawn blocks (the pointcloud entity around line ~204 and the geometry entity around line ~238), add `traits.PipelineSource(name)` to the entity traits — `name` here is the vision-service name from the enclosing loop.

- [ ] **Step 4:** `pnpm check && pnpm test -- usePointcloudObjects`. Expected: PASS.

- [ ] **Step 5:** Commit.

```bash
git add src/lib/hooks/usePointcloudObjects.svelte.ts
git commit -m "feat(hooks): usePointcloudObjects optional filter + PipelineSource trait"
```

---

### Task 11: Pure visibility helper

The visibility effect is the only place that talks to ECS, but the policy it implements (which entities should be `Invisible` given an active set) is pure and deserves a unit test before we wire it.

**Files:**
- Create: `src/lib/pipeline/visibility.ts`
- Test: `src/lib/pipeline/__tests__/visibility.spec.ts`

- [ ] **Step 1: Write the failing test.**

```ts
// src/lib/pipeline/__tests__/visibility.spec.ts
import { describe, expect, it } from 'vitest'

import { computeVisibility } from '../visibility'

describe('computeVisibility', () => {
	const entities = [
		{ id: 1, source: 'wrist-cam-left' },
		{ id: 2, source: 'merged-cloud' },
		{ id: 3, source: 'object-segmenter' },
		{ id: 4, source: 'arm-1' }, // not a stage; not a pipeline source
	]

	it('hides every pipeline-sourced entity not in active', () => {
		const result = computeVisibility(entities, new Set(['merged-cloud']), new Set([
			'wrist-cam-left',
			'merged-cloud',
			'object-segmenter',
		]))
		expect(result.hide).toEqual([1, 3])
		expect(result.show).toEqual([2])
	})

	it('leaves entities whose source is not a stage alone', () => {
		const result = computeVisibility(entities, new Set(['merged-cloud']), new Set([
			'wrist-cam-left',
			'merged-cloud',
			'object-segmenter',
		]))
		expect(result.hide).not.toContain(4)
		expect(result.show).not.toContain(4)
	})

	it('shows everything when active is empty', () => {
		const result = computeVisibility(entities, new Set(), new Set([
			'wrist-cam-left',
			'merged-cloud',
			'object-segmenter',
		]))
		expect(result.hide).toEqual([])
		expect(result.show).toEqual([1, 2, 3])
	})
})
```

- [ ] **Step 2:** Run `pnpm test -- src/lib/pipeline/__tests__/visibility.spec.ts`. Expected: FAIL.

- [ ] **Step 3: Write implementation.**

```ts
// src/lib/pipeline/visibility.ts
import type { StageId } from './types'

export interface PipelineEntity<E> {
	id: E
	source: string
}

export interface VisibilityResult<E> {
	show: E[]
	hide: E[]
}

export const computeVisibility = <E>(
	entities: ReadonlyArray<PipelineEntity<E>>,
	active: ReadonlySet<StageId>,
	stageIds: ReadonlySet<StageId>
): VisibilityResult<E> => {
	const show: E[] = []
	const hide: E[] = []
	for (const entity of entities) {
		if (!stageIds.has(entity.source)) continue
		if (active.size === 0 || active.has(entity.source)) show.push(entity.id)
		else hide.push(entity.id)
	}
	return { show, hide }
}
```

Note the empty-active behavior: when no stage is selected, **everything** in the pipeline shows. This matches the user expectation that the page reads as "live monitor for the pipeline" when nothing is solo'd.

- [ ] **Step 4:** Run the test. Expected: PASS.

- [ ] **Step 5:** Commit.

```bash
git add src/lib/pipeline/visibility.ts src/lib/pipeline/__tests__/visibility.spec.ts
git commit -m "feat(pipeline): pure visibility policy helper"
```

---

### Task 12: Wire visibility effect into the route

**Files:**
- Modify: `src/routes/pipeline/+page.svelte`

- [ ] **Step 1:** Add inside the `<script>`, after `providePipeline`:

```ts
	import { useQuery, useWorld, traits } from '$lib/ecs'
	import { computeVisibility } from '$lib/pipeline/visibility'

	const world = useWorld()
	const sourcedEntities = useQuery(traits.PipelineSource)

	$effect(() => {
		const list = sourcedEntities.current.map((entity) => ({
			id: entity,
			source: entity.get(traits.PipelineSource) ?? '',
		}))
		const stageIds = new Set(graph.stages.map((s) => s.id))
		const { show, hide } = computeVisibility(list, pipelineCtx.active(), stageIds)
		for (const e of hide) {
			if (!e.has(traits.Invisible)) e.add(traits.Invisible)
		}
		for (const e of show) {
			if (e.has(traits.Invisible)) e.remove(traits.Invisible)
		}
	})
```

- [ ] **Step 2:** `pnpm check`. Expected: PASS.

- [ ] **Step 3:** `pnpm dev` and visit `/pipeline?partID=<id>`. Click a stage in the panel — only that stage's points should remain visible. Click a different stage — switch. Shift-click — both visible.

- [ ] **Step 4:** Commit.

```bash
git add src/routes/pipeline/+page.svelte
git commit -m "feat(pipeline): visibility effect spotlights active stages"
```

---

### Task 13: Tint effect (with native-color restore)

**Files:**
- Modify: `src/routes/pipeline/+page.svelte`
- Modify: `src/lib/components/Entities/Points.svelte`

The `Points` renderer currently sets material color from `geometry.getAttribute('color')` first, then `Color` trait, then `Colors` trait. To make `PipelineTint` win, modify `Points.svelte` to read it before geometry color. The route effect manages the trait lifecycle: stash original colors when activating, restore when deactivating.

- [ ] **Step 1:** Modify `src/lib/components/Entities/Points.svelte`. Add a `pipelineTint` reactive read, and prefer it.

```svelte
	const pipelineTint = useTrait(() => entity, traits.PipelineTint)
```

In the `$effect.pre` that sets `material.color`, change the cascade so `pipelineTint` wins:

```ts
	$effect.pre(() => {
		if (pipelineTint.current) {
			const { r, g, b } = pipelineTint.current
			material.color.setRGB(r, g, b)
		} else if (geometry.current?.getAttribute('color')) {
			material.color.set(0xffffff)
		} else if (entityColor.current) {
			const { r, g, b } = entityColor.current
			material.color.setRGB(r, g, b)
		} else if (colors.current && isSingleColor(colors.current)) {
			asColor(colors.current, material.color, 0)
		} else {
			// existing fallback
		}
	})
```

Also ensure `vertexColors` is disabled when `pipelineTint` is set: in the `$effect.pre` that toggles `material.vertexColors`, AND it with `!pipelineTint.current`.

- [ ] **Step 2:** In `src/routes/pipeline/+page.svelte`, add the tint effect after the visibility effect:

```ts
	$effect(() => {
		const list = sourcedEntities.current
		const useNative = pipelineCtx.useNativeColors()
		const active = pipelineCtx.active()
		for (const entity of list) {
			// Spec §5 limits tint scope to Points-bearing entities. Other entity
			// kinds (geometry boxes, frames) keep their native color.
			if (!entity.has(traits.Points)) continue
			const source = entity.get(traits.PipelineSource) ?? ''
			const isActive = active.has(source) && !useNative
			if (isActive) {
				if (!entity.has(traits.PipelineTint)) {
					const tint = pipelineCtx.tint(source)
					entity.add(traits.PipelineTint(tint))
				}
			} else if (entity.has(traits.PipelineTint)) {
				entity.remove(traits.PipelineTint)
			}
		}
	})
```

(The `OriginalColors` trait isn't needed for this approach — we don't delete the geometry attribute; we just override at the material level. This is a deliberate simplification of the spec: it accomplishes the same user-visible result without the round-trip risk. Document the deviation in the commit message.)

- [ ] **Step 3:** `pnpm check && pnpm test`. Expected: PASS.

- [ ] **Step 4:** Manual smoke: `pnpm dev`, visit `/pipeline?partID=<id>`. Solo a stage — its points render in the tint color. Toggle "Native colors" — points return to their original RGB. Shift-click another stage — both render with their respective tints.

- [ ] **Step 5:** Commit.

```bash
git add src/routes/pipeline/+page.svelte src/lib/components/Entities/Points.svelte
git commit -m "feat(pipeline): tint effect via material override (no geometry mutation)

Simplifies spec §5 by overriding material color at the renderer level instead
of mutating the geometry's color attribute and storing a backup. Same visible
behavior, no save/restore round-trip risk."
```

---

## Phase 3 — Edges

### Task 14: Attribute-value walker for edge derivation

**Files:**
- Modify: `src/lib/pipeline/derive.ts`
- Test: `src/lib/pipeline/__tests__/derive.spec.ts`

- [ ] **Step 1: Write the failing test.** Append to `derive.spec.ts`:

```ts
describe('buildGraph: edges via attribute-value matching', () => {
	const matrix = [
		{ key: 'source', attrs: { source: 'wrist-cam-left' } },
		{ key: 'src', attrs: { src: 'wrist-cam-left' } },
		{ key: 'camera', attrs: { camera: 'wrist-cam-left' } },
		{ key: 'cameras', attrs: { cameras: ['wrist-cam-left'] } },
		{ key: 'source_cameras', attrs: { source_cameras: ['wrist-cam-left'] } },
		{ key: 'camera_name', attrs: { camera_name: 'wrist-cam-left' } },
		{ key: 'service', attrs: { service: 'wrist-cam-left' } },
		{ key: 'detector', attrs: { detector: 'wrist-cam-left' } },
		{ key: 'vision', attrs: { vision: 'wrist-cam-left' } },
		{ key: 'nested', attrs: { config: { upstream: 'wrist-cam-left' } } },
	]

	const properties = new Map<string, any>([
		['wrist-cam-left', { supportsPcd: true, mimeTypes: [] }],
		['transformed', { supportsPcd: true, mimeTypes: [] }],
	])

	it.each(matrix)('discovers an edge when reference appears under "$key"', ({ attrs }) => {
		const graph = buildGraph(
			{
				components: [
					{ name: 'wrist-cam-left', api: 'rdk:component:camera', model: 'webcam', attributes: {} },
					{ name: 'transformed', api: 'rdk:component:camera', model: 'transform', attributes: attrs },
				],
				services: [],
			},
			properties
		)
		expect(graph.edges).toContainEqual({
			from: 'wrist-cam-left',
			to: 'transformed',
			derivedFrom: 'config',
		})
	})

	it('dedupes when the same reference appears more than once', () => {
		const graph = buildGraph(
			{
				components: [
					{ name: 'wrist-cam-left', api: 'rdk:component:camera', model: 'webcam', attributes: {} },
					{
						name: 'transformed',
						api: 'rdk:component:camera',
						model: 'transform',
						attributes: { source: 'wrist-cam-left', extra: 'wrist-cam-left' },
					},
				],
				services: [],
			},
			properties
		)
		const matching = graph.edges.filter((e) => e.from === 'wrist-cam-left')
		expect(matching).toHaveLength(1)
	})

	it('ignores self-references', () => {
		const graph = buildGraph(
			{
				components: [
					{
						name: 'wrist-cam-left',
						api: 'rdk:component:camera',
						model: 'webcam',
						attributes: { foo: 'wrist-cam-left' },
					},
				],
				services: [],
			},
			new Map([['wrist-cam-left', { supportsPcd: true, mimeTypes: [] }]])
		)
		expect(graph.edges).toEqual([])
	})

	it('emits a warning when a referenced resource has no stage (no edge created)', () => {
		const graph = buildGraph(
			{
				components: [
					{ name: 'arm-1', api: 'rdk:component:arm', model: 'ur5', attributes: {} },
					{
						name: 'transformed',
						api: 'rdk:component:camera',
						model: 'transform',
						attributes: { source: 'arm-1' },
					},
				],
				services: [],
			},
			new Map([['transformed', { supportsPcd: true, mimeTypes: [] }]])
		)
		expect(graph.edges).toEqual([])
		expect(graph.warnings.find((w) => w.message.includes('arm-1'))).toBeDefined()
	})

	it('records but does not de-noise coincidental string matches', () => {
		// Documented limitation: a description field that happens to equal a resource
		// name produces an edge. The override panel handles real-world cleanup.
		const graph = buildGraph(
			{
				components: [
					{ name: 'cam', api: 'rdk:component:camera', model: 'webcam', attributes: {} },
					{
						name: 'transformed',
						api: 'rdk:component:camera',
						model: 'transform',
						attributes: { description: 'cam' },
					},
				],
				services: [],
			},
			new Map([
				['cam', { supportsPcd: true, mimeTypes: [] }],
				['transformed', { supportsPcd: true, mimeTypes: [] }],
			])
		)
		expect(graph.edges).toContainEqual({ from: 'cam', to: 'transformed', derivedFrom: 'config' })
	})
})
```

- [ ] **Step 2:** Run the new tests. Expected: FAIL.

- [ ] **Step 3: Add walker to `derive.ts`.** Inside `buildGraph`, after the stage loop. The walker assumes `attributes` is the plain JSON shape produced by `Struct.toJson()` (objects, arrays, strings, numbers, booleans, null) — no `Map` / `Set` / class instances. Source: `usePartConfig.svelte.ts` does `config.current.toJson()` before exposing `current`, so the route's `partConfig.components[].attributes` is already in this shape.

```ts
	const stageIds = new Set(stages.map((s) => s.id))
	const allResourceNames = new Set<string>([
		...(config.components ?? []).map((c) => c.name),
		...(config.services ?? []).map((c) => c.name),
	])
	const seen = new Set<string>() // dedupe key: `${from}|${to}`

	const visit = (value: unknown, target: string): void => {
		if (typeof value === 'string') {
			if (value === target) return
			if (!allResourceNames.has(value)) return
			if (!stageIds.has(value)) {
				warnings.push({
					stageId: target,
					message: `Reference to non-stage resource "${value}" — edge skipped`,
				})
				return
			}
			const key = `${value}|${target}`
			if (seen.has(key)) return
			seen.add(key)
			edges.push({ from: value, to: target, derivedFrom: 'config' })
			return
		}
		if (Array.isArray(value)) {
			for (const v of value) visit(v, target)
			return
		}
		if (value && typeof value === 'object') {
			for (const v of Object.values(value as Record<string, unknown>)) visit(v, target)
		}
	}

	for (const res of [...(config.components ?? []), ...(config.services ?? [])]) {
		if (!stageIds.has(res.name)) continue
		visit(res.attributes ?? {}, res.name)
	}
```

- [ ] **Step 4:** Run the tests. Expected: PASS.

- [ ] **Step 5:** Commit.

```bash
git add src/lib/pipeline/derive.ts src/lib/pipeline/__tests__/derive.spec.ts
git commit -m "feat(pipeline): edge derivation via attribute-value matching"
```

---

### Task 15: Cycle detection

**Files:**
- Modify: `src/lib/pipeline/derive.ts`
- Test: `src/lib/pipeline/__tests__/derive.spec.ts`

- [ ] **Step 1: Write the failing test.** Append:

```ts
describe('buildGraph: cycles', () => {
	it('drops a back-edge and emits a warning when the config cycles', () => {
		const properties = new Map([
			['a', { supportsPcd: true, mimeTypes: [] }],
			['b', { supportsPcd: true, mimeTypes: [] }],
		])
		const graph = buildGraph(
			{
				components: [
					{ name: 'a', api: 'rdk:component:camera', model: 'transform', attributes: { source: 'b' } },
					{ name: 'b', api: 'rdk:component:camera', model: 'transform', attributes: { source: 'a' } },
				],
				services: [],
			},
			properties
		)
		expect(graph.edges).toHaveLength(1)
		expect(graph.warnings.find((w) => w.message.toLowerCase().includes('cycle'))).toBeDefined()
	})
})
```

- [ ] **Step 2:** Run. Expected: FAIL.

- [ ] **Step 3: Implement.** After the edge-building loop, add a topo-sort + back-edge dropper:

```ts
	const acyclicEdges: Edge[] = []
	const adj = new Map<string, string[]>()
	for (const e of edges) {
		const list = adj.get(e.from) ?? []
		list.push(e.to)
		adj.set(e.from, list)
	}

	const color = new Map<string, 'white' | 'gray' | 'black'>()
	for (const id of stageIds) color.set(id, 'white')

	const dfs = (node: string): void => {
		color.set(node, 'gray')
		for (const next of adj.get(node) ?? []) {
			const c = color.get(next)
			if (c === 'gray') {
				warnings.push({
					stageId: next,
					message: `Cyclic dependency: back-edge ${node} -> ${next} dropped`,
				})
				continue
			}
			if (c === 'white') {
				acyclicEdges.push({ from: node, to: next, derivedFrom: 'config' })
				dfs(next)
			} else {
				acyclicEdges.push({ from: node, to: next, derivedFrom: 'config' })
			}
		}
		color.set(node, 'black')
	}
	for (const id of stageIds) {
		if (color.get(id) === 'white') dfs(id)
	}

	return { stages, edges: acyclicEdges, warnings }
```

Replace the `edges` return value with `acyclicEdges`.

- [ ] **Step 4:** Run the full `derive.spec.ts`. All tests should still pass.

- [ ] **Step 5:** Commit.

```bash
git add src/lib/pipeline/derive.ts src/lib/pipeline/__tests__/derive.spec.ts
git commit -m "feat(pipeline): drop cyclic back-edges with warnings"
```

---

### Task 16: DAG layout

**Files:**
- Create: `src/lib/pipeline/layout.ts`
- Test: `src/lib/pipeline/__tests__/layout.spec.ts`

- [ ] **Step 1: Write the failing test.**

```ts
// src/lib/pipeline/__tests__/layout.spec.ts
import { describe, expect, it } from 'vitest'

import { layoutGraph } from '../layout'

describe('layoutGraph', () => {
	it('puts a chain of nodes in increasing levels', () => {
		const positions = layoutGraph({
			stages: [
				{ id: 'a', label: 'a', api: 'camera', model: '', outputs: [], derivedFrom: 'config' },
				{ id: 'b', label: 'b', api: 'camera', model: '', outputs: [], derivedFrom: 'config' },
				{ id: 'c', label: 'c', api: 'camera', model: '', outputs: [], derivedFrom: 'config' },
			],
			edges: [
				{ from: 'a', to: 'b', derivedFrom: 'config' },
				{ from: 'b', to: 'c', derivedFrom: 'config' },
			],
			warnings: [],
		})
		expect(positions.get('a')!.level).toBe(0)
		expect(positions.get('b')!.level).toBe(1)
		expect(positions.get('c')!.level).toBe(2)
	})

	it('roots have level 0', () => {
		const positions = layoutGraph({
			stages: [
				{ id: 'a', label: 'a', api: 'camera', model: '', outputs: [], derivedFrom: 'config' },
				{ id: 'b', label: 'b', api: 'camera', model: '', outputs: [], derivedFrom: 'config' },
			],
			edges: [],
			warnings: [],
		})
		expect(positions.get('a')!.level).toBe(0)
		expect(positions.get('b')!.level).toBe(0)
	})

	it('siblings at the same level get distinct ordinals', () => {
		const positions = layoutGraph({
			stages: [
				{ id: 'r', label: 'r', api: 'camera', model: '', outputs: [], derivedFrom: 'config' },
				{ id: 'a', label: 'a', api: 'camera', model: '', outputs: [], derivedFrom: 'config' },
				{ id: 'b', label: 'b', api: 'camera', model: '', outputs: [], derivedFrom: 'config' },
			],
			edges: [
				{ from: 'r', to: 'a', derivedFrom: 'config' },
				{ from: 'r', to: 'b', derivedFrom: 'config' },
			],
			warnings: [],
		})
		expect(positions.get('a')!.level).toBe(1)
		expect(positions.get('b')!.level).toBe(1)
		expect(positions.get('a')!.ordinal).not.toBe(positions.get('b')!.ordinal)
	})
})
```

- [ ] **Step 2:** Run. Expected: FAIL.

- [ ] **Step 3: Implement.**

```ts
// src/lib/pipeline/layout.ts
import type { PipelineGraph, StageId } from './types'

export interface NodePosition {
	level: number
	ordinal: number
}

export const layoutGraph = (graph: PipelineGraph): Map<StageId, NodePosition> => {
	const incoming = new Map<StageId, number>()
	const outgoing = new Map<StageId, StageId[]>()
	for (const stage of graph.stages) {
		incoming.set(stage.id, 0)
		outgoing.set(stage.id, [])
	}
	for (const edge of graph.edges) {
		incoming.set(edge.to, (incoming.get(edge.to) ?? 0) + 1)
		outgoing.get(edge.from)?.push(edge.to)
	}

	const level = new Map<StageId, number>()
	const queue: StageId[] = []
	for (const stage of graph.stages) {
		if ((incoming.get(stage.id) ?? 0) === 0) {
			level.set(stage.id, 0)
			queue.push(stage.id)
		}
	}

	const remaining = new Map(incoming)
	while (queue.length > 0) {
		const id = queue.shift()!
		const myLevel = level.get(id) ?? 0
		for (const next of outgoing.get(id) ?? []) {
			level.set(next, Math.max(level.get(next) ?? 0, myLevel + 1))
			remaining.set(next, (remaining.get(next) ?? 0) - 1)
			if ((remaining.get(next) ?? 0) === 0) queue.push(next)
		}
	}

	// Stages not reached (e.g. cycle remnants) — pin to level 0.
	for (const stage of graph.stages) {
		if (!level.has(stage.id)) level.set(stage.id, 0)
	}

	const ordinalCount = new Map<number, number>()
	const positions = new Map<StageId, NodePosition>()
	for (const stage of graph.stages) {
		const lvl = level.get(stage.id) ?? 0
		const ord = ordinalCount.get(lvl) ?? 0
		positions.set(stage.id, { level: lvl, ordinal: ord })
		ordinalCount.set(lvl, ord + 1)
	}
	return positions
}
```

- [ ] **Step 4:** Run. Expected: PASS.

- [ ] **Step 5:** Commit.

```bash
git add src/lib/pipeline/layout.ts src/lib/pipeline/__tests__/layout.spec.ts
git commit -m "feat(pipeline): topo-level DAG layout"
```

---

### Task 17: `EdgeLayer` SVG renderer + integrate into `PipelineGraph`

**Files:**
- Create: `src/lib/pipeline/EdgeLayer.svelte`
- Modify: `src/lib/pipeline/PipelineGraph.svelte`
- Modify: `src/lib/pipeline/__tests__/PipelineGraph.spec.ts`

- [ ] **Step 1: Add edge case to existing test.** Append to `PipelineGraph.spec.ts`:

```ts
it('renders an SVG path per edge', () => {
	const stages = [
		{ id: 'a', label: 'A', api: 'camera' as const, model: '', outputs: [], derivedFrom: 'config' as const },
		{ id: 'b', label: 'B', api: 'camera' as const, model: '', outputs: [], derivedFrom: 'config' as const },
	]
	const edges = [{ from: 'a', to: 'b', derivedFrom: 'config' as const }]
	const { container } = render(GraphHarness, { stages, edges, warnings: [] })
	const paths = container.querySelectorAll('svg path')
	expect(paths.length).toBe(1)
})
```

- [ ] **Step 2:** Run. Expected: FAIL.

- [ ] **Step 3: Implement `EdgeLayer.svelte`.**

```svelte
<!-- src/lib/pipeline/EdgeLayer.svelte -->
<script lang="ts">
	import type { Edge, StageId } from './types'

	import type { NodePosition } from './layout'

	interface Props {
		edges: Edge[]
		positions: Map<StageId, NodePosition>
		nodeHeight: number
		nodeGap: number
	}

	let { edges, positions, nodeHeight, nodeGap }: Props = $props()

	const nodeY = (level: number, ordinal: number): number =>
		level * (nodeHeight + nodeGap) + ordinal * (nodeHeight + nodeGap) + nodeHeight / 2
</script>

<svg
	class="pointer-events-none absolute inset-0 h-full w-full"
	aria-hidden="true"
	xmlns="http://www.w3.org/2000/svg"
>
	{#each edges as edge (edge.from + '->' + edge.to)}
		{@const from = positions.get(edge.from)}
		{@const to = positions.get(edge.to)}
		{#if from && to}
			{@const x1 = 16}
			{@const x2 = 32}
			{@const y1 = nodeY(from.level, from.ordinal)}
			{@const y2 = nodeY(to.level, to.ordinal)}
			<path
				d={`M ${x1} ${y1} C ${x2} ${y1}, ${x2} ${y2}, ${x1} ${y2}`}
				fill="none"
				stroke="#475569"
				stroke-width="1.5"
			/>
		{/if}
	{/each}
</svg>
```

- [ ] **Step 4: Update `PipelineGraph.svelte`** to compute positions and render `EdgeLayer`. Replace the `<ol>` block with:

```svelte
	{@const positions = layoutGraph(pipeline.graph())}
	{@const orderedStages = [...stages].sort((a, b) => {
		const pa = positions.get(a.id)!
		const pb = positions.get(b.id)!
		return pa.level - pb.level || pa.ordinal - pb.ordinal
	})}

	<div class="relative">
		<EdgeLayer edges={pipeline.graph().edges} {positions} nodeHeight={28} nodeGap={6} />
		<ol class="relative flex flex-col gap-1.5">
			{#each orderedStages as stage (stage.id)}
				<li>
					<StageNode {...} />
				</li>
			{/each}
		</ol>
	</div>
```

(Use the same `StageNode` props as before.)

Add at the top of the script:

```ts
	import { layoutGraph } from './layout'
	import EdgeLayer from './EdgeLayer.svelte'
```

- [ ] **Step 5:** Run `pnpm test -- src/lib/pipeline/__tests__/PipelineGraph.spec.ts`. Expected: PASS (the previously-passing tests stay green; the new edge test now passes).

- [ ] **Step 6:** Commit.

```bash
git add src/lib/pipeline/EdgeLayer.svelte src/lib/pipeline/PipelineGraph.svelte src/lib/pipeline/__tests__/PipelineGraph.spec.ts
git commit -m "feat(pipeline): SVG edge layer with topo-level layout"
```

---

## Wrap-up

### Task 18: End-to-end smoke against a live machine

By this point, Task 7 already consumes the real `partConfig`, Task 14 wires the attribute walker, and Task 17 renders edges. This task is a manual verification gate, not new code.

- [ ] **Step 1:** `pnpm dev`. Open `http://localhost:5173/pipeline?partID=<id>` against a fixture machine that has at least one transform-camera and one vision service.
- [ ] **Step 2:** Confirm:
	- Graph nodes match the machine's cameras + vision services (no arms, motors, sensors).
	- Edges from upstream cameras to transform cameras are drawn.
	- Edges from cameras to vision services are drawn (when configured via `camera_name`-shaped attributes).
	- Click a stage → only that stage's points render in scene with its tint color.
	- Shift-click a second stage → both render with distinct tints.
	- Toggle "Native colors" → original RGB returns.
	- Edit machine config (in another tab) to add a stage; the graph updates without reload.
- [ ] **Step 3:** No commit; this is a manual check. If anything fails, stop and triage; do not advance.

---

### Task 19: Playwright smoke test

**Files:**
- Create: `e2e/pipeline.test.ts`

- [ ] **Step 1:** Inspect `e2e/` for an existing test (e.g. `cat e2e/arm.test.ts`) and `cat playwright.config.ts`. Pattern-match the `goto` URL form, fixture setup, and partID handling.

- [ ] **Step 2: Add the smoke test.**

```ts
// e2e/pipeline.test.ts
import { expect, test } from '@playwright/test'

test.describe('/pipeline', () => {
	test('renders the pipeline panel and at least one stage node', async ({ page }) => {
		// Adjust partID + any auth bootstrap to match e2e/arm.test.ts
		await page.goto('/pipeline?partID=test')
		await expect(page.getByRole('complementary')).toBeVisible()
		await expect(page.getByRole('button', { name: /Pipeline|stage|camera/i }).first()).toBeVisible({
			timeout: 10_000,
		})
	})
})
```

(If the fixture machine has no cameras configured, mark this test as `test.fixme` with a TODO and revisit when a fixture exists.)

- [ ] **Step 3:** `pnpm test:e2e`. Expected: PASS or `fixme` if no fixture machine.

- [ ] **Step 4:** Commit.

```bash
git add e2e/pipeline.test.ts
git commit -m "test(pipeline): playwright smoke for /pipeline route"
```

---

### Task 20: Final verification + changeset

**Files:**
- Create: `.changeset/pipeline-view-mvp.md`

- [ ] **Step 1:** `pnpm check`. Expected: 0 errors.
- [ ] **Step 2:** `pnpm lint`. Expected: clean (or only auto-fixable warnings — apply `pnpm lint --fix` if so).
- [ ] **Step 3:** `pnpm test`. Expected: full suite green.
- [ ] **Step 4:** Add a changeset:

```markdown
---
'@viamrobotics/visualization': minor
---

Add `/pipeline` route — auto-derives the perception pipeline DAG from the machine
config and spotlights selected stages in the existing 3D scene with per-stage
color tinting.
```

(Match the package name and bump kind to repo convention; check `.changeset/` for an existing template.)

- [ ] **Step 5:** Commit.

```bash
git add .changeset/pipeline-view-mvp.md
git commit -m "chore(changeset): pipeline view MVP"
```

- [ ] **Step 6:** Run `git log --oneline main..HEAD` to confirm the commit graph reads cleanly.

---

## Summary of deferred work

These remain out-of-scope for this plan and will be addressed in follow-up plans:

- **2D preview pane** (`StagePreview2D.svelte`, `getImages` integration, detection / classification overlays) — spec phase 4.
- **Override panel + persistence** (`PipelineOverrides.svelte`, `override.ts`, localStorage per `partID`) — spec phase 5.
- `RefreshRates.images` decoupling from `RefreshRates.pointclouds`.
- `getPipelineMetadata` DoCommand convention for custom modules.
- Per-stage `transformPCD` to a common frame for compare-mode alignment (revisit only if alignment problems surface in practice).
