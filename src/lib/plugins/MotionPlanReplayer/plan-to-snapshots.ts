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

const quat = new Quaternion()
const vec3 = new Vector3()

const computeJointPose = (descriptor: JointFrameDescriptor, angleRad: number): Pose => {
	quat.setFromAxisAngle(
		vec3.set(descriptor.axis.X, descriptor.axis.Y, descriptor.axis.Z).normalize(),
		angleRad
	)
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

	const angleRad = stepInputs[descriptor.componentName]?.[descriptor.jointIndex] ?? 0
	return new Transform({
		referenceFrame: descriptor.name,
		poseInObserverFrame: new PoseInFrame({
			referenceFrame: descriptor.parent,
			pose: computeJointPose(descriptor, angleRad),
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

const planToSnapshots = (
	descriptors: FrameDescriptor[],
	trajectory: Array<Record<string, number[]>>
): Snapshot[] =>
	trajectory.map((stepInputs) =>
		transformsToSnapshot(descriptors.map((d) => descriptorToTransform(d, stepInputs)))
	)

export const parsedPlanToSnapshots = (plan: ParsedPlan): Snapshot[] => {
	const descriptors = buildFrameDescriptors(plan)
	return planToSnapshots(descriptors, plan.trajectory)
}
