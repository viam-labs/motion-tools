import type { Transform } from '$lib/buf/common/v1/common_pb'

import { TransformChangeType } from '$lib/buf/service/worldstatestore/v1/world_state_store_pb'

import {
	type IncomingChange,
	type PendingChange,
	type PendingTransformChanges,
	topLevelField,
	type TransformField,
} from './pendingTransformChanges'

/**
 * Merge one incoming transform-change event into the pending buffer, keyed by `uuid`.
 *
 * Two partial `UPDATED`s combine into one carrying the union of their fields, so a delta that
 * only touches `metadata` cannot clobber a pose carried by an earlier pending delta. An `ADDED`
 * that follows a pending `REMOVED` replaces it outright: the store's stable UUID strategy makes
 * a poll republish look like a respawn, and the newer state always wins.
 *
 * `Map.set` on an existing key keeps its original position, so cross-UUID insertion order
 * (parents ahead of children) survives coalescing.
 */
export const mergeChange = (pending: PendingTransformChanges, event: IncomingChange): void => {
	const uuid = event.uuid
	const existing = pending.get(uuid)

	if (!existing) {
		pending.set(uuid, {
			changeType: event.changeType,
			transform: event.transform,
			fields: fieldsOf(event),
		})
		return
	}

	switch (existing.changeType) {
		case TransformChangeType.ADDED: {
			mergeIntoAdded(pending, uuid, existing, event)
			return
		}
		case TransformChangeType.UPDATED: {
			mergeIntoUpdated(pending, uuid, existing, event)
			return
		}
		default: {
			mergeIntoRemoved(pending, uuid, event)
			return
		}
	}
}

/**
 * The top-level fields an event carries, or `undefined` for full state: an ADDED, a REMOVED, or
 * an UPDATED whose mask is missing or resolves to no known field.
 */
const fieldsOf = (event: IncomingChange): Set<TransformField> | undefined => {
	if (event.changeType !== TransformChangeType.UPDATED) return undefined

	const fields = new Set<TransformField>()
	for (const path of event.updatedFields?.paths ?? []) {
		const field = topLevelField(path)
		if (field !== undefined) fields.add(field)
	}
	return fields.size > 0 ? fields : undefined
}

/** Copy each field in `fields` from `source` onto `target`, in place. Never mutates `source`. */
const copyFields = (target: Transform, source: Transform, fields: Set<TransformField>): void => {
	for (const field of fields) {
		if (field === 'uuid') continue
		target[field] = source[field] as never
	}
}

const asFullState = (event: IncomingChange): PendingChange => ({
	changeType: event.changeType,
	transform: event.transform,
	fields: undefined,
})

const mergeIntoAdded = (
	pending: PendingTransformChanges,
	uuid: string,
	existing: PendingChange,
	event: IncomingChange
): void => {
	if (event.changeType === TransformChangeType.UPDATED) {
		const fields = fieldsOf(event)
		if (fields === undefined) {
			// Full-state UPDATED replaces the transform but the pending change is still an ADDED.
			pending.set(uuid, {
				changeType: TransformChangeType.ADDED,
				transform: event.transform,
				fields: undefined,
			})
			return
		}
		copyFields(existing.transform, event.transform, fields)
		return
	}

	// ADDED replaces the pending transform outright; REMOVED replaces the change type too.
	pending.set(uuid, asFullState(event))
}

const mergeIntoUpdated = (
	pending: PendingTransformChanges,
	uuid: string,
	existing: PendingChange,
	event: IncomingChange
): void => {
	if (event.changeType === TransformChangeType.UPDATED) {
		const fields = fieldsOf(event)
		if (fields === undefined) {
			pending.set(uuid, asFullState(event))
			return
		}
		copyFields(existing.transform, event.transform, fields)
		// A full-state pending UPDATED (fields undefined) absorbs any partial: it already
		// covers every field, so unioning in P would wrongly narrow it to just P.
		if (existing.fields !== undefined) existing.fields = new Set([...existing.fields, ...fields])
		return
	}

	// ADDED and REMOVED both replace outright; only the resulting changeType differs.
	pending.set(uuid, asFullState(event))
}

/** A pending REMOVED is a fully gone entity: only a fresh ADDED brings it back. */
const mergeIntoRemoved = (
	pending: PendingTransformChanges,
	uuid: string,
	event: IncomingChange
): void => {
	if (event.changeType !== TransformChangeType.ADDED) return
	pending.set(uuid, asFullState(event))
}
