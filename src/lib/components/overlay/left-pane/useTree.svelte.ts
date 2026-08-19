import { type Entity, IsExcluded, Not, type World } from 'koota'
import { createSubscriber } from 'svelte/reactivity'

import { relations, traits, useWorld } from '$lib/ecs'
import { type Settings, useSettings } from '$lib/hooks/useSettings.svelte'

import { treeSections } from './treeSections'

export interface TreeNode {
	entity: Entity
	children?: TreeNode[]
	/** Section header. Backed by a synthetic entity with no scene presence. */
	isSection?: boolean
	/** Name of the `ChildOf` parent when it sits in another section. */
	detachedParent?: string
}

interface Tree {
	nodes: TreeNode[]
	/** Child value to parent value, following drawn edges rather than `ChildOf`. */
	parents: Map<string, string>
}

const collator = new Intl.Collator()

const compareByName = (a: Entity, b: Entity): number =>
	collator.compare(a.get(traits.Name) ?? '', b.get(traits.Name) ?? '')

const buildHierarchy = (world: World): Tree => {
	const parents = new Map<string, string>()

	const walk = (entity: Entity): TreeNode => {
		const node: TreeNode = { entity }

		const children = world.query(relations.ChildOf(entity)).toSorted(compareByName)
		if (children.length > 0) {
			node.children = children.map((child) => {
				parents.set(`${child}`, `${entity}`)
				return walk(child)
			})
		}

		return node
	}

	const rootEntities: Entity[] = []
	for (const entity of world.query(traits.Name, Not(traits.Orphan))) {
		if (entity.targetFor(relations.ChildOf)) continue
		rootEntities.push(entity)
	}
	rootEntities.sort(compareByName)

	return { nodes: rootEntities.map((entity) => walk(entity)), parents }
}

const otherSection = treeSections.length - 1

const ownSection = (entity: Entity): number | undefined => {
	for (const [index, section] of treeSections.entries()) {
		for (const source of section.sources) {
			if (entity.has(source)) return index
		}
	}

	return undefined
}

const buildSections = (world: World, headers: Entity[]): Tree => {
	const parents = new Map<string, string>()
	const entities = world.query(traits.Name, Not(traits.Orphan))
	const rows = new Set<Entity>(entities)

	const sections = new Map<Entity, number>()

	/**
	 * An entity with no source trait takes its parent's section, so untagged
	 * sub-entities (model assets, geometry children) stay with what they belong to.
	 */
	const sectionFor = (entity: Entity): number => {
		const chain: Entity[] = []
		let cursor: Entity | undefined = entity
		let resolved: number | undefined

		while (cursor) {
			resolved = sections.get(cursor) ?? ownSection(cursor)
			if (resolved !== undefined) break

			chain.push(cursor)
			const parent: Entity | undefined = cursor.targetFor(relations.ChildOf)
			// A `ChildOf` cycle is pathological (`recomputeWorldMatrix` warns on one)
			// but would spin this walk forever.
			cursor = parent?.isAlive() && !chain.includes(parent) ? parent : undefined
		}

		resolved ??= otherSection
		if (cursor) sections.set(cursor, resolved)
		for (const link of chain) sections.set(link, resolved)

		return resolved
	}

	const childrenOf = new Map<Entity, Entity[]>()
	const sectionRoots: Entity[][] = treeSections.map(() => [])

	for (const entity of entities) {
		const section = sectionFor(entity)
		const parent = entity.targetFor(relations.ChildOf)

		// Edges that leave a section aren't drawn. The relation itself is untouched,
		// so world matrices and the visibility cascade still compose through it.
		if (parent && rows.has(parent) && sectionFor(parent) === section) {
			const siblings = childrenOf.get(parent)
			if (siblings) siblings.push(entity)
			else childrenOf.set(parent, [entity])
		} else {
			sectionRoots[section].push(entity)
		}
	}

	const walk = (entity: Entity): TreeNode => {
		const node: TreeNode = { entity }
		const children = childrenOf.get(entity)

		if (children) {
			children.sort(compareByName)
			node.children = children.map((child) => {
				parents.set(`${child}`, `${entity}`)
				return walk(child)
			})
		}

		return node
	}

	const nodes: TreeNode[] = []

	for (const [index, header] of headers.entries()) {
		const roots = sectionRoots[index]
		if (roots.length === 0) continue

		roots.sort(compareByName)

		nodes.push({
			entity: header,
			isSection: true,
			children: roots.map((entity) => {
				parents.set(`${entity}`, `${header}`)

				const node = walk(entity)
				const parent = entity.targetFor(relations.ChildOf)
				const detached = parent?.isAlive() ? parent.get(traits.Name) : undefined
				if (detached) node.detachedParent = detached

				return node
			}),
		})
	}

	return { nodes, parents }
}

/**
 * Reactive scene tree, either grouped into `treeSections` or as the raw
 * top-down `ChildOf` hierarchy. Rebuilds when any named entity is added,
 * removed, renamed, or gains/loses a `ChildOf` or `Orphan` edge; rebuild
 * notifications are throttled (see below) so bursts of world-state churn stay
 * off the frame budget. Orphans are hidden from the tree — they reappear once
 * `provideHierarchy` resolves them to a real `ChildOf` parent.
 */
export const useTree = (): {
	readonly current: TreeNode[]
	readonly parents: Map<string, string>
} => {
	const world = useWorld()
	const settings = useSettings()

	// `IsExcluded` keeps the headers out of every query, including this hook's own.
	const headers = treeSections.map((section) => world.spawn(IsExcluded, traits.Name(section.name)))

	let cached: Tree | undefined
	let cachedGrouping: Settings['treeGrouping'] | undefined
	let dirty = true

	const subscribe = createSubscriber((update) => {
		// The world-state stream can add or remove dozens of entities per second.
		// Rebuilding and reconciling the whole tree on every ECS event dominates the
		// frame budget, so coalesce notifications to a human-readable rate: fire on
		// the leading edge, then at most once per interval with a trailing flush.
		// `dirty` is still set eagerly, so the next read always reflects the current
		// world state.
		let timer: ReturnType<typeof setTimeout> | undefined
		let trailing = false

		const flush = () => {
			update()
			timer = setTimeout(() => {
				timer = undefined
				if (trailing) {
					trailing = false
					flush()
				}
			}, 100)
		}

		const invalidate = () => {
			dirty = true
			if (timer === undefined) {
				flush()
			} else {
				trailing = true
			}
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
			if (timer !== undefined) clearTimeout(timer)
			for (const unsub of unsubs) unsub()
		}
	})

	const read = (): Tree => {
		subscribe()

		const grouping = settings.current.treeGrouping
		if (dirty || !cached || cachedGrouping !== grouping) {
			cached = grouping === 'sections' ? buildSections(world, headers) : buildHierarchy(world)
			cachedGrouping = grouping
			dirty = false
		}

		return cached
	}

	return {
		get current() {
			return read().nodes
		},
		get parents() {
			return read().parents
		},
	}
}
