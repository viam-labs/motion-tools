import type { Value } from '@bufbuild/protobuf'
import type { PlainMessage } from '@viamrobotics/sdk'

/**
 * Converts a `google.protobuf.Value` into plain JavaScript. A `Struct`'s fields are wrapped
 * `Value`s, so anything handing a struct payload to a generated `fromJson` unwraps it first.
 */
export const unwrapValue = (value: PlainMessage<Value>): unknown => {
	if (!value?.kind) return value

	switch (value.kind.case) {
		case 'numberValue':
		case 'stringValue':
		case 'boolValue': {
			return value.kind.value
		}
		case 'structValue': {
			const result: Record<string, unknown> = {}
			for (const [key, val] of Object.entries(value.kind.value.fields || {})) {
				result[key] = unwrapValue(val as PlainMessage<Value>)
			}
			return result
		}
		case 'listValue': {
			return value.kind.value.values?.map((v) => unwrapValue(v as PlainMessage<Value>)) ?? []
		}
		case 'nullValue': {
			return null
		}
		default: {
			return value.kind.value
		}
	}
}
