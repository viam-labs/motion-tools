import { Vector3 } from 'three'

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
