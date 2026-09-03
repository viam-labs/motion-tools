import type { ApplyOutcome, DrainResult, FlushBudget } from './pendingTransformChanges'

/**
 * Applies pending changes in insertion order until the map drains or a budget is hit.
 * Deletes each entry before applying it, so an `apply` that throws drops its entry
 * instead of wedging the queue on the next flush. Generic over the entry so the same
 * drain serves a map of decoded changes and a map of worker batch entries.
 */
export const drainWithBudget = <TChange>(
	pending: Map<string, TChange>,
	apply: (uuid: string, change: TChange) => ApplyOutcome,
	budget: FlushBudget
): DrainResult => {
	const start = budget.now()
	let applied = 0
	let spawns = 0
	let exhausted: DrainResult['exhausted']

	for (const [uuid, change] of pending) {
		pending.delete(uuid)
		const outcome = apply(uuid, change)
		applied += 1
		if (outcome.spawned) spawns += 1

		if (spawns >= budget.maxSpawns) {
			exhausted = 'spawns'
			break
		}
		if (budget.now() - start > budget.budgetMs) {
			exhausted = 'budget'
			break
		}
	}

	return { applied, spawns, remaining: pending.size, exhausted }
}
