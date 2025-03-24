import { Points } from 'three'
import { PCDLoader } from 'three/addons/loaders/PCDLoader.js'
import { createQueries, type QueryObserverResult } from '@tanstack/svelte-query'
import { CameraClient } from '@viamrobotics/sdk'
import { setContext, getContext } from 'svelte'
import { fromStore, toStore } from 'svelte/store'
import { createResourceClient, useResourceNames, useRobotClient } from '@viamrobotics/svelte-sdk'

const key = Symbol('pointcloud-context')

interface Context {
	current: QueryObserverResult<Points | undefined, Error>[]
}

export const providePointclouds = (partID: () => string, refetchInterval?: () => number) => {
	const loader = new PCDLoader()
	const client = useRobotClient(partID)
	const cameras = useResourceNames(partID, 'camera')

	const clients = $derived(
		cameras.current.map((camera) => createResourceClient(CameraClient, partID, () => camera.name))
	)

	const options = $derived(
		clients.map((cameraClient) => {
			return {
				refetchInterval: refetchInterval?.(),
				queryKey: ['partID', partID(), cameraClient.current?.name, 'getPointCloud'],
				queryFn: async (): Promise<Points | undefined> => {
					if (!cameraClient.current) return

					const transform = true

					const response = await cameraClient.current?.getPointCloud()
					const transformed = transform
						? await client.current?.transformPCD(response, cameraClient.current.name, 'world')
						: response
					if (!transformed) return

					const points = loader.parse(new Uint8Array(transformed).buffer)
					points.userData.parent = cameraClient.current.name
					points.name = `${cameraClient.current.name}:pointcloud`

					return points
				},
			}
		})
	)

	const queries = fromStore(
		createQueries({
			queries: toStore(() => options),
			combine: (results) => results,
		})
	)

	setContext<Context>(key, {
		get current() {
			return queries.current
		},
	})
}

export const usePointClouds = () => {
	return getContext<Context>(key)
}
