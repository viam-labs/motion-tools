import { useResources, useRobot } from '$lib/svelte-sdk'
import { ArmClient, CameraClient, Pose } from '@viamrobotics/sdk'
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

	const query = fromStore(
		createQuery({
			queryKey: ['geometries'],
			refetchInterval: 1000 / 1,
			queryFn: async () => {
				const results: Frame[] = []
				const responses = await Promise.all(clients.map((client) => client.getGeometries()))

				let index = 0
				for (const response of responses) {
					for (const geo of response) {
						results.push({
							name: geo.label,
							parent: clients[index].name,
							pose: geo.center ?? new Pose(),
							physicalObject: geo,
						})
					}
					index += 1
				}

				return results
			},
		})
	)

	const current = $derived(query.current.data ?? [])
	const error = $derived(query.current.error ?? undefined)
	const fetching = $derived(query.current.isFetching)

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
