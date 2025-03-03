import { createQuery } from '@tanstack/svelte-query'
import type { ResourceName } from '@viamrobotics/sdk'
import { getContext, setContext, untrack } from 'svelte'
import { fromStore } from 'svelte/store'
import { useRobot } from './useRobot.svelte'

const key = Symbol('resources-context')

interface Context {
	current: ResourceName[]
	error: Error | undefined
	fetching: boolean
}

export const createResourcesContext = () => {
	const robot = useRobot()

	const query = fromStore(
		createQuery({
			queryKey: ['resources'],
			refetchInterval: 10_000,
			queryFn: async () => {
				if (robot.client === undefined) {
					return []
				}

				return robot.client.resourceNames()
			},
		})
	)

	$effect(() => {
		robot.client
		untrack(() => query.current).refetch()
	})

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

export const useResources = (subtype?: string): Context => {
	const context = getContext<Context>(key)

	if (subtype) {
		const filtered = $derived(context.current.filter((value) => value.subtype === subtype))

		return {
			...context,
			get current() {
				return filtered
			},
		}
	}

	return context
}
