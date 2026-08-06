import { describe, expect, it } from 'vitest'

import type { JointMotions } from '../interpolateTrajectory'
import type { TrajectoryStep } from '../jointPose'

import {
	DEFAULT_DEGREES_PER_FRAME,
	interpolatedFrames,
	jointMotionsOf,
	jointTravelRadians,
	lerpTrajectoryStep,
	segmentFrameCost,
	waypointFrames,
} from '../interpolateTrajectory'
import freeSpacePlan from './__fixtures__/plan-free-space.json'
import gantryPlan from './__fixtures__/plan-gantry.json'
import linearPlan from './__fixtures__/plan-linear-constrained.json'
import obstaclePlan from './__fixtures__/plan-synthetic-obstacle-routed.json'

const RAD_TO_DEG = 180 / Math.PI

/**
 * The density regimes the planner produces, which is what the frame allocation has to survive:
 *
 *   free space          2 steps,   one 270° segment
 *   linear-constrained  225 steps, 0.53°–7.6° segments
 *   obstacle-routed     21 steps,  0.00°–78.5° segments
 *   gantry              2 steps,   40 mm on one prismatic axis
 *
 * Three of the four are real `plan` replies — the gantry one is lifted from `gantry-plan.json`, the
 * replayer's own capture of the same rig.
 *
 * `plan-linear-constrained.json` is a capture from a real arm and is stored **minified at 6 decimal
 * places**, which is why it is in `.prettierignore`: pretty-printed it is 2,000 lines, and no
 * assertion here reads past three. Regenerate it from a capture rather than editing it by hand.
 *
 * `plan-synthetic-obstacle-routed.json` is **not** a faithful capture, and is named so it cannot be
 * mistaken for one: it carries two distinct key sets across its 21 steps, where a real reply carries
 * one. RDK's `ToFrameSystemInputs` iterates a per-plan schema, so every node of one plan serializes
 * the same keys, as all the other captures here do. It is still a useful density fixture — the
 * segment lengths are what these rules were built against — but any claim resting on its *shape*
 * needs a recapture from a live machine first.
 */
const plans = {
	freeSpace: freeSpacePlan.plan as TrajectoryStep[],
	linear: linearPlan.plan as TrajectoryStep[],
	obstacle: obstaclePlan.plan as TrajectoryStep[],
	gantry: gantryPlan.plan as TrajectoryStep[],
}

/** The gantry rig's one prismatic axis; everything else in these fixtures is revolute. */
const GANTRY_MOTIONS: JointMotions = new Map([['gantry-1', ['translational'] as const]])

const segmentDegrees = (trajectory: TrajectoryStep[]) =>
	trajectory
		.slice(1)
		.map((step, index) => jointTravelRadians(trajectory[index]!, step) * RAD_TO_DEG)

describe('captured plans still have the shape these rules were built for', () => {
	it.each([
		['freeSpace', 2, 269, 271],
		['linear', 225, 7, 8],
		['obstacle', 21, 78, 79],
	] as const)('%s: %i steps, worst segment between %i° and %i°', (key, steps, lower, upper) => {
		const trajectory = plans[key]
		expect(trajectory).toHaveLength(steps)

		const worst = Math.max(...segmentDegrees(trajectory))
		expect(worst).toBeGreaterThan(lower)
		expect(worst).toBeLessThan(upper)
	})

	// Every obstacle-routed plan measured contained one. Dividing a segment by its own length is the
	// obvious implementation and it would produce NaN here.
	it('obstacle plans contain a zero-length segment', () => {
		expect(segmentDegrees(plans.obstacle).filter((d) => d === 0)).not.toHaveLength(0)
	})
})

describe('jointTravelRadians', () => {
	it('reports the largest single-joint change, not the sum', () => {
		const travel = jointTravelRadians({ arm: [0, 0, 0] }, { arm: [0.1, 0.5, -0.2] })
		expect(travel).toBeCloseTo(0.5)
	})

	// Raw and unit-blind by design: this is RDK's `InputsLinfDistance`, which compares configurations
	// rather than budgets frames. `segmentFrameCost` is the one that has to know about units.
	it('spans every component in the step', () => {
		const travel = jointTravelRadians({ arm: [0.1], gantry: [2] }, { arm: [0.2], gantry: [0] })
		expect(travel).toBeCloseTo(2)
	})

	it('ignores the zero-DoF frames a real trajectory carries', () => {
		// Captured plans include `arm_origin`, `table`, `table_origin` with empty inputs.
		const travel = jointTravelRadians({ arm: [1], table: [] }, { arm: [1.5], table: [] })
		expect(travel).toBeCloseTo(0.5)
	})
})

describe('lerpTrajectoryStep', () => {
	const from: TrajectoryStep = { arm: [0, 10] }
	const to: TrajectoryStep = { arm: [1, -10] }

	it.each([
		[0, [0, 10]],
		[0.5, [0.5, 0]],
		[1, [1, -10]],
	])('blends each joint at t=%s', (t, expected) => {
		expect(lerpTrajectoryStep(from, to, t).arm).toEqual(expected)
	})

	it('leaves the endpoints untouched', () => {
		lerpTrajectoryStep(from, to, 0.5)
		expect(from.arm).toEqual([0, 10])
		expect(to.arm).toEqual([1, -10])
	})

	it.each([
		['only the start', { arm: [5] }, {}],
		['only the end', {}, { arm: [5] }],
	])('holds a component present in %s', (_label, start, end) => {
		expect(lerpTrajectoryStep(start, end, 0.5).arm).toEqual([5])
	})

	// RDK's joint values are continuous and unwrapped, so a joint that keeps turning past π reads as
	// 3.2 rather than -3.08; blending straight is what tracks it.
	it('blends across ±π the long way, as the unwrapped values ask', () => {
		expect(lerpTrajectoryStep({ arm: [3] }, { arm: [3.4] }, 0.5).arm![0]).toBeCloseTo(3.2)
	})
})

describe('waypointFrames', () => {
	it('plays the planner`s waypoints and nothing else', () => {
		const frames = waypointFrames(plans.obstacle)
		expect(frames.steps).toBe(plans.obstacle)
		expect(frames.waypoints).toHaveLength(plans.obstacle.length)
	})
})

describe('interpolatedFrames', () => {
	it.each(['freeSpace', 'linear', 'obstacle'] as const)(
		'keeps every planned waypoint of the %s plan, in order',
		(key) => {
			const planned = plans[key]
			const { steps, waypoints } = interpolatedFrames(planned)

			expect(waypoints).toHaveLength(planned.length)
			// Interpolation only ever adds between waypoints — the plan survives verbatim inside the
			// frames, which is what lets `execute` and the preview describe the same motion.
			for (const [index, frame] of waypoints.entries()) {
				expect(steps[frame]).toEqual(planned[index])
			}
			expect(waypoints[0]).toBe(0)
			expect(waypoints.at(-1)).toBe(steps.length - 1)
		}
	)

	it.each(['freeSpace', 'linear', 'obstacle'] as const)(
		'holds the %s plan to the requested resolution',
		(key) => {
			const { steps } = interpolatedFrames(plans[key])
			const worst = Math.max(...segmentDegrees(steps))

			// Allowing a hair over: a segment is split into a whole number of frames, so the last one
			// lands on or under the target rather than exactly at it.
			expect(worst).toBeLessThanOrEqual(DEFAULT_DEGREES_PER_FRAME + 0.001)
		}
	)

	it('turns the free-space teleport into a sweep', () => {
		// The regime that made raw playback unusable: one segment, 270° of travel, two frames.
		expect(plans.freeSpace).toHaveLength(2)
		expect(interpolatedFrames(plans.freeSpace).steps.length).toBeGreaterThan(150)
	})

	it('leaves an already-dense plan essentially alone', () => {
		// 225 steps at a median of 0.69° are finer than the resolution, so almost nothing is added.
		// A fixed subdivision multiplier would have turned this into thousands of frames.
		const { steps } = interpolatedFrames(plans.linear)
		expect(steps.length).toBeLessThan(plans.linear.length * 1.1)
	})

	it('spends frames where the motion is, not where the waypoints are', () => {
		const planned = plans.obstacle
		const { waypoints } = interpolatedFrames(planned)

		const segments = segmentDegrees(planned).map((degrees, index) => ({
			degrees,
			frames: waypoints[index + 1]! - waypoints[index]!,
		}))

		const longest = segments.toSorted((a, b) => b.degrees - a.degrees)[0]!
		const zeroLength = segments.find((segment) => segment.degrees === 0)!

		// The whole point: playing this plan one-frame-per-waypoint gives the 78° segment and the
		// 0° segment the same screen time.
		expect(longest.frames).toBeGreaterThan(40)
		expect(zeroLength.frames).toBe(1)
	})

	it('coarsens rather than truncates when the frame cap binds', () => {
		const { steps, waypoints, coarsening } = interpolatedFrames(plans.linear, { degrees: 0.0001 })

		expect(coarsening).toBeGreaterThan(1)
		// The cap bounds interpolation; each planned waypoint keeps its own frame regardless, so the
		// ceiling is the budget plus the plan's own length.
		expect(steps.length).toBeLessThanOrEqual(2000 + plans.linear.length)
		// The motion still runs end to end; only the sampling got coarser.
		expect(steps.at(-1)).toEqual(plans.linear.at(-1))
		expect(waypoints).toHaveLength(plans.linear.length)
	})

	it.each([
		['an empty plan', []],
		['a single-step plan', [{ arm: [0] }]],
	])('returns %s unchanged', (_label, planned) => {
		expect(interpolatedFrames(planned).steps).toBe(planned)
	})
})

/**
 * A millimetre and a radian are not the same size, and the budget used to be spent as though they
 * were: one raw max across both units, then multiplied by 180/π. One millimetre outweighed one
 * radian by 57×, so any prismatic stroke past a few millimetres swallowed the whole allowance.
 *
 * `plan-gantry.json` is the repo's own capture, lifted out of `gantry-plan.json`: a 40 mm slide with
 * the arm held still. It came to 1529 frames — 24 seconds of playback against a documented 4 second
 * target — and a longer stroke alongside real arm motion collapsed every 10° arm segment to a single
 * frame, violating the resolution guarantee asserted above.
 */
describe('a plan with a prismatic joint in it', () => {
	it('spends a sane number of frames on a 40 mm slide', () => {
		const { steps } = interpolatedFrames(plans.gantry, { motions: GANTRY_MOTIONS })

		expect(steps.length).toBeLessThan(60)
		expect(steps.length).toBeGreaterThan(2)
	})

	/**
	 * The stroke and the arm motion in *separate* segments, which is where the damage was. Read as
	 * radians, 500 mm is 28 648° — enough on its own to blow the frame cap — so the whole plan was
	 * coarsened to 14.33° per frame and the 12° arm segment that followed collapsed into one frame.
	 * That figure violates the resolution guarantee the block above asserts.
	 */
	it('lets the arm keep its own resolution when a long stroke shares the plan', () => {
		const together: TrajectoryStep[] = [
			{ 'arm-1': [0], 'gantry-1': [0] },
			{ 'arm-1': [0], 'gantry-1': [500] },
			{ 'arm-1': [(12 * Math.PI) / 180], 'gantry-1': [500] },
		]

		const { steps, waypoints } = interpolatedFrames(together, { motions: GANTRY_MOTIONS })
		// `segmentDegrees` is unit-blind by design, so read the arm's column on its own.
		const armDegrees = segmentDegrees(steps.map((step) => ({ 'arm-1': step['arm-1']! })))

		expect(waypoints[2]! - waypoints[1]!).toBeGreaterThan(1)
		expect(Math.max(...armDegrees)).toBeLessThanOrEqual(DEFAULT_DEGREES_PER_FRAME + 0.001)
	})

	// Without the metadata every column is read as radians, which is what the captured plans are and
	// what keeps this a widening rather than a change of default.
	it('reads an unlabelled joint as revolute', () => {
		const unlabelled = interpolatedFrames(plans.gantry)
		const labelled = interpolatedFrames(plans.gantry, { motions: GANTRY_MOTIONS })

		expect(unlabelled.steps.length).toBeGreaterThan(labelled.steps.length)
	})
})

describe('segmentFrameCost', () => {
	it('costs a revolute joint by the degree budget', () => {
		const cost = segmentFrameCost({ arm: [0] }, { arm: [Math.PI / 2] }, { degrees: 1.5 })
		expect(cost).toBeCloseTo(60)
	})

	it('costs a prismatic joint by the millimetre budget', () => {
		const motions: JointMotions = new Map([['gantry', ['translational'] as const]])
		const cost = segmentFrameCost({ gantry: [0] }, { gantry: [40] }, { millimetres: 5, motions })

		expect(cost).toBeCloseTo(8)
	})

	it('takes the costliest joint, so the two units never add up', () => {
		const motions: JointMotions = new Map([['gantry', ['translational'] as const]])
		const cost = segmentFrameCost(
			{ arm: [0], gantry: [0] },
			{ arm: [Math.PI / 2], gantry: [40] },
			{ degrees: 1.5, millimetres: 5, motions }
		)

		expect(cost).toBeCloseTo(60)
	})
})

describe('jointMotionsOf', () => {
	it('indexes each joint the way a trajectory step does', () => {
		const motions = jointMotionsOf([
			{
				kind: 'joint',
				motion: 'translational',
				name: 'gantry:axis',
				parent: 'world',
				axis: { X: 1, Y: 0, Z: 0 },
				componentName: 'gantry',
				jointIndex: 0,
				uuid: new Uint8Array(16) as Uint8Array<ArrayBuffer>,
			},
			{
				kind: 'joint',
				motion: 'rotational',
				name: 'arm:waist',
				parent: 'world',
				axis: { X: 0, Y: 0, Z: 1 },
				componentName: 'arm',
				jointIndex: 1,
				uuid: new Uint8Array(16) as Uint8Array<ArrayBuffer>,
			},
		])

		expect(motions.get('gantry')).toEqual(['translational'])
		expect(motions.get('arm')?.[1]).toBe('rotational')
	})
})
