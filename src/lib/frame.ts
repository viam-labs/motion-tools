import { Geometry, Pose } from '@viamrobotics/sdk'
import { Quaternion, Vector3, BufferGeometry, Color } from 'three'
import { poseToQuaternion, poseToVector3 } from './transform'

const nullPose = new Pose()

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

	constructor(pose?: Partial<Pose>) {
		this.setPose(pose ?? nullPose)
	}

	setPose(pose: Partial<Pose>) {
		poseToVector3(pose, this.position)
		poseToQuaternion(pose, this.quaternion)
	}

	setGeometry(geometry: Geometry) {
		if (geometry.geometryType.case === 'sphere') {
			this.geometry = {
				type: 'sphere',
				dimensions: {
					r: geometry.geometryType.value.radiusMm / 1000,
				},
			}
		}
	}
}
