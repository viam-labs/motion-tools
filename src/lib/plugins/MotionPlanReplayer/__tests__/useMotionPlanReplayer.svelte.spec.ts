import { render } from '@testing-library/svelte'
import { type Entity, type World } from 'koota'
import { UuidTool } from 'uuid-tool'
import { describe, expect, it } from 'vitest'

import { Geometry, PoseInFrame, Sphere, Transform } from '$lib/buf/common/v1/common_pb'
import { Snapshot } from '$lib/buf/draw/v1/snapshot_pb'
import { traits } from '$lib/ecs'

import type { MotionPlanReplayerContext } from '../useMotionPlanReplayer.svelte'

import gantryPlan from './__fixtures__/gantry-plan.json?raw'
import ReplayerHarness from './__fixtures__/ReplayerHarness.svelte'

interface Mounted {
	ctx: MotionPlanReplayerContext
	world: World
}

const mount = (): Mounted => {
	let mounted: Mounted | undefined
	render(ReplayerHarness, {
		onReady: (ctx: MotionPlanReplayerContext, world: World) => (mounted = { ctx, world }),
	})
	if (!mounted) throw new Error('ReplayerHarness never called onReady')
	return mounted
}

/**
 * Snapshots that say which plan they came from.
 *
 * This matters more than it looks. Cycling one fixture's snapshots across every plan makes each
 * plan's geometry byte-identical, so a test can only ever notice that it read an array of the wrong
 * *length*. Reading the wrong plan's array of the same length, which is the actual bug this module
 * had, draws a completely different robot and would go unnoticed. Naming the frame per plan and per
 * step is what lets the assertions below be about identity rather than about arithmetic.
 */
const planSnapshots = (plan: string, steps: number): Snapshot[] =>
	Array.from(
		{ length: steps },
		(_, step) =>
			new Snapshot({
				transforms: [
					new Transform({
						referenceFrame: `${plan}-frame`,
						poseInObserverFrame: new PoseInFrame({ referenceFrame: 'world' }),
						// Stable across steps and distinct across plans, matching a real plan: reconcile keys
						// on this, so repeating it is what makes a scrub update rather than respawn.
						uuid: Uint8Array.from(
							UuidTool.toBytes(`${plan}-0000-4000-8000-00000000000${step % 10}`)
						),
					}),
				],
			})
	)

const addPlans = (ctx: MotionPlanReplayerContext, lengths: number[]) => {
	for (const [i, length] of lengths.entries()) {
		ctx.addPlan(`plan-${i}`, `content-${i}`, planSnapshots(`plan-${i}`, length))
	}
}

/**
 * Which plan's geometry is actually in the world right now. The `-frame` suffix separates the
 * drawn transforms from the plan's own root entity, which carries the plan's name.
 */
const drawnFrames = (world: World): string[] =>
	world
		.query(traits.Name)
		.map((entity: Entity) => entity.get(traits.Name))
		.filter((name): name is string => typeof name === 'string' && name.endsWith('-frame'))
		.toSorted()

/** The entity drawn for a transform, as opposed to the plan root that shares the `Name` trait. */
const drawnEntity = (world: World): Entity =>
	world.query(traits.Name).find((entity) => entity.get(traits.Name)?.endsWith('-frame'))!

describe('removing a plan', () => {
	/**
	 * Snapshots used to be keyed by the plan's position in `plans`, which `removePlan` reindexes. The
	 * active plan then read whichever array had inherited its old slot, so it drew a different plan's
	 * geometry while its own step count still came from `plans[i].stepCount`.
	 *
	 * Nothing threw. `setStep` clamped against the array it had just fetched, so the read was always
	 * in range. What the user got was worse than a wrong drawing: with `currentStep` pinned to the
	 * short array's last index and `lastStepIdx` still derived from the plan's own count, `atEnd` was
	 * never true, so the scrubber's play loop re-reconciled one frame at 10 Hz forever with the
	 * counter stuck partway and every forward control still enabled.
	 */
	it('leaves the active plan reading its own snapshots, not its neighbour’s', () => {
		const { ctx, world } = mount()
		addPlans(ctx, [2, 2, 6])

		expect(ctx.activePlanIndex).toBe(2)
		expect(ctx.totalSteps).toBe(6)

		ctx.removePlan(0)

		expect(ctx.activePlanIndex).toBe(1)
		expect(ctx.totalSteps).toBe(6)
		// The identity assertion, not just the arithmetic one: plan-2 is on screen, not plan-1.
		expect(drawnFrames(world)).toEqual(['plan-2-frame'])

		ctx.setStep(5)
		expect(ctx.currentStep).toBe(5)
		expect(drawnFrames(world)).toEqual(['plan-2-frame'])
	})

	it('lets a plan that shifted down still be reselected', () => {
		const { ctx, world } = mount()
		addPlans(ctx, [2, 6, 3])

		ctx.removePlan(0)
		ctx.selectPlan(0)

		expect(ctx.plans[0]!.name).toBe('plan-1')
		expect(ctx.totalSteps).toBe(6)
		expect(drawnFrames(world)).toEqual(['plan-1-frame'])
		ctx.setStep(5)
		expect(ctx.currentStep).toBe(5)
	})

	/**
	 * The same bug in its destructive form, and the one the fix's own call site could still have had:
	 * `addPlan` computes `index = plans.length`, so after a removal that index belongs to a plan that
	 * is still loaded. Keyed by position, the new plan's snapshots overwrite the survivor's outright
	 * rather than merely being read in its place.
	 */
	it('does not overwrite a surviving plan when a new one is added after a removal', () => {
		const { ctx, world } = mount()
		addPlans(ctx, [2, 3, 7])

		ctx.removePlan(0)
		ctx.addPlan('plan-3', 'content-3', planSnapshots('plan-3', 4))

		ctx.selectPlan(1)

		expect(ctx.plans[1]!.name).toBe('plan-2')
		expect(ctx.totalSteps).toBe(7)
		expect(drawnFrames(world)).toEqual(['plan-2-frame'])
		ctx.setStep(6)
		expect(ctx.currentStep).toBe(6)
	})

	it('clears the scene when the removed plan is the active one', () => {
		const { ctx, world } = mount()
		addPlans(ctx, [2, 4])

		ctx.removePlan(1)

		expect(ctx.activePlanIndex).toBeNull()
		expect(ctx.totalSteps).toBe(0)
		expect(ctx.plans.map((p) => p.name)).toEqual(['plan-0'])
		// The removed plan's geometry goes with it rather than being left in the world.
		expect(drawnFrames(world)).toEqual([])
	})

	it('holds the index still when the removed plan sits after the active one', () => {
		const { ctx } = mount()
		addPlans(ctx, [2, 4])
		ctx.selectPlan(0)

		ctx.removePlan(1)

		expect(ctx.activePlanIndex).toBe(0)
		expect(ctx.totalSteps).toBe(2)
	})

	/**
	 * An index naming no plan now returns before anything else happens. That is not only tidiness:
	 * the id lookup needs the entry, and the shift below used to run unconditionally, so a negative
	 * or fractional index moved the active plan onto its neighbour without removing anything. Those
	 * are only reachable from outside, `removePlan` being public API through `./plugins`, but they
	 * are the same class of bug as the one this fixes.
	 */
	// The active plan is the last one so that a negative or fractional index would satisfy the
	// `activePlanIndex > index` shift. Held at index 1 instead, both compare false and the case
	// would pass whether or not the guard exists.
	it.each([
		['out of range', 7],
		['negative', -1],
		['fractional', 1.5],
	])('ignores a(n) %s index', (_label, index) => {
		const { ctx } = mount()
		addPlans(ctx, [2, 4, 6])
		expect(ctx.activePlanIndex).toBe(2)

		ctx.removePlan(index)

		expect(ctx.plans.map((p) => p.name)).toEqual(['plan-0', 'plan-1', 'plan-2'])
		expect(ctx.activePlanIndex).toBe(2)
		expect(ctx.totalSteps).toBe(6)
	})
})

describe('plan identity', () => {
	/**
	 * Ids, not names, are what the store and the panel's `{#each}` key on. Names are only deduplicated
	 * on the upload path, so `addPlan` and the `plans` prop can both produce a collision, and a
	 * duplicate `{#each}` key throws in production builds as well as in dev.
	 */
	it('gives two plans with the same name distinct ids', () => {
		const { ctx } = mount()
		ctx.addPlan('same.json', 'content-a', planSnapshots('plan-a', 2))
		ctx.addPlan('same.json', 'content-b', planSnapshots('plan-b', 5))

		const [first, second] = ctx.plans
		expect(first!.id).not.toBe(second!.id)

		// And they keep their own snapshots, which is the whole point of the id.
		ctx.selectPlan(0)
		expect(ctx.totalSteps).toBe(2)
		ctx.selectPlan(1)
		expect(ctx.totalSteps).toBe(5)
	})

	/**
	 * Every other test hands `addPlan` precomputed snapshots, which is the hosted path. Without a
	 * `resolvePlanSnapshots` the plan is parsed here instead, and that branch is the one that writes
	 * the store itself and rewrites `plans[index]` through a spread. The spread has to carry the id
	 * across, or the plan is left pointing at snapshots it can no longer find.
	 */
	it('keys a plan it parsed itself the same way, without landing on a live plan', () => {
		const { ctx, world } = mount()
		// A removal first, so the parsed plan's position and its id genuinely differ. Added straight
		// into an untouched list the two coincide, and keying by either one would pass.
		addPlans(ctx, [2, 3])
		ctx.removePlan(0)
		ctx.addPlan('gantry.json', gantryPlan)

		expect(ctx.plans.map((p) => p.name)).toEqual(['plan-1', 'gantry.json'])
		expect(ctx.plans[1]!.status).toBe('ready')
		expect(ctx.totalSteps).toBe(2)

		// plan-1 now sits at the position the parsed plan was written from. Its snapshots have to be
		// untouched, which is the same corruption as the one above, on the branch that parses.
		ctx.selectPlan(0)

		expect(ctx.totalSteps).toBe(3)
		expect(drawnFrames(world)).toEqual(['plan-1-frame'])
	})
})

describe('scrubbing', () => {
	it.each([
		['below the first step', -3, 0],
		['past the last step', 99, 5],
	])('clamps a seek %s', (_label, requested, expected) => {
		const { ctx } = mount()
		addPlans(ctx, [6])

		ctx.setStep(requested)

		expect(ctx.currentStep).toBe(expected)
	})

	it('rewinds when the active plan is cleared', () => {
		const { ctx, world } = mount()
		addPlans(ctx, [6])
		ctx.setStep(3)

		ctx.clearActivePlan()

		expect(ctx.currentStep).toBe(0)
		expect(ctx.activePlanIndex).toBeNull()
		expect(drawnFrames(world)).toEqual([])
	})

	/**
	 * Reconcile runs `updateMetadata` on every step, which resets `Opacity` to its default and drops
	 * `Invisible` / `ShowAxesHelper`. Without the capture-and-restore around it, scrubbing wipes
	 * whatever the user set from the Details panel or the tree, one frame at a time. That is a
	 * regression this module has already had once, and nothing was holding it.
	 */
	it('keeps display edits made while scrubbing', () => {
		const { ctx, world } = mount()
		addPlans(ctx, [4])

		const entity = drawnEntity(world)
		entity.set(traits.Opacity, 0.25)
		entity.add(traits.Invisible)
		entity.add(traits.ShowAxesHelper)

		ctx.setStep(1)
		ctx.setStep(2)

		expect(entity.isAlive()).toBe(true)
		expect(entity.get(traits.Opacity)).toBeCloseTo(0.25)
		expect(entity.has(traits.Invisible)).toBe(true)
		expect(entity.has(traits.ShowAxesHelper)).toBe(true)
	})
})

describe('display defaults', () => {
	/**
	 * `setOrAddColor` used to be a local reimplementation of `setOrAddTrait`; the spawn path now
	 * calls the shared helper directly. Plan transforms carry no color metadata, so this is the
	 * "entity doesn't have the trait yet" branch `setOrAddTrait` exists for — the one koota's own
	 * `entity.set` would write into an unallocated store slot and lose silently, since `has()`
	 * would stay false and no query would ever see it.
	 *
	 * Needs a `physicalObject` on the transform: `drawTransform` only pushes `traits.Geometry`
	 * (here, `Sphere`) when one is present, and `applyStep` only colors entities that got real
	 * geometry rather than the bare `ReferenceFrame` marker — `planSnapshots` above omits it, so it
	 * can't be reused for this one.
	 */
	it('colors a freshly spawned plan entity even though Color is always absent on spawn', () => {
		const { ctx, world } = mount()
		ctx.addPlan('plan-0', 'content-0', [
			new Snapshot({
				transforms: [
					new Transform({
						referenceFrame: 'plan-0-frame',
						poseInObserverFrame: new PoseInFrame({ referenceFrame: 'world' }),
						physicalObject: new Geometry({
							geometryType: { case: 'sphere', value: new Sphere({ radiusMm: 10 }) },
						}),
						uuid: Uint8Array.from(UuidTool.toBytes('plan-0-0000-4000-8000-000000000000')),
					}),
				],
			}),
		])

		const entity = drawnEntity(world)

		expect(entity.has(traits.Color)).toBe(true)
		expect(entity.get(traits.Color)).toEqual({ r: 0, g: 0.47, b: 1 })
	})
})
