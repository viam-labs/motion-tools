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

const goal = new Pose(100, -200, 350).merge({ oX: 0, oY: 0, oZ: 1, theta: 45 })

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
			pose: { x: 100, y: -200, z: 350, oX: 0, oY: 0, oZ: 1, theta: 45 },
		})
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
})

describe('executeCommand', () => {
	const trajectory: TrajectoryStep[] = [{ 'left-arm': [0, 0.5] }, { 'left-arm': [0.1, 0.4] }]

	it('sends the trajectory back verbatim', () => {
		expect(executeCommand(trajectory).execute).toEqual(trajectory)
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

	// Throwing beats an empty result, which would read as "planned fine, nothing to show".
	it.each([
		['a non-object reply', 'nope' as JsonValue],
		['a reply with no plan key', { execute: true } as JsonValue],
		['a plan that is not an array', { plan: { arm: [0] } } as JsonValue],
		['joint values that are not numbers', { plan: [{ arm: ['0'] }] } as JsonValue],
		['an empty trajectory', { plan: [] } as JsonValue],
	])('rejects %s', (_label, value) => {
		expect(() => parsePlanResult(value)).toThrow(PlanCommandError)
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

	it.each<[string, TrajectoryStep[]]>([
		['a real move', [{ arm: [0] }, { arm: [1] }]],
		['a single step', [{ arm: [0] }]],
		['nothing at all', []],
		['different components', [{ arm: [0] }, { gantry: [0] }]],
		['a component only one step has', [{ arm: [0] }, { arm: [0], gripper: [1] }]],
		['different joint counts', [{ arm: [0] }, { arm: [0, 0] }]],
	])('is false for %s', (_label, trajectory) => {
		expect(isAlreadyAtGoal(trajectory)).toBe(false)
	})

	// The arm goes somewhere and comes back. Hiding that would be worse than showing it.
	it('is false for a longer plan that ends where it started', () => {
		expect(isAlreadyAtGoal([{ arm: [0] }, { arm: [1] }, { arm: [0] }])).toBe(false)
	})
})
