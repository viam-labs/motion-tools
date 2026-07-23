import type { Pose } from '@viamrobotics/sdk'

import { Matrix3, Matrix4, Quaternion, Vector3 } from 'three'

import { createPose, quaternionToPose, vector3ToPose } from '$lib/transform'

/** How the destination orientation is derived from a clicked surface. */
export type OrientationMode = 'keep' | 'align'

/** The frame axis pointed into the surface in `align` mode (frame +Z). */
const APPROACH_AXIS = new Vector3(0, 0, 1)

const invDest = new Matrix4()
const localPoint = new Vector3()
const localMatrix = new Matrix4()
const rotation = new Quaternion()
const destRotation = new Quaternion()
const axis = new Vector3()
const normal = new Vector3()
const scratchPosition = new Vector3()
const scratchScale = new Vector3()
const offsetDir = new Vector3()
const worldUp = new Vector3(0, 0, 1)
const normalMatrix = new Matrix3()

/**
 * Transform an object-space face normal into worldspace using the hit object's
 *  world matrix.
 *
 * @returns a normalized copy.
 */
export const worldNormalFromFace = (faceNormal: Vector3, objectMatrixWorld: Matrix4): Vector3 => {
	normalMatrix.getNormalMatrix(objectMatrixWorld)
	return faceNormal.clone().applyMatrix3(normalMatrix).normalize()
}

export interface BuildTargetPoseParams {
	/** The clicked point, in meters. */
	worldPoint: Vector3
	/** World-space unit surface normal, when the hit exposed one. */
	worldNormal?: Vector3
	/** The destination reference frame's world transform in meters. Omit for `world`. */
	destinationWorldMatrix?: Matrix4
	/** The moved frame's current world transform in meters, used to keep orientation. */
	currentWorldMatrix?: Matrix4
	/** Which orientation convention to apply. */
	orientation: OrientationMode
	/** Standoff distance (mm) to lift the goal off the surface along its normal. */
	standoff?: number
	/** The frame axis pointed into the surface in `align` mode. Defaults to +Z. */
	approachAxis?: Vector3
}

/**
 * Build a Viam destination `Pose` (mm + orientation vector, expressed in the
 * destination reference frame) from a clicked world point.
 *
 * Position comes from the click, lifted off the surface by `standoff` (mm) along
 * the normal so the tool stops above the clicked geometry rather than inside it
 * (the planner treats it as an obstacle). Orientation is either kept from the
 * frame's current world transform (`keep`) or aligned so `approachAxis` points
 * into the surface (`align`). `align` silently falls back to `keep` when no
 * normal is available (e.g. point clouds).
 */
export const buildTargetPose = ({
	worldPoint,
	worldNormal,
	destinationWorldMatrix,
	currentWorldMatrix,
	orientation,
	standoff = 0,
	approachAxis = APPROACH_AXIS,
}: BuildTargetPoseParams): Pose => {
	invDest.identity()
	if (destinationWorldMatrix) invDest.copy(destinationWorldMatrix).invert()

	offsetDir.copy(worldNormal ?? worldUp).normalize()
	localPoint
		.copy(worldPoint)
		.addScaledVector(offsetDir, standoff / 1000)
		.applyMatrix4(invDest)

	const pose = createPose()
	vector3ToPose(localPoint, pose)

	if (orientation === 'align' && worldNormal) {
		axis.copy(approachAxis).normalize()
		normal.copy(worldNormal).normalize().negate()
		rotation.setFromUnitVectors(axis, normal)
		if (destinationWorldMatrix) {
			destinationWorldMatrix.decompose(scratchPosition, destRotation, scratchScale)
		} else {
			destRotation.identity()
		}

		rotation.premultiply(destRotation.invert())
		quaternionToPose(rotation, pose)
	} else if (currentWorldMatrix) {
		localMatrix.copy(invDest).multiply(currentWorldMatrix)
		localMatrix.decompose(scratchPosition, rotation, scratchScale)
		quaternionToPose(rotation, pose)
	}

	return pose
}
