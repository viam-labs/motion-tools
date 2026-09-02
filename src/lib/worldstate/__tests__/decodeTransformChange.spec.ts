import { FieldMask } from '@bufbuild/protobuf'
import { describe, expect, it } from 'vitest'

import { PoseInFrame, Transform } from '$lib/buf/common/v1/common_pb'
import {
	StreamTransformChangesResponse,
	TransformChangeType,
} from '$lib/buf/service/worldstatestore/v1/world_state_store_pb'

import { decodeTransformChange } from '../decodeTransformChange'

const UUID_BYTES = new Uint8Array([
	0x12, 0x34, 0x56, 0x78, 0x9a, 0xbc, 0xde, 0xf0, 0x12, 0x34, 0x56, 0x78, 0x9a, 0xbc, 0xde, 0xf0,
])
const UUID_STRING = '12345678-9abc-def0-1234-56789abcdef0'

const makeResponse = (
	data: Partial<{
		changeType: TransformChangeType
		transform: Transform
		updatedFields: FieldMask
	}>
): StreamTransformChangesResponse => new StreamTransformChangesResponse(data)

describe('decodeTransformChange', () => {
	it('decodes the uuid to its canonical RFC 4122 string', () => {
		const response = makeResponse({
			changeType: TransformChangeType.UPDATED,
			transform: new Transform({ uuid: UUID_BYTES }),
		})

		const result = decodeTransformChange(response.toBinary())

		expect(result?.uuid).toBe(UUID_STRING)
	})

	it('round-trips the change type', () => {
		const response = makeResponse({
			changeType: TransformChangeType.UPDATED,
			transform: new Transform({ uuid: UUID_BYTES }),
		})

		const result = decodeTransformChange(response.toBinary())

		expect(result?.changeType).toBe(TransformChangeType.UPDATED)
	})

	it('round-trips the transform, including a nested pose field', () => {
		const response = makeResponse({
			changeType: TransformChangeType.UPDATED,
			transform: new Transform({
				uuid: UUID_BYTES,
				referenceFrame: 'world',
				poseInObserverFrame: new PoseInFrame({ pose: { x: 42 } }),
			}),
		})

		const result = decodeTransformChange(response.toBinary())

		expect(result?.transform.referenceFrame).toBe('world')
		expect(result?.transform.poseInObserverFrame?.pose?.x).toBe(42)
	})

	it('round-trips the updated field mask paths', () => {
		const response = makeResponse({
			changeType: TransformChangeType.UPDATED,
			transform: new Transform({ uuid: UUID_BYTES }),
			updatedFields: new FieldMask({ paths: ['pose_in_observer_frame', 'metadata'] }),
		})

		const result = decodeTransformChange(response.toBinary())

		expect(result?.updatedFields).toEqual({ paths: ['pose_in_observer_frame', 'metadata'] })
	})

	it('returns undefined updatedFields for an ADDED response with no mask', () => {
		const response = makeResponse({
			changeType: TransformChangeType.ADDED,
			transform: new Transform({ uuid: UUID_BYTES }),
		})

		const result = decodeTransformChange(response.toBinary())

		expect(result?.updatedFields).toBeUndefined()
	})

	it('returns undefined when the response has no transform', () => {
		const response = makeResponse({ changeType: TransformChangeType.ADDED })

		expect(decodeTransformChange(response.toBinary())).toBeUndefined()
	})

	it('returns undefined when the transform uuid is empty', () => {
		const response = makeResponse({
			changeType: TransformChangeType.ADDED,
			transform: new Transform({}),
		})

		expect(decodeTransformChange(response.toBinary())).toBeUndefined()
	})
})
