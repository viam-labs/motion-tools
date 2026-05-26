import { type Component, getContext, setContext } from 'svelte'

type DevtoolsButtonPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'

interface DevtoolsProps {
	initialIsOpen?: boolean
	buttonPosition?: DevtoolsButtonPosition
}

type DevtoolsComponent = Component<DevtoolsProps>

const key = Symbol('devtools-context')

interface Context {
	readonly isAvailable: boolean
	readonly component: DevtoolsComponent | undefined
}

export const provideDevtools = (): Context => {
	let component = $state.raw<DevtoolsComponent | undefined>()

	import('@tanstack/svelte-query-devtools')
		.then((mod) => {
			component = mod.SvelteQueryDevtools
		})
		.catch(() => {
			// Optional peer dependency not installed — devtools simply stay hidden.
		})

	const context: Context = {
		get isAvailable() {
			return component !== undefined
		},
		get component() {
			return component
		},
	}

	setContext<Context>(key, context)

	return context
}

export const useDevtools = () => {
	return getContext<Context>(key)
}
