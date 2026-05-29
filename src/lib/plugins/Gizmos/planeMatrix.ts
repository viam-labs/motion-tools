import { Matrix4, Quaternion, Vector3 } from 'three'

import type { PlaneAxis } from './useGizmosPlugin.svelte'

const tempQuat = new Quaternion()
const xAxis = new Vector3(1, 0, 0)
const yAxis = new Vector3(0, 1, 0)

export const planeMatrix = (axis: PlaneAxis, position: Vector3): Matrix4 => {
	if (axis === 'yz') tempQuat.setFromAxisAngle(yAxis, Math.PI / 2)
	else if (axis === 'xz') tempQuat.setFromAxisAngle(xAxis, -Math.PI / 2)
	else tempQuat.identity()
	return new Matrix4().compose(position, tempQuat, new Vector3(1, 1, 1))
}
