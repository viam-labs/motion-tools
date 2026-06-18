import { Quaternion, Vector3 } from 'three'

import { poseToQuaternion, quaternionToPose } from '$lib/transform'

import type { ParsedPlan } from './parse-plan'

import { planUuid } from './plan-uuid'

export interface GeometryDescriptor {
	type: 'box' | 'sphere' | 'capsule'
	x?: number
	y?: number
	z?: number
	r?: number
	l?: number
	centerPose: { x: number; y: number; z: number; oX: number; oY: number; oZ: number; theta: number }
	label: string
}

type LocalPose = {
	x: number
	y: number
	z: number
	oX: number
	oY: number
	oZ: number
	theta: number
}

/** A rigid link with a fixed local transform — no joint involved. */
export interface StaticFrameDescriptor {
	kind: 'static'
	name: string
	parent: string
	localPose: LocalPose
	geometry: GeometryDescriptor | null
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
	linkPose: LocalPose
	/** Rotation axis of the controlling joint. */
	axis: { X: number; Y: number; Z: number }
	/** Component name for trajectory lookup. */
	componentName: string
	/** Index into the trajectory's joint-angle array. */
	jointIndex: number
	geometry: GeometryDescriptor | null
	uuid: Uint8Array<ArrayBuffer>
}

export type FrameDescriptor = StaticFrameDescriptor | JointedLinkDescriptor

// Shared scratch objects — safe in single-threaded JS
const tmpQ = new Quaternion()
const tmpLinkQ = new Quaternion()
const tmpVec = new Vector3()

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

const poseFromFrame = (translation: Vec3Json, orientation: OrientJson): LocalPose => {
	const pose = {
		x: translation?.X ?? 0,
		y: translation?.Y ?? 0,
		z: translation?.Z ?? 0,
		oX: 0,
		oY: 0,
		oZ: 0,
		theta: 0,
	}
	quaternionToPose(quaternionFromJson(orientation), pose)
	return pose
}

/**
 * Parse a geometry descriptor from raw JSON.
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
const parseGeometry = (geom: unknown, frameTranslation?: Vec3Json): GeometryDescriptor | null => {
	if (!geom || typeof geom !== 'object') return null
	const g = geom as Record<string, unknown>
	const type = g.type as string
	if (type !== 'box' && type !== 'sphere' && type !== 'capsule') return null

	const trans = g.translation as Vec3Json
	const orient = g.orientation as OrientJson
	const centerPose = {
		x: (trans?.X ?? 0) - (frameTranslation?.X ?? 0),
		y: (trans?.Y ?? 0) - (frameTranslation?.Y ?? 0),
		z: (trans?.Z ?? 0) - (frameTranslation?.Z ?? 0),
		oX: 0,
		oY: 0,
		oZ: 0,
		theta: 0,
	}
	if (orient?.type === 'quaternion' && orient.value) {
		quaternionToPose(quaternionFromJson(orient), centerPose)
	}

	return {
		type: type as GeometryDescriptor['type'],
		x: g.x as number | undefined,
		y: g.y as number | undefined,
		z: g.z as number | undefined,
		r: g.r as number | undefined,
		l: g.l as number | undefined,
		centerPose,
		label: (g.Label ?? g.label ?? '') as string,
	}
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
		const endEffectorId = primaryOutput ?? links?.at(-1)?.id
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
		linkPose: LocalPose,
		geometry: GeometryDescriptor | null
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

	console.debug('[buildFrameDescriptors] jointMap:', Object.fromEntries(jointMap))
	console.debug('[buildFrameDescriptors]', descriptors.length, 'descriptors:')
	for (const d of descriptors) {
		if (d.kind === 'static') {
			const p = d.localPose
			console.debug(
				`  STATIC       ${d.name} → parent:${d.parent}`,
				`| pos(${p.x.toFixed(1)}, ${p.y.toFixed(1)}, ${p.z.toFixed(1)})`,
				`| geom:${d.geometry?.type ?? 'none'}`,
				d.geometry
					? `center(${d.geometry.centerPose.x.toFixed(1)}, ${d.geometry.centerPose.y.toFixed(1)}, ${d.geometry.centerPose.z.toFixed(1)})`
					: ''
			)
		} else {
			const p = d.linkPose
			console.debug(
				`  JOINTED_LINK ${d.name} → parent:${d.parent}`,
				`| pos(${p.x.toFixed(1)}, ${p.y.toFixed(1)}, ${p.z.toFixed(1)})`,
				`| axis:${JSON.stringify(d.axis)} ${d.componentName}[${d.jointIndex}]`,
				`| geom:${d.geometry?.type ?? 'none'}`
			)
		}
	}

	return descriptors
}

/**
 * Compute the combined local transform for a jointed link at a given joint angle.
 *
 * The correct FK composition is R_joint × T_link:
 *   - rotation block  = R_joint × R_link  (joint rotation, then link's own orientation)
 *   - translation     = R_joint × t_link  (link's offset rotated into joint's frame)
 *
 * `poseToMatrix` produces [R | t] (translation NOT rotated), so we cannot use it
 * directly. Instead we rotate t explicitly here, then build the pose with the
 * rotated translation and combined quaternion.
 */
export const computeJointedLinkPose = (
	descriptor: JointedLinkDescriptor,
	angleRad: number
): { x: number; y: number; z: number; oX: number; oY: number; oZ: number; theta: number } => {
	// Joint rotation quaternion
	tmpVec.set(descriptor.axis.X, descriptor.axis.Y, descriptor.axis.Z)
	tmpQ.setFromAxisAngle(tmpVec, angleRad)

	// Link's own orientation (identity for most links; non-trivial for e.g. gripper_mount)
	const p = descriptor.linkPose
	poseToQuaternion(p, tmpLinkQ)

	// Combined rotation: R_joint × R_link
	const combinedQ = tmpQ.clone().multiply(tmpLinkQ)

	// Rotate the link's translation by the joint rotation
	tmpVec.set(p.x, p.y, p.z) // in mm — quaternion rotation preserves magnitude
	tmpVec.applyQuaternion(tmpQ)

	const pose = { x: tmpVec.x, y: tmpVec.y, z: tmpVec.z, oX: 0, oY: 0, oZ: 0, theta: 0 }
	quaternionToPose(combinedQ, pose)
	return pose
}
