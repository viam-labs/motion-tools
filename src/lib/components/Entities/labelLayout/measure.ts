/**
 * Reads a label's on-screen geometry from the DOM. This is the only place that
 * forces layout (getBoundingClientRect / getComputedStyle), and the engine calls
 * it for every node in one batch at the top of a solve — all reads before any
 * writes — so the per-frame read/write thrash of the old engine is gone.
 */

import type { LabelNode } from './types'

/** CSS size of the dot (`.dot` is Tailwind `h-2 w-2` = 8px); used only as a scale fallback. */
const DOT_CSS_FALLBACK = 8

/**
 * Refresh `node`'s anchor, size, and scale from the DOM.
 * Returns false if the label isn't measurable yet (detached or not laid out),
 * in which case the caller skips it this solve and retries.
 */
export function measureNode(node: LabelNode): boolean {
	if (!node.labelEl.isConnected) return false

	const dot = node.dotEl.getBoundingClientRect()
	const text = node.textEl.getBoundingClientRect()
	if (dot.width === 0 || text.width === 0) return false

	const dotCenterX = dot.left + dot.width / 2
	const dotCenterY = dot.top + dot.height / 2

	node.ax = dotCenterX
	node.ay = dotCenterY
	node.dotR = dot.width / 2
	node.w = text.width
	node.h = text.height

	if (node.cssDotW === 0) {
		node.cssDotW = Number.parseFloat(getComputedStyle(node.dotEl).width) || DOT_CSS_FALLBACK
	}
	const s = dot.width / node.cssDotW
	node.scale = Number.isFinite(s) && s > 1e-4 ? s : 1

	// The dot's center relative to the island origin (the 0x0 `.label` box placed
	// at the projected 3D point) is a fixed CSS layout offset — measure it once so
	// the leader line starts at the dot wherever the dot's CSS positions it.
	if (Number.isNaN(node.dotLocalX)) {
		const island = node.labelEl.getBoundingClientRect()
		node.dotLocalX = (dotCenterX - island.left) / node.scale
		node.dotLocalY = (dotCenterY - island.top) / node.scale
	}

	return true
}
