import { Quaternion, Vector3 as ThreeVector3 } from 'three'

import { quaternionToPose } from '$lib/transform'
import {
	Capsule,
	Geometry,
	Pose,
	PoseInFrame,
	RectangularPrism,
	Sphere,
	Transform,
	Vector3 as ViamVector3,
} from '$lib/buf/common/v1/common_pb'
import { Snapshot } from '$lib/buf/draw/v1/snapshot_pb'

import {
	buildFrameDescriptors,
	type FrameDescriptor,
	type GeometryDescriptor,
} from './build-frame-descriptors'
import { parsePlan } from './parse-plan'
import { planUuid } from './plan-uuid'

// Scratch objects — safe in single-threaded JS
const tmpQ = new Quaternion()
const tmpAxis = new ThreeVector3()

const buildGeometry = (geom: GeometryDescriptor): Geometry => {
	const center = new Pose({
		x: geom.centerPose.x,
		y: geom.centerPose.y,
		z: geom.centerPose.z,
		oX: geom.centerPose.oX,
		oY: geom.centerPose.oY,
		oZ: geom.centerPose.oZ,
		theta: geom.centerPose.theta,
	})

	if (geom.type === 'sphere') {
		return new Geometry({
			center,
			geometryType: { case: 'sphere', value: new Sphere({ radiusMm: geom.r ?? 0 }) },
			label: geom.label,
		})
	}

	if (geom.type === 'capsule') {
		return new Geometry({
			center,
			geometryType: {
				case: 'capsule',
				value: new Capsule({ radiusMm: geom.r ?? 0, lengthMm: geom.l ?? 0 }),
			},
			label: geom.label,
		})
	}

	return new Geometry({
		center,
		geometryType: {
			case: 'box',
			value: new RectangularPrism({
				dimsMm: new ViamVector3({ x: geom.x ?? 0, y: geom.y ?? 0, z: geom.z ?? 0 }),
			}),
		},
		label: geom.label,
	})
}

const rotationalPose = (
	axis: { X: number; Y: number; Z: number },
	angleRad: number
): { x: number; y: number; z: number; oX: number; oY: number; oZ: number; theta: number } => {
	tmpAxis.set(axis.X, axis.Y, axis.Z)
	tmpQ.setFromAxisAngle(tmpAxis, angleRad)
	const pose = { x: 0, y: 0, z: 0, oX: 0, oY: 0, oZ: 0, theta: 0 }
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
				pose: new Pose(descriptor.localPose),
			}),
			physicalObject: descriptor.geometry ? buildGeometry(descriptor.geometry) : undefined,
			uuid: descriptor.uuid,
		})
	}

	const angleRad = stepInputs[descriptor.componentName]?.[descriptor.jointIndex] ?? 0
	return new Transform({
		referenceFrame: descriptor.name,
		poseInObserverFrame: new PoseInFrame({
			referenceFrame: descriptor.parent,
			pose: new Pose(rotationalPose(descriptor.axis, angleRad)),
		}),
		uuid: descriptor.uuid,
	})
}

export const planToSnapshots = (
	descriptors: FrameDescriptor[],
	trajectory: Array<Record<string, number[]>>
): Snapshot[] =>
	trajectory.map((stepInputs) =>
		new Snapshot({
			transforms: descriptors.map((d) => descriptorToTransform(d, stepInputs)),
			uuid: planUuid(),
		})
	)

export const planJsonToSnapshots = (content: string): Snapshot[] => {
	const plan = parsePlan(content)
	const descriptors = buildFrameDescriptors(plan)
	return planToSnapshots(descriptors, plan.trajectory)
}
