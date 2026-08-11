import type { UserEvent } from '@testing-library/user-event'
import type { ResourceName } from '@viamrobotics/sdk'
import type { Entity } from 'koota'

import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/svelte'
import userEvent from '@testing-library/user-event'
import { useResourceNames } from '@viamrobotics/svelte-sdk'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { TrajectoryPlayer } from '$lib/motion/trajectoryPlayer.svelte'

import { usePartID } from '$lib/hooks/usePartID.svelte'
import { Pose } from '$lib/math'

import type { TrajectoryStep } from '../planDoCommand'
import type { PreviewMove, PreviewMoveOptions, PreviewStatus } from '../usePreviewMove.svelte'

import MoveControls from '../MoveControls.svelte'
import { moveExecutionOwner } from '../moveExecutionOwner.svelte'

// Render the panel body without Threlte — the shell reads the scene and the ECS.
vi.mock('$lib/components/overlay/details/DetailsPanel.svelte', async () => {
	const MockDetailsPanel = await import('./__fixtures__/MockDetailsPanel.svelte')
	return { default: MockDetailsPanel.default }
})
// The scene-side components need a Threlte context and import @threlte/extras. Stub
// them out for the panel-body test.
vi.mock('../MoveGizmo.svelte', async () => {
	const MockScene = await import('./__fixtures__/MockSceneComponent.svelte')
	return { default: MockScene.default }
})
vi.mock('../MoveTargetGhost.svelte', async () => {
	const MockScene = await import('./__fixtures__/MockSceneComponent.svelte')
	return { default: MockScene.default }
})

// Ghosts are entities in the real world. The panel-body test has no ECS.
vi.mock('../useMoveGhosts.svelte', () => ({ useMoveGhosts: () => undefined }))

vi.mock('../MoveJsonField.svelte', async () => {
	const MockField = await import('./__fixtures__/MockMoveJsonField.svelte')
	return { default: MockField.default }
})

// The preview plans over the ECS, the frame system and the motion client. Drive its status from the
// test so the panel's two execute paths can be told apart without a motion service.
const preview = vi.hoisted(() => ({
	status: 'idle' as PreviewStatus,
	trajectory: [] as TrajectoryStep[],
	message: undefined as string | undefined,
	requestPreview: vi.fn(),
	clear: vi.fn(),
	options: undefined as PreviewMoveOptions | undefined,
}))
vi.mock('../usePreviewMove.svelte', () => ({
	usePreviewMove: (options: PreviewMoveOptions): PreviewMove => {
		preview.options = options

		return {
			get status() {
				return preview.status
			},
			get message() {
				return preview.message
			},
			get trajectory() {
				return preview.trajectory
			},
			plannedSteps: 0,
			player: {
				currentStep: 0,
				totalSteps: 0,
				lastStep: 0,
				isPlaying: false,
				atEnd: true,
				play: vi.fn(),
				pause: vi.fn(),
				toggle: vi.fn(),
				seek: vi.fn(),
				stepBy: vi.fn(),
				reset: vi.fn(),
			} satisfies TrajectoryPlayer,
			requestPreview: preview.requestPreview,
			clear: preview.clear,
		} satisfies PreviewMove
	},
}))

// The setup file's global `useFrames` mock has no `parts`, which the panel reads for the kinematics
// the ghosts are drawn through. A getter so a test can swap it the way a refetch does.
const framesContext = vi.hoisted(() => ({ parts: [] as unknown[] }))
vi.mock('$lib/hooks/useFrames.svelte', () => ({
	useFrames: () => ({
		current: [],
		get parts() {
			return framesContext.parts
		},
		isReady: true,
	}),
}))

// The frame's live world transform normally comes from a robot `getPose` poll. Hand the
// panel a fixed one so the pose inputs have something to seed from.
const moved = vi.hoisted(() => ({ matrix: undefined as unknown }))
vi.mock('../useMovedFrameMatrix.svelte', () => ({
	useMovedFrameMatrix: () => ({
		get current() {
			return moved.matrix
		},
	}),
}))

// MoveControls dependencies the panel-body test does not exercise.
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

const motionClient = vi.hoisted(() => ({ doCommand: vi.fn(async () => ({ execute: true })) }))
// `createResourceClient` yields `undefined` until the connection is CONNECTED, while the resource
// *names* keep coming from cache. A getter so a test can drive the two apart.
const client = vi.hoisted(() => ({ current: undefined as unknown }))
vi.mock('@viamrobotics/svelte-sdk', () => ({
	useResourceNames: vi.fn(),
	createResourceClient: vi.fn(() => ({
		get current() {
			return client.current
		},
	})),
	useRobotClient: vi.fn(() => ({ current: undefined })),
	createRobotQuery: vi.fn(() => ({ data: undefined })),
}))
vi.mock('$lib/hooks/usePartID.svelte', () => ({ usePartID: vi.fn() }))

const service = (name: string): ResourceName =>
	({ namespace: 'rdk', type: 'service', subtype: 'motion', name }) as ResourceName

/** The panel only hands the entity to the shell and the ghosts, both stubbed here. */
const entity = 1 as unknown as Entity

describe('MoveControls', () => {
	const partID = 'part1'

	beforeEach(() => {
		vi.clearAllMocks()
		moved.matrix = undefined
		preview.status = 'idle'
		preview.trajectory = []
		preview.message = undefined
		client.current = motionClient
		framesContext.parts = []

		// Module-level state, so a test that left the lock held would disable every panel after it.
		const held = moveExecutionOwner.movingFrame
		if (held !== undefined) moveExecutionOwner.release(held)

		vi.mocked(usePartID).mockReturnValue({ current: partID } as never)
	})

	it('selects the built-in motion service by default', () => {
		vi.mocked(useResourceNames).mockReturnValue({
			current: [service('planner'), service('builtin')],
		} as never)

		render(MoveControls, { props: { entity, frameName: 'arm' } })

		expect(screen.getByText('motion service')).toBeInTheDocument()
		expect(screen.getByRole('combobox')).toHaveValue('builtin')
	})

	it('falls back to the first motion service when there is no built-in', () => {
		vi.mocked(useResourceNames).mockReturnValue({
			current: [service('planner'), service('secondary')],
		} as never)

		render(MoveControls, { props: { entity, frameName: 'arm' } })

		expect(screen.getByText('motion service')).toBeInTheDocument()
		expect(screen.getByRole('combobox')).toHaveValue('planner')
	})

	it('waits for the frame pose before offering the pose inputs', () => {
		vi.mocked(useResourceNames).mockReturnValue({ current: [service('builtin')] } as never)

		render(MoveControls, { props: { entity, frameName: 'arm' } })

		expect(screen.queryByLabelText('move target position')).not.toBeInTheDocument()
		expect(screen.getByText(/resolving the frame's pose/i)).toBeInTheDocument()
	})

	it('seeds editable position and orientation inputs from the frame pose', async () => {
		vi.mocked(useResourceNames).mockReturnValue({ current: [service('builtin')] } as never)
		moved.matrix = new Pose(100, -250, 40).toMatrix4()

		render(MoveControls, { props: { entity, frameName: 'arm' } })

		const position = await screen.findByLabelText('move target position')
		expect(screen.getByLabelText('move target orientation')).toBeInTheDocument()
		expect(screen.getByText('world position')).toBeInTheDocument()
		expect(screen.getByText('world orientation')).toBeInTheDocument()

		const fields = position.querySelectorAll('input')
		expect([...fields].map((field) => Number(field.value))).toEqual([100, -250, 40])
	})

	it('stages a target when a pose field is edited', async () => {
		vi.mocked(useResourceNames).mockReturnValue({ current: [service('builtin')] } as never)
		moved.matrix = new Pose(100, -250, 40).toMatrix4()

		render(MoveControls, { props: { entity, frameName: 'arm' } })

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

	const withBuiltinService = () => {
		vi.mocked(useResourceNames).mockReturnValue({ current: [service('builtin')] } as never)
	}

	const invalidationKey = () => {
		const invalidateOn = preview.options?.invalidateOn
		if (!invalidateOn) throw new Error('expected the panel to configure a preview')
		return structuredClone(invalidateOn())
	}

	// Tweakpane renders `Point` as unlabelled inputs it drives itself, so there is no semantic query
	// for one axis and no `change` unless the value is set outright.
	const stageGoal = async () => {
		const position = await screen.findByLabelText('move target position')
		const x = position.querySelector('input')
		if (!x) throw new Error('expected a position field')
		await fireEvent.change(x, { target: { value: '500' } })
	}

	// `user.paste` rather than `user.type`: the keyboard DSL reads `{` and `[` as key descriptors,
	// which every one of these JSON values opens with.
	const fillJson = async (user: UserEvent, label: string, value: string) => {
		await user.click(screen.getByLabelText(label))
		await user.paste(value)
	}

	it.each([
		{ input: 'the goal moves', change: () => stageGoal() },
		{
			input: 'the world state changes',
			change: (user: UserEvent) => fillJson(user, 'World state', '{"obstacles":[]}'),
		},
		{
			input: 'the constraints change',
			change: (user: UserEvent) => fillJson(user, 'Constraints', '{"linearConstraint":[{}]}'),
		},
		{
			input: 'the frame system is refetched',
			change: () => {
				framesContext.parts = [{ frame: 'moved' }]
			},
		},
	])('re-keys the preview when $input', async ({ change }) => {
		const user = userEvent.setup()
		withBuiltinService()
		moved.matrix = new Pose(100, -250, 40).toMatrix4()

		render(MoveControls, { props: { entity, frameName: 'arm' } })

		const before = invalidationKey()
		await change(user)

		expect(invalidationKey()).not.toEqual(before)
	})

	it('asks the preview for a plan when Preview move is clicked', async () => {
		const user = userEvent.setup()
		withBuiltinService()
		moved.matrix = new Pose(100, -250, 40).toMatrix4()

		render(MoveControls, { props: { entity, frameName: 'arm' } })
		await stageGoal()

		await user.click(screen.getByRole('button', { name: /preview move/i }))

		expect(preview.requestPreview).toHaveBeenCalled()
	})

	it('disables planning when the client is gone, not only when the service name is', async () => {
		withBuiltinService()
		moved.matrix = new Pose(100, -250, 40).toMatrix4()
		client.current = undefined

		render(MoveControls, { props: { entity, frameName: 'arm' } })
		await stageGoal()

		await waitFor(() => {
			expect(screen.getByRole('button', { name: /preview move/i })).toHaveAttribute(
				'aria-disabled',
				'true'
			)
		})
		expect(screen.getByRole('button', { name: /execute move/i })).toHaveAttribute(
			'aria-disabled',
			'true'
		)
	})

	it('offers to run the drawn plan only once there is one', () => {
		withBuiltinService()

		render(MoveControls, { props: { entity, frameName: 'arm' } })

		expect(screen.queryByRole('button', { name: /execute preview/i })).not.toBeInTheDocument()
		expect(screen.getByRole('button', { name: /execute move/i })).toBeInTheDocument()
	})

	describe('with a preview ready to execute', () => {
		const TRAJECTORY: TrajectoryStep[] = [{ arm: [0, 0.5] }, { arm: [0.1, 0.4] }]

		const renderReady = (frameName = 'arm') => {
			withBuiltinService()
			preview.status = 'ready'
			preview.trajectory = TRAJECTORY
			render(MoveControls, { props: { entity, frameName } })
		}

		const sentCommand = () => {
			const [command] = motionClient.doCommand.mock.calls[0] as unknown as [Record<string, unknown>]
			return command
		}

		it('relabels the planning action once a plan is on screen', () => {
			renderReady()

			expect(screen.getByRole('button', { name: /execute preview/i })).toBeInTheDocument()
			expect(screen.getByRole('button', { name: /re-plan & execute/i })).toBeInTheDocument()
		})

		it('sends the planned trajectory, not the frames the scrubber plays', async () => {
			const user = userEvent.setup()
			renderReady()

			await user.click(screen.getByRole('button', { name: /execute preview/i }))

			await waitFor(() => expect(motionClient.doCommand).toHaveBeenCalled())
			expect(sentCommand().execute).toEqual(TRAJECTORY)
		})

		// The key's presence is what arms RDK's start-state guard; without it epsilon is
		// `math.MaxFloat64` and a trajectory validated from one configuration runs from any other.
		it('arms the start-state check on the way out', async () => {
			const user = userEvent.setup()
			renderReady()

			await user.click(screen.getByRole('button', { name: /execute preview/i }))

			await waitFor(() => expect(motionClient.doCommand).toHaveBeenCalled())
			expect(sentCommand()).toHaveProperty('executeCheckStart')
		})

		it('will not let a second panel execute while the first move is still running', async () => {
			const user = userEvent.setup()

			let finish: (value: { execute: boolean }) => void = () => {}
			motionClient.doCommand.mockImplementationOnce(
				() => new Promise<{ execute: boolean }>((resolve) => (finish = resolve))
			)

			renderReady('arm')
			renderReady('gripper')

			const buttons = screen.getAllByRole('button', { name: /execute preview/i })
			expect(buttons).toHaveLength(2)

			await user.click(buttons[0]!)
			await waitFor(() => expect(motionClient.doCommand).toHaveBeenCalledTimes(1))

			await waitFor(() => expect(buttons[1]!).toHaveAttribute('aria-disabled', 'true'))
			await user.click(buttons[1]!)
			expect(motionClient.doCommand).toHaveBeenCalledTimes(1)

			finish({ execute: true })
		})

		it('drops the drawn plan when executing it fails', async () => {
			const user = userEvent.setup()
			renderReady()
			motionClient.doCommand.mockRejectedValueOnce(new Error('component stopped'))

			await user.click(screen.getByRole('button', { name: /execute preview/i }))

			await waitFor(() => expect(preview.clear).toHaveBeenCalled())
		})
	})
})
