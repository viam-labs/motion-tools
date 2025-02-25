import { useRobot } from '$lib/svelte-sdk'
import { createQuery } from '@tanstack/svelte-query'
import { Geometry, Pose } from '@viamrobotics/sdk'
import { getContext, setContext } from 'svelte'

export interface Frame {
	name: string
	parent: string
	pose: Pose
	physicalObject: Geometry
}

interface Context {
	current: Frame[]
	error?: Error
	fetching: boolean
}

const key = Symbol('frames-context')

export const provideFrames = () => {
	const robot = useRobot()

	const query = $derived.by(() => {
		robot.client
		return createQuery({
			queryKey: ['frame'],
			queryFn: async () => {
				const response = await robot.client?.robotService.frameSystemConfig({})

				return (
					response?.frameSystemConfigs.map((config) => {
						return {
							name: config.frame?.referenceFrame ?? '',
							parent: config.frame?.poseInObserverFrame?.referenceFrame ?? 'world',
							pose: config.frame?.poseInObserverFrame?.pose ?? new Pose(),
							physicalObject: config.frame?.physicalObject ?? new Geometry(),
						}
					}) ?? []
				)
			},
		})
	})

	let frames = $state.raw<Frame[]>([])
	let error = $state.raw<Error>()
	let fetching = $state.raw(false)

	$effect.pre(() => {
		return query.subscribe(($query) => {
			fetching = $query.isFetching
			error = $query.error ?? undefined
			frames = $query.data ?? []
		})
	})

	setContext<Context>(key, {
		get current() {
			return frames
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
