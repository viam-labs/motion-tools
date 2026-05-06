import { resolveOrphans } from './hierarchy'
import { Name, Orphan } from './traits'
import { useQuery } from './useQuery.svelte'
import { useWorld } from './useWorld'

/**
 * Mounts the hierarchy resolver: each tick, any entity with `Orphan(name)`
 * whose desired parent is now in the world is converted to
 * `ChildOf(parentEntity)`. Call once at the top of the app, alongside the
 * other `provide*` hooks.
 *
 * Reactive on:
 *   - `useQuery(Orphan)` membership — new orphans appear or resolve away
 *   - `useQuery(Name)` membership — new candidate parents appear/disappear
 *   - `world.onChange(Name)` — an existing entity is renamed into a name
 *     that some orphan is waiting for
 *
 * Children whose `ChildOf` parent is destroyed are *not* automatically
 * re-orphaned. Call `hierarchy.setParent` on the affected children
 * explicitly if you need them to reattach to a same-named replacement.
 */
export const provideHierarchy = (): void => {
	const world = useWorld()
	const orphans = useQuery(Orphan)
	const named = useQuery(Name)

	$effect(() => {
		// Touch both queries so this effect re-runs on membership changes.
		// eslint-disable-next-line @typescript-eslint/no-unused-expressions
		orphans.current
		// eslint-disable-next-line @typescript-eslint/no-unused-expressions
		named.current
		resolveOrphans(world)
	})

	$effect(() => {
		return world.onChange(Name, () => resolveOrphans(world))
	})
}
