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
			'obstacle/pallet',
			'obstacle/pick-station',
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

	// The proto's other geometry-bearing field. Unimplemented for want of a capture, so the contract
	// is that it says so rather than dropping silently.
	it('reports supplemental transforms instead of ignoring them quietly', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

		const transforms = worldStateObstacleTransforms({
			transforms: [
				{
					referenceFrame: 'moving-box',
					poseInObserverFrame: { referenceFrame: 'world', pose: { x: 0, y: 0, z: 0, oZ: 1 } },
					physicalObject: { box: { dimsMm: { x: 10, y: 10, z: 10 } }, label: 'moving-box' },
				},
			],
		})

		expect(transforms).toEqual([])
		expect(warn).toHaveBeenCalledWith(expect.stringContaining('1 world_state transform(s)'))
		warn.mockRestore()
	})

	it('warns and drops the set when the payload is not a WorldState at all', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

		expect(worldStateObstacleTransforms({ obstacles: 'nonsense' })).toEqual([])
		expect(warn).toHaveBeenCalled()
		warn.mockRestore()
	})
})
