import type { Transform } from '@viamrobotics/sdk'
import { Matrix4, Vector3, Quaternion } from 'three'

const position = new Vector3()
const quaternion = new Quaternion()
const scale = new Vector3()

export const transformToMatrix = (transform: Transform | undefined, matrix: Matrix4) => {
	const pose = transform?.poseInObserverFrame?.pose
	const physicalObject = transform?.physicalObject

	if (pose && physicalObject) {
		if (physicalObject.geometryType.case === 'box') {
			const geo = physicalObject.geometryType.value
			if (geo.dimsMm) {
				scale.set(geo.dimsMm.x, geo.dimsMm.y, geo.dimsMm.z).multiplyScalar(0.001)
			}
		} else if (physicalObject.geometryType.case === 'capsule') {
		} else if (physicalObject.geometryType.case === 'sphere') {
			const geo = physicalObject.geometryType.value
			if (geo.radiusMm) {
				scale.setScalar(geo.radiusMm).multiplyScalar(0.001)
			}
		}

		position.set(pose.x, pose.y, pose.z).multiplyScalar(0.001)
		matrix.compose(position, quaternion, scale)
	} else {
		scale.set(0, 0, 0)
		matrix.compose(position, quaternion, scale)
	}
}
