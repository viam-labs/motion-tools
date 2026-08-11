import { commonApi, Geometry as ViamGeometry } from '@viamrobotics/sdk'
import { createWorld, type World } from 'koota'
import { afterEach, describe, expect, it } from 'vitest'

import { traits } from '$lib/ecs'

const asciiStl = `solid tri
facet normal 0 0 1
  outer loop
    vertex 0 0 0
    vertex 1 0 0
    vertex 0 1 0
  endloop
endfacet
endsolid tri
`

const stlGeometry = (): ViamGeometry =>
	new ViamGeometry({
		geometryType: {
			case: 'mesh',
			value: new commonApi.Mesh({
				contentType: 'stl',
				mesh: new TextEncoder().encode(asciiStl),
			}),
		},
	})

/**
 * Not covered by `mesh.spec.ts`: a regression to `parsePlyInput` here still puts an entity in the
 * world, since `PLYLoader` answers STL bytes with an empty geometry rather than throwing.
 */
describe('mesh geometry reaches the trait layer', () => {
	let world: World
	afterEach(() => world?.destroy())

	it('Geometry parses an stl mesh into real vertices', () => {
		world = createWorld()
		const entity = world.spawn(traits.Geometry(stlGeometry()))

		expect(entity.get(traits.BufferGeometry)!.getAttribute('position').count).toBe(3)
	})

	it('updateGeometryTrait parses an stl mesh for an entity with no prior BufferGeometry', () => {
		world = createWorld()
		const entity = world.spawn(traits.Box())

		traits.updateGeometryTrait(entity, stlGeometry())

		expect(entity.has(traits.Box)).toBe(false)
		expect(entity.get(traits.BufferGeometry)!.getAttribute('position').count).toBe(3)
	})

	it('updateGeometryTrait re-parses an stl mesh for an entity that already holds a BufferGeometry', () => {
		world = createWorld()
		const entity = world.spawn(traits.Geometry(stlGeometry()))

		traits.updateGeometryTrait(entity, stlGeometry())

		expect(entity.get(traits.BufferGeometry)!.getAttribute('position').count).toBe(3)
	})
})
