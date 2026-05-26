<script lang="ts">
	import { Vector3 } from 'three'

	import { traits, useWorld } from '$lib/ecs'
	import { useMouseRaycaster } from '$lib/hooks/useMouseRaycaster.svelte'
	import { useSelectedEntity } from '$lib/hooks/useSelection.svelte'

	import MeasurePoint from '../../../components/MeasureTool/MeasurePoint.svelte'
	import { cursorPoint } from '../cursor'
	import { confirmPending, spawnPending } from '../spawn'
	import { useCancelGesture, useGizmosPlugin } from '../useGizmosPlugin.svelte'

	const world = useWorld()
	const selectedEntity = useSelectedEntity()
	const plugin = useGizmosPlugin()

	let cursor = $state.raw<Vector3 | undefined>()

	const { onclick, onmove, raycaster } = useMouseRaycaster(() => ({ enabled: true }))
	raycaster.firstHitOnly = true

	useCancelGesture(() => plugin.exit())

	onmove((event) => {
		cursor = cursorPoint(raycaster, event.intersections)
	})

	onclick((event) => {
		const position = cursorPoint(raycaster, event.intersections)
		if (!position) return
		const entity = spawnPending(world, {
			kind: 'coordinate-system',
			position,
			extras: [traits.ReferenceFrame, traits.ShowAxesHelper],
		})
		// Coordinate systems commit on placement — no rotate step.
		confirmPending(entity)
		selectedEntity.set(entity)
	})
</script>

{#if cursor}
	<MeasurePoint
		position={cursor.toArray()}
		opacity={0.5}
	/>
{/if}
