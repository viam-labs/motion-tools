import { getContext, setContext } from 'svelte'

interface Context {
	active: boolean
	setActive: (value: boolean) => void
}

const key = Symbol('tranform-controls-context')

export const provideTransformControls = () => {
	let active = $state(false)

	setContext<Context>(key, {
		get active() {
			return active
		},
		setActive(value: boolean) {
			active = value
		},
	})
}

export const useTransformControls = (): Context => {
	return getContext<Context>(key)
}
