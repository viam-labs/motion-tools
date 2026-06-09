/**
 * Candidate slot generation: concentric rings of radial directions around a dot.
 *
 * The inner radius per angle uses the AABB support function (tighter than a
 * uniform half-diagonal, so cardinal placements sit closer), guaranteeing a
 * node's own dot never enters its own box at any angle.
 */

import type { LabelNode, Slot, SolverConfig } from './types'

import { W } from './cost'

export const generateSlots = (node: LabelNode, crowded: boolean, config: SolverConfig): Slot[] => {
	const angles = crowded ? config.anglesPerRing * 2 : config.anglesPerRing
	const rings = crowded ? config.ringRadiiCrowded : config.ringRadii

	// Deterministic per-node phase so neighbouring dots don't expose identical angles.
	const phase = ((node.idHash % angles) / angles) * ((2 * Math.PI) / angles)

	const halfW = node.w / 2
	const halfH = node.h / 2
	const slots: Slot[] = []

	for (let ring = 0; ring < rings.length; ring++) {
		// Half-step stagger on odd rings so leaders interleave instead of stacking.
		const stagger = ring % 2 ? Math.PI / angles : 0
		for (let k = 0; k < angles; k++) {
			const angle = phase + stagger + (k / angles) * 2 * Math.PI
			const ct = Math.cos(angle)
			const st = Math.sin(angle)
			const support = Math.abs(ct) * halfW + Math.abs(st) * halfH
			const radius = (support + node.dotR + config.dotPadding) * rings[ring]
			slots.push({
				dx: ct * radius,
				dy: st * radius,
				angle,
				radius,
				ring,
				baseCost: W.len * radius,
			})
		}
	}

	slots.sort((a, b) => a.baseCost - b.baseCost)
	return slots
}

/** FNV-1a hash of a string → unsigned 32-bit. */
export const hashString = (s: string): number => {
	let h = 2166136261
	for (let i = 0; i < s.length; i++) {
		h ^= s.charCodeAt(i)
		h = Math.imul(h, 16777619)
	}
	return h >>> 0
}
