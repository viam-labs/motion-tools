import type { Geometry, Pose } from '@viamrobotics/sdk'

import { Euler, MathUtils, Quaternion } from 'three'

import { OrientationVector } from './three/OrientationVector'

interface RawKinematicsTranslation {
	X?: number
	Y?: number
	Z?: number
}

interface RawKinematicsOrientation {
	type?: string
	value?: {
		// ov_degrees / ov_radians
		x?: number
		y?: number
		z?: number
		th?: number
		// quaternion (Go's default, un-tagged field capitalisation)
		X?: number
		Y?: number
		Z?: number
		W?: number
		// euler_angles (radians)
		roll?: number
		pitch?: number
		yaw?: number
	}
}

const quaternion = new Quaternion()
const euler = new Euler()
const ov = new OrientationVector()

/**
 * Convert a raw kinematics orientation blob to an orientation vector in
 * degrees. Raw kinematics orientations may be expressed as `ov_degrees`
 * (default, `{ x, y, z, th }` in degrees), `ov_radians`, `quaternion`
 * (`{ X, Y, Z, W }`), or `euler_angles` (`{ roll, pitch, yaw }` in radians).
 */
const orientationToOV = (
	orientation?: RawKinematicsOrientation
): { oX: number; oY: number; oZ: number; theta: number } => {
	const value = orientation?.value

	if (orientation?.type === 'quaternion') {
		quaternion.set(value?.X ?? 0, value?.Y ?? 0, value?.Z ?? 0, value?.W ?? 1)
		ov.setFromQuaternion(quaternion)
		return { oX: ov.x, oY: ov.y, oZ: ov.z, theta: MathUtils.radToDeg(ov.th) }
	}

	if (orientation?.type === 'euler_angles') {
		euler.set(value?.roll ?? 0, value?.pitch ?? 0, value?.yaw ?? 0, 'ZYX')
		quaternion.setFromEuler(euler)
		ov.setFromQuaternion(quaternion)
		return { oX: ov.x, oY: ov.y, oZ: ov.z, theta: MathUtils.radToDeg(ov.th) }
	}

	if (orientation?.type === 'ov_radians') {
		return {
			oX: value?.x ?? 0,
			oY: value?.y ?? 0,
			oZ: value?.z ?? 1,
			theta: MathUtils.radToDeg(value?.th ?? 0),
		}
	}

	return {
		oX: value?.x ?? 0,
		oY: value?.y ?? 0,
		oZ: value?.z ?? 1,
		theta: value?.th ?? 0,
	}
}

interface RawKinematicsGeometry {
	x?: number
	y?: number
	z?: number
	r?: number
	l?: number
	type?: string
	Label?: string
	translation?: RawKinematicsTranslation
	orientation?: RawKinematicsOrientation
	mesh_data?: string | number[]
	mesh_content_type?: string
}

/**
 * `mesh_data` arrives either base64-encoded (Go's `[]byte` -> JSON string) or
 * as a raw byte array, depending on how the kinematics Struct was encoded.
 */
const toMeshBytes = (data?: string | number[]): Uint8Array => {
	if (data === undefined) {
		return new Uint8Array(0)
	}

	if (typeof data === 'string') {
		const binary = atob(data)
		const bytes = new Uint8Array(binary.length)
		for (let i = 0; i < binary.length; i++) {
			bytes[i] = binary.charCodeAt(i)
		}
		return bytes
	}

	return Uint8Array.from(data)
}

/**
 * Build a Pose from kinematics orientation + translation JSON. The raw
 * kinematics JSON uses capitalised `{ X, Y, Z }` for translation and an
 * `{ type, value: { x, y, z, th } }` wrapper for orientation.
 */
export const createPoseFromOrientation = (
	translation?: RawKinematicsTranslation,
	orientation?: RawKinematicsOrientation
): Pose => {
	const { oX, oY, oZ, theta } = orientationToOV(orientation)
	return {
		x: translation?.X ?? 0,
		y: translation?.Y ?? 0,
		z: translation?.Z ?? 0,
		oX,
		oY,
		oZ,
		theta,
	}
}

/**
 * Convert a raw kinematics link geometry JSON blob into the SDK `Geometry`
 * shape expected by the ECS trait system.
 *
 * Raw format (from `kinematics.links[].geometry`):
 *   `{ x, y, z, r, l, type, Label, translation: { X, Y, Z }, orientation }`
 *
 * Target format (`Geometry` from `@viamrobotics/sdk`):
 *   `{ geometryType: { case, value }, label, center: Pose }`
 */
export const parseKinematicsGeometry = (raw: RawKinematicsGeometry): Geometry => {
	console.log(raw)
	const center: Pose = createPoseFromOrientation(raw.translation, raw.orientation)

	const label = raw.Label ?? ''

	const hasMesh = raw.mesh_data !== undefined && raw.mesh_data.length > 0
	const hasBox = (raw.x !== undefined && raw.x !== 0)
		|| (raw.y !== undefined && raw.y !== 0)
		|| (raw.z !== undefined && raw.z !== 0)
	const hasCapsule = (raw.r !== undefined && raw.r !== 0)
		&& (raw.l !== undefined && raw.l !== 0)
	const hasSphere = (raw.r !== undefined && raw.r !== 0)
		&& !hasCapsule

	if (hasMesh) {
		return {
			center,
			label,
			geometryType: {
				case: 'mesh',
				value: {
					contentType: raw.mesh_content_type ?? '',
					mesh: toMeshBytes(raw.mesh_data),
				},
			},
		}
	}

	if (hasCapsule) {
		return {
			center,
			label,
			geometryType: {
				case: 'capsule',
				value: { radiusMm: raw.r!, lengthMm: raw.l! },
			},
		}
	}

	if (hasSphere) {
		return {
			center,
			label,
			geometryType: {
				case: 'sphere',
				value: { radiusMm: raw.r! },
			},
		}
	}

	if (hasBox) {
		return {
			center,
			label,
			geometryType: {
				case: 'box',
				value: { dimsMm: { x: raw.x ?? 0, y: raw.y ?? 0, z: raw.z ?? 0 } },
			},
		}
	}

	return {
		center,
		label,
		geometryType: { case: undefined, value: undefined },
	}
}
