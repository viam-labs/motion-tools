import { Struct } from '@bufbuild/protobuf'
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

/**
 * A goal marker is a geometry-less transform, so `drawTransform` tags it `ReferenceFrame` —
 * which is also what exempts it from the replayer's plan-color tint pass.
 */
const goalMarkerTransforms = (goals: ParsedPlan['goals']): Transform[] => {
	const markers: Transform[] = []

	for (const [goalIndex, goal] of goals.entries()) {
		for (const [frameName, poseInFrame] of Object.entries(goal.poses ?? {})) {
			const name = goals.length > 1 ? `goal-${goalIndex + 1}:${frameName}` : `goal:${frameName}`
			const pose = poseInFrame.pose ?? {}
			// A missing orientation means identity, but a proto Pose zero-fills oX/oY/oZ into an
			// invalid zero-length orientation vector — so default oZ=1 here, as createPose does.
			const hasOrientation = pose.oX !== undefined || pose.oY !== undefined || pose.oZ !== undefined
			markers.push(
				new Transform({
					referenceFrame: name,
					poseInObserverFrame: new PoseInFrame({
						referenceFrame: poseInFrame.referenceFrame ?? 'world',
						pose: new Pose(hasOrientation ? pose : { ...pose, oZ: 1 }),
					}),
					metadata: new Struct({
						fields: { show_axes_helper: { kind: { case: 'boolValue', value: true } } },
					}),
					uuid: Uint8Array.from(UuidTool.toBytes(crypto.randomUUID())),
				})
			)
		}
	}

	return markers
}

const planToSnapshots = (
	descriptors: FrameDescriptor[],
	steps: Array<Record<string, number[]>>,
	goalMarkers: Transform[]
): Snapshot[] =>
	steps.map((stepInputs) => {
		const transforms = descriptors.map((d) => descriptorToTransform(d, stepInputs))
		return new Snapshot({
			transforms: [...transforms, ...goalMarkers],
			uuid: Uint8Array.from(UuidTool.toBytes(crypto.randomUUID())),
		})
	})

export interface PlanReplay {
	snapshots: Snapshot[]
	/** True when the plan carries no trajectory (a failed plan) and the single snapshot poses the robot at its start state. */
	startStateOnly: boolean
}

export const parsedPlanToReplay = (plan: ParsedPlan): PlanReplay => {
	const descriptors = buildFrameDescriptors(plan)
	const goalMarkers = goalMarkerTransforms(plan.goals)

	if (plan.trajectory.length > 0) {
		return {
			snapshots: planToSnapshots(descriptors, plan.trajectory, goalMarkers),
			startStateOnly: false,
		}
	}

	if (plan.startConfiguration) {
		return {
			snapshots: planToSnapshots(descriptors, [plan.startConfiguration], goalMarkers),
			startStateOnly: true,
		}
	}

	return { snapshots: [], startStateOnly: false }
}
