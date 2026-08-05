import type { Geometry } from '@viamrobotics/sdk'

import type { Frame } from '$lib/frame'

import { Pose } from '$lib/math'

export interface RawKinematicsTranslation {
	X?: number
	Y?: number
	Z?: number
}

export interface RawKinematicsOrientation {
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

/**
 * Restate a raw kinematics orientation as the config `Frame` orientation shape,
 * so `Pose.setFromFrame` owns the actual conversion. Raw kinematics
 * orientations may be `ov_degrees` (default, `{ x, y, z, th }` in degrees),
 * `ov_radians`, `quaternion` (`{ X, Y, Z, W }` — Go's un-tagged field
 * capitalisation), or `euler_angles` (`{ roll, pitch, yaw }` in radians).
 */
const toFrameOrientation = (orientation?: RawKinematicsOrientation): Frame['orientation'] => {
	const value = orientation?.value
	const vector = { x: value?.x ?? 0, y: value?.y ?? 0, z: value?.z ?? 1, th: value?.th ?? 0 }

	switch (orientation?.type) {
		case 'quaternion': {
			return {
				type: 'quaternion',
				value: { x: value?.X ?? 0, y: value?.Y ?? 0, z: value?.Z ?? 0, w: value?.W ?? 1 },
			}
		}
		case 'euler_angles': {
			return {
				type: 'euler_angles',
				value: { roll: value?.roll ?? 0, pitch: value?.pitch ?? 0, yaw: value?.yaw ?? 0 },
			}
		}
		case 'ov_radians': {
			return { type: 'ov_radians', value: vector }
		}
		default: {
			return { type: 'ov_degrees', value: vector }
		}
	}
}

export interface RawKinematicsGeometry {
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
	mesh_file_path?: string
}

export interface RawKinematicsLink {
	id: string
	parent?: string
	translation?: RawKinematicsTranslation
	orientation?: RawKinematicsOrientation
	geometry?: RawKinematicsGeometry
}

export interface RawKinematicsJoint {
	id: string
	parent?: string
}

/** rdk's `ModelConfigJSON`, as it arrives in `FrameSystemConfig.kinematics`. */
export interface RawKinematicsModel {
	name?: string
	links?: RawKinematicsLink[]
	joints?: RawKinematicsJoint[]
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
	return new Pose().setFromFrame({
		translation: { x: translation?.X ?? 0, y: translation?.Y ?? 0, z: translation?.Z ?? 0 },
		orientation: toFrameOrientation(orientation),
	})
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
 *
 * `type` is authoritative; when it is absent rdk infers the shape from whichever
 * params are set, and so do we.
 */
export const parseKinematicsGeometry = (raw: RawKinematicsGeometry): Geometry => {
	const center: Pose = createPoseFromOrientation(raw.translation, raw.orientation)
	const label = raw.Label ?? ''

	const box = (): Geometry => ({
		center,
		label,
		geometryType: {
			case: 'box',
			value: { dimsMm: { x: raw.x ?? 0, y: raw.y ?? 0, z: raw.z ?? 0 } },
		},
	})

	const sphere = (): Geometry => ({
		center,
		label,
		geometryType: { case: 'sphere', value: { radiusMm: raw.r ?? 0 } },
	})

	const capsule = (): Geometry => ({
		center,
		label,
		geometryType: { case: 'capsule', value: { radiusMm: raw.r ?? 0, lengthMm: raw.l ?? 0 } },
	})

	const mesh = (): Geometry => ({
		center,
		label,
		geometryType: {
			case: 'mesh',
			value: { contentType: raw.mesh_content_type ?? '', mesh: toMeshBytes(raw.mesh_data) },
		},
	})

	const none = (): Geometry => ({
		center,
		label,
		geometryType: { case: undefined, value: undefined },
	})

	switch (raw.type) {
		case 'box': {
			return box()
		}
		case 'sphere': {
			return sphere()
		}
		case 'capsule': {
			return capsule()
		}
		case 'mesh': {
			if (raw.mesh_data === undefined || raw.mesh_data.length === 0) {
				// URDF meshes referenced only by path aren't inlined into the
				// kinematics, so there is nothing to render.
				console.warn(
					`[kinematics] mesh geometry "${label}" has no mesh_data${
						raw.mesh_file_path ? ` (file path: ${raw.mesh_file_path})` : ''
					}`
				)
				return none()
			}
			return mesh()
		}
		case undefined:
		case '': {
			// rdk infers intent from whichever params are set when `type` is
			// omitted — mirror `GeometryConfig.ParseConfig`'s order exactly.
			if ((raw.x ?? 0) !== 0 || (raw.y ?? 0) !== 0 || (raw.z ?? 0) !== 0) {
				return box()
			}
			if ((raw.l ?? 0) !== 0) {
				return capsule()
			}
			if ((raw.r ?? 0) !== 0) {
				return sphere()
			}
			return none()
		}
		default: {
			// `cylinder` and `point` have no equivalent in the SDK geometry union.
			return none()
		}
	}
}
