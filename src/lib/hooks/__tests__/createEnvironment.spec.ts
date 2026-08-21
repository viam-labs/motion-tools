import { beforeEach, describe, expect, it } from 'vitest'

import { createEnvironment, ENVIRONMENT_MODE_STORAGE_KEY } from '$lib/hooks/useEnvironment.svelte'

describe('createEnvironment mode availability', () => {
	beforeEach(() => {
		localStorage.removeItem(ENVIRONMENT_MODE_STORAGE_KEY)
	})

	it('offers monitor and build until a plugin contributes more', () => {
		const environment = createEnvironment()

		expect(environment.availableModes).toEqual(['monitor', 'build'])
		expect(environment.current.mode).toBe('monitor')
	})

	it('resolves a persisted move mode back to monitor when nothing contributes it', () => {
		localStorage.setItem(ENVIRONMENT_MODE_STORAGE_KEY, JSON.stringify('move'))

		const environment = createEnvironment()

		expect(environment.current.mode).toBe('monitor')
		expect(environment.availableModes).toEqual(['monitor', 'build'])
	})

	it('restores a persisted move mode once its plugin registers it', () => {
		localStorage.setItem(ENVIRONMENT_MODE_STORAGE_KEY, JSON.stringify('move'))

		const environment = createEnvironment()
		expect(environment.current.mode).toBe('monitor')

		environment.registerMode('move')

		expect(environment.current.mode).toBe('move')
		expect(environment.availableModes).toEqual(['monitor', 'build', 'move'])
	})

	it('pauses live queries only while build mode is active', () => {
		const environment = createEnvironment()

		environment.current.mode = 'build'
		expect(environment.isLive).toBe(false)

		environment.current.mode = 'monitor'
		expect(environment.isLive).toBe(true)
	})

	it('falls back to monitor when the active mode is released', () => {
		const environment = createEnvironment()
		const release = environment.registerMode('move')
		environment.current.mode = 'move'

		release()

		expect(environment.current.mode).toBe('monitor')
		// The choice is remembered, so remounting the plugin returns to move mode.
		environment.registerMode('move')
		expect(environment.current.mode).toBe('move')
	})

	it('keeps a mode available until every contributor releases it', () => {
		const environment = createEnvironment()
		const releaseFirst = environment.registerMode('move')
		const releaseSecond = environment.registerMode('move')
		environment.current.mode = 'move'

		// A remount can mount the replacement before unmounting the original.
		releaseFirst()
		expect(environment.current.mode).toBe('move')

		releaseSecond()
		expect(environment.current.mode).toBe('monitor')
	})

	it('ignores a release called more than once', () => {
		const environment = createEnvironment()
		const release = environment.registerMode('move')
		environment.registerMode('move')

		release()
		release()

		expect(environment.availableModes).toContain('move')
	})
})
