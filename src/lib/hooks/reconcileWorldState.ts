export interface WorldStateReconciliation {
	/** UUIDs present in the fresh snapshot but not yet rendered. */
	toAdd: string[]
	/** UUIDs currently rendered but absent from the fresh snapshot. */
	toRemove: string[]
}

/**
 * Diffs a fresh world-state snapshot against the currently rendered entity set.
 * Pure: callers own spawning/destroying and tombstone bookkeeping. Preserves
 * snapshot iteration order in `toAdd` and rendered iteration order in `toRemove`.
 * Duplicate UUIDs within either input collapse to a single entry, so a
 * duplicated snapshot UUID appears at most once in `toAdd`.
 */
export const reconcileWorldState = (
	snapshotUUIDs: Iterable<string>,
	renderedUUIDs: Iterable<string>
): WorldStateReconciliation => {
	const snapshot = new Set(snapshotUUIDs)
	const rendered = new Set(renderedUUIDs)

	const toAdd: string[] = []
	for (const uuid of snapshot) {
		if (!rendered.has(uuid)) toAdd.push(uuid)
	}

	const toRemove: string[] = []
	for (const uuid of rendered) {
		if (!snapshot.has(uuid)) toRemove.push(uuid)
	}

	return { toAdd, toRemove }
}
