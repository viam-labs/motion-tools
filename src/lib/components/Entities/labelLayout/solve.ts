/**
 * Deterministic slot assignment via priority-ordered conflict-graph local search.
 *
 * Warm-started from each node's previously committed slot (set by the engine
 * before this runs), it repeatedly moves the worst-conflict node to its lowest
 * cost slot, re-scoring only the affected neighbourhood, until no node has a
 * conflict or the move budget is spent. A best-total snapshot is restored at the
 * end so a re-solve can never regress below where it started.
 */

import type { LabelNode, SolverConfig } from './types'

import { evalCost, W } from './cost'

/** Conflicts below this are treated as resolved (floating-point slack). */
const RESOLVED = 0.5

function bestSlot(node: LabelNode, config: SolverConfig): { index: number; conflict: number } {
	const neighbors = node.neighbors
	let index = node.slotIndex
	let full = evalCost(node, node.slotIndex, neighbors, config, false)
	let conflict = evalCost(node, node.slotIndex, neighbors, config, true)

	for (let s = 0; s < node.slots.length; s++) {
		if (s === node.slotIndex) continue
		// Slots are sorted ascending by baseCost; once even the best-case length
		// cost can't beat the incumbent, no later slot can either.
		if (node.slots[s].baseCost - W.stick >= full) break
		const f = evalCost(node, s, neighbors, config, false)
		if (f < full) {
			full = f
			index = s
			conflict = evalCost(node, s, neighbors, config, true)
		}
	}

	return { index, conflict }
}

export function solve(nodes: LabelNode[], config: SolverConfig, bestSnap: Int16Array): void {
	const n = nodes.length
	if (n === 0) return

	for (const node of nodes) node.prevSlotIndex = node.slotIndex

	const order = nodes.toSorted(
		(a, b) => b.w * b.h - a.w * a.h || a.slots.length - b.slots.length || a.idHash - b.idHash
	)

	let total = 0
	for (let i = 0; i < n; i++) {
		const node = nodes[i]
		node.conflict = evalCost(node, node.slotIndex, node.neighbors, config, true)
		node.locked = false
		total += node.conflict
	}

	let bestE = total
	for (let i = 0; i < n; i++) bestSnap[i] = nodes[i].slotIndex

	let budget = config.polishBudget
	while (budget > 0) {
		let worst: LabelNode | undefined
		let worstConflict = RESOLVED
		for (let i = 0; i < n; i++) {
			const node = order[i]
			if (!node.locked && node.conflict > worstConflict) {
				worstConflict = node.conflict
				worst = node
			}
		}
		if (!worst) break

		const result = bestSlot(worst, config)
		if (result.index !== worst.slotIndex && result.conflict < worst.conflict - RESOLVED) {
			total += result.conflict - worst.conflict
			worst.slotIndex = result.index
			worst.conflict = result.conflict
			budget--

			// Moving `worst` changes the pairwise cost of its neighbors only.
			for (const m of worst.neighbors) {
				const before = m.conflict
				m.conflict = evalCost(m, m.slotIndex, m.neighbors, config, true)
				total += m.conflict - before
				m.locked = false
			}

			if (total < bestE) {
				bestE = total
				for (let i = 0; i < n; i++) bestSnap[i] = nodes[i].slotIndex
			}
		} else {
			worst.locked = true
		}
	}

	for (let i = 0; i < n; i++) {
		const node = nodes[i]
		node.slotIndex = bestSnap[i]
		const slot = node.slots[node.slotIndex]
		node.tx = node.ax + slot.dx
		node.ty = node.ay + slot.dy
	}
}
