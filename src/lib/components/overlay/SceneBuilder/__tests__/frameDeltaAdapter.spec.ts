import type { Pose } from '@viamrobotics/sdk'

import { describe, expect, it } from 'vitest'

import type { Frame } from '$lib/frame'
import type { PartConfig } from '$lib/hooks/usePartConfig.svelte'

import { applyPreparedUpdates, type FrameDelta, type PreparedUpdate, validateProposedFrameDeltas } from '../frameDeltaAdapter'

const makeFrame = (overrides: Partial<Frame> = {}): Frame => ({
	parent: 'world',
	translation: { x: 0, y: 0, z: 0 },
	orientation: { type: 'ov_degrees', value: { x: 0, y: 0, z: 1, th: 0 } },
	...overrides,
})

const makeConfig = (components: PartConfig['components']): PartConfig => ({ components })

const recordingDeps = () => {
	const calls: { name: string; parent: string; pose: Pose; geometry: Frame['geometry'] }[] = []
	return {
		updateFrame: (name: string, parent: string, pose: Pose, geometry?: Frame['geometry']) => {
			calls.push({ name, parent, pose, geometry })
		},
		calls,
	}
}

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

	it('computes prepared update with a full orientation replacement', () => {
		const config = makeConfig([{ name: 'arm', frame: makeFrame() }])

		const { prepared } = validateProposedFrameDeltas(
			[{ componentName: 'arm', orientation: { x: 0, y: 1, z: 0, th: 90 } }],
			config
		)

		expect(prepared[0].pose.oX).toBe(0)
		expect(prepared[0].pose.oY).toBe(1)
		expect(prepared[0].pose.oZ).toBe(0)
		expect(prepared[0].pose.theta).toBe(90)
	})

	it.each([
		{ componentName: 'missing', translation: { x: 1 } },
	] satisfies FrameDelta[])(
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

describe('applyPreparedUpdates', () => {
	it('calls updateFrame for each prepared update', () => {
		const { updateFrame, calls } = recordingDeps()
		const prepared: PreparedUpdate[] = [
			{
				componentName: 'arm',
				parent: 'world',
				previousParent: 'world',
				pose: { x: 100, y: 0, z: 0, oX: 0, oY: 0, oZ: 1, theta: 0 },
				previousPose: { x: 0, y: 0, z: 0, oX: 0, oY: 0, oZ: 1, theta: 0 },
			},
			{
				componentName: 'gripper',
				parent: 'arm',
				previousParent: 'world',
				pose: { x: 0, y: 0, z: 50, oX: 0, oY: 0, oZ: 1, theta: 0 },
				previousPose: { x: 0, y: 0, z: 0, oX: 0, oY: 0, oZ: 1, theta: 0 },
			},
		]

		applyPreparedUpdates(prepared, { updateFrame })

		expect(calls).toHaveLength(2)
		expect(calls[0].name).toBe('arm')
		expect(calls[0].pose.x).toBe(100)
		expect(calls[1].name).toBe('gripper')
		expect(calls[1].parent).toBe('arm')
	})
})
