/**
 * Forward kinematics for a whole frame system at one trajectory step.
 *
 * The plan replayer never needs this: it emits one `Transform` per frame relative to its parent and
 * lets the ECS world-matrix system chain them. The move panel's preview ghosts deliberately stay out
 * of that system — they carry no `Name` and no `ChildOf`, so nothing composes their parents for
 * them — which leaves the composition here. `usePreviewMove` is that consumer.
 *
 * The trade is worth it in the other direction too: the ghost set is spawned once and only its
 * matrices are rewritten as the user scrubs, where the replayer respawns entities every step.
 *
 * Composition is `world = parent * local`, which is what RDK does: its frame system walks leaf to
 * root accumulating `pose.Transformation(ret)` (`referenceframe/frame_system.go`), and
 * `DualQuaternion.Transformation` is `q * by`, so the product comes out root-most first. Three's
 * `premultiply` is the same order.
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
 * `descriptors` is snapshotted here, so adding to the array afterwards is ignored. Hence `readonly`:
 * the signature should say that rather than leave a caller to discover it.
 *
 * Two parents resolve to identity and they are not the same case. `world` is faithful: RDK's own
 * walk terminates when a frame has no parent entry, so world contributes nothing. A parent that
 * never produced a descriptor is a **deliberate divergence** — RDK refuses to build such a frame
 * system at all (`AddFrame` returns `NewFrameMissingError`), but this chain is reconstructed from
 * two independent maps, and putting an unparented subtree at the scene root shows more than dropping
 * it does.
 */
export const createForwardKinematics = (
	descriptors: readonly FrameDescriptor[]
): ForwardKinematics => {
	const byName = new Map(descriptors.map((descriptor) => [descriptor.name, descriptor]))
	const worldMatrices = new Map<string, Matrix4>()

	// Cleared per step. Membership, not presence in `worldMatrices`, is what makes a matrix current:
	// the instances are reused across steps, so a stale one is indistinguishable from a fresh one.
	const resolved = new Set<string>()

	// The names on the current recursion stack, which is how a cycle is recognised. The two ways this
	// gets emptied are not equally load-bearing, and it is worth saying which is which.
	//
	// `clear()` per step is required. `computeJointPose` throws on a malformed descriptor, and a
	// throw escapes `resolve` without unwinding, stranding every frame that was still on the stack
	// beneath it. Those frames would then read as cycles on every later step and stop resolving at
	// all, so one bad step would poison the whole scrub rather than just itself.
	//
	// `delete` below is *not* required: `resolved.add` fires on every completing path, so the
	// `resolved` check at the top short-circuits any finished name long before the cycle check sees
	// it, and the only names ever in this set are the live stack. Stripping it changes no matrix and
	// no warning across an exhaustive sweep of five-node parent shapes. It stays because it is what
	// makes this set mean "on the current stack" rather than "seen during this step" — without it the
	// cycle check is correct only by virtue of the check above it, which is a worse thing to leave
	// for the next reader than one redundant `Set` operation.
	const visiting = new Set<string>()

	/** Cycle edges already reported, so a broken chain warns once rather than once per rendered frame. */
	const warned = new Set<string>()

	const resolve = (
		name: string,
		stepInputs: TrajectoryStep,
		child?: string
	): Matrix4 | undefined => {
		if (resolved.has(name)) return worldMatrices.get(name)

		const descriptor = byName.get(name)
		if (!descriptor) return undefined

		// A `ChildOf` cycle would recurse forever. RDK will not emit one, but this chain is
		// reconstructed from two independent maps and a bad `parents` entry is cheap to survive.
		//
		// The frame that ends up rooted is `child`, not `name`: `name` is already part-way through
		// resolving further up the stack, so it is the edge into it that gets cut. Naming `name` read
		// as though the frame being composed through its own cycle were the root, which is the one
		// thing it is not. Warned once per edge rather than once per step, since a scrub redraws this
		// at frame rate.
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
