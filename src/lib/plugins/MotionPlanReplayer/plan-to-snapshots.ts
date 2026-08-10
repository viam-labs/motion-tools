/**
 * The snapshot half of the client-side fallback (see `parse-plan.ts`): it pairs the frame chain
 * from `$lib/motion/frameDescriptors` with a trajectory to produce one `Snapshot` per step. Server
 * FK via `ComputePlanFrames` is the path that shares RDK's own implementation; this one agrees with
 * it only for the frame types the fallback covers.
 */

import { UuidTool } from 'uuid-tool'

import type { FrameDescriptor } from '$lib/motion/frameDescriptors'
import type { TrajectoryStep } from '$lib/motion/jointPose'

import { PoseInFrame, Transform } from '$lib/buf/common/v1/common_pb'
import { Snapshot } from '$lib/buf/draw/v1/snapshot_pb'
import { buildFrameDescriptors } from '$lib/motion/frameDescriptors'
import { computeJointPose, jointValueAt } from '$lib/motion/jointPose'

import type { ParsedPlan } from './parse-plan'

import { worldStateObstacleTransforms } from './world-state-obstacles'

const descriptorToTransform = (
	descriptor: FrameDescriptor,
	stepInputs: TrajectoryStep
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

	const jointValue = jointValueAt(descriptor, stepInputs)
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
