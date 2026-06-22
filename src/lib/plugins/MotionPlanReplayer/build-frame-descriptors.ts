import { Quaternion } from 'three'

import {
	Capsule,
	Geometry,
	Pose,
	RectangularPrism,
	Sphere,
	Vector3 as ViamVector3,
} from '$lib/buf/common/v1/common_pb'
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

/**
 * A rigid link whose immediate parent in the model is a revolute joint.
 * The joint's rotation is baked into this descriptor so no separate joint
 * entity appears in the ECS parent chain. At each trajectory step,
 * `descriptorToTransform` computes:
 *
 *   combined = R_joint × T_link
 *
 * which rotates the link's translation by the joint quaternion before
 * composing it with the rotation, giving the correct FK result without
 * needing an intermediate entity.
 */
export interface JointedLinkDescriptor {
	kind: 'jointed_link'
	name: string
	/** The joint's parent — the link's kinematic grandparent in the ECS. */
	parent: string
	/** Link's own local offset and orientation in the joint frame (mm). */
	linkPose: Pose
	/** Rotation axis of the controlling joint. */
	axis: { X: number; Y: number; Z: number }
	/** Component name for trajectory lookup. */
	componentName: string
	/** Index into the trajectory's joint-angle array. */
	jointIndex: number
	geometry: Geometry | null
	uuid: Uint8Array<ArrayBuffer>
}

export type FrameDescriptor = StaticFrameDescriptor | JointedLinkDescriptor

// Shared scratch object — safe in single-threaded JS
const tmpQ = new Quaternion()

type QuatJson = { W: number; X: number; Y: number; Z: number }
type OrientJson = { type: string; value: QuatJson } | undefined
type Vec3Json = { X: number; Y: number; Z: number } | undefined

const quaternionFromJson = (orientation: OrientJson): Quaternion => {
	if (orientation?.type === 'quaternion' && orientation.value) {
		const v = orientation.value
		// Three.js Quaternion order: (x, y, z, w) — W is LAST
		return tmpQ.set(v.X, v.Y, v.Z, v.W)
	}
	return tmpQ.set(0, 0, 0, 1)
}

const poseFromFrame = (translation: Vec3Json, orientation: OrientJson): Pose => {
	const pose = new Pose({
		x: translation?.X ?? 0,
		y: translation?.Y ?? 0,
		z: translation?.Z ?? 0,
	})
	quaternionToPose(quaternionFromJson(orientation), pose)
	return pose
}

/**
 * Parse a geometry from raw JSON, returning a proto Geometry.
 *
 * `frameTranslation` must be supplied for link frames from `internal_fs`
 * (i.e. `named` inner-static frames). In that format the geometry center
 * translation is expressed in the *parent* frame — the same coordinate space
 * as the frame's own translation — so the local center offset is:
 *
 *   local_center = geo_center_in_parent − frame_translation_in_parent
 *
 * Example: base_top frame at z=267, geo center at z=160 (both from waist)
 *   → local_center = (0,0,−107)  (capsule center is 107mm BELOW the frame origin)
 *
 * For non-arm static frames (cameras, obstacles) the geometry center is already
 * in local frame coordinates, so `frameTranslation` should be omitted.
 */
const parseGeometry = (geom: unknown, frameTranslation?: Vec3Json): Geometry | null => {
	if (!geom || typeof geom !== 'object') return null
	const g = geom as Record<string, unknown>
	const type = g.type as string
	if (type !== 'box' && type !== 'sphere' && type !== 'capsule') return null

	const trans = g.translation as Vec3Json
	const orient = g.orientation as OrientJson
	const center = new Pose({
		x: (trans?.X ?? 0) - (frameTranslation?.X ?? 0),
		y: (trans?.Y ?? 0) - (frameTranslation?.Y ?? 0),
		z: (trans?.Z ?? 0) - (frameTranslation?.Z ?? 0),
	})
	if (orient?.type === 'quaternion' && orient.value) {
		quaternionToPose(quaternionFromJson(orient), center)
	}

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

interface JointInfo {
	axis: { X: number; Y: number; Z: number }
	componentName: string
	jointIndex: number
	/** The joint's own parent — becomes the jointed link's ECS parent. */
	parent: string
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

	// Pass 1b: build a map from model frame name → its end-effector frame name.
	// Any non-arm frame (camera, gripper, obstacle) whose parent is a model frame
	// must attach to the arm's end-effector instead, because model frames themselves
	// are never spawned as ECS entities.
	//
	// Try primary_output_frame first; fall back to the last entry in model.links,
	// which is always the end-effector link in Viam's kinematic model format.
	const modelEndEffectorMap = new Map<string, string>()
	for (const [frameName, entry] of Object.entries(frames)) {
		if (entry.frame_type !== 'model') continue
		const model = (entry.frame as Record<string, unknown>).model as
			| Record<string, unknown>
			| undefined
		const primaryOutput = model?.primary_output_frame as string | undefined
		const links = model?.links as Array<{ id: string }> | undefined
		const endEffectorId = primaryOutput ?? links?.[links.length - 1]?.id
		if (endEffectorId) {
			modelEndEffectorMap.set(frameName, `${frameName}:${endEffectorId}`)
		}
	}

	// Pass 2: build a lookup of rotational joint frames so that links whose
	// parent is a joint can absorb that joint's rotation directly.
	const jointInfoMap = new Map<string, JointInfo>()
	for (const [frameName, entry] of Object.entries(frames)) {
		if (entry.frame_type !== 'named') continue
		const outer = entry.frame as Record<string, unknown>
		const inner = outer.inner_frame as Record<string, unknown>
		if (inner.frame_type !== 'rotational') continue

		const innerData = inner.frame as Record<string, unknown>
		const parent = parents[frameName] ?? 'world'

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

		jointInfoMap.set(frameName, {
			axis: innerData.axis as { X: number; Y: number; Z: number },
			componentName,
			jointIndex,
			parent,
		})
	}

	// Pass 3: build descriptors. Rotational joint frames produce no entity —
	// their children become JointedLinkDescriptors instead.
	const descriptors: FrameDescriptor[] = []

	const buildDescriptor = (
		frameName: string,
		parent: string,
		linkPose: Pose,
		geometry: Geometry | null
	): FrameDescriptor => {
		// If the parent is a model frame (e.g. "left-arm"), redirect to its
		// end-effector (e.g. "left-arm:gripper_mount"). Model frames are never
		// spawned as ECS entities, so anything parented to them would stay orphaned.
		const resolvedParent = modelEndEffectorMap.get(parent) ?? parent
		const jointInfo = jointInfoMap.get(resolvedParent)
		if (jointInfo) {
			return {
				kind: 'jointed_link',
				name: frameName,
				parent: jointInfo.parent,
				linkPose,
				axis: jointInfo.axis,
				componentName: jointInfo.componentName,
				jointIndex: jointInfo.jointIndex,
				geometry,
				uuid: planUuid(),
			}
		}
		return {
			kind: 'static',
			name: frameName,
			parent: resolvedParent,
			localPose: linkPose,
			geometry,
			uuid: planUuid(),
		}
	}

	for (const [frameName, entry] of Object.entries(frames)) {
		const parent = parents[frameName] ?? 'world'

		switch (entry.frame_type) {
			case 'model': {
				continue
			}

			case 'named': {
				const outer = entry.frame as Record<string, unknown>
				const inner = outer.inner_frame as Record<string, unknown>

				if (inner.frame_type === 'rotational') {
					// Joint frames generate no entity — absorbed by child links above.
					continue
				}

				if (inner.frame_type === 'static') {
					const innerData = inner.frame as Record<string, unknown>
					const frameTrans = innerData.translation as Vec3Json
					descriptors.push(
						buildDescriptor(
							frameName,
							parent,
							poseFromFrame(frameTrans, innerData.orientation as OrientJson),
							// Geometry center in internal_fs is in the parent frame (same space
							// as frameTrans) — subtract to get the offset in the link's local frame.
							parseGeometry(innerData.geometry, frameTrans)
						)
					)
				}
				break
			}

			case 'tail_geometry_static':
			case 'static': {
				const frame = entry.frame as Record<string, unknown>
				descriptors.push(
					buildDescriptor(
						frameName,
						parent,
						poseFromFrame(frame.translation as Vec3Json, frame.orientation as OrientJson),
						parseGeometry(frame.geometry)
					)
				)
				break
			}
		}
	}

	return descriptors
}
