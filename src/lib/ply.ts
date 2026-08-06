import { BufferGeometry } from 'three'
import { PLYLoader } from 'three/addons/loaders/PLYLoader.js'

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

	// Case 4: binary PLY → pass an ArrayBuffer holding exactly the mesh bytes.
	// A protobuf-decoded `bytes` field is a subarray view over the whole wire
	// buffer, so handing over `.buffer` would parse from the start of the
	// response — the loader finds no header there and yields empty geometry.
	const exact =
		mesh.byteOffset === 0 && mesh.byteLength === mesh.buffer.byteLength
			? (mesh.buffer as ArrayBuffer)
			: (mesh.slice().buffer as ArrayBuffer)

	return plyLoader.parse(exact)
}
