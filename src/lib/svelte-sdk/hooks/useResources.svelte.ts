import type { ResourceName } from '@viamrobotics/sdk'
import { getContext, setContext } from 'svelte'

const key = Symbol('resources-context')

interface Context {
	current: ResourceName[]
	loading: boolean
	error: Error | undefined
	set(value: ResourceName[]): void
}

export const createResourcesContext = (): Context => {
	let resources = $state.raw<ResourceName[]>([])
	let error = $state.raw<Error>()
	let loading = $state.raw(false)

	const context = {
		get current(): ResourceName[] {
			return resources
		},

		get error() {
			return error
		},

		get loading() {
			return loading
		},

		set(value: ResourceName[]): void {
			resources = value ?? []
		},
	}

	setContext<Context>(key, context)

	return context
}

export const useResources = (subtype?: string): Context => {
	const context = getContext<Context>(key)

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
		} as Context
	}

	return context
}
