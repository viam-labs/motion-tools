import { UuidTool } from 'uuid-tool'

export const planUuid = (): Uint8Array<ArrayBuffer> => {
	const bytes = new Uint8Array(new ArrayBuffer(16))
	bytes.set(UuidTool.toBytes(crypto.randomUUID()))
	return bytes
}
