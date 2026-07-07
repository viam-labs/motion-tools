import { getContext, setContext } from 'svelte'

export const FULLSCREEN_CONTEXT_KEY = Symbol('fullscreen')

interface Fullscreen {
	/** True while a Fullscreen plugin is mounted. */
	available: boolean
	/** True while the visualizer covers the viewport. */
	active: boolean
}

interface Context {
	current: Fullscreen
}

const defaults = (): Fullscreen => ({
	available: false,
	active: false,
})

export const createFullscreen = (): Context => {
	const fullscreen = $state<Fullscreen>(defaults())

	const context: Context = {
		get current() {
			return fullscreen
		},
	}

	return context
}

export const provideFullscreen = () => {
	const context = createFullscreen()
	setContext<Context>(FULLSCREEN_CONTEXT_KEY, context)
	return context
}

export const useFullscreen = () => {
	return getContext<Context>(FULLSCREEN_CONTEXT_KEY)
}
