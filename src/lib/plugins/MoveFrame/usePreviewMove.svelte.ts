/**
 * Ties the three halves of a move preview together: ask the builtin motion service to plan without
 * executing, reconstruct enough kinematics to draw the answer, and hand a scrubber something to
 * drive.
 *
 * One instance per open move panel — move mode renders a panel per selected frame, and each plans
 * its own frame independently.
 */

import type { MotionClient } from '@viamrobotics/sdk'
import type { World } from 'koota'

import { untrack } from 'svelte'

import type { FramesContext } from '$lib/hooks/useFrames.svelte'
import type { Pose } from '$lib/math'
import type { ForwardKinematics } from '$lib/motion/descriptorWorldMatrices'
import type { FrameDescriptor } from '$lib/motion/frameDescriptors'
import type { TrajectoryPlayer } from '$lib/motion/trajectoryPlayer.svelte'

import { createForwardKinematics } from '$lib/motion/descriptorWorldMatrices'
import { buildFrameDescriptors } from '$lib/motion/frameDescriptors'
import { frameSystemToPlanFrames } from '$lib/motion/frameSystemToPlanFrames'
import { waypointFrames } from '$lib/motion/interpolateTrajectory'
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
 * `already-at-goal` is deliberately not `error`. RDK answered successfully; the trajectory it
 * returned is the start configuration written twice, which is the correct answer to "how do I get
 * somewhere I already am". Reporting it in red under `role="alert"` told the user something had gone
 * wrong when nothing had.
 */
export type PreviewStatus = 'idle' | 'planning' | 'ready' | 'already-at-goal' | 'error'

/**
 * How long a preview takes to play, whatever it is made of. Pacing to a duration rather than to a
 * frame rate keeps a two-waypoint plan and a two-hundred-waypoint one comparable, where a fixed
 * per-frame interval would race through the first and crawl through the second.
 *
 * It is also the honest unit here. A trajectory carries no timing, so no frame rate is more correct
 * than another — but "the whole move takes about this long" is at least a consistent claim.
 */
const PREVIEW_DURATION_MS = 4000

/** Faster than this is wasted on a display. Very dense plans run longer than the target instead. */
const MIN_FRAME_MS = 16

export interface PreviewMoveOptions {
	/**
	 * Passed in rather than read off Svelte context here, so the caller owns where they come from.
	 * The panel hands over `useWorld()` and `useFrames()`; a test hands over a bare world and a
	 * fixed frame system, and needs no component to do it.
	 */
	world: World
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
	 * Anything whose identity changes when the goal does. A plan describes one goal, so a new goal
	 * discards it rather than leaving a stale ghost on screen.
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
	/**
	 * The trajectory exactly as planned, for handing back to `execute` — never the smoothed frames
	 * the scrubber plays. Empty unless `status` is `ready`.
	 */
	readonly trajectory: TrajectoryStep[]
	/** How many waypoints the planner actually returned, whatever is being played. */
	readonly plannedSteps: number
	readonly player: TrajectoryPlayer
	/** Plans and renders. Resolves once the ghosts are on screen; never rejects. */
	requestPreview: () => Promise<void>
	clear: () => void
}

export const usePreviewMove = ({
	world,
	frames,
	client,
	service,
	frameName,
	destination,
	moveOptions,
	invalidateOn,
}: PreviewMoveOptions): PreviewMove => {
	let status = $state<PreviewStatus>('idle')
	let message = $state<string>()
	// Raw: both are large arrays of plain numbers, replaced wholesale, and nothing reads into them
	// reactively — only `playbackFrames.length`, through the player.
	//
	// Two arrays rather than one because they answer different questions. `trajectory` is what the
	// planner said and what `execute` must receive; `playbackFrames` is what the scrubber walks. They
	// hold the same steps today, and keeping them apart is what lets playback be reframed later
	// without any chance of the reframed version reaching the robot.
	let trajectory = $state.raw<TrajectoryStep[]>([])
	let playbackFrames = $state.raw<TrajectoryStep[]>([])

	// Playback covers `playbackFrames.length - 1` transitions, so that is what the duration divides.
	const frameIntervalMs = $derived(
		Math.max(MIN_FRAME_MS, PREVIEW_DURATION_MS / Math.max(1, playbackFrames.length - 1))
	)

	// Outside `$state` — koota entities and Three.js matrices, neither of which wants a deep proxy.
	// `const`: this map is the only handle the teardown below has, and `spawnPreviewGhosts` fills it
	// in place precisely so that stays true across an await.
	const ghosts: PreviewGhosts = createPreviewGhosts()
	let forwardKinematics: ForwardKinematics | undefined

	/**
	 * Which request the state on screen belongs to. Bumped by every reset, so a plan that resolves
	 * after the goal moved can tell that its answer is for a question nobody is asking any more.
	 */
	let generation = 0
	let inFlight: AbortController | undefined

	/** Reports whether the step was drawn; see `TrajectoryPlayerOptions.onStep`. */
	const renderStep = (step: number): boolean => {
		const inputs = playbackFrames[step]
		if (!inputs || !forwardKinematics) return false
		applyPreviewStep(ghosts, forwardKinematics(inputs))
		return true
	}

	/** Build the played frames from the plan. The plan itself is untouched. */
	const applyPlayback = (planned: TrajectoryStep[]) => {
		playbackFrames = waypointFrames(planned).steps
	}

	const player = createTrajectoryPlayer({
		totalSteps: () => playbackFrames.length,
		onStep: renderStep,
		intervalMs: () => frameIntervalMs,
	})

	/**
	 * Drop everything a preview owns. The three callers differ only in the `status` and `message` they
	 * leave behind, and each used to spell this list out — which is how `partialWaypoint` came to be
	 * cleared in two of them and not the third.
	 */
	const resetPreview = () => {
		// Cancelled, not merely ignored: without this the request runs to completion on the machine
		// and its reply is thrown away, and `generation` alone would let a resolved promise write
		// over a preview the user has since replaced.
		generation += 1
		inFlight?.abort()
		inFlight = undefined

		clearPreviewGhosts(ghosts)
		forwardKinematics = undefined
		trajectory = []
		playbackFrames = []
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
		if (!motion || !serviceName || !goal) return

		// The reply lands in `trajectory`, and the ghosts are rebuilt from it — so drop the old
		// preview up front rather than leaving two plans' worth of ghosts on screen if this throws.
		resetPreview()
		message = undefined
		status = 'planning'

		const attempt = new AbortController()
		inFlight = attempt
		const mine = generation

		try {
			const { worldState, constraints } = moveOptions()
			// Read with the rest of the inputs rather than after the await. `useFrames` refetches
			// whenever the machine's config revision changes, so the frame system can be replaced while
			// the plan is in flight — and drawing that plan through kinematics it was not computed
			// against puts the whole ghost chain somewhere the machine never was.
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

			// Everything below writes the state the panel arms `Execute preview` from, so it must not
			// run for a plan the user has moved on from. `clear()` cannot reach into an awaited
			// promise, and it leaves `status` at `idle` — so without this check the panel would go
			// from reporting nothing pending to offering to execute a plan for the abandoned goal.
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

			forwardKinematics = createForwardKinematics(descriptors)
			// The trajectory decides which frames earn a ghost, not just where they go: RDK returns a
			// column for every component, so the ones it holds still have to be told apart from the ones
			// it moves.
			spawnPreviewGhosts(world, descriptors, result.trajectory, ghosts)

			// Descriptors are not ghosts: joints and geometry-less mounts make up most of them, and a
			// frame system whose shapes all failed to decode still produces plenty. Reporting `ready`
			// on that gives a working scrubber and an armed `Execute preview` over an empty scene.
			if (ghosts.size === 0) {
				fail('No geometry in the frame system to draw this plan with.')
				return
			}

			trajectory = result.trajectory
			applyPlayback(result.trajectory)
			status = 'ready'
			renderStep(0)
		} catch (error_) {
			// An abandoned request's failure is not the user's problem, and an aborted one reports a
			// cancellation they did not ask about.
			if (mine !== generation) return
			fail(error_ instanceof Error ? error_.message : `Failed to plan a move for "${frameName()}".`)
		}
	}

	// A staged goal that moves invalidates the plan drawn for the previous one. `untrack` so
	// clearing state this effect does not read cannot re-enter it.
	$effect(() => {
		invalidateOn()
		untrack(() => {
			if (status !== 'idle') clear()
		})
	})

	// `$effect` cleanup rather than `onDestroy`, matching `useMoveGhosts`: it is the same teardown,
	// and it does not need a component around it — which is what lets a spec drive this hook.
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
