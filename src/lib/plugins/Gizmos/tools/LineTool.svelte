<script lang="ts">
	import type { Entity } from 'koota'

	import { onDestroy, untrack } from 'svelte'
	import { Vector3 } from 'three'

	import { traits, useWorld } from '$lib/ecs'
	import { useMouseRaycaster } from '$lib/hooks/useMouseRaycaster.svelte'
	import { useSelectedEntity } from '$lib/hooks/useSelection.svelte'

	import MeasurePoint from '../../../components/MeasureTool/MeasurePoint.svelte'
	import ConfirmFloatingPanel from '../ConfirmFloatingPanel.svelte'
	import { cursorPoint } from '../cursor'
	import {
		cancelPending,
		confirmPending,
		GIZMO_COLOR,
		GIZMO_COLOR_BYTES,
		spawnPending,
	} from '../spawn'
	import { useCancelGesture, useConfirmGesture, useGizmosPlugin } from '../useGizmosPlugin.svelte'

	const world = useWorld()
	const selectedEntity = useSelectedEntity()
	const plugin = useGizmosPlugin()

	let cursor = $state.raw<Vector3 | undefined>()
	let pending = $state.raw<Entity | undefined>()
	let points = $state.raw<Vector3[]>([])

	const { onclick, onmove, raycaster } = useMouseRaycaster(() => ({ enabled: true }))
	raycaster.firstHitOnly = true

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
		// A Line2 needs at least 2 vertices to render; if we only have the
		// just-placed first point and no cursor, duplicate it so the entity
		// is still valid until the next move/click.
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
		cursor = cursorPoint(raycaster, event.intersections, pending)
		if (pending && cursor) {
			updatePending(cursor)
		}
	})

	onclick((event) => {
		const position = cursorPoint(raycaster, event.intersections, pending)
		if (!position) return
		const next = position.clone()

		if (pending) {
			points = [...points, next]
			updatePending(position)
		} else {
			const screen = plugin.lineSpace === 'screen'
			// DotColors is a Uint8Array — a single 3-byte RGB applies one color
			// to every dot. Derive from GIZMO_COLOR (no inline literal) so the
			// line color and dot color start out matching even if GIZMO_COLOR
			// is later changed.
			const extras = [
				traits.LinePositions(new Float32Array()),
				traits.LineWidth(5),
				traits.DotSize(10),
				traits.Color(GIZMO_COLOR),
				traits.DotColors(new Uint8Array(GIZMO_COLOR_BYTES)),
				...(screen ? [traits.ScreenSpace] : []),
			]
			// LinePositions are entity-local; if we anchor the entity's matrix
			// at the first click point, that translation gets applied on top of
			// every stored vertex and every dot ends up doubled away from where
			// the user clicked. Anchor at the world origin so the local
			// coordinates we store *are* the world coordinates the user picked.
			pending = spawnPending(world, { kind: 'line', position: new Vector3(), extras })
			points = [next]
			selectedEntity.set(pending)
			updatePending(position)
		}
	})

	const handleConfirm = () => {
		if (!pending) return
		// Drop the cursor preview; finalize with the placed points only.
		pending.set(traits.LinePositions, flatPositions(points))
		// Restore full opacity once committed.
		if (pending.has(traits.Opacity)) pending.remove(traits.Opacity)
		confirmPending(pending)
		pending = undefined
		points = []
	}

	const handleCancel = () => {
		if (pending) {
			cancelPending(pending)
			selectedEntity.set()
			pending = undefined
			points = []
		} else {
			plugin.exit()
		}
	}

	useCancelGesture(() => handleCancel())
	useConfirmGesture(() => {
		if (pending && points.length >= 2) handleConfirm()
	})

	onDestroy(() => {
		untrack(() => {
			if (pending) cancelPending(pending)
		})
	})

	const panelPosition = $derived<[number, number, number]>(
		points.at(-1) ? [points.at(-1)!.x, points.at(-1)!.y, points.at(-1)!.z] : [0, 0, 0]
	)
</script>

{#if pending && points.length >= 2}
	<ConfirmFloatingPanel
		position={panelPosition}
		onConfirm={handleConfirm}
		onCancel={handleCancel}
		confirmLabel="Finish line"
	>
		<div class="text-subtle-2">{points.length} point{points.length === 1 ? '' : 's'} placed</div>
		<div class="text-subtle-2">Click to add another</div>
	</ConfirmFloatingPanel>
{/if}

{#if !pending && cursor}
	<MeasurePoint
		position={cursor.toArray()}
		opacity={0.5}
	/>
{/if}
