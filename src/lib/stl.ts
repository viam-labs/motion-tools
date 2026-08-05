import { BufferGeometry } from 'three'
import { STLLoader } from 'three/addons/loaders/STLLoader.js'

const stlLoader = new STLLoader()

export const parseStlInput = (mesh: Uint8Array): BufferGeometry => {
	if (mesh.length === 0) {
		return new BufferGeometry()
	}

	// `mesh` is often a view into a larger decode buffer, so hand the loader
	// exactly this mesh's bytes rather than the whole underlying ArrayBuffer.
	return stlLoader.parse(new Uint8Array(mesh).buffer)
}
