import { createQueries, queryOptions } from '@tanstack/svelte-query'
import { MotionClient, PoseInFrame, ResourceName } from '@viamrobotics/sdk'
import { createResourceClient, useResourceNames } from '@viamrobotics/svelte-sdk'
import { getContext, setContext } from 'svelte'
import { fromStore, toStore } from 'svelte/store'
import { useRefreshRates } from './useRefreshRates.svelte'

const key = Symbol('poses-context')

type PoseWithComponent = PoseInFrame & { component: ResourceName }

interface Context {
	current: PoseWithComponent[]
}

export const providePoses = (partID: () => string) => {
	const refreshRates = useRefreshRates()
	const resources = useResourceNames(partID)
	const components = $derived(resources.current.filter(({ type }) => type === 'component'))
	const motionResources = useResourceNames(partID, 'motion')
	const clients = $derived(
		motionResources.current.map((resource) =>
			createResourceClient(MotionClient, partID, () => resource.name)
		)
	)

	if (!refreshRates.has('Poses')) {
		refreshRates.set('Poses', 1000)
	}

	const options = $derived(
		clients.map((motionClient) => {
			const interval = refreshRates.get('Poses')

			return queryOptions({
				enabled: interval !== -1 && motionClient.current !== undefined,
				refetchInterval: interval,
				queryKey: ['partID', partID(), motionClient.current?.name, 'getPose'],
				queryFn: async (): Promise<PoseWithComponent[]> => {
					const client = motionClient.current
					if (!client) {
						throw new Error('No client')
					}

					const promises = components.map((component) => {
						return client.getPose(component, 'world', [])
					})

					const results = await Promise.allSettled(promises)

					return results
						.map((result, index) => ({ ...result, component: components[index] }))
						.filter((result) => result.status === 'fulfilled')
						.map((result) => ({ ...result.value, component: result.component }))
				},
			})
		})
	)

	const queries = fromStore(
		createQueries({
			queries: toStore(() => options),
			combine: (results) => {
				return {
					data: results.flatMap((result) => result.data).filter((data) => data !== undefined),
				}
			},
		})
	)

	setContext<Context>(key, {
		get current() {
			return queries.current.data
		},
	})
}

export const usePoses = () => {
	return getContext<Context>(key)
}
