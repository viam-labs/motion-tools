import { get, set } from 'idb-keyval'
import { getContext, setContext } from 'svelte'
import { SvelteMap } from 'svelte/reactivity'

const key = Symbol('polling-rate-context')
const refreshRatesKey = 'polling-rate'
const disabledCamerasKey = 'disabled-cameras'

type Context = {
	refreshRates: SvelteMap<string, number>
	disabledCameras: SvelteMap<string, boolean>
}

const setFromEntries = (map: SvelteMap<string, unknown>, entries?: [string, unknown][]) => {
	if (entries) {
		for (const [key, value] of entries) {
			map.set(key, value)
		}
	}
}

export const provideMachineSettings = () => {
	const refreshRates = new SvelteMap<string, number>()
	const disabledCameras = new SvelteMap<string, boolean>()

	get(refreshRatesKey).then((entries) => {
		setFromEntries(refreshRates, entries)
	})

	get(disabledCamerasKey).then((entries) => {
		setFromEntries(disabledCameras, entries)
	})

	$effect(() => {
		set(refreshRatesKey, [...refreshRates.entries()])
	})

	$effect(() => {
		set(disabledCamerasKey, [...disabledCameras.entries()])
	})

	setContext<Context>(key, {
		get refreshRates() {
			return refreshRates
		},
		get disabledCameras() {
			return disabledCameras
		},
	})
}

export const useMachineSettings = (): Context => {
	return getContext<Context>(key)
}
