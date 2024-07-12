import { currentWritable, type CurrentWritable } from '@threlte/core'
import { getContext, setContext } from 'svelte'

const key = Symbol('part-id-context')

type Context = CurrentWritable<string>

export const createPartIDContext = (partID: string): Context => {
	const context = currentWritable(partID)
	setContext<Context>(key, context)

	return context
}

export const usePartID = (): Context => {
	return getContext<Context>(key)
}
