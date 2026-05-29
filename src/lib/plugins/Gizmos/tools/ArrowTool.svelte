<script lang="ts">
	import type { Entity } from 'koota'

	import { onDestroy } from 'svelte'
	import { Vector3 } from 'three'

	import { asRGB } from '$lib/buffer'
	import { traits, useWorld } from '$lib/ecs'
	import { useMouseRaycaster } from '$lib/hooks/useMouseRaycaster.svelte'
	import { useSelectedEntity } from '$lib/hooks/useSelection.svelte'
	import { useSettings } from '$lib/hooks/useSettings.svelte'

	import MeasurePoint from '../../../components/MeasureTool/MeasurePoint.svelte'
	import { arrowMatrix } from '../arrowMatrix'
	import ConfirmFloatingPanel from '../ConfirmFloatingPanel.svelte'
	import { cursorHit } from '../cursor'
	import { ARROW_COLOR, cancelPending, confirmPending, spawnPending } from '../spawn'
	import { GizmoArrow } from '../traits'
	import {
		useAddNextGesture,
		useCancelGesture,
		useConfirmGesture,
		useGizmosPlugin,
		useUndoGesture,
	} from '../useGizmosPlugin.svelte'

	const world = useWorld()
	const selectedEntity = useSelectedEntity()
	const settings = useSettings()
	const plugin = useGizmosPlugin()

	let cursor = $state.raw<Vector3>()
	let pending = $state.raw<Entity>()
	let pendingPosition = $state.raw<[number, number, number]>([0, 0, 0])
	let placed = $state.raw<Entity[]>([])

	const { onclick, onmove, raycaster } = useMouseRaycaster(() => ({
		enabled: pending === undefined,
	}))

	raycaster.firstHitOnly = true

	onmove((event) => {
		cursor = cursorHit(event.intersections)?.position
	})

	onclick(async (event) => {
		if (pending) return

		const hit = cursorHit(event.intersections)
		if (!hit) return

		const { position, normal } = hit
		const entity = spawnPending(world, {
			kind: 'arrow',
			position,
			matrix: arrowMatrix(plugin.arrowAxis, position, normal),
			traits: [GizmoArrow, traits.Color(asRGB(ARROW_COLOR, { r: 0, g: 0, b: 0 }))],
		})

		pending = entity
		pendingPosition = [position.x, position.y, position.z]
		settings.current.transformMode = 'rotate'
		selectedEntity.set(entity)
	})

	const handleAddNext = () => {
		if (!pending) return

		confirmPending(pending)
		placed = [...placed, pending]
		pending = undefined
	}

	const handleConfirm = () => {
		if (!pending) return

		const committed = pending
		confirmPending(committed)
		pending = undefined
		selectedEntity.set(committed)
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
	}

	const handleUndo = () => {
		if (placed.length <= 0) return

		const last = placed.at(-1)
		if (!last) return

		placed = placed.slice(0, -1)
		if (last.isAlive()) last.destroy()
	}

	useCancelGesture(handleCancel)
	useConfirmGesture(handleConfirm)
	useAddNextGesture(handleAddNext)
	useUndoGesture(handleUndo)

	onDestroy(() => cancelPending(pending))
</script>

{#if pending}
	<ConfirmFloatingPanel
		position={pendingPosition}
		onConfirm={handleConfirm}
		onCancel={handleCancel}
		onAddNext={handleAddNext}
		onUndo={placed.length > 0 ? handleUndo : undefined}
	/>
{:else if cursor}
	<MeasurePoint
		position={cursor.toArray()}
		opacity={0.5}
	/>
{/if}
