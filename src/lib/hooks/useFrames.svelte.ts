import { useRobot } from '$lib/svelte-sdk'
import { createQuery } from '@tanstack/svelte-query'
import { Geometry, Pose } from '@viamrobotics/sdk'
import { getContext, setContext, untrack } from 'svelte'
import { fromStore } from 'svelte/store'

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

export const provideFrames = () => {
	const robot = useRobot()

	const query = fromStore(
		createQuery({
			queryKey: ['frame'],
			refetchInterval: 10_000,
			queryFn: async () => {
				if (robot.client === undefined) {
					return []
				}

				const response = await robot.client.robotService.frameSystemConfig({})

				return response?.frameSystemConfigs.map((config) => {
					return {
						name: config.frame?.referenceFrame ?? '',
						parent: config.frame?.poseInObserverFrame?.referenceFrame ?? 'world',
						pose: config.frame?.poseInObserverFrame?.pose ?? new Pose(),
						geometry: config.frame?.physicalObject ?? new Geometry(),
					}
				})
			},
		})
	)

	$effect(() => {
		robot.client
		untrack(() => query.current).refetch()
	})

	const current = $derived(query.current.data ?? [])
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
