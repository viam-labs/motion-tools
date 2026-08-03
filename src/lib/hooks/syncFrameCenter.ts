import type { Entity } from 'koota'

import type { Pose } from '$lib/math'

import { traits } from '$lib/ecs'

/**
 * Synchronize the render-only geometry center supplied by the frame-system API.
 *
 * Config frames cannot represent a geometry center: rebuilding their geometry
 * produces an identity center. While entering build mode, keep the center from
 * the live frame snapshot so swapping the frame source does not move the mesh
 * independently of its (unchanged) frame pose.
 */
export const syncFrameCenter = (entity: Entity, center: Pose | undefined, preserve: boolean) => {
	if (preserve && entity.has(traits.Center)) return

	if (!center) {
		entity.remove(traits.Center)
		return
	}

	const current = entity.get(traits.Center)
	if (!center.equals(current)) entity.set(traits.Center, center)
}
