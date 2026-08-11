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
 * Read a geometry the frame editor cannot write but rdk still accepts: one that
 * leaves `type` off for rdk to infer, and the three shapes with no counterpart
 * in the SDK's `Geometry` union.
 *
 * `cylinder`, `point` and `mesh` are real rdk geometries that cannot be carried
 * over the wire as a `common.v1.Geometry` — rdk's own `Cylinder.ToProtobuf`
 * panics rather than pick a stand-in — so they are reported and skipped. Better
 * a logged gap than a shape the viewer invented.
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
		// Inference returns the empty string when nothing was set, which is rdk's
		// own spelling of "no geometry".
		case '': {
			return undefined
		}
		default: {
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
			// The assignment is the compile-time half: it fails if a shape is added
			// to the editor's union without a case above. The call is the runtime
			// half, and they answer different questions — a machine config is
			// authored against rdk, so what actually arrives is a
			// `spatialmath.GeometryConfig`, which the union does not bound.
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

// Reverse of createGeometryFromFrame: read a Transform's geometry back into the
// frame geometry shape. Point clouds / no geometry resolve to undefined.
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
