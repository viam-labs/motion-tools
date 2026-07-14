import type { Geometry, Pose } from '@viamrobotics/sdk'

interface RawKinematicsTranslation {
	X?: number
	Y?: number
	Z?: number
}

interface RawKinematicsOrientation {
	type?: string
	value?: { x?: number; y?: number; z?: number; th?: number }
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
	return {
		x: translation?.X ?? 0,
		y: translation?.Y ?? 0,
		z: translation?.Z ?? 0,
		oX: orientation?.value?.x ?? 0,
		oY: orientation?.value?.y ?? 0,
		oZ: orientation?.value?.z ?? 1,
		theta: orientation?.value?.th ?? 0,
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
	const center: Pose = {
		x: raw.translation?.X ?? 0,
		y: raw.translation?.Y ?? 0,
		z: raw.translation?.Z ?? 0,
		oX: raw.orientation?.value?.x ?? 0,
		oY: raw.orientation?.value?.y ?? 0,
		oZ: raw.orientation?.value?.z ?? 1,
		theta: raw.orientation?.value?.th ?? 0,
	}

	const label = raw.Label ?? ''

	const hasBox = (raw.x !== undefined && raw.x !== 0)
		|| (raw.y !== undefined && raw.y !== 0)
		|| (raw.z !== undefined && raw.z !== 0)
	const hasCapsule = (raw.r !== undefined && raw.r !== 0)
		&& (raw.l !== undefined && raw.l !== 0)
	const hasSphere = (raw.r !== undefined && raw.r !== 0)
		&& !hasCapsule

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
