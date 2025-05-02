import { ArmClient, CameraClient } from '@viamrobotics/sdk'
import { createQueries, queryOptions } from '@tanstack/svelte-query'
import { createResourceClient, useResourceNames } from '@viamrobotics/svelte-sdk'
import { setContext, getContext } from 'svelte'
import { fromStore, toStore } from 'svelte/store'
import { useRefreshRates } from './useRefreshRates.svelte'
import { WorldObject } from '$lib/WorldObject'

const key = Symbol('geometries-context')

interface Context {
	current: WorldObject[]
}

export const provideGeometries = (partID: () => string) => {
	const refreshRates = useRefreshRates()
	const arms = useResourceNames(partID, 'arm')
	const cameras = useResourceNames(partID, 'camera')
	const clients = $derived([
		...arms.current.map((arm) => createResourceClient(ArmClient, partID, () => arm.name)),
		...cameras.current.map((camera) =>
			createResourceClient(CameraClient, partID, () => camera.name)
		),
	])

	if (!refreshRates.has('Geometries')) {
		refreshRates.set('Geometries', 1000)
	}

	const options = $derived(
		clients.map((client) => {
			const interval = refreshRates.get('Geometries')

			return queryOptions({
				enabled: interval !== -1 && client.current !== undefined,
				refetchInterval: interval,
				queryKey: ['partID', partID(), client.current?.name, 'getGeometries'],
				queryFn: async (): Promise<WorldObject[]> => {
					if (!client.current) {
						throw new Error('No client')
					}

					const geometries = await client.current.getGeometries()

					return geometries.map((geometry) => {
						return new WorldObject(
							geometry.label,
							geometry.center,
							client.current?.name,
							geometry.geometryType
						)
					})
				},
			})
		})
	)

	const queries = fromStore(
		createQueries({
			queries: toStore(() => options),
			combine: (results) =>
				results.flatMap((result) => result.data).filter((data) => data !== undefined),
		})
	)

	setContext<Context>(key, {
		get current() {
			return queries.current
		},
	})
}

export const useGeometries = () => {
	return getContext<Context>(key)
}
