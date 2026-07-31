import type { Entity } from 'koota'

import { Matrix4, Quaternion, Vector3 } from 'three'

import { traits } from '$lib/ecs'
import { Pose } from '$lib/math'

const MM_TO_M = 0.001

/**
 * Rapier's capsule runs along Y; this scene renders capsules along Z (see
 * `composeCapsuleMatrices`). Colliders take this as a local correction so the
 * two agree.
 */
const Y_TO_Z = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), Math.PI / 2)

const tempPose = new Pose()
const centerMatrix = new Matrix4()
const poseMatrix = new Matrix4()
const scratchScale = new Vector3()

/**
 * A Rapier collider shape in metres, derived from an entity's geometry trait.
 * Kept as plain data rather than a `ColliderDesc` so shape derivation is
 * testable without loading Rapier's WASM.
 */
export type ColliderShape =
	| { kind: 'cuboid'; hx: number; hy: number; hz: number }
	| { kind: 'ball'; radius: number }
	| { kind: 'capsule'; halfHeight: number; radius: number }

/**
 * The collider shape for an entity, or `undefined` when it carries no
 * collidable primitive.
 *
 * Only `Box`, `Capsule` and `Sphere` participate — Viam's collider primitives.
 * Meshes and point clouds are deliberately excluded: Rapier's trimesh-vs-trimesh
 * case produces no contacts, so including them would look supported while
 * silently reporting nothing.
 *
 * Degenerate geometry returns `undefined`; Rapier rejects zero-extent shapes,
 * and a collider with no size can't collide with anything anyway.
 */
export const colliderShapeFor = (entity: Entity): ColliderShape | undefined => {
	const box = entity.get(traits.Box)
	if (box) {
		if (box.x <= 0 || box.y <= 0 || box.z <= 0) return undefined
		return {
			kind: 'cuboid',
			hx: (box.x * MM_TO_M) / 2,
			hy: (box.y * MM_TO_M) / 2,
			hz: (box.z * MM_TO_M) / 2,
		}
	}

	const sphere = entity.get(traits.Sphere)
	if (sphere) {
		if (sphere.r <= 0) return undefined
		return { kind: 'ball', radius: sphere.r * MM_TO_M }
	}

	const capsule = entity.get(traits.Capsule)
	if (capsule) {
		if (capsule.r <= 0) return undefined
		const radius = capsule.r * MM_TO_M
		// Viam's `l` is the total length *including* both caps, so the cylindrical
		// midsection Rapier wants is `l - 2r`. At or below that the capsule is a
		// sphere, which is what the renderer draws too.
		const midsection = capsule.l * MM_TO_M - 2 * radius
		if (midsection <= 0) return { kind: 'ball', radius }
		return { kind: 'capsule', halfHeight: midsection / 2, radius }
	}

	return undefined
}

/**
 * Write an entity's collider pose — `WorldMatrix × Center` — into `position`
 * and `quaternion`, applying the capsule axis correction when needed.
 *
 * Returns `false` and leaves both untouched when the entity has no
 * `WorldMatrix`. Any scale on the world matrix is discarded: collider extents
 * come from the geometry trait, so honouring it would double-count.
 */
export const composeColliderPose = (
	entity: Entity,
	shape: ColliderShape,
	position: Vector3,
	quaternion: Quaternion
): boolean => {
	const worldMatrix = entity.get(traits.WorldMatrix)
	if (!worldMatrix) return false

	poseMatrix.copy(worldMatrix)

	const center = entity.get(traits.Center)
	if (center) {
		poseMatrix.multiply(tempPose.copy(center).toMatrix4(centerMatrix))
	}

	poseMatrix.decompose(position, quaternion, scratchScale)

	if (shape.kind === 'capsule') {
		quaternion.multiply(Y_TO_Z)
	}

	return true
}
