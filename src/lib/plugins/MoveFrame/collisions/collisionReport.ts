import type { Entity } from 'koota'

import { traits } from '$lib/ecs'

import type { CollisionReport } from './collisionStore.svelte'
import type { CollisionPair } from './collisionWorld'

import { GhostOf } from '../relations'
import { PreviewOf } from '../traits'
import { isGhost } from './collisionMembers'

/**
 * What to call an entity in the panel. A ghost has no `Name` of its own, so it
 * borrows its subject's — the pair reads "gripper ↔ table" whether it describes
 * where the gripper is or where it would end up, and `staged` carries the
 * difference.
 *
 * Two kinds of ghost, and they carry the answer differently: a staged-move ghost
 * points at the entity it copies, while a preview ghost holds the component name
 * outright, having no source entity to point at. Missing the second one left
 * every previewed collision reading as the literal `unnamed`.
 */
const displayName = (entity: Entity): string => {
	const own = entity.get(traits.Name)
	if (own) return own

	const previewed = entity.get(PreviewOf)
	if (previewed) return previewed

	const source = entity.targetFor(GhostOf)
	const sourceName = source?.isAlive() ? source.get(traits.Name) : undefined
	return sourceName ?? 'unnamed'
}

/**
 * Turn detected pairs into what the panel renders, collapsing duplicates.
 *
 * Two colliders can share a display name, since an arm's links all label as the component
 * when unnamed, so the same pair of names can arrive more than once in a single pass. Sides
 * are ordered by name so a pair keys the same regardless of which collider Rapier reported
 * it from.
 */
export const toReports = (pairs: readonly CollisionPair[]): CollisionReport[] => {
	const byKey = new Map<string, CollisionReport>()

	for (const { a, b } of pairs) {
		const staged = isGhost(a) || isGhost(b)
		const [first, second] = [displayName(a), displayName(b)].toSorted()
		if (first === undefined || second === undefined) continue

		const key = `${staged ? 'staged' : 'live'}:${first}-${second}`
		if (byKey.has(key)) continue
		byKey.set(key, { a: first, b: second, staged })
	}

	// Staged pairs first: a move that would collide is the more urgent warning.
	return [...byKey.values()].toSorted((x, y) => Number(y.staged) - Number(x.staged))
}
