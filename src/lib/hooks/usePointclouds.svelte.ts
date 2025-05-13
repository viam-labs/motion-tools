import { createQueries, queryOptions } from '@tanstack/svelte-query'
import { CameraClient } from '@viamrobotics/sdk'
import { setContext, getContext } from 'svelte'
import { fromStore, toStore } from 'svelte/store'
import { createResourceClient, useResourceNames } from '@viamrobotics/svelte-sdk'
import { parsePCD } from '$lib/loaders/pcd'
import { useRefreshRates } from './useRefreshRates.svelte'
import { usePoses } from './usePoses.svelte'
import { useFrames } from './useFrames.svelte'
import { WorldObject, type PointsGeometry } from '$lib/WorldObject'

const key = Symbol('pointcloud-context')

interface Context {
	current: WorldObject<PointsGeometry>[]
}

export const providePointclouds = (partID: () => string) => {
	const refreshRates = useRefreshRates()
	const poses = usePoses()
	const frames = useFrames()
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

					const pose = poses.current.find((pose) => pose.component.name === name)?.pose
					const frame = frames.current.find((frame) => frame.name === name)?.pose

					if (!pose && !frame) return null

					const response = await cameraClient.current.getPointCloud()

					if (!response) return null

					const { positions, colors } = await parsePCD(new Uint8Array(response))

					return new WorldObject(
						`${name}:pointcloud`,
						pose ?? frame,
						name,
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
			combine: (results) => {
				return {
					data: results
						.flatMap((result) => result.data)
						.filter((data) => data !== null && data !== undefined),
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
