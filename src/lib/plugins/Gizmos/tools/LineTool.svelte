<script
	lang="ts"
	module
>
	const SNAP_DISTANCE = 0.05
	const PLACEMENT_DOT_SIZE = 20
	const GRID_SNAP_STEP = 0.1
</script>

<script lang="ts">
	import { Vector3 } from 'three'

	import { asRGB } from '$lib/buffer'
	import { DEFAULT_LINE_WIDTH } from '$lib/draw'
	import { traits, useWorld } from '$lib/ecs'
	import { useMouseRaycaster } from '$lib/hooks/useMouseRaycaster.svelte'
	import { useSettings } from '$lib/hooks/useSettings.svelte'
	import MeasurePoint from '$lib/plugins/MeasureTool/MeasurePoint.svelte'
	import { quantize } from '$lib/quantize'

	import ConfirmFloatingPanel from '../ConfirmFloatingPanel.svelte'
	import { cursorPoint } from '../cursor'
	import { clearSelection, selectOnly } from '../selection'
	import { cancelPending, confirmPending, POLYLINE_COLOR, spawnPending } from '../spawn'
	import { PolylineMeasure } from '../traits'
	import { useGizmos } from '../useGizmos.svelte'
	import { usePending } from '../usePending.svelte'

	const world = useWorld()
	const gizmos = useGizmos()
	const settings = useSettings()

	let cursor = $state.raw<Vector3 | undefined>()
	let points = $state.raw<Vector3[]>([])

	const pending = usePending(() => ({
		onAddNext,
		onConfirm,
		onCancel,
		onUndo,
	}))

	const { onclick, onmove } = useMouseRaycaster(() => ({
		enabled: true,
		firstHitOnly: true,
	}))

	const hasSegment = $derived(points.length >= 2)
	const panelPosition = $derived.by<[number, number, number]>(() => {
		const last = points.at(-1)
		return last ? [last.x, last.y, last.z] : [0, 0, 0]
	})

	const nearestVertex = (point: Vector3): number | undefined => {
		let best: number | undefined
		let bestSquared = SNAP_DISTANCE * SNAP_DISTANCE
		for (let i = 0; i < points.length; i++) {
			const squared = points[i].distanceToSquared(point)
			if (squared < bestSquared) {
				bestSquared = squared
				best = i
			}
		}
		return best
	}

	const getCursorPosition = (hit: Vector3) => {
		const snap = settings.current.snapping
		const index = pending.current && snap ? nearestVertex(hit) : undefined
		if (index !== undefined) return { index, position: points[index].clone() }
		return { index, position: snap ? quantize(hit, GRID_SNAP_STEP) : hit }
	}

	const flatPositions = (pts: Vector3[], preview?: Vector3): Float32Array => {
		const total = pts.length + (preview ? 1 : 0)
		const arr = new Float32Array(total * 3)
		for (let i = 0; i < pts.length; i++) {
			arr[i * 3 + 0] = pts[i].x
			arr[i * 3 + 1] = pts[i].y
			arr[i * 3 + 2] = pts[i].z
		}
		if (preview) {
			const i = pts.length
			arr[i * 3 + 0] = preview.x
			arr[i * 3 + 1] = preview.y
			arr[i * 3 + 2] = preview.z
		}
		return arr
	}

	const updatePending = (preview?: Vector3) => {
		if (!pending.current) return

		const positions = flatPositions(points, preview)
		if (positions.length < 6) {
			// Line2 / LineGeometry needs at least two vertices; pad with the first.
			const padded = new Float32Array(6)
			padded.set(positions)
			padded[3] = positions[0] ?? 0
			padded[4] = positions[1] ?? 0
			padded[5] = positions[2] ?? 0
			pending.current.set(traits.LinePositions, padded)
		} else {
			pending.current.set(traits.LinePositions, positions)
		}
	}

	onmove((event) => {
		const hit = cursorPoint(event.intersections, pending.current)
		if (!hit) {
			cursor = undefined
			return
		}

		const { position } = getCursorPosition(hit)
		cursor = position
		if (pending.current && cursor) updatePending(cursor)
	})

	onclick((event) => {
		const hit = cursorPoint(event.intersections, pending.current)
		if (!hit) return

		const { position, index } = getCursorPosition(hit)

		if (pending.current) {
			if (index === 0 && points.length >= 3) {
				// close the loop
				points = [...points, position]
				const committed = finalizePending()
				if (committed) selectOnly(world, committed)
				return
			}

			points = [...points, position]
			updatePending()
			return
		}

		const entity = spawnPending(world, {
			kind: 'polyline',
			position: new Vector3(),
			traits: [
				traits.LinePositions(new Float32Array()),
				traits.LineWidth(DEFAULT_LINE_WIDTH),
				traits.DotSize(PLACEMENT_DOT_SIZE),
				traits.Color(asRGB(POLYLINE_COLOR, { r: 0, g: 0, b: 0 })),
				traits.DotColors(POLYLINE_COLOR),
				...(gizmos.lineSpace === 'screen' ? [traits.ScreenSpace] : []),
				...(gizmos.lineMeasure === 'none' ? [] : [PolylineMeasure({ mode: gizmos.lineMeasure })]),
			],
		})

		pending.set(entity)
		points = [position]
		selectOnly(world, entity)
		updatePending(position)
	})

	const finalizePending = () => {
		if (!pending.current) return undefined

		const committed = pending.current
		committed.set(traits.LinePositions, flatPositions(points))
		committed.set(traits.DotSize, DEFAULT_LINE_WIDTH)
		confirmPending(committed)
		pending.set(undefined)
		points = []
		return committed
	}

	const onAddNext = () => {
		if (!pending.current || !hasSegment) return
		finalizePending() // intentionally leaves selection on the new (pending) entity
	}

	const onConfirm = () => {
		if (!pending.current || !hasSegment) return

		const committed = finalizePending()
		if (committed) selectOnly(world, committed)
		gizmos.exit()
	}

	const onCancel = () => {
		if (!pending.current) {
			gizmos.exit()
			return
		}

		cancelPending(pending.current)
		clearSelection(world)
		pending.set(undefined)
		points = []
	}

	const onUndo = () => {
		if (!pending.current || !hasSegment) return

		points = points.slice(0, -1)
		updatePending(cursor)
	}
</script>

{#if pending.current && hasSegment}
	<ConfirmFloatingPanel
		position={panelPosition}
		{onConfirm}
		{onCancel}
		{onAddNext}
		{onUndo}
	/>
{/if}

{#if !pending.current && cursor}
	<MeasurePoint
		position={cursor.toArray()}
		opacity={0.5}
	/>
{/if}
