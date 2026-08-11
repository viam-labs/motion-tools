// TODO: replace with types exported from the sdk when created

import type { Transform } from '@viamrobotics/sdk'

import { UuidTool } from 'uuid-tool'

import { createGeometryFromFrame } from '$lib/geometry'
import { Pose } from '$lib/math'

type FrameGeometryMap = {
	none: { type: 'none' }
	box: { type: 'box'; x: number; y: number; z: number }
	sphere: { type: 'sphere'; r: number }
	capsule: { type: 'capsule'; r: number; l: number }
}

export type FrameGeometry = keyof FrameGeometryMap

/**
 * A quaternion reaches a config in either spelling: rdk marshals one from
 * untagged Go fields as `{ W, X, Y, Z }`, the frame editor writes
 * `{ w, x, y, z }`, and Go's unmarshal is case-insensitive so rdk accepts both.
 */
type FrameQuaternion =
	| { w: number; x: number; y: number; z: number }
	| { W: number; X: number; Y: number; Z: number }

/**
 * The orientation encodings rdk's `spatialmath.OrientationConfig` accepts. A
 * machine config is authored against rdk rather than against this app, so every
 * one of these can arrive even though the editor only ever writes `ov_degrees`.
 * `axis_angles` in particular shares `{ x, y, z, th }` with the two
 * orientation-vector encodings, so a missing case reads as a plausible wrong
 * rotation rather than as bad input.
 */
type FrameOrientationMap = {
	quaternion: { type: 'quaternion'; value: FrameQuaternion }
	euler_angles: { type: 'euler_angles'; value: { roll: number; pitch: number; yaw: number } }
	ov_degrees: { type: 'ov_degrees'; value: { x: number; y: number; z: number; th: number } }
	ov_radians: { type: 'ov_radians'; value: { x: number; y: number; z: number; th: number } }
	/** rdk's `R4AA`: an axis plus a rotation about it, in radians. */
	axis_angles: { type: 'axis_angles'; value: { x: number; y: number; z: number; th: number } }
}

export type FrameOrientation = keyof FrameOrientationMap

export type FrameEulerDegrees = FrameOrientationMap['euler_angles']['value']

export interface Frame<
	T extends FrameGeometry = FrameGeometry,
	K extends FrameOrientation = FrameOrientation,
> {
	id?: string
	name?: string
	parent: string
	translation: {
		x: number
		y: number
		z: number
	}
	orientation: FrameOrientationMap[K]
	geometry?: FrameGeometryMap[T]
}

export const createFrame = <
	T extends FrameGeometry = 'box',
	K extends FrameOrientation = 'ov_degrees',
>(
	geometry?: FrameGeometryMap[T]
): Frame<T> => {
	return {
		parent: 'world',
		translation: { x: 0, y: 0, z: 0 },
		orientation: {
			type: 'ov_degrees',
			value: { x: 0, y: 0, z: 1, th: 0 },
		} as FrameOrientationMap[K],
		geometry: (geometry ?? { type: 'box', x: 100, y: 100, z: 100 }) as FrameGeometryMap[T],
	} satisfies Frame<T>
}

export const createTransformFromFrame = (name: string, frame: Partial<Frame>): Transform => {
	return {
		uuid: new Uint8Array(UuidTool.toBytes(UuidTool.newUuid())),
		referenceFrame: name,
		poseInObserverFrame: {
			referenceFrame: frame.parent ?? 'world',
			pose: new Pose().setFromFrame(frame),
		},
		physicalObject: createGeometryFromFrame(frame),
	} satisfies Transform
}
