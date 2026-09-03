import { FieldMask } from '@bufbuild/protobuf'
import { describe, expect, it } from 'vitest'

import { Transform } from '$lib/buf/common/v1/common_pb'
import {
	StreamTransformChangesResponse,
	TransformChangeType,
} from '$lib/buf/service/worldstatestore/v1/world_state_store_pb'

import type { BatchMessage } from '../workerMessages'

import { createTransformDecodeWorker } from '../transformDecodeWorker'

const UUID_A = new Uint8Array(16).fill(0x01)
const UUID_B = new Uint8Array(16).fill(0x02)
const UUID_C = new Uint8Array(16).fill(0x03)

const uuidStringOf = (uuid: Uint8Array): string => {
	const hex = [...uuid].map((byte) => byte.toString(16).padStart(2, '0')).join('')
	return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

const encodeChange = (
	uuid: Uint8Array<ArrayBuffer>,
	referenceFrame: string,
	changeType: TransformChangeType,
	poseX?: number,
	updatedFields?: string[]
): Uint8Array<ArrayBuffer> =>
	new StreamTransformChangesResponse({
		changeType,
		transform: new Transform({
			uuid,
			referenceFrame,
			poseInObserverFrame:
				poseX === undefined
					? undefined
					: { pose: { x: poseX, y: 0, z: 0, oX: 0, oY: 0, oZ: 1, theta: 0 } },
		}),
		updatedFields: updatedFields ? new FieldMask({ paths: updatedFields }) : undefined,
	}).toBinary() as Uint8Array<ArrayBuffer>

const awaitBatch = (): {
	batchPromise: Promise<BatchMessage>
	handler: (batch: BatchMessage) => void
} => {
	let resolve!: (batch: BatchMessage) => void
	const batchPromise = new Promise<BatchMessage>((res) => {
		resolve = res
	})
	return { batchPromise, handler: resolve }
}

/** Queues successive batches from one worker so a test can await them in order. */
const createBatchQueue = (): {
	handler: (batch: BatchMessage) => void
	next: () => Promise<BatchMessage>
} => {
	const received: BatchMessage[] = []
	const waiters: ((batch: BatchMessage) => void)[] = []

	return {
		handler(batch) {
			const waiter = waiters.shift()
			if (waiter) {
				waiter(batch)
			} else {
				received.push(batch)
			}
		},
		next() {
			const queued = received.shift()
			if (queued) {
				return Promise.resolve(queued)
			}
			return new Promise((resolve) => waiters.push(resolve))
		},
	}
}

describe('createTransformDecodeWorker', () => {
	it('merges an ADDED/UPDATED pair, a REMOVED, and an UPDATED into one batch per uuid', async () => {
		const { batchPromise, handler } = awaitBatch()
		const handle = createTransformDecodeWorker(handler)

		try {
			handle.ingest([
				encodeChange(UUID_A, 'a', TransformChangeType.ADDED, 1),
				encodeChange(UUID_A, 'a', TransformChangeType.UPDATED, 2, ['pose_in_observer_frame']),
				encodeChange(UUID_B, 'b', TransformChangeType.REMOVED),
				encodeChange(UUID_C, 'c', TransformChangeType.UPDATED, undefined, ['metadata']),
			])
			handle.requestBatch()
			const batch = await batchPromise

			expect(batch.ingested).toBe(4)
			expect(batch.changes.map((change) => change.uuid)).toEqual([
				uuidStringOf(UUID_A),
				uuidStringOf(UUID_B),
				uuidStringOf(UUID_C),
			])

			const [a, b, c] = batch.changes
			if (!a || !('transform' in a)) throw new Error('expected upsert entry for a')
			expect(a.changeType).toBe(TransformChangeType.ADDED)
			expect(a.fields).toBeUndefined()
			expect(Transform.fromBinary(a.transform).poseInObserverFrame?.pose?.x).toBe(2)

			expect(b).toBeDefined()
			expect(b?.changeType).toBe(TransformChangeType.REMOVED)
			expect(b !== undefined && 'transform' in b).toBe(false)

			if (!c || !('fields' in c)) throw new Error('expected upsert entry for c')
			expect(c.changeType).toBe(TransformChangeType.UPDATED)
			expect(c.fields).toEqual(['metadata'])
		} finally {
			handle.terminate()
		}
	})

	it('transfers an exact-view buffer, leaving its byteLength at 0 after ingest', async () => {
		const handle = createTransformDecodeWorker(() => {})

		try {
			const bytes = encodeChange(UUID_A, 'a', TransformChangeType.ADDED, 1)

			handle.ingest([bytes])

			expect(bytes.byteLength).toBe(0)
		} finally {
			handle.terminate()
		}
	})

	it('decodes a non-exact view without detaching the larger buffer it shares', async () => {
		const { batchPromise, handler } = awaitBatch()
		const handle = createTransformDecodeWorker(handler)

		try {
			const encoded = encodeChange(UUID_A, 'a', TransformChangeType.ADDED, 1)
			const larger = new Uint8Array(encoded.byteLength + 8)
			larger.set(encoded, 4)
			const view = larger.subarray(4, 4 + encoded.byteLength)

			handle.ingest([view])
			handle.requestBatch()
			const batch = await batchPromise

			expect(batch.ingested).toBe(1)
			const [entry] = batch.changes
			if (!entry || !('transform' in entry)) throw new Error('expected upsert entry')
			expect(Transform.fromBinary(entry.transform).poseInObserverFrame?.pose?.x).toBe(1)
			expect(larger.byteLength).toBe(encoded.byteLength + 8)
		} finally {
			handle.terminate()
		}
	})

	it('yields an empty batch when nothing was ingested since the last flush', async () => {
		const { batchPromise, handler } = awaitBatch()
		const handle = createTransformDecodeWorker(handler)

		try {
			handle.requestBatch()
			const batch = await batchPromise

			expect(batch.changes).toEqual([])
			expect(batch.ingested).toBe(0)
		} finally {
			handle.terminate()
		}
	})

	it('counts only the buffers ingested since the previous batch', async () => {
		const UUID_D = new Uint8Array(16).fill(0x04)
		const UUID_E = new Uint8Array(16).fill(0x05)
		const queue = createBatchQueue()
		const handle = createTransformDecodeWorker(queue.handler)

		try {
			handle.ingest([
				encodeChange(UUID_A, 'a', TransformChangeType.ADDED, 1),
				encodeChange(UUID_B, 'b', TransformChangeType.ADDED, 1),
			])
			handle.requestBatch()
			const first = await queue.next()
			expect(first.ingested).toBe(2)

			handle.ingest([
				encodeChange(UUID_C, 'c', TransformChangeType.ADDED, 1),
				encodeChange(UUID_D, 'd', TransformChangeType.ADDED, 1),
				encodeChange(UUID_E, 'e', TransformChangeType.ADDED, 1),
			])
			handle.requestBatch()
			const second = await queue.next()
			expect(second.ingested).toBe(3)
		} finally {
			handle.terminate()
		}
	})
})
