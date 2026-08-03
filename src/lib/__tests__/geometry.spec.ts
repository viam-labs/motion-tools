import { describe, expect, it } from 'vitest'

import type { Frame } from '$lib/frame'

import { createGeometryFromFrame } from '$lib/geometry'

describe('createGeometryFromFrame', () => {
	it('preserves a configured geometry center pose', () => {
		const frame: Partial<Frame> = {
			geometry: {
				type: 'box',
				x: 100,
				y: 200,
				z: 300,
				translation: { x: 257.5, y: 235, z: 0 },
				orientation: {
					type: 'ov_degrees',
					value: { x: 0, y: 0, z: 1, th: 90 },
				},
			},
		}

		const geometry = createGeometryFromFrame(frame)

		expect(geometry?.center).toMatchObject({
			x: 257.5,
			y: 235,
			z: 0,
			oX: 0,
			oY: 0,
			oZ: 1,
			theta: 90,
		})
	})
})
