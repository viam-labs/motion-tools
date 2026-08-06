import '@testing-library/jest-dom/vitest'
import { render } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'

import type { Snapshot } from '$lib/buf/draw/v1/snapshot_pb'

import type { MotionPlanReplayerContext } from '../useMotionPlanReplayer.svelte'

import { parsePlan } from '../parse-plan'
import { parsedPlanToSnapshots } from '../plan-to-snapshots'
import gantryPlan from './__fixtures__/gantry-plan.json?raw'
import ReplayerHarness from './__fixtures__/ReplayerHarness.svelte'

const mount = (): MotionPlanReplayerContext => {
	let ctx!: MotionPlanReplayerContext
	render(ReplayerHarness, { onReady: (c: MotionPlanReplayerContext) => (ctx = c) })
	return ctx
}

/**
 * Real snapshots, cycled to whatever length the test needs: what matters below is how many steps a
 * plan has relative to its neighbours, and reconcile keys on `Transform.uuid` so repeats are simply
 * re-applied.
 */
const stepsOfLength = (length: number): Snapshot[] => {
	const base = parsedPlanToSnapshots(parsePlan(gantryPlan))
	return Array.from({ length }, (_, i) => base[i % base.length]!)
}

const addPlans = (ctx: MotionPlanReplayerContext, lengths: number[]) => {
	for (const [i, length] of lengths.entries()) {
		ctx.addPlan(`plan-${i}`, `content-${i}`, stepsOfLength(length))
	}
}

describe('removing a plan', () => {
	/**
	 * Snapshots used to be keyed by the plan's position in `plans`, which `removePlan` reindexes. The
	 * active plan then read whichever array had inherited its old slot: shorter, and the step the
	 * player clamped to (against the *plan's* step count) ran off the end of it, so reconcile was
	 * handed `undefined` and threw out of whatever input handler got there.
	 */
	it('leaves the active plan reading its own snapshots, not its neighbour’s', () => {
		const ctx = mount()
		addPlans(ctx, [2, 2, 6])

		expect(ctx.activePlanIndex).toBe(2)
		expect(ctx.totalSteps).toBe(6)

		ctx.removePlan(0)

		expect(ctx.activePlanIndex).toBe(1)
		expect(ctx.totalSteps).toBe(6)

		ctx.setStep(5)
		expect(ctx.currentStep).toBe(5)
	})

	it('lets a plan that shifted down still be reselected', () => {
		const ctx = mount()
		addPlans(ctx, [2, 6, 3])

		ctx.removePlan(0)
		ctx.selectPlan(0)

		expect(ctx.plans[0]!.name).toBe('plan-1')
		expect(ctx.totalSteps).toBe(6)
		ctx.setStep(5)
		expect(ctx.currentStep).toBe(5)
	})

	it('clears the scene when the removed plan is the active one', () => {
		const ctx = mount()
		addPlans(ctx, [2, 4])

		ctx.removePlan(1)

		expect(ctx.activePlanIndex).toBeNull()
		expect(ctx.totalSteps).toBe(0)
		expect(ctx.plans.map((p) => p.name)).toEqual(['plan-0'])
	})

	it('holds the index still when the removed plan sits after the active one', () => {
		const ctx = mount()
		addPlans(ctx, [2, 4])
		ctx.selectPlan(0)

		ctx.removePlan(1)

		expect(ctx.activePlanIndex).toBe(0)
		expect(ctx.totalSteps).toBe(2)
	})

	it('ignores an index that names no plan', () => {
		const ctx = mount()
		addPlans(ctx, [2])

		ctx.removePlan(7)

		expect(ctx.plans).toHaveLength(1)
		expect(ctx.activePlanIndex).toBe(0)
	})
})
