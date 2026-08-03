import { createWorld } from 'koota'
import { describe, expect, it } from 'vitest'

import { traits } from '$lib/ecs'
import { Pose } from '$lib/math'

import { syncFrameCenter } from '../syncFrameCenter'

describe('syncFrameCenter', () => {
	it('preserves a live geometry center while switching to a config frame', () => {
		const world = createWorld()
		const liveCenter = new Pose(125, 0, 0)
		const entity = world.spawn(traits.Center(liveCenter))

		syncFrameCenter(entity, new Pose(), true)

		expect(entity.get(traits.Center)?.x).toBe(125)
	})

	it('tracks live center changes and removals outside build mode', () => {
		const world = createWorld()
		const entity = world.spawn(traits.Center(new Pose(125, 0, 0)))

		syncFrameCenter(entity, new Pose(250, 0, 0), false)
		expect(entity.get(traits.Center)?.x).toBe(250)

		syncFrameCenter(entity, undefined, false)
		expect(entity.has(traits.Center)).toBe(false)
	})
})
