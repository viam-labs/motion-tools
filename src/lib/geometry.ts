import type {
	Capsule,
	Geometry,
	PointCloud,
	RectangularPrism,
	Sphere,
	Transform,
} from '@viamrobotics/sdk'

import { Pose } from '$lib/math'
import { inferGeometryType } from '$lib/math/geometryJson'

import type { Frame } from './frame'

export const createGeometry = (geometryType?: Geometry['geometryType'], label = ''): Geometry => {
	return {
		center: new Pose(),
		label,
		geometryType: geometryType ?? { case: undefined, value: undefined },
	}
}

/**
 * Reads a geometry the frame editor cannot write but rdk accepts: an untyped one
 * for rdk to infer, or a shape the SDK's `Geometry` union has no case for.
 */
const createGeometryFromRdkConfig = (raw: Record<string, unknown>): Geometry | undefined => {
	const x = (raw.x as number) ?? 0
	const y = (raw.y as number) ?? 0
	const z = (raw.z as number) ?? 0
	const r = (raw.r as number) ?? 0
	const l = (raw.l as number) ?? 0

	switch (inferGeometryType(raw)) {
		case 'box': {
			return createGeometry({ case: 'box', value: { dimsMm: { x, y, z } } })
		}
		case 'capsule': {
			return createGeometry({ case: 'capsule', value: { radiusMm: r, lengthMm: l } })
		}
		case 'sphere': {
			return createGeometry({ case: 'sphere', value: { radiusMm: r } })
		}
		// RDK's own spelling of "no geometry", and what inference returns when no
		// dimension was set either.
		case '': {
			return undefined
		}
		default: {
			// `cylinder`, `point` and `mesh` have no `common.v1.Geometry` case —
			// rdk's `Cylinder.ToProtobuf` panics rather than pick a stand-in.
			console.warn(`[frame] geometry type "${raw.type as string}" cannot be drawn — skipping it`)
			return undefined
		}
	}
}

export const createGeometryFromFrame = (frame: Partial<Frame>): Geometry | undefined => {
	const geometry = frame.geometry
	if (!geometry) {
		return undefined
	}

	switch (geometry.type) {
		case 'none': {
			return undefined
		}
		case 'box': {
			return createGeometry({
				case: 'box',
				value: {
					dimsMm: {
						x: geometry.x,
						y: geometry.y,
						z: geometry.z,
					},
				},
			})
		}
		case 'sphere': {
			return createGeometry({
				case: 'sphere',
				value: {
					radiusMm: geometry.r,
				},
			})
		}
		case 'capsule': {
			return createGeometry({
				case: 'capsule',
				value: {
					radiusMm: geometry.r,
					lengthMm: geometry.l,
				},
			})
		}
		default: {
			// The assignment catches a shape added to the union without a case here.
			// The call handles what the union does not bound: a config is authored
			// against rdk, so a `GeometryConfig` is what arrives.
			const _exhaustive: never = geometry
			return createGeometryFromRdkConfig(_exhaustive)
		}
	}
}

export const createBox = (box?: RectangularPrism) => {
	return {
		x: box?.dimsMm?.x ?? 0,
		y: box?.dimsMm?.y ?? 0,
		z: box?.dimsMm?.z ?? 0,
	}
}

export const createCapsule = (capsule?: Capsule) => {
	return {
		r: capsule?.radiusMm ?? 0,
		l: capsule?.lengthMm ?? 0,
	}
}

export const createSphere = (sphere?: Sphere) => {
	return {
		r: sphere?.radiusMm ?? 0,
	}
}

export const isPointCloud = (
	geometry?: Geometry['geometryType']
): geometry is { case: 'pointcloud'; value: PointCloud } => {
	return geometry?.case === 'pointcloud'
}

/**
 * Reverse of {@link createGeometryFromFrame}: reads a Transform's geometry back into
 * the frame geometry shape. Point clouds and absent geometry resolve to undefined.
 */
export const frameGeometryFromTransform = (transform: Transform): Frame['geometry'] => {
	const geometryType = transform.physicalObject?.geometryType
	switch (geometryType?.case) {
		case 'box': {
			return { type: 'box', ...createBox(geometryType.value) }
		}
		case 'sphere': {
			return { type: 'sphere', ...createSphere(geometryType.value) }
		}
		case 'capsule': {
			return { type: 'capsule', ...createCapsule(geometryType.value) }
		}
		default: {
			return undefined
		}
	}
}
