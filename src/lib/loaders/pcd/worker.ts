// worker.js
import { PCDLoader } from 'three/examples/jsm/loaders/PCDLoader.js'

const loader = new PCDLoader()

self.onmessage = async (event) => {
	const { data } = event.data
	if (!(data instanceof Uint8Array)) {
		postMessage({ error: 'Invalid data format' })
		return
	}

	try {
		const pcd = loader.parse(data.buffer as ArrayBuffer)
		if (pcd.geometry) {
			const positionArray = pcd.geometry.attributes.position.array
			const colorArray = pcd.geometry.attributes.color ? pcd.geometry.attributes.color.array : null

			postMessage(
				{ success: true, positionArray, colorArray },
				colorArray
					? [positionArray.buffer as ArrayBuffer, colorArray.buffer as ArrayBuffer]
					: [positionArray.buffer as ArrayBuffer]
			)
		} else {
			postMessage({ error: 'Failed to extract geometry' })
		}
	} catch (error) {
		postMessage({ error: (error as Error).message })
	}
}
