import type { Geometry, Pose } from '@viamrobotics/sdk'
import { MathUtils } from 'three'
import { createPose } from './transform'

export type PointsGeometry = { case: 'points'; value: Float32Array }
export type LinesGeometry = { case: 'line'; value: Float32Array }

export type Geometries = Geometry['geometryType'] | PointsGeometry | LinesGeometry

export type Metadata = Record<string, any>

export class WorldObject<T extends Geometries = Geometries> {
	uuid = MathUtils.generateUUID()

	name: string
	referenceFrame: string
	pose: Pose
	geometry?: T
	metadata: Metadata

	constructor(name: string, pose?: Pose, parent = 'world', geometry?: T, metadata?: Metadata) {
		this.name = name
		this.referenceFrame = parent
		this.pose = pose ?? createPose()
		this.geometry = geometry
		this.metadata = metadata ?? {}
	}
}
