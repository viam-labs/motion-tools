import type { Entity, World } from 'koota'

import { Matrix4 } from 'three'

import { hierarchy, traits } from '$lib/ecs'
import { createPose, poseToMatrix } from '$lib/transform'

// OV must be a unit vector — (0.6, 0.8, 0) magnitude 1 — so the matrix
// round-trip in Details.svelte returns the same components.
const buildMatrix = () =>
	poseToMatrix(
		createPose({
			x: 10,
			y: 20,
			z: 30,
			oX: 0.6,
			oY: 0.8,
			oZ: 0,
			theta: 0.4,
		}),
		new Matrix4()
	)

export const createEntityFixture = (world: World): Entity => {
	return world.spawn(
		...hierarchy.parentTraits('parent_frame'),
		traits.Name('Test Object'),
		traits.Matrix(buildMatrix()),
		traits.EditedMatrix(buildMatrix()),
		traits.Box({ x: 0.01, y: 0.02, z: 0.03 })
	)
}
