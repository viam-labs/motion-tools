import { useResources, useRobot } from '$lib/svelte-sdk'
import { ArmClient, CameraClient, Pose } from '@viamrobotics/sdk'
import { createQuery } from '@tanstack/svelte-query'

import { setContext, getContext } from 'svelte'
import type { Frame } from './useFrames.svelte'

const key = Symbol('geometries-context')

interface Context {
	current: Frame[]
	error?: Error
	fetching: boolean
}

export const provideGeometries = () => {
	const robot = useRobot()
	const arms = useResources('arm')
	const cameras = useResources('camera')

	const clients = $derived.by(() => {
		const robotClient = robot.client

		if (robotClient === undefined) {
			return []
		}

		const armClients = arms.current.map((arm) => new ArmClient(robotClient, arm.name))
		const cameraClients = cameras.current.map(
			(camera) => new CameraClient(robot.client!, camera.name)
		)

		return [...armClients]
	})

	const query = $derived.by(() => {
		clients
		return createQuery({
			queryKey: ['geometries', ...clients.map((client) => client.name)],
			refetchInterval: 1000 / 5,
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
	})

	let geometries = $state.raw<Frame[]>([])
	let error = $state.raw<Error>()
	let fetching = $state.raw(false)

	$effect.pre(() => {
		return query.subscribe(($query) => {
			error = $query.error ?? undefined
			fetching = $query.isFetching
			geometries = $query.data ?? []
		})
	})

	setContext<Context>(key, {
		get current() {
			return geometries
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
