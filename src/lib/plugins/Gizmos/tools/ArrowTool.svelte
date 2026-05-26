<script lang="ts">
	import type { Entity } from 'koota'

	import { onDestroy, tick, untrack } from 'svelte'
	import { Vector3 } from 'three'

	import { traits, useWorld } from '$lib/ecs'
	import { useMouseRaycaster } from '$lib/hooks/useMouseRaycaster.svelte'
	import { useSelectedEntity } from '$lib/hooks/useSelection.svelte'
	import { useSettings } from '$lib/hooks/useSettings.svelte'

	import MeasurePoint from '../../../components/MeasureTool/MeasurePoint.svelte'
	import ConfirmFloatingPanel from '../ConfirmFloatingPanel.svelte'
	import { cursorPoint } from '../cursor'
	import { cancelPending, confirmPending, GIZMO_COLOR, spawnPending } from '../spawn'
	import { GizmoArrow, HeadAtOrigin } from '../traits'
	import { useCancelGesture, useConfirmGesture, useGizmosPlugin } from '../useGizmosPlugin.svelte'

	const world = useWorld()
	const selectedEntity = useSelectedEntity()
	const settings = useSettings()
	const plugin = useGizmosPlugin()

	let cursor = $state.raw<Vector3 | undefined>()
	let pending = $state.raw<Entity | undefined>()
	let pendingPosition = $state.raw<[number, number, number]>([0, 0, 0])

	// While the user is orienting a pending arrow we force the selection
	// transform gizmo into rotate mode; restore whatever was set before
	// when the pending arrow is committed or cancelled.
	let previousTransformMode: typeof settings.current.transformMode | undefined

	const { onclick, onmove, raycaster } = useMouseRaycaster(() => ({
		enabled: pending === undefined,
	}))
	raycaster.firstHitOnly = true

	onmove((event) => {
		cursor = cursorPoint(raycaster, event.intersections)
	})

	onclick(async (event) => {
		if (pending) return
		const position = cursorPoint(raycaster, event.intersections)
		if (!position) return
		const extras = [GizmoArrow, traits.Color(GIZMO_COLOR)]
		if (plugin.arrowOrientation === 'to') extras.push(HeadAtOrigin)
		const entity = spawnPending(world, {
			kind: 'arrow',
			position,
			extras,
		})
		pending = entity
		pendingPosition = [position.x, position.y, position.z]
		previousTransformMode = settings.current.transformMode
		settings.current.transformMode = 'rotate'
		// `useSelectedObject3d` resolves via `scene.getObjectByName(entity)` —
		// a one-shot lookup that re-runs only when selectedEntity changes, not
		// when the scene mutates. Wait for Svelte to flush so GizmoArrow has
		// mounted the mesh into the scene, otherwise the lookup misses and
		// SelectedTransformControls renders nothing.
		await tick()
		selectedEntity.set(entity)
	})

	const restoreMode = () => {
		if (previousTransformMode !== undefined) {
			settings.current.transformMode = previousTransformMode
			previousTransformMode = undefined
		}
	}

	const handleConfirm = () => {
		if (pending) confirmPending(pending)
		pending = undefined
		restoreMode()
	}

	const handleCancel = () => {
		if (pending) {
			cancelPending(pending)
			selectedEntity.set()
			pending = undefined
			restoreMode()
		} else {
			plugin.exit()
		}
	}

	useCancelGesture(() => handleCancel())
	useConfirmGesture(() => {
		if (pending) handleConfirm()
	})

	onDestroy(() => {
		untrack(() => {
			if (pending) cancelPending(pending)
			restoreMode()
		})
	})
</script>

{#if pending}
	<ConfirmFloatingPanel
		position={pendingPosition}
		onConfirm={handleConfirm}
		onCancel={handleCancel}
	>
		<div class="text-subtle-2">Rotate the arrow, then confirm</div>
	</ConfirmFloatingPanel>
{:else if cursor}
	<MeasurePoint
		position={cursor.toArray()}
		opacity={0.5}
	/>
{/if}
