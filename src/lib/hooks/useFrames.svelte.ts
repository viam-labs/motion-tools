import { getContext, setContext, untrack } from 'svelte'
import {
	useRobotClient,
	createRobotQuery,
	useMachineStatus,
	useResourceNames,
} from '@viamrobotics/svelte-sdk'
import { WorldObject } from '$lib/WorldObject'
import { observe } from '@threlte/core'
import { useLogs } from './useLogs.svelte'
import { resourceColors } from '$lib/color'

interface FramesContext {
	current: WorldObject[]
	byName: Record<string, WorldObject | undefined>
	error?: Error
	fetching: boolean
}

const key = Symbol('frames-context')

export const provideFrames = (partID: () => string) => {
	const resourceNames = useResourceNames(partID)
	const client = useRobotClient(partID)
	const machineStatus = useMachineStatus(partID)
	const logs = useLogs()
	const query = createRobotQuery(client, 'frameSystemConfig')
	const revision = $derived(machineStatus.current?.config.revision)

	observe.pre(
		() => [revision],
		() => {
			untrack(() => query.current).refetch()
			logs.add('Fetching frames...')
		}
	)

	const current = $derived.by(() => {
		const objects: WorldObject[] = []

		for (const { frame } of query.current.data ?? []) {
			if (frame === undefined) {
				continue
			}

			const resourceName = resourceNames.current.find((item) => item.name === frame.referenceFrame)

			console.log(frame.physicalObject)
			objects.push(
				new WorldObject(
					frame.referenceFrame ? frame.referenceFrame : 'Unnamed frame',
					frame.poseInObserverFrame?.pose,
					frame.poseInObserverFrame?.referenceFrame,
					frame.physicalObject?.geometryType,
					resourceName
						? {
								color: resourceColors[resourceName.subtype as keyof typeof resourceColors],
							}
						: undefined
				)
			)
		}

		return objects
	})
	const error = $derived(query.current.error ?? undefined)
	const fetching = $derived(query.current.isFetching)

	const byName = $derived(Object.fromEntries(current.map((value) => [value.name, value])))

	setContext<FramesContext>(key, {
		get current() {
			return current
		},
		get byName() {
			return byName
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
