import { getContext, setContext } from 'svelte'

import type { Snapshot } from '$lib/buf/draw/v1/snapshot_pb'

import { hierarchy, traits, useWorld } from '$lib/ecs'
import { useRelationships } from '$lib/hooks/useRelationships.svelte'
import { reconcileSnapshotEntities, type SnapshotEntity } from '$lib/snapshot'

import { PlanParseError } from './parse-plan'
import { planJsonToSnapshots } from './plan-to-snapshots'

export interface PlanEntry {
	name: string
	content: string
}

interface PlanState {
	entry: PlanEntry
	snapshots: Snapshot[] | null
	status: 'idle' | 'loading' | 'ready' | 'error' | 'no-trajectory'
	error: string | null
}

interface MotionPlanReplayerContext {
	readonly plans: PlanState[]
	readonly activePlanIndex: number | null
	readonly currentStep: number
	readonly totalSteps: number
	addPlan: (name: string, content: string, precomputedSnapshots?: Snapshot[]) => void
	removePlan: (index: number) => void
	selectPlan: (index: number) => Promise<void>
	setStep: (step: number) => void
	clearActivePlan: () => void
}

const KEY = Symbol('motion-plan-replayer')

export const provideMotionPlanReplayer = (initialPlans?: PlanEntry[]) => {
	const world = useWorld()
	const relationships = useRelationships()

	let plans = $state<PlanState[]>(
		(initialPlans ?? []).map((e) => ({
			entry: e,
			snapshots: null,
			status: 'idle' as const,
			error: null,
		}))
	)
	let activePlanIndex = $state<number | null>(null)
	let currentStep = $state(0)
	let entityMap = $state.raw(new Map<string, SnapshotEntity>())

	const totalSteps = $derived(
		activePlanIndex === null ? 0 : (plans[activePlanIndex]?.snapshots?.length ?? 0)
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
		const result = reconcileSnapshotEntities(world, snapshots[step]!, entityMap)
		for (const spawned of result.spawned) {
			relationships.apply(spawned.entity, spawned.relationships)
			const uuid = spawned.entity.get(traits.UUID)
			if (uuid) relationships.flush(uuid)
		}
		entityMap = result.current
		currentStep = step
	}

	const setStep = (step: number) => {
		if (activePlanIndex === null) return
		const snapshots = plans[activePlanIndex]?.snapshots
		if (!snapshots || snapshots.length === 0) return
		applyStep(snapshots, Math.max(0, Math.min(snapshots.length - 1, step)))
	}

	const loadPlan = (index: number): void => {
		const planState = plans[index]
		if (!planState) return

		if (planState.snapshots) {
			activePlanIndex = index
			currentStep = 0
			applyStep(planState.snapshots, 0)
			return
		}

		try {
			const snapshots = planJsonToSnapshots(planState.entry.content)
			if (snapshots.length === 0) {
				plans[index] = { ...planState, snapshots: [], status: 'no-trajectory', error: null }
				activePlanIndex = index
				return
			}
			plans[index] = { ...planState, snapshots, status: 'ready', error: null }
			activePlanIndex = index
			currentStep = 0
			applyStep(snapshots, 0)
		} catch (error) {
			const msg = error instanceof PlanParseError ? error.message : 'Failed to parse plan.'
			plans[index] = { ...planState, status: 'error', error: msg }
		}
	}

	const selectPlan = async (index: number): Promise<void> => {
		if (activePlanIndex !== null && activePlanIndex !== index) clearActivePlan()
		loadPlan(index)
	}

	const addPlan = (name: string, content: string, precomputedSnapshots?: Snapshot[]) => {
		plans = [
			...plans,
			{
				entry: { name, content },
				snapshots: precomputedSnapshots ?? null,
				status: precomputedSnapshots ? 'ready' : 'idle',
				error: null,
			},
		]
	}

	const removePlan = (index: number) => {
		if (activePlanIndex === index) clearActivePlan()
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
