import { Matrix4, Quaternion, Vector3 } from 'three'

import type { ArrowAxis, PlaneAxis } from './gizmos'

const quaternionUtil = new Quaternion()
const directionUtil = new Vector3()
const scaleUtil = new Vector3(1, 1, 1)
const xAxis = new Vector3(1, 0, 0)
const yAxis = new Vector3(0, 1, 0)
const zAxis = new Vector3(0, 0, 1)

export const arrowMatrix = (
	axis: ArrowAxis,
	position: Vector3,
	surfaceNormal: Vector3 | undefined
): Matrix4 => {
	let direction: Vector3
	if (axis === 'surface') direction = surfaceNormal ?? zAxis
	else if (axis === 'x') direction = xAxis
	else if (axis === 'z') direction = zAxis
	else direction = yAxis

	directionUtil.copy(direction).negate()
	quaternionUtil.setFromUnitVectors(yAxis, directionUtil)

	return new Matrix4().compose(position, quaternionUtil, scaleUtil)
}

export const planeMatrix = (axis: PlaneAxis, position: Vector3): Matrix4 => {
	if (axis === 'yz') quaternionUtil.setFromAxisAngle(yAxis, Math.PI / 2)
	else if (axis === 'xz') quaternionUtil.setFromAxisAngle(xAxis, -Math.PI / 2)
	else quaternionUtil.identity()
	return new Matrix4().compose(position, quaternionUtil, scaleUtil)
}
