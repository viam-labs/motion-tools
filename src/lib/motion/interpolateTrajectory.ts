/**
 * Turns a planned trajectory into frames to play back.
 *
 * A plan's steps are the planner's waypoints, not animation frames, and how many there are varies
 * enormously with how the plan was solved. Measured against a simulated arm:
 *
 * | plan                | steps | joint travel per segment |
 * | ------------------- | ----- | ------------------------ |
 * | free space          | 2     | one segment of 95°–270°  |
 * | linear-constrained  | 225   | 0.53°–7.6°, median 0.69° |
 * | obstacle-routed     | 20–30 | 0.00°–78.5°, median 4.4° |
 *
 * Playing any of those one-frame-per-waypoint misrepresents the motion: free space becomes a single
 * teleport, and an obstacle-routed plan spends frames standing still on its zero-length segments
 * while crossing 78° in one. So frames are allocated **in proportion to joint travel**, which makes
 * playback constant-speed and handles all three shapes without a mode switch — a dense plan passes
 * through essentially untouched, a sparse one gets filled in.
 *
 * Two things this does not do, both deliberate:
 *
 *   - **It never removes a planned waypoint.** Every segment gets at least one frame, so the frames
 *     always contain the plan verbatim; interpolation only ever adds between waypoints.
 *   - **It does not model speed.** A trajectory carries no durations (see `planDoCommand.ts`), so
 *     playback rate is arbitrary and the panel says so.
 *
 * The path, unlike the speed, is not guesswork. RDK validates every segment of a plan by
 * interpolating its joint values and collision-checking the intermediate states —
 * `InterpolateSegmentFS` → `baseFrame.Interpolate` → `interpolateInputs`, which for a joint-space
 * frame is `from + (to - from) * by`, the same expression as `lerpTrajectoryStep`. Smoothing runs
 * the same check before it drops a waypoint, so every segment that survives into a plan has had
 * its straight-line interior approved. (A `poseFrame` slerps instead, `frame.go:762`; that does
 * not apply to the arms this previews.)
 *
 * That is a claim about the *planner*, not the arm. `builtin.execute` hands the whole waypoint
 * list to the component in one batch so it can blend between them (`builtin.go:598-599`), and what
 * it does with them is its own decision — so execution can deviate near waypoints. The panel says
 * this too. RDK has no path-tolerance setting behind that: the batching is the sourced half, and
 * the cornering this used to describe was not.
 */

import type { FrameDescriptor } from './frameDescriptors'
import type { TrajectoryStep } from './jointPose'

const RAD_TO_DEG = 180 / Math.PI

/**
 * Joint degrees per frame. At the preview's frame interval this works out to a plausible arm speed,
 * which is the only claim being made — the real duration is unknowable from a trajectory.
 */
export const DEFAULT_DEGREES_PER_FRAME = 1.5

/**
 * Millimetres per frame, the prismatic counterpart. Roughly the arc a 1.5° joint sweeps at a typical
 * arm's reach, so a gantry and an arm moving together read at comparable speeds rather than one
 * swallowing the whole budget.
 */
export const DEFAULT_MILLIMETRES_PER_FRAME = 5

/** How a joint's values are measured — the same two kinds a `JointFrameDescriptor` distinguishes. */
export type JointMotion = 'rotational' | 'translational'

/**
 * Which joints are prismatic, indexed the way a trajectory step is: `motions.get('gantry')[0]`.
 * Anything absent reads as rotational, which is what every joint in the captured plans is.
 */
export type JointMotions = ReadonlyMap<string, readonly JointMotion[]>

export interface FrameBudget {
	/** Degrees of revolute travel one frame represents. */
	degrees?: number
	/** Millimetres of prismatic travel one frame represents. */
	millimetres?: number
	motions?: JointMotions
}

/**
 * The joint kinds a plan's descriptors describe, in the shape {@link FrameBudget} wants.
 *
 * A `JointFrameDescriptor` already carries both halves — which component's column drives it and
 * whether it rotates or slides — so nothing new has to be derived, only re-indexed.
 */
export const jointMotionsOf = (descriptors: readonly FrameDescriptor[]): JointMotions => {
	const motions = new Map<string, JointMotion[]>()

	for (const descriptor of descriptors) {
		if (descriptor.kind !== 'joint') continue

		const kinds = motions.get(descriptor.componentName) ?? []
		kinds[descriptor.jointIndex] = descriptor.motion
		motions.set(descriptor.componentName, kinds)
	}

	return motions
}

/**
 * Backstop for a plan whose total travel is far beyond anything observed — the worst real plan came
 * to 236 frames. Binding it coarsens the resolution rather than truncating the motion, so the end of
 * the plan is never silently dropped.
 *
 * It bounds the frames spent on *interpolation* only. Every planned waypoint keeps its own frame no
 * matter what, so the real ceiling is this plus one frame per waypoint; a plan with more waypoints
 * than this cannot be capped at all without discarding plan data, which is never the right trade.
 */
const MAX_INTERPOLATED_FRAMES = 2000

export interface PreviewFrames {
	/** What to render, in order. Contains every planned waypoint, plus any frames added between. */
	steps: TrajectoryStep[]
	/**
	 * Where each planned waypoint landed in `steps`. Always starts at 0 and ends at the last index,
	 * so a scrubber can mark which frames are real data and which are drawn between them.
	 */
	waypoints: number[]
	/**
	 * How much the cap stretched each frame: 1 when the requested budget was met, higher when a plan
	 * long enough to exceed {@link MAX_INTERPOLATED_FRAMES} had to be coarsened to fit.
	 */
	coarsening: number
}

/**
 * The largest single-joint change between two steps, across every component — the same L-infinity
 * form RDK uses, taken here across every component rather than per frame. `InputsLinfDistance`
 * itself is per-frame over one `[]Input`, and its callers are cmd-plan diagnostics and the
 * `DoExecuteCheckStart` guard; RDK's own segment-density metric is `calculateJointStepCount`
 * against `jointStepSizeFromLimits`, which is what {@link segmentFrameCost} mirrors.
 *
 * Max rather than sum because it is the fastest-moving joint that decides whether a step reads as
 * a jump. Deliberately unit-blind: this compares configurations, and budgeting frames is
 * {@link segmentFrameCost}'s job.
 */
export const jointTravelRadians = (from: TrajectoryStep, to: TrajectoryStep): number => {
	let worst = 0

	for (const [component, start] of Object.entries(from)) {
		const end = to[component]
		if (!end) continue

		for (const [index, value] of start.entries()) {
			const target = end[index]
			if (target === undefined) continue
			worst = Math.max(worst, Math.abs(target - value))
		}
	}

	return worst
}

/**
 * `from` and `to` blended at `t`, over the union of both steps' components.
 *
 * Straight linear blending is right for RDK's joint values: a trajectory is continuous and
 * unwrapped, so consecutive revolute values never take the short way across ±π and never need
 * angle-aware blending. A joint absent from one side holds the value it has on the other.
 */
export const lerpTrajectoryStep = (
	from: TrajectoryStep,
	to: TrajectoryStep,
	t: number
): TrajectoryStep => {
	const blended: TrajectoryStep = {}

	for (const component of new Set([...Object.keys(from), ...Object.keys(to)])) {
		const start = from[component]
		const end = to[component]

		if (!start) {
			if (end) blended[component] = [...end]
			continue
		}
		if (!end) {
			blended[component] = [...start]
			continue
		}

		blended[component] = start.map((value, index) => {
			const target = end[index]
			return target === undefined ? value : value + (target - value) * t
		})

		// A component that gained joints between steps would otherwise lose them here.
		if (end.length > start.length) blended[component].push(...end.slice(start.length))
	}

	return blended
}

/**
 * What a segment costs, in *frames* rather than in any one unit.
 *
 * Each joint's change is divided by the budget for its own kind — degrees for a revolute joint,
 * millimetres for a prismatic one — and the largest quotient wins, the same L-infinity shape RDK
 * compares configurations with. Normalising *before* the max is the whole point: taking a raw max
 * across both units let one millimetre outweigh one radian by 57×, so any gantry stroke past a few
 * millimetres swallowed the budget and collapsed every arm segment to a single frame. RDK does not
 * make this mistake either — `segmentStepCount` measures each frame against a step size derived from
 * that frame's own limits.
 */
export const segmentFrameCost = (
	from: TrajectoryStep,
	to: TrajectoryStep,
	budget: FrameBudget = {}
): number => {
	const degrees = Math.max(budget.degrees ?? DEFAULT_DEGREES_PER_FRAME, Number.EPSILON)
	const millimetres = Math.max(budget.millimetres ?? DEFAULT_MILLIMETRES_PER_FRAME, Number.EPSILON)

	let worst = 0

	for (const [component, start] of Object.entries(from)) {
		const end = to[component]
		if (!end) continue
		const kinds = budget.motions?.get(component)

		for (const [index, value] of start.entries()) {
			const target = end[index]
			if (target === undefined) continue

			const delta = Math.abs(target - value)
			const cost =
				kinds?.[index] === 'translational' ? delta / millimetres : (delta * RAD_TO_DEG) / degrees
			worst = Math.max(worst, cost)
		}
	}

	return worst
}

/** One frame per planned waypoint — the trajectory exactly as the planner returned it. */
export const waypointFrames = (trajectory: TrajectoryStep[]): PreviewFrames => ({
	steps: trajectory,
	waypoints: trajectory.map((_, index) => index),
	coarsening: 1,
})

/**
 * Frames spread across `trajectory` at roughly one budget's worth of joint travel each.
 *
 * A segment shorter than one frame's worth of travel still gets its one frame, which is what keeps
 * planned waypoints intact and what makes the zero-length segments real plans contain (duplicate
 * consecutive waypoints appear in every obstacle-routed plan measured) cost one frame rather than
 * dividing by zero.
 */
export const interpolatedFrames = (
	trajectory: TrajectoryStep[],
	budget: FrameBudget = {}
): PreviewFrames => {
	if (trajectory.length < 2) return waypointFrames(trajectory)

	const travel: number[] = []
	let total = 0
	for (let step = 1; step < trajectory.length; step += 1) {
		const segment = segmentFrameCost(trajectory[step - 1]!, trajectory[step]!, budget)
		travel.push(segment)
		total += segment
	}

	// Coarsen rather than truncate: every segment still gets its frames, just fewer of them.
	const resolution = Math.max(1, total / MAX_INTERPOLATED_FRAMES)

	const steps: TrajectoryStep[] = [trajectory[0]!]
	const waypoints: number[] = [0]

	for (const [index, segment] of travel.entries()) {
		const from = trajectory[index]!
		const to = trajectory[index + 1]!
		const divisions = Math.max(1, Math.ceil(segment / resolution))

		// The segment's own start is already in `steps` as the previous segment's end, so this walks
		// the interior and finishes on `to` exactly rather than on a blend that rounds to it.
		for (let division = 1; division < divisions; division += 1) {
			steps.push(lerpTrajectoryStep(from, to, division / divisions))
		}
		steps.push(to)
		waypoints.push(steps.length - 1)
	}

	return { steps, waypoints, coarsening: resolution }
}
