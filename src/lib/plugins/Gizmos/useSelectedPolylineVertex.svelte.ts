import type { Entity } from 'koota'

import { getContext, setContext } from 'svelte'

const key = Symbol('selected-polyline-vertex')

export interface PolylineVertexSelection {
	entity: Entity
	index: number
}

interface Context {
	current: PolylineVertexSelection | undefined
	set(value: PolylineVertexSelection | undefined): void
}

export const provideSelectedPolylineVertex = () => {
	let current = $state.raw<PolylineVertexSelection | undefined>(undefined)

	const context: Context = {
		get current() {
			return current
		},
		set(value) {
			current = value
		},
	}

	setContext(key, context)
	return context
}

export const useSelectedPolylineVertex = (): Context => getContext(key)
