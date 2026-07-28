import type { Entity } from 'koota'
import type { Matrix4 } from 'three'

import { traits, useWorld } from '$lib/ecs'

import { clearMoveGhosts, createMoveGhosts, syncMoveGhosts } from './moveGhosts'

/**
 * Keep a staged move's ghost entities in step with the drag, for as long as
 * both a root frame and a delta are live.
 *
 * Two things move a ghost. The delta itself, once per drag frame — that's the
 * gizmo. And a source's own `WorldMatrix`, when the robot keeps moving under a
 * still gizmo: the arm the gripper hangs off carries on streaming poses, and
 * the ghosts track it. Source changes are coalesced into a microtask, the same
 * shape the instanced renderers use, so a burst of pose updates syncs once.
 *
 * Ghosts are torn down when the drag ends, the panel closes, or the component
 * unmounts — `syncMoveGhosts` clears the set as soon as either input goes
 * away, so there is no separate "stop" to remember to call.
 */
export const useMoveGhosts = (
	root: () => Entity | undefined,
	delta: () => Matrix4 | undefined
): void => {
	const world = useWorld()
	const ghosts = createMoveGhosts()

	$effect(() => {
		syncMoveGhosts(world, root(), delta(), ghosts)
	})

	$effect(() => {
		let scheduled = false

		const unsubscribe = world.onChange(traits.WorldMatrix, (entity) => {
			// Ghosts write their own `WorldMatrix` in the sync below; only a source
			// moving is worth a resync.
			// `ghosts` is keyed by source entity; a ghost updating its own WorldMatrix
			// is not a key, so this guard filters out self-triggered updates.
			if (scheduled || !ghosts.has(entity)) return
			scheduled = true
			queueMicrotask(() => {
				scheduled = false
				syncMoveGhosts(world, root(), delta(), ghosts)
			})
		})

		return () => {
			unsubscribe()
			clearMoveGhosts(ghosts)
		}
	})
}
