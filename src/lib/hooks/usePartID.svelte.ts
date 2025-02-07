import { currentWritable } from '@threlte/core'
import { getContext, setContext } from 'svelte'

const key = Symbol('part-id-context')

interface Context {
	current: string
}

class PartID {
	current = $state<string>('')
}

export const createPartIDContext = (partID: string): Context => {
	const context = new PartID()
	context.current = partID
	setContext<Context>(key, context)

	return context
}

export const usePartID = (): Context => {
	return getContext<Context>(key)
}
