import { Matrix4, Vector3 } from 'three'

/**
 * Read vertex `index` (xyz triplet) from `buf` as a local-frame point and
 * transform it into world space via `worldMatrix`. Returns `undefined` if the
 * index is out of bounds.
 */
export const readVertexWorld = (
	buf: ArrayLike<number>,
	index: number,
	worldMatrix: Matrix4 | undefined,
	out: Vector3
): Vector3 | undefined => {
	const base = index * 3
	if (base + 2 >= buf.length) return undefined

	out.set(buf[base]!, buf[base + 1]!, buf[base + 2]!)
	if (worldMatrix) out.applyMatrix4(worldMatrix)
	return out
}

/**
 * Convert `world` back to the entity's local frame (via the inverse of
 * `worldMatrix`) and write it into `buf` at vertex `index`. Returns `false`
 * if the index is out of bounds.
 */
export const writeVertexLocal = (
	buf: { length: number; [i: number]: number },
	index: number,
	worldMatrix: Matrix4 | undefined,
	world: Vector3,
	scratch: { local: Vector3; inverse: Matrix4 }
): boolean => {
	const base = index * 3
	if (base + 2 >= buf.length) return false

	scratch.local.copy(world)
	if (worldMatrix) {
		scratch.inverse.copy(worldMatrix).invert()
		scratch.local.applyMatrix4(scratch.inverse)
	}

	buf[base] = scratch.local.x
	buf[base + 1] = scratch.local.y
	buf[base + 2] = scratch.local.z
	return true
}
