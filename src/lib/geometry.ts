import type {
	Capsule,
	Geometry,
	PointCloud,
	RectangularPrism,
	Sphere,
	Transform,
} from '@viamrobotics/sdk'

import { Pose } from '$lib/math'

import type { Frame } from './frame'

export const createGeometry = (
	geometryType?: Geometry['geometryType'],
	label = '',
	center = new Pose()
): Geometry => {
	return {
		center,
		label,
		geometryType: geometryType ?? { case: undefined, value: undefined },
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
			return createGeometry(
				{
					case: 'box',
					value: {
						dimsMm: {
							x: geometry.x,
							y: geometry.y,
							z: geometry.z,
						},
					},
				},
				'',
				new Pose().setFromFrame(geometry)
			)
		}
		case 'sphere': {
			return createGeometry(
				{
					case: 'sphere',
					value: {
						radiusMm: geometry.r,
					},
				},
				'',
				new Pose().setFromFrame(geometry)
			)
		}
		case 'capsule': {
			return createGeometry(
				{
					case: 'capsule',
					value: {
						radiusMm: geometry.r,
						lengthMm: geometry.l,
					},
				},
				'',
				new Pose().setFromFrame(geometry)
			)
		}
		default: {
			const _exhaustive: never = geometry
			return _exhaustive
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
