/**
 * The builtin motion service's two `DoCommand` verbs, which have no place in the motion proto and
 * so no generated client:
 *
 *   - `plan`    — a protojson `motion.v1.MoveRequest` **as a string**. Plans without executing and
 *                 answers with `motionplan.Trajectory`.
 *   - `execute` — a `motionplan.Trajectory`. Runs it verbatim, with no replanning.
 *
 * Only `services/motion/builtin` implements them; any other motion service errors, which is the
 * behaviour the panel surfaces.
 *
 * `motionplan.Trajectory` is `[]referenceframe.FrameSystemInputs`, and `FrameSystemInputs` is
 * `map[string][]Input` where `Input` is a `float64` alias — so on the wire it is exactly the
 * `trajectory` array a plan dump carries, and the replayer's kinematics read it unchanged.
 */

import type { JsonValue } from '@bufbuild/protobuf'

import { Constraints, WorldState } from '@viamrobotics/sdk'

import type { Pose } from '$lib/math'
import type { TrajectoryStep } from '$lib/motion/jointPose'

export interface PlanResult {
	trajectory: TrajectoryStep[]
}

export interface PlanRequest {
	/** The motion service's own resource name, `MoveRequest.name`. */
	service: string
	/** The frame being moved, `MoveRequest.component_name`. */
	componentName: string
	/** Where it should end up, and the frame that pose is expressed in. */
	destination: { referenceFrame: string; pose: Pose }
	worldState?: WorldState
	constraints?: Constraints
}

/**
 * Builds the `plan` command. RDK `protojson.Unmarshal`s the string, so the payload uses protojson
 * field names (`componentName`, and `oX`/`oY`/`oZ` for the pose's orientation vector) and the
 * message's own units — millimetres, with `theta` in degrees, which is what `toDestinationPose`
 * already produces.
 *
 * `worldState` and `constraints` are passed through so a preview plans against the same inputs the
 * subsequent `move` would, rather than against a quietly different problem.
 */
export const planCommand = ({
	service,
	componentName,
	destination,
	worldState,
	constraints,
}: PlanRequest): Record<string, JsonValue> => {
	// `JSON.stringify` writes `null` for a non-finite number, and Go's protojson *skips* a JSON null
	// for a scalar field rather than rejecting it, leaving the field at its zero. A `NaN` in the goal
	// would therefore reach RDK as 0 mm, plan successfully, and preview a move to somewhere the user
	// never asked for. Only this path can do that: `client.move` sends a proto double, which carries
	// the NaN and gets refused.
	if (!destination.pose.isFinite()) {
		throw new PlanCommandError('The move target is not a finite pose.')
	}

	const moveRequest: Record<string, JsonValue> = {
		name: service,
		componentName,
		destination: {
			referenceFrame: destination.referenceFrame,
			pose: {
				x: destination.pose.x,
				y: destination.pose.y,
				z: destination.pose.z,
				oX: destination.pose.oX,
				oY: destination.pose.oY,
				oZ: destination.pose.oZ,
				theta: destination.pose.theta,
			},
		},
	}

	// The SDK exports each of these under one name as both a class and a `PlainMessage` type alias
	// (`sdk/dist/types.d.ts:51`), and it is the alias that lands in a type position — so what arrives
	// here is a plain object with no `toJson` on it. Rebuilding is what reaches protojson, the
	// encoding RDK unmarshals the request string with.
	if (worldState) moveRequest.worldState = new WorldState(worldState).toJson()
	if (constraints) moveRequest.constraints = new Constraints(constraints).toJson()

	return { plan: JSON.stringify(moveRequest) }
}

/**
 * Selects RDK's own `defaultExecuteEpsilon` rather than naming a tolerance here. `builtin.go`
 * reads any value ≤ 0 — or anything that is not a float — as "use the default", which is the right
 * answer: how far an arm may have drifted before its plan is stale is a property of the arm, not
 * something a viewer should be deciding for it.
 */
const RDK_DEFAULT_EPSILON = 0

/**
 * Builds the `execute` command for a trajectory a previous `plan` produced.
 *
 * `executeCheckStart` is what arms RDK's own start-state guard. Its *presence* is the switch
 * (`builtin.go`); omit it and epsilon is `math.MaxFloat64`, so the comparison in `builtin.go`
 * can never trip and the trajectory runs from wherever the components happen to be. Since `execute`
 * never replans, that is precisely the case worth refusing: the plan was validated from one starting
 * configuration, and running it from a different one flies a path nothing checked.
 *
 * A failed check is an RPC error, not a field in the reply — `resp[executeCheckStart]` is a constant
 * string echoed back whenever the key was sent, so it says only that the check was asked for.
 */
export const executeCommand = (trajectory: TrajectoryStep[]): Record<string, JsonValue> => ({
	execute: trajectory,
	executeCheckStart: RDK_DEFAULT_EPSILON,
})

/**
 * A step has to be a non-empty object of finite number arrays.
 *
 * The two structural cases are worth naming because `every` says yes to both by default. An array
 * is `typeof 'object'`, so `[[0, 1], [2, 3]]` walked as a step and passed; and `Object.values({})`
 * is empty, so `{}` passed vacuously. Neither errors downstream either: `jointValueAt` resolves a
 * missing column to `0`, so a step with no readable columns draws a plausible arm at the zero
 * configuration instead of reporting a reply this client cannot read. `[[], []]` was worse again —
 * it parsed *and* satisfied `isAlreadyAtGoal`.
 *
 * Finite rather than merely numeric, for the same reason {@link planCommand} refuses a non-finite
 * goal: `typeof NaN === 'number'`, and a single `NaN` anywhere in a reply is not a local defect.
 * `interpolateTrajectory`'s frame budget sums every segment's cost, so one `NaN` makes the total
 * `NaN`, which survives `Math.ceil` until the interior loop stops running and *every* segment of
 * the plan collapses to one frame — the raw waypoint teleport interpolation exists to prevent,
 * reached with no error raised anywhere.
 *
 * Whether RDK can send one is unproven. `protojson` refuses to marshal a non-finite
 * `structpb.Value`, but a machine connection is WebRTC binary proto, which has no such objection.
 * Refusing the reply outright is the cheap side of that uncertainty: this client cannot draw a
 * `NaN` configuration under any reading of it.
 */
const isTrajectoryStep = (step: unknown): step is TrajectoryStep =>
	typeof step === 'object' &&
	step !== null &&
	!Array.isArray(step) &&
	Object.keys(step).length > 0 &&
	Object.values(step as Record<string, unknown>).every(
		(inputs) => Array.isArray(inputs) && inputs.every((input) => Number.isFinite(input))
	)

const isTrajectory = (value: unknown): value is TrajectoryStep[] =>
	Array.isArray(value) && value.every((step) => isTrajectoryStep(step))

/**
 * RDK older than ~v0.101 serialised `Input` as `{Value: number}`, a struct, rather than the float
 * alias it is today, so a plan that *succeeded* comes back looking like this instead of a number.
 * Checked on its own so that one explainable shape gets its own message instead of folding into the
 * generic malformed-reply diagnosis below, which is not evidence of any particular RDK version.
 */
const isOldInputShape = (inputs: unknown): boolean =>
	Array.isArray(inputs) &&
	inputs.some((input) => typeof input === 'object' && input !== null && 'Value' in input)

const hasOldInputShape = (trajectory: unknown): boolean =>
	Array.isArray(trajectory) &&
	trajectory.some(
		(step) =>
			typeof step === 'object' &&
			step !== null &&
			!Array.isArray(step) &&
			Object.values(step as Record<string, unknown>).some((value) => isOldInputShape(value))
	)

/**
 * Diagnoses a trajectory that already failed {@link isTrajectory}, so the several structurally
 * different ways a reply can be malformed each say what is actually wrong instead of collapsing into
 * one message that guesses at an RDK version — a guess only {@link hasOldInputShape}'s shape
 * supports, and `parsePlanResult` never reaches this function for that shape.
 */
const describeMalformedTrajectory = (value: unknown): string => {
	if (!Array.isArray(value)) {
		return 'Motion service returned a trajectory that is not a list of steps.'
	}

	for (const step of value) {
		if (Array.isArray(step)) {
			return step.length === 0
				? 'Motion service returned a trajectory step naming no components.'
				: 'Motion service returned a trajectory step with unnamed joint values.'
		}

		if (step === null || typeof step !== 'object') {
			return 'Motion service returned a null trajectory step.'
		}

		const columns = Object.entries(step)
		if (columns.length === 0) {
			return 'Motion service returned a trajectory step naming no components.'
		}

		for (const [name, inputs] of columns) {
			if (!Array.isArray(inputs)) {
				return `Motion service returned a non-list joint value for component "${name}".`
			}
			for (const input of inputs) {
				if (input === null) {
					return `Motion service returned a null joint value for component "${name}".`
				}
				if (typeof input !== 'number') {
					return `Motion service returned a non-numeric joint value for component "${name}".`
				}
				if (!Number.isFinite(input)) {
					return `Motion service returned a non-finite joint value for component "${name}".`
				}
			}
		}
	}

	// Unreachable from `parsePlanResult`: every caller already knows `isTrajectory` returned false,
	// and the walk above covers every way `isTrajectoryStep` can say no to a step.
	return 'Motion service returned a trajectory this client cannot read.'
}

export class PlanCommandError extends Error {
	constructor(message: string) {
		super(message)
		this.name = 'PlanCommandError'
	}
}

/**
 * Reads a `plan` reply. Throws rather than returning an empty trajectory: a silent empty result
 * would render as "planned successfully, nothing to show".
 */
export const parsePlanResult = (value: JsonValue): PlanResult => {
	if (typeof value !== 'object' || value === null || Array.isArray(value)) {
		throw new PlanCommandError('Motion service returned an unexpected plan response.')
	}

	const trajectory = (value as Record<string, JsonValue>).plan

	// `== null` rather than `=== undefined`: a Go nil trajectory marshals to JSON `null`, which is
	// nothing to draw for the same reason an absent key is. Distinguishing them only sent a user on
	// current RDK to go and upgrade it.
	if (trajectory == null) {
		throw new PlanCommandError('Motion service returned no trajectory for this move.')
	}

	// Told apart from every other malformed shape deliberately. An RDK older than ~v0.101 answers a
	// plan that *succeeded* with `[{"Value": 0.1}]`, because `Input` was a struct rather than a float
	// alias — and the same versions take `component_name` as a `ResourceName`, so the request would
	// not have unmarshalled either. There is no capability or version RPC to probe with, so the shape
	// of the reply is the only evidence available for saying so, and it is evidence for this one
	// shape only: every other way a reply can fail `isTrajectory` is not something an RDK upgrade
	// explains, so each gets its own diagnosis instead of borrowing this one.
	if (hasOldInputShape(trajectory)) {
		throw new PlanCommandError(
			'Motion service returned a trajectory using an older joint-value format. The machine may be running an older version of RDK.'
		)
	}

	if (!isTrajectory(trajectory)) {
		throw new PlanCommandError(describeMalformedTrajectory(trajectory))
	}

	if (trajectory.length === 0) {
		throw new PlanCommandError('Motion service returned an empty trajectory.')
	}

	return { trajectory }
}

const sameInputs = (a: TrajectoryStep, b: TrajectoryStep): boolean => {
	const names = Object.keys(a)
	if (names.length !== Object.keys(b).length) return false

	return names.every((name) => {
		// `hasOwn` rather than testing `b[name]` for undefined: a plain index reads straight through to
		// `Object.prototype`, so a component named `toString` matched a member function whose `length`
		// happens to be 0, and two steps naming different components compared equal.
		if (!Object.hasOwn(b, name)) return false

		const left = a[name]
		const right = b[name]
		return (
			left !== undefined &&
			right !== undefined &&
			left.length === right.length &&
			left.every((value, index) => value === right[index])
		)
	})
}

/**
 * Whether the planner answered "there is nothing to do".
 *
 * RDK seeds its trajectory with the start configuration (`plan_manager.go`) and then appends the
 * IK solution, so a move whose goal is already satisfied comes back as two steps — never as an empty
 * plan, and never as an error.
 *
 * Exact comparison rather than a tolerance, but not because the second step is a copy of the first:
 * it is an nlopt output. It is bit-identical because nlopt runs with `SetStopVal(defaultGoalThreshold)`
 * from exactly the start configuration, so when the goal is already met it short-circuits at x0 and
 * hands the seed vector back unchanged. That makes the guard one that under-fires rather than one
 * that mis-fires: a goal near enough to look identical on screen but far enough to clear the
 * threshold gets a real two-step plan, and the user sees a preview that does not visibly move. A
 * tolerance here would trade that for hiding real short moves, which is the worse mistake.
 *
 * Length two is load-bearing: a longer plan that happens to end where it began is a real move that
 * goes somewhere and comes back, and hiding it would be worse than showing it.
 */
export const isAlreadyAtGoal = (trajectory: TrajectoryStep[]): boolean => {
	if (trajectory.length !== 2) return false

	const [first, last] = trajectory
	return first !== undefined && last !== undefined && sameInputs(first, last)
}

export { type TrajectoryStep } from '$lib/motion/jointPose'
