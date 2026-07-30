import { describe, expect, it, vi } from 'vitest'

import { parsePlan } from '../parse-plan'
import { worldStateObstacleTransforms } from '../world-state-obstacles'
import pirouettePlan from './__fixtures__/pirouette-plan.json?raw'

const pirouette = parsePlan(pirouettePlan)
const pirouetteWorldState = pirouette.worldState as {
	obstacles: Array<{
		referenceFrame: string
		geometries: Array<{
			center: { x: number; y: number; z: number; oZ?: number }
			box: { dimsMm: { x: number; y: number; z: number } }
			label: string
		}>
	}>
}

/** Go-marshal twin of the capture's world_state for the dual-encoding cases. */
const obstaclesInWorldFrameFromWorldState = (worldState: typeof pirouetteWorldState) => {
	const group = worldState.obstacles[0]!
	return {
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
}

const encodings = [
	['world_state', pirouetteWorldState],
	['obstacles_in_world_frame', obstaclesInWorldFrameFromWorldState(pirouetteWorldState)],
] as const

describe('worldStateObstacleTransforms', () => {
	it.each(encodings)('draws pallet and pick-station from %s encoding', (_key, payload) => {
		const transforms = worldStateObstacleTransforms(payload)
		expect(transforms).toHaveLength(2)
		expect(transforms.map((t) => t.referenceFrame)).toEqual([
			'obstacle:pallet',
			'obstacle:pick-station',
		])

		const box = transforms[0]!.physicalObject!
		expect(box.geometryType.case).toBe('box')
		expect(box.geometryType.value).toMatchObject({ dimsMm: { x: 350, y: 350, z: 100 } })
		expect(box.center).toMatchObject({ x: 200, y: 500, z: 100 })

		for (const transform of transforms) {
			expect(transform.poseInObserverFrame!.referenceFrame).toBe('world')
			expect(transform.poseInObserverFrame!.pose).toMatchObject({ x: 0, y: 0, z: 0, theta: 0 })
		}
	})

	it.each([[undefined], [null], [{}], ['not an object']])(
		'returns nothing for %s rather than throwing',
		(input) => {
			expect(worldStateObstacleTransforms(input)).toEqual([])
		}
	)

	// Without ignoreUnknownFields one added proto field erases every obstacle, not just its own.
	it('survives a field the generated types do not know (world_state)', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
		const raw = structuredClone(pirouetteWorldState) as {
			obstacles: Array<Record<string, unknown>>
		}
		raw.obstacles[0]!.fieldAddedLater = 42

		expect(worldStateObstacleTransforms(raw)).toHaveLength(2)
		expect(warn).not.toHaveBeenCalled()
		warn.mockRestore()
	})

	// `obstacles` and `transforms` are the same thing in different shapes — geometry positioned in a
	// frame — so a supplemental transform is drawn, not dropped.
	it('draws geometry attached via supplemental transforms', () => {
		const [drawn] = worldStateObstacleTransforms({
			transforms: [
				{
					referenceFrame: 'moving-box',
					poseInObserverFrame: {
						referenceFrame: 'arm',
						pose: { x: 5, y: 0, z: 0, oZ: 1 },
					},
					physicalObject: { box: { dimsMm: { x: 10, y: 10, z: 10 } }, label: 'moving-box' },
				},
			],
		})

		expect(drawn!.referenceFrame).toBe('obstacle:moving-box')
		expect(drawn!.poseInObserverFrame!.referenceFrame).toBe('arm')
		expect(drawn!.poseInObserverFrame!.pose).toMatchObject({ x: 5 })
		expect(drawn!.physicalObject!.geometryType.case).toBe('box')
	})

	it('skips supplemental transforms that carry no geometry', () => {
		expect(
			worldStateObstacleTransforms({
				transforms: [
					{ referenceFrame: 'plumbing', poseInObserverFrame: { referenceFrame: 'world' } },
				],
			})
		).toEqual([])
	})

	it('warns and drops the set when the payload is not a WorldState at all', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

		expect(worldStateObstacleTransforms({ obstacles: 'nonsense' })).toEqual([])
		expect(warn).toHaveBeenCalled()
		warn.mockRestore()
	})

	it('skips geometries parseGeometry cannot decode without dropping siblings', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
		const raw = structuredClone(
			obstaclesInWorldFrameFromWorldState(pirouetteWorldState)
		) as {
			frame: string
			geometries: Array<Record<string, unknown>>
		}
		raw.geometries.push({ type: 'not-a-shape', Label: 'junk' })

		expect(worldStateObstacleTransforms(raw)).toHaveLength(2)
		expect(warn).toHaveBeenCalled()
		warn.mockRestore()
	})
})
