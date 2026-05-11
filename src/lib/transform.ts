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
 * Build a TRS `Matrix4` from a `Pose`, writing into `matrix`. Pool-friendly.
 *
 * `Pose` translation is in millimetres (Viam wire convention); `Matrix4` is
 * rendered directly into Three.js objects whose units are metres. We divide
 * by 1000 at the boundary so the matrix layer is metres throughout and
 * `group.matrix.copy(entity.get(Matrix))` lands the entity at the correct
 * world-space position.
 */
export const poseToMatrix = (pose: Pose, matrix: Matrix4): Matrix4 => {
	ov.set(pose.oX, pose.oY, pose.oZ, MathUtils.degToRad(pose.theta))
	ov.toQuaternion(quaternion)
	matrix.makeRotationFromQuaternion(quaternion)
	matrix.setPosition(pose.x * 0.001, pose.y * 0.001, pose.z * 0.001)
	return matrix
}

/**
 * Decompose a `Matrix4` (metres) into a `Pose` (millimetres), writing into
 * `pose`. Pool-friendly. Mirrors the `× 1000` half of the boundary
 * convention enforced by `poseToMatrix`.
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
 * Compose of the rendered local transform: writes
 * `live × baseline⁻¹ × edited` into `out`. Mirrors the formula
 * `Frame.svelte` uses to blend live kinematics with user-staged edits.
 */
export const composeRenderedMatrix = (
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
 * Pool-friendly inverse of `composeRenderedMatrix` for the gizmo path:
 * writes `baseline × live⁻¹ × target` into `out`. Solves for the
 * `EditedMatrix` that, blended through `composeRenderedMatrix`, renders
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

/** Whether every element of a `Matrix4` is finite (no NaN, no ±∞). */
export const isFiniteMatrix = (matrix: Matrix4): boolean => {
	const e = matrix.elements
	for (let i = 0; i < 16; i++) {
		if (!Number.isFinite(e[i])) return false
	}
	return true
}
