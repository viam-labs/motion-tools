import { BufferAttribute, BufferGeometry, Matrix3, type Matrix4, Vector3 } from 'three'

const a = new Vector3()
const b = new Vector3()
const c = new Vector3()
const ab = new Vector3()
const ac = new Vector3()
const normal = new Vector3()
const centroid = new Vector3()
const tip = new Vector3()
const matrix = new Matrix3()

/**
 * Build a LineSegments-compatible BufferGeometry where each face of `source`
 * contributes one segment: from the triangle centroid out along its face
 * normal by `lengthMeters`. Positions and normal directions are baked into
 * the `transform` matrix.
 */
export const faceNormalsGeometry = (
	source: BufferGeometry,
	lengthMeters: number,
	transform: Matrix4
): BufferGeometry => {
	const positionAttr = source.attributes.position
	const indexAttr = source.index
	const triangleCount = indexAttr ? indexAttr.count / 3 : positionAttr.count / 3
	const positions = new Float32Array(triangleCount * 6)
	matrix.getNormalMatrix(transform)

	for (let i = 0; i < triangleCount; i++) {
		const base = i * 3
		const ia = indexAttr ? indexAttr.getX(base) : base
		const ib = indexAttr ? indexAttr.getX(base + 1) : base + 1
		const ic = indexAttr ? indexAttr.getX(base + 2) : base + 2

		a.fromBufferAttribute(positionAttr, ia)
		b.fromBufferAttribute(positionAttr, ib)
		c.fromBufferAttribute(positionAttr, ic)

		centroid.copy(a).add(b).add(c).divideScalar(3)
		ab.subVectors(b, a)
		ac.subVectors(c, a)
		normal.crossVectors(ab, ac).normalize()

		if (transform) {
			centroid.applyMatrix4(transform)
			normal.applyMatrix3(matrix).normalize()
		}

		tip.copy(centroid).addScaledVector(normal, lengthMeters)

		const offset = i * 6
		positions[offset + 0] = centroid.x
		positions[offset + 1] = centroid.y
		positions[offset + 2] = centroid.z
		positions[offset + 3] = tip.x
		positions[offset + 4] = tip.y
		positions[offset + 5] = tip.z
	}

	const geometry = new BufferGeometry()
	geometry.setAttribute('position', new BufferAttribute(positions, 3))
	return geometry
}
