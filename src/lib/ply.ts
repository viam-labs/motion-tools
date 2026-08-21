import { BufferGeometry } from 'three'
import { PLYLoader } from 'three/addons/loaders/PLYLoader.js'

import { asExactArrayBuffer } from '$lib/buffer'

const plyLoader = new PLYLoader()

export const parsePlyInput = (mesh: string | Uint8Array): BufferGeometry => {
	if (typeof mesh === 'string') {
		return plyLoader.parse(atob(mesh))
	}

	if (mesh.length === 0) {
		return new BufferGeometry()
	}

	const header = new TextDecoder().decode(mesh.slice(0, 50))
	const isAscii = header.includes('format ascii')

	if (isAscii) {
		const text = new TextDecoder().decode(mesh)
		return plyLoader.parse(text)
	}

	// The loader needs a buffer that starts at the PLY header, not at the start of
	// the response the mesh was decoded from.
	return plyLoader.parse(asExactArrayBuffer(mesh))
}
