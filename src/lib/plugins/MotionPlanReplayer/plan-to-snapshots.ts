import { Quaternion, Vector3 } from 'three'

import { Pose, PoseInFrame, Transform } from '$lib/buf/common/v1/common_pb'
import { Snapshot } from '$lib/buf/draw/v1/snapshot_pb'
import { poseToQuaternion, quaternionToPose } from '$lib/transform'

import {
	buildFrameDescriptors,
	type FrameDescriptor,
	type JointedLinkDescriptor,
} from './build-frame-descriptors'
import { parsePlan } from './parse-plan'
import { planUuid } from './plan-uuid'

// Shared scratch objects — safe in single-threaded JS
const tmpQ = new Quaternion()
const tmpLinkQ = new Quaternion()
const tmpVec = new Vector3()

/**
 * Compute the combined local transform for a jointed link at a given joint angle.
 *
 * The correct FK composition is R_joint × T_link:
 *   - rotation block  = R_joint × R_link  (joint rotation, then link's own orientation)
 *   - translation     = R_joint × t_link  (link's offset rotated into joint's frame)
 */
const computeJointedLinkPose = (descriptor: JointedLinkDescriptor, angleRad: number): Pose => {
	tmpVec.set(descriptor.axis.X, descriptor.axis.Y, descriptor.axis.Z)
	tmpQ.setFromAxisAngle(tmpVec, angleRad)

	const p = descriptor.linkPose
	poseToQuaternion(p, tmpLinkQ)

	const combinedQ = tmpQ.clone().multiply(tmpLinkQ)

	tmpVec.set(p.x, p.y, p.z)
	tmpVec.applyQuaternion(tmpQ)

	const pose = new Pose({ x: tmpVec.x, y: tmpVec.y, z: tmpVec.z })
	quaternionToPose(combinedQ, pose)
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
			pose: computeJointedLinkPose(descriptor, angleRad),
		}),
		physicalObject: descriptor.geometry ?? undefined,
		uuid: descriptor.uuid,
	})
}

const planToSnapshots = (
	descriptors: FrameDescriptor[],
	trajectory: Array<Record<string, number[]>>
): Snapshot[] =>
	trajectory.map((stepInputs) => {
		const transforms = descriptors.map((d) => descriptorToTransform(d, stepInputs))
		return new Snapshot({ transforms, uuid: planUuid() })
	})

export const planJsonToSnapshots = (content: string): Snapshot[] => {
	const plan = parsePlan(content)
	const descriptors = buildFrameDescriptors(plan)
	return planToSnapshots(descriptors, plan.trajectory)
}
