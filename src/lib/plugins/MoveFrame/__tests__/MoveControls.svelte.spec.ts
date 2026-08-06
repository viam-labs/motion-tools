import type { ResourceName } from '@viamrobotics/sdk'
import type { Entity } from 'koota'

import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/svelte'
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

// A textarea in place of the CodeMirror editor behind an Expandable — see the fixture.
vi.mock('../MoveJsonField.svelte', async () => {
	const MockField = await import('./__fixtures__/MockMoveJsonField.svelte')
	return { default: MockField.default }
})

// The preview plans over the ECS and the frame system too. Drive its status from the test so the
// panel's two execute paths can be told apart without a motion service.
//
// `satisfies PreviewMove` so this stays a stand-in rather than drifting into its own shape: without
// it, a field added or removed on the real hook leaves the mock quietly wrong and the panel tested
// against an interface nothing implements.
const preview = vi.hoisted(() => ({
	status: 'idle' as PreviewStatus,
	// What `execute` must be handed. Distinct from the frames a scrubber plays, which the robot must
	// never be asked to run — see `usePreviewMove`'s two arrays.
	trajectory: [] as TrajectoryStep[],
	requestPreview: vi.fn(),
	clear: vi.fn(),
	// The options the panel wired up, so a test can ask what the preview was told to watch.
	options: undefined as PreviewMoveOptions | undefined,
}))
vi.mock('../usePreviewMove.svelte', () => ({
	usePreviewMove: (options: PreviewMoveOptions): PreviewMove => {
		preview.options = options

		return {
			get status() {
				return preview.status
			},
			message: undefined,
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

// The panel reads `parts` for the kinematics the ghosts are drawn through, and names it in the
// preview's invalidation key. A getter so a test can swap the frame system the way a refetch does.
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

// The motion client the panel posts `execute` to. Held out here so a test can read what was sent.
const motionClient = vi.hoisted(() => ({ doCommand: vi.fn(async () => ({ execute: true })) }))
// `createResourceClient` yields `undefined` for as long as the connection is not CONNECTED, while
// the resource *names* keep coming from cache. A getter so a test can drive the two apart.
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

	/**
	 * The plan is computed from the goal, the world state, the constraints and the motion service.
	 * With only the goal in the key, editing the world state to describe an obstacle the preview had
	 * just revealed changed nothing: the ghosts, the scrubber and `Execute preview` all survived,
	 * still describing a path planned as though the obstacle were not there — and `execute` runs a
	 * trajectory verbatim, with no replan.
	 */
	it('re-keys the preview when the world state changes, not only the goal', async () => {
		vi.mocked(useResourceNames).mockReturnValue({ current: [service('builtin')] } as never)

		render(MoveControls, { props: { entity, frameName: 'arm' } })

		const invalidateOn = preview.options?.invalidateOn
		if (!invalidateOn) throw new Error('expected the panel to configure a preview')
		const before = structuredClone(invalidateOn())

		await fireEvent.input(screen.getByLabelText('World state'), {
			target: { value: '{"obstacles":[]}' },
		})

		expect(invalidateOn()).not.toEqual(before)
	})

	/**
	 * Everything below is reachable only once the preview reports `ready`, which nothing turned
	 * before: the button, the relabel of its neighbour, and the whole of `executePreviewedMove`.
	 */
	describe('with a preview ready to execute', () => {
		const TRAJECTORY: TrajectoryStep[] = [{ arm: [0, 0.5] }, { arm: [0.1, 0.4] }]

		const renderReady = () => {
			vi.mocked(useResourceNames).mockReturnValue({ current: [service('builtin')] } as never)
			preview.status = 'ready'
			preview.trajectory = TRAJECTORY
			render(MoveControls, { props: { entity, frameName: 'arm' } })
		}

		it('offers to run the drawn plan only once there is one', () => {
			vi.mocked(useResourceNames).mockReturnValue({ current: [service('builtin')] } as never)
			render(MoveControls, { props: { entity, frameName: 'arm' } })

			expect(screen.queryByRole('button', { name: /execute preview/i })).not.toBeInTheDocument()
			expect(screen.getByRole('button', { name: /execute move/i })).toBeInTheDocument()
		})

		it('relabels the planning action once a plan is on screen', () => {
			renderReady()

			expect(screen.getByRole('button', { name: /execute preview/i })).toBeInTheDocument()
			expect(screen.getByRole('button', { name: /re-plan & execute/i })).toBeInTheDocument()
		})

		it('sends the planned trajectory, not the frames the scrubber plays', async () => {
			renderReady()

			await fireEvent.click(screen.getByRole('button', { name: /execute preview/i }))

			await waitFor(() => expect(motionClient.doCommand).toHaveBeenCalled())
			const [command] = motionClient.doCommand.mock.calls[0] as unknown as [Record<string, unknown>]
			expect(command.execute).toEqual(TRAJECTORY)
		})

		/**
		 * The key's presence is what arms RDK's start-state guard; without it epsilon is
		 * `math.MaxFloat64` and a trajectory validated from one configuration runs from any other.
		 * `execute` never replans, so nothing else would catch it.
		 */
		it('arms the start-state check on the way out', async () => {
			renderReady()

			await fireEvent.click(screen.getByRole('button', { name: /execute preview/i }))

			await waitFor(() => expect(motionClient.doCommand).toHaveBeenCalled())
			const [command] = motionClient.doCommand.mock.calls[0] as unknown as [Record<string, unknown>]
			expect(command).toHaveProperty('executeCheckStart')
		})

		/**
		 * `builtIn.Move` opens with `operation.CancelOtherWithLabel`, so two `client.move` calls
		 * arbitrate themselves inside RDK. `builtIn.DoCommand` does neither, so the `execute` this
		 * panel sends is mutually exclusive with nothing on the server — and move mode renders a panel
		 * per selected frame, with the execute buttons not gated on owning the gizmo. Select an arm and
		 * a gripper mounted on it and both panels can post a trajectory for the same arm at once.
		 */
		it('will not let a second panel execute while the first move is still running', async () => {
			vi.mocked(useResourceNames).mockReturnValue({ current: [service('builtin')] } as never)
			preview.status = 'ready'
			preview.trajectory = TRAJECTORY

			let finish: (value: { execute: boolean }) => void = () => {}
			motionClient.doCommand.mockImplementationOnce(
				() => new Promise<{ execute: boolean }>((resolve) => (finish = resolve))
			)

			render(MoveControls, { props: { entity, frameName: 'arm' } })
			render(MoveControls, { props: { entity, frameName: 'gripper' } })

			const buttons = screen.getAllByRole('button', { name: /execute preview/i })
			expect(buttons).toHaveLength(2)

			await fireEvent.click(buttons[0]!)
			await waitFor(() => expect(motionClient.doCommand).toHaveBeenCalledTimes(1))

			// The other panel reads as unavailable rather than merely doing nothing when pressed.
			await waitFor(() => expect(buttons[1]!).toHaveAttribute('aria-disabled', 'true'))
			await fireEvent.click(buttons[1]!)
			expect(motionClient.doCommand).toHaveBeenCalledTimes(1)

			finish({ execute: true })
		})

		/**
		 * A failed `execute` is not a move that never happened: RDK batches the waypoints to the
		 * component and can stop anywhere along them. Whatever configuration the machine is in
		 * afterwards, it is not the one the plan starts from — so leaving the drawing up, and
		 * `Execute preview` armed over it, offers to re-run a path from a state that no longer exists.
		 */
		it('drops the drawn plan when executing it fails', async () => {
			renderReady()
			motionClient.doCommand.mockRejectedValueOnce(new Error('component stopped'))

			await fireEvent.click(screen.getByRole('button', { name: /execute preview/i }))

			await waitFor(() => expect(preview.clear).toHaveBeenCalled())
		})
	})

	/**
	 * The input the key exists for, and the one nothing covered: the other cases all read
	 * `invalidateOn()` with nothing staged, so the goal was `undefined` before and after and dropping
	 * it from the array failed no test anywhere in the repo. Nothing else clears the preview when the
	 * gizmo moves — so without this the ghosts, the scrubber and an armed `Execute preview` all
	 * survive a new goal, still describing the old plan, which `execute` then runs verbatim.
	 */
	it('re-keys the preview when the goal itself moves', async () => {
		vi.mocked(useResourceNames).mockReturnValue({ current: [service('builtin')] } as never)
		moved.matrix = new Pose(100, -250, 40).toMatrix4()

		render(MoveControls, { props: { entity, frameName: 'arm' } })

		const invalidateOn = preview.options?.invalidateOn
		if (!invalidateOn) throw new Error('expected the panel to configure a preview')
		const before = structuredClone(invalidateOn())

		const position = await screen.findByLabelText('move target position')
		const x = position.querySelector('input')
		if (!x) throw new Error('expected a position field')
		await fireEvent.change(x, { target: { value: '500' } })

		expect(invalidateOn()).not.toEqual(before)
	})

	// The kinematics the ghosts are drawn through are as much an input as the goal: `useFrames`
	// refetches on every config revision, and a frame system that moved underneath a drawn plan puts
	// the whole chain somewhere the machine never was.
	it('re-keys the preview when the frame system is refetched', () => {
		vi.mocked(useResourceNames).mockReturnValue({ current: [service('builtin')] } as never)

		render(MoveControls, { props: { entity, frameName: 'arm' } })

		const invalidateOn = preview.options?.invalidateOn
		if (!invalidateOn) throw new Error('expected the panel to configure a preview')
		const before = structuredClone(invalidateOn())

		framesContext.parts = [{ frame: 'moved' }]

		expect(invalidateOn()).not.toEqual(before)
	})

	/**
	 * A resource name is not a client. Names come from cache with `staleTime: Infinity`, while
	 * `createResourceClient` yields `undefined` for as long as the connection is not CONNECTED — so on
	 * a dropped socket the service is set and the client is not. Gating on the name alone left the
	 * button lit, and clicking it did nothing at all: no spinner, no error, no state change.
	 */
	it('disables planning when the client is gone, not only when the service name is', async () => {
		vi.mocked(useResourceNames).mockReturnValue({ current: [service('builtin')] } as never)
		moved.matrix = new Pose(100, -250, 40).toMatrix4()
		client.current = undefined

		render(MoveControls, { props: { entity, frameName: 'arm' } })

		const position = await screen.findByLabelText('move target position')
		const x = position.querySelector('input')
		if (!x) throw new Error('expected a position field')
		await fireEvent.change(x, { target: { value: '500' } })

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

	it('re-keys the preview when the constraints change', async () => {
		vi.mocked(useResourceNames).mockReturnValue({ current: [service('builtin')] } as never)

		render(MoveControls, { props: { entity, frameName: 'arm' } })

		const invalidateOn = preview.options?.invalidateOn
		if (!invalidateOn) throw new Error('expected the panel to configure a preview')
		const before = structuredClone(invalidateOn())

		await fireEvent.input(screen.getByLabelText('Constraints'), {
			target: { value: '{"linearConstraint":[{}]}' },
		})

		expect(invalidateOn()).not.toEqual(before)
	})
})
