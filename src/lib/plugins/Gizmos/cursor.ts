import { type Entity } from 'koota'
import {
	type Intersection,
	type Material,
	type Mesh,
	type Object3D,
	Plane,
	type Raycaster,
	Vector3,
} from 'three'

/**
 * Ground plane at z = 0 used as a fallback when the raycaster doesn't hit
 * any usable scene geometry.
 */
const groundPlane = new Plane(new Vector3(0, 0, 1), 0)

const isVisibleInTree = (object: Object3D): boolean => {
	let cursor: Object3D | null = object
	while (cursor) {
		if (cursor.visible === false) return false
		cursor = cursor.parent
	}
	return true
}

/**
 * Heuristic for "this hit is not a real surface."
 *
 * - `MeshDiscardMaterial` is used as an invisible click target (e.g.
 *   `PointerMissBox` wraps the scene in a 1km box so navigate-mode clicks can
 *   clear the selection). Three.js raycasts against it regardless of whether
 *   it renders, so without this filter the gizmo cursor snaps onto the inside
 *   face of that box at ±500m.
 */
const isDiscardMaterial = (material: Material): boolean => {
	return (
		material.type === 'MeshDiscardMaterial' || material.constructor.name === 'MeshDiscardMaterial'
	)
}

/**
 * Renderers set `mesh.name = entity` (where entity is the numeric koota ID).
 * Three.js types `name` as `string`, but at runtime it's whatever was passed,
 * so this walks up the parent chain and compares loosely.
 */
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

/**
 * Resolve the cursor's world-space point: returns the first usable
 * scene-intersection point if any, else the ray's intersection with the
 * z = 0 ground plane, else `undefined` (only when the ray is parallel to and
 * not on the plane — rare with a near-horizontal camera).
 *
 * Pass `ignoreEntity` to exclude an in-flight pending entity's own mesh from
 * the hit list — otherwise the pending line/arrow can self-intersect the ray
 * and snap the cursor onto itself.
 */
export const cursorPoint = (
	raycaster: Raycaster,
	intersections: Intersection[],
	ignoreEntity?: Entity
): Vector3 | undefined => {
	const hit = intersections.find((i) => isUsableHit(i, ignoreEntity))
	if (hit) return hit.point.clone()
	const groundHit = raycaster.ray.intersectPlane(groundPlane, new Vector3())
	return groundHit ?? undefined
}
