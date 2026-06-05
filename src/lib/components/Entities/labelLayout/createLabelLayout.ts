/**
 * The label layout engine. Owns node lifecycle and the per-frame pipeline:
 * a cheap dirty gate, then (only when dirty) measure → build neighbourhood →
 * warm-start → solve → handle teleports, and every animating frame ease toward
 * the solved targets and write them to the DOM. It idles (no work, no
 * invalidate) once the camera is still and every label has settled.
 */

import type { Camera } from 'three'

import { cameraMatrixHash } from './cameraHash'
import { measureNode } from './measure'
import { generateSlots, hashString } from './slots'
import { solve } from './solve'
import { SpatialHash } from './spatialHash'
import { defaultSolverConfig, type LabelNode, type SolverConfig } from './types'
import { lerpStep, writeBack } from './writeBack'

interface LabelStoreLike {
	current: HTMLElement[]
	rev: number
}

export interface LayoutDeps {
	camera: { current: Camera }
	size: { current: { width: number; height: number } }
	invalidate: () => void
	labels: LabelStoreLike
	config?: Partial<SolverConfig>
}

/** Clamp the frame delta so a long idle gap can't make the ease overshoot. */
const MAX_DELTA = 0.05

export function createLabelLayout(deps: LayoutDeps) {
	const config: SolverConfig = { ...defaultSolverConfig, ...deps.config }
	const maxRingMult = Math.max(...config.ringRadiiCrowded)

	const nodesByLabel = new WeakMap<HTMLElement, LabelNode>()
	const grid = new SpatialHash()

	let activeNodes: LabelNode[] = []
	let bestSnap = new Int16Array(0)

	let lastCamHash = -1
	let lastSetRev = -1
	let pendingRetry = false
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

	function maxSlotRadius(node: LabelNode): number {
		const last = node.slots.at(-1)
		return last ? last.radius : 0
	}

	function solveLayout(width: number, height: number) {
		pendingRetry = false
		activeNodes = []

		for (const el of deps.labels.current) {
			if (!el.isConnected) continue
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

		// Cell size so any two labels whose boxes could interact share/border a cell.
		let cell = 1
		for (const node of nodes) {
			const halfDiag = Math.hypot(node.w / 2, node.h / 2)
			const support = Math.max(node.w, node.h) / 2
			const outer = (support + node.dotR + config.dotPadding) * maxRingMult
			cell = Math.max(cell, 2 * (halfDiag + outer))
		}
		grid.build(nodes, cell)

		// Symmetric neighbourhoods so the solver's incremental bookkeeping stays exact.
		for (const node of nodes) node.neighbors = grid.queryNeighbors(node, config.maxNeighbors)
		for (const a of nodes) {
			for (const b of a.neighbors) {
				if (!b.neighbors.includes(a)) b.neighbors.push(a)
			}
		}

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

		// Teleport handling: a big camera jump (or a brand-new node) places labels
		// in their final spot rather than gliding across the screen.
		const diag = Math.hypot(width, height)
		const displacements: number[] = []
		for (const node of nodes) {
			if (!Number.isNaN(node.prevAx)) {
				displacements.push(Math.hypot(node.ax - node.prevAx, node.ay - node.prevAy))
			}
		}
		let snapAll = displacements.length === 0
		if (!snapAll) {
			displacements.sort((a, b) => a - b)
			const median = displacements[displacements.length >> 1]
			if (median > config.teleportFrac * diag) snapAll = true
		}

		for (const node of nodes) {
			const ownJump =
				!Number.isNaN(node.prevAx) &&
				Math.hypot(node.ax - node.prevAx, node.ay - node.prevAy) > maxSlotRadius(node) * 3
			if (snapAll || ownJump) {
				node.cx = node.tx
				node.cy = node.ty
				node.settled = true
			}
			node.prevAx = node.ax
			node.prevAy = node.ay
		}
	}

	function frame(delta: number) {
		const { width, height } = deps.size.current
		const camHash = cameraMatrixHash(deps.camera.current, width, height)
		const setRev = deps.labels.rev

		const dirty = camHash !== lastCamHash || setRev !== lastSetRev || pendingRetry

		if (dirty) {
			solveLayout(width, height)
			lastCamHash = camHash
			lastSetRev = setRev
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
