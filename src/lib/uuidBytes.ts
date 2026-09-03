import { UuidTool } from 'uuid-tool'

/** RFC 4122 canonical string for 16 UUID bytes, or `undefined` for a missing or empty field. */
export const uuidBytesToString = (bytes: Uint8Array | undefined): string | undefined => {
	if (!bytes || bytes.length === 0) return undefined
	return UuidTool.toString([...bytes])
}

export const uuidStringToBytes = (uuid: string): Uint8Array<ArrayBuffer> => {
	const arr = new Uint8Array(16)
	arr.set(UuidTool.toBytes(uuid))
	return arr
}
