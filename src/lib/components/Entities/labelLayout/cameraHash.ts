/**
 * A cheap, exact change-signal for the camera. Hashing the view + projection
 * matrices (as raw float bits) plus the viewport size catches every pan, orbit,
 * dolly, zoom, resize, and perspective/orthographic swap with no epsilon to tune.
 * Computed every frame; the layout only re-solves when the hash changes.
 */

import type { Camera } from 'three'

const f32 = new Float32Array(1)
const i32 = new Int32Array(f32.buffer)

function bits(value: number): number {
	f32[0] = value
	return i32[0]
}

export function cameraMatrixHash(camera: Camera, width: number, height: number): number {
	camera.updateMatrixWorld()
	const view = camera.matrixWorldInverse.elements
	const proj = camera.projectionMatrix.elements

	let h = 2166136261 >>> 0
	for (let i = 0; i < 16; i++) h = Math.imul(h ^ bits(view[i]), 16777619) >>> 0
	for (let i = 0; i < 16; i++) h = Math.imul(h ^ bits(proj[i]), 16777619) >>> 0
	h = Math.imul(h ^ bits(width), 16777619) >>> 0
	h = Math.imul(h ^ bits(height), 16777619) >>> 0
	return h >>> 0
}
