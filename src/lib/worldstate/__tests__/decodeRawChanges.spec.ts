import { FieldMask } from '@bufbuild/protobuf'
import { describe, expect, it } from 'vitest'

import { Transform } from '$lib/buf/common/v1/common_pb'
import {
	StreamTransformChangesResponse,
	TransformChangeType,
} from '$lib/buf/service/worldstatestore/v1/world_state_store_pb'

import type { DecodeBudget, PendingTransformChanges } from '../pendingTransformChanges'

import { decodeRawChanges } from '../decodeRawChanges'

const UUID_A = new Uint8Array(16).fill(0x01)
const UUID_B = new Uint8Array(16).fill(0x02)
const UUID_C = new Uint8Array(16).fill(0x03)

const encodeChange = (
	uuid: Uint8Array<ArrayBuffer>,
	changeType: TransformChangeType,
	updatedFields?: string[]
): Uint8Array =>
	new StreamTransformChangesResponse({
		changeType,
		transform: new Transform({ uuid }),
		updatedFields: updatedFields ? new FieldMask({ paths: updatedFields }) : undefined,
	}).toBinary()

const makeClock = (ticks: number[]): (() => number) => {
	let index = 0
	return () => {
		const value = ticks[Math.min(index, ticks.length - 1)]
		index += 1
		return value
	}
}

const makeBudget = (ticks: number[], budgetMs = 6): DecodeBudget => ({
	now: makeClock(ticks),
	budgetMs,
})

describe('decodeRawChanges', () => {
	it('stops after the budget is exceeded, leaving the rest of the queue by reference', () => {
		const queue = [
			encodeChange(UUID_A, TransformChangeType.ADDED),
			encodeChange(UUID_B, TransformChangeType.ADDED),
			encodeChange(UUID_C, TransformChangeType.ADDED),
		]
		const thirdBuffer = queue[2]
		const pending: PendingTransformChanges = new Map()

		const result = decodeRawChanges(queue, pending, makeBudget([0, 1, 20]))

		expect(result).toEqual({ decoded: 2, remaining: 1 })
		expect(queue[0]).toBe(thirdBuffer)
		expect([...pending.keys()]).toEqual([
			'01010101-0101-0101-0101-010101010101',
			'02020202-0202-0202-0202-020202020202',
		])
	})

	it('consumes the whole queue under a generous budget', () => {
		const queue = [
			encodeChange(UUID_A, TransformChangeType.ADDED),
			encodeChange(UUID_B, TransformChangeType.ADDED),
			encodeChange(UUID_C, TransformChangeType.ADDED),
		]
		const pending: PendingTransformChanges = new Map()

		const result = decodeRawChanges(queue, pending, makeBudget([0, 1, 2, 3], 1000))

		expect(result).toEqual({ decoded: 3, remaining: 0 })
		expect(queue).toHaveLength(0)
	})

	it('merges two partial updates for the same uuid through mergeChange', () => {
		const queue = [
			encodeChange(UUID_A, TransformChangeType.UPDATED, ['pose_in_observer_frame']),
			encodeChange(UUID_A, TransformChangeType.UPDATED, ['metadata']),
		]
		const pending: PendingTransformChanges = new Map()

		decodeRawChanges(queue, pending, makeBudget([0, 1, 2], 1000))

		const entry = pending.get('01010101-0101-0101-0101-010101010101')
		expect(entry?.fields).toEqual(new Set(['poseInObserverFrame', 'metadata']))
	})

	it('skips a corrupt buffer without wedging the rest of the queue', () => {
		const queue = [
			new Uint8Array([0xff, 0xff, 0xff]),
			encodeChange(UUID_A, TransformChangeType.ADDED),
		]
		const pending: PendingTransformChanges = new Map()

		const result = decodeRawChanges(queue, pending, makeBudget([0, 1, 2], 1000))

		expect(pending.has('01010101-0101-0101-0101-010101010101')).toBe(true)
		expect(result.decoded).toBe(2)
		expect(result.remaining).toBe(0)
	})

	it('returns a no-op result for an empty queue', () => {
		const queue: Uint8Array[] = []
		const pending: PendingTransformChanges = new Map()

		const result = decodeRawChanges(queue, pending, makeBudget([0]))

		expect(result).toEqual({ decoded: 0, remaining: 0 })
	})
})
