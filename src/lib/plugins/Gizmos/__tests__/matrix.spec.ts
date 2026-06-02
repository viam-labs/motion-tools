import { Vector3 } from 'three'
import { describe, expect, it } from 'vitest'

import { arrowMatrix, planeMatrix } from '../matrix'

const decompose = (
	matrix: ReturnType<typeof arrowMatrix>
): { position: Vector3; yAxis: Vector3 } => {
	const e = matrix.elements
	const position = new Vector3(e[12], e[13], e[14])
	const yAxis = new Vector3(e[4], e[5], e[6]).normalize()
	return { position, yAxis }
}

const normalOf = (matrix: ReturnType<typeof planeMatrix>): Vector3 => {
	const e = matrix.elements
	return new Vector3(e[8], e[9], e[10]).normalize()
}

describe('arrowMatrix', () => {
	it('places the gizmo at the supplied position', () => {
		const m = arrowMatrix('y', new Vector3(1, 2, 3), undefined)
		const { position } = decompose(m)
		expect(position.equals(new Vector3(1, 2, 3))).toBe(true)
	})

	it('rotates the local +Y axis to point opposite the chosen world axis', () => {
		// The arrow geometry is anchored at its tip with the tail along -Y in
		// local space, so the +Y local axis points away from the chosen world
		// direction.
		const m = arrowMatrix('x', new Vector3(), undefined)
		const { yAxis } = decompose(m)
		expect(yAxis.x).toBeCloseTo(-1)
		expect(yAxis.y).toBeCloseTo(0)
		expect(yAxis.z).toBeCloseTo(0)
	})

	it('y-axis: antiparallel rotation — local +Y points opposite world +Y', () => {
		// direction = yAxis, directionUtil = -yAxis: a 180° antiparallel rotation.
		// Three.js picks an arbitrary perpendicular axis for roll; the only
		// guarantee is that the local +Y ends up pointing in the -Y world direction.
		const m = arrowMatrix('y', new Vector3(), undefined)
		const { yAxis: localY } = decompose(m)
		expect(localY.y).toBeCloseTo(-1)
	})

	it('uses the supplied surface normal when axis is "surface"', () => {
		const m = arrowMatrix('surface', new Vector3(), new Vector3(0, 0, 1))
		const { yAxis } = decompose(m)
		expect(yAxis.z).toBeCloseTo(-1)
	})

	it('falls back to +Z when axis is "surface" but no normal is supplied', () => {
		const m = arrowMatrix('surface', new Vector3(), undefined)
		const { yAxis } = decompose(m)
		expect(yAxis.z).toBeCloseTo(-1)
	})
})

describe('planeMatrix', () => {
	it('places the plane at the supplied position', () => {
		const m = planeMatrix('xy', new Vector3(1, 2, 3))
		const e = m.elements
		const p = new Vector3(e[12], e[13], e[14])
		expect(p.equals(new Vector3(1, 2, 3))).toBe(true)
	})

	it('xy plane has +Z normal', () => {
		const n = normalOf(planeMatrix('xy', new Vector3()))
		expect(n.z).toBeCloseTo(1)
	})

	it('yz plane has +X normal', () => {
		const n = normalOf(planeMatrix('yz', new Vector3()))
		expect(Math.abs(n.x)).toBeCloseTo(1)
	})

	it('xz plane has ±Y normal', () => {
		const n = normalOf(planeMatrix('xz', new Vector3()))
		expect(Math.abs(n.y)).toBeCloseTo(1)
	})
})
