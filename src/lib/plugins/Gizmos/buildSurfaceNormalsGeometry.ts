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

export const buildSurfaceNormalsGeometry = (
	source: BufferGeometry,
	lengthMeters: number,
	transform: Matrix4
) => {
	const triangleCount = Math.floor(
		source.index ? source.index.count / 3 : source.attributes.position.count / 3
	)

	const positions = new Float32Array(triangleCount * 6)
	matrix.getNormalMatrix(transform)
	for (let i = 0; i < triangleCount; i++) {
		const base = i * 3
		const ia = source.index ? source.index.getX(base) : base
		const ib = source.index ? source.index.getX(base + 1) : base + 1
		const ic = source.index ? source.index.getX(base + 2) : base + 2

		a.fromBufferAttribute(source.attributes.position, ia)
		b.fromBufferAttribute(source.attributes.position, ib)
		c.fromBufferAttribute(source.attributes.position, ic)

		centroid.copy(a).add(b).add(c).divideScalar(3)
		ab.subVectors(b, a)
		ac.subVectors(c, a)
		normal.crossVectors(ab, ac).normalize()
		centroid.applyMatrix4(transform)
		normal.applyMatrix3(matrix).normalize()
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
