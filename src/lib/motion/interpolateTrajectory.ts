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
 *   - **It does not model speed.** RDK's trajectory is joint values and nothing else — no durations,
 *     no velocities — so playback rate is arbitrary and the panel says so.
 *
 * The path, unlike the speed, is not guesswork. RDK validates a segment by interpolating its joint
 * values and collision-checking the states in between: `InterpolateSegmentFS` →
 * `SimpleModel.Interpolate` → `baseFrame.Interpolate` → `interpolateInputs`, which for a
 * joint-space frame is `from + (to - from) * by`, the same expression as `lerpTrajectoryStep`. The
 * `SimpleModel` hop is the one that dispatches for an arm; going straight to `baseFrame` describes
 * a call that does not happen. (A `poseFrame` interpolates its orientation by slerp instead
 * (`referenceframe/frame.go`), which does not apply here — `NewPoseFrame` has no non-test callers.)
 *
 * Smoothing gates every merge on that same check, so a waypoint is only dropped once the longer
 * segment replacing it has been approved. Stopping there would overstate it, though:
 * `tryOnlyMovingComponentsThatNeedToMove` rewrites a waypoint in place and checks only the segment
 * *ending* at it, so the following segment survives in a form nothing validated. The guarantee is
 * about merges, not about every segment in the finished plan.
 *
 * All of which is a claim about the *planner*, not the arm. `builtin.execute` batches consecutive
 * steps and calls `GoToInputs` once per batch so a component can blend between them, and how it
 * blends is its own decision — so execution can deviate between waypoints. The batching is
 * narrower than "the whole list at once": it flushes whenever a *different* component starts
 * moving or a moving one drops out (`services/motion/builtin/builtin.go`), so a plan that moves two
 * components in the same step gets one call per step and no blending at all. The panel says this
 * too. There is no execution-side path tolerance behind it either — `MoveOptions` carries only
 * velocity, acceleration and TCP-speed ceilings, and `GoToInputs` passes `nil` — so the batching is
 * the sourced half and the cornering this used to describe was not. (`LineToleranceMm` and
 * `OrientationToleranceDegs` do exist, but they constrain the *planned* path, not execution.)
 *
 * Go line numbers are omitted deliberately: they drift between RDK releases, and the ones this was
 * written against (v1.2.0) do not match the v0.122.0 in this repo's `go.mod`. Every symbol named
 * here exists under that name in both.
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
 * Millimetres per frame, the prismatic counterpart, chosen so a gantry and an arm moving together
 * read at comparable speeds rather than one swallowing the whole budget.
 *
 * It is the arc {@link DEFAULT_DEGREES_PER_FRAME} sweeps at a **191 mm** radius, which is a mid-link
 * distance rather than a whole arm's reach — at a 850 mm reach the same 1.5° sweeps 22 mm. Erring
 * short is the safe direction: a prismatic axis gets more frames than strictly needed, where the
 * opposite under-samples it into a visible jump. The figure is stated here because it is a judgment
 * call, and `spends exactly the budgeted frames on a 40 mm slide` pins it so a change has to be
 * deliberate.
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
 *
 * **Mimics are skipped, and that is load-bearing.** A mimic joint owns no column of its own, so its
 * `jointIndex` addresses its *source's* (`frameDescriptors.ts`, and `jointColumns.ts` where the
 * index is assigned). Writing its motion at that index labels a column the mimic does not own, and
 * RDK never requires the two to agree: `buildMimicMappings` validates only that the source frame
 * exists and has DoF (`referenceframe/model_json.go`), so a prismatic joint may legally mimic a
 * revolute one — a rack and pinion is exactly that. Whichever descriptor the frame system happens to
 * yield last would then decide the column's unit. Landing on `translational` for a revolute column
 * costs it in millimetres, which under-samples by 57×; landing on `rotational` for a prismatic one
 * is the 1,529-frame regression this module was written to remove. The source's own descriptor
 * always carries the right answer for that column, so skipping mimics loses nothing.
 */
export const jointMotionsOf = (descriptors: readonly FrameDescriptor[]): JointMotions => {
	const motions = new Map<string, JointMotion[]>()

	for (const descriptor of descriptors) {
		if (descriptor.kind !== 'joint' || descriptor.mimic) continue

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
 * itself is per-frame over one `[]Input`, and it has exactly two callers: a cmd-plan diagnostic and
 * the `DoExecuteCheckStart` guard.
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
 * Straight linear blending is right for RDK's joint values, and the reason is not a property of the
 * values themselves. Nothing stops a plan holding a +170°/−170° pair: joint limits routinely exceed
 * ±π (a ±360° joint is ordinary), and no wrap or normalise step exists anywhere in `referenceframe`
 * or `motionplan`. What makes plain blending correct is that **RDK collision-checks with this exact
 * expression**, so interpolating the same way reproduces the interior RDK approved, whatever the
 * values look like. Angle-aware blending would draw a path nothing validated.
 *
 * A joint absent from one side holds the value it has on the other.
 */
export const lerpTrajectoryStep = (
	from: TrajectoryStep,
	to: TrajectoryStep,
	t: number
): TrajectoryStep => {
	// A component is named by an RDK resource name, whose only reserved characters are `:` and `+`
	// (`resource/resource.go`), so `constructor`, `toString` and `__proto__` are all legal names —
	// and each of them is something inherited rather than absent when read with a plain index.
	//
	// Both halves matter here and neither does in the cost functions above, where a prototype value
	// indexes to `undefined` and the existing guard catches it. Reading: `to['constructor']` is a
	// function whose `.length` is 1, which beats an empty `start` at the grown-joints comparison
	// below and calls `.slice` on it — a `TypeError` and a blank preview. Writing: assigning
	// `__proto__` on a `{}` hits the prototype setter, so the component vanishes from the frame and
	// the frame's own prototype is replaced by whatever was assigned.
	const blended = Object.create(null) as TrajectoryStep

	for (const component of new Set([...Object.keys(from), ...Object.keys(to)])) {
		const start = Object.hasOwn(from, component) ? from[component] : undefined
		const end = Object.hasOwn(to, component) ? to[component] : undefined

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
 * A budget figure that can be divided by, or the default.
 *
 * `?? default` only catches `null` and `undefined`, and every other unusable value fails in a way
 * that is invisible rather than loud. Zero and a negative both used to clamp to `Number.EPSILON`,
 * the finest budget expressible, which costs a quarter-turn at 8.1e17 frames and pins every plan to
 * the cap; a `NaN` propagated through the cost, the total and `Math.ceil` until the interior loop
 * stopped running and every segment collapsed to one frame — the raw waypoint teleport this module
 * exists to prevent, arrived at silently. A budget of zero is what an emptied numeric input or a
 * slider at its minimum sends, so this is not only a guard against nonsense.
 */
const perFrame = (value: number | undefined, fallback: number): number =>
	value !== undefined && Number.isFinite(value) && value > 0 ? value : fallback

/**
 * What a segment costs, in *frames* rather than in any one unit.
 *
 * Each joint's change is divided by the budget for its own kind — degrees for a revolute joint,
 * millimetres for a prismatic one — and the largest quotient wins, the same L-infinity shape RDK
 * compares configurations with. Normalising *before* the max is the whole point: taking a raw max
 * across both units let one millimetre outweigh one radian by 57×, so any gantry stroke past a few
 * millimetres swallowed the budget and collapsed every arm segment to a single frame.
 *
 * RDK's own segment-density metric is the same shape but not the same rule, and it is worth being
 * exact about the difference rather than claiming parity. `segmentStepCount` maxes
 * `calculateJointStepCount` — joint travel over a step size — with a *Cartesian* count that this has
 * no analogue for, and its step size comes from `jointStepSizeFromLimits`, which is one figure per
 * *frame*, the largest limit range over a thousand. Per frame, not per joint: a single frame mixing
 * revolute and prismatic DoF would hit exactly the contamination described above. The per-joint
 * `motions` map here is therefore stricter than RDK, not a copy of it. The fixed budgets are also a
 * different choice from limit-derived ones, though they land in the same neighbourhood — a ±180°
 * joint gives RDK 0.72° against the 1.5° here.
 *
 * Walks `from` and looks each component up in `to`, rather than spanning the union the way
 * {@link lerpTrajectoryStep} does. A component appearing only in `to` has no `from` value to measure
 * against, so there is no defined distance to charge it — whereas holding a value it *does* have is
 * always defined, which is why blending can span the union and costing cannot. It never comes up on
 * a real reply either: `ToFrameSystemInputs` serializes every node of a plan from one schema, so a
 * plan's steps all carry the same keys.
 */
export const segmentFrameCost = (
	from: TrajectoryStep,
	to: TrajectoryStep,
	budget: FrameBudget = {}
): number => {
	const degrees = perFrame(budget.degrees, DEFAULT_DEGREES_PER_FRAME)
	const millimetres = perFrame(budget.millimetres, DEFAULT_MILLIMETRES_PER_FRAME)

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
 * A segment shorter than one frame's worth of travel still gets its one frame, and so does a
 * zero-length one. That is delivered by the unconditional `steps.push(to)` at the end of each
 * segment, not by any arithmetic on the division count: the interior loop simply does not run.
 * Every plan measured contains at least one zero-length segment, and they are structural rather
 * than incidental — a CBiRRT-solved goal contributes a path whose first node *is* the segment's
 * start configuration, which `planMultiWaypoint` then appends onto a list already ending in that
 * same value (`motionplan/armplanning/plan_manager.go`). Free-space plans, solved by the direct-IK
 * short circuit, never show one.
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
		// `max(1, …)` keeps this a usable divisor below rather than granting the minimum frame, which
		// `steps.push(to)` already does — a zero-length segment would otherwise `ceil` to 0.
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
