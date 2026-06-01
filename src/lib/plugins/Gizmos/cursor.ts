import { type Entity } from 'koota'
import { type Intersection, type Object3D, Vector3 } from 'three'

export const isUsableHit = (hit: Intersection, ignoreEntity?: Entity) => {
	if (ignoreEntity !== undefined && isInEntitySubtree(hit.object, ignoreEntity)) return false
	return isVisibleInTree(hit.object)
}

export const cursorPoint = (intersections: Intersection[], ignoreEntity?: Entity) => {
	const hit = intersections.find((i) => isUsableHit(i, ignoreEntity))
	if (!hit) return undefined

	return hit.point.clone()
}

export const cursorHit = (intersections: Intersection[], ignoreEntity?: Entity) => {
	const hit = intersections.find((i) => isUsableHit(i, ignoreEntity))
	if (!hit) return undefined

	const position = hit.point.clone()
	const normal = hit.face
		? hit.face.normal.clone().transformDirection(hit.object.matrixWorld).normalize()
		: new Vector3(0, 0, 1)

	return { position, normal }
}

const isVisibleInTree = (object: Object3D) => {
	let cursor: Object3D | null = object
	while (cursor) {
		if (cursor.visible === false) return false
		cursor = cursor.parent
	}

	return true
}

const isInEntitySubtree = (object: Object3D, entity: Entity) => {
	let cursor: Object3D | null = object
	while (cursor) {
		if ((cursor.name as unknown) === entity) return true
		cursor = cursor.parent
	}

	return false
}
