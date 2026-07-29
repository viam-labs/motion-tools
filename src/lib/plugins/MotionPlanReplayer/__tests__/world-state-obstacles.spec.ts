import { describe, expect, it, vi } from 'vitest'

import { worldStateObstacleTransforms } from '../world-state-obstacles'
import pirouetteRequest from './__fixtures__/pirouette-request.json?raw'

const pirouetteWorldState = (JSON.parse(pirouetteRequest) as { world_state: unknown }).world_state

describe('worldStateObstacleTransforms', () => {
	const transforms = worldStateObstacleTransforms(pirouetteWorldState)

	it('reads the proto-JSON encoding that parseGeometry cannot', () => {
		expect(transforms).toHaveLength(2)
		const box = transforms[0]!.physicalObject!
		expect(box.geometryType.case).toBe('box')
		expect(box.geometryType.value).toMatchObject({ dimsMm: { x: 350, y: 350, z: 100 } })
		expect(box.center).toMatchObject({ x: 200, y: 500, z: 100, oZ: 1 })
	})

	// `pallet` and `pick-station` are frame names in this same capture, and resolveOrphans indexes
	// names globally.
	it('namespaces labels so they cannot collide with frame names', () => {
		expect(transforms.map((t) => t.referenceFrame)).toEqual([
			'obstacle:pallet',
			'obstacle:pick-station',
		])
	})

	it('parents each obstacle to its GeometriesInFrame reference frame', () => {
		for (const transform of transforms) {
			expect(transform.poseInObserverFrame!.referenceFrame).toBe('world')
			// The geometry's own center carries the pose, so the frame itself sits at identity.
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
	it('survives a field the generated types do not know', () => {
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
		// Unlike an obstacle, a transform brings its own parent and pose.
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
})
