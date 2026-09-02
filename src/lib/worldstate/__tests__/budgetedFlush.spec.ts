import { describe, expect, it } from 'vitest'

import { TransformChangeType } from '$lib/buf/service/worldstatestore/v1/world_state_store_pb'

import type {
	ApplyOutcome,
	FlushBudget,
	PendingChange,
	PendingTransformChanges,
} from '../pendingTransformChanges'

import { drainWithBudget } from '../budgetedFlush'

// The drain never reads the transform, so a stub carrying only the key is enough.
const makeChange = (uuid: string): PendingChange => ({
	changeType: TransformChangeType.ADDED,
	transform: { uuid } as unknown as PendingChange['transform'],
	fields: undefined,
})

const makePending = (uuids: string[]): PendingTransformChanges =>
	new Map(uuids.map((uuid) => [uuid, makeChange(uuid)]))

const makeBudget = (overrides: Partial<FlushBudget> = {}): FlushBudget => ({
	now: () => 0,
	budgetMs: 6,
	maxSpawns: 16,
	...overrides,
})

describe('drainWithBudget', () => {
	it('drains a small map fully with no exhaustion reason', () => {
		const pending = makePending(['a', 'b', 'c'])

		const result = drainWithBudget(pending, () => ({ spawned: false }), makeBudget())

		expect(result).toEqual({ applied: 3, spawns: 0, remaining: 0, exhausted: undefined })
	})

	it('stops on the spawn cap after exactly maxSpawns spawning applies, leaving the rest', () => {
		const pending = makePending(['a', 'b', 'c', 'd', 'e'])

		const result = drainWithBudget(pending, () => ({ spawned: true }), makeBudget({ maxSpawns: 2 }))

		expect(result).toEqual({ applied: 2, spawns: 2, remaining: 3, exhausted: 'spawns' })
	})

	it('stops on the ms budget, applying the entry that crossed it but not the next', () => {
		const pending = makePending(['a', 'b', 'c'])
		let now = 0
		const applyOrder: string[] = []
		const apply = (uuid: string): ApplyOutcome => {
			applyOrder.push(uuid)
			now += 5
			return { spawned: false }
		}

		const result = drainWithBudget(pending, apply, makeBudget({ now: () => now, budgetMs: 6 }))

		expect(applyOrder).toEqual(['a', 'b'])
		expect(result).toEqual({ applied: 2, spawns: 0, remaining: 1, exhausted: 'budget' })
	})

	it('applies exactly one entry when a single apply already exceeds the budget', () => {
		const pending = makePending(['a', 'b'])
		let now = 0
		const apply = (): ApplyOutcome => {
			now += 100
			return { spawned: false }
		}

		const result = drainWithBudget(pending, apply, makeBudget({ now: () => now, budgetMs: 6 }))

		expect(result).toEqual({ applied: 1, spawns: 0, remaining: 1, exhausted: 'budget' })
	})

	it('removes the entry of a throwing apply and lets the throw propagate', () => {
		const pending = makePending(['a', 'b'])
		const apply = (uuid: string): ApplyOutcome => {
			if (uuid === 'a') throw new Error('boom')
			return { spawned: false }
		}

		expect(() => drainWithBudget(pending, apply, makeBudget())).toThrow('boom')
		expect(pending.has('a')).toBe(false)
		expect(pending.has('b')).toBe(true)
	})

	it('leaves entries added to the map after the drain returned untouched', () => {
		const pending = makePending(['a'])

		drainWithBudget(pending, () => ({ spawned: false }), makeBudget())
		pending.set('b', makeChange('b'))

		expect(pending.has('b')).toBe(true)
		expect(pending.size).toBe(1)
	})
})
