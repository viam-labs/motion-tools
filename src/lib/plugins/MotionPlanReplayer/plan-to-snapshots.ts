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
	computeJointedLinkPose,
	type FrameDescriptor,
	type GeometryDescriptor,
} from './build-frame-descriptors'
import { parsePlan } from './parse-plan'
import { planUuid } from './plan-uuid'

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

	// jointed_link: bake the joint rotation into the link's local transform.
	// computeJointedLinkPose returns R_joint × T_link — the translation is
	// rotated by the joint quaternion, giving correct FK without a joint entity.
	const angleRad = stepInputs[descriptor.componentName]?.[descriptor.jointIndex] ?? 0
	return new Transform({
		referenceFrame: descriptor.name,
		poseInObserverFrame: new PoseInFrame({
			referenceFrame: descriptor.parent,
			pose: new Pose(computeJointedLinkPose(descriptor, angleRad)),
		}),
		physicalObject: descriptor.geometry ? buildGeometry(descriptor.geometry) : undefined,
		uuid: descriptor.uuid,
	})
}

export const planToSnapshots = (
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
