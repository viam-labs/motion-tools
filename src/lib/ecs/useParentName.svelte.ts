import type { Entity } from 'koota'

import { ChildOf } from './relations'
import { Name, Orphan } from './traits'
import { useWorld } from './useWorld'

/**
 * Reactive view of an entity's parent name — the string consumed by Threlte
 * `<Portal id={...}>` and other lookups that key off the parent's `Name`.
 *
 * Reads `ChildOf` target's `Name` when the parent is alive, else falls back
 * to `Orphan(parentName)`. Subscribes to `ChildOf` add/change/remove for the
 * entity, `Orphan` add/change/remove for the entity, and `Name`
 * change/remove on whatever the current `ChildOf` target is.
 */
export const useParentName = (
	target: () => Entity | undefined
): { current: string | undefined } => {
	const world = useWorld()
	const entity = $derived(target())

	const compute = (e: Entity | undefined): string | undefined => {
		if (!e) return undefined
		const parent = e.targetFor(ChildOf)
		if (parent && parent.isAlive()) return parent.get(Name)
		const orphanFor = e.get(Orphan)
		return orphanFor || undefined
	}

	let value = $derived(compute(entity))

	$effect(() => {
		if (!entity) return

		const recompute = () => {
			value = compute(entity)
		}

		const matchesEntity = (e: Entity) => e === entity
		const isParentOfEntity = (e: Entity) => e === entity.targetFor(ChildOf)

		const unsubs = [
			world.onAdd(ChildOf, (e) => {
				if (matchesEntity(e)) recompute()
			}),
			world.onChange(ChildOf, (e) => {
				if (matchesEntity(e)) recompute()
			}),
			world.onRemove(ChildOf, (e) => {
				if (matchesEntity(e)) recompute()
			}),
			world.onAdd(Orphan, (e) => {
				if (matchesEntity(e)) recompute()
			}),
			world.onChange(Orphan, (e) => {
				if (matchesEntity(e)) recompute()
			}),
			world.onRemove(Orphan, (e) => {
				if (matchesEntity(e)) recompute()
			}),
			world.onChange(Name, (e) => {
				if (isParentOfEntity(e)) recompute()
			}),
			world.onRemove(Name, (e) => {
				if (isParentOfEntity(e)) recompute()
			}),
		]

		return () => {
			for (const unsub of unsubs) unsub()
		}
	})

	return {
		get current() {
			return value
		},
	}
}
