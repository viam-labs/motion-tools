/**
 * Reads a label's on-screen geometry from the DOM. This is the only place that
 * forces layout (getBoundingClientRect / getComputedStyle), and the engine calls
 * it for every node in one batch at the top of a solve — all reads before any
 * writes — so the per-frame read/write thrash of the old engine is gone.
 */

import type { LabelNode } from './types'

/** CSS size of the dot (`.dot` is Tailwind `h-2 w-2` = 8px); used only as a scale fallback. */
const DOT_CSS_FALLBACK = 8

function estimateScale(node: LabelNode, renderedWidth: number): number {
	if (node.cssDotW === 0) {
		node.cssDotW = Number.parseFloat(getComputedStyle(node.dotEl).width) || DOT_CSS_FALLBACK
	}
	const s = renderedWidth / node.cssDotW
	return Number.isFinite(s) && s > 1e-4 ? s : 1
}

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

	node.ax = dot.left + dot.width / 2
	node.ay = dot.top + dot.height / 2
	node.dotR = dot.width / 2
	node.w = text.width
	node.h = text.height
	node.scale = estimateScale(node, dot.width)
	return true
}
