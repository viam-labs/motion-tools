import { Euler, MathUtils, Matrix4, Quaternion } from 'three'

import type { Pose } from '$lib/math'

const quaternion = new Quaternion()
const euler = new Euler()
const matA = new Matrix4()

export const applyEulerDeltaToPose = (
	pose: Pose,
	delta: { roll?: number; pitch?: number; yaw?: number },
	out: Pose
): void => {
	pose.toQuaternion(quaternion)
	euler.setFromQuaternion(quaternion, 'ZYX')

	if (delta.roll !== undefined) euler.x = MathUtils.degToRad(delta.roll)
	if (delta.pitch !== undefined) euler.y = MathUtils.degToRad(delta.pitch)
	if (delta.yaw !== undefined) euler.z = MathUtils.degToRad(delta.yaw)

	quaternion.setFromEuler(euler)
	out.toQuaternion(quaternion)
}

export const composeLocalMatrix = (
	live: Matrix4,
	baseline: Matrix4,
	edited: Matrix4,
	out: Matrix4
): Matrix4 => {
	matA.copy(baseline).invert()
	out.copy(live).multiply(matA).multiply(edited)
	return out
}

/**
 * Inverse of `composeLocalMatrix` for the transform controls path:
 * writes `baseline × live⁻¹ × target` into `out`. Solves for the
 * `EditedMatrix` that, blended through `composeLocalMatrix`, renders
 * to `target`.
 */
export const solveEditedMatrix = (
	baseline: Matrix4,
	live: Matrix4,
	target: Matrix4,
	out: Matrix4
): Matrix4 => {
	matA.copy(live).invert()
	out.copy(baseline).multiply(matA).multiply(target)
	return out
}
