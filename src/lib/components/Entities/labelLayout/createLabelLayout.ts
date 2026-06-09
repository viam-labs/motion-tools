/**
 * The label layout engine. Owns node lifecycle and the per-frame pipeline:
 * a cheap dirty gate, then (only when dirty) measure → build neighbourhood →
 * warm-start → solve → handle teleports, and every animating frame ease toward
 * the solved targets and write them to the DOM. It idles (no work, no
 * invalidate) once the camera is still and every label has settled.
 */

import type { Camera } from 'three'

import type { LabelStore } from './labelStore.svelte'

import { applyTeleports } from './applyTeleports'
import { buildNeighborhood } from './buildNeighborhood'
import { cameraMatrixHash } from './cameraHash'
import { measureNode } from './measure'
import { generateSlots, hashString } from './slots'
import { solve } from './solve'
import { SpatialHash } from './spatialHash'
import { defaultSolverConfig, type LabelNode, type SolverConfig } from './types'
import { lerpStep, writeBack } from './writeBack'

export interface LayoutDeps {
	camera: { current: Camera }
	size: { current: { width: number; height: number } }
	invalidate: () => void
	labels: LabelStore
	config?: Partial<SolverConfig>
}

/** Clamp the frame delta so a long idle gap can't make the ease overshoot. */
const MAX_DELTA = 0.05

/** Frames to keep retrying a failed measure after a real change before giving up (idle). */
const MAX_RETRY = 4

export function createLabelLayout(deps: LayoutDeps) {
	const config: SolverConfig = { ...defaultSolverConfig, ...deps.config }

	const nodesByLabel = new WeakMap<HTMLElement, LabelNode>()
	const grid = new SpatialHash()

	let activeNodes: LabelNode[] = []
	let bestSnap = new Int16Array(0)

	let lastCamHash = -1
	let lastSetVersion = -1
	let pendingRetry = false
	let retryBudget = 0
	let animating = false

	function ensureNode(labelEl: HTMLElement): LabelNode | null {
		const existing = nodesByLabel.get(labelEl)
		if (existing) return existing

		const textEl = labelEl.querySelector<HTMLElement>('.text')
		const dotEl = labelEl.querySelector<HTMLElement>('.dot')
		const lineEl = labelEl.querySelector<SVGLineElement>('.link line')
		if (!textEl || !dotEl || !lineEl) return null

		textEl.style.willChange = 'transform'

		const id = crypto.randomUUID()
		const node: LabelNode = {
			id,
			idHash: hashString(id),
			ax: 0,
			ay: 0,
			dotR: 0,
			w: 0,
			h: 0,
			scale: 1,
			cssDotW: 0,
			dotLocalX: Number.NaN,
			dotLocalY: Number.NaN,
			slots: [],
			geomKey: '',
			crowded: false,
			slotIndex: -1,
			prevSlotIndex: -1,
			cx: Number.NaN,
			cy: Number.NaN,
			tx: 0,
			ty: 0,
			settled: false,
			conflict: 0,
			locked: false,
			centroidX: 0,
			centroidY: 0,
			prevAx: Number.NaN,
			prevAy: Number.NaN,
			neighbors: [],
			labelEl,
			textEl,
			dotEl,
			lineEl,
		}
		nodesByLabel.set(labelEl, node)
		return node
	}

	function geomKey(node: LabelNode): string {
		return `${Math.round(node.w)}_${Math.round(node.h)}_${Math.round(node.dotR)}`
	}

	function nearestSlot(node: LabelNode): number {
		let best = 0
		let bestDist = Number.POSITIVE_INFINITY
		for (let i = 0; i < node.slots.length; i++) {
			const sx = node.ax + node.slots[i].dx
			const sy = node.ay + node.slots[i].dy
			const d = (sx - node.cx) ** 2 + (sy - node.cy) ** 2
			if (d < bestDist) {
				bestDist = d
				best = i
			}
		}
		return best
	}

	function solveLayout(width: number, height: number) {
		pendingRetry = false
		activeNodes = []

		for (const el of deps.labels.current) {
			// Skip detached or hidden islands (e.g. <HTML> sets display:none when an
			// entity is behind the camera) without arming a retry — they have no
			// client rects, and treating them as "not ready" would pin the
			// on-demand loop re-solving every frame.
			if (!el.isConnected || el.getClientRects().length === 0) continue
			const node = ensureNode(el)
			if (!node) {
				pendingRetry = true
				continue
			}
			if (measureNode(node)) activeNodes.push(node)
			else pendingRetry = true
		}

		const nodes = activeNodes
		const n = nodes.length
		if (n === 0) return

		buildNeighborhood(grid, nodes, config)

		// Crowding (post-symmetrisation) drives adaptive slot density.
		for (const node of nodes) {
			const crowded = node.neighbors.length > config.crowdedThreshold
			const key = geomKey(node)
			if (key !== node.geomKey || crowded !== node.crowded) {
				node.slots = generateSlots(node, crowded, config)
				node.geomKey = key
				node.crowded = crowded
				node.slotIndex = -1
			}
		}

		// Local cluster centroid for the outward-fan term.
		for (const node of nodes) {
			let sx = node.ax
			let sy = node.ay
			for (const m of node.neighbors) {
				sx += m.ax
				sy += m.ay
			}
			const count = node.neighbors.length + 1
			node.centroidX = sx / count
			node.centroidY = sy / count
		}

		// Warm-start: fresh nodes start near their dot, then snap onto the lattice.
		for (const node of nodes) {
			if (Number.isNaN(node.cx)) {
				node.cx = node.ax + (node.w / 2 + node.dotR + config.dotPadding)
				node.cy = node.ay
			}
			if (node.slotIndex < 0 || node.slotIndex >= node.slots.length) {
				node.slotIndex = nearestSlot(node)
			}
		}

		if (bestSnap.length < n) bestSnap = new Int16Array(n)
		solve(nodes, config, bestSnap)

		// A big camera jump (or a brand-new node) snaps labels to their solved
		// target; everything else eases there from its current position.
		applyTeleports(nodes, width, height, config)
	}

	function frame(delta: number) {
		const { width, height } = deps.size.current
		const camHash = cameraMatrixHash(deps.camera.current, width, height)
		const setVersion = deps.labels.version

		// A real change (camera/label-set) re-arms the retry window; pendingRetry can
		// then drive a few more solves for genuinely-transient unmeasurable labels
		// (first paint) without spinning forever on a persistently-unmeasurable one.
		const changed = camHash !== lastCamHash || setVersion !== lastSetVersion
		if (changed) retryBudget = MAX_RETRY
		const retrying = pendingRetry && retryBudget > 0 && !changed
		if (retrying) retryBudget--
		const dirty = changed || retrying

		if (dirty) {
			solveLayout(width, height)
			lastCamHash = camHash
			lastSetVersion = setVersion
		}

		if (!dirty && !animating) return

		const dt = Math.min(delta, MAX_DELTA)
		let moving = false
		for (const node of activeNodes) {
			if (lerpStep(node, dt, config.settleEps)) moving = true
			writeBack(node)
		}
		animating = moving

		deps.invalidate()
	}

	return { frame }
}
