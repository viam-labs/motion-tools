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
	loading: boolean
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
				console.log(robot.client)
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

	let frames = $state<Frame[]>([])
	let error = $state<Error>()
	let loading = $state(false)

	$effect.pre(() => {
		return query.subscribe(($query) => {
			loading = $query.isLoading
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
		get loading() {
			return loading
		},
	})

	// $effect.pre(() => {
	// 	robot.client?.robotService.frameSystemConfig({}).then((value) => {
	// 		console.log(value)
	// 		frames = value.frameSystemConfigs.map((config) => {
	// 			return {
	// 				name: config.frame?.referenceFrame ?? '',
	// 				parent: config.frame?.poseInObserverFrame?.referenceFrame ?? 'world',
	// 				pose: config.frame?.poseInObserverFrame?.pose ?? new Pose(),
	// 				physicalObject: config.frame?.physicalObject ?? new Geometry(),
	// 			}
	// 		})
	// 	})
	// })
}

export const useFrames = () => {
	return getContext<Context>(key)
}
