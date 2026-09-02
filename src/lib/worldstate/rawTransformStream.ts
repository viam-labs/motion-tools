import type { MessageType, ServiceType } from '@bufbuild/protobuf'
import type { RobotClient } from '@viamrobotics/sdk'

import type { StreamTransformChangesResponse } from '../buf/service/worldstatestore/v1/world_state_store_pb'

import { WorldStateStoreService } from '../buf/service/worldstatestore/v1/world_state_store_connect'

// Connect v1's binary parse path builds `parse: (bytes) => method.O.fromBinary(bytes, options)`
// and nothing else in the transport reads `O`, so an `O` whose `fromBinary` is the identity
// hands back the raw wire bytes untouched. `I` stays the generated request class, since input
// normalisation only checks `input instanceof method.I`.
const RawBytesType = {
	typeName: 'viam.visualization.RawBytes',
	fromBinary: (bytes: Uint8Array) => bytes,
} as unknown as MessageType<StreamTransformChangesResponse>

/**
 * `WorldStateStoreService` descriptor with `streamTransformChanges.O` replaced so the
 * transport hands back raw response bytes instead of a parsed `StreamTransformChangesResponse`.
 * Every other method and field is the original by reference.
 */
export const RawTransformStreamService = {
	...WorldStateStoreService,
	methods: {
		...WorldStateStoreService.methods,
		streamTransformChanges: {
			...WorldStateStoreService.methods.streamTransformChanges,
			O: RawBytesType,
		},
	},
} as const satisfies ServiceType

/**
 * Opens the `StreamTransformChanges` RPC on `name` and yields the raw response bytes,
 * skipping protobuf parsing so the caller can decode on its own schedule.
 */
export const openRawTransformStream = (
	robotClient: RobotClient,
	name: string,
	signal: AbortSignal
): AsyncIterable<Uint8Array> => {
	const client = robotClient.createServiceClient(RawTransformStreamService)
	// The descriptor's `O.fromBinary` is the identity, so this iterable already yields raw bytes.
	return client.streamTransformChanges({ name }, { signal }) as unknown as AsyncIterable<Uint8Array>
}
