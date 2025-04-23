import { getContext, setContext, untrack } from 'svelte'
import { useRobotClient, createRobotQuery, useMachineStatus } from '@viamrobotics/svelte-sdk'
import { copyPoseInFrame } from '$lib/transform'
import { usePoses } from './usePoses.svelte'
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
	const poses = usePoses()

	const machineStatus = useMachineStatus(partID)
	const revision = $derived(machineStatus.current?.config.revision)

	$effect(() => {
		revision
		untrack(() => query.current).refetch()
	})

	const current = $derived.by(() => {
		return (query.current.data ?? [])
			.map((config) => {
				const pose = copyPoseInFrame(config.frame?.poseInObserverFrame)
				return new WorldObject(config.frame?.referenceFrame, pose, config.frame?.physicalObject)
			})
			.sort((a, b) => (a.name > b.name ? 1 : -1))
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
