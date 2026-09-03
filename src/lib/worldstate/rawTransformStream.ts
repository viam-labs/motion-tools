import type { RobotClient } from '@viamrobotics/sdk'

import {
	type FieldList,
	type JsonReadOptions,
	type JsonValue,
	Message,
	type PartialMessage,
	type PlainMessage,
	proto3,
	ScalarType,
	type ServiceType,
} from '@bufbuild/protobuf'

import { WorldStateStoreService } from '../buf/service/worldstatestore/v1/world_state_store_connect'

/**
 * The reassembled wire bytes of one `StreamTransformChangesResponse`, left undecoded. A real
 * message type so connect accepts it as a method output; its `fromBinary` keeps the bytes
 * instead of parsing them, and the worker does the decode later.
 */
export class RawBytes extends Message<RawBytes> {
	bytes: Uint8Array = new Uint8Array(0)

	constructor(data?: PartialMessage<RawBytes>) {
		super()
		proto3.util.initPartial(data, this)
	}

	static readonly runtime = proto3
	static readonly typeName = 'viam.visualization.RawBytes'
	static readonly fields: FieldList = proto3.util.newFieldList(() => [
		{ no: 1, name: 'bytes', kind: 'scalar', T: ScalarType.BYTES },
	])

	// connect's binary parse path calls this with the reassembled message and reads nothing
	// else on the type, so wrapping here is what hands the transport's bytes through untouched.
	static fromBinary(bytes: Uint8Array): RawBytes {
		return new RawBytes({ bytes })
	}

	static fromJson(json: JsonValue, options?: Partial<JsonReadOptions>): RawBytes {
		return new RawBytes().fromJson(json, options)
	}

	static fromJsonString(json: string, options?: Partial<JsonReadOptions>): RawBytes {
		return new RawBytes().fromJsonString(json, options)
	}

	static equals(
		a: RawBytes | PlainMessage<RawBytes> | undefined,
		b: RawBytes | PlainMessage<RawBytes> | undefined
	): boolean {
		return proto3.util.equals(RawBytes, a, b)
	}
}

/**
 * `WorldStateStoreService` descriptor with `streamTransformChanges.O` replaced by `RawBytes`, so
 * the transport yields raw response bytes instead of a parsed `StreamTransformChangesResponse`.
 * Every other method and field is the original by reference.
 */
export const RawTransformStreamService = {
	...WorldStateStoreService,
	methods: {
		...WorldStateStoreService.methods,
		streamTransformChanges: {
			...WorldStateStoreService.methods.streamTransformChanges,
			O: RawBytes,
		},
	},
} as const satisfies ServiceType

/** Opens the `StreamTransformChanges` RPC on `name` and yields each response's raw bytes. */
export const openRawTransformStream = (
	robotClient: RobotClient,
	name: string,
	signal: AbortSignal
) =>
	robotClient
		.createServiceClient(RawTransformStreamService)
		.streamTransformChanges({ name }, { signal })
