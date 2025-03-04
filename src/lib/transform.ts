import type { Geometry, Pose } from '@viamrobotics/sdk'
import { OrientationVector } from '@viamrobotics/three'
import { type Object3D, MathUtils, Quaternion, Vector3 } from 'three'

const ov = new OrientationVector()

export const quaternionToPose = (quaternion: Quaternion, pose: Pose) => {
	ov.setFromQuaternion(quaternion)
	pose.oX = ov.x
	pose.oY = ov.y
	pose.oZ = ov.z
	pose.theta = MathUtils.radToDeg(ov.th)
}

export const vector3ToPose = (vec3: Vector3, pose: Pose) => {
	pose.x = vec3.x * 1000
	pose.y = vec3.y * 1000
	pose.z = vec3.z * 1000
}

export const object3dToPose = (object3d: Object3D, pose: Pose) => {
	vector3ToPose(object3d.position, pose)
	quaternionToPose(object3d.quaternion, pose)
}

export const poseToQuaternion = (pose: Pose, quaternion: Quaternion) => {
	ov.set(pose.oX, pose.oY, pose.oZ, MathUtils.degToRad(pose.theta))
	ov.toQuaternion(quaternion)
}

export const poseToVector3 = (pose: Pose, vec3: Vector3) => {
	vec3.set(pose.x, pose.y, pose.z).multiplyScalar(0.001)
}

export const poseToObject3d = (pose: Pose, object3d: Object3D) => {
	poseToVector3(pose, object3d.position)
	poseToQuaternion(pose, object3d.quaternion)
}

export const scaleToDimensions = (scale: Vector3, geometry: Geometry) => {
	if (geometry.geometryType.case === 'box') {
		geometry.geometryType.value.dimsMm ??= { x: 0, y: 0, z: 0 }
		geometry.geometryType.value.dimsMm.x *= scale.x
		geometry.geometryType.value.dimsMm.y *= scale.y
		geometry.geometryType.value.dimsMm.z *= scale.z
		// geometry.geometryType.value.dimsMm = {
		// 	x: scale.x * 1000,
		// 	y: scale.y * 1000,
		// 	z: scale.z * 1000,
		// }
	} else if (geometry.geometryType.case === 'capsule') {
		geometry.geometryType.value.radiusMm = scale.x
		geometry.geometryType.value.lengthMm = scale.y
	} else if (geometry.geometryType.case === 'sphere') {
		geometry.geometryType.value.radiusMm = scale.x
	}
}
