/**
 * Uniform grid over label anchors, used to prune the O(n^2) cost evaluation to a
 * bounded neighborhood. The cell size is chosen so any two labels whose boxes
 * could possibly interact share or border a cell, so scanning the 3x3 block
 * around a node finds every candidate.
 */

import type { LabelNode } from './types'

const KEY_OFFSET = 2048
const KEY_STRIDE = 4096

export class SpatialHash {
	private cell = 1
	private readonly buckets = new Map<number, LabelNode[]>()

	private static key(gx: number, gy: number): number {
		return (gx + KEY_OFFSET) * KEY_STRIDE + (gy + KEY_OFFSET)
	}

	build(nodes: LabelNode[], cell: number) {
		this.cell = Math.max(cell, 1)
		this.buckets.clear()
		for (const node of nodes) {
			const k = SpatialHash.key(Math.floor(node.ax / this.cell), Math.floor(node.ay / this.cell))
			const bucket = this.buckets.get(k)
			if (bucket) bucket.push(node)
			else this.buckets.set(k, [node])
		}
	}

	/** Nearest `max` nodes (by anchor distance) in the 3x3 cell block around `node`, excluding itself. */
	queryNeighbors(node: LabelNode, max: number): LabelNode[] {
		const gx = Math.floor(node.ax / this.cell)
		const gy = Math.floor(node.ay / this.cell)
		const found: LabelNode[] = []

		for (let ox = -1; ox <= 1; ox++) {
			for (let oy = -1; oy <= 1; oy++) {
				const bucket = this.buckets.get(SpatialHash.key(gx + ox, gy + oy))
				if (!bucket) continue
				for (const other of bucket) {
					if (other !== node) found.push(other)
				}
			}
		}

		if (found.length <= max) return found

		found.sort((a, b) => {
			const da = (a.ax - node.ax) ** 2 + (a.ay - node.ay) ** 2
			const db = (b.ax - node.ax) ** 2 + (b.ay - node.ay) ** 2
			return da - db
		})
		found.length = max
		return found
	}
}
