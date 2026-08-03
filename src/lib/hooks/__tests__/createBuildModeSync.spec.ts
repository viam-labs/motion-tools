import { flushSync } from 'svelte'
import { afterEach, describe, expect, it } from 'vitest'

import { createBuildModeSyncHarness } from './fixtures/buildModeSyncHarness.svelte'

describe('createBuildModeSync', () => {
	let dispose: (() => void) | undefined

	afterEach(() => dispose?.())

	it('starts idle and live outside build mode', () => {
		const harness = createBuildModeSyncHarness()
		dispose = harness.dispose

		expect(harness.buildModeSync.syncing).toBe(false)
		expect(harness.environment.isLive).toBe(true)
	})

	it('starts syncing and live when restored into build mode', () => {
		const harness = createBuildModeSyncHarness('build')
		dispose = harness.dispose

		expect(harness.buildModeSync.syncing).toBe(true)
		expect(harness.environment.isLive).toBe(true)

		harness.buildModeSync.finish()
		expect(harness.buildModeSync.syncing).toBe(false)
		expect(harness.environment.isLive).toBe(false)
	})

	it('restarts synchronization on every transition into build mode', () => {
		const harness = createBuildModeSyncHarness()
		dispose = harness.dispose

		harness.environment.current.mode = 'build'
		flushSync()
		expect(harness.buildModeSync.syncing).toBe(true)
		expect(harness.environment.isLive).toBe(true)

		harness.buildModeSync.finish()
		expect(harness.buildModeSync.syncing).toBe(false)
		expect(harness.environment.isLive).toBe(false)

		harness.environment.current.mode = 'monitor'
		flushSync()
		expect(harness.buildModeSync.syncing).toBe(false)
		expect(harness.environment.isLive).toBe(true)

		harness.environment.current.mode = 'build'
		flushSync()
		expect(harness.buildModeSync.syncing).toBe(true)
		expect(harness.environment.isLive).toBe(true)
	})
})
