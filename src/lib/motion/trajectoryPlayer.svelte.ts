/**
 * Playback state for anything indexed by a discrete trajectory step. At this rung the only
 * consumer is the motion plan replayer, scrubbing a dropped plan; it is factored out of the
 * replayer rather than kept as its state so a later consumer indexed the same way — a move panel
 * scrubbing a preview it planned, say — can reuse it instead of reimplementing it.
 *
 * A factory rather than a singleton, because more than one could need to be live at once once such
 * a consumer exists. The consumer keeps the steps themselves; this only decides which index is
 * current and when it advances, then reports it through `onStep`.
 */

export interface TrajectoryPlayerOptions {
	/** Read live rather than passed by value: the step count changes as plans load and unload. */
	totalSteps: () => number
	/**
	 * Called with every index this player moves to, including the ones playback walks through.
	 *
	 * Return `false` to refuse: `currentStep` stays where it was, so a scrubber reading it can never
	 * run ahead of what is actually on screen. Playback stops on a refusal rather than retrying the
	 * same index at the same pace forever.
	 */
	onStep: (step: number) => boolean | void
	/**
	 * Milliseconds per frame. Read live rather than passed by value so a caller can hold playback to
	 * a fixed wall-clock duration as its frame count changes — trajectory steps carry no duration of
	 * their own, so the pace is the caller's to choose.
	 */
	intervalMs?: () => number
}

export interface TrajectoryPlayer {
	readonly currentStep: number
	readonly totalSteps: number
	readonly lastStep: number
	readonly isPlaying: boolean
	readonly atEnd: boolean
	play: () => void
	pause: () => void
	/** Play, rewinding first when parked at the end so the button never looks inert. */
	toggle: () => void
	/** Pause, then move to `step` clamped into range. */
	seek: (step: number) => void
	/** Pause, then move by `delta` steps clamped into range. */
	stepBy: (delta: number) => void
	/**
	 * Pause and return to step 0 *without* calling `onStep` — for a consumer that is loading new
	 * steps and will render index 0 itself as part of that load.
	 */
	reset: () => void
}

const DEFAULT_INTERVAL_MS = 100

/**
 * Must be called where `$effect` is legal: during component initialization, or inside an
 * `$effect.root` that the caller disposes. The timer lives in an effect, so calling this from a
 * click handler, from module scope, or after an `await` throws `effect_orphan` rather than
 * returning a player that quietly never advances. A move panel that builds one per preview
 * therefore builds it up front and re-points it at new steps, rather than building one per plan.
 */
export const createTrajectoryPlayer = ({
	totalSteps,
	onStep,
	intervalMs = () => DEFAULT_INTERVAL_MS,
}: TrajectoryPlayerOptions): TrajectoryPlayer => {
	let currentStep = $state(0)
	let isPlaying = $state(false)

	const total = $derived(totalSteps())
	const lastStep = $derived(Math.max(0, total - 1))
	const atEnd = $derived(currentStep >= lastStep)

	/** Reports whether the move happened, which is what tells playback to stop. */
	const moveTo = (step: number): boolean => {
		if (total <= 0) return false
		// Guards what the clamp below does not: `Math.min`/`Math.max` pass NaN straight through (any
		// comparison against NaN is false), and a fraction clamps to a fraction. Both reach here from
		// public API (`setStep`, `player.seek`/`stepBy` off the context) even though nothing in this
		// repo's own UI ever produces one — a range input's `value` is always an integer string.
		if (!Number.isFinite(step)) return false
		const next = Math.max(0, Math.min(lastStep, Math.trunc(step)))

		// Committed after the render, not before: the index is the answer to "what is on screen", so
		// a consumer that could not draw this step leaves it pointing at the one that is.
		if (onStep(next) === false) return false
		currentStep = next
		return true
	}

	const pause = () => {
		isPlaying = false
	}

	const play = () => {
		if (total <= 0) return
		isPlaying = true
	}

	// The interval reads `currentStep` from a plain closure, so the effect subscribes to `isPlaying`
	// and the pace alone — the timer survives a whole run instead of being torn down once per step,
	// and restarts only when the caller re-paces it.
	$effect(() => {
		if (!isPlaying) return
		const pace = intervalMs()

		const intervalId = setInterval(() => {
			// `pause()` alone only takes the timer down once this effect re-runs, so parking clears the
			// interval directly and the refusal takes effect on the tick that produced it. In a browser
			// that gap is usually invisible, because Svelte flushes effects in a microtask and the
			// microtask checkpoint drains before the next timer callback. This does not lean on that:
			// nothing about `setInterval` promises a checkpoint between callbacks, and under fake timers
			// there is none, so without the `clearInterval` the same refused index is re-attempted
			// several times against a scene that by definition cannot change.
			const park = () => {
				pause()
				clearInterval(intervalId)
			}

			if (currentStep >= lastStep) {
				park()
				return
			}
			if (!moveTo(currentStep + 1)) park()
		}, pace)

		return () => clearInterval(intervalId)
	})

	// Unloading the steps out from under a running player would otherwise leave it playing an
	// empty range. This writes state from an effect, which the project rule reserves for side
	// effects rather than derivation, and that is what this is: `isPlaying` and `currentStep` have
	// independent writers and neither can be `$derived`. It is currently unreachable through the
	// replayer, whose four paths to zero steps all call `reset()` first — so today this is a safety
	// net, not a load-bearing path. It stays because nothing guarantees every future consumer will
	// call `reset()` before swapping its step source out from under a live player, and the failure
	// mode if one does not (a playing timer walking an empty range) is worse than a redundant guard.
	$effect(() => {
		if (total > 0) return
		isPlaying = false
		currentStep = 0
	})

	return {
		get currentStep() {
			return currentStep
		},
		get totalSteps() {
			return total
		},
		get lastStep() {
			return lastStep
		},
		get isPlaying() {
			return isPlaying
		},
		get atEnd() {
			return atEnd
		},
		play,
		pause,
		toggle: () => {
			if (isPlaying) {
				pause()
				return
			}
			if (atEnd) moveTo(0)
			play()
		},
		seek: (step: number) => {
			pause()
			moveTo(step)
		},
		stepBy: (delta: number) => {
			pause()
			moveTo(currentStep + delta)
		},
		reset: () => {
			isPlaying = false
			currentStep = 0
		},
	}
}
