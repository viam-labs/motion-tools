import { Vector3 } from 'three'

/** Shared grid step (meters) for measure/place/edit snapping. */
export const GRID_SNAP_STEP = 0.1

/**
 * Snap a position to a uniform grid of `step` meters on each axis.
 * `step` must be > 0; callers are expected to gate this behind a snap toggle.
 */
export const quantize = (point: Vector3, step: number): Vector3 =>
	new Vector3(
		Math.round(point.x / step) * step,
		Math.round(point.y / step) * step,
		Math.round(point.z / step) * step
	)
