import type { ResourceName } from '@viamrobotics/sdk'
import { getContext, setContext } from 'svelte'

const key = Symbol('resources-context')

class Resources {
	private _value: ResourceName[] = $state([])
	private _error: Error | undefined = $state()
	private _loading: boolean = $state(false)

	get current(): ResourceName[] {
		return this._value
	}

	get error() {
		return this._error
	}

	get loading() {
		return this._loading
	}

	set(value: ResourceName[]): void {
		this._value = value
	}
}

export const createResourcesContext = (): Resources => {
	const resources = new Resources()
	setContext<Resources>(key, resources)
	return resources
}

export const useResources = (subtype?: string): Resources => {
	const context = getContext<Resources>(key)

	if (subtype) {
		const filtered = $derived(context.current.filter((value) => value.subtype === subtype))

		return {
			get current() {
				return filtered
			},
			get loading() {
				return context.loading
			},
			get error() {
				return context.error
			},
		} as Resources
	}

	return context
}
