import { describe, expect, it } from 'vitest'

import type { Rect, Segment } from './types'

import {
	overlapAreaFrac,
	rectCircleOverlap,
	rectsOverlap,
	segmentRectPenetration,
	segmentsCross,
} from './geometry'

const rect = (cx: number, cy: number, hw: number, hh: number): Rect => ({ cx, cy, hw, hh })
const seg = (x1: number, y1: number, x2: number, y2: number): Segment => ({ x1, y1, x2, y2 })

describe('rectsOverlap', () => {
	it('detects overlap and respects padding', () => {
		expect(rectsOverlap(rect(0, 0, 2, 2), rect(3, 0, 2, 2))).toBe(true)
		expect(rectsOverlap(rect(0, 0, 2, 2), rect(5, 0, 2, 2))).toBe(false)
		expect(rectsOverlap(rect(0, 0, 2, 2), rect(5, 0, 2, 2), 2)).toBe(true)
	})
})

describe('overlapAreaFrac', () => {
	it('is 0 when disjoint and 1 when one contains the other', () => {
		expect(overlapAreaFrac(rect(0, 0, 2, 2), rect(10, 0, 2, 2))).toBe(0)
		expect(overlapAreaFrac(rect(0, 0, 5, 5), rect(0, 0, 1, 1))).toBeCloseTo(1)
	})
})

describe('segmentRectPenetration', () => {
	const r = rect(0, 0, 2, 2)

	it('is 0 when the segment misses the rect', () => {
		expect(segmentRectPenetration(seg(-10, -10, -8, -10), r)).toBe(0)
	})

	it('is 1 when the segment is fully inside', () => {
		expect(segmentRectPenetration(seg(-1, 0, 1, 0), r)).toBeCloseTo(1)
	})

	it('is the clipped fraction when crossing through', () => {
		// 20px segment, 4px (x in [-2,2]) inside → 0.2.
		expect(segmentRectPenetration(seg(-10, 0, 10, 0), r)).toBeCloseTo(0.2)
	})

	it('is positive from an endpoint inside the rect', () => {
		expect(segmentRectPenetration(seg(0, 0, 20, 0), r)).toBeGreaterThan(0)
	})
})

describe('segmentsCross', () => {
	it('detects a proper crossing', () => {
		expect(segmentsCross(seg(0, 0, 2, 2), seg(0, 2, 2, 0))).toBe(true)
	})

	it('excludes shared endpoints and parallel lines', () => {
		expect(segmentsCross(seg(0, 0, 2, 2), seg(0, 0, 2, -2))).toBe(false)
		expect(segmentsCross(seg(0, 0, 2, 0), seg(0, 1, 2, 1))).toBe(false)
	})
})

describe('rectCircleOverlap', () => {
	const r = rect(0, 0, 2, 2)

	it('is 0 when the circle is clear of the rect', () => {
		expect(rectCircleOverlap(r, 5, 0, 1)).toBe(0)
	})

	it('is the penetration depth when the circle reaches in', () => {
		expect(rectCircleOverlap(r, 2.5, 0, 1)).toBeCloseTo(0.5)
	})
})
