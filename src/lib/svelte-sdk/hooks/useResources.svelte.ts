import type { ResourceName } from '@viamrobotics/sdk'
import { getContext, setContext } from 'svelte'

const key = Symbol('resources-context')

class Resources {
	private value: ResourceName[] = $state([])

	get current(): ResourceName[] {
		return this.value
	}

	set(value: ResourceName[]): void {
		this.value = value
	}
}

export const createResourcesContext = (): Resources => {
	const resources = new Resources()
	setContext<Resources>(key, resources)
	return resources
}

export const useResources = (): Resources => {
	return getContext<Resources>(key)
}
