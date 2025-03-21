import { get, set } from 'idb-keyval'
import { getContext, setContext } from 'svelte'
import { SvelteMap } from 'svelte/reactivity'

const key = Symbol('object-visibility-context')

interface Context {
	current: SvelteMap<string, boolean>
}

export const provideVisibility = () => {
	const map = new SvelteMap<string, boolean>()

	get('object-visibility').then((entries) => {
		if (entries) {
			for (const [key, value] of entries) {
				map.set(key, value)
			}
		}
	})

	$effect(() => {
		set('object-visibility', [...map.entries()])
	})

	setContext<Context>(key, {
		get current() {
			return map
		},
	})
}

export const useVisibility = (): Context => {
	return getContext<Context>(key)
}
