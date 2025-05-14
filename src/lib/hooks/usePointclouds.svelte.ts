import { createQueries, queryOptions } from '@tanstack/svelte-query'
import { CameraClient } from '@viamrobotics/sdk'
import { setContext, getContext } from 'svelte'
import { fromStore, toStore } from 'svelte/store'
import { createResourceClient, useResourceNames } from '@viamrobotics/svelte-sdk'
import { parsePCD } from '$lib/loaders/pcd'
import { useRefreshRates } from './useRefreshRates.svelte'
import { WorldObject, type PointsGeometry } from '$lib/WorldObject'
import { usePersistentUUIDs } from './usePersistentUUIDs.svelte'

const key = Symbol('pointcloud-context')

interface Context {
	current: WorldObject<PointsGeometry>[]
}

export const providePointclouds = (partID: () => string) => {
	const refreshRates = useRefreshRates()
	const cameras = useResourceNames(partID, 'camera')

	if (!refreshRates.has('Pointclouds')) {
		refreshRates.set('Pointclouds', 5000)
	}

	const clients = $derived(
		cameras.current.map((camera) => createResourceClient(CameraClient, partID, () => camera.name))
	)

	const options = $derived(
		clients.map((cameraClient) => {
			const name = cameraClient.current?.name ?? ''
			const interval = refreshRates.get('Pointclouds')

			return queryOptions({
				enabled: interval !== -1 && cameraClient.current !== undefined,
				refetchInterval: interval,
				queryKey: ['partID', partID(), name, 'getPointCloud'],
				queryFn: async (): Promise<WorldObject<PointsGeometry> | null> => {
					if (!cameraClient.current) {
						throw new Error('No camera client')
					}

					const response = await cameraClient.current.getPointCloud()

					if (!response) return null

					const { positions, colors } = await parsePCD(new Uint8Array(response))

					return new WorldObject(
						`${name}:pointcloud`,
						undefined,
						name,
						{ case: 'points', value: new Float32Array(positions) },
						colors ? { colors: new Float32Array(colors) } : undefined
					)
				},
			})
		})
	)

	const { updateUUIDs } = usePersistentUUIDs()
	const queries = fromStore(
		createQueries({
			queries: toStore(() => options),
			combine: (results) => {
				const data = results
					.flatMap((result) => result.data)
					.filter((data) => data !== null && data !== undefined)

				updateUUIDs(data)

				return {
					data,
				}
			},
		})
	)

	setContext<Context>(key, {
		get current() {
			return queries.current.data
		},
	})
}

export const usePointClouds = () => {
	return getContext<Context>(key)
}
