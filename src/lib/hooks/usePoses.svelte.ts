import { useResources, useRobot } from '$lib/svelte-sdk'
import { createQuery } from '@tanstack/svelte-query'
import { MotionClient, Pose } from '@viamrobotics/sdk'
import { getContext, setContext } from 'svelte'
import { fromStore } from 'svelte/store'

const key = Symbol('poses-context')

interface Context {
	current: Pose[]
	error?: Error
	fetching: boolean
}

export const providePoses = () => {
	const robot = useRobot()

	const resources = useResources()
	const motionResources = useResources('motion')

	const client = $derived.by(() => {
		const robotClient = robot.client
		const [motionClient] = motionResources.current

		if (robotClient === undefined || motionClient === undefined) {
			return undefined
		}

		return new MotionClient(robotClient, motionClient.name)
	})

	const query = $derived(
		fromStore(
			createQuery({
				queryKey: [client?.name ?? '', 'poses'],
				queryFn: async () => {
					const components = resources.current.filter((resource) => {
						return resource.type === 'component'
					})
					const promises = components.map((component) => client?.getPose(component, 'world', []))
					const responses = await Promise.all(promises)
					console.log('hi', responses)
					const results = responses
						.map((response) => response?.pose)
						.filter((pose) => pose !== undefined)

					setTimeout(() => query.current.refetch(), 2000)

					return results
				},
			})
		)
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

export const usePoses = () => {
	return getContext<Context>(key)
}
