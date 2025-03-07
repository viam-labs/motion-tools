import { Points } from 'three'
import { PCDLoader } from 'three/addons/loaders/PCDLoader.js'
import { createQuery } from '@tanstack/svelte-query'
import { useResources, useRobot } from '$lib/svelte-sdk'
import { CameraClient } from '@viamrobotics/sdk'
import { setContext, getContext } from 'svelte'
import { fromStore } from 'svelte/store'

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

	const queries = $derived(
		clients.map((client) => {
			const query = fromStore(
				createQuery({
					queryKey: [client.name, 'pointclouds'],
					queryFn: async () => {
						const transform = false

						const response = await client.getPointCloud()
						const transformed = transform
							? await robot.client?.transformPCD(response, client.name, 'world')
							: response
						if (!transformed) return

						const points = loader.parse(new Uint8Array(transformed).buffer)
						points.userData.parent = client.name
						points.name = `${client.name}:pointcloud`

						setTimeout(() => query.current.refetch(), 5000)

						return points
					},
				})
			)

			return query
		})
	)

	const data = $derived(
		queries.map((query) => query.current.data).filter((points) => points !== undefined)
	)
	const error = $derived(queries[0]?.current.error ?? undefined)
	const fetching = $derived(queries[0]?.current.isFetching ?? false)

	setContext<Context>(key, {
		get current() {
			return data
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
