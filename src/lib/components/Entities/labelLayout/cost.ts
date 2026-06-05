/**
 * Cost function for a candidate label placement. Lower is better.
 *
 * The hierarchy `lineBox >> boxDot > boxBox > lineLine >> stick > spread > len`
 * is near-lexicographic: a single leader passing under another label always
 * outranks fixing every overlap a node could have against its <=24 neighbors,
 * so the optimizer eliminates crossings first (the user's top priority), then
 * dot coverage, then box overlaps, then tidies the radial fan.
 */

import type { LabelNode, Rect, Segment, SolverConfig } from './types'

import {
	overlapAreaFrac,
	rectCircleOverlap,
	rectsOverlap,
	segmentRectPenetration,
	segmentsCross,
} from './geometry'

export const W = {
	/** DOMINANT — a leader passing under ANOTHER label's box. Requirement #1. */
	lineBox: 1000,
	/** Our box covering another node's dot. Worse than a box overlap. Requirement #4. */
	boxDot: 200,
	/** Two label boxes overlapping. Requirement #2. */
	boxBox: 120,
	/** Two leaders crossing — thin lines, mild. Supports the radial fan. */
	lineLine: 60,
	/** Sticky bonus for staying on the previous slot (anti flip-flop). Requirement #6. */
	stick: 35,
	/** Penalty when a slot's angle nearly coincides with a neighbor's leader angle. */
	spread: 15,
	/** Outward-fan preference: cheaper to point away from the local cluster. Requirement #3. */
	radial: 0.8,
	/** Leader length — keep labels close to their dot. Small. */
	len: 0.6,
}

/** Slot angles closer than this (radians, ~18deg) are penalised for an even fan. */
const SPREAD_ANGLE = 0.314

// Reused scratch — the solver is single-threaded and never re-enters evalCost.
const boxA: Rect = { cx: 0, cy: 0, hw: 0, hh: 0 }
const boxB: Rect = { cx: 0, cy: 0, hw: 0, hh: 0 }
const boxPad: Rect = { cx: 0, cy: 0, hw: 0, hh: 0 }
const segA: Segment = { x1: 0, y1: 0, x2: 0, y2: 0 }
const segB: Segment = { x1: 0, y1: 0, x2: 0, y2: 0 }

/**
 * Evaluate the cost of placing `node` at slot `si` against its committed neighbors.
 *
 * With `conflictOnly`, returns just the geometric "bad" terms (the local-search
 * loop key) — exactly 0 when the node has no crossings/overlaps, so termination
 * is well-defined. Otherwise adds the always-positive length/radial terms and
 * the stickiness bonus to break ties toward tidy, stable placements.
 */
export function evalCost(
	node: LabelNode,
	si: number,
	neighbors: LabelNode[],
	config: SolverConfig,
	conflictOnly: boolean
): number {
	const s = node.slots[si]
	const cx = node.ax + s.dx
	const cy = node.ay + s.dy

	boxA.cx = cx
	boxA.cy = cy
	boxA.hw = node.w / 2
	boxA.hh = node.h / 2
	segA.x1 = node.ax
	segA.y1 = node.ay
	segA.x2 = cx
	segA.y2 = cy

	const halfPad = config.labelPadding / 2
	let cost = 0

	for (let t = 0; t < neighbors.length; t++) {
		const m = neighbors[t]
		const ms = m.slots[m.slotIndex]
		const mx = m.ax + ms.dx
		const my = m.ay + ms.dy

		boxB.cx = mx
		boxB.cy = my
		boxB.hw = m.w / 2
		boxB.hh = m.h / 2
		segB.x1 = m.ax
		segB.y1 = m.ay
		segB.x2 = mx
		segB.y2 = my

		// Our leader under their box (expanded so a grazing line still reads as a crossing).
		boxPad.cx = mx
		boxPad.cy = my
		boxPad.hw = m.w / 2 + halfPad
		boxPad.hh = m.h / 2 + halfPad
		const p1 = segmentRectPenetration(segA, boxPad)
		if (p1 > 0) cost += W.lineBox * p1

		// Their leader under our box.
		boxPad.cx = cx
		boxPad.cy = cy
		boxPad.hw = node.w / 2 + halfPad
		boxPad.hh = node.h / 2 + halfPad
		const p2 = segmentRectPenetration(segB, boxPad)
		if (p2 > 0) cost += W.lineBox * p2

		// Our box covering their dot.
		const dotClearance = m.dotR + config.dotPadding
		const d = rectCircleOverlap(boxA, m.ax, m.ay, dotClearance)
		if (d > 0) cost += W.boxDot * (d / dotClearance)

		// Box-box overlap (binary dominates; area term provides a separation gradient).
		if (rectsOverlap(boxA, boxB, config.labelPadding)) {
			cost += W.boxBox + 2 * overlapAreaFrac(boxA, boxB)
		}

		// Leader-leader crossing.
		if (segmentsCross(segA, segB)) cost += W.lineLine

		// Angular spread for an even fan.
		let dd = Math.abs(s.angle - ms.angle)
		if (dd > Math.PI) dd = 2 * Math.PI - dd
		if (dd < SPREAD_ANGLE) cost += W.spread
	}

	if (conflictOnly) return cost

	cost += W.len * s.radius

	// Prefer pointing away from the local cluster centroid (radial fan-out).
	const cax = node.centroidX - node.ax
	const cay = node.centroidY - node.ay
	const cl = Math.hypot(cax, cay) || 1
	const align = (Math.cos(s.angle) * -cax + Math.sin(s.angle) * -cay) / cl
	cost += W.radial * (1 - align) * s.radius

	if (si === node.prevSlotIndex) cost -= W.stick

	return cost
}
