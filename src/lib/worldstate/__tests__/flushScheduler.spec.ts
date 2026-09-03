import { describe, expect, it, vi } from 'vitest'

import type { FlushSchedulerDeps } from '../pendingTransformChanges'

import { createFlushScheduler } from '../flushScheduler'

const HIDDEN_INTERVAL_MS = 250

const makeDeps = (overrides: Partial<FlushSchedulerDeps> = {}): FlushSchedulerDeps => ({
	flush: vi.fn(),
	isVisible: () => true,
	requestFrame: vi.fn(() => 1),
	cancelFrame: vi.fn(),
	setTimer: vi.fn(() => 1),
	clearTimer: vi.fn(),
	hiddenIntervalMs: HIDDEN_INTERVAL_MS,
	...overrides,
})

describe('createFlushScheduler', () => {
	it('schedules a single frame when request is called twice before it runs', () => {
		const deps = makeDeps()
		const scheduler = createFlushScheduler(deps)

		scheduler.request()
		scheduler.request()

		expect(deps.requestFrame).toHaveBeenCalledTimes(1)
	})

	it('uses the hidden-interval timer instead of a frame while the tab is not visible', () => {
		const deps = makeDeps({ isVisible: () => false })
		const scheduler = createFlushScheduler(deps)

		scheduler.request()

		expect(deps.setTimer).toHaveBeenCalledWith(expect.any(Function), HIDDEN_INTERVAL_MS)
		expect(deps.requestFrame).not.toHaveBeenCalled()
	})

	it('calls flush once when the scheduled callback runs, and re-arms a frame for a request made inside flush', () => {
		let scheduledCallback: (() => void) | undefined
		const requestFrame = vi.fn((callback: () => void) => {
			scheduledCallback = callback
			return 1
		})
		const flush = vi.fn(() => {
			scheduler.request()
		})
		const scheduler = createFlushScheduler(makeDeps({ requestFrame, flush }))

		scheduler.request()
		scheduledCallback?.()

		expect(flush).toHaveBeenCalledTimes(1)
		expect(requestFrame).toHaveBeenCalledTimes(2)
	})

	it('cancels the pending frame handle that request issued', () => {
		const deps = makeDeps({ requestFrame: vi.fn(() => 42) })
		const scheduler = createFlushScheduler(deps)

		scheduler.request()
		scheduler.cancel()

		expect(deps.cancelFrame).toHaveBeenCalledWith(42)
	})

	it('cancels the pending timer handle that request issued while hidden', () => {
		const deps = makeDeps({ isVisible: () => false, setTimer: vi.fn(() => 7) })
		const scheduler = createFlushScheduler(deps)

		scheduler.request()
		scheduler.cancel()

		expect(deps.clearTimer).toHaveBeenCalledWith(7)
	})

	it('schedules again after a cancel', () => {
		const deps = makeDeps()
		const scheduler = createFlushScheduler(deps)

		scheduler.request()
		scheduler.cancel()
		scheduler.request()

		expect(deps.requestFrame).toHaveBeenCalledTimes(2)
	})
})
