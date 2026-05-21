import { afterEach, describe, expect, it, vi } from 'vitest'

import { createPlanRequestDropper } from './plan-request-dropper'

describe('createPlanRequestDropper', () => {
	afterEach(() => {
		vi.restoreAllMocks()
	})

	it('accepts concatenated request+response JSON by extracting the request object', async () => {
		const fetchMock = vi.fn(async () => {
			return {
				ok: true,
				json: async () => ({ component_names: ['world'], goal_count: 1 }),
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

		const dropper = createPlanRequestDropper('http://localhost:3030')
		const result = await dropper({
			name: 'bad-plan.json',
			extension: 'json',
			prefix: undefined,
			content: `${JSON.stringify(request)}${JSON.stringify(response)}`,
		})

		expect(result.success).toBe(true)
		expect(fetchMock).toHaveBeenCalledTimes(1)
		expect(fetchMock.mock.calls[0]?.[0]).toBe('http://localhost:3030/plan-request')

		const init = fetchMock.mock.calls[0]?.[1] as RequestInit
		expect(typeof init.body).toBe('string')
		expect((init.body as string).includes('"frame_system"')).toBe(true)
		expect((init.body as string).includes('"trajectory"')).toBe(false)
	})

	it('rejects non-plan json payloads', async () => {
		vi.stubGlobal('fetch', vi.fn())

		const dropper = createPlanRequestDropper('http://localhost:3030')
		const result = await dropper({
			name: 'not-a-plan.json',
			extension: 'json',
			prefix: undefined,
			content: JSON.stringify({ path: [] }),
		})

		expect(result.success).toBe(false)
		if (!result.success) {
			expect(result.error.message).toContain('not-a-plan.json is not a supported file type.')
		}
	})
})
