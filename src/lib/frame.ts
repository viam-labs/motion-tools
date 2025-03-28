import { Geometry, Pose } from '@viamrobotics/sdk'
import { Quaternion, Vector3, BufferGeometry, Color } from 'three'
import { createPose, poseToQuaternion, poseToVector3 } from './transform'

const nullPose = createPose()

export type GeometryType =
	| {
			type: 'points'
			buffer: BufferGeometry
	  }
	| {
			type: 'trimesh'
			buffer: BufferGeometry
	  }
	| {
			type: 'box'
			dimensions: { x: number; y: number; z: number }
	  }
	| {
			type: 'sphere'
			dimensions: { r: number }
	  }
	| {
			type: 'capsule'
			dimensions: { r: number; l: number }
	  }

export type GeometryTypes = GeometryType['type']

export class Frame {
	name = ''
	parent = ''
	position = new Vector3()
	quaternion = new Quaternion()
	color = new Color()

	geometry: GeometryType | undefined

	constructor(name = '', parent = 'world', pose?: Partial<Pose>, geometry?: Geometry) {
		this.name = name
		this.parent = parent
		this.setPose(pose ?? nullPose)

		if (geometry) this.setGeometry(geometry)
	}

	setPose(pose?: Partial<Pose>) {
		poseToVector3(pose ?? nullPose, this.position)
		poseToQuaternion(pose ?? nullPose, this.quaternion)
	}

	setGeometry(geometry: Geometry) {
		if (geometry.geometryType.case === 'sphere') {
			this.geometry = {
				type: 'sphere',
				dimensions: {
					r: geometry.geometryType.value.radiusMm / 1000,
				},
			}
		} else if (geometry.geometryType.case === 'box') {
			this.geometry = {
				type: 'box',
				dimensions: {
					x: (geometry.geometryType.value?.dimsMm?.x ?? 0) / 1000,
					y: (geometry.geometryType.value?.dimsMm?.y ?? 0) / 1000,
					z: (geometry.geometryType.value?.dimsMm?.z ?? 0) / 1000,
				},
			}
		}
	}
}
