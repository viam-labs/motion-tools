import { type Entity, type World } from 'koota'
import { Matrix4, Vector3 } from 'three'

import { composeLocalMatrix } from '$lib/transform'

import { ChildOf } from './relations'
import { EditedMatrix, LiveMatrix, Matrix, Scale, WorldMatrix } from './traits'

const scaleVec3 = new Vector3()

/**
 * Compute the entity's local-to-parent transform into `out`. Mirrors the
 * blend used by `Frame.svelte` so `WorldMatrix` agrees with the displayed
 * scenegraph.
 *
 * - All three matrix traits present: `live × baseline⁻¹ × edited`.
 * - Otherwise: prefer `EditedMatrix` over `Matrix`.
 *
 * Returns `true` after writing to `out`; returns `false` and leaves `out`
 * untouched when the entity has no matrix-shaped trait.
 */
const toLocalMatrix = (entity: Entity, out: Matrix4): boolean => {
	const matrix = entity.get(Matrix)
	const editedMatrix = entity.get(EditedMatrix)
	const liveMatrix = entity.get(LiveMatrix)

	if (liveMatrix && matrix && editedMatrix) {
		composeLocalMatrix(liveMatrix, matrix, editedMatrix, out)
		return true
	}

	if (editedMatrix) {
		out.copy(editedMatrix)
		return true
	}

	if (matrix) {
		out.copy(matrix)
		return true
	}

	return false
}

/**
 * Synchronously compute and write `WorldMatrix` for every entity in `dirty`
 * and every descendant via `ChildOf`. Memoizes per-entity world matrices in
 * `cache` so siblings reuse a parent's result. Caller passes a fresh `cache`
 * map per flush.
 */
const recomputeWorldMatrix = (
	world: World,
	entity: Entity,
	cache: Map<Entity, Matrix4>
): Matrix4 | undefined => {
	if (!entity.isAlive()) return undefined

	const cached = cache.get(entity)
	if (cached) return cached

	// Reuse the entity's existing `WorldMatrix` storage when present so a
	// flush doesn't allocate a throwaway matrix per entity. First-time
	// entities get a fresh `Matrix4` that's added as the trait below.
	const out = entity.get(WorldMatrix) ?? new Matrix4()
	const hasLocal = toLocalMatrix(entity, out)
	if (!hasLocal) out.identity()

	const scale = entity.get(Scale)
	if (scale) {
		out.scale(scaleVec3.copy(scale))
	}

	const parent = entity.targetFor(ChildOf)
	if (parent && parent.isAlive()) {
		const parentWorld = recomputeWorldMatrix(world, parent, cache)
		if (parentWorld) out.premultiply(parentWorld)
	}

	cache.set(entity, out)
	return out
}

const flushDirty = (world: World, dirty: Set<Entity>) => {
	if (dirty.size === 0) return

	const cache = new Map<Entity, Matrix4>()
	const expanded = new Set<Entity>()

	const collect = (entity: Entity) => {
		if (expanded.has(entity)) return
		expanded.add(entity)
		for (const child of world.query(ChildOf(entity))) {
			collect(child)
		}
	}

	for (const entity of dirty) collect(entity)
	dirty.clear()

	for (const entity of expanded) {
		if (!entity.isAlive()) continue
		const worldMat = recomputeWorldMatrix(world, entity, cache)
		if (!worldMat) continue
		if (entity.has(WorldMatrix)) {
			entity.changed(WorldMatrix)
		} else {
			entity.add(WorldMatrix(worldMat))
		}
	}
}

/**
 * Wire up listeners that maintain `WorldMatrix` reactively. Subscribes to
 * add/change/remove on `Matrix`, `EditedMatrix`, `LiveMatrix`, `Scale`, and
 * `ChildOf`; enqueues affected entities and flushes on the next microtask.
 *
 * Returns an unsubscribe function. Plain function (not a rune hook) so tests
 * can drive the lifecycle without mounting Svelte.
 */
export const installWorldMatrixListeners = (world: World): (() => void) => {
	const dirty = new Set<Entity>()
	let scheduled = false

	const enqueue = (entity: Entity) => {
		dirty.add(entity)
		if (scheduled) return
		scheduled = true
		queueMicrotask(() => {
			scheduled = false
			flushDirty(world, dirty)
		})
	}

	for (const entity of world.query(Matrix)) enqueue(entity)
	for (const entity of world.query(EditedMatrix)) enqueue(entity)
	for (const entity of world.query(LiveMatrix)) enqueue(entity)
	for (const entity of world.query(Scale)) enqueue(entity)

	const unsubs = [
		world.onAdd(Matrix, enqueue),
		world.onChange(Matrix, enqueue),
		world.onRemove(Matrix, enqueue),
		world.onAdd(EditedMatrix, enqueue),
		world.onChange(EditedMatrix, enqueue),
		world.onRemove(EditedMatrix, enqueue),
		world.onAdd(LiveMatrix, enqueue),
		world.onChange(LiveMatrix, enqueue),
		world.onRemove(LiveMatrix, enqueue),
		world.onAdd(Scale, enqueue),
		world.onChange(Scale, enqueue),
		world.onRemove(Scale, enqueue),
		world.onAdd(ChildOf, enqueue),
		world.onChange(ChildOf, enqueue),
		world.onRemove(ChildOf, enqueue),
	]

	return () => {
		for (const unsub of unsubs) unsub()
	}
}
