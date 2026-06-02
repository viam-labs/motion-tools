import { type Entity, trait } from 'koota'
import { untrack } from 'svelte'

import { relations, traits, useQuery, useWorld } from '$lib/ecs'

const HiddenByFocus = trait()

export const provideFocus = (focusing: () => boolean) => {
	const world = useWorld()
	const selected = useQuery(traits.Selected)

	$effect(() => {
		if (!focusing()) {
			for (const entity of world.query(HiddenByFocus)) {
				entity.remove(HiddenByFocus, traits.Invisible)
			}

			return
		}

		/**
		 * Snapshot the selection at the moment focus is entered. Reading it
		 * untracked makes `focusing()` this effect's only dependency, so the
		 * focused view stays frozen: selecting or deselecting entities while
		 * focused must not change what's hidden. Everything is restored when
		 * focus exits.
		 */
		const selectedEntities = untrack(() => selected.current)

		/**
		 * Entities only render when their `InheritedInvisible` is unset, and that
		 * trait is computed by walking `ChildOf` ancestors (see
		 * `useInheritedInvisible`). So hiding a selected entity's parent — or its
		 * renderable sub-entities, which are `ChildOf` children that never carry
		 * `Selected` — makes the selection itself disappear. Keep the whole
		 * connected subtree of each selection visible: its ancestors (so the
		 * cascade can't reach it) and its descendants (so its geometry shows).
		 */
		const keep = new Set<Entity>()

		const keepSubtree = (entity: Entity) => {
			if (keep.has(entity)) return
			keep.add(entity)
			for (const child of world.query(relations.ChildOf(entity))) {
				keepSubtree(child)
			}
		}

		for (const entity of selectedEntities) {
			let ancestor = entity.targetFor(relations.ChildOf)
			while (ancestor?.isAlive()) {
				keep.add(ancestor)
				ancestor = ancestor.targetFor(relations.ChildOf)
			}
			keepSubtree(entity)
		}

		/**
		 * Hide the rest. Skip already-invisible entities so we don't take
		 * ownership of — and later wrongly reveal — user-hidden entities.
		 */
		for (const entity of world.query(traits.Name)) {
			if (keep.has(entity)) continue
			if (!entity.has(traits.Invisible)) {
				entity.add(HiddenByFocus, traits.Invisible)
			}
		}
	})
}
