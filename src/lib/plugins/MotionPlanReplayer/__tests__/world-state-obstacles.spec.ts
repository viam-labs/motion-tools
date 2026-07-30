import { describe, expect, it, vi } from 'vitest'

import { parsePlan } from '../parse-plan'
import { worldStateObstacleTransforms } from '../world-state-obstacles'
import pirouettePlan from './__fixtures__/pirouette-plan.json?raw'

type WorldStateObstacles = {
	obstacles: Array<{
		referenceFrame: string
		geometries: Array<{
			center: { x: number; y: number; z: number }
			box: { dimsMm: { x: number; y: number; z: number } }
			label: string
		}>
	}>
}

const worldState = parsePlan(pirouettePlan).worldState as WorldStateObstacles
const group = worldState.obstacles[0]!

/** Go-marshal twin of the capture's world_state. */
const asObstaclesInWorldFrame = {
	frame: group.referenceFrame,
	geometries: group.geometries.map((g) => ({
		type: 'box',
		x: g.box.dimsMm.x,
		y: g.box.dimsMm.y,
		z: g.box.dimsMm.z,
		r: 0,
		l: 0,
		translation: { X: g.center.x, Y: g.center.y, Z: g.center.z },
		orientation: { type: 'quaternion', value: { W: 1, X: 0, Y: 0, Z: 0 } },
		Label: g.label,
	})),
}

describe('worldStateObstacleTransforms', () => {
	it.each([
		['world_state', worldState],
		['obstacles_in_world_frame', asObstaclesInWorldFrame],
	] as const)('draws namespaced obstacles from %s', (_key, payload) => {
		const transforms = worldStateObstacleTransforms(payload)
		expect(transforms.map((t) => t.referenceFrame)).toEqual([
			'obstacle:pallet',
			'obstacle:pick-station',
		])
		expect(transforms[0]?.physicalObject?.geometryType.case).toBe('box')
	})

	it('draws geometry-bearing WorldState transforms and skips bare ones', () => {
		const drawn = worldStateObstacleTransforms({
			transforms: [
				{
					referenceFrame: 'moving-box',
					poseInObserverFrame: { referenceFrame: 'arm', pose: { x: 5, oZ: 1 } },
					physicalObject: { box: { dimsMm: { x: 10, y: 10, z: 10 } }, label: 'moving-box' },
				},
				{ referenceFrame: 'plumbing', poseInObserverFrame: { referenceFrame: 'world' } },
			],
		})
		expect(drawn).toHaveLength(1)
		expect(drawn[0]?.referenceFrame).toBe('obstacle:moving-box')
		expect(drawn[0]?.poseInObserverFrame?.referenceFrame).toBe('arm')
	})

	it('returns [] and warns on an undecodable WorldState', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
		expect(worldStateObstacleTransforms({ obstacles: 'nonsense' })).toEqual([])
		expect(warn).toHaveBeenCalled()
		warn.mockRestore()
	})
})
