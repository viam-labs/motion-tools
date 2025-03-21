import { useRobotClient } from '@viamrobotics/svelte-sdk'
import { Geometry, Pose } from '@viamrobotics/sdk'
import { createRobotQuery } from '@viamrobotics/svelte-sdk'
import { getContext, setContext, untrack } from 'svelte'

export interface Frame {
	name: string
	parent: string
	pose: Pose
	geometry: Geometry
}

interface Context {
	current: Frame[]
	error?: Error
	fetching: boolean
}

const key = Symbol('frames-context')

export const provideFrames = (partID: () => string) => {
	const client = useRobotClient(partID)
	const query = createRobotQuery(client, 'frameSystemConfig', { refetchInterval: 10_000 })

	$effect(() => {
		// eslint-disable-next-line @typescript-eslint/no-unused-expressions
		client.current
		untrack(() => query.current).refetch()
	})

	const current = $derived(
		(query.current.data ?? []).map((config) => {
			return {
				name: config.frame?.referenceFrame ?? '',
				parent: config.frame?.poseInObserverFrame?.referenceFrame ?? 'world',
				pose:
					config.frame?.poseInObserverFrame?.pose ??
					({ x: 0, y: 0, z: 0, oX: 0, oY: 0, oZ: 1, theta: 0 } satisfies Pose),
				geometry: config.frame?.physicalObject ?? new Geometry(),
			}
		})
	)
	const error = $derived(query.current.error ?? undefined)
	const fetching = $derived(query.current.isFetching)

	setContext<Context>(key, {
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

export const useFrames = () => {
	return getContext<Context>(key)
}
