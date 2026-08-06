import type { JsonValue } from '@bufbuild/protobuf'

import { describe, expect, it } from 'vitest'

import { Pose } from '$lib/math'

import { parseMoveOptions } from '../parseMoveOptions'
import {
	executeCommand,
	isAlreadyAtGoal,
	parsePlanResult,
	planCommand,
	PlanCommandError,
	type TrajectoryStep,
} from '../planDoCommand'

// Distinct orientation components, so a transposed `oX`/`oY` cannot pass unnoticed.
const goal = new Pose(100, -200, 350).merge({ oX: 0.6, oY: -0.8, oZ: 1, theta: 45 })

/**
 * The message's own field shape with no prototype, which is what the SDK's `WorldState` *type* means
 * (`sdk/dist/types.d.ts:51` aliases it to `PlainMessage`). A spread keeps the fields, including the
 * `{case, value}` oneofs, and drops the methods.
 */
const asPlainMessage = <T extends object>(message: T): T => ({ ...message })

const request = (overrides: Partial<Parameters<typeof planCommand>[0]> = {}) =>
	planCommand({
		service: 'builtin',
		componentName: 'left-arm',
		destination: { referenceFrame: 'world', pose: goal },
		...overrides,
	})

/** RDK `protojson.Unmarshal`s the command's value, so the payload is a JSON *string*. */
const moveRequestOf = (command: Record<string, JsonValue>) =>
	JSON.parse(command.plan as string) as Record<string, JsonValue>

describe('planCommand', () => {
	it('addresses the motion service and the frame being moved', () => {
		const moveRequest = moveRequestOf(request())
		expect(moveRequest.name).toBe('builtin')
		expect(moveRequest.componentName).toBe('left-arm')
	})

	it('serializes the destination with protojson field names and units', () => {
		expect(moveRequestOf(request()).destination).toEqual({
			referenceFrame: 'world',
			// Millimetres, with `theta` in degrees — what `toDestinationPose` produces.
			pose: { x: 100, y: -200, z: 350, oX: 0.6, oY: -0.8, oZ: 1, theta: 45 },
		})
	})

	/**
	 * The whole payload, not just the fields we care about. RDK unmarshals this with
	 * `protojson.Unmarshal` and default options, so `DiscardUnknown` is false and *any* key that is
	 * not a `MoveRequest` field is a hard RPC error. A stray or misspelled key would break every real
	 * plan call while a field-by-field spec stayed green.
	 */
	it('sends exactly the fields `MoveRequest` declares and no others', () => {
		expect(Object.keys(moveRequestOf(request())).toSorted()).toEqual([
			'componentName',
			'destination',
			'name',
		])
	})

	/**
	 * `JSON.stringify` writes `null` for a non-finite number, and Go's protojson skips a null scalar
	 * rather than rejecting it — so RDK would read the field's zero, plan a valid move to a
	 * destination nobody asked for, and hand back a trajectory that looks fine. `client.move` cannot
	 * do this: a proto double carries the NaN and the planner refuses it.
	 */
	it.each(['x', 'theta'])('refuses a goal whose %s is not finite', (field) => {
		const broken = goal.clone().merge({ [field]: Number.NaN })

		expect(() => request({ destination: { referenceFrame: 'world', pose: broken } })).toThrow(
			PlanCommandError
		)
	})

	it('omits world state and constraints when the panel`s fields are empty', () => {
		const moveRequest = moveRequestOf(request(parseMoveOptions('', '')))
		expect(moveRequest.worldState).toBeUndefined()
		expect(moveRequest.constraints).toBeUndefined()
	})

	// The preview has to plan the same problem the subsequent move would, or it previews a
	// different one.
	it('passes through the same world state and constraints `move` would receive', () => {
		const options = parseMoveOptions(
			'{"obstacles":[{"referenceFrame":"world","geometries":[{"sphere":{"radiusMm":50}}]}]}',
			'{"linearConstraint":[{"lineToleranceMm":5}]}'
		)

		const moveRequest = moveRequestOf(request(options))
		expect(moveRequest.worldState).toEqual({
			obstacles: [{ referenceFrame: 'world', geometries: [{ sphere: { radiusMm: 50 } }] }],
		})
		expect(moveRequest.constraints).toEqual({ linearConstraint: [{ lineToleranceMm: 5 }] })
	})

	/**
	 * What the *type* promises. `parseMoveOptions` happens to return real message instances, for which
	 * the rebuild is a no-op — so with only that input, deleting the rebuild passes every test and
	 * then dies on `worldState.toJson is not a function` the first time a caller honours the signature.
	 */
	it('accepts the plain-message shape its signature actually describes', () => {
		const options = parseMoveOptions(
			'{"obstacles":[{"referenceFrame":"world","geometries":[{"sphere":{"radiusMm":50}}]}]}',
			'{"linearConstraint":[{"lineToleranceMm":5}]}'
		)

		const moveRequest = moveRequestOf(
			request({
				worldState: options.worldState && asPlainMessage(options.worldState),
				constraints: options.constraints && asPlainMessage(options.constraints),
			})
		)

		// The sphere in particular: a geometry's shape is a oneof, which is the part a careless rebuild
		// drops, leaving an obstacle with no volume and a preview that plans straight through it.
		expect(moveRequest.worldState).toEqual({
			obstacles: [{ referenceFrame: 'world', geometries: [{ sphere: { radiusMm: 50 } }] }],
		})
		expect(moveRequest.constraints).toEqual({ linearConstraint: [{ lineToleranceMm: 5 }] })
	})
})

describe('executeCommand', () => {
	const trajectory: TrajectoryStep[] = [{ 'left-arm': [0, 0.5] }, { 'left-arm': [0.1, 0.4] }]

	// Against a literal, not against `trajectory` itself: the command holds the same array reference,
	// so comparing it to its own source is a tautology that any in-place reordering or rounding of
	// the steps would survive — and the arm would run whatever the mutation left behind.
	it('sends the trajectory back verbatim', () => {
		expect(executeCommand(trajectory).execute).toEqual([
			{ 'left-arm': [0, 0.5] },
			{ 'left-arm': [0.1, 0.4] },
		])
	})

	/**
	 * The key's presence is the switch (`builtin.go:376`). Without it epsilon is `math.MaxFloat64`,
	 * so RDK compares the trajectory's first step against where the components actually are and can
	 * never find them too far away — a plan validated from one configuration runs from any other.
	 */
	it('arms the start-state check RDK will not run unasked', () => {
		expect(executeCommand(trajectory)).toHaveProperty('executeCheckStart')
	})

	// Anything ≤ 0 selects `defaultExecuteEpsilon`, so the tolerance stays RDK's to choose.
	it('defers the tolerance to RDK rather than naming one', () => {
		expect(executeCommand(trajectory).executeCheckStart).toBeLessThanOrEqual(0)
	})
})

describe('parsePlanResult', () => {
	it('reads the trajectory RDK returns under the command`s own key', () => {
		const { trajectory } = parsePlanResult({
			plan: [{ 'left-arm': [0, 0.5], 'left-gripper': [] }],
		})

		expect(trajectory).toEqual([{ 'left-arm': [0, 0.5], 'left-gripper': [] }])
	})

	/**
	 * Throwing beats an empty result, which would read as "planned fine, nothing to show".
	 *
	 * Each row asserts its own message, not just that something threw. The four paths say four
	 * different things to a user — one of them tells them to go and upgrade RDK — and a bare
	 * `toThrow(PlanCommandError)` cannot tell them apart, so any of them could drift into the
	 * version-blaming text unnoticed.
	 */
	it.each([
		['a non-object reply', 'nope' as JsonValue, /unexpected plan response/],
		['a reply with no plan key', { execute: true } as JsonValue, /no trajectory/],
		['a null plan, which is how a Go nil marshals', { plan: null } as JsonValue, /no trajectory/],
		['a plan that is not an array', { plan: { arm: [0] } } as JsonValue, /cannot read/],
		['joint values that are not numbers', { plan: [{ arm: ['0'] }] } as JsonValue, /cannot read/],
		['a null step', { plan: [{ arm: [0] }, null] } as JsonValue, /cannot read/],
		['a null joint value', { plan: [{ arm: [0, null] }] } as JsonValue, /cannot read/],
		['an empty trajectory', { plan: [] } as JsonValue, /empty trajectory/],
	])('rejects %s', (_label, value, message) => {
		expect(() => parsePlanResult(value)).toThrow(PlanCommandError)
		expect(() => parsePlanResult(value)).toThrow(message)
	})

	/**
	 * Steps that are structurally present but carry nothing readable. `every` says yes to both by
	 * default — an array is `typeof 'object'`, and `Object.values({})` is vacuously fine — and
	 * downstream nothing complains either, because `jointValueAt` resolves a missing column to `0`.
	 * The result was a plausible-looking arm drawn at the zero configuration rather than a reply
	 * reported as unreadable. `[[], []]` also satisfied `isAlreadyAtGoal`, so the panel claimed the
	 * machine was already there.
	 */
	it.each([
		['a step with no columns', { plan: [{ arm: [0] }, {}] } as JsonValue],
		[
			'a step that is an array',
			{
				plan: [
					[
						[0, 1],
						[2, 3],
					],
				],
			} as JsonValue,
		],
		['nothing but empty steps', { plan: [[], []] } as JsonValue],
	])('rejects %s rather than reading it as the zero configuration', (_label, value) => {
		expect(() => parsePlanResult(value)).toThrow(/cannot read/)
	})

	/**
	 * `typeof NaN === 'number'`, so a numeric-only check lets these through, and neither is a local
	 * defect once it is in. `interpolateTrajectory` sums every segment's frame cost to decide how
	 * finely to sample, so one non-finite value makes the total non-finite, which survives
	 * `Math.ceil` until the interior loop stops running: *every* segment of the plan collapses to
	 * one frame. That is the raw waypoint teleport interpolation exists to prevent, reached with no
	 * error raised anywhere and a `NaN` on the scrubber's coarsening readout.
	 *
	 * `planCommand` already refuses a non-finite goal on exactly this reasoning; this is the same
	 * rule applied to the reply.
	 */
	it.each([
		['NaN', Number.NaN],
		['Infinity', Number.POSITIVE_INFINITY],
		['-Infinity', Number.NEGATIVE_INFINITY],
	])('rejects a trajectory carrying %s rather than sampling the whole plan away', (_label, bad) => {
		const value = { plan: [{ arm: [0, 0] }, { arm: [0.5, bad] }] } as unknown as JsonValue

		expect(() => parsePlanResult(value)).toThrow(PlanCommandError)
		expect(() => parsePlanResult(value)).toThrow(/cannot read/)
	})

	/**
	 * There is no capability or version RPC to probe a machine with, so the only evidence available is
	 * what came back. An RDK older than ~v0.101 serialises `Input` as `{Value: number}`, which reaches
	 * us as a successful plan we cannot read — worth saying, rather than reporting it as no plan.
	 */
	it('tells an unreadable trajectory apart from an absent one', () => {
		const old = { plan: [{ arm: [{ Value: 0.1 }] }] } as JsonValue

		expect(() => parsePlanResult(old)).toThrow(/older than/)
		expect(() => parsePlanResult({ execute: true })).not.toThrow(/older than/)
	})
})

/**
 * RDK seeds the trajectory with the start configuration before planning towards the goal, so a move
 * that is already satisfied comes back as two identical steps. It never comes back empty, and never
 * as an error — so a check keyed on emptiness never fires and the user gets a two-frame scrubber
 * that appears to do nothing.
 */
describe('isAlreadyAtGoal', () => {
	it('recognises the start configuration returned twice', () => {
		expect(isAlreadyAtGoal([{ arm: [0, 1.5] }, { arm: [0, 1.5] }])).toBe(true)
	})

	/**
	 * A real reply keys every frame in the system, including the zero-DoF ones RDK pads with `[]` —
	 * the shape `plan-gantry.json` carries. With only single-component steps the per-component loop
	 * is never a loop, so `every` and `some` behave identically and the difference between "all
	 * components held still" and "any one of them did" goes untested. Under `some`, the `_origin`
	 * frames alone satisfy it and every real move reads as already-at-goal.
	 */
	it('recognises a full multi-component step, padding and all', () => {
		const step: TrajectoryStep = {
			'arm-1': [0, 0, 0, 0, 0, 0],
			'arm-1_origin': [],
			'gantry-1': [50],
			'gantry-1_origin': [],
		}

		expect(isAlreadyAtGoal([step, { ...step }])).toBe(true)
	})

	it('is false when one component moves and the rest are held', () => {
		const held = { 'arm-1_origin': [], 'gantry-1': [50], 'gantry-1_origin': [] }

		expect(
			isAlreadyAtGoal([
				{ 'arm-1': [0, 0, 0], ...held },
				{ 'arm-1': [0.4, 0, 0], ...held },
			])
		).toBe(false)
	})

	it.each<[string, TrajectoryStep[]]>([
		['a real move', [{ arm: [0] }, { arm: [1] }]],
		['a single step', [{ arm: [0] }]],
		['nothing at all', []],
		['different components', [{ arm: [0] }, { gantry: [0] }]],
		['a component only one step has', [{ arm: [0] }, { arm: [0], gripper: [1] }]],
		['different joint counts', [{ arm: [0] }, { arm: [0, 0] }]],
		// A plain `b[name]` lookup reads through to `Object.prototype`, where `toString.length` is 0
		// and matches an empty column, so two steps naming different components compared equal.
		['a component sharing a name with an Object member', [{ toString: [] }, { arm: [] }]],
	])('is false for %s', (_label, trajectory) => {
		expect(isAlreadyAtGoal(trajectory)).toBe(false)
	})

	/**
	 * The arm goes somewhere and comes back. Hiding that would be worse than showing it.
	 *
	 * The second case is the one that pins the length check itself: destructuring reads indices 0 and
	 * 1, so a plan whose *first two* steps differ stays false even if the length test is loosened.
	 * Here the seeded start is repeated, so only `length !== 2` keeps it false.
	 */
	it.each<[string, TrajectoryStep[]]>([
		['ending where it started', [{ arm: [0] }, { arm: [1] }, { arm: [0] }]],
		['repeating its seed before moving', [{ arm: [0] }, { arm: [0] }, { arm: [1] }]],
	])('is false for a longer plan %s', (_label, trajectory) => {
		expect(isAlreadyAtGoal(trajectory)).toBe(false)
	})
})
