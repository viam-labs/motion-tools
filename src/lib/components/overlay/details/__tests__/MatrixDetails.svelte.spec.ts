import { render, screen } from '@testing-library/svelte'
import { createWorld } from 'koota'
import { Matrix4 } from 'three'
import '@testing-library/jest-dom/vitest'
import { describe, expect, it } from 'vitest'

import { traits } from '$lib/ecs'
import { WORLD_CONTEXT_KEY } from '$lib/ecs/useWorld'
import { createPose, poseToMatrix } from '$lib/transform'

import PoseDetails from '../PoseDetails.svelte'

describe('PoseDetails', () => {
	const world = createWorld()
	const parentOptions = [{ value: 'world', text: 'world' }]
	const noop = () => {}

	it('always renders parent, world position, and world orientation sections', () => {
		const entity = world.spawn()
		render(PoseDetails, {
			props: { entity, parentOptions, onPoseChange: noop, onParentChange: noop },
			context: new Map([[WORLD_CONTEXT_KEY, world]]),
		})
		expect(screen.getByText('parent')).toBeInTheDocument()
		expect(screen.getByText('world position')).toBeInTheDocument()
		expect(screen.getByText('world orientation')).toBeInTheDocument()
	})

	it('renders local position and orientation when entity has a Matrix', () => {
		const matrix = poseToMatrix(
			createPose({ x: 1, y: 2, z: 3, oX: 0.6, oY: 0.8, oZ: 0, theta: 0.4 }),
			new Matrix4()
		)
		const entity = world.spawn(traits.Matrix(matrix))
		render(PoseDetails, {
			props: { entity, parentOptions, onPoseChange: noop, onParentChange: noop },
			context: new Map([[WORLD_CONTEXT_KEY, world]]),
		})
		expect(screen.getByLabelText('mutable local position')).toBeInTheDocument()
		expect(screen.getByLabelText('mutable local orientation')).toBeInTheDocument()
	})

	it('does not render local position/orientation when entity has no matrix or center', () => {
		const entity = world.spawn()
		render(PoseDetails, {
			props: { entity, parentOptions, onPoseChange: noop, onParentChange: noop },
			context: new Map([[WORLD_CONTEXT_KEY, world]]),
		})
		expect(screen.queryByLabelText('mutable local position')).not.toBeInTheDocument()
		expect(screen.queryByLabelText('mutable local orientation')).not.toBeInTheDocument()
	})
})
