import { render, screen } from '@testing-library/svelte'
import { createWorld } from 'koota'
import '@testing-library/jest-dom/vitest'
import { describe, expect, it } from 'vitest'

import { WORLD_CONTEXT_KEY } from '$lib/ecs/useWorld'

import PolylineMeasureDetails from '../PolylineMeasureDetails.svelte'
import { PolylineMeasure } from '../traits'

describe('PolylineMeasureDetails', () => {
	const world = createWorld()

	it('renders the measurement section', () => {
		const entity = world.spawn()
		render(PolylineMeasureDetails, {
			props: { entity },
			context: new Map([[WORLD_CONTEXT_KEY, world]]),
		})
		expect(screen.getByText('measurement')).toBeInTheDocument()
	})

	it('reads the current mode from the PolylineMeasure trait', () => {
		const entity = world.spawn(PolylineMeasure({ mode: 'total' }))
		render(PolylineMeasureDetails, {
			props: { entity },
			context: new Map([[WORLD_CONTEXT_KEY, world]]),
		})
		expect(screen.getByText('measurement')).toBeInTheDocument()
	})
})
