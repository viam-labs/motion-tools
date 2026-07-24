import { describe, expect, it } from 'vitest'

import { reconcileWorldState } from '$lib/hooks/reconcileWorldState'

describe('reconcileWorldState', () => {
	it.each<{
		name: string
		snapshot: Iterable<string>
		rendered: Iterable<string>
		toAdd: string[]
		toRemove: string[]
	}>([
		{
			name: 'adds snapshot-only UUIDs and removes rendered-only UUIDs, keeping the intersection',
			snapshot: ['B', 'C'],
			rendered: ['A', 'B'],
			toAdd: ['C'],
			toRemove: ['A'],
		},
		{
			name: 'adds everything on initial mount (nothing rendered yet)',
			snapshot: ['A', 'B'],
			rendered: [],
			toAdd: ['A', 'B'],
			toRemove: [],
		},
		{
			name: 'is a no-op when snapshot and rendered match',
			snapshot: ['A'],
			rendered: ['A'],
			toAdd: [],
			toRemove: [],
		},
		{
			name: 'removes everything when the snapshot is empty',
			snapshot: [],
			rendered: ['A', 'B'],
			toAdd: [],
			toRemove: ['A', 'B'],
		},
		{
			name: 'accepts any iterable and de-duplicates the snapshot in toAdd',
			snapshot: new Set(['A', 'B']),
			rendered: new Set(['A']),
			toAdd: ['B'],
			toRemove: [],
		},
		{
			name: 'preserves snapshot iteration order in toAdd',
			snapshot: ['C', 'A', 'B'],
			rendered: [],
			toAdd: ['C', 'A', 'B'],
			toRemove: [],
		},
	])('$name', ({ snapshot, rendered, toAdd, toRemove }) => {
		const result = reconcileWorldState(snapshot, rendered)
		expect(result.toAdd).toEqual(toAdd)
		expect(result.toRemove).toEqual(toRemove)
	})
})
