import { BufferGeometry } from 'three'
import { STLLoader } from 'three/addons/loaders/STLLoader.js'

const stlLoader = new STLLoader()

export const parseStlInput = (mesh: string | Uint8Array): BufferGeometry => {
	if (typeof mesh === 'string') {
		return stlLoader.parse(atob(mesh))
	}

	if (mesh.length === 0) {
		return new BufferGeometry()
	}

	return stlLoader.parse(
		mesh.buffer.slice(mesh.byteOffset, mesh.byteOffset + mesh.byteLength) as ArrayBuffer
	)
}