import { currentWritable, type CurrentWritable } from '@threlte/core'
import { getContext, setContext } from 'svelte'

const key = Symbol('resources-context')

type Context = CurrentWritable<any[]>

export const createResourcesContext = (): Context => {
	const resources = currentWritable([])
	setContext<Context>(key, resources)
	return resources
}

export const useResources = (): Context => {
	return getContext<Context>(key)
}
