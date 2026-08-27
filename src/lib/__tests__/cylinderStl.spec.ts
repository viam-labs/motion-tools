import { describe, expect, it } from 'vitest'

import { cylinderToStlBytes } from '../cylinderStl'
import { parseStlInput } from '../stl'

describe('cylinderToStlBytes', () => {
	it('writes 128 triangles of binary STL', () => {
		expect(cylinderToStlBytes(35.5, 126).byteLength).toBe(6484)
	})

	it('extends along Z, spanning the radius in X and Y and the length in Z', () => {
		const geometry = parseStlInput(cylinderToStlBytes(35.5, 126))

		geometry.computeBoundingBox()
		const bounds = geometry.boundingBox!
		expect(bounds.min.x).toBeCloseTo(-35.5, 3)
		expect(bounds.max.x).toBeCloseTo(35.5, 3)
		expect(bounds.min.y).toBeCloseTo(-35.5, 3)
		expect(bounds.max.y).toBeCloseTo(35.5, 3)
		expect(bounds.min.z).toBeCloseTo(-63, 3)
		expect(bounds.max.z).toBeCloseTo(63, 3)
	})

	it('shades the first wall facet with an outward radial normal', () => {
		const geometry = parseStlInput(cylinderToStlBytes(10, 20))

		const normal = geometry.getAttribute('normal')
		expect(normal.getX(0)).toBeCloseTo(0.9952, 4)
		expect(normal.getY(0)).toBeCloseTo(0.098, 3)
		expect(normal.getZ(0)).toBe(0)
	})
})
