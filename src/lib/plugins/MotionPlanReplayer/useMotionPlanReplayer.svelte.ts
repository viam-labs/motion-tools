import { getContext, setContext } from 'svelte'

import type { Snapshot } from '$lib/buf/draw/v1/snapshot_pb'

import { parsePlan, PlanParseError } from './parse-plan'
import { parsedPlanToSnapshots } from './plan-to-snapshots'

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
	addPlan: (name: string, content: string, precomputedSnapshots?: Snapshot[]) => void
	removePlan: (index: number) => void
	selectPlan: (index: number) => void
	clearActivePlan: () => void
}

const KEY = Symbol('motion-plan-replayer')

export const provideMotionPlanReplayer = (initialPlans?: PlanEntry[]) => {
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

	const clearActivePlan = () => {
		activePlanIndex = null
	}

	const loadPlan = (index: number): void => {
		const planState = plans[index]
		if (!planState) return

		if (snapshotStore.has(index)) {
			activePlanIndex = index
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
		addPlan,
		removePlan,
		selectPlan,
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
