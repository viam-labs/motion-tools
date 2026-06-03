import { useWorld } from './useWorld'
import { installWorldMatrixListeners } from './worldMatrix'

/**
 * Mount the world-matrix reactor: keeps `WorldMatrix` in sync with the
 * cumulative `parent.WorldMatrix × local rendered` for every entity whose
 * `Matrix` / `EditedMatrix` / `LiveMatrix` / `Scale` / `ChildOf` changes.
 * Microtask-deferred so a burst of changes (e.g. one `useFrames` reconcile
 * tick) coalesces into a single subtree walk.
 */
export const provideWorldMatrix = (): void => {
	const world = useWorld()
	$effect(() => installWorldMatrixListeners(world))
}
