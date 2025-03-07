import { useResources, useRobot } from '$lib/svelte-sdk'
import { ArmClient, Pose } from '@viamrobotics/sdk'
import { createQuery } from '@tanstack/svelte-query'

import { setContext, getContext } from 'svelte'
import type { Frame } from './useFrames.svelte'
import { fromStore } from 'svelte/store'

const key = Symbol('geometries-context')

interface Context {
	current: Frame[]
	error?: Error
	fetching: boolean
}

export const provideGeometries = () => {
	const robot = useRobot()
	const arms = useResources('arm')

	const clients = $derived.by(() => {
		const robotClient = robot.client

		if (robotClient === undefined) {
			return []
		}

		return arms.current.map((arm) => new ArmClient(robotClient, arm.name))
	})

	const queries = $derived(
		clients.map((client) => {
			const query = fromStore(
				createQuery({
					queryKey: [client.name, 'geometries'],
					queryFn: async () => {
						const response = await client.getGeometries()

						setTimeout(() => query.current.refetch(), 1000)

						return response.map((geo) => ({
							name: geo.label,
							parent: client.name,
							pose: geo.center ?? new Pose(),
							geometry: geo,
						}))
					},
				})
			)

			return query
		})
	)

	const current = $derived(
		queries.flatMap((query) => query.current.data).filter((x) => x !== undefined)
	)
	const error = $derived(queries[0]?.current.error ?? undefined)
	const fetching = $derived(queries[0]?.current.isFetching ?? false)

	setContext<Context>(key, {
		get current() {
			return current
		},
		get error() {
			return error
		},
		get fetching() {
			return fetching
		},
	})
}

export const useGeometries = () => {
	return getContext<Context>(key)
}
