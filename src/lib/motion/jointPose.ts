/**
 * The one piece of forward kinematics a trajectory step needs: a step carries joint values, not
 * poses, so this reproduces RDK's `rotationalFrame.Transform` / `translationalFrame.Transform`
 * — motion about the joint's declared axis.
 *
 * Shared by the two things that turn a trajectory into geometry: the plan replayer's snapshot
 * builder and the move panel's preview ghosts.
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
	// The JSON does not guarantee a unit axis, and RDK normalizes at two different moments depending
	// on the joint. A translational frame normalizes on unmarshal (`transAxis: axis.Normalize()`); a
	// rotational one stores the axis raw and normalizes at use, inside `R4AA.ToQuat`. Normalizing
	// once here covers both. Do not read this as "RDK normalizes on unmarshal" — that is only half
	// true, and the half that is false is the joint kind an arm is made of.
	vec3.set(descriptor.axis.X, descriptor.axis.Y, descriptor.axis.Z).normalize()

	if (descriptor.motion === 'translational') {
		return new Pose(vec3.x * value, vec3.y * value, vec3.z * value)
	}

	quat.setFromAxisAngle(vec3, value)
	return new Pose().setFromQuaternion(quat)
}

/**
 * A step addresses joints positionally per component (`{'left-arm': [0.1, -0.3, …]}`).
 *
 * A missing column falls back to zero, and that is this client's choice rather than RDK's. RDK
 * refuses: `FrameSystem.Transform` returns `NewIncorrectDoFError` when a frame's input count does
 * not match its DoF, and `LinearInputs` errors with `no inputs for frame %s with dof: %d`. Drawing
 * the chain at zero shows the rest of the plan where erroring would show none of it, which is the
 * right trade for a viewer and the wrong one for a planner.
 *
 * A mimic joint has no column of its own, so `jointIndex` addresses its *source* and the linear map
 * on the descriptor turns that value into this joint's, multiply-then-offset. That matches RDK's
 * `frameSystem.Transform` (`derived := mi.multiplier*sourceInputs[0] + mi.offset`) and
 * `SimpleModel`'s equivalent. Named rather than cited by line: the numbers drift between releases,
 * and the line this used to give was in `SimpleModel.Geometries`, which is not a forward-kinematics
 * path at all. Both callers reach this function, so the replayer and the preview ghosts agree on a
 * gripper's second finger.
 */
export const jointValueAt = (
	descriptor: JointFrameDescriptor,
	stepInputs: TrajectoryStep
): number => {
	const column = stepInputs[descriptor.componentName]?.[descriptor.jointIndex] ?? 0
	const { mimic } = descriptor
	return mimic ? mimic.multiplier * column + mimic.offset : column
}

/** The frame's pose relative to its parent at `stepInputs`, whichever kind of frame it is. */
export const descriptorLocalPose = (
	descriptor: { kind: 'static'; localPose: Pose } | JointFrameDescriptor,
	stepInputs: TrajectoryStep
): Pose =>
	descriptor.kind === 'static'
		? descriptor.localPose
		: computeJointPose(descriptor, jointValueAt(descriptor, stepInputs))
