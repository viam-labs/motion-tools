/**
 * The one piece of forward kinematics a trajectory step needs: a step carries joint values, not
 * poses, so this reproduces RDK's `rotationalFrame.Transform` / `translationalFrame.Transform`
 * — motion about the joint's declared axis.
 *
 * Split out of `plan-to-snapshots.ts`, which is about assembling `Snapshot` messages. This is the
 * kinematics underneath that, and nothing here knows a plan is being replayed.
 */

import { Quaternion, Vector3 } from 'three'

import { Pose } from '$lib/math'

import type { JointFrameDescriptor } from './frameDescriptors'

/** One step: joint values per component, positional by joint index. Radians, or mm if prismatic. */
export type TrajectoryStep = Record<string, number[]>

const quat = new Quaternion()
const vec3 = new Vector3()

/** RDK reads the step value as radians for a revolute joint and millimetres for a prismatic one. */
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
 * A step addresses joints positionally per component (`{'left-arm': [0.1, -0.3, …]}`). A missing
 * column means the component contributed no inputs to this plan, which reads the same as zero.
 *
 * A mimic joint has no column of its own, so `jointIndex` addresses its *source* and the linear map
 * on the descriptor turns that value into this joint's — the same derivation RDK applies at
 * `referenceframe/model.go:585`.
 */
export const jointValueAt = (
	descriptor: JointFrameDescriptor,
	stepInputs: TrajectoryStep
): number => {
	const column = stepInputs[descriptor.componentName]?.[descriptor.jointIndex] ?? 0
	const { mimic } = descriptor
	return mimic ? mimic.multiplier * column + mimic.offset : column
}
