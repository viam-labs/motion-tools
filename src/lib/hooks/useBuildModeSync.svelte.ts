import { MachineConnectionEvent } from '@viamrobotics/sdk'
import { useConnectionStatus } from '@viamrobotics/svelte-sdk'
import { getContext, setContext, tick } from 'svelte'

import { useEnvironment } from './useEnvironment.svelte'
import { useGeometries } from './useGeometries.svelte'
import { usePartID } from './usePartID.svelte'
import { useRefetchPoses } from './useRefetchPoses'

export const BUILD_MODE_SYNC_CONTEXT_KEY = Symbol('build-mode-sync')

interface Context {
	readonly syncing: boolean
	finish: () => void
}

export const createBuildModeSync = (environment: ReturnType<typeof useEnvironment>): Context => {
	let syncing = $state(environment.current.mode === 'build')
	let previousMode = environment.current.mode
	environment.setLive(environment.current.mode !== 'build' || syncing)

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

export const provideBuildModeSync = () => {
	const context = createBuildModeSync(useEnvironment())
	setContext<Context>(BUILD_MODE_SYNC_CONTEXT_KEY, context)
	return context
}

export const useBuildModeSync = () => getContext<Context>(BUILD_MODE_SYNC_CONTEXT_KEY)

/**
 * Takes a fresh live-machine snapshot before build mode becomes editable.
 * Must be called after the pose and geometry providers have been installed.
 */
export const coordinateBuildModeSync = () => {
	const partID = usePartID()
	const environment = useEnvironment()
	const buildModeSync = useBuildModeSync()
	const connectionStatus = useConnectionStatus(() => partID.current)
	const geometries = useGeometries()
	const { refetchPoses } = useRefetchPoses()

	$effect(() => {
		if (!buildModeSync.syncing || connectionStatus.current !== MachineConnectionEvent.CONNECTED) {
			return
		}

		let cancelled = false
		void (async () => {
			// Let frame/resource discovery register its per-resource queries first.
			await tick()
			await Promise.allSettled([refetchPoses(), geometries.refetch()])
			// Query observers and the ECS hierarchy update in reactive effects.
			await tick()
			if (!cancelled && environment.current.mode === 'build') {
				buildModeSync.finish()
			}
		})()

		return () => {
			cancelled = true
		}
	})
}
