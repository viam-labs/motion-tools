import { commonApi, Geometry as ViamGeometry } from '@viamrobotics/sdk'
import { createWorld, type World } from 'koota'
import { afterEach, describe, expect, it } from 'vitest'

import { traits } from '$lib/ecs'

/**
 * `mesh.spec.ts` proves `parseMeshInput` picks the right parser for a declared content type.
 * `build-frame-descriptors.spec.ts` proves a plan's `mesh_content_type` survives into the proto.
 * Neither runs the seam this rung actually edited: a `Geometry` proto with a mesh case, in through
 * `traits.Geometry` / `traits.updateGeometryTrait`, out as a `BufferGeometry` trait with real
 * vertices. If either function reverted to calling `parsePlyInput` unconditionally, the STL bytes
 * below would still reach an entity — just as a zero-vertex geometry, since `PLYLoader` answers a
 * payload it cannot parse with nothing rather than throwing.
 */

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
