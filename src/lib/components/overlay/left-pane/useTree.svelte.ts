import { type Entity, Not, type World } from 'koota'
import { createSubscriber } from 'svelte/reactivity'

import { relations, traits, useWorld } from '$lib/ecs'

export interface TreeNode {
	entity: Entity
	children?: TreeNode[]
}

const compareByName = (a: Entity, b: Entity): number =>
	(a.get(traits.Name) ?? '').localeCompare(b.get(traits.Name) ?? '')

const buildTree = (world: World): TreeNode[] => {
	const walk = (entity: Entity): TreeNode => {
		const node: TreeNode = { entity }

		const children = world.query(relations.ChildOf(entity)).toSorted(compareByName)
		if (children.length > 0) {
			node.children = children.map((child) => walk(child))
		}

		return node
	}

	const rootEntities: Entity[] = []
	for (const entity of world.query(traits.Name, Not(traits.Orphan))) {
		if (entity.targetFor(relations.ChildOf)) continue
		rootEntities.push(entity)
	}
	rootEntities.sort(compareByName)

	return rootEntities.map((entity) => walk(entity))
}

/**
 * Reactive top-down tree built from `ChildOf` relations. Rebuilds when any
 * named entity is added, removed, renamed, or gains/loses a `ChildOf` or
 * `Orphan` edge. Orphans are hidden from the tree — they reappear once
 * `provideHierarchy` resolves them to a real `ChildOf` parent.
 */
export const useTree = (): { readonly current: TreeNode[] } => {
	const world = useWorld()

	let cached: TreeNode[] | undefined
	let dirty = true

	const subscribe = createSubscriber((update) => {
		const invalidate = () => {
			dirty = true
			update()
		}

		const unsubs = [
			world.onAdd(traits.Name, invalidate),
			world.onRemove(traits.Name, invalidate),
			world.onChange(traits.Name, invalidate),
			world.onAdd(relations.ChildOf, invalidate),
			world.onChange(relations.ChildOf, invalidate),
			world.onRemove(relations.ChildOf, invalidate),
			world.onAdd(traits.Orphan, invalidate),
			world.onRemove(traits.Orphan, invalidate),
		]

		return () => {
			for (const unsub of unsubs) unsub()
		}
	})

	return {
		get current() {
			subscribe()
			if (dirty || !cached) {
				cached = buildTree(world)
				dirty = false
			}
			return cached
		},
	}
}
