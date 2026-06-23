import { Transform } from '@viamrobotics/sdk'
import { describe, expect, it } from 'vitest'

import type { Frame } from '$lib/frame'
import type { FragmentInfo } from '$lib/hooks/useFragmentInfo.svelte'
import type { PartConfig } from '$lib/hooks/usePartConfig.svelte'

import { createPose } from '$lib/transform'

import {
	type FrameDelta,
	resolveFragmentCurrentFrames,
	validateProposedFrameDeltas,
} from '../frameDeltaAdapter'

const makeFrame = (overrides: Partial<Frame> = {}): Frame => ({
	parent: 'world',
	translation: { x: 0, y: 0, z: 0 },
	orientation: { type: 'ov_degrees', value: { x: 0, y: 0, z: 1, th: 0 } },
	...overrides,
})

const makeConfig = (components: PartConfig['components']): PartConfig => ({ components })

const makeTransform = (
	name: string,
	parent: string,
	pose: Parameters<typeof createPose>[0] = {}
): Transform =>
	new Transform({
		referenceFrame: name,
		poseInObserverFrame: { referenceFrame: parent, pose: createPose(pose) },
	})

const makeFragmentMeta = (overrides: Partial<FragmentInfo> = {}): FragmentInfo => ({
	id: 'fragment-id',
	name: 'test-fragment',
	api: 'rdk:component:arm',
	variables: {},
	...overrides,
})

const makeFragmentInfoMap = (
	componentName: string,
	frameOverrides: Partial<Frame> = {}
): Record<string, FragmentInfo> => ({
	[componentName]: makeFragmentMeta({ frame: makeFrame(frameOverrides) }),
})

describe('validateProposedFrameDeltas', () => {
	it('computes a prepared update with merged pose for a valid translation delta', () => {
		const config = makeConfig([{ name: 'arm', frame: makeFrame() }])

		const { prepared, errors } = validateProposedFrameDeltas(
			[{ componentName: 'arm', translation: { x: 100 } }],
			config
		)

		expect(prepared).toHaveLength(1)
		expect(prepared[0].componentName).toBe('arm')
		expect(prepared[0].pose.x).toBe(100)
		expect(prepared[0].pose.y).toBe(0)
		expect(errors).toHaveLength(0)
	})

	it('preserves unchanged axes when applying a partial translation delta', () => {
		const config = makeConfig([
			{ name: 'arm', frame: makeFrame({ translation: { x: 10, y: 20, z: 30 } }) },
		])

		const { prepared } = validateProposedFrameDeltas(
			[{ componentName: 'arm', translation: { z: 99 } }],
			config
		)

		expect(prepared[0].pose.x).toBe(10)
		expect(prepared[0].pose.y).toBe(20)
		expect(prepared[0].pose.z).toBe(99)
	})

	it('captures previous pose values alongside new ones', () => {
		const config = makeConfig([
			{ name: 'arm', frame: makeFrame({ translation: { x: 10, y: 0, z: 0 } }) },
		])

		const { prepared } = validateProposedFrameDeltas(
			[{ componentName: 'arm', translation: { x: 200 } }],
			config
		)

		expect(prepared[0].previousPose.x).toBe(10)
		expect(prepared[0].pose.x).toBe(200)
	})

	it('captures parent change with previous parent', () => {
		const config = makeConfig([
			{ name: 'arm', frame: makeFrame() },
			{ name: 'base', frame: makeFrame() },
		])

		const { prepared } = validateProposedFrameDeltas(
			[{ componentName: 'arm', parent: 'base' }],
			config
		)

		expect(prepared[0].previousParent).toBe('world')
		expect(prepared[0].parent).toBe('base')
	})

	it('accepts world as a valid parent', () => {
		const config = makeConfig([{ name: 'arm', frame: makeFrame({ parent: 'base' }) }])

		const { prepared, errors } = validateProposedFrameDeltas(
			[{ componentName: 'arm', parent: 'world' }],
			config
		)

		expect(prepared[0].parent).toBe('world')
		expect(errors).toHaveLength(0)
	})

	it('applies a yaw euler delta to an identity frame', () => {
		const config = makeConfig([{ name: 'arm', frame: makeFrame() }])

		const { prepared } = validateProposedFrameDeltas(
			[{ componentName: 'arm', orientation: { yaw: 90 } }],
			config
		)

		expect(prepared[0].pose.oX).toBeCloseTo(0)
		expect(prepared[0].pose.oY).toBeCloseTo(0)
		expect(prepared[0].pose.oZ).toBeCloseTo(1)
		expect(prepared[0].pose.theta).toBeCloseTo(90)
	})

	it('applies a pitch euler delta to an identity frame', () => {
		const config = makeConfig([{ name: 'arm', frame: makeFrame() }])

		const { prepared } = validateProposedFrameDeltas(
			[{ componentName: 'arm', orientation: { pitch: -30 } }],
			config
		)

		// The Viam OV encodes where Z points: pitch -30° tilts Z toward -X
		expect(prepared[0].pose.oX).toBeCloseTo(-0.5)
		expect(prepared[0].pose.oZ).toBeCloseTo(0.866)
	})

	it('incorporates previous orientation when applying a partial euler delta', () => {
		const identityConfig = makeConfig([{ name: 'arm', frame: makeFrame() }])
		// OV encoding of a -30° pitch (Z points toward (-0.5, 0, 0.866), th=-180° is the Viam twist)
		const pitchedConfig = makeConfig([
			{
				name: 'arm',
				frame: makeFrame({
					orientation: { type: 'ov_degrees', value: { x: -0.5, y: 0, z: 0.866, th: -180 } },
				}),
			},
		])

		const { prepared: fromIdentity } = validateProposedFrameDeltas(
			[{ componentName: 'arm', orientation: { yaw: 90 } }],
			identityConfig
		)
		const { prepared: fromPitched } = validateProposedFrameDeltas(
			[{ componentName: 'arm', orientation: { yaw: 90 } }],
			pitchedConfig
		)

		// Yaw on identity: Z stays along Z (oY=0); yaw on a pre-pitched frame: the pitch-tilted Z
		// axis rotates into the Y direction under 90° yaw, so oY=-0.5
		expect(fromIdentity[0].pose.oY).toBeCloseTo(0)
		expect(fromPitched[0].pose.oY).toBeCloseTo(-0.5)
	})

	it.each([{ componentName: 'missing', translation: { x: 1 } }] satisfies FrameDelta[])(
		'surfaces an error for component $componentName not in config',
		(delta) => {
			const config = makeConfig([{ name: 'arm', frame: makeFrame() }])

			const { prepared, errors } = validateProposedFrameDeltas([delta], config)

			expect(prepared).toHaveLength(0)
			expect(errors).toHaveLength(1)
			expect(errors[0].componentName).toBe(delta.componentName)
		}
	)

	it('surfaces an error for a component with no frame', () => {
		const config = makeConfig([{ name: 'sensor' }])

		const { prepared, errors } = validateProposedFrameDeltas(
			[{ componentName: 'sensor', translation: { x: 50 } }],
			config
		)

		expect(prepared).toHaveLength(0)
		expect(errors[0].reason).toMatch(/no frame/i)
	})

	it('surfaces an error for an unknown proposed parent', () => {
		const config = makeConfig([{ name: 'arm', frame: makeFrame() }])

		const { prepared, errors } = validateProposedFrameDeltas(
			[{ componentName: 'arm', parent: 'ghost-frame' }],
			config
		)

		expect(prepared).toHaveLength(0)
		expect(errors[0].reason).toContain('ghost-frame')
	})

	it('surfaces an error for non-finite numeric values', () => {
		const config = makeConfig([{ name: 'arm', frame: makeFrame() }])

		const { prepared, errors } = validateProposedFrameDeltas(
			[{ componentName: 'arm', translation: { x: Number.NaN } }],
			config
		)

		expect(prepared).toHaveLength(0)
		expect(errors[0].reason).toMatch(/non-finite/i)
	})

	it('passes explanation through to the prepared update when present', () => {
		const config = makeConfig([{ name: 'arm', frame: makeFrame() }])

		const { prepared } = validateProposedFrameDeltas(
			[
				{
					componentName: 'arm',
					translation: { x: 200 },
					explanation: 'move 200mm forward along X',
				},
			],
			config
		)

		expect(prepared[0].explanation).toBe('move 200mm forward along X')
	})

	it('leaves explanation undefined when the delta omits it', () => {
		const config = makeConfig([{ name: 'arm', frame: makeFrame() }])

		const { prepared } = validateProposedFrameDeltas(
			[{ componentName: 'arm', translation: { x: 200 } }],
			config
		)

		expect(prepared[0].explanation).toBeUndefined()
	})

	it('prepares valid deltas and surfaces errors for invalid ones in the same batch', () => {
		const config = makeConfig([
			{ name: 'arm', frame: makeFrame() },
			{ name: 'gripper', frame: makeFrame() },
		])

		const { prepared, errors } = validateProposedFrameDeltas(
			[
				{ componentName: 'arm', translation: { x: 100 } },
				{ componentName: 'ghost', translation: { x: 50 } },
				{ componentName: 'gripper', translation: { z: 200 } },
			],
			config
		)

		expect(prepared).toHaveLength(2)
		expect(errors).toHaveLength(1)
		expect(errors[0].componentName).toBe('ghost')
	})
})

describe('resolveFragmentCurrentFrames', () => {
	const gripperMeta = makeFragmentMeta()

	it('uses the live frame when there is no config override', () => {
		const live = [makeTransform('gripper', 'arm', { x: 5, y: 6, z: 7 })]

		const result = resolveFragmentCurrentFrames(['gripper'], { gripper: gripperMeta }, live, {})

		expect(result.gripper!.frame!.parent).toBe('arm')
		expect(result.gripper!.frame!.translation.x).toBe(5)
		expect(result.gripper!.frame!.translation.z).toBe(7)
	})

	it('lets a config $set-mod override win over the live frame', () => {
		const live = [makeTransform('gripper', 'arm', { x: 5 })]
		const configFrames = { gripper: makeTransform('gripper', 'base', { x: 99 }) }

		const result = resolveFragmentCurrentFrames(
			['gripper'],
			{ gripper: gripperMeta },
			live,
			configFrames
		)

		expect(result.gripper!.frame!.parent).toBe('base')
		expect(result.gripper!.frame!.translation.x).toBe(99)
	})

	it('skips a fragment component with no live frame and no override', () => {
		const result = resolveFragmentCurrentFrames(['gripper'], { gripper: gripperMeta }, [], {})

		expect(result.gripper).toBeUndefined()
		expect(Object.keys(result)).toHaveLength(0)
	})
})

describe('validateProposedFrameDeltas with fragment components', () => {
	const fragmentFrames = makeFragmentInfoMap('gripper', {
		parent: 'arm',
		translation: { x: 10, y: 0, z: 0 },
	})

	it('prepares an update for a fragment component absent from config.components', () => {
		const { prepared, errors } = validateProposedFrameDeltas(
			[{ componentName: 'gripper', translation: { x: 100 } }],
			makeConfig([]),
			fragmentFrames
		)

		expect(errors).toHaveLength(0)
		expect(prepared).toHaveLength(1)
		expect(prepared[0].previousParent).toBe('arm')
		expect(prepared[0].previousPose.x).toBe(10)
		expect(prepared[0].pose.x).toBe(100)
	})

	it('accepts a fragment component as a valid parent', () => {
		const { prepared, errors } = validateProposedFrameDeltas(
			[{ componentName: 'arm', parent: 'gripper' }],
			makeConfig([{ name: 'arm', frame: makeFrame() }]),
			fragmentFrames
		)

		expect(errors).toHaveLength(0)
		expect(prepared[0].parent).toBe('gripper')
	})

	it('still errors for a component in neither config nor fragments', () => {
		const { prepared, errors } = validateProposedFrameDeltas(
			[{ componentName: 'ghost', translation: { x: 1 } }],
			makeConfig([]),
			fragmentFrames
		)

		expect(prepared).toHaveLength(0)
		expect(errors[0].reason).toMatch(/not found/i)
	})

	it('prefers the part component frame over a same-named fragment entry', () => {
		// Names never overlap in practice, but the part-config branch should win.
		const { prepared } = validateProposedFrameDeltas(
			[{ componentName: 'arm', translation: { x: 1 } }],
			makeConfig([{ name: 'arm', frame: makeFrame({ parent: 'world' }) }]),
			makeFragmentInfoMap('arm', { parent: 'fragment-parent', translation: { x: 500, y: 0, z: 0 } })
		)

		expect(prepared[0].previousParent).toBe('world')
		expect(prepared[0].previousPose.x).toBe(0)
	})
})
