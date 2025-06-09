// worker.js
import { PCDLoader } from 'three/examples/jsm/loaders/PCDLoader.js'

const loader = new PCDLoader()

export type Message =
	| {
			positions: Float32Array
			colors: Float32Array | null
	  }
	| {
			error: string
	  }

self.onmessage = async (event) => {
	const { data } = event.data
	if (!(data instanceof Uint8Array)) {
		postMessage({ error: 'Invalid data format' } satisfies Message)
		return
	}

	try {
		const pcd = loader.parse(data.buffer as ArrayBuffer)
		if (pcd.geometry) {
			const positions = pcd.geometry.attributes.position.array as Float32Array<ArrayBuffer>
			const colors = (pcd.geometry.attributes.color?.array as Float32Array<ArrayBuffer>) ?? null

			postMessage(
				{ positions, colors } satisfies Message,
				colors ? [positions.buffer, colors.buffer] : [positions.buffer]
			)
		} else {
			postMessage({ error: 'Failed to extract geometry' } satisfies Message)
		}
	} catch (error) {
		postMessage({ error: (error as Error).message } satisfies Message)
	}
}
