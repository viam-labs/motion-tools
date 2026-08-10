import { BufferGeometry } from 'three'
import { STLLoader } from 'three/addons/loaders/STLLoader.js'

const stlLoader = new STLLoader()

/**
 * The smallest byte count `STLLoader.parse` can be handed safely. It decides ASCII versus binary by
 * reading the triangle count as a uint32 at offset 80, and it does that before checking the length,
 * so anything shorter throws a `RangeError` out of the `DataView` rather than parsing as ASCII.
 * RDK draws the same line for the same reason (`spatialmath/mesh.go`, `newMeshFromSTLBytes`: an 80
 * byte header, a 4 byte count, then 50 bytes per triangle, and "STL file too small" below that).
 */
const STL_MIN_BYTES = 84

/**
 * Counterpart to `parsePlyInput`. `STLLoader.parse` sniffs ASCII versus binary itself, so unlike PLY
 * there is nothing to detect here — the bytes go straight in.
 *
 * Too-short input returns an empty geometry instead of throwing. That matters more here than the
 * equivalent does for PLY: `PLYLoader` answers garbage with an empty geometry, `STLLoader` throws,
 * and the callers are `Geometry`/`updateGeometryTrait`, which run inside an unguarded loop over
 * every geometry on a resource. One truncated mesh must not cost the ones behind it.
 */
export const parseStlInput = (mesh: string | Uint8Array): BufferGeometry => {
	// Case 1: base64, which is how a mesh arrives over the JSON transports. Not plain ASCII STL text:
	// that would have to skip the decode, and no caller sends it.
	if (typeof mesh === 'string') {
		const decoded = atob(mesh)
		return decoded.length < STL_MIN_BYTES ? new BufferGeometry() : stlLoader.parse(decoded)
	}

	// An absent mesh is not a malformed one; RDK writes geometry with no triangles.
	if (mesh.byteLength < STL_MIN_BYTES) {
		return new BufferGeometry()
	}

	// Case 2: the loader reads a whole ArrayBuffer, so a view into a larger one has to be cut out
	// first or it would hand the loader its neighbours as well. Getting this wrong is silent on
	// binary STL: the triangle count is read from the wrong offset, `isBinary` stops matching, and
	// the loader returns an empty geometry rather than throwing.
	const whole = mesh.byteOffset === 0 && mesh.byteLength === mesh.buffer.byteLength

	return stlLoader.parse(
		whole
			? (mesh.buffer as ArrayBuffer)
			: (mesh.buffer.slice(mesh.byteOffset, mesh.byteOffset + mesh.byteLength) as ArrayBuffer)
	)
}
