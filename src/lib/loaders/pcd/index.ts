// main.js
const worker = new Worker(new URL('./worker', import.meta.url), { type: 'module' })

export const parsePCD = async (
	array: Uint8Array<ArrayBufferLike>
): Promise<{ positions: ArrayBuffer; colors: ArrayBuffer | undefined }> => {
	return new Promise((resolve, reject) => {
		worker.onmessage = (event) => {
			if (event.data.error) {
				return reject(event.data.error)
			}

			resolve({ positions: event.data.positionArray, colors: event.data.colorArray })
		}

		worker.postMessage({ data: array }, [array.buffer])
	})
}
