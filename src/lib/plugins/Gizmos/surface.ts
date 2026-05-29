import { type Entity, Or, type World } from 'koota'
import { type Object3D } from 'three'

import { traits } from '$lib/ecs'

export const isSurfaceEntity = (entity: Entity): boolean =>
	entity.has(traits.Box) ||
	entity.has(traits.Capsule) ||
	entity.has(traits.Sphere) ||
	entity.has(traits.BufferGeometry)

export const findSurfaceEntityForObject = (world: World, object: Object3D): Entity | undefined => {
	const surfaces = new Set<Entity>(
		world.query(Or(traits.Box, traits.Capsule, traits.Sphere, traits.BufferGeometry))
	)

	let cursor: Object3D | null = object
	while (cursor) {
		const name = (cursor as unknown as { name: unknown }).name as Entity
		if (surfaces.has(name)) return name
		cursor = cursor.parent
	}

	return undefined
}
