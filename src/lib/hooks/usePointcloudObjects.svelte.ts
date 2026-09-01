import type { ResourceName } from '@viamrobotics/sdk'

import { useResourceNames } from '@viamrobotics/svelte-sdk'
import { getContext, setContext } from 'svelte'

const key = Symbol('pointcloud-object-context')

interface Context {
	refetch: () => void
	readonly services: ResourceName[]
	/** Each mounted vision service registers its own refetch here, keyed by name. */
	readonly refetchers: Map<string, () => void>
}

export const providePointcloudObjects = (partID: () => string) => {
	const services = useResourceNames(partID, 'vision')
	const refetchers = new Map<string, () => void>()

	setContext<Context>(key, {
		refetch() {
			for (const refetch of refetchers.values()) {
				refetch()
			}
		},
		get services() {
			return services.current
		},
		refetchers,
	})
}

export const usePointcloudObjects = () => {
	return getContext<Context>(key)
}
