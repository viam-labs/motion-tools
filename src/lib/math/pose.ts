import { Pose as ViamPose } from '@viamrobotics/sdk'
import { Euler, MathUtils, Matrix4, Object3D, Quaternion, Vector3 } from 'three'

import type { Frame } from '../frame'

import { OrientationVector } from '../three/OrientationVector'

const ov = new OrientationVector()
const quaternion = new Quaternion()
const translation = new Vector3()
const scale = new Vector3()
const euler = new Euler()

export class Pose implements ViamPose {
	x: number
	y: number
	z: number
	oX: number
	oY: number
	oZ: number
	theta: number

	constructor(x = 0, y = 0, z = 0, oX = 0, oY = 0, oZ = 1, theta = 0) {
		this.x = x
		this.y = y
		this.z = z
		this.oX = oX
		this.oY = oY
		this.theta = theta

		// We should only default to the 0,0,1,0 orientation vector if the entire vector component is missing
		this.oZ = oX === undefined && oY === undefined && oZ === undefined ? 1 : (oZ ?? 0)
	}

	equals(pose?: {
		x?: number
		y?: number
		z?: number
		oX?: number
		oY?: number
		oZ?: number
		theta?: number
	}) {
		if (pose === this) return true
		if (!pose) return false

		return (
			this.x === pose.x &&
			this.y === pose.y &&
			this.z === pose.z &&
			this.oX === pose.oX &&
			this.oY === pose.oY &&
			this.oZ === pose.oZ &&
			this.theta === pose.theta
		)
	}

	clone() {
		return new Pose(this.x, this.y, this.z, this.oX, this.oY, this.oZ, this.theta)
	}

	copy(pose?: {
		x?: number
		y?: number
		z?: number
		oX?: number
		oY?: number
		oZ?: number
		theta?: number
	}) {
		if (!pose) return this

		this.x = pose.x ?? 0
		this.y = pose.y ?? 0
		this.z = pose.z ?? 0
		this.oX = pose.oX ?? 0
		this.oY = pose.oY ?? 0
		this.theta = pose.theta ?? 0

		this.oZ =
			pose.oX === undefined && pose.oY === undefined && pose.oZ === undefined ? 1 : (pose.oZ ?? 0)

		return this
	}

	scale(x: number) {
		this.x *= x
		this.y *= x
		this.z *= x

		return this
	}

	isFinite() {
		return (
			Number.isFinite(this.x) &&
			Number.isFinite(this.y) &&
			Number.isFinite(this.z) &&
			Number.isFinite(this.oX) &&
			Number.isFinite(this.oY) &&
			Number.isFinite(this.oZ) &&
			Number.isFinite(this.theta)
		)
	}

	setFromFrame(frame: Partial<Frame>) {
		if (frame.orientation?.type === 'quaternion') {
			quaternion.copy(frame.orientation.value)
			ov.setFromQuaternion(quaternion)
		} else if (frame.orientation?.type === 'euler_angles') {
			euler.set(
				frame.orientation.value.roll,
				frame.orientation.value.pitch,
				frame.orientation.value.yaw,
				'ZYX'
			)
			quaternion.setFromEuler(euler)
			ov.setFromQuaternion(quaternion)
		} else if (frame.orientation?.type === 'ov_radians') {
			ov.copy(frame.orientation.value)
		} else if (frame.orientation) {
			const th = MathUtils.degToRad(frame.orientation?.value.th ?? 0)
			ov.set(frame.orientation?.value.x, frame.orientation?.value.y, frame.orientation?.value.z, th)
		} else {
			ov.set(0, 0, 1, 0)
		}

		this.x = frame.translation?.x ?? 0
		this.y = frame.translation?.y ?? 0
		this.z = frame.translation?.z ?? 0
		this.oX = ov.x
		this.oY = ov.y
		this.oZ = ov.z
		this.theta = MathUtils.radToDeg(ov.th)

		return this
	}

	setFromQuaternion(quaternion: Quaternion) {
		ov.setFromQuaternion(quaternion)
		this.oX = ov.x
		this.oY = ov.y
		this.oZ = ov.z
		this.theta = MathUtils.radToDeg(ov.th)

		return this
	}

	setFromVector3(vector3: Vector3) {
		this.x = vector3.x
		this.y = vector3.y
		this.z = vector3.z

		return this
	}

	setFromObject3D(object3D: Object3D) {
		this.setFromVector3(object3D.position)
		this.setFromQuaternion(object3D.quaternion)

		return this
	}

	setFromMatrix4(matrix4: Matrix4) {
		matrix4.decompose(translation, quaternion, scale)
		this.x = translation.x
		this.y = translation.y
		this.z = translation.z

		ov.setFromQuaternion(quaternion)
		this.oX = ov.x
		this.oY = ov.y
		this.oZ = ov.z
		this.theta = MathUtils.radToDeg(ov.th)

		return this
	}

	toMatrix4(matrix4 = new Matrix4()) {
		ov.set(this.oX, this.oY, this.oZ, MathUtils.degToRad(this.theta))
		ov.toQuaternion(quaternion)
		matrix4.makeRotationFromQuaternion(quaternion)
		matrix4.setPosition(this.x, this.y, this.z)
		return matrix4
	}

	toQuaternion(quaternion = new Quaternion()) {
		const th = MathUtils.degToRad(this.theta ?? 0)
		ov.set(this.oX, this.oY, this.oZ, th)
		if (quaternion) {
			ov.toQuaternion(quaternion)
		}
	}

	toEulerDegrees() {
		this.toQuaternion(quaternion)
		euler.setFromQuaternion(quaternion, 'ZYX')
		return {
			roll: MathUtils.radToDeg(euler.x),
			pitch: MathUtils.radToDeg(euler.y),
			yaw: MathUtils.radToDeg(euler.z),
		}
	}

	toVector3(vector3 = new Vector3()) {
		vector3.set(this.x, this.y, this.z)
		return vector3
	}

	toObject3D(object3D = new Object3D()) {
		this.toQuaternion(object3D.quaternion)
		this.toVector3(object3D.position)
		return object3D
	}
}
