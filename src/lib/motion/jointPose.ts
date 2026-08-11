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
	const { axis } = descriptor
	// `axis` comes off an unchecked cast in `frameDescriptors.ts` (`innerData.axis as {…}`), so the
	// type says this is always a well-formed vector and the runtime does not guarantee it. A missing
	// or non-numeric axis would otherwise throw an unhelpful "Cannot read properties of undefined"
	// out of `vec3.set`. A zero-length axis is worse: it would not throw at all. Three's
	// `normalize()` guards `length() || 1`, so `(0,0,0)` survives normalization unchanged, and
	// `setFromAxisAngle((0,0,0), value)` yields a non-unit, meaningless quaternion in silence.
	if (
		!axis ||
		!Number.isFinite(axis.X) ||
		!Number.isFinite(axis.Y) ||
		!Number.isFinite(axis.Z)
	) {
		throw new Error(`joint "${descriptor.name}" has a missing or non-numeric axis`)
	}

	// The JSON does not guarantee a unit axis, and RDK normalizes at two different moments depending
	// on the joint. A translational frame normalizes on unmarshal (`transAxis: axis.Normalize()`); a
	// rotational one stores the axis raw and normalizes at use, inside `R4AA.ToQuat`. Normalizing
	// once here covers both. Do not read this as "RDK normalizes on unmarshal" — that is only half
	// true, and the half that is false is the joint kind an arm is made of.
	vec3.set(axis.X, axis.Y, axis.Z)
	if (vec3.lengthSq() === 0) {
		throw new Error(`joint "${descriptor.name}" has a zero-length axis`)
	}
	vec3.normalize()

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
 * path at all. Both callers reach this function — the preview ghosts do so through
 * `createForwardKinematics` rather than directly — so the replayer and the preview ghosts agree on a
 * gripper's second finger.
 */
export const jointValueAt = (
	descriptor: JointFrameDescriptor,
	stepInputs: TrajectoryStep
): number => {
	const column = stepInputs[descriptor.componentName]?.[descriptor.jointIndex] ?? 0
	const { mimic } = descriptor
	// `offset` is not degree-converted the way the sibling `min`/`max` on `JointConfig` are, and that
	// is not an oversight: RDK's `MimicConfig.ValueOffset` is in position units (radians once a model
	// resolves an input) and is never passed through `DegToRad`, while `JointConfig.Min`/`Max` are
	// declared "in mm or degs" and are converted. RDK also rejects a mimic joint that declares limits
	// at all (`ErrMimicWithLimits`: "mimic joint must not specify min/max limits; limits are
	// determined by the source joint"), so on a real mimic joint the degree-valued siblings are not
	// merely different units from `offset`, they are absent. Do not convert `offset`.
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
