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
const matC = new Matrix4()

/**
 * Shape of any matrix-shaped trait (Matrix / EditedMatrix / LiveMatrix /
 * WorldMatrix / InstancedMatrix). Column-major to mirror `Matrix4.elements`.
 */
export interface MatrixTraitFields {
	m0: number
	m1: number
	m2: number
	m3: number
	m4: number
	m5: number
	m6: number
	m7: number
	m8: number
	m9: number
	m10: number
	m11: number
	m12: number
	m13: number
	m14: number
	m15: number
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

export const poseToMatrix = (pose: Pose) => {
	ov.set(pose.oX, pose.oY, pose.oZ, MathUtils.degToRad(pose.theta))
	ov.toQuaternion(quaternion)

	const matrix = new Matrix4()
	matrix.makeRotationFromQuaternion(quaternion)
	matrix.setPosition(pose.x, pose.y, pose.z)
	return matrix
}

export const matrixToPose = (matrix: Matrix4) => {
	const pose = createPose()

	matrix.decompose(translation, quaternion, scale)
	pose.x = translation.x
	pose.y = translation.y
	pose.z = translation.z

	ov.setFromQuaternion(quaternion)
	pose.oX = ov.x
	pose.oY = ov.y
	pose.oZ = ov.z
	pose.theta = MathUtils.radToDeg(ov.th)

	return pose
}

export const composeRenderedPose = (livePose: Pose, baselinePose: Pose, editedPose: Pose): Pose =>
	matrixToPose(
		poseToMatrix(livePose)
			.multiply(poseToMatrix(baselinePose).invert())
			.multiply(poseToMatrix(editedPose))
	)

export const composeEditedPoseForRenderedPose = (
	baselinePose: Pose,
	livePose: Pose,
	renderedPose: Pose
): Pose =>
	matrixToPose(
		poseToMatrix(baselinePose)
			.multiply(poseToMatrix(livePose).invert())
			.multiply(poseToMatrix(renderedPose))
	)

export const isFinitePose = (pose: Pose): boolean =>
	Number.isFinite(pose.x) &&
	Number.isFinite(pose.y) &&
	Number.isFinite(pose.z) &&
	Number.isFinite(pose.oX) &&
	Number.isFinite(pose.oY) &&
	Number.isFinite(pose.oZ) &&
	Number.isFinite(pose.theta)

/** Fresh identity matrix-shaped trait object. Used at spawn sites. */
export const newMatrixTrait = (): MatrixTraitFields => ({
	m0: 1,
	m1: 0,
	m2: 0,
	m3: 0,
	m4: 0,
	m5: 1,
	m6: 0,
	m7: 0,
	m8: 0,
	m9: 0,
	m10: 1,
	m11: 0,
	m12: 0,
	m13: 0,
	m14: 0,
	m15: 1,
})

/** Copy a matrix-shaped trait's 16 fields into a `Matrix4`. */
export const readTraitToMatrix = (trait: MatrixTraitFields, out: Matrix4): Matrix4 => {
	const e = out.elements
	e[0] = trait.m0
	e[1] = trait.m1
	e[2] = trait.m2
	e[3] = trait.m3
	e[4] = trait.m4
	e[5] = trait.m5
	e[6] = trait.m6
	e[7] = trait.m7
	e[8] = trait.m8
	e[9] = trait.m9
	e[10] = trait.m10
	e[11] = trait.m11
	e[12] = trait.m12
	e[13] = trait.m13
	e[14] = trait.m14
	e[15] = trait.m15
	return out
}

/** Copy a `Matrix4`'s 16 elements into a matrix-shaped trait object. */
export const writeMatrixToTrait = <T extends MatrixTraitFields>(matrix: Matrix4, out: T): T => {
	const e = matrix.elements
	out.m0 = e[0]
	out.m1 = e[1]
	out.m2 = e[2]
	out.m3 = e[3]
	out.m4 = e[4]
	out.m5 = e[5]
	out.m6 = e[6]
	out.m7 = e[7]
	out.m8 = e[8]
	out.m9 = e[9]
	out.m10 = e[10]
	out.m11 = e[11]
	out.m12 = e[12]
	out.m13 = e[13]
	out.m14 = e[14]
	out.m15 = e[15]
	return out
}

/**
 * Build a TRS `Matrix4` from a `Pose`, writing into `out`. Pool-friendly.
 *
 * `Pose` translation is in millimetres (Viam wire convention); `Matrix4`
 * here is rendered directly into Three.js objects whose units are metres.
 * We divide by 1000 at the boundary so the matrix layer is metres throughout
 * and `group.matrix.copy(matrixTrait)` lands the entity at the correct
 * world-space position.
 */
export const poseToMatrixInto = (pose: Pose, out: Matrix4): Matrix4 => {
	ov.set(pose.oX, pose.oY, pose.oZ, MathUtils.degToRad(pose.theta))
	ov.toQuaternion(quaternion)
	out.makeRotationFromQuaternion(quaternion)
	out.setPosition(pose.x * 0.001, pose.y * 0.001, pose.z * 0.001)
	return out
}

/**
 * Decompose a `Matrix4` (metres) into a `Pose` (millimetres), writing into
 * `out`. Pool-friendly. Mirrors the `× 1000` half of the boundary
 * convention enforced by `poseToMatrixInto`.
 */
export const matrixToPoseInto = (matrix: Matrix4, out: Pose): Pose => {
	matrix.decompose(translation, quaternion, scale)
	out.x = translation.x * 1000
	out.y = translation.y * 1000
	out.z = translation.z * 1000
	ov.setFromQuaternion(quaternion)
	out.oX = ov.x
	out.oY = ov.y
	out.oZ = ov.z
	out.theta = MathUtils.radToDeg(ov.th)
	return out
}

/**
 * Convenience: convert a `Pose` directly into a matrix-shaped trait (fills
 * 16 m-fields). Used at RPC ingestion and Details-panel commit boundaries.
 */
export const poseToMatrixTrait = <T extends MatrixTraitFields>(pose: Pose, out: T): T => {
	poseToMatrixInto(pose, matC)
	return writeMatrixToTrait(matC, out)
}

/**
 * Convenience: convert a matrix-shaped trait directly into a `Pose` (fills
 * the 7 pose fields). Used at Details-panel display and RPC egress
 * boundaries.
 */
export const matrixTraitToPose = (trait: MatrixTraitFields, out: Pose): Pose => {
	readTraitToMatrix(trait, matC)
	return matrixToPoseInto(matC, out)
}

/**
 * Pool-friendly composeRenderedPose for matrices: writes
 * `live × baseline⁻¹ × edited` into `out`. Mirrors the formula
 * `Pose.svelte` uses to drive the rendered local transform.
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
export const composeEditedMatrixForRenderedMatrix = (
	baseline: Matrix4,
	live: Matrix4,
	target: Matrix4,
	out: Matrix4
): Matrix4 => {
	matA.copy(live).invert()
	out.copy(baseline).multiply(matA).multiply(target)
	return out
}

/** Whether every element of a matrix trait is finite (no NaN, no ±∞). */
export const isFiniteMatrixTrait = (trait: MatrixTraitFields): boolean =>
	Number.isFinite(trait.m0) &&
	Number.isFinite(trait.m1) &&
	Number.isFinite(trait.m2) &&
	Number.isFinite(trait.m3) &&
	Number.isFinite(trait.m4) &&
	Number.isFinite(trait.m5) &&
	Number.isFinite(trait.m6) &&
	Number.isFinite(trait.m7) &&
	Number.isFinite(trait.m8) &&
	Number.isFinite(trait.m9) &&
	Number.isFinite(trait.m10) &&
	Number.isFinite(trait.m11) &&
	Number.isFinite(trait.m12) &&
	Number.isFinite(trait.m13) &&
	Number.isFinite(trait.m14) &&
	Number.isFinite(trait.m15)
