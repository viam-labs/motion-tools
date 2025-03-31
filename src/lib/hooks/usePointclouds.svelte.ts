import { BufferAttribute, BufferGeometry, Points, PointsMaterial } from 'three'
import { createQueries, type QueryObserverResult } from '@tanstack/svelte-query'
import { CameraClient } from '@viamrobotics/sdk'
import { setContext, getContext } from 'svelte'
import { fromStore, toStore } from 'svelte/store'
import { createResourceClient, useResourceNames, useRobotClient } from '@viamrobotics/svelte-sdk'
import { parsePCD } from '$lib/loaders/pcd'

const key = Symbol('pointcloud-context')

interface Context {
	current: QueryObserverResult<Points | undefined, Error>[]
}

export const providePointclouds = (partID: () => string, refetchInterval?: () => number) => {
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

					const response = await cameraClient.current.getPointCloud()
					const transformed = transform
						? await client.current?.transformPCD(response, cameraClient.current.name, 'world')
						: response
					if (!transformed) return

					const { positions, colors } = await parsePCD(transformed)
					const geometry = new BufferGeometry()
					const material = new PointsMaterial({ size: 0.01, vertexColors: true })
					geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3))

					if (colors) {
						geometry.setAttribute('color', new BufferAttribute(new Float32Array(colors), 3))
					}

					const points = new Points(geometry, material)
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
