import { BoxGeometry, BufferAttribute, BufferGeometry, Matrix4, Vector3 } from 'three'
import { describe, expect, it } from 'vitest'

import { buildSurfaceNormalsGeometry } from '../buildSurfaceNormalsGeometry'

describe('buildSurfaceNormalsGeometry', () => {
	it('emits two endpoints per triangle face for an indexed BoxGeometry', () => {
		const box = new BoxGeometry(1, 1, 1)
		const triangleCount = (box.index?.count ?? 0) / 3
		const result = buildSurfaceNormalsGeometry(box, 0.1, new Matrix4())
		const positions = result.attributes.position as BufferAttribute
		// One segment per triangle = two vertices per triangle.
		expect(positions.count).toBe(triangleCount * 2)
	})

	it('emits one segment per triangle for a non-indexed geometry', () => {
		const geometry = new BufferGeometry()
		// Two triangles, six unique vertices (non-indexed).
		const positions = new Float32Array([
			// triangle 0
			0, 0, 0, 1, 0, 0, 0, 1, 0,
			// triangle 1
			1, 0, 0, 1, 1, 0, 0, 1, 0,
		])
		geometry.setAttribute('position', new BufferAttribute(positions, 3))
		const result = buildSurfaceNormalsGeometry(geometry, 1, new Matrix4())
		expect(result.attributes.position.count).toBe(4)
	})

	it('emits segments of the requested length', () => {
		const geometry = new BufferGeometry()
		const positions = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0])
		geometry.setAttribute('position', new BufferAttribute(positions, 3))
		const result = buildSurfaceNormalsGeometry(geometry, 2, new Matrix4())
		const arr = (result.attributes.position as BufferAttribute).array as Float32Array
		const tail = new Vector3(arr[0], arr[1], arr[2])
		const tip = new Vector3(arr[3], arr[4], arr[5])
		expect(tip.distanceTo(tail)).toBeCloseTo(2)
	})

	it('applies the transform matrix to segment positions', () => {
		const geometry = new BufferGeometry()
		const positions = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0])
		geometry.setAttribute('position', new BufferAttribute(positions, 3))
		const transform = new Matrix4().setPosition(10, 20, 30)
		const result = buildSurfaceNormalsGeometry(geometry, 0, transform)
		const arr = (result.attributes.position as BufferAttribute).array as Float32Array
		// Centroid of the original triangle is (1/3, 1/3, 0) — after translation,
		// the segment's tail (the centroid) is offset by (10, 20, 30).
		expect(arr[0]).toBeCloseTo(10 + 1 / 3)
		expect(arr[1]).toBeCloseTo(20 + 1 / 3)
		expect(arr[2]).toBeCloseTo(30)
	})
})
