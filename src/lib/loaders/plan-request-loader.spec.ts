import { afterEach, describe, expect, it, vi } from 'vitest'

import { createPlanRequestLoader } from './plan-request-loader'

describe('createPlanRequestLoader', () => {
	afterEach(() => {
		vi.restoreAllMocks()
	})

	it('accepts concatenated request+response JSON and forwards the original payload', async () => {
		const fetchMock = vi.fn(async () => {
			return {
				ok: true,
				json: async () => ({
					component_names: ['world'],
					goal_count: 1,
					total_steps: 2,
					current_step: 0,
				}),
			} as unknown as Response
		})
		vi.stubGlobal('fetch', fetchMock)

		const request = {
			frame_system: {
				name: 'builtin',
				world: {
					frame_type: 'static',
					frame: {
						id: 'world',
						translation: { X: 0, Y: 0, Z: 0 },
						orientation: { type: 'quaternion', value: { W: 1, X: 0, Y: 0, Z: 0 } },
					},
				},
				frames: {},
				parents: {},
			},
			start_state: { configuration: {} },
			goals: [],
		}
		const response = { path: [], trajectory: [] }

		const loadPlanRequest = createPlanRequestLoader('http://localhost:3030')
		const result = await loadPlanRequest({
			name: 'bad-plan.json',
			content: `${JSON.stringify(request)}${JSON.stringify(response)}`,
		})

		expect(result.success).toBe(true)
		expect(fetchMock).toHaveBeenCalledTimes(1)

		const call = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
		expect(call[0]).toBe('http://localhost:3030/plan-request')
		const init = call[1]
		expect(typeof init.body).toBe('string')
		expect((init.body as string).includes('"frame_system"')).toBe(true)
		expect((init.body as string).includes('"trajectory"')).toBe(true)
	})

	it('rejects non-plan json payloads', async () => {
		vi.stubGlobal('fetch', vi.fn())

		const loadPlanRequest = createPlanRequestLoader('http://localhost:3030')
		const result = await loadPlanRequest({
			name: 'not-a-plan.json',
			content: JSON.stringify({ path: [] }),
		})

		expect(result.success).toBe(false)
		if (!result.success) {
			expect(result.error.message).toContain('not-a-plan.json is not a supported file type.')
		}
	})
})
