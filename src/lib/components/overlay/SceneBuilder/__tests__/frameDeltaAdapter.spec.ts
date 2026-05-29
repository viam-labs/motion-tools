import type { Pose } from '@viamrobotics/sdk'
import { describe, expect, it } from 'vitest'

import type { Frame } from '$lib/frame'
import type { PartConfig } from '$lib/hooks/usePartConfig.svelte'

import { applyFrameDeltas, type FrameDelta } from '../frameDeltaAdapter'

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

describe('applyFrameDeltas', () => {
	it('calls updateFrame with merged pose for a valid translation delta', () => {
		const { updateFrame, calls } = recordingDeps()
		const config = makeConfig([{ name: 'arm', frame: makeFrame() }])

		const result = applyFrameDeltas([{ componentName: 'arm', translation: { x: 100 } }], config, {
			updateFrame,
		})

		expect(calls).toHaveLength(1)
		expect(calls[0].name).toBe('arm')
		expect(calls[0].pose.x).toBe(100)
		expect(calls[0].pose.y).toBe(0)
		expect(result.errors).toHaveLength(0)
	})

	it('records a diff entry for each changed translation axis', () => {
		const { updateFrame } = recordingDeps()
		const config = makeConfig([{ name: 'arm', frame: makeFrame() }])

		const result = applyFrameDeltas(
			[{ componentName: 'arm', translation: { x: 100, z: 50 } }],
			config,
			{ updateFrame }
		)

		const fields = result.applied.map((c) => c.field)
		expect(fields).toContain('translation.x')
		expect(fields).toContain('translation.z')
		expect(fields).not.toContain('translation.y')
	})

	it('preserves unchanged axes when applying a partial translation delta', () => {
		const { updateFrame, calls } = recordingDeps()
		const config = makeConfig([
			{ name: 'arm', frame: makeFrame({ translation: { x: 10, y: 20, z: 30 } }) },
		])

		applyFrameDeltas([{ componentName: 'arm', translation: { z: 99 } }], config, { updateFrame })

		expect(calls[0].pose.x).toBe(10)
		expect(calls[0].pose.y).toBe(20)
		expect(calls[0].pose.z).toBe(99)
	})

	it('records old and new values in the diff entry', () => {
		const { updateFrame } = recordingDeps()
		const config = makeConfig([
			{ name: 'arm', frame: makeFrame({ translation: { x: 10, y: 0, z: 0 } }) },
		])

		const result = applyFrameDeltas(
			[{ componentName: 'arm', translation: { x: 200 } }],
			config,
			{ updateFrame }
		)

		const change = result.applied.find((c) => c.field === 'translation.x')
		expect(change?.oldValue).toBe('10')
		expect(change?.newValue).toBe('200')
	})

	it('records a diff entry for a parent change', () => {
		const { updateFrame } = recordingDeps()
		const config = makeConfig([
			{ name: 'arm', frame: makeFrame() },
			{ name: 'base', frame: makeFrame() },
		])

		const result = applyFrameDeltas([{ componentName: 'arm', parent: 'base' }], config, {
			updateFrame,
		})

		const change = result.applied.find((c) => c.field === 'parent')
		expect(change?.oldValue).toBe('world')
		expect(change?.newValue).toBe('base')
	})

	it('accepts world as a valid parent', () => {
		const { updateFrame, calls } = recordingDeps()
		const config = makeConfig([{ name: 'arm', frame: makeFrame({ parent: 'base' }) }])

		const result = applyFrameDeltas([{ componentName: 'arm', parent: 'world' }], config, {
			updateFrame,
		})

		expect(calls[0].parent).toBe('world')
		expect(result.errors).toHaveLength(0)
	})

	it('applies a full orientation replacement', () => {
		const { updateFrame, calls } = recordingDeps()
		const config = makeConfig([{ name: 'arm', frame: makeFrame() }])

		applyFrameDeltas(
			[{ componentName: 'arm', orientation: { x: 0, y: 1, z: 0, th: 90 } }],
			config,
			{ updateFrame }
		)

		expect(calls[0].pose.oX).toBe(0)
		expect(calls[0].pose.oY).toBe(1)
		expect(calls[0].pose.oZ).toBe(0)
		expect(calls[0].pose.theta).toBe(90)
	})

	it.each([
		{ componentName: 'missing', translation: { x: 1 } },
	] satisfies FrameDelta[])(
		'surfaces an error for component $componentName not in config',
		(delta) => {
			const { updateFrame, calls } = recordingDeps()
			const config = makeConfig([{ name: 'arm', frame: makeFrame() }])

			const result = applyFrameDeltas([delta], config, { updateFrame })

			expect(calls).toHaveLength(0)
			expect(result.errors).toHaveLength(1)
			expect(result.errors[0].componentName).toBe(delta.componentName)
		}
	)

	it('surfaces an error for a component with no frame', () => {
		const { updateFrame, calls } = recordingDeps()
		const config = makeConfig([{ name: 'sensor' }])

		const result = applyFrameDeltas(
			[{ componentName: 'sensor', translation: { x: 50 } }],
			config,
			{ updateFrame }
		)

		expect(calls).toHaveLength(0)
		expect(result.errors[0].reason).toMatch(/no frame/i)
	})

	it('surfaces an error for an unknown proposed parent', () => {
		const { updateFrame, calls } = recordingDeps()
		const config = makeConfig([{ name: 'arm', frame: makeFrame() }])

		const result = applyFrameDeltas(
			[{ componentName: 'arm', parent: 'ghost-frame' }],
			config,
			{ updateFrame }
		)

		expect(calls).toHaveLength(0)
		expect(result.errors[0].reason).toContain('ghost-frame')
	})

	it('surfaces an error for non-finite numeric values', () => {
		const { updateFrame, calls } = recordingDeps()
		const config = makeConfig([{ name: 'arm', frame: makeFrame() }])

		const result = applyFrameDeltas(
			[{ componentName: 'arm', translation: { x: Number.NaN } }],
			config,
			{ updateFrame }
		)

		expect(calls).toHaveLength(0)
		expect(result.errors[0].reason).toMatch(/non-finite/i)
	})

	it('applies valid deltas and surfaces errors for invalid ones in the same batch', () => {
		const { updateFrame, calls } = recordingDeps()
		const config = makeConfig([
			{ name: 'arm', frame: makeFrame() },
			{ name: 'gripper', frame: makeFrame() },
		])

		const result = applyFrameDeltas(
			[
				{ componentName: 'arm', translation: { x: 100 } },
				{ componentName: 'ghost', translation: { x: 50 } },
				{ componentName: 'gripper', translation: { z: 200 } },
			],
			config,
			{ updateFrame }
		)

		expect(calls).toHaveLength(2)
		expect(result.errors).toHaveLength(1)
		expect(result.errors[0].componentName).toBe('ghost')
	})
})
