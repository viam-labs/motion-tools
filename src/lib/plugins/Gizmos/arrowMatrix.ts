import { Matrix4, Quaternion, Vector3 } from 'three'

import type { ArrowAxis } from './useGizmosPlugin.svelte'

const tempQuat = new Quaternion()
const tempDir = new Vector3()
const xAxis = new Vector3(1, 0, 0)
const yUnit = new Vector3(0, 1, 0)
const zAxis = new Vector3(0, 0, 1)
const unitScale = new Vector3(1, 1, 1)

/**
 * Build a Matrix4 placing an arrow gizmo at `position` with its head at
 * `position` and tail extending back along the chosen direction.
 *
 * `axis` picks the unsigned world direction:
 *
 * - `x` / `y` / `z` — the corresponding world axis.
 * - `surface` — the surface normal at the click point.
 */
export const arrowMatrix = (
	axis: ArrowAxis,
	position: Vector3,
	surfaceNormal: Vector3 | undefined
): Matrix4 => {
	let direction: Vector3
	if (axis === 'surface') direction = surfaceNormal ?? zAxis
	else if (axis === 'x') direction = xAxis
	else if (axis === 'z') direction = zAxis
	else direction = yUnit

	tempDir.copy(direction).negate()
	tempQuat.setFromUnitVectors(yUnit, tempDir)

	return new Matrix4().compose(position, tempQuat, unitScale)
}
