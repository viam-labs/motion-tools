import type { BufferGeometry } from 'three'

import { parsePlyInput } from '$lib/ply'
import { parseStlInput } from '$lib/stl'

export type MeshContentType = 'ply' | 'stl'

/**
 * Reads a content type, not a path: `meshes/base.stl` belongs in `mesh_file_path`. RDK writes a bare
 * `ply` or `stl`, so the folding and trimming are defense on a proto this repo does not own.
 */
export const meshContentType = (raw: string | undefined): MeshContentType | undefined => {
	const value = (raw ?? '').toLowerCase().split(';')[0]?.trim().split('/').at(-1)
	return value === 'ply' || value === 'stl' ? value : undefined
}

/**
 * PLY is the fallback rather than an error: it is the assumption every render path already makes.
 * The plan parser does not rely on it, gating on `meshContentType` and skipping what it cannot read.
 */
export const parseMeshInput = (mesh: string | Uint8Array, contentType?: string): BufferGeometry =>
	meshContentType(contentType) === 'stl' ? parseStlInput(mesh) : parsePlyInput(mesh)
