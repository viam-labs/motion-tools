/**
 * Builds each node's pruned, symmetric interaction set for one solve. The cell
 * size is chosen so any two labels whose boxes could possibly interact share or
 * border a cell, so the 3x3 query around each node finds every candidate.
 */

import type { SpatialHash } from './spatialHash'
import type { LabelNode, SolverConfig } from './types'

export const buildNeighborhood = (
	grid: SpatialHash,
	nodes: LabelNode[],
	config: SolverConfig
): void => {
	const maxRingMult = Math.max(...config.ringRadiiCrowded)

	// Cell size so any two labels whose boxes could interact share/border a cell.
	let cell = 1
	for (const node of nodes) {
		const halfDiag = Math.hypot(node.w / 2, node.h / 2)
		const support = Math.max(node.w, node.h) / 2
		const outer = (support + node.dotR + config.dotPadding) * maxRingMult
		cell = Math.max(cell, 2 * (halfDiag + outer))
	}
	grid.build(nodes, cell)

	// Symmetric neighbourhoods so the solver's incremental bookkeeping stays exact.
	for (const node of nodes) node.neighbors = grid.queryNeighbors(node, config.maxNeighbors)
	for (const a of nodes) {
		for (const b of a.neighbors) {
			if (!b.neighbors.includes(a)) b.neighbors.push(a)
		}
	}
}
