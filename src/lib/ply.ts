import { BufferGeometry } from 'three'
import { PLYLoader } from 'three/addons/loaders/PLYLoader.js'

import { asExactArrayBuffer } from '$lib/buffer'

const plyLoader = new PLYLoader()

export const parsePlyInput = (mesh: string | Uint8Array): BufferGeometry => {
	// Case 1: already a base64 or ASCII string
	if (typeof mesh === 'string') {
		return plyLoader.parse(atob(mesh))
	}

	// First, determine if ply has any geometry
	if (mesh.length === 0) {
		return new BufferGeometry()
	}

	// Case 2: detect text vs binary PLY in Uint8Array
	const header = new TextDecoder().decode(mesh.slice(0, 50))
	const isAscii = header.includes('format ascii')

	// Case 3: text-mode PLY → decode bytes to string
	if (isAscii) {
		const text = new TextDecoder().decode(mesh)
		return plyLoader.parse(text)
	}

	// Case 4: binary PLY → the loader needs a buffer that starts at the header,
	// not at the start of the response the mesh was decoded from.
	return plyLoader.parse(asExactArrayBuffer(mesh))
}
