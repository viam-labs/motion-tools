import { describe, expect, it } from 'vitest'

import { Pose } from '$lib/math'

import type { FrameDescriptor } from '../frameDescriptors'
import type { JointMotion, JointMotions } from '../interpolateTrajectory'
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
 * `plan-synthetic-obstacle-routed.json` keeps its name, but the defect it was named for is repaired
 * rather than outstanding. It carried two distinct key sets across its 21 steps where a real reply
 * carries one — `ToFrameSystemInputs` serializes every node of a plan from a single schema, so all
 * the other captures here are uniform. The three keys missing from the middle 18 steps were
 * `arm_origin`, `table` and `table_origin`, all zero-DoF, and a zero-DoF column is `[]` in every
 * step of every reply. There was exactly one value they could take, so filling them in restored a
 * shape rather than inventing data, and no assertion here moved.
 *
 * What remains unverified is only its provenance. The `arm` values carry 18 significant decimals,
 * which is Go round-tripping a float64 rather than anything hand-written, and steps 0 and 1 are
 * byte-identical — the structural duplicate CBiRRT produces, not an editing artifact. So the
 * density is very unlikely to be invented. Treat it as real until someone recaptures it and finds
 * otherwise; the segment lengths are what these rules were built against.
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
	//
	// Structural, not incidental: a CBiRRT-solved goal returns a path whose first node is the
	// segment's start configuration, which `planMultiWaypoint` appends onto a list already ending in
	// that value. Which is also why free space, solved by the direct-IK short circuit, has none.
	it('obstacle plans contain a zero-length segment', () => {
		expect(segmentDegrees(plans.obstacle).filter((d) => d === 0)).not.toHaveLength(0)
	})

	it('free-space plans do not', () => {
		expect(segmentDegrees(plans.freeSpace).filter((d) => d === 0)).toHaveLength(0)
	})

	it('every step of a plan carries the same columns', () => {
		for (const trajectory of Object.values(plans)) {
			const keys = trajectory.map((step) => Object.keys(step).toSorted().join(','))
			expect(new Set(keys).size).toBe(1)
		}
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

/**
 * Both cost functions walk `from` and look each component up in `to`, and both guard the lookup.
 * Neither guard can fire on a real reply: `ToFrameSystemInputs` serializes every node of a plan
 * from one schema, so a plan's steps all carry the same keys with the same lengths. They are here
 * so a malformed reply degrades instead of throwing, and pinning them is what keeps that true —
 * without the component guard a ragged step is a `TypeError` and a blank preview, and without the
 * index guard the cost is `NaN`, which collapses the whole plan to one frame per waypoint.
 *
 * Costing is deliberately one-sided even so. A component that appears only in `to` has no `from`
 * value to measure against, so there is no defined distance to charge it; `lerpTrajectoryStep`
 * spans the union because holding a value it does have is always defined.
 */
describe('a step that does not carry the same columns as its neighbour', () => {
	it.each([
		['segmentFrameCost', segmentFrameCost],
		['jointTravelRadians', jointTravelRadians],
	])('%s skips a component the next step drops', (_label, cost) => {
		expect(cost({ arm: [0], gripper: [0] }, { arm: [0] })).toBe(0)
	})

	it.each([
		['segmentFrameCost', segmentFrameCost],
		['jointTravelRadians', jointTravelRadians],
	])('%s skips a joint the next step drops', (_label, cost) => {
		expect(cost({ arm: [0, 0] }, { arm: [0] })).toBe(0)
	})

	it('charges nothing for a component that appears only in the later step', () => {
		expect(segmentFrameCost({ arm: [0] }, { arm: [0], gripper: [Math.PI] })).toBe(0)
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

	// A one-sided component is copied rather than referenced. Handing the caller an array the input
	// plan still owns means any in-place edit of a frame rewrites the plan itself, and `interpolated`
	// frames are exactly what a scrubber hands around.
	it.each([
		['only the start', true],
		['only the end', false],
	])('copies a component present in %s rather than aliasing it', (_label, onStart) => {
		const held = [5]
		const start: TrajectoryStep = onStart ? { arm: held } : {}
		const end: TrajectoryStep = onStart ? {} : { arm: held }

		expect(lerpTrajectoryStep(start, end, 0.5).arm).not.toBe(held)
	})

	// A component that gains a joint between steps has no value to blend from, so the new joints are
	// carried across raw. They land at their own indices because `start.map` yields exactly
	// `start.length` entries; dropping the push loses them from every interpolated frame.
	it('carries joints a component gained between steps', () => {
		expect(lerpTrajectoryStep({ arm: [0, 0] }, { arm: [1, 1, 9] }, 0.5).arm).toEqual([0.5, 0.5, 9])
	})

	it('keeps joints a component lost between steps', () => {
		expect(lerpTrajectoryStep({ arm: [0, 10, 20] }, { arm: [1] }, 0.5).arm).toEqual([0.5, 10, 20])
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

	// Length alone leaves the contents free: every waypoint could point at frame 0 and the assertion
	// above would still hold, which for this mode means every scrubber tick landing on the first
	// frame. In this mode a frame *is* a waypoint, so the indices are the identity.
	it('indexes every frame as a waypoint, in order', () => {
		expect(waypointFrames(plans.gantry).waypoints).toEqual([0, 1])
		expect(waypointFrames(plans.obstacle).waypoints).toEqual(
			plans.obstacle.map((_, index) => index)
		)
	})

	it('reports no coarsening, since it never subdivides', () => {
		expect(waypointFrames(plans.obstacle).coarsening).toBe(1)
		expect(waypointFrames([]).coarsening).toBe(1)
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
			//
			// Asserted by reference, not by value. `toEqual` also passes for a blend that happens to
			// land on the waypoint, which is exactly what walking the interior one step further and
			// dropping the explicit `steps.push(to)` would produce; only identity distinguishes the
			// planner's own object from a float reconstruction of it.
			for (const [index, frame] of waypoints.entries()) {
				expect(steps[frame]).toBe(planned[index])
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
		//
		// Stated as frames *added* rather than as a fraction of the plan's length. Only 6 of this
		// plan's 224 segments exceed the 1.5° budget, and they contribute all 11 of the added frames;
		// a `× 1.1` bound reads as 10% slack but is really 11 frames against a ceiling of 22, so a
		// recapture whose solver emits another dozen 3° segments would trip it with nothing in the
		// file to explain why.
		const { steps } = interpolatedFrames(plans.linear)
		expect(steps.length - plans.linear.length).toBe(11)
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

	// The cap-binding case above asserts how many waypoints there are and never where they point.
	// The scrubber draws its tick marks at these indices, so pointing them at the wrong frames is
	// wrong exactly when a plan is long enough for the user to need them.
	it('still points each waypoint at its own frame when the cap binds', () => {
		const { steps, waypoints, coarsening } = interpolatedFrames(plans.linear, { degrees: 0.0001 })

		expect(coarsening).toBeGreaterThan(1)
		for (const [index, frame] of waypoints.entries()) {
			expect(steps[frame]).toBe(plans.linear[index])
		}
	})

	// `coarsening` is documented as the signal that the requested budget was not met, and nothing
	// else asserts it against a number — only against 1. A scaled or offset value would be wrong on
	// every plan while every other assertion here stayed green.
	it('reports a coarsening of exactly 1 when the budget is met', () => {
		expect(interpolatedFrames(plans.linear).coarsening).toBe(1)
		expect(interpolatedFrames(plans.freeSpace).coarsening).toBe(1)
	})

	it('reports coarsening as the factor the cap stretched each frame by', () => {
		const budget = { degrees: 0.0001 }
		const total = plans.linear
			.slice(1)
			.reduce((sum, step, index) => sum + segmentFrameCost(plans.linear[index]!, step, budget), 0)

		expect(interpolatedFrames(plans.linear, budget).coarsening).toBeCloseTo(total / 2000, 6)
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
	/**
	 * Exact rather than a band. A band wide enough to read as "sane" also accepts the millimetre
	 * budget being anything from 2 to 20, which leaves a documented judgment call free to drift
	 * silently. The contrast that matters is the 1529 this used to produce, and 10 states it as
	 * clearly.
	 *
	 * Ten and not nine: the capture's stroke is `90.00000000000001 - 50`, so the cost is
	 * `8.000000000000004` rather than 8 and `Math.ceil` rounds it up to a ninth division. Rounding
	 * up on a hair of float residue is the harmless direction — it adds a frame, never drops one —
	 * and it is left visible here rather than papered over with an epsilon, because the same residue
	 * is in every capture RDK produces.
	 */
	it('spends exactly the budgeted frames on a 40 mm slide', () => {
		const { steps } = interpolatedFrames(plans.gantry, { motions: GANTRY_MOTIONS })

		expect(steps).toHaveLength(10)
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

	// The millimetre budget is read, not merely defaulted. Every other prismatic assertion here
	// passes `millimetres: 5`, which *is* the default, so ignoring the option entirely looks correct.
	it('reads the millimetre budget rather than always defaulting it', () => {
		const motions: JointMotions = new Map([['gantry', ['translational'] as const]])
		const cost = segmentFrameCost({ gantry: [0] }, { gantry: [40] }, { millimetres: 20, motions })

		expect(cost).toBeCloseTo(2)
	})

	it('costs a segment that moves nothing at zero', () => {
		expect(segmentFrameCost({ arm: [1, 2] }, { arm: [1, 2] })).toBe(0)
	})

	/**
	 * `?? default` only catches null and undefined. Every other unusable budget used to pass through
	 * a `Math.max(…, Number.EPSILON)` clamp that reads like a guard and is not one: zero and negative
	 * both became `Number.EPSILON`, the finest budget expressible, and `NaN` stayed `NaN`.
	 *
	 * The consequences are opposite and both wrong. A `NaN` budget makes every cost `NaN`, which
	 * `Math.ceil` keeps and `division < NaN` reads as false, so *every* segment of the plan collapses
	 * to one frame — the raw waypoint teleport this module exists to prevent, arrived at in silence.
	 * A zero budget pins every plan to the frame cap instead. Zero is what an emptied numeric input
	 * sends, so neither is hypothetical.
	 */
	it.each([
		['zero', 0],
		['negative', -1.5],
		['NaN', Number.NaN],
		['Infinity', Number.POSITIVE_INFINITY],
	])('falls back to the default for a %s degree budget', (_label, degrees) => {
		const from = { arm: [0] }
		const to = { arm: [Math.PI / 2] }

		expect(segmentFrameCost(from, to, { degrees })).toBe(segmentFrameCost(from, to))
	})

	it.each([
		['zero', 0],
		['NaN', Number.NaN],
	])('falls back to the default for a %s millimetre budget', (_label, millimetres) => {
		const motions: JointMotions = new Map([['gantry', ['translational'] as const]])
		const from = { gantry: [0] }
		const to = { gantry: [40] }

		expect(segmentFrameCost(from, to, { millimetres, motions })).toBe(
			segmentFrameCost(from, to, { motions })
		)
	})

	// The whole-plan consequence of the above, which is what a user would actually see.
	it('still fills in a free-space plan when handed a zero budget', () => {
		expect(interpolatedFrames(plans.freeSpace, { degrees: 0 }).steps.length).toBeGreaterThan(150)
	})
})

/**
 * A component is named by an RDK resource name, and `:` and `+` are its only reserved characters
 * (`resource/resource.go`) — so `constructor`, `toString` and `__proto__` are all legal names. Read
 * with a plain index, each resolves through `Object.prototype` to something truthy that is not an
 * array.
 *
 * Only `lerpTrajectoryStep` is actually hurt by that, and the two cost cases below are here to say
 * so rather than to pin a guard: every prototype value indexes to `undefined`, so the joint guard
 * they already have absorbs it, and adding an own-key check there would be dead code. What the
 * prototype does carry is a `.length`, which is what reaches the grown-joints comparison and calls
 * `.slice` on a function.
 */
describe('a component named like an Object.prototype member', () => {
	const proto = (json: string) => JSON.parse(json) as TrajectoryStep

	it.each(['constructor', 'toString', 'hasOwnProperty', '__proto__'])(
		'costs a segment that drops %s without reading the prototype',
		(name) => {
			const from = proto(`{"arm": [0], ${JSON.stringify(name)}: []}`)
			const to = proto('{"arm": [1]}')

			expect(segmentFrameCost(from, to)).toBeCloseTo((1 * RAD_TO_DEG) / DEFAULT_DEGREES_PER_FRAME)
			expect(jointTravelRadians(from, to)).toBeCloseTo(1)
		}
	)

	it.each(['constructor', 'toString', 'hasOwnProperty'])('blends a plan containing %s', (name) => {
		const from = proto(`{"arm": [0], ${JSON.stringify(name)}: []}`)
		const to = proto('{"arm": [1]}')

		const blended = lerpTrajectoryStep(from, to, 0.5)
		expect(blended.arm).toEqual([0.5])
		expect(blended[name]).toEqual([])
	})

	// Assigning `__proto__` on a plain object hits the prototype setter, so the component vanishes
	// from the result and the frame's own prototype is replaced.
	it('keeps a component named __proto__ as a key rather than a setter', () => {
		const blended = lerpTrajectoryStep(
			proto('{"__proto__": [0]}'),
			proto('{"__proto__": [2]}'),
			0.5
		)

		expect(Object.keys(blended)).toEqual(['__proto__'])
		expect(blended['__proto__']).toEqual([1])
	})

	it('interpolates a plan containing one end to end', () => {
		const planned = [proto('{"arm": [0], "constructor": []}'), proto('{"arm": [1]}')]
		expect(interpolatedFrames(planned).steps.length).toBeGreaterThan(30)
	})
})

describe('jointMotionsOf', () => {
	const joint = (
		componentName: string,
		jointIndex: number,
		motion: JointMotion,
		mimic?: { multiplier: number; offset: number }
	): FrameDescriptor => ({
		kind: 'joint',
		motion,
		name: `${componentName}:joint-${jointIndex}`,
		parent: 'world',
		axis: { X: 0, Y: 0, Z: 1 },
		componentName,
		jointIndex,
		mimic,
		uuid: new Uint8Array(16) as Uint8Array<ArrayBuffer>,
	})

	it('indexes each joint the way a trajectory step does', () => {
		const motions = jointMotionsOf([
			joint('gantry', 0, 'translational'),
			joint('arm', 1, 'rotational'),
		])

		expect(motions.get('gantry')).toEqual(['translational'])
		expect(motions.get('arm')?.[1]).toBe('rotational')
	})

	// One joint per component leaves the accumulation untested: reading back the component's existing
	// array is what makes a second joint join the first rather than replace it. A three-axis gantry
	// that kept only its last axis would have the other two costed as radians at 57×.
	it('keeps every joint of a component, not just the last', () => {
		const motions = jointMotionsOf([
			joint('gantry', 0, 'translational'),
			joint('gantry', 1, 'translational'),
			joint('gantry', 2, 'translational'),
		])

		expect(motions.get('gantry')).toEqual(['translational', 'translational', 'translational'])
	})

	it('ignores frames that are not joints', () => {
		const motions = jointMotionsOf([
			{
				kind: 'static',
				name: 'table',
				parent: 'world',
				localPose: new Pose(),
				geometry: null,
				uuid: new Uint8Array(16) as Uint8Array<ArrayBuffer>,
			},
			joint('arm', 0, 'rotational'),
		])

		expect([...motions.keys()]).toEqual(['arm'])
	})

	/**
	 * A mimic joint's `jointIndex` addresses its *source's* column, so labelling that column with the
	 * mimic's own motion describes a column the mimic does not own. RDK permits the two to differ:
	 * `buildMimicMappings` checks only that the source exists and has DoF, never that the joint types
	 * agree, and a rack and pinion is a prismatic joint driven by a revolute one.
	 *
	 * Both orders are asserted because the bug was a last-write-wins race decided by frame-system key
	 * order, so pinning only the order that happens to fail leaves half of it green.
	 */
	it.each([
		[
			'source first',
			[
				joint('gantry', 0, 'translational'),
				joint('gantry', 0, 'rotational', { multiplier: 1, offset: 0 }),
			],
		],
		[
			'mimic first',
			[
				joint('gantry', 0, 'rotational', { multiplier: 1, offset: 0 }),
				joint('gantry', 0, 'translational'),
			],
		],
	] as const)('lets the column owner win over a mimic of it, %s', (_label, descriptors) => {
		expect(jointMotionsOf([...descriptors]).get('gantry')).toEqual(['translational'])
	})

	// The whole-plan consequence: a 40 mm slide costed in degrees is the 1,529-frame, 24-second
	// playback this module was written to remove, reintroduced through the mimic's label.
	it('spends a sane number of frames on a slide whose column is mimicked by a revolute joint', () => {
		const motions = jointMotionsOf([
			joint('gantry-1', 0, 'translational'),
			joint('gantry-1', 0, 'rotational', { multiplier: 1, offset: 0 }),
		])

		expect(interpolatedFrames(plans.gantry, { motions }).steps.length).toBeLessThan(60)
	})
})
