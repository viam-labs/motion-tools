/**
 * The one piece of forward kinematics a trajectory step needs: it carries joint values, not poses,
 * so this reproduces RDK's `rotationalFrame.Transform` and `translationalFrame.Transform`.
 */

import { Quaternion, Vector3 } from 'three'

import { Pose } from '$lib/math'

import type { JointFrameDescriptor } from './frameDescriptors'

/** One step: joint values per component, positional by joint index. Radians, or mm if prismatic. */
export type TrajectoryStep = Record<string, number[]>

const quat = new Quaternion()
const vec3 = new Vector3()

/** RDK reads the step value as radians for a revolute joint and millimeters for a prismatic one. */
export const computeJointPose = (descriptor: JointFrameDescriptor, value: number): Pose => {
	// RDK normalizes on unmarshal; the JSON itself does not guarantee a unit axis.
	vec3.set(descriptor.axis.X, descriptor.axis.Y, descriptor.axis.Z).normalize()

	if (descriptor.motion === 'translational') {
		return new Pose(vec3.x * value, vec3.y * value, vec3.z * value)
	}

	quat.setFromAxisAngle(vec3, value)
	return new Pose().setFromQuaternion(quat)
}

/**
 * A step addresses joints positionally per component; a missing column reads as zero, where RDK's
 * `FrameSystem.Transform` errors instead.
 *
 * The `offset` is in the column's unit, radians or millimetres, not degrees like the sibling `min`
 * and `max`.
 */
export const jointValueAt = (
	descriptor: JointFrameDescriptor,
	stepInputs: TrajectoryStep
): number => {
	const column = stepInputs[descriptor.componentName]?.[descriptor.jointIndex] ?? 0
	const { mimic } = descriptor
	return mimic ? mimic.multiplier * column + mimic.offset : column
}
