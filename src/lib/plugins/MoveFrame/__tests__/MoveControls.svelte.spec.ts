import type { ResourceName, Transform } from '@viamrobotics/sdk'

import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/svelte'
import { useResourceNames } from '@viamrobotics/svelte-sdk'
import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest'

import { usePartID } from '$lib/hooks/usePartID.svelte'
import { Pose } from '$lib/math'

import MoveControls from '../MoveControls.svelte'

// Render the panel body without Threlte, and stand in for the real move widget so we
// can assert the props MoveControls hands it.
vi.mock('$lib/components/overlay/FloatingPanel.svelte', async () => {
	const MockFloatingPanel = await import('./__fixtures__/MockFloatingPanel.svelte')
	return { default: MockFloatingPanel.default }
})
vi.mock('@viamrobotics/test-widgets', async () => {
	const MockMoveWidget = await import('./__fixtures__/MockMoveWidget.svelte')
	return { MotionMoveWidget: MockMoveWidget.default }
})
// The scene-side components need a Threlte context (and import @threlte/extras);
// stub them out for the panel-body test.
vi.mock('../MoveGizmo.svelte', async () => {
	const MockScene = await import('./__fixtures__/MockSceneComponent.svelte')
	return { default: MockScene.default }
})
vi.mock('../MoveTargetGhost.svelte', async () => {
	const MockScene = await import('./__fixtures__/MockSceneComponent.svelte')
	return { default: MockScene.default }
})

// Ghosts are entities in the real world; the panel-body test has no ECS.
vi.mock('../useMoveGhosts.svelte', () => ({ useMoveGhosts: () => undefined }))

// The frame's live world transform normally comes from a robot `getPose` poll; hand
// the panel a fixed one so the pose inputs have something to seed from.
const moved = vi.hoisted(() => ({ matrix: undefined as unknown }))
vi.mock('../useMovedFrameMatrix.svelte', () => ({
	useMovedFrameMatrix: () => ({
		get current() {
			return moved.matrix
		},
	}),
}))

// New MoveControls dependencies that the panel-body test does not exercise.
vi.mock('$lib/hooks/useSettings.svelte', () => ({
	RefreshRates: { poses: 'poses' },
	useSettings: () => ({
		current: { interactionMode: 'navigate', refreshRates: { poses: 500 } },
	}),
}))
vi.mock('@viamrobotics/prime-core', async (importOriginal) => ({
	...(await importOriginal<typeof import('@viamrobotics/prime-core')>()),
	useToast: () => vi.fn(),
}))

// The frame the panel targets must resolve as present via the ECS name query, else the
// panel auto-closes. `useQuery` reads from a mutable holder the tests populate.
const ecs = vi.hoisted(() => ({ names: [] as string[] }))
vi.mock('$lib/ecs', () => {
	const Name = Symbol('Name')
	const WorldMatrix = Symbol('WorldMatrix')
	return {
		traits: { Name, WorldMatrix },
		useQuery: () => ({
			get current() {
				return ecs.names.map((name) => ({ get: () => name }))
			},
		}),
		useTrait: () => ({ current: undefined }),
	}
})

vi.mock('@viamrobotics/svelte-sdk', () => ({
	useResourceNames: vi.fn(),
	createResourceClient: vi.fn(() => ({ current: undefined })),
	useRobotClient: vi.fn(() => ({ current: undefined })),
	createRobotQuery: vi.fn(() => ({ data: undefined })),
}))
vi.mock('$lib/hooks/usePartID.svelte', () => ({ usePartID: vi.fn() }))
vi.mock('$lib/hooks/useFrames.svelte', () => ({ useFrames: vi.fn() }))

const service = (name: string): ResourceName =>
	({ namespace: 'rdk', type: 'service', subtype: 'motion', name }) as ResourceName

const frame = (referenceFrame: string, parent?: string): Transform =>
	({
		referenceFrame,
		poseInObserverFrame: parent ? { referenceFrame: parent } : undefined,
	}) as Transform

describe('MoveControls', () => {
	const partID = 'part1'
	let onClose: Mock<() => void>

	beforeEach(async () => {
		vi.clearAllMocks()
		ecs.names = ['arm']
		moved.matrix = undefined
		onClose = vi.fn<() => void>()

		vi.mocked(usePartID).mockReturnValue({ current: partID } as never)

		const { useFrames } = await import('$lib/hooks/useFrames.svelte')
		vi.mocked(useFrames).mockReturnValue({
			current: [frame('arm', 'base'), frame('base', 'world')],
		} as never)
	})

	it('renders the move widget with the built-in service and the frame parent as destination', () => {
		vi.mocked(useResourceNames).mockReturnValue({
			current: [service('planner'), service('builtin')],
		} as never)

		render(MoveControls, { props: { frameName: 'arm', onClose } })

		// built-in service is preferred; destination defaults to the frame's parent (base).
		expect(screen.getByTestId('move-widget')).toHaveTextContent('move:part1:builtin:arm:base')
	})

	it('falls back to the first motion service when there is no built-in', () => {
		vi.mocked(useResourceNames).mockReturnValue({
			current: [service('planner'), service('secondary')],
		} as never)

		render(MoveControls, { props: { frameName: 'arm', onClose } })

		expect(screen.getByTestId('move-widget')).toHaveTextContent('move:part1:planner:arm:base')
	})

	it('waits for the frame pose before offering the pose inputs', () => {
		vi.mocked(useResourceNames).mockReturnValue({ current: [service('builtin')] } as never)

		render(MoveControls, { props: { frameName: 'arm', onClose } })

		expect(screen.queryByLabelText('move target position')).not.toBeInTheDocument()
		expect(screen.getByText(/resolving the frame's pose/i)).toBeInTheDocument()
	})

	it('seeds editable position and orientation inputs from the frame pose', async () => {
		vi.mocked(useResourceNames).mockReturnValue({ current: [service('builtin')] } as never)
		moved.matrix = new Pose(100, -250, 40).toMatrix4()

		render(MoveControls, { props: { frameName: 'arm', onClose } })

		const position = await screen.findByLabelText('move target position')
		expect(screen.getByLabelText('move target orientation')).toBeInTheDocument()

		const fields = position.querySelectorAll('input')
		expect([...fields].map((field) => Number(field.value))).toEqual([100, -250, 40])
	})

	it('stages a target when a pose field is edited', async () => {
		vi.mocked(useResourceNames).mockReturnValue({ current: [service('builtin')] } as never)
		moved.matrix = new Pose(100, -250, 40).toMatrix4()

		render(MoveControls, { props: { frameName: 'arm', onClose } })

		// Nothing is staged until a field moves, so both actions start disabled.
		expect(screen.getByRole('button', { name: /reset/i })).toHaveAttribute('aria-disabled', 'true')

		const position = await screen.findByLabelText('move target position')
		const x = position.querySelector('input')
		if (!x) throw new Error('expected a position field')
		await fireEvent.change(x, { target: { value: '500' } })

		await waitFor(() => {
			expect(screen.getByRole('button', { name: /reset/i })).not.toHaveAttribute('aria-disabled')
		})
		expect(screen.getByRole('button', { name: /execute move/i })).not.toHaveAttribute(
			'aria-disabled'
		)
		// 400 mm of travel along x, no rotation.
		expect(screen.getByText(/400\.0 mm · 0\.0°/)).toBeInTheDocument()
	})

	it('reports a close when the panel is dismissed', async () => {
		vi.mocked(useResourceNames).mockReturnValue({ current: [service('builtin')] } as never)

		render(MoveControls, { props: { frameName: 'arm', onClose } })

		await fireEvent.click(screen.getByRole('button', { name: /close panel/i }))

		await waitFor(() => {
			expect(onClose).toHaveBeenCalled()
		})
	})
})
