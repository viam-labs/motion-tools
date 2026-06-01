import { type Entity, trait } from 'koota'

import { relations, traits, useQuery, useWorld } from '$lib/ecs'

import { useEnvironment } from '../../hooks/useEnvironment.svelte'

const HiddenByFocus = trait()

export const provideFocus = () => {
	const world = useWorld()
	const environment = useEnvironment()
	const selected = useQuery(traits.Selected)

	$effect(() => {
		// Re-run when selection changes mid-focus, not just when focus toggles.
		const selectedEntities = selected.current

		if (!environment.current.focusing) {
			for (const entity of world.query(HiddenByFocus)) {
				entity.remove(HiddenByFocus, traits.Invisible)
			}
			return
		}

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
		 * Reveal anything we previously hid that now belongs to a kept subtree
		 * (e.g. the selection changed while focus was active).
		 */
		for (const entity of world.query(HiddenByFocus)) {
			if (keep.has(entity)) {
				entity.remove(HiddenByFocus, traits.Invisible)
			}
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
