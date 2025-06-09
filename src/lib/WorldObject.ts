import type { Geometry, Pose } from '@viamrobotics/sdk'
import { Box3, MathUtils, Object3D, Vector3 } from 'three'
import { createPose } from './transform'

export type PointsGeometry = { case: 'points'; value: Float32Array<ArrayBuffer> }
export type LinesGeometry = { case: 'line'; value: Float32Array }

export type Geometries = Geometry['geometryType'] | PointsGeometry | LinesGeometry

export type Metadata = {
	colors?: Float32Array
	color?: string
	gltf?: { scene: Object3D }
	points?: Vector3[]
	batched?: {
		id: number
		name: string
	}
	getBoundingBoxAt?: (box: Box3) => void
}

export class WorldObject<T extends Geometries = Geometries> {
	uuid: string
	name: string
	referenceFrame: string
	pose: Pose
	geometry?: T
	metadata: Metadata

	constructor(name: string, pose?: Pose, parent = 'world', geometry?: T, metadata?: Metadata) {
		this.uuid = MathUtils.generateUUID()
		this.name = name
		this.referenceFrame = parent
		this.pose = pose ?? createPose()
		this.geometry = geometry
		this.metadata = metadata ?? {}
	}
}
