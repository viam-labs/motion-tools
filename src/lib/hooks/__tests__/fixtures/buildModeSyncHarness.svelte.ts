import type { EnvironmentMode } from '../../useEnvironment.svelte'

import { createBuildModeSync } from '../../useBuildModeSync.svelte'
import { useEnvironment } from '../../useEnvironment.svelte'

export const createBuildModeSyncHarness = (initialMode: EnvironmentMode = 'monitor') => {
	let mode = $state(initialMode)
	let isLive = $state(initialMode !== 'build')

	const environment = {
		current: {
			get mode() {
				return mode
			},
			set mode(value: EnvironmentMode) {
				mode = value
			},
			isStandalone: true,
			inputBindingsEnabled: true,
		},
		get isLive() {
			return isLive
		},
		setLive(value: boolean) {
			isLive = value
		},
	} satisfies ReturnType<typeof useEnvironment>

	let buildModeSync!: ReturnType<typeof createBuildModeSync>
	const dispose = $effect.root(() => {
		buildModeSync = createBuildModeSync(environment)
	})

	return { buildModeSync, environment, dispose }
}
