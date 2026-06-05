/**
 * Pure 2D geometry primitives used by the label layout cost function.
 *
 * Rectangles are center + half-extents; segments are flat coordinates. None of
 * these allocate, so they are safe to call inside the solver's hot loop.
 */

import type { Rect, Segment } from './types'

export function pointInRect(px: number, py: number, r: Rect): boolean {
	return Math.abs(px - r.cx) <= r.hw && Math.abs(py - r.cy) <= r.hh
}

export function rectsOverlap(a: Rect, b: Rect, pad = 0): boolean {
	return Math.abs(a.cx - b.cx) < a.hw + b.hw + pad && Math.abs(a.cy - b.cy) < a.hh + b.hh + pad
}

/** Fraction of the smaller rectangle's area covered by the intersection, 0..1. */
export function overlapAreaFrac(a: Rect, b: Rect): number {
	const ox = Math.min(a.cx + a.hw, b.cx + b.hw) - Math.max(a.cx - a.hw, b.cx - b.hw)
	if (ox <= 0) return 0
	const oy = Math.min(a.cy + a.hh, b.cy + b.hh) - Math.max(a.cy - a.hh, b.cy - b.hh)
	if (oy <= 0) return 0
	return (ox * oy) / Math.min(4 * a.hw * a.hh, 4 * b.hw * b.hh)
}

/**
 * Liang-Barsky clip of a segment against a rectangle.
 * Returns the clipped length as a fraction of the full segment (0..1), or -1 if
 * the segment misses the rectangle entirely.
 */
function clipFraction(s: Segment, r: Rect): number {
	const minX = r.cx - r.hw
	const maxX = r.cx + r.hw
	const minY = r.cy - r.hh
	const maxY = r.cy + r.hh
	const dx = s.x2 - s.x1
	const dy = s.y2 - s.y1

	let t0 = 0
	let t1 = 1

	// Four clip edges: (p, q) pairs. Inside when p*t <= q is satisfied.
	const ps = [-dx, dx, -dy, dy]
	const qs = [s.x1 - minX, maxX - s.x1, s.y1 - minY, maxY - s.y1]

	for (let i = 0; i < 4; i++) {
		const p = ps[i]
		const q = qs[i]
		if (p === 0) {
			if (q < 0) return -1
		} else {
			const t = q / p
			if (p < 0) {
				if (t > t1) return -1
				if (t > t0) t0 = t
			} else {
				if (t < t0) return -1
				if (t < t1) t1 = t
			}
		}
	}

	return t0 <= t1 ? t1 - t0 : -1
}

/** Does the segment touch or cross the rectangle? */
export function segmentIntersectsRect(s: Segment, r: Rect): boolean {
	return clipFraction(s, r) >= 0
}

/**
 * Continuous penetration: how much of the segment lies inside the rectangle,
 * as a fraction of segment length (0 = disjoint, 1 = fully inside). Gives the
 * optimizer a gradient that the boolean test lacks.
 */
export function segmentRectPenetration(s: Segment, r: Rect): number {
	const f = clipFraction(s, r)
	return Math.max(f, 0)
}

function ccw(ax: number, ay: number, bx: number, by: number, px: number, py: number): number {
	return (bx - ax) * (py - ay) - (by - ay) * (px - ax)
}

/** Proper crossing of two segments (shared endpoints / collinear touching excluded). */
export function segmentsCross(a: Segment, b: Segment): boolean {
	const d1 = ccw(b.x1, b.y1, b.x2, b.y2, a.x1, a.y1)
	const d2 = ccw(b.x1, b.y1, b.x2, b.y2, a.x2, a.y2)
	const d3 = ccw(a.x1, a.y1, a.x2, a.y2, b.x1, b.y1)
	const d4 = ccw(a.x1, a.y1, a.x2, a.y2, b.x2, b.y2)
	return d1 > 0 !== d2 > 0 && d3 > 0 !== d4 > 0
}

/** Penetration depth (viewport px) of a circle into a rectangle, 0 if disjoint. */
export function rectCircleOverlap(r: Rect, cx: number, cy: number, rad: number): number {
	const nx = Math.max(Math.abs(cx - r.cx) - r.hw, 0)
	const ny = Math.max(Math.abs(cy - r.cy) - r.hh, 0)
	const d = Math.hypot(nx, ny)
	return Math.max(rad - d, 0)
}
