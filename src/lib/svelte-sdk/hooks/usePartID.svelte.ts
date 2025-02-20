import { getContext, setContext } from 'svelte'

const key = Symbol('part-id-context')

interface Context {
	current: string
	set(value: string): void
}

export const createPartIDContext = (): Context => {
	let id = $state('')

	const context: Context = {
		get current() {
			return id
		},
		set(value: string) {
			id = value
		},
	}

	setContext<Context>(key, context)

	return context
}

export const usePartID = (): Context => {
	return getContext<Context>(key)
}
