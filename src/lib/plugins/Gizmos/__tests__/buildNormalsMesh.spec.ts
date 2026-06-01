import { createWorld } from 'koota'
import { BoxGeometry, BufferAttribute, BufferGeometry } from 'three'
import { describe, expect, it } from 'vitest'

import { traits } from '$lib/ecs'

import { buildNormalsMesh } from '../buildNormalsMesh'

describe('buildNormalsMesh', () => {
	it('returns undefined for an entity with no geometry traits', () => {
		const world = createWorld()
		const entity = world.spawn()
		expect(buildNormalsMesh(entity)).toBeUndefined()
	})

	it('returns a Mesh for an entity with a Box trait', () => {
		const world = createWorld()
		const entity = world.spawn(traits.Box({ x: 100, y: 200, z: 300 }))
		const mesh = buildNormalsMesh(entity)
		expect(mesh).toBeDefined()
		expect(mesh?.geometry.attributes.position.count).toBeGreaterThan(0)
	})

	it('does not dispose the source BufferGeometry when a buffer-backed entity is built', () => {
		const world = createWorld()
		const buffer = new BoxGeometry(1, 1, 1)
		buffer.computeVertexNormals()
		const entity = world.spawn(traits.BufferGeometry(buffer))

		const mesh = buildNormalsMesh(entity)
		expect(mesh).toBeDefined()

		// Disposing the mesh's geometry must not affect the source buffer.
		// (This is the regression fixed by cloning before wrapping.)
		mesh?.geometry.dispose()
		expect(buffer.attributes.position).toBeDefined()
		expect(buffer.attributes.position.count).toBe(24)
	})

	it('clones the source buffer even when normals are already computed', () => {
		const world = createWorld()
		const buffer = new BufferGeometry()
		const positions = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0])
		const normals = new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1])
		buffer.setAttribute('position', new BufferAttribute(positions, 3))
		buffer.setAttribute('normal', new BufferAttribute(normals, 3))

		const entity = world.spawn(traits.BufferGeometry(buffer))
		const mesh = buildNormalsMesh(entity)
		expect(mesh).toBeDefined()
		// Cloned, not the same instance.
		expect(mesh?.geometry).not.toBe(buffer)
	})

	it('returns a Mesh for an entity with a Sphere trait', () => {
		const world = createWorld()
		const entity = world.spawn(traits.Sphere({ r: 100 }))
		expect(buildNormalsMesh(entity)).toBeDefined()
	})

	it('returns a Mesh for an entity with a Capsule trait', () => {
		const world = createWorld()
		const entity = world.spawn(traits.Capsule({ l: 200, r: 50 }))
		expect(buildNormalsMesh(entity)).toBeDefined()
	})
})
