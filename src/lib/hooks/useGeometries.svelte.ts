import { ArmClient, CameraClient, Geometry } from '@viamrobotics/sdk'
import { createQueries, queryOptions } from '@tanstack/svelte-query'
import { createResourceClient, useResourceNames } from '@viamrobotics/svelte-sdk'
import { setContext, getContext } from 'svelte'
import { fromStore, toStore } from 'svelte/store'
import { useRefreshRates } from './useRefreshRates.svelte'
import { WorldObject } from '$lib/WorldObject'
import { usePersistentUUIDs } from './usePersistentUUIDs.svelte'

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
				refetchInterval: interval === 0 ? false : interval,
				queryKey: ['partID', partID(), client.current?.name, 'getGeometries'],
				queryFn: async (): Promise<{ name: string; geometries: Geometry[] }> => {
					if (!client.current) {
						throw new Error('No client')
					}

					const geometries = await client.current.getGeometries()
					return { name: client.current.name, geometries }
				},
			})
		})
	)

	const { updateUUIDs } = usePersistentUUIDs()
	const queries = fromStore(createQueries({ queries: toStore(() => options) }))

	const geometries = $derived.by(() => {
		const results: WorldObject[] = []

		for (const query of queries.current) {
			if (!query.data) continue

			for (const { center, label, geometryType } of query.data.geometries) {
				results.push(new WorldObject(label, center, query.data.name, geometryType))
			}
		}

		updateUUIDs(results)

		return results
	})

	setContext<Context>(key, {
		get current() {
			return geometries
		},
	})
}

export const useGeometries = () => {
	return getContext<Context>(key)
}
