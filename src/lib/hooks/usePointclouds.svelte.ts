import { Points } from 'three'
import { PCDLoader } from 'three/addons/loaders/PCDLoader.js'
import { createQuery } from '@tanstack/svelte-query'
import { useResources, useRobot } from '$lib/svelte-sdk'
import { CameraClient } from '@viamrobotics/sdk'
import { setContext, getContext } from 'svelte'

const key = Symbol('pointcloud-context')

interface Context {
	current: Points[]
	error?: Error
	fetching: boolean
}

export const providePointclouds = () => {
	const loader = new PCDLoader()
	const robot = useRobot()
	const cameras = useResources('camera')
	const clients = $derived.by(() => {
		const robotClient = robot.client

		if (robotClient === undefined) {
			return []
		}

		return cameras.current.map((camera) => new CameraClient(robotClient, camera.name))
	})

	const query = $derived.by(() => {
		clients
		return createQuery({
			queryKey: ['pointclouds'],
			refetchInterval: 10_000,
			queryFn: async () => {
				const responses = await Promise.all(clients.map((client) => client.getPointCloud()))
				const transformed = await Promise.all(
					responses.map((response, index) =>
						robot.client?.transformPCD(response, clients[index].name, 'world')
					)
				)
				return transformed
					.filter((value) => value !== undefined)
					.map((value) => loader.parse(new Uint8Array(value).buffer))
			},
		})
	})

	let pcds = $state.raw<Points[]>([])
	let error = $state.raw<Error>()
	let fetching = $state.raw(false)

	$effect.pre(() => {
		return query.subscribe(($query) => {
			console.log($query)
			error = $query.error ?? undefined
			fetching = $query.isLoading
			pcds = $query.data ?? []
		})
	})

	setContext<Context>(key, {
		get current() {
			return pcds
		},
		get error() {
			return error
		},
		get fetching() {
			return fetching
		},
	})
}

export const usePointClouds = () => {
	return getContext<Context>(key)
}
