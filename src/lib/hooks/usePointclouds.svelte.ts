import type { ResourceName } from '@viamrobotics/sdk'

import { useResourceNames } from '@viamrobotics/svelte-sdk'
import { getContext, setContext } from 'svelte'

const key = Symbol('pointcloud-context')

interface Context {
	refetch: () => void
	readonly cameras: ResourceName[]
	/** Each mounted camera registers its own refetch here, keyed by name. */
	readonly refetchers: Map<string, () => void>
}

export const providePointclouds = (partID: () => string) => {
	const cameras = useResourceNames(partID, 'camera')
	const refetchers = new Map<string, () => void>()

	setContext<Context>(key, {
		refetch() {
			for (const refetch of refetchers.values()) {
				refetch()
			}
		},
		get cameras() {
			return cameras.current
		},
		refetchers,
	})
}

export const usePointClouds = () => {
	return getContext<Context>(key)
}
