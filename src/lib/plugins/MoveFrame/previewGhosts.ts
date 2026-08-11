/**
 * A previewed plan drawn as a ghost twin of every frame it moves, laid over the live machine rather
 * than replacing it: the real arm is not moving, and animating its frames would say otherwise.
 */

import { type ConfigurableTrait, type Entity, type World } from 'koota'
import { Color, Matrix4 } from 'three'

import type { FrameDescriptor } from '$lib/motion/frameDescriptors'
import type { TrajectoryStep } from '$lib/motion/jointPose'

import { traits } from '$lib/ecs'

import { MOVE_GHOST_COLOR } from './moveGhostColor'
import { previewComponentName, PreviewOf } from './traits'

/**
 * Lower than the staged-goal ghost's 0.5: the two are on screen together, a whole ghosted machine
 * behind the single ghosted subtree at the goal, and the goal is the thing being decided on.
 */
const PREVIEW_OPACITY = 0.35

/** Matches `moveGhosts`: `traits.Color` is read back through `Color.setRGB`, which does not convert. */
const ghostColor = new Color(MOVE_GHOST_COLOR)

/** Ghost entities, keyed by the frame name whose world matrix drives each one. */
export type PreviewGhosts = Map<string, Entity>

export const createPreviewGhosts = (): PreviewGhosts => new Map()

/**
 * Three orders above the noise trajectory optimization leaves on a component the plan holds still
 * (up to 8.3e-10 rad in `salad-plan.json`), and below any prismatic slide worth ghosting.
 */
const MOTION_TOLERANCE = 1e-6

/**
 * The components whose joint values actually change over the plan. RDK answers with a column for
 * every component in the frame system, not just the ones it moved.
 */
export const movingComponents = (trajectory: readonly TrajectoryStep[]): Set<string> => {
	const moving = new Set<string>()
	const [first] = trajectory
	if (!first) return moving

	for (const [component, values] of Object.entries(first)) {
		const changes = trajectory.some((step) => {
			// `hasOwn`, not a plain index: a step that does not own the component reads through to
			// `Object.prototype`, where `toString` reads back as a function whose `.length` is a
			// valid DoF count.
			if (!Object.hasOwn(step, component)) return true

			const other = step[component]
			return (
				other.length !== values.length ||
				values.some((value, index) => Math.abs(value - other[index]) > MOTION_TOLERANCE)
			)
		})
		if (changes) moving.add(component)
	}

	// `hasOwn`, not `in`: `in` walks the prototype chain, so `'toString' in first` is true even when
	// no step names a `toString` component.
	for (const step of trajectory) {
		for (const component of Object.keys(step)) {
			if (!Object.hasOwn(first, component)) moving.add(component)
		}
	}

	return moving
}

/**
 * Whether a joint this plan actually moves sits anywhere above this frame. The walk is what keeps a
 * mounted gripper: it owns no column of its own, but the arm joints above it do.
 */
const drivenByMovingJoint = (
	name: string,
	byName: ReadonlyMap<string, FrameDescriptor>,
	moving: ReadonlySet<string>,
	memo: Map<string, boolean>
): boolean => {
	const cached = memo.get(name)
	if (cached !== undefined) return cached
	// Seeded before recursing, which doubles as the cycle guard: a loop cannot reach a joint, so
	// `false` is also its right answer.
	memo.set(name, false)

	const descriptor = byName.get(name)
	// A joint whose component is held still is not the end of the walk: an ancestor may still move,
	// as on a gripper bolted to a moving arm.
	const driven =
		descriptor !== undefined &&
		((descriptor.kind === 'joint' && moving.has(descriptor.componentName)) ||
			drivenByMovingJoint(descriptor.parent, byName, moving, memo))

	memo.set(name, driven)
	return driven
}

/**
 * Frame names the user has hidden, read off the live entity that carries the name. A ghost has no
 * `ChildOf`, so the `InheritedInvisible` cascade can never reach one on its own.
 */
const hiddenFrameNames = (world: World): Set<string> => {
	const hidden = new Set<string>()

	for (const entity of world.query(traits.Name)) {
		if (!entity.has(traits.Invisible) && !entity.has(traits.InheritedInvisible)) continue
		const name = entity.get(traits.Name)
		if (name !== undefined) hidden.add(name)
	}

	return hidden
}

/**
 * Fills `ghosts` in place, the way `syncMoveGhosts` does: the caller holds the only handle it will
 * ever tear down by, and a ghost carries no `Name` for anything to find it by again.
 */
export const spawnPreviewGhosts = (
	world: World,
	descriptors: FrameDescriptor[],
	trajectory: readonly TrajectoryStep[],
	ghosts: PreviewGhosts
): void => {
	clearPreviewGhosts(ghosts)

	const byName = new Map(descriptors.map((descriptor) => [descriptor.name, descriptor]))
	const moving = movingComponents(trajectory)
	const hidden = hiddenFrameNames(world)
	const memo = new Map<string, boolean>()

	for (const descriptor of descriptors) {
		// A ghost of a shapeless frame is an axes triad, and every joint and mount in the chain would
		// qualify. `moveGhosts` is right to do the opposite: there the bare frame is the whole subject.
		if (descriptor.kind !== 'static' || !descriptor.geometry) continue
		if (hidden.has(descriptor.name)) continue
		// A ghost of a frame the plan holds still is a copy laid exactly on the original for the whole
		// scrub: it z-fights with what it duplicates and collides only with itself.
		if (!drivenByMovingJoint(descriptor.parent, byName, moving, memo)) continue

		const shape: ConfigurableTrait[] = [traits.Geometry(descriptor.geometry)]

		const center = descriptor.geometry.center
		if (center) shape.push(traits.Center(center))

		ghosts.set(
			descriptor.name,
			world.spawn(
				PreviewOf(previewComponentName(descriptor.name)),
				traits.NonSelectable,
				traits.WorldMatrix(new Matrix4()),
				traits.Color({ r: ghostColor.r, g: ghostColor.g, b: ghostColor.b }),
				traits.Opacity(PREVIEW_OPACITY),
				...shape
			)
		)
	}
}

/**
 * Move the ghosts to one step of the plan. `worldMatrices` is the map
 * `createForwardKinematics` rewrites per step, so this copies out of it rather than holding it.
 */
export const applyPreviewStep = (
	ghosts: PreviewGhosts,
	worldMatrices: Map<string, Matrix4>
): void => {
	for (const [name, ghost] of ghosts) {
		if (!ghost.isAlive()) continue

		const source = worldMatrices.get(name)
		const target = ghost.get(traits.WorldMatrix)
		if (!source || !target) continue

		target.copy(source)
		ghost.changed(traits.WorldMatrix)
	}
}

/** Drop every ghost. Call when the preview is discarded or the panel unmounts. */
export const clearPreviewGhosts = (ghosts: PreviewGhosts): void => {
	for (const ghost of ghosts.values()) {
		if (ghost.isAlive()) ghost.destroy()
	}
	ghosts.clear()
}
