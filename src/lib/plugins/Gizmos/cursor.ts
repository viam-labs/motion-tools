import { type Entity } from 'koota'
import { type Intersection, type Material, type Mesh, type Object3D, Vector3 } from 'three'

const isVisibleInTree = (object: Object3D): boolean => {
	let cursor: Object3D | null = object
	while (cursor) {
		if (cursor.visible === false) return false
		cursor = cursor.parent
	}

	return true
}

const isDiscardMaterial = (material: Material): boolean => {
	return (
		material.type === 'MeshDiscardMaterial' || material.constructor.name === 'MeshDiscardMaterial'
	)
}

const isInEntitySubtree = (object: Object3D, entity: Entity): boolean => {
	let cursor: Object3D | null = object
	while (cursor) {
		if ((cursor as unknown as { name: unknown }).name === entity) return true
		cursor = cursor.parent
	}

	return false
}

const isUsableHit = (hit: Intersection, ignoreEntity?: Entity): boolean => {
	if (ignoreEntity !== undefined && isInEntitySubtree(hit.object, ignoreEntity)) return false
	if (!isVisibleInTree(hit.object)) return false

	const material = (hit.object as Mesh).material as Material | Material[] | undefined
	if (!material) return true
	if (Array.isArray(material)) return material.some((m) => !isDiscardMaterial(m))

	return !isDiscardMaterial(material)
}

export const cursorPoint = (
	intersections: Intersection[],
	ignoreEntity?: Entity
): Vector3 | undefined => {
	const hit = intersections.find((i) => isUsableHit(i, ignoreEntity))
	if (!hit) return undefined

	return hit.point.clone()
}

export interface CursorHit {
	position: Vector3
	normal: Vector3
}

export const cursorHit = (
	intersections: Intersection[],
	ignoreEntity?: Entity
): CursorHit | undefined => {
	const hit = intersections.find((i) => isUsableHit(i, ignoreEntity))
	if (!hit) return undefined

	const position = hit.point.clone()
	const normal = hit.face
		? hit.face.normal.clone().transformDirection(hit.object.matrixWorld).normalize()
		: new Vector3(0, 0, 1)

	return { position, normal }
}
