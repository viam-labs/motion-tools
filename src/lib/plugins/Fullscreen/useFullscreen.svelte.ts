import { getContext, setContext } from 'svelte'

export const FULLSCREEN_CONTEXT_KEY = Symbol('fullscreen')

export const provideFullscreen = () => {
	let available = $state(false)
	let active = $state(false)
	const baseOffset = $derived(available ? 38 : 0)

	return setContext(FULLSCREEN_CONTEXT_KEY, {
		/** True while a Fullscreen plugin is mounted. */
		get available() {
			return available
		},
		set available(value: boolean) {
			available = value
		},
		/** True while the visualizer covers the viewport. */
		get active() {
			return active
		},
		set active(value: boolean) {
			active = value
		},
		/** Vertical clearance overlays need to stay below the plugin's button (30px + 8px gap). */
		get baseOffset() {
			return baseOffset
		},
	})
}

export const useFullscreen = () =>
	getContext<ReturnType<typeof provideFullscreen>>(FULLSCREEN_CONTEXT_KEY)
