import { BufferGeometry } from 'three'
import { STLLoader } from 'three/addons/loaders/STLLoader.js'

const stlLoader = new STLLoader()

/**
 * Counterpart to `parsePlyInput`. `STLLoader.parse` sniffs ASCII versus binary itself, so unlike PLY
 * there is nothing to detect here — the bytes go straight in.
 */
export const parseStlInput = (mesh: string | Uint8Array): BufferGeometry => {
	// Case 1: already a base64 or ASCII string
	if (typeof mesh === 'string') {
		return stlLoader.parse(atob(mesh))
	}

	// An absent mesh is not a malformed one; RDK writes geometry with no triangles.
	if (mesh.length === 0) {
		return new BufferGeometry()
	}

	// Case 2: the loader reads a whole ArrayBuffer, so a view into a larger one has to be cut out
	// first or it would hand the loader its neighbours as well.
	const whole = mesh.byteOffset === 0 && mesh.byteLength === mesh.buffer.byteLength

	return stlLoader.parse(
		whole
			? (mesh.buffer as ArrayBuffer)
			: (mesh.buffer.slice(mesh.byteOffset, mesh.byteOffset + mesh.byteLength) as ArrayBuffer)
	)
}
