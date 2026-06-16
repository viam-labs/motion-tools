import { UuidTool } from 'uuid-tool'

export const planUuid = (): Uint8Array => {
	const bytes = new Uint8Array(16)
	bytes.set(UuidTool.toBytes(crypto.randomUUID()))
	return bytes
}
