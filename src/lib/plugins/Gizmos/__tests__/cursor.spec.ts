import { createWorld, type Entity } from 'koota'
import { Mesh, Object3D, Vector3 } from 'three'
import { describe, expect, it } from 'vitest'

const makeIntersection = (
	object: Object3D,
	point = new Vector3(1, 2, 3),
	face?: { normal: Vector3 }
) => ({
	object,
	point,
	distance: 0,
	face,
})

describe('cursor', () => {
	it('isUsableHit accepts a visible mesh', async () => {
		const { isUsableHit } = await import('../cursor')
		const mesh = new Mesh()
		expect(isUsableHit(makeIntersection(mesh) as never)).toBe(true)
	})

	it('isUsableHit rejects an invisible mesh', async () => {
		const { isUsableHit } = await import('../cursor')
		const mesh = new Mesh()
		mesh.visible = false
		expect(isUsableHit(makeIntersection(mesh) as never)).toBe(false)
	})

	it('isUsableHit rejects a hit whose ancestor is invisible', async () => {
		const { isUsableHit } = await import('../cursor')
		const parent = new Object3D()
		parent.visible = false
		const mesh = new Mesh()
		parent.add(mesh)
		expect(isUsableHit(makeIntersection(mesh) as never)).toBe(false)
	})

	it('isUsableHit rejects hits inside the ignore-entity subtree', async () => {
		const world = createWorld()
		const { isUsableHit } = await import('../cursor')
		const entity = world.spawn() as Entity
		// Entity renderers set name to the numeric entity id; Three's name is
		// typed as string but holds the number at runtime.
		const ancestor = new Object3D()
		;(ancestor as unknown as { name: Entity }).name = entity
		const mesh = new Mesh()
		ancestor.add(mesh)
		expect(isUsableHit(makeIntersection(mesh) as never, entity)).toBe(false)
		expect(isUsableHit(makeIntersection(mesh) as never)).toBe(true)
	})

	it('cursorPoint returns a clone of the hit point', async () => {
		const { cursorPoint } = await import('../cursor')
		const point = new Vector3(5, 6, 7)
		const result = cursorPoint([makeIntersection(new Mesh(), point) as never])
		expect(result?.equals(point)).toBe(true)
		expect(result).not.toBe(point)
	})

	it('cursorPoint returns undefined when no intersection is usable', async () => {
		const { cursorPoint } = await import('../cursor')
		const mesh = new Mesh()
		mesh.visible = false
		expect(cursorPoint([makeIntersection(mesh) as never])).toBeUndefined()
		expect(cursorPoint([])).toBeUndefined()
	})

	it('cursorHit transforms the face normal by the object world matrix', async () => {
		const { cursorHit } = await import('../cursor')
		const mesh = new Mesh()
		mesh.matrixWorld.identity()
		const result = cursorHit([
			makeIntersection(mesh, new Vector3(0, 0, 0), { normal: new Vector3(0, 1, 0) }) as never,
		])
		expect(result?.normal.y).toBeCloseTo(1)
		expect(result?.normal.length()).toBeCloseTo(1)
	})

	it('cursorHit falls back to +Z when no face is available', async () => {
		const { cursorHit } = await import('../cursor')
		const mesh = new Mesh()
		const result = cursorHit([makeIntersection(mesh) as never])
		expect(result?.normal.equals(new Vector3(0, 0, 1))).toBe(true)
	})
})
