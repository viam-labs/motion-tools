import type { MotionClient } from '@viamrobotics/sdk'

import { untrack } from 'svelte'

import type { FramesContext } from '$lib/hooks/useFrames.svelte'
import type { Pose } from '$lib/math'
import type { FrameDescriptor } from '$lib/motion/frameDescriptors'
import type { TrajectoryPlayer } from '$lib/motion/trajectoryPlayer.svelte'

import { useWorld } from '$lib/ecs'
import { buildFrameDescriptors } from '$lib/motion/frameDescriptors'
import { frameSystemToPlanFrames } from '$lib/motion/frameSystemToPlanFrames'
import { createTrajectoryPlayer } from '$lib/motion/trajectoryPlayer.svelte'

import type { MoveOptions } from './parseMoveOptions'
import type { TrajectoryStep } from './planDoCommand'

import { isAlreadyAtGoal, parsePlanResult, planCommand } from './planDoCommand'
import {
	applyPreviewStep,
	clearPreviewGhosts,
	createPreviewGhosts,
	type PreviewGhosts,
	spawnPreviewGhosts,
} from './previewGhosts'

/**
 * `already-at-goal` is not `error`: RDK answered, and the trajectory it returned is the start
 * configuration written twice, the correct answer to "how do I get somewhere I already am".
 */
export type PreviewStatus = 'idle' | 'planning' | 'ready' | 'already-at-goal' | 'error'

/**
 * How long a preview takes to play, whatever it is made of. Pacing to a duration rather than a
 * frame rate keeps a two-waypoint plan and a two-hundred-waypoint one comparable.
 */
const PREVIEW_DURATION_MS = 4000

/** Faster than this is wasted on a display. Very dense plans run longer than the target instead. */
const MIN_FRAME_MS = 16

export interface PreviewMoveOptions {
	frames: FramesContext
	client: () => MotionClient | undefined
	/** The motion service's resource name; the request names it, and only builtin answers. */
	service: () => string | undefined
	frameName: () => string
	/** The staged goal, or `undefined` while the gizmo still tracks the frame. */
	destination: () => { referenceFrame: string; pose: Pose } | undefined
	/**
	 * The same world state and constraints `executeMove` sends, so the preview plans the problem
	 * that would actually be executed. May throw on malformed JSON — read inside the request.
	 */
	moveOptions: () => MoveOptions
	/**
	 * Every input the plan was computed from, not just the goal: world state, constraints, service.
	 * A change to any discards the plan rather than leaving a stale answer on screen.
	 */
	invalidateOn: () => unknown
}

export interface PreviewMove {
	readonly status: PreviewStatus
	/**
	 * Why there is nothing to play, for whichever of `error` and `already-at-goal` we are in.
	 * `status` says how to present it; this says what happened.
	 */
	readonly message: string | undefined
	/** The trajectory exactly as planned. Empty unless `status` is `ready`. */
	readonly trajectory: TrajectoryStep[]
	/** How many waypoints the planner returned. */
	readonly plannedSteps: number
	readonly player: TrajectoryPlayer
	/** Plans. Resolves once the answer is in hand; never rejects. */
	requestPreview: () => Promise<void>
	clear: () => void
}

/**
 * Ask the builtin motion service to plan a move without executing it, draw the answer, and drive a
 * scrubber with it. One instance per open move panel.
 */
export const usePreviewMove = ({
	frames,
	client,
	service,
	frameName,
	destination,
	moveOptions,
	invalidateOn,
}: PreviewMoveOptions): PreviewMove => {
	const world = useWorld()

	let status = $state<PreviewStatus>('idle')
	let message = $state<string>()
	// Raw: replaced wholesale rather than mutated, so the deep proxy would go unused.
	let trajectory = $state.raw<TrajectoryStep[]>([])

	// Outside `$state`: koota entities and Three.js matrices want no deep proxy. `const` because
	// `spawnPreviewGhosts` fills it in place, keeping it the only handle teardown has across an await.
	const ghosts: PreviewGhosts = createPreviewGhosts()

	// Playback covers `trajectory.length - 1` transitions, so that is what the duration divides.
	const frameIntervalMs = $derived(
		Math.max(MIN_FRAME_MS, PREVIEW_DURATION_MS / Math.max(1, trajectory.length - 1))
	)

	/**
	 * Which request the state on screen belongs to. Bumped by every reset, so a plan that resolves
	 * after the goal moved can tell that its answer is for a question nobody is asking any more.
	 */
	let generation = 0
	let inFlight: AbortController | undefined

	/** Reports whether the step was drawn; see `TrajectoryPlayerOptions.onStep`. */
	const renderStep = (step: number): boolean => {
		const inputs = trajectory[step]
		if (!inputs) return false
		applyPreviewStep(ghosts, inputs)
		return true
	}

	const player = createTrajectoryPlayer({
		totalSteps: () => trajectory.length,
		onStep: renderStep,
		intervalMs: () => frameIntervalMs,
	})

	/**
	 * Drop everything a preview owns. The three callers (`clear`, `settle`, and the top of
	 * `requestPreview`) differ only in the `status` and `message` they leave behind.
	 */
	const resetPreview = () => {
		// Cancelled, not merely ignored: otherwise the request runs to completion on the machine, and
		// `generation` alone would let a resolved promise write over a preview the user has replaced.
		generation += 1
		inFlight?.abort()
		inFlight = undefined

		clearPreviewGhosts(ghosts)
		trajectory = []
		player.reset()
	}

	const clear = () => {
		resetPreview()
		message = undefined
		status = 'idle'
	}

	/** Drop the preview and say why. `status` is what decides how the panel presents it. */
	const settle = (next: 'already-at-goal' | 'error', reason: string) => {
		resetPreview()
		message = reason
		status = next
	}

	const fail = (reason: string) => settle('error', reason)

	const requestPreview = async () => {
		const motion = client()
		const serviceName = service()
		const goal = destination()
		// Leaves `status` where it was rather than routing through `fail()`: nothing failed, the caller
		// is missing a client, a service or a goal, and is relied on to gate the action on all three.
		if (!motion || !serviceName || !goal) return

		// The reply lands in `trajectory`, so drop the old preview up front rather than leaving a stale
		// plan on screen if this throws.
		resetPreview()
		message = undefined
		status = 'planning'

		const attempt = new AbortController()
		inFlight = attempt
		const mine = generation

		try {
			const { worldState, constraints } = moveOptions()
			// Read with the rest of the inputs, not after the await: `useFrames` refetches on every
			// config revision, and kinematics the plan was not computed against misplace every twin.
			const parts = frames.parts
			const response = await motion.doCommand(
				planCommand({
					service: serviceName,
					componentName: frameName(),
					destination: goal,
					worldState,
					constraints,
				}),
				{ signal: attempt.signal }
			)

			// `clear()` cannot reach into an awaited promise, and it leaves `status` at `idle`, so
			// without this the panel would go from nothing pending to offering an abandoned goal.
			if (mine !== generation) return

			const result = parsePlanResult(response)
			if (isAlreadyAtGoal(result.trajectory)) {
				settle('already-at-goal', `"${frameName()}" is already at the target.`)
				return
			}

			// Built from `frameSystemConfig` rather than a plan dump: the `plan` reply carries joint
			// values only, and this is the only path a browser has to the kinematics behind them.
			const descriptors: FrameDescriptor[] = buildFrameDescriptors(frameSystemToPlanFrames(parts))
			if (descriptors.length === 0) {
				fail('No frame system available to draw the plan against.')
				return
			}

			// The trajectory decides which frames earn a twin, not just where they go: RDK returns a
			// column for every component, so the ones it holds still have to be told apart from the ones
			// it moves.
			spawnPreviewGhosts(world, descriptors, result.trajectory, ghosts)

			// Joints and geometry-less mounts make up most of a chain, so counting entities here would
			// arm the panel over a preview with nothing on screen.
			if (ghosts.drawn === 0) {
				fail('No geometry in the frame system to draw this plan with.')
				return
			}

			trajectory = result.trajectory
			status = 'ready'
		} catch (error_) {
			// An abandoned request's failure is not the user's problem, and an aborted one reports a
			// cancellation they did not ask about.
			if (mine !== generation) return
			fail(error_ instanceof Error ? error_.message : `Failed to plan a move for "${frameName()}".`)
		}
	}

	// A staged goal that moves invalidates the plan made for the previous one. `untrack` so clearing
	// state this effect does not read cannot re-enter it.
	$effect(() => {
		invalidateOn()
		untrack(() => {
			if (status !== 'idle') clear()
		})
	})

	// `$effect` cleanup rather than `onDestroy`: it is the same teardown, and it does not need a
	// component around it, which is what lets a spec drive this hook.
	$effect(() => () => {
		generation += 1
		inFlight?.abort()
		clearPreviewGhosts(ghosts)
	})

	return {
		get status() {
			return status
		},
		get message() {
			return message
		},
		get trajectory() {
			return trajectory
		},
		get plannedSteps() {
			return trajectory.length
		},
		player,
		requestPreview,
		clear,
	}
}
