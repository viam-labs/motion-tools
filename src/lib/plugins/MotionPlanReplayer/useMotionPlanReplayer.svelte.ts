import type { Entity } from 'koota'

import { getContext, setContext } from 'svelte'

import type { Snapshot } from '$lib/buf/draw/v1/snapshot_pb'

import { uuidBytesToString } from '$lib/draw'
import { hierarchy, relations, traits, useWorld } from '$lib/ecs'
import { useRelationships } from '$lib/hooks/useRelationships.svelte'
import { reconcileSnapshotEntities, type SnapshotEntity } from '$lib/snapshot'

import { PlanParseError } from './parse-plan'
import { planJsonToSnapshots } from './plan-to-snapshots'

const PLAN_COLOR = { r: 0, g: 0.47, b: 1 }
const PLAN_OPACITY = 0.6

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

interface MotionPlanReplayerContext {
	readonly plans: PlanState[]
	readonly activePlanIndex: number | null
	readonly currentStep: number
	readonly totalSteps: number
	addPlan: (name: string, content: string, precomputedSnapshots?: Snapshot[]) => void
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

	const totalSteps = $derived(
		activePlanIndex === null ? 0 : (plans[activePlanIndex]?.stepCount ?? 0)
	)

	const clearActivePlan = () => {
		for (const entry of entityMap.values()) {
			if (world.has(entry.entity)) hierarchy.destroyEntityTree(world, entry.entity)
		}
		entityMap = new Map()
		currentStep = 0
		activePlanIndex = null
	}

	const applyStep = (snapshots: Snapshot[], step: number) => {
		console.debug('[MotionPlanReplayer] applyStep', step, '/', snapshots.length)
		const snap = snapshots[step]!

		// Debug: check first transform's UUID before reconciling
		const t0 = snap.transforms[0]
		console.debug(
			'[MotionPlanReplayer] first transform name:',
			t0?.referenceFrame,
			'uuid bytes:',
			t0?.uuid?.length,
			'uuid str:',
			uuidBytesToString(t0?.uuid)
		)

		// Capture user-modified opacity and visibility before reconcile.
		// updateTransform → updateMetadata unconditionally resets Opacity to DEFAULT (1.0)
		// and removes Invisible — both of which erase user changes made via the legend.
		// We restore the captured state on updated entities after reconcile.
		type EntityState = { opacity: number; invisible: boolean }
		const preserved = new Map<Entity, EntityState>()
		for (const entry of entityMap.values()) {
			if (!entry.entity.isAlive()) continue
			preserved.set(entry.entity, {
				opacity: entry.entity.get(traits.Opacity) ?? 1,
				invisible: entry.entity.has(traits.Invisible),
			})
		}

		const result = reconcileSnapshotEntities(world, snap, entityMap)
		console.debug(
			'[MotionPlanReplayer] reconcile — spawned:',
			result.spawned.length,
			'updated:',
			result.updated.length,
			'unkeyed:',
			result.unkeyed.length
		)

		for (const spawned of result.spawned) {
			relationships.apply(spawned.entity, spawned.relationships)
			const uuid = spawned.entity.get(traits.UUID)
			if (uuid) relationships.flush(uuid)
		}
		entityMap = result.current

		// Spawned entities (first appearance): apply plan defaults.
		// Apply color only to geometry entities; apply opacity to all plan entities
		// so that reference frame entities also start at the plan opacity (not 1.0).
		for (const entry of result.spawned) {
			if (!entry.entity.isAlive()) continue
			if (!entry.entity.has(traits.ReferenceFrame)) {
				if (entry.entity.has(traits.Color)) {
					entry.entity.set(traits.Color, PLAN_COLOR)
				} else {
					entry.entity.add(traits.Color(PLAN_COLOR))
				}
			}
			entry.entity.set(traits.Opacity, PLAN_OPACITY)
		}

		// Updated entities: restore the opacity and visibility the user had before
		// this step, undoing updateMetadata's reset.
		for (const entry of result.updated) {
			const prev = preserved.get(entry.entity)
			if (!prev) continue
			entry.entity.set(traits.Opacity, prev.opacity)
			if (prev.invisible) {
				entry.entity.add(traits.Invisible)
			} else {
				entry.entity.remove(traits.Invisible)
			}
		}

		// Debug: check orphan vs ChildOf status for a few arm entities
		let orphaned = 0,
			parented = 0
		for (const entry of result.current.values()) {
			if (!entry.entity.isAlive()) continue
			if (entry.entity.has(traits.Orphan)) orphaned++
			if (entry.entity.targetFor(relations.ChildOf)) parented++
		}
		console.debug(
			'[MotionPlanReplayer] after step:',
			orphaned,
			'orphans,',
			parented,
			'with ChildOf, total:',
			result.current.size
		)

		if (step === 0) {
			console.debug('[MotionPlanReplayer] step 0 entity inventory:')
			for (const [uuid, entry] of result.current) {
				const { entity } = entry
				if (!entity.isAlive()) continue
				const name = entity.get(traits.Name) ?? '(no name)'
				const isRef = entity.has(traits.ReferenceFrame)
				const isOrphan = entity.has(traits.Orphan)
				const orphanTarget = isOrphan ? entity.get(traits.Orphan) : undefined
				const hasChildOf = entity.targetFor(relations.ChildOf) !== undefined
				const mat = entity.get(traits.Matrix)
				const tx = mat?.elements[12]?.toFixed(1) ?? '?'
				const ty = mat?.elements[13]?.toFixed(1) ?? '?'
				const tz = mat?.elements[14]?.toFixed(1) ?? '?'
				console.debug(
					` ${name}`,
					isRef ? '[ref-frame]' : '[geometry]',
					`| pos(${tx}, ${ty}, ${tz})`,
					hasChildOf ? '| ChildOf:✓' : `| Orphan→${orphanTarget ?? '?'}`,
					`| uuid:${uuid.slice(0, 8)}`
				)
			}
		}

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
		if (!planState) {
			console.debug('[MotionPlanReplayer] loadPlan: no planState at index', index)
			return
		}

		const stored = snapshotStore.get(index)
		if (stored) {
			console.debug('[MotionPlanReplayer] loadPlan: using cached snapshots', stored.length)
			activePlanIndex = index
			currentStep = 0
			applyStep(stored, 0)
			return
		}

		console.debug('[MotionPlanReplayer] loadPlan: parsing on demand for', planState.name)
		try {
			const snapshots = planJsonToSnapshots(planState.content)
			console.debug('[MotionPlanReplayer] loadPlan: parsed', snapshots.length, 'steps')
			if (snapshots.length === 0) {
				plans[index] = { ...planState, status: 'no-trajectory', stepCount: 0 }
				activePlanIndex = index
				return
			}
			snapshotStore.set(index, snapshots)
			plans[index] = { ...planState, status: 'ready', stepCount: snapshots.length, error: null }
			activePlanIndex = index
			currentStep = 0
			applyStep(snapshots, 0)
		} catch (error) {
			const msg = error instanceof PlanParseError ? error.message : 'Failed to parse plan.'
			console.warn('[MotionPlanReplayer] loadPlan error:', msg)
			plans[index] = { ...planState, status: 'error', error: msg }
		}
	}

	const selectPlan = (index: number): void => {
		console.debug('[MotionPlanReplayer] selectPlan', index, 'active:', activePlanIndex)
		if (activePlanIndex !== null && activePlanIndex !== index) clearActivePlan()
		loadPlan(index)
		console.debug(
			'[MotionPlanReplayer] after loadPlan — activePlanIndex:',
			activePlanIndex,
			'totalSteps:',
			totalSteps
		)
	}

	const addPlan = (name: string, content: string, precomputedSnapshots?: Snapshot[]) => {
		const index = plans.length
		console.debug(
			'[MotionPlanReplayer] addPlan',
			name,
			'snapshots:',
			precomputedSnapshots?.length ?? 0
		)
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
		console.debug(
			'[MotionPlanReplayer] plans now:',
			plans.length,
			'stepCount:',
			plans[index]?.stepCount
		)
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
		removePlan,
		selectPlan,
		setStep,
		clearActivePlan,
	}

	setContext<MotionPlanReplayerContext>(KEY, context)
	return context
}

export const useMotionPlanReplayer = (): MotionPlanReplayerContext =>
	getContext<MotionPlanReplayerContext>(KEY)
