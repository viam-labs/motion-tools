import { ArmClient, CameraClient, Geometry } from '@viamrobotics/sdk'
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
	const geometries = $state<WorldObject[]>([])

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

	const queries = fromStore(createQueries({ queries: toStore(() => options) }))

	$effect(() => {
		for (const query of queries.current) {
			if (!query.data) continue

			// const toDelete = geometries.filter(({ name }) => query.data.geometries.find(({ label }) => name !== label))

			for (const geometry of query.data.geometries) {
				const result = geometries.find(({ name }) => name === geometry.label)

				if (result) {
					result.pose = geometry.center ?? result.pose
				} else {
					geometries.push(
						new WorldObject(geometry.label, geometry.center, query.data.name, geometry.geometryType)
					)
				}
			}
		}
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
