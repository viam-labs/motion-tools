import { getContext } from 'svelte'

import { useEnvironment } from './useEnvironment.svelte'

export const BUILD_MODE_SYNC_CONTEXT_KEY = Symbol('build-mode-sync')

interface Context {
	readonly syncing: boolean
	finish: () => void
}

export const createBuildModeSync = (environment: ReturnType<typeof useEnvironment>): Context => {
	let syncing = $state(environment.current.mode === 'build')
	let previousMode = environment.current.mode
	// Live data stays enabled until the initial build snapshot is finished.
	environment.setLive(true)

	$effect(() => {
		const mode = environment.current.mode
		if (mode === 'build' && previousMode !== 'build') {
			syncing = true
			environment.setLive(true)
		}
		if (mode !== 'build') {
			syncing = false
			environment.setLive(true)
		}
		previousMode = mode
	})

	return {
		get syncing() {
			return syncing
		},
		finish() {
			syncing = false
			if (environment.current.mode === 'build') environment.setLive(false)
		},
	}
}

export const useBuildModeSync = () => getContext<Context>(BUILD_MODE_SYNC_CONTEXT_KEY)
