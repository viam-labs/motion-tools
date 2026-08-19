import { beforeEach, describe, expect, it } from 'vitest'

import { createEnvironment, ENVIRONMENT_MODE_STORAGE_KEY } from '$lib/hooks/useEnvironment.svelte'

describe('createEnvironment mode availability', () => {
	beforeEach(() => {
		localStorage.removeItem(ENVIRONMENT_MODE_STORAGE_KEY)
	})

	it('offers only monitor until a plugin contributes a mode', () => {
		const environment = createEnvironment()

		expect(environment.availableModes).toEqual(['monitor'])
		expect(environment.current.mode).toBe('monitor')
	})

	it.each(['build', 'move'] as const)(
		'resolves a persisted %s mode back to monitor when nothing contributes it',
		(mode) => {
			localStorage.setItem(ENVIRONMENT_MODE_STORAGE_KEY, JSON.stringify(mode))

			const environment = createEnvironment()

			expect(environment.current.mode).toBe('monitor')
			expect(environment.availableModes).toEqual(['monitor'])
		}
	)

	it('keeps live data on when a stale build mode is unreachable', () => {
		localStorage.setItem(ENVIRONMENT_MODE_STORAGE_KEY, JSON.stringify('build'))

		// Build mode pauses live queries, so an unreachable stored `build` must not
		// leave an embedded host with an empty scene and no way to recover.
		expect(createEnvironment().isLive).toBe(true)
	})

	it('restores a persisted mode once its plugin registers it', () => {
		localStorage.setItem(ENVIRONMENT_MODE_STORAGE_KEY, JSON.stringify('build'))

		const environment = createEnvironment()
		expect(environment.current.mode).toBe('monitor')

		environment.registerMode('build')

		expect(environment.current.mode).toBe('build')
		expect(environment.availableModes).toEqual(['monitor', 'build'])
	})

	it('pauses live queries only while build mode is active', () => {
		const environment = createEnvironment()
		environment.registerMode('build')

		environment.current.mode = 'build'
		expect(environment.isLive).toBe(false)

		environment.current.mode = 'monitor'
		expect(environment.isLive).toBe(true)
	})

	it('does not pause live queries when setting a mode nothing contributes', () => {
		const environment = createEnvironment()

		environment.current.mode = 'build'

		expect(environment.current.mode).toBe('monitor')
		expect(environment.isLive).toBe(true)
	})

	it('reports modes in declaration order, not registration order', () => {
		const environment = createEnvironment()

		environment.registerMode('move')
		environment.registerMode('build')

		expect(environment.availableModes).toEqual(['monitor', 'build', 'move'])
	})

	it('falls back to monitor when the active mode is released', () => {
		const environment = createEnvironment()
		const release = environment.registerMode('build')
		environment.current.mode = 'build'

		release()

		expect(environment.current.mode).toBe('monitor')
		// The choice is remembered, so remounting the plugin returns to build mode.
		environment.registerMode('build')
		expect(environment.current.mode).toBe('build')
	})

	it('keeps a mode available until every contributor releases it', () => {
		const environment = createEnvironment()
		const releaseFirst = environment.registerMode('build')
		const releaseSecond = environment.registerMode('build')
		environment.current.mode = 'build'

		// A remount can mount the replacement before unmounting the original.
		releaseFirst()
		expect(environment.current.mode).toBe('build')

		releaseSecond()
		expect(environment.current.mode).toBe('monitor')
	})

	it('ignores a release called more than once', () => {
		const environment = createEnvironment()
		const release = environment.registerMode('build')
		environment.registerMode('build')

		release()
		release()

		expect(environment.availableModes).toContain('build')
	})
})
