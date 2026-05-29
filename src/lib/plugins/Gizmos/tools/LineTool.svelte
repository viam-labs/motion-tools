<script
	lang="ts"
	module
>
	const SNAP_DISTANCE = 0.05
	const PLACEMENT_DOT_SIZE = 20
</script>

<script lang="ts">
	import type { Entity } from 'koota'

	import { onDestroy } from 'svelte'
	import { Vector3 } from 'three'

	import { asRGB } from '$lib/buffer'
	import { DEFAULT_LINE_WIDTH } from '$lib/draw'
	import { traits, useWorld } from '$lib/ecs'
	import { useMouseRaycaster } from '$lib/hooks/useMouseRaycaster.svelte'
	import { useSelectedEntity } from '$lib/hooks/useSelection.svelte'
	import { useSettings } from '$lib/hooks/useSettings.svelte'

	import MeasurePoint from '../../../components/MeasureTool/MeasurePoint.svelte'
	import ConfirmFloatingPanel from '../ConfirmFloatingPanel.svelte'
	import { cursorPoint } from '../cursor'
	import { cancelPending, confirmPending, POLYLINE_COLOR, spawnPending } from '../spawn'
	import { PolylineMeasure } from '../traits'
	import {
		useAddNextGesture,
		useCancelGesture,
		useConfirmGesture,
		useGizmosPlugin,
		useUndoGesture,
	} from '../useGizmosPlugin.svelte'

	const world = useWorld()
	const selectedEntity = useSelectedEntity()
	const plugin = useGizmosPlugin()
	const settings = useSettings()

	let cursor = $state.raw<Vector3 | undefined>()
	let pending = $state.raw<Entity | undefined>()
	let points = $state.raw<Vector3[]>([])

	const { onclick, onmove, raycaster } = useMouseRaycaster(() => ({ enabled: true }))
	raycaster.firstHitOnly = true

	const hasSegment = $derived(points.length >= 2)

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
		const index = pending && settings.current.snapping ? nearestVertex(hit) : undefined
		return {
			index,
			position: index === undefined ? hit : points[index].clone(),
		}
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
		if (!pending) return

		const positions = flatPositions(points, preview)
		if (positions.length < 6) {
			const padded = new Float32Array(6)
			padded.set(positions)
			padded[3] = positions[0] ?? 0
			padded[4] = positions[1] ?? 0
			padded[5] = positions[2] ?? 0
			pending.set(traits.LinePositions, padded)
		} else {
			pending.set(traits.LinePositions, positions)
		}
	}

	onmove((event) => {
		const hit = cursorPoint(event.intersections, pending)
		if (!hit) {
			cursor = undefined
			return
		}

		const { position } = getCursorPosition(hit)
		cursor = position
		if (pending && cursor) updatePending(cursor)
	})

	onclick((event) => {
		const hit = cursorPoint(event.intersections, pending)
		if (!hit) return

		const { position, index } = getCursorPosition(hit)

		if (pending) {
			if (index === 0 && points.length >= 3) {
				points = [...points, position]
				finalizePending()
				return
			}

			points = [...points, position]
			updatePending(position)
		} else {
			pending = spawnPending(world, {
				kind: 'polyline',
				position: new Vector3(),
				traits: [
					traits.LinePositions(new Float32Array()),
					traits.LineWidth(DEFAULT_LINE_WIDTH),
					traits.DotSize(PLACEMENT_DOT_SIZE),
					traits.Color(asRGB(POLYLINE_COLOR, { r: 0, g: 0, b: 0 })),
					traits.DotColors(POLYLINE_COLOR),
					...(plugin.lineSpace === 'screen' ? [traits.ScreenSpace] : []),
					...(plugin.lineMeasure === 'none' ? [] : [PolylineMeasure({ mode: plugin.lineMeasure })]),
				],
			})

			points = [position]
			selectedEntity.set(pending)
			updatePending(position)
		}
	})

	const finalizePending = (): Entity | undefined => {
		if (!pending) return undefined

		pending.set(traits.LinePositions, flatPositions(points))
		pending.set(traits.DotSize, DEFAULT_LINE_WIDTH)
		confirmPending(pending)
		const committed = pending
		pending = undefined
		points = []
		return committed
	}

	const handleAddNext = () => {
		if (!pending || !hasSegment) return
		finalizePending()
	}

	const handleConfirm = () => {
		if (!pending || !hasSegment) return

		const committed = finalizePending()
		if (committed) selectedEntity.set(committed)

		plugin.exit()
	}

	const handleCancel = () => {
		if (!pending) {
			plugin.exit()
			return
		}

		cancelPending(pending)
		selectedEntity.set()
		pending = undefined
		points = []
	}

	const handleUndo = () => {
		if (!pending || !hasSegment) return

		points = points.slice(0, -1)
		updatePending(cursor)
	}

	useCancelGesture(handleCancel)
	useConfirmGesture(handleConfirm)
	useAddNextGesture(handleAddNext)
	useUndoGesture(handleUndo)

	onDestroy(() => cancelPending(pending))

	const panelPosition = $derived<[number, number, number]>(
		points.at(-1) ? [points.at(-1)!.x, points.at(-1)!.y, points.at(-1)!.z] : [0, 0, 0]
	)
</script>

{#if pending && hasSegment}
	<ConfirmFloatingPanel
		position={panelPosition}
		onConfirm={handleConfirm}
		onCancel={handleCancel}
		onAddNext={handleAddNext}
		onUndo={handleUndo}
	/>
{/if}

{#if !pending && cursor}
	<MeasurePoint
		position={cursor.toArray()}
		opacity={0.5}
	/>
{/if}
