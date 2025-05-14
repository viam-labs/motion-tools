import { getContext, setContext, untrack } from 'svelte'
import { useRobotClient, createRobotQuery, useMachineStatus } from '@viamrobotics/svelte-sdk'
import { WorldObject } from '$lib/WorldObject'

interface FramesContext {
	current: WorldObject[]
	error?: Error
	fetching: boolean
}

const key = Symbol('frames-context')

export const provideFrames = (partID: () => string) => {
	const client = useRobotClient(partID)
	const query = createRobotQuery(client, 'frameSystemConfig')

	const machineStatus = useMachineStatus(partID)
	const revision = $derived(machineStatus.current?.config.revision)

	$effect(() => {
		// eslint-disable-next-line @typescript-eslint/no-unused-expressions
		revision
		untrack(() => query.current).refetch()
	})

	const current = $derived.by(() => {
		const objects: WorldObject[] = []

		for (const { frame } of query.current.data ?? []) {
			if (frame) {
				objects.push(
					new WorldObject(
						frame.referenceFrame,
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
