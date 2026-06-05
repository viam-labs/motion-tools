import { describe, expect, it } from 'vitest'

import { rectCircleOverlap } from '../geometry'
import { generateSlots, hashString } from '../slots'
import { defaultSolverConfig, type LabelNode } from '../types'

function node(w: number, h: number, dotR: number, id = 'label'): LabelNode {
	return { w, h, dotR, idHash: hashString(id) } as unknown as LabelNode
}

describe('hashString', () => {
	it('is deterministic and unsigned', () => {
		expect(hashString('frame-a')).toBe(hashString('frame-a'))
		expect(hashString('frame-a')).not.toBe(hashString('frame-b'))
		expect(hashString('x')).toBeGreaterThanOrEqual(0)
	})
})

describe('generateSlots', () => {
	const config = defaultSolverConfig

	it('produces angles × rings slots, more when crowded', () => {
		const sparse = generateSlots(node(40, 16, 4), false, config)
		expect(sparse.length).toBe(config.anglesPerRing * config.ringRadii.length)

		const crowded = generateSlots(node(40, 16, 4), true, config)
		expect(crowded.length).toBe(config.anglesPerRing * 2 * config.ringRadiiCrowded.length)
	})

	it('sorts slots ascending by baseCost', () => {
		const slots = generateSlots(node(40, 16, 4), false, config)
		for (let i = 1; i < slots.length; i++) {
			expect(slots[i].baseCost).toBeGreaterThanOrEqual(slots[i - 1].baseCost)
		}
	})

	it('never lets a box overlap its own dot at any angle', () => {
		// Slots are dot-relative, so the dot sits at the origin.
		for (const [w, h, dotR] of [
			[40, 16, 4],
			[80, 12, 3],
			[10, 10, 6],
		]) {
			for (const crowded of [false, true]) {
				for (const s of generateSlots(node(w, h, dotR), crowded, config)) {
					const box = { cx: s.dx, cy: s.dy, hw: w / 2, hh: h / 2 }
					expect(rectCircleOverlap(box, 0, 0, dotR)).toBe(0)
				}
			}
		}
	})
})
