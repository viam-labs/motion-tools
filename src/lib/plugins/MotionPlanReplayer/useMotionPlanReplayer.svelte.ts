import type { Entity } from 'koota'

import { getContext, setContext } from 'svelte'

import type { Snapshot } from '$lib/buf/draw/v1/snapshot_pb'

import { traits, useWorld } from '$lib/ecs'
import { useRelationships } from '$lib/hooks/useRelationships.svelte'
import { reconcileSnapshotEntities, type SnapshotEntity } from '$lib/snapshot'

import { parsePlan, PlanParseError } from './parse-plan'
import { parsedPlanToSnapshots, transformBytesToSnapshots } from './plan-to-snapshots'
import * as planRelations from './relations'

const PLAN_COLOR = { r: 0, g: 0.47, b: 1 }
const PLAN_OPACITY = 0.6

// koota's `set` writes the trait's store slot but will not add an absent trait — the entity's
// mask is untouched, so `has` stays false and nothing querying the trait ever sees the value.
// Plan transforms carry no color metadata, so `Color` is always absent on spawn; `Opacity` only
// happens to be present because `drawTransform` adds it unconditionally. Guard both rather than
// depend on that.
const setOrAddColor = (entity: Entity, value: typeof PLAN_COLOR) => {
	if (entity.has(traits.Color)) entity.set(traits.Color, value)
	else entity.add(traits.Color(value))
}

const setOrAddOpacity = (entity: Entity, value: number) => {
	if (entity.has(traits.Opacity)) entity.set(traits.Opacity, value)
	else entity.add(traits.Opacity(value))
}

export interface PlanEntry {
	name: string
	content: string
}

// Only primitives here — proto objects (Snapshot[]) live outside $state to avoid Svelte 5 deep proxy
interface PlanState {
	name: string
	content: string
	status: 'idle' | 'ready' | 'error' | 'no-trajectory'
	error: string | null
	stepCount: number
}

export interface MotionPlanReplayerContext {
	readonly plans: PlanState[]
	readonly activePlanIndex: number | null
	readonly currentStep: number
	readonly totalSteps: number
	addPlan: (name: string, content: string, precomputedSnapshots?: Snapshot[]) => void
	/** Host FK / precomputed transforms as `common.v1.Transform` bytes — bridges protobuf toolchains. */
	addPlanFromTransforms: (name: string, transformsPerStep: Uint8Array[][]) => void
	removePlan: (index: number) => void
	selectPlan: (index: number) => void
	setStep: (step: number) => void
	clearActivePlan: () => void
}

const KEY = Symbol('motion-plan-replayer')

export const provideMotionPlanReplayer = (initialPlans?: PlanEntry[]) => {
	const world = useWorld()
	const relationships = useRelationships()

	// Proto objects stored here — never inside $state to avoid Svelte 5 deep proxy
	const snapshotStore = new Map<number, Snapshot[]>()

	let plans = $state<PlanState[]>(
		(initialPlans ?? []).map((e) => ({
			name: e.name,
			content: e.content,
			status: 'idle' as const,
			error: null,
			stepCount: 0,
		}))
	)
	let activePlanIndex = $state<number | null>(null)
	let currentStep = $state(0)
	let entityMap = $state.raw(new Map<string, SnapshotEntity>())
	let planEntity: Entity | undefined

	const totalSteps = $derived(
		activePlanIndex === null ? 0 : (plans[activePlanIndex]?.stepCount ?? 0)
	)

	const clearActivePlan = () => {
		if (planEntity && world.has(planEntity)) planEntity.destroy()
		planEntity = undefined
		entityMap = new Map()
		currentStep = 0
		activePlanIndex = null
	}

	const applyStep = (snapshots: Snapshot[], step: number) => {
		const snap = snapshots[step]!

		// Capture user-adjusted display config before reconcile. reconcile → updateMetadata
		// resets Opacity to default and removes Invisible/ShowAxesHelper every step, which would
		// wipe edits made via the Details panel / tree as you scrub. Color survives reconcile
		// untouched, so it only needs to not be re-forced (see the spawned block below).
		// Iterate the PartOfPlan relation (not entityMap) so child sub-entities are covered too.
		const preserved = new Map<Entity, { opacity: number; invisible: boolean; showAxes: boolean }>()
		if (planEntity) {
			for (const entity of world.query(planRelations.PartOfPlan(planEntity))) {
				preserved.set(entity, {
					opacity: entity.get(traits.Opacity) ?? 1,
					invisible: entity.has(traits.Invisible),
					showAxes: entity.has(traits.ShowAxesHelper),
				})
			}
		}

		const result = reconcileSnapshotEntities(world, snap, entityMap)

		// One spawned entry per snapshot message. Plans emit transforms only, and a
		// transform spawns exactly one childless entity — so tagging the spawned set
		// tags every entity the plan owns. Model drawings (the one case that spawns
		// ChildOf sub-entities, for GLTF assets) would need those tagged too.
		for (const spawned of result.spawned) {
			relationships.apply(spawned.entity, spawned.relationships)
			const uuid = spawned.entity.get(traits.UUID)
			if (uuid) relationships.flush(uuid)
			if (planEntity) spawned.entity.add(planRelations.PartOfPlan(planEntity))

			// Defaults land on first appearance only. Re-forcing them every step is what wiped
			// the user's Details-panel edits.
			if (!spawned.entity.has(traits.ReferenceFrame)) setOrAddColor(spawned.entity, PLAN_COLOR)
			setOrAddOpacity(spawned.entity, PLAN_OPACITY)
		}

		// Restore captured config onto entities that survived this step.
		for (const [entity, prev] of preserved) {
			if (!entity.isAlive()) continue
			setOrAddOpacity(entity, prev.opacity)
			if (prev.invisible) entity.add(traits.Invisible)
			else entity.remove(traits.Invisible)
			if (prev.showAxes) entity.add(traits.ShowAxesHelper)
			else entity.remove(traits.ShowAxesHelper)
		}

		entityMap = result.current
		currentStep = step
	}

	const setStep = (step: number) => {
		if (activePlanIndex === null) return
		const snapshots = snapshotStore.get(activePlanIndex)
		if (!snapshots || snapshots.length === 0) return
		applyStep(snapshots, Math.max(0, Math.min(snapshots.length - 1, step)))
	}

	const loadPlan = (index: number): void => {
		const planState = plans[index]
		if (!planState) return

		const stored = snapshotStore.get(index)
		if (stored) {
			activePlanIndex = index
			currentStep = 0
			if (!planEntity) planEntity = world.spawn(traits.Name(planState.name))
			applyStep(stored, 0)
			return
		}

		try {
			const plan = parsePlan(planState.content)
			const snapshots = parsedPlanToSnapshots(plan)
			if (snapshots.length === 0) {
				plans[index] = { ...planState, status: 'no-trajectory', stepCount: 0 }
				activePlanIndex = index
				return
			}
			snapshotStore.set(index, snapshots)
			plans[index] = { ...planState, status: 'ready', stepCount: snapshots.length, error: null }
			activePlanIndex = index
			currentStep = 0
			if (!planEntity) planEntity = world.spawn(traits.Name(planState.name))
			applyStep(snapshots, 0)
		} catch (error) {
			const msg = error instanceof PlanParseError ? error.message : 'Failed to parse plan.'
			console.warn('[MotionPlanReplayer] loadPlan error:', msg)
			plans[index] = { ...planState, status: 'error', error: msg }
		}
	}

	const selectPlan = (index: number): void => {
		if (activePlanIndex !== null && activePlanIndex !== index) clearActivePlan()
		loadPlan(index)
	}

	const addPlan = (name: string, content: string, precomputedSnapshots?: Snapshot[]) => {
		const index = plans.length
		if (precomputedSnapshots && precomputedSnapshots.length > 0) {
			snapshotStore.set(index, precomputedSnapshots)
		}
		plans = [
			...plans,
			{
				name,
				content,
				status: precomputedSnapshots && precomputedSnapshots.length > 0 ? 'ready' : 'idle',
				error: null,
				stepCount: precomputedSnapshots?.length ?? 0,
			},
		]
		selectPlan(index)
	}

	const addPlanFromTransforms = (name: string, transformsPerStep: Uint8Array[][]) => {
		addPlan(name, '', transformBytesToSnapshots(transformsPerStep))
	}

	const removePlan = (index: number) => {
		if (activePlanIndex === index) clearActivePlan()
		snapshotStore.delete(index)
		plans = plans.filter((_, i) => i !== index)
		if (activePlanIndex !== null && activePlanIndex > index) {
			activePlanIndex = activePlanIndex - 1
		}
	}

	const context: MotionPlanReplayerContext = {
		get plans() {
			return plans
		},
		get activePlanIndex() {
			return activePlanIndex
		},
		get currentStep() {
			return currentStep
		},
		get totalSteps() {
			return totalSteps
		},
		addPlan,
		addPlanFromTransforms,
		removePlan,
		selectPlan,
		setStep,
		clearActivePlan,
	}

	setContext<MotionPlanReplayerContext>(KEY, context)
	return context
}

export const useMotionPlanReplayer = (): MotionPlanReplayerContext => {
	const context = getContext<MotionPlanReplayerContext | undefined>(KEY)

	if (context === undefined) {
		throw new Error('useMotionPlanReplayer must be called within a <MotionPlanReplayer>')
	}

	return context
}
