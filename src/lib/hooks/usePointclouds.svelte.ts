import { createQueries, queryOptions, type QueryObserverResult } from '@tanstack/svelte-query'
import { CameraClient } from '@viamrobotics/sdk'
import { setContext, getContext } from 'svelte'
import { fromStore, toStore } from 'svelte/store'
import { createResourceClient, useResourceNames, useRobotClient } from '@viamrobotics/svelte-sdk'
import { parsePCD } from '$lib/loaders/pcd'
import { useRefreshRates } from './useRefreshRates.svelte'
import { usePoses } from './usePoses.svelte'
import { useFrames } from './useFrames.svelte'
import { WorldObject, type PointsGeometry } from '$lib/WorldObject'

const key = Symbol('pointcloud-context')

interface Context {
	current: QueryObserverResult<WorldObject<PointsGeometry> | undefined, Error>[]
}

export const providePointclouds = (partID: () => string) => {
	const refreshRates = useRefreshRates()
	const poses = usePoses()
	const frames = useFrames()
	const client = useRobotClient(partID)
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
				queryFn: async (): Promise<WorldObject<PointsGeometry> | undefined> => {
					if (!cameraClient.current) {
						throw new Error('No camera client')
					}

					const frame = frames.current.find((frame) => frame.name === name)
					const transform = frame !== undefined

					const response = await cameraClient.current.getPointCloud()

					const transformed = transform
						? await client.current?.transformPCD(response, cameraClient.current.name, 'world')
						: response

					if (!transformed) return

					const { positions, colors } = await parsePCD(new Uint8Array(transformed))

					return new WorldObject(
						`${name}:pointcloud`,
						undefined,
						frame ? name : 'world',
						{ case: 'points', value: new Float32Array(positions) },
						colors ? { colors: new Float32Array(colors) } : undefined
					)
				},
			})
		})
	)

	const queries = fromStore(
		createQueries({
			queries: toStore(() => options),
			combine: (result) => {
				return result
			},
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
