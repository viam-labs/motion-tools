import type { BufferGeometry } from 'three'

import { parsePlyInput } from '$lib/ply'
import { parseStlInput } from '$lib/stl'

interface MeshInput {
	contentType: string
	mesh: Uint8Array
}

export const parseMeshInput = (input: MeshInput): BufferGeometry => {
	if (input.contentType.toLowerCase() === 'stl') {
		return parseStlInput(input.mesh)
	}

	return parsePlyInput(input.mesh)
}
