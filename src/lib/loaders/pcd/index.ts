// main.js
const worker = new Worker(new URL('./worker', import.meta.url), { type: 'module' })

export const parsePCD = async (file: Uint8Array) => {
	return new Promise((resolve, reject) => {
		worker.onmessage = (event) => {
			if (event.data.error) {
				return reject(event.data.error)
			}

			resolve(event.data.positionArray)
		}

		const uint8Array = new Uint8Array(file.buffer)
		worker.postMessage({ data: uint8Array }, [uint8Array.buffer])
	})
}
