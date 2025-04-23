import type { Geometry, PoseInFrame } from '@viamrobotics/sdk'
import { MathUtils } from 'three'
import { createPoseInFrame } from './transform'

type Geometries = Geometry | Float32Array | undefined

interface Metadata {
	color?: string
	colors?: Float32Array
}

export class WorldObject {
	uuid = MathUtils.generateUUID()

	name: string
	pose: PoseInFrame

	geometry: Geometries
	metadata?: Metadata

	constructor(name?: string, pose?: PoseInFrame, geometry?: Geometries, metadata?: Metadata) {
		this.name = name ?? this.uuid
		this.pose = createPoseInFrame(pose?.pose, pose?.referenceFrame)
		this.geometry = geometry
		this.metadata = metadata
	}
}
