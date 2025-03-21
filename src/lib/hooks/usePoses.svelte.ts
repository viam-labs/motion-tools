import { createQuery } from '@tanstack/svelte-query'
import { MotionClient, Pose } from '@viamrobotics/sdk'
import { createResourceClient, useResourceNames } from '@viamrobotics/svelte-sdk'
import { getContext, setContext } from 'svelte'
import { fromStore } from 'svelte/store'

const key = Symbol('poses-context')

interface Context {
	current: Pose[]
	error?: Error
	fetching: boolean
}

export const providePoses = (partID: () => string) => {
	const resources = useResourceNames(partID)
	const motionResources = useResourceNames(partID, 'motion')
	const motionClient = createResourceClient(
		MotionClient,
		partID,
		() => motionResources.current[0]?.name
	)

	const query = $derived(
		fromStore(
			createQuery({
				queryKey: [motionClient.current?.name ?? '', 'poses'],
				queryFn: async () => {
					const components = resources.current.filter((resource) => {
						return resource.type === 'component'
					})
					const promises = components.map((component) =>
						motionClient.current?.getPose(component, 'world', [])
					)
					const responses = await Promise.all(promises)
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
