import { currentWritable, type CurrentWritable } from '@threlte/core'
import type { ResourceName } from '@viamrobotics/sdk'
import { getContext, setContext } from 'svelte'

const key = Symbol('resources-context')

class Resources {
	current: ResourceName[] = $state([])
}

type Context = Resources

export const createResourcesContext = (): Context => {
	const resources = new Resources()
	setContext<Context>(key, resources)
	return resources
}

export const useResources = (): Context => {
	return getContext<Context>(key)
}
