import { render, screen } from '@testing-library/svelte'
import { createWorld } from 'koota'
import '@testing-library/jest-dom/vitest'
import { describe, expect, it } from 'vitest'

import { traits } from '$lib/ecs'
import { WORLD_CONTEXT_KEY } from '$lib/ecs/useWorld'

import GeometryDetails from '../GeometryDetails.svelte'

describe('GeometryDetails', () => {
	const world = createWorld()

	describe('editable', () => {
		it('renders box dimensions when entity has Box trait', () => {
			const entity = world.spawn(traits.Box({ x: 10, y: 20, z: 30 }))
			render(GeometryDetails, {
				props: { entity, editable: true },
				context: new Map([[WORLD_CONTEXT_KEY, world]]),
			})
			expect(screen.getByLabelText('mutable box dimensions')).toBeInTheDocument()
		})

		it('renders sphere dimensions when entity has Sphere trait', () => {
			const entity = world.spawn(traits.Sphere({ r: 50 }))
			render(GeometryDetails, {
				props: { entity, editable: true },
				context: new Map([[WORLD_CONTEXT_KEY, world]]),
			})
			expect(screen.getByLabelText('mutable sphere dimensions')).toBeInTheDocument()
		})

		it('renders capsule dimensions when entity has Capsule trait', () => {
			const entity = world.spawn(traits.Capsule({ r: 25, l: 100 }))
			render(GeometryDetails, {
				props: { entity, editable: true },
				context: new Map([[WORLD_CONTEXT_KEY, world]]),
			})
			expect(screen.getByLabelText('mutable capsule dimensions')).toBeInTheDocument()
		})
	})

	describe('read-only', () => {
		it('renders immutable box dimensions when entity has Box trait', () => {
			const entity = world.spawn(traits.Box({ x: 10, y: 20, z: 30 }))
			render(GeometryDetails, {
				props: { entity, editable: false },
				context: new Map([[WORLD_CONTEXT_KEY, world]]),
			})
			expect(screen.getByLabelText('immutable box dimensions x value input')).toBeInTheDocument()
			expect(screen.queryByLabelText('mutable box dimensions')).not.toBeInTheDocument()
		})

		it('renders nothing when entity has no geometry trait', () => {
			const entity = world.spawn()
			render(GeometryDetails, {
				props: { entity, editable: false },
				context: new Map([[WORLD_CONTEXT_KEY, world]]),
			})
			expect(screen.queryByText('dimensions')).not.toBeInTheDocument()
		})
	})
})
