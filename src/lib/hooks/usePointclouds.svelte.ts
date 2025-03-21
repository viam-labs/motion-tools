import { Points } from 'three'
import { PCDLoader } from 'three/addons/loaders/PCDLoader.js'
import { createQuery } from '@tanstack/svelte-query'
import { CameraClient } from '@viamrobotics/sdk'
import { setContext, getContext } from 'svelte'
import { fromStore } from 'svelte/store'
import { useResourceNames, useRobotClient } from '@viamrobotics/svelte-sdk'

const key = Symbol('pointcloud-context')

interface Context {
	current: Points[]
	error?: Error
	fetching: boolean
}

export const providePointclouds = (partID: () => string) => {
	const loader = new PCDLoader()
	const client = useRobotClient(partID)
	const cameras = useResourceNames(partID, 'camera')

	const clients = $derived.by(() => {
		const robotClient = client.current

		if (robotClient === undefined) {
			return []
		}

		return cameras.current.map((camera) => new CameraClient(robotClient, camera.name))
	})

	const queries = $derived(
		clients.map((cameraClient) => {
			const query = fromStore(
				createQuery({
					queryKey: [cameraClient.name, 'pointclouds'],
					queryFn: async () => {
						const transform = true

						const response = await cameraClient.getPointCloud()
						const transformed = transform
							? await client.current?.transformPCD(response, cameraClient.name, 'world')
							: response
						if (!transformed) return

						const points = loader.parse(new Uint8Array(transformed).buffer)
						points.userData.parent = cameraClient.name
						points.name = `${cameraClient.name}:pointcloud`

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
