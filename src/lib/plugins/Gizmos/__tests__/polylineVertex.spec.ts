import { Matrix4, Vector3 } from 'three'
import { describe, expect, it } from 'vitest'

import { readVertexWorld, writeVertexLocal } from '../polylineVertex'

describe('readVertexWorld', () => {
	it('returns the local coords when no world matrix is supplied', () => {
		const buf = new Float32Array([1, 2, 3, 4, 5, 6])
		const out = new Vector3()
		const result = readVertexWorld(buf, 1, undefined, out)
		expect(result).toBe(out)
		expect(out.x).toBeCloseTo(4)
		expect(out.y).toBeCloseTo(5)
		expect(out.z).toBeCloseTo(6)
	})

	it('applies the world matrix to transform into world space', () => {
		const buf = new Float32Array([1, 0, 0])
		const world = new Matrix4().makeTranslation(10, 20, 30)
		const out = new Vector3()
		readVertexWorld(buf, 0, world, out)
		expect(out.x).toBeCloseTo(11)
		expect(out.y).toBeCloseTo(20)
		expect(out.z).toBeCloseTo(30)
	})

	it('returns undefined for an out-of-bounds index', () => {
		const buf = new Float32Array([1, 2, 3])
		const out = new Vector3()
		expect(readVertexWorld(buf, 1, undefined, out)).toBeUndefined()
		expect(readVertexWorld(buf, 5, undefined, out)).toBeUndefined()
	})
})

describe('writeVertexLocal', () => {
	const scratch = () => ({ local: new Vector3(), inverse: new Matrix4() })

	it('writes world coords directly when no world matrix is supplied', () => {
		const buf = new Float32Array([0, 0, 0, 0, 0, 0])
		const written = writeVertexLocal(buf, 1, undefined, new Vector3(7, 8, 9), scratch())
		expect(written).toBe(true)
		expect(buf[3]).toBeCloseTo(7)
		expect(buf[4]).toBeCloseTo(8)
		expect(buf[5]).toBeCloseTo(9)
	})

	it('inverts the world matrix to convert world coords back to local', () => {
		const buf = new Float32Array([0, 0, 0])
		const world = new Matrix4().makeTranslation(10, 20, 30)
		writeVertexLocal(buf, 0, world, new Vector3(11, 20, 30), scratch())
		expect(buf[0]).toBeCloseTo(1)
		expect(buf[1]).toBeCloseTo(0)
		expect(buf[2]).toBeCloseTo(0)
	})

	it('round-trips through readVertexWorld for a rotated + translated frame', () => {
		const buf = new Float32Array([1.5, -2, 3.25])
		const world = new Matrix4().makeRotationZ(Math.PI / 6).setPosition(1, 2, 3)
		const worldPoint = readVertexWorld(buf, 0, world, new Vector3())!
		const target = new Float32Array([0, 0, 0])
		writeVertexLocal(target, 0, world, worldPoint, scratch())
		expect(target[0]).toBeCloseTo(1.5)
		expect(target[1]).toBeCloseTo(-2)
		expect(target[2]).toBeCloseTo(3.25)
	})

	it('returns false for an out-of-bounds index', () => {
		const buf = new Float32Array([0, 0, 0])
		expect(writeVertexLocal(buf, 1, undefined, new Vector3(), scratch())).toBe(false)
	})
})
