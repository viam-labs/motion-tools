import { Euler, MathUtils, Quaternion, Vector3 } from 'three'
import { UuidTool } from 'uuid-tool'

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

import { PlanParseError } from './parse-plan'

/**
 * Split from joints because a trajectory step only carries joint angles: every other frame's
 * pose is fixed for the whole plan and can be built once. On the reference dual-arm rig that
 * is 67 of 79 frames.
 */
export interface StaticFrameDescriptor {
	kind: 'static'
	name: string
	parent: string
	localPose: Pose
	geometry: Geometry | null
	uuid: Uint8Array<ArrayBuffer>
}

/**
 * A step addresses joints positionally (`left-arm: [0.1, -0.3, …]`), so `componentName` +
 * `jointIndex` are what turn a step into this frame's angle.
 */
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

// Reused per frame instead of allocated. Safe only because none escape the borrowing function
// — never hold one across an await or return it.
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
type Vec3Json = { X: number; Y: number; Z: number }
type FramePoseJson = { translation?: Vec3Json; orientation?: OrientJson }

const hasOrientJson = (orientation: OrientJson | undefined): orientation is OrientJson =>
	orientation?.type === 'quaternion' ||
	orientation?.type === 'euler_angles' ||
	orientation?.type === 'ov_degrees' ||
	orientation?.type === 'ov_radians'

/** Each branch is a conversion, not a copy — a wrong one mis-poses the arm silently. */
const quatFromJson = (orientation: OrientJson | undefined, out: Quaternion): Quaternion => {
	if (orientation?.type === 'quaternion' && orientation.value) {
		const v = orientation.value
		// RDK writes the scalar first; Three.js takes it last.
		return out.set(v.X, v.Y, v.Z, v.W)
	}
	if (orientation?.type === 'euler_angles' && orientation.value) {
		const v = orientation.value
		// RDK uses Tait–Bryan Z-Y′-X″; Three.js defaults to 'XYZ'.
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

	// Omitting orientation is normal (a pure translation), not a malformed plan.
	return out.set(0, 0, 0, 1)
}

const poseFromFrame = (
	translation: Vec3Json | undefined,
	orientation: OrientJson | undefined
): Pose => {
	const pose = new Pose({
		x: translation?.X ?? 0,
		y: translation?.Y ?? 0,
		z: translation?.Z ?? 0,
	})
	quaternionToPose(quatFromJson(orientation, tmpQ), pose)
	return pose
}

/**
 * An arm link's geometry center is measured from the link's *parent*, sibling to the link's own
 * pose — but the renderer attaches geometry to the link and reads the center as link-local.
 * Passing it through unchanged doubles every offset, so the parent frame has to be undone.
 */
const geometryCenterInFrame = (
	geoTrans: Vec3Json | undefined,
	geoOrient: OrientJson | undefined,
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
 * Pass `framePose` for arm links, whose center is in parent coordinates (see
 * `geometryCenterInFrame`); omit it for obstacles, whose center is already local. The JSON
 * looks identical either way — only the frame's kind says which convention applies.
 */
const parseGeometry = (geom: unknown, framePose?: FramePoseJson): Geometry | null => {
	if (!geom || typeof geom !== 'object') return null
	const g = geom as Record<string, unknown>
	const type = g.type as string

	// Go marshals the zero value rather than omitting it, so an empty type means "no geometry",
	// not "unrecognized geometry" — distinct from the types rejected below.
	if (type === '') return null

	const trans = g.translation as Vec3Json | undefined
	const orient = g.orientation as OrientJson | undefined
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

	// Capitalized because RDK leaves the field untagged and Go marshals its exported name — as
	// with X/Y/Z and W. There is no lowercase spelling to fall back to.
	const label = (g.Label ?? '') as string

	switch (type) {
		case 'sphere': {
			return new Geometry({
				center,
				geometryType: { case: 'sphere', value: new Sphere({ radiusMm: (g.r as number) ?? 0 }) },
				label,
			})
		}

		case 'capsule': {
			return new Geometry({
				center,
				geometryType: {
					case: 'capsule',
					value: new Capsule({ radiusMm: (g.r as number) ?? 0, lengthMm: (g.l as number) ?? 0 }),
				},
				label,
			})
		}

		case 'box': {
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

		// A stand-in shape would lie about where the collision volume is. PlanParseError
		// specifically: `planDropper` only surfaces the message for that class.
		default: {
			throw new PlanParseError(`plan has an unsupported geometry type "${type}"`)
		}
	}
}

type Frames = ParsedPlan['frames']

const modelOf = (entry: Frames[string]): Record<string, unknown> | undefined =>
	(entry.frame as Record<string, unknown>).model as Record<string, unknown> | undefined

const newUuid = (): Uint8Array<ArrayBuffer> =>
	Uint8Array.from(UuidTool.toBytes(crypto.randomUUID()))

/**
 * The two facts a frame's own entry cannot supply.
 *
 * `frames` is flat: a joint frame knows it rotates about an axis, but not which arm owns it,
 * and a frame may be parented to a *model* frame (e.g. camera parented to left-arm), which never becomes an entity. Both
 * answers need the model declarations, so they are resolved once here and read back per frame.
 */
interface FrameContext {
	/** Parent with model frames already resolved away — safe to use as a descriptor's parent. */
	parent: string
	/** Present iff a model claims this frame as a joint. Absent means no trajectory column. */
	joint?: { componentName: string; jointIndex: number }
}

const buildFrameContexts = (plan: ParsedPlan): Map<string, FrameContext> => {
	const { frames, parents } = plan

	// Inverted `parents`. Its only question is "what hangs off the last joint?", asked below when
	// a model declares no end-effector — hence local, not a field on the frames it describes.
	const childMap = new Map<string, string[]>()
	for (const [child, parent] of Object.entries(parents)) {
		const siblings = childMap.get(parent)
		if (siblings) siblings.push(child)
		else childMap.set(parent, [child])
	}

	const jointOwners = new Map<string, FrameContext['joint']>()
	const modelTerminals = new Map<string, string>()

	for (const [modelName, entry] of Object.entries(frames)) {
		if (entry.frame_type !== 'model') continue
		const model = modelOf(entry)

		// `model.joints` is the only record of which slot in a trajectory step drives which frame,
		// and its array order *is* that slot. Keyed by frame name because that is how the frame
		// asks — the join between the two is the `${model}:${id}` naming convention, nothing else.
		const joints = (model?.joints ?? []) as Array<{ id: string }>
		for (const [jointIndex, joint] of joints.entries()) {
			jointOwners.set(`${modelName}:${joint.id}`, { componentName: modelName, jointIndex })
		}

		const primaryOutput = model?.primary_output_frame as string | undefined
		const links = model?.links as Array<{ id: string }> | undefined
		const endEffectorId = primaryOutput ?? links?.at(-1)?.id
		if (endEffectorId) {
			modelTerminals.set(modelName, `${modelName}:${endEffectorId}`)
			continue
		}

		const lastJoint = joints.at(-1)
		if (!lastJoint) continue
		const terminal = childMap.get(`${modelName}:${lastJoint.id}`)?.[0]
		if (terminal) modelTerminals.set(modelName, terminal)
	}

	const contexts = new Map<string, FrameContext>()
	for (const frameName of Object.keys(frames)) {
		const rawParent = parents[frameName] ?? 'world'
		contexts.set(frameName, {
			parent: modelTerminals.get(rawParent) ?? rawParent,
			joint: jointOwners.get(frameName),
		})
	}

	return contexts
}

/**
 * A straight map over `frames` — every cross-frame question was already answered by
 * {@link buildFrameContexts}, so each entry is built from itself plus its context.
 */
const buildDescriptors = (
	plan: ParsedPlan,
	contexts: Map<string, FrameContext>
): FrameDescriptor[] => {
	const descriptors: FrameDescriptor[] = []

	for (const [frameName, entry] of Object.entries(plan.frames)) {
		const { parent, joint } = contexts.get(frameName)!

		switch (entry.frame_type) {
			// The arm's links and joints are already frames in their own right; a descriptor for
			// the model itself would draw the arm a second time, at the origin.
			case 'model': {
				continue
			}

			case 'named': {
				const outer = entry.frame as Record<string, unknown>
				const inner = outer.inner_frame as Record<string, unknown>
				const innerData = inner.frame as Record<string, unknown>

				if (inner.frame_type === 'rotational') {
					// A rotational frame no model claims has no column in any step, so there is no
					// angle to drive it. Dropping it leaves the rest of the plan viewable.
					if (!joint) continue

					descriptors.push({
						kind: 'joint',
						name: frameName,
						parent,
						axis: innerData.axis as { X: number; Y: number; Z: number },
						componentName: joint.componentName,
						jointIndex: joint.jointIndex,
						uuid: newUuid(),
					})
				} else if (inner.frame_type === 'static') {
					const framePose: FramePoseJson = {
						translation: innerData.translation as Vec3Json | undefined,
						orientation: innerData.orientation as OrientJson | undefined,
					}
					descriptors.push({
						kind: 'static',
						name: frameName,
						parent,
						localPose: poseFromFrame(framePose.translation, framePose.orientation),
						geometry: parseGeometry(innerData.geometry, framePose),
						uuid: newUuid(),
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
					localPose: poseFromFrame(
						frame.translation as Vec3Json | undefined,
						frame.orientation as OrientJson | undefined
					),
					geometry: parseGeometry(frame.geometry),
					uuid: newUuid(),
				})
				break
			}
		}
	}

	return descriptors
}

export const buildFrameDescriptors = (plan: ParsedPlan): FrameDescriptor[] =>
	buildDescriptors(plan, buildFrameContexts(plan))
