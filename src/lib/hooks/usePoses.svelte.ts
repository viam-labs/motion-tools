import { createQueries, type QueryObserverResult } from '@tanstack/svelte-query'
import { MotionClient, PoseInFrame, ResourceName } from '@viamrobotics/sdk'
import { createResourceClient, useResourceNames } from '@viamrobotics/svelte-sdk'
import { getContext, setContext } from 'svelte'
import { fromStore, toStore } from 'svelte/store'

const key = Symbol('poses-context')

type PoseWithComponent = PoseInFrame & { component: ResourceName }

interface Context {
	current: QueryObserverResult<PoseWithComponent[], Error>[]
}

export const providePoses = (partID: () => string) => {
	const resources = useResourceNames(partID)
	const components = $derived(resources.current.filter(({ type }) => type === 'component'))
	const motionResources = useResourceNames(partID, 'motion')
	const clients = $derived(
		motionResources.current.map((resource) =>
			createResourceClient(MotionClient, partID, () => resource.name)
		)
	)

	const options = $derived(
		clients.map((motionClient) => {
			return {
				refetchInterval: 1000,
				queryKey: ['partID', partID(), motionClient.current?.name, 'getPose'],
				queryFn: async (): Promise<PoseWithComponent[]> => {
					const client = motionClient.current

					if (!client) return []

					const promises = components.map((component) => {
						return client.getPose(component, 'world', [])
					})

					const results = await Promise.allSettled(promises)

					return results
						.map((result, index) => ({ ...result, component: components[index] }))
						.filter((result) => result.status === 'fulfilled')
						.map((result) => ({ ...result.value, component: result.component }))
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

export const usePoses = () => {
	return getContext<Context>(key)
}
