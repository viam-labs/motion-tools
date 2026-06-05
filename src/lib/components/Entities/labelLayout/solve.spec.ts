import { describe, expect, it } from 'vitest'

import { rectsOverlap, segmentRectPenetration } from './geometry'
import { generateSlots, hashString } from './slots'
import { solve } from './solve'
import { defaultSolverConfig, type LabelNode, type Rect, type Segment } from './types'

const config = defaultSolverConfig

function makeNode(id: string, ax: number, ay: number, w = 30, h = 14, dotR = 3): LabelNode {
	const node: LabelNode = {
		id,
		idHash: hashString(id),
		ax,
		ay,
		dotR,
		w,
		h,
		scale: 1,
		cssDotW: 8,
		dotLocalX: 0,
		dotLocalY: 0,
		slots: [],
		geomKey: '',
		crowded: false,
		slotIndex: 0,
		prevSlotIndex: 0,
		cx: ax,
		cy: ay,
		tx: 0,
		ty: 0,
		settled: false,
		conflict: 0,
		locked: false,
		centroidX: ax,
		centroidY: ay,
		prevAx: Number.NaN,
		prevAy: Number.NaN,
		neighbors: [],
		labelEl: null as unknown as HTMLElement,
		textEl: null as unknown as HTMLElement,
		dotEl: null as unknown as HTMLElement,
		lineEl: null as unknown as SVGLineElement,
	}
	node.slots = generateSlots(node, false, config)
	return node
}

/** Wire up a closed scene: every node neighbors every other, shared centroid. */
function link(nodes: LabelNode[]) {
	let sx = 0
	let sy = 0
	for (const n of nodes) {
		sx += n.ax
		sy += n.ay
	}
	const cx = sx / nodes.length
	const cy = sy / nodes.length
	for (const n of nodes) {
		n.neighbors = nodes.filter((other) => other !== n)
		n.centroidX = cx
		n.centroidY = cy
	}
}

function leader(n: LabelNode): Segment {
	return { x1: n.ax, y1: n.ay, x2: n.tx, y2: n.ty }
}

function paddedBox(n: LabelNode): Rect {
	return {
		cx: n.tx,
		cy: n.ty,
		hw: n.w / 2 + config.labelPadding / 2,
		hh: n.h / 2 + config.labelPadding / 2,
	}
}

function box(n: LabelNode): Rect {
	return { cx: n.tx, cy: n.ty, hw: n.w / 2, hh: n.h / 2 }
}

describe('solve', () => {
	it('leaves a lone label at a valid slot with no conflict', () => {
		const n = makeNode('solo', 100, 100)
		solve([n], config, new Int16Array(1))
		expect(n.slotIndex).toBeGreaterThanOrEqual(0)
		expect(n.slotIndex).toBeLessThan(n.slots.length)
		expect(n.conflict).toBe(0)
	})

	it('produces no leader-under-box crossings for a feasible row of labels', () => {
		const nodes = [makeNode('a', 0, 0), makeNode('b', 70, 0), makeNode('c', 140, 0)]
		link(nodes)
		solve(nodes, config, new Int16Array(nodes.length))

		for (const a of nodes) {
			for (const b of nodes) {
				if (a === b) continue
				expect(segmentRectPenetration(leader(a), paddedBox(b))).toBe(0)
			}
		}
	})

	it('drives leader-under-box crossings to zero for a feasible cluster', () => {
		// A 2D cluster with room to fan outward — the hard #1 requirement must hold,
		// and (post objective-alignment fix) resolvable crossings must not be left
		// locked in favour of a tidier-but-conflicting slot.
		const nodes = [
			makeNode('a', 0, 0),
			makeNode('b', 130, 0),
			makeNode('c', 0, 120),
			makeNode('d', 130, 120),
			makeNode('e', 65, 60),
			makeNode('f', 240, 60),
		]
		link(nodes)
		solve(nodes, config, new Int16Array(nodes.length))

		for (const a of nodes) {
			for (const b of nodes) {
				if (a === b) continue
				expect(segmentRectPenetration(leader(a), paddedBox(b))).toBe(0)
			}
		}
	})

	it('separates label boxes that would otherwise overlap', () => {
		const nodes = [makeNode('a', 0, 0), makeNode('b', 20, 0), makeNode('c', 40, 0)]
		link(nodes)
		solve(nodes, config, new Int16Array(nodes.length))

		for (let i = 0; i < nodes.length; i++) {
			for (let j = i + 1; j < nodes.length; j++) {
				expect(rectsOverlap(box(nodes[i]), box(nodes[j]), config.labelPadding)).toBe(false)
			}
		}
	})

	it('is deterministic across identical fresh solves', () => {
		const build = () => {
			const nodes = [makeNode('a', 0, 0), makeNode('b', 60, 10), makeNode('c', 30, 55)]
			link(nodes)
			solve(nodes, config, new Int16Array(nodes.length))
			return nodes.map((n) => n.slotIndex)
		}
		expect(build()).toEqual(build())
	})
})
