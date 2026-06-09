import type { Pose } from '@viamrobotics/sdk'

import { Euler, MathUtils, Matrix4, type Object3D, Quaternion, Vector3 } from 'three'

import type { Frame } from './frame'

import { OrientationVector } from './three/OrientationVector'

const quaternion = new Quaternion()
const euler = new Euler()
const ov = new OrientationVector()
const translation = new Vector3()
const scale = new Vector3()
const matA = new Matrix4()

export const isPoseEqual = (a: Pose | undefined, b: Pose | undefined): boolean => {
	if (a === b) return true
	if (!a || !b) return false
	return (
		a.x === b.x &&
		a.y === b.y &&
		a.z === b.z &&
		a.oX === b.oX &&
		a.oY === b.oY &&
		a.oZ === b.oZ &&
		a.theta === b.theta
	)
}

export const createPose = (pose?: Partial<Pose>): Pose => {
	// We should only default to the 0,0,1,0 orientation vector if the entire vector component is missing
	const oZ =
		pose?.oX === undefined && pose?.oY === undefined && pose?.oZ === undefined ? 1 : (pose?.oZ ?? 0)

	// pose expects theta in degrees
	return {
		x: pose?.x ?? 0,
		y: pose?.y ?? 0,
		z: pose?.z ?? 0,
		oX: pose?.oX ?? 0,
		oY: pose?.oY ?? 0,
		oZ,
		theta: pose?.theta ?? 0,
	}
}

export const createPoseFromFrame = (frame: Partial<Frame>): Pose => {
	if (frame.orientation?.type === 'quaternion') {
		quaternion.copy(frame.orientation.value)
		ov.setFromQuaternion(quaternion)
	} else if (frame.orientation?.type === 'euler_angles') {
		euler.set(
			frame.orientation.value.roll,
			frame.orientation.value.pitch,
			frame.orientation.value.yaw,
			'ZYX'
		)
		quaternion.setFromEuler(euler)
		ov.setFromQuaternion(quaternion)
	} else if (frame.orientation?.type === 'ov_radians') {
		ov.copy(frame.orientation.value)
	} else if (frame.orientation) {
		const th = MathUtils.degToRad(frame.orientation?.value.th ?? 0)
		ov.set(frame.orientation?.value.x, frame.orientation?.value.y, frame.orientation?.value.z, th)
	} else {
		ov.set(0, 0, 1, 0)
	}

	return {
		x: frame.translation?.x ?? 0,
		y: frame.translation?.y ?? 0,
		z: frame.translation?.z ?? 0,
		oX: ov.x,
		oY: ov.y,
		oZ: ov.z,
		theta: MathUtils.radToDeg(ov.th),
	}
}

export const quaternionToPose = (quaternion: Quaternion, pose: Partial<Pose>) => {
	ov.setFromQuaternion(quaternion)
	pose.oX = ov.x
	pose.oY = ov.y
	pose.oZ = ov.z
	pose.theta = MathUtils.radToDeg(ov.th)
}

export const vector3ToPose = (vec3: Vector3, pose: Partial<Pose>) => {
	pose.x = vec3.x * 1000
	pose.y = vec3.y * 1000
	pose.z = vec3.z * 1000
}

export const object3dToPose = (object3d: Object3D, pose: Partial<Pose>) => {
	vector3ToPose(object3d.position, pose)
	quaternionToPose(object3d.quaternion, pose)
	return pose
}

export const poseToQuaternion = (pose?: Partial<Pose>, quaternion?: Quaternion) => {
	const th = MathUtils.degToRad(pose?.theta ?? 0)
	ov.set(pose?.oX, pose?.oY, pose?.oZ, th)
	if (quaternion) {
		ov.toQuaternion(quaternion)
	}
}

export const poseToVector3 = (pose?: Partial<Pose>, vec3?: Vector3) => {
	vec3?.set(pose?.x ?? 0, pose?.y ?? 0, pose?.z ?? 0).multiplyScalar(0.001)
}

export const poseToObject3d = (pose: Partial<Pose>, object3d: Object3D) => {
	poseToVector3(pose, object3d.position)
	poseToQuaternion(pose, object3d.quaternion)
}

export const poseToDirection = (pose: Pose): Vector3 => {
	ov.set(pose.oX, pose.oY, pose.oZ, MathUtils.degToRad(pose.theta))
	return new Vector3(ov.x, ov.y, ov.z)
}

export const isFinitePose = (pose: Pose): boolean =>
	Number.isFinite(pose.x) &&
	Number.isFinite(pose.y) &&
	Number.isFinite(pose.z) &&
	Number.isFinite(pose.oX) &&
	Number.isFinite(pose.oY) &&
	Number.isFinite(pose.oZ) &&
	Number.isFinite(pose.theta)

/**
 * Build a TRS `Matrix4` (m) from a `Pose` (mm), writing into `matrix`.
 */
export const poseToMatrix = (pose: Pose, matrix: Matrix4): Matrix4 => {
	ov.set(pose.oX, pose.oY, pose.oZ, MathUtils.degToRad(pose.theta))
	ov.toQuaternion(quaternion)
	matrix.makeRotationFromQuaternion(quaternion)
	matrix.setPosition(pose.x * 0.001, pose.y * 0.001, pose.z * 0.001)
	return matrix
}

/**
 * Decompose a `Matrix4` (m) into a `Pose` (mm), writing into `pose`.
 */
export const matrixToPose = (matrix: Matrix4, pose: Pose): Pose => {
	matrix.decompose(translation, quaternion, scale)
	pose.x = translation.x * 1000
	pose.y = translation.y * 1000
	pose.z = translation.z * 1000
	ov.setFromQuaternion(quaternion)
	pose.oX = ov.x
	pose.oY = ov.y
	pose.oZ = ov.z
	pose.theta = MathUtils.radToDeg(ov.th)
	return pose
}

/**
 * Compose the entity's local-to-parent transform: writes
 * `live × baseline⁻¹ × edited` into `out`. Mirrors the formula
 * `Frame.svelte` uses to blend live kinematics with user-staged edits;
 * `worldMatrix.ts` premultiplies the result by the parent's `WorldMatrix`.
 */
export const poseToEulerDegrees = (
	pose: Partial<Pose>
): { roll: number; pitch: number; yaw: number } => {
	poseToQuaternion(pose, quaternion)
	euler.setFromQuaternion(quaternion, 'ZYX')
	return {
		roll: MathUtils.radToDeg(euler.x),
		pitch: MathUtils.radToDeg(euler.y),
		yaw: MathUtils.radToDeg(euler.z),
	}
}

export const applyEulerDeltaToPose = (
	pose: Partial<Pose>,
	delta: { roll?: number; pitch?: number; yaw?: number },
	out: Partial<Pose>
): void => {
	poseToQuaternion(pose, quaternion)
	euler.setFromQuaternion(quaternion, 'ZYX')
	if (delta.roll !== undefined) euler.x = MathUtils.degToRad(delta.roll)
	if (delta.pitch !== undefined) euler.y = MathUtils.degToRad(delta.pitch)
	if (delta.yaw !== undefined) euler.z = MathUtils.degToRad(delta.yaw)
	quaternion.setFromEuler(euler)
	quaternionToPose(quaternion, out)
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
