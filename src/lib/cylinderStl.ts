/**
 * How finely the curved wall is faceted. At the largest cylinder rdk ships today
 * (the EPick gripper body, r 35.5mm) the chord error is 0.17mm, well under a pixel
 * at any usable zoom.
 */
const CYLINDER_SEGMENTS = 32

const STL_HEADER_BYTES = 80
const TRIANGLE_COUNT_BYTES = 4
const BYTES_PER_TRIANGLE = 50

type Vec3 = readonly [number, number, number]

/**
 * Tessellates a cylinder into binary STL bytes: centered on the origin, wall of
 * radius `radiusMm`, flat caps at Z = ±`lengthMm`/2. The axis is Z because that
 * is rdk's cylinder convention (`spatialmath/cylinder.go`).
 *
 * Exists because the SDK `Geometry` union has no cylinder case (rdk's own
 * `Cylinder.ToProtobuf` panics over the same gap), so the render path is handed
 * the mesh form instead, the same answer rdk gives its collision checks.
 */
export const cylinderToStlBytes = (radiusMm: number, lengthMm: number): Uint8Array => {
	const triangleCount = CYLINDER_SEGMENTS * 4
	const buffer = new ArrayBuffer(
		STL_HEADER_BYTES + TRIANGLE_COUNT_BYTES + triangleCount * BYTES_PER_TRIANGLE
	)
	const view = new DataView(buffer)
	view.setUint32(STL_HEADER_BYTES, triangleCount, true)

	let offset = STL_HEADER_BYTES + TRIANGLE_COUNT_BYTES
	const writeTriangle = (normal: Vec3, a: Vec3, b: Vec3, c: Vec3) => {
		for (const [x, y, z] of [normal, a, b, c]) {
			view.setFloat32(offset, x, true)
			view.setFloat32(offset + 4, y, true)
			view.setFloat32(offset + 8, z, true)
			offset += 12
		}
		// The attribute byte count, left zero.
		offset += 2
	}

	const halfLength = lengthMm / 2
	const step = (2 * Math.PI) / CYLINDER_SEGMENTS
	const topCenter: Vec3 = [0, 0, halfLength]
	const bottomCenter: Vec3 = [0, 0, -halfLength]

	for (let i = 0; i < CYLINDER_SEGMENTS; i++) {
		const cos0 = Math.cos(i * step)
		const sin0 = Math.sin(i * step)
		const cos1 = Math.cos((i + 1) * step)
		const sin1 = Math.sin((i + 1) * step)

		const bottom0: Vec3 = [radiusMm * cos0, radiusMm * sin0, -halfLength]
		const bottom1: Vec3 = [radiusMm * cos1, radiusMm * sin1, -halfLength]
		const top0: Vec3 = [radiusMm * cos0, radiusMm * sin0, halfLength]
		const top1: Vec3 = [radiusMm * cos1, radiusMm * sin1, halfLength]

		// Analytic normals — radial for the wall, ±Z for the caps — so a degenerate
		// radius or length never divides by a zero-length cross product.
		const wallNormal: Vec3 = [Math.cos((i + 0.5) * step), Math.sin((i + 0.5) * step), 0]
		writeTriangle(wallNormal, bottom0, bottom1, top1)
		writeTriangle(wallNormal, bottom0, top1, top0)
		writeTriangle([0, 0, 1], topCenter, top0, top1)
		writeTriangle([0, 0, -1], bottomCenter, bottom1, bottom0)
	}

	return new Uint8Array(buffer)
}
