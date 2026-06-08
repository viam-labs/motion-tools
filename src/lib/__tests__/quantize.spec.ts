import { Vector3 } from 'three'
import { describe, expect, it } from 'vitest'

import { quantize } from '../quantize'

describe('quantize', () => {
	it('rounds each component to the nearest multiple of step', () => {
		const result = quantize(new Vector3(0.123, 0.456, 0.789), 0.1)
		expect(result.x).toBeCloseTo(0.1)
		expect(result.y).toBeCloseTo(0.5)
		expect(result.z).toBeCloseTo(0.8)
	})

	it('leaves an exact grid point unchanged', () => {
		const result = quantize(new Vector3(0.2, -0.3, 1), 0.1)
		expect(result.x).toBeCloseTo(0.2)
		expect(result.y).toBeCloseTo(-0.3)
		expect(result.z).toBeCloseTo(1)
	})

	it('handles negative coordinates symmetrically', () => {
		const result = quantize(new Vector3(-0.123, -0.456, -0.789), 0.1)
		expect(result.x).toBeCloseTo(-0.1)
		expect(result.y).toBeCloseTo(-0.5)
		expect(result.z).toBeCloseTo(-0.8)
	})

	it.each([
		{ step: 0.05, input: new Vector3(0.07, 0.13, 0.22), expected: [0.05, 0.15, 0.2] },
		{ step: 0.25, input: new Vector3(0.4, -0.6, 1.1), expected: [0.5, -0.5, 1] },
		{ step: 1, input: new Vector3(0.49, 0.5, -0.5), expected: [0, 1, 0] },
	])('uses the supplied step ($step m)', ({ step, input, expected }) => {
		const result = quantize(input, step)
		expect(result.x).toBeCloseTo(expected[0])
		expect(result.y).toBeCloseTo(expected[1])
		expect(result.z).toBeCloseTo(expected[2])
	})

	it('returns a new Vector3 (does not mutate input)', () => {
		const input = new Vector3(0.123, 0.456, 0.789)
		const result = quantize(input, 0.1)
		expect(result).not.toBe(input)
		expect(input.x).toBeCloseTo(0.123)
	})
})
