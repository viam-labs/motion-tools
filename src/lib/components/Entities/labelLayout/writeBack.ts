/**
 * Per-frame animation and DOM write-back. The solver produces a target box
 * center; the animated center eases toward it (framerate-independent), and the
 * eased position is written to the label as a scale-corrected local transform
 * plus leader-line endpoints — the same coordinate handling the old engine used.
 */

import type { LabelNode } from './types'

/** Easing time constant (seconds): ~3-4 frames to arrive at 60fps. */
const TAU = 0.08

/**
 * Ease `node`'s animated center toward its target. Returns true while still
 * moving, false once arrived (and snapped). `delta` is seconds, pre-clamped by
 * the engine so a long idle gap can't produce an overshoot.
 */
export function lerpStep(node: LabelNode, delta: number, settleEps: number): boolean {
	const dx = node.tx - node.cx
	const dy = node.ty - node.cy
	if (dx * dx + dy * dy <= settleEps * settleEps) {
		node.cx = node.tx
		node.cy = node.ty
		node.settled = true
		return false
	}
	const alpha = 1 - Math.exp(-delta / TAU)
	node.cx += dx * alpha
	node.cy += dy * alpha
	node.settled = false
	return true
}

/**
 * Write the eased position to the DOM. The label island is positioned at the dot
 * by Threlte's <HTML>, so we work in island-local px: convert the viewport-space
 * offset by the island's CSS scale, place the text box, and draw the leader from
 * the dot's island-local position to the box center.
 */
export const writeBack = (node: LabelNode): void => {
	const inv = 1 / node.scale
	// Box-center offset from the dot, in island-local px.
	const dx = (node.cx - node.ax) * inv
	const dy = (node.cy - node.ay) * inv
	const wL = node.w * inv
	const hL = node.h * inv

	// The dot may not sit at the island origin, so anchor everything at the dot's
	// measured local position rather than assuming (0, 0).
	const ox = node.dotLocalX
	const oy = node.dotLocalY

	node.textEl.style.transform = `translate(${ox + dx - wL / 2}px, ${oy + dy - hL / 2}px)`
	node.lineEl.setAttribute('x1', `${ox}`)
	node.lineEl.setAttribute('y1', `${oy}`)
	node.lineEl.setAttribute('x2', `${ox + dx}`)
	node.lineEl.setAttribute('y2', `${oy + dy}`)
}
