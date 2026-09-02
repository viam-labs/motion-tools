import type { DecodeBudget, DecodeResult, PendingTransformChanges } from './pendingTransformChanges'

import { mergeChange } from './coalesceTransformChanges'
import { decodeTransformChange } from './decodeTransformChange'

/**
 * Decodes raw stream buffers from the front of `queue` in FIFO order, merging each decoded
 * change into `pending`, until the queue empties or `budget` runs out. A buffer that fails to
 * decode, or decodes to no change, still counts as consumed so one corrupt frame cannot wedge
 * the queue. Consumed buffers are removed from `queue` with a single splice.
 */
export const decodeRawChanges = (
	queue: Uint8Array[],
	pending: PendingTransformChanges,
	budget: DecodeBudget
): DecodeResult => {
	const start = budget.now()
	let consumed = 0

	for (const bytes of queue) {
		let change
		try {
			change = decodeTransformChange(bytes)
		} catch {
			change = undefined
		}
		if (change) mergeChange(pending, change)
		consumed += 1

		if (budget.now() - start > budget.budgetMs) break
	}

	queue.splice(0, consumed)

	return { decoded: consumed, remaining: queue.length }
}
