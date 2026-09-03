import { StreamTransformChangesResponse } from '$lib/buf/service/worldstatestore/v1/world_state_store_pb'
import { uuidBytesToString } from '$lib/uuidBytes'

import type { IncomingChange } from './pendingTransformChanges'

/**
 * Decodes one raw `StreamTransformChangesResponse` buffer into an `IncomingChange`, or
 * `undefined` when the response carries no transform or an empty UUID. Does not catch a
 * decode error: a malformed buffer is the caller's problem to skip.
 */
export const decodeTransformChange = (bytes: Uint8Array): IncomingChange | undefined => {
	const response = StreamTransformChangesResponse.fromBinary(bytes)
	const transform = response.transform
	if (!transform) return undefined

	const uuid = uuidBytesToString(transform.uuid)
	if (!uuid) return undefined

	return {
		uuid,
		changeType: response.changeType,
		transform,
		updatedFields: response.updatedFields ? { paths: response.updatedFields.paths } : undefined,
	}
}
