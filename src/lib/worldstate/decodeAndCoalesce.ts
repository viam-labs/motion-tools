import { TransformChangeType } from '$lib/buf/service/worldstatestore/v1/world_state_store_pb'

import type { PendingTransformChanges } from './pendingTransformChanges'
import type { BatchChange } from './workerMessages'

import { mergeChange } from './coalesceTransformChanges'
import { decodeTransformChange } from './decodeTransformChange'

/**
 * Decodes every raw stream buffer and merges it into `pending`. A buffer that fails to decode,
 * or decodes to no change, is skipped without stopping the walk.
 *
 * @returns The number of buffers that produced a change.
 */
export const ingestBuffers = (buffers: Uint8Array[], pending: PendingTransformChanges): number => {
	let ingested = 0

	for (const bytes of buffers) {
		let change
		try {
			change = decodeTransformChange(bytes)
		} catch {
			change = undefined
		}
		if (!change) continue

		mergeChange(pending, change)
		ingested += 1
	}

	return ingested
}

/**
 * Drains `pending` into one batch entry per changed UUID, in insertion order, then clears the
 * map. An `UNSPECIFIED` change type is dropped: it means the pending state ended up describing
 * no actual change.
 */
export const drainToBatch = (pending: PendingTransformChanges): BatchChange[] => {
	const changes: BatchChange[] = []

	for (const [uuid, change] of pending) {
		if (change.changeType === TransformChangeType.REMOVED) {
			changes.push({ uuid, changeType: TransformChangeType.REMOVED })
			continue
		}

		if (change.changeType === TransformChangeType.UNSPECIFIED) continue

		changes.push({
			uuid,
			changeType: change.changeType,
			transform: change.transform.toBinary(),
			fields: change.fields ? [...change.fields] : undefined,
		})
	}

	pending.clear()

	return changes
}
