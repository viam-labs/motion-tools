import { type Entity, type World } from 'koota'

import type { Relationship } from '$lib/metadata'

import { uuidBytesToString } from '$lib/draw'
import { relations } from '$lib/ecs'

interface CachedLink {
	type: string
	indexMapping: string
}

interface PendingLink {
	entity: Entity
	type: string
	indexMapping: string
}

const normalize = (rel: Relationship): CachedLink => ({
	type: rel.type,
	indexMapping: rel.indexMapping ?? 'index',
})

const linkEqual = (a: CachedLink, b: CachedLink) =>
	a.type === b.type && a.indexMapping === b.indexMapping

/**
 * Tracks the relationship set the draw service has authored on each source
 * entity, so that incoming stream events only mutate `SubEntityLink`s the
 * server itself owns. Client-added links (e.g. interactive HoverLinks from
 * the Details overlay) are invisible to this diff and never touched.
 */
export const createServerRelationships = (
	_world: World,
	lookupByUuid: (uuid: string) => Entity | undefined
) => {
	const cache = new Map<string, Map<string, CachedLink>>()
	const pending = new Map<string, PendingLink[]>()

	const addPending = (targetUuid: string, link: PendingLink) => {
		const next = pending.get(targetUuid) ?? []
		next.push(link)
		pending.set(targetUuid, next)
	}

	return {
		apply(sourceEntity: Entity, sourceUuid: string, incoming: Relationship[] | undefined) {
			const desired = new Map<string, CachedLink>()
			for (const rel of incoming ?? []) {
				const targetUuid = uuidBytesToString(rel.targetUuid)
				if (!targetUuid) continue
				desired.set(targetUuid, normalize(rel))
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
				if (before && linkEqual(before, link)) continue

				const target = lookupByUuid(targetUuid)
				if (!target) {
					addPending(targetUuid, { entity: sourceEntity, ...link })
					continue
				}
				sourceEntity.add(relations.SubEntityLink(target, link))
			}

			if (desired.size === 0) cache.delete(sourceUuid)
			else cache.set(sourceUuid, desired)
		},

		flush(targetUuid: string) {
			const queued = pending.get(targetUuid)
			if (!queued) return
			pending.delete(targetUuid)

			const target = lookupByUuid(targetUuid)
			if (!target?.isAlive()) return

			for (const { entity, type, indexMapping } of queued) {
				if (!entity.isAlive()) continue
				entity.add(relations.SubEntityLink(target, { type, indexMapping }))
			}
		},

		forget(sourceUuid: string) {
			cache.delete(sourceUuid)
		},

		clear() {
			cache.clear()
			pending.clear()
		},
	}
}
