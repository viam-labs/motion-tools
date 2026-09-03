import { FieldMask } from '@bufbuild/protobuf'
import { describe, expect, it } from 'vitest'

import { Transform } from '$lib/buf/common/v1/common_pb'
import {
	StreamTransformChangesResponse,
	TransformChangeType,
} from '$lib/buf/service/worldstatestore/v1/world_state_store_pb'

import type { PendingTransformChanges } from '../pendingTransformChanges'

import { drainToBatch, ingestBuffers } from '../decodeAndCoalesce'

const UUID_A = new Uint8Array(16).fill(0x01)
const UUID_B = new Uint8Array(16).fill(0x02)

const uuidStringOf = (uuid: Uint8Array): string => {
	const hex = [...uuid].map((byte) => byte.toString(16).padStart(2, '0')).join('')
	return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

const UUID_A_STRING = uuidStringOf(UUID_A)
const UUID_B_STRING = uuidStringOf(UUID_B)

const encodeChange = (
	uuid: Uint8Array<ArrayBuffer>,
	changeType: TransformChangeType,
	poseX?: number,
	updatedFields?: string[]
): Uint8Array =>
	new StreamTransformChangesResponse({
		changeType,
		transform: new Transform({
			uuid,
			referenceFrame: uuidStringOf(uuid) === UUID_A_STRING ? 'a' : 'b',
			poseInObserverFrame:
				poseX === undefined
					? undefined
					: { pose: { x: poseX, y: 0, z: 0, oX: 0, oY: 0, oZ: 1, theta: 0 } },
		}),
		updatedFields: updatedFields ? new FieldMask({ paths: updatedFields }) : undefined,
	}).toBinary()

const encodeNoTransform = (): Uint8Array =>
	new StreamTransformChangesResponse({ changeType: TransformChangeType.ADDED }).toBinary()

describe('ingestBuffers', () => {
	it('counts decoded buffers, skips a corrupt one, and merges into pending in first-mention order', () => {
		const pending: PendingTransformChanges = new Map()
		const buffers = [
			encodeChange(UUID_A, TransformChangeType.ADDED, 1),
			encodeChange(UUID_A, TransformChangeType.UPDATED, 2, ['pose_in_observer_frame']),
			encodeChange(UUID_B, TransformChangeType.REMOVED),
			new Uint8Array([0xff, 0xff, 0xff]),
		]

		const ingested = ingestBuffers(buffers, pending)

		expect(ingested).toBe(3)
		expect([...pending.keys()]).toEqual([UUID_A_STRING, UUID_B_STRING])
	})

	it('does not count or add an entry for a response with no transform', () => {
		const pending: PendingTransformChanges = new Map()

		const ingested = ingestBuffers([encodeNoTransform()], pending)

		expect(ingested).toBe(0)
		expect(pending.size).toBe(0)
	})
})

describe('drainToBatch', () => {
	it('produces one entry per uuid, merges the ADDED and UPDATED pair, and empties the map', () => {
		const pending: PendingTransformChanges = new Map()
		ingestBuffers(
			[
				encodeChange(UUID_A, TransformChangeType.ADDED, 1),
				encodeChange(UUID_A, TransformChangeType.UPDATED, 2, ['pose_in_observer_frame']),
				encodeChange(UUID_B, TransformChangeType.REMOVED),
			],
			pending
		)

		const changes = drainToBatch(pending)

		expect(changes).toHaveLength(2)
		const first = changes[0]
		expect(first.uuid).toBe(UUID_A_STRING)
		expect(first.changeType).toBe(TransformChangeType.ADDED)
		expect('fields' in first ? first.fields : undefined).toBeUndefined()
		if (!('transform' in first)) throw new Error('expected upsert entry')
		const decoded = Transform.fromBinary(first.transform)
		expect(decoded.referenceFrame).toBe('a')
		expect(decoded.poseInObserverFrame?.pose?.x).toBe(2)

		const second = changes[1]
		expect(second.uuid).toBe(UUID_B_STRING)
		expect(second.changeType).toBe(TransformChangeType.REMOVED)
		expect('transform' in second).toBe(false)

		expect(pending.size).toBe(0)
	})

	it('unions the fields of two partial updates for the same uuid', () => {
		const pending: PendingTransformChanges = new Map()
		ingestBuffers(
			[
				encodeChange(UUID_A, TransformChangeType.UPDATED, 2, ['pose_in_observer_frame']),
				encodeChange(UUID_A, TransformChangeType.UPDATED, 3, ['metadata']),
			],
			pending
		)

		const [entry] = drainToBatch(pending)
		if (!('fields' in entry) || !entry.fields) throw new Error('expected fields')

		expect(entry.fields).toHaveLength(2)
		expect(entry.fields).toEqual(expect.arrayContaining(['poseInObserverFrame', 'metadata']))
	})

	it('produces an exact view whose byteOffset is 0 and byteLength matches its buffer', () => {
		const pending: PendingTransformChanges = new Map()
		ingestBuffers([encodeChange(UUID_A, TransformChangeType.ADDED, 1)], pending)

		const [entry] = drainToBatch(pending)
		if (!('transform' in entry)) throw new Error('expected upsert entry')

		expect(entry.transform.byteOffset).toBe(0)
		expect(entry.transform.byteLength).toBe(entry.transform.buffer.byteLength)
	})

	it('drops an UNSPECIFIED change type from the batch', () => {
		const pending: PendingTransformChanges = new Map([
			[
				UUID_A_STRING,
				{
					changeType: TransformChangeType.UNSPECIFIED,
					transform: new Transform({ uuid: UUID_A }),
					fields: undefined,
				},
			],
		])

		expect(drainToBatch(pending)).toEqual([])
	})

	it('returns an empty array for an empty map', () => {
		expect(drainToBatch(new Map())).toEqual([])
	})
})
