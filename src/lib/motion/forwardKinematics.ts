/**
 * Forward kinematics for consumers outside the ECS world-matrix system. Composition is
 * `world = parent * local`, root-most first, the order RDK's frame system accumulates in.
 */

import { Matrix4 } from 'three'

import type { FrameDescriptor } from './frameDescriptors'
import type { TrajectoryStep } from './jointPose'

import { descriptorLocalPose } from './jointPose'

export type ForwardKinematics = (stepInputs: TrajectoryStep) => Map<string, Matrix4>

/**
 * Binds a frame chain so it can be evaluated per step. The returned map and its matrices are reused
 * and rewritten on every call: read them, or copy out of them, before evaluating the next step.
 */
export const createForwardKinematics = (
	descriptors: readonly FrameDescriptor[]
): ForwardKinematics => {
	const byName = new Map(descriptors.map((descriptor) => [descriptor.name, descriptor]))
	const worldMatrices = new Map<string, Matrix4>()

	// Cleared per step. Membership, not presence in `worldMatrices`, is what makes a matrix current:
	// the instances are reused across steps, so a stale one is indistinguishable from a fresh one.
	const resolved = new Set<string>()

	// Names on the current recursion stack. Cleared per step because a throw out of `resolve` does not
	// unwind it, and every name stranded that way would read as a cycle on every later step.
	const visiting = new Set<string>()

	/** Cycle edges already reported, so a broken chain warns once rather than once per rendered frame. */
	const warned = new Set<string>()

	const resolve = (
		name: string,
		stepInputs: TrajectoryStep,
		child?: string
	): Matrix4 | undefined => {
		if (resolved.has(name)) return worldMatrices.get(name)

		// A parent with no descriptor roots the subtree instead of dropping it. RDK refuses such a frame
		// system outright (`AddFrame` returns `NewFrameMissingError`); a viewer shows more by drawing it.
		const descriptor = byName.get(name)
		if (!descriptor) return undefined

		// The rooted frame is `child`, not `name`: `name` is already resolving further up the stack, so
		// it is the edge into it that gets cut.
		if (visiting.has(name)) {
			const edge = `${child ?? '?'} -> ${name}`
			if (!warned.has(edge)) {
				warned.add(edge)
				console.warn(
					`[motion] cycle in the frame chain: "${child}" is parented to "${name}", which is already resolving through it — rooting "${child}"`
				)
			}
			return undefined
		}

		visiting.add(name)
		const parentMatrix = resolve(descriptor.parent, stepInputs, name)
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
