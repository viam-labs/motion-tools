import type { BufferGeometry } from 'three'

import { parsePlyInput } from '$lib/ply'
import { parseStlInput } from '$lib/stl'

export type MeshContentType = 'ply' | 'stl'

/**
 * Both of RDK's producers write a bare lowercase token, so the case folding and the `;`/`/` trimming
 * below are defense rather than a response to anything observed on the wire: `GeometryConfig` writes
 * `string(fileType)`, which is only ever `ply` or `stl`, and the URDF loader picks one of the same
 * two off the file extension and errors on any other. The field is still a free string on a proto
 * this repo does not own, and a value it does not recognise is a decision for the caller: the plan
 * parser skips the geometry, while the renderer keeps its long-standing PLY assumption.
 *
 * This reads a content type, not a path. `meshes/base.stl` is deliberately not accepted — that form
 * belongs in `mesh_file_path`, and guessing from an extension here would mean guessing for
 * `package://` URIs too.
 */
export const meshContentType = (raw: string | undefined): MeshContentType | undefined => {
	const value = (raw ?? '').toLowerCase().split(';')[0]?.trim().split('/').at(-1)
	return value === 'ply' || value === 'stl' ? value : undefined
}

/**
 * Picks a parser for the bytes RDK sent. PLY is the fallback rather than an error because it is what
 * the renderer assumed before STL was handled at all, so an unlabelled mesh behaves exactly as it
 * always has. The plan parser does not rely on that: it gates on `meshContentType` first and skips
 * anything unrecognised, so the fallback is only ever reached from the render path.
 *
 * `parsePlyInput` and `parseStlInput` each cut an exact `ArrayBuffer` out of a `Uint8Array` view
 * before handing it to their loader: protobuf-es decodes a `bytes` field as a subarray over the whole
 * wire buffer, and passing `.buffer` unmodified would hand the loader its neighbours too. They write
 * that cut in different idioms — `new Uint8Array(mesh).buffer` versus `.slice(byteOffset, byteOffset +
 * byteLength)` — but the two are equivalent; neither is more correct than the other.
 */
export const parseMeshInput = (mesh: string | Uint8Array, contentType?: string): BufferGeometry =>
	meshContentType(contentType) === 'stl' ? parseStlInput(mesh) : parsePlyInput(mesh)
