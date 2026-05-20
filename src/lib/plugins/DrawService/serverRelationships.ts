import type { Entity } from 'koota'

import type { Relationship } from '$lib/metadata'

import { uuidBytesToString } from '$lib/draw'
import { relations, traits, useQuery, useWorld } from '$lib/ecs'

interface CachedLink {
	type: string
	indexMapping: string
}

interface PendingLink {
	entity: Entity
	type: string
	indexMapping: string
}

/**
 * Diffs incoming server relationships against the last-known set per entity,
 * so only links the draw service itself authored are added or removed.
 * Client-added links (e.g. interactive HoverLinks from the Details overlay)
 * are left alone.
 */
export const createServerRelationships = () => {
	const world = useWorld()
	const uuidQuery = useQuery(traits.UUID)

	const cache = new Map<string, Map<string, CachedLink>>()
	const pending = new Map<string, PendingLink[]>()

	const lookupByUuid = (uuid: string) =>
		uuidQuery.current.find((entity) => entity.get(traits.UUID) === uuid)

	const unsubAdd = world.onAdd(traits.UUID, (target) => {
		const targetUuid = target.get(traits.UUID)
		if (!targetUuid) return

		const queued = pending.get(targetUuid)
		if (!queued) return
		pending.delete(targetUuid)

		if (!target.isAlive()) return

		for (const { entity, type, indexMapping } of queued) {
			if (!entity.isAlive()) continue
			entity.add(relations.SubEntityLink(target, { type, indexMapping }))
		}
	})

	return {
		apply(sourceEntity: Entity, sourceUuid: string, relationships: Relationship[] | undefined) {
			const desired = new Map<string, CachedLink>()

			for (const relationship of relationships ?? []) {
				const targetUuid = uuidBytesToString(relationship.targetUuid)
				if (!targetUuid) continue
				desired.set(targetUuid, {
					type: relationship.type,
					indexMapping: relationship.indexMapping ?? 'index',
				})
			}

			const previous = cache.get(sourceUuid) ?? new Map<string, CachedLink>()

			for (const targetUuid of previous.keys()) {
				if (desired.has(targetUuid)) continue
				const target = lookupByUuid(targetUuid)
				if (target?.isAlive()) {
					sourceEntity.remove(relations.SubEntityLink(target))
				}
			}

			for (const [targetUuid, link] of desired) {
				const before = previous.get(targetUuid)
				if (before?.type === link.type && before?.indexMapping === link.indexMapping) {
					continue
				}

				const target = lookupByUuid(targetUuid)
				if (!target) {
					const next = pending.get(targetUuid) ?? []
					next.push({ entity: sourceEntity, ...link })
					pending.set(targetUuid, next)

					continue
				}
				sourceEntity.add(relations.SubEntityLink(target, { ...link }))
			}

			if (desired.size === 0) {
				cache.delete(sourceUuid)
			} else {
				cache.set(sourceUuid, desired)
			}
		},

		forget(sourceUuid: string) {
			cache.delete(sourceUuid)
		},

		dispose() {
			unsubAdd()
			cache.clear()
			pending.clear()
		},
	}
}
