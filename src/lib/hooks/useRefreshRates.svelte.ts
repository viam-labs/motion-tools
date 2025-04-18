import { get, set } from 'idb-keyval'
import { getContext, setContext } from 'svelte'
import { SvelteMap } from 'svelte/reactivity'

const key = Symbol('polling-rate-context')
const idbKey = 'polling-rate'

type Context = SvelteMap<string, number>

export const provideRefreshRates = () => {
	const map = new SvelteMap<string, number>()

	get(idbKey).then((entries) => {
		if (entries) {
			for (const [key, value] of entries) {
				map.set(key, value)
			}
		}
	})

	$effect(() => {
		set(idbKey, [...map.entries()])
	})

	setContext<Context>(key, map)

	return map
}

export const useRefreshRates = (): Context => {
	return getContext<Context>(key)
}
