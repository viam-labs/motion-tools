import { useTask, useThrelte } from '@threlte/core'
import { type OrthographicCamera, type PerspectiveCamera, Quaternion, Vector3 } from 'three'

import { traits, useWorld } from '$lib/ecs'

/** Long enough to ride out the gaps in a stuttering drag, short enough to feel immediate. */
const SETTLE_SECONDS = 0.05

/** Floor per cloud, so splitting a tight budget across many clouds can't erase the small ones. */
const MIN_CLOUD_POINTS = 20_000

/**
 * Caps points drawn while the camera moves, restoring full detail once it settles. Motion-only
 * is deliberate: `three-mesh-bvh` ignores draw range, so picking stays honest on a settled
 * scene, which on-demand rendering makes free anyway.
 */
export const providePointBudget = (budget: () => number) => {
	const { camera, invalidate } = useThrelte()
	const world = useWorld()

	const lastPosition = new Vector3()
	const lastQuaternion = new Quaternion()
	let lastZoom = 0
	let stillSeconds = Number.POSITIVE_INFINITY

	const cameraMoved = () => {
		const current = camera.current as PerspectiveCamera | OrthographicCamera

		if (
			lastZoom === current.zoom &&
			lastPosition.equals(current.position) &&
			lastQuaternion.equals(current.quaternion)
		) {
			return false
		}

		lastPosition.copy(current.position)
		lastQuaternion.copy(current.quaternion)
		lastZoom = current.zoom
		return true
	}

	const counts: number[] = []

	const applyBudget = (limit: number) => {
		const entities = world.query(traits.ShuffledPointCount, traits.BufferGeometry)
		if (entities.length === 0) return

		counts.length = 0
		let total = 0

		for (const entity of entities) {
			const count = entity.get(traits.ShuffledPointCount) ?? 0
			counts.push(count)
			total += count
		}

		const ratio = total > limit ? limit / total : 1
		let changed = false

		for (const [index, entity] of entities.entries()) {
			const count = counts[index]
			const geometry = entity.get(traits.BufferGeometry)
			if (!geometry) continue

			const target =
				ratio === 1 ? count : Math.min(count, Math.max(MIN_CLOUD_POINTS, Math.round(count * ratio)))

			if (geometry.drawRange.count !== target) {
				geometry.setDrawRange(0, target)
				changed = true
			}
		}

		// Nothing else marks the frame dirty when the camera comes to rest, so the restored
		// range would sit unrendered until the next interaction.
		if (changed) invalidate()
	}

	useTask(
		(delta) => {
			stillSeconds = cameraMoved() ? 0 : stillSeconds + delta

			const limit = budget()
			const decimating = limit > 0 && stillSeconds < SETTLE_SECONDS

			applyBudget(decimating ? limit : Number.POSITIVE_INFINITY)
		},
		{ autoInvalidate: false }
	)
}
