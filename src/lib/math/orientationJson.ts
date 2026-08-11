/**
 * Decoder for the orientation encodings rdk's `spatialmath.OrientationConfig`
 * writes. A hand conversion of Go this file cannot import
 * (`spatialmath/orientation_json.go`), so the switch below is a place the copy
 * can fall behind its original without failing.
 *
 * Split out from `./spatialJson`, which re-exports it: `Pose` needs this decoder
 * for the machine config's `frame`, and the rest of that module is built on
 * `Pose`.
 */

import { Euler, MathUtils, Quaternion, Vector3 } from 'three'

import { OrientationVector } from './OrientationVector'

/** Straight off the wire: `type` is any string RDK wrote, `value` whatever shape matches it. */
export type RawOrientation = { type?: string; value?: unknown }

const tmpE = new Euler()
const tmpAxis = new Vector3()
const tmpOv = new OrientationVector()

/**
 * RDK marshals a quaternion from untagged Go fields, so it writes
 * `{ W, X, Y, Z }`, while the frame editor writes `{ w, x, y, z }`. Go's
 * unmarshal is case-insensitive, so a machine config may legitimately hold
 * either spelling and both have to be read.
 */
type QuatJson = Partial<Record<'W' | 'X' | 'Y' | 'Z' | 'w' | 'x' | 'y' | 'z', number>>
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
				// RDK writes the scalar first; Three.js takes it last. An omitted
				// field is Go's zero value, so the scalar defaults to 0 rather than
				// 1, and `quaternionJSON.toQuaternion` normalizes what it read —
				// which the orientation-vector conversion downstream relies on.
				out.set(v.X ?? v.x ?? 0, v.Y ?? v.y ?? 0, v.Z ?? v.z ?? 0, v.W ?? v.w ?? 0).normalize()
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
				// RDK normalizes the axis inside `R4AA.ToQuat`, and `setFromAxisAngle`
				// assumes a unit one. A zero axis names no rotation at all — rdk
				// panics on it rather than defining one — so report it and fall back.
				tmpAxis.set(v.x, v.y, v.z)
				if (tmpAxis.lengthSq() > 0) {
					out.setFromAxisAngle(tmpAxis.normalize(), v.th ?? 0)
					return true
				}
				console.warn('[spatialJson] axis_angles has a zero axis — using identity')
				out.set(0, 0, 0, 1)
				return false
			}
		}
	}

	if (orientation?.type) {
		console.warn(`[spatialJson] unhandled orientation "${orientation.type}" — using identity`)
	}
	out.set(0, 0, 0, 1)
	return false
}
