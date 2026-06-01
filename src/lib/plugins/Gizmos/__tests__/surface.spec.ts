import { createWorld } from 'koota'
import { Mesh, Object3D, Vector3 } from 'three'
import { describe, expect, it } from 'vitest'

import { traits } from '$lib/ecs'

import { findSurfaceHit } from '../surface'

describe('findSurfaceHit', () => {
	it('finds the nearest usable hit that belongs to a surface entity', () => {
		const world = createWorld()
		const entity = world.spawn(traits.Box({ x: 1, y: 1, z: 1 }))

		const mesh = new Mesh()
		;(mesh as unknown as { name: typeof entity }).name = entity

		const hit = findSurfaceHit(world, [
			{
				object: mesh,
				point: new Vector3(1, 2, 3),
				distance: 0,
			} as never,
		])

		expect(hit?.entity).toBe(entity)
		expect(hit?.position.equals(new Vector3(1, 2, 3))).toBe(true)
	})

	it('returns undefined when no intersection belongs to a surface entity', () => {
		const world = createWorld()
		const mesh = new Mesh()
		const hit = findSurfaceHit(world, [
			{ object: mesh, point: new Vector3(), distance: 0 } as never,
		])
		expect(hit).toBeUndefined()
	})

	it('walks parents to find the surface entity', () => {
		const world = createWorld()
		const entity = world.spawn(traits.Sphere({ r: 1 }))

		const parent = new Object3D()
		;(parent as unknown as { name: typeof entity }).name = entity
		const childMesh = new Mesh()
		parent.add(childMesh)

		const hit = findSurfaceHit(world, [
			{ object: childMesh, point: new Vector3(), distance: 0 } as never,
		])
		expect(hit?.entity).toBe(entity)
	})

	it('skips invisible intersections', () => {
		const world = createWorld()
		const entity = world.spawn(traits.Box({ x: 1, y: 1, z: 1 }))
		const mesh = new Mesh()
		mesh.visible = false
		;(mesh as unknown as { name: typeof entity }).name = entity
		const hit = findSurfaceHit(world, [
			{ object: mesh, point: new Vector3(), distance: 0 } as never,
		])
		expect(hit).toBeUndefined()
	})
})
