import { describe, expect, it } from 'vitest'

import { parsePlan, PlanParseError } from '../parse-plan'

const MINIMAL_FRAME_SYSTEM = {
	frames: {
		'left-arm': {
			frame_type: 'model',
			frame: { name: 'left-arm', model: { joints: [{ id: 'waist' }] } },
		},
		'left-arm:waist': {
			frame_type: 'named',
			frame: {
				inner_frame: {
					frame_type: 'rotational',
					frame: { axis: { X: 0, Y: 0, Z: 1 } },
				},
			},
		},
	},
	parents: { 'left-arm:waist': 'world' },
}

const REQUEST_OBJ = { frame_system: MINIMAL_FRAME_SYSTEM, goals: [], start_state: {} }
const RESULT_OBJ = { trajectory: [{ 'left-arm': [0.5] }] }

describe('parsePlan', () => {
	it('parses a single-object plan (no trajectory)', () => {
		const plan = parsePlan(JSON.stringify(REQUEST_OBJ))
		expect(Object.keys(plan.frames)).toContain('left-arm:waist')
		expect(plan.trajectory).toHaveLength(0)
	})

	it('parses two concatenated JSON objects', () => {
		const content = JSON.stringify(REQUEST_OBJ) + JSON.stringify(RESULT_OBJ)
		const plan = parsePlan(content)
		expect(plan.trajectory).toHaveLength(1)
		expect(plan.trajectory[0]!['left-arm']).toEqual([0.5])
	})

	it('throws PlanParseError when frame_system is absent', () => {
		expect(() => parsePlan(JSON.stringify({ path: [], trajectory: [] }))).toThrow(PlanParseError)
	})

	it('throws PlanParseError on invalid JSON', () => {
		expect(() => parsePlan('{ not valid json')).toThrow(PlanParseError)
	})

	it('throws PlanParseError when a chunk has wrong types', () => {
		expect(() =>
			parsePlan(JSON.stringify({ frame_system: MINIMAL_FRAME_SYSTEM, trajectory: 'bad' }))
		).toThrow(PlanParseError)
	})
})
