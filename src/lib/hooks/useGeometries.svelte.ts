import { ArmClient, Pose } from '@viamrobotics/sdk'
import { createQueries, type QueryObserverResult } from '@tanstack/svelte-query'
import { createResourceClient, useResourceNames } from '@viamrobotics/svelte-sdk'
import { setContext, getContext } from 'svelte'
import type { Frame } from './useFrames.svelte'
import { fromStore, toStore } from 'svelte/store'

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
			return {
				queryKey: ['partID', partID(), client.current?.name, 'getGeometries'],
				queryFn: async (): Promise<Frame[]> => {
					if (!client.current) return []

					const geometries = await client.current.getGeometries()

					return geometries.map((geo) => ({
						name: geo.label,
						parent: client.current?.name ?? 'world',
						pose: geo.center ?? new Pose(),
						geometry: geo,
					}))
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

export const useGeometries = () => {
	return getContext<Context>(key)
}
