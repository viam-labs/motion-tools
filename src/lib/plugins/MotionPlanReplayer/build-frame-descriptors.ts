/**
 * The frame-system half of the client-side fallback (see `parse-plan.ts`): a TypeScript reconstruction
 * of how RDK resolves `frame_system.frames` into a drawable chain. Every conversion below mirrors Go
 * this file cannot import — orientation encodings (`spatialmath/orientation_json.go`), frame types
 * (`referenceframe/register.go`), and the two geometry-center conventions — so each switch is a place
 * the copy can fall behind its original without failing.
 */

import { protoBase64 } from '@bufbuild/protobuf'
import { Euler, MathUtils, Quaternion, Vector3 } from 'three'
import { UuidTool } from 'uuid-tool'

import {
	Capsule,
	Geometry,
	Mesh,
	RectangularPrism,
	Sphere,
	Vector3 as ViamVector3,
} from '$lib/buf/common/v1/common_pb'
import { Pose } from '$lib/math'
import { OrientationVector } from '$lib/three/OrientationVector'

import type { ParsedPlan } from './parse-plan'

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

const tmpQ = new Quaternion()
const tmpQFrame = new Quaternion()
const tmpQGeo = new Quaternion()
const tmpQInv = new Quaternion()
const tmpQLocal = new Quaternion()
const tmpE = new Euler()
const tmpV = new Vector3()
// Separate from tmpV: quatFromJson runs inside geometryCenterInFrame, which owns tmpV.
const tmpAxis = new Vector3()
const tmpOv = new OrientationVector()

type QuatJson = { W: number; X: number; Y: number; Z: number }
type EulerJson = { roll: number; pitch: number; yaw: number }
type OvJson = { x: number; y: number; z: number; th: number }

/** Straight off the wire: `type` is any string RDK wrote, `value` whatever shape matches it. */
type RawOrientation = { type?: string; value?: unknown }

type Vec3Json = { X: number; Y: number; Z: number }
type FramePoseJson = { translation?: Vec3Json; orientation?: RawOrientation }

/**
 * Writes `out` and reports whether it holds a real rotation; false leaves it identity. Callers that
 * only apply a rotation when one exists ask by calling — the switch below is the single list of
 * encodings this file handles, so there is nothing to keep in step with it.
 *
 * Identity is correct for an absent or empty-string orientation (RDK's own zero value) and wrong for
 * a `type` with no case here, which is why only the latter warns: it renders confidently wrong
 * rather than visibly missing.
 */
const quatFromJson = (orientation: RawOrientation | undefined, out: Quaternion): boolean => {
	const value = orientation?.value
	if (value) {
		switch (orientation?.type) {
			case 'quaternion': {
				const v = value as QuatJson
				// RDK writes the scalar first; Three.js takes it last.
				out.set(v.X, v.Y, v.Z, v.W)
				return true
			}
			case 'euler_angles': {
				const v = value as EulerJson
				// RDK uses Tait–Bryan Z-Y′-X″; Three.js defaults to 'XYZ'.
				out.setFromEuler(tmpE.set(v.roll, v.pitch, v.yaw, 'ZYX'))
				return true
			}
			case 'ov_radians': {
				const v = value as OvJson
				tmpOv.set(v.x, v.y, v.z, v.th).toQuaternion(out)
				return true
			}
			case 'ov_degrees': {
				const v = value as OvJson
				tmpOv.set(v.x, v.y, v.z, MathUtils.degToRad(v.th ?? 0)).toQuaternion(out)
				return true
			}
			// R4AA tags its fields th/x/y/z, so it arrives shaped like an orientation vector.
			case 'axis_angles': {
				const v = value as OvJson
				// RDK does not normalize on unmarshal; setFromAxisAngle assumes a unit axis.
				out.setFromAxisAngle(tmpAxis.set(v.x, v.y, v.z).normalize(), v.th ?? 0)
				return true
			}
		}
	}

	if (orientation?.type) {
		console.warn(
			`[MotionPlanReplayer] unhandled orientation "${orientation.type}" — using identity`
		)
	}
	out.set(0, 0, 0, 1)
	return false
}

const poseFromFrame = (
	translation: Vec3Json | undefined,
	orientation: RawOrientation | undefined
): Pose => {
	quatFromJson(orientation, tmpQ)
	return new Pose(translation?.X ?? 0, translation?.Y ?? 0, translation?.Z ?? 0).setFromQuaternion(
		tmpQ
	)
}

/**
 * An arm link's geometry center is measured from the link's *parent*, sibling to the link's own
 * pose — but the renderer attaches geometry to the link and reads the center as link-local.
 * Passing it through unchanged doubles every offset, so the parent frame has to be undone.
 */
const geometryCenterInFrame = (
	geoTrans: Vec3Json | undefined,
	geoOrient: RawOrientation | undefined,
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

	const center = new Pose(tmpV.x, tmpV.y, tmpV.z)

	if (quatFromJson(geoOrient, tmpQGeo)) {
		tmpQLocal.copy(tmpQInv).multiply(tmpQGeo)
		center.setFromQuaternion(tmpQLocal)
	}

	return center
}

/**
 * Pass `framePose` for arm links, whose center is in parent coordinates (see
 * `geometryCenterInFrame`); omit it for obstacles, whose center is already local. The JSON
 * looks identical either way — only the frame's kind says which convention applies.
 */
const parseGeometry = (
	geom: unknown,
	frameName: string,
	framePose?: FramePoseJson
): Geometry | null => {
	// Naming the frame is the difference between a warning you can act on and one you can't:
	// a capture has dozens of geometries and they all skip through this one line.
	const skip = (reason: string): null => {
		console.warn(`[MotionPlanReplayer] skipping geometry on "${frameName}": ${reason}`)
		return null
	}

	if (!geom || typeof geom !== 'object') return null
	const g = geom as Record<string, unknown>
	const type = g.type as string

	// Go marshals the zero value rather than omitting it, so an empty type means "no geometry",
	// not "unrecognized geometry" — distinct from the types rejected below.
	if (type === '') return null

	const trans = g.translation as Vec3Json | undefined
	const orient = g.orientation as RawOrientation | undefined
	const center = framePose
		? geometryCenterInFrame(trans, orient, framePose)
		: (() => {
				const local = new Pose(trans?.X ?? 0, trans?.Y ?? 0, trans?.Z ?? 0)
				if (quatFromJson(orient, tmpQ)) local.setFromQuaternion(tmpQ)
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

		// Bytes pass through unscaled: PLY vertices are already metres, and only the center
		// pose is millimetres.
		case 'mesh': {
			const contentType = (g.mesh_content_type as string | undefined) ?? ''
			const meshData = g.mesh_data as string | undefined

			// parsePlyInput is PLY-only; other formats throw at render time, far from here.
			if (!meshData) return skip('mesh geometry carries no mesh_data')
			if (contentType !== 'ply') return skip(`unsupported mesh content type "${contentType}"`)

			// protoBase64.dec throws a bare Error on malformed input, which loadPlan would
			// report as an unparseable plan — the whole failure mode this branch avoids.
			let mesh: Uint8Array<ArrayBuffer>
			try {
				// `from` narrows protoBase64's Uint8Array<ArrayBufferLike>, which the field rejects.
				mesh = Uint8Array.from(protoBase64.dec(meshData))
			} catch {
				return skip('undecodable mesh_data')
			}

			return new Geometry({
				center,
				geometryType: { case: 'mesh', value: new Mesh({ contentType, mesh }) },
				label,
			})
		}

		// Skip rather than substitute: a stand-in shape would lie about where the collision
		// volume is, and one unrenderable shape shouldn't cost the whole trajectory.
		default: {
			return skip(`unsupported geometry type "${type}"`)
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
						orientation: innerData.orientation as RawOrientation | undefined,
					}
					descriptors.push({
						kind: 'static',
						name: frameName,
						parent,
						localPose: poseFromFrame(framePose.translation, framePose.orientation),
						geometry: parseGeometry(innerData.geometry, frameName, framePose),
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
						frame.orientation as RawOrientation | undefined
					),
					geometry: parseGeometry(frame.geometry, frameName),
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
