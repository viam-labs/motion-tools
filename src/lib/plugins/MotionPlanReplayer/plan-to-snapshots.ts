import { Quaternion, Vector3 } from 'three'
import { UuidTool } from 'uuid-tool'

import { Pose, PoseInFrame, Transform } from '$lib/buf/common/v1/common_pb'
import { Snapshot } from '$lib/buf/draw/v1/snapshot_pb'
import { quaternionToPose } from '$lib/transform'

import type { ParsedPlan } from './parse-plan'

import {
	buildFrameDescriptors,
	type FrameDescriptor,
	type JointFrameDescriptor,
} from './build-frame-descriptors'

// Shared scratch objects — safe in single-threaded JS
const tmpQ = new Quaternion()
const tmpVec = new Vector3()

const computeJointPose = (descriptor: JointFrameDescriptor, angleRad: number): Pose => {
	tmpQ.setFromAxisAngle(
		tmpVec.set(descriptor.axis.X, descriptor.axis.Y, descriptor.axis.Z).normalize(),
		angleRad
	)
	const pose = new Pose()
	quaternionToPose(tmpQ, pose)
	return pose
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

// The snapshot-level uuid is random per step; reconcile ignores it (per-frame identity
// lives on each Transform's uuid). Kept as a helper so every Snapshot is built one way.
const snapshotUuid = (): Uint8Array<ArrayBuffer> =>
	Uint8Array.from(UuidTool.toBytes(crypto.randomUUID()))

/** Wrap one trajectory step's transforms into a Snapshot. */
export const transformsToSnapshot = (transforms: Transform[]): Snapshot =>
	new Snapshot({ transforms, uuid: snapshotUuid() })

/**
 * Decode host-supplied serialized `common.v1.Transform` bytes — one array per trajectory
 * step — into Snapshots. Bytes let a host (e.g. app computing FK server-side with RDK)
 * hand transforms across the protobuf-es / protobuf-ts boundary without depending on this
 * package's proto types; the wire format is the shared contract.
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
