import type { BufferGeometry } from 'three'

import { parsePlyInput } from '$lib/ply'
import { parseStlInput } from '$lib/stl'

export type MeshContentType = 'ply' | 'stl'

/**
 * RDK writes a bare `ply` or `stl` into `mesh_content_type`, but the field is a free string that also
 * carries whatever a URDF or a HTTP fetch put there, so `model/stl` and `STL` reach us too. Anything
 * unrecognised returns undefined and is a decision for the caller: the plan parser skips the
 * geometry, while the renderer keeps its long-standing PLY assumption.
 */
export const meshContentType = (raw: string | undefined): MeshContentType | undefined => {
	const value = (raw ?? '').toLowerCase().split(';')[0]?.trim().split('/').at(-1)
	return value === 'ply' || value === 'stl' ? value : undefined
}

/**
 * Picks a parser for the bytes RDK sent. PLY is the fallback rather than an error because it is what
 * every caller assumed before STL was handled at all, so an unlabelled mesh behaves exactly as it
 * always has.
 */
export const parseMeshInput = (mesh: string | Uint8Array, contentType?: string): BufferGeometry =>
	meshContentType(contentType) === 'stl' ? parseStlInput(mesh) : parsePlyInput(mesh)
