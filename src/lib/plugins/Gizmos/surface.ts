import { type Entity, Or, type World } from 'koota'
import { type Intersection, type Object3D } from 'three'

import { traits } from '$lib/ecs'

import { isUsableHit } from './cursor'

export const findSurfaceHit = (world: World, intersections: Intersection[]) => {
	const surfaces = queryUsableSurfaces(world)

	for (const hit of intersections) {
		if (!isUsableHit(hit)) continue
		const entity = findSurfaceAncestor(hit.object, surfaces)
		if (entity !== undefined) return { entity, position: hit.point.clone() }
	}

	return undefined
}

const queryUsableSurfaces = (world: World) =>
	new Set(world.query(Or(traits.Box, traits.Capsule, traits.Sphere, traits.BufferGeometry)))

const findSurfaceAncestor = (object: Object3D, surfaces: Set<Entity>) => {
	let cursor: Object3D | undefined = object
	while (cursor) {
		const name = cursor.name as unknown as Entity
		if (surfaces.has(name)) return name
		cursor = cursor.parent ?? undefined
	}

	return undefined
}
