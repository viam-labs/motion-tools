import { getContext, setContext, untrack } from 'svelte'
import { useRobotClient, createRobotQuery, useMachineStatus } from '@viamrobotics/svelte-sdk'
import { WorldObject } from '$lib/WorldObject'
import { useRefreshRates } from './useRefreshRates.svelte'
import { observe } from '@threlte/core'
import { useLogs } from './useLogs.svelte'

interface FramesContext {
	current: WorldObject[]
	error?: Error
	fetching: boolean
}

const key = Symbol('frames-context')

export const provideFrames = (partID: () => string) => {
	const refreshRates = useRefreshRates()

	if (!refreshRates.has('Frames')) {
		refreshRates.set('Frames', 1)
	}

	const logs = useLogs()
	const client = useRobotClient(partID)
	const query = createRobotQuery(client, 'frameSystemConfig')
	const machineStatus = useMachineStatus(partID)
	const revision = $derived(machineStatus.current?.config.revision)
	const shouldFetch = $derived(refreshRates.get('Frames') === 1)

	observe.pre(
		() => [revision],
		() => {
			if (shouldFetch) {
				untrack(() => query.current).refetch()
				logs.add('Fetching frames...')
			}
		}
	)

	const current = $derived.by(() => {
		const objects: WorldObject[] = []

		if (!shouldFetch) {
			return objects
		}

		for (const { frame } of query.current.data ?? []) {
			if (frame) {
				objects.push(
					new WorldObject(
						frame.referenceFrame ? frame.referenceFrame : 'Unnamed frame',
						frame.poseInObserverFrame?.pose,
						frame.poseInObserverFrame?.referenceFrame,
						frame.physicalObject?.geometryType
					)
				)
			}
		}

		return objects
	})
	const error = $derived(query.current.error ?? undefined)
	const fetching = $derived(query.current.isFetching)

	setContext<FramesContext>(key, {
		get current() {
			return current
		},
		get error() {
			return error
		},
		get fetching() {
			return fetching
		},
	})
}

export const useFrames = (): FramesContext => {
	return getContext<FramesContext>(key)
}
