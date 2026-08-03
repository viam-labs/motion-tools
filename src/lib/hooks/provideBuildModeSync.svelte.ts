import { MachineConnectionEvent } from '@viamrobotics/sdk'
import { useConnectionStatus } from '@viamrobotics/svelte-sdk'
import { setContext, tick } from 'svelte'

import { BUILD_MODE_SYNC_CONTEXT_KEY, createBuildModeSync } from './useBuildModeSync.svelte'
import { useEnvironment } from './useEnvironment.svelte'
import { useGeometries } from './useGeometries.svelte'
import { usePartID } from './usePartID.svelte'
import { useRefetchPoses } from './useRefetchPoses'

/**
 * Provides build synchronization state and captures a fresh live-machine
 * snapshot before build mode becomes editable. Must be called after the pose
 * and geometry providers have been installed.
 */
export const provideBuildModeSync = () => {
	const partID = usePartID()
	const environment = useEnvironment()
	const context = createBuildModeSync(environment)
	const connectionStatus = useConnectionStatus(() => partID.current)
	const geometries = useGeometries()
	const { refetchPoses } = useRefetchPoses()

	setContext(BUILD_MODE_SYNC_CONTEXT_KEY, context)

	$effect(() => {
		if (!context.syncing || connectionStatus.current !== MachineConnectionEvent.CONNECTED) {
			return
		}

		let cancelled = false
		void (async () => {
			await tick()
			await Promise.allSettled([refetchPoses(), geometries.refetch()])
			await tick()
			if (!cancelled && environment.current.mode === 'build') context.finish()
		})()

		return () => {
			cancelled = true
		}
	})

	return context
}
