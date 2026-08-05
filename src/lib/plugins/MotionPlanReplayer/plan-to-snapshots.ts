/**
 * The forward-kinematics half of the client-side fallback (see `parse-plan.ts`). A trajectory step
 * carries joint values rather than poses, so `computeJointPose` reproduces RDK's
 * `rotationalFrame.Transform` — axis-angle about the joint's declared axis. Server FK via
 * `ComputePlanFrames` is the path that shares RDK's own implementation; this one agrees with it only
 * for the frame types the fallback covers.
 */

import { Quaternion, Vector3 } from 'three'
import { UuidTool } from 'uuid-tool'

import { PoseInFrame, Transform } from '$lib/buf/common/v1/common_pb'
import { Snapshot } from '$lib/buf/draw/v1/snapshot_pb'
import { Pose } from '$lib/math'

import type { ParsedPlan } from './parse-plan'

import {
	buildFrameDescriptors,
	type FrameDescriptor,
	type JointFrameDescriptor,
} from './build-frame-descriptors'
import { worldStateObstacleTransforms } from './world-state-obstacles'

const quat = new Quaternion()
const vec3 = new Vector3()

/** RDK reads the step value as radians for a revolute joint and millimetres for a prismatic one. */
const computeJointPose = (descriptor: JointFrameDescriptor, value: number): Pose => {
	// RDK normalizes on unmarshal; the JSON itself does not guarantee a unit axis.
	vec3.set(descriptor.axis.X, descriptor.axis.Y, descriptor.axis.Z).normalize()

	if (descriptor.motion === 'translational') {
		return new Pose(vec3.x * value, vec3.y * value, vec3.z * value)
	}

	quat.setFromAxisAngle(vec3, value)
	return new Pose().setFromQuaternion(quat)
}

const descriptorToTransform = (
	descriptor: FrameDescriptor,
	stepInputs: Record<string, number[]>
): Transform => {
	if (descriptor.kind === 'static') {
		return new Transform({
			referenceFrame: descriptor.name,
			poseInObserverFrame: new PoseInFrame({
				referenceFrame: descriptor.parent,
				pose: descriptor.localPose,
			}),
			physicalObject: descriptor.geometry ?? undefined,
			uuid: descriptor.uuid,
		})
	}

	// A mimic joint reads its source's column and maps it; every other joint reads its own and is done.
	const column = stepInputs[descriptor.componentName]?.[descriptor.jointIndex] ?? 0
	const jointValue = descriptor.mimic
		? descriptor.mimic.multiplier * column + descriptor.mimic.offset
		: column
	return new Transform({
		referenceFrame: descriptor.name,
		poseInObserverFrame: new PoseInFrame({
			referenceFrame: descriptor.parent,
			pose: computeJointPose(descriptor, jointValue),
		}),
		uuid: descriptor.uuid,
	})
}

// Reconcile keys on Transform.uuid; snapshot uuid is unused. Helper keeps one construction path.
const snapshotUuid = (): Uint8Array<ArrayBuffer> =>
	Uint8Array.from(UuidTool.toBytes(crypto.randomUUID()))

export const transformsToSnapshot = (transforms: Transform[]): Snapshot =>
	new Snapshot({ transforms, uuid: snapshotUuid() })

/**
 * Bytes bridge protobuf-es (this package) and protobuf-ts (host) without sharing generated types.
 * One inner array = one trajectory step.
 */
export const transformBytesToSnapshots = (transformsPerStep: Uint8Array[][]): Snapshot[] =>
	transformsPerStep.map((step) =>
		transformsToSnapshot(step.map((bytes) => Transform.fromBinary(bytes)))
	)

export const parsedPlanToSnapshots = (plan: ParsedPlan): Snapshot[] => {
	const descriptors = buildFrameDescriptors(plan)

	// Built once and shared by every step rather than per-step: reconcile keys on `Transform.uuid`,
	// so stable uuids let obstacles spawn on the first step and survive a scrub untouched.
	const obstacles = worldStateObstacleTransforms(plan)

	return plan.trajectory.map((stepInputs) =>
		transformsToSnapshot([
			...descriptors.map((descriptor) => descriptorToTransform(descriptor, stepInputs)),
			...obstacles,
		])
	)
}
