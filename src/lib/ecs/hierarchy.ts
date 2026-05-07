import {
	type ConfigurableTrait,
	type Entity,
	type QueryResult,
	type Trait,
	type World,
} from 'koota'

import { ChildOf } from './relations'
import { Name, Orphan } from './traits'

/**
 * Trait list for `world.spawn(...)`. Always emits `Orphan(name)` for non-root
 * parents; the hierarchy resolver (`provideHierarchy`) swaps it to
 * `ChildOf(parentEntity)` once a frame with that name exists. Returns `[]`
 * for the world root (`undefined`, `''`, or `'world'`).
 */
export const parentTraits = (name: string | undefined): ConfigurableTrait[] => {
	if (!name || name === 'world') return []
	return [Orphan(name)]
}

/**
 * Set or clear an entity's parent. Strips any existing `ChildOf` or `Orphan`,
 * then writes `Orphan(name)` (the resolver converts it to `ChildOf` on the
 * next reactive flush). Pass `undefined` or `'world'` to detach to root.
 */
export const setParent = (entity: Entity, name: string | undefined): void => {
	const target = entity.targetFor(ChildOf)
	if (target) entity.remove(ChildOf(target))
	entity.remove(Orphan)

	if (!name || name === 'world') return
	entity.add(Orphan(name))
}

/** The parent entity, or `undefined` at the world root or while orphaned. */
export const getParentEntity = (entity: Entity): Entity | undefined => entity.targetFor(ChildOf)

/**
 * The parent's name string. Reads through `ChildOf` first, falls back to
 * `Orphan(name)` while the parent isn't present. Returns `undefined` for
 * world-root entities.
 */
export const getParentName = (entity: Entity): string | undefined => {
	const parent = entity.targetFor(ChildOf)
	if (parent && parent.isAlive()) return parent.get(Name)
	const orphanFor = entity.get(Orphan)
	return orphanFor || undefined
}

/**
 * Destroy an entity and every `ChildOf` descendant, depth-first. Use for
 * sub-trees whose lifetimes are tied together (e.g. a model root and its
 * GLTF assets). General frame removal should use `entity.destroy()` so
 * children survive as orphans.
 */
export const destroyEntityTree = (world: World, entity: Entity): void => {
	if (!entity.isAlive()) return
	for (const child of world.query(ChildOf(entity))) {
		destroyEntityTree(world, child)
	}
	entity.destroy()
}

/**
 * Synchronously resolve every `Orphan` whose desired parent now exists in
 * the world. Called by `provideHierarchy` when the orphan/named query sets
 * change or when a `Name` is renamed; also exposed for tests so they can
 * drive resolution without mounting a component.
 */
export const resolveOrphans = (
	named: QueryResult<[Trait<() => string>]>,
	orphans: QueryResult<[Trait<() => string>]>
): void => {
	const index = new Map<string, Entity>()

	for (const entity of named) {
		const name = entity.get(Name)
		if (name) index.set(name, entity)
	}

	for (const orphan of orphans) {
		const wantedName = orphan.get(Orphan)
		if (!wantedName) continue
		const parent = index.get(wantedName)
		if (!parent) continue
		orphan.remove(Orphan)
		orphan.add(ChildOf(parent))
	}
}
