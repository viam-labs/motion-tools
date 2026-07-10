import { Euler, MathUtils, Quaternion, Vector3 } from 'three'

import {
	Capsule,
	Geometry,
	Pose,
	RectangularPrism,
	Sphere,
	Vector3 as ViamVector3,
} from '$lib/buf/common/v1/common_pb'
import { OrientationVector } from '$lib/three/OrientationVector'
import { quaternionToPose } from '$lib/transform'

import type { ParsedPlan } from './parse-plan'

import { planUuid } from './plan-uuid'

/** A rigid link with a fixed local transform — no joint involved. */
export interface StaticFrameDescriptor {
	kind: 'static'
	name: string
	parent: string
	localPose: Pose
	geometry: Geometry | null
	uuid: Uint8Array<ArrayBuffer>
}

/** A revolute joint frame. Its pose at each step is a pure rotation around `axis` by the trajectory angle. */
export interface JointFrameDescriptor {
	kind: 'joint'
	name: string
	parent: string
	axis: { X: number; Y: number; Z: number }
	componentName: string
	jointIndex: number
	uuid: Uint8Array<ArrayBuffer>
}

export type FrameDescriptor = StaticFrameDescriptor | JointFrameDescriptor

// Shared scratch objects — safe in single-threaded JS
const tmpQ = new Quaternion()
const tmpQFrame = new Quaternion()
const tmpQGeo = new Quaternion()
const tmpQInv = new Quaternion()
const tmpQLocal = new Quaternion()
const tmpE = new Euler()
const tmpV = new Vector3()
const tmpOv = new OrientationVector()

type QuatJson = { W: number; X: number; Y: number; Z: number }
type EulerJson = { roll: number; pitch: number; yaw: number }
type OvJson = { x: number; y: number; z: number; th: number }
type OrientJson =
	| { type: 'quaternion'; value: QuatJson }
	| { type: 'euler_angles'; value: EulerJson }
	| { type: 'ov_degrees'; value: OvJson }
	| { type: 'ov_radians'; value: OvJson }
	| undefined
type Vec3Json = { X: number; Y: number; Z: number } | undefined

const hasOrientJson = (orientation: OrientJson): orientation is NonNullable<OrientJson> =>
	orientation?.type === 'quaternion' ||
	orientation?.type === 'euler_angles' ||
	orientation?.type === 'ov_degrees' ||
	orientation?.type === 'ov_radians'

/** Write orientation JSON into `out`. RDK euler_angles use Tait–Bryan Z-Y′-X″ (ZYX). */
const quatFromJson = (orientation: OrientJson, out: Quaternion): Quaternion => {
	if (orientation?.type === 'quaternion' && orientation.value) {
		const v = orientation.value
		// Three.js Quaternion order: (x, y, z, w) — W is LAST
		return out.set(v.X, v.Y, v.Z, v.W)
	}
	if (orientation?.type === 'euler_angles' && orientation.value) {
		const v = orientation.value
		tmpE.set(v.roll, v.pitch, v.yaw, 'ZYX')
		return out.setFromEuler(tmpE)
	}
	if (orientation?.type === 'ov_radians' && orientation.value) {
		const v = orientation.value
		return tmpOv.set(v.x, v.y, v.z, v.th).toQuaternion(out)
	}
	if (orientation?.type === 'ov_degrees' && orientation.value) {
		const v = orientation.value
		const th = MathUtils.degToRad(v.th ?? 0)
		return tmpOv.set(v.x, v.y, v.z, th).toQuaternion(out)
	}
	return out.set(0, 0, 0, 1)
}

const poseFromFrame = (translation: Vec3Json, orientation: OrientJson): Pose => {
	const pose = new Pose({
		x: translation?.X ?? 0,
		y: translation?.Y ?? 0,
		z: translation?.Z ?? 0,
	})
	quaternionToPose(quatFromJson(orientation, tmpQ), pose)
	return pose
}

type FramePoseJson = { translation?: Vec3Json; orientation?: OrientJson }

/**
 * Convert a geometry center pose from parent-frame coordinates into the link
 * frame's local coordinates.
 *
 * Both the link frame and geometry center are expressed in the same parent
 * frame. The link frame pose places the frame origin; the geometry describes
 * the physical link body (length/shape) with its center offset in parent space.
 */
const geometryCenterInFrame = (
	geoTrans: Vec3Json,
	geoOrient: OrientJson,
	framePose: FramePoseJson
): Pose => {
	quatFromJson(framePose.orientation, tmpQFrame)
	tmpQInv.copy(tmpQFrame).invert()

	tmpV
		.set(
			(geoTrans?.X ?? 0) - (framePose.translation?.X ?? 0),
			(geoTrans?.Y ?? 0) - (framePose.translation?.Y ?? 0),
			(geoTrans?.Z ?? 0) - (framePose.translation?.Z ?? 0)
		)
		.applyQuaternion(tmpQInv)

	const center = new Pose({ x: tmpV.x, y: tmpV.y, z: tmpV.z })

	if (hasOrientJson(geoOrient)) {
		quatFromJson(geoOrient, tmpQGeo)
		tmpQLocal.copy(tmpQInv).multiply(tmpQGeo)
		quaternionToPose(tmpQLocal, center)
	}

	return center
}

/**
 * Parse a geometry from raw JSON, returning a proto Geometry.
 *
 * For named arm link frames, pass `framePose` so the geometry center (which is
 * in parent-frame coordinates alongside the link frame) is converted to local
 * coordinates via R_frame⁻¹.
 *
 * For tail_geometry_static / static frames, omit `framePose` — geometry is
 * already in local coordinates.
 */
const parseGeometry = (geom: unknown, framePose?: FramePoseJson): Geometry | null => {
	if (!geom || typeof geom !== 'object') return null
	const g = geom as Record<string, unknown>
	const type = g.type as string
	if (type !== 'box' && type !== 'sphere' && type !== 'capsule') return null

	const trans = g.translation as Vec3Json
	const orient = g.orientation as OrientJson
	const center = framePose
		? geometryCenterInFrame(trans, orient, framePose)
		: (() => {
				const local = new Pose({
					x: trans?.X ?? 0,
					y: trans?.Y ?? 0,
					z: trans?.Z ?? 0,
				})
				if (hasOrientJson(orient)) {
					quaternionToPose(quatFromJson(orient, tmpQ), local)
				}
				return local
			})()

	const label = (g.Label ?? g.label ?? '') as string

	if (type === 'sphere') {
		return new Geometry({
			center,
			geometryType: { case: 'sphere', value: new Sphere({ radiusMm: (g.r as number) ?? 0 }) },
			label,
		})
	}
	if (type === 'capsule') {
		return new Geometry({
			center,
			geometryType: {
				case: 'capsule',
				value: new Capsule({ radiusMm: (g.r as number) ?? 0, lengthMm: (g.l as number) ?? 0 }),
			},
			label,
		})
	}
	return new Geometry({
		center,
		geometryType: {
			case: 'box',
			value: new RectangularPrism({
				dimsMm: new ViamVector3({
					x: (g.x as number) ?? 0,
					y: (g.y as number) ?? 0,
					z: (g.z as number) ?? 0,
				}),
			}),
		},
		label,
	})
}

export const buildFrameDescriptors = (plan: ParsedPlan): FrameDescriptor[] => {
	const { frames, parents } = plan

	// Pass 1: map component name → ordered joint frame names (from "model" frames).
	// This gives us the index each joint occupies in the trajectory array.
	const jointMap = new Map<string, string[]>()
	for (const [frameName, entry] of Object.entries(frames)) {
		if (entry.frame_type !== 'model') continue
		const model = (entry.frame as Record<string, unknown>).model as
			| Record<string, unknown>
			| undefined
		const joints = model?.joints as Array<{ id: string }> | undefined
		if (!joints) continue
		jointMap.set(
			frameName,
			joints.map((j) => `${frameName}:${j.id}`)
		)
	}

	// Pass 1b: map model frame name → its end-effector static frame name.
	// External components (cameras, remote grippers) have parent = model frame name in the
	// JSON, but the model frame itself is never an ECS entity. Reparent them to the terminal
	// static frame so they appear at the arm's end-effector instead of floating at origin.
	//
	// Prefer primary_output_frame from model metadata; fall back to the last entry in
	// model.links (always the end-effector in Viam's kinematic format). If neither is
	// present, use the static frame parented to the last joint.
	const modelTerminalMap = new Map<string, string>()
	for (const [frameName, entry] of Object.entries(frames)) {
		if (entry.frame_type !== 'model') continue
		const model = (entry.frame as Record<string, unknown>).model as
			| Record<string, unknown>
			| undefined
		const primaryOutput = model?.primary_output_frame as string | undefined
		const links = model?.links as Array<{ id: string }> | undefined
		const endEffectorId = primaryOutput ?? links?.at(-1)?.id
		if (endEffectorId) {
			modelTerminalMap.set(frameName, `${frameName}:${endEffectorId}`)
			continue
		}
		const jointNames = jointMap.get(frameName)
		const lastJoint = jointNames?.at(-1)
		if (!lastJoint) continue
		for (const [childFrame, parentName] of Object.entries(parents)) {
			if (parentName === lastJoint) {
				modelTerminalMap.set(frameName, childFrame)
				break
			}
		}
	}

	// Pass 2: emit one descriptor per frame. Joint frames become JointFrameDescriptors
	// (their pose is computed from the trajectory at each step). All other frames
	// become StaticFrameDescriptors with a fixed local pose.
	const descriptors: FrameDescriptor[] = []

	for (const [frameName, entry] of Object.entries(frames)) {
		const rawParent = parents[frameName] ?? 'world'
		const parent = modelTerminalMap.get(rawParent) ?? rawParent

		switch (entry.frame_type) {
			case 'model': {
				continue
			}

			case 'named': {
				const outer = entry.frame as Record<string, unknown>
				const inner = outer.inner_frame as Record<string, unknown>

				if (inner.frame_type === 'rotational') {
					const innerData = inner.frame as Record<string, unknown>

					let componentName = ''
					let jointIndex = -1
					for (const [comp, names] of jointMap) {
						const idx = names.indexOf(frameName)
						if (idx !== -1) {
							componentName = comp
							jointIndex = idx
							break
						}
					}
					if (!componentName) continue

					descriptors.push({
						kind: 'joint',
						name: frameName,
						parent,
						axis: innerData.axis as { X: number; Y: number; Z: number },
						componentName,
						jointIndex,
						uuid: planUuid(),
					})
				} else if (inner.frame_type === 'static') {
					const innerData = inner.frame as Record<string, unknown>
					const framePose: FramePoseJson = {
						translation: innerData.translation as Vec3Json,
						orientation: innerData.orientation as OrientJson,
					}
					descriptors.push({
						kind: 'static',
						name: frameName,
						parent,
						localPose: poseFromFrame(framePose.translation, framePose.orientation),
						geometry: parseGeometry(innerData.geometry, framePose),
						uuid: planUuid(),
					})
				}
				break
			}

			case 'tail_geometry_static':
			case 'static': {
				const frame = entry.frame as Record<string, unknown>
				descriptors.push({
					kind: 'static',
					name: frameName,
					parent,
					localPose: poseFromFrame(frame.translation as Vec3Json, frame.orientation as OrientJson),
					geometry: parseGeometry(frame.geometry),
					uuid: planUuid(),
				})
				break
			}
		}
	}

	return descriptors
}
