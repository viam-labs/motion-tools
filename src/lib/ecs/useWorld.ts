import { createWorld, type World } from 'koota'
import { getContext, setContext } from 'svelte'

import * as relations from './relations'
import * as traits from './traits'

export const WORLD_CONTEXT_KEY = Symbol('koota-context')

export function provideWorld() {
	const world = createWorld()

	// @ts-expect-error This is for debugging.
	globalThis.__koota__ = {
		world,
		traits,
		relations,
	}

	setContext<World>(WORLD_CONTEXT_KEY, world)
}

export function useWorld() {
	return getContext<World>(WORLD_CONTEXT_KEY)
}
