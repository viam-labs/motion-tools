import type { FlushScheduler, FlushSchedulerDeps } from './pendingTransformChanges'

/**
 * Schedules `deps.flush()` on the next visible frame, or on a hidden-tab timer when
 * `requestAnimationFrame` is paused. Takes no DOM access itself; the hook supplies
 * `isVisible` and the browser functions so this module stays testable with fakes.
 */
export const createFlushScheduler = (deps: FlushSchedulerDeps): FlushScheduler => {
	let frameHandle: number | undefined
	let timerHandle: number | undefined

	const run = (): void => {
		frameHandle = undefined
		timerHandle = undefined
		deps.flush()
	}

	const request = (): void => {
		if (frameHandle !== undefined || timerHandle !== undefined) return

		if (deps.isVisible()) {
			frameHandle = deps.requestFrame(run)
		} else {
			timerHandle = deps.setTimer(run, deps.hiddenIntervalMs)
		}
	}

	const cancel = (): void => {
		if (frameHandle !== undefined) {
			deps.cancelFrame(frameHandle)
			frameHandle = undefined
		}
		if (timerHandle !== undefined) {
			deps.clearTimer(timerHandle)
			timerHandle = undefined
		}
	}

	return { request, cancel }
}
