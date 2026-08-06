/**
 * Forward kinematics for a whole frame system at one trajectory step.
 *
 * The plan replayer never needs this: it emits one `Transform` per frame relative to its parent and
 * lets the ECS world-matrix system chain them. Preview ghosts deliberately stay out of that system
 * — they carry no `Name` and no `ChildOf`, so nothing composes their parents for them (see
 * `MoveFrame/previewGhosts.ts`) — which leaves the composition here.
 *
 * The trade is worth it in the other direction too: the ghost set is spawned once and only its
 * matrices are rewritten as the user scrubs, where the replayer respawns entities every step.
 */

import { Matrix4 } from 'three'

import type { FrameDescriptor } from './frameDescriptors'
import type { TrajectoryStep } from './jointPose'

import { descriptorLocalPose } from './jointPose'

export type ForwardKinematics = (stepInputs: TrajectoryStep) => Map<string, Matrix4>

/**
 * Binds a frame chain so it can be evaluated per step. The returned map is **reused and rewritten**
 * on every call — read it, or copy out of it, before evaluating the next step.
 *
 * A parent that never produced a descriptor (`world`, or a frame the builder dropped as unhandled)
 * resolves to identity, which puts its subtree at the scene root rather than losing it.
 */
export const createForwardKinematics = (descriptors: FrameDescriptor[]): ForwardKinematics => {
	const byName = new Map(descriptors.map((descriptor) => [descriptor.name, descriptor]))
	const worldMatrices = new Map<string, Matrix4>()

	// Cleared per step. Membership, not presence in `worldMatrices`, is what makes a matrix current:
	// the instances are reused across steps, so a stale one is indistinguishable from a fresh one.
	const resolved = new Set<string>()
	const visiting = new Set<string>()

	const resolve = (name: string, stepInputs: TrajectoryStep): Matrix4 | undefined => {
		if (resolved.has(name)) return worldMatrices.get(name)

		const descriptor = byName.get(name)
		if (!descriptor) return undefined

		// A `ChildOf` cycle would recurse forever. RDK will not emit one, but this chain is
		// reconstructed from two independent maps and a bad `parents` entry is cheap to survive.
		if (visiting.has(name)) {
			console.warn(`[motion] cycle through "${name}" in the frame chain — treating it as a root`)
			return undefined
		}

		visiting.add(name)
		const parentMatrix = resolve(descriptor.parent, stepInputs)
		visiting.delete(name)

		let matrix = worldMatrices.get(name)
		if (!matrix) {
			matrix = new Matrix4()
			worldMatrices.set(name, matrix)
		}

		descriptorLocalPose(descriptor, stepInputs).toMatrix4(matrix)
		if (parentMatrix) matrix.premultiply(parentMatrix)

		resolved.add(name)
		return matrix
	}

	return (stepInputs) => {
		resolved.clear()
		visiting.clear()
		for (const name of byName.keys()) resolve(name, stepInputs)
		return worldMatrices
	}
}
