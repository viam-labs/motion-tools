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
 * Selects RDK's own `defaultExecuteEpsilon` rather than naming a tolerance here. `builtin.go:376`
 * reads any value ≤ 0 — or anything that is not a float — as "use the default", which is the right
 * answer: how far an arm may have drifted before its plan is stale is a property of the arm, not
 * something a viewer should be deciding for it.
 */
const RDK_DEFAULT_EPSILON = 0

/**
 * Builds the `execute` command for a trajectory a previous `plan` produced.
 *
 * `executeCheckStart` is what arms RDK's own start-state guard. Its *presence* is the switch
 * (`builtin.go:376`); omit it and epsilon is `math.MaxFloat64`, so the comparison at `builtin.go:621`
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

const isTrajectory = (value: unknown): value is TrajectoryStep[] =>
	Array.isArray(value) &&
	value.every(
		(step) =>
			typeof step === 'object' &&
			step !== null &&
			Object.values(step as Record<string, unknown>).every(
				(inputs) => Array.isArray(inputs) && inputs.every((input) => typeof input === 'number')
			)
	)

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

	if (trajectory === undefined) {
		throw new PlanCommandError('Motion service returned no trajectory for this move.')
	}

	// Told apart from an absent key deliberately. An RDK older than ~v0.101 answers a plan that
	// *succeeded* with `[{"Value": 0.1}]`, because `Input` was a struct rather than a float alias —
	// and the same versions take `component_name` as a `ResourceName`, so the request would not have
	// unmarshalled either. There is no capability or version RPC to probe with, so the shape of the
	// reply is the only evidence available for saying so.
	if (!isTrajectory(trajectory)) {
		throw new PlanCommandError(
			'Motion service returned a trajectory this client cannot read. The machine may be running a version of RDK older than v0.101.'
		)
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
 * RDK seeds its trajectory with the start configuration before it plans towards the goal, so a move
 * whose goal is already satisfied comes back as that one configuration twice — never as an empty
 * plan, and never as an error. Exact comparison rather than a tolerance, because the two steps are
 * the same node written out twice.
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
