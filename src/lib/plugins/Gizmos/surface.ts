import { type Entity, Or, type World } from 'koota'
import { type Intersection, type Object3D, Vector3 } from 'three'

import { traits } from '$lib/ecs'

import { isUsableHit } from './cursor'

export const isSurfaceEntity = (entity: Entity): boolean =>
	entity.has(traits.Box) ||
	entity.has(traits.Capsule) ||
	entity.has(traits.Sphere) ||
	entity.has(traits.BufferGeometry)

const queryUsableSurfaces = (world: World): Set<Entity> =>
	new Set(world.query(Or(traits.Box, traits.Capsule, traits.Sphere, traits.BufferGeometry)))

const findSurfaceAncestor = (object: Object3D, surfaces: Set<Entity>): Entity | undefined => {
	let cursor: Object3D | null = object
	while (cursor) {
		const name = (cursor as unknown as { name: unknown }).name as Entity
		if (surfaces.has(name)) return name
		cursor = cursor.parent
	}
	return undefined
}

export interface SurfaceHit {
	entity: Entity
	position: Vector3
}

export const findSurfaceHit = (
	world: World,
	intersections: Intersection[]
): SurfaceHit | undefined => {
	const surfaces = queryUsableSurfaces(world)

	for (const hit of intersections) {
		if (!isUsableHit(hit)) continue
		const entity = findSurfaceAncestor(hit.object, surfaces)
		if (entity !== undefined) return { entity, position: hit.point.clone() }
	}

	return undefined
}
