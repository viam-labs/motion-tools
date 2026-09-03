import type { RobotClient } from '@viamrobotics/sdk'

import { describe, expect, it, vi } from 'vitest'

import { WorldStateStoreService } from '../../buf/service/worldstatestore/v1/world_state_store_connect'
import { openRawTransformStream, RawBytes, RawTransformStreamService } from '../rawTransformStream'

describe('RawTransformStreamService', () => {
	it('parses streamTransformChanges responses by wrapping the given buffer, not copying it', () => {
		const buffer = new Uint8Array([1, 2, 3])
		const parsed = RawTransformStreamService.methods.streamTransformChanges.O.fromBinary(buffer)

		expect(parsed).toBeInstanceOf(RawBytes)
		expect(parsed.bytes).toBe(buffer)
	})

	it('keeps typeName and the four other methods as the originals by reference', () => {
		expect(RawTransformStreamService.typeName).toBe(WorldStateStoreService.typeName)
		expect(RawTransformStreamService.methods.listUUIDs).toBe(
			WorldStateStoreService.methods.listUUIDs
		)
		expect(RawTransformStreamService.methods.getTransform).toBe(
			WorldStateStoreService.methods.getTransform
		)
		expect(RawTransformStreamService.methods.doCommand).toBe(
			WorldStateStoreService.methods.doCommand
		)
		expect(RawTransformStreamService.methods.getStatus).toBe(
			WorldStateStoreService.methods.getStatus
		)
	})

	it('keeps streamTransformChanges name, I, and kind as the originals', () => {
		const original = WorldStateStoreService.methods.streamTransformChanges
		const replaced = RawTransformStreamService.methods.streamTransformChanges

		expect(replaced.name).toBe(original.name)
		expect(replaced.I).toBe(original.I)
		expect(replaced.kind).toBe(original.kind)
	})
})

describe('openRawTransformStream', () => {
	it('creates the raw service client, calls streamTransformChanges with the name and signal, and yields the client buffers in order', async () => {
		const bufferOne = new Uint8Array([1, 2, 3])
		const bufferTwo = new Uint8Array([4, 5, 6])

		async function* fakeIterable() {
			yield RawBytes.fromBinary(bufferOne)
			yield RawBytes.fromBinary(bufferTwo)
		}

		const streamTransformChanges = vi.fn<
			(request: { name: string }, options: { signal: AbortSignal }) => AsyncIterable<RawBytes>
		>(() => fakeIterable())
		const fakeClient = { streamTransformChanges }
		const createServiceClient = vi.fn(() => fakeClient)
		const robotClient = { createServiceClient } as unknown as RobotClient

		const controller = new AbortController()
		const results: Uint8Array[] = []
		for await (const { bytes } of openRawTransformStream(
			robotClient,
			'my-name',
			controller.signal
		)) {
			results.push(bytes)
		}

		expect(createServiceClient).toHaveBeenCalledWith(RawTransformStreamService)
		expect(streamTransformChanges).toHaveBeenCalledTimes(1)
		const [request, options] = streamTransformChanges.mock.calls[0]
		expect(request).toEqual({ name: 'my-name' })
		expect(options).toMatchObject({ signal: controller.signal })
		expect(results).toEqual([bufferOne, bufferTwo])
	})
})
