/**
 * The scene a previewed plan is drawn as: a ghost twin of every frame the plan touches, laid over
 * the live machine rather than replacing it. The twin is the point — the arm on screen is not
 * moving, and a preview that animated the real frames would say the opposite.
 *
 * Like `moveGhosts`, these are display-only entities the scene's existing renderers pick up, and
 * like those they carry **no `Name` and no `ChildOf`**. That is load-bearing here rather than
 * merely tidy: `resolveOrphans` indexes parents by name, so a ghost named `left-arm` could capture
 * the live `left-cam`'s `ChildOf` — or lose its own children to the live arm — depending on query
 * order. Staying out of the hierarchy makes the question moot, at the price of composing the chain
 * ourselves (`$lib/motion/forwardKinematics`).
 *
 * The set is spawned once per plan and only its matrices are rewritten as the user scrubs.
 */

import { type ConfigurableTrait, type Entity, type World } from 'koota'
import { Color, Matrix4 } from 'three'

import type { FrameDescriptor } from '$lib/motion/frameDescriptors'
import type { TrajectoryStep } from '$lib/motion/jointPose'

import { traits } from '$lib/ecs'

import { MOVE_GHOST_COLOR } from './moveGhostColor'
import { previewComponentName, PreviewOf } from './traits'

/**
 * Lower than the staged-goal ghost's 0.5. The two are on screen together — a whole ghosted machine
 * behind the single ghosted subtree at the goal — and the goal is the thing being decided on.
 */
const PREVIEW_OPACITY = 0.35

/** Matches `moveGhosts`: `traits.Color` is read back through `Color.setRGB`, which does not convert. */
const ghostColor = new Color(MOVE_GHOST_COLOR)

/** Ghost entities, keyed by the frame name whose world matrix drives each one. */
export type PreviewGhosts = Map<string, Entity>

export const createPreviewGhosts = (): PreviewGhosts => new Map()

/**
 * The components whose joint values actually change over the plan.
 *
 * RDK answers with a column for every component in the frame system, not just the ones it moved — a
 * component the plan holds still carries its current configuration, repeated byte-identically in
 * every step. Exact equality is the right test for that: any difference at all means the planner put
 * motion there, however small, and a component that moves a hair is still moving.
 *
 * A component named in only some steps counts as moving, because appearing or vanishing is itself a
 * change.
 */
export const movingComponents = (trajectory: readonly TrajectoryStep[]): Set<string> => {
	const moving = new Set<string>()
	const [first] = trajectory
	if (!first) return moving

	for (const [component, values] of Object.entries(first)) {
		const changes = trajectory.some((step) => {
			const other = step[component]
			return (
				other === undefined ||
				other.length !== values.length ||
				values.some((value, index) => value !== other[index])
			)
		})
		if (changes) moving.add(component)
	}

	// A component absent from step 0 but present later is moving by the same argument.
	for (const step of trajectory) {
		for (const component of Object.keys(step)) {
			if (!(component in first)) moving.add(component)
		}
	}

	return moving
}

/**
 * Whether a joint that *this plan actually moves* sits anywhere above this frame.
 *
 * The parent-chain walk is what keeps a mounted gripper: it owns no column of its own, but the arm
 * joints above it do, so it rides along and must be ghosted. What the walk alone could not tell is
 * that a second arm the plan holds still is not moving either — its links do sit under joints, so
 * the earlier "is there any joint above me" rule ghosted all of them, laying a translucent copy over
 * a live arm for the whole of playback. That is the same failure that rules scenery out, arriving by
 * a different route, so the joint has to be one whose component changes.
 *
 * Memoized because a chain is walked once per frame hanging off it, and the answer for a link is
 * the answer for its parent. Writing `false` before recursing doubles as the cycle guard, so no
 * depth counter is needed: a loop cannot reach a joint, which makes `false` its right answer too.
 */
const drivenByMovingJoint = (
	name: string,
	byName: ReadonlyMap<string, FrameDescriptor>,
	moving: ReadonlySet<string>,
	memo: Map<string, boolean>
): boolean => {
	const cached = memo.get(name)
	if (cached !== undefined) return cached
	memo.set(name, false)

	const descriptor = byName.get(name)
	// A joint whose component is held still is not the end of the walk: an ancestor may still move,
	// which is exactly the gripper-on-a-moving-arm case.
	const driven =
		descriptor !== undefined &&
		((descriptor.kind === 'joint' && moving.has(descriptor.componentName)) ||
			drivenByMovingJoint(descriptor.parent, byName, moving, memo))

	memo.set(name, driven)
	return driven
}

/**
 * Frame names the user has hidden, by way of the live entity that carries the name.
 *
 * Ghosts are built from descriptors and carry no `ChildOf`, so `InheritedInvisible` — which the
 * hierarchy cascade maintains — can never reach them on its own. Without this they come back from
 * behind a `/` focus at 0.35 opacity and re-enter `collectMembers`, re-reporting the very pairs the
 * user hid to silence. `moveGhosts` and the collision layer both already treat hiding as "do not
 * consider this"; this keeps the preview saying the same thing.
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
 * Fills `ghosts` in place, the way `syncMoveGhosts` does, and for the same reason: the caller holds
 * the only handle it will ever tear down by. Returning a fresh map instead let a caller that spawned
 * after an `await` leave its teardown pointed at the map it held *before* — entities in a world that
 * outlives the panel, carrying no `Name` for anything to find them by again.
 *
 * Three things are skipped, for different reasons.
 *
 * Frames with no geometry, because a ghost of one would be an axes triad. `moveGhosts` does the
 * opposite and is right to: there the bare frame is the one the user selected and dragged, so its
 * pose is the whole subject. Here every joint and mount in the chain would qualify — on the
 * reference dual-arm rig, dozens of triads for a dozen visible shapes.
 *
 * Frames this plan does not move, because a ghost of one is a translucent copy laid exactly on the
 * original for the whole of playback: both walls, the ceiling, the table and both cameras on that
 * same rig, and — until the rule accounted for it — the entire second arm, which has joints but is
 * held still. They z-fight with what they duplicate, they add colliders that can only ever report
 * touching themselves, and they say a plan moves something it does not. The test walks the parent
 * chain rather than reading which components the trajectory names, because a gripper bolted to an
 * arm moves without having a column of its own and dropping it would be the worse error; it asks for
 * a *moving* joint rather than any joint, which is what separates that gripper from the idle arm
 * across the table.
 *
 * Frames the user has hidden, because hiding is a statement that this geometry should not be
 * considered — the same one `moveGhosts` and the collision layer already honour.
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
		if (descriptor.kind !== 'static' || !descriptor.geometry) continue
		if (hidden.has(descriptor.name)) continue
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
