/**
 * Post-solve teleport handling: decides which nodes snap to their solved target
 * this frame versus ease toward it. A big camera jump (large median anchor
 * displacement) or a brand-new node (no prior anchor) places labels in their
 * final spot rather than gliding across the screen; everything else eases.
 * Always rolls each node's prevAx/prevAy forward for the next solve's comparison.
 */

import type { LabelNode, SolverConfig } from './types'

/** The radius of a node's outermost slot (0 if it has none). */
const maxSlotRadius = (node: LabelNode): number => {
	const last = node.slots.at(-1)
	return last ? last.radius : 0
}

export const applyTeleports = (
	nodes: LabelNode[],
	width: number,
	height: number,
	config: SolverConfig
): void => {
	const diag = Math.hypot(width, height)
	const displacements: number[] = []
	for (const node of nodes) {
		if (!Number.isNaN(node.prevAx)) {
			displacements.push(Math.hypot(node.ax - node.prevAx, node.ay - node.prevAy))
		}
	}
	let snapAll = displacements.length === 0
	if (!snapAll) {
		displacements.sort((a, b) => a - b)
		const median = displacements[displacements.length >> 1]
		if (median > config.teleportFrac * diag) snapAll = true
	}

	for (const node of nodes) {
		const ownJump =
			!Number.isNaN(node.prevAx) &&
			Math.hypot(node.ax - node.prevAx, node.ay - node.prevAy) > maxSlotRadius(node) * 3
		if (snapAll || ownJump) {
			node.cx = node.tx
			node.cy = node.ty
			node.settled = true
		}
		node.prevAx = node.ax
		node.prevAy = node.ay
	}
}
