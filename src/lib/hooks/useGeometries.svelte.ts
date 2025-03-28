import { ArmClient } from '@viamrobotics/sdk'
import { createQueries, queryOptions, type QueryObserverResult } from '@tanstack/svelte-query'
import { createResourceClient, useResourceNames } from '@viamrobotics/svelte-sdk'
import { setContext, getContext } from 'svelte'
import { fromStore, toStore } from 'svelte/store'

import type { Frame } from './useFrames.svelte'
import { createPose } from '$lib/transform'

const key = Symbol('geometries-context')

interface Context {
	current: QueryObserverResult<Frame[], Error>[]
}

export const provideGeometries = (partID: () => string) => {
	const arms = useResourceNames(partID, 'arm')
	const clients = $derived(
		arms.current.map((arm) => createResourceClient(ArmClient, partID, () => arm.name))
	)

	const options = $derived(
		clients.map((client) => {
			return queryOptions({
				queryKey: ['partID', partID(), client.current?.name, 'getGeometries'],
				refetchInterval: 1000,
				queryFn: async (): Promise<Frame[]> => {
					if (!client.current) return []

					const geometries = await client.current.getGeometries()

					return geometries.map((geo) => ({
						name: geo.label,
						parent: client.current?.name ?? 'world',
						pose: geo.center ?? createPose(),
						geometry: geo,
					}))
				},
			})
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

export const useGeometries = () => {
	return getContext<Context>(key)
}
