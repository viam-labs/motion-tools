import { get, set } from 'idb-keyval'
import { getContext, setContext } from 'svelte'

const key = Symbol('dashboard-context')

interface Settings {
	cameraMode: 'orthographic' | 'perspective'
	transformMode: 'translate' | 'rotate' | 'scale'
	enableXR: boolean
}

interface Context {
	current: Settings
}

const defaults = (): Settings => ({
	cameraMode: 'perspective',
	transformMode: 'translate',
	enableXR: false,
})

export const provideSettings = () => {
	let settings = $state<Settings>(defaults())

	get('motion-tools-settings').then((response: Settings) => {
		if (response) {
			settings = { ...settings, ...response }
		}
	})

	$effect(() => {
		set('motion-tools-settings', $state.snapshot(settings))
	})

	setContext<Context>(key, {
		get current() {
			return settings
		},
	})
}

export const useSettings = () => {
	return getContext<Context>(key)
}
