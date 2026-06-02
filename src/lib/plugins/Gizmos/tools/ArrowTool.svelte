<script lang="ts">
	import type { Entity } from 'koota'

	import { Vector3 } from 'three'

	import { asRGB } from '$lib/buffer'
	import { traits, useWorld } from '$lib/ecs'
	import { useMouseRaycaster } from '$lib/hooks/useMouseRaycaster.svelte'
	import { useSettings } from '$lib/hooks/useSettings.svelte'
	import MeasurePoint from '$lib/plugins/MeasureTool/MeasurePoint.svelte'

	import ConfirmFloatingPanel from '../ConfirmFloatingPanel.svelte'
	import { cursorHit } from '../cursor'
	import { arrowMatrix } from '../matrix'
	import { clearSelection, selectOnly } from '../selection'
	import { ARROW_COLOR, cancelPending, confirmPending, spawnPending } from '../spawn'
	import { GizmoArrow } from '../traits'
	import { useGizmos } from '../useGizmos.svelte'
	import { usePending } from '../usePending.svelte'

	const world = useWorld()
	const settings = useSettings()
	const gizmos = useGizmos()

	let cursor = $state.raw<Vector3>()
	let position = $state.raw<[number, number, number]>([0, 0, 0])
	let placed = $state.raw<Entity[]>([])

	const pending = usePending(() => ({
		onAddNext,
		onConfirm,
		onCancel,
		onUndo,
	}))

	// pointer events are only useful before we have a pending arrow
	const { onclick, onmove } = useMouseRaycaster(() => ({
		enabled: pending.current === undefined,
		firstHitOnly: true,
	}))

	onmove((event) => {
		cursor = cursorHit(event.intersections)?.position
	})

	onclick((event) => {
		if (pending.current) return

		const hit = cursorHit(event.intersections)
		if (!hit) return

		const entity = spawnPending(world, {
			kind: 'arrow',
			position: hit.position,
			matrix: arrowMatrix(gizmos.arrowAxis, hit.position, hit.normal),
			traits: [GizmoArrow, traits.Color(asRGB(ARROW_COLOR, { r: 0, g: 0, b: 0 }))],
		})

		pending.set(entity)
		position = [hit.position.x, hit.position.y, hit.position.z]
		settings.current.transformMode = 'rotate'
		selectOnly(world, entity)
	})

	const onConfirm = () => {
		if (!pending.current) return

		const committed = pending.current
		confirmPending(committed)
		pending.set(undefined)
		selectOnly(world, committed)
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
	}

	const onAddNext = () => {
		if (!pending.current) return

		confirmPending(pending.current)
		placed = [...placed, pending.current]
		pending.set(undefined)
	}

	const onUndo = () => {
		if (placed.length <= 0) return

		const last = placed.at(-1)
		if (!last) return

		placed = placed.slice(0, -1)
		if (last.isAlive()) last.destroy()
	}
</script>

{#if pending.current}
	<ConfirmFloatingPanel
		{position}
		{onConfirm}
		{onCancel}
		{onAddNext}
		{onUndo}
	/>
{:else if cursor}
	<MeasurePoint
		position={cursor.toArray()}
		opacity={0.5}
	/>
{/if}
