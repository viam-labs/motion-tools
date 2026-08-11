/**
 * Decoders for rdk's Go-marshalled `spatialmath` JSON: the `OrientationConfig`
 * encodings and the `GeometryConfig` offset conventions.
 *
 * These are hand conversions of Go this file cannot import
 * (`spatialmath/orientation_json.go`, `referenceframe/frame_system.go`), so each
 * switch is a place the copy can fall behind its original without failing.
 *
 * Shared rather than duplicated because that JSON reaches the client by more
 * than one route — a motion plan's `frame_system`, and `FrameSystemConfig`'s
 * `kinematics` — and both need the same two subtleties: the encoding list, and
 * which frame a geometry offset is measured from.
 */

import { Euler, MathUtils, Quaternion, Vector3 } from 'three'

import { Pose } from '$lib/math'
import { OrientationVector } from '$lib/three/OrientationVector'

/** Straight off the wire: `type` is any string RDK wrote, `value` whatever shape matches it. */
export type RawOrientation = { type?: string; value?: unknown }

/** Go marshals untagged `r3.Vector` fields under their exported names. */
export type Vec3Json = { X: number; Y: number; Z: number }

export type FramePoseJson = { translation?: Vec3Json; orientation?: RawOrientation }

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

/**
 * Writes `out` and reports whether it holds a real rotation; false leaves it identity. Callers that
 * only apply a rotation when one exists ask by calling — the switch below is the single list of
 * encodings this file handles, so there is nothing to keep in step with it.
 *
 * Identity is correct for an absent or empty-string orientation (RDK's own zero value) and wrong for
 * a `type` with no case here, which is why only the latter warns: it renders confidently wrong
 * rather than visibly missing. Guessing a default encoding would be worse than either, because
 * `axis_angles` and both orientation-vector types share the same `{ x, y, z, th }` field names — a
 * mis-tagged value still decodes to a plausible rotation.
 */
export const quatFromJson = (orientation: RawOrientation | undefined, out: Quaternion): boolean => {
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
		console.warn(`[spatialJson] unhandled orientation "${orientation.type}" — using identity`)
	}
	out.set(0, 0, 0, 1)
	return false
}

/** A frame's own local pose: capitalised translation plus an orientation config. */
export const poseFromJson = (
	translation: Vec3Json | undefined,
	orientation: RawOrientation | undefined
): Pose => {
	quatFromJson(orientation, tmpQ)
	return new Pose(translation?.X ?? 0, translation?.Y ?? 0, translation?.Z ?? 0).setFromQuaternion(
		tmpQ
	)
}

/**
 * A model link's geometry offset is measured from the link's *parent*, sibling to the link's own
 * pose — but the renderer attaches geometry to the link and reads the center as link-local.
 * Passing it through unchanged doubles every offset, so the frame's own pose has to be undone:
 * `P_frame⁻¹ ∘ P_geometry`.
 *
 * This is RDK's convention, not a workaround. `FrameSystem.Transform` skips the final transform
 * when the subject is a `GeometriesInFrame`, explaining itself in `referenceframe/frame_system.go`:
 * "A frame is assigned a pose and a geometry and the two are not coupled together. This way you can
 * define everything relative to the parent frame."
 *
 * Only for frames carrying a model link's geometry. An obstacle's center is already local, and the
 * JSON looks identical either way — only the frame's kind says which convention applies.
 */
export const geometryCenterInFrame = (
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
