import type { Entity } from 'koota'

import { ChildOf } from './relations'
import { Name, Orphan } from './traits'
import { useTarget } from './useTarget.svelte'
import { useTrait } from './useTrait.svelte'

/**
 * Reactive view of an entity's parent name — the string consumed by Threlte
 * `<Portal id={...}>` and other lookups that key off the parent's `Name`.
 *
 * Reads through `ChildOf` to the parent's `Name` when the parent is alive,
 * else falls back to `Orphan(parentName)`.
 */
export const useParentName = (
	target: () => Entity | undefined
): { readonly current: string | undefined } => {
	const parent = useTarget(target, ChildOf)
	const parentName = useTrait(() => parent.current, Name)
	const orphan = useTrait(target, Orphan)

	return {
		get current() {
			return parentName.current || orphan.current || undefined
		},
	}
}
